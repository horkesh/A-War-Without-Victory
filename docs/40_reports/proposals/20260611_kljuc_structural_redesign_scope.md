# Ključ Interior Structural Redesign — Scope (READ-ONLY)

**Date:** 2026-06-11 · **Authors:** Operations Expert + Historian · **Status:** SCOPE (no code edited)
**Target:** flip `op:kljuc:hadzici`, `op:kljuc:kljuc_2`, `op:kljuc:krasulje_2` RS→RBiH at 188w (+3 OSID).
**File under redesign:** `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (Operation Sana).

## Historical ground truth (ICTY / BB1 Ch.91-93 — LOCKED)
- Bosanski Petrovac fell **15 Sep 1995** (ARBiH 5th Corps, 502nd Mountain Bde).
- **Ključ town fell 17 Sep 1995** to 5th Corps **501st + 510th**, advancing FROM Petrovac (south).
- Then on toward Sanski Most (~10 Oct). So Ključ interior is a **PETROVAC-axis, mid-Sept** objective — reached EARLY from the SOUTH, not a late Sanski-Most tail.

## Two prior single-lever failures (panel-verified)
- `planning_duration 5→3`: INERT (op is Storm-trigger-bound, byte-identical).
- Axis-split `sana_sanski_most_kljuc` staged at `jasenica_2`, 506th+517th: CLEAN but only `sanica_2` flipped. The 506th's walk from jelasinovci (north/Sanski-Most approach) is adjacency-blocked/depleted before reaching the interior in-budget.

## Contact-graph evidence (data/derived/operational/operational_contact_graph.json)
Adjacency of the three interior OSIDs (shared_segments):
- `hadzici` ↔ **`bosanski_petrovac:jasenovac_2` seg=17** (huge border), ↔ `krasulje_2` seg=9, ↔ `kljuc_2` seg=5, ↔ `sanica_2` seg=3
- `kljuc_2` ↔ `hadzici` seg=5, ↔ `donje_ratkovo_2` seg=7, ↔ `donji_vrbljani_2` seg=5 (interior-only; the deepest node)
- `krasulje_2` ↔ `sanski_most:ilidza_2` seg=19, ↔ `hadzici` seg=9, ↔ `sanica_2` seg=4

**BFS hop-distance to the interior-3 (the load-bearing fact):**
| Source | hadzici | krasulje_2 | kljuc_2 |
|---|---|---|---|
| `jasenovac_2` (Petrovac axis FINAL objective, BIHAC_PETROVAC_OBJECTIVES[9]) | **1** | **2** | **2** |
| `jelasinovci` (north, current 3rd-axis approach) | 2 | 2 | 3 |
| `sanica_2` (already flips today) | 1 | 1 | 2 |

The Petrovac axis ALREADY captures `jasenovac_2` as its terminal objective — and `jasenovac_2` shares a **17-segment border with hadzici**, the gateway to the whole interior. The south corridor is **1 hop shorter** to hadzici/kljuc_2 than jelasinovci. **The interior is geometrically a Petrovac-axis extension, exactly as history says.**

## Root cause of the prior axis-split failure
It was NOT path length (jelasinovci is only 1 hop further). It was **force state + timing**: the jelasinovci approach makes the 506th/517th walk the long Krupa→Sanski-Most belt first (jasenica_2 is 4 hops from the interior via that belt), arriving recovery-depleted ~W184+, while the interior's deepest node `kljuc_2` is only reachable through `hadzici` — which they never take. Meanwhile the strong 5-brigade Petrovac axis (501/502/503/504/101st) sits idle at `jasenovac_2` one hop from hadzici with no objectives left to take.

## RECOMMENDED STRUCTURAL APPROACH: (c) re-root onto the Petrovac corridor — extend BIHAC_PETROVAC_OBJECTIVES
Do NOT build a new axis or standalone op. **Append the interior-3 to the END of the existing 5-brigade `sana_bihac_petrovac` axis**, immediately after `jasenovac_2`, in graph-verified order:

```
BIHAC_PETROVAC_OBJECTIVES (current tail … jasenovac_2)
  → op:kljuc:hadzici        (jasenovac_2 → hadzici, seg=17, 1 hop)
  → op:kljuc:kljuc_2        (hadzici → kljuc_2, seg=5, adjacent)
  → op:kljuc:krasulje_2     (hadzici → krasulje_2, seg=9, adjacent; or via kljuc_2 seg=3)
