'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createRequire} = require('node:module');
const ROOT = (process.env.REVIEW_REPO || require('path').resolve(__dirname, '../../../../..'));
const req = createRequire(`${ROOT}/firebase/functions/package.json`);
assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^(127\.0\.0\.1|localhost):[0-9]+$/, 'Loopback emulator required');
const PROJECT = 'demo-security-quota-race-20261003';
process.env.GCLOUD_PROJECT = PROJECT;
process.env.OPENAI_API_KEY = 'review-stub-no-network';
const ts = req('typescript');
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
let modelCalls = 0;
class StubOpenAI {constructor(){this.chat={completions:{create:async()=>{modelCalls++;return {choices:[{message:{refusal:null,tool_calls:[{type:'function',function:{name:'extract_entities',arguments:'{"entities":[]}'}}]}}]};}}};}}
const openaiId = req.resolve('openai');
require.cache[openaiId]={id:openaiId,filename:openaiId,loaded:true,exports:StubOpenAI};
const admin = req('firebase-admin');
admin.initializeApp({projectId:PROJECT});
const db = admin.firestore();
const {extractEntities} = req(`${ROOT}/firebase/functions/src/entityExtraction.ts`);
const path = 'users/limited';
const prototype = Object.getPrototypeOf(db.doc(path));
const originalGet = prototype.get;
let armed = false;
let reached = 0;
let release;
const gate = new Promise(resolve=>{release=resolve;});
const count = 4;
prototype.get = async function(...args){
 const snap = await originalGet.apply(this,args);
 if(armed && this.path===path){
   reached++;
   if(reached===count) release();
   await gate;
 }
 return snap;
};
(async()=>{
 const now = new Date().toISOString();
 const usage = {daily:{count:9,limit:10,lastReset:now},weekly:{count:9,limit:30,lastReset:now},monthly:{count:9,limit:100,lastReset:now}};
 await db.doc(path).set({id:'limited',groups:[],entityExtractionUsage:usage});
 armed=true;
 const timeout=setTimeout(()=>{release();},15000);
 const outcomes=await Promise.allSettled(Array.from({length:count},()=>extractEntities.run({data:{content:'Synthetic note'},auth:{uid:'limited',token:{uid:'limited'}},rawRequest:{},acceptsStreaming:false})));
 clearTimeout(timeout);
 armed=false;
 const stored=(await db.doc(path).get()).data().entityExtractionUsage;
 assert.equal(reached,count);
 assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,count);
 assert.equal(modelCalls,count);
 assert.equal(stored.daily.count,10);
 assert.equal(stored.weekly.count,10);
 assert.equal(stored.monthly.count,10);
 console.log(JSON.stringify({project:PROJECT,barrier:'four real Firestore quota snapshots read at 9/10 before any write',acceptedCalls:count,modelStubCalls:modelCalls,persistedDailyCount:stored.daily.count,persistedWeeklyCount:stored.weekly.count,result:'four extractions consume one remaining slot; all counters undercount by three; no client quota edits and no paid request'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{prototype.get=originalGet;await admin.app().delete();});
