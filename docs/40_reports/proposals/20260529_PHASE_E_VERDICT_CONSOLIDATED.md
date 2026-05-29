# Phase E Activation — Consolidated Verdict (ADJUDICATED)

## 1. Status

- **Date:** 2026-05-29
- **Authority:** This is the **authoritative, final-adjudicated Phase E activation verdict.** It is
  produced after an independent Determinism Auditor + Technical Architect adjudication that verified
  every crux fact in the investigation chain below.
- **Supersedes (where corrected):** This record supersedes the intermediate conclusions of
  - J2 readiness (`20260529_PHASE_E_ACTIVATION_READINESS.md`) — its `intl_only`-is-safest framing,
  - the Track B post-merge recommendation (`20260529_PHASE_E_ACTIVATION_RECOMMENDATION_POSTMERGE.md`)
    where it framed the post-merge values as a *calibration-moved merge-rate change* and treated the
    `intl_only` Tier 2 drift as a bot-military reversal of J2, and
  - the Track B War-or-Game `intl_only` **NO-GO** (sign-inversion / 122-OSID cascade).

  The investigation docs remain on disk unedited as the audit trail; this record states the corrected
  bottom line and is the document to consult for the activation decision.
- **Constraint posture:** Documentation only. No code, threshold, flag, or baseline changed by this
  record or its adjudication. The adjudication was a fact-verification pass over existing read-only
  artifacts and source.
- **Target audience:** User (activation is user-gated) + calibration team
  (`claude/calibration-historical-army-arc-2026-05-24`, owns the divisor fix + baseline) + tooling
  (owns the J1 simulator reporting fix).

## 2. Final verdict per flag

| Flag | Verdict | Gating condition |
|---|---|---|
| `cohesion_only` | **BLOCKED** | Blocked on the cohesion-divisor fix (the incomplete 100× rescale sweep). Not a canon violation, not a rescale-revert reason. Owned by the calibration team. See §4.1. |
| `intl_only` | **Conditional-GO** | The "sign-bug / 122-OSID cascade NO-GO" is **CORRECTED and withdrawn.** No bug. Conditional-GO gated only on a baseline refresh + calibration/user sign-off. See §4.2. |
| `both_on` | NO-GO until both single channels are individually accepted and baselined. | Sequencing. |
| `global_only` (tier-1 plumbing, no sub-flag) | Byte-identical / no behavioral effect — safe to flip for plumbing confirmation only. | None. |

Recommended order of work: complete the cohesion-divisor fix first (unblocks cohesion), then run a
fresh `intl_only` Tier 2 + flip-set ON-vs-OFF diff, activate intl first if either is activated, both
last. Every activation requires a baseline recanonicalization + sign-off; there is no longer a
"free" zero-baseline-impact activation.

## 3. The investigation → review → adjudication chain (who found what)

The verdict was reached across five linked documents and a final adjudication. The chain:

1. **J2 — Readiness** (`20260529_PHASE_E_ACTIVATION_READINESS.md`): first Tier-1 dimension snapshot
   + a `cohesion_only` Tier 2. Recommended order C→A→B and asserted `intl_only` would be the safest
   first activation (inferred — J2 never ran an `intl_only` Tier 2). Flagged RBiH cohesion zero-floor.
2. **J3 — RBiH cohesion clamp** (`20260529_RBIH_COHESION_INVESTIGATION.md`): diagnosed the cohesion
   base clamping to 0, reading `war_exhaustion ≈ 100`. Routed a formula-rebalance follow-up.
3. **Track B — Post-merge recommendation** (`20260529_PHASE_E_ACTIVATION_RECOMMENDATION_POSTMERGE.md`):
   re-grounded on the integrated 656/712 baseline, ran the missing `intl_only` Tier 2 (observed
   BOT-MILITARY hash drift), measured `war_exhaustion ≈ 4750-7940`, and reported the cohesion clamp as
   generalized across all three factions. Concluded `intl_only` had "reversed" J2's safety framing and
   issued (via War-or-Game) an `intl_only` NO-GO on a 122-OSID / sign-inversion reading.
