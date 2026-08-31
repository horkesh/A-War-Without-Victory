/**
 * OPERATION LAUNCH-ORDER DIFF — calibration path vs play harness.
 *
 * WHY. The 2026-09-01 D2 full-campaign run (RS, 188 weeks) showed the played war lagging the
 * calibration line by up to 28 OSIDs around week 20, converging to 2 by week 39. The standing
 * hypothesis was that historical operations now proceed under standing authorization
 * (`ensureHistoricalOperationAuthorizationReview` creates the review already accepted) rather than
 * sitting live in the baked snapshot from turn 0, so the opening offensive develops a beat later.
 *
 * That was inferred from TERRITORY COUNTS, which cannot distinguish "launched later" from "launched
 * on time and advanced more slowly". This tool answers it directly: it records the first turn each
 * (corps, operation) appears in `active_operations` on each path, and diffs the two.
 *
 * Reports, in order of diagnostic value:
 *   1. Operations whose LAUNCH TURN differs, with the delta (the hypothesis predicts harness later).
 *   2. Operations present on ONE path only (a stronger failure than late launch).
 *   3. Launch-order rank changes.
 *
 * Deterministic: no RNG, no wall-clock. Both paths advance exactly as the parity probe advances
 * them, so a difference here is a real behavioural difference, not an instrumentation artifact.
 *
 * Usage:
 *   node_modules/.bin/tsx tools/ai_play/op_launch_diff.ts [--turns N] [--faction RS]
 */

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
import type { FactionId, GameState } from '../../src/state/game_state.js';

const REPO = process.cwd();
const SCENARIO = 'data/scenarios/apr1992_definitive_188w.json';

function arg(name: string, fallback: string): string {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

/** first-seen turn for every (corps, operation) key on one path. */
type LaunchLog = Map<string, { turn: number; phase: string }>;

function recordLaunches(state: GameState, turn: number, log: LaunchLog): void {
    const cc = (state.military.corps_command ?? {}) as Record<
        string,
        { active_operations?: Array<{ name?: string; phase?: string }> }
    >;
    for (const corpsId of Object.keys(cc).sort()) {
        for (const op of cc[corpsId]?.active_operations ?? []) {
            if (!op?.name) continue;
            const key = `${corpsId} :: ${op.name}`;
            if (!log.has(key)) log.set(key, { turn, phase: op.phase ?? '?' });
        }
    }
}

async function main(): Promise<void> {
    const turns = Number.parseInt(arg('turns', '45'), 10);
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

    // ---- PATH B: play harness, Level 3 ----
    const { state: playState } = await startNewCampaign(
        REPO, faction as 'RBiH' | 'RS' | 'HRHB', 'apr_1992', 'emergent', {},
    );
    let b: GameState = playState;
    b.meta.autonomy_level = 3;

    const calLog: LaunchLog = new Map();
    const harLog: LaunchLog = new Map();
    recordLaunches(a, 0, calLog);
    recordLaunches(b, 0, harLog);

    for (let i = 0; i < turns; i++) {
        botManager.runBots(a, computeFrontEdges(a, graph.edges), {
            edges: graph.edges, sidToMun, settlementsByMun,
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
            console.log(`harness ERROR at t${i + 1}: ${advanced.error}`);
            return;
        }
        b = advanced.state;

        recordLaunches(a, i + 1, calLog);
        recordLaunches(b, i + 1, harLog);
    }

    const keys = [...new Set([...calLog.keys(), ...harLog.keys()])].sort();
    const later: string[] = [];
    const earlier: string[] = [];
    const calOnly: string[] = [];
    const harOnly: string[] = [];
    const same: string[] = [];

    for (const k of keys) {
        const c = calLog.get(k);
        const h = harLog.get(k);
        if (c && !h) { calOnly.push(`${k}  (calibration t${c.turn})`); continue; }
        if (!c && h) { harOnly.push(`${k}  (harness t${h.turn})`); continue; }
        if (!c || !h) continue;
        const d = h.turn - c.turn;
        if (d === 0) same.push(k);
        else if (d > 0) later.push(`+${d}  ${k}   cal t${c.turn} -> har t${h.turn}`);
        else earlier.push(`${d}  ${k}   cal t${c.turn} -> har t${h.turn}`);
    }

    console.log(`operation launch-order diff — ${turns} turns, faction ${faction}`);
    console.log(`  distinct operations: calibration ${calLog.size}, harness ${harLog.size}`);
    console.log(`  same launch turn: ${same.length}`);
    console.log('');
    console.log(`HARNESS LAUNCHED LATER (${later.length}) — the hypothesis predicts these:`);
    for (const l of later.sort()) console.log('  ' + l);
    console.log('');
    console.log(`HARNESS LAUNCHED EARLIER (${earlier.length}):`);
    for (const l of earlier.sort()) console.log('  ' + l);
    console.log('');
    console.log(`CALIBRATION ONLY — never launched in the played war (${calOnly.length}):`);
    for (const l of calOnly) console.log('  ' + l);
    console.log('');
    console.log(`HARNESS ONLY — launched only in the played war (${harOnly.length}):`);
    for (const l of harOnly) console.log('  ' + l);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.stack : String(err));
    process.exitCode = 1;
});
