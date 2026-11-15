/* Demand and revenue screen. Reads the simulated demand (GA_DEMAND, inside the hidden engine frame) and draws load factor,
   revenue, channels and booking curves. Everything shown is also in a table; tooltips never gate a value. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id)},W,E,D,cache={},st={range:7,cabin:'all',day:null,flight:null,sort:{k:'dep',dir:1},rows:40,gen:0};
var CAB=['Economy','Premium','Business'],CABCOL={Economy:'var(--s1)',Premium:'var(--s2)',Business:'var(--s3)'};
var SVG='http://www.w3.org/2000/svg';
function el(tag,attrs,kids){var n=document.createElement(tag),k;for(k in attrs||{}){if(k==='text')n.textContent=attrs[k];else n.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){n.appendChild(c)});return n}
function sv(tag,attrs,kids){var n=document.createElementNS(SVG,tag),k;for(k in attrs||{}){if(k==='text')n.textContent=attrs[k];else n.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){n.appendChild(c)});return n}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild)}
function compact(n){var a=Math.abs(n);return a>=1e12?(n/1e12).toFixed(1)+'T':a>=1e9?(n/1e9).toFixed(a>=1e10?0:1)+'B':a>=1e6?(n/1e6).toFixed(a>=1e7?0:1)+'M':a>=1e3?Math.round(n/1e3)+'K':String(Math.round(n))}
function idr(n){return 'IDR '+compact(n)}
function pct(x){return (x*100).toFixed(1)+'%'}
function int(n){return Math.round(n).toLocaleString('en-US')}
function dayLabel(d,long){return E.fmtDn(d,long?{weekday:'short',day:'numeric',month:'short'}:{day:'numeric',month:'short'})}
var MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function ddmon(d){var x=new Date(d*864e5);return x.getUTCDate()+MON[x.getUTCMonth()]}

/* ---------- boot ---------- */
var tries=0,timer=setInterval(function(){tries++;var ok=false;try{W=$('eng').contentWindow;ok=!!(W&&W.GA_DEMAND&&W.GA_PRICING&&W.eval('typeof CT')==='object')}catch(e){}
 if(ok){clearInterval(timer);init()}if(tries>300){clearInterval(timer);$('boot').textContent='The simulation did not start. Reload the page.'}},100);
function init(){D=W.GA_DEMAND;E=W.eval('({TD,fmtDn,fT,nowAbs,CT,HUB,lp})');E.cabinCap=W.eval('cabinCap');st.day=E.TD;
 $('boot').hidden=true;$('app').hidden=false;buttons();tickClock();setInterval(tickClock,30000);
 GA_STORE.onChange('ga-agent-bookings',invalidate);GA_STORE.onChange('ga-sold',invalidate);
 window.addEventListener('resize',function(){draw()});recompute()}
function tickClock(){var m=E.lp(E.nowAbs(),'JKT');$('clock').textContent=E.fmtDn(m.day,{weekday:'short',day:'numeric',month:'short'})+' '+E.fT(E.nowAbs(),'JKT')+' WIB'}
function invalidate(){cache={};recompute()}

/* ---------- filters ---------- */
function seg(id,items,cur,on){var box=$(id);clear(box);items.forEach(function(it){var b=el('button',{type:'button','aria-pressed':String(it[0]===cur),text:it[1]});b.addEventListener('click',function(){on(it[0])});box.appendChild(b)})}
function buttons(){seg('f-range',[[7,'Next 7 days'],[14,'Next 14 days'],[30,'Next 30 days']],st.range,function(v){st.range=v;buttons();recompute()});
 seg('f-cabin',[['all','All cabins'],['Economy','Economy'],['Premium','Premium'],['Business','Business']],st.cabin,function(v){st.cabin=v;st.flight=null;buttons();draw()})}

