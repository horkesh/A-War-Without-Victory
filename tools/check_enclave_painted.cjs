const fs = require('fs');

// Get ALL osids and their painted targets
// The painted targets come from the comparison tool — let me reconstruct
// by reading the scenario's painted target data
const scenario = JSON.parse(fs.readFileSync('data/scenarios/apr1992_definitive_40w.json', 'utf8'));

// The comparison tool derives painted targets from osid_control_overrides + init_control
// Let me just grep the compare tool output for all three enclaves
// Instead, let me check what RBiH paints exist for each enclave municipality

const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n628/initial_save.json', 'utf8'));
const pc0 = save.political.political_controllers;
const finalSave = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n628/final_save.json', 'utf8'));
const pcF = finalSave.political.political_controllers;

// Load painted targets from control_delta
const cd = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n628/control_delta.json', 'utf8'));

console.log('=== GORAŽDE (op:gorazde:*) ===');
const gorazdeOsids = Object.keys(pc0).filter(k => k.startsWith('op:gorazde:')).sort();
console.log(`Total: ${gorazdeOsids.length} OSIDs`);
let gorazdeRbihInit = 0, gorazdeRbihFinal = 0, gorazdeRbihPainted = 0;
for (const o of gorazdeOsids) {
    const init = pc0[o];
    const final_ = pcF[o];
    const delta = cd[o];
    const painted = delta ? delta.painted : init; // if no delta entry, painted = init
    if (init === 'RBiH') gorazdeRbihInit++;
    if (final_ === 'RBiH') gorazdeRbihFinal++;
    if (painted === 'RBiH') gorazdeRbihPainted++;
    console.log(`  ${o}: init=${init} painted=${painted || '?'} final=${final_}`);
}
console.log(`RBiH: init=${gorazdeRbihInit} painted=${gorazdeRbihPainted} final=${gorazdeRbihFinal}`);

console.log('\n=== SREBRENICA (op:srebrenica:*) ===');
const srebOsids = Object.keys(pc0).filter(k => k.startsWith('op:srebrenica:')).sort();
console.log(`Total: ${srebOsids.length} OSIDs`);
let srebRbihInit = 0, srebRbihFinal = 0, srebRbihPainted = 0;
for (const o of srebOsids) {
    const init = pc0[o];
    const final_ = pcF[o];
    const delta = cd[o];
    const painted = delta ? delta.painted : init;
    if (init === 'RBiH') srebRbihInit++;
    if (final_ === 'RBiH') srebRbihFinal++;
    if (painted === 'RBiH') srebRbihPainted++;
    console.log(`  ${o}: init=${init} painted=${painted || '?'} final=${final_}`);
}
console.log(`RBiH: init=${srebRbihInit} painted=${srebRbihPainted} final=${srebRbihFinal}`);

// Check for Žepa OSIDs
console.log('\n=== ŽEPA (op:rogatica:zepa* or similar) ===');
const zepaOsids = Object.keys(pc0).filter(k => k.includes('zepa')).sort();
console.log(`Total: ${zepaOsids.length} OSIDs`);
for (const o of zepaOsids) {
    const init = pc0[o];
    const final_ = pcF[o];
    console.log(`  ${o}: init=${init} final=${final_}`);
}

// Also check Bratunac (between Srebrenica and Žepa)
console.log('\n=== BRATUNAC (op:bratunac:*) ===');
const bratOsids = Object.keys(pc0).filter(k => k.startsWith('op:bratunac:')).sort();
for (const o of bratOsids) {
    const init = pc0[o];
    const final_ = pcF[o];
    const delta = cd[o];
    const painted = delta ? delta.painted : init;
    console.log(`  ${o}: init=${init} painted=${painted || '?'} final=${final_}`);
}
