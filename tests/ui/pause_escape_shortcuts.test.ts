// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { CodexPanel } from '../../src/ui/map/components/CodexPanel.js';
import { DecisionHistoryOverlay } from '../../src/ui/map/components/DecisionHistoryOverlay.js';
import { useKeyboardShortcuts } from '../../src/ui/map/hooks/useKeyboardShortcuts.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function KeyboardShortcutProbe() {
    useKeyboardShortcuts();
    return createElement('div', { 'data-testid': 'keyboard-shortcut-probe' });
}

function mountKeyboardShortcuts() {
    return render(createElement(KeyboardShortcutProbe));
}

function CodexWithKeyboardShortcuts() {
    useKeyboardShortcuts();
    return createElement(CodexPanel, {
        isOpen: true,
        onClose: () => useGameStore.getState().setCodexOpen(false),
    });
}

function DecisionHistoryWithKeyboardShortcuts() {
    useKeyboardShortcuts();
    return createElement(DecisionHistoryOverlay, {
        isOpen: true,
        onClose: () => useGameStore.setState({ decisionHistoryProbeOpen: false } as any),
    });
}

describe('Pause Escape shortcuts', () => {
    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('clears map selection before opening the pause menu', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            selectedOsid: 'op:sarajevo:sarajevo_1',
            selectedFormationId: 'brigade_1',
            selectedCorpsFrontSectorId: 'sector_1',
            selectedCorpsId: 'corps_1',
            selectedArmyId: 'RBiH',
            selectedArmyHqId: 'army_hq_1',
            selectedOperationKey: 'corps_1|Operation Test',
            hoveredOsids: ['op:sarajevo:sarajevo_1'],
            tooltipTarget: { type: 'osid', id: 'op:sarajevo:sarajevo_1' },
            tooltipPosition: { x: 10, y: 20 },
            orderModeForFormation: 'sector',
            pendingAttackConfirmation: { attackerFormationId: 'brigade_1', targetOsid: 'op:pale:pale_1' },
            operationTargetOsids: ['op:pale:pale_1'],
            pauseMenuOpen: false,
            armyHQOpen: false,
        });
        mountKeyboardShortcuts();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useGameStore.getState()).toMatchObject({
            selectedOsid: null,
            selectedFormationId: null,
            selectedCorpsFrontSectorId: null,
            selectedCorpsId: null,
            selectedArmyId: null,
            selectedArmyHqId: null,
            selectedOperationKey: null,
            hoveredOsids: [],
            tooltipTarget: null,
            tooltipPosition: null,
            orderModeForFormation: null,
            pendingAttackConfirmation: null,
            operationTargetOsids: [],
            pauseMenuOpen: false,
        });

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useGameStore.getState().pauseMenuOpen).toBe(true);
    });

    it('opens the pause menu when no selection or Army HQ modal is active', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            armyHQOpen: false,
            pauseMenuOpen: false,
        });
        mountKeyboardShortcuts();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useGameStore.getState().pauseMenuOpen).toBe(true);
    });

    it('leaves Escape to the Army HQ modal while it is active', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            armyHQOpen: true,
            pauseMenuOpen: false,
        });
        mountKeyboardShortcuts();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useGameStore.getState().pauseMenuOpen).toBe(false);
        expect(useGameStore.getState().armyHQOpen).toBe(true);
    });

    it('closes the Codex on Escape without opening the pause menu behind it', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            codexOpen: true,
            pauseMenuOpen: false,
        });
        render(createElement(CodexWithKeyboardShortcuts));

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useGameStore.getState().codexOpen).toBe(false);
        expect(useGameStore.getState().pauseMenuOpen).toBe(false);
    });

    it('leaves Escape to Decision History without opening the pause menu behind it', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            pauseMenuOpen: false,
            decisionHistoryProbeOpen: true,
        } as any);
        render(createElement(DecisionHistoryWithKeyboardShortcuts));

        fireEvent.keyDown(window, { key: 'Escape' });

        expect((useGameStore.getState() as any).decisionHistoryProbeOpen).toBe(false);
        expect(useGameStore.getState().pauseMenuOpen).toBe(false);
    });
});
