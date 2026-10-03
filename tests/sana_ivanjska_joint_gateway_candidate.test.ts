import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SANA_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';

const krupaAxis = SANA_95_OPPORTUNITY.axes.find((axis) => axis.axis_id === 'sana_krupa')!;
const sanskiAxis = SANA_95_OPPORTUNITY.axes.find((axis) => axis.axis_id === 'sana_sanski_most_kljuc')!;
const ivanjska = 'op:bosanska_krupa:ivanjska_2';
const otoka = 'op:bosanska_krupa:otoka_2';
const donjiDubovik = 'op:bosanska_krupa:donji_dubovik_2';

function hasGraphEdge(a: string, b: string): boolean {
    const graph = JSON.parse(readFileSync(
        'data/derived/operational/operational_contact_graph.json',
        'utf8',
    )) as { edges: Array<{ a: string; b: string }> };
    return graph.edges.some((edge) =>
        (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
}

function axis(axisId: string, brigades: string[], objectives: string[]) {
    return {
        axis_id: axisId,
        name: axisId,
        assigned_brigades: brigades,
        objectives,
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 1,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    };
}

describe('Sana Ivanjska joint gateway candidate', () => {
    it('uses the friendly Otoka gateway and advances both axes after the shared capture', () => {
        expect(sanskiAxis.staging_osid).toBe(otoka);
        expect(krupaAxis.objectives[0]).toBe(ivanjska);
        expect(sanskiAxis.objectives[0]).toBe(krupaAxis.objectives[0]);
        expect(sanskiAxis.objectives.slice(0, 2)).toEqual([ivanjska, donjiDubovik]);
        expect(SANA_95_OPPORTUNITY.planning_duration).toBe(5);
        expect(hasGraphEdge(otoka, ivanjska)).toBe(true);
        expect(hasGraphEdge(ivanjska, donjiDubovik)).toBe(true);
        for (let index = 1; index < sanskiAxis.objectives.length; index++) {
            expect(hasGraphEdge(sanskiAxis.objectives[index - 1], sanskiAxis.objectives[index])).toBe(true);
        }
        expect(new Set(SANA_95_OPPORTUNITY.axes.flatMap((candidate) => candidate.brigades)).size)
            .toBe(SANA_95_OPPORTUNITY.axes.reduce((count, candidate) => count + candidate.brigades.length, 0));

        const state = {
            meta: { turn: 180, phase: 'war', seed: 'sana-ivanjska-joint-gateway' },
            military: {
                formations: {
                    rbih_corps: { id: 'rbih_corps', faction: 'RBiH', kind: 'corps', status: 'active' },
                    krupa_brigade: { id: 'krupa_brigade', faction: 'RBiH', kind: 'brigade', status: 'active',
                        corps_id: 'rbih_corps', location_osid: otoka, posture: 'hold' },
                    sanski_brigade: { id: 'sanski_brigade', faction: 'RBiH', kind: 'brigade', status: 'active',
                        corps_id: 'rbih_corps', location_osid: otoka, posture: 'hold' },
                },
                corps_command: {
                    rbih_corps: {
                        active_operations: [{
                            name: 'Shared Ivanjska Test', type: 'sector_attack', phase: 'execution',
                            participating_brigades: ['krupa_brigade', 'sanski_brigade'],
                            objectives: [ivanjska, donjiDubovik], current_objective_index: 0,
                            axes: [
                                axis('krupa', ['krupa_brigade'], [ivanjska]),
                                axis('sanski', ['sanski_brigade'], [ivanjska, donjiDubovik]),
                            ],
                        }],
                    },
                },
            },
            // Ivanjska is already RBiH here: this is the post-capture convergence
            // gate, not a synthetic direct-flip or hostile-battle claim.
            political: { political_controllers: { [otoka]: 'RBiH', [ivanjska]: 'RBiH', [donjiDubovik]: 'RS' } },
        } as any;

        updateSectorOffensiveResults(state);

        const axes = state.military.corps_command.rbih_corps.active_operations[0].axes;
        expect(axes[0].current_objective_index).toBe(1);
        expect(axes[1].current_objective_index).toBe(1);
        expect(axes[1].objectives[axes[1].current_objective_index]).toBe(donjiDubovik);
        expect(state.political.political_controllers[donjiDubovik]).toBe('RS');
    });
});
