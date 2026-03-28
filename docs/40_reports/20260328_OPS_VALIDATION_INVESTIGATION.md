# Operations Validation Investigation Report — 2026-03-28

**Run**: n1148 (40w, 92.2% area-weighted, 22/22 anchors, 6/6 benchmarks)
**Context**: New `validateOpAtInjection` engine gate surfaced 21 issues (9 errors, 12 warnings). Four specialist agents investigated; four reviewers cross-examined findings.

---

## 1. Staging Adjacency Errors (9 flagged → 5 false positives, 1 edge case, 3 real)

### Root Cause: Validation Logic Bug

`validateOpAtInjection` Check C sorts objectives alphabetically, then finds the first ENEMY-held objective. But ops define objectives in march order — brigades walk through already-owned objectives to reach enemy ones. The validation should check adjacency to the **first objective in definition order**, not the first enemy objective.

### Breakdown

| # | Op / Axis | Verdict | Reason |
|---|---|---|---|
| 1 | Koridor / brcko_corridor | **REAL** | dvorovi_2 (Bijeljina) is 6 hops from any Brcko objective. Fix: change staging to crnjelovo_donje |
| 2 | Koridor / posavina_flank | **FALSE POSITIVE** | samac_2 (first in list) IS adjacent to staging. Already RS at t0, so validator skips it |
| 3 | Drina / zvornik_sweep | **FALSE POSITIVE** | zvornik (first in list) IS adjacent. Same skip issue |
| 4 | Drina / bratunac_vlasenica | **REAL** | ljubovija_2 is across the Drina river (Serbia). 0 adjacency neighbors. Fix: change staging to slapasnica |
| 5 | Prsten / western_sarajevo | **FALSE POSITIVE** | sarajevo_dio_ilidza_2 (first in list) IS adjacent |
| 6 | Prsten / northern_ring | **REAL** | First objective (vogosca:svrake) genuinely not adjacent to staging (ilijas:srednje). Fix: reorder objectives or change staging to podlugovi |
| 7 | Herzegovina / mostar_heights | **FALSE POSITIVE** | vranjevici_2 (first in list) IS adjacent |
| 8 | Prijedor / prijedor_clean | **FALSE POSITIVE** | ljubija_2 (first in list) IS adjacent |
| 9 | Prijedor / sanski_most | **FALSE POSITIVE** | Investigator claimed ilidza_2 orphaned — reviewer found op:sanski_most:ilidza_2 has 8 neighbors (OSID format confusion) |

