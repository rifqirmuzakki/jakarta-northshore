/* Simulated bookings: deterministic, reversible references, an exact match with the live load model, cancellations, changes, no-shows and revenue. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext(),errors=[];
 await ctx.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}}});
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>window.GA_DEMAND&&typeof search==='function');
 const r=await p.evaluate(()=>{
  const out={bad:[],n:0,pnr:0,refs:new Set(),chan:{},base:0,cx:0,chg:0,ns:0,flown:0};
  const routes=[['JKT','DPS'],['JKT','SIN'],['SUB','JKT'],['JKT','KIX'],['JKT','AMS'],['JKT','JED'],['DPS','JKT']];
  const check=(l,cabin)=>{
   const t=lp(l.dep,l.from),li=loadInfo(l,cabin),a=GA_DEMAND.generate(l,cabin),first=JSON.stringify(a);
   GA_DEMAND.clear();if(JSON.stringify(GA_DEMAND.generate(l,cabin))!==first)out.bad.push('nondeterministic '+l.id);
   out.n++;
   const vis=GA_DEMAND.visible(l,cabin).reduce((s,x)=>s+x.seats,0);
   if(vis!==li.model)out.bad.push(l.id+' '+cabin+' dout '+(t.day-TD)+' visible '+vis+' model '+li.model);
   for(let dn=0;dn<=330;dn+=6){const v=GA_DEMAND.visible(l,cabin,(t.day-dn)*1440).reduce((s,x)=>s+x.seats,0);if(v>li.cap){out.bad.push('over cap '+l.id+' '+dn);break}}
   const sm=GA_DEMAND.summary(l,cabin);if(sm.sold!==li.model||Math.abs(sm.loadFactor-li.model/li.cap)>1e-9)out.bad.push('summary '+l.id);
   const gone=GA_DEMAND.summary(l,cabin,l.dep+1);if(gone.flown+gone.noShow!==gone.sold)out.bad.push('flown '+l.id);out.flown+=gone.flown;out.ns+=gone.noShow;
   const xs=a.filter(x=>x.status==='XX'),rs=a.filter(x=>x.resaleOf);
   if(xs.length!==rs.length)out.bad.push('resales '+l.id+' '+xs.length+'/'+rs.length);
   for(const x of xs){out.cx+=x.seats;const r=a.find(y=>y.resaleOf===x.ref);if(!r||r.dout!==x.cancel.dout||r.seats!==x.seats)out.bad.push('resale link '+x.ref);
    if(x.cancel.dout>=x.dout)out.bad.push('cancel not after booking '+x.ref);if(x.cancel.reason==='CHANGE'){out.chg+=x.seats;if(x.cancel.refund!==x.total||x.cancel.retained<0)out.bad.push('change '+x.ref)}else if(Math.abs(x.cancel.refund+x.cancel.retained-x.total)>1)out.bad.push('refund '+x.ref)}
   out.base+=a.filter(x=>!x.resaleOf).reduce((s,x)=>s+x.seats,0);
   for(const x of a){
    out.pnr++;
    if(out.refs.has(x.ref))out.bad.push('dup ref '+x.ref);
    out.refs.add(x.ref);
    const back=GA_DEMAND.resolve(x.ref);
    if(!back||back.ref!==x.ref||back.total!==x.total||back.flight!==x.flight)out.bad.push('resolve '+x.ref);
    if(x.pax.some(q=>q.name.toUpperCase()==='RINA WIJAYA'))out.bad.push('demo passenger name '+x.ref);
    if(!(x.total>0&&x.fare>0))out.bad.push('price '+x.ref);
    if(x.bookedAt>x.dep||x.bookedAt<x.dep-340*1440)out.bad.push('booked after dep '+x.ref);
    out.chan[x.channel]=(out.chan[x.channel]||0)+x.seats;
   }
  };
  for(const [o,d] of routes)for(const X of [TD,TD+1,TD+5,TD+20,TD+75,TD+200])for(const it of search(o,d,X))for(const l of it.legs)for(const cabin of legCabs(l))check(l,cabin);
  return {bad:out.bad.slice(0,10),n:out.n,pnr:out.pnr,chan:out.chan,cxRate:out.cx/out.base,chgShare:out.chg/Math.max(1,out.cx),nsRate:out.ns/Math.max(1,out.flown+out.ns)};
 });
 assert.deepEqual(r.bad,[],JSON.stringify(r.bad));assert(r.n>50&&r.pnr>2000,JSON.stringify(r));assert(Object.keys(r.chan).length===6);
 assert(r.cxRate>0.02&&r.cxRate<0.12,'cancel rate '+r.cxRate);assert(r.chgShare>0.15&&r.chgShare<0.5,'change share '+r.chgShare);assert(r.nsRate>0.015&&r.nsRate<0.05,'no-show rate '+r.nsRate);
 /* a day's totals are the sum of its flights, and load factor and revenue make sense */
 const day=await p.evaluate(()=>{const t=GA_DEMAND.daySummary(TD+3);const sum=k=>t.flights.reduce((s,f)=>s+f[k],0);return{n:t.flights.length,lf:t.loadFactor,sold:t.sold,sumSold:sum('sold'),cap:t.cap,sumCap:sum('cap'),rev:t.revenue,sumRev:sum('revenue'),soldRev:t.soldRevenue,channels:Object.keys(t.byChannel).length}});
 assert(day.n>100&&day.sold===day.sumSold&&day.cap===day.sumCap&&Math.abs(day.rev-day.sumRev)<1&&Math.abs(day.lf-day.sold/day.cap)<1e-9&&day.lf>0.3&&day.lf<0.98&&day.rev>0&&day.rev!==day.soldRev&&day.channels===6,JSON.stringify(day));
 /* the fare a generated booking pays matches the live fare ladder at the same load and days out */
 const par=await p.evaluate(()=>{const bad=[];let n=0;for(const [o,d] of [['JKT','DPS'],['JKT','KIX'],['JKT','AMS'],['SUB','JKT']])for(const X of [TD+1,TD+10,TD+40,TD+120]){const it=search(o,d,X)[0];if(!it||it.legs.length!==1)continue;const l=it.legs[0];for(const c of fares(it)){const li=loadInfo(l,c.k);for(const f of c.fam){const s=(f.subs&&f.subs.find(x=>x.left>0))||(f.subs||[]).at(-1)||{ratio:1};const g=GA_DEMAND.fareAt(l,c.k,f.n,s,li.sold,li.dout);n++;if(Math.abs(g/f.p-1)>0.001)bad.push(l.id+' '+f.n+' '+Math.round(f.p)+' '+Math.round(g))}}}return {n,bad:bad.slice(0,6)}});
 assert.deepEqual(par.bad,[],JSON.stringify(par));assert(par.n>=20,JSON.stringify(par));
 /* codec round trip and rejects */
 assert.deepEqual(await p.evaluate(()=>{const c=GA_DEMAND;return[c.decodeRef(c.encodeRef(202,TD+9,2,311)),c.decodeRef('ZZZZZZZ'),c.resolve('GA1234'),c.resolve('0000000')]}),[{fnum:202,D:await p.evaluate(()=>TD+9),ci:2,idx:311},null,null,null]);
 console.log('demand ok',JSON.stringify({legsCabins:r.n,bookings:r.pnr,cancelRate:+r.cxRate.toFixed(3),changeShare:+r.chgShare.toFixed(2),noShowRate:+r.nsRate.toFixed(3),day:{flights:day.n,lf:+day.lf.toFixed(3),revenueBn:+(day.rev/1e9).toFixed(2)}}));assert.deepEqual(errors,[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
