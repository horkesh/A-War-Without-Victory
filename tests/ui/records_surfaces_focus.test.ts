// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement, Fragment, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { EconomyPanel } from '../../src/ui/map/components/EconomyPanel';
import { EnclaveDashboard } from '../../src/ui/map/components/EnclaveDashboard';
import { HumanitarianLedgerPanel } from '../../src/ui/map/components/HumanitarianLedgerPanel';
import type { LoadedGameState } from '../../src/ui/map/data/types';

/**
 * The records surfaces that open over the map without the shared <Modal> (Economy, the
 * enclave dashboard, the humanitarian ledger) are aria-modal dialogs, so keyboard focus
 * has to follow: it moves into the dialog on open, Tab cannot leave it for the toolbar
 * behind, and it returns to the opener on close.
 */
afterEach(cleanup);

const state = { player_faction: 'RBiH', productionFacilities: [], smugglingRoutes: [] } as unknown as LoadedGameState;
const noop = () => {};

const cases: ReadonlyArray<readonly [string, (open: boolean) => ReactElement | null]> = [
  ['economy-panel', (open) => (open ? createElement(EconomyPanel, { state, onClose: noop }) : null)],
  ['enclave-dashboard', (open) => createElement(EnclaveDashboard, { state, open, onClose: noop })],
  ['humanitarian-ledger-panel', (open) => createElement(HumanitarianLedgerPanel, { state, open, onClose: noop })],
];

function harness(open: boolean, panel: (open: boolean) => ReactElement | null) {
  return createElement(Fragment, null,
    createElement('button', { type: 'button', 'data-testid': 'opener' }, 'Open'),
    createElement('button', { type: 'button', 'data-testid': 'toolbar-behind' }, 'Toolbar'),
    panel(open));
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
}

describe('records surfaces keep keyboard focus inside the dialog', () => {
  for (const [testId, panel] of cases) {
    it(`${testId}: focus moves in, Tab wraps inside, and focus returns on close`, () => {
      const { getByTestId, rerender } = render(harness(false, panel));
      const opener = getByTestId('opener');
      opener.focus();
      expect(document.activeElement).toBe(opener);

      rerender(harness(true, panel));
      const dialog = getByTestId(testId);
      expect(dialog.contains(document.activeElement)).toBe(true);

      const controls = focusables(dialog);
      expect(controls.length).toBeGreaterThan(0);
      const last = controls[controls.length - 1];
      last.focus();
      fireEvent.keyDown(last, { key: 'Tab' });
      expect(document.activeElement).toBe(controls[0]);
      expect(document.activeElement).not.toBe(getByTestId('toolbar-behind'));

      controls[0].focus();
      fireEvent.keyDown(controls[0], { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(last);

      rerender(harness(false, panel));
      expect(document.activeElement).toBe(opener);
    });
  }
});
