const fs = require('fs');
const dir = process.argv[2] || 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n552';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n');

console.log('Week | Battles | RS atk | RS suc | RBiH atk | HRHB atk | Att Cas | Def Cas');
console.log('-----|---------|--------|--------|----------|----------|--------|--------');

for (const line of lines) {
  const w = JSON.parse(line);
  const week = w.week || w.turn || '?';
  const battles = w.battles || [];
  let rsAtk = 0, rsSuc = 0, rbAtk = 0, hrAtk = 0, attCas = 0, defCas = 0;
  for (const b of battles) {
    const success = b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory';
    if (b.attacker_faction === 'RS') { rsAtk++; if (success) rsSuc++; }
    else if (b.attacker_faction === 'RBiH') { rbAtk++; }
    else if (b.attacker_faction === 'HRHB') { hrAtk++; }
    attCas += (b.attacker_casualties || 0);
    defCas += (b.defender_casualties || 0);
  }
  console.log(`  ${String(week).padStart(2)} |    ${String(battles.length).padStart(3)} |   ${String(rsAtk).padStart(3)} |   ${String(rsSuc).padStart(3)} |     ${String(rbAtk).padStart(3)} |     ${String(hrAtk).padStart(3)} |  ${String(attCas).padStart(5)} |  ${String(defCas).padStart(5)}`);
}
