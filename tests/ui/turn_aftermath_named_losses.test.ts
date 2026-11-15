import { afterEach, describe, expect, it } from 'vitest';
import {
  buildTurnAftermathDispatch,
  buildTurnAftermathView,
  classifyTurnAftermathWeight,
} from '../../src/ui/map/data/turnAftermath.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

/**
 * The weekly dispatch (command-loop proposal §4 2B) promises our losses by name. The view used to
 * carry only counts; it now lists the player's own formations lost or destroyed that week, with
 * their corps. The opponent's losses never get a name: the projection drops them before they reach
 * the renderer, and the builder keeps only the player's faction regardless.
 */

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 21,
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

const formation = (id: string, name: string, kind: string, corpsId?: string) => ({
  id, faction: 'RBiH', name, kind, readiness: 'active', status: 'active', createdTurn: 0, tags: [],
  ...(corpsId ? { corps_id: corpsId } : {}),
});

function makeState(summary: TurnSummary): LoadedGameState {
  return {
    label: 'Turn 21',
    turn: 21,
    phase: 'war',
    formations: [
      formation('rbih_1corps', '1st Corps', 'corps'),
      formation('rbih_2corps', '2nd Corps', 'corps'),
      formation('rbih_brig_a', '115th Mountain Brigade', 'brigade', 'rbih_1corps'),
      formation('rbih_brig_b', '306th Mountain Brigade', 'brigade', 'rbih_2corps'),
      formation('rbih_brig_c', '17th Krajina Brigade', 'brigade', 'rbih_1corps'),
      formation('rbih_brig_d', '4th Muslim Light Brigade', 'brigade', 'rbih_2corps'),
      formation('rbih_brig_orphan', '9th Independent Battalion', 'brigade'),
    ],
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
    latestTurnSummary: summary,
    turnSummaries: [summary],
    player_faction: 'RBiH',
  } as unknown as LoadedGameState;
}

const destruction = (id: string, name: string, faction = 'RBiH') => ({ formation_id: id, formation_name: name, faction });

function viewFor(destructions: ReturnType<typeof destruction>[]) {
  const view = buildTurnAftermathView({ nextState: makeState(makeSummary({ formation_destructions: destructions })) });
  if (!view) throw new Error('expected a view');
  return view;
}

describe('named own losses in the weekly dispatch', () => {
  afterEach(() => setLocale('en'));

  it('lists the player\'s lost formations by name and corps, sorted by id', () => {
    const view = viewFor([
      destruction('rbih_brig_b', '306th Mountain Brigade'),
      destruction('rbih_brig_a', '115th Mountain Brigade'),
    ]);
    expect(view.formations.ownDestroyed).toBe(2);
    expect(view.formations.ownDestroyedList).toEqual([
      { id: 'rbih_brig_a', name: '115th Mountain Brigade', corpsName: '1st Corps' },
      { id: 'rbih_brig_b', name: '306th Mountain Brigade', corpsName: '2nd Corps' },
    ]);
  });

  it('never names the opponent\'s losses: they stay in the count only', () => {
    const view = viewFor([
      destruction('rbih_brig_a', '115th Mountain Brigade'),
      destruction('rs_secret_brigade', 'SECRET VRS BRIGADE', 'RS'),
    ]);
    expect(view.formations.destroyed).toBe(2);
    expect(view.formations.ownDestroyed).toBe(1);
    expect(JSON.stringify(view.formations.ownDestroyedList)).not.toContain('SECRET');
    const dispatch = buildTurnAftermathDispatch({ view });
    expect(JSON.stringify(dispatch)).not.toContain('SECRET');
  });

  it('names a loss without a corps link by name alone', () => {
    const view = viewFor([destruction('rbih_brig_orphan', '9th Independent Battalion')]);
    expect(view.formations.ownDestroyedList).toEqual([
      { id: 'rbih_brig_orphan', name: '9th Independent Battalion', corpsName: null },
    ]);
    const cost = buildTurnAftermathDispatch({ view }).lines.find((line) => line.kind === 'cost');
    expect(cost?.text).toBe('1 formation lost: 9th Independent Battalion');
  });

  it('puts the names and corps on the dispatch cost line, three at most', () => {
    const one = buildTurnAftermathDispatch({ view: viewFor([destruction('rbih_brig_a', '115th Mountain Brigade')]) });
    expect(one.lines.find((line) => line.kind === 'cost')?.text).toBe('1 formation lost: 115th Mountain Brigade (1st Corps)');

    const four = buildTurnAftermathDispatch({
      view: viewFor([
        destruction('rbih_brig_a', '115th Mountain Brigade'),
        destruction('rbih_brig_b', '306th Mountain Brigade'),
        destruction('rbih_brig_c', '17th Krajina Brigade'),
        destruction('rbih_brig_d', '4th Muslim Light Brigade'),
      ]),
    });
    expect(four.lines.find((line) => line.kind === 'cost')?.text).toBe(
      '4 formations lost: 115th Mountain Brigade (1st Corps), 306th Mountain Brigade (2nd Corps), 17th Krajina Brigade (1st Corps), 1 more',
    );
  });

  it('falls back to the count when a view carries no names (older records)', () => {
    const view = viewFor([destruction('rbih_brig_a', '115th Mountain Brigade')]);
    const bare = { ...view, formations: { ...view.formations, ownDestroyedList: undefined } };
    expect(buildTurnAftermathDispatch({ view: bare }).lines.find((line) => line.kind === 'cost')?.text).toBe('1 formation lost');
  });

  it('stays a heavy week and keeps the view shape recognised', () => {
    const view = viewFor([destruction('rbih_brig_a', '115th Mountain Brigade')]);
    expect(classifyTurnAftermathWeight(view)).toBe('heavy');
    const quiet = viewFor([]);
    expect(quiet.formations.ownDestroyedList).toEqual([]);
    expect(classifyTurnAftermathWeight(quiet)).toBe('quiet');
  });

  it('renders the named loss in BCS', () => {
    setLocale('bcs');
    const view = viewFor([destruction('rbih_brig_a', '115th Mountain Brigade')]);
    expect(buildTurnAftermathDispatch({ view }).lines.find((line) => line.kind === 'cost')?.text)
      .toBe('Izgubljena jedna formacija: 115th Mountain Brigade (1. korpus)');
  });
});
