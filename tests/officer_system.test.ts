/**
 * Officer System Tests — Phase B (Tier 1: Named Officers + Corps Sensitivity)
 *
 * Tests for officer_system.ts functions: casualty eligibility, lookups, modifiers,
 * initialization, succession, validation, and three-tier combat math.
 */
import { describe, it } from 'vitest';
import * as assert from 'node:assert/strict';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import {
    getCorpsCommander,
    getArmyCommander,
    getEffectiveCompetence,
    getCorpsCommanderAttackMod,
    getCorpsCommanderDefenseMod,
    getOfficerCombatMod,
    initializeNamedOfficers,
    processOfficerSuccession,
    validateOfficerData,
} from '../src/sim/combat/officer_system.js';
import {
    buildOfficerCombatLookup,
    getThreeTierOfficerMod,
    getOfficerQualityMult,
    getBrigadeOfficerMod,
} from '../src/sim/combat/combat_math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeOfficer(overrides: Partial<NamedOfficer> & { id: string; faction: FactionId }): NamedOfficer {
    return {
        name: overrides.name ?? overrides.id,
        rank: 'corps_commander',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'starter',
        ...overrides,
    };
}

function makeOfficerState(overrides: Partial<NamedOfficerState> & { officer_id: string }): NamedOfficerState {
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

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    const overrideMilitary = (overrides?.military ?? {}) as Record<string, unknown>;
    const overridePolitical = (overrides?.political ?? {}) as Record<string, unknown>;

    return {
        meta: { turn: 0, phase: 'war', scenario_id: 'test' },
        factions: [],
        ...Object.fromEntries(
            Object.entries(overrides ?? {}).filter(([key]) => key !== 'military' && key !== 'political'),
        ),
        military: {
            formations: {},
            corps_command: {},
            ...overrideMilitary,
        } as any,
        political: {
            settlements: {},
            political_controllers: {},
            ...overridePolitical,
        } as any,
    } as unknown as GameState;
}

function makeFormation(overrides: Partial<FormationState> & { id: string; faction: FactionId }): FormationState {
    return {
        kind: 'brigade',
        name: overrides.id,
        status: 'active',
        personnel: 1000,
        tanks: 0,
        artillery: 0,
        apcs: 0,
        posture: 'defend',
        cohesion: 70,
        ...overrides,
    } as unknown as FormationState;
}

function makeCorpsCommand(overrides: Record<string, unknown> = {}): any {
    return {
        command_span: 0,
        subordinate_count: 0,
        og_slots: 0,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'hold',
        active_operations: [],
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Officer casualty eligibility
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// getEffectiveCompetence
// ═══════════════════════════════════════════════════════════════════════════

describe('getEffectiveCompetence', () => {
    it('returns base competence when no penalty', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 4 });
        const os = makeOfficerState({ officer_id: 'o1' });
        assert.equal(getEffectiveCompetence(os, data), 4);
    });

    it('applies assignment penalty when turns remaining', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 4 });
        const os = makeOfficerState({ officer_id: 'o1', effective_competence_penalty: 2, penalty_turns_remaining: 5 });
        assert.equal(getEffectiveCompetence(os, data), 2);
    });

    it('ignores penalty when turns remaining is 0', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 4 });
        const os = makeOfficerState({ officer_id: 'o1', effective_competence_penalty: 2, penalty_turns_remaining: 0 });
        assert.equal(getEffectiveCompetence(os, data), 4);
    });

    it('clamps to minimum 1', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 1 });
        const os = makeOfficerState({ officer_id: 'o1', effective_competence_penalty: 2, penalty_turns_remaining: 5 });
        assert.equal(getEffectiveCompetence(os, data), 1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Corps commander modifiers
// ═══════════════════════════════════════════════════════════════════════════

describe('getCorpsCommanderAttackMod', () => {
    it('computes modifier from competence + aggressiveness', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 5, aggressiveness: 4 });
        const os = makeOfficerState({ officer_id: 'o1' });
        // 0.90 + 5×0.03 + 4×0.01 = 0.90 + 0.15 + 0.04 = 1.09
        assert.equal(getCorpsCommanderAttackMod(data, os), 0.90 + 5 * 0.03 + 4 * 0.01);
    });

    it('returns 0.92 for acting commanders', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 5, aggressiveness: 5 });
        const os = makeOfficerState({ officer_id: 'o1', acting_commander: true });
        assert.equal(getCorpsCommanderAttackMod(data, os), 0.92);
    });
});

