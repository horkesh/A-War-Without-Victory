// tests/ai_commander_prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildArmyPrompt, buildCorpsPrompt, buildAdvisorPrompt } from '../src/sim/ai_commander/prompt_builder.js';
import type { GameState } from '../src/state/game_state.js';

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 10, phase: 'war', seed: 'test', scenario_id: 'apr1992', player_faction: 'RBiH' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {
                vrs_1st_krajina: { id: 'vrs_1st_krajina', faction: 'RS', status: 'active', kind: 'corps', personnel: 0, morale: 70, cohesion: 70 },
                rs_1st_krajina_brig: { id: 'rs_1st_krajina_brig', faction: 'RS', status: 'active', kind: 'brigade', personnel: 2000, morale: 70, cohesion: 70, corps_id: 'vrs_1st_krajina' },
            },
            corps_command: {
                vrs_1st_krajina: { stance: 'offensive', directive: null },
            },
            named_officer_data: [
                { id: 'mladic', name: 'Ratko Mladić', faction: 'RS', rank: 'army_commander', competence: 4, aggressiveness: 5, defensive_skill: 3, political_reliability: 2, available_from_turn: 0, origin: 'jna', can_improve: false, improvement_rate: 0, pool_tier: 'starter', casualty_vulnerability: 0.05 },
            ],
            named_officers: {
                mladic: { officer_id: 'mladic', status: 'active', assigned_corps_id: null, turns_in_command: 10, battles: 0, victories: 0, effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false },
            },
        },
        political: {
            political_controllers: { 'op:banja_luka:banja_luka_1': 'RS', 'op:sarajevo:sarajevo_1': 'RBiH' },
        },
        displacement: {},
        ...overrides,
    } as unknown as GameState;
}

describe('prompt builder', () => {
    it('buildArmyPrompt includes faction and turn', () => {
        const state = makeMinimalState();
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.system).toContain('Ratko Mladić');
        expect(prompt.system).toContain('VRS');
        expect(prompt.user).toContain('Turn: 10');
        expect(prompt.user).toContain('RS');
    });

    it('buildArmyPrompt includes territory summary', () => {
        const state = makeMinimalState();
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).toContain('Territory');
    });

    it('buildArmyPrompt includes corps status', () => {
        const state = makeMinimalState();
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).toContain('vrs_1st_krajina');
    });

    it('buildCorpsPrompt includes army directive', () => {
        const state = makeMinimalState();
        const armyDirective = { stance: 'offensive' as const, priority: 'brcko' };
        const prompt = buildCorpsPrompt(state, 'RS', 'vrs_1st_krajina', armyDirective);
        expect(prompt.user).toContain('offensive');
        expect(prompt.user).toContain('brcko');
    });

    it('buildAdvisorPrompt includes situation analysis framing', () => {
        const state = makeMinimalState();
        const prompt = buildAdvisorPrompt(state, 'RBiH', 'situation_analysis');
        expect(prompt.system).toContain('advisor');
        expect(prompt.user).toContain('RBiH');
    });

    it('prompts include JSON output schema', () => {
        const state = makeMinimalState();
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).toContain('corps_directives');
        expect(prompt.user).toContain('strategic_reasoning');
    });

    it('prompt temperature is 0', () => {
        const state = makeMinimalState();
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.temperature).toBe(0);
    });
});

describe('army prompt event context', () => {
    it('includes fired event IDs when events have fired', () => {
        const state = makeMinimalState({
            military: {
                ...makeMinimalState().military,
                fired_event_ids: ['graz_accords_signed', 'arms_embargo', 'srebrenica_declared'],
                event_aggression_modifiers: [
                    { faction: 'RS', delta: 0.3, expires_turn: 15 },
                    { faction: 'RBiH', delta: -0.1, expires_turn: 20 }, // different faction, should not appear
                ],
            },
        } as Partial<GameState>);
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).toContain('Recent events fired: graz_accords_signed, arms_embargo, srebrenica_declared');
        expect(prompt.user).toContain('Aggression modifier: +0.3 (expires turn 15)');
        expect(prompt.user).not.toContain('-0.1'); // RBiH modifier should not appear for RS
    });

    it('includes active constraints when present', () => {
        const state = makeMinimalState({
            military: {
                ...makeMinimalState().military,
                event_constraints: {
                    operation_blocks: [
                        { faction: 'RS', expires_turn: 20, reason: 'ceasefire' },
                        { faction: 'RBiH', expires_turn: 25, reason: 'other_ceasefire' }, // wrong faction
                    ],
                    doctrine_overrides: [
                        { faction: 'RS', forced_stance: 'defensive', expires_turn: 15, reason: 'peace_talks' },
                    ],
                },
            },
        } as Partial<GameState>);
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).toContain('OPERATION BLOCKED: ceasefire until turn 20');
        expect(prompt.user).not.toContain('other_ceasefire');
        expect(prompt.user).toContain('FORCED STANCE: defensive until turn 15');
    });

    it('does not include expired constraints', () => {
        const state = makeMinimalState({
            military: {
                ...makeMinimalState().military,
                event_aggression_modifiers: [
                    { faction: 'RS', delta: 0.5, expires_turn: 5 }, // expired (turn is 10)
                ],
                event_constraints: {
                    operation_blocks: [
                        { faction: 'RS', expires_turn: 8, reason: 'old_ceasefire' }, // expired
                    ],
                },
            },
        } as Partial<GameState>);
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).not.toContain('Aggression modifier');
        expect(prompt.user).not.toContain('OPERATION BLOCKED');
    });

    it('limits fired events to last 8', () => {
        const ids = Array.from({ length: 12 }, (_, i) => `event_${i}`);
        const state = makeMinimalState({
            military: {
                ...makeMinimalState().military,
                fired_event_ids: ids,
            },
        } as Partial<GameState>);
        const prompt = buildArmyPrompt(state, 'RS');
        expect(prompt.user).not.toContain('event_3');
        expect(prompt.user).toContain('event_4');
        expect(prompt.user).toContain('event_11');
    });
});

describe('corps prompt event context', () => {
    it('includes event context in corps prompt', () => {
        const state = makeMinimalState({
            military: {
                ...makeMinimalState().military,
                fired_event_ids: ['graz_accords_signed'],
                event_aggression_modifiers: [
                    { faction: 'RS', delta: 0.2, expires_turn: 18 },
                ],
                event_constraints: {
                    operation_blocks: [
                        { faction: 'RS', expires_turn: 16, reason: 'truce' },
                    ],
                    doctrine_overrides: [
                        { faction: 'RS', forced_stance: 'defensive', expires_turn: 14, reason: 'orders' },
                    ],
                },
            },
        } as Partial<GameState>);
        const directive = { stance: 'offensive' as const };
        const prompt = buildCorpsPrompt(state, 'RS', 'vrs_1st_krajina', directive);
        expect(prompt.user).toContain('Recent events fired: graz_accords_signed');
        expect(prompt.user).toContain('Aggression modifier: +0.2 (expires turn 18)');
        expect(prompt.user).toContain('OPERATION BLOCKED: truce until turn 16');
        expect(prompt.user).toContain('FORCED STANCE: defensive until turn 14');
    });
});
