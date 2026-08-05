// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';

const summarySource = readFileSync('src/ui/map/components/army_hq/WarSummaryContent.tsx', 'utf8');
const modalSource = readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8');

const storeState: { loadedGameState: LoadedGameState | null } = {
    loadedGameState: null,
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (s: typeof storeState) => unknown) => selector(storeState),
        { getState: () => storeState },
    ),
}));

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { WarSummaryContent } = await import('../../src/ui/map/components/army_hq/WarSummaryContent');

const viewportContracts = [
    { width: 1366, height: 768, objectiveColumns: 2 },
    { width: 1920, height: 1080, objectiveColumns: 2 },
    { width: 2560, height: 1440, objectiveColumns: 3 },
    { width: 3440, height: 1440, objectiveColumns: 3 },
] as const;

function expectedResponsiveColumns(width: number): number {
    if (width >= 2200) return 3;
    if (width >= 1280) return 2;
    return 1;
}

function stateWithUnavailableStrategicLevers(): LoadedGameState {
    const base = makeMockLoadedGameState();
    return {
        ...base,
        player_faction: 'RBiH',
        formations: [{
            id: 'arbih_general_staff',
            faction: 'RBiH',
            name: 'General Staff ARBiH',
            kind: 'army_hq',
            readiness: 'ready',
            status: 'active',
            createdTurn: 0,
            tags: [],
        }],
        operations: undefined,
        pendingReserveRequests: undefined,
        pendingEventDecisions: undefined,
        pendingPeacePlan: undefined,
        pendingDayton: undefined,
        pendingCounterOffers: undefined,
    } as LoadedGameState;
}

describe('Army HQ responsive composition contract', () => {
    afterEach(() => {
        cleanup();
        storeState.loadedGameState = null;
    });

    it.each(viewportContracts)(
        'maps $width x $height to $objectiveColumns objective columns',
        ({ width, objectiveColumns }) => {
            expect(expectedResponsiveColumns(width)).toBe(objectiveColumns);
        },
    );

    it('uses the responsive two/three-column contract for overview and objective cards', () => {
        expect(summarySource).toContain('grid-cols-1 xl:grid-cols-2 min-[2200px]:grid-cols-3');
        expect(summarySource).toContain('xl:col-span-2 min-[2200px]:col-span-3');
        expect(summarySource.match(/grid-cols-1 xl:grid-cols-2 min-\[2200px\]:grid-cols-3/g)).toHaveLength(2);
    });

    it('uses the full canvas while bounding prose measure', () => {
        expect(summarySource).toContain('w-full min-w-0 max-w-none');
        expect(summarySource).not.toContain('max-w-[1100px]');
        expect(summarySource).toContain('max-w-prose');
    });

    it('prevents the Summary and Army HQ scroll owners from creating horizontal scroll', () => {
        expect(summarySource).toContain('w-full min-w-0 max-w-none overflow-x-clip');
        expect(modalSource).toContain('relative min-w-0 flex-1 overflow-y-auto overflow-x-clip px-3 pt-2 pb-3');
        expect(summarySource).not.toContain('overflow-x-auto');
    });

    it('renders one summary posture key and never embeds the repeated hold suffix', () => {
        expect(summarySource.match(/t\('warSummary\.posture\.hold'\)/g)).toHaveLength(1);
        expect(summarySource).not.toContain('hold present policy');
    });

    it('mounts one noninteractive posture before the complete objective grid', () => {
        storeState.loadedGameState = stateWithUnavailableStrategicLevers();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const posture = screen.getByRole('note');
        const section = screen.getByRole('region', { name: 'Strategic Objectives' });
        const objectives = within(section).getAllByRole('article');
        expect(objectives).toHaveLength(4);
        expect(within(posture).queryAllByRole('button')).toHaveLength(0);
        expect(within(posture).queryAllByRole('link')).toHaveLength(0);
        expect(posture.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(within(section).queryAllByRole('button')).toHaveLength(0);
        expect(within(section).getAllByTestId('strategic-objective-no-filed-action')).toHaveLength(4);
    });
});
