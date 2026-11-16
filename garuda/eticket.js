/* E-ticket: an e-ticket receipt and itinerary for an issued booking, laid out like an airline's own. Printable (Print or save as PDF).
   One document covers the four cases a customer or the counter meets: a sale, an award, a reissue and a cancellation with its refund. */
(function(){
 var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
window.SSR_NAMES={VGML:'Vegetarian meal',MOML:'Muslim meal',CHML:'Child meal',BBML:'Baby meal',DBML:'Diabetic meal',GFML:'Gluten-free meal',SFML:'Seafood meal',WCHR:'Wheelchair to the aircraft door',WCHS:'Wheelchair, stairs',WCHC:'Wheelchair to the seat',BSCT:'Bassinet',BLND:'Blind passenger',DEAF:'Deaf passenger',MEDA:'Medical case',PETC:'Pet in the cabin',FQTV:'GarudaMiles number'};
 window.etkAvailable=function(b){return !!b&&!b.held&&(flat(b).some(function(l){return l.status!=='cancel'})||!!(b.cancelled&&!b.cancelled.held))};
 var ticketNo=function(b,i,v){v=v==null?b.tv:v;return '126-'+String(hash(b.ref+'T'+i+(v?'R'+v:''))%1e10).padStart(10,'0')};
 var term=function(l,end){var c=end==='to'?l.to:l.from;if(c===HUB)return 'Jakarta International, Terminal '+String(l.term||'T3').slice(1);var t=airportTerm(c);return airportName(c)+(t?', '+t:'')};
 var N=function(n){return Math.round(n).toLocaleString('en-US')};
 var MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],TN={MR:'Mr',MRS:'Mrs',MS:'Ms',MISS:'Miss',MSTR:'Master'};
 var p2=function(n){return String(n).padStart(2,'0')};
 /* a calendar day number (days since 1970) as 16DEC26 */
 var dmy=function(day){var d=new Date(day*864e5);return p2(d.getUTCDate())+MON[d.getUTCMonth()]+String(d.getUTCFullYear()).slice(2)};
 var dmyS=function(day){var d=new Date(day*864e5);return p2(d.getUTCDate())+' '+MON[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2)};
 var msDay=function(ms){return Math.floor((ms+7*36e5)/864e5)};
 var msHm=function(ms){var d=new Date(ms+7*36e5);return p2(d.getUTCHours())+p2(d.getUTCMinutes())};
 var tc=function(t){return t===t.toUpperCase()?t.toLowerCase().replace(/(^|[\s'-])([a-z])/g,function(m,a,c){return a+c.toUpperCase()}):t};
 /* a stacked barcode drawn from the ticket number; the same number always gives the same bars (a placeholder, not a real code) */
 function barcode(seed){var h=0,i,j,x,w,g;for(i=0;i<seed.length;i++)h=(h*33+seed.charCodeAt(i))>>>0;var r=function(){h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296};
  var s='<svg class="etk-pdf" viewBox="0 0 196 34" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Ticket barcode"><rect x="0" y="0" width="3" height="34"/><rect x="5" y="0" width="1" height="34"/>';
  for(j=0;j<8;j++){x=9;while(x<188){w=1+Math.floor(r()*3);g=1+Math.floor(r()*3);s+='<rect x="'+x+'" y="'+(j*4.2)+'" width="'+w+'" height="4.2"/>';x+=w+g}}
  return s+'<rect x="190" y="0" width="1" height="34"/><rect x="192" y="0" width="3" height="34"/></svg>'}
 /* fare family to class letter, when the booking did not record one */
 var CL={'Economy Flexi':'Y','Economy Standard':'M','Economy Value':'Q','Economy Lite':'T','Premium Economy':'W','Business Saver':'D','Business Flex':'J'};
 var cabLabel=function(b,di,fam){var c=(b.cabs&&b.cabs[di])||b.cab,k=(b.classes&&b.classes[di])||CL[fam]||'Y';var am=/^Award (.+) (Saver|Advantage)$/.exec(fam);if(am)return am[1].toUpperCase()+' AWARD '+am[2].toUpperCase()+' ('+k+')';return (c==='Premium'?'PREMIUM ECONOMY':String(c).toUpperCase())+' ('+k+')'};
 /* endorsements, in the short capitals real tickets use */
 function endorse(b,fam,di){var r=RULES[fam]||{},o=[];o.push(String(fam).toUpperCase());
  if(/^Award/.test(fam)){var A=(window.GA_PRICING&&GA_PRICING.cfg.award)||{},lv=(b.award&&b.award.dirs&&b.award.dirs[di]&&b.award.dirs[di].level)||'Saver',adv=lv==='Advantage';o.push('AWARD TICKET','CHNG FEE '+Math.round((adv?A.changeFeeAdv:A.changeFeeSaver)*100)+' PCT OF MILES','CANCEL MILES RETURNED LESS '+Math.round((adv?A.cancelFeeAdv:A.cancelFeeSaver)*100)+' PCT, TAXES REFUNDED','SEAT SELECTION FREE');return o.join(' · ')}
  var c=r.chg||'',f=r.ref||'';
  o.push(/^Not allowed/i.test(c)?'NO CHANGES':/IDR\s*([\d,]+)\s*fee/i.test(c)?'CHNG FEE IDR'+c.match(/IDR\s*([\d,]+)/)[1].replace(/,/g,'')+' PER PAX':/^Free/i.test(c)?'CHANGES FREE':String(c).toUpperCase());
  o.push(/^Not refundable/i.test(f)?'NONREF':/IDR\s*([\d,]+)\s*fee/i.test(f)?'REFUND FEE IDR'+f.match(/IDR\s*([\d,]+)/)[1].replace(/,/g,'')+' PER PAX':/(\d+)%\s*fee/i.test(f)?'REFUND FEE '+f.match(/(\d+)%/)[1]+' PCT':/^Fully/i.test(f)?'FULLY REFUNDABLE':String(f).toUpperCase());
  o.push(/^At check-in/i.test(r.seat||'')?'SEAT AT CHECK-IN':'SEAT SELECTION FREE');return o.join(' · ')}
 var NOTICES='<p><b>CONDITIONS OF CONTRACT.</b> Carriage and other services provided by the airline are subject to its conditions of carriage, which are incorporated by reference and may be inspected at any of its offices or on its website. This itinerary and receipt, with the attached notice, constitute the passenger ticket and baggage check for the purposes of the Warsaw Convention or the Montreal Convention where applicable.</p><p><b>FLIGHT SCHEDULES</b> are subject to change without notice. Please reconfirm the departure time of your flight before each departure. Please cooperate to ensure the flight leaves on time.</p><p><b>TERMINAL INDICATORS.</b> T plus a number means the terminal number. D means domestic. I means international. Please note that the number 1 and the letter I look alike.</p><p><b>HAZARDOUS MATERIALS.</b> The carriage of certain hazardous materials, like aerosols, fireworks and flammable liquids, aboard the aircraft is forbidden. If you do not understand these restrictions, further information may be obtained from your airline.</p><p><b>DATA PROTECTION.</b> Your personal data will be processed in accordance with the applicable privacy policy and, if your booking is made via a reservation system, with the policies of that system.</p><p><b>FARE RULES.</b> A lower fare on a changed flight is not refunded. Taxes and charges are refunded unless the fee is larger. Unused coupons are valid for one year from the date of issue unless the fare says otherwise.</p>';

 /* receipt numbers are worked out from the booking, nothing extra is stored */
 function receiptNo(b,k,pre){var place=b.place||'Online booking',online=place==='Online booking'||place==='Online',office=online?'WEB':String(place).replace(/^Counter\s*/,'').replace(/[^A-Z0-9]/gi,'').toUpperCase();return (pre||'RCT')+'-'+office+'-'+String(100000+hash(b.ref+(pre||'RCT')+k)%900000)}
 window.etkReceipt=receiptNo;
 /* fare, PPN and airport charges for every passenger, so each ticket shows its own and they add up to what was charged */
 function splitFare(b){var legs=flat(b),people=b.names.map(function(n,i){return {i:i,t:tripPersonType(b,i)}}),aw=!!b.award;
  var intl=legs.some(function(l){return CT[farEnd(l)].z==='I'}),PX=PRICE_CFG.pax,wt=function(t){return t==='c'?(intl?PX.child:PX.childDom):t==='i'?PX.infant:1};
  var W=people.map(function(p){return wt(p.t)}),WS=W.reduce(function(a,x){return a+x},0)||1;
  var split=function(total,round){var a=W.map(function(w){return Math.round(total*w/WS/round)*round}),d=total-a.reduce(function(s,x){return s+x},0);a[0]+=d;return a};
  var seatPeople=people.filter(function(p){return p.t!=='i'}).length||1,chgEach=Math.round((b.chg||0)/seatPeople),ports={},portSum=0;legs.forEach(function(l){var c=legCharge(l);ports[l.from]=(ports[l.from]||0)+c;portSum+=c});
  return {people:people,W:W,WS:WS,fareP:split(b.fare||0,1000),ppnP:split(b.tax||0,1000),chgEach:chgEach,ports:ports,portOk:portSum===chgEach,milesP:aw?split(b.award.miles||0,100):[],seatPeople:seatPeople}}
 /* the simplified fare calculation line, from the booking's own fare (simulated) */
 function fareCalc(b,FS){var aw=!!b.award,route=function(d){var c=[d.legs[0].from];d.legs.forEach(function(l){c.push(l.to)});return c};
  var fq0=function(i){var d=b.dirPrices&&b.dirPrices[i]?b.dirPrices[i].fare:(b.fare||0)/b.dirs.length;return Math.round(d*FS.W[0]/FS.WS/1000)*1000};
  return aw?route(b.dirs[0]).join(' GA ')+' '+(b.award.dirs&&b.award.dirs[0]?String(b.award.dirs[0].level).toUpperCase()+' ':'')+Math.round(b.award.miles).toLocaleString('en-US')+' MILES END'
   :b.dirs.map(function(d,i){var r=route(d),seg=[];for(var k=0;k<r.length-1;k++)seg.push((k===0&&i===0?r[0]+' ':'')+'GA '+r[k+1]);return seg.join(' ')+' '+fq0(i).toFixed(2)}).join(' ')+' IDR'+FS.fareP[0].toFixed(2)+'END ROE1.000000'}
 window.etkFareSplit=splitFare;window.etkFareCalc=function(b){return fareCalc(b,splitFare(b))};window.etkEndorse=function(b,fam,di){return endorse(b,fam,di)};
 window.renderETicket=function(){
  var b=BK();if(!b||!etkAvailable(b)){go('trips',false);return}
  var legs=flat(b),people=b.names.map(function(n,i){return {n:n,i:i,t:tripPersonType(b,i)}}),cx=!!(b.cancelled&&!b.cancelled.held),rs=b.reissues||[],last=rs.length?rs[rs.length-1]:null,aw=!!b.award;
  var online=!b.place||b.place==='Online booking'||b.place==='Online',place=b.place||'Online booking',office=online?'WEB':String(place).replace(/^Counter\s*/,'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
  var issuedDay=b.issuedMs?msDay(b.issuedMs):(b.confirmedAt?lp(b.confirmedAt,HUB).day:TD),issuedFull=b.issuedMs?dmy(issuedDay)+' '+msHm(b.issuedMs):dmy(issuedDay);
  var rcpt=function(k,pre){return receiptNo(b,k,pre)};
  var ttl=function(i){var x=b.passengers&&b.passengers[i];return x&&x.title?x.title:''};
  var gds=function(i){var x=b.passengers&&b.passengers[i],full=String(b.names[i]||'').trim(),w=full.split(/\s+/),last=x&&x.last?x.last:w.slice(-1)[0],first=x&&x.last?x.first:w.slice(0,-1).join(' ');return (last+'/'+first+(ttl(i)?' '+ttl(i):'')).toUpperCase()};
  var fqNo=function(i){var x=(b.extras||[]).find(function(y){return y.k==='ssr'&&y.code==='FQTV'&&y.p===i});return x?x.text:''};
  var lead=String(b.names[0]||'traveller').trim(),dearName=ttl(0)?TN[ttl(0)]+' '+tc((b.passengers[0].last)||lead.split(' ').slice(-1)[0]):lead;
  var dirOf=function(l){return b.dirs.findIndex(function(d){return d.legs.indexOf(l)>=0})};
  var famOf=function(l){return b.fams[dirOf(l)]||b.fams[0]};
  /* --- fare split by passenger, so every ticket shows its own fare, PPN and charges --- */
  var FS=splitFare(b),W=FS.W,WS=FS.WS,fareP=FS.fareP,ppnP=FS.ppnP,chgEach=FS.chgEach,ports=FS.ports,portOk=FS.portOk,milesP=FS.milesP;
  /* --- who and when --- */
  var greet,box;
  if(cx)greet='<p>Your booking was cancelled at your request and your seats were released. The refund is worked out below and was returned the way you paid.</p><p>We are sorry you will not be travelling with us this time, and hope to welcome you on board again soon.</p>';
  else if(last)greet='<p>Your flight was changed on '+dmy(msDay(last.at))+'. Your original tickets are exchanged, and the new tickets below are the ones to travel on. The earlier receipt still stands as a record of your first payment; the exchange has its own receipt.</p><p>Thank you for choosing Garuda Indonesia.</p>';
  else if(aw)greet='<p>Your award ticket is issued. The miles were taken from your GarudaMiles account and the airport charges were paid in cash. There is no fare or PPN on an award ticket.</p><p>Thank you for flying with Garuda Indonesia. We look forward to welcoming you on board.</p>';
  else greet='<p>Thank you for choosing Garuda Indonesia. Your itinerary and the receipt for your payment are below. Please keep this document with you when you travel, and have a pleasant journey.</p><p>If you have any questions about your booking, please contact your local Garuda Indonesia office.</p>';
  var paidNow=b.paid||b.total,boxRows=[['Booking reference',esc(b.ref)],[cx?'Refund receipt':'Receipt',rcpt(cx?'x':'0',cx?'RFD':'RCT')]];
  boxRows.push(cx?['Cancelled',dmy(msDay(b.cancelled.at))]:last?['Reissued',dmy(msDay(last.at))]:['Date of issue',dmy(issuedDay)]);boxRows.push(cx?['Refunded','IDR '+N(b.cancelled.refund)]:last?['Total paid','IDR '+N(paidNow)]:['Place of issue',esc(place)]);
  box=boxRows.map(function(r){return '<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'}).join('');
  var hasFq=people.some(function(p){return fqNo(p.i)}),hasPrev=!!(last&&last.prev);
  var ticketsHtml='<div class="etk-sc"><table class="etk-tb"><thead><tr><th>Passenger name</th><th>E-ticket number</th>'+(hasFq?'<th>Frequent flyer</th>':'')+(hasPrev?'<th>Issued in exchange for</th>':'')+'</tr></thead><tbody>'+people.map(function(p){var cur=ticketNo(b,p.i);return '<tr><td class="b">'+esc(gds(p.i))+(p.t==='i'?' (INFANT)':'')+'</td><td class="nw">'+(cx?'<s>'+cur+'</s> REFUNDED':cur)+'</td>'+(hasFq?'<td>'+esc(fqNo(p.i))+'</td>':'')+(hasPrev?'<td class="nw">'+esc(last.prev[p.i]||'')+'</td>':'')+'</tr>'}).join('')+'</tbody></table></div>';
  var rightKv='<span>Booking reference</span><span>'+(cx?'<s>':'')+esc(b.ref)+(cx?'</s>':'')+'</span><span>'+(last?'Exchange receipt':cx?'Refund receipt':'Receipt number')+'</span><span>'+(last?rcpt(rs.length,'RCT'):cx?rcpt('x','RFD'):rcpt('0','RCT'))+'</span><span>Issued by / date</span><span>'+esc(String(place).toUpperCase())+' / '+issuedFull+'</span>'+(last?'<span>Reissued</span><span>'+esc(String(place).toUpperCase())+' / '+dmy(msDay(last.at))+' '+msHm(last.at)+'</span>':'')+(cx?'<span>Cancelled</span><span>'+dmy(msDay(b.cancelled.at))+' '+msHm(b.cancelled.at)+'</span>':'');
  /* --- the flights --- */
  function legHtml(l,n,o){o=o||{};var fam=o.fam||famOf(l),di=o.di==null?dirOf(l):o.di,rules=RULES[fam]||{},dep=l.dep+(o.eD?0:0),arr=l.arr;if(!o.old){dep=eD(l);arr=eA(l)}
   var dd=lp(arr,l.to).day-lp(dep,l.from).day,st=o.old?['EXCHANGED','ex']:cx?['REFUNDED','bad']:(l.status==='cancel'?['CANCELLED','bad']:l.status==='delay'&&l.delay>0?['DELAYED +'+l.delay+' MIN','warn']:['CONFIRMED','']);
   var seats=o.old||cx?[]:people.filter(function(p){return p.t!=='i'}).map(function(p){return travellerSeat(b,l,p.i)}).filter(function(x){return x&&!/^(Not|Lap)/.test(x)});
   var li=di>=0&&b.dirs[di]?b.dirs[di].legs.indexOf(l):-1,svc=o.old||cx?[]:(b.extras||[]).filter(function(x){return x.k==='ssr'&&x.code!=='FQTV'&&x.d===di&&x.l===li}).map(function(x){return esc(SSR_NAMES[x.code]||x.code)+(x.text?' ('+esc(x.text)+')':'')+' – '+esc(String(b.names[x.p]||'').split(' ')[0])});
   var ac=l.ac||'',day0=lp(dep,l.from).day,chk=tripAllowance(b,l);var chkTxt=o.old||cx?'—':(rules.chk==='Not included'?'Cabin bag only':String(rules.chk).replace(/ kg/i,' KGS')+' + '+String(rules.bag).replace(/ cabin bag/i,' cabin'));
   var ci=o.old||cx?'—':dmyS(lp(dep-2880,l.from).day)+' '+fT(dep-2880,l.from).replace(':','');
   return '<div class="etk-flt'+(o.old?' off':'')+(o.hi?' hi':'')+(cx?' off':'')+'"><div class="lh"><span><b>'+n+'. '+esc(l.id)+'</b> · '+esc(cname(l.from))+' to '+esc(cname(l.to))+(o.tag?' · '+o.tag:'')+'</span><span>'+esc(cabLabel(b,di,fam))+'</span></div>'
    +'<div class="lb"><div class="pt"><div class="tm">'+fT(dep,l.from)+'</div><div class="st"><b>'+l.from+'</b> '+esc(cname(l.from))+'<br>'+esc(term(l,'from'))+'</div></div><div class="ln"><span>'+dur(l.arr-l.dep)+' · Nonstop</span></div><div class="pt r"><div class="tm">'+fT(arr,l.to)+(dd>0?'<sup>+'+dd+'</sup>':'')+'</div><div class="st"><b>'+l.to+'</b> '+esc(cname(l.to))+'<br>'+esc(term(l,'to'))+'</div></div><div class="sx"><b class="'+st[1]+'">'+st[0]+'</b><br>'+esc(ac)+'<br>Operated by Garuda Indonesia'+(svc.length?'<br>Services: '+svc.join('; '):'')+'</div></div>'
    +'<div class="gr"><div><small>Date</small>'+esc(fmtDn(day0,{weekday:'short',day:'numeric',month:'short',year:'numeric'}))+'</div><div><small>Check-in opens</small>'+ci+'</div><div><small>Seat</small>'+(cx||o.old?(cx?'released':'—'):seats.length?esc(seats.join(', ')):'—')+(people.some(function(p){return p.t==='i'})&&!o.old&&!cx?'<br>Lap infant with an adult':'')+'</div><div><small>Baggage allowance</small>'+chkTxt+'</div><div><small>Coupon validity</small>Not before '+dmy(day0)+'<br>Not after '+dmy(day0)+'</div></div></div>'}
  var flights='';
  if(last&&last.old){var oi=last.old,done=false;b.dirs.forEach(function(d,di){if(di===oi.di&&!done){done=true;oi.legs.forEach(function(ol,k){flights+=legHtml(ol,di+1,{old:true,fam:oi.fam,di:di})})}d.legs.forEach(function(l,k){flights+=legHtml(l,flat(b).indexOf(l)+1,{hi:last&&di===oi.di,tag:(last&&di===oi.di)?'changed':''})})})}
  else flights=legs.map(function(l,n){return legHtml(l,n+1)}).join('');
  /* --- fare and taxes, one row per ticket --- */
  var portCols=portOk?Object.keys(ports).map(function(a){return '<span>'+N(ports[a])+' '+a+'</span>'}):['<span>'+N(chgEach)+' CHG</span>'];
  var fareRows=people.map(function(p){var infant=p.t==='i',tax='<div class="etk-tx"><span>'+N(ppnP[p.i])+' ID</span>'+(infant?'':portCols.join(''))+'</div>',tot=fareP[p.i]+ppnP[p.i]+(infant?0:chgEach);return '<tr><td>'+esc(gds(p.i))+(p.t==='i'?' (INFANT)':'')+'</td><td class="n">'+(aw?'AWARD '+N(milesP[p.i])+' MILES':N(fareP[p.i]))+'</td><td>'+tax+'</td><td class="n b">'+N(tot)+'</td></tr>'}).join('');
  var fareTbl='<div class="etk-sc"><table class="etk-tb"><thead><tr><th>Passenger</th><th class="n">'+(aw?'Fare':'Fare IDR')+'</th><th>Taxes / fees / charges IDR</th><th class="n">'+(aw?'Total cash IDR':'Total IDR')+'</th></tr></thead><tbody>'+fareRows+'<tr class="tot"><td>Total</td><td class="n">'+(aw?'AWARD '+N(b.award.miles)+' MILES':N(b.fare||0))+'</td><td>'+N(b.tax||0)+' PPN · '+N(b.chg||0)+' airport charges</td><td class="n">'+N(b.total||0)+'</td></tr></tbody></table></div>';
  var fcalc=fareCalc(b,FS);
  /* --- form of payment: how it was paid, in the words of the till --- */
  var pm=b.payment||{},fop=function(){var m=esc(String(b.paymentMethod||'').toUpperCase()||'NOT RECORDED');if(aw)m='MILES '+esc((b.award.memberId||'')+'')+' + '+m;var bits=[m];if(pm.approval)bits.push('approval '+esc(pm.approval));if(String(b.paymentMethod||'').toLowerCase()==='cash'&&pm.tendered&&pm.tendered>pm.change){bits.push('received '+N(pm.tendered));bits.push('change '+N(pm.change||0))}return '<b>'+bits[0]+'</b>'+(bits.length>1?' · '+bits.slice(1).join(' · '):'')+' · charged <b>IDR '+N(b.paid0||b.total)+'</b>'};
  /* --- GarudaMiles block --- */
  var milesBlock='';
  if(aw){var mem=window.GA_PRICING&&GA_PRICING.memberByNumber&&GA_PRICING.memberByNumber(b.award.memberId),net=Array.isArray(b.award.ledger)?b.award.ledger.reduce(function(n,x){return n+x.miles},0):(b.award.issued?b.award.miles:0),back=cx&&b.cancelled.milesBack!=null?b.cancelled.milesBack:0;
   milesBlock='<div class="etk-bar">GarudaMiles</div><div class="etk-sc"><table class="etk-tb"><thead><tr><th>Member</th><th class="n">Miles on this ticket</th><th class="n">'+(cx?'Miles returned':'Redeemed')+'</th></tr></thead><tbody><tr><td>'+esc(b.award.member)+' · '+esc(b.award.memberId||'')+(mem?' · '+esc(mem.tier.toUpperCase()):'')+'</td><td class="n">'+N(b.award.miles)+'</td><td class="n b">'+(cx?N(back):N(net))+'</td></tr></tbody></table></div>'}
  /* --- exchange, payments and refund --- */
  var extra='';
  if(last){var fee=last.fee||0,diff=last.diff||0,pp=b.pax.a+b.pax.c;
   extra+='<div class="etk-bar">Fare and additional information · exchange of '+dmy(msDay(last.at))+'</div><div class="etk-sc"><table class="etk-tb"><thead><tr><th>Item</th><th class="n">Per pax</th><th class="n">Pax</th><th class="n">IDR</th></tr></thead><tbody><tr><td>Fare difference</td><td class="n">'+N(diff/pp)+'</td><td class="n">'+pp+'</td><td class="n">'+N(diff)+'</td></tr><tr><td>Change fee</td><td class="n">'+N(fee/pp)+'</td><td class="n">'+pp+'</td><td class="n">'+N(fee)+'</td></tr>'+(last.milesDue?'<tr><td>Miles debited for the change</td><td></td><td></td><td class="n">'+N(last.milesDue)+' miles</td></tr>':'')+'<tr class="tot"><td colspan="3">Collected'+(last.method?' · form of payment '+esc(String(last.method).toUpperCase()):'')+'</td><td class="n">'+N(last.collected)+'</td></tr></tbody></table></div>';
   var rows='<tr><td class="nw">'+rcpt('0','RCT')+'</td><td class="nw">'+dmy(issuedDay)+'</td><td>Original sale</td><td>'+esc(String(b.paymentMethod||'').toUpperCase())+'</td><td class="n">'+N(b.paid0||0)+'</td></tr>';
   rs.forEach(function(r,k){rows+='<tr><td class="nw">'+rcpt(k+1,'RCT')+'</td><td class="nw">'+dmy(msDay(r.at))+'</td><td>Exchange: '+esc(r.note||'')+'</td><td>'+esc(String(r.method||'').toUpperCase())+'</td><td class="n">'+N(r.collected)+'</td></tr>'});
   extra+='<div class="etk-bar">Payments on this booking</div><div class="etk-sc"><table class="etk-tb"><thead><tr><th class="nw">Receipt</th><th class="nw">Date</th><th>Description</th><th>Form of payment</th><th class="n">IDR</th></tr></thead><tbody>'+rows+'<tr class="tot"><td colspan="4">Total paid</td><td class="n">'+N(b.paid||0)+'</td></tr></tbody></table></div>'}
  if(cx){var cr=b.cancelled.rows||[],paid=cr.reduce(function(a,x){return a+x.paid},0),fee=cr.reduce(function(a,x){return a+x.fee},0);
   extra+='<div class="etk-bar">Refund</div><div class="etk-sc"><table class="etk-tb"><thead><tr><th>Item</th><th class="n">IDR</th></tr></thead><tbody><tr><td>Paid: fare, PPN and airport charges</td><td class="n">'+N(paid||b.paid0||b.total)+'</td></tr><tr><td>Less cancellation fee, '+esc(b.fams[0])+'</td><td class="n">'+N(-fee)+'</td></tr>'+(aw&&b.cancelled.milesBack!=null?'<tr><td>Miles returned to the member, less the cancellation fee</td><td class="n">'+N(b.cancelled.milesBack)+' miles</td></tr>':'')+'<tr class="tot"><td>Refunded · form of payment '+esc(String(b.paymentMethod||'').toUpperCase())+'</td><td class="n">'+N(b.cancelled.refund)+'</td></tr></tbody></table></div><div class="etk-small">Taxes and charges are refunded unless the fee is larger. A flown part of the trip is not refunded.</div>'}
  var fams=[];b.dirs.forEach(function(d,i){var f=b.fams[i]||b.fams[0];if(!fams.some(function(x){return x.fam===f}))fams.push({fam:f,legs:[]});fams.find(function(x){return x.fam===f}).legs=fams.find(function(x){return x.fam===f}).legs.concat(d.legs.map(function(l){return l.id}))});
  var conditions=fams.map(function(f){var r=RULES[f.fam]||{};return '<div class="etk-fam">'+esc(f.fam)+' · '+esc(f.legs.join(', '))+'</div><div class="etk-ct"><div><small>Baggage</small>'+esc(r.bag)+' · checked '+esc(r.chk)+'</div><div><small>Seat selection</small>'+esc(r.seat)+'</div><div><small>Changes</small>'+esc(r.chg)+'</div><div><small>Cancellation and refund</small>'+esc(r.ref)+'</div><div><small>GarudaMiles</small>'+esc(r.mil)+' of flown miles</div></div>'}).join('');
  var endo=fams.map(function(f,i){return endorse(b,f.fam,i)}).join(' / ')+(last?' · ORIGINAL TICKETS EXCHANGED AND NOT VALID':'')+(cx?' · CANCELLED AND REFUNDED · ALL COUPONS VOID':'');
  var bar0=ticketNo(b,0),title=cx?'VOID · CANCELLED AND REFUNDED · NOT VALID FOR TRAVEL':'';
  $('#v-eticket').innerHTML=NAV('E-ticket')
   +'<div class="etk-sheet" id="etk-sheet"><div class="etk-hd"><img src="assets/garuda-logo-colour.png" alt="Garuda Indonesia" width="1200" height="285"><div class="ti">e-Ticket Receipt &amp; Itinerary<small>Booking '+esc(b.ref)+' · '+(cx?'cancelled':last?'reissued · ticket version '+((b.tv||0)+1):aw?'award ticket':'issued at '+esc(place))+'</small></div><div class="bcw"><small>Scan the barcode or use the e-ticket number below for self-service kiosk check-in</small>'+barcode(bar0)+'<b>'+bar0.replace('-',' ')+'</b></div></div>'
   +(cx?'<div class="etk-void"><span>'+title+'</span><span>'+dmy(msDay(b.cancelled.at))+' '+msHm(b.cancelled.at)+' WIB</span></div>':'')
   +'<div class="etk-gr"><div class="g"><div class="nm">Dear '+esc(dearName)+',</div>'+greet+'</div><div class="bx">'+box+'</div></div>'
   +'<div class="etk-intro"><p>Your electronic ticket is stored in our reservation system. This e-ticket receipt and itinerary is a record of your electronic ticket and forms part of your contract of carriage. You may need to present a printed copy of this receipt to enter the airport and/or to prove return or onward travel to customs and immigration officials.</p><p>Your attention is drawn to the Conditions of Contract and Other Important Notices set out at the end of this document. Please check with the departure airport for restrictions on the carriage of liquids, aerosols and gels in hand baggage.</p></div><div class="etk-dm"><b>Do not miss your flight.</b> <b>48</b> Online check-in opens 48 hours before departure. <b>60</b> Check in no later than 60 minutes before an international departure, 45 minutes before a domestic one. <b>20</b> Be at the boarding gate by 20 minutes before departure. All times shown are local for each city.</div>'
   +'<div class="etk-bar">Passenger and ticket information</div><div class="etk-kv"><div>'+rightKv+'</div></div>'+ticketsHtml
   +'<div class="etk-bar">Travel information</div>'+flights
   +milesBlock+(last||cx?'':'<div class="etk-bar">Fare and additional information</div>')+(last||cx?'<div class="etk-bar">Fare paid on this booking</div>':'')+fareTbl
   +'<div class="etk-two"><div><div class="lab">Form of payment</div>'+fop()+'</div><div><div class="lab">Fare calculation (per ticket, simulated)</div><span class="mono">'+esc(fcalc)+'</span></div></div>'
   +extra
   +'<div class="etk-bar">Endorsements / restrictions</div><div class="etk-endo">'+esc(endo)+'</div>'
   +'<div class="etk-bar">Fare conditions</div>'+conditions
   +'<div class="etk-notes">'+NOTICES+'<p><b>SIMULATED DOCUMENT.</b> This is a simulated document for the Jakarta Northshore concept: no booking was made and nothing was charged.</p></div>'
   +'<div class="etk-foot"><div class="etk-sim">SIMULATED – NOT VALID FOR TRAVEL</div><br>Contact us &nbsp;|&nbsp; FAQs &nbsp;|&nbsp; Baggage &nbsp;|&nbsp; Terms and Conditions<br>Garuda Indonesia concept, simulated and not affiliated with Garuda Indonesia</div>'+(cx?'<div class="etk-stamp" aria-hidden="true">CANCELLED</div>':'')+'</div>'
   +'<footer class="etk-actions"><button class="btn t" data-etk-print>Print or save as PDF</button><small>On iPhone: tap Share, then Print, then pinch the preview to save it as a PDF.</small></footer>';
 };
 R.eticket=window.renderETicket;
 document.addEventListener('click',function(e){
  var p=e.target.closest&&e.target.closest('[data-etk-print]');if(p){e.preventDefault();window.print();return}
  var b=e.target.closest&&e.target.closest('[data-eticket]');if(!b)return;e.preventDefault();
  if(b.dataset.bk!=null)S.bk=+b.dataset.bk;go('eticket');
 });
})();
