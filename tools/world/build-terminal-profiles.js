/* Build destination runway profiles from the public OurAirports CSV exports.
   Usage: node tools/world/build-terminal-profiles.js <airports.csv> <runways.csv>
   The timetable contains airport coordinates, so matching is deterministic and
   does not depend on a fragile city-name lookup. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const AIR_CITY=JSON.parse(/const AIR_CITY=(\{.*?\});/s.exec(html)[1]);
/* Later timetable revisions append destinations with direct AIR_CITY writes. */
for(const m of html.matchAll(/AIR_CITY\[(["'])(.*?)\1\]\s*=\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/g))AIR_CITY[m[2]]=[+m[3],+m[4]];
try{global.window={};require(path.join(root,'schedule-changes.js'));for(const c of window.JN_CHANGES_REPO.changes||[])for(const a of c.airports||[])if(a?.city&&!AIR_CITY[a.city])AIR_CITY[a.city]=[+a.lat,+a.lon]}catch(_){/* optional schedule-change data */}

function rows(file){
 const text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
 const parse=line=>{const out=[];let v='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){v+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){out.push(v);v=''}else v+=c}out.push(v);return out};
 const [head,...lines]=text.trimEnd().split(/\r?\n/),keys=parse(head);
 return lines.map(line=>{const v=parse(line),o={};keys.forEach((k,i)=>o[k]=v[i]??'');return o});
}
const rad=Math.PI/180;
function km(a,b){const dLat=(a[0]-b[0])*rad,dLon=(a[1]-b[1])*rad,x=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,x)))}
function bearing(a,b){return (Math.atan2(Math.sin((b[1]-a[1])*rad)*Math.cos(b[0]*rad),Math.cos(a[0]*rad)*Math.sin(b[0]*rad)-Math.sin(a[0]*rad)*Math.cos(b[0]*rad)*Math.cos((b[1]-a[1])*rad))/rad+360)%360}
function move(p,heading,km){const d=km/6371,h=heading*rad,la=p[0]*rad,lo=p[1]*rad,la2=Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(h));return [la2/rad,(lo+Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(la),Math.cos(d)-Math.sin(la)*Math.sin(la2)))/rad]}
const num=v=>String(v).trim()!==''&&Number.isFinite(+v)?+v:null;
const [airportFile,runwayFile]=process.argv.slice(2);
if(!airportFile||!runwayFile)throw Error('Usage: node tools/world/build-terminal-profiles.js <airports.csv> <runways.csv>');
const airports=rows(airportFile).filter(a=>['large_airport','medium_airport','small_airport'].includes(a.type)&&num(a.latitude_deg)!=null&&num(a.longitude_deg)!=null);
const byAirport=new Map(),partialByAirport=new Map();
for(const r of rows(runwayFile)){
 if(r.closed==='1'||num(r.length_ft)==null||+r.length_ft<1800)continue;
 const le={id:r.le_ident,lat:num(r.le_latitude_deg),lon:num(r.le_longitude_deg),heading:num(r.le_heading_degT)};
 const he={id:r.he_ident,lat:num(r.he_latitude_deg),lon:num(r.he_longitude_deg),heading:num(r.he_heading_degT)};
 if(le.lat!=null&&le.lon!=null&&he.lat!=null&&he.lon!=null){le.heading??=bearing([le.lat,le.lon],[he.lat,he.lon]);he.heading??=(le.heading+180)%360}
 const runway={id:`${le.id}/${he.id}`,lengthFt:+r.length_ft,le,he};
 if(le.lat!=null&&le.lon!=null&&le.heading!=null&&he.lat!=null&&he.lon!=null&&he.heading!=null){if(!byAirport.has(r.airport_ref))byAirport.set(r.airport_ref,[]);byAirport.get(r.airport_ref).push(runway)}
 else {if(!partialByAirport.has(r.airport_ref))partialByAirport.set(r.airport_ref,[]);partialByAirport.get(r.airport_ref).push(runway)}
}
/* OurAirports has one older Singkawang runway record without coordinates or
   true heading. Keep the limitation explicit rather than presenting it as a
   surveyed threshold. */
const CITY_FALLBACK={Singkawang:{id:'01/19',lengthFt:2953,heading:10}};
function inferredRunway(runway,airport){
 const heading=runway.le.heading??(runway.he.heading!=null?(runway.he.heading+180)%360:(parseInt(runway.le.id,10)%36)*10);
 if(!Number.isFinite(heading))return null;const half=(runway.lengthFt||3000)*0.0001524/2,centre=[+airport.latitude_deg,+airport.longitude_deg];
 const le=move(centre,(heading+180)%360,half),he=move(centre,heading,half);
 return {id:runway.id,lengthFt:runway.lengthFt,le:{id:runway.le.id,lat:le[0],lon:le[1],heading},he:{id:runway.he.id,lat:he[0],lon:he[1],heading:(heading+180)%360},inferredThresholds:true};
}
const profiles={},unmatched=[];
for(const [city,[lat,lon]] of Object.entries(AIR_CITY)){
 let best=null;
 for(const a of airports){const d=km([lat,lon],[+a.latitude_deg,+a.longitude_deg]);if((!best||d<best.d)&&d<=35)best={a,d}}
 if(!best){unmatched.push(city);continue}
 let runways=byAirport.get(best.a.id),inferred=false;
 if(!runways&&partialByAirport.has(best.a.id)){runways=partialByAirport.get(best.a.id).map(r=>inferredRunway(r,best.a)).filter(Boolean);inferred=true}
 if(!runways&&CITY_FALLBACK[city]){const h=CITY_FALLBACK[city],r={id:h.id,lengthFt:h.lengthFt,le:{id:h.id.split('/')[0],heading:h.heading},he:{id:h.id.split('/')[1],heading:(h.heading+180)%360}};runways=[inferredRunway(r,best.a)];inferred=true}
 if(!runways?.length){unmatched.push(city);continue}
 runways=runways.sort((a,b)=>b.lengthFt-a.lengthFt);
 profiles[city]={airport:{ident:best.a.ident,iata:best.a.iata_code||null,name:best.a.name,lat:+best.a.latitude_deg,lon:+best.a.longitude_deg,matchKm:+best.d.toFixed(2)},runways,...(inferred?{inferredThresholds:true}:{})};
}
const out={source:'OurAirports airports.csv + runways.csv',generatedAt:new Date().toISOString(),profiles,unmatched};
fs.writeFileSync(path.join(__dirname,'terminal-profiles.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({profiles:Object.keys(profiles).length,unmatched},null,2));
