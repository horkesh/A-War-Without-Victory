const fs = require('fs');
const runDir = process.argv[2];
const d = JSON.parse(fs.readFileSync(runDir + '/final_save.json', 'utf8'));
const s = d.state || d.gameState || d;
const fmts = Array.isArray(s.formations) ? s.formations : Object.values(s.formations || {});

// Corps positions using location_osid
function showCorps(corpId) {
  const brig = fmts.filter(f => f.corps_id === corpId);
  console.log(`\n=== ${corpId} (${brig.length}) ===`);
  brig.forEach(f => {
    const osid = f.location_osid || '?';
    const mun = osid.split(':')[1] || '?';
    console.log(` ${f.name} → ${mun} (${osid})`);
  });
}

showCorps('vrs_drina');
showCorps('vrs_herzegovina');
showCorps('vrs_sarajevo_romanija');
showCorps('rs_sarajevo_romanija_corps');

// Check w40 initial state to see where Foča/Višegrad brigades start
console.log('\n=== Foča/Višegrad area at w40 ===');
const ctrl = s.political_controllers || {};
['foca', 'visegrad', 'rogatica', 'cajnice', 'rudo'].forEach(mun => {
  const cells = Object.keys(ctrl).filter(k => k.startsWith(`op:${mun}:`));
  const rs = cells.filter(k => ctrl[k] === 'RS');
  const rbih = cells.filter(k => ctrl[k] === 'RBiH');
  console.log(` ${mun}: RS=${rs.length}/${cells.length}, RBiH=${rbih.length}/${cells.length}`);
  rbih.filter(k => ['foca', 'visegrad', 'rogatica'].some(m => k.startsWith(`op:${m}:`))).forEach(k => {
    // only show if it should be RS (from mismatch list)
  });
});

// Check Operation Foča result
console.log('\n=== Foča area detail ===');
Object.keys(ctrl).filter(k => k.startsWith('op:foca:')).forEach(k => console.log(` ${k} -> ${ctrl[k]}`));
