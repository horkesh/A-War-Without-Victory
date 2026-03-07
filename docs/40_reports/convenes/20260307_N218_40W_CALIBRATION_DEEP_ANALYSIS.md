# n218 — 40-Week Calibration Deep Analysis

**Date:** 2026-03-07
**Run ID:** `apr1992_definitive_40w__7c821fa7d934716d__w40_n218`
**State hash:** `6cbc6ef614883584`
**Baseline:** n214 (84.2% area-weighted, rear pocket consolidation)
**Result:** 84.2% area-weighted — same baseline, no regression

---

## Executive Summary

n218 confirms that the n214 codebase (rear pocket consolidation, corps AI pocket targeting, GUI panel rework) is stable. Troop strengths remain in historical bands. VRS organic tempo decay is working correctly (8→1 attacks/week). Combat causality is live with 168 attack orders and 141 battles. The 84.2% plateau is explained by two specific structural gaps: **Operation Drina targets too few Zvornik/Bratunac OSIDs** and **Operation Koridor does not include Brcko**. Fixing these pre-planned operation target chains is the single highest-priority calibration improvement, with potential to recover 10–20pp in Drina/Posavina and push overall area-weighted toward 90%+.

---

## Tracked Dimensions

| Dimension | Value |
|---|---|
| OSID match (count) | 609/744 = 81.9% |
| **Area-weighted match** | **84.2%** (43,237 / 51,337 km²) |
| RS net OSID gain | +52 (279→331; painted target 411) |
| RBiH net OSID gain | −45 (353→308) |
| HRHB net OSID gain | −7 (121→114) |
| Total attack orders | 168 (RS=156, HRHB=11, RBiH=1) |
| Total battles | 141 |
| Objective captures | 79 |
| Defender-absent battles | 46 |
| Combat-attributed flips | 44 |
| Attacker casualties | 12,532 |
| Defender casualties | 3,685 |
| Att:def ratio | 3.4:1 (target 2.5–3:1) |
| Troop strength RS w40 | 109,502 (target 100–110k) ✅ |
| Troop strength RBiH w40 | 121,678 (target 110–130k) ✅ |
| Troop strength HRHB w40 | 40,538 (target 40–45k) ✅ |
| Civilian killed (40w) | 18,104 total (RBiH 13,766 / RS 2,242 / HRHB 2,096) |
| Total displaced | 730,361 |
| Fled abroad | 128,404 |
| Brigades formed | +78 (all brigade kind) |
| Bot benchmarks | 2/6 pass |

---

## Regional Breakdown

| Region | Count % | Area % | Status |
|---|---|---|---|
| KRAJINA | 87.0% | 87.5% | Acceptable |
| CENTRAL_CORRIDOR | 90.4% | 89.5% | Good |
| CENTRAL_BOSNIA | 81.6% | 82.0% | Acceptable |
| SARAJEVO | 87.1% | 84.7% | Good |
| HERZEGOVINA | 92.5% | 89.7% | Good |
| **POSAVINA_NE** | **72.5%** | **76.1%** | **Gap** |
| **DRINA** | **69.1%** | **75.1%** | **Gap** |

---

## CORRECTED Root Cause Analysis (from Paradox subagent investigation)

> The initial analysis diagnosed "narrow operation target chains." The deeper investigation reveals a more fundamental engine problem.

### The real issue: Corps go dormant after first operation

Both the Drina corps and East Bosnian corps run their opening pre-planned operation for **3–4 weeks** — then sit **completely dormant for weeks 5–39**, generating no further operations. All brigades remain frozen in home municipalities for the remaining 36 weeks.

- **Operation Drina** (vrs_drina): runs w1 (planning) → w2–3 (execution, failed to capture bratunac_2 or zvornik) → w4 (recovery). After recovery: **zero Drina operations for 36 weeks**. All 8 Drina corps brigades stuck in vlasenica/zvornik area at game end. Cajnice, srebrenica, rogatica, sekovici — untouched.
- **Operation Koridor** (vrs_east_bosnian): runs w1–4, captures samac, then **dormant weeks 5–39**. All 10 East Bosnian brigades stationary in bijeljina/ugljevik/samac at game end. Brcko: **regressed** — started with RS=4 OSIDs, ended RS=2. VRS lost ground it started with.

This is a **bot AI / operation lifecycle bug**: after a pre-planned operation completes recovery, the corps does not launch a new organic operation. The corps simply idles.

### Bihać — more specific root cause

`consolidateRearPockets` is confirmed NOT involved (control_change_attribution: consolidation=0 across all 40 weeks; all 44 flips are combat-attributed).

Actual mechanism:
1. `racic`, `ripac`, `trubar` = RS at init (correct — Serbian-majority villages; rs_15th_biha_infantry home_osid is racic).
2. `orasac_2` starts RBiH but **undefended** — the `arbih_504th_vitezka_mountain` brigade (home_osid: orasac_2) never spawns in this run.
3. 2nd Krajina corp's opportunistic logic finds orasac_2 undefended and adjacent to RS-held territory, attacks and captures it.
4. Result: RS=4, RBiH=3 → municipality majority flips to RS.

