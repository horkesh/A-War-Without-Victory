// @vitest-environment jsdom
/**
 * Verdict Load Save ownership regression.
 *
 * The real VerdictScreen footer control must hand a successful desktop dialog
 * result to App's existing campaign-replacement callback exactly once. It must
 * not apply the returned state itself, and it must not expose an enabled
 * control when no replacement owner was supplied.
 */

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCampaignReplacementCoordinator } from '../../src/ui/map/utils/campaignViewportLifecycle';
import { setLocale } from '../../src/ui/map/i18n';
import { VerdictScreen } from '../../src/ui/map/components/VerdictScreen';
import type { VerdictScreenProps } from '../../src/ui/map/components/VerdictScreen';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { FactionVerdict, GameVerdict } from '../../src/state/negotiation_types';

let storeState: Record<string, any> = { loadedGameState: null, wrappedOpen: false };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

// Real useIPC is intentionally used; each test installs the real preload
// bridge shape on window.awwv so the actual dialog method is exercised.

function makeFV(faction: string, overrides: Partial<FactionVerdict> = {}): FactionVerdict {
    return {
        faction,
        pyrrhic_score: 55,
        grade: 'B',
        grade_description: 'Acceptable compromise',
        capital_breakdown: {
            territory_controlled_pct: 30,
            territory_controlled_km2: 15000,
            military_casualties_inflicted: 20000,
            military_casualties_taken: 40000,
            operations_launched: 50,
            operations_successful: 15,
            refugees_created: 500000,
            refugees_received: 80000,
            civilians_under_protection: 150000,
            civilian_casualties_caused: 3000,
            peace_plans_accepted: [],
            peace_plans_rejected: [],
            enclaves_held: [],
            enclaves_lost: [],
            war_crimes_events: 0,
            combat_effective_brigades: 20,
        } as any,
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 50, grade: 'C' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 50, grade: 'C' },
            { dimension: 'international_standing', label: 'International Standing', score: 50, grade: 'C' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 50, grade: 'C' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 50, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 50, grade: 'C' },
        ],
        outcome_class: 'negotiated_escape' as any,
        condemnation_flags: [],
        ...overrides,
    };
}

function endgame(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'verdict-load-save-proof',
        turn: 188,
        phase: 'war',
        metadata: { turn: 188, date: '1995-10-01' },
        formations: [],
        militiaPools: [],
        controlBySettlement: { 'op:banja_luka:centar': 'RS' },
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
        gameOver: true,
        gameOutcome: 'timeout_stalemate',
        gameVerdict: {
            outcome_type: 'termination',
            outcome_label: 'Stalemate \u2014 Exhaustion',
            turn: 188,
            date: '1995-10-01',
            duration_weeks: 188,
            faction_verdicts: {
                RBiH: makeFV('RBiH', { grade: 'A', pyrrhic_score: 65, outcome_class: 'survival' as any }),
                RS: makeFV('RS', { grade: 'C', pyrrhic_score: 42, outcome_class: 'failure' as any }),
                HRHB: makeFV('HRHB', { outcome_class: 'negotiated_escape' as any }),
            },
        } as GameVerdict,
        ...overrides,
    } as LoadedGameState;
}

function installBridge(loadStateDialog: () => Promise<any>) {
    (window as Window & { awwv?: unknown }).awwv = { loadStateDialog };
}

function clickLoadSave() {
    fireEvent.click(screen.getByRole('button', { name: 'Load Save' }));
}

beforeEach(() => {
    setLocale('en');
    storeState = { loadedGameState: endgame(), wrappedOpen: false };
    delete (window as Window & { awwv?: unknown }).awwv;
});

afterEach(() => {
    cleanup();
    delete (window as Window & { awwv?: unknown }).awwv;
    setLocale('en');
});

