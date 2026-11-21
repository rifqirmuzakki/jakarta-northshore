/* Charging in the currency of the first origin: pricing, locked rate, add-ons, agent, reissue at today's rate. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'}[path.extname(f)]||'application/octet-stream';return r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 /* 1. origin decides the currency; every city has one; IDR is untouched */
 const map=await p.evaluate(()=>{const out={};for(const k of Object.keys(CT))out[k]=GA_CUR.forCity(k,CT);return out});
 assert.equal(map.JKT,'IDR');assert.equal(map.DPS,'IDR');assert.equal(map.SIN,'SGD');assert.equal(map.NRT,'JPY');assert.equal(map.AMS,'EUR');assert.equal(map.ICN,'KRW');
 assert.equal(Object.keys(map).length,167);assert(await p.evaluate(()=>Object.keys(CT).every(k=>{const c=GA_CUR.forCity(k,CT);return c==='IDR'||GA_CUR.table().rates[c]>0})));
 /* 2. prices are whole multiples of one unit and the lines add up, in every currency */
 const rows=await p.evaluate(()=>{const res=[];for(const [f,t] of [['SIN','JKT'],['NRT','JKT'],['ICN','JKT'],['AMS','JKT'],['HKG','JKT'],['BOM','JKT']]){const q={from:f,to:t,type:'one',d1:TD+30,d2:TD+30,a:2,c:1,i:0,cab:'Economy'},it=search(f,t,q.d1)[0],fam=fares(it)[0].fam.find(x=>x.n==='Economy Standard');const pr=priceFor(it,fam,q),cur=curOfQ(q,it),u=GA_CUR.unit(cur);res.push({f,code:cur.code,sum:pr.fare+pr.tax+pr.chg===pr.total,mult:[pr.fare,pr.tax,pr.chg,pr.total].every(v=>Math.round(v/u*1e6)/1e6===Math.round(v/u))})}return res});
 for(const r of rows){assert(r.sum,r.f+' lines add up');assert(r.mult,r.f+' whole units of '+r.code)}
 assert.deepEqual(rows.map(r=>r.code),['SGD','JPY','KRW','EUR','HKD','INR']);
 /* the cabin tabs and the date calendar use the origin currency too, rupiah origins keep millions */
 const tabs=await p.evaluate(()=>{const out={};for(const [from,to] of [['SYD','JKT'],['JKT','DPS']]){S.q.from=from;S.q.to=to;S.q.type='ret';S.q.d1=TD+30;S.q.d2=TD+40;S.q.a=1;S.q.c=0;S.q.i=0;S.sel=[];S.step=0;go('results');const b=document.querySelector('[data-expand]');if(b)b.click();out[from]=[...document.querySelectorAll('[data-result-cabin]')].map(e=>e.innerText.split('\n').join(' '))}return out});
 assert(tabs.SYD.length>=2&&tabs.SYD.every(t=>/AUD [\d,]+ total/.test(t)),'cabin tabs in AUD: '+tabs.SYD);assert(tabs.JKT.every(t=>/[\d.]+M total/.test(t)&&!/AUD/.test(t)),'rupiah tabs keep millions: '+tabs.JKT);
 assert.equal(await p.evaluate(()=>{S.q.from='SYD';go('search');return [moneyShort(1688*10500,true),moneyShort(5000000,true),moneyShort(120*1000*10500,true)].join('|')}),'1,688|477|120k','calendar prices in AUD');
 /* 3. a Singapore booking: shown, sold and stored in SGD, rate locked at purchase */
 const make=(from,to)=>p.evaluate(({from,to})=>{const q={from,to,type:'one',d1:TD+30,d2:TD+30,a:1,c:0,i:0,cab:'Economy'},it=search(from,to,q.d1)[0],fam=fares(it)[0].fam.find(x=>x.n==='Economy Standard');const b=mkBooking(q,[it],[{cab:'Economy',fam}],['Rina Wijaya']);b.passengers=[{type:'a',name:'Rina Wijaya'}];b.paymentMethod='Credit card';b.confirmedAt=nowAbs();allocateBookingSeats(b);saveOnlineBooking(b);S.bookings.unshift(b);S.bk=0;return {ref:b.ref,total:b.total,cur:b.cur}},{from,to});
 const sg=await make('SIN','JKT');assert.equal(sg.cur.code,'SGD');assert.equal(sg.cur.rate,12000);assert.equal(sg.total%12000,0);const sgdTotal=sg.total/12000;
 await p.evaluate(()=>{go('trip');tripTab.tab='details';renderTrip()});
 assert.match(await p.locator('#v-trip').textContent(),new RegExp('SGD '+sgdTotal.toLocaleString('en-US')));assert.doesNotMatch(await p.locator('#v-trip').textContent(),/IDR [\d,]{5,}/);
 /* an Indonesian origin is still rupiah */
 const dm=await make('JKT','DPS');assert.equal(dm.cur.code,'IDR');await p.evaluate(()=>{go('trip');tripTab.tab='details';renderTrip()});assert.match(await p.locator('#v-trip').textContent(),/IDR [\d,]+/);
 /* 4. seats and bags bill in the booking currency, as whole local steps */
 await p.evaluate(ref=>{S.bk=S.bookings.findIndex(b=>b.ref===ref);go('trip');tripTab.tab='manage';renderTrip()},sg.ref);
 await p.click('[data-trip-service="seat"]');await p.waitForSelector('.seat-fees');assert.match(await p.locator('.seat-fees').innerText(),/SGD \d/);assert.doesNotMatch(await p.locator('.seat-fees').innerText(),/IDR/);
 const fees=await p.evaluate(()=>{const b=BK(),t=seatFeeTable(flat(b)[0],b.cur);return t});for(const v of Object.values(fees))assert.equal(v%12000,0,'seat fee is whole SGD');
 await p.evaluate(()=>closeSheet());
 await p.click('[data-trip-service="bag"]');await p.click('[data-bag-open]');await p.waitForSelector('.bag-list');assert.match(await p.locator('.bag-list').innerText(),/SGD \d/);assert.doesNotMatch(await p.locator('.bag-list').innerText(),/IDR/);await p.click('[data-bag-plus="20"]');await p.click('[data-bag-continue]');await p.click('[data-bag-pay]');
 await p.waitForFunction(()=>!document.querySelector('.bag-list'));
 const extra=await p.evaluate(()=>BK().extras.at(-1));assert.equal(extra.type,'bag');assert.equal(extra.amount%12000,0);
 /* 5. fare-rule text is converted, not left in rupiah */
 await p.evaluate(()=>{tripTab.tab='manage';renderTrip()});assert.doesNotMatch(await p.locator('#v-trip').textContent(),/IDR [\d,]+ fee/);
 /* 6. the agent counter finds it and speaks SGD */
 const term=await p.evaluate(async ref=>{const f=document.createElement('iframe');f.src='agent.html';f.style.cssText='position:fixed;left:-9999px;width:1px;height:1px';document.body.appendChild(f);for(let i=0;i<200&&!(f.contentWindow?.GA_TERM&&f.contentWindow?.GA_AGENT?.ctx);i++)await new Promise(r=>setTimeout(r,100));const w=f.contentWindow;w.GA_TERM.run('RT'+ref);w.GA_TERM.run('FXX');const lines=w.GA_TERM.lines().join('\n');return {lines}},sg.ref);
 assert.match(term.lines,/TOTAL SGD\s+[\d,]+/);assert.doesNotMatch(term.lines,/TOTAL IDR/);assert.match(term.lines,/SVC EXTRA BAG 1X20KG/);
 /* 7. a rate change reaches new sales only: the booking keeps its rate until it is changed */
 await p.evaluate(()=>GA_STORE.set('ga-fx',{asOf:'2026-11-20',rates:{SGD:13000}}));
 const later=await make('SIN','JKT');assert.equal(later.cur.rate,13000);assert.equal(later.total%13000,0);
 assert.equal(await p.evaluate(ref=>S.bookings.find(b=>b.ref===ref).cur.rate,sg.ref),12000,'existing booking keeps its locked rate');
 assert.match(await (async()=>{await p.evaluate(ref=>{S.bk=S.bookings.findIndex(b=>b.ref===ref);go('trip');tripTab.tab='details';renderTrip()},sg.ref);return p.locator('#v-trip').textContent()})(),new RegExp('SGD '+sgdTotal.toLocaleString('en-US')),'its price in SGD does not move');
 /* 8. a change is priced at today's rate: the booking is re-expressed, what was paid in SGD is unchanged */
 const before=await p.evaluate(ref=>{const b=S.bookings.find(x=>x.ref===ref);return {total:b.total,paid:b.paid}},sg.ref);
 await p.evaluate(ref=>{S.bk=S.bookings.findIndex(b=>b.ref===ref);go('trip');tripTab.tab='manage';renderTrip()},sg.ref);
 await p.click('[data-self-open="change"]');await p.waitForSelector('[data-self-pick]',{state:'attached',timeout:30000});
 await p.evaluate(()=>document.querySelectorAll('#sheet details').forEach(d=>d.open=true));await p.locator('[data-self-pick]').last().click();await p.waitForSelector('[data-self-change-confirm]');
 const quoteText=await p.locator('#sheet').innerText();assert.match(quoteText,/SGD/);assert.doesNotMatch(quoteText,/IDR [\d,]{5,}/);
 const after=await p.evaluate(ref=>{const b=GA_STORE.get('ga-agent-bookings',[]).find(x=>x.ref===ref)||S.bookings.find(x=>x.ref===ref);return b?{rate:b.cur.rate,total:b.total,paid:b.paid}:null},sg.ref);
 await p.click('[data-self-change-confirm]');await p.waitForFunction(ref=>GA_STORE.get('ga-agent-bookings',[]).find(b=>b.ref===ref)?.reissues?.length,sg.ref);
 const done=await p.evaluate(ref=>{const b=GA_STORE.get('ga-agent-bookings',[]).find(x=>x.ref===ref);return {rate:b.cur.rate,asOf:b.cur.asOf,total:b.total,paid:b.paid,paidMult:b.paid%13000,totalMult:b.total%13000,reissue:b.reissues.at(-1)}},sg.ref);
 assert.equal(done.rate,13000);assert.equal(done.asOf,'2026-11-20');assert.equal(done.totalMult,0);assert.equal(done.paidMult,0);assert.equal(done.reissue.collected%13000,0,'collected is whole SGD at the new rate');
 assert(done.paid/13000>=before.paid/12000,'paid in SGD never goes down: '+done.paid/13000+' vs '+before.paid/12000);
 /* 9. refunds come back in the booking currency */
 await p.evaluate(ref=>{S.bk=S.bookings.findIndex(b=>b.ref===ref);go('trip');tripTab.tab='manage';renderTrip()},sg.ref);
 await p.waitForTimeout(300);await p.evaluate(()=>{syncCounterBookings();renderTrip()});
 await p.click('[data-self-open="cancel"]');await p.waitForSelector('[data-self-cancel-confirm]');assert.match(await p.locator('#sheet').innerText(),/SGD/);assert.doesNotMatch(await p.locator('#sheet').innerText(),/IDR [\d,]{5,}/);
 assert.deepEqual(errors,[]);console.log('PASS: origin currency for every city, whole-unit pricing, locked rate, SGD seats/bags/rules, agent terminal, reissue at today’s rate, refund currency');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