4. **Investigation 1 — War-exhaustion rate** (`20260529_WAR_EXHAUSTION_RATE_INVESTIGATION.md`,
   Scenario-Creator-Runner-Tester + Technical-Architect): traced the ~50× exhaustion jump to the
   intentional 100× rescale (commit `59511672`, 2026-05-22) and proved J3's `~100` reading was a
   **stale-save fossil** (byte-identical `100.00133` across all three factions = the old
   `Math.min(100)` cap), not a live engine state. Identified the missed cohesion divisor.
5. **Investigation 2 — intl_only coupling** (`20260529_INTL_ONLY_COUPLING_INVESTIGATION.md`,
   Gameplay Programmer + Scenario-Creator-Runner-Tester): proved `control_delta.json` is a
   **within-run** (war start → end) trajectory, not a flag-ON-vs-OFF diff, and that the consumer
   arithmetic sign is **correct**. Withdrew the sign-bug finding; kept the not-baseline-neutral gating.
6. **Adjudication — Determinism Auditor + Technical Architect** (this record): independently verified
   all crux facts (the stale-save fossil signature, the missed divisors, the within-run semantics of
   `control_delta`, the consumer sign), confirmed the three corrections in §5, and routed owners.

## 4. The adjudicated crux facts

### 4.1 cohesion gate — BLOCKED on an incomplete rescale sweep

The intentional 100× `war_exhaustion` rescale (commit `59511672`, 2026-05-22 — raised
`MAX_DELTA_PER_TURN` 10→200 and the saturation cap 100→10000, and rescaled the gate-threshold
consumers 100× in lockstep) **missed two linear-term consumers**:

- `src/sim/events/strategic_dimensions.ts:111` still divides `exhaustion/3` (should be `/300`).
- `src/sim/political/political_personality.ts:308-309` still divides `exhaustion/6` (should be `/600`).

With post-rescale turn-40 exhaustion at ~4750-7940, `exhaustion/3` (~1580-2647) saturates the cohesion
base formula and floors all three factions' `internal_cohesion` base at 0. The cohesion discriminator
therefore rests entirely on `event_modifier` rather than the formula's structural terms.

J3's earlier `~100` exhaustion reading that *hid* this was a **stale-save fossil** — the committed
`latest_run_final_save.json` on the J3 branch read `war_exhaustion = 100.00133` byte-identically across
all three factions, which is the impossible-for-the-rescaled-engine signature of the OLD
`Math.min(100, …)` cap. The rescale commit was already an ancestor of that save's commit; the save was
simply never regenerated. The recanonicalization (`fbb2b73c`, 656/712) regenerated it with the live
engine, surfacing the faction-differentiated true values.

**Adjudicated:** This is a **calibration bug of omission** — a missed consumer in the 2026-05-22
downstream-rescale sweep. The fix is to **complete the sweep** (`/3→/300`, `/6→/600`). It is **NOT a
canon violation** (Engine Invariants §8 trajectory is unchanged — only headroom) and **NOT a reason to
revert the rescale.** The CALIBRATION TEAM owns it because it forces a baseline refresh. Until the
divisor is fixed, the cohesion gate stays **BLOCKED**.

### 4.2 intl_only — conditional-GO (sign-bug NO-GO corrected)

War-or-Game's NO-GO read the `intl_only` Tier 2 `control_delta.json` ("122-OSID cascade, RS +85, RBiH
−62, HRHB −23") as a **flag-ON-vs-flag-OFF** diff and concluded the coupling sign was inverted (a flag
that should make RS *hesitate* appearing to make RS *gain* 85 OSIDs).

**Adjudicated CORRECT — the NO-GO is withdrawn:**

- `control_delta.json` is a **within-run total** (`computeControlDelta(initialSnapshot, finalSnapshot)`,
  `scenario_runner.ts:2969`; `net = after − before`, `scenario_end_report.ts:182-191`). "+85 RS" means
  RS expanded 289→374 OSIDs **over the course of the war** — the historical 1992 Serb land-grab — NOT
  the flag's effect relative to OFF. The sibling `cohesion_only` run shows the same ~+87 / 128-flip
  trajectory, confirming it is the war's baseline path present in every run, not a per-flag effect.
- The consumer arithmetic **sign is correct**: `effectiveMinForOp = Math.ceil(baseMinForOp /
  combinedMult)` with `combinedMult = 0.7` *raises* the brigade-count launch floor (`ceil(2/0.7)=3`),
  which means **fewer** ops launch — exactly the intended "more hesitant" semantic. A `/`→`×` change
  would *break* it into the inversion the reviewer feared.
