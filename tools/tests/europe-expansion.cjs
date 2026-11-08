/* Five weekly European 787-9 services: days, next-day returns and physical tails. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const services=[{city:'Vienna',out:'GA 64',in:'GA 65',days:'1357',returns:'1246',weekly:4},{city:'Athens',out:'GA 66',in:'GA 67',days:'246',returns:'357',weekly:3},{city:'Oslo',out:'GA 68',in:'GA 69',days:'246',returns:'357',weekly:3},{city:'Helsinki',out:'GA 70',in:'GA 71',days:'1357',returns:'1246',weekly:4},{city:'Prague',out:'GA 72',in:'GA 73',days:'1357',returns:'1246',weekly:4}];
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage(),errors=[];let baseline=false;page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://northshore.test/**',r=>{const file=path.join(root,new URL(r.request().url()).pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return r.fulfill({status:404,body:''});
  if(baseline&&file.endsWith('schedule-changes.js'))return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'schedule-changes.js'),'utf8').replace(/window\.JN_CHANGES_REPO=([\s\S]*);\s*$/,(_,json)=>{const d=JSON.parse(json);d.changes=d.changes.filter(c=>!c.id.startsWith('chg_europe_b789_'));return 'window.JN_CHANGES_REPO='+JSON.stringify(d)+';'})});
  return file.endsWith('index.html')?r.fulfill({contentType:'text/html',body:source}):r.fulfill({path:file});});
 const counts=Object.fromEntries(services.map(s=>[s.city,{out:0,in:0}])),fleets=[];
 let baselineRegs;
 baseline=true;await page.goto('https://northshore.test/index.html?clock=2026-11-16T20:00&incidents=off');await page.waitForFunction(()=>window.SIMCORE?.FLEET);
 baselineRegs=await page.evaluate(()=>Object.fromEntries([...SIMCORE.FLEET.F].filter(([k])=>k.startsWith('GA|')).map(([k,f])=>[k,f.tails.map(t=>t.reg)])));baseline=false;
 for(const date of ['2026-11-08','2026-11-09','2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-21','2026-11-22']){
  await page.goto('https://northshore.test/index.html?clock='+date+'T20:00&incidents=off');await page.waitForFunction(()=>window.SIMCORE?.FLEET&&window.JN_WORLD);
  const result=await page.evaluate(({services,date})=>{
   const S=SIMCORE,day=S.FLEET.day,dow=((day+3)%7+7)%7+1,active=date>='2026-11-09',issues=[],counts={},check=(v,m)=>{if(!v)issues.push(m)};
   check(!window.JN_TAIL_ERROR,'Tail planner failed: '+window.JN_TAIL_ERROR);
   const AF=S.allFlights(),newIds=new Set(services.flatMap(s=>[s.out,s.in]));
   for(const s of services){
    const out=AF.out.filter(f=>f.id===s.out),incoming=AF.in.filter(f=>f.id===s.in);
    check(out.length===(active?1:0)&&incoming.length===(active?1:0),s.city+' duplicate/missing declaration');
    const outOn=active&&s.days.includes(String(dow)),inOn=date>='2026-11-10'&&s.returns.includes(String(dow));
    const o=S.OUTF.filter(f=>f.id===s.out),i=S.INF.filter(f=>f.id===s.in);counts[s.city]={out:o.length,in:i.length};
    check(o.length===+outOn&&i.length===+inOn,s.city+' operating day or first return wrong');
    if(!active)continue;
    check(out[0].ac==='Boeing 787-9'&&incoming[0].ac==='Boeing 787-9',s.city+' wrong equipment');
    check(out[0].days===s.days&&incoming[0].days===s.returns,s.city+' wrong weekly mask');
    check(!!JN_ROUTE.routes(s.city)&&!!AIR_CITY[s.city]&&!!JN_TZOF(s.city),s.city+' missing route/airport/timezone');
    for(const f of [...o,...i]){
     const e=S.ENTS.find(e=>e.a?.id===f.id||e.d?.id===f.id);check(!!e?.tail,f.id+' missing live registration');
     const l=S.worldLegs().find(l=>l.id===f.id&&l.d===day),ft=l&&JN_FLIGHT_TIMES(f.id,l.scheduledStd,{day:l.d,from:l.from,to:l.to});
     check(ft?.reg===e?.tail&&ft?.ac==='Boeing 787-9',f.id+' history registration/equipment disagrees');
    }
   }
   const regs=Object.fromEntries([...S.FLEET.F].filter(([k])=>k.startsWith('GA|')).map(([k,f])=>[k,f.tails.map(t=>t.reg)]));
   const all=Object.values(regs).flat();check(new Set(all).size===all.length&&all.every(r=>/^PK-G[A-Z]{2}$/.test(r)&&!r.includes('B')),'Duplicate/invalid Garuda registration');
   let paired=0;
   if(date==='2026-11-22'){
    const legs=[];S.FLEET.F.get('GA|Boeing 787-9').tails.forEach(t=>{
     const h=S.tailHistory(t.reg),ordered=h.legs.slice().sort((a,b)=>a.std-b.std);
     ordered.forEach((l,i)=>{if(newIds.has(l.flight))legs.push({...l,reg:t.reg});const prev=ordered[i-1];if(prev&&(newIds.has(l.flight)||newIds.has(prev.flight))){check(prev.to===l.from,t.reg+' airport discontinuity');check(l.std>=prev.sta+75,t.reg+' overlapping flights/short turn')}});
    });
    for(const s of services)for(const out of legs.filter(l=>l.flight===s.out&&l.d<day)){
     const back=legs.find(l=>l.flight===s.in&&l.d===out.d+1);check(!!back&&back.reg===out.reg,s.city+' return not on outbound aircraft');
     if(back){check(back.std-out.sta===120,s.city+' outstation turn not two hours');paired++}
    }
    check(paired===33,'Missing return pairs since launch: '+paired);
   }
   return {issues,counts,regs,paired,fleet:S.FLEET.fleets.find(f=>f.key==='GA|Boeing 787-9')};
  },{services,date});
  assert.deepEqual(result.issues,[],date);assert.deepEqual(errors,[]);
  if(date>='2026-11-16'){
   for(const s of services){counts[s.city].out+=result.counts[s.city].out;counts[s.city].in+=result.counts[s.city].in}
   fleets.push(result.fleet.n);
   for(const [type,regs] of Object.entries(baselineRegs))assert.deepEqual(result.regs[type].slice(0,regs.length),regs,'Existing registration changed: '+type);
  }
  console.log('PASS',date,JSON.stringify({counts:result.counts,B789:result.fleet,paired:result.paired}));
 }
 for(const s of services)assert.deepEqual(counts[s.city],{out:s.weekly,in:s.weekly},s.city+' weekly totals wrong');
 assert.equal(new Set(fleets).size,1,'Fleet size varies across operating days');
 console.log('PASS: 18 return services weekly, exact day masks, next-day returns with 120-minute turns, physical tail continuity, stable fleet and existing registrations');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
