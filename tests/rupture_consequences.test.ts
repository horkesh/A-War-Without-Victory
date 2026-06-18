import { describe, it, expect } from 'vitest';
import { evaluateRuptureConsequences, collectCondemnationFlags } from '../src/sim/negotiation/rupture_consequences.js';
import { computeFactionVerdict } from '../src/sim/negotiation/scoring.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeNegotiationState(): NegotiationState {
    const capital: Record<string, ReturnType<typeof createEmptyCapital>> = {};
    const patron_relationships: Record<string, ReturnType<typeof createDefaultPatronRelationship>> = {};
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
 * Build a minimal GameState with all preconditions for Srebrenica rupture.
 * Override individual fields to test each gate independently.
 */
function makeRuptureReadyState(overrides: {
    turn?: number;
    enclaveFormed?: boolean;
    srebrenicaController?: string | null;
} = {}): GameState {
    const {
        turn = 160,
        enclaveFormed = true,
        srebrenicaController = 'RS',
    } = overrides;

    const eventFlags: Record<string, string | number | boolean> = {};
    if (enclaveFormed) {
        eventFlags.srebrenica_enclave_formed = true;
    }

    const politicalControllers: Record<string, string | null> = {};
    if (srebrenicaController !== null) {
        politicalControllers['op:srebrenica:srebrenica_2'] = srebrenicaController;
    }

    return {
        meta: { turn, phase: 'war', seed: 1, date: '1995-07-11' },
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
// evaluateRuptureConsequences
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateRuptureConsequences', () => {
    it('records Srebrenica rupture when all preconditions met', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences!;
        expect(ruptures).toHaveLength(1);
        expect(ruptures[0].id).toBe('srebrenica_genocide_1995');
        expect(ruptures[0].perpetrator_faction).toBe('RS');
        expect(ruptures[0].condemnation_flag).toBe('genocide_condemnation');
        expect(ruptures[0].recorded_turn).toBe(160);
    });

    it('does NOT record if enclave not formed', () => {
        const state = makeRuptureReadyState({ enclaveFormed: false });
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(0);
    });

    it('does NOT record if RS does not control Srebrenica', () => {
        const state = makeRuptureReadyState({ srebrenicaController: 'RBiH' });
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(0);
    });

    it('does NOT record if Srebrenica controller is null', () => {
        const state = makeRuptureReadyState({ srebrenicaController: null });
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(0);
    });

    it('does NOT record before the event-owned fall receipt window', () => {
        const state = makeRuptureReadyState({ turn: 159 });
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences ?? [];
        expect(ruptures).toHaveLength(0);
    });

    it('records at exactly turn 160', () => {
        const state = makeRuptureReadyState({ turn: 160 });
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences!;
        expect(ruptures).toHaveLength(1);
        expect(ruptures[0].recorded_turn).toBe(160);
    });

    it('is idempotent — calling twice does not duplicate', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences!;
        expect(ruptures).toHaveLength(1);
    });

    it('no-ops when negotiation state is missing', () => {
        const state = makeRuptureReadyState();
        delete (state.military as any).negotiation;
        // Should not throw
        evaluateRuptureConsequences(state);
    });

    it('rupture consequence is permanent — no code path removes it', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        // Change controller back to RBiH — rupture should persist
        (state.political as any).political_controllers['op:srebrenica:srebrenica_2'] = 'RBiH';
        evaluateRuptureConsequences(state);

        const ruptures = state.military.negotiation!.rupture_consequences!;
        expect(ruptures).toHaveLength(1);
        expect(ruptures[0].id).toBe('srebrenica_genocide_1995');
    });

    it('rupture description contains "Srebrenica" and "genocide"', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        const rupture = state.military.negotiation!.rupture_consequences![0];
        expect(rupture.description).toContain('Srebrenica');
        expect(rupture.description).toContain('genocide');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// collectCondemnationFlags
// ═══════════════════════════════════════════════════════════════════════════

describe('collectCondemnationFlags', () => {
    it('returns genocide_condemnation for RS after rupture', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        const flags = collectCondemnationFlags(state, 'RS');
        expect(flags).toEqual(['genocide_condemnation']);
    });

    it('returns empty for RBiH (not perpetrator)', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        const flags = collectCondemnationFlags(state, 'RBiH');
        expect(flags).toEqual([]);
    });

    it('returns empty for HRHB (not perpetrator)', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        const flags = collectCondemnationFlags(state, 'HRHB');
        expect(flags).toEqual([]);
    });

    it('returns empty when no ruptures recorded', () => {
        const state = makeRuptureReadyState({ enclaveFormed: false });
        evaluateRuptureConsequences(state);

        const flags = collectCondemnationFlags(state, 'RS');
        expect(flags).toEqual([]);
    });

    it('returns sorted flags for determinism', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        // Manually add a second rupture to test sorting
        state.military.negotiation!.rupture_consequences!.push({
            id: 'test_additional',
            recorded_turn: 170,
            perpetrator_faction: 'RS',
            description: 'Test additional consequence',
            condemnation_flag: 'additional_condemnation',
        });

        const flags = collectCondemnationFlags(state, 'RS');
        expect(flags).toEqual(['additional_condemnation', 'genocide_condemnation']);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Lane C+D integration: scoring.ts verdict wiring
// ═══════════════════════════════════════════════════════════════════════════

describe('scoring integration with rupture consequences', () => {
    it('computeFactionVerdict includes condemnation_flags for RS after rupture', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        // Set RS territory so grading doesn't return F
        state.military.negotiation!.capital.RS.territory_controlled_pct = 49;

        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.condemnation_flags).toEqual(['genocide_condemnation']);
    });

    it('computeFactionVerdict returns empty condemnation_flags for RBiH', () => {
        const state = makeRuptureReadyState();
        evaluateRuptureConsequences(state);

        const verdict = computeFactionVerdict(state, 'RBiH');
        expect(verdict.condemnation_flags).toEqual([]);
    });

    it('computeFactionVerdict returns empty condemnation_flags when no rupture', () => {
        const state = makeRuptureReadyState({ enclaveFormed: false });

        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.condemnation_flags).toEqual([]);
    });
});
