/* Charging currency. A booking is priced and paid in the currency of the first point of origin (the first
   departure of the first direction). Indonesian origins stay in IDR.
   Fares are still built in IDR by the pricing engine, then snapped UP to whole multiples of one "unit"
   (rate x friendly step), so every amount, sum and refund is an exact number of local steps and a booking's
   lines always add to its total. The rate in force when the booking is made is locked on the booking (b.cur);
   later rate changes only affect new sales and the new side of a change.
   Rates are illustrative IDR per unit. A different table can be saved as GA_STORE 'ga-fx' = {asOf, rates:{CODE:n}}. */
(function(){
 var DEFAULT={asOf:'2026-11-01',rates:{IDR:1,SGD:12000,MYR:3700,USD:16000,EUR:17500,GBP:20500,AUD:10500,NZD:9700,CAD:11700,CHF:18500,JPY:105,KRW:12,CNY:2200,HKD:2050,MOP:2000,TWD:500,THB:450,PHP:285,VND:0.65,AED:4350,SAR:4270,QAR:4400,OMR:41500,JOD:22500,INR:190,LKR:53,BDT:133,NPR:119,MVR:1040,BND:12000,SEK:1500,NOK:1500,DKK:2350,CZK:700,HUF:45,TRY:400,AZN:9400,ZAR:900,ETB:120,KES:125,MAD:1700,ARS:16,CLP:17,BRL:2900}};
 /* friendly rounding step per currency, in that currency's own units */
 var STEP={IDR:1,SGD:1,MYR:1,USD:1,EUR:1,GBP:1,AUD:1,NZD:1,CAD:1,CHF:1,JPY:100,KRW:1000,CNY:5,HKD:5,MOP:5,TWD:50,THB:50,PHP:50,VND:10000,AED:5,SAR:5,QAR:5,OMR:1,JOD:1,INR:10,LKR:100,BDT:100,NPR:50,MVR:10,BND:1,SEK:10,NOK:10,DKK:5,CZK:50,HUF:500,TRY:50,AZN:1,ZAR:10,ETB:50,KES:100,MAD:10,ARS:500,CLP:500,BRL:5};
 var TZ={'Asia/Singapore':'SGD','Asia/Kuala_Lumpur':'MYR','Asia/Kuching':'MYR','Asia/Tokyo':'JPY','Asia/Seoul':'KRW','Asia/Shanghai':'CNY','Asia/Hong_Kong':'HKD','Asia/Macau':'MOP','Asia/Taipei':'TWD','Asia/Bangkok':'THB','Asia/Manila':'PHP','Asia/Ho_Chi_Minh':'VND','Asia/Dubai':'AED','Asia/Riyadh':'SAR','Asia/Qatar':'QAR','Asia/Muscat':'OMR','Asia/Amman':'JOD','Asia/Kolkata':'INR','Asia/Colombo':'LKR','Asia/Dhaka':'BDT','Asia/Kathmandu':'NPR','Indian/Maldives':'MVR','Asia/Brunei':'BND','Asia/Baku':'AZN',
  'Europe/London':'GBP','Europe/Paris':'EUR','Europe/Amsterdam':'EUR','Europe/Berlin':'EUR','Europe/Rome':'EUR','Europe/Vienna':'EUR','Europe/Lisbon':'EUR','Europe/Brussels':'EUR','Europe/Athens':'EUR','Europe/Helsinki':'EUR','Europe/Madrid':'EUR','Europe/Zurich':'CHF','Europe/Stockholm':'SEK','Europe/Oslo':'NOK','Europe/Copenhagen':'DKK','Europe/Prague':'CZK','Europe/Budapest':'HUF','Europe/Istanbul':'TRY',
  'Australia/Sydney':'AUD','Australia/Melbourne':'AUD','Australia/Perth':'AUD','Australia/Brisbane':'AUD','Australia/Adelaide':'AUD','Australia/Darwin':'AUD','Pacific/Auckland':'NZD','America/Los_Angeles':'USD','America/Chicago':'USD','America/New_York':'USD','Pacific/Honolulu':'USD','America/Vancouver':'CAD','America/Sao_Paulo':'BRL','America/Argentina/Buenos_Aires':'ARS','America/Santiago':'CLP','Africa/Johannesburg':'ZAR','Africa/Addis_Ababa':'ETB','Africa/Nairobi':'KES','Africa/Casablanca':'MAD'};
 function table(){var o=null;try{o=window.GA_STORE&&window.GA_STORE.get('ga-fx',null)}catch(e){}var r=Object.assign({},DEFAULT.rates);if(o&&o.rates)for(var k in o.rates)if(o.rates[k]>0)r[k]=o.rates[k];return{asOf:(o&&o.asOf)||DEFAULT.asOf,rates:r}}
 function forCity(city,CT){var c=(CT||(window.GA_NET&&window.GA_NET.cities)||{})[city];if(!c)return 'IDR';if(c.z==='D')return 'IDR';return TZ[c.tz]||'USD'}
 function lock(code){var t=table(),r=t.rates[code]||1;return code==='IDR'||!t.rates[code]?{code:'IDR',rate:1,asOf:t.asOf}:{code:code,rate:r,asOf:t.asOf}}
 function unit(cur){return cur.rate*(STEP[cur.code]||1)}
 function snap(idr,cur){if(!cur||cur.code==='IDR')return idr;var u=unit(cur);return Math.ceil(Math.round(idr/u*1e6)/1e6)*u}
 function local(idr,cur){return Math.round(idr/cur.rate)}
 /* IDR keeps the app's existing look (rounded to IDR 1,000); other currencies show whole local units */
 function fmt(idr,cur){cur=cur||api.active;if(!cur||cur.code==='IDR')return 'IDR '+(Math.round(idr/1000)*1000).toLocaleString('en-US');return cur.code+' '+local(snap(idr,cur),cur).toLocaleString('en-US')}
 function num(idr,cur){cur=cur||api.active;if(!cur||cur.code==='IDR')return (Math.round(idr/1000)*1000).toLocaleString('en-US');return local(snap(idr,cur),cur).toLocaleString('en-US')}
 /* "IDR 450,000" inside fare-rule text becomes the booking currency, rounded up to its step */
 function text(str,cur){cur=cur||api.active;if(!cur||cur.code==='IDR'||typeof str!=='string')return str;return str.replace(/IDR\s*([\d,]+)/g,function(m,n){return fmt(snap(+n.replace(/,/g,''),cur),cur)})}
 var api={DEFAULT:DEFAULT,STEP:STEP,table:table,forCity:forCity,lock:lock,unit:unit,snap:snap,local:local,fmt:fmt,num:num,text:text,active:{code:'IDR',rate:1},
  /* what a typed local amount is worth in IDR */
  toIdr:function(n,cur){cur=cur||api.active;return Math.round(n*cur.rate)},
  use:function(cur){api.active=cur&&cur.code?cur:{code:'IDR',rate:1};return api.active},
  /* A change or reissue is priced at today's rate. The booking is first re-expressed at that rate: every stored
     amount is scaled by new/old, so what the customer paid, in their own currency, is exactly unchanged. */
  relock:function(b){var cur=b&&b.cur;if(!cur||cur.code==='IDR')return false;var t=table(),r=t.rates[cur.code];if(!r||r===cur.rate)return false;var k=r/cur.rate;
   var sc=function(o,keys){if(o)keys.forEach(function(x){if(typeof o[x]==='number')o[x]=Math.round(o[x]*k)})},P=['fare','tax','chg','total'];
   sc(b,P.concat(['paid','paid0']));sc(b.payment,['tendered','change']);(b.dirPrices||[]).forEach(function(p){sc(p,P)});
   (b.reissues||[]).forEach(function(x){sc(x,['collected','fee','diff'])});
   if(b.cancelled){sc(b.cancelled,['refund']);(b.cancelled.rows||[]).forEach(function(x){sc(x,['paid','fee','refund'])})}
   if(b.discount&&b.discount.base)b.discount.base.forEach(function(p){sc(p,P)});
   (b.extras||[]).forEach(function(x){sc(x,['amount'])});if(b.award)sc(b.award,['cash']);
   (b.dirs||[]).forEach(function(d){(d.legs||[]).forEach(function(l){Object.keys(l.extraBags||{}).forEach(function(i){l.extraBags[i].forEach(function(x){sc(x,['price'])})})})});
   b.cur={code:cur.code,rate:r,asOf:t.asOf};return true},
  ofBooking:function(b){return b&&b.cur&&b.cur.code?b.cur:{code:'IDR',rate:1}},
  /* the booking's origin: first departure of the first direction */
  originOf:function(q){return q&&q.multi&&q.multi.length?q.multi[0].from:q&&q.from}};
 window.GA_CUR=api;
})();
