/**
 * Tests for brigade history recording system.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    createEmptyBrigadeHistory,
    MAX_HISTORY_ENTRIES,
    ATTACKER_WIN_OUTCOMES,
    ATTACKER_LOSS_OUTCOMES,
} from '../src/state/brigade_history.js';
import type { BrigadeHistory, BrigadeEngagement } from '../src/state/brigade_history.js';
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
        const h = createEmptyBrigadeHistory(1500);
        assert.equal(h.engagements.length, 0);
        assert.equal(h.battles_fought, 0);
        assert.equal(h.victories, 0);
        assert.equal(h.defeats, 0);
        assert.equal(h.peak_personnel, 1500);
        assert.equal(h.nadir_personnel, 1500);
        assert.equal(h.first_battle_turn, null);
    });

    it('ensureBrigadeHistory creates history if absent', () => {
        const f = makeFormation();
        assert.equal(f.brigade_history, undefined);
        const h = ensureBrigadeHistory(f);
        assert.ok(h);
        assert.equal(f.brigade_history, h);
        assert.equal(h.peak_personnel, 1500);
    });

    it('ensureBrigadeHistory returns existing history', () => {
        const f = makeFormation();
        const h1 = ensureBrigadeHistory(f);
        h1.battles_fought = 5;
        const h2 = ensureBrigadeHistory(f);
        assert.equal(h2.battles_fought, 5);
        assert.equal(h1, h2);
    });

    it('recordBrigadeEngagement updates tallies for attacker victory', () => {
        const f = makeFormation();
        recordBrigadeEngagement(f, makeEngagement({ outcome: 'victory', role: 'attacker' }));
        const h = f.brigade_history!;
        assert.equal(h.battles_fought, 1);
        assert.equal(h.battles_as_attacker, 1);
        assert.equal(h.victories, 1);
        assert.equal(h.defeats, 0);
        assert.equal(h.total_casualties_taken, 50);
        assert.equal(h.total_casualties_inflicted, 80);
        assert.equal(h.total_osids_captured, 1);
        assert.equal(h.first_battle_turn, 1);
        assert.equal(h.first_battle_osid, 'op:tuzla:tuzla_2');
    });

    it('recordBrigadeEngagement updates tallies for attacker loss', () => {
        const f = makeFormation();
        recordBrigadeEngagement(f, makeEngagement({
            outcome: 'repulsed',
            role: 'attacker',
            territory_flipped: false,
        }));
        const h = f.brigade_history!;
        assert.equal(h.victories, 0);
        assert.equal(h.defeats, 1);
        assert.equal(h.total_osids_captured, 0);
    });

    it('recordBrigadeEngagement updates tallies for defender victory', () => {
        const f = makeFormation();
        recordBrigadeEngagement(f, makeEngagement({
            outcome: 'repulsed',
            role: 'defender',
            territory_flipped: false,
        }));
        const h = f.brigade_history!;
        assert.equal(h.battles_as_defender, 1);
        assert.equal(h.victories, 1); // defender wins when attacker repulsed
        assert.equal(h.defeats, 0);
    });

    it('recordBrigadeEngagement updates tallies for defender loss', () => {
        const f = makeFormation();
        recordBrigadeEngagement(f, makeEngagement({
            outcome: 'decisive_victory',
            role: 'defender',
            territory_flipped: true,
        }));
        const h = f.brigade_history!;
        assert.equal(h.victories, 0);
        assert.equal(h.defeats, 1);
        assert.equal(h.total_osids_lost, 1); // defender lost the OSID
    });

    it('tracks victory streaks correctly', () => {
        const f = makeFormation();
        // 3 attacker victories
        for (let i = 0; i < 3; i++) {
            recordBrigadeEngagement(f, makeEngagement({ turn: i, outcome: 'victory', role: 'attacker' }));
        }
        assert.equal(f.brigade_history!.current_victory_streak, 3);
        assert.equal(f.brigade_history!.longest_victory_streak, 3);

        // Then a loss
        recordBrigadeEngagement(f, makeEngagement({ turn: 3, outcome: 'repulsed', role: 'attacker', territory_flipped: false }));
        assert.equal(f.brigade_history!.current_victory_streak, 0);
        assert.equal(f.brigade_history!.longest_victory_streak, 3);
    });

    it('tracks defense streaks correctly', () => {
        const f = makeFormation();
        // 4 successful defenses (attacker repulsed = defender holds)
        for (let i = 0; i < 4; i++) {
            recordBrigadeEngagement(f, makeEngagement({
                turn: i,
                outcome: 'repulsed',
                role: 'defender',
                territory_flipped: false,
            }));
        }
        assert.equal(f.brigade_history!.current_defense_streak, 4);
        assert.equal(f.brigade_history!.longest_defense_streak, 4);
    });

    it('FIFO caps engagement log at MAX_HISTORY_ENTRIES', () => {
        const f = makeFormation();
        for (let i = 0; i < MAX_HISTORY_ENTRIES + 50; i++) {
            recordBrigadeEngagement(f, makeEngagement({ turn: i }));
        }
        assert.equal(f.brigade_history!.engagements.length, MAX_HISTORY_ENTRIES);
        // First entry should be turn 50 (0-49 evicted)
        assert.equal(f.brigade_history!.engagements[0].turn, 50);
        // Total battles should count all
        assert.equal(f.brigade_history!.battles_fought, MAX_HISTORY_ENTRIES + 50);
    });

    it('tracks worst single battle casualties', () => {
        const f = makeFormation();
        recordBrigadeEngagement(f, makeEngagement({ turn: 1, casualties_taken: 30 }));
        recordBrigadeEngagement(f, makeEngagement({ turn: 2, casualties_taken: 150 }));
        recordBrigadeEngagement(f, makeEngagement({ turn: 3, casualties_taken: 80 }));
        assert.equal(f.brigade_history!.worst_single_battle_casualties, 150);
        assert.equal(f.brigade_history!.worst_single_battle_turn, 2);
    });

    it('tracks stalemates', () => {
        const f = makeFormation();
        recordBrigadeEngagement(f, makeEngagement({ outcome: 'stalemate', role: 'attacker', territory_flipped: false }));
        assert.equal(f.brigade_history!.stalemates, 1);
        assert.equal(f.brigade_history!.victories, 0);
        assert.equal(f.brigade_history!.defeats, 0);
    });

    it('recordAttackerEngagements distributes casualties across attackers', () => {
        const f1 = makeFormation({ id: 'atk_1' });
        const f2 = makeFormation({ id: 'atk_2' });
        recordAttackerEngagements(
            [f1, f2], 5, 'op:brcko:brcko', 'victory', 'RS', true,
            100, 60, true,
        );
        assert.equal(f1.brigade_history!.battles_fought, 1);
        assert.equal(f2.brigade_history!.battles_fought, 1);
        assert.equal(f1.brigade_history!.engagements[0].casualties_taken, 50);
        assert.equal(f2.brigade_history!.engagements[0].casualties_taken, 50);
        assert.equal(f1.brigade_history!.engagements[0].was_concentrated, true);
    });

    it('recordDefenderEngagement records correctly', () => {
        const f = makeFormation({ id: 'def_1' });
        recordDefenderEngagement(f, 3, 'op:mostar:mostar_2', 'repulsed', 'HRHB', false, 30, 70, false);
        const e = f.brigade_history!.engagements[0];
        assert.equal(e.role, 'defender');
        assert.equal(e.outcome, 'repulsed');
        assert.equal(e.casualties_taken, 30);
        assert.equal(e.casualties_inflicted, 70);
        assert.equal(e.enemy_faction, 'HRHB');
        assert.equal(e.territory_flipped, false);
    });

    it('ATTACKER_WIN_OUTCOMES and ATTACKER_LOSS_OUTCOMES are disjoint', () => {
        for (const w of ATTACKER_WIN_OUTCOMES) {
            assert.ok(!ATTACKER_LOSS_OUTCOMES.includes(w), `${w} should not be in both`);
        }
    });
});
