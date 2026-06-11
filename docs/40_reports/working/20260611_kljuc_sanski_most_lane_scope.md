# Ključ / Sanski Most Lane Scope — 2026-06-11

**Run:** `apr1992_definitive_188w__acb538b04d79af3c__w188_n7` (main, commit 0589ccafe)  
**Hash:** `345e044b7642aeab` — matches current floor (649/712, 30/30 anchors)  
**Purpose:** READ-ONLY scoping. No code was changed.

---

## 1. Current Mismatch Table — Western Krajina

Comparison: sim final state (W188) vs `painted_control_oct1995.json`.

### Ključ municipality (4 OSIDs wrong)

| OSID | Sim (final) | Painted (target) | Delta |
|------|------------|------------------|-------|
| `op:kljuc:hadzici` | RS | RBiH | RS over-hold |
| `op:kljuc:kljuc_2` | RS | RBiH | RS over-hold |
| `op:kljuc:krasulje_2` | RS | RBiH | RS over-hold |
| `op:kljuc:donji_vrbljani_2` | RS | HRHB | RS over-hold |

`sanica_2` is **correct** (sim=RBiH, painted=RBiH). It was reached at W188 — the last turn.

### Mrkonjić Grad municipality (6 OSIDs wrong — separate lane)

| OSID | Sim (final) | Painted (target) | Delta |
|------|------------|------------------|-------|
| `op:mrkonjic_grad:mrkonjic_grad_2` | RS | HRHB | HVO under-capture |
| `op:mrkonjic_grad:gerzovo_2` | RS | HRHB | HVO under-capture |
| `op:mrkonjic_grad:majdan_2` | RS | HRHB | HVO under-capture |
| `op:mrkonjic_grad:podrasnica_2` | RS | HRHB | HVO under-capture |
| `op:mrkonjic_grad:bjelajce_2` | RS | HRHB | HVO under-capture |
| `op:mrkonjic_grad:baljvine_2` | RS | HRHB | HVO under-capture |

Mrkonjić Grad is covered by **Operation Southern Move** (HVO; `operation_opportunity_catalog_federation_western_bosnia.ts` line 381). That op completed 12/13 objectives by W185 and entered recovery — Mrkonjić Grad objectives are in its `SOUTHERN_MOVE_MRKONJIC_OBJECTIVES` list (lines 81-87) but the axis stalled. This is a **separate HVO lane**, not a 5th Corps / Sana issue.

### Other false-positive

| OSID | Sim (final) | Painted (target) | Note |
|------|------------|------------------|------|
| `op:orasje:ostra_luka` | HRHB | RS | False alarm — `op:sanski_most:ostra_luka` is correctly RBiH; this is the Orašje municipality `ostra_luka`, a different OSID |

**Total western Krajina mismatches attributable to Sana / 5th Corps: 4 (Ključ interior)**  
**Separate HVO lane (Southern Move / Mrkonjić): 6**

---

## 2. Op Sana Diagnosis

### Event timeline (key events, W165-188)

| Week | Event |
|------|-------|
| W172 | `nato_deliberate_force_1995` fires |
| W173 | `federation_ground_offensive_1995`, `operation_summer_95` fire |
| W175 | `operation_storm_1995` fires → `isWesternTheaterRuptured()` → TRUE |
| W176 | Op Sana enters **planning** (planning_duration=5, so execution starts W178) |
| W178 | Op Sana enters **execution** — 10 brigades active, all 3 axes |
| W180 | `operation_sana_1995` narrative event fires (morale/supply effects only) |
| W189 | `us_halts_federation_advance_1995` fires — **1 turn AFTER the 188-turn run ends** |

### Sana progress per week

