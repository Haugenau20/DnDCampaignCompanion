'use strict';
const path=require('path');
const fs=require('fs');
const assert=require('assert/strict');
const root='/workspace/DnDCampaignCompanion';
const projectId='demo-review-pass4';
process.env.GCLOUD_PROJECT=projectId;
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9199';
const admin=require(path.join(root,'firebase/functions/node_modules/firebase-admin'));
if(!admin.apps.length)admin.initializeApp({projectId,storageBucket:projectId+'.appspot.com'});
const db=admin.firestore();
const uid='review-user',groupId='review-group';
const email='browser-review@example.test',password='SyntheticReviewPass4!';
const now='2026-10-04T10:00:00.000Z';
const attribution={createdBy:uid,createdByUsername:'Browser Reviewer',dateAdded:now};
async function seedBase(area) {
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
 try {await admin.auth().getUser(uid);} catch(e){if(e.code!=='auth/user-not-found')throw e;await admin.auth().createUser({uid,email,password,emailVerified:true,displayName:'Browser Reviewer'});}
 const campaignId='review-'+area;
 if(process.env.PASS4_REUSE!=='1'){
  await db.recursiveDelete(db.doc(`groups/${groupId}/campaigns/${campaignId}`));
  const previousNotes=await db.collection(`groups/${groupId}/users/${uid}/notes`).where('campaignId','==',campaignId).get();
  for(const note of previousNotes.docs)await note.ref.delete();
 }
 await db.doc('users/'+uid).set({id:uid,email,groups:[groupId],activeGroupId:groupId,lastLogin:now,createdAt:now});
 await db.doc('groups/'+groupId).set({id:groupId,name:'Synthetic Review Group',createdAt:now,createdBy:uid});
 await db.doc(`groups/${groupId}/users/${uid}`).set({userId:uid,username:'Browser Reviewer',role:'admin',joinedAt:now,characters:[],activeCampaignId:campaignId});
 await db.doc(`groups/${groupId}/campaigns/${campaignId}`).set({id:campaignId,groupId,name:'Review '+area,description:'Synthetic fourth-pass data only',createdAt:now,createdBy:uid,isActive:true});
 return {db,admin,uid,groupId,campaignId,basePath:`groups/${groupId}/campaigns/${campaignId}`,notesPath:`groups/${groupId}/users/${uid}/notes`,baseUrl:'http://127.0.0.1:3000',attribution,now};
}
async function signIn(page,baseUrl='http://127.0.0.1:3000') {
 await page.goto(baseUrl+'/signin');
 await page.getByLabel(/email/i).fill(email);
 const remember=page.getByRole('checkbox',{name:'Keep me signed in for 30 days',exact:true});if(await remember.isVisible())await remember.check();
 const actionsUrl='http://127.0.0.1:9099/emulator/v1/projects/'+projectId+'/oobCodes';
 const previousActions=await (await fetch(actionsUrl)).json();
 const previousCodes=new Set((previousActions.oobCodes||[]).map(x=>x.oobCode));
 await page.getByRole('button',{name:/^email me a sign-in link$/i}).click();
 const until=Date.now()+20000; let entry;
 while(Date.now()<until){
  const response=await fetch('http://127.0.0.1:9099/emulator/v1/projects/'+projectId+'/oobCodes');
  const data=await response.json();
  entry=(data.oobCodes||[]).filter(x=>x.email===email && x.requestType==='EMAIL_SIGNIN' && !previousCodes.has(x.oobCode)).at(-1);
  if(entry)break;
  await new Promise(r=>setTimeout(r,200));
 }
 assert(entry && entry.oobLink,'Local emulator email-link action must be available');
 await page.goto(entry.oobLink);
 await page.waitForURL(url=>url.pathname!='/signin',{timeout:45000});
 await page.waitForFunction(()=>document.body.textContent.includes('Synthetic Review Group'),null,{timeout:45000});
}
module.exports={root,projectId,admin,db,uid,groupId,email,password,now,attribution,seedBase,signIn};
