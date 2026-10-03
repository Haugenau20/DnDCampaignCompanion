/* Root-only probe for an already-running central emulator; isolated demo project. */
const path = require('path');
const assert = require('assert/strict');
const repo = process.argv[2] || (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
const PROJECT = 'demo-uploaded-images-offline-review';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
process.env.GCLOUD_PROJECT = PROJECT;
const admin = require(path.join(repo, 'firebase/functions/node_modules/firebase-admin'));
const {initializeApp} = require(path.join(repo, 'node_modules/firebase/app'));
const {getFirestore, connectFirestoreEmulator, doc, updateDoc, disableNetwork, enableNetwork, getDocFromServer, terminate} = require(path.join(repo, 'node_modules/firebase/firestore'));
require(path.join(repo, 'node_modules/ts-node')).register({transpileOnly: true, compilerOptions: {module: 'commonjs', moduleResolution: 'node', esModuleInterop: true, target: 'es2020'}});
const {sweepOrphanedImages} = require(path.join(repo, 'firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts'));
const ADMIN_APP = admin.initializeApp({projectId: PROJECT});
const db = ADMIN_APP.firestore();
const bucket = ADMIN_APP.storage().bucket(`${PROJECT}.firebasestorage.app`);
const clientApp = initializeApp({projectId: PROJECT, apiKey: 'demo-key'}, PROJECT);
const clientDB = getFirestore(clientApp);
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
connectFirestoreEmulator(clientDB, host, Number(port));
const docPath = 'groups/g1/campaigns/c1/npcs/n1';
const oldPath = `${docPath}/old.webp`;
const newPath = `${docPath}/new.webp`;
const image = (path) => ({path, url: 'https://example.test/image', width: 1, height: 1, uploadedBy: 'member', uploadedAt: new Date().toISOString()});

(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {method: 'DELETE'});
  await bucket.deleteFiles();
  await db.doc(docPath).set({name: 'Bilbo', image: image(oldPath)});
  await bucket.file(oldPath).save(Buffer.from('old'), {contentType: 'image/webp'});
  await bucket.file(newPath).save(Buffer.from('new'), {contentType: 'image/webp'});
  await disableNetwork(clientDB);
  let acknowledged = false;
  const pending = updateDoc(doc(clientDB, docPath), {image: image(newPath)}).then(() => {acknowledged = true;});
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(acknowledged, false);
  // Advance only the sweeper's injected clock; no wait or emulator metadata mutation.
  const sweep = await sweepOrphanedImages(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
  assert.ok(sweep.deleted.includes(newPath));
  await enableNetwork(clientDB);
  await pending;
  const persisted = await getDocFromServer(doc(clientDB, docPath));
  const binaryExists = (await bucket.file(newPath).exists())[0];
  assert.equal(persisted.data().image.path, newPath);
  assert.equal(binaryExists, false);
  console.log(JSON.stringify({project: PROJECT, queuedWriteAcknowledgedAfterReconnect: acknowledged, pendingObjectSwept: true, eventualReferenceObjectExists: binaryExists}));
})().finally(async () => {
  await terminate(clientDB);
  await bucket.deleteFiles();
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {method: 'DELETE'});
  await ADMIN_APP.delete();
}).catch((error) => {console.error(error); process.exitCode = 1;});
