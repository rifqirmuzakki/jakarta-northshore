/* Builds typical routings for every destination in the timetable and writes tools/world/routes.json.
   Usage:  node tools/world/build-routes.js            (reads the city table from index.html)
           node tools/world/build-routes.js --embed    (also splices the result into index.html between the WORLD_ROUTES markers)
   The network: ~3,600 real VOR beacons (beacons.json, OurAirports, public domain) joined to their near neighbours, plus the hand-made ocean/gate waypoints of graph.js
   where there are no beacons (oceans, sparse regions). Airspace we do not route through (avoid.json: Russia, Ukraine, Belarus, Iran, Iraq, Syria, and a box over the
   Black Sea) is never crossed. Routes are the cheapest paths through that network: distance, with the jet stream behind (eastbound) cheaper and in front (westbound)
   dearer, so the track out and the track back can differ. Up to three genuinely different corridors are kept per direction.
   These are inferred from beacon positions, not the published airway database (which is not open data). */
const fs=require('fs'),path=require('path');
const {N,CHAINS}=require('./graph.js');
const root=path.join(__dirname,'..','..'),htmlPath=path.join(root,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const air=JSON.parse(/const AIR_CITY=(\{.*?\});/s.exec(html)[1]);
const BEACONS=JSON.parse(fs.readFileSync(path.join(__dirname,'beacons.json'),'utf8')),AVOID=JSON.parse(fs.readFileSync(path.join(__dirname,'avoid.json'),'utf8'));
const unwrap=l=>l<-40?l+360:l;
const JKT=N.JKT,GATE={W:'G_W',NW:'G_NW',N:'G_N',NE:'G_NE',E:'G_E',S:'G_S'};
const rad=Math.PI/180;
const gc=(a,b)=>{const dl=(a[0]-b[0])*rad,dg=(a[1]-b[1])*rad,x=Math.sin(dl/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,x)))};
const r2=x=>Math.round(x*100)/100;
/* ---- airspace to avoid ---- */
const pip=(ring,x,y)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
const bad=(la,lo)=>{if(la>42.2&&la<46.2&&lo>28.3&&lo<41)return true;for(const p of AVOID){const b=p.b;if(lo<b[0]||lo>b[2]||la<b[1]||la>b[3])continue;if(pip(p.r,lo,la))return true}return false};
function slerp(a,b,t){const A=[Math.cos(a[0]*rad)*Math.cos(a[1]*rad),Math.cos(a[0]*rad)*Math.sin(a[1]*rad),Math.sin(a[0]*rad)],B=[Math.cos(b[0]*rad)*Math.cos(b[1]*rad),Math.cos(b[0]*rad)*Math.sin(b[1]*rad),Math.sin(b[0]*rad)];
  const om=Math.acos(Math.max(-1,Math.min(1,A[0]*B[0]+A[1]*B[1]+A[2]*B[2]))),so=Math.sin(om);if(so<1e-6)return a;const c1=Math.sin((1-t)*om)/so,c2=Math.sin(t*om)/so;
  const v=[c1*A[0]+c2*B[0],c1*A[1]+c2*B[1],c1*A[2]+c2*B[2]];let lo=Math.atan2(v[1],v[0])/rad;while(lo-a[1]>180)lo-=360;while(lo-a[1]<-180)lo+=360;return [Math.asin(Math.max(-1,Math.min(1,v[2])))/rad,lo]}
const edgeOK=(a,b)=>{const d=gc(a,b),n=Math.max(1,Math.ceil(d/50));for(let s=1;s<n;s++){const p=slerp(a,b,s/n);if(bad(p[0],p[1]))return false}return true};
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
CHAINS.forEach(ch=>{for(let i=0;i+1<ch.length;i++){const a=ch[i],b=ch[i+1];if(a==='JKT'||b==='JKT')continue;if(!(a in idx)||!(b in idx))throw Error('unknown node in chain: '+a+' '+b);link(idx[a],idx[b])}});
const P=nodes.map(x=>[x.la,x.lo]);
const nearest=(i,k,maxD,filter)=>{const out=[];for(let j=0;j<n;j++){if(j===i||(filter&&!filter(j)))continue;const d=gc(P[i],P[j]);if(d<=maxD)out.push([d,j])}out.sort((a,b)=>a[0]-b[0]);return out.slice(0,k)};
nodes.forEach((x,i)=>{
  if(x.kind===0||x.kind===3){nearest(i,9,650,j=>nodes[j].kind===0||nodes[j].kind===3).forEach(([d,j])=>{if(!adj[i].has(j)&&edgeOK(P[i],P[j]))link(i,j)})}
  else if(x.kind===1){nearest(i,4,1300,j=>nodes[j].kind===0||nodes[j].kind===3).forEach(([d,j])=>{if(edgeOK(P[i],P[j]))link(i,j)})}
  else{nearest(i,4,450,j=>nodes[j].kind===0).forEach(([d,j])=>{if(edgeOK(P[i],P[j]))link(i,j)})}});
