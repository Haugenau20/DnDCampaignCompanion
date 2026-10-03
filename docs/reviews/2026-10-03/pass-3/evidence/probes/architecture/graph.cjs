const fs = require('fs');
const path = require('path');
const root = '/workspace/DnDCampaignCompanion';
const ts = require(path.join(root, 'node_modules/typescript'));
const functionsMode = process.argv[2] === 'functions';
const sourceRoot = path.join(root, functionsMode ? 'firebase/functions/src' : 'src');
const graphName = functionsMode ? 'functions-graph' : 'graph';
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = walk(sourceRoot).filter(f => /\.tsx?$/.test(f) && !/\.d\.ts$|__tests__|\.test\.|test-utils|__mocks__|setupTests|utils\/__dev__/.test(f));
const configRoot = functionsMode ? path.join(root,'firebase/functions') : root;
const config = ts.readConfigFile(path.join(configRoot,'tsconfig.json'),ts.sys.readFile).config;
const opts = ts.parseJsonConfigFileContent(config,ts.sys,configRoot).options;
const rel = f => path.relative(root,f);
const area = f => f.startsWith('src/features/') ? f.split('/').slice(0,3).join('/') : f.split('/').slice(0,2).join('/');
const edges=[];
const unresolved=[];
function imports(f, source, mode) {
  const ast=ts.createSourceFile(f,source,ts.ScriptTarget.Latest,true);
  function visit(n) {
    let spec, dynamic=false, kind;
    if ((ts.isImportDeclaration(n)||ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {spec=n.moduleSpecifier.text;kind=ts.isImportDeclaration(n)?'import':'export';}
    if (ts.isCallExpression(n) && n.expression.kind===ts.SyntaxKind.ImportKeyword && n.arguments.length===1 && ts.isStringLiteral(n.arguments[0])) {spec=n.arguments[0].text;dynamic=true;kind='import()';}
    if(spec) {
      const target=ts.resolveModuleName(spec,f,opts,ts.sys).resolvedModule?.resolvedFileName;
      const line=ast.getLineAndCharacterOfPosition(n.getStart()).line+1;
      if(target?.startsWith(sourceRoot)) edges.push({from:rel(f),to:rel(target),line,spec,kind,dynamic,mode});
      else if((spec.startsWith('.')||spec.startsWith('@/')||/^(core|shared|features|app|pages)\//.test(spec))&&!/\.(css|webp|png|jpg|svg)$/.test(spec)) unresolved.push({file:rel(f),spec,mode});
    }
    ts.forEachChild(n,visit);
  }
  visit(ast);
}
for(const f of files) {
 const s=fs.readFileSync(f,'utf8');
 imports(f,s,'source');
 const emitted=ts.transpileModule(s,{fileName:f,compilerOptions:{...opts,noEmit:false,module:ts.ModuleKind.ESNext,sourceMap:false}}).outputText;
 imports(f,emitted,'runtime');
}
function components(mode,dynamic) {
 const adj=new Map(files.map(f=>[rel(f),[]]));
 for(const e of edges.filter(e=>e.mode===mode&&(dynamic||!e.dynamic))) adj.get(e.from)?.push(e.to);
 let next=0; const ids=new Map(),low=new Map(),active=new Set(),stack=[],scc=[];
 function visit(v) {ids.set(v,next);low.set(v,next++);stack.push(v);active.add(v);for(const w of adj.get(v)||[]) {if(!ids.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(active.has(w)) low.set(v,Math.min(low.get(v),ids.get(w)));}if(low.get(v)===ids.get(v)){const a=[];let w;do {w=stack.pop();active.delete(w);a.push(w);}while(w!==v);if(a.length>1||adj.get(v)?.includes(v))scc.push(a.sort());}}
 for(const v of adj.keys())if(!ids.has(v))visit(v);
 return scc.sort((a,b)=>b.length-a.length);
}
const runtime=edges.filter(e=>e.mode==='runtime');
const source=edges.filter(e=>e.mode==='source');
const policyEdges=source.filter(e => {
 if(e.from.startsWith('src/core/')&&!e.to.startsWith('src/core/'))return true;
 if(e.to.startsWith('src/features/') && area(e.from)!==area(e.to) && !/^src\/features\/[^/]+\/index\.ts$/.test(e.to))return true;
 if(e.from.startsWith('src/features/')&&area(e.from)===area(e.to)&&/^src\/features\/[^/]+\/index\.ts$/.test(e.to))return true;
 return false;
});
const reachable=(rootFiles,edgesToUse) => {const reached=new Set(rootFiles),queue=[...rootFiles];while(queue.length){const f=queue.shift();for(const e of edgesToUse.filter(e=>e.from===f))if(!reached.has(e.to)){reached.add(e.to);queue.push(e.to);}}return reached;};
const entryFile = functionsMode ? 'firebase/functions/src/index.ts' : 'src/index.tsx';
const entryReach=reachable([entryFile],runtime);
const staticEntryReach=reachable([entryFile],runtime.filter(e=>!e.dynamic));
const allIncoming=files.map(f=>rel(f)).filter(f=>!runtime.some(e=>e.to===f));
const summary={files:files.length,sourceEdges:source.length,runtimeEdges:runtime.length,sourceDynamic:source.filter(e=>e.dynamic).length,runtimeDynamic:runtime.filter(e=>e.dynamic).length,sourceSCC:components('source',false),runtimeSCC:components('runtime',false),runtimeWithDynamicSCC:components('runtime',true),policyEdges,unresolved,entryReach:entryReach.size,staticEntryReach:staticEntryReach.size,notReachable:files.map(f=>rel(f)).filter(f=>!entryReach.has(f)),noIncoming:allIncoming,crossAreaRuntime:runtime.filter(e=>area(e.from)!==area(e.to))};
fs.writeFileSync('/tmp/pass3-architecture/' + graphName + '.json',JSON.stringify({summary,edges},null,2));
console.log(JSON.stringify(summary,null,2));
