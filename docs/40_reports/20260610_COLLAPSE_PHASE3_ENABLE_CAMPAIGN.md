# Collapse Phase III — ENABLE + 188w campaign (re-floors territory — HELD for owner Phase IV signature)

**SUPERSEDED-BY-EXECUTION:** the unit-mismatch diagnosis in this report was executed by Phase IV-a (`docs/40_reports/20260610_COLLAPSE_PHASE4A_FIRST_FIRE.md`, PR #381, merged). Retained as the provenance of the ~260× exhaustion unit-mismatch finding.

**Date:** 2026-06-10
**Branch:** `feat/collapse-phase3-enable-188w` (off `origin/main`, collapse Phase I merged — #375)
**Status:** MEASUREMENT + §6-VERIFICATION artifact. **NOT a merge.** The new floor is the owner's Phase IV signature, not the agent's.

This is the collapse-pipeline ENABLE run (owner GO: "Enable it"). It flips the entire
Phase 3A→3D pressure/collapse chain ON for a full 40w + 188w campaign, asserts the §6
genocide-rupture invariant under live collapse, and measures territory vs the collapse-OFF
649/712 baseline.

---

## §6 GATE VERDICT: **PASS**

The §6 hard gate is the owner's absolute line: collapse does NOT ship over a §6 regression.
Verified TWO ways against the collapse-ON 188w run (`9f52858e60ef5873`), with the collapse-OFF
188w (`33bdd70d7e0196fa`) as the timing reference:

| §6 assertion | result |
| --- | --- |
| Srebrenica (`op:srebrenica:srebrenica_2`) falls to RS | **PASS** |
| Žepa (`op:rogatica:zepa_2`) falls to RS | **PASS** |
| Goražde (`op:gorazde:gorazde_2`) HELD by RBiH | **PASS** |
| Bihać (`op:bihac:bihac_2`) HELD by RBiH | **PASS** |
| Sarajevo core (`op:centar_sarajevo:sarajevo_dio_centar_sajarevo`) HELD by RBiH | **PASS** |
| Teočak (`op:ugljevik:teocak_krstac_2`) HELD by RBiH | **PASS** |
| `srebrenica_genocide_1995` rupture recorded, `recorded_turn` ≥ 160 | **PASS** (turn **162**) |
| rupture timing IDENTICAL ON vs OFF | **PASS** (162 == 162) |
| rupture perpetrator = RS | **PASS** |
| ALL 9 `ENCLAVE_DEFINITIONS` OSIDs (6 RBiH + 3 HRHB): NO `collapse_damage` entry | **PASS** |
| … NO `capacity_modifier` | **PASS** |
| … `will_not_recover` NOT set | **PASS** |

Evidence:
- **Standalone verifier** `tools/verify_collapse_section6.cjs <on_final_save> --compare <off_final_save>` → `§6 GATE VERDICT: PASS (with OFF-timing compare)`, all assertions green.
- **Canonical regression** `tests/collapse_phase1_g2_section6_invariant.test.ts` → **4 passed** (reads the latest 188w run = the collapse-ON run by mtime).
- Across the ENTIRE collapse-ON 188w run: **`collapse_damage` entries = 0, `capacity_modifier` entries = 0** — Phase 3D wrote no damage anywhere, so the G1 enclave guard never even had to fire. The §6 OSIDs are collapse-inert by a wide margin.

---

## TERRITORY DELTAS — old 649 → new **649** (BYTE-IDENTICAL, no cluster, no scatter)

Apples-to-apples on the SAME checkout (worktree off `origin/main`; the documented floor
`d311eeac`/`5f57d172` was taken on an earlier commit, so this worktree establishes its OWN
collapse-OFF baseline for the comparison — which reproduces 649/712 exactly).

| run | flag | folder structural-fingerprint | `final_state_hash` | painted match |
| --- | --- | --- | --- | --- |
| 40w  | OFF | `3649b3861a87e6ea` | `c209baa10618c7e2` | **655/712** (jan1993, 92.0%) |
| 40w  | ON  | `3649b3861a87e6ea` | `db7870a0bd3b2d13` | **655/712** (jan1993, 92.0%) |
| 188w | OFF | `acb538b04d79af3c` | `33bdd70d7e0196fa` | **649/712** (oct1995, 91.2%) |
| 188w | ON  | `acb538b04d79af3c` | `9f52858e60ef5873` | **649/712** (oct1995, 91.2%) |

- **188w territory diff OFF vs ON: 0 `political_controllers` OSID diffs across all 712.** The 63-OSID oct1995 mismatch set is **byte-identical** between OFF and ON. Faction totals unchanged. Area-weighted match identical (46870 km², 91.3%).
- **40w**: identical territory (655/655). Structural-fingerprint folder tag identical at both horizons.
- The `final_state_hash` moved (`33bdd70d`→`9f52858e` at 188w; `c209baa1`→`db7870a0` at 40w) **only** because collapse/pressure read-model state (`collapse_eligibility`, `collapse_eligibility_tier1`, `local_strain`) is now populated. No territory, no casualties, no exhaustion trajectory moved.
- **WHICH OSIDs changed: none.** No cluster, no scatter, no cascade. Collapse is currently INERT.

### Anchors / benchmarks
- `tests/scenario_anchor_contract.test.ts` + `tests/scenario_historical_painted_anchors.test.ts` → **49 passed** against the collapse-ON run. No sacred anchor broken (territory byte-identical to the 649 floor → all 30 anchors and 6 benchmarks hold by construction).

### Casualty / exhaustion deltas
- **Zero.** `faction.profile.exhaustion = 0.2654313…` at turn 188 — IDENTICAL OFF vs ON and identical across all three factions. Killed totals / exhaustion trajectory unmoved (collapse never wrote a capacity modifier, so nothing fed back into combat or supply).

---

## CONSTANT-TUNING READ (attributed to /scenario-creator-runner-tester)

**Verdict: the ratified Phase-I constants produce an INERT (insufficient) collapse — NOT runaway.** The 649→649 byte-identical territory is the EXPECTED, SAFE outcome of enabling with these numbers. The whole 3A→3D chain is starved at the source:

- `profile.exhaustion` pins at **0.265** for the entire 188-week campaign (identical OFF/ON, identical across factions — it never accrues). Phase 3C Tier-0 gates at exhaustion **70** (authority/cohesion) / **65** (spatial). A field that never exceeds ~0.27 against a 70 gate is unreachable by **~260×** → Tier-0 never eligible → Tier-1 never gated on → `local_strain` never accumulates (0 entities) → Phase 3D writes 0 damage. Collapse cannot fire under the shipped numbers in any scenario.

**The real lever is a UNIT/SCALE-RECONCILIATION bug, not a threshold-magnitude choice:**
1. **(Primary)** Phase 3C Tier-0 reads `faction.profile.exhaustion` (engine scale, in practice pinned <1) against thresholds authored on a **0..100** scale (the "70 = late-war plateau" comment assumes 0..100). These are different units. Phase IV's decisive first change: **reconcile the unit** — either point Tier-0 at a true 0..100 exhaustion measure, or rescale 70/65 to the engine's actual exhaustion range.
2. **(Secondary, real)** `Math.floor` quantization in BOTH Phase 3B (`before + Math.floor(delta)`, `COUPLE_FRACTION=0.02`) AND the existing `accumulateExhaustion` (`Math.floor(inc·…)`, `EXHAUSTION_WORK_DIVISOR=10`) silently discards all sub-unit accrual, so exhaustion barely climbs at all. The floor must be replaced with a fractional accumulator before any threshold tuning will bite.

**Direction:** the constants are far too *cold*, not too hot. Phase IV must rescale/repoint exhaustion (un-gate the chain) FIRST, re-run 188w, read the cascade, THEN touch the SEVERITY/strain floor — **one change per run**, never bundled. Expected late-war behavior to calibrate toward: the Krajina/Storm/Sana cascade collapse (Aug–Sep 1995).

**Calibration risk to the 649 floor right now: NONE.** Byte-identical territory, anchors green, §6 PASS, enclaves provably inert.

**Phase IV flag (hand to gameplay-programmer / game-designer):** confirm which exhaustion field is the *intended* collapse driver before tuning. If `profile.exhaustion` is meant to be 0..100, the bug is upstream (the floored accumulator never lets it climb) and that fix has its own calibration blast-radius — so the exhaustion-scale fix is itself a one-change-per-run lane, validated at 188w, before collapse thresholds are touched.

---

## What changed in this PR (code)

- `tools/scenario_runner/run_scenario.ts`: added a DEFAULT-OFF env gate `COLLAPSE_PIPELINE_ENABLE` (`true`/`1`/`on`/`yes`) that flips the whole 3A→3D chain together (`setEnablePhase3A` + `setEnablePhase3ADiffusion` + `setEnablePhase3B` + `setEnablePhase3C` + `setEnablePhase3D`) at CLI start. Determinism: env read ONCE at process start (no per-turn read, no clock, no RNG). Unset/false = strict no-op → a normal calibration run stays byte-identical.
- `tools/verify_collapse_section6.cjs`: standalone §6 hard-gate verifier (CommonJS, no tsx) that asserts the rupture floor + held enclaves + 9-enclave inertness against a final_save, with optional `--compare` OFF-timing identity.

The Phase 3A/3B/3C/3D engine code is UNCHANGED — only the enable surface + a verification tool are added. `tsc --noEmit` exit 0.

---

## Disposition (tech-arch reconciliation 2026-06-10)

This report lands as a **historical record** via extraction from #379 (closed), not as an
enable PR — the original "CI expected to fail / do not merge" framing applied to #379's
enable surface and no longer applies. The `COLLAPSE_PIPELINE_ENABLE` env gate in
`tools/scenario_runner/run_scenario.ts` described above was intentionally NOT landed: it was
a duplicate, semantically divergent enable surface (#381's `ENABLE_COLLAPSE` gate in
`src/scenario/scenario_runner.ts` already governs that entrypoint). The standalone §6
verifier WAS landed (`tools/verify_collapse_section6.cjs`).

### Open question for D2

#379's gate enabled `setEnablePhase3ADiffusion` (5 flags); the merged #381 gate enables 4
(diffusion OFF). IV-a measured with diffusion OFF. The D2 wire-in must explicitly confirm
diffusion ON or OFF (build-spec Phase II lists 3A coupling as optional).

## Reproduce

```bash
# baseline (collapse OFF)
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs
# collapse ON
COLLAPSE_PIPELINE_ENABLE=true node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs
# §6 gate
node tools/verify_collapse_section6.cjs <on>/final_save.json --compare <off>/final_save.json
# territory + anchors
node tools/compare_painted_vs_sim.cjs <run_dir> --target oct1995
node node_modules/vitest/vitest.mjs run tests/collapse_phase1_g2_section6_invariant.test.ts tests/scenario_anchor_contract.test.ts tests/scenario_historical_painted_anchors.test.ts
```
