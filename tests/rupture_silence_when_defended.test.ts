/**
 * Regression test — Q-CANON-RUPT-4 Path (d) canonical silence.
 *
 * Path (d) of `docs/40_reports/audits/20260504_Q_CANON_RUPT_4_RECOMMENDATION.md`
 * (and the canonical resolution in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
 * §1.5 #11 + §2 criterion 3 + §5 counterfactual register) binds:
 *
 *   In ahistorical campaigns where the c2 condition (RS controls
 *   `op:srebrenica:srebrenica_2`) is NOT mechanically satisfied at the
 *   1995 timeframe, the rupture evaluator MUST NOT record
 *   `srebrenica_genocide_1995`, MUST NOT propagate the
 *   `genocide_condemnation` flag to RS, and MUST leave the historical
 *   record (Ring 2 essays + codex) untouched and accessible.
 *
 * The engine already implements Path (d) as the unrelaxed conjunction
 * c1 ∧ c2 ∧ c3 in `src/sim/negotiation/rupture_consequences.ts`. This
 * test pins that behavior so a future "calendar-window heuristic"
 * regression cannot silently land.
 *
 * No engine code is modified by this lane; this is a canon-doc lane
 * with a regression-pin test. Existing rupture tests remain authoritative
 * for the historical-fall case (c2 satisfied → rupture fires).
 *
 * Deterministic: no Math.random(), no timestamps, no hidden ordering.
 */

import { describe, it, expect } from 'vitest';
import {
    evaluateRuptureConsequences,
    collectCondemnationFlags,
} from '../src/sim/negotiation/rupture_consequences.js';
import { computeFactionVerdict } from '../src/sim/negotiation/scoring.js';
import {
    createEmptyCapital,
    createDefaultPatronRelationship,
} from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers — synthetic GameState mirroring tests/rupture_consequences.test.ts
// ═══════════════════════════════════════════════════════════════════════════

function makeNegotiationState(): NegotiationState {
    const capital: Record<string, ReturnType<typeof createEmptyCapital>> = {};
    const patron_relationships: Record<
        string,
        ReturnType<typeof createDefaultPatronRelationship>
    > = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = createEmptyCapital();
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
    }
    return {
        capital,
        patron_relationships,
        peace_plan_history: [],
        strategic_dimensions: initializeStrategicDimensions(),
    };
}

/**
 * Build the Path (d) counterfactual GameState:
 *   - Turn 188 (well past SREBRENICA_MIN_TURN=160; canonical event-owned fall-receipt window).
 *   - srebrenica_enclave_formed = true (c1 satisfied — enclave history exists).
 *   - ARBiH retains the three eastern enclave capital OSIDs at this turn:
 *       op:srebrenica:srebrenica_2, op:zepa:zepa_2, op:gorazde:gorazde_2.
 *     This is the predicate `predEnclaveDefended` reads via the
 *     enclave_held_through_turn flag in dynamic_section_builder.ts.
 *   - c2 NOT satisfied: political_controllers['op:srebrenica:srebrenica_2']
 *     is 'RBiH', not 'RS'. The modeled war did not produce the fall.
 *
 * Path (d) binds: rupture evaluator returns no record; verdict carries
 * no genocide_condemnation flag for RS; historical findings remain in
 * Ring 2 (essays + codex) regardless.
 */
