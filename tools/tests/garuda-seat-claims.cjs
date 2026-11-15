/* Seats sold at the counter to other customers must be unavailable in the customer app. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:430,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});if(f.endsWith('/garuda/index.html'))return r.fulfill({contentType:'text/html',body:fs.readFileSync(f,'utf8').replace('/* deep links for review:','window.__checkinTest={S,TD,go,BK,flat,search,fares,mkBooking,nowAbs};/* deep links for review:')});const t={'.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/index.html');await p.waitForFunction(()=>window.__checkinTest,null,{timeout:20000});
 const r=await p.evaluate(()=>{const T=__checkinTest,q={...T.S.q,to:'DPS'},its=[T.search(q.from,q.to,q.d1)[0]],mine=T.mkBooking(q,its,its.map(it=>({cab:'Economy',fam:T.fares(it)[0].fam[2]})),['Rina Wijaya']);T.S.bookings.push(mine);const l=T.flat(mine)[0],copy=JSON.parse(JSON.stringify(mine));
  copy.ref='ZZ9ZZ9';copy.names=['OTHER PERSON'];delete copy._counterImport;copy.dirs.forEach(d=>d.legs.forEach(x=>{x.status='ok';x.seats={0:'10D',1:'10E'}}));
  const before=[...otherSeatClaims(mine,l)];
  localStorage.setItem('ga-agent-bookings',JSON.stringify([copy]));
  const after=[...otherSeatClaims(mine,l)];copy.cancelled=true;localStorage.setItem('ga-agent-bookings',JSON.stringify([copy]));
  return {before,after,cancelled:[...otherSeatClaims(mine,l)]}});
 assert(!r.before.includes('10D'),JSON.stringify(r));assert(r.after.includes('10D')&&r.after.includes('10E'),JSON.stringify(r));assert(!r.cancelled.includes('10D'),JSON.stringify(r));
 assert.deepEqual(errors,[]);console.log('seat claims ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
