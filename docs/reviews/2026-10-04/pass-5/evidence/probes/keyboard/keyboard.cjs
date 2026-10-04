'use strict';
const path=require('node:path');
const assert=require('node:assert/strict');
exports.seed=async api=>{
 const {db,basePath,notesPath,attribution,now,campaignId,groupId}=api;
 const docs=[
 ['locations/kb-harbor',{...attribution,id:'kb-harbor',name:'Keyboard Harbor',description:'Synthetic keyboard harbor.',type:'town',status:'known',parentId:'',features:[],connectedNPCs:[],relatedQuests:[],notes:[],tags:[]}],
 ['npcs/kb-ferryman',{...attribution,id:'kb-ferryman',name:'Keyboard Ferryman',title:'',race:'human',occupation:'Guide',description:'Synthetic keyboard guide.',location:'',locationId:'',appearance:'',personality:'',background:'',status:'alive',relationship:'neutral',connections:{relatedNPCs:[],relatedQuests:[],affiliations:[]},notes:[],tags:[]}],
 ['quests/kb-crossing',{...attribution,id:'kb-crossing',title:'Keyboard Crossing',description:'Cross the synthetic river.',background:'',status:'active',objectives:[],leads:[],complications:[],rewards:[],keyLocations:[],relatedNPCIds:[],location:'',locationId:'',levelRange:''}],
 ['chapters/kb-chapter',{...attribution,id:'kb-chapter',title:'Keyboard Opening Chapter',content:'# Arrival\n\nThe party arrived at the synthetic harbor.',summary:'Synthetic keyboard chapter.',order:1}]
 ];
 for(const [p,data] of docs) await db.doc(basePath+'/'+p).set(data);
 await db.doc(notesPath+'/kb-note').set({...attribution,id:'kb-note',campaignId,title:'Keyboard Session',content:'A synthetic note for keyboard authoring.',extractedEntities:[],status:'active',tags:[],updatedAt:now});
 await db.doc(`groups/${groupId}/campaigns/${campaignId}-keyboard-other`).set({id:campaignId+'-keyboard-other',groupId,name:'Keyboard Other Campaign',description:'Synthetic keyboard switch target.',createdAt:now,createdBy:api.uid,isActive:true});
 if(api.report)api.report('keyboard-seed',{paths:docs.map(([p])=>basePath+'/'+p),otherCampaign:campaignId+'-keyboard-other'});
};
exports.run=async api=>{
 const {page,go,report,db,basePath,notesPath,outDir}=api; const results=[];
 page.setDefaultTimeout(10000);
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const focus=()=>page.evaluate(()=>{const e=document.activeElement;return {tag:e.tagName,role:e.getAttribute('role'),name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,160),id:e.id,invalid:e.getAttribute('aria-invalid'),describedby:e.getAttribute('aria-describedby'),value:e.value};});
 const regions=()=>page.locator('[role="status"],[role="alert"],[aria-live]').evaluateAll(es=>es.map(e=>({role:e.getAttribute('role'),live:e.getAttribute('aria-live'),text:e.textContent.trim()})));
 const to=async loc=>{await loc.waitFor({state:'visible'}); for(let i=0;i<150;i++){if(await loc.evaluate(e=>e===document.activeElement))return i;await page.keyboard.press('Tab');}throw Error('Keyboard could not reach '+await loc.evaluate(e=>e.outerHTML));};
 const activate=async (loc,key='Enter')=>{await to(loc);await page.keyboard.press(key);};
 const type=async (loc,value)=>{await to(loc);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);};
 const snap=async name=>{if(outDir)await page.screenshot({path:path.join(outDir,'keyboard-'+name+'.png'),fullPage:true});};
 const step=async(name,fn)=>{if(api.caseFilter&&!name.includes(api.caseFilter))return;try{const detail=await fn();const r={name,status:'observed',detail,url:page.url()};results.push(r);report(name,r);}catch(e){const r={name,status:'diagnostic-error',error:String(e.stack||e),focus:await focus(),url:page.url(),body:(await page.locator('body').innerText()).slice(0,5000)};results.push(r);report(name,r);await snap(name+'-error');}};
 const poll=async(fn)=>{const end=Date.now()+12000;while(Date.now()<end){const v=await fn();if(v)return v;await pause(100);}throw Error('Persistence observation timed out');};
 const ax=async loc=>{const cdp=await page.context().newCDPSession(page);try{const d=await cdp.send('DOM.getDocument'); const s=await loc.evaluate(e=>{if(!e.id)e.dataset.keyboardAx='target';return e.id?'#'+CSS.escape(e.id):'[data-keyboard-ax="target"]';}); const n=await cdp.send('DOM.querySelector',{nodeId:d.root.nodeId,selector:s});return (await cdp.send('Accessibility.getPartialAXTree',{nodeId:n.nodeId,fetchRelatives:false})).nodes;}finally{await cdp.detach();}};
 await step('account-menu-navigation-controls',async()=>{
  await go('/');const trigger=page.getByRole('button',{name:/Account menu, posting as/});await activate(trigger);
  const entry=await focus();await page.keyboard.press('End');const end=await focus();await page.keyboard.press('Tab');const wrap=await focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');const arrow=await focus();
  const radios=await page.getByRole('menu',{name:'Account',exact:true}).getByRole('menuitemradio').evaluateAll(es=>es.map(e=>({name:e.textContent.trim(),checked:e.getAttribute('aria-checked')})));
  await page.keyboard.press('Escape');const closed=await focus();assert.equal(await page.getByRole('menu',{name:'Account',exact:true}).count(),0);return {entry,end,wrap,arrow,radios,closed};
 });
 await step('campaign-menu-step-switch-and-undo',async()=>{
  await go('/');const trigger=page.getByRole('button',{name:/^Active campaign:/});const originalName=await trigger.getAttribute('aria-label');await activate(trigger);const entry=await focus();await page.keyboard.press('Enter');await page.getByRole('menuitem',{name:'Choose a group',exact:true}).waitFor();const afterChange=await focus();await page.keyboard.press('Tab');const recovered=await focus();await page.keyboard.press('Enter');await page.getByRole('menuitem',{name:'Change',exact:true}).waitFor();const afterBack=await focus();
  await activate(page.getByRole('menuitem').filter({hasText:'Keyboard Other Campaign'}));await page.getByRole('button',{name:/^Active campaign: Keyboard Other Campaign/}).waitFor();await page.getByRole('button',{name:'Undo',exact:true}).waitFor();await pause(100);const afterSwitch=await focus(),switchRegions=await regions();await page.keyboard.press('Tab');const firstTab=await focus();
  await activate(page.getByRole('button',{name:'Undo',exact:true}));await page.getByRole('button',{name:originalName,exact:true}).waitFor();await pause(100);const afterUndo=await focus();await snap('campaign-undo');return {entry,afterChange,recovered,afterBack,afterSwitch,firstTab,switchRegions,afterUndo};
 });
 for(const [kind,id,display,label,save] of [['npc','kb-ferryman','Keyboard Ferryman','Name','Save name'],['location','kb-harbor','Keyboard Harbor','Name','Save name'],['quest','kb-crossing','Keyboard Crossing','Title','Save title']])await step('inline-'+kind+'-cancel-save-focus',async()=>{
  const plural={npc:'npcs',location:'locations',quest:'quests'}[kind];await go('/'+plural+'/'+id);
  const opener=()=>kind==='npc'?page.getByRole('button',{name:'Edit the name '+display,exact:true}):page.getByRole('button',{name:'Rename',exact:true});
  await activate(opener());const entry=await focus();await page.keyboard.press('Escape');await opener().waitFor();const escape=await focus();
  await activate(opener());await activate(page.getByRole('button',{name:'Cancel',exact:true}));await opener().waitFor();const cancel=await focus();
  await activate(opener());const renamed=display+' Renamed';await type(page.getByLabel(label,{exact:true}),renamed);await activate(page.getByRole('button',{name:save,exact:true}));await page.getByLabel(label,{exact:true}).waitFor({state:'detached'});const stored=await poll(async()=>{const d=(await db.doc(basePath+'/'+plural+'/'+id).get()).data();return (d.name||d.title)===renamed?d:false;});const afterSave=await focus(),live=await regions();await snap('inline-'+kind+'-save');await page.keyboard.press('Tab');const firstTab=await focus();return {entry,escape,cancel,afterSave,firstTab,live,storedName:stored.name||stored.title};
 });
 await step('quick-add-validation-success-focus',async()=>{
  await go('/npcs/create');const initial=await focus();await activate(page.getByRole('button',{name:'Create & open',exact:true}));const invalid={focus:await focus(),fields:await page.locator('input[aria-invalid="true"],textarea[aria-invalid="true"]').evaluateAll(es=>es.map(e=>({id:e.id,label:e.labels[0]?.textContent,describedby:e.getAttribute('aria-describedby')}))),live:await regions(),ax:await ax(page.getByLabel('Name',{exact:true}))};
  await type(page.getByLabel('Name',{exact:true}),'Keyboard Created NPC');await type(page.getByLabel('Who are they, in a line?',{exact:true}),'Created using only the keyboard.');await activate(page.getByRole('button',{name:'Create & open',exact:true}));await page.waitForURL(u=>u.pathname.startsWith('/npcs/')&&!u.pathname.endsWith('/create'));await page.getByRole('button',{name:'Edit the name Keyboard Created NPC',exact:true}).waitFor();const success={focus:await focus(),live:await regions()};return {initial,invalid,success};
 });
 await step('attachment-nested-quickadd-focus',async()=>{
  await go('/locations/kb-harbor');const trigger=page.getByRole('button',{name:/Attach to the people in Keyboard Harbor/});await activate(trigger);await to(page.getByLabel('Filter the list',{exact:true}));const entry=await focus();await page.keyboard.press('ArrowDown');const arrow=await focus();await page.keyboard.press('Escape');await trigger.waitFor();const escape=await focus();
  await activate(trigger);await type(page.getByLabel('Filter the list',{exact:true}),'UnmatchedKeyboardPerson');const hatch=page.getByRole('button',{name:'No such person yet — add one',exact:true});await activate(hatch);await page.getByRole('dialog').waitFor();const dialogEntry=await focus();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});const dialogExit=await focus();if(await page.getByRole('listbox').count())await page.keyboard.press('Escape');return {entry,arrow,escape,dialogEntry,dialogExit};
 });
 await step('search-keyboard-open-select-destination',async()=>{
  await go('/');await page.keyboard.press('Control+k');const field=page.getByRole('combobox');await field.waitFor();await page.keyboard.insertText('Keyboard Session');await page.getByRole('option').filter({hasText:'Keyboard Session'}).waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');const selected=await field.getAttribute('aria-activedescendant');await page.keyboard.press('Enter');await page.waitForURL(u=>u.pathname==='/notes/kb-note');await page.getByLabel('Note content',{exact:true}).waitFor();const destination=await focus();return {selected,destination,live:await regions(),title:await page.getByLabel('Note title').inputValue()};
 });
 await step('full-app-navigation-new-note-focus',async()=>{
  await go('/');const notes=page.getByRole('navigation',{name:'Main',exact:true}).getByRole('button',{name:'Notes',exact:true});await activate(notes);await page.waitForURL(u=>u.pathname==='/notes');await page.getByRole('button',{name:'New note',exact:true}).waitFor();const afterNav=await focus();await activate(page.getByRole('button',{name:'New note',exact:true}));await page.waitForURL(u=>u.pathname.startsWith('/notes/'));await page.getByLabel('Note content',{exact:true}).waitFor();const afterCreate=await focus(),live=await regions();await page.keyboard.press('Tab');return {afterNav,afterCreate,live,firstTab:await focus(),h1:await page.getByRole('heading',{level:1}).allTextContents()};
 });
 await step('native-location-select-keyboard',async()=>{
  await go('/locations/kb-harbor');const select=page.getByLabel('Type',{exact:true});await to(select);await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');const value=await select.inputValue();await poll(async()=>(await db.doc(basePath+'/locations/kb-harbor').get()).data().type===value);return {focus:await focus(),value,ax:await ax(select)};
 });
 await step('note-keyboard-edit-manual-save-back',async()=>{
  await go('/notes/kb-note');await type(page.getByLabel('Note title'),'Keyboard Session Edited');await type(page.getByLabel('Note content',{exact:true}),'The party edited this note using only the keyboard.');await page.keyboard.press('Control+s');const data=await poll(async()=>{const d=(await db.doc(notesPath+'/kb-note').get()).data();return d.content==='The party edited this note using only the keyboard.'&&d.title==='Keyboard Session Edited'?d:false;});const savedFocus=await focus(),live=await regions();await activate(page.getByRole('button',{name:'All notes',exact:true}));await page.waitForURL(u=>u.pathname==='/notes');return {storedContent:data.content,savedFocus,live,backFocus:await focus()};
 });
 await step('chapter-native-validation-whitespace-error-save',async()=>{
  await go('/story/chapters/create');await activate(page.getByRole('button',{name:'Create Chapter',exact:true}));const native={focus:await focus(),validity:await page.getByLabel('Chapter Title',{exact:true}).evaluate(e=>({valueMissing:e.validity.valueMissing,message:e.validationMessage}))};
  await type(page.getByLabel('Chapter Title',{exact:true}),'   ');await type(page.getByLabel('Chapter Content',{exact:true}),'Synthetic chapter content.');await activate(page.getByRole('button',{name:'Create Chapter',exact:true}));await page.waitForURL(u=>u.pathname==='/story/chapters');const invalid={focus:await focus(),live:await regions(),navigatedDespiteValidationFailure:true};await snap('chapter-whitespace-error');await go('/story/chapters/create');await type(page.getByLabel('Chapter Content',{exact:true}),'Synthetic chapter content.');
  await type(page.getByLabel('Chapter Title',{exact:true}),'Keyboard Created Chapter');await activate(page.getByRole('button',{name:'Create Chapter',exact:true}));await poll(async()=>!(await db.collection(basePath+'/chapters').where('title','==','Keyboard Created Chapter').get()).empty);await pause(1200);return {native,invalid,successFocus:await focus(),url:page.url(),live:await regions()};
 });
 await step('full-story-phone-drawer-keyboard',async()=>{
  const old=page.viewportSize();try{await page.setViewportSize({width:390,height:844});await go('/story/chapters/kb-chapter');const trigger=page.getByRole('button',{name:'Chapters',exact:true});await activate(trigger);await page.getByRole('button',{name:'Close chapter list',exact:true}).waitFor();const entry=await focus();await page.keyboard.press('Tab');const forwardTab=await focus();await page.keyboard.press('Escape');const stillOpen=await page.getByRole('button',{name:'Close chapter list',exact:true}).isVisible();await snap('story-phone-drawer');return {entry,forwardTab,stillOpen,dialogs:await page.getByRole('dialog').count()};}finally{await page.setViewportSize(old);}
 });
 return results;
};
