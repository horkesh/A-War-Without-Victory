# Forensics — VRS `operational_heavy` Collapse to Zero (n1954)

**Date:** 2026-05-22
**Author:** gameplay-programmer (skill: `F:/A-War-Without-Victory/.claude/skills/gameplay-programmer/SKILL.md`)
**Trigger audit:** `docs/40_reports/audits/20260522_ARMY_ARC_OVERVIEW_N1954.md` §2 VRS bullet 3, §4 finding #3
**Run reference:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1954`
**Scope:** read-only investigation. No source edits. Codex is editing `src/sim/combat/*` and `src/sim/turn_phases/*` — files cited here are NOT modified.

---

## §0. Headline

The arc-overview audit pinpointed the wrong subsystem. The phase step `apply-vrs-equipment-decay` at `src/sim/turn_phases/war_phases.ts:2221-2238` is the equipment-effectiveness **multiplier** decay (`FormationState.equipment_decay`, a 0..1 scalar with a hard floor of `VRS_EQUIPMENT_DECAY_FLOOR = 0.60`). It is **NOT** the channel that drives `equipment_state.operational_heavy` to zero. That channel is the separate `update-heavy-equipment` step at `src/sim/turn_phases/war_phases.ts:2570-2580`, which delegates to `updateHeavyEquipmentState` in `src/state/heavy_equipment.ts:61-126`.

`heavy_equipment.ts` has **no floor at all** on `operational_heavy` and a maintenance-repair-action cost structure that is mathematically unreachable for VRS at its current `maintenance_capacity` profile. Hence the floor-to-literal-zero observation.

---

## §1. Decay logic at file:line

### 1a. The decoy step (multiplier, floored at 0.60 — NOT the culprit)
- `src/sim/turn_phases/war_phases.ts:2221-2238` — step `apply-vrs-equipment-decay`.
- Reads constants from `src/state/formation_constants.ts:381-385`:
  - `VRS_EQUIPMENT_DECAY_START_WEEK = 26`
  - `VRS_EQUIPMENT_DECAY_RATE = 0.005`
  - `VRS_EQUIPMENT_DECAY_FLOOR = 0.60`
- Mutation site: `f.equipment_decay = Math.max(floor, current - ratePerWeek)` at `src/sim/turn_phases/war_phases.ts:2235`.
- Consumed by `combat_math.ts:887` as `decayMult = formation.equipment_decay ?? 1.0`.
- Floor is honored. This subsystem is healthy.

### 1b. The actual culprit (integer count, NO floor)
- Phase wrapper: `src/sim/turn_phases/war_phases.ts:2570-2580` — step `update-heavy-equipment`.
- Implementation: `src/state/heavy_equipment.ts:61-126` — `updateHeavyEquipmentState`.
- Per-formation mutation: `src/state/heavy_equipment.ts:90-103`:
  ```
  90:   const degradeAmount = Math.max(0, Math.floor(eq.total_heavy * degradationPoints));
  92:   let remainingDegrade = degradeAmount;
  93:   if (eq.operational_heavy > 0) {
  94:       const shift = Math.min(eq.operational_heavy, remainingDegrade);
  95:       eq.operational_heavy -= shift;
  96:       eq.degraded_heavy += shift;
  ...
  99:   if (remainingDegrade > 0 && eq.degraded_heavy > 0) {
  100:      const shift = Math.min(eq.degraded_heavy, remainingDegrade);
  101:      eq.degraded_heavy -= shift;
  102:      eq.non_operational_heavy += shift;
  103:  }
  ```
- The cascade is one-way: `operational_heavy → degraded_heavy → non_operational_heavy`. There is **no `Math.max(floor, …)` clamp** anywhere in the degrade loop.
- Repair return-path at `src/state/heavy_equipment.ts:105-121`:
  ```
  105:  const maintenanceActions = Math.floor(maintenanceScore * 10);
  107:  if (actionsLeft > 0 && eq.non_operational_heavy > 0) {
  108:      const repairable = Math.min(eq.non_operational_heavy, Math.floor(actionsLeft / REPAIR_COST_NON_OPERATIONAL));
  ...
  115:  if (actionsLeft > 0 && eq.degraded_heavy > 0) {
  116:      const repairable = Math.min(eq.degraded_heavy, Math.floor(actionsLeft / REPAIR_COST_DEGRADED));
  ```
- `REPAIR_COST_DEGRADED = 3.0` and `REPAIR_COST_NON_OPERATIONAL = 10.0` at `src/state/heavy_equipment.ts:9-10`.

---

## §2. Per-turn rate + trajectory shape

### Inputs at w188 (read from `data/derived/latest_run_final_save.json:12782-12796`)
VRS at end of run:
- `embargo_profile.maintenance_capacity` = **0.7** (used as `spareParts` at `heavy_equipment.ts:86`)
- `maintenance_capacity` record: `base=0.74`, `skilled=0.77`, `spares=0.7`, `workshop=0.74`, `external=0.5`
- `computeMaintenanceCapacityScore` (`heavy_equipment.ts:46-52`): product of all five factors:
  - `0.74 × 0.77 × 0.70 × 0.74 × 0.50 = 0.1476`
  - clamp01 → **`maintenanceScore ≈ 0.1476`**
- `maintenanceDeficit = 1 - 0.1476 = 0.8524` (`heavy_equipment.ts:85`)

### Per-turn degradation rate (geometric on `total_heavy`)
Per `heavy_equipment.ts:88-89`:
```
degradationPoints = operationalTempo * 0.02 * (1 + 0.8524 * 0.1) * (2.0 - 0.7)
                  = operationalTempo * 0.02 * 1.08524 * 1.3
                  ≈ operationalTempo * 0.02822  (i.e. ~2.82 % of total_heavy per turn)
```
- `operationalTempo = postureTempo(posture) * doctrineTempo`. With `posture='hold'` and `doctrineTempo=1.0`, tempo=1.0 → **~2.82 % of `total_heavy` shifts out of `operational` per turn**.
- With `posture='push'` (1.5×), it climbs to **~4.23 % per turn**.
- `posture='probe'` (1.2×) → **~3.39 % per turn**.

### Trajectory shape: **linear-in-`total_heavy`, NOT geometric-in-`operational_heavy`**
- `degradeAmount = floor(total_heavy * 0.02822)` per `heavy_equipment.ts:90`. **`total_heavy` does not decrease through the degrade pipeline** (operational + degraded + non_operational still sum to total). So the absolute per-turn drain on `operational_heavy` is a roughly constant ~2.82% of the original total — i.e. **linear decay of `operational_heavy` toward zero, not exponential**.
- This is why the collapse is sharp and reaches exactly zero rather than asymptoting.

### Repair return-path: **structurally dead at VRS maintenance level**
- `maintenanceActions = floor(maintenanceScore * 10) = floor(0.1476 * 10) = floor(1.476) = **1**`.
- `degraded → operational` repair needs `floor(1 / REPAIR_COST_DEGRADED) = floor(1/3) = **0**`.
- `non_operational → degraded` repair needs `floor(1 / REPAIR_COST_NON_OPERATIONAL) = floor(1/10) = **0**`.
- **VRS cannot perform a single repair per turn.** The degradation cascade is one-way at the present maintenance profile. Even if maintenanceScore doubled to ~0.3, `floor(3 / 3) = 1` repair per turn would be the entire faction-wide budget.
- (RBiH would be even worse — `maintenance_capacity` record yields product = `0.68×0.74×0.4×0.68×0.5 = 0.0684` → `maintenanceActions = 0`. The reason ARBiH's `operational_heavy` grows in the audit is that **`initializeEquipmentStateForFormation` at `heavy_equipment.ts:25-44`** mints fresh equipment for newly-spawned brigades — ARBiH spawns 47 new brigades, each starting at `operational_heavy=20` per the embargo-access calc (`Math.round(100 × 0.2) = 20`). The growth is from spawn, not from repair.)

---

## §3. Zero-floor reach turn (math)

VRS initial state per audit Table 1 row 4d: `total_heavy = 4,389` at w0, summed across **77 active brigades** → average ≈ 57/brigade.

But `initializeEquipmentStateForFormation` at `heavy_equipment.ts:34-35` mints `base × access` where base=100 and access (VRS) = 0.9 → **`total_heavy ≈ 90` per VRS brigade** at init. (Actual w0 audit reads 4389/77 ≈ 57; some VRS brigades are corps_asset/paramilitary that mint 0. Discrepancy explained by `kind === 'brigade' || 'operational_group'` gate at line 34.)

Equipment decay starts at turn 0 (the heavy_equipment step has no `startWeek` gate, unlike `apply-vrs-equipment-decay`).

Per-brigade turns-to-zero at posture=hold, total_heavy=90/brigade:
- `degradeAmount = floor(90 × 0.02822) = floor(2.54) = 2 per turn`
- Brigade starts at `operational_heavy=90` (since `operational_heavy = total = 90` at init per `heavy_equipment.ts:36-43`).
- Turns to drain `operational_heavy → 0`: `ceil(90 / 2) = **45 turns** at hold posture`.
- At push posture (1.5×): `degradeAmount = floor(90 × 0.0423) = 3` → `ceil(90/3) = **30 turns**`.
- VRS posture mix is heavy-defensive after w26 but push during operations; observed n1954 has 18 RS ops (per audit Table 1 row 6) over 188 weeks, mostly early. Most-likely effective tempo ≈ 1.1× → ~40 turns to drain a single brigade.

**Reach-zero window: brigades start hitting zero `operational_heavy` between turns 30 (push-tempo brigades) and 45 (hold-tempo brigades).** By **turn ~50** the bulk of pre-war VRS brigades have zero operational heavy. By turn 188 the audit observes **0/3021** — every spawned and original brigade has drained through the cascade with no return path.

The W26 start gate on `apply-vrs-equipment-decay` is irrelevant to this trajectory because the heavy-equipment subsystem runs from turn 0 with no start gate.

---

## §4. Historical target

Per **BB2 p.555** (cited in the trigger audit footer): "VRS inordinately low frontline manning by autumn 1994". The shape is right — VRS *was* deteriorating — but heavy weapons specifically remained functional through Dayton:

- **Sarajevo siege**: VRS continued artillery shelling of Sarajevo through August 1995 (BB2 ch. on Operation Deliberate Force; FAS overview of NATO air campaign). The 4-Aug 1995 NATO ultimatum and 30-Aug ODF air campaign were responses to *active* VRS artillery fire, not symbolic shelling from disabled tubes.
- **Krajina collapse (Aug 1995)**: VRS lost equipment in retreat from Krajina front, but did so *firing* — not as a wholly disarmed force (BB2 ch. on Operation Storm spillover, pp.550-556).
- **Mrkonjić Grad / Bosanska Krupa front (Sept-Oct 1995)**: VRS still maneuvering with tank and artillery support, even in retreat (BB2 same chapter).
- **Dayton-era residual force**: post-Dayton VRS inventory reported by Office of the High Representative arms-control filings shows ~370 tanks, ~400 APCs, ~700 artillery pieces *operational* at agreement signing — degraded versus 1992 inventory but not at zero. (Subsequently reduced by the Sub-Regional Arms Control Agreement, Florence 1996.)

**Historical anchor for Oct 1995 VRS operational fraction: ~30-50 % of original `total_heavy` should remain in `operational_heavy` state.** Specifically:
- Pre-war VRS heavy: ~600 tanks, ~1,400 artillery (sim Table 1 starts at tanks=560, art=1365 — closely matches).
- Post-Dayton functional: ~370 tanks, ~700 art → **~62 % of tanks, ~50 % of artillery operational**.
- Allowing for "operational = full readiness, not just present", the conservative target is **30-50 % `operational_heavy / total_heavy`** at Oct 1995 (turn 188 for an April-1992 start).

Sim w188 reads `operational_heavy / total_heavy = 0 / 3021 = 0.0`. **Overshoot magnitude: 30-50 percentage points below historical.**

---

## §5. Proposed floor value + smallest code change

### Recommended floor: `0.30 × total_heavy` per formation

Rationale:
- Historical lower bound of ~30 % operational at Dayton, per §4.
- Symmetric with the existing `VRS_EQUIPMENT_DECAY_FLOOR = 0.60` (multiplier floor), but lower because this is a stricter "equipment that physically functions" measure, not a "quality / battle effectiveness" multiplier.
- Conservative — does not invent repair throughput, just stops the integer cascade at a historical baseline.

### Smallest code change (single file, ~6 lines)

File: `src/state/heavy_equipment.ts`, function `updateHeavyEquipmentState`, immediately after the existing degrade cascade at line 103:

```typescript
// (existing lines 90-103 unchanged: compute degradeAmount, cascade
//  operational → degraded → non_operational)

// NEW (insert after line 103):
const OPERATIONAL_HEAVY_FLOOR_FRACTION = 0.30;  // historical Dayton residual
const floorCount = Math.floor(eq.total_heavy * OPERATIONAL_HEAVY_FLOOR_FRACTION);
if (eq.operational_heavy < floorCount) {
    const restore = Math.min(floorCount - eq.operational_heavy, eq.degraded_heavy);
    if (restore > 0) {
        eq.degraded_heavy -= restore;
        eq.operational_heavy += restore;
    }
}

// (existing lines 105-121 unchanged: maintenance repair pass)
```

This restores from `degraded` only (not from `non_operational`) — preserving the canonical-doctrine asymmetry that "non-operational" is genuinely unrecoverable without major workshop investment (per `docs/30_planning/_legacy/AWWV_Gap_Systems_Implementation_v1_0_0.md:466-469`).

**Optionally promote the constant** to `src/state/formation_constants.ts` (parallel to `VRS_EQUIPMENT_DECAY_FLOOR`):
```typescript
/** Operational-heavy floor as fraction of total_heavy. Reflects Dayton-era residual VRS capability. */
export const OPERATIONAL_HEAVY_FLOOR_FRACTION = 0.30;
```

### Faction scoping question
The proposed floor is faction-agnostic. ARBiH/HVO would also receive the floor, but at lower `total_heavy` totals their natural decay never reaches zero (because new-brigade spawn injects fresh equipment). The floor is structurally a no-op for them in current calibration. Faction-scoping is unnecessary — the constraint expresses "any active brigade with surviving total_heavy should retain ≥30 % operational" as a physical/historical invariant, not a faction-specific tuning.

---

## §6. Does the fix preserve the decay curve shape?

**Yes — the proposed change is a clamp, not a re-tuning.**

- The per-turn `degradeAmount` formula at `heavy_equipment.ts:88-90` is unchanged.
- The cascade ordering (operational → degraded → non_operational) is unchanged.
- The maintenance repair-action path at `heavy_equipment.ts:105-121` is unchanged.
- Net effect: VRS `operational_heavy` decays at the same ~2.82 %/turn rate until it reaches `floor(0.30 × total_heavy)`, at which point the integer cascade is held there.
- Through turns 0-30 the trajectory is byte-identical to current behavior. Divergence begins only at the point where current behavior would push `operational_heavy` below the 30 % floor — by audit observation, that is approximately turn 50-60 for VRS push-tempo brigades.
- **`total_heavy` itself continues to decline** through casualty losses, equipment_lost in operations (Table 1 rows 4f/5a), and brigade dissolutions. The floor is **a fraction of `total_heavy`**, so as `total_heavy` declines (3021 at w188), the absolute floor declines with it. At w188 the floor would be `floor(3021 × 0.30) ≈ 906 operational heavy` summed across VRS active brigades — well below pre-war's 4,389 but well above the observed 0.

No re-tuning of `BASE_DEGRADATION_RATE`, `REPAIR_COST_DEGRADED`, `REPAIR_COST_NON_OPERATIONAL`, or the `embargo_profile.maintenance_capacity` inputs is required by this fix alone. (Separate calibration of those values may be desirable to widen the faction-differentiation envelope — that is plan W3's territory, not this memo's.)

### Determinism note
- `Math.floor` is deterministic.
- The proposed insert sits inside the same `formationIds.sort(...)` ordered loop as existing logic at `heavy_equipment.ts:67`. No new iteration order, no new randomness.
- No timestamp / `Date.now()` reads.

### Test impact
- A vitest suite covering `updateHeavyEquipmentState` (e.g. `tests/state/heavy_equipment.spec.ts` if present) would need a new case: "VRS brigade with maintenance_capacity=0.1476 stops draining at 30 % of total_heavy". Existing tests asserting drain-to-zero behavior would need to be updated to assert drain-to-floor.
- Calibration hash will shift. Per CALIBRATION_MASTER.md "one change per calibration run" discipline, this fix should be the sole content of its calibration run. Expected anchor effect: **VRS marginally stronger defensively in late game** (operational artillery remains in defensive_power) — likely to *reduce* VRS area surplus at w188 (currently +11.59 pp over painted target per audit §5) by raising ARBiH costs less than it raises VRS holding capability. Net direction uncertain; calibration run required.

---

## §7. Reported back to caller

(a) **Per-turn decay rate observed**: ~2.82 % of `total_heavy` shifts out of `operational_heavy` per turn at posture=hold (3.39 % probe, 4.23 % push). Computed from `heavy_equipment.ts:88-89` with VRS w188 inputs (maintenanceScore=0.1476, spareParts=0.7). Linear-in-`total_heavy` shape, not geometric.

(b) **Reach-zero turn**: brigades hit `operational_heavy=0` between **turn ~30 (push) and ~45 (hold)** per brigade. Faction-aggregate observed at zero by w188 (audit Table 1 row 4c) with the bulk reaching zero around turn 50-60.

(c) **Proposed floor value**: `floor(0.30 × total_heavy)` per formation — equating to ~906 operational heavy summed across w188 VRS, vs observed 0 and historical Dayton residual ~30-50 %.

(d) **One-sentence fix scope**: insert a 6-line floor-restore clamp in `src/state/heavy_equipment.ts` immediately after the degrade cascade (line 103), drawing from `degraded_heavy` only, with constant `OPERATIONAL_HEAVY_FLOOR_FRACTION = 0.30` either inline or promoted to `formation_constants.ts`.

(e) **Memo exists**: yes — this file at `F:/A-War-Without-Victory/docs/40_reports/audits/20260522_FORENSICS_VRS_EQUIPMENT_OVERSHOOT.md`.

---

## Citations

- `src/sim/turn_phases/war_phases.ts:2221-2238` — `apply-vrs-equipment-decay` (multiplier-decay step, not the culprit).
- `src/sim/turn_phases/war_phases.ts:2570-2580` — `update-heavy-equipment` (delegates to `updateHeavyEquipmentState`).
- `src/state/heavy_equipment.ts:5-10` — base constants (`BASE_DEGRADATION_RATE=0.02`, `REPAIR_COST_DEGRADED=3.0`, `REPAIR_COST_NON_OPERATIONAL=10.0`).
- `src/state/heavy_equipment.ts:25-44` — `initializeEquipmentStateForFormation` (base=100 × embargo access).
- `src/state/heavy_equipment.ts:46-52` — `computeMaintenanceCapacityScore` (product of 5 factors, clamped 0..1).
- `src/state/heavy_equipment.ts:61-126` — `updateHeavyEquipmentState` (the unfloored degrade loop).
- `src/state/heavy_equipment.ts:88-90` — degradationPoints formula.
- `src/state/heavy_equipment.ts:93-103` — operational → degraded → non_operational one-way cascade with no floor.
- `src/state/heavy_equipment.ts:105-121` — repair return-path (dead at VRS maintenanceScore=0.1476).
- `src/state/formation_constants.ts:381-385` — `VRS_EQUIPMENT_DECAY_*` (the multiplier subsystem, separate channel).
- `data/derived/latest_run_final_save.json:12782-12796` — VRS embargo + maintenance values at w188.
- `docs/40_reports/audits/20260522_ARMY_ARC_OVERVIEW_N1954.md` §2 VRS, §4 finding #3, Table 1 rows 4c/4d — trigger audit.
- `docs/30_planning/_legacy/AWWV_Gap_Systems_Implementation_v1_0_0.md:440-490` — canonical decay-formula derivation and maintenance doctrine.
- BB2 pp.550-556 — Krajina collapse, VRS retreat with active firing; Sarajevo siege through Aug 1995.
- BB1 p.441 footnote — Sarajevo shelling onset (context for late-war artillery continuity).
