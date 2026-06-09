/**
 * Free War Phase 1b — signal-responsive army-HQ override idle gate.
 *
 * The behavioral payoff for the A2a signal substrate (#330): the live battlefield signals
 * (territory-trend × supply × campaign-plan-role) that #330 folds into the EFFECTIVE
 * `p.weight` now CHANGE WHETHER/WHEN an army-HQ override op launches — not just the ordering.
 *
 * Lever: when emergent signals amplify a priority's effective weight to URGENT
 * (≥ URGENT_EFFECTIVE_WEIGHT = 120), army HQ may force action after fewer idle turns
 * (down to URGENT_MIN_IDLE_TURNS = 3) instead of the flat MIN_IDLE_TURNS_FOR_OVERRIDE = 6.
 *
 * HARD CONSTRAINT: historical / unset decision_mode is BYTE-IDENTICAL — the relaxation is
 * gated on decision_mode === 'emergent' AND on the (emergent-only) amplified weight, so the
 * historical path always faces the flat 6-turn wall.
 *
 * Verifies:
 *  (1) historical: an urgent-area corps is still gated until idle ≥ 6 (no early launch);
 *  (2) emergent: the same corps, with signals amplifying its priority ≥ 120, launches at
 *      idle = 3 (relaxed wall) — the SIGNAL changed the launch decision;
 *  (3) emergent: a NON-amplified corps still faces the flat 6-turn wall (relaxation is
 *      reserved for urgent priorities — no blanket op-spam);
 *  (4) emergent: never below the URGENT_MIN_IDLE_TURNS floor (idle = 2 → still gated);
 *  (5) determinism: identical state → identical overrides on repeat.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, FormationState, FactionId, ControlEvent } from '../src/state/game_state.js';
import { generateArmyHQOverrides } from '../src/sim/combat/army_hq_overrides.js';

const FACTION: FactionId = 'RS';
const CORPS = 'vrs_1st_krajina';
// 'Corridor 92 (1KK)' is a static-weight-100 priority for this corps, active at turn 6,
// targeting brcko/odzak/derventa/bosanski_brod/bosanski_samac/modrica/doboj.
// URGENT amplification (≥ 120 effective) needs SIGNAL CONFLUENCE: the live war is both
// losing ground in the area (trend boost) AND the campaign plan marks the corps PRIMARY.
//   trend (lose 1 OSID in area) = 1 + 0.15 = 1.15;  plan primary = ×1.25;  supply neutral 1.0
//   effective = round2(100 × round2(1.15 × 1.0 × 1.25)) = 100 × 1.44 = 144 ≥ 120 (URGENT).
const TURN = 6;

/** Build a control event: RS `lost` `osid` to RBiH on `turn` (drives the trend boost). */
function loss(osid: string, turn: number): ControlEvent {
    return { turn, settlement_id: osid, mechanism: 'combat', from: FACTION, to: 'RBiH' } as ControlEvent;
}

/**
 * Build a minimal state for generateArmyHQOverrides:
 *  - one active corps formation for the faction;
 *  - corps_command with a configurable last_completed_operation_turn (idle distance);
 *  - political_controllers giving the corps' priority targets an enemy-held OSID so an
 *    override has something to aim at;
 *  - optional campaign plan + decision_mode.
 */
