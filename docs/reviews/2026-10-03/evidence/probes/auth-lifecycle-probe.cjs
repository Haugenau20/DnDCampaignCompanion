/* Disposable emulator-only probes. Runs actual compiled callable handlers. */
const assert = require('node:assert/strict');
const ROOT = (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..')) + '/firebase/functions';
const admin = require(ROOT + '/node_modules/firebase-admin');
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST; no production fallback');
}
const projectId = 'demo-auth-lifecycle-review';
process.env.GCLOUD_PROJECT = projectId;
admin.initializeApp({projectId});
const db = admin.firestore();
const auth = admin.auth();
const guards = require(ROOT + '/lib/shared/groupAdmins');
const {setMemberRole} = require(ROOT + '/lib/groupManagement/setMemberRole');
const {deleteUser} = require(ROOT + '/lib/userManagement/deleteUser');
const {removeUserFromGroup} = require(ROOT + '/lib/userManagement/removeUserFromGroup');
const {redeemInvitation} = require(ROOT + '/lib/groupManagement/redeemInvitation');
const clientApp = require(ROOT + '/node_modules/firebase/app');
const clientAuth = require(ROOT + '/node_modules/firebase/auth');
const call = (fn, data, uid) => fn.run({data, auth: {uid, token: {uid}}, rawRequest: {}, acceptsStreaming: false});
async function clear() {
  for (const [host, path] of [
    [process.env.FIRESTORE_EMULATOR_HOST, `/emulator/v1/projects/${projectId}/databases/(default)/documents`],
    [process.env.FIREBASE_AUTH_EMULATOR_HOST, `/emulator/v1/projects/${projectId}/accounts`],
  ]) {
    const response = await fetch(`http://${host}${path}`, {method: 'DELETE'});
    assert(response.ok, `Failed to clear isolated ${projectId}: ${response.status}`);
  }
}
async function seed(members) {
  await db.doc('groups/g1').set({name: 'Disposable review group'});
  for (const [uid, role] of Object.entries(members)) {
    await auth.createUser({uid});
    await db.doc(`users/${uid}`).set({groups: ['g1'], activeGroupId: 'g1'});
    await db.doc(`groups/g1/users/${uid}`).set({userId: uid, username: uid, role});
    await db.doc(`groups/g1/usernames/${uid}`).set({userId: uid, originalUsername: uid});
  }
}
async function race(kind) {
  await clear();
  await seed({adminA: 'admin', adminB: 'admin', memberC: 'member'});
  const original = guards.wouldStrandGroup;
  let arrive = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const watchdog = setTimeout(() => release(), 10000);
  // Preserve the actual guard and DB reads, delay only return to force a legal interleaving.
  guards.wouldStrandGroup = async (...args) => {
    const result = await original(...args);
    if (++arrive === 2) release();
    await barrier;
    return result;
  };
  try {
    const fn = kind === 'demote' ? setMemberRole : kind === 'leave' ? removeUserFromGroup : deleteUser;
    const data = uid => kind === 'demote' ? {groupId: 'g1', userId: uid, role: 'member'} : kind === 'leave' ? {groupId: 'g1', userId: uid} : {userId: uid};
    const results = await Promise.allSettled(['adminA', 'adminB'].map(uid => call(fn, data(uid), uid)));
    const roles = Object.fromEntries((await db.collection('groups/g1/users').get()).docs.map(doc => [doc.id, doc.data().role]));
    console.log(JSON.stringify({probe: `concurrent-${kind}`, results: results.map(r => r.status), roles, guardCalls: arrive}));
    assert.equal(arrive, 2);
    assert(results.every(r => r.status === 'fulfilled'));
    assert(!Object.values(roles).includes('admin'));
    assert.equal(roles.memberC, 'member');
  } finally {
    clearTimeout(watchdog);
    guards.wouldStrandGroup = original;
  }
}
async function failedAuthDelete() {
  await clear();
  await seed({adminA: 'admin', memberB: 'member'});
  const original = auth.deleteUser;
  let attempts = 0;
  auth.deleteUser = async () => { attempts++; throw new Error('Injected transient Auth deletion failure'); };
  let first;
  try { await call(deleteUser, {userId: 'memberB'}, 'memberB'); } catch (error) { first = error.code; }
  finally { auth.deleteUser = original; }
  let retry;
  try { await call(deleteUser, {userId: 'memberB'}, 'memberB'); } catch (error) { retry = error.code; }
  const profileExists = (await db.doc('users/memberB').get()).exists;
  const authExists = !!(await auth.getUser('memberB'));
  console.log(JSON.stringify({probe: 'auth-delete-failure-retry', first, retry, profileExists, authExists, injectedAuthAttempts: attempts}));
  assert.equal(first, 'internal');
  assert.equal(retry, 'not-found');
  assert.equal(profileExists, false);
  assert.equal(authExists, true);
  assert.equal(attempts, 1);
}
async function lostJoinResponseCleanup() {
  await clear();
  await seed({adminA: 'admin'});
  await auth.createUser({uid: 'newMember', email: 'newmember@example.test'});
  await db.doc('groups/g1/registrationTokens/reviewToken').set({used: false, expiresAt: new Date(Date.now() + 60000)});
  const app = clientApp.initializeApp({projectId, apiKey: 'fake-review-key'}, 'auth-cleanup-review');
  const readerAuth = clientAuth.getAuth(app);
  clientAuth.connectAuthEmulator(readerAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {disableWarnings: true});
  try {
    await clientAuth.signInWithCustomToken(readerAuth, await auth.createCustomToken('newMember'));
    await call(redeemInvitation, {groupId: 'g1', token: 'reviewToken', username: 'NewMember'}, 'newMember');
    // Fault point: transaction committed, but response is lost before either join surface sees success.
    // Actual client Auth SDK primitive used by AuthService.deleteFreshAccount at lines 386-390:
    await clientAuth.deleteUser(readerAuth.currentUser);
    let authGone = false;
    try { await auth.getUser('newMember'); } catch (error) { authGone = error.code === 'auth/user-not-found'; }
    const profileExists = (await db.doc('users/newMember').get()).exists;
    const membershipExists = (await db.doc('groups/g1/users/newMember').get()).exists;
    const tokenUsed = (await db.doc('groups/g1/registrationTokens/reviewToken').get()).data().used;
    console.log(JSON.stringify({probe: 'committed-join-lost-response-cleanup', authGone, profileExists, membershipExists, tokenUsed}));
    assert.equal(authGone, true);
    assert.equal(profileExists, true);
    assert.equal(membershipExists, true);
    assert.equal(tokenUsed, true);
  } finally {
    await clientApp.deleteApp(app);
  }
}
(async () => {
  try {
    await race('demote');
    await race('leave');
    await race('delete');
    await failedAuthDelete();
    await lostJoinResponseCleanup();
  } finally {
    await clear();
    await db.terminate();
    await admin.app().delete();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
