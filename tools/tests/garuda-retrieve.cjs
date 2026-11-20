/* Retrieve booking: reference + surname lookup, generic failures, lockout, persistence and layouts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'}[path.extname(f)]||'application/octet-stream';return r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 /* a counter booking for someone who is not the demo traveller, plus one unticketed hold */
 const seed=await p.evaluate(()=>{const q={from:'JKT',to:'DPS',type:'one',d1:TD+30,d2:TD+30,a:1,c:0,i:0,cab:'Economy'},it=search('JKT','DPS',q.d1)[0],fam=fares(it)[0].fam.find(f=>f.n==='Economy Standard');
  const mk=name=>{const b=mkBooking(q,[it],[{cab:'Economy',fam}],[name]);b.passengers=[{type:'a',name}];b.paymentMethod='Credit card';b.confirmedAt=nowAbs();return b};
  const a=mk('Budi Santoso');saveOnlineBooking(a);S.bookings.unshift(a);const h=mk('Dewi Lestari Putri');saveOnlineBooking(h);
  const all=GA_STORE.get('ga-agent-bookings',[]);const hold=all.find(x=>x.ref===h.ref);hold.held=true;hold.issuedMs=0;GA_STORE.set('ga-agent-bookings',all);
  S.bookings=S.bookings.filter(x=>x.ref!==a.ref&&x.ref!==h.ref);return {ref:a.ref,hold:h.ref}});
 await p.evaluate(()=>{syncCounterBookings();go('trips')});
 assert.equal(await p.evaluate(ref=>S.bookings.some(b=>b.ref===ref),seed.ref),false,'other customers are not in Trips before retrieval');
 await p.click('.trips-header [data-retrieve-open]');await p.waitForSelector('#retrieve-form');
 const open=()=>p.evaluate(()=>{if(!document.querySelector('#retrieve-form'))openRetrieve()});
 const attempt=async(ref,name)=>{await open();await p.fill('#retrieve-ref',ref);await p.fill('#retrieve-name',name);await p.click('#retrieve-go')};
 /* blanks, wrong surname, wrong ref, unticketed hold all give the same generic answer and never open a trip */
 await attempt('','');assert.match(await p.locator('#retrieve-error').innerText(),/Enter both/);
 await attempt(seed.ref,'Wijaya');const generic=await p.locator('#retrieve-error').innerText();assert.match(generic,/couldn’t find a booking/);
 await attempt('GAZZZZ','Santoso');assert.equal(await p.locator('#retrieve-error').innerText(),generic);
 await attempt(seed.hold,'Putri');assert.equal(await p.locator('#retrieve-error').innerText(),generic);
 await attempt(seed.ref,'S');assert.equal(await p.locator('#retrieve-error').innerText(),generic,'one letter is not a surname');
 assert.equal(await p.evaluate(()=>S.stack.at(-1)),'trips');
 /* a correct, differently-cased lookup opens the booking */
 await p.fill('#retrieve-ref','  '+seed.ref.toLowerCase()+' ');await p.fill('#retrieve-name','santoso');await p.click('#retrieve-go');
 await p.waitForSelector('#v-trip.on',);assert.match(await p.locator('#v-trip').innerText(),new RegExp(seed.ref));
 assert.equal(await p.evaluate(()=>BK().ref),seed.ref);
 /* it survives a reload and a counter sync, and is listed under Trips */
 await p.reload();await p.waitForFunction(()=>typeof saveOnlineBooking==='function');
 assert.equal(await p.evaluate(ref=>S.bookings.some(b=>b.ref===ref),seed.ref),true,'retrieved booking survives reload');
 await p.evaluate(()=>go('trips'));assert.match(await p.locator('#v-trips').innerText(),new RegExp(seed.ref));
 /* multi-word surname: match the final name only when 3+ letters */
 await p.evaluate(ref=>GA_STORE.remove('ga-retrieved-refs'),seed.ref);
 await p.evaluate(()=>{syncCounterBookings();go('trips')});
 assert.equal(await p.evaluate(ref=>S.bookings.some(b=>b.ref===ref),seed.ref),false,'clearing retrieved refs removes it again');
 /* lockout after five misses */
 await p.click('.trips-header [data-retrieve-open]');
 for(let i=0;i<5;i++)await attempt(seed.ref,'Nobody');
 assert.match(await p.locator('#retrieve-error').innerText(),/Too many/);assert.equal(await p.locator('#retrieve-go').isDisabled(),true);
 await p.evaluate(()=>closeSheet());
 /* layouts */
 for(const w of [320,390,768,1280]){await p.setViewportSize({width:w,height:800});await p.evaluate(()=>{retrieveState.lockedUntil=0;go('trips')});await p.click('.trips-header [data-retrieve-open]');await p.waitForSelector('#retrieve-form');
  const over=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||document.querySelector('#sheet').scrollWidth>document.querySelector('#sheet').clientWidth+1);assert.equal(over,false,'no horizontal overflow at '+w);
  assert(await p.locator('#retrieve-go').isVisible());await p.keyboard.press('Escape').catch(()=>{});await p.evaluate(()=>closeSheet())}
 assert.deepEqual(errors,[]);console.log('PASS: reference+surname lookup, generic failures, lockout, persistence and 320–1280px layouts');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
