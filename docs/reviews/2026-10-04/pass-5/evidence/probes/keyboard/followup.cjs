'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
exports.seed=require('./keyboard.cjs').seed;
exports.run=async api=>{
 const {page,go,report,db,basePath,notesPath,campaignId,outDir}=api;
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const focus=()=>page.evaluate(()=>{const e=document.activeElement;return {tag:e.tagName,role:e.getAttribute('role'),name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,160),value:e.value};});
 const regions=()=>page.locator('[role="status"],[role="alert"],[aria-live]').evaluateAll(es=>es.map(e=>({role:e.getAttribute('role'),live:e.getAttribute('aria-live'),text:e.textContent.trim()})));
 const to=async loc=>{await loc.waitFor({state:'visible'});for(let i=0;i<150;i++){if(await loc.evaluate(e=>e===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Keyboard target unreachable: '+await loc.evaluate(e=>e.outerHTML));};
 const activate=async loc=>{await to(loc);await page.keyboard.press('Enter');};
 const step=async(name,fn)=>{try{report(name,{name,status:'observed',detail:await fn(),url:page.url()});}catch(e){report(name,{name,status:'diagnostic-error',error:String(e.stack||e),focus:await focus(),url:page.url(),body:(await page.locator('body').innerText()).slice(0,5000)});}};
 await step('campaign-menu-step-switch-and-undo-followup',async()=>{
  const data=(await db.doc(basePath).get()).data();await go('/');
  const originalLabel=`Active campaign: ${data.name}. Change group or campaign`;
  const trigger=page.getByRole('button',{name:originalLabel,exact:true});await trigger.waitFor();await activate(trigger);const entry=await focus();await page.keyboard.press('Enter');await page.getByRole('menuitem',{name:'Choose a group',exact:true}).waitFor();const afterChange=await focus();await page.keyboard.press('Tab');const recovered=await focus();await page.keyboard.press('Enter');await page.getByRole('menuitem',{name:'Change',exact:true}).waitFor();const afterBack=await focus();
  await activate(page.getByRole('menuitem').filter({hasText:'Keyboard Other Campaign'}));await page.getByRole('button',{name:/^Active campaign: Keyboard Other Campaign/}).waitFor();await page.getByRole('button',{name:'Undo',exact:true}).waitFor();await pause(100);const afterSwitch=await focus(),switchRegions=await regions();await page.keyboard.press('Tab');const firstTab=await focus();
  await activate(page.getByRole('button',{name:'Undo',exact:true}));await trigger.waitFor();await pause(100);const afterUndo=await focus();await page.keyboard.press('Tab');const firstTabAfterUndo=await focus();
  await activate(trigger);const reopened=await focus();await page.keyboard.press('Escape');const escape=await focus();
  const stored=(await db.doc(`groups/${api.groupId}/users/${api.uid}`).get()).data();assert.equal(stored.activeCampaignId,campaignId);await page.screenshot({path:path.join(outDir,'keyboard-campaign-followup.png'),fullPage:true});
  return {entry,afterChange,recovered,afterBack,afterSwitch,firstTab,switchRegions,afterUndo,firstTabAfterUndo,reopened,escape,storedCampaignId:stored.activeCampaignId};
 });
 await step('search-keyboard-open-select-destination-followup',async()=>{
  const note=(await db.doc(notesPath+'/kb-note').get()).data();await go('/');const trigger=page.getByRole('button',{name:/Search/}).filter({hasText:'Search'});await trigger.waitFor();
  await activate(trigger);const field=page.getByRole('combobox');await field.waitFor();const entry=await focus();await page.keyboard.press('Escape');const escape=await focus();
  await page.keyboard.press('Control+k');await field.waitFor();const shortcutEntry=await focus();await page.keyboard.insertText(note.title);await page.getByRole('option').filter({hasText:note.title}).waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
  const selected=await field.getAttribute('aria-activedescendant');assert(selected&&selected.includes('kb-note'));await page.keyboard.press('Enter');await page.waitForURL(u=>u.pathname==='/notes/kb-note');await page.getByLabel('Note content',{exact:true}).waitFor();await pause(100);const destination=await focus();await page.keyboard.press('Tab');return {entry,escape,shortcutEntry,selected,destination,firstTab:await focus(),live:await regions(),title:await page.getByLabel('Note title').inputValue()};
 });
};