| Week | Phase | Obj Completed | Current Objective | 3rd-axis (517th) active? |
|------|-------|--------------|-------------------|--------------------------|
| W176 | planning | 0/0 | `bihac:ripac` | — |
| W177 | planning | 0/0 | `bihac:ripac` | — |
| W178 | execution | 2/3 | `bihac:racic` | YES |
| W179 | execution | 4/6 | `bihac:orasac_2` | YES |
| W180 | execution | 7/9 | `bosanska_krupa:vranjska_2` | YES |
| W181 | execution | 10/12 | `bosanska_krupa:jasenica_2` | YES |
| W182 | execution | 13/15 | `bosanska_krupa:gornja_suvaja` | YES |
| W183 | execution | 16/18 | `bosanski_petrovac:kolonic_2` | YES |
| W184 | execution | 18/20 | `bosanski_petrovac:bosanski_petrovac_2` | YES |
| W185 | execution | 20/22 | `bosanski_petrovac:dobro_selo_2` | YES |
| W186 | execution | 23/25 | `bosanski_petrovac:jasenovac_2` | YES |
| W187 | execution | 25/27 | `sanski_most:kljevci` | YES |
| W188 | execution | 26/28 | `kljuc:sanica_2` | YES (1 brigade) |
| W189* | execution | 27/29 | `kljuc:hadzici` | YES | 

*W189 = 1 turn past sim end (week_index 188, turn 189). The run logs it because the weekly_report includes the post-final turn state.

### Key findings

1. **Op Sana IS launching and IS working.** Launch at W176 (planning), execution W178 — 13 objective-captures in the Sana/Petrovac axis cluster, all Sanski Most OSIDs captured. The "2/13 follow-on" issue from the June 7 brief is **RESOLVED** — that follow-on was retired in commit #284 (2026-06-08) and folded into the third axis `sana_sanski_most_kljuc`.

2. **The old brief's "launch earlier" hypothesis is STALE.** Op Sana now launches at W175-176 (Storm fires W175 → alliances_context green → date_window opens at 175 → planning starts immediately → execution W178). This is correct timing. The problem is NOT launch timing.

3. **E-A5 (`us_halts_federation_advance_1995`) fires at turn 189 — AFTER the 188-turn run ends.** It has ZERO impact on Sana execution. The launch-halt gate in `sector_offensive.ts:1427` is never triggered during the run. E-A5 is not a factor here at all.

4. **Root cause: 3rd-axis `sana_sanski_most_kljuc` uses only 1 active brigade (517th_light).** The axis is assigned `arbih_506th_mountain` + `arbih_517th_light` (catalog lines 232-235), but week-by-week the attack orders show only `517th_light` engaging. The 506th appears to be elsewhere or not reaching the front edge. With 1 brigade attacking 1 objective per turn, the chain of 13 SANSKI_KLJUC_OBJECTIVES takes 13 turns minimum. Sana starts execution at W178; 13 turns reaches W190 — 2 turns past the sim end.

5. **sanica_2 captured at W188, hadzici at W189 (past end), kljuc_2/krasulje_2 not reached.** The chain at W188 is at `kljuc:sanica_2` (12th of 13 objectives). The remaining 3 Ključ interior OSIDs (`hadzici`, `kljuc_2`, `krasulje_2`) are not reached within the 188-turn budget.

6. **Sana Krupa and Bihać-Petrovac axes perform well** — 10 brigades, capturing objectives at 2-3/turn. All Sanski Most + Bosanski Petrovac OSIDs flip correctly.

---

## 3. Root Cause — Why Only 1 Brigade on the 3rd Axis

The 3rd axis `sana_sanski_most_kljuc` is assigned 2 brigades: `arbih_506th_mountain` and `arbih_517th_light`. The axis stages at `jasenica_2` — front-edge-blocked until the Krupa axis captures `jasenica_2`.

