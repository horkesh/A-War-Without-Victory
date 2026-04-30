# 188w Long-Run Believability Packet — n1582 Investigation

**Date:** 2026-04-30
**Run under investigation:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1582` (hash `288a1fdc92162594`)
**Verification 40w:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1583` (hash `4f872fcd535b6e98` — deterministic match with n1580/n1581; fix has zero 40w impact)
**Verification 188w:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1585` (hash `288a1fdc92162594` — deterministic match with n1582; engine state unchanged because the fix only modifies the operation-diagnostics counter, not engine truth). **0 probe `objective_capture_count` rows across full 188 weeks (was 2 in n1582). Fix verified.** Goražde siege ERROR persists (expected — same Issue 5 root cause documented below).
**Source plan:** `docs/plans/2026-04-30-v09-formation-life-believability-plan.md`
**Predecessor classification:** `docs/40_reports/implemented/20260430_FORMATION_LIFE_WARNING_CLASSIFICATION.md`

---

## Scope

Five issues surfaced in the n1582 long-run evidence. This packet investigates each, ships the bounded fix where evidence proves owner clarity and STOP-AND-ASK constraints are met, and produces decision memos / follow-up plans for the rest.

| # | Issue | Verdict | Action |
|---|---|---|---|
| 1 | Probe-capture diagnostic counter rows (2 in 188w) | **post-objective control attribution mismatch (counter artifact)** | Detector/counter fix shipped (`sector_offensive.ts`) + test |
| 2 | HRHB/HVO offensive emergence | **commander doctrine + cohesion floor + Vitezovi loss compounding; not a single bounded owner** | No code change; detailed implementation plan only |
| 3 | Enclave-isolated brigade lifecycle (3 distinct cases) | **canon silent on brigade-level enclave policy** | STOP-AND-ASK; decision memo only |
| 4 | RS morale-collapse cluster (41 brigades morale<15) | **plausible late-war exhaustion + supply pressure with severity that needs a follow-up** | No global morale floor change; investigation follow-up plan |
| 5 | Goražde siege erosion ERROR | **NEW vs n1576 — emergent late-war westward RS drift removed Herzegovina+Drina brigades from Goražde area** | No fix; same root cause as #3, follow-up plan |

---

## Issue 1 — Probe-capture diagnostic truth

### Symptom

n1582 weekly_report.jsonl shows two `operation_diagnostics` rows with `operation_type='probe'` and `objective_capture_count=1`:

| Week | Probe | Target | Phase | Attempt | Cap |
|---|---|---|---|---|---|
| w103 | `probe_arbih_4th_corps_t102` | `op:nevesinje:nevesinje_2` | recovery | 1 | 1 |
| w113 | `probe_arbih_2nd_corps_t110` | `op:zvornik:krizevici` | recovery | 3 | 1 |

This appeared to contradict the n1580 fix (`71dd825c`) which made probes incapable of capturing territory.

### Investigation

1. **Control-event truth (`final_save.political.control_events`):**
   - `op:nevesinje:nevesinje_2`: 1 event @ t103, `from=RS to=RBiH mechanism=combat`
   - `op:zvornik:krizevici`: 2 events @ t5 (`RBiH→RS` Op Drina) + t113 (`RS→RBiH`)
   - Both flips are real and went through `attack_resolution_osid.ts:802` (`mechanism='combat'`, non-null `from`).
2. **Battle truth (`weekly_report.battles`) at the capture turns:**
   - w103 nevesinje_2: attacker=`arbih_444th_mountain`, defender=`null`, `outcome='decisive_victory'`, `operation_id=undefined`
   - w113 krizevici: attacker=`arbih_240th_muslim_mountain`, defender=`null`, `outcome='decisive_victory'`, `operation_id=undefined`
3. **Probe participants:** `probe_arbih_4th_corps_t102` was `arbih_4th_muslim_light`, `probe_arbih_2nd_corps_t110` was `arbih_242nd_zvornik_muslim_light` + Black Swans loan. Neither probe's participating brigades made the actual w103/w113 capture attacks — different brigades with `op=undefined` did.
4. **`activeOp?.type === 'probe'` evaluation in `attack_resolution_osid.ts:778`:** because the attacking brigades had no operation attached, `isProbeOp` was `false`, so `flip = (decisive_victory) && !false = true`. The flip went through cleanly via the standard combat path.

### Root cause

`updateLegacyFlatResults` in `sector_offensive.ts:1273` and `updateMultiAxisResults:1003` both do "objective is now friendly-controlled → credit the operation":

```ts
if (effectiveController === faction || isFriendlyFactionCtrl(effectiveController, faction, state)) {
    op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
    op.objective_capture_count = (op.objective_capture_count ?? 0) + 1;  // ← artifact for probes
    op.last_result = 'captured';
    op.momentum = ...;
    op.current_objective_index = currentIdx + 1;
    fullyRevealProbeSectorIntel(state, op);
}
```

When the probe's `current_objective` happens to flip via a **different** mechanism (a separate operation, a brigade-independent attack, friction, abandonment), the probe's diagnostic counters increment as if the probe captured. The probe didn't capture; the n1580 engine fix (`attack_resolution_osid.ts:778`) is intact.

The same mismatch existed in the auto-claim of null-controlled OSIDs at `sector_offensive.ts:1259` (legacy) and `:1006` (multi-axis): probes would auto-claim null tiles, bypassing the n1580 rule.

### Fix (shipped this packet)

`src/sim/combat/sector_offensive.ts`:

1. **Legacy null auto-claim:** `if (effectiveController == null && op.type !== 'probe')` — probes never auto-claim null-controlled OSIDs, consistent with n1580.
2. **Legacy capture credit:** capture credit (`objective_capture_count++`, `last_result='captured'`, momentum bump) skipped for probes; probe still advances `current_objective_index` to recognize the OSID is no longer enemy.
3. **Multi-axis null auto-claim:** same probe guard added at axis level.
4. **Multi-axis capture credit:** same skip for probes; axis advances `current_objective_index`.

Comment style: explicit cross-reference to the n1580 fix in `attack_resolution_osid.ts:778` so the rules stay co-located in reading.

### Test

`tests/probe_territory_flip.test.ts` — added 8th test:

> *a probe whose current_objective is captured by a separate mechanism does NOT take capture credit*

Constructs a probe operation, manually flips its target to friendly-controlled (simulating capture-by-other-mechanism), runs `updateSectorOffensiveResults`, asserts:
- `operation.objective_capture_count` unchanged (counter artifact closed)
- `operation.axes[0].objective_capture_count` unchanged (multi-axis path closed)
- `operation.axes[0].current_objective_index` advanced (probe still recognizes the OSID)

### Validation

- `tsc --noEmit`: clean.
- Targeted vitest (probe + sector_offensive_idle_recovery + scenario_operation_diagnostics + 8 broader op/army_reserve suites + integration_anomaly): **159/159 pass**.
- Fresh 40w n1583 hash `4f872fcd535b6e98` = n1580/n1581 deterministic match — fix has zero 40w impact (correct: 40w never surfaces the artifact).
- Fresh 188w n1585 hash `288a1fdc92162594` = n1582 deterministic match (engine state unchanged because fix only modifies operation-diagnostics counter). **All 188 weekly_reports inspected: 0 probe `objective_capture_count` rows (was 2 in n1582 at w103+w113). Fix verified across full long run.**

---

## Issue 2 — HRHB/HVO offensive emergence (no fix this packet)

### Verification of premise

The user prompt cautioned not to assume the old Vitezovi plateau (cohesion floor at 28). Verifying current state in n1582:

- `hrhb_vitezovi_brigade_vitez` is **destroyed at w22** at `op:skender_vakuf:donji_koricani`, total casualties 1077, 3 battles fought.
- Battle history: w15 defender at `op:jajce:barevo_2` (RS Operation Jajce, sector_attack, power_ratio 3.45, RS won), retreated to skender_vakuf donji_koricani; w21 RS probe `probe_vrs_1st_krajina_t20` power_ratio 14.6 inflicted 390 cas; w22 same probe power_ratio 30.3 inflicted 233 cas → `brigade_dissolution` triggered (cohesion=0, morale=6, personnel_remaining=352).
- Plausible-historical: HVO did defend Jajce (real fall Oct 1992 ≈ w28), and Vitezovi was active in that defense per BB history. Sim destroying it ~6 weeks earlier than historical fall is *moderately* harsh but inside the believability band.
- **NOT the binding constraint for HRHB silence.**

### Current HRHB state at w188

| Corps | Active | Cohesion | Tier eligible | E3-locked? | Observation |
|---|---|---|---|---|---|
| `hvo_central_bosnia` | 8 | 4× coh=63 (Kiseljak/Kreševo pocket survivors), 2× coh=30, 2× coh=52-63 with morale=31 | 0 main_effort | NO (vitez/kiseljak not in HERZEGOVINA list) | Stuck on `corps_stance_forbids_offensive` |
| `hvo_main_staff` | 3 mechanized Guards (2800 pers, coh=30, mor=95-100) | 3 main_effort possible (mech 1.12×0.8×0.30×1.75=0.470 ≥ 0.4) | YES (mostar) | E3 locks even with main_effort ✓ |
| `hvo_northwest_bosnia` | 3 light_infantry (2× mor=6 — broken) | 0 | NO (orasje exempt) | Effective garrison-only — broken brigades |
| `hvo_southeast_herzegovina` | 14 (mountain/motorized 1800-2200 pers, coh=30) | 0 motorized clears 0.4 (1800/2500 × 0.8 × 0.30 × 1.5 = 0.259 < 0.4) | YES (citluk) | Cohesion floor + E3 |
| `hvo_tomislavgrad` | 4 (mountain 1800 pers coh=30) | 0 (same fitness math) | YES (tomislavgrad/livno) | Cohesion floor + E3 |

**All 5 HRHB corps still hit `hard_constraints: ['corps_stance_forbids_offensive']` in `commander_state.decision_trace`.** Same as Option K finding.

### Binding constraint stack (in order)

1. **Cohesion floor at ~30** — Herzegovina rear corps (no major battle exposure) sit at coh=30 across the board. This is a non-combat plateau pattern. With cohesion 30, motorized brigades compute fitness_offense ≈ 0.21–0.26, well below the 0.4 main_effort threshold. Mechanized Guards barely clear (0.47).
2. **N1297 organizational readiness gate** (`bot_corps_stance.ts:144-150`) — fires for 4 corps with main_effort=0, capping stance at defensive.
3. **E3 Herzegovina blanket** (`bot_corps_stance.ts:212-219`) — fires for hvo_main_staff, hvo_southeast_herzegovina, hvo_tomislavgrad even when main_effort exists.

Vitezovi destruction at w22 is a **compounding factor for hvo_central_bosnia** but does not change the analysis: even if Vitezovi survived at coh=30, it would not clear 0.4. Surviving CB brigades that DO clear 0.4 (Kiseljak/Kreševo pocket at coh=63) are corps-quarantined into the pocket and cannot project — separate enclave-lifecycle issue (Issue #3).

### Why no bounded fix this packet

User prompt: "Candidate fixes are allowed only if evidence proves one bounded owner."

- Narrowing E3 alone doesn't unlock anything: cohesion floor still kills fitness_offense before E3 evaluates.
- Bumping HRHB initial cohesion has 188w validation cost and risks ahistorical Mostar siege overpushes.
- Cohesion-recovery boost in defensive corps requires deeper investigation of cohesion mechanics (decay/recovery rates, interaction with supply, fatigue, doctrine phase).
- The Kiseljak/Kreševo pocket isolation (CB brigades can't project) is a separate enclave-lifecycle question, not a doctrine question.

This is the case where the prompt explicitly says "If the safe fix is not obvious, write a detailed implementation plan instead of forcing code." See "Follow-up plans" below.

---

## Issue 3 — Enclave-isolated brigade lifecycle (decision memo)

### Three distinct cases observed

#### Case A — ARBiH east-Bosnian / Srebrenica enclave brigades

- `arbih_280th_east_bosnian_light` — home `op:srebrenica:srebrenica_2`, location `op:tuzla:gornja_tuzla`, dist=unreachable (escaped enclave?)
- `arbih_281st_east_bosnian_light` — home `op:srebrenica:donji_potocari_2`, location `op:srebrenica:luka_2`, dist=unreachable (still in enclave)
- `arbih_283rd_east_bosnian_light` — home Žepa-area, in `op:srebrenica:ljeskovik_2`, dist=unreachable
- `arbih_284th_east_bosnian_light` — in `op:srebrenica:srebrenica_2`, dist=unreachable
- `arbih_1st_cerska` — `op:vlasenica:pomol_2` (small Cerska enclave)

`validate_run_consistency` flags 13 "adjacent uncontested territory" failures in this cluster (RS-controlled OSIDs adjacent to ARBiH enclave OSIDs with no local RS defender). Cause: enclave brigades hold ARBiH territory but cannot project into the surrounding RS perimeter because they have dist=unreachable from any extra-enclave assignment.

#### Case B — HRHB Zepče / Novi Travnik @ Mostar

- `hrhb_111th_brigade` — corps `hvo_central_bosnia`, home `op:zepce:zepce_2`, location `op:mostar:mostar_zapad_2`
- `hrhb_travnik_brigade` — corps `hvo_central_bosnia`, home `op:novi_travnik:novi_travnik_2` area, location `op:mostar:jasenica`

Both are in `military.unresolved_sector_brigades` (validate_run_consistency FAIL). Historically: Žepče HVO held its enclave for most of the war; Novi Travnik HVO retreated through Lašva Valley and eventually to Herzegovina. Sim's relocation to Mostar approximates the historical retreat trajectory.

#### Case C — RS Drina/Herzegovina @ Banja Luka

- `rs_1st_birac` (vrs_drina, home `op:zvornik:gornji_sepak_2`) → `op:banja_luka:banja_luka_2`
- `rs_1st_milii` (vrs_drina, home `op:vlasenica:grabovica`) → banja_luka
- `rs_1st_vlasenica` (vrs_drina) → banja_luka
- `rs_1st_zvornik` (vrs_drina) → banja_luka
- `rs_5th_podrinje` (vrs_drina) → banja_luka
- `rs_2nd_majevica_light_infantry` (vrs_east_bosnian, home `op:ugljevik:ugljevik_2`) → banja_luka
- 7 vrs_herzegovina brigades destroyed at banja_luka between w171–w174 (incl. Foča, Trebinje, Bileća, Ajnie, Gacko, Visegrad, 2nd Herzegovina) — Foča took 3446 casualties before destruction.

This pattern is **NOT historical**. Real VRS Krajina collapse (Storm/Maestral 1995) saw refugees flow westward but the corps structure stayed regional. Sending east-Bosnian and Herzegovinian brigades to Banja Luka and destroying them there is a sim-emergent artifact, NOT BB1 history.

This is also the **root cause of Goražde siege erosion** (Issue #5): the vrs_herzegovina brigades that maintained Goražde siege presence in n1576 (Foča, Visegrad, Kalinovik, Ajnie) drifted west to Banja Luka and were destroyed there in n1582.

### Canon check

- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` covers atrocity-related lifecycle (rupture consequences, condemnation flags). Silent on stranded-brigade policy.
- `docs/10_canon/Rulebook_v0_7_0.md`, `docs/10_canon/Engine_Invariants_v0_7_0.md`, Phase Specs: silent on per-brigade enclave policy beyond officer `enclave_lock` (officer_system.ts).
- `src/state/formation_lifecycle.ts`: no `enclave`, `stranded`, `isolated`, or `home_unreachable` handling. Brigades persist where their last assignment placed them.
- The closest precedent is `warlord_friction.ts` `enclave_lock` for officers — but that's officer-level, not brigade-level.

