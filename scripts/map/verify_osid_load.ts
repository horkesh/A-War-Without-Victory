import { loadSettlementGraph } from '../../src/map/settlements.js';

async function run() {
    const g = await loadSettlementGraph();
    const ids = Array.from(g.settlements.keys());
    console.log(`Loaded ${ids.length} settlements`);
    console.log(`First 10 IDs: ${ids.slice(0, 10).join(', ')}`);
}

run().catch(console.error);
