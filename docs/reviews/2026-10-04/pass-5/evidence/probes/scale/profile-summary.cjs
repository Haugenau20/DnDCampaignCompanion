'use strict';
const fs=require('node:fs');const path=require('node:path');
const {SourceMapConsumer}=require('/workspace/DnDCampaignCompanion/node_modules/source-map');
async function main(){
 const outDir=process.argv[2]||'/tmp/pass5-scale';const build=process.argv[3]||'/tmp/pass5-runtime/production-build';const results=[];
 for(const filename of fs.readdirSync(outDir).filter(x=>x.endsWith('.cpuprofile'))){
  const profile=JSON.parse(fs.readFileSync(path.join(outDir,filename),'utf8'));const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const maps=new Map();const counts=new Map();let total=0;
  for(let i=0;i<profile.samples.length;i++){const weight=profile.timeDeltas?.[i]||1000;total+=weight;const node=nodes.get(profile.samples[i]);const f=node.callFrame;let source=f.url||f.functionName;let line=f.lineNumber+1,column=f.columnNumber;
   if(f.url?.startsWith('http')){const pathname=new URL(f.url).pathname;const mapFile=path.join(build,pathname+'.map');if(fs.existsSync(mapFile)){let consumer=maps.get(mapFile);if(!consumer){consumer=await new SourceMapConsumer(JSON.parse(fs.readFileSync(mapFile,'utf8')));maps.set(mapFile,consumer);}const original=consumer.originalPositionFor({line,column});if(original.source){source=original.source;line=original.line;column=original.column;}}}
   const key=source||'(unknown)';const v=counts.get(key)||{source:key,microseconds:0,samples:0,frames:{}};v.microseconds+=weight;v.samples++;const frame=`${f.functionName||'(anonymous)'} at ${line}:${column}`;v.frames[frame]=(v.frames[frame]||0)+weight;counts.set(key,v);
  }
  results.push({filename,totalSampledMs:total/1000,sampleCount:profile.samples.length,samplingIntervalUs:1000,topSelfSources:[...counts.values()].sort((a,b)=>b.microseconds-a.microseconds).slice(0,20).map(v=>({...v,selfMs:v.microseconds/1000,share:v.microseconds/total,frames:Object.fromEntries(Object.entries(v.frames).sort((a,b)=>b[1]-a[1]).slice(0,5))})),limit:'self sampled CPU, includes automation and frame waits; not inclusive React component duration'});for(const c of maps.values())c.destroy();
 }
 fs.writeFileSync(path.join(outDir,'profile-summary.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
