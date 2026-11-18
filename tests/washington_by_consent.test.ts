/**
 * B5 A2 (2026-11-16): Washington "Path C — Federation by consent". A President who never broke
 * the RBiH-HRHB alliance gets the Federation (washington_signed and its benefits) at the
 * Washington week, like one who broke it and mended it; but no war-ending effects.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import {
    checkAndApplyWashington,
    evaluateWashingtonByConsent,
    WASHINGTON_AGREEMENT_WEEK,
    WASH_ALLIANCE_LOCK_VALUE,
    POST_WASH_CROATIAN_SUPPORT,
} from '../src/sim/early_war/washington_agreement.js';
import { evaluateCondition, type EventCondition } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

function state(opts: { turn: number; alliance: number; warStartedTurn: number | null }): GameState {
    return {
        meta: { turn: opts.turn },
        political: {
            war_alliance_rbih_hrhb: opts.alliance,
            rbih_hrhb_state: {
                washington_signed: false,
                washington_turn: null,
                ceasefire_active: false,
                ceasefire_since_turn: null,
                war_started_turn: opts.warStartedTurn,
                allied_mixed_municipalities: [],
            },
            political_controllers: {},
            war_exhaustion: {},
        },
        military: { formations: {}, militia_pools: {}, alliance_locks: [] },
        factions: [{ id: 'HRHB', capability_profile: { equipment_access: 0.4, croatian_support: 0.5 }, embargo_profile: { external_pipeline_status: 0.5, heavy_equipment_access: 0.3 } }],
    } as unknown as GameState;
}

describe('Path C — Federation by consent', () => {
    it('signs at the Washington week when the alliance never broke, with the Federation benefits', () => {
        const s = state({ turn: WASHINGTON_AGREEMENT_WEEK, alliance: 0.6, warStartedTurn: null });
        const report = checkAndApplyWashington(s);
        expect(report.fired).toBe(true);
        expect(report.trigger_path).toBe('consent');
        const rhs = s.political.rbih_hrhb_state!;
        expect(rhs.washington_signed).toBe(true);
        expect(rhs.washington_turn).toBe(WASHINGTON_AGREEMENT_WEEK);
        expect(s.political.war_alliance_rbih_hrhb).toBe(WASH_ALLIANCE_LOCK_VALUE);
        expect((s.factions as any)[0].capability_profile.croatian_support).toBe(POST_WASH_CROATIAN_SUPPORT);
    });

    it('starts no ceasefire (there was no war) and never cuts a stronger alliance', () => {
        const s = state({ turn: WASHINGTON_AGREEMENT_WEEK + 3, alliance: 0.95, warStartedTurn: null });
        checkAndApplyWashington(s);
        expect(s.political.rbih_hrhb_state!.ceasefire_active).toBe(false);
        expect(s.political.war_alliance_rbih_hrhb).toBe(0.95);
    });

    it('A2b: no consent after HRHB refuses the federation overture; the default answer keeps it open', () => {
        const withOverture = (response: string) => {
            const s = state({ turn: WASHINGTON_AGREEMENT_WEEK, alliance: 0.6, warStartedTurn: null });
            (s.military as any).event_decision_log = [
                { event_id: 'hrhb_federation_overture_1993', response_id: response, decision_source: 'player', faction: 'HRHB', turn: 88 },
            ];
            return evaluateWashingtonByConsent(s);
        };
        expect(withOverture('reject_federation_path')).toBe(false);
        expect(withOverture('maintain_separate_state')).toBe(false);
        expect(withOverture('extend_federation_overture')).toBe(true);
        expect(withOverture('conditional_federation_with_canton_caveats')).toBe(true);
    });

    it('does not fire before the Washington week, after a war, or below the allied threshold', () => {
        expect(evaluateWashingtonByConsent(state({ turn: WASHINGTON_AGREEMENT_WEEK - 1, alliance: 0.6, warStartedTurn: null }))).toBe(false);
        expect(evaluateWashingtonByConsent(state({ turn: WASHINGTON_AGREEMENT_WEEK, alliance: 0.6, warStartedTurn: 50 }))).toBe(false);
        expect(evaluateWashingtonByConsent(state({ turn: WASHINGTON_AGREEMENT_WEEK, alliance: 0.2, warStartedTurn: null }))).toBe(false);
    });
});

describe('Washington cards key on the engine war record', () => {
    const events = JSON.parse(readFileSync(resolve(__dirname, '../data/scenarios/events/war_1994.json'), 'utf8')) as Array<{ id: string; trigger: { requires_events?: string[]; condition?: EventCondition } }>;
    const warFirst = (id: string) => {
        const c = events.find((e) => e.id === id)!.trigger.condition as { type: string; conditions: EventCondition[] };
        return c;
    };

    it.each(['rbih_washington_agreement_1994', 'hrhb_washington_agreement_1994'])('%s requires the RBiH-HRHB war to have started', (id) => {
        const def = events.find((e) => e.id === id)!;
        expect(def.trigger.requires_events).toBeUndefined();
        const c = warFirst(id);
        expect(c.type).toBe('and');
        expect(c.conditions[0]).toEqual({ type: 'rbih_hrhb_war_started', value: true });
    });

    it('rbih_hrhb_war_started reads war_started_turn', () => {
        const cond: EventCondition = { type: 'rbih_hrhb_war_started', value: true };
        expect(evaluateCondition(cond, state({ turn: 100, alliance: -0.5, warStartedTurn: 50 }))).toBe(true);
        expect(evaluateCondition(cond, state({ turn: 100, alliance: 0.6, warStartedTurn: null }))).toBe(false);
        expect(evaluateCondition({ type: 'rbih_hrhb_war_started', value: false }, state({ turn: 100, alliance: 0.6, warStartedTurn: null }))).toBe(true);
    });
});
