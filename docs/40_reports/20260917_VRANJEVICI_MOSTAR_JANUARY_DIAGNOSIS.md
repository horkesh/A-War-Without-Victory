# Vranjevići (Mostar) — why January 1993 reads RS, and the smallest justified correction

**Date:** 2026-09-17
**Target:** `op:mostar:vranjevici_2` — January 1993 reference **RBiH**; candidate reads **RS** at t39.
**Status:** **read-only diagnosis.** No production change and no additional campaign run were made for this
case. The proposal in §9 is not implemented.

**Evidence base.** The preserved n401 candidate (`preserve/january-candidate-n401`, commit `41a148bf9`)
and its independent repeats n402 and n403, all byte-identical. Scenario `apr1992_definitive_188w.json`,
`--weeks 39`, Node v22.23.2, input digest `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`.
Run dirs `runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n401`, `…_n402`, `…_n403`; final-save SHA-256
`e3b6b2d34dd1101c601b11abd30c2c060717995a0fe748f662214d4ebecf6899` (all three).

---

## 1. The complete January mismatch set (11 rows, t39)

The candidate's own `historical_fit.checkpoints[0]` (week 39, `reference_key: jan1993`) records
**701 / 712**. The 11 disagreements, reproduced from `final_save.json` and
`painted_control_jan1993.json`:

| # | OSID | expected (jan1993) | actual (t39) | control change to t39 | current diagnosis status |
|---|---|---|---|---|---|
| 1 | `op:donji_vakuf:prusac_2` | RS | RBiH | **none** — initial RBiH | initial-state discrepancy; **OPEN**, no waiver (see §2) |
| 2 | `op:foca:donje_zesce` | RBiH | RS | none — initial RS | frozen turn-0 discrepancy (reference vs init) |
| 3 | `op:ilijas:krivajevici` | RS | RBiH | none — initial RBiH | frozen turn-0 discrepancy |
| 4 | `op:jablanica:doljani_2` | RBiH | HRHB | none — initial HRHB | frozen turn-0 discrepancy |
| 5 | `op:kalesija:seher_2` | RS | RBiH | none — initial RBiH | frozen turn-0 discrepancy |
| 6 | `op:konjic:glavaticevo_2` | RS | RBiH | none — initial RBiH | frozen turn-0 discrepancy |
| 7 | `op:konjic:ljuta` | RS | RBiH | none — initial RBiH | frozen turn-0 discrepancy |
| 8 | `op:maglaj:jablanica` | RBiH | RS | none — initial RS | frozen turn-0 discrepancy |
| 9 | **`op:mostar:vranjevici_2`** | **RBiH** | **RS** | **t2 combat RBiH→RS**, `jna_nevesinje_garrison` | **this report — inappropriate early loss** |
| 10 | `op:trnovo:tosici` | RBiH | RS | none — initial RS | frozen turn-0 discrepancy |
| 11 | `op:vlasenica:sebiocina` | RBiH | RS | none — initial RS | frozen turn-0 discrepancy |

Ten of the eleven are **frozen turn-0 discrepancies**: the engine's initial controller already disagrees
with the reference and no battle ever touches the cell. Only **Vranjevići** is combat-touched. These
causes are read off the artifacts, not inferred.

**§2 note on `prusac_2`.** The n399 ledger entry described this cell as "RS running late through the
Donji Vakuf/Šipovo cascade". The n399 and n401 artifacts do **not** support that: `prusac_2` is
`initial: RBiH` with **zero control events** in both runs. Its status is therefore an initial-state
discrepancy (frozen), not a late capture, and the earlier cascade narrative is not reproduced here —
flagged for explicit review, not fixed.

---

## 3. Vranjevići: initial ownership and control history to t39

`op:mostar:vranjevici_2`:

- **Initial controller: RBiH** — which *matches* the January reference. This is not an initial-state
  error.
- Control events to t39: exactly **one**.

| turn | from → to | mechanism | attacker | defender | battle | outcome | ratio |
|---|---|---|---|---|---|---|---|
| **t2** | RBiH → RS | combat | `jna_nevesinje_garrison` | `arbih_445th_mountain` | `2:op:mostar:vranjevici_2:jna_nevesinje_garrison:arbih_445th_mountain` | `decisive_victory` | **3.27** |

