/* Seats sold in the customer app reduce availability in the agent terminal, and the reverse, without lost updates. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1200,height:900}}),errors=[];
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 const web=await ctx.newPage(),agent=await ctx.newPage();[web,agent].forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 await web.goto('https://garuda.test/garuda/index.html');await web.waitForFunction(()=>typeof adjustSold==='function'&&typeof search==='function');
 await agent.goto('https://garuda.test/garuda/agent.html');await agent.waitForSelector('#app:not([hidden])',{timeout:20000});
 const leg=await web.evaluate(()=>{const q={...S.q,to:'DPS'},l=search(q.from,q.to,q.d1)[0].legs[0];return {id:l.id,dep:l.dep}});
 const key=leg.id+'|'+leg.dep+'|Economy';
 const aSold=()=>agent.evaluate(k=>GA_AGENT.ctx.W.eval('SOLD['+JSON.stringify(k)+']||0'),key);
 const wSold=()=>web.evaluate(k=>SOLD[k]||0,key);
 /* web sells 2, then the terminal sells 3: neither is lost */
 await web.evaluate(k=>{const[id,dep]=k.split('|');adjustSold({id,dep:+dep},'Economy',2)},key);
 await agent.waitForFunction(([k])=>GA_AGENT.ctx.W.eval('SOLD['+JSON.stringify(k)+']||0')===2,[key],{timeout:5000});
 await agent.evaluate(k=>{const[id,dep]=k.split('|');GA_AGENT.ctx.W.adjustSold({id,dep:+dep},'Economy',3)},key);
 assert.equal(await aSold(),5);
 await web.waitForFunction(([k])=>SOLD[k]===5,[key],{timeout:5000});
 await web.evaluate(k=>{const[id,dep]=k.split('|');adjustSold({id,dep:+dep},'Economy',1)},key);assert.equal(await wSold(),6);
 assert.deepEqual(errors,[]);console.log('sold sync ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
