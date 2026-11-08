/* Reported GA552 trail, southern arrivals, old history and mobile footer controls. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(process.env.ARRIVAL_SOURCE||path.join(root,'index.html'),'utf8');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://northshore.test/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  if(file.endsWith('index.html'))return route.fulfill({contentType:'text/html',body:source
   .replace('window.JN_WORLD={','window.__arrivalTest={getLegs,routeFor,legPath,selectedTrail,draw,selectLeg:l=>{sel=l},context:()=>ctx};window.JN_WORLD={')
   .replace('function render(H){','window.__arrivalHistory={flightRows,legRow,historyLoadProfile};function render(H){')});
  return route.fulfill({path:file});});
 await page.goto('https://northshore.test/index.html?clock=2026-11-08T07:18&incidents=off');
 await page.waitForFunction(()=>window.__arrivalTest&&window.SIMDBG&&SIMCORE.FLEET);
 const result=await page.evaluate(()=>{
  JN_SCN.setPaused(true);SIMDBG.pause();JN_WORLD.show();const W=__arrivalTest,H=__arrivalHistory,issues=[],check=(v,m)=>{if(!v)issues.push(m)};
  const missing=[...new Set(SIMCORE.worldLegs().filter(l=>!l.cx&&!W.routeFor(l)).map(l=>l.city))];check(!missing.length,'Scheduled airports lack routes: '+missing);
  const l=JN_WORLD.legOf('GA 552'),a=JN_MAP.airPoses().find(a=>a.id===l.id);check(!!a,'GA552 terminal pose missing');
  JN_WORLD.select(l.id);W.draw();
  const trail=W.selectedTrail(l,W.routeFor(l),[a.lon,a.lat],true),raw=JN_MAP.trailLL(l.id);
  check(trail.length>10&&Math.hypot(trail[0][0]-raw[0][1],trail[0][1]-raw[0][0])<1e-8,'GA552 trail does not start at runway');
  // Even a newly added airport without prebuilt route data must retain its known trail.
  W.selectLeg({...l,city:'Unbuilt custom airport'});const ctx=W.context(),stroke=ctx.stroke;let solid=0;
  ctx.stroke=function(...args){if(this.strokeStyle==='#2563eb'&&!this.getLineDash().length)solid++;return stroke.apply(this,args)};
  try{W.draw()}finally{ctx.stroke=stroke}check(solid>0,'Missing World route suppresses known terminal trail');
  for(const id of ['QF 1000','GA 725']){
   const l=JN_WORLD.legOf(id),e=JN_MAP.ent(id),tr=e.aT,r=W.routeFor(l),P=W.legPath(l,r),target=AIRCORE.airRouteTransitionPoint(l.city,'in'),hand=AIRCORE.airXY(...l.hand);
   check(tr.gk===JN_ROUTE.gate(l.city,id,'in'),id+' STAR uses a different gate from filed route');
   check(Math.hypot(hand[0]-target[0],hand[1]-target[1])<1,id+' handoff is not on filed corridor');
   check(P.len<=r.len*1.03,id+' World handoff creates large detour');
   check(!!tr.hs&&tr.hs.enroute,id+' missing filed-corridor STAR connector');
  }
  const today=SIMCORE.FLEET.day,profile=H.historyLoadProfile();
  for(const id of ['GA 3','GA 45'])for(const x of H.flightRows(id,438)){
   if(x.r.l.sta<(today*1440+438)-1440&&!x.r.cx)check(!/awaiting departure/.test(x.r.st),id+' old history still awaiting departure');
  }
  const stale={d:today-3,kind:'a',flight:'TEST 1',std:(today-3)*1440,sta:(today-3)*1440+120,from:'Amsterdam',to:'Jakarta'};
  const unknown=H.legRow(stale,438,today,{arrival:(today+3)*1440,to:'Amsterdam',ac:'Airbus A350-1000'},profile);
  check(unknown.st==='Historical timing unavailable'&&unknown.atd===null&&unknown.ata===null&&unknown.eta===null,'Unresolved old history invents pending/actual events');
  const overnight={...stale,d:today,std:today*1440-495,sta:today*1440+360};
  const overnightUnknown=H.legRow(overnight,438,today,{arrival:(today+3)*1440,to:'Amsterdam',ac:'Airbus A350-1000'},profile);
  check(overnightUnknown.st==='Historical timing unavailable','Yesterday departure with today arrival still awaiting departure after STA');
  const completed=H.legRow(stale,438,today,null,profile);check(completed.ata!=null&&/Landed/.test(completed.st),'Normal completed history lost');
  JN_WORLD.hide();check(JN_MAP.focus('GA 18'),'GA18 focus failed');return {issues};
 });
 assert.deepEqual(result.issues,[]);assert.deepEqual(errors,[]);
 await page.locator('#card .v7-strip').click();await page.locator('#card [data-v57-tab="rotation"]').click();await page.locator('#cWorld').scrollIntoViewIfNeeded();
 const controls=await page.evaluate(()=>{const a=document.querySelector('#cFol').getBoundingClientRect(),b=document.querySelector('#cWorld').getBoundingClientRect(),card=document.querySelector('#card').getBoundingClientRect();return {a:{x:a.x,y:a.y,width:a.width,bottom:a.bottom},b:{x:b.x,y:b.y,width:b.width,right:b.right},card:{x:card.x,right:card.right},background:getComputedStyle(document.querySelector('#cWorld')).backgroundColor}});
 assert(Math.abs(controls.a.x-controls.b.x)<1&&Math.abs(controls.a.width-controls.b.width)<1,'Tracking controls have mismatched widths');
 assert(controls.b.y-controls.a.bottom>=7,'Tracking controls touch or overlap');assert(controls.b.right<=controls.card.right&&controls.b.x>=controls.card.x,'World button exceeds card');
 assert.equal(controls.background,'rgba(0, 0, 0, 0)');
 await page.locator('#cFol').click();assert.equal(await page.locator('#cFol').textContent(),'Follow aircraft');
 await page.locator('#cFol').click();assert.equal(await page.locator('#cFol').textContent(),'Following aircraft');
 await page.locator('#cWorld').click();await page.waitForFunction(()=>JN_WORLD.on&&JN_WORLD.selId()==='GA 18');
 assert.deepEqual(errors,[]);console.log('PASS: full destination coverage, GA552 trail and fallback, filed southern STAR handoffs, honest old history, aligned mobile controls and tracking actions');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
