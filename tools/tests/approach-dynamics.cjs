/* QZ815 regression: flyable turns, continuous joins/descent, honest route cursors. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(process.env.APPROACH_SOURCE||path.join(root,'index.html'),'utf8');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://northshore.test/**',r=>{const file=path.join(root,new URL(r.request().url()).pathname);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return r.fulfill({status:404,body:''});
  return file.endsWith('index.html')?r.fulfill({contentType:'text/html',body:source.replace('airGateOf,airRwy,airShortTransition,airRouteTransitionPoint};','airGateOf,airRwy,airShortTransition,airRouteTransitionPoint,airStar,airLoop};')}):r.fulfill({path:file});});
 await page.goto('https://northshore.test/index.html?clock='+(process.env.APPROACH_CLOCK||'2026-11-08T08:33'));await page.waitForFunction(()=>window.AIRCORE?.AIR.A?.length);
 const result=await page.evaluate(()=>{
  const A=AIRCORE,issues=[],check=(v,m)=>{if(!v&&issues.length<70)issues.push(m)},angle=(a,b)=>Math.abs(((b-a+540)%360)-180),sample=(tr,t)=>A.posAtOff(tr,t),near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  let minSpeed=Infinity,maxBank=0,joins=0;
  for(const gate of Object.keys(A.AIR.G))for(const runway of ['N','S'])for(const flow of ['09','27'])for(const variant of [0,1,2,3]){
   const R=A.airStar(gate,runway,flow,variant),key=[gate,runway,flow,variant].join('/');
   for(let i=0;i<R.n;i++){minSpeed=Math.min(minSpeed,R.v[i]);check(R.v[i]>=71.9,key+' turn speed below 140 kt')}
   for(let i=1;i<R.n-1;i++){
    const ax=R.X[i]-R.X[i-1],ay=R.Y[i]-R.Y[i-1],bx=R.X[i+1]-R.X[i],by=R.Y[i+1]-R.Y[i],a=Math.hypot(ax,ay),b=Math.hypot(bx,by),turn=Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(a*b||1))));
    const bank=Math.atan(R.v[i]**2*turn/Math.max(1,(a+b)/2)/9.80665)*180/Math.PI;maxBank=Math.max(maxBank,bank);check(bank<=25.1,key+' turn exceeds 25 degree bank');
   }
   check(near({x:R.X[R.iM],y:R.Y[R.iM]},{x:A.AIR.G[gate].M[0],y:A.AIR.G[gate].M[1]})<1e-6,key+' STAR misses holding fix');
  }
  for(const tr of A.AIR.A){
   for(const [phase,t] of [['connector',tr.hs?tr.tAtJ:null],['hold entry',tr.k?tr.tEn:null],['hold exit',tr.k?tr.tEx:null],['final',tr.tS0]]){
    if(t==null)continue;const before=sample(tr,t-.05),after=sample(tr,t+.05);check(!!before&&!!after,tr.id+' missing '+phase+' pose');if(!before||!after)continue;
    check(near(before,after)<=32,tr.id+' position jumps at '+phase+': '+near(before,after).toFixed(1));
    check(Math.abs(after.alt-before.alt)<=12,tr.id+' altitude jumps at '+phase+': '+(after.alt-before.alt).toFixed(1));
    check(angle(before.hd,after.hd)<=.65,tr.id+' heading snaps at '+phase+': '+angle(before.hd,after.hd).toFixed(2));joins++;
    const bank=Math.atan(near(before,after)/.1*angle(before.hd,after.hd)*Math.PI/180/.1/9.80665)*180/Math.PI;check(bank<=27,tr.id+' excessive bank at '+phase+': '+bank.toFixed(1));
   }
   if(tr.hs){const P=tr.hs.path;
    for(let i=1;i<tr.hE.length;i++){const v=tr.hs.ds/(tr.hE[i]-tr.hE[i-1]);check(v>=71.9,tr.id+' connector turn below 140 kt');
     if(P&&i<P.n-1){const ax=P.X[i]-P.X[i-1],ay=P.Y[i]-P.Y[i-1],bx=P.X[i+1]-P.X[i],by=P.Y[i+1]-P.Y[i],turn=Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by)||1))));
      const next=tr.hs.ds/(tr.hE[i+1]-tr.hE[i]),bank=Math.atan(Math.max(v,next)**2*turn/tr.hs.ds/9.80665)*180/Math.PI;check(bank<=25.1,tr.id+' connector exceeds 25 degree bank');
     }
    }
   }
   const end=sample(tr,tr.tS0-.05);check(end?.alt>900,tr.id+' descends to ground before final approach');check(tr.tTD===tr.e.td,tr.id+' runway landing time changed');
  }
  const tr=A.AIR.A.find(t=>t.id==='QZ 815');check(!!tr,'QZ815 missing');
  let qzBank=0,qzVspeed=0;
  for(let t=tr.tAtJ+5;t<tr.tS0;t+=5){const a=sample(tr,t-5),b=sample(tr,t);if(!a||!b)continue;const speed=near(a,b)/5,bank=Math.atan(speed*angle(a.hd,b.hd)*Math.PI/180/5/9.80665)*180/Math.PI;
   qzBank=Math.max(qzBank,bank);qzVspeed=Math.max(qzVspeed,Math.abs(b.alt-a.alt)*12);check(bank<=27,'QZ815 inferred bank exceeds allowance');check(Math.abs(b.alt-a.alt)*12<=3500,'QZ815 excessive vertical rate');
  }
  const points=d=>[...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m=>({x:+m[1],y:+m[2]}));
  for(const t of [(tr.t0+tr.tAtJ)/2,tr.k?(tr.tEn+tr.tEx)/2:tr.tAtJ+10,tr.tEx+60,(tr.tS0+tr.tTD)/2]){
   const q=sample(tr,t),svg=A.routeSVG(tr,q),past=points(/class="a-sel past arr" d="([^"]*)"/.exec(svg)[1]),future=points(/class="a-sel fut arr" d="([^"]*)"/.exec(svg)[1]);
   check(near(past.at(-1),q)<1.5,'Selected solid path does not end at aircraft');check(near(future[0],q)<1.5,'Selected future path does not start at aircraft');
   if(t<tr.tAtJ)check(!past.some(p=>near(p,{x:tr.hs.J[0],y:tr.hs.J[1]})<1.5),'Unflown connector drawn as already flown');
  }
  return {issues,joins,tracks:A.AIR.A.length,minSpeed,maxBank,qzBank,qzVspeed};
 });
 assert.deepEqual(result.issues,[]);assert.deepEqual(errors,[]);console.log('PASS:',JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
