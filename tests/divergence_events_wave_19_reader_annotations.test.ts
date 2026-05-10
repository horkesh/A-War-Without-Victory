/**
 * LANE-CONSEQUENCE-READER-WAVE-19
 *
 * Reader breadth for existing divergence consequences. This does not add new
 * conditions, event families, player responses, or sensitive-history rupture
 * wiring; it only stamps audit-only Cost Ledger annotations on already-authored
 * consequence facts so endgame readers can consume them.
 */
import { describe, expect, it } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import type { EventDefinition, EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

const ALL_EVENTS: EventDefinition[] = loadEventDefinitions(0);

const WAVE_19_EXPECTED = [
    ['csq_accelerated_camps_discovery_1992', 'accelerated_camps_discovery_1992', 'RS'],
    ['csq_early_war_crimes_tribunal_1993', 'early_war_crimes_tribunal_1993', 'RS'],
    ['csq_accelerated_safe_areas_1993', 'accelerated_safe_areas_1993', 'RBiH'],
    ['csq_early_nato_threshold_1994', 'early_nato_threshold_1994', 'RS'],
    ['csq_bihac_pocket_collapses_1994', 'bihac_pocket_collapse_1994', 'RBiH'],
    ['csq_bihac_refugee_crisis_1994', 'bihac_refugee_crisis_1994', 'RBiH'],
] as const;

function getEvent(id: string): EventDefinition {
    const event = ALL_EVENTS.find((candidate) => candidate.id === id);
    if (!event) throw new Error(`event ${id} missing from consequences.json`);
    return event;
}

function effectsOf(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function strategicDims() {
    const dim = () => ({ base_value: 50, event_modifier: 0, effective_value: 50 });
    return {
        military_credibility: dim(),
        territorial_legitimacy: dim(),
        international_standing: dim(),
        patron_confidence: dim(),
        internal_cohesion: dim(),
        negotiating_leverage: dim(),
    };
}

function baseState(turn = 100): GameState {
    return {
        schema_version: 1,
        meta: { turn, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'wave19' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_b1: { id: 'rbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', morale: 50 } as any,
                rs_b1: { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active', morale: 50 } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
            heavy_munitions_reserve: { RBiH: 30, RS: 30, HRHB: 30 },
            fired_event_ids: [],
            event_flags: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            negotiation: {
                capital: {
                    RBiH: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                    RS: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                    HRHB: { international_credibility: 50, military_credibility: 50, war_crimes_events: 0 } as any,
                },
                patron_relationships: {
                    RBiH: { support_level: 60, override_authority: 0 } as any,
                    RS: { support_level: 60, override_authority: 0 } as any,
                    HRHB: { support_level: 60, override_authority: 0 } as any,
                },
                strategic_dimensions: {
                    RBiH: strategicDims(),
                    RS: strategicDims(),
                    HRHB: strategicDims(),
                },
            } as any,
        } as unknown as GameState['military'],
        political: { war_alliance_rbih_hrhb: 0.5, political_controllers: {} } as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

describe('LANE-CONSEQUENCE-READER-WAVE-19', () => {
    it('selected existing consequences stamp Cost Ledger annotations for downstream readers', () => {
        const state = baseState(130);

        for (const [eventId] of WAVE_19_EXPECTED) {
            applyEventEffects(state, effectsOf(getEvent(eventId)));
        }

        const annotations = buildCostLedger(state).annotations ?? [];
        for (const [, tag, faction] of WAVE_19_EXPECTED) {
            const annotation = annotations.find((candidate) => candidate.tag === tag);
            expect(annotation).toBeTruthy();
            expect(annotation?.faction).toBe(faction);
            expect(annotation?.text?.trim().length ?? 0).toBeGreaterThan(0);
        }
    });

    it('Wave 19 remains reader-only over existing consequence records', () => {
        for (const [eventId] of WAVE_19_EXPECTED) {
            const def = getEvent(eventId);
            expect(def.id).toBe(eventId);
            expect(def.requires_player_response).not.toBe(true);
            expect(effectsOf(def).filter((effect) => effect.kind === 'cost_ledger_annotation')).toHaveLength(1);
            expect(def.historical_source).toContain('WAVE-19');
        }
    });
});
