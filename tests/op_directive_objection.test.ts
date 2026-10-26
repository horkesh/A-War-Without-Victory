/**
 * Force-op PUSHBACK objection read-model + refactor-preservation
 * (Presidential Command Model "force-op pushback").
 *
 * Part A — buildDirectiveObjection (src/ui/map/data/opDirectiveObjection.ts):
 *   disposition-tinted objection prose tinted by competence / stubbornness /
 *   political_reliability, with COWED-COMPLIANCE honoring (a cowed CO complies → no
 *   objection) and the launch → no-objection short-circuit.
 *
 * Part B — planDirectiveOperation (src/sim/turn_phases/war_phases.ts):
 *   the shared pure helper extracted from injectOpDirectives produces the SAME force +
 *   axis selection the consume step uses, with ZERO mutation.
 */
import { describe, it, expect } from 'vitest';
import { buildDirectiveObjection } from '../src/ui/map/data/opDirectiveObjection.js';
import { planDirectiveOperation } from '../src/sim/turn_phases/war_phases.js';
import { queryDirectiveObjection } from '../src/desktop/desktop_sim.js';

// ═══════════════════════════════════════════════════════════════════════════
// Part A — buildDirectiveObjection disposition tinting
// ═══════════════════════════════════════════════════════════════════════════

const NO_GO = { forceRatio: 0.7, estimatedCasualties: 400, recommendedAction: 'abort' as const };
const DELAY = { forceRatio: 0.9, estimatedCasualties: 250, recommendedAction: 'delay' as const };
const LAUNCH = { forceRatio: 1.8, estimatedCasualties: 80, recommendedAction: 'launch' as const };

