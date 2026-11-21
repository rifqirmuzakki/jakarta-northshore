/* Add-on services (simulated): a pre-ordered meal, lounge access and priority boarding for one traveller on one
   flight, and travel insurance for the whole booking. Priced in IDR by route zone (same zones as extra bags),
   snapped to the booking currency, bought online until the airport cutoff. Business includes the lounge, priority
   boarding and a meal choice; Premium Economy includes priority boarding. Purchases are kept on the leg
   (l.addons[traveller]) or the booking (b.insurance) and recorded as booking extras. */
const ADDON_MEAL_20={1:90000,2:125000,3:165000,4:210000};
const ADDON_LOUNGE={1:300000,2:380000,3:450000,4:520000};
const ADDON_PRIORITY={1:90000,2:120000,3:150000,4:180000};
const ADDON_INSURANCE_RATE=0.045;
const ADDON_MEALS=[['rendang','Beef rendang with steamed rice'],['herb-chicken','Chicken in herb cream sauce'],['veg-curry','Tofu and vegetable curry']];
const ADDON_SNACKS=[['snack-sweet','Sweet snack box'],['snack-savoury','Savoury snack box'],['snack-veg','Vegetarian snack box']];
const addonSnap=(n,b)=>GA_CUR.snap(Math.ceil(n/5000)*5000,b.cur);
function addonIsMeal(l){return hasMeal(l);}
function addonMenu(l){return addonIsMeal(l)?ADDON_MEALS:ADDON_SNACKS;}
function addonIncluded(b,l,kind){const cab=bookingCabin(b,l);return kind==='lounge'?cab==='Business':kind==='priority'?cab==='Business'||cab==='Premium':kind==='meal'?cab==='Business':false;}
function addonPrice(b,l,kind){if(addonIncluded(b,l,kind))return 0;const z=bagZone(l);return addonSnap(kind==='meal'?ADDON_MEAL_20[z]*(addonIsMeal(l)?1:.6):kind==='lounge'?ADDON_LOUNGE[z]:ADDON_PRIORITY[z],b);}
function addonInsurancePrice(b){return addonSnap(b.total*ADDON_INSURANCE_RATE,b);}
function addonHave(l,i){return l.addons?.[i]||{};}
function addonSaleOpen(b,l,i){return tripPersonType(b,i)!=='i'&&seatSelectionOpen(b,l);}
function addonInsuranceOpen(b){return !b.insurance&&!b.cancelled&&flat(b).length>0&&flat(b).some(l=>seatSelectionOpen(b,l));}
function openAddons(b,l,i){searchOverlay={kind:'addons',b,l,i,stage:'pick',draft:{meal:null,lounge:false,priority:false,insurance:false},error:'',flightKey:seatFlightKey(b,l)};prepareSearchSheet('addons');renderAddons();focusSearchSheet();}
function addonLines(d){const {b,l}=d,have=addonHave(l,d.i),out=[];
 if(d.draft.meal&&!have.meal){const m=addonMenu(l).find(x=>x[0]===d.draft.meal);if(m)out.push({type:'meal',label:m[1],item:m[0],amount:addonPrice(b,l,'meal')})}
 if(d.draft.lounge&&!have.lounge)out.push({type:'lounge',label:'Lounge access at '+l.from,amount:addonPrice(b,l,'lounge')});
 if(d.draft.priority&&!have.priority)out.push({type:'priority',label:'Priority boarding',amount:addonPrice(b,l,'priority')});
 if(d.draft.insurance&&addonInsuranceOpen(b))out.push({type:'insurance',label:'Travel insurance, whole booking',amount:addonInsurancePrice(b)});return out;}
