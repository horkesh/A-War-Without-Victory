/**
 * DA1 probe (siege displacement lane, 2026-11-13): replays the displacement pressure
 * path's inputs on a real save and reports what it sees with the legacy settlement
 * edges it receives today versus the operational (OSID) graph its settlements come from.
 *
 * Read-only: works on a deserialized copy, writes nothing to data/.
 * Usage: npx tsx tools/diagnostics/siege_displacement_probe.ts <save.json>
 */
import { readFileSync } from 'node:fs';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { computeFrontEdges, computeFrontEdgesOsid } from '../../src/map/front_edges.js';
import { loadOperationalData } from '../../src/data/operational_data.js';
import { deserializeState } from '../../src/state/serialize.js';
import { buildAdjacencyMap } from '../../src/map/adjacency_map.js';
import { computeSupplyReachability } from '../../src/state/supply_reachability.js';

async function main(): Promise<void> {
    const savePath = process.argv[2] ?? 'data/derived/latest_run_final_save.json';
    const state = deserializeState(readFileSync(savePath, 'utf8'));
    const opGraph = await loadSettlementGraph();
    const legacy = await loadSettlementGraph({
        settlementsPath: 'data/source/settlements_initial_master.json',
        edgesPath: 'data/derived/settlement_edges.json',
    });
    const opData = await loadOperationalData();

    const pc = state.political.political_controllers ?? {};
    const pcKeys = Object.keys(pc);
    const pools = state.military.militia_pools ?? {};
    const poolKeys = Object.keys(pools).sort();
    const settlementKeys = [...opGraph.settlements.keys()].sort();
    const osidMun = new Map<string, string>();
    for (const [sid, rec] of opGraph.settlements) osidMun.set(sid, String(rec.mun1990_id ?? rec.mun_code));

    const frontLegacy = computeFrontEdges(state, legacy.edges);
    const frontOpRaw = computeFrontEdges(state, opGraph.edges);
    const frontOsid = computeFrontEdgesOsid(state, opGraph.edges, opData.operationalToCanonical);

    const legacySupply = computeSupplyReachability(state, buildAdjacencyMap(legacy.edges));
    const opSupply = computeSupplyReachability(state, buildAdjacencyMap(opGraph.edges));
    const reachSample = (r: typeof legacySupply) =>
        r.factions.map((f) => ({ faction: f.faction_id, reachable: f.reachable_controlled.length, sample: f.reachable_controlled.slice(0, 2) }));

    const poolMuns = new Set<string>();
    for (const k of poolKeys) {
        const p = pools[k] as { mun_id?: string };
        poolMuns.add(typeof p?.mun_id === 'string' ? p.mun_id : k);
    }
    const settlementMuns = new Set(osidMun.values());
    const poolMunsWithoutSettlements = [...poolMuns].filter((m) => !settlementMuns.has(m)).sort();

    const out = {
        save: savePath,
        turn: state.meta.turn,
        political_controllers: { count: pcKeys.length, op_keyed: pcKeys.filter((k) => k.startsWith('op:')).length, sample: pcKeys.slice(0, 3) },
        settlements_passed_to_updateDisplacement: { count: settlementKeys.length, sample: settlementKeys.slice(0, 3) },
        legacy_edges: { count: legacy.edges.length, sample: legacy.edges.slice(0, 2).map((e) => `${e.a}__${e.b}`) },
        op_edges: { count: opGraph.edges.length, sample: opGraph.edges.slice(0, 2).map((e) => `${e.a}__${e.b}`) },
        front_edges: { legacy_edges: frontLegacy.length, op_edges_computeFrontEdges: frontOpRaw.length, op_edges_computeFrontEdgesOsid: frontOsid.length },
        front_segments: { count: Object.keys(state.military.front_segments ?? {}).length, active: Object.values(state.military.front_segments ?? {}).filter((s) => (s as { active?: boolean })?.active === true).length },
        war_front_edges_osid: (state.military as { war_front_edges_osid?: unknown[] }).war_front_edges_osid?.length ?? null,
        front_pressure_keys: Object.keys(state.military.front_pressure ?? {}).length,
        supply_legacy: reachSample(legacySupply),
        supply_op_edges: reachSample(opSupply),
        last_supply_state_by_osid: (() => {
            const m = state.political.last_supply_state_by_osid ?? {};
            const tally: Record<string, number> = {};
            for (const v of Object.values(m)) tally[String(v)] = (tally[String(v)] ?? 0) + 1;
            return tally;
        })(),
        pools: { count: poolKeys.length, distinct_muns: poolMuns.size, sample: poolKeys.slice(0, 4), muns_without_settlements: poolMunsWithoutSettlements },
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main().catch((err) => {
    process.stderr.write(String(err instanceof Error ? err.stack : err) + '\n');
    process.exit(1);
});
