/* E-ticket: a travel itinerary and receipt for a confirmed booking. Printable (Print or save as PDF). */
(function(){
 var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
 var typeName={a:'Adult',c:'Child',i:'Infant'};
window.SSR_NAMES={VGML:'Vegetarian meal',MOML:'Muslim meal',CHML:'Child meal',BBML:'Baby meal',DBML:'Diabetic meal',GFML:'Gluten-free meal',SFML:'Seafood meal',WCHR:'Wheelchair to the aircraft door',WCHS:'Wheelchair, stairs',WCHC:'Wheelchair to the seat',BSCT:'Bassinet',BLND:'Blind passenger',DEAF:'Deaf passenger',MEDA:'Medical case',PETC:'Pet in the cabin',FQTV:'GarudaMiles number'};
 window.etkAvailable=function(b){return !!b&&flat(b).some(function(l){return l.status!=='cancel'})};
 var ticketNo=function(b,i){return '126-'+String(hash(b.ref+'T'+i+(b.tv?'R'+b.tv:''))%1e10).padStart(10,'0')};
 var letter=function(fam){return /^Premium/.test(fam)?'W':/^Business/.test(fam)?'J':'Y'};
 var term=function(l,end){var c=end==='to'?l.to:l.from;return c===HUB?'Jakarta International, Terminal '+l.term.slice(1):'Terminal: confirm at airport'};
 function status(l){
  if(l.status==='cancel')return ['CANCELLED','bad'];
  if(l.status==='delay'&&l.delay>0)return ['DELAYED +'+l.delay+' MIN','warn'];
  return ['CONFIRMED',''];
 }
 window.renderETicket=function(){
  var b=BK();if(!b||!etkAvailable(b)){go('trips',false);return}
  try{allocateBookingSeats(b)}catch(e){}
  var legs=flat(b),people=b.names.map(function(n,i){return {n:n,i:i,t:tripPersonType(b,i)}});
  var issued=fmtDn(b.confirmedAt?lp(b.confirmedAt,HUB).day:TD,{day:'numeric',month:'short',year:'numeric'});
  var fq=function(i){var x=(b.extras||[]).find(function(y){return y.k==='ssr'&&y.code==='FQTV'&&y.p===i});return x?' · GarudaMiles '+esc(x.text):''},ttl=function(i){var x=b.passengers&&b.passengers[i];return x&&x.title?x.title:''},TN={MR:'Mr',MRS:'Mrs',MS:'Ms',MISS:'Miss',MSTR:'Master'};
  var lead=String(b.names[0]||'traveller').trim(),tc=function(t){return t===t.toUpperCase()?t.toLowerCase().replace(/(^|[\s'-])([a-z])/g,function(m,a,c){return a+c.toUpperCase()}):t},dearName=ttl(0)?TN[ttl(0)]+' '+tc(b.passengers[0].last||lead.split(' ').slice(-1)[0]):lead;
  var dirOf=function(l){return b.dirs.findIndex(function(d){return d.legs.indexOf(l)>=0})};
  var fams=[];b.dirs.forEach(function(d,i){var f=b.fams[i]||b.fams[0];if(!fams.some(function(x){return x.fam===f}))fams.push({fam:f,legs:[]});fams.find(function(x){return x.fam===f}).legs=fams.find(function(x){return x.fam===f}).legs.concat(d.legs.map(function(l){return l.id}))});
  var flights=legs.map(function(l,n){
   var fam=b.fams[dirOf(l)]||b.fams[0],rules=tripAllowance(b,l),dep=eD(l),arr=eA(l),dd=lp(arr,l.to).day-lp(dep,l.from).day,st=status(l);
   var seats=people.filter(function(p){return p.t!=='i'}).map(function(p){return travellerSeat(b,l,p.i)}).filter(Boolean);
   var li=b.dirs[dirOf(l)].legs.indexOf(l),svc=(b.extras||[]).filter(function(x){return x.k==='ssr'&&x.code!=='FQTV'&&x.d===dirOf(l)&&x.l===li}).map(function(x){return esc(SSR_NAMES[x.code]||x.code)+(x.text?' ('+esc(x.text)+')':'')+' – '+esc(String(b.names[x.p]||'').split(' ')[0])});
   return '<div class="etk-flt"><div class="bar"><span>'+(n+1)+'. '+esc(l.id)+' • '+esc(cname(l.from))+' to '+esc(cname(l.to))+'</span><span>'+esc(fam.toUpperCase())+' ('+letter(fam)+')</span></div><div class="in">'
    +'<div class="nb">Non-stop • '+dur(l.arr-l.dep).replace('h ','hrs ').replace('m','mins')+'</div>'
    +'<div><div class="lb">Departing</div><div class="tm">'+l.from+' '+fT(dep,l.from)+'</div><div class="c">'+esc(cname(l.from))+'</div><div class="d">'+fmtDn(lp(dep,l.from).day,{weekday:'long',day:'numeric',month:'short',year:'numeric'})+'</div><div class="d">'+esc(term(l,'from'))+'</div></div>'
    +'<div><div class="lb">Arriving</div><div class="tm">'+l.to+' '+fT(arr,l.to)+(dd>0?'<sup>+'+dd+'</sup>':'')+'</div><div class="c">'+esc(cname(l.to))+'</div><div class="d">'+fmtDn(lp(arr,l.to).day,{weekday:'long',day:'numeric',month:'short',year:'numeric'})+'</div><div class="d">'+(l.to===HUB?esc(term(l,'to')):'')+'</div></div>'
    +'<div class="info"><div class="st">STATUS: <i class="'+st[1]+'">'+st[0]+'</i></div><b>Garuda Indonesia • '+esc(l.id)+'</b><br>'+esc(l.ac)+'<br>'+esc(fam)+'<br>Checked baggage: '+(rules.chk==='Not included'?'none':esc(rules.chk))+'<br>Seats: '+(seats.length?esc(seats.join(', ')):'—')+(people.some(function(p){return p.t==='i'})?'<br>Lap infant travels with an adult':'')+(svc.length?'<br>Services: '+svc.join('; '):'')+'</div></div></div>';
  }).join('');
  var conditions=fams.map(function(f){var r=RULES[f.fam]||{};return '<div class="etk-fam">'+esc(f.fam)+' · '+esc(f.legs.join(', '))+'</div><table class="etk-tbl"><tbody>'
   +'<tr><td>Baggage</td><td>Cabin bag</td><td>'+esc(r.bag)+'</td></tr><tr><td></td><td>Checked baggage</td><td>'+esc(r.chk)+'</td></tr>'
   +'<tr><td>Seat selection</td><td></td><td>'+esc(r.seat)+'</td></tr><tr><td>Changes</td><td></td><td>'+esc(r.chg)+'</td></tr><tr><td>Cancellation and refund</td><td></td><td>'+esc(r.ref)+'</td></tr><tr><td>GarudaMiles</td><td>Miles earned</td><td>'+esc(r.mil)+' of flown miles</td></tr></tbody></table>'}).join('');
  $('#v-eticket').innerHTML=NAV('E-ticket')
   +'<div class="etk-sheet" id="etk-sheet"><div class="etk-hd"><div class="t">Travel itinerary &amp; receipt</div><img src="assets/garuda-logo-colour.png" alt="Garuda Indonesia" width="1200" height="285"></div>'
   +'<div class="etk-top"><div><div class="etk-pn">'+people.map(function(p){return esc((ttl(p.i)?ttl(p.i)+' ':'')+String(p.n).toUpperCase())+(p.t==='i'?' (INFANT)':'')+fq(p.i)}).join('<br>')+'</div><div class="etk-hello">Dear '+esc(dearName)+',<br>Thank you for choosing Garuda Indonesia. Your itinerary and the conditions for your fare are below. Please keep this receipt with you when you travel.</div></div>'
   +'<div class="etk-box"><div class="ref">BOOKING REFERENCE:<b>'+esc(b.ref)+'</b></div>'+people.map(function(p){return '<div class="r"><span>Ticket number'+(people.length>1?' '+(p.i+1):'')+':</span><b>'+ticketNo(b,p.i)+'</b></div>'}).join('')
   +(b.award&&b.award.issued?'<div class="r"><span>Simulated award:</span><b>'+b.award.miles.toLocaleString('en-US')+' miles + taxes and charges</b></div>':'')+'<div class="r"><span>Date of issue:</span><b>'+issued+'</b></div><div class="r"><span>Place of issue:</span><b>'+esc(b.place||'Online booking')+'</b></div><div class="r"><span>Payment:</span><b>'+esc(b.paymentMethod||'Demo booking')+'</b></div><div class="r"><span>Total paid:</span><b>'+idr(b.paid||b.total)+'</b></div></div></div>'
   +flights+'<div class="etk-h2">Fare conditions</div>'+conditions
   +'<div class="etk-note">Online check-in opens 48 hours before departure and closes 60 minutes before international and 45 minutes before domestic departures. Times are local to each airport. Carriage is subject to the airline’s conditions of carriage. This is a simulated document for the Jakarta Northshore concept: no booking was made and nothing was charged.</div>'
   +'<div class="etk-foot"><div class="etk-sim">SIMULATED – NOT VALID FOR TRAVEL</div><br>Contact us &nbsp;|&nbsp; FAQs &nbsp;|&nbsp; Baggage &nbsp;|&nbsp; Terms and Conditions<br>Garuda Indonesia concept, simulated and not affiliated with Garuda Indonesia</div></div>'
   +'<footer class="etk-actions"><button class="btn t" data-etk-print>Print or save as PDF</button><small>On iPhone: tap Share, then Print, then pinch the preview to save it as a PDF.</small></footer>';
 };
 R.eticket=window.renderETicket;
 document.addEventListener('click',function(e){
  var p=e.target.closest&&e.target.closest('[data-etk-print]');if(p){e.preventDefault();window.print();return}
  var b=e.target.closest&&e.target.closest('[data-eticket]');if(!b)return;e.preventDefault();
  if(b.dataset.bk!=null)S.bk=+b.dataset.bk;go('eticket');
 });
})();
