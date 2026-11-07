/* Builds typical routings for every destination in the timetable and writes tools/world/routes.json.
   Usage:  node tools/world/build-routes.js            (reads the city table from index.html)
           node tools/world/build-routes.js --embed    (also splices the result into index.html between the WORLD_ROUTES markers)
   The network: ~3,600 real VOR beacons (beacons.json, OurAirports, public domain) joined to their near neighbours, plus the hand-made ocean/gate waypoints of graph.js
   where there are no beacons (oceans, sparse regions). Airspace we do not route through (avoid.json: Russia, Ukraine, Belarus, Iran, Iraq, Syria, and a box over the
   Black Sea) is never crossed. Routes are the cheapest paths through that network: distance plus penalties for sharp turns and backtracking. One corridor is kept per direction; unnecessary intermediate nodes are removed when the shortcut stays clear.
   These are inferred from beacon positions, not the published airway database (which is not open data). */
const fs=require('fs'),path=require('path');
const {N,CHAINS}=require('./graph.js');
const geometry=require('./geometry.js');
const TERMINALS=require('./terminal-profiles.json').profiles;
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
const bearingDeg=(a,b)=>(Math.atan2(Math.sin((b[1]-a[1])*rad)*Math.cos(b[0]*rad),Math.cos(a[0]*rad)*Math.sin(b[0]*rad)-Math.sin(a[0]*rad)*Math.cos(b[0]*rad)*Math.cos((b[1]-a[1])*rad))/rad+360)%360;
const angle=(a,b)=>Math.abs(((a-b+540)%360)-180);
function atBearing(p,heading,km){const d=km/6371,h=heading*rad,la=p[0]*rad,lo=p[1]*rad;return [r2(Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(h))/rad),r2((lo+Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(la),Math.cos(d)-Math.sin(la)*Math.sin(Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(h)))))/rad)]}
function runwayEnds(city){const p=TERMINALS[city]||TERMINALS[String(city).split(' / ')[0].trim()];if(!p)return [];
 return p.runways.flatMap(r=>[['le',r.le],['he',r.he]].map(([side,e])=>({runway:r.id,end:e.id,side,point:[e.lat,e.lon],heading:e.heading})));}
/* Generated terminal legs deliberately remain labelled as simulated geometry.
   The supplied runway thresholds/headings are factual; these are not published procedures. */
function terminalLeg(city,dir,route){const ends=runwayEnds(city);if(!ends.length)return null;
 const course=dir==='out'?bearingDeg(route.at(-2),route.at(-1)):bearingDeg(route[0],route[1]);
 const end=ends.slice().sort((a,b)=>angle(a.heading,course)-angle(b.heading,course)||a.runway.localeCompare(b.runway))[0];
 if(dir==='out'){
  const final=atBearing(end.point,(end.heading+180)%360,28);
  return {end,points:[[...final,'TERM-ARR-'+end.end],[...end.point,'RWY-'+end.end]]};
 }
 const climb=atBearing(end.point,end.heading,18);
 return {end,points:[[...end.point,'RWY-'+end.end],[...climb,'TERM-DEP-'+end.end]]};
}
/* Check geodesic segments against polygon boundaries, not isolated samples. */
const exclusion=geometry.exclusions(AVOID),bad=(la,lo)=>exclusion.bad([la,lo]);
const edgeCache=new Map();
const edgeOK=(a,b)=>{const key=a.slice(0,2).join(',')+'>'+b.slice(0,2).join(',');
  if(!edgeCache.has(key))edgeCache.set(key,exclusion.clear(a,b));return edgeCache.get(key)};
const slerp=geometry.interpolate;
/* ---- nodes ---- */
const nodes=[];   // {la,lo,id,kind}  kind 0 beacon, 1 waypoint, 2 gate
const idx={};
Object.keys(N).forEach(k=>{if(k==='JKT')return;idx[k]=nodes.length;nodes.push({la:N[k][0],lo:N[k][1],id:k,kind:/^G_/.test(k)?2:1,key:k})});
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
// Base length plus explicit heading-change penalties; no fabricated wind discount.
const cost=(a,b)=>gc(P[a],P[b]);
class Heap{constructor(){this.a=[]}push(k,v){const a=this.a;a.push([k,v]);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;[a[p],a[i]]=[a[i],a[p]];i=p}}
  pop(){const a=this.a,t=a[0],l=a.pop();if(a.length){a[0]=l;let i=0;for(;;){let m=i;const L=2*i+1,R=L+1;if(L<a.length&&a[L][0]<a[m][0])m=L;if(R<a.length&&a[R][0]<a[m][0])m=R;if(m===i)break;[a[m],a[i]]=[a[i],a[m]];i=m}}return t}
  get size(){return this.a.length}}
