/* Route-aware time preference: long routes reward a night departure that lands in the morning, leisure routes prefer mid-morning out and afternoon back, short trunks keep their commuter peaks. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:1200,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/?s=search');await p.waitForFunction(()=>window.GA_PRICING);
 const r=await p.evaluate(()=>{const val=(a,z,d,id)=>{const it=search(a,z,TD+d).find(i=>i.legs[0].id===id);return it?fares(it)[0].fam[1].p0:null},f=(a,z,d,id)=>{const it=search(a,z,TD+d).find(i=>i.legs[0].id===id);return it?prefOf(it.legs[0]).f:null};
  const o={};o.ams44=val('JKT','AMS',30,'GA 44');o.ams2=val('JKT','AMS',30,'GA 2');
  const best=(a,z)=>{const its=search(a,z,TD+30).map(it=>({id:it.legs[0].id,m:lp(it.legs[0].dep,it.legs[0].from).min,f:prefOf(it.legs[0]).f}));its.sort((x,y)=>y.f-x.f);return {best:its[0],worst:its.at(-1),spread:its[0].f/its.at(-1).f}};
  o.dpsOut=best('JKT','DPS');o.dpsBack=best('DPS','JKT');o.lopOut=best('JKT','LOP');o.sub=best('JKT','SUB');o.ams=best('JKT','AMS');o.amsBack=best('AMS','JKT');
  const sub=search('JKT','SUB',TD+30).map(i=>({m:lp(i.legs[0].dep,i.legs[0].from).min,f:prefOf(i.legs[0]).f}));o.peak=Math.max(...sub.filter(x=>x.m>=360&&x.m<=540).map(x=>x.f));o.mid=Math.max(...sub.filter(x=>x.m>=720&&x.m<=900).map(x=>x.f));
  const prof=(a,z)=>search(a,z,TD+30)[0]&&prefOf(search(a,z,TD+30)[0].legs[0]).profile;o.profiles={ams:prof('JKT','AMS'),dps:prof('JKT','DPS'),dpsBack:prof('DPS','JKT'),sub:prof('JKT','SUB'),kix:prof('JKT','KIX')};
  const st={};for(const fl of FLS){const l={id:fl.id,dep:fl.dep+TD*1440,arr:fl.arr+TD*1440,from:fl.out?HUB:fl.code,to:fl.out?fl.code:HUB},q=prefOf(l);(st[q.profile]=st[q.profile]||[]).push(q.f)}
  o.stats=Object.fromEntries(Object.entries(st).map(([k,v])=>[k,{n:v.length,mean:v.reduce((a,x)=>a+x,0)/v.length,min:Math.min(...v),max:Math.max(...v)}]));
  /* the fuller flight is the preferred one: GA 2 fills more than GA 44 on average */
  let lf2=0,lf44=0,n=0;for(let d=10;d<40;d++){const a=search('JKT','AMS',TD+d).find(i=>i.legs[0].id==='GA 2'),c=search('JKT','AMS',TD+d).find(i=>i.legs[0].id==='GA 44');if(a&&c){lf2+=loadInfo(a.legs[0],'Economy').lf;lf44+=loadInfo(c.legs[0],'Economy').lf;n++}}o.lf2=lf2/n;o.lf44=lf44/n;
  const cfg=GA_PRICING.cfg;cfg.pref.on=0;GA_PRICING.clear();o.origAms44=val('JKT','AMS',30,'GA 44');o.origAms2=val('JKT','AMS',30,'GA 2');cfg.pref.on=1;GA_PRICING.clear();return o});
 assert(r.ams2/r.ams44>1.10&&r.ams2/r.ams44<1.35,'GA 2 is dearer than GA 44: '+(r.ams2/r.ams44));
 assert.deepEqual(r.profiles,{ams:'long',dps:'leisure, outbound',dpsBack:'leisure, returning',sub:'short',kix:'medium'});
 assert(r.dpsOut.best.m>=540&&r.dpsOut.best.m<=840,'Bali out is best mid-morning: '+r.dpsOut.best.m);assert(r.dpsOut.worst.m>=1260||r.dpsOut.worst.m<=240);
 assert(r.dpsBack.best.m>=780&&r.dpsBack.best.m<=1020,'Bali back is best in the afternoon: '+r.dpsBack.best.m);assert(r.lopOut.best.m>=540&&r.lopOut.best.m<=840);
 assert(r.peak>r.mid*1.07,'short trunk keeps its morning peak');
 assert(r.ams.best.id==='GA 2'&&r.ams.spread>1.15&&r.ams.spread<1.40,'Europe: the night flight is best: '+r.ams.spread);
 assert(r.dpsOut.spread>1.15&&r.dpsOut.spread<1.40&&r.sub.spread>1.15&&r.sub.spread<1.40);
 for(const [k,v] of Object.entries(r.stats)){assert(v.mean>0.95&&v.mean<1.06,k+' average stays near 1: '+v.mean);assert(v.min>0.80&&v.max<1.20,k+' range')}
 assert(r.lf2>r.lf44+0.04,'the preferred flight fills more: '+r.lf2+' vs '+r.lf44);
 assert(r.origAms2<r.origAms44,'with the preference off the old rule is back (the night flight is cheaper)');
 /* Pricing Lab has the settings */
 await p.goto('https://garuda.test/garuda/pricing-lab.html');await p.waitForSelector('#lab:not([hidden])',{timeout:20000});
 for(const k of ['pref.on','pref.longDep7','pref.leisureOut3','pref.leisureBack5','pref.medArr3','pref.shortDep2','pref.shortMax','pref.longMin'])assert.equal(await p.locator('[data-p="'+k+'"]').count(),1,k);
 assert.match(await p.locator('#lab').innerText(),/Time preference/);
 assert.deepEqual(errors,[]);console.log('PASS: route-aware time preference: long, medium, short and leisure routes, spread, fill, Pricing Lab');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
