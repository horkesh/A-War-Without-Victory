// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EconomyPanel } from '../../src/ui/map/components/EconomyPanel';
import { EnclaveDashboard } from '../../src/ui/map/components/EnclaveDashboard';
import { HumanitarianLedgerPanel } from '../../src/ui/map/components/HumanitarianLedgerPanel';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import { Z } from '../../src/ui/shared/zIndex';

afterEach(cleanup);

const state = { player_faction: 'RBiH', productionFacilities: [], smugglingRoutes: [] } as unknown as LoadedGameState;

describe('records surfaces outside the shared Modal', () => {
  const cases = [
    ['economy-panel', (onClose: () => void) => createElement(EconomyPanel, { state, onClose })],
    ['enclave-dashboard', (onClose: () => void) => createElement(EnclaveDashboard, { state, open: true, onClose })],
    ['humanitarian-ledger-panel', (onClose: () => void) => createElement(HumanitarianLedgerPanel, { state, open: true, onClose })],
  ] as const;

  for (const [testId, make] of cases) {
    it(`${testId}: Esc closes it, and it sits on the modal tier above the map rails`, () => {
      const onClose = vi.fn();
      const { getByTestId } = render(make(onClose));
      const frame = getByTestId(testId);
      expect(frame.getAttribute('role')).toBe('dialog');
      expect(frame.getAttribute('aria-modal')).toBe('true');
      expect((frame.parentElement as HTMLElement).style.zIndex).toBe(String(Z.MODAL));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  }
});
