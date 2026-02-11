/**
 * Tests for src/sim/phase_ii/equipment_effects.ts
 *
 * Covers: ensureBrigadeComposition, computeEquipmentMultiplier,
 *         degradeEquipment, captureEquipment
 */

import { describe, it, expect } from 'vitest';
import {
  ensureBrigadeComposition,
  computeEquipmentMultiplier,
  degradeEquipment,
  captureEquipment
} from '../src/sim/phase_ii/equipment_effects.js';
import type { FormationState, BrigadeComposition, FactionId } from '../src/state/game_state.js';

// --- Helpers ---

function makeFormation(
  id: string,
  faction: FactionId,
  hq: string,
  personnel: number = 1000
): FormationState {
  return {
    id,
    faction,
    name: `Brigade ${id}`,
    created_turn: 1,
    status: 'active',
    assignment: null,
    kind: 'brigade',
    personnel,
    cohesion: 60,
    hq_sid: hq,
    tags: []
  } as FormationState;
}

function makeComposition(overrides: Partial<BrigadeComposition> = {}): BrigadeComposition {
  return {
    infantry: 800,
    tanks: 40,
    artillery: 30,
    aa_systems: 5,
    tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
    artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
    ...overrides
  };
}

// --- Tests ---

describe('ensureBrigadeComposition', () => {
  it('initializes RS defaults: tanks=40, artillery=30', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    const comp = ensureBrigadeComposition(f);
    expect(comp.tanks).toBe(40);
    expect(comp.artillery).toBe(30);
    expect(comp.infantry).toBe(800);
    expect(comp.aa_systems).toBe(5);
    expect(f.composition).toBe(comp); // mutates formation
  });

  it('initializes HRHB defaults: tanks=15, artillery=15', () => {
    const f = makeFormation('hrhb1', 'HRHB', 'hq2');
    const comp = ensureBrigadeComposition(f);
    expect(comp.tanks).toBe(15);
    expect(comp.artillery).toBe(15);
    expect(comp.infantry).toBe(850);
  });

  it('initializes RBiH defaults: tanks=3, artillery=8', () => {
    const f = makeFormation('rbih1', 'RBiH', 'hq3');
    const comp = ensureBrigadeComposition(f);
    expect(comp.tanks).toBe(3);
    expect(comp.artillery).toBe(8);
    expect(comp.infantry).toBe(950);
  });

  it('RBiH starts with worse equipment condition than RS', () => {
    const fRS = makeFormation('rs1', 'RS', 'hq1');
    const fRBiH = makeFormation('rbih1', 'RBiH', 'hq2');
    const compRS = ensureBrigadeComposition(fRS);
    const compRBiH = ensureBrigadeComposition(fRBiH);
    expect(compRS.tank_condition.operational).toBeGreaterThan(compRBiH.tank_condition.operational);
    expect(compRS.artillery_condition.operational).toBeGreaterThan(compRBiH.artillery_condition.operational);
  });

  it('returns existing composition if already set', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    const existing = makeComposition({ tanks: 99 });
    f.composition = existing;
    const comp = ensureBrigadeComposition(f);
    expect(comp).toBe(existing);
    expect(comp.tanks).toBe(99);
  });

  it('unknown faction falls back to RBiH defaults', () => {
    const f = makeFormation('unk1', 'UNKNOWN' as FactionId, 'hq1');
    const comp = ensureBrigadeComposition(f);
    expect(comp.tanks).toBe(3);
    expect(comp.artillery).toBe(8);
  });
});

