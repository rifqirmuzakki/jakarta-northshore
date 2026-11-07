/* Audit every direction and variant, including future explicitly-added alternates. */
const fs=require('fs'),path=require('path');
const {distance,turnAngle,routeScore,exclusions}=require('./geometry'),{N}=require('./graph');
function auditRoutes(routes,polygons){
 const geo=exclusions(polygons),rows=[];
 for(const [city,r] of Object.entries(routes))for(const [key,direction] of [['o','out'],['i','in']]){
  if(!Array.isArray(r[key])||!r[key].length)throw Error('Missing route '+city+' '+direction);
  r[key].forEach((points,variant)=>{
   const P=key==='o'?[N.JKT,...points]:[...points,N.JKT];
   if(P.some(p=>!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>90))throw Error('Invalid coordinate '+city);
   const direct=distance(P[0],P.at(-1)),turns=[],excluded=[];let km=0;
   for(let i=1;i<P.length;i++){km+=distance(P[i-1],P[i]);if(!geo.clear(P[i-1],P[i]))excluded.push(i-1);
     if(i<P.length-1){const point=points[key==='o'?i-1:i],degrees=turnAngle(P[i-1],P[i],P[i+1]),terminal=(key==='o'?i===1:i===P.length-2)||/^TERM-|^RWY-/.test(point[2]||'');
     turns.push({point:point.slice(0,2),degrees:+degrees.toFixed(1),terminal})}}
   const enroute=turns.filter(t=>!t.terminal),warnings=[];
   if(direct>0&&km/direct>1.15)warnings.push('detour-over-15-percent');
   if(enroute.some(t=>t.degrees>60))warnings.push('sharp-enroute-turn');
   if(enroute.some(t=>t.degrees>90))warnings.push('enroute-backtracking');
   if(excluded.length)warnings.push('excluded-segment');
   rows.push({city,direction,variant,km:+km.toFixed(1),greatCircleKm:+direct.toFixed(1),detourRatio:direct?+(km/direct).toFixed(4):null,
    score:+routeScore(P).toFixed(1),maxEnrouteTurnDeg:+Math.max(0,...enroute.map(t=>t.degrees)).toFixed(1),turns,excludedSegments:excluded,warnings});
  });
 }
 return {summary:{destinations:Object.keys(routes).length,variants:rows.length,excludedVariants:rows.filter(r=>r.excludedSegments.length).length,
  sharpEnrouteVariants:rows.filter(r=>r.maxEnrouteTurnDeg>60).length,backtrackingVariants:rows.filter(r=>r.maxEnrouteTurnDeg>90).length,
  detoursOver15Percent:rows.filter(r=>r.warnings.includes('detour-over-15-percent')).length},routes:rows};
}
module.exports={auditRoutes};
if(require.main===module){
 const routes=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'routes.json'),'utf8'));
 const report=auditRoutes(routes,require('./avoid.json'));
 console.log(JSON.stringify(report,null,2));if(report.summary.excludedVariants)process.exitCode=1;
}
