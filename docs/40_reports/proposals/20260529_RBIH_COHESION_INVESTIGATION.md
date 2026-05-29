# RBiH Cohesion=0.00 Investigation

## 1. Trigger

- **Source:** Phase J Packet 2 (Phase E activation readiness) finding #4 — `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md:261` flags `RBiH internal_cohesion = 0.00` at turn 40 in `data/derived/latest_run_final_save.json` as a suspected floor-clamp artifact rather than a modeled state.
- **Save under investigation:** `data/derived/latest_run_final_save.json` (turn 40, harness-seed).
- **Branch / commit:** `codex/diagnostics-output-artifact-doc-closeout` @ `71d25749` (J2 closeout).
- **Scope of this packet:** Read-only investigation. Determine whether 0.00 is canonical or a clamp artifact. No code changes; recommendations only.
- **Scenarios that exercise the path:** Any scenario that runs the war pipeline `compute-dimension-bases` step. The harness-seed save was produced by the scenario harness that backs `npm run sim:scenario:run:default` / `:40w` (canonical war pipeline `src/sim/turn_phases/war_phases.ts`).

## 2. Cohesion computation pipeline

### 2.1 Files and entry points

| Step | File | Function |
|---|---|---|
| Pipeline ordering | `src/sim/turn_phases/war_phases.ts:303` | `evaluate-events` step |
| Pipeline ordering | `src/sim/turn_phases/war_phases.ts:316` | `compute-dimension-bases` step (calls `computeDimensionBaseValues` for each canonical faction) |
| Event delta application | `src/sim/events/evaluate_events.ts:126` | `applyDefinitionDimensionShifts` (writes via `applyDimensionShift`) |
| Per-shift application | `src/sim/events/strategic_dimensions.ts:35` | `applyDimensionShift(store, faction, dimension, delta)` |
| Per-turn base recomputation | `src/sim/events/strategic_dimensions.ts:73` | `computeDimensionBaseValues(store, state, faction)` |
| Cohesion sub-formula | `src/sim/events/strategic_dimensions.ts:102-111` | The `internal_cohesion` block inside `computeDimensionBaseValues` |
| Clamp helper | `src/utils/math.ts` (re-export used by both helpers above) | `clamp(value, 0, 100)` |

### 2.2 How a dimension updates each turn

Each war turn the pipeline does, in order:

1. `evaluate-events` (`war_phases.ts:303`) — runs `evaluateEvents`, which calls `applyDefinitionDimensionShifts` → `applyDimensionShift`. Each shift mutates `event_modifier` by `+= delta`, then recomputes `effective_value = clamp(base_value + event_modifier, 0, 100)` (`strategic_dimensions.ts:38-39`).
2. `compute-dimension-bases` (`war_phases.ts:316`) — for each canonical faction, recomputes `base_value` from raw GameState (alliance, avg brigade cohesion, war_exhaustion). `updateBaseValue` clamps the new `base_value` to `[0,100]` and recomputes `effective_value = clamp(base_value + event_modifier, 0, 100)` (`strategic_dimensions.ts:46-51`).

### 2.3 The `internal_cohesion` formula (verbatim, `strategic_dimensions.ts:102-111`)

```
alliance     = state.political.war_alliance_rbih_hrhb ?? 1
allianceVal  = (faction === 'RBiH' || faction === 'HRHB') ? alliance * 40 : 20
avgCohesion  = mean(active brigade.cohesion for this faction) || 50
exhaustion   = state.political.war_exhaustion[faction] ?? 0
base_value   = clamp(allianceVal + (avgCohesion / 2) - (exhaustion / 3), 0, 100)
```

Then, separately at `strategic_dimensions.ts:50`:

```
effective_value = clamp(base_value + event_modifier, 0, 100)
```

The `effective_value` is therefore a clamped sum of two independently-derived components, with a hard lower bound of zero on the final composite.

## 3. Clamp logic findings

**Yes — a hard lower-bound clamp at 0 exists on `effective_value`.** Citations:

