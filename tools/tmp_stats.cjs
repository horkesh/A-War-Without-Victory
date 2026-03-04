const fs = require('fs');
const runDir = process.argv[2];
const raw = fs.readFileSync(runDir + '/final_save.json', 'utf8');
const d = JSON.parse(raw);
const s = d.state || d.gameState || d;

// Formations
const fmts = Array.isArray(s.formations) ? s.formations : Object.values(s.formations || {});
const bf = {};
for (const f of fmts) {
  if (!bf[f.faction]) bf[f.faction] = { brigades: 0, personnel: 0 };
  bf[f.faction].brigades++;
  bf[f.faction].personnel += f.personnel || 0;
}
console.log('=== TROOP STRENGTHS (end of run) ===');
for (const [fac, v] of Object.entries(bf)) {
  console.log(`  ${fac}: ${v.brigades} formations, ${v.personnel.toLocaleString()} personnel`);
}

// Militia pools
const pools = s.militia_pools || s.militiaPools || {};
const poolArr = Array.isArray(pools) ? pools : Object.values(pools);
console.log('\n=== MILITIA POOLS ===');
for (const p of poolArr) {
  const fac = p.faction || p.factionId || '?';
  const avail = p.available != null ? p.available : (p.pool_available != null ? p.pool_available : '?');
  const comm = p.committed != null ? p.committed : (p.pool_committed != null ? p.pool_committed : '?');
  const exh = p.exhausted != null ? p.exhausted : (p.pool_exhausted != null ? p.pool_exhausted : '?');
  console.log(`  ${fac}: available=${avail} committed=${comm} exhausted=${exh}`);
}

// Supply reserves
const reserves = s.supply_reserves || {};
console.log('\n=== SUPPLY RESERVES (w40) ===');
for (const [fac, v] of Object.entries(reserves)) {
  const gen = typeof v === 'object' ? (v.general_supply_reserve != null ? v.general_supply_reserve.toFixed(1) : v.general != null ? v.general.toFixed(1) : '?') : '?';
  const hvy = typeof v === 'object' ? (v.heavy_munitions_reserve != null ? v.heavy_munitions_reserve.toFixed(1) : v.heavy != null ? v.heavy.toFixed(1) : '?') : '?';
  console.log(`  ${fac}: general=${gen}  heavy=${hvy}`);
}

// Casualty ledger — aggregate by faction
const cas = s.casualty_ledger || s.casualtyLedger || {};
const facCas = {};
for (const [id, v] of Object.entries(cas)) {
  const fac = (typeof v === 'object' && v.faction) ? v.faction : id.split('_')[0];
  if (!facCas[fac]) facCas[fac] = { kia: 0, wia: 0, mia: 0 };
  facCas[fac].kia += v.killed || v.kia || 0;
  facCas[fac].wia += v.wounded || v.wia || 0;
  facCas[fac].mia += v.missing || v.mia || 0;
}
console.log('\n=== CASUALTY LEDGER (aggregate) ===');
let totKia=0, totWia=0, totMia=0;
for (const [fac, v] of Object.entries(facCas)) {
  console.log(`  ${fac}: KIA=${v.kia.toLocaleString()} WIA=${v.wia.toLocaleString()} MIA=${v.mia.toLocaleString()} total=${(v.kia+v.wia+v.mia).toLocaleString()}`);
  totKia+=v.kia; totWia+=v.wia; totMia+=v.mia;
}
console.log(`  TOTAL: KIA=${totKia.toLocaleString()} WIA=${totWia.toLocaleString()} MIA=${totMia.toLocaleString()}`);

// Displacement
const displ = s.displacement_event_log || [];
let totDispl=0;
const byNat = {};
let fled=0;
for (const e of displ) {
  const amt = e.amount || e.displaced || 0;
  totDispl += amt;
  const nat = e.nationality || e.ethnicity || '?';
  byNat[nat] = (byNat[nat]||0) + amt;
  fled += e.fled_abroad || 0;
}
console.log('\n=== DISPLACEMENT ===');
console.log(`  Total displaced: ${totDispl.toLocaleString()}`);
for (const [nat, v] of Object.entries(byNat)) console.log(`    ${nat}: ${v.toLocaleString()}`);
console.log(`  Fled abroad: ${fled.toLocaleString()}`);

// Key control checks
const ctrl = s.political_controllers || s.controlBySettlement || {};
const checks = [
  ['RS holds Brčko', ['op:brcko:brcko', 'op:brcko:krepsic'], 'RS'],
  ['RS holds Posavina (Odžak)', ['op:odzak:odzak'], 'RS'],
  ['HVO holds Orašje', ['op:orasje:orasje'], 'HRHB'],
  ['RBiH holds Gradačac', ['op:gradacac:gradacac'], 'RBiH'],
  ['RS holds Vozuća', ['op:zavidovici:vozuca'], 'RS'],
  ['RBiH holds Bihać', ['op:bihac:bihac'], 'RBiH'],
  ['RBiH holds Srebrenica', ['op:srebrenica:srebrenica'], 'RBiH'],
  ['RBiH holds Goražde', ['op:gorazde:gorazde'], 'RBiH'],
  ['RBiH holds Žepa', ['op:rogatica:zepa'], 'RBiH'],
  ['RS holds Pale', ['op:pale:pale'], 'RS'],
  ['RS holds Ilidža', ['op:ilidza:ilidza'], 'RS'],
  ['RS holds Vogošća', ['op:vogosca:vogosca'], 'RS'],
  ['RBiH holds Sarajevo center', ['op:sarajevo:sarajevo'], 'RBiH'],
];
console.log('\n=== KEY CONTROL CHECKS ===');
for (const [label, osids, expected] of checks) {
  const results = osids.map(osid => {
    const v = ctrl[osid];
    return v || 'null';
  });
  const pass = results.every(r => r === expected);
  console.log(`  ${pass ? 'PASS' : 'FAIL'} | ${label}: ${results.join(', ')} (expected ${expected})`);
}
