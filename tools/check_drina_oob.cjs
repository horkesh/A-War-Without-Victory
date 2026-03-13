const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/scenarios/initial_formations/initial_formations_apr1992_all_brigades.json','utf8'));
const drina = d.formations.filter(b => b.corps === 'vrs_drina' && b.kind !== 'corps_asset');
console.log('Drina brigades:', drina.length);
for (const b of drina) {
    console.log(`${b.id} | ${b.name || '?'} | pers:${b.personnel} | home:${b.home_osid} | avail:${b.available_from || 0}`);
}

console.log('\n=== EAST BOSNIAN CORPS ===');
const eb = d.formations.filter(b => b.corps === 'vrs_east_bosnian' && b.kind !== 'corps_asset');
console.log('East Bosnian brigades:', eb.length);
for (const b of eb) {
    console.log(`${b.id} | ${b.name || '?'} | pers:${b.personnel} | home:${b.home_osid} | avail:${b.available_from || 0}`);
}

// All VRS corps counts
console.log('\n=== ALL VRS CORPS SIZES ===');
const vrsBrigades = d.formations.filter(b => b.faction === 'RS' && b.kind !== 'corps_asset');
const corpsCounts = {};
for (const b of vrsBrigades) {
    corpsCounts[b.corps] = (corpsCounts[b.corps] || 0) + 1;
}
for (const [c, n] of Object.entries(corpsCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`${c}: ${n} brigades`);
}
