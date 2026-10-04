'use strict';
const assert=require('node:assert/strict');
const {install}=require('./writes.cjs');
exports.seed=async api=>{for(const id of ['writes-autosave','writes-delete-note','writes-archive-note'])await api.db.doc(`${api.notesPath}/${id}`).set({...api.attribution,id,campaignId:api.campaignId,title:id,content:'Original synthetic note prose.',extractedEntities:[],status:'active',updatedAt:api.now,tags:[]});};
exports.run=async api=>{
 const {page,go,db,report}=api;await install(page);page.setDefaultTimeout(12000);
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 async function poll(fn){const end=Date.now()+14000;while(Date.now()<end){const x=await fn();if(x)return x;await sleep(120);}throw Error('Bounded note failure wait expired');}
 const snap=()=>page.evaluate(()=>({path:location.pathname,body:document.body.innerText.slice(-10000),fault:window.__writeFault,alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent)}));
 const arm=id=>page.evaluate(p=>window.__writeFault.target=p,`${api.notesPath}/${id}`);
 const injected=()=>poll(()=>page.evaluate(()=>window.__writeFault.injected.length>0));
 const read=async id=>(await db.doc(`${api.notesPath}/${id}`).get()).data();
 async function step(name,fn){try{report(name,{status:'observed',...await fn()});}catch(e){report(name,{status:'diagnostic-error',error:e.stack,state:await snap()});}}
 await step('note-autosave-failure-manual-retry-known-react004',async()=>{
  const id='writes-autosave';await go('/notes/'+id);const field=page.getByLabel('Note content',{exact:true});await field.waitFor();await arm(id);
  const text='Synthetic preserved draft after failed idle autosave.';await field.fill(text);await injected();await sleep(900);const failure=await snap(),serverAfterFailure=await read(id);assert.equal(serverAfterFailure.content,'Original synthetic note prose.');assert.equal(await field.inputValue(),text);
  await field.press('Control+s');const saved=await poll(async()=>{const x=await read(id);return x.content===text?x:false;});return {overlap:'REACT-004',failure,serverAfterFailure,saved,passingControl:'autosave failure retains draft; manual retry saves latest prose'};
 });
 for(const operation of ['delete','archive'])await step('note-'+operation+'-failure-feedback-and-retry',async()=>{
  const id=`writes-${operation}-note`;await go('/notes/'+id);await page.getByLabel('Note content',{exact:true}).waitFor();await arm(id);
  if(operation==='delete'){await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete note',exact:true}).click();}else await page.getByRole('button',{name:'Archive',exact:true}).click();
  await injected();await sleep(1000);const failure=await snap(),serverAfterFailure=await read(id);assert(serverAfterFailure);assert.equal(serverAfterFailure.status,'active');
  if(operation==='delete'){assert.equal(await page.getByRole('dialog').count(),0);await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete note',exact:true}).click();}else await page.getByRole('button',{name:'Archive',exact:true}).click();
  await page.waitForURL(u=>u.pathname==='/notes');const after=await read(id);if(operation==='delete')assert.equal(after,undefined);else assert.equal(after.status,'archived');
  return {failure,serverAfterFailure,afterRetry:after||null,passingControl:'same mounted note can retry successfully',paidModelCalls:0};
 });
};
