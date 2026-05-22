// @vitest-environment jsdom

import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';

import { useKeyboardShortcuts } from '../../src/ui/map/hooks/useKeyboardShortcuts.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { MAP_MODES } from '../../src/ui/map/utils/mapModes.js';

function KeyboardShortcutProbe() {
    useKeyboardShortcuts();
    return createElement('div', { 'data-testid': 'keyboard-shortcut-probe' });
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
