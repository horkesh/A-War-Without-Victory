const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const formations = save.military.formations;

// Find RBiH corps
const corpsIds = [];
for (const [id, f] of Object.entries(formations)) {
    if (f.faction !== 'RBiH') continue;
    if (f.kind !== 'corps_asset' && f.kind !== 'corps') continue;
    corpsIds.push(id);
}
console.log('RBiH corps:', corpsIds);

// Collect home_osid seeds per corps
const homeSeeds = new Map(); // corpsId -> Set<osid>
const locSeeds = new Map();  // corpsId -> Set<osid>

for (const [id, f] of Object.entries(formations)) {
    if (f.faction !== 'RBiH' || f.status !== 'active') continue;
    if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
    const corpsId = f.corps_id;
    if (!corpsId) continue;

    if (f.home_osid) {
        if (!homeSeeds.has(corpsId)) homeSeeds.set(corpsId, new Set());
        homeSeeds.get(corpsId).add(f.home_osid);
    }
    if (f.location_osid) {
        if (!locSeeds.has(corpsId)) locSeeds.set(corpsId, new Set());
        locSeeds.get(corpsId).add(f.location_osid);
    }
}

// Print seeds by corps, grouped by municipality
for (const corpsId of [...homeSeeds.keys()].sort()) {
    console.log('\n=== ' + corpsId + ' HOME seeds ===');
    const seeds = [...homeSeeds.get(corpsId)].sort();
    const byMun = {};
    for (const s of seeds) {
        const mun = s.split(':')[1] || s;
        if (!byMun[mun]) byMun[mun] = [];
        byMun[mun].push(s);
    }
    for (const mun of Object.keys(byMun).sort()) {
        console.log('  ' + mun + ': ' + byMun[mun].length + ' OSIDs');
    }
}

console.log('\n=== LOCATION seeds (only unclaimed by home) ===');
for (const corpsId of [...locSeeds.keys()].sort()) {
    const homeClaimed = homeSeeds.get(corpsId) || new Set();
    const locs = [...(locSeeds.get(corpsId) || [])].filter(o => {
        // Check if ANY corps claimed it via home
        for (const [, hs] of homeSeeds) {
            if (hs.has(o)) return false;
        }
        return true;
    });
    if (locs.length > 0) {
        console.log('\n  ' + corpsId + ':');
        for (const o of locs.sort()) {
            const mun = o.split(':')[1] || o;
            console.log('    ' + mun + ': ' + o);
        }
    }
}

// Check for overlapping home claims (both corps have brigades homed at same OSID)
console.log('\n=== Overlapping home claims ===');
const allHomeOsids = new Map(); // osid -> [corpsId, ...]
for (const [corpsId, seeds] of homeSeeds) {
    for (const osid of seeds) {
        if (!allHomeOsids.has(osid)) allHomeOsids.set(osid, []);
        allHomeOsids.get(osid).push(corpsId);
    }
}
for (const [osid, corps] of [...allHomeOsids.entries()].sort()) {
    if (corps.length > 1) {
        console.log('  ' + osid + ' claimed by: ' + corps.join(', '));
    }
}

// Count brigades per corps
console.log('\n=== Brigade count per corps ===');
const countPerCorps = {};
for (const [id, f] of Object.entries(formations)) {
    if (f.faction !== 'RBiH' || f.status !== 'active') continue;
    if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
    const c = f.corps_id || 'none';
    countPerCorps[c] = (countPerCorps[c] || 0) + 1;
}
for (const c of Object.keys(countPerCorps).sort()) {
    console.log('  ' + c + ': ' + countPerCorps[c] + ' brigades');
}
