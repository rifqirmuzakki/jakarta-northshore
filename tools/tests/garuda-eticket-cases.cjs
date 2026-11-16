/* E-ticket receipt: the four cases (sale, award, reissue, cancelled), the fare split, and the phone layout. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const ext=path.extname(f),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};r.fulfill({body:fs.readFileSync(f),contentType:types[ext]||'application/octet-stream'})});
 await p.goto('https://garuda.test/garuda/');await p.waitForFunction(()=>typeof renderETicket==='function');
 const mk=(extra)=>p.evaluate(extra=>{const q={from:'JKT',to:'DPS',type:'ret',d1:TD+14,d2:TD+19,a:2,c:0,i:0,cab:'Economy'},o=search('JKT','DPS',q.d1)[0],r=search('DPS','JKT',q.d2)[0],aw=extra==='award';
  const fam=it=>aw?Object.assign({},awardFam('Economy','Saver'),{sub:'X'}):Object.assign({},fares(it)[0].fam[2],{sub:'M'});
  const bk=mkBooking(q,[o,r],[o,r].map(it=>({cab:'Economy',fam:fam(it)})),['Rina Wijaya','Budi Wijaya']);
  bk.passengers=[{type:'a',title:'MRS',first:'Rina',last:'Wijaya'},{type:'a',title:'MR',first:'Budi',last:'Wijaya'}];bk.paymentMethod='Cash';bk.place='Counter JKT-03';bk.issuedMs=Date.now();bk.confirmedAt=nowAbs();bk.paid0=bk.paid=bk.total;bk.payment={method:'Cash',tendered:Math.ceil(bk.total/1e5)*1e5+500000,change:Math.ceil(bk.total/1e5)*1e5+500000-bk.total,approval:''};
  bk.extras=[{k:'ssr',code:'FQTV',text:'GA123456789',p:0,d:null,l:null}];
  if(aw){bk.award={memberId:'GA123456789',member:'RINA WIJAYA',dirs:[{k:'X',level:'Saver',miles:12000},{k:'X',level:'Saver',miles:12000}],miles:24000,cash:bk.total,issued:true,ledger:[{t:'REDEEMED',miles:24000}]};bk.paymentMethod='QRIS';bk.payment={method:'QRIS',tendered:bk.total,change:0,approval:'482913'}}
  S.bookings=[bk];S.bk=0;window.__bk=bk;return {ref:bk.ref,total:bk.total,fare:bk.fare,tax:bk.tax,chg:bk.chg,o:o.legs[0].id,r:r.legs[0].id}},extra);
 const show=async()=>{await p.evaluate(()=>{S.stack=['home'];go('eticket',false);renderETicket()});await p.waitForSelector('#v-eticket.on');return p.locator('#etk-sheet').innerText()};
 const num=s=>+String(s).replace(/[^\d]/g,'');
 /* ---------- 1 sale ---------- */
 const s1=await mk();let t=await show();
 assert(/Dear Mrs Wijaya,/.test(t)&&/Thank you for choosing Garuda Indonesia/.test(t),'greeting');
 assert(/e-Ticket Receipt & Itinerary/i.test(t)&&/Scan the barcode/.test(t));assert.equal(await p.locator('.etk-pdf').count(),1);assert.equal(await p.locator('.etk-hd img').count(),1);
 assert(/WIJAYA\/RINA MRS/.test(t)&&/WIJAYA\/BUDI MR/.test(t));assert.equal((t.match(/126-\d{10}/g)||[]).length,2);
 assert.equal(await p.locator('.etk-flt').count(),2);assert(/ECONOMY \(M\)/.test(t)&&/Not before \d\dDEC26/.test(t)&&/CHECK-IN OPENS/i.test(t)&&/COUPON VALIDITY/i.test(t));
 assert(/CHNG FEE IDR250000 PER PAX/.test(t)&&/REFUND FEE IDR750000 PER PAX/.test(t));assert(/JKT GA DPS [\d.]+ GA JKT [\d.]+ IDR[\d.]+END ROE1\.000000/.test(t),'fare calculation');
 assert(/received [\d,]+/.test(t)&&/change [\d,]+/.test(t)&&/charged IDR/.test(t));assert(/RCT-JKT03-\d{6}/.test(t));assert(/GA123456789/.test(t));
 assert(/CONDITIONS OF CONTRACT/.test(t)&&/SIMULATED – NOT VALID FOR TRAVEL/.test(t));
 /* the fare split adds up to what was charged: every ticket row, and the total row */
 const tot=await p.evaluate(()=>{const tb=[...document.querySelectorAll('.etk-tb')].find(t=>/taxes/i.test(t.innerText)),rows=[...tb.querySelectorAll('tbody tr')];return {rows:rows.slice(0,-1).map(r=>r.lastElementChild.innerText),total:rows.at(-1).lastElementChild.innerText,fares:rows.slice(0,-1).map(r=>r.children[1].innerText),ppn:rows.slice(0,-1).map(r=>r.children[2].innerText)}});
 assert.equal(tot.rows.reduce((a,x)=>a+num(x),0),s1.total);assert.equal(num(tot.total),s1.total);assert.equal(tot.fares.reduce((a,x)=>a+num(x),0),s1.fare);
 /* ---------- 2 award ---------- */
 const s2=await mk('award');t=await show();
 assert(/AWARD TICKET|award ticket/i.test(t)&&/Dear Mrs Wijaya,/.test(t)&&/no fare or PPN on an award/i.test(t));assert(/GarudaMiles/i.test(t)&&/24,000/.test(t)&&/GA123456789/.test(t));
 assert(/AWARD 12,000 MILES/.test(t)&&/ECONOMY AWARD SAVER \(X\)/.test(t));assert(/MILES GA123456789 \+ QRIS/.test(t)&&/approval 482913/.test(t));assert(/AWARD TICKET · CHNG FEE 10 PCT OF MILES · CANCEL MILES RETURNED LESS 25 PCT/.test(t));assert(/MILES END/.test(t));
 assert(!/PPN 11 PCT/.test(t));
 /* ---------- 3 reissue ---------- */
 await mk();await p.evaluate(()=>{const bk=window.__bk,old=bk.dirs[0].legs[0],alt=search('JKT','DPS',TD+15)[0];bk.reissues=[{at:Date.now(),collected:500000,fee:500000,diff:0,method:'QRIS',old:{di:0,cls:'M',fam:bk.fams[0],legs:[{id:old.id,from:old.from,to:old.to,dep:old.dep,arr:old.arr,ac:old.ac,term:old.term}]},prev:['126-1111111111','126-2222222222'],note:'GA XX TO GA YY M'}];bk.tv=1;bk.paid=bk.paid0+500000;
  bk.dirs[0].legs=alt.legs.map(l=>Object.assign({},l,{status:'ok',delay:0,row:20,col:1}));});
 t=await show();
 assert(/Your flight was changed on/.test(t)&&/Dear Mrs Wijaya,/.test(t));assert(/EXCHANGED/.test(t)&&/126-1111111111/.test(t)&&/126-2222222222/.test(t)&&/Issued in exchange for/i.test(t));
 assert.equal(await p.locator('.etk-flt').count(),3);assert.equal(await p.locator('.etk-flt.off').count(),1);assert.equal(await p.locator('.etk-flt.hi').count(),1);
 assert(/Change fee/.test(t)&&/Collected · form of payment QRIS/.test(t)&&/Payments on this booking/i.test(t)&&/Total paid/.test(t)&&/Original sale/.test(t)&&/ORIGINAL TICKETS EXCHANGED AND NOT VALID/.test(t));
 assert(/ticket version 2/.test(t));
 /* ---------- 4 cancelled ---------- */
 const s4=await mk();await p.evaluate(()=>{const bk=window.__bk;bk.cancelled={at:Date.now(),refund:Math.round(bk.total*0.7),rows:bk.dirs.map((d,i)=>({dir:'x',fam:bk.fams[i],rule:'IDR 750,000 fee',paid:Math.round(bk.total/2),fee:750000,refund:Math.round(bk.total/2)-750000})),held:false,expired:false,milesBack:null};for(const d of bk.dirs)for(const l of d.legs)l.status='cancel'});
 t=await show();
 assert(/VOID · CANCELLED AND REFUNDED/.test(t)&&/CANCELLED/.test(t)&&/REFUNDED/.test(t));assert(/We are sorry you will not be travelling with us this time/.test(t));assert(/Less cancellation fee/.test(t)&&/Refunded · form of payment CASH/.test(t));
 assert.equal(await p.locator('.etk-stamp').count(),1);assert.equal(await p.locator('.etk-flt.off').count(),2);
 /* a booking cancelled before it was ticketed has nothing to print */
 await p.evaluate(()=>{window.__bk.cancelled.held=true});assert.equal(await p.evaluate(()=>etkAvailable(window.__bk)),false);
 /* ---------- phone layout: nothing wider than the screen, readable text ---------- */
 await mk();t=await show();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390,'page is not wider than the phone');
 assert(await p.evaluate(()=>{const s=document.getElementById('etk-sheet').getBoundingClientRect();return s.width<=390&&s.left>=0}),'sheet fits');
 assert(await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.etk-flt .tm')).fontSize)>=20&&parseFloat(getComputedStyle(document.querySelector('.etk-flt .st')).fontSize)>=10),'times are large and the text is at least 10px');
 assert(await p.evaluate(()=>[...document.querySelectorAll('.etk-sc')].every(e=>e.scrollWidth<=e.clientWidth||getComputedStyle(e).overflowX==='auto')),'wide tables scroll inside their box');
 await p.screenshot({path:'/tmp/claude-0/-home-user-jakarta-northshore/279a4f08-af43-5e69-85ca-f4bc4221be39/scratchpad/etk-phone.png'});
 assert.deepEqual(errors,[]);console.log('PASS: e-ticket receipt: sale, award, reissue, cancelled, fare split adds up, phone layout');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
