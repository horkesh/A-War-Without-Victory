# R6 Task 0.3 — Morale-arc investigation (owner: "investigate the professional↔rabble reversal")

**Date:** 2026-08-06. **Run:** `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n148` (current baseline). **Method:** mean brigade morale + combat-effective count (`compute_combat_effective.ts` rule: active brigade-kind, personnel≥200 & morale≥40) computed per faction from `initial_save.json` (turn 1) and `brigade_temporal_log.jsonl` (per-brigade per-turn) at week snapshots. Pure data analysis, no rerun.

## Owner hypothesis under test
> "ARBiH starts as rabble, VRS as professional. Then their arcs reverse. VRS ends as rabble and ARBiH as professional force."

## Finding 1 — brigade morale STARTS FLAT (60/60/60), not asymmetric
At turn 1, mean brigade morale is **RBiH 60.0 / RS 60.0 / HRHB 60.0** (78/77/30 active, all combat-effective). The intended "professional vs rabble" asymmetry is **not** encoded in starting brigade *morale* — it lives in `officer_quality` / `cohesion` in the OOB (e.g. `arbih_general_staff` quality 0.12 / cohesion 38 vs `vrs_main_staff` 0.75 / 72). So the entire end-state morale reversal is an *emergent* product of `morale_drift` dynamics + combat exposure, not a modeled starting arc.

## Finding 2 — the reversal is real, directionally + timing-historical
| week | RBiH mor/eff/n | RS mor/eff/n | HRHB mor/eff/n |
|---|---|---|---|
| 1 | 59 / 74 / 80 | 65 / 79 / 79 | 60 / 34 / 34 |
| 26 | 84 / 101 / 111 | 67 / 67 / 81 | 65 / 29 / 33 |
| 52 | 88 / 108 / 117 | 65 / 62 / 81 | 59 / 15 / 33 |
| 80 | 91 / 116 / 122 | 74 / 60 / 81 | 56 / 16 / 33 |
| 104 | 93 / 115 / 121 | 80 / 60 / 81 | 63 / 19 / 36 |
| 140 | 90 / 115 / 124 | 74 / 59 / 82 | 64 / 22 / 40 |
| 170 | 85 / 121 / 125 | **61 / 52 / 81** | 63 / 22 / 40 |
| 178 | 98 / 125 / 125 | **33 / 5 / 58** | 73 / 34 / 40 |
| 187 | 96 / 125 / 125 | **34 / 7 / 53** | 65 / 27 / 40 |

- RBiH climbs from ~59 to ~96 and grows its effective force (74→125) — a genuine rabble→professional arc.
- RBiH overtakes RS in morale by **week 26** already (84 vs 67) — the crossover is very early.

## Finding 3 — the RS decline is a CLIFF, not an arc (weeks 170→178)
RS holds a coherent ~60–80 morale / ~55–60 effective through **week 170**, then collapses in **8 weeks**:
- morale **61 → 33** (halved), combat-effective **52 → 5** (−90%), active brigades **81 → 58** (23 destroyed).
- By week 187: **34 morale, 7/53 effective** (the documented endpoint).

This is a **feedback death-spiral**, not gradual `morale_drift` compounding: RS loses brigades → sectors thin (RS territory-per-brigade 7.9 vs RBiH 3.4, per Step 3) → each survivor faces more attacks → more defeats → 1.3× defeat morale loss → more dissolution → repeat.

## Synthesis — the anchors are a symptom of a fall-1995 overshoot
Week 178 ≈ **mid/late 1995** from an April-1992 start. The real VRS *did* collapse in the west in fall 1995 (Operations Storm/Mistral/Sana), so a sharp RS decline here is **directionally and chronologically historical**. The problem is **magnitude**: the sim drives RS to *near-total* collapse (5–7 of 53 effective), whereas the historical VRS remained a **spent but coherent** army that **held eastern Bosnia — including Zvornik, Doboj, Gračanica — through Dayton.**

**This reframes Task 0.3:** the three anchors do not fall from a local sector bug. They fall because the *entire RS army* death-spirals in fall 1995, hollowing out even the eastern sectors it historically held. This is exactly why all five prior local anchor-fix designs cascaded — they treated a symptom of an army-wide collapse.

## Implied fix direction (for owner decision — NOT yet a committed experiment)
Bound the fall-1995 RS collapse to "spent but coherent," not "erased." Candidate single-change levers, each to be run one-at-a-time per the sacred rule with the new morale instrumentation (`engine_health_gate.cjs` mean-morale/combat-effective):
1. A **morale floor / dissolution brake** that engages once a faction is already hollowed (breaks the positive-feedback spiral) — leaves the historical decline, caps the death-spiral.
2. **Dampen the 1.3× defeat multiplier late-war** (or cap cumulative defeat-driven loss) so repeated defensive losses erode but don't annihilate.
3. Model the **professional/rabble START** in morale (VRS higher, ARBiH lower at turn 1) so the reversal is a genuine crossover rather than "RBiH climbs from equal footing" — historically truer, and may change the fall-1995 dynamics.

The reversal itself is a **feature to preserve** (it matches the war). The target is the *overshoot into mechanical collapse*, which is what breaks the eastern anchors. Given the 5-design cascade history + calibration/canon stakes, the actual experiment should be designed with the owner / a panel before any 188w tuning.
