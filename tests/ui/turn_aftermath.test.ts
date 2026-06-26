import { afterEach, describe, expect, it } from 'vitest';
import { buildTurnAftermathCampaignCost, buildTurnAftermathCampaignPulse, buildTurnAftermathLedgerSummary, buildTurnAftermathRecordViews, buildTurnAftermathView, filterTurnAftermathRecords } from '../../src/ui/map/data/turnAftermath.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

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
  afterEach(() => {
    setLocale('en');
  });

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
        { event_id: 'evt_a', event_title: 'Convoy Decision', turn_fired: 12, faction: 'RBiH', requires_player_response: true, response_options: [{ id: 'yes', label: 'Yes', effects: [] }] },
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
      operationOpportunityProposals: [
        {
          proposal_id: 'OPP_12_una',
          opportunity_id: 'una_window',
          display_name: 'Operation Una',
          faction: 'RBiH',
          status: 'eligible_pending_review',
          review_id: 'PROP_12_opportunity_0',
          proposed_action: 'OPPORTUNITY:OPP_12_una',
          prerequisite_axes: [],
          force_quality_traits: [],
          objectives: [],
          staging: [],
          redirect_variants: [],
          available_actions: [],
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
    expect(view?.dateLabel).toBe('29 Jun 1992');
    expect(view?.tone).toBe('gain');
    expect(view?.headline).toContain('+2');
    expect(view?.narrativeLine).toBe('The week ends with ground taken, but the ledger still decides what the advance cost.');
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
    expect(view?.cost).toEqual({
      friendlyMilitaryCasualties: 40,
      theaterMilitaryCasualties: 94,
      displacedThisTurn: 350,
      ownFormationsDestroyed: 1,
      ownSupplySpent: 4,
      ownHeavyMunitionsSpent: 0,
      severity: 'critical',
      reasons: ['40 friendly casualties', '1 formation destroyed', '350 displaced'],
    });
    expect(view?.judgment).toEqual({
      headline: 'Hard turn entered the record.',
      detail: 'The turn cost register is critical: 40 friendly casualties / 1 formation destroyed / 350 displaced.',
      memoryTone: 'cost',
      primarySurface: 'chronicle',
      secondarySurface: 'codex',
    });
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
      'opportunity:OPP_12_una',
    ]);
  });

  it('keeps sparse battle casualties and absent displacement from becoming exact cost drivers', () => {
    const view = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          turn: 13,
          territory_net: { RBiH: 1 },
          battles: [{
            osid: 'op:test:sparse',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'arbih_1',
            primary_defender_id: 'rs_1',
            all_attacker_ids: ['arbih_1'],
            outcome: 'stalemate' as never,
            attacker_casualties: undefined as never,
            defender_casualties: 60,
            territory_flipped: false,
            was_concentrated: false,
          }],
          displacement_total: undefined as never,
        }),
      }),
    })!;

    expect(view.combat).toMatchObject({
      friendlyBattleCount: 1,
      friendlyCasualties: 0,
      opposingCasualties: 60,
    });
    expect(view.humanitarian.displacedThisTurn).toBe(0);
    expect(view.cost.friendlyMilitaryCasualties).toBe(0);
    expect(view.cost.theaterMilitaryCasualties).toBe(60);
    expect(view.cost.displacedThisTurn).toBe(0);
    expect(view.cost.severity).toBe('moderate');
    expect(view.cost.reasons).toEqual(['No major costs recorded']);
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
    expect(loss?.narrativeLine).toBe('The map contracted this week; command must decide whether to stabilize or answer.');
    expect(quiet?.tone).toBe('quiet');
    expect(quiet?.headline).toContain('No territorial change');
    expect(quiet?.narrativeLine).toBe('A quiet week is still a week of depletion, waiting, and staff work.');
  });

  it('treats turn-0 territory_net as scenario-start provenance, not net change', () => {
    const view = buildTurnAftermathView({
      nextState: makeState({
        turn: 0,
        latestTurnSummary: makeSummary({
          turn: 0,
          territory_net: { RBiH: 2, RS: -2 },
          notable_flips: [
            { osid: 'op:sarajevo:dobrinja', mun_id: 'sarajevo', from: 'RS', to: 'RBiH', significance: 'generic' },
          ],
          battles: [{
            osid: 'op:sarajevo:dobrinja',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'arbih_setup',
            primary_defender_id: 'rs_setup',
            all_attacker_ids: ['arbih_setup'],
            outcome: 'decisive_victory' as never,
            attacker_casualties: 25,
            defender_casualties: 40,
            territory_flipped: true,
            was_concentrated: false,
          }],
          displacement_total: 1200,
          displacement_hotspot: 'sarajevo',
          formation_spawns: [
            { formation_id: 'arbih_setup_new', formation_name: 'Setup Brigade', faction: 'RBiH', kind: 'brigade' },
          ],
          formation_destructions: [
            { formation_id: 'arbih_setup_lost', formation_name: 'Setup Lost Brigade', faction: 'RBiH' },
          ],
          supply_deltas: { RBiH: -12 },
          heavy_munitions_deltas: { RBiH: -3 },
          events_fired: [
            { id: 'setup_event', text: 'Setup event should not be a turn signal.' },
          ],
          notable_events: [
            { kind: 'siege_formed', description: 'Setup notable event should not be a turn signal.', osid: 'op:sarajevo:dobrinja' },
          ],
          decoration_awards: [
            {
              formation_id: 'arbih_setup',
              formation_name: 'Setup Brigade',
              faction: 'RBiH',
              decoration: { tier: 'tier_1', awarded_turn: 0, reason: 'Setup-only award' },
            },
          ],
          movements: [
            {
              formation_id: 'arbih_setup',
              formation_name: 'Setup Brigade',
              from_osid: 'op:sarajevo:old',
              to_osid: 'op:sarajevo:dobrinja',
            },
          ],
        }),
      }),
      osidNameMap: { 'op:sarajevo:dobrinja': 'Dobrinja (Sarajevo)' },
    });

    expect(view?.tone).toBe('quiet');
    expect(view?.territory.friendlyNet).toBe(0);
    expect(view?.territory.gains).toBe(0);
    expect(view?.territory.losses).toBe(0);
    expect(view?.territory.notable).toEqual([]);
    expect(view?.headline).toBe('No territorial change this turn.');
    expect(view?.narrativeLine).toBe('A quiet week is still a week of depletion, waiting, and staff work.');
    expect(view?.combat).toMatchObject({
      battleCount: 0,
      friendlyBattleCount: 0,
      friendlyCasualties: 0,
      opposingCasualties: 0,
      territoryFlipsFromBattles: 0,
    });
    expect(view?.humanitarian).toEqual({ displacedThisTurn: 0, hotspotLabel: undefined });
    expect(view?.formations).toEqual({ spawned: 0, destroyed: 0, ownSpawned: 0, ownDestroyed: 0 });
    expect(view?.supply).toEqual({ ownSupplyDelta: 0, ownHeavyMunitionsDelta: 0 });
    expect(view?.cost).toEqual({
      friendlyMilitaryCasualties: 0,
      theaterMilitaryCasualties: 0,
      displacedThisTurn: 0,
      ownFormationsDestroyed: 0,
      ownSupplySpent: 0,
      ownHeavyMunitionsSpent: 0,
      severity: 'low',
      reasons: ['No major costs recorded'],
    });
    expect(view?.signals).toEqual([]);
    expect(view?.judgment.memoryTone).toBe('quiet');
  });

  it('treats setup-control provenance as setup history even after turn zero', () => {
    const view = buildTurnAftermathView({
      nextState: makeState({
        turn: 1,
        latestTurnSummary: makeSummary({
          turn: 1,
          territory_net: { RBiH: 2, RS: -2 },
          notable_flips: [
            { osid: 'op:sarajevo:dobrinja', mun_id: 'sarajevo', from: 'RS', to: 'RBiH', significance: 'generic' },
          ],
          battles: [{
            osid: 'op:sarajevo:dobrinja',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'arbih_setup',
            primary_defender_id: 'rs_setup',
            all_attacker_ids: ['arbih_setup'],
            outcome: 'decisive_victory' as never,
            attacker_casualties: 25,
            defender_casualties: 40,
            territory_flipped: true,
            was_concentrated: false,
          }],
          displacement_total: 1200,
          formation_destructions: [
            { formation_id: 'arbih_setup_lost', formation_name: 'Setup Lost Brigade', faction: 'RBiH' },
          ],
          supply_deltas: { RBiH: -12 },
          events_fired: [
            { id: 'setup_event', text: 'Setup event should not be a turn signal.' },
          ],
          mechanism: 'setup_control',
        } as Partial<TurnSummary> & { mechanism: string }),
      }),
      osidNameMap: { 'op:sarajevo:dobrinja': 'Dobrinja (Sarajevo)' },
    });

    expect(view?.tone).toBe('quiet');
    expect(view?.territory.friendlyNet).toBe(0);
    expect(view?.territory.notable).toEqual([]);
    expect(view?.headline).toBe('No territorial change this turn.');
    expect(view?.combat.battleCount).toBe(0);
    expect(view?.humanitarian.displacedThisTurn).toBe(0);
    expect(view?.cost).toMatchObject({
      friendlyMilitaryCasualties: 0,
      theaterMilitaryCasualties: 0,
      displacedThisTurn: 0,
      ownFormationsDestroyed: 0,
      ownSupplySpent: 0,
      severity: 'low',
    });
    expect(view?.signals).toEqual([]);
  });

  it('falls back to a quiet shell when the save has no latest turn summary yet', () => {
    const view = buildTurnAftermathView({ nextState: makeState({ latestTurnSummary: null, turnSummaries: [] }) });
    expect(view?.turn).toBe(12);
    expect(view?.tone).toBe('quiet');
    expect(view?.headline).toBe('Turn advanced.');
    expect(view?.judgment).toMatchObject({
      headline: 'No judgment recorded yet.',
      memoryTone: 'quiet',
      primarySurface: 'records',
    });
    expect(view?.nextActions.actionableCount).toBe(0);
    expect(view?.cost.severity).toBe('low');
  });

  it('localizes generated aftermath prose when BCS is selected', () => {
    setLocale('bcs');

    const view = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          territory_net: { RBiH: 2 },
          battles: [{
            osid: 'op:test:a',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'a',
            primary_defender_id: 'b',
            all_attacker_ids: ['a'],
            outcome: 'victory' as never,
            attacker_casualties: 12,
            defender_casualties: 20,
            territory_flipped: true,
            was_concentrated: false,
          }],
          displacement_total: 80,
          formation_destructions: [{ formation_id: 'lost', formation_name: 'Lost', faction: 'RBiH' }],
        }),
      }),
    });

    expect(view?.dateLabel).toBe('29 jun 1992');
    expect(view?.headline).toBe('Neto teritorijalni dobitak: +2 položaja.');
    expect(view?.narrativeLine).toBe('Sedmica završava osvojenim prostorom, ali knjiga troška još određuje cijenu napredovanja.');
    expect(view?.cost.reasons).toEqual(['12 prijateljskih gubitaka', '1 formacija uništena', '80 raseljenih']);
    expect(view?.judgment).toEqual({
      headline: 'Težak potez je ušao u zapis.',
      detail: 'Registar troška poteza je kritičan: 12 prijateljskih gubitaka / 1 formacija uništena / 80 raseljenih.',
      memoryTone: 'cost',
      primarySurface: 'chronicle',
      secondarySurface: 'codex',
    });
  });

  it('builds newest-first persistent records from turn summaries with latest-summary fallback', () => {
    const turn10 = makeSummary({ turn: 10, territory_net: { RBiH: -1 } });
    const turn11 = makeSummary({ turn: 11, territory_net: { RBiH: 0 } });
    const turn12 = makeSummary({ turn: 12, territory_net: { RBiH: 2 } });
    const state = makeState({
      turn: 12,
      latestTurnSummary: turn12,
      turnSummaries: [turn10, turn11],
      pendingEventDecisions: [
        { event_id: 'evt_latest', event_title: 'Latest Decision', turn_fired: 12, faction: 'RBiH', response_options: [{ id: 'yes', label: 'Yes', effects: [] }] },
      ],
    });

    const records = buildTurnAftermathRecordViews({ state, limit: 2 });

    expect(records.map((record) => record.turn)).toEqual([12, 11]);
    expect(records.map((record) => record.tone)).toEqual(['gain', 'quiet']);
    expect(records.map((record) => record.nextActions.actionableCount)).toEqual([1, 0]);
  });

  it('excludes turn-zero setup summaries from persistent aftermath records', () => {
    const setupSummary = makeSummary({
      turn: 0,
      territory_net: { RBiH: -4 },
      displacement_total: 900,
      notable_flips: [
        { osid: 'op:test:setup', mun_id: 'test', from: 'RS', to: 'RBiH', significance: 'generic' },
      ],
    });
    const state = makeState({
      turn: 0,
      latestTurnSummary: setupSummary,
      turnSummaries: [setupSummary],
    });

    expect(buildTurnAftermathRecordViews({ state })).toEqual([]);
    expect(buildTurnAftermathCampaignCost({ state })).toMatchObject({
      recordCount: 0,
      headline: 'No campaign cost records yet.',
      totalDisplaced: 0,
      netFriendlyTerritory: 0,
    });
  });

  it('summarizes persistent aftermath records into a campaign ledger pulse', () => {
    const records = [
      buildTurnAftermathView({
        nextState: makeState({
          latestTurnSummary: makeSummary({
            turn: 20,
            territory_net: { RBiH: 2 },
            displacement_total: 1200,
            battles: [{
              osid: 'op:test:a',
              attacker_faction: 'RBiH',
              defender_faction: 'RS',
              primary_attacker_id: 'a',
              primary_defender_id: 'b',
              all_attacker_ids: ['a'],
              outcome: 'victory' as never,
              attacker_casualties: 90,
              defender_casualties: 50,
              territory_flipped: true,
              was_concentrated: false,
            }],
          }),
        }),
      })!,
      buildTurnAftermathView({
        nextState: makeState({
          latestTurnSummary: makeSummary({
            turn: 19,
            territory_net: { RBiH: -1 },
            displacement_total: 25,
            formation_destructions: [{ formation_id: 'lost', formation_name: 'Lost', faction: 'RBiH' }],
          }),
        }),
      })!,
    ];

    expect(buildTurnAftermathLedgerSummary(records)).toEqual({
      recordCount: 2,
      netFriendlyTerritory: 1,
      totalFriendlyMilitaryCasualties: 90,
      totalTheaterMilitaryCasualties: 140,
      totalDisplaced: 1225,
      totalOwnFormationsDestroyed: 1,
      criticalTurns: 2,
      severeTurns: 0,
    });
  });

  it('builds an active campaign cost view from the full turn archive', () => {
    const turn18 = makeSummary({
      turn: 18,
      territory_net: { RBiH: -2 },
      displacement_total: 4000,
      formation_destructions: [{ formation_id: 'arbih_lost_a', formation_name: 'Lost A', faction: 'RBiH' }],
      battles: [{
        osid: 'op:test:a',
        attacker_faction: 'RBiH',
        defender_faction: 'RS',
        primary_attacker_id: 'a',
        primary_defender_id: 'b',
        all_attacker_ids: ['a'],
        outcome: 'defeat' as never,
        attacker_casualties: 40,
        defender_casualties: 10,
        territory_flipped: false,
        was_concentrated: false,
      }],
    });
    const turn19 = makeSummary({ turn: 19, territory_net: { RBiH: 1 } });
    const turn20 = makeSummary({
      turn: 20,
      territory_net: { RBiH: 3 },
      displacement_total: 1200,
      formation_destructions: [{ formation_id: 'arbih_lost_b', formation_name: 'Lost B', faction: 'RBiH' }],
      battles: [{
        osid: 'op:test:b',
        attacker_faction: 'RS',
        defender_faction: 'RBiH',
        primary_attacker_id: 'c',
        primary_defender_id: 'd',
        all_attacker_ids: ['c'],
        outcome: 'breakthrough' as never,
        attacker_casualties: 40,
        defender_casualties: 120,
        territory_flipped: true,
        was_concentrated: false,
      }],
    });

    const cost = buildTurnAftermathCampaignCost({
      state: makeState({
        turn: 20,
        latestTurnSummary: turn20,
        turnSummaries: [turn18, turn19],
      }),
    });

    expect(cost).toMatchObject({
      recordCount: 3,
      severity: 'critical',
      headline: 'Campaign cost is critical.',
      netFriendlyTerritory: 2,
      totalFriendlyMilitaryCasualties: 160,
      totalOpposingMilitaryCasualties: 50,
      totalTheaterMilitaryCasualties: 210,
      totalDisplaced: 5200,
      totalOwnFormationsDestroyed: 2,
      hardTurnCount: 2,
      averageFriendlyMilitaryCasualties: 160 / 3,
      casualtyExchangeRatio: 50 / 160,
    });
    expect(cost.briefing).toBe('3 recorded turns: 160 friendly casualties, 5200 displaced, +2 net territorial change, 0.31 opposing casualties per friendly casualty.');
    expect(cost.briefing).not.toContain('OSID');
    expect(cost.windowLabel).toContain(' - ');
    expect(cost.topDrivers).toEqual([
      '5200 displaced',
      '2 own formations destroyed',
      '2 hard turns',
      '160 friendly casualties',
    ]);
    expect(cost.mostCostlyTurn).toMatchObject({
      turn: 18,
      severity: 'critical',
      friendlyMilitaryCasualties: 40,
      displacedThisTurn: 4000,
      ownFormationsDestroyed: 1,
    });
  });

  it('localizes campaign pulse and campaign cost archive prose when BCS is selected', () => {
    setLocale('bcs');

    const turn18 = makeSummary({
      turn: 18,
      territory_net: { RBiH: -2 },
      displacement_total: 4000,
      formation_destructions: [{ formation_id: 'arbih_lost_a', formation_name: 'Lost A', faction: 'RBiH' }],
      battles: [{
        osid: 'op:test:a',
        attacker_faction: 'RBiH',
        defender_faction: 'RS',
        primary_attacker_id: 'a',
        primary_defender_id: 'b',
        all_attacker_ids: ['a'],
        outcome: 'defeat' as never,
        attacker_casualties: 40,
        defender_casualties: 10,
        territory_flipped: false,
        was_concentrated: false,
      }],
    });
    const turn19 = makeSummary({ turn: 19, territory_net: { RBiH: 1 } });
    const turn20 = makeSummary({
      turn: 20,
      territory_net: { RBiH: 3 },
      displacement_total: 1200,
      formation_destructions: [{ formation_id: 'arbih_lost_b', formation_name: 'Lost B', faction: 'RBiH' }],
      battles: [{
        osid: 'op:test:b',
        attacker_faction: 'RS',
        defender_faction: 'RBiH',
        primary_attacker_id: 'c',
        primary_defender_id: 'd',
        all_attacker_ids: ['c'],
        outcome: 'breakthrough' as never,
        attacker_casualties: 40,
        defender_casualties: 120,
        territory_flipped: true,
        was_concentrated: false,
      }],
    });
    const state = makeState({
      turn: 20,
      latestTurnSummary: turn20,
      turnSummaries: [turn18, turn19],
    });

    const records = buildTurnAftermathRecordViews({ state });
    const pulse = buildTurnAftermathCampaignPulse(records);
    const cost = buildTurnAftermathCampaignCost({ state });

    expect(pulse.briefing).toBe('Arhivski prozor je miran: nema većih pomjeranja ili troškova u vidljivim zapisima.');
    expect(cost.headline).toBe('Cijena kampanje je kritična.');
    expect(cost.briefing).toBe('3 zabilježena poteza: 160 prijateljskih gubitaka, 5200 raseljenih, +2 teritorijalni saldo, 0.31 protivničkih gubitaka po prijateljskom gubitku.');
    expect(cost.briefing).not.toContain('OSID');
    expect(cost.topDrivers).toEqual([
      '5200 raseljenih',
      '2 vlastite formacije uništene',
      '2 teška poteza',
      '160 prijateljskih gubitaka',
    ]);
  });

  it('returns a quiet active campaign cost shell without archived records', () => {
    const cost = buildTurnAftermathCampaignCost({
      state: makeState({ latestTurnSummary: null, turnSummaries: [] }),
    });

    expect(cost).toMatchObject({
      recordCount: 0,
      windowLabel: 'No records',
      severity: 'low',
      headline: 'No campaign cost records yet.',
      netFriendlyTerritory: 0,
      totalFriendlyMilitaryCasualties: 0,
      totalOpposingMilitaryCasualties: 0,
      totalTheaterMilitaryCasualties: 0,
      totalDisplaced: 0,
      totalOwnFormationsDestroyed: 0,
      hardTurnCount: 0,
      averageFriendlyMilitaryCasualties: 0,
      casualtyExchangeRatio: null,
      topDrivers: [],
      mostCostlyTurn: null,
    });
  });

  it('extracts strategic signals from archived turn summaries', () => {
    const view = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          turn: 31,
          events_fired: [{ id: 'washington', text: 'Washington Agreement signed.' }],
          notable_events: [{
            kind: 'siege_broken',
            description: 'Corridor reopened around Bihac.',
            faction: 'RBiH',
            osid: 'op:bihac:izaic',
          }],
          decoration_awards: [{
            formation_id: 'arbih_501st',
            formation_name: '501st Mountain Brigade',
            faction: 'RBiH',
            decoration: 'order_of_heroism' as never,
          }],
          arc_transitions: [{
            formation_id: 'arbih_502nd',
            formation_name: '502nd Brigade',
            faction: 'RBiH',
            from_arc: 'shaken' as never,
            to_arc: 'veteran' as never,
          }],
          supply_transitions: [{ osid: 'op:bihac:izaic', from: 'strained', to: 'adequate' }],
          movements: [{
            formation_id: 'arbih_503rd',
            formation_name: '503rd Brigade',
            from_osid: 'op:bihac:cazin',
            to_osid: 'op:bihac:izaic',
          }],
        }),
      }),
      osidNameMap: {
        'op:bihac:izaic': 'Izacic (Bihac)',
        'op:bihac:cazin': 'Cazin',
      },
    });

    expect(view?.signals.map((signal) => signal.kind)).toEqual([
      'event',
      'event',
      'decoration',
      'arc',
      'supply',
      'movement',
    ]);
    expect(view?.signals[1]).toMatchObject({
      label: 'Corridor reopened around Bihac.',
        detail: 'Notable event / Izacic (Bihac)',
      severity: 'notable',
    });
    expect(view?.signals[5]).toMatchObject({
      label: '503rd Brigade moved',
      detail: 'Cazin -> Izacic (Bihac)',
    });
    expect(view?.judgment).toMatchObject({
      headline: 'Strategic signal entered the record.',
      memoryTone: 'signal',
      primarySurface: 'chronicle',
    });
  });

  it('only renders decision-event signals when the loaded player filed the decision', () => {
    const pendingDecision = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          events_fired: [
            { id: 'hrhb_opening_decision', text: 'HRHB opening decision awaiting review.' },
            { id: 'weather_window', text: 'A weather window opened.' },
          ],
        }),
        pendingEventDecisions: [{
          event_id: 'hrhb_opening_decision',
          event_title: 'HRHB opening decision',
          turn_fired: 12,
          faction: 'RBiH',
          response_options: [{ id: 'historical', label: 'Historical', effects: [] }],
        }],
      }),
    });

    expect(pendingDecision?.signals.map((signal) => signal.label)).toEqual(['A weather window opened.']);

    const botDecision = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          events_fired: [
            { id: 'rs_bot_decision', text: 'RS bot made a political decision.' },
            { id: 'market_closure', text: 'Markets closed under shelling.' },
          ],
        }),
        rawGameState: {
          military: {
            event_decision_log: [{
              event_id: 'rs_bot_decision',
              response_id: 'historical',
              turn: 12,
              faction: 'RS',
              decision_source: 'bot_political',
            }],
          },
        } as never,
      }),
    });

    expect(botDecision?.signals.map((signal) => signal.label)).toEqual(['Markets closed under shelling.']);

    const playerDecision = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          events_fired: [{ id: 'rbih_player_decision', text: 'Presidency adopted a filed decision.' }],
        }),
        rawGameState: {
          military: {
            event_decision_log: [{
              event_id: 'rbih_player_decision',
              response_id: 'historical',
              turn: 12,
              faction: 'RBiH',
              decision_source: 'player',
            }],
          },
        } as never,
      }),
    });

    expect(playerDecision?.signals.map((signal) => signal.label)).toEqual(['Presidency adopted a filed decision.']);
  });

  it('classifies campaign momentum from the visible aftermath archive', () => {
    const records = [
      buildTurnAftermathView({
        nextState: makeState({
          latestTurnSummary: makeSummary({
            turn: 33,
            territory_net: { RBiH: 2 },
            events_fired: [{ id: 'event_a', text: 'Operational window opened.' }],
          }),
        }),
      })!,
      buildTurnAftermathView({
        nextState: makeState({
          latestTurnSummary: makeSummary({
            turn: 32,
            territory_net: { RBiH: 1 },
            decoration_awards: [{
              formation_id: 'arbih_501st',
              formation_name: '501st Brigade',
              faction: 'RBiH',
              decoration: 'order_of_heroism' as never,
            }],
          }),
        }),
      })!,
      buildTurnAftermathView({
        nextState: makeState({
          latestTurnSummary: makeSummary({
            turn: 31,
            territory_net: { RBiH: 0 },
            battles: [{
              osid: 'op:test:a',
              attacker_faction: 'RBiH',
              defender_faction: 'RS',
              primary_attacker_id: 'a',
              primary_defender_id: 'b',
              all_attacker_ids: ['a'],
              outcome: 'stalemate' as never,
              attacker_casualties: 10,
              defender_casualties: 11,
              territory_flipped: false,
              was_concentrated: false,
            }],
          }),
        }),
      })!,
    ];

    expect(buildTurnAftermathCampaignPulse(records)).toMatchObject({
      recordCount: 3,
      momentum: 'advancing',
      netFriendlyTerritory: 3,
      totalFriendlyMilitaryCasualties: 10,
      signalCount: 2,
      eventCount: 1,
      decorationCount: 1,
    });
  });

  it('filters aftermath records by commander review mode', () => {
    const quiet = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({ turn: 40, territory_net: { RBiH: 0 } }),
      }),
    })!;
    const hard = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          turn: 41,
          territory_net: { RBiH: -1 },
          displacement_total: 1000,
        }),
      }),
    })!;
    const signal = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({
          turn: 42,
          territory_net: { RBiH: 0 },
          events_fired: [{ id: 'event_signal', text: 'Event fired.' }],
        }),
      }),
    })!;
    const action = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({ turn: 43, territory_net: { RBiH: 0 } }),
        pendingEventDecisions: [
          { event_id: 'evt_action', event_title: 'Decision', turn_fired: 43, faction: 'RBiH', response_options: [{ id: 'yes', label: 'Yes', effects: [] }] },
        ],
      }),
    })!;
    const territory = buildTurnAftermathView({
      nextState: makeState({
        latestTurnSummary: makeSummary({ turn: 44, territory_net: { RBiH: 2 } }),
      }),
    })!;
    const records = [territory, action, signal, hard, quiet];

    expect(filterTurnAftermathRecords(records, 'all').map((record) => record.turn)).toEqual([44, 43, 42, 41, 40]);
    expect(filterTurnAftermathRecords(records, 'hard').map((record) => record.turn)).toEqual([41]);
    expect(filterTurnAftermathRecords(records, 'signals').map((record) => record.turn)).toEqual([42]);
    expect(filterTurnAftermathRecords(records, 'actions').map((record) => record.turn)).toEqual([43]);
    expect(filterTurnAftermathRecords(records, 'territory').map((record) => record.turn)).toEqual([44, 41]);
  });
});
