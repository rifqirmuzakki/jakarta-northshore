/* Storage adapter for everything the simulator persists (bookings, sold counts, settings).
   The rest of the app only calls GA_STORE, never localStorage directly, so the backend can be swapped
   (IndexedDB, then a shared database) without touching the booking, seat or terminal code.
   The API is synchronous: values are JSON, reads come from the backend on every call so two open pages
   always agree, and onChange fires when ANOTHER page changes a key. */
(function(){
 var backend={
  read:function(k){return localStorage.getItem(k)},
  write:function(k,s){localStorage.setItem(k,s)},
  del:function(k){localStorage.removeItem(k)},
  /* calls fn(key) when another page changed a key; key is null when everything was cleared */
  watch:function(fn){window.addEventListener('storage',function(e){fn(e.key)})}
 };
 var watchers={};
 var GA_STORE={
  get:function(k,d){try{var s=backend.read(k);if(s==null)return d;var v=JSON.parse(s);return v==null?d:v}catch(e){return d}},
  set:function(k,v){try{backend.write(k,JSON.stringify(v));return true}catch(e){return false}},
  remove:function(k){try{backend.del(k);return true}catch(e){return false}},
  has:function(k){try{return backend.read(k)!=null}catch(e){return false}},
  onChange:function(k,fn){(watchers[k]||(watchers[k]=[])).push(fn)},
  backend:'localStorage'
 };
 try{backend.watch(function(k){var list=k==null?[].concat.apply([],Object.keys(watchers).map(function(x){return watchers[x]})):watchers[k]||[];list.forEach(function(fn){try{fn(k)}catch(e){}})})}catch(e){}
 window.GA_STORE=GA_STORE;
})();
