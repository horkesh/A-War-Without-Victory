// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CorpsDetail } from '../../src/ui/map/components/CorpsDetail.js';
import { FormationDetail } from '../../src/ui/map/components/FormationDetail.js';
import { OrbatPanel } from '../../src/ui/map/components/OrbatPanel.js';
import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeOpeningCommandState(): LoadedGameState {
    return {
        label: 'Turn 0',
        turn: 0,
        phase: 'war',
        player_faction: 'RBiH',
        formations: [
            { id: 'arbih_3rd_corps', name: '3rd Corps', faction: 'RBiH', kind: 'corps', status: 'active', corpsStance: 'hold', personnel: 900, cohesion: 60, fatigue: 0 },
            { id: 'arbih_4th_corps', name: '4th Corps', faction: 'RBiH', kind: 'corps', status: 'active', corpsStance: 'hold', personnel: 0, cohesion: 60, fatigue: 0 },
            { id: 'arbih_3_bde', name: '3rd Corps Brigade', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'arbih_3rd_corps', personnel: 900, cohesion: 60, fatigue: 0 },
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
        turnSummaries: [],
        latestTurnSummary: null,
        corpsFrontSectors: [],
        operations: [],
        namedOfficerData: [
            {
                id: 'arbih_cikotic',
                name: 'Selmo Cikotic',
                faction: 'RBiH',
                rank: 'corps_commander',
                status: 'reserve',
                assigned_corps_id: null,
                home_corps_id: 'arbih_3rd_corps',
                pool_tier: 'tier_b',
                competence: 4,
                aggressiveness: 3,
                defensive_skill: 4,
                political_reliability: 3,
            },
            {
                id: 'arbih_hujdur',
                name: 'Midhad Hujdur',
                faction: 'RBiH',
                rank: 'corps_commander',
                status: 'reserve',
                assigned_corps_id: null,
                home_corps_id: 'arbih_4th_corps',
                pool_tier: 'tier_b',
                competence: 4,
                aggressiveness: 3,
                defensive_skill: 4,
                political_reliability: 3,
            },
        ],
        namedOfficerStateById: {
            arbih_cikotic: {
                officer_id: 'arbih_cikotic',
                status: 'reserve',
                assigned_corps_id: null,
                acting_commander: false,
                turns_in_command: 0,
                battles: 0,
                victories: 0,
            },
            arbih_hujdur: {
                officer_id: 'arbih_hujdur',
                status: 'reserve',
                assigned_corps_id: null,
                acting_commander: false,
                turns_in_command: 0,
                battles: 0,
                victories: 0,
            },
        },
    } as unknown as LoadedGameState;
}

afterEach(() => {
    cleanup();
    useGameStore.setState({
        loadedGameState: null,
        selectedArmyId: null,
        selectedCorpsId: null,
        selectedFormationId: null,
        selectedOrbatCorpsId: null,
        isOperationsPanelOpen: false,
    });
});

describe('commander read-model surfaces', () => {
    it('shows opening command in the ORBAT panel without seating the officer', () => {
        const gameState = makeOpeningCommandState();
        useGameStore.setState({ loadedGameState: gameState, selectedOrbatCorpsId: 'arbih_3rd_corps' });

        const { container } = render(React.createElement(OrbatPanel));

        expect(container.textContent).toContain('Selmo Cikotic');
        expect(container.textContent).toContain('Opening command');
        expect(gameState.namedOfficerStateById?.arbih_cikotic?.assigned_corps_id).toBeNull();
    });

    it('shows opening command in corps detail without replacing sim-state truth', () => {
        const gameState = makeOpeningCommandState();
        useGameStore.setState({ loadedGameState: gameState, selectedArmyId: 'RBiH', selectedCorpsId: 'arbih_4th_corps' });

        const { container } = render(React.createElement(CorpsDetail, { railSlot: 'primary' }));

        expect(container.textContent).toContain('Midhad Hujdur');
        expect(container.textContent).toContain('Opening command');
        expect(gameState.namedOfficerStateById?.arbih_hujdur?.assigned_corps_id).toBeNull();
    });

    it('shows opening command in formation detail for selected corps formations', () => {
        const gameState = makeOpeningCommandState();
        useGameStore.setState({ loadedGameState: gameState, selectedFormationId: 'arbih_3rd_corps' });

        const { container } = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

        expect(container.textContent).toContain('Selmo Cikotic');
        expect(container.textContent).toContain('Opening command');
        expect(container.textContent).not.toContain('[!]');
    });

    it('surfaces opening-command provenance on the Army HQ corps card face', () => {
        const gameState = makeOpeningCommandState();
        const corps = gameState.formations.find((formation) => formation.id === 'arbih_3rd_corps')!;
        const brigades = gameState.formations.filter((formation) => formation.corps_id === 'arbih_3rd_corps');

        const { container } = render(React.createElement(ArmyHQCorpsCard, {
            corps,
            brigades,
            sectors: [],
            operations: [],
            factionBattles: [],
            gameState,
            isExpanded: false,
            isCompressed: false,
            onToggleExpand: () => undefined,
        }));

        expect(container.textContent).toContain('Selmo Cikotic');
        expect(container.textContent).toContain('Opening command');
        expect(container.textContent).toContain('permanent assignment pending');
        expect(container.textContent).not.toContain('[!] UNASSIGNED');
        expect(gameState.namedOfficerStateById?.arbih_cikotic?.assigned_corps_id).toBeNull();
    });

    it('labels a non-synthetic corps commander source as unreported when officer data is absent', () => {
        const gameState = makeOpeningCommandState();
        delete (gameState as Partial<LoadedGameState>).namedOfficerData;
        delete (gameState as Partial<LoadedGameState>).namedOfficerStateById;
        const corps = gameState.formations.find((formation) => formation.id === 'arbih_3rd_corps')!;
        const brigades = gameState.formations.filter((formation) => formation.corps_id === 'arbih_3rd_corps');

        const { container } = render(React.createElement(ArmyHQCorpsCard, {
            corps,
            brigades,
            sectors: [],
            operations: [],
            factionBattles: [],
            gameState,
            isExpanded: false,
            isCompressed: false,
            onToggleExpand: () => undefined,
        }));

        expect(container.textContent).toContain('Commander record unreported');
        expect(container.textContent).not.toContain('[!] UNASSIGNED');
        expect(container.textContent).not.toContain('VACANCY DETECTED');
    });

    it('does not render opening-command assignment copy on later-turn corps surfaces', () => {
        const gameState = {
            ...makeOpeningCommandState(),
            turn: 8,
            label: 'Turn 8',
        } as LoadedGameState;
        useGameStore.setState({ loadedGameState: gameState, selectedFormationId: 'arbih_3rd_corps' });

        const { container } = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

        expect(container.textContent).not.toContain('Selmo Cikotic');
        expect(container.textContent).not.toContain('Opening command');
        expect(container.textContent).not.toContain('permanent assignment pending');
    });
});
