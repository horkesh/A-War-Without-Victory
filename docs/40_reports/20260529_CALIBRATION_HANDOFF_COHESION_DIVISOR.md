# Calibration Handoff — Cohesion Divisor Fix (incomplete 100× rescale sweep)

## 1. What this is

A handoff to the calibration team for a missed-consumer fix in the intentional 2026-05-22
`war_exhaustion` 100× rescale. This UNBLOCKS the Phase E cohesion gate activation. Documentation only;
no code changed here. Full context: `docs/40_reports/proposals/20260529_PHASE_E_VERDICT_CONSOLIDATED.md`
and `docs/40_reports/proposals/20260529_WAR_EXHAUSTION_RATE_INVESTIGATION.md`.

## 2. The bug

Commit `59511672` (2026-05-22, `fix(exhaustion): rescale war_exhaustion 100×`) intentionally raised the
exhaustion ceiling 100× (delta cap 10→200, saturation cap 100→10000) to restore faction differentiation,
and rescaled the gate-threshold consumers 100× in lockstep (Washington 55→5500, ceasefire 35→3500 /
30→3000, combat tempo 30/80→3000/8000). The sweep **missed two linear-term consumers**:

- `src/sim/events/strategic_dimensions.ts:111` — cohesion base formula still divides `exhaustion/3`.
- `src/sim/political/political_personality.ts:308-309` — situation score still divides `exhaustion/6`.

With post-rescale turn-40 exhaustion at ~4750-7940, `exhaustion/3` (~1580-2647) dwarfs the formula's
maximum positive contribution (`allianceVal ≤ 40` + `avgCohesion/2 ≤ 50` = 90), so `clamp(.., 0, 100)`
floors all three factions' `internal_cohesion` base at 0. The `exhaustion/6` term likewise clamps the
situation score to 100 for all factions. Both consumers were authored for the pre-rescale 0-100 era.

Note: the earlier "exhaustion ≈ 100, cohesion fine" reading (J3) was a **stale-save fossil** (the
committed save predated the rescale's regeneration), not evidence the formula was healthy. See the
verdict record §4.1.

## 3. Exact fix

Complete the 100× sweep — divide each missed divisor by 100:

- `src/sim/events/strategic_dimensions.ts:111`: `exhaustion / 3` → `exhaustion / 300`.
- `src/sim/political/political_personality.ts:308-309`: `exhaustion / 6` → `exhaustion / 600`.

This is the lowest-risk, semantics-preserving root-cause fix — it restores the pre-rescale 0-100-era
behavior the formulas were written for. (The Phase E alternative of recalibrating the cohesion gate
threshold into (0,12] is a workaround, not the root-cause fix; prefer the divisor sweep.) Update the
stale "typically 0-600+ at 40w" comment near `political_personality.ts:308` to reflect the /600 scale.

## 4. Why it forces a baseline refresh

The divisor change moves cohesion `base_value` off the 0 floor for all three factions, which:

- changes `internal_cohesion` `effective_value` (no longer purely event-modifier-driven),
- feeds the strategic-dimensions layer (cohesion is an input there), and
- can therefore shift bot political decisions and downstream territorial outcomes.

So the change is NOT baseline-neutral and will move the golden scenario hashes. It must land inside an
open calibration window with a coordinated baseline recanonicalization, not speculatively.

## 5. Verification path

1. Apply the two divisor edits (and the comment update).
2. `npx tsc --noEmit` + `npm run test:vitest` — confirm no type/test regressions (expect the cohesion
   test row(s) to need updated expected values; update them to the new scale).
3. Run the baseline regression to observe the hash drift, then re-canonicalize:
   `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts`, then with
   `UPDATE_BASELINES=1` once the new control deltas are reviewed and accepted.
4. Confirm cohesion base values no longer floor at 0 — re-read the dimension snapshot
   (`tools/diagnostics/political_dimensions_snapshot.ts`) and verify per-faction `internal_cohesion`
   `base_value` is now nonzero and faction-differentiated.
5. Confirm `political_personality` situation score no longer pins all factions to 100.

## 6. Effect on Phase E

Completing this fix **UNBLOCKS the Phase E cohesion gate activation.** Once cohesion bases are no longer
saturated, the cohesion discriminator rests on the formula's structural terms again (not solely on
event_modifier), and the cohesion gate can be evaluated for activation per the Phase E procedure. The
gate currently reads **BLOCKED** in the consolidated verdict solely because of this divisor omission.

## 7. Sign-off chain

- **gameplay-programmer** — implements the two divisor edits + test-row updates.
- **game-designer** — confirms the restored cohesion semantics match the intended
  "officer loyalty / civil-military relations" definition (Systems Manual §7.10.3).
- **canon-compliance-reviewer** — confirms Engine Invariants §8 (exhaustion monotonic / irreversible /
  unbounded) is untouched (only the divisor changes; the accumulator is not modified).
- **calibration baseline owner** (`claude/calibration-historical-army-arc-2026-05-24`) — owns the
  baseline recanonicalization, the control-delta review, and the `UPDATE_BASELINES` sign-off.

## 8. Cross-references

- Consolidated verdict: `docs/40_reports/proposals/20260529_PHASE_E_VERDICT_CONSOLIDATED.md`
- War-exhaustion rate investigation: `docs/40_reports/proposals/20260529_WAR_EXHAUSTION_RATE_INVESTIGATION.md`
- Rescale commit / ledger: `59511672`; `docs/PROJECT_LEDGER.md` (Wave 1, ~5510-5518)
- Forensics basis: `docs/40_reports/audits/20260522_FORENSICS_WAR_EXHAUSTION_CONVERGENCE.md` §6
- Accumulator (do NOT modify): `src/sim/combat/exhaustion.ts:19,22,31,115`
- Missed consumers: `src/sim/events/strategic_dimensions.ts:111`; `src/sim/political/political_personality.ts:308-309`