**Probable cause:** `jasenica_2` is captured by the Krupa axis around W181 (W181 diagnostic shows current_objective = `bosanska_krupa:jasenica_2`, meaning it's being attacked that turn). The 3rd axis unblocks at that point. But by W181, the `arbih_506th_mountain` may already be committed at a different location on the Krupa axis chain or is still in movement. Only the 517th is positioned to immediately press forward.

With 1 effective brigade on 13 objectives starting ~W181, the chain completes at best W181+13 = W194 — well past W188.

**Verification needed:** Check `brigade_temporal_log.jsonl` for 506th location at W181-188.

---

## 4. Ranked Levers

### Lever 1 (RECOMMENDED — try first): Add a 3rd brigade to `sana_sanski_most_kljuc` axis

**File:line:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`, lines 232-235  
**Current:**
```typescript
brigades: [
    'arbih_506th_mountain' as FormationId,
    'arbih_517th_light' as FormationId,
],
```
**Proposed change:** Add one brigade from the 5th Corps roster that is NOT already on the Krupa (511th, 505th, 510th) or Bihać-Petrovac (501st, 502nd, 503rd, 504th, hvo_101st) axes. Candidate: none exist in the 5th Corps 10-brigade roster — all 10 are already assigned. Alternative: reduce the planning_duration from 5→3, which moves execution start from W178 to W176, giving 2 extra turns. That gets `sanica_2` at W186, `hadzici` at W187, `kljuc_2` at W188, `krasulje_2` at W189 — still 1 short.

**REVISED Lever 1:** Reduce `planning_duration` from 5 to 3.  
**File:line:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`, line 353  
**Current:** `planning_duration: 5`  
**Change:** `planning_duration: 3`  
**Effect:** Execution starts W176 instead of W178. The 3rd axis gets 2 more turns. With 1 brigade/turn rate: `sanica_2`→W186, `hadzici`→W187, `kljuc_2`→W188, `krasulje_2`→W189 (still 1 past). This flips 3 of 4 Ključ targets within budget.  
**Predicted flips:** `kljuc:sanica_2` (already flipping), `kljuc:hadzici` (+1), `kljuc:kljuc_2` (+1), `kljuc:krasulje_2` may miss by 1 turn.  
**Net gain estimate:** +2 OSID (hadzici + kljuc_2); krasulje_2 borderline; donji_vrbljani_2 is outside the Sana chain entirely.

### Lever 2: Investigate why 506th is not attacking on the 3rd axis

If the 506th IS reaching jasenica_2 but not issuing attack orders, the bug is in brigade role assignment or front-edge resolution. Check `brigade_temporal_log.jsonl` for 506th position W181-188. If it's stuck in movement, the fix is in the staging or adjacency logic — a no-combat-math change.

**File:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` lines 232-235 (axis brigade list) + `src/sim/combat/sector_offensive.ts` (front-edge resolver).  
**Risk:** Could be deeper in the multi-axis brigade assignment logic. Needs a diagnostic pass before a change.

### Lever 3: Add `donji_vrbljani_2` to the SANSKI_KLJUC_OBJECTIVES chain

`op:kljuc:donji_vrbljani_2` is painted HRHB but is not in the Sana objective list. Historically HVO took parts of Ključ. Adding it as a late objective would require confirming adjacency (likely adjacent to `krasulje_2` or `kljuc_2`). Low risk but depends on Lever 1/2 first reaching `kljuc_2`.

---

## 5. E-A5 Interaction — Confirmed Non-Issue

The brief (June 7) flagged a potential conflict between E-A5 and the Sana timing. **This conflict does not exist in the current engine:**

- E-A5 fires at turn 189 (W189), which is past the 188-turn run end.
- The launch-halt gate in `sector_offensive.ts:1427` is only checked at the planning→execution transition. Op Sana transitioned to execution at W178, before E-A5 could possibly fire.
- Even if E-A5 fired earlier (it requires RS area ≤ 0.51, `turn_min=182`), the gate only blocks NEW launches, not in-progress ops.
- **Conclusion:** E-A5 is calibration-inert for the Ključ/Sanski Most lane. The June 7 brief's concern is stale.

---

## 6. Cross-Cascade / §6 Risk Assessment

### Zvornik v6 lesson (cascade warning)

The memory warns: "holding western OSIDs can collapse vrs_2nd_krajina and cause HRHB→RS losses elsewhere." The specific risk was: gaining Zvornik + western OSIDs simultaneously strains `vrs_2nd_krajina`, causing cascades in SE Bosnia.

**Assessment for the Ključ lever:**
- The proposed change (planning_duration 5→3) **does not touch the Zvornik anchor** — Op Zvornik is a VRS garrison-pin separate from Sana.
- `vrs_2nd_krajina` is already the Sana defender corps. Additional Ključ captures are within the same western theater — no cross-corps cascade into Drina/SE Bosnia expected.
- The prior cascade (Zvornik v6) occurred when a `must_hold` OOB change caused Zvornik to over-hold while western VRS was stripped — a different mechanism.
- **Risk: LOW** for planning_duration change alone.

### §6 risk

Mrkonjić Grad (Lever 3 adjacent, separate lane) is not §6-sensitive. The Ključ interior (hadzici, kljuc_2, krasulje_2) is not near Srebrenica/Žepa/Goražde. The 3rd axis walks south from Bosanska Krupa through Sanski Most into Ključ — entirely western theatre.

**§6 verdict: NONE.** No Srebrenica/Žepa path involvement. All 4 mismatched Ključ OSIDs are in the western Krajina cluster.

### Anchors at risk

All 30 anchors pass in the current run. The proposed Lever 1 change (planning_duration 5→3) is calibration-inert at 40w (Sana fires turn ≥175, outside 40w window). The only 188w anchors near the western theatre are the Krajina pre-collapse anchors (checked at W156, not W188) — those pass. **No anchor risk identified.**

---

## 7. Mrkonjić Grad — Separate Lane Assessment

The 6 Mrkonjić Grad mismatches (sim=RS, painted=HRHB) are under **Operation Southern Move** in `operation_opportunity_catalog_federation_western_bosnia.ts`. That op launched at W182 and reached recovery at W185 with 12/13 objectives. The Mrkonjić Grad axis (`southern_move_mrkonjic`, line 381) targets all 6 of these OSIDs. The stall (1 objective short) is the Southern Move lane, not the 5th Corps lane.

**Do NOT conflate with the Ključ lane.** These are two distinct calibration problems:
1. Ključ: 5th Corps 3rd-axis turn budget (fix: planning_duration or 506th investigation)
2. Mrkonjić Grad: HVO Southern Move stall (separate lane, separate fix)

---

## 8. Summary

**What changed since the June 7 brief:** The "follow-on launching too late (2/13)" problem was **already fixed** in commit #284 (2026-06-08) by folding the follow-on into the main Sana op as a 3rd axis. Op Sana now launches correctly at W176 and runs continuously through W188+. The Sanski Most cluster is fully captured. The Ključ interior is not a timing problem — it is a **single-brigade throughput problem** on the 3rd axis.

---

# ADDENDUM — 2026-06-11 (Lever #2 investigation, post #416)

**Run:** same n7 (`345e044b`, main). **Lever #1 (planning_duration 5→3) confirmed INERT** by the builder (PR #416 closed, 188w byte-identical to floor).

## A. Why planning_duration was inert

Op Sana's launch is **Storm-trigger-bound, not planning_duration-bound.** `dateWindowSana` (catalog line 244) gates the date_window predicate at `turn >= 175`, and `allianceContextSana` (line 253) requires `isWesternTheaterRuptured()` = the `operation_storm_1995` event has fired. In the run, Storm fires **W175** (confirmed in weekly_report events_fired). The opportunity cannot surface before W175 regardless of planning_duration. Once it surfaces (W175→W176 planning), planning_duration governs only the planning→execution gap, but the brigades cannot reach the front-edge any earlier because the staging OSID (`jasenica_2`) is itself front-edge-gated until the Krupa axis captures it (~W178-181). So shaving planning turns produces no earlier objective captures — the binding constraint is downstream (front-edge reachability + per-objective advance), not the planning clock. **A pure timing lever is not viable for this lane.**

## B. Root cause of the 506th attack-order gap (file:line cited)

The 506th is **correctly assigned** to the 3rd axis — `final_save` shows `sana_sanski_most_kljuc.assigned_brigades = ["arbih_506th_mountain","arbih_517th_light"]`, commitment `'standard'` (operation_opportunities.ts:1068 default → both brigades survive `applyCommitmentProfile`). Brigade temporal log (`brigade_temporal_log.jsonl`, n7) shows BOTH carry `active_op_id: "arbih_5th_corps:Operation Sana:t175"` from W175. So root-cause **(a) "not assigned"** and **(c) "role gate"** are FALSE.

The actual cause is **(b) front-edge throughput + staging latency**, and it is STRUCTURAL:

1. **The 506th is deployed in the deep rear (`op:bihac:bihac_2`) and the 3rd axis stages at the front-edge-gated `jasenica_2`** (catalog `STAGING_JASENICA`, line 74 + axis `staging_osid` line 237). The 517th deploys forward (`brekovica_2`/`gornja_suvaja`) and rides the Krupa axis front from W177. The 506th cannot transit to `jasenica_2` until that OSID is captured (~W178); it issues its move order W179, goes `in_transit` W180-181, and only arrives + joins `sector:arbih_5th_corps:1` (the 3rd-axis sub-segment) at **W182** — a 6-7 turn dead period (W175-181) where it sits idle at bihac_2 issuing no attack orders. (Temporal log: loc=bihac_2, mv_state=null through W179, in_transit W180-181, jasenica_2 W182.)

2. **The decisive structural cap: an axis advances exactly ONE objective per turn regardless of brigade count.** `getCurrentLaunchObjectives()` (`src/sim/combat/sector_offensive_axis_helpers.ts:56-61`) returns `axis.objectives[axis.current_objective_index]` — a SINGLE objective per axis. Two brigades on one axis both attack that one objective, the index then advances by one. So 13 SANSKI_KLJUC objectives need **≥13 turns** no matter how many brigades are committed. The 506th "attacking" would NOT speed the axis up — it would just double-stack the same single front-edge objective.

3. **Turn-budget math:** execution starts W178; 13 single-objective steps ⇒ earliest completion W191. Budget ends W188. The axis ends at **obj_idx 10/13** (final_save) — exactly 3 short: `kljuc_2`, `hadzici`, `krasulje_2` unreached (`sanica_2` = obj #10, captured W188). The 4th mismatch `donji_vrbljani_2` is not in the chain at all (painted HRHB; Southern Move / separate lane).

**Conclusion:** "Get the 506th attacking" is the wrong framing — the 506th cannot help a single-file axis. The root cause is **a 13-deep single axis hitting the 1-objective/turn cap, started too late (W178) to finish in budget.** The 506th idle period is a symptom of the same staging gate, not an independent bug.

## C. Geographic feasibility of a parallel split (the real fix)

Intra-chain adjacency (from `operational_contact_graph.json`) shows the Ključ interior is **NOT** gated behind the full 9-OSID Sanski Most belt. Direct edges exist:
- `sanski_most:jelasinovci ↔ kljuc:sanica_2` (jelasinovci is chain objective #3, captured ~W181)
- `sanski_most:ilidza_2 ↔ kljuc:krasulje_2`, `sanski_most:kljevci ↔ kljuc:sanica_2/krasulje_2`
- `kljuc:sanica_2 ↔ hadzici ↔ kljuc_2 ↔ krasulje_2` (the Ključ cluster is internally connected)

So the Ključ tail can be peeled into a **parallel second axis** that branches off `jelasinovci` rather than waiting for the full Sanski Most belt. Two parallel axes (each 1 OSID/turn) halve the critical path.

## D. #1 RECOMMENDED CHANGE

**This is NOT a clean single-line lever — it is a minimal multi-field catalog edit (one axis → two axes).** Stated explicitly per the brief.

**Minimal first step (single, concrete, file:line):** Split the 13-objective `sana_sanski_most_kljuc` axis (catalog lines 229-237) into two axes:

- **File:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
- **Constant edit, lines 130-144** (`SANSKI_KLJUC_OBJECTIVES`): split into two lists —
  - `SANSKI_MOST_OBJECTIVES` = the 9 Sanski Most OSIDs (`budimlic_japra_2 … kljevci`)
  - `KLJUC_INTERIOR_OBJECTIVES` = `['op:kljuc:sanica_2','op:kljuc:krasulje_2','op:kljuc:kljuc_2','op:kljuc:hadzici']` (sanica_2 first — directly adjacent to jelasinovci; then the internally-connected cluster)
- **Axis edit, lines 206-238:** replace the single 3rd axis with two axes — 517th drives `SANSKI_MOST_OBJECTIVES` (staging `jasenica_2`), 506th drives `KLJUC_INTERIOR_OBJECTIVES` staged forward at **`op:sanski_most:jelasinovci`** (the branch point; reached ~W181, ungated once the 517th passes it).

**Predicted effect:** the 506th axis branches off jelasinovci ~W181 and advances sanica_2→krasulje_2→kljuc_2→hadzici in parallel (~W181+4 = W185-186), in budget. **Flips: `kljuc:kljuc_2`, `kljuc:hadzici`, `kljuc:krasulje_2` RS→RBiH (+3 OSID, 649→652).** `sanica_2` already flips. `donji_vrbljani_2` (painted HRHB) is out of scope.

**Why not a true one-liner:** changing only the `staging_osid` of the existing single axis (e.g. jasenica_2 → a forward OSID) removes the 506th's 6-turn idle but does NOT beat the 1-objective/turn cap — the axis still needs 13 turns single-file. Only splitting the axis parallelizes the work. If the builder wants the absolute-smallest probe first: **move the 3rd-axis `staging_osid` from `STAGING_JASENICA` to `'op:sanski_most:jelasinovci'` (line 237)** — this is a true one-field change that may pull the 506th forward and buy 1-2 objectives, but is predicted INSUFFICIENT alone (won't beat the depth cap). The axis split is the change that lands all 3.

## E. §6 + cascade risk (unchanged from §6 above)

- **§6: NONE.** Entirely western-Krajina theatre; no Srebrenica/Žepa/Goražde adjacency. The split reorders objectives the op already targets — no new OSIDs, no new theatre.
- **Cascade: LOW.** Same defender corps (`vrs_2nd_krajina`), same theatre, +3 OSID. Does not touch the Zvornik garrison-pin, OOB, or Drina/SE Bosnia. Watch-item: confirm 188w anchors stay 30/30 and `vrs_2nd_krajina` doesn't trip a `disconnected_sector_territory` critical when the Ključ cluster peels off (the catalog comment at lines 125-129 already notes jelasinovci stranding risk — keep jelasinovci on the Sanski Most axis as authored, branch the NEW axis FROM it without removing it).
- **40w:** byte-identical (Sana fires ≥W175, outside 40w). 188w is the authoritative gate.

**Current mismatch:** 4 Ključ OSIDs (hadzici, kljuc_2, krasulje_2, donji_vrbljani_2) remain RS. The 3rd axis reaches `sanica_2` on W188 (the last turn) and would reach `hadzici` on W189 (one turn past end). The chain needs ~2 more turns OR a second active brigade.

**Recommended single change:** `planning_duration: 5 → 3` in `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` line 353. This moves Sana execution from W178 to W176, giving the 3rd axis 2 more turns. Predicted to flip `hadzici` + `kljuc_2` within budget; `krasulje_2` borderline; `donji_vrbljani_2` requires a separate investigation (it's not in the Sana objective chain).

---

*Report generated 2026-06-11. Run: n7 on main commit 0589ccafe. READ-ONLY scope — no code was modified.*