/* ---------- data: one day at a time, summaries only (bookings are regenerated when needed, never all held at once) ---------- */
function computeDays(){var gen=++st.gen,days=[],i;for(i=0;i<st.range;i++)days.push(E.TD+i);var todo=days.filter(function(d){return !cache[d]});
 $('status').textContent=todo.length?'Calculating '+todo.length+' day'+(todo.length>1?'s':'')+'…':'';
 (function step(){if(gen!==st.gen)return;var d=todo.shift();if(d==null){$('status').textContent='';draw();return}
  D.clear();cache[d]=D.daySummary(d);D.clear();$('status').textContent=todo.length?'Calculating '+todo.length+' more day'+(todo.length>1?'s':'')+'…':'';draw();setTimeout(step,0)})()}
function recompute(){if(st.day<E.TD||st.day>=E.TD+st.range)st.day=E.TD;computeDays()}
function cabs(f){return st.cabin==='all'?CAB.map(function(c){return f.cabins[c]}).filter(Boolean):[f.cabins[st.cabin]].filter(Boolean)}
function zero(){return{cap:0,sold:0,flown:0,noShow:0,revenue:0,soldRevenue:0,cancelledPax:0,changedPax:0,refunded:0,feeRevenue:0,bookings:0,byChannel:{},byClass:{}}}
function sumOf(list){var t=zero();list.forEach(function(s){['cap','sold','flown','noShow','revenue','soldRevenue','cancelledPax','changedPax','refunded','feeRevenue','bookings'].forEach(function(k){t[k]+=s[k]});
  Object.keys(s.byChannel).forEach(function(c){var x=t.byChannel[c]||(t.byChannel[c]={bookings:0,pax:0,revenue:0});x.bookings+=s.byChannel[c].bookings;x.pax+=s.byChannel[c].pax;x.revenue+=s.byChannel[c].revenue});
  Object.keys(s.byClass).forEach(function(c){t.byClass[c]=(t.byClass[c]||0)+s.byClass[c]})});t.lf=t.cap?Math.min(1,t.sold/t.cap):0;return t}
function daySum(d){var s=cache[d];if(!s)return null;var t=sumOf(s.flights.map(function(f){return sumOf(cabs(f))}));t.flights=s.flights.filter(function(f){return cabs(f).length}).length;return t}
function flightSum(f){var t=sumOf(cabs(f));t.flight=f.flight;t.dep=f.dep;t.f=f;return t}

