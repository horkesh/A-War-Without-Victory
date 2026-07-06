// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DecisionConsequenceRecordsPanel,
  type DecisionConsequenceRecordsPanelProps,
} from '../../src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { CausalityLogEntry, GameState } from '../../src/state/game_state.js';

const repoRoot = process.cwd();
const TypedDecisionConsequenceRecordsPanel =
  DecisionConsequenceRecordsPanel as ComponentType<DecisionConsequenceRecordsPanelProps>;

function sourcePath(path: string): string {
  return join(repoRoot, path);
}

function readSource(path: string): string {
  return readFileSync(sourcePath(path), 'utf8');
}

function buildEventDef(id: string, overrides: Partial<EventDefinition> = {}): EventDefinition {
  return {
    id,
    title: `Event ${id}`,
    trigger: { turn_min: 1, phase: 'war' },
    effect: { kind: 'narrative', text: 'noop' },
    family: 'test_family',
    source_tier: 'icty_icj_un',
    historical_default_response_id: 'opt_a',
    response_options: [
      { id: 'opt_a', label: 'Option A', effects: [] },
      { id: 'opt_b', label: 'Option B', effects: [] },
    ],
    ...overrides,
  } as unknown as EventDefinition;
}

function buildRawState(opts: {
  causalityLog?: CausalityLogEntry[];
} = {}): GameState {
  return {
    military: {
      fired_event_ids: [],
      enabled_event_ids: [],
      closed_event_ids: [],
      event_causality_log: opts.causalityLog ?? [],
      event_decision_log: [
        {
          event_id: 'evt_root',
          response_id: 'opt_b',
          decision_source: 'player',
          faction: 'RBiH',
          turn: 4,
        },
        {
          event_id: 'evt_bot',
          response_id: 'opt_a',
          decision_source: 'bot_political',
          faction: 'RS',
          turn: 5,
        },
      ],
      event_last_fired_turn: {},
    },
  } as unknown as GameState;
}

function makeLoadedState(rawGameState: GameState): LoadedGameState {
  return {
    label: 'Turn 4',
    turn: 4,
    phase: 'war',
    player_faction: 'RBiH',
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
    rawGameState,
  } as LoadedGameState;
}

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('WP-6 archive spine contract', () => {
  it('retires the top-level DecisionHistoryOverlay source and App state', () => {
    const app = readSource('src/ui/map/App.tsx');

    expect(existsSync(sourcePath('src/ui/map/components/DecisionHistoryOverlay.tsx'))).toBe(false);
    expect(app).not.toContain('DecisionHistoryOverlay');
    expect(app).not.toContain('isDecisionHistoryOpen');
    expect(app).not.toContain('openDecisionHistoryOverlay');
  });

  it('routes authored-choice shortcuts to Army HQ Records decisions instead of a standalone overlay', () => {
    const app = readSource('src/ui/map/App.tsx');

    expect(app).toMatch(/e\.key === 'e'[\s\S]*openArmyHQRecordsSubTab\(useGameStore\.getState\(\), 'decisions'\)/);
    expect(app).toMatch(/e\.key === 'd'[\s\S]*openArmyHQRecordsSubTab\(useGameStore\.getState\(\), 'decisions'\)/);
    expect(app).not.toMatch(/toggleDecisionHistoryOverlay\(\)/);
  });

  it('renders the retired overlay row fields inside Records decisions', () => {
    const rawGameState = buildRawState({
      causalityLog: [
        { turn: 4, from_event: 'evt_root', to_event: 'evt_child', to_flag: null, kind: 'enables' },
      ],
    });
    const eventCatalog = new Map<string, EventDefinition>([
      ['evt_root', buildEventDef('evt_root', { title: 'Root decision' })],
      ['evt_child', buildEventDef('evt_child', { title: 'Child consequence' })],
      ['evt_bot', buildEventDef('evt_bot', { title: 'Foreign default' })],
    ]);
    useGameStore.setState({
      loadedGameState: makeLoadedState(rawGameState),
    });

    render(createElement(TypedDecisionConsequenceRecordsPanel, { eventCatalog }));

    expect(screen.getByTestId('decision-history-records-section')).toBeTruthy();
    expect(screen.getByTestId('decision-history-count').textContent).toContain('1 decision');
    expect(screen.getByTestId('decision-history-event-id').textContent).toBe('Root decision');
    expect(screen.getByTestId('decision-history-chosen-option').textContent).toBe('Option B');
    expect(screen.getByTestId('decision-history-divergence-badge')).toBeTruthy();
    expect(screen.queryByText('Foreign default')).toBeNull();

    fireEvent.click(screen.getByTestId('decision-history-row').querySelector('button')!);

    expect(screen.getByTestId('decision-history-row-expanded')).toBeTruthy();
    expect(screen.getByTestId('decision-history-descendant-row').textContent).toBe('Child consequence');
  });
});
