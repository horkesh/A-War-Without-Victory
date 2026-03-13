const fs = require('fs');

// Find latest 40w run
const runs = fs.readdirSync('runs').filter(d => d.includes('4ab31bb498ec8005') && d.includes('40w')).sort();
const latest = runs[runs.length - 1];
console.log('Run:', latest);

// Check initial save for zavidovici brigades
const initial = JSON.parse(fs.readFileSync(`runs/${latest}/initial_save.json`, 'utf8'));
const final = JSON.parse(fs.readFileSync(`runs/${latest}/final_save.json`, 'utf8'));

const brigadeIds = ['arbih_328th_mountain', 'arbih_351st_liberation', 'rs_4th_ozren_light_infantry'];

console.log('\n=== INITIAL STATE ===');
for (const id of brigadeIds) {
    const f = initial.military.formations[id];
    if (!f) { console.log(`  ${id}: NOT IN FORMATIONS`); continue; }
    console.log(`  ${id} (${f.faction}): status=${f.status}, pers=${f.personnel}, cohesion=${f.cohesion}, morale=${f.morale}, location=${f.location_osid}, kind=${f.kind}`);
}

// Check zavidovici OSID control in initial state
console.log('\n=== INITIAL ZAVIDOVICI CONTROL ===');
const ipc = initial.political.political_controllers;
for (const [k, v] of Object.entries(ipc).filter(([k]) => k.includes('zavidovici')).sort()) {
    console.log(`  ${k}: ${v}`);
}

console.log('\n=== FINAL STATE ===');
for (const id of brigadeIds) {
    const f = final.military.formations[id];
    if (!f) { console.log(`  ${id}: NOT IN FORMATIONS`); continue; }
    console.log(`  ${id} (${f.faction}): status=${f.status}, pers=${f.personnel}, cohesion=${f.cohesion}, morale=${f.morale}, location=${f.location_osid}`);
}

// Trace weekly report for zavidovici control changes and battles
const lines = fs.readFileSync(`runs/${latest}/weekly_report.jsonl`, 'utf8').trim().split('\n');
console.log('\n=== WEEKLY DISSOLUTION/RECONSTITUTION ===');
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.brigade_dissolution) {
        for (const b of r.brigade_dissolution) {
            if (brigadeIds.includes(b.id)) {
                console.log(`  w${r.week_index} DISSOLVED: ${b.id} pers=${b.personnel_remaining} coh=${b.cohesion} mor=${b.morale}`);
            }
        }
    }
    if (r.brigade_reconstitution) {
        for (const b of r.brigade_reconstitution) {
            if (brigadeIds.includes(b.id)) {
                console.log(`  w${r.week_index} RECONSTITUTED: ${b.id} at ${b.home_mun} pers=${b.personnel_spawned}`);
            }
        }
    }
}

// Check battles involving zavidovici OSIDs
console.log('\n=== BATTLES AT ZAVIDOVICI ===');
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.battles) {
        for (const b of r.battles) {
            if (b.target_osid && b.target_osid.includes('zavidovici')) {
                console.log(`  w${r.week_index}: ${b.attacker_faction} attacks ${b.target_osid} (${b.outcome}, att_won=${b.attacker_won}, ratio=${b.power_ratio.toFixed(2)}, att_cas=${b.attacker_casualties}, def_cas=${b.defender_casualties})`);
            }
        }
    }
}

// Check control events for zavidovici
console.log('\n=== CONTROL EVENTS AT ZAVIDOVICI ===');
const events = final.political.control_events || [];
for (const e of events) {
    if (e.osid && e.osid.includes('zavidovici')) {
        console.log(`  turn ${e.turn}: ${e.osid} ${e.from} → ${e.to} (${e.mechanism || '?'})`);
    }
}
