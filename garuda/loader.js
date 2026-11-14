/* Garuda loader: shows a branded wait on the steps that would take a moment in a real app. */
(function(){
 var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 /* Automated test runs skip the waits, unless a page asks for them with ?loader=1 */
 var auto=navigator.webdriver&&!/[?&]loader=1/.test(location.search);
 var host=document.querySelector('.phone')||document.body;
 var P=['M4 84C30 78 52 62 62 38','M16 84C42 80 66 66 78 40','M30 84C56 82 82 70 96 44','M46 84C70 84 96 74 112 50','M62 38C64 22 72 10 86 4','M78 40C80 28 88 18 100 14'];
 var el=document.createElement('div');el.className='ga-loader';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('aria-hidden','true');
 el.innerHTML='<div class="ga-loader-inner" tabindex="-1"><img class="ga-loader-logo" src="assets/garuda-logo-white.svg" alt="Garuda Indonesia" width="178" height="41"><svg class="ga-wing" viewBox="0 0 120 90" fill="none" stroke-linecap="round" aria-hidden="true">'+P.map(function(d){return '<path d="'+d+'"/>'}).join('')+'</svg><p class="ga-loader-msg"></p><p class="ga-loader-sub"></p><div class="ga-loader-bar" aria-hidden="true"><i></i></div></div>';
 host.appendChild(el);
 var msg=el.querySelector('.ga-loader-msg'),sub=el.querySelector('.ga-loader-sub'),timers=[],busy=false;
 function clear(){timers.forEach(clearTimeout);timers=[]}
 function set(line){var t=Array.isArray(line)?line:[line,''];msg.textContent=t[0]||'';sub.textContent=t[1]||''}
 function show(lines,opts){opts=opts||{};clear();busy=true;el.classList.toggle('splash',!!opts.splash);set(lines[0]);el.setAttribute('aria-hidden','false');el.classList.add('on');
  try{el.querySelector('.ga-loader-inner').focus({preventScroll:true})}catch(e){}
  for(var i=1;i<lines.length;i++)(function(i){timers.push(setTimeout(function(){msg.classList.add('swap');setTimeout(function(){set(lines[i]);msg.classList.remove('swap')},180)},i*(opts.step||750)))})(i)}
 function hide(){clear();busy=false;el.classList.remove('on');el.setAttribute('aria-hidden','true')}
 /* Steps that wait: [lines, duration in ms, optional check that must pass first] */
 var STEPS={
  '#goRes':[[['Finding flights for you','Checking schedules and fares']],1100],
  '#payBtn':[[['Confirming your seats','Holding your fare'],['Issuing your e-tickets','Almost there']],2200],
  '#home-confirm-checkin':[[['Checking you in','Confirming your seats'],['Preparing your boarding pass']],1500],
  '#confirmOpt':[[['Updating your booking','Finding the next best flight']],1200]
 };
 document.addEventListener('click',function(e){
  if(auto)return;
  if(busy){e.preventDefault();e.stopPropagation();return}
  for(var sel in STEPS){
   var b=e.target.closest&&e.target.closest(sel);if(!b)continue;
   if(b.dataset.gaGo){delete b.dataset.gaGo;return}
   if(b.disabled)return;var s=STEPS[sel];if(s[2]&&!s[2]())return;
   e.preventDefault();e.stopImmediatePropagation();
   var lines=s[0].map(function(x){return x}),ms=reduce?Math.min(s[1],600):s[1]+Math.round(Math.random()*350);
   show(lines.length>1?lines.map(function(l){return l}):lines,{step:Math.round(ms/Math.max(2,lines.length))});
   (function(b){setTimeout(function(){hide();b.dataset.gaGo='1';b.click()},ms)})(b);
   return}
 },true);
 /* A short branded splash, once per session */
 try{if(!auto&&!/[?&]s=/.test(location.search)&&!sessionStorage.getItem('ga-splash')){sessionStorage.setItem('ga-splash','1');show([['','']],{splash:true});setTimeout(hide,reduce?500:1300)}}catch(e){}
 window.GA_LOADER={show:show,hide:hide};
})();
