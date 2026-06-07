import { describe, expect, it } from 'vitest';
import { buildPresidentialDecisionRoomView } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { OpProposalCardView } from '../../src/ui/map/data/backTheOfficer.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

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

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  const latestTurnSummary = makeSummary();
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
    latestTurnSummary,
    turnSummaries: [latestTurnSummary],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

function makeOpProposalCard(overrides: Partial<OpProposalCardView> = {}): OpProposalCardView {
  return {
    proposal_id: 'APPROVE_OP:arbih_3rd_corps:plan_alpha',
    corps_id: 'arbih_3rd_corps',
    corps_name: '3rd Corps',
    plan_id: 'plan_alpha',
    op_id: 'op_alpha',
    op_name: 'Operation Alpha',
    commander: null,
    force_ratio_estimate: null,
    commander_assessment: 'postpone',
    donors: [],
    total_personnel_lent: 0,
    override_available: true,
    override_ca_cost: 15,
    framing: 'The commander withholds his approval.',
    ...overrides,
  };
}

const ACTIVE_CO = {
  id: 'arbih_co', name: 'Serving CO', faction: 'RBiH', rank: 'corps_commander',
  competence: 0.6, aggressiveness: 0.5, defensive_skill: 0.5, political_reliability: 4,
  origin: 'authored', status: 'active', assigned_corps_id: 'arbih_3rd_corps',
  acting_commander: false, turns_in_command: 8, battles: 2, victories: 1,
};

describe('Decision Room request-op + force-launch directives', () => {
  it('emits a request-op directive (cost 25, empty target) per player corps with an active CO', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
        { id: 'vrs_1st_corps', faction: 'RS', name: '1st Krajina Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [
        ACTIVE_CO,
        {
          ...ACTIVE_CO, id: 'vrs_co', name: 'Enemy CO', faction: 'RS', assigned_corps_id: 'vrs_1st_corps',
        },
      ] as LoadedGameState['namedOfficerData'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((c) => c.id === 'command:request-op:arbih_3rd_corps');

    expect(card?.category).toBe('command');
    expect(card?.directive).toEqual({
      lever: 'request_op',
      corpsId: 'arbih_3rd_corps',
      cost: 25,
      payload: {},
    });
    expect(card?.directive?.payload.targetOsid).toBeUndefined();
    // Enemy-faction corps never gets a request-op card.
    expect(view.cards.find((c) => c.id === 'command:request-op:vrs_1st_corps')).toBeUndefined();
  });

  it('omits a request-op card for a player corps with no active CO', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_4th_corps', faction: 'RBiH', name: '4th Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [] as LoadedGameState['namedOfficerData'],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    expect(view.cards.find((c) => c.id === 'command:request-op:arbih_4th_corps')).toBeUndefined();
  });

  it('emits a force-launch directive (cost 15, proposalId payload) for an override-available proposal', () => {
    const state = makeState({
      opProposalCards: [
        makeOpProposalCard(),
        makeOpProposalCard({
          proposal_id: 'APPROVE_OP:arbih_2nd_corps:plan_beta',
          corps_id: 'arbih_2nd_corps',
          corps_name: '2nd Corps',
          op_name: 'Operation Beta',
          override_available: false,
        }),
      ],
    });

    const view = buildPresidentialDecisionRoomView({ state });
    const card = view.cards.find((c) => c.id === 'command:force-launch:APPROVE_OP:arbih_3rd_corps:plan_alpha');

    expect(card?.category).toBe('command');
    expect(card?.directive).toEqual({
      lever: 'force_launch',
      corpsId: 'arbih_3rd_corps',
      cost: 15,
      // proposalId routes DirectiveCard through forceLaunchProposal (resolves the
      // pending review); opName retained for the caption only.
      payload: { opName: 'Operation Alpha', proposalId: 'APPROVE_OP:arbih_3rd_corps:plan_alpha' },
    });
    // override_available === false carries no force-launch card.
    expect(
      view.cards.find((c) => c.id === 'command:force-launch:APPROVE_OP:arbih_2nd_corps:plan_beta'),
    ).toBeUndefined();
  });

  it('orders request-op and force-launch cards deterministically', () => {
    const state = makeState({
      formations: [
        { id: 'arbih_b_corps', faction: 'RBiH', name: 'B Corps', kind: 'corps' },
        { id: 'arbih_a_corps', faction: 'RBiH', name: 'A Corps', kind: 'corps' },
      ] as LoadedGameState['formations'],
      namedOfficerData: [
        { ...ACTIVE_CO, id: 'co_a', assigned_corps_id: 'arbih_a_corps' },
        { ...ACTIVE_CO, id: 'co_b', assigned_corps_id: 'arbih_b_corps' },
      ] as LoadedGameState['namedOfficerData'],
      opProposalCards: [
        makeOpProposalCard({ proposal_id: 'APPROVE_OP:z', corps_id: 'arbih_a_corps', op_name: 'Z' }),
        makeOpProposalCard({ proposal_id: 'APPROVE_OP:a', corps_id: 'arbih_a_corps', op_name: 'A' }),
      ],
    });

    const first = buildPresidentialDecisionRoomView({ state });
    const second = buildPresidentialDecisionRoomView({ state });
    expect(second.cards.map((c) => c.id)).toEqual(first.cards.map((c) => c.id));

    const requestIds = first.cards.filter((c) => c.id.startsWith('command:request-op:')).map((c) => c.id);
    expect(requestIds).toEqual(['command:request-op:arbih_a_corps', 'command:request-op:arbih_b_corps']);

    const forceIds = first.cards.filter((c) => c.id.startsWith('command:force-launch:')).map((c) => c.id);
    expect(forceIds).toEqual(['command:force-launch:APPROVE_OP:a', 'command:force-launch:APPROVE_OP:z']);
  });

  it('emits no request-op or force-launch directives when there is no player faction', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        player_faction: null,
        formations: [
          { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
        ] as LoadedGameState['formations'],
        namedOfficerData: [ACTIVE_CO] as LoadedGameState['namedOfficerData'],
        opProposalCards: [makeOpProposalCard()],
      }),
    });

    expect(view.hasPlayerFaction).toBe(false);
    expect(view.cards).toEqual([]);
  });
});
