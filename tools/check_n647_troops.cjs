const fs = require('fs');
const f = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n647/final_save.json','utf8'));

const fmns = f.military.formations;
const facs = {};
for (const [id, fm] of Object.entries(fmns)) {
    if (!fm.dissolved) {
        const fac = fm.faction || '?';
        if (!facs[fac]) facs[fac] = { count: 0, pers: 0 };
        facs[fac].count++;
        facs[fac].pers += fm.personnel || 0;
    }
}
console.log('=== ACTIVE FORMATIONS ===');
for (const [fac, d] of Object.entries(facs)) {
    console.log(`${fac}: ${d.count} formations, ${d.pers} total personnel`);
}

// Casualty ledger
const l = f.military.casualty_ledger;
if (l && l.totals) {
    console.log('\n=== CASUALTIES ===');
    for (const [fac, d] of Object.entries(l.totals)) {
        console.log(`${fac}: KIA=${d.kia||0} WIA=${d.wia||0} MIA=${d.mia||0} total=${(d.kia||0)+(d.wia||0)+(d.mia||0)}`);
    }
} else {
    console.log('\nNo casualty ledger found');
}

// Dissolved count
let dissolved = 0;
for (const [id, fm] of Object.entries(fmns)) {
    if (fm.dissolved) dissolved++;
}
console.log('\nDissolved formations:', dissolved);

// Outcome distribution
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n647/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const outcomes = {};
for (const w of lines) {
    for (const b of (w.battles || [])) {
        outcomes[b.outcome] = (outcomes[b.outcome] || 0) + 1;
    }
}
console.log('\n=== OUTCOME DISTRIBUTION ===');
const total = Object.values(outcomes).reduce((a,b) => a+b, 0);
for (const [o, c] of Object.entries(outcomes).sort((a,b) => b[1]-a[1])) {
    console.log(`${o}: ${c} (${(100*c/total).toFixed(1)}%)`);
}
console.log(`Total: ${total}`);

// Battles per week
console.log('\n=== BATTLES PER WEEK (first 12) ===');
for (const w of lines.slice(0, 12)) {
    const wk = w.week_index || w.week;
    const battles = (w.battles || []).length;
    const rsBattles = (w.battles || []).filter(b => b.attacker_faction === 'RS').length;
    console.log(`w${wk}: ${battles} battles (RS: ${rsBattles})`);
}
