/* Outbound flights: ATA/ETA follow from ATD + route length + aircraft speed + wind, so flights keep their order on a shared corridor. */
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const clock of ['2026-11-10T23:12','2026-11-11T01:06']){
  await p.goto('file://'+root+'/index.html?clock='+clock+'&incidents=off');
  await p.waitForFunction(()=>window.JN_WORLD&&window.JN_PHYS&&window.SIMDBG&&SIMCORE.FLEET,null,{timeout:60000});
  const r=await p.evaluate(()=>{const R=Math.PI/180,d=(a,b)=>{const x=Math.sin((b.lat-a.lat)*R/2)**2+Math.cos(a.lat*R)*Math.cos(b.lat*R)*Math.sin((b.lon-a.lon)*R/2)**2;return 2*6371*Math.asin(Math.sqrt(x))};
   const out=[],bad=[];
   for(const x of SIMCORE.worldLegs()){const l=JN_WORLD.legOf(x.id);if(!l||l.dir!=='out'||l.cx||l.noWorld||!(JN_PHYS.routeKm(l.city)>5000))continue;
    const q=JN_WORLD.posOf(l.id);if(!q||!q.active)continue;const ft=JN_FLIGHT_TIMES(l.id,l.scheduledStd??l.std,{day:l.d,from:l.from,to:l.to});if(!ft||ft.atd==null)continue;
    const A=JN_PHYS.airborneMin(l.city,'out',l.ac,l.id,l.d);
    if(Math.abs(ft.eta-ft.atd-A)>30)bad.push(l.id+' ETA is not ATD + physical flight time ('+Math.round(ft.eta-ft.atd)+' vs '+A+')');
    out.push({id:l.id,ac:l.ac,city:String(l.city).split(' / ')[0],atd:ft.atd,km:d({lat:-6.13,lon:106.65},q)})}
   /* same aircraft type to the same place: the earlier departure is further along unless it is more than 40 min ahead of nothing (flight times now vary by up to ~1h with weather) */
   for(const a of out)for(const c of out)if(a.ac===c.ac&&a.city===c.city&&a.atd<c.atd-90&&a.km<c.km)bad.push(a.id+' left earlier than '+c.id+' but is behind it');
   return {n:out.length,bad}});
  assert.deepEqual(r.bad,[],clock);assert(r.n>=0);console.log('checked',clock,r.n,'long-haul departures');
 }
 {const v=await p.evaluate(()=>{const o=[];for(let d=20780;d<20790;d++)o.push(JN_PHYS.airborneMin('Amsterdam','out','Airbus A350-900','GA 88',d));return o});assert(new Set(v).size>=6,'flight time should vary day to day: '+v);assert(Math.max(...v)-Math.min(...v)<=90&&Math.max(...v)-Math.min(...v)>=15,'variation should be tens of minutes: '+v);
  const again=await p.evaluate(()=>JN_PHYS.airborneMin('Amsterdam','out','Airbus A350-900','GA 88',20783));assert.equal(again,v[3],'same flight and day must give the same time');console.log('Amsterdam flight times over 10 days:',v.join(' '))}
 assert.deepEqual(errors,[]);console.log('PASS: outbound ETA = ATD + physical flight time; same-type flights keep their order');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
