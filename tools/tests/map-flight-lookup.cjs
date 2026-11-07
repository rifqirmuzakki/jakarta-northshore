/* Focused regressions for dated map lookups and physical-airport time zones. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://northshore.test/**',r=>{const file=path.join(root,new URL(r.request().url()).pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return r.fulfill({status:404,body:''});
  if(file.endsWith('index.html'))return r.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8')
   .replace('window.JN_WORLD={','window.__worldLookupTest={times,renderCard,selectLeg:l=>{sel=l;cardExp=true;renderCard()}};window.JN_WORLD={')
   .replace('function render(H){','window.__lookupHistoryTest={flightRows,localAt,tzLabel};function render(H){')});
  return r.fulfill({path:file});
 });
 await p.goto('https://northshore.test/index.html?clock=2026-11-07T17:40&incidents=off');
 await p.waitForFunction(()=>window.SIMCORE?.FLEET&&window.__worldLookupTest);
 const checks=await p.evaluate(()=>{
  const problems=[],check=(v,m)=>{if(!v)problems.push(m)},S=SIMCORE,H=__lookupHistoryTest,T=__worldLookupTest,day=S.FLEET.day,now=day*1440+1060;
  const winter=Date.UTC(2026,10,7,12)/60000+420,summer=Date.UTC(2026,6,7,12)/60000+420;
  check(H.localAt(winter,'Boston').min===7*60,'Boston winter clock');
  check(H.localAt(summer,'Boston').min===8*60,'Boston summer clock');
  check(H.tzLabel('Boston',winter)==='UTC-5','Boston winter offset');
  check(H.tzLabel('Boston',summer)==='UTC-4','Boston summer offset');
  check(airportCodeForCity('Geneva')==='GVA','Geneva code');
  check(airportCodeForCity('Vancouver')==='YVR'&&airportCodeForCity('Barcelona')==='BCN','Physical airport code fallback');
  for(const id of ['GA 15','GA 25']){
   const active=S.worldLegs().find(l=>l.id===id&&l.std+14<now&&l.sta-8>now);
   check(!!active,`${id} active instance missing`);if(!active)continue;
   const identity={day:active.d,from:active.from,to:active.to},ft=JN_FLIGHT_TIMES(id,active.scheduledStd,identity);
   check(ft?.std===active.scheduledStd,`${id} wrong dated STD`);
   check(ft?.day===active.d&&ft?.from===active.from&&ft?.to===active.to,`${id} wrong sector`);
   check(ft?.ata===null,`${id} borrowed completed ATA`);
   check(ft?.eta>now,`${id} ETA is past`);
   check(JN_FLIGHT_TIMES(id,active.scheduledStd+1,identity)===null,'Nearest-time fallback still allowed');
   check(JN_FLIGHT_TIMES(id,active.scheduledStd,{...identity,day:active.d-1})===null,'Wrong-day match allowed');
   check(JN_FLIGHT_TIMES(id,active.scheduledStd,{...identity,from:'Boston'})===null,'Wrong-sector match allowed');
   check(JN_FLIGHT_TIMES(id,active.scheduledStd+60*1440)===null,'Missing instance borrowed history');
   check(JN_FLIGHT_TIMES(id)===null,'Unidentified instance returned times');
   // Cache must distinguish consecutive instances of one flight immediately.
   const old=S.worldLegs().find(l=>l.id===id&&l.d===active.d-1);
   const oldTimes=T.times(old),newTimes=T.times(active);
   check(T.times({...active,std:active.std+90})?.std===active.scheduledStd,'Delay changed lookup identity');
   check(oldTimes?.day===old.d&&newTimes?.day===active.d,'Cache leaked across dates');
   check(JN_WORLD.legOf(id)?.d===active.d,'World selection chose landed daily instance');
   const cardLeg={...active,off:active.std+14,land:active.sta-8};
   T.selectLeg(cardLeg);
   const text=document.querySelector('#card').innerText;
   check(/ETA JKT/.test(text)&&!/ATA JKT/.test(text),`${id} airborne card shows ATA`);
   check(!/0h 00m/.test(text),`${id} zero remaining time`);
  }
  // Two sectors sharing one flight number must retain independent identities.
  const rows=H.flightRows('GA 25',1060).filter(x=>x.r.l.d===day+1);
  for(const {r} of rows){const l=r.l,ft=JN_FLIGHT_TIMES('GA 25',l.std,{day:l.d,from:l.from,to:l.to});
   check(ft?.std===l.std&&ft?.from===l.from&&ft?.to===l.to,'Physical sector lookup mismatch');}
  check(rows.length===2,'Return sectors missing');
  return problems;
 });
 assert.deepEqual(checks,[]);assert.deepEqual(errors,[]);
 await p.goto('https://northshore.test/index.html?clock=2026-11-07T17:40&incidents=off#/flight/GA25');
 await p.waitForFunction(()=>document.querySelector('#v74-ac')?.innerText.includes('Boston'));
 const boston=await p.locator('#v74-ac').innerText();assert.match(boston,/Boston\s+BOS\s+UTC-5/);
 console.log('PASS: Boston DST + rendered flight page; exact dated sector lookups; cache isolation; active instance selection; airborne ETA cards');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
