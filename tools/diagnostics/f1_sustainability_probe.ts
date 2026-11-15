/**
 * F1 probe (legacy S-id consumer sweep, 2026-11-14): on a real save, what the sustainability
 * and militia-fatigue steps see with the OSID front/supply inputs the war step now passes,
 * versus the legacy settlement edges they received before F1.
 *
 * Read-only: evaluates on deserialized copies, writes nothing.
 * Usage: npx tsx tools/diagnostics/f1_sustainability_probe.ts <save.json> [more saves...] [--json]
 */
import { readFileSync } from 'node:fs';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { loadOperationalData } from '../../src/data/operational_data.js';
import { deserializeState } from '../../src/state/serialize.js';
import { updateSustainability } from '../../src/state/sustainability.js';
import { updateMilitiaFatigue } from '../../src/state/militia_fatigue.js';
import { buildOsidDisplacementPressureInputs } from '../../src/sim/turn_phases/war_phases.js';
import type { GameState } from '../../src/state/game_state.js';

type Row = {
    save: string;
    turn: number;
    legacy: { surrounded: number; unsupplied_pools_by_faction: Record<string, number> };
    osid: {
        evaluated_muns: number;
        surrounded_by_holder: Record<string, string[]>;
        unsupplied_pools_by_faction: Record<string, number>;
        unsupplied_pools_in_unheld_mun_by_faction: Record<string, number>;
        front_edges: number;
    };
};

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const json = args.includes('--json');
    const saves = args.filter((a) => !a.startsWith('--'));
    if (saves.length === 0) throw new Error('usage: f1_sustainability_probe.ts <save.json> [...] [--json]');

    const opGraph = await loadSettlementGraph();
    const legacy = await loadSettlementGraph({
        settlementsPath: 'data/source/settlements_initial_master.json',
        edgesPath: 'data/derived/settlement_edges.json',
    });
    const opData = await loadOperationalData();
    const od = { opData, edges: opGraph.edges } as unknown as Parameters<typeof buildOsidDisplacementPressureInputs>[1];

    const rows: Row[] = [];
    for (const path of saves) {
        const raw = readFileSync(path, 'utf8');
        const fresh = (): GameState => {
            const s = deserializeState(raw);
            s.displacement.sustainability_state = {}; // instantaneous status, not the accumulated score
            return s;
        };

        const sLegacy = fresh();
        const legacySust = updateSustainability(sLegacy, opGraph.settlements, legacy.edges);
        const legacyMil = updateMilitiaFatigue(fresh(), opGraph.settlements, legacy.edges, new Map());

        const sOsid = fresh();
        const inputs = buildOsidDisplacementPressureInputs(sOsid, od);
        const osidSust = updateSustainability(sOsid, opGraph.settlements, opGraph.edges, inputs);
        const sMil = fresh();
        const osidMil = updateMilitiaFatigue(sMil, opGraph.settlements, opGraph.edges, new Map(), inputs.suppliedByFaction);

        const pc = sMil.political.political_controllers ?? {};
        const heldMuns = new Map<string, Set<string>>();
        for (const [osid, rec] of opGraph.settlements) {
            const side = pc[osid];
            if (typeof side !== 'string') continue;
            const mun = String(rec.mun1990_id ?? rec.mun_code);
            if (!heldMuns.has(side)) heldMuns.set(side, new Set());
            heldMuns.get(side)!.add(mun);
        }
        const unheld: Record<string, number> = {};
        for (const r of osidMil.by_municipality) {
            if (r.supplied || r.faction_id === null) continue;
            if (!heldMuns.get(r.faction_id)?.has(r.mun_id)) unheld[r.faction_id] = (unheld[r.faction_id] ?? 0) + 1;
        }

        const surroundedByHolder: Record<string, string[]> = {};
        for (const r of osidSust.by_municipality) {
            if (!r.is_surrounded || !r.faction_id) continue;
            (surroundedByHolder[r.faction_id] ??= []).push(r.mun_id);
        }
        const unsupplied = (m: typeof osidMil) =>
            Object.fromEntries(m.by_faction.map((f) => [f.faction_id, f.pools_unsupplied]));

        rows.push({
            save: path,
            turn: sOsid.meta.turn,
            legacy: {
                surrounded: legacySust.by_municipality.filter((r) => r.is_surrounded).length,
                unsupplied_pools_by_faction: unsupplied(legacyMil),
            },
            osid: {
                evaluated_muns: osidSust.by_municipality.length,
                surrounded_by_holder: surroundedByHolder,
                unsupplied_pools_by_faction: unsupplied(osidMil),
                unsupplied_pools_in_unheld_mun_by_faction: unheld,
                front_edges: inputs.frontEdges.length,
            },
        });
    }

    if (json) {
        process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
        return;
    }
    for (const r of rows) {
        const sur = Object.entries(r.osid.surrounded_by_holder).map(([f, m]) => `${f}:${m.length} [${m.join(',')}]`).join('  ');
        process.stdout.write(
            `t${r.turn}  legacy surrounded=${r.legacy.surrounded} unsuppliedPools=${JSON.stringify(r.legacy.unsupplied_pools_by_faction)}\n` +
            `      osid  evaluated=${r.osid.evaluated_muns} front=${r.osid.front_edges} unsuppliedPools=${JSON.stringify(r.osid.unsupplied_pools_by_faction)} (in unheld mun ${JSON.stringify(r.osid.unsupplied_pools_in_unheld_mun_by_faction)})\n` +
            `      osid  surrounded  ${sur || 'none'}\n`
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
