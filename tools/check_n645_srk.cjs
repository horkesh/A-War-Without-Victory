const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n645/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));

console.log('=== SRK OPS ===');
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (!w.operation_diagnostics) continue;
    const srk = w.operation_diagnostics.filter(od => od.corps_id === 'vrs_sarajevo_romanija');
    for (const od of srk) {
        console.log('w' + wk + ':', JSON.stringify({name:od.operation_name, obj:od.current_objective, phase:od.operation_phase, battles:od.battle_count, captures:od.objective_capture_count, brigades:od.participating_brigades?.length}));
    }
}

// Total RS ops and battles
let rsBattles = 0;
const rsCorpsOps = {};
for (const w of lines) {
    if (w.operation_diagnostics) {
        for (const od of w.operation_diagnostics.filter(od => od.corps_id?.startsWith('vrs'))) {
            rsCorpsOps[od.corps_id] = (rsCorpsOps[od.corps_id] || 0) + 1;
        }
    }
    if (w.battles) rsBattles += w.battles.filter(b => b.attacker_faction === 'RS').length;
}
console.log('\nRS battles:', rsBattles);
console.log('RS op-weeks by corps:', JSON.stringify(rsCorpsOps, null, 2));

// SRK final state
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n645/final_save.json','utf8'));
const corpsState = final_.military.corps_command_state;
if (corpsState) {
    for (const [corps, state] of Object.entries(corpsState)) {
        if (!corps.startsWith('vrs')) continue;
        const ao = state.active_operation;
        if (ao) {
            console.log('\n' + corps + ':', ao.operation_name, 'phase:', ao.phase, 'mov_only:', ao.movement_only_execution_turns, 'attacks:', ao.attack_attempt_count, 'captures:', ao.objective_capture_count);
        } else {
            console.log('\n' + corps + ': no active op, exhaustion:', state.corps_exhaustion);
        }
    }
}

// Compare RS territory week by week
console.log('\n=== RS TERRITORY BY WEEK ===');
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (w.territory_counts) {
        const rs = w.territory_counts.RS || w.territory_counts.rs || 0;
        console.log('w' + wk + ': RS=' + rs);
    }
}
