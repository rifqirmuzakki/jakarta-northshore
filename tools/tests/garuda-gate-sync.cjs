/* Airport stand assignment is the source for passenger departure gates. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await browser.newContext(),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});return r.fulfill({path:f})});
 await page.goto('https://garuda.test/garuda/index.html');await page.waitForFunction(()=>typeof airportDeparture==='function');
 const l=await page.evaluate(()=>{const l=search('JKT','SUB',TD+1)[0].legs[0];return {id:l.id,dep:l.dep,from:l.from,term:l.term}});
 assert.equal((await page.evaluate(l=>airportDeparture(l),l)).gate,'—');
 const publisher=await ctx.newPage();await publisher.goto('https://garuda.test/garuda/index.html');await publisher.evaluate(l=>{window.SIMCORE={FLEET:{day:Math.floor(l.dep/1440)},ENTS:[{d:{id:l.id,t:l.dep%1440},stand:{id:'D4',term:'T1'}}]}},l);
 await publisher.addScriptTag({path:path.join(root,'gate-sync.js')});await publisher.evaluate(()=>JN_GATE_SYNC.publish());
 await page.waitForFunction(l=>airportDeparture(l).gate==='D4',l);assert.deepEqual(await page.evaluate(l=>airportDeparture(l),l),{terminal:'Terminal 1',gate:'D4'});
 assert.equal(await page.evaluate(l=>airportDeparture({...l,dep:l.dep+1440}).gate,l),'—');assert.equal(await page.evaluate(l=>airportDeparture({...l,id:'GA9999'}).gate,l),'—');
 await publisher.evaluate(l=>{SIMCORE.ENTS[0].stand={id:'E7',term:'T2'};JN_GATE_SYNC.publish()},l);await page.waitForFunction(l=>airportDeparture(l).gate==='E7',l);
 assert.deepEqual(await page.evaluate(l=>airportDeparture({...l,gateChange:{from:'D4',to:'C3'}}),l),{terminal:'Terminal '+l.term.slice(1),gate:'C3'});
 assert.deepEqual(errors,[]);console.log('PASS: airport gate publication, passenger gate update, date/flight identity and unavailable fallback');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
