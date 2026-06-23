# Engine Health Audit — n1842 (188w, 2026-05-16)

> **Superseded correction (2026-06-18):** this audit predates the event-owned Srebrenica/Zepa receipt correction. Any language below that frames Srebrenica/Žepa as open because Krivaja-95/Stupčanica-95 operation delivery did not capture objectives is historical diagnostic context only. Current canon: `srebrenica_falls_1995` and `zepa_falls_1995` own the fall `control_change` receipts, and `srebrenica_genocide_1995` observes the resulting Srebrenica control state at turn >=160.

> **Sector-audit supersession (2026-06-23):** Sector audit policy changed. Persisted saved-sector truth is the release gate. Rebuilt-sector reserve-only findings are diagnostics and must not mutate or fail the saved-sector audit unless a separate sector-builder/calibration lane intentionally changes production truth.

**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1842`
**Hash:** `a0111273f26f907d`
**Scenario:** `apr1992_definitive_188w` (war start, 188 weeks, smart bots, player_choice recruitment)
**Triggered by:** user request for thorough engine health audit, focused on brigade-to-sector assignment, brigades in rear, sector contiguity, "and so on."
**Synthesis by:** `/scenario-creator-runner-tester` (orchestrator-enforcement hook)
**Sibling docs:** painted-target cross-check earlier this session (jan1993 87.2% / apr1994 86.8% / apr1995 85.8% / oct1995 74.7%); H1 implementation [`implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md`](implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md); H2 closure [`implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md`](implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md); H3 closure [`implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md`](implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md); H4 implementation [`implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md`](implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md); H5 implementation [`implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md`](implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md).

---

## 1. Headline

**Verdict: ACCEPTABLE-WITH-KNOWN-GAPS.** Sector structural integrity is genuinely strong (the kind of clean audit Paradox titles often don't achieve at this scale). The open gaps — operation delivery, sensitive-history enclave failure, supply-pressure aggregate stuck at ceiling, one recurring fall-through brigade — are well-documented elsewhere and assigned to specific lanes. **No new regressions from the 14 days of commander CPU work between n1741 and n1842.**

| Surface | Verdict |
|---|---|
| Sector structural integrity | **STRONG** — 0 overlaps · 0 stale density · 0 untruthful brigades · 0 edge mismatches · 0 active formations in enemy territory |
| Brigade → sector assignment | **92.7% clean** front/reserve lists; H3 follow-up reclassified the named Teslic cases as rear-sector/same-corps behavior, not a shared drift bug |
| Operation delivery | **IMPLEMENTED / PARTIAL VERIFY** — launch feasibility is defender-aware and n1844 emits typed blockers; NO-LAUNCH-READINESS dropped to 5, DELIV stayed 6 |
| Sensitive history | **OPEN_P0** — n1844 still leaves Srebrenica/Žepa open; watched Krivaja/Stupčanica/Cerska operations are missing from sensitive-history diagnostic |
| Supply visibility | **VERIFIED** — n1844 reports live `war_supply_condition` HRHB 40→69, RBiH 59→81, RS 62→79 while legacy pressure remains cumulative and saturated |
| `brigade_front_assignment` | **CLOSED REPORT-ONLY** — empty by-design compatibility field; runtime/UI authority is `corps_front_sectors` |
| Teslic drifter suspicion | **CLOSED REPORT-ONLY** — two named brigades are not drifters; `vrs_1st_laktasi` is same-corps redeployment |
| Army-HQ elite loan deployment | **VERIFIED** — n1844 has `saved_unresolved: 0`, clean sector audit, and `arbih_guards_brigade` sector-assigned |
| Determinism | **CLEAN** — audit byte-stable on rebuild, no warnings |

---

## 2. Raw findings

### 2.1 Sector audit (`audit_sector_truth.ts` on final_save)

```
saved_sectors: 71      rebuilt_sectors: 70
ok: false (due to 1 unresolved brigade)

