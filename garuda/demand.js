/* Deterministic simulated bookings (model version 1).
   A booking record is a pure function of flight, departure day, cabin and index, so it never has to be stored:
   the same inputs always give the same booking reference, passengers, channel, fare class, booking time and price.
   Passengers are generated to match the existing load model exactly: the seats booked up to "now" equal
   loadInfo(l,cabin).model, so this module explains the aggregate sold count with individual records.
   Loaded after the main script in index.html, whose globals (loadInfo, soldShare, SUBCLASSES, ...) it reads. */
(function(){
 var VERSION=2,HORIZON=330,DAY0=dnOf('2026-01-01'),CABINS=['Economy','Premium','Business'];
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
  for(a=0;a<types.length;a++)names.push(FIRST[hash(tag+'|fn'+a)%FIRST.length]+' '+(a===0||R(tag+'|fam'+a)<0.8?last:LAST[hash(tag+'|ln'+a)%LAST.length]));
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
 function resolve(ref){var c=decodeRef(String(ref).toUpperCase());if(!c||c.ci>2)return null;var f=FLS.find(function(x){return +String(x.id).replace(/\D/g,'')===c.fnum&&runs(x,c.D)});if(!f)return null;
  var l=mkLeg(f,c.D),cabin=CABINS[c.ci];if(legCabs(l).indexOf(cabin)<0)return null;var list=generate(l,cabin);return list[c.idx]||null}
 function bump(o,k,seats,rev){var c=o[k]||(o[k]={bookings:0,pax:0,revenue:0});c.bookings++;c.pax+=seats;c.revenue+=rev}
 /* Revenue is what the airline keeps: active bookings in full, cancellations net of refunds, changes at their fee, and after departure
    no-shows at what their fare rules do not refund. Taxes and airport charges are included, as in the booking total. */
 function summary(l,cabin,now){var t=now==null?nowAbs():now,dn=dnowOf(l,t),departed=l.dep<=t,cap=cabinCap(l,cabin),
   s={cap:cap,sold:0,flown:0,noShow:0,loadFactor:0,revenue:0,soldRevenue:0,cancelledPax:0,changedPax:0,refunded:0,feeRevenue:0,bookings:0,byChannel:{},byClass:{}};
  history(l,cabin,t).forEach(function(b){
   if(cancelledBy(b,dn)){var ch=b.cancel.reason==='CHANGE';s[ch?'changedPax':'cancelledPax']+=b.seats;s.refunded+=b.cancel.refund;s.feeRevenue+=b.cancel.retained;s.revenue+=b.cancel.retained;return}
   s.bookings++;s.sold+=b.seats;s.soldRevenue+=b.total;bump(s.byChannel,b.channel,b.seats,b.total);s.byClass[b.cls]=(s.byClass[b.cls]||0)+b.seats;
   if(departed&&b.noShow){s.noShow+=b.seats;s.revenue+=b.noShow.retained}else{s.revenue+=b.total;if(departed)s.flown+=b.seats}});
  s.loadFactor=cap?s.sold/cap:0;return s}
 function add(a,b){['cap','sold','flown','noShow','revenue','soldRevenue','cancelledPax','changedPax','refunded','feeRevenue','bookings'].forEach(function(k){a[k]+=b[k]});
  ['byChannel'].forEach(function(g){for(var c in b[g]){var x=a[g][c]||(a[g][c]={bookings:0,pax:0,revenue:0});x.bookings+=b[g][c].bookings;x.pax+=b[g][c].pax;x.revenue+=b[g][c].revenue}});
  for(var c2 in b.byClass)a.byClass[c2]=(a.byClass[c2]||0)+b.byClass[c2]}
 function empty(){return{cap:0,sold:0,flown:0,noShow:0,loadFactor:0,revenue:0,soldRevenue:0,cancelledPax:0,changedPax:0,refunded:0,feeRevenue:0,bookings:0,byChannel:{},byClass:{}}}
 /* one flight, all its cabins */
 function flightSummary(l,now){var t=empty(),by={};legCabs(l).forEach(function(c){var s=summary(l,c,now);by[c]=s;add(t,s)});t.loadFactor=t.cap?t.sold/t.cap:0;t.cabins=by;t.flight=l.id;t.dep=l.dep;return t}
 /* every flight departing on a local Jakarta day (default: today) */
 function daySummary(day,now){var X=day==null?TD:day,t=empty(),flights=[],seen={};Object.keys(DEP).forEach(function(o){legsDep(o,X).forEach(function(l){var k=l.id+'|'+l.dep;if(seen[k])return;seen[k]=1;var f=flightSummary(l,now);flights.push(f);add(t,f)})});
  t.loadFactor=t.cap?t.sold/t.cap:0;t.day=X;t.flights=flights.sort(function(a,b){return a.dep-b.dep});return t}
 window.GA_DEMAND={VERSION:VERSION,encodeRef:encodeRef,decodeRef:decodeRef,generate:generate,legBookings:legBookings,visible:visible,history:history,resolve:resolve,summary:summary,flightSummary:flightSummary,daySummary:daySummary,refundFor:refundFor,fareAt:fareAt,clear:function(){memo.clear()}};
})();
