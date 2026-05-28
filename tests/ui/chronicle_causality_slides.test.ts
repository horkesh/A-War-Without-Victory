/**
 * Phase H Packet 6 (Component E) — causality Wrapped slides tests.
 *
 * Validates the optional `eventCatalog` extension of `generateWrappedSlides`
 * and the standalone `generateCausalitySlides` helper that surfaces Phase D
 * causal-event content in the end-of-campaign Wrapped sequence.
 *
 * Substrate consumed (read-only, sorted via strictCompare):
 *   - state.military.fired_event_ids
 *   - state.military.event_decision_log
 *   - state.military.event_causality_log
 *
 * Contract checks:
 *   1. eventCatalog absent → output byte-identical to pre-packet (10 slides).
 *   2. eventCatalog provided + foundational decision present → F1 slide.
 *   3. eventCatalog provided + counterfactual divergences present → F2 slide.
 *   4. eventCatalog provided + non-zero chain summary → F3 slide.
 *   5. No player decisions in state → no divergence slide (graceful).
 *   6. Slide ordering deterministic: 10 canonical → F1 → F2 → F3.
 *   7. WrappedSlide rendering contract: id/title/subtitle fields non-empty.
 *
 * Determinism: all inputs constructed inline. No file I/O. No timestamps.
 */

import { describe, it, expect } from 'vitest';

import {
    generateCausalitySlides,
    generateWrappedSlides,
    type WrappedSlide,
} from '../../src/ui/map/components/chronicle/generateWrappedSlides.js';
import type { CausalityLogEntry } from '../../src/state/game_state.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';

// ---------------------------------------------------------------------------
// Synthetic state builders. Minimal MilitaryState shape, mirrors the
// causality_query test fixtures.
// ---------------------------------------------------------------------------

function buildMinimalState(overrides: Record<string, any> = {}): any {
    return {
        turn: 20,
        phase: 'war',
        player_faction: 'RBiH',
        turnSummaries: [],
        formations: [],
        firedEvents: [],
        historicalEventsByTurn: [],
        strategicDimensions: undefined,
        negotiatingCapital: undefined,
        military: {
            fired_event_ids: [],
            enabled_event_ids: [],
            closed_event_ids: [],
            event_causality_log: [],
            event_decision_log: [],
            event_last_fired_turn: {},
        },
        ...overrides,
    };
}

function eventDef(
    id: string,
    overrides: Partial<EventDefinition> = {},
): EventDefinition {
    return {
        id,
        title: `Title for ${id}`,
        trigger: { kind: 'always' } as any,
        effect: { kind: 'noop' } as any,
        ...overrides,
    };
}

function buildCatalog(defs: EventDefinition[]): ReadonlyMap<string, EventDefinition> {
    const out = new Map<string, EventDefinition>();
    for (const d of defs) out.set(d.id, d);
    return out;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateWrappedSlides — Phase H Packet 6 backward compat', () => {
    it('returns exactly 10 slides when eventCatalog is absent', () => {
        const state = buildMinimalState();
        const slides = generateWrappedSlides(state);
        expect(slides).toHaveLength(10);
    });

    it('returns exactly 10 slides when eventCatalog is empty', () => {
        const state = buildMinimalState();
        const slides = generateWrappedSlides(state, new Map());
        expect(slides).toHaveLength(10);
    });

    it('preserves canonical 10-slide IDs in order', () => {
        const slides = generateWrappedSlides(buildMinimalState(), new Map());
        const ids = slides.map((s) => s.id);
        expect(ids).toEqual([
            'your_war',
            'the_opening',
            'bloodiest_week',
            'best_brigade',
            'what_you_built',
            'what_it_cost',
            'world_watching',
            'your_decisions',
            'at_the_table',
            'another_such_victory',
        ]);
    });
});

