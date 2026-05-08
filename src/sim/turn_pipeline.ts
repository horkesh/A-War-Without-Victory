/**
 * Turn pipeline orchestrator.
 * Canonical war-phase turn entrypoint for live simulation, scenario runs, and desktop play.
 * If you are changing war behavior, start here rather than the prototype/minimal harnesses.
 * Assembles war-phase and early-war steps, runs them in sequence via runTurn().
 * Step implementations live in turn_phases/war_phases.ts and turn_phases/early_war_phases.ts.
 * Types, context helpers, and caches live in turn_pipeline_types.ts.
 */

import { computeFrontEdges } from '../map/front_edges.js';
import { EdgeRecord, loadSettlementGraph } from '../map/settlements.js';
import { cloneGameState } from '../state/clone.js';
import { GameState } from '../state/game_state.js';
import { maybeWriteHeapSnapshot } from './perf/heap_profile.js';
import { earlyWarPhases } from './turn_phases/early_war_phases.js';
import { warPhases } from './turn_phases/war_phases.js';

// Re-export all public types so existing importers (scenario_runner, tests, etc.) continue to work.
export type {
    Rng,
    MunicipalityPopulation1991,
    TurnInput,
    TurnReport,
    TurnContext,
    PhaseHandler,
    NamedPhase
} from './turn_pipeline_types.js';

import type { TurnInput, TurnReport, TurnContext, Rng, NamedPhase } from './turn_pipeline_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

export async function runTurn(state: GameState, input: TurnInput): Promise<{ nextState: GameState; report: TurnReport }> {
    const working = cloneGameState(state);

    // War-only pipeline: all games start in April 1992 (war phase).
    const phase = working.meta.phase;
    if (phase !== 'war') {
        throw new Error(`runTurn: unsupported lifecycle phase "${String(phase)}"; expected 'war'`);
    }

    // Dayton Agreement ends the war — set game_over and short-circuit (v0.7.0 Phase 4)
    if (working.military.event_flags?.dayton_signed === true && !working.meta.game_over) {
        working.meta.game_over = true;
        working.meta.outcome = 'dayton_agreement';
    }

    // Game over gate: if game_over is set, short-circuit to report-only mode (no combat/movement)
    if (working.meta.game_over) {
        working.meta = {
            ...working.meta,
            seed: input.seed,
            turn: working.meta.turn + 1
        };

        const report: TurnReport = {
            seed: input.seed,
            phases: [{ name: 'game_over_active' }],
            war_termination: {
                outcome: working.meta.outcome ?? 'unknown',
                winner: null,
                trigger: null
            }
        };

        return { nextState: working, report };
    }

    // Phase 12D.0: If end_state exists, short-circuit to report-only mode
    if (working.political.end_state) {
        working.meta = {
            ...working.meta,
            seed: input.seed,
            turn: working.meta.turn + 1
        };

        const report: TurnReport = {
            seed: input.seed,
            phases: [{ name: 'end_state_active' }],
            end_state_active: true,
            end_state_info: {
                kind: working.political.end_state.kind,
                treaty_id: working.political.end_state.treaty_id,
                since_turn: working.political.end_state.since_turn,
                outcome_hash: working.political.end_state.snapshot?.outcome_hash,
                settlements_by_controller: working.political.end_state.snapshot
                    ? Object.fromEntries(working.political.end_state.snapshot.settlements_by_controller)
                    : undefined
            }
        };

        return { nextState: working, report };
    }

    // Keep turn metadata deterministic and internal to the pipeline.
    working.meta = {
        ...working.meta,
        seed: input.seed,
        turn: working.meta.turn + 1
    };

    const rng = createRng(input.seed);
    const report: TurnReport = { seed: input.seed, phases: [] };
    const context: TurnContext = { state: working, rng, input, report };

    for (const step of warPhases) {
        report.phases.push({ name: step.name });
        await step.run(context);
    }

    // Bottom-up formation mode: run militia/pool/formation steps in war context.
    // Enables RBiH/HRHB militia emergence and promotion for war-start scenarios.
    if (working.meta.recruitment_mode === 'bottom_up') {
        const bottomUpStepNames = new Set([
            'militia-emergence',
            'compute-siege-state',
            'pool-population',
            'formation-spawn',
            'activate-corps',
            'promote-formations',
        ]);
        for (const step of earlyWarPhases) {
            if (!bottomUpStepNames.has(step.name)) continue;
            report.phases.push({ name: step.name });
            await step.run(context);
        }
    }

    await refreshFrontEdgeSnapshot(context.state, context.input);

    // Heap-profile hook (LANE-NIGHTSHIFT-V093-HEAP-PROFILE-REDISPATCH).
    // Default-OFF env-flag-gated (HEAP_PROFILE_188W=true). When unset, this
    // call returns false in O(1) after a single boolean read — hash byte-
    // identical to predecessor baseline. See src/sim/perf/heap_profile.ts.
    maybeWriteHeapSnapshot(context.state.meta.turn, '', context.state.meta.seed);

    return { nextState: context.state, report };
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

async function getEdgesForTurn(input: TurnInput): Promise<EdgeRecord[]> {
    let edges = input.settlementGraph?.edges ?? input.settlementEdges;
    if (!edges || edges.length === 0) {
        const graph = await loadSettlementGraph();
        edges = graph.edges;
    }
    return edges;
}

async function refreshFrontEdgeSnapshot(state: GameState, input: TurnInput): Promise<void> {
    if (state.meta.phase !== 'war') {
        state.military.war_front_edges_osid = undefined;
    }
    const edges = await getEdgesForTurn(input);
    const derivedFrontEdges = computeFrontEdges(state, edges);
    state.military.front_edges = derivedFrontEdges;
}

function createRng(seed: string | number): Rng {
    const numericSeed = typeof seed === 'number' ? seed : hashSeed(seed);
    let a = numericSeed >>> 0;

    return function rng(): number {
        // Mulberry32 for fast, deterministic RNG
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashSeed(seed: string): number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i += 1) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return (h ^ (h >>> 16)) >>> 0;
}
