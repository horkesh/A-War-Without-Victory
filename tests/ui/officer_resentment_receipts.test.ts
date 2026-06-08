/**
 * Officer-Resentment Receipt read-model test suite.
 *
 * Proves the force-op HUMAN-COST projection of `buildOfficerResentmentReceipts`:
 *   - A CO with override/cowed substrate (last_override_turn set) AND a
 *     force-launched op he commanded yields a receipt with the right fields +
 *     the newly-cowed signal.
 *   - A clean CO (no override substrate) yields no receipt.
 *   - #125: a CO overridden ONLY via order-interpretation (override substrate set
 *     but NO force-launched op he commanded) yields no receipt.
 *   - #282: a force-overridden CO later RELIEVED (assigned_corps_id → null) STILL
 *     yields a receipt keyed to the corps recorded on the force-launched op he
 *     commanded; an officer with no force-launched op still yields none.
 *   - `officerResentmentReceiptsRealizedOnTurn` filters by override turn.
 *   - Bot/historical (no overrides) → [].
 *
 * Also covers determinism (override turn then id) and defensive empties.
 */

import { describe, it, expect } from 'vitest';
import {
    buildOfficerResentmentReceipts,
    officerResentmentReceiptsRealizedOnTurn,
} from '../../src/ui/map/data/officerResentmentReceipts.js';
import type { GameState } from '../../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../src/state/officer_types.js';

/** Build a minimal NamedOfficerState; `override` toggles the player-override tags. */
function buildOfficerState(
    id: string,
    opts: {
        override?: boolean;
        overrideTurn?: number;
        overrideCount?: number;
        cowedUntilTurn?: number;
        corpsId?: string | null;
    } = {},
): NamedOfficerState {
    const os: NamedOfficerState = {
        officer_id: id,
        status: 'active',
        assigned_corps_id: opts.corpsId === undefined ? '1_corps' : opts.corpsId,
        turns_in_command: 5,
        battles: 3,
        victories: 1,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
    };
    if (opts.override) {
        os.last_override_turn = opts.overrideTurn ?? 10;
        os.override_count = opts.overrideCount ?? 1;
        if (opts.cowedUntilTurn !== undefined) os.cowed_until_turn = opts.cowedUntilTurn;
    }
    return os;
}

/** Build a minimal NamedOfficer (static data) carrying just a display name. */
function buildOfficerData(id: string, name: string): NamedOfficer {
    return {
        id,
        name,
        faction: 'RBiH',
        rank: 'corps_commander',
        competence: 3,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: true,
        improvement_rate: 0.05,
        pool_tier: 'starter',
    };
}

/**
 * Build a minimal GameState. `forceLaunchCorps` lists corps IDs that have a
 * force-launched operation in `operation_history` — the read-side discriminator
 * (only force-LAUNCH overrides emit such an op; order-interpretation overrides do
 * not). Each synthetic AAR carries the `commander_officer_id` of the overridden
 * officer whose corps matches — mirroring the real engine, where the AAR records
 * the corps AND the officer it was force-launched under (#125/#282). Defaults to
 * every overridden officer's corps so the genuine-force-op cases read naturally;
 * pass `[]` to model an order-interpretation-only override (no force-launched op).
 */
function buildState(
    officers: Record<string, NamedOfficerState>,
    officerData: NamedOfficer[],
    forceLaunchCorps?: string[],
): GameState {
    // Each (corps, commander) pair that gets a synthetic force-launched AAR.
    const opSpecs: { corpsId: string; officerId: string | undefined }[] = [];

    if (forceLaunchCorps !== undefined) {
        // Explicit corps list: stamp each with the first overridden officer whose
        // current corps matches (mirrors the AAR's recorded commander).
        for (const corpsId of forceLaunchCorps) {
            const officerId = Object.entries(officers).find(
                ([, os]) => os.last_override_turn !== undefined && os.assigned_corps_id === corpsId,
            )?.[0];
            opSpecs.push({ corpsId, officerId });
        }
    } else {
        // Default: one force-launched op per overridden officer, keyed to his corps
        // and his id — exactly what the engine records at force-launch.
        for (const [officerId, os] of Object.entries(officers)) {
            if (os.last_override_turn !== undefined && os.assigned_corps_id) {
                opSpecs.push({ corpsId: os.assigned_corps_id, officerId });
            }
        }
    }

    const operation_history = opSpecs.map((spec, i) => ({
        operation_id: `op_${spec.corpsId}_${i}`,
        operation_name: `Forced Op ${i}`,
        corps_id: spec.corpsId,
        commander_officer_id: spec.officerId,
        force_launched: true,
        ended_turn: 1,
    }));

    return {
        military: { named_officers: officers, named_officer_data: officerData },
        operation_history,
    } as unknown as GameState;
}

