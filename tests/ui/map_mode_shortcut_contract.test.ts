// @vitest-environment jsdom

import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement, useEffect, useLayoutEffect, useRef } from 'react';

import { useKeyboardShortcuts } from '../../src/ui/map/hooks/useKeyboardShortcuts.js';
import { useActiveWindowKeydown } from '../../src/ui/map/hooks/useActiveWindowKeydown.js';
import { useMapInteractions } from '../../src/ui/map/map/useMapInteractions.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { MAP_MODES } from '../../src/ui/map/utils/mapModes.js';

function KeyboardShortcutProbe({ active = true }: { active?: boolean }) {
    useKeyboardShortcuts(active);
    return createElement('div', { 'data-testid': 'keyboard-shortcut-probe' });
}

function AppShellShortcutProbe({ active, onKeyDown }: { active: boolean; onKeyDown: (event: KeyboardEvent) => void }) {
    useActiveWindowKeydown(active, onKeyDown);
    return null;
}

function CommitEdgeKeyboardProbe({
    active,
    onShellKeyDown,
}: {
    active: boolean;
    onShellKeyDown: (event: KeyboardEvent) => void;
}) {
    useKeyboardShortcuts(active);
    useActiveWindowKeydown(active, onShellKeyDown);
    useLayoutEffect(() => {
        if (!active) window.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true }));
    }, [active]);
    return null;
}

function CommitEdgeMapInteractionProbe({
    active,
    onOsidClick,
}: {
    active: boolean;
    onOsidClick: (osid: string) => void;
}) {
    const activeRef = useRef(active);
    activeRef.current = active;
    const handlersRef = useRef(new Map<string, (event: unknown) => void>());
    const mapRef = useRef({
        on: (event: string, layerOrHandler: string | ((event: unknown) => void)) => {
            if (typeof layerOrHandler === 'function') handlersRef.current.set(event, layerOrHandler);
        },
        off: vi.fn(),
        getCanvas: () => ({
            style: { cursor: '' },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }),
        getLayer: () => undefined,
        queryRenderedFeatures: () => [],
    });

    useEffect(() => {
        if (!active) return undefined;
        return (useMapInteractions as unknown as (
            map: unknown,
            callbacks: { onOsidClick: (osid: string) => void },
            isActive: () => boolean,
        ) => (() => void) | undefined)(mapRef.current, { onOsidClick }, () => activeRef.current);
    }, [active, onOsidClick]);

    useLayoutEffect(() => {
        if (!active) {
            handlersRef.current.get('click')?.({ point: { x: 0, y: 0 } });
        }
    }, [active]);
    return null;
}

