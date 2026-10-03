/* Read-only benchmarks of pinned repository source. No network or Firestore SDK initialization. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { performance } = require('perf_hooks');
const root = '/workspace/DnDCampaignCompanion';
const ts = require(path.join(root, 'node_modules/typescript'));
const cache = new Map();
function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const m = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const req = (name) => {
    if (name in mocks) return mocks[name];
    if (name === 'shared/hooks/useHighlightTarget') return load('src/shared/hooks/useHighlightTarget.ts');
    return require(require.resolve(name, { paths: [path.dirname(filename), path.join(root, 'node_modules')] }));
  };
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename })(req, m, m.exports);
  cache.set(filename, m.exports);
  return m.exports;
}
const { pathLabelOf, buildLocationIndex } = load('src/features/campaign-entities/locations/utils/location-tree.ts');
const { ancestorIdsOf } = load('src/shared/hooks/useHighlightTarget.ts');
const { paginateProse } = load('src/features/storytelling/stories/utils/paginate-prose.ts');
const { SearchService } = load('src/core/services/search/SearchService.ts');
const time = (fn) => { fn(); const a = []; for(let i=0;i<3;i++){const start=performance.now();fn();a.push(performance.now()-start);} return Number(a.sort((a,b)=>a-b)[1].toFixed(2)); };
console.log(JSON.stringify({node:process.version, method:'One warmup, median of three Node runs; location objects retain counting id getters, other timings uninstrumented; not browser production timing'}));
for(const n of [100,500,1000,2000]) {
  let idReads=0;
  const locations = Array.from({length:n},(_,i)=>({get id(){idReads++;return 'l'+i;},name:'Place '+i,parentId:i ? 'l0' : '', status:'visited'}));
  const searchWork=()=>locations.map((_,i)=>pathLabelOf(locations,'l'+i));
  const filterWork=()=>locations.forEach((_,i)=>ancestorIdsOf(locations,'l'+i,{idOf:l=>l.id,parentIdOf:l=>l.parentId}));
  idReads=0; searchWork(); const searchIdReads=idReads;
  idReads=0; filterWork(); const filterIdReads=idReads;
  console.log(JSON.stringify({case:'location-flat-search-and-status-filter',n,searchIdReads,filterIdReads,searchMedianMs:time(searchWork),filterMedianMs:time(filterWork)}));
}
for(const words of [1000,5000,10000,20000,50000]) {
 const prose=Array.from({length:words},(_,i)=>'word'+(i%100)).join(' ');
 let splitCalls=0, splitChars=0;
 const original=String.prototype.split;
 String.prototype.split=function(sep,...rest){if(sep instanceof RegExp && sep.source==='\\s+'){splitCalls++;splitChars+=this.length;}return original.call(this,sep,...rest);};
 const pages=paginateProse(prose);
 String.prototype.split=original;
 console.log(JSON.stringify({case:'saga-single-paragraph-pagination',words,inputBytes:Buffer.byteLength(prose),pages:pages.length,splitCalls,splitInputCharacters:splitChars,medianMs:time(()=>paginateProse(prose))}));
}
for(const n of [100,1000,5000]) {
 const documents=Array.from({length:n},(_,i)=>({id:'n'+i,type:'note',metadata:{title:'Document '+i},content:'The party enters the dungeon. '.repeat(40)}));
 const service=new SearchService({maxResultsPerType:5,minQueryLength:2,fuzzyMatch:true});
 service.initializeIndex({note:documents,story:[],quest:[],npc:[],location:[],rumors:[]});
 for(const query of ['  ','dungeon','missing term']) {
  const results=service.search(query);
  console.log(JSON.stringify({case:'search',n,query,inputCharacters:documents.reduce((a,d)=>a+d.content.length,0),results:results.length,medianMs:time(()=>service.search(query))}));
 }
}
async function sweepProbe(n) {
 let active=0,maxActive=0,queries=0,selectedDocuments=0;
 const references=Array.from({length:n},(_,i)=>({get:()=>({path:'groups/g/campaigns/c/npcs/n'+i+'/live.jpg'})}));
 const files=Array.from({length:n},(_,i)=>({name:'groups/g/campaigns/c/npcs/n'+i+'/orphan.jpg',metadata:{timeCreated:'2020-01-01T00:00:00Z'},delete:()=>{active++;maxActive=Math.max(maxActive,active);return new Promise(resolve=>setImmediate(()=>{active--;resolve();}));}}));
 const db={collectionGroup:()=>({select:()=>({get:async()=>{queries++;selectedDocuments+=references.length;return{docs:references};}})}),collection:()=>({select:()=>({get:async()=>{queries++;return{docs:[]};}})})};
 const fakeBucket={getFiles:async({prefix})=>[prefix==='groups/'?files:[]]};
 cache.delete(path.join(root,'firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts'));
 const mod=load('firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts',{'firebase-admin':{firestore:()=>db},'firebase-functions/v2/scheduler':{onSchedule:(_options,fn)=>fn},'../shared/imageBucket':{imageBucket:()=>fakeBucket}});
 const result=await mod.sweepOrphanedImages(new Date('2026-10-03T00:00:00Z'));
 console.log(JSON.stringify({case:'actual-image-sweep-mocked-io',n,queries,selectedDocuments,maxActiveDeletes:maxActive,checked:result.checked,deleted:result.deleted.length}));
}
sweepProbe(1000).then(()=>sweepProbe(5000)).catch(e=>{console.error(e);process.exitCode=1;});
