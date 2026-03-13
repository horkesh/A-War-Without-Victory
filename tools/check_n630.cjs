const fs = require('fs');
const s = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n630/run_summary.json', 'utf8'));
const passed = s.anchor_checks.filter(c => c.passed).length;
console.log('Benchmarks:', passed + '/' + s.anchor_checks.length);
for (const c of s.anchor_checks) {
    if (c.passed === false) console.log('  FAIL', c.anchor_id, 'expected:', c.expected_controller, 'actual:', c.actual_controller);
}
const pc = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n630/final_save.json', 'utf8')).political.political_controllers;
const counts = {};
for (const v of Object.values(pc)) { counts[v] = (counts[v] || 0) + 1; }
console.log('RS w40:', (counts.RS / Object.keys(pc).length).toFixed(3));
console.log('HRHB total:', counts.HRHB, '(painted 86)');

// Drina check
const drina = Object.keys(pc).filter(k =>
    k.startsWith('op:bratunac:') || k.startsWith('op:vlasenica:') || k.startsWith('op:srebrenica:') ||
    k.startsWith('op:zvornik:') || k.startsWith('op:rogatica:') || k.startsWith('op:visegrad:') ||
    k.startsWith('op:foca:') || k.startsWith('op:cajnice:') || k.startsWith('op:gorazde:')
);
const drinaByFaction = {};
for (const o of drina) { drinaByFaction[pc[o]] = (drinaByFaction[pc[o]] || 0) + 1; }
console.log('\nDrina:', JSON.stringify(drinaByFaction));

const fmns = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n630/final_save.json', 'utf8')).military.formations;
const defendedOsids = new Set();
for (const f of Object.values(fmns)) {
    if (f.status === 'active' && f.location_osid && f.kind === 'brigade') defendedOsids.add(f.location_osid);
}
const drinaRbih = drina.filter(o => pc[o] === 'RBiH');
const undefended = drinaRbih.filter(o => !defendedOsids.has(o));
console.log('RBiH Drina OSIDs:', drinaRbih.length, 'undefended:', undefended.length);
