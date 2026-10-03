/* Review-only deterministic probes. Reads actual baseline TypeScript, never edits it.
 * Run: node /tmp/data-integrity-source-probes.cjs
 * No emulator or network: Firebase boundaries and React hooks are deterministic fakes.
 * Algorithms under test are the repository's functions, not transcribed copies.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
const ts = require(root + '/node_modules/typescript');
const clone = x => structuredClone(x);
function loader(overrides) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = {exports: {}}; cache.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    }, fileName: filename}).outputText;
    const req = spec => {
      if (Object.hasOwn(overrides, spec)) return overrides[spec];
      const base = spec.startsWith('.') ? path.resolve(path.dirname(filename), spec)
        : path.resolve(root, 'src', spec);
      const found = [base + '.ts', base + '.tsx', base + '/index.ts'].find(p => fs.existsSync(p));
      if (!found) throw Error('Unstubbed dependency ' + spec + ' from ' + filename);
      return load(found);
    };
    const fn = vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {filename});
    fn(req, mod, mod.exports); return mod.exports;
  }
  return relative => load(path.join(root, relative));
}
const react = {
  createContext: () => ({Provider: 'context'}), useCallback: fn => fn,
  useRef: value => ({current: value}), useState: value => [value, () => {}],
  useEffect: () => {}, useMemo: fn => fn(),
  createElement: (type, props, ...children) => ({type, props: {...props, children}}),
};
const demand = {createListenerDemandContext: () => ({DemandProvider: 'demand', useDemand: () => {}}),
  useListenerDemand: () => ({wanted: true, retain: () => {}})};
const auth = {useAuth: () => ({user: {uid: 'alice'}}),
  useUser: () => ({userProfile: {}, activeGroupUserProfile: {username: 'Alice'}}),
  useGroups: () => ({activeGroupId: 'g'}), useCampaigns: () => ({activeCampaignId: 'a'}),
  useFirestore: () => ({getDocument: async () => null})};
const attribution = {buildCreationAttribution: ({uid}) => ({createdBy: uid, dateAdded: 'fixed'}),
  buildModificationAttribution: ({uid}) => ({modifiedBy: uid, dateModified: 'fixed'})};
function context(provider) { return provider({children: null}).props.children[0].props.value; }
const common = {'react': react, 'features/user-management': auth, 'core/attribution': attribution,
  'shared/hooks/useListenerDemand': demand, 'shared/hooks/useImageAttachment': {discardImage: () => {}},
  'shared/utils/dateFormatter': {toNoteDate: () => 'fixed'},
  'shared/hooks/useHighlightTarget': {HIGHLIGHT_DEPTH_CAP: 64}};
function deferred() { let resolve; return {promise: new Promise(r => resolve = r), resolve: x => resolve(x)}; }

async function createRaceAndSwitch() {
  const store = new Map(); let currentCampaign = 'a'; let holdProfile = null;
  class Base {
    constructor() {this.db = {};}
    getCurrentUser() {return {uid: 'alice'};}
    getActiveGroupId() {return 'g';}
    getActiveCampaignId() {return currentCampaign;}
    async cachedGroupProfile() {if (holdProfile) await holdProfile.promise; return {username: 'Alice'};}
  }
  let reads = 0; const bothRead = deferred();
  const api = {
    collection: (_db, ...parts) => ({path: parts.join('/')}),
    doc: (col, id) => ({path: col.path + '/' + id}),
    getDoc: async ref => {
      const existing = clone(store.get(ref.path));
      if (ref.path.endsWith('/shared-name')) { if (++reads === 2) bothRead.resolve(); await bothRead.promise; }
      return {exists: () => existing !== undefined, data: () => existing};
    },
    setDoc: async (ref, value) => store.set(ref.path, clone(value)),
    updateDoc: async (ref, value) => {assert(store.has(ref.path)); store.set(ref.path, {...store.get(ref.path), ...clone(value)});},
  };
  const load = loader({'firebase/firestore': api, '../core/BaseFirebaseService': Base,
    '../../../attribution': attribution});
  const service = load('src/core/services/firebase/data/DocumentService.ts').default.getInstance();
  const helper = load('src/core/utils/entity-id.ts').createWithUniqueEntityId;
  const create = description => helper({name: 'Shared Name', issuedIds: new Set(), isLoaded: () => false,
    write: id => service.createDocument('npcs', {id, name: 'Shared Name', description}, id)});
  const ids = await Promise.all([create('first author'), create('second author')]);
  assert.deepEqual(ids, ['shared-name', 'shared-name']); assert.equal(store.size, 1);
  console.log('create race:', JSON.stringify({ids, records: [...store.values()]}));
  store.set('groups/g/campaigns/a/npcs/n1', {description: 'campaign A'});
  store.set('groups/g/campaigns/b/npcs/n1', {description: 'campaign B'});
  holdProfile = deferred();
  const pending = service.updateDocumentWithAttribution('npcs', 'n1', {description: 'edit meant for A'});
  currentCampaign = 'b'; holdProfile.resolve(); await pending;
  assert.equal(store.get('groups/g/campaigns/a/npcs/n1').description, 'campaign A');
  assert.equal(store.get('groups/g/campaigns/b/npcs/n1').description, 'edit meant for A');
  console.log('campaign switch:', JSON.stringify({a: store.get('groups/g/campaigns/a/npcs/n1'), b: store.get('groups/g/campaigns/b/npcs/n1')}));
}

async function chapterAndLostUpdate() {
  const chapters = [{id: 'c1', title: 'One', order: 1}, {id: 'c2', title: 'Two', order: 2}];
  const store = new Map(chapters.map(c => [c.id, clone(c)]));
  const commit = async writes => {for (const w of writes) {
    if (w.type === 'set') store.set(w.id, clone(w.data));
    else if (w.type === 'update') store.set(w.id, {...store.get(w.id), ...clone(w.data)});
    else store.delete(w.id);
  }};
  const load = loader({...common,
    '../hooks/useChapterData': {useChapterData: () => ({chapters: clone(chapters), hasRequiredContext: true})},
    'shared/hooks/useFirebaseData': {useFirebaseData: () => ({updateData: async () => {}})},
    'core/services/firebase': {document: {batchOperations: commit}},
  });
  const Provider = load('src/features/storytelling/chapters/context/StoryContext.tsx').StoryProvider;
  const a = context(Provider), b = context(Provider);
  const ids = await Promise.all([a.createChapter({title: 'A'}), b.createChapter({title: 'B'})]);
  assert.equal(store.get(ids[0]).order, 3); assert.equal(store.get(ids[1]).order, 3);
  console.log('chapter append race:', JSON.stringify([...store.values()]));

  let quest = {id: 'q1', title: 'Old title', status: 'active', objectives: [{id: 'o1', description: 'One', completed: false}, {id: 'o2', description: 'Two', completed: false}]};
  const snapshot = clone(quest);
  const questLoad = loader({...common,
    '../hooks/useQuestData': {useQuestData: () => ({quests: [clone(snapshot)], getQuestById: id => id === snapshot.id ? clone(snapshot) : undefined, hasRequiredContext: true})},
    'shared/hooks/useFirebaseData': {useFirebaseData: () => ({updateData: async (_id, data) => {quest = {...quest, ...clone(data)};}})},
    '../../shared/commitEntityWrites': {commitEntityWrites: async () => {}},
  });
  const qp = questLoad('src/features/campaign-entities/quests/context/QuestContext.tsx').QuestProvider;
  const qa = context(qp), qb = context(qp);
  await qa.updateQuest({...snapshot, title: 'New title'});
  await qb.updateQuestObjective('q1', 'o1', true);
  assert.equal(quest.title, 'Old title');
  await qa.updateQuestObjective('q1', 'o2', true);
  assert.equal(quest.objectives[0].completed, false);
  console.log('quest lost updates:', JSON.stringify(quest));
}

async function locationsAndConversion() {
  const locations = [{id: 'a', name: 'A', parentId: ''}, {id: 'b', name: 'B', parentId: ''}];
  const store = new Map(locations.map(l => [l.id, clone(l)]));
  const load = loader({...common,
    '../hooks/useLocationData': {useLocationData: () => ({locations: clone(locations), hasRequiredContext: true})},
    'shared/hooks/useFirebaseData': {useFirebaseData: () => ({updateData: async (id, data) => store.set(id, {...store.get(id), ...data}), deleteData: async id => store.delete(id)})},
    '../../shared/commitEntityWrites': {commitEntityWrites: async () => {}},
  });
  const Provider = load('src/features/campaign-entities/locations/context/LocationContext.tsx').LocationProvider;
  await Promise.all([context(Provider).moveLocation('a', 'b'), context(Provider).moveLocation('b', 'a')]);
  assert.equal(store.get('a').parentId, 'b'); assert.equal(store.get('b').parentId, 'a');
  console.log('location move cycle:', JSON.stringify([...store.values()]));
  store.clear(); store.set('a', clone(locations[0])); store.set('b', clone(locations[1]));
  const deletingContext = context(Provider);
  store.set('child', {id: 'child', name: 'Newly added child', parentId: 'a'});
  await deletingContext.deleteLocation('a', 'promote-to-grandparent');
  assert.equal(store.get('child').parentId, 'a'); assert.equal(store.has('a'), false);
  console.log('location concurrent child:', JSON.stringify([...store.values()]));

  const rumors = Array.from({length: 501}, (_, i) => ({id: 'r' + i, title: 'Rumor ' + i, status: 'unconfirmed', notes: []}));
  const quests = new Map();
  const rumorLoad = loader({...common,
    '../hooks/useRumorData': {useRumorData: () => ({rumors})},
    'shared/hooks/useFirebaseData': {useFirebaseData: () => ({})},
    'features/user-management': {...auth, useFirestore: () => ({
      createDocument: async (_col, data, id) => {quests.set(id, clone(data)); return id;}, batchOperations: async () => {throw Error('should fail before reaching batch');},
    })},
    '../../shared/commitEntityWrites': {MAX_BATCH_WRITES: 500},
  });
  const rc = context(rumorLoad('src/features/campaign-entities/rumors/context/RumorContext.tsx').RumorProvider);
  const selected = rumors.map(r => r.id);
  await assert.rejects(rc.convertToQuest(selected, {title: 'New quest'}), /at most 500/);
  await assert.rejects(rc.convertToQuest(selected, {title: 'New quest'}), /at most 500/);
  assert.equal(quests.size, 2);
  console.log('conversion rejected after creation:', JSON.stringify({quests: [...quests.keys()], convertedRumors: rumors.filter(r => r.convertedToQuestId).length}));

  const candidates = loader({})('src/shared/components/attach-tray/attachCandidates.ts').buildCandidates(
    ['location', 'quest'], {location: [{id: 'watchtower', name: 'Watchtower', type: 'poi'}], quest: [{id: 'watchtower', title: 'Watchtower', status: 'active'}]},
    {attachedIds: ['watchtower']});
  assert.equal(candidates.find(c => c.kind === 'quest').attached, true);
  console.log('mixed entity attachment:', JSON.stringify(candidates.map(({id, kind, attached}) => ({id, kind, attached}))));
}

async function bulkWriterFailure() {
  // Real pinned Admin Firestore BulkWriter; replace only outbound transport.
  // Every operation receives a terminal PERMISSION_DENIED status without network I/O.
  const {Firestore} = require(root + '/firebase/functions/node_modules/@google-cloud/firestore');
  const db = new Firestore({projectId: 'demo-review-data-source'});
  const writer = db.bulkWriter({throttling: false});
  writer._bulkCommitBatch._commit = async () => {
    throw Object.assign(new Error('injected terminal failure'), {code: 7});
  };
  const operation = writer.delete(db.doc('groups/g/users/u/notes/n'));
  const outcome = operation.then(() => 'fulfilled', e => 'rejected: ' + e.code);
  await writer.close();
  assert.equal(await outcome, 'rejected: 7');
  console.log('real BulkWriter close:', JSON.stringify({close: 'fulfilled', individualWrite: await outcome}));
  await db.terminate();
}

const watchdog = setTimeout(() => {console.error('PROBE INCOMPLETE: watchdog expired'); process.exit(2);}, 15000);
(async () => {await createRaceAndSwitch(); await chapterAndLostUpdate(); await locationsAndConversion(); await bulkWriterFailure(); console.log('ALL SOURCE PROBES COMPLETED');})()
  .catch(e => {console.error(e); process.exitCode = 1;}).finally(() => clearTimeout(watchdog));
