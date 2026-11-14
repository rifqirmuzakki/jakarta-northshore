/* Terminal seats (SM, ST) and remarks (SR special services, RM, RC, OS). */
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
 /* unsaved booking: services and remarks */
 await run(`AN${d}JKTDPS`);assert(/HK2/.test(await last('SS2H1')));
 assert(/ADD THE PASSENGERS FIRST/.test(await last('SRVGML/P1')));
 await run('NM2WIJAYA/RINA MRS/BUDI MR');
 assert(/UNKNOWN SERVICE/.test(await last('SRABCD/P1')));assert(/IS FOR AN INFANT/.test(await last('SRBBML/P1')));assert(/IS FOR A CHILD/.test(await last('SRCHML')));
 assert(/NEEDS A TEXT/.test(await last('SRMEDA/P1')));assert(/NEEDS A PASSENGER/.test(await last('SRFQTV-GA123456789')));assert(/8 TO 14/.test(await last('SRFQTV-12/P1')));assert(/NO PASSENGER 5/.test(await last('SRVGML/P5')));
 assert(/1 ELEMENT ADDED  VGML/.test(await last('SRVGML/P1')));assert(/ALREADY IN THE BOOKING/.test(await last('SRVGML/P1')));
 assert(/OK  1 ELEMENT ADDED  WCHR/.test(await last('SRWCHR/P2')));await run('SRFQTV-GA123456789/P1');
 await run('RM CUSTOMER PAYS AT THE AIRPORT');await run('RC SPOUSE IS THE PAYER');await run('OSGA VIP CUSTOMER');
 await run('AP+628120000111');await run('TKTL'+ddmon(3));await run('RFRINA');
 let pnr=await last('RT');assert(/SSR VGML GA HK1 JKTDPS \d+ \w+\/P1/.test(pnr),pnr);assert(/SSR WCHR GA HK1 .*\/P2/.test(pnr)&&/SSR FQTV GA HK1 GA123456789\/P1/.test(pnr)&&/RM CUSTOMER PAYS AT THE AIRPORT/.test(pnr)&&/RC SPOUSE IS THE PAYER \(CONFIDENTIAL\)/.test(pnr)&&/OSI GA VIP CUSTOMER/.test(pnr));
 const wchr=pnr.split('\n').find(l=>/SSR WCHR/.test(l)),nWchr=+wchr.trim().split(/\s+/)[0];assert(/DELETED/.test(await last('XE'+nWchr)));assert(!/SSR WCHR/.test(await last('RT')));
 await run('SRWCHR/P2');
 assert(/SAVE THE BOOKING WITH ER FIRST/.test(await last('SM')));
 const er=await last('ER');const ref=er.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];
 const ex=await p.evaluate(()=>GA_AGENT.bookings()[0].extras.map(x=>x.k+':'+(x.code||'')+':'+x.p));assert(ex.includes('ssr:VGML:0')&&ex.includes('ssr:WCHR:1')&&ex.includes('ssr:FQTV:0')&&ex.some(x=>/^rm/.test(x))&&ex.some(x=>/^rc/.test(x))&&ex.some(x=>/^os/.test(x)));
 /* seats: map, assign, refusals */
 const sm=await last('SM');assert(/SEAT MAP  GA \d+  JKT-DPS/.test(sm)&&/FREE   X TAKEN/.test(sm)&&/P1  WIJAYA\/RINA MRS/.test(sm)&&/ST<SEAT>/.test(sm),sm);
 assert(/\n +\d+ +[.X12 ]+/.test(sm));
 const pick=await p.evaluate(()=>{const W=GA_AGENT.ctx.W,b=GA_AGENT.bookings()[0],l=b.dirs[0].legs[0],m=W.seatModel(b,l),o=W.otherSeatClaims(b,l),mine=Object.values(l.seats);return {free:m.seats.find(s=>!W.seatBlocked(l,s)&&!o.has(s)&&!mine.includes(s)),taken:m.seats.find(s=>W.seatBlocked(l,s)),mine:l.seats[1],cabin:m.cabin}});
 assert.equal(pick.cabin,'Economy');
 let o=await last(`ST${pick.free}/P1`);assert(new RegExp('OK  SEAT '+pick.free).test(o),o);assert.equal(await p.evaluate(()=>GA_AGENT.bookings()[0].dirs[0].legs[0].seats[0]),pick.free);
 assert(/SEAT .* IS TAKEN/.test(await last(`ST${pick.taken}/P1`)));assert(/ALREADY P1/.test(await last(`ST${pick.free}/P2`)));assert(/NOT IN THE BOOKED CABIN/.test(await last('ST1A/P1')));assert(/NO PASSENGER 7/.test(await last(`ST${pick.free}/P7`)));assert(/IS NOT A FLIGHT SEGMENT/.test(await last(`ST${pick.free}/P1/S1`)));
 assert(new RegExp('SEAT '+pick.free+'/P1').test(await last('RT')));assert(/ST12A\/P1|CHANGE WITH ST/.test(await last('SM3')));
 assert(/SEAT .* TO /.test(await last('RH')));
 /* services and remarks on a saved booking */
 assert(/ADDED  MOML/.test(await last('SRMOML/P2')));assert(/ELEMENT .* CANNOT BE DELETED/.test(await last('XE1')));
 pnr=await last('RT');const ml=pnr.split('\n').find(l=>/SSR MOML/.test(l));assert(/DELETED/.test(await last('XE'+ml.trim().split(/\s+/)[0])));assert(!/SSR MOML/.test(await last('RT')));
 await run('RM PASSENGER PREFERS AISLE');assert(/RM PASSENGER PREFERS AISLE/.test(await last('RT')));
 /* ticket and print: services, GarudaMiles number and seat show on the e-ticket */
 await run('FPCASH');assert(/TICKETS ISSUED/.test(await last('ET')));
 await p.evaluate(()=>{window.__pr=0;document.getElementById('eng').contentWindow.print=()=>{window.__pr++}});await run('EP');await p.waitForFunction(()=>window.__pr===1,null,{timeout:5000});
 const etk=await p.frameLocator('#eng').locator('#etk-sheet').innerText();assert(/Vegetarian meal – (RINA|Rina)/i.test(etk)&&/Wheelchair to the aircraft door – (BUDI|Budi)/i.test(etk)&&/GarudaMiles GA123456789/.test(etk)&&etk.includes(pick.free)&&!/CUSTOMER PAYS|SPOUSE IS THE PAYER|VIP CUSTOMER/i.test(etk),etk);
 /* a fare with seat selection at check-in refuses seats at the counter */
 await run('IG');await run(`AN${d}JKTDPS`);await run('SS1Q1');await run('NM1TAN/ALI MR');await run('AP+628120000111');await run('TKOK');await run('RFALI');await run('ER');
 o=await last('ST20A/P1');assert(/FARE RULE: SEAT SELECTION IS AT CHECK-IN ONLY \(ECONOMY VALUE\)/.test(o),o);assert(/SEATS CANNOT BE CHANGED NOW - FARE RULE/.test(await last('SM')));
 assert.deepEqual(errors,[]);console.log('PASS: seats and remarks: SM, ST, SR, RM, RC, OS, saved and unsaved, e-ticket');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