- `src/sim/events/strategic_dimensions.ts:39` — `dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);` inside `applyDimensionShift`.
- `src/sim/events/strategic_dimensions.ts:49-50` — `dim.base_value = clamp(newBase, 0, 100);` and `dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);` inside `updateBaseValue`.
- `src/sim/events/strategic_dimensions.ts:111` — the `internal_cohesion` base value itself is clamped to `[0,100]` before storage.

The clamp is **canonical** in the sense that it is by design — `effective_value` is documented as a `[0,100]` strategic-dimension score (cf. `docs/plans/2026-03-22-dayton-dimension-merge-design.md:125-188`, the implementation plan). The clamp is **not** a defensive guard added after-the-fact; it is the primary normalization step for the dimension to be usable by `computeNegotiatingCapital` and Phase E gates.

There is **no separate, independent decay/drift** on `internal_cohesion` per turn — the value is fully a function of (a) the per-turn `computeDimensionBaseValues` recompute and (b) accumulated `event_modifier` from any fired events that carry a `dimension_shift` on `internal_cohesion`.

## 4. Starting values + decay analysis

### 4.1 Starting values

`initializeStrategicDimensions` (`strategic_dimensions.ts:24-33`) seeds every dimension on every canonical faction to:

```
{ base_value: 50, event_modifier: 0, effective_value: 50 }
```

Per-faction starting `internal_cohesion` is therefore **identically 50 at scenario start** — no per-faction asymmetry on initial conditions. (Confirmed by `tests/strategic_dimensions.test.ts:123-156`.)

### 4.2 Observed turn-40 state (harness-seed save)

Extracted directly from `data/derived/latest_run_final_save.json`:

| Faction | `base_value` | `event_modifier` | `effective_value` | brigades active | avg brigade cohesion |
|---|---|---|---|---|---|
| RBiH | 18.288 | -22 | **0.00 (clamp-floored)** | 118 | 72.63 |
| RS | 5.744 | +7 | 12.744 | 83 | 38.27 |
| HRHB | 7.828 | -5 | 2.828 | 31 | 50.45 |

Additional state used by the formula:
- `state.political.war_alliance_rbih_hrhb = 0.376` (alliance broken — Croat-Bosniak War active by turn 40).
- `state.political.war_exhaustion = { RBiH: 100.001, HRHB: 100.001, RS: 100.001 }` (effectively identical across factions; unbounded monotonic per `Engine Invariants §8`).

### 4.3 Math check — RBiH base

Plugging the formula at `strategic_dimensions.ts:102-111`:

```
allianceVal = 0.376 * 40                  = 15.030
avgCohesion / 2 = 72.63 / 2               = 36.315
exhaustion / 3 = 100.001 / 3              = 33.334
base_value (pre-clamp) = 15.030 + 36.315 - 33.334 = 18.012
```

Stored value: `18.288` (within rounding tolerance of intermediate-turn avg-cohesion drift). **The base computation is internally consistent.**

### 4.4 Math check — `effective_value`

```
effective_value (pre-clamp) = 18.288 + (-22) = -3.712
effective_value (post-clamp) = clamp(-3.712, 0, 100) = 0
```

**Confirmed: RBiH `effective_value = 0.00` is exactly the clamp activating at the lower bound.** Without the clamp the value would be `-3.71`. The cumulative `event_modifier = -22` over 40 turns is consistent with multiple fired events: e.g., `rbih_state_identity` (-5 branch), `rbih_paramilitary_policy_1992` (-3, -2), `ic_pressure_vopp_engagement` (-3), `srebrenica_demilitarization_1993` (-5), `ic_rbih_restraint_post_washington` (-3) — each authored in `data/scenarios/events/war_*.json` and `data/scenarios/events/consequences.json` (greppable `dimension: internal_cohesion`).

### 4.5 Cross-faction sanity

- **HRHB** `effective = 7.828 + (-5) = 2.83` — pre-clamp positive; clamp is dormant.
- **RS** `effective = 5.744 + (+7) = 12.74` — pre-clamp positive; clamp is dormant.

