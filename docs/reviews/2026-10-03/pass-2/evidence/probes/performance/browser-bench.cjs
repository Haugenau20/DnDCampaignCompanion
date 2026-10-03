/* Synthetic browser CPU only. No app, server, network, production account or writes. */
const fs=require('fs');
const path=require('path');
const root='/workspace/DnDCampaignCompanion';
const ts=require(root+'/node_modules/typescript');
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const sources={
 'shared/hooks/useHighlightTarget':'src/shared/hooks/useHighlightTarget.ts',
 tree:'src/features/campaign-entities/locations/utils/location-tree.ts',
 paginate:'src/features/storytelling/stories/utils/paginate-prose.ts',
 search:'src/core/services/search/SearchService.ts'
};
const code=Object.fromEntries(Object.entries(sources).map(([key,file])=>[key,ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText]));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.route('**/*',route=>route.abort());
 console.log(JSON.stringify({browser:browser.version(),method:'Blank-page actual functions; warmup plus median of three; no UI/layout, no CPU throttling, not production route timing'}));
 const results=await page.evaluate(code=>{
  const cache={react:{}};
  function load(name){if(cache[name])return cache[name];const module={exports:{}};new Function('require','module','exports',code[name])(load,module,module.exports);return cache[name]=module.exports;}
  const {pathLabelOf}=load('tree');const {ancestorIdsOf}=load('shared/hooks/useHighlightTarget');
  const {paginateProse}=load('paginate');const {SearchService}=load('search');
  const out=[];
  const time=fn=>{fn();const ms=[];for(let i=0;i<3;i++){const start=performance.now();fn();ms.push(performance.now()-start);}return Math.round(ms.sort((a,b)=>a-b)[1]*100)/100;};
  for(const n of [100,500,1000,2000]){
   const locations=Array.from({length:n},(_,i)=>({id:'l'+i,name:'Place '+i,parentId:i?'l0':'',status:'visited'}));
   out.push({case:'location-flat-search-and-status-filter',n,searchMedianMs:time(()=>locations.map(l=>pathLabelOf(locations,l.id))),filterMedianMs:time(()=>locations.forEach(l=>ancestorIdsOf(locations,l.id,{idOf:x=>x.id,parentIdOf:x=>x.parentId})))});
  }
  for(const words of [1000,5000,10000,20000,50000]){
   const prose=Array.from({length:words},(_,i)=>'word'+(i%100)).join(' ');
   out.push({case:'saga-single-paragraph-pagination',words,inputCharacters:prose.length,pages:paginateProse(prose).length,medianMs:time(()=>paginateProse(prose))});
  }
  for(const n of [100,1000,5000]){
   const documents=Array.from({length:n},(_,i)=>({id:'n'+i,type:'note',metadata:{title:'Document '+i},content:'The party enters the dungeon. '.repeat(40)}));
   const s=new SearchService({maxResultsPerType:5,minQueryLength:2,fuzzyMatch:true});s.initializeIndex({note:documents,story:[],quest:[],npc:[],location:[],rumors:[]});
   out.push({case:'search',n,results:s.search('dungeon').length,medianMs:time(()=>s.search('dungeon'))});
  }
  return out;
 },code);
 results.forEach(result=>console.log(JSON.stringify(result)));
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
