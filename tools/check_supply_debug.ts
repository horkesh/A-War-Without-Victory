import { buildOsidAdjacency } from '../src/sim/combat/osid_adjacency.js';
import { loadOperationalData, loadOperationalEdges } from '../src/data/operational_data.js';
import { getPoliticalControllerOSID } from '../src/state/settlement_control.js';
import * as fs from 'fs';

const state = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n71/initial_save.json', 'utf8'));
const [opData, edges] = await Promise.all([loadOperationalData(), loadOperationalEdges()]);
const adjacency = buildOsidAdjacency(edges);
const reverseMap = opData.operationalToCanonical;

// Check rs_43rd_prijedor_motorized at op:prijedor:brezicani
const checkBrigades = ['rs_43rd_prijedor_motorized', 'rs_1st_zvornik', 'rs_1st_birac', 'rs_27th_derventa_motorized', 'rs_1st_posavina_infantry'];
for (const bid of checkBrigades) {
    const b = (state.formations as Record<string, any>)?.[bid];
    if (!b) { console.log(bid, '→ NOT FOUND'); continue; }
    const loc = b.location_osid;
    const neighbors = adjacency.get(loc) ?? [];
    const enemies = neighbors.filter((n: string) => {
        const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
        return ctrl !== null && ctrl !== 'RS' && ctrl !== b.faction;
    });
    console.log(bid, '@', loc, '→', enemies.length, 'adjacent enemies:', enemies.slice(0,3));
}