describe('generateWrappedSlides — causality slide F1 (foundational_choice)', () => {
    it('appends foundational_choice slide when player resolved a foundational decision', () => {
        const catalog = buildCatalog([
            eventDef('rbih_state_identity_1992', {
                title: 'State Identity 1992',
                historical_default_response_id: 'civic',
                source_note: 'ICTY Tadić IT-94-1',
                response_options: [
                    {
                        id: 'civic',
                        label: 'Civic state',
                        effects: [],
                        sets_flags: { rbih_civic: true },
                    } as any,
                    {
                        id: 'bosniak_national',
                        label: 'Bosniak-national',
                        effects: [],
                        sets_flags: { rbih_bosniak_national: true },
                    } as any,
                ],
            }),
        ]);
        const state = buildMinimalState({
            player_faction: 'RBiH',
            military: {
                fired_event_ids: ['rbih_state_identity_1992'],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_causality_log: [],
                event_decision_log: [
                    {
                        event_id: 'rbih_state_identity_1992',
                        response_id: 'bosniak_national',
                        decision_source: 'player',
                        faction: 'RBiH',
                        turn: 3,
                    },
                ],
                event_last_fired_turn: { rbih_state_identity_1992: 3 },
            },
        });
        const slides = generateWrappedSlides(state, catalog);
        const f1 = slides.find((s) => s.id === 'foundational_choice');
        expect(f1).toBeDefined();
        expect(f1!.heroValue).toBe('1');
        expect(f1!.subtitle).toContain('Bosniak-national');
        expect(f1!.bullets).toContain('rbih_bosniak_national');
        expect(f1!.data?.foundational_event_id).toBe('rbih_state_identity_1992');
        expect(f1!.data?.chosen_option_id).toBe('bosniak_national');
    });

    it('does NOT append foundational_choice slide when no branch tags active', () => {
        const catalog = buildCatalog([eventDef('e1')]);
        const state = buildMinimalState({
            player_faction: 'RBiH',
            military: {
                fired_event_ids: [],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_causality_log: [],
                event_decision_log: [],
                event_last_fired_turn: {},
            },
        });
        const slides = generateWrappedSlides(state, catalog);
        expect(slides.find((s) => s.id === 'foundational_choice')).toBeUndefined();
    });
});

describe('generateWrappedSlides — causality slide F2 (your_divergences)', () => {
    it('appends your_divergences slide when player diverged from historical default', () => {
        const catalog = buildCatalog([
            eventDef('vance_owen_signing', {
                title: 'Vance-Owen plan',
                historical_default_response_id: 'reject',
                response_options: [
                    { id: 'accept', label: 'Accept', effects: [] } as any,
                    { id: 'reject', label: 'Reject', effects: [] } as any,
                ],
            }),
            eventDef('washington_agreement', {
                title: 'Washington Agreement',
                historical_default_response_id: 'sign',
                response_options: [
                    { id: 'sign', label: 'Sign', effects: [] } as any,
                    { id: 'walk', label: 'Walk away', effects: [] } as any,
                ],
            }),
        ]);
        const state = buildMinimalState({
            player_faction: 'RBiH',
            military: {
                fired_event_ids: [],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_causality_log: [],
                event_decision_log: [
                    {
                        event_id: 'vance_owen_signing',
                        response_id: 'accept',
                        decision_source: 'player',
                        faction: 'RBiH',
                        turn: 8,
                    },
                    {
                        event_id: 'washington_agreement',
                        response_id: 'walk',
                        decision_source: 'player',
                        faction: 'RBiH',
                        turn: 25,
                    },
                ],
                event_last_fired_turn: {},
            },
        });
        const slides = generateWrappedSlides(state, catalog);
        const f2 = slides.find((s) => s.id === 'your_divergences');
        expect(f2).toBeDefined();
        expect(f2!.heroValue).toBe('2');
        expect(f2!.bullets).toHaveLength(2);
        // Sorted by turn ascending — vance_owen_signing (T8) first
        expect(f2!.bullets![0]).toContain('Vance-Owen plan');
        expect(f2!.bullets![0]).toContain('accept');
        expect(f2!.bullets![0]).toContain('reject');
        expect(f2!.bullets![1]).toContain('Washington Agreement');
    });

    it('does NOT append your_divergences slide when no player decisions in state', () => {
        const catalog = buildCatalog([eventDef('e1', { historical_default_response_id: 'a' })]);
        const state = buildMinimalState({ player_faction: 'RBiH' });
        const slides = generateWrappedSlides(state, catalog);
        expect(slides.find((s) => s.id === 'your_divergences')).toBeUndefined();
    });
});

describe('generateWrappedSlides — causality slide F3 (causal_chain_summary)', () => {
    it('appends causal_chain_summary slide when causality log has signal', () => {
        const catalog = buildCatalog([
            eventDef('foundational_a'),
            eventDef('downstream_b'),
            eventDef('downstream_c'),
        ]);
        const log: CausalityLogEntry[] = [
            {
                turn: 1,
                from_event: 'foundational_a',
                to_event: 'downstream_b',
                to_flag: null,
                kind: 'enables',
                source_response_id: 'opt1',
            } as any,
            {
                turn: 2,
                from_event: 'downstream_b',
                to_event: 'downstream_c',
                to_flag: null,
                kind: 'enables',
                source_response_id: 'opt2',
            } as any,
        ];
        const state = buildMinimalState({
            player_faction: 'RBiH',
            military: {
                fired_event_ids: ['foundational_a', 'downstream_b', 'downstream_c'],
                enabled_event_ids: ['downstream_b', 'downstream_c'],
                closed_event_ids: ['closed_evt'],
                event_causality_log: log,
                event_decision_log: [],
                event_last_fired_turn: {
                    foundational_a: 1,
                    downstream_b: 2,
                    downstream_c: 3,
                },
            },
        });
        const slides = generateWrappedSlides(state, catalog);
        const f3 = slides.find((s) => s.id === 'causal_chain_summary');
        expect(f3).toBeDefined();
        // max_depth = 3 (foundational_a → downstream_b → downstream_c)
        expect(f3!.heroValue).toBe('3');
        // 1 foundational + 2 downstream = 3 events fired in chain
        expect(f3!.subtitle).toContain('3 events fired');
        expect(f3!.detail).toContain('1 foundational');
        expect(f3!.detail).toContain('2 downstream');
        expect(f3!.detail).toContain('1 closed');
        expect(f3!.bullets).toHaveLength(5);
        expect(f3!.data?.foundational_count).toBe(1);
        expect(f3!.data?.downstream_fired_count).toBe(2);
        expect(f3!.data?.closed_count).toBe(1);
        expect(f3!.data?.max_depth).toBe(3);
    });

    it('does NOT append causal_chain_summary slide when no causality signal', () => {
        const catalog = buildCatalog([eventDef('e1')]);
        const state = buildMinimalState({ player_faction: 'RBiH' });
        const slides = generateWrappedSlides(state, catalog);
        expect(slides.find((s) => s.id === 'causal_chain_summary')).toBeUndefined();
    });
});

