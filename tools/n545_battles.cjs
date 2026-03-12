const fs = require('fs');
const lines = fs.readFileSync('data/derived/latest_run/weekly_report.jsonl', 'utf8').trim().split('\n');
let totalBattles = 0, totalAttCas = 0, totalDefCas = 0;
const byWeek = [];
for (const line of lines) {
  const w = JSON.parse(line);
  const battles = w.battles || [];
  let weekAttCas = 0, weekDefCas = 0;
  for (const b of battles) {
    weekAttCas += (b.attacker_casualties || 0);
    weekDefCas += (b.defender_casualties || 0);
  }
  totalBattles += battles.length;
  totalAttCas += weekAttCas;
  totalDefCas += weekDefCas;
  byWeek.push({ week: w.week, battles: battles.length, attCas: weekAttCas, defCas: weekDefCas });
}
console.log('Total battles:', totalBattles, 'Att cas:', totalAttCas, 'Def cas:', totalDefCas, 'Combat total:', totalAttCas + totalDefCas);

// Show by week
console.log('\nWeek | Battles | Att Cas | Def Cas');
for (const w of byWeek) {
  if (w.battles > 0) console.log(`  ${String(w.week).padStart(2)} |    ${String(w.battles).padStart(3)} |  ${String(w.attCas).padStart(5)} |  ${String(w.defCas).padStart(5)}`);
}

// RS attack count and success
let rsAttacks = 0, rsSuccess = 0;
let rbihAttacks = 0, rbihSuccess = 0;
let hrhbAttacks = 0, hrhbSuccess = 0;
for (const line of lines) {
  const w = JSON.parse(line);
  for (const b of (w.battles || [])) {
    const attFac = b.attacker_faction;
    const success = b.outcome === 'decisive' || b.outcome === 'victory' || b.outcome === 'costly';
    if (attFac === 'RS') { rsAttacks++; if (success) rsSuccess++; }
    else if (attFac === 'RBiH') { rbihAttacks++; if (success) rbihSuccess++; }
    else if (attFac === 'HRHB') { hrhbAttacks++; if (success) hrhbSuccess++; }
  }
}
console.log('\nRS attacks:', rsAttacks, 'success:', rsSuccess, 'rate:', (rsSuccess/rsAttacks*100).toFixed(1) + '%');
console.log('RBiH attacks:', rbihAttacks, 'success:', rbihSuccess, 'rate:', rbihAttacks > 0 ? (rbihSuccess/rbihAttacks*100).toFixed(1) + '%' : 'N/A');
console.log('HRHB attacks:', hrhbAttacks, 'success:', hrhbSuccess, 'rate:', hrhbAttacks > 0 ? (hrhbSuccess/hrhbAttacks*100).toFixed(1) + '%' : 'N/A');
