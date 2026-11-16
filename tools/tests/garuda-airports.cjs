/* Airport names: every city in the network has a real airport name, terminals only where known, Indonesian airports are domestic terminals. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/?s=search');await p.waitForFunction(()=>window.airportName&&window.GA_PRICING);
 const r=await p.evaluate(()=>{const codes=Object.keys(CT).filter(c=>c!==HUB),miss=codes.filter(c=>!GA_AIRPORTS[c]),names=codes.map(c=>airportName(c)),dup=names.filter((n,i)=>names.indexOf(n)!==i),short=codes.filter(c=>airportName(c).length<8),
  dom=codes.filter(c=>CT[c].z==='D'&&!GA_AIRPORTS[c].t).every(c=>airportTerm(c)==='Domestic terminal'),intlNoTerm=codes.filter(c=>CT[c].z==='I'&&!GA_AIRPORTS[c].t).every(c=>airportTerm(c)===''),
  nonAscii=names.filter(n=>/[^\x20-\x7e]/.test(n));
  return {n:codes.length,miss,dup,short,dom,intlNoTerm,nonAscii,sin:[airportName('SIN'),airportTerm('SIN')],dps:[airportName('DPS'),airportTerm('DPS')],ams:[airportName('AMS'),airportTerm('AMS')],fallback:airportName('ZZZ')}});
 assert(r.n>=150,'the whole network: '+r.n);assert.deepEqual(r.miss,[]);assert.deepEqual(r.dup,[]);assert.deepEqual(r.short,[]);assert.deepEqual(r.nonAscii,[],'ASCII names print in a fixed-width font');assert(r.dom&&r.intlNoTerm);
 assert.deepEqual(r.sin,['Singapore Changi Airport','Terminal 3']);assert.deepEqual(r.dps,['I Gusti Ngurah Rai International Airport','Domestic terminal']);assert.deepEqual(r.ams,['Amsterdam Schiphol Airport','']);assert(/Airport$/.test(r.fallback));
 assert.deepEqual(errors,[]);console.log('PASS: airport names: every city has one, terminals only where known, Indonesian airports are domestic terminals');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