function addonTotal(d){return addonLines(d).reduce((a,x)=>a+x.amount,0);}
function renderAddons(){const d=searchOverlay;if(d?.kind!=='addons')return;const {b,l,i}=d,open=addonSaleOpen(b,l,i),have=addonHave(l,i),lines=addonLines(d),total=addonTotal(d);let content,footer;
 const cell=(kind,title,sub,price,owned,key)=>`<li><label class="addon-row"><input type="checkbox" data-addon-toggle="${key}" ${d.draft[key]||owned?'checked':''} ${owned||!open&&key!=='insurance'?'disabled':''}><span><b>${title}</b><small>${sub}</small></span><em>${owned?'Added':price===0?'Included':idr(price)}</em></label></li>`;
 if(!open&&!addonInsuranceOpen(b)){content='<p class="checkin-copy">Add-ons can’t be added online for this flight. Please ask at the airport.</p>';footer='<button class="btn t" data-close>Done</button>';}
 else if(d.stage==='pay'){d.quoted=total;content=`<dl class="trip-service-allowance seat-pay">${lines.map(x=>`<div><dt>${escHome(x.label)}${x.type==='insurance'?'':'<small>'+escHome(b.names[i])+' · '+escHome(l.id)+'</small>'}</dt><dd>${x.amount?idr(x.amount):'Included'}</dd></div>`).join('')}<div class="seat-pay-total"><dt>Total to pay</dt><dd>${idr(total)}</dd></div></dl>${d.error?`<p class="seat-error" role="alert">${d.error}</p>`:''}<p class="checkin-copy">Simulated card payment on file. Nothing is charged. Add-ons are not refundable.</p>`;footer=`<button class="btn t" data-addon-pay ${d.paying?'disabled':''}>Pay ${idr(total)}</button><button class="btn" type="button" data-addon-back>Back</button>`;}
 else{const menu=addonMenu(l),mp=addonPrice(b,l,'meal');
  content=`${b.names.length>1?`<label class="seat-who">Traveller<select id="addon-person">${b.names.map((name,j)=>`<option value="${j}" ${i===j?'selected':''} ${tripPersonType(b,j)==='i'?'disabled':''}>${escHome(name)}${tripPersonType(b,j)==='i'?' · lap infant':''}</option>`).join('')}</select></label>`:`<div class="seat-who seat-who-single"><span>Adding for</span><b>${escHome(b.names[i])}</b></div>`}${d.error?`<p class="seat-error" role="alert">${d.error}</p>`:''}`
  +(open?`<h3 class="addon-h">${addonIsMeal(l)?'Pre-order your meal':'Pre-order a snack box'}<small>${escHome(l.id)} · ${l.from} → ${l.to}</small></h3>${have.meal?`<p class="bag-have">Ordered: <b>${escHome((menu.find(x=>x[0]===have.meal)||[0,have.meal])[1])}</b></p>`:`<div class="trip-preference-options" role="radiogroup" aria-label="Meal">${menu.map(([k,name])=>`<button type="button" role="radio" data-addon-meal="${k}" aria-checked="${d.draft.meal===k}"><span>${escHome(name)} <small>${mp?idr(mp):'Included'}</small></span><i></i></button>`).join('')}${d.draft.meal?'<button type="button" class="addon-clear" data-addon-meal="">No pre-order</button>':''}</div>`}<h3 class="addon-h">On the day</h3><ul class="addon-list">${cell('lounge','Lounge access','Departure lounge at '+l.from,addonPrice(b,l,'lounge'),!!have.lounge,'lounge')}${cell('priority','Priority boarding','Board in the first group',addonPrice(b,l,'priority'),!!have.priority,'priority')}</ul>`:'')
  +(addonInsuranceOpen(b)?`<h3 class="addon-h">Cover your trip</h3><ul class="addon-list">${cell('insurance','Travel insurance','Cancellation, delay and baggage cover for every traveller. Simulated: no real policy.',addonInsurancePrice(b),false,'insurance')}</ul>`:b.insurance?`<p class="bag-have">Travel insurance is on this booking.</p>`:'');
  footer=`${total>0?`<p class="seat-footer-summary seat-footer-total"><span>${lines.length} item${lines.length===1?'':'s'}</span><b>${idr(total)}</b></p>`:''}<button class="btn t" ${lines.length?'data-addon-continue':'disabled'}>${total>0?'Continue to payment':lines.length?'Add included items':'Continue to payment'}</button>`;}
 $('#sheet').innerHTML=sheetHeading('Extras',escHome(b.names[i])+' · '+l.id+' · '+l.from+' → '+l.to)+`<div class="ss-content">${content}</div><footer class="ss-footer">${footer}</footer>`;}
