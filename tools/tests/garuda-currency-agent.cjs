/* Sales counter selling a ticket that starts abroad: quote, cash tender and receipt in the origin currency. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});await p.click('[data-tab="sell"]');
 await p.fill('#cmd',`sin jkt ${ddmon(21)} 1A`);await p.press('#cmd','Enter');
 await p.locator('[data-pick^="0:"][data-pick$=":1"]:not([disabled])').first().click();
 const quote=await p.locator('#quote').innerText();assert.match(quote,/SGD [\d,]+/);assert.match(quote,/Charged in SGD · 1 SGD = IDR 12,000/);assert.doesNotMatch(quote.replace('1 SGD = IDR 12,000',''),/IDR [\d,]{4,}/);
 await p.click('[data-act="to-pax"]');await p.selectOption('#p0t','MR');await p.fill('#p0f','Budi');await p.fill('#p0l','Tan');await p.fill('#p0d','1985-04-12');await p.fill('#p0n','SG');await p.fill('#p0p','K1234567');await p.fill('#c-phone','+65 8123 4567');
 await p.click('[data-act="to-pay"]');
 const label=await p.locator('[data-act="issue"]').innerText();const due=+label.match(/SGD ([\d,]+)/)[1].replace(/,/g,'');assert(due>0);
 assert.match(await p.locator('#work').innerText(),/Cash received \(SGD\)/);
 assert.equal(await p.locator('[data-act="issue"]').isDisabled(),true);
 await p.fill('#tend',String(due-1));assert.equal(await p.locator('[data-act="issue"]').isDisabled(),true,'one dollar short is still short');assert.match(await p.locator('#chg').innerText(),/Still to collect[\s\S]*SGD 1\b/);
 await p.fill('#tend',String(due+20));assert.equal(await p.locator('[data-act="issue"]').isDisabled(),false);assert.match(await p.locator('#chg').innerText(),/Change to give[\s\S]*SGD 20/);
 await p.click('[data-act="issue"]');await p.waitForFunction(()=>GA_AGENT.bookings().length>0);
 const bk=await p.evaluate(()=>{const x=GA_AGENT.bookings()[0];return {cur:x.cur,total:x.total,paid:x.paid,payment:x.payment}});
 assert.equal(bk.cur.code,'SGD');assert.equal(bk.total%12000,0);assert.equal(bk.total/12000,due);assert.equal(bk.payment.tendered,(due+20)*12000);assert.equal(bk.payment.change,20*12000);
 assert.match(await p.locator('#work').innerText(),/SGD/);
 /* its booking panel and refund preview speak SGD; the shift desk stays in rupiah */
 await p.click('[data-tab="books"]');assert.match(await p.locator('tr.row').first().innerText(),/SGD [\d,]+/);await p.locator('tr.row').first().click();assert.match(await p.locator('dl.kv').first().innerText(),/Total\s*SGD [\d,]+/);
 await p.click('[data-tab="shift"]');assert.match(await p.locator('body').innerText(),/IDR/);
 assert.deepEqual(errors,[]);console.log('PASS: counter sale in SGD: quote and rate note, cash tender in local units, change, stored amounts, booking panel, shift in IDR');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
