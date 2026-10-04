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
 await step('search-keyboard-open-select-destination-final',async()=>{
  const note=(await db.doc(notesPath+'/kb-note').get()).data();await go('/notes');await page.getByRole('button',{name:note.title,exact:true}).waitFor();const trigger=page.getByRole('button',{name:/Search/}).filter({hasText:'Search'});await trigger.waitFor();
  await activate(trigger);const field=page.locator('input[role="combobox"][aria-controls="palette-results"]');await field.waitFor();const entry=await focus();await page.keyboard.press('Escape');const escape=await focus();
  await page.keyboard.press('Control+k');await field.waitFor();const shortcutEntry=await focus();await page.keyboard.insertText(note.title);let reissuedQuery=false;try{await page.locator('#cmdk-option-note-kb-note').waitFor({timeout:5000});}catch(error){reissuedQuery=true;await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText('Keyboard');await pause(350);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(note.title);await page.locator('#cmdk-option-note-kb-note').waitFor({timeout:10000});}await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
  const selected=await field.getAttribute('aria-activedescendant');assert(selected&&selected.includes('kb-note'));await page.keyboard.press('Enter');await page.waitForURL(u=>u.pathname==='/notes/kb-note');await page.getByLabel('Note content',{exact:true}).waitFor();await pause(100);const destination=await focus();await page.keyboard.press('Tab');return {reissuedQuery,entry,escape,shortcutEntry,selected,destination,firstTab:await focus(),live:await regions(),title:await page.getByLabel('Note title').inputValue()};
 });
};
