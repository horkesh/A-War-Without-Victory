// @vitest-environment jsdom
import React, { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard.js';
import { CorpsCard } from '../../src/ui/map/components/CorpsCard.js';
import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import { OperationsPanel } from '../../src/ui/map/components/OperationsPanel.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import type { FormationView, LoadedGameState, NamedOfficerView, OperationView } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

const CORPS_ID = 'jna_herzegovina_command';
const OPERATION_NAME = 'Operation Herzegovina';
const OPERATION_DISPLAY_NAME = 'JNA Operations in Herzegovina';
const COMMANDER_NAME = 'Slavko Lisica';

function jnaCommand(): FormationView {
    return {
        id: CORPS_ID,
        faction: 'RS',
        name: 'JNA Herzegovina Command',
        kind: 'corps_asset',
        readiness: 'ready',
        cohesion: 78,
        fatigue: 5,
        status: 'active',
        createdTurn: 0,
        tags: ['synthetic_jna_command'],
        personnel: 0,
    };
}

function jnaTaskGroup(): FormationView {
    return {
        id: 'jna_nevesinje_garrison',
        faction: 'RS',
        name: 'JNA Nevesinje Garrison',
        kind: 'jna_phantom',
        readiness: 'ready',
        cohesion: 72,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: ['jna', 'jna_phantom'],
        personnel: 2400,
        corps_id: CORPS_ID,
        location_osid: 'op:nevesinje:sopilja',
        composition: {
            infantry: 2200,
            tanks: 12,
            artillery: 18,
            aa_systems: 0,
            tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
        },
    };
}

function jnaBilecaTaskGroup(): FormationView {
    return {
        ...jnaTaskGroup(),
        id: 'jna_bileca_garrison',
        name: 'JNA Bileca Garrison',
        personnel: 1700,
        location_osid: 'op:bileca:bileca_1',
    };
}

function lisica(): NamedOfficerView {
    return {
        id: 'vrs_lisica',
        name: COMMANDER_NAME,
        faction: 'RS',
        rank: 'corps_commander',
        competence: 4,
        aggressiveness: 4,
        defensive_skill: 3,
        political_reliability: 3,
        origin: 'jna',
        status: 'active',
        assigned_corps_id: null,
        acting_commander: false,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        assigned_operation: OPERATION_NAME,
    };
}

function operation(): OperationView {
    return {
        corps_id: CORPS_ID,
        corps_name: 'JNA Herzegovina Command',
        faction: 'RS',
        name: OPERATION_NAME,
        display_name: OPERATION_NAME,
        type: 'pre_planned',
        phase: 'planning',
        participating_brigade_count: 2,
        participating_brigade_ids: ['jna_nevesinje_garrison', 'jna_bileca_garrison'],
        objectives: ['op:nevesinje:nevesinje_1', 'op:bileca:bileca_1'],
        started_turn: 0,
        commander_officer_id: 'vrs_lisica',
    };
}

function loadedState(): LoadedGameState {
    const officer = lisica();
    return {
        label: 'turn 0',
        turn: 0,
        phase: 'war',
        metadata: { turn: 0, date: '1992-04-01' },
        formations: [jnaCommand(), jnaTaskGroup(), jnaBilecaTaskGroup()],
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
        corpsFrontSectors: [],
        operations: [operation()],
        namedOfficerData: [officer],
        namedOfficerStateById: {
            [officer.id]: {
                officer_id: officer.id,
                status: 'active',
                assigned_corps_id: null,
                acting_commander: false,
                turns_in_command: 0,
                battles: 0,
                victories: 0,
            },
        },
    } as LoadedGameState;
}

afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
});

