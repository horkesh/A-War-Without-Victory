/**
 * B5 (2026-11-16): Washington "Path A'" — the agreement the cards record, on a quiet front.
 * Fires with Path A's effects (ceasefire included) once a fought war is quiet, Zagreb's ceasefire
 * order was acknowledged and both Washington cards were signed. It opens the week after the Washington
 * week (WASH_QUIET_FRONT_OPENS_WEEK). Never in the historical run: that run signs through Path A by
 * WASHINGTON_AGREEMENT_WEEK (t102, the historical date), which the baseline runner asserts.
 */

import { describe, it, expect } from 'vitest';

import {
    checkAndApplyWashington,
    evaluateWashingtonQuietFront,
    WASHINGTON_AGREEMENT_WEEK,
    WASH_ALLIANCE_LOCK_VALUE,
    WASH_QUIET_FRONT_TURNS,
    WASH_QUIET_FRONT_OPENS_WEEK,
    POST_WASH_CROATIAN_SUPPORT,
} from '../src/sim/early_war/washington_agreement.js';
import { assertHistoricalWashingtonBeforeQuietFrontWindow } from '../tools/scenario_runner/run_baseline_regression.js';
import type { GameState } from '../src/state/game_state.js';

type Decision = [eventId: string, responseId: string];

const SIGNED: Decision[] = [
    ['zagreb_orders_hrhb_ceasefire', 'acknowledge_pressure'],
    ['hrhb_washington_agreement_1994', 'accept'],
    ['rbih_washington_agreement_1994', 'accept'],
];

function state(opts: {
    turn?: number;
    alliance?: number;
    warStartedTurn?: number | null;
    stalemate?: number;
    ceasefireSince?: number | null;
    decisions?: Decision[];
} = {}): GameState {
    const ceasefireSince = opts.ceasefireSince ?? null;
    return {
        meta: { turn: opts.turn ?? WASH_QUIET_FRONT_OPENS_WEEK },
        political: {
            war_alliance_rbih_hrhb: opts.alliance ?? 0.82,
            rbih_hrhb_state: {
                washington_signed: false,
                washington_turn: null,
                ceasefire_active: ceasefireSince !== null,
                ceasefire_since_turn: ceasefireSince,
                war_started_turn: opts.warStartedTurn === undefined ? 63 : opts.warStartedTurn,
                stalemate_turns: opts.stalemate ?? WASH_QUIET_FRONT_TURNS,
                allied_mixed_municipalities: [],
            },
            political_controllers: {},
            war_exhaustion: {},
        },
        military: {
            formations: {},
            militia_pools: {},
            alliance_locks: [],
            event_decision_log: (opts.decisions ?? SIGNED).map(([event_id, response_id], i) => ({
                event_id, response_id, decision_source: 'player', faction: 'HRHB', turn: 95 + i,
            })),
        },
        factions: [{ id: 'HRHB', capability_profile: { equipment_access: 0.4, croatian_support: 0.5 }, embargo_profile: { external_pipeline_status: 0.5, heavy_equipment_access: 0.3 } }],
    } as unknown as GameState;
}

