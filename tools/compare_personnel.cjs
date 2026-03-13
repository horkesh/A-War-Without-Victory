const fs = require('fs');

function getStrengths(runDir) {
    const save = JSON.parse(fs.readFileSync(`runs/${runDir}/final_save.json`, 'utf8'));
    const fmns = save.military.formations;
    const result = {};
    for (const [id, f] of Object.entries(fmns)) {
        if (f.kind === 'corps_asset' || f.kind === 'army_hq' || f.kind === 'paramilitary') continue;
        const fac = f.faction;
        if (!result[fac]) result[fac] = { active: 0, personnel: 0, destroyed: 0 };
        if (f.status === 'active') {
            result[fac].active++;
            result[fac].personnel += (f.personnel || 0);
        } else if (f.status === 'destroyed' || f.status === 'dissolved') {
            result[fac].destroyed++;
        }
    }
    return result;
}

// Find runs
const runs = fs.readdirSync('runs');
const n618dir = runs.filter(d => d.includes('n618')).sort().pop();
const n622dir = runs.filter(d => d.includes('n622')).sort().pop();

console.log('=== n618 (before — flat 3000 cap) ===');
const s618 = getStrengths(n618dir);
let total618 = 0;
for (const fac of ['RBiH', 'RS', 'HRHB']) {
    const r = s618[fac] || { active: 0, personnel: 0, destroyed: 0 };
    console.log(`  ${fac}: ${r.active} active, ${r.personnel.toLocaleString()} personnel, ${r.destroyed} destroyed`);
    total618 += r.personnel;
}
console.log(`  TOTAL: ${total618.toLocaleString()}`);

console.log('\n=== n622 (after — per-brigade caps) ===');
const s622 = getStrengths(n622dir);
let total622 = 0;
for (const fac of ['RBiH', 'RS', 'HRHB']) {
    const r = s622[fac] || { active: 0, personnel: 0, destroyed: 0 };
    console.log(`  ${fac}: ${r.active} active, ${r.personnel.toLocaleString()} personnel, ${r.destroyed} destroyed`);
    total622 += r.personnel;
}
console.log(`  TOTAL: ${total622.toLocaleString()}`);

console.log('\n=== Delta ===');
for (const fac of ['RBiH', 'RS', 'HRHB']) {
    const before = (s618[fac] || {}).personnel || 0;
    const after = (s622[fac] || {}).personnel || 0;
    const delta = after - before;
    const pct = before > 0 ? ((delta / before) * 100).toFixed(1) : 'N/A';
    console.log(`  ${fac}: ${delta >= 0 ? '+' : ''}${delta.toLocaleString()} (${pct}%)`);
}
const totalDelta = total622 - total618;
console.log(`  TOTAL: ${totalDelta >= 0 ? '+' : ''}${totalDelta.toLocaleString()} (${((totalDelta / total618) * 100).toFixed(1)}%)`);

// Historical comparison
console.log('\n=== Historical reference (w40 = ~Jan 1993) ===');
console.log('  ARBiH: 110,000-130,000');
console.log('  VRS:   90,000-100,000');
console.log('  HVO:   40,000-45,000');
console.log('  TOTAL: 240,000-275,000');
