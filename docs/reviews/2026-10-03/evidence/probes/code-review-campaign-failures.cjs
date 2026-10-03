// Coordinator review probe: actual compiled callable, disposable local emulators only.
const assert = require('node:assert/strict');
const ROOT = (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  assert.match(process.env[key] || '', /^(127\.0\.0\.1|localhost):\d+$/, 'Local emulator required: '+key);
}
const projectId = 'demo-root-campaign-review';
process.env.GCLOUD_PROJECT = projectId;
const admin = require(ROOT+'/firebase/functions/node_modules/firebase-admin');
admin.initializeApp({projectId});
const db = admin.firestore();
const bucket = admin.storage().bucket(projectId+'.firebasestorage.app');
const {deleteCampaign} = require(ROOT+'/firebase/functions/lib/campaignManagement/deleteCampaign');
const campaignPath = 'groups/g/campaigns/c';
const npcPath = campaignPath+'/npcs/n';
const filePath = npcPath+'/image.webp';
const call = () => deleteCampaign.run({data:{groupId:'g',campaignId:'c'},auth:{uid:'a',token:{uid:'a'}},rawRequest:{},acceptsStreaming:false});
async function clear() {
  const response=await fetch('http://'+process.env.FIRESTORE_EMULATOR_HOST+'/emulator/v1/projects/'+projectId+'/databases/(default)/documents',{method:'DELETE'});
  assert(response.ok);
  await bucket.deleteFiles();
}
async function seed() {
  await clear();
  await db.doc('groups/g').set({name:'Synthetic review'});
  await db.doc('groups/g/users/a').set({role:'admin'});
  await db.doc(campaignPath).set({name:'Synthetic campaign'});
  await db.doc(npcPath).set({name:'Synthetic NPC',image:{path:filePath}});
  await bucket.file(filePath).save(Buffer.from('synthetic image'),{contentType:'image/webp'});
}
async function imageDeletionBeforeFailure() {
  await seed();
  const original=db.recursiveDelete.bind(db);
  db.recursiveDelete=async()=>{throw Error('Injected unavailable recursive deletion');};
  let code;
  try {await call();} catch(e) {code=e.code;} finally {db.recursiveDelete=original;}
  const campaignExists=(await db.doc(campaignPath).get()).exists;
  const npcExists=(await db.doc(npcPath).get()).exists;
  const fileExists=(await bucket.file(filePath).exists())[0];
  assert.equal(code,'internal');assert(campaignExists);assert(npcExists);assert.equal(fileExists,false);
  console.log(JSON.stringify({probe:'storage-cleanup-before-failed-document-delete',code,campaignExists,npcExists,fileExists,brokenPersistedImageReference:true}));
}
async function partialRecursiveDelete() {
  await seed();
  const original=db.recursiveDelete.bind(db);
  db.recursiveDelete=async ref=>{
    const writer=db.bulkWriter();
    const deleteOriginal=writer.delete.bind(writer);
    writer.delete=docRef=>docRef.path===npcPath
      ? Promise.reject(Object.assign(new Error('Injected terminal descendant delete failure'),{code:7}))
      : deleteOriginal(docRef);
    try {return await original(ref,writer);} finally {await writer.close();}
  };
  let first;
  try {await call();} catch(e) {first=e.code;} finally {db.recursiveDelete=original;}
  const campaignExists=(await db.doc(campaignPath).get()).exists;
  const descendantExists=(await db.doc(npcPath).get()).exists;
  let retry;
  try {await call();} catch(e) {retry=e.code;}
  assert.equal(first,'internal');assert.equal(campaignExists,false);assert(descendantExists);assert.equal(retry,'not-found');
  console.log(JSON.stringify({probe:'root-deleted-despite-child-failure',first,campaignExists,descendantExists,retry}));
}
const watchdog=setTimeout(()=>{console.error('CAMPAIGN PROBE INCOMPLETE');process.exit(2);},30000);
(async()=>{await imageDeletionBeforeFailure();await partialRecursiveDelete();console.log('ALL CAMPAIGN PROBES COMPLETED');})()
 .catch(e=>{console.error(e);process.exitCode=1;})
 .finally(async()=>{clearTimeout(watchdog);await clear();await db.terminate();await admin.app().delete();});
