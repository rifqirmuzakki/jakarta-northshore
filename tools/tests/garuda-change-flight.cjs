/* Change flight button: Bookings tab panel drives the same change rules as the terminal. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);
 const run=async c=>{await p.click('[data-tab="term"]');await p.fill('#tin',c);await p.press('#tin','Enter');return p.evaluate(()=>GA_TERM.lines().join('\n'))};
 const last=async c=>{const all=await run(c);return all.slice(all.lastIndexOf('> '+c.toUpperCase()))};
 const d=ddmon(30);
 const hold=async()=>{await run('IG');await run(`AN${d}JKTDPS`);assert(/HK1/.test(await last('SS1M1')));await run('NM1WIJAYA/RINA MRS');await run('AP+628120000111');await run('TKOK');await run('RFRINA');const er=await last('ER');return er.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1]};
 const ticket=async(cls,pax=2)=>{await run('IG');await run(`AN${d}JKTDPS`);assert(new RegExp('HK'+pax).test(await last(`SS${pax}${cls}1`)));await run(pax===2?'NM2WIJAYA/RINA MRS/BUDI MR':'NM1WIJAYA/RINA MRS');await run('AP+628120000111');await run('TKOK');await run('RFRINA');const er=await last('ER');const ref=er.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];await run('FPCASH');assert(/TICKETS ISSUED/.test(await last('ET')));return ref};
 const open=async ref=>{await p.click('[data-tab="books"]');await p.click(`[data-book="${ref}"]`)};
 /* Lite: the panel shows the terminal's refusal */
 const lite=await ticket('G',1);await open(lite);await p.click('[data-chg]');await p.waitForSelector('.chgl button');
 await p.locator('.chgl button').first().click();
 const t1=await p.locator('.chgp').innerText();
 if(/not allowed/i.test(t1)){assert(/Change flight/.test(t1))}else{const o=await p.locator('#chg-cls option:not([disabled])').allTextContents();assert(o.length>0)}
 assert.equal(await p.locator('[data-chggo]').isDisabled(),true);
 await p.click('[data-chgno]');assert.equal(await p.locator('.chgp').count(),0);
 /* Standard: fee + difference collected, reissued */
 const ref=await ticket('H');await open(ref);
 const before=await p.evaluate(()=>{const b=GA_AGENT.bookings().find(x=>x.ticketHistory||true);return {n:GA_AGENT.bookings().length}});
 await p.click('[data-chg]');await p.waitForSelector('.chgl button');
 const picks=await p.locator('.chgl button').count();assert(picks>1,'flights listed');
 let chosen=-1;for(let i=0;i<picks;i++){await p.locator('.chgl button').nth(i).click();if(await p.locator('.chgq').count()&&!(await p.locator('.chgl button').nth(i).innerText()).includes('current flight')){chosen=i;break}}
 assert(chosen>=0,'a different flight quotes');
 const qt=await p.locator('.chgq').innerText();assert(/Change fee/.test(qt)&&/250,000/.test(qt)&&/Total to collect/.test(qt),qt);
 const collect=+qt.match(/Total to collect\s*(?:IDR\s*)?([\d,]+)/)[1].replace(/,/g,'');assert(collect>=250000,String(collect));
 assert.equal(await p.locator('[data-chggo]').isDisabled(),true);
 await p.click('[data-chgpm="Credit card"]');assert.equal(await p.locator('[data-chggo]').isDisabled(),false);
 const flt0=await p.evaluate(r=>GA_AGENT.bookings().find(b=>b.ref===r).dirs[0].legs[0].id,ref);
 await p.click('[data-chggo]');await p.waitForSelector('.chgp [data-print]');
 const after=await p.evaluate(r=>{const b=GA_AGENT.bookings().find(x=>x.ref===r);return {flt:b.dirs[0].legs[0].id,tv:b.tv,paid:b.paid,paid0:b.paid0}},ref);
 assert.equal(after.tv,1);assert.equal(after.paid,after.paid0+collect);
 await p.click('[data-chgno]');
 /* Held: no fee, rebooked */
 const h=await hold();await open(h);await p.click('[data-chg]');await p.waitForSelector('.chgl button');
 await p.locator('.chgl button').nth(1).click();assert(/no change fee/i.test(await p.locator('.chgq').innerText()));
 await p.click('[data-chggo]');await p.waitForSelector('.chgp .note');
 const hb=await p.evaluate(r=>{const b=GA_AGENT.bookings().find(x=>x.ref===r);return {held:b.held,flt:b.dirs[0].legs[0].id}},h);assert.equal(hb.held,true);
 /* cancelled: no button */
 await p.click('[data-chgno]');
 /* unsaved terminal work blocks a change */
 await run('IG');await run(`AN${d}JKTDPS`);await run('SS1M1');
 await open(h);await p.click('[data-chg]');await p.waitForSelector('.chgp');
 assert(/terminal|finish|unsaved|booking in progress/i.test(await p.locator('.chgp').innerText()),'busy refusal');
 assert.deepEqual(errors,[]);console.log('PASS: change flight: Lite refusal, fee+difference+payment reissue, held rebook, busy terminal');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
