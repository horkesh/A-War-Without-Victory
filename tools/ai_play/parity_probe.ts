/**
 * PLAY-HARNESS ↔ CALIBRATION PARITY PROBE
 *
 * Goal (owner, 2026-08-31): *"a harness for playing that will be able to produce
 * the exact same results as the calibration runs. Only THEN can we play with
 * ahistorical results."*
 *
 * This is the measuring instrument for that goal, not the harness itself. It runs
 * the SAME campaign down both execution paths turn-by-turn and reports the FIRST
 * turn at which their serialized state diverges, plus which top-level state
 * sections differ. Without it, "close the gaps" is guesswork — every gap closed
 * so far was found by reading code, which is how the 52w fork survived for months.
 *
 *   PATH A (calibration): buildScenarioStartupState(188w) -> runTurn, with the
 *                         full option set and the BotManager pass, mirroring
 *                         scenario_runner's loop.
 *   PATH B (play harness): desktop_sim.startNewCampaign -> desktop_sim.advanceTurn.
 *
 * PARITY DEFINITION. Exact parity is asserted for the OBSERVER configuration —
 * all three factions bot-driven, no player decisions outstanding. A campaign in
 * which a human/LLM actually chooses cannot be byte-identical to a run with no
 * player in it, because the player path legitimately creates state (pending
 * decisions, historical-operation authorization reviews) that the calibration
 * path never creates. Observer parity is the precondition that makes an
 * ahistorical run's divergence attributable to CHOICES rather than plumbing.
 *
 * Deterministic: no RNG, no wall-clock. Hashing uses the same recipe as the
 * scenario runner's `final_state_hash` — sha256(serializeState(state)).
 *
 * Usage:
 *   node_modules/.bin/tsx tools/ai_play/parity_probe.ts [--turns N] [--faction RS]
 */

import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { loadScenario } from '../../src/scenario/scenario_loader.js';
import { buildScenarioStartupState } from '../../src/scenario/scenario_runner.js';
import { loadSharedTurnInputs } from '../../src/scenario/turn_inputs.js';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { loadOperationalCentroids, loadOperationalData } from '../../src/data/operational_data.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import { computeFrontEdges } from '../../src/map/front_edges.js';
import { BotManager } from '../../src/sim/bot/bot_manager.js';
import { buildSettlementsByMun } from '../../src/sim/early_war/control_strain.js';
import { buildOsidToMunFromReverseMap, buildSidToMunFromSettlements } from '../../src/scenario/oob_early_war_entry.js';
import { assertTurnSuccess, runTurn } from '../../src/sim/turn_pipeline.js';
import { startNewCampaign, advanceTurn } from '../../src/desktop/desktop_sim.js';
import { serializeState } from '../../src/state/serialize.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';

const REPO = process.cwd();
const SCENARIO = 'data/scenarios/apr1992_definitive_188w.json';

function arg(name: string, fallback: string): string {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

function hash(state: GameState): string {
    return createHash('sha256').update(serializeState(state)).digest('hex').slice(0, 16);
}

/** Which top-level state sections differ, so a divergence is attributable. */
function differingSections(a: GameState, b: GameState): string[] {
    const out: string[] = [];
    for (const key of ['meta', 'political', 'military', 'displacement', 'factions'] as const) {
        const sa = JSON.stringify((a as unknown as Record<string, unknown>)[key]);
        const sb = JSON.stringify((b as unknown as Record<string, unknown>)[key]);
        if (sa !== sb) out.push(key);
    }
    return out;
}

/** Narrow a differing section to its first few differing child keys. */
function differingKeys(a: unknown, b: unknown, limit = 8): string[] {
    const ra = (a ?? {}) as Record<string, unknown>;
    const rb = (b ?? {}) as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(ra), ...Object.keys(rb)])].sort();
    const out: string[] = [];
    for (const k of keys) {
        if (JSON.stringify(ra[k]) !== JSON.stringify(rb[k])) {
            out.push(k);
            if (out.length >= limit) break;
        }
    }
    return out;
}

