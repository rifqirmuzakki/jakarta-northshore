/* Departure paths must avoid Jakarta land, including rounded turns and shortcuts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(process.env.SID_SOURCE||path.join(root,'index.html'),'utf8');
const boundary=JSON.parse(fs.readFileSync(path.join(root,'tools/world/jakarta-boundary.geojson'),'utf8'));
const {exclusions}=require('../world/geometry'),polygons=boundary.geometry.coordinates.map(p=>{const r=p[0],xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);return {n:'Jakarta',r,b:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}}),geo=exclusions(polygons);
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://northshore.test/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  if(file.endsWith('index.html'))return route.fulfill({contentType:'text/html',body:source.replace('airGateOf,airRwy,airShortTransition,airRouteTransitionPoint};','airGateOf,airRwy,airShortTransition,airRouteTransitionPoint,airSid,airDepartureClear,AIR_JAKARTA};')});
  return route.fulfill({path:file});});
 await page.goto('https://northshore.test/index.html?clock=2026-11-10T06:45&incidents=off');
 await page.waitForFunction(()=>window.AIRCORE?.AIR.D?.length);
 const result=await page.evaluate(()=>{
  const A=AIRCORE,paths=[],connectors=[],issues=[];
  for(const gate of Object.keys(A.AIR.G))for(const runway of ['N','S'])for(const flow of ['09','27'])for(const variant of [0,1,2]){
   const R=A.airSid(gate,runway,flow,variant),points=Array.from(R.X,(x,i)=>A.airLL(x,R.Y[i]));
   paths.push({id:[gate,runway,flow,variant].join('/'),points});
   const e=R.E0;if(Math.hypot(R.X[0]-e.x,R.Y[0]-e.y)>1e-6)issues.push('Runway-end anchor moved');
   const forward=(R.X[4]-R.X[0])*e.dx+(R.Y[4]-R.Y[0])*e.dy;if(forward<=0)issues.push('Initial climb reversed');
   for(const target of [[-6.8,106.5],[-5.26,105.19],[-7.79,110.43],[-31.94,115.97]]){
    const q=A.airShortTransition(R,A.airXY(...target),'dep');if(q)connectors.push({id:[gate,runway,flow,variant,target].join('/'),points:[A.airLL(...q.P),target]});
   }
  }
  for(const tr of A.AIR.D){const points=[];for(let t=tr.t0;t<tr.t1;t+=10){const q=A.posAtOff(tr,t);if(q)points.push(A.airLL(q.x,q.y))}const q=A.posAtOff(tr,tr.t1);if(q)points.push(A.airLL(q.x,q.y));paths.push({id:tr.id,points});}
  if(A.airDepartureClear(A.airXY(-5.9,106.85),A.airXY(-6.5,106.85)))issues.push('Direct Jakarta crossing allowed');
  if(!A.airDepartureClear(A.airXY(-5.9,106.5),A.airXY(-6.5,106.5)))issues.push('Western bypass blocked');
  return {paths,connectors,issues,box:A.AIR_JAKARTA};
 });
 assert.deepEqual(result.issues,[]);assert.deepEqual(errors,[]);
 for(const p of polygons)for(const [lon,lat] of p.r)assert(lon>result.box.west&&lon<result.box.east&&lat<result.box.north&&lat>result.box.south,'Jakarta envelope misses source boundary');
 const crossings=[];for(const route of [...result.paths,...result.connectors])for(let i=1;i<route.points.length;i++)if(!geo.clear(route.points[i-1],route.points[i])){crossings.push(route.id);break}
 assert.deepEqual(crossings,[],'Departure SID or connector crosses Jakarta');
 fs.writeFileSync('/tmp/jakarta-departure-paths.json',JSON.stringify(result));
 console.log('PASS: 72 SID variants, '+(result.paths.length-72)+' live departure tracks and '+result.connectors.length+' shortcuts avoid Jakarta boundary; runway anchors retained');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
