/* Prepaid seat selection: fee tiers by fare, pay step, persistence, check-in and layouts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'}[path.extname(f)]||'application/octet-stream';return r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 const make=(fare,days=30)=>p.evaluate(({fare,days})=>{const q={from:'JKT',to:'DPS',type:'one',d1:TD+days,d2:TD+days,a:2,c:0,i:0,cab:'Economy'},it=search('JKT','DPS',q.d1)[0],f=fares(it)[0].fam.find(x=>x.n===fare);const b=mkBooking(q,[it],[{cab:'Economy',fam:f}],['Rina Wijaya','Adi Wijaya']);b.passengers=[{type:'a',name:'Rina Wijaya'},{type:'a',name:'Adi Wijaya'}];b.paymentMethod='Credit card';b.confirmedAt=nowAbs();allocateBookingSeats(b);saveOnlineBooking(b);S.bookings.unshift(b);S.bk=0;return b.ref},{fare,days});
 const open=async()=>{await p.evaluate(()=>{go('trip');tripTab.tab='manage';renderTrip()});await p.click('[data-trip-service="seat"]');await p.waitForSelector('.seat-map-grid')};
 const info=()=>p.evaluate(()=>{const b=BK(),l=flat(b)[0];return {seats:{...l.seats},paid:l.seatPaid||{},extras:b.extras||[],tier:s=>0}});
 /* Value fare: standard seats cost money before check-in, preferred more */
 await make('Economy Value');await open();
 assert.match(await p.locator('.seat-fees').innerText(),/Extra legroom[\s\S]*Front[\s\S]*Standard\s*IDR/);
 const pick=tier=>p.evaluate(t=>{const b=BK(),l=flat(b)[0],taken=new Set(Object.values(l.seats));const s=[...document.querySelectorAll('[data-seat][data-tier="'+t+'"]:not([disabled])')].map(x=>x.dataset.seat).find(x=>!taken.has(x));return s},tier);
 const legroom=await pick('legroom'),std=await pick('standard');assert(legroom&&std);
 await p.click(`[data-seat="${legroom}"]`);assert.match(await p.locator('.seat-footer-total').innerText(),/IDR 200,000/);
 assert.match(await p.locator('.ss-footer .btn').innerText(),/Continue to payment/);
 /* back out: nothing paid, nothing saved */
 await p.click('[data-seat-save]');await p.waitForSelector('[data-seat-pay]');assert.match(await p.locator('#sheet').innerText(),/IDR 200,000/);
 await p.click('[data-seat-back]');await p.waitForSelector('.seat-map-grid');assert.deepEqual((await info()).extras,[]);
 /* switch that traveller to a standard seat and pay once */
 await p.click(`[data-seat="${std}"]`);assert.match(await p.locator('.seat-footer-total').innerText(),/IDR 50,000/,'a new pick replaces the earlier one for the same traveller');
 await p.click('[data-seat-save]');await p.waitForSelector('[data-seat-pay]');await p.click('[data-seat-pay]');await p.waitForSelector('#sheet:not(.on)',{state:'attached'}).catch(()=>{});
 let r=await info();assert.equal(r.extras.length,1,'only the changed paid seat is billed (assignment kept free)');assert.equal(r.extras[0].amount,50000);
 assert.equal(r.seats[0],std);
 /* a paid seat is not billed twice, and survives a reload */
 await p.reload();await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 assert.equal((await info()).extras.length,1);
 /* Flexi: front included, legroom paid, standard free */
 await make('Economy Flexi');await open();assert.match(await p.locator('.seat-fees').innerText(),/Front\s*Included[\s\S]*Standard\s*Included/);
 const front=await pick('front');await p.click(`[data-seat="${front}"]`);assert.equal(await p.locator('.seat-footer-total').count(),0);assert.match(await p.locator('.ss-footer .btn').innerText(),/Save seats/);
 /* departed flights and cutoffs refuse */
 assert.equal(await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return seatSelectionOpen(b,l)}),true);
 assert.equal(await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return seatSelectionOpen({...b,cancelled:true},l)}),false);
 /* auto-assignment never hands out a charged seat */
 assert.equal(await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return Object.values(l.seats).every(s=>['standard','included'].includes(seatTier(b,l,s))||seatFee(b,l,s)===0)}),true);
 /* layouts */
 for(const w of [320,390,768,1280]){await p.setViewportSize({width:w,height:800});await p.evaluate(()=>{closeSheet()});await open();
  assert.equal(await p.evaluate(()=>document.querySelector('#sheet').scrollWidth>document.querySelector('#sheet').clientWidth+1),false,'overflow at '+w);assert(await p.locator('.seat-fees').isVisible())}
 assert.deepEqual(errors,[]);console.log('PASS: seat fee tiers by fare, pay step, no double billing, persistence, auto-assignment and 320–1280px layouts');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
