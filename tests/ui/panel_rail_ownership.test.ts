import { describe, expect, it } from 'vitest';

import {
  shouldRenderMapModeLegend,
  shouldRenderInboxPanel,
  shouldRenderTacticalDetailRails,
} from '../../src/ui/map/components/panelRail.js';
import * as panelRail from '../../src/ui/map/components/panelRail.js';

describe('panel rail ownership', () => {
  it('hides the map legend while a detail rail owns the same map area', () => {
    expect(shouldRenderMapModeLegend('inbox')).toBe(true);
    for (const panel of ['settlement', 'formation', 'corps', 'army', 'army_reserve', 'sector', 'operation', 'orbat'] as const) {
      expect(shouldRenderMapModeLegend(panel)).toBe(false);
    }
  });

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

  it('gives Command Briefing ownership only to the unobstructed base inbox', () => {
    const shouldRenderCommandBriefing = (panelRail as Record<string, unknown>)
      .shouldRenderCommandBriefing;

    expect(typeof shouldRenderCommandBriefing).toBe('function');
    if (typeof shouldRenderCommandBriefing !== 'function') return;

    const baseState = {
      panel: 'inbox',
      operationsPanelOpen: false,
      armyHQOpen: false,
      recruitmentOpen: false,
      autonomyOpen: false,
      chronicleOpen: false,
      codexOpen: false,
      fullOverlayOpen: false,
    } as const;

    expect(shouldRenderCommandBriefing(baseState)).toBe(true);

    for (const panel of ['settlement', 'formation', 'corps', 'army', 'army_reserve', 'sector', 'operation', 'orbat']) {
      expect(shouldRenderCommandBriefing({ ...baseState, panel })).toBe(false);
    }

    for (const owner of [
      'operationsPanelOpen',
      'armyHQOpen',
      'recruitmentOpen',
      'autonomyOpen',
      'chronicleOpen',
      'codexOpen',
      'fullOverlayOpen',
    ] as const) {
      expect(shouldRenderCommandBriefing({ ...baseState, [owner]: true })).toBe(false);
    }
  });

  it('returns Command Briefing ownership after the active owner closes', () => {
    const shouldRenderCommandBriefing = (panelRail as Record<string, unknown>)
      .shouldRenderCommandBriefing;

    expect(typeof shouldRenderCommandBriefing).toBe('function');
    if (typeof shouldRenderCommandBriefing !== 'function') return;

    const baseState = {
      panel: 'inbox',
      operationsPanelOpen: false,
      armyHQOpen: false,
      recruitmentOpen: false,
      autonomyOpen: false,
      chronicleOpen: false,
      codexOpen: false,
      fullOverlayOpen: false,
    } as const;

    expect(shouldRenderCommandBriefing({ ...baseState, chronicleOpen: true })).toBe(false);
    expect(shouldRenderCommandBriefing(baseState)).toBe(true);
  });
});
