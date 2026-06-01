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

  it('un-buildable directive (rejectionReason) → objection that names the impossibility', () => {
    const view = buildDirectiveObjection(
      { name: 'a corps commander', competence: 4, political_reliability: 3 },
      { forceRatio: 0, estimatedCasualties: 0, recommendedAction: 'abort', rejectionReason: 'no_available_force' },
    );
    expect(view.shows_objection).toBe(true);
    expect(view.rejection_reason).toBe('no_available_force');
    expect(view.prose).toMatch(/too few free brigades/i);
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
      },
      corps_command: {
        rbih_1st_corps: { active_operations: opts.ops ?? [], stance: 'balanced' },
      },
    },
  };
}

describe('planDirectiveOperation — pure auto-selection shared with injectOpDirectives', () => {
  it('produces a candidate plan (force + reachable axis) without mutating state', () => {
    const state = makeState();
    const before = JSON.stringify(state);
    const cmd = state.military.corps_command.rbih_1st_corps;

    const plan = planDirectiveOperation(state, cmd, 'rbih_1st_corps', 'bihac_1', ADJ);

    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.participants.sort()).toEqual(['rbih_b1', 'rbih_b2']);
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
