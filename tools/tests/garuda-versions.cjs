/* Every local script and stylesheet in garuda/*.html carries a ?v= that matches its contents, so a phone can never run a stale copy after a change. Fix with: node tools/stamp-versions.cjs */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const r=spawnSync(process.execPath,[path.resolve(__dirname,'../stamp-versions.cjs'),'--check'],{encoding:'utf8'});
if(r.status!==0){console.error(r.stderr||r.stdout);process.exit(1)}
console.log('PASS: script and stylesheet version strings match their contents');
