/**
 * REPLACE-CO engine apply step (Presidential Command Model slice 3/N).
 *
 * Exercises the `apply-co-replacements` war-phase step (war_phases.ts). The step
 * consumes cc.pending_co_replacement once and, when the corps has a current named CO,
 * REUSES relieveOfficer (retire CO → install reserve replacement → emit officer_relieved),
 * applies the returned morale hit to the corps's brigades + an internal_cohesion cost,
 * records the replacement, and clears the staged field.
 *
 * Verifies:
 *   - staged replacement → current CO retired, reserve officer installed (active + assigned)
 *   - officer_relieved event emitted
 *   - corps brigades take the relief morale hit
 *   - internal_cohesion cost is OBSERVABLE (persistent event_modifier survives the
 *     per-turn compute-dimension-bases recompute — NOT a dead-channel)
 *   - co_replacement_record appended (relieved + replacement + turn)
 *   - pending_co_replacement is ALWAYS consumed/cleared
 *   - DETERMINISM EARLY-OUT: state untouched when nothing is staged
 *   - the installed replacement survives a serialize → deserialize round-trip
 *     (relieveOfficer mutates named_officer_data in place)
 */
import { describe, it, expect } from 'vitest';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { initializeStrategicDimensions, computeDimensionBaseValues } from '../src/sim/events/strategic_dimensions.js';

const STEP = warPhases.find((p) => p.name === 'apply-co-replacements')!;

function runStep(state: any) {
  STEP.run({ state } as any);
}

/** Build a minimal war-phase state with a corps, a current CO, a reserve officer, brigades. */
function makeState(opts: { pending?: any; withDims?: boolean; brigadeMorale?: number } = {}): any {
  const brigadeMorale = opts.brigadeMorale ?? 60;
  const state: any = {
    meta: { turn: 14, phase: 'war' },
    military: {
      named_officers: {
        co_current: { officer_id: 'co_current', status: 'active', assigned_corps_id: 'rbih_1st_corps', turns_in_command: 6 },
        co_reserve: { officer_id: 'co_reserve', status: 'reserve', assigned_corps_id: null, turns_in_command: 0 },
      },
      named_officer_data: [
        { id: 'co_current', name: 'Current CO', faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 2, political_reliability: 3, pool_tier: 'tier_b', home_corps_id: 'rbih_1st_corps' },
        { id: 'co_reserve', name: 'Reserve CO', faction: 'RBiH', rank: 'corps_commander', competence: 4, aggressiveness: 3, defensive_skill: 2, political_reliability: 3, pool_tier: 'tier_a', home_corps_id: 'rbih_1st_corps' },
      ],
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: 'RBiH', kind: 'corps', status: 'active' },
        rbih_b1: { id: 'rbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps', morale: brigadeMorale },
        rbih_b2: { id: 'rbih_b2', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps', morale: brigadeMorale },
      },
      corps_command: {
        rbih_1st_corps: {
          active_operations: [],
          ...(opts.pending !== undefined ? { pending_co_replacement: opts.pending } : {}),
        },
      },
    },
  };
  if (opts.withDims) {
    state.military.negotiation = { strategic_dimensions: initializeStrategicDimensions() };
  }
  return state;
}

