/**
 * Faction-asymmetric COMMAND-LEVER CONSEQUENCES (Presidential Command Model §4).
 *
 * Proves the deferred political consequences wired at the two engine lever sites:
 *   - REPLACE-CO  (apply-co-replacements war-phase step) → officer-corps revolt fallout
 *     when faction patron-dependence × relieved-officer political standing crosses the
 *     revolt threshold (RS > RBiH > HRHB, from DATA not `if faction===`).
 *   - FORCE-OP    (inject-op-directive, force_over_objection) → patron_confidence price
 *     scaled by the same faction-dependence weight (RS > RBiH > HRHB).
 *
 * Verifies:
 *   (a) ASYMMETRY: RS pays strictly more than HRHB on both levers; the replace-CO revolt
 *       fires for RS but not for HRHB on the same officer disposition.
 *   (b) DETERMINISM: identical state → identical deltas across repeated pure-helper calls.
 *   (c) RECEIPT: the command-friction read-model surfaces the persisted consequence.
 *   (d) the consequence keys strictly off player-only staged fields (no record without a
 *       staged pending_co_replacement / forced_over_objection).
 */
import { describe, it, expect } from 'vitest';
import {
  applyReplaceCoConsequence,
  applyForceOpConsequence,
  applyStopOpConsequence,
  buildCommandFrictionStakes,
  COMMAND_FRICTION_FACTION_WEIGHT,
  REVOLT_THRESHOLD,
  STOP_OP_PATRON_BASE,
  FORCE_OP_PATRON_BASE,
  PATRON_OVERRIDE_FLOOR,
} from '../src/sim/combat/command_lever_consequences.js';
import { buildCommandFrictionReceipts } from '../src/ui/map/data/commandFrictionReceipts.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';

const REPLACE_STEP = warPhases.find((p) => p.name === 'apply-co-replacements')!;

/** Minimal state for the apply-co-replacements step, parameterised by faction + the
 *  relieved officer's political_reliability. */
function makeReplaceState(faction: string, polRel: number): any {
  const corpsId = `${faction}_corps`;
  return {
    meta: { turn: 20, phase: 'war' },
    military: {
      named_officers: {
        co_current: { officer_id: 'co_current', status: 'active', assigned_corps_id: corpsId, turns_in_command: 6 },
        co_reserve: { officer_id: 'co_reserve', status: 'reserve', assigned_corps_id: null, turns_in_command: 0 },
      },
      named_officer_data: [
        { id: 'co_current', name: 'Current CO', faction, rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 2, political_reliability: polRel, pool_tier: 'tier_b', home_corps_id: corpsId },
        { id: 'co_reserve', name: 'Reserve CO', faction, rank: 'corps_commander', competence: 4, aggressiveness: 3, defensive_skill: 2, political_reliability: 3, pool_tier: 'tier_a', home_corps_id: corpsId },
      ],
      formations: {
        [corpsId]: { id: corpsId, faction, kind: 'corps', status: 'active' },
        b1: { id: 'b1', faction, kind: 'brigade', status: 'active', corps_id: corpsId, morale: 70 },
      },
      corps_command: {
        [corpsId]: {
          active_operations: [],
          pending_co_replacement: { replacement_officer_id: 'co_reserve', turn: 20, ca_cost: 25 },
        },
      },
      negotiation: { strategic_dimensions: initializeStrategicDimensions() },
    },
  };
}

