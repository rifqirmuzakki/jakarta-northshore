/* Extra bags: zone pricing, weight tiers, limits, pay step, persistence and layouts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'}[path.extname(f)]||'application/octet-stream';return r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 /* zones */
 const z=await p.evaluate(()=>{const L=(f,t)=>({from:f,to:t});return {dps:bagZone(L('JKT','DPS')),sin:bagZone(L('JKT','SIN')),nrt:bagZone(L('JKT','NRT')),ams:bagZone(L('JKT','AMS')),p20:[1,2,3,4].map(zn=>BAG_PRICE_20[zn]),dom15:bagPrice(L('JKT','DPS'),15),dom30:bagPrice(L('JKT','DPS'),30),air:bagAirportPrice(L('JKT','DPS'),20)}});
 assert.deepEqual([z.dps,z.sin,z.nrt,z.ams],[1,2,3,4]);assert(z.p20.every((v,i,a)=>!i||v>a[i-1]));
 assert.equal(z.dom15,190000);assert.equal(z.dom30,375000);assert.equal(z.air,350000);
 for(const v of [z.dom15,z.dom30,z.air])assert.equal(v%5000,0);
 const make=(to,names)=>p.evaluate(({to,names})=>{const q={from:'JKT',to,type:'one',d1:TD+30,d2:TD+30,a:names.length,c:0,i:0,cab:'Economy'},it=search('JKT',to,q.d1)[0],f=fares(it)[0].fam[0];const b=mkBooking(q,[it],[{cab:'Economy',fam:f}],names);b.passengers=names.map(name=>({type:'a',name}));b.paymentMethod='Credit card';b.confirmedAt=nowAbs();allocateBookingSeats(b);saveOnlineBooking(b);S.bookings.unshift(b);S.bk=0;return b.ref},{to,names});
 const open=async()=>{await p.evaluate(()=>{go('trip');tripTab.tab='manage';renderTrip()});await p.click('[data-trip-service="bag"]');await p.click('[data-bag-open]');await p.waitForSelector('.bag-list')};
 await make('DPS',['Rina Wijaya','Adi Wijaya']);await open();
 assert.match(await p.locator('.bag-zone').innerText(),/Zone 1 · Domestic/);
 assert.equal(await p.locator('.ss-footer .btn').isDisabled(),true,'nothing to pay yet');
 /* limit of three extra bags */
 for(let n=0;n<3;n++)await p.click('[data-bag-plus="20"]');assert.equal(await p.locator('[data-bag-plus="15"]').isDisabled(),true);
 await p.click('[data-bag-minus="20"]');await p.click('[data-bag-plus="30"]');
 assert.match(await p.locator('.seat-footer-total').innerText(),/3 extra bags[\s\S]*IDR 875,000/);
 await p.click('[data-bag-continue]');await p.waitForSelector('[data-bag-pay]');assert.match(await p.locator('#sheet').innerText(),/2 × 20 kg[\s\S]*1 × 30 kg[\s\S]*IDR 875,000/);
 await p.click('[data-bag-back]');await p.click('[data-bag-minus="30"]');await p.click('[data-bag-continue]');await p.click('[data-bag-pay]');
 await p.waitForFunction(()=>!document.querySelector('.bag-list'));
 const r=await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return {bags:l.extraBags,extras:b.extras}});
 assert.equal(r.bags[0].length,2);assert.equal(r.extras.length,1);assert.equal(r.extras[0].amount,500000);assert.equal(r.extras[0].type,'bag');
 /* per traveller: the second traveller starts from zero, the first has one slot left */
 await p.click('[data-trip-service="bag"]');assert.match(await p.locator('#sheet').innerText(),/Extra bags\s*2 × 20 kg/);await p.click('[data-bag-open]');
 await p.click('[data-bag-plus="15"]');await p.click('[data-bag-plus="15"]').catch(()=>{});assert.equal(await p.evaluate(()=>bagDraftCount(searchOverlay)),1,'one slot left after two bags');
 await p.selectOption('#bag-person','1');assert.equal(await p.evaluate(()=>bagDraftCount(searchOverlay)),0,'draft resets when the traveller changes');
 /* reload keeps them; a closed flight refuses */
 await p.reload();await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 assert.equal(await p.evaluate(()=>flat(BK())[0].extraBags[0].length),2);
 assert.equal(await p.evaluate(()=>{const b=BK(),l={...flat(b)[0],status:'cancel'};return bagSaleOpen(b,l,0)}),false);
 /* an international flight uses its own zone */
 await make('AMS',['Rina Wijaya']);await open();assert.match(await p.locator('.bag-zone').innerText(),/Zone 4 · Europe & Americas/);await p.click('[data-bag-plus="20"]');assert.match(await p.locator('.seat-footer-total').innerText(),/IDR 900,000/);
 for(const w of [320,390,768,1280]){await p.setViewportSize({width:w,height:800});assert.equal(await p.evaluate(()=>document.querySelector('#sheet').scrollWidth>document.querySelector('#sheet').clientWidth+1),false,'overflow at '+w);assert(await p.locator('.bag-stepper').first().isVisible())}
 assert.deepEqual(errors,[]);console.log('PASS: zone pricing, weight tiers, bag limit, pay step, per-traveller state, persistence and 320–1280px layouts');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