/* ---------- tooltip ---------- */
var tip=null;
function showTip(ev,title,rows){tip=tip||$('tip');clear(tip);tip.appendChild(el('b',{text:title}));rows.forEach(function(r){var row=el('div',{class:'r'});if(r.color)row.appendChild(el('i',{style:'border-color:'+r.color}));row.appendChild(el('span',{text:r.k}));row.appendChild(el('strong',{text:r.v}));tip.appendChild(row)});
 tip.hidden=false;var x=ev.clientX+14,y=ev.clientY+14,w=tip.offsetWidth,h=tip.offsetHeight;if(x+w>innerWidth-8)x=ev.clientX-w-14;if(y+h>innerHeight-8)y=ev.clientY-h-14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px'}
function hideTip(){if(tip)tip.hidden=true}
function focusPoint(target){var r=target.getBoundingClientRect();return{clientX:r.left+r.width/2,clientY:r.top+8}}

/* ---------- chart helpers ---------- */
function niceMax(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function plotBox(id,h){var box=$(id).querySelector('.plot');clear(box);var w=Math.max(260,box.clientWidth||320);return{box:box,w:w,h:h||230}}
/* columns: one series, one value per category, <=24px, 4px rounded tip, square base; the selected column is full colour, others recede */
function columns(id,items,o){var P=plotBox(id),m={l:46,r:8,t:16,b:36},iw=P.w-m.l-m.r,ih=P.h-m.t-m.b,max=o.max||niceMax(Math.max.apply(null,items.map(function(i){return i.v})));
 var svg=sv('svg',{viewBox:'0 0 '+P.w+' '+P.h,role:'img','aria-label':o.label}),band=iw/items.length,bw=Math.min(24,band*.62),ticks=4,t;
 for(t=0;t<=ticks;t++){var yv=max*t/ticks,y=m.t+ih-ih*t/ticks;svg.appendChild(sv('line',{class:t?'grid':'axis',x1:m.l,x2:P.w-m.r,y1:y,y2:y}));svg.appendChild(sv('text',{x:m.l-8,y:y+4,'text-anchor':'end',text:o.tick(yv)}))}
 var every=Math.ceil(items.length/Math.max(1,Math.floor(iw/58)));
 items.forEach(function(it,i){var cx=m.l+band*i+band/2,hgt=Math.max(it.v>0?2:0,ih*it.v/max),x=cx-bw/2,y=m.t+ih-hgt,r=Math.min(4,hgt,bw/2),sel=it.sel;
  var g=sv('g',{});var hit=sv('rect',{class:'hit',x:m.l+band*i,y:m.t,width:band,height:ih+m.b-8,tabindex:'0',role:'button','aria-label':it.aria,'aria-pressed':String(!!sel)});
  var bar=sv('path',{class:'mk'+(sel?'':' dim'),d:'M'+x+' '+(m.t+ih)+'V'+(y+r)+'Q'+x+' '+y+' '+(x+r)+' '+y+'H'+(x+bw-r)+'Q'+(x+bw)+' '+y+' '+(x+bw)+' '+(y+r)+'V'+(m.t+ih)+'Z',fill:'var(--s1)','pointer-events':'none'});
  hit.addEventListener('pointermove',function(e){showTip(e,it.title,it.rows)});hit.addEventListener('pointerleave',hideTip);
  hit.addEventListener('focus',function(){showTip(focusPoint(hit),it.title,it.rows)});hit.addEventListener('blur',hideTip);
  hit.addEventListener('click',function(){o.pick(it.key)});hit.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();o.pick(it.key)}});
  g.appendChild(hit);g.appendChild(bar);svg.appendChild(g);
  if(i%every===0||sel)svg.appendChild(sv('text',{x:cx,y:P.h-16,'text-anchor':'middle',class:sel?'val':'',text:it.x}));
  if(sel)svg.appendChild(sv('text',{x:cx,y:y-6,'text-anchor':'middle',class:'val',text:it.vl}))});
 P.box.appendChild(svg)}
/* horizontal bars: one series by category, value at the tip */
function hbars(id,items,o){var P=plotBox(id,Math.max(120,items.length*32+16)),m={l:104,r:70,t:6,b:6},iw=P.w-m.l-m.r,max=Math.max.apply(null,items.map(function(i){return i.v}))||1,rowH=32;
 var svg=sv('svg',{viewBox:'0 0 '+P.w+' '+P.h,role:'img','aria-label':o.label});svg.appendChild(sv('line',{class:'axis',x1:m.l,x2:m.l,y1:m.t,y2:P.h-m.b}));
 items.forEach(function(it,i){var y=m.t+i*rowH+rowH/2,w=Math.max(it.v>0?2:0,iw*it.v/max),bh=14,r=Math.min(4,w);
  var hit=sv('rect',{class:'hit',x:0,y:y-rowH/2,width:P.w,height:rowH,tabindex:'0','aria-label':it.aria});
  hit.addEventListener('pointermove',function(e){showTip(e,it.title,it.rows)});hit.addEventListener('pointerleave',hideTip);hit.addEventListener('focus',function(){showTip(focusPoint(hit),it.title,it.rows)});hit.addEventListener('blur',hideTip);
  svg.appendChild(sv('text',{x:m.l-10,y:y+4,'text-anchor':'end',class:'ink2',text:it.k}));
  svg.appendChild(hit);svg.appendChild(sv('path',{class:'mk',d:'M'+m.l+' '+(y-bh/2)+'H'+(m.l+w-r)+'Q'+(m.l+w)+' '+(y-bh/2)+' '+(m.l+w)+' '+(y-bh/2+r)+'V'+(y+bh/2-r)+'Q'+(m.l+w)+' '+(y+bh/2)+' '+(m.l+w-r)+' '+(y+bh/2)+'H'+m.l+'Z',fill:'var(--s1)','pointer-events':'none'}));
  svg.appendChild(sv('text',{x:m.l+w+8,y:y+4,class:'val',text:it.vl}))});
 P.box.appendChild(svg)}