describe('buildOfficerResentmentReceipts', () => {
    it('returns [] defensively when state or officer map is absent', () => {
        expect(buildOfficerResentmentReceipts(undefined)).toEqual([]);
        expect(buildOfficerResentmentReceipts(null)).toEqual([]);
        expect(buildOfficerResentmentReceipts({} as unknown as GameState)).toEqual([]);
        expect(
            buildOfficerResentmentReceipts({ military: {} } as unknown as GameState),
        ).toEqual([]);
    });

    it('maps an overridden CO to a receipt with the right fields', () => {
        const state = buildState(
            { halilovic: buildOfficerState('halilovic', { override: true, overrideTurn: 17, overrideCount: 1 }) },
            [buildOfficerData('halilovic', 'Gen. Halilović')],
        );
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts).toHaveLength(1);
        const r = receipts[0];
        expect(r.id).toBe('halilovic');
        expect(r.officerName).toBe('Gen. Halilović');
        expect(r.corpsId).toBe('1_corps');
        expect(r.overrideTurn).toBe(17);
        expect(r.overrideCount).toBe(1);
        expect(r.newlyCowed).toBe(false);
        expect(r.cowedUntilTurn).toBe(null);
    });

    it('flags newlyCowed when the cow window opens past the override turn', () => {
        const state = buildState(
            // recordPresidentialOverride sets cowed_until_turn = turn + DURATION and
            // resets override_count to 0 on the cowed turn.
            { delic: buildOfficerState('delic', { override: true, overrideTurn: 20, overrideCount: 0, cowedUntilTurn: 28 }) },
            [buildOfficerData('delic', 'Gen. Delić')],
        );
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts).toHaveLength(1);
        expect(receipts[0].newlyCowed).toBe(true);
        expect(receipts[0].cowedUntilTurn).toBe(28);
    });

    it('yields NO receipt for a clean CO (no override substrate)', () => {
        const state = buildState(
            { clean: buildOfficerState('clean', { override: false }) },
            [buildOfficerData('clean', 'Gen. Clean')],
        );
        expect(buildOfficerResentmentReceipts(state)).toEqual([]);
    });

    it('#125: yields NO receipt for an order-interpretation-only override (no force-launched op)', () => {
        // The CO carries the SAME override substrate (last_override_turn set) that a
        // force-launch would produce, but his corps has NO force-launched operation —
        // i.e. the override came from overrideInterpretation, not a forced op. The
        // read-side discriminator must drop it.
        const state = buildState(
            { kadic: buildOfficerState('kadic', { override: true, overrideTurn: 14, corpsId: '2_corps' }) },
            [buildOfficerData('kadic', 'Gen. Kadić')],
            [], // no corps has a force-launched op
        );
        expect(buildOfficerResentmentReceipts(state)).toEqual([]);
    });

    it('#125: keeps the force-op CO and drops the order-interpretation CO when both overrode', () => {
        const state = buildState(
            {
                forced: buildOfficerState('forced', { override: true, overrideTurn: 9, corpsId: '1_corps' }),
                interp: buildOfficerState('interp', { override: true, overrideTurn: 9, corpsId: '3_corps' }),
            },
            [buildOfficerData('forced', 'Gen. Forced'), buildOfficerData('interp', 'Gen. Interp')],
            ['1_corps'], // only 1_corps force-launched
        );
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts.map((r) => r.id)).toEqual(['forced']);
    });

    it('#125: counts an ACTIVE force-launched op (not yet resolved into history)', () => {
        const state = {
            military: {
                named_officers: {
                    live: buildOfficerState('live', { override: true, overrideTurn: 6, corpsId: '4_corps' }),
                },
                named_officer_data: [buildOfficerData('live', 'Gen. Live')],
                corps_command: {
                    '4_corps': {
                        active_operations: [
                            { was_force_launched: true, commander_officer_id: 'live' },
                        ],
                    },
                },
            },
        } as unknown as GameState;
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts.map((r) => r.id)).toEqual(['live']);
    });

    it('#303: keys off the corps, NOT the op commander — receipt goes to the overridden CORPS CO, not the reserve op-leader', () => {
        // Models the REAL injectOpDirectives engine flow: recordPresidentialOverride
        // bumps the SEATED corps CO (getCorpsCommander → active, assigned to the corps),
        // while assignOperationCommander stamps op.commander_officer_id with a DIFFERENT
        // RESERVE officer (selectOperationCommander only picks status==='reserve'). The
        // overridden corps CO is therefore NOT the op's commander_officer_id. Keying off
        // commander_officer_id (the old bug) matched the override against the reserve
        // leader — who has no override substrate — and DROPPED the genuine corps-CO
        // receipt. Keying by corps keeps it.
        const state = {
            military: {
                named_officers: {
                    // Seated, OVERRIDDEN corps CO of 4_corps.
                    corps_co: buildOfficerState('corps_co', { override: true, overrideTurn: 6, corpsId: '4_corps' }),
                    // Reserve officer the op was actually launched under — NO override.
                    reserve_leader: buildOfficerState('reserve_leader', { override: false, corpsId: null }),
                },
                named_officer_data: [
                    buildOfficerData('corps_co', 'Gen. Corps-CO'),
                    buildOfficerData('reserve_leader', 'Gen. Reserve'),
                ],
                corps_command: {
                    '4_corps': {
                        active_operations: [
                            // commander_officer_id is the RESERVE leader, not the corps CO.
                            { was_force_launched: true, commander_officer_id: 'reserve_leader' },
                        ],
                    },
                },
            },
        } as unknown as GameState;
        const receipts = buildOfficerResentmentReceipts(state);
        // Exactly one receipt — for the overridden corps CO, keyed to his corps.
        expect(receipts).toHaveLength(1);
        expect(receipts[0].id).toBe('corps_co');
        expect(receipts[0].corpsId).toBe('4_corps');
    });

    it('#303: resolved-AAR variant — overridden corps CO keeps a receipt though the AAR names the reserve op-leader', () => {
        // Same #303 mismatch, but the force-launched op has resolved into an AAR whose
        // commander_officer_id is the reserve leader. The corps_id on the AAR is the
        // durable join key back to the overridden corps CO.
        const state = {
            military: {
                named_officers: {
                    corps_co: buildOfficerState('corps_co', { override: true, overrideTurn: 9, corpsId: '5_corps' }),
                    reserve_leader: buildOfficerState('reserve_leader', { override: false, corpsId: null }),
                },
                named_officer_data: [
                    buildOfficerData('corps_co', 'Gen. Corps-CO'),
                    buildOfficerData('reserve_leader', 'Gen. Reserve'),
                ],
            },
            operation_history: [
                {
                    operation_id: 'op_5_corps_forced',
                    operation_name: 'Forced Op',
                    corps_id: '5_corps',
                    commander_officer_id: 'reserve_leader', // reserve leader, NOT the CO
                    force_launched: true,
                    ended_turn: 10,
                },
            ],
        } as unknown as GameState;
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts.map((r) => r.id)).toEqual(['corps_co']);
        expect(receipts[0].corpsId).toBe('5_corps');
    });

    it('#282: keeps a RELIEVED force-overridden CO, keyed to the op\'s historical corps', () => {
        // The CO was force-overridden while commanding 2_corps, then RELIEVED:
        // relieveOfficer cleared assigned_corps_id → null and flipped status to
        // retired, but the override substrate (last_override_turn) persists and the
        // resolved AAR still records corps_id + the commander_officer_id it ran
        // under. The receipt must survive and key the corps off the op history.
        const relieved = buildOfficerState('siber', {
            override: true,
            overrideTurn: 22,
            overrideCount: 1,
            corpsId: null, // relieved: assigned_corps_id cleared
        });
        relieved.status = 'retired';
        const state = {
            military: {
                named_officers: { siber: relieved },
                named_officer_data: [buildOfficerData('siber', 'Gen. Šiber')],
            },
            operation_history: [
                {
                    operation_id: 'op_2_corps_relieved',
                    operation_name: 'Forced Op (pre-relief)',
                    corps_id: '2_corps',
                    commander_officer_id: 'siber',
                    force_launched: true,
                    ended_turn: 21,
                },
            ],
        } as unknown as GameState;

        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts).toHaveLength(1);
        const r = receipts[0];
        expect(r.id).toBe('siber');
        expect(r.officerName).toBe('Gen. Šiber');
        // Corps recovered from the force-launched op, NOT the now-null current corps.
        expect(r.corpsId).toBe('2_corps');
        expect(r.overrideTurn).toBe(22);
    });

    it('#282: an officer with NO force-launched op still yields no receipt (relieved or not)', () => {
        // Override substrate set + relieved, but the officer never commanded a
        // force-launched op (order-interpretation-only). Must NOT resurface.
        const relieved = buildOfficerState('no_op', {
            override: true,
            overrideTurn: 13,
            corpsId: null,
        });
        relieved.status = 'retired';
        const state = {
            military: {
                named_officers: { no_op: relieved },
                named_officer_data: [buildOfficerData('no_op', 'Gen. NoOp')],
            },
            operation_history: [],
        } as unknown as GameState;
        expect(buildOfficerResentmentReceipts(state)).toEqual([]);
    });

    it('returns [] for bot/historical runs (no overrides anywhere)', () => {
        const state = buildState(
            {
                a: buildOfficerState('a', { override: false }),
                b: buildOfficerState('b', { override: false }),
            },
            [buildOfficerData('a', 'Gen. A'), buildOfficerData('b', 'Gen. B')],
        );
        expect(buildOfficerResentmentReceipts(state)).toEqual([]);
    });

    it('falls back to a generic label when officer static data is absent', () => {
        const state = buildState(
            { ghost: buildOfficerState('ghost', { override: true }) },
            [],
        );
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts).toHaveLength(1);
        expect(receipts[0].officerName).toBe('the corps commander');
    });

    it('sorts deterministically by override turn ascending then id', () => {
        const state = buildState(
            {
                z: buildOfficerState('z', { override: true, overrideTurn: 20 }),
                a: buildOfficerState('a', { override: true, overrideTurn: 12 }),
                m: buildOfficerState('m', { override: true, overrideTurn: 12 }),
            },
            [buildOfficerData('z', 'Z'), buildOfficerData('a', 'A'), buildOfficerData('m', 'M')],
        );
        const receipts = buildOfficerResentmentReceipts(state);
        expect(receipts.map((r) => r.id)).toEqual(['a', 'm', 'z']);
    });

    it('officerResentmentReceiptsRealizedOnTurn filters to overrides on the given turn', () => {
        const state = buildState(
            {
                op_a: buildOfficerState('op_a', { override: true, overrideTurn: 5 }),
                op_b: buildOfficerState('op_b', { override: true, overrideTurn: 8 }),
            },
            [buildOfficerData('op_a', 'A'), buildOfficerData('op_b', 'B')],
        );
        const receipts = buildOfficerResentmentReceipts(state);
        expect(officerResentmentReceiptsRealizedOnTurn(receipts, 5).map((r) => r.id)).toEqual(['op_a']);
        expect(officerResentmentReceiptsRealizedOnTurn(receipts, 8).map((r) => r.id)).toEqual(['op_b']);
        expect(officerResentmentReceiptsRealizedOnTurn(receipts, 99)).toEqual([]);
    });
});