saved_counts:                          rebuilt_counts:
  reserve_only_live_sectors: 1            reserve_only_live_sectors: 0
  stale_density_sectors: 0                stale_density_sectors: 0
  same_corps_front_overlaps: 0            same_corps_front_overlaps: 0
  untruthful_assigned_brigades: 0         untruthful_assigned_brigades: 0
  edge_front_mismatches: 0                edge_front_mismatches: 0
  unresolved_sector_brigades: 1           unresolved_sector_brigades: 1
  active_formations_in_enemy_territory: 0 active_formations_in_enemy_territory: 0

Unresolved: arbih_guards_brigade @ op:visoko:buzic_mahala_2
Reserve-only sector (saved view): sector:vrs_1st_krajina:4 (clears on rebuild)
```

### 2.2 Brigade-sector assignment cross-check (final_save sector membership lists)

| Bucket | Count |
|---|---:|
| Total formations | 333 (brigade 248 · paramilitary 67 · corps_asset 15 · army_hq 3) |
| Active brigades | 218 / 248 (30 inactive) |
| Sectors | 71 |
| Active in some sector list (front + reserve) | **202 / 218 (92.7%)** |
| Active NOT in any sector list | **16 / 218 (7.3%)** — RBiH 3, HRHB 7, RS 5 |
| `brigade_front_assignment` adapter field entries | **0** (closed report-only: compatibility field empty by design; canonical source is `corps_front_sectors`) |

#### 2.2.1 The 16 unassigned active brigades — classification

**Class L (legitimately deep-rear, 10):** Expected behavior; not a bug.

| Brigade | Faction | Corps | Location | Notes |
|---|---|---|---|---|
| hrhb_grude_brigade | HRHB | hvo_southeast_herzegovina | capljina/visici_2 | Croat homeland garrison |
| hrhb_herceg_stjepan_brigade | HRHB | hvo_southeast_herzegovina | posusje_2 | Croat homeland garrison |
| hrhb_itluk_brigade | HRHB | hvo_southeast_herzegovina | citluk/veliki_ogradjenik_2 | Croat homeland garrison |
| hrhb_ljubuki_brigade | HRHB | hvo_southeast_herzegovina | citluk_2 | Croat homeland garrison |
| hrhb_mario_hrka_ikota_brigade | HRHB | hvo_southeast_herzegovina | neum/gradac_2 | Croat homeland garrison |
| hrhb_posusje_brigade | HRHB | hvo_southeast_herzegovina | listica/siroki_brijeg_2 | Croat homeland garrison |
| hvo_2nd_guard_mechanized | HRHB | hvo_main_staff | mostar_zapad_2 | HVO operational reserve |
| hvo_3rd_guard_jastrebovi | HRHB | hvo_main_staff | capljina_2 | HVO operational reserve |
| rs_65th_protection_motorized_regiment | RS | vrs_main_staff | sokolac/donji_kalimanici | VRS rear-area protection regiment |
| rs_1st_guards_motorized | RS | vrs_main_staff | rogatica/stara_gora | VRS general-staff guards |

**Class B (borderline reserve, 2):** Acceptable if engine intentionally exempts general-staff reserves from sector duty.

| Brigade | Faction | Corps | Notes |
|---|---|---|---|
| arbih_120th_liberation_black_swans | RBiH | arbih_general_staff | At Tuzla area; ARBiH general-staff reserve |
| arbih_164th_mountain | RBiH | arbih_1st_corps | At visoko; **a 1st Corps formation off its corps's sectors** |

**H3 correction (2026-05-16):** Follow-up report [`implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md`](implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md) supersedes the initial "Class D" label for these three rows. They are rear-sector/same-corps behavior, not one shared drifter bug.

| Brigade | Faction | Corps | Location | Morale | Cohesion | Personnel |
|---|---|---|---|---:|---:|---:|
| rs_1st_novigrad_infantry | RS | vrs_1st_krajina | bosanski_novi/matavazi_2 | 12 | 20 | 2000 |
| rs_2nd_tesli_light_infantry | RS | vrs_1st_krajina | teslic_2 | 20 | 20 | 1041 |
| vrs_1st_laktasi | RS | vrs_1st_krajina | teslic/buletic_2 | 19 | 20 | 1226 |

Classification after H3 follow-up:

- `rs_1st_novigrad_infantry`: not a Teslic drifter; returns home by turn 3 and ends in `sector:vrs_1st_krajina:6` rear coverage.
- `rs_2nd_tesli_light_infantry`: not a drifter; remains local to Teslic for all 188 rows and ends in `sector:vrs_1st_krajina:7` rear coverage.
- `vrs_1st_laktasi`: same-corps redeployment to Teslic by turn 35; design/calibration issue only if undesired.

**Class U (genuine unresolved, 1):** Matches audit_sector_truth's only flag.

| Brigade | Faction | Corps | Location | Notes |
|---|---|---|---|---|
| arbih_guards_brigade | RBiH | arbih_general_staff | visoko/buzic_mahala_2 | Run log: `UNRESOLVED ... fell through sector pipeline`. **Recurring class** — same brigade, same OSID, same fall-through across multiple runs since at least 2026-05-02. |

### 2.3 Lifecycle indicators (active brigades only)

| Indicator | Count | Note |
|---|---:|---|
| Far from `home_osid` | 150 / 218 (68.8%) | Expected for full-war run — operational deployment |
| Morale = 0 | 19 | Expected for late-war (exhaustion cap reached) |
| Cohesion ≤ 20 | 33 | Same |
| Personnel < 400 (combat-ineffective) | **1** | Effectively zero — clean lifecycle |
| Personnel = 0 (zero-strength) | 0 | Clean |
| `stranded === true` / `lifecycle_state === 'stranded'` | 0 | Clean |

### 2.4 Operation delivery (24 operations across 188w)

| Predicate (per-axis) | Count | % |
|---|---:|---:|
| **DELIV** (delivered intent) | 6 | 16% |
| **PRE-FRIENDLY** (target already friendly, no real attack required) | 6 | 16% |
| **UNDERDELIV** (contacted but underdelivered) | 6 | 16% |
| **NO-LAUNCH-READINESS** | 13 | 35% |
| **NO-OPENING-ATTACK** | 4 | 11% |
| **NO-CONTACT-PATH** | 2 | 5% |
| **NO-CONTACT-OTHER** | 1 | 3% |

- **6/37 axes (16%) actually delivered intent.** 6/37 (16%) succeeded only because target was already friendly.
- **20/37 (54%) never reached launch readiness or never attacked.**
- Successes: Op Prijedor (PRE-FRIENDLY), Op Drina, Op Donji Vakuf, Op APWB Pressure, Op Tigar-Sloboda.
- Partials: Op Koridor (3/5), Op Prsten (6/7), Op Jajce (1/3).
- Late-war failures: Op Krivaja-95 (0/5, sensitive-history P0), Op Stupčanica-95 (0/1, P0), Op Cerska-Kamenica (0/3), Op Sana 95 (0/18).

**H1 update:** [`implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md`](implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md) documents the implementation of shared defender-aware launch feasibility. Organic launch/readiness and triggered-operation spawn now expose `defender_power_too_high` and `no_launch_readiness`; operation-delivery, opportunity-proof, and sensitive-history diagnostics emit those blockers. Post-fix n1844 verification reports `NO-LAUNCH-READINESS` 5, `DEFENDER-POWER-HIGH` 9, and `DELIV` 6. The blocker surface is fixed; DELIV uplift and watched sensitive-history operation outcome remain open.

### 2.5 Opportunity health

| Metric | Count |
|---|---:|
| Total decisions | 7 |
| Approved | 7 |
| Declined | 0 |
| Expired | 0 |
| Broken AAR links | 0 |
| Duplicate proposal rows | 0 |
| Decisive successes | 2 (Op APWB Pressure, Op Tigar-Sloboda) |
| Failures | 2 (Op Grmeč 94, Op Sana 95) |
| T3 defensive sentinels | 3 (no offensive arm) |

### 2.6 Sensitive-history status (the standing P0)

- **Verdict: OPEN_P0**
- Srebrenica: **10/11 RBiH-held** (sim) vs full-fall historical → 1/11 RS; capital controller = RBiH
- Žepa: **1/1 RBiH-held** (sim); capital controller = RBiH
- `srebrenica_falls_1995` event: **FIRED** at turn 162 ✓
- `srebrenica_genocide_1995` event: **NOT FIRED** ✗
- `zepa_falls_1995` event: **FIRED** at turn 164 ✓
- Op Krivaja-95: failure, 0 attacks, 0/5 captures, force_ratio 0.080
- Op Stupčanica-95: failure (no_logged_attempt), 0/1, force_ratio 0.679
- Op Cerska-Kamenica: failure (planning_invalidated), 0/3
- Drina watched-brigade status: 7 active (morale 0-69, cohesion 20-66, personnel 586-2000), 1 inactive (rs_skelani_battalion at 0 personnel)

**H1 update:** blocker-aware diagnostics now distinguish true no-readiness from `defender_power_too_high`. n1844 still reports sensitive-history `OPEN_P0`; watched Krivaja/Stupčanica/Cerska operations are missing rather than capture-delivering or blocker-failing, so Q-H1-KRIVAJA-OUTCOME remains open as an injection/AAR visibility and scenario outcome lane.

### 2.7 Global / aggregate

- **Exhaustion:** all factions hit cap (100 → 100 at end; from 7.94-10.0 at start) ✓
- **Supply pressure:** **all factions stuck at 100 entire 188w** — legacy cumulative pressure, not live condition.
- **H4 update:** implemented live `political.war_supply_condition` from `supply_state_by_osid`; consumers prefer live condition where available and UI fallback now treats high legacy pressure as bad. n1844 verifies the field in reports and final save: HRHB `40 -> 69`, RBiH `59 -> 81`, RS `62 -> 79`.
- **Displacement:** 0 → 106 municipalities / 1.16M displaced
- **Activity:** front-active mean 1358/week, 188/188 weeks nonzero
- **Formation lifecycle:** +131 / -22 (added: army_hq 1, brigade 63, paramilitary 67; removed: hv_phantom 4, jna_phantom 18) — JNA dissolution worked cleanly

### 2.8 Current H0 / post-fix rerun notes

Current rerun directory: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1843`.

