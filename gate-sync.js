/* Share the current airport departure board's assigned stands with the passenger app. */
(function(){'use strict';
 var key='jn-departure-gates-v1',previous='';
 function publish(){try{var core=window.SIMCORE;if(!core||!core.FLEET||!Number.isInteger(core.FLEET.day)||!core.ENTS||!core.ENTS.length)return;var rows=[];core.ENTS.forEach(function(e){if(!e.d||!e.stand||!Number.isFinite(e.d.t))return;rows.push({id:String(e.d.id||'').toUpperCase().replace(/\s+/g,''),minute:e.d.t,gate:e.stand.id,terminal:e.stand.term})});if(!rows.length)return;var data={day:core.FLEET.day,rows:rows},signature=JSON.stringify(data);if(signature===previous)return;previous=signature;localStorage.setItem(key,JSON.stringify(data))}catch(e){}}
 window.JN_GATE_SYNC={publish:publish};setInterval(publish,5000);publish();
})();
