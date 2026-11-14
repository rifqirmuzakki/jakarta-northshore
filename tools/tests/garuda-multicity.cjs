/* Trip shapes in the terminal quote: round trip, open jaw, circle trip, multi-city. Discounts come from the Pricing Lab settings. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);
 const run=async c=>{await p.fill('#tin',c);await p.press('#tin','Enter');return p.evaluate(()=>GA_TERM.lines().join('\n'))};
 const last=async c=>{const all=await run(c);return all.slice(all.lastIndexOf('> '+c.toUpperCase()))};
 const eng=(f,...a)=>p.evaluate(([f,a])=>{const W=document.getElementById('eng').contentWindow;return W.eval('('+f+')').apply(null,a)},[f.toString(),a]);
 const total=t=>+t.match(/TOTAL IDR\s+([\d,]+)/)[1].replace(/,/g,''),fare=t=>+t.match(/\nFARE\s+([\d,]+)/)[1].replace(/,/g,'');
 const build=async legs=>{await run('IG');for(const [d,pair] of legs){await run(`AN${ddmon(d)}${pair}`);assert(/HK1/.test(await last('SS1Y1')))}};
 /* the classifier */
 const types=await eng(()=>{const s=(o,d,x)=>search(o,d,TD+x)[0];const t=a=>GA_PRICING.tripType(a);return [t([s('JKT','SIN',20)]),t([s('JKT','SIN',20),s('SIN','JKT',25)]),t([s('JKT','SIN',20),s('KUL','JKT',25)]),t([s('JKT','SIN',20),s('SIN','KUL',25),s('KUL','JKT',30)]),t([s('JKT','SIN',20),s('SIN','DPS',25)]),t([s('JKT','SIN',20),s('KUL','DPS',25)]),t([s('JKT','SIN',20),s('SIN','DPS',25),s('DPS','KUL',30)])]});
 assert.deepEqual(types,['one','ret','oj','circle','oj','multi','multi']);
 /* the terminal quote names the shape and applies the discount */
 await build([[20,'JKTSIN'],[25,'SINJKT']]);let q=await last('FQD');assert(/TRIP TYPE  ROUND TRIP/.test(q)&&/ROUND TRIP, .* -\d+%/.test(q),q);
 await build([[20,'JKTSIN'],[25,'KULJKT']]);q=await last('FQD');assert(/TRIP TYPE  OPEN JAW/.test(q)&&/OPEN JAW  -8%/.test(q),q);const oj=fare(q);
 await build([[20,'JKTSIN'],[25,'SINKUL'],[30,'KULJKT']]);q=await last('FQD');assert(/TRIP TYPE  CIRCLE TRIP/.test(q)&&/CIRCLE TRIP  -8%/.test(q),q);const ci=fare(q);
 await build([[20,'JKTSIN'],[25,'SINDPS'],[30,'DPSKUL']]);q=await last('FQD');assert(/TRIP TYPE  MULTI-CITY/.test(q)&&/NO DISCOUNT/.test(q)&&!/-8%/.test(q),q);
 /* the discount is exactly the Pricing Lab setting applied to the sum of one-way fares */
 const cmp=await eng(()=>{const s=(o,d,x)=>search(o,d,TD+x)[0],its=[s('JKT','SIN',20),s('KUL','JKT',25)],sel=its.map(it=>({it,fam:fares(it)[0].fam[1]})),q={from:'JKT',to:'SIN',type:'one',d1:TD+20,d2:TD+20,a:1,c:0,i:0,cab:'Economy'};
  const one=priceSummary(sel,q).fare;GA_PRICING.cfg.roundTrip.openJaw=0.20;const oj=priceSummary(sel,Object.assign({},q,{type:'oj'})).fare;GA_PRICING.cfg.roundTrip.openJaw=0.08;const oj8=priceSummary(sel,Object.assign({},q,{type:'oj'})).fare;return {one,oj,oj8}});
 assert(Math.abs(cmp.oj-cmp.one*0.8)<=2000,JSON.stringify(cmp));assert(Math.abs(cmp.oj8-cmp.one*0.92)<=2000,JSON.stringify(cmp));
 /* an open-jaw booking keeps its type, price and the label when retrieved */
 await build([[20,'JKTSIN'],[25,'KULJKT']]);await run('NM1TAN/ALI MR');await run('AP+628120000111');await run('TKOK');await run('RFALI');q=await last('FQD');const t0=total(q);
 const er=await last('ER');const ref=er.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];assert.equal(await p.evaluate(()=>GA_AGENT.bookings()[0].q.type),'oj');assert.equal(await p.evaluate(()=>GA_AGENT.bookings()[0].total),t0);
 await run('IG');q=await last('RT'+ref);assert(/RP\/JKT003/.test(q));q=await last('FQD');assert(/TRIP TYPE  OPEN JAW/.test(q)&&total(q)===t0);
 assert(oj>0&&ci>0);assert.deepEqual(errors,[]);console.log('PASS: trip shapes: round trip, open jaw, circle, multi-city; discounts from the Pricing Lab; booking keeps its type');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
