/* Sales terminal: a GDS-style command screen (Amadeus, Sabre, Galileo flavour) on top of the Garuda engine.
   Availability, selling, names, contact, ticketing arrangement, save, form of payment, ticket, retrieve, cancel.
   The command set is simplified and Garuda-specific. It is not real GDS syntax. */
(function(){
'use strict';
var C,W,E,BKS,store;
function boot(){C=GA_AGENT.ctx;W=C.W;E=C.E;BKS=C.BKS;store=C.store;start()}
if(window.GA_AGENT&&GA_AGENT.ctx)setTimeout(boot,0);else document.addEventListener('ga-agent-ready',boot,{once:true});

var OFFICE='JKT003';
var ORDER='JCDIZWPSYBMEHQNKTLG';
var FPS={CASH:'Cash',CC:'Credit card',DC:'Debit card',QRIS:'QRIS',TRF:'Bank transfer'};
var AC={'A350-1000':'351','A350-900':'359','787-9':'789','A330-900':'339','737-800':'738','ATR 72-600':'AT7'};
var T={lines:[],hist:[],hi:0,av:null,list:null,p:fresh(),cur:null,fp:null,xi:null,started:false};
function fresh(){return {names:[],segs:[],phone:'',email:'',tk:null,rf:''}}
var $=function(id){return document.getElementById(id)};
var pad=function(s,n){s=String(s);return s.length>=n?s:s+' '.repeat(n-s.length)},lpad=function(s,n){s=String(s);return s.length>=n?s:' '.repeat(n-s.length)+s};
var n0=function(n){return Math.round(n/1000)*1000};
var amt=function(n){return n0(n).toLocaleString('en-US')};
var p2=function(n){return String(n).padStart(2,'0')};
function out(t,cls){String(t).split('\n').forEach(function(l){T.lines.push({t:l,c:cls||''})});if(T.lines.length>800)T.lines.splice(0,T.lines.length-800);paint()}
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
 f.addEventListener('submit',function(e){e.preventDefault();var v=i.value.trim();i.value='';if(!v)return;T.hist.push(v);T.hi=T.hist.length;out('> '+v.toUpperCase(),'cmd');try{run(v)}catch(err){out('SYSTEM ERROR '+err.message,'e')}side();if(C.st.tab!=='term')C.renderAll()});
 i.addEventListener('keydown',function(e){if(e.key==='ArrowUp'){e.preventDefault();if(T.hi>0)i.value=T.hist[--T.hi]||''}else if(e.key==='ArrowDown'){e.preventDefault();T.hi=Math.min(T.hist.length,T.hi+1);i.value=T.hist[T.hi]||''}else if(e.key==='Escape')i.value=''});
 $('scr').addEventListener('click',function(e){if(!window.getSelection().toString())i.focus()});
 $('tside').addEventListener('click',function(e){var b=e.target.closest('[data-cmd]');if(b){i.value=b.dataset.cmd;i.focus()}});
 if(!T.started){T.started=true;out('GARUDA INDONESIA SALES TERMINAL  -  '+C.COUNTER.toUpperCase()+'  -  OFFICE '+OFFICE+'\nSIGNED IN  '+ddmony(E.TD)+'  '+t4(E.nowAbs(),E.HUB)+' WIB\nTYPE HE FOR HELP.   EXAMPLE:  AN21DECJKTSIN','sys')}
 paint();GA_TERM.show()}
window.GA_TERM={show:function(){if(!C)return;var i=$('tin');if(i)setTimeout(function(){i.focus({preventScroll:true})},0);side()},refresh:function(){if(C)paint()},run:function(v){out('> '+v.toUpperCase(),'cmd');run(v);side()},state:function(){return T},lines:function(){return T.lines.map(function(l){return l.t})}};

/* ---------- command router ---------- */
function run(raw){var up=raw.trim().toUpperCase(),c=up.replace(/\s+/g,''),m;
 if(T.xi&&c!=='XIY')T.xi=null;
 if(c==='HE'||c==='HELP'||c==='?')return help();
 if(c==='CL'||c==='CLR'||c==='CLEAR'){T.lines=[];return paint()}
 if(c==='JD')return out(dayName(E.TD)+' '+ddmony(E.TD)+'  '+t4(E.nowAbs(),E.HUB)+' WIB','sys');
 if(m=up.match(/^DAC\s*([A-Z]{3})$/))return dac(m[1]);
 if(m=up.match(/^DAN\s*(.{2,})$/))return dan(m[1].trim());
 if(/^AN/.test(c))return an(c);
 if(/^SS/.test(c))return ss(c);
 if(/^NM/.test(up.replace(/\s+/g,' ')))return addNames(up);
 if(/^AP/.test(c))return ap(up);
 if(/^TK/.test(c))return tk(c);
 if(/^RF/.test(c))return rf(up);
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
 if(c==='FQD')return fqd();
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
'  RBT3                 rebook element 3 into class T (unsaved or held bookings)',
'SAVE AND TICKET',
'  FQD  FQN             fare quote and fare rules',
'  ER                   save the booking, get the record locator, seats held',
'  FPCASH  FPCASH/2000000  FPCC  FPDC  FPQRIS  FPTRF    form of payment',
'  ET                   issue tickets       EP  print the e-ticket',
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
function classRow(it){var rows=[];W.fares(it).forEach(function(cab){cab.fam.forEach(function(f){(f.subs||[]).forEach(function(s){rows.push({k:s.k,cab:cab,fam:f,sub:s,left:s.left})})})});rows.sort(function(a,b){return ORDER.indexOf(a.k)-ORDER.indexOf(b.k)});return rows}
function famAt(row){return Object.assign({},row.fam,{p:row.sub.p,sub:row.k})}
function an(c){var m=c.match(/^AN(\d{1,2}[A-Z]{3}(?:\d{2})?)([A-Z]{3})?([A-Z]{3})?$/);if(!m)return out('INVALID FORMAT - EXAMPLE  AN21DECJKTSIN','e');
 var dn=C.parseDate(m[1]);if(dn==null)return out('INVALID DATE','e');if(dn<=E.TD)return out('DATE MUST BE TOMORROW OR LATER','e');
 var o,d;if(m[2]&&m[3]){o=m[2];d=m[3]}else if(!m[2]&&!m[3]&&T.av){o=T.av.d;d=T.av.o}else return out('NEED CITY PAIR - EXAMPLE  AN21DECJKTSIN','e');
 if(!E.CT[o])return out(o+' UNKNOWN CITY CODE - USE DAN','e');if(!E.CT[d])return out(d+' UNKNOWN CITY CODE - USE DAN','e');if(o===d)return out('CITIES MUST DIFFER','e');
 var its=W.search(o,d,dn);T.av={o:o,d:d,dn:dn,its:its};
 out('** GARUDA INDONESIA AVAILABILITY **  '+o+' '+E.CT[o].n.toUpperCase()+' - '+d+' '+E.CT[d].n.toUpperCase()+'\n'+dayName(dn)+' '+ddmony(dn),'h');
 if(!its.length)return out('NO FLIGHTS','e');
 out(pad(' LN FLIGHT',19)+pad('CLASSES AVAILABLE',58)+pad('ROUTE',8)+pad('DEP',5)+pad('ARR',6)+pad('+D',3)+pad('EQP',4)+'DUR','h');
 its.forEach(function(it,i){var a=it.legs[0],z=it.legs[it.legs.length-1],cr=classRow(it),dd=W.lp(z.arr,z.to).day-W.lp(a.dep,a.from).day,flt=it.legs.map(function(l){return fn(l.id)}).join('/');
  out(lpad(i+1,3)+'  '+pad(flt,12)+'  '+pad(cr.map(function(x){return x.k+Math.min(9,x.left)}).join(' '),58)+a.from+z.to+'  '+t4(a.dep,a.from)+' '+t4(z.arr,z.to)+'  '+(dd>0?'+'+dd:' 0')+' '+pad(acCode(a),4)+E.dur(it.dur).replace(' ','').replace('h',':').replace('m','')+(it.stops?'  VIA '+a.to:''))});
 out('SELL WITH SS<SEATS><CLASS><LINE>, FOR EXAMPLE  SS2Y1','sys')}
function ss(c){var m=c.match(/^SS(\d)([A-Z])(\d{1,2})$/);if(!m)return out('INVALID FORMAT - EXAMPLE  SS2Y1  (2 SEATS, CLASS Y, LINE 1)','e');
 if(T.cur)return out('BOOKING ALREADY SAVED - IGNORE WITH IG TO START A NEW ONE','e');
 var n=+m[1],k=m[2],ln=+m[3];if(!T.av)return out('NO AVAILABILITY DISPLAYED - USE AN FIRST','e');if(n<1)return out('NUMBER OF SEATS MUST BE 1 TO 9','e');
 var it=T.av.its[ln-1];if(!it)return out('NO SUCH LINE '+ln,'e');
 var row=classRow(it).find(function(x){return x.k===k});if(!row)return out('CLASS '+k+' NOT OFFERED ON LINE '+ln,'e');
 if(row.left<n)return out(row.left?'ONLY '+row.left+' SEAT'+(row.left>1?'S':'')+' IN CLASS '+k:'CLASS '+k+' CLOSED','e');
 var P=T.p;if(P.segs.length&&P.segs[0].n!==n)return out('SEATS MUST MATCH THE FIRST SEGMENT ('+P.segs[0].n+')','e');
 if(P.segs.some(function(s){return s.it.key===it.key}))return out('DUPLICATE SEGMENT','e');
 var last=P.segs[P.segs.length-1];if(last&&it.dep<last.it.arr)return out('SEGMENTS OUT OF SEQUENCE','e');
 P.segs.push({it:it,cls:k,cab:row.cab.k,fam:famAt(row),n:n});
 out(segLines(P.segs[P.segs.length-1],0).join('\n')+'\nOK','');paint()}
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
function fp(c){var m=c.match(/^FP(CASH|CC|DC|QRIS|TRF)(?:\/(\d+))?$/);if(!m)return out('INVALID FORM OF PAYMENT - FPCASH FPCC FPDC FPQRIS FPTRF','e');T.fp={k:m[1],amount:m[2]?+m[2]:null};out('OK  FORM OF PAYMENT '+FPS[m[1]].toUpperCase())}
function xe(c){if(T.cur)return out('BOOKING ALREADY SAVED - USE XI TO CANCEL IT','e');var m=c.match(/^XE([\d,-]+)$/);if(!m)return out('INVALID FORMAT - EXAMPLE  XE3  OR  XE2-3','e');
 var nums=[];m[1].split(',').forEach(function(x){var r=x.match(/^(\d+)-(\d+)$/);if(r){for(var i=+r[1];i<=+r[2];i++)nums.push(i)}else if(/^\d+$/.test(x))nums.push(+x)});
 var es=elems(),del={nm:[],seg:[],ap:0,em:0,tk:0,fp:0,rf:0};for(var j=0;j<nums.length;j++){var e=es[nums[j]-1];if(!e)return out('NO ELEMENT '+nums[j],'e');if(e.k==='nm')del.nm.push(e.i);else if(e.k==='seg')del.seg.push(e.i);else del[e.k]=1}
 uniq(del.nm).sort(function(a,b){return b-a}).forEach(function(i){T.p.names.splice(i,1)});uniq(del.seg).sort(function(a,b){return b-a}).forEach(function(i){T.p.segs.splice(i,1)});
 if(del.ap)T.p.phone='';if(del.em)T.p.email='';if(del.tk)T.p.tk=null;if(del.fp)T.fp=null;if(del.rf)T.p.rf='';out('OK  '+nums.length+' ELEMENT'+(nums.length>1?'S':'')+' DELETED')}
function uniq(a){return a.filter(function(x,i){return a.indexOf(x)===i})}
function ig(){var had=T.cur||T.p.names.length||T.p.segs.length;T.p=fresh();T.cur=null;T.fp=null;T.xi=null;out(had?'IGNORED':'NOTHING TO IGNORE','sys')}

/* ---------- the booking as numbered elements ---------- */
function elems(){var P=T.p,es=[],n=0;P.names.forEach(function(x,i){es.push({k:'nm',i:i,line:lpad(++n,2)+'.'+nm(x)+(x.t==='c'?' (CHD/'+ddmony(x.dn)+')':x.t==='i'?' (INF/'+ddmony(x.dn)+')':'')})});
 P.segs.forEach(function(s,i){segLines(s,n).forEach(function(l){es.push({k:'seg',i:i,line:l});n++})});
 if(P.phone)es.push({k:'ap',line:lpad(++n,2)+' AP '+P.phone});if(P.email)es.push({k:'em',line:lpad(++n,2)+' AP E-'+P.email.toUpperCase()});
 if(P.tk)es.push({k:'tk',line:lpad(++n,2)+' TK '+(P.tk.why==='TKOK'?'OK':'TL')+tlShort(P.tk.ms)});if(T.fp)es.push({k:'fp',line:lpad(++n,2)+' FP '+FPS[T.fp.k].toUpperCase()+(T.fp.amount?'/'+amt(T.fp.amount):'')});if(P.rf)es.push({k:'rf',line:lpad(++n,2)+' RF '+P.rf.toUpperCase()});return es}
function bookingText(b){var l=[],n=0,st=C.statusOf(b)[0].toUpperCase();
 l.push('RP/'+OFFICE+'/'+OFFICE+'   '+b.ref+'   '+st+'   '+ddmony(E.TD));
 (b.passengers||[]).forEach(function(p,i){l.push(lpad(++n,2)+'.'+pn(b,i)+(p.type==='c'?' (CHD/'+(p.dob?ddmony(E.dnOf?E.dnOf(p.dob):0):'')+')':p.type==='i'?' (INF)':''))});
 b.dirs.forEach(function(d,i){d.legs.forEach(function(g){l.push(lpad(++n,2)+'  '+pad(fn(g.id),7)+' '+classOf(b,i)+' '+pad(ddmon(legDay(g)),6)+dow(legDay(g))+' '+g.from+g.to+'  '+(g.status==='cancel'?'XX':'HK')+(b.pax.a+b.pax.c)+'   '+t4(g.dep,g.from)+' '+t4(g.arr,g.to))})});
 if(b.contactPhone)l.push(lpad(++n,2)+' AP '+b.contactPhone);if(b.contactEmail)l.push(lpad(++n,2)+' AP E-'+b.contactEmail.toUpperCase());
 if(b.held&&b.tl)l.push(lpad(++n,2)+' TK TL'+tlShort(b.tl));if(!b.held&&!b.cancelled&&b.payment)l.push(lpad(++n,2)+' FP '+b.paymentMethod.toUpperCase());
 if(b.rf)l.push(lpad(++n,2)+' RF '+b.rf.toUpperCase());
 if(!b.held&&b.issuedMs)b.names.forEach(function(x,i){l.push('    FA PAX '+C.ticketNo(b,i)+'/ETGA/'+ddmon(E.TD)+'/'+OFFICE+'   '+pn(b,i))});
 return l.join('\n')}
function classOf(b,i){if(b.classes&&b.classes[i])return b.classes[i];var f=b.fams[i]||b.fams[0],o={'Economy Flexi':'Y','Economy Standard':'M','Economy Value':'Q','Economy Lite':'T','Premium Economy':'W','Business Saver':'D','Business Flex':'J'};return o[f]||'Y'}
function showCurrent(){if(T.cur)return out(bookingText(T.cur),'');var es=elems();out(es.length?'RP/'+OFFICE+'/'+OFFICE+'   NOT SAVED   '+ddmony(E.TD)+'\n'+es.map(function(e){return e.line}).join('\n'):'NO BOOKING IN PROGRESS','')}

/* ---------- fare quote ---------- */
function build(){var P=T.p;if(!P.segs.length)return null;var a=0,c=0,i=0;P.names.forEach(function(n){if(n.t==='a')a++;else if(n.t==='c')c++;else i++});var its=P.segs.map(function(s){return s.it}),f=its[0].legs[0],z=its[0].legs[its[0].legs.length-1],d1=legDay(f),dl=legDay(its[its.length-1].legs[0]);
 var rev=its.length===2&&its[1].legs[0].from===z.to&&its[1].legs[its[1].legs.length-1].to===f.from;
 var q={from:f.from,to:z.to,type:rev?'ret':'one',d1:d1,d2:rev?dl:d1,a:a||1,c:c,i:i,cab:'Economy'},sel=P.segs.map(function(s){return {it:s.it,fam:s.fam}});
 return {q:q,sel:sel,sum:W.priceSummary(sel,q),assumed:!a,rev:rev,multi:its.length>1&&!rev}}
function fqd(){if(T.cur){var b=T.cur,L=['FQD  '+b.ref+'   PRICED AT BOOKING','PAX  '+b.pax.a+' ADT'+(b.pax.c?'  '+b.pax.c+' CHD':'')+(b.pax.i?'  '+b.pax.i+' INF':'')];
  b.dirs.forEach(function(d,i){var dp=b.dirPrices&&b.dirPrices[i];L.push(lpad(i+1,2)+'  '+pad(d.legs.map(function(g){return fn(g.id)}).join('/'),14)+classOf(b,i)+'   '+pad((b.fams[i]||b.fams[0]).toUpperCase(),20)+lpad(dp?amt(dp.total):'',12))});
  L.push('FARE        '+lpad(amt(b.fare),12),'PPN         '+lpad(amt(b.tax),12),'AIRPORT CHG '+lpad(amt(b.chg),12),'TOTAL IDR   '+lpad(amt(b.total),12));return out(L.join('\n'),'')}
 var B=build();if(!B)return out('NO ITINERARY - SELL A FLIGHT WITH SS FIRST','e');var q=B.q,S=B.sum,L=['FQD','PAX  '+q.a+' ADT'+(q.c?'  '+q.c+' CHD':'')+(q.i?'  '+q.i+' INF':'')+(B.assumed?'   (NO NAMES YET - ASSUMING 1 ADT)':'')];
 L.push(' LN FLIGHT        CL FARE                     AMOUNT');B.sel.forEach(function(s,i){var pr=W.priceFor(s.it,s.fam,q);L.push(lpad(i+1,3)+' '+pad(s.it.legs.map(function(g){return fn(g.id)}).join('/'),14)+pad(T.p.segs[i].cls,3)+pad(s.fam.n.toUpperCase(),22)+lpad(amt(pr.total),12))});
 L.push('FARE        '+lpad(amt(S.fare),12),'PPN         '+lpad(amt(S.tax),12),'AIRPORT CHG '+lpad(amt(S.chg),12),'TOTAL IDR   '+lpad(amt(S.total),12));
 if(B.rev)W.rtDetail(q,B.sel[0].it).parts.forEach(function(x){L.push(x[0].toUpperCase()+'  '+(x[1]>0?'+':'-')+Math.round(Math.abs(x[1])*100)+'%')});if(B.multi)L.push('NOT A ROUND TRIP - EACH ITINERARY PRICED AS A ONE-WAY');
 var sn=T.p.segs[0].n,ps=q.a+q.c;if(!B.assumed&&sn!==ps)L.push('WARNING  '+sn+' SEAT(S) SOLD BUT '+ps+' PASSENGER(S) NEED A SEAT');out(L.join('\n'),'')}
function fqn(){var fams=[];if(T.cur)T.cur.fams.forEach(function(f){if(fams.indexOf(f)<0)fams.push(f)});else T.p.segs.forEach(function(s){if(fams.indexOf(s.fam.n)<0)fams.push(s.fam.n)});if(!fams.length)return out('NO FARE SELECTED','e');
 out(fams.map(function(f){var r=E.RULES[f];return 'FARE FAMILY '+f.toUpperCase()+'\n  CABIN BAG   '+r.bag.toUpperCase()+'\n  CHECKED BAG '+r.chk.toUpperCase()+'\n  SEAT        '+r.seat.toUpperCase()+'\n  CHANGES     '+r.chg.toUpperCase()+'\n  REFUND      '+r.ref.toUpperCase()+'\n  MILES       '+r.mil}).join('\n'),'')}

/* ---------- save, pay, ticket ---------- */
function missing(){var P=T.p,m=[];if(!P.names.length)m.push('NAME (NM)');if(!P.segs.length)m.push('ITINERARY (SS)');if(!P.phone)m.push('CONTACT (AP)');if(!P.tk)m.push('TICKETING (TK)');if(!P.rf)m.push('RECEIVED FROM (RF)');return m}
function ageAt(dn,at){var b=new Date(dn*864e5),t=new Date(at*864e5),y=t.getUTCFullYear()-b.getUTCFullYear();if(t.getUTCMonth()<b.getUTCMonth()||(t.getUTCMonth()===b.getUTCMonth()&&t.getUTCDate()<b.getUTCDate()))y--;return y}
function er(){if(T.cur){C.store.set(C.KEY,BKS);return out('BOOKING '+T.cur.ref+' IS ALREADY SAVED','sys')}
 var m=missing();if(m.length)return out('INCOMPLETE - NEED  '+m.join(', '),'e');var B=build(),q=B.q,P=T.p,last=legDay(P.segs[P.segs.length-1].it.legs[0]);
 if(P.segs[0].n!==q.a+q.c)return out('SEATS SOLD ('+P.segs[0].n+') DO NOT MATCH PASSENGERS NEEDING A SEAT ('+(q.a+q.c)+') - XE THE SEGMENTS AND SELL AGAIN','e');
 for(var i=0;i<P.names.length;i++){var n=P.names[i];if(n.t==='c'){var a=ageAt(n.dn,last);if(a<2||a>11)return out(nm(n)+' IS '+a+' ON THE LAST TRAVEL DATE - A CHILD IS 2 TO 11','e')}if(n.t==='i'){if(ageAt(n.dn,last)>=2)return out(nm(n)+' WILL BE 2 OR OVER - NOT AN INFANT','e')}}
 if(P.tk.ms>endOfDay(legDay(P.segs[0].it.legs[0])))return out('TIME LIMIT IS AFTER THE FIRST DEPARTURE','e');
 for(var s=0;s<P.segs.length;s++){var rw=classRow(P.segs[s].it).find(function(x){return x.k===P.segs[s].cls});if(!rw||rw.left<P.segs[0].n)return out('CLASS '+P.segs[s].cls+' IS NO LONGER AVAILABLE ON SEGMENT '+(s+1)+' - REBOOK WITH RB OR SELL AGAIN','e')}
 var names=P.names.map(function(x){return (x.first+' '+x.last).replace(/\s+/g,' ')}),adults=[];P.names.forEach(function(x,i){if(x.t==='a')adults.push(i)});var used={};
 var bk=W.mkBooking(q,B.sel.map(function(s){return s.it}),P.segs.map(function(s){return {cab:s.cab,fam:s.fam}}),names);
 bk.passengers=P.names.map(function(x,i){var lap=null;if(x.t==='i'){for(var k=0;k<adults.length;k++)if(!used[adults[k]]){used[adults[k]]=1;lap=names[adults[k]];break}}return {type:x.t,name:names[i],first:x.first,last:x.last,title:x.title||'',dob:x.dob||null,lapAdult:lap}});
 bk.classes=P.segs.map(function(x){return x.cls});bk.contactPhone=P.phone;bk.contactEmail=P.email;bk.place=C.COUNTER;bk.rf=P.rf;bk.held=true;bk.tl=P.tk.ms;bk.dirPrices=B.sel.map(function(s){return W.priceFor(s.it,s.fam,q)});bk.savedMs=Date.now();bk.hist=[{at:Date.now(),t:'BOOKING CREATED RF '+P.rf.toUpperCase()+', SEATS HELD, TL '+tl(P.tk.ms)}];
 B.sel.forEach(function(s,i){s.it.legs.forEach(function(l){W.adjustSold(l,P.segs[i].cab,P.segs[0].n)})});C.P.clear();
 E.S.bookings.unshift(bk);BKS.unshift(bk);store.set(C.KEY,BKS);T.cur=bk;T.p=fresh();
 out('OK  BOOKING SAVED   RECORD LOCATOR '+bk.ref+'\nSEATS HELD UNTIL '+tl(bk.tl)+'.  ISSUE THE TICKETS WITH FP<METHOD> THEN ET.\n'+bookingText(bk),'ok')}
function et(){var b=T.cur;if(!b){return out(T.p.segs.length?'SAVE THE BOOKING WITH ER FIRST':'NO BOOKING - RETRIEVE ONE WITH RT','e')}
 if(b.cancelled)return out('BOOKING IS CANCELLED','e');if(!b.held)return out('ALREADY TICKETED','e');if(!T.fp)return out('NEED FORM OF PAYMENT - FPCASH FPCC FPDC FPQRIS FPTRF','e');
 var method=FPS[T.fp.k],tend=T.fp.k==='CASH'?(T.fp.amount||b.total):b.total;if(tend<b.total)return out('AMOUNT SHORT BY IDR '+amt(b.total-tend),'e');
 b.held=false;b.tl=null;b.confirmedAt=E.nowAbs();b.issuedMs=Date.now();b.paymentMethod=method;b.payment={method:method,tendered:tend,change:tend-b.total,approval:T.fp.k==='CASH'?'':String(100000+E.hash(b.ref+'AP')%900000)};
 (b.hist=b.hist||[]).push({at:Date.now(),t:'TICKETED, '+method.toUpperCase()+' IDR '+amt(b.total)});store.set(C.KEY,BKS);T.fp=null;
 out('OK  TICKETS ISSUED\n'+b.names.map(function(x,i){return '  '+C.ticketNo(b,i)+'  '+pn(b,i)}).join('\n')+'\nTOTAL IDR '+amt(b.total)+'  '+method.toUpperCase()+(b.payment.approval?'  APPROVAL '+b.payment.approval:'')+(b.payment.change>0?'  CHANGE IDR '+amt(b.payment.change):'')+'\nEP PRINTS THE E-TICKET','ok')}
function ep(){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');if(b.held)return out('NOT TICKETED - USE FP AND ET FIRST','e');if(b.cancelled)return out('BOOKING IS CANCELLED','e');C.printTicket(b.ref);out('E-TICKET SENT TO THE PRINTER','sys')}

/* ---------- retrieve, cancel, queues, history ---------- */
function rt(c){var m;if(c==='RT')return showCurrent();
 if(m=c.match(/^RT(\d{1,2})$/)){if(!T.list)return out('NO LIST TO PICK FROM','e');var b=T.list[+m[1]-1];if(!b)return out('NO SUCH LINE','e');return load(b)}
 m=c.match(/^RT(.+)$/)[1];var b2=BKS.find(function(x){return x.ref===m});if(b2)return load(b2);
 var up=m,hits=BKS.filter(function(x){return x.names.some(function(n){return n.toUpperCase().replace(/\s+/g,'').indexOf(up)>=0})});if(!hits.length)return out('NO BOOKING FOUND  '+m,'e');if(hits.length===1)return load(hits[0]);
 T.list=hits;out(hits.map(function(x,i){return lpad(i+1,3)+'  '+x.ref+'  '+pad(pn(x,0)+(x.names.length>1?' +'+(x.names.length-1):''),22)+pad(x.dirs[0].legs[0].from+x.dirs[0].legs[x.dirs[0].legs.length-1].to,8)+C.statusOf(x)[0].toUpperCase()}).join('\n')+'\nSELECT WITH RT<LINE>','')}
function load(b){T.cur=b;T.p=fresh();T.fp=null;T.xi=null;out(bookingText(b),'')}
function rb(c){var m=c.match(/^RB([A-Z])(\d{1,2})$/);if(!m)return out('INVALID FORMAT - EXAMPLE  RBT3  (REBOOK ELEMENT 3 INTO CLASS T)','e');var k=m[1],n=+m[2];
 if(ORDER.indexOf(k)<0)return out('UNKNOWN CLASS '+k,'e');
 if(!T.cur){var e=elems()[n-1];if(!e||e.k!=='seg')return out('ELEMENT '+n+' IS NOT A FLIGHT SEGMENT','e');var sg=T.p.segs[e.i];if(sg.cls===k)return out('ALREADY CLASS '+k,'e');
  var row=classRow(sg.it).find(function(x){return x.k===k});if(!row)return out('CLASS '+k+' NOT OFFERED ON THIS FLIGHT','e');if(row.left<sg.n)return out(row.left?'ONLY '+row.left+' SEAT'+(row.left>1?'S':'')+' IN CLASS '+k:'CLASS '+k+' CLOSED','e');
  var was=sg.cls;sg.cls=k;sg.cab=row.cab.k;sg.fam=famAt(row);return out('OK  REBOOKED '+was+' TO '+k+'\n'+segLines(sg,elems().filter(function(x){return x.k==='seg'&&x.i<e.i}).length+T.p.names.length).join('\n')+'\nFQD SHOWS THE NEW PRICE','ok')}
 var b=T.cur;if(b.cancelled)return out('BOOKING IS CANCELLED','e');if(!b.held)return out('TICKETED - CHANGING THE CLASS NEEDS A REISSUE, NOT BUILT YET','e');
 var idx=n-1-b.names.length,di=-1,li=0;for(var d=0;d<b.dirs.length;d++){if(idx<li+b.dirs[d].legs.length){di=d;break}li+=b.dirs[d].legs.length}if(di<0)return out('ELEMENT '+n+' IS NOT A FLIGHT SEGMENT','e');
 if(classOf(b,di)===k)return out('ALREADY CLASS '+k,'e');var dir=b.dirs[di],f0=dir.legs[0],key=dir.legs.map(function(l){return l.id+'|'+l.dep}).join('>');
 var it=W.search(f0.from,dir.legs[dir.legs.length-1].to,legDay(f0)).find(function(x){return x.key===key});if(!it)return out('FLIGHT NO LONGER IN THE SCHEDULE','e');
 var row2=classRow(it).find(function(x){return x.k===k}),seatsN=b.pax.a+b.pax.c;if(!row2)return out('CLASS '+k+' NOT OFFERED ON THIS FLIGHT','e');if(row2.left<seatsN)return out(row2.left?'ONLY '+row2.left+' SEAT'+(row2.left>1?'S':'')+' IN CLASS '+k:'CLASS '+k+' CLOSED','e');
 var oldCab=(b.cabs&&b.cabs[di])||b.cab,was2=classOf(b,di),oldTotal=b.total;
 dir.legs.forEach(function(l){W.adjustSold(l,oldCab,-seatsN)});C.P.clear();dir.legs.forEach(function(l){W.adjustSold(l,row2.cab.k,seatsN)});C.P.clear();
 var fam=famAt(row2),pr=W.priceFor(it,fam,b.q);b.dirPrices=b.dirPrices||[];b.dirPrices[di]=pr;b.fams[di]=fam.n;b.cabs=b.cabs||b.dirs.map(function(){return b.cab});b.cabs[di]=row2.cab.k;if(di===0)b.cab=row2.cab.k;b.classes=b.classes||b.dirs.map(function(x,i){return classOf(b,i)});b.classes[di]=k;
 ['fare','tax','chg','total'].forEach(function(x){b[x]=b.dirPrices.reduce(function(a,y){return a+(y?y[x]:0)},0)});(b.hist=b.hist||[]).push({at:Date.now(),t:'REBOOKED '+was2+' TO '+k+', TOTAL '+amt(oldTotal)+' TO '+amt(b.total)});store.set(C.KEY,BKS);
 out('OK  REBOOKED '+was2+' TO '+k+'   TOTAL IDR '+amt(oldTotal)+' TO '+amt(b.total)+'  ('+(b.total>=oldTotal?'+':'-')+amt(Math.abs(b.total-oldTotal))+')\n'+bookingText(b),'ok')}
function xi(confirm){if(!T.cur){if(T.p.segs.length){T.p.segs=[];return out('ITINERARY CANCELLED','sys')}return out('NO BOOKING','e')}
 var b=T.cur;if(b.cancelled)return out('BOOKING IS ALREADY CANCELLED','e');
 if(!confirm){T.xi=b.ref;if(b.held)return out('CANCEL '+b.ref+' AND RELEASE THE SEATS.  NOTHING WAS PAID.  ENTER XIY TO CONFIRM','e');var r=C.refundRows(b);
  return out('CANCEL '+b.ref+' - REFUND BY FARE RULES\n'+r.rows.map(function(x){return '  '+pad(x.dir,10)+pad(x.fam.toUpperCase(),20)+' PAID '+lpad(amt(x.paid),11)+'  FEE '+lpad(amt(x.fee),10)+'  REFUND '+lpad(amt(x.refund),11)}).join('\n')+'\nREFUND TO '+b.paymentMethod.toUpperCase()+'  IDR '+amt(r.total)+'.  ENTER XIY TO CONFIRM','e')}
 if(T.xi!==b.ref)return out('ENTER XI FIRST','e');T.xi=null;C.cancelBooking(b.ref);out('OK  BOOKING CANCELLED'+(b.cancelled.held?', SEATS RELEASED':'  REFUND IDR '+amt(b.cancelled.refund)+' TO '+b.paymentMethod.toUpperCase())+'\n'+bookingText(b),'ok')}
function qt(){var h=BKS.filter(function(b){return b.held&&!b.cancelled}).sort(function(a,b){return a.tl-b.tl});if(!h.length)return out('QUEUE EMPTY - NO HELD BOOKINGS','sys');
 out('HELD BOOKINGS BY TICKETING TIME LIMIT\n'+h.map(function(b,i){return lpad(i+1,3)+'  '+b.ref+'  TL '+pad(tlShort(b.tl),12)+pad(pn(b,0),20)+pad(b.dirs[0].legs[0].from+b.dirs[0].legs[b.dirs[0].legs.length-1].to,8)+'IDR '+amt(b.total)}).join('\n')+'\nSELECT WITH RT<REF>','');T.list=h}
function rh(){var b=T.cur;if(!b)return out('NO BOOKING - RETRIEVE ONE WITH RT','e');out('HISTORY '+b.ref+'\n'+(b.hist||[]).map(function(h){var d=new Date(h.at+7*36e5);return '  '+ddmon(Math.floor(d/864e5))+' '+p2(d.getUTCHours())+p2(d.getUTCMinutes())+'  '+h.t}).join('\n'),'')}

/* ---------- side panel: the booking in progress and what to type next ---------- */
function side(){var s=$('tside');if(!s)return;var h='<div class="pane"><h2>Booking in progress <small>'+(T.cur?C.statusOf(T.cur)[0]:T.p.names.length||T.p.segs.length?'Not saved':'Empty')+'</small></h2><div class="in">';
 var txt=T.cur?bookingText(T.cur):elems().map(function(e){return e.line}).join('\n');h+=txt?'<pre class="pnr">'+C.esc(txt)+'</pre>':'<div class="note" style="margin:0">Nothing yet. Start with AN to check availability.</div>';
 var B=!T.cur&&build();if(B)h+='<div class="q-row" style="padding:8px 0 0"><span>Quote'+(B.assumed?' (1 adult assumed)':'')+'</span><b>IDR '+amt(B.sum.total)+'</b></div>';
 h+='</div></div><div class="pane"><h2>Next</h2><div class="in">'+nextHtml()+'</div></div><div class="pane"><h2>Quick keys</h2><div class="in keys">'+['HE','AN','FQD','ER','ET','RT','QT','IG'].map(function(k){return '<button type="button" class="ghost" data-cmd="'+k+'">'+k+'</button>'}).join('')+'</div></div>';s.innerHTML=h}
function nextHtml(){var P=T.p,b=T.cur,tip=function(c,t){return '<div class="nx"><button type="button" class="ghost" data-cmd="'+C.esc(c)+'">'+C.esc(c)+'</button> '+C.esc(t)+'</div>'};
 if(b){if(b.cancelled)return '<div class="note" style="margin:0">Booking cancelled. IG clears the screen of it.</div>';if(b.held)return tip('FPCASH','form of payment')+tip('ET','issue the tickets')+tip('RBT3','rebook into class T')+tip('XI','cancel and release seats');return tip('EP','print the e-ticket')+tip('XI','cancel and refund')}
 if(!P.segs.length)return tip('AN21DECJKTSIN','check availability')+tip('SS2Y1','sell from the last display');if(!P.names.length)return tip('NM1SURNAME/GIVEN','add the passengers');if(!P.phone)return tip('AP+628123456789','contact phone');if(!P.tk)return tip('TKOK','ticketing arrangement');if(!P.rf)return tip('RFNAME','received from');
 return tip('FQD','check the fare')+tip('RBT3','rebook a flight into class T')+tip('ER','save the booking')}
})();