document.addEventListener('change',e=>{const d=searchOverlay;if(d?.kind!=='addons')return;if(e.target.id==='addon-person'){d.i=+e.target.value;d.draft={meal:null,lounge:false,priority:false,insurance:d.draft.insurance};d.error='';renderAddons();$('#addon-person')?.focus({preventScroll:true});}
 else if(e.target.dataset.addonToggle){const k=e.target.dataset.addonToggle;d.draft[k]=e.target.checked;d.error='';renderAddons();$('#sheet [data-addon-toggle="'+k+'"]')?.focus({preventScroll:true});}});
document.addEventListener('click',e=>{if(e.target.closest('[data-addon-open]')){const c=typeof tripServiceContext==='function'?tripServiceContext():null;if(c)openAddons(c.b,c.l,c.i);return}
 const d=searchOverlay;if(d?.kind!=='addons')return;const {b,l,i}=d;const m=e.target.closest('[data-addon-meal]');
 if(m){if(!addonSaleOpen(b,l,i))return;d.draft.meal=m.dataset.addonMeal||null;d.error='';renderAddons();$('#sheet [aria-checked="true"]')?.focus({preventScroll:true});}
 else if(e.target.closest('[data-addon-continue]')){const lines=addonLines(d);if(!lines.length)return;if(addonTotal(d)===0){applyAddons(d,lines);return}d.stage='pay';d.error='';renderAddons();}
 else if(e.target.closest('[data-addon-back]')){d.stage='pick';d.error='';renderAddons();}
 else if(e.target.closest('[data-addon-pay]')){if(d.paying||!S.bookings.includes(b)||!flat(b).includes(l))return;const lines=addonLines(d),total=addonTotal(d);
  if(!lines.length||d.flightKey!==seatFlightKey(b,l)||!(addonSaleOpen(b,l,i)||lines.every(x=>x.type==='insurance'))||total!==d.quoted){d.stage='pick';d.error='The prices or availability changed. Please review them again.';renderAddons();return}
  applyAddons(d,lines);}
});
function applyAddons(d,lines){const {b,l,i}=d;if(d.paying)return;d.paying=true;const at=nowAbs();b.extras||=[];l.addons||={};
 for(const x of lines){if(x.type==='insurance'){b.insurance={amount:x.amount,at,method:'Credit card'};b.extras.push({k:'svc',type:'insurance',p:null,flight:null,amount:x.amount,at,method:'Credit card'});continue}
  (l.addons[i]||={})[x.type]=x.type==='meal'?x.item:true;b.extras.push({k:'svc',type:x.type,p:i,flight:l.id,dep:l.dep,name:b.names[i],item:x.item||null,amount:x.amount,at,method:'Credit card'});}
 if(typeof persistCounterBookings==='function')persistCounterBookings();closeSheet();if(S.stack.at(-1)==='trip')renderTrip();const total=lines.reduce((a,x)=>a+x.amount,0);
 if(typeof toast==='function')toast('Extras added',total?'You paid '+idr(total)+' for your extras (simulated).':'Your included extras are added.');}

/* short text for the trip services tile and the booking details rows */
function addonSummary(b,l,i){const h=addonHave(l,i),n=[h.meal?'Meal':'',h.lounge?'Lounge':'',h.priority?'Priority':'',b.insurance?'Insurance':''].filter(Boolean);return n.length?n.join(' · '):'Nothing added';}
function extraLabel(x){const who=x.name?' · '+x.name:'',fl=x.flight?' · '+x.flight:'';
 if(x.type==='seat')return 'Seat '+x.seat+fl+who;if(x.type==='bag')return x.count+' × '+x.kg+' kg extra bag'+(x.count>1?'s':'')+fl+who;
 if(x.type==='meal')return 'Pre-ordered meal'+fl+who;if(x.type==='lounge')return 'Lounge access'+fl+who;if(x.type==='priority')return 'Priority boarding'+fl+who;if(x.type==='insurance')return 'Travel insurance';return 'Extra service';}
