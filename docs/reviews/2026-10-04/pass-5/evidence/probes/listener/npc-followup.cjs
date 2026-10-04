'use strict';
// CENTRAL NPC-only follow-up; fixes incomplete synthetic NPC fixture in first run.
// No browser/server launch; native SDK transport only. Notes are not reprobed.
const assert = require('node:assert/strict');
const path = require('node:path');
const IDS={note:'pass5-terminal-note',npc:'pass5-terminal-npc'};
function origin(api){const u=new URL(api.baseUrl);assert.ok(['127.0.0.1','localhost','[::1]'].includes(u.hostname));return u.origin;}
async function seed(api){
  origin(api);
  const stamp=api.now||'2026-10-04T00:00:00.000Z';
  await api.db.doc(`${api.basePath}/npcs/${IDS.npc}`).set({id:IDS.npc,name:'Pass5 Terminal NPC',description:'Synthetic terminal-listener retry control.',occupation:'Listener control',race:'Human',status:'alive',relationship:'neutral',connections:{relatedNPCs:[],affiliations:[],relatedQuests:[]},notes:[],createdBy:api.uid,modifiedBy:api.uid,dateAdded:stamp,dateModified:stamp});
}
async function install(page,api,kind){
  const collectionPath=kind==='notes'?api.notesPath:`${api.basePath}/npcs`;
  const documentPath=`${collectionPath}/${kind==='notes'?IDS.note:IDS.npc}`;
  await page.addInitScript(({collectionPath,documentPath,campaignId})=>{
    const state=window.__pass5Terminal={enabled:false,collectionPath,documentPath,targetIds:[],targetMappings:[],injected:false,fetchRequests:0,frames:0,outbound:[],events:[],replacement:null,transportErrors:[]};
    const local=url=>{try{const u=new URL(url,location.href);return ['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='8080'&&u.pathname.includes('google.firestore.v1.Firestore/Listen/channel');}catch{return false;}};
    function map(id,method,detail){if(!state.targetIds.includes(id))state.targetIds.push(id);state.targetMappings.push({id,method,detail});}
    function capture(raw){
      if(typeof raw!=='string')return;
      for(const [key,value] of new URLSearchParams(raw)){
        if(key==='$req'){capture(value);continue;}
        if(!key.endsWith('__data__'))continue;
        try{
          const m=JSON.parse(value),t=m.addTarget,q=t?.query;
          if(t)state.outbound.push({targetId:t.targetId,query:q,documents:t.documents});
          if(q&&q.parent?.endsWith(`/documents/${collectionPath.split('/').slice(0,-1).join('/')}`)&&q.structuredQuery?.from?.some(x=>x.collectionId===collectionPath.split('/').at(-1))&&(collectionPath.split('/').at(-1)!=='notes'||JSON.stringify(q).includes(campaignId)))map(t.targetId,'outgoing-query',q);
        }catch{}
      }
    }
    function rewrite(value){
      if(!value||typeof value!=='object')return;
      const dc=value.documentChange;
      const selected=dc?.document?.name?.endsWith(`/documents/${documentPath}`);
      if(selected)for(const id of dc.targetIds||[])map(id,'incoming-document',dc.document.name);
      if(value.targetChange&&state.events.length<100)state.events.push(JSON.parse(JSON.stringify(value.targetChange)));
      // Replace a selected document event, or selected target event, with a real
      // SDK-parsed Watch target rejection. Never call application callbacks.
      const ids=selected?(dc.targetIds||[]):(value.targetChange?.targetIds||[]).filter(id=>state.targetIds.includes(id));
      if(ids.length&&state.enabled&&!state.injected){
        state.replacement={original:JSON.parse(JSON.stringify(value)),injected:{targetChange:{targetChangeType:'REMOVE',targetIds:ids,cause:{code:14,message:'Synthetic loopback notes or collection target failure'}}}};
        for(const key of Object.keys(value))delete value[key];
        Object.assign(value,state.replacement.injected);state.injected=true;return;
      }
      for(const child of Object.values(value))rewrite(child);
    }
    const originalFetch=window.fetch;
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url;
      const yes=local(String(url));
      if(yes){state.fetchRequests++;capture(new URL(String(url),location.href).search.slice(1));capture(init?.body);if(input instanceof Request){try{capture(await input.clone().text());}catch{}}}
      const response=await originalFetch.call(this,input,init);
      if(!yes||!response.body)return response;
      const reader=response.body.getReader(),decoder=new TextDecoder(),encoder=new TextEncoder();let buffer='',cancelled=false;
      const stream=new ReadableStream({async start(controller){try{
        while(!cancelled){
          const {done,value}=await reader.read();
          if(done){buffer+=decoder.decode();if(buffer)controller.enqueue(encoder.encode(buffer));controller.close();return;}
          buffer+=decoder.decode(value,{stream:true});
          while(buffer.length){
            const newline=buffer.indexOf('\n');if(newline<0)break;
            const prefix=buffer.slice(0,newline);if(!/^\d+$/.test(prefix)){controller.enqueue(encoder.encode(buffer));buffer='';break;}
            const length=Number(prefix),end=newline+1+length;if(buffer.length<end)break;
            const frame=buffer.slice(0,end),json=buffer.slice(newline+1,end);buffer=buffer.slice(end);state.frames++;
            let payload;try{payload=JSON.parse(json);}catch{controller.enqueue(encoder.encode(frame));continue;}
            const was=state.injected;rewrite(payload);
            if(!was&&state.injected){const output=JSON.stringify(payload);controller.enqueue(encoder.encode(`${output.length}\n${output}`));}else controller.enqueue(encoder.encode(frame));
          }
        }
      }catch(error){state.transportErrors.push(error.message);if(!cancelled)controller.error(error);}},cancel(reason){cancelled=true;return reader.cancel(reason);}});
      const headers=new Headers(response.headers);headers.delete('content-length');return new Response(stream,{status:response.status,statusText:response.statusText,headers});
    };
  },{collectionPath,documentPath,campaignId:api.campaignId});
}
async function snapshot(page){return page.evaluate(()=>({route:location.pathname,bodyText:document.body.innerText.slice(-18000),fault:window.__pass5Terminal,buttons:[...document.querySelectorAll('button')].map(n=>n.textContent)}));}
async function screenshot(api,page,name){if(api.outDir)await page.screenshot({path:path.join(api.outDir,`listener-${name}.png`),fullPage:true});}
async function scenario(api,kind){
  const page=await api.context.newPage(),consoleErrors=[];
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,2500));});
  try{
    await install(page,api,kind);
    await page.goto(`${origin(api)}/${kind}`,{waitUntil:'domcontentloaded'});
    try{
      await page.getByText(kind==='notes'?'Pass5 Terminal Note':'Pass5 Terminal NPC',{exact:true}).first().waitFor({timeout:15000});
      await page.waitForFunction(()=>window.__pass5Terminal?.targetIds.length>0,null,{timeout:3000});
    }catch(error){api.report(`listener-${kind}-target-capture-failed`,{error:error.message,state:await snapshot(page),consoleErrors});return false;}
    api.report(`listener-${kind}-healthy-target-captured`,await snapshot(page));
    await page.evaluate(()=>{window.__pass5Terminal.enabled=true;});
    await api.db.doc(kind==='notes'?`${api.notesPath}/${IDS.note}`:`${api.basePath}/npcs/${IDS.npc}`).update(kind==='notes'?{content:'Synthetic server change triggers selected native terminal event.'}:{description:'Synthetic server change triggers selected native terminal event.'});
    try{await page.waitForFunction(()=>window.__pass5Terminal?.injected,null,{timeout:15000});}
    catch(error){api.report(`listener-${kind}-untriggered`,{error:error.message,state:await snapshot(page),consoleErrors});return false;}
    const errorText=kind==='notes'?'Failed to fetch notes':'Synthetic loopback notes or collection target failure';
    try{await page.getByText(errorText,{exact:true}).first().waitFor({timeout:10000});}
    catch(error){api.report(`listener-${kind}-callback-unverified`,{error:error.message,state:await snapshot(page),consoleErrors});return false;}
    await page.evaluate(()=>{window.__pass5Terminal.enabled=false;});
    const failed=await snapshot(page);await screenshot(api,page,`${kind}-failed`);
    if(kind==='notes'){
      await page.getByRole('link',{name:'Privacy Policy',exact:true}).click();await page.waitForURL('**/privacy');
      await page.getByRole('button',{name:'Notes',exact:true}).first().click();await page.waitForURL('**/notes');
      await page.waitForTimeout(1000);
      const returned=await snapshot(page);await screenshot(api,page,'notes-returned');
      const control=await api.context.newPage();
      try{await control.goto(`${origin(api)}/notes`,{waitUntil:'domcontentloaded'});await control.getByRole('button',{name:'Pass5 Terminal Note',exact:true}).waitFor({timeout:20000});
        api.report('listener-notes-native-terminal-recovery',{failed,returned,freshPage:await snapshot(control),serverNote:(await api.db.doc(`${api.notesPath}/${IDS.note}`).get()).data(),consoleErrors});
      }finally{await control.close();}
    }else{
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      try{await page.getByText('Pass5 Terminal NPC',{exact:true}).first().waitFor({timeout:20000});
        // Verify the re-opened native listener continues observing independent server changes.
        await api.db.doc(`${api.basePath}/npcs/${IDS.npc}`).update({name:'Pass5 Terminal NPC Recovered'});
        await page.getByText('Pass5 Terminal NPC Recovered',{exact:true}).first().waitFor({timeout:10000});
        api.report('listener-npcs-native-retry-control',{failed,recovered:await snapshot(page),serverNPC:(await api.db.doc(`${api.basePath}/npcs/${IDS.npc}`).get()).data(),consoleErrors});await screenshot(api,page,'npcs-recovered');
      }catch(error){api.report('listener-npcs-native-retry-failed',{error:error.message,failed,afterRetry:await snapshot(page),consoleErrors});}
    }
    return true;
  }finally{await page.close();}
}
async function run(api){await scenario(api,'npcs');}
module.exports={seed,run,IDS};
