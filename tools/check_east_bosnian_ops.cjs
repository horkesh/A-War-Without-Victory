const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

// Show ALL operation diagnostics for w1-w6, focusing on vrs_east_bosnian
console.log('=== ALL OPS BY WEEK (w1-w12) ===');
for (const w of lines.slice(0, 12)) {
    const wk = w.week_index || w.week;
    if (!w.operation_diagnostics) continue;
    const eastBos = w.operation_diagnostics.filter(od => od.corps_id === 'vrs_east_bosnian');
    const allRS = w.operation_diagnostics.filter(od => od.faction_id === 'RS');

    console.log(`\nw${wk} — ${allRS.length} RS ops:`);
    for (const od of allRS) {
        console.log(`  ${od.corps_id}: "${od.operation_name}" → ${od.current_objective} | phase:${od.operation_phase} | battles:${od.battle_count} | brigades:${od.participating_brigades?.length || 0}`);
    }
}

// Track what vrs_east_bosnian targets across time
console.log('\n\n=== VRS_EAST_BOSNIAN TARGET SEQUENCE ===');
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (!w.operation_diagnostics) continue;
    const eastBos = w.operation_diagnostics.filter(od => od.corps_id === 'vrs_east_bosnian');
    for (const od of eastBos) {
        const mun = od.current_objective ? od.current_objective.split(':')[1] : '?';
        console.log(`w${wk}: "${od.operation_name}" → ${od.current_objective} (${mun}) | phase:${od.operation_phase} | captures:${od.objective_capture_count} | battles:${od.battle_count} | brigades:[${(od.participating_brigades || []).join(', ')}]`);
    }
}