describe('getCorpsCommanderDefenseMod', () => {
    it('computes modifier from competence + defensive_skill', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 4, defensive_skill: 5 });
        const os = makeOfficerState({ officer_id: 'o1' });
        // 0.90 + 4×0.03 + 5×0.01 = 0.90 + 0.12 + 0.05 = 1.07
        assert.equal(getCorpsCommanderDefenseMod(data, os), 0.90 + 4 * 0.03 + 5 * 0.01);
    });

    it('returns 0.92 for acting commanders', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', competence: 5, defensive_skill: 5 });
        const os = makeOfficerState({ officer_id: 'o1', acting_commander: true });
        assert.equal(getCorpsCommanderDefenseMod(data, os), 0.92);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getCorpsCommander / getArmyCommander lookups
// ═══════════════════════════════════════════════════════════════════════════

describe('getCorpsCommander', () => {
    it('returns the officer assigned to the corps', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS' });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                o1: makeOfficerState({ officer_id: 'o1', assigned_corps_id: 'vrs_1kk' }),
            }
  } as any,
});
        const result = getCorpsCommander('vrs_1kk', state);
        assert.ok(result);
        assert.equal(result.data.id, 'o1');
    });

    it('returns null when no officer is assigned', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS' });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                o1: makeOfficerState({ officer_id: 'o1', assigned_corps_id: 'vrs_srk' }),
            }
  } as any,
});
        assert.equal(getCorpsCommander('vrs_1kk', state), null);
    });

    it('returns null when no named officers present', () => {
        const state = makeMinimalState();
        assert.equal(getCorpsCommander('vrs_1kk', state), null);
    });
});

describe('getArmyCommander', () => {
    it('finds the army commander for a faction', () => {
        const data = makeOfficer({ id: 'mladic', faction: 'RS', rank: 'army_commander' });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                mladic: makeOfficerState({ officer_id: 'mladic', assigned_corps_id: 'vrs_ghq' }),
            }
  } as any,
});
        const result = getArmyCommander('RS', state);
        assert.ok(result);
        assert.equal(result.data.id, 'mladic');
    });

    it('returns null for faction without army commander', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', rank: 'corps_commander' });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                o1: makeOfficerState({ officer_id: 'o1', assigned_corps_id: 'vrs_1kk' }),
            }
  } as any,
});
        assert.equal(getArmyCommander('RS', state), null);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getOfficerCombatMod (Tier 1 × Tier 2)
// ═══════════════════════════════════════════════════════════════════════════

