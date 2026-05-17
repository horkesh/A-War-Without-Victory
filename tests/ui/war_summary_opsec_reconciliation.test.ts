// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState, OperationView } from '../../src/ui/map/data/types.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
    useIPC: () => ({ stageConvoyDecision: vi.fn() }),
}));

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { SituationTab } = await import('../../src/ui/map/components/SituationTab');

beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

function makeOperation(name: string, overrides: Partial<OperationView> = {}): OperationView {
    return {
        corps_id: 'vrs_1st_krajina',
        corps_name: '1st Krajina Corps',
        faction: 'RS',
        name,
        type: 'sector_attack',
        phase: 'execution',
        participating_brigade_count: 1,
        started_turn: 4,
        ...overrides,
    };
}

function stateWithFilteredOpsecOperations(): LoadedGameState {
    return {
        ...makeMockLoadedGameState(),
        player_faction: 'RS',
        operations: [
            makeOperation('Una Push', { supply_readiness: 0.4 }),
            makeOperation('Vrbas Hold', { avg_cohesion: 60 }),
            makeOperation('Sana Guard', { failure_count: 0, supply_readiness: 0.9, avg_cohesion: 90 }),
            makeOperation('Drina Feint', { supply_readiness: 0.8, avg_cohesion: 85 }),
            makeOperation('Romanija Screen', { supply_readiness: 0.7, avg_cohesion: 80 }),
        ],
        corpsFrontSectors: [],
    } as LoadedGameState;
}

afterEach(() => {
    cleanup();
});

describe('War Summary OPSEC reconciliation', () => {
    it('labels operation health as a filtered count against all active operations', () => {
        render(createElement(SituationTab, { state: stateWithFilteredOpsecOperations(), focusSection: 'opsec' }));

        expect(screen.getByText('Flagged operation health (2 of 5 active operations)')).toBeTruthy();
        expect(screen.getByText('Una Push')).toBeTruthy();
        expect(screen.getByText('Vrbas Hold')).toBeTruthy();
    });
});
