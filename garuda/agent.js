/* Sales counter. A desktop tool for agents who sell and issue tickets in person.
   It borrows the pricing engine, seat inventory and e-ticket from the passenger app by loading it in a hidden frame,
   so a seat sold here is a seat gone there. Bookings are kept in this browser (localStorage) until a shared backend is added. */
(function(){
'use strict';
var KEY='ga-agent-bookings',SKEY='ga-agent-shift',CKEY='ga-agent-closed',COUNTER='Counter JKT-03';
var W,P,E={},BKS=[],st={tab:'term',step:'search',q:null,res:[],sel:[null,null],pax:[],contact:{phone:'',email:''},pay:{m:'Cash',tendered:'',ok:false},showErr:false,issued:null,selBook:null,refund:false,filter:'',shift:null,float:500000};
var $=function(id){return document.getElementById(id)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var num=function(n){return (Math.round(n/1000)*1000).toLocaleString('en-US')};
var money=function(n){return 'IDR '+num(n)};
var FAMS=[['Economy','Economy Lite','Lite'],['Economy','Economy Value','Value'],['Economy','Economy Standard','Standard'],['Economy','Economy Flexi','Flexi'],['Premium','Premium Economy','Premium Eco'],['Business','Business Saver','Biz Saver'],['Business','Business Flex','Biz Flex']];
var PAYS=[['Cash','Cash'],['Debit card','EDC terminal shows approved'],['Credit card','EDC terminal shows approved'],['QRIS','QRIS payment received'],['Bank transfer','Transfer received in the bank statement']];
var TYPE={a:'Adult',c:'Child',i:'Infant'};
var store={get:function(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};

/* ---------- start-up: wait for the engine frame ---------- */
var tries=0,timer=setInterval(function(){tries++;var ready=false;try{W=$('eng').contentWindow;ready=!!(W&&W.GA_PRICING&&W.search&&W.eval('typeof CT')==='object'&&W.eval('typeof priceSummary')==='function')}catch(e){}if(ready){clearInterval(timer);init()}
 if(tries>200){clearInterval(timer);$('boot').textContent='The pricing engine did not start. Reload the page.'}},100);

function init(){
 P=W.GA_PRICING;
 E=W.eval('({CT,TD,RULES,fmtDn,fT,dur,cname,idr,seats,nowAbs,hash,HUB,S,dnOf,minEco,isoDow,farEnd})');
 BKS=store.get(KEY,[]);E.S.bookings.length=0;BKS.forEach(function(b){E.S.bookings.push(b)});
 st.shift=store.get(SKEY,null);if(!st.shift){st.shift={start:Date.now(),float:500000};store.set(SKEY,st.shift)}
 var dl=$('cities');dl.innerHTML=Object.keys(E.CT).sort(function(a,b){return E.CT[a].n<E.CT[b].n?-1:1}).map(function(c){return '<option value="'+c+'" label="'+esc(E.CT[c].n)+'"></option>'}).join('');
 $('f-from').value=E.HUB;$('f-d1').min=iso(E.TD+1);$('f-d2').min=iso(E.TD+1);
 $('boot').hidden=true;$('app').hidden=false;
 GA_AGENT.ctx={W:W,P:P,E:E,BKS:BKS,store:store,KEY:KEY,COUNTER:COUNTER,num:num,money:money,esc:esc,dshort:dshort,iso:iso,parseDate:parseDate,ticketNo:ticketNo,ensureTickets:ensureTickets,issueTickets:issueTickets,couponStatus:couponStatus,directionState:directionState,refundBlocked:refundBlocked,refundRows:refundRows,printTicket:printTicket,cancelBooking:cancelBooking,renderAll:renderAll,statusOf:statusOf,tlText:tlText,MON:MON,st:st};
 sweepHeld();setInterval(function(){if(sweepHeld()&&window.GA_TERM)GA_TERM.refresh()},60000);
 wire();tick();setInterval(tick,30000);renderAll();document.dispatchEvent(new Event('ga-agent-ready'));
 var qs=new URLSearchParams(location.search).get('cmd');if(qs){st.tab='sell';renderAll();$('cmd').value=qs;fillFromCmd(qs);runSearch()}
}
function tick(){$('clock').textContent=E.fmtDn(E.TD,{weekday:'short',day:'numeric',month:'short'})+' · '+E.fT(E.nowAbs(),E.HUB)+' WIB'}
function iso(dn){return new Date(dn*864e5).toISOString().slice(0,10)}
function dshort(dn){return E.fmtDn(dn,{weekday:'short',day:'numeric',month:'short'})}

/* ---------- search ---------- */
function city(t){t=String(t||'').trim().toUpperCase();if(!t)return null;if(E.CT[t])return t;var m=t.match(/^([A-Z]{3})\b/);if(m&&E.CT[m[1]])return m[1];var ks=Object.keys(E.CT),x=ks.find(function(c){return E.CT[c].n.toUpperCase()===t})||ks.find(function(c){return E.CT[c].n.toUpperCase().indexOf(t)===0});return x||null}
var MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function parseDate(t){var m=t.match(/^(\d{1,2})([A-Z]{3})(\d{2}|\d{4})?$/);if(!m)return null;var mo=MON.indexOf(m[2]);if(mo<0)return null;var d=+m[1],y=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):null;
 if(y)return Math.floor(Date.UTC(y,mo,d)/864e5);var ty=new Date(E.TD*864e5).getUTCFullYear(),dn=Math.floor(Date.UTC(ty,mo,d)/864e5);if(dn<=E.TD)dn=Math.floor(Date.UTC(ty+1,mo,d)/864e5);return dn}
function fillFromCmd(s){var t=String(s).toUpperCase().split(/\s+/).filter(Boolean),cities=[],dates=[],pax=null;
 t.forEach(function(x){var d=parseDate(x);if(d!=null){dates.push(d);return}var p=x.match(/^(?:(\d+)A)?(?:(\d+)C)?(?:(\d+)I)?$/);if(p&&x){pax=[+p[1]||1,+p[2]||0,+p[3]||0];return}if(/^[YWJ]$/.test(x))return;if(E.CT[x])cities.push(x)});
 if(cities[0])$('f-from').value=cities[0];if(cities[1])$('f-to').value=cities[1];if(dates[0]!=null)$('f-d1').value=iso(dates[0]);$('f-d2').value=dates[1]!=null?iso(dates[1]):'';
 if(pax){$('f-a').value=pax[0];$('f-c').value=pax[1];$('f-i').value=pax[2]}}
function readForm(){var from=city($('f-from').value),to=city($('f-to').value),d1=E.dnOf($('f-d1').value),d2=E.dnOf($('f-d2').value),a=+$('f-a').value||0,c=+$('f-c').value||0,i=+$('f-i').value||0,ret=d2!=null;
 var err='';if(!from)err='Choose a departure airport.';else if(!to)err='Choose a destination airport.';else if(from===to)err='Departure and destination must differ.';else if(d1==null||d1<=E.TD)err='Choose a departure date from tomorrow onwards.';else if(ret&&d2<d1)err='The return date must be on or after the departure date.';else if(a<1)err='At least one adult is needed.';else if(i>a)err='Each infant needs an adult. Infants cannot outnumber adults.';else if(a+c>9)err='A booking holds at most 9 seats (adults and children).';
 return {err:err,q:{from:from,to:to,type:ret?'ret':'one',d1:d1,d2:ret?d2:d1,a:a,c:c,i:i,cab:'Economy'}}}
function runSearch(){var f=readForm();$('serr').textContent=f.err;if(f.err)return;
 st.q=f.q;st.sel=[null,null];st.step='search';st.pax=[];st.issued=null;st.showErr=false;st.pay={m:'Cash',tendered:'',ok:false};P.clear();doSearch();renderAll()}
function doSearch(){var q=st.q;st.res=[W.search(q.from,q.to,q.d1)];if(q.type==='ret')st.res.push(W.search(q.to,q.from,q.d2))}
function dirs(){return st.q?(st.q.type==='ret'?2:1):0}
function dirRoute(d){var q=st.q;return d===0?[q.from,q.to]:[q.to,q.from]}
function allSelected(){for(var d=0;d<dirs();d++)if(!st.sel[d])return false;return true}

/* ---------- results ---------- */
function stepsHtml(){var S=['Flights','Passengers','Payment','Ticket'],ix={search:0,pax:1,pay:2,done:3}[st.step];return '<div class="steps">'+S.map(function(s,i){return '<span class="'+(i===ix?'on':i<ix?'done':'')+'">'+(i+1)+'. '+s+'</span>'}).join('')+'</div>'}
function bestFrom(o,d,dn){var r=W.search(o,d,dn);if(!r.length)return null;var q=st.q,m=null;r.forEach(function(it){var p=W.priceFor(it,W.fares(it)[0].fam[0],q).total;if(m==null||p<m)m=p});return m}
function daysHtml(d){var q=st.q,r=dirRoute(d),base=d===0?q.d1:q.d2,h='';for(var k=-3;k<=3;k++){var dn=base+k;if(dn<=E.TD||(d===1&&dn<q.d1))continue;var p=bestFrom(r[0],r[1],dn);h+='<button type="button" data-day="'+d+':'+dn+'" class="'+(k===0?'on':'')+'"><b>'+dshort(dn)+'</b><span>'+(p?'from '+num(p):'no flights')+'</span></button>'}return '<div class="days">'+h+'</div>'}
function flightsOf(it){return it.legs.map(function(l){return esc(l.id)}).join(' + ')}
function timesHtml(it){var a=it.legs[0],z=it.legs[it.legs.length-1],dd=W.lp(z.arr,z.to).day-W.lp(a.dep,a.from).day;return '<span class="t">'+E.fT(a.dep,a.from)+'</span> → <span class="t">'+E.fT(z.arr,z.to)+(dd>0?'<sup>+'+dd+'</sup>':'')+'</span>'}
function dirTable(d){var q=st.q,r=dirRoute(d),its=st.res[d]||[],need=E.seats(q),cur=st.sel[d];
 var head='<tr><th>Flight</th><th>Times (local)</th><th>Duration</th>'+FAMS.map(function(f,i){var first=i===0||FAMS[i-1][0]!==f[0];return '<th class="fh'+(first?' first':'')+'">'+f[2]+'</th>'}).join('')+'</tr>';
 var rows=its.map(function(it,ix){var fs=W.fares(it),via=it.stops?'via '+it.legs[0].to+', '+E.dur(it.legs[1].dep-it.legs[0].arr)+' wait':'Non-stop',isSel=cur&&cur.it.key===it.key;
  var cells=FAMS.map(function(f,ci){var first=ci===0||FAMS[ci-1][0]!==f[0],cab=fs.find(function(c){return c.k===f[0]}),fam=cab&&cab.fam.find(function(x){return x.n===f[1]});
   if(!cab||!fam)return '<td class="fc'+(first?' first':'')+'"><span class="fare" style="color:#9aa9b1">—</span></td>';
   var avail=cab.left>=need,pr=W.priceFor(it,fam,q).total,on=isSel&&cur.fam.n===fam.n,low=avail&&cab.atFare<=4&&cab.atFare<cab.left,note=!avail?'Full':(cab.left>9?'9+ left':cab.left+' left')+(low?' · '+cab.atFare+' at fare':'');
   return '<td class="fc'+(first?' first':'')+'"><button type="button" class="fare'+(on?' on':'')+(low?' low':'')+'" '+(avail?'':'disabled ')+'data-pick="'+d+':'+ix+':'+ci+'"><b>'+num(pr)+'</b><small>'+note+'</small></button></td>'}).join('');
  return '<tr'+(isSel?' class="sel"':'')+'><td class="fl"><b>'+flightsOf(it)+'</b><small>'+esc(it.legs.map(function(l){return l.ac}).filter(function(x,i,a){return a.indexOf(x)===i}).join(' / '))+'</small></td><td>'+timesHtml(it)+'</td><td>'+E.dur(it.dur)+'<small style="display:block;color:var(--mute);font-size:12px">'+esc(via)+'</small></td>'+cells+'</tr>'}).join('');
 return '<div class="pane"><h2><span>'+(q.type==='ret'?(d===0?'Outbound':'Return')+' · ':'')+esc(E.cname(r[0]))+' ('+r[0]+') to '+esc(E.cname(r[1]))+' ('+r[1]+') · '+dshort(d===0?q.d1:q.d2)+'</span><small>'+its.length+' option'+(its.length===1?'':'s')+' · prices are the total for '+paxTxt(q)+'</small></h2>'+daysHtml(d)
  +(its.length?'<div class="tw"><table><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty">No flights on this date. Try another day above.</div>')+'</div>'}
function paxTxt(q){return q.a+' adult'+(q.a>1?'s':'')+(q.c?', '+q.c+' child'+(q.c>1?'ren':''):'')+(q.i?', '+q.i+' infant'+(q.i>1?'s':''):'')}

/* ---------- quote panel ---------- */
function pricing(){if(!allSelected())return null;return W.priceSummary(st.sel.slice(0,dirs()).map(function(s){return {it:s.it,fam:s.fam}}),st.q)}
function quoteHtml(){var q=st.q;if(!q)return '<div class="pane"><h2>Quote</h2><div class="empty">Search for a route to start a sale.</div></div>';
 var h='<div class="pane"><h2>Quote <small>'+paxTxt(q)+'</small></h2>',any=false;
 for(var d=0;d<dirs();d++){var s=st.sel[d],r=dirRoute(d);if(!s){h+='<div class="q-dir"><small>'+(q.type==='ret'?(d?'Return':'Outbound'):'Flight')+' · '+r[0]+' → '+r[1]+'</small><span style="color:var(--mute)">Not chosen yet</span></div>';continue}
  any=true;var pr=W.priceFor(s.it,s.fam,q);h+='<div class="q-dir"><span class="r"><b>'+num(pr.total)+'</b></span><small>'+(q.type==='ret'?(d?'Return':'Outbound'):'Flight')+' · '+dshort(W.lp(s.it.legs[0].dep,s.it.legs[0].from).day)+'</small><b>'+flightsOf(s.it)+'</b> '+r[0]+' → '+r[1]+'<small>'+esc(s.fam.n)+' · '+timesHtml(s.it).replace(/<[^>]+>/g,'')+'</small></div>'}
 var p=pricing();
 if(p){h+='<div style="padding-top:6px"><div class="q-row"><span>Fare</span><span>'+money(p.fare)+'</span></div><div class="q-row"><span>PPN (VAT)</span><span>'+money(p.tax)+'</span></div><div class="q-row"><span>Airport charges</span><span>'+money(p.chg)+'</span></div><div class="q-row tot"><span>Total</span><span>'+money(p.total)+'</span></div></div>';
  var rt=q.type==='ret'?W.rtDetail(q,st.sel[0].it).parts:[];if(rt.length)h+='<div class="q-note">'+rt.map(function(x){return esc(x[0])+' '+(x[1]>0?'+':'−')+Math.round(Math.abs(x[1])*100)+'%'}).join('<br>')+'</div>';
  var names=[];st.sel.slice(0,dirs()).forEach(function(s){if(names.indexOf(s.fam.n)<0)names.push(s.fam.n)});
  h+=names.map(function(n){var r=E.RULES[n];return '<div class="q-rules"><b>'+esc(n)+'</b><dl><dt>Baggage</dt><dd>'+esc(r.bag)+'; checked '+esc(r.chk.toLowerCase())+'</dd><dt>Seat</dt><dd>'+esc(r.seat)+'</dd><dt>Changes</dt><dd>'+esc(r.chg)+'</dd><dt>Refund</dt><dd>'+esc(r.ref)+'</dd></dl></div>'}).join('')}
 else if(!any)h+='<div class="empty" style="padding:20px">Click a price in the table to choose a fare.</div>';
 h+='<div class="q-act">'+actionHtml(p)+'</div></div>';return h}
function actionHtml(p){
 if(st.step==='search')return '<button type="button" class="pri" data-act="to-pax"'+(p?'':' disabled')+'>Continue to passengers</button>';
 if(st.step==='pax')return '<button type="button" class="pri" data-act="to-pay">Continue to payment</button><button type="button" class="ghost" data-act="back-search">Back to flights</button>';
 if(st.step==='pay')return '<button type="button" class="pri" data-act="issue"'+(payValid()?'':' disabled')+'>Issue ticket · '+money(p.total)+'</button><button type="button" class="ghost" data-act="back-pax">Back to passengers</button>';
 return '<button type="button" class="pri" data-act="new">New sale</button>'}

/* ---------- passengers ---------- */
function mkPax(){var q=st.q,a=[];['a','c','i'].forEach(function(t){for(var n=0;n<q[t];n++)a.push({type:t,title:'',first:'',last:'',dob:'',lap:0})});st.pax=a}
function age(dob,dn){if(!dob)return null;var b=new Date(dob+'T00:00:00Z'),t=new Date(dn*864e5),y=t.getUTCFullYear()-b.getUTCFullYear();if(t.getUTCMonth()<b.getUTCMonth()||(t.getUTCMonth()===b.getUTCMonth()&&t.getUTCDate()<b.getUTCDate()))y--;return y}
function paxErrors(){var q=st.q,e={},last=q.type==='ret'?q.d2:q.d1,nm=/^[A-Za-z][A-Za-z .'-]*$/;
 st.pax.forEach(function(p,i){if(p.type!=='i'&&!p.title)e['p'+i+'t']='Choose a title.';if(!p.first.trim())e['p'+i+'f']='Enter the given name.';else if(!nm.test(p.first.trim()))e['p'+i+'f']='Letters only.';
  if(!p.last.trim())e['p'+i+'l']='Enter the surname.';else if(!nm.test(p.last.trim()))e['p'+i+'l']='Letters only.';
  var a=age(p.dob,last),a0=age(p.dob,q.d1);if(p.type!=='a'&&!p.dob)e['p'+i+'d']='Date of birth is required.';else if(p.dob&&p.dob>iso(E.TD))e['p'+i+'d']='Date of birth is in the future.';
  else if(p.type==='c'&&p.dob&&(a<2||a>11))e['p'+i+'d']='A child is 2 to 11 on the travel date.';else if(p.type==='i'&&p.dob&&a>=2)e['p'+i+'d']='An infant is under 2 on the travel date.';else if(p.type==='a'&&p.dob&&a0<12)e['p'+i+'d']='An adult is 12 or over.'});
 if(!/^\+?[0-9 ()-]{8,}$/.test(st.contact.phone.trim()))e.phone='Enter a phone number.';if(st.contact.email.trim()&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(st.contact.email.trim()))e.email='Check the email address.';return e}
function field(id,label,val,attrs,err){return '<div><label for="'+id+'">'+label+'</label><input id="'+id+'" value="'+esc(val)+'" '+(attrs||'')+(err?' class="bad" aria-invalid="true"':'')+'>'+(err?'<div class="msg">'+esc(err)+'</div>':'')+'</div>'}
function paxHtml(){if(!st.pax.length)mkPax();var e=st.showErr?paxErrors():{},ad=st.pax.map(function(p,i){return p.type==='a'?i:-1}).filter(function(i){return i>=0});
 var rows=st.pax.map(function(p,i){var n=st.pax.slice(0,i).filter(function(x){return x.type===p.type}).length+1;
  return '<div class="px"><h3>'+TYPE[p.type]+' '+n+'<span>'+(p.type==='a'?'12 years and over':p.type==='c'?'2 to 11 years':'under 2 · on an adult’s lap')+'</span></h3><div class="grid">'
   +'<div><label for="p'+i+'t">Title'+(p.type==='i'?' (optional)':'')+'</label><select id="p'+i+'t" data-p="'+i+':title"'+(e['p'+i+'t']?' class="bad" aria-invalid="true"':'')+'><option value="">Choose</option>'+(p.type==='a'?['MR','MRS','MS','MISS']:['MSTR','MISS']).map(function(x){return '<option'+(p.title===x?' selected':'')+'>'+x+'</option>'}).join('')+'</select>'+(e['p'+i+'t']?'<div class="msg">'+esc(e['p'+i+'t'])+'</div>':'')+'</div>'+field('p'+i+'f','Given names',p.first,'data-p="'+i+':first" autocomplete="off"',e['p'+i+'f'])+field('p'+i+'l','Surname',p.last,'data-p="'+i+':last" autocomplete="off"',e['p'+i+'l'])
   +field('p'+i+'d','Date of birth'+(p.type==='a'?' (optional)':''),p.dob,'type="date" data-p="'+i+':dob"',e['p'+i+'d'])
   +(p.type==='i'?'<div><label for="p'+i+'a">Travels with</label><select id="p'+i+'a" data-p="'+i+':lap">'+ad.map(function(x,k){return '<option value="'+k+'"'+(+p.lap===k?' selected':'')+'>Adult '+(k+1)+(st.pax[x].first?' · '+esc(st.pax[x].first):'')+'</option>'}).join('')+'</select></div>':'')+'</div></div>'}).join('');
 return stepsHtml()+'<div class="pane"><h2>Passengers <small>Names as shown on the passport or ID</small></h2>'+rows+'</div><div class="pane"><h2>Contact</h2><div class="px"><div class="grid">'+field('c-phone','Phone',st.contact.phone,'type="tel" data-c="phone"',e.phone)+field('c-email','Email (optional)',st.contact.email,'type="email" data-c="email"',e.email)+'</div></div></div>'}

/* ---------- payment ---------- */
function payValid(){var p=pricing();if(!p)return false;if(st.pay.m==='Cash')return +st.pay.tendered>=p.total;return !!st.pay.ok}
function payHtml(){var p=pricing(),m=st.pay.m,def=PAYS.find(function(x){return x[0]===m});
 var h=stepsHtml()+'<div class="pane"><h2>Payment <small>Amount due '+money(p.total)+'</small></h2><div class="pm" role="group" aria-label="Payment method">'+PAYS.map(function(x){return '<button type="button" data-pm="'+x[0]+'" class="'+(x[0]===m?'on':'')+'">'+x[0]+'</button>'}).join('')+'</div>';
 if(m==='Cash'){var t=+st.pay.tendered||0,ch=t-p.total;h+='<div class="px"><div class="grid">'+field('tend','Cash received (IDR)',st.pay.tendered,'type="number" min="0" step="1000" inputmode="numeric" data-tend="1"')+'<div style="display:flex;align-items:flex-end;gap:8px"><button type="button" class="ghost" data-exact="1">Exact amount</button><button type="button" class="ghost" data-round="1">Round up</button></div></div></div><div class="chg '+(t&&ch>=0?'ok':'')+(t&&ch<0?'bad':'')+'" id="chg"><span>'+(t&&ch<0?'Still to collect':'Change to give')+'</span><b>'+(t?money(Math.abs(ch)):'—')+'</b></div>'}
 else h+='<div class="px"><label style="display:flex;gap:8px;align-items:center;color:var(--ink);font-size:14px"><input type="checkbox" style="width:auto;height:auto" data-ok="1"'+(st.pay.ok?' checked':'')+'> '+def[1]+'</label></div>';
 return h+'<p class="note" style="padding:0 14px 12px">The ticket is issued only after payment is confirmed. Nothing is charged: this is a simulation.</p></div>'}

/* ---------- issue ---------- */
function ticketNo(b,i){return '126-'+String(E.hash(b.ref+'T'+i+(b.tv?'R'+b.tv:''))%1e10).padStart(10,'0')}
/* Ticket records are simulation records; elapsed arrival is an inferred flown status. */
function couponStatus(c){return c.status==='OPEN'&&c.arr+(c.delay||0)<=E.nowAbs()?'FLOWN':c.status}
function issueTickets(b,previous){var old=previous||[];b.tickets=b.names.map(function(name,i){var prior=old[i],coupons=[];b.dirs.forEach(function(d,di){d.legs.forEach(function(l,li){var was=prior&&prior.coupons.find(function(c){return c.d===di&&c.l===li&&couponStatus(c)==='FLOWN'});if(!was)coupons.push({d:di,l:li,flight:l.id,from:l.from,to:l.to,dep:l.dep,arr:l.arr,delay:l.delay||0,status:'OPEN'})})});return {number:ticketNo(b,i),passenger:i,issuedAt:Date.now(),coupons:coupons}})}
function ensureTickets(b){if(b.held||!b.issuedMs)return [];if(!b.tickets){issueTickets(b);if(b.cancelled)b.tickets.forEach(function(t){t.coupons.forEach(function(c){if(couponStatus(c)==='OPEN')c.status='REFUNDED'})});store.set(KEY,BKS)}return b.tickets}
function directionState(b,di){var ts=ensureTickets(b);if(!ts.length)return 'OPEN';var cs=ts[0].coupons.filter(function(c){return c.d===di}),statuses=cs.map(couponStatus);if(!cs.length)return 'FLOWN';if(statuses.every(function(x){return x==='OPEN'}))return 'OPEN';if(statuses.every(function(x){return x==='FLOWN'}))return 'FLOWN';return 'PARTIAL'}
function refundBlocked(b){return !b.held&&((b.award&&b.award.issued)||b.dirs.some(function(d,i){return directionState(b,i)==='PARTIAL'}))}
function stillAvailable(){var need=E.seats(st.q);for(var d=0;d<dirs();d++){var s=st.sel[d],c=W.fares(s.it).find(function(x){return x.k===s.cab});if(!c||c.left<need)return false}return true}
function issue(){if(!allSelected()||!payValid())return;
 if(!stillAvailable()){st.sel=[null,null];st.step='search';P.clear();renderAll();$('serr').textContent='That cabin sold out while you were working. Choose another fare.';return}
 var q=st.q,p=pricing(),names=st.pax.map(function(x){return (x.first.trim()+' '+x.last.trim()).replace(/\s+/g,' ')}),sel=st.sel.slice(0,dirs());
 var bk=W.mkBooking(q,sel.map(function(s){return s.it}),sel.map(function(s){return {cab:s.cab,fam:s.fam}}),names);
 var adults=[];st.pax.forEach(function(x,i){if(x.type==='a')adults.push(i)});
 bk.confirmedAt=E.nowAbs();bk.passengers=st.pax.map(function(x,i){return {type:x.type,name:names[i],first:x.first.trim(),last:x.last.trim(),title:x.title||'',dob:x.dob||null,lapAdult:x.type==='i'?names[adults[+x.lap]]:null}});
 bk.paid0=bk.total;bk.paid=bk.total;bk.contactEmail=st.contact.email.trim();bk.contactPhone=st.contact.phone.trim();bk.paymentMethod=st.pay.m;bk.place=COUNTER;
 var tend=st.pay.m==='Cash'?+st.pay.tendered:p.total;bk.payment={method:st.pay.m,tendered:tend,change:tend-p.total,approval:st.pay.m==='Cash'?'':String(100000+E.hash(bk.ref+'AP')%900000)};
 bk.dirPrices=sel.map(function(s){return W.priceFor(s.it,s.fam,q)});bk.issuedMs=Date.now();issueTickets(bk);
 sel.forEach(function(s){s.it.legs.forEach(function(l){W.adjustSold(l,s.cab,E.seats(q))})});P.clear();
 E.S.bookings.unshift(bk);BKS.unshift(bk);store.set(KEY,BKS);st.issued=bk;st.step='done';renderAll()}
function doneHtml(){var b=st.issued;return stepsHtml()+'<div class="pane"><h2>Ticket issued <small>'+esc(COUNTER)+'</small></h2><div class="done"><div style="color:var(--mute)">Booking reference</div><div class="ref">'+esc(b.ref)+'</div><div class="tk">'+b.names.map(function(n,i){return '<div><span>'+esc(n.toUpperCase())+'</span>'+ticketNo(b,i)+'</div>'}).join('')+'</div>'
 +'<div class="note">Total '+money(b.total)+' · '+esc(b.paymentMethod)+(b.payment&&b.payment.method==='Cash'&&b.payment.change>0?' · change given '+money(b.payment.change):'')+(b.payment&&b.payment.approval?' · approval '+b.payment.approval:'')+'</div>'
 +'<div class="acts"><button type="button" class="pri" data-print="'+esc(b.ref)+'">Print e-ticket</button><button type="button" class="ghost" data-openbook="'+esc(b.ref)+'">Open booking</button></div></div></div>'}
function printTicket(ref){var i=BKS.findIndex(function(b){return b.ref===ref});if(i<0)return;E.S.bk=i;W.go('eticket');setTimeout(function(){try{W.focus();W.print()}catch(e){window.print()}},350)}

/* ---------- bookings tab ---------- */
function isCancelled(b){return !!b.cancelled}
function statusOf(b){return b.cancelled?(b.cancelled.expired?['Expired','bad']:['Cancelled','bad']):b.held?['Held','warn']:['Ticketed','ok']}
function tlText(ms){var d=new Date(ms+7*36e5),p=function(n){return String(n).padStart(2,'0')};return d.getUTCDate()+MON[d.getUTCMonth()]+' '+p(d.getUTCHours())+p(d.getUTCMinutes())+' WIB'}
function routeOf(b){var d0=b.dirs[0].legs;return d0[0].from+(b.dirs.length>1?' ⇄ ':' → ')+d0[d0.length-1].to}
function dateOf(b){var l=b.dirs[0].legs[0];return dshort(W.lp(l.dep,l.from).day)}
function booksHtml(){var f=st.filter.trim().toUpperCase(),list=BKS.filter(function(b){return !f||b.ref.indexOf(f)>=0||b.names.join(' ').toUpperCase().indexOf(f)>=0||routeOf(b).indexOf(f)>=0});
 var rows=list.map(function(b){return '<tr class="row'+(st.selBook===b.ref?' on':'')+'" data-book="'+b.ref+'"><td><b>'+esc(b.ref)+'</b></td><td>'+esc(b.names[0])+(b.names.length>1?' +'+(b.names.length-1):'')+'</td><td>'+routeOf(b)+'</td><td>'+dateOf(b)+'</td><td class="n">'+num(b.total)+'</td><td>'+(b.held&&!b.cancelled?'—':esc(b.paymentMethod||'—'))+'</td><td><span class="tag '+statusOf(b)[1]+'">'+statusOf(b)[0]+'</span></td></tr>'}).join('');
 var sel=BKS.find(function(b){return b.ref===st.selBook});
 return '<div class="filter"><input id="bq" placeholder="Find by reference, name or route" value="'+esc(st.filter)+'" aria-label="Find a booking"></div><div class="split"><div class="pane"><h2>Bookings <small>'+list.length+' of '+BKS.length+'</small></h2>'
  +(list.length?'<div class="tw"><table><thead><tr><th>Ref</th><th>Passenger</th><th>Route</th><th>Departs</th><th class="n">Total (IDR)</th><th>Paid by</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty">'+(BKS.length?'No booking matches.':'No tickets issued yet. Sell one from the Sell tab.')+'</div>')+'</div><div>'+(sel?detailHtml(sel):'<div class="pane"><div class="empty">Select a booking to see its tickets and options.</div></div>')+'</div></div>'}
function refundRows(b){var seatsN=b.pax.a+b.pax.c,n=b.dirs.length,rows=[],tot=0;
 b.dirs.forEach(function(d,i){if(!b.held&&directionState(b,i)==='FLOWN')return;var dp=(b.dirPrices&&b.dirPrices[i])||{fare:b.fare/n,tax:b.tax/n,chg:b.chg/n,total:b.total/n},famN=b.fams[i]||b.fams[0],rule=(E.RULES[famN]||{}).ref||'',fee=0,paid=dp.total;
  if(/^Not refundable/i.test(rule))fee=dp.fare;else if(/IDR\s*([\d,]+)\s*fee/i.test(rule))fee=+rule.match(/IDR\s*([\d,]+)/)[1].replace(/,/g,'')*seatsN;else if(/(\d+)%\s*fee/i.test(rule))fee=dp.fare*(+rule.match(/(\d+)%/)[1]/100);
  fee=Math.min(fee,paid);var ref=paid-fee;tot+=ref;rows.push({dir:d.legs[0].from+' → '+d.legs[d.legs.length-1].to,fam:famN,rule:rule,paid:paid,fee:fee,refund:ref})});return {rows:rows,total:tot}}
function detailHtml(b){var cx=isCancelled(b),h='<div class="pane"><h2>'+esc(b.ref)+' <span class="tag '+statusOf(b)[1]+'">'+statusOf(b)[0]+'</span></h2><div class="in"><dl class="kv">';
 h+='<dt>Passengers</dt><dd>'+b.names.map(function(n,i){return esc(((b.passengers&&b.passengers[i]&&b.passengers[i].title?b.passengers[i].title+' ':'')+n).toUpperCase())+' <span class="t" style="color:var(--mute)">'+ticketNo(b,i)+'</span>'}).join('<br>')+'</dd>';
 b.dirs.forEach(function(d,i){h+='<dt>'+(b.dirs.length>1?(i?'Return':'Outbound'):'Flight')+'</dt><dd>'+d.legs.map(function(l){return '<b>'+esc(l.id)+'</b> '+l.from+' '+E.fT(l.dep,l.from)+' → '+l.to+' '+E.fT(l.arr,l.to)+' · '+dshort(W.lp(l.dep,l.from).day)}).join('<br>')+'<br><span style="color:var(--mute)">'+esc(b.fams[i]||b.fams[0])+'</span></dd>'});
 if(b.award&&b.award.issued)h+='<dt>Award redemption</dt><dd>'+b.award.miles.toLocaleString('en-US')+' miles · simulated</dd>';
 h+='<dt>Total</dt><dd><b>'+money(b.total)+'</b> <span style="color:var(--mute)">(fare '+num(b.fare)+', PPN '+num(b.tax)+', airport charges '+num(b.chg)+')</span></dd><dt>Paid by</dt><dd>'+(b.held?'Not paid. Ticketing time limit '+tlText(b.tl)+'. Ticket it in the Terminal with ET.':esc(b.paymentMethod||'')+(b.payment&&b.payment.approval?' · approval '+b.payment.approval:''))+'</dd><dt>Issued</dt><dd>'+esc(b.place||'Online')+(b.issuedMs?' · '+new Date(b.issuedMs).toLocaleString('en-GB',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'')+'</dd>'+(b.reissues&&b.reissues.length?'<dt>Reissued</dt><dd>'+b.reissues.map(function(r){return esc(r.note)+' · collected '+money(r.collected)}).join('<br>')+'</dd>':'')+'<dt>Contact</dt><dd>'+esc(b.contactPhone||'')+(b.contactEmail?' · '+esc(b.contactEmail):'')+'</dd>';
 if(cx&&b.cancelled.held)h+='<dt>'+(b.cancelled.expired?'Expired':'Cancelled')+'</dt><dd>Seats released '+(b.cancelled.at?new Date(b.cancelled.at).toLocaleString('en-GB',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'')+'</dd>';else if(cx)h+='<dt>Cancelled</dt><dd>Refund '+money(b.cancelled.refund)+' to '+esc(b.paymentMethod)+(b.cancelled.at?' · '+new Date(b.cancelled.at).toLocaleString('en-GB',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'')+'</dd>';
 h+='</dl>';
 if(st.refund&&!cx&&!b.held&&refundBlocked(b)){h+='<p class="note">This booking requires manual refund review (award ticket or partly flown direction).</p><button type="button" class="ghost" data-cxno="1">Back</button>'}
 else if(st.refund&&!cx&&!b.held){var r=refundRows(b);h+='<h3 style="margin:16px 0 6px;font-size:13px">Cancel and refund</h3><table><thead><tr><th>Direction</th><th>Fare rule</th><th class="n">Paid</th><th class="n">Fee kept</th><th class="n">Refund</th></tr></thead><tbody>'+r.rows.map(function(x){return '<tr><td>'+x.dir+'</td><td>'+esc(x.fam)+'<small style="display:block;color:var(--mute)">'+esc(x.rule)+'</small></td><td class="n">'+num(x.paid)+'</td><td class="n">'+num(x.fee)+'</td><td class="n"><b>'+num(x.refund)+'</b></td></tr>'}).join('')+'</tbody></table><div class="chg"><span>Refund to '+esc(b.paymentMethod)+'</span><b>'+money(r.total)+'</b></div><p class="note">Fees follow the fare rules of this simulation. Taxes and airport charges are refunded unless the fee is larger. The seats go back on sale.</p><div class="btns"><button type="button" class="pri danger" style="background:var(--bad);border:0;color:#fff" data-cxgo="'+b.ref+'">Cancel booking and refund</button><button type="button" class="ghost" data-cxno="1">Keep booking</button></div>'}
 else h+='<div class="btns">'+(cx?'':b.held?'<button type="button" class="ghost danger" data-cxgo="'+b.ref+'">Cancel booking and release seats</button>':'<button type="button" class="pri" data-print="'+b.ref+'">Print e-ticket</button><button type="button" class="ghost danger" data-cx="'+b.ref+'">Cancel and refund…</button>')+'</div>';
 return h+'</div></div>'}
function cancelBooking(ref,expired){var b=BKS.find(function(x){return x.ref===ref});if(!b||isCancelled(b)||refundBlocked(b))return;var held=!!b.held,r=held?{rows:[],total:0}:refundRows(b),n=b.pax.a+b.pax.c;
 b.dirs.forEach(function(d,i){if(!held&&directionState(b,i)==='FLOWN')return;d.legs.forEach(function(l){l.status='cancel';W.adjustSold(l,(b.cabs&&b.cabs[i])||b.cab,-n)})});if(!held)ensureTickets(b).forEach(function(t){t.coupons.forEach(function(c){if(couponStatus(c)==='OPEN')c.status='REFUNDED'})});P.clear();
 b.cancelled={at:Date.now(),refund:Math.round(r.total),rows:r.rows,held:held,expired:!!expired};(b.hist=b.hist||[]).push({at:Date.now(),t:expired?'TICKETING TIME LIMIT PASSED - SEATS RELEASED':held?'HELD BOOKING CANCELLED':'BOOKING CANCELLED, REFUND '+Math.round(r.total)});store.set(KEY,BKS);st.refund=false;renderAll()}
function sweepHeld(){var n=0;BKS.slice().forEach(function(b){if(b.held&&!b.cancelled&&b.tl&&b.tl<Date.now()){cancelBooking(b.ref,true);n++}});return n}

/* ---------- shift tab ---------- */
function shiftData(){var s=st.shift.start,sales=BKS.filter(function(b){return (b.issuedMs||0)>=s&&b.place===COUNTER}),cx=BKS.filter(function(b){return b.cancelled&&!b.cancelled.held&&b.cancelled.at>=s&&b.place===COUNTER}),by={},reiss=0;
 PAYS.forEach(function(p){by[p[0]]={n:0,sales:0,refunds:0}});sales.forEach(function(b){var m=by[b.paymentMethod]||(by[b.paymentMethod]={n:0,sales:0,refunds:0});m.n++;m.sales+=(b.paid0||b.total)});BKS.forEach(function(b){if(b.place!==COUNTER)return;(b.reissues||[]).forEach(function(r){if(r.at>=s&&r.collected>0){var m=by[r.method]||(by[r.method]={n:0,sales:0,refunds:0});m.sales+=r.collected;reiss+=r.collected}})});cx.forEach(function(b){var m=by[b.paymentMethod]||(by[b.paymentMethod]={n:0,sales:0,refunds:0});m.refunds+=b.cancelled.refund});
 var S=sales.reduce(function(a,b){return a+(b.paid0||b.total)},0)+reiss,R=cx.reduce(function(a,b){return a+b.cancelled.refund},0);return {sales:sales,cx:cx,by:by,S:S,R:R,cash:by.Cash.sales-by.Cash.refunds}}
function shiftHtml(){var d=shiftData(),fl=+st.shift.float||0,exp=fl+d.cash,cnt=st.shift.counted,diff=cnt==null||cnt===''?null:+cnt-exp,closed=store.get(CKEY,[]);
 var rows=Object.keys(d.by).map(function(k){var m=d.by[k];return '<tr><td>'+esc(k)+'</td><td class="n">'+m.n+'</td><td class="n">'+num(m.sales)+'</td><td class="n">'+num(m.refunds)+'</td><td class="n"><b>'+num(m.sales-m.refunds)+'</b></td></tr>'}).join('');
 return '<div class="stat"><div><small>Shift started</small><b style="font-size:15px">'+new Date(st.shift.start).toLocaleString('en-GB',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</b></div><div><small>Bookings issued</small><b>'+d.sales.length+'</b></div><div><small>Sales</small><b>'+num(d.S)+'</b></div><div><small>Refunds</small><b>'+num(d.R)+'</b></div><div><small>Net</small><b>'+num(d.S-d.R)+'</b></div></div>'
 +'<div class="split"><div class="pane"><h2>By payment method <small>IDR</small></h2><div class="tw"><table><thead><tr><th>Method</th><th class="n">Bookings</th><th class="n">Sales</th><th class="n">Refunds</th><th class="n">Net</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
 +'<div class="pane"><h2>Cash drawer</h2><div class="px"><div class="grid">'+field('fl','Opening float (IDR)',st.shift.float,'type="number" min="0" step="1000" data-sf="float"')+field('cn','Cash counted (IDR)',cnt==null?'':cnt,'type="number" min="0" step="1000" data-sf="counted"')+'</div></div>'
 +'<div class="chg"><span>Expected in drawer (float + cash sales − cash refunds)</span><b>'+money(exp)+'</b></div><div class="chg '+(diff==null?'':diff===0?'ok':'bad')+'" id="vr"><span>Difference</span><b>'+(diff==null?'—':(diff>0?'+':'')+num(diff))+'</b></div>'
 +'<div class="q-act"><button type="button" class="pri" data-act="close-shift"'+(diff==null?' disabled':'')+'>Close shift and start a new one</button></div></div></div>'
 +(closed.length?'<div class="pane"><h2>Closed shifts</h2><div class="tw"><table><thead><tr><th>Closed</th><th class="n">Bookings</th><th class="n">Net sales</th><th class="n">Expected cash</th><th class="n">Counted</th><th class="n">Difference</th></tr></thead><tbody>'+closed.slice().reverse().slice(0,8).map(function(c){return '<tr><td>'+new Date(c.end).toLocaleString('en-GB',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</td><td class="n">'+c.n+'</td><td class="n">'+num(c.net)+'</td><td class="n">'+num(c.expected)+'</td><td class="n">'+num(c.counted)+'</td><td class="n">'+(c.diff>0?'+':'')+num(c.diff)+'</td></tr>'}).join('')+'</tbody></table></div></div>':'')}
function closeShift(){var d=shiftData(),fl=+st.shift.float||0,exp=fl+d.cash,cnt=+st.shift.counted,c=store.get(CKEY,[]);c.push({start:st.shift.start,end:Date.now(),n:d.sales.length,net:d.S-d.R,expected:exp,counted:cnt,diff:cnt-exp});store.set(CKEY,c);st.shift={start:Date.now(),float:500000};store.set(SKEY,st.shift);renderAll()}

/* ---------- rendering ---------- */
function renderAll(){$('nb').textContent=BKS.length||'';
 $('t-term').hidden=st.tab!=='term';$('t-sell').hidden=st.tab!=='sell';$('t-books').hidden=st.tab!=='books';$('t-shift').hidden=st.tab!=='shift';
 [].forEach.call(document.querySelectorAll('#tabs button'),function(b){b.classList.toggle('on',b.dataset.tab===st.tab)});
 if(st.tab==='term'){if(window.GA_TERM)GA_TERM.show()}else if(st.tab==='sell')renderSell();else if(st.tab==='books')$('t-books').innerHTML=booksHtml();else $('t-shift').innerHTML=shiftHtml()}
function renderSell(){var w=$('work');
 if(!st.q)w.innerHTML='<div class="pane"><div class="empty"><b style="display:block;color:var(--ink);font-size:16px;margin-bottom:4px">Start a sale</b>Type a route above, for example <span class="t">JKT SIN 12DEC 19DEC 2A1C</span>, or fill in the form and press Search.</div></div>';
 else if(st.step==='search'){var h=stepsHtml();for(var d=0;d<dirs();d++)h+=dirTable(d);w.innerHTML=h}
 else if(st.step==='pax')w.innerHTML=paxHtml();else if(st.step==='pay')w.innerHTML=payHtml();else w.innerHTML=doneHtml();
 $('quote').innerHTML=quoteHtml()}

/* ---------- events ---------- */
function wire(){
 $('cmdform').addEventListener('submit',function(e){e.preventDefault();fillFromCmd($('cmd').value);runSearch()});
 $('sform').addEventListener('submit',function(e){e.preventDefault();runSearch()});
 document.addEventListener('keydown',function(e){if(e.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName||'')){e.preventDefault();$('cmd').focus()}});
 $('tabs').addEventListener('click',function(e){var b=e.target.closest('[data-tab]');if(!b)return;st.tab=b.dataset.tab;st.refund=false;renderAll()});
 $('app').addEventListener('click',function(e){var t=e.target,x;
  if(x=t.closest('[data-day]')){var p=x.dataset.day.split(':'),d=+p[0],dn=+p[1],q=st.q;if(d===0){q.d1=dn;if(q.type==='ret'&&q.d2<dn){q.d2=dn;st.sel[1]=null}if(q.type!=='ret')q.d2=dn}else q.d2=dn;$('f-d1').value=iso(q.d1);$('f-d2').value=q.type==='ret'?iso(q.d2):'';st.sel[d]=null;P.clear();doSearch();renderAll();return}
  if(x=t.closest('[data-pick]')){var a=x.dataset.pick.split(':').map(Number),it=st.res[a[0]][a[1]],f=FAMS[a[2]],cab=W.fares(it).find(function(c){return c.k===f[0]}),fam=cab.fam.find(function(y){return y.n===f[1]});st.sel[a[0]]={it:it,cab:cab.k,fam:fam};renderAll();return}
  if(x=t.closest('[data-act]')){var act=x.dataset.act;
   if(act==='to-pax'&&allSelected()){st.step='pax';mkPaxKeep();renderAll();window.scrollTo(0,0)}
   else if(act==='to-pay'){st.showErr=true;var er=paxErrors();if(Object.keys(er).length){renderAll();var bad=document.querySelector('#work [aria-invalid="true"]');if(bad)bad.focus();return}st.showErr=false;st.step='pay';renderAll();window.scrollTo(0,0)}
   else if(act==='back-search'){st.step='search';renderAll()}else if(act==='back-pax'){st.step='pax';renderAll()}
   else if(act==='issue')issue();else if(act==='new'){st.q=null;st.sel=[null,null];st.step='search';st.pax=[];st.issued=null;st.contact={phone:'',email:''};renderAll();$('cmd').focus()}
   else if(act==='close-shift'&&st.shift.counted!=null&&st.shift.counted!=='')closeShift();return}
  if(x=t.closest('[data-pm]')){st.pay.m=x.dataset.pm;st.pay.ok=false;st.pay.tendered='';renderAll();return}
  if(t.closest('[data-exact]')){st.pay.tendered=String(Math.round(pricing().total/1000)*1000);renderAll();return}
  if(t.closest('[data-round]')){var tt=Math.ceil(pricing().total/50000)*50000;st.pay.tendered=String(tt);renderAll();return}
  if(x=t.closest('[data-print]')){printTicket(x.dataset.print);return}
  if(x=t.closest('[data-openbook]')){st.tab='books';st.selBook=x.dataset.openbook;st.refund=false;renderAll();return}
  if(x=t.closest('[data-book]')){st.selBook=x.dataset.book;st.refund=false;renderAll();return}
  if(x=t.closest('[data-cx]')){st.refund=true;renderAll();return}if(t.closest('[data-cxno]')){st.refund=false;renderAll();return}
  if(x=t.closest('[data-cxgo]')){cancelBooking(x.dataset.cxgo);return}});
 $('app').addEventListener('input',function(e){var t=e.target,x;
  if(t.dataset.p){x=t.dataset.p.split(':');st.pax[+x[0]][x[1]]=t.value;if(t.classList.contains('bad')){t.classList.remove('bad');t.removeAttribute('aria-invalid');var m=t.parentNode.querySelector('.msg');if(m)m.remove()}}
  else if(t.dataset.c){st.contact[t.dataset.c]=t.value;if(t.classList.contains('bad')){t.classList.remove('bad');var m2=t.parentNode.querySelector('.msg');if(m2)m2.remove()}}
  else if(t.dataset.tend){st.pay.tendered=t.value;var tot=pricing().total,ch=(+t.value||0)-tot,box=$('chg');box.className='chg '+(t.value&&ch>=0?'ok':'')+(t.value&&ch<0?'bad':'');box.innerHTML='<span>'+(t.value&&ch<0?'Still to collect':'Change to give')+'</span><b>'+(t.value?money(Math.abs(ch)):'—')+'</b>';$('quote').innerHTML=quoteHtml()}
  else if(t.dataset.sf){st.shift[t.dataset.sf]=t.value;store.set(SKEY,st.shift);if(t.dataset.sf==='float'||t.dataset.sf==='counted'){var d=shiftData(),exp=(+st.shift.float||0)+d.cash,c=st.shift.counted,df=c===''||c==null?null:+c-exp,v=$('vr');v.className='chg '+(df==null?'':df===0?'ok':'bad');v.innerHTML='<span>Difference</span><b>'+(df==null?'—':(df>0?'+':'')+num(df))+'</b>';var btn=document.querySelector('[data-act="close-shift"]');if(btn)btn.disabled=df==null}}
  else if(t.id==='bq'){st.filter=t.value;var pos=t.selectionStart;renderAll();var n=$('bq');n.focus();n.setSelectionRange(pos,pos)}});
 $('app').addEventListener('change',function(e){var t=e.target,x;if(t.dataset.p){x=t.dataset.p.split(':');st.pax[+x[0]][x[1]]=t.value}else if(t.dataset.ok){st.pay.ok=t.checked;$('quote').innerHTML=quoteHtml()}})}
function mkPaxKeep(){var q=st.q,n=q.a+q.c+q.i;if(st.pax.length!==n||st.pax.filter(function(p){return p.type==='a'}).length!==q.a||st.pax.filter(function(p){return p.type==='c'}).length!==q.c)mkPax()}

/* test hooks */
window.GA_AGENT={ctx:null,sweep:function(){return sweepHeld()},state:function(){return st},bookings:function(){return BKS},issue:issue,run:runSearch,parse:fillFromCmd,refund:refundRows,shift:shiftData};
})();
