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
function simplify(points,clear){
 const out=[points[0]];let i=0;
 while(i<points.length-1){let next=i+1;for(let j=points.length-1;j>i+1;j--)if(clear(points[i],points[j])){next=j;break}out.push(points[next]);i=next}
 return out;
}
module.exports={distance,interpolate,exclusions,simplify};
