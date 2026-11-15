// @vitest-environment jsdom
/**
 * R8 council B2: an open Dayton panel covered the object rail and clipped it to "Delegation
 * fold". The rail now hides while a panel is open (it is inert behind the panel) and stays
 * mounted, so focus can return to the button that opened the panel.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { DaytonConferenceRoom, type DaytonConferencePanel } from '../../src/ui/map/dayton_conference/DaytonConferenceRoom.js';

afterEach(() => cleanup());

function room(panel: DaytonConferencePanel | null) {
    return createElement(DaytonConferenceRoom, {
        forced: false,
        previewReady: false,
        panel,
        onPanelChange: () => undefined,
        panels: { folder: 'folder', draft: 'draft', map: 'map', binder: 'binder', review: 'review' },
    });
}

describe('Dayton object rail (B2)', () => {
    it('is visible in the room and hidden, still mounted, while a panel covers it', () => {
        setLocale('en');
        const { rerender } = render(room(null));
        fireEvent.click(screen.getByRole('button', { name: 'Enter conference room' }));
        const nav = document.querySelector('.dayton-live-nav');
        expect(nav).not.toBeNull();
        expect(nav!.hasAttribute('data-panel-open')).toBe(false);

        rerender(room('review'));
        const covered = document.querySelector('.dayton-live-nav');
        expect(covered).not.toBeNull();
        expect(covered!.hasAttribute('data-panel-open')).toBe(true);

        rerender(room(null));
        expect(document.querySelector('.dayton-live-nav')!.hasAttribute('data-panel-open')).toBe(false);
    });

    it('the stylesheet hides the covered rail', () => {
        const css = readFileSync(resolve(__dirname, '../../src/ui/map/dayton_conference/live.css'), 'utf8');
        expect(css).toMatch(/\.dayton-live-nav\[data-panel-open\]\s*\{\s*visibility:\s*hidden;/);
    });
});
