/* Run with node tools/tests/multileg.cjs. Uses installed Playwright + Chromium.
   Local files are served through interception; no server or external data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
let scripts=0;for(const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){new vm.Script(m[1]);scripts++}
async function main(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://northshore.test/**',async route=>{
  const file=path.join(root,new URL(route.request().url()).pathname);
  if(file.endsWith('/index.html'))return route.fulfill({contentType:'text/html',body:source
   .replace('function render(H){','window.__historyTest={legRow,flightRows,localAt,historyLoadProfile};function render(H){')
   .replace('window.__DB=()=>({INF,OUTF,tBlk});','window.__DB=()=>({INF,OUTF,tBlk,multiItinerary,V186_MULTILEG,tCoreVisits,tVisitOnDay,tDow,effOn,tailLegs,opsChain});')});
  if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
  return route.fulfill({status:404,body:''});
 });
 let fleetCounts=[];
 for(const date of ['2026-11-06','2026-11-16','2026-11-18','2026-11-22','2026-03-08','2026-10-25']){
  await p.goto(`https://northshore.test/index.html?clock=${date}T20:00&incidents=off`);
  await p.waitForFunction(()=>window.SIMCORE?.FLEET&&window.__historyTest);
  const result=await p.evaluate(()=>{
   const S=SIMCORE,db=__DB(),H=__historyTest,day=S.FLEET.day,now=20*60,issues=[],routes=new Set(),pairs=[],actualIssues=[];
   const check=(ok,msg)=>{if(!ok)issues.push(msg)};
   S.FLEET.F.forEach(fl=>fl.tails.forEach(t=>{
    const h=S.tailHistory(t.reg),legs=h.legs.slice().sort((a,b)=>a.std-b.std);
    // Verify every scheduled leg around a multi-leg visit, including other routes.
    legs.forEach((l,i)=>{const prev=legs[i-1];if(prev&&(prev.multi||l.multi)){
     check(l.std>=prev.sta+25,`${t.reg} overlap ${prev.flight}/${l.flight}`);
     check(prev.to===l.from,`${t.reg} airport discontinuity`);
    }});
    let prior=null;
    for(const l of legs){const r=H.legRow(l,now,day,prior,{});prior={...r.nextState,ac:h.ac};
     if(l.multi&&r.ata!=null){check(r.tone!=='live','Completed sector LIVE');check(r.ata<=day*1440+now,'Future ATA');}
     if(l.multi)actualIssues.push({reg:t.reg,l,r});
    }
    for(const [d,seq] of t.hist)for(const v of seq){if(v.kind!=='multi')continue;
     routes.add(v.d.city);const physical=db.multiItinerary(v.d,d),m=db.V186_MULTILEG[v.d.city];
     check(v.E-v.S===m.blocks.reduce((a,b)=>a+b)+m.stops.reduce((a,b)=>a+b),'Duration mismatch');
     for(let i=1;i<4;i++)check(physical[i].std===physical[i-1].sta+m.stops[i-1],'Stop mismatch');
     if(v.d.id==='GA 10'&&d===day)pairs.push({reg:t.reg,physical:physical.map(l=>({from:l.from,to:l.to,std:l.std,sta:l.sta,localStd:H.localAt(l.std,l.from),localSta:H.localAt(l.sta,l.to)}))});
    }
   }));
   const byReg=new Map();for(const x of actualIssues){const prev=byReg.get(x.reg);
    if(prev){check(x.r.etd>=prev.r.nextState.arrival+(x.l.minTurn??75),`Simulated turn violated ${x.reg} ${prev.l.flight} ${prev.l.from}/${prev.l.to} -> ${x.l.flight} ${x.l.from}/${x.l.to}: ${x.r.etd-prev.r.nextState.arrival} < ${x.l.minTurn??75}`);
      if(x.r.atd!=null&&prev.r.ata!=null)check(x.r.atd>prev.r.ata,'Simulated overlap');}
    byReg.set(x.reg,x);
   }
   for(const e of S.ENTS){if(db.V186_MULTILEG[(e.a||e.d).city]){
    check(!(e.a&&e.d),'Multi-leg ground movements paired');check(!!e.tail,'Unassigned multi-leg movement');
    const legs=S.tailHistory(e.tail)?.legs||[];
    if(e.a)check(legs.some(l=>l.flight===e.a.id&&l.to==='Jakarta'&&l.sta===day*1440+e.a.t),'Arrival does not match physical tail');
    if(e.d)check(legs.some(l=>l.flight===e.d.id&&l.from==='Jakarta'&&l.std===day*1440+e.d.t),'Departure does not match physical tail');
   }}
   const out=S.ENTS.find(e=>e.d?.id==='GA 10'),incoming=S.ENTS.find(e=>e.a?.id==='GA 11');
   if(out&&incoming)check(out.tail!==incoming.tail,'Same-day GA10/11 same tail');
   // Flight and aircraft histories use identical sector objects / timing calculation.
   const rows=H.flightRows('GA 11',now);check(rows.every(x=>x.r.l.multi),'Legacy GA11 boundary history');
   const v=db.tCoreVisits().find(v=>v.d?.id==='GA 10');
   const weekly={...v,d:{...v.d,days:'1'}};
   check(!!db.tVisitOnDay(weekly,day)=== (db.tDow(day)===1),'Outbound operating pattern ignored');
   // Increasing an input must move later milestones by exactly that amount,
   // including across midnight; there is no hidden return-day rule.
   const m=db.V186_MULTILEG[v.d.city],base=db.multiItinerary(v.d,day);
   m.blocks[1]+=1600;m.stops[1]+=37;
   const changed=db.multiItinerary(v.d,day);
   m.blocks[1]-=1600;m.stops[1]-=37;
   check(changed[3].sta-base[3].sta===1637,'Return does not derive from physical inputs');
   // A late Jakarta departure must travel through every onward and return leg.
   const tail=[...S.FLEET.F.values()].flatMap(f=>f.tails).find(t=>t.seq.some(v=>v.d?.id==='GA 10'));
   check(!!tail,'GA10 physical aircraft missing');
   if(tail){const ls=db.tailLegs(tail,[day,day+1,day+2]);
    const delayed=db.opsChain(ls,l=>l.day===day&&l.f.id==='GA 10'?300:0,()=>0);
    const ret=delayed.find(l=>l.multi&&l.multiIndex===3&&l.day===day+2);
    check(ret?.dly===300,'Outbound delay lost before return');
   }
   if(day===Math.round(Date.UTC(2026,10,16)/86400000))check(!S.INF.some(f=>f.id==='GA 61'||f.id==='GA 63'),'Return exists before first outbound completes');
   return {issues,routes:[...routes],pairs,counts:S.FLEET.fleets.filter(f=>f.ac==='Airbus A350-1000'),error:window.JN_TAIL_ERROR};
  });
  assert.equal(result.error,undefined);assert.deepEqual(result.issues,[],date);
  if(date==='2026-11-18'||date==='2026-11-22')assert.equal(result.routes.length,10);
  if(date>='2026-11-16')fleetCounts.push(result.counts[0].n);
  console.log(date,JSON.stringify({routes:result.routes.length,A35K:result.counts[0],GA10Tail:result.pairs[0]?.reg}));
  if(date==='2026-11-06'){
   const reg=result.pairs[0].reg;
   await p.goto(`https://northshore.test/index.html?clock=${date}T20:00&incidents=off#/aircraft/${reg}`);
   await p.waitForFunction(()=>!document.querySelector('#v74-ac')?.hidden);
   assert.match(await p.locator('#v74-ac').innerText(),/Chicago/);
  }
 }
 assert.equal(new Set(fleetCounts).size,1,'Fleet varies by viewed date');assert.deepEqual(errors,[]);
 console.log(`PASS: ${scripts} embedded scripts; physical allocation, history, ground movement and operating patterns`);
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