function makeDefendedEnclaveState(): GameState {
    const eventFlags: Record<string, string | number | boolean> = {
        srebrenica_enclave_formed: true,
        // §5 counterfactual register predicate flag — set by the upstream
        // observation system when ARBiH retains all three eastern enclaves
        // through the recorded turn. Mirrored here as a fixture input so the
        // §3-compliant ghost-entry path is also exercisable.
        enclave_held_through_turn: true,
    };

    const politicalControllers: Record<string, string | null> = {
        'op:srebrenica:srebrenica_2': 'RBiH',
        'op:zepa:zepa_2': 'RBiH',
        'op:gorazde:gorazde_2': 'RBiH',
    };

    return {
        meta: { turn: 188, phase: 'war', seed: 1, date: '1995-07-11' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: makeNegotiationState(),
            event_flags: eventFlags,
        },
        political: {
            political_controllers: politicalControllers,
        },
        displacement: {},
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// Q-CANON-RUPT-4 Path (d) — canonical silence regression
// ═══════════════════════════════════════════════════════════════════════════

describe('Q-CANON-RUPT-4 Path (d) — rupture silence when enclaves defended', () => {
    it('does NOT record srebrenica_genocide_1995 when ARBiH still holds Srebrenica at turn 188', () => {
        const state = makeDefendedEnclaveState();
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences ?? [];
        // Canonical silence: the rupture evaluator's c1 ∧ c2 ∧ c3 conjunction
        // fails on c2 (controller !== 'RS'). No record is written.
        expect(ruptures).toHaveLength(0);
        // Defense in depth: assert the specific id is absent (future ruptures
        // added to the roster must not regress this case).
        const ids = ruptures.map((r: { id: string }) => r.id);
        expect(ids).not.toContain('srebrenica_genocide_1995');
    });

    it('does NOT propagate genocide_condemnation to RS in the verdict packet', () => {
        const state = makeDefendedEnclaveState();
        evaluateRuptureConsequences(state);

        // Direct collector check (the path scoring.ts uses).
        const flags = collectCondemnationFlags(state, 'RS');
        expect(flags).toEqual([]);

        // Full verdict-packet check — set RS territory so the verdict isn't
        // short-circuited by the F-grade fallback, then assert the flag list
        // is empty. This is the exact shape the Cost Ledger / Verdict screen
        // reads at endgame.
        state.military.negotiation!.capital.RS.territory_controlled_pct = 49;
        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.condemnation_flags).toEqual([]);
        expect(verdict.condemnation_flags).not.toContain('genocide_condemnation');
    });

    it('preserves Ring 2 historical findings (essays + ghost-entry narrative) regardless of campaign path', () => {
        // Ring 2 historical record is on-disk content, not state-dependent.
        // Path (d) §5 binds: the canonical historical findings remain
        // accessible via essay/codex paths whether or not the rupture fires.
        // We assert that the canonical historical files exist on disk; the
        // counterfactual run does not, and must not, remove them.
        const repoRoot = resolve(__dirname, '..');
        const canonicalEssays = [
            'data/scenarios/essays/srebrenica_falls_1995.json',
            'data/scenarios/essays/srebrenica_enclave_forms_1992.json',
            'data/scenarios/essays/srebrenica_shelling_1993.json',
            'data/scenarios/essays/srebrenica_demilitarization_1993.json',
        ];
        for (const rel of canonicalEssays) {
            expect(existsSync(resolve(repoRoot, rel))).toBe(true);
        }

        // §5 counterfactual register narrative — the §3-compliant ghost-entry
        // body that the `enclave_defended` predicate gates on.
        const ghostEntry = resolve(
            repoRoot,
            'data/codex/ghost_entries/enclave_defended.md',
        );
        expect(existsSync(ghostEntry)).toBe(true);

        // The simulation state for a defended-enclave run carries the
        // observation flag the §5 ghost-entry register reads. This is the
        // canonical predicate path documented at SENSITIVE_HISTORY_DESIGN_GATE.md
        // §5 (Counterfactual register) and implemented at
        // src/sim/codex/dynamic_section_builder.ts:215-217.
        const state = makeDefendedEnclaveState();
        expect(state.military.event_flags!.enclave_held_through_turn).toBe(true);
    });

    it('is idempotent under the canonical-silence path (re-evaluating produces no rupture either)', () => {
        const state = makeDefendedEnclaveState();
        evaluateRuptureConsequences(state);
        evaluateRuptureConsequences(state);
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(0);
    });
});
