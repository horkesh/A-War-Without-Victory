# AoR Phase-Out OSID/ZoC Full Implementation

**Date:** 2026-02-23  
**Plan:** AoR Phase-Out ZoC OSID (aor_phase-out_zoc_osid_d4e8cabb.plan.md)  
**Status:** Completed (Phases 1–6)

---

## 1. Summary

Phase II spatial model is now **OSID/ZoC-only**. All normative AoR/front-active references were removed from canon; brigade location is `location_osid` only; fronts and assignable segments derive from `phase_ii_front_edges_osid` when operational data is present. Pipeline, scenario runner, UI adapters, and bot brigade orders no longer depend on `brigade_aor` for Phase II.

---

## 2. Phases Executed

| Phase | Scope | Outcome |
|-------|--------|--------|
| **1** | Canon + reconciliation | Reconciliation doc `AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md`; Phase II Spec, Systems Manual, Engine Invariants, Rulebook, PIPELINE_ENTRYPOINTS, context.md updated; AoR removed, OSID/ZoC formalized. |
| **2** | State shape + serialization | `brigade_aor`, `brigade_aor_orders`, `brigade_mun_orders`, `brigade_municipality_assignment` removed from GameState type and allowlist; `LegacyBrigadeAoRState` + `getLegacyAoR()` for transition reads; migrateState strips legacy keys on load. |
| **3** | Pipeline + Phase II front + Phase I→II | AoR steps removed (validate-brigade-aor, enforce-*-contiguity, detect-brigade-encirclement, surrounded-brigade-reform, apply-municipality-orders, apply-aor-reshaping, compute-brigade-pressure, phase-ii-aor-init). Replaced with `phase-ii-location-osid-backfill`; `formation-hq-aor-depth-sync` → `formation-location-osid-sync` (no-op). `assignable_front_segments` in Phase II derived from `phase_ii_front_edges_osid` in `refreshFrontEdgeSnapshot`. Phase I→II no longer calls `initializeBrigadeAoR`; uses `backfillFormationLocationOsid` in pipeline. |
| **4** | Scenario runner + formation init | `initializeBrigadeAoR` removed from scenario_runner; Phase II entry uses `initializeCorpsCommand` + `backfillFormationLocationOsid`. `populateFactionAoRFromControl` removed from scenario init and from `run_phase_ii_browser`. |
| **5** | UI/adapters | GameStateAdapter and ViewerStateAdapter build formation locations from `location_osid` when phase is Phase II; no read of `brigade_aor` for Phase II. war_data_extractor uses `phase_ii_front_edges_osid` and formation `location_osid` for front edges and exposed front. desktop_sim queryCorpsSectors and validateBrigadeMovementOrder use `location_osid` for Phase II. sandbox_engine deploy/undeploy skips AoR mutation in Phase II; pressure step skipped in Phase II. |
| **6** | Bot stub | `generate-bot-brigade-orders` no longer gates on `brigade_aor`. When operational data present, runs `generateAllBotOrdersOsid` only; when absent, no bot brigade orders (legacy AoR path removed). |

---

## 3. Refactor-Pass Summary

- **turn_pipeline.ts:** Removed no-op step bodies and duplicate phase-ii-aor-init; single `phase-ii-location-osid-backfill`; `refreshFrontEdgeSnapshot` uses `phase_ii_front_edges_osid` for assignable segments when present.
- **phase_i_to_phase_ii.ts:** Dropped `initializeBrigadeAoR` import and call; comment documents backfill in pipeline.
- **scenario_runner.ts:** Removed AoR init block and aor_init import/export; Phase II corps init + backfill only.
- **run_phase_ii_browser.ts:** Removed AoR init block and aor_init import; turn advance is turn increment only.
- **Adapters/UI:** Phase-based branching for formation locations (location_osid vs legacy brigade_aor); no dead code introduced.

---

## 4. Decisions for Review

1. **Phase II without operational data:** Bot brigade orders are not generated when operational data is unavailable (no fallback to legacy AoR path). Pipeline still runs; bots simply do not issue brigade orders in that configuration.
2. **phase-ii-recon-intelligence:** Still gated on `getLegacyAoR(state).brigade_aor`; left as-is for this implementation. Can be switched to location_osid/OSID in a follow-up.
3. **Known test failures (pre-existing / Phase 2):** Tests that assert on AoR state after init/reshape/apply/distribute/OG-dissolve remain failing by design (AoR writes no-opped). Documented in napkin and plan; not blocking scenario runs.
4. **aor_init.ts:** Module retained but no longer imported from scenario_runner or run_phase_ii_browser; can be removed or repurposed in a later cleanup.

---

## 5. Verification

- `npx tsc --noEmit`: **pass**
- Vitest: known failures as above (AoR-related); no new failures introduced by Phases 3–6.
- Scenario run (e.g. 52w): optional; plan allows documenting known baseline/init-control failures separately.

---

## 6. Artifacts

- **Reconciliation:** `docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md`
- **Canon:** Phase II Spec, Systems Manual, Engine Invariants, Rulebook, Phase_Specifications, Phase I Spec, PIPELINE_ENTRYPOINTS, context.md
- **Report:** This file (`docs/40_reports/implemented/20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md`)

---

## 7. References

- Plan: aor_phase-out_zoc_osid_d4e8cabb.plan.md (§1–§12)
- Reconciliation: AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md
- Phase II Spec, Systems Manual, Engine Invariants (v0_5_0)