describe('VerdictScreen Load Save ownership — full verdict', () => {
    it('applies the successful returned state once through the campaign replacement owner', async () => {
        const returnedState = JSON.stringify({ meta: { turn: 7, player_faction: 'RS' } });
        const loadStateDialog = vi.fn(async () => ({ ok: true, stateJson: returnedState }));
        installBridge(loadStateDialog);

        const onReplacementSucceeded = vi.fn();
        const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
        const loadSave = vi.fn(async (_stateJson: string) => undefined);
        const onLoadSaveState = vi.fn((stateJson: string) => owner.runReplacement(() => loadSave(stateJson)));
        const originalState = storeState.loadedGameState;

        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState }));

        clickLoadSave();

        await waitFor(() => expect(onLoadSaveState).toHaveBeenCalledTimes(1));
        expect(onLoadSaveState).toHaveBeenCalledWith(returnedState);
        expect(loadSave).toHaveBeenCalledTimes(1);
        expect(loadSave).toHaveBeenCalledWith(returnedState);
        expect(owner.appliedReservation()).toBe(1);
        expect(onReplacementSucceeded).toHaveBeenCalledTimes(1);
        expect(loadStateDialog).toHaveBeenCalledTimes(1);
        // The screen delegates; it must not replace store state itself.
        expect(storeState.loadedGameState).toBe(originalState);
    });
});

describe('VerdictScreen Load Save ownership — fallback verdict', () => {
    it('uses the same returned-state callback once in the no-verdict fallback', async () => {
        storeState.loadedGameState = endgame({ gameVerdict: undefined });
        const returnedState = JSON.stringify({ meta: { turn: 9, player_faction: 'HRHB' } });
        const loadStateDialog = vi.fn(async () => ({ ok: true, stateJson: returnedState }));
        installBridge(loadStateDialog);

        const onReplacementSucceeded = vi.fn();
        const owner = createCampaignReplacementCoordinator(onReplacementSucceeded);
        const loadSave = vi.fn(async (_stateJson: string) => undefined);
        const onLoadSaveState = vi.fn((stateJson: string) => owner.runReplacement(() => loadSave(stateJson)));

        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState }));

        // Prove the fallback surface, not the faction-report surface, is mounted.
        expect(document.querySelector('[data-awwv-endgame-surface="fallback"]')).toBeTruthy();
        clickLoadSave();

        await waitFor(() => expect(onLoadSaveState).toHaveBeenCalledTimes(1));
        expect(onLoadSaveState).toHaveBeenCalledWith(returnedState);
        expect(loadSave).toHaveBeenCalledTimes(1);
        expect(owner.appliedReservation()).toBe(1);
        expect(onReplacementSucceeded).toHaveBeenCalledTimes(1);
    });
});

