const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n645';
const lines = fs.readFileSync(dir + '/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const final_ = JSON.parse(fs.readFileSync(dir + '/final_save.json','utf8'));

// 1. RS ops by corps — lifecycle summary
console.log('=== RS OPERATION LIFECYCLE BY CORPS ===');
const opsTracker = {};
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (!w.operation_diagnostics) continue;
    for (const od of w.operation_diagnostics.filter(od => od.corps_id?.startsWith('vrs'))) {
        const key = od.corps_id + ':' + od.operation_name;
        if (!opsTracker[key]) opsTracker[key] = {corps: od.corps_id, name: od.operation_name, start: wk, end: wk, captures: 0, battles: 0, brigades: 0};
        opsTracker[key].end = wk;
        opsTracker[key].captures = Math.max(opsTracker[key].captures, od.objective_capture_count || 0);
        opsTracker[key].battles += od.battle_count || 0;
        opsTracker[key].brigades = Math.max(opsTracker[key].brigades, od.participating_brigades?.length || 0);
    }
}
for (const [k, v] of Object.entries(opsTracker)) {
    console.log(`${v.corps} | ${v.name} | w${v.start}-w${v.end} | ${v.battles} battles | ${v.captures} captures | ${v.brigades} brigades`);
}

// 2. RS battles per week
console.log('\n=== RS BATTLES PER WEEK ===');
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (!w.battles) { console.log('w' + wk + ': 0 battles'); continue; }
    const rs = w.battles.filter(b => b.attacker_faction === 'RS');
    console.log('w' + wk + ': ' + rs.length + ' RS attacks');
}

// 3. Drina corps details
console.log('\n=== DRINA CORPS ===');
const pc = final_.political.political_controllers;
const drinaOsids = Object.keys(pc).filter(k => k.startsWith('op:srebrenica:') || k.startsWith('op:bratunac:') || k.startsWith('op:rogatica:') || k.startsWith('op:gorazde:') || k.startsWith('op:foca:') || k.startsWith('op:cajnice:') || k.startsWith('op:visegrad:') || k.startsWith('op:vlasenica:'));
const drinaCounts = {};
for (const o of drinaOsids) { drinaCounts[pc[o]] = (drinaCounts[pc[o]] || 0) + 1; }
console.log('Drina region control:', JSON.stringify(drinaCounts));
console.log('Drina total OSIDs:', drinaOsids.length);

// 4. Formations for vrs_drina and vrs_east_bosnian
console.log('\n=== VRS DRINA + EAST BOSNIAN BRIGADES ===');
const fmns = final_.military.formations;
for (const [id, f] of Object.entries(fmns)) {
    if (f.corps_id === 'vrs_drina' || f.corps_id === 'vrs_east_bosnian') {
        console.log(`${id} | ${f.corps_id} | pers:${f.personnel} | loc:${f.location_osid} | stance:${f.stance}`);
    }
}

// 5. Operation stall data — check for any stuck ops
console.log('\n=== FINAL SAVE: ALL VRS ACTIVE OPS ===');
const corpsState = final_.military.corps_command_state;
for (const [corps, state] of Object.entries(corpsState)) {
    if (!corps.startsWith('vrs')) continue;
    const ao = state.active_operation;
    if (ao) {
        console.log(`${corps}: "${ao.operation_name}" phase=${ao.phase} mov_only=${ao.movement_only_execution_turns} attacks=${ao.attack_attempt_count} captures=${ao.objective_capture_count} failures=${ao.failure_count}`);
        if (ao.axes) {
            for (const ax of ao.axes) {
                console.log(`  axis "${ax.axis_name}": status=${ax.status} mov_only=${ax.movement_only_execution_turns} attacks=${ax.attack_attempt_count} idle=${ax.idle_execution_turn_streak}`);
            }
        }
    } else {
        console.log(`${corps}: no active op, exhaustion=${state.corps_exhaustion}`);
    }
}

// 6. Compare n635 and n645 RS territory at key weeks
const lines635 = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n635/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
console.log('\n=== RS TERRITORY: n635 vs n645 ===');
for (let i = 0; i < Math.min(lines.length, lines635.length); i++) {
    const wk = lines[i].week_index || lines[i].week || i+1;
    // Count RS in battles
    const rs645 = (lines[i].battles || []).filter(b => b.attacker_faction === 'RS').length;
    const rs635 = (lines635[i].battles || []).filter(b => b.attacker_faction === 'RS').length;
    // Count RS territory from control_deltas or similar
    console.log(`w${wk}: n635=${rs635} RS attacks, n645=${rs645} RS attacks`);
}