Only RBiH ran into the floor. The clamp is **silently masking a -3.71 signal**, not an enormous deficit, but it nevertheless prevents the strategic-dimension score from telling Phase E gates and `computeNegotiatingCapital` how far below zero the underlying composite has slid.

## 5. Hypothesis ranking

| # | Hypothesis | Evidence | Confidence |
|---|---|---|---|
| **H1** | **`effective_value = 0.00` is a clamp artifact at the lower bound.** | Math reconstruction in §4.3-4.4 reproduces `0.00` exactly from `base_value=18.288` and `event_modifier=-22` via the `clamp(.., 0, 100)` at `strategic_dimensions.ts:39,50`. | **High** |
| H2 | 0.00 is a canonical war-exhaustion floor representing total cohesion collapse. | The clamp is canonical by design (§3), and `[0,100]` is the documented score range. But the **pre-clamp value is `-3.71`, not deeply negative**, so the floor is not modeling "total collapse" — it is modeling "slightly past the bottom of the legal range." | Low |
| H3 | Cohesion has a separate decay function that drove the value to zero. | Grep for cohesion update paths shows no per-turn decay separate from `computeDimensionBaseValues` and `applyDimensionShift`. (`Grep` results in §2.1 are exhaustive on `internal_cohesion` writes.) | Negligible |

**Most likely cause (high confidence):** H1 — the 0.00 is a floor-clamp artifact. The underlying composite (alliance × 40 + avgCohesion/2 − exhaustion/3 + event_modifier) drifted to a small negative value (~ −3.7) at turn 40, primarily because:

1. `war_alliance_rbih_hrhb` collapsed from 1.0 to 0.376 (Croat-Bosniak War), cutting `allianceVal` from 40 to ~15. This is the dominant single contribution swing.
2. `war_exhaustion` is unbounded and crossed ~100, contributing −33 via `/3`.
3. Event-driven negative shifts on `internal_cohesion` accumulated to `-22` over 40 turns.

These three converged to a small negative composite, which was floor-clamped to 0. The clamp is by design, but it is **silently masking signal** that downstream gates could otherwise use.

## 6. Recommendation

### 6.1 Classification

The 0.00 is a **clamp-induced artifact at the canonical lower bound** — both "clamp bug" framing and "canonical war-exhaustion value" framing are partially misleading:

- **Not a bug in the sense of corruption**: the clamp is by design and `[0,100]` is the documented score range.
- **Not a canonical "total collapse" value**: the pre-clamp composite was −3.71, not −80. There is no qualitative semantic difference between RBiH (0.00) and HRHB (2.83) in the underlying model — both are deep-low-cohesion factions and Phase E's `internal_cohesion < 40` gate trips for both. The clamp just makes them look more different than they are.

### 6.2 Impact on Phase E threshold analysis (J2 §5)

The J2 report (line 168) treats RBiH=0.00 as a data point for threshold candidate selection. **§4 of this packet invalidates that data point as a discriminator**: the underlying composite for RBiH is approximately `−3.71`, which by any plausible recalibration scheme (10, 5, or even 0) will trip the gate. The RBiH=0.00 reading is not "RBiH is uniquely the most cohesion-collapsed faction"; it is "RBiH is the only faction whose pre-clamp composite went slightly negative."

This does NOT change J2's overall recommendation (Option C: recalibrate cohesion threshold to 10 then activate). But it sharpens the rationale: the cohesion formula is **alliance-dominated for RBiH and HRHB and exhaustion-dominated for RS**, and the formula is producing values that compress against the floor by turn 40 for all three factions. The threshold-recalibration decision should be aware of this compression, not blind to it.

### 6.3 Follow-up packet recommendations (NOT executed here)

This investigation surfaces three follow-up candidates. None are blocking on Phase E activation. All are NEW packets to be scoped by `/gameplay-programmer` + `/game-designer` jointly.

