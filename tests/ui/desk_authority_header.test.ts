// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DeskAuthorityHeader } from '../../src/ui/map/components/presidential_desk/DeskAuthorityHeader.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  AUTHOR_OP_COST,
  REQUEST_OP_COST,
  STOP_OP_COST,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
  ELITE_DEPLOY_COST,
  REPLACE_CO_COST,
  FRONT_VISIT_COST,
} from '../../src/ui/map/utils/commandAuthority.js';

const ALL_COSTS = [
  AUTHOR_OP_COST,
  REQUEST_OP_COST,
  STOP_OP_COST,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
  ELITE_DEPLOY_COST,
  REPLACE_CO_COST,
  FRONT_VISIT_COST,
];
const MIN_LEVER_COST = Math.min(...ALL_COSTS);

function makeState(
  ca: LoadedGameState['commandAuthority'] | undefined,
): LoadedGameState {
  return {
    label: 'Turn 1',
    turn: 1,
    player_faction: 'RS',
    commandAuthority: ca,
  } as unknown as LoadedGameState;
}

function renderHeader(ca: LoadedGameState['commandAuthority'] | undefined) {
  return render(React.createElement(DeskAuthorityHeader, { state: makeState(ca) }));
}

function renderHeaderState(state: LoadedGameState) {
  return render(React.createElement(DeskAuthorityHeader, { state }));
}

afterEach(() => cleanup());

describe('DeskAuthorityHeader', () => {
  it('renders the current CA balance from state.commandAuthority', () => {
    renderHeader({ current: 60, max: 100, reserve: 8, reserveMax: 15, spentThisTurn: 12, lifetimeSpent: 48, lastRecovery: 7, lastRecoverySource: 'patron_confidence' });
    expect(screen.getByTestId('desk-authority-ca-value').textContent).toContain('60');
    expect(screen.getByTestId('desk-authority-ca-value').textContent).toContain('100');
    expect(screen.getByTestId('desk-authority-spent').textContent).toContain('12');
  });

  it('shows banked overflow and the political income source', () => {
    renderHeader({ current: 100, max: 100, reserve: 9, reserveMax: 15, spentThisTurn: 0, lifetimeSpent: 48, lastRecovery: 9, lastRecoverySource: 'international_standing' });

    expect(screen.getByTestId('desk-authority-bank').textContent).toContain('9');
    expect(screen.getByTestId('desk-authority-bank').textContent).toContain('15');
    expect(screen.getByTestId('desk-authority-income-source').textContent).toMatch(/international standing/i);
    expect(screen.getByTestId('desk-authority-cadence').textContent).toMatch(/one directive every 3 turns/i);
  });

  it('explains a full balance as reserve power rather than a spend quota', () => {
    renderHeader({ current: 100, max: 100, reserve: 15, reserveMax: 15, spentThisTurn: 0, lifetimeSpent: 0, lastRecovery: 9 });

    expect(screen.getByTestId('desk-authority-capacity-cue').textContent).toMatch(/reserve power, not a weekly quota/i);
    expect(screen.getByTestId('desk-authority-capacity-cue').textContent).toMatch(/reserve limit/i);
    expect(screen.getByTestId('desk-authority-capacity-cue').textContent).toMatch(/deliberate directive/i);
  });

  it('does not show the full-balance cue below capacity', () => {
    renderHeader({ current: 99, max: 100, reserve: 15, reserveMax: 15, spentThisTurn: 0, lifetimeSpent: 0 });

    expect(screen.queryByTestId('desk-authority-capacity-cue')).toBeNull();
  });

  it('explains a near-capacity quiet posture when no presidential action is filed', () => {
    renderHeader({ current: 90, max: 100, reserve: 12, reserveMax: 15, spentThisTurn: 0, lifetimeSpent: 0 });

    const note = screen.getByRole('note');
    expect(note.getAttribute('data-testid')).toBe('desk-authority-cadence-hold');
    expect(note.textContent).toMatch(/no sourced presidential initiative is filed this week/i);
    expect(note.textContent).toMatch(/holding authority preserves the current policy/i);
    expect(within(note).queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('desk-authority-capacity-cue')).toBeNull();
  });

  it('does not call the posture quiet when a required presidential response is filed', () => {
    renderHeaderState({
      ...makeState({ current: 100, max: 100, reserve: 15, reserveMax: 15, spentThisTurn: 0, lifetimeSpent: 0 }),
      pendingEventDecisions: [{
        event_id: 'required-response',
        event_title: 'Required response',
        turn_fired: 1,
        faction: 'RS',
        requires_player_response: true,
        response_options: [{ id: 'ack', label: 'Acknowledge', effects: [] }],
      }],
    } as LoadedGameState);

    expect(screen.queryByTestId('desk-authority-cadence-hold')).toBeNull();
    expect(screen.queryByTestId('desk-authority-capacity-cue')).not.toBeNull();
  });

  it('renders each lever cost from the canonical constants', () => {
    renderHeader({ current: 100, max: 100, spentThisTurn: 0, lifetimeSpent: 0 });
    const levers = screen.getAllByTestId('desk-authority-lever');
    // One row per distinct lever (8 levers).
    expect(levers.length).toBe(ALL_COSTS.length);
    // Every canonical cost value appears in the legend.
    for (const cost of new Set(ALL_COSTS)) {
      const matched = levers.some((row) =>
        within(row).queryByText(new RegExp(`\\b${cost}\\b`)) !== null,
      );
      expect(matched, `cost ${cost} should appear in legend`).toBe(true);
    }
  });

  it('shows the low-CA cue when the balance cannot afford the cheapest lever', () => {
    renderHeader({ current: MIN_LEVER_COST - 1, max: 100, spentThisTurn: 50, lifetimeSpent: 90 });
    expect(screen.queryByTestId('desk-authority-low-cue')).not.toBeNull();
  });

  it('hides the low-CA cue when the balance can afford the cheapest lever', () => {
    renderHeader({ current: MIN_LEVER_COST, max: 100, spentThisTurn: 0, lifetimeSpent: 0 });
    expect(screen.queryByTestId('desk-authority-low-cue')).toBeNull();
  });

  it('omits the band entirely when CA is absent (headless/legacy states)', () => {
    renderHeader(undefined);
    expect(screen.queryByTestId('desk-authority-header')).toBeNull();
  });
});
