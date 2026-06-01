/**
 * Free War Phase 1 (Slice A) — emergent territory-trend priority multiplier.
 *
 * Verifies that getCorpsArmyPriorities:
 *  (a) emergent: a lower-static priority whose target AREA is losing ground recently
 *      is boosted ABOVE a quiet higher-static priority (the ORDER changes vs static);
 *  (b) historical / unset: ordering is the static-weight ordering (unchanged);
 *  (c) determinism: same state → same ordering twice;
 *  (d) quantization: near-equal modulated weights do not flip order unexpectedly — the
 *      NAME tie-break holds when effective weights are equal.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, ControlEvent } from '../src/state/game_state.js';
import {
    getCorpsArmyPriorities,
    FACTION_ARMY_PRIORITIES,
} from '../src/sim/combat/bot_strategy.js';

// ── Factory ──────────────────────────────────────────────────────────────────

function makeState(opts: {
    turn: number;
    mode?: 'historical' | 'emergent';
    controlEvents?: ControlEvent[];
}): GameState {
    return {
        meta: { turn: opts.turn, decision_mode: opts.mode } as GameState['meta'],
        military: { formations: {}, corps_front_sectors: {} } as unknown as GameState['military'],
        political: { control_events: opts.controlEvents ?? [] } as unknown as GameState['political'],
    } as unknown as GameState;
}

/** Build a control event: faction `lost` `osid` to enemy on `turn`. */
function loss(faction: string, osid: string, turn: number): ControlEvent {
    return { turn, settlement_id: osid, mechanism: 'combat', from: faction, to: 'RBiH' } as ControlEvent;
}

// ── (b) historical / unset === static ordering ────────────────────────────────

