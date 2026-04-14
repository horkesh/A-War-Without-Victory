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
        // Transition state
        expect(s.peaceWarTransitionSeen).toBe(false);
        // Visual state
        expect(s.operationTargetOsids).toEqual([]);
        expect(s.ghostLinePoint).toBeNull();
        expect(s.flashOsid).toBeNull();
        expect(s.tooltipTarget).toBeNull();
        expect(s.tooltipPosition).toBeNull();
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