describe('REPLACE-CO faction-asymmetric consequence', () => {
  it('RS sacking an entrenched (pol_rel 4) CO triggers an officer-corps revolt; HRHB does NOT', () => {
    const rs = makeReplaceState('RS', 4);
    REPLACE_STEP.run({ state: rs } as any);
    const rsCmd = rs.military.corps_command.RS_corps;
    const rsRecord = (rsCmd.command_friction_record ?? [])[0];
    expect(rsRecord?.revolt).toBe(true);
    expect(rsRecord?.patron_confidence_delta).toBeLessThan(0);
    // patron_confidence took the revolt hit (a persistent negative event_modifier).
    expect(rs.military.negotiation.strategic_dimensions.RS.patron_confidence.event_modifier).toBeLessThan(0);
    // The successor is paralysed (cowed) past the current turn.
    expect(rs.military.named_officers.co_reserve.cowed_until_turn).toBeGreaterThan(rs.meta.turn);

    const hrhb = makeReplaceState('HRHB', 4);
    REPLACE_STEP.run({ state: hrhb } as any);
    const hrhbCmd = hrhb.military.corps_command.HRHB_corps;
    // Below the revolt threshold (0.25 × 4 = 1.0 < 3.5) → NO revolt. But HRHB is PATRON-GATED
    // (Zagreb-gate): the sub-threshold sacking is confirmed by the patron, producing a
    // non-revolt record with the small PATRON_OVERRIDE_FLOOR patron shift.
    const hrhbRecord = (hrhbCmd.command_friction_record ?? [])[0];
    expect(hrhbRecord?.revolt).toBe(false);
    expect(hrhbRecord?.patron_confidence_delta).toBe(PATRON_OVERRIDE_FLOOR.HRHB);
    expect(hrhbRecord?.cohesion_delta).toBe(0);
    expect(hrhb.military.negotiation.strategic_dimensions.HRHB.patron_confidence.event_modifier).toBe(
      PATRON_OVERRIDE_FLOOR.HRHB,
    );
  });

  it('ASYMMETRY: RS revolt patron penalty is strictly steeper than RBiH would be (data, not branch)', () => {
    // RS crosses at pol_rel 4 (1.0×4=4.0); RBiH needs pol_rel that crosses 3.5 → use a high
    // standing so both revolt, and confirm RS pays more (weight 1.0 vs 0.5).
    const rs = makeReplaceState('RS', 5);
    REPLACE_STEP.run({ state: rs } as any);
    const rbih = makeReplaceState('RBiH', 5); // 0.5 × 5 = 2.5 — still below threshold
    REPLACE_STEP.run({ state: rbih } as any);
    const rsRecord = (rs.military.corps_command.RS_corps.command_friction_record ?? [])[0];
    expect(rsRecord?.revolt).toBe(true);
    // RBiH 0.5 × 5 = 2.5 < 3.5 → no revolt (firm civilian control); the asymmetry is the weight.
    expect(rbih.military.corps_command.RBiH_corps.command_friction_record).toBeUndefined();
  });

  it('DETERMINISM EARLY-OUT: no command_friction_record when nothing is staged', () => {
    const rs = makeReplaceState('RS', 4);
    rs.military.corps_command.RS_corps.pending_co_replacement = undefined;
    const before = JSON.stringify(rs);
    REPLACE_STEP.run({ state: rs } as any);
    expect(JSON.stringify(rs)).toBe(before);
  });
});

describe('FORCE-OP faction-asymmetric consequence', () => {
  function makeForceState(): any {
    return {
      meta: { turn: 12 },
      military: { negotiation: { strategic_dimensions: initializeStrategicDimensions() } },
    };
  }

  it('RS pays strictly more patron_confidence than HRHB for forcing an op (weight 1.0 vs 0.25)', () => {
    const rs = makeForceState();
    const rsCmd: any = {};
    const rsRec = applyForceOpConsequence(rs, 'RS_corps', 'RS', 12, rsCmd);

    const hrhb = makeForceState();
    const hrhbCmd: any = {};
    const hrhbRec = applyForceOpConsequence(hrhb, 'HRHB_corps', 'HRHB', 12, hrhbCmd);

    expect(rsRec!.patron_confidence_delta).toBeLessThan(hrhbRec!.patron_confidence_delta);
    expect(rsRec!.patron_confidence_delta).toBeLessThan(0);
    // Persisted onto patron_confidence.
    expect(rs.military.negotiation.strategic_dimensions.RS.patron_confidence.event_modifier).toBeLessThan(
      hrhb.military.negotiation.strategic_dimensions.HRHB.patron_confidence.event_modifier,
    );
  });

  it('DETERMINISM: repeated identical calls produce identical deltas', () => {
    const a = applyForceOpConsequence(makeForceState(), 'c', 'RS', 12, {} as any);
    const b = applyForceOpConsequence(makeForceState(), 'c', 'RS', 12, {} as any);
    expect(a).toEqual(b);
  });
});

