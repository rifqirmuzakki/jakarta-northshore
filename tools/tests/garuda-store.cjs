/* GA_STORE: JSON round trip, defaults, bad data, remove/has, and change notifications across two pages. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext(),errors=[];
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:{'.js':'text/javascript','.html':'text/html'}[path.extname(f)]||'text/plain',body:fs.readFileSync(f)})});
 const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('https://garuda.test/garuda/photo-credits.html');await p.addScriptTag({url:'/garuda/store.js'});return p};
 const a=await open(),c=await open();
 assert.deepEqual(await a.evaluate(()=>{const S=GA_STORE;return[S.get('k',7),S.set('k',{x:[1,2]}),S.get('k'),S.has('k'),S.remove('k'),S.has('k'),S.get('k','d')]}),[7,true,{x:[1,2]},true,true,false,'d']);
 assert.equal(await a.evaluate(()=>{localStorage.setItem('bad','{oops');return GA_STORE.get('bad','fallback')}),'fallback');
 await c.evaluate(()=>{window.__seen=[];GA_STORE.onChange('shared',k=>__seen.push(k))});
 await a.evaluate(()=>{GA_STORE.set('shared',1);GA_STORE.set('other',1)});
 await c.waitForFunction(()=>__seen.length===1);assert.deepEqual(await c.evaluate(()=>__seen),['shared']);
 assert.equal(await c.evaluate(()=>GA_STORE.get('shared')),1);assert.deepEqual(errors,[]);console.log('store ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
