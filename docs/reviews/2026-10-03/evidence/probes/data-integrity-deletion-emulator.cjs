/* Central-run review probe only; disposable emulator project, actual source handlers.
 * Requires FIRESTORE_EMULATOR_HOST and FIREBASE_STORAGE_EMULATOR_HOST pointing to local emulators.
 * Run: node /tmp/data-integrity-deletion-emulator.cjs
 */
const fs = require('fs');
const assert = require('assert/strict');
const root = (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[key] || '')) throw Error('Local emulator required: ' + key);
}
process.env.GCLOUD_PROJECT = 'demo-review-data-deletion';
const ts = require(root + '/node_modules/typescript');
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }, fileName: filename}).outputText;
  module._compile(code, filename);
};
const admin = require(root + '/firebase/functions/node_modules/firebase-admin');
admin.initializeApp({projectId: process.env.GCLOUD_PROJECT});
const db = admin.firestore();
const {deleteCampaign} = require(root + '/firebase/functions/src/campaignManagement/deleteCampaign.ts');
const {removeUserFromGroup} = require(root + '/firebase/functions/src/userManagement/removeUserFromGroup.ts');
const call = (fn, data, uid) => fn.run({data, auth: {uid, token: {uid}}, rawRequest: {}, acceptsStreaming: false});
async function clear() {
  const response = await fetch('http://' + process.env.FIRESTORE_EMULATOR_HOST + '/emulator/v1/projects/' + process.env.GCLOUD_PROJECT + '/databases/(default)/documents', {method: 'DELETE'});
  if (!response.ok) throw Error('Clear emulator failed: ' + response.status);
}
async function campaignBulkWriterFailure() {
  await clear();
  await db.doc('groups/g').set({name: 'Review'});
  await db.doc('groups/g/users/admin').set({role: 'admin', activeCampaignId: 'c'});
  await db.doc('groups/g/users/admin/notes/n').set({campaignId: 'c', content: 'Disposable review note'});
  await db.doc('groups/g/campaigns/c').set({name: 'Disposable'});
  await db.doc('groups/g/campaigns/c/npcs/n').set({name: 'Disposable NPC'});
  const original = db.bulkWriter.bind(db); let first = true; const failures = [];
  db.bulkWriter = (...args) => {
    const writer = original(...args);
    if (!first) return writer;
    first = false;
    // Preserve the real BulkWriter, flush and close. Fail only the outgoing RPC.
    writer._bulkCommitBatch._commit = async () => {throw Object.assign(new Error('review terminal write failure'), {code: 7});};
    for (const method of ['update', 'delete']) {
      const originalWrite = writer[method].bind(writer);
      writer[method] = (...writeArgs) => {
        const promise = originalWrite(...writeArgs);
        // Observe ignored rejections without terminating this diagnostic process.
        promise.catch(error => failures.push({method, code: error.code}));
        return promise;
      };
    }
    return writer;
  };
  let result;
  try {result = await call(deleteCampaign, {groupId: 'g', campaignId: 'c'}, 'admin');}
  finally {db.bulkWriter = original;}
  const noteRetained = (await db.doc('groups/g/users/admin/notes/n').get()).exists;
  const campaignExists = (await db.doc('groups/g/campaigns/c').get()).exists;
  assert.equal(result.success, true); assert.equal(noteRetained, true); assert.equal(campaignExists, false);
  let retryCode;
  try {await call(deleteCampaign, {groupId: 'g', campaignId: 'c'}, 'admin');}
  catch (e) {retryCode = e.code;}
  assert.equal(retryCode, 'not-found');
  console.log('campaign failure:', JSON.stringify({result, noteRetained, campaignExists, failures, retryCode}));
}
async function usernameRecoveryFailure() {
  await clear();
  await db.doc('users/u').set({groups: ['g'], activeGroupId: 'g'});
  await db.doc('groups/g/users/u').set({role: 'member', username: 'Alice'});
  await db.doc('groups/g/usernames/alice').set({userId: 'u'});
  await db.doc('groups/g/users/u/notes/n').set({campaignId: 'c', content: 'Disposable'});
  const original = db.batch.bind(db);
  db.batch = () => {
    const batch = original();
    batch.commit = async () => {throw Error('review failure after subtree deletion');};
    return batch;
  };
  try {await assert.rejects(call(removeUserFromGroup, {groupId: 'g', userId: 'u'}, 'u'));}
  finally {db.batch = original;}
  assert.equal((await db.doc('groups/g/users/u').get()).exists, false);
  const retried = await call(removeUserFromGroup, {groupId: 'g', userId: 'u'}, 'u');
  const reservationRetained = (await db.doc('groups/g/usernames/alice').get()).exists;
  const groups = (await db.doc('users/u').get()).data().groups;
  assert.equal(retried.success, true); assert.equal(reservationRetained, true); assert.deepEqual(groups, []);
  console.log('username retry failure:', JSON.stringify({retried, groups, reservationRetained}));
}
const watchdog = setTimeout(() => {console.error('DELETION PROBE INCOMPLETE'); process.exit(2);}, 45000);
(async () => {await campaignBulkWriterFailure(); await usernameRecoveryFailure(); await clear(); console.log('ALL DELETION PROBES COMPLETED');})()
  .catch(e => {console.error(e); process.exitCode = 1;}).finally(async () => {clearTimeout(watchdog); await admin.app().delete();});
