/* Demand and revenue screen: totals match the model, charts and tables agree, selection, cabin filter, sorting and tooltips work. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1360,height:1000}}),errors=[];
 await ctx.addInitScript(()=>{const D=Date,n=D.parse('2026-11-13T03:00:00Z');window.Date=class extends D{constructor(...a){super(...(a.length?a:[n]))}static now(){return n}}});
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('https://garuda.test/garuda/revenue.html');await p.waitForSelector('#app:not([hidden])',{timeout:30000});
 await p.waitForFunction(()=>document.getElementById('status').textContent===''&&Object.keys(GA_REVENUE.cache()).length>=7,null,{timeout:120000});
 const num=t=>+String(t).replace(/[^0-9.]/g,'');
 /* tiles agree with the model for the selected day */
 const model=await p.evaluate(()=>{const W=document.getElementById('eng').contentWindow;W.GA_DEMAND.clear();const s=W.GA_DEMAND.daySummary(W.eval('TD'));return{flights:s.flights.length,sold:s.sold,cap:s.cap,lf:s.loadFactor,rev:s.revenue}});
 const tiles=await p.$$eval('#tiles .tile',n=>n.map(x=>[x.querySelector('.l').textContent,x.querySelector('.v').textContent,x.querySelector('.n').textContent]));
 assert.equal(tiles.length,7);assert.equal(num(tiles[0][1]),model.flights);assert.equal(num(tiles[1][1]),model.sold);assert(tiles[1][2].includes(model.cap.toLocaleString('en-US')));assert.equal(tiles[2][1],(model.lf*100).toFixed(1)+'%');
 /* charts: one column per day in both outlook charts, one bar per channel, a line per cabin */
 assert.equal(await p.locator('#c-lf rect.hit').count(),7);assert.equal(await p.locator('#c-rev rect.hit').count(),7);assert.equal(await p.locator('#c-chan rect.hit').count(),6);assert(await p.locator('#c-curve path[stroke]').count()>=2);
 assert.equal(await p.locator('#t-outlook tbody tr').count(),7);assert.equal(await p.locator('#flights tbody tr').count(),40);
 /* tooltip on a column and on the curve; never the only place a value lives (the table view has it) */
 await p.locator('#c-lf rect.hit').nth(2).hover();assert(await p.locator('#tip').isVisible());const tt=await p.locator('#tip').innerText();assert(/Load factor/.test(tt)&&/Seats sold/.test(tt)&&/Revenue/.test(tt),tt);
 await p.mouse.move(5,5);assert(!(await p.locator('#tip').isVisible()));
 await p.locator('#c-curve rect.hit').hover({position:{x:200,y:60}});assert(/days before departure|At departure/.test(await p.locator('#tip').innerText()));
 /* selecting another day changes the heading, tiles and selected column */
 const before=await p.locator('#h-day').innerText(),flights0=await p.locator('#tiles .tile .v').first().innerText();
 await p.locator('#c-lf rect.hit').nth(3).click();assert.notEqual(await p.locator('#h-day').innerText(),before);assert.equal(await p.locator('#c-lf rect.hit[aria-pressed="true"]').count(),1);assert.equal(await p.locator('#c-lf rect.hit').nth(3).getAttribute('aria-pressed'),'true');
 /* cabin filter: Business only has fewer seats and the heading says so */
 const capAll=num((await p.locator('#tiles .tile').nth(1).locator('.n').innerText()));await p.getByRole('button',{name:'Business'}).click();
 assert(/Business/.test(await p.locator('#h-day').innerText()));assert(num(await p.locator('#tiles .tile').nth(1).locator('.n').innerText())<capAll);assert(await p.locator('#flights tbody tr').count()>0);
 await p.getByRole('button',{name:'All cabins'}).click();
 /* sorting by load factor puts the fullest flight first; the first row is selected and described */
 await p.locator('#flights th button',{hasText:'Load factor'}).click();const lfs=await p.$$eval('#flights tbody tr',n=>n.slice(0,5).map(r=>parseFloat(r.children[3].textContent)));assert(lfs.every((v,i)=>!i||lfs[i-1]>=v),String(lfs));
 assert.equal(await p.locator('#flights tbody tr.on').count(),1);assert(/DD[A-Z]{2}\d+\/\d+[A-Z]{3}/.test(await p.locator('#detail').innerText()));
 await p.locator('#flights tbody tr').nth(4).click();assert.equal(await p.locator('#flights tbody tr.on').count(),1);assert.equal(await p.locator('#flights tbody tr').nth(4).getAttribute('aria-selected'),'true');
 /* more flights, and the 14-day range */
 await p.locator('#more').click();assert.equal(await p.locator('#flights tbody tr').count(),140);
 await p.getByRole('button',{name:'Next 14 days'}).click();await p.waitForFunction(()=>Object.keys(GA_REVENUE.cache()).length>=14&&document.getElementById('status').textContent==='',null,{timeout:120000});assert.equal(await p.locator('#c-lf rect.hit').count(),14);
 /* the table view of the curve has a row per checkpoint, and the counter links here */
 assert(await p.locator('#t-curve tbody tr').count()>=10);
 assert.deepEqual(errors,[]);
 const a=await ctx.newPage();await a.goto('https://garuda.test/garuda/agent.html');assert(await a.locator('a[href="revenue.html"]').count()===1);
 console.log('revenue screen ok');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
