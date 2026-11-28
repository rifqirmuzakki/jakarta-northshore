/* Flown track: small daily shifts and storm detours that leave both handoffs exactly where they were. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://northshore.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname);
  if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});
  if(f.endsWith('index.html'))return r.fulfill({contentType:'text/html',body:source.replace('window.JN_WORLD={','window.__trk={getLegs,routeFor,legPath,legPos,gcd};window.JN_WORLD={')});
  return r.fulfill({path:f})});
 let detours=0,checked=0,wetD=0,wetN=0,dryD=0,dryN=0;
 for(const clock of ['2026-12-10T08:00','2026-07-10T08:00']){
  await p.goto('https://northshore.test/index.html?clock='+clock+'&incidents=off');
  await p.waitForFunction(()=>window.__trk&&window.JN_PHYS&&SIMCORE.FLEET,null,{timeout:90000});
  const r=await p.evaluate(()=>{const T=__trk,out={bad:[],n:0,det:0,maxExtra:0,ext:[]};
   for(const l of T.getLegs()){if(!l.hand||l.noWorld||l.cx||!l.city)continue;const rt=T.routeFor(l);if(!rt||rt.len<3000)continue;
    const P=T.legPath(l,rt),len=P.len,first=[P.lon[0],P.lat[0]],last=[P.lon[P.lon.length-1],P.lat[P.lat.length-1]];
    const save=JN_PHYS.track;JN_PHYS.track=()=>null;l._pa=null;const P0=T.legPath(l,rt);JN_PHYS.track=save;l._pa=null;T.legPath(l,rt);
    const d0=T.gcd([P0.lat[0],P0.lon[0]],[P.lat[0],P.lon[0]]),d1=T.gcd([P0.lat[P0.lat.length-1],P0.lon[P0.lon.length-1]],[P.lat[P.lat.length-1],P.lon[P.lon.length-1]]);
    if(d0>0.5||d1>0.5)out.bad.push(l.id+' handoff moved '+d0.toFixed(2)+'/'+d1.toFixed(2)+' km');
    let seg=0;for(let i=1;i<P.lon.length;i++)seg=Math.max(seg,T.gcd([P.lat[i-1],P.lon[i-1]],[P.lat[i],P.lon[i]]));
    if(seg>700)out.bad.push(l.id+' path has a '+Math.round(seg)+' km gap');
    const extra=len-P0.len;if(extra<-60||extra>500)out.bad.push(l.id+' flown distance changed by '+Math.round(extra)+' km');
    const q0=T.legPos(l,l.off,rt),q1=T.legPos(l,l.land,rt);if(T.gcd([q0[1],q0[0]],[P.lat[0],P.lon[0]])>1||T.gcd([q1[1],q1[0]],[P.lat[P.lat.length-1],P.lon[P.lon.length-1]])>1)out.bad.push(l.id+' marker is off its own line at a handoff');
    const tk=JN_PHYS.track(l.city,l.id,l.d,l.scheduledStd??l.std);out.n++;if(tk&&tk.det)out.det++;out.maxExtra=Math.max(out.maxExtra,extra)}
   return out});
  assert.deepEqual(r.bad.slice(0,6),[],clock);checked+=r.n;detours+=r.det;if(clock.startsWith('2026-12')){wetD=r.det;wetN=r.n}else{dryD=r.det;dryN=r.n}
  console.log(clock,'legs',r.n,'with a storm detour',r.det,'longest extra km',Math.round(r.maxExtra))}
 assert(checked>40,'need coverage');assert(detours>0,'storm detours should occur');
 assert(wetD/wetN>dryD/dryN,'wet season should have more detours than the dry season');
 assert.deepEqual(errors,[]);console.log('PASS: flown track bends sideways, detours around storms more in the wet season, handoffs and marker unchanged');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