describe("Path A' — Washington on a quiet front", () => {
    it('signs with Path A effects, ceasefire included', () => {
        const s = state();
        const report = checkAndApplyWashington(s);
        expect(report.fired).toBe(true);
        expect(report.trigger_path).toBe('quiet_front');
        const rhs = s.political.rbih_hrhb_state!;
        expect(rhs.washington_signed).toBe(true);
        expect(rhs.washington_turn).toBe(WASH_QUIET_FRONT_OPENS_WEEK);
        expect(rhs.ceasefire_active).toBe(true);
        expect(rhs.ceasefire_since_turn).toBe(WASH_QUIET_FRONT_OPENS_WEEK);
        expect(s.political.war_alliance_rbih_hrhb).toBe(WASH_ALLIANCE_LOCK_VALUE);
        expect((s.factions as any)[0].capability_profile.croatian_support).toBe(POST_WASH_CROATIAN_SUPPORT);
    });

    it('a held ceasefire counts as a quiet front; reluctant signatures count as signed', () => {
        expect(evaluateWashingtonQuietFront(state({
            stalemate: 0,
            ceasefireSince: WASH_QUIET_FRONT_OPENS_WEEK - WASH_QUIET_FRONT_TURNS,
        })).all_met).toBe(true);
        expect(evaluateWashingtonQuietFront(state({ decisions: [
            ['zagreb_orders_hrhb_ceasefire', 'acknowledge_pressure'],
            ['hrhb_washington_agreement_1994', 'reluctant'],
            ['rbih_washington_agreement_1994', 'reluctant'],
        ] })).all_met).toBe(true);
    });

    it('does not fire in or before the Washington week, without a war, or below the allied threshold', () => {
        expect(WASH_QUIET_FRONT_OPENS_WEEK).toBe(WASHINGTON_AGREEMENT_WEEK + 1);
        expect(evaluateWashingtonQuietFront(state({ turn: WASHINGTON_AGREEMENT_WEEK })).calendar_reached).toBe(false);
        expect(evaluateWashingtonQuietFront(state({ turn: WASHINGTON_AGREEMENT_WEEK })).all_met).toBe(false);
        expect(evaluateWashingtonQuietFront(state({ warStartedTurn: null })).all_met).toBe(false);
        expect(evaluateWashingtonQuietFront(state({ alliance: 0.2 })).all_met).toBe(false);
    });

    it('does not fire on a front that is still fighting', () => {
        const r = evaluateWashingtonQuietFront(state({ stalemate: WASH_QUIET_FRONT_TURNS - 1 }));
        expect(r.front_quiet).toBe(false);
        expect(r.all_met).toBe(false);
        expect(evaluateWashingtonQuietFront(state({
            stalemate: 0,
            ceasefireSince: WASH_QUIET_FRONT_OPENS_WEEK - WASH_QUIET_FRONT_TURNS + 1,
        })).all_met).toBe(false);
    });

    it("needs Zagreb's restraint: resisting the patron, or no answer, keeps it closed", () => {
        const resist = state({ decisions: [['zagreb_orders_hrhb_ceasefire', 'resist_patron'], ...SIGNED.slice(1)] });
        expect(evaluateWashingtonQuietFront(resist).zagreb_restraint).toBe(false);
        expect(evaluateWashingtonQuietFront(resist).all_met).toBe(false);
        expect(evaluateWashingtonQuietFront(state({ decisions: SIGNED.slice(1) })).all_met).toBe(false);
    });

    it('needs both Washington cards signed', () => {
        expect(evaluateWashingtonQuietFront(state({ decisions: SIGNED.slice(0, 2) })).cards_signed).toBe(false);
        expect(evaluateWashingtonQuietFront(state({ decisions: [SIGNED[0], SIGNED[2]] })).cards_signed).toBe(false);
    });

    it('never fires twice', () => {
        const s = state();
        checkAndApplyWashington(s);
        const again = checkAndApplyWashington(s);
        expect(again.fired).toBe(false);
        expect(again.already_signed).toBe(true);
    });
});

describe("Historical guard: the 188w run signs before Path A' can open", () => {
    const save = (signed: boolean, turn: number | null) => ({
        political: { rbih_hrhb_state: { washington_signed: signed, washington_turn: turn } },
    });

    it('passes when history signs by the Washington week (t102, the historical date)', () => {
        expect(() => assertHistoricalWashingtonBeforeQuietFrontWindow(save(true, 98))).not.toThrow();
        expect(() => assertHistoricalWashingtonBeforeQuietFrontWindow(save(true, WASHINGTON_AGREEMENT_WEEK))).not.toThrow();
    });

    it("fails loudly when history signs once Path A' can open, or never", () => {
        expect(() => assertHistoricalWashingtonBeforeQuietFrontWindow(save(true, WASH_QUIET_FRONT_OPENS_WEEK))).toThrow(/Path A'/);
        expect(() => assertHistoricalWashingtonBeforeQuietFrontWindow(save(false, null))).toThrow(/Path A'/);
    });
});
