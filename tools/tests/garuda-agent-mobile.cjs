/* Sales counter on a phone: nothing pushes the page wider than the screen, the terminal scrolls sideways for wide lines, and inputs are 16px so iOS does not zoom in. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const w of [360,390,430]){
  const ctx=await b.newContext({viewport:{width:w,height:844},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
  await p.goto('https://garuda.test/garuda/agent.html');await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started,null,{timeout:20000});
  await p.evaluate(()=>GA_TERM.run('DDGA900/24DEC'));await p.waitForTimeout(200);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),w,'terminal fits '+w);
  assert(await p.evaluate(()=>{const o=document.getElementById('tout');return o.scrollWidth>o.clientWidth}),'wide terminal lines scroll inside the terminal');
  assert(await p.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('tin')).fontSize))>=16,'the terminal input is 16px or more');
  assert(await p.evaluate(()=>{const t=document.getElementById('tabs');return t.getBoundingClientRect().right<=innerWidth+1}),'tabs sit inside the screen');
  for(const tab of ['sell','books','shift','term']){await p.click('[data-tab="'+tab+'"]');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),w,tab+' fits '+w)}
  await p.click('[data-tab="sell"]');assert(await p.evaluate(()=>[...document.querySelectorAll('#t-sell input,#t-sell select')].every(i=>parseFloat(getComputedStyle(i).fontSize)>=16)),'guided inputs are 16px');
  assert.deepEqual(errors,[]);await ctx.close()}
 console.log('PASS: sales counter on a phone: fits 360, 390 and 430 wide, terminal scrolls sideways, inputs do not trigger zoom');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
