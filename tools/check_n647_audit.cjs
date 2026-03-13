const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n647/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));

// Sample 10 individual battles across the run
console.log('=== SAMPLE BATTLES ===');
let count = 0;
for (const w of lines) {
    for (const b of (w.battles || [])) {
        if (count >= 15) break;
        const wk = w.week_index || w.week;
        console.log(`w${wk}: ${b.attacker_faction} → ${b.defender_faction} at ${b.target_osid || '?'} | outcome:${b.outcome} | att_cas:${b.attacker_casualties} def_cas:${b.defender_casualties} | power_ratio:${(b.power_ratio || 0).toFixed(2)}`);
        count++;
    }
    if (count >= 15) break;
}

// RS attack success rate
let rsSuccess = 0, rsFail = 0;
let rbSuccess = 0, rbFail = 0;
for (const w of lines) {
    for (const b of (w.battles || [])) {
        const isWin = b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory';
        if (b.attacker_faction === 'RS') { if (isWin) rsSuccess++; else rsFail++; }
        if (b.attacker_faction === 'RBiH') { if (isWin) rbSuccess++; else rbFail++; }
    }
}
console.log('\n=== ATTACK SUCCESS RATES ===');
console.log(`RS: ${rsSuccess} wins / ${rsSuccess+rsFail} total = ${(100*rsSuccess/(rsSuccess+rsFail)).toFixed(1)}%`);
console.log(`RBiH: ${rbSuccess} wins / ${rbSuccess+rbFail} total = ${(100*rbSuccess/(rbSuccess+rbFail)).toFixed(1)}%`);

// Territory progression
console.log('\n=== RS TERRITORY BY WEEK ===');
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (w.territory_counts) {
        const rs = w.territory_counts.RS || w.territory_counts.rs || 0;
        const total = Object.values(w.territory_counts).reduce((a, b) => a + b, 0);
        console.log(`w${wk}: RS=${rs}/${total} (${(100*rs/total).toFixed(1)}%)`);
    }
}

// Worst casualty ratio battles
console.log('\n=== WORST CASUALTY RATIO BATTLES ===');
const allBattles = [];
for (const w of lines) {
    for (const b of (w.battles || [])) {
        const wk = w.week_index || w.week;
        const ratio = b.defender_casualties > 0 ? b.attacker_casualties / b.defender_casualties : 999;
        allBattles.push({ wk, ...b, ratio });
    }
}
allBattles.sort((a, b) => b.ratio - a.ratio);
for (const b of allBattles.slice(0, 5)) {
    console.log(`w${b.wk}: ${b.attacker_faction}→${b.defender_faction} at ${b.target_osid||'?'} | ${b.outcome} | att:${b.attacker_casualties} def:${b.defender_casualties} | ratio:${b.ratio.toFixed(1)}:1`);
}

// Also check the inverse — defender-heavy
allBattles.sort((a, b) => a.ratio - b.ratio);
console.log('\n=== MOST DEFENDER-COSTLY BATTLES ===');
for (const b of allBattles.slice(0, 5)) {
    console.log(`w${b.wk}: ${b.attacker_faction}→${b.defender_faction} at ${b.target_osid||'?'} | ${b.outcome} | att:${b.attacker_casualties} def:${b.defender_casualties} | ratio:${b.ratio.toFixed(1)}:1`);
}

// Total casualties by faction
const facCas = {};
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n647/final_save.json','utf8'));
const ledger = final_.military.casualty_ledger;
if (ledger && ledger.totals) {
    console.log('\n=== TOTAL CASUALTIES (from ledger) ===');
    for (const [fac, data] of Object.entries(ledger.totals)) {
        console.log(`${fac}: KIA=${data.kia||0} WIA=${data.wia||0} MIA=${data.mia||0} total=${(data.kia||0)+(data.wia||0)+(data.mia||0)}`);
    }
}
