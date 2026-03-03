const fs = require('fs');

const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const s = save.state || save;
const pc = s.political_controllers || {};
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const c2o = JSON.parse(fs.readFileSync('data/derived/operational/canonical_to_operational_map.json', 'utf8'));

// Build adjacency
const adj = new Map();
for (const edge of graph.edges || []) {
    if (typeof edge.a !== 'string' || typeof edge.b !== 'string') continue;
    if (!edge.a.startsWith('op:') || !edge.b.startsWith('op:')) continue;
    if (!adj.has(edge.a)) adj.set(edge.a, []);
    if (!adj.has(edge.b)) adj.set(edge.b, []);
    adj.get(edge.a).push(edge.b);
    adj.get(edge.b).push(edge.a);
}

// RBiH-controlled OSIDs
const rbihOsids = new Set();
for (const k of Object.keys(pc)) {
    if (k.startsWith('op:') && pc[k] === 'RBiH') rbihOsids.add(k);
}

// Connected components via BFS
const visited = new Set();
const components = [];
for (const osid of [...rbihOsids].sort()) {
    if (visited.has(osid)) continue;
    const comp = new Set();
    const queue = [osid];
    visited.add(osid);
    while (queue.length > 0) {
        const cur = queue.shift();
        comp.add(cur);
        for (const n of adj.get(cur) || []) {
            if (rbihOsids.has(n) && !visited.has(n)) {
                visited.add(n);
                queue.push(n);
            }
        }
    }
    components.push(comp);
}
components.sort((a, b) => b.size - a.size);

// Supply source mapping
const srcSids = {
    S166499: 'Sarajevo', S162973: 'Zenica', S155551: 'Tuzla',
    S100838: 'Bihac', S158275: 'Visoko', S127477: 'Konjic'
};
const srcOsids = {};
for (const [sid, name] of Object.entries(srcSids)) {
    srcOsids[c2o[sid] || 'UNMAPPED'] = name;
}

console.log('RBiH connected components:', components.length);
for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const srcsInComp = [];
    for (const osid of comp) {
        if (srcOsids[osid]) srcsInComp.push(srcOsids[osid] + ' (' + osid + ')');
    }
    if (comp.size >= 3 || srcsInComp.length > 0) {
        const label = srcsInComp.length ? ' — sources: ' + srcsInComp.join(', ') : '';
        console.log('  Component ' + i + ': ' + comp.size + ' OSIDs' + label);
        if (comp.size <= 10) {
            for (const o of [...comp].sort()) console.log('    ' + o);
        }
    }
}

console.log('\nSupply source OSIDs:');
for (const [osid, name] of Object.entries(srcOsids)) {
    console.log('  ' + name + ': ' + osid);
}
