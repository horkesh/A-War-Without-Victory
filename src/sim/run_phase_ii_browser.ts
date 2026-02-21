/**
 * Browser-safe Phase II turn advance. No Node/fs imports.
 * Used by the warroom when advancing a turn in phase_ii. Performs turn increment and
 * Phase II AoR initialization when faction AoRs are empty (so fronts are populated).
 * Supply pressure and exhaustion are not run here (they depend on map/settlements and
 * supply_state_derivation); for full Phase II simulation use runTurn in Node.
 */

import type { LoadedSettlementGraph } from '../map/settlements_parse.js';
import { ensureFormationHomeMunsInFactionAoR, populateFactionAoRFromControl } from '../scenario/aor_init.js';
import { cloneGameState } from '../state/clone.js';
import type { GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export interface PhaseIITurnInput {
    seed: string;
    settlementGraph: LoadedSettlementGraph;
}

export interface PhaseIITurnReport {
    seed: string;
    phases: { name: string }[];
    phase_ii_aor_init?: boolean;
}

/** Build mun_id -> sorted settlement IDs from graph. Deterministic order. */
function buildSettlementsByMunFromGraph(
    settlements: Map<string, { mun1990_id?: string; mun_code: string }>
): Map<string, string[]> {
    const byMun = new Map<string, string[]>();
    const sids = Array.from(settlements.keys()).sort(strictCompare);
    for (const sid of sids) {
        const rec = settlements.get(sid);
        if (!rec) continue;
        const munId = rec.mun1990_id ?? rec.mun_code;
        const list = byMun.get(munId) ?? [];
        list.push(sid);
        byMun.set(munId, list);
    }
    for (const list of byMun.values()) {
        list.sort(strictCompare);
    }
    return byMun;
}

/**
 * Run one Phase II turn in the browser: increment turn and optionally init AoR when empty.
 * Returns new state and report; does not mutate the argument.
 */
export function runPhaseIITurn(
    state: GameState,
    input: PhaseIITurnInput
): { nextState: GameState; report: PhaseIITurnReport } {
    const working = cloneGameState(state);
    if (working.meta.phase !== 'phase_ii') {
        throw new Error('runPhaseIITurn: state must be in phase_ii');
    }

    const report: PhaseIITurnReport = {
        seed: input.seed,
        phases: [{ name: 'phase-ii-advance' }]
    };

    working.meta = { ...working.meta, seed: input.seed, turn: working.meta.turn + 1 };

    const graph = input.settlementGraph;
    const factions = working.factions ?? [];
    const allAoREmpty = factions.every(
        (f) => !f.areasOfResponsibility || f.areasOfResponsibility.length === 0
    );
    if (allAoREmpty && graph.settlements.size > 0) {
        populateFactionAoRFromControl(working, graph.settlements.keys());
        const settlementsByMun = buildSettlementsByMunFromGraph(graph.settlements);
        ensureFormationHomeMunsInFactionAoR(working, settlementsByMun);
        report.phase_ii_aor_init = true;
    }

    return { nextState: working, report };
}
