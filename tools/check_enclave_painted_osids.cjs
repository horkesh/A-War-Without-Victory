const fs = require('fs');

// Load scenario to get painted targets (osid_control_overrides at w40)
const scenario = JSON.parse(fs.readFileSync('data/scenarios/apr1992_definitive_40w.json', 'utf8'));
const overrides = scenario.osid_control_overrides || {};

// Load initial save to get starting control
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n630/initial_save.json', 'utf8'));
const pc0 = save.political.political_controllers;

// Painted target = override value if exists, else initial value
function getPainted(osid) {
    if (overrides[osid]) return overrides[osid];
    return pc0[osid];
}

// Check each enclave
const enclaves = {
    gorazde: { prefix: 'op:gorazde:', osids: [] },
    srebrenica: { prefix: 'op:srebrenica:', osids: [] },
    zepa_rogatica: { prefix: 'op:rogatica:', osids: [] },
    bratunac: { prefix: 'op:bratunac:', osids: [] },
    visegrad: { prefix: 'op:visegrad:', osids: [] },
};

for (const osid of Object.keys(pc0).sort()) {
    for (const [name, enc] of Object.entries(enclaves)) {
        if (osid.startsWith(enc.prefix)) {
            enc.osids.push(osid);
        }
    }
}

console.log('=== GORAŽDE ===');
const gorazdeRbih = enclaves.gorazde.osids.filter(o => getPainted(o) === 'RBiH');
console.log('Total OSIDs:', enclaves.gorazde.osids.length);
console.log('Painted RBiH:', gorazdeRbih.length);
for (const o of gorazdeRbih) {
    console.log('  ' + o, 'init=' + pc0[o], 'painted=' + getPainted(o));
}
const gorazdeRS = enclaves.gorazde.osids.filter(o => getPainted(o) === 'RS');
console.log('Painted RS:', gorazdeRS.length);

console.log('\n=== SREBRENICA ===');
const srebRbih = enclaves.srebrenica.osids.filter(o => getPainted(o) === 'RBiH');
console.log('Total OSIDs:', enclaves.srebrenica.osids.length);
console.log('Painted RBiH:', srebRbih.length);
for (const o of srebRbih) {
    console.log('  ' + o, 'init=' + pc0[o], 'painted=' + getPainted(o));
}

console.log('\n=== ŽEPA (op:rogatica:zepa*) ===');
const zepaRbih = enclaves.zepa_rogatica.osids.filter(o => o.includes('zepa') && getPainted(o) === 'RBiH');
console.log('Žepa RBiH painted:', zepaRbih.length);
for (const o of zepaRbih) {
    console.log('  ' + o, 'init=' + pc0[o], 'painted=' + getPainted(o));
}

// Also check other rogatica osids for RBiH
const rogRbih = enclaves.zepa_rogatica.osids.filter(o => getPainted(o) === 'RBiH');
console.log('All Rogatica RBiH painted:', rogRbih.length);
for (const o of rogRbih) {
    console.log('  ' + o, 'init=' + pc0[o], 'painted=' + getPainted(o));
}

console.log('\n=== BRATUNAC ===');
const bratRbih = enclaves.bratunac.osids.filter(o => getPainted(o) === 'RBiH');
console.log('Painted RBiH:', bratRbih.length);
for (const o of bratRbih) {
    console.log('  ' + o, 'init=' + pc0[o], 'painted=' + getPainted(o));
}

console.log('\n=== VIŠEGRAD ===');
const visRbih = enclaves.visegrad.osids.filter(o => getPainted(o) === 'RBiH');
console.log('Painted RBiH:', visRbih.length);
for (const o of visRbih) {
    console.log('  ' + o, 'init=' + pc0[o], 'painted=' + getPainted(o));
}

// Summary for code
console.log('\n=== CODE-READY OSID LISTS ===');
console.log('Goražde:', JSON.stringify(gorazdeRbih));
console.log('Srebrenica:', JSON.stringify(srebRbih));
console.log('Žepa:', JSON.stringify(zepaRbih));