describe('map mode shortcut contract', () => {
    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('keeps the live nine map modes keyed 1 through 9', () => {
        expect(MAP_MODES.map((mode) => mode.key)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
        expect(MAP_MODES.map((mode) => mode.id)).toEqual([
            'political',
            'ethnic',
            'supply',
            'casualties',
            'morale',
            'operations',
            'defense',
            'authority',
            'legitimacy',
        ]);
    });

    it('drives numeric keyboard shortcuts from MAP_MODES instead of a stale duplicate list', () => {
        const source = readFileSync('src/ui/map/hooks/useKeyboardShortcuts.ts', 'utf8');
        expect(source).toContain("import { MAP_MODES } from '../utils/mapModes'");
        expect(source).not.toContain("['political', 'ethnic', 'supply'");
    });

    it('switches the ninth keyboard shortcut to Legitimacy mode', () => {
        useGameStore.setState({ ...useGameStore.getInitialState(), mapMode: 'political' });
        render(createElement(KeyboardShortcutProbe));

        fireEvent.keyDown(window, { key: '9' });

        expect(useGameStore.getState().mapMode).toBe('legitimacy');
    });

    it('does not dispatch tactical shortcuts while the retained map is inactive', () => {
        useGameStore.setState({ ...useGameStore.getInitialState(), mapMode: 'political', pauseMenuOpen: false });
        render(createElement(KeyboardShortcutProbe, { active: false }));

        fireEvent.keyDown(window, { key: '9' });
        fireEvent.keyDown(window, { key: 'Escape' });

        expect(useGameStore.getState().mapMode).toBe('political');
        expect(useGameStore.getState().pauseMenuOpen).toBe(false);
    });

    it('keeps the second App shell shortcut owner detached until tactical readiness', () => {
        const onKeyDown = vi.fn();
        const view = render(createElement(AppShellShortcutProbe, { active: false, onKeyDown }));

        fireEvent.keyDown(window, { key: 'h' });
        expect(onKeyDown).not.toHaveBeenCalled();

        view.rerender(createElement(AppShellShortcutProbe, { active: true, onKeyDown }));
        fireEvent.keyDown(window, { key: 'h' });
        expect(onKeyDown).toHaveBeenCalledOnce();

        view.rerender(createElement(AppShellShortcutProbe, { active: false, onKeyDown }));
        fireEvent.keyDown(window, { key: 'h' });
        expect(onKeyDown).toHaveBeenCalledOnce();
    });

    it('fails installed global shortcut handlers closed before passive cleanup', () => {
        const onShellKeyDown = vi.fn();
        useGameStore.setState({ ...useGameStore.getInitialState(), mapMode: 'political' });
        const view = render(createElement(CommitEdgeKeyboardProbe, { active: true, onShellKeyDown }));

        view.rerender(createElement(CommitEdgeKeyboardProbe, { active: false, onShellKeyDown }));

        expect(useGameStore.getState().mapMode).toBe('political');
        expect(onShellKeyDown).not.toHaveBeenCalled();
    });

    it('fails installed MapLibre callbacks closed before passive cleanup', () => {
        const onOsidClick = vi.fn();
        const view = render(createElement(CommitEdgeMapInteractionProbe, { active: true, onOsidClick }));

        view.rerender(createElement(CommitEdgeMapInteractionProbe, { active: false, onOsidClick }));

        expect(onOsidClick).not.toHaveBeenCalled();
    });

    it('does not hijack native Tab traversal or focused button Space activation', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            selectedCorpsId: 'corps_a',
            loadedGameState: {
                label: 'test',
                turn: 1,
                phase: 'war',
                player_faction: 'RBiH',
                formations: [
                    { id: 'corps_a', faction: 'RBiH', name: 'A Corps', kind: 'corps', status: 'active', readiness: 'active', createdTurn: 0, tags: [] },
                    { id: 'corps_b', faction: 'RBiH', name: 'B Corps', kind: 'corps', status: 'active', readiness: 'active', createdTurn: 0, tags: [] },
                ],
            } as never,
        });
        render(createElement(KeyboardShortcutProbe));
        const plainTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        window.dispatchEvent(plainTab);
        expect(plainTab.defaultPrevented).toBe(false);
        expect(useGameStore.getState().selectedCorpsId).toBe('corps_a');

        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();
        const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        window.dispatchEvent(space);
        expect(space.defaultPrevented).toBe(false);
        button.remove();
    });

    it('uses Ctrl+Tab as the explicit corps-cycle shortcut', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            selectedCorpsId: 'corps_a',
            loadedGameState: {
                label: 'test',
                turn: 1,
                phase: 'war',
                player_faction: 'RBiH',
                formations: [
                    { id: 'corps_a', faction: 'RBiH', name: 'A Corps', kind: 'corps', status: 'active', readiness: 'active', createdTurn: 0, tags: [] },
                    { id: 'corps_b', faction: 'RBiH', name: 'B Corps', kind: 'corps_asset', status: 'active', readiness: 'active', createdTurn: 0, tags: [] },
                ],
            } as never,
        });
        render(createElement(KeyboardShortcutProbe));

        const modifiedTab = new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, bubbles: true, cancelable: true });
        window.dispatchEvent(modifiedTab);

        expect(modifiedTab.defaultPrevented).toBe(true);
        expect(useGameStore.getState().selectedCorpsId).toBe('corps_b');
    });

    it('keeps player and engineering docs current with all nine modes', () => {
        const mapUiMaster = readFileSync('docs/20_engineering/MAP_UI_MASTER.md', 'utf8');
        const guiArchitecture = readFileSync('docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md', 'utf8');
        const playerGuide = readFileSync('docs/00_start_here/NEW_PLAYER_GUIDE.md', 'utf8');

        for (const source of [mapUiMaster, guiArchitecture, playerGuide]) {
            expect(source).toContain('Authority');
            expect(source).toContain('Legitimacy');
            expect(source).toContain('1-9');
            expect(source).not.toContain('seven modes');
            expect(source).not.toContain('map modes 1-5');
        }
    });
});
