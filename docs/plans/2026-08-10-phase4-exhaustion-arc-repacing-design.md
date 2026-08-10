# Phase 4 — Exhaustion Input Re-Pacing (arc within the friction-safe envelope)

**Date:** 2026-08-10 · **Branch:** codex/master-roadmap-execution · **Status:** OUTCOME — 1994 plateau ADOPTED (territory byte-flat); RS-side RETIRED (fidelity ceiling)

## OUTCOME (2026-08-10)

**ADOPTED — the ARBiH/HVO 1994 plateau (`exhaustion_pacing` RBiH+HRHB {wk90-110: ×0.15}).**
Validated vs a clean baseline (n174 vs n175): **territory byte-flat every one of 188 weeks**
(0 control_counts mismatches; matched 634; net counts RS 301/RBiH 309/HRHB 102 identical;
total_flips 171=171; all 31 anchors identical); §6 correct; fire-weeks identical (Washington
wk99/102/106 inside the plateau window — unshifted; Carter 138, COHA 139/156, Storm 174/175).
40w structural fingerprint `5cfcf1c8` UNCHANGED; 52w/4w goldens RE-BLESSED (only `final_save.json`
moves — it serializes `military.war_timeline.exhaustion_pacing`; the plateau is beyond both
horizons so behaviour is byte-identical). A pure fidelity gain (the BB-cited 1994 WA/cessation
war-weariness plateau) at ZERO calibration cost.

