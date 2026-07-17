import { describe, expect, it } from 'vitest';
import { getOperationalSitrepView, toOperationalSitrepView } from '../src/ui/shared/operational_sitrep_views.js';

describe('operational SITREP views', () => {
  it('orders fronts, weakest brigades, and alerts deterministically', () => {
    const view = toOperationalSitrepView({
      playerFaction: 'RBiH',
      turn: 12,
      phase: 'war',
      ownForces: {
        totalPersonnel: 0,
        activeBrigades: 3,
        totalBrigades: 3,
        corpsCount: 1,
        avgCohesion: 0,
        formationDetails: [
          { id: 'b3', name: '3rd Brigade', kind: 'brigade', personnel: 700, cohesion: 55, readiness: 'ready', posture: 'defend', disrupted: false, woundedPending: 0, movementStatus: 'deployed', corpsId: 'c1', locationId: 'op:c' },
          { id: 'b1', name: '1st Brigade', kind: 'brigade', personnel: 300, cohesion: 40, readiness: 'ready', posture: 'hold', disrupted: false, woundedPending: 0, movementStatus: 'packing', corpsId: 'c1', locationId: 'op:a' },
          { id: 'b2', name: '2nd Brigade', kind: 'brigade', personnel: 300, cohesion: 35, readiness: 'ready', posture: 'hold', disrupted: false, woundedPending: 0, movementStatus: 'deployed', corpsId: 'c1', locationId: 'op:b' },
        ],
      },
      ownCasualties: { killed: 0, wounded: 0, missingCaptured: 0, equipmentLost: { tanks: 0, artillery: 0, aa: 0 }, woundedPendingReturn: 0 },
      ownTerritory: { settlementsControlled: 1, settlementsTotal: 2, territoryPercent: 50 },
      ownDisplacement: {
        totalDisplacedOut: 0,
        totalDisplacedIn: 0,
        civilianKilled: 0,
        civilianFledAbroad: 0,
        activeCamps: 2,
        activeHostileTakeoverTimers: 1,
        hostileTakeoverMunicipalities: ['visoko'],
      },
      ownExhaustion: { level: 0, trend: 'flat', increasing: true, collapseEligible: true },
      ownSupply: { adequateCount: 1, strainedCount: 2, criticalCount: 1, collapsedMunicipalities: ['bijeljina:center'], },
      ownAuthority: { authority: 0.2, legitimacy: 0 },
      ownCorpsOps: [
        { corpsId: 'c2', corpsName: '2nd Corps', stance: 'balanced', operation: { type: 'probe', phase: 'planning', started_turn: 11 } },
        { corpsId: 'c1', corpsName: '1st Corps', stance: 'offensive', operation: null },
      ],
      ownDiplomacy: { patronState: null, rbihHrhbState: { allianceValue: 0.1, bilateralFlipsThisTurn: 0, stalemateTurns: 0, totalBilateralFlips: 0, alliedMixedMunicipalities: [], ceasefireActive: false, ceasefireSinceTurn: null, washingtonSigned: false, washingtonTurn: null, warStartedTurn: null }, embargoProfile: null, constraintSeverity: null, negotiationMomentum: 0 },
      contactedEnemyFormations: [],
      engagedFrontEdges: [
        { edgeId: 'edge_b', settlementA: 'op:b', settlementB: 'op:c', sideA: 'RBiH', sideB: 'RS', pressure: 3, friction: 1, tier: 'garrisoned' },
        { edgeId: 'edge_a', settlementA: 'op:a', settlementB: 'op:b', sideA: 'RBiH', sideB: 'RS', pressure: 2, friction: 3, tier: 'exposed' },
        { edgeId: 'edge_c', settlementA: 'op:c', settlementB: 'op:d', sideA: 'RBiH', sideB: 'RS', pressure: 1, friction: 2, tier: 'defended' },
      ],
      brigadeMovement: { packing: ['b1'], inTransit: [], unpacking: [], encircled: ['b2'] },
      exposedFrontSettlements: [],
    } as any);

    expect(view.front.edges.map((edge) => edge.id)).toEqual(['edge_a', 'edge_b', 'edge_c']);
    expect(view.readiness.weakestBrigades.map((brigade) => brigade.id)).toEqual(['b2', 'b1', 'b3']);
    expect(view.operations.corps.map((entry) => entry.corpsId)).toEqual(['c1', 'c2']);
    expect(view.operations.corps[1]?.summary).toBe('Probe in Planning since 22 Jun 1992.');
    expect(view.operations.corps[1]?.summary).not.toContain('Op:');
    expect(view.operations.corps[1]?.summary).not.toContain('probe');
    expect(view.operations.corps[1]?.summary).not.toContain('planning');
    expect(view.operations.corps[1]?.summary).not.toContain('T11');
    expect(view.readiness.encircledBrigades).toEqual([
      {
        id: 'b2',
        label: '2nd Brigade',
        location: 'B',
      },
    ]);
    expect(view.alerts.find((alert) => alert.id === 'front-exposed')?.evidence).toEqual([
      'Affected front: A - B.',
      'Staff handoff: inspect front sectors in War Summary; no direct presidential order is required.',
    ]);
    expect(view.alerts.find((alert) => alert.id === 'brigades-encircled')?.evidence).toEqual([
      'Cut off: 2nd Brigade at B.',
      'Staff handoff: inspect the formation and relief routes in War Summary; no direct presidential move order is available while cut off.',
    ]);
    expect(view.alerts.map((alert) => alert.id)).toEqual([
      'brigades-encircled',
      'front-exposed',
      'collapse-eligible',
      'brigades-packing',
      'hostile-takeovers',
      'alliance-strained',
      'authority-critical',
      'sustainment-collapsed',
      'exhaustion-worsening',
      'active-operations',
    ]);
  });

  it('does not elevate thin fronts without reported pressure into presidential alerts', () => {
    const view = toOperationalSitrepView({
      playerFaction: 'RS',
      turn: 20,
      phase: 'war',
      ownForces: {
        totalPersonnel: 0,
        activeBrigades: 0,
        totalBrigades: 0,
        corpsCount: 0,
        avgCohesion: 0,
        formationDetails: [],
      },
      ownCasualties: { killed: 0, wounded: 0, missingCaptured: 0, equipmentLost: { tanks: 0, artillery: 0, aa: 0 }, woundedPendingReturn: 0 },
      ownTerritory: { settlementsControlled: 1, settlementsTotal: 2, territoryPercent: 50 },
      ownDisplacement: { totalDisplacedOut: 0, totalDisplacedIn: 0, civilianKilled: 0, civilianFledAbroad: 0, activeCamps: 0, activeHostileTakeoverTimers: 0, hostileTakeoverMunicipalities: [] },
      ownExhaustion: { level: 0, trend: 'flat', increasing: false, collapseEligible: false },
      ownSupply: { adequateCount: 1, strainedCount: 0, criticalCount: 0, collapsedMunicipalities: [] },
      ownAuthority: { authority: 1, legitimacy: 1 },
      ownCorpsOps: [],
      ownDiplomacy: { patronState: null, rbihHrhbState: null, embargoProfile: null, constraintSeverity: null, negotiationMomentum: 0 },
      contactedEnemyFormations: [],
      engagedFrontEdges: [
        { edgeId: 'quiet_gap', settlementA: 'op:prijedor:west', settlementB: 'op:sanski_most:east', sideA: 'RS', sideB: 'RBiH', pressure: 0, friction: 0, tier: 'exposed' },
      ],
      brigadeMovement: { packing: [], inTransit: [], unpacking: [], encircled: [] },
      exposedFrontSettlements: [],
    } as any);

    expect(view.front.exposedCount).toBe(1);
    expect(view.alerts.map((alert) => alert.id)).not.toContain('front-exposed');
  });

  it('builds the canonical operational packet from raw game state via the shared read path', () => {
    const rawState = {
      meta: { turn: 9, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {
          arbih_3rd_corps: { id: 'arbih_3rd_corps', faction: 'RBiH', kind: 'corps', status: 'active', name: 'arbih_3rd_corps', personnel: 0 },
          arbih_b1: { id: 'arbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: '', personnel: 450, cohesion: 41, corps_id: 'arbih_3rd_corps' },
        },
        casualty_ledger: {},
        front_edges: [
          { edge_id: 'edge_1', a: 'op:tuzla:centar', b: 'op:bijeljina:center', side_a: 'RBiH', side_b: 'RS' },
        ],
        front_pressure: { edge_1: { value: 0.9, max_abs: 1, last_updated_turn: 9 } },
        front_segments: { edge_1: { friction: 0.5 } },
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: { arbih_b1: true },
        corps_command: {
          arbih_3rd_corps: {
            stance: 'balanced',
            active_operations: [{ type: 'sector_attack', phase: 'execution', started_turn: 8 }],
          },
        },
      },
      political: {
        political_controllers: {
          'op:tuzla:centar': 'RBiH',
          'op:bijeljina:center': 'RS',
        },
        war_exhaustion: { RBiH: 0.2 },
        loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: { camp_1: {} },
        hostile_takeover_timers: { timer_1: {} },
        civilian_casualties: {},
        sustainability_state: {
          tuzla: { mun_id: 'tuzla', collapsed: false, sustainability_score: 20 },
        },
      },
    } as any;

    const view = getOperationalSitrepView(rawState, 'RBiH');
    expect(view.headline).toContain('thinly held front sector');
    expect(view.headline).not.toMatch(/\d+ thinly held front/);
    expect(view.front.engagedCount).toBe(1);
    expect(view.readiness.encircledCount).toBe(1);
    expect(view.operations.activeCount).toBe(1);
  });

  it('filters front contacts to the player-controlled side of the edge', () => {
    const rawState = {
      meta: { turn: 9, phase: 'war' },
      factions: [
        { id: 'HRHB', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {},
        casualty_ledger: {},
        war_front_edges_osid: [
          { edge_id: 'banja_wrong', a: 'op:banja_luka:north', b: 'op:banja_luka:south', side_a: 'HRHB', side_b: 'RS' },
          { edge_id: 'livno_real', a: 'op:livno:west', b: 'op:glamoc:east', side_a: 'HRHB', side_b: 'RS' },
        ],
        front_pressure: {
          banja_wrong: { value: 1, max_abs: 1, last_updated_turn: 9 },
          livno_real: { value: 0.5, max_abs: 1, last_updated_turn: 9 },
        },
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: {},
        corps_command: {},
      },
      political: {
        political_controllers: {
          'op:banja_luka:north': 'RS',
          'op:banja_luka:south': 'RS',
          'op:livno:west': 'HRHB',
          'op:glamoc:east': 'RS',
        },
        war_exhaustion: { HRHB: 0.1 },
        loss_of_control_trends: { by_faction: { HRHB: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: {},
        hostile_takeover_timers: {},
        civilian_casualties: {},
        sustainability_state: {},
      },
    } as any;

    const view = getOperationalSitrepView(rawState, 'HRHB');

    expect(view.front.edges.map((edge) => edge.id)).toEqual(['livno_real']);
    expect(view.front.edges[0]?.label).toBe('West (Livno) - East (Glamoc)');
    expect(view.front.edges[0]?.label).not.toContain('op:');
    expect(view.front.edges[0]?.label).not.toContain('_');
  });

  it('aggregates player takeover pressure by municipality while preserving raw timer drilldown', () => {
    const rawState = {
      meta: { turn: 9, phase: 'war' },
      factions: [
        { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
      ],
      military: {
        formations: {},
        casualty_ledger: {},
        front_edges: [],
        front_pressure: {},
        front_segments: {},
        militia_garrison: {},
        brigade_movement_state: {},
        brigade_encircled: {},
        corps_command: {},
      },
      political: {
        political_controllers: {},
        war_exhaustion: { RBiH: 0 },
        loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
      },
      displacement: {
        displacement_state: {},
        displacement_camp_state: {},
        hostile_takeover_timers: {
          'op:visoko:north|RBiH': { mun_id: 'visoko', from_faction: 'RBiH', to_faction: 'RS', started_turn: 8 },
          'op:visoko:south|RBiH': { mun_id: 'visoko', from_faction: 'RBiH', to_faction: 'RS', started_turn: 8 },
          'op:travnik:center|RBiH': { mun_id: 'travnik', from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 9 },
          'op:visoko:north|HRHB': { mun_id: 'visoko', from_faction: 'HRHB', to_faction: 'RS', started_turn: 8 },
          'op:tuzla:center|RS': { mun_id: 'tuzla', from_faction: 'RS', to_faction: 'RBiH', started_turn: 8 },
        },
        civilian_casualties: {},
        sustainability_state: {},
      },
    } as any;

    const view = getOperationalSitrepView(rawState, 'RBiH');
    const alert = view.alerts.find((entry) => entry.id === 'hostile-takeovers');

    expect(view.sustainment.hostileTakeoverMunicipalityCount).toBe(2);
    expect(view.sustainment.hostileTakeoverMunicipalities).toEqual(['Travnik', 'Visoko']);
    expect(view.sustainment.activeHostileTakeoverTimers).toBe(3);
    expect(alert?.text).toBe('2 municipalities face active hostile takeover pressure.');
    expect(alert?.text).not.toContain('3');
  });
});
