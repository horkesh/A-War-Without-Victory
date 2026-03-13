const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n647/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));

console.log('=== DRINA CORPS OPERATIONS (n647) ===');
for (const w of lines) {
    if (!w.operation_diagnostics) continue;
    for (const od of w.operation_diagnostics.filter(od => od.corps_id === 'vrs_drina')) {
        const wk = w.week_index || w.week;
        console.log(`w${wk}: ${od.operation_name} | phase:${od.operation_phase} | obj:${JSON.stringify(od.current_objective)} | captures:${od.objective_capture_count} | brigades:${od.participating_brigades ? od.participating_brigades.length : 0}`);
    }
}

// Total battles
let total = 0, rs = 0;
for (const w of lines) {
    const b = w.battles || [];
    total += b.length;
    rs += b.filter(x => x.attacker_faction === 'RS').length;
}
console.log('\nTotal battles:', total, 'RS:', rs);

// Drina region control
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n647/final_save.json','utf8'));
const pc = final_.political.political_controllers;
const drinaOsids = Object.keys(pc).filter(k =>
    k.startsWith('op:srebrenica:') || k.startsWith('op:bratunac:') ||
    k.startsWith('op:rogatica:') || k.startsWith('op:gorazde:') ||
    k.startsWith('op:foca:') || k.startsWith('op:cajnice:') ||
    k.startsWith('op:visegrad:') || k.startsWith('op:vlasenica:') ||
    k.startsWith('op:hanpijesak:') || k.startsWith('op:sokolac:') ||
    k.startsWith('op:rudo:')
);
const counts = {};
for (const o of drinaOsids) { counts[pc[o]] = (counts[pc[o]] || 0) + 1; }
console.log('\nDrina region: RS=' + (counts.RS||0) + ' RBiH=' + (counts.RBiH||0) + ' (total ' + drinaOsids.length + ')');

// Drina corps final state
console.log('\n=== DRINA FORMATIONS (final) ===');
const fmns = final_.military.formations;
for (const [id, f] of Object.entries(fmns)) {
    if (f.corps_id === 'vrs_drina') {
        console.log(`${id} | pers:${f.personnel} | loc:${f.location_osid} | morale:${f.morale} | fatigue:${(f.fatigue||0).toFixed(1)}`);
    }
}
