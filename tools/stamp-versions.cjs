/* Sets the ?v= on every local script and stylesheet in garuda/*.html to a short hash of that file's contents, and on the hidden engine frame (index.html) to a hash of index.html itself, so a changed file always gets a new URL and a phone never runs a stale copy.
   index.html is stamped first: its own hash then includes the hashes of its scripts, so the frame address changes whenever any engine file changes.
   Run it after editing any garuda script, stylesheet or page:  node tools/stamp-versions.cjs   (add --check to only report). */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../garuda'),check=process.argv.includes('--check');let stale=[],changed=0;
const hash=f=>crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0,8);
const pages=fs.readdirSync(dir).filter(f=>f.endsWith('.html')).sort((a,b)=>a==='index.html'?-1:b==='index.html'?1:a.localeCompare(b));
for(const h of pages){const file=path.join(dir,h),src=fs.readFileSync(file,'utf8');
 let out=src.replace(/((?:src|href)=")([A-Za-z0-9_./-]+\.(?:js|css))\?v=([^"]*)(")/g,(m,a,f,v,z)=>{const p=path.join(dir,f);if(!fs.existsSync(p))return m;const want=hash(p);if(v!==want)stale.push(h+': '+f+' ?v='+v+' should be '+want);return a+f+'?v='+want+z});
 /* the engine frame: index.html, with any existing query kept after the version */
 out=out.replace(/(<iframe[^>]*\bsrc=")index\.html(?:\?([^"]*))?(")/g,(m,a,q,z)=>{const parts=(q||'').split('&').filter(x=>x&&!/^v=/.test(x)),want='v='+hash(path.join(dir,'index.html')),have=(q||'').split('&').find(x=>/^v=/.test(x));if(have!==want)stale.push(h+': engine frame index.html '+(have||'(no version)')+' should be '+want);return a+'index.html?'+[want].concat(parts).join('&')+z});
 if(out!==src&&!check){fs.writeFileSync(file,out);changed++}}
if(check){if(stale.length){console.error('STALE VERSION STRINGS\n'+stale.join('\n'));process.exit(1)}console.log('version strings are current')}else console.log('stamped '+changed+' file(s), '+stale.length+' version(s) updated');
