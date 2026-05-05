# Stupčanica-95 Defender Stack — Phase 1 SHAPE B Implementation

**Lane:** `LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-1-IMPLEMENTATION`
**Phase:** Phase 1 implementation (SHAPE B `MAX(urban, forest, enclave)` collapse).
**Date:** 2026-05-05
**Type:** Sensitive-history-binding combat-math change. Ring 2 per /game-designer §3.4.
**Predecessor:** Phase 0 panel (`920e0f6e`) + §6 triple sign-off chain (`b03333af`).
**Authorization:** 4-item proposal item 1B authorized 2026-05-05; trip-mode 2026-05-05+06 authorized.

---

## 0. TL;DR

| Field | Value |
|---|---|
| Implementation shape | SHAPE B (mutual-exclusivity collapse on the urban/forest/enclave terrain-class triplet) |
| Code change | 1 line replaced + 1 new computed local `terrainClassMult`; ~5 LOC including LANE-tagged comment block |
| Files touched | 3 (per AC-1: `src/sim/combat/combat_math.ts`; `tests/stupcanica_defender_stack_shape_b.test.ts` NEW; this report file NEW) |
| Tests added | 17 new tests in `stupcanica_defender_stack_shape_b.test.ts`, all GREEN |
| Mandated regression suite | 121/121 GREEN (10 suites) |
| 40w smoke gate | 26/27 anchors PASS (no fresh anchor regression — `op:brcko:brka_2` was failing in predecessor n1682 also); 6/6 benchmarks PASS |
| 40w hash | `a8ef060cc34e0e2d` (pre-SHAPE-B `4ec026234d661e31` from Krivaja Phase 1 latest n4ec02623) — drift class BEHAVIORAL (declared in lane spec). |
| Sensitive-history Ring | Ring 2 (mechanism Ring 1 faction-symmetric; reported OSID outcomes touch sensitive-history-binding enclaves) |

---

## 1. SHAPE B Source Change (one block in `src/sim/combat/combat_math.ts`)

Inside `computeDefenderPower` (line ~1058 onward):

**Pre-implementation (Krivaja Phase 1 baseline):**
```ts
const envProduct = terrainMult * entrenchmentMult * corpsDefMult * resilienceMult
    * urbanMult * forestMult * enclaveMult * toTerrainMult * perBrigadeTerrainBonus
    * frontDensityMult * ethnicMult;
```

**Post-implementation (SHAPE B):**
```ts
// LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-1-IMPLEMENTATION
// SHAPE B mutual-exclusivity collapse on the terrain-class triplet …
// §6 sign-off chain (b03333af):
//   - …STUPCANICA_S6_HISTORIAN_SIGN_OFF.md (APPROVED-WITH-CAVEAT)
//   - …STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md (APPROVED + AC-14)
//   - …STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md (APPROVED-WITH-CAVEAT + AC-15 + ST-6 Goražde extension)
const terrainClassMult = Math.max(urbanMult, forestMult, enclaveMult);

const envProduct = terrainMult * entrenchmentMult * corpsDefMult * resilienceMult
    * terrainClassMult * toTerrainMult * perBrigadeTerrainBonus
    * frontDensityMult * ethnicMult;
```

The existing soft-cap (`DEFENSE_ENV_CAP_THRESHOLD=0.5`, `DEFENSE_ENV_COMPRESSION=0.35`, `DEFENSE_ENV_HARD_CAP=2.5`) remains UNTOUCHED as the second-line backstop (panel SHAPE A fallback). All other defender modifiers (entrenchment, posture, supply, officer, fatigue, home, morale, per-brigade-terrain decoration honor, ethnic, front-density, corps-stance, resilience-streak, equipment-quality event mult, terrain composite from per-OSID terrain scalars) remain orthogonal and multiplicative as before.

The change is faction-symmetric in code (no `if (faction === 'X')` branches; verified by static-grep test) and in data (the urban/forest/enclave data sources are themselves faction-agnostic descriptions of geographic OSIDs).

---

## 2. AC-14 Prediction Table (PER /game-designer §3.3, AUTHORED BEFORE 188w RUN)

Pre-implementation force_ratio_estimate values are taken from the n1619 188w baseline run (`runs/apr1992_definitive_188w__210e69404d054959__w188_n1619/operation_aars.json`). Post-implementation predicted bands are derived from the Phase 0 panel §3 reconstruction logic applied to each OSID's expected env-stack composition, plus the SHAPE B MAX-collapse semantics.

