// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresidentDeskShell } from '../../src/ui/map/components/presidential_desk/PresidentDeskShell.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 1',
    turn: 1,
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
    ...overrides,
  } as LoadedGameState;
}

function renderDesk(
  props: Partial<React.ComponentProps<typeof PresidentDeskShell>> = {},
) {
  return render(React.createElement(PresidentDeskShell, {
    state: makeState(),
    osidNameMap: null,
    onAction: vi.fn(),
    onAdvance: vi.fn(),
    onOpenArmyHQ: vi.fn(),
    onOpenMap: vi.fn(),
    onOpenRecords: vi.fn(),
    ...props,
  }));
}

afterEach(() => cleanup());

describe('PresidentDeskShell', () => {
  it('renders blockers as the primary desk packet and opens their direct resolver', () => {
    const onAction = vi.fn();
    renderDesk({
      state: makeState({
        pendingParamilitaryRequests: [
          { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
        ],
      }),
      osidNameMap: { bratunac_1: 'Bratunac' },
      onAction,
    });

    expect(screen.getByRole('region', { name: 'President desk' })).toBeTruthy();
    expect(screen.getAllByText('Paramilitary authorization').length).toBeGreaterThan(0);
    expect(screen.getByText('Review deployment')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Paramilitary authorization packet' }).getAttribute('src')).toContain('packet_thumb_paramilitary');

    fireEvent.click(screen.getByText('Review deployment'));

    expect(onAction).toHaveBeenCalledWith('paramilitary_review', 'paramilitary:1');
  });

  it('keeps Army HQ and map inspection as explicit handoffs, not stacked panels', () => {
    const onOpenArmyHQ = vi.fn();
    const onOpenMap = vi.fn();
    renderDesk({ onOpenArmyHQ, onOpenMap });

    fireEvent.click(screen.getByText('Call Army HQ'));
    fireEvent.click(screen.getByText('War Map'));

    expect(onOpenArmyHQ).toHaveBeenCalledOnce();
    expect(onOpenMap).toHaveBeenCalledOnce();
  });

  it('can close when rendered as a warroom overlay', () => {
    const onClose = vi.fn();
    renderDesk({ onClose });

    expect(screen.getByRole('dialog', { name: 'President desk' })).toBe(document.activeElement);

    fireEvent.click(screen.getByTestId('desk-close-overlay'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes the Warroom overlay on Escape', () => {
    const onClose = vi.fn();
    renderDesk({ onClose });

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'President desk' }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render raw implementation labels in the desk packet', () => {
    const { container } = renderDesk({
      state: makeState({
        pendingParamilitaryRequests: [
          { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
        ],
      }),
      osidNameMap: { bratunac_1: 'Bratunac' },
    });

    expect(container.textContent).not.toMatch(/pending_required_decisions/);
    expect(container.textContent).not.toMatch(/\bC:\d/);
    expect(container.textContent).not.toMatch(/\bA:\d/);
  });

  it('surfaces recent decision consequences on the desk', () => {
    renderDesk({
      state: makeState({
        firedEvents: [
          {
            id: 'cabinet-crisis',
            turn: 8,
            title: 'Cabinet crisis response',
            narrative: 'The cabinet accepted the policy line.',
            category: 'political',
            effects: [{ kind: 'authority', description: 'Authority held.' }],
            isDecision: true,
          },
        ],
      }),
    });

    expect(screen.getByText('Recent Consequences')).toBeTruthy();
    expect(screen.getByText('Decisions')).toBeTruthy();
    expect(screen.getByText('Cabinet crisis response')).toBeTruthy();
    expect(screen.getByText('Decision recorded')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Cabinet crisis response consequence' }).getAttribute('src')).toContain('consequence_public_pressure');
  });
});
