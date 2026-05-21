# Engine Health Action Plan — n1842 Audit Follow-Up

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement remaining runtime tracks. Use `superpowers:systematic-debugging` for Tracks H1 + H4 + H5 (runtime defects). H2/H3 are closed report-only as of 2026-05-16.

**Goal:** Close the open engine-health gaps surfaced by the 2026-05-16 n1842 188w audit, in priority order, without duplicating existing operations-singularity / formation-life / force-quality work.

**Architecture:** This plan **consumes** the n1842 evidence and **dispatches** to existing canonical owners where they exist. Where no owner exists (Track H5), it creates a new bounded lane. H2/H3 are closed report-only classifications. H4/H5 are verified in n1844. H1 is implemented and verified as blocker-surface work, but sensitive-history operation outcome remains open.

**Tech Stack:** TypeScript, scenario runner, Vitest, existing diagnostic tooling. No new dependencies.

**Date:** 2026-05-16. **Source:** [`../40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md`](../40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md).

---

## Supersedes / Corrects

This plan does **not** supersede any existing plan. It **dispatches** through them:

- [`2026-04-30-v09-formation-life-believability-plan.md`](2026-04-30-v09-formation-life-believability-plan.md) — owns Class D (drifted brigades) + Class U (arbih_guards_brigade fall-through). H5 remains a scoped subset; H3 was reclassified as report-only, not a bugfix lane.
- [`2026-04-08-operations-system-a-plus-plan.md`](2026-04-08-operations-system-a-plus-plan.md) — owns operation-delivery work. Track H1 is the n1842-specific evidence push.
- [`2026-03-31-v08x-operations-singularity-plan.md`](2026-03-31-v08x-operations-singularity-plan.md) — predecessor for operation lifecycle canonicalization (CLOSED 2026-04-04).
- [`../40_reports/audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`](../40_reports/audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md) — origin of the P1 COMBAT-P14 + BRIEF-GAP-1 calls. Tracks H1 + H4 close those.

---

## Inputs

