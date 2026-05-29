# Cohesion Divisor Fix — Calibration Execution Plan

**Date:** 2026-05-29
**Status:** READY (planning only — no code, no run, no commit until calibration window opens)
**Owner lane:** Calibration team (`claude/calibration-historical-army-arc-2026-05-24` owns the baseline recanonicalization)
**Related handoff:** `docs/40_reports/20260529_CALIBRATION_HANDOFF_COHESION_DIVISOR.md`
**Related verdict:** `docs/40_reports/proposals/20260529_PHASE_E_VERDICT_CONSOLIDATED.md`
**Rescale commit of record:** `59511672` (2026-05-22, `fix(exhaustion): rescale war_exhaustion 100×`)
**Current baseline of record:** 40w 656/712 (92.13%), anchors 27/27, benchmarks 6/6.

---

## 1. Objective

Complete the missed-consumer half of the deliberate 2026-05-22 `war_exhaustion` 100× rescale by correcting two stale divisors that still assume the pre-rescale 0-100 exhaustion scale. The rescale (commit `59511672`) raised the exhaustion accumulator 100× (`MAX_DELTA_PER_TURN` 10→200, saturation cap 100→10000) and rescaled the gate/threshold consumers in lockstep (Washington 55→5500; ceasefire 35→3500 / 30→3000; combat tempo 30/80→3000/8000) — but missed two *linear-term* consumers that divide raw exhaustion inline. Those two divisors now over-subtract by ~100×, flooring all three factions' cohesion-related bases at 0.

**Why it matters:** the floor-at-0 collapses the Phase E cohesion gate (`getCohesionCautionBiasMultiplier`, `cohesion<40 → 0.85×`) into a *universal* 0.85× multiplier instead of the intended faction-asymmetric discriminator, because every faction clamps to ~0 regardless of its real cohesion. Fixing the divisors restores faction differentiation and is a **prerequisite that unblocks the Phase E cohesion-only gate activation** (see §4, §7).

## 2. Scope & Non-Scope

**In scope (the ONLY change in this run):** TWO one-line divisor corrections plus one stale-comment update.
- `src/sim/events/strategic_dimensions.ts:111` — `exhaustion / 3` → `exhaustion / 300`.
- `src/sim/political/political_personality.ts:308-309` — `(... ?? 0) / 6` → `/ 600`, and update the adjacent `typically 0-600+ at 40w` comment to the post-rescale scale (~0-60000+).

**Out of scope (do NOT bundle):**
- The exhaustion accumulator itself (`src/sim/combat/exhaustion.ts:19,22,31,115`) — Engine Invariants §8 (monotonic / irreversible / unbounded) must stay untouched.
- Phase E gate-threshold recalibration (the (0,12] workaround) — this plan is the root-cause fix, not the workaround.
- Any Phase E flag flip / cohesion_only activation — separate lane, gated on this landing first.
- Any other divisor, formula, OOB, op, or scenario param.

## 3. Current-State Findings (verified against code + commit `59511672`)

### Site A — `src/sim/events/strategic_dimensions.ts:111`
Current expression (verified):
```ts
const exhaustion = state.political?.war_exhaustion?.[faction] ?? 0;
updateBaseValue(store, faction, 'internal_cohesion',
    clamp(allianceVal + (avgCohesion / 2) - (exhaustion / 3), 0, 100));
```
- `allianceVal ≤ 40`, `avgCohesion/2 ≤ 50` → max positive contribution = **90**.
- Post-rescale w40 exhaustion ≈ 4750–7940 → `exhaustion/3` ≈ **1583–2647**, which dwarfs 90.
- `clamp(.., 0, 100)` therefore floors `internal_cohesion` base at **0** for all three factions.

Proposed:
```ts
clamp(allianceVal + (avgCohesion / 2) - (exhaustion / 300), 0, 100)
```
- `exhaustion/300` ≈ **15.8–26.5** at w40 — same magnitude `exhaustion/3` produced pre-rescale when exhaustion was on the 0-100 scale. Numerically scale-preserving.

