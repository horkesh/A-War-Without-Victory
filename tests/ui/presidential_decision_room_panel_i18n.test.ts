// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { getOpportunityOwnershipMetadata } from '../../src/desktop/desktop_sim.js';
import { OPERATION_OPPORTUNITY_CATALOG } from '../../src/sim/combat/operation_opportunities.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { PresidentialDecisionRoomPanel } from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import {
  __resetDecisionRoomLensRequestForTest,
  requestDecisionRoomLens,
} from '../../src/ui/map/utils/decisionRoomLensRequest.js';

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
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 24,
    battles: [],
    territory_net: {},
    notable_flips: [],
    displacement_total: 0,
    displacement_by_ethnicity: {},
    decoration_awards: [],
    arc_transitions: [],
    formation_spawns: [],
    formation_destructions: [],
    supply_deltas: {},
    heavy_munitions_deltas: {},
    movements: [],
    supply_transitions: [],
    events_fired: [],
    notable_events: [],
    ...overrides,
  };
}

describe('PresidentialDecisionRoomPanel i18n', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState({
      loadedGameState: null,
      osidDisplayNames: null,
    });
    Reflect.deleteProperty(window, 'awwv');
    __resetDecisionRoomLensRequestForTest();
  });

  it('localizes static flat Decision Room panel chrome in BCS mode', () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    expect(screen.getByRole('button', { name: /Sve 3 stavki/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Komanda 3 stavki/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /napredno/i })).toBeNull();
    expect(screen.queryByText('Strategic Priorities')).toBeNull();
    expect(screen.queryByText(/ocekivano|ocekivanje|ocekove/i)).toBeNull();
    expect(screen.queryByText(/napredni/i)).toBeNull();
  });

  it('opens an exact command category filter from a command-card request', async () => {
    useGameStore.setState({
      loadedGameState: makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            mode: 'offensive',
            strength: 80,
            target_osid: 'op:test:alpha',
            estimated_civilian_risk: 12,
          },
        ],
        playerDecisionSummary: {
          totalCount: 1,
          blockingCount: 1,
          families: [{ id: 'peace_plan', count: 1, gatePolicy: 'modal_required' }],
        },
      }),
      osidDisplayNames: null,
    });

    requestDecisionRoomLens('all', 'cat_conscience');
    render(createElement(PresidentialDecisionRoomPanel));

    expect(await screen.findByTestId('decision-room-priority-card-paramilitary:pending')).toBeTruthy();
    expect(screen.queryByTestId('decision-room-priority-card-manifest:peace_plan')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hide Advanced' })).toBeNull();
    expect(screen.queryByText('Advanced Review')).toBeNull();
  });

  it('clears a stale requested card id instead of leaving a blank dossier', async () => {
    useGameStore.setState({
      loadedGameState: makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            mode: 'offensive',
            strength: 80,
            target_osid: 'op:test:alpha',
            estimated_civilian_risk: 12,
          },
        ],
      }),
      osidDisplayNames: null,
    });

    requestDecisionRoomLens('turn', null, 'missing-card');
    render(createElement(PresidentialDecisionRoomPanel));

    expect(await screen.findByTestId('decision-room-priority-card-paramilitary:pending')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText('No priority dossier selected.')).toBeNull();
    });
  });

  it('retains an explicitly selected command category when that category becomes quiet', async () => {
    useGameStore.setState({
      loadedGameState: makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            mode: 'offensive',
            strength: 80,
            target_osid: 'op:test:alpha',
            estimated_civilian_risk: 12,
          },
        ],
        playerDecisionSummary: {
          totalCount: 1,
          blockingCount: 1,
          families: [{ id: 'peace_plan', count: 1, gatePolicy: 'modal_required' }],
        },
      }),
      osidDisplayNames: null,
    });

    requestDecisionRoomLens('all', 'cat_conscience');
    const { rerender } = render(createElement(PresidentialDecisionRoomPanel));
    expect(await screen.findByTestId('decision-room-priority-card-paramilitary:pending')).toBeTruthy();

    useGameStore.setState({
      loadedGameState: makeState({
        latestTurnSummary: makeSummary({ territory_net: { RBiH: -1 }, displacement_total: 2000 }),
        turnSummaries: [makeSummary({ territory_net: { RBiH: -1 }, displacement_total: 2000 })],
      }),
      osidDisplayNames: null,
    });
    rerender(createElement(PresidentialDecisionRoomPanel));

    await waitFor(() => {
      expect(screen.queryByTestId('decision-room-priority-card-paramilitary:pending')).toBeNull();
      expect(screen.queryByTestId('decision-room-priority-card-turn:24:hard-turn')).toBeNull();
      expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_conscience');
      expect(screen.getByRole('status').textContent).toContain('Filtered by Conscience & Atrocity');
      expect(screen.getByRole('button', { name: 'Clear category filter' })).toBeTruthy();
      expect(screen.getByText('No items in this command category.')).toBeTruthy();
      expect(screen.queryByText('Priority Dossier')).toBeNull();
      expect(screen.getByTestId('decision-room-lens-all').getAttribute('aria-pressed')).toBe('false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear category filter' }));

    await waitFor(() => {
      expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('');
      expect(screen.getByTestId('decision-room-lens-all').getAttribute('aria-pressed')).toBe('true');
      // The hard-turn card is present in the restored, unfiltered list...
      expect(screen.getByTestId('decision-room-priority-card-turn:24:hard-turn')).toBeTruthy();
      expect(screen.getByText('Priority Dossier')).toBeTruthy();
      // ...but is record-only (informational: it reports what already
      // happened, there is nothing to decide). The priority model ranks
      // actionable presidential-lever cards above record-only ones
      // (finalizeCards: `recordOnly: card.category === 'turn' | 'cost' |
      // 'memory'`), so the correctly-restored default active dossier is the
      // highest-priority lever card, never the stale removed
      // paramilitary:pending card or the hard-turn record itself.
      const activeDossierCardId = screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id');
      expect(activeDossierCardId).not.toBe('paramilitary:pending');
      expect(activeDossierCardId).not.toBe('turn:24:hard-turn');
    });
  });

  it('does not render disabled quiet-state controls after removing meta scaffolding', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    const { container } = render(createElement(PresidentialDecisionRoomPanel));

    const disabledButtons = [...container.querySelectorAll('button[disabled]')];
    expect(disabledButtons.every((button) => (
      (
        button.getAttribute('data-testid') === 'decision-room-dossier-review'
        || button.getAttribute('data-testid')?.startsWith('decision-room-card-action-')
      )
      && /Current Dossier/i.test(button.textContent ?? '')
    ))).toBe(true);
    expect(container.textContent).not.toContain('No current item is available for this action.');
    expect(screen.queryByRole('button', { name: 'View Advanced' })).toBeNull();
  });

  it('localizes priority-card severity badges in BCS mode', async () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            mode: 'offensive',
            strength: 80,
            target_osid: 'op:test:alpha',
            estimated_civilian_risk: 12,
          },
        ],
      }),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    const card = await screen.findByTestId('decision-room-priority-card-paramilitary:pending');
    expect(card.textContent).toContain('Blokira');
    expect(card.textContent).not.toMatch(/\bblocking\b/i);
  });

  it('groups six opening operation authorizations into one packet with one historical authorization action', async () => {
    const operationNames = ['Drina', 'Prijedor', 'Koridor', 'Vrbas', 'Hercegovina', 'Podrinje'];
    const acceptProposal = vi.fn(async (_proposalId: string) => ({ ok: true }));
    Object.defineProperty(window, 'awwv', {
      configurable: true,
      value: {
        acceptProposal,
        rejectProposal: async () => ({ ok: true }),
      },
    });
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        turn: 0,
        pendingProposalReviews: operationNames.map((name, index) => ({
          id: `opening_operation_${index + 1}`,
          turn: 0,
          faction: 'RS',
          domain: 'ops',
          description: `Authorize Operation ${name}.`,
          proposed_action: `HISTORICAL_OP:preplanned:vrs_corps_${index + 1}:Operation ${name}`,
          current_value: 'awaiting_authorization',
          proposed_value: 'authorize',
        })),
      } as Partial<LoadedGameState>),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    const packet = screen.getByTestId('operations-authorization-packet');
    expect(within(packet).getByText('Operations authorization packet')).toBeTruthy();
    expect(within(packet).getByText('6 independent authorizations')).toBeTruthy();
    const cards = packet.querySelectorAll('[data-testid^="decision-room-priority-card-command:review-proposal:"]');
    expect(cards).toHaveLength(6);
    fireEvent.click(within(packet).getByRole('button', { name: 'Authorize historical packet' }));
    await waitFor(() => {
      expect(acceptProposal.mock.calls.map(([proposalId]) => proposalId)).toEqual(
        operationNames.map((_name, index) => `opening_operation_${index + 1}`),
      );
    });

    for (const card of Array.from(cards)) {
      fireEvent.click(within(card as HTMLElement).getByRole('button', { name: 'Dossier' }));
      expect(screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id'))
        .toBe(card.getAttribute('data-testid')?.replace('decision-room-priority-card-', ''));
      expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Withhold' })).toBeTruthy();
    }
  });
});


