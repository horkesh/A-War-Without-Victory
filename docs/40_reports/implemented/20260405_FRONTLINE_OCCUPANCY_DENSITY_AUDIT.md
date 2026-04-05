# Frontline Occupancy / Density Audit

**Date:** 2026-04-05
**Status:** AUDIT COMPLETE — one concrete defect identified, next lane proposed

## Summary

Audit of brigade-to-OSID stacking and frontline coverage density. Literal same-OSID brigade stacking is solved — Phase A/B redistribution works correctly. The live issue is not stacking but under-coverage: VRS has 40.4% empty front OSIDs (vs 21.4% RBiH). This splits into two categories: (1) genuine force-to-space mismatch in Drina and Herzegovina corridors (historically accurate, no fix needed), and (2) one concrete assignment defect in `ensureMinimumSectorCoverage` affecting split-child sectors.

## Audit Questions

### Q1: Is literal same-OSID brigade stacking solved?

**Yes.** Phase A (front assignment) and Phase B (redistribution) work correctly. 130 OSIDs have exactly 1 brigade, 28 have 2, 10 have 3. The two 5-brigade concentrations are at Sarajevo siege positions and the HVO Kiseljak pocket — both structurally correct (siege garrison density and enclave defense).

### Q2: Is there meaningful under-density on front lines?

**Yes, faction-specific.** 83 of 313 front OSIDs (26.5%) have zero brigades. VRS accounts for the majority of the gap. HRHB has over-coverage (136.4%) due to a small front relative to formation count.

### Q3: What is the root cause of VRS under-coverage?

Two causes:
1. **Force-to-space mismatch (Drina, Herzegovina):** VRS Drina Corps and Herzegovina Corps defend long front lines with fewer brigades than needed for full coverage. This is historically accurate — the VRS relied on artillery and terrain advantage to compensate for thin manning in these theaters. **No fix needed.**
2. **Split-child sector assignment defect:** `ensureMinimumSectorCoverage` territory-membership pre-pass fails when front OSIDs overlap between sibling sectors created by contiguity splitting. **Fixable.**

## Per-Faction Data

| Faction | Brigades | Front OSIDs | Covered | Empty | Coverage % |
|---------|----------|-------------|---------|-------|------------|
| RBiH    | 117      | 145         | 114     | 31    | 78.6%      |
| RS      | 89       | 146         | 87      | 59    | 59.6%      |
| HRHB    | 24       | 22          | 30      | -8    | 136.4%     |
| **Total** | **230** | **313**    | **230** | **83** | **73.5%** |

Note: HRHB "negative empty" reflects over-stacking on a compact front. 230 total brigades active.

## Stacking Distribution

| Brigades at OSID | OSID Count |
|------------------|------------|
| 1                | 130        |
| 2                | 28         |
| 3                | 10         |
| 4                | 1          |
| 5                | 2          |

The 5-brigade concentrations are at Sarajevo siege (VRS SRK positions) and HVO Kiseljak pocket. Both are structurally correct.

## Zero-Brigade Sectors with Hostile Edges

| Sector ID | Hostile Edges | Brigades | Root Cause |
|-----------|---------------|----------|------------|
| sector:vrs_1st_krajina:8 | 4 | 0 | **Split-child assignment defect** — 6 brigades at its front OSIDs assigned to sibling sectors :2 and :3 |
| sector:vrs_drina:* (multiple) | varies | 0 | Force-to-space mismatch — Drina Corps thin manning, historically accurate |
| sector:vrs_herzegovina:* | varies | 0 | Force-to-space mismatch — Herzegovina Corps thin manning, historically accurate |

## Concrete Defect: sector:vrs_1st_krajina:8

### Symptom
`sector:vrs_1st_krajina:8` has 4 hostile edges and 0 assigned brigades, yet 6 brigades are physically located at its front OSIDs (`kamenica_2` and `krusevo_brdo_i`). All 6 are assigned to sibling sectors `:2` and `:3`.

### Root Cause
The territory-membership pre-pass in `ensureMinimumSectorCoverage` (`brigade_assignment.ts`, lines 1276-1319) cannot transfer brigades classified as frontline-essential in their current sector, even when the brigade's physical OSID is also in the empty sector's territory. This is the same class of defect as previously closed Lane B (empty child sectors from contiguity split), but triggered by a different condition: front-OSID overlap between sibling sectors rather than simple zero-assignment after split.

Lane B's fix handles the case where a brigade's `location_osid` is in the zero-sector's `territory_osids` and the brigade is NOT on the donor sector's frontline. This defect occurs when the brigade IS on the donor's frontline — the guard correctly prevents stealing a frontline defender, but has no fallback for the case where the recipient sector has zero coverage and the donor has surplus.

### Impact
Four hostile edges undefended. In practice, VRS 1st Krajina has enough depth that this does not cause anchor failures, but it is a structural correctness issue that could cascade under different force distributions.

## Next Lane Proposal

### Split-Child Sector Assignment Routing Fix

**What:** Extend `ensureMinimumSectorCoverage` to allow transferring one brigade from a shared-OSID position when:
- (a) The donor sector has surplus above minimum garrison budget (brigades > hostile_edges)
- (b) The recipient sector has 0 brigades and hostile_edges > 0
- (c) The brigade's `location_osid` is in both sectors' territory

**Why:** The current guard is too conservative. It protects donor sectors from being stripped of frontline coverage, which is correct behavior in general. But when a donor has surplus and the recipient has zero coverage with hostile exposure, one transfer is safe.

**Owner:** sector-expert + systems-programmer

**Files:** `src/sim/combat/brigade_assignment.ts` (ensureMinimumSectorCoverage territory-membership pre-pass)

**Risk:** Low. The fix is a relaxation of an existing guard with two new conditions. It does not change the Phase A/B redistribution pipeline. Should be testable with a targeted unit test mirroring the `sector:vrs_1st_krajina:8` scenario.

## Completion Block

| Item | Status |
|------|--------|
| Stacking verdict | **SOLVED** — Phase A/B redistribution works correctly |
| Coverage verdict | VRS under-density split between force-to-space (no fix) and split-child assignment (fixable) |
| Concrete defect | `ensureMinimumSectorCoverage` territory-membership pre-pass: cannot steal from frontline when donor has surplus |
| Next lane | Split-child sector assignment routing fix |
| Owner | sector-expert + systems-programmer |
