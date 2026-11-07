/* Regressions for altitude handoffs, runaway ETAs and map/history identity. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(process.env.TELEMETRY_SOURCE||path.join(root,'index.html'),'utf8');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://northshore.test/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  if(file.endsWith('index.html'))return route.fulfill({contentType:'text/html',body:source
   .replace('window.JN_WORLD={','window.__telemetryTest={getLegs,routeFor,legPos,est,times,tailFor,draw,nowAbs,selectLeg:l=>{sel=l;cardExp=true;renderCard()}};window.JN_WORLD={')
   .replace('function render(H){','window.__historyTelemetry={flightRows,historyLoadProfile};function render(H){')});
  return route.fulfill({path:file});});
 for(const clock of ['2026-11-07T01:06','2026-11-10T01:06','2026-11-10T06:47']){
  await page.goto('https://northshore.test/index.html?clock='+clock+'&incidents=off');
  await page.waitForFunction(()=>window.__telemetryTest&&window.SIMDBG&&SIMCORE.FLEET);
  const result=await page.evaluate(()=>{
   JN_SCN.setPaused(true);SIMDBG.pause();JN_WORLD.show();
   const W=__telemetryTest,H=__historyTelemetry,now=W.nowAbs(),day=SIMCORE.FLEET.day,issues=[],details=[];
   const check=(v,m)=>{if(!v)issues.push(m)};
   const profile=H.historyLoadProfile();check(profile.every(p=>p.arrivalHold<240),'Overnight stand locks contaminated arrival-delay profile');
   check(SIMCORE.ENTS.every(e=>!Number.isFinite(e.td)||e.td<2*86400),'Daytime arrival advanced to sentinel timestamp');
   for(const id of ['GA 24','GA 20','GA 2','GA 23']){
    const l=JN_WORLD.legOf(id),r=l&&W.routeFor(l),ft=l&&W.times(l);check(!!ft,id+' exact flight record missing');if(!ft||!r)continue;
    check(ft.eta>now&&ft.eta-now<24*60,id+' implausible time-to-go');
    check(ft.atd!=null&&ft.atd<=now,id+' airborne flight is awaiting departure in history');
    const rows=H.flightRows(id,now%1440),match=rows.find(o=>o.r.l.d===l.d&&o.r.l.std===l.scheduledStd&&o.r.l.from===l.from&&o.r.l.to===l.to);
    check(!!match&&ft.reg===match.reg&&W.tailFor(l)===match.reg,id+' registration disagrees with dated history sector');
    const tail=SIMCORE.tailHistory(ft.reg);
    check(tail?.legs.some(x=>x.flight===id&&x.d===l.d&&x.std===l.scheduledStd&&x.from===l.from&&x.to===l.to),id+' linked aircraft history lacks physical flight');
    JN_WORLD.select(id);W.draw();W.selectLeg(l);
    const card=document.querySelector('#card'),reg=card.querySelector('.v73-regl');
    check(reg?.getAttribute('href')==='#/aircraft/'+match?.reg,id+' rendered registration link disagrees with history');
    const remaining=[...card.querySelectorAll('.jc-gate>div')].find(x=>x.querySelector('small')?.textContent==='Time to go')?.querySelector('b')?.textContent;
    const mins=Math.max(0,Math.round(ft.eta-now));check(remaining===Math.floor(mins/60)+'h '+String(mins%60).padStart(2,'0')+'m',id+' rendered time-to-go differs from flight history');
    const E=W.est(l,(now-l.off)/(l.land-l.off),r);
    if(id==='GA 24')check(E.alt>=30000,'GA24 restarted climb after SID handoff');
    details.push({id,reg:ft.reg,alt:E.alt,remaining});
   }
   // Check both directions across the actual terminal/World altitude boundary.
   let handoffs=0;
   for(const l of W.getLegs().filter(l=>l.d===day&&!l.noWorld&&l.hand)){
    const r=W.routeFor(l);if(!r||r.len<1000)continue;
    const e=JN_MAP.ent(l.id),tr=l.dir==='out'?e?.dT:e?.aT;if(!tr)continue;
    const t=l.dir==='out'?tr.t1:tr.t0,q=AIRCORE.posAtOff(tr,t),u=l.dir==='out'?0:1;
    check(Math.abs(W.est(l,u,r).alt-q.alt)<=100,l.id+' altitude jumps at '+l.dir+' handoff');
    for(const u of [0,.01,.05,.5,.95,.99,1]){const E=W.est(l,u,r);check(Number.isFinite(E.alt)&&E.alt>=0&&E.alt<=45000&&E.gs>0,l.id+' invalid altitude/speed profile')}
    handoffs++;
   }
   check(handoffs>20,'Insufficient handoff coverage');
   const r=W.routeFor(JN_WORLD.legOf('GA 2')),plain={dir:'out',off:0,land:600};
   check(W.est(plain,0,r).alt===0&&W.est(plain,1,r).alt===0,'Unanchored profile does not start/end at ground');
   check(W.est(plain,.01,r).ph==='Climbing'&&W.est(plain,.99,r).ph==='Descending','Climb/descent phases incorrect');
   // Compact local cards show airborne altitude; stand labels remain on ground.
   if(Math.floor(now%1440)===407){
    JN_WORLD.hide();check(JN_MAP.track('ID 7121'),'ID7121 track missing');
    const text=document.querySelector('#card .js-gate')?.textContent;
    check(/^(FL\d+|[\d,]+ ft)$/.test(text||''),'ID7121 airborne card still shows stand instead of altitude');
   }
   return {issues,details,handoffs};
  });
  assert.deepEqual(result.issues,[],clock);assert.deepEqual(errors,[]);console.log('PASS',clock,JSON.stringify(result));
  // Follow the actual registration link from GA23 into the rendered aircraft page.
  await page.evaluate(()=>{const W=__telemetryTest;JN_WORLD.show();const l=JN_WORLD.legOf('GA 23');JN_WORLD.select(l.id);W.draw();W.selectLeg(l);document.querySelector('#card .v73-regl').click()});
  await page.waitForFunction(()=>document.querySelector('#v74-ac:not([hidden]) .v81-stat')?.textContent.includes('GA 23'));
  assert.match(await page.locator('#v74-ac .v81-stat').textContent(),/GA 23.*MAD → JKT/);
  assert(await page.locator('#v74-ac .v81-leg').filter({hasText:'GA 23'}).count()>0,'Rendered aircraft history lacks GA23');
  assert.deepEqual(errors,[]);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
