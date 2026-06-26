/**
 * Tests for the player-scoped supply visibility read-model projection
 * (UI-1 Supply Visibility Read-Model Lane, Batch 40).
 *
 * The projection turns existing engine truth (supply_state_by_osid,
 * supply_corridors_osid, formation location_osid) into a compact
 * player-faction-scoped view consumed by the presidential Decision Room
 * and operational sitrep surfaces. It MUST NOT leak enemy supply truth.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { buildPlayerSupplyVisibility } from '../src/ui/map/data/playerSupplyVisibility.js';
import { setLocale } from '../src/ui/map/i18n/index.js';
import type { LoadedGameState, FormationView } from '../src/ui/map/data/types.js';

function emptyState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Test',
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
    ...overrides,
  } as LoadedGameState;
}

function brigade(id: string, faction: string, locationOsid: string): FormationView {
  return {
    id,
    faction,
    name: id,
    kind: 'brigade',
    readiness: 'ready',
    cohesion: 80,
    fatigue: 10,
    status: 'active',
    createdTurn: 0,
    tags: [],
    location_osid: locationOsid,
  };
}

describe('buildPlayerSupplyVisibility', () => {
  afterEach(() => {
    setLocale('en');
  });

  it('returns null when no player faction is loaded', () => {
    const state = emptyState({ player_faction: null });
    expect(buildPlayerSupplyVisibility(state)).toBeNull();
  });

  it('projects compact view from populated supply data for the player faction', () => {
    const state = emptyState({
      player_faction: 'RBiH',
      supplyStateByOsid: {
        'op:sa:sarajevo_1': 'adequate',
        'op:sa:sarajevo_2': 'adequate',
        'op:tu:tuzla_1': 'strained',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 2,
          strained_count: 1,
          critical_count: 0,
          corridor_open_count: 4,
          corridor_brittle_count: 0,
          corridor_cut_count: 0,
        },
        RS: {
          adequate_count: 10,
          strained_count: 2,
          critical_count: 1,
          corridor_open_count: 6,
          corridor_brittle_count: 1,
          corridor_cut_count: 0,
        },
      },
    });
    const view = buildPlayerSupplyVisibility(state);
    expect(view).not.toBeNull();
    expect(view!.playerFaction).toBe('RBiH');
    expect(view!.hasSupplyData).toBe(true);
    expect(view!.adequateCount).toBe(2);
    expect(view!.strainedCount).toBe(1);
    expect(view!.criticalCount).toBe(0);
    expect(view!.corridorOpenCount).toBe(4);
    expect(view!.corridorBrittleCount).toBe(0);
    expect(view!.corridorCutCount).toBe(0);
    expect(view!.corridorAtRisk).toBe(false);
    expect(view!.isolatedFormationCount).toBe(0);
    expect(view!.severity).toBe('info');
  });

  it('returns unknown severity and an empty headline when no supply data is present', () => {
    const state = emptyState({ player_faction: 'RBiH' });
    const view = buildPlayerSupplyVisibility(state);
    expect(view).not.toBeNull();
    expect(view!.hasSupplyData).toBe(false);
    expect(view!.severity).toBe('unknown');
    expect(view!.adequateCount).toBe(0);
    expect(view!.strainedCount).toBe(0);
    expect(view!.criticalCount).toBe(0);
    expect(view!.corridorAtRisk).toBe(false);
    expect(view!.headline).toMatch(/unavailable|unknown/i);
  });

  it('preserves reported partial summary warnings without inventing missing zeroes', () => {
    const state = emptyState({
      player_faction: 'RBiH',
      supplySummaryByFaction: {
        RBiH: {
          corridor_brittle_count: 1,
        } as any,
      },
    });

    const view = buildPlayerSupplyVisibility(state);

    expect(view).not.toBeNull();
    expect(view!.hasSupplyData).toBe(true);
    expect(view!.severity).toBe('warning');
    expect(view!.corridorAtRisk).toBe(true);
    expect(view!.corridorBrittleCount).toBe(1);
    expect(view!.evidence.join(' ')).toContain('Unreported');
    expect(view!.evidence.join(' ')).toContain('1 strained');
    expect(view!.evidence.join(' ')).not.toContain('0 adequate');
    expect(view!.evidence.join(' ')).not.toContain('0 cut');
  });

  it('flags corridor at risk when player faction has brittle or cut corridors', () => {
    const state = emptyState({
      player_faction: 'RBiH',
      supplyStateByOsid: {
        'op:bi:bihac_1': 'critical',
        'op:bi:bihac_2': 'strained',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 5,
          strained_count: 1,
          critical_count: 1,
          corridor_open_count: 2,
          corridor_brittle_count: 1,
          corridor_cut_count: 1,
        },
      },
    });
    const view = buildPlayerSupplyVisibility(state)!;
    expect(view.corridorAtRisk).toBe(true);
    expect(view.corridorBrittleCount).toBe(1);
    expect(view.corridorCutCount).toBe(1);
    expect(view.severity).toBe('critical');
    expect(view.headline.length).toBeGreaterThan(0);
    expect(view.evidence.some((line) => /corridor/i.test(line))).toBe(true);
  });

  it('counts isolated player formations sitting at critical-supply OSIDs', () => {
    const state = emptyState({
      player_faction: 'RBiH',
      formations: [
        brigade('arbih_a', 'RBiH', 'op:bi:bihac_1'),
        brigade('arbih_b', 'RBiH', 'op:bi:bihac_2'),
        brigade('arbih_c', 'RBiH', 'op:sa:sarajevo_1'),
        brigade('vrs_x', 'RS', 'op:bi:bihac_1'),
      ],
      supplyStateByOsid: {
        'op:bi:bihac_1': 'critical',
        'op:bi:bihac_2': 'strained',
        'op:sa:sarajevo_1': 'adequate',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 1,
          strained_count: 1,
          critical_count: 1,
          corridor_open_count: 1,
          corridor_brittle_count: 0,
          corridor_cut_count: 0,
        },
      },
    });
    const view = buildPlayerSupplyVisibility(state)!;
    expect(view.isolatedFormationCount).toBe(1);
    expect(view.severity).toBe('critical');
    expect(view.evidence.some((line) => /isolated|formation|brigade/i.test(line))).toBe(true);
  });

  it('does not leak enemy supply truth into the player projection', () => {
    const enemyHeavyState = emptyState({
      player_faction: 'RBiH',
      supplyStateByOsid: {
        'op:sa:sarajevo_1': 'adequate',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 1,
          strained_count: 0,
          critical_count: 0,
          corridor_open_count: 2,
          corridor_brittle_count: 0,
          corridor_cut_count: 0,
        },
        RS: {
          adequate_count: 0,
          strained_count: 0,
          critical_count: 20,
          corridor_open_count: 0,
          corridor_brittle_count: 0,
          corridor_cut_count: 10,
        },
        HRHB: {
          adequate_count: 0,
          strained_count: 0,
          critical_count: 5,
          corridor_open_count: 0,
          corridor_brittle_count: 3,
          corridor_cut_count: 0,
        },
      },
    });
    const enemyClean = emptyState({
      player_faction: 'RBiH',
      supplyStateByOsid: {
        'op:sa:sarajevo_1': 'adequate',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 1,
          strained_count: 0,
          critical_count: 0,
          corridor_open_count: 2,
          corridor_brittle_count: 0,
          corridor_cut_count: 0,
        },
      },
    });
    const heavy = buildPlayerSupplyVisibility(enemyHeavyState)!;
    const clean = buildPlayerSupplyVisibility(enemyClean)!;
    expect(heavy.adequateCount).toBe(clean.adequateCount);
    expect(heavy.strainedCount).toBe(clean.strainedCount);
    expect(heavy.criticalCount).toBe(clean.criticalCount);
    expect(heavy.corridorOpenCount).toBe(clean.corridorOpenCount);
    expect(heavy.corridorBrittleCount).toBe(clean.corridorBrittleCount);
    expect(heavy.corridorCutCount).toBe(clean.corridorCutCount);
    expect(heavy.corridorAtRisk).toBe(clean.corridorAtRisk);
    expect(heavy.severity).toBe(clean.severity);
    expect(heavy.headline).toBe(clean.headline);
  });

  it('produces deterministic output regardless of formation insertion order', () => {
    const formations = [
      brigade('arbih_a', 'RBiH', 'op:bi:bihac_1'),
      brigade('arbih_b', 'RBiH', 'op:bi:bihac_2'),
      brigade('arbih_c', 'RBiH', 'op:bi:bihac_1'),
    ];
    const supplyStateByOsid = {
      'op:bi:bihac_1': 'critical' as const,
      'op:bi:bihac_2': 'critical' as const,
    };
    const summary = {
      RBiH: {
        adequate_count: 0,
        strained_count: 0,
        critical_count: 2,
        corridor_open_count: 0,
        corridor_brittle_count: 0,
        corridor_cut_count: 1,
      },
    };
    const a = buildPlayerSupplyVisibility(emptyState({
      player_faction: 'RBiH',
      formations,
      supplyStateByOsid,
      supplySummaryByFaction: summary,
    }))!;
    const b = buildPlayerSupplyVisibility(emptyState({
      player_faction: 'RBiH',
      formations: [...formations].reverse(),
      supplyStateByOsid,
      supplySummaryByFaction: summary,
    }))!;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('localizes BCS critical supply headlines and evidence', () => {
    setLocale('bcs');
    const state = emptyState({
      player_faction: 'RBiH',
      formations: [
        brigade('arbih_a', 'RBiH', 'op:bi:bihac_1'),
        brigade('arbih_b', 'RBiH', 'op:bi:bihac_1'),
      ],
      supplyStateByOsid: {
        'op:bi:bihac_1': 'critical',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 0,
          strained_count: 1,
          critical_count: 1,
          corridor_open_count: 0,
          corridor_brittle_count: 1,
          corridor_cut_count: 1,
        },
      },
    });

    const view = buildPlayerSupplyVisibility(state)!;
    const text = [view.headline, ...view.evidence].join(' ');

    expect(view.headline).toContain('2 brigade');
    expect(text).toContain('napregnuto');
    expect(text).toContain('kritično');
    expect(text).toContain('presječeno');
    expect(text).not.toMatch(/\bSupply\b|adequate|strained|critical|open|brittle|cut corridor|brigades cut off/i);
  });

  it('localizes BCS corridor warning copy', () => {
    setLocale('bcs');
    const state = emptyState({
      player_faction: 'RBiH',
      supplyStateByOsid: {
        'op:sa:sarajevo_1': 'adequate',
      },
      supplySummaryByFaction: {
        RBiH: {
          adequate_count: 3,
          strained_count: 0,
          critical_count: 0,
          corridor_open_count: 2,
          corridor_brittle_count: 1,
          corridor_cut_count: 0,
        },
      },
    });

    const view = buildPlayerSupplyVisibility(state)!;
    const text = [view.headline, ...view.evidence].join(' ');

    expect(view.severity).toBe('warning');
    expect(text).toContain('koridor');
    expect(text).toContain('otvoreno');
    expect(text).toContain('napregnuto');
    expect(text).not.toMatch(/\bSupply\b|adequate|strained|critical|open|brittle|cut corridor|corridors at risk/i);
  });
});
