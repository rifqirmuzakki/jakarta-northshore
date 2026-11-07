/* World/terminal overlap and stale-handoff regressions from duplicate GA markers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://northshore.test/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  if(file.endsWith('index.html'))return route.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace('window.JN_WORLD={','window.__trackingTest={getLegs,routeFor,selectedTrail,airState,draw,positions:()=>pos};window.JN_WORLD={')});
  return route.fulfill({path:file});});
 await page.goto('https://northshore.test/index.html?clock=2026-11-07T11:53&incidents=off');
 await page.waitForFunction(()=>window.SIMDBG&&window.JN_WORLD&&SIMCORE.FLEET);
 const result=await page.evaluate(()=>{
  const W=__trackingTest,M=JN_MAP,A=AIRCORE.AIR,day=SIMCORE.FLEET.day,issues=[],check=(v,m)=>{if(!v)issues.push(m)};
  JN_SCN.setPaused(true);SIMDBG.pause();JN_WORLD.show();
  const oldAir=M.airPoses,oldTrail=M.trailLL;
  let cases=0;
  try{for(const id of ['GA 731','GA 847','GA 877']){
   const l=W.getLegs().find(l=>l.id===id&&l.d===day);check(!!l,id+' missing');if(!l)continue;
   const r=W.routeFor(l),now=day*1440+713;
   // Simulate an overlapping timetable interval while terminal poses own the flight.
   l.off=now-30;l.land=now+30;l.noWorld=false;l.hand=null;
   const a={id,c:'GA',kind:'arr',ph:'arr',alt:36000,hd:220,lat:-4,lon:107.8};
   M.airPoses=()=>[a,{...a}];let trail=[[-3.5,108],[-3.8,107.9],[a.lat,a.lon]];M.trailLL=()=>trail;
   JN_WORLD.select(id);W.draw();
   const matching=W.positions().filter(o=>o.l.id===id);
   check(matching.length===1,id+' has duplicate markers');
   check(matching[0]?.air?.alt===36000&&matching[0]?.alt===36000,id+' uses timetable altitude');
   check(document.querySelector('#card').textContent.includes('Airborne'),id+' high-altitude card says approach');
   const pts=W.selectedTrail(l,r,[a.lon,a.lat],true);
   check(JSON.stringify(pts.slice(0,-1))===JSON.stringify(trail.map(q=>[q[1],q[0]])),id+' unanchored trail detours through Jakarta');
   // Rewinding must immediately replace the old trail, including within 1.5 seconds.
   trail=[[-3.5,108],[-3.6,107.95]];
   const rewind=W.selectedTrail(l,r,[107.95,-3.6],true);
   check(rewind.every(q=>q[1]>=-3.6),id+' retained future trail after rewind');cases++;
  }}finally{M.airPoses=oldAir;M.trailLL=oldTrail}
  // Terminal rebuilds mutate the same entities, but replace the track arrays.
  const before=W.getLegs();A.A=[...A.A];A.D=[...A.D];const after=W.getLegs();
  check(before!==after,'World legs retained stale terminal anchors after rebuild');
  for(const id of ['GA 731','GA 847','GA 877']){
   const l=after.find(l=>l.id===id&&l.d===day);check(!!l.hand,id+' handoff missing after rebuild');
   const r=W.routeFor(l),trail=[[l.hand[0],l.hand[1]],[l.hand[0]-.01,l.hand[1]]];M.trailLL=()=>trail;
   const pts=W.selectedTrail(l,r,[trail[1][1],trail[1][0]],true),join=pts.findIndex(q=>Math.hypot(q[0]-l.hand[1],q[1]-l.hand[0])<1e-8);
   check(join>0&&pts.slice(join).every(q=>Math.abs(q[0]-l.hand[1])<1e-8),id+' anchored route doubles back at handoff');
  }M.trailLL=oldTrail;
  check(W.airState({kind:'arr',ph:'hold',alt:13000})==='Holding','Holding status lost');
  check(W.airState({kind:'arr',ph:'arr',alt:6000})==='On approach','Low arrival status lost');
  check(W.airState({kind:'arr',ph:'rwy',alt:0})==='Landing','Runway status incorrect');
  check(W.airState({kind:'dep',ph:'dep',alt:6000})==='Airborne','Departure status incorrect');
  return {issues,cases};
 });
 assert.deepEqual(result.issues,[]);assert.deepEqual(errors,[]);
 console.log('PASS: GA731/847/877 overlap, one terminal marker and altitude, continuous trails, rewind, track rebuilds and flight status');
 // Real simulated departures around midnight, including the three reported flights.
 await page.goto('https://northshore.test/index.html?clock=2026-11-07T00:21&incidents=off');
 await page.waitForFunction(()=>window.SIMDBG&&window.JN_WORLD&&SIMCORE.FLEET);
 const midnight=await page.evaluate(()=>{
  JN_SCN.setPaused(true);SIMDBG.pause();const W=__trackingTest,M=JN_MAP,A=AIRCORE,day=SIMCORE.FLEET.day,issues=[],details=[];
  const check=(v,m)=>{if(!v)issues.push(m)},near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7;
  const move=seconds=>{SIMDBG.T=seconds;JN_SCN.setTime((day*1440-420)*60000+seconds*1000)};
  for(const id of ['KL 7941','5X 6260','GA 736']){
   const e=M.ent(id),tr=e?.dT;check(!!tr,id+' departure track missing');if(!tr)continue;
   const complete=M.depTrackLL(id),start=A.posAtOff(tr,tr.t0),end=A.posAtOff(tr,tr.t1);
   check(complete.length>10,id+' SID trail too short');
   check(near(complete[0],A.airLL(start.x,start.y)),id+' trail does not start at runway');
   check(near(complete.at(-1),A.airLL(end.x,end.y)),id+' trail misses exact SID handoff');
   // Sample an active track using a wall clock wrapped onto another date.
   const raw=Math.max(tr.t0+20,(tr.t0+tr.t1)/2),clock=((raw%86400)+86400)%86400;move(clock);
   const q=A.poseOf(e,clock);check(q?.tr===tr,id+' wrapped departure pose missing');if(q?.tr!==tr)continue;
   const trail=M.trailLL(id),expected=[];
   for(let t=tr.t0;t<clock+q.off;t+=20){const p=A.posAtOff(tr,t);if(p)expected.push(A.airLL(p.x,p.y))}expected.push(A.airLL(q.x,q.y));
   check(trail.length===expected.length&&trail.every((p,i)=>near(p,expected[i])),id+' wrapped trail omits or skips SID samples');
   const l=JN_WORLD.legOf(id),r=W.routeFor(l),pts=W.selectedTrail(l,r,[A.airLL(q.x,q.y)[1],A.airLL(q.x,q.y)[0]],true);
   check(near([pts[0][1],pts[0][0]],complete[0]),id+' active trail does not start on runway');
   // After handoff, yesterday's World instance must keep the whole SID prefix.
   const absolute=tr.t1+600,dateOffset=Math.floor(absolute/86400);move(absolute-dateOffset*86400);
   const prev=W.getLegs().find(l=>l.id===id&&l.d===day-dateOffset);
   check(!!prev?.hand,id+' adjacent-day handoff missing');if(!prev?.hand)continue;
   const rr=W.routeFor(prev),full=W.selectedTrail(prev,rr,[rr.lon.at(-1),rr.lat.at(-1)],false);
   check(complete.every((p,i)=>near([full[i]?.[1],full[i]?.[0]],p)),id+' World trail does not preserve SID');
   check(near(complete.at(-1),prev.hand),id+' SID and World handoff disconnected');
   details.push({id,wrappedOffset:q.off,trailPoints:trail.length,sidPoints:complete.length});
  }
  // The screenshot's GA736 instance left on the previous calendar day.
  move(21*60);const ga=JN_WORLD.legOf('GA 736');check(ga?.d===day-1&&!!ga.hand,'GA736 previous-day SID missing at 00:21');
  return {issues,details};
 });
 assert.deepEqual(midnight.issues,[]);assert.deepEqual(errors,[]);console.log('PASS: midnight departures start on runway and preserve SID into World routes',midnight.details);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