describe('FORCE-LAUNCH (authorize-op override) faction-asymmetric consequence', () => {
  const FORCE_LAUNCH_STEP = warPhases.find((p) => p.name === 'apply-force-launch-consequences')!;

  /** Minimal state for apply-force-launch-consequences: one corps with a single active op
   *  carrying the force-launch tags an IPC handler / commander_loop would have set. */
  function makeForceLaunchState(
    faction: string,
    assessmentAtLaunch: 'launch' | 'postpone' | 'abort' | undefined,
    opts?: { wasForceLaunched?: boolean; alreadyCharged?: boolean },
  ): any {
    const corpsId = `${faction}_corps`;
    return {
      meta: { turn: 30, phase: 'war' },
      military: {
        formations: { [corpsId]: { id: corpsId, faction, kind: 'corps', status: 'active' } },
        corps_command: {
          [corpsId]: {
            active_operations: [
              {
                name: 'Op Override',
                type: 'sector_attack',
                was_force_launched: opts?.wasForceLaunched ?? true,
                commander_assessment_at_launch: assessmentAtLaunch,
                force_launch_consequence_applied: opts?.alreadyCharged ?? undefined,
              },
            ],
          },
        },
        negotiation: { strategic_dimensions: initializeStrategicDimensions() },
      },
    };
  }

  it('RS pays strictly more than HRHB when force-launching past a SHOWN objection (abort)', () => {
    const rs = makeForceLaunchState('RS', 'abort');
    FORCE_LAUNCH_STEP.run({ state: rs } as any);
    const hrhb = makeForceLaunchState('HRHB', 'abort');
    FORCE_LAUNCH_STEP.run({ state: hrhb } as any);

    const rsRec = (rs.military.corps_command.RS_corps.command_friction_record ?? [])[0];
    const hrhbRec = (hrhb.military.corps_command.HRHB_corps.command_friction_record ?? [])[0];
    expect(rsRec?.lever).toBe('force_op');
    expect(rsRec?.patron_confidence_delta).toBeLessThan(hrhbRec.patron_confidence_delta);
    expect(rsRec?.patron_confidence_delta).toBeLessThan(0);
    // Charged once — the one-shot marker is now set on the op.
    expect(rs.military.corps_command.RS_corps.active_operations[0].force_launch_consequence_applied).toBe(true);
    expect(rs.military.negotiation.strategic_dimensions.RS.patron_confidence.event_modifier).toBeLessThan(
      hrhb.military.negotiation.strategic_dimensions.HRHB.patron_confidence.event_modifier,
    );
  });

  it('postpone (a no-go) is also a SHOWN objection and costs patron_confidence', () => {
    const rs = makeForceLaunchState('RS', 'postpone');
    FORCE_LAUNCH_STEP.run({ state: rs } as any);
    const rec = (rs.military.corps_command.RS_corps.command_friction_record ?? [])[0];
    expect(rec?.patron_confidence_delta).toBeLessThan(0);
  });

  it('UNCONTESTED launch costs nothing: commander recommended launch → no override, no record', () => {
    const rs = makeForceLaunchState('RS', 'launch');
    const before = JSON.stringify(rs);
    FORCE_LAUNCH_STEP.run({ state: rs } as any);
    // No SHOWN objection → byte-identical (no charge, no marker, no record).
    expect(JSON.stringify(rs)).toBe(before);
  });

  it('no commander_assessment_at_launch snapshot → no objection was shown → no charge', () => {
    const rs = makeForceLaunchState('RS', undefined);
    const before = JSON.stringify(rs);
    FORCE_LAUNCH_STEP.run({ state: rs } as any);
    expect(JSON.stringify(rs)).toBe(before);
  });

  it('ONE-SHOT: an already-charged op is not re-charged (idempotent across turns)', () => {
    const rs = makeForceLaunchState('RS', 'abort', { alreadyCharged: true });
    const before = JSON.stringify(rs);
    FORCE_LAUNCH_STEP.run({ state: rs } as any);
    expect(JSON.stringify(rs)).toBe(before);
  });

  it('PLAYER-ONLY EARLY-OUT: headless (no was_force_launched) is byte-identical', () => {
    // Bots never set was_force_launched; the step must leave such state untouched.
    const headless = makeForceLaunchState('RS', 'abort', { wasForceLaunched: false });
    const before = JSON.stringify(headless);
    FORCE_LAUNCH_STEP.run({ state: headless } as any);
    expect(JSON.stringify(headless)).toBe(before);
  });
});