There is **no recovery attempt**: once RS, the cell is never re-attacked by RBiH through t39, and the
`jan1993` reference still wants RBiH. So the mismatch is a loss with no compensating recapture.

## 4. The operation, formation and battle responsible

The t2 capture is owned by the **pre-planned `Operation Herzegovina`** (`corps:
jna_herzegovina_command`, a synthetic JNA corps), axis **`mostar_heights`**, brigade
**`jna_nevesinje_garrison`**, staging `op:nevesinje:sopilja`
(`src/sim/combat/pre_planned_operations.ts:687-702`). The AAR records the axis as
`objectives_targeted: [vranjevici_2, kruzanj_2]`, `objectives_captured: [vranjevici_2]`, 3 attacks,
operation outcome `partial`.

The battle receipt (from `weekly_report.jsonl`, week 15 = turn 15 is the *later* Pješivac battle; the
Vranjevići battles are the `2:`–`3:` series) shows a **low-confidence attacker** carrying the
`stale_intel` friction label against an ARBiH mountain brigade. The JSNA garrison wins the decisive
t2 contest at ratio 3.27; the first pass (battle `1:`) had already been a `costly_victory` at ratio 1.05.
So the cell fell on a repeated attack, not on a single overwhelming one.

The separately-triggered `Operation Herzegovina Consolidation` (`vrs_herzegovina`,
`trigger` = Visegrad **and** Foca complete; `src/sim/combat/triggered_operations.ts:227-261`) also lists
`op:mostar:vranjevici_2` as the first `mostar_heights` waypoint, but in this candidate it fired at t16
with **0 attacks** and outcome `failure`, targeting only `blagaj_2`/`hodbina_2` because
`vranjevici_2` had already been taken RS at t2 and was therefore stripped as an owned waypoint.

## 5. Kružanj: the comparison case

`op:mostar:kruzanj_2` starts **RBiH**, is the *second* objective of the same `mostar_heights` axis, and
ends **RBiH** — matching the reference. Its control-event history is **empty** because the battle it
fought was absorbed:

| turn | target | attacker | defender | outcome | ratio | flip? |
|---|---|---|---|---|---|---|
| (same series) | `kruzanj_2` | `jna_nevesinje_garrison` | `arbih_442nd_mountain` | `costly_victory` (attacker_won) | 1.36 | **no control event** |

So the axis attacked **both** corrected cells; Vranjevići flipped on a decisive outcome, Kružanj did not
flip on a costly one (`costly_victory` flips only ~18% of the time — see the frozen-cell analysis
correction). The mechanism is the **RS operation targeting two cells the current reference holds RBiH**;
the difference between the two cells is outcome tier / morale absorption, not targeting. Kružanj is a
comparison case, **not** an automatic extra target or an extra defect: it is already correct.

## 6. The stale comment and the reference provenance

Three source comments assert that these cells were **painted RS in January 1993**:

- `src/sim/combat/pre_planned_operations.ts:1125-1126` — "Mostar Hills axis REMOVED: vranjevići/kružanj
  painted RS in Jan 1993"
- `src/sim/combat/pre_planned_operations.ts:1564` — "Mostar Hills axis removed from Op Jackal —
  vranjevici/kruzanj painted RS"
