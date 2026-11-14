/**
 * DA1 probe (siege displacement lane, 2026-11-13): on a save, which municipalities the
 * pressure path treats as besieged (front pressure, unsupplied) or encircled, and how
 * each side's territory splits into connected bodies over the operational graph.
 *
 * Read-only: classifies a deserialized copy. Usage:
 *   npx tsx tools/diagnostics/siege_displacement_classify.ts <save.json>
 */
import { readFileSync } from 'node:fs';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { loadOperationalData, loadOperationalEdges } from '../../src/data/operational_data.js';
import { deserializeState } from '../../src/state/serialize.js';
import { buildOsidDisplacementPressureInputs } from '../../src/sim/turn_phases/war_phases.js';
import { updateDisplacement } from '../../src/state/displacement.js';
import { areRbihHrhbAllied, DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN } from '../../src/sim/early_war/alliance_update.js';

async function main(): Promise<void> {
    const savePath = process.argv[2];
    if (!savePath) throw new Error('usage: siege_displacement_classify.ts <save.json>');
    const state = deserializeState(readFileSync(savePath, 'utf8'));
    const graph = await loadSettlementGraph();
    const opData = await loadOperationalData();
    const edges = await loadOperationalEdges();
    const od = { opData, edges, centroids: {} } as never;

    // Bodies per faction (same rule as computeTerritorialBodies).
    const pc = state.political.political_controllers ?? {};
    const nb = new Map<string, Set<string>>();
    for (const e of edges) {
        if (!nb.has(e.a)) nb.set(e.a, new Set());
        if (!nb.has(e.b)) nb.set(e.b, new Set());
        nb.get(e.a)!.add(e.b);
        nb.get(e.b)!.add(e.a);
    }
    const atWar = state.meta.turn >= (state.meta.rbih_hrhb_war_earliest_turn ?? DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN) && !areRbihHrhbAllied(state);
    const bodies: Record<string, Array<{ size: number; muns: Record<string, number> }>> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        const pass = (s: string | undefined) => s === f || (!atWar && ((s === 'RBiH' && f === 'HRHB') || (s === 'HRHB' && f === 'RBiH')));
        const seen = new Set<string>();
        const list: Array<{ size: number; muns: Record<string, number> }> = [];
        for (const start of [...graph.settlements.keys()].sort()) {
            if (seen.has(start) || pc[start] !== f) continue;
            const body = { size: 0, muns: {} as Record<string, number> };
            const q = [start];
            seen.add(start);
            while (q.length) {
                const cur = q.shift()!;
                if (pc[cur] === f) {
                    body.size += 1;
                    const m = cur.split(':')[1];
                    body.muns[m] = (body.muns[m] ?? 0) + 1;
                }
                for (const n of [...(nb.get(cur) ?? [])].sort()) {
                    if (seen.has(n) || !pass(pc[n] ?? undefined)) continue;
                    seen.add(n);
                    q.push(n);
                }
            }
            list.push(body);
        }
        list.sort((a, b) => b.size - a.size);
        bodies[f] = list;
    }

    // Classification: force every streak to the threshold so "unsupplied" shows directly.
    const clone = deserializeState(readFileSync(savePath, 'utf8'));
    for (const s of Object.values(clone.displacement.displacement_state ?? {})) {
        s.unsupplied_pressure_by_side = { RBiH: { turns: 98, last_turn: clone.meta.turn - 1 }, RS: { turns: 98, last_turn: clone.meta.turn - 1 }, HRHB: { turns: 98, last_turn: clone.meta.turn - 1 } };
    }
    const pressure = buildOsidDisplacementPressureInputs(clone, od);
    const report = updateDisplacement(clone, graph.settlements, edges, undefined, pressure);

    process.stdout.write(JSON.stringify({
        save: savePath,
        turn: state.meta.turn,
        rbih_hrhb_at_war: atWar,
        front_edges: pressure.frontEdges.length,
        bodies: Object.fromEntries(Object.entries(bodies).map(([f, l]) => [f, l.map((b) => ({ size: b.size, muns: Object.keys(b.muns).sort().join(',') }))])),
        firing: report.by_municipality.map((r) => ({ mun: r.mun_id, holder: r.faction_id, reasons: r.reason.join('|'), amount: r.displacement_this_turn })),
    }, null, 2) + '\n');
}

main().catch((err) => {
    process.stderr.write(String(err instanceof Error ? err.stack : err) + '\n');
    process.exit(1);
});
