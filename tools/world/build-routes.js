/* Builds typical routings for every destination in the timetable and writes tools/world/routes.json.
   Usage:  node tools/world/build-routes.js            (reads the city table from index.html)
           node tools/world/build-routes.js --embed    (also splices the result into index.html between the WORLD_ROUTES markers)
   The network: ~3,600 real VOR beacons (beacons.json, OurAirports, public domain) joined to their near neighbours, plus the hand-made ocean/gate waypoints of graph.js
   where there are no beacons (oceans, sparse regions). Airspace we do not route through (avoid.json: Russia, Ukraine, Belarus, Iran, Iraq, Syria, and a box over the
   Black Sea) is never crossed. Routes are the cheapest paths through that network: physical distance. One corridor is kept per direction; unnecessary intermediate nodes are removed when the shortcut stays clear.
   These are inferred from beacon positions, not the published airway database (which is not open data). */
const fs=require('fs'),path=require('path');
const {N,CHAINS}=require('./graph.js');
const geometry=require('./geometry.js');
const root=path.join(__dirname,'..','..'),htmlPath=path.join(root,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const air=JSON.parse(/const AIR_CITY=(\{.*?\});/s.exec(html)[1]);
/* airports added by schedule changes (schedule-changes.js) get routes too, so their flights appear on the World map */
try{global.window={};require(path.join(root,'schedule-changes.js'));(window.JN_CHANGES_REPO.changes||[]).forEach(c=>(c.airports||[]).forEach(a=>{if(a&&a.city&&!air[a.city])air[a.city]=[+a.lat,+a.lon,a.region||'E']}))}catch(e){}
const BEACONS=JSON.parse(fs.readFileSync(path.join(__dirname,'beacons.json'),'utf8')),AVOID=JSON.parse(fs.readFileSync(path.join(__dirname,'avoid.json'),'utf8'));
const unwrap=l=>l<-40?l+360:l;
const JKT=N.JKT,GATE={W:'G_W',NW:'G_NW',N:'G_N',NE:'G_NE',E:'G_E',S:'G_S'};
const rad=Math.PI/180;
const gc=(a,b)=>{const dl=(a[0]-b[0])*rad,dg=(a[1]-b[1])*rad,x=Math.sin(dl/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,x)))};
const r2=x=>Math.round(x*100000)/100000;
/* Check geodesic segments against polygon boundaries, not isolated samples. */
const exclusion=geometry.exclusions(AVOID),bad=(la,lo)=>exclusion.bad([la,lo]);
const edgeCache=new Map();
const edgeOK=(a,b)=>{const key=a.slice(0,2).join(',')+'>'+b.slice(0,2).join(',');
  if(!edgeCache.has(key))edgeCache.set(key,exclusion.clear(a,b));return edgeCache.get(key)};
const slerp=geometry.interpolate;
/* ---- nodes ---- */
const nodes=[];   // {la,lo,id,kind}  kind 0 beacon, 1 waypoint, 2 gate
const idx={};
Object.keys(N).forEach(k=>{if(k==='JKT')return;idx[k]=nodes.length;nodes.push({la:N[k][0],lo:N[k][1],id:null,kind:/^G_/.test(k)?2:1,key:k})});
BEACONS.forEach(b=>{if(bad(b[1],b[2]))return;nodes.push({la:b[1],lo:b[2],id:b[0],kind:0})});
/* Real beacons are sparse over deserts and open sea, so a path there would follow coasts and zigzag. Fill every gap with an unnamed waypoint on a 3.5 degree grid
   (kind 3); paths are pulled straight across runs of them afterwards, so those stretches come out as the great circle between the real beacons either side. */
{const have=[];BEACONS.forEach(b=>{if(!bad(b[1],b[2]))have.push([b[1],b[2]])});
 for(let la=-50;la<=70;la+=3.5)for(let lo=-25;lo<=250;lo+=3.5/Math.max(0.35,Math.cos(la*rad))){if(bad(la,lo))continue;let near=false;for(const q of have){if(Math.abs(q[0]-la)<2.6&&gc(q,[la,lo])<280){near=true;break}}if(!near)nodes.push({la,lo:Math.round(lo*100)/100,id:null,kind:3})}}
