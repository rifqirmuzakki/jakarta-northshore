/* Award redemption: Saver and Advantage classes in every cabin, own inventory, GarudaMiles members, miles debit and return, change fee, cash taxes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ddmon=n=>{const d=new Date(Date.now()+7*36e5+n*864e5);return d.getUTCDate()+MON[d.getUTCMonth()]};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const ctx=await b.newContext({viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await ctx.addInitScript(()=>{try{if(!localStorage.getItem('ga-pricing-cfg'))localStorage.setItem('ga-pricing-cfg',JSON.stringify({heat:{hot:0}}))}catch(e){}});/* ordinary demand: award seats are open */
 await ctx.route('https://garuda.test/**',r=>{let f=path.join(root,new URL(r.request().url()).pathname);if(f.endsWith('/'))f+='index.html';if(!fs.existsSync(f))return r.fulfill({status:404,body:''});const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream';r.fulfill({status:200,contentType:t,body:fs.readFileSync(f)})});
 await p.goto('https://garuda.test/garuda/agent.html');await p.waitForSelector('#app:not([hidden])',{timeout:20000});await p.waitForFunction(()=>window.GA_TERM&&GA_TERM.state().started);
 const run=async c=>{await p.fill('#tin',c);await p.press('#tin','Enter');return p.evaluate(()=>GA_TERM.lines().join('\n'))};
 const last=async c=>{const all=await run(c);return all.slice(all.lastIndexOf('> '+c.toUpperCase()))};
 const eng=(f,...a)=>p.evaluate(([f,a])=>{const W=document.getElementById('eng').contentWindow;return W.eval('('+f+')').apply(null,a)},[f.toString(),a]);
 const D=ddmon(30),lineOf=(txt,re)=>txt.split('\n').filter(l=>/^\s*\d+\s+GA/.test(l)).findIndex(l=>re.test(l))+1;
 /* ---- display: cash AN has no award letters, AW has only award classes ---- */
 const an=await last(`AN${D}JKTDPS`);assert(!/\bX\d/.test(an)&&/AW/.test(an));
 const aw=await last(`AW${D}JKTDPS`);assert(/AWARD AVAILABILITY/.test(aw)&&/MILES PER PASSENGER/.test(aw));assert(/\bA\d O\d V\d R\d U\d X\d\b/.test(aw),'all six award classes: '+aw.split('\n').slice(3,5).join(' | '));assert(/X\s+6,000/.test(aw)&&/A\s+22,000/.test(aw));
 /* ---- members ---- */
 assert(/NO MEMBER SELECTED/.test(await last('AM')));assert(/NO NAME SEARCH/.test(await last('AMRINA')));assert(/NO MEMBER/.test(await last('AMGA123456780')));
 const am=await last('AMGA123456789');assert(/RINA WIJAYA/.test(am)&&/SILVER/.test(am)&&/12,480/.test(am));assert(/SELECTED FOR THIS BOOKING/.test(am));await run('IG');
 const big=await eng(()=>{for(let i=0;i<3000;i++){const m=memberAt(i);if(m.open>=60000)return {id:m.id,first:m.first,last:m.last,open:m.open}}});
 /* ---- sell, no member, no mixing, with member ---- */
 const xl=lineOf(aw,/\bX[1-9]/);assert(xl>0);
 assert(/AWARD SAVER  6,000 MILES/.test(await last(`SS1X${xl}`)));assert(/CANNOT BE MIXED/.test(await last(`SS1Y${xl}`)));
 await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');
 assert(/NEEDS A MEMBER/.test(await last('ER')));
 const fxx=await last('FXX');assert(/NO MEMBER YET/.test(fxx)&&/6,000 MILES/.test(fxx)&&/NO FARE OR PPN/.test(fxx));
 assert(/SELECTED FOR THIS BOOKING/.test(await last('AMGA123456789')));assert(/RINA WIJAYA/.test(await last('FXX')));
 const left0=await eng((d)=>{const it=search('JKT','DPS',TD+d)[0];return awardFares(it).find(x=>x.k==='X').left},30);
 const er=await last('ER');assert(/BOOKING SAVED/.test(er)&&/AWARD  6,000 MILES FOR RINA WIJAYA/.test(er),er);
 const ref=await p.evaluate(()=>GA_TERM.state().cur.ref);
 /* the held award seat comes out of the Saver allotment, and the miles are not debited yet */
 const left1=await eng((d)=>{const it=search('JKT','DPS',TD+d)[0];return awardFares(it).find(x=>x.k==='X').left},30);
 const flightOf=await p.evaluate(()=>GA_TERM.state().cur.dirs[0].legs[0].id);
 assert.equal(left1,Math.max(0,left0-(flightOf===await eng((d)=>search('JKT','DPS',TD+d)[0].legs[0].id,30)?1:0)));
 assert(/12,480 MILES/.test(await last('AMGA123456789')));
 /* ---- cancelling a held award gives the seat back ---- */
 await run('XI');await run('XIY');await run('IG');
 assert.equal(await eng((d)=>{const it=search('JKT','DPS',TD+d)[0];return awardFares(it).find(x=>x.k==='X').left},30),left0);
 /* ---- ticket it: miles debited, cash taxes only ---- */
 await run(`AW${D}JKTDPS`);await run(`SS1X${xl}`);await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');await run('AMGA123456789');await run('ER');
 const ref2=await p.evaluate(()=>GA_TERM.state().cur.ref),cash=await p.evaluate(()=>GA_TERM.state().cur.total);assert(cash>0&&cash<400000,'cash is only airport charges: '+cash);
 await run('FPCASH');const tt=await last('TTP');assert(/TICKETS ISSUED/.test(tt)&&/AWARD  6,000 MILES FROM RINA WIJAYA/.test(tt)&&/BALANCE 6,480/.test(tt),tt);
 assert(/6,480 MILES/.test(await last('AMGA123456789')));assert(/-6,000/.test(await last('AMGA123456789')));
 /* the passenger app shows the same balance */
 const pa=await ctx.newPage();await pa.goto('https://garuda.test/garuda/index.html');assert.match(await pa.locator('#v-home').innerText(),/6,480 miles/);await pa.close();
 /* ---- not enough miles: a Business Advantage award for Rina is refused, Adi has enough ---- */
 await run('IG');await run(`AW${D}JKTSIN`);const aw2=await last(`AW${D}JKTSIN`);const al=lineOf(aw2,/\bA[1-9]/);assert(al>0,'a Business Advantage seat exists');
 await run(`SS1A${al}`);await run('NM1WIJAYA/RINA MRS');await run('AP081234567890');await run('TKOK');await run('RFRINA');await run('AMGA123456789');assert(/INSUFFICIENT MILES  NEED 42,000  BALANCE 6,480/.test(await last('ER')));
 assert(/NO GARUDAMILES MEMBER/.test(await last('SRFQTV-GA123456780/P1')));assert(/MEMBER NAME DOES NOT MATCH PASSENGER 1/.test(await last(`SRFQTV-${big.id}/P1`)));
 await run(`AM${big.id}`);assert(/MEMBER NAME DOES NOT MATCH ANY PASSENGER/.test(await last('ER')));
 await run('IG');await run(`AW${D}JKTSIN`);await run(`SS1A${al}`);await run(`NM1${big.last}/${big.first} MR`);await run('AP081234567890');await run('TKOK');await run('RFADI');assert(/SELECTED FOR AWARDS/.test(await last(`SRFQTV-${big.id}/P1`)));assert(/BOOKING SAVED/.test(await last('ER')));
 await run('FPCC');assert(new RegExp('BALANCE '+(big.open-42000).toLocaleString('en-US')).test(await last('TTP')));
 /* ---- change: Advantage costs more miles, change fee on the old miles, cash only for tax difference ---- */
 await run(`RT${ref2}`);const aw3=await last(`AW${D}JKTDPS`);const ul=lineOf(aw3,/\bU[1-9]/);assert(ul>0);
 const q=await last(`RBU2/${ul}`);assert(/AWARD REISSUE QUOTE/.test(q)&&/6,000 MILES/.test(q)&&/9,000 MILES/.test(q)&&/MILES DIFFERENCE\s+3,000/.test(q)&&/CHANGE FEE 10%\s+600 MILES/.test(q)&&/TOTAL MILES TO DEBIT 3,600/.test(q),q);
 assert.equal(await p.evaluate(()=>GA_TERM.state().cur.award.miles),6000);/* nothing changed before TTP */
 const rs=await last('TTP');assert(/REISSUED/.test(rs)&&/MILES DEBITED 3,600/.test(rs)&&/BALANCE 2,880/.test(rs),rs);
 assert.equal(await p.evaluate(()=>GA_TERM.state().cur.award.miles),9000);
 /* ---- cancel a ticketed award: miles back less the fee, taxes refunded ---- */
 const xq=await last('XI');assert(/AWARD REFUND/.test(xq)&&/MILES ON THE FLIGHTS\s+9,000/.test(xq)&&/FEE KEPT\s+900/.test(xq)&&/MILES RETURNED\s+8,100/.test(xq),xq);
 const xc=await last('XIY');assert(/BOOKING CANCELLED/.test(xc)&&/MILES RETURNED 8,100/.test(xc));
 assert(/10,980 MILES/.test(await last('AMGA123456789')));/* 12,480 - 6,000 - 3,600 + 8,100 */
 /* ---- engine: every cabin has Saver and Advantage; hot flights release fewer; the Pricing Lab drives closing ---- */
 const eg=await eng(()=>{const cfg=GA_PRICING.cfg,out={};const its=search('JKT','CDG',TD+30);const rows=awardFares(its[0]);out.letters=rows.map(r=>r.k).sort().join('');out.levels=rows.map(r=>r.cab+r.level).join(',');
  let hot=[],calm=[];for(let k=0;k<40;k++)search('JKT','DPS',TD+10+k).forEach(it=>{const x=awardFares(it).find(r=>r.k==='X'),h=heatOf(it.legs[0]).hot;(h?hot:calm).push(x.left)});
  cfg.heat.hot=0.5;GA_PRICING.clear();hot=[];calm=[];for(let k=0;k<40;k++)search('JKT','DPS',TD+10+k).forEach(it=>{const x=awardFares(it).find(r=>r.k==='X'),h=heatOf(it.legs[0]).hot;(h?hot:calm).push(x.left)});const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);out.hot=avg(hot);out.calm=avg(calm);
  cfg.heat.hot=0;cfg.award.saverClose=999;GA_PRICING.clear();const f=awardFares(search('JKT','DPS',TD+30)[0]);out.saverClosed=f.find(r=>r.k==='X').left;out.advOpen=f.find(r=>r.k==='U').left;cfg.award.saverClose=3;cfg.award.on=0;out.off=awardFares(search('JKT','DPS',TD+30)[0]).length;return out});
 assert.equal(eg.letters,'AORUVX');assert(/PremiumSaver/.test(eg.levels)&&/BusinessAdvantage/.test(eg.levels)&&/EconomyAdvantage/.test(eg.levels));
 assert(eg.hot<eg.calm*0.7,'hot flights release fewer Saver seats: '+eg.hot+' vs '+eg.calm);assert.equal(eg.saverClosed,0);assert(eg.advOpen>0);assert.equal(eg.off,0);
 const mm=await eng(()=>{const seen={},names={};let dup=0,tiers={},low=0,high=0,rinas=0;for(let i=0;i<3000;i++){const m=memberAt(i);if(seen[m.name]&&seen[m.name]!==m.id)dup++;seen[m.name]=m.id;tiers[m.tier]=(tiers[m.tier]||0)+1;if(m.open<42000)low++;else high++;if(m.name==='RINA WIJAYA')rinas++}
  const n7=memberNo(7),bad=n7.slice(0,-1)+((+n7.slice(-1)+1)%10);return {dup,tiers,low,high,rinas,ok:memberByNumber(n7).idx,bad:memberByNumber(bad),out:memberByNumber(memberNo(50000)),rina:memberByNumber('GA123456789').name,same:memberAt(5)===memberAt(5)&&memberAt(5).id===memberNo(5),spaced:memberByNumber(' ga 123456789 ').name,count:GA_PRICING.memberCount}});
 assert(mm.dup>100,'many members share a name: '+mm.dup);assert.equal(mm.ok,7);assert.equal(mm.bad,null);assert.equal(mm.out,null);assert.equal(mm.rina,'RINA WIJAYA');assert.equal(mm.rinas,0);assert(mm.same);assert.equal(mm.spaced,'RINA WIJAYA');assert.equal(mm.count,50000);assert(mm.tiers.Silver>mm.tiers.Gold&&mm.tiers.Gold>mm.tiers.Platinum&&mm.tiers.Platinum>0);assert(mm.low>200&&mm.high>200);
 assert.deepEqual(errors,[]);console.log('PASS: award redemption: classes, own inventory, members, miles debit, change fee, cancel return, Pricing Lab');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
