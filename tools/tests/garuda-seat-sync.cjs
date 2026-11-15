/* Seats chosen in the customer app are written back and picked up by the open agent terminal. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1200,height:900}}),errors=[];
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});if(f.endsWith('/garuda/index.html'))return r.fulfill({contentType:'text/html',body:fs.readFileSync(f,'utf8').replace('/* deep links for review:','window.__checkinTest={S,go,BK,flat,search,fares,mkBooking,nowAbs};/* deep links for review:')});const t={'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 const web=await ctx.newPage();web.on('pageerror',e=>errors.push(e.message));
 await web.goto('https://garuda.test/garuda/index.html');await web.waitForFunction(()=>window.__checkinTest);
 /* an issued counter booking for Rina, as the terminal would have saved it */
 await web.evaluate(()=>{const T=__checkinTest,q={...T.S.q,to:'DPS'},its=[T.search(q.from,q.to,q.d1)[0]],bk=T.mkBooking(q,its,its.map(it=>({cab:'Economy',fam:T.fares(it)[0].fam[2]})),['Rina Wijaya']);bk.issuedMs=Date.now();bk.held=false;bk.passengers=[{type:'a',name:'Rina Wijaya'}];localStorage.setItem('ga-agent-bookings',JSON.stringify([bk]))});
 await web.reload();await web.waitForFunction(()=>window.__checkinTest&&__checkinTest.S.bookings.length===1);
 const agent=await ctx.newPage();agent.on('pageerror',e=>errors.push(e.message));
 await agent.goto('https://garuda.test/garuda/agent.html');await agent.waitForSelector('#app:not([hidden])',{timeout:20000});
 assert.deepEqual(await agent.evaluate(()=>Object.keys(GA_AGENT.bookings()[0].dirs[0].legs[0].seats||{})),[]);
 await web.evaluate(()=>{const l=__checkinTest.flat(__checkinTest.S.bookings[0])[0];l.seats={0:'12A'};persistCounterBookings()});
 await agent.waitForFunction(()=>(GA_AGENT.bookings()[0].dirs[0].legs[0].seats||{})[0]==='12A',null,{timeout:5000});
 assert.deepEqual(errors,[]);console.log('seat sync ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
