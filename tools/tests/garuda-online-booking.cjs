const {bookingToPeople,bookingToPayment,selectReturn}=require('./garuda-flow-helpers.cjs');
/* A web purchase is a real issued record: it survives reload, appears in the agent terminal, and its seats are sold. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:390,height:844}}),errors=[];
 await ctx.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}}});
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('https://garuda.test/garuda/');await p.waitForSelector('.home-book');
 await p.locator('.home-book').click();await p.locator('[data-pk="to"]').click();await p.locator('#pkIn').fill('DPS');await p.locator('[data-sel="DPS"]').click();await p.locator('#goRes').click();
 await p.locator('[data-expand="0"]').click();await p.locator('[data-result-continue="0"]').click();await selectReturn(p);
 await bookingToPeople(p);await p.locator('#pn0').fill('Rina Wijaya');await p.locator('#review-email').fill('rina@example.com');await bookingToPayment(p);await p.locator('#payBtn').click();await p.waitForSelector('#v-done.on');
 const rows=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-agent-bookings')||'[]'));
 assert.equal(rows.length,1);const r=rows[0];assert.equal(r.place,'Online');assert.equal(r.held,false);assert(r.issuedMs>0);assert.equal(r.paid,r.total);assert.equal(r.passengers[0].last,'Wijaya');assert.equal(r.passengers[0].first,'Rina');
 const sold=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('ga-sold')||'{}')).reduce((a,x)=>a+x,0));assert.equal(sold,2);
 await p.reload();await p.waitForSelector('.home-book');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-agent-bookings')).length),1);
 const a=await ctx.newPage();a.on('pageerror',e=>errors.push(e.message));await a.goto('https://garuda.test/garuda/agent.html');await a.waitForSelector('#app:not([hidden])',{timeout:20000});await a.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);
 assert.equal(await a.evaluate(()=>GA_AGENT.bookings().length),1);
 await a.fill('#tin','RT'+r.ref);await a.press('#tin','Enter');const out=await a.evaluate(()=>GA_TERM.lines().join('\n'));assert(out.includes(r.ref)&&/WIJAYA/.test(out),out.slice(-400));
 assert(await a.evaluate(()=>GA_AGENT.ctx.ensureTickets(GA_AGENT.bookings()[0]).length)===1);
 assert.deepEqual(errors,[]);console.log('online booking ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
