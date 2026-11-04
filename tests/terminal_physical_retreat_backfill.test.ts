import { describe, expect, it } from 'vitest';

import type {
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { backfillFormationLocationOsid } from '../src/data/operational_data.js';
import { forceRetreatWithPenalties } from '../src/sim/combat/attack_retreat_displacement.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';

const A = 'op:test:terminal_origin';
const SID_BANOVICI = 'S100013';
const SID_SEONA = 'S100030';
const OSID_BANOVICI = 'op:banovici:banovici_2';
const OSID_SEONA = 'op:banovici:seona';

const canonicalToOperational = {
    [SID_BANOVICI]: OSID_BANOVICI,
    [SID_SEONA]: OSID_SEONA,
};

const reverseMap: OperationalToCanonicalReverseMap = new Map([
    [A, [A]],
    [OSID_BANOVICI, [SID_BANOVICI]],
    [OSID_SEONA, [SID_SEONA]],
]);

function makeFormation(
    id: string,
    faction: FactionId,
    locationOsid: string | undefined,
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id,
        name: id,
        faction,
        kind: 'brigade',
        status: 'active',
        location_osid: locationOsid,
        personnel: 800,
        cohesion: 90,
        morale: 90,
        ...overrides,
    } as FormationState;
}

function makeState(formations: FormationState[]): GameState {
    return {
        meta: {
            turn: 181,
            phase: 'war',
            scenario_start_date: { year: 1995, month: 9, day: 4 },
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations: Object.fromEntries(formations.map((formation) => [formation.id, formation])),
            brigade_attack_orders: {},
            brigade_movement_orders: {},
            casualty_ledger: initializeCasualtyLedger(['RBiH', 'RS']),
        },
        political: {
            political_controllers: { [A]: 'RS' },
            control_events: [],
        },
        displacement: {},
    } as unknown as GameState;
}

function makeTerminalRetreatState(
    overrides: Partial<FormationState> = {},
): {
    state: GameState;
    terminal: FormationState;
} {
    const terminal = makeFormation('rs_terminal', 'RS', A, {
        hq_sid: SID_BANOVICI,
        ...overrides,
    });
    const state = makeState([terminal]);

    forceRetreatWithPenalties(state, terminal, reverseMap, A, {
        adjacency: new Map([[A, []]]),
        friendlyOsids: new Set(),
    });

    return { state, terminal };
}

describe('terminal physical retreat survives serialization and next-turn backfill', () => {
    it('keeps the inactive formation locationless and preserves historical fields while active and legacy formations backfill', () => {
        const { state, terminal } = makeTerminalRetreatState({
            stranded_status: 'collapsed',
            stranded_since_turn: 170,
        });
        state.military.formations = {
            ...state.military.formations,
            inactive_located: makeFormation('inactive_located', 'RS', 'op:existing', {
                status: 'inactive',
                hq_sid: SID_BANOVICI,
            }),
        };

        expect(terminal.status).toBe('inactive');
        expect(terminal.location_osid).toBeUndefined();
        expect(terminal.destruction_turn).toBe(181);

        const roundTripped = deserializeState(serializeState(state));

        const serializedTerminal = roundTripped.military.formations?.rs_terminal;
        expect(serializedTerminal?.status).toBe('inactive');
        expect(serializedTerminal?.location_osid).toBeUndefined();
        expect(serializedTerminal?.destruction_turn).toBe(181);
        expect(serializedTerminal?.stranded_status).toBe('collapsed');
        expect(serializedTerminal?.stranded_since_turn).toBe(170);

        // Next turn's location-osid backfill must not resurrect a location for a
        // formation that physically dispersed. Active and status-missing legacy
        // records keep their existing backfill behavior.
        roundTripped.military.formations = {
            ...roundTripped.military.formations,
            active_backfill: makeFormation('active_backfill', 'RBiH', undefined, {
                status: 'active',
                hq_sid: SID_BANOVICI,
            }),
            legacy_missing_status: makeFormation('legacy_missing_status', 'RBiH', undefined, {
                status: undefined as unknown as 'active',
                hq_sid: SID_SEONA,
            }),
        };
        backfillFormationLocationOsid(roundTripped, canonicalToOperational);

        const afterBackfillTerminal = roundTripped.military.formations?.rs_terminal;
        expect(afterBackfillTerminal?.status).toBe('inactive');
        expect(afterBackfillTerminal?.location_osid).toBeUndefined();
        expect(afterBackfillTerminal?.destruction_turn).toBe(181);
        expect(afterBackfillTerminal?.stranded_status).toBe('collapsed');
        expect(afterBackfillTerminal?.stranded_since_turn).toBe(170);

        expect(roundTripped.military.formations?.active_backfill?.location_osid).toBe(OSID_BANOVICI);
        expect(roundTripped.military.formations?.legacy_missing_status?.location_osid).toBe(OSID_SEONA);
        expect(roundTripped.military.formations?.inactive_located?.location_osid).toBe('op:existing');
    });

    it('preserves historical holding and last-reachable history through the same terminal retreat, serialization and backfill boundary', () => {
        const { state, terminal } = makeTerminalRetreatState({
            stranded_status: 'holding',
            stranded_since_turn: 168,
            last_reachable_turn: 175,
        });

        expect(terminal.status).toBe('inactive');
        expect(terminal.location_osid).toBeUndefined();
        expect(terminal.destruction_turn).toBe(181);

        const roundTripped = deserializeState(serializeState(state));
        const serializedTerminal = roundTripped.military.formations?.rs_terminal;
        expect(serializedTerminal?.status).toBe('inactive');
        expect(serializedTerminal?.location_osid).toBeUndefined();
        expect(serializedTerminal?.destruction_turn).toBe(181);
        expect(serializedTerminal?.stranded_status).toBe('holding');
        expect(serializedTerminal?.stranded_since_turn).toBe(168);
        expect(serializedTerminal?.last_reachable_turn).toBe(175);

        backfillFormationLocationOsid(roundTripped, canonicalToOperational);

        const afterBackfillTerminal = roundTripped.military.formations?.rs_terminal;
        expect(afterBackfillTerminal?.status).toBe('inactive');
        expect(afterBackfillTerminal?.location_osid).toBeUndefined();
        expect(afterBackfillTerminal?.destruction_turn).toBe(181);
        expect(afterBackfillTerminal?.stranded_status).toBe('holding');
        expect(afterBackfillTerminal?.stranded_since_turn).toBe(168);
        expect(afterBackfillTerminal?.last_reachable_turn).toBe(175);
    });
});
