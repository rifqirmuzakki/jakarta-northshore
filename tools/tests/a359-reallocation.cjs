/* Effective-dated standard A359 allocation, retained SIN, and physical fleet sizing. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),change='chg_ga_a359_reallocation_20261108';
const out=[4,6,8,10,14,22,24,26,30,34,36,44,712,734,930,830,832,798,800,310],incoming=[5,7,9,11,15,23,25,27,31,35,37,45,713,735,931,833,837,799,803,321];
const ids=[...out,...incoming].map(n=>'GA '+n);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage(),errors=[];let baseline=false;p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://northshore.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});
 if(baseline&&f.endsWith('schedule-changes.js')){const s=fs.readFileSync(f,'utf8'),d=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf(';')));d.changes=d.changes.filter(c=>c.id!==change);return r.fulfill({contentType:'text/javascript',body:'window.JN_CHANGES_REPO='+JSON.stringify(d)+';'})}return r.fulfill({path:f});});
 for(const date of ['2026-11-07','2026-11-08','2026-11-16']){
  const results=[];for(const mode of [true,false]){baseline=mode;await p.goto('https://northshore.test/index.html?clock='+date+'T08:33&incidents=off');await p.waitForFunction(()=>window.SIMCORE?.FLEET);
   results.push(await p.evaluate(()=>{const S=SIMCORE,A=S.allFlights();return {flights:Object.fromEntries(Object.entries(A).map(([dir,L])=>[dir,L.map(f=>({id:f.id,city:f.city,ac:f.ac,t:f.t,days:f.days,pid:f.pid}))])),series:[...S.FLEET.F].filter(([k])=>k.startsWith('GA|')).map(([k,f])=>({ac:f.ac,regs:f.tails.map(t=>t.reg)})),fleets:S.FLEET.fleets.filter(f=>f.c==='GA'),regs:[...S.FLEET.F].filter(([k])=>k.startsWith('GA|')).flatMap(([k,f])=>f.tails.map(t=>t.reg)),tailError:window.JN_TAIL_ERROR}}));
  }
  const [before,after]=results,active=date>='2026-11-08';assert(!after.tailError,after.tailError);assert.equal(new Set(after.regs).size,after.regs.length);
  for(const dir of ['in','out']){assert.equal(before.flights[dir].length,after.flights[dir].length);after.flights[dir].forEach((f,i)=>{const prev=before.flights[dir].find(x=>x.id===f.id),transfer=active&&ids.includes(f.id);assert.deepEqual(f,{...prev,ac:transfer?'Airbus A350-900':prev.ac},f.id);});}
  const blocks={'Airbus A350-1000':['GJ','GW','GL'],'Airbus A350-900':['GT','GK'],'Boeing 787-9':['GC','GO','GE'],'Airbus A330-900':['GP','GH','GQ'],'Boeing 737-800':['GM','GF','GN','GU','GD']},letters='ACDEFGHIJKLMNOPQRSTUVWXYZ';
  for(const f of after.series)if(blocks[f.ac])f.regs.forEach((reg,i)=>assert.equal(reg,'PK-'+blocks[f.ac][Math.floor(i/letters.length)]+letters[i%letters.length],f.ac+' registration '+i));
  const fleet=ac=>after.fleets.find(f=>f.ac===ac)?.n||0;
  assert.equal(fleet('Airbus A350-1000'),active?27:57);assert.equal(fleet('Airbus A350-900'),active?31:0);
  for(const id of ['GA 904','GA 905','GA 906','GA 907'])assert.equal([...after.flights.in,...after.flights.out].find(f=>f.id===id).ac,'Airbus A350-1000');
  console.log('PASS',date,JSON.stringify({a35k:fleet('Airbus A350-1000'),a359:fleet('Airbus A350-900')}));
 }
 assert.deepEqual(errors,[]);
}finally{await b.close()}})();