describe('BC01 mounted Decision Room receipt', () => {
  afterEach(() => { cleanup(); useGameStore.setState({ loadedGameState: null }); __resetDecisionRoomLensRequestForTest(); });
  it('surfaces an automatic launch without a review id in the real panel', () => {
    setLocale('en');
    useGameStore.setState({ loadedGameState: makeState({ operationOpportunityProposals: [{
      proposal_id: 'bc01-live', opportunity_id: 'fixture', faction: 'RBiH', display_name: 'BC01 actual launch',
      status: 'approved', decision_outcome: 'launched', decision_evidence: ['Reserve assembled'],
      launch: { corps_id: 'corps', op_name: 'Exact operation', started_turn: 23, phase: 'execution', commander_name: 'Commander Example', assessment: 'launch' },
      available_actions: [], prerequisite_axes: [], force_quality_traits: [], objectives: [], staging: [], redirect_variants: [],
    } as any], operations: [] }) });
    const view = buildPresidentialDecisionRoomView({ state: useGameStore.getState().loadedGameState });
    expect(view.metrics.pendingReviews).toBe(0);
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(false);
    requestDecisionRoomLens('opportunity', null, 'opportunity:bc01-live');
    render(createElement(PresidentialDecisionRoomPanel));
    expect(screen.getAllByText('BC01 actual launch').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reserve assembled/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Commander Example/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stop op is available only/).length).toBeGreaterThan(0);
  });
});


