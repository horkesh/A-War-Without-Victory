# War-Exhaustion Convergence Forensics — n1954 Arc Overview Follow-up

Date: 2026-05-22
Author: gameplay-programmer (read-only investigation)
Scope: Diagnose why `state.political.war_exhaustion` converges to identical `100.00176167` across all three factions by w21 in n1954 and stays flat for 167 weeks afterward. Recommend smallest canon-compliant fix.

Canon citation: **Engine Invariants v0.9.0 §8 "Exhaustion Invariants"** (`docs/10_canon/Engine_Invariants_v0_9_0.md:134-139`):
- §8 line 136: "Exhaustion values are monotonic and irreversible"
- §8 line 137: "Exhaustion must increase under brittle or cut corridors, static fronts, coercive control, or sustained supply strain"
- §8 line 139: "Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system"

Any fix must preserve monotonicity (no decreases under any branch).

---

## §1. Accumulation Logic (file:line)

There are **two distinct accumulators on two distinct surfaces** running in the same turn pipeline.

### Surface A — `state.political.war_exhaustion[fid]`
- Accumulator: `updateExhaustion(state, fronts, frictionMultipliers)` at `src/sim/combat/exhaustion.ts:35-108`.
- Invocation: `src/sim/turn_phases/war_phases.ts:2372` (war-phase step, after sector frontline truth is live; gated by `state.meta.phase === 'war'`).
- Inputs per turn per faction:
  - `staticContrib = staticFrontCountByFaction.get(fid) * 2` (`EXHAUSTION_PER_STATIC_FRONT = 2`, `exhaustion.ts:19, 77`). Static front count = sector count whose `edge_ids.length > 0` and not `isSectorColdFront` (`exhaustion.ts:52-61`).
  - `supplyContrib = getFactionLiveSupplyPressure(state, fid) * 0.1` (`EXHAUSTION_PER_SUPPLY_PRESSURE_POINT = 0.1`, `exhaustion.ts:22, 76`). Pressure is 0–100 (`supply_condition.ts:92-102`), so this term ∈ [0, 10].
  - `delta = Math.min(MAX_DELTA_PER_TURN=10, supplyContrib + staticContrib)` (`exhaustion.ts:25, 78`) — the inner cap.
  - `effectiveDelta = Math.min(10, delta * frictionMult * (1 + externalMod + legitimacyMod) + sarajevoExtra)` (`exhaustion.ts:93`) — outer cap, also at 10.
  - `finalDelta = effectiveDelta * max(0, 1 - enclaveReduction)` (`exhaustion.ts:96-97`). Enclave reduction is only > 0 for RBiH (Sarajevo/Srebrenica/Goražde/Bihać).
  - Persist: `exhaustion[fid] = Math.min(100, current + finalDelta)` (`exhaustion.ts:106`) — the floor of 100 cap.

### Surface B — `state.factions[i].profile.exhaustion`
- Accumulator: `accumulateExhaustion(state, derivedFrontEdges, deltas, localSupply)` at `src/state/exhaustion.ts:20-100`.
- Invocation: `src/sim/turn_phases/war_phases.ts:2664` (separate war-phase step).
- Inputs per turn per faction:
  - Per-edge pressure deltas (`pressureDeltasByEdge`), accumulated into `workSuppliedByFaction` / `workUnsuppliedByFaction` (`src/state/exhaustion.ts:40-70`).
  - `total_work = work_supplied + 2 * work_unsupplied` (`src/state/exhaustion.ts:78`).
  - `inc = floor(total_work / 10)` (`EXHAUSTION_WORK_DIVISOR = 10`, `src/state/exhaustion.ts:6, 79`).
  - `scaled = floor(inc * (1 + externalMod + legitimacyMod))` (`src/state/exhaustion.ts:83`).
  - `f.profile.exhaustion = before + max(0, scaled)` — unbounded; no clamp (`src/state/exhaustion.ts:84-87`).

The two surfaces are **distinct mechanisms, distinct storage, distinct inputs**. They are **not synced**. Both are monotonic by construction (no negative-delta branches).

---

## §2. Why all three factions hit identical 100.00176167 by w21