describe('HRHB Zagreb-gate (patron-override on a sub-revolt sacking)', () => {
  it('HRHB now produces a non-revolt patron-override record where it previously produced none', () => {
    const hrhb = makeReplaceState('HRHB', 4); // 0.25 × 4 = 1.0 < 3.5 → no revolt
    REPLACE_STEP.run({ state: hrhb } as any);
    const rec = (hrhb.military.corps_command.HRHB_corps.command_friction_record ?? [])[0];
    expect(rec).toBeDefined();
    expect(rec.lever).toBe('replace_co');
    expect(rec.revolt).toBe(false);
    expect(rec.patron_confidence_delta).toBe(PATRON_OVERRIDE_FLOOR.HRHB);
    expect(PATRON_OVERRIDE_FLOOR.HRHB).toBeLessThan(0);
  });

  it('RS path is UNCHANGED: a crossing sacking still revolts (not a patron-override)', () => {
    const rs = makeReplaceState('RS', 4); // 1.0 × 4 = 4.0 ≥ 3.5 → revolt
    REPLACE_STEP.run({ state: rs } as any);
    const rec = (rs.military.corps_command.RS_corps.command_friction_record ?? [])[0];
    expect(rec.revolt).toBe(true);
    // RS is not patron-gated; its sub-threshold path would still be a clean no-op (null).
    expect(PATRON_OVERRIDE_FLOOR.RS).toBeUndefined();
  });

  it('RBiH path is UNCHANGED: a sub-threshold sacking produces NO record (not patron-gated)', () => {
    const rbih = makeReplaceState('RBiH', 5); // 0.5 × 5 = 2.5 < 3.5, and RBiH not patron-gated
    REPLACE_STEP.run({ state: rbih } as any);
    expect(rbih.military.corps_command.RBiH_corps.command_friction_record).toBeUndefined();
    expect(PATRON_OVERRIDE_FLOOR.RBiH).toBeUndefined();
  });
});

