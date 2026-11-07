/* Builds the compact world basemap used by the World view (Natural Earth through the world-atlas package, public domain) and embeds it in index.html.
   Usage:  (in a scratch folder)  npm i world-atlas@2.0.2 topojson-client@3.1.0
           node tools/world/build-basemap.js <path to that folder's node_modules>
   Longitudes are unwrapped around Jakarta: land west of -30 degrees (the Americas, Greenland, the far end of Russia) is shifted by +360 so the Pacific is continuous. */
const fs=require('fs'),path=require('path');
const nm=path.resolve(process.argv[2]||'node_modules');
const topo=require(path.join(nm,'topojson-client'));
const land=JSON.parse(fs.readFileSync(path.join(nm,'world-atlas/land-50m.json'),'utf8'));
const ctr=JSON.parse(fs.readFileSync(path.join(nm,'world-atlas/countries-50m.json'),'utf8'));
const LAT0=-58,Q=20;                                       // drop Antarctica; units of 0.05 degrees
function dp(pts,tol){if(pts.length<3)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
  while(st.length){const [a,b]=st.pop();let m=-1,im=-1;const [x1,y1]=pts[a],[x2,y2]=pts[b],dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy;
    for(let i=a+1;i<b;i++){const [x,y]=pts[i];let d;if(L===0)d=Math.hypot(x-x1,y-y1);else{let t=((x-x1)*dx+(y-y1)*dy)/L;t=Math.max(0,Math.min(1,t));d=Math.hypot(x-(x1+t*dx),y-(y1+t*dy))}if(d>m){m=d;im=i}}
    if(m>tol){keep[im]=1;st.push([a,im],[im,b])}}
  return pts.filter((_,i)=>keep[i])}
const unwrap=ring=>{let pl=null;return ring.map(([x,y])=>{if(pl!==null){while(x-pl>180)x-=360;while(x-pl<-180)x+=360}pl=x;return [x,y]})};   // rings that touch the antimeridian become continuous
const shift=ring=>{let a=1e9,b=-1e9;ring.forEach(p=>{if(p[0]<a)a=p[0];if(p[0]>b)b=p[0]});return (a+b)/2<-30?360:0};
const keepLat=ring=>ring.some(p=>p[1]>LAT0);
const enc=(ring,sh)=>{const o=[];let px=0,py=0;ring.forEach(([x,y],i)=>{const qx=Math.round((x+sh)*Q),qy=Math.round(y*Q);if(i===0)o.push(qx,qy);else o.push(qx-px,qy-py);px=qx;py=qy});return o};
const lg=topo.feature(land,land.objects.land);
const rings=[];
(lg.type==='FeatureCollection'?lg.features.map(f=>f.geometry):[lg.geometry||lg]).forEach(g=>{const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  polys.forEach(p=>p.forEach((ring,ri)=>{if(!keepLat(ring))return;const ur=unwrap(ring),s=dp(ur,0.06);if(s.length>=4)rings.push({h:ri>0?1:0,d:enc(s,shift(ur))})}))});
const mesh=topo.mesh(ctr,ctr.objects.countries,(a,b)=>a!==b);
const borders=[];mesh.coordinates.forEach(line=>{if(!keepLat(line))return;const ul=unwrap(line),s=dp(ul,0.08);if(s.length>=2)borders.push(enc(s,shift(ul)))});
const data={q:Q,land:rings,borders};
const js='/*WORLD_MAP:START*/const WORLD_MAP='+JSON.stringify(data)+';/*WORLD_MAP:END*/';
const htmlPath=path.join(__dirname,'..','..','index.html');let h=fs.readFileSync(htmlPath,'utf8');
if(!h.includes('/*WORLD_MAP:START*/'))h=h.replace('<script id="jn-world-data">','<script id="jn-world-data">/*WORLD_MAP:START*//*WORLD_MAP:END*/\n');
h=h.replace(/\/\*WORLD_MAP:START\*\/[\s\S]*?\/\*WORLD_MAP:END\*\//,()=>js);
fs.writeFileSync(htmlPath,h);
console.log('land rings',rings.length,'border lines',borders.length,'embedded',js.length,'bytes');