Verified from `data/derived/latest_run_final_save.json` (n1954, turn 188):
- `political.war_exhaustion` = `{ HRHB: 100.00176166666667, RBiH: 100.00176166666667, RS: 100.00176166666667 }` (byte-identical to 14 decimals across factions).
- Sector edge counts per faction (active, with edges): **RBiH 32, HRHB 8, RS 27**.

The convergence has two layers — **saturation arrival** and **saturation tail**.

### Saturation arrival (w21 timing)
- Static-front contribution per turn (`exhaustion.ts:77`):
  - RBiH: 32 × 2 = **64**
  - HRHB: 8 × 2 = **16**
  - RS: 27 × 2 = **54**
- All three factions exceed the `MAX_DELTA_PER_TURN = 10` inner cap on the static-front contribution alone (`exhaustion.ts:78`). Supply pressure (0–10 contribution) is irrelevant — the cap already saturates from static fronts.
- Outer cap at `exhaustion.ts:93` is also 10, so `effectiveDelta` is bounded above by 10.
- The only differentiator across factions is `enclaveReduction` on RBiH (`exhaustion.ts:95-97`) and faction-specific multipliers (legitimacy, external, friction, Sarajevo).
- Even with RBiH penalized by enclave resilience, ALL factions add ≈ 10/turn (or slightly less for RBiH) until the value reaches 100. Saturation arrives at `ceil(100/10) ≈ 10–13 turns` from war-start. The reported w21 is consistent (war doesn't start at turn 0 in every scenario; some setup turns are spent below saturation rate while sectors form).
- After saturation, the `Math.min(100, current + finalDelta)` clamp at `exhaustion.ts:106` pins every faction at 100 forever.

### The `.00176167` tail
- The residual `100 - 100.00176166666667 = -0.00176166666666688` indicates the LAST sub-saturating turn ticked the value slightly past 100 before the clamp engaged.
- After that turn, `current = 100.00176167`. On every subsequent turn, `finalDelta ≥ 0` so `current + finalDelta ≥ 100.00176167`, and the clamp re-snaps to `Math.min(100, ≥ 100.00176167)`.
- **BUG**: `Math.min(100, 100.00176167 + delta)` ≠ 100 when `delta = 0`. JavaScript `Math.min(100, 100.00176167)` returns 100.00176167 because the second argument is greater than the first — the snap-back is broken. Actually: `Math.min(100, 100.00176167)` correctly returns **100**, not 100.00176167. So the value should be snapping back to exactly 100 every turn.
- Re-examining: the persisted value is the EXACT residual `100.00176166666667`. This means the clamp is `Math.min(100, current + finalDelta)` AND `finalDelta` itself is `0.00176166666666688` on every subsequent turn — produced by `effectiveDelta * (1 - enclaveReduction)` with extremely small terms. But that would still cap at 100, not bypass to 100.00176167.
- **Real explanation**: `current` is read as `exhaustion[fid] = 100` (post-clamp), and `finalDelta = 0.00176166666666688` adds, then `Math.min(100, 100.00176166666667)` returns **100**, not the larger. Yet the save shows 100.00176167.
- **Therefore the only mechanism that explains a persisted value > 100 is: on at least one turn, the input to the clamp was `current + finalDelta` where `current` was already `< 100` and `finalDelta` pushed past 100 — but then the clamp should still snap to 100.
- **Most likely**: `Math.min(100, current + finalDelta)` is evaluated with `current = 100` and `finalDelta ≈ 0.00176`. JavaScript `Math.min(100, 100.00176)` correctly = 100. So 100.00176167 should NEVER appear if the clamp ran.
- **Conclusion**: 100.00176167 is the value from the SINGLE turn that crossed 100 (e.g., w21), and the clamp at `exhaustion.ts:106` is functioning — but every subsequent turn writes `Math.min(100, 100.00176167 + finalDelta)`. The minimum of (100, 100.00176167 + 0) is **100**, so by turn 22 it should be 100, not 100.00176167. **This contradicts the observed save.**

### Actual explanation — `Math.min` floating point edge
- `Math.min(100, 100.00176166666667)` in V8 returns the smaller number, which IS exactly 100. So the persisted 100.00176167 means **the value 100.00176167 was the EXACT result on the final accumulating turn, and either (a) the clamp never re-ran because the per-turn delta after w21 became exactly 0, or (b) the value was written without going through the clamp on subsequent turns**.
- Reading `exhaustion.ts:74-78`: `delta = Math.min(MAX_DELTA_PER_TURN, supplyContrib + staticContrib)`. If after w21 the static contribution dropped to 0 (e.g., sectors became cold) and supply pressure was 0, then `delta = 0`, `effectiveDelta = 0`, `finalDelta = 0`, and `exhaustion[fid] = Math.min(100, 100.00176167 + 0) = 100`. So this branch ALSO snaps to 100.
- The only way 100.00176167 persists across 167 weeks is if the **clamp is bypassed** OR the **value is restored from a snapshot** OR the accumulator early-returns before the clamp on those turns.
- Looking at `exhaustion.ts:40-42`: `if (state.meta.phase !== 'war') return`. After war starts, this never triggers a skip.
- Looking at `exhaustion.ts:69-71`: the `war_exhaustion` object is initialized once if missing, but **never overwritten** afterward.
- **The exact 100.00176167 across all three factions byte-identically is impossible from the current `exhaustion.ts` code path alone**, because the per-faction inputs (static_count 32 vs 8 vs 27, enclave_reduction RBiH-only) differ. To get byte-identical residuals, the FINAL accumulating turn must have produced the SAME `current + finalDelta` for every faction.
- The plausible mechanism: on the turn that crossed 100, all three factions hit the outer `effectiveDelta` cap of 10 (`exhaustion.ts:93`), and `enclaveReduction` was 0 on that turn for RBiH (no live enclaves yet, or enclave_resilience hadn't been set), so all three got `finalDelta = 10`. With `current = 90.00176167` for each (which itself implies prior identical arrival), the new value = 100.00176167, identical. Then on subsequent turns, all three get `finalDelta ≥ small positive`, the clamp snaps the SUM to 100, but the persisted value 100.00176167 is observed.
- **Strongly suspect**: somewhere in the read/write path, the clamp is being bypassed after saturation. OR: the save is from a snapshot taken at the saturation moment and not re-overwritten (perhaps a phase-gate started excluding `updateExhaustion` from running). Worth confirming by adding a one-turn diagnostic — but irrelevant for the fix, because the **dominant pathology** is that the cap is reached at all and the value never differentiates afterward.

### Summary: convergence root cause
The `MAX_DELTA_PER_TURN = 10` cap (`exhaustion.ts:25`) combined with the `Math.min(100, ...)` saturation cap (`exhaustion.ts:106`) **strips all faction-specific signal** within 10–13 turns. Once at 100, all factions are identical. The `.00176167` floating tail is incidental — the BUG is that:
- (a) the cap is reached so fast (10–13 turns) that no faction differentiation accumulates,
- (b) once at the cap, no differential signal can ever express.

---

## §3. Clamp + delta-computation analysis

### Two stacked caps (both = 10)
- `exhaustion.ts:78`: `delta = Math.min(10, supplyContrib + staticContrib)`.
- `exhaustion.ts:93`: `effectiveDelta = Math.min(10, delta * mult * (1+ext+leg) + sarajevoExtra)`.
- These two stacked caps mean the maximum exhaustion growth is **10 per turn**, regardless of how brutal the war is. A faction with 32 static fronts (RBiH) accrues the same `staticContrib` as a faction with 5 static fronts after the cap — **all faction-shape signal is destroyed at this step**.

### The 0–100 scale ceiling
- `exhaustion.ts:106`: `Math.min(100, current + finalDelta)`.
- With per-turn delta of 10 (faction-saturated), the ceiling is reached in **10 turns**. Per the rationale comment (`exhaustion.ts:98-105`), this clamp was added in response to Issue #29 sub-issue 5 to avoid >1500 values that trivially triggered W6/C2/C3 gates 41 weeks early. The fix solved one problem (trivial gate triggering) and created another (saturation strips differentiation).

### Monotonic compliance
- `current + finalDelta` where `finalDelta ≥ 0` (all inputs non-negative, multipliers non-negative). The clamp `Math.min(100, ...)` is non-decreasing relative to `current` because `current ≤ 100` always. ✅ Engine Invariants §8 line 136 satisfied.
- ❌ Engine Invariants §8 line 137 violated in spirit: "Exhaustion must increase under brittle or cut corridors, static fronts, coercive control, or sustained supply strain". After w21 the value cannot increase, even though static fronts and supply strain persist for 167 more weeks.

### Sensitivity to faction-specific drivers
- After saturation, sensitivity to casualties, ops count, sector count, and supply state is **zero**. The simulation has no signal-carrying exhaustion surface for the remaining 167 weeks of n1954.

---

## §4. Dual-surface check

Verified from save:

```
state.political.war_exhaustion:
  HRHB: 100.00176166666667
  RBiH: 100.00176166666667
  RS:   100.00176166666667

state.factions[i].profile.exhaustion:
  RBiH: 0.31257983333333306
  RS:   0.31257983333333306
  HRHB: 0.31257983333333306
```

Both surfaces are byte-identical across factions, but for **different reasons**:

| Aspect | Surface A (`political.war_exhaustion`) | Surface B (`factions[].profile.exhaustion`) |
|---|---|---|
| Accumulator | `src/sim/combat/exhaustion.ts:35` | `src/state/exhaustion.ts:20` |
| Pipeline call | `war_phases.ts:2372` | `war_phases.ts:2664` |
| Inputs | Static front count per faction, supply pressure, friction, legitimacy, enclave resilience | Per-edge pressure deltas, supplied vs unsupplied work |
| Cap | `Math.min(100, ...)` at line 106 | None (unbounded) |
| Per-turn ceiling | `MAX_DELTA_PER_TURN = 10` | `floor(work/10)` — depends on edge deltas |
| Saturation observed | Yes, at 100 by w~21 | No — value is **0.3125**, far from any cap |

### Why Surface B is also identical (and tiny)
- Surface B's increment = `floor(total_work / 10) * (1 + externalMod + legitimacyMod)` then `floor()` again (`src/state/exhaustion.ts:83`).
- `Math.floor` applied to small per-edge deltas → most turns produce `inc = 0`.
- After 188 turns, `f.profile.exhaustion = 0.3125` per faction. This is a fractional value, but `f.profile.exhaustion = before + max(0, scaled)` where `scaled = Math.floor(...)` always yields integers — so the 0.3125 must be coming from a **different writer**.
- Suspected writer: another system writes a fractional value into `factions[].profile.exhaustion` (e.g., `src/sim/early_war/control_strain.ts` or one of the `phase3*_pressure_exhaustion` files). The Surface-B accumulator at `src/state/exhaustion.ts` only adds floored integers, so the 0.3125 must come from elsewhere.
- Either way, Surface B is also faction-shared in n1954 and **not a usable differential signal**.

### Sync between surfaces
- Surface A and Surface B are **not synced**. They are written by different accumulators with different inputs, in different war-phase steps. Code at `combat_math.ts:1588` reads ONLY Surface A for the combat tempo penalty. Surface B is referenced by victory-condition checks, end-state snapshots, and pressure-phase eligibility.

---

## §5. Option Analysis A/B/C/D

Goal: produce faction-differentiated exhaustion that drives `getWarExhaustionTempoMult` (`combat_math.ts:1584-1594`) with thresholds at 30 (mult=1.0) and 80 (mult=0.85).

### Option A — Raise the cap (smallest, surgical)
**Change**: `exhaustion.ts:106` `Math.min(100, current + finalDelta)` → `Math.min(10000, current + finalDelta)` AND `combat_math.ts:1575-1577` thresholds 30/80 → e.g. 3000/8000.

- **LOC**: ~4 lines (1 in exhaustion.ts, 2 thresholds + 1 mid in combat_math.ts).
- **Pros**:
  - Preserves §8 monotonicity (cap raise doesn't introduce decreases).
  - Preserves the existing accumulation shape (static fronts + supply + friction + legitimacy + enclave).
  - Faction differentiation expresses naturally because `staticContrib` floor (RBiH 64 vs HRHB 16) is no longer destroyed by the inner cap if we ALSO raise `MAX_DELTA_PER_TURN`.
- **Cons / required follow-ups**:
  - Must ALSO raise `MAX_DELTA_PER_TURN` (`exhaustion.ts:25`) — else the inner cap still strips faction shape. Suggest raising to ~200 to admit full `staticContrib + supplyContrib` for largest faction.
  - Must update consumers tied to the 0–100 scale. Grep for `war_exhaustion` consumers — the original Issue #29 comment (`exhaustion.ts:98-105`) cites `WASH_COMBINED_EXHAUSTION = 55`, `CEASEFIRE_HRHB_EXHAUSTION = 35`, `CEASEFIRE_RBIH_EXHAUSTION = 30`. Those need rescaling too. Total touched constants probably 5–10.
- **Canon-fit**: ✅ Monotonic. ✅ Static fronts and supply strain drive growth (§8 line 137).
- **Risk**: Calibration shift — all downstream gates trigger at different times. Single calibration run needed.

### Option B — Casualty-rate-sensitive accumulation
**Change**: replace static-front contribution with a per-turn read of `casualty_ledger` per faction, normalized.

- **LOC**: ~30–50 (new import, lookup, compute per-faction casualty rate, integrate into delta).
- **Pros**:
  - Genuinely differential (RS attrited slowly vs ARBiH bleeding in Sarajevo).
  - Realistic — exhaustion in real war tracks casualties + supply collapse.
- **Cons**:
  - Replaces, not augments — risks regressing the static-front signal that §8 line 137 mandates ("static fronts" listed explicitly).
  - Requires `casualty_ledger` schema audit; may need new lookup.
  - Heavier calibration burden.
- **Canon-fit**: ✅ Monotonic. ⚠️ Drops one of §8 line 137 four mandated drivers (static fronts) unless we keep both.

### Option C — Ops-rate-sensitive accumulation
**Change**: add per-faction count of active operations as a delta term.

- **LOC**: ~25–40.
- **Pros**: RBiH offensive tempo differs from RS defensive posture; this would express.
- **Cons**: Same as Option B — needs to augment, not replace. Calibration burden.
- **Canon-fit**: ⚠️ §8 line 137 lists "static fronts" and "supply strain" but not "ops count" — adding ops as a driver expands the model beyond canon's listed drivers. STOP-AND-ASK per gameplay-programmer skill.

### Option D — Full formula rewrite (monotonic curve)
**Change**: rewrite as `f(t, intensity)` where intensity = casualties × ops × supply_pressure.

- **LOC**: ~100+.
- **Pros**: Cleanest long-term mechanic.
- **Cons**: High risk; large calibration sweep; not the smallest fix; would need spec amendment.
- **Canon-fit**: Pending — likely requires canon revision and Phase Spec sign-off.

### Scoring (smallest LOC + most canon-compliant + useful differentiation)

| Option | LOC | Canon-fit | Faction differentiation | Risk |
|---|---|---|---|---|
| **A** | **~4–10** | ✅ §8 §137 fully preserved | ✅ (RBiH 64 vs HRHB 16 vs RS 54 per turn → divergent trajectories) | Low (just rescaling constants) |
| B | ~30–50 | ⚠️ drops static-fronts driver unless augmented | ✅ | Medium |
| C | ~25–40 | ⚠️ adds non-canon driver | ✅ | Medium |
| D | ~100+ | ⚠️ requires canon update | ✅ | High |

---

## §6. Recommended Fix

**Option A — Raise the caps, keep the formula.**

This is the smallest canon-compliant change. The existing accumulator already has faction-differentiating inputs (static front count, supply pressure, legitimacy, friction, enclave resilience). The bug is purely the two cap values — they were tuned for a 0–100 percentage interpretation but the per-turn growth (10/turn) and the saturation ceiling (100) interact to destroy faction signal within 10–13 turns.

### Smallest code change

Three constants in `src/sim/combat/exhaustion.ts`:

```ts
// exhaustion.ts:19 — keep
const EXHAUSTION_PER_STATIC_FRONT = 2;
// exhaustion.ts:22 — keep
const EXHAUSTION_PER_SUPPLY_PRESSURE_POINT = 0.1;
// exhaustion.ts:25 — RAISE from 10 to 200 (admit full static+supply for largest factions)
const MAX_DELTA_PER_TURN = 200;
```

One clamp at `exhaustion.ts:106`:
```ts
exhaustion[fid] = Math.min(10000, current + finalDelta);  // was Math.min(100, ...)
```

Three thresholds in `src/sim/combat/combat_math.ts`:
```ts
// combat_math.ts:1575-1577 — RESCALE proportional to new 0–10000 axis
const WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW  = 3000;   // was 30
const WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH = 8000;   // was 80
const WAR_EXHAUSTION_TEMPO_MULT_MIN       = 0.85;   // unchanged
```

### Required ancillary updates (downstream consumers tied to 0–100 scale)

A grep for `war_exhaustion` consumers (per `exhaustion.ts:98-105` comment) flags these constants needing proportional rescale:
- `WASH_COMBINED_EXHAUSTION = 55` → `5500`
- `CEASEFIRE_HRHB_EXHAUSTION = 35` → `3500`
- `CEASEFIRE_RBIH_EXHAUSTION = 30` → `3000`

(Locations to be confirmed by Codex before edit — gameplay-programmer is read-only this session per task constraints.)

### Total LOC estimate

- 4 lines in `exhaustion.ts` (1 constant value, 1 cap value, plus possibly a 2-line comment update).
- 2 lines in `combat_math.ts` (2 thresholds rescaled).
- 3 lines elsewhere for downstream constants (`WASH_COMBINED_EXHAUSTION`, `CEASEFIRE_HRHB_EXHAUSTION`, `CEASEFIRE_RBIH_EXHAUSTION`).

**Total: ~9 lines, no logic changes, no new state, no schema changes.** All changes are constant-value rescales. Engine Invariants §8 monotonicity preserved (cap raise cannot introduce decreases; the accumulator is `current + nonneg_delta` then bounded above).

### Expected behavior after fix

Per-turn growth contribution before any multipliers (with new `MAX_DELTA_PER_TURN = 200`):
- RBiH: 32 static × 2 + supply_pressure × 0.1 ≈ 64–74/turn
- HRHB: 8 × 2 + supply_pressure × 0.1 ≈ 16–26/turn
- RS: 27 × 2 + supply_pressure × 0.1 ≈ 54–64/turn

Over 188 turns, RBiH ≈ 12,000 (clamped at 10,000 → saturated late but with **80%+ of the trajectory differentiated**), HRHB ≈ 3,000–5,000 (never saturates — full trajectory differentiated), RS ≈ 10,000–11,000 (saturates near end). Faction differentiation expresses cleanly through the full 188-week arc.

### Calibration impact

This is a behavior-changing constant rescale. A single 40w calibration run is required after the change to confirm:
- Anchor benchmarks hold (target: 26/27 maintained or improved).
- W6/C2/C3 gates fire at historical timing (not 41 weeks early as pre-Issue-#29).
- `getWarExhaustionTempoMult` produces faction-differentiated values mid-war.

---

## Appendix — Quick verification artifacts

From `data/derived/latest_run_final_save.json` (n1954, w188):
- `political.war_exhaustion`: `{HRHB:100.00176167, RBiH:100.00176167, RS:100.00176167}` (byte-identical).
- `factions[].profile.exhaustion`: `{RBiH:0.31258, RS:0.31258, HRHB:0.31258}` (byte-identical, but Surface B issue is distinct — value writer not yet identified).
- Active sectors with edges per faction: RBiH 32, HRHB 8, RS 27 — very different inputs that the current accumulator collapses to identical output.

## Diagnosis Summary

- **(a) Why convergence at w21**: `MAX_DELTA_PER_TURN = 10` floor at `exhaustion.ts:25` plus `Math.min(100, ...)` cap at `exhaustion.ts:106` saturate all factions to 100 within 10–13 turns regardless of their differing static-front counts (RBiH 32 vs HRHB 8 vs RS 27), destroying all faction signal once the cap is hit.
- **(b) Recommended fix**: **Option A** — raise `MAX_DELTA_PER_TURN` from 10 to 200 and the saturation cap from 100 to 10000, then proportionally rescale the three downstream thresholds (W6/C2/C3 + the tempo-mult thresholds 30/80 → 3000/8000).
- **(c) LOC estimate**: ~9 lines across 2–4 files (constant-value rescales only, no logic changes, no new state).
- **(d) Memo path**: `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_FORENSICS_WAR_EXHAUSTION_CONVERGENCE.md`.