- [`../40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md`](../40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md) (this audit)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/` (the run dir; final_save, replay_save_sequence, weekly_report)
- `tools/scenario_runner/audit_sector_truth.ts` (sector audit tool)
- `tools/diagnostics/` (per-domain diagnostic scripts)
- [`../40_reports/CALIBRATION_MASTER.md`](../40_reports/CALIBRATION_MASTER.md) (calibration trail for hash/baseline tracking)

---

## Severity / sequencing

| Severity | Definition | Tracks |
|---|---|---|
| **G** - Gate | Must close before treating n1842 as new baseline | H0 |
| **P0** - High leverage | Largest single open gap; blocks late-war operation realism | H1 (blocker surface verified; sensitive-history outcome open) |
| **P1** - Bounded fixes | Concrete bugs with named owners | H5 (verified in n1844) |
| **R** - Report-only closure | Classification/audit completed; no runtime fix | H2, H3 |
| **P2** - Diagnostic | Display/visibility surface | H4 (verified in n1844) |

---

## Track inventory

| Track | Theme | Severity | Owner agent(s) | Effort |
|---:|---|---|---|---:|
| **H0** | Variance check rerun (n1843) + hash drift audit | G | `/scenario-harness-engineer` | ~1d |
| **H1** | Operation-delivery: launch-feasibility predictor consumes defender artillery/terrain/entrenchment | P0 - IMPLEMENTED, n1844 blocker-surface verified; sensitive-history outcome open | `/operations-expert` + `/corps-army-commander` + `/gameplay-programmer` | done |
| **H2** | `brigade_front_assignment` adapter audit | R - CLOSED report-only | `/qa-engineer` + `/technical-architect` | closed |
| **H3** | `vrs_1st_krajina` Teslic drifter classification | R - CLOSED report-only | `/formation-expert` | closed |
| **H4** | Supply-pressure aggregate ceiling un-stuck via live `war_supply_condition` | P2 - VERIFIED in n1844 | `/qa-engineer` + `/ui-ux-developer` | done |
| **H5** | Army-HQ elite loan deployment / `arbih_guards_brigade` fall-through | P1 - VERIFIED in n1844 | `/formation-expert` | done |

**Remaining total:** H0 needs a formal parent baseline verdict. H1 needs follow-up sensitive-history operation outcome work; H4/H5 are verified in n1844.

---

## Track H0 — Variance check + hash drift audit (GATE)

**Origin:** Earlier scenario-tester finding: n1842 hash `a0111273f26f907d` differs from n1741 `a4bf8b8095050881`. The 14 days of commander CPU work since n1741 should have been hash-preserving per napkin entries ("kept hash `0cb626c032204372`" etc.). Either (a) one of the late lanes drifted the hash without flagging, or (b) the bisect baseline rebased through an n17xx-era hash change not visible in the napkin head.

**Owner:** `/scenario-harness-engineer`

**Files:**
- Reference: `tools/scenario_runner/run_baseline_regression.ts`
- Reference: `data/scenarios/apr1992_definitive_188w.json` (verify last-modified)
- Reference: `.napkin.md` post-2026-05-10 CPU addenda (look for hash-drift admissions)
- Create: `docs/40_reports/implemented/YYYYMMDD_N1842_HASH_DRIFT_AUDIT.md`

**Steps:**
1. **Rerun n1843** with identical scenario + runner config + heap size. Capture hash.
2. If n1843 hash matches n1842 → determinism preserved across reruns; drift is from a real engine change, bisect to find it.
3. If n1843 hash differs from n1842 → **determinism regression**, escalate to `/determinism-auditor` immediately.
4. **Bisect path:** `git log --oneline` between n1741 commit and n1842 commit, run each candidate commit's 188w-from-noop, find the first hash drift.
5. Either confirm n1842 as new baseline (with documented cause) or revert the drift commit.

**Acceptance (Done Means):**
- ✅ n1843 hash captured and either matches n1842 (engine-change drift) or differs (determinism regression).
- ✅ Bisect report identifies the drift commit OR confirms no single commit caused it (cumulative drift class).
- ✅ Audit report committed with verdict: ACCEPT n1842 as new baseline / REVERT drift commit / ESCALATE determinism regression.
- ✅ `CALIBRATION_MASTER.md` updated with n1842 entry + drift class.

**Effort:** ~1 person-day (the rerun is the long pole; bisect is fast).

**This is the gate.** Remaining runtime tracks H1/H4/H5 can preview-dispatch in parallel but should not commit changes until H0 confirms n1842 is a valid baseline to A/B against.

**Current rerun note (2026-05-16):** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1843` produced `final_state_hash` `a0111273f26f907d`. This matches the n1842 hash, but it is **not** accepted as the formal H0 hash audit because the workspace had changed during H4/H5 work. It does confirm the H5 unresolved evidence remains visible in current run artifacts (`arbih_guards_brigade` still appears in `unassigned_frontline_brigades`).

---

## Track H1 — Operation-delivery launch-feasibility predictor

**Status:** IMPLEMENTED 2026-05-16 - VERIFIED FOR BLOCKER SURFACE IN n1844; SENSITIVE-HISTORY OUTCOME OPEN.

**Report:** [`../40_reports/implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md`](../40_reports/implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md)

**Origin:** 54% of operation axes (20/37) never reached launch readiness or never attacked. Same root as engine_health_audit 2026-04-02 P1 COMBAT-P14: combat predictor ignores defender artillery/terrain/entrenchment at launch-feasibility check time. Operations queue, get planned, can't execute when re-checked. Affects late-war sensitive-history trio (Krivaja-95, Stupčanica-95, Cerska-Kamenica).

**Owner:** `/operations-expert` + `/corps-army-commander` + `/gameplay-programmer`.

**Cross-reference:** [`2026-04-08-operations-system-a-plus-plan.md`](2026-04-08-operations-system-a-plus-plan.md) already owns this lane. **This track is the n1842-specific evidence push to unblock that plan.**

