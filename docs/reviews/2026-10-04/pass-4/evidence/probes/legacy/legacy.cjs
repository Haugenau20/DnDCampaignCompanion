/* Fourth-pass diagnostic. Caller owns real app, emulator, page and sign-in. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const IDS = Object.freeze({
  npc: 'legacy4-archivist', location: 'legacy4-old-harbor',
  quest: 'legacy4-lost-logbook', rumor: 'legacy4-harbor-whisper',
  note: 'note-94001', chapter: 'legacy4-chapter', timestampChapter: 'legacy4-timestamp-chapter',
});
const DATE = '2025-05-31T19:27:30.387Z';
const NPC_NOTE = 'The archivist kept the original seal.';
const LOCATION_NOTE = 'The harbor bell rang at dusk.';
const NOTE_CONTENT = 'Legacy field journal\n\nThe Legacy Archivist met us at Legacy Old Harbor to seek the lost logbook.';
const CHAPTER_CONTENT = '# An old account\n\nThe party followed the shore to Legacy Old Harbor. The original account remains legible.\n\nThe Legacy Archivist asked them to find the lost logbook.';

function attribution(uid) {
  return { createdBy: uid, createdByUsername: 'Legacy recorder', dateAdded: DATE };
}

function fixtureDocs({uid, campaignId, basePath, notesPath, admin, nextOrder = 1}) {
  const common = attribution(uid);
  return [
    [`${basePath}/locations/${IDS.location}`, {
      ...common, name: 'Legacy Old Harbor', type: 'town', status: 'known',
      description: 'The place where the old logbook was last seen.',
      notes: [{date: DATE, text: LOCATION_NOTE}],
      // features, connectedNPCs, relatedQuests, parentId, tags, lastVisited,
      // image and all modification attribution fields are genuinely optional.
    }],
    [`${basePath}/npcs/${IDS.npc}`, {
      ...common, name: 'Legacy Archivist', status: 'alive', relationship: 'friendly',
      description: 'A keeper of records from before the harbor was rebuilt.',
      location: IDS.location,
      connections: { relatedNPCs: [], affiliations: ['Harbor archive'], relatedQuests: [IDS.quest] },
      notes: [{date: DATE, text: NPC_NOTE}],
      // No locationId, optional descriptive fields, tags, image, or note author.
    }],
    [`${basePath}/quests/${IDS.quest}`, {
      ...common, title: 'Legacy Lost Logbook', description: 'Recover the logbook for the archivist.',
      status: 'active', objectives: ['Find the old road', 'Cross the marshes'],
      location: 'Legacy Old Harbor', relatedNPCIds: [IDS.npc],
      importantNPCs: [{name: 'Forgotten patron', description: 'Preserved historical field; deliberately no longer displayed.'}],
      // No locationId, leads, keyLocations, complications, rewards or dateCompleted.
    }],
    [`${basePath}/rumors/${IDS.rumor}`, {
      ...common, title: 'Legacy Harbor Whisper', content: 'The lost logbook is under the harbor bell.',
      status: 'unknown', sourceType: 'other', sourceName: 'A voice by the quay',
      location: 'Legacy Old Harbor', relatedNPCs: [IDS.npc], relatedLocations: [IDS.location],
      notes: [], convertedToQuestId: IDS.quest,
    }],
    [`${notesPath}/${IDS.note}`, {
      ...common, title: 'New Note', content: NOTE_CONTENT, campaignId,
      status: 'active', tags: ['old journal'], updatedAt: DATE,
      extractedEntities: [{id: 'legacy4-extracted-npc', text: 'Legacy Archivist', type: 'npc',
        confidence: 0.9, isConverted: true, convertedToId: IDS.npc, createdAt: DATE,
        extraData: {description: 'The original extracted record.'}}],
    }],
    [`${basePath}/chapters/${IDS.chapter}`, {
      ...common, title: 'Legacy Shore Account', content: CHAPTER_CONTENT, order: nextOrder,
    }],
    [`${basePath}/chapters/${IDS.timestampChapter}`, {
      ...common, title: 'Legacy Timestamp Account', content: CHAPTER_CONTENT + '\n\nA distinct second account.',
      order: nextOrder + 1, modifiedBy: uid, modifiedByUsername: 'Legacy editor',
      dateModified: admin.firestore.Timestamp.fromDate(new Date('2025-06-02T12:00:00.000Z')),
    }],
  ];
}

async function seed(args) {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST || '';
  assert.match(emulator, /^(127\.0\.0\.1|localhost):\d+$/, 'Diagnostic seeds must use the local emulator');
  const chapters = await args.db.collection(`${args.basePath}/chapters`).get();
  const orders = chapters.docs.filter(d => !Object.values(IDS).includes(d.id)).map(d => d.data().order || 0);
  const documents = fixtureDocs({...args, nextOrder: Math.max(0, ...orders) + 1});
  for (const [documentPath, data] of documents) await args.db.doc(documentPath).set(data);
  return {count: documents.length, ids: IDS, provenance: [
    'quest-objectives.ts: pre-T050 persisted string arrays; e1282a4',
    'NPCNote and LocationNote: old full ISO dates and absent authors; 174480b',
    'NPC.location contract and T079: old id/name location values without locationId',
    'rumor-presentation.ts: extractor persisted unknown status; Rumor.sourceType: former default other',
    'note-title.ts: persisted New Note; NoteContext: old note-N ids kept',
    'Chapter.summary and ContentAttribution modifier fields are optional',
    'known #1202 old chapter-reorder Timestamp, compatibility control only; production audit already clean',
    'Quest.importantNPCs is deliberately unread under D15.7 but retained on writes',
  ]};
}

async function run({page, db, basePath, notesPath, baseUrl, outDir, report, go, onlyNames}) {
  fs.mkdirSync(outDir, {recursive: true});
  const results = [];
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const navigate = go || (route => page.goto(baseUrl + route));
  const read = async (collection, id) => (await db.doc(`${basePath}/${collection}/${id}`).get()).data();
  const readNote = async () => (await db.doc(`${notesPath}/${IDS.note}`).get()).data();
  const waitForData = async (getter, predicate) => {
    const start = Date.now();
    let value;
    do {
      value = await getter();
      if (predicate(value)) return value;
      await page.waitForTimeout(120);
    } while (Date.now() - start < 12000);
    throw new Error('Persisted state did not reach expectation: ' + JSON.stringify(value));
  };
  const check = async (name, operation) => {
    if (onlyNames && !onlyNames.includes(name)) return;
    const start = pageErrors.length;
    try {
      const evidence = await operation();
      assert.deepEqual(pageErrors.slice(start), [], 'No uncaught route errors');
      const result = {name, status: 'passed', evidence};
      results.push(result); report?.('legacy.' + name, result);
    } catch (error) {
      const screenshot = path.join(outDir, name + '.png');
      await page.screenshot({path: screenshot, fullPage: true}).catch(() => {});
      const result = {name, status: 'failed', error: String(error.stack || error), url: page.url(),
        body: (await page.locator('body').innerText().catch(() => '')).slice(0, 12000),
        pageErrors: pageErrors.slice(start), screenshot};
      results.push(result); report?.('legacy.' + name, result);
    }
  };

  await check('quest-list-and-objective-repair', async () => {
    await navigate('/quests');
    await page.getByPlaceholder('Search quests...').fill('marshes');
    await page.getByText('Legacy Lost Logbook', {exact: true}).first().waitFor();
    const before = await read('quests', IDS.quest);
    assert.equal(typeof before.objectives[0], 'string', 'Reading does not migrate Firestore');
    await navigate(`/quests/edit/${IDS.quest}`);
    await page.getByRole('checkbox', {name: 'Find the old road', exact: true}).waitFor();
    assert.ok(page.url().endsWith('/quests/' + IDS.quest), 'Retired edit deep link reaches real detail page');
    await page.getByRole('checkbox', {name: 'Find the old road', exact: true}).check();
    const after = await waitForData(() => read('quests', IDS.quest), d => d.objectives[0]?.completed === true);
    assert.deepEqual(after.objectives, [
      {id: 'objective-0', description: 'Find the old road', completed: true},
      {id: 'objective-1', description: 'Cross the marshes', completed: false},
    ]);
    assert.equal(after.status, 'active');
    assert.deepEqual(after.relatedNPCIds, before.relatedNPCIds);
    assert.deepEqual(after.importantNPCs, before.importantNPCs);
    assert.equal(after.location, before.location);
    assert.equal(Object.hasOwn(after, 'locationId'), false);
    await page.getByRole('button', {name: 'Reword Cross the marshes', exact: true}).click();
    await page.getByRole('textbox', {name: 'Objective', exact: true}).fill('Cross the marshes carefully');
    await page.getByRole('button', {name: 'Save objective', exact: true}).click();
    const edited = await waitForData(() => read('quests', IDS.quest), d => d.objectives[1]?.description === 'Cross the marshes carefully');
    assert.equal(edited.objectives[0].completed, true);
    assert.deepEqual(edited.objectives.map(o => o.id), ['objective-0', 'objective-1']);
    return {before, after: edited};
  });

  await check('npc-iso-note-roundtrip', async () => {
    await navigate(`/npcs/${IDS.npc}`);
    await page.getByText(NPC_NOTE, {exact: true}).waitFor();
    await page.getByRole('button', {name: 'Edit the note from 31/05/2025', exact: true}).click();
    await page.getByRole('textbox', {name: 'Note from 31/05/2025', exact: true}).fill(NPC_NOTE + ' The seal is intact.');
    await page.getByRole('button', {name: 'Save note', exact: true}).click();
    const after = await waitForData(() => read('npcs', IDS.npc), d => d.notes[0].text.includes('intact'));
    assert.equal(after.notes[0].date, DATE);
    assert.equal(Object.hasOwn(after.notes[0], 'author'), false, 'No invented historical author');
    assert.equal(after.location, IDS.location);
    assert.equal(Object.hasOwn(after, 'locationId'), false);
    assert.deepEqual(after.connections.relatedQuests, [IDS.quest]);
    return after;
  });

  await check('location-optional-fields-and-iso-note', async () => {
    await navigate('/locations');
    await page.getByText('Legacy Old Harbor', {exact: true}).first().waitFor();
    await navigate(`/locations/${IDS.location}`);
    await page.getByText(LOCATION_NOTE, {exact: true}).waitFor();
    await page.getByRole('button', {name: 'Edit the note from 31/05/2025', exact: true}).click();
    await page.getByRole('textbox', {name: 'Note from 31/05/2025', exact: true}).fill(LOCATION_NOTE + ' Twice.');
    await page.getByRole('button', {name: 'Save note', exact: true}).click();
    const after = await waitForData(() => read('locations', IDS.location), d => d.notes[0].text.endsWith('Twice.'));
    assert.equal(after.notes[0].date, DATE);
    assert.equal(Object.hasOwn(after.notes[0], 'author'), false);
    assert.equal(after.name, 'Legacy Old Harbor');
    assert.equal(after.type, 'town');
    return after;
  });

  await check('unknown-rumor-roundtrip', async () => {
    await navigate('/rumors');
    const rowButton = page.getByRole('button', {name: 'Expand Legacy Harbor Whisper', exact: true});
    await rowButton.waitFor();
    await rowButton.click();
    const before = await read('rumors', IDS.rumor);
    assert.equal(before.status, 'unknown', 'Read fallback leaves legacy storage intact');
    await page.getByRole('textbox', {name: 'What was heard', exact: true}).fill(before.content + ' The bell is hollow.');
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    const after = await waitForData(() => read('rumors', IDS.rumor), d => d.content.includes('hollow'));
    assert.deepEqual(after.relatedNPCs, before.relatedNPCs);
    assert.deepEqual(after.relatedLocations, before.relatedLocations);
    assert.equal(after.convertedToQuestId, IDS.quest);
    assert.equal(after.sourceType, 'other');
    assert.equal(after.location, before.location);
    return {before, after, renderedUnconfirmed: await page.getByText('Unconfirmed', {exact: true}).count()};
  });

  await check('legacy-note-title-and-reference-roundtrip', async () => {
    await navigate('/notes');
    await page.getByText('Legacy field journal', {exact: true}).first().waitFor();
    await navigate(`/notes/${IDS.note}`);
    const body = page.getByRole('textbox', {name: 'Note content', exact: true});
    await body.waitFor();
    assert.equal(await body.inputValue(), NOTE_CONTENT);
    assert.equal(await page.getByRole('textbox', {name: 'Note title', exact: true}).inputValue(), 'Legacy field journal');
    const before = await readNote();
    await body.fill(NOTE_CONTENT + '\n\nThe harbor archive remained open.');
    await body.press('Control+s');
    const after = await waitForData(readNote, d => d.content.endsWith('remained open.'));
    assert.equal(after.title, '', 'Legacy placeholder becomes implicit title, per titleToPersist');
    assert.deepEqual(after.tags, before.tags);
    assert.deepEqual(after.extractedEntities, before.extractedEntities);
    assert.equal(after.campaignId, before.campaignId);
    await page.reload();
    await page.getByRole('textbox', {name: 'Note content', exact: true}).waitFor();
    assert.equal(await page.getByRole('textbox', {name: 'Note content', exact: true}).inputValue(), after.content);
    return {before, after};
  });

  await check('chapter-without-summary-or-modification', async () => {
    await navigate('/story');
    // The app starts in Shelf view, whose spines intentionally show numbers.
    // Select the real List control before asserting visible chapter titles.
    await page.getByRole('button', {name: 'List', exact: true}).click();
    await page.getByText('Legacy Shore Account', {exact: true}).first().waitFor();
    await navigate(`/story/chapters/${IDS.chapter}`);
    await page.getByText('The party followed the shore to Legacy Old Harbor. The original account remains legible.', {exact: true}).waitFor();
    const before = await read('chapters', IDS.chapter);
    assert.equal(Object.hasOwn(before, 'summary'), false);
    assert.equal(Object.hasOwn(before, 'dateModified'), false);
    await navigate(`/story/chapters/edit/${IDS.chapter}`);
    const body = page.getByRole('textbox', {name: 'Chapter Content', exact: true});
    await body.waitFor();
    assert.equal(await body.inputValue(), CHAPTER_CONTENT);
    await body.fill(CHAPTER_CONTENT + '\n\nThe old account was supplemented.');
    await page.getByRole('button', {name: 'Save Changes', exact: true}).click();
    const after = await waitForData(() => read('chapters', IDS.chapter), d => d.content.endsWith('supplemented.'));
    assert.equal(after.order, before.order);
    assert.equal(after.createdByUsername, before.createdByUsername);
    assert.equal(after.dateAdded, DATE);
    assert.equal(typeof after.dateModified, 'string');
    return {before, after};
  });

  await check('known-1202-timestamp-compatibility-control', async () => {
    await navigate(`/story/chapters/${IDS.timestampChapter}`);
    await page.getByText('A distinct second account.', {exact: true}).waitFor();
    const before = await read('chapters', IDS.timestampChapter);
    assert.equal(typeof before.dateModified.toDate, 'function', 'Actual Firestore Timestamp, not a fake JSON object');
    await navigate(`/story/chapters/edit/${IDS.timestampChapter}`);
    const body = page.getByRole('textbox', {name: 'Chapter Content', exact: true});
    await body.waitFor();
    await body.fill(before.content + '\n\nA later ordinary edit.');
    await page.getByRole('button', {name: 'Save Changes', exact: true}).click();
    const after = await waitForData(() => read('chapters', IDS.timestampChapter), d => d.content.endsWith('ordinary edit.'));
    assert.equal(typeof after.dateModified, 'string');
    assert.equal(after.dateAdded, DATE);
    assert.equal(after.order, before.order);
    return {knownOverlap: '#1202; historical production audit found no surviving affected records', before, after};
  });

  const output = {ids: IDS, results, pageErrors};
  fs.writeFileSync(path.join(outDir, onlyNames ? 'legacy-followup-results.json' : 'legacy-results.json'), JSON.stringify(output, null, 2));
  return output;
}

module.exports = {IDS, fixtureDocs, seed, run};
