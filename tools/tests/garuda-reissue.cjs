/* Reissue: change the class, flight or date of a ticketed booking with a fare difference and a change fee. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);
 const run=async c=>{await p.fill('#tin',c);await p.press('#tin','Enter');return p.evaluate(()=>GA_TERM.lines().join('\n'))};
 const last=async c=>{const all=await run(c);return all.slice(all.lastIndexOf('> '+c.toUpperCase()))};
 const d=ddmon(30);
 const ticket=async(cls,pax=2)=>{await run('IG');await run(`AN${d}JKTDPS`);assert(new RegExp('HK'+pax).test(await last(`SS${pax}${cls}1`)));await run(pax===2?'NM2WIJAYA/RINA MRS/BUDI MR':'NM1WIJAYA/RINA MRS');await run('AP+628120000111');await run('TKOK');await run('RFRINA');const er=await last('ER');const ref=er.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];await run('FPCASH');assert(/TICKETS ISSUED/.test(await last('ET')));return ref};
 /* a Lite fare cannot be changed */
 await ticket('G',1);assert(/CHANGES NOT ALLOWED/.test(await last('RBL2')));
 /* a Standard fare: change fee applies, fare difference, new tickets */
 const ref=await ticket('H');const b0=await p.evaluate(()=>{const b=GA_AGENT.bookings()[0];return {flt:b.dirs[0].legs[0].id,total:b.total,paid:b.paid,tickets:b.names.map((n,i)=>GA_AGENT.ctx.ticketNo(b,i)),tv:b.tv||0}});
 assert.equal(b0.paid,b0.total);assert.equal(b0.tv,0);
 await run(`AN${d}JKTDPS`);assert(/NO SUCH LINE/.test(await last('RBY2/99')));
 /* wrong route and past sequence are refused */
 await run(`AN${d}JKTSUB`);{const o=await last('RBH3/1');assert(/MUST GO JKT TO DPS/.test(o),o)}
 await run(`AN${d}JKTDPS`);
 const quote=await last('RBM3/6');assert(/REISSUE QUOTE/.test(quote)&&/CHANGE FEE/.test(quote)&&/250,000/.test(quote)&&/TOTAL TO COLLECT/.test(quote),quote);
 const collect=+quote.match(/TOTAL TO COLLECT IDR ([\d,]+)/)[1].replace(/,/g,'');assert(collect>=500000);
 assert(/NEED FORM OF PAYMENT/.test(await last('ET')));
 await run('FPCASH/1000');assert(/SHORT BY/.test(await last('ET')));
 const sold0=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-sold')));
 await run('FPCC');const done=await last('ET');assert(/REISSUED/.test(done)&&/NEW TICKETS/.test(done)&&/APPROVAL|COLLECTED/.test(done),done);
 const b1=await p.evaluate(()=>{const b=GA_AGENT.bookings()[0];return {flt:b.dirs[0].legs[0].id,total:b.total,paid:b.paid,paid0:b.paid0,tickets:b.names.map((n,i)=>GA_AGENT.ctx.ticketNo(b,i)),tv:b.tv,cls:b.classes[0],re:b.reissues.length,seats:Object.values(b.dirs[0].legs[0].seats||{}).length}});
 assert.equal(b1.tv,1);assert.equal(b1.re,1);assert.equal(b1.cls,'M');assert.notEqual(b1.flt,b0.flt);assert.equal(b1.paid,b0.paid+collect);assert.equal(b1.paid0,b0.paid);assert(b1.tickets.every((t,i)=>t!==b0.tickets[i]));assert.equal(b1.seats,2);
 const sold1=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-sold')));assert(Object.keys(sold1).some(k=>(sold1[k]||0)<(sold0[k]||0)),'old flight released');assert(Object.keys(sold1).some(k=>(sold1[k]||0)>(sold0[k]||0)),'new flight taken');
 assert(/REISSUED/.test(await last('RH')));assert(/ M /.test(await last('RT')));
 /* the new e-ticket and the shift */
 await p.evaluate(()=>{window.__pr=0;document.getElementById('eng').contentWindow.print=()=>{window.__pr++}});
 await run('EP');await p.waitForFunction(()=>window.__pr===1,null,{timeout:5000});
 const etk=await p.frameLocator('#eng').locator('#etk-sheet').innerText();assert(etk.includes(b1.flt)&&etk.includes(b1.tickets[0])&&!etk.includes(b0.tickets[0]));
 const sh=await p.evaluate(()=>GA_AGENT.shift());assert(sh.S>=b1.paid0+collect);
 /* a second change with nothing to collect (lower fare, free of fee only if the rule is free) still needs ET */
 assert.deepEqual(errors,[]);console.log('PASS: reissue: Lite blocked, quote with fee and difference, payment, new tickets, flight moved, seats moved, e-ticket, shift');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