### Site B — `src/sim/political/political_personality.ts:308-309`
Current expression (verified):
```ts
// war_exhaustion is unbounded monotonic (Engine Invariants §8), typically 0-600+
// at 40w. Normalize to 0-100 scale ... divide by 6 so that exhaustion 600 maps to 100.
const exhaustion_level = clamp(
    (state.political?.war_exhaustion?.[faction] ?? 0) / 6, 0, 100);
```
- The `/6` was authored to map a pre-rescale 0-600 exhaustion onto 0-100. Post-rescale exhaustion (~4750–7940 at w40, growing to ~60000 at 188w) makes `exhaustion/6` ≈ **791–1323**, clamped to **100** for every faction → `situation_score` exhaustion term pins to its floor uniformly, zero differential.

Proposed:
```ts
// war_exhaustion is unbounded monotonic (Engine Invariants §8), typically 0-60000+
// at 40w post-100×-rescale. Normalize to 0-100: divide by 600 so exhaustion 60000 maps to 100.
const exhaustion_level = clamp(
    (state.political?.war_exhaustion?.[faction] ?? 0) / 600, 0, 100);
```
- `exhaustion/600` ≈ **7.9–13.2** at w40 — same magnitude `/6` produced pre-rescale. Numerically scale-preserving.

### Rescale arithmetic tie-in
The rescale multiplied the accumulator by 100×. A consumer that linearly divides raw exhaustion must therefore multiply its divisor by 100× to hold its output constant: `3 → 300`, `6 → 600`. Both missed divisors are the **same root cause** (one incomplete sweep), confirmed against the `59511672` diff (which rescaled threshold consumers 100× but not these two linear-term consumers).

## 4. One-Change-Per-Run Execution — Recommendation

**RECOMMENDATION: land both divisors in a SINGLE calibration run (one logical change).**

Reasoning:
- Both edits are the *same defect* — a single incomplete 100×-rescale sweep, commit `59511672`. They share one root cause, one direction, one justification.
- "One change per run" is a *one-logical-change* discipline, not a one-line-of-code discipline. Splitting a single root-cause fix across two runs would be artificial and would produce an intermediate baseline (Site-A-only) that has no standalone design meaning and would itself need authorized recanonicalization — doubling the baseline-churn cost for no analytic gain.
- The two sites feed *different* downstream layers (Site A → `internal_cohesion` dimension base → strategic-dimensions / Phase E cohesion gate; Site B → `political_personality` situation/dimension score → bot political decisions), so a combined run still yields a single clean, attributable hash delta tied to one root cause.

**Stated risk of the one-run choice:** if the combined hash delta is unexpectedly large or moves anchors/benchmarks adversely, attribution between Site A and Site B is coupled. **Mitigation / fallback:** if the post-run review shows an anomalous or adverse calibration move, *then* split into two sequential runs (Site A first, observe; Site B second, observe) to isolate which consumer drove the regression — but only as a diagnostic fallback, not the default path.

**Sequencing (single run):**
1. Apply Site A + Site B + comment update together.
2. `npx tsc --noEmit` (expect green).
3. `npm run test:vitest` — expect the cohesion/situation test rows to need updated expected values (the new scale is correct; update fixtures to match, do not revert the divisor).
4. Run baseline regression to **observe** drift (do NOT pass `UPDATE_BASELINES` yet).
5. Review control deltas + calibration % + anchors/benchmarks (§5).
6. Recanonicalize WITH explicit authorization (§5).

## 5. Expected Effect & Measurement / Verification

### Predicted direction
- `internal_cohesion` base_value should lift off the 0 floor for all three factions and become **faction-differentiated** (driven by `allianceVal` + `avgCohesion/2` − the now-properly-scaled exhaustion term). RBiH/HRHB carry `allianceVal = alliance*40`; RS carries the fixed `20` — so asymmetry should re-emerge.
- `political_personality` `situation_score` exhaustion term should stop pinning uniformly to its clamp; per-faction situation/dimension scores should differentiate.
- The Phase E cohesion gate stops being a universal 0.85× and becomes the intended faction-asymmetric trigger.
- Direction of calibration % movement is **not predictable a priori** (cohesion now feeds bot political decisions → potential territorial drift). Treat any movement off 656/712 as an output change to be reviewed, not auto-accepted.

