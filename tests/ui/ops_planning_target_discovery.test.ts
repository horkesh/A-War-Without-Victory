// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { FormationView, LoadedGameState, NamedOfficerView } from '../../src/ui/map/data/types.js';
import type { OpsPlanState } from '../../src/ui/map/components/ops_modal/types.js';
import { CommanderPhase } from '../../src/ui/map/components/ops_modal/CommanderPhase.js';
import { PlanPhase } from '../../src/ui/map/components/ops_modal/PlanPhase.js';
import { PlanParameters } from '../../src/ui/map/components/ops_modal/PlanParameters.js';
import { ObjectiveList } from '../../src/ui/map/components/ops_modal/ObjectiveList.js';
import { G2Phase } from '../../src/ui/map/components/ops_modal/G2Phase.js';
import { AuthorizePhase } from '../../src/ui/map/components/ops_modal/AuthorizePhase.js';
import { OpordDocument } from '../../src/ui/map/components/ops_modal/OpordDocument.js';
import type { PredictionResult } from '../../src/ui/map/components/ops_modal/usePrediction.js';
import { getOpsPhaseAdvanceMessage, getOpsPhaseGateMessage } from '../../src/ui/map/components/ops_modal/phaseGate.js';
import { chooseOpsPlanningSector } from '../../src/ui/map/components/ops_modal/stagingChoice.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
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
        namedOfficerData: [
            {
                id: 'officer_alpha',
                name: 'Petar Testic',
                rank: 'colonel',
                faction: 'RS',
                status: 'active',
                assigned_corps_id: 'rs_1st_krajina',
                acting_commander: true,
                home_corps_id: 'rs_1st_krajina',
                compatible_corps_ids: ['rs_1st_krajina'],
                competence: 0.72,
                aggressiveness: 0.58,
                operations_commanded: 2,
            },
            {
                id: 'officer_beta',
                name: 'Milan Testic',
                rank: 'major',
                faction: 'RS',
                status: 'active',
                home_corps_id: 'rs_1st_krajina',
                compatible_corps_ids: ['rs_1st_krajina'],
                competence: 0.62,
                aggressiveness: 0.44,
            },
        ],
    } as unknown as LoadedGameState;
}

function makeOpeningCommanderState(): LoadedGameState {
    const state = makeState();
    return {
        ...state,
        namedOfficerData: [
            {
                id: 'opening_corps_commander',
                name: 'Opening Commander',
                rank: 'corps_commander',
                faction: 'RS',
                status: 'active',
                home_corps_id: 'rs_1st_krajina',
                historical_corps_id: 'rs_1st_krajina',
                is_historical_start: true,
                pool_tier: 'starter',
                competence: 0.7,
                defensive_skill: 0.66,
                aggressiveness: 0.52,
            },
        ],
    } as unknown as LoadedGameState;
}

function makePrediction(overrides: Partial<PredictionResult['overall']> = {}): PredictionResult {
    return {
        overall: {
            intelConfidence: 0.8,
            forceRatio: 1.4,
            estimatedCasualties: 120,
            predictedOutcome: 'victory',
            recommendedAction: 'launch',
            ...overrides,
        },
        perAxis: [],
    };
}

function makeOfficer(overrides: Partial<NamedOfficerView> = {}): NamedOfficerView {
    return {
        id: 'officer_test',
        name: 'Test Officer',
        rank: 'major',
        faction: 'RS',
        status: 'active',
        competence: 0.5,
        aggressiveness: 0.5,
        defensive_skill: 0.5,
        political_reliability: 0.5,
        origin: 'test',
        assigned_corps_id: null,
        acting_commander: false,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        ...overrides,
    };
}

function makeCorps(overrides: Partial<FormationView> = {}): FormationView {
    return {
        id: 'rs_drina_corps',
        name: 'Drina Corps',
        kind: 'corps',
        faction: 'RS',
        status: 'active',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        ...overrides,
    };
}