describe('computeEquipmentMultiplier', () => {
  it('returns >= 1.0 for any formation', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    ensureBrigadeComposition(f);
    expect(computeEquipmentMultiplier(f)).toBeGreaterThanOrEqual(1.0);
  });

  it('attack posture gives higher multiplier than defend (tanks boost offense)', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    ensureBrigadeComposition(f);
    const attackMult = computeEquipmentMultiplier(f, 'attack');
    const defendMult = computeEquipmentMultiplier(f, 'defend');
    expect(attackMult).toBeGreaterThan(defendMult);
  });

  it('probe posture also gets offensive tank bonus', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    ensureBrigadeComposition(f);
    const probeMult = computeEquipmentMultiplier(f, 'probe');
    const defendMult = computeEquipmentMultiplier(f, 'defend');
    expect(probeMult).toBeGreaterThan(defendMult);
  });

  it('RS multiplier > RBiH multiplier (equipment advantage)', () => {
    const fRS = makeFormation('rs1', 'RS', 'hq1');
    const fRBiH = makeFormation('rbih1', 'RBiH', 'hq2');
    ensureBrigadeComposition(fRS);
    ensureBrigadeComposition(fRBiH);
    const rsMult = computeEquipmentMultiplier(fRS, 'attack');
    const rbihMult = computeEquipmentMultiplier(fRBiH, 'attack');
    expect(rsMult).toBeGreaterThan(rbihMult);
  });

  it('RS multiplier > HRHB multiplier > RBiH multiplier', () => {
    const fRS = makeFormation('rs1', 'RS', 'hq1');
    const fHRHB = makeFormation('hrhb1', 'HRHB', 'hq2');
    const fRBiH = makeFormation('rbih1', 'RBiH', 'hq3');
    ensureBrigadeComposition(fRS);
    ensureBrigadeComposition(fHRHB);
    ensureBrigadeComposition(fRBiH);
    const rs = computeEquipmentMultiplier(fRS, 'attack');
    const hrhb = computeEquipmentMultiplier(fHRHB, 'attack');
    const rbih = computeEquipmentMultiplier(fRBiH, 'attack');
    expect(rs).toBeGreaterThan(hrhb);
    expect(hrhb).toBeGreaterThan(rbih);
  });

  it('zero operational condition reduces multiplier toward 1.0', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    f.composition = makeComposition({
      tanks: 40,
      artillery: 30,
      tank_condition: { operational: 0, degraded: 0.5, non_operational: 0.5 },
      artillery_condition: { operational: 0, degraded: 0.5, non_operational: 0.5 }
    });
    const mult = computeEquipmentMultiplier(f, 'attack');
    expect(mult).toBeCloseTo(1.0, 1);
  });
});

describe('degradeEquipment', () => {
  it('reduces operational percentage after one turn', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    ensureBrigadeComposition(f);
    const before = f.composition!.tank_condition.operational;
    degradeEquipment(f, 'attack', 0.5);
    expect(f.composition!.tank_condition.operational).toBeLessThan(before);
  });

  it('attack posture degrades faster than defend', () => {
    const f1 = makeFormation('rs1', 'RS', 'hq1');
    const f2 = makeFormation('rs2', 'RS', 'hq2');
    ensureBrigadeComposition(f1);
    ensureBrigadeComposition(f2);

    degradeEquipment(f1, 'attack', 0.5);
    degradeEquipment(f2, 'defend', 0.5);

    expect(f1.composition!.tank_condition.operational)
      .toBeLessThan(f2.composition!.tank_condition.operational);
  });

  it('higher maintenance capacity slows degradation', () => {
    const f1 = makeFormation('rs1', 'RS', 'hq1');
    const f2 = makeFormation('rs2', 'RS', 'hq2');
    ensureBrigadeComposition(f1);
    ensureBrigadeComposition(f2);

    degradeEquipment(f1, 'attack', 0.2); // low maintenance
    degradeEquipment(f2, 'attack', 1.0); // high maintenance

    expect(f2.composition!.tank_condition.operational)
      .toBeGreaterThan(f1.composition!.tank_condition.operational);
  });

  it('does nothing if composition is missing', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    // no composition set, no ensureBrigadeComposition called
    expect(() => degradeEquipment(f, 'attack', 0.5)).not.toThrow();
  });

  it('condition values remain in [0,1] after degradation', () => {
    const f = makeFormation('rs1', 'RS', 'hq1');
    ensureBrigadeComposition(f);
    for (let i = 0; i < 50; i++) {
      degradeEquipment(f, 'attack', 0.0);
    }
    const tc = f.composition!.tank_condition;
    expect(tc.operational).toBeGreaterThanOrEqual(0);
    expect(tc.operational).toBeLessThanOrEqual(1);
    expect(tc.degraded).toBeGreaterThanOrEqual(0);
    expect(tc.degraded).toBeLessThanOrEqual(1);
    expect(tc.non_operational).toBeGreaterThanOrEqual(0);
    expect(tc.non_operational).toBeLessThanOrEqual(1);
  });
});

