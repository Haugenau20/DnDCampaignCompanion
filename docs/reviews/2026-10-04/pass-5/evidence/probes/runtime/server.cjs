'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve('/tmp/pass5-runtime/production-build');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:3001').pathname);}catch{res.writeHead(400);return res.end();}
 let file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){
  if(path.extname(pathname)&&!pathname.endsWith('/')){res.writeHead(404);return res.end();}
  file=path.join(root,'index.html');
 }
 if(!fs.existsSync(file)){res.writeHead(503);return res.end('Production build not ready');}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 if(req.method==='HEAD')return res.end();
 fs.createReadStream(file).pipe(res);
});
server.listen(3001,'127.0.0.1',()=>console.log('Production App listening at http://127.0.0.1:3001'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
