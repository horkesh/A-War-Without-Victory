/**
 * Proof tests for gameStore.loadSave post-load UI state reset contract.
 *
 * Verifies that loading a save resets all selection, modal, and order state
 * that could hold stale references from a previous save. Also verifies
 * graceful error handling for malformed input.
 *
 * These are pure Zustand store tests — no React, no DOM, no IPC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

// ---------------------------------------------------------------------------
// Minimal valid GameState JSON that parseGameState can consume
// ---------------------------------------------------------------------------
function makeMinimalSaveJson(turn = 5): string {
    return JSON.stringify({
        schema_version: 2,
        meta: { turn, seed: 'test-reset', phase: 'war' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0.5, legitimacy: 0.5, control: 0.5, logistics: 0.5, exhaustion: 0.1 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 3,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
        },
        displacement: {
            displacement_event_log: [],
        },
    });
}

// ---------------------------------------------------------------------------
// Helper: set store to a "dirty" state simulating mid-session activity
// ---------------------------------------------------------------------------
function dirtyStoreState(): void {
    useGameStore.setState({
        selectedOsid: 'op:sarajevo:sarajevo_1',
        selectedFormationId: 'brig_101',
        selectedCorpsId: 'arbih_1st_corps',
        selectedCorpsFrontSectorId: 'sector_1',
        selectedArmyId: 'arbih_army',
        selectedArmyHqId: 'arbih_hq',
        selectedOperationKey: 'arbih_1st_corps|Op Test',
        selectedOrbatCorpsId: 'arbih_1st_corps',
        orderModeForFormation: 'attack',
        pendingAttackConfirmation: { attackerFormationId: 'brig_101', targetOsid: 'op:sarajevo:sarajevo_2' },
        armyHQOpen: true,
        armyHQExpandedCorpsId: 'arbih_1st_corps',
        armyHQExpandedSections: { logistics: true },
        armyHQOfficerSelectionCorpsId: 'arbih_1st_corps',
        opsPlanningModalOpen: true,
        opsPlanningCorpsId: 'arbih_1st_corps',
        opsPlanningOriginSectorId: 'sector_1',
        opsPlanningSelectedOfficerId: 'halilovic',
        commanderSelectionContext: { corpsId: 'arbih_1st_corps', operationName: 'Op Test' },
        operationBriefingContext: { corpsId: 'arbih_1st_corps', operationName: 'Op Test' },
        isOperationsPanelOpen: true,
        stagedOrders: [{ id: 'staged_0', type: 'attack', formationId: 'brig_101', targetOsid: 'op:sarajevo:sarajevo_2' }],
        peaceWarTransitionSeen: true,
        operationTargetOsids: ['op:sarajevo:sarajevo_2'],
        ghostLinePoint: [18.4, 43.8],
        flashOsid: 'op:sarajevo:sarajevo_1',
        hoveredOsids: ['op:sarajevo:sarajevo_1'],
        hoveredCorpsId: 'arbih_1st_corps',
        hoveredSectorId: 'sector_1',
        expandedStackOsid: 'op:sarajevo:sarajevo_1',
        tooltipTarget: { type: 'osid', id: 'op:sarajevo:sarajevo_1' },
        tooltipPosition: { x: 100, y: 200 },
        turnAftermath: {
            turn: 5,
            dateLabel: '6 May 1992',
            playerFaction: 'RBiH',
            headline: 'Test aftermath',
            narrativeLine: 'A quiet week is still a week of depletion, waiting, and staff work.',
            tone: 'quiet',
            territory: { friendlyNet: 0, gains: 0, losses: 0, notable: [] },
            combat: { battleCount: 0, friendlyBattleCount: 0, friendlyCasualties: 0, opposingCasualties: 0, territoryFlipsFromBattles: 0 },
            humanitarian: { displacedThisTurn: 0 },
            formations: { spawned: 0, destroyed: 0, ownSpawned: 0, ownDestroyed: 0 },
            supply: { ownSupplyDelta: 0, ownHeavyMunitionsDelta: 0 },
            cost: {
                friendlyMilitaryCasualties: 0,
                theaterMilitaryCasualties: 0,
                displacedThisTurn: 0,
                ownFormationsDestroyed: 0,
                ownSupplySpent: 0,
                ownHeavyMunitionsSpent: 0,
                severity: 'low',
                reasons: ['No major costs recorded'],
            },
            signals: [],
            judgment: {
                headline: 'No judgment recorded yet.',
                detail: 'No major cost, signal, action, or territorial change was recorded for this turn.',
                memoryTone: 'quiet',
                primarySurface: 'records',
                secondarySurface: 'codex',
            },
            nextActions: { actionableCount: 0, blockingCount: 0, opportunityCount: 0, reserveCount: 0, officerCount: 0, eventDecisionCount: 0, peaceCount: 0, topItems: [] },
        },
        turnAftermathOpen: true,
    });
}

describe('gameStore.loadSave — post-load UI state reset', () => {
    beforeEach(() => {
        // Reset store to clean initial state
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('resets all selection state after loading a save', async () => {
        dirtyStoreState();

        // Verify dirty state is set
        expect(useGameStore.getState().selectedOsid).toBe('op:sarajevo:sarajevo_1');
        expect(useGameStore.getState().selectedFormationId).toBe('brig_101');
        expect(useGameStore.getState().armyHQOpen).toBe(true);
        expect(useGameStore.getState().stagedOrders).toHaveLength(1);

        await useGameStore.getState().loadSave(makeMinimalSaveJson());

        const s = useGameStore.getState();
        // Selection state reset
        expect(s.selectedOsid).toBeNull();
        expect(s.selectedFormationId).toBeNull();
        expect(s.selectedCorpsId).toBeNull();
        expect(s.selectedCorpsFrontSectorId).toBeNull();
        expect(s.selectedArmyId).toBeNull();
        expect(s.selectedArmyHqId).toBeNull();
        expect(s.selectedOperationKey).toBeNull();
        expect(s.selectedOrbatCorpsId).toBeNull();
        // Hover state reset
        expect(s.hoveredOsids).toEqual([]);
        expect(s.hoveredCorpsId).toBeNull();
        expect(s.hoveredSectorId).toBeNull();
        expect(s.expandedStackOsid).toBeNull();
        // Modal state reset
        expect(s.orderModeForFormation).toBeNull();
        expect(s.pendingAttackConfirmation).toBeNull();
        expect(s.armyHQOpen).toBe(false);
        expect(s.armyHQExpandedCorpsId).toBeNull();
        expect(s.armyHQExpandedSections).toEqual({});
        expect(s.armyHQOfficerSelectionCorpsId).toBeNull();
        expect(s.opsPlanningModalOpen).toBe(false);
        expect(s.opsPlanningCorpsId).toBeNull();
        expect(s.opsPlanningOriginSectorId).toBeNull();
        expect(s.opsPlanningSelectedOfficerId).toBeNull();
        expect(s.commanderSelectionContext).toBeNull();
        expect(s.operationBriefingContext).toBeNull();
        expect(s.isOperationsPanelOpen).toBe(false);
        // Order state reset
        expect(s.stagedOrders).toEqual([]);
        // Transition state: loading directly into a war save is not a live
        // peace->war handoff, so the transition overlay stays suppressed.
        expect(s.peaceWarTransitionSeen).toBe(true);
        // Visual state
        expect(s.operationTargetOsids).toEqual([]);
        expect(s.ghostLinePoint).toBeNull();
        expect(s.flashOsid).toBeNull();
        expect(s.tooltipTarget).toBeNull();
        expect(s.tooltipPosition).toBeNull();
        // Turn-after-action reports belong to the prior save payload.
        expect(s.turnAftermath).toBeNull();
        expect(s.turnAftermathOpen).toBe(false);
    });

    it('resets openingBriefDismissed after loading a save', async () => {
        useGameStore.setState({ openingBriefDismissed: true });
        await useGameStore.getState().loadSave(makeMinimalSaveJson());
        expect(useGameStore.getState().openingBriefDismissed).toBe(false);
    });

    it('sets loadedGameState and clears loadError on successful load', async () => {
        useGameStore.setState({ loadError: 'previous error' });
        await useGameStore.getState().loadSave(makeMinimalSaveJson());
        const s = useGameStore.getState();
        expect(s.loadedGameState).not.toBeNull();
        expect(s.loadError).toBeNull();
        expect(s.lastLoadedStateFingerprint).not.toBeNull();
    });

    it('updates lastLoadedStateFingerprint on each load', async () => {
        await useGameStore.getState().loadSave(makeMinimalSaveJson(5));
        const fp1 = useGameStore.getState().lastLoadedStateFingerprint;

        await useGameStore.getState().loadSave(makeMinimalSaveJson(10));
        const fp2 = useGameStore.getState().lastLoadedStateFingerprint;

        expect(fp1).not.toBeNull();
        expect(fp2).not.toBeNull();
        expect(fp1).not.toBe(fp2);
    });
});

describe('gameStore replay inspection - read-only map frame swap', () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('swaps loadedGameState to a selected replay frame and restores the final state', async () => {
        await useGameStore.getState().loadSave(makeMinimalSaveJson(40));
        useGameStore.setState((state) => ({
            loadedGameState: state.loadedGameState
                ? {
                    ...state.loadedGameState,
                    gameOver: true,
                    replaySaveSequence: [JSON.parse(makeMinimalSaveJson(5)), JSON.parse(makeMinimalSaveJson(40))],
                }
                : null,
            selectedOsid: 'op:stale:selection',
            stagedOrders: [{ id: 'staged_0', type: 'move', formationId: 'brig_1', targetOsid: 'op:test:target' }],
        }));

        const finalState = useGameStore.getState().loadedGameState;
        expect(finalState?.turn).toBe(40);
        expect(finalState?.gameOver).toBe(true);

        useGameStore.getState().startReplayInspection(JSON.parse(makeMinimalSaveJson(5)), 0);

        const inspecting = useGameStore.getState();
        expect(inspecting.loadedGameState?.turn).toBe(5);
        expect(inspecting.loadedGameState?.gameOver).not.toBe(true);
        expect(inspecting.loadedGameState?.replaySaveSequence).toHaveLength(2);
        expect(inspecting.replayInspection?.frameIndex).toBe(0);
        expect(inspecting.replayInspection?.turn).toBe(5);
        expect(inspecting.replayInspection?.finalTurn).toBe(40);
        expect(inspecting.selectedOsid).toBeNull();
        expect(inspecting.stagedOrders).toEqual([]);

        useGameStore.getState().exitReplayInspection();

        const restored = useGameStore.getState();
        expect(restored.loadedGameState).toBe(finalState);
        expect(restored.loadedGameState?.turn).toBe(40);
        expect(restored.loadedGameState?.gameOver).toBe(true);
        expect(restored.loadedGameState?.replaySaveSequence).toHaveLength(2);
        expect(restored.replayInspection).toBeNull();
    });
});

describe('gameStore.loadSave — error handling for malformed input', () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('sets loadError for non-JSON string input', async () => {
        await expect(useGameStore.getState().loadSave('not json at all'))
            .rejects.toThrow();
        expect(useGameStore.getState().loadError).toBeTruthy();
    });

    it('sets loadError for object without meta block', async () => {
        await expect(useGameStore.getState().loadSave(JSON.stringify({ military: {} })))
            .rejects.toThrow();
        const error = useGameStore.getState().loadError;
        expect(error).toBeTruthy();
        expect(error).toContain('meta');
    });

    it('sets loadError for null input', async () => {
        await expect(useGameStore.getState().loadSave(JSON.stringify(null)))
            .rejects.toThrow();
        expect(useGameStore.getState().loadError).toBeTruthy();
    });

    it('sets loadError for array input', async () => {
        await expect(useGameStore.getState().loadSave(JSON.stringify([1, 2, 3])))
            .rejects.toThrow();
        expect(useGameStore.getState().loadError).toBeTruthy();
    });

    it('does not clear previous loadedGameState on error', async () => {
        // Load a valid save first
        await useGameStore.getState().loadSave(makeMinimalSaveJson());
        expect(useGameStore.getState().loadedGameState).not.toBeNull();

        // Try loading a broken save
        await expect(useGameStore.getState().loadSave('broken'))
            .rejects.toThrow();

        // Previous state should still be there (not nulled out)
        expect(useGameStore.getState().loadedGameState).not.toBeNull();
        expect(useGameStore.getState().loadError).toBeTruthy();
    });
});

describe('gameStore.loadSaveIfChanged — deduplication', () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('returns false when fingerprint matches (no reload)', async () => {
        const json = makeMinimalSaveJson();
        await useGameStore.getState().loadSave(json);
        const result = await useGameStore.getState().loadSaveIfChanged(json);
        expect(result).toBe(false);
    });

    it('returns true when fingerprint differs (new load)', async () => {
        await useGameStore.getState().loadSave(makeMinimalSaveJson(5));
        const result = await useGameStore.getState().loadSaveIfChanged(makeMinimalSaveJson(10));
        expect(result).toBe(true);
    });
});