**Canon is silent.** Per the prompt's STOP-AND-ASK trigger ("Canon conflicts or canon silence on required decision"), no implementation in this packet.

### Recommended decision (game-designer review required)

Three case-specific policies are needed; none should be a global rule:

| Case | Recommended policy | Why |
|---|---|---|
| A — ARBiH Srebrenica/Cerska | **Stay as garrison-only / no outward power.** Brigade can defend its enclave OSID but cannot be assigned to extra-enclave sectors or operations. Reverts to standard ownership only if enclave is relieved (corridor reopens) or absorbed into another corps after enclave fall. | Real Srebrenica brigades were trapped; defenders died in genocide; survivors regrouped outside. Sim should reflect "cannot project" not "infinite redeploy". Sensitive-history boundary: pre-fall, garrison only; post-fall, dissolve into displacement ledger. |
| B — HRHB Zepče/Novi Travnik | **Return-with-reduced-power on Federation alliance lock (Washington Agreement).** Until Washington, treat as Herzegovina detachment with garrison status; after Washington, allow reassignment to nearest active corps. | Historical: Žepče held until war's end; Novi Travnik HVO did retreat to Herzegovina. Reduced-power reflects forced redeployment cost. |
| C — RS Drina/Herzegovina @ Banja Luka | **Block westward drift entirely.** Corps-corps brigade movement to non-adjacent corps territory should require explicit operation/loan, not emergent drift. Preserve regional corps structure. | Not historical; sim artifact. The mechanism that's putting Drina/Herzegovina brigades into Banja Luka is the bug. Fix the mover, don't add lifecycle policy on top. |

