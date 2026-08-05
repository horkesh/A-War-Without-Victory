import { describe, expect, it } from 'vitest';
import {
  buildHistoricalOperationAuthorizationDetails,
  parseHistoricalOperationAuthorizationAction,
} from '../../src/ui/map/data/historicalOperationAuthorization.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import {
  buildFieldOperationPlanPresentation,
  normalizeFieldOperationPlanTarget,
} from '../../src/ui/map/data/fieldOperationPlanFocus.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40',
    turn: 40,
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

describe('historical operation dossier -> field plan contract', () => {
  it('exposes exact, sorted, deduplicated Cerska-Kamenica references', () => {
    const historicalOp = parseHistoricalOperationAuthorizationAction(
      'HISTORICAL_OP:triggered:vrs_drina:Operation Cerska-Kamenica',
    );
    expect(historicalOp).not.toBeNull();

    const details = buildHistoricalOperationAuthorizationDetails(makeState(), historicalOp!);
    expect(details.corpsId).toBe('vrs_drina');
    expect(details.objectiveOsids).toEqual([
      'op:srebrenica:osmace_2',
      'op:srebrenica:radovcici',
      'op:srebrenica:sulice_2',
      'op:vlasenica:cerska_2',
    ]);
    expect(details.stagingOsids).toEqual([
      'op:srebrenica:osmace_2',
      'op:vlasenica:grabovica',
    ]);
    expect(details.formationIds).toEqual([
      'rs_1st_birac',
      'rs_1st_bratunac',
      'rs_1st_milii',
      'rs_1st_zvornik',
    ]);
  });

  it('does not invent references when an authored definition is unavailable', () => {
    const details = buildHistoricalOperationAuthorizationDetails(makeState(), {
      kind: 'triggered',
      corpsId: 'vrs_drina',
      operationName: 'Unknown operation',
    });
    expect(details).toMatchObject({
      corpsId: 'vrs_drina',
      objectiveOsids: [],
      stagingOsids: [],
      formationIds: [],
    });
  });

  it('normalizes every reference with stable ASCII ordering regardless of input order', () => {
    const normalized = normalizeFieldOperationPlanTarget({
      kind: 'field-operation-plan',
      proposalId: 'review-cerska',
      corpsId: 'vrs_drina',
      objectiveOsids: ['objective-b', 'objective-a', 'objective-b'],
      stagingOsids: ['staging-b', 'staging-a', 'staging-a'],
      formationIds: ['formation-b', 'formation-a', 'formation-b'],
    });
    expect(normalized.objectiveOsids).toEqual(['objective-a', 'objective-b']);
    expect(normalized.stagingOsids).toEqual(['staging-a', 'staging-b']);
    expect(normalized.formationIds).toEqual(['formation-a', 'formation-b']);
  });

  it('presents only reported, field-visible friendly participants with player-safe labels', () => {
    const state = makeState({
      formations: [
        { id: 'formation-b', faction: 'RS', name: 'Second Brigade', kind: 'brigade', readiness: 'ready', status: 'active', createdTurn: 0, tags: [], location_osid: 'objective-b' },
        { id: 'formation-a', faction: 'RS', name: 'First Brigade', kind: 'brigade', readiness: 'ready', status: 'active', createdTurn: 0, tags: [], location_osid: 'objective-a' },
        { id: 'formation-hidden', faction: 'RBiH', name: 'Enemy Brigade', kind: 'brigade', readiness: 'ready', status: 'active', createdTurn: 0, tags: [], location_osid: 'objective-a' },
        { id: 'formation-unreported', faction: 'RS', name: 'Unlocated Brigade', kind: 'brigade', readiness: 'ready', status: 'active', createdTurn: 0, tags: [] },
      ],
    });
    const presentation = buildFieldOperationPlanPresentation({
      target: {
        kind: 'field-operation-plan',
        proposalId: 'review-cerska',
        corpsId: 'vrs_drina',
        objectiveOsids: ['objective-b', 'objective-a'],
        stagingOsids: ['staging-a'],
        formationIds: ['formation-hidden', 'formation-unreported', 'formation-b', 'formation-a'],
      },
      state,
      osidNameMap: {
        'objective-a': 'Objective Alpha',
        'objective-b': 'Objective Bravo',
        'staging-a': 'Assembly Area',
      },
    });

    expect(presentation.objectives.map((item) => item.label)).toEqual(['Objective Alpha', 'Objective Bravo']);
    expect(presentation.staging.map((item) => item.label)).toEqual(['Assembly Area']);
    expect(presentation.participants).toEqual([
      { id: 'formation-a', label: 'First Brigade', locationLabel: 'Objective Alpha' },
      { id: 'formation-b', label: 'Second Brigade', locationLabel: 'Objective Bravo' },
    ]);
    expect(JSON.stringify(presentation)).not.toContain('formation-hidden');
    expect(JSON.stringify(presentation)).not.toContain('formation-unreported');
  });

  it('attaches the exact field target to the same historical-operation dossier', () => {
    const state = makeState({
      pendingProposalReviews: [{
        id: 'review-cerska',
        faction: 'RS',
        domain: 'ops',
        description: 'Authorize Operation Cerska-Kamenica.',
        proposed_action: 'HISTORICAL_OP:triggered:vrs_drina:Operation Cerska-Kamenica',
        accepted: null,
      }] as LoadedGameState['pendingProposalReviews'],
    });
    const view = buildPresidentialDecisionRoomView({
      state,
      selectedCardId: 'command:review-proposal:review-cerska',
    });

    expect(view.activeDossier?.cardId).toBe('command:review-proposal:review-cerska');
    expect(view.activeDossier?.fieldInspectionTarget).toEqual({
      kind: 'field-operation-plan',
      proposalId: 'review-cerska',
      corpsId: 'vrs_drina',
      objectiveOsids: [
        'op:srebrenica:osmace_2',
        'op:srebrenica:radovcici',
        'op:srebrenica:sulice_2',
        'op:vlasenica:cerska_2',
      ],
      stagingOsids: ['op:srebrenica:osmace_2', 'op:vlasenica:grabovica'],
      formationIds: ['rs_1st_birac', 'rs_1st_bratunac', 'rs_1st_milii', 'rs_1st_zvornik'],
    });
  });
});
