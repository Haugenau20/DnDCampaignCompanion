'use strict';
// CENTRAL execution only: uses the actual app's campaign switcher and Search.
const assert = require('node:assert/strict');
const path = require('node:path');
const recovery = require('./recovery.cjs');
async function state(page) {
  return page.evaluate(() => ({ route: location.pathname,
    headings: [...document.querySelectorAll('h1')].map(n=>n.textContent),
    title: document.querySelector('input[aria-label="Note title"]')?.value,
    content: document.querySelector('.note-textarea')?.value,
    readOnly: document.querySelector('.note-textarea')?.disabled,
    bodyText: document.body.innerText.slice(-14000) }));
}
async function chooseCampaign(page, name) {
  await page.getByRole('button', { name: /^Active campaign:/ }).click();
  const item = page.getByRole('menuitem').filter({ has: page.getByText(name, {exact:true}) });
  await item.waitFor({ state: 'visible', timeout: 10000 });
  await item.click();
  await page.getByRole('button', { name: `Active campaign: ${name}. Change group or campaign`, exact: true }).waitFor({ timeout: 20000 });
}
async function bodyLoaded(page, id) {
  await page.getByLabel('Note content', {exact:true}).waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(id => document.querySelector('.note-textarea')?.value === `Original body for ${id}.`, id, {timeout:20000});
}
async function read(api, id) {
  const snap = await api.db.doc(`${api.notesPath}/${id}`).get();
  return snap.exists ? snap.data() : null;
}
async function run(api) {
  const origin = new URL(api.baseUrl);
  assert.ok(['127.0.0.1','localhost','[::1]'].includes(origin.hostname));
  const {page} = api, {IDS, CAMPAIGN_B} = recovery;
  const a = (await api.db.doc(`groups/${api.groupId}/campaigns/${api.campaignId}`).get()).data();
  const b = (await api.db.doc(`groups/${api.groupId}/campaigns/${CAMPAIGN_B}`).get()).data();
  await page.goto(`${origin.origin}/notes/${IDS.crossA}`, {waitUntil:'domcontentloaded'});
  await page.getByRole('heading', {name:`Recovery ${IDS.crossA}`,exact:true}).waitFor({timeout:20000});
  await page.getByText('Note from Different Campaign', {exact:true}).waitFor({timeout:20000});
  const initialCrossA = await state(page);
  await chooseCampaign(page,b.name);
  await bodyLoaded(page,IDS.crossA);
  const selectedBWithCrossA = await state(page);
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('combobox').fill(`Recovery ${IDS.crossB}`);
  const option = page.locator(`#cmdk-option-note-${IDS.crossB}`);
  await option.waitFor({state:'visible',timeout:10000});
  await option.click();
  await page.waitForURL(`**/notes/${IDS.crossB}`);
  await bodyLoaded(page,IDS.crossB);
  const selectedBWithCrossB = await state(page);
  await chooseCampaign(page,a.name);
  await page.getByLabel('Note content',{exact:true}).waitFor({state:'visible',timeout:20000});
  await page.waitForTimeout(500);
  const afterReturnToA = await state(page);
  api.report('ordinary-fallback-route-ownership', { initialCrossA, selectedBWithCrossA,
    selectedBWithCrossB, afterReturnToA, expectedRoute:`/notes/${IDS.crossB}`,
    expectedHeading:`Recovery ${IDS.crossB}`, persistedCrossA:await read(api,IDS.crossA),
    persistedCrossB:await read(api,IDS.crossB),
    navigation:'Actual campaign menu and exact note Search option; no synthetic history, application service or component replacement' });
  if(api.outDir) await page.screenshot({path:path.join(api.outDir,'recovery-ordinary-fallback.png'),fullPage:true});
}
module.exports={seed:recovery.seed,run};
