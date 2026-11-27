/* Extra checked bags (simulated). Priced per route zone and bag weight, bought online until the airport cutoff.
   Zone 1 domestic; international zones come from the distance between the two airports. Business and Premium
   allowances are unchanged: these are extra bags on top. Paid bags are kept on the leg and recorded as booking extras. */
const BAG_ZONES={1:'Domestic',2:'Regional',3:'Asia-Pacific & Middle East',4:'Europe & Americas'};
const BAG_PRICE_20={1:250000,2:400000,3:650000,4:900000};
const BAG_KG={15:.75,20:1,30:1.5};
const BAG_MAX=3,BAG_AIRPORT_MARKUP=1.4;
const bagRound=n=>Math.ceil(n/5000)*5000;
function bagKm(a,b){const r=x=>x*Math.PI/180,[la,lo]=a,[lb,ob]=b,h=Math.sin(r(lb-la)/2)**2+Math.cos(r(la))*Math.cos(r(lb))*Math.sin(r(ob-lo)/2)**2;return 12742*Math.asin(Math.sqrt(h));}
function bagZone(l){const a=CT[l.from],z=CT[l.to];if(!a||!z||(a.z==='D'&&z.z==='D'))return 1;const km=bagKm(a.ll,z.ll);return km<=3600?2:km<=8000?3:4;}
function bagPrice(l,kg,cur){return GA_CUR.snap(bagRound(BAG_PRICE_20[bagZone(l)]*BAG_KG[kg]),cur);}
function bagAirportPrice(l,kg,cur){return GA_CUR.snap(bagRound(bagPrice(l,kg,cur)*BAG_AIRPORT_MARKUP),cur);}
function extraBagList(l,i){return l.extraBags?.[i]||[];}
function extraBagText(l,i){const n={};for(const x of extraBagList(l,i))n[x.kg]=(n[x.kg]||0)+1;const parts=Object.keys(n).sort((a,b)=>a-b).map(k=>n[k]+' × '+k+' kg');return parts.join(' + ');}
function bagSaleOpen(b,l,i){return tripPersonType(b,i)!=='i'&&seatSelectionOpen(b,l);}
function openBagPurchase(b,l,i){searchOverlay={kind:'bag-buy',b,l,i,stage:'pick',draft:{15:0,20:0,30:0},error:'',flightKey:seatFlightKey(b,l)};prepareSearchSheet('bag-buy');renderBagPurchase();focusSearchSheet();}
function bagDraftLines(d){const {l,b}=d;return [15,20,30].filter(k=>d.draft[k]>0).map(k=>({kg:k,count:d.draft[k],each:bagPrice(l,k,b.cur),amount:d.draft[k]*bagPrice(l,k,b.cur)}));}
function bagDraftTotal(d){return bagDraftLines(d).reduce((a,x)=>a+x.amount,0);}
function bagDraftCount(d){return [15,20,30].reduce((a,k)=>a+d.draft[k],0);}
function renderBagPurchase(){const d=searchOverlay;if(d?.kind!=='bag-buy')return;const {b,l,i}=d,open=bagSaleOpen(b,l,i),have=extraBagList(l,i).length,room=BAG_MAX-have,count=bagDraftCount(d),total=bagDraftTotal(d),zone=bagZone(l);let content,footer;
 if(!open){content='<p class="checkin-copy">Extra bags can’t be added online for this flight. Please ask at the airport.</p>';footer='<button class="btn t" data-close>Done</button>';}
 else if(d.stage==='pay'){const lines=bagDraftLines(d);d.quoted=total;content=`<dl class="trip-service-allowance seat-pay">${lines.map(x=>`<div><dt>${escHome(b.names[i])} · ${x.count} × ${x.kg} kg<small>${idr(x.each)} each</small></dt><dd>${idr(x.amount)}</dd></div>`).join('')}<div class="seat-pay-total"><dt>Total to pay</dt><dd>${idr(total)}</dd></div></dl>${d.error?`<p class="seat-error" role="alert">${d.error}</p>`:''}<p class="checkin-copy">Simulated card payment on file. Nothing is charged. Extra bags are not refundable.</p>`;footer=`<button class="btn t" data-bag-pay ${d.paying?'disabled':''}>Pay ${idr(total)}</button><button class="btn" type="button" data-bag-back>Back</button>`;}
 else{content=`${b.names.length>1?`<label class="seat-who">Traveller<select id="bag-person">${b.names.map((name,j)=>`<option value="${j}" ${i===j?'selected':''} ${tripPersonType(b,j)==='i'?'disabled':''}>${escHome(name)}${tripPersonType(b,j)==='i'?' · lap infant':''}</option>`).join('')}</select></label>`:`<div class="seat-who seat-who-single"><span>Adding bags for</span><b>${escHome(b.names[i])}</b></div>`}<p class="bag-zone">Zone ${zone} · ${BAG_ZONES[zone]}. Price per bag, up to ${BAG_MAX} extra bags each.</p>${have?`<p class="bag-have">Already added: <b>${escHome(extraBagText(l,i))}</b></p>`:''}${d.error?`<p class="seat-error" role="alert">${d.error}</p>`:''}<ul class="bag-list">${[15,20,30].map(k=>`<li><div><b>Up to ${k} kg</b><small>${idr(bagPrice(l,k,b.cur))} online · <s>${idr(bagAirportPrice(l,k,b.cur))}</s> at the airport</small></div><div class="bag-stepper" role="group" aria-label="${k} kg bags"><button type="button" data-bag-minus="${k}" aria-label="Remove a ${k} kg bag" ${d.draft[k]?'':'disabled'}>−</button><output aria-live="polite">${d.draft[k]}</output><button type="button" data-bag-plus="${k}" aria-label="Add a ${k} kg bag" ${count>=room?'disabled':''}>+</button></div></li>`).join('')}</ul>${room<=0?'<p class="bag-have">This traveller has reached the extra bag limit.</p>':''}`;
  footer=`${total>0?`<p class="seat-footer-summary seat-footer-total"><span>${count} extra bag${count===1?'':'s'}</span><b>${idr(total)}</b></p>`:''}<button class="btn t" ${total>0?'data-bag-continue':'disabled'}>Continue to payment</button>`;}
 $('#sheet').innerHTML=sheetHeading('Extra bags',escHome(b.names[i])+' · '+l.id+' · '+l.from+' → '+l.to)+`<div class="ss-content">${content}</div><footer class="ss-footer">${footer}</footer>`;}
