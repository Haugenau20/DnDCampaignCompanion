'use strict';
const path=require('node:path');
const assert=require('node:assert/strict');
const buildFixtures=require('/workspace/DnDCampaignCompanion/docs/reviews/2026-10-04/pass-4/evidence/probes/workflows/fixtures.cjs');
exports.seed=async api=>{
 const f=buildFixtures(api);for(const d of f.documents)await api.db.doc(d.path).set(d.data);
 const b=f.documents.find(d=>d.path.endsWith('/locations/'+f.ids.location)).data;
 for(const [id,name,parentId]of [['writes-tree','Failure Tree',''],['writes-first','First Child','writes-tree'],['writes-second','Second Child','writes-tree']])await api.db.doc(`${api.basePath}/locations/${id}`).set({...b,id,name,parentId});
};
async function install(page){
 await page.addInitScript(()=>{
  const state=window.__writeFault={target:null,injected:[],seen:[],fetches:0,xhrs:0};
  const local=url=>{try{const u=new URL(url,location.href);return ['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='8080'&&u.pathname.includes('google.firestore.v1.Firestore/Write/channel');}catch{return false;}};
  function rewrite(body){
   if(typeof body!=='string')return body;
   const params=new URLSearchParams(body);let changed=false;
   for(const [key,val]of [...params]){
    if(key==='$req'){const next=rewrite(val);if(next!==val){params.set(key,next);changed=true;}continue;}
    if(!key.endsWith('___data__'))continue;
    let m;try{m=JSON.parse(val);}catch{continue;}
    if(!Array.isArray(m.writes))continue;
    let touched=false;
    for(const w of m.writes){
     const name=w.update?.name||w.delete||w.transform?.document;
     if(name)state.seen.push({name,operation:w.delete?'delete':w.update?'update':'transform'});
     if(state.target&&name?.endsWith('/documents/'+state.target)){
      state.injected.push({name,originalPrecondition:w.currentDocument||null,injectedPrecondition:{updateTime:'1970-01-01T00:00:00.000000001Z'}});
      w.currentDocument={updateTime:'1970-01-01T00:00:00.000000001Z'};state.target=null;touched=true;
     }
    }
    if(touched){params.set(key,JSON.stringify(m));changed=true;}
   }
   return changed?params.toString():body;
  }
  const meta=new WeakMap(),open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(method,url,...args){meta.set(this,local(String(url)));return open.call(this,method,url,...args);};
  XMLHttpRequest.prototype.send=function(body){if(meta.get(this)){state.xhrs++;body=rewrite(body);}return send.call(this,body);};
  const original=window.fetch;
  window.fetch=async function(input,init){const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url;
   if(local(String(url))){state.fetches++;if(init&&typeof init.body==='string')init={...init,body:rewrite(init.body)};
    else if(input instanceof Request){const raw=await input.clone().text(),next=rewrite(raw);if(next!==raw)input=new Request(input,{body:next});}}
   return original.call(this,input,init);
  };
 });
}
exports.run=async api=>{
 const {page,db,report,go,outDir}=api,f=buildFixtures(api);
 await install(page);page.setDefaultTimeout(12000);
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const read=async p=>(await db.doc(p).get()).data();
 async function poll(fn,label){const end=Date.now()+14000;while(Date.now()<end){const x=await fn();if(x)return x;await sleep(120);}throw Error('Timeout '+label);}
 const snap=()=>page.evaluate(()=>({path:location.pathname,body:document.body.innerText.slice(-12000),fault:window.__writeFault,inputs:[...document.querySelectorAll('input,textarea')].map(x=>({label:x.getAttribute('aria-label'),value:x.value})),alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent)}));
 const arm=async target=>{assert.ok(target.startsWith(api.basePath+'/')||target.startsWith(api.notesPath+'/'));await page.evaluate(p=>window.__writeFault.target=p,target);};
 const injected=()=>poll(()=>page.evaluate(()=>window.__writeFault?.injected?.length>0),'outbound local fault injection');
 async function settled(){await injected();await poll(async()=>!(await page.getByRole('button',{name:/Creating|Saving|Deleting…/}).count()),'UI settlement');await sleep(650);return snap();}
 async function step(name,fn){try{const detail=await fn();await page.screenshot({path:path.join(outDir,name+'.png'),fullPage:true}).catch(()=>{});report(name,{status:'observed',...detail});}catch(e){report(name,{status:'diagnostic-error',error:e.stack,state:await snap().catch(()=>null)});await page.screenshot({path:path.join(outDir,name+'.png'),fullPage:true}).catch(()=>{});}}
 for(const kind of ['npc','location','quest'])await step('failed-'+kind+'-create-retry',async()=>{
  const plural={npc:'npcs',location:'locations',quest:'quests'}[kind],name='Failure '+kind,slug='failure-'+kind,target=`${api.basePath}/${plural}/${slug}`;
  await go(`/${plural}/create`);const nameField=page.getByLabel(kind==='quest'?'Title':'Name',{exact:true});
  await nameField.fill(name);await page.getByLabel({npc:'Who are they, in a line?',location:'What is this place, in a line?',quest:'What was the party asked to do?'}[kind],{exact:true}).fill('Draft retained after one local server rejection.');
  await arm(target);await page.getByRole('button',{name:'Create & open',exact:true}).click();await injected();await poll(async()=>await page.getByRole('alert').count(),'create failure alert');
  const failure=await snap(),serverAfterFailure=await read(target);assert.equal(serverAfterFailure,undefined);assert.equal(await nameField.inputValue(),name);
  await page.getByRole('button',{name:'Create & open',exact:true}).click();await page.waitForURL(u=>u.pathname.startsWith(`/${plural}/`)&&!u.pathname.endsWith('/create'));
  const id=new URL(page.url()).pathname.split('/').pop(),saved=await poll(()=>read(`${api.basePath}/${plural}/${id}`),'healthy retry create');
  return {failure,serverAbsentAfterFailure:true,id,saved,passingControl:'same form retains draft and retry creates one record'};
 });
 await step('failed-npc-edit-retry-known-react002',async()=>{
  const target=`${api.basePath}/npcs/${f.ids.npc}`;await go(`/npcs/${f.ids.npc}`);
  await page.getByRole('button',{name:`Edit the name ${f.names.npc}`,exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Rejected draft NPC title');await arm(target);
  await page.getByRole('button',{name:'Save name',exact:true}).click();await injected();await sleep(1200);const failure=await snap(),server=await read(target);
  const retry=page.getByRole('button',{name:/try again|retry/i});if(await retry.count()){await retry.first().click();await sleep(1200);}
  return {overlap:'REACT-002',failure,server,afterRetry:await snap(),serverUnchanged:server.name===f.names.npc};
 });
 await step('failed-location-attach-known-react002',async()=>{
  const target=`${api.basePath}/locations/${f.ids.location}`;await go(`/locations/${f.ids.location}`);
  await page.getByRole('button',{name:`Attach to the people in ${f.names.location}`,exact:true}).click();await arm(target);
  await page.getByRole('listbox').getByRole('option').filter({hasText:f.names.npc}).click();await injected();await sleep(1100);
  const failure=await snap(),server=await read(target);assert(!server.connectedNPCs.includes(f.ids.npc));
  return {overlap:'REACT-002',failure,server,serverUnchanged:true};
 });
 await step('prepared-note-conversion-source-failure-retry-known-data005',async()=>{
  await go(`/notes/${f.noteId}`);const e=f.documents.find(d=>d.path.endsWith('/'+f.noteId)).data.extractedEntities.find(e=>e.type==='npc');
  await page.locator('.campaign-links').getByText(e.text,{exact:true}).locator('..').locator('..').getByRole('button',{name:'Add',exact:true}).click();await page.waitForURL('**/npcs/create');
  await arm(`${api.notesPath}/${f.noteId}`);await page.getByRole('button',{name:'Create & open',exact:true}).click();await injected();await page.getByRole('alert').waitFor();
  const failure=await snap(),sourceAfterFailure=await read(`${api.notesPath}/${f.noteId}`),firstTargets=await db.collection(`${api.basePath}/npcs`).where('name','==',e.text).get();
  assert.equal(firstTargets.size,1);assert(!sourceAfterFailure.extractedEntities.find(x=>x.id===e.id).isConverted);
  await page.getByRole('button',{name:'Create & open',exact:true}).click();await page.waitForURL(u=>u.pathname.startsWith('/npcs/')&&!u.pathname.endsWith('/create'));
  const targets=await db.collection(`${api.basePath}/npcs`).where('name','==',e.text).get(),source=await read(`${api.notesPath}/${f.noteId}`);
  return {overlap:'DATA-005',failure,sourceAfterFailure,firstTargets:firstTargets.docs.map(x=>x.id),targetsAfterRetry:targets.docs.map(x=>x.id),sourceAfterRetry:source,modelRequests:0};
 });
 await step('failed-location-subtree-partial-delete',async()=>{
  await go('/locations/writes-tree');await page.getByRole('button',{name:'Delete location',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('radio',{name:/Delete them too/}).check();
  await arm(`${api.basePath}/locations/writes-second`);await dialog.getByRole('button',{name:'Delete Failure Tree',exact:true}).click();await injected();await sleep(1200);
  const state=await snap(),server={};for(const id of ['writes-tree','writes-first','writes-second'])server[id]=(await db.doc(`${api.basePath}/locations/${id}`).get()).exists;
  report('partial-subtree-before-reload',{state,server});assert.equal(server['writes-first'],false);assert.equal(server['writes-second'],true);assert.equal(server['writes-tree'],true);
  await go('/locations/writes-tree');await page.getByRole('button',{name:'Delete location',exact:true}).click();const retryDialog=page.getByRole('dialog');await retryDialog.getByRole('radio',{name:/Delete them too/}).check();await retryDialog.getByRole('button',{name:'Delete Failure Tree',exact:true}).click();
  await poll(async()=>!(await db.doc(`${api.basePath}/locations/writes-tree`).get()).exists,'healthy reload retry');const after={};for(const id of ['writes-tree','writes-first','writes-second'])after[id]=(await db.doc(`${api.basePath}/locations/${id}`).get()).exists;
  return {failure:state,partialServerState:server,reloadRetryFinal:after,control:'reload and retry deletes remaining subtree'};
 });
 await step('failed-npc-leaf-delete-known-react002',async()=>{
  const found=await db.collection(`${api.basePath}/npcs`).where('name','==','Failure npc').get();assert.equal(found.size,1);const id=found.docs[0].id,target=`${api.basePath}/npcs/${id}`;await go('/npcs/'+id);await page.getByRole('button',{name:'Delete',exact:true}).click();await arm(target);await page.getByRole('dialog').getByRole('button',{name:'Delete NPC',exact:true}).click();await injected();await sleep(1000);
  return {overlap:'REACT-002; FUNC-006 applies to chapters only',failure:await snap(),server:(await db.doc(target).get()).exists};
 });
 await step('failed-image-replacement-preserves-old-file',async()=>{
  const npcPath=`${api.basePath}/npcs/${f.ids.npc}`;await go(`/npcs/${f.ids.npc}`);await page.getByRole('button',{name:'Add portrait',exact:true}).waitFor();
  const bytes=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=16;c.height=12;const x=c.getContext('2d');x.fillStyle='#1166bb';x.fillRect(0,0,16,12);return c.toDataURL('image/png');});
  const upload=()=>page.locator('input[type=file][data-testid=image-upload-input]').setInputFiles({name:'synthetic-write-portrait.png',mimeType:'image/png',buffer:Buffer.from(bytes.split(',')[1],'base64')});
  await upload();const old=await poll(async()=>{const x=await read(npcPath);return x.image||false;},'initial healthy portrait');const bucket=api.admin.storage().bucket();assert((await bucket.file(old.path).exists())[0]);
  const prefix=old.path.slice(0,old.path.lastIndexOf('/')+1);await arm(npcPath);await upload();await injected();await sleep(1800);const state=await snap(),server=await read(npcPath),files=(await bucket.getFiles({prefix}))[0].map(x=>x.name);
  assert.equal(server.image.path,old.path);assert((await bucket.file(old.path).exists())[0]);
  return {failure:state,serverImage:server.image,oldBinaryExists:true,remainingFiles:files,oldFile:old.path,passingControl:'reference failure preserves old portrait and discards unreferenced replacement'};
 });
 report('write-failures-complete',{runtime:'Actual full App, real local Firebase writes, exact outbound Write precondition fault; no model calls; independent Admin readbacks'});
};
exports.install=install;