**Fix:** Either ensure 504th brigade spawns at game start (spawn directive), OR add orasac_2 to RS `avoided_osids` in the scenario. The three other RBiH bihac OSIDs (bihac_2, brekovica_2, velika_gata) are correctly held throughout.

---

## Per-Role Assessment

### Orchestrator

**What works:** VRS organic tempo decay confirmed (8–9/week → 1–4/week). Troop strengths in band. Kill fractions correctly differentiated. Bihać city (bihac_2) correctly RBiH throughout. 141 battles confirm live combat.

**Critical failure:** Drina corps and East Bosnian corps both go dormant after their pre-planned operation completes. 36 of 40 weeks, neither corps generates a new offensive operation. This is the single systemic cause of the 84.2% plateau — not target chain scope.

**Single priority:** Investigate and fix corps operation relaunch — why a corps sits idle after recovery instead of generating a follow-on operation. This is an engine/bot AI issue, not a data issue.

### Scenario-creator-runner-tester

**What works:** Srebrenica, Goražde, Bihać city, Tuzla, Sarajevo, Bijeljina correct.

**What does not work:**
- **Bihać anchor (P0):** Should be OSID-level (`op:bihac:bihac_2`), not municipality. Municipality tips RS due to init state + undefended orasac_2, but city correctly RBiH.
- **504th ARBiH brigade not spawning:** arbih_504th_vitezka_mountain never appears in formations. With it spawning at orasac_2, 2nd Krajina's opportunistic attack would be blocked. Check formation_spawn_directive for the Bihać 5th Corps brigades.
- **Zvornik anchor:** Real failure — Drina corps dormancy, not target scope.
- **Brcko regression:** Brcko started with RS=4 OSIDs, ended RS=2. Investigate whether ARBiH is counterattacking Brcko during weeks 5–39 when East Bosnian corps is dormant.

### Historian (BB KB, citation-backed)

1. **Zvornik/Bratunac** (Drina valley): VRS took Zvornik by early May 1992 using 1st Zvornik Brigade and Arkan's Tigers. Bratunac similarly April–May 1992. The sim's 3-week Drina operation failing and then going dormant contradicts this — historically, VRS operations in East Bosnia were sustained multi-month campaigns, not single-week actions. (BB1 Appendix G pp. 500–501; PATTERN_REPORT.)

2. **Brcko corridor**: VRS secured Brcko town and most of the Posavina corridor by mid-1992 through sustained pressure, not a single 4-week operation. (BB1 p.500: 1st Posavina Infantry Brigade HQ Brcko.) The Brcko regression in the sim is ahistorical.

3. **Civilian deaths**: RBiH killed=13,766 over 40 weeks extrapolates to ~70k full-war Bosniak civilian deaths — approximately 2× the historical ~30–38k figure. The 4% default kill fraction is too aggressive for routine displacement; recommend 2% for RBiH-from-RS-territory, keeping 4% for acute cleansing events.

4. **VRS troop strength**: RS=109.5k at w40 is accurate. ✅

5. **Displacement volume**: 730k over 40 weeks is slightly low vs historical estimates of 1M+ displaced by end of 1992, but within acceptable range for the sim's OSID-level resolution.

### Game Designer

**What works:** Organic tempo decay is the correct design. No artificial stance switch. Operation-gated combat (brigades only fight through operations) is correct.

**What does not work:** The organic relaunch is broken. The design intent is that corps continuously generate operations until their sector is consolidated. Instead they generate one and stop. This breaks the entire "sustained VRS offensive" dynamic.

**RBiH kill fraction**: 4% uniform is too high for routine displacement. Design should differentiate: mass execution events (Srebrenica-type) = high fraction, routine flight = 2% or lower. A `DISPLACEMENT_KILLED_FRACTION_RBIH_FROM_RS = 0.02` constant would bring 40w Bosniak civilian deaths from ~13,766 to ~6,900 — more defensible against the historical record.

**Design win:** ARBiH at 1 attack order is correct for general_defensive posture. The single order is an edge case (possibly ARBiH attacking a flipped HRHB OSID) — monitor but do not change.

### Gameplay Programmer

**Critical bug — corps operation relaunch:**
After a pre-planned or organic operation completes recovery, the corps bot does not generate a new operation. Root causes to investigate:
1. Does `generateCorpsDirectives()` correctly produce a new operation when no active operation exists?
2. Does the corps have enough eligible brigades after recovery to meet `MIN_BRIGADES_FOR_OFFENSIVE`?
3. Is there a relaunch cooldown that's too long?
4. Is the `sector_offensive.ts` `updateSectorOffensiveResults()` correctly clearing the corps's active operation state on completion?
5. Are brigades marked as unavailable (supply/exhaustion/disrupted) after recovery, preventing them from being assigned to a new operation?