describe('BC01 live Decision Room exact launch directive', () => {
  it.each(['exact', 'later', 'wrong-faction', 'preparation', 'duplicate', 'defensive'])('routes %s safely', kind => {
    const op: any = { name: 'Exact', corps_id: 'corps', faction: 'RBiH', phase: 'execution', started_turn: 23 };
    const opportunity: any = { proposal_id: 'receipt', display_name: 'Receipt', faction: 'RBiH', decision_outcome: 'launched',
      launch: { corps_id: 'corps', op_name: 'Exact', started_turn: 23 }, available_actions: [] };
    const operations = [op];
    if (kind === 'later') op.started_turn = 24;
    if (kind === 'wrong-faction') op.faction = 'RS';
    if (kind === 'preparation') op.phase = 'planning';
    if (kind === 'duplicate') operations.push({ ...op });
    if (kind === 'defensive') { opportunity.launch = undefined; opportunity.decision_outcome = 'defensive_commitment'; }
    const view = buildPresidentialDecisionRoomView({ state: makeState({ operations, operationOpportunityProposals: [opportunity] }) });
    const card = view.cards.find(card => card.id === 'opportunity:receipt');
    expect(card).toBeDefined();
    expect(view.metrics.pendingReviews).toBe(0);
    expect(view.advanceReadiness.blockedByExistingSystems).toBe(false);
    if (kind === 'exact') expect(card?.directive).toMatchObject({ lever: 'stop_op', payload: { corpsId: 'corps', opName: 'Exact' } });
    else expect(card?.directive).toBeUndefined();
    if (kind === 'defensive') expect(card?.explanation).toContain('no offensive operation');
  });
});


describe('BC01 desktop projection through adapter to mounted Decision Room', () => {
  afterEach(() => { cleanup(); useGameStore.setState({ loadedGameState: null }); __resetDecisionRoomLensRequestForTest(); });
  it.each([0, 2])('preserves the level %s own opportunity across the real IPC boundary', level => {
    setLocale('en');
    const def = OPERATION_OPPORTUNITY_CATALOG.find(def => def.faction === 'RBiH')!;
    const raw: any = {
      schema_version: 34, meta: { phase: 'war', turn: 24, player_faction: 'RBiH', autonomy_level: level,
        pending_proposal_reviews: level === 0 ? [{ id: 'review', faction: 'RBiH', proposed_action: 'OPPORTUNITY:proposal', resolved_turn: null }] : [] },
      factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }], political: { political_controllers: {} },
      military: { formations: { [def.primary_corps]: { id: def.primary_corps, faction: 'RBiH', kind: 'corps', name: 'Own Corps', status: 'active' } },
        corps_command: { [def.primary_corps]: { active_operations: level === 2 ? [{ name: 'Projected launch', started_turn: 23, phase: 'execution', type: 'offensive', participating_brigades: [], objectives: [] }] : [] } },
        operation_opportunities: [{ proposal_id: 'proposal', opportunity_id: def.opportunity_id, approver_faction: 'RBiH',
          status: level === 0 ? 'eligible_pending_review' : 'approved', response_turn: level === 2 ? 23 : undefined,
          last_axis_evaluation: [{ axis: 'readiness', mode: 'required', green: true, reason: 'Projected factual evidence' }] }],
        operation_opportunity_resolutions: level === 2 ? [{ proposal_id: 'proposal', opportunity_id: def.opportunity_id, response_turn: 23, response: 'approve', executed_op_name: 'Projected launch' }] : [],
      },
    };
    const projector = createRequire(import.meta.url)('../../src/desktop/player_visible_state.cjs');
    const projected = projector.projectPlayerVisibleState(raw, undefined, getOpportunityOwnershipMetadata());
    const loaded = parseGameState(projected);
    expect(loaded.operationOpportunityProposals).toHaveLength(1);
    expect(loaded.operationOpportunityProposals![0].review_id).toBe(level === 0 ? 'review' : undefined);
    if (level === 2) expect(loaded.operationOpportunityProposals![0].launch?.op_name).toBe('Projected launch');
    useGameStore.setState({ loadedGameState: loaded });
    requestDecisionRoomLens('opportunity', null, 'opportunity:proposal');
    render(createElement(PresidentialDecisionRoomPanel));
    expect(screen.getAllByText(loaded.operationOpportunityProposals![0].display_name).length).toBeGreaterThan(0);
    if (level === 2) expect(screen.getAllByText(/Projected factual evidence/).length).toBeGreaterThan(0);
  });
});
