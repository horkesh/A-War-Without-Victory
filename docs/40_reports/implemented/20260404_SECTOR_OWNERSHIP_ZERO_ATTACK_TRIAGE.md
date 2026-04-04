# Sector Ownership + Zero-Attack Success Triage - n1312
**Date:** 2026-04-04  
**Run:** `n1312` (40-week scenario, 712 OSIDs)  
**Status:** Lane A closed with regression coverage. Lane B remains open. Zero-attack-success classification corrected to an AAR provenance defect.

---

## Mission Summary

Live-run engine-truth triage was triggered by three anomaly clusters in the latest complete run:

1. `cross_corps_sector_assignment`
2. zero-attack success operations in Prijedor and Visegrad
3. sector coverage gaps:
   - `empty_contested_sector`
   - `undefended_front_subsegments`
   - `frontline_density_imbalance`
   - `adjacent_uncontested_territory`

This lane ended as a split result:

- **Lane A fixed:** drifted brigades were being misclassified as genuine enclave defenders and reassigned into foreign-corps sectors
- **Lane B open:** contiguity-split child sectors can inherit front edges while ending with zero brigades
- **Zero-attack-success claim corrected:** not a clean "not a bug"; the operation AAR/export layer is provenance-blind

---

## Specialists and Evidence

| Specialist | Owned | Evidence produced |
|---|---|---|
| `systems-programmer` | Sector ownership invariants; Lane A guard | Confirmed the `home_osid` coverage discriminator is the right narrow fix for drifted-vs-genuine enclave separation |
| `gameplay-programmer` | Zero-attack-success audit | Confirmed `operation_aar.ts` finalizes success by objective control, not combat causality |
| `scenario-creator-runner-tester` | Run interpretation | Confirmed the empty-sector cluster is real and concentrated in split child sectors, especially Drina-pattern `splitN` sectors |
| `scenario-harness-engineer` | AAR/export truth | Confirmed weekly capture logging and final success states are provenance-blind |
| `technical-architect` | Root-cause synthesis and sequencing | Rejected stale "`P14` follows Lane B" framing because defender-multiplier hardening is already landed in current `HEAD` |

---

## Symptom A: Cross-Corps Sector Assignment

### Finding

Six brigades in `n1312` were being assigned to sectors owned by a different corps after their current `location_osid` had drifted into a foreign-controlled component.

### Root Cause

`assignCrossCorpsEnclaveDefenders()` in [`brigade_assignment.ts`](F:/A-War-Without-Victory/src/sim/combat/brigade_assignment.ts) existed to rescue genuine enclave defenders. Before the fix, it only checked whether the brigade's own corps still had a sector in the brigade's current component. That was too weak.

For drifted brigades:

- the current component could be entirely foreign-corps
- their own corps would therefore have no sector in that component
- the enclave-rescue pass would incorrectly treat them as isolated enclave defenders

The missing discriminator was whether the brigade's `home_osid` was still covered by any own-corps sector `territory_osids`. If yes, the brigade was drifted, not genuinely isolated.

### Fix Implemented

Added a `home_osid` coverage gate immediately after the existing component gate:

- if `home_osid` is still present in any own-corps sector `territory_osids`, skip foreign-corps enclave assignment
- only brigades with no own-corps home coverage remain eligible for cross-corps enclave rescue

**File changed:** [`brigade_assignment.ts`](F:/A-War-Without-Victory/src/sim/combat/brigade_assignment.ts)

### Regression Coverage Added

Focused enclave-assignment coverage now locks both branches in [`brigade_territory_reconciliation.test.ts`](F:/A-War-Without-Victory/tests/brigade_territory_reconciliation.test.ts):

- drifted brigade with `home_osid` still covered by own-corps territory must **not** be cross-corps assigned
- genuine enclave brigade whose `home_osid` is no longer covered by own-corps territory **is** still eligible for rescue

### Result

Lane A is accepted as closed in logic and test coverage.

Residual risk remains tied to Lane B: if split-sector `territory_osids` over-claim ownership, the drifted-vs-isolated discriminator could still become too permissive or too strict in edge cases. That does not invalidate this fix; it just means frontier integrity remains the deeper substrate issue.

---

## Symptom B: Zero-Attack Success Operations (Prijedor, Visegrad)

### Finding

This is **not cleanly a "NOT A BUG."**

The territorial flips may be historically plausible, but the operation AAR/export layer is misclassifying passive or external control changes as operation success because it does not track capture provenance.

### Evidence

In `n1312`, both of these AARs finalize as `success` with `total_attacks = 0`:

- `vrs_1st_krajina:Operation Prijedor:t0`
- `vrs_herzegovina:Operation Visegrad:t0`

Weekly logs show objective captures while:

- `attacks_this_turn = 0`
- no combat losses are recorded
- some captures happen during `planning` / early `execution`