/* lines: x is days before departure (left = far out), crosshair snaps to a day, one tooltip lists every series */
function lines(id,series,o){var P=plotBox(id,250),m={l:46,r:56,t:16,b:40},iw=P.w-m.l-m.r,ih=P.h-m.t-m.b,X=function(d){return m.l+iw*(1-d/o.span)},Y=function(v){return m.t+ih-ih*v},t,svg=sv('svg',{viewBox:'0 0 '+P.w+' '+P.h,role:'img','aria-label':o.label});
 for(t=0;t<=4;t++){var yy=Y(t/4);svg.appendChild(sv('line',{class:t?'grid':'axis',x1:m.l,x2:P.w-m.r,y1:yy,y2:yy}));svg.appendChild(sv('text',{x:m.l-8,y:yy+4,'text-anchor':'end',text:t*25+'%'}))}
 [60,45,30,14,7,3,0].filter(function(d){return d<=o.span}).forEach(function(d){svg.appendChild(sv('text',{x:X(d),y:P.h-20,'text-anchor':'middle',text:d?d+'d':'Dep'}))});
 svg.appendChild(sv('text',{x:m.l+iw/2,y:P.h-4,'text-anchor':'middle',text:'Days before departure'}));
 series.forEach(function(s){var d='',i;for(i=o.span;i>=0;i--)d+=(d?'L':'M')+X(i)+' '+Y(s.at[i]);svg.appendChild(sv('path',{d:d,fill:'none',stroke:s.color,'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'}))});
 var ends=series.map(function(s){return{s:s,y:Y(s.at[0])}}).sort(function(a,b){return a.y-b.y}),sep=true;for(t=1;t<ends.length;t++)if(ends[t].y-ends[t-1].y<14)sep=false;
 ends.forEach(function(e){svg.appendChild(sv('circle',{cx:X(0),cy:e.y,r:4,fill:e.s.color,stroke:'var(--surface)','stroke-width':2}));if(sep)svg.appendChild(sv('text',{x:X(0)+10,y:e.y+4,class:'val',text:Math.round(e.s.at[0]*100)+'%'}))});
 var cross=sv('line',{class:'grid',y1:m.t,y2:m.t+ih,x1:0,x2:0,visibility:'hidden',style:'stroke:var(--axis)'}),dots=series.map(function(s){var c=sv('circle',{r:4,fill:s.color,stroke:'var(--surface)','stroke-width':2,visibility:'hidden'});return c});
 svg.appendChild(cross);dots.forEach(function(c){svg.appendChild(c)});
 var hit=sv('rect',{class:'hit',x:m.l,y:m.t,width:iw,height:ih,tabindex:'0','aria-label':o.label+'. Left and right arrows move through the days.'}),cur=0;
 function at(d,ev){d=Math.max(0,Math.min(o.span,d));cur=d;var x=X(d);cross.setAttribute('x1',x);cross.setAttribute('x2',x);cross.setAttribute('visibility','visible');dots.forEach(function(c,i){c.setAttribute('cx',x);c.setAttribute('cy',Y(series[i].at[d]));c.setAttribute('visibility','visible')});
  showTip(ev,d?d+' days before departure':'At departure',series.map(function(s){return{color:s.color,k:s.name,v:pct(s.at[d])+'  ·  '+s.sold[d]+' seats'}}))}
 hit.addEventListener('pointermove',function(e){var r=svg.getBoundingClientRect(),px=(e.clientX-r.left)*P.w/r.width;at(Math.round(o.span*(1-(px-m.l)/iw)),e)});
 hit.addEventListener('pointerleave',function(){hideTip();cross.setAttribute('visibility','hidden');dots.forEach(function(c){c.setAttribute('visibility','hidden')})});
 hit.addEventListener('focus',function(){at(cur,focusPoint(hit))});hit.addEventListener('blur',function(){hideTip()});
 hit.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){e.preventDefault();at(cur+1,focusPoint(hit))}else if(e.key==='ArrowRight'){e.preventDefault();at(cur-1,focusPoint(hit))}});
 svg.appendChild(hit);P.box.appendChild(svg)}