### Verification steps
1. **Typecheck + tests:** `npx tsc --noEmit`; `npm run test:vitest`. Update only the cohesion/situation expected-value rows to the new scale; document each in the run notes.
2. **Cohesion-floor confirmation (primary success signal):**
   `node node_modules/tsx/dist/cli.mjs tools/diagnostics/political_dimensions_snapshot.ts --save data/derived/latest_run_final_save.json`
   Confirm per-faction `internal_cohesion` `base_value` is **nonzero and faction-differentiated** (no longer all ~0). Optionally `--faction RBiH|RS|HRHB --json` per faction.
3. **Situation-score confirmation:** confirm `political_personality` situation score no longer pins all factions to 100 (snapshot / focused diagnostic).
4. **Calibration baseline:**
   `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts`
   Record: 40w count-weighted % vs **656/712**, anchors vs **27/27**, benchmarks vs **6/6**, and the new 40w + 188w golden hashes.
5. **Hash-drift expectation:** hashes WILL move — this is an **authorized output change**. Capture old→new 40w + 188w hashes in the run notes. Recanonicalize ONLY after the control-delta review is accepted, via `UPDATE_BASELINES=1` on the baseline regression run. Do NOT refresh baselines speculatively or without the baseline owner's sign-off.

## 6. Determinism

Pure constant-divisor change. No `Math.random`, no `Date.now`, no timestamps, no new iteration order, no Map/object enumeration introduced. The accumulator and its sorted iteration are untouched. The diagnostic tool is read-only and already sorted (canonical faction order). Engine Invariants §8 (exhaustion monotonic/irreversible/unbounded) is unaffected — only two *downstream consumers* of exhaustion change their normalization constant.

## 7. Risks, Rollback, Dependencies, Owner, Definition of Done

### Risks
- **Calibration regression:** cohesion now influences strategic-dimensions and bot political decisions more than it did while floored at 0; territorial outcomes may shift. Mitigation: full anchor/benchmark/% review before recanonicalization; fallback to two-run split for attribution if a regression appears.
- **Phase E coupling:** this fix is a *prerequisite* for, but distinct from, the Phase E cohesion-only activation. Do NOT flip Phase E flags in this run. Activation is a separate, subsequent lane gated on this landing.
- **Baseline re-canonicalization must be authorized:** the hash move is expected and authorized *in principle*, but the actual `UPDATE_BASELINES` step requires the baseline owner's explicit sign-off after reviewing the control deltas. Never auto-refresh.
- **Test-fixture drift:** expected cohesion/situation test values change; risk of "fixing the test to a wrong number." Mitigation: derive the new expected values from the scale-preserving arithmetic in §3, not by copying observed output blindly.

### Rollback
Revert the two divisors (`300→3`, `600→6`) and the comment; revert the test-fixture rows; restore prior golden baselines from the pre-run baseline manifest. Single-commit revert; no schema/migration involved.

### Dependencies
- **Unblocks:** Phase E PDP cohesion-only gate activation (`getCohesionCautionBiasMultiplier`) — currently reads BLOCKED in `20260529_PHASE_E_VERDICT_CONSOLIDATED.md` solely due to this divisor omission.
- **Depends on:** an open calibration window + baseline owner availability for the authorized recanonicalization.
- **Must not collide with:** any concurrent calibration run touching golden hashes.

### Owner
Calibration team. Implementation: gameplay-programmer (two divisor edits + test rows). Reviewers: game-designer (restored cohesion semantics vs Systems Manual §7.10.3), canon-compliance-reviewer (Engine Invariants §8 untouched), calibration baseline owner (`claude/calibration-historical-army-arc-2026-05-24`) for the control-delta review + `UPDATE_BASELINES` sign-off.

### Definition of Done
- Both divisors corrected (`/300`, `/600`) + comment updated.
- `tsc --noEmit` green; `vitest` green with intentionally-updated cohesion/situation rows.
- Dimension snapshot confirms `internal_cohesion` base nonzero + faction-differentiated for all three factions; situation score no longer uniformly 100.
- 40w + 188w baseline regression run; calibration %, anchors, benchmarks recorded vs 656/712 / 27/27 / 6/6; control deltas reviewed and accepted.
- New golden hashes canonicalized via `UPDATE_BASELINES=1` **with explicit baseline-owner authorization**.
- `docs/PROJECT_LEDGER.md` appended (behavioral/output change); handoff doc cross-referenced; Phase E lane notified that the prerequisite is cleared.