**Files (per the operations-singularity / operations-system-a-plus plans):**
- `src/sim/combat/sector_offensive.ts` — `checkLaunchFeasibility()`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/combat_math.ts` — `computeDefenderPower()` (already has artillery/terrain/entrenchment; needs to be called by feasibility check)
- `src/sim/combat/sector_offensive_launch_helpers.ts`
- `src/sim/combat/triggered_operations.ts` — for Krivaja/Stupčanica path
- New tests: `tests/operation_launch_feasibility_defender_aware.test.ts`

**Steps:**
1. **Diagnose:** Why does Krivaja-95 (turn 170) report `planning_invalidated` with 0 attacks despite the SRK siege defender Phase 1+2 work (`32c128f8`, 2026-05-08/09)? The defender power increase from that work should have made the attacker→defender ratio more realistic but apparently the launch-feasibility check still doesn't gate on it.
2. **TDD:** add tests asserting that an operation with `attacker_power < 1.5 × defender_power` returns `feasibility=NO_LAUNCH_READINESS` rather than progressing to attack.
3. Implement defender-aware launch-feasibility check, mirroring the defender-power calculation already done by `computeDefenderPower()`.
4. Rerun 188w. Acceptance: NO_LAUNCH_READINESS predicate count drops from 13 to ≤8; DELIV count rises from 6 to ≥10. Krivaja-95 either captures the enclave (sensitive-history sign-off required) OR fails with a `defender_power_too_high` predicate (honest, not silent).
5. Sensitive-history sign-off on any Krivaja/Stupčanica behavior change required from user.

**Implemented decision:** `evaluateLaunchFeasibility(...)` is now a shared pure evaluator returning `feasible`, `ratio`, `attackerPower`, `defenderPower`, and typed `blocker`. It uses sorted attacker/defender inputs, `computeAttackerPower(...)`, and `rankDefendersByPower(...)`, with optional supply/terrain context. Organic launch/readiness and triggered-operation spawn paths now expose `defender_power_too_high` and `no_launch_readiness` instead of collapsing these cases into generic `planning_invalidated`. `operation_delivery_audit`, `opportunity_campaign_proof`, and `sensitive_history_status` diagnostics expose blockers. Opportunity spawn gating was deliberately not applied because current fixtures/catalog paths lack enough front-sector context; opportunity operations are caught at first planning tick.

**Acceptance (Done Means):**
- ✅ Launch-feasibility consumes defender_power; gating is defender-aware.
- ✅ 188w rerun shows NO_LAUNCH_READINESS axes ≤ 8 (down from 13): n1844 has 5.
- ❌ DELIV axes ≥ 10 (up from 6): n1844 remains at 6. This is now a follow-up operation-delivery improvement lane, not a blocker-surface defect.
- ❌ At minimum 1 of {Krivaja-95, Stupčanica-95, Cerska-Kamenica} delivers a capture OR all 3 fail with `defender_power_too_high` predicate: n1844 sensitive-history diagnostic lists all three watched operations as missing, so follow-up must address watched-operation injection/AAR visibility.
- ⏳ Painted-target oct1995 area-weighted match improves OR is explicitly proven stable (drift in another direction is acceptable if accounted for).
- ✅ Focused tests cover the defender-aware feasibility check and blocker diagnostics.
- ⏳ Sensitive-history sign-off recorded if any enclave delivery changes.

**n1844 verification:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844` final hash `ccd3f9f770052614`. Operation delivery audit reports `NO-LAUNCH-READINESS` 5, `DEFENDER-POWER-HIGH` 9, and `DELIV` 6.

