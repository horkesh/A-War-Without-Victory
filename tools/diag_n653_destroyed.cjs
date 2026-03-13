#!/usr/bin/env node
const fs = require('fs');
const dir = 'runs/apr1992_definitive_40w__4ab31bb498ec8005__w40_n653';
const final_ = JSON.parse(fs.readFileSync(`${dir}/final_save.json`, 'utf8'));
const fFmns = final_.military.formations || {};

const byFaction = {};
let destroyedBrigades = [];
let disbandedParas = [];

for (const [id, f] of Object.entries(fFmns)) {
    if (f.kind === 'army_hq' || f.kind === 'corps_asset') continue;
    const fac = f.faction || 'unknown';
    if (!byFaction[fac]) byFaction[fac] = { active: 0, destroyed: 0, disbanded: 0, withdrawn: 0, total: 0 };
    byFaction[fac].total++;
    if (f.status === 'active') byFaction[fac].active++;
    if (f.lifecycle_status === 'destroyed') byFaction[fac].destroyed++;
    if (f.lifecycle_status === 'disbanded') byFaction[fac].disbanded++;
    if (f.lifecycle_status === 'withdrawn') byFaction[fac].withdrawn++;

    if (f.lifecycle_status === 'destroyed' && f.kind === 'brigade') {
        destroyedBrigades.push({
            id, name: f.name || id, faction: fac, corps: f.corps_id,
            home: f.home_osid, loc: f.location_osid,
            cohesion: f.cohesion, morale: f.morale, disrupted: f.disrupted_turns || 0
        });
    }
    if (f.lifecycle_status === 'disbanded' && f.kind === 'paramilitary') {
        disbandedParas.push({ id, faction: fac });
    }
}

console.log('=== FORMATION STATUS BY FACTION ===');
for (const [fac, d] of Object.entries(byFaction)) {
    console.log(`${fac}: active=${d.active} destroyed=${d.destroyed} disbanded=${d.disbanded} withdrawn=${d.withdrawn} total=${d.total}`);
}

console.log(`\n=== DESTROYED BRIGADES (${destroyedBrigades.length}) ===`);
for (const b of destroyedBrigades) {
    console.log(`  ${b.faction} | ${b.name} | corps=${b.corps} | home=${b.home} | final_loc=${b.loc}`);
    console.log(`    cohesion=${(b.cohesion||0).toFixed(1)} morale=${b.morale} disrupted=${b.disrupted}`);
}

console.log(`\n=== DISBANDED PARAMILITARIES (${disbandedParas.length}) ===`);
const paraByFac = {};
for (const p of disbandedParas) {
    paraByFac[p.faction] = (paraByFac[p.faction] || 0) + 1;
}
for (const [fac, cnt] of Object.entries(paraByFac)) {
    console.log(`  ${fac}: ${cnt}`);
}

// Check JNA/HV phantoms
const phantoms = Object.entries(fFmns).filter(([,f]) => f.kind === 'jna_phantom' || f.kind === 'hv_phantom');
if (phantoms.length > 0) {
    console.log(`\n=== JNA/HV PHANTOMS (${phantoms.length}) ===`);
    for (const [id, f] of phantoms) {
        console.log(`  ${id}: status=${f.status} lifecycle=${f.lifecycle_status}`);
    }
}

// Summary
const totalDestroyed = destroyedBrigades.length;
const totalDisbanded = disbandedParas.length;
const totalPhantomWithdrawn = Object.values(fFmns).filter(f => f.lifecycle_status === 'withdrawn').length;
console.log(`\n=== TOTAL LOSSES ===`);
console.log(`  Brigades destroyed (combat): ${totalDestroyed}`);
console.log(`  Paramilitaries disbanded (scripted): ${totalDisbanded}`);
console.log(`  Phantoms withdrawn (scripted): ${totalPhantomWithdrawn}`);
console.log(`  Grand total inactive: ${totalDestroyed + totalDisbanded + totalPhantomWithdrawn}`);
