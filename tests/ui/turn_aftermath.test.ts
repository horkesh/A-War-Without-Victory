import { describe, expect, it } from 'vitest';
import { buildTurnAftermathView } from '../../src/ui/map/data/turnAftermath.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 12,
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
  const latestTurnSummary = overrides.latestTurnSummary === undefined
    ? makeSummary()
    : overrides.latestTurnSummary;
  return {
    label: 'Turn 12',
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
    latestTurnSummary,
    turnSummaries: latestTurnSummary ? [latestTurnSummary] : [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

describe('buildTurnAftermathView', () => {
  it('returns null without a loaded next state', () => {
    expect(buildTurnAftermathView({ nextState: null })).toBeNull();
  });

  it('summarizes player-scoped territory, combat, humanitarian, formation, supply, and inbox obligations', () => {
    const state = makeState({
      latestTurnSummary: makeSummary({
        territory_net: { RBiH: 2, RS: -2 },
        notable_flips: [
          { osid: 'op:bihac:kulen_vakuf', mun_id: 'bihac', from: 'RS', to: 'RBiH', significance: 'corridor' },
          { osid: 'op:sarajevo:dobrinja', mun_id: 'sarajevo', from: 'RBiH', to: 'RS', significance: 'municipality_seat' },
        ],
        battles: [
          {
            osid: 'op:bihac:kulen_vakuf',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'arbih_501st',
            primary_defender_id: 'rs_bihac',
            all_attacker_ids: ['arbih_501st'],
            outcome: 'decisive_victory' as never,
            attacker_casualties: 10,
            defender_casualties: 35,
            territory_flipped: true,
            was_concentrated: false,
          },
          {
            osid: 'op:sarajevo:dobrinja',
            attacker_faction: 'RS',
            defender_faction: 'RBiH',
            primary_attacker_id: 'rs_sarajevo',
            primary_defender_id: 'arbih_1st',
            all_attacker_ids: ['rs_sarajevo'],
            outcome: 'breakthrough' as never,
            attacker_casualties: 12,
            defender_casualties: 30,
            territory_flipped: true,
            was_concentrated: false,
          },
          {
            osid: 'op:livno:livno_2',
            attacker_faction: 'HRHB',
            defender_faction: 'RS',
            primary_attacker_id: 'hvo_livno',
            primary_defender_id: 'rs_livno',
            all_attacker_ids: ['hvo_livno'],
            outcome: 'stalemate' as never,
            attacker_casualties: 3,
            defender_casualties: 4,
            territory_flipped: false,
            was_concentrated: false,
          },
        ],
        displacement_total: 350,
        displacement_hotspot: 'bihac',
        formation_spawns: [
          { formation_id: 'arbih_new', formation_name: 'New Brigade', faction: 'RBiH', kind: 'brigade' },
          { formation_id: 'rs_new', formation_name: 'RS Brigade', faction: 'RS', kind: 'brigade' },
        ],
        formation_destructions: [
          { formation_id: 'arbih_lost', formation_name: 'Lost Brigade', faction: 'RBiH' },
        ],
        supply_deltas: { RBiH: -4 },
        heavy_munitions_deltas: { RBiH: 2 },
      }),
      pendingEventDecisions: [
        { event_id: 'evt_a', event_title: 'Convoy Decision', turn_fired: 12, faction: 'RBiH', response_options: [{ id: 'yes', label: 'Yes', effects: [] }] },
      ],
      pendingPeacePlan: {
        planId: 'vance',
        planName: 'Vance Plan',
        narrative: '',
        turnOffered: 12,
        proposedSplit: { RBiH: 33, RS: 34, HRHB: 33 },
        institutionalModel: 'cantons',
        botResponses: {},
      },
      pendingProposalReviews: [
        {
          id: 'PROP_12_opportunity_0',
          turn: 12,
          faction: 'RBiH',
          domain: 'ops',
          description: 'Operation Una - staff recommendation: delay',
          proposed_action: 'OPPORTUNITY:OPP_12_una',
        },
      ],
      pendingReserveRequests: [
        {
          request_id: 'reserve_1',
          corps_id: 'arbih_5th_corps',
          faction: 'RBiH',
          reason: 'pressure',
          priority: 1,
          severityBand: 'routine',
          travel_hops: 2,
          description: 'Reserve needed.',
          suggested_brigade_id: null,
          turn_requested: 12,
        },
      ],
      pendingOfficerEvents: [
        {
          event_id: 'officer_1',
          type: 'replacement_suggested',
          faction: 'RBiH',
          turn: 12,
          officer_id: 'officer_a',
          officer_name: 'Staff Officer',
          officer_competence: 0.6,
          officer_aggressiveness: 0.5,
          officer_defensive_skill: 0.4,
          acknowledged: false,
        },
      ],
    });

    const view = buildTurnAftermathView({
      nextState: state,
      osidNameMap: {
        'op:bihac:kulen_vakuf': 'Kulen Vakuf (Bihac)',
        'op:sarajevo:dobrinja': 'Dobrinja (Sarajevo)',
      },
    });

    expect(view).not.toBeNull();
    expect(view?.turn).toBe(12);
    expect(view?.dateLabel).toBe('24 Jun 1992');
    expect(view?.tone).toBe('gain');
    expect(view?.headline).toContain('+2');
    expect(view?.territory).toMatchObject({ friendlyNet: 2, gains: 1, losses: 1 });
    expect(view?.territory.notable.map((flip) => flip.label)).toEqual([
      'Kulen Vakuf (Bihac)',
      'Dobrinja (Sarajevo)',
    ]);
    expect(view?.combat).toMatchObject({
      battleCount: 3,
      friendlyBattleCount: 2,
      friendlyCasualties: 40,
      opposingCasualties: 47,
      territoryFlipsFromBattles: 2,
    });
    expect(view?.humanitarian).toEqual({
      displacedThisTurn: 350,
      hotspotLabel: 'Bihac',
    });
    expect(view?.formations).toMatchObject({ spawned: 2, destroyed: 1, ownSpawned: 1, ownDestroyed: 1 });
    expect(view?.supply).toEqual({ ownSupplyDelta: -4, ownHeavyMunitionsDelta: 2 });
    expect(view?.nextActions).toMatchObject({
      actionableCount: 5,
      blockingCount: 1,
      eventDecisionCount: 1,
      peaceCount: 1,
      opportunityCount: 1,
      reserveCount: 1,
      officerCount: 1,
    });
    expect(view?.nextActions.topItems.map((item) => item.id)).toEqual([
      'event:evt_a',
      'peace:vance',
      'opportunity:PROP_12_opportunity_0',
    ]);
  });

  it('derives loss and quiet tones from the player faction net change', () => {
    const loss = buildTurnAftermathView({
      nextState: makeState({ latestTurnSummary: makeSummary({ territory_net: { RBiH: -3, RS: 3 } }) }),
    });
    const quiet = buildTurnAftermathView({
      nextState: makeState({ latestTurnSummary: makeSummary({ territory_net: { RBiH: 0 } }) }),
    });

    expect(loss?.tone).toBe('loss');
    expect(loss?.headline).toContain('-3');
    expect(quiet?.tone).toBe('quiet');
    expect(quiet?.headline).toContain('No territorial change');
  });

  it('falls back to a quiet shell when the save has no latest turn summary yet', () => {
    const view = buildTurnAftermathView({ nextState: makeState({ latestTurnSummary: null, turnSummaries: [] }) });
    expect(view?.turn).toBe(12);
    expect(view?.tone).toBe('quiet');
    expect(view?.headline).toBe('Turn advanced.');
    expect(view?.nextActions.actionableCount).toBe(0);
  });
});