function makeState(opts: {
    mode?: 'historical' | 'emergent';
    lastOpTurn: number;
    planRole?: 'primary' | 'secondary' | 'economy' | 'contain';
    planCorps?: string;
    /** When true, inject a recent loss in the corridor area so the trend term participates. */
    losing?: boolean;
}): GameState {
    const formations: Record<string, FormationState> = {
        [CORPS]: {
            id: CORPS,
            faction: FACTION,
            name: CORPS,
            kind: 'corps',
            status: 'active',
            created_turn: 0,
            assignment: null,
            personnel: 5000,
            corps_id: CORPS,
        } as unknown as FormationState,
    };

    // Corridor 92 (1KK) targets corridor municipalities (brcko/odzak/derventa/...). Give a
    // handful of enemy-held OSIDs in those municipalities so the override has live targets.
    const political_controllers: Record<string, FactionId> = {
        'op:brcko:brcko_2': 'RBiH',
        'op:odzak:odzak_2': 'RBiH',
        'op:derventa:derventa_2': 'RBiH',
        'op:modrica:modrica_2': 'RBiH',
    };

    const campaign_plans = opts.planRole
        ? {
              [FACTION]: {
                  issued_turn: 0,
                  valid_until_turn: 999,
                  front_priorities: [{ corps_id: opts.planCorps ?? CORPS, role: opts.planRole }],
                  synchronized_operations: [],
              },
          }
        : undefined;

    // Recent loss in the corridor area (turn 5, within the 6-turn window) → trend boost.
    const control_events: ControlEvent[] = opts.losing ? [loss('op:brcko:brcko_2', 5)] : [];

    return {
        meta: { turn: TURN, decision_mode: opts.mode } as GameState['meta'],
        military: {
            formations,
            corps_command: {
                [CORPS]: {
                    active_operations: [],
                    last_completed_operation_turn: opts.lastOpTurn,
                },
            },
            ...(campaign_plans ? { campaign_plans } : {}),
        } as unknown as GameState['military'],
        political: {
            political_controllers,
            control_events,
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

function hasFullOverrideForCorps(state: GameState): boolean {
    return generateArmyHQOverrides(state, FACTION).some(
        o => o.corps_id === CORPS && o.type === 'offensive',
    );
}

describe('Free War Phase 1b — signal-responsive army-HQ override idle gate', () => {
    it('(1) historical: an urgent-signal corps is STILL gated at idle = 3 (flat 6-turn wall)', () => {
        // idle distance = TURN - lastOpTurn = 6 - 3 = 3 (< 6). Historical mode ignores the
        // signal amplification entirely (p.weight stays the static 100) → no override.
        // Byte-identical to pre-Phase-1b.
        const state = makeState({ mode: 'historical', lastOpTurn: 3, planRole: 'primary', losing: true });
        expect(hasFullOverrideForCorps(state)).toBe(false);
    });

    it('(2) emergent: signal confluence amplifies the priority ≥ 120 → launches at idle = 3', () => {
        // Same idle distance (3) as case (1), but emergent + losing-area trend (×1.15) +
        // plan-primary (×1.25) lifts Corridor 92 to effective ~144 ≥ 120 → relaxed idle
        // requirement 3 is met → override fires. The SIGNAL changed the launch decision.
        const state = makeState({ mode: 'emergent', lastOpTurn: 3, planRole: 'primary', losing: true });
        expect(hasFullOverrideForCorps(state)).toBe(true);
    });

    it('(2b) emergent control: WITHOUT signal confluence the same idle = 3 corps stays gated', () => {
        // Emergent, plan-primary, but NO loss in the area → trend is the quiet decay (×0.80):
        // effective = 100 × round2(0.80 × 1.0 × 1.25) = 100 × 1.0 = 100 < 120 → NOT urgent →
        // flat 6-turn wall → no early launch. The relaxation needs genuine signal confluence.
        const state = makeState({ mode: 'emergent', lastOpTurn: 3, planRole: 'primary', losing: false });
        expect(hasFullOverrideForCorps(state)).toBe(false);
    });

    it('(2c) emergent control: a quiet corps with no plan stays gated at idle = 3', () => {
        const state = makeState({ mode: 'emergent', lastOpTurn: 3 });
        expect(hasFullOverrideForCorps(state)).toBe(false);
    });

    it('(3) emergent + historical both launch once idle reaches the flat 6 anyway', () => {
        // idle distance = 6 ≥ 6: relaxation is irrelevant; both modes launch. Sanity that the
        // relaxation does not BLOCK the normal path.
        const emergent = makeState({ mode: 'emergent', lastOpTurn: 0, planRole: 'primary', losing: true });
        const historical = makeState({ mode: 'historical', lastOpTurn: 0, planRole: 'primary', losing: true });
        expect(hasFullOverrideForCorps(emergent)).toBe(true);
        expect(hasFullOverrideForCorps(historical)).toBe(true);
    });

    it('(4) emergent: never below the URGENT_MIN_IDLE_TURNS floor — idle = 2 stays gated', () => {
        // idle distance = TURN - lastOpTurn = 6 - 4 = 2 (< 3 floor). Even an urgent priority
        // cannot launch — anti-spam floor holds.
        const state = makeState({ mode: 'emergent', lastOpTurn: 4, planRole: 'primary', losing: true });
        expect(hasFullOverrideForCorps(state)).toBe(false);
    });

    it('(5) determinism: identical state → identical overrides on repeat calls', () => {
        const mk = () => makeState({ mode: 'emergent', lastOpTurn: 3, planRole: 'primary', losing: true });
        const a = JSON.stringify(generateArmyHQOverrides(mk(), FACTION));
        const b = JSON.stringify(generateArmyHQOverrides(mk(), FACTION));
        expect(a).toEqual(b);
    });
});

/**
 * #335 regression — a QUIET static-high priority must NOT relax the idle wall.
 *
 * The relaxation must require a GENUINE live-signal amplification (emergent_boost > 1.0), not
 * merely an effective weight that clears URGENT_EFFECTIVE_WEIGHT. The canonical trap: ARBiH
 * 'Central Corridor Counter' has STATIC weight 150. With no live signals it takes the quiet
 * decay (×0.80) → effective weight EXACTLY 120 = URGENT_EFFECTIVE_WEIGHT. Before the fix that
 * cleared the threshold and relaxed the wall (6→3) for a calendar-high op the battlefield is
 * silent about; after the fix `boost = 0.80 ≤ 1.0` blocks the relaxation, so it stays gated.
 */
describe('#335 — quiet static-high priority does not bypass the idle confluence gate', () => {
    const RBIH: FactionId = 'RBiH';
    const CB_CORPS = 'arbih_3rd_corps';
    // 'Central Corridor Counter' (static 150) is active in weeks 12..56.
    const CB_TURN = 20;

    /**
     * Minimal RBiH state for the 3rd Corps. QUIET by construction: no control_events (trend
     * quiet ×0.80), no campaign plan (plan neutral), no supply data (supply neutral). The
     * 'Central Corridor Counter' priority therefore decays to effective 150×0.80 = 120, which
     * EQUALS URGENT_EFFECTIVE_WEIGHT but with boost 0.80 ≤ 1.0 (no real amplification).
     */
    function makeQuietCbState(opts: { mode: 'historical' | 'emergent'; lastOpTurn: number }): GameState {
        const formations: Record<string, FormationState> = {
            [CB_CORPS]: {
                id: CB_CORPS,
                faction: RBIH,
                name: CB_CORPS,
                kind: 'corps',
                status: 'active',
                created_turn: 0,
                assignment: null,
                personnel: 5000,
                corps_id: CB_CORPS,
            } as unknown as FormationState,
        };
        // Enemy-held OSIDs in the Counter's municipalities so an override has live targets.
        const political_controllers: Record<string, FactionId> = {
            'op:maglaj:maglaj_2': 'RS',
            'op:tesanj:tesanj_2': 'RS',
        };
        return {
            meta: { turn: CB_TURN, decision_mode: opts.mode } as GameState['meta'],
            military: {
                formations,
                corps_command: {
                    [CB_CORPS]: { active_operations: [], last_completed_operation_turn: opts.lastOpTurn },
                },
            } as unknown as GameState['military'],
            political: {
                political_controllers,
                control_events: [],
            } as unknown as GameState['political'],
        } as unknown as GameState;
    }

    function hasFullOverride(state: GameState): boolean {
        return generateArmyHQOverrides(state, RBIH).some(
            o => o.corps_id === CB_CORPS && o.type === 'offensive',
        );
    }

    it('emergent: quiet static-150 (effective 120, boost 0.80) stays gated at idle = 3', () => {
        // idle distance = CB_TURN - lastOpTurn = 20 - 17 = 3 (< flat 6). Effective weight is
        // exactly 120 but boost ≤ 1.0 → NOT urgent → flat 6-turn wall → no early launch.
        const state = makeQuietCbState({ mode: 'emergent', lastOpTurn: 17 });
        expect(hasFullOverride(state)).toBe(false);
    });

    it('emergent: the same quiet op still launches once idle reaches the flat 6', () => {
        // idle distance = 20 - 14 = 6 ≥ 6 → launches via the normal wall. Confirms the gate
        // blocks only the EARLY (relaxed) launch, not the priority itself.
        const state = makeQuietCbState({ mode: 'emergent', lastOpTurn: 14 });
        expect(hasFullOverride(state)).toBe(true);
    });

    it('historical: byte-identical — quiet static-150 stays gated at idle = 3', () => {
        const state = makeQuietCbState({ mode: 'historical', lastOpTurn: 17 });
        expect(hasFullOverride(state)).toBe(false);
    });
});