describe('buildDirectiveObjection — disposition tinting', () => {
  it('COWED CO complies fully — shows compliance, NEVER an objection (even on a no-go)', () => {
    const view = buildDirectiveObjection(
      { name: 'Talić', rank: 'corps_commander', competence: 4, political_reliability: 3, is_cowed: true },
      NO_GO,
    );
    expect(view.shows_objection).toBe(false);
    expect(view.tone).toBe('compliant');
    expect(view.severity).toBeNull();
    expect(view.prose).toMatch(/without comment|acknowledges/i);
  });

  it('LAUNCH recommendation — commander agrees, no objection card', () => {
    const view = buildDirectiveObjection(
      { name: 'Dudaković', competence: 4, political_reliability: 3 },
      LAUNCH,
    );
    expect(view.shows_objection).toBe(false);
    expect(view.tone).toBe('compliant');
    expect(view.severity).toBeNull();
  });

  it('high stubbornness + low political_reliability → BLUNT flat refusal', () => {
    const view = buildDirectiveObjection(
      { name: 'Mladić', competence: 5, political_reliability: 1, stubbornness: 5 },
      NO_GO,
    );
    expect(view.shows_objection).toBe(true);
    expect(view.tone).toBe('blunt');
    expect(view.severity).toBe('abort');
    expect(view.prose).toMatch(/no\b|will not/i);
  });

  it('high political_reliability → DEFERENTIAL (objects but yields the decision)', () => {
    const view = buildDirectiveObjection(
      { name: 'Delić', competence: 4, political_reliability: 5 },
      NO_GO,
    );
    expect(view.shows_objection).toBe(true);
    expect(view.tone).toBe('deferential');
    expect(view.prose).toMatch(/your decision/i);
  });

  it('low competence → HEDGED (cannot guarantee)', () => {
    const view = buildDirectiveObjection(
      { name: 'a militia colonel', competence: 1, political_reliability: 3 },
      NO_GO,
    );
    expect(view.shows_objection).toBe(true);
    expect(view.tone).toBe('hedged');
    expect(view.prose).toMatch(/cannot guarantee/i);
  });

  it('default competent, neutral disposition → PROFESSIONAL caution', () => {
    const view = buildDirectiveObjection(
      { name: 'a corps commander', competence: 4, political_reliability: 3 },
      DELAY,
    );
    expect(view.shows_objection).toBe(true);
    expect(view.tone).toBe('professional');
    expect(view.severity).toBe('delay');
  });

  it('blunt refusal takes precedence over the deferential/hedged branches', () => {
    // Stubborn + low reliability + low competence → still BLUNT (disposition dominates).
    const view = buildDirectiveObjection(
      { name: 'a warlord', competence: 1, political_reliability: 1, stubbornness: 5 },
      NO_GO,
    );
    expect(view.tone).toBe('blunt');
  });

  it('un-buildable directive (rejectionReason) → objection that names the impossibility, NOT issuable', () => {
    const view = buildDirectiveObjection(
      { name: 'a corps commander', competence: 4, political_reliability: 3 },
      { forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort', rejectionReason: 'no_available_force' },
    );
    expect(view.shows_objection).toBe(true);
    // IMPOSSIBLE directives are NOT forceable — the UI must not stage / debit CA.
    expect(view.issuable).toBe(false);
    expect(view.rejection_reason).toBe('no_available_force');
    expect(view.prose).toMatch(/too few free brigades/i);
  });

  it('IMPOSSIBLE directive is NOT issuable even when the CO is COWED (rejection checked before cowed)', () => {
    // A cowed CO complies with risk, but cannot mount an op with no force / no slot. The
    // rejectionReason must win over the cowed compliance short-circuit.
    const view = buildDirectiveObjection(
      { name: 'Talić', rank: 'corps_commander', competence: 4, political_reliability: 3, is_cowed: true },
      { forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort', rejectionReason: 'no_available_force' },
    );
    expect(view.issuable).toBe(false);
    expect(view.rejection_reason).toBe('no_available_force');
    // NOT the cowed "complies without comment" path.
    expect(view.prose).not.toMatch(/without comment/i);
    expect(view.prose).toMatch(/cannot mount/i);
  });

  it('full operation-slot (no_available_slot rejectionReason) → NOT issuable, names no free operation', () => {
    const view = buildDirectiveObjection(
      { name: 'a corps commander', competence: 4, political_reliability: 3 },
      { forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort', rejectionReason: 'no_available_slot' },
    );
    expect(view.issuable).toBe(false);
    expect(view.rejection_reason).toBe('no_available_slot');
    expect(view.prose).toMatch(/no free operation/i);
  });

  it('a genuine (buildable) objection IS issuable — the Force-anyway path stays available', () => {
    const view = buildDirectiveObjection(
      { name: 'Delić', competence: 4, political_reliability: 5 },
      NO_GO,
    );
    expect(view.shows_objection).toBe(true);
    expect(view.issuable).toBe(true);
    expect(view.rejection_reason).toBeUndefined();
  });

  it('cowed CO on a BUILDABLE no-go still complies (no rejectionReason) — issuable, no objection', () => {
    const view = buildDirectiveObjection(
      { name: 'Talić', rank: 'corps_commander', competence: 4, political_reliability: 3, is_cowed: true },
      NO_GO,
    );
    expect(view.shows_objection).toBe(false);
    expect(view.issuable).toBe(true);
    expect(view.rejection_reason).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Part B — planDirectiveOperation purity + selection parity
// ═══════════════════════════════════════════════════════════════════════════

const ADJ = new Map<string, string[]>([
  ['bihac_1', ['bihac_2']],
  ['bihac_2', ['bihac_1']],
]);

// Brigades carry a full composition so createSingleAxis's role-assignment (basePower)
// does NOT backfill default composition — keeping the purity comparison clean. This
// backfill is pre-existing createSingleAxis behavior (the original injectOpDirectives
// called it the same way); the test isolates the helper's OWN purity.
function brigade(id: string): any {
  return {
    id, faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps',
    personnel: 2000, location_osid: 'bihac_2',
    composition: {
      infantry: 950, tanks: 1, artillery: 3, aa_systems: 0,
      tank_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 },
      artillery_condition: { operational: 0.6, degraded: 0.25, non_operational: 0.15 },
    },
  };
}

function makeState(opts: { controllers?: Record<string, string>; ops?: any[] } = {}): any {
  return {
    meta: { turn: 14, phase: 'war', player_faction: 'RBiH' },
    political: { political_controllers: opts.controllers ?? { bihac_1: 'RS', bihac_2: 'RBiH' } },
    military: {
      named_officers: {},
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: 'RBiH', kind: 'corps', status: 'active' },
        rbih_b1: brigade('rbih_b1'),
        rbih_b2: brigade('rbih_b2'),
        rbih_b3: brigade('rbih_b3'),
      },
      corps_command: {
        rbih_1st_corps: { active_operations: opts.ops ?? [], stance: 'balanced' },
      },
    },
  };
}

describe('planDirectiveOperation — pure auto-selection shared with injectOpDirectives', () => {
  it('applies the 500-person attack floor equally to on-front, off-front, and reserve brigades', () => {
    const state = makeState({ controllers: { target: 'RS', staging: 'RBiH', origin: 'RBiH' } });
    const corps = state.military.formations.rbih_1st_corps;
    state.military.formations = { rbih_1st_corps: corps };
    const placements = [
      { name: 'on_front', location_osid: 'staging', role: 'front' },
      { name: 'off_front', location_osid: 'origin', role: 'front' },
      { name: 'reserve', location_osid: 'staging', role: 'reserve' },
    ];
    for (const placement of placements) {
      state.military.formations[`rbih_${placement.name}_499`] = {
        ...brigade(`rbih_${placement.name}_499`),
        ...placement,
        personnel: 499,
      };
      state.military.formations[`rbih_${placement.name}_500`] = {
        ...brigade(`rbih_${placement.name}_500`),
        ...placement,
        personnel: 500,
      };
    }
    state.military.corps_front_sectors = {
      sector: {
        sector_id: 'sector', corps_id: 'rbih_1st_corps', faction: 'RBiH',
        assigned_brigade_ids: ['rbih_on_front_499', 'rbih_on_front_500', 'rbih_off_front_499', 'rbih_off_front_500'],
        reserve_brigade_ids: ['rbih_reserve_499', 'rbih_reserve_500'],
      },
    };
    const adjacency = new Map<string, string[]>([
      ['target', ['staging']],
      ['staging', ['target', 'origin']],
      ['origin', ['staging']],
    ]);

    const plan = planDirectiveOperation(
      state,
      state.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      'target',
      adjacency,
    );

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.participants).toEqual([
        'rbih_off_front_500',
        'rbih_on_front_500',
        'rbih_reserve_500',
      ]);
    }
  });

  it('fails closed when only two connected brigades meet the floor and eight are understrength', async () => {
    const target = 'op:banja_luka:dragocaj';
    const staging = 'op:banja_luka:banja_luka_2';
    const state = makeState({ controllers: { [target]: 'RS', [staging]: 'RBiH' } });
    const corps = state.military.formations.rbih_1st_corps;
    state.military.formations = { rbih_1st_corps: corps };
    for (let index = 1; index <= 10; index += 1) {
      state.military.formations[`rbih_b${index}`] = {
        ...brigade(`rbih_b${index}`),
        personnel: index <= 2 ? 500 : 499,
        location_osid: staging,
      };
    }
    const adjacency = new Map<string, string[]>([
      [target, [staging]],
      [staging, [target]],
    ]);
    const before = JSON.stringify(state);

    const plan = planDirectiveOperation(
      state,
      state.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      target,
      adjacency,
    );
    const query = await queryDirectiveObjection(
      state,
      { corpsId: 'rbih_1st_corps', targetOsid: target },
      process.cwd(),
    );

    expect(plan).toEqual({ ok: false, reason: 'no_available_force' });
    expect(query).toEqual({
      rejectionReason: 'no_available_force',
      forceRatio: 0,
      estimatedCasualties: 0,
      recommendedAction: 'abort',
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('selects only objective-legal brigades connected to staging and remains JSON-pure', () => {
    const state = makeState({
      controllers: {
        bihac_1: 'RS',
        bihac_2: 'RBiH',
        disconnected_owned: 'RBiH',
        'op:srebrenica:srebrenica_2': 'RBiH',
      },
    });
    state.military.formations.rbih_remote = {
      ...brigade('rbih_remote'),
      location_osid: 'disconnected_owned',
    };
    state.military.formations.rbih_enclave = {
      ...brigade('rbih_enclave'),
      location_osid: 'op:srebrenica:srebrenica_2',
      tags: ['enclave'],
    };
    const adjacency = new Map<string, string[]>([
      ['bihac_1', ['bihac_2']],
      ['bihac_2', ['bihac_1']],
      ['disconnected_owned', []],
      ['op:srebrenica:srebrenica_2', []],
    ]);
    const before = JSON.stringify(state);

    const plan = planDirectiveOperation(
      state,
      state.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      'bihac_1',
      adjacency,
    );

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.participants).toEqual(['rbih_b1', 'rbih_b2', 'rbih_b3']);
      expect(plan.stagingOsid).toBe('bihac_2');
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('allows an enclave brigade to support an objective within its unchanged enclave perimeter', () => {
    const state = makeState({
      controllers: {
        'op:srebrenica:obadi': 'RS',
        'op:srebrenica:srebrenica_2': 'RBiH',
      },
    });
    state.military.formations.rbih_b1.location_osid = 'op:srebrenica:srebrenica_2';
    state.military.formations.rbih_b2.location_osid = 'op:srebrenica:srebrenica_2';
    state.military.formations.rbih_b3 = {
      ...brigade('rbih_b3'),
      location_osid: 'op:srebrenica:srebrenica_2',
      tags: ['enclave'],
    };
    const adjacency = new Map<string, string[]>([
      ['op:srebrenica:obadi', ['op:srebrenica:srebrenica_2']],
      ['op:srebrenica:srebrenica_2', ['op:srebrenica:obadi']],
    ]);

    const plan = planDirectiveOperation(
      state,
      state.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      'op:srebrenica:obadi',
      adjacency,
    );

    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.participants).toEqual(['rbih_b1', 'rbih_b2', 'rbih_b3']);
  });

  it('chooses the first lexicographic staging candidate with at least three reachable legal brigades', () => {
    const state = makeState({
      controllers: { target: 'RS', a_stage: 'RBiH', b_stage: 'RBiH' },
    });
    state.military.formations.rbih_b1.location_osid = 'a_stage';
    state.military.formations.rbih_b2.location_osid = 'a_stage';
    state.military.formations.rbih_b3.location_osid = 'b_stage';
    state.military.formations.rbih_b4 = { ...brigade('rbih_b4'), location_osid: 'b_stage' };
    state.military.formations.rbih_b5 = { ...brigade('rbih_b5'), location_osid: 'b_stage' };
    const adjacency = new Map<string, string[]>([
      ['target', ['b_stage', 'a_stage']],
      ['a_stage', ['target']],
      ['b_stage', ['target']],
    ]);

    const plan = planDirectiveOperation(
      state,
      state.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      'target',
      adjacency,
    );

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.stagingOsid).toBe('b_stage');
      expect(plan.participants).toEqual(['rbih_b3', 'rbih_b4', 'rbih_b5']);
    }
  });

  it('uses allied territory for normal connectivity but rejects the same route when hostile', () => {
    const makeRouteState = (alliance: number) => {
      const state = makeState({
        controllers: {
          target: 'RS',
          staging: 'RBiH',
          ally_corridor: 'HRHB',
          origin: 'RBiH',
        },
      });
      state.political.war_alliance_rbih_hrhb = alliance;
      for (const id of ['rbih_b1', 'rbih_b2', 'rbih_b3']) {
        state.military.formations[id].location_osid = 'origin';
      }
      return state;
    };
    const adjacency = new Map<string, string[]>([
      ['target', ['staging']],
      ['staging', ['target', 'ally_corridor']],
      ['ally_corridor', ['staging', 'origin']],
      ['origin', ['ally_corridor']],
    ]);
    const allied = makeRouteState(1);
    const hostile = makeRouteState(0);

    const alliedPlan = planDirectiveOperation(allied, allied.military.corps_command.rbih_1st_corps, 'rbih_1st_corps', 'target', adjacency);
    const hostilePlan = planDirectiveOperation(hostile, hostile.military.corps_command.rbih_1st_corps, 'rbih_1st_corps', 'target', adjacency);

    expect(alliedPlan.ok).toBe(true);
    expect(hostilePlan).toEqual({ ok: false, reason: 'no_available_force' });
  });

  it('selects at most 12 by equipment priority and ID, with canonical output across insertion orders', () => {
    const defs = [
      ...['mech_z', 'mech_a', 'mech_m', 'mech_b'].map((id) => ({ id, equipment_class: 'mechanized' })),
      ...['motor_z', 'motor_a', 'motor_m', 'motor_b'].map((id) => ({ id, equipment_class: 'motorized' })),
      ...['mount_z', 'mount_a', 'mount_m', 'mount_b'].map((id) => ({ id, equipment_class: 'mountain' })),
      { id: 'foot_a', equipment_class: undefined },
      { id: 'foot_b', equipment_class: undefined },
    ];
    const makeOrderedState = (ordered: typeof defs) => {
      const state = makeState({ controllers: { target: 'RS', staging: 'RBiH' } });
      const corps = state.military.formations.rbih_1st_corps;
      state.military.formations = { rbih_1st_corps: corps };
      for (const def of ordered) {
        state.military.formations[def.id] = {
          ...brigade(def.id),
          location_osid: 'staging',
          ...(def.equipment_class ? { equipment_class: def.equipment_class } : {}),
        };
      }
      return state;
    };
    const forward = makeOrderedState(defs);
    const reverse = makeOrderedState([...defs].reverse());
    const forwardAdj = new Map<string, string[]>([['target', ['staging']], ['staging', ['target']]]);
    const reverseAdj = new Map<string, string[]>([['staging', ['target']], ['target', ['staging']]]);

    const forwardPlan = planDirectiveOperation(forward, forward.military.corps_command.rbih_1st_corps, 'rbih_1st_corps', 'target', forwardAdj);
    const reversePlan = planDirectiveOperation(reverse, reverse.military.corps_command.rbih_1st_corps, 'rbih_1st_corps', 'target', reverseAdj);
    const expected = defs.slice(0, 12).map((d) => d.id).sort();

    expect(forwardPlan).toEqual(reversePlan);
    expect(forwardPlan.ok).toBe(true);
    if (forwardPlan.ok) {
      expect(forwardPlan.participants).toHaveLength(12);
      expect(forwardPlan.participants).toEqual(expected);
    }
  });

  it('distinguishes no friendly staging from friendly staging with fewer than three reachable brigades', () => {
    const unreachable = makeState({ controllers: { target: 'RS', hostile_neighbor: 'RS', bihac_2: 'RBiH' } });
    const noForce = makeState({ controllers: { target: 'RS', staging: 'RBiH' } });
    delete noForce.military.formations.rbih_b3;
    noForce.military.formations.rbih_b1.location_osid = 'staging';
    noForce.military.formations.rbih_b2.location_osid = 'staging';

    const unreachablePlan = planDirectiveOperation(
      unreachable,
      unreachable.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      'target',
      new Map([['target', ['hostile_neighbor']], ['hostile_neighbor', ['target']]]),
    );
    const noForcePlan = planDirectiveOperation(
      noForce,
      noForce.military.corps_command.rbih_1st_corps,
      'rbih_1st_corps',
      'target',
      new Map([['target', ['staging']], ['staging', ['target']]]),
    );

    expect(unreachablePlan).toEqual({ ok: false, reason: 'objective_unreachable' });
    expect(noForcePlan).toEqual({ ok: false, reason: 'no_available_force' });
  });

  it('produces a candidate plan (force + reachable axis) without mutating state', () => {
    const state = makeState();
    const before = JSON.stringify(state);
    const cmd = state.military.corps_command.rbih_1st_corps;

    const plan = planDirectiveOperation(state, cmd, 'rbih_1st_corps', 'bihac_1', ADJ);

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.participants).toEqual(['rbih_b1', 'rbih_b2', 'rbih_b3']);
      expect(plan.stagingOsid).toBe('bihac_2');
      expect(plan.axes).toHaveLength(1);
      expect(plan.axes[0].objectives).toEqual(['bihac_1']);
      expect(plan.corpsFaction).toBe('RBiH');
    }
    // PURITY: no mutation of state or cmd.
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rejects (no mutation) when the objective is already owned', () => {
    const state = makeState({ controllers: { bihac_1: 'RBiH', bihac_2: 'RBiH' } });
    const before = JSON.stringify(state);
    const cmd = state.military.corps_command.rbih_1st_corps;

    const plan = planDirectiveOperation(state, cmd, 'rbih_1st_corps', 'bihac_1', ADJ);

    expect(plan).toEqual({ ok: false, reason: 'objective_already_owned' });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rejects with no_adjacency when no adjacency graph is supplied', () => {
    const state = makeState();
    const cmd = state.military.corps_command.rbih_1st_corps;
    const plan = planDirectiveOperation(state, cmd, 'rbih_1st_corps', 'bihac_1', undefined);
    expect(plan).toEqual({ ok: false, reason: 'no_adjacency' });
  });
});
