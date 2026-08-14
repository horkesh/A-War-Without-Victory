# RS/ARBiH brigade permanent-loss asymmetry — root cause found, fix deferred to post-1.0

**Date:** 2026-08-07
**Status:** Root mechanism CONFIRMED; simple fix (cohesion-floor bump) DISPROVEN as a non-monotonic dead-end; outcome is substantially historical. **Owner decision 2026-08-07: document the engine-health debt and DEFER the structural redesign to a post-1.0 "combat-earned cohesion" lane.** No engine change shipped. Closes the R6 "deeper engine-health investigation" chunk (owner directive: "engine health is sacrosanct, the anchors are a symptom"). Supersedes the "root not found" state in `docs/plans/2026-07-31-historical-gameplay-depth-calibration-plan.md` Task 0.3.

## The root mechanism

Permanent brigade loss is gated on cohesion (dissolution is a 2-of-3 gate: personnel<400 / **cohesion≤20** / morale≤15). Each faction has a cohesion **floor** it cannot drift below (`getFactionCohesionFloor`, `src/sim/combat/faction_progression.ts` — but the *effective* value is the `war_timeline` data in `data/scenarios/timelines/apr1992.json` `cohesion_floor`, which OVERRIDES the hardcoded function; a code-only change is a no-op). The two factions' floors sit on **opposite sides of the ≤20 dissolution threshold**:

- **RBiH floor = 62** — 3× above the criterion → ARBiH is structurally **cohesion-immune** (a firewall).
- **RS floor = 20** — exactly **at** the criterion → RS brigades float permanently one-criterion-from-death; ordinary personnel<400 attrition then tips the 2-of-3 gate.

**Smoking gun (active brigade-turns, 188w run n157):** cohesion≤20 hit **RS 4,127 vs RBiH 5** (of 22,117). Min cohesion ever reached: RBiH 7.5, RS 0. RBiH hit personnel<400 1,142× and morale≤15 57× but paired them essentially never — the 62 floor blocks the second criterion.

**Fate over 188 weeks:** RBiH **0** brigades destroyed/dissolved, RS **28** (ALL in turns 171–187, the fall-1995 cliff), HRHB 2. Reconstitution is faction-**symmetric** (RS reconstitutes most, 8×) — so the asymmetry is "ARBiH never dies," NOT "ARBiH recovers." `morale_drift`'s asymmetric win/loss multipliers are a downstream **amplifier** (morale bound only 10/28 RS deaths), not the gate.

## Why the simple fix is a dead-end (probe evidence)

Raising the RS cohesion floor (timeline `cohesion_floor.RS`) reduces RS dissolution but **non-monotonically wrecks territory calibration** — there is no tunable sweet spot ≥ the 634 committed floor:

| RS floor | matched_osids | RS destroyed | §6 |
|---|---|---|---|
| 20 (baseline n157) | **634** | 28 | intact |
| 25 (probe A′) | **623** | 19 | Bihać −1, Sarajevo drift |
| 30 (probe A) | **629** | 17 | Bihać −1 |

Floor 25 gives *worse* matched (623) than floor 30 (629) — chaotic perturbation of the fall-1995 western combat, not a smooth lever. Both break §6 Bihać (RBiH7 → RBiH6/RS1). K:W stayed in band; both RETIRED. (Branch `codex/rs-cohesion-floor-probe`, RETIRE commits `e753797ff` floor-30, `327e7e3aa` floor-25 — kept for reproducibility, not merged.)

## The decisive reframe: the outcome is substantially historical

Much of the RS fall-1995 dissolution is **historically correct** — it IS the real western VRS collapse (Operations Storm/Sana/Mistral: 1st/2nd Krajina and Herzegovina corps shattered Sept–Oct 1995). Suppressing it via the floor makes RS **over-hold territory that historically fell** → matched craters and Bihać/Sarajevo drift. So "RS over-dissolves" is only *partly* a flaw; the cliff is largely real, and the eastern anchors (Zvornik/Doboj/Gračanica) already hold at the baseline floor.

The genuine engine-health debt is that the mechanism is **scripted, not combat-emergent** (a monotonic cohesion floor/drift), which (a) makes ARBiH literally unable to lose a brigade in combat and (b) pre-dooms RS regardless of tactics — even though the aggregate *outcome* lands near history. The sharper residual flaw is the **ARBiH 0-loss side**, and even that is partly defensible: ARBiH's historical catastrophe (Srebrenica's 28th Division) is modeled as a scripted enclave-fall **event** with displacement, not combat dissolution.

## Disposition — DEFERRED to post-1.0 (owner decision 2026-08-07)

The pre-1.0 outcome is roughly historical and not blocking; the simple fix is disproven; the real fix is a large, §6-loaded, calibration-risky structural redesign. Same disposition as this session's deferred scoring grade-unpin and the deferred Phase 4 exhaustion refactor.

**Post-1.0 lane — "combat-earned cohesion":** make cohesion a function of actual combat outcomes for BOTH factions — shrink the scripted ambient drift and narrow the floor/ceiling railroad so RS dissolution reflects real defeats (not a scripted floor-at-threshold) and ARBiH can take genuine, historically-bounded losses without breaking the enclave-event model. Multi-run, §6-panel-gated (touches atrocity-adjacent brigade fate and the calibration floor). The `getFactionCohesionFloor` / timeline `cohesion_floor` coupling and the `morale_drift` multipliers are the levers; the 634 floor + 31 anchors + §6 are the guardrails. Do NOT attempt as a pre-1.0 tuning pass — the floor sweep proves it needs the full redesign, not a number.