### Fix Plan
- **Validation**: Change Check C to use definition order, not sorted order. Add staging==objective short-circuit.
- **Data**: Fix 3 real staging errors in pre_planned_operations.ts.
- **Graph**: No fixes needed. ljubovija_2 is correctly absent (it's in Serbia).

---

## 2. Objectives Already Owned (4 ops flagged → 1 data error, rest fine)

### Breakdown

| Op | Axis | Finding | Verdict |
|---|---|---|---|
| Op Foča | foca_valley | All 7 objectives RS by t7 | **WORKING AS DESIGNED** — explicit code comment. Kalinovik axis still fires. |
| Op Corridor | corridor_south | 3 HRHB objectives | **REDUNDANT BUT NOT WRONG** — VRS historically fought HVO in Posavina. Graz Accords explicitly exempt Posavina. Op Koridor (EBK) takes these first, making axis dead. But if Koridor stalled, this would correctly attack HRHB. |
| Op Teočak | vitinica_recovery | sapna is RBiH (same faction) | **DATA ERROR** — RBiH attacking own territory. Remove axis or change objective to RS-held OSID. |
| Op Cerska-Kamenica | cerska_pocket | 1 of 2 objectives already RS | **ACCEPTABLE** — partial loss, op still fires with brezovice_2. |

### Key Correction
Initial investigation claimed Op Corridor was a "CRITICAL CONFIG ERROR" (RS attacking HRHB allies). Reviewer overturned this: the VRS Corridor offensive explicitly targeted HVO-held Odžak (fell 12 July 1992, BB1 p.182). `local_truces.ts` exempts `vrs_1st_krajina` from Graz RS-HRHB block. **No `isHostile()` check needed.**

### Fix Plan
- Remove Op Teočak vitinica_recovery axis (targets own faction).

---

## 3. Brigade Spawn Timing (2 ops affected)

### Breakdown

| Op | Brigade | OOB available_from | Actual creation | Op injection turn | Gap |
|---|---|---|---|---|---|
| Op Herzegovina Consolidation | rs_2nd_herzegovina_light_infantry | 0 | 14 | 14 | 0 (same-turn race) |
| Op Teočak | arbih_254th_mountain | 4 | 31 | 15 | 16 turns |

### Root Cause: Pipeline Ordering + Recruitment Gates

1. **Pipeline**: Ops inject at step ~808, recruitment runs at step ~1518. In the same turn, a brigade can't be recruited before the op that needs it.
2. **Recruitment gates**: `canFormEmergentBrigade()` requires pool capacity + existing brigade fill rates + territorial control. A brigade with `available_from=4` may not actually recruit until turn 31.
3. **arbih_254th_mountain**: home_mun=lopare (RS-controlled). RBiH has no presence → recruitment blocked by `factionHasPresenceInMun()`.

### Proposed Fix (Deferred — medium complexity)
Operation-aware pre-flight recruitment: when `buildAxesFromDef` finds a missing brigade that exists in OOB with `available_from <= currentTurn`, force-recruit before proceeding. Requires threading OOB catalog to injection functions. For territory-blocked brigades like 254th, add `recruit_bypass_control` flag.

**Not implementing now** — this is a structural change that needs its own session with full calibration verification.

---

## 4. Empty Sectors (5 persistent)

### Root Cause
`ensureMinimumSectorCoverage` (brigade_assignment.ts L822-913) only transfers from surplus sectors (2+ brigades). When all corps sectors have 0-1 brigades, no donor exists → empty sectors stay empty.

### Affected Sectors
| Sector | Edges | OSIDs | Corps | Issue |
|---|---|---|---|---|
| arbih_3rd_corps:4 | 4 | 1 | 3rd Corps | Last sector in allocation, unfunded |
| hvo_central_bosnia:3 | 1 | 1 | CB HVO | Marginal 1-edge sector |
| hvo_central_bosnia:4 | 1 | 1 | CB HVO | Marginal 1-edge sector |
| hvo_tomislavgrad:1 | 1 | 1 | Tomislavgrad | Marginal 1-edge sector |
| vrs_sarajevo_romanija:1 | 14 | 6 | SRK | **Egregious** — 14 edges, 0 brigades |

### Proposed Fix (Deferred — medium complexity)
Edge-count triage: allow borrowing from 1-brigade sectors when the empty sector has MORE front edges. The SRK sector:1 case (14 edges vs 1-edge donors) should be highest priority.

---

## 5. Passive Brigades (77 never fight, 33%)

### Breakdown by Cause
| Category | Count | Fixability |
|---|---|---|
| On front, never ordered into combat | 50 | Bug — ops-only doctrine + cooldown gaps |
| Unassigned / disconnected | 8 | Partial — improve drift recall |
| Reserve, never promoted | 7 | Fixable — promotion logic |
| HRHB cold front (Graz) | 6 | Structural, expected |
| Deep rear / garrison | 6 | Expected |

### Root Cause
Ops-only doctrine + 1 op/corps/time + exhaustion cooldown (8 turns) means each corps gets ~5 ops in 40 weeks. With 3-5 brigades per op, most brigades are never selected.

### Proposed Fix (Deferred — needs design review)
1. Reduce cooldown (8→5 for balanced/defensive corps)
2. Rotate idle brigades into ops (prefer 0-engagement brigades)
3. Broaden counter-attacks (neighbor OSID lost within 3 turns → allow response)
4. Target: 20-25% never-fighting (structural floor ~15%)

---

## Implementation Priority

| # | Fix | Type | Risk | Session |
|---|---|---|---|---|
| 1 | Fix validation Check C (definition order, not sorted) | Code | Low | **This session** |
| 2 | Fix Op Teočak vitinica_recovery (remove dead axis) | Data | Low | **This session** |
| 3 | Fix 3 real staging errors (Koridor, Drina, Prsten) | Data | Low | **This session** |
| 4 | Empty sector edge-count triage | Code | Medium | Next session |
| 5 | Operation-aware pre-flight recruitment | Code | Medium | Next session |
| 6 | Corps cooldown + counter-attack broadening | Code | Medium | Design review first |
