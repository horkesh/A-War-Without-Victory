// @vitest-environment jsdom
import React, { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard.js';
import { CorpsCard } from '../../src/ui/map/components/CorpsCard.js';
import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import type { FormationView, LoadedGameState, NamedOfficerView, OperationView } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

const CORPS_ID = 'jna_herzegovina_command';
const OPERATION_NAME = 'Operation Herzegovina';
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
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 72,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: ['jna'],
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
        participating_brigade_count: 1,
        participating_brigade_ids: ['jna_nevesinje_garrison'],
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
        formations: [jnaCommand(), jnaTaskGroup()],
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