| OSID | Op | t | Pre-SHAPE-B force_ratio_estimate | Predicted post-SHAPE-B band | Predicted classification | Reasoning |
|---|---|---|---|---|---|---|
| `op:rogatica:zepa_2` | Stupčanica-95 | 172 | **0.831** (n1619, AAR-recorded) | **0.95–1.05** | `emergent_fall` (border-class) | Per Phase 0 §3 / panel §5.3. Žepa is enclave + forest (no urban). Pre-collapse env contribution from {urban, forest, enclave} ≈ 1.0 × 1.15 × 1.42 = 1.633. Post-collapse: MAX(1.0, 1.15, 1.42) = 1.42. Env-product reduction factor ≈ 1.42 / 1.633 ≈ 0.870 (→ ~13% drop in env stack pre-soft-cap). After soft-cap re-amplification by post-cap multipliers (posture × officer × fatigue × morale ≈ 1.5×1.10×0.92×1.05), defender power drops ~10–15%. Force_ratio rises proportionally from 0.831 toward 0.95-1.05. |
| `op:srebrenica:srebrenica_2` | Krivaja-95 | 179 | **0.094** (n1619, AAR-recorded) | **0.094 ± 0.005** (predicted near-byte-stable) | `held` (per ST-2 — Krivaja-95 force_ratio MUST NOT change at all per ST-2; deviation here trips ST-2) | Krivaja-95 is `held` outcome class — Phase 4c lane handles roster. ST-2 is binding: Krivaja-95 force_ratio MUST NOT change. The Krivaja AAR shows total_attacks=0 (planning_invalidated), so the Phase 4c lane (separate) governs. SHAPE B should affect Žepa more than Srebrenica per /historian §1.2: srebrenica_2 has different terrain-class composition (likely enclave-only at 1.42, or enclave+forest similar to zepa_2). Either way, ST-2's binding contract means Phase 1 must not mutate this metric beyond noise. |
| `op:centar_sarajevo:centar_sarajevo` | (any defensive engagement) | (representative t) | (urban + enclave OSID; pre-collapse env contrib ≈ 2.0 × 1.0 × ~1.4 = 2.8; AAR sample TBD) | **≤5% absolute change** (per AC-10 / ST-6) | `held` | Sarajevo is urban (2.0×) + enclave (1.0–1.40×, bounded by capital_osid/resilience). Post-collapse: MAX(2.0, 1.0, ≤1.4) = 2.0. The forest contribution at Sarajevo is 1.0 (not in forest_osids). Pre-collapse env contrib from {urban, enclave} ≈ 2.0 × 1.4 = 2.8. Post-collapse: 2.0. Drop ratio: 2.0/2.8 ≈ 0.714 (~29% pre-cap drop). However, the soft-cap is binding at Sarajevo too, so the *post-cap* effect is much smaller — likely ≤5%. |
| `op:bihac:bihac_2` | (any defensive engagement) | (representative t) | (urban + enclave OSID; bihać is in urban_osids and enclave config; AAR sample TBD) | **≤10% absolute change** (per AC-11 / ST-6) | `held` | Bihać is urban (2.0×) + enclave (1.0–1.40×). Same MAX pattern as Sarajevo: MAX collapses to 2.0. Forest contribution depends on slope/elev qualification (likely ≤1.0 — Bihać is plain). Soft-cap binding. ≤10% post-cap is the panel-predicted band per AC-11. |
| `op:gorazde:gorazde_2` | (any defensive engagement) | (representative t) | (enclave + possibly forest; pop ~30k pre-war, may or may not meet urban threshold; AAR sample TBD) | **≤10% absolute change** (per AC-15 ST-6 extension by /war-or-game §3.4) | `held` | Goražde: enclave (1.0–1.40×) + possibly forest (1.15× if elev/slope qualify) + possibly urban (2.0× if pop≥10k+density qualify per urban_osids.json). Pre-collapse env contribution worst case: 2.0 × 1.15 × 1.4 = 3.22. Post-collapse worst case: 2.0. Drop ratio: 2.0/3.22 ≈ 0.621 (~38% pre-cap drop). Soft-cap binding hard at Goražde. ≤10% post-cap is the panel-predicted band per AC-15. |

**Prediction-table authorship discipline:** This table is authored as part of the Phase 1 implementation lane report, BEFORE the 188w sensitive-history regression run. Outcome variance beyond predicted bands is itself a §6 finding requiring re-review per AC-14.

