/* Sales counter: search by quick entry, choose fares, passengers, payment, issue, print, look up, cancel and refund, shift totals. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const ext=path.extname(f),t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});
 assert.equal(await p.locator('#nb').innerText(),'');await p.click('[data-tab="sell"]');
 /* quick entry, return trip, 2 adults + 1 child + 1 infant */
 await p.fill('#cmd',`jkt sin ${ddmon(21)} ${ddmon(28)} 2A1C1I`);await p.press('#cmd','Enter');
 assert.equal(await p.inputValue('#f-from'),'JKT');assert.equal(await p.inputValue('#f-to'),'SIN');assert.equal(await p.inputValue('#f-a'),'2');assert.equal(await p.inputValue('#f-c'),'1');assert.equal(await p.inputValue('#f-i'),'1');
 assert.equal(await p.locator('#work .pane').count(),2);assert((await p.locator('#work tbody tr').count())>=2);
 assert.equal(await p.locator('[data-act="to-pax"]').isDisabled(),true);
 /* pick the first available economy Value fare in each direction */
 for(const d of [0,1])await p.locator(`[data-pick^="${d}:"][data-pick$=":1"]:not([disabled])`).first().click();
 assert.equal(await p.locator('[data-act="to-pax"]').isDisabled(),false);
 const quote=await p.locator('#quote').innerText();assert(/Fare/.test(quote)&&/PPN/.test(quote)&&/Airport charges/.test(quote)&&/Round trip/.test(quote));
 const total=await p.evaluate(()=>{const s=GA_AGENT.state();return null});
 /* passengers: errors first */
 await p.click('[data-act="to-pax"]');assert.equal(await p.locator('#work .px').count(),5);
 await p.click('[data-act="to-pay"]');assert((await p.locator('#work .msg').count())>=6);assert.equal(await p.locator('#work h2').first().innerText().then(t=>t.startsWith('Passengers')),true);
 const names=[['Rina','Wijaya','1985-04-12'],['Budi','Wijaya','1983-09-30'],['Sari','Wijaya','2018-06-01'],['Bayu','Wijaya','2025-08-20']];
 const titles=['MRS','MR','MISS',''];for(let i=0;i<3;i++)await p.selectOption(`#p${i}t`,titles[i]);
 for(let i=0;i<4;i++){await p.fill(`#p${i}f`,names[i][0]);await p.fill(`#p${i}l`,names[i][1]);await p.fill(`#p${i}d`,names[i][2])}
 await p.fill('#c-phone','+62 812 0000 111');
 await p.click('[data-act="to-pay"]');assert(await p.locator('#work [data-pm]').count()===5);
 /* cash: issue stays disabled until enough is tendered */
 assert.equal(await p.locator('[data-act="issue"]').isDisabled(),true);
 await p.click('[data-round]');assert.equal(await p.locator('[data-act="issue"]').isDisabled(),false);assert(/Change to give/.test(await p.locator('#chg').innerText()));
 const soldBefore=await p.evaluate(()=>localStorage.getItem('ga-sold'));
 await p.click('[data-act="issue"]');
 const ref=await p.locator('.done .ref').innerText();assert(/^GA[0-9A-Z]{4}$/.test(ref));assert.equal((await p.locator('.done .tk div').allInnerTexts()).filter(x=>/126-\d{10}/.test(x)).length,4);
 assert.notEqual(await p.evaluate(()=>localStorage.getItem('ga-sold')),soldBefore);assert.equal(await p.locator('#nb').innerText(),'1');
 /* print: the e-ticket opens in the engine frame with the counter as place of issue */
 await p.evaluate(()=>{window.__pr=0;document.getElementById('eng').contentWindow.print=()=>{window.__pr++}});
 await p.click('[data-print]');await p.waitForFunction(()=>window.__pr===1,null,{timeout:5000});
 const etk=await p.frameLocator('#eng').locator('#etk-sheet').innerText();assert(etk.includes(ref));assert(etk.includes('Counter JKT-03'));assert(etk.includes('MRS RINA WIJAYA')&&etk.includes('MISS SARI WIJAYA'));assert.equal((etk.match(/126-\d{10}/g)||[]).length,4);assert(etk.includes('WIJAYA'));
 /* bookings tab, persists across reload */
 await p.reload();await p.waitForSelector('#app:not([hidden])',{timeout:20000});assert.equal(await p.locator('#nb').innerText(),'1');
 await p.click('[data-tab="books"]');assert.equal(await p.locator('tr.row').count(),1);await p.fill('#bq','zzz');assert.equal(await p.locator('tr.row').count(),0);await p.fill('#bq',ref.toLowerCase());assert.equal(await p.locator('tr.row').count(),1);
 await p.click('tr.row');assert(/Ticketed/.test(await p.locator('#t-books').innerText()));
 /* cancel and refund moves the seats back */
 const sold1=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-sold')));
 await p.click('[data-cx]');const rf=await p.locator('#t-books .chg').innerText();assert(/IDR/.test(rf));assert((await p.locator('#t-books tbody tr').count())>=2);
 const refund=await p.evaluate(()=>{const b=GA_AGENT.bookings()[0];return GA_AGENT.refund(b).total});assert(refund>0&&refund<=await p.evaluate(()=>GA_AGENT.bookings()[0].total));
 await p.click('[data-cxgo]');assert(/Cancelled/.test(await p.locator('#t-books').innerText()));
 const sold2=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-sold')));assert(Object.keys(sold1).some(k=>(sold2[k]||0)<sold1[k]));
 /* shift totals: sale, refund, expected drawer, close */
 await p.click('[data-tab="shift"]');const sh=await p.locator('#t-shift .stat').innerText();assert(/Bookings issued\s*1/.test(sh.replace(/\n/g,' ')));
 await p.fill('[data-sf="counted"]','500000');assert(/Difference/.test(await p.locator('#vr').innerText()));
 const diffText=await p.locator('#vr b').innerText();assert(/^[+-]?[\d,]+$/.test(diffText));
 await p.click('[data-act="close-shift"]');assert(/Closed shifts/.test(await p.locator('#t-shift').innerText()));
 assert.deepEqual(errors,[]);console.log('PASS: sales counter: quick entry, fares, passengers, cash payment, issue, print, lookup, refund, shift');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
