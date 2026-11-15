/* Simulated bookings: deterministic, reversible references, and an exact match with the live load model. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext(),errors=[];
 await ctx.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}}});
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>window.GA_DEMAND&&typeof search==='function');
 const r=await p.evaluate(()=>{
  const out={bad:[],n:0,pnr:0,refs:new Set(),chan:{}};
  const routes=[['JKT','DPS'],['JKT','SIN'],['SUB','JKT'],['JKT','KIX'],['JKT','AMS'],['JKT','JED'],['DPS','JKT']];
  const check=(l,cabin)=>{
   const t=lp(l.dep,l.from),li=loadInfo(l,cabin),a=GA_DEMAND.generate(l,cabin),first=JSON.stringify(a);
   GA_DEMAND.clear();if(JSON.stringify(GA_DEMAND.generate(l,cabin))!==first)out.bad.push('nondeterministic '+l.id);
   out.n++;
   const vis=GA_DEMAND.visible(l,cabin).reduce((s,x)=>s+x.seats,0);
   if(vis!==li.model)out.bad.push(l.id+' '+cabin+' dout '+(t.day-TD)+' visible '+vis+' model '+li.model);
   if(a.reduce((s,x)=>s+x.seats,0)>li.cap)out.bad.push('over cap '+l.id);
   for(const x of a){
    out.pnr++;
    if(out.refs.has(x.ref))out.bad.push('dup ref '+x.ref);
    out.refs.add(x.ref);
    const back=GA_DEMAND.resolve(x.ref);
    if(!back||back.ref!==x.ref||back.total!==x.total||back.flight!==x.flight)out.bad.push('resolve '+x.ref);
    if(!(x.total>0&&x.fare>0))out.bad.push('price '+x.ref);
    if(x.bookedAt>x.dep||x.bookedAt<x.dep-340*1440)out.bad.push('booked after dep '+x.ref);
    out.chan[x.channel]=(out.chan[x.channel]||0)+x.seats;
   }
  };
  for(const [o,d] of routes)for(const X of [TD,TD+1,TD+5,TD+20,TD+75,TD+200])for(const it of search(o,d,X))for(const l of it.legs)for(const cabin of legCabs(l))check(l,cabin);
  return {bad:out.bad.slice(0,10),n:out.n,pnr:out.pnr,chan:out.chan};
 });
 assert.deepEqual(r.bad,[],JSON.stringify(r.bad));assert(r.n>50&&r.pnr>2000,JSON.stringify(r));assert(Object.keys(r.chan).length===6);
 /* the fare a generated booking pays matches the live fare ladder at the same load and days out */
 const par=await p.evaluate(()=>{const bad=[];let n=0;for(const [o,d] of [['JKT','DPS'],['JKT','KIX'],['JKT','AMS'],['SUB','JKT']])for(const X of [TD+1,TD+10,TD+40,TD+120]){const it=search(o,d,X)[0];if(!it||it.legs.length!==1)continue;const l=it.legs[0];for(const c of fares(it)){const li=loadInfo(l,c.k);for(const f of c.fam){const s=(f.subs&&f.subs.find(x=>x.left>0))||(f.subs||[]).at(-1)||{ratio:1};const g=GA_DEMAND.fareAt(l,c.k,f.n,s,li.sold,li.dout);n++;if(Math.abs(g/f.p-1)>0.001)bad.push(l.id+' '+f.n+' '+Math.round(f.p)+' '+Math.round(g))}}}return {n,bad:bad.slice(0,6)}});
 assert.deepEqual(par.bad,[],JSON.stringify(par));assert(par.n>=20,JSON.stringify(par));
 /* codec round trip and rejects */
 assert.deepEqual(await p.evaluate(()=>{const c=GA_DEMAND;return[c.decodeRef(c.encodeRef(202,TD+9,2,311)),c.decodeRef('ZZZZZZZ'),c.resolve('GA1234'),c.resolve('0000000')]}),[{fnum:202,D:await p.evaluate(()=>TD+9),ci:2,idx:311},null,null,null]);
 console.log('demand ok',JSON.stringify({legsCabins:r.n,bookings:r.pnr,chan:r.chan}));assert.deepEqual(errors,[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