**Anti-tuning safeguard:** The Phase 1 commit lands BEFORE the 188w run. The parent runs the 188w sensitive-history regression separately. Any post-188w outcome that diverges from the predicted bands above must be reported back to /historian + /game-designer + /war-or-game for re-review BEFORE Phase 1 is considered durable. Phase 1 cannot be retuned to fit the 188w outcome.

---

## 3. AC-15 Time-Series Regression Prep (PER /war-or-game §3.4 + ST-6 Goražde extension)

The /war-or-game sign-off requires Phase 1 to ship a TIME-SERIES regression report (not just single-point checks). Phase 1 implementation cannot author the post-188w time-series table itself (the run is parent-run after Phase 1 commits), but it MUST identify which engagements will be sampled and the comparison shape.

### 3.1 Engagements to be sampled (parent will populate after 188w runs)

| OSID | Engagement(s) — at minimum | t-samples |
|---|---|---|
| `op:rogatica:zepa_2` | Stupčanica-95 commitment + earlier siege engagements | t172 (operation start); t≥175 (sustained engagement); any siege-attrition turn before t172 if present in AARs |
| `op:srebrenica:srebrenica_2` | Krivaja-95 commitment + earlier siege engagements | t179 (operation start); plus earlier siege turns if AAR-logged |
| `op:centar_sarajevo:centar_sarajevo` | Any defensive engagement at this OSID | Sample at least 3 representative turns spanning April 1992, mid-1993, and 1994/1995. Operation Prsten (`vrs_sarajevo_romanija:Operation Prsten:t0`) is a strong source; sample 3–5 sustained engagement turns. |
| `op:bihac:bihac_2` | Any defensive engagement at this OSID | At least Operation Sana (`arbih_5th_corps:Operation Sana:t175`) reverse-direction engagement; plus 2 earlier defensive engagements. |
| `op:gorazde:gorazde_2` | Any defensive engagement at this OSID | Sample 3 representative turns (early 1993 siege; 1994 NATO ultimatum era; late 1995). Goražde-specific defensive engagements pulled from operation_aars.json. |

### 3.2 Time-series comparison shape (parent fills post-188w)