async function main(): Promise<void> {
    const turns = Number.parseInt(arg('turns', '10'), 10);
    const faction = arg('faction', 'RS') as FactionId;

    // ---- PATH A: calibration ----
    const scenario = await loadScenario(join(REPO, SCENARIO));
    const { state: calState } = await buildScenarioStartupState(scenario, REPO);

    const graph = await loadSettlementGraph({
        settlementsPath: join(REPO, 'data/source/settlements_initial_master.json'),
        edgesPath: join(REPO, 'data/derived/settlement_edges.json'),
    });
    const opSettlementGraph = await loadSettlementGraph({
        settlementsPath: join(REPO, 'data/derived/operational/operational_settlements.geojson'),
        edgesPath: join(REPO, 'data/derived/operational/operational_contact_graph.json'),
    });
    const operationalData = await loadOperationalData(REPO);
    const operationalCentroids = await loadOperationalCentroids(REPO);
    const shared = await loadSharedTurnInputs(REPO, graph.settlements.keys());
    const eventDefinitions = loadEventDefinitions(scenario.scenario_start_week ?? 0);

    const canonicalSidToMun = buildSidToMunFromSettlements(graph.settlements);
    const sidToMun = operationalData?.operationalToCanonical
        ? buildOsidToMunFromReverseMap(operationalData.operationalToCanonical, canonicalSidToMun)
        : canonicalSidToMun;
    const settlementsByMun = buildSettlementsByMun(graph.settlements);
    const botManager = new BotManager({
        seed: `${calState.meta.seed}:smart-bots`,
        difficulty: scenario.bot_difficulty,
        scenarioStartWeek: scenario.scenario_start_week,
    });

    let a: GameState = calState;

    // ---- PATH B: play harness ----
    const observerParity = !process.argv.includes('--play');
    const { state: playState } = await startNewCampaign(
        REPO,
        faction as 'RBiH' | 'RS' | 'HRHB',
        'apr_1992',
        'emergent',
        { observerParity },
    );
    let b: GameState = playState;

    console.log(`parity probe — ${turns} turns, harness faction ${faction}`
        + `, mode ${observerParity ? 'observer-parity' : 'player (--play)'}`);
    console.log(`t0  calibration=${hash(a)}  harness=${hash(b)}`);
    if (hash(a) !== hash(b)) {
        const secs = differingSections(a, b);
        console.log(`  DIVERGED AT BIRTH — sections: ${secs.join(', ')}`);
        for (const s of secs) {
            const keys = differingKeys(
                (a as unknown as Record<string, unknown>)[s],
                (b as unknown as Record<string, unknown>)[s],
            );
            console.log(`    ${s}: ${keys.join(', ')}`);
        }
    }

    for (let i = 0; i < turns; i++) {
        botManager.runBots(a, computeFrontEdges(a, graph.edges), {
            edges: graph.edges,
            sidToMun,
            settlementsByMun,
        });
        const res = await runTurn(a, {
            seed: a.meta.seed,
            settlementGraph: graph,
            operationalSettlementGraph: opSettlementGraph,
            operationalData: {
                opData: operationalData,
                edges: opSettlementGraph.edges,
                centroids: operationalCentroids,
            },
            settlementEdges: graph.edges,
            municipalityPopulation1991: shared.municipalityPopulation1991,
            settlementPopulationBySid: shared.settlementPopulationBySid,
            settlementDataRaw: shared.settlementDataRaw,
            municipalityHqSettlement: shared.municipalityHqSettlement,
            historicalNameLookup: shared.historicalNameLookup,
            historicalCorpsLookup: shared.historicalCorpsLookup,
            historicalOobIdLookup: shared.historicalOobIdLookup,
            eventDefinitions,
        });
        assertTurnSuccess(res);
        a = res.nextState;

        const advanced = await advanceTurn(b, REPO);
        if (advanced.error) {
            console.log(`t${i + 1}  harness ERROR: ${advanced.error}`);
            return;
        }
        b = advanced.state;

        const ha = hash(a);
        const hb = hash(b);
        const mark = ha === hb ? 'MATCH' : 'DIFF ';
        console.log(`t${i + 1}  calibration=${ha}  harness=${hb}  ${mark}`);
        if (ha !== hb) {
            const secs = differingSections(a, b);
            console.log(`  first divergence at turn ${i + 1} — sections: ${secs.join(', ')}`);
            for (const s of secs) {
                const keys = differingKeys(
                    (a as unknown as Record<string, unknown>)[s],
                    (b as unknown as Record<string, unknown>)[s],
                );
                console.log(`    ${s}: ${keys.join(', ')}`);
            }
            return;
        }
    }
    console.log(`PARITY HELD for ${turns} turns.`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.stack : String(err));
    process.exitCode = 1;
});
