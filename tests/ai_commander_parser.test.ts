// tests/ai_commander_parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseArmyResponse, parseCorpsResponse, parseAdvisorResponse } from '../src/sim/ai_commander/response_parser.js';

describe('response parser', () => {
    it('parseArmyResponse extracts valid army decision', () => {
        const json = JSON.stringify({
            corps_directives: { vrs_1st_krajina: { stance: 'offensive', priority: 'brcko' } },
            operation_decisions: { approve: ['corridor_92'], postpone: [], abort: [] },
            peace_plan_response: null,
            reserve_deployment: null,
            strategic_reasoning: 'Corridor must be secured.',
            briefing_text: 'The corridor is our lifeline.',
        });
        const result = parseArmyResponse(json, 'RS', 10);
        expect(result).not.toBeNull();
        expect(result!.corps_directives.vrs_1st_krajina.stance).toBe('offensive');
        expect(result!.strategic_reasoning).toContain('Corridor');
    });

    it('parseArmyResponse returns null for malformed JSON', () => {
        expect(parseArmyResponse('not json', 'RS', 10)).toBeNull();
    });

    it('parseArmyResponse returns null for missing required fields', () => {
        const json = JSON.stringify({ corps_directives: {} });
        expect(parseArmyResponse(json, 'RS', 10)).toBeNull();
    });

    it('parseArmyResponse clamps invalid stance to balanced', () => {
        const json = JSON.stringify({
            corps_directives: { vrs_1st_krajina: { stance: 'DESTROY_EVERYTHING' } },
            operation_decisions: { approve: [], postpone: [], abort: [] },
            peace_plan_response: null,
            reserve_deployment: null,
            strategic_reasoning: 'test',
            briefing_text: 'test',
        });
        const result = parseArmyResponse(json, 'RS', 10);
        expect(result!.corps_directives.vrs_1st_krajina.stance).toBe('balanced');
    });

    it('parseArmyResponse filters non-string array entries before persistence', () => {
        const json = JSON.stringify({
            corps_directives: {
                vrs_1st_krajina: {
                    stance: 'offensive',
                    hold_municipalities: ['brcko', 42, null],
                    offensive_targets: [{ osid: 'bad' }, 'op:brcko:brcko_1'],
                },
            },
            operation_decisions: {
                approve: ['corridor_92', 7],
                postpone: [false, 'sana_95'],
                abort: [{ id: 'bad' }, 'stale_op'],
            },
            peace_plan_response: null,
            reserve_deployment: null,
            strategic_reasoning: 'test',
            briefing_text: 'test',
        });
        const result = parseArmyResponse(json, 'RS', 10);

        expect(result!.operation_decisions.approve).toEqual(['corridor_92']);
        expect(result!.operation_decisions.postpone).toEqual(['sana_95']);
        expect(result!.operation_decisions.abort).toEqual(['stale_op']);
        expect(result!.corps_directives.vrs_1st_krajina.hold_municipalities).toEqual(['brcko']);
        expect(result!.corps_directives.vrs_1st_krajina.offensive_targets).toEqual(['op:brcko:brcko_1']);
    });

    it('parseCorpsResponse extracts valid corps decision', () => {
        const json = JSON.stringify({
            sector_stances: { sector_1: 'fortify' },
            operation_plan: null,
            brigade_movements: {},
            assessment: 'Sector is secure.',
        });
        const result = parseCorpsResponse(json, 'RS', 'vrs_1st_krajina', 10);
        expect(result).not.toBeNull();
        expect(result!.sector_stances.sector_1).toBe('fortify');
    });

    it('parseCorpsResponse clamps invalid sector stance', () => {
        const json = JSON.stringify({
            sector_stances: { sector_1: 'ATTACK_EVERYTHING' },
            operation_plan: null,
            brigade_movements: {},
            assessment: 'test',
        });
        const result = parseCorpsResponse(json, 'RS', 'vrs_1st_krajina', 10);
        expect(result!.sector_stances.sector_1).toBe('defend');
    });

    it('parseAdvisorResponse extracts recommendations', () => {
        const json = JSON.stringify({
            commander_name: 'Mladić',
            faction: 'RS',
            assessment: 'The situation is stable.',
            recommendations: [
                { priority: 1, action: 'Reinforce Brčko', reasoning: 'Corridor at risk' },
            ],
            context_type: 'situation_analysis',
        });
        const result = parseAdvisorResponse(json);
        expect(result).not.toBeNull();
        expect(result!.recommendations).toHaveLength(1);
        expect(result!.recommendations[0].action).toContain('Brčko');
    });

    it('handles JSON wrapped in markdown code blocks', () => {
        const wrapped = '```json\n{"corps_directives":{},"operation_decisions":{"approve":[],"postpone":[],"abort":[]},"peace_plan_response":null,"reserve_deployment":null,"strategic_reasoning":"test","briefing_text":"test"}\n```';
        const result = parseArmyResponse(wrapped, 'RS', 10);
        expect(result).not.toBeNull();
    });

    it('parseAdvisorResponse falls back to RBiH when faction is missing', () => {
        const json = JSON.stringify({
            assessment: 'situation report',
            recommendations: [],
            context_type: 'situation_analysis',
        });
        const result = parseAdvisorResponse(json);
        expect(result).not.toBeNull();
        expect(result!.faction).toBe('RBiH');
    });

    it('parseAdvisorResponse falls back to RBiH when faction is a non-canonical string', () => {
        const json = JSON.stringify({
            faction: 'NATO',
            assessment: 'situation report',
            recommendations: [],
            context_type: 'situation_analysis',
        });
        const result = parseAdvisorResponse(json);
        expect(result!.faction).toBe('RBiH');
    });

    it('parseAdvisorResponse falls back to RBiH when faction is a non-string truthy value', () => {
        const json = JSON.stringify({
            faction: { id: 'RS' },
            assessment: 'situation report',
            recommendations: [],
            context_type: 'situation_analysis',
        });
        const result = parseAdvisorResponse(json);
        expect(result!.faction).toBe('RBiH');
    });

    it('parseAdvisorResponse falls back to situation_analysis when context_type is missing', () => {
        const json = JSON.stringify({
            faction: 'RS',
            assessment: 'situation report',
            recommendations: [],
        });
        const result = parseAdvisorResponse(json);
        expect(result!.context_type).toBe('situation_analysis');
    });

    it('parseAdvisorResponse falls back to situation_analysis when context_type is invalid', () => {
        const json = JSON.stringify({
            faction: 'RS',
            assessment: 'situation report',
            recommendations: [],
            context_type: 'tactical_recon',
        });
        const result = parseAdvisorResponse(json);
        expect(result!.context_type).toBe('situation_analysis');
    });

    it('parseAdvisorResponse preserves valid operation_planning and peace_plan context types', () => {
        const planning = parseAdvisorResponse(JSON.stringify({
            faction: 'RS',
            assessment: 'a',
            recommendations: [],
            context_type: 'operation_planning',
        }));
        expect(planning!.context_type).toBe('operation_planning');

        const peace = parseAdvisorResponse(JSON.stringify({
            faction: 'HRHB',
            assessment: 'a',
            recommendations: [],
            context_type: 'peace_plan',
        }));
        expect(peace!.context_type).toBe('peace_plan');
    });
});