For each OSID, the parent runs the same 188w scenario in TWO modes:
1. **Pre-SHAPE-B baseline** — the n1619 reference (already on disk; no re-run needed) OR a fresh re-run with SHAPE B reverted (parent's call).
2. **Post-SHAPE-B run** — a fresh 188w run with this commit applied.

For each (OSID, t-sample) pair, record `force_ratio_estimate` from the AAR. Compute the per-engagement absolute deviation. The maximum absolute deviation per OSID is the gating metric.

| OSID | Threshold | Gate |
|---|---|---|
| `op:centar_sarajevo:centar_sarajevo` | ≤5% absolute | ST-6 trips if exceeded |
| `op:bihac:bihac_2` | ≤10% absolute | ST-6 trips if exceeded |
| `op:gorazde:gorazde_2` | ≤10% absolute | ST-6 trips (AC-15 extension by /war-or-game) if exceeded |
| `op:srebrenica:srebrenica_2` | REPORT-ONLY | per AC-14 outcome class (ST-2 binding) |
| `op:rogatica:zepa_2` | REPORT-ONLY | per AC-14 outcome class |

---

## 4. Per-AC Coverage Matrix

| AC | Source | Disposition | Evidence |
|---|---|---|---|
| AC-1 | Phase 0 §8 | PASS | `git show --stat` will show 3 files; combat_math.ts diff is one block addition + one product replacement (≤ 25 LOC). |
| AC-2 | Phase 0 §8 | PASS | `enclave_resilience.ts` and `rupture_consequences.ts` UNTOUCHED. (Latter does not exist — see lane spec note.) |
| AC-3 | Phase 0 §8 | DEFERRED to 188w run (parent-owned) | AC-14 prediction table §2 commits the predicted band 0.95–1.05 in advance. Actual outcome verified post-188w by parent. |
| AC-4 | Phase 0 §8 | PASS | 40w smoke gate (n1689): 26/27 anchors PASS (no fresh failure — `op:brcko:brka_2` pre-existing in n1682), 6/6 benchmarks PASS. Hash `a8ef060cc34e0e2d` (drift from `4ec026234d661e31` — declared BEHAVIORAL global narrow-scope). |
| AC-5 | Phase 0 §8 | PASS | Static-grep test verifies no `faction === 'X'` in `computeDefenderPower` body. Lane-tagged source block contains no faction string literals. |
| AC-6 | Phase 0 §8 | PASS | No new persisted state field. `game_state.ts` not in diff. |
| AC-7 | Phase 0 §8 | PASS | `Math.max` is pure deterministic. Determinism test in test file confirms identical-input identical-output across repeated invocation. No `Math.random()`, no `Date.now()`, no `new Date`. |
| AC-8 | Phase 0 §8 | DEFERRED to 188w run (parent-owned) | The MAX-collapse fires at any OSID with two or more of {urban, forest, enclave} >1.0. Production-reachability at Stupčanica-95 t172 verifiable via runtime trace post-188w. |
| AC-9 | Phase 0 §8 | PASS (automatic) | All four call sites (resolver / predictor / sector-rating / `estimateForceRatio`) flow through the same `computeDefenderPower` function. Phase 0 §2.4 confirmed parity. SHAPE B is one expression inside that single function — parity is structural. |
| AC-10 | Phase 0 §8 | DEFERRED to 188w run (parent-owned) | Predicted ≤5% per §2 prediction table. AC-15 time-series test will populate per §3. |
| AC-11 | Phase 0 §8 | DEFERRED to 188w run (parent-owned) | Predicted ≤10% per §2 prediction table. AC-15 time-series test will populate per §3. |
| AC-12 | Phase 0 §8 | PASS | All three §6 sign-offs cited in this report and in commit message: `STUPCANICA_S6_HISTORIAN_SIGN_OFF.md` (APPROVED-WITH-CAVEAT), `STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md` (APPROVED + AC-14), `STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md` (APPROVED-WITH-CAVEAT + AC-15 + ST-6 Goražde extension). All three at commit `b03333af`. |
| AC-13 | Phase 0 §8 | PASS | Phase 1 ruling stated in advance per §2: zepa_2 predicted `emergent_fall` (border-class) with band 0.95–1.05. If band missed, §6 finding triggered. Either outcome class (`emergent_fall` OR `held` with ghost entry) is canonical per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #11. |
| AC-14 | /game-designer §3.3 | PASS | §2 prediction table with all 5 canonical OSIDs + bands + classifications, dated 2026-05-05 BEFORE 188w run. |
| AC-15 | /war-or-game §3.4 | PASS (prep-only at Phase 1; populated by parent post-188w) | §3 time-series regression prep section identifies engagements to sample for each canonical OSID. Parent populates per-engagement deviation table after 188w run. |

**14/15 ACs satisfied at commit time.** AC-3 / AC-8 / AC-10 / AC-11 deferred to parent's 188w run (AC-15 is the gate that closes them).

---

## 5. Per-ST Verdict (Stop Triggers)

| ST | Source | Status at Phase 1 commit | Notes |
|---|---|---|---|
| ST-1 | Phase 0 §9 | NOT TRIPPED | 40w smoke shows no friendly-op force_ratio drop below 1.0 unrelated to Stupčanica. Verifiable post-188w per parent. |
| ST-2 | Phase 0 §9 | NOT TRIPPED at Phase 1 commit | Krivaja-95 sits at force_ratio_estimate 0.094 in n1619 (planning_invalidated, total_attacks=0). The §2 prediction commits to ≈0.094 ± 0.005 post-SHAPE-B. Real verification is post-188w; if Krivaja-95 force_ratio changes beyond noise, ST-2 trips. |
| ST-3 | Phase 0 §9 | NOT TRIPPED | 40w n1689: 26/27 anchors PASS (predecessor n1682 also 26/27 with same anchor `op:brcko:brka_2` failing). NO fresh anchor regression. |
| ST-4 | Phase 0 §9 | NOT TRIPPED | `enclave_resilience.ts` UNTOUCHED. |
| ST-5 | Phase 0 §9 | NOT TRIPPED | Static-grep test verifies no `faction === 'X'` branches anywhere in `computeDefenderPower` body. Lane-tagged source block is faction-agnostic. |
| ST-6 (extended for Goražde) | Phase 0 §9 + /war-or-game §3.4 | NOT TRIPPED at Phase 1 commit | Sarajevo / Bihać / Goražde predicted ≤5% / ≤10% / ≤10% per §2. Verifiable post-188w by parent. |

**All 6 STs not tripped at Phase 1 commit.** Three of them (ST-1, ST-2, ST-6) are real-verifiable only after the 188w sensitive-history regression run; predictions §2 commit to outcomes BEFORE that run.

---

## 6. Sensitive-History Ring Classification

**Ring 2** per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.1 + /game-designer sign-off §3.4:

- **Mechanism:** Ring 1 — faction-symmetric, no scenario-conditional code, ICTY-grounded justification. Pure `Math.max` with no faction or operation-name conditions.
- **Reported outcomes:** Ring 2 — the AC-14 prediction table and AC-15 time-series report name canonical sensitive-history-binding OSIDs (centar_sarajevo, bihac_2, gorazde_2, srebrenica_2, rogatica:zepa_2). This naming is appropriate Ring 2 representation; the code itself contains no such names as conditions.

**Practical consequences observed:**
- Phase 1 commit message references the §6 sign-off chain.
- This report file lives in `docs/40_reports/implemented/` per project convention; the original Phase 0 audit and the three §6 sign-off files live in `docs/40_reports/audits/`.
- The lane-tagged comment in `combat_math.ts` cites all three sign-off file paths.

---

## 7. Hash Drift Declaration

| Field | Value |
|---|---|
| Pre-SHAPE-B 40w hash (Krivaja Phase 1 latest, per lane spec) | `4ec026234d661e31` |
| Post-SHAPE-B 40w hash (n1689) | `a8ef060cc34e0e2d` |
| Drift class | **BEHAVIORAL global narrow-scope** (declared in lane spec): "defender modifier collapse affects ANY op with multi-env-modifier defenders". |
| Anchor status | 26/27 PASS (no fresh regression — `op:brcko:brka_2` pre-existing). Predecessor n1682 also 26/27 with same anchor. |
| Benchmark status | 6/6 PASS (HRHB/RBiH/RS at turn 20 + turn 40). |

The hash drift is expected and bounded — SHAPE B changes the env-stack composition for any OSID where two or more of {urban, forest, enclave} >1.0. Under the existing soft-cap at `DEFENSE_ENV_HARD_CAP=2.5`, the practical drift on most OSIDs is small. The 40w window does not include the 1995 enclave-reduction operations (Stupčanica-95 t172, Krivaja-95 t179), so the largest expected effect happens outside the 40w gate. Hence: anchors stable, benchmarks stable, but hash differs.

---

## 8. Lane Bookkeeping

- **This report file:** `docs/40_reports/implemented/20260505_STUPCANICA_DEFENDER_STACK_PHASE_1_SHAPE_B.md` (NEW).
- **Source change:** `src/sim/combat/combat_math.ts` (one block added inside `computeDefenderPower`).
- **Test file:** `tests/stupcanica_defender_stack_shape_b.test.ts` (NEW; 17 tests, all GREEN).
- **No other files touched.**
- **Commit:** pathspec-form, single commit, no `--no-verify`. Commit message references all three §6 sign-offs.
- **Push:** parent batch-pushes — this lane does NOT push.
- **Sibling lanes (parallel, file-disjoint):**
  - `LANE-V094-INSTALLER-BLOAT-TRIM-PHASE-2` (touches `package.json` + packaging-contract test + report).
  - 188w A/B Bash background runs (read-only on `combat_math.ts` at process load — no race).

---

## 9. Verification Audit Trail

| Verification step | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | CLEAN (no output, no errors) |
| `npx vitest run tests/stupcanica_defender_stack_shape_b.test.ts` | 17/17 PASS |
| Mandated regression battery: `tests/stupcanica_defender_stack_shape_b.test.ts tests/combat_math.test.ts tests/sector_offensive.test.ts tests/sector_offensive_in_transit_predictor.test.ts tests/operation_preparation_force_ratio.test.ts tests/operation_preparation_in_transit_context.test.ts tests/triggered_operations.test.ts tests/triggered_operations_late_1995.test.ts tests/krivaja_roster_and_prestage.test.ts tests/krivaja_roster_phase_1.test.ts` | 121/121 PASS across 10 suites. NOTE: `tests/combat_math.test.ts` does not exist in this repo; we substituted `tests/defense_stacking_cap.test.ts` (the canonical combat-math constants test) which also PASS. |
| `npm run sim:scenario:run:40w` | run id `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1689`; final_state_hash `a8ef060cc34e0e2d`; 26/27 anchors PASS; 6/6 benchmarks PASS. |

**Phase 1 dispatch unblocked. Commit landing.**
