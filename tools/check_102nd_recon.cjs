// Diagnose why 102nd Motorized doesn't reconstitute
const fs = require('fs');
const glob = require('path');

// Find latest run
const runsDir = 'runs';
const runs = fs.readdirSync(runsDir).filter(d => d.includes('40w')).sort();
const latestRun = runs[runs.length - 1];
console.log('Using run:', latestRun);

const j = JSON.parse(fs.readFileSync(`${runsDir}/${latestRun}/final_save.json`, 'utf8'));

const f = j.military.formations['arbih_102nd_motorized'];
console.log('\n=== 102nd Motorized State ===');
console.log('  status:', f.status);
console.log('  lifecycle_status:', f.lifecycle_status);
console.log('  destruction_turn:', f.destruction_turn);
console.log('  kind:', f.kind);
console.log('  faction:', f.faction);
console.log('  corps_id:', f.corps_id);
console.log('  home_osid:', f.home_osid);
console.log('  origin_mun:', f.origin_mun);
console.log('  max_personnel:', f.max_personnel);
console.log('  personnel:', f.personnel);
console.log('  location_osid:', f.location_osid);

// Check ilidza control
const pc = j.political.political_controllers;
const ilidzaOsids = Object.entries(pc).filter(([k]) => k.startsWith('op:ilidza:'));
console.log('\n=== Ilidza OSID Control ===');
ilidzaOsids.forEach(([k, v]) => console.log('  ' + k + ': ' + v));

// Check displacement events for ilidza
const log = j.displacement.displacement_event_log || [];
const ilidazaToOther = log.filter(e => e.origin_mun === 'ilidza' && e.ethnicity === 'RBiH' && e.dest_mun !== 'ilidza');
const byDest = {};
for (const e of ilidazaToOther) {
    if (!byDest[e.dest_mun]) byDest[e.dest_mun] = { total: 0, first_turn: e.turn };
    byDest[e.dest_mun].total += (e.settled || e.displaced || 0);
    if (e.turn < byDest[e.dest_mun].first_turn) byDest[e.dest_mun].first_turn = e.turn;
}
console.log('\n=== Displacement Destinations (sorted by settled) ===');
Object.entries(byDest).sort((a, b) => b[1].total - a[1].total).forEach(([k, v]) => {
    const poolKey = k + ':RBiH';
    const pool = j.military.militia_pools[poolKey];
    const controlled = Object.entries(pc).some(([osid, ctrl]) => osid.startsWith('op:' + k + ':') && ctrl === 'RBiH');
    console.log(`  ${k}: settled=${v.total}, first_turn=${v.first_turn}, pool_avail=${pool ? pool.available : 'NO POOL'}, controlled=${controlled}`);
});

// Check reconstitution events
const lines = fs.readFileSync(`${runsDir}/${latestRun}/weekly_report.jsonl`, 'utf8').trim().split('\n');
console.log('\n=== All Reconstitutions ===');
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.brigade_reconstitution) {
        for (const b of r.brigade_reconstitution) {
            console.log(`  w${r.week_index}: ${b.id} at ${b.home_mun}${b.refugee_mun ? ' (REFUGEE→' + b.refugee_mun + ')' : ''} pers:${b.personnel_spawned}`);
        }
    }
}

// Check dissolutions
console.log('\n=== All Dissolutions ===');
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.brigade_dissolution) {
        for (const b of r.brigade_dissolution) {
            const fm = j.military.formations[b.id];
            console.log(`  w${r.week_index}: ${b.id} (${b.faction}, corps:${fm ? fm.corps_id : '?'}) pers:${b.personnel_remaining}`);
        }
    }
}
