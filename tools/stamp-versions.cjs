/* Sets the ?v= on every local script and stylesheet in garuda/*.html to a short hash of that file's contents, so a changed file always gets a new URL and a phone never runs a stale copy. Run it after editing any garuda script or stylesheet:  node tools/stamp-versions.cjs   (add --check to only report). */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../garuda'),check=process.argv.includes('--check');let stale=[],changed=0;
const hash=f=>crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0,8);
for(const h of fs.readdirSync(dir).filter(f=>f.endsWith('.html'))){const file=path.join(dir,h),src=fs.readFileSync(file,'utf8');
 const out=src.replace(/((?:src|href)=")([A-Za-z0-9_./-]+\.(?:js|css))\?v=([^"]*)(")/g,(m,a,f,v,z)=>{const p=path.join(dir,f);if(!fs.existsSync(p))return m;const want=hash(p);if(v!==want){stale.push(h+': '+f+' ?v='+v+' should be '+want)}return a+f+'?v='+want+z});
 if(out!==src&&!check){fs.writeFileSync(file,out);changed++}}
if(check){if(stale.length){console.error('STALE VERSION STRINGS\n'+stale.join('\n'));process.exit(1)}console.log('version strings are current')}else console.log('stamped '+changed+' file(s), '+stale.length+' version(s) updated');
