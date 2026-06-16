// @vitest-environment jsdom
import React, { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PresidentialToolbar } from '../../src/ui/map/components/PresidentialToolbar.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  applyShellHandoffCommand,
  openChronicle,
  openCodex,
  type ShellNavigationState,
} from '../../src/ui/map/utils/shellNavigation.js';

function makeState(): LoadedGameState {
  return {
    label: 'RS turn 12',
    turn: 12,
    phase: 'war',
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RS',
    commandAuthority: { current: 100, max: 100, spentThisTurn: 0, lifetimeSpent: 0 },
  } as LoadedGameState;
}

function renderToolbar(props: Partial<React.ComponentProps<typeof PresidentialToolbar>> = {}) {
  return render(createElement(PresidentialToolbar, {
    pendingReviews: 0,
    pressureWarning: false,
    onOpenDesk: vi.fn(),
    onOpenRecords: vi.fn(),
    onOpenCodex: vi.fn(),
    ...props,
  }));
}

function createShellState(withAdvanceHandler = true): ShellNavigationState & { calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = [];
  const state: ShellNavigationState & { calls: Array<[string, unknown]> } = {
    loadedGameState: { player_faction: 'RS' },
    calls,
    setSelectedArmyId: (id) => { calls.push(['setSelectedArmyId', id]); },
    setArmyHQOpen: (open) => { calls.push(['setArmyHQOpen', open]); },
    setArmyHQTab: (tab) => { calls.push(['setArmyHQTab', tab]); },
    setArmyHQRecordsSubTab: (subTab) => { calls.push(['setArmyHQRecordsSubTab', subTab]); },
    setArmyHQExpandedCorpsId: (id) => { calls.push(['setArmyHQExpandedCorpsId', id]); },
    setCodexOpen: (open) => { calls.push(['setCodexOpen', open]); },
    setChronicleOpen: (open) => { calls.push(['setChronicleOpen', open]); },
  };
  if (withAdvanceHandler) {
    state.setAdvanceTurnPending = (pending) => { calls.push(['setAdvanceTurnPending', pending]); };
  }
  return state;
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: makeState(),
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('field toolbar navigation ownership', () => {
  it('exposes stable field commands without duplicate top-level reference tabs', () => {
    renderToolbar();

    expect(screen.getByRole('button', { name: 'DESK' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'WAR MAP' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ARMY HQ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CHRONICLE' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'RECORDS' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CODEX' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Advance turn/i })).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'SUMMARY' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'OPS' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'EVENTS' })).toBeNull();
  });

  it('keeps dev controls collapsed until the dev drawer is opened', () => {
    useGameStore.setState({ devMode: true });
    renderToolbar();

    expect(screen.queryByRole('button', { name: 'LOAD' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'DEV' }));

    expect(screen.getByRole('button', { name: 'LOAD' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'LATEST' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'SYNC' })).toBeTruthy();
  });

  it('desk navigation clears map-owned panels before leaving the field map', () => {
    const onOpenDesk = vi.fn();
    useGameStore.setState({
      selectedOsid: 'sarajevo',
      selectedFormationId: 'brigade-1',
      selectedCorpsId: 'corps-1',
      selectedArmyHqId: 'hq-1',
      selectedOperationKey: 'corps-1|op',
      isOperationsPanelOpen: true,
      opsPlanningModalOpen: true,
    });

    renderToolbar({ onOpenDesk });
    fireEvent.click(screen.getByRole('button', { name: 'DESK' }));

    expect(onOpenDesk).toHaveBeenCalledOnce();
    expect(useGameStore.getState()).toMatchObject({
      selectedOsid: null,
      selectedFormationId: null,
      selectedCorpsId: null,
      selectedArmyHqId: null,
      selectedOperationKey: null,
      isOperationsPanelOpen: false,
      opsPlanningModalOpen: false,
    });
  });

  it('mounts tactical map chrome only while the game shell owns the screen', () => {
    const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(appSource).toContain("{appScreen === 'game' && (");
    expect(appSource).toMatch(/appScreen === 'game'[\s\S]*<MapContainer \/>/);
    expect(appSource).toMatch(/appScreen === 'game'[\s\S]*<PresidentialToolbar/);
    expect(appSource).toMatch(/appScreen === 'game'[\s\S]*<OOBSidebar \/>/);
    expect(appSource).toMatch(/appScreen === 'game'[\s\S]*<PresidentialInbox/);
  });

  it('does not keep the retired Inbox badge route in toolbar source', () => {
    const toolbarSource = readFileSync('src/ui/map/components/PresidentialToolbar.tsx', 'utf8');

    expect(toolbarSource).not.toContain('false && <InboxBadge');
    expect(toolbarSource).not.toContain('Inbox badge');
  });

  it('keeps Codex and Chronicle top-level overlays mutually exclusive through shell helpers', () => {
    const chronicleState = createShellState();
    const codexState = createShellState();

    expect(openChronicle(chronicleState)).toBe(true);
    expect(chronicleState.calls).toEqual([
      ['setCodexOpen', false],
      ['setArmyHQOpen', false],
      ['setChronicleOpen', true],
    ]);

    expect(openCodex(codexState)).toBe(true);
    expect(codexState.calls).toEqual([
      ['setChronicleOpen', false],
      ['setArmyHQOpen', false],
      ['setCodexOpen', true],
    ]);
  });

  it('routes Army HQ reference links through shared shell helpers', () => {
    const recordsContentSource = readFileSync('src/ui/map/components/army_hq/RecordsContent.tsx', 'utf8');
    const consequenceRecordsSource = readFileSync('src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx', 'utf8');
    const wrappedOverlaySource = readFileSync('src/ui/map/components/chronicle/WrappedOverlay.tsx', 'utf8');

    expect(recordsContentSource).not.toContain('setCodexOpen(true)');
    expect(consequenceRecordsSource).not.toContain('setChronicleOpen(true)');
    expect(wrappedOverlaySource).not.toContain('setChronicleOpen(true)');
    expect(recordsContentSource).toContain('openCodex(useGameStore.getState())');
    expect(consequenceRecordsSource).toContain('openChronicle(useGameStore.getState())');
    expect(wrappedOverlaySource).toContain('openChronicle(useGameStore.getState())');
  });

  it('does not report advance-turn handoff success without an advance modal surface', () => {
    const stateWithoutModal = createShellState(false);
    const stateWithModal = createShellState(true);

    expect(applyShellHandoffCommand(stateWithoutModal, { kind: 'advance-turn' })).toBe(false);
    expect(stateWithoutModal.calls).toEqual([]);

    expect(applyShellHandoffCommand(stateWithModal, { kind: 'advance-turn' })).toBe(true);
    expect(stateWithModal.calls).toEqual([['setAdvanceTurnPending', true]]);
  });
});
