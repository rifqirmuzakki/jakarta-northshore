/* Booking classes: many letters per cabin as price steps, cheaper ones close as the cabin fills, rebook with RB. */
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
 const total=t=>+t.match(/TOTAL IDR\s+([\d,]+)/)[1].replace(/,/g,'');
 const eng=(f,...a)=>p.evaluate(([f,a])=>{const W=document.getElementById('eng').contentWindow;return W.eval('('+f+')').apply(null,a)},[f.toString(),a]);
 /* engine: every family has subclasses, cheapest open first, steps up in price */
 const sub=await eng(()=>{const its=search('JKT','DPS',TD+30),f=fares(its[1]);return f.map(c=>c.fam.map(x=>({n:x.n,sub:x.sub,subs:x.subs.map(s=>[s.k,s.left>0,Math.round(s.p)])})))});
 const all=sub.flat();assert(all.every(x=>x.subs.length>=2));assert.equal(all.find(x=>x.n==='Economy Lite').subs.map(s=>s[0]).join(''),'GLT');assert.equal(all.find(x=>x.n==='Business Flex').subs.map(s=>s[0]).join(''),'CJ');
 for(const x of all){const ps=x.subs.map(s=>s[2]);assert.deepEqual(ps,[...ps].sort((a,b)=>a-b))}
 /* availability display shows many letters, in price order */
 let o=await last(`AN${ddmon(30)}JKTDPS`);const row=o.split('\n').find(l=>/GA 402/.test(l));assert(row,'GA 402 line');assert(/J\d C\d D\d I\d Z\d/.test(row)&&/Y\d B\d/.test(row)&&/M\d E\d H\d/.test(row)&&/Q\d N\d K\d/.test(row)&&/T\d L\d G\d/.test(row));
 assert(row.search(/ J\d/)<row.search(/ Y\d/)&&row.search(/ Y\d/)<row.search(/ G\d/));
 /* different classes, different prices */
 const priceOf=async cls=>{await run('IG');await run(`AN${ddmon(30)}JKTDPS`);assert(/HK1/.test(await last(`SS1${cls}1`)));return total(await last('FQD'))};
 const g=await priceOf('G'),l=await priceOf('L'),t=await priceOf('T'),y=await priceOf('Y');assert(g<l&&l<t&&t<y,[g,l,t,y].join(' '));
 /* cheaper classes close as the cabin fills */
 const closed=await eng(()=>{const it=search('JKT','DPS',TD+30)[1],l=it.legs[0],cap=cabinCap(l,'Economy');adjustSold(l,'Economy',Math.ceil(cap*0.30));GA_PRICING.clear();const f=fares(it)[0];return {cap,subs:f.fam.map(x=>[x.n,x.sub,x.subs.map(s=>s.k+s.left).join(' ')])}});
 const lite=closed.subs.find(x=>x[0]==='Economy Lite'),flexi=closed.subs.find(x=>x[0]==='Economy Flexi');assert.equal(lite[1],'T');assert(/G0 L0 T\d+/.test(lite[2]));assert.equal(flexi[1],'B');
 o=await last(`AN${ddmon(30)}JKTDPS`);const row2=o.split('\n').find(l=>/GA 402/.test(l));assert(/G0/.test(row2)&&/L0/.test(row2));
 await run('IG');assert(/CLASS G CLOSED/.test(await last('SS1G2')));assert(/HK1/.test(await last('SS1T2')));
 /* rebook an unsaved segment, then a held booking, including across cabins */
 await run('NM1TAN/ALI');assert(/NOT OFFERED/.test(await last('RBW2')));assert(/UNKNOWN CLASS/.test(await last('RBX2')));
 const before=total(await last('FQD'));assert(/OK  REBOOKED T TO Y/.test(await last('RBY2')));assert(total(await last('FQD'))>before);
 assert(/ALREADY CLASS Y/.test(await last('RBY2')));assert(/NOT A FLIGHT SEGMENT/.test(await last('RBY1')));
 await run('AP+628120000111');await run('TKOK');await run('RFALI');let er=await last('ER');const ref=er.match(/RECORD LOCATOR (GA[0-9A-Z]{4})/)[1];assert(/ Y /.test(er));
 const sold0=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-sold')));
 const rb=await last('RBC2');assert(/REBOOKED Y TO C/.test(rb),rb);const sold1=await p.evaluate(()=>JSON.parse(localStorage.getItem('ga-sold')));
 const keyOf=s=>Object.keys(s).filter(k=>/\|Business$/.test(k));assert(keyOf(sold1).some(k=>(sold1[k]||0)>(sold0[k]||0)));assert(Object.keys(sold1).some(k=>/\|Economy$/.test(k)&&(sold1[k]||0)<(sold0[k]||0)));
 assert(/ C /.test(await last('RT')));assert(/REBOOKED Y TO C/.test(await last('RH')));
 assert.equal(await p.evaluate(()=>GA_AGENT.bookings()[0].classes.join('')),'C');
 /* a ticketed booking cannot be rebooked yet */
 await run('FPCASH');await run('ET');assert(/REISSUE/.test(await last('RBY2')));
 assert.deepEqual(errors,[]);console.log('PASS: booking classes: letters per cabin, price steps, cheap classes close, RB for unsaved and held bookings');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