/* ---------- screen ---------- */
function tile(l,v,n){return el('div',{class:'tile'},[el('div',{class:'l',text:l}),el('div',{class:'v',text:v}),el('div',{class:'n',text:n||' '})])}
function table(id,head,rows){var t=el('table'),tr=el('tr');head.forEach(function(h,i){tr.appendChild(el('th',{class:i?'n':'',text:h}))});t.appendChild(el('thead',{},[tr]));var tb=el('tbody');rows.forEach(function(r){var x=el('tr');r.forEach(function(c,i){x.appendChild(el('td',{class:i?'n':'',text:c}))});tb.appendChild(x)});t.appendChild(tb);var box=$(id);clear(box);box.appendChild(t)}
function draw(){if(!D)return;var days=[],i;for(i=0;i<st.range;i++)days.push(E.TD+i);var done=days.filter(function(d){return cache[d]});if(!done.length)return;
 var cabLabel=st.cabin==='all'?'all cabins':st.cabin;$('h-outlook').textContent='Outlook · '+cabLabel;
 var sums=days.map(function(d){return daySum(d)}),maxRev=niceMax(Math.max.apply(null,sums.map(function(s){return s?s.revenue:0})));
 var mk=function(key){var s=daySum(key);if(!s)return null;var lab=dayLabel(key,true);return{key:key,s:s,title:lab,sel:key===st.day,x:E.fmtDn(key,{day:'numeric',month:'short'}).replace(/^(\d+) (\w+)$/,'$1 $2'),
   rows:[{k:'Load factor',v:pct(s.lf)},{k:'Seats sold',v:int(s.sold)+' of '+int(s.cap)},{k:'Revenue',v:idr(s.revenue)},{k:'Flights',v:String(s.flights)}]}};
 var items=days.map(mk).filter(Boolean);
 columns('c-lf',items.map(function(it){return{key:it.key,v:it.s.lf,vl:pct(it.s.lf),x:it.x,title:it.title,rows:it.rows,sel:it.sel,aria:it.title+': load factor '+pct(it.s.lf)}}),{max:1,tick:function(v){return Math.round(v*100)+'%'},label:'Load factor by departure day, '+cabLabel,pick:pickDay});
 columns('c-rev',items.map(function(it){return{key:it.key,v:it.s.revenue,vl:compact(it.s.revenue),x:it.x,title:it.title,rows:it.rows,sel:it.sel,aria:it.title+': revenue '+idr(it.s.revenue)}}),{max:maxRev,tick:compact,label:'Revenue by departure day, '+cabLabel+', IDR',pick:pickDay});
 table('t-outlook',['Departure day','Flights','Seats sold','Capacity','Load factor','Revenue (IDR)','Refunded (IDR)'],items.map(function(it){return[it.title,String(it.s.flights),int(it.s.sold),int(it.s.cap),pct(it.s.lf),int(it.s.revenue),int(it.s.refunded)]}));
 drawDay()}
