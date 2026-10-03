'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createRequire} = require('node:module');
const ROOT = (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
const req = createRequire(`${ROOT}/firebase/functions/package.json`);
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host || '', /^(127\.0\.0\.1|localhost):[0-9]+$/, 'Loopback emulator required');
const PROJECT = 'demo-security-identity-20261003';
process.env.GCLOUD_PROJECT = PROJECT;
const ts = req('typescript');
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
const admin = req('firebase-admin');
admin.initializeApp({projectId:PROJECT});
const db = admin.firestore();
const {initializeTestEnvironment,assertFails,assertSucceeds} = req('@firebase/rules-unit-testing');
req('firebase/firestore').setLogLevel('error');
const {removeUserFromGroup} = req(`${ROOT}/firebase/functions/src/userManagement/removeUserFromGroup.ts`);
const {memberId} = req(`${ROOT}/src/features/user-management/admin/types.ts`);
const result = [];
let env;
(async()=>{
 const [hostname,port] = host.split(':');
 env = await initializeTestEnvironment({projectId:PROJECT,firestore:{host:hostname,port:Number(port),rules:fs.readFileSync(`${ROOT}/firebase/firestore.rules.prod`,'utf8')}});
 await env.clearFirestore();
 await db.doc('groups/g').set({name:'Probe group'});
 await db.doc('groups/g/campaigns/c/npcs/n').set({name:'NPC'});
 for(const uid of ['admin','attacker','innocent','hidden']){
   await db.doc(`users/${uid}`).set({groups:['g'],email:`${uid}@example.invalid`});
   await db.doc(`groups/g/users/${uid}`).set({userId:uid,username:uid,role:uid==='admin'?'admin':'member'});
   await db.doc(`groups/g/usernames/${uid}`).set({userId:uid});
 }
 await db.doc('groups/g/users/innocent/notes/private').set({content:'Synthetic private note'});
 const attacker = env.authenticatedContext('attacker').firestore();
 const adminClient = env.authenticatedContext('admin').firestore();
 await assertFails(attacker.doc('groups/g/users/innocent').delete());
 await assertSucceeds(attacker.doc('groups/g/users/attacker').update({userId:'innocent'}));
 // Map the document as GroupService.getGroupUsers:139-146 does, then run the
 // actual helper used by AdminPeoplePage:167. React click is source-traced.
 const snap = await adminClient.doc('groups/g/users/attacker').get();
 const displayedRow = {id:snap.id,...snap.data()};
 assert.equal(displayedRow.username,'attacker');
 assert.equal(memberId(displayedRow),'innocent');
 await removeUserFromGroup.run({data:{groupId:'g',userId:memberId(displayedRow)},auth:{uid:'admin',token:{uid:'admin'}},rawRequest:{},acceptsStreaming:false});
 assert.equal((await db.doc('groups/g/users/innocent').get()).exists,false);
 assert.equal((await db.doc('groups/g/users/innocent/notes/private').get()).exists,false);
 assert.equal((await db.doc('groups/g/users/attacker').get()).exists,true);
 assert.deepEqual((await db.doc('users/innocent').get()).data().groups,[]);
 assert.deepEqual((await db.doc('users/attacker').get()).data().groups,['g']);
 result.push({check:'mutable identity redirects member removal',result:'unauthorized direct deletion denied; own userId rewrite allowed; row named attacker resolves actual helper to innocent; admin callable deletes innocent profile/private note and revokes innocent access; attacker remains'});
 // Overwrite fallback `id` as well: legacy documents without userId are not safe.
 await assertSucceeds(attacker.doc('groups/g/users/attacker').update({id:'admin'}));
 const hidden = env.authenticatedContext('hidden').firestore();
 await assertSucceeds(hidden.doc('groups/g/users/hidden').delete());
 const roster = await adminClient.collection('groups/g/users').get();
 assert.equal(roster.docs.some(doc=>doc.id==='hidden'),false);
 await assertSucceeds(hidden.doc('groups/g/campaigns/c/npcs/n').get());
 await assertSucceeds(hidden.doc('groups/g/campaigns/c/npcs/n').update({name:'Changed while hidden'}));
 assert.deepEqual((await db.doc('users/hidden').get()).data().groups,['g']);
 result.push({check:'direct group profile deletion conceals authorized member',result:'self-delete allowed; user absent from admin roster; global membership unchanged; campaign read and update still allowed'});
 console.log(JSON.stringify({project:PROJECT,results:result},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(env)await env.cleanup();await admin.app().delete();});
