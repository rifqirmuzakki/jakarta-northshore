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
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
