const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const state = data.state || data.gameState || data;
const sectors = state.corps_front_sectors || {};
const frontEdges = state.war_front_edges_osid || [];

// Bosanska Gradiska RBiH front edges
console.log('=== Bosanska Gradiska RBiH front edges (POST-CONSOLIDATION) ===');
const bgEdges = frontEdges.filter(e =>
    (e.side_a === 'RBiH' || e.side_b === 'RBiH') &&
    (e.a.includes(':bosanska_gradiska:') || e.b.includes(':bosanska_gradiska:'))
);
for (const e of bgEdges) {
    let sector = 'NONE';
    for (const s of Object.values(sectors)) {
        if (s.faction === 'RBiH' && s.edge_ids.includes(e.edge_id)) {
            sector = `${s.sector_id} (${s.corps_id})`;
            break;
        }
    }
    console.log(`  ${e.a.split(':').slice(1).join(':')} vs ${e.b.split(':').slice(1).join(':')} -> ${sector}`);
}

// Cross-corps split check
console.log('\n=== Cross-Corps Split Check ===');
const factions = ['RBiH', 'RS', 'HRHB'];
for (const faction of factions) {
    const fEdges = frontEdges.filter(e => e.side_a === faction || e.side_b === faction);
    const edgeCorps = {};
    for (const s of Object.values(sectors)) {
        if (s.faction !== faction) continue;
        for (const eid of s.edge_ids) edgeCorps[eid] = s.corps_id;
    }
    // Adjacency: edges sharing a friendly OSID
    const osidToEdges = {};
    for (const e of fEdges) {
        const friendly = e.side_a === faction ? e.a : e.b;
        if (!osidToEdges[friendly]) osidToEdges[friendly] = [];
        osidToEdges[friendly].push(e.edge_id);
    }
    const visited = new Set();
    let splits = 0;
    for (const e of fEdges) {
        if (visited.has(e.edge_id)) continue;
        const component = [];
        const queue = [e.edge_id];
        visited.add(e.edge_id);
        while (queue.length > 0) {
            const eid = queue.shift();
            component.push(eid);
            const meta = fEdges.find(x => x.edge_id === eid);
            if (!meta) continue;
            const friendly = meta.side_a === faction ? meta.a : meta.b;
            for (const neighbor of osidToEdges[friendly] || []) {
                if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
            }
        }
        const corpsSet = new Set(component.map(eid => edgeCorps[eid]).filter(Boolean));
        if (corpsSet.size > 1) {
            splits++;
            console.log(`  ${faction}: split (${component.length} edges) across ${[...corpsSet].join(', ')}`);
        }
    }
    if (splits === 0) console.log(`  ${faction}: NO cross-corps splits`);
}
