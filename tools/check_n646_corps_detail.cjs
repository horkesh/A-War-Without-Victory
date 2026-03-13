const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n646/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n646/final_save.json','utf8'));

// 1. Battles by corps (attacker)
console.log('=== BATTLES BY VRS CORPS ===');
const corpsBattles = {};
for (const w of lines) {
    if (!w.battles) continue;
    for (const b of w.battles) {
        if (b.attacker_faction !== 'RS') continue;
        // Try to determine corps from attacker brigades or location
        const corps = b.attacker_corps_id || 'unknown';
        if (!corpsBattles[corps]) corpsBattles[corps] = { count: 0, wins: 0, targets: {} };
        corpsBattles[corps].count++;
        if (b.outcome === 'decisive' || b.outcome === 'victory') corpsBattles[corps].wins++;
        const t = b.target_osid || b.defender_osid || 'unknown';
        corpsBattles[corps].targets[t] = (corpsBattles[corps].targets[t] || 0) + 1;
    }
}
for (const [corps, data] of Object.entries(corpsBattles)) {
    console.log(`${corps}: ${data.count} battles, ${data.wins} wins`);
    const sorted = Object.entries(data.targets).sort((a,b) => b[1]-a[1]).slice(0,5);
    for (const [t, c] of sorted) console.log(`  ${t}: ${c} attacks`);
}

// 2. Drina corps formations — location and strength
console.log('\n=== DRINA CORPS FORMATIONS ===');
const fmns = final_.military.formations;
for (const [id, f] of Object.entries(fmns)) {
    if (f.corps_id === 'vrs_drina') {
        console.log(`${id} | pers:${f.personnel} | loc:${f.location_osid} | stance:${f.stance} | fatigue:${(f.fatigue||0).toFixed(1)} | morale:${f.morale}`);
    }
}

// 3. East Bosnian corps formations
console.log('\n=== EAST BOSNIAN CORPS FORMATIONS ===');
for (const [id, f] of Object.entries(fmns)) {
    if (f.corps_id === 'vrs_east_bosnian') {
        console.log(`${id} | pers:${f.personnel} | loc:${f.location_osid} | stance:${f.stance} | fatigue:${(f.fatigue||0).toFixed(1)} | morale:${f.morale}`);
    }
}

// 4. Drina region control
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
console.log('\n=== DRINA REGION CONTROL ===');
console.log('Control:', JSON.stringify(counts));
console.log('Total OSIDs:', drinaOsids.length);

// 5. Compare with n635
const pc635 = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n635/final_save.json','utf8')).political.political_controllers;
const counts635 = {};
for (const o of drinaOsids) { if (pc635[o]) counts635[pc635[o]] = (counts635[pc635[o]] || 0) + 1; }
console.log('n635 control:', JSON.stringify(counts635));

// 6. Operation objectives for Drina ops
console.log('\n=== DRINA CORPS OPERATION OBJECTIVES ===');
for (const w of lines) {
    if (!w.operation_diagnostics) continue;
    for (const od of w.operation_diagnostics.filter(od => od.corps_id === 'vrs_drina')) {
        const wk = w.week_index || w.week;
        console.log(`w${wk}: ${od.operation_name} | phase:${od.operation_phase} | obj:${JSON.stringify(od.current_objective)} | captures:${od.objective_capture_count} | brigades:${od.participating_brigades ? od.participating_brigades.length : 0}`);
    }
}
