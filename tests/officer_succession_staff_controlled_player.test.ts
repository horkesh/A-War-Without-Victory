/**
 * Live/headless parity for authored officer succession.
 *
 * A player faction must change commanders on the authored schedule exactly like a bot faction, at
 * every autonomy level (player-override model, 2026-11-25; until then a manually controlled player,
 * autonomy 0, got a `replacement_suggested` matter and kept the outgoing commander). Before this
 * rule, a staff-controlled RS player kept Sipcic at the Sarajevo-Romanija Corps past turn 18
 * (Galic never took over) and an RBiH player kept Knez, Talijan, Drekovic and Halilovic, which
 * made the live game diverge from the no-player run.
 */
import { describe, expect, it } from 'vitest';

import type { FactionId, GameState } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import { processOfficerSuccession } from '../src/sim/combat/officer_system.js';

function officer(overrides: Partial<NamedOfficer> & { id: string; faction: FactionId }): NamedOfficer {
    return {
        name: overrides.id,
        rank: 'corps_commander',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.05,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'starter',
        ...overrides,
    };
}

function officerState(overrides: Partial<NamedOfficerState> & { officer_id: string }): NamedOfficerState {
    return {
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
    player: { faction: FactionId; autonomy: number } | null,
): GameState {
    return {
        meta: {
            turn,
            phase: 'war',
            scenario_id: 'test',
            ...(player ? { player_faction: player.faction, autonomy_level: player.autonomy } : {}),
        },
        factions: [],
        political: { political_controllers: {} },
        military: {
            formations: {},
            corps_command: {},
            named_officer_data: data.map((entry) => ({ ...entry })),
            named_officers: JSON.parse(JSON.stringify(states)),
            pending_officer_events: [],
        },
    } as unknown as GameState;
}

function sarajevoRomanija(turn: number, player: { faction: FactionId; autonomy: number } | null): GameState {
    return stateWith(turn, [
        officer({
            id: 'vrs_sipcic',
            faction: 'RS',
            available_until_turn: 18,
            is_historical_start: true,
            home_corps_id: 'vrs_sarajevo_romanija',
        }),
        officer({
            id: 'vrs_galic',
            faction: 'RS',
            pool_tier: 'tier_a',
            available_from_turn: 18,
            home_corps_id: 'vrs_sarajevo_romanija',
        }),
    ], {
        vrs_sipcic: officerState({ officer_id: 'vrs_sipcic', assigned_corps_id: 'vrs_sarajevo_romanija' }),
        vrs_galic: officerState({ officer_id: 'vrs_galic', status: 'reserve' }),
    }, player);
}

function rbihArmy(turn: number, player: { faction: FactionId; autonomy: number } | null): GameState {
    return stateWith(turn, [
        officer({
            id: 'arbih_halilovic',
            faction: 'RBiH',
            rank: 'army_commander',
            available_until_turn: 60,
            is_historical_start: true,
        }),
        officer({ id: 'arbih_delic', faction: 'RBiH', rank: 'army_commander', available_from_turn: 60 }),
    ], {
        arbih_halilovic: officerState({ officer_id: 'arbih_halilovic' }),
    }, player);
}

const replacementMatters = (state: GameState) => (state.military.pending_officer_events ?? [])
    .filter((event) => event.type === 'replacement_suggested');

describe('authored officer succession for a staff-controlled player', () => {
    it('retires a staff-controlled player corps commander on schedule, exactly like the no-player run', () => {
        const headless = sarajevoRomanija(18, null);
        const staff = sarajevoRomanija(18, { faction: 'RS', autonomy: 2 });

        const headlessReport = processOfficerSuccession(headless, new Set());
        const staffReport = processOfficerSuccession(staff, new Set());

        expect(staff.military.named_officers!.vrs_sipcic!.status).toBe('retired');
        expect(staffReport.departures).toEqual(headlessReport.departures);
        expect(staffReport.replacements).toEqual(headlessReport.replacements);
        expect(staff.military.named_officers).toEqual(headless.military.named_officers);
        expect(replacementMatters(staff)).toEqual([]);
    });

    // Amended 2026-11-25, player-override model (§14.10a, H-13): Full Control no longer waits on a
    // matter; the schedule applies as headless and the President's explicit appointment overrides.
    it('a Full Control (autonomy 0) player corps follows the authored schedule exactly like the no-player run', () => {
        const headless = sarajevoRomanija(18, null);
        const manual = sarajevoRomanija(18, { faction: 'RS', autonomy: 0 });

        const headlessReport = processOfficerSuccession(headless, new Set());
        const manualReport = processOfficerSuccession(manual, new Set());

        expect(manual.military.named_officers!.vrs_sipcic!.status).toBe('retired');
        expect(manualReport.departures).toEqual(headlessReport.departures);
        expect(manual.military.named_officers).toEqual(headless.military.named_officers);
        expect(replacementMatters(manual)).toEqual([]);
    });

    it('changes a staff-controlled player army commander on the authored schedule like a bot', () => {
        const headless = rbihArmy(60, null);
        const staff = rbihArmy(60, { faction: 'RBiH', autonomy: 2 });
        const manual = rbihArmy(60, { faction: 'RBiH', autonomy: 0 });

        const headlessReport = processOfficerSuccession(headless, new Set());
        const staffReport = processOfficerSuccession(staff, new Set());
        const manualReport = processOfficerSuccession(manual, new Set());

        expect(staffReport.army_replacements).toEqual(headlessReport.army_replacements);
        expect(staffReport.army_replacements).toEqual([expect.objectContaining({
            faction: 'RBiH',
            old_officer: 'arbih_halilovic',
            new_officer: 'arbih_delic',
            cause: 'authored_schedule',
        })]);
        expect(staff.military.named_officers).toEqual(headless.military.named_officers);
        expect(replacementMatters(staff)).toEqual([]);

        // Full Control too (player-override model, H-13): the schedule applies, no matter is raised.
        expect(manualReport.army_replacements).toEqual(headlessReport.army_replacements);
        expect(manual.military.named_officers).toEqual(headless.military.named_officers);
        expect(replacementMatters(manual)).toEqual([]);
    });
});
