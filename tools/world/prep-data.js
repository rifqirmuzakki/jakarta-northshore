/* One-off data prep for the route builder. Writes two small files next to this script so the builder needs no downloads:
     beacons.json  real VOR / VOR-DME / VORTAC beacons from OurAirports navaids.csv (public domain): [ident, lat, lon]  (longitudes unwrapped like the map: west of -40 shifted +360)
     avoid.json    airspace we do not route through, from Natural Earth (via world-atlas): Russia, Ukraine, Belarus, Iran, Iraq, Syria (rings in lon/lat, unwrapped)
   Usage: node tools/world/prep-data.js <navaids.csv> <node_modules containing world-atlas and topojson-client>
   navaids.csv: https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/navaids.csv */
const fs=require('fs'),path=require('path');
const csv=process.argv[2],nm=path.resolve(process.argv[3]||'node_modules');
const unwrap=l=>l<-40?l+360:l;
function parse(line){const o=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(q){if(c==='"'){if(line[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}else if(c==='"')q=true;else if(c===','){o.push(cur);cur=''}else cur+=c}o.push(cur);return o}
const rows=fs.readFileSync(csv,'utf8').split('\n').slice(1).filter(Boolean).map(parse);
const seen=new Set(),B=[];
rows.forEach(f=>{if(!/^(VOR|VOR-DME|VORTAC)$/.test(f[4]))return;const la=+f[6],lo=+f[7];if(!isFinite(la)||!isFinite(lo))return;
  const k=f[2]+'|'+la.toFixed(1)+'|'+lo.toFixed(1);if(seen.has(k))return;seen.add(k);B.push([f[2],Math.round(la*100)/100,Math.round(unwrap(lo)*100)/100])});
fs.writeFileSync(path.join(__dirname,'beacons.json'),JSON.stringify(B));
const topo=require(path.join(nm,'topojson-client'));
const w=JSON.parse(fs.readFileSync(path.join(nm,'world-atlas/countries-110m.json'),'utf8'));
const NAMES=['Russia','Ukraine','Belarus','Iran','Iraq','Syria'];
const feats=topo.feature(w,w.objects.countries).features.filter(f=>NAMES.includes(f.properties.name));
const A=[];
feats.forEach(f=>{const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  polys.forEach(p=>{const r=p[0].map(([x,y])=>[x,y]);const m=r.reduce((s,q)=>s+q[0],0)/r.length;const sh=m<-40?360:0;
    const ring=r.map(([x,y])=>[Math.round((x+sh)*100)/100,Math.round(y*100)/100]);
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;ring.forEach(([x,y])=>{if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y});
    A.push({n:f.properties.name,b:[x0,y0,x1,y1],r:ring})})});
fs.writeFileSync(path.join(__dirname,'avoid.json'),JSON.stringify(A));
console.log('beacons',B.length,'avoid polygons',A.length,feats.map(f=>f.properties.name).join(','));