describe('captureEquipment', () => {
  it('transfers equipment from loser to winner', () => {
    const loser = makeFormation('rs1', 'RS', 'hq1');
    const winner = makeFormation('rbih1', 'RBiH', 'hq2');
    loser.composition = makeComposition({ tanks: 40, artillery: 30 });
    winner.composition = makeComposition({ tanks: 3, artillery: 8, infantry: 950 });

    const loserTanksBefore = loser.composition.tanks;
    const winnerTanksBefore = winner.composition.tanks;

    captureEquipment(loser, winner, 1); // AoR size 1 maximizes per-settlement rate

    expect(loser.composition.tanks).toBeLessThan(loserTanksBefore);
    expect(winner.composition.tanks).toBeGreaterThan(winnerTanksBefore);
  });

  it('captured equipment arrives degraded (reduced operational)', () => {
    const loser = makeFormation('rs1', 'RS', 'hq1');
    const winner = makeFormation('rbih1', 'RBiH', 'hq2');
    loser.composition = makeComposition({ tanks: 40, artillery: 30 });
    winner.composition = makeComposition({
      tanks: 3, artillery: 8, infantry: 950,
      tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
      artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 }
    });

    const opBefore = winner.composition.tank_condition.operational;
    const degBefore = winner.composition.tank_condition.degraded;

    captureEquipment(loser, winner, 1);

    // Captured equipment increases degraded fraction
    expect(winner.composition.tank_condition.degraded).toBeGreaterThan(degBefore);
  });

  it('capture rate scales with AoR size (larger AoR = less capture per settlement)', () => {
    const loser1 = makeFormation('rs1', 'RS', 'hq1');
    const winner1 = makeFormation('rbih1', 'RBiH', 'hq2');
    loser1.composition = makeComposition({ tanks: 100 });
    winner1.composition = makeComposition({ tanks: 5, infantry: 950 });

    const loser2 = makeFormation('rs2', 'RS', 'hq3');
    const winner2 = makeFormation('rbih2', 'RBiH', 'hq4');
    loser2.composition = makeComposition({ tanks: 100 });
    winner2.composition = makeComposition({ tanks: 5, infantry: 950 });

    captureEquipment(loser1, winner1, 1);  // small AoR
    captureEquipment(loser2, winner2, 20); // large AoR

    const captured1 = winner1.composition.tanks - 5;
    const captured2 = winner2.composition.tanks - 5;
    expect(captured1).toBeGreaterThanOrEqual(captured2);
  });

  it('does nothing if either formation has no composition', () => {
    const loser = makeFormation('rs1', 'RS', 'hq1');
    const winner = makeFormation('rbih1', 'RBiH', 'hq2');
    // No compositions set
    expect(() => captureEquipment(loser, winner, 5)).not.toThrow();
  });

  it('total tank count is conserved (loser loss = winner gain)', () => {
    const loser = makeFormation('rs1', 'RS', 'hq1');
    const winner = makeFormation('rbih1', 'RBiH', 'hq2');
    loser.composition = makeComposition({ tanks: 40 });
    winner.composition = makeComposition({ tanks: 3, infantry: 950 });

    const totalBefore = loser.composition.tanks + winner.composition.tanks;
    captureEquipment(loser, winner, 1);
    const totalAfter = loser.composition.tanks + winner.composition.tanks;

    expect(totalAfter).toBe(totalBefore);
  });
});
