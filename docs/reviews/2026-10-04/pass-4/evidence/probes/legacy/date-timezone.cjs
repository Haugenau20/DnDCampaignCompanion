/* Supported historical date shapes in the real app, in two browser timezones. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const id = 'legacy4-date-boundary';
const fixture = uid => ({
  createdBy: uid, createdByUsername: 'Legacy recorder', dateAdded: '2025-05-31T19:27:30.387Z',
  name: 'Legacy Date Witness', description: 'Two historical writers recorded the same UTC calendar day.',
  status: 'alive', relationship: 'neutral',
  connections: {relatedNPCs: [], affiliations: [], relatedQuests: []},
  notes: [
    {date: '2025-05-31', text: 'Legacy NPC calendar note'},
    {date: '2025-05-31T19:27:30.387Z', text: 'Legacy generator ISO note'},
  ],
});
module.exports.seed = async ({db, uid, basePath}) => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost):\d+$/);
  await db.doc(`${basePath}/npcs/${id}`).set(fixture(uid));
};
module.exports.run = async ({page, context, db, basePath, baseUrl, outDir, report}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  const observe = async timezoneId => {
    await cdp.send('Emulation.setTimezoneOverride', {timezoneId});
    await page.goto(`${baseUrl}/npcs/${id}`);
    await page.getByText('Legacy NPC calendar note', {exact: true}).waitFor();
    const buttons = await page.getByRole('button', {name: /^Edit the note from /}).evaluateAll(nodes =>
      nodes.map(node => ({
        label: node.getAttribute('aria-label'),
        note: document.getElementById(node.getAttribute('aria-describedby'))?.textContent,
      })));
    return {timezone: await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone), buttons};
  };
  const before = (await db.doc(`${basePath}/npcs/${id}`).get()).data();
  const utc = await observe('UTC');
  assert.deepEqual(utc.buttons.map(b => b.label), ['Edit the note from 31/05/2025', 'Edit the note from 31/05/2025']);
  await page.screenshot({path: path.join(outDir, 'legacy-note-dates-utc.png'), fullPage: true});
  const west = await observe('America/Los_Angeles');
  assert.equal(west.timezone, 'America/Los_Angeles');
  assert.equal(west.buttons.find(b => b.note === 'Legacy NPC calendar note')?.label, 'Edit the note from 30/05/2025');
  assert.equal(west.buttons.find(b => b.note === 'Legacy generator ISO note')?.label, 'Edit the note from 31/05/2025');
  await page.screenshot({path: path.join(outDir, 'legacy-note-dates-los-angeles.png'), fullPage: true});
  await page.getByRole('button', {name: 'Edit the note from 30/05/2025', exact: true}).click();
  await page.getByRole('textbox', {name: 'Note from 30/05/2025', exact: true}).fill('Legacy NPC calendar note, corrected prose');
  await page.getByRole('button', {name: 'Save note', exact: true}).click();
  let after;
  for (let attempt = 0; attempt < 80; attempt++) {
    after = (await db.doc(`${basePath}/npcs/${id}`).get()).data();
    if (after.notes[0].text.endsWith('corrected prose')) break;
    await page.waitForTimeout(100);
  }
  assert.equal(after.notes[0].text, 'Legacy NPC calendar note, corrected prose');
  assert.equal(after.notes[0].date, before.notes[0].date);
  assert.deepEqual(after.notes[1], before.notes[1]);
  assert.deepEqual(errors, []);
  const result = {name: 'date-only-shifts-west-of-utc', status: 'reproduced',
    expectedCalendarLabel: 'Edit the note from 31/05/2025', utc, west, before, after,
    effect: 'Display and edit prompt show the previous day; persisted date remains intact',
    provenance: 'dateFormatter.ts:98 documents old NPC writer YYYY-MM-DD and old generator/location writer full ISO; NPCNote supports both'};
  report('legacy.date-only-shifts-west-of-utc', result);
  fs.writeFileSync(path.join(outDir, 'legacy-timezone-results.json'), JSON.stringify(result, null, 2));
  await cdp.send('Emulation.setTimezoneOverride', {timezoneId: 'UTC'});
  await cdp.detach();
  return result;
};