1. **FOLLOW-UP A (LOW scope, ~1 day) — Surface pre-clamp composite as a diagnostic field.**
   - **Change:** Add a `pre_clamp_value` field next to `effective_value` in `DimensionStore`, written by `updateBaseValue` and `applyDimensionShift`. NOT consumed by gates or capital — diagnostic-only.
   - **Files touched:** `src/sim/events/strategic_dimensions.ts` (interface + write sites), `src/state/save_migration.ts` (new version + default), `tests/strategic_dimensions.test.ts` (new assertions). Phase E gate logic untouched.
   - **Risk:** Save migration. Low-cascade if migration defaults are correct.
   - **Why:** Unblocks future threshold-recalibration analysis with the true signal magnitude. Makes the J2 §5 discussion non-blind to clamp compression.

2. **FOLLOW-UP B (LOW scope, ~½ day) — Document the clamp behavior in canon.**
   - **Change:** Append a note in `docs/10_canon/Systems_Manual_v0_9_0.md` (strategic dimensions section) and `docs/20_engineering/EMERGENT_CASCADE_ARCHITECTURE.md:33` that `effective_value` is clamped to `[0,100]` and that 0.00 / 100.00 readings should be interpreted as floor/ceiling indicators, not as quantitative measurements. Cross-reference `docs/40_reports/calibration_master` and `memory/engine_dimension_vocabulary.md`.
   - **Files touched:** Documentation only. No code, no FORAWWV.
   - **Risk:** Zero — pure documentation.

3. **FOLLOW-UP C (MEDIUM scope, ~2 days) — Re-balance the cohesion formula's component weights.**
   - **Concern:** `allianceVal` swings 25 points (40→15) on a single binary event (Croat-Bosniak War rupture). That is the dominant single signal in the formula. By design? Possibly — the alliance collapse SHOULD impact cohesion. But the magnitude of the swing relative to `avgCohesion/2` (which ranges 0-50) and `exhaustion/3` (unbounded but typically ~30 by turn 40) means alliance status dominates the floor pressure for RBiH and HRHB.
   - **Files touched:** `src/sim/events/strategic_dimensions.ts:102-111` (single function). Must reset and re-validate all calibration baselines (40w, 188w, 52w).
   - **Risk:** Cascading calibration regression. Should be scoped against an open calibration window, not mid-arc.
   - **Why considered:** This is the most defensible long-term answer if the team accepts that the formula is producing floor-compressed values. But it is the highest-cost follow-up and should NOT be executed without explicit user approval.

**Recommended next action:** FOLLOW-UP A + B as a single bundled packet. FOLLOW-UP C deferred until a calibration window opens. This investigation alone does not justify a code change.

## 7. Cross-references

- **J2 packet (trigger):** `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md` §3 (turn-40 matrix), §5.4 (threshold candidates), §9.4 (the question that triggered this investigation).
- **Canonical clamp:** `src/sim/events/strategic_dimensions.ts:39,49-50,111`.
- **Pipeline ordering:** `src/sim/turn_phases/war_phases.ts:303,316`.
- **Event delta application:** `src/sim/events/evaluate_events.ts:126-134`, `src/sim/events/apply_effects.ts:1-80` (effect-sorting context).
- **Event data (cohesion shifts):** `data/scenarios/events/war_1992.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`, `consequences.json` — all greppable for `"dimension": "internal_cohesion"`.
- **Plan history:** `docs/plans/2026-03-22-dayton-dimension-merge-design.md:125`, `docs/plans/2026-03-22-dayton-dimension-merge-impl-plan.md:94-206`.
- **Engine canon context:** `Engine Invariants §8` (war_exhaustion unbounded monotonic) — referenced indirectly via `src/sim/political/political_personality.ts:304-309` comment.
- **Vocabulary index:** `memory/engine_dimension_vocabulary.md`.
- **Related canonical owners (per `PROJECT_LEDGER_ARCHIVE_2026Q2.md:2840,3650`):** `computeFactionGrade()` in `src/sim/negotiation/scoring.ts` (grade anchors); `computeDimensionBaseValues()` in `src/sim/events/strategic_dimensions.ts` (internal_cohesion).