describe('getOfficerCombatMod', () => {
    it('returns brigadeOfficerMod × corpsMod when commander present', () => {
        const data = makeOfficer({ id: 'cmd', faction: 'RS', competence: 4, aggressiveness: 3 });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                cmd: makeOfficerState({ officer_id: 'cmd', assigned_corps_id: 'vrs_1kk' }),
            },
            corps_command: {
                vrs_1kk: makeCorpsCommand(),
            },
  } as any,
});
        const formation = makeFormation({ id: 'bde1', faction: 'RS', corps_id: 'vrs_1kk', officer_quality: 0.50 });
        const mod = getOfficerCombatMod(formation, state, 'attack');
        const brigMod = 1.0 + (0.50 - 0.30) * 0.4; // 1.08
        const corpsMod = 0.90 + 4 * 0.03 + 3 * 0.01; // 1.05
        assert.ok(Math.abs(mod - brigMod * corpsMod) < 0.001);
    });

    it('returns brigadeOfficerMod only when no commander for corps', () => {
        const data = makeOfficer({ id: 'cmd', faction: 'RS' });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                cmd: makeOfficerState({ officer_id: 'cmd', assigned_corps_id: 'vrs_srk' }),
            }
  } as any,
});
        const formation = makeFormation({ id: 'bde1', faction: 'RS', corps_id: 'vrs_1kk', officer_quality: 0.50 });
        const mod = getOfficerCombatMod(formation, state, 'attack');
        const expected = 1.0 + (0.50 - 0.30) * 0.4;
        assert.ok(Math.abs(mod - expected) < 0.001);
    });

    it('returns brigadeOfficerMod when formation has no corps_id', () => {
        const state = makeMinimalState({
  military: {
    named_officer_data: [],
    named_officers: {}
  } as any,
});
        const formation = makeFormation({ id: 'bde1', faction: 'RS', officer_quality: 0.50 });
        const mod = getOfficerCombatMod(formation, state, 'defend');
        const expected = 1.0 + (0.50 - 0.30) * 0.4;
        assert.ok(Math.abs(mod - expected) < 0.001);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getThreeTierOfficerMod (combat_math.ts three-tier resolution)
// ═══════════════════════════════════════════════════════════════════════════

describe('getThreeTierOfficerMod', () => {
    it('uses named officers path when named_officers present', () => {
        const data = makeOfficer({ id: 'cmd', faction: 'RS', competence: 4, aggressiveness: 3, defensive_skill: 4 });
        const state = makeMinimalState({
  military: {
    named_officer_data: [data],
    named_officers: {
                cmd: makeOfficerState({ officer_id: 'cmd', assigned_corps_id: 'vrs_1kk' }),
            },
            corps_command: {
                vrs_1kk: makeCorpsCommand(),
            },
  } as any,
});
        const formation = makeFormation({ id: 'bde1', faction: 'RS', corps_id: 'vrs_1kk', officer_quality: 0.50 });

        const atkMod = getThreeTierOfficerMod(formation, state, 'attack');
        const brigMod = 1.0 + (0.50 - 0.30) * 0.4;
        const corpsAtkMod = 0.90 + 4 * 0.03 + 3 * 0.01;
        assert.ok(Math.abs(atkMod - brigMod * corpsAtkMod) < 0.001);

        const defMod = getThreeTierOfficerMod(formation, state, 'defend');
        const corpsDefMod = 0.90 + 4 * 0.03 + 4 * 0.01;
        assert.ok(Math.abs(defMod - brigMod * corpsDefMod) < 0.001);
    });

    it('falls back to brigade officer mod when named officers absent but quality set', () => {
        const state = makeMinimalState();
        const formation = makeFormation({ id: 'bde1', faction: 'RS', officer_quality: 0.50 });
        const mod = getThreeTierOfficerMod(formation, state, 'attack');
        const expected = getBrigadeOfficerMod(formation, 0);
        assert.ok(Math.abs(mod - expected) < 0.001);
    });

    it('falls back to legacy getOfficerQualityMult when neither is set', () => {
        const state = makeMinimalState();
        const formation = makeFormation({ id: 'bde1', faction: 'RS' });
        // Remove officer_quality
        delete (formation as unknown as Record<string, unknown>).officer_quality;
        const mod = getThreeTierOfficerMod(formation, state, 'attack');
        const expected = getOfficerQualityMult('RS', 0);
        assert.ok(Math.abs(mod - expected) < 0.001);
    });

    it('uses a prebuilt lookup without rescanning named officer collections', () => {
        const data = makeOfficer({ id: 'cmd', faction: 'RS', competence: 4, aggressiveness: 3, defensive_skill: 5 });
        let officerDataReads = 0;
        let namedOfficerKeyScans = 0;
        const trackedOfficerData = new Proxy([data], {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && /^\d+$/.test(prop)) officerDataReads += 1;
                return Reflect.get(target, prop, receiver);
            },
        });
        const trackedNamedOfficers = new Proxy({
            cmd: makeOfficerState({ officer_id: 'cmd', assigned_corps_id: 'vrs_1kk' }),
        }, {
            ownKeys(target) {
                namedOfficerKeyScans += 1;
                return Reflect.ownKeys(target);
            },
        });
        const state = makeMinimalState({
            military: {
                named_officer_data: trackedOfficerData,
                named_officers: trackedNamedOfficers,
                corps_command: {
                    vrs_1kk: makeCorpsCommand(),
                },
            } as any,
        });
        const formation = makeFormation({ id: 'bde1', faction: 'RS', corps_id: 'vrs_1kk', officer_quality: 0.50 });
        const lookup = buildOfficerCombatLookup(state);
        const brigMod = 1.0 + (0.50 - 0.30) * 0.4;
        const corpsDefMod = 0.90 + 4 * 0.03 + 5 * 0.01;

        officerDataReads = 0;
        namedOfficerKeyScans = 0;
        const first = getThreeTierOfficerMod(formation, state, 'defend', lookup);
        const second = getThreeTierOfficerMod(formation, state, 'defend', lookup);

        assert.ok(Math.abs(first - brigMod * corpsDefMod) < 0.001);
        assert.equal(second, first);
        assert.equal(officerDataReads, 0);
        assert.equal(namedOfficerKeyScans, 0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// initializeNamedOfficers
// ═══════════════════════════════════════════════════════════════════════════

describe('initializeNamedOfficers', () => {
    it('assigns historical starters to their corps', () => {
        const data = [
            makeOfficer({ id: 'o1', faction: 'RS', is_historical_start: true, historical_corps_id: 'vrs_1kk' }),
            makeOfficer({ id: 'o2', faction: 'RS', pool_tier: 'tier_a' }),
        ];
        const state = makeMinimalState();
        initializeNamedOfficers(state, data);

        assert.ok(state.military.named_officers);
        assert.equal(state.military.named_officers['o1']?.status, 'active');
        assert.equal(state.military.named_officers['o1']?.assigned_corps_id, 'vrs_1kk');
        assert.equal(state.military.named_officers['o2']?.status, 'reserve');
        assert.equal(state.military.named_officers['o2']?.assigned_corps_id, null);
    });

    it('skips officers not yet available', () => {
        const data = [
            makeOfficer({ id: 'o1', faction: 'RS', available_from_turn: 10 }),
        ];
        const state = makeMinimalState({ meta: { turn: 0, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        initializeNamedOfficers(state, data);
        assert.ok(state.military.named_officers);
        assert.equal(state.military.named_officers['o1'], undefined);
    });

    it('skips officers already departed', () => {
        const data = [
            makeOfficer({ id: 'o1', faction: 'RS', available_until_turn: 0 }),
        ];
        const state = makeMinimalState({ meta: { turn: 0, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        initializeNamedOfficers(state, data);
        assert.ok(state.military.named_officers);
        assert.equal(state.military.named_officers['o1'], undefined);
    });

    it('stores officer data on state', () => {
        const data = [makeOfficer({ id: 'o1', faction: 'RS' })];
        const state = makeMinimalState();
        initializeNamedOfficers(state, data);
        assert.equal(state.military.named_officer_data?.length, 1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// processOfficerSuccession
// ═══════════════════════════════════════════════════════════════════════════

describe('processOfficerSuccession', () => {
    it('retires officers past available_until_turn', () => {
        const data = [
            makeOfficer({ id: 'o1', faction: 'RS', available_until_turn: 5, is_historical_start: true, historical_corps_id: 'vrs_1kk' }),
        ];
        // Initialize at turn 0 so the officer gets created
        const state = makeMinimalState({ meta: { turn: 0, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        initializeNamedOfficers(state, data);
        assert.ok(state.military.named_officers!['o1'], 'Officer should be initialized at turn 0');
        assert.equal(state.military.named_officers!['o1']!.status, 'active');

        // Advance to turn 5 where the officer should depart
        state.meta!.turn = 5;
        const report = processOfficerSuccession(state, new Set());
        assert.ok(report.departures.includes('o1'));
        assert.equal(state.military.named_officers!['o1']!.status, 'retired');
    });

    it('does not regenerate a player replacement matter after durable resolution', () => {
        const outgoing = makeOfficer({
            id: 'vrs_sipcic',
            faction: 'RS',
            available_until_turn: 18,
            is_historical_start: true,
            historical_corps_id: 'vrs_sarajevo_romanija',
            home_corps_id: 'vrs_sarajevo_romanija',
        });
        const successor = makeOfficer({
            id: 'vrs_galic',
            faction: 'RS',
            pool_tier: 'tier_a',
            available_from_turn: 18,
            home_corps_id: 'vrs_sarajevo_romanija',
        });
        const state = makeMinimalState({
            meta: {
                turn: 18,
                phase: 'war',
                scenario_id: 'test',
                player_faction: 'RS',
            },
        } as unknown as Partial<GameState>);
        state.military.named_officer_data = [outgoing, successor];
        state.military.named_officers = {
            vrs_sipcic: makeOfficerState({
                officer_id: 'vrs_sipcic',
                assigned_corps_id: 'vrs_sarajevo_romanija',
            }),
            vrs_galic: makeOfficerState({
                officer_id: 'vrs_galic',
                status: 'reserve',
            }),
        };

        processOfficerSuccession(state, new Set());
        const firstMatter = state.military.pending_officer_events?.[0];
        assert.ok(firstMatter);
        assert.equal(firstMatter.event_id, 'replacement:vrs_sipcic:vrs_sarajevo_romanija:vrs_galic');

        state.military.officer_decision_history = [{
            id: `officer:18:${firstMatter.event_id}:acknowledged`,
            turn: 18,
            faction: 'RS',
            event_id: firstMatter.event_id,
            event_type: 'replacement_suggested',
            officer_id: 'vrs_galic',
            current_commander_id: 'vrs_sipcic',
            corps_id: 'vrs_sarajevo_romanija',
            decision: 'acknowledged',
        }];
        state.military.pending_officer_events = [];
        state.meta!.turn = 35;

        processOfficerSuccession(state, new Set());

        assert.deepEqual(state.military.pending_officer_events, []);
        assert.equal(state.military.named_officers.vrs_sipcic?.status, 'active');
    });

    it('adds newly available officers to pool', () => {
        const data = [
            makeOfficer({ id: 'o1', faction: 'RS', available_from_turn: 5 }),
        ];
        const state = makeMinimalState({ meta: { turn: 5, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        state.military.named_officer_data = data;
        state.military.named_officers = {};

        const report = processOfficerSuccession(state, new Set());
        assert.ok(report.new_arrivals.includes('o1'));
        assert.equal(state.military.named_officers!['o1']!.status, 'reserve');
    });

    it('kills an engaged officer once cumulative exposure reaches the eligibility floor', () => {
        const data = makeOfficer({ id: 'high_vuln', faction: 'RS', casualty_vulnerability: 1.0 });
        const state = makeMinimalState({ meta: { turn: 0, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        state.military.named_officer_data = [data];
        state.military.named_officers = {
            high_vuln: makeOfficerState({ officer_id: 'high_vuln', assigned_corps_id: 'vrs_1kk', turns_in_command: 10 }),
        };

        const report = processOfficerSuccession(state, new Set(['vrs_1kk']));

        assert.deepEqual(report.casualties, ['high_vuln']);
    });

    it('defers casualty eligibility while cumulative exposure remains below one', () => {
        const state = makeMinimalState();
        state.military.named_officer_data = [
            makeOfficer({ id: 'not_yet_exposed', faction: 'RS', casualty_vulnerability: 1.0 }),
        ];
        state.military.named_officers = {
            not_yet_exposed: makeOfficerState({
                officer_id: 'not_yet_exposed',
                assigned_corps_id: 'vrs_1kk',
                turns_in_command: 9,
            }),
        };

        const report = processOfficerSuccession(state, new Set(['vrs_1kk']));

        assert.deepEqual(report.casualties, []);
    });

    it('selects the highest exposure officer per engaged corps', () => {
        const state = makeMinimalState();
        state.military.named_officer_data = [
            makeOfficer({ id: 'lower', faction: 'RS', casualty_vulnerability: 0.5 }),
            makeOfficer({ id: 'higher', faction: 'RS', casualty_vulnerability: 1.0 }),
        ];
        state.military.named_officers = {
            lower: makeOfficerState({ officer_id: 'lower', assigned_corps_id: 'vrs_1kk', turns_in_command: 20 }),
            higher: makeOfficerState({ officer_id: 'higher', assigned_corps_id: 'vrs_1kk', turns_in_command: 20 }),
        };

        const report = processOfficerSuccession(state, new Set(['vrs_1kk']));

        assert.deepEqual(report.casualties, ['higher']);
        assert.equal(state.military.named_officers.lower!.status, 'active');
    });

    it('does not kill officers in corps that did not fight', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS', casualty_vulnerability: 1.0 });
        const state = makeMinimalState({ meta: { turn: 0, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        state.military.named_officer_data = [data];
        state.military.named_officers = {
            o1: makeOfficerState({ officer_id: 'o1', assigned_corps_id: 'vrs_1kk' }),
        };
        // Pass empty engagedCorpsIds
        const report = processOfficerSuccession(state, new Set());
        assert.equal(report.casualties.length, 0);
    });

    it('advances turns_in_command for active officers', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS' });
        const state = makeMinimalState();
        state.military.named_officer_data = [data];
        state.military.named_officers = {
            o1: makeOfficerState({ officer_id: 'o1', assigned_corps_id: 'vrs_1kk', turns_in_command: 3 }),
        };
        processOfficerSuccession(state, new Set());
        assert.equal(state.military.named_officers!['o1']!.turns_in_command, 4);
    });

    it('decrements penalty_turns_remaining', () => {
        const data = makeOfficer({ id: 'o1', faction: 'RS' });
        const state = makeMinimalState();
        state.military.named_officer_data = [data];
        state.military.named_officers = {
            o1: makeOfficerState({
                officer_id: 'o1',
                assigned_corps_id: 'vrs_1kk',
                penalty_turns_remaining: 3,
                effective_competence_penalty: 2,
            }),
        };
        processOfficerSuccession(state, new Set());
        assert.equal(state.military.named_officers!['o1']!.penalty_turns_remaining, 2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateOfficerData
// ═══════════════════════════════════════════════════════════════════════════

describe('validateOfficerData', () => {
    it('validates correct officer data', () => {
        const raw = {
            officers: [
                {
                    id: 'o1',
                    name: 'Test Officer',
                    faction: 'RS',
                    rank: 'corps_commander',
                    competence: 4,
                    aggressiveness: 3,
                    defensive_skill: 3,
                    political_reliability: 3,
                    available_from_turn: 0,
                    origin: 'jna',
                    casualty_vulnerability: 0.1,
                    can_improve: false,
                    improvement_rate: 0,
                    pool_tier: 'starter',
                },
            ],
        };
        const result = validateOfficerData(raw);
        assert.equal(result.length, 1);
        assert.equal(result[0]!.id, 'o1');
        assert.equal(result[0]!.competence, 4);
    });

    it('throws on duplicate IDs', () => {
        const raw = {
            officers: [
                { id: 'o1', faction: 'RS' },
                { id: 'o1', faction: 'RS' },
            ],
        };
        assert.throws(() => validateOfficerData(raw), /Duplicate/);
    });

    it('throws on invalid faction', () => {
        const raw = {
            officers: [{ id: 'o1', faction: 'INVALID' }],
        };
        assert.throws(() => validateOfficerData(raw), /invalid faction/);
    });

    it('throws on competence out of range', () => {
        const raw = {
            officers: [{ id: 'o1', faction: 'RS', competence: 7 }],
        };
        assert.throws(() => validateOfficerData(raw), /competence/);
    });

    it('throws on missing officers array', () => {
        assert.throws(() => validateOfficerData({ data: [] }), /officers/);
    });

    it('clamps casualty_vulnerability to [0,1]', () => {
        const raw = {
            officers: [{ id: 'o1', faction: 'RS', casualty_vulnerability: 2.0 }],
        };
        const result = validateOfficerData(raw);
        assert.equal(result[0]!.casualty_vulnerability, 1.0);
    });

    it('preserves authored mini-bio fields for UI command profiles', () => {
        const raw = {
            officers: [{
                id: 'o1',
                faction: 'RBiH',
                bio_short: 'JNA-background officer leading the army command at scenario start.',
                command_style: 'Assertive central command',
                known_for: 'Opening army command',
                political_alignment_note: 'Modeled as a regular army-command appointment.',
                sensitive_history_note: 'Sensitive-history note remains informational.',
            }],
        };

        const result = validateOfficerData(raw);

        assert.equal(result[0]!.bio_short, 'JNA-background officer leading the army command at scenario start.');
        assert.equal(result[0]!.command_style, 'Assertive central command');
        assert.equal(result[0]!.known_for, 'Opening army command');
        assert.equal(result[0]!.political_alignment_note, 'Modeled as a regular army-command appointment.');
        assert.equal(result[0]!.sensitive_history_note, 'Sensitive-history note remains informational.');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Assignment penalties (succession replacement)
// ═══════════════════════════════════════════════════════════════════════════

describe('succession assignment penalties', () => {
    it('home corps gets no penalty', () => {
        const data = [
            makeOfficer({ id: 'cmd', faction: 'RS', home_corps_id: 'vrs_1kk', is_historical_start: true, historical_corps_id: 'vrs_1kk' }),
            makeOfficer({ id: 'pool1', faction: 'RS', home_corps_id: 'vrs_1kk', pool_tier: 'tier_a' }),
        ];
        const state = makeMinimalState();
        state.military.formations = {
            vrs_1kk: makeFormation({ id: 'vrs_1kk', faction: 'RS', kind: 'corps_asset' as 'brigade' }),
        };
        initializeNamedOfficers(state, data);
        // Kill the commander
        state.military.named_officers!['cmd']!.status = 'killed';
        state.military.named_officers!['cmd']!.assigned_corps_id = null;

        processOfficerSuccession(state, new Set());

        assert.equal(state.military.named_officers!['pool1']!.assigned_corps_id, 'vrs_1kk');
        assert.equal(state.military.named_officers!['pool1']!.effective_competence_penalty, 0);
        assert.equal(state.military.named_officers!['pool1']!.penalty_turns_remaining, 0);
    });

    it('compatible corps gets -1 penalty for 8 turns', () => {
        const data = [
            makeOfficer({ id: 'pool1', faction: 'RS', home_corps_id: 'vrs_srk', compatible_corps_ids: ['vrs_1kk'], pool_tier: 'tier_a' }),
        ];
        const state = makeMinimalState();
        state.military.formations = {
            vrs_1kk: makeFormation({ id: 'vrs_1kk', faction: 'RS', kind: 'corps_asset' as 'brigade' }),
        };
        state.military.named_officer_data = data;
        state.military.named_officers = {
            pool1: makeOfficerState({ officer_id: 'pool1', status: 'reserve' }),
        };

        processOfficerSuccession(state, new Set());

        assert.equal(state.military.named_officers!['pool1']!.assigned_corps_id, 'vrs_1kk');
        assert.equal(state.military.named_officers!['pool1']!.effective_competence_penalty, 1);
        assert.equal(state.military.named_officers!['pool1']!.penalty_turns_remaining, 8);
    });

    it('incompatible corps gets -2 penalty for 12 turns', () => {
        const data = [
            makeOfficer({ id: 'pool1', faction: 'RS', home_corps_id: 'vrs_srk', pool_tier: 'tier_a' }),
        ];
        const state = makeMinimalState();
        state.military.formations = {
            vrs_1kk: makeFormation({ id: 'vrs_1kk', faction: 'RS', kind: 'corps_asset' as 'brigade' }),
        };
        state.military.named_officer_data = data;
        state.military.named_officers = {
            pool1: makeOfficerState({ officer_id: 'pool1', status: 'reserve' }),
        };

        processOfficerSuccession(state, new Set());

        assert.equal(state.military.named_officers!['pool1']!.assigned_corps_id, 'vrs_1kk');
        assert.equal(state.military.named_officers!['pool1']!.effective_competence_penalty, 2);
        assert.equal(state.military.named_officers!['pool1']!.penalty_turns_remaining, 12);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Generic replacement
// ═══════════════════════════════════════════════════════════════════════════

describe('generic replacement officers', () => {
    it('creates generic acting commander when pool is empty', () => {
        const state = makeMinimalState({ meta: { turn: 10, phase: 'war', scenario_id: 'test' } } as unknown as Partial<GameState>);
        state.military.formations = {
            vrs_1kk: makeFormation({ id: 'vrs_1kk', faction: 'RS', kind: 'corps_asset' as 'brigade' }),
        };
        state.military.named_officer_data = [];
        state.military.named_officers = {};

        const report = processOfficerSuccession(state, new Set());

        assert.ok(report.generic_replacements > 0);
        const genericId = `generic_RS_vrs_1kk_t10`;
        assert.ok(state.military.named_officers![genericId]);
        assert.equal(state.military.named_officers![genericId]!.acting_commander, true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Round-trip: validate apr1992_officers.json
// ═══════════════════════════════════════════════════════════════════════════

describe('apr1992 officer data validation', () => {
    it('validates the actual officer data file', async () => {
        const { readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const baseDir = process.cwd();
        const path = join(baseDir, 'data/scenarios/officers/apr1992_officers.json');
        const raw = JSON.parse(await readFile(path, 'utf8'));
        const officers = validateOfficerData(raw);
        assert.ok(officers.length >= 80, `Expected at least 80 officers, got ${officers.length}`);
        // Check faction distribution
        const byFaction = new Map<string, number>();
        for (const o of officers) {
            byFaction.set(o.faction, (byFaction.get(o.faction) ?? 0) + 1);
        }
        assert.ok(byFaction.get('RS')! >= 20, 'RS should have ≥20 officers');
        assert.ok(byFaction.get('RBiH')! >= 20, 'RBiH should have ≥20 officers');
        assert.ok(byFaction.get('HRHB')! >= 15, 'HRHB should have ≥15 officers');
    });
});
