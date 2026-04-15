/**
 * Tests for brigade history recording system.
 */

import { describe, expect, it } from 'vitest';
import {
    createEmptyBrigadeHistory,
    MAX_HISTORY_ENTRIES,
    ATTACKER_WIN_OUTCOMES,
    ATTACKER_LOSS_OUTCOMES,
} from '../src/state/brigade_history.js';
import type { BrigadeEngagement } from '../src/state/brigade_history.js';
import {
    ensureBrigadeHistory,
    recordBrigadeEngagement,
    recordAttackerEngagements,
    recordDefenderEngagement,
} from '../src/sim/combat/brigade_history_recorder.js';
import type { FormationState } from '../src/state/game_state.js';

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RBiH',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        ...overrides,
    };
}

function makeEngagement(overrides: Partial<BrigadeEngagement> = {}): BrigadeEngagement {
    return {
        turn: 1,
        osid: 'op:tuzla:tuzla_2',
        role: 'attacker',
        outcome: 'victory',
        casualties_taken: 50,
        casualties_inflicted: 80,
        enemy_faction: 'RS',
        territory_flipped: true,
        was_concentrated: false,
        ...overrides,
    };
}

describe('brigade history', () => {
    it('createEmptyBrigadeHistory initializes all fields', () => {
        const history = createEmptyBrigadeHistory(1500);
        expect(history.engagements).toHaveLength(0);
        expect(history.battles_fought).toBe(0);
        expect(history.victories).toBe(0);
        expect(history.defeats).toBe(0);
        expect(history.peak_personnel).toBe(1500);
        expect(history.nadir_personnel).toBe(1500);
        expect(history.first_battle_turn).toBeNull();
    });

    it('ensureBrigadeHistory creates history if absent', () => {
        const formation = makeFormation();
        expect(formation.brigade_history).toBeUndefined();
        const history = ensureBrigadeHistory(formation);
        expect(history).toBeTruthy();
        expect(formation.brigade_history).toBe(history);
        expect(history.peak_personnel).toBe(1500);
    });

    it('ensureBrigadeHistory returns existing history', () => {
        const formation = makeFormation();
        const history1 = ensureBrigadeHistory(formation);
        history1.battles_fought = 5;
        const history2 = ensureBrigadeHistory(formation);
        expect(history2.battles_fought).toBe(5);
        expect(history1).toBe(history2);
    });

    it('recordBrigadeEngagement updates tallies for attacker victory', () => {
        const formation = makeFormation();
        recordBrigadeEngagement(formation, makeEngagement({ outcome: 'victory', role: 'attacker' }));
        const history = formation.brigade_history!;
        expect(history.battles_fought).toBe(1);
        expect(history.battles_as_attacker).toBe(1);
        expect(history.victories).toBe(1);
        expect(history.defeats).toBe(0);
        expect(history.total_casualties_taken).toBe(50);
        expect(history.total_casualties_inflicted).toBe(80);
        expect(history.total_osids_captured).toBe(1);
        expect(history.first_battle_turn).toBe(1);
        expect(history.first_battle_osid).toBe('op:tuzla:tuzla_2');
    });

    it('recordBrigadeEngagement updates tallies for attacker loss', () => {
        const formation = makeFormation();
        recordBrigadeEngagement(
            formation,
            makeEngagement({
                outcome: 'repulsed',
                role: 'attacker',
                territory_flipped: false,
            }),
        );
        const history = formation.brigade_history!;
        expect(history.victories).toBe(0);
        expect(history.defeats).toBe(1);
        expect(history.total_osids_captured).toBe(0);
    });

    it('recordBrigadeEngagement updates tallies for defender victory', () => {
        const formation = makeFormation();
        recordBrigadeEngagement(
            formation,
            makeEngagement({
                outcome: 'repulsed',
                role: 'defender',
                territory_flipped: false,
            }),
        );
        const history = formation.brigade_history!;
        expect(history.battles_as_defender).toBe(1);
        expect(history.victories).toBe(1);
        expect(history.defeats).toBe(0);
    });

    it('recordBrigadeEngagement updates tallies for defender loss', () => {
        const formation = makeFormation();
        recordBrigadeEngagement(
            formation,
            makeEngagement({
                outcome: 'decisive_victory',
                role: 'defender',
                territory_flipped: true,
            }),
        );
        const history = formation.brigade_history!;
        expect(history.victories).toBe(0);
        expect(history.defeats).toBe(1);
        expect(history.total_osids_lost).toBe(1);
    });

    it('tracks victory streaks correctly', () => {
        const formation = makeFormation();
        for (let index = 0; index < 3; index++) {
            recordBrigadeEngagement(formation, makeEngagement({ turn: index, outcome: 'victory', role: 'attacker' }));
        }
        expect(formation.brigade_history!.current_victory_streak).toBe(3);
        expect(formation.brigade_history!.longest_victory_streak).toBe(3);

        recordBrigadeEngagement(
            formation,
            makeEngagement({ turn: 3, outcome: 'repulsed', role: 'attacker', territory_flipped: false }),
        );
        expect(formation.brigade_history!.current_victory_streak).toBe(0);
        expect(formation.brigade_history!.longest_victory_streak).toBe(3);
    });

    it('tracks defense streaks correctly', () => {
        const formation = makeFormation();
        for (let index = 0; index < 4; index++) {
            recordBrigadeEngagement(
                formation,
                makeEngagement({
                    turn: index,
                    outcome: 'repulsed',
                    role: 'defender',
                    territory_flipped: false,
                }),
            );
        }
        expect(formation.brigade_history!.current_defense_streak).toBe(4);
        expect(formation.brigade_history!.longest_defense_streak).toBe(4);
    });

    it('FIFO caps engagement log at MAX_HISTORY_ENTRIES', () => {
        const formation = makeFormation();
        for (let index = 0; index < MAX_HISTORY_ENTRIES + 50; index++) {
            recordBrigadeEngagement(formation, makeEngagement({ turn: index }));
        }
        expect(formation.brigade_history!.engagements).toHaveLength(MAX_HISTORY_ENTRIES);
        expect(formation.brigade_history!.engagements[0].turn).toBe(50);
        expect(formation.brigade_history!.battles_fought).toBe(MAX_HISTORY_ENTRIES + 50);
    });

    it('tracks worst single battle casualties', () => {
        const formation = makeFormation();
        recordBrigadeEngagement(formation, makeEngagement({ turn: 1, casualties_taken: 30 }));
        recordBrigadeEngagement(formation, makeEngagement({ turn: 2, casualties_taken: 150 }));
        recordBrigadeEngagement(formation, makeEngagement({ turn: 3, casualties_taken: 80 }));
        expect(formation.brigade_history!.worst_single_battle_casualties).toBe(150);
        expect(formation.brigade_history!.worst_single_battle_turn).toBe(2);
    });

    it('tracks stalemates', () => {
        const formation = makeFormation();
        recordBrigadeEngagement(formation, makeEngagement({ outcome: 'stalemate', role: 'attacker', territory_flipped: false }));
        expect(formation.brigade_history!.stalemates).toBe(1);
        expect(formation.brigade_history!.victories).toBe(0);
        expect(formation.brigade_history!.defeats).toBe(0);
    });

    it('recordAttackerEngagements distributes casualties across attackers', () => {
        const formation1 = makeFormation({ id: 'atk_1' });
        const formation2 = makeFormation({ id: 'atk_2' });
        recordAttackerEngagements([formation1, formation2], 5, 'op:brcko:brcko', 'victory', 'RS', true, 100, 60, true);
        expect(formation1.brigade_history!.battles_fought).toBe(1);
        expect(formation2.brigade_history!.battles_fought).toBe(1);
        expect(formation1.brigade_history!.engagements[0].casualties_taken).toBe(50);
        expect(formation2.brigade_history!.engagements[0].casualties_taken).toBe(50);
        expect(formation1.brigade_history!.engagements[0].was_concentrated).toBe(true);
    });

    it('recordDefenderEngagement records correctly', () => {
        const formation = makeFormation({ id: 'def_1' });
        recordDefenderEngagement(formation, 3, 'op:mostar:mostar_2', 'repulsed', 'HRHB', false, 30, 70, false);
        const engagement = formation.brigade_history!.engagements[0];
        expect(engagement.role).toBe('defender');
        expect(engagement.outcome).toBe('repulsed');
        expect(engagement.casualties_taken).toBe(30);
        expect(engagement.casualties_inflicted).toBe(70);
        expect(engagement.enemy_faction).toBe('HRHB');
        expect(engagement.territory_flipped).toBe(false);
    });

    it('ATTACKER_WIN_OUTCOMES and ATTACKER_LOSS_OUTCOMES are disjoint', () => {
        for (const outcome of ATTACKER_WIN_OUTCOMES) {
            expect(ATTACKER_LOSS_OUTCOMES).not.toContain(outcome);
        }
    });
});
