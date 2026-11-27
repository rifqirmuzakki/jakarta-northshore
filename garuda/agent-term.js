/* Sales terminal: a GDS-style command screen (Amadeus, Sabre, Galileo flavour) on top of the Garuda engine.
   Availability, selling, names, contact, ticketing arrangement, save, form of payment, ticket, retrieve, cancel.
   The command set is simplified and Garuda-specific. It is not real GDS syntax. */
(function(){
'use strict';
var C,W,E,BKS,store;
function boot(){C=GA_AGENT.ctx;W=C.W;E=C.E;BKS=C.BKS;store=C.store;start()}
if(window.GA_AGENT&&GA_AGENT.ctx)setTimeout(boot,0);else document.addEventListener('ga-agent-ready',boot,{once:true});

var OFFICE='JKT003';
var ORDER='JCDIZWPSYBMEHQNKTLG'+'AOVRUX';
var FPS={CASH:'Cash',CC:'Credit card',DC:'Debit card',QRIS:'QRIS',TRF:'Bank transfer'};
var AC={'A350-1000':'351','A350-900':'359','787-9':'789','A330-900':'339','737-800':'738','ATR 72-600':'AT7'};
var T={lines:[],hist:[],hi:0,draft:'',av:null,list:null,p:fresh(),cur:null,fp:null,xi:null,ri:null,started:false};
function fresh(){return {names:[],segs:[],phone:'',email:'',tk:null,rf:'',extras:[],member:null}}
var $=function(id){return document.getElementById(id)};
var pad=function(s,n){s=String(s);return s.length>=n?s:s+' '.repeat(n-s.length)},lpad=function(s,n){s=String(s);return s.length>=n?s:' '.repeat(n-s.length)+s};
var n0=function(n){return Math.round(n/1000)*1000};
/* Amounts print in the currency of the booking in context (or of the itinerary being priced). A ¤ in source text is
   replaced with that currency's code on output; revenue and cash reports force IDR. */
var CURFORCE=null;
function ambient(){if(CURFORCE)return CURFORCE;var b=T.cur;if(b)return GA_CUR.ofBooking(b);var P=T.p;if(P&&P.segs&&P.segs.length){try{return GA_CUR.lock(GA_CUR.forCity(P.segs[0].it.legs[0].from,E.CT))}catch(e){}}return {code:'IDR',rate:1}}
var cx=function(t){return String(t).replace(/¤/g,ambient().code)};
var amt=function(n,cur){return GA_CUR.num(n,cur||ambient())};
var amtIdr=function(n){return GA_CUR.num(n,{code:'IDR',rate:1})};
var p2=function(n){return String(n).padStart(2,'0')};
function out(t,cls){t=cx(t);if(T.quiet){T.last={t:String(t),c:cls||''};return}String(t).split('\n').forEach(function(l){T.lines.push({t:l,c:cls||''})});if(T.lines.length>800)T.lines.splice(0,T.lines.length-800);paint()}
function ddmon(dn){var d=new Date(dn*864e5);return d.getUTCDate()+C.MON[d.getUTCMonth()]}
function ddmony(dn){var d=new Date(dn*864e5);return p2(d.getUTCDate())+C.MON[d.getUTCMonth()]+p2(d.getUTCFullYear()%100)}
function t4(abs,c){return E.fT(abs,c).replace(':','')}
function legDay(l){return W.lp(l.dep,l.from).day}
function dow(dn){return E.isoDow(dn)}
function fn(id){return id.replace(/^([A-Z]{2})\s*/,'$1 ')}
function nm(n){return (n.last+'/'+n.first+(n.title?' '+n.title:'')).toUpperCase()}
function pn(b,i){var p=(b.passengers||[])[i],full=b.names[i]||'',w=full.split(' '),last=p&&p.last?p.last:w.slice(-1)[0],first=p&&p.last?p.first:w.slice(0,-1).join(' ');return (last+'/'+first+(p&&p.title?' '+p.title:'')).toUpperCase()}
function endOfDay(dn){return (dn+1)*864e5-7*36e5-6e4}
function tl(ms){return C.tlText(ms)}
function tlShort(ms){var d=new Date(ms+7*36e5);return d.getUTCDate()+C.MON[d.getUTCMonth()]+'/'+p2(d.getUTCHours())+p2(d.getUTCMinutes())}

/* ---------- screen ---------- */
function paint(){var o=$('tout');if(!o)return;var h='';T.lines.forEach(function(l){h+='<div class="ln'+(l.c?' '+l.c:'')+'">'+C.esc(l.t||' ')+'</div>'});o.innerHTML=h;o.scrollTop=o.scrollHeight;side()}
function start(){
 var f=$('tform'),i=$('tin');
 $('term-help').addEventListener('click',function(){GA_TERM.run('HE');i.focus()});
 f.addEventListener('submit',function(e){e.preventDefault();var v=i.value.trim();i.value='';if(!v)return;T.hist.push(v);T.hi=T.hist.length;T.draft='';out('> '+v.toUpperCase(),'cmd');try{run(v)}catch(err){out('SYSTEM ERROR '+err.message,'e')}side();if(C.st.tab!=='term')C.renderAll()});
 i.addEventListener('keydown',function(e){if(e.key==='ArrowUp'){e.preventDefault();if(T.hi===T.hist.length)T.draft=i.value;if(T.hi>0)i.value=T.hist[--T.hi]||''}else if(e.key==='ArrowDown'){e.preventDefault();T.hi=Math.min(T.hist.length,T.hi+1);i.value=T.hi===T.hist.length?T.draft:T.hist[T.hi]}else if(e.key==='Escape')i.value=''});
 $('scr').addEventListener('click',function(e){if(!window.getSelection().toString())i.focus()});
 $('tside').addEventListener('click',function(e){var b=e.target.closest('[data-cmd]');if(b){i.value=b.dataset.cmd;i.focus()}});
 if(!T.started){T.started=true;out('GARUDA INDONESIA SALES TERMINAL  -  '+C.COUNTER.toUpperCase()+'  -  OFFICE '+OFFICE+'\nSIGNED IN  '+ddmony(E.TD)+'  '+t4(E.nowAbs(),E.HUB)+' WIB\nTYPE HE FOR HELP.   EXAMPLE:  AN21DECJKTSIN','sys')}
 paint();GA_TERM.show()}
window.GA_TERM={show:function(){if(!C)return;var i=$('tin');if(i)setTimeout(function(){i.focus({preventScroll:true})},0);side()},refresh:function(){if(C)paint()},run:function(v){out('> '+v.toUpperCase(),'cmd');run(v);side()},state:function(){return T},lines:function(){return T.lines.map(function(l){return l.t})},changeOptions:changeOptions,changeQuote:changeQuote,changeCommit:changeCommit,itineraryText:function(ref){var b=BKS.find(function(x){return x.ref===ref});return b?ipLines(b).join('\n'):''},printItinerary:function(ref){var b=BKS.find(function(x){return x.ref===ref});if(b&&!b.cancelled)ipPrint(b)}};

/* ---------- command router ---------- */
function run(raw){var up=raw.trim().toUpperCase(),c=up.replace(/\s+/g,''),m;
 if(T.xi&&c!=='XIY')T.xi=null;
 if(c==='HE'||c==='HELP'||c==='?')return help();
 if(c==='CL'||c==='CLR'||c==='CLEAR'){T.lines=[];return paint()}
 if(c==='IP')return ip(false);
 if(c==='IPP')return ip(true);
 if(c==='TWD')return ticketDisplay();
 if(c==='TWP')return printRecord();
 if(m=up.match(/^AM\s*(.*)$/))return member(m[1]);
 if(c==='AWQ'||c==='AWX')return out('AWARD SEATS ARE SOLD LIKE ANY CLASS - AW21DECJKTDPS SHOWS THEM, SS1X2 SELLS ONE, AM<NAME> SELECTS THE MEMBER','e');
 if(/^AW/.test(c))return an(c,true);
 if(c==='JD')return out(dayName(E.TD)+' '+ddmony(E.TD)+'  '+t4(E.nowAbs(),E.HUB)+' WIB','sys');
 if(m=up.match(/^DAC\s*([A-Z]{3})$/))return dac(m[1]);
 if(m=up.match(/^DAN\s*(.{2,})$/))return dan(m[1].trim());
 if(/^AN/.test(c))return an(c);
 if(/^SS/.test(c))return ss(c);
 if(/^NM/.test(up.replace(/\s+/g,' ')))return addNames(up);
 if(/^AP/.test(c))return ap(up);
 if(/^TK/.test(c))return tk(c);
 if(/^RF/.test(c))return rf(up);
 if(/^SR/.test(c))return sr(up);
 if(/^(RM|RC)/.test(c))return rm(up);
 if(/^OS/.test(c))return os(up);
 if(m=c.match(/^DD(GA\d{1,4})\/(\d{1,2}[A-Z]{3}(?:\d{2})?)(?:\/([YWC]))?$/))return dd(m[1],m[2],m[3]);
 if(/^DD/.test(c))return out('INVALID FORMAT - EXAMPLE  DDGA202/16NOV  (ADD /Y ECONOMY, /W PREMIUM OR /C BUSINESS)','e');
 if(/^SM/.test(c))return sm(c);
 if(/^ST/.test(c))return st(c);
 if(/^FP/.test(c))return fp(c);
 if(c==='ER'||c==='ERK')return er();
 if(c==='IR'||c==='IG')return ig();
 if(c==='ET'||c==='TTP')return et();
 if(c==='EP')return ep();
 if(/^RT/.test(c))return rt(c);
 if(/^XE/.test(c))return xe(c);
 if(/^RB/.test(c))return rb(c);
 if(c==='XI')return xi(false);
 if(c==='XIY')return xi(true);
 if(c==='FXX')return fxx();
 if(/^DO/.test(up))return discount(up);
 if(/^FQD/.test(c))return fareDisplay(c);
 if(c==='FQN')return fqn();
 if(c==='QT')return qt();
 if(c==='RH')return rh();
 out('INVALID ENTRY - TYPE HE FOR HELP','e')}

function help(){out([
'AVAILABILITY AND SELLING',
'  AN21DECJKTSIN        availability, date and city pair',
'  AN28DEC              return availability (reverses the last pair)',
'  SS2Y1                sell 2 seats, class Y, line 1 of the last display',
'BOOKING ELEMENTS',
'  NM1WIJAYA/RINA       adult name           NM2WIJAYA/RINA/BUDI  two adults',
'  NM1WIJAYA/SARI(CHD/01JUN18)   child       NM1WIJAYA/BAYU(INF/20AUG25)  infant',
'  AP+628123456789      contact phone        APE-RINA@MAIL.COM    contact email',
'  TKOK or TKTL25NOV    ticketing: today, or a time limit date',
'  RFRINA               received from',
'  XE4  XE2-3           delete elements      IG  ignore the whole booking',
'  RBT3  RBT3/2         rebook element 3 into class T, or onto line 2 of the last AN (class, flight or date)',
'                       ticketed: you get a reissue quote, then FP<METHOD> and TTP',
'SIMULATED DEMAND',
'  DDGA202/16NOV        demand for a flight: seats sold, load factor, revenue, cancellations and its bookings (add /Y, /W or /C for one cabin)',
'  RT<REF>              retrieve a simulated booking from that list; whatever you do to it is then remembered',
'SEATS, SERVICES AND REMARKS',
'  SM3                  seat map of the flight in element 3 (saved bookings)',
'  ST12A/P1/S3          seat 12A for passenger 1 on the flight in element 3 (S3 optional with one flight)',
'  SRVGML/P1            special service: vegetarian meal, passenger 1, all flights  (add /S3 for one flight)',
'  SRWCHR/P2  SRBSCT/P1  SRMEDA-HEART CONDITION/P1  SRFQTV-GA123456789/P1   (GarudaMiles number)',
'  RM TEXT  RC TEXT  OSGA TEXT   remark, confidential remark, message to the airline',
'  codes: VGML MOML CHML BBML DBML GFML SFML WCHR WCHS WCHC BSCT BLND DEAF MEDA PETC FQTV',
'SAVE AND TICKET',
'  FQDJKTSIN            example fares for a city pair (simulated)',
'  FXX  FQN             price itinerary and show simplified fare rules',
'  DO10/REASON          simulated 10% fare override on a held cash booking',
'  DO0/REASON           remove override; taxes recalculated; airport charges unchanged',
'  ER                   save the booking, get the record locator, seats held',
'  FPCASH  FPCASH/2000000  FPCC  FPDC  FPQRIS  FPTRF    form of payment',
'  TTP                  issue tickets       EP  print the e-ticket',
'  ET                   legacy alias for TTP (simulation)',
'  IP  IPP              display / print the itinerary: plain-text counter copy (held bookings show the time limit and fare rules)',
'  TWD                  display simulated e-ticket record',
'  TWP                  print agent copy of the e-ticket record (simulation)',
'AWARD REDEMPTION - GARUDAMILES SIMULATION',
'  AW21DECJKTDPS        award seats: classes X U economy, R V premium, O A business (Saver, Advantage)',
'  AMGA123456789        member by GarudaMiles number: balance, tier, activity; selects the member for this booking (no name search, many members share a name)',
'  SRFQTV-GA123456789/P1   attach the number to passenger 1; the name must match, and it selects the member too',
'  SS1X2                sell award class X on line 2, then NM AP TK RF as usual and ER (needs a member)',
'                       miles are debited at TTP, taxes and charges are paid in cash; no mixing with cash classes',
'                       XI returns the miles less a fee; RBU3 changes an award for a miles fee',
'RETRIEVE AND CHANGE',
'  RTGA1234  RTWIJAYA   retrieve by locator or surname    RT  redisplay',
'  XI  then  XIY        cancel the booking (refund or release seats)',
'  QT                   held bookings by time limit        RH  booking history',
'OTHER',
'  DACSIN  DAN SINGAPORE   decode and encode cities    JD  date    CL  clear screen',
'CLASSES  J C Business Flex   D I Z Business Saver   W P S Premium Economy   Y B Economy Flexi\n         M E H Economy Standard   Q N K Economy Value   T L G Economy Lite.  Cheaper classes close first.'].join('\n'),'sys')}
function dayName(dn){return ['MO','TU','WE','TH','FR','SA','SU'][dow(dn)-1]}
function dac(c){var x=E.CT[c];out(x?c+'  '+x.n.toUpperCase()+'  '+(x.z==='D'?'DOMESTIC':'INTERNATIONAL')+'  '+x.tz:c+' - UNKNOWN CODE','sys'===''?'':(x?'':'e'))}
function dan(t){t=t.toUpperCase();var r=Object.keys(E.CT).filter(function(c){return E.CT[c].n.toUpperCase().indexOf(t)>=0}).slice(0,12);out(r.length?r.map(function(c){return c+'  '+E.CT[c].n.toUpperCase()}).join('\n'):'NO MATCH','')}

/* ---------- availability and sell ---------- */
function acCode(l){return AC[l.ac]||String(l.ac).replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase()}
function classRow(it,withAward){var rows=[];W.fares(it).forEach(function(cab){cab.fam.forEach(function(f){(f.subs||[]).forEach(function(s){rows.push({k:s.k,cab:cab,fam:f,sub:s,left:s.left})})})});
 if(withAward)W.awardFares(it).forEach(function(a){rows.push({k:a.k,cab:{k:a.cab,left:a.left,atFare:a.left},fam:a.fam,sub:{k:a.k,left:a.left,p:0},left:a.left,award:a})});
 rows.sort(function(a,b){return ORDER.indexOf(a.k)-ORDER.indexOf(b.k)});return rows}
function famAt(row){return Object.assign({},row.fam,{p:row.sub.p,sub:row.k})}
function an(c,award){var m=c.match(/^A[NW](\d{1,2}[A-Z]{3}(?:\d{2})?)([A-Z]{3})?([A-Z]{3})?$/);if(!m)return out(award?'INVALID FORMAT - EXAMPLE  AW21DECJKTSIN':'INVALID FORMAT - EXAMPLE  AN21DECJKTSIN','e');
 var dn=C.parseDate(m[1]);if(dn==null)return out('INVALID DATE','e');
 var o,d;if(m[2]&&m[3]){o=m[2];d=m[3]}else if(!m[2]&&!m[3]&&T.av){o=T.av.d;d=T.av.o}else return out('NEED CITY PAIR - EXAMPLE  AN21DECJKTSIN','e');
 if(!E.CT[o])return out(o+' UNKNOWN CITY CODE - USE DAN','e');if(!E.CT[d])return out(d+' UNKNOWN CITY CODE - USE DAN','e');if(o===d)return out('CITIES MUST DIFFER','e');if(dn<W.lp(E.nowAbs(),o).day)return out('DATE MUST BE TODAY OR LATER AT DEPARTURE','e');
 var its=W.search(o,d,dn).filter(function(it){return it.dep>E.nowAbs()});T.av={o:o,d:d,dn:dn,its:its,award:!!award};
 out('** GARUDA INDONESIA '+(award?'AWARD ':'')+'AVAILABILITY **  '+o+' '+E.CT[o].n.toUpperCase()+' - '+d+' '+E.CT[d].n.toUpperCase()+'\n'+dayName(dn)+' '+ddmony(dn),'h');
 if(!its.length)return out('NO FLIGHTS','e');
 out(pad(' LN FLIGHT',19)+pad(award?'AWARD CLASSES':'CLASSES AVAILABLE',award?24:58)+pad('ROUTE',8)+pad('DEP',5)+pad('ARR',6)+pad('+D',3)+pad('EQP',4)+'DUR','h');
 its.forEach(function(it,i){var a=it.legs[0],z=it.legs[it.legs.length-1],cr=award?awardRows(it):classRow(it),dd=W.lp(z.arr,z.to).day-W.lp(a.dep,a.from).day,flt=it.legs.map(function(l){return fn(l.id)}).join('/');
  out(lpad(i+1,3)+'  '+pad(flt,12)+'  '+pad(cr.map(function(x){return x.k+Math.min(9,x.left)}).join(' '),award?24:58)+a.from+z.to+'  '+t4(a.dep,a.from)+' '+t4(z.arr,z.to)+'  '+(dd>0?'+'+dd:' 0')+' '+pad(acCode(a),4)+E.dur(it.dur).replace(' ','').replace('h',':').replace('m','')+(it.stops?'  VIA '+a.to:''))});
 if(award){var sig={};its.forEach(function(it,i){var k=awardRows(it).map(function(x){return pad(x.k,2)+lpad(x.miles.toLocaleString('en-US'),8)}).join('  ');(sig[k]=sig[k]||[]).push(i+1)});out('MILES PER PASSENGER, ONE WAY\n'+Object.keys(sig).map(function(k){return '  LN '+sig[k].join(',')+':  '+k}).join('\n'),'')}
 out(award?'SELL WITH SS<SEATS><CLASS><LINE>, FOR EXAMPLE  SS1X2.  AM<MEMBERSHIP NUMBER> SELECTS THE MEMBER.  AN SHOWS CASH CLASSES':'SELL WITH SS<SEATS><CLASS><LINE>, FOR EXAMPLE  SS2Y1.  AW<DATE><CITY PAIR> SHOWS AWARD SEATS','sys')}
function awardRows(it){return W.awardFares(it).sort(function(a,b){return 'AOVRUX'.indexOf(a.k)-'AOVRUX'.indexOf(b.k)})}
function ss(c){var m=c.match(/^SS(\d)([A-Z])(\d{1,2})$/);if(!m)return out('INVALID FORMAT - EXAMPLE  SS2Y1  (2 SEATS, CLASS Y, LINE 1)','e');
 if(T.cur)return out('BOOKING ALREADY SAVED - IGNORE WITH IG TO START A NEW ONE','e');
 var n=+m[1],k=m[2],ln=+m[3];if(!T.av)return out('NO AVAILABILITY DISPLAYED - USE AN FIRST','e');if(n<1)return out('NUMBER OF SEATS MUST BE 1 TO 9','e');
 var it=T.av.its[ln-1];if(!it)return out('NO SUCH LINE '+ln,'e');if(it.dep<=E.nowAbs())return out('FLIGHT HAS DEPARTED - DISPLAY AVAILABILITY AGAIN','e');
 var row=classRow(it,true).find(function(x){return x.k===k});if(!row)return out('CLASS '+k+' NOT OFFERED ON LINE '+ln,'e');
 if(T.p.segs.length&&!!T.p.segs[0].award!==!!row.award)return out('AWARD AND CASH CLASSES CANNOT BE MIXED IN ONE BOOKING','e');
 if(row.left<n)return out(row.left?'ONLY '+row.left+' SEAT'+(row.left>1?'S':'')+' IN CLASS '+k:'CLASS '+k+' CLOSED','e');
 var P=T.p;if(P.segs.length&&P.segs[0].n!==n)return out('SEATS MUST MATCH THE FIRST SEGMENT ('+P.segs[0].n+')','e');
 if(P.segs.some(function(s){return s.it.key===it.key}))return out('DUPLICATE SEGMENT','e');
 var last=P.segs[P.segs.length-1];if(last&&it.dep<last.it.arr)return out('SEGMENTS OUT OF SEQUENCE','e');
 P.segs.push({it:it,cls:k,cab:row.cab.k,fam:famAt(row),n:n,award:row.award?{level:row.award.level,miles:row.award.miles}:null});
 out(segLines(P.segs[P.segs.length-1],0).join('\n')+(row.award?'\nAWARD '+row.award.level.toUpperCase()+'  '+row.award.miles.toLocaleString('en-US')+' MILES PER PASSENGER, TAXES AND CHARGES IN CASH':'')+'\nOK','');paint()}
function segLines(s,start){return s.it.legs.map(function(l,j){return lpad(start+j+1,2)+'  '+pad(fn(l.id),7)+' '+s.cls+' '+pad(ddmon(legDay(l)),6)+dow(legDay(l))+' '+l.from+l.to+'  HK'+s.n+'   '+t4(l.dep,l.from)+' '+t4(l.arr,l.to)})}

/* ---------- elements ---------- */
function parseDob(t){var m=t.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);if(!m)return null;var mo=C.MON.indexOf(m[2]);if(mo<0)return null;var dn=Math.floor(Date.UTC(2000+ +m[3],mo,+m[1])/864e5);return {dn:dn,iso:C.iso(dn)}}
function addNames(up){if(T.cur)return out('BOOKING ALREADY SAVED - IGNORE WITH IG TO START A NEW ONE','e');
 var m=up.replace(/\s+/g,' ').match(/^NM ?(\d)\s*([A-Z' .-]+?)\/(.+)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  NM1WIJAYA/RINA','e');
 var cnt=+m[1],sur=m[2].trim(),parts=m[3].split(/\/(?![^(]*\))/),add=[];if(parts.length!==cnt)return out('NUMBER IN NAME ('+cnt+') DOES NOT MATCH NAMES GIVEN ('+parts.length+')','e');
 for(var i=0;i<parts.length;i++){var x=parts[i].trim().match(/^([A-Z' .-]+?)(?:\s+(MRS|MR|MS|MSTR|MISS))?\s*(?:\((CHD|INF)\/(\d{1,2}[A-Z]{3}\d{2})\))?$/);if(!x||!/^[A-Z]/.test(x[1]))return out('INVALID NAME '+parts[i],'e');
  var t=x[3]==='CHD'?'c':x[3]==='INF'?'i':'a',dob=null;if(t!=='a'){dob=parseDob(x[4]);if(!dob)return out('INVALID DATE OF BIRTH '+x[4],'e')}
  if(x[2]&&(t==='a'?x[2]==='MSTR':x[2]!=='MSTR'&&x[2]!=='MISS'))return out('TITLE '+x[2]+' NOT ALLOWED FOR '+(t==='a'?'AN ADULT':'A CHILD OR INFANT')+'  (ADULT MR MRS MS MISS, CHILD MSTR MISS)','e')
  add.push({first:x[1].trim(),last:sur,title:x[2]||'',t:t,dob:dob?dob.iso:'',dn:dob?dob.dn:null})}
 var a=T.p.names.filter(function(n){return n.t==='a'}).length+add.filter(function(n){return n.t==='a'}).length,ii=T.p.names.filter(function(n){return n.t==='i'}).length+add.filter(function(n){return n.t==='i'}).length;
 if(a+T.p.names.filter(function(n){return n.t==='c'}).length+add.filter(function(n){return n.t==='c'}).length>9)return out('MAXIMUM 9 PASSENGERS WITH A SEAT','e');
 if(ii>a)return out('EACH INFANT NEEDS AN ADULT','e');
 add.forEach(function(n){T.p.names.push(n)});T.p.names.sort(function(x,y){return 'aci'.indexOf(x.t)-'aci'.indexOf(y.t)});
 out(elems().filter(function(e){return e.k==='nm'}).map(function(e){return e.line}).join('\n')+'\nOK')}
function ap(up){if(T.cur)return out('BOOKING ALREADY SAVED','e');var m=up.match(/^APE\s*[-:]?\s*(\S+@\S+)$/);if(m){T.p.email=m[1].toLowerCase();return out('OK')}
 m=up.match(/^AP\s*[-:]?\s*(.+)$/);if(!m||m[1].replace(/\D/g,'').length<8)return out('INVALID CONTACT - EXAMPLE  AP+628123456789','e');T.p.phone=m[1].trim();out('OK')}
function tk(c){if(T.cur)return out('BOOKING ALREADY SAVED','e');var m;if(c==='TKOK'){T.p.tk={ms:endOfDay(E.TD),why:'TKOK'};return out('OK  TICKETING TIME LIMIT '+tl(T.p.tk.ms))}
 if(m=c.match(/^TKTL(\d{1,2}[A-Z]{3}(?:\d{2})?)$/)){var dn=C.parseDate(m[1]);if(dn==null||dn<E.TD)return out('INVALID TIME LIMIT DATE','e');if(T.p.segs.length&&dn>legDay(T.p.segs[0].it.legs[0]))return out('TIME LIMIT MUST BE ON OR BEFORE THE FIRST DEPARTURE','e');T.p.tk={ms:endOfDay(dn),why:'TKTL'};return out('OK  TICKETING TIME LIMIT '+tl(T.p.tk.ms))}
 out('INVALID FORMAT - TKOK OR TKTL25NOV','e')}
function rf(up){if(T.cur)return out('BOOKING ALREADY SAVED','e');var m=up.match(/^RF\s*(.+)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  RFRINA','e');T.p.rf=m[1].trim();out('OK')}
function fp(c){var m=c.match(/^FP(CASH|CC|DC|QRIS|TRF)(?:\/(\d+))?$/);if(!m)return out('INVALID FORM OF PAYMENT - FPCASH FPCC FPDC FPQRIS FPTRF','e');T.fp={k:m[1],amount:m[2]?GA_CUR.toIdr(+m[2],ambient()):null};out('OK  FORM OF PAYMENT '+FPS[m[1]].toUpperCase())}
function xe(c){var m=c.match(/^XE([\d,-]+)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  XE3  OR  XE2-3','e');
 var nums=[];m[1].split(',').forEach(function(x){var r=x.match(/^(\d+)-(\d+)$/);if(r){for(var i=+r[1];i<=+r[2];i++)nums.push(i)}else if(/^\d+$/.test(x))nums.push(+x)});
 if(T.cur){var b=T.cur;if(b.cancelled)return out('BOOKING IS CANCELLED','e');var be=bookElems(b).filter(function(x){return x.num}),gone=[];for(var q=0;q<nums.length;q++){var x=be[nums[q]-1];if(!x)return out('NO ELEMENT '+nums[q],'e');if(x.k!=='ex')return out('ELEMENT '+nums[q]+' CANNOT BE DELETED FROM A SAVED BOOKING - ONLY SSR AND REMARKS.  XI CANCELS THE BOOKING','e');gone.push(x.i)}
  uniq(gone).sort(function(a,b){return b-a}).forEach(function(i){b.extras.splice(i,1)});(b.hist=b.hist||[]).push({at:Date.now(),t:'DELETED '+gone.length+' SSR OR REMARK ELEMENT'+(gone.length>1?'S':'')});store.set(C.KEY,BKS);return out('OK  '+gone.length+' ELEMENT'+(gone.length>1?'S':'')+' DELETED','')}
 var es=elems(),del={nm:[],seg:[],ex:[],ap:0,em:0,tk:0,fp:0,rf:0};for(var j=0;j<nums.length;j++){var e=es[nums[j]-1];if(!e)return out('NO ELEMENT '+nums[j],'e');if(e.k==='nm')del.nm.push(e.i);else if(e.k==='seg')del.seg.push(e.i);else if(e.k==='ex')del.ex.push(e.i);else del[e.k]=1}
 uniq(del.ex).sort(function(a,b){return b-a}).forEach(function(i){T.p.extras.splice(i,1)});uniq(del.nm).sort(function(a,b){return b-a}).forEach(function(i){T.p.names.splice(i,1)});uniq(del.seg).sort(function(a,b){return b-a}).forEach(function(i){T.p.segs.splice(i,1)});
 T.p.extras=T.p.extras.filter(function(x){return (!x.nameRef||T.p.names.indexOf(x.nameRef)>=0)&&(!x.segRef||T.p.segs.indexOf(x.segRef)>=0)});
 if(del.ap)T.p.phone='';if(del.em)T.p.email='';if(del.tk)T.p.tk=null;if(del.fp)T.fp=null;if(del.rf)T.p.rf='';out('OK  '+nums.length+' ELEMENT'+(nums.length>1?'S':'')+' DELETED')}
function uniq(a){return a.filter(function(x,i){return a.indexOf(x)===i})}
function ig(){var had=T.cur||T.p.names.length||T.p.segs.length;T.p=fresh();T.cur=null;T.fp=null;T.xi=null;T.ri=null;out(had?'IGNORED':'NOTHING TO IGNORE','sys')}

/* ---------- the booking as numbered elements ---------- */
function elems(){var P=T.p,es=[],n=0;P.names.forEach(function(x,i){es.push({k:'nm',i:i,line:lpad(++n,2)+'.'+nm(x)+(x.t==='c'?' (CHD/'+ddmony(x.dn)+')':x.t==='i'?' (INF/'+ddmony(x.dn)+')':'')})});
 P.segs.forEach(function(s,i){segLines(s,n).forEach(function(l,j){es.push({k:'seg',i:i,leg:j,line:l});n++})});
 if(P.phone)es.push({k:'ap',line:lpad(++n,2)+' AP '+P.phone});if(P.email)es.push({k:'em',line:lpad(++n,2)+' AP E-'+P.email.toUpperCase()});
 if(P.tk)es.push({k:'tk',line:lpad(++n,2)+' TK '+(P.tk.why==='TKOK'?'OK':'TL')+tlShort(P.tk.ms)});if(T.fp)es.push({k:'fp',line:lpad(++n,2)+' FP '+FPS[T.fp.k].toUpperCase()+(T.fp.amount?'/'+amt(T.fp.amount):'')});if(P.rf)es.push({k:'rf',line:lpad(++n,2)+' RF '+P.rf.toUpperCase()});
 P.extras.forEach(function(x,i){var leg=x.segRef&&x.leg!=null?x.segRef.it.legs[x.leg]:null,pnum=x.nameRef?P.names.indexOf(x.nameRef)+1:0;es.push({k:'ex',i:i,line:lpad(++n,2)+' '+exText(x,leg,pnum,1)})});return es}
function exText(x,leg,pnum,seatsN){var pp=pnum?'/P'+pnum:'';
 if(x.k==='svc'&&x.type!=='seat'&&x.type!=='bag')return 'SVC '+({meal:'MEAL '+String(x.item||'').toUpperCase(),lounge:'LOUNGE ACCESS',priority:'PRIORITY BOARDING',insurance:'TRAVEL INSURANCE'}[x.type]||String(x.type).toUpperCase())+(x.flight?' '+String(x.flight).replace(/\s+/g,''):'')+pp+'  PAID';
 if(x.k==='svc')return 'SVC '+(x.type==='bag'?'EXTRA BAG '+x.count+'X'+x.kg+'KG':'SEAT '+x.seat+' '+String(x.tier||'').toUpperCase())+' '+String(x.flight).replace(/\s+/g,'')+pp+'  PAID';
 if(x.k==='rm')return 'RM '+x.text.toUpperCase();if(x.k==='rc')return 'RC '+x.text.toUpperCase()+' (CONFIDENTIAL)';if(x.k==='os')return 'OSI GA '+x.text.toUpperCase();
 return 'SSR '+x.code+' GA HK'+seatsN+(leg?' '+leg.from+leg.to+' '+String(leg.id).replace(/^\D+\s*/,'')+' '+ddmon(legDay(leg)):'')+(x.text?' '+x.text.toUpperCase():'')+pp}
function bookElems(b){var es=[],n=0,num=function(k,rest,extra){es.push(Object.assign({k:k,line:lpad(++n,2)+rest,num:n},extra||{}))},info=function(line){es.push({k:'info',line:line})};
 (b.passengers||[]).forEach(function(p,i){num('nm','.'+pn(b,i)+(p.type==='c'?' (CHD/'+(p.dob?ddmony(E.dnOf(p.dob)):'')+')':p.type==='i'?' (INF)':''),{i:i});if(p.nationality)info('      NATIONALITY '+p.nationality+' /P'+(i+1));if(p.passport)info('      PASSPORT ON FILE /P'+(i+1))});
 b.dirs.forEach(function(d,di){d.legs.forEach(function(g,li){num('seg','  '+pad(fn(g.id),7)+' '+classOf(b,di)+' '+pad(ddmon(legDay(g)),6)+dow(legDay(g))+' '+g.from+g.to+'  '+(g.status==='cancel'?'XX':'HK')+(b.pax.a+b.pax.c)+'   '+t4(g.dep,g.from)+' '+t4(g.arr,g.to),{d:di,l:li});
  if(!b.cancelled){var ss=[];(b.passengers||[]).forEach(function(p,i){if(p.type!=='i'){var st=W.travellerSeat(b,g,i);if(st&&!/^(Not|Lap)/.test(st))ss.push(st+'/P'+(i+1))}});if(ss.length)info('      SEAT '+ss.join('  '))}})});
 if(b.contactPhone)num('ap',' AP '+b.contactPhone);if(b.contactEmail)num('ap',' AP E-'+b.contactEmail.toUpperCase());
 if(b.held&&b.tl)num('tk',' TK TL'+tlShort(b.tl));if(!b.held&&!b.cancelled&&b.payment)num('fp',' FP '+b.paymentMethod.toUpperCase());
 if(b.rf)num('rf',' RF '+b.rf.toUpperCase());
 if(b.award)info('    AWARD '+b.award.member+' '+(W.awardMember(b)||'')+'  '+milesTxt(b.award.miles)+' MILES  '+(b.award.issued?'DEBITED':'DEBIT AT TICKETING'));
 (b.extras||[]).forEach(function(x,i){if(x.k==='svc')return info('      '+exText(x,null,x.p!=null?x.p+1:0,1));var leg=x.d!=null&&x.l!=null&&b.dirs[x.d]?b.dirs[x.d].legs[x.l]:null;num('ex',' '+exText(x,leg,x.p!=null?x.p+1:0,1),{i:i})});
 if(!b.held&&b.issuedMs)b.names.forEach(function(x,i){info('    FA PAX '+C.ticketNo(b,i)+'/ETGA/'+ddmon(E.TD)+'/'+OFFICE+'   '+pn(b,i))});return es}
function bookingText(b){return ['RP/'+OFFICE+'/'+OFFICE+'   '+b.ref+'   '+C.statusOf(b)[0].toUpperCase()+'   '+ddmony(E.TD)].concat(bookElems(b).map(function(e){return e.line})).join('\n')}
function classOf(b,i){if(b.classes&&b.classes[i])return b.classes[i];var f=b.fams[i]||b.fams[0],o={'Economy Flexi':'Y','Economy Standard':'M','Economy Value':'Q','Economy Lite':'T','Premium Economy':'W','Business Saver':'D','Business Flex':'J'};return o[f]||'Y'}
function showCurrent(){if(T.cur)return out(bookingText(T.cur),'');var es=elems();out(es.length?'RP/'+OFFICE+'/'+OFFICE+'   NOT SAVED   '+ddmony(E.TD)+'\n'+es.map(function(e){return e.line}).join('\n'):'NO BOOKING IN PROGRESS','')}

/* ---------- fare quote ---------- */
function build(){var P=T.p;if(!P.segs.length)return null;var a=0,c=0,i=0;P.names.forEach(function(n){if(n.t==='a')a++;else if(n.t==='c')c++;else i++});var its=P.segs.map(function(s){return s.it}),f=its[0].legs[0],z=its[0].legs[its[0].legs.length-1],d1=legDay(f),dl=legDay(its[its.length-1].legs[0]);
 var tt=W.tripType(its),rev=tt==='ret';
 var q={from:f.from,to:z.to,type:(tt==='ret'||tt==='oj'||tt==='circle')?tt:'one',d1:d1,d2:rev?dl:d1,a:a||1,c:c,i:i,cab:'Economy'},sel=P.segs.map(function(s){return {it:s.it,fam:s.fam}});
 return {q:q,sel:sel,sum:W.priceSummary(sel,q),assumed:!a,rev:rev,tt:tt,multi:tt==='multi'}}
function fareDisplay(c){var m=c.match(/^FQD([A-Z]{3})([A-Z]{3})$/);if(!m)return out('ENTER CITY PAIR - EXAMPLE FQDJKTSIN. USE FXX TO PRICE THE CURRENT ITINERARY','e');var o=m[1],d=m[2];if(!E.CT[o]||!E.CT[d]||o===d)return out('INVALID CITY PAIR - EXAMPLE FQDJKTSIN','e');var dn=E.TD+1,its=W.search(o,d,dn),best={};its.forEach(function(it){W.fares(it).forEach(function(cab){cab.fam.forEach(function(fam){var q={from:o,to:d,type:'one',d1:dn,d2:dn,a:1,c:0,i:0,cab:cab.k},p=W.priceFor(it,fam,q);if(!best[fam.n]||p.total<best[fam.n])best[fam.n]=p.total})})});var names=Object.keys(best);if(!names.length)return out('NO EXAMPLE FARES FOUND FOR '+o+d+' ON '+ddmon(dn),'sys');out('SIMULATED FARE DISPLAY  '+o+d+'  '+ddmon(dn)+'\nONE ADULT ONE WAY - EXAMPLE TOTALS INCLUDING TAXES AND CHARGES\n'+names.map(function(n){return '  '+pad(n.toUpperCase(),24)+'¤ '+amt(best[n])}).join('\n')+'\nINDICATIVE ONLY - USE AN TO CHOOSE FLIGHTS AND FXX TO PRICE THE BOOKING','sys')}
function discount(up){var m=up.match(/^DO(\d{1,3})\/(.{3,100})$/);if(!m)return out('INVALID DISCOUNT - EXAMPLE DO10/SERVICE RECOVERY (REASON REQUIRED)','e');var pct=+m[1],reason=m[2].trim(),b=T.cur;if(pct>100||reason.length<3)return out('DISCOUNT MUST BE 0 TO 100 PERCENT WITH A REASON','e');if(!b||!b.held||b.cancelled)return out('RETRIEVE A HELD CASH BOOKING FIRST','e');if(b.award)return out('FARE OVERRIDE NOT AVAILABLE FOR AWARD BOOKINGS','e');if(!Array.isArray(b.dirPrices)||b.dirPrices.length!==b.dirs.length)return out('FARE BREAKDOWN UNAVAILABLE - MANUAL REVIEW REQUIRED','e');var base=b.discount&&b.discount.base?b.discount.base:b.dirPrices.map(function(p){return {fare:p.fare,tax:p.tax,chg:p.chg,total:p.total}});b.dirPrices=base.map(function(p){var fare=Math.round(p.fare*(100-pct)/100/1000)*1000,tax=p.fare?Math.round(p.tax*fare/p.fare/1000)*1000:0;return {fare:fare,tax:tax,chg:p.chg,total:fare+tax+p.chg}});['fare','tax','chg','total'].forEach(function(k){b[k]=b.dirPrices.reduce(function(n,p){return n+p[k]},0)});b.discount=pct?{percent:pct,reason:reason,base:base}:null;T.fp=null;(b.hist=b.hist||[]).push({at:Date.now(),t:'SIMULATED FARE OVERRIDE '+pct+'% REASON '+reason+' TOTAL ¤ '+amt(b.total)});store.set(C.KEY,BKS);out('OK  FARE OVERRIDE '+pct+'% - '+reason+'\nTOTAL ¤ '+amt(b.total)+'  TAX RECALCULATED; AIRPORT CHARGES UNCHANGED\nFXX DISPLAYS THE REVISED TOTAL; PAYMENT MUST BE RE-ENTERED','ok')}
function fxx(){if(T.cur&&T.cur.award)return out(awardText(T.cur),'');if(T.cur){var b=T.cur,L=['FXX  '+b.ref+'   PRICED AT BOOKING','PAX  '+b.pax.a+' ADT'+(b.pax.c?'  '+b.pax.c+' CHD':'')+(b.pax.i?'  '+b.pax.i+' INF':'')];
  if(b.dirs.length>1){var tq=(b.q&&b.q.type)||'multi';L.push('TRIP TYPE  '+({ret:'ROUND TRIP',oj:'OPEN JAW',circle:'CIRCLE TRIP'}[tq]||'MULTI-CITY'))}
  b.dirs.forEach(function(d,i){var dp=b.dirPrices&&b.dirPrices[i];L.push(lpad(i+1,2)+'  '+pad(d.legs.map(function(g){return fn(g.id)}).join('/'),14)+classOf(b,i)+'   '+pad((b.fams[i]||b.fams[0]).toUpperCase(),20)+lpad(dp?amt(dp.total):'',12))});
  if(b.discount)L.push((b.discount.reissued?'ORIGINAL FARE OVERRIDE ':'FARE OVERRIDE ')+b.discount.percent+'%  REASON '+b.discount.reason+(b.discount.reissued?' (NEW FLIGHT PRICED WITHOUT OVERRIDE)':''));L.push('FARE        '+lpad(amt(b.fare),12),'PPN         '+lpad(amt(b.tax),12),'AIRPORT CHG '+lpad(amt(b.chg),12),'TOTAL ¤   '+lpad(amt(b.total),12));var fx=C.localEstimate(b.dirs[0].legs[0].from,b.total);if(fx)L.push(fx.toUpperCase());return out(L.join('\n'),'')}
 var B=build();if(!B)return out('NO ITINERARY - SELL A FLIGHT WITH SS FIRST','e');var q=B.q,S=B.sum,L=['FXX','PAX  '+q.a+' ADT'+(q.c?'  '+q.c+' CHD':'')+(q.i?'  '+q.i+' INF':'')+(B.assumed?'   (NO NAMES YET - ASSUMING 1 ADT)':'')];
 L.push(' LN FLIGHT        CL FARE                     AMOUNT');B.sel.forEach(function(s,i){var pr=W.priceFor(s.it,s.fam,q);L.push(lpad(i+1,3)+' '+pad(s.it.legs.map(function(g){return fn(g.id)}).join('/'),14)+pad(T.p.segs[i].cls,3)+pad(s.fam.n.toUpperCase(),22)+lpad(amt(pr.total),12))});
 L.push('FARE        '+lpad(amt(S.fare),12),'PPN         '+lpad(amt(S.tax),12),'AIRPORT CHG '+lpad(amt(S.chg),12),'TOTAL ¤   '+lpad(amt(S.total),12));
 if(B.sel.length>1)L.push('TRIP TYPE  '+C.P.tripName[B.tt].toUpperCase()+(B.tt==='multi'?' - EACH ITINERARY PRICED AS A ONE-WAY, NO DISCOUNT':''));if(B.tt==='ret'||B.tt==='oj'||B.tt==='circle')W.rtDetail(q,B.sel[0].it).parts.forEach(function(x){L.push(x[0].toUpperCase()+'  '+(x[1]>0?'+':'-')+Math.round(Math.abs(x[1])*100)+'%')});
 var fx=C.localEstimate(q.from,S.total);if(fx)L.push(fx.toUpperCase());var sn=T.p.segs[0].n,ps=q.a+q.c;if(!B.assumed&&sn!==ps)L.push('WARNING  '+sn+' SEAT(S) SOLD BUT '+ps+' PASSENGER(S) NEED A SEAT');
 if(T.p.segs[0].award){var A=awardSegs(T.p.segs,q);L.push('AWARD   '+(T.p.member?T.p.member.name+'  '+T.p.member.id:'NO MEMBER YET - ENTER AM<MEMBERSHIP NUMBER>'));A.dirs.forEach(function(d,i){L.push(lpad(i+1,3)+' '+pad(T.p.segs[i].it.legs.map(function(g){return fn(g.id)}).join('/'),14)+pad(d.k,3)+pad(d.level.toUpperCase(),22)+lpad(milesTxt(d.miles),12)+' MILES')});L.push('MILES TOTAL '+lpad(milesTxt(A.miles),12)+(T.p.member?'   BALANCE '+milesTxt(W.memberBalance(T.p.member.id)):''),'THERE IS NO FARE OR PPN ON AN AWARD - THE CASH PART IS THE AIRPORT CHARGES')}
 out(L.join('\n'),'')}
function fqn(){var fams=[];if(T.cur)T.cur.fams.forEach(function(f){if(fams.indexOf(f)<0)fams.push(f)});else T.p.segs.forEach(function(s){if(fams.indexOf(s.fam.n)<0)fams.push(s.fam.n)});if(!fams.length)return out('NO FARE SELECTED','e');
 out(fams.map(function(f){var r=E.RULES[f];return 'FARE FAMILY '+f.toUpperCase()+'\n  CABIN BAG   '+r.bag.toUpperCase()+'\n  CHECKED BAG '+r.chk.toUpperCase()+'\n  SEAT        '+r.seat.toUpperCase()+'\n  CHANGES     '+r.chg.toUpperCase()+'\n  REFUND      '+r.ref.toUpperCase()+'\n  MILES       '+r.mil}).join('\n'),'')}

/* ---------- save, pay, ticket ---------- */
function missing(){var P=T.p,m=[];if(!P.names.length)m.push('NAME (NM)');if(!P.segs.length)m.push('ITINERARY (SS)');if(!P.phone)m.push('CONTACT (AP)');if(!P.tk)m.push('TICKETING (TK)');if(!P.rf)m.push('RECEIVED FROM (RF)');return m}
function ageAt(dn,at){var b=new Date(dn*864e5),t=new Date(at*864e5),y=t.getUTCFullYear()-b.getUTCFullYear();if(t.getUTCMonth()<b.getUTCMonth()||(t.getUTCMonth()===b.getUTCMonth()&&t.getUTCDate()<b.getUTCDate()))y--;return y}
function er(){if(T.cur){C.store.set(C.KEY,BKS);return out('BOOKING '+T.cur.ref+' IS ALREADY SAVED','sys')}
 if(T.p.segs.some(function(s){return s.it.dep<=E.nowAbs()}))return out('FLIGHT HAS DEPARTED - SELL ANOTHER FLIGHT','e');var m=missing();if(m.length)return out('INCOMPLETE - NEED  '+m.join(', '),'e');var B=build(),q=B.q,P=T.p,last=legDay(P.segs[P.segs.length-1].it.legs[0]);
 if(P.segs[0].n!==q.a+q.c)return out('SEATS SOLD ('+P.segs[0].n+') DO NOT MATCH PASSENGERS NEEDING A SEAT ('+(q.a+q.c)+') - XE THE SEGMENTS AND SELL AGAIN','e');
 for(var i=0;i<P.names.length;i++){var n=P.names[i];if(n.t==='c'){var a=ageAt(n.dn,last);if(a<2||a>11)return out(nm(n)+' IS '+a+' ON THE LAST TRAVEL DATE - A CHILD IS 2 TO 11','e')}if(n.t==='i'){if(ageAt(n.dn,last)>=2)return out(nm(n)+' WILL BE 2 OR OVER - NOT AN INFANT','e')}}
 if(P.tk.ms>endOfDay(legDay(P.segs[0].it.legs[0])))return out('TIME LIMIT IS AFTER THE FIRST DEPARTURE','e');
 for(var s=0;s<P.segs.length;s++){var rw=classRow(P.segs[s].it,true).find(function(x){return x.k===P.segs[s].cls});if(!rw||rw.left<P.segs[0].n)return out('CLASS '+P.segs[s].cls+' IS NO LONGER AVAILABLE ON SEGMENT '+(s+1)+' - REBOOK WITH RB OR SELL AGAIN','e')}
 var aw=P.segs.some(function(x){return x.award}),A=null;if(aw){if(!P.segs.every(function(x){return x.award}))return out('AWARD AND CASH CLASSES CANNOT BE MIXED IN ONE BOOKING','e');if(!P.member)return out('AWARD BOOKING NEEDS A MEMBER - ENTER AM<MEMBERSHIP NUMBER> OR SRFQTV-<NUMBER>/P1','e');if(!P.names.some(function(x){return W.memberMatches(P.member,x.first,x.last)}))return out('MEMBER NAME DOES NOT MATCH ANY PASSENGER  ('+P.member.name+')','e');A=awardSegs(P.segs,q);var bal=W.memberBalance(P.member.id);if(bal<A.miles)return out('INSUFFICIENT MILES  NEED '+milesTxt(A.miles)+'  BALANCE '+milesTxt(bal)+'  '+P.member.name,'e')}
 var names=P.names.map(function(x){return (x.first+' '+x.last).replace(/\s+/g,' ')}),adults=[];P.names.forEach(function(x,i){if(x.t==='a')adults.push(i)});var used={};
 var bk=W.mkBooking(q,B.sel.map(function(s){return s.it}),P.segs.map(function(s){return {cab:s.cab,fam:s.fam}}),names);
 bk.passengers=P.names.map(function(x,i){var lap=null;if(x.t==='i'){for(var k=0;k<adults.length;k++)if(!used[adults[k]]){used[adults[k]]=1;lap=names[adults[k]];break}}return {type:x.t,name:names[i],first:x.first,last:x.last,title:x.title||'',dob:x.dob||null,lapAdult:lap}});
 bk.classes=P.segs.map(function(x){return x.cls});bk.extras=P.extras.map(function(x){return {k:x.k,code:x.code||'',text:x.text||'',p:x.nameRef?P.names.indexOf(x.nameRef):null,d:x.segRef?P.segs.indexOf(x.segRef):null,l:x.leg==null?null:x.leg}});bk.contactPhone=P.phone;bk.contactEmail=P.email;bk.place=C.COUNTER;bk.rf=P.rf;bk.held=true;bk.tl=P.tk.ms;bk.dirPrices=B.sel.map(function(s){return W.priceFor(s.it,s.fam,q)});bk.savedMs=Date.now();bk.hist=[{at:Date.now(),t:'BOOKING CREATED RF '+P.rf.toUpperCase()+', SEATS HELD, TL '+tl(P.tk.ms)}];
 if(aw)bk.award={memberId:P.member.id,member:P.member.name,dirs:A.dirs.map(function(d){return {k:d.k,level:d.level,miles:d.miles}}),miles:A.miles,cash:bk.total,issued:false,ledger:[]};
 B.sel.forEach(function(s,i){s.it.legs.forEach(function(l){W.adjustSold(l,P.segs[i].cab,P.segs[0].n)})});C.P.clear();
 E.S.bookings.unshift(bk);BKS.unshift(bk);store.set(C.KEY,BKS);W.awardReset();T.cur=bk;T.p=fresh();
 out('OK  BOOKING SAVED   RECORD LOCATOR '+bk.ref+'\nSEATS HELD UNTIL '+tl(bk.tl)+'.  ISSUE THE TICKETS WITH FP<METHOD> THEN TTP.'+(bk.award?'\nAWARD  '+milesTxt(bk.award.miles)+' MILES FOR '+bk.award.member+', DEBITED AT TICKETING.  CASH ¤ '+amt(bk.total):'')+'\n'+bookingText(bk),'ok')}
/* ---------- award redemption (GarudaMiles, simulated) ---------- */
function milesTxt(n){return Number(n).toLocaleString('en-US')}
function awardSegs(segs,q){var dirs=segs.map(function(s){return {k:s.cls,level:s.award.level,cab:s.cab,miles:W.awardPartyMiles(s.it,s.cab,s.award.level,q)}});return {dirs:dirs,miles:dirs.reduce(function(a,d){return a+d.miles},0)}}
function member(arg){var q=(arg||'').replace(/[\s-]/g,''),hit;
 if(!q){hit=T.p.member||(T.cur&&T.cur.award?W.memberByNumber(W.awardMember(T.cur)):null);if(!hit)return out('NO MEMBER SELECTED - ENTER AM<MEMBERSHIP NUMBER>, FOR EXAMPLE  AMGA123456789  (OR SRFQTV-GA123456789/P1)','e')}
 else{if(!/^[A-Z]{2}\d/.test(q))return out('NO NAME SEARCH - MANY MEMBERS SHARE A NAME. USE THE GARUDAMILES NUMBER, FOR EXAMPLE  AMGA123456789','e');hit=W.memberByNumber(q);if(!hit)return out('NO MEMBER  '+q+'  - CHECK THE NUMBER (GA AND 9 DIGITS)','e')}
 var act=[];BKS.forEach(function(b){if(!b.award||W.awardMember(b)!==hit.id)return;var l=b.award.ledger||(b.award.issued?[{t:'REDEEMED',miles:b.award.miles}]:[]);l.forEach(function(x){act.push('  '+pad(b.ref,8)+lpad((x.miles>0?'-':'+')+milesTxt(Math.abs(x.miles)),10)+' MILES  '+x.t)})});
 if(q&&!T.cur)T.p.member=hit;
 out('GARUDAMILES  '+hit.id+'  '+hit.name+'  '+hit.tier.toUpperCase()+'  MEMBER SINCE '+hit.since+'  (SIMULATED)\nBALANCE  '+milesTxt(W.memberBalance(hit.id))+' MILES\n'+(act.length?'ACTIVITY\n'+act.join('\n'):'NO REDEMPTIONS')+(q&&!T.cur?'\nSELECTED FOR THIS BOOKING':''),'sys')}
function awardText(b){var a=b.award,L=['AWARD  '+b.ref+'   MEMBER '+a.member+'  '+(W.awardMember(b)||'')];(a.dirs||[]).forEach(function(d,i){L.push(lpad(i+1,2)+'  '+pad(b.dirs[i].legs.map(function(g){return fn(g.id)}).join('/'),14)+d.k+'   '+pad(d.level.toUpperCase(),11)+lpad(milesTxt(d.miles),9)+' MILES')});
 L.push('MILES      '+milesTxt(a.miles)+'   '+(a.issued?'DEBITED '+milesTxt(W.awardNet(b)):'DEBITED AT TICKETING'),'CASH TAXES AND CHARGES  ¤ '+amt(b.total),'MEMBER BALANCE  '+milesTxt(W.memberBalance(W.awardMember(b)))+' MILES');return L.join('\n')}
function et(){var b=T.cur;if(b&&T.ri&&T.ri.ref===b.ref)return reissue();if(!b){return out(T.p.segs.length?'SAVE THE BOOKING WITH ER FIRST':'NO BOOKING - RETRIEVE ONE WITH RT','e')}
 if(b.cancelled)return out('BOOKING IS CANCELLED','e');if(!b.held)return out('ALREADY TICKETED','e');if(b.dirs.some(function(d){return d.legs[0].dep<=E.nowAbs()}))return out('FLIGHT HAS DEPARTED - CHANGE THE BOOKING BEFORE TICKETING','e');if(b.award&&W.memberBalance(W.awardMember(b))<b.award.miles)return out('INSUFFICIENT MILES  NEED '+milesTxt(b.award.miles)+'  BALANCE '+milesTxt(W.memberBalance(W.awardMember(b)))+'  '+b.award.member,'e');if(!T.fp)return out('NEED FORM OF PAYMENT - FPCASH FPCC FPDC FPQRIS FPTRF','e');
 var method=FPS[T.fp.k],due=b.total,tend=T.fp.k==='CASH'?(T.fp.amount||due):due;if(tend<due)return out('AMOUNT SHORT BY ¤ '+amt(due-tend),'e');if(b.award){b.award.issued=true;b.award.ledger=[{t:'REDEEMED',miles:b.award.miles,at:Date.now()}]}
 b.held=false;b.tl=null;b.paid0=b.total;b.paid=b.total;b.confirmedAt=E.nowAbs();b.issuedMs=Date.now();b.paymentMethod=method;b.payment={method:method,tendered:tend,change:tend-b.total,approval:T.fp.k==='CASH'?'':String(100000+E.hash(b.ref+'AP')%900000)};
 C.issueTickets(b);(b.hist=b.hist||[]).push({at:Date.now(),t:'TICKETED, '+method.toUpperCase()+' ¤ '+amt(b.total)});store.set(C.KEY,BKS);W.awardReset();T.fp=null;
 out('OK  TICKETS ISSUED\n'+(b.award?'AWARD  '+milesTxt(b.award.miles)+' MILES FROM '+b.award.member+' + CASH TAXES AND CHARGES.  BALANCE '+milesTxt(W.memberBalance(W.awardMember(b)))+'\n':'')+b.names.map(function(x,i){return '  '+C.ticketNo(b,i)+'  '+pn(b,i)}).join('\n')+'\nTOTAL ¤ '+amt(b.total)+'  '+method.toUpperCase()+(b.payment.approval?'  APPROVAL '+b.payment.approval:'')+(b.payment.change>0?'  CHANGE ¤ '+amt(b.payment.change):'')+'\nTWD DISPLAYS TICKET RECORD  |  EP PRINTS CUSTOMER RECEIPT','ok')}
function reissue(){var b=T.cur,r=T.ri;if(r.collect>0&&!T.fp)return out('NEED FORM OF PAYMENT - FPCASH FPCC FPDC FPQRIS FPTRF','e');
 var method=r.collect>0?FPS[T.fp.k]:'',tend=r.collect>0?(T.fp.k==='CASH'?(T.fp.amount||r.collect):r.collect):0;if(tend<r.collect)return out('AMOUNT SHORT BY ¤ '+amt(r.collect-tend),'e');
 var cc=W.fares(r.it).find(function(x){return x.k===r.row.cab.k}),rw=classRow(r.it,true).find(function(x){return x.k===r.k}),n=b.pax.a+b.pax.c;if(!rw||rw.left<n)return out('CLASS '+r.k+' IS NO LONGER AVAILABLE - REPEAT THE RB ENTRY','e');
 if(r.award&&W.memberBalance(W.awardMember(b))<r.award.due)return out('INSUFFICIENT MILES  NEED '+milesTxt(r.award.due)+'  BALANCE '+milesTxt(W.memberBalance(W.awardMember(b))),'e');
 if(C.directionState(b,r.di)!=='OPEN')return out('COUPONS NO LONGER OPEN - REISSUE REQUIRES REVIEW','e');var prior=C.ensureTickets(b);var oldFlt=b.dirs[r.di].legs.map(function(l){return l.id}).join('/');var oldSnap={di:r.di,cls:r.old,fam:b.fams[r.di]||b.fams[0],legs:b.dirs[r.di].legs.map(function(l){return {id:l.id,from:l.from,to:l.to,dep:l.dep,arr:l.arr,ac:l.ac,term:l.term}})},prevNos=prior.map(function(t){return t.number});applyChange(b,r.di,r.it,rw,famAt(rw),W.priceFor(r.it,famAt(rw),r.q),r.q,r.k);
 if(b.discount){b.discount.reissued=true;(b.hist=b.hist||[]).push({at:Date.now(),t:'NEW FLIGHT PRICED WITHOUT ORIGINAL FARE OVERRIDE; UNCHANGED DIRECTIONS RETAIN ORIGINAL PRICES'})}
 if(r.award){b.award.dirs[r.di]=r.award.newDir;b.award.miles=b.award.dirs.reduce(function(a,d){return a+d.miles},0);b.award.cash=b.total;b.award.ledger=b.award.ledger||[{t:'REDEEMED',miles:0}];if(r.award.due)b.award.ledger.push({t:'CHANGED '+r.old+' TO '+r.k,miles:r.award.due,at:Date.now()})}
 prior.forEach(function(t){t.coupons.forEach(function(c){if(C.couponStatus(c)==='OPEN')c.status='EXCHANGED'})});(b.ticketHistory=b.ticketHistory||[]).push.apply(b.ticketHistory,prior);b.paid=(b.paid||b.paid0||0)+r.collect;b.tv=(b.tv||0)+1;C.issueTickets(b,prior);(b.reissues=b.reissues||[]).push({at:Date.now(),collected:r.collect,fee:r.fee,diff:r.diff,method:method,old:oldSnap,prev:prevNos,milesDue:r.award?r.award.due:0,note:oldFlt+' '+r.old+' TO '+r.it.legs.map(function(l){return l.id}).join('/')+' '+r.k});
 (b.hist=b.hist||[]).push({at:Date.now(),t:'REISSUED '+oldFlt+' '+r.old+' TO '+r.it.legs.map(function(l){return l.id}).join('/')+' '+r.k+', COLLECTED '+amt(r.collect)+(method?' '+method.toUpperCase():'')});store.set(C.KEY,BKS);W.awardReset();T.ri=null;T.fp=null;
 out('OK  REISSUED'+(r.award?'   MILES DEBITED '+milesTxt(r.award.due)+'  BALANCE '+milesTxt(W.memberBalance(W.awardMember(b))):'')+(r.collect?'   COLLECTED ¤ '+amt(r.collect)+'  '+method.toUpperCase()+(T.fp?'':''):'   NOTHING TO COLLECT')+'\nNEW TICKETS\n'+b.names.map(function(x,i){return '  '+C.ticketNo(b,i)+'  '+pn(b,i)}).join('\n')+'\nEP PRINTS THE NEW E-TICKET','ok')}
function recordText(b){var ts=C.ensureTickets(b),history=b.ticketHistory||[],lines=['E-TICKET COUPONS  '+b.ref+'  -  SIMULATED AGENT RECORD','OFFICE '+OFFICE+'   BOOKING '+b.ref+'   '+C.statusOf(b)[0].toUpperCase(),''];
 function show(t,kind){var dt=t.issuedAt?new Date(t.issuedAt).toISOString().slice(0,10):'NOT RECORDED';lines.push(kind+' TICKET  '+t.number+'   P'+(t.passenger+1)+' '+pn(b,t.passenger),'ISSUED '+dt+' UTC','CPN FLIGHT    DATE    ROUTE  DEP   STATUS');t.coupons.forEach(function(c,i){var status=C.couponStatus(c);lines.push(lpad(i+1,3)+' '+pad(fn(c.flight),9)+' '+pad(ddmony(W.lp(c.dep,c.from).day),7)+' '+c.from+c.to+' '+t4(c.dep,c.from)+'  '+status+(status==='FLOWN'&&c.status==='OPEN'?' (INFERRED)':''))});if(!t.coupons.length)lines.push('  NO COUPONS ON THIS RECORD');lines.push('')}
 ts.forEach(function(t){show(t,'CURRENT')});history.forEach(function(t){show(t,'PREVIOUS')});
 lines.push('BOOKING FINANCIAL SUMMARY - ALL PASSENGERS');if(b.award&&b.award.issued)lines.push('AWARD      '+milesTxt(W.awardNet(b))+' MILES  MEMBER '+b.award.member,'CASH TAXES AND CHARGES ¤ '+amt(b.total));else lines.push('FARE       ¤ '+amt(b.fare),'PPN        ¤ '+amt(b.tax),'AIRPORT CHG ¤ '+amt(b.chg),'BOOKING TOTAL ¤ '+amt(b.total));if(b.discount)lines.push((b.discount.reissued?'ORIGINAL FARE OVERRIDE ':'FARE OVERRIDE ')+b.discount.percent+'%  REASON '+b.discount.reason+(b.discount.reissued?' (NEW FLIGHT PRICED WITHOUT OVERRIDE)':''));lines.push('FORM OF PAYMENT  '+String(b.paymentMethod||'NOT RECORDED').toUpperCase());if(b.reissues&&b.reissues.length)lines.push('TOTAL COLLECTED ¤ '+amt(b.paid||0),'REISSUES  '+b.reissues.length+' - TOTALS ARE CURRENT BOOKING VALUES');lines.push('','SIMULATED RECORD - NOT VALID FOR TRAVEL','FLOWN STATUS MAY BE INFERRED FROM ARRIVAL TIME');return lines.join('\n')}
function ticketDisplay(){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');if(b.held)return out('NO TICKET ISSUED','e');if(!C.ensureTickets(b).length)return out('NO TICKET RECORD AVAILABLE','e');out(recordText(b)+'\nTWP PRINTS AGENT COPY  |  EP PRINTS CUSTOMER RECEIPT','sys')}
function printRecord(){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');if(b.held||!C.ensureTickets(b).length)return out('NO TICKET ISSUED','e');var pane=$('agent-print-record'),ip0=$('agent-print-itin');if(ip0)ip0.innerHTML='';pane.textContent=recordText(b);try{window.print();out('AGENT RECORD SENT TO PRINT - SIMULATED','sys')}catch(e){out('PRINT UNAVAILABLE - USE BROWSER PRINT','e')}}
function ep(){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');if(b.held)return out('NOT TICKETED - USE FP AND TTP FIRST','e');if(b.cancelled&&b.cancelled.held)return out('BOOKING WAS CANCELLED BEFORE TICKETING - NOTHING TO PRINT','e');C.printTicket(b.ref);out(b.cancelled?'REFUND RECEIPT SENT TO THE PRINTER':'E-TICKET SENT TO THE PRINTER','sys')}

/* ---------- retrieve, cancel, queues, history ---------- */
function rt(c){var m;if(c==='RT')return showCurrent();
 if(m=c.match(/^RT(\d{1,2})$/)){if(!T.list)return out('NO LIST TO PICK FROM','e');var b=T.list[+m[1]-1];if(!b)return out('NO SUCH LINE','e');return load(b)}
 m=c.match(/^RT(.+)$/)[1];var b2=BKS.find(function(x){return x.ref===m});if(b2)return load(b2);
 var g=/^[0-9A-Z]{7}$/.test(m)&&W.GA_DEMAND&&W.GA_DEMAND.retrieve(m);if(g){if(!T.cur&&(T.p.segs.length||T.p.names.length||T.p.phone||T.p.email||T.p.tk||T.p.rf||T.p.extras.length))return out('UNSAVED BOOKING IN PROGRESS - SAVE WITH ER OR DISCARD WITH IG BEFORE RETRIEVING','e');E.S.bookings.unshift(g);BKS.unshift(g);store.set(C.KEY,BKS);return load(g)}
 var up=m,hits=BKS.filter(function(x){return x.names.some(function(n){return n.toUpperCase().replace(/\s+/g,'').indexOf(up)>=0})});if(!hits.length)return out('NO BOOKING FOUND  '+m,'e');if(hits.length===1)return load(hits[0]);
 T.list=hits;out(hits.map(function(x,i){return lpad(i+1,3)+'  '+x.ref+'  '+pad(pn(x,0)+(x.names.length>1?' +'+(x.names.length-1):''),22)+pad(x.dirs[0].legs[0].from+x.dirs[0].legs[x.dirs[0].legs.length-1].to,8)+C.statusOf(x)[0].toUpperCase()}).join('\n')+'\nSELECT WITH RT<LINE>','')}
function load(b){if(!T.cur&&(T.p.segs.length||T.p.names.length||T.p.phone||T.p.email||T.p.tk||T.p.rf||T.p.extras.length))return out('UNSAVED BOOKING IN PROGRESS - SAVE WITH ER OR DISCARD WITH IG BEFORE RETRIEVING','e');T.cur=b;T.p=fresh();T.fp=null;T.xi=null;T.ri=null;out(bookingText(b),'')}
function buildLeg(l){var row=12+E.hash(l.id+l.dep)%20,col=E.hash(l.id+'c'+l.dep)%5;return Object.assign({},l,{gate:(l.term==='T2'?'K':'C')+(2+E.hash(l.id)%10),row:row,col:col,status:'ok',delay:0,rebooked:null})}
function chgRule(b,di){var r=(E.RULES[b.fams[di]||b.fams[0]]||{}).chg||'';return /^Not allowed/i.test(r)?{no:true,text:r}:/IDR\s*([\d,]+)\s*fee/i.test(r)?{fee:GA_CUR.snap(+r.match(/IDR\s*([\d,]+)/)[1].replace(/,/g,''),GA_CUR.ofBooking(b)),text:GA_CUR.text(r,GA_CUR.ofBooking(b))}:{fee:0,text:r||'Free'}}
function seqOk(spans,i,dep,arr){for(var k=0;k<spans.length;k++){if(k<i&&spans[k][1]>dep)return false;if(k>i&&spans[k][0]<arr)return false}return true}
function rb(c){var m=c.match(/^RB([A-Z])(\d{1,2})(?:\/(\d{1,2}))?$/);if(!m)return out('INVALID FORMAT - RBT3 (REBOOK ELEMENT 3 INTO CLASS T)  OR  RBT3/2 (ONTO LINE 2 OF THE LAST AN)','e');var k=m[1],n=+m[2],ln=m[3]?+m[3]:null;
 if(ORDER.indexOf(k)<0)return out('UNKNOWN CLASS '+k,'e');
 var newIt=null;if(ln){if(!T.av)return out('NO AVAILABILITY DISPLAYED - USE AN FIRST','e');newIt=T.av.its[ln-1];if(!newIt)return out('NO SUCH LINE '+ln,'e')}
 var b=T.cur,di,old,spans,seatsN;if(b)GA_CUR.relock(b);
 if(!b){var e=elems()[n-1];if(!e||e.k!=='seg')return out('ELEMENT '+n+' IS NOT A FLIGHT SEGMENT','e');di=e.i;var sg=T.p.segs[di];old={it:sg.it,cls:sg.cls};seatsN=sg.n;spans=T.p.segs.map(function(x){return [x.it.dep,x.it.arr]})}
 else{if(b.held&&b.discount)return out('REMOVE FARE OVERRIDE WITH DO0/REASON BEFORE CHANGING THE HELD BOOKING','e');if(b.cancelled)return out('BOOKING IS CANCELLED','e');var idx=n-1-b.names.length,li=0;di=-1;for(var d=0;d<b.dirs.length;d++){if(idx>=0&&idx<li+b.dirs[d].legs.length){di=d;break}li+=b.dirs[d].legs.length}if(di<0)return out('ELEMENT '+n+' IS NOT A FLIGHT SEGMENT','e');
  if(!b.held&&C.directionState(b,di)!=='OPEN')return out('COUPONS ARE FLOWN OR PARTLY USED - MANUAL REVIEW REQUIRED','e');var dir=b.dirs[di],f0=dir.legs[0],key=dir.legs.map(function(l){return l.id+'|'+l.dep}).join('>'),cur=W.search(f0.from,dir.legs[dir.legs.length-1].to,legDay(f0)).find(function(x){return x.key===key});
  old={it:cur||{legs:dir.legs,key:key,stops:dir.legs.length-1,dep:f0.dep,arr:dir.legs[dir.legs.length-1].arr},cls:classOf(b,di)};seatsN=b.pax.a+b.pax.c;spans=b.dirs.map(function(x){return [x.legs[0].dep,x.legs[x.legs.length-1].arr]})}
 var target=newIt||old.it,sameFlight=target.key===old.it.key;if(target.dep<=E.nowAbs())return out('FLIGHT HAS DEPARTED - CHOOSE ANOTHER FLIGHT','e');
 if(!sameFlight){var o0=old.it.legs[0].from,d0=old.it.legs[old.it.legs.length-1].to;if(target.legs[0].from!==o0||target.legs[target.legs.length-1].to!==d0)return out('THE NEW FLIGHT MUST GO '+o0+' TO '+d0,'e');if(!seqOk(spans,di,target.dep,target.arr))return out('SEGMENTS OUT OF SEQUENCE','e')}
 else if(old.cls===k)return out('ALREADY CLASS '+k,'e');
 var row=classRow(target,true).find(function(x){return x.k===k});if(!row)return out('CLASS '+k+' NOT OFFERED ON THIS FLIGHT','e');var isAw=b?!!b.award:!!T.p.segs[di].award;if(!!row.award!==isAw)return out(isAw?'AN AWARD CAN ONLY BE REBOOKED INTO AN AWARD CLASS (X U R V O A) - SEE AW':'A CASH BOOKING CANNOT BE REBOOKED INTO AN AWARD CLASS','e');if(row.left<seatsN)return out(row.left?'ONLY '+row.left+' SEAT'+(row.left>1?'S':'')+' IN CLASS '+k:'CLASS '+k+' CLOSED','e');
 var fam=famAt(row);
 if(!b){var s0=T.p.segs[di];s0.it=target;s0.cls=k;s0.cab=row.cab.k;s0.fam=fam;s0.award=row.award?{level:row.award.level,miles:row.award.miles}:null;return out('OK  REBOOKED '+old.cls+' TO '+k+(sameFlight?'':' ON '+target.legs.map(function(l){return fn(l.id)}).join('/'))+'\n'+segLines(s0,T.p.names.length+T.p.segs.slice(0,di).reduce(function(a,x){return a+x.it.legs.length},0)).join('\n')+'\nFXX SHOWS THE NEW PRICE','ok')}
 if(b.ticketedNo===undefined){}
 var q=Object.assign({},b.q),pr0=null;var spanQ=function(){q.d1=legDay(di===0?target.legs[0]:b.dirs[0].legs[0]);if(b.dirs.length>1)q.d2=legDay(di===1?target.legs[0]:b.dirs[1].legs[0])};spanQ();
 var pr=W.priceFor(target,fam,q),oldPr=(b.dirPrices&&b.dirPrices[di])||{total:b.total/b.dirs.length};
 if(b.award){var AC=W.GA_PRICING.cfg.award,od=(b.award.dirs||[])[di]||{level:'Saver',miles:b.award.miles},nm=W.awardPartyMiles(target,row.cab.k,row.award.level,q),newDir={k:k,level:row.award.level,cab:row.cab.k,miles:nm},bal=W.memberBalance(W.awardMember(b)),total2=b.award.miles-od.miles+nm;
  if(b.held){if(total2>bal)return out('INSUFFICIENT MILES  NEED '+milesTxt(total2)+'  BALANCE '+milesTxt(bal),'e');if(T.dry){T.plan={held:true,award:{oldMiles:od.miles,newMiles:nm,total:total2,balance:bal},old:old.cls,k:k,target:target,oldTotal:b.total,newTotal:b.total};return out('DRY','sys')}applyChange(b,di,target,row,fam,pr,q,k);b.award.dirs[di]=newDir;b.award.miles=total2;b.award.cash=b.total;(b.hist=b.hist||[]).push({at:Date.now(),t:'REBOOKED '+old.cls+' TO '+k+(sameFlight?'':' ON '+target.legs.map(function(l){return l.id}).join('/'))+', MILES '+milesTxt(total2)});store.set(C.KEY,BKS);W.awardReset();
   return out('OK  REBOOKED '+old.cls+' TO '+k+(sameFlight?'':' ON '+target.legs.map(function(l){return fn(l.id)}).join('/'))+'   MILES '+milesTxt(total2)+'\n'+bookingText(b),'ok')}
  if(!sameFlight||true){var feeM=Math.round(od.miles*(od.level==='Advantage'?AC.changeFeeAdv:AC.changeFeeSaver)/100)*100,diffM=Math.max(0,nm-od.miles),due=feeM+diffM,cashDiff=Math.max(0,pr.total-oldPr.total);
   if(due>bal)return out('INSUFFICIENT MILES  NEED '+milesTxt(due)+' TO CHANGE  BALANCE '+milesTxt(bal),'e');
   T.ri={ref:b.ref,di:di,it:target,row:row,fam:fam,pr:pr,q:q,k:k,fee:0,diff:cashDiff,collect:cashDiff,oldPr:oldPr,old:old.cls,award:{newDir:newDir,feeM:feeM,diffM:diffM,due:due}};
   return out('AWARD REISSUE QUOTE  '+b.ref+'  '+b.award.member+'\n  OLD  '+old.it.legs.map(function(l){return fn(l.id)}).join('/')+'  '+old.cls+'  '+pad(od.level.toUpperCase(),10)+lpad(milesTxt(od.miles),9)+' MILES\n  NEW  '+target.legs.map(function(l){return fn(l.id)}).join('/')+'  '+k+'  '+pad(row.award.level.toUpperCase(),10)+lpad(milesTxt(nm),9)+' MILES\n  MILES DIFFERENCE'+lpad(milesTxt(diffM),14)+(nm<od.miles?'   (FEWER MILES ARE NOT RETURNED)':'')+'\n  CHANGE FEE '+(od.level==='Advantage'?Math.round(AC.changeFeeAdv*100):Math.round(AC.changeFeeSaver*100))+'%'+lpad(milesTxt(feeM),19)+' MILES\n  TOTAL MILES TO DEBIT '+milesTxt(due)+'   BALANCE '+milesTxt(bal)+'\n  CASH TO COLLECT ¤ '+amt(cashDiff)+'\n'+(cashDiff?'ENTER FP<METHOD> THEN TTP TO REISSUE':'ENTER TTP TO REISSUE'),'sys')}}
 if(b.held){if(T.dry){T.plan={held:true,old:old.cls,k:k,target:target,oldTotal:b.total,newTotal:oldTotalOf(b,oldPr,pr)};return out('DRY','sys')}applyChange(b,di,target,row,fam,pr,q,k);var was=b.total;(b.hist=b.hist||[]).push({at:Date.now(),t:'REBOOKED '+old.cls+' TO '+k+(sameFlight?'':' ON '+target.legs.map(function(l){return l.id}).join('/'))+', TOTAL '+amt(oldTotalOf(b,oldPr,pr))+' TO '+amt(b.total)});store.set(C.KEY,BKS);
  return out('OK  REBOOKED '+old.cls+' TO '+k+(sameFlight?'':' ON '+target.legs.map(function(l){return fn(l.id)}).join('/'))+'   TOTAL ¤ '+amt(oldTotalOf(b,oldPr,pr))+' TO '+amt(b.total)+'\n'+bookingText(b),'ok')}
 /* ticketed: a reissue quote, collected with FP and ET */
 var rule=chgRule(b,di);if(rule.no)return out('FARE RULE: CHANGES NOT ALLOWED ('+(b.fams[di]||b.fams[0]).toUpperCase()+').  USE XI TO CANCEL INSTEAD','e');
 var diff=Math.max(0,pr.total-oldPr.total),fee=rule.fee*seatsN,collect=diff+fee;
 T.ri={ref:b.ref,di:di,it:target,row:row,fam:fam,pr:pr,q:q,k:k,fee:fee,diff:diff,collect:collect,oldPr:oldPr,old:old.cls};
 out('REISSUE QUOTE  '+b.ref+'\n  OLD  '+old.it.legs.map(function(l){return fn(l.id)}).join('/')+'  '+old.cls+'  '+(b.fams[di]||'').toUpperCase()+'   ¤ '+lpad(amt(oldPr.total),11)+'\n  NEW  '+target.legs.map(function(l){return fn(l.id)}).join('/')+'  '+k+'  '+fam.n.toUpperCase()+'   ¤ '+lpad(amt(pr.total),11)+'\n  FARE DIFFERENCE'+lpad(amt(diff),22)+(pr.total<oldPr.total?'   (A LOWER FARE IS NOT REFUNDED)':'')+'\n  CHANGE FEE '+(rule.fee?amt(rule.fee)+' X '+seatsN:'FREE')+lpad(amt(fee),(rule.fee?13:21)-0)+'   ('+rule.text.toUpperCase()+')\n  TOTAL TO COLLECT ¤ '+amt(collect)+'\n'+(collect?'ENTER FP<METHOD> THEN TTP TO REISSUE':'ENTER TTP TO REISSUE'),'sys')}
function oldTotalOf(b,oldPr,pr){return b.total-pr.total+oldPr.total}
function applyChange(b,di,it,row,fam,pr,q,k){var n=b.pax.a+b.pax.c,oldCab=(b.cabs&&b.cabs[di])||b.cab;
 b.dirs[di].legs.forEach(function(l){W.adjustSold(l,oldCab,-n)});C.P.clear();var legs=it.legs.map(buildLeg);legs.forEach(function(l){W.adjustSold(l,row.cab.k,n)});C.P.clear();
 b.dirPrices=b.dirPrices||b.dirs.map(function(d,i){return {fare:b.fare/b.dirs.length,tax:b.tax/b.dirs.length,chg:b.chg/b.dirs.length,total:b.total/b.dirs.length}});b.cabs=b.cabs||b.dirs.map(function(){return b.cab});b.classes=b.classes||b.dirs.map(function(x,i){return classOf(b,i)});
 b.dirs[di]={legs:legs};b.extras=(b.extras||[]).filter(function(x){return !(x.d===di&&x.l!=null&&x.l>=legs.length)});b.fams[di]=fam.n;b.cabs[di]=row.cab.k;if(di===0)b.cab=row.cab.k;b.classes[di]=k;b.dirPrices[di]=pr;['fare','tax','chg','total'].forEach(function(x){b[x]=b.dirPrices.reduce(function(a,y){return a+y[x]},0)});b.q=q;
 }

/* ---------- special services and remarks ---------- */
function sr(up){var m=up.match(/^SR\s*([A-Z]{4})(?:-([^\/]+))?((?:\/[PS]\d{1,2})*)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  SRVGML/P1   OR   SRVGML/P1/S3','e');
 var code=m[1],text=(m[2]||'').trim(),mods=m[3]||'',pm=mods.match(/\/P(\d{1,2})/),sm=mods.match(/\/S(\d{1,2})/),names=W.SSR_NAMES||{};
 if(!names[code])return out('UNKNOWN SERVICE '+code+' - HE LISTS THE CODES','e');
 if(code==='FQTV'){if(!pm)return out('FQTV NEEDS A PASSENGER - SRFQTV-GA123456789/P1','e');if(!/^[A-Z0-9]{8,14}$/.test(text))return out('FREQUENT FLYER NUMBER IS 8 TO 14 LETTERS AND DIGITS','e');if(/^GA\d/.test(text)&&!W.memberByNumber(text))return out('NO GARUDAMILES MEMBER  '+text+'  - CHECK THE NUMBER (GA AND 9 DIGITS)','e')}
 if(/^(MEDA|PETC)$/.test(code)&&!text)return out(code+' NEEDS A TEXT - SR'+code+'-DETAILS/P1','e');
 var saved=!!T.cur,people=saved?(T.cur.passengers||[]).map(function(p,i){return {t:p.type,key:i}}):T.p.names.map(function(x){return {t:x.t,key:x}});
 if(!people.length)return out('ADD THE PASSENGERS FIRST (NM)','e');
 var targets=people.map(function(x,i){return {x:x,n:i+1}});if(pm){var pn0=+pm[1];if(pn0<1||pn0>people.length)return out('NO PASSENGER '+pn0,'e');targets=[targets[pn0-1]]}

 var mem=code==='FQTV'?W.memberByNumber(text):null;if(mem){var pp=saved?(T.cur.passengers||[])[targets[0].n-1]:T.p.names[targets[0].n-1];if(pp&&!W.memberMatches(mem,pp.first,pp.last))return out('MEMBER NAME DOES NOT MATCH PASSENGER '+targets[0].n+'  ('+mem.name+')','e')}
 if(code==='BBML'||code==='BSCT'){targets=targets.filter(function(t){return t.x.t==='i'});if(!targets.length)return out(code+' IS FOR AN INFANT - THERE IS NONE'+(pm?' AT THAT PASSENGER NUMBER':'')+' IN THE BOOKING','e')}
 if(code==='CHML'){targets=targets.filter(function(t){return t.x.t==='c'});if(!targets.length)return out('CHML IS FOR A CHILD - THERE IS NONE'+(pm?' AT THAT PASSENGER NUMBER':'')+' IN THE BOOKING','e')}
 /* the flights to attach to */
 var legs=[];if(code==='FQTV')legs=[{}];else if(saved){var be=bookElems(T.cur).filter(function(e){return e.k==='seg'});if(sm){var e0=bookElems(T.cur).filter(function(e){return e.num})[+sm[1]-1];if(!e0||e0.k!=='seg')return out('ELEMENT '+sm[1]+' IS NOT A FLIGHT SEGMENT','e');legs=[{d:e0.d,l:e0.l}]}else legs=be.map(function(e){return {d:e.d,l:e.l}});if(!legs.length)return out('NO FLIGHTS','e')}
 else{if(!T.p.segs.length)return out('SELL A FLIGHT FIRST (SS)','e');if(sm){var e1=elems()[+sm[1]-1];if(!e1||e1.k!=='seg')return out('ELEMENT '+sm[1]+' IS NOT A FLIGHT SEGMENT','e');legs=[{seg:T.p.segs[e1.i],l:e1.leg}]}else T.p.segs.forEach(function(sg){sg.it.legs.forEach(function(l,j){legs.push({seg:sg,l:j})})})}
 var added=0;targets.forEach(function(t){legs.forEach(function(g){
  if(saved){var b=T.cur,item={k:'ssr',code:code,text:text,p:t.n-1,d:g.d==null?null:g.d,l:g.l==null?null:g.l};b.extras=b.extras||[];if(!b.extras.some(function(y){return y.k==='ssr'&&y.code===code&&y.p===item.p&&y.d===item.d&&y.l===item.l&&(code!=='FQTV'||true)})){if(code==='FQTV')b.extras=b.extras.filter(function(y){return !(y.code==='FQTV'&&y.p===item.p)});b.extras.push(item);added++}}
  else{var it2={k:'ssr',code:code,text:text,nameRef:t.x.key,segRef:g.seg||null,leg:g.l==null?null:g.l};if(!T.p.extras.some(function(y){return y.k==='ssr'&&y.code===code&&y.nameRef===it2.nameRef&&y.segRef===it2.segRef&&y.leg===it2.leg})){if(code==='FQTV')T.p.extras=T.p.extras.filter(function(y){return !(y.code==='FQTV'&&y.nameRef===it2.nameRef)});T.p.extras.push(it2);added++}}})});
 if(!added)return out('ALREADY IN THE BOOKING','e');if(saved){(T.cur.hist=T.cur.hist||[]).push({at:Date.now(),t:'SSR '+code+(text?' '+text.toUpperCase():'')+' ADDED FOR '+targets.map(function(t){return 'P'+t.n}).join(',')});store.set(C.KEY,BKS)}
 if(mem&&!saved)T.p.member=mem;
 out('OK  '+added+' ELEMENT'+(added>1?'S':'')+' ADDED  '+code+'  '+names[code].toUpperCase()+(mem?'  '+mem.name+'  '+mem.tier.toUpperCase()+(saved?'':'  SELECTED FOR AWARDS'):''))}
function rm(up){var m=up.replace(/\s+/g,' ').match(/^(RM|RC) ?(.+)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  RM CUSTOMER WILL PAY AT THE AIRPORT','e');var k=m[1]==='RM'?'rm':'rc',text=m[2].trim();
 if(T.cur){var b=T.cur;if(b.cancelled)return out('BOOKING IS CANCELLED','e');(b.extras=b.extras||[]).push({k:k,code:'',text:text,p:null,d:null,l:null});(b.hist=b.hist||[]).push({at:Date.now(),t:(k==='rm'?'REMARK':'CONFIDENTIAL REMARK')+' ADDED: '+text.toUpperCase()});store.set(C.KEY,BKS)}
 else T.p.extras.push({k:k,text:text});out('OK')}
function os(up){var m=up.replace(/\s+/g,' ').match(/^OSI? ?(?:GA ?)?(.+)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  OSGA VIP CUSTOMER','e');var text=m[1].trim();
 if(T.cur){var b=T.cur;if(b.cancelled)return out('BOOKING IS CANCELLED','e');(b.extras=b.extras||[]).push({k:'os',code:'',text:text,p:null,d:null,l:null});(b.hist=b.hist||[]).push({at:Date.now(),t:'OSI GA '+text.toUpperCase()});store.set(C.KEY,BKS)}else T.p.extras.push({k:'os',text:text});out('OK')}

/* ---------- seats ---------- */
function legOfElement(b,n){var e=bookElems(b).filter(function(x){return x.num})[n-1];return e&&e.k==='seg'?{d:e.d,l:e.l,leg:b.dirs[e.d].legs[e.l]}:null}
function oneLeg(b){var segs=bookElems(b).filter(function(e){return e.k==='seg'});return segs.length===1?{d:segs[0].d,l:segs[0].l,leg:b.dirs[segs[0].d].legs[segs[0].l]}:null}
function seatReason(b,l){if(l.status==='cancel')return 'THE FLIGHT IS CANCELLED';if(l.dep+(l.delay||0)<=E.nowAbs())return 'THE FLIGHT HAS DEPARTED';var cut=E.CT[E.farEnd(l)].z==='I'?60:45;if(l.dep+(l.delay||0)-E.nowAbs()<=cut)return 'SEAT CHANGES CLOSE '+cut+' MINUTES BEFORE DEPARTURE';
 var f=(b.fams[W.tripDirectionIndex(b,l)]||b.fams[0]);return 'FARE RULE: SEAT SELECTION IS AT CHECK-IN ONLY ('+f.toUpperCase()+')'}
/* ---------- simulated demand ---------- */
function dd(fid,dstr,cabCode){CURFORCE={code:'IDR',rate:1};try{return dd0(fid,dstr,cabCode)}finally{CURFORCE=null}}
function dd0(fid,dstr,cabCode){var dn=C.parseDate(dstr);if(dn==null)return out('INVALID DATE','e');if(!W.GA_DEMAND)return out('DEMAND MODEL NOT LOADED','e');
 var id=fid.replace(/^GA/,'GA '),l=W.GA_DEMAND.findLeg(id,dn);if(!l)return out('NO '+id+' ON '+ddmon(dn),'e');
 var cabs=W.GA_DEMAND.cabinsOf(l),want=cabCode?{Y:'Economy',W:'Premium',C:'Business'}[cabCode]:null;if(want&&cabs.indexOf(want)<0)return out('CABIN NOT ON THIS AIRCRAFT','e');
 var L=['DEMAND  '+id+'  '+l.from+'-'+l.to+'  '+ddmon(dn)+'  '+l.ac.toUpperCase()+'   SIMULATED, MODEL V'+W.GA_DEMAND.VERSION,''],rows=[],idx=W.GA_DEMAND.storeIndex();
 cabs.forEach(function(cab){if(want&&cab!==want)return;var s=W.GA_DEMAND.summary(l,cab,null,idx),pct=Math.round(s.loadFactor*1000)/10;
  L.push(cab.toUpperCase()+'   SOLD '+s.sold+'/'+s.cap+'   LF '+pct+'%   REVENUE ¤ '+amt(Math.round(s.revenue))+'   CANCELLED '+s.cancelledPax+'   CHANGED '+s.changedPax+(s.noShow||s.flown?'   NO-SHOW '+s.noShow:''));
  W.GA_DEMAND.book(l,cab,null,idx).forEach(function(b){rows.push(b)})});
 L.push('');rows.sort(function(a,b){return a.bookedAt-b.bookedAt});
 var STATE={ACTIVE:'HK',CANCELLED:'XX CXL',CHANGED:'XX CHG'};
 rows.slice(0,60).forEach(function(b,i){L.push(lpad(i+1,3)+'  '+pad(b.ref,7)+'  '+pad(b.name+(b.pax>1?' +'+(b.pax-1):''),24)+pad(b.cabin[0]+'/'+b.cls,5)+pad(b.channel.toUpperCase(),13)+pad(STATE[b.state]+(b.source==='SIM'?'':b.source==='REAL'?' *':' !'),9)+lpad(amt(b.total),12))});
 var more=rows.length-60;if(more>0)L.push('... '+more+' MORE - NARROW WITH /Y /W OR /C');
 L.push('','* REAL BOOKING   ! SIMULATED BOOKING CHANGED AT THE TERMINAL','RETRIEVE ONE WITH RT<REF>, FOR EXAMPLE  RT'+(rows[0]?rows[0].ref:''));out(L.join('\n'),'')}
function sm(c){var m=c.match(/^SM(\d{1,2})?$/);if(!m)return out('INVALID FORMAT - EXAMPLE  SM3  (SEAT MAP OF THE FLIGHT IN ELEMENT 3)','e');
 var b=T.cur;if(!b)return out(T.p.segs.length?'SAVE THE BOOKING WITH ER FIRST - SEATS ARE ASSIGNED WHEN IT IS SAVED':'NO BOOKING - RETRIEVE ONE WITH RT','e');if(b.cancelled)return out('BOOKING IS CANCELLED','e');
 var tg=m[1]?legOfElement(b,+m[1]):oneLeg(b);if(!tg)return out(m[1]?'ELEMENT '+m[1]+' IS NOT A FLIGHT SEGMENT':'SEVERAL FLIGHTS - USE SM<ELEMENT>, FOR EXAMPLE SM3','e');
 var l=tg.leg;var mod=W.seatModel(b,l),other=W.otherSeatClaims(b,l),mine={};(b.passengers||[]).forEach(function(p,i){if(p.type!=='i'&&l.seats&&l.seats[i])mine[l.seats[i]]=i+1});
 var L=['SEAT MAP  '+fn(l.id)+'  '+l.from+'-'+l.to+'  '+ddmon(legDay(l))+'  '+l.ac.toUpperCase()+'  '+mod.cabin.toUpperCase(),'','      '+mod.banks.map(function(bk){return bk.split('').join(' ')}).join('   ')];
 for(var r=0;r<mod.rows;r++){var row=r+mod.start;L.push(lpad(row,3)+'   '+mod.banks.map(function(bk){return bk.split('').map(function(ch){var seat=row+ch;return mine[seat]?String(mine[seat]):(W.seatBlocked(l,seat)||other.has(seat))?'X':'.'}).join(' ')}).join('   '))}
 L.push('','. FREE   X TAKEN   1 2 3 YOUR PASSENGERS','');(b.passengers||[]).forEach(function(p,i){L.push('  P'+(i+1)+'  '+pn(b,i)+'   '+(p.type==='i'?'INFANT ON LAP':(l.seats&&l.seats[i])||'NOT ASSIGNED'))});
 var ok=W.seatChangeAllowed(b,l);L.push(ok?'CHANGE WITH ST<SEAT>/P<N>, FOR EXAMPLE  ST12A/P1':'SEATS CANNOT BE CHANGED NOW - '+seatReason(b,l));out(L.join('\n'),'')}
function st(c){var m=c.match(/^ST\/?(\d{1,2}[A-K])\/P(\d{1,2})(?:\/S(\d{1,2}))?$/);if(!m)return out('INVALID FORMAT - EXAMPLE  ST12A/P1/S3  (SEAT 12A, PASSENGER 1, FLIGHT IN ELEMENT 3)','e');
 var b=T.cur;if(!b)return out(T.p.segs.length?'SAVE THE BOOKING WITH ER FIRST - SEATS ARE ASSIGNED WHEN IT IS SAVED':'NO BOOKING - RETRIEVE ONE WITH RT','e');if(b.cancelled)return out('BOOKING IS CANCELLED','e');
 var seat=m[1],pi=+m[2]-1,tg=m[3]?legOfElement(b,+m[3]):oneLeg(b);if(!tg)return out(m[3]?'ELEMENT '+m[3]+' IS NOT A FLIGHT SEGMENT':'SEVERAL FLIGHTS - ADD /S<ELEMENT>, FOR EXAMPLE ST12A/P1/S3','e');
 var p=(b.passengers||[])[pi];if(!p)return out('NO PASSENGER '+(pi+1),'e');if(p.type==='i')return out('AN INFANT SHARES THE ADULT SEAT','e');
 var l=tg.leg;if(!W.seatChangeAllowed(b,l))return out(seatReason(b,l),'e');var mod=W.seatModel(b,l);
 if(!mod.seats.includes(seat))return out('SEAT '+seat+' IS NOT IN THE BOOKED CABIN ('+mod.cabin.toUpperCase()+')  - SM SHOWS THE CABIN','e');
 if(W.seatBlocked(l,seat)||W.otherSeatClaims(b,l).has(seat))return out('SEAT '+seat+' IS TAKEN','e');
 var holder=Object.keys(l.seats||{}).find(function(k){return l.seats[k]===seat&&+k!==pi});if(holder!==undefined)return out('SEAT '+seat+' IS ALREADY P'+(+holder+1)+' - MOVE THAT PASSENGER FIRST','e');
 var was=l.seats&&l.seats[pi];l.seats=l.seats||{};l.seats[pi]=seat;(b.hist=b.hist||[]).push({at:Date.now(),t:'SEAT '+(was||'-')+' TO '+seat+' P'+(pi+1)+' ON '+l.id});store.set(C.KEY,BKS);
 out('OK  SEAT '+seat+'  '+pn(b,pi)+'  '+fn(l.id)+' '+ddmon(legDay(l))+(was?'   (WAS '+was+')':''),'ok')}
function xi(confirm){if(!T.cur){if(T.p.segs.length){T.p.segs=[];return out('ITINERARY CANCELLED','sys')}return out('NO BOOKING','e')}
 var b=T.cur;if(b.cancelled)return out('BOOKING IS ALREADY CANCELLED','e');
 if(!b.held&&C.refundBlocked(b))return out('PARTLY FLOWN DIRECTION - MANUAL REFUND REVIEW REQUIRED','e');if(!confirm){T.xi=b.ref;if(b.held)return out('CANCEL '+b.ref+' AND RELEASE THE SEATS.  NOTHING WAS PAID.  ENTER XIY TO CONFIRM','e');var r=C.refundRows(b);
  if(b.award&&b.award.issued){var ar=W.awardRefund(b);return out('CANCEL '+b.ref+' - AWARD REFUND  '+b.award.member+'\n  MILES ON THE FLIGHTS '+lpad(milesTxt(ar.base),9)+'   FEE KEPT '+lpad(milesTxt(ar.fee),8)+'   MILES RETURNED '+lpad(milesTxt(ar.back),9)+'\n  TAXES AND CHARGES REFUNDED ¤ '+amt(r.total)+' TO '+b.paymentMethod.toUpperCase()+'  (CHANGE FEES ALREADY PAID ARE NOT RETURNED)\nENTER XIY TO CONFIRM','e')}
  return out('CANCEL '+b.ref+' - REFUND BY FARE RULES\n'+r.rows.map(function(x){return '  '+pad(x.dir,10)+pad(x.fam.toUpperCase(),20)+' PAID '+lpad(amt(x.paid),11)+'  FEE '+lpad(amt(x.fee),10)+'  REFUND '+lpad(amt(x.refund),11)}).join('\n')+'\nREFUND TO '+b.paymentMethod.toUpperCase()+'  ¤ '+amt(r.total)+'.  ENTER XIY TO CONFIRM','e')}
 if(T.xi!==b.ref)return out('ENTER XI FIRST','e');T.xi=null;C.cancelBooking(b.ref);out('OK  BOOKING CANCELLED'+(b.cancelled.held?', SEATS RELEASED':'  REFUND ¤ '+amt(b.cancelled.refund)+' TO '+b.paymentMethod.toUpperCase()+(b.cancelled.milesBack!=null?'  MILES RETURNED '+milesTxt(b.cancelled.milesBack):''))+'\n'+bookingText(b),'ok')}
function qt(){var h=BKS.filter(function(b){return b.held&&!b.cancelled}).sort(function(a,b){return a.tl-b.tl});if(!h.length)return out('QUEUE EMPTY - NO HELD BOOKINGS','sys');
 out('HELD BOOKINGS BY TICKETING TIME LIMIT\n'+h.map(function(b,i){return lpad(i+1,3)+'  '+b.ref+'  TL '+pad(tlShort(b.tl),12)+pad(pn(b,0),20)+pad(b.dirs[0].legs[0].from+b.dirs[0].legs[b.dirs[0].legs.length-1].to,8)+GA_CUR.fmt(b.total,GA_CUR.ofBooking(b))}).join('\n')+'\nSELECT WITH RT<REF>','');T.list=h}
function rh(){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');out('HISTORY '+b.ref+'\n'+(b.hist||[]).map(function(h){var d=new Date(h.at+7*36e5);return '  '+ddmon(Math.floor(d/864e5))+' '+p2(d.getUTCHours())+p2(d.getUTCMinutes())+'  '+h.t}).join('\n'),'')}



/* ---------- change flight from the Bookings tab: the same rules as RB and the reissue, driven quietly ---------- */
var FPK={'Cash':'CASH','Credit card':'CC','Debit card':'DC','QRIS':'QRIS','Bank transfer':'TRF'};
function chgFind(ref){return BKS.find(function(x){return x.ref===ref})}
function chgBusy(){return !T.cur&&(T.p.segs.length||T.p.names.length||T.p.phone||T.p.email||T.p.tk||T.p.rf||T.p.extras.length)}
function chgWith(b,fn){var s={cur:T.cur,p:T.p,av:T.av,ri:T.ri,fp:T.fp,xi:T.xi,quiet:T.quiet,dry:T.dry,last:T.last,plan:T.plan};
 try{T.cur=b;T.p=fresh();T.fp=null;T.xi=null;T.quiet=true;T.dry=false;T.last=null;T.plan=null;return fn()}finally{T.cur=s.cur;T.p=s.p;T.av=s.av;T.ri=s.ri;T.fp=s.fp;T.xi=s.xi;T.quiet=s.quiet;T.dry=s.dry;T.last=s.last;T.plan=s.plan}}
function chgQ(b,di,target){var q=Object.assign({},b.q);q.d1=legDay(di===0?target.legs[0]:b.dirs[0].legs[0]);if(b.dirs.length>1)q.d2=legDay(di===1?target.legs[0]:b.dirs[1].legs[0]);return q}
function changeOptions(ref,di,dn){var b=chgFind(ref);if(!b||b.cancelled)return {err:'BOOKING NOT FOUND OR CANCELLED'};if(chgBusy())return {err:'FINISH OR IGNORE (IG) THE BOOKING IN PROGRESS IN THE TERMINAL FIRST'};
 var dir=b.dirs[di],o=dir.legs[0].from,d=dir.legs[dir.legs.length-1].to,seatsN=b.pax.a+b.pax.c,aw=!!b.award,cur=dir.legs.map(function(l){return l.id+'|'+l.dep}).join('>');
 if(dn<W.lp(E.nowAbs(),o).day)return {err:'CHOOSE TODAY OR A LATER DATE'};
 var its=W.search(o,d,dn).filter(function(it){return it.dep>E.nowAbs()}).map(function(it){var q=chgQ(b,di,it),rows=classRow(it,true).filter(function(r){return !!r.award===aw}).map(function(r){var f=famAt(r);return {k:r.k,name:r.fam.n,left:r.left,ok:r.left>=seatsN,total:W.priceFor(it,f,q).total,miles:r.award?W.awardPartyMiles(it,r.cab.k,r.award.level,q):0,cab:r.cab.k}});
  return {key:it.key,current:it.key===cur,flt:it.legs.map(function(l){return fn(l.id)}).join('/'),dep:t4(it.dep,it.legs[0].from),arr:t4(it.arr,it.legs[it.legs.length-1].to),via:it.stops?it.legs[0].to:'',rows:rows}});
 return {its:its,cls:classOf(b,di),o:o,d:d}}
function changeQuote(ref,di,itKey,k,dn){var b=chgFind(ref);if(!b)return {ok:false,err:'BOOKING NOT FOUND'};if(chgBusy())return {ok:false,err:'FINISH OR IGNORE (IG) THE BOOKING IN PROGRESS IN THE TERMINAL FIRST'};
 return chgWith(b,function(){var dir=b.dirs[di],o=dir.legs[0].from,d=dir.legs[dir.legs.length-1].to,its=W.search(o,d,dn).filter(function(it){return it.dep>E.nowAbs()}),ln=its.findIndex(function(x){return x.key===itKey})+1;if(!ln)return {ok:false,err:'FLIGHT NO LONGER ON SALE'};
  var li=0;for(var x=0;x<di;x++)li+=b.dirs[x].legs.length;var n=b.names.length+li+1;T.av={o:o,d:d,dn:dn,its:its,award:!!b.award};T.ri=null;T.dry=true;
  rb('RB'+k+n+'/'+ln);var last=T.last;
  if(T.plan){var pl=T.plan;return {ok:true,quote:{kind:'held',oldFlt:dir.legs.map(function(l){return fn(l.id)}).join('/'),newFlt:pl.target.legs.map(function(l){return fn(l.id)}).join('/'),oldCls:pl.old,newCls:pl.k,oldTotal:pl.oldTotal,newTotal:pl.newTotal,award:pl.award||null}}}
  if(T.ri&&T.ri.ref===b.ref){var ri=T.ri,rule=chgRule(b,di);return {ok:true,ri:ri,quote:{kind:'ticketed',oldFlt:dir.legs.map(function(l){return fn(l.id)}).join('/'),newFlt:ri.it.legs.map(function(l){return fn(l.id)}).join('/'),oldCls:ri.old,newCls:ri.k,oldFare:ri.oldPr.total,newFare:ri.pr.total,fee:ri.fee,diff:ri.diff,collect:ri.collect,rule:rule.text,pax:b.pax.a+b.pax.c,
   award:ri.award?{oldMiles:(b.award.dirs[di]||{}).miles,newMiles:ri.award.newDir.miles,feeM:ri.award.feeM,diffM:ri.award.diffM,due:ri.award.due,balance:W.memberBalance(W.awardMember(b))}:null}}}
  return {ok:false,err:last?last.t.replace(/\n[\s\S]*$/,''):'CANNOT CHANGE THIS FLIGHT'}})}
function changeCommit(ref,di,itKey,k,dn,method,tend){var b=chgFind(ref);if(!b)return {ok:false,err:'BOOKING NOT FOUND'};if(chgBusy())return {ok:false,err:'FINISH OR IGNORE (IG) THE BOOKING IN PROGRESS IN THE TERMINAL FIRST'};
 return chgWith(b,function(){var dir=b.dirs[di],o=dir.legs[0].from,d=dir.legs[dir.legs.length-1].to,its=W.search(o,d,dn).filter(function(it){return it.dep>E.nowAbs()}),ln=its.findIndex(function(x){return x.key===itKey})+1;if(!ln)return {ok:false,err:'FLIGHT NO LONGER ON SALE'};
  var li=0;for(var x=0;x<di;x++)li+=b.dirs[x].legs.length;var n=b.names.length+li+1;T.av={o:o,d:d,dn:dn,its:its,award:!!b.award};T.ri=null;T.dry=false;
  rb('RB'+k+n+'/'+ln);
  if(b.held){var l0=T.last;return l0&&l0.c==='ok'?{ok:true,msg:'Flight changed. The booking is still held.'}:{ok:false,err:l0?l0.t.replace(/\n[\s\S]*$/,''):'COULD NOT CHANGE'}}
  if(!T.ri||T.ri.ref!==b.ref)return {ok:false,err:T.last?T.last.t.replace(/\n[\s\S]*$/,''):'COULD NOT QUOTE THE CHANGE'};
  var need=T.ri.collect;if(need>0){var key=FPK[method]||'CASH';T.fp={k:key,amount:key==='CASH'&&tend?+tend:null}}T.last=null;reissue();var l1=T.last;
  return l1&&l1.c==='ok'?{ok:true,msg:'Reissued. New ticket numbers are on the e-ticket.'}:{ok:false,err:l1?l1.t.replace(/\n[\s\S]*$/,''):'COULD NOT REISSUE'}})}

/* ---------- itinerary printout: the counter's plain-text document, in the style of a reservation system print ---------- */
var CCODE={'Asia/Jakarta':'ID','Asia/Makassar':'ID','Asia/Jayapura':'ID','Asia/Pontianak':'ID','Europe/Copenhagen':'DK','Asia/Shanghai':'CN','Europe/Lisbon':'PT','Europe/Berlin':'DE','Europe/Vienna':'AT','Asia/Tokyo':'JP','Europe/London':'GB','Asia/Dubai':'AE','Europe/Oslo':'NO','Europe/Athens':'GR','Asia/Hong_Kong':'HK','Europe/Stockholm':'SE','Europe/Helsinki':'FI','Europe/Budapest':'HU','Asia/Muscat':'OM','Europe/Prague':'CZ','Europe/Brussels':'BE','Africa/Casablanca':'MA','Australia/Melbourne':'AU','Australia/Brisbane':'AU','Australia/Darwin':'AU','Australia/Sydney':'AU','Australia/Perth':'AU','Australia/Adelaide':'AU','Europe/Istanbul':'TR','Asia/Macau':'MO','Asia/Taipei':'TW','Pacific/Auckland':'NZ','Asia/Riyadh':'SA','Asia/Baku':'AZ','Asia/Singapore':'SG','Asia/Manila':'PH','Asia/Kuala_Lumpur':'MY','Asia/Kuching':'MY','Asia/Ho_Chi_Minh':'VN','Asia/Bangkok':'TH','Indian/Maldives':'MV','Asia/Kathmandu':'NP','Asia/Kolkata':'IN','Asia/Amman':'JO','America/Los_Angeles':'US','Pacific/Honolulu':'US','Asia/Seoul':'KR','Africa/Addis_Ababa':'ET','Europe/Rome':'IT','Europe/Zurich':'CH','Asia/Brunei':'BN','Europe/Paris':'FR','Europe/Amsterdam':'NL','Asia/Qatar':'QA','Africa/Johannesburg':'ZA','Asia/Dhaka':'BD','Africa/Nairobi':'KE','Asia/Colombo':'LK'};
var WDS=['MON','TUE','WED','THU','FRI','SAT','SUN'];
function ipCity(c){return (E.cname(c)+' '+(CCODE[E.CT[c]&&E.CT[c].tz]||'')).trim().toUpperCase()}
function ipPort(c){return c===E.HUB?'JAKARTA INTERNATIONAL':W.airportName(c).toUpperCase().replace(/ INTERNATIONAL/,' INTL').replace(/ AIRPORT$/,'')}
function ipTerm(l,end){var c=end==='to'?l.to:l.from;return c===E.HUB?'TERMINAL '+String(l.term||'T3').slice(1):W.airportTerm(c).toUpperCase()}
function ipCol(text,w){var words=String(text).split(' '),L=[],cur='';words.forEach(function(x){if((cur+' '+x).trim().length>w&&cur){L.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)L.push(cur);return L}
function ipEquip(ac){ac=String(ac||'');return /^A\d/.test(ac)?'AIRBUS INDUSTRIE '+ac:/^(73|74|77|78)/.test(ac)?'BOEING '+ac:ac.toUpperCase()}
function ipMeal(l,cab){var blk=l.arr-l.dep,t=W.lp(l.dep,l.from).min;if(blk<100)return 'SNACK';return cab==='Business'?'MEAL SERVICE':t>=240&&t<600?'BREAKFAST':t>=600&&t<960?'LUNCH':t>=960&&t<1380?'DINNER':'LIGHT MEAL'}
function ipDur(l){var m=l.arr-l.dep;return p2(Math.floor(m/60))+':'+p2(m%60)}
function ipWrap(prefix,text,width){var ind=new Array(prefix.length+1).join(' '),words=String(text).split(' '),L=[],cur=prefix;words.forEach(function(w){if((cur+w).length>width&&cur.trim()){L.push(cur.replace(/\s+$/,''));cur=ind}cur+=w+' '});L.push(cur.replace(/\s+$/,''));return L}
function ipLines(b){var o=CURFORCE;CURFORCE=GA_CUR.ofBooking(b);try{return cx(ipLines0(b).join('\n')).split('\n')}finally{CURFORCE=o}}
function ipLines0(b){var held=!!b.held,L=[],n=function(x){return Math.round(x).toLocaleString('en-US')},FS=W.etkFareSplit(b),aw=!!b.award,people=b.names.map(function(x,i){return {i:i,t:(b.passengers&&b.passengers[i]&&b.passengers[i].type)||'a'}});
 var fqNo=function(i){var x=(b.extras||[]).find(function(y){return y.k==='ssr'&&y.code==='FQTV'&&y.p===i});return x?x.text:''};
 var hd=function(left,right){L.push(pad(left,54)+right)};
 hd('GARUDA INDONESIA',held?'ITINERARY - NOT TICKETED':'ETKT RECEIPT / ITINERARY');
 hd(String(b.place||C.COUNTER).toUpperCase()+' JAKARTA   OFFICE '+OFFICE,'DATE '+ddmony(E.TD)+' '+t4(E.nowAbs(),E.HUB));
 hd('JAKARTA INTERNATIONAL AIRPORT, TERMINAL 3','BOOKING REF '+b.ref);
 if(held&&b.tl)hd('','TIME LIMIT '+tlShort(b.tl).replace('/',' '));else if(!held)hd('','RECEIPT '+W.etkReceipt(b,'0','RCT'));
 L.push('');
 people.forEach(function(p){var s=pn(b,p.i)+(p.t==='i'?' (INF)':'');L.push(pad(s,24)+(held?'':'ETKT '+C.ticketNo(b,p.i)+'  ')+(fqNo(p.i)?'FQTV '+fqNo(p.i):''))});
 if(!held&&b.reissues&&b.reissues.length){var lr=b.reissues[b.reissues.length-1];if(lr.prev)L.push('ISSUED IN EXCHANGE FOR  '+lr.prev.join('  '))}
 L.push('');
 L.push(pad('SERVICE',17)+pad('FROM',24)+pad('TO',24)+pad('DEPART',8)+'ARRIVAL');
 L.push(pad('---------------',17)+pad('----------------------',24)+pad('----------------------',24)+pad('------',8)+'-------');
 b.dirs.forEach(function(d,di){d.legs.forEach(function(l){var dn=legDay(l),cab=(b.cabs&&b.cabs[di])||b.cab,k=classOf(b,di),cabName=(/^Award/.test(b.fams[di]||'')?(b.fams[di].replace(/^Award /,'').replace(/ (Saver|Advantage)$/,'')+' AWARD '+(b.fams[di].match(/(Saver|Advantage)$/)||[''])[0]):(cab==='Premium'?'Premium Economy':cab)).toUpperCase();
  L.push('GARUDA INDONESIA - '+fn(l.id));
  L.push(pad('',17)+pad(ipCity(l.from),24)+pad(ipCity(l.to),24)+pad(t4(l.dep,l.from),8)+t4(l.arr,l.to));
  var fw=ipCol(ipPort(l.from),23),tw=ipCol(ipPort(l.to),23),rows=Math.max(fw.length,tw.length);
  for(var q=0;q<rows;q++)L.push(pad(q===0?WDS[dow(dn)-1]+' '+ddmon(dn):'',17)+pad(fw[q]||'',24)+(tw[q]||''));
  L.push(pad('NON STOP',17)+pad(ipTerm(l,'from'),24)+pad(ipTerm(l,'to'),24)+'DURATION '+ipDur(l));
  L.push(pad('',17)+(held?'RESERVATION CONFIRMED - ':'TICKETED - ')+k+' '+cabName+(held?'':'   NVB '+ddmony(dn)+' NVA '+ddmony(dn)));
  L.push(pad('',17)+'ON BOARD: '+ipMeal(l,cab));
  L.push(pad('',17)+'AIRCRAFT OWNER: GA GARUDA INDONESIA');
  L.push(pad('',17)+'EQUIPMENT: '+ipEquip(l.ac));
  var seats=people.filter(function(p){return p.t!=='i'}).map(function(p){var s=W.travellerSeat(b,l,p.i);return s&&!/^(Not|Lap)/.test(s)?s+'/P'+(p.i+1):''}).filter(Boolean);
  var rl=E.RULES[b.fams[di]||b.fams[0]]||{};
  L.push(pad('',17)+'SEATS: '+(seats.length?seats.join(' '):'NOT ASSIGNED')+'   BAGGAGE: '+(/^Not/.test(rl.chk||'')?'CABIN ONLY':String(rl.chk||'').replace(/ kg/i,'K').toUpperCase()+' + 7K CABIN'));
  L.push('')})});
 /* special services (remarks never print) */
 var sv=(b.extras||[]).filter(function(x){return x.k==='ssr'&&x.code!=='FQTV'});if(sv.length){L.push('SPECIAL SERVICES');sv.forEach(function(x){L.push('  '+x.code+' '+String((W.SSR_NAMES||{})[x.code]||'').toUpperCase()+(x.text?' - '+String(x.text).toUpperCase():'')+'  P'+((x.p||0)+1))});L.push('')}
 /* fare */
 var adult=people.findIndex(function(p){return p.t==='a'});if(adult<0)adult=0;
 var per=function(i){return FS.fareP[i]+FS.ppnP[i]+(people[i].t==='i'?0:FS.chgEach)};
 if(aw){L.push('AWARD  '+n(FS.milesP[adult])+' MILES PER PAX  + ¤ '+n(per(adult))+' CASH TAXES AND CHARGES');L.push('  MEMBER '+b.award.member+' '+(b.award.memberId||'')+'  NO FARE OR PPN ON AN AWARD')}
 else if(held){var ports=Object.keys(FS.ports).map(function(a){return 'ID '+a+' '+n(FS.ports[a])}).join('  ');
  L.push('FARE ¤'+n(per(adult))+' PER PAX INCL TAXES PER '+ddmon(E.TD)+(held?' SUBJECT TO CHANGE':''));
  people.forEach(function(p,i){if(p.t!=='a'&&(i!==adult)&&!people.slice(0,i).some(function(q){return q.t===p.t}))L.push('FARE ¤'+n(per(i))+' PER '+(p.t==='c'?'CHD':'INF'))});
  L.push('  FARE '+n(FS.fareP[adult])+'  ID PPN '+n(FS.ppnP[adult])+'  '+ports)}
 if(held&&b.tl)L.push('X TIME LIMIT '+tlShort(b.tl)+' AUTO CANCEL');
 L.push('');
 if(!held){
  L.push(pad('FARE AND TAXES',30)+lpad('FARE',12)+lpad('ID PPN',12)+lpad('AIRPORT CHG',13)+lpad('TOTAL',12));
  var tf=0,tp=0,tc=0;people.forEach(function(p,i){var c=p.t==='i'?0:FS.chgEach;tf+=FS.fareP[i];tp+=FS.ppnP[i];tc+=c;L.push(pad('  '+pn(b,i)+(p.t==='i'?' (INF)':''),30)+lpad(aw?'AWARD':n(FS.fareP[i]),12)+lpad(n(FS.ppnP[i]),12)+lpad(n(c),13)+lpad(n(per(i)),12))});
  L.push(pad('  TOTAL ¤',30)+lpad(aw?'AWARD':n(tf),12)+lpad(n(tp),12)+lpad(n(tc),13)+lpad(n(b.total),12));
  L.push('');
  ipWrap('FARE CALC  ',W.etkFareCalc(b),80).forEach(function(x){L.push(x)});
  var pm=b.payment||{},m=String(b.paymentMethod||'NOT RECORDED').toUpperCase(),cash=/^CASH$/i.test(b.paymentMethod||'');
  L.push('FOP        '+(aw?'MILES '+(b.award.memberId||'')+' + ':'')+m+(cash&&pm.tendered?'   RECEIVED '+n(pm.tendered)+'   CHANGE '+n(pm.change||0):'')+(pm.approval?'   APPROVAL '+pm.approval:'')+'   CHARGED '+n(b.paid0||b.total));
  var fams=[];b.dirs.forEach(function(d,i){var f=b.fams[i]||b.fams[0];if(fams.indexOf(f)<0)fams.push(f)});
  ipWrap('ENDORSEMENTS  ',fams.map(function(f,i){return W.etkEndorse(b,f,i)}).join(' / ').replace(/ · /g,' / '),80).forEach(function(x){L.push(x)});
  L.push('ISSUED     '+String(b.place||C.COUNTER).toUpperCase()+' / AGENT '+OFFICE+' / '+(b.issuedMs?ddmony(Math.floor((b.issuedMs+7*36e5)/864e5))+' '+(function(d){return p2(d.getUTCHours())+p2(d.getUTCMinutes())})(new Date(b.issuedMs+7*36e5)):ddmony(E.TD)));
  L.push('')}
 /* fare rules */
 var f0=b.fams[0],rr=E.RULES[f0]||{};
 L.push('FARE RULES - '+String(f0).toUpperCase()+' ('+classOf(b,0)+')');
 L.push('  CHANGES         '+String(rr.chg||'').toUpperCase().replace(/ FEE$/,' FEE PER PAX').replace(/^FREE$/,'FREE OF CHARGE'));
 L.push('  REFUND          '+String(GA_CUR.text(rr.ref||'',GA_CUR.ofBooking(b))).toUpperCase().replace(/(IDR [\d,]+) FEE$/,'$1 FEE PER PAX'));
 L.push('  BAGGAGE         '+String(rr.chk||'').toUpperCase().replace(/ KG/g,'K')+' CHECKED, '+String(rr.bag||'').toUpperCase().replace(/ KG CABIN BAG/,'K CABIN').replace(/ CABIN BAG/,' CABIN'));
 L.push('  SEATS           '+String(rr.seat||'').toUpperCase());
 L.push('  MILES           '+String(rr.mil||'').toUpperCase()+' OF FLOWN MILES');
 if(held)L.push('  FARE IS NOT GUARANTEED UNTIL TICKETED');
 L.push('');
 if(!held){L.push('CHECK-IN OPENS 48 HRS BEFORE DEPARTURE - CLOSES 45 MIN DOMESTIC, 60 INTL');L.push('CARRY PHOTO ID. CARRIAGE SUBJECT TO CONDITIONS OF CARRIAGE.')}
 else if(b.contactPhone||b.contactEmail)L.push('CONTACT  '+(b.contactPhone?'AP '+b.contactPhone:'')+(b.contactEmail?'   APE '+b.contactEmail.toUpperCase():''));
 L.push('AGENT RECEIPT - NOT VALID FOR TRAVEL - SIMULATED');L.push('GARUDA INDONESIA CONCEPT - NOT AFFILIATED WITH GARUDA INDONESIA');
 return L.map(function(x){return x.replace(/\s+$/,'')})}
function ipPrint(b){var pane=$('agent-print-itin'),rec=$('agent-print-record');if(!pane)return false;if(rec)rec.textContent='';
 pane.innerHTML='<img src="assets/garuda-logo-colour.png" alt="" style="height:34px;display:block;margin:0 0 10px"><div style="font-size:8pt;letter-spacing:.04em;border:.75pt solid #000;display:inline-block;padding:1px 7px;margin:0 0 10px">COUNTER COPY · '+(b.held?'NOT A TICKET':'TICKETED')+'</div><pre style="margin:0;font:9pt/1.38 \'Courier New\',Courier,monospace;white-space:pre">'+C.esc(ipLines(b).join('\n'))+'</pre>';
 try{window.print();return true}catch(e){return false}}
function ip(doPrint){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');if(!W.etkFareSplit||!W.etkReceipt)return out('THIS PAGE IS OUT OF DATE - CLOSE IT AND REOPEN, OR RELOAD','e');if(b.cancelled)return out('BOOKING IS CANCELLED - NO ITINERARY TO PRINT','e');
 if(doPrint){var ok=ipPrint(b);return out(ok?'ITINERARY SENT TO PRINT - SIMULATED':'PRINT UNAVAILABLE - USE BROWSER PRINT',ok?'sys':'e')}
 out(ipLines(b).join('\n')+'\nIPP PRINTS THE ITINERARY','')}

/* ---------- side panel: the booking in progress and what to type next ---------- */
function side(){var s=$('tside');if(!s)return;var h='<div class="pane"><h2>Booking in progress <small>'+(T.cur?C.statusOf(T.cur)[0]:T.p.names.length||T.p.segs.length?'Not saved':'Empty')+'</small></h2><div class="in">';
 var txt=T.cur?bookingText(T.cur):elems().map(function(e){return e.line}).join('\n');h+=txt?'<pre class="pnr">'+C.esc(txt)+'</pre>':'<div class="note" style="margin:0">Nothing yet. Start with AN to check availability.</div>';
 var B=!T.cur&&build();if(B)h+='<div class="q-row" style="padding:8px 0 0"><span>Estimate'+(B.assumed?' (1 adult assumed)':'')+'</span><b>¤ '+amt(B.sum.total)+'</b></div>';
 h+='</div></div><div class="pane"><h2>Next</h2><div class="in">'+nextHtml()+'</div></div><div class="pane"><h2>Quick keys</h2><div class="in keys">'+['HE','AN','FXX','ER','TTP','RT','QT','IG'].map(function(k){return '<button type="button" class="ghost" data-cmd="'+k+'">'+k+'</button>'}).join('')+'</div></div>';s.innerHTML=cx(h)}
function nextHtml(){var P=T.p,b=T.cur,tip=function(c,t){return '<div class="nx"><button type="button" class="ghost" data-cmd="'+C.esc(c)+'">'+C.esc(c)+'</button> '+C.esc(t)+'</div>'};
 if(b){if(b.cancelled)return '<div class="note" style="margin:0">Booking cancelled. IG clears the screen of it.</div>';if(b.held)return (T.fp?tip('TTP','issue tickets · ¤ '+amt(b.total)):tip('FXX','review the total')+tip('FQN','review fare rules')+(b.award?'':tip('DO10/REASON','apply fare override'))+tip('FPCASH','set form of payment'))+tip('IPP','print the itinerary for the customer')+tip('SM3','seat map')+tip('RBT3','rebook into class T')+tip('XI','cancel and release seats');if(T.ri&&T.ri.ref===b.ref)return tip('FPCASH','form of payment')+tip('TTP','collect and reissue');return tip('TWD','display ticket record')+tip('IPP','print the counter itinerary')+tip('TWP','print agent copy')+tip('SM3','seat map')+tip('EP','print the e-ticket')+tip('RBT3','change class')+tip('XI','cancel and refund')}
 if(!P.segs.length)return tip('AN'+ddmon(E.TD+21)+'JKTSIN','check availability')+tip('AW'+ddmon(E.TD+21)+'JKTSIN','award seats')+(T.av?tip('SS1Y1','sell from the last display'):'');if(!P.names.length)return tip('NM1SURNAME/GIVEN','add the passengers');var named=P.names.filter(function(n){return n.t!=='i'}).length;if(named!==P.segs[0].n)return '<div class="note">'+named+' of '+P.segs[0].n+' seat-holding passengers named. Add or correct names before saving.</div>'+tip('NM1SURNAME/GIVEN','add a passenger');if(!P.phone)return tip('AP+628123456789','contact phone');if(!P.tk)return tip('TKOK','ticketing arrangement');if(!P.rf)return tip('RFNAME','received from');
 if(P.segs[0].award&&!P.member)return tip('AMGA123456789','select the GarudaMiles member by number');
 return tip('FXX','check the fare')+tip('RBT3','rebook a flight into class T')+tip('ER','save the booking')}
})();