```
Every step is a verified front-edge hop. The 5-brigade Petrovac axis reaches `jasenovac_2` at hop-depth 5 from `bihac_2` and is at full or near-full strength there (it is the corps's strongest concentration). Adding 3 contiguous objectives = 3 more advance cycles.

Then **retire the failed 3rd axis** `sana_sanski_most_kljuc` OR repurpose it to carry ONLY the Sanski-Most belt (drop its 4 `op:kljuc:*` objectives, which now belong to the Petrovac axis). The 506th/517th stay on the Sanski-Most belt where they already work; sanica_2 still falls via convergence.

### Turn-budget feasibility (~W175 launch → W188)
- 13 turns available. Petrovac axis already reaches `jasenovac_2` well inside budget in current runs (it's existing, working content). Three additional contiguous objectives at ~1-3 turns each (capture or MAX_CONSECUTIVE_FAILURES=3 skip) = ~3-9 turns. **Fits in-budget** IF jasenovac_2 is reached by ~W182-183. This is the central empirical risk and must be measured at 188w. `kljuc_2` (deepest, reachable only through hadzici) is the most at-risk of the three.

### Brigade availability (no double-booking)
5th Corps holds 10 line brigades. Petrovac axis uses 5 (501/502/503/504/101st). Krupa uses 3 (511/505/510). That is 8/10. **506th + 517th remain free** — keep them on the Sanski-Most belt. No new brigade demand; the re-root reuses the already-committed strong Petrovac concentration. No double-booking.

## Cascade / §6 risk
- **§6: NONE** (all-western, no enclave/atrocity surface).
- **Working-axis regression risk: LOW-to-MODERATE.** The re-root adds objectives to an EXISTING axis without pulling brigades off Krupa (the +6 Sanski Most / Sana gains run on the Krupa axis + the Sanski-Most belt). It does NOT move the 511/505/510 Krupa brigades. The one watch-item: holding the interior could, like the Zvornik precedent, trip a `disconnected_sector_territory` critical on a VRS formation (`vrs_2nd_krajina` / `vrs_1st_krajina`) if the captured belt is non-contiguous — but jasenovac_2→hadzici→kljuc_2/krasulje_2 IS a contiguous front-edge belt anchored to the already-captured Petrovac cluster, so this is lower-risk than the standalone jelasinovci island that previously stranded.
- **Measurement gate:** 188w is un-gated and authoritative for late-war corridor compounding (40w + CI are FALSE-GREEN for combat changes). Run 188w synchronously; verify (a) +3 interior flips, (b) Krupa/Sanski-Most +6 gains NOT regressed, (c) no new VRS-Krajina disconnected-sector critical, (d) Zvornik sacred anchor intact.

## VERDICT: NOT a park-as-ceiling. Approach (c) is geometrically sound and in-budget-plausible.
The contact graph proves the south/Petrovac corridor reaches the interior **faster** than jelasinovci (1 hop vs 2 to hadzici), the strong 5-brigade axis already sits one 17-segment hop from the gateway with nothing left to do, and history confirms the south approach. The prior failure was approaching the interior from the wrong (north) direction with the wrong (depleted) brigades. The fix is to feed it from the strong southern axis that is already there. **Remaining unknown is purely empirical: does the Petrovac axis reach jasenovac_2 early enough (~W182-83) to spend 3 more advance cycles before W188?** That requires a 188w run to confirm — recommend BUILD + measure, do NOT park.
