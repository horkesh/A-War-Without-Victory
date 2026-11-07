// @vitest-environment jsdom
// Codex review on #547: Tab inside the palette must stay inside the dialog.
import { createElement as h } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { buildCommandIndex } from '../../src/ui/map/command_palette/search';
import { CommandPalette } from '../../src/ui/map/command_palette/CommandPalette';
afterEach(cleanup);

it('keeps Tab and Shift+Tab focus inside the palette dialog', () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const rows = buildCommandIndex({ playerFaction: 'RBiH', formations: [], settlementNames: null, sections: [{ id: 'map', label: 'Tactical Map' }] });
    const view = render(h(CommandPalette, { open: true, entries: rows, onActivate: () => {}, onClose: () => {} }));
    const dialog = view.getByTestId('command-palette-dialog');
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'));
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    last.focus();
    const tab = fireEvent.keyDown(last, { key: 'Tab' });
    expect(tab).toBe(false); // the trap took the event (preventDefault)
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(first);
    first.focus();
    const back = fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(back).toBe(false);
    expect(document.activeElement).toBe(last);
    outside.remove();
});
