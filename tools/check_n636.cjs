const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n636';
const s = JSON.parse(fs.readFileSync(dir + '/run_summary.json', 'utf8'));
const passed = s.anchor_checks.filter(c => c.passed).length;
console.log('Benchmarks:', passed + '/' + s.anchor_checks.length);
for (const c of s.anchor_checks) {
    if (c.passed === false) console.log('  FAIL', c.anchor_id, 'expected:', c.expected_controller, 'actual:', c.actual_controller);
}
const pc = JSON.parse(fs.readFileSync(dir + '/final_save.json', 'utf8')).political.political_controllers;
const counts = {};
for (const v of Object.values(pc)) { counts[v] = (counts[v] || 0) + 1; }
console.log('RS w40:', (counts.RS / Object.keys(pc).length).toFixed(3));
console.log('HRHB total:', counts.HRHB, '(painted 86)');

// Key regions
const regionCheck = (name, prefixes) => {
    const osids = Object.keys(pc).filter(k => prefixes.some(p => k.startsWith(p)));
    const byF = {};
    for (const o of osids) { byF[pc[o]] = (byF[pc[o]] || 0) + 1; }
    console.log(name + ':', JSON.stringify(byF));
};
regionCheck('Gradacac', ['op:gradacac:']);
regionCheck('Brcko', ['op:brcko:']);
regionCheck('Gorazde', ['op:gorazde:']);
regionCheck('Srebrenica', ['op:srebrenica:']);

// Check vrs_east_bosnian ops
const lines = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
console.log('\n=== VRS_EAST_BOSNIAN OPS w1-w6 ===');
for (const w of lines.slice(0, 6)) {
    const wk = w.week_index || w.week;
    if (!w.operation_diagnostics) continue;
    const eb = w.operation_diagnostics.find(od => od.corps_id === 'vrs_east_bosnian');
    if (eb) {
        console.log(`w${wk}: "${eb.operation_name}" → ${eb.current_objective} | phase:${eb.operation_phase} | battles:${eb.battle_count} | captures:${eb.objective_capture_count}`);
    }
}

// Check RS battles in Gradačac
console.log('\n=== GRADAČAC BATTLES ===');
for (const w of lines.slice(0, 15)) {
    const wk = w.week_index || w.week;
    if (!w.battles) continue;
    for (const b of w.battles) {
        const osid = b.target_osid || '';
        if (osid.startsWith('op:gradacac:')) {
            console.log(`w${wk}: ${osid} | att:${b.attacker_faction} ${b.attacker_brigade} | outcome:${b.outcome}`);
        }
    }
}