/* Heading-aware Dijkstra: (previous node, current node) is the state.
   A single distance per node would discard an arrival heading that makes the
   next sector straighter. Include airport connectors in the same scoring. */
function search(sources,targets,startPoint,endPoint){
 const states=[],byEdge=new Map(),h=new Heap();let best=null;
 const offer=(prev,node,cost,parent)=>{const key=(prev+1)*n+node;let id=byEdge.get(key);
  if(id==null){id=states.length;states.push({prev,node,cost:Infinity,parent:-1});byEdge.set(key,id)}
  if(cost<states[id].cost){states[id].cost=cost;states[id].parent=parent;h.push(cost,id)}};
 sources.forEach(([node,d])=>offer(-1,node,d,-1));
 while(h.size){const [d,id]=h.pop(),state=states[id],u=state.node;if(d>state.cost)continue;if(best&&d>best.total)break;
  const from=state.prev<0?startPoint:P[state.prev];
  if(targets.has(u)){const total=d+targets.get(u)+geometry.turnPenalty(from,P[u],endPoint);
   if(!best||total<best.total)best={id,total}}
  if(nodes[u].kind===2&&state.prev>=0)continue;
  for(const v of ADJ[u]){if(v===state.prev||(nodes[v].kind===2&&!targets.has(v)))continue;
   offer(u,v,d+cost(u,v)+geometry.turnPenalty(from,P[u],P[v]),id)}
 }
 if(!best)return null;
 const path=[];for(let id=best.id;id>=0;id=states[id].parent)path.unshift(states[id].node);
 return {path,total:best.total};
}
const pt=i=>[r2(P[i][0]),r2(P[i][1]),nodes[i].id||('FIC'+String(i).padStart(4,'0'))];
function nearest0(p,k,maxD,any){const o=[];for(let j=0;j<n;j++){if(any?nodes[j].kind!==1:nodes[j].kind!==0)continue;const d=gc(P[j],p);if(d<=maxD&&edgeOK(p,P[j]))o.push([d,j])}o.sort((a,b)=>a[0]-b[0]);return o.slice(0,k)}
const GATES=Object.values(GATE).map(k=>idx[k]);
/* Long curated ocean/continental legs still need a filed fix sequence. Use a
   nearby real beacon when it stays close to the corridor and clears the same
   exclusions; otherwise keep an explicitly fictional coordinate fix. */
