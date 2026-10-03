/* Review-only, deterministic I/O probes. No network, emulators or repository writes. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const repo = process.argv[2] || (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
const ts = require(path.join(repo, 'node_modules/typescript'));

function source(relative, imports, globals = {}) {
  const filename = path.join(repo, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name} from ${relative}`);
    return imports[name];
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: requireMock, console, Date, URL, Blob, ...globals }, { filename });
  return module.exports;
}
const reactCallbacks = { useCallback: (fn) => fn };
const stored = (name, prefix = 'groups/g1/campaigns/c1/npcs/n1') => ({ path: `${prefix}/${name}.webp`, url: 'https://firebasestorage.googleapis.com/v0/b/test/o/x?alt=media', width: 2, height: 2, uploadedBy: 'member', uploadedAt: new Date().toISOString() });
const prepared = { blob: new Blob(['x'], {type: 'image/webp'}), width: 2, height: 2, contentType: 'image/webp', extension: 'webp' };
const deferred = () => { let resolve; const promise = new Promise((r) => resolve = r); return { promise, resolve }; };

async function staleNoteRestoresDeletedImage() {
  const old = stored('old'), fresh = stored('fresh');
  const files = new Set([old.path]);
  let persisted = { id: 'n1', name: 'Bilbo', image: old, notes: [], connections: { relatedQuests: [] } };
  const loaded = structuredClone(persisted);
  const noteGate = deferred();
  const images = {
    upload: async () => { files.add(fresh.path); return fresh; },
    remove: async (imagePath) => files.delete(imagePath),
  };
  const hook = source('src/shared/hooks/useImageAttachment.ts', { react: reactCallbacks, 'core/services/firebase': { images } });
  let api;
  const React = {
    ...reactCallbacks,
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => api,
    useRef: (value) => ({ current: value }),
    createElement: (kind, props, ...children) => {
      if (props?.value?.updateNPCNote) api = props.value;
      return {kind, props, children};
    },
  };
  const provider = source('src/features/campaign-entities/npcs/context/NPCContext.tsx', {
    react: React,
    '../hooks/useNPCData': { useNPCData: () => ({ npcs: [loaded], hasRequiredContext: true }) },
    'shared/hooks/useFirebaseData': { useFirebaseData: () => ({
      updateData: async (_id, data) => {
        if (data.notes?.length) await noteGate.promise;
        persisted = { ...persisted, ...data };
      },
      deleteData: async () => {}, addData: async () => {},
    }) },
    'features/user-management': { useAuth: () => ({user: {uid: 'member'}}), useUser: () => ({userProfile: {uid: 'member'}, activeGroupUserProfile: {}}) },
    'core/utils/entity-id': { createWithUniqueEntityId: async () => 'n1' },
    'core/attribution': { buildModificationAttribution: () => ({}) },
    '../../shared/commitEntityWrites': { commitEntityWrites: async () => {} },
    'shared/hooks/useImageAttachment': hook,
    '../../locations/utils/location-display': { referencesLocation: () => false },
    'shared/hooks/useListenerDemand': { createListenerDemandContext: () => ({DemandProvider: 'demand', useDemand: () => {}}), useListenerDemand: () => ({ wanted: true, retain: () => {} }) },
  });
  provider.NPCProvider({children: null});
  const pendingNote = api.updateNPCNote('n1', {date: '2026-10-03', text: 'New note'});
  const attachment = hook.useImageAttachment({prefix: 'groups/g1/campaigns/c1/npcs/n1', current: old, save: async (image) => api.updateNPC({...loaded, image})});
  await attachment.upload(prepared, () => {});
  assert.equal(persisted.image.path, fresh.path);
  assert.equal(files.has(old.path), false);
  noteGate.resolve();
  await pendingNote;
  assert.equal(persisted.image.path, old.path);
  assert.equal(files.has(persisted.image.path), false);
  return { persistedImage: 'old', persistedObjectExists: false, replacementBecameOrphan: files.has(fresh.path) };
}

async function uploadFollowsSwitchedContext() {
  let activeGroup = 'g1', activeCampaign = 'c1';
  const old = stored('old'), fresh = stored('fresh');
  const originalDoc = 'groups/g1/campaigns/c1/npcs/n1';
  const targetDoc = 'groups/g2/campaigns/c2/npcs/n1';
  const docs = new Map([[originalDoc, {image: old}], [targetDoc, {image: stored('other', targetDoc)}]]);
  const files = new Set([old.path]);
  const uploadGate = deferred();
  class Base {
    getCurrentUser() { return {uid: 'member'}; }
    getActiveGroupId() { return activeGroup; }
    getActiveCampaignId() { return activeCampaign; }
    cachedGroupProfile() { return Promise.resolve({}); }
  }
  const document = source('src/core/services/firebase/data/DocumentService.ts', {
    'firebase/firestore': {
      collection: (_db, ...segments) => segments.join('/'),
      doc: (prefix, id) => `${prefix}/${id}`,
      updateDoc: async (ref, patch) => { assert.ok(docs.has(ref)); docs.set(ref, {...docs.get(ref), ...patch}); },
    },
    '../core/BaseFirebaseService': {__esModule: true, default: Base},
    '../../../attribution': { buildModificationAttribution: () => ({}) },
    './DocumentAlreadyExistsError': {DocumentAlreadyExistsError: class extends Error {}},
  }).default.getInstance();
  const images = { upload: async () => { files.add(fresh.path); await uploadGate.promise; return fresh; }, remove: async (imagePath) => files.delete(imagePath) };
  const hook = source('src/shared/hooks/useImageAttachment.ts', {react: reactCallbacks, 'core/services/firebase': {images}});
  const attachment = hook.useImageAttachment({prefix: 'groups/g1/campaigns/c1/npcs/n1', current: old, save: (image) => document.updateDocumentWithAttribution('npcs', 'n1', {image})});
  const uploading = attachment.upload(prepared, () => {});
  activeGroup = 'g2'; activeCampaign = 'c2';
  uploadGate.resolve();
  await uploading;
  assert.equal(docs.get(targetDoc).image.path, fresh.path);
  assert.equal(docs.get(originalDoc).image.path, old.path);
  assert.equal(files.has(old.path), false);
  return { savedInSelectedGroup: 'g2', binaryGroup: 'g1', originalStillReferencesDeletedObject: true };
}

async function sweepDeletesPendingSave() {
  const old = stored('old'), fresh = stored('fresh');
  let persisted = {image: old};
  const files = new Set([old.path]);
  const saveGate = deferred();
  const now = new Date('2026-10-03T12:00:00Z');
  const query = (kind) => ({select: () => ({get: async () => ({docs: kind === 'npcs' ? [{get: (field) => persisted[field]}] : []})})});
  const db = {collectionGroup: query, collection: query};
  const bucket = {getFiles: async ({prefix}) => [Array.from(files).filter((name) => name.startsWith(prefix)).map((name) => ({ name, metadata: {timeCreated: '2026-10-01T12:00:00Z'}, delete: async () => files.delete(name) }))]};
  const sweep = source('firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts', {
    'firebase-admin': {firestore: () => db},
    'firebase-functions/v2/scheduler': {onSchedule: (_opts, handler) => handler},
    '../shared/imageBucket': {imageBucket: () => bucket},
  });
  const images = {upload: async () => {files.add(fresh.path); return fresh;}, remove: async (imagePath) => files.delete(imagePath)};
  const hook = source('src/shared/hooks/useImageAttachment.ts', {react: reactCallbacks, 'core/services/firebase': {images}});
  const attachment = hook.useImageAttachment({prefix: 'groups/g1/campaigns/c1/npcs/n1', current: old, save: async (image) => {await saveGate.promise; persisted.image = image;}});
  const uploading = attachment.upload(prepared, () => {});
  await Promise.resolve();
  const result = await sweep.sweepOrphanedImages(now);
  assert.ok(result.deleted.includes(fresh.path));
  saveGate.resolve();
  await uploading;
  assert.equal(persisted.image.path, fresh.path);
  assert.equal(files.has(fresh.path), false);
  return { pendingFileDeleted: true, eventualDocumentReferencesMissingObject: true };
}

async function exactUploadLimit() {
  const preparation = source('src/core/utils/prepare-image.ts', {'./band-dimming': {measureBrightness: () => undefined}}, {
    createImageBitmap: async () => ({width: 1, height: 1, close() {}}),
    document: {createElement: () => ({getContext: () => ({drawImage() {}, getImageData() {throw new Error('blocked');}}), toBlob: (callback, type) => callback(new Blob([new Uint8Array(2 * 1024 * 1024)], {type}))})},
  });
  const image = await preparation.prepareImage({size: 1, type: 'image/png'});
  assert.equal(image.blob.size, 2 * 1024 * 1024);
  assert.ok(fs.readFileSync(path.join(repo, 'firebase/storage.rules.prod'), 'utf8').includes('request.resource.size < 2 * 1024 * 1024'));
  return { preparedBytes: image.blob.size, acceptedByPreparation: true, acceptedByRulesSizePredicate: false };
}

(async () => {
  for (const [name, probe] of Object.entries({staleNoteRestoresDeletedImage, uploadFollowsSwitchedContext, sweepDeletesPendingSave, exactUploadLimit})) {
    console.log(JSON.stringify({probe: name, result: await probe()}));
  }
})().catch((error) => {console.error(error); process.exitCode = 1;});
