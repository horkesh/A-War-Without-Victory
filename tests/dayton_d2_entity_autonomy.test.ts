/**
 * Comprehensive Dayton — Phase 3 (D2) tests: entity_autonomy_index on the result
 * and verdict, and its feed into the peace_dysfunction index.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { DaytonProposal, NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { resolveDaytonNegotiation } from '../src/sim/negotiation/dayton_negotiation.js';
import { computeFullVerdict } from '../src/sim/negotiation/scoring.js';
import { computePeaceDysfunctionBreakdown } from '../src/sim/negotiation/peace_dysfunction.js';
import { computeEntityAutonomyIndex } from '../src/sim/negotiation/institutional_packages.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

function makeState(decisionMode?: string): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = { ...createEmptyCapital(), territory_controlled_pct: 30 };
        patron_relationships[f] = createDefaultPatronRelationship(f);
    }
    const store = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        for (const dim of Object.keys(store[f])) store[f][dim] = { base_value: 60, event_modifier: 0, effective_value: 60 };
    }
    return {
        meta: { turn: 190, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: 'RBiH', decision_mode: decisionMode },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: store } },
        political: { political_controllers: { 'op:sarajevo:sarajevo_1': 'RBiH', 'op:banja_luka:banja_luka_2': 'RS', 'op:mostar:mostar_1': 'HRHB' } },
        displacement: {},
    } as unknown as GameState;
}

const ALL_DECENTRALIZED: DaytonProposal = {
    territorial_demands: [], territorial_concessions: [],
    institutional_choices: { military: 'decentralized', economy: 'decentralized', police: 'decentralized', judiciary: 'decentralized', presidency: 'decentralized', education: 'decentralized' },
};
const ALL_CENTRALIZED: DaytonProposal = {
    territorial_demands: [], territorial_concessions: [],
    institutional_choices: { military: 'centralized', economy: 'centralized', police: 'centralized', judiciary: 'centralized', presidency: 'centralized', education: 'centralized' },
};

describe('entity_autonomy_index on DaytonResult (D2)', () => {
    it('all-decentralized settlement → index 100 (historical Dayton default)', () => {
        const result = resolveDaytonNegotiation(makeState(), { ...ALL_DECENTRALIZED });
        expect(result.entity_autonomy_index).toBe(100);
    });

    it('index is computed from the FINAL (post-resolution) institutional choices', () => {
        const result = resolveDaytonNegotiation(makeState(), { ...ALL_DECENTRALIZED });
        expect(result.entity_autonomy_index).toBe(computeEntityAutonomyIndex(result.institutional_choices));
    });

    it('empty choices default to historical decentralized (index 100)', () => {
        const result = resolveDaytonNegotiation(makeState(), { territorial_demands: [], territorial_concessions: [], institutional_choices: {} });
        expect(result.entity_autonomy_index).toBe(100);
    });
});

describe('entity_autonomy_index feeds peace_dysfunction (D2 → D3)', () => {
    it('higher autonomy → higher dysfunction autonomy_component (emergent mode)', () => {
        const decentral = resolveDaytonNegotiation(makeState('emergent'), { ...ALL_DECENTRALIZED });
        const centralState = makeState('emergent');
        const central = resolveDaytonNegotiation(centralState, { ...ALL_CENTRALIZED });
        // Re-read dysfunction from each resolved state.
        const decentralBd = computePeaceDysfunctionBreakdown(makeStateWith(decentral, 'emergent'))!;
        const centralBd = computePeaceDysfunctionBreakdown(makeStateWith(central, 'emergent'))!;
        expect(decentralBd.autonomy_component).toBeGreaterThan(centralBd.autonomy_component);
    });
});

describe('entity_autonomy_index surfaced on verdict (D2)', () => {
    it('computeFullVerdict exposes entity_autonomy_index for a Dayton ending', () => {
        const state = makeState('emergent');
        resolveDaytonNegotiation(state, { ...ALL_DECENTRALIZED });
        const verdict = computeFullVerdict(state);
        expect(verdict.entity_autonomy_index).toBe(100);
        expect(verdict.outcome_type).toBe('dayton');
    });

    it('verdict exposes peace_dysfunction_index in emergent Dayton mode', () => {
        const state = makeState('emergent');
        resolveDaytonNegotiation(state, { ...ALL_DECENTRALIZED });
        const verdict = computeFullVerdict(state);
        expect(typeof verdict.peace_dysfunction_index).toBe('number');
        expect(verdict.peace_dysfunction_index!).toBeGreaterThan(0);
    });

    it('non-emergent Dayton: autonomy still surfaced, dysfunction undefined (byte-identical guard)', () => {
        const state = makeState('historical');
        resolveDaytonNegotiation(state, { ...ALL_DECENTRALIZED });
        const verdict = computeFullVerdict(state);
        // entity_autonomy_index is a pure structural derivation, present regardless of mode.
        expect(verdict.entity_autonomy_index).toBe(100);
        // peace_dysfunction is emergent-gated → undefined here.
        expect(verdict.peace_dysfunction_index).toBeUndefined();
    });
});

// Helper: rebuild a minimal state holding an already-resolved DaytonResult so we
// can recompute the dysfunction breakdown from it.
function makeStateWith(result: import('../src/state/negotiation_types.js').DaytonResult, decisionMode: string): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) capital[f] = createEmptyCapital();
    return {
        meta: { turn: 200, decision_mode: decisionMode, outcome: 'dayton', game_over: true },
        military: { negotiation: { capital, dayton_result: result, rupture_consequences: [] } },
        political: {}, displacement: {},
    } as unknown as GameState;
}
