import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import { buildWarSummaryOverviewModel } from '../src/ui/map/components/army_hq/warSummaryOverview.js';

function makeLoadedGameState(): LoadedGameState {
  return {
    label: 'Week 4',
    turn: 4,
    phase: 'war',
    formations: [
      { id: 'arbih_3rd_corps', faction: 'RBiH', name: 'arbih_3rd_corps', kind: 'corps', readiness: 'ready', cohesion: 60, fatigue: 10, status: 'active', createdTurn: 0, tags: [] },
      { id: 'arbih_b1', faction: 'RBiH', name: 'Assigned brigade', kind: 'brigade', readiness: 'ready', cohesion: 62, fatigue: 8, status: 'active', createdTurn: 0, tags: [], personnel: 1200, corps_id: 'arbih_3rd_corps' },
      { id: 'arbih_forming', faction: 'RBiH', name: 'Forming brigade', kind: 'brigade', readiness: 'forming', cohesion: 40, fatigue: 0, status: 'active', createdTurn: 4, tags: [], personnel: 900, corps_id: 'arbih_3rd_corps' },
      { id: 'rs_b1', faction: 'RS', name: 'Enemy Shock Brigade', kind: 'brigade', readiness: 'ready', cohesion: 70, fatigue: 4, status: 'active', createdTurn: 0, tags: [], personnel: 2400, corps_id: 'vrs_drinac' },
      { id: 'hrhb_b1', faction: 'HRHB', name: 'Western Battalion', kind: 'brigade', readiness: 'ready', cohesion: 58, fatigue: 7, status: 'active', createdTurn: 0, tags: [], personnel: 1800, corps_id: 'hvo_central' },
    ],
    militiaPools: [],
    controlBySettlement: {
      'op:sarajevo:centar': 'RBiH',
      'op:bijeljina:center': 'RS',
      'op:mostar:west': 'HRHB',
    },
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
    latestTurnSummary: null,
    turnSummaries: [],
    casualtyLedger: {
      RBiH: { killed: 100, wounded: 250, missing_captured: 0 },
      RS: { killed: 300, wounded: 500, missing_captured: 0 },
      HRHB: { killed: 120, wounded: 190, missing_captured: 0 },
    },
    displacementByMun: {},
    departedByOsid: {
      'op:sarajevo:centar': { RBiH: 4000, RS: 5000 },
      'op:bijeljina:center': { RS: 7000, HRHB: 1000 },
    },
    pressureWarning: false,
    player_faction: 'RBiH',
    warPhaseExhaustion: { RBiH: 620 },
  } as unknown as LoadedGameState;
}

function makeLoadedGameStateLowExhaustion(): LoadedGameState {
  const base = makeLoadedGameState();
  return { ...base, warPhaseExhaustion: { RBiH: 120 } } as LoadedGameState;
}

function makeLoadedGameStateNoExhaustion(): LoadedGameState {
  const base = makeLoadedGameState();
  // Remove the field entirely — this is the pre-political.war_exhaustion
  // state path where the adapter emitted nothing.
  const { warPhaseExhaustion: _drop, ...rest } = base as unknown as Record<string, unknown>;
  return rest as unknown as LoadedGameState;
}

describe('ui army hq war summary visibility', () => {
  it('builds a player-safe overview model keyed to the player faction', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameState());

    expect(model.playerFaction).toBe('RBiH');
    expect(model.personnelByFaction.RBiH).toBe(1200);
    expect(model.personnelByFaction.RS).toBe(2400);
    expect(model.personnelByFaction.HRHB).toBe(1800);
    expect(model.displacedByFaction.RBiH).toBe(4000);
    expect(model.displacedByFaction.RS).toBe(12000);
    expect(model.displacedByFaction.HRHB).toBe(1000);
    expect(model.areaPct.RBiH).toBeGreaterThanOrEqual(0);
    expect(model.areaPct.RS).toBeGreaterThanOrEqual(0);
    expect(model.areaPct.HRHB).toBeGreaterThanOrEqual(0);
  });

  it('counts at-arms personnel only through the shared fielded tactical formation boundary', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameState());

    expect(model.atArmsByFaction.RBiH).toBe(1200);
    expect(model.mobilizedTotalByFaction.RBiH).toBe(1200);
    expect(model.personnelByFaction.RBiH).toBe(1200);
  });

  // Cluster C — war exhaustion passthrough from state.warPhaseExhaustion
  // (adapter-scoped view of GameState.political.war_exhaustion).
  it('exposes faction war exhaustion from the adapter-scoped state', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameState());
    expect(model.warExhaustionByFaction.RBiH).toBe(620);
  });

  it('passes through low war exhaustion values without masking', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameStateLowExhaustion());
    expect(model.warExhaustionByFaction.RBiH).toBe(120);
  });

  it('returns an empty map when warPhaseExhaustion is absent', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameStateNoExhaustion());
    expect(model.warExhaustionByFaction).toEqual({});
  });

  // Collapse Repurpose Design A — derived war-weariness descriptor passthrough.
  it('derives a war-weariness band descriptor off the same exhaustion signal', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameState());
    // raw 620 → 6.2 on the 0..100 scale → steady
    expect(model.warWearinessByFaction.RBiH?.band).toBe('steady');
    expect(model.warWearinessByFaction.RBiH?.level).toBeCloseTo(6.2, 5);
  });

  it('reports a cracking band for a late-war exhaustion value', () => {
    const base = makeLoadedGameState();
    const state = { ...base, warPhaseExhaustion: { RBiH: 7000 } } as unknown as Parameters<typeof buildWarSummaryOverviewModel>[0];
    const model = buildWarSummaryOverviewModel(state);
    expect(model.warWearinessByFaction.RBiH?.band).toBe('cracking');
  });

  it('omits the descriptor when warPhaseExhaustion is absent', () => {
    const model = buildWarSummaryOverviewModel(makeLoadedGameStateNoExhaustion());
    expect(model.warWearinessByFaction).toEqual({});
  });
});
