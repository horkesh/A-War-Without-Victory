import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { OpsPlanState } from '../../src/ui/map/components/ops_modal/types.js';
import {
    getNextAxisId,
    hasOpsPlanningDraftAssignments,
} from '../../src/ui/map/components/ops_modal/opsPlanningDraft.js';

function makePlan(overrides: Partial<OpsPlanState> = {}): OpsPlanState {
    return {
        opName: 'Operacija Test',
        opType: 'sector_attack',
        tempo: 'standard',
        tolerance: 'costly_victory',
        artilleryPreparation: false,
        schwerpunktOsid: '',
        axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: [], objectives: [] }],
        activeAxisId: 'axis_1',
        defaultStagingOsid: 'own_front',
        ...overrides,
    };
}

describe('OpsPlanningModal draft discard guard', () => {
    it('treats assigned objectives or brigades as a dirty operations-planning draft', () => {
        expect(hasOpsPlanningDraftAssignments(makePlan())).toBe(false);
        expect(hasOpsPlanningDraftAssignments(makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: [], objectives: ['enemy_front'] }],
        }))).toBe(true);
        expect(hasOpsPlanningDraftAssignments(makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: [] }],
        }))).toBe(true);
    });

    it('derives the next axis id from the plan axes instead of module state', () => {
        expect(getNextAxisId([])).toBe('axis_1');
        expect(getNextAxisId([{ id: 'axis_1', name: 'Main Axis', brigadeIds: [], objectives: [] }])).toBe('axis_2');
        expect(getNextAxisId([
            { id: 'axis_1', name: 'Main Axis', brigadeIds: [], objectives: [] },
            { id: 'axis_3', name: 'Reserve Axis', brigadeIds: [], objectives: [] },
        ])).toBe('axis_4');
    });

    it('keeps discard confirmation and axis-id ownership wired in OpsPlanningModal source', () => {
        const source = readFileSync('src/ui/map/components/ops_modal/OpsPlanningModal.tsx', 'utf8');
        expect(source).not.toContain('let nextAxisCounter');
        expect(source).toContain('requestCloseOpsPlanning');
        expect(source).toContain('Discard operations draft?');
        expect(source).toContain('getNextAxisId');
    });
});