- `run_summary.json` final hash: `a0111273f26f907d`.
- This matches the n1842 hash, but it is not the formal H0 hash-drift audit because the workspace had changed during H4/H5 work.
- The rerun confirms H5 evidence remains present in current artifacts: `end_report.md` / `run_summary.json` still list `arbih_guards_brigade` under `unassigned_frontline_brigades`.

Post-fix verification directory: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844`.

- `run_summary.json` final hash: `ccd3f9f770052614`.
- `audit_sector_truth.ts` on n1844 final save returns `ok: true`, `saved_unresolved: 0`, and zero saved/rebuilt unresolved sector brigades.
- `arbih_guards_brigade` is assigned to `sector:arbih_1st_corps:8` as reserve while loaned to `arbih_1st_corps`.
- `end_report.md` prints live `Supply condition (start -> end)` with HRHB `40 -> 69`, RBiH `59 -> 81`, RS `62 -> 79`.
- `operation_delivery_audit.cjs` now reports typed H1 blockers: `NO-LAUNCH-READINESS` 5 and `DEFENDER-POWER-HIGH` 9.

---

## 3. Analyst classification per gap

| Finding | Class | Where it already lives |
|---|---|---|
| 16 unassigned brigades | 10 legit deep-rear + 2 borderline + H3 reclassified + 1 recurring fall-through | Class L = expected; H3 report-only closure says the named Teslic rows are not one shared drifter bug; Class U = recurring known bug |
| 54% operation NO-LAUNCH/NO-CONTACT | Blocker surface verified; delivery uplift open | H1 report adds defender-aware `evaluateLaunchFeasibility(...)`, typed blockers, and diagnostic blocker output; n1844 drops NO-LAUNCH-READINESS to 5 but DELIV remains 6 |
| Srebrenica/Žepa enclaves not captured | Sensitive-history P0 | SRK siege defender Phase 1+2 closed 2026-05-08/09 (`32c128f8`) — but enclave capture still not delivering; same class as Krivaja-95 work in PROJECT_LEDGER `8e974004` |
| Supply pressure 100→100 stuck | Verified live condition | H4 report adds `war_supply_condition`; n1844 reports HRHB 40→69, RBiH 59→81, RS 62→79 while legacy `war_supply_pressure` remains cumulative |
| arbih_guards_brigade fall-through | Verified in n1844 | H5 report adds concrete army-HQ elite loan deployment and bounded movement-owned warning suppression; sector audit is clean |
| `brigade_front_assignment` empty | CLOSED report-only | Compatibility field empty by design; runtime/UI authority is `corps_front_sectors`; see `implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md` |

**Pattern:** No new drift introduced by recent CPU work. H2/H3 are closed as report-only classifications. H4/H5 are verified in n1844. H1's blocker surface is verified, but operation delivery uplift and sensitive-history watched-operation outcomes remain open.

---

## 4. Cross-references

- [`GAME_STATE_RATING_MASTER.md`](GAME_STATE_RATING_MASTER.md) — system grades; this audit refines #16 (Tactical map info design) and #2 (Combat resolution) evidence
- [`CALIBRATION_MASTER.md`](CALIBRATION_MASTER.md) — calibration trail; n1842 should be added as the first multi-target painted baseline
- [`REAL_WAR_MASTER.md`](REAL_WAR_MASTER.md) — "VRS under-rated at enclaves by ~100×" class; Krivaja-95 force_ratio 0.080 is current evidence
- [`audits/20260330_REPO_HEALTH_CONSOLIDATED.md`](audits/20260330_REPO_HEALTH_CONSOLIDATED.md) — overlapping ownership diagnosis
- [`audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`](audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md) — Lane A items; most shipped; combat-predictor still open
- [`MUST_HOLD_MASTER.md`](MUST_HOLD_MASTER.md), [`SECTOR_MASTER.md`](SECTOR_MASTER.md) — sector ownership canon
- [`BOSNIAK_CROAT_CONFLICT_MASTER.md`](BOSNIAK_CROAT_CONFLICT_MASTER.md) — HRHB-RBiH transition
- [`implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md`](implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md) — H2 closure; `brigade_front_assignment` is compatibility-only/by-design.
- [`implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md`](implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md) — H3 closure; Teslic suspicion is not a shared drifter bug.
- [`implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md`](implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md) — H1 implementation; launch feasibility is defender-aware and emits typed blockers.
- [`implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md`](implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md) — H4 implementation; live supply condition replaces saturated legacy pressure for current-condition consumers.
- [`implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md`](implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md) — H5 implementation; loaned army-HQ elites receive target-corps deployment orders.

**Plan documents that own follow-up:**
- [`../plans/2026-05-16-engine-health-n1842-plan.md`](../plans/2026-05-16-engine-health-n1842-plan.md) — this audit's actionable plan; H2/H3 closed report-only
- [`../plans/2026-04-30-v09-formation-life-believability-plan.md`](../plans/2026-04-30-v09-formation-life-believability-plan.md) — Class U brigade lifecycle; H3 no longer dispatches an automatic drifter bugfix
- [`../plans/2026-04-08-operations-system-a-plus-plan.md`](../plans/2026-04-08-operations-system-a-plus-plan.md) — operation-delivery work
- [`../plans/2026-03-31-v08x-operations-singularity-plan.md`](../plans/2026-03-31-v08x-operations-singularity-plan.md) — operation lifecycle canonicalization (closed but predecessor)

---

**Status:** AUDIT UPDATED 2026-05-16. H2/H3 closed report-only with linked implemented reports. H1/H4/H5 implementation reports linked; parent verification remains open. Action plan at `../plans/2026-05-16-engine-health-n1842-plan.md`.
