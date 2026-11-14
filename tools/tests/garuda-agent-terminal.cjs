/* Sales terminal: availability, sell, names, contact, ticketing arrangement, save, pay, ticket, retrieve, cancel, expiry. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});
 await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);
 const run=async c=>{await p.fill('#tin',c);await p.press('#tin','Enter');return p.evaluate(()=>GA_TERM.lines().join('\n'))};
 const last=async c=>{const all=await run(c);const i=all.lastIndexOf('> '+c.toUpperCase());return all.slice(i)};
 assert(/SALES TERMINAL/.test(await p.locator('#tout').innerText()));
 await p.click('#term-help');assert(/AVAILABILITY/.test(await p.locator('#tout').innerText()));
 await p.fill('#tin','unfinished draft');await p.press('#tin','ArrowUp');await p.press('#tin','ArrowDown');assert.equal(await p.inputValue('#tin'),'unfinished draft');
 assert(/AVAILABILITY/.test(await last('HE')));
 assert(/INVALID ENTRY/.test(await last('ZZZ')));
 assert(/NO AVAILABILITY/.test(await last('SS2Y1')));
 assert(/INCOMPLETE/.test(await last('ER')));
 assert(/NEED CITY PAIR/.test(await last('AN21DEC')));
 assert(/FIRST|TOMORROW|INVALID/.test(await last('AN01JAN20JKTSIN')));
 /* availability and sell, return trip */
 let o=await last(`AN${ddmon(21)}JKTSIN`);assert(/GA \d+/.test(o)&&/Y\d/.test(o)&&/JKTSIN/.test(o));
 assert(/NO SUCH LINE/.test(await last('SS2Y99')));
 assert(/HK2/.test(await last('SS2Y1')));
 o=await last(`AN${ddmon(28)}`);assert(/SINJKT/.test(o));assert(/HK2/.test(await last('SS2Y1')));
 assert(/SEATS MUST MATCH/.test(await last('SS3Y2')));
 assert(/NEED +NAME/.test(await last('ER')));
 assert(/DOES NOT MATCH/.test(await last('NM3WIJAYA/RINA/BUDI/DEWI'.replace('/DEWI',''))));
 assert(/NOT ALLOWED FOR AN ADULT/.test(await last('NM1WIJAYA/X MSTR')));assert(/NOT ALLOWED FOR A CHILD/.test(await last('NM1WIJAYA/X MR(CHD/01JUN18)')));
 assert(/1\.WIJAYA\/RINA MRS/.test(await last('NM1WIJAYA/RINA MRS')));assert.match(await p.locator('#tside').innerText(),/1 of 2 seat-holding passengers named/);assert(/2\.WIJAYA\/BUDI MR/.test(await last('NM1WIJAYA/BUDI MR')));
 assert(/NEED +CONTACT/.test(await last('ER')));
 await run('AP+628120000111');assert(/NEED +TICKETING/.test(await last('ER')));
 assert(/TIME LIMIT MUST BE/.test(await last(`TKTL${ddmon(40)}`)));
 assert(/TICKETING TIME LIMIT/.test(await last(`TKTL${ddmon(3)}`)));
 assert(/NEED +RECEIVED FROM/.test(await last('ER')));
 await run('RFRINA');
 o=await last('FQD');assert(/TOTAL IDR/.test(o)&&/ROUND TRIP/.test(o)&&/2 ADT/.test(o));
 assert(/RULES|FARE FAMILY/.test(await last('FQN')));
 o=await last('ER');assert(/RECORD LOCATOR GA[0-9A-Z]{4}/.test(o));const ref=o.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];
 assert(/HELD/.test(o)&&/WIJAYA\/RINA/.test(o)&&/HK2/.test(o));
 assert(/ALREADY SAVED/.test(await last('NM1X/Y')));
 /* the held booking uses up seats */
 assert.equal(await p.evaluate(()=>GA_AGENT.bookings()[0].held),true);assert.match(await p.locator('#tside').innerText(),/review the total/);
 /* pay and ticket */
 assert(/NEED FORM OF PAYMENT/.test(await last('ET')));
 assert(/SHORT BY/.test(await (async()=>{await run('FPCASH/1000');return last('ET')})()));
 await run('FPCC');o=await last('ET');assert(/TICKETS ISSUED/.test(o));assert.equal((o.match(/126-\d{10}/g)||[]).length,2);assert(/APPROVAL \d{6}/.test(o));
 assert(/ALREADY TICKETED/.test(await last('ET')));
 o=await last('TWD');assert(/E-TICKET COUPONS/.test(o)&&/OPEN/.test(o));
 await p.evaluate(()=>GA_AGENT.bookings()[0].tickets.forEach(t=>t.coupons.filter(c=>c.d===0).forEach(c=>c.status='FLOWN')));
 assert(/FLOWN/.test(await last('TWD')));assert(/FLOWN OR PARTLY USED/.test(await last('RBM3')));
 const refund=await last('XI');assert(!/JKT → SIN/.test(refund)&&/SIN → JKT/.test(refund),refund);
 await p.evaluate(()=>GA_AGENT.bookings()[0].tickets.forEach(t=>t.coupons.filter(c=>c.d===0).forEach(c=>c.status='OPEN')));await run('RT');
 await p.evaluate(()=>{window.__pr=0;document.getElementById('eng').contentWindow.print=()=>{window.__pr++}});
 await run('EP');await p.waitForFunction(()=>window.__pr===1,null,{timeout:5000});
 const etk=await p.frameLocator('#eng').locator('#etk-sheet').innerText();assert(etk.includes(ref)&&etk.includes('Counter JKT-03'));assert(etk.includes('MRS RINA WIJAYA')&&etk.includes('MR BUDI WIJAYA')&&etk.includes('Dear Mrs Wijaya'));
 /* retrieve, history, cancel with refund */
 await run('IG');assert(/TICKETED/.test(await last('RT'+ref))===true);o=await last('RT');assert(/FA PAX 126-\d{10}\/ETGA\/\w+\/JKT003 +WIJAYA\/RINA MRS/.test(o));
 assert(/TICKETED/.test(await last('RH'))&&/BOOKING CREATED/.test(await last('RH')));
 assert(/REFUND/.test(await last('XI')));o=await last('XIY');assert(/BOOKING CANCELLED/.test(o)&&/CANCELLED/.test(o));
 assert(/ALREADY CANCELLED/.test(await last('XI')));
 /* a held booking with a child and an infant, then it expires */
 await run('IG');await run(`AN${ddmon(25)}JKTDPS`);await run('SS1Y1');assert(/UNSAVED BOOKING IN PROGRESS/.test(await last('RT'+ref)));assert.match(await p.locator('#tside').innerText(),/HK1/);await run('IG');await run(`AN${ddmon(25)}JKTDPS`);assert(/HK3/.test(await last('SS3Y1')));
 await run('NM2TAN/ALI MR/SITI MRS');assert(/TAN\/DINA MISS \(CHD/.test(await last('NM1TAN/DINA MISS(CHD/01JUN18)')));assert(/OK/.test(await last('NM1TAN/BAYU MSTR(INF/20AUG25)')));
 assert(/INVALID DATE OF BIRTH/.test(await last('NM1TAN/X(CHD/99XXX18)')));
 await run('AP081234567890');await run('TKOK');await run('RFALI');o=await last('FQD');assert(/2 ADT  1 CHD  1 INF/.test(o));
 o=await last('ER');assert(/TAN\/ALI/.test(o));const ref2=o.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];
 assert.deepEqual(await p.evaluate(()=>GA_AGENT.bookings()[0].pax),{a:2,c:1,i:1});
 assert(new RegExp(ref2).test(await last('QT')));
 await p.evaluate(()=>{GA_AGENT.bookings()[0].tl=Date.now()-1000;GA_AGENT.sweep()});
 assert(/EXPIRED/.test(await last('RT'+ref2)));assert(/QUEUE EMPTY/.test(await last('QT')));
 /* bookings tab shows all statuses; shift ignores held cancels */
 await p.click('[data-tab="books"]');const bt=await p.locator('#t-books').innerText();assert(/Cancelled/.test(bt)&&/Expired/.test(bt));
 await p.click('[data-tab="shift"]');assert(/Bookings issued\s*1/.test((await p.locator('#t-shift .stat').innerText()).replace(/\n/g,' ')));
 /* A one-adult simulated award debits the demo balance only on issuance. */
 await p.click('[data-tab="term"]');await run('IG');await run(`AN${ddmon(21)}JKTDPS`);await run('SS1Y1');await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');await run('ER');
 assert(/12,480 MILES/.test(await last('AMRINA')));assert(/8,000/.test(await last('AWQ')));assert(/8,000 MILES/.test(await last('FQD')));assert(/12,480 MILES/.test(await last('AMRINA')));
 await run('FPCC');assert(/AWARD  8,000 MILES/.test(await last('ET')));assert(/4,480 MILES/.test(await last('AMRINA')));assert(/MILES REINSTATEMENT REQUIRE MANUAL REVIEW/.test(await last('XI')));assert(/MANUAL CHANGE/.test(await last('RBM2')));
 await run('IG');await run(`AN${ddmon(22)}JKTDPS`);await run('SS1Y1');await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');await run('ER');await run('AWQ');await run('FPCC');assert(/INSUFFICIENT MILES/.test(await last('ET')));assert(/4,480 MILES/.test(await last('AMRINA')));assert(/REMOVED/.test(await last('AWX')));
 assert.deepEqual(errors,[]);console.log('PASS: sales terminal: availability, sell, names, save, pay, ticket, print, retrieve, history, refund, queue, expiry');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
