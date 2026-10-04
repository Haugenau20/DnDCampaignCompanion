'use strict';
// CENTRAL execution only. Scoped transport transform; no service replacement.
const assert = require('node:assert/strict');
const path = require('node:path');
const recovery = require('./recovery.cjs');
async function install(page, api) {
  await page.addInitScript(({notesPath,campaignId})=>{
    const state=window.__terminalRecovery={enabled:true,targetIds:[],injected:false,xhrRequests:0,fetchRequests:0,frames:0,changed:null};
    const local=url=>{try{const u=new URL(url,location.href);return ['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='8080'&&u.pathname.includes('google.firestore.v1.Firestore/Listen/channel');}catch{return false;}};
    function capture(body){
      if(typeof body!=='string')return;
      for(const [key,value]of new URLSearchParams(body)){
        if(key==='$req'){capture(value);continue;}
        if(!key.endsWith('___data__'))continue;
        try{const m=JSON.parse(value),t=m.addTarget,q=t?.query;
          if(q?.parent?.endsWith(`/documents/${notesPath.split('/').slice(0,-1).join('/')}`)&&q.structuredQuery?.from?.some(x=>x.collectionId==='notes')&&JSON.stringify(q).includes(campaignId)&&!state.targetIds.includes(t.targetId))state.targetIds.push(t.targetId);
        }catch{}
      }
    }
    const xhrLocal=new WeakMap(),originalOpen=XMLHttpRequest.prototype.open,originalSend=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(method,url,...args){const yes=local(String(url));xhrLocal.set(this,yes);if(yes){state.xhrRequests++;capture(new URL(String(url),location.href).search.slice(1));}return originalOpen.call(this,method,url,...args);};
    XMLHttpRequest.prototype.send=function(body){if(xhrLocal.get(this))capture(body);return originalSend.call(this,body);};
    function rewrite(payload){
      function visit(v){
        if(!v||typeof v!=='object')return;
        if(v.targetChange?.targetIds?.some(id=>state.targetIds.includes(id))&&state.enabled&&!state.injected){
          state.changed=JSON.parse(JSON.stringify(v.targetChange));
          v.targetChange={targetChangeType:'REMOVE',targetIds:v.targetChange.targetIds.filter(id=>state.targetIds.includes(id)),cause:{code:14,message:'Synthetic local transient notes collection failure'}};
          state.injected=true;
        }else for(const child of Object.values(v))visit(child);
      }
      visit(payload);return payload;
    }
    const originalFetch=window.fetch;
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url;
      const yes=local(String(url));
      if(yes){state.fetchRequests++;capture(new URL(String(url),location.href).search.slice(1));capture(init?.body);}
      const response=await originalFetch.call(this,input,init);
      if(!yes||!response.body)return response;
      const reader=response.body.getReader(),decoder=new TextDecoder(),encoder=new TextEncoder();
      let buffer='',cancelled=false;
      const stream=new ReadableStream({
        async start(controller){
          try{
            while(!cancelled){
              const{done,value}=await reader.read();
              if(done){buffer+=decoder.decode();if(buffer)controller.enqueue(encoder.encode(buffer));controller.close();return;}
              buffer+=decoder.decode(value,{stream:true});
              while(buffer.length){
                const newline=buffer.indexOf('\n');if(newline<0)break;
                const prefix=buffer.slice(0,newline);if(!/^\d+$/.test(prefix)){controller.enqueue(encoder.encode(buffer));buffer='';break;}
                const length=Number(prefix),end=newline+1+length;if(buffer.length<end)break;
                const frame=buffer.slice(0,end),json=buffer.slice(newline+1,end);buffer=buffer.slice(end);state.frames++;
                let payload;try{payload=JSON.parse(json);}catch{controller.enqueue(encoder.encode(frame));continue;}
                const was=state.injected;rewrite(payload);
                if(!was&&state.injected){const output=JSON.stringify(payload);controller.enqueue(encoder.encode(`${output.length}\n${output}`));}
                else controller.enqueue(encoder.encode(frame));
              }
            }
          }catch(error){if(!cancelled)controller.error(error);}
        },
        cancel(reason){cancelled=true;return reader.cancel(reason);}
      });
      const headers=new Headers(response.headers);headers.delete('content-length');
      return new Response(stream,{status:response.status,statusText:response.statusText,headers});
    };
  },{notesPath:api.notesPath,campaignId:api.campaignId});
}
async function snapshot(page){return page.evaluate(()=>({route:location.pathname,bodyText:document.body.innerText.slice(-14000),fault:window.__terminalRecovery,buttons:[...document.querySelectorAll('button')].map(n=>n.textContent)}));}
async function run(api){
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(api.baseUrl).hostname));
  const page=await api.context.newPage();
  try{
    await install(page,api);
    await page.goto(api.baseUrl+'/notes',{waitUntil:'domcontentloaded'});
    try{await page.waitForFunction(()=>window.__terminalRecovery?.injected,null,{timeout:15000});}
    catch(error){api.report('terminal-fetch-injection-unverified',{error:error.message,state:await snapshot(page)});return;}
    await page.getByText('Failed to fetch notes',{exact:true}).waitFor({timeout:10000});
    await page.evaluate(()=>{window.__terminalRecovery.enabled=false;});
    const failed=await snapshot(page);
    await page.getByRole('link',{name:'Privacy Policy',exact:true}).click();
    await page.waitForURL('**/privacy');
    await page.getByRole('button',{name:'Notes',exact:true}).click();
    await page.waitForURL('**/notes');
    await page.getByText('Failed to fetch notes',{exact:true}).waitFor({timeout:10000});
    await page.waitForTimeout(700);
    api.report('terminal-fetch-listener-recovery',{failed,afterInjectionDisabledAndOrdinaryReturn:await snapshot(page),
      serverNote:(await api.db.doc(`${api.notesPath}/${recovery.IDS.unmount}`).get()).data(),
      failure:'One transformed local notes Watch target frame with code14; local emulator remains healthy'});
    if(api.outDir)await page.screenshot({path:path.join(api.outDir,'recovery-terminal-fetch.png'),fullPage:true});
    const control=await api.context.newPage();
    try{await control.goto(api.baseUrl+'/notes',{waitUntil:'domcontentloaded'});await control.locator('.note-card').first().waitFor({state:'visible',timeout:20000});api.report('terminal-fetch-fresh-page-control',await snapshot(control));}
    finally{await control.close();}
  }finally{await page.close();}
}
module.exports={seed:recovery.seed,run};
