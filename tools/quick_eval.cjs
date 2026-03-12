const fs = require('fs');
const dir = process.argv[2] || 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n525';

const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
let t=0,s=0,e=0,es=0,la=0,ls=0,ac=0,dc=0;
const outcomes = {};
for (const w of lines) {
  if (!w.battles) continue;
  for (const b of w.battles) {
    t++;
    outcomes[b.outcome] = (outcomes[b.outcome]||0) + 1;
    const ok = b.outcome !== 'catastrophic' && b.outcome !== 'repulsed';
    if (ok) s++;
    var wk = w.week_index || w.week || 0;
    if (wk <= 12) { e++; if (ok) es++; }
    else { la++; if (ok) ls++; }
    ac += (b.attacker_casualties || 0);
    dc += (b.defender_casualties || 0);
  }
}
console.log('=== n' + dir.match(/n(\d+)/)?.[1] + ' Battle Stats ===');
console.log('Battles:', t, 'Success:', s, 'Rate:', (s/t*100).toFixed(1) + '%');
console.log('Early(w1-12):', e, 'success:', es, 'rate:', e > 0 ? (es/e*100).toFixed(1) + '%' : 'N/A');
console.log('Late(w13+):', la, 'success:', ls, 'rate:', la > 0 ? (ls/la*100).toFixed(1) + '%' : 'N/A');
console.log('Att cas:', ac, 'Def cas:', dc, 'Ratio:', dc > 0 ? (ac/dc).toFixed(2) : 'N/A');
console.log('Outcomes:', JSON.stringify(outcomes));

const save = JSON.parse(fs.readFileSync(dir + '/final_save.json', 'utf8'));
const ctrl = save.political_controllers || (save.political && save.political.political_controllers);

// Sarajevo
const sOsids = Object.keys(ctrl).filter(k =>
  k.includes('centar_sarajevo') || k.includes('novo_sarajevo') ||
  k.includes('stari_grad') || k.includes('novi_grad_sarajevo')
);
const sf = {};
sOsids.forEach(o => { sf[ctrl[o]] = (sf[ctrl[o]]||0) + 1; });
console.log('\nSarajevo OSID control:', JSON.stringify(sf));

// Key enclaves
const enclaveOsids = {
  bihac: k => k.includes('op:bihac:') || k.includes('op:cazin:') || k.includes('op:velika_kladusa:') || k.includes('op:bosanska_krupa:'),
  gorazde: k => k.includes('op:gorazde:'),
  srebrenica: k => k.includes('op:srebrenica:'),
};
for (const [name, fn] of Object.entries(enclaveOsids)) {
  const osids = Object.keys(ctrl).filter(fn);
  const byF = {};
  osids.forEach(o => { byF[ctrl[o]] = (byF[ctrl[o]]||0) + 1; });
  console.log(name + ':', JSON.stringify(byF));
}

// Enclave resilience
const er = (save.political && save.political.enclave_resilience) || {};
console.log('\nEnclave resilience:', JSON.stringify(er, null, 2));

// Casualties
const cl = save.military && save.military.casualty_ledger;
if (cl) {
  let tot = 0;
  for (const [fid, d] of Object.entries(cl)) {
    if (d && d.total_kia) {
      console.log(fid + ' KIA:', d.total_kia);
      tot += d.total_kia;
    }
  }
  console.log('Total KIA:', tot);
}

// Troop counts
const fmns = save.military && save.military.formations;
if (fmns) {
  const byFac = {};
  for (const f of Object.values(fmns)) {
    const fid = f.faction_id || 'unknown';
    byFac[fid] = (byFac[fid] || 0) + (f.personnel || 0);
  }
  console.log('\nTroop strength:', JSON.stringify(byFac));
}
