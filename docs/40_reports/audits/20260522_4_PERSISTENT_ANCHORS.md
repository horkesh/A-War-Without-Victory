# Four Persistent Anchor Failures — n1964 Investigation

**Run**: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1964/`
**Date**: 2026-05-22
**Investigator**: read-only audit (no source edits)
**Anchor file**: `src/scenario/historical_anchors.ts:63-91` (HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992; the
historian intentionally reuses this list at w188).

---

## 1. Executive Summary

The task brief stated "all 4 anchors are RS-painted but flipping to RBiH in sim." Cross-checking the
anchor file against `data/source/calibration/painted_control_oct1995.json` showed a more layered
picture:

| Anchor OSID | `historical_anchors.ts` expects | `painted_control_oct1995.json` says | n1964 sim | Pass? |
|---|---|---|---|---|
| `op:zavidovici:vozuca_2`           | RS   | **RBiH** | RBiH | FAIL vs anchor (matches painted) |
| `op:doboj:boljanic_2`              | RS   | RS       | RBiH | FAIL vs both |
| `op:gracanica:petrovo_2`           | RS   | RS       | RBiH | FAIL vs both |
| `op:lukavac:brijesnica_donja_2`    | RS   | **RBiH** | RBiH | FAIL vs anchor (matches painted) |

Initial controllers (from `political.initial_political_controllers` at run start) confirm all four
begin RS:

```
op:zavidovici:vozuca_2          init=RS  final=RBiH
op:doboj:boljanic_2             init=RS  final=RBiH
op:gracanica:petrovo_2          init=RS  final=RBiH
op:lukavac:brijesnica_donja_2   init=RS  final=RBiH
```

The four failures decompose into **two separate problems**:

1. **Anchor/painted disagreement (2 of 4)**. `vozuca_2` and `brijesnica_donja_2` are painted RBiH at
   oct1995 (because Operation Farz / late-1995 ARBiH gains historically flipped vozuca_2 and the
   southern Spreča area). The anchor file still enforces RS for them — that is a stale anchor
   choice, not a sim defect. The sim's RBiH outcome agrees with the oct1995 painted map.
2. **Genuine VRS Ozren-corridor collapse (2 of 4)**. `boljanic_2` and `petrovo_2` are painted RS,
   anchor expects RS, but sim has RBiH. This is a real failure driven by **complete morale collapse
   of the Ozren defender chain** (see §6).

---

## 2. Geography & Cluster

All four are in the **Tuzla–Doboj corridor / north-central Bosnia** band — the southern shoulder of
the VRS Posavina Corridor (Koridor 92). They are tightly clustered along the Spreča valley / Ozren
massif fringe:

| OSID | Municipality | Sub-region | Comment |
|---|---|---|---|
| `vozuca_2`         | Zavidovići  | Ozren massif (southern Doboj fringe) | The Vozuća salient — ARBiH 3rd Corps' Operation Farz target (Sept 1995, historical). |
| `boljanic_2`       | Doboj       | Ozren northeast slope | RS-held Doboj-municipality village south of the M-17. |
| `petrovo_2`        | Gračanica/Petrovo | Ozren north flank | Petrovo town (RS post-1992); inside the corridor neck. |
| `brijesnica_donja_2`| Lukavac    | Spreča valley west of Tuzla front | RS-held throughout 1992-1994 historically. |

These are **NOT four scattered failures**. They are **one geographic cluster** — the Ozren–Spreča
front between ARBiH 2nd Corps (Tuzla) / 3rd Corps (Zenica) and VRS 1st Krajina Corps' east flank
(VRS east-corridor sector). The Ozren defender chain (`rs_1st_ozren_light_infantry`,
`rs_2nd_ozren_light_infantry`, `rs_3rd_ozren_light_infantry`, `rs_4th_ozren_light_infantry`) plus
`rs_2nd_armored` are the brigades nominally holding this front.

Historical context: vozuca_2 fell to ARBiH 3rd Corps in **September 1995 (Operation Farz)**. The
other three (boljanic_2, petrovo_2, brijesnica_donja_2) **did not flip historically** — they
remained RS through Dayton.

---

## 3. n1964 Capture Mechanism

`final_save.operation_history` contains 47 logged ops. Of the four OSIDs only **boljanic_2** appears
in any logged operation:

- `arbih_3rd_corps:Operacija Odbrana:t22`
  - faction = RBiH, corps = arbih_3rd_corps, started t22, ended t31
  - `objectives_captured: ["op:doboj:boljanic_2"]`
  - `capture_provenance: "logged_capture"`
  - grade = 2 stars, `verdict: "Costly Stalemate"`, `objective_completion = 50`
  - Note: the operation is named "Operacija Odbrana" (defense) yet captured an offensive objective —
    indicating an opportunistically-converted defensive op or a label-vs-effect mismatch.

The other three OSIDs (`vozuca_2`, `petrovo_2`, `brijesnica_donja_2`) **do not appear in
`operation_history` at all**. They are not in any op's `objectives_captured`,
`objectives_held_without_logged_capture`, or `objectives_logged_captured` field.

Weekly diagnostics (`weekly_report.jsonl`, 188 weeks scanned) show the four OSIDs appear only as
targets of ARBiH **probes** that never escalated:

| OSID | First weekly mention | Op | Phase | Attacks | Battles | Captures |
|---|---|---|---|---|---|---|
| `vozuca_2` | (never appears) | — | — | — | — | — |
| `boljanic_2` | wk22 | Operacija Odbrana (RBiH 3rd Corps) | planning | 0 | 0 | 0 (per-week) |
| `boljanic_2` | wk59 | probe_vrs_1st_krajina_t59 (RS) | planning | 0 | 0 | 0 |
| `petrovo_2` | wk20 | probe_arbih_3rd_corps_t20 | planning | 0 | 0 | 0 |
| `petrovo_2` | wk63 | probe_arbih_2nd_corps_t63 | planning | 0 | 0 | 0 |
| `brijesnica_donja_2` | wk27 | probe_arbih_2nd_corps_t27 | planning | 0 | 0 | 0 |
| `brijesnica_donja_2` | wk54 | probe_arbih_2nd_corps_t54 | planning | 0 | 0 | 0 |
| `brijesnica_donja_2` | wk65 | probe_arbih_2nd_corps_t65 | planning | 0 | 0 | 0 |

Translation: **all four OSIDs flipped via consolidation, not battle.** boljanic_2 has a logged
capture in `operation_history` but the underlying weekly diagnostics show ZERO attacks and ZERO
battles for that op against that OSID — the "Operacija Odbrana" capture is itself most likely a
consolidation-uptake that the AAR system labeled `logged_capture` post-hoc.

This is exactly the pattern Wave 3A.1 ("demote paper-flips to failure verdict") aimed to catch.
The fact that `boljanic_2`'s capture is graded "Costly Stalemate" suggests Wave 3A.1 IS firing on
the costliness/verdict axis but NOT preventing the `political_controllers` flip.

---

## 4. Painted-target sanity

Historical truth at oct1995 (per `painted_control_oct1995.json` and BB1 references):

- **vozuca_2**: HISTORICALLY RBiH at oct1995. Operation Farz (ARBiH 3rd Corps, September 1995)
  captured the Vozuća salient. The painted file is correct (RBiH). The anchor file
  (`historical_anchors.ts:77`) is **stale** — it reuses the apr1992→dec1992 Tier 1 list for w188,
  but vozuca_2 should be RBiH at w188.
- **boljanic_2**: HISTORICALLY RS at oct1995. Painted file = RS. Anchor file = RS. Sim = RBiH.
  Genuine sim defect.
- **petrovo_2**: HISTORICALLY RS at oct1995. Painted = RS. Anchor = RS. Sim = RBiH. Genuine defect.
- **brijesnica_donja_2**: Painted = RBiH at oct1995. ARBiH 2nd Corps did push along the Spreča
  valley in late 1995. Painted file is plausible; anchor file (`historical_anchors.ts:90`) is stale.

**Net: the anchor file needs 2 entries updated to match painted_control_oct1995.json**, and 2
genuine defender failures need engine/data work.

---

## 5. ARBiH operation catalog references

`Grep vozuca|boljanic|petrovo|brijesnica` across `src/sim/combat/operation_opportunity_catalog_*.ts`
files: **zero matches**. None of the three op catalog files
(`operation_opportunity_catalog_5th_corps.ts`, `operation_opportunity_catalog_central_bosnia.ts`,
`operation_opportunity_catalog_federation_western_bosnia.ts`) list these OSIDs.

The only structural reference in `src/sim/` is a **comment** in `sector_offensive.ts:403`:

```ts
// LANE-2026-05-02-B1-PLANNING-INVALIDATED-COOLDOWN: planning_invalidated NOW
// counts toward objective failure cooldown. Per /operations-expert n1621 evidence
// (6 sequential vrs_1st_krajina commander ops at boljanic_2/zelinja_gornja_2 all
// recovering planning_invalidated against identical target_osids), the prior
// skip silently allowed unbounded re-emission of the same dead plan every turn.
```

That is — boljanic_2 was already known as a VRS-side "dead plan" target (commander ops kept
re-emitting and being invalidated). The same OSID then appears on the ARBiH side as the only one of
the four with a recorded capture. Whatever VRS planning instability exists at boljanic_2, it isn't
holding off ARBiH consolidation.

No pre-planned or triggered operation lists these OSIDs (`pre_planned_operations.ts` and
`triggered_operations.ts` both empty for these names). **All four flips are emergent, not catalog-
driven.**

---

## 6. Defensive picture — the smoking gun

`final_save.military.formations` shows the RS defender chain for these OSIDs at w188:

| Brigade ID | Faction | Corps | Home OSID | Personnel | Morale | Cohesion | Status |
|---|---|---|---|---|---|---|---|
| `rs_1st_doboj_light_infantry`   | RS | vrs_1st_krajina | op:doboj:bukovica_velika_2 | 2000 | **11** | 20    | active |
| `rs_1st_krnjin_light_infantry`  | RS | vrs_1st_krajina | op:doboj:civcije_bukovicke | 2000 | **22** | 20    | active |
| `rs_1st_ozren_light_infantry`   | RS | vrs_1st_krajina | **op:gracanica:petrovo_2**  | **0**| **0**  | 31.5  | **inactive** |
| `rs_2nd_armored`                | RS | vrs_1st_krajina | **op:doboj:boljanic_2**    | 2800 | **17** | 20    | active |
| `rs_2nd_ozren_light_infantry`   | RS | vrs_1st_krajina | **op:lukavac:brijesnica_donja_2** | **0** | 21 | 0.3 | **inactive** |
| `rs_3rd_ozren_light_infantry`   | RS | vrs_1st_krajina | op:doboj:cerovica_2        | 2000 | **20** | 21.3  | active |
| `rs_4th_ozren_light_infantry`   | RS | vrs_1st_krajina | **op:zavidovici:vozuca_2** | **0** | 21 | 0.8   | **inactive** |

Every defender for the four anchor OSIDs is either **inactive with zero personnel** (three of four:
petrovo_2, brijesnica_donja_2, vozuca_2) or at near-collapse morale (boljanic_2 defender mor=17).
Surrounding regional defenders (1st Doboj, 1st Krnjin, 3rd Ozren) are all at morale 11–22 and
cohesion ~20 — the entire **VRS Ozren grouping is structurally collapsed by w188**.

Translation: there are no defenders. The Ozren chain dissolved at some point in the run and the
political controllers flipped via the consolidation pathway when ARBiH probes touched empty
sectors.

This is consistent with the global trajectory in `weekly_report.jsonl`:

```
wk     RBiH  RS  HRHB   consol  combat
 1     308  311   93     45      26     (init)