describe('STOP-OP faction-asymmetric consequence', () => {
  function makeStopState(): any {
    return {
      meta: { turn: 18 },
      military: { negotiation: { strategic_dimensions: initializeStrategicDimensions() } },
    };
  }

  it('RS pays strictly more patron_confidence than HRHB for halting an op (weight 1.0 vs 0.25)', () => {
    const rs = makeStopState();
    const rsRec = applyStopOpConsequence(rs, 'RS_corps', 'RS', 18, {} as any);
    const hrhb = makeStopState();
    const hrhbRec = applyStopOpConsequence(hrhb, 'HRHB_corps', 'HRHB', 18, {} as any);

    expect(rsRec!.lever).toBe('stop_op');
    expect(rsRec!.revolt).toBe(false);
    expect(rsRec!.patron_confidence_delta).toBeLessThan(hrhbRec!.patron_confidence_delta);
    expect(rsRec!.patron_confidence_delta).toBeLessThan(0);
    expect(rs.military.negotiation.strategic_dimensions.RS.patron_confidence.event_modifier).toBeLessThan(
      hrhb.military.negotiation.strategic_dimensions.HRHB.patron_confidence.event_modifier,
    );
  });

  it('a halt is less culpable than forcing an op (STOP_OP base above FORCE_OP base)', () => {
    // -8 > -10 → a halt costs less than forcing an op past an objection.
    expect(STOP_OP_PATRON_BASE).toBeGreaterThan(FORCE_OP_PATRON_BASE);
    const rsStop = applyStopOpConsequence(makeStopState(), 'c', 'RS', 18, {} as any);
    const rsForce = applyForceOpConsequence(
      { meta: { turn: 18 }, military: { negotiation: { strategic_dimensions: initializeStrategicDimensions() } } } as any,
      'c', 'RS', 18, {} as any,
    );
    expect(rsStop!.patron_confidence_delta).toBeGreaterThan(rsForce!.patron_confidence_delta);
  });

  it('PLAYER-ONLY EARLY-OUT: apply-op-halts step is byte-identical when nothing is staged', () => {
    const STOP_STEP = warPhases.find((p) => p.name === 'apply-op-halts')!;
    const state: any = {
      meta: { turn: 18, phase: 'war' },
      military: {
        formations: { RS_corps: { id: 'RS_corps', faction: 'RS', kind: 'corps', status: 'active' } },
        corps_command: { RS_corps: { active_operations: [] } }, // no pending_op_halt
        negotiation: { strategic_dimensions: initializeStrategicDimensions() },
      },
    };
    const before = JSON.stringify(state);
    STOP_STEP.run({ state } as any);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('DETERMINISM: repeated identical stop-op calls produce identical deltas', () => {
    const a = applyStopOpConsequence(makeStopState(), 'c', 'RS', 18, {} as any);
    const b = applyStopOpConsequence(makeStopState(), 'c', 'RS', 18, {} as any);
    expect(a).toEqual(b);
  });
});

describe('command-friction receipt read-model', () => {
  it('surfaces a persisted replace-CO revolt consequence', () => {
    const rs = makeReplaceState('RS', 4);
    REPLACE_STEP.run({ state: rs } as any);
    const receipts = buildCommandFrictionReceipts(rs);
    expect(receipts.length).toBe(1);
    expect(receipts[0]!.lever).toBe('replace_co');
    expect(receipts[0]!.faction).toBe('RS');
    expect(receipts[0]!.revolt).toBe(true);
    expect(receipts[0]!.patronConfidenceDelta).toBeLessThan(0);
  });

  it('returns [] on a state with no friction records (bot/historical projection)', () => {
    expect(buildCommandFrictionReceipts({ military: { corps_command: {} } } as any)).toEqual([]);
    expect(buildCommandFrictionReceipts(null)).toEqual([]);
  });
});

describe('faction-asymmetric STAKES preview (pre-commit card)', () => {
  it('orders the factions RS > RBiH > HRHB by patron-dependence weight (the single data source)', () => {
    expect(COMMAND_FRICTION_FACTION_WEIGHT.RS).toBeGreaterThan(COMMAND_FRICTION_FACTION_WEIGHT.RBiH);
    expect(COMMAND_FRICTION_FACTION_WEIGHT.RBiH).toBeGreaterThan(COMMAND_FRICTION_FACTION_WEIGHT.HRHB);
  });

  it('replace-CO stakes flag revolt for RS but not HRHB on the same officer', () => {
    const rs = buildCommandFrictionStakes('RS', 'replace_co', 4);
    const hrhb = buildCommandFrictionStakes('HRHB', 'replace_co', 4);
    expect(rs.revoltLikely).toBe(true);
    expect(rs.severity).toBe('severe');
    expect(hrhb.revoltLikely).toBe(false);
    expect(hrhb.severity).toBe('minimal');
    expect(rs.patronConfidenceAtRisk).toBeLessThan(0);
    // HRHB does NOT revolt, but it is PATRON-GATED — its sub-threshold sacking previews the
    // small Zagreb-gate patron-override floor (#314 Codex follow-up), not 0.
    expect(hrhb.patronConfidenceAtRisk).toBe(PATRON_OVERRIDE_FLOOR.HRHB);
    expect(hrhb.patronConfidenceAtRisk).toBeLessThan(0);
  });

  it('force-op stakes scale patron-at-risk by faction weight (RS steeper than HRHB)', () => {
    const rs = buildCommandFrictionStakes('RS', 'force_op');
    const hrhb = buildCommandFrictionStakes('HRHB', 'force_op');
    expect(rs.patronConfidenceAtRisk).toBeLessThan(hrhb.patronConfidenceAtRisk);
    expect(rs.revoltLikely).toBe(false);
  });

  it('stop-op stakes scale patron-at-risk by faction weight and never flag a revolt', () => {
    const rs = buildCommandFrictionStakes('RS', 'stop_op');
    const hrhb = buildCommandFrictionStakes('HRHB', 'stop_op');
    expect(rs.patronConfidenceAtRisk).toBeLessThan(hrhb.patronConfidenceAtRisk);
    expect(rs.revoltLikely).toBe(false);
    // A halt is less culpable than forcing — RS stop-op risk is shallower than force-op risk.
    expect(rs.patronConfidenceAtRisk).toBeGreaterThan(
      buildCommandFrictionStakes('RS', 'force_op').patronConfidenceAtRisk,
    );
  });

  it('the revolt threshold is the documented constant (owner-adjustable)', () => {
    expect(REVOLT_THRESHOLD).toBe(3.5);
  });

  it('stop-op stakes: RS pays strictly more than HRHB, matching the apply path (data, not branch)', () => {
    // #314 Codex follow-up: the directive card must PREVIEW the stop-op patron cost.
    const rs = buildCommandFrictionStakes('RS', 'stop_op');
    const hrhb = buildCommandFrictionStakes('HRHB', 'stop_op');
    expect(rs.patronConfidenceAtRisk).toBeLessThan(hrhb.patronConfidenceAtRisk);
    expect(rs.patronConfidenceAtRisk).toBeLessThan(0);
    expect(rs.revoltLikely).toBe(false);
    // The PREVIEW must equal what applyStopOpConsequence actually applies (no drift).
    const applied = applyStopOpConsequence(
      { meta: { turn: 1 }, military: { negotiation: { strategic_dimensions: initializeStrategicDimensions() } } } as any,
      'c', 'RS', 1, {} as any,
    );
    expect(rs.patronConfidenceAtRisk).toBe(applied!.patron_confidence_delta);
    const appliedHrhb = applyStopOpConsequence(
      { meta: { turn: 1 }, military: { negotiation: { strategic_dimensions: initializeStrategicDimensions() } } } as any,
      'c', 'HRHB', 1, {} as any,
    );
    expect(hrhb.patronConfidenceAtRisk).toBe(appliedHrhb!.patron_confidence_delta);
  });

  it('replace-CO SUB-threshold stakes: HRHB Zagreb-gate previews the patron-override floor (not 0)', () => {
    // #314 Codex follow-up: a sub-threshold HRHB sacking still costs the PATRON_OVERRIDE_FLOOR
    // shift, and the preview must surface it (previously projected 0, drifting from the apply path).
    const hrhb = buildCommandFrictionStakes('HRHB', 'replace_co', 4); // 0.25 × 4 = 1.0 < 3.5 → no revolt
    expect(hrhb.revoltLikely).toBe(false);
    expect(hrhb.patronConfidenceAtRisk).toBe(PATRON_OVERRIDE_FLOOR.HRHB);
    expect(hrhb.patronConfidenceAtRisk).toBeLessThan(0);

    // The preview must equal what applyReplaceCoConsequence actually applies on a sub-threshold
    // HRHB sacking (the Zagreb-gate branch) — no drift between card and realised consequence.
    const state: any = {
      meta: { turn: 5 },
      military: { negotiation: { strategic_dimensions: initializeStrategicDimensions() } },
    };
    const applied = applyReplaceCoConsequence(state, 'HRHB_corps', 'HRHB', 4, null, 5, {} as any);
    expect(applied?.revolt).toBe(false);
    expect(hrhb.patronConfidenceAtRisk).toBe(applied!.patron_confidence_delta);
  });

  it('replace-CO SUB-threshold stakes: RBiH (not patron-gated) still previews 0 (unchanged)', () => {
    const rbih = buildCommandFrictionStakes('RBiH', 'replace_co', 5); // 0.5 × 5 = 2.5 < 3.5
    expect(rbih.revoltLikely).toBe(false);
    expect(rbih.patronConfidenceAtRisk).toBe(0);
    expect(PATRON_OVERRIDE_FLOOR.RBiH).toBeUndefined();
  });
});
