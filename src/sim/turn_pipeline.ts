/**
 * Turn pipeline orchestrator.
 * Assembles war and peace phase steps, runs them in sequence via runTurn().
 * Step implementations live in turn_phases/war_phases.ts and turn_phases/peace_phases.ts.
 * Types, context helpers, and caches live in turn_pipeline_types.ts.
 */

import { computeFrontEdges } from '../map/front_edges.js';
import { EdgeRecord, loadSettlementGraph } from '../map/settlements.js';
import { deriveAssignableFrontSegments } from '../state/assignable_front_segments.js';
import { cloneGameState } from '../state/clone.js';
import { GameState } from '../state/game_state.js';
import { assignFrontSegmentTheatres, ensureDefaultTheatres } from '../state/theatres.js';
import { ensureBrigadeFrontAssignments } from './combat/front_assignment.js';
import { buildLocalFronts } from './combat/local_front_defense.js';
import { peacePhases } from './turn_phases/peace_phases.js';
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

    // Two-phase model: Peace turns use state pipeline; this runner is for War turns only.
    const phase = working.meta.phase;
    if (phase === 'peace') {
        throw new Error(
            'runTurn: use state pipeline runOneTurn for peace; runTurn handles war-phase turns'
        );
    }
    if (phase !== 'war') {
        throw new Error(`runTurn: unsupported lifecycle phase "${String(phase)}"`);
    }

    // Phase 12D.0: If end_state exists, short-circuit to report-only mode
    if (working.end_state) {
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
                kind: working.end_state.kind,
                treaty_id: working.end_state.treaty_id,
                since_turn: working.end_state.since_turn,
                outcome_hash: working.end_state.snapshot?.outcome_hash,
                settlements_by_controller: working.end_state.snapshot
                    ? Object.fromEntries(working.end_state.snapshot.settlements_by_controller)
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
        for (const step of peacePhases) {
            if (!bottomUpStepNames.has(step.name)) continue;
            report.phases.push({ name: step.name });
            await step.run(context);
        }
    }

    await refreshFrontEdgeSnapshot(context.state, context.input);
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
        state.war_front_edges_osid = undefined;
    }
    const edges = await getEdgesForTurn(input);
    const derivedFrontEdges = computeFrontEdges(state, edges);
    state.front_edges = derivedFrontEdges;
    ensureDefaultTheatres(state);
    const frontEdgesForSegments =
        state.meta.phase === 'war' && state.war_front_edges_osid?.length
            ? state.war_front_edges_osid
            : derivedFrontEdges;
    const segments = deriveAssignableFrontSegments(frontEdgesForSegments);
    state.assignable_front_segments = assignFrontSegmentTheatres(state, segments);
    if (state.meta.phase === 'war') {
        ensureBrigadeFrontAssignments(state);
        state.local_fronts = buildLocalFronts(state);
    }
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