**`operation_recovery_without_logged_attempt` week 4**: One operation (likely Operation Drina's first attempt at bratunac_2) entered recovery with 0 objective attempts. This is the same symptom — an operation that fails to find eligible attackers transitions to recovery rather than retrying. This may be the same relaunch bug.

**Att:def 3.4:1**: 33% of battles were defender-absent (46/141). These inflate attacker casualties without balancing defender casualties. The rate constant fix alone (reduce BASE_ATTACKER_LOSS_RATE 0.04→0.035) would shift aggregate ratio to ~3.0:1 but the root cause is high defender-absent rate. Investigate whether walk-in captures should count toward the casualty ledger at all.

### Formation Expert

**What works:** 78 brigades spawned. All active. Fatigue = 20 RS at w40 — reasonable for 156 attacks spread across ~25 brigades (avg ~6 attacks/brigade, net fatigue ~4–6 after recovery).

**What does not work:** `arbih_504th_vitezka_mountain` never spawns. This is a formation_spawn_directive gap — the 5th Corps brigades in the Bihać pocket should spawn within the first few weeks. Without the 504th at orasac_2, the adjacent RS units treat it as undefended and capture it opportunistically.

**Supply reporting artifact:** "Supply pressure: 100→100" in end_report is Phase I pressure metric, not Phase II supply reserves. The actual `supply_reserves` state needs verification in final_save — MAINTENANCE_DRAIN_PER_FORMATION=0.045 should be consuming significant reserves by w40 for RS (77 brigades × 0.045 = 3.47 points/turn drain).

---

## Consolidated Findings (Revised, Prioritized)

| Priority | Issue | Type | Root Cause | Action |
|---|---|---|---|---|
| **P0** | Corps go dormant after first operation (Drina + EBK) | Engine bug | Operation lifecycle not relaunching | Investigate `generateCorpsDirectives` / sector relaunch path |
| **P1** | Brcko regressing (RS lost 2 OSIDs it started with) | Bug | EBK dormancy leaves Brcko undefended | Fix P0 first; then verify Brcko not counterattacked |
| **P2** | 504th ARBiH brigade not spawning → orasac_2 undefended | Data gap | formation_spawn_directive missing 5th Corps brigades | Ensure 504th spawns w1–2 in Bihać pocket |
| **P3** | Bihać municipality anchor = false failure | Scenario fix | Anchor uses municipality majority, not city OSID | Change anchor to `op:bihac:bihac_2` (OSID type) |
| **P4** | RBiH civilian killed 13,766 (~2× historical) | Tuning | DISPLACEMENT_KILLED_FRACTION=4% too high for routine displacement | Add `DISPLACEMENT_KILLED_FRACTION_RBIH_FROM_RS=0.02` |
| **P5** | Att:def ratio 3.4:1 (target 2.5–3:1) | Tuning | 33% defender-absent battles inflate ratio | Reduce BASE_ATTACKER_LOSS_RATE 0.04→0.035; or cap walk-in attacker casualties |
| **P6** | `operation_recovery_without_logged_attempt` week 4 | Bug | Operation enters recovery with 0 objective attempts | Investigate same path as P0 (eligible attacker finding) |
| **P7** | Supply_reserves drain not visible in harness | Reporting gap | end_report "supply pressure" = Phase I metric | Add supply_reserves to end_report or verify in final_save |
| **P8** | Bot benchmarks RS 11–14pp below target | Downstream | Caused by P0 (corps dormancy) | Re-evaluate after P0 fix |

---

## Single Priority and Owner

**Single priority: P0 — Investigate and fix corps operation relaunch.**

After a pre-planned (or any) operation completes recovery, both vrs_drina and vrs_east_bosnian corps sit idle for 36 weeks. This is not a data/scenario problem — it is an engine behavior gap in the corps bot AI or sector offensive lifecycle. Fixing it would unlock the organic VRS sustained campaign dynamic that the design intends and likely recover 10–20pp in Drina and Posavina.

**Owner:** Gameplay Programmer. Investigate `generateCorpsDirectives()`, `sector_offensive.ts`, and brigade availability post-recovery. PM to scope as investigation task with diagnostic logging before fix.

**Expected impact after P0 fix:** Drina region 69%→85%+, Posavina/NE 72%→82%+, overall area-weighted 84.2%→92–95%.

---

## References

- Run: `runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n218/`
- Calibration master: `docs/40_reports/CALIBRATION_MASTER.md`
- Pre-planned ops: `src/sim/combat/pre_planned_operations.ts`
- Painted reference: `data/source/calibration/painted_control_jan1993.json`
- BB extraction (control): `data/derived/knowledge_base/balkan_battlegrounds/extractions/20260224_HISTORIAN_BASELINE_CONTROL_START_20W_52W.md`
- Systems Manual §7, Phase II spec
- PROJECT_LEDGER.md
