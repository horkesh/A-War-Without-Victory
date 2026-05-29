import { describe, expect, it } from 'vitest';

import {
  shouldRenderInboxPanel,
  shouldRenderTacticalDetailRails,
} from '../../src/ui/map/components/panelRail.js';

describe('panel rail ownership', () => {
  it('renders the inbox only when it owns the primary rail and operations are closed', () => {
    expect(shouldRenderInboxPanel('inbox', false)).toBe(true);
    expect(shouldRenderInboxPanel('inbox', true)).toBe(false);
    expect(shouldRenderInboxPanel('settlement', false)).toBe(false);
  });

  it('suppresses tactical detail rails while another shell or rail owner is active', () => {
    expect(shouldRenderTacticalDetailRails({
      operationsPanelOpen: false,
      armyHQOpen: false,
      codexOpen: false,
      chronicleOpen: false,
    })).toBe(true);

    expect(shouldRenderTacticalDetailRails({
      operationsPanelOpen: true,
      armyHQOpen: false,
      codexOpen: false,
      chronicleOpen: false,
    })).toBe(false);

    expect(shouldRenderTacticalDetailRails({
      operationsPanelOpen: false,
      armyHQOpen: true,
      codexOpen: false,
      chronicleOpen: false,
    })).toBe(false);

    expect(shouldRenderTacticalDetailRails({
      operationsPanelOpen: false,
      armyHQOpen: false,
      codexOpen: true,
      chronicleOpen: false,
    })).toBe(false);

    expect(shouldRenderTacticalDetailRails({
      operationsPanelOpen: false,
      armyHQOpen: false,
      codexOpen: false,
      chronicleOpen: true,
    })).toBe(false);
  });
});
