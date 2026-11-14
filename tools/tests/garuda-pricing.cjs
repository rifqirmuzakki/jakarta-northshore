/* Pricing settings: defaults reproduce the live model, the Pricing Lab edits them live, and reset restores them. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:1360,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const ext=path.extname(f),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};r.fulfill({body:fs.readFileSync(f),contentType:types[ext]||'application/octet-stream'})});
 // 1. The live model: known default prices
 await p.goto('https://garuda.test/garuda/?s=search');await p.waitForFunction(()=>window.GA_PRICING);
 const live=await p.evaluate(()=>{const it=search('JKT','KIX',TD+30)[0],f=fares(it)[0],ratio=f.fam.map(x=>Math.round(x.p/f.fam[1].p*100)/100);return {ratio,child:pmul({a:1,c:1,i:1}),tax:priceFor(it,f.fam[1],{a:1,c:0,i:0}).tax/priceFor(it,f.fam[1],{a:1,c:0,i:0}).fare}});
 assert.deepEqual(live.ratio,[0.9,1,1.15,1.4]);assert.equal(live.child,1.85);assert(Math.abs(live.tax-0.11)<0.001);
 // 2. The lab
 await p.goto('https://garuda.test/garuda/pricing-lab.html');await p.waitForSelector('#lab:not([hidden])',{timeout:15000});
 assert.equal(await p.textContent('#state'),'Default settings');
 const before=await p.locator('.its label.on span:last-child').first().textContent();
 await p.fill('input[data-p="base.intlPerMin"]','15000');await p.waitForTimeout(400);
 const after=await p.locator('.its label.on span:last-child').first().textContent();assert.notEqual(before,after);assert.match(await p.textContent('#state'),/Changed, not saved/);
 await p.click('#reset');await p.waitForTimeout(300);assert.equal(await p.locator('.its label.on span:last-child').first().textContent(),before);assert.equal(await p.textContent('#state'),'Default settings');
 for(const t of ['curve','cal','routes']){await p.click('.tabs button[data-t="'+t+'"]');await p.waitForTimeout(500)}
 assert(await p.locator('tr.click').count()>=10);
 assert.deepEqual(errors,[]);console.log('PASS: default pricing model, Pricing Lab live edit and reset, all four tabs');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