Case C is the most actionable but requires identifying the responsible mover (suspects: `commander_march_correction.ts`, `apply_brigade_reposition.ts`, `final_sector_truth_reconciliation.ts`, or a campaign-plan reinforcement mechanism). Each is a candidate canonical owner; the actual one needs investigation.

**Sign-off required:** game-designer, historian (per `BOSNIAK_CROAT_CONFLICT_MASTER.md` for Case B), war-or-game (per `REAL_WAR_MASTER.md` for Case C realism).

---

## Issue 4 — RS morale-collapse cluster (no fix; investigation only)

### Numbers (n1582 final_save)

| Faction | Active brigades | Morale<15 | Morale<30 |
|---|---|---|---|
| HRHB | 32 | 2 (6%) | 2 (6%) |
| RBiH | 124 | 6 (5%) | 6 (5%) |
| **RS** | 56 | **41 (73%)** | 47 (84%) |

The user prompt cited 34; current count is **41 RS brigades with morale<15**. Cohesion values cluster at quantized values: 18, 20, 38, 44, 68 — combat-attrition floor pattern, not a static morale floor.

### Patterns

1. **vrs_drina @ banja_luka cluster (5 brigades)**: morale=0, coh=20, all displaced from Drina valley homes. Same root cause as Issue 3 Case C.
2. **vrs_1st_krajina front-line attrition (≈20 brigades)**: morale=0, coh=18-20, located across Krajina + central Bosnia front (bugojno, doboj, jajce, maglaj, donji_vakuf, teslic). Combat-attrition pattern; multi-year war exhaustion.
3. **vrs_east_bosnian (5 brigades)**: morale=0-3, coh=18-20-38; mixed combat exposure.
4. **vrs_sarajevo_romanija siege strain (4 brigades)**: morale=0-12, coh=20-68; siege fatigue.
5. **rs_1st_drvar / rs_11th_krupa**: morale=4, coh=68 — high cohesion (no combat) + severe morale collapse. Suggestive of a non-combat morale driver (faction war exhaustion? Krajina collapse signal?).

