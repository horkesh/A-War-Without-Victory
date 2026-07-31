import { describe, expect, it } from 'vitest';

import type { FactionId, GameState } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import {
    relieveArmyCommander,
} from '../src/sim/combat/army_co_lifecycle.js';
import { loadArmyCoRoster } from '../src/sim/combat/army_co_roster_loader.js';
import { processOfficerSuccession } from '../src/sim/combat/officer_system.js';

function officer(overrides: Partial<NamedOfficer>): NamedOfficer {
    return {
        id: 'army_co',
        name: 'Army Commander',
        faction: 'RS',
        rank: 'army_commander',
        competence: 4,
        aggressiveness: 4,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'military',
        casualty_vulnerability: 0.05,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'starter',
        ...overrides,
    };
}

function officerState(overrides: Partial<NamedOfficerState>): NamedOfficerState {
    return {
        officer_id: 'army_co',
        status: 'active',
        assigned_corps_id: null,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
        ...overrides,
    };
}

function stateWith(
    turn: number,
    data: NamedOfficer[],
    states: Record<string, NamedOfficerState>,
    playerFaction: FactionId | null = null,
): GameState {
    return {
        meta: {
            turn,
            phase: 'war',
            player_faction: playerFaction,
        },
        political: { political_controllers: {} },
        military: {
            formations: {
                vrs_engaged_brigade: {
                    id: 'vrs_engaged_brigade',
                    name: 'Engaged Brigade',
                    faction: 'RS',
                    kind: 'brigade',
                    status: 'active',
                    corps_id: 'vrs_1kk',
                },
                rbih_engaged_brigade: {
                    id: 'rbih_engaged_brigade',
                    name: 'Engaged Brigade',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    corps_id: 'arbih_1st_corps',
                },
            },
            corps_command: {},
            named_officer_data: data,
            named_officers: states,
            pending_officer_events: [],
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
    } as unknown as GameState;
}

function vrsRosterData(extra: NamedOfficer[] = []): NamedOfficer[] {
    return [
        officer({
            id: 'vrs_mladic',
            name: 'Ratko Mladic',
            faction: 'RS',
            casualty_vulnerability: 0.05,
            is_historical_start: true,
        }),
        officer({
            id: 'vrs_krstic',
            name: 'Radislav Krstic',
            faction: 'RS',
            rank: 'corps_commander',
            available_from_turn: 170,
            pool_tier: 'tier_a',
        }),
        ...extra,
    ];
}

describe('Army commander emergent lifecycle', () => {
    it('keeps Mladic in command indefinitely without an authored end, combat death, or relief', () => {
        const data = vrsRosterData();
        const state = stateWith(220, data, {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic', turns_in_command: 219 }),
            vrs_krstic: officerState({ officer_id: 'vrs_krstic', status: 'reserve' }),
        });

        const report = processOfficerSuccession(state, new Set());

        expect(state.military.named_officers!.vrs_mladic!.status).toBe('active');
        expect(state.military.named_officers!.vrs_mladic!.turns_in_command).toBe(220);
        expect(report.army_replacements).toEqual([]);
    });

    it('kills an army commander only after eligible exposure and combat by that faction', () => {
        const data = vrsRosterData();
        const state = stateWith(200, data, {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic', turns_in_command: 200 }),
            vrs_krstic: officerState({ officer_id: 'vrs_krstic', status: 'reserve' }),
        });

        const report = processOfficerSuccession(state, new Set(['vrs_1kk']));

        expect(state.military.named_officers!.vrs_mladic!.status).toBe('killed');
        expect(report.casualties).toContain('vrs_mladic');
        expect(report.army_replacements).toEqual([{
            faction: 'RS',
            old_officer: 'vrs_mladic',
            new_officer: 'vrs_krstic',
            cause: 'combat_death',
        }]);
        expect(data.find((entry) => entry.id === 'vrs_krstic')!.rank).toBe('army_commander');
        expect(state.military.named_officers!.vrs_krstic).toMatchObject({
            status: 'active',
            assigned_corps_id: null,
            acting_commander: false,
            turns_in_command: 0,
        });
    });

    it('does not expose an army commander when only another faction fought', () => {
        const data = vrsRosterData();
        const state = stateWith(200, data, {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic', turns_in_command: 200 }),
            vrs_krstic: officerState({ officer_id: 'vrs_krstic', status: 'reserve' }),
        });

        processOfficerSuccession(state, new Set(['arbih_1st_corps']));

        expect(state.military.named_officers!.vrs_mladic!.status).toBe('active');
    });

    it('relieves a serving army commander immediately through the explicit political path', () => {
        const data = vrsRosterData();
        const state = stateWith(30, data, {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic', turns_in_command: 30 }),
        }, 'RS');

        const change = relieveArmyCommander(state, 'RS', loadArmyCoRoster()!);

        expect(change).toEqual({
            faction: 'RS',
            old_officer: 'vrs_mladic',
            new_officer: 'generic_army_political_relief_RS_t30',
            cause: 'political_relief',
        });
        expect(state.military.named_officers!.vrs_mladic!.status).toBe('retired');
        expect(state.military.named_officers!.vrs_krstic).toBeUndefined();
        expect(state.military.named_officers!.generic_army_political_relief_RS_t30).toMatchObject({
            status: 'active',
            acting_commander: true,
        });
        expect(state.military.named_officers!.vrs_mladic!.recent_overrides).toContainEqual({
            turn: 30,
            resolution: 'relieve',
        });
        expect(state.military.pending_officer_events).toContainEqual(expect.objectContaining({
            type: 'officer_relieved',
            officer_id: 'vrs_mladic',
            faction: 'RS',
        }));
    });

    it('auto-relieves a bot army commander after three overrides in the rolling 12-turn window', () => {
        const data = vrsRosterData();
        const state = stateWith(30, data, {
            vrs_mladic: officerState({
                officer_id: 'vrs_mladic',
                recent_overrides: [
                    { turn: 18, resolution: 'override' },
                    { turn: 25, resolution: 'override' },
                    { turn: 30, resolution: 'override' },
                ],
            }),
        });

        const report = processOfficerSuccession(state, new Set());

        expect(report.army_replacements).toEqual([{
            faction: 'RS',
            old_officer: 'vrs_mladic',
            new_officer: 'generic_army_political_relief_RS_t30',
            cause: 'political_relief',
        }]);
    });

    it('ignores stale overrides and never auto-relieves the player faction', () => {
        const entries: NamedOfficerState['recent_overrides'] = [
            { turn: 17, resolution: 'override' },
            { turn: 25, resolution: 'override' },
            { turn: 30, resolution: 'override' },
        ];
        const botState = stateWith(30, vrsRosterData(), {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic', recent_overrides: entries }),
        });
        const playerState = stateWith(30, vrsRosterData(), {
            vrs_mladic: officerState({
                officer_id: 'vrs_mladic',
                recent_overrides: [
                    { turn: 18, resolution: 'override' },
                    { turn: 25, resolution: 'override' },
                    { turn: 30, resolution: 'override' },
                ],
            }),
        }, 'RS');

        processOfficerSuccession(botState, new Set());
        processOfficerSuccession(playerState, new Set());

        expect(botState.military.named_officers!.vrs_mladic!.status).toBe('active');
        expect(playerState.military.named_officers!.vrs_mladic!.status).toBe('active');
    });

    it('gives combat death precedence when death and relief become eligible together', () => {
        const data = vrsRosterData();
        const state = stateWith(200, data, {
            vrs_mladic: officerState({
                officer_id: 'vrs_mladic',
                turns_in_command: 200,
                recent_overrides: [
                    { turn: 188, resolution: 'override' },
                    { turn: 195, resolution: 'override' },
                    { turn: 200, resolution: 'override' },
                ],
            }),
        });

        const report = processOfficerSuccession(state, new Set(['vrs_1kk']));

        expect(report.army_replacements[0]!.cause).toBe('combat_death');
        expect(state.military.named_officers!.vrs_mladic!.status).toBe('killed');
    });

    it('skips an unavailable authored successor and deterministically selects an eligible candidate', () => {
        const zPick = officer({
            id: 'z_pick',
            name: 'Z Pick',
            faction: 'RS',
            rank: 'army_commander',
            competence: 5,
            political_reliability: 5,
            pool_tier: 'starter',
        });
        const aPick = officer({
            ...zPick,
            id: 'a_pick',
            name: 'A Pick',
        });
        const data = vrsRosterData([zPick, aPick]);
        const state = stateWith(30, data, {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic' }),
            vrs_krstic: officerState({ officer_id: 'vrs_krstic', status: 'reserve' }),
            z_pick: officerState({ officer_id: 'z_pick', status: 'reserve' }),
            a_pick: officerState({ officer_id: 'a_pick', status: 'reserve' }),
        });

        const change = relieveArmyCommander(state, 'RS', loadArmyCoRoster()!);

        expect(change!.new_officer).toBe('a_pick');
        expect(state.military.named_officers!.vrs_krstic!.status).toBe('reserve');
        expect(state.military.named_officers!.z_pick!.status).toBe('reserve');
    });

    it('falls back deterministically to the political pool, then to an acting commander', () => {
        const roster = structuredClone(loadArmyCoRoster()!);
        roster.rosters.RS!.schedule[0]!.replaces_with = 'missing|political_bot_pick';
        const candidates = [
            officer({ id: 'z_pick', faction: 'RS', rank: 'army_commander', political_reliability: 5, competence: 5 }),
            officer({ id: 'a_pick', faction: 'RS', rank: 'army_commander', political_reliability: 5, competence: 5 }),
        ];
        const state = stateWith(30, [vrsRosterData()[0]!, ...candidates], {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic' }),
            z_pick: officerState({ officer_id: 'z_pick', status: 'reserve' }),
            a_pick: officerState({ officer_id: 'a_pick', status: 'reserve' }),
        });

        const politicalChange = relieveArmyCommander(state, 'RS', roster);

        expect(politicalChange!.new_officer).toBe('a_pick');

        const noPoolState = stateWith(31, [vrsRosterData()[0]!], {
            vrs_mladic: officerState({ officer_id: 'vrs_mladic' }),
        });
        const actingChange = relieveArmyCommander(noPoolState, 'RS', roster);

        expect(actingChange!.new_officer).toBe('generic_army_political_relief_RS_t31');
        expect(noPoolState.military.named_officers![actingChange!.new_officer]).toMatchObject({
            status: 'active',
            acting_commander: true,
            assigned_corps_id: null,
        });
    });

    it('honors authored RBiH succession while leaving the player in control of the decision', () => {
        const data = [
            officer({
                id: 'arbih_halilovic',
                name: 'Sefer Halilovic',
                faction: 'RBiH',
                available_until_turn: 60,
                is_historical_start: true,
            }),
            officer({
                id: 'arbih_delic',
                name: 'Rasim Delic',
                faction: 'RBiH',
                available_from_turn: 60,
            }),
        ];
        const botState = stateWith(60, data.map((entry) => ({ ...entry })), {
            arbih_halilovic: officerState({ officer_id: 'arbih_halilovic' }),
        });
        const playerState = stateWith(60, data.map((entry) => ({ ...entry })), {
            arbih_halilovic: officerState({ officer_id: 'arbih_halilovic' }),
        }, 'RBiH');

        const botReport = processOfficerSuccession(botState, new Set());
        const playerReport = processOfficerSuccession(playerState, new Set());

        expect(botReport.army_replacements).toEqual([{
            faction: 'RBiH',
            old_officer: 'arbih_halilovic',
            new_officer: 'arbih_delic',
            cause: 'authored_schedule',
        }]);
        expect(playerState.military.named_officers!.arbih_halilovic!.status).toBe('active');
        expect(playerReport.army_replacements).toEqual([]);
        expect(playerState.military.pending_officer_events).toContainEqual(expect.objectContaining({
            type: 'replacement_suggested',
            current_commander_id: 'arbih_halilovic',
            officer_id: 'arbih_delic',
            corps_id: 'arbih_main_staff',
        }));
        expect(playerState.military.pending_officer_events).not.toContainEqual(expect.objectContaining({
            type: 'officer_available',
            officer_id: 'arbih_delic',
        }));
    });
});
