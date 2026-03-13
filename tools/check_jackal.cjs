const fs = require('fs');
const dir = process.argv[2] || 'runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n662';
const lines = fs.readFileSync(`${dir}/weekly_report.jsonl`, 'utf8').trim().split('\n');

console.log('=== OPERATION JACKAL SEARCH ===\n');

for (const line of lines) {
    const r = JSON.parse(line);

    // Check operation_diagnostics for Jackal or HVO SE Herzegovina
    if (r.operation_diagnostics && Array.isArray(r.operation_diagnostics)) {
        for (const op of r.operation_diagnostics) {
            if (op.operation_name && op.operation_name.toLowerCase().includes('jackal')) {
                console.log(`w${r.week_index} OP_DIAG: ${op.operation_name} phase=${op.operation_phase} obj=${op.current_objective} attacks=${op.attack_attempt_count} battles=${op.battle_count}`);
            }
            if (op.corps_id === 'hvo_southeast_herzegovina') {
                console.log(`w${r.week_index} HVO_SE: ${op.operation_name} phase=${op.operation_phase} obj=${op.current_objective} attacks=${op.attack_attempt_count} battles=${op.battle_count} captures=${op.objective_capture_count}`);
            }
        }
    }

    // Check battles at Jackal target OSIDs
    if (r.battles && Array.isArray(r.battles)) {
        for (const b of r.battles) {
            const targets = ['tasovcici', 'rotimlja', 'pjesivac', 'stolac_2', 'vranjevici', 'kruzanj'];
            if (b.target_osid && targets.some(t => b.target_osid.includes(t))) {
                console.log(`w${r.week_index} BATTLE: ${b.attacker_faction} attacks ${b.target_osid} outcome=${b.outcome} att_won=${b.attacker_won} ratio=${b.power_ratio?.toFixed(2)}`);
            }
        }
    }

    // Check control changes at Jackal target OSIDs
    if (r.control_change_attribution && Array.isArray(r.control_change_attribution)) {
        for (const c of r.control_change_attribution) {
            const targets = ['tasovcici', 'rotimlja', 'pjesivac', 'stolac_2', 'vranjevici', 'kruzanj'];
            if (c.osid && targets.some(t => c.osid.includes(t))) {
                console.log(`w${r.week_index} CONTROL: ${c.osid} ${c.from} → ${c.to} (${c.mechanism || '?'})`);
            }
        }
    }
}

// Check corps summary for HVO SE Herzegovina
console.log('\n=== HVO SE HERZEGOVINA CORPS SUMMARY ===\n');
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.corps_summary && Array.isArray(r.corps_summary)) {
        for (const c of r.corps_summary) {
            if (c.corps_id === 'hvo_southeast_herzegovina') {
                console.log(`w${r.week_index}: stance=${c.stance} brigades=${c.brigade_count} active_ops=${c.active_operations || 0} directive_stance=${c.directive_stance || '?'}`);
            }
        }
    }
}

// Check final state for Jackal formations
console.log('\n=== JACKAL BRIGADE STATUS (FINAL) ===\n');
const final = JSON.parse(fs.readFileSync(`${dir}/final_save.json`, 'utf8'));
const jackalBrigades = [
    'hrhb_stolac_units', 'hrhb_capljina_brigade', 'hrhb_1st_herzegovina_brigade_knez_domagoj',
    'hv_4th_guards_tg', 'hrhb_1st_brigade_mostar', 'hrhb_2nd_brigade_mostar',
    'hrhb_mostar_brigade', 'hv_116th_brigade_tg'
];
for (const id of jackalBrigades) {
    const f = final.military.formations[id];
    if (!f) {
        console.log(`  ${id}: NOT FOUND`);
    } else {
        console.log(`  ${id}: status=${f.status} pers=${f.personnel} loc=${f.location_osid} faction=${f.faction}`);
    }
}

// Check initial state too
const initial = JSON.parse(fs.readFileSync(`${dir}/initial_save.json`, 'utf8'));
console.log('\n=== JACKAL BRIGADE STATUS (INITIAL) ===\n');
for (const id of jackalBrigades) {
    const f = initial.military.formations[id];
    if (!f) {
        console.log(`  ${id}: NOT FOUND in initial`);
    } else {
        console.log(`  ${id}: status=${f.status} pers=${f.personnel} loc=${f.location_osid} faction=${f.faction}`);
    }
}
