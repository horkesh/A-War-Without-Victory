// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { OpsPlanState } from '../../src/ui/map/components/ops_modal/types.js';
import { PlanPhase } from '../../src/ui/map/components/ops_modal/PlanPhase.js';
import { ObjectiveList } from '../../src/ui/map/components/ops_modal/ObjectiveList.js';
import { getOpsPhaseAdvanceMessage, getOpsPhaseGateMessage } from '../../src/ui/map/components/ops_modal/phaseGate.js';
import { chooseOpsPlanningSector } from '../../src/ui/map/components/ops_modal/stagingChoice.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

function makeState(): LoadedGameState {
    return {
        label: 'Turn 0',
        turn: 0,
        phase: 'war',
        formations: [
            { id: 'rs_1st_krajina', name: '1st Krajina Corps', kind: 'corps', faction: 'RS', status: 'active', createdTurn: 0, tags: [] },
            {
                id: 'brigade_alpha',
                name: 'Alpha Brigade',
                kind: 'brigade',
                corps_id: 'rs_1st_krajina',
                faction: 'RS',
                status: 'active',
                createdTurn: 0,
                tags: [],
                personnel: 1800,
                cohesion: 75,
                fatigue: 4,
                readiness: 'good',
                location_osid: 'own_front',
                composition: { infantry: 1800, tanks: 4, artillery: 6, aa_systems: 0 },
            },
        ],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RS',
    } as unknown as LoadedGameState;
}

describe('ops planning target discovery', () => {
    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('keeps Suggest Plan disabled until commander selection is available', () => {
        useGameStore.setState({ loadedGameState: makeState(), osidDisplayNames: null });

        render(createElement(PlanPhase, {
            plan: makePlan(),
            onUpdate: vi.fn(),
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
            centroidLookup: new Map(),
            availableObjectiveOsids: ['enemy_front'],
            canSuggestPlan: false,
        }));

        expect(screen.getByRole('button', { name: /suggest plan/i }).hasAttribute('disabled')).toBe(true);
    });

    it('Suggest Plan deterministically adds the first available objective, main effort, and brigade allocation', () => {
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { own_front: 'Own Front', enemy_front: 'Enemy Front' },
        });
        const onUpdate = vi.fn();
        const lookup = new Map<string, [number, number]>([
            ['own_front', [17.5, 44.0]],
            ['enemy_front', [17.55, 44.05]],
        ]);

        render(createElement(PlanPhase, {
            plan: makePlan(),
            onUpdate,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
            centroidLookup: lookup,
            availableObjectiveOsids: ['enemy_front'],
            canSuggestPlan: true,
        }));

        fireEvent.click(screen.getByRole('button', { name: /suggest plan/i }));

        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
            schwerpunktOsid: 'enemy_front',
            axes: [
                expect.objectContaining({
                    objectives: ['enemy_front'],
                    brigadeIds: ['brigade_alpha'],
                }),
            ],
        }));
        expect(screen.getByText(/suggested enemy front/i)).toBeTruthy();
    });

    it('Suggest Plan is idempotent when the selected objective is no longer in the available list', () => {
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { own_front: 'Own Front', enemy_front: 'Enemy Front' },
        });
        const onUpdate = vi.fn();
        const planned = makePlan({
            schwerpunktOsid: 'enemy_front',
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
        });
        const lookup = new Map<string, [number, number]>([
            ['own_front', [17.5, 44.0]],
            ['enemy_front', [17.55, 44.05]],
        ]);

        render(createElement(PlanPhase, {
            plan: planned,
            onUpdate,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
            centroidLookup: lookup,
            availableObjectiveOsids: [],
            canSuggestPlan: true,
            canAdvanceToG2: true,
        }));

        fireEvent.click(screen.getByRole('button', { name: /suggest plan/i }));

        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
            schwerpunktOsid: 'enemy_front',
            axes: [
                expect.objectContaining({
                    objectives: ['enemy_front'],
                    brigadeIds: ['brigade_alpha'],
                }),
            ],
        }));
    });

    it('ObjectiveList shows the live count of available enemy objectives', () => {
        render(createElement(ObjectiveList, {
            plan: makePlan(),
            onUpdate: vi.fn(),
            osidDisplayNames: null,
            onAdvance: vi.fn(),
            availableObjectiveCount: 3,
        }));

        expect(screen.getByText('Available')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('phase gate messages name the missing prerequisite instead of silently rejecting the tab', () => {
        expect(getOpsPhaseGateMessage('plan', false, makePlan(), false)).toBe('Select a commander first.');
        expect(getOpsPhaseGateMessage('g2_assessment', true, makePlan(), false))
            .toBe('Add at least 1 objective and 1 brigade to your axis.');

        const planned = makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
        });
        expect(getOpsPhaseGateMessage('authorize', true, planned, false)).toBe('Review the G-2 assessment first.');
        expect(getOpsPhaseGateMessage('g2_assessment', true, planned, false)).toBeNull();
        expect(getOpsPhaseAdvanceMessage('plan', true, makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: [], objectives: ['enemy_front'] }],
        }), false)).toBe('Add at least 1 objective and 1 brigade to your axis.');
    });

    it('CorpsDetail defaults ops planning to a forward sector before falling back to index zero', () => {
        const rear = {
            sector_id: 'sector:rear',
            corps_id: 'rs_1st_krajina',
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            rear_brigade_ids: [],
            sub_segments: [{ friendly_osids: ['rear'], enemy_osids: [] }],
        };
        const front = {
            sector_id: 'sector:front',
            corps_id: 'rs_1st_krajina',
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            rear_brigade_ids: [],
            sub_segments: [{ friendly_osids: ['own_front'], enemy_osids: ['enemy_front'] }],
        };

        expect(chooseOpsPlanningSector([rear, front])?.sector_id).toBe('sector:front');
        expect(chooseOpsPlanningSector([rear])?.sector_id).toBe('sector:rear');
    });

    it('disables Plan-phase G-2 advance affordances until a brigade is assigned', () => {
        render(createElement(PlanPhase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: [], objectives: ['enemy_front'] }],
            }),
            onUpdate: vi.fn(),
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
            centroidLookup: new Map(),
            availableObjectiveOsids: [],
            canSuggestPlan: true,
            canAdvanceToG2: false,
        }));

        expect(screen.getAllByRole('button', { name: /g2 assessment/i }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    });

    it('wires available objectives through the live modal and map halo source', () => {
        const modalSource = readFileSync(
            resolve(process.cwd(), 'src/ui/map/components/ops_modal/OpsPlanningModal.tsx'),
            'utf8',
        );
        const mapSource = readFileSync(
            resolve(process.cwd(), 'src/ui/map/components/ops_modal/OpsMap.tsx'),
            'utf8',
        );

        expect(modalSource).toContain('availableObjectiveOsids={availableObjectiveOsids}');
        expect(modalSource).toContain('canSuggestPlan={hasCommander}');
        expect(mapSource).toContain("new ModalMapSource(map, 'ops-available-targets'");
        expect(mapSource).toContain('availableTargetsSourceRef.current?.setData');
    });
});