- `src/sim/combat/jna_phantom_brigades.ts:130-131` — "vranjevići/kružanj REMOVED: painted RS in Jan 1993"
- (and `src/sim/combat/triggered_operations.ts:247-250`, which additionally asserts they are "RS from
  turn 0 (painted overrides)")

**The current reference says RBiH, and its recorded provenance is explicit.** In
`data/source/calibration/painted_control_jan1993.json` (revision 4) both cells were changed
**RS → RBiH on 2026-08-24, commit `51e2862ea`**, recorded in the changelog as an **owner determination**
("Painted directly by the owner in the Jan 1993 Reference Painter; the reference assigned RS control
here, which the owner assessed as wrong. No documentary source was cited and Pyrrhic-panel review was
explicitly overridden … Recorded as an owner decision, not as sourced evidence."). The same correction
is summarised in `docs/40_reports/CALIBRATION_MASTER.md:3812-3851`, which states plainly that
`vranjevici_2` "BREAK[s] a previously-matching cell" and that if the new reference is right, the engine
holding RS "is an engine gap the old reference was masking".

`op:mostar:kruzanj_2` carries the identical 2026-08-24 changelog entry and the same rationale.

**Reconciliation.** The comments predate the correction and are stale; the current reference and its
recorded provenance are authoritative. **A stale code comment is not authority to alter the reference.**
The comments must not be used to justify reverting either cell to RS.

## 7. Historical evidence for January RBiH ownership

The documentary record is **not uniform**, and this is stated rather than resolved:

- The `mostar_heights` axis exists because BB1 printed 193 records the JNA/VRS seizing the Mostar hills
  (Podveležje/Hum) from the Nevesinje direction and holding them
  (`docs/40_reports/20260321_HERZEGOVINA_CALIBRATION_SESSION.md:17`). That is the historical basis for the
  **RS** reading and for the operation's design intent.
- The 2026-08-24 owner determination overrides that for these two specific OSIDs **without citing a
  documentary source** (`CALIBRATION_MASTER.md:3819-3824`: "authority but no evidence").
- The independent historian audit of the same cells was "Mixed — needs per-OSID look"
  (`docs/40_reports/proposals/20260523_ENGINE_4_HISTORIAN_AUDIT_18_OSIDs.md:357-360`).
- `CALIBRATION_MASTER.md:3933-3939` records Vranjevići (with Kružanj, Brgule, Brnjaci, Kreševo) as part
  of a repeated mispainting pattern, "root cause unknown".

Operational-cell membership: the cell is an objective of an **RS** operation (pre-planned
`Operation Herzegovina` and the triggered `Operation Herzegovina Consolidation` waypoint). There is no
RBiH or HVO operation that owns it, and there is **no "sequence that produces RBiH ownership"** in the
current design — RBiH ownership is held by *not* capturing it. This is why appending Vranjevići to
Operation Jackal (HRHB) would be wrong: the January target is **RBiH**, not HRHB.

## 8. Classification

- **Not** an initial-state discrepancy (initial RBiH = reference RBiH).
- **Not** a missing or unsuccessful recovery (RBiH never held it after t2, so nothing was attempted).
- **Is** an **inappropriate early loss** *relative to the current reference*: an RS operation captures at
  t2 a cell the reference holds RBiH, and no recovery follows.
- **But** the "inappropriateness" rests entirely on an **unsourced owner reference override that
  contradicts the documentary basis of the operation**. The correct disposition is therefore a
  **reference question requiring explicit review**, with the least-invasive engine correction available
  if the RBiH reference is confirmed (below). This report does not choose between the two; it isolates
  the mechanism so the choice is explicit.

## 9. Smallest justified correction proposal (NOT implemented)

If the owner's RBiH reference stands, the mismatch is fixed by **removing the two corrected cells as
objectives of the RS operations**, mirroring the n401 objective-coverage lever in the opposite
direction:

1. Remove `op:mostar:vranjevici_2` and `op:mostar:kruzanj_2` from the `mostar_heights` axis of the
   pre-planned `Operation Herzegovina` (`pre_planned_operations.ts:692-702`). That axis captured only
   `vranjevici_2`, so this is the minimum change that yields RBiH ownership at t39.
2. Remove the same cell from the triggered `Operation Herzegovina Consolidation` `mostar_heights`
   waypoint list (`triggered_operations.ts:255-259`), so a *later* RS recapture cannot move the cell
   away from the RBiH reference at apr1994/apr1995/oct1995 (all four references are RBiH).
3. Correct the four stale comments (§6) to record the 2026-08-24 owner correction rather than the
   superseded RS value.

**Do not** append `op:mostar:vranjevici_2` to the HVO `Operation Jackal`/HRHB sweep: the target is RBiH
ownership, and an HRHB capture would still mismatch.

If instead the documentary RS (BB1 p.193) is preferred, then the **reference cells** — not the operation
— require explicit owner/panel review; the stale comment is not authority either way.

No combat value should be touched. Nothing here establishes a combat-resolution defect: the t2 result is
a lawful attack on a defended ARBiH position, and the ratio is not anomalous.

## 10. What was not done

No production change, no scenario/objective edit, no combat tuning, and no additional campaign run were
made for this diagnosis. The proposal in §9 is returned for decision. Overall January calibration
remains **OPEN**; `prusac_2` remains **OPEN** with no waiver.
