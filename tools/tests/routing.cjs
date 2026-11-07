const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {distance,exclusions}=require('../world/geometry'),root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const R=JSON.parse(source.match(/const WORLD_ROUTES=(.*?);\/\*WORLD_ROUTES:END/)[1]),data=require('../world/routes.json'),{N}=require('../world/graph'),geo=exclusions(require('../world/avoid.json'));
assert.equal(geo.clear([26.53,53.96],[26.54,54.85]),false,'Iran crossing missed');
assert.equal(geo.clear([41.13,29.14],[43.23,27.82]),false,'Black Sea crossing missed');
assert.equal(exclusions([{n:'thin',b:[100.099,-1,100.101,1],r:[[100.099,-1],[100.101,-1],[100.101,1],[100.099,1]]}]).clear([0,100],[0,100.2]),false,'Thin polygon crossing missed between samples');
let count=0;
for(const [city,r] of Object.entries(R))for(const dir of ['o','i']){
 assert.equal(r[dir].length,1,city+' manufactured alternatives');assert.deepEqual(r[dir],data[city][dir]);
 for(const p of r[dir]){count++;const P=dir==='o'?[N.JKT,...p]:[...p,N.JKT];for(let i=1;i<P.length;i++)assert(geo.clear(P[i-1],P[i]),`${city} ${dir} crosses exclusion`)}
}
assert(data.Melbourne.li/data.Melbourne.gc<1.03);assert(data.Medina.li/data.Medina.gc<1.02);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('https://northshore.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});
 if(f.endsWith('index.html'))return r.fulfill({contentType:'text/html',body:source.replace('window.JN_WORLD={','window.__routingTest={getLegs,routeFor,legPath,ensureSA,sample};window.JN_WORLD={').replace('airGateOf,airRwy,airShortTransition};','airGateOf,airRwy,airShortTransition,airStar,airSid,posAt};')});return r.fulfill({path:f});});
await p.goto('https://northshore.test/index.html?clock=2026-11-07T17:40&incidents=off');
await p.waitForFunction(()=>window.AIRCORE?.AIR.D?.length&&window.__routingTest);
const result=await p.evaluate(()=>{
 const A=AIRCORE,W=__routingTest,issues=[],summary=[],check=(v,m)=>{if(!v)issues.push(m)};
 for(const fl of ['09','27'])for(const rk of ['N','S']){
  const O=A.airXY(-5.26,105.19),sid=A.airSid('W',rk,fl,0),star=A.airStar('W',rk,fl,0);
  const dep=A.airShortTransition(sid,O,'dep'),arr=A.airShortTransition(star,O,'arr');
  check(!!dep&&dep.i<sid.iG,'TKG cannot leave SID before outer gate '+fl+rk);
  check(!!arr&&arr.i>star.iG0,'TKG cannot join STAR inside outer gate '+fl+rk);
  if(dep)check(sid.S[dep.i]>=15000,'Initial climb skipped');
  if(arr)check(star.total-star.S[arr.i]>=23000,'Final approach skipped');
  summary.push({runway:fl+rk,departKm:dep&&Math.round(sid.S[dep.i]/1000),arriveRemainingKm:arr&&Math.round((star.total-star.S[arr.i])/1000)});
 }
 const departures=A.AIR.D.filter(t=>t.e.d.city==='Bandar Lampung'),arrivals=A.AIR.A.filter(t=>t.e.a.city==='Bandar Lampung');
 check(departures.length>0&&arrivals.length>0,'No TKG live tracks');
 for(const t of departures){check(t.tail&&t.iEnd<t.sd.iG,'TKG live departure still forced through gate');const cut=t.tE+t.sd.E[t.iEnd]/t.sf,before=A.posAt(t,cut-.01),after=A.posAt(t,cut+.01);
  check(before&&after&&Math.hypot(after.x-before.x,after.y-before.y)<20,'Departure cut discontinuity');
  const end=A.posAt(t,t.t1-.01);check(end&&Math.hypot(end.x-t.tail.D[0],end.y-t.tail.D[1])<50,'Short departure misses airport');
 }
 for(const t of arrivals){check(t.hs&&t.iJ>t.st.iG0,'TKG live arrival still forced through gate');const before=A.posAt(t,t.tAtJ-.01),after=A.posAt(t,t.tAtJ+.01);
  check(before&&after&&Math.hypot(after.x-before.x,after.y-before.y)<20,'Arrival join discontinuity '+JSON.stringify({id:t.id,iJ:t.iJ,iM:t.st.iM,k:t.k,tAtJ:t.tAtJ,tEn:t.tEn,tEx:t.tEx,before,after}));
  if(t.k)check(t.iJ<=t.st.iM,'Holding fix bypassed');
 }
 for(const l of W.getLegs().filter(l=>['QG 5606','GA 969','QF 39'].includes(l.id)&&l.d===SIMCORE.FLEET.day)){
  const r=W.routeFor(l);check(JN_ROUTE.altOf(l.id,3,l.dir)===0,'Arbitrary alternate remains');
  if(l.hand){const P=W.legPath(l,r);check(P.len<r.len*1.05,'Handoff adds excessive distance '+l.id);
   const H=l.dir==='in'?[P.lat.at(-1),P.lon.at(-1)]:[P.lat[0],P.lon[0]];check(Math.hypot(H[0]-l.hand[0],H[1]-l.hand[1])<1e-6,'Handoff endpoint mismatch');}
 }
 const simple=W.sample([[-6,106],[-1,104]],1),plain=W.sample([[-6,106],[-1,104]],0);
 check(JSON.stringify(simple.lon)===JSON.stringify(plain.lon),'Artificial lateral offset remains');
 return {issues,summary,departures:departures.length,arrivals:arrivals.length};
});
assert.deepEqual(result.issues,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({routes:count,...result}));
console.log('PASS: all fictional exclusions, route selection, TKG partial procedures on both runways, track continuity and handoff geometry');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