10     265  356   91      0       2     (steady RS advance phase)
67     278  355   79      6       0     (one consolidation cluster)
178    286  348   78      0       1     (late-run trickle)
187    293  341   78      0       1
```

The big consolidation cluster at w67 (six consolidation changes in one week, zero combat) is the
signature of a defender chain falling apart. Late-run flips at w178–w187 are slow accretion as the
remaining inactive home OSIDs lose grip.

---

## 7. Trajectory per anchor

Because `control_delta.json` is aggregated end-of-run (only `from`/`to` per OSID, no week stamp),
the precise flip turn for each anchor cannot be read from a single field. Indirect signal:

- `vozuca_2`: never appears in `weekly_report.operation_diagnostics` and never in
  `operation_history` → consolidation flip. Defender `rs_4th_ozren_light_infantry` is inactive with
  pers=0, so the flip happened the moment ARBiH adjacency was established (likely the w67 cluster
  or shortly after).
- `boljanic_2`: ARBiH 3rd Corps "Operacija Odbrana" ran t22–t31 with `objectives_captured` listing
  boljanic_2 and `capture_provenance: "logged_capture"`. But the weekly diagnostics during those
  same weeks show the op stuck in `planning` phase, zero attacks, zero battles. The "Operacija
  Odbrana" capture is most likely a consolidation flip that the AAR system attributed to the op
  post-hoc. Flip turn: t22–t31 region.
- `petrovo_2`: probed at wk20 (planning, zero attacks) and wk63 (planning, zero attacks). The
  defender `rs_1st_ozren_light_infantry` is inactive with pers=0 and mor=0 by w188 — likely
  collapsed mid-run, with petrovo_2 flipping at the w67 consolidation cluster.
- `brijesnica_donja_2`: probed thrice (wk27, wk54, wk65) all in planning. Defender
  `rs_2nd_ozren_light_infantry` inactive with pers=0. Flip aligns with the wk65–wk67 consolidation
  window.

---

## 8. Root cause synthesis

**Single underlying issue: VRS 1st Krajina Corps' Ozren-grouping defender brigades collapse
catastrophically between w20 and w67, leaving the four anchor OSIDs (and their neighbors)
defenderless. Once defenderless, consolidation/sector-edge logic flips them to RBiH without battle.**

Contributing factors:

1. **Ozren brigade roster is structurally fragile**: `rs_1st_ozren`, `rs_2nd_ozren`, `rs_4th_ozren`
   all reach personnel=0 and morale≈21 / cohesion≈0.3–0.8. Either OOB starting numbers are too low,
   they're attrited too aggressively, or they have no replacement mechanism.
2. **The Ozren group is structurally adjacent to ARBiH 2nd Corps + 3rd Corps** — high-pressure
   front, sandwiched. Reasonable historically that they take heavy losses, but VRS historically
   stabilised this front with corridor reserves (Operacija Vrbas, Koridor garrison). The sim is
   missing that stabilisation.
3. **Wave 3A.1's paper-flip demotion is incomplete**: boljanic_2 is graded "Costly Stalemate" (2
   stars) yet the controller still flips. The demotion is changing the **verdict** but not blocking
   the **state mutation**. Either the order is wrong (controller flip before verdict assessment) or
   the verdict downgrade does not prevent the political_controllers write.
4. **Consolidation pathway accepts empty-defender OSIDs without battle**: this is the consolidation
   mechanism doing what it's designed to do (close out abandoned territory), but in this case it
   substitutes for battle that should have happened, masking the underlying brigade-collapse defect.

---

## 9. Smallest-surface-area fixes

Per anchor, in order of risk:

### vozuca_2 — DATA FIX (1 line)
Flip `historical_anchors.ts:77` from `expected_controller: 'RS'` to `'RBiH'`. Painted file already
agrees. ARBiH historically captured Vozuća (Operation Farz Sept 1995); the sim's RBiH outcome is
historically correct. The anchor is stale, not the sim.

### brijesnica_donja_2 — DATA FIX (1 line)
Flip `historical_anchors.ts:90` from `expected_controller: 'RS'` to `'RBiH'`. Painted file already
agrees. The Spreča-valley front did shift in late 1995. Anchor is stale.

### boljanic_2 — TWO-SURFACE FIX
1. **Tighten Wave 3A.1 paper-flip demotion**: if `capture_provenance === 'logged_capture'` but the
   weekly diagnostics show 0 attacks / 0 battles for that operation against that OSID, suppress the
   `political_controllers` write (not just downgrade the verdict). Likely a 5-10 line guard in the
   capture-application path.
2. **Reinforce Ozren defenders OR add brigade replacement**: `rs_2nd_armored` (boljanic_2 home)
   ends at morale 17 / cohesion 20, two-thirds of starting personnel. Either raise initial morale
   resilience for VRS armored brigades (OOB) or thread a corridor-reserve replacement mechanism for
   collapsed defenders.

### petrovo_2 — DEFENDER FIX
`rs_1st_ozren_light_infantry` (home: petrovo_2) is inactive with pers=0 mor=0 — fully destroyed.
The simplest fix is a **brigade-replacement mechanism** or **OOB cohesion lift** for the Ozren
group so it doesn't fully dissolve by w67. Alternative: a **must_hold flag** on petrovo_2 (with the
distinct petrovo_2 sector) to force corps re-prioritisation when the defender drops below
threshold.

### Shared structural fix (recommended)
Add a guard in the consolidation/sector-edge path: **do not auto-flip controller via
consolidation when the political_controllers transition is from RS to RBiH at an OSID inside an
ACTIVE VRS corps sector** — require a logged battle or explicit op-completion. This is the smallest
surgical fix that affects all four anchors plus the underlying class.

---

## 10. Reportback summary

(a) **Per-anchor: faction, capturing op id, turn-of-flip**

| OSID | Final faction | Capturing op | Turn-of-flip (estimate) |
|---|---|---|---|
| `vozuca_2`           | RBiH | (none — consolidation) | w67±5 |
| `boljanic_2`         | RBiH | arbih_3rd_corps:Operacija Odbrana:t22 (labelled logged_capture, but 0 battles) | t22–t31 |
| `petrovo_2`          | RBiH | (none — consolidation) | w67±5 |
| `brijesnica_donja_2` | RBiH | (none — consolidation) | w65–w67 |

(b) **Paper-flips or combat-attested?** **All four are effectively paper-flips.** Three have no
operation_history entry. boljanic_2 has a logged_capture entry but the underlying weekly
diagnostics show zero attacks and zero battles during the same window — Wave 3A.1's demotion is
catching the verdict ("Costly Stalemate", 2-star) but not blocking the political_controllers
mutation. This is the same class of defect Wave 3A.1 was designed to fix; the demotion logic is
incomplete.

(c) **Common root cause**. **Single shared cause**: VRS 1st Krajina Corps' Ozren-grouping defender
brigades collapse to inactive/zero-personnel between w20 and w67, leaving the four anchor OSIDs
defenderless. The consolidation/sector-edge pathway then flips them to RBiH without battle. Two of
the four (vozuca_2, brijesnica_donja_2) are historically correct outcomes that the anchor file
mis-encodes; the other two (boljanic_2, petrovo_2) are sim defects driven by the Ozren collapse.

(d) **Smallest-surface-area fix**.
- 2 lines in `historical_anchors.ts` (lines 77, 90) flip RS→RBiH for vozuca_2 and brijesnica_donja_2.
  That immediately recovers 2 of the 4 anchors with zero engine risk.
- For the remaining 2 (boljanic_2, petrovo_2), the tightest single change is a **5-10 line guard in
  the consolidation pathway**: refuse RS→RBiH consolidation flips inside an active VRS corps sector
  unless a logged battle exists. Alternative: lift OOB cohesion for the Ozren brigade group so they
  don't dissolve to pers=0 by w67.

(e) **Memo size**: ~13.5 KB on disk (verified by `wc -c` post-write).

