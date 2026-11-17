/**
 * A2b (B5, 2026-11-17): the HRHB refugee compact, derived from event_decision_log
 * (src/sim/early_war/refugee_compact.ts). Panel: game designer + historian, integrated ruling
 * approved by the orchestrator.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    getPatronDragStanceMultiplier,
    getRefugeeCompactPressureMultiplier,
    getRefugeeCompactRecruitmentMultiplier,
    getRefugeeCompactStatus,
    REFUGEE_COMPACT_GRANT_TURNS,
    REFUGEE_COMPACT_MULTIPLIER,
    REFUGEE_COMPACT_RECRUITMENT_PRICE,
} from '../src/sim/early_war/refugee_compact.js';
import { getActiveRecruitmentMultiplier } from '../src/sim/events/active_modifiers.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';

type D = [turn: number, eventId: string, responseId: string, faction?: string];
const UNITED: D = [5, 'hrhb_political_goal', 'united_front'];
const PERSISTS: D = [8, 'hrhb_1992_graz_cooperation_collapse', 'formal_alliance_persists'];

function state(decisions: D[], extra: { suspendedUntil?: number; mods?: unknown[] } = {}): GameState {
    return {
        meta: { turn: 0 },
        political: { rbih_hrhb_state: extra.suspendedUntil != null ? { refugee_compact_suspended_until: extra.suspendedUntil } : {} },
        military: {
            recruitment_modifiers: extra.mods ?? [],
            event_decision_log: decisions.map(([turn, event_id, response_id, faction]) => ({
                event_id, response_id, decision_source: 'player', faction: faction ?? 'HRHB', turn,
            })),
        },
    } as unknown as GameState;
}

describe('A2b refugee compact', () => {
    it('no granting choice: every multiplier is exactly 1.0 (bots, history)', () => {
        const s = state([[5, 'hrhb_political_goal', 'croat_republic'], [10, 'hrhb_1992_graz_cooperation_collapse', 'local_friction_emerges']]);
        for (const t of [0, 50, 100]) {
            expect(getRefugeeCompactPressureMultiplier(s, t)).toBe(1.0);
            expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', t)).toBe(1.0);
            expect(getPatronDragStanceMultiplier(s, t)).toBe(1.0);
        }
    });

    it('a renewal answer never opens a compact (the overture renewal is the historical default)', () => {
        const s = state([[89, 'hrhb_federation_overture_1993', 'extend_federation_overture']]);
        expect(getRefugeeCompactStatus(s, 90).active_entries).toBe(0);
        expect(getRefugeeCompactPressureMultiplier(s, 90)).toBe(1.0);
    });

    it('grants: 0.6 per entry, recruitment 0.9 per entry, drag 0.5 per choice; expiry after 52 turns', () => {
        const s = state([UNITED, PERSISTS]);
        expect(getRefugeeCompactPressureMultiplier(s, 20)).toBeCloseTo(REFUGEE_COMPACT_MULTIPLIER ** 2, 12);
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', 20)).toBeCloseTo(REFUGEE_COMPACT_RECRUITMENT_PRICE ** 2, 12);
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'RBiH', 20)).toBe(1.0);
        expect(getPatronDragStanceMultiplier(s, 20)).toBe(0.25);
        // First grant expires at 5 + 52, the second at 8 + 52.
        expect(getRefugeeCompactStatus(s, 5 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(1);
        expect(getRefugeeCompactStatus(s, 8 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(0);
        // The stance (drag) is permanent.
        expect(getPatronDragStanceMultiplier(s, 150)).toBe(0.25);
    });

    it('renewal extends the active entries; the paying path stays active to Washington', () => {
        const s = state([UNITED, PERSISTS, [53, 'hrhb_central_bosnia_defense_1993', 'federate_early'], [89, 'hrhb_federation_overture_1993', 'extend_federation_overture']]);
        expect(getRefugeeCompactStatus(s, 92).active_entries).toBe(2);
        expect(getRefugeeCompactStatus(s, 102).active_entries).toBe(2);
        expect(getRefugeeCompactStatus(s, 119).active_entries).toBe(0);
    });

    it('a lapse answer ends the compact for good; later renewals find nothing', () => {
        const s = state([UNITED, PERSISTS, [47, 'zagreb_restrains_boban_vopp', 'acknowledge_pressure'], [53, 'hrhb_central_bosnia_defense_1993', 'federate_early']]);
        const st = getRefugeeCompactStatus(s, 60);
        expect(st.active_entries).toBe(0);
        expect(st.lapsed).toBe(true);
        expect(getRefugeeCompactPressureMultiplier(s, 60)).toBe(1.0);
        // The price ends with the compact; the 1992 stance (drag) stays.
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', 60)).toBe(1.0);
        expect(getPatronDragStanceMultiplier(s, 60)).toBe(0.25);
    });

    it('a flip suspension lifts the damping but the price is still paid', () => {
        const s = state([UNITED], { suspendedUntil: 30 });
        expect(getRefugeeCompactPressureMultiplier(s, 25)).toBe(1.0);
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', 25)).toBe(REFUGEE_COMPACT_RECRUITMENT_PRICE);
        expect(getRefugeeCompactPressureMultiplier(s, 30)).toBe(REFUGEE_COMPACT_MULTIPLIER);
    });

    it('only HRHB decisions count', () => {
        const s = state([[5, 'hrhb_political_goal', 'united_front', 'RBiH']]);
        expect(getRefugeeCompactStatus(s, 10).active_entries).toBe(0);
    });

    it('recruitment reader: the compact price multiplies the event modifiers; unchanged without one', () => {
        const mods = [{ faction: 'HRHB', pool_multiplier: 0.95, expires_turn: 99 }];
        expect(getActiveRecruitmentMultiplier(state([], { mods }), 'HRHB', 20)).toBe(0.95);
        expect(getActiveRecruitmentMultiplier(state([UNITED], { mods }), 'HRHB', 20)).toBeCloseTo(0.95 * 0.9, 12);
        expect(getActiveRecruitmentMultiplier(state([UNITED]), 'HRHB', 20)).toBe(0.9);
        expect(getActiveRecruitmentMultiplier(state([]), 'HRHB', 20)).toBe(1.0);
    });
});

describe('A2b save compatibility: refugee_compact_suspended_until', () => {
    const fixture = readFileSync(resolve(__dirname, 'fixtures/negotiation/b371_apr1992_initial_save.json'), 'utf8');

    it('is absent from a save that never had a compact', () => {
        const s = deserializeState(fixture);
        expect(serializeState(s)).not.toContain('refugee_compact_suspended_until');
    });

    it('round-trips when present', () => {
        const s = deserializeState(fixture);
        const rhs = (s.political.rbih_hrhb_state ??= {} as never) as { refugee_compact_suspended_until?: number };
        rhs.refugee_compact_suspended_until = 61;
        const back = deserializeState(serializeState(s));
        expect(back.political.rbih_hrhb_state?.refugee_compact_suspended_until).toBe(61);
    });
});