**H1 visibility refresh 2026-05-21:** `docs/40_reports/audits/20260521_H1_WATCHED_OPERATION_VISIBILITY_PACKET.md` reran the evidence-first diagnostic on `runs/apr1992_definitive_188w__210e69404d054959__w188_n1922` (hash `7b57a8592f668137`). Follow-up implementation `docs/40_reports/implemented/20260521_WATCHED_OPERATION_LIFECYCLE_TRACE.md` now persists deterministic watched-operation trace rows plus `watched_operations.json`. Fresh trace-backed packet `docs/40_reports/audits/20260521_H1_TRACE_BACKED_188W_PACKET.md` ran `n1924` (hash `53b1cee10bd6c3f1`, anchors 27/27) and proves Cerska-Kamenica, Krivaja-95, and Stupcanica-95 are catalog-present runtime rows with no AAR; current blockers are generic `build_failure` for all three, plus Krivaja `brigade_ineligible` on `rs_skelani_battalion`. The immediate next owner is build-failure root-cause detail, not operation tuning.

**Effort:** implementation complete; sensitive-history outcome follow-up remains.

---

## Track H2 — `brigade_front_assignment` adapter audit

**Status:** CLOSED 2026-05-16 - REPORT-ONLY.

**Report:** [`../40_reports/implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md`](../40_reports/implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md)

**Verdict:** `military.brigade_front_assignment` being empty is by-design compatibility state, not an adapter regression. Runtime authority is `military.corps_front_sectors`; the tactical-map adapter derives sector and sub-segment truth from that owner and does not expose the legacy field as live player-shell data.

**Evidence:** n1842 final save has `0` `brigade_front_assignment` entries and `71` `corps_front_sectors`. `src/state/game_state.ts`, `src/sim/combat/front_assignment.ts`, `src/sim/turn_phases/war_phases.ts`, and `src/ui/map/data/GameStateAdapter.ts` all confirm the live path is sector-owned.

**Decision:** no code change, no producer restoration, no n1843 rerun needed. Stale `TACTICAL_MAP_SYSTEM` wording can be cleaned separately.

**Acceptance:** closed by implemented report.

---

## Track H3 — Teslic drifter classification

**Status:** CLOSED 2026-05-16 - REPORT-ONLY.

**Report:** [`../40_reports/implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md`](../40_reports/implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md)

**Verdict:** the three brigades are not one shared Teslic drifter defect. `rs_1st_novigrad_infantry` ends at home in Bosanski Novi rear sector coverage. `rs_2nd_tesli_light_infantry` remains local to Teslic for the whole run. `vrs_1st_laktasi` is a same-corps `vrs_1st_krajina` redeployment to Teslic by turn 35; if undesired, that is a design/calibration question, not a runtime bug.

**Evidence:** final_save places all three in `vrs_1st_krajina` rear sector membership. `brigade_temporal_log.jsonl` has 188 rows per brigade: Novigrad returns home by turn 3, Teslic stays at `op:teslic:teslic_2`, and Laktasi reaches Teslic by turn 35 after same-corps sector movement.

**Decision:** no code change and no automatic handoff to formation-life as a bugfix. A future bounded design lane may constrain same-corps redeployments if wanted.

**Acceptance:** closed by implemented report.

---

## Track H4 — Supply-pressure aggregate ceiling

**Status:** IMPLEMENTED 2026-05-16 - VERIFIED IN n1844.

**Report:** [`../40_reports/implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md`](../40_reports/implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md)

**Origin:** All 3 factions stuck at supply_pressure=100 (max) for entire 188w. Historically ARBiH should be crushed (arms embargo + isolated pockets), VRS should degrade in Krajina post-1995, HVO should remain relatively stable through Croatia supply. The 100→100 trace is the documented engine_health_audit 2026-04-02 P1 BRIEF-GAP-1: per-OSID supply may work but the aggregate doesn't reflect it.

**Owner:** `/qa-engineer` (audit) + `/ui-ux-developer` (display layer).

**Files:**
- Read: wherever the supply_pressure aggregate is computed (likely `src/state/derived/` or a scenario-reporting helper)
- Read: `src/sim/combat/supply_*.ts`
- Reference: engine_health_audit 2026-04-02 P1 BRIEF-GAP-1
- Reference: `src/ui/map/data/inboxItems.ts` or briefing equivalents that consume supply