describe('REPLACE-CO apply step (apply-co-replacements)', () => {
  it('retires the current CO, installs the reserve replacement, records, and clears the staged field', () => {
    const state = makeState({
      pending: { replacement_officer_id: 'co_reserve', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state);

    // Current CO retired + unassigned.
    expect(state.military.named_officers.co_current.status).toBe('retired');
    expect(state.military.named_officers.co_current.assigned_corps_id).toBeNull();
    // Reserve officer installed as the acting commander of the corps.
    const rep = state.military.named_officers.co_reserve;
    expect(rep.status).toBe('active');
    expect(rep.assigned_corps_id).toBe('rbih_1st_corps');
    expect(rep.acting_commander).toBe(true);
    // officer_relieved event emitted.
    const events = state.military.pending_officer_events ?? [];
    expect(events.some((e: any) => e.type === 'officer_relieved' && e.corps_id === 'rbih_1st_corps')).toBe(true);
    // Replacement recorded.
    expect(cc.co_replacement_record).toEqual([
      { relieved_officer_id: 'co_current', replacement_officer_id: 'co_reserve', turn: 14 },
    ]);
    // Staged field consumed.
    expect(cc.pending_co_replacement).toBeUndefined();
  });

  it('applies the relief morale hit to the corps brigades', () => {
    const state = makeState({
      pending: { replacement_officer_id: 'co_reserve', turn: 14, ca_cost: 25 },
      brigadeMorale: 60,
    });
    runStep(state);
    // RELIEF_MORALE_PENALTY is -10 → brigades drop from 60 to 50.
    expect(state.military.formations.rbih_b1.morale).toBe(50);
    expect(state.military.formations.rbih_b2.morale).toBe(50);
  });

  it('cohesion cost is OBSERVABLE — the internal_cohesion event_modifier survives the per-turn recompute (NOT a dead-channel)', () => {
    const state = makeState({
      pending: { replacement_officer_id: 'co_reserve', turn: 14, ca_cost: 25 },
      withDims: true,
    });
    const dims = state.military.negotiation.strategic_dimensions;
    const before = dims.RBiH.internal_cohesion.effective_value;

    runStep(state);

    // The shift wrote a persistent negative event_modifier.
    expect(dims.RBiH.internal_cohesion.event_modifier).toBeLessThan(0);
    const afterShift = dims.RBiH.internal_cohesion.effective_value;
    expect(afterShift).toBeLessThan(before);

    // Simulate the next-turn compute-dimension-bases recompute: it rewrites base_value
    // but PRESERVES event_modifier, so the cohesion cost remains observable.
    computeDimensionBaseValues(dims, state, 'RBiH');
    expect(dims.RBiH.internal_cohesion.event_modifier).toBeLessThan(0);
    const baseAlone = dims.RBiH.internal_cohesion.base_value;
    expect(dims.RBiH.internal_cohesion.effective_value).toBe(
      Math.max(0, Math.min(100, baseAlone + dims.RBiH.internal_cohesion.event_modifier)),
    );
    // The effective value still carries the penalty vs the same base with no modifier.
    expect(dims.RBiH.internal_cohesion.effective_value).toBeLessThan(baseAlone);
  });

  it('DETERMINISM EARLY-OUT: makes ZERO mutation when no corps has a pending_co_replacement', () => {
    const state = makeState(); // no pending
    const before = JSON.stringify(state);
    runStep(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('the installed replacement survives a serialize → deserialize round-trip (relieveOfficer mutates officer data in place)', () => {
    const state = makeState({
      pending: { replacement_officer_id: 'co_reserve', turn: 14, ca_cost: 25 },
    });
    runStep(state);

    // serializeState runs full validateState (needs a complete state shape that this
    // minimal fixture deliberately omits). The persistence concern here is narrower:
    // relieveOfficer mutates named_officer_data / named_officers IN PLACE, and the new
    // step writes co_replacement_record — verify ALL of that survives the JSON
    // serialize→deserialize round-trip the canonical serializer performs internally.
    const restored: any = JSON.parse(JSON.stringify(state));

    // The installed replacement + retired CO survive the round-trip.
    expect(restored.military.named_officers.co_reserve.status).toBe('active');
    expect(restored.military.named_officers.co_reserve.assigned_corps_id).toBe('rbih_1st_corps');
    expect(restored.military.named_officers.co_reserve.acting_commander).toBe(true);
    expect(restored.military.named_officers.co_current.status).toBe('retired');
    expect(restored.military.named_officers.co_current.assigned_corps_id).toBeNull();
    // The replacement record survives.
    expect(restored.military.corps_command.rbih_1st_corps.co_replacement_record).toEqual([
      { relieved_officer_id: 'co_current', replacement_officer_id: 'co_reserve', turn: 14 },
    ]);
    // The staged field stays cleared.
    expect(restored.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeUndefined();
  });
});
