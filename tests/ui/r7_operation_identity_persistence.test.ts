// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../../src/state/game_state';
import { deserializeState, serializeState } from '../../src/state/serialize';
import { AuthorizePhase } from '../../src/ui/map/components/ops_modal/AuthorizePhase';
import type { OpsPlanState } from '../../src/ui/map/components/ops_modal/types';
import type { PredictionResult } from '../../src/ui/map/components/ops_modal/usePrediction';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { CorpsOperationOrderPayload } from '../../src/ui/map/desktop/useIPC';
import { setLocale, setQaLocale, type RuntimeLocale } from '../../src/ui/map/i18n';
import { useGameStore } from '../../src/ui/map/store/gameStore';

const require = createRequire(import.meta.url);
const { stageAuthoredOperation } = require('../../src/desktop/author_op_staging.cjs') as {
    stageAuthoredOperation: (
        state: GameState,
        payload: CorpsOperationOrderPayload,
    ) => { ok: boolean; error?: string };
};

const initialSaveBytes = readFileSync(
    'data/derived/startup/apr_1992_initial_save.json',
    'utf8',
);

const plan: OpsPlanState = {
    opName: 'Operation Sana',
    opType: 'sector_attack',
    tempo: 'standard',
    tolerance: 'victory',
    artilleryPreparation: false,
    schwerpunktOsid: '',
    axes: [{
        id: 'axis-main',
        name: 'Main axis',
        brigadeIds: ['arbih_101_mountain_brigade'],
        objectives: ['op:prijedor:prijedor'],
        stagingOsid: 'op:sanski_most:sanski_most',
    }],
    activeAxisId: 'axis-main',
    defaultStagingOsid: 'op:sanski_most:sanski_most',
};

const lowIntelPrediction: PredictionResult = {
    overall: {
        intelConfidence: 0.2,
        forceRatio: 0.9,
        estimatedCasualties: 400,
        predictedOutcome: 'stalemate',
        recommendedAction: 'delay',
    },
    perAxis: [],
};

function makeLoadedView(rawGameState: GameState): LoadedGameState {
    const corps = rawGameState.military.formations?.arbih_1st_corps;
    return {
        label: 'RBiH turn 0',
        turn: rawGameState.meta.turn,
        phase: rawGameState.meta.phase ?? 'war',
        formations: [{
            id: 'arbih_1st_corps',
            name: corps?.name ?? '1st Corps',
            kind: 'corps',
            faction: 'RBiH',
            readiness: 'ready',
            status: 'active',
            createdTurn: 0,
            tags: [],
        }],
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
        player_faction: 'RBiH',
        rawGameState,
    } satisfies LoadedGameState;
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
    Reflect.deleteProperty(window, 'awwv');
});

describe('R7 AuthorizePhase persisted operation identity', () => {
    it('keeps probe identity byte-identical through the renderer bridge, staging, and canonical save', async () => {
        const persistedNames: string[] = [];
        const persistedSaveBytes: string[] = [];

        for (const locale of ['en', 'bs', 'qps'] as const satisfies readonly RuntimeLocale[]) {
            if (locale === 'qps') setQaLocale(locale);
            else setLocale(locale);

            const canonicalState = deserializeState(initialSaveBytes);
            canonicalState.meta.player_faction = 'RBiH';
            let savedBytes = '';
            Object.defineProperty(window, 'awwv', {
                configurable: true,
                value: {
                    stageCorpsOperationOrder: async (payload: CorpsOperationOrderPayload) => {
                        const result = stageAuthoredOperation(canonicalState, payload);
                        if (result.ok) savedBytes = serializeState(canonicalState);
                        return result;
                    },
                    stageAssignOperationCommander: async () => ({ ok: true }),
                },
            });
            useGameStore.setState({
                loadedGameState: makeLoadedView(canonicalState),
                osidDisplayNames: null,
            });

            render(createElement(AuthorizePhase, {
                plan,
                prediction: lowIntelPrediction,
                corpsId: 'arbih_1st_corps',
                officerId: null,
                originSectorId: null,
            }));

            vi.useFakeTimers();
            fireEvent.click(screen.getByTestId('ops-planning-authorize-probe'));
            await act(async () => vi.advanceTimersByTimeAsync(1_500));
            vi.useRealTimers();

            expect(savedBytes.length).toBeGreaterThan(0);
            const saved = deserializeState(savedBytes);
            const persistedName = saved.military.corps_command?.arbih_1st_corps
                ?.pending_authored_op?.def.name;
            expect(persistedName).toBe('Operation Sana (Probe)');
            persistedNames.push(persistedName ?? '');
            persistedSaveBytes.push(savedBytes);

            cleanup();
            Reflect.deleteProperty(window, 'awwv');
        }

        expect(new Set(persistedNames)).toEqual(new Set(['Operation Sana (Probe)']));
        expect(new Set(persistedSaveBytes).size).toBe(1);
    });
});