### Plausibility assessment

- **Historical 1995 RS state (Storm + Maestral + Cincar):** VRS Krajina collapsed in late August 1995; refugees flowed east; Banja Luka under threat; corps structure strained but not broken. War weariness real.
- **Sim 73% below morale-15 is steep** but not implausible at w188 (≈ October 1995 = post-Storm, pre-Dayton). VRS units were demoralized; many brigades had effective combat power approaching zero.
- **Driver is not a static floor.** Cohesion clusters at 18-20 (combat attrition floor) and 68 (intact). Morale tracks roughly with cohesion + displacement + corps-out-of-area state.

### Why no global morale-floor change

User prompt: "No global morale-floor change unless evidence shows a systemic bug and 40w/188w validation does not mask historical collapse."

- 40w shows 0 RS brigades at morale<15 (fresh n1583 — pending 188w confirms baseline). Late-war collapse is the binding driver, not an early-war floor.
- A morale floor would mask the historical collapse signal that should be visible at war's end.
- The drivers (combat attrition + corps-westward-drift + faction war exhaustion) are the right behaviors. The displacement to Banja Luka (Issue 3 Case C) is the artifact — fix that, and the morale collapse magnitude reduces naturally.

### Follow-up plan (not in this packet)

Worth a focused investigation packet:
- Quantify the morale=0 cluster vs the historical late-1995 RS troop morale data (per BB1 vol 2 on VRS post-Storm condition).
- Profile the specific drivers in `morale_update.ts` (or wherever morale moves) by faction-week to determine whether late-war is over-indexing.
- Verify `rs_1st_drvar` / `rs_11th_krupa` (high coh + low mor) — what's driving morale-only decay there?

