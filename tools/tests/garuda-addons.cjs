/* Add-ons: meal pre-order, lounge, priority boarding, insurance; fares that include them; currency; persistence. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'}[path.extname(f)]||'application/octet-stream';return r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 const make=(from,to,cab,names)=>p.evaluate(({from,to,cab,names})=>{const q={from,to,type:'one',d1:TD+30,d2:TD+30,a:names.length,c:0,i:0,cab},it=search(from,to,q.d1).find(x=>fares(x).some(c=>c.k===cab&&c.left>=names.length)),fam=fares(it).find(c=>c.k===cab).fam.find(f=>cab!=='Economy'||f.n==='Economy Standard')||fares(it).find(c=>c.k===cab).fam[0];const b=mkBooking(q,[it],[{cab,fam}],names);b.passengers=names.map(name=>({type:'a',name}));b.paymentMethod='Credit card';b.confirmedAt=nowAbs();allocateBookingSeats(b);saveOnlineBooking(b);S.bookings.unshift(b);S.bk=0;return {ref:b.ref,cur:b.cur,total:b.total,minutes:flat(b)[0].arr-flat(b)[0].dep}},{from,to,cab,names});
 const open=async()=>{await p.evaluate(()=>{go('trip');tripTab.tab='manage';renderTrip()});await p.click('[data-addon-open]');await p.waitForSelector('.addon-h')};
 /* 1. Economy, short flight: snack boxes, paid items, one payment */
 const eco=await make('JKT','DPS','Economy',['Rina Wijaya','Adi Wijaya']);assert(eco.minutes<=180);
 await open();assert.match(await p.locator('.addon-h').first().innerText(),/Pre-order a snack box/);assert.equal(await p.locator('[data-addon-meal]:not(.addon-clear)').count(),3);
 const price=await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return {meal:addonPrice(b,l,'meal'),lounge:addonPrice(b,l,'lounge'),priority:addonPrice(b,l,'priority'),ins:addonInsurancePrice(b)}});
 assert.equal(price.meal,55000);assert.equal(price.lounge,300000);assert.equal(price.priority,90000);assert.equal(price.ins%5000,0);assert(price.ins>=Math.floor(eco.total*0.045)&&price.ins<eco.total*0.045+5000);
 assert.equal(await p.locator('.ss-footer .btn').isDisabled(),true,'nothing chosen yet');
 await p.click('[data-addon-meal="snack-sweet"]');await p.check('[data-addon-toggle="lounge"]');await p.check('[data-addon-toggle="priority"]');await p.check('[data-addon-toggle="insurance"]');
 const sum=price.meal+price.lounge+price.priority+price.ins;assert.match(await p.locator('.seat-footer-total').innerText(),new RegExp('4 items[\\s\\S]*IDR '+sum.toLocaleString('en-US')));
 await p.click('[data-addon-continue]');await p.waitForSelector('[data-addon-pay]');assert.match(await p.locator('#sheet').innerText(),/Total to pay[\s\S]*IDR/);
 await p.click('[data-addon-back]');await p.uncheck('[data-addon-toggle="priority"]');await p.click('[data-addon-continue]');await p.click('[data-addon-pay]');await p.waitForFunction(()=>!document.querySelector('#sheet.on'));
 let r=await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return {addons:l.addons,ins:b.insurance,extras:b.extras.filter(x=>x.k==='svc').map(x=>[x.type,x.amount,x.p])}});
 assert.deepEqual(r.addons[0],{meal:'snack-sweet',lounge:true});assert.equal(r.ins.amount,price.ins);assert.deepEqual(r.extras.map(x=>x[0]).sort(),['insurance','lounge','meal']);
 /* the booking details list them, and what was bought is not offered again */
 await p.evaluate(()=>{tripTab.tab='details';renderTrip()});assert.match(await p.locator('#v-trip').textContent(),/Pre-ordered meal[\s\S]*Lounge access[\s\S]*Travel insurance/);await p.evaluate(()=>{tripTab.tab='manage';renderTrip()});
 await p.click('[data-addon-open]');await p.waitForSelector('.addon-h');assert.match(await p.locator('.bag-have').first().innerText(),/Ordered: Sweet snack box/);assert.equal(await p.locator('[data-addon-toggle="lounge"]').isDisabled(),true);assert.equal(await p.locator('[data-addon-toggle="insurance"]').count(),0,'insurance is once per booking');
 /* the second traveller starts clean */
 await p.selectOption('#addon-person','1');assert.equal(await p.locator('[data-addon-toggle="lounge"]').isDisabled(),false);await p.evaluate(()=>closeSheet());
 /* persistence and the counter terminal */
 await p.reload();await p.waitForFunction(()=>typeof saveOnlineBooking==='function');assert.equal(await p.evaluate(()=>flat(BK())[0].addons[0].meal),'snack-sweet');
 const term=await p.evaluate(async ref=>{const f=document.createElement('iframe');f.src='agent.html';f.style.cssText='position:fixed;left:-9999px;width:1px;height:1px';document.body.appendChild(f);for(let i=0;i<200&&!(f.contentWindow?.GA_TERM&&f.contentWindow?.GA_AGENT?.ctx);i++)await new Promise(r=>setTimeout(r,100));const w=f.contentWindow;w.GA_TERM.run('RT'+ref);return w.GA_TERM.lines().join('\n')},eco.ref);
 assert.match(term,/SVC MEAL SNACK-SWEET GA\d+\/P1  PAID/);assert.match(term,/SVC LOUNGE ACCESS/);assert.match(term,/SVC TRAVEL INSURANCE/);assert.doesNotMatch(term,/SSR undefined/);
 /* 2. Business already includes the lounge, priority boarding and a meal: nothing to pay */
 await make('JKT','DPS','Business',['Rina Wijaya']);await open();
 assert.equal(await p.locator('.addon-row em',{hasText:'Included'}).count(),2);assert.match(await p.locator('.ss-footer .btn').innerText(),/Continue to payment/);
 await p.check('[data-addon-toggle="lounge"]');assert.match(await p.locator('.ss-footer .btn').innerText(),/Add included items/);assert.equal(await p.locator('.seat-footer-total').count(),0);
 await p.click('[data-addon-continue]');await p.waitForFunction(()=>!document.querySelector('#sheet.on'));assert.equal(await p.evaluate(()=>flat(BK())[0].addons[0].lounge),true);assert.equal(await p.evaluate(()=>BK().extras.find(x=>x.type==='lounge').amount),0);
 /* 3. a foreign-origin booking prices every add-on in its own currency, in whole units */
 const sg=await make('SIN','JKT','Economy',['Rina Wijaya']);await open();
 assert.match(await p.locator('#sheet').innerText(),/SGD \d/);assert.doesNotMatch(await p.locator('#sheet').innerText(),/IDR/);
 const sp=await p.evaluate(()=>{const b=BK(),l=flat(b)[0];return ['meal','lounge','priority'].map(k=>addonPrice(b,l,k)).concat(addonInsurancePrice(b))});for(const v of sp)assert.equal(v%12000,0,'whole SGD');
 /* 4. closed sales: cancelled flights and lap infants */
 assert.equal(await p.evaluate(()=>{const b=BK();return addonSaleOpen(b,{...flat(b)[0],status:'cancel'},0)}),false);
 for(const w of [320,390,768,1280]){await p.setViewportSize({width:w,height:800});assert.equal(await p.evaluate(()=>document.querySelector('#sheet').scrollWidth>document.querySelector('#sheet').clientWidth+1),false,'overflow at '+w);assert(await p.locator('.addon-row').first().isVisible())}
 assert.deepEqual(errors,[]);console.log('PASS: add-on menus, pricing, pay step, included fares, once-per-booking insurance, currency, persistence, terminal lines and 320–1280px layouts');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
