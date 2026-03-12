const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

// Dump ALL keys of operation_diagnostics entries to understand the structure
console.log('=== OPERATION DIAGNOSTICS STRUCTURE (w1) ===');
const w1 = lines[0];
if (w1.operation_diagnostics) {
    const od = w1.operation_diagnostics;
    if (Array.isArray(od)) {
        console.log('Array of', od.length, 'items');
        if (od[0]) console.log('Keys:', Object.keys(od[0]));
        // Show first few RS items fully
        for (const item of od.filter(x => x.corps_id?.startsWith('vrs') || x.corps?.startsWith('vrs')).slice(0, 3)) {
            console.log(JSON.stringify(item, null, 2));
        }
    } else {
        console.log('Object with keys:', Object.keys(od));
        for (const [k, v] of Object.entries(od)) {
            if (k.startsWith('vrs') || (typeof v === 'object' && v && JSON.stringify(v).includes('vrs'))) {
                console.log(k + ':', JSON.stringify(v, null, 2).slice(0, 500));
            }
        }
    }
}

// Check game state for active operations
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/final_save.json', 'utf8'));
console.log('\n=== GAME STATE: CORPS OPERATIONS (final) ===');
const corpsCmdState = final_.military.corps_command_state;
if (corpsCmdState) {
    for (const [corps, state] of Object.entries(corpsCmdState)) {
        if (corps.startsWith('vrs')) {
            const ops = state.active_operations || state.operations || [];
            console.log(`${corps}: ${Array.isArray(ops) ? ops.length : Object.keys(ops).length} ops`);
            if (state.directives) console.log(`  directives: ${JSON.stringify(state.directives).slice(0, 200)}`);
            // Show full state
            console.log(`  full:`, JSON.stringify(state, null, 2).slice(0, 500));
        }
    }
} else {
    console.log('No corps_command_state found');
    // Check other possible locations
    console.log('military keys:', Object.keys(final_.military));
}

// Check initial save for corps_command_state
const init = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/initial_save.json', 'utf8'));
console.log('\n=== GAME STATE: CORPS COMMAND (initial) ===');
if (init.military.corps_command_state) {
    for (const [corps, state] of Object.entries(init.military.corps_command_state)) {
        if (corps.startsWith('vrs')) {
            console.log(`${corps}:`, JSON.stringify(state, null, 2).slice(0, 300));
        }
    }
}

// Check the weekly report for 'ops' field structure
console.log('\n=== WEEKLY REPORT "ops" FIELD (w3) ===');
const w3 = lines[2];
if (w3.ops) {
    console.log('Type:', typeof w3.ops, Array.isArray(w3.ops) ? 'array' : 'not-array');
    console.log(JSON.stringify(w3.ops, null, 2).slice(0, 2000));
}

// Check activity_summary for ops
const activity = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/activity_summary.json', 'utf8'));
console.log('\n=== ACTIVITY SUMMARY (RS) ===');
if (activity.operations_launched) {
    const rsOps = activity.operations_launched.filter(o => o.faction === 'RS' || o.corps?.startsWith('vrs'));
    console.log('RS ops launched:', rsOps.length);
    for (const op of rsOps.slice(0, 10)) {
        console.log(JSON.stringify(op));
    }
}
// Check all top-level keys
console.log('Activity keys:', Object.keys(activity));
