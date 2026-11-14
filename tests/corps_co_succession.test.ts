/**
 * Corps commander schedule (command-loop proposal §5E, owner decision 3).
 *
 * The mechanism ships with an EMPTY schedule: the first block proves it is inert. The
 * rest drive it with synthetic schedules: scheduled holders fill vacancies before the
 * pool, take over from a fallback holder when their tenure starts, never displace the
 * President's appointee, become a matter (not a swap) for a manually controlled player,
 * historical deaths and reliefs are data, and officers who survived the war never
 * accrue the casualty-exposure clock.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import { processOfficerSuccession } from '../src/sim/combat/officer_system.js';
import {
    CorpsCoRosterDataError,
    EMPTY_CORPS_CO_ROSTER,
    hasCorpsCoSchedule,
    officerSurvivedWar,
    scheduledTenure,
    validateCorpsCoRoster,
    type CorpsCoRoster,
} from '../src/sim/combat/corps_co_roster.js';
import { CANONICAL_CORPS_CO_ROSTER } from '../src/sim/combat/corps_co_roster_data.js';
import { loadCorpsCoRoster } from '../src/sim/combat/corps_co_roster_loader.js';

function officer(id: string, extra: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id, name: id, faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 3,
        political_reliability: 3, available_from_turn: 0, origin: 'jna', casualty_vulnerability: 0.1, can_improve: false,
        improvement_rate: 0, pool_tier: 'tier_a', ...extra,
    } as NamedOfficer;
}

function os(id: string, extra: Partial<NamedOfficerState> = {}): NamedOfficerState {
    return {
        officer_id: id, status: 'reserve', assigned_corps_id: null, turns_in_command: 0, battles: 0, victories: 0,
        effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false, ...extra,
    };
}

function corpsFormation(id: string, faction: FactionId = 'RBiH'): FormationState {
    return { id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'corps_asset', personnel: 0 } as FormationState;
}

function state(turn: number, data: NamedOfficer[], officers: Record<string, NamedOfficerState>, corps: string[], meta: Record<string, unknown> = {}): GameState {
    return {
        meta: { turn, phase: 'war', scenario_id: 'test', ...meta },
        factions: [],
        military: {
            formations: Object.fromEntries(corps.map((c) => [c, corpsFormation(c)])),
            corps_command: Object.fromEntries(corps.map((c) => [c, { active_operations: [] }])),
            named_officer_data: data,
            named_officers: officers,
        },
        political: { settlements: {}, political_controllers: {} },
    } as unknown as GameState;
}

function roster(rosters: CorpsCoRoster['rosters']): CorpsCoRoster {
    return validateCorpsCoRoster({ schema_version: 1, rosters });
}

const tenure = (officer_id: string, tenure_start: number, tenure_end: number | null, historical_fate: 'survived' | 'killed' | 'relieved' = 'survived') =>
    ({ officer_id, tenure_start, tenure_end, historical_fate, source: 'test' });

describe('shipped schedule', () => {
    it('is empty and validates against the real officer and corps ids', () => {
        const officersJson = JSON.parse(readFileSync('data/scenarios/officers/apr1992_officers.json', 'utf8'));
        const officerRows = (officersJson.officers ?? officersJson) as Array<{ id: string }>;
        const officerIds = new Set<string>(officerRows.map((o) => o.id));
        const corpsJson = JSON.parse(readFileSync('data/source/oob_corps.json', 'utf8'));
        const corpsIds = new Set(((corpsJson.corps ?? corpsJson) as Array<{ id: string }>).map((c) => c.id));
        const loaded = loadCorpsCoRoster(undefined, { officerIds, corpsIds });
        expect(loaded).not.toBeNull();
        expect(hasCorpsCoSchedule(loaded)).toBe(false);
        expect(hasCorpsCoSchedule(CANONICAL_CORPS_CO_ROSTER)).toBe(false);
    });
});

describe('inertness with an empty schedule', () => {
    it('produces exactly the pre-schedule succession (death clock, vacancy fill, generic acting commander)', () => {
        const build = () => state(120, [
            officer('a', { casualty_vulnerability: 0.25, home_corps_id: 'c1' }),
            officer('b', { home_corps_id: 'c1' }),
            officer('c', { home_corps_id: 'c2' }),
        ], {
            a: os('a', { status: 'active', assigned_corps_id: 'c1', turns_in_command: 50 }),
            b: os('b'),
            c: os('c'),
        }, ['c1', 'c2', 'c3']);
        const withDefault = build();
        const withEmpty = build();
        const r1 = processOfficerSuccession(withDefault, new Set(['c1']));
        const r2 = processOfficerSuccession(withEmpty, new Set(['c1']), EMPTY_CORPS_CO_ROSTER);
        expect(JSON.stringify(withEmpty)).toBe(JSON.stringify(withDefault));
        expect(r2).toEqual(r1);
        expect(r1.casualties).toEqual(['a']); // the clock still runs without a schedule
    });
});

describe('validation', () => {
    it('rejects malformed schedules', () => {
        expect(() => validateCorpsCoRoster({ schema_version: 1, rosters: [] })).toThrow(CorpsCoRosterDataError);
        expect(() => roster({ c1: { schedule: [tenure('a', 0, 50), tenure('b', 40, null)] } })).toThrow(/overlap/);
        expect(() => roster({ c1: { schedule: [tenure('a', 0, null, 'killed')] } })).toThrow(/killed/);
        expect(() => roster({ c1: { schedule: [{ ...tenure('a', 0, null), source: ' ' }] } })).toThrow(/source/);
        expect(() => roster({ c1: { schedule: [tenure('a', 0, 10, 'killed')] }, c2: { schedule: [tenure('a', 20, null)] } })).toThrow(/both/);
        expect(() => validateCorpsCoRoster({ schema_version: 1, rosters: { c1: { schedule: [tenure('zz', 0, null)] } } }, { officerIds: new Set(['a']) })).toThrow(/unknown officer/);
        expect(() => validateCorpsCoRoster({ schema_version: 1, rosters: { cX: { schedule: [] } } }, { corpsIds: new Set(['c1']) })).toThrow(/unknown corps/);
    });

    it('sorts tenures and answers lookups', () => {
        const r = roster({ c1: { schedule: [tenure('b', 82, null), tenure('a', 0, 82)] } });
        expect(r.rosters.c1!.schedule.map((t) => t.officer_id)).toEqual(['a', 'b']);
        expect(scheduledTenure(r, 'c1', 81)?.officer_id).toBe('a');
        expect(scheduledTenure(r, 'c1', 82)?.officer_id).toBe('b');
        expect(officerSurvivedWar(r, 'b')).toBe(true);
    });
});

describe('survivors leave the death clock', () => {
    it('an officer the schedule records as surviving the war is not killed by tenure exposure', () => {
        const s = state(120, [officer('dud', { casualty_vulnerability: 0.1, home_corps_id: 'c5' })], {
            dud: os('dud', { status: 'active', assigned_corps_id: 'c5', turns_in_command: 100 }),
        }, ['c5']);
        const r = processOfficerSuccession(s, new Set(['c5']), roster({ c5: { schedule: [tenure('dud', 82, null)] } }));
        expect(r.casualties).toEqual([]);
        expect(s.military.named_officers!.dud!.status).toBe('active');
    });

    it('a scheduled death is data: the officer dies at tenure_end, and the schedule names the successor', () => {
        const s = state(90, [officer('x', { home_corps_id: 'c1' }), officer('y', { home_corps_id: 'c9' }), officer('z', { home_corps_id: 'c1' })], {
            x: os('x', { status: 'active', assigned_corps_id: 'c1', turns_in_command: 5 }),
            y: os('y'),
            z: os('z'),
        }, ['c1']);
        const r = processOfficerSuccession(s, new Set(), roster({ c1: { schedule: [tenure('x', 0, 90, 'killed'), tenure('y', 90, null)] } }));
        expect(r.casualties).toEqual(['x']);
        expect(s.military.named_officers!.x!.status).toBe('killed');
        // y is not home to c1 and would lose the pool sort to z: the schedule picks him anyway.
        expect(s.military.named_officers!.y).toMatchObject({ status: 'active', assigned_corps_id: 'c1' });
        expect(s.military.named_officers!.z!.status).toBe('reserve');
    });
});

describe('scheduled handover', () => {
    const data = () => [
        officer('fallback', { home_corps_id: 'c3' }),
        officer('hadz', { home_corps_id: 'c3', available_from_turn: 22 }),
        officer('other', { home_corps_id: 'c4' }),
    ];

    it('when a scheduled tenure starts, the fallback holder steps aside to the reserve', () => {
        const s = state(22, data(), {
            fallback: os('fallback', { status: 'active', assigned_corps_id: 'c3', turns_in_command: 21 }),
            hadz: os('hadz'),
            other: os('other'),
        }, ['c3']);
        const r = processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 22, 82)] } }));
        expect(s.military.named_officers!.hadz).toMatchObject({ status: 'active', assigned_corps_id: 'c3', turns_in_command: 0, effective_competence_penalty: 0 });
        expect(s.military.named_officers!.fallback).toMatchObject({ status: 'reserve', assigned_corps_id: null });
        expect(r.replacements).toContainEqual({ corps_id: 'c3', old_officer: 'fallback', new_officer: 'hadz' });
    });

    it('a holder moving from another corps leaves it refilled the same turn', () => {
        const s = state(82, data(), {
            fallback: os('fallback'),
            hadz: os('hadz', { status: 'active', assigned_corps_id: 'c4', turns_in_command: 10 }),
            other: os('other'),
        }, ['c3', 'c4']);
        processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 82, null)] } }));
        expect(s.military.named_officers!.hadz).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
        expect(s.military.named_officers!.other).toMatchObject({ status: 'active', assigned_corps_id: 'c4' });
    });

    it('never rotates out the President\'s appointee', () => {
        const s = state(22, data(), {
            fallback: os('fallback', { status: 'active', assigned_corps_id: 'c3' }),
            hadz: os('hadz'),
            other: os('other'),
        }, ['c3']);
        (s.military.corps_command as any).c3.co_replacement_record = [{ relieved_officer_id: 'x', replacement_officer_id: 'fallback', turn: 10 }];
        processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 22, 82)] } }));
        expect(s.military.named_officers!.fallback).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
        expect(s.military.named_officers!.hadz!.status).toBe('reserve');
    });

    it('a manually controlled player gets a replacement matter, not a swap', () => {
        const s = state(22, data(), {
            fallback: os('fallback', { status: 'active', assigned_corps_id: 'c3' }),
            hadz: os('hadz'),
            other: os('other'),
        }, ['c3'], { player_faction: 'RBiH', autonomy_level: 0 });
        processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 22, 82)] } }));
        expect(s.military.named_officers!.fallback).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
        expect(s.military.pending_officer_events).toContainEqual(expect.objectContaining({
            type: 'replacement_suggested', corps_id: 'c3', current_commander_id: 'fallback', officer_id: 'hadz',
        }));
        // Deduplicated on the next turn.
        s.meta.turn = 23;
        processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 22, 82)] } }));
        expect(s.military.pending_officer_events!.filter((e) => e.type === 'replacement_suggested')).toHaveLength(1);
    });

    it('a generic acting commander retires when the scheduled holder takes over', () => {
        const s = state(22, [...data(), officer('generic_RBiH_c3_t5', { home_corps_id: 'c3', pool_tier: 'tier_c' })], {
            generic_RBiH_c3_t5: os('generic_RBiH_c3_t5', { status: 'active', assigned_corps_id: 'c3', acting_commander: true }),
            fallback: os('fallback'),
            hadz: os('hadz'),
            other: os('other'),
        }, ['c3']);
        processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 22, 82)] } }));
        expect(s.military.named_officers!.generic_RBiH_c3_t5!.status).toBe('retired');
        expect(s.military.named_officers!.hadz).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
    });

    it('a scheduled holder not yet in play leaves the fallback in command', () => {
        const s = state(22, data().map((o) => (o.id === 'hadz' ? { ...o, available_from_turn: 30 } : o)), {
            fallback: os('fallback', { status: 'active', assigned_corps_id: 'c3' }),
            other: os('other'),
        }, ['c3']);
        processOfficerSuccession(s, new Set(), roster({ c3: { schedule: [tenure('hadz', 22, 82)] } }));
        expect(s.military.named_officers!.fallback).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
    });
});

describe('scheduled relief', () => {
    it('retires a relieved officer with no later tenure, returns one with a later tenure to the reserve', () => {
        const s = state(82, [officer('p', { home_corps_id: 'c4' }), officer('q', { home_corps_id: 'c5' }), officer('r', { home_corps_id: 'c4' })], {
            p: os('p', { status: 'active', assigned_corps_id: 'c4' }),
            q: os('q', { status: 'active', assigned_corps_id: 'c5' }),
            r: os('r'),
        }, ['c4', 'c5']);
        const sched = roster({
            c4: { schedule: [tenure('p', 0, 82, 'relieved'), tenure('q', 92, null)] },
            c5: { schedule: [tenure('q', 0, 82, 'relieved')] },
        });
        processOfficerSuccession(s, new Set(), sched);
        expect(s.military.named_officers!.p!.status).toBe('retired');
        expect(s.military.named_officers!.q!.status).not.toBe('retired'); // serves the 4th later
    });
});