**Implemented decision:** `war_supply_pressure` remains the cumulative legacy field. New `political.war_supply_condition` is the live normalized current-condition aggregate, higher-is-better, derived from `supply_state_by_osid`. Exhaustion/readiness/opportunity/UI/reporting consume live condition where available, falling back to legacy pressure only when condition is absent. UI fallback semantics were corrected so high legacy pressure is bad.

**Acceptance (Done Means):**
- ✅ Live aggregate implemented as `political.war_supply_condition`.
- ✅ Consumers prefer live condition where available.
- ✅ UI treats high legacy pressure as cut, not open.
- ✅ Parent 188w verification confirms condition appears in reports and captures live variance: n1844 `Supply condition` HRHB `40 -> 69`, RBiH `59 -> 81`, RS `62 -> 79`.

**Effort:** complete.

---

## Track H5 — `arbih_guards_brigade` fall-through

**Status:** IMPLEMENTED 2026-05-16 - VERIFIED IN n1844.

**Report:** [`../40_reports/implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md`](../40_reports/implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md)

**Origin:** `arbih_guards_brigade` (RBiH, arbih_general_staff, at op:visoko:buzic_mahala_2) gets logged as `UNRESOLVED ... fell through sector pipeline` every run. Same brigade, same OSID, same fall-through across at least 2026-05-02 and n1842 runs. Recurring known class.

**Owner:** `/formation-expert`.

**Cross-reference:** Formation-life-believability remains the owner for the recurring fall-through class. H3 is closed report-only; **H5 is the bounded one-brigade fix.**

**Files:**
- Read: `src/sim/combat/brigade_assignment.ts` (where the `UNRESOLVED` log line comes from)
- Read: `src/sim/combat/brigade_front_distribution.ts`
- Reference: the run log lines `[brigade_assignment] UNRESOLVED arbih_guards_brigade (1200 pers): fell through sector pipeline, corps=arbih_general_staff`

**Implemented decision:** idle army-HQ/main-staff elites remain sector-exempt until loaned. When loaned, `deployEliteLoan(...)` issues a concrete column movement order to the receiving corps, targeting active operation axis staging first, then threatened/nearest receiving-corps sector evidence. The unresolved-warning path suppresses only movement-owned loaned elites with valid column deployment orders; malformed or unrelated movement orders still report unresolved.

**Acceptance (Done Means):**
- ✅ `deployEliteLoan(...)` creates concrete movement orders for all army-HQ elite reserve cases covered by tests.
- ✅ Movement-owned unresolved warning suppression is bounded to valid column deployment orders.
- ✅ Loaned elite synchronizes into receiving corps sector assignment after column arrival in focused tests.
- ✅ Parent 188w verification confirms `arbih_guards_brigade` has no final unresolved entry, is assigned to `sector:arbih_1st_corps:8` as reserve while loaned, and `audit_sector_truth.ts` reports `ok: true`, `saved_unresolved: 0`.

**Effort:** complete.

---

## Sequencing / dependency graph

```
H0  Variance + hash drift audit ────────────┐  (GATE — must finish before n1842 is "the baseline")
                                            ↓
PARALLEL after H0 closes:
  H1  Operation-delivery predictor   ─┐   blocker surface verified; sensitive-history outcome open
  H4  Supply pressure ceiling         ├─── verified in n1844
  H5  arbih_guards_brigade fix        ─┘   verified in n1844
                                            ↓
                                          v0.9.7+ baseline confirm
```

**Calendar:** H2/H3 are closed report-only. H4/H5 are verified in n1844. H1 blocker-surface implementation is verified, but sensitive-history watched-operation outcome remains open. H0 still needs a formal baseline verdict.

---

## Acceptance — Done Means (whole-plan level)

This plan is DONE when:

1. ⏳ H0 closes with a verdict on n1842's baseline status (accept / revert / escalate).
2. ✅ H1's NO_LAUNCH_READINESS axis count drops from 13 → ≤8 in a fresh 188w run: n1844 has 5.
3. ❌ H1's DELIV axis count rises from 6 → ≥10: n1844 remains 6.
4. ❌ H1: at least one of Krivaja-95/Stupčanica-95/Cerska-Kamenica either captures the enclave (sensitive-history sign-off required) OR fails with an honest `defender_power_too_high` predicate: n1844 watched operations are missing.
5. ✅ H2: `brigade_front_assignment` adapter status confirmed as compatibility-only/by-design; report-only closure linked.
6. ✅ H3: Teslic drifter suspicion classified; two are not drifters and one is same-corps redeployment; report-only closure linked.
7. ✅ H4: parent run confirms `supply_condition` appears in reports and live condition is used where available.
8. ✅ H5: `audit_sector_truth.ts` reports acceptable status on a fresh post-H5 run (no movement-unowned `UNRESOLVED arbih_guards_brigade`).
9. ✅ `CALIBRATION_MASTER.md` + napkin updated with the post-plan baseline (hash + painted-target percentages + audit ok status).
10. ✅ Findings doc [`ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md`](../40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md) marked CLOSED with cross-link to per-track implementation reports.

---

## Open design questions (must resolve before relevant track starts)

1. **Q-H1-KRIVAJA-OUTCOME** (Track H1): If defender-aware launch-feasibility makes Krivaja-95 / Stupčanica-95 deliverable, is it sensitive-history sign-off-ready to let the sim deliver the enclave capture? OR should the engine deliberately fail the operation with an honest predicate (no rupture, no flip)? **Owner: user + `/historian` + `/canon-compliance-reviewer`.**
2. **Q-H4-AGGREGATE-SEMANTICS** (Track H4): RESOLVED by implementation. `war_supply_pressure` is cumulative legacy pressure; `war_supply_condition` is the live current-condition KPI.
3. **Q-H5-RESERVE-OWNER** (Track H5): RESOLVED by implementation. Idle army-HQ/main-staff elites are sector-exempt until loaned; loaned elites are movement-owned until they reach the receiving corps sector/op staging.

---

## Risks / stop conditions

- **R1** — H0 finds determinism regression (n1843 hash differs from n1842 even with identical config). All remaining runtime tracks pause; escalate to `/determinism-auditor`; do not commit changes from H1/H4/H5 until determinism restored.
- **R2** — H1 makes Krivaja/Stupčanica deliver but the calibration painted-target match drops sharply at oct1995. Reassess H1; the defender-aware predictor may be too aggressive or require retuning.
- **R3** — H5 fix accidentally exempts brigades that SHOULD be sector-assigned. Verify with 188w rerun that active brigade count in sector lists doesn't drop materially.

---

## Owner / dispatch responsibilities

Per [`2026-05-01-autonomous-parallel-workstreams-operating-plan.md`](2026-05-01-autonomous-parallel-workstreams-operating-plan.md):

- **Orchestrator (Claude):** dispatches H0 first (gate); dispatches remaining runtime tracks H1/H4/H5 in parallel after H0 closes.
- **Per-track owners:** named above per track.
- **User retains:**
  - Q-H1-KRIVAJA-OUTCOME (sensitive-history sign-off on any enclave delivery change).
  - Final acceptance of n1842 as the new baseline if H0 confirms drift cause.

---

## Roadmap integration

This plan integrates into [`MASTER_ROADMAP.md`](MASTER_ROADMAP.md):
- Listed in the `Key Plan Documents` table alongside the audit findings doc.
- Referenced from the `Path to v1.0` section as the post-n1842 engine-health cleanup lane.
- A 2026-05-16 hardening board note line appended.

**Status: UPDATED 2026-05-16. H2/H3 CLOSED report-only. H4/H5 VERIFIED in n1844. H1 blocker-surface VERIFIED in n1844, but DELIV uplift and sensitive-history watched-operation outcomes remain open. H0 needs formal baseline verdict; n1843/n1844 are evidence, not final baseline audit.**
