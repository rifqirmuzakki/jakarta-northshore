/* Terminal: DD lists simulated demand, RT retrieves a simulated booking, and what is done to it is remembered. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),errors=[];
 await ctx.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}}});
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
 const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);return p};
 const p=await open();
 const run=async c=>{await p.fill('#tin',c);await p.press('#tin','Enter');return p.evaluate(()=>GA_TERM.lines().join('\n'))};
 const last=async c=>{const all=await run(c);return all.slice(all.lastIndexOf('> '+c.toUpperCase()))};
 const pick=await p.evaluate(()=>{const W=GA_AGENT.ctx.W,E=GA_AGENT.ctx.E,X=E.TD+6,l=W.GA_DEMAND.findLeg(W.search('JKT','DPS',X)[0].legs[0].id,X),MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],d=new Date(X*864e5);
  return {id:l.id.replace(' ',''),date:d.getUTCDate()+MON[d.getUTCMonth()]}});
 let dd=await last(`DD${pick.id}/${pick.date}/Y`);assert(/DEMAND  GA \d+  JKT-DPS/.test(dd)&&/SOLD \d+\/\d+   LF [\d.]+%/.test(dd)&&/REVENUE IDR [\d,]+/.test(dd),dd);
 const refs=[...dd.matchAll(/\n +\d+  ([0-9A-Z]{7})  .*?  (HK|XX CXL|XX CHG) /g)].map(m=>[m[1],m[2]]);assert(refs.length>20,dd);
 assert(/INVALID FORMAT/.test(await last('DDGA202')));assert(/NO GA 99 ON/.test(await last(`DDGA99/${pick.date}`)));
 const active=refs.find(r=>r[1]==='HK')[0],cancelled=refs.find(r=>r[1]!=='HK');
 /* retrieve: a full booking, stored once */
 let rt=await last('RT'+active);assert(rt.includes(active)&&/HK|OK|TICKET|ISSUED/i.test(rt),rt);
 assert.equal(await p.evaluate(()=>GA_AGENT.bookings().length),1);await last('RT'+active);assert.equal(await p.evaluate(()=>GA_AGENT.bookings().length),1);
 const rec=await p.evaluate(r=>{const b=GA_AGENT.bookings()[0];return{ref:b.ref,held:b.held,issued:!!b.issuedMs,gen:!!b.gen,cancelled:!!b.cancelled,names:b.names.length,total:b.total}},active);
 assert.deepEqual([rec.ref,rec.held,rec.issued,rec.gen,rec.cancelled],[active,false,true,true,false]);
 const gen=await p.evaluate(r=>GA_AGENT.ctx.W.GA_DEMAND.resolve(r).total,active);assert.equal(rec.total,gen);
 if(cancelled){await last('RT'+cancelled[0]);assert(await p.evaluate(r=>!!GA_AGENT.bookings().find(b=>b.ref===r).cancelled,cancelled[0]))}
 /* change something: cancel it with a refund, release the seats */
 await last('RT'+active);const soldBefore=await p.evaluate(r=>GA_AGENT.ctx.W.eval('Object.values(SOLD).reduce((a,x)=>a+x,0)'),active);
 await run('XI');const xi=await last('XIY');assert(/CANCEL|REFUND/i.test(xi),xi);
 assert(await p.evaluate(r=>!!GA_AGENT.bookings().find(b=>b.ref===r).cancelled,active));
 const soldAfter=await p.evaluate(()=>GA_AGENT.ctx.W.eval('Object.values(SOLD).reduce((a,x)=>a+x,0)'));assert(soldAfter<soldBefore,soldBefore+' '+soldAfter);
 /* unknown or not-yet-booked references */
 assert(/NO BOOKING FOUND/.test(await last('RT0000000')));
 /* remembered after a reload, and the customer app does not import it */
 await p.close();const p2=await open();
 assert(await p2.evaluate(r=>{const b=GA_AGENT.bookings().find(x=>x.ref===r);return !!(b&&b.cancelled&&b.gen)},active));
 const web=await ctx.newPage();await web.goto('https://garuda.test/garuda/index.html');await web.waitForSelector('.home-book');assert.equal(await web.evaluate(()=>S.bookings.length),0);
 assert.deepEqual(errors,[]);console.log('demand terminal ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