function fillLongLegs(path){
 const out=[path[0]];
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],km=gc(a,b),steps=Math.ceil(km/800);
  for(let k=1;k<steps;k++){
   const q=geometry.interpolate(a,b,k/steps),previous=out[out.length-1],before=out[out.length-2],after=path[i+1];
   let best=null,bestDistance=80;
   for(const [id,la,lo] of BEACONS){const p=[la,lo,id],d=gc(q,p);if(d>=bestDistance)continue;
    if(gc(previous,p)+gc(p,b)>(gc(previous,q)+gc(q,b))*1.025)continue;
    if(geometry.turnAngle(previous,p,b)>30||(before&&geometry.turnAngle(before,previous,p)>60)||(after&&geometry.turnAngle(p,b,after)>60))continue;
    if(!edgeOK(previous,p)||!edgeOK(p,b))continue;best=p;bestDistance=d;
   }
   out.push(best||[r2(q[0]),r2(q[1]),'FIC'+r2(q[0]).toFixed(2)+'/'+r2(q[1]).toFixed(2)]);
  }
  out.push(b);
 }
 return out;
}

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
    const attempt=cand=>{
     const outward=search(GATES.map(gi=>[gi,gc(JKT,P[gi])]),new Map(cand.map(([d,j])=>[j,d])),JKT,dest);
     const inward=search(cand.map(([d,j])=>[j,d]),new Map(GATES.map(gi=>[gi,gc(JKT,P[gi])])),dest,JKT);
     return outward&&inward?{out:[outward],inn:[inward]}:null;
    };
    let cand=nearest0(dest,4,320);if(!cand.length)cand=nearest0(dest,3,1500);
    let res=cand.length?attempt(cand):null;if(!res)res=attempt(nearest0(dest,3,3500,true));
    if(!res){report.push('NO ROUTE '+city);return}
    const {out,inn}=res;
    O=out.map(c=>[...c.path.map(pt),dest]);I=inn.map(c=>[dest,...c.path.map(pt)]);OG=out.map(c=>keyOf(c.path[0]));IG=inn.map(c=>keyOf(c.path[c.path.length-1]));
  }
    // Preserve regional corridor anchors and bounded airway legs. A clear sky
  // shortcut is not permission to delete the entire filed waypoint sequence.
  const shortcut=(p,ends)=>geometry.simplify(p,edgeOK,{...ends,maxLegKm:900,
    keep:i=>!!N[p[i][2]]&&!/^G_/.test(p[i][2])});
  O=O.map(p=>fillLongLegs(shortcut(p,{before:JKT})));I=I.map(p=>fillLongLegs(shortcut(p,{after:JKT})));
  /* Replace the airport-centre endpoint with runway-aligned terminal geometry.
     World corridors still own the en-route path; only the last/first local leg changes. */
  const outTerminal=terminalLeg(city,'out',O[0]),inTerminal=terminalLeg(city,'in',I[0]);
  if(outTerminal)O=O.map(p=>[...p.slice(0,-1),...outTerminal.points]);
  if(inTerminal)I=I.map(p=>[...inTerminal.points,...p.slice(1)]);
  for(const p of O.concat(I))for(let j=1;j<p.length;j++)if(!edgeOK(p[j-1],p[j]))throw Error('Excluded route segment: '+city);
  const run=a=>a.reduce((s,p,q)=>q?s+gc(a[q-1],p):s,0),o=O[0],i=I[0],rp=L=>L.map(a=>a.map(p=>[r2(p[0]),r2(p[1]),...(p[2]?[p[2]]:[])]));
  routes[city]={o:rp(O),i:rp(I),og:OG,ig:IG,terminal:{out:outTerminal&&outTerminal.end,in:inTerminal&&inTerminal.end},lo:Math.round(gc(JKT,o[0])+run(o)),li:Math.round(run(i)+gc(i[i.length-1],JKT)),gc:Math.round(direct)} });
for(const [city,r] of Object.entries(routes))for(const [dir,L] of [['o',r.o],['i',r.i]])for(const p of L){
  const full=dir==='o'?[JKT,...p]:[...p,JKT];
  for(let j=1;j<full.length;j++)if(!exclusion.clear(full[j-1],full[j]))throw Error('Invalid exported route '+city+' '+dir);
}
fs.writeFileSync(path.join(__dirname,'routes.json'),JSON.stringify(routes));
const quality=require('./audit-routes').auditRoutes(routes,AVOID);
fs.writeFileSync(path.join(__dirname,'route-quality.json'),JSON.stringify(quality,null,2)+'\n');
console.log('route quality:',JSON.stringify(quality.summary));
console.log('largest detours (all directions and variants):');
quality.routes.slice().sort((a,b)=>b.detourRatio-a.detourRatio).slice(0,14).forEach(r=>console.log(' ',r.city,r.direction,r.variant,'km',r.km,'ratio',r.detourRatio,'max enroute turn',r.maxEnrouteTurnDeg));
console.log('json bytes',fs.statSync(path.join(__dirname,'routes.json')).size);
if(process.argv.includes('--embed')){
  const js='/*WORLD_ROUTES:START*/const WORLD_ROUTES='+fs.readFileSync(path.join(__dirname,'routes.json'),'utf8').replace(/,"lo":\d+,"li":\d+,"gc":\d+/g,'')+';/*WORLD_ROUTES:END*/';
  let h=html;if(h.includes('/*WORLD_ROUTES:START*/'))h=h.replace(/\/\*WORLD_ROUTES:START\*\/[\s\S]*?\/\*WORLD_ROUTES:END\*\//,()=>js);else throw Error('markers missing in index.html');
  fs.writeFileSync(htmlPath,h);console.log('embedded into index.html');}