- The true per-flag ON-vs-OFF territorial swing is single-digit-to-low-double-digit OSIDs (consistent
  with the documented R28/R29 attrition-sink-escape cascade scale), not 122.

**Adjudicated:** No bug, no mis-scale. The one legitimate concern that **stands** is that `intl_only`
is not baseline-neutral (real BOT-MILITARY hash drift on the 52w run). So `intl_only` is
**conditional-GO**, gated only on a baseline refresh + calibration/user sign-off (with a flip-set
ON-vs-OFF magnitude probe recommended before activation).

## 5. The three corrections made by adjudication

1. **Track B's "calibration moved the values / merge-rate change" framing → stale-save fossil.**
   Track B attributed the post-merge exhaustion/cohesion shift to calibration moving dimension values
   at merge. The actual cause is that J3 measured a **stale pre-rescale save**; the merge merely
   regenerated the save with the already-shipped rescaled engine. No new rate change was introduced
   between J3 and HEAD (`git log 71d25749..ef5b382b -- exhaustion.ts` is empty).

2. **War-or-Game's "122-OSID cascade / sign-bug NO-GO" → within-run misread.** The 122 / +85 figures
   are a single run's initial→final flip total, not a flag-ON-vs-OFF delta, and the consumer sign is
   correct. The sign-inversion-bug rationale is withdrawn; the not-baseline-neutral rationale stands.

3. **The J1 simulator reporting defect.** The root cause of the apparent contradiction is that the J1
   simulator (`tools/diagnostics/phase_e_activation_simulator.ts`) Tier 2 path **hash-compares only** —
   it surfaces the within-run `control_delta` as if it were a flag effect, with no ON-vs-OFF
   territorial diff. This made a within-run trajectory read like a 122-OSID flag cascade. Being fixed
   separately by tooling.

## 6. Routed owners

| Item | Owner | Status |
|---|---|---|
| Cohesion divisor fix (`/3→/300`, `/6→/600`) | Calibration team | Open — forces baseline refresh; see handoff `20260529_CALIBRATION_HANDOFF_COHESION_DIVISOR.md` |
| J1 simulator reporting fix (ON-vs-OFF flip-set diff, not within-run hash) | Tooling | In progress |
| Phase E activation decisions (which flag, when) | User + calibration | Gated on the two above + baseline recanonicalization |
| Cohesion threshold recalibration to ≤12 (if cohesion activated) | gameplay-programmer + game-designer + canon-compliance-reviewer | Deferred until after divisor fix |

## 7. Audit trail / cross-references

- Track B post-merge recommendation: `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_RECOMMENDATION_POSTMERGE.md`
- Investigation 1 (war-exhaustion rate / stale-save fossil): `docs/40_reports/proposals/20260529_WAR_EXHAUSTION_RATE_INVESTIGATION.md`
- Investigation 2 (intl_only coupling / sign correct): `docs/40_reports/proposals/20260529_INTL_ONLY_COUPLING_INVESTIGATION.md`
- J2 readiness (intermediate, superseded where corrected): `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md`
- J3 cohesion clamp (measured stale save): `docs/40_reports/proposals/20260529_RBIH_COHESION_INVESTIGATION.md`
- Calibration handoff (divisor fix): `docs/40_reports/20260529_CALIBRATION_HANDOFF_COHESION_DIVISOR.md`
- Activation procedure + rollback: `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- Rescale commit: `59511672` `fix(exhaustion): rescale war_exhaustion 100×`; ledger `docs/PROJECT_LEDGER.md` (Wave 1, lines ~5510-5518)
- J1 simulator: `tools/diagnostics/phase_e_activation_simulator.ts` (`classifyDriftSignal` 402-424, Tier 2 hash compare 451-471)
- Consumer / helper sign: `src/sim/combat/commander/emit.ts:845-875`; `src/sim/combat/sector_offensive.ts:244-261`
- control_delta semantics: `src/scenario/scenario_runner.ts:2969`; `src/scenario/scenario_end_report.ts:107-191`
- Missed cohesion divisor: `src/sim/events/strategic_dimensions.ts:111`; `src/sim/political/political_personality.ts:308-309`
