/**
 * Officer-Resentment Receipt read-model test suite.
 *
 * Proves the force-op HUMAN-COST projection of `buildOfficerResentmentReceipts`:
 *   - A CO with override/cowed substrate (last_override_turn set) yields a receipt
 *     with the right fields + the newly-cowed signal.
 *   - A clean CO (no override substrate) yields no receipt.
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

function buildState(
    officers: Record<string, NamedOfficerState>,
    officerData: NamedOfficer[],
): GameState {
    return {
        military: { named_officers: officers, named_officer_data: officerData },
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
