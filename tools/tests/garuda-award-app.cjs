/* Pay with miles in the passenger app: toggle, award results, review, confirm, balance and inventory follow. */
const {bookingToPayment,selectReturn}=require('./garuda-flow-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{try{if(!localStorage.getItem('ga-pricing-cfg'))localStorage.setItem('ga-pricing-cfg',JSON.stringify({heat:{hot:0}}))}catch(e){}});
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});return f.endsWith('/garuda/index.html')?r.fulfill({contentType:'text/html',body:fs.readFileSync(f,'utf8').replace('/* deep links for review:','window.__t={S,TD,go,listFor,awardFares,GA_PRICING};\n/* deep links for review:')}):r.fulfill({path:f})});
 await p.goto('https://garuda.test/garuda/');await p.waitForFunction(()=>window.__t);
 /* ---- return trip in miles: two award flights, total miles for both, nothing paid ---- */
 await p.evaluate(()=>{const T=__t;Object.assign(T.S.q,{from:'JKT',to:'DPS',type:'ret',d1:T.TD+20,d2:T.TD+26,a:1,c:0,i:0,cab:'Economy',miles:true});T.S.sel=[];T.S.step=0;T.S.stack=['home'];T.go('results')});
 await p.waitForSelector('#v-results.on');await p.locator('[data-expand="0"]').click();await p.locator('#result-fares-0 [data-result-fare="0"]').click();assert.match(await p.locator('[data-result-continue="0"]').innerText(),/Choose return flight/);await p.locator('[data-result-continue="0"]').click();
 assert.match(await p.locator('.results-outbound').innerText(),/6,000 miles \+ IDR/);assert.equal(await p.locator('[data-select-return]').count(),0);
 await p.locator('[data-expand="0"]').click();await p.locator('#result-fares-0 [data-result-fare="1"]').click();assert(await p.locator('[data-result-continue="0"]').isDisabled(),'6,000 + 9,000 is more than the balance');assert.match(await p.locator('#result-fares-0').innerText(),/more miles/);await p.locator('#result-fares-0 [data-result-fare="0"]').click();await p.locator('[data-result-continue="0"]').click();await p.waitForSelector('#v-review.on');
 await bookingToPayment(p);assert.match(await p.locator('#v-review').innerText(),/12,000 miles/);assert.match(await p.locator('#v-review').innerText(),/Miles balance after\s*480/);
 assert.equal(await p.evaluate(()=>__t.S.sel.map(x=>x.award.level).join()),'Saver,Saver');
 /* ---- search: one way JKT to DPS, 20 days out, pay with miles ---- */
 await p.evaluate(()=>{const T=__t;Object.assign(T.S.q,{from:'JKT',to:'DPS',type:'one',d1:T.TD+20,a:1,c:0,i:0,cab:'Economy',miles:false});T.S.stack=['home'];T.go('search')});
 await p.waitForSelector('#v-search.on');const tog=p.locator('[data-miles]');assert.equal(await tog.getAttribute('aria-pressed'),'false');assert.match(await tog.innerText(),/12,480 miles/);
 await tog.click();assert.equal(await p.locator('[data-miles]').getAttribute('aria-pressed'),'true');assert.match(await p.locator('.search-summary').innerText(),/Miles/);
 await p.locator('#goRes').click();await p.waitForSelector('#v-results.on');
 const card=await p.locator('.result-flight').first().innerText();assert.match(card,/miles/);assert.match(card,/airport charges/);assert(!/From · Economy\s*\n?\s*IDR/.test(card));
 assert.match(await p.locator('.results-date-strip').innerText(),/\dk/);assert.match(await p.locator('.results-count').innerText(),/Award seats/);
 /* ---- expand: Saver and Advantage with their own miles ---- */
 await p.locator('[data-expand="0"]').click();const fam=p.locator('#result-fares-0 .result-family');assert.equal(await fam.count(),2);
 const t=await p.locator('#result-fares-0').innerText();assert.match(t,/Economy Saver/);assert.match(t,/Economy Advantage/);assert.match(t,/6,000 miles/);assert.match(t,/9,000 miles/);assert.match(t,/Your balance is 12,480 miles/);
 assert.equal(await p.locator('#result-fares-0 [data-result-cabin]').count()>=1,true);
 /* Business Advantage costs 22,000, more than the balance: cannot continue */
 const tabs=await p.locator('#result-fares-0 [data-result-cabin]').allInnerTexts();
 const bi=tabs.findIndex(x=>/Business/.test(x));if(bi>=0){await p.locator('#result-fares-0 [data-result-cabin]').nth(bi).click();await p.locator('#result-fares-0 [data-result-fare="1"]').click();assert(await p.locator('[data-result-continue="0"]').isDisabled());assert.match(await p.locator('#result-fares-0').innerText(),/more miles/);await p.locator('#result-fares-0 [data-result-cabin]').nth(0).click()}
 /* ---- pick Economy Saver, review shows miles and cash only ---- */
 await p.locator('#result-fares-0 [data-result-fare="0"]').click();await p.locator('[data-result-continue="0"]').click();await p.waitForSelector('#v-review.on');
 await bookingToPayment(p);const rv=await p.locator('#v-review').innerText();assert.match(rv,/GarudaMiles/);assert.match(rv,/6,000 miles/);assert.match(rv,/6,480/);assert.match(rv,/Pay in cash/);assert(!/Fares ·/.test(rv));assert.match(await p.locator('#payBtn').innerText(),/6,000 miles \+/);
 const flightKey=await p.evaluate(()=>__t.S.sel[0].it.key),before=await p.evaluate(k=>{const it=__t.listFor().its.find(i=>i.key===k);return __t.awardFares(it).find(r=>r.k==='X').left},flightKey);
 await p.locator('#payBtn').click();await p.waitForSelector('#v-done.on');
 const done=await p.locator('#v-done').innerText();assert.match(done,/GarudaMiles used/);assert.match(done,/6,000 miles/);assert.match(done,/Paid in cash/);
 /* ---- the booking is a real award record: balance, inventory, shared with the counter ---- */
 const rec=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-agent-bookings')).find(b=>b.award));assert(rec&&rec.award.issued&&rec.award.miles===6000&&rec.award.ledger[0].miles===6000&&rec.award.memberId==='GA123456789');assert.equal(rec.fare,0);assert.equal(rec.tax,0);assert(rec.total>0&&rec.total<400000);assert.equal(rec.classes[0],'X');
 const after=await p.evaluate(k=>{const it=__t.search?0:0;return null},flightKey);
 await p.evaluate(()=>__t.go('home'));assert.match(await p.locator('#v-home').innerText(),/6,480 miles/);
 const left=await p.evaluate(({k,d})=>{const its=search('JKT','DPS',d);const it=its.find(i=>i.key===k);return awardFares(it).find(r=>r.k==='X').left},{k:flightKey,d:await p.evaluate(()=>__t.TD+20)});assert.equal(left,Math.max(0,before-1));
 /* ---- a sold-out Saver level shows no seats; normal search is untouched ---- */
 await p.evaluate(()=>{const T=__t;T.GA_PRICING.cfg.award.saverClose=999;T.GA_PRICING.clear();Object.assign(T.S.q,{miles:true});T.S.sel=[];T.S.step=0;T.S.stack=['home'];T.go('results')});
 await p.waitForSelector('#v-results.on');if(!(await p.locator('#result-fares-0 .result-family').count()))await p.locator('[data-expand="0"]').click();assert.match(await p.locator('#result-fares-0 [data-result-fare="0"]').innerText(),/No seats/);assert(await p.locator('#result-fares-0 [data-result-fare="0"]').isDisabled());assert(!(await p.locator('#result-fares-0 [data-result-fare="1"]').isDisabled()));
 await p.evaluate(()=>{const T=__t;T.GA_PRICING.cfg.award.saverClose=3;T.GA_PRICING.clear();T.S.q.miles=false;T.S.sel=[];T.S.step=0;T.S.stack=['home'];T.go('results')});
 await p.waitForSelector('#v-results.on');assert.match(await p.locator('.result-flight').first().innerText(),/IDR/);assert(!/miles/.test(await p.locator('.result-flight').first().innerText()));
 assert.deepEqual(errors,[]);console.log('PASS: pay with miles in the passenger app: toggle, award results, review, confirm, balance and inventory');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
