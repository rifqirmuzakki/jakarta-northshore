/* Builds typical routings for every destination in the timetable from tools/world/graph.js and writes tools/world/routes.json.
   Usage:  node tools/world/build-routes.js            (reads the city table from index.html)
           node tools/world/build-routes.js --embed    (also splices the result into index.html between the WORLD_ROUTES markers)
   Westbound and eastbound legs are costed differently (a jet-stream term), so the track out and the track back can differ. */
const fs=require('fs'),path=require('path');
const {N,CHAINS}=require('./graph.js');
const root=path.join(__dirname,'..','..'),htmlPath=path.join(root,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const air=JSON.parse(/const AIR_CITY=(\{.*?\});/s.exec(html)[1]);
const unwrap=l=>l<-40?l+360:l;
const JKT=N.JKT,GATE={W:'G_W',NW:'G_NW',N:'G_N',NE:'G_NE',E:'G_E',S:'G_S'};
const rad=Math.PI/180;
const gc=(a,b)=>{const dl=(a[0]-b[0])*rad,dg=(a[1]-b[1])*rad,x=Math.sin(dl/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(x))};
/* graph (JKT itself is not a node: every route starts at the gate of the destination's side) */
const adj={};Object.keys(N).forEach(k=>{if(k!=='JKT')adj[k]=new Set()});
CHAINS.forEach(ch=>{for(let i=0;i+1<ch.length;i++){const a=ch[i],b=ch[i+1];if(a==='JKT'||b==='JKT')continue;if(!N[a]||!N[b])throw Error('unknown node in chain: '+a+' '+b);adj[a].add(b);adj[b].add(a)}});
/* cost of flying a->b: distance, cheaper with the jet stream behind us (eastbound), dearer into it (westbound), strongest around 40 degrees */
const jet=lat=>Math.max(0,1-Math.abs((Math.abs(lat)-40)/22));
const cost=(a,b)=>{const A=N[a],B=N[b],len=gc(A,B),mid=(A[0]+B[0])/2,ef=((B[1]-A[1])*Math.cos(mid*rad)*111.2)/Math.max(len,1);return len*(1-0.10*ef*jet(mid))};
function dijkstra(src,dst){
  const dist={},prev={},seen=new Set();Object.keys(adj).forEach(k=>dist[k]=Infinity);dist[src]=0;
  for(;;){let u=null;for(const k in dist)if(!seen.has(k)&&(u===null||dist[k]<dist[u]))u=k;if(u===null||dist[u]===Infinity)return null;if(u===dst)break;seen.add(u);
    adj[u].forEach(v=>{const c=dist[u]+cost(u,v);if(c<dist[v]){dist[v]=c;prev[v]=u}})}
  const p=[dst];while(p[0]!==src)p.unshift(prev[p[0]]);return {path:p,cost:dist[dst]}}
const nearestNodes=(pt,n)=>Object.keys(adj).map(k=>({k,d:gc(N[k],pt)})).sort((a,b)=>a.d-b.d).slice(0,n);
const r2=x=>Math.round(x*100)/100;
const routes={},report=[];
Object.keys(air).forEach(city=>{
  const [la,lo,side]=air[city],dest=[la,unwrap(lo)],g=GATE[side]||'G_NW',direct=gc(JKT,dest);
  let o,i;
  const eastIndo=dest[1]>115&&dest[1]<142&&dest[0]>-11&&dest[0]<8&&direct<4000;          // eastern Indonesia: domestic, nearly direct
  if(direct<1500||eastIndo){o=[N[g],dest];i=[dest,N[g]]}
  else{
    const near=nearestNodes(dest,4)[0].d,cands=nearestNodes(dest,4).filter(c=>c.d<=Math.max(900,near*2.2));
    let bestO=null,bestI=null;
    cands.forEach(c=>{
      const po=dijkstra(g,c.k);if(po){const total=po.cost+c.d;if(!bestO||total<bestO.total)bestO={total,path:po.path,attach:c}}
      /* inbound: fly the same graph the other way, so the wind term differs */
      const pi=dijkstra(c.k,g);
      if(pi){const total=pi.cost+c.d;if(!bestI||total<bestI.total)bestI={total,path:pi.path,attach:c}}});
    if(!bestO||!bestI){report.push('NO ROUTE '+city);return}
    o=[...bestO.path.map(k=>N[k]),dest];i=[dest,...bestI.path.map(k=>N[k])];
    // the inbound path was costed from the attach node towards the gate, so the node list already runs towards Jakarta
  }
  const run=a=>a.reduce((s,p,q)=>q?s+gc(a[q-1],p):s,0);
  routes[city]={o:o.map(p=>[r2(p[0]),r2(p[1])]),i:i.map(p=>[r2(p[0]),r2(p[1])]),lo:Math.round(gc(JKT,o[0])+run(o)),li:Math.round(run(i)+gc(i[i.length-1],JKT)),gc:Math.round(direct)}});
fs.writeFileSync(path.join(__dirname,'routes.json'),JSON.stringify(routes));
const rows=Object.keys(routes).map(c=>({c,r:routes[c],ratio:Math.max(routes[c].lo,routes[c].li)/Math.max(routes[c].gc,1)})).filter(x=>x.r.gc>=1500).sort((a,b)=>b.ratio-a.ratio);
console.log('routes',Object.keys(routes).length,'of',Object.keys(air).length,report.join(' '));
console.log('largest detours (route length / great circle):');rows.slice(0,14).forEach(x=>console.log(' ',x.c.padEnd(26),'gc',x.r.gc,'out',x.r.lo,'in',x.r.li,'ratio',x.ratio.toFixed(2)));
const diff=rows.filter(x=>JSON.stringify(x.r.o.slice(1,-1))!==JSON.stringify(x.r.i.slice(1,-1).reverse()));
console.log('destinations where the track out and the track back differ:',diff.length,diff.slice(0,10).map(x=>x.c).join(', '));
if(process.argv.includes('--embed')){
  const js='/*WORLD_ROUTES:START*/const WORLD_ROUTES='+fs.readFileSync(path.join(__dirname,'routes.json'),'utf8').replace(/,"lo":\d+,"li":\d+,"gc":\d+/g,'')+';/*WORLD_ROUTES:END*/';
  let h=html;if(h.includes('/*WORLD_ROUTES:START*/'))h=h.replace(/\/\*WORLD_ROUTES:START\*\/[\s\S]*?\/\*WORLD_ROUTES:END\*\//,()=>js);else throw Error('markers missing in index.html');
  fs.writeFileSync(htmlPath,h);console.log('embedded into index.html');}