const n=nodes.length,adj=Array.from({length:n},()=>new Set());
const link=(a,b)=>{if(a===b)return;adj[a].add(b);adj[b].add(a)};
CHAINS.forEach(ch=>{for(let i=0;i+1<ch.length;i++){const a=ch[i],b=ch[i+1];if(a==='JKT'||b==='JKT')continue;if(!(a in idx)||!(b in idx))throw Error('unknown node in chain: '+a+' '+b);if(edgeOK([nodes[idx[a]].la,nodes[idx[a]].lo],[nodes[idx[b]].la,nodes[idx[b]].lo]))link(idx[a],idx[b])}});
const P=nodes.map(x=>[x.la,x.lo]);
const nearest=(i,k,maxD,filter)=>{const out=[];for(let j=0;j<n;j++){if(j===i||(filter&&!filter(j)))continue;const d=gc(P[i],P[j]);if(d<=maxD)out.push([d,j])}out.sort((a,b)=>a[0]-b[0]);return out.slice(0,k)};
nodes.forEach((x,i)=>{
  if(x.kind===0||x.kind===3){nearest(i,9,650,j=>nodes[j].kind===0||nodes[j].kind===3).forEach(([d,j])=>{if(!adj[i].has(j)&&edgeOK(P[i],P[j]))link(i,j)})}
  else if(x.kind===1){nearest(i,4,1300,j=>nodes[j].kind===0||nodes[j].kind===3).forEach(([d,j])=>{if(edgeOK(P[i],P[j]))link(i,j)})}
  else{nearest(i,4,450,j=>nodes[j].kind===0).forEach(([d,j])=>{if(edgeOK(P[i],P[j]))link(i,j)})}});
const ADJ=adj.map(s=>[...s]);
/* ---- costs and search ---- */
// No fabricated jet-stream discount: the default minimises physical distance.
const cost=(a,b)=>gc(P[a],P[b]);
class Heap{constructor(){this.a=[]}push(k,v){const a=this.a;a.push([k,v]);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;[a[p],a[i]]=[a[i],a[p]];i=p}}
  pop(){const a=this.a,t=a[0],l=a.pop();if(a.length){a[0]=l;let i=0;for(;;){let m=i;const L=2*i+1,R=L+1;if(L<a.length&&a[L][0]<a[m][0])m=L;if(R<a.length&&a[R][0]<a[m][0])m=R;if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m}}return t}
  get size(){return this.a.length}}
/* sources: [[node, initial cost]]; gates are only ever a start or the end of a path, never a stop on the way */
function search(sources,mult,stopAt){
  const dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),h=new Heap();
  sources.forEach(([s,d0])=>{if(d0<dist[s]){dist[s]=d0;h.push(d0,s)}});
  while(h.size){const [d,u]=h.pop();if(d>dist[u])continue;if(u===stopAt||(stopAt===-2&&nodes[u].kind===2))break;
    for(const v of ADJ[u]){if(nodes[v].kind===2&&v!==stopAt&&stopAt!==-2)continue;const c=d+cost(u,v)*mult[v]+(stopAt===-2&&nodes[v].kind===2?gc(JKT,P[v]):0);if(c<dist[v]){dist[v]=c;prev[v]=u;h.push(c,v)}}}
  return {dist,prev}}
const trace=(prev,t)=>{const p=[t];while(prev[p[0]]>=0)p.unshift(prev[p[0]]);return p};
/* Keep one shortest corridor per direction. Alternatives need an explicit
   scenario reason, rather than penalising the best path to manufacture variety. */
