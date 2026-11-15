/* Demand realism: hot flights sell their cheap fares out early, quiet ones keep them; sold-out Lite/Value show as sold out in the app, the counter and the terminal. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});return f.endsWith('/garuda/index.html')?r.fulfill({contentType:'text/html',body:fs.readFileSync(f,'utf8').replace('/* deep links for review:','window.__t={S,TD,go,listFor,fares,openFam,heatOf,search,renderResults,priceFor};\n/* deep links for review:')}):r.fulfill({path:f})});
 await p.goto('https://garuda.test/garuda/');await p.waitForFunction(()=>window.__t);
 /* sample 14 days x 4 routes at several horizons */
 const s=await p.evaluate(()=>{const T=__t,out={};for(const d of [60,30,14,7,3,1]){let n=0,lo=0,vo=0,hot=0,hotLo=0,calmLo=0,calm=0,vOnly=0;for(let k=0;k<14;k++)for(const [o,t] of [['JKT','SIN'],['JKT','DPS'],['JKT','SUB'],['JKT','KIX']])T.search(o,t,T.TD+d+k).forEach(it=>{const f=T.fares(it)[0].fam,h=T.heatOf(it.legs[0]).hot;n++;if(h)hot++;else calm++;if(f[0].out){lo++;h?hotLo++:calmLo++}if(f[1].out)vo++;if(f[1].out&&!f[0].out)vOnly++});out[d]={n,hot:hot/n,lite:lo/n,value:vo/n,hotLite:hot?hotLo/hot:0,calmLite:calm?calmLo/calm:0,vOnly}}
  const it=T.search('JKT','SIN',T.TD+5)[0],a=JSON.stringify(T.fares(it)[0].fam.map(f=>[f.out,f.sub,f.p])),c=JSON.stringify(T.fares(it)[0].fam.map(f=>[f.out,f.sub,f.p]));return {out,same:a===c}});
 const o=s.out;
 assert(o[14].hot>.1&&o[14].hot<.28,'about one flight in six is hot: '+o[14].hot);
 assert.equal(o[60].lite,0);assert.equal(o[60].value,0);                         /* nothing is sold out two months ahead */
 assert(o[14].hotLite>.6,'hot flights are out of Lite two weeks ahead: '+o[14].hotLite);
 assert(o[14].calmLite<.1,'ordinary and quiet flights keep Lite at two weeks: '+o[14].calmLite);
 assert(o[1].lite>o[7].lite&&o[7].lite>o[14].lite,'sold out grows towards departure');
 assert(o[1].lite>.15&&o[1].lite<.55,'some but not most Lite is gone on the last day: '+o[1].lite);
 for(const d of [14,7,3,1])assert(o[d].value<=o[d].lite+1e-9,'Value closes after Lite at '+d);
 assert(o[3].vOnly===0,'a Value fare is never sold out while Lite is still on sale');
 assert(s.same);
 /* find a flight where Lite is gone and one where it is open, a week out */
 const pick=await p.evaluate(()=>{const T=__t;let gone=null,open=null,both=null;for(let k=0;k<30&&!(gone&&open);k++)T.search('JKT','SIN',T.TD+3+k).forEach(it=>{const f=T.fares(it)[0].fam;if(f[0].out&&!f[1].out&&!gone)gone={d:T.TD+3+k,key:it.key};if(!f[0].out&&!open&&T.TD+3+k<T.TD+10)open={d:T.TD+3+k,key:it.key}});return {gone,open}});
 assert(pick.gone,'a sold-out Lite flight exists');
 /* customer app: the Lite card shows Sold out, cannot be chosen, and the selection starts on the next fare */
 await p.evaluate(d=>{const T=__t;Object.assign(T.S.q,{from:'JKT',to:'SIN',type:'one',d1:d,a:1,c:0,i:0});T.go('results')},pick.gone.d);
 await p.waitForSelector('#v-results.on');
 const idx=await p.evaluate(k=>__t.listFor().its.findIndex(i=>i.key===k),pick.gone.key);
 await p.locator(`[data-expand="${idx}"]`).click();
 const lite=p.locator('[data-result-fare="0"]'),val=p.locator('[data-result-fare="1"]');
 assert(await lite.isDisabled());assert.match(await lite.innerText(),/Sold out/);assert(!(await val.isDisabled()));assert.equal(await val.getAttribute('aria-checked'),'true');
 await p.locator(`[data-result-continue="${idx}"]`).click();await p.waitForSelector('#v-review.on');
 assert.match(await p.locator('#v-review').innerText(),/Economy Value/);
 /* counter table and terminal availability */
 const t=await p.evaluate(({d,key})=>{const T=__t,it=T.search('JKT','SIN',d).find(i=>i.key===key),c=T.fares(it)[0],lite=c.fam[0];return {subs:lite.subs.map(x=>x.k+x.left),out:lite.out,open:T.openFam(c).n,cheapest:T.priceFor(it,T.openFam(c)).total<T.priceFor(it,c.fam[1]).total*1.2}},{d:pick.gone.d,key:pick.gone.key});
 assert(t.out&&t.subs.every(x=>/0$/.test(x)));assert.equal(t.open,'Economy Value');
 /* the Pricing Lab settings drive it: switching hot flights off leaves ordinary flights only */
 const off=await p.evaluate(()=>{const T=__t,H=GA_PRICING.cfg.heat,keep=Object.assign({},H);H.hot=0;let hot=0,n=0;for(let k=0;k<20;k++)T.search('JKT','SIN',T.TD+7+k).forEach(i=>{n++;if(T.heatOf(i.legs[0]).hot)hot++});Object.assign(H,keep);return hot});
 assert.equal(off,0);

 /* sales terminal: the closed classes read 0 and cannot be sold; the next family's classes are still open */
 const dd=await p.evaluate(d=>{const x=new Date(Date.UTC(1970,0,1)+(d)*864e5);return x.getUTCDate()+['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][x.getUTCMonth()]},pick.gone.d);
 const q=await b.newPage({viewport:{width:1440,height:900}});await q.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await q.goto('https://garuda.test/garuda/agent.html');await q.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started,null,{timeout:20000});
 const run=async c=>{await q.fill('#tin',c);await q.press('#tin','Enter');return q.evaluate(()=>GA_TERM.lines().join('\n'))};
 const an=await run('AN'+dd+'JKTSIN'),lines=an.split('\n').filter(l=>/^\s*\d+\s+GA/.test(l)),gone=lines.findIndex(l=>/\bT0 L0 G0\b/.test(l));
 assert(gone>=0,'AN shows the closed Lite classes as 0: '+lines.slice(0,3).join(' | '));
 const ss=await run('SS1T'+(gone+1));
 assert(/CLASS T CLOSED/.test(ss),'selling a closed class is refused: '+ss.slice(-200));
 assert.deepEqual(errors,[]);console.log('PASS: demand realism: hot flights sell cheap fares out early, quiet ones keep them, sold-out Lite/Value shown in the app and engine');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
