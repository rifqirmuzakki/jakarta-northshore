/* Peak season sells early: Christmas, Lebaran and school holidays are well sold weeks ahead, ordinary dates are not. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:1200,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}};try{localStorage.setItem('ga-pricing-cfg',JSON.stringify({heat:{hot:0}}))}catch(e){}});
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/?s=search');await p.waitForFunction(()=>window.GA_PRICING);
 const r=await p.evaluate(()=>{const leg=day=>search('JKT','SIN',dnOf(day))[0].legs[0],o={};
  const x=leg('2026-12-24'),ord=leg('2027-02-24'),leb=leg('2027-03-08'),sch=leg('2027-06-28');o.seasons=[seasonOf(dnOf('2026-12-24')).label,seasonOf(dnOf('2027-02-24')).label,seasonOf(dnOf('2027-03-08')).label,seasonOf(dnOf('2027-06-28')).label];
  o.xmas45=soldShareFor(x,45);o.ord45=soldShareFor(ord,45);o.leb60=soldShareFor(leb,60);o.ord60=soldShareFor(ord,60);o.sch45=soldShareFor(sch,45);
  o.dec24=loadInfo(x,'Economy').frac;o.dec24late=loadInfo(leg('2026-12-31'),'Economy').frac;o.ordFill=loadInfo(ord,'Economy').frac;
  o.stretch=[bookStretch(x),bookStretch(ord),bookStretch(leb)];
  const cfg=GA_PRICING.cfg;cfg.load.peakEarly=0;GA_PRICING.clear();o.off=[soldShareFor(x,45),soldShareFor(ord,45)];cfg.load.peakEarly=8;cfg.heat.hot=1;GA_PRICING.clear();o.hot=bookStretch(ord);cfg.heat.hot=0;GA_PRICING.clear();
  /* the simulated bookings still add up to the model, and their dates follow it */
  const info=loadInfo(x,'Economy');const gen=GA_DEMAND.bookings?GA_DEMAND.bookings(x,'Economy'):null;o.model=info.model;o.genSeats=gen?gen.filter(g=>g.status==='HK').reduce((n,g)=>n+g.seats,0):null;return o});
 assert.deepEqual(r.seasons,['Year-end holidays','','Lebaran (Idul Fitri), approximate','Mid-year school holidays']);
 assert(r.xmas45>0.5,'Christmas is more than half sold six weeks out: '+r.xmas45);assert(r.ord45<0.25,'an ordinary date is not: '+r.ord45);
 assert(r.leb60>r.ord60*3,'Lebaran sells earliest of all: '+r.leb60+' vs '+r.ord60);assert(r.sch45>r.ord45*1.5&&r.sch45<r.xmas45,'school holidays are in between');
 assert(r.dec24>0.45&&r.dec24late>0.45,'GA 900 on 24 and 31 Dec is well sold five weeks out: '+r.dec24+' '+r.dec24late);assert(r.ordFill<0.2);
 assert(r.stretch[0]>r.stretch[1]&&r.stretch[2]>r.stretch[0]&&r.stretch[1]===1);assert(r.hot>r.stretch[1]+0.5,'a hot flight sells earlier too');
 assert(Math.abs(r.off[0]-r.off[1])<1e-9,'with the setting at 0 every date sells at the same pace');
 await p.goto('https://garuda.test/garuda/pricing-lab.html');await p.waitForSelector('#lab:not([hidden])',{timeout:20000});for(const k of ['load.peakEarly','load.hotEarly'])assert.equal(await p.locator('[data-p="'+k+'"]').count(),1,k);
 assert.deepEqual(errors,[]);console.log('PASS: peak season sells early: Christmas, Lebaran, school holidays, hot flights, Pricing Lab');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
