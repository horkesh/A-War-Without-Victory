// @vitest-environment jsdom
//
// FULL DECISION-ROOM CONVERGENCE — proposal-review lever.
//
// Pins that the "approve / withhold a general's autonomy Level-1 proposal" decision
// is issued ONLY from the Presidential Decision Room (DirectiveCard, review_proposal
// directive), and that the Decision Room builder emits one issue-able card per pending
// proposal. The AutonomyPanel proposal queue is read-only (it shows the pending items
// for scan but routes the approve/deny action to the Decision Room) — guarded here by
// asserting the AutonomyPanel module no longer imports/issues the accept/reject IPC and
// that the DirectiveCard is the sole issuing surface.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveCard } from '../../src/ui/map/components/army_hq/DirectiveCard';
import {
  buildPresidentialDecisionRoomView,
} from '../../src/ui/map/data/presidentialDecisionRoom';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { PresidentialDecisionRoomDirective } from '../../src/ui/map/data/presidentialDecisionRoom';
import { useGameStore } from '../../src/ui/map/store/gameStore';

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));

const baseGameState = {
  turn: 12,
  phase: 'war',
  formations: [{ id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' }],
  commandAuthority: { current: 60, max: 100, spentThisTurn: 0, recoveryPerTurn: 2 },
  namedOfficerData: [],
} as unknown as LoadedGameState;

const reviewProposalDirective: PresidentialDecisionRoomDirective = {
  lever: 'review_proposal',
  cost: 0,
  payload: { proposalId: 'proposal_bravo' },
};

function installIpc(overrides: Record<string, unknown> = {}) {
  const bridge = {
    acceptProposal: vi.fn(async () => ({ ok: true })),
    rejectProposal: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
  Object.defineProperty(window, 'awwv', { configurable: true, value: bridge });
  return bridge;
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 24',
    turn: 24,
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
    turnSummaries: [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'awwv');
  useGameStore.setState(useGameStore.getInitialState());
  vi.restoreAllMocks();
});

describe('Decision Room — proposal-review lever (single-surface approval)', () => {
  it('builder emits one issue-able review_proposal directive card per pending proposal', () => {
    const state = makeState({
      pendingProposalReviews: [
        { id: 'proposal_bravo', turn: 24, faction: 'RBiH', domain: 'military', description: 'Hold the Sarajevo ring stance.' },
        { id: 'proposal_alpha', turn: 24, faction: 'RBiH', domain: 'ops', description: 'Launch the Sana opening.' },
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const cards = view.cards.filter((c) => c.directive?.lever === 'review_proposal');

    expect(cards).toHaveLength(2);
    // Deterministic strictCompare order by proposal id (alpha before bravo).
    expect(cards.map((c) => c.directive?.payload.proposalId)).toEqual(['proposal_alpha', 'proposal_bravo']);
    for (const card of cards) {
      expect(card.directive).toBeDefined();
      expect(card.directive?.cost).toBe(0);
      expect(typeof card.directive?.payload.proposalId).toBe('string');
    }
  });

  it('filters proposal-review directive cards to the player faction', () => {
    const state = makeState({
      player_faction: 'RBiH',
      pendingProposalReviews: [
        { id: 'proposal_enemy', turn: 24, faction: 'RS', domain: 'ops', description: 'Enemy proposal should stay hidden.' },
        { id: 'proposal_player', turn: 24, faction: 'RBiH', domain: 'ops', description: 'Player proposal needs review.' },
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const proposalIds = view.cards
      .filter((c) => c.directive?.lever === 'review_proposal')
      .map((c) => c.directive?.payload.proposalId);

    expect(proposalIds).toEqual(['proposal_player']);
  });

  it('emits no review_proposal cards when there are no pending proposals', () => {
    const view = buildPresidentialDecisionRoomView({ state: makeState({ pendingProposalReviews: [] }) });
    expect(view.cards.some((c) => c.directive?.lever === 'review_proposal')).toBe(false);
  });

  it('Accept routes through acceptProposal and shows a next-turn receipt', async () => {
    const { acceptProposal, rejectProposal } = installIpc();

    render(React.createElement(DirectiveCard, { directive: reviewProposalDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(acceptProposal).toHaveBeenCalledWith('proposal_bravo');
    });
    expect(rejectProposal).not.toHaveBeenCalled();
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('Withhold routes through rejectProposal and shows a next-turn receipt', async () => {
    const { acceptProposal, rejectProposal } = installIpc();

    render(React.createElement(DirectiveCard, { directive: reviewProposalDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Withhold' }));

    await waitFor(() => {
      expect(rejectProposal).toHaveBeenCalledWith('proposal_bravo');
    });
    expect(acceptProposal).not.toHaveBeenCalled();
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('surfaces a failure receipt when the approval IPC refuses', async () => {
    installIpc({ acceptProposal: vi.fn(async () => ({ ok: false, error: 'proposal_resolved' })) });

    render(React.createElement(DirectiveCard, { directive: reviewProposalDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive was not staged: proposal_resolved',
    );
  });

  it('Cancel issues neither accept nor withhold', () => {
    const { acceptProposal, rejectProposal } = installIpc();

    render(React.createElement(DirectiveCard, { directive: reviewProposalDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel directive' }));

    expect(acceptProposal).not.toHaveBeenCalled();
    expect(rejectProposal).not.toHaveBeenCalled();
  });

  it('AutonomyPanel no longer issues the proposal approval (read-only queue)', () => {
    // Source-level guard: the AutonomyPanel must not call the accept/reject proposal IPC
    // (it moved to DirectiveCard). The panel still shows the pending queue for scan but
    // routes the decision to the Decision Room.
    const src = readFileSync(
      resolve(__dirnameLocal, '../../src/ui/map/components/AutonomyPanel.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/bridge\??\.acceptProposal\(/);
    expect(src).not.toMatch(/bridge\??\.rejectProposal\(/);
    // And the DirectiveCard IS the issuing surface.
    const directiveSrc = readFileSync(
      resolve(__dirnameLocal, '../../src/ui/map/components/army_hq/DirectiveCard.tsx'),
      'utf8',
    );
    expect(directiveSrc).toMatch(/ipc\.acceptProposal\(proposalId\)/);
    expect(directiveSrc).toMatch(/ipc\.rejectProposal\(proposalId\)/);
  });
});