**RETIRED — the RS-side re-pacing (curve 1's RS {wk10-80: ×0.20}).** Ran n173: matched 620 (−14),
flipped three sacred RS-corridor anchors (doboj:boljanic_2, gracanica:petrovo_2, brcko_corridor
band 5/6→3/6). Structural kill-criterion §6.3: RS transits the [3000,8000] tempo band during
wk26-95 (unavoidable — its exhaustion is there mid-war), so any RS arc change perturbs RS attacker
tempo on the most knife-edge anchors; and above 8000 (wk100+) the §8.6 headroom blocks
intensification. RS re-pacing is boxed between the tempo band below and the §8.6 cap above — the
residual RS front-load is the documented **fidelity ceiling** (the price of keeping the §8.6
soft-stop), not a fixable bug. The mechanism (`exhaustion_pacing`) is retained and now carries only
the adopted ARBiH/HVO plateau.

---

**(original design follows)**

**Branch:** codex/master-roadmap-execution · **Prior status:** DESIGN (pre-build)
**Owner directive (2026-08-07):** "keep the soft-stop, but tweak the input factors as well… I want it done right."
**Gate posture:** 188w on the FULL 31-anchor diff (not net matched) + engine-health gate + exhaustion-curve gate.

## 1. Problem

Post-de-saturation the `war_exhaustion` accumulator (0-10000) no longer saturates
(keystone `dead_weeks_pct` 0.5%), but its arc is **concave / front-loaded**: measured
fractions of terminal reached by wk50 — RS 66% / RBiH 55% / HRHB 51%; by wk83 — RS 83%
/ RBiH 72% / HRHB 79% (n172). ~60% of the war-weariness rise lands in the first quarter.

**Historian target arc (BB-cited):** a pure concave curve is *right* for the societal /
displacement component (1992-93 was the bloodiest, most-displacing period) but *wrong*
for the military and political components:
- **RS** war-weariness is **cumulative / late-intensifying** — economic strangulation,
  low pay, extended frontline duty, desertion spiral, worst 1994-95 (VRS 250k→155k). The
  front-loaded curve understates the late RS collapse.
- **A real 1994 plateau** — Washington Agreement (Feb 1994) + the four-month
  cessation-of-hostilities (signed 23 Dec 1994, effective 1 Jan 1995) — for ARBiH/HVO,
  which a smooth concave curve misses entirely.
- **1995** carries BB's most acute exhaustion language (2nd Krajina Corps "exhausted
  remnants" post-Storm; ARBiH "exhausted after almost a month" at Ozren).

## 2. The friction-safe envelope (the probe result that unblocks this lane)

Two exhaustion→combat channels, both reading `political.war_exhaustion`:

- **CH1 command friction** (`command_friction.ts:36,43`): `raw = 1 + exhaustion·0.01 +
  frontEdges·0.02`, capped `MAX_MULTIPLIER=10`. Exhaustion ≥ **~900** pins friction at the
  cap; every faction clears 900 by ~wk6-11. Friction is **saturated for ~95% of the war**,
  and the 634 floor was calibrated on the pinned value (why it's load-bearing).
  **Re-pacing the arc *above* ~900 leaves friction byte-identical → combat-safe.**
  friction-fix-#2's 611 came from un-pinning the *coefficient* (5× buff) — a different op.
- **CH2 tempo** (`combat_math.ts:1788` `getWarExhaustionTempoMult`): ≤3000→1.0,
  ≥8000→0.85, linear between. A weak ±15%-max attacker lever, sensitive only in
  **[3000,8000]**. In-band re-pacing is small, boundable, 188w-gated.

**Envelope rule:** hold every faction ≥ ~900 from ~wk8 (trivially satisfied — all >1900
by wk11 today). Shape the arc only above 900. The historian's fixes all live above 900
(1994 plateau ~7000; RS late >9500), so the core re-pacing is CH1-invisible; only the
ARBiH/HVO 1994 plateau touches the CH2 [3000,8000] band and must be anchor-gated.

## 3. Design tension: §8.6 asymptotic soft-stop vs. "late-intensify"

The shipped soft-stop is `exhaustion = min(10000, current + finalDelta·headroom)` with
`headroom = 1 - current/10000` (`exhaustion.ts:136`). This **produces concavity by
construction** — as `current → 10000`, `headroom → 0`, so late deltas are heavily damped.
A truly *convex-late* (accelerating) RS arc conflicts with §8.6, which the owner directed
we KEEP.

**Resolution:** we cannot make the late arc convex under an asymptotic cap, but we CAN
make it **less concave** — spread the rise more evenly across 188w by flattening the
*driver* mid-early and letting RS reach the high band later. Within §8.6 this is the
faithful realization of "later-peaking": more of the (bounded) rise shifts into 1994-95
relative to today's 66%-by-wk50. Combined with the explicit 1994 ARBiH/HVO plateau, this
captures the historian arc's achievable content. Truly-convex late-intensification is NOT
achievable while retaining §8.6 and is out of scope (documented, not attempted).

## 4. Levers (DATA-first, per memory: the effective lever is timeline data, not a const)

Drivers (`exhaustion.ts`): `delta = min(200, supplyPressure·0.1 + staticFronts·2)`;
`effectiveDelta = min(200, delta·multiplier·(1+externalMod+legitimacyMod) + sarajevoExtra)`.

- **L1 — per-faction war-weariness pacing curve (timeline data).** Add a time-phased
  multiplier on `finalDelta`, analogous to the existing `doctrine_phases.aggression_modifier`
  in `apr1992.json`: RS damped early (wk0-70) then relieved (wk120+); RBiH/HRHB a plateau
  dip wk~88-105 (WA/cessation). This is the primary lever and is DATA (no code const edit).
- **L2 — driver coefficients** (`EXHAUSTION_PER_STATIC_FRONT=2`,
  `PER_SUPPLY_PRESSURE_POINT=0.1`, `MAX_DELTA_PER_TURN=200`): only if L1 pacing can't hit
  the target without them. Prefer L1.
- **KEEP:** §8.6 headroom soft-stop; the 0-10000 scale (no downstream gate rescale — the
  de-sat precedent proved scale-preservation sidesteps the WA/ceasefire/Storm re-derivation).

## 4b. CLAMP CONSTRAINT (found while wiring L1 — critical for curve derivation)

`effectiveDelta = min(200, delta·frictionMult·(1+ext+leg)·pacingMult + sarajevoExtra)`.
Because `frictionMult` is the pinned-10 friction (§2) and `delta` for a strong faction is
~64 (RS ~27 static fronts·2 + supply·0.1), the product `64·10·1.2 ≈ 768` is **clamped at
200 almost every turn**. So the baseline arc is essentially the pure exponential
`current(t) ≈ 10000·(1 − 0.98ᵗ)` (predicts wk50 = 63.6%, matches measured RS 66%).
**Implication: `pacingMult` only bites below ~200/768 ≈ 0.26** — gentle values (0.5-0.7)
leave the delta clamped at 200 (no-op). The lever is COARSE: to slow a strong faction's
early climb to e.g. effectiveDelta 130 (~35% slower) needs `pacingMult ≈ 0.17`. This is
floor-safe (RS at delta 130 still clears 900 by ~wk11: `10000·(1−0.987¹¹) ≈ 1330`) PROVIDED
the wk0-~10 ramp is left at 1.0 so the climb to the 900 friction floor is untouched.
Curve-authoring rule: keep wk0-10 = 1.0 (hold the floor); use ≤0.2-ish where real early
flattening is wanted; the 1994 plateau likewise needs ≤~0.2 to actually halt the climb.

## 5. Acceptance gate (one-change-per-run; 188w-first; full anchor diff)

1. `matched_osids ≥ 634` AND **full 31-anchor_checks diff byte-compared** (never net matched
   — the de-sat's +4-net masked Brčko; NET is banned here).
2. Engine-health gate PASS all 7 (dead_ops, ghost, stranded, K:W in band, etc.).
3. Exhaustion-curve gate: `first_saturation_week` null / ≥150; `dead_weeks_pct ≤15%`
   (both binding); the arc metrics improve toward the historian shape (advisory).
4. §6 anchors byte-identical (Srebrenica/Žepa fall; Goražde/Bihać/Sarajevo/Teočak hold).
5. 40w structural fingerprint `5cfcf1c8` + 52w golden: expect MOVEMENT (this changes
   internals mid-war) → re-bless only if territory `control_delta` stays within tolerance
   and the move is the intended arc delta; else BLOCK.
6. Fire-weeks (WA wk102 / Carter wk138 / COHA wk139 / Storm wk174) must hold — they are
   exhaustion-threshold-gated downstream events.

## 6. Risks / kill-criteria

- Any faction dipping < ~900 in wk8-14 un-pins CH1 friction → early combat buff → matched
  regression (the 611 failure mode, localized). Mitigate: L1 pacing must not cut the wk0-14
  ramp below the 900 floor. Measure the wk8-14 minimum before adopt.
- The 1994 plateau sits in the CH2 [3000,8000] band → mild tempo shift for ARBiH/HVO.
  If it flips any anchor, bound the plateau depth or accept as a documented tempo delta.
- If L1 alone can't produce a materially-less-concave RS arc within §8.6 without breaking
  the gate, the honest disposition is RETIRE (arc is §8.6-bounded to concavity) + document
  that the residual front-load is the price of the soft-stop — a fidelity ceiling, not a bug.

## 7. Out of scope (documented, not attempted)

- Truly convex-late RS intensification (conflicts with §8.6, owner-KEEP).
- The grade/§6 unpin (Phase-3 casualty-realism, post-1.0 — exhaustion re-pacing has zero
  grade payoff, proven).
- Brčko (`op:brcko:brcko`) — its CH2 tempo channel is one input, but the corridor fix is
  the RS force-density lane + post-1.0; this lane does NOT target it.