describe('synthetic JNA command presentation', () => {
    it('routes command inspection to an operation task-force dossier without treating phantoms as fielded brigades', () => {
        useGameStore.setState({
            loadedGameState: loadedState(),
            osidDisplayNames: {
                'op:nevesinje:nevesinje_1': 'Nevesinje',
                'op:bileca:bileca_1': 'Bileca',
            },
        });

        render(createElement(React.Fragment, null,
            createElement(OOBSidebar),
            createElement(OperationsPanel),
        ));

        const inspectCommand = screen.getByRole('button', {
            name: /Inspect JNA Herzegovina Command command card/i,
        });
        expect(inspectCommand.getAttribute('aria-label')).toContain('0 fielded brigades');

        fireEvent.click(inspectCommand);

        expect(useGameStore.getState()).toMatchObject({
            selectedCorpsId: null,
            selectedOperationKey: `${CORPS_ID}|${OPERATION_NAME}`,
            isOperationsPanelOpen: true,
        });
        const dossier = screen.getByTestId('operation-task-force-dossier');
        expect(screen.getAllByText(OPERATION_DISPLAY_NAME).length).toBeGreaterThan(0);
        expect(dossier.textContent).toContain('Temporary operation task force');
        expect(dossier.textContent).toContain('2 operation participants');
        expect(dossier.textContent).toContain('4,100 reported personnel');
        expect(dossier.textContent).toContain('2 operation goals');
        expect(dossier.textContent).toContain(COMMANDER_NAME);
        expect(dossier.textContent).toContain('Temporary JNA/TO operation command');
        expect(dossier.textContent).toContain('No organic corps staff');
        expect(dossier.textContent).toContain('No permanent front sectors');
        expect(dossier.textContent).toContain('Scenario-authored grouping of JNA/TO actions; not a documented operation title.');
        expect(dossier.textContent).toContain('JNA Nevesinje Garrison');
        expect(dossier.textContent).toContain('JNA Bileca Garrison');
        expect(screen.queryByRole('button', { name: /Open Corps Orders/i })).toBeNull();
    });

    it('omits a withdrawn empty synthetic command while preserving its completed AAR', () => {
        const parsed = parseGameState({
            meta: { turn: 52, phase: 'war', player_faction: 'RS' },
            military: {
                formations: {
                    [CORPS_ID]: {
                        ...jnaCommand(),
                        created_turn: 0,
                    },
                },
                militia_pools: {},
                event_flags: { jna_withdrawn: true },
            },
            political: { political_controllers: {} },
            operation_history: [{
                operation_id: 'preplanned:jna-herzegovina',
                operation_name: OPERATION_NAME,
                corps_id: CORPS_ID,
                faction: 'RS',
                started_turn: 0,
                ended_turn: 8,
                outcome: 'abandoned',
                objectives_targeted: [],
                objectives_captured: [],
                total_attacks: 0,
                duration_turns: 8,
                weekly_log: [],
            }],
        });

        expect(parsed.formations.some((formation) => formation.id === CORPS_ID)).toBe(false);
        expect(parsed.operationHistory?.map((aar) => aar.operation_name)).toContain(OPERATION_NAME);
    });

    it('does not render a withdrawn empty synthetic command card', () => {
        const state = loadedState();
        state.turn = 52;
        state.formations = [jnaCommand()];
        state.operations = [];
        state.eventFlags = { jna_withdrawn: true };

        const { container } = render(createElement(ArmyHQCorpsCard, {
            corps: state.formations[0],
            brigades: [],
            sectors: [],
            operations: [],
            factionBattles: [],
            gameState: state,
            isExpanded: true,
            isCompressed: false,
            onToggleExpand: vi.fn(),
        }));

        expect(container.textContent).not.toContain('JNA Herzegovina Command');
    });

    it('shows unreported Army HQ command source instead of vacancy copy when officer roster is missing', () => {
        const state = loadedState();
        delete (state as Partial<LoadedGameState>).namedOfficerData;
        delete (state as Partial<LoadedGameState>).namedOfficerStateById;
        useGameStore.setState({ loadedGameState: state });

        const { container } = render(createElement(ArmyHQCorpsCard, {
            corps: state.formations[0],
            brigades: [state.formations[1]],
            sectors: [],
            operations: state.operations ?? [],
            factionBattles: [],
            gameState: state,
            isExpanded: true,
            isCompressed: false,
            onToggleExpand: vi.fn(),
        }));

        expect(container.textContent).toContain('Commander record unreported');
        expect(container.textContent).not.toContain('[!] UNASSIGNED');
        expect(container.textContent).not.toContain('[!] VACANCY DETECTED');
    });

    it('shows Operation Herzegovina command context in Army HQ instead of vacancy copy', () => {
        const state = loadedState();
        useGameStore.setState({ loadedGameState: state });

        const { container } = render(createElement(ArmyHQCorpsCard, {
            corps: state.formations[0],
            brigades: [state.formations[1]],
            sectors: [],
            operations: state.operations ?? [],
            factionBattles: [],
            gameState: state,
            isExpanded: true,
            isCompressed: false,
            onToggleExpand: vi.fn(),
        }));

        expect(screen.getAllByText(COMMANDER_NAME).length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Operation commander');
        expect(container.textContent).toContain('JNA/TO temporary command staff');
        expect(container.textContent).not.toContain('[!] UNASSIGNED');
        expect(container.textContent).not.toContain('[!] VACANCY DETECTED');
    });

    it('lets the OOB corps card label the synthetic command without generic forming copy', () => {
        const { container } = render(createElement(CorpsCard, {
            corpsId: CORPS_ID,
            corpsName: 'JNA Herzegovina Command',
            brigades: [jnaTaskGroup()],
            faction: 'RS',
            stance: 'balanced',
            commanderName: COMMANDER_NAME,
            commanderLabel: 'Operation commander',
            commanderDetail: `JNA/TO temporary command staff - ${OPERATION_NAME}`,
            activeOperationName: OPERATION_NAME,
            activeOperationPhase: 'planning',
        } as React.ComponentProps<typeof CorpsCard>));

        expect(screen.getAllByText(COMMANDER_NAME).length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Operation commander');
        expect(container.textContent).toContain('JNA/TO temporary command staff');
        expect(container.textContent).not.toContain('Command forming');
    });

    it('wires OOBSidebar through the synthetic JNA operation commander read model', () => {
        useGameStore.setState({ loadedGameState: loadedState() });

        const { container } = render(createElement(OOBSidebar));

        expect(screen.getAllByText(COMMANDER_NAME).length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Operation commander');
        expect(container.textContent).toContain('JNA/TO temporary command staff');
        expect(container.textContent).not.toContain('Command forming');
    });
});
