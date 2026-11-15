/* Reports follow what happened at the terminal: cancelled, moved and real bookings change seats sold, load factor and revenue
   exactly as the live availability does. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext(),errors=[];
 await ctx.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}}});
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>window.GA_DEMAND&&typeof search==='function');
 const r=await p.evaluate(()=>{
  const out={};const D=GA_DEMAND,save=rows=>GA_STORE.set('ga-agent-bookings',rows);
  const its=search('JKT','DPS',TD+9).slice(0,2),l=its[0].legs[0],l2=its[1].legs[0],cab='Economy';
  const live=(x)=>loadInfo(x,cab).sold,sum=(x)=>D.summary(x,cab);
  const s0=sum(l);out.base=[s0.sold,live(l),s0.sold===live(l)];
  /* 1. a simulated booking cancelled at the terminal, as XI does */
  const recs=D.visible(l,cab).filter(x=>x.seats>=1&&x.dout>3&&x.status==='HK');const r1=recs[0],r2=recs[1];
  const b1=D.retrieve(r1.ref),n1=b1.pax.a+b1.pax.c,refund=Math.round(b1.total*0.6);
  b1.dirs[0].legs.forEach(x=>x.status='cancel');b1.cancelled={at:Date.now(),refund,rows:[],held:false,expired:false};adjustSold(l,cab,-n1);save([b1]);
  const s1=sum(l);out.cancel={sold:[s1.sold,s0.sold-n1,live(l)],cx:[s1.cancelledPax,s0.cancelledPax+n1],refunded:[Math.round(s1.refunded-s0.refunded),refund],rev:[Math.round(s1.revenue),Math.round(s0.revenue-b1.total+(b1.total-refund))]};
  /* 2. a real counter booking on the same flight */
  const q={...S.q,to:'DPS',a:2,c:0,i:0,type:'ow',d1:lp(l.dep,l.from).day,d2:null},fam=fares(its[0]).find(c=>c.k===cab).fam[0],real=mkBooking(q,[its[0]],[{cab,fam}],['Test Person','Test Two']);
  real.issuedMs=Date.now();real.held=false;real.place='Counter JKT-03';real.dirPrices=[{fare:real.fare,tax:real.tax,chg:real.chg,total:real.total}];adjustSold(l,cab,2);save([b1,real]);
  const s2=sum(l);out.real=[s2.sold,s1.sold+2,live(l),Math.round(s2.revenue-s1.revenue),real.total,(s2.byChannel.Counter||{}).pax>=2];
  /* 3. a simulated booking moved to another flight (reissue): gone from here, a real booking there */
  const b2=D.retrieve(r2.ref),n2=b2.pax.a+b2.pax.c,before2=sum(l2),sold2=live(l2);
  b2.dirs[0].legs=[{...l2,status:'ok'}];adjustSold(l,cab,-n2);adjustSold(l2,cab,n2);save([b1,real,b2]);
  const s3=sum(l),t3=sum(l2);out.moved={oldSold:[s3.sold,s2.sold-n2,live(l)],changed:[s3.changedPax,s2.changedPax+n2],newSold:[t3.sold,before2.sold+n2,live(l2),sold2+n2]};
  /* 4. the whole day follows, and clearing the store goes back to the generated numbers */
  const day=D.daySummary(TD+9),sumF=k=>day.flights.reduce((s,f)=>s+f[k],0);out.day=[day.sold===sumF('sold'),Math.abs(day.revenue-sumF('revenue'))<1];
  save([]);out.reset=D.summary(l,cab).sold===s0.sold+0&&true;
  return out});
 assert(r.base[2],JSON.stringify(r.base));
 assert.deepEqual(r.cancel.sold.slice(0,2),[r.cancel.sold[1],r.cancel.sold[1]],JSON.stringify(r.cancel));assert.equal(r.cancel.sold[0],r.cancel.sold[2],JSON.stringify(r.cancel));
 assert.equal(r.cancel.cx[0],r.cancel.cx[1]);assert.equal(r.cancel.refunded[0],r.cancel.refunded[1]);assert(Math.abs(r.cancel.rev[0]-r.cancel.rev[1])<2,JSON.stringify(r.cancel));
 assert.equal(r.real[0],r.real[1]);assert.equal(r.real[0],r.real[2],JSON.stringify(r.real));assert(Math.abs(r.real[3]-r.real[4])<2&&r.real[5],JSON.stringify(r.real));
 assert.equal(r.moved.oldSold[0],r.moved.oldSold[1]);assert.equal(r.moved.oldSold[0],r.moved.oldSold[2],JSON.stringify(r.moved));assert.equal(r.moved.changed[0],r.moved.changed[1]);
 assert.equal(r.moved.newSold[0],r.moved.newSold[1]);assert.equal(r.moved.newSold[0],r.moved.newSold[2],JSON.stringify(r.moved));
 assert.deepEqual(r.day,[true,true]);assert(r.reset);assert.deepEqual(errors,[]);console.log('demand overrides ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
