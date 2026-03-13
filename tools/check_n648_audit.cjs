const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n648/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));

// Battle outcomes
const outcomes = {};
let rsSuccess = 0, rsFail = 0, rbSuccess = 0, rbFail = 0;
let totalBattles = 0, rsBattles = 0;
for (const w of lines) {
    for (const b of (w.battles || [])) {
        outcomes[b.outcome] = (outcomes[b.outcome] || 0) + 1;
        totalBattles++;
        if (b.attacker_faction === 'RS') rsBattles++;
        const isWin = b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory';
        if (b.attacker_faction === 'RS') { if (isWin) rsSuccess++; else rsFail++; }
        if (b.attacker_faction === 'RBiH') { if (isWin) rbSuccess++; else rbFail++; }
    }
}
console.log('=== OUTCOME DISTRIBUTION ===');
const total = Object.values(outcomes).reduce((a,b) => a+b, 0);
for (const [o, c] of Object.entries(outcomes).sort((a,b) => b[1]-a[1])) {
    console.log(`${o}: ${c} (${(100*c/total).toFixed(1)}%)`);
}
console.log(`Total: ${total} (RS: ${rsBattles})`);

console.log('\n=== ATTACK SUCCESS RATES ===');
console.log(`RS: ${rsSuccess}/${rsSuccess+rsFail} = ${(100*rsSuccess/(rsSuccess+rsFail)).toFixed(1)}%`);
console.log(`RBiH: ${rbSuccess}/${rbSuccess+rbFail} = ${(100*rbSuccess/(rbSuccess+rbFail)).toFixed(1)}%`);

// Worst casualty ratios (both directions)
const allBattles = [];
for (const w of lines) {
    for (const b of (w.battles || [])) {
        const wk = w.week_index || w.week;
        const ratio = b.defender_casualties > 0 ? b.attacker_casualties / b.defender_casualties : 999;
        allBattles.push({ wk, ...b, ratio });
    }
}

console.log('\n=== WORST ATT:DEF RATIO (attacker-heavy) ===');
allBattles.sort((a, b) => b.ratio - a.ratio);
for (const b of allBattles.slice(0, 5)) {
    console.log(`w${b.wk}: ${b.attacker_faction}→${b.defender_faction} at ${b.target_osid||'?'} | ${b.outcome} | att:${b.attacker_casualties} def:${b.defender_casualties} | ratio:${b.ratio.toFixed(1)}:1`);
}

console.log('\n=== MOST DEFENDER-COSTLY (defender-heavy) ===');
allBattles.sort((a, b) => a.ratio - b.ratio);
for (const b of allBattles.slice(0, 5)) {
    console.log(`w${b.wk}: ${b.attacker_faction}→${b.defender_faction} at ${b.target_osid||'?'} | ${b.outcome} | att:${b.attacker_casualties} def:${b.defender_casualties} | ratio:${b.ratio.toFixed(1)}:1`);
}

// Troop counts
const f = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n648/final_save.json','utf8'));
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
console.log('\n=== TROOP STRENGTHS ===');
for (const [fac, d] of Object.entries(facs)) {
    console.log(`${fac}: ${d.count} formations, ${d.pers} total personnel`);
}

// Battles per week
console.log('\n=== BATTLES PER WEEK (first 15) ===');
for (const w of lines.slice(0, 15)) {
    const wk = w.week_index || w.week;
    const battles = (w.battles || []).length;
    const rsBt = (w.battles || []).filter(b => b.attacker_faction === 'RS').length;
    console.log(`w${wk}: ${battles} battles (RS: ${rsBt})`);
}
