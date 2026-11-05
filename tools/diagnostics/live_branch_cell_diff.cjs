const fs=require('fs');
const load=p=>{const s=JSON.parse(fs.readFileSync(p,'utf8'));return (s.state??s).political.political_controllers;};
const [pp,hp,refp]=process.argv.slice(2);
const P=load(pp), H=load(hp), ref=JSON.parse(fs.readFileSync(refp,'utf8')).by_settlement_id;
const rows=[]; for (const k of Object.keys(ref).sort()) if (P[k]!==H[k]) rows.push([k,ref[k],H[k],P[k]]);
let hOnly=0,pOnly=0,neither=0; for(const r of rows){ if(r[2]===r[1]&&r[3]!==r[1])hOnly++; else if(r[3]===r[1]&&r[2]!==r[1])pOnly++; else neither++; }
console.log(`differ: ${rows.length} | no-player right & player wrong: ${hOnly} | player right & no-player wrong: ${pOnly} | neither: ${neither}`);
const byMun={}; for(const r of rows){const m=r[0].split(':')[1]; (byMun[m]??=[]).push(`${r[0].split(':')[2]}(ref ${r[1]}, nopl ${r[2]}, pl ${r[3]})`);}
for(const [m,v] of Object.entries(byMun).sort((a,b)=>b[1].length-a[1].length)) console.log(' ', m.padEnd(16), v.length, '|', v.slice(0,3).join('; '));
