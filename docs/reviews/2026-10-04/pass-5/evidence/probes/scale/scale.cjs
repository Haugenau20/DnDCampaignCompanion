'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const scales=[100,1000,3000];
const id=(kind,index)=>`${kind}-${String(index).padStart(4,'0')}`;
const campaign=(api,n)=>n===100?api.campaignId:`${api.campaignId}-${n}`;
const counts=n=>({npcs:n*.4,locations:n*.2,quests:n*.15,rumors:n*.1,notes:n*.1,chapters:n*.05});
const prose='The party followed the lantern road from the harbor through the old forest. A guide described the bridge, the abandoned watchtower and a missing caravan. They recorded the travelers and promised to return with supplies. '.repeat(5);
exports.seed=async api=>{
 const docs=[];
 for(const n of (api.scaleSizes||scales)){
  const cid=campaign(api,n),base=`groups/${api.groupId}/campaigns/${cid}`,c=counts(n),common={...api.attribution,dateModified:api.now};
  docs.push({path:base,data:{id:cid,groupId:api.groupId,name:`Scale ${n} Campaign`,description:'Synthetic fifth-pass bounded scale dataset',createdAt:api.now,createdBy:api.uid,isActive:true}});
  for(const [kind,count] of Object.entries(c))for(let i=0;i<count;i++){
   const recordId=id(kind,i),locationId=id('locations',i%c.locations),npcId=id('npcs',i%c.npcs),questId=id('quests',i%c.quests);
   let data={...common,id:recordId};
   if(kind==='npcs')Object.assign(data,{name:`Scale ${n} Person ${String(i).padStart(4,'0')}`,title:'Road traveler',race:'human',occupation:'Guide',description:prose,background:prose.slice(0,400),appearance:'Wool coat and leather satchel.',personality:'Helpful and cautious.',status:i%10===0?'missing':'alive',relationship:i%3===0?'friendly':'neutral',locationId,location:locationId,connections:{relatedNPCs:[id('npcs',(i+1)%c.npcs)],relatedQuests:[questId],affiliations:['Harbor guides']},notes:[],tags:['lantern','road']});
   if(kind==='locations')Object.assign(data,{name:`Scale ${n} Place ${String(i).padStart(4,'0')}`,description:prose,type:i%4===0?'city':'building',status:'known',parentId:i>=20?id('locations',Math.floor(i/20)-1):'',features:['Lantern road','Stone bridge'],connectedNPCs:[npcId],relatedQuests:[questId],notes:[],tags:['harbor']});
   if(kind==='quests')Object.assign(data,{title:`Scale ${n} Quest ${String(i).padStart(4,'0')}`,description:prose,background:prose.slice(0,250),status:'active',objectives:[{id:'objective-1',description:'Find the missing lantern caravan',completed:false}],leads:[],complications:[],rewards:['Safe passage'],keyLocations:[locationId],relatedNPCIds:[npcId],locationId,location:locationId,levelRange:'3–5'});
   if(kind==='rumors')Object.assign(data,{title:`Scale ${n} Rumour ${String(i).padStart(4,'0')}`,content:prose,status:'unconfirmed',sourceType:'npc',sourceName:`Scale ${n} Person ${String(i%c.npcs).padStart(4,'0')}`,sourceNpcId:npcId,locationId,location:locationId,relatedNPCs:[npcId],relatedLocations:[locationId],notes:[]});
   if(kind==='notes')Object.assign(data,{campaignId:cid,title:`Scale ${n} Session ${String(i).padStart(4,'0')}`,content:prose.repeat(2),updatedAt:api.now,status:'active',tags:['lantern'],extractedEntities:[]});
   if(kind==='chapters')Object.assign(data,{title:`Scale ${n} Chapter ${String(i).padStart(4,'0')}`,content:'# Along the lantern road\n\n'+prose.repeat(3),summary:'The party explores the lantern road.',order:i+1});
   docs.push({path:kind==='notes'?`${api.notesPath}/${cid}-${recordId}`:`${base}/${kind}/${recordId}`,data});
  }
 }
 for(let start=0;start<docs.length;start+=400){const batch=api.db.batch();for(const d of docs.slice(start,start+400))batch.set(api.db.doc(d.path),d.data);await batch.commit();}
 api.report?.('scale-fixtures',{scales,counts:scales.map(n=>({n,...counts(n)})),documents:docs.length,jsonBytes:Buffer.byteLength(JSON.stringify(docs)),proseCharacters:prose.length,modelRequests:0});
};
exports.run=async api=>{
 const {page,context,db,report,go,outDir}=api;fs.mkdirSync(outDir,{recursive:true});page.setDefaultTimeout(30000);
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 const network=[];const active=new Map();let additions=0,removals=0;
 page.on('request',request=>{
  if(!request.url().includes('Firestore/Listen/channel')&&!request.url().includes('Firestore/Listen'))return;
  const body=request.postData();if(!body)return;
  const payloads=[];try{payloads.push(JSON.parse(body));}catch{for(const v of new URLSearchParams(body).values())try{payloads.push(JSON.parse(v));}catch{}}
  const scan=value=>{if(!value||typeof value!=='object')return;if(value.addTarget){const t=value.addTarget;active.set(t.targetId,t);additions++;network.push({action:'add',targetId:t.targetId,target:t.query||t.documents});}if(value.removeTarget){active.delete(value.removeTarget);removals++;network.push({action:'remove',targetId:value.removeTarget});}for(const v of Object.values(value))if(typeof v==='object')scan(v);};payloads.forEach(scan);
 });
 const install=async()=>page.evaluate(()=>{
  window.__scaleTasks=[];window.__scaleResult=null;window.__scaleMetric=null;
  window.__scaleObserver?.disconnect();window.__scaleObserver=new PerformanceObserver(list=>{for(const e of list.getEntries())window.__scaleTasks.push({start:e.startTime,duration:e.duration});});window.__scaleObserver.observe({type:'longtask',buffered:false});
 });
 const arm=async(kind,value,expected)=>page.evaluate(({kind,value,expected})=>{
  window.__scaleResult=null;window.__scaleMetric={kind,value,expected,start:null};
  const begin=e=>{
   const m=window.__scaleMetric;if(!m||m.start!==null)return;
   if(kind==='filter'&&e.target.getAttribute('placeholder')!=='Search name, title or description')return;
   if(kind==='search'&&e.target.getAttribute('role')!=='combobox')return;
   if(kind==='location-filter'&&e.target.getAttribute('placeholder')!=='Search locations...')return;
   if(kind==='navigate'&&e.target.closest('button')?.textContent.trim()!==value)return;
   m.start=performance.now();document.removeEventListener(kind==='navigate'?'click':'input',begin,true);
   const check=()=>{
    let done=false;if(kind==='filter'||kind==='navigate')done=document.querySelectorAll('[id^="npc-npcs-"]').length===expected;
    else if(kind==='location-filter')done=document.querySelectorAll('[id^="location-locations-"]').length===expected;
    else if(kind==='search')done=document.querySelectorAll('#palette-results [id^="cmdk-option-"]').length===expected&&document.querySelector('[role="combobox"]')?.value===value&&!document.querySelector('[data-testid="palette-skeleton"]');
    if(done){const observed=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>{const end=performance.now();window.__scaleResult={kind,value,expected,domReadyMs:observed-m.start,twoFramesMs:end-m.start,start:m.start,end,longTasks:window.__scaleTasks.filter(t=>t.start<m.start? t.start+t.duration>m.start:t.start<=end)};window.__scaleMetric=null;}));return;}
    if(performance.now()-m.start>30000){window.__scaleResult={error:'browser-condition-timeout',kind,value,expected};return;}requestAnimationFrame(check);
   };requestAnimationFrame(check);
  };document.addEventListener(kind==='navigate'?'click':'input',begin,true);
 },{kind,value,expected});
 const collect=async()=>{await page.waitForFunction(()=>window.__scaleResult!==null,null,{timeout:45000});const result=await page.evaluate(()=>window.__scaleResult);assert(!result.error,JSON.stringify(result));return result;};
 const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');const [usage,dom,metrics]=await Promise.all([cdp.send('Runtime.getHeapUsage'),cdp.send('Memory.getDOMCounters'),cdp.send('Performance.getMetrics')]);return {heap:usage,dom,metrics:metrics.metrics.filter(m=>['JSHeapUsedSize','Nodes','JSEventListeners','Documents','LayoutDuration','ScriptDuration'].includes(m.name)),listenTargets:{active:active.size,additions,removals}};};
 const nav=async name=>{await page.getByRole('navigation',{name:'Main',exact:true}).locator('button:visible').filter({hasText:new RegExp(`^${name}$`)}).click();};
 const all=[];
 for(const n of (api.scaleSizes||scales)){
  const cid=campaign(api,n),base=`groups/${api.groupId}/campaigns/${cid}`,c=counts(n);
  const readbacks={};for(const kind of Object.keys(c)){const ref=kind==='notes'?db.collection(api.notesPath).where('campaignId','==',cid):db.collection(`${base}/${kind}`);const snapshot=await ref.get();assert.equal(snapshot.size,c[kind]);readbacks[kind]={count:snapshot.size,firstId:snapshot.docs[0].id,firstData:snapshot.docs[0].data()};}
  assert.equal(readbacks.npcs.firstData.locationId,id('locations',0));assert.equal(readbacks.quests.firstData.relatedNPCIds[0],id('npcs',0));assert.equal(readbacks.notes.firstData.campaignId,cid);fs.writeFileSync(path.join(outDir,`scale-${n}-readbacks.json`),JSON.stringify(readbacks,null,2));
  report('scale-independent-readback',{n,counts:Object.fromEntries(Object.entries(readbacks).map(([k,v])=>[k,v.count])),representativePaths:[`${base}/npcs/${id('npcs',0)}`,`${base}/locations/${id('locations',0)}`]});
  // Select persisted synthetic campaign during setup, then reload into a fresh App. Auth state is existing ordinary local session.
  await db.doc(`groups/${api.groupId}/users/${api.uid}`).update({activeCampaignId:cid});
  active.clear();const coldStart=Date.now();await go('/npcs');await page.waitForFunction(expected=>document.querySelectorAll('[id^="npc-npcs-"]').length===expected,c.npcs,{timeout:60000});
  const coldMs=Date.now()-coldStart;await install();
  const sample={n,counts:c,coldDocumentRouteMs:coldMs,coldSamples:1,coldMeaning:'new document/App, same browser HTTP/auth/SDK-cache environment; includes ordinary restore and local IO',filters:[],locationFilters:[],search:[],warmNavigation:[],memory:[],listenerNetworkBaseline:{active:active.size,additions,removals}};
  const field=page.getByPlaceholder('Search name, title or description',{exact:true});
  for(let i=0;i<3;i++){
   await arm('filter','Person 0000',1);await field.fill('Person 0000');sample.filters.push(await collect());
   await arm('filter','',c.npcs);await field.fill('');sample.filters.push(await collect());
  }
  if(n>=1000){await field.fill('Person 0000');await page.waitForFunction(()=>document.querySelectorAll('[id^="npc-npcs-"]').length===1);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');await arm('filter','',c.npcs);await field.fill('');sample.profiledFilter=await collect();const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(path.join(outDir,`scale-${n}-restore-npc-list.cpuprofile`),JSON.stringify(profile));await cdp.send('Profiler.disable');}
  await page.getByRole('button',{name:'Search',exact:true}).click();const search=page.getByRole('combobox');
  // Warm the full six-type corpus, then clear each query to avoid taking a previous result as this query's completion.
  await new Promise(resolve=>setTimeout(resolve,2000));await search.fill('lantern');
  if(api.warmupRecovery){
   const state=async()=>page.evaluate(()=>({query:document.querySelector('[role="combobox"]')?.value,results:[...document.querySelectorAll('#palette-results [id^="cmdk-option-"]')].map(e=>({id:e.id,text:e.textContent})),groups:[...document.querySelectorAll('#palette-results [role="group"]')].map(e=>({label:e.getAttribute('aria-label'),count:e.querySelectorAll('[id^="cmdk-option-"]').length})),skeleton:!!document.querySelector('[data-testid="palette-skeleton"]')}));
   await new Promise(resolve=>setTimeout(resolve,1000));const initial=await state();report('scale-search-initial-hydration',{n,stage:'one-second-after-first-query',state:initial});
   await new Promise(resolve=>setTimeout(resolve,12000));report('scale-search-initial-hydration',{n,stage:'same-query-after-twelve-more-seconds',state:await state()});
   await page.getByRole('button',{name:'Clear search',exact:true}).click();await search.fill('lantern');await page.waitForFunction(()=>document.querySelectorAll('#palette-results [id^="cmdk-option-"]').length===30,null,{timeout:30000});report('scale-search-hydration-requery',{n,state:await state()});
  }else await page.waitForFunction(()=>document.querySelectorAll('#palette-results [id^="cmdk-option-"]').length===30,null,{timeout:60000});
  for(let i=0;i<3;i++){await page.getByRole('button',{name:'Clear search',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#palette-results [id^="cmdk-option-"]').length===0);await arm('search','lantern',30);await search.fill('lantern');sample.search.push(await collect());}
  await page.keyboard.press('Escape');
  sample.memory.push({phase:'after-load-and-search',...(await heap())});
  for(let i=0;i<12;i++){
   await nav('Quests');await page.getByPlaceholder('Search quests...').waitFor();
   await arm('navigate','NPCs',c.npcs);await nav('NPCs');const metric=await collect();if(i<3)sample.warmNavigation.push(metric);
   if([2,5,11].includes(i))sample.memory.push({phase:`after-${i+1}-route-cycles`,...(await heap())});
  }
  await nav('Locations');const locationField=page.getByPlaceholder('Search locations...',{exact:true});await locationField.waitFor();
  for(let i=0;i<3;i++){await arm('location-filter','Place',c.locations);await locationField.fill('Place');sample.locationFilters.push(await collect());await arm('location-filter','Place 0000',1);await locationField.fill('Place 0000');sample.locationFilters.push(await collect());await arm('location-filter','',20);await locationField.fill('');sample.locationFilters.push(await collect());}
  await nav('NPCs');await field.waitFor();await page.waitForFunction(expected=>document.querySelectorAll('[id^="npc-npcs-"]').length===expected,c.npcs);
  sample.listenerNetworkFinal={active:active.size,additions,removals};sample.browserDocument={userAgent:await page.evaluate(()=>navigator.userAgent),domElements:await page.locator('*').count(),resources:await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('.js')).map(r=>({name:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize})))};
  all.push(sample);report('scale-browser-observation',sample);fs.writeFileSync(path.join(outDir,'scale-measurements.json'),JSON.stringify(all,null,2));
 }
 fs.writeFileSync(path.join(outDir,'scale-listen-network.json'),JSON.stringify(network,null,2));report('scale-listener-capture',{events:network.length,active:active.size,additions,removals,limit:'network target ownership evidence only; no claim about billable reads or five-minute linger expiry'});
 await cdp.detach();return all;
};