const ADJ=adj.map(s=>[...s]);
/* ---- costs and search ---- */
const jet=lat=>Math.max(0,1-Math.abs((Math.abs(lat)-40)/22));
const cost=(a,b)=>{const A=P[a],B=P[b],len=gc(A,B),mid=(A[0]+B[0])/2,ef=((B[1]-A[1])*Math.cos(mid*rad)*111.2)/Math.max(len,1);return len*(1-0.10*ef*jet(mid))};
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
/* dense samples along a path, to compare corridors */
function dense(path,step){const o=[];for(let i=0;i+1<path.length;i++){const a=P[path[i]],b=P[path[i+1]],d=gc(a,b),m=Math.max(1,Math.ceil(d/step));for(let s=0;s<m;s++)o.push(slerp(a,b,s/m))}o.push(P[path[path.length-1]]);return o}
const farFrac=(B,A,km)=>{let f=0;B.forEach(p=>{let m=1e9;for(const q of A){const d=gc(p,q);if(d<m){m=d;if(m<km)break}}if(m>=km)f++});return f/Math.max(1,B.length)};
/* up to K corridors: the best path, then repeat with every node near the best paths made dearer; keep paths that really lie elsewhere (a quarter of their length 120+ km from the others) and cost within 25% */
function corridors(find,K,endsNear){const mult=new Float32Array(n).fill(1),keep=[];
  for(let it=0;it<7&&keep.length<K;it++){const r=find(mult);if(!r)break;
    const D=dense(r.path,60);
    if(!keep.length||keep.every(k=>farFrac(D,k.D,120)>=0.25))keep.push({path:r.path,total:r.total,D});
    for(let j=0;j<n;j++){if(nodes[j].kind===2)continue;let near=false;for(let s=0;s<D.length;s+=2){if(Math.abs(P[j][0]-D[s][0])<1.6&&gc(P[j],D[s])<150){near=true;break}}
      if(near&&endsNear.every(e=>gc(P[j],e)>350))mult[j]*=3.2}}
  keep.sort((a,b)=>a.total-b.total);return keep.filter(k=>k.total<=keep[0].total*1.25)}
/* string pulling: between two real nodes, drop the unnamed lattice waypoints when the direct line stays clear of the airspace we avoid */
function pull(path){const out=[path[0]];let i=0;
  while(i<path.length-1){let best=i+1;for(let k=i+2;k<path.length;k++){if(nodes[path[k-1]].kind!==3)break;if(edgeOK(P[path[i]],P[path[k]]))best=k}out.push(path[best]);i=best}
  return out}
const pt=i=>nodes[i].id?[r2(P[i][0]),r2(P[i][1]),nodes[i].id]:[r2(P[i][0]),r2(P[i][1])];
function nearest0(p,k,maxD,any){const o=[];for(let j=0;j<n;j++){if(any?nodes[j].kind!==1:nodes[j].kind!==0)continue;const d=gc(P[j],p);if(d<=maxD)o.push([d,j])}o.sort((a,b)=>a[0]-b[0]);return o.slice(0,k)}
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
  const run=a=>a.reduce((s,p,q)=>q?s+gc(a[q-1],p):s,0),o=O[0],i=I[0],rp=L=>L.map(a=>a.map(p=>[r2(p[0]),r2(p[1]),...(p[2]?[p[2]]:[])]));
  routes[city]={o:rp(O),i:rp(I),og:OG,ig:IG,lo:Math.round(gc(JKT,o[0])+run(o)),li:Math.round(run(i)+gc(i[i.length-1],JKT)),gc:Math.round(direct)}});
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