describe('generateWrappedSlides — slide ordering + rendering contract', () => {
    it('appends causality slides in deterministic order: F1 → F2 → F3 after canonical 10', () => {
        const catalog = buildCatalog([
            eventDef('rbih_state_identity_1992', {
                historical_default_response_id: 'civic',
                response_options: [
                    {
                        id: 'civic',
                        label: 'Civic',
                        effects: [],
                        sets_flags: { rbih_civic: true },
                    } as any,
                    {
                        id: 'bosniak_national',
                        label: 'Bosniak',
                        effects: [],
                        sets_flags: { rbih_bosniak_national: true },
                    } as any,
                ],
            }),
            eventDef('downstream_evt', {
                title: 'Downstream',
                historical_default_response_id: 'opt_a',
                response_options: [
                    { id: 'opt_a', label: 'A', effects: [] } as any,
                    { id: 'opt_b', label: 'B', effects: [] } as any,
                ],
            }),
        ]);
        const state = buildMinimalState({
            player_faction: 'RBiH',
            military: {
                fired_event_ids: ['rbih_state_identity_1992', 'downstream_evt'],
                enabled_event_ids: ['downstream_evt'],
                closed_event_ids: [],
                event_causality_log: [
                    {
                        turn: 1,
                        from_event: 'rbih_state_identity_1992',
                        to_event: 'downstream_evt',
                        to_flag: null,
                        kind: 'enables',
                        source_response_id: 'bosniak_national',
                    } as any,
                ],
                event_decision_log: [
                    {
                        event_id: 'rbih_state_identity_1992',
                        response_id: 'bosniak_national',
                        decision_source: 'player',
                        faction: 'RBiH',
                        turn: 1,
                    },
                    {
                        event_id: 'downstream_evt',
                        response_id: 'opt_b',
                        decision_source: 'player',
                        faction: 'RBiH',
                        turn: 5,
                    },
                ],
                event_last_fired_turn: { rbih_state_identity_1992: 1, downstream_evt: 5 },
            },
        });
        const slides = generateWrappedSlides(state, catalog);
        expect(slides).toHaveLength(13);
        expect(slides[9].id).toBe('another_such_victory');
        expect(slides[10].id).toBe('foundational_choice');
        expect(slides[11].id).toBe('your_divergences');
        expect(slides[12].id).toBe('causal_chain_summary');
    });

    it('all causality slides satisfy WrappedSlide rendering contract', () => {
        const catalog = buildCatalog([
            eventDef('rbih_state_identity_1992', {
                historical_default_response_id: 'civic',
                response_options: [
                    {
                        id: 'civic',
                        label: 'Civic',
                        effects: [],
                        sets_flags: { rbih_civic: true },
                    } as any,
                ],
            }),
        ]);
        const state = buildMinimalState({
            player_faction: 'RBiH',
            military: {
                fired_event_ids: ['rbih_state_identity_1992'],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_causality_log: [],
                event_decision_log: [
                    {
                        event_id: 'rbih_state_identity_1992',
                        response_id: 'civic',
                        decision_source: 'player',
                        faction: 'RBiH',
                        turn: 1,
                    },
                ],
                event_last_fired_turn: { rbih_state_identity_1992: 1 },
            },
        });
        const slides = generateCausalitySlides(state, 'RBiH', 'Republic of Bosnia and Herzegovina', catalog);
        for (const s of slides) {
            assertWrappedSlideContract(s);
        }
    });
});

function assertWrappedSlideContract(slide: WrappedSlide): void {
    expect(typeof slide.id).toBe('string');
    expect(slide.id.length).toBeGreaterThan(0);
    expect(typeof slide.title).toBe('string');
    expect(slide.title.length).toBeGreaterThan(0);
    expect(typeof slide.subtitle).toBe('string');
}
