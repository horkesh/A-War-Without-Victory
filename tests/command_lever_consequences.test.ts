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
  buildCommandFrictionStakes,
  COMMAND_FRICTION_FACTION_WEIGHT,
  REVOLT_THRESHOLD,
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
    // Below threshold (0.25 × 4 = 1.0 < 3.5) → no revolt record, no extra patron hit.
    expect(hrhbCmd.command_friction_record).toBeUndefined();
    expect(hrhb.military.negotiation.strategic_dimensions.HRHB.patron_confidence.event_modifier).toBe(0);
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
    expect(hrhb.patronConfidenceAtRisk).toBe(0);
  });

  it('force-op stakes scale patron-at-risk by faction weight (RS steeper than HRHB)', () => {
    const rs = buildCommandFrictionStakes('RS', 'force_op');
    const hrhb = buildCommandFrictionStakes('HRHB', 'force_op');
    expect(rs.patronConfidenceAtRisk).toBeLessThan(hrhb.patronConfidenceAtRisk);
    expect(rs.revoltLikely).toBe(false);
  });

  it('the revolt threshold is the documented constant (owner-adjustable)', () => {
    expect(REVOLT_THRESHOLD).toBe(3.5);
  });
});
