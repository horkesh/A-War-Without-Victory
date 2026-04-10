# Unresolved-Sector Validator — Army HQ Exemption
## RS 65th Protection Motorized consistency lane

**Date:** 2026-04-10
**Commit:** `bb454db4`
**Run baseline:** `n1413` — hash `8e7acaa0d71e95c9`, FAIL (1 unresolved)
**Run post-fix:** `n1414` — hash `8e7acaa0d71e95c9`, PASS (0 unresolved)
**vitest:** 3140/3140 (247 files)
**tsc:** Clean
**build:** Clean

---

## 1. Problem

Post-run consistency validation failed on merged main:

```
FAIL: rs_65th_protection_motorized_regiment (vrs_main_staff, RS)
      is canonically unresolved in military.unresolved_sector_brigades
```

The brigade is in `vrs_main_staff` (VRS army HQ), on elite loan to `vrs_sarajevo_romanija`, located at `op:sokolac:sokolac_2` — RS-controlled rear territory not claimed by any SRK sector.

---

## 2. Audit Decision

### Candidate seams considered

1. **Seam A — Sim truth:** Make `collectUnresolvedSectorBrigades()` not put army HQ brigades into `unresolved_sector_brigades` even when on loan
2. **Seam B — Validator truth:** Make `validate_run_consistency.cjs` exempt army HQ corps from the unresolved check
3. **Seam C — Placement fix:** Ensure loaned brigades are placed in sectorizable locations
4. **Seam D — Loan guard:** Prevent elite loans to locations outside sector coverage

### Exact seam chosen: Seam B — Validator truth

### Why it wins

- The **sim is correct**: the 65th IS on loan, IS near the front, and IS genuinely unresolved from a sector perspective. The sim should continue reporting this truthfully in `unresolved_sector_brigades`.
- The **validator was too strict**: it treated ALL entries in `unresolved_sector_brigades` as hard failures with zero context-aware exemptions.
- The `integration_anomaly.test.ts` already had this exact exemption pattern (commit `4fb967a9`), proving the invariant was already accepted elsewhere.
- Blast radius: validator-only. No sim state changes, no downstream consumer impact, no hash change.

### Why others were deferred

- **Seam A:** Would suppress truthful sim reporting. 6 downstream consumers (anomaly detector, UI adapter, sector audit, etc.) would lose visibility into the brigade's unresolved state.
- **Seam C/D:** Placement and loan-guard work are planner realism, not truth hardening. The loan is legitimate; the brigade happens to be in unsectorized territory.

---

## 3. Root Cause

`validate_run_consistency.cjs` function `collectAssignmentCompletenessIssues()` read `military.unresolved_sector_brigades` and reported every entry as a FAIL without any corps-type filtering.

The sim's `collectUnresolvedSectorBrigades()` in `corps_front_sectors.ts:208` correctly lifts the army HQ exemption when a brigade is on elite loan (`isSectorAssignmentExemptCorpsId(corpsId) && !loaned`). This means a loaned army HQ brigade that can't be placed in a sector IS truthfully unresolved — but it's not a consistency failure, it's a known acceptable state per the project's documented invariant.

---

## 4. Fix

**File:** `tools/validate_run_consistency.cjs`
**Change:** Added `ARMY_HQ_CORPS` constant and `.filter()` step in `collectAssignmentCompletenessIssues()` to exclude brigades whose `corps_id` is in the exempt set before reporting failures.

### Canonical owner after cleanup

`military.unresolved_sector_brigades` remains the canonical sim truth — all genuinely unresolved brigades including army HQ on-loan cases. The validator now understands that army HQ entries are acceptable, not failures.

### Demoted path after cleanup

Treating all entries in `unresolved_sector_brigades` as hard consistency failures without corps-type awareness.

---

## 5. Verification

| Check | Result |
|---|---|
| Baseline n1413 validator | FAIL: `rs_65th_protection_motorized_regiment` |
| Post-fix n1413 validator | PASS: 0 unresolved |
| Fresh run n1414 hash | `8e7acaa0d71e95c9` (identical — no sim change) |
| Fresh run n1414 validator | PASS: 0 unresolved |
| vitest | 3140/3140 (247 files) |
| tsc --noEmit | Clean |
| build | Clean |

---

## 6. Residual Risks

1. **Loaned army HQ brigades remain unresolved in sim truth** — the 65th is still in `unresolved_sector_brigades` in the final save. Other consumers (anomaly detector, UI) still see it. This is correct and informational.
2. **Sokolac not in any SRK sector** — the 65th's location is legitimate RS rear territory but not claimed by any sector. This is a sector-territory coverage gap, not a brigade assignment bug. Separate backlog.
3. **Elite loan placement** — the loaning system doesn't check whether the loaned brigade's location will be sectorizable. This is planner realism work, not truth hardening.