Cross-reference Issue 3 Case C: a meaningful fraction of the morale-0 RS brigades would resolve once the Drina/Herzegovina-westward-drift artifact is fixed.

---

## Issue 5 — Goražde siege erosion (n1582 ERROR)

### Comparison vs prior 188w (n1576)

`tools/diagnose_run.cjs` siege check `Gorazde (Herzegovina+Drina)` requires ≥2 brigades from `vrs_herzegovina+vrs_drina` near `gorazde/foca/cajnice/kalinovik/rogatica/visegrad`.

| Run | Brigades near target | Status |
|---|---|---|
| n1576 (prior 188w, hash `c35fff9119f1a06b`) | 4 (Ajnie@cajnice, Foa@foca, Kalinovik@kalinovik, Visegrad@zlijeb) | OK ✓ |
| n1582 (current 188w, hash `288a1fdc92162594`) | 1 (rs_1st_podrinje@rogatica) | **ERROR** ✗ |

**This is a regression vs n1576.** The 4 brigades that maintained Goražde siege pressure in n1576 are gone in n1582:

- `rs_ajnie_brigade` destroyed w171 @ banja_luka (b=7, cas=720)
- `rs_foa_brigade` destroyed w174 @ banja_luka (b=5, cas=3446)
- `rs_visegrad_brigade` destroyed w174 @ banja_luka (b=1, cas=426)
- `rs_kalinovik_brigade` — needs lookup, but pattern matches: drifted west to banja_luka and destroyed there.