describe('ops planning target discovery', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
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

    it('renders PlanPhase staging with the settlement display name instead of raw OSID', () => {
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { 'op:test:staging_1': 'Staging Ridge' },
        });

        const { container } = render(createElement(PlanPhase, {
            plan: makePlan({ defaultStagingOsid: 'op:test:staging_1' }),
            onUpdate: vi.fn(),
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
            centroidLookup: new Map(),
            availableObjectiveOsids: [],
            canSuggestPlan: true,
        }));

        expect(container.textContent).toContain('Staging Ridge');
        expect(container.textContent).not.toContain('op:test:staging_1');
    });

    it('localizes PlanPhase status chrome in BCS mode', () => {
        setLocale('bcs');
        useGameStore.setState({ loadedGameState: makeState(), osidDisplayNames: null });

        render(createElement(PlanPhase, {
            plan: makePlan(),
            onUpdate: vi.fn(),
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
            centroidLookup: new Map(),
            availableObjectiveOsids: [],
            canSuggestPlan: false,
            canAdvanceToG2: false,
        }));

        expect(screen.getByText('Status plana')).toBeTruthy();
        expect(screen.getByRole('button', { name: /predloži plan/i })).toBeTruthy();
        expect(screen.getAllByText('Osa').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Polazište').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Ciljevi').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Brigade').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /procjena G-2/i })).toBeTruthy();
        expect(screen.queryByText('Plan Status')).toBeNull();
    });

    it('localizes ObjectiveList empty-state chrome in BCS mode', () => {
        setLocale('bcs');

        render(createElement(ObjectiveList, {
            plan: makePlan(),
            onUpdate: vi.fn(),
            osidDisplayNames: null,
            onAdvance: vi.fn(),
            availableObjectiveCount: 3,
        }));

        expect(screen.getByText('Planiranje')).toBeTruthy();
        expect(screen.getByText('Dostupno')).toBeTruthy();
        expect(screen.getByText('Kliknite neprijateljsku teritoriju na karti za dodavanje ciljeva')).toBeTruthy();
        expect(screen.getByText('Polazište')).toBeTruthy();
        expect(screen.queryByText('Available')).toBeNull();
    });

    it('localizes OpsMap compact legend chrome in BCS mode', async () => {
        setLocale('bcs');
        Object.defineProperty(window.URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => 'blob:maplibre-worker'),
        });
        const { OpsMap } = await import('../../src/ui/map/components/ops_modal/OpsMap.js');

        const { container } = render(createElement(OpsMap, {
            corpsId: 'rs_1st_krajina',
            onOsidClick: vi.fn(),
            objectives: [],
            validTargetOsids: new Set<string>(),
            selectableOsids: new Set<string>(),
            stagingOsid: undefined,
            schwerpunktOsid: '',
            axes: [],
            faction: 'RS',
            enabled: true,
        }));

        const legendText = container.textContent ?? '';
        expect(legendText).toContain('Cilj');
        expect(legendText).toContain('Glavni napor');
        expect(legendText).toContain('Polazište');
        expect(legendText).toContain('Front korpusa');
        expect(legendText).toContain('Svijetlo = moguće izabrati');
        expect(legendText).toContain('Zatamnjeno = van dometa');
        expect(legendText).not.toContain('Objective');
        expect(legendText).not.toContain('Bright = selectable');
    });

    it('reuses exact existing OpsMap compact legend keys before adding compact-only keys', () => {
        const mapSource = readFileSync(
            resolve(process.cwd(), 'src/ui/map/components/ops_modal/OpsMap.tsx'),
            'utf8',
        );

        expect(mapSource).toContain("t('opsPlanning.legend.objective')");
        expect(mapSource).toContain("t('opsPlanning.phase.staging')");
        expect(mapSource).not.toContain('opsPlanning.compactLegend.objective');
        expect(mapSource).not.toContain('opsPlanning.compactLegend.staging');
    });

    it('routes the modal phase rail through i18n labels instead of hardcoded English labels', () => {
        const modalSource = readFileSync(
            resolve(process.cwd(), 'src/ui/map/components/ops_modal/OpsPlanningModal.tsx'),
            'utf8',
        );
        const typesSource = readFileSync(
            resolve(process.cwd(), 'src/ui/map/components/ops_modal/types.ts'),
            'utf8',
        );

        expect(modalSource).not.toContain('PHASE_LABELS[p]');
        expect(typesSource).not.toContain('PHASE_LABELS');
    });

    it('localizes G2Phase clipboard chrome in BCS mode', () => {
        setLocale('bcs');
        useGameStore.setState({ loadedGameState: makeState() });

        render(createElement(G2Phase, {
            plan: makePlan(),
            prediction: null,
            loading: false,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
        }));

        expect(screen.getByText('Snimak G-2')).toBeTruthy();
        expect(screen.getByText('Prije odobrenja')).toBeTruthy();
        expect(screen.getByText('Korpus')).toBeTruthy();
        expect(screen.getByText('Datum')).toBeTruthy();
        expect(screen.getByRole('button', { name: /^procjena$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /legenda karte/i })).toBeTruthy();
        expect(screen.getByText('Dovršite plan za izradu procjene')).toBeTruthy();
        const awaitingProceed = screen.getByRole('button', { name: /ceka se procjena/i });
        expect(awaitingProceed.hasAttribute('disabled')).toBe(true);
        expect(screen.queryByText('G2 Snapshot')).toBeNull();
    });

    it('renders G2 prediction failures as player-facing staff copy', () => {
        useGameStore.setState({ loadedGameState: makeState() });

        const { container } = render(createElement(G2Phase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: null,
            loading: false,
            error: 'Invalid prediction response from engine: raw_osid op:test:objective',
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('G-2 assessment unavailable');
        expect(copy).toContain('You can adjust the plan or continue to authorization without a live estimate.');
        expect(copy).not.toMatch(/Invalid prediction|engine|raw_osid|op:test:objective/i);
    });

    it('does not advance from G2 while the staff assessment is still unavailable', () => {
        useGameStore.setState({ loadedGameState: makeState() });
        const onAdvance = vi.fn();

        const { rerender } = render(createElement(G2Phase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: null,
            loading: true,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance,
        }));

        const loadingProceed = screen.getByRole('button', { name: /preparing assessment/i });
        expect(loadingProceed.hasAttribute('disabled')).toBe(true);
        fireEvent.click(loadingProceed);
        expect(onAdvance).not.toHaveBeenCalled();

        rerender(createElement(G2Phase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: null,
            loading: false,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance,
        }));

        const awaitingProceed = screen.getByRole('button', { name: /awaiting assessment/i });
        expect(awaitingProceed.hasAttribute('disabled')).toBe(true);
        expect(onAdvance).not.toHaveBeenCalled();
    });

    it('renders AuthorizePhase eligibility findings as player-safe staff copy', () => {
        const state = makeState();
        useGameStore.setState({
            loadedGameState: {
                ...state,
                rawGameState: {
                    meta: { turn: 0, player_faction: 'RS' },
                    military: {
                        command_authority: { current: 10 },
                        formations: {
                            rs_1st_krajina: {
                                id: 'rs_1st_krajina',
                                name: '1st Krajina Corps',
                                kind: 'corps',
                                faction: 'RS',
                                status: 'active',
                            },
                        },
                        corps_command: {
                            rs_1st_krajina: { active_operations: [] },
                        },
                    },
                },
            } as unknown as LoadedGameState,
            osidDisplayNames: null,
        });

        const { container } = render(createElement(AuthorizePhase, {
            plan: makePlan({
                axes: [{ id: 'axis_raw_1', name: 'Main Axis', brigadeIds: ['bde_raw_missing'], objectives: [] }],
            }),
            prediction: makePrediction(),
            corpsId: 'rs_1st_krajina',
            officerId: null,
            originSectorId: 'sector_1',
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('Assign at least one available brigade and one enemy-held objective.');
        expect(copy).toContain('Selected brigade is no longer available for this operation.');
        expect(copy).toContain('This operation cannot launch until the plan has a valid axis.');
        expect(copy).not.toMatch(/axis_raw_1|bde_raw_missing|formations|0 valid|would be dropped|axis_empty|op_empty|brigade_missing/i);
    });

    it('localizes AuthorizePhase action chrome in BCS mode', () => {
        setLocale('bcs');
        useGameStore.setState({ loadedGameState: makeState(), osidDisplayNames: null });

        const lowIntelPlan = makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
        });
        const { unmount } = render(createElement(AuthorizePhase, {
            plan: lowIntelPlan,
            prediction: makePrediction({ intelConfidence: 0.2 }),
            corpsId: 'rs_1st_krajina',
            officerId: null,
            originSectorId: 'sector_1',
        }));

        expect(screen.getByRole('button', { name: /narediti izviđanje/i })).toBeTruthy();
        expect(screen.getByText('Naredi izviđanje')).toBeTruthy();
        expect(screen.getByRole('button', { name: /odobri svejedno/i })).toBeTruthy();
        unmount();

        render(createElement(AuthorizePhase, {
            plan: lowIntelPlan,
            prediction: makePrediction({ intelConfidence: 0.8 }),
            corpsId: 'rs_1st_krajina',
            officerId: null,
            originSectorId: 'sector_1',
        }));

        expect(screen.getByRole('button', { name: /odobriti operaciju/i })).toBeTruthy();
        expect(screen.getByText('Odobri operaciju')).toBeTruthy();
        expect(screen.queryByText('Authorize Operation')).toBeNull();
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

    it('localizes phase gate messages in BCS mode', () => {
        setLocale('bcs');
        expect(getOpsPhaseGateMessage('plan', false, makePlan(), false)).toBe('Prvo izaberite komandanta.');
        expect(getOpsPhaseGateMessage('g2_assessment', true, makePlan(), false))
            .toBe('Dodajte najmanje 1 cilj i 1 brigadu na svoju osu.');
        expect(getOpsPhaseGateMessage('authorize', true, makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
        }), false)).toBe('Prvo pregledajte procjenu G-2.');
    });

    it('localizes PlanParameters chrome in BCS mode', () => {
        setLocale('bcs');
        render(createElement(PlanParameters, {
            plan: makePlan(),
            onUpdate: vi.fn(),
        }));

        expect(screen.getByText('Naziv')).toBeTruthy();
        expect(screen.getByText('Tip')).toBeTruthy();
        expect(screen.getByText('Kakva vrsta operacije?')).toBeTruthy();
        expect(screen.getByText('Tempo')).toBeTruthy();
        expect(screen.getByText('Brzina naspram gubitaka')).toBeTruthy();
        expect(screen.getByText('Tolerancija')).toBeTruthy();
        expect(screen.getByText('Kada brigade prestaju napadati?')).toBeTruthy();
        expect(screen.getByText('Podrška')).toBeTruthy();
        expect(screen.getByText('Prednapadna vatrena podrška')).toBeTruthy();
        expect(screen.getByText('Sektorski napad')).toBeTruthy();
        expect(screen.getByText('Uravnotežen pristup')).toBeTruthy();
        expect(screen.queryByText('What kind of operation?')).toBeNull();
    });

    it('localizes CommanderPhase chrome and officer metadata in BCS mode', () => {
        setLocale('bcs');
        useGameStore.setState({
            loadedGameState: makeState(),
            opsPlanningCorpsId: 'rs_1st_krajina',
        });

        render(createElement(CommanderPhase, { onAdvance: vi.fn() }));

        expect(screen.getByText('Izaberi operativnog komandanta')).toBeTruthy();
        expect(screen.getByText('Komanduje:')).toBeTruthy();
        expect(screen.getByText('ljudstva')).toBeTruthy();
        expect(screen.getByText('sektora')).toBeTruthy();
        expect(screen.getAllByText('Matični korpus').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Kompetencija').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Agresivnost').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Vrijeme pripreme:').length).toBeGreaterThan(0);
        expect(screen.getByText('2 operacije komandovao')).toBeTruthy();
        expect(screen.queryByText('Select Operations Commander')).toBeNull();
    });

    it('excludes active-but-forming brigades from commander-phase corps strength', () => {
        const state = makeState();
        state.formations.push({
            id: 'forming_brigade',
            name: 'Forming Brigade',
            kind: 'brigade',
            corps_id: 'rs_1st_krajina',
            faction: 'RS',
            status: 'active',
            readiness: 'forming',
            personnel: 900,
            cohesion: 40,
            fatigue: 0,
            createdTurn: 0,
            tags: [],
        } as FormationView);
        useGameStore.setState({
            loadedGameState: state,
            opsPlanningCorpsId: 'rs_1st_krajina',
        });

        const { container } = render(createElement(CommanderPhase, { onAdvance: vi.fn() }));

        expect(container.textContent ?? '').toMatch(/1[,.]800 personnel/);
        expect(container.textContent ?? '').not.toMatch(/2[,.]700 personnel/);
    });

    it('renders CommanderPhase unavailable reasons without raw staff shorthand', () => {
        const state = makeState();
        useGameStore.setState({
            loadedGameState: {
                ...state,
                formations: [
                    ...state.formations,
                    makeCorps(),
                ],
                namedOfficerData: [
                    makeOfficer({
                        id: 'officer_fallen',
                        name: 'Fallen Officer',
                        status: 'killed',
                    }),
                    makeOfficer({
                        id: 'officer_army',
                        name: 'Army Staff Officer',
                        rank: 'army_commander',
                    }),
                    makeOfficer({
                        id: 'officer_operation',
                        name: 'Assigned Officer',
                        rank: 'colonel',
                        assigned_operation: 'raw_operation_id',
                    }),
                    makeOfficer({
                        id: 'officer_corps',
                        name: 'Other Corps Officer',
                        rank: 'colonel',
                        assigned_corps_id: 'rs_drina_corps',
                        acting_commander: false,
                    }),
                    makeOfficer({
                        id: 'officer_acting',
                        name: 'Acting Other Officer',
                        rank: 'colonel',
                        assigned_corps_id: 'rs_drina_corps',
                        acting_commander: true,
                    }),
                ],
            },
            opsPlanningCorpsId: 'rs_1st_krajina',
        });

        const { container } = render(createElement(CommanderPhase, { onAdvance: vi.fn() }));

        const copy = container.textContent ?? '';
        const titles = Array.from(container.querySelectorAll('[title]'))
            .map((node) => node.getAttribute('title') ?? '')
            .join(' ');
        const allCopy = `${copy} ${titles}`;
        expect(allCopy).toContain('Fallen in service');
        expect(allCopy).toContain('Assigned to army headquarters');
        expect(allCopy).toContain('Assigned to another operation');
        expect(allCopy).toContain('Commanding Drina Corps');
        expect(allCopy).toContain('Acting commander for Drina Corps');
        expect(allCopy).not.toMatch(/\bKIA\b|\bARMY HQ\b|\bASSIGNED TO OP\b|\bCORPS CMDR\b|\bACTING CMDR\b|raw_operation_id/);
    });

    it('localizes CommanderPhase unavailable reasons in BCS mode', () => {
        setLocale('bcs');
        const state = makeState();
        useGameStore.setState({
            loadedGameState: {
                ...state,
                namedOfficerData: [
                    makeOfficer({
                        id: 'officer_fallen',
                        name: 'Pali Oficir',
                        status: 'killed',
                    }),
                    makeOfficer({
                        id: 'officer_operation',
                        name: 'Dodijeljeni Oficir',
                        rank: 'colonel',
                        assigned_operation: 'raw_operation_id',
                    }),
                ],
            },
            opsPlanningCorpsId: 'rs_1st_krajina',
        });

        const { container } = render(createElement(CommanderPhase, { onAdvance: vi.fn() }));

        const allCopy = container.textContent ?? '';
        expect(allCopy).toContain('Pao u sluzbi');
        expect(allCopy).toContain('Dodijeljen drugoj operaciji');
        expect(allCopy).not.toMatch(/\bKIA\b|\bASSIGNED TO OP\b|raw_operation_id/);
    });

    it('localizes OPORD body prose in BCS mode', () => {
        setLocale('bcs');
        render(createElement(OpordDocument, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: makePrediction(),
            commanderName: 'Petar Testic',
            corpsName: '1st Krajina Corps',
            faction: 'RS',
            date: '1992-04-01',
            isStamped: false,
            osidDisplayNames: { enemy_front: 'Enemy Front' },
        }));

        expect(screen.getByText(/ZADAĆA/)).toBeTruthy();
        expect(screen.getByText(/Sektorski napad/)).toBeTruthy();
        expect(screen.getByText(/Tempo: Standardno/)).toBeTruthy();
        expect(screen.getByText(/Minimalni ishod: Prihvati skupo/)).toBeTruthy();
        expect(screen.getByText(/Operativni komandant:/)).toBeTruthy();
        expect(screen.getByText(/Procijenjeni gubici: 120/)).toBeTruthy();
        expect(screen.queryByText(/Minimum outcome:/)).toBeNull();
    });

    it('localizes G2 narrative and map legend prose in BCS mode', () => {
        setLocale('bcs');
        useGameStore.setState({ loadedGameState: makeState() });

        render(createElement(G2Phase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: makePrediction(),
            loading: false,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
        }));

        expect(screen.getByText('Brza procjena')).toBeTruthy();
        expect(screen.getByText('Odnos snaga')).toBeTruthy();
        expect(screen.getByText('Preporuka')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /legenda karte/i }));

        expect(screen.getByText('Teritorija')).toBeTruthy();
        expect(screen.getByText('Frontovi')).toBeTruthy();
        expect(screen.getByText('Oznake operacije')).toBeTruthy();
        expect(screen.getByText('Cilj')).toBeTruthy();
        expect(screen.queryByText('Territory')).toBeNull();
    });

    it('renders G2 prediction values as player-facing English labels', () => {
        useGameStore.setState({ loadedGameState: makeState() });

        const { container } = render(createElement(G2Phase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: makePrediction({ predictedOutcome: 'costly_victory', recommendedAction: 'postpone' }),
            loading: false,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('Costly');
        expect(copy).toContain('Recommends Postpone');
        expect(copy).not.toContain('costly_victory');
        expect(copy).not.toContain('postpone');
    });

    it('renders G2 prediction values as player-facing BCS labels', () => {
        setLocale('bcs');
        useGameStore.setState({ loadedGameState: makeState() });

        const { container } = render(createElement(G2Phase, {
            plan: makePlan({
                axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
            }),
            prediction: makePrediction({ predictedOutcome: 'costly_victory', recommendedAction: 'abort' }),
            loading: false,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
        }));

        const copy = container.textContent ?? '';
        expect(copy).toContain('Skupo');
        expect(copy).toMatch(/Preporuka: otka/i);
        expect(copy).not.toContain('costly_victory');
        expect(copy).not.toContain('abort');
    });

    it('uses opening commander display in G2 assessment and OPORD when the corps commander is not seated', () => {
        useGameStore.setState({
            loadedGameState: makeOpeningCommanderState(),
            osidDisplayNames: { enemy_front: 'Enemy Front' },
        });
        const planned = makePlan({
            axes: [{ id: 'axis_1', name: 'Main Axis', brigadeIds: ['brigade_alpha'], objectives: ['enemy_front'] }],
        });

        const g2 = render(createElement(G2Phase, {
            plan: planned,
            prediction: makePrediction(),
            loading: false,
            error: null,
            corpsId: 'rs_1st_krajina',
            onAdvance: vi.fn(),
        }));

        expect(screen.getAllByText('Opening Commander').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText('N/A')).toBeNull();
        g2.unmount();

        render(createElement(AuthorizePhase, {
            plan: planned,
            prediction: makePrediction(),
            corpsId: 'rs_1st_krajina',
            officerId: null,
            originSectorId: 'sector_1',
        }));

        expect(screen.getAllByText('Opening Commander').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText('N/A')).toBeNull();
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