function pickDay(d){st.day=d;st.flight=null;st.rows=40;draw()}
function drawDay(){var d=st.day,s=cache[d];if(!s){$('tiles').textContent='';return}var t=daySum(d),lab=dayLabel(d,true),cabLabel=st.cabin==='all'?'all cabins':st.cabin;
 $('h-day').textContent='Flights departing '+lab+' · '+cabLabel;
 var tl=$('tiles');clear(tl);tl.appendChild(tile('Flights',String(t.flights)));tl.appendChild(tile('Seats sold',int(t.sold),'of '+int(t.cap)+' seats'));tl.appendChild(tile('Load factor',pct(t.lf)));
 tl.appendChild(tile('Revenue',idr(t.revenue),'net of refunds'));tl.appendChild(tile('Yield per seat',t.sold?idr(t.soldRevenue/t.sold):'–','sold seats, taxes included'));
 tl.appendChild(tile('Cancelled or changed',int(t.cancelledPax+t.changedPax),'seats released'));tl.appendChild(tile('Refunded',idr(t.refunded)));
 var ch=Object.keys(t.byChannel).map(function(c){return{c:c,r:t.byChannel[c]}}).sort(function(a,b){return b.r.revenue-a.r.revenue}),tot=ch.reduce(function(a,x){return a+x.r.revenue},0)||1;
 hbars('c-chan',ch.map(function(x){return{k:x.c,v:x.r.revenue,vl:idr(x.r.revenue),title:x.c,aria:x.c+': '+idr(x.r.revenue),rows:[{k:'Share of sold revenue',v:pct(x.r.revenue/tot)},{k:'Seats',v:int(x.r.pax)},{k:'Bookings',v:int(x.r.bookings)}]}}),{label:'Sold revenue by sales channel, IDR'});
 var rows=s.flights.filter(function(f){return cabs(f).length}).map(flightSum),k=st.sort.k,dir=st.sort.dir;
 rows.sort(function(a,b){var x=k==='dep'?a.dep:k==='lf'?a.lf:k==='rev'?a.revenue:k==='sold'?a.sold:a.cancelledPax+a.changedPax,y=k==='dep'?b.dep:k==='lf'?b.lf:k==='rev'?b.revenue:k==='sold'?b.sold:b.cancelledPax+b.changedPax;return(x-y)*dir||a.dep-b.dep});
 if(!st.flight&&rows.length)st.flight=rows[0].flight+'|'+rows[0].dep;
 var sel=rows.filter(function(r){return r.flight+'|'+r.dep===st.flight})[0]||rows[0];drawCurve(sel);drawDetail(sel,d);
 var tb=$('flights');clear(tb);var heads=[['dep','Flight'],[null,'Route'],[null,'Aircraft'],['lf','Load factor'],['sold','Seats sold'],['rev','Revenue (IDR)'],['cx','Cancelled / changed']],hr=el('tr');
 heads.forEach(function(h,i){var th=el('th',{class:i>=3?'n':'',scope:'col','aria-sort':h[0]&&h[0]===k?(dir>0?'ascending':'descending'):'none'});if(h[0]){var b=el('button',{type:'button',text:h[1]+(h[0]===k?(dir>0?' ▲':' ▼'):'')});b.addEventListener('click',function(){st.sort={k:h[0],dir:h[0]===k?-dir:(h[0]==='dep'?1:-1)};st.flight=null;drawDay()});th.appendChild(b)}else th.textContent=h[1];hr.appendChild(th)});
 tb.appendChild(el('thead',{},[hr]));var body=el('tbody');
 rows.slice(0,st.rows).forEach(function(r){var f=r.f,leg=f.flight,x=el('tr',{tabindex:'0','aria-selected':String(leg+'|'+f.dep===st.flight),class:leg+'|'+f.dep===st.flight?'on':''}),pick=function(){st.flight=leg+'|'+f.dep;drawDay()};
  var lf=el('td',{class:'n'});lf.appendChild(document.createTextNode(pct(r.lf)));var bar=el('span',{class:'lfbar'});bar.appendChild(el('i',{style:'width:'+Math.round(r.lf*100)+'%'}));lf.appendChild(bar);
  [el('td',{text:leg+'  '+E.fT(f.dep,f.from)}),el('td',{text:f.from+' → '+f.to}),el('td',{text:f.ac}),lf,el('td',{class:'n',text:int(r.sold)+' / '+int(r.cap)}),el('td',{class:'n',text:int(r.revenue)}),el('td',{class:'n',text:int(r.cancelledPax)+' / '+int(r.changedPax)})].forEach(function(c){x.appendChild(c)});
  x.addEventListener('click',pick);x.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}});body.appendChild(x)});
 tb.appendChild(body);var more=$('more');more.hidden=rows.length<=st.rows;more.textContent='Show more flights ('+(rows.length-st.rows)+' left)';more.onclick=function(){st.rows+=100;drawDay()}}