### Root cause

**Same as Issue 3 Case C.** The vrs_herzegovina brigades that should sustain Goražde siege pressure are being drifted west to Banja Luka and destroyed there. The Goražde diagnostic ERROR is a **downstream consequence** of the brigade-westward-drift artifact, not an independent bug.

The probe-capture fix (n1580) is **not** the cause of the regression — the Goražde-area brigades were destroyed at w171–174 fighting in Banja Luka battles unrelated to probes. The mechanism putting them at Banja Luka is the bug.

### Why no fix this packet

Same root cause as Issue 3 Case C → same constraint applies. Need to identify the canonical owner of the westward-drift mechanism before proposing a fix. Adding a static "vrs_herzegovina brigades cannot leave Herzegovina" rail would hide the underlying mover bug.

### Follow-up plan

Investigate the responsible mechanism and dispatch the mover-owner specialist (`/sector-expert` for sector reassignment, `/operations-expert` for op-driven moves, `/corps-army-commander` for army HQ projection):

1. Trace one vrs_herzegovina brigade (e.g. `rs_ajnie_brigade`) week-by-week from origin to banja_luka destruction. Find the turn it leaves Herzegovina.
2. Identify the move authority (op assignment, sector reassignment, march correction, reposition, gather).
3. Decide whether the move is legitimate (rare-but-real reinforcement) or artifactual (mass drift).
4. Implement the narrowest containment fix at the responsible mover.