document.addEventListener('change',e=>{const d=searchOverlay;if(d?.kind==='bag-buy'&&e.target.id==='bag-person'){d.i=+e.target.value;d.draft={15:0,20:0,30:0};d.error='';renderBagPurchase();$('#bag-person')?.focus({preventScroll:true});}});
document.addEventListener('click',e=>{if(e.target.closest('[data-bag-open]')){const c=typeof tripServiceContext==='function'?tripServiceContext():null;if(c)openBagPurchase(c.b,c.l,c.i);return}
 const d=searchOverlay;if(d?.kind!=='bag-buy')return;const {b,l,i}=d;
 const plus=e.target.closest('[data-bag-plus]'),minus=e.target.closest('[data-bag-minus]');
 if(plus||minus){const k=+(plus||minus).dataset[plus?'bagPlus':'bagMinus'];if(!BAG_KG[k]||!bagSaleOpen(b,l,i))return;if(plus&&bagDraftCount(d)<BAG_MAX-extraBagList(l,i).length)d.draft[k]++;else if(minus&&d.draft[k]>0)d.draft[k]--;d.error='';renderBagPurchase();$('#sheet [data-bag-'+(plus?'plus':'minus')+'="'+k+'"]')?.focus({preventScroll:true});}
 else if(e.target.closest('[data-bag-continue]')){if(bagDraftTotal(d)>0&&bagSaleOpen(b,l,i)){d.stage='pay';d.error='';renderBagPurchase();}}
 else if(e.target.closest('[data-bag-back]')){d.stage='pick';d.error='';renderBagPurchase();}
 else if(e.target.closest('[data-bag-pay]')){if(d.paying||!S.bookings.includes(b)||!flat(b).includes(l))return;const total=bagDraftTotal(d);
  if(!bagSaleOpen(b,l,i)||d.flightKey!==seatFlightKey(b,l)||bagDraftCount(d)+extraBagList(l,i).length>BAG_MAX||!total||total!==d.quoted){d.stage='pick';d.error='The bag prices or availability changed. Please review them again.';renderBagPurchase();return}
  d.paying=true;l.extraBags||={};const at=nowAbs();b.extras||=[];for(const x of bagDraftLines(d)){for(let n=0;n<x.count;n++)(l.extraBags[i]||=[]).push({kg:x.kg,price:x.each,at});b.extras.push({k:'svc',type:'bag',p:i,flight:l.id,dep:l.dep,person:i,name:b.names[i],kg:x.kg,count:x.count,amount:x.amount,at,method:'Credit card'})}
  if(typeof persistCounterBookings==='function')persistCounterBookings();closeSheet();if(S.stack.at(-1)==='trip')renderTrip();if(typeof toast==='function')toast('Extra bags added','You paid '+idr(total)+' for extra bags (simulated).');}
});
