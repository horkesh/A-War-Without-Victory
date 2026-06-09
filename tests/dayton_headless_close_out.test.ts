/**
 * A2 Dayton close-out (task #71) — headless terminal-resolution proxy.
 *
 * Pins the contract the instrumented-campaign audit (20260609) demanded a proof
 * for: in headless / historical mode, a campaign that reaches its horizon with a
 * pending Dayton menu must CLOSE on a coherent Pyrrhic verdict + meta.game_over,
 * not freeze-frame as an open menu. These tests exercise the terminal path
 * directly (no full 188w) so the close-out is verifiable without a human.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown, PatronRelationship } from '../src/state/negotiation_types.js';
import { createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import {
    shouldInitiateDayton,
    initiateDaytonNegotiation,
    resolvePendingDaytonCloseOut,
    buildHistoricalDefaultDaytonProposal,
    effectiveDaytonTriggerWeek,
    DAYTON_TRIGGER_WEEK,
    DAYTON_TRIGGER_WEEK_CLOSE_OUT,
} from '../src/sim/negotiation/dayton_negotiation.js';
import { computeFullVerdict } from '../src/sim/negotiation/scoring.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers (mirror dayton_negotiation.test.ts state shape)
// ─────────────────────────────────────────────────────────────────────────────

function makeCapital(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

function makePatron(overrides: Partial<PatronRelationship> = {}): PatronRelationship {
    return {
        patron_id: 'international_community',
        support_level: 50,
        override_authority: 10,
        sanctions_active: false,
        relationship_events: [],
        ...overrides,
    };
}

function makeState(overrides: {
    turn?: number;
    war_start_turn?: number;
    game_over?: boolean;
    dayton_close_out?: boolean;
    decision_mode?: 'historical' | 'emergent';
    capital?: Record<string, Partial<NegotiationBreakdown>>;
    political_controllers?: Record<string, string>;
} = {}): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        capital[faction] = makeCapital(overrides.capital?.[faction] ?? { territory_controlled_pct: 30 });
        patron_relationships[faction] = makePatron();
    }
    return {
        meta: {
            turn: overrides.turn ?? 188,
            war_start_turn: overrides.war_start_turn ?? 0,
            phase: 'war',
            seed: 1,
            date: '1995-11-21',
            game_over: overrides.game_over ?? false,
            player_faction: 'RBiH',
            dayton_close_out: overrides.dayton_close_out,
            decision_mode: overrides.decision_mode,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: {
                capital,
                patron_relationships,
                peace_plan_history: [],
                strategic_dimensions: initializeStrategicDimensions(),
            },
        },
        political: { political_controllers: overrides.political_controllers ?? {} },
        displacement: {},
    } as unknown as GameState;
}

/** Arm a pending Dayton menu the way the pipeline step does. */
function armPendingMenu(state: GameState): void {
    const menu = initiateDaytonNegotiation(state);
    state.military.negotiation!.pending_dayton = menu as never;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger pull-forward
// ─────────────────────────────────────────────────────────────────────────────

describe('A2 trigger pull-forward', () => {
    it('default trigger week is 188; close-out week is 180', () => {
        expect(DAYTON_TRIGGER_WEEK).toBe(188);
        expect(DAYTON_TRIGGER_WEEK_CLOSE_OUT).toBe(180);
    });

    it('effectiveDaytonTriggerWeek is 188 by default (flag off)', () => {
        expect(effectiveDaytonTriggerWeek(makeState({ dayton_close_out: undefined }))).toBe(188);
    });

    it('effectiveDaytonTriggerWeek pulls forward to 180 when close-out is on', () => {
        expect(effectiveDaytonTriggerWeek(makeState({ dayton_close_out: true }))).toBe(180);
    });

    it('with close-out, Dayton triggers at w180 (8 turns before the 188w horizon)', () => {
        expect(shouldInitiateDayton(makeState({ turn: 180, dayton_close_out: true }))).toBe(true);
        // Without the flag, w180 is too early — old behavior preserved.
        expect(shouldInitiateDayton(makeState({ turn: 180, dayton_close_out: undefined }))).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Terminal resolution
// ─────────────────────────────────────────────────────────────────────────────

describe('A2 terminal close-out resolution', () => {
    it('historical-default proposal is empty (signs the all-default settlement)', () => {
        const p = buildHistoricalDefaultDaytonProposal();
        expect(p.territorial_demands).toEqual([]);
        expect(p.territorial_concessions).toEqual([]);
        expect(p.institutional_choices).toEqual({});
    });

    it('resolves a pending menu to a verdict + game_over (the close, not a freeze-frame)', () => {
        const state = makeState({ turn: 188, dayton_close_out: true });
        armPendingMenu(state);
        expect(state.meta.game_over).toBe(false);

        const result = resolvePendingDaytonCloseOut(state);

        expect(result).not.toBeNull();
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe('dayton');
        // The stale pending menu is consumed into the signed result.
        expect(state.military.negotiation!.pending_dayton).toBeUndefined();
        expect(state.military.negotiation!.dayton_result).toBeDefined();
        // The endgame snapshot (verdict + cost ledger) was frozen at the close.
        expect((state.meta as { endgame_snapshot?: unknown }).endgame_snapshot).toBeDefined();
    });

    it('the closed state computes a coherent Pyrrhic verdict for all three factions', () => {
        const state = makeState({
            turn: 188,
            dayton_close_out: true,
            capital: {
                RBiH: { territory_controlled_pct: 30 },
                RS: { territory_controlled_pct: 49 },
                HRHB: { territory_controlled_pct: 21 },
            },
        });
        armPendingMenu(state);
        resolvePendingDaytonCloseOut(state);

        const verdict = computeFullVerdict(state);
        expect(verdict.outcome_type).toBe('dayton');
        expect(verdict.outcome_label).toBe('Dayton Agreement');
        for (const f of ['RBiH', 'RS', 'HRHB']) {
            const fv = verdict.faction_verdicts[f];
            expect(fv).toBeDefined();
            expect(fv.grade).toMatch(/^(A\+|A|B|C|D|F)$/);
            expect(fv.outcome_class).toBeTruthy();
        }
        // The signed settlement carries a final territory split.
        expect(verdict.dayton_result?.final_territory_split).toBeDefined();
    });

    it('is deterministic — same inputs, same signed result', () => {
        const build = () => {
            const s = makeState({ turn: 188, dayton_close_out: true });
            armPendingMenu(s);
            resolvePendingDaytonCloseOut(s);
            return s.military.negotiation!.dayton_result!;
        };
        const r1 = build();
        const r2 = build();
        expect(r1.final_territory_split).toEqual(r2.final_territory_split);
        expect(r1.territorial_packages_accepted).toEqual(r2.territorial_packages_accepted);
        expect(r1.institutional_choices).toEqual(r2.institutional_choices);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// No-op guards (calibration safety)
// ─────────────────────────────────────────────────────────────────────────────

describe('A2 close-out no-op guards', () => {
    it('no-op when close-out flag is OFF (calibration path untouched)', () => {
        const state = makeState({ turn: 188, dayton_close_out: undefined });
        armPendingMenu(state); // menu present, but flag off
        const result = resolvePendingDaytonCloseOut(state);
        expect(result).toBeNull();
        expect(state.meta.game_over).toBe(false);
        expect(state.meta.outcome).toBeUndefined();
        // The pending menu is left exactly as it was — no resolution, no mutation.
        expect(state.military.negotiation!.pending_dayton).toBeDefined();
        expect(state.military.negotiation!.dayton_result).toBeUndefined();
    });

    it('no-op when there is no pending menu (trigger never fired)', () => {
        const state = makeState({ turn: 188, dayton_close_out: true });
        const result = resolvePendingDaytonCloseOut(state);
        expect(result).toBeNull();
        expect(state.meta.game_over).toBe(false);
    });

    it('no-op when the game is already over', () => {
        const state = makeState({ turn: 188, dayton_close_out: true, game_over: true });
        armPendingMenu(state);
        const result = resolvePendingDaytonCloseOut(state);
        expect(result).toBeNull();
    });

    it('idempotent — a second call after resolution does nothing more', () => {
        const state = makeState({ turn: 188, dayton_close_out: true });
        armPendingMenu(state);
        const first = resolvePendingDaytonCloseOut(state);
        expect(first).not.toBeNull();
        const second = resolvePendingDaytonCloseOut(state);
        expect(second).toBeNull();
    });
});
