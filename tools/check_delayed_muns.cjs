const oob = JSON.parse(require('fs').readFileSync('data/source/oob_brigades.json', 'utf8'));

// Group brigades by municipality (from home_osid), using available_from field
const byMun = {};
for (const b of oob) {
    if (!b.home_osid) continue;
    const parts = b.home_osid.split(':');
    if (parts.length < 3) continue;
    const mun = parts[1];
    if (!byMun[mun]) byMun[mun] = [];
    byMun[mun].push({ id: b.id, faction: b.faction, from: b.available_from || 0 });
}

// Find municipalities with 2+ brigades where ALL have available_from > 0
const problems = [];
for (const [mun, bgs] of Object.entries(byMun)) {
    if (bgs.length < 2) continue;
    if (bgs.every(b => b.from > 0)) {
        problems.push({ mun, bgs });
    }
}

problems.sort((a, b) => a.mun.localeCompare(b.mun));
console.log(`${problems.length} municipalities with 2+ brigades ALL delayed:\n`);
for (const p of problems) {
    console.log(`${p.mun} (${p.bgs.length} brigades):`);
    for (const b of p.bgs.sort((a, b) => a.from - b.from)) {
        console.log(`  ${b.id} (${b.faction}) available_from=w${b.from}`);
    }
}

// Also count: municipalities with 2+ same-faction brigades where ALL are delayed
console.log('\n--- Same-faction only (ignoring cross-faction municipalities) ---');
const byMunFaction = {};
for (const b of oob) {
    if (!b.home_osid) continue;
    const mun = b.home_osid.split(':')[1];
    const key = `${mun}:${b.faction}`;
    if (!byMunFaction[key]) byMunFaction[key] = [];
    byMunFaction[key].push({ id: b.id, from: b.available_from || 0 });
}
let count = 0;
for (const [key, bgs] of Object.entries(byMunFaction)) {
    if (bgs.length < 2) continue;
    if (bgs.every(b => b.from > 0)) {
        const [mun, faction] = key.split(':');
        console.log(`${mun} (${faction}, ${bgs.length} brigades):`);
        for (const b of bgs.sort((a, b) => a.from - b.from)) {
            console.log(`  ${b.id} available_from=w${b.from}`);
        }
        count++;
    }
}
console.log(`\nTotal: ${count} faction-municipality groups`);
