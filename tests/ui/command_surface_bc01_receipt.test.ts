// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { getOpportunityOwnershipMetadata } from '../../src/desktop/desktop_sim.js';
import { OPERATION_OPPORTUNITY_CATALOG } from '../../src/sim/combat/operation_opportunities.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { CommandSurface } from '../../src/ui/map/components/command_surface/CommandSurface.js';
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
    render(createElement(CommandSurface, { onClose: () => {} }));
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
    render(createElement(CommandSurface, { onClose: () => {} }));
    expect(screen.getAllByText(loaded.operationOpportunityProposals![0].display_name).length).toBeGreaterThan(0);
    if (level === 2) expect(screen.getAllByText(/Projected factual evidence/).length).toBeGreaterThan(0);
  });
});
