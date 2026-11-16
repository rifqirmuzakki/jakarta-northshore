/* Counter itinerary printout (IP / IPP): a plain-text document for held and ticketed bookings, in the style of a reservation system print. */
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
 await p.evaluate(()=>{window.__pr=0;document.getElementById('eng').contentWindow.print=()=>{window.__pr++};window.print=()=>{window.__pr++}});
 assert(/NO BOOKING/.test(await last('IP')));
 /* ---- a held return booking with two passengers, a child, services and remarks ---- */
 await run(`AN${ddmon(21)}JKTDPS`);await run('SS3M3');await run(`AN${ddmon(26)}DPSJKT`);await run('SS3M3');
 await run('NM2WIJAYA/RINA MRS/BUDI MR');await run('NM1WIJAYA/SARI(CHD/01JUN18)');await run('AP081234567890');await run('APE-RINA@MAIL.COM');await run('TKOK');await run('RFRINA');
 await run('SRFQTV-GA123456789/P1');await run('SRVGML/P1');await run('RM CUSTOMER WILL PAY AT THE AIRPORT');await run('RC VIP CUSTOMER');await run('OSGA SPOUSE IS THE PAYER');
 assert(/BOOKING SAVED/.test(await last('ER')));
 let it=await last('IP');
 assert(/ITINERARY - NOT TICKETED/.test(it)&&/COUNTER JKT-03 JAKARTA\s+OFFICE JKT003/.test(it)&&/BOOKING REF GA[0-9A-Z]{4}/.test(it)&&/TIME LIMIT \d+[A-Z]{3} \d{4}/.test(it));
 assert(/WIJAYA\/RINA MRS\s+FQTV GA123456789/.test(it)&&/WIJAYA\/BUDI MR/.test(it)&&/WIJAYA\/SARI/.test(it));
 assert(/I GUSTI NGURAH RAI INTL/.test(it)&&/DOMESTIC TERMINAL/.test(it),'airport name from the table');assert(/GARUDA INDONESIA - GA \d+/.test(it)&&/JAKARTA ID\s+DENPASAR ID/.test(it)&&/DENPASAR ID\s+JAKARTA ID/.test(it)&&/RESERVATION CONFIRMED - M ECONOMY/.test(it)&&/ON BOARD: [A-Z ]+/.test(it)&&/AIRCRAFT OWNER: GA GARUDA INDONESIA/.test(it)&&/EQUIPMENT: (AIRBUS INDUSTRIE|BOEING|ATR)/.test(it)&&/DURATION \d\d:\d\d/.test(it)&&/NON STOP/.test(it)&&/SEATS: /.test(it));
 assert(/FARE IDR[\d,]+ PER PAX INCL TAXES PER \d+[A-Z]{3} SUBJECT TO CHANGE/.test(it)&&/FARE IDR[\d,]+ PER CHD/.test(it)&&/X TIME LIMIT \d+[A-Z]{3}\/\d{4} AUTO CANCEL/.test(it));
 assert(/FARE RULES - ECONOMY STANDARD \(M\)/.test(it)&&/CHANGES\s+IDR 250,000 FEE PER PAX/.test(it)&&/REFUND\s+IDR 750,000 FEE PER PAX/.test(it)&&/FARE IS NOT GUARANTEED UNTIL TICKETED/.test(it));
 assert(/SPECIAL SERVICES/.test(it)&&/VGML VEGETARIAN MEAL/.test(it)&&/CONTACT\s+AP 081234567890\s+APE RINA@MAIL.COM/.test(it));
 assert(!/CUSTOMER WILL PAY|VIP CUSTOMER|SPOUSE IS THE PAYER/.test(it),'remarks and OSI never print');assert(!/ETKT/.test(it),'no ticket numbers before ticketing');
 const lines=await p.evaluate(()=>GA_TERM.itineraryText(GA_TERM.state().cur.ref).split('\n'));assert(lines.every(l=>l.length<=80),'every line fits 80 columns: '+lines.filter(l=>l.length>80).join('|'));
 /* ---- printing: the itinerary pane holds the logo, the COUNTER COPY tag and the text ---- */
 const n0=await p.evaluate(()=>window.__pr);assert(/ITINERARY SENT TO PRINT/.test(await last('IPP')));assert.equal(await p.evaluate(()=>window.__pr),n0+1);
 const pane=await p.evaluate(()=>({html:document.getElementById('agent-print-itin').innerHTML,txt:document.getElementById('agent-print-itin').innerText,rec:document.getElementById('agent-print-record').textContent}));
 assert(/garuda-logo-colour/.test(pane.html)&&/COUNTER COPY · NOT A TICKET/.test(pane.txt)&&/ITINERARY - NOT TICKETED/.test(pane.txt)&&pane.rec==='');
 /* the Bookings tab offers it for a held booking */
 await p.click('[data-tab="books"]');await p.click('tr.row');assert(/Print itinerary/.test(await p.locator('#t-books').innerText()));const n1=await p.evaluate(()=>window.__pr);await p.click('[data-itin]');assert.equal(await p.evaluate(()=>window.__pr),n1+1);
 await p.click('[data-tab="term"]');
 /* ---- ticketed: receipt number, tickets, fare table adding up, payment, endorsements ---- */
 await run('FPCASH/20000000');assert(/TICKETS ISSUED/.test(await last('TTP')));
 it=await last('IP');const st=await p.evaluate(()=>{const b=GA_TERM.state().cur;return {total:b.total,t:b.dirs.length,n:b.names.length,tickets:b.names.map((x,i)=>GA_AGENT.ctx.ticketNo(b,i)),receipt:document.getElementById('eng').contentWindow.etkReceipt(b,'0','RCT')}});
 assert(/ETKT RECEIPT \/ ITINERARY/.test(it)&&/TICKETED - M ECONOMY\s+NVB \d+[A-Z]{3}\d\d NVA/.test(it)&&!/RESERVATION CONFIRMED/.test(it)&&!/TIME LIMIT/.test(it));
 for(const t of st.tickets)assert(it.includes('ETKT '+t),'ticket '+t);assert(it.includes('RECEIPT '+st.receipt),'the receipt number is the e-ticket\'s');
 const tr=it.split('\n').find(l=>/TOTAL IDR/.test(l));assert.equal(+tr.trim().split(/\s+/).pop().replace(/,/g,''),st.total);
 assert(/FARE AND TAXES\s+FARE\s+ID PPN\s+AIRPORT CHG\s+TOTAL/.test(it)&&/FARE CALC\s+JKT GA DPS [\d.]+ GA JKT [\d.]+ IDR[\d.]+END ROE1\.000000/.test(it)&&/FOP\s+CASH\s+RECEIVED 20,000,000\s+CHANGE [\d,]+\s+CHARGED [\d,]+/.test(it)&&/ENDORSEMENTS\s+ECONOMY STANDARD/.test(it)&&/CHNG FEE IDR250000 PER PAX/.test(it)&&/ISSUED\s+COUNTER JKT-03/.test(it));
 assert(!/FARE IDR[\d,]+ PER PAX/.test(it),'the table replaces the per-pax line once ticketed');assert(/CHECK-IN OPENS 48 HRS/.test(it));
 await p.click('[data-tab="books"]');await p.click('tr.row');assert(/Print itinerary/.test(await p.locator('#t-books').innerText()));await p.click('[data-tab="term"]');
 /* EP still prints the e-ticket and TWP clears the itinerary pane */
 await p.evaluate(()=>{document.getElementById('agent-print-itin').innerHTML='<b>old</b>'});await run('TWP');assert.equal(await p.evaluate(()=>document.getElementById('agent-print-itin').innerHTML),'');
 /* ---- international: country codes ---- */
 await run('IG');await run(`AN${ddmon(30)}JKTSIN`);await run('SS1Y1');await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');assert(/BOOKING SAVED/.test(await last('ER')));
 it=await last('IP');assert(/SINGAPORE CHANGI/.test(it)&&/TERMINAL 3/.test(it),'real airport name and terminal');assert(/AGENT RECEIPT - NOT VALID FOR TRAVEL - SIMULATED\n.*NOT AFFILIATED WITH GARUDA INDONESIA/.test(it));assert(/SINGAPORE SG/.test(it)&&/JAKARTA ID/.test(it)&&/GARUDA INDONESIA - GA \d+/.test(it)&&/FARE IDR[\d,]+ PER PAX/.test(it));
 await run('XI');await run('XIY');
 /* ---- an award: miles, no fare ---- */
 await run('IG');await run(`AW${ddmon(30)}JKTDPS`);const aw=await last(`AW${ddmon(30)}JKTDPS`);const line=aw.split('\n').filter(l=>/^\s*\d+\s+GA/.test(l)).findIndex(l=>/\bX[1-9]/.test(l))+1;assert(line>0);
 await run(`SS1X${line}`);await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');await run('AMGA123456789');assert(/BOOKING SAVED/.test(await last('ER')));
 it=await last('IP');assert(/AWARD\s+[\d,]+ MILES PER PAX\s+\+ IDR [\d,]+ CASH TAXES AND CHARGES/.test(it)&&/NO FARE OR PPN ON AN AWARD/.test(it)&&/X ECONOMY AWARD SAVER/.test(it)&&/MEMBER RINA WIJAYA GA123456789/.test(it));
 /* ---- cancelled: nothing to print ---- */
 await run('XI');await run('XIY');assert(/CANCELLED - NO ITINERARY/.test(await last('IP')));
 assert.deepEqual(errors,[]);console.log('PASS: counter itinerary print: held and ticketed, 80 columns, fare rules, time limit, award, print pane, Bookings tab');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
