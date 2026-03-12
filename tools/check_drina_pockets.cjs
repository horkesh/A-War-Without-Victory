const fs = require('fs');
const save = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n630/final_save.json', 'utf8'));
const pc = save.political.political_controllers;
const fmns = save.military.formations;

const defended = new Set();
for (const f of Object.values(fmns)) {
  if (f.status === 'active' && f.location_osid && f.kind === 'brigade') defended.add(f.location_osid);
}

const edgeData = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const edges = edgeData.edges || edgeData;
const adj = new Map();
for (const e of edges) {
  if (!e.a || !e.b) continue;
  if (!adj.has(e.a)) adj.set(e.a, new Set());
  if (!adj.has(e.b)) adj.set(e.b, new Set());
  adj.get(e.a).add(e.b);
  adj.get(e.b).add(e.a);
}

const drinaMunis = ['bratunac','vlasenica','srebrenica','zvornik','rogatica','visegrad','foca','cajnice','gorazde'];
const drinaRbih = Object.keys(pc).filter(k => {
  if (pc[k] !== 'RBiH') return false;
  return drinaMunis.some(m => k.startsWith('op:' + m + ':'));
}).filter(o => !defended.has(o));

console.log('Undefended RBiH Drina:', drinaRbih.length);
console.log('Op: adj keys:', [...adj.keys()].filter(k => k.startsWith('op:')).length);

// BFS to find connected RBiH component for each undefended Drina OSID
const allRbih = new Set(Object.keys(pc).filter(k => pc[k] === 'RBiH' && k.startsWith('op:')));
const visited = new Set();
const drinaSet = new Set(drinaRbih);
const componentInfo = [];

for (const startOsid of [...allRbih].sort()) {
  if (visited.has(startOsid)) continue;
  const comp = [];
  const q = [startOsid];
  visited.add(startOsid);
  while (q.length > 0) {
    const c = q.shift();
    comp.push(c);
    const neighbors = adj.get(c) || new Set();
    for (const n of neighbors) {
      if (!visited.has(n) && allRbih.has(n) && n.startsWith('op:')) {
        visited.add(n);
        q.push(n);
      }
    }
  }
  const drinaInComp = comp.filter(o => drinaSet.has(o));
  if (drinaInComp.length > 0) {
    componentInfo.push({ size: comp.length, drinaUndefended: drinaInComp.length, comp, drina: drinaInComp });
  }
}

componentInfo.sort((a, b) => b.size - a.size);
for (const ci of componentInfo) {
  console.log('\nComponent size:', ci.size, '| Drina undefended:', ci.drinaUndefended);
  if (ci.size <= 20) {
    console.log('  All:', ci.comp.sort().join(', '));
  } else {
    console.log('  Drina undefended:', ci.drina.sort().join(', '));
    // Show non-Drina members count
    const nonDrina = ci.comp.filter(o => !drinaMunis.some(m => o.startsWith('op:' + m + ':')));
    console.log('  Non-Drina RBiH in component:', nonDrina.length);
  }
}

// For isolated singletons, check why consolidation doesn't flip them
console.log('\n=== CONSOLIDATION CHECK (singletons) ===');
const singletons = componentInfo.filter(ci => ci.size === 1);
let fullyRS = 0, mixed = 0, noAdj = 0;
for (const ci of singletons.slice(0, 10)) {
  const osid = ci.comp[0];
  const neighbors = [...(adj.get(osid) || [])].filter(n => n.startsWith('op:'));
  const nCtrl = {};
  for (const n of neighbors) {
    const ctrl = pc[n] || 'NONE';
    nCtrl[ctrl] = (nCtrl[ctrl] || 0) + 1;
  }
  console.log(osid, '→ neighbors:', JSON.stringify(nCtrl));
  if (neighbors.length === 0) noAdj++;
  else if (Object.keys(nCtrl).length === 1 && nCtrl['RS']) fullyRS++;
  else mixed++;
}
console.log('\nOf first 10 singletons: fullyRS=' + fullyRS + ' mixed=' + mixed + ' noAdj=' + noAdj);
