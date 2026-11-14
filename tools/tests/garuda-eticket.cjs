/* E-ticket: issued for every confirmed booking, reachable from confirmation and trip, printable as one A4 page. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const ext=path.extname(f),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};r.fulfill({body:fs.readFileSync(f),contentType:types[ext]||'application/octet-stream'})});
 await p.goto('https://garuda.test/garuda/');await p.waitForFunction(()=>typeof renderETicket==='function');
 const ref=await p.evaluate(()=>{const q={from:'JKT',to:'KIX',type:'ret',d1:TD+7,d2:TD+12,a:2,c:1,i:1,cab:'Economy'},o=search('JKT','KIX',q.d1)[0],r=search('KIX','JKT',q.d2)[0];const bk=mkBooking(q,[o,r],[o,r].map(it=>({cab:'Economy',fam:fares(it)[0].fam[1]})),['Rina Wijaya','Budi Wijaya','Dewi Wijaya','Arya Wijaya']);bk.passengers=[{type:'a'},{type:'a'},{type:'c'},{type:'i',lapAdult:'Rina Wijaya'}];bk.paymentMethod='Credit card';bk.contactEmail='rina@example.com';bk.confirmedAt=nowAbs();S.bookings=[bk];S.bk=0;return bk.ref});
 await p.evaluate(()=>{S.stack=['home'];go('done',false)});assert.equal(await p.locator('#v-done [data-eticket]').count(),1);
 await p.evaluate(()=>{go('trip');tripTab.tab='manage';renderTrip()});assert.equal(await p.locator('#v-trip [data-eticket]').count(),1);
 await p.locator('#v-trip [data-eticket]').click();assert(await p.locator('#v-eticket.on').isVisible());
 const text=await p.locator('#etk-sheet').innerText();
 assert(text.includes(ref));assert.equal((text.match(/126-\d{10}/g)||[]).length,4);assert(text.includes('Jakarta International, Terminal'));assert(!/Soekarno/.test(text));assert(text.includes('(INFANT)'));assert(text.includes('FARE CONDITIONS')||text.includes('Fare conditions'));assert(text.includes('SIMULATED – NOT VALID FOR TRAVEL'));
 assert.equal(await p.locator('.etk-flt').count(),2);assert.equal(await p.locator('[data-etk-print]').count(),1);
 await p.emulateMedia({media:'print'});const pdf=await p.pdf({format:'A4',printBackground:true,margin:{top:0,right:0,bottom:0,left:0}});assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length,1);
 await p.emulateMedia({media:'screen'});
 await p.evaluate(()=>{S.bookings[0].dirs.flat?0:0;for(const d of S.bookings[0].dirs)for(const l of d.legs)l.status='cancel';renderETicket()});assert(await p.locator('#v-trips.on, #v-eticket.on').count()>=1);
 assert.deepEqual(errors,[]);console.log('PASS: e-ticket from confirmation and trip, ticket numbers, Jakarta International, simulated footer, one-page print');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
