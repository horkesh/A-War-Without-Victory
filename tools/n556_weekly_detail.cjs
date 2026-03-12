const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__819a5354397182c1__w40_n556';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').trim().split('\n');

// Track operations and battles per week
let weekNum = 0;
for (const line of lines) {
  weekNum++;
  const w = JSON.parse(line);
  const battles = w.battles || [];
  const ops = w.operations_launched || w.ops_launched || [];
  const rsB = battles.filter(b => b.attacker_faction === 'RS').length;
  const rsSuc = battles.filter(b => b.attacker_faction === 'RS' &&
    (b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory')).length;

  // Check for operation info
  const opInfo = w.active_operations || w.operations || '';

  if (battles.length > 0 || weekNum <= 5 || weekNum >= 35) {
    console.log(`w${String(weekNum).padStart(2)} | battles: ${battles.length} (RS: ${rsB}, suc: ${rsSuc}) | ops: ${JSON.stringify(ops).substring(0,80)}`);
  }
}

// Check what fields are available in weekly report
console.log('\n=== Weekly report fields (first entry) ===');
const first = JSON.parse(lines[0]);
console.log(Object.keys(first).join(', '));

// Check last entry
console.log('\n=== Weekly report fields (last entry) ===');
const last = JSON.parse(lines[lines.length - 1]);
console.log(Object.keys(last).join(', '));

// Show a sample entry
console.log('\n=== Sample week (entry 5) ===');
const sample = JSON.parse(lines[4]);
for (const [k, v] of Object.entries(sample)) {
  if (k === 'battles') {
    console.log(`  ${k}: [${v.length} battles]`);
  } else if (typeof v === 'object' && v !== null) {
    console.log(`  ${k}: ${JSON.stringify(v).substring(0, 120)}`);
  } else {
    console.log(`  ${k}: ${v}`);
  }
}
