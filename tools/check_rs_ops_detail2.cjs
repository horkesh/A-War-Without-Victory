const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

// Check operation_diagnostics for w1-w12
console.log('=== RS OPERATION DIAGNOSTICS w1-w12 ===');
for (const w of lines.slice(0, 12)) {
    const wk = w.week_index || w.week;
    const od = w.operation_diagnostics;
    if (od && typeof od === 'object') {
        // Could be array or object
        const items = Array.isArray(od) ? od : Object.entries(od).map(([k,v]) => ({id:k,...v}));
        for (const op of items) {
            const corps = op.corps || op.corps_id || '';
            if (corps.startsWith('vrs') || op.faction === 'RS') {
                console.log(`w${wk}: corps=${corps} op=${op.name || op.operation_id || op.id || '?'} target=${op.target_osid || op.objective_osid || '?'} status=${op.status || op.phase || '?'}`);
            }
        }
    }
    // Also check 'ops' if it's an object
    if (w.ops && typeof w.ops === 'object' && !Array.isArray(w.ops)) {
        for (const [k, v] of Object.entries(w.ops)) {
            if (k.startsWith('vrs') || (v && v.faction === 'RS')) {
                console.log(`w${wk} ops.${k}:`, JSON.stringify(v).slice(0, 200));
            }
        }
    }
}

// Check the RS timeline
console.log('\n=== RS TIMELINE DOCTRINE ===');
const timeline = JSON.parse(fs.readFileSync('data/scenarios/timelines/apr1992.json', 'utf8'));
if (timeline.doctrine_phases) {
    const rs = timeline.doctrine_phases.RS;
    if (rs) console.log(JSON.stringify(rs, null, 2).slice(0, 3000));
}

// Check corps directives in timeline
if (timeline.corps_directives) {
    for (const [corps, dirs] of Object.entries(timeline.corps_directives)) {
        if (corps.startsWith('vrs')) {
            console.log(`\n${corps}:`, JSON.stringify(dirs, null, 2).slice(0, 1500));
        }
    }
}

// Check pre-planned ops in scenario
console.log('\n=== SCENARIO PRE-PLANNED OPS ===');
const scenario = JSON.parse(fs.readFileSync('data/scenarios/apr1992_definitive_40w.json', 'utf8'));
if (scenario.pre_planned_operations) {
    const rsOps = scenario.pre_planned_operations.filter(op => op.faction === 'RS');
    for (const op of rsOps) {
        console.log(JSON.stringify(op));
    }
}
if (scenario.operations) {
    for (const [k, v] of Object.entries(scenario.operations)) {
        if (k.includes('RS') || k.includes('vrs') || (v.faction === 'RS')) {
            console.log('scenario.operations.' + k + ':', JSON.stringify(v).slice(0, 300));
        }
    }
}

// Check RS corps for Posavina brigades
console.log('\n=== RS POSAVINA CORPS ===');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const posavina_bdes = ['rs_1st_posavina_infantry', 'rs_2nd_posavina_light_infantry', 'rs_3rd_posavina_light_infantry',
    'rs_1st_doboj_light_infantry', 'rs_1st_krnjin_light_infantry', 'rs_1st_trebava_infantry', 'rs_27th_derventa_motorized'];
for (const bid of posavina_bdes) {
    const b = oob.find(x => x.id === bid);
    if (b) console.log(`${bid} | corps:${b.corps} | home:${b.home_mun}`);
}