/* the flight's own numbers are regenerated here, for one flight only */
function legOf(f){return D.findLeg(f.flight,E.lp(f.dep,f.from).day)}
function drawCurve(r){var f=r.f,l=legOf(f);if(!l){clear($('c-curve').querySelector('.plot'));return}var dep=E.lp(l.dep,l.from).day,span=60,idx=D.storeIndex(),series=[],showCabs=(st.cabin==='all'?D.cabinsOf(l):[st.cabin]).filter(function(c){return D.cabinsOf(l).indexOf(c)>=0}),tb=[];
 showCabs.forEach(function(c){var at=[],sold=[],d,cap=E.cabinCap(l,c);for(d=0;d<=span;d++){var s=D.summary(l,c,(dep-d)*1440,idx);at[d]=s.loadFactor;sold[d]=s.sold}series.push({name:c,color:CABCOL[c],at:at,sold:sold,cap:cap})});
 $('cap-curve').textContent='Booking curve · '+f.flight+' '+f.from+' → '+f.to+', '+dayLabel(dep,false)+' · seats sold as a share of capacity';
 var lg=$('lg-curve');clear(lg);if(series.length>1)series.forEach(function(s){var sp=el('span');sp.appendChild(el('i',{style:'border-color:'+s.color}));sp.appendChild(document.createTextNode(s.name+' ('+s.cap+' seats)'));lg.appendChild(sp)});
 lines('c-curve',series,{span:span,label:'Booking curve for '+f.flight+', seats sold as a share of capacity by days before departure'});
 [60,45,30,21,14,10,7,5,3,2,1,0].forEach(function(d){tb.push([d?d+' days out':'Departure'].concat(series.map(function(s){return pct(s.at[d])+' ('+s.sold[d]+')'})))});
 table('t-curve',['When'].concat(series.map(function(s){return s.name+' load factor (seats)'})),tb)}
function drawDetail(r,d){var f=r.f,box=$('detail');clear(box);var cmd='DD'+f.flight.replace(' ','')+'/'+ddmon(d);
 box.appendChild(el('h3',{text:f.flight+'  '+f.from+' → '+f.to+'  ·  '+f.ac+'  ·  departs '+E.fT(f.dep,f.from)+'  ·  '+pct(r.lf)+' full, '+idr(r.revenue)+' revenue'}));
 var p=el('p',{});p.appendChild(document.createTextNode('See its bookings in the sales terminal with '));p.appendChild(el('code',{text:cmd}));p.appendChild(document.createTextNode(' and open one with RT and its reference.'));box.appendChild(p);
 var cols=el('div',{class:'cols'}),c1=el('div'),c2=el('div'),c3=el('div');c1.appendChild(el('h4',{text:'Cabins'}));
 var cs=cabs(f).length?Object.keys(f.cabins).filter(function(c){return st.cabin==='all'||c===st.cabin}):[];cs.forEach(function(c){var s=f.cabins[c];c1.appendChild(el('div',{text:c+': '+int(s.sold)+' of '+int(s.cap)+' seats, '+pct(s.loadFactor)+', '+idr(s.revenue)}))});
 c2.appendChild(el('h4',{text:'Channels'}));Object.keys(r.byChannel).sort(function(a,b){return r.byChannel[b].revenue-r.byChannel[a].revenue}).forEach(function(c){c2.appendChild(el('div',{text:c+': '+int(r.byChannel[c].pax)+' seats, '+idr(r.byChannel[c].revenue)}))});
 c3.appendChild(el('h4',{text:'Fare classes (seats)'}));c3.appendChild(el('div',{text:Object.keys(r.byClass).sort().map(function(c){return(c||'–')+' '+int(r.byClass[c])}).join('  ·  ')}));
 c3.appendChild(el('h4',{text:'Released seats',style:'margin-top:8px'}));c3.appendChild(el('div',{text:int(r.cancelledPax)+' cancelled, '+int(r.changedPax)+' changed, '+int(r.noShow)+' no-show, '+idr(r.refunded)+' refunded'}));
 cols.appendChild(c1);cols.appendChild(c2);cols.appendChild(c3);box.appendChild(cols)}
window.GA_REVENUE={state:function(){return st},cache:function(){return cache}};
})();
