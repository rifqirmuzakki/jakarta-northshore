/* Deterministic simulated bookings (model version 1).
   A booking record is a pure function of flight, departure day, cabin and index, so it never has to be stored:
   the same inputs always give the same booking reference, passengers, channel, fare class, booking time and price.
   Passengers are generated to match the existing load model exactly: the seats booked up to "now" equal
   loadInfo(l,cabin).model, so this module explains the aggregate sold count with individual records.
   Loaded after the main script in index.html, whose globals (loadInfo, soldShare, SUBCLASSES, ...) it reads. */
(function(){
 var VERSION=3,HORIZON=330,DAY0=dnOf('2026-01-01'),CABINS=['Economy','Premium','Business'];
 var BITS=33n,MOD=1n<<BITS,MUL=0x9E3779B97n|1n;
 function inv(a,m){var t=0n,nt=1n,r=m,nr=a%m;while(nr){var q=r/nr;[t,nt]=[nt,t-q*nt];[r,nr]=[nr,r-q*nr]}return(t%m+m)%m}
 var MULINV=inv(MUL,MOD);
 /* reference = 7 base-36 chars, a reversible scramble of (flight number, day, cabin, booking index); real counter and online refs are GA + 4 chars */
 function encodeRef(fnum,D,ci,idx){var d=D-DAY0;if(fnum<0||fnum>1023||d<0||d>4095||idx<0||idx>511)return null;
  var x=(BigInt(fnum)<<23n)|(BigInt(d)<<11n)|(BigInt(ci)<<9n)|BigInt(idx);x=(x*MUL)%MOD;x^=x>>17n;return x.toString(36).toUpperCase().padStart(7,'0')}
 function decodeRef(ref){if(!/^[0-9A-Z]{7}$/.test(ref))return null;var x=BigInt(parseInt(ref,36));if(x>=MOD)return null;
  x^=x>>17n;x^=x>>34n;x=(x*MULINV)%MOD;return{fnum:Number(x>>23n),D:Number((x>>11n)&4095n)+DAY0,ci:Number((x>>9n)&3n),idx:Number(x&511n)}}
 var R=function(k){return seeded(k)};
 function pick(k,items){var t=0,i;for(i=0;i<items.length;i++)t+=items[i][1];var r=R(k)*t;for(i=0;i<items.length;i++){r-=items[i][1];if(r<0)return items[i][0]}return items[items.length-1][0]}
 var FIRST=['Budi','Siti','Agus','Dewi','Rina','Adi','Putri','Eko','Wulan','Hendra','Sri','Bayu','Ayu','Rizky','Lestari','Dimas','Maya','Fajar','Intan','Yoga','Nur','Andi','Indah','Reza','Tri'],
  LAST=['Santoso','Wijaya','Pratama','Hidayat','Saputra','Kusuma','Lestari','Nugroho','Setiawan','Rahayu','Hartono','Susanto','Wibowo','Purnama','Siregar','Nasution','Halim','Tanuwijaya','Simanjuntak','Gunawan'];
 var CHANNELS={Economy:[['Online',40],['Travel agent',25],['OTA',13],['Counter',12],['Call centre',5],['Corporate',5]],Premium:[['Online',38],['Travel agent',27],['Corporate',15],['Counter',10],['OTA',6],['Call centre',4]],Business:[['Corporate',30],['Travel agent',30],['Online',22],['Counter',8],['Call centre',7],['OTA',3]]};
 var FAMS={Economy:[['Economy Lite',25],['Economy Value',30],['Economy Standard',30],['Economy Flexi',15]],Premium:[['Premium Economy',1]],Business:[['Business Saver',60],['Business Flex',40]]};
 var FAMKEY={'Economy Lite':'lite','Economy Value':'value','Economy Standard':'standard','Economy Flexi':'flexi'};
 var memo=new Map();
 function ladderFrac(l,cabin){var cap=cabinCap(l,cabin),li=loadInfo(l,cabin);return{cap:cap,lf:li.lf,n:Math.round(cap*li.lf)}}
 /* fare for one adult booked as seat number `pos` (0-based) `dout` days before departure, in class row `sub` of family `fam` */
 function fareAt(l,cabin,fam,sub,pos,dout){var C=PRICE_CFG,d=legEcoDetail(l),cap=cabinCap(l,cabin),frac=cap?Math.min(1,pos/cap):1,adv=C.load.on?ladderF(frac)*urgencyF(dout):curveF(dout),
  core=d.base*d.tod*adv*d.dow*d.season*(C.load.on?1:d.dem);
  if(cabin==='Economy')return core*C.fam[FAMKEY[fam]]*sub.ratio;
  if(cabin==='Premium')return core*C.fam.premium*sub.ratio;
  var blk=l.arr-l.dep,bk=blk>C.fam.bizLongMin?C.fam.bizLong:blk>C.fam.bizMidMin?C.fam.bizMid:C.fam.bizShort;return core*bk*(fam==='Business Flex'?C.fam.bizFlex:1)*sub.ratio}
 function subRows(fam){return SUBCLASSES[fam]||[['',1,1]]}
 /* fare rules, read from the same RULES text the terminal refunds and reissues by */
 function refundFor(fam,fare,total,seats){var rule=(RULES[fam]||{}).ref||'',fee=0,m;
  if(/^Not refundable/i.test(rule))fee=fare;else if(m=rule.match(/IDR\s*([\d,]+)\s*fee/i))fee=+m[1].replace(/,/g,'')*seats;else if(m=rule.match(/(\d+)%\s*fee/i))fee=fare*(+m[1]/100);
  fee=Math.min(fee,total);return{fee:fee,refund:total-fee}}
 function changeFee(fam,seats){var rule=(RULES[fam]||{}).chg||'',m;if(/^Not allowed/i.test(rule))return null;if(m=rule.match(/IDR\s*([\d,]+)\s*fee/i))return +m[1].replace(/,/g,'')*seats;return 0}
 var CANCEL_RATE={'Economy Lite':0.03,'Economy Value':0.05,'Economy Standard':0.08,'Economy Flexi':0.14,'Premium Economy':0.09,'Business Saver':0.07,'Business Flex':0.12},NOSHOW_RATE={Economy:0.035,Premium:0.03,Business:0.025};
 /* one booking: `pos` is the cabin's sold count when it was made, `dout` the days out it was made */
 function makeBooking(l,cabin,info,ctx,idx,tag,pos,dout,seatsN,inf,kids,extra){
  var adults=seatsN-kids,types=[],names=[],a;for(a=0;a<seatsN+inf;a++)types.push(a<adults?'a':a<seatsN?'c':'i');
  var last=LAST[hash(tag+'|ln')%LAST.length];
  for(a=0;a<types.length;a++){var nm=FIRST[hash(tag+'|fn'+a)%FIRST.length]+' '+(a===0||R(tag+'|fam'+a)<0.8?last:LAST[hash(tag+'|ln'+a)%LAST.length]);names.push(nm==='Rina Wijaya'?'Rina Wijayanti':nm)}/* never the demo passenger, whose bookings the customer app imports */
  var fam=pick(tag+'|fam',FAMS[cabin]),rows=subRows(fam),sub={k:rows[rows.length-1][0],close:rows[rows.length-1][1],ratio:rows[rows.length-1][2]},r;
  for(r=0;r<rows.length-1;r++)if(Math.floor(info.cap*rows[r][1])-pos>0){sub={k:rows[r][0],close:rows[r][1],ratio:rows[r][2]};break}
  var chW=CHANNELS[cabin].map(function(c){var w=c[1];if(dout>=45&&(c[0]==='Travel agent'||c[0]==='Corporate'))w*=1.5;if(dout<=2&&(c[0]==='Counter'||c[0]==='Online'))w*=1.5;return[c[0],w]});
  var adultFare=fareAt(l,cabin,fam,sub,pos,dout),price=priceFor({legs:[l]},{p:adultFare},{a:adults,c:kids,i:inf,type:'ow'}),
   minute=dout===0?Math.floor(R(tag+'|t')*Math.max(1,ctx.tm-60)):Math.floor(R(tag+'|t')*1440);
  var rec={ref:encodeRef(ctx.fnum,ctx.D,ctx.ci,idx),gen:true,v:VERSION,flight:l.id,dep:l.dep,from:l.from,to:l.to,cabin:cabin,idx:idx,
   seats:seatsN,pax:names.map(function(n,x){return{name:n,type:types[x]}}),channel:pick(tag+'|ch',chW),family:fam,cls:sub.k,
   dout:dout,bookedAt:l.dep-ctx.tm-dout*1440+minute,fare:price.fare,tax:price.tax,chg:price.chg,total:price.total,status:'HK',pos:pos};
  if(extra)for(var k in extra)rec[k]=extra[k];
  if(R(tag+'|ns')<NOSHOW_RATE[cabin]){var rf=refundFor(fam,price.fare,price.total,seatsN);rec.noShow={retained:price.total-rf.refund}}
  return rec}
 /* Active bookings follow the load model exactly. Some later cancel or change; every cancelled seat is resold at the moment it is
    released, so seats sold stay equal to the model on every day. Resales are appended after the originals, so references never shift. */
 function generate(l,cabin){var key=l.id+'|'+l.dep+'|'+cabin,hit=memo.get(key);if(hit)return hit;
  var ci=CABINS.indexOf(cabin),fnum=+String(l.id).replace(/\D/g,''),f0=FLS.find(function(f){return f.id===l.id}),D=Math.round((l.dep-(f0?f0.dep:0))/1440);
  var info=ladderFrac(l,cabin),Nx=info.cap*info.lf,N=Math.round(Nx),Dk=new Array(N),k=0,d,m,ctx={fnum:fnum,D:D,ci:ci,tm:lp(l.dep,l.from).min};
  for(d=HORIZON;d>=0&&k<N;d--){m=Math.min(N,Math.round(Nx*soldShare(d)));while(k<m)Dk[k++]=d}
  var out=[],i=0,idx=0,shapes=[];
  while(i<N){var tag=key+'|'+idx,size=pick(tag+'|n',[[1,52],[2,28],[3,8],[4,8],[5,2],[6,2]]),j=i;while(j<N&&j-i<size&&Dk[j]===Dk[i])j++;
   var seatsN=j-i,inf=R(tag+'|inf')<0.04?1:0,kids=seatsN>=3&&R(tag+'|kid')<0.5?1:0;
   shapes.push({seatsN:seatsN,inf:inf,kids:kids});out.push(makeBooking(l,cabin,info,ctx,idx,tag,i,Dk[i],seatsN,inf,kids));i=j;idx++}
  var base=out.length;
  for(var x=0;x<base&&out.length<512;x++){var o=out[x],tg=key+'|'+x+'|fate';
   if(o.dout<1||R(tg)>=CANCEL_RATE[o.family])continue;
   var c=Math.min(o.dout-1,Math.floor(o.dout*Math.pow(R(tg+'|c'),2))),cf=changeFee(o.family,o.seats),isChange=cf!=null&&R(tg+'|chg')<0.35,rf=refundFor(o.family,o.fare,o.total,o.seats);
   o.status='XX';o.cancel={dout:c,at:l.dep-ctx.tm-c*1440+Math.floor(R(tg+'|t')*1440),reason:isChange?'CHANGE':'CANCEL',
    refund:isChange?o.total:rf.refund,retained:isChange?cf:o.total-rf.refund};
   delete o.noShow;
   var sh=shapes[x],ridx=out.length;out.push(makeBooking(l,cabin,info,ctx,ridx,key+'|'+ridx+'|resale',o.pos,c,sh.seatsN,sh.inf,sh.kids,{resaleOf:o.ref}))}
  memo.set(key,out);return out}
 function legBookings(l){var r=[];legCabs(l).forEach(function(c){r.push.apply(r,generate(l,c))});return r}
 /* The load model works in whole days out, so a booking exists once its day has arrived. */
 function dnowOf(l,now){return lp(l.dep,l.from).day-Math.floor((now==null?nowAbs():now)/1440)}
 function cancelledBy(b,dnow){return b.status==='XX'&&b.cancel.dout>=dnow}
 /* seats sold: made by the scenario day and not yet cancelled; equals the live load model's baseline */
 function visible(l,cabin,now){var dn=dnowOf(l,now);return generate(l,cabin).filter(function(b){return b.dout>=dn&&!cancelledBy(b,dn)})}
 /* everything made by the scenario day, cancelled ones included */
 function history(l,cabin,now){var dn=dnowOf(l,now);return generate(l,cabin).filter(function(b){return b.dout>=dn})}
 function resolveLeg(ref){var c=decodeRef(String(ref).toUpperCase());if(!c||c.ci>2)return null;var f=FLS.find(function(x){return +String(x.id).replace(/\D/g,'')===c.fnum&&runs(x,c.D)});if(!f)return null;
  var l=mkLeg(f,c.D),cabin=CABINS[c.ci];if(legCabs(l).indexOf(cabin)<0)return null;var rec=generate(l,cabin)[c.idx];return rec?{l:l,cabin:cabin,rec:rec}:null}
 function resolve(ref){var r=resolveLeg(ref);return r&&r.rec}
 /* the flight with this number departing on this local day (as shown to the traveller), or null */
 function findLeg(id,day){var hit=null;Object.keys(DEP).some(function(o){return legsDep(o,day).some(function(l){if(l.id===id){hit=l;return true}})});return hit}
 /* A full booking the terminal can work on (tickets, refunds, seats, remarks), or null if the reference is unknown or not booked yet. Simulated
    cancellations that have already happened come back cancelled. Retrieving it does not change the simulation: the terminal stores the copy
    only so that anything done to it is remembered and takes the place of the generated record. */
 function retrieve(ref){var r=resolveLeg(ref);if(!r)return null;var rec=r.rec,l=r.l,dn=dnowOf(l);if(rec.dout<dn)return null;
  var it={legs:[l],dep:l.dep,arr:l.arr,dur:l.arr-l.dep,stops:0,key:l.id+'|'+l.dep},cab=fares(it).find(function(c){return c.k===r.cabin}),fam=cab&&cab.fam.find(function(f){return f.n===rec.family});if(!fam)return null;
  var cnt={a:0,c:0,i:0};rec.pax.forEach(function(p){cnt[p.type]++});
  var q={from:l.from,to:l.to,type:'ow',d1:lp(l.dep,l.from).day,d2:null,a:cnt.a,c:cnt.c,i:cnt.i,cab:r.cabin},b=mkBooking(q,[it],[{cab:r.cabin,fam:fam}],rec.pax.map(function(p){return p.name})),ms=(rec.bookedAt-420)*6e4,
   firstAdult=rec.pax.find(function(p){return p.type==='a'}).name;
  b.ref=rec.ref;b.fare=rec.fare;b.tax=rec.tax;b.chg=rec.chg;b.total=rec.total;b.dirPrices=[{fare:rec.fare,tax:rec.tax,chg:rec.chg,total:rec.total}];b.paid0=b.paid=rec.total;
  b.classes=[rec.cls];b.confirmedAt=rec.bookedAt;b.issuedMs=ms;b.held=false;b.place=rec.channel;b.paymentMethod='Simulated';b.payment={method:'Simulated',tendered:rec.total,change:0,approval:'SIM'};
  b.passengers=rec.pax.map(function(p){var w=p.name.split(' ');return{type:p.type,name:p.name,last:w.pop(),first:w.join(' '),title:'',dob:null,lapAdult:p.type==='i'?firstAdult:null}});
  b.gen={v:rec.v,idx:rec.idx,channel:rec.channel,resaleOf:rec.resaleOf||null};b.hist=[{at:ms,t:'SIMULATED BOOKING CREATED VIA '+rec.channel.toUpperCase()+(rec.resaleOf?' (RESALE OF '+rec.resaleOf+')':'')}];
  if(cancelledBy(rec,dn)){var cx=rec.cancel,cms=(cx.at-420)*6e4;b.dirs[0].legs.forEach(function(x){x.status='cancel'});b.cancelled={at:cms,refund:Math.round(cx.refund),rows:[],held:false,expired:false,simulated:true,reason:cx.reason};b.hist.push({at:cms,t:(cx.reason==='CHANGE'?'CHANGED TO ANOTHER FLIGHT, FEE ':'CANCELLED, REFUND ')+Math.round(cx.reason==='CHANGE'?cx.retained:cx.refund)})}
  return b}
 function bump(o,k,seats,rev){var c=o[k]||(o[k]={bookings:0,pax:0,revenue:0});c.bookings++;c.pax+=seats;c.revenue+=rev}
 /* What the terminal and the customer app have stored: simulated bookings someone has touched (they replace the generated record) and
    real bookings (counter and online). Built once per call into maps keyed for fast lookup by flight, so a whole day stays quick. */
 function storeIndex(){var rows=GA_STORE.get('ga-agent-bookings',[]),ovr={},real={};if(!Array.isArray(rows))rows=[];
  rows.forEach(function(b){if(!b||!Array.isArray(b.dirs))return;if(b.gen)ovr[b.ref]=b;
   b.dirs.forEach(function(d,di){d.legs.forEach(function(l){var k=l.id+'|'+l.dep+'|'+((b.cabs&&b.cabs[di])||b.cab);(real[k]||(real[k]=[])).push({b:b,di:di,legs:d.legs.length})})})});
  return{ovr:ovr,real:real}}
 function lead(names){return String(names&&names[0]||'').toUpperCase()}
 /* Every booking on a flight cabin as of the scenario day, with what happened to it:
    generated bookings (SIM), generated bookings someone changed in the terminal (OVR) and real ones (REAL). */
 function book(l,cabin,now,idx){var t=now==null?nowAbs():now,dn=dnowOf(l,t),ix=idx||storeIndex(),out=[];
  generate(l,cabin).forEach(function(b){if(b.dout<dn)return;
   var ov=ix.ovr[b.ref],e={ref:b.ref,source:'SIM',name:lead(b.pax.map(function(p){return p.name})),pax:b.pax.length,seats:b.seats,cabin:cabin,cls:b.cls,channel:b.channel,bookedAt:b.bookedAt,total:b.total,state:'ACTIVE',reason:'',refund:0,retained:0,noShow:b.noShow?b.noShow.retained:null};
   if(ov&&!(ov.cancelled&&ov.cancelled.simulated)){
    var leg=ov.dirs[0].legs[0];e.source='OVR';
    if(ov.cancelled){var paid=ov.paid||ov.total;e.state='CANCELLED';e.reason='USER';e.refund=ov.cancelled.refund||0;e.retained=Math.max(0,paid-e.refund)}
    else if(leg.id!==l.id||leg.dep!==l.dep||((ov.cabs&&ov.cabs[0])||ov.cab)!==cabin){e.state='CHANGED';e.reason='MOVED';e.refund=0;e.retained=0}
    else{e.seats=ov.pax.a+ov.pax.c;e.total=ov.total;e.cls=(ov.classes&&ov.classes[0])||e.cls}
    out.push(e);return}
   if(cancelledBy(b,dn)){e.state=b.cancel.reason==='CHANGE'?'CHANGED':'CANCELLED';e.reason=b.cancel.reason;e.refund=b.cancel.refund;e.retained=b.cancel.retained}
   out.push(e)});
  (ix.real[l.id+'|'+l.dep+'|'+cabin]||[]).forEach(function(r){var b=r.b;
   if(b.gen&&generate(l,cabin).some(function(g){return g.ref===b.ref}))return;/* already counted above as the changed simulated booking */
   var dp=(b.dirPrices&&b.dirPrices[r.di])||{total:b.total/b.dirs.length},share=dp.total/r.legs,seatsN=b.pax.a+b.pax.c,paid=b.held?0:share,
    e={ref:b.ref,source:'REAL',name:lead(b.names),pax:b.names.length,seats:seatsN,cabin:cabin,cls:(b.classes&&b.classes[r.di])||'',channel:b.place&&b.place!=='Counter JKT-03'?b.place:'Counter',bookedAt:b.confirmedAt||Math.round((b.issuedMs||b.savedMs||0)/6e4)+420,total:paid,state:'ACTIVE',reason:'',refund:0,retained:0,noShow:null};
   if(b.cancelled){var rf=b.cancelled.held?0:(b.cancelled.refund||0)/b.dirs.length/r.legs;e.state='CANCELLED';e.reason='USER';e.refund=rf;e.retained=Math.max(0,paid-rf);e.total=paid}
   out.push(e)});
  return out.sort(function(a,b){return a.bookedAt-b.bookedAt})}
 /* Revenue is what the airline keeps: active bookings in full, cancellations net of refunds, moves and changes at what is kept, and after
    departure no-shows at what their fare rules do not refund. Taxes and airport charges are included, as in the booking total. */
 function summary(l,cabin,now,idx){var t=now==null?nowAbs():now,departed=l.dep<=t,cap=cabinCap(l,cabin),
   s={cap:cap,sold:0,flown:0,noShow:0,loadFactor:0,revenue:0,soldRevenue:0,cancelledPax:0,changedPax:0,refunded:0,feeRevenue:0,bookings:0,byChannel:{},byClass:{}};
  book(l,cabin,t,idx).forEach(function(e){
   if(e.state!=='ACTIVE'){s[e.state==='CHANGED'?'changedPax':'cancelledPax']+=e.seats;s.refunded+=e.refund;s.feeRevenue+=e.retained;s.revenue+=e.retained;return}
   s.bookings++;s.sold+=e.seats;s.soldRevenue+=e.total;bump(s.byChannel,e.channel,e.seats,e.total);s.byClass[e.cls]=(s.byClass[e.cls]||0)+e.seats;
   if(departed&&e.noShow!=null){s.noShow+=e.seats;s.revenue+=e.noShow}else{s.revenue+=e.total;if(departed)s.flown+=e.seats}});
  s.loadFactor=cap?Math.min(1,s.sold/cap):0;return s}
 function add(a,b){['cap','sold','flown','noShow','revenue','soldRevenue','cancelledPax','changedPax','refunded','feeRevenue','bookings'].forEach(function(k){a[k]+=b[k]});
  ['byChannel'].forEach(function(g){for(var c in b[g]){var x=a[g][c]||(a[g][c]={bookings:0,pax:0,revenue:0});x.bookings+=b[g][c].bookings;x.pax+=b[g][c].pax;x.revenue+=b[g][c].revenue}});
  for(var c2 in b.byClass)a.byClass[c2]=(a.byClass[c2]||0)+b.byClass[c2]}
 function empty(){return{cap:0,sold:0,flown:0,noShow:0,loadFactor:0,revenue:0,soldRevenue:0,cancelledPax:0,changedPax:0,refunded:0,feeRevenue:0,bookings:0,byChannel:{},byClass:{}}}
 /* one flight, all its cabins */
 function flightSummary(l,now,idx){var ix=idx||storeIndex(),t=empty(),by={};legCabs(l).forEach(function(c){var s=summary(l,c,now,ix);by[c]=s;add(t,s)});t.loadFactor=t.cap?t.sold/t.cap:0;t.cabins=by;t.flight=l.id;t.dep=l.dep;return t}
 /* every flight departing on a local Jakarta day (default: today) */
 function daySummary(day,now,idx){var ix=idx||storeIndex(),X=day==null?TD:day,t=empty(),flights=[],seen={};Object.keys(DEP).forEach(function(o){legsDep(o,X).forEach(function(l){var k=l.id+'|'+l.dep;if(seen[k])return;seen[k]=1;var f=flightSummary(l,now,ix);flights.push(f);add(t,f)})});
  t.loadFactor=t.cap?t.sold/t.cap:0;t.day=X;t.flights=flights.sort(function(a,b){return a.dep-b.dep});return t}
 window.GA_DEMAND={VERSION:VERSION,encodeRef:encodeRef,decodeRef:decodeRef,generate:generate,legBookings:legBookings,cabinsOf:legCabs,resolveLeg:resolveLeg,findLeg:findLeg,retrieve:retrieve,visible:visible,history:history,book:book,storeIndex:storeIndex,resolve:resolve,summary:summary,flightSummary:flightSummary,daySummary:daySummary,refundFor:refundFor,fareAt:fareAt,clear:function(){memo.clear()}};
})();
