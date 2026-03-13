// Identify which brigade per faction-municipality group should become available_from=0
const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

// Group by mun:faction
const groups = {};
for (const b of oob) {
    if (!b.home_osid) continue;
    const mun = b.home_osid.split(':')[1];
    const key = `${mun}:${b.faction}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
}

// Find groups where ALL brigades are delayed
const fixes = [];
for (const [key, bgs] of Object.entries(groups)) {
    if (bgs.length < 2) continue;
    if (bgs.every(b => (b.available_from || 0) > 0)) {
        // Pick the one with lowest available_from (earliest), then alphabetically
        bgs.sort((a, b) => (a.available_from || 0) - (b.available_from || 0) || a.id.localeCompare(b.id));
        const earliest = bgs[0];
        fixes.push({ key, id: earliest.id, oldFrom: earliest.available_from, faction: earliest.faction });
    }
}

fixes.sort((a, b) => a.id.localeCompare(b.id));
console.log(`${fixes.length} brigades to set available_from=0:\n`);
for (const f of fixes) {
    console.log(`  ${f.id} (${f.faction}) ${f.key}: was available_from=${f.oldFrom}`);
}
