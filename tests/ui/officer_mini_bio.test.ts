// @vitest-environment jsdom

import fs from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState, NamedOfficerView } from '../../src/ui/map/data/types.js';

function makeOfficer(overrides: Partial<NamedOfficerView> = {}): NamedOfficerView {
    return {
        id: 'officer_test',
        name: 'Test Commander',
        faction: 'RS',
        rank: 'army_commander',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 4,
        political_reliability: 4,
        origin: 'jna',
        status: 'active',
        assigned_corps_id: null,
        acting_commander: false,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        ...overrides,
    };
}

function makeLoadedState(officer: NamedOfficerView): LoadedGameState {
    return {
        label: 'RS turn 2',
        turn: 2,
        phase: 'war',
        formations: [
            { id: 'rs_main_staff', faction: 'RS', name: 'Main Staff', kind: 'army_hq', readiness: 'ready', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 0, tags: [] },
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
        corpsFrontSectors: [],
        operations: [],
        factionReserves: { RS: { generalSupply: 80, heavyMunitions: 70 } },
        namedOfficerData: [officer],
        namedOfficerStateById: {
            [officer.id]: {
                officer_id: officer.id,
                status: 'active',
                assigned_corps_id: officer.assigned_corps_id,
                acting_commander: false,
                turns_in_command: 0,
                battles: 0,
                victories: 0,
            },
        },
    } as LoadedGameState;
}

describe('officer mini-bio UI', () => {
    beforeEach(() => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            armyHQOpen: true,
            armyHQTab: 'briefing',
            selectedArmyId: 'RS',
        });
    });

    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('renders compact mini-bio rows in Army HQ for the selected army commander', () => {
        const officer = makeOfficer({
            bio_short: 'JNA-trained officer assigned to an opening army command.',
            command_style: 'Methodical staff work',
            known_for: 'Opening army command',
            political_alignment_note: 'Regular command hierarchy.',
        });
        useGameStore.setState({ loadedGameState: makeLoadedState(officer) });

        render(createElement(ArmyHQModal));

        expect(screen.getByText('JNA-trained officer assigned to an opening army command.')).toBeTruthy();
        expect(screen.getByText('Methodical staff work')).toBeTruthy();
        expect(screen.getByText('Opening army command')).toBeTruthy();
        expect(screen.getByText('Regular command hierarchy.')).toBeTruthy();
    });

    it('shows safe fallback copy when an unknown Army HQ commander has no authored mini-bio', () => {
        useGameStore.setState({ loadedGameState: makeLoadedState(makeOfficer({ bio_short: undefined })) });

        render(createElement(ArmyHQModal));

        expect(screen.getByText('Service record pending staff review.')).toBeTruthy();
    });

    it('wires OOB commander rows to the same authored mini-bio fields', () => {
        const source = fs.readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');

        expect(source).toContain('commander.bio_short');
        expect(source).toContain('commander.command_style');
        expect(source).toContain("t('oob.serviceRecordPending')");
    });
});