The root cause is in [`operation_aar.ts`](F:/A-War-Without-Victory/src/sim/combat/operation_aar.ts):

- `finalizeOperationAAR()` marks `success` if all objectives are held at finalization
- `total_attacks` is only the sum of logged attacks
- `recordOperationWeeklyEntries()` records `objectives_captured_this_turn` whenever controller changes to the operation faction, regardless of why

So the current AAR cannot distinguish:

- captured by operation combat
- captured by consolidation
- captured by another non-operation control event while the operation is active

### Correct Classification

This is an **AAR / provenance defect**, not yet a proven combat-logic defect.

The earlier report claim that these were simply "rear-pocket consolidation, not a bug" was too broad and has been rejected.

---

## Symptom C: Sector Coverage Gap Cluster

### Initial Hypothesis Rejected

"Post-split orphaned sectors because brigades were assigned before splitting" was disproved. The split runs before brigade assignment in the pipeline.

### Real Root Cause

`splitNonContiguousSectors()` can emit child sectors that inherit real front edges from the parent sector but end up with zero brigades because all brigades remain concentrated in one geographic sub-component.

The assignment pipeline currently has no strong post-split equalization pass to fill those zero-brigade child sectors from:

- sibling split products
- adjacent same-corps sectors with surplus

### Run Impact

In `n1312` this showed up as:

- 5 empty contested sectors
- 6 undefended front sub-segments
- 18 density-imbalanced sectors
- `brka_2` holding by inertia without an assigned defender

### Status

Lane B is a real open frontline-integrity defect.

Open design question:

- refuse zero-brigade child sectors in the splitter, or
- add a post-split same-corps equalization pass

Target files:

- [`sector_splitting.ts`](F:/A-War-Without-Victory/src/sim/combat/sector_splitting.ts)
- [`brigade_assignment.ts`](F:/A-War-Without-Victory/src/sim/combat/brigade_assignment.ts)

---

## Symptom D: `undefended_front_subsegments` Over-Reporting

### Finding

This anomaly is noisier than the real problem because it can fire when front-assigned brigades are zero even if reserve coverage still exists.

### Reliable Diagnostic

`empty_contested_sector` is the stronger diagnostic because it checks both:

- `assigned_brigade_ids`
- `reserve_brigade_ids`

### Status

Low-priority reporting issue. Not the primary engine defect in this lane.

---

## Verification

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit -p tsconfig.json` | PASS |
| `npx.cmd vitest run tests/corps_front_sector_corps_ownership.test.ts tests/brigade_territory_reconciliation.test.ts tests/ui/command_strain_interpretation.test.ts` | PASS - 78 tests |
| `npx.cmd vitest run` | PASS - 2300/2300 |
| `npm.cmd run build` | PASS |
| `powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1` | PASS |

---

## Sequencing Correction

The earlier "`COMBAT_MASTER P14` follows Lane B" framing is stale.

`checkLaunchFeasibility()` already includes defender artillery, entrenchment, and terrain effects in current `HEAD` from the 2026-04-02 engine-health work. Lane B is still real, but it is **not** a prerequisite to a future `P14` lane because that hardening is already landed.

Correct sequencing from this triage:

1. finish Lane B as a frontline-integrity fix
2. rerun anomaly and ZEA attribution on current `HEAD`
3. only open a new combat-predictor lane if fresh evidence shows a remaining blind spot
4. separately open an AAR provenance lane for zero-attack success attribution if that export truth matters for current roadmap priorities

---

## Recommended Next Lane

**Lane B - Empty Child Sectors After Contiguity Split**

Reason:

- live-run evidenced
- engine-truth defect, not cosmetic
- directly contaminates frontline integrity and sector metrics
- remains open after this triage

The zero-attack-success issue should be tracked as an **AAR provenance** follow-up, not as the next frontline-integrity lane.

---

## Canonical Completion Block

```text
Canonical owner: src/sim/combat/brigade_assignment.ts for Lane A; src/sim/combat/sector_splitting.ts + brigade_assignment.ts for Lane B; src/sim/combat/operation_aar.ts for zero-attack-success provenance
Demoted path: blanket "rear-pocket consolidation, not a bug" explanation for zero-attack-success operations
Player-visible truth: Brigades no longer drift into foreign corps sectors when their home municipality is still covered by their own corps. Operation history still needs provenance work so passive or external control changes are not over-attributed as operation success.
Canonical UI surface: Sector density / corps force evaluation for Lane A; operation history / AAR export for the zero-attack-success provenance issue
Done means: cross-corps sector assignment warning drops from 6 to <=1 in the next 40w run; explicit drifted-vs-genuine-enclave tests pass; zero-attack-success follow-up is tracked as an AAR provenance lane rather than dismissed as "not a bug."
```
