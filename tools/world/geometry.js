/* Geometry for the fictional network's configured exclusions. Not live airspace data. */
const RAD=Math.PI/180;
const distance=(a,b)=>{const x=Math.sin((a[0]-b[0])*RAD/2)**2+Math.cos(a[0]*RAD)*Math.cos(b[0]*RAD)*Math.sin((a[1]-b[1])*RAD/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,x)))};
function interpolate(a,b,t){
 const v=p=>[Math.cos(p[0]*RAD)*Math.cos(p[1]*RAD),Math.cos(p[0]*RAD)*Math.sin(p[1]*RAD),Math.sin(p[0]*RAD)],A=v(a),B=v(b);
 const angle=Math.acos(Math.max(-1,Math.min(1,A.reduce((s,x,i)=>s+x*B[i],0)))),sin=Math.sin(angle);if(sin<1e-8)return a.slice(0,2);
 const q=A.map((x,i)=>(Math.sin((1-t)*angle)*x+Math.sin(t*angle)*B[i])/sin);
 let lon=Math.atan2(q[1],q[0])/RAD;while(lon-a[1]>180)lon-=360;while(lon-a[1]<-180)lon+=360;
 return [Math.asin(Math.max(-1,Math.min(1,q[2])))/RAD,lon];
}
const inside=(ring,x,y)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes}return yes};
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function intersects(a,b,c,d){
 if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))return false;
 return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;
}
function exclusions(polygons){
 const all=[...polygons,{n:'Black Sea',b:[28.3,42.2,41,46.2],r:[[28.3,42.2],[41,42.2],[41,46.2],[28.3,46.2]]}];
 const bad=p=>all.some(a=>p[1]>=a.b[0]&&p[1]<=a.b[2]&&p[0]>=a.b[1]&&p[0]<=a.b[3]&&inside(a.r,p[1],p[0]));
 function clear(a,b){
  if(bad(a)||bad(b))return false;
  const steps=Math.max(1,Math.ceil(distance(a,b)/20));let prev=[a[1],a[0]];
  for(let k=1;k<=steps;k++){
   const q=interpolate(a,b,k/steps),next=[q[1],q[0]],box=[Math.min(prev[0],next[0]),Math.min(prev[1],next[1]),Math.max(prev[0],next[0]),Math.max(prev[1],next[1])];
   for(const p of all){if(box[2]<p.b[0]||box[0]>p.b[2]||box[3]<p.b[1]||box[1]>p.b[3])continue;
    for(let i=0,j=p.r.length-1;i<p.r.length;j=i++)if(intersects(prev,next,p.r[j],p.r[i]))return false;
   }
   prev=next;
  }
  return true;
 }
 return {bad,clear};
}
function bearing(a,b){return Math.atan2(Math.sin((b[1]-a[1])*RAD)*Math.cos(b[0]*RAD),Math.cos(a[0]*RAD)*Math.sin(b[0]*RAD)-Math.sin(a[0]*RAD)*Math.cos(b[0]*RAD)*Math.cos((b[1]-a[1])*RAD))/RAD}
function turnAngle(a,b,c){
 if(distance(a,b)<0.001||distance(b,c)<0.001)return 0;
 const incoming=bearing(b,a)+180,outgoing=bearing(b,c);
 return Math.abs(((outgoing-incoming+540)%360)-180);
}
// Fictional equivalent-km cost: smooth bends are cheap; reversals cost heavily.
function turnPenalty(a,b,c){const angle=turnAngle(a,b,c);return 40*(angle/45)**2+150*(Math.max(0,angle-90)/90)**2}
function routeScore(points){let score=0;for(let i=1;i<points.length;i++){score+=distance(points[i-1],points[i]);if(i>1)score+=turnPenalty(points[i-2],points[i-1],points[i])}return score}
/* Optimise shortcuts over the ordered corridor. State retains the previous
   segment, so a longer clear jump cannot win by concealing a sharp next turn. */
function simplify(points,clear,{before,after,maxLegKm=Infinity,keep=()=>false}={}){
 const n=points.length;if(n<3)return points.slice();
 const costs=new Float64Array(n*n).fill(Infinity),parent=new Int32Array(n*n).fill(-1),edges=new Map();
 const edge=(i,j)=>{const k=i*n+j;if(!edges.has(k)){
  const km=distance(points[i],points[j]),skipsAnchor=points.some((_,v)=>v>i&&v<j&&keep(v));
  edges.set(k,!skipsAnchor&&(j===i+1||km<=maxLegKm)&&clear(points[i],points[j])?km:Infinity);
 }return edges.get(k)};
 for(let j=1;j<n;j++)costs[j]=edge(0,j)+(before?turnPenalty(before,points[0],points[j]):0);
 for(let j=1;j<n-1;j++)for(let i=0;i<j;i++){const k=i*n+j;if(!Number.isFinite(costs[k]))continue;
  for(let next=j+1;next<n;next++){const dest=j*n+next,cost=costs[k]+edge(j,next)+turnPenalty(points[i],points[j],points[next]);
   if(cost<costs[dest]){costs[dest]=cost;parent[dest]=k}}
 }
 let last=-1,best=Infinity;
 for(let i=0;i<n-1;i++){const k=i*n+n-1,cost=costs[k]+(after?turnPenalty(points[i],points[n-1],after):0);if(cost<best){best=cost;last=k}}
 if(last<0)throw Error('No clear shortcut path');
 const indices=[n-1];while(last>=0){indices.unshift(Math.floor(last/n));last=parent[last]}
 return indices.map(i=>points[i]);
}
module.exports={distance,interpolate,exclusions,simplify,bearing,turnAngle,turnPenalty,routeScore};