describe('VerdictScreen Load Save ownership — pending and rejection behavior', () => {
    it('guards a deferred double click and releases busy in finally', async () => {
        let resolveDialog!: (value: { ok: boolean; stateJson: string }) => void;
        const loadStateDialog = vi.fn(() => new Promise<{ ok: boolean; stateJson: string }>((resolve) => {
            resolveDialog = resolve;
        }));
        installBridge(loadStateDialog);
        const onLoadSaveState = vi.fn(async (_stateJson: string) => undefined);

        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState }));

        clickLoadSave();
        clickLoadSave();

        await waitFor(() => expect(loadStateDialog).toHaveBeenCalledTimes(1));
        expect((screen.getByRole('button', { name: 'Load Save' }) as HTMLButtonElement).disabled).toBe(true);

        resolveDialog({ ok: true, stateJson: '{"meta":{"turn":10}}' });
        await waitFor(() => expect(onLoadSaveState).toHaveBeenCalledTimes(1));
        expect((screen.getByRole('button', { name: 'Load Save' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it.each([
        ['cancel', { ok: false, error: 'Canceled' }],
        ['error', { ok: false, error: 'Bad save' }],
        ['missing state', { ok: true }],
        ['empty state', { ok: true, stateJson: '' }],
        ['whitespace state', { ok: true, stateJson: '   ' }],
    ])('does not invoke the owner or clear the campaign on %s', async (_label, result) => {
        installBridge(vi.fn(async () => result));
        const originalState = storeState.loadedGameState;
        const onLoadSaveState = vi.fn(async (_stateJson: string) => undefined);

        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState }));

        clickLoadSave();

        await waitFor(() => expect(screen.getByRole('button', { name: 'Load Save' })).toBeTruthy());
        await Promise.resolve();
        expect(onLoadSaveState).not.toHaveBeenCalled();
        expect(storeState.loadedGameState).toBe(originalState);
    });

    it('does not invoke the owner or clear the campaign when the dialog rejects', async () => {
        installBridge(vi.fn(async () => { throw new Error('dialog failed'); }));
        const originalState = storeState.loadedGameState;
        const onLoadSaveState = vi.fn(async (_stateJson: string) => undefined);
        const onLoadSaveError = vi.fn();

        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState, onLoadSaveError }));

        clickLoadSave();

        await waitFor(() => expect(onLoadSaveError).toHaveBeenCalledWith('dialog failed'));
        expect(onLoadSaveState).not.toHaveBeenCalled();
        expect(storeState.loadedGameState).toBe(originalState);
        expect((screen.getByRole('button', { name: 'Load Save' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('reports a callback failure without retrying the replacement', async () => {
        installBridge(vi.fn(async () => ({ ok: true, stateJson: '{"meta":{"turn":11}}' })));
        const onLoadSaveState = vi.fn(async (_stateJson: string) => {
            throw new Error('loadSave rejected');
        });
        const onLoadSaveError = vi.fn();

        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState, onLoadSaveError }));

        clickLoadSave();

        await waitFor(() => expect(onLoadSaveError).toHaveBeenCalledWith('loadSave rejected'));
        await Promise.resolve();
        expect(onLoadSaveState).toHaveBeenCalledTimes(1);
        expect((screen.getByRole('button', { name: 'Load Save' }) as HTMLButtonElement).disabled).toBe(false);
    });
});

describe('VerdictScreen Load Save ownership — control availability', () => {
    it('does not expose a Load Save control without desktop IPC', () => {
        render(createElement<VerdictScreenProps>(VerdictScreen, { onLoadSaveState: vi.fn() }));
        expect(screen.queryByRole('button', { name: 'Load Save' })).toBeNull();
    });

    it('does not expose a dead Load Save control when desktop IPC has no replacement owner', () => {
        const loadStateDialog = vi.fn(async () => ({ ok: true, stateJson: '{"meta":{"turn":12}}' }));
        installBridge(loadStateDialog);
        render(createElement<VerdictScreenProps>(VerdictScreen));
        expect(screen.queryByRole('button', { name: 'Load Save' })).toBeNull();
    });

    it('does not expose a dead fallback Load Save control when desktop IPC has no replacement owner', () => {
        storeState.loadedGameState = endgame({ gameVerdict: undefined });
        const loadStateDialog = vi.fn(async () => ({ ok: true, stateJson: '{"meta":{"turn":13}}' }));
        installBridge(loadStateDialog);
        render(createElement<VerdictScreenProps>(VerdictScreen));
        expect(screen.queryByRole('button', { name: 'Load Save' })).toBeNull();
    });
});

describe('App wiring supplement', () => {
    it('passes the existing Main Menu load-game owner and loadError conduit to VerdictScreen', () => {
        const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
        expect(appSource).toMatch(/<VerdictScreen\s+onLoadSaveState=\{handleMainMenuLoadGame\}\s+onLoadSaveError=\{setLoadError\}\s*\/>/);
        expect(appSource).toMatch(/const handleMainMenuLoadGame = async \(json: unknown\)[\s\S]*?runCampaignReplacement\(\(\) => loadSave\(json\)\)/);
    });
});