function corridors(find){const r=find(new Float32Array(n).fill(1));return r?[r]:[]}
function pull(path){return path}
const pt=i=>nodes[i].id?[r2(P[i][0]),r2(P[i][1]),nodes[i].id]:[r2(P[i][0]),r2(P[i][1])];
function nearest0(p,k,maxD,any){const o=[];for(let j=0;j<n;j++){if(any?nodes[j].kind!==1:nodes[j].kind!==0)continue;const d=gc(P[j],p);if(d<=maxD&&edgeOK(p,P[j]))o.push([d,j])}o.sort((a,b)=>a[0]-b[0]);return o.slice(0,k)}
const GATES=Object.values(GATE).map(k=>idx[k]);
/* ---- routes ---- */
const routes={},report=[];
Object.keys(air).forEach(city=>{
  const [la,lo,side]=air[city],dest=[la,unwrap(lo)],direct=gc(JKT,dest);
  let O,I,OG,IG;
  /* the gate (the fix a SID leaves by, or a STAR starts from) follows the airway: the first gate of the cheapest path. For short and domestic routes: the gate nearest the bearing to the destination. */
  const bearing=(a,b)=>Math.atan2(Math.sin((b[1]-a[1])*rad)*Math.cos(b[0]*rad),Math.cos(a[0]*rad)*Math.sin(b[0]*rad)-Math.sin(a[0]*rad)*Math.cos(b[0]*rad)*Math.cos((b[1]-a[1])*rad));
  const nearGate=()=>{let bk=null,bd=9;GATES.forEach(gi=>{let d=Math.abs(bearing(JKT,P[gi])-bearing(JKT,dest));d=Math.min(d,2*Math.PI-d);if(d<bd){bd=d;bk=gi}});return bk};
  const keyOf=gi=>nodes[gi].key.replace('G_','');
  const eastIndo=dest[1]>115&&dest[1]<142&&dest[0]>-11&&dest[0]<8&&direct<4000;     // eastern Indonesia: domestic, nearly direct
  if(direct<1500||eastIndo){const gi=nearGate();O=[[[P[gi][0],P[gi][1]],dest]];I=[[dest,[P[gi][0],P[gi][1]]]];OG=[keyOf(gi)];IG=[keyOf(gi)]}
  else{
    const attempt=cand=>{const ends=[JKT,dest];
    const out=corridors(mult=>{const r=search(GATES.map(gi=>[gi,gc(JKT,P[gi])]),mult,-1);let b=null;cand.forEach(([d,j])=>{const t=r.dist[j]+d;if(isFinite(t)&&(!b||t<b.t))b={t,j}});return b?{path:pull(trace(r.prev,b.j)),total:b.t}:null},3,ends);
    const inn=corridors(mult=>{const r=search(cand.map(([d,j])=>[j,d]),mult,-2);let bg=null;GATES.forEach(gi=>{if(isFinite(r.dist[gi])&&(bg===null||r.dist[gi]<r.dist[bg]))bg=gi});return bg===null?null:{path:pull(trace(r.prev,bg)),total:r.dist[bg]}},3,ends);
    return out.length&&inn.length?{out,inn}:null};
    let cand=nearest0(dest,4,320);if(!cand.length)cand=nearest0(dest,3,1500);
    let res=cand.length?attempt(cand):null;if(!res)res=attempt(nearest0(dest,3,3500,true));
    if(!res){report.push('NO ROUTE '+city);return}
    const {out,inn}=res;
    O=out.map(c=>[...c.path.map(pt),dest]);I=inn.map(c=>[dest,...c.path.map(pt)]);OG=out.map(c=>keyOf(c.path[0]));IG=inn.map(c=>keyOf(c.path[c.path.length-1]));
  }
  O=O.map(p=>geometry.simplify(p,edgeOK));I=I.map(p=>geometry.simplify(p,edgeOK));
  for(const p of O.concat(I))for(let j=1;j<p.length;j++)if(!edgeOK(p[j-1],p[j]))throw Error('Excluded route segment: '+city);
  const run=a=>a.reduce((s,p,q)=>q?s+gc(a[q-1],p):s,0),o=O[0],i=I[0],rp=L=>L.map(a=>a.map(p=>[r2(p[0]),r2(p[1]),...(p[2]?[p[2]]:[])]));
  routes[city]={o:rp(O),i:rp(I),og:OG,ig:IG,lo:Math.round(gc(JKT,o[0])+run(o)),li:Math.round(run(i)+gc(i[i.length-1],JKT)),gc:Math.round(direct)}});
for(const [city,r] of Object.entries(routes))for(const [dir,L] of [['o',r.o],['i',r.i]])for(const p of L){
  const full=dir==='o'?[JKT,...p]:[...p,JKT];
  for(let j=1;j<full.length;j++)if(!exclusion.clear(full[j-1],full[j]))throw Error('Invalid exported route '+city+' '+dir);
}
fs.writeFileSync(path.join(__dirname,'routes.json'),JSON.stringify(routes));
const rows=Object.keys(routes).map(c=>({c,r:routes[c],ratio:Math.max(routes[c].lo,routes[c].li)/Math.max(routes[c].gc,1)})).filter(x=>x.r.gc>=1500).sort((a,b)=>b.ratio-a.ratio);
{const cnt={};Object.keys(routes).forEach(c=>{routes[c].og.concat(routes[c].ig).forEach(k=>cnt[k]=(cnt[k]||0)+1)});console.log('gate use (route alternatives):',JSON.stringify(cnt))}
console.log('lattice waypoints:',nodes.filter(x=>x.kind===3).length);console.log('network:',n,'nodes,',ADJ.reduce((s,a)=>s+a.length,0)/2,'edges');
console.log('routes',Object.keys(routes).length,'of',Object.keys(air).length,report.join(' '));
console.log('largest detours (route length / great circle):');rows.slice(0,14).forEach(x=>console.log(' ',x.c.padEnd(26),'gc',x.r.gc,'out',x.r.lo,'in',x.r.li,'ratio',x.ratio.toFixed(2)));
console.log('destinations with alternatives:',Object.keys(routes).filter(c=>routes[c].o.length>1||routes[c].i.length>1).length);
console.log('json bytes',fs.statSync(path.join(__dirname,'routes.json')).size);
if(process.argv.includes('--embed')){
  const js='/*WORLD_ROUTES:START*/const WORLD_ROUTES='+fs.readFileSync(path.join(__dirname,'routes.json'),'utf8').replace(/,"lo":\d+,"li":\d+,"gc":\d+/g,'')+';/*WORLD_ROUTES:END*/';
  let h=html;if(h.includes('/*WORLD_ROUTES:START*/'))h=h.replace(/\/\*WORLD_ROUTES:START\*\/[\s\S]*?\/\*WORLD_ROUTES:END\*\//,()=>js);else throw Error('markers missing in index.html');
  fs.writeFileSync(htmlPath,h);console.log('embedded into index.html');}
