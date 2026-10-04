'use strict';
const fs=require('fs');
const path=require('path');
const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const helper=require('./helpers.cjs');
let browser,context;
async function main(){
 const area=process.argv[2]||'smoke';
 const file=process.argv[3];
 const outDir='/tmp/pass5-'+area;fs.mkdirSync(outDir,{recursive:true});
 const records=[];const report=(name,value)=>{const x={name,value};records.push(x);fs.writeFileSync(path.join(outDir,'observations.json'),JSON.stringify(records,null,2));console.log(JSON.stringify(x));};
 const api=await helper.seedBase(area);
 const probe=file?require(path.resolve(file)):{};
 if(probe.seed)await probe.seed(api);
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:1280,height:900}});
 const blocked=[];const pageErrors=[];
 context.on('page',p=>p.on('pageerror',e=>pageErrors.push({message:e.message,pathname:new URL(p.url()).pathname})));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  try{
   if(['127.0.0.1','localhost','[::1]'].includes(u.hostname))return await route.continue();
   blocked.push({origin:u.origin,path:u.pathname});return await route.abort();
  }catch(e){if(!/Route is already handled|Target.*closed|Browser.*closed|Page.*closed/.test(e.message))throw e;}
 });
 const page=await context.newPage();
 Object.assign(api,{page,context,outDir,report,go:p=>page.goto(api.baseUrl+p),signIn:p=>helper.signIn(p,api)});
 await helper.signIn(page,api);
 const notice=page.getByRole('button',{name:'Got it',exact:true});if(await notice.isVisible())await notice.click();
 report('local-app-signed-in',{url:page.url(),project:helper.projectId,campaignId:api.campaignId});
 if(probe.run)await probe.run(api);
 else {await page.screenshot({path:path.join(outDir,'home.png')});report('home',{text:(await page.locator('body').innerText()).slice(0,2200)});}
 report('runtime-boundaries',{blockedRemoteRequests:blocked,pageErrors});
 await context.close();await browser.close();context=null;browser=null;
 await helper.db.terminate();
}
main().catch(async e=>{
 console.error(e.stack);if(context){try{const page=context.pages()[0];await page.screenshot({path:'/tmp/pass5-runtime/failure.png'});console.error((await page.locator('body').innerText()).slice(0,4000));}catch{}}
 process.exitCode=1;
}).finally(async()=>{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await helper.db.terminate().catch(()=>{});});