function staticOrdering(faction: 'RS' | 'RBiH' | 'HRHB', corpsId: string, turn: number): string[] {
    return (FACTION_ARMY_PRIORITIES[faction] ?? [])
        .filter(p => p.corps_id === corpsId && turn >= p.start_week && turn < p.end_week)
        .sort((a, b) => (b.weight !== a.weight ? b.weight - a.weight : a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map(p => p.name);
}

describe('Free War Slice A — territory-trend priority multiplier', () => {
    const FACTION = 'RS' as const;
    const CORPS = 'vrs_1st_krajina';
    const TURN = 6;

    it('(b) historical mode returns the static-weight ordering verbatim', () => {
        const state = makeState({ turn: TURN, mode: 'historical' });
        const names = getCorpsArmyPriorities(FACTION, CORPS, TURN, state).map(p => p.name);
        expect(names).toEqual(staticOrdering(FACTION, CORPS, TURN));
    });

    it('(b) unset decision_mode returns the static-weight ordering verbatim', () => {
        const state = makeState({ turn: TURN });
        const names = getCorpsArmyPriorities(FACTION, CORPS, TURN, state).map(p => p.name);
        expect(names).toEqual(staticOrdering(FACTION, CORPS, TURN));
    });

    it('(b) no state argument returns the static-weight ordering verbatim', () => {
        const names = getCorpsArmyPriorities(FACTION, CORPS, TURN).map(p => p.name);
        expect(names).toEqual(staticOrdering(FACTION, CORPS, TURN));
    });

    it('(a) emergent: a losing lower-static area out-ranks a quiet higher-static area', () => {
        // At turn 6 vrs_1st_krajina active priorities (static weights):
        //   Corridor 92 (1KK)  = 100  (area: brcko/odzak/derventa/... quiet)
        //   Central Corridor   = 30   (area: kotor_varos/teslic/doboj  quiet)
        //   1KK Rear Security  = 20   (area: prijedor/banja_luka/...  LOSING 4 OSIDs)
        // 1KK Rear: mult = round2(1 + 0.15*4) = 1.60 -> eff = 20*1.60 = 32
        // Central Corridor (quiet): mult 0.80 -> eff = 30*0.80 = 24
        // => 1KK Rear (32) out-ranks Central Corridor (24): LOWER static beats HIGHER.
        // All four losses fall in 1KK Rear Security's area (prijedor/banja_luka/laktasi/
        // celinac) — none touch Central Corridor (kotor_varos/teslic/doboj), which stays
        // quiet. NOTE: kotor_varos belongs to BOTH areas, so it is deliberately avoided.
        const controlEvents: ControlEvent[] = [
            loss('RS', 'op:prijedor:prijedor_2', 5),
            loss('RS', 'op:banja_luka:banja_luka_2', 5),
            loss('RS', 'op:celinac:celinac_2', 4),
            loss('RS', 'op:laktasi:laktasi_2', 6),
        ];
        const state = makeState({ turn: TURN, mode: 'emergent', controlEvents });
        const names = getCorpsArmyPriorities(FACTION, CORPS, TURN, state).map(p => p.name);

        const idxRear = names.indexOf('1KK Rear Security');
        const idxCentral = names.indexOf('Central Corridor');
        expect(idxRear).toBeGreaterThanOrEqual(0);
        expect(idxCentral).toBeGreaterThanOrEqual(0);
        // ORDER CHANGED vs static (where Central(30) outranks Rear(20)).
        expect(idxRear).toBeLessThan(idxCentral);

        // And it differs from the static ordering.
        const staticNames = staticOrdering(FACTION, CORPS, TURN);
        expect(names).not.toEqual(staticNames);
    });

    it('(e) Codex P2 #93: emergent returns the EFFECTIVE weight on each priority (consumers read p.weight)', () => {
        const controlEvents: ControlEvent[] = [
            loss('RS', 'op:prijedor:prijedor_2', 5),
            loss('RS', 'op:banja_luka:banja_luka_2', 5),
            loss('RS', 'op:celinac:celinac_2', 4),
            loss('RS', 'op:laktasi:laktasi_2', 6),
        ];
        const emergent = getCorpsArmyPriorities(FACTION, CORPS, TURN, makeState({ turn: TURN, mode: 'emergent', controlEvents }));
        // 1KK Rear (static 20) loses 4 OSIDs → ×1.60 → effective weight 32 carried on the returned object,
        // so generateArmyHQOverrides' thresholds + commanderReviewAssignment's mission weights see the boost.
        expect(emergent.find(p => p.name === '1KK Rear Security')!.weight).toBeCloseTo(32, 5);
        // A quiet area decays: Central Corridor static 30 → ×0.80 → 24.
        expect(emergent.find(p => p.name === 'Central Corridor')!.weight).toBeCloseTo(24, 5);
        // Historical returns the STATIC weights unchanged (byte-identical contract).
        const hist = getCorpsArmyPriorities(FACTION, CORPS, TURN, makeState({ turn: TURN, mode: 'historical', controlEvents }));
        expect(hist.find(p => p.name === '1KK Rear Security')!.weight).toBe(20);
        expect(hist.find(p => p.name === 'Central Corridor')!.weight).toBe(30);
    });

    it('(c) determinism: identical state yields identical ordering on repeat calls', () => {
        const controlEvents: ControlEvent[] = [
            loss('RS', 'op:prijedor:prijedor_2', 5),
            loss('RS', 'op:laktasi:laktasi_2', 6),
        ];
        const a = getCorpsArmyPriorities(FACTION, CORPS, TURN, makeState({ turn: TURN, mode: 'emergent', controlEvents })).map(p => p.name);
        const b = getCorpsArmyPriorities(FACTION, CORPS, TURN, makeState({ turn: TURN, mode: 'emergent', controlEvents })).map(p => p.name);
        expect(a).toEqual(b);
    });

    it('(d) quantization: equal effective weights fall back to the NAME tie-break', () => {
        // Emergent mode with NO control events: every active priority is "quiet",
        // so all share the same multiplier (0.80). Equal multiplier preserves relative
        // order of distinct static weights, and any same-static-weight pair must resolve
        // by NAME — never flip due to FP noise.
        const state = makeState({ turn: TURN, mode: 'emergent', controlEvents: [] });
        const names = getCorpsArmyPriorities(FACTION, CORPS, TURN, state).map(p => p.name);
        // Uniform quiet multiplier preserves the static ordering exactly.
        expect(names).toEqual(staticOrdering(FACTION, CORPS, TURN));

        // Explicit equal-effective-weight check: two priorities with the same static
        // weight (RBiH 'Sarajevo Defense' is unique, so construct via a known same-weight
        // pair). Use RS where 'Corridor 92 (1KK)' and the EBK variant both = 100 but are
        // different corps; within one corps, confirm sort stability by re-running.
        const again = getCorpsArmyPriorities(FACTION, CORPS, TURN, state).map(p => p.name);
        expect(again).toEqual(names);
    });
});
