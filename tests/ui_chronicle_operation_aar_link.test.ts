// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { ChronicleOverlay } from '../src/ui/map/components/chronicle/ChronicleOverlay.js';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { useGameStore } from '../src/ui/map/store/gameStore.js';
import { openArmyHQOperationHistory, type ShellNavigationState } from '../src/ui/map/utils/shellNavigation.js';

function createState(playerFaction: string | null = 'RS'): ShellNavigationState & {
  calls: Array<[string, unknown]>;
} {
  const calls: Array<[string, unknown]> = [];
  return {
    loadedGameState: { player_faction: playerFaction },
    calls,
    setSelectedArmyId: (id) => { calls.push(['setSelectedArmyId', id]); },
    setArmyHQOpen: (open) => { calls.push(['setArmyHQOpen', open]); },
    setArmyHQTab: (tab) => { calls.push(['setArmyHQTab', tab]); },
    setArmyHQRecordsSubTab: (subTab) => { calls.push(['setArmyHQRecordsSubTab', subTab]); },
    setArmyHQExpandedCorpsId: (id) => { calls.push(['setArmyHQExpandedCorpsId', id]); },
    setFocusedOperationHistoryId: (id) => { calls.push(['setFocusedOperationHistoryId', id]); },
    setCodexOpen: (open) => { calls.push(['setCodexOpen', open]); },
    setChronicleOpen: (open) => { calls.push(['setChronicleOpen', open]); },
  };
}

describe('Chronicle completed-operation AAR visibility', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('adds compact player-scoped operation AAR entries from existing operationHistory', () => {
    const entries = generateChronicleEntries({
      player_faction: 'RS',
      turnSummaries: [{ turn: 15 }],
      operationHistory: [
        {
          operation_id: 'rs-op-1',
          operation_name: 'Operation Iron Corridor',
          corps_id: 'rs_1st_krajina',
          faction: 'RS',
          started_turn: 12,
          ended_turn: 15,
          outcome: 'partial',
          objectives_targeted: ['a', 'b', 'c'],
          objectives_captured: ['a', 'b'],
          total_attacks: 6,
          casualties_suffered: { killed: 18, wounded: 64 },
          casualties_inflicted: { killed: 22, wounded: 75 },
          grade: { stars: 3, verdict: 'Costly partial', factors: {} },
          duration_turns: 4,
          weekly_log: [],
        },
        {
          operation_id: 'enemy-op-1',
          operation_name: 'Enemy Hidden Truth',
          corps_id: 'arbih_5th_corps',
          faction: 'RBiH',
          started_turn: 12,
          ended_turn: 15,
          outcome: 'success',
          objectives_targeted: ['x'],
          objectives_captured: ['x'],
          total_attacks: 1,
          casualties_suffered: { killed: 1, wounded: 1 },
          casualties_inflicted: { killed: 1, wounded: 1 },
          grade: { stars: 5, verdict: 'Decisive', factors: {} },
          duration_turns: 1,
          weekly_log: [],
        },
      ],
    });

    const operationEntries = entries.filter(entry => entry.metadata?.operationAarId != null);

    expect(operationEntries).toHaveLength(1);
    expect(operationEntries[0]).toMatchObject({
      turn: 15,
      type: 'military',
      headline: true,
      title: 'Operation Iron Corridor concluded',
      detail: 'Partial | 2/3 objectives | 6 attacks | 82 suffered / 97 inflicted | 3 stars',
      metadata: {
        operationAarId: 'rs-op-1',
        operationName: 'Operation Iron Corridor',
        operationOutcome: 'partial',
      },
    });
    expect(entries.some(entry => entry.title.includes('Enemy Hidden Truth'))).toBe(false);
  });

  it('uses operation display names instead of raw history identifiers in Chronicle entries', () => {
    const entries = generateChronicleEntries({
      player_faction: 'RS',
      turnSummaries: [{ turn: 45 }],
      operationHistory: [
        {
          operation_id: 'rs-op-raw',
          operation_name: 'cmd_vrs_drinacorps_t45',
          operation_display_name: 'Command - Drina Corps',
          corps_id: 'vrs_drinacorps',
          faction: 'RS',
          started_turn: 42,
          ended_turn: 45,
          outcome: 'partial',
          objectives_targeted: ['op:bratunac:bratunac_1'],
          objectives_captured: [],
          total_attacks: 2,
          casualties_suffered: { killed: 4, wounded: 12 },
          casualties_inflicted: { killed: 7, wounded: 18 },
          grade: { stars: 2, verdict: 'Limited', factors: {} },
          duration_turns: 3,
          weekly_log: [],
        },
      ],
    });

    const text = entries
      .filter(entry => entry.metadata?.operationAarId === 'rs-op-raw')
      .map(entry => `${entry.title} ${entry.detail} ${entry.metadata?.operationName ?? ''}`)
      .join(' ');

    expect(text).toContain('Command - Drina Corps');
    expect(text).not.toMatch(/cmd_|_t45|operation_name|op:/i);
  });

  it('routes a Chronicle operation card to the matching Army HQ operation history row', () => {
    const state = createState('RS');

    expect(openArmyHQOperationHistory(state, 'rs-op-1')).toBe(true);
    expect(state.calls).toEqual([
      ['setCodexOpen', false],
      ['setChronicleOpen', false],
      ['setSelectedArmyId', 'RS'],
      ['setArmyHQOpen', true],
      ['setArmyHQTab', 'records'],
      ['setArmyHQRecordsSubTab', 'ops'],
      ['setFocusedOperationHistoryId', 'rs-op-1'],
    ]);
  });

  it('refuses operation-history navigation without a loaded player faction', () => {
    const state = createState(null);

    expect(openArmyHQOperationHistory(state)).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it('renders operation AAR cards with a dossier action back to Operation History', async () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      chronicleOpen: true,
      loadedGameState: {
        player_faction: 'RS',
        turn: 15,
        turnSummaries: [{ turn: 15 }],
        operationHistory: [
          {
            operation_id: 'rs-op-1',
            operation_name: 'Operation Iron Corridor',
            corps_id: 'rs_1st_krajina',
            faction: 'RS',
            started_turn: 12,
            ended_turn: 15,
            outcome: 'partial',
            objectives_targeted: ['a', 'b', 'c'],
            objectives_captured: ['a', 'b'],
            total_attacks: 6,
            casualties_suffered: { killed: 18, wounded: 64 },
            casualties_inflicted: { killed: 22, wounded: 75 },
            grade: { stars: 3, verdict: 'Costly partial', factors: {} },
            duration_turns: 4,
            weekly_log: [],
          },
        ],
      } as any,
    });

    render(createElement(ChronicleOverlay));

    expect(await screen.findAllByText('Operation Iron Corridor concluded')).toHaveLength(2);
    const action = await screen.findByRole('button', { name: /Open Operation Record/i });
    fireEvent.click(action);

    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.chronicleOpen).toBe(false);
      expect(state.armyHQOpen).toBe(true);
      expect(state.armyHQRecordsSubTab).toBe('ops');
      expect(state.focusedOperationHistoryId).toBe('rs-op-1');
    });
  });
});
