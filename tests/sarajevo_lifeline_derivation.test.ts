import assert from 'node:assert';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { updateSarajevoState } from '../src/state/sarajevo_exception.js';
import {
    bandLifelineStatus,
    deriveSarajevoLifeline,
    isTunnelActive,
    isAirliftActive,
    lifelineAttritionMultiplier,
    isSarajevoCoreSiegeCounterKey,
    SARAJEVO_TUNNEL_EVENT_ID,
} from '../src/state/sarajevo_lifeline.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

// B7 — Sarajevo lifeline substrate (default-OFF, gated by ENABLE_SARAJEVO_LIFELINE).
// Derivation: event truth (tunnel/airlift), NOT calendar. Deterministic.

function makeBesiegedState(turn = 12, firedTunnel = false): GameState {
    return {
        schema_version: 1,
        meta: { turn, seed: 'sarajevo-lifeline', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            fired_event_ids: firedTunnel ? [SARAJEVO_TUNNEL_EVENT_ID] : [],
            event_flags: { sarajevo_siege_active: true },
        } as any,
        political: {
            political_controllers: {
                'op:centar_sarajevo:radava': 'RBiH',
            },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

const CRITICAL_SUPPLY: SupplyStateByOsidReport = {
    schema: 1,
    turn: 12,
    factions: [
        { faction_id: 'RBiH', by_osid: [{ osid: 'op:centar_sarajevo:radava', state: 'critical' }] },
    ],
};

afterEach(() => {
    delete process.env.ENABLE_SARAJEVO_LIFELINE;
});

describe('B7 lifeline pure helpers', () => {
    it('bands throughput deterministically', () => {
        expect(bandLifelineStatus(0)).toBe('SEVERED');
        expect(bandLifelineStatus(0.001)).toBe('SEVERED');
        expect(bandLifelineStatus(0.3)).toBe('STRANGLED');
        expect(bandLifelineStatus(0.6)).toBe('OPEN');
        expect(bandLifelineStatus(1)).toBe('OPEN');
    });

    it('reads tunnel availability from event truth, not calendar', () => {
        expect(isTunnelActive(makeBesiegedState(99, false))).toBe(false);
        expect(isTunnelActive(makeBesiegedState(1, true))).toBe(true);
        const flagState = makeBesiegedState(5, false);
        (flagState.military as any).sarajevo_tunnel_operational = true;
        expect(isTunnelActive(flagState)).toBe(true);
    });

    it('airlift active while besieged unless an incident flag suspends it', () => {
        const s = makeBesiegedState();
        expect(isAirliftActive(s, true)).toBe(true);
        expect(isAirliftActive(s, false)).toBe(false);
        (s.military as any).event_flags.provide_promise_suspended = true;
        expect(isAirliftActive(s, true)).toBe(false);
    });

    it('attrition multiplier interpolates severed→open by throughput; 1 when no lifeline', () => {
        expect(lifelineAttritionMultiplier(undefined, 1.25)).toBe(1);
        const severed = { status: 'SEVERED', airlift_active: false, tunnel_active: false, throughput: 0, last_updated_turn: 0 } as const;
        const open = { status: 'OPEN', airlift_active: true, tunnel_active: true, throughput: 1, last_updated_turn: 0 } as const;
        expect(lifelineAttritionMultiplier(severed, 1.25)).toBeCloseTo(1.25, 10);
        // open => damped below 1
        expect(lifelineAttritionMultiplier(open, 1.25)).toBeLessThan(1);
    });

    it('identifies RBiH Sarajevo-core siege counter keys only', () => {
        expect(isSarajevoCoreSiegeCounterKey('RBiH:op:centar_sarajevo:radava')).toBe(true);
        expect(isSarajevoCoreSiegeCounterKey('RBiH:op:ilidza:rakovica_2')).toBe(false); // outer ring, not core
        expect(isSarajevoCoreSiegeCounterKey('RS:op:centar_sarajevo:radava')).toBe(false); // besieger
        expect(isSarajevoCoreSiegeCounterKey('RBiH:op:tuzla:foo')).toBe(false); // not Sarajevo
    });
});

describe('B7 lifeline derivation (flag ON)', () => {
    it('SEVERED pre-tunnel when airlift suspended', () => {
        const s = makeBesiegedState(10, false);
        (s.military as any).event_flags.provide_promise_suspended = true;
        const lifeline = deriveSarajevoLifeline(s, true, 10);
        expect(lifeline.status).toBe('SEVERED');
        expect(lifeline.tunnel_active).toBe(false);
        expect(lifeline.airlift_active).toBe(false);
        expect(lifeline.throughput).toBe(0);
    });

    it('STRANGLED with airlift only, pre-tunnel', () => {
        const lifeline = deriveSarajevoLifeline(makeBesiegedState(10, false), true, 10);
        expect(lifeline.airlift_active).toBe(true);
        expect(lifeline.tunnel_active).toBe(false);
        expect(lifeline.status).toBe('STRANGLED');
        expect(lifeline.throughput).toBeGreaterThan(0);
        expect(lifeline.throughput).toBeLessThan(0.6);
    });

    it('tunnel becomes a CONTINUOUS relief once the event has fired (throughput rises)', () => {
        const pre = deriveSarajevoLifeline(makeBesiegedState(20, false), true, 20);
        const post = deriveSarajevoLifeline(makeBesiegedState(21, true), true, 21);
        expect(post.tunnel_active).toBe(true);
        expect(post.throughput).toBeGreaterThan(pre.throughput);
    });

    it('derivation is deterministic across reruns', () => {
        const a = deriveSarajevoLifeline(makeBesiegedState(21, true), true, 21);
        const b = deriveSarajevoLifeline(makeBesiegedState(21, true), true, 21);
        expect(b).toEqual(a);
    });
});

describe('B7 updateSarajevoState wiring', () => {
    it('flag OFF: no lifeline field, external_supply aliases internal_supply', () => {
        const s = makeBesiegedState(12, true);
        const sarajevo = updateSarajevoState(s, CRITICAL_SUPPLY);
        assert.strictEqual(sarajevo.lifeline, undefined);
        assert.strictEqual(sarajevo.external_supply, sarajevo.internal_supply);
    });

    it('flag ON: lifeline attached and external_supply driven by lifeline throughput', () => {
        process.env.ENABLE_SARAJEVO_LIFELINE = 'true';
        const s = makeBesiegedState(12, true);
        const sarajevo = updateSarajevoState(s, CRITICAL_SUPPLY);
        assert.ok(sarajevo.lifeline, 'lifeline should be derived when flag ON');
        assert.strictEqual(sarajevo.external_supply, sarajevo.lifeline!.throughput);
        // internal supply was critical (0) but external is now lifeline-mediated (>0).
        assert.strictEqual(sarajevo.internal_supply, 0);
        assert.ok(sarajevo.external_supply > 0, 'tunnel+airlift lifeline carries external supply');
    });
});
