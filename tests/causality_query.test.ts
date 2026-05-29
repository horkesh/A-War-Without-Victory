/**
 * Phase H Packet 2 (wave 1) — causality_query helpers tests.
 *
 * Validates each of the 9 read-only query helpers exported by
 * `src/sim/events/causality_query.ts`:
 *
 *   1. getCausalDescendants
 *   2. getCausalAncestors
 *   3. getPlayerDecisionHistory
 *   4. getCounterfactualDivergencePoints
 *   5. getBranchTagsActive
 *   6. getCausalChainAt
 *   7. getActivePhaseEFlags
 *   8. getProjectedDimensionMultiplier
 *   9. getEventChainSummary
 *
 * Determinism: all inputs constructed inline. No file I/O. No Math.random.
 * Gate-module-touching tests reset overrides in beforeEach/afterEach so
 * cross-test contamination is impossible.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    getActivePhaseEFlags,
    getBranchTagsActive,
    getCausalAncestors,
    getCausalChainAt,
    getCausalDescendants,
    getCounterfactualDivergencePoints,
    getEventChainSummary,
    getPlayerDecisionHistory,
    getProjectedDimensionMultiplier,
} from '../src/sim/events/causality_query.js';

import {
    resetPoliticalDimensionGates,
    setCohesionCautionBiasOverride,
    setIntlStandingOpsHesitationOverride,
    setPoliticalDimensionPropagationOverride,
} from '../src/sim/political/political_dimension_propagation_gate.js';

import type { CausalityLogEntry, FactionId, GameState } from '../src/state/game_state.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

// ---------------------------------------------------------------------------
// Synthetic state builders. Minimal MilitaryState shape only.
// ---------------------------------------------------------------------------

function buildEmptyState(): GameState {
    return {
        meta: { turn: 1 },
        military: {
            fired_event_ids: [],
            enabled_event_ids: [],
            closed_event_ids: [],
            event_causality_log: [],
            event_decision_log: [],
            event_last_fired_turn: {},
        },
    } as unknown as GameState;
}

function buildState(opts: {
    turn?: number;
    fired?: string[];
    enabled?: string[];
    closed?: string[];
    causality?: CausalityLogEntry[];
    decisions?: Array<{ event_id: string; response_id: string; decision_source: 'bot_political' | 'bot_v1' | 'bot_ai_default' | 'player'; faction: FactionId | null; turn: number }>;
    lastFired?: Record<string, number>;
    dimensions?: Partial<Record<FactionId, { international_standing?: number; internal_cohesion?: number }>>;
}): GameState {
    const military: any = {
        fired_event_ids: opts.fired ?? [],
        enabled_event_ids: opts.enabled ?? [],
        closed_event_ids: opts.closed ?? [],
        event_causality_log: opts.causality ?? [],
        event_decision_log: opts.decisions ?? [],
        event_last_fired_turn: opts.lastFired ?? {},
    };
    if (opts.dimensions) {
        const strat: Record<string, any> = {};
        for (const [fac, vals] of Object.entries(opts.dimensions)) {
            const inner: Record<string, any> = {};
            if (typeof vals?.international_standing === 'number') {
                inner.international_standing = {
                    base_value: vals.international_standing,
                    event_modifier: 0,
                    effective_value: vals.international_standing,
                };
            }
            if (typeof vals?.internal_cohesion === 'number') {
                inner.internal_cohesion = {
                    base_value: vals.internal_cohesion,
                    event_modifier: 0,
                    effective_value: vals.internal_cohesion,
                };
            }
            strat[fac] = inner;
        }
        military.negotiation = { strategic_dimensions: strat };
    }
    return {
        meta: { turn: opts.turn ?? 1 },
        military,
    } as unknown as GameState;
}

// Synthetic R1-foundational chain: R1 → R6, R1 → R12, R6 → R12_child.
function r1ChainState(): GameState {
    return buildState({
        turn: 12,
        fired: ['R1', 'R6', 'R12'],
        enabled: ['R6', 'R12', 'R12_child'],
        closed: [],
        causality: [
            { turn: 1, from_event: 'R1', to_event: 'R6', to_flag: null, kind: 'enables', source_response_id: 'all_six' },
            { turn: 1, from_event: 'R1', to_event: 'R12', to_flag: null, kind: 'enables', source_response_id: 'all_six' },
            { turn: 6, from_event: 'R6', to_event: 'R12_child', to_flag: null, kind: 'enables' },
        ],
        decisions: [
            { event_id: 'R1', response_id: 'all_six', decision_source: 'bot_political', faction: 'RS' as FactionId, turn: 1 },
            { event_id: 'R6', response_id: 'accept', decision_source: 'player', faction: 'RS' as FactionId, turn: 6 },
            { event_id: 'R12', response_id: 'reject', decision_source: 'player', faction: 'RS' as FactionId, turn: 12 },
        ],
        lastFired: { R1: 1, R6: 6, R12: 12, R12_child: 12 },
    });
}

// Minimal EventDefinition factory for catalog construction.
function buildDef(opts: {
    id: string;
    historical_default?: string;
    options?: Array<{ id: string; sets_flags?: Record<string, string | number | boolean> }>;
}): EventDefinition {
    return {
        id: opts.id,
        trigger: { phase: 'war' },
        effect: { kind: 'narrative', text: 'synthetic' },
        historical_default_response_id: opts.historical_default,
        response_options: (opts.options ?? []).map((o) => ({
            id: o.id,
            label: o.id,
            effects: [],
            sets_flags: o.sets_flags,
        })),
    } as unknown as EventDefinition;
}

// ---------------------------------------------------------------------------
// 1. getCausalDescendants
// ---------------------------------------------------------------------------

describe('getCausalDescendants', () => {
    it('returns empty array on empty causality log', () => {
        expect(getCausalDescendants('R1', buildEmptyState())).toEqual([]);
    });

    it('returns transitive descendants sorted alphabetical (R1 chain)', () => {
        const out = getCausalDescendants('R1', r1ChainState());
        expect(out).toEqual(['R12', 'R12_child', 'R6']);
    });

    it('excludes source eventId from descendants', () => {
        expect(getCausalDescendants('R1', r1ChainState())).not.toContain('R1');
    });
});

// ---------------------------------------------------------------------------
// 2. getCausalAncestors
// ---------------------------------------------------------------------------

describe('getCausalAncestors', () => {
    it('returns empty array on empty causality log', () => {
        expect(getCausalAncestors('R12_child', buildEmptyState())).toEqual([]);
    });

    it('returns transitive ancestors sorted alphabetical (R1 chain)', () => {
        const out = getCausalAncestors('R12_child', r1ChainState());
        expect(out).toEqual(['R1', 'R6']);
    });

    it('returns empty for a foundational with no parents', () => {
        expect(getCausalAncestors('R1', r1ChainState())).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// 3. getPlayerDecisionHistory
// ---------------------------------------------------------------------------

describe('getPlayerDecisionHistory', () => {
    it('returns empty array on empty decision log', () => {
        expect(getPlayerDecisionHistory(buildEmptyState())).toEqual([]);
    });

    it('filters to player-source decisions only, sorted by turn ascending', () => {
        const state = r1ChainState();
        const history = getPlayerDecisionHistory(state);
        expect(history.map((d) => d.event_id)).toEqual(['R6', 'R12']);
        // Bot decision (R1) excluded
        expect(history.find((d) => d.event_id === 'R1')).toBeUndefined();
        // Sort by turn ascending
        expect(history[0].turn).toBe(6);
        expect(history[1].turn).toBe(12);
    });
});

// ---------------------------------------------------------------------------
// 4. getCounterfactualDivergencePoints
// ---------------------------------------------------------------------------

describe('getCounterfactualDivergencePoints', () => {
    it('returns empty array when no catalog supplied', () => {
        expect(getCounterfactualDivergencePoints(r1ChainState())).toEqual([]);
    });

    it('identifies player decisions diverging from historical_default', () => {
        const catalog = new Map<string, EventDefinition>([
            ['R6', buildDef({ id: 'R6', historical_default: 'reject' })], // chose accept, hist=reject → divergence
            ['R12', buildDef({ id: 'R12', historical_default: 'reject' })], // chose reject, matches → no divergence
        ]);
        const out = getCounterfactualDivergencePoints(r1ChainState(), catalog);
        expect(out.length).toBe(1);
        expect(out[0].event_id).toBe('R6');
        expect(out[0].chosen_option).toBe('accept');
        expect(out[0].historical_default).toBe('reject');
        expect(out[0].turn).toBe(6);
    });

    it('returns empty when catalog has no historical_default fields', () => {
        const catalog = new Map<string, EventDefinition>([
            ['R6', buildDef({ id: 'R6' })], // no historical_default
            ['R12', buildDef({ id: 'R12' })],
        ]);
        const out = getCounterfactualDivergencePoints(r1ChainState(), catalog);
        expect(out).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// 5. getBranchTagsActive
// ---------------------------------------------------------------------------

describe('getBranchTagsActive', () => {
    it('returns empty array when no catalog supplied', () => {
        expect(getBranchTagsActive(r1ChainState(), 'RS' as FactionId)).toEqual([]);
    });

    it('returns faction-prefixed branch tags from fired events chosen options', () => {
        const state = buildState({
            fired: ['rs_strategic_goals', 'rbih_state_identity'],
            decisions: [
                { event_id: 'rs_strategic_goals', response_id: 'all_six', decision_source: 'bot_political', faction: 'RS' as FactionId, turn: 1 },
                { event_id: 'rbih_state_identity', response_id: 'civic', decision_source: 'player', faction: 'RBiH' as FactionId, turn: 2 },
            ],
        });
        const catalog = new Map<string, EventDefinition>([
            ['rs_strategic_goals', buildDef({
                id: 'rs_strategic_goals',
                options: [{ id: 'all_six', sets_flags: { rs_all_six: true, rs_aggressive: true } }],
            })],
            ['rbih_state_identity', buildDef({
                id: 'rbih_state_identity',
                options: [{ id: 'civic', sets_flags: { rbih_civic: true } }],
            })],
        ]);

        const rsTags = getBranchTagsActive(state, 'RS' as FactionId, catalog);
        expect(rsTags).toEqual(['rs_aggressive', 'rs_all_six']);

        const rbihTags = getBranchTagsActive(state, 'RBiH' as FactionId, catalog);
        expect(rbihTags).toEqual(['rbih_civic']);
    });
});

// ---------------------------------------------------------------------------
// 6. getCausalChainAt
// ---------------------------------------------------------------------------

describe('getCausalChainAt', () => {
    it('returns empty snapshot on empty state', () => {
        const out = getCausalChainAt(10, buildEmptyState());
        expect(out.fired).toEqual([]);
        expect(out.enabled).toEqual([]);
        expect(out.closed).toEqual([]);
        expect(out.causality_log).toEqual([]);
    });

    it('filters all four logs by turn boundary', () => {
        const out = getCausalChainAt(6, r1ChainState());
        // At turn 6: R1 (t1) + R6 (t6) fired, R12 (t12) excluded
        expect(out.fired).toEqual(['R1', 'R6']);
        // Enabled-turn lookup: R6 + R12 enabled at t1 (≤6), R12_child at t6 (≤6)
        expect(out.enabled).toEqual(['R12', 'R12_child', 'R6']);
        // Causality_log: filtered to entries.turn ≤ 6
        expect(out.causality_log.every((e) => e.turn <= 6)).toBe(true);
        expect(out.causality_log.length).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// 7. getActivePhaseEFlags
// ---------------------------------------------------------------------------

describe('getActivePhaseEFlags', () => {
    beforeEach(() => {
        resetPoliticalDimensionGates();
    });
    afterEach(() => {
        resetPoliticalDimensionGates();
    });

    it('returns empty array when no flags active (default)', () => {
        expect(getActivePhaseEFlags()).toEqual([]);
    });

    it('returns intl_standing_ops_hesitation when only that flag is ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(true);
        expect(getActivePhaseEFlags()).toEqual(['intl_standing_ops_hesitation']);
    });

    it('returns both flags sorted alphabetical when both ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(true);
        setCohesionCautionBiasOverride(true);
        expect(getActivePhaseEFlags()).toEqual([
            'cohesion_caution_bias',
            'intl_standing_ops_hesitation',
        ]);
    });

    it('returns empty when sub-flags ON but global propagation OFF', () => {
        setIntlStandingOpsHesitationOverride(true);
        setCohesionCautionBiasOverride(true);
        // global propagation override is null → env OFF → combined false
        expect(getActivePhaseEFlags()).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// 8. getProjectedDimensionMultiplier
// ---------------------------------------------------------------------------

describe('getProjectedDimensionMultiplier', () => {
    it('returns 1.0/1.0/1.0 when no dimension values present', () => {
        const out = getProjectedDimensionMultiplier(buildEmptyState(), 'RBiH' as FactionId);
        expect(out.intl_standing).toBe(1.0);
        expect(out.cohesion).toBe(1.0);
        expect(out.combined).toBe(1.0);
    });

    it('projects 0.7 × 0.85 = 0.595 when intl=20 and cohesion=30 (Phase E3 math)', () => {
        const state = buildState({
            dimensions: { ['RBiH' as FactionId]: { international_standing: 20, internal_cohesion: 30 } },
        });
        const out = getProjectedDimensionMultiplier(state, 'RBiH' as FactionId);
        expect(out.intl_standing).toBe(0.7);
        expect(out.cohesion).toBe(0.85);
        expect(out.combined).toBeCloseTo(0.595, 10);
    });

    it('returns 1.0 multipliers when values are above thresholds', () => {
        const state = buildState({
            dimensions: { ['RS' as FactionId]: { international_standing: 50, internal_cohesion: 60 } },
        });
        const out = getProjectedDimensionMultiplier(state, 'RS' as FactionId);
        expect(out.intl_standing).toBe(1.0);
        expect(out.cohesion).toBe(1.0);
        expect(out.combined).toBe(1.0);
    });

    it('projection is unconditional (does NOT gate on flag activation)', () => {
        // Gates remain OFF; multiplier still projects 0.7 × 0.85.
        const state = buildState({
            dimensions: { ['HRHB' as FactionId]: { international_standing: 10, internal_cohesion: 20 } },
        });
        const out = getProjectedDimensionMultiplier(state, 'HRHB' as FactionId);
        expect(out.combined).toBeCloseTo(0.595, 10);
    });
});

// ---------------------------------------------------------------------------
// 9. getEventChainSummary
// ---------------------------------------------------------------------------

describe('getEventChainSummary', () => {
    it('returns all zeros on empty state', () => {
        const out = getEventChainSummary(buildEmptyState(), new Map());
        expect(out.foundational_count).toBe(0);
        expect(out.downstream_fired_count).toBe(0);
        expect(out.closed_count).toBe(0);
        expect(out.max_depth).toBe(0);
        expect(out.player_divergence_count).toBe(0);
    });

    it('aggregates stats over the R1 foundational chain', () => {
        const catalog = new Map<string, EventDefinition>([
            ['R6', buildDef({ id: 'R6', historical_default: 'reject' })], // player chose accept → divergence
            ['R12', buildDef({ id: 'R12', historical_default: 'reject' })], // player chose reject → no divergence
        ]);
        const out = getEventChainSummary(r1ChainState(), catalog);
        // R1 is the only foundational (has outgoing enables, no incoming)
        expect(out.foundational_count).toBe(1);
        // R6 + R12 + R12_child each have incoming enables → downstream count
        // restricted to fired ids = R6 + R12 (R12_child not in fired set)
        expect(out.downstream_fired_count).toBe(2);
        expect(out.closed_count).toBe(0);
        // Depth path R1 → R6 → R12_child = 3
        expect(out.max_depth).toBe(3);
        expect(out.player_divergence_count).toBe(1);
    });
});