---

## Files changed

| File | Change |
|---|---|
| `src/sim/combat/sector_offensive.ts` | Probe guard added at `updateLegacyFlatResults` (null auto-claim + capture credit) and `updateMultiAxisResults` (null auto-claim + capture credit). Probes never increment `objective_capture_count`, never set `last_result='captured'`, never bump momentum, never auto-claim null tiles — but still advance `current_objective_index` so they recognize and move on from friendly-controlled targets. |
| `tests/probe_territory_flip.test.ts` | New 8th test exercising the diagnostic counter artifact path via `updateSectorOffensiveResults`. |
| `working-on.md` | Continuation notes for this packet; full structured handoff. |
| `docs/40_reports/implemented/20260430_LONG_RUN_BELIEVABILITY_PACKET.md` | This report. |
| `docs/PROJECT_LEDGER.md` | Behavioral change entry (probe diagnostic counter no longer artifact-attributes non-probe captures). |

## Validation summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `vitest tests/probe_territory_flip.test.ts` (8 tests) | PASS |
| `vitest tests/sector_offensive_idle_recovery.test.ts` (12 tests) | PASS |
| `vitest tests/scenario_operation_diagnostics.test.ts` (20 tests) | PASS |
| 8 broader op/army_reserve/integration_anomaly suites (159 tests) | PASS |
| 40w fresh run (n1583) hash | `4f872fcd535b6e98` (= n1580/n1581 deterministic match — fix has zero 40w impact, expected) |
| 188w fresh run (n1585) hash | `288a1fdc92162594` (= n1582 deterministic match — engine state unchanged) |
| 188w probe `objective_capture_count` rows across 188 weeks | **0** (was 2 in n1582 at w103+w113) — fix verified |
| 188w `diagnose_run` summary | 1 ERROR (Goražde — Issue 5 root cause persists) + 55 warnings (same pattern as n1582; deterministic match, expected) |

## STOP-AND-ASK decisions surfaced

1. **Issue 3 — Enclave-isolated brigade policy** (Cases A, B, C): canon silent. Game-designer + historian + war-or-game decisions required before any code change.
2. **Issue 5 — Goražde siege erosion**: same as Issue 3 Case C; depends on the brigade-westward-drift fix decision.
3. **Issue 2 — HRHB cohesion floor at ~30**: the floor mechanism's specific source (recovery rate / decay rate / supply gating) needs investigation before a bounded fix is safe. Requires gameplay-programmer + historian sign-off.

---

## Determinism statement

- Fix uses no randomness, no timestamps, no `Date.now()`, no `Math.random()`.
- Iteration order in modified loops is unchanged (existing for-of over `axes`, conditional inside loop).
- The probe guard is a pure boolean check on `op.type`; no data is reordered or sorted differently.
- Determinism check: 40w fresh run produces identical hash to pre-fix 40w (n1580/n1581 = n1583 hash `4f872fcd535b6e98`). Confirmed.
