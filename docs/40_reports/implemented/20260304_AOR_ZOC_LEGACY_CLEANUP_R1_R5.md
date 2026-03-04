# AoR / ZoC Legacy Cleanup — R1–R5 Complete

**Date:** 2026-03-04
**Baseline:** Legacy AoR system partially removed (ZoC code deleted 2026-03-02) but 10 dead files retained, 18 consumer files still importing `getLegacyAoR` / `getBrigadeAoRSettlements` from dead system, docs describing ZoC as active
**Result:** All five cleanup phases complete — dead code deleted, consumers migrated, docs tombstoned, peace/war terminology applied, cosmetic type renames done. tsc clean, 296/296 vitest pass.

---

## Summary

- **Why:** `brigade_aor` is never populated by any active pipeline step (always `{}`). All consumers were operating on dead data, adding ~3,000 lines of invisible complexity. ZoC was deleted 2026-03-02 but 12 docs still described it as present. Canon docs still used "Phase I / Phase II" architectural framing for what is now "peace / war".
- **What:** Full five-phase cleanup — dead file deletion (R1), ZoC doc tombstones (R2), AoR consumer migration (R3), peace/war terminology (R4), cosmetic type renames (R5). Parallel agents used for R2 (12 doc files) and R3 (12 consumer files) while main thread handled high-risk consumers.
- **Impact:** Zero behavioral change. 3,044 lines deleted, 161 inserted (net -2,883). Pipeline step names (`phase-i-*`, `phase-ii-*`) preserved — load-bearing in save files.

---

## Changes Made

### R1 — Delete dead AoR files (commit `23a39fa`)

10 files deleted, ~1,700 lines removed. All had no active pipeline callers.

| Deleted File | Reason |
|---|---|
| `src/sim/combat/corps_directed_aor.ts` | AoR instantiation — no active callers |
| `src/sim/combat/aor_reshaping.ts` | Reshape order system removed |
| `src/sim/combat/aor_contiguity.ts` | Contiguity enforcement removed from pipeline |
| `src/validate/aor_contiguity.ts` | Validation for dead system |
| `src/cli/sim_aorcheck.ts` | CLI tool for dead system |
| `src/cli/phaseF3_aor_fallback_usage_audit.ts` | Audit tool for dead system |
| `tools/docs/aor_reconcile_scan.py` | Reconciliation tool for dead system |
| `tools/docs/aor_reconcile_apply.py` | Reconciliation applicator for dead system |
| `tests/aor_reshaping.test.ts` | Tests dead reshape system |
| `tests/corps_aor_contiguity.test.ts` | Tests dead contiguity system |

### R2 — ZoC doc tombstones (commit `23a39fa`, parallel agent)

12 doc files updated with ZoC tombstone notes (ZoC was fully deleted 2026-03-02 but docs hadn't been updated):

**Canon (7 files):**
- `Engine_Invariants_v0_6_0.md` — removed ZoC projection invariant, retreat destination classes, pipeline order
- `Game_Bible_v0_6_0.md` — replaced ZoC section with frontage cap + local_front_defense
- `Rulebook_v0_6_0.md` — replaced ZoC rules with movement_orders description, OSID-based retreat
- `Systems_Manual_v0_6_0.md` — renamed §2.1, §8 to remove ZoC references; tombstone paragraph listing all deleted artifacts
- `Phase_Specifications_v0_6_0.md` — removed ZoC from war phase feature list
- `War_Specification_v0_6_0.md` — added apply-brigade-movement step; annotated deleted steps
- `context.md` — relabeled spatial model section

**Engineering (5 files):**
- `AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — marked ZoC overlay as removed
- `MAP_UI_MASTER.md` — no changes needed (already correct)
- `PIPELINE_ENTRYPOINTS.md` — full tombstone with deleted ZoC artifacts; named replacement step
- `TACTICAL_MAP_SYSTEM.md` — marked ZoC overlay as legacy/removed
- `PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md` — annotated ZoC readiness lines as obsolete

### R3 — AoR consumer migration (commit `23a39fa`, parallel agent + main thread)

18 consumer files migrated. Since `brigade_aor` is never populated (`{}`), all migrations were dead-branch removals with zero behavioral impact.

**Agent-handled (12 files):**

| File | What Was Removed |
|---|---|
| `recon_intelligence.ts` | AoR seed fallback; always used OSID seeds |
| `brigade_pressure.ts` | AoR-based pressure computation; replaced with `sideAPressure = 0` |
| `militia_garrison.ts` | `if (brigadeAor[sid]) continue` guard — always false |
| `faction_resilience.ts` | Home defense bonus via AoR (always `false` since `isInHomeMun` checked empty AoR) |
| `corps_front_assign.ts` | `deriveCorpsFrontEdgesFromBrigadeAoR()` stubbed to `return {}` |
| `apply_brigade_reposition.ts` | Entire body stubbed; only clears `brigade_reposition_orders` |
| `formation_hq_relocation.ts` | `pickAoRDepthTarget()` + Phase II brigade rule block |
| `displacement_state_utils.ts` | Legacy `brigade_aor` + `brigade_municipality_assignment` lookup blocks |
| `operational_groups.ts` | `shedDonorAoRIfOverCap()`, `computeOGPressureBonus()` → `return 1.0` |
| `combat_estimate.ts` | AoR-based density + garrison computation |
| `bot_brigade_ai_osid.ts` | Comments only — no code change |
| `corps_sector_partition.ts` | Comments only — no code change |

**Main thread (6 files):**

| File | What Was Changed |
|---|---|
| `battle_resolution.ts` | Removed AoR adjacency gate; replaced with `hq_sid` adjacency for legacy SID fallback. `defenderBrigadeId` set to `undefined` (militia-only defense). Linking mult removed (always `1`). |
| `brigade_movement.ts` | Removed `collapseAoRToSingleSettlement()`. Packing pass now uses `getHoldSid()` (returns `hq_sid`). In-transit arrival no longer writes to `brigade_aor`. |
| `brigade_movement_query.ts` | `getStartSid()` now uses `location_osid ?? hq_sid` instead of AoR lookup. |
| `war_data_extractor.ts` | `extractFrontEdges()` + `extractExposedFront()` — removed `!useOsid` AoR branches; always use OSID brigade set. |
| `desktop_sim.ts` | Removed `validateBrigadeAoROrder()`. `queryCorpsSectors()` always uses `location_osid`. `validateBrigadeMovementOrder()` uses `location_osid ?? hq_sid`. |
| `electron-main.cjs` | `stage-brigade-aor-order` IPC handler stubs to error (AoR reshape not supported in OSID mode). |
| `sim_validate.ts` | Removed `validateAllAoRContiguity` import and call. |

**Test updates:**
- `brigade_deploy_orders.test.ts`: removed AoR-collapse assertion (was testing `collapseAoRToSingleSettlement` which is removed)
- `brigade_corps_front_assign.test.ts`: `deriveCorpsFrontEdgesFromBrigadeAoR` test expects `{}`
- `brigade_pressure.test.ts`: pressure tests expect 0
- `corps_command.test.ts`: OG pressure bonus test expects 1.0

### R4 — Peace/war canon terminology (commit `3f36b61`)

4 canon docs updated with "peace phase / war phase" framing:

| File | Change |
|---|---|
| `context.md` | Directory comments; "Phase II spatial model" → "war phase"; "Phase I" early-war references |
| `Systems_Manual_v0_6_0.md` | Implementation note; §v0.6 consolidation footer already correct |
| `Phase_Specifications_v0_6_0.md` | Already fully updated by prior agent — no changes needed |
| `War_Specification_v0_6_0.md` | Removed "Supersedes" front-matter; moved to §11 historical note |

**Not changed:** Pipeline step names (`phase-i-militia-emergence`, `phase-ii-*`, etc.) — load-bearing in serialized saves.

### R5 — Type renames (commit `3f36b61`)

3 cosmetic renames applied. Skipped `PhaseIJNAState`, `applyPhase0ToPhaseITransition`, and `phase_i_militia_strength` (the last requires a save migration).

| Old Name | New Name | File |
|---|---|---|
| `PHASE_I_DISPLACEMENT_FRACTION_NO_CENSUS` | `EARLY_WAR_DISPLACEMENT_FRACTION_NO_CENSUS` | `displacement.ts` |
| `PhaseIDisplacementFlipInfo` | `EarlyWarDisplacementFlipInfo` | `displacement.ts` |
| `assertNoAoRInPhaseI` | `assertNoAoRInEarlyWar` | `peace_phases.ts`, `run_early_war_browser.ts` |

---

## Lessons Learned

- **Dead data is invisible complexity.** `brigade_aor` was never populated but 18 files still imported and checked it. The codebase appeared to have a sophisticated AoR system when in fact it was all no-ops. Grep-based audit was the only way to find the scope.
- **Parallel agents scale doc cleanup.** R2 (12 doc files) and R3 (12 consumer files) ran concurrently while the main thread handled high-risk consumers. Total wall time roughly 1/3 of sequential.
- **Pipeline step names are load-bearing.** `phase-i-*` / `phase-ii-*` strings are embedded in serialized `TurnReport` objects. They cannot be renamed without a save migration. Type names and function names are safe to rename freely.
- **Old audit doc was pre-deletion snapshot.** `AOR_ZOC_LEGACY_AUDIT.md` said ZoC was "ACTIVE" — but that was written before deletion. Always verify code status directly (file existence + war_phases.ts step names) before trusting an audit doc.
- **`const x = undefined`** causes TypeScript to narrow the type to `never` inside `if (x)` blocks. Use `const x = undefined as T | undefined` to preserve the intended type.

---

## Files Changed

| File | Change |
|---|---|
| `src/cli/phaseF3_aor_fallback_usage_audit.ts` | Deleted |
| `src/cli/sim_aorcheck.ts` | Deleted |
| `src/cli/sim_validate.ts` | Removed `validateAllAoRContiguity` |
| `src/desktop/desktop_sim.ts` | Removed AoR functions and imports |
| `src/desktop/electron-main.cjs` | AoR IPC handler stubbed |
| `src/sim/combat/aor_contiguity.ts` | Deleted |
| `src/sim/combat/aor_reshaping.ts` | Deleted |
| `src/sim/combat/apply_brigade_reposition.ts` | Stubbed to clear orders only |
| `src/sim/combat/battle_resolution.ts` | AoR gate → hq_sid adjacency |
| `src/sim/combat/brigade_movement.ts` | Removed collapseAoRToSingleSettlement |
| `src/sim/combat/brigade_movement_query.ts` | getStartSid → location_osid/hq_sid |
| `src/sim/combat/brigade_pressure.ts` | AoR pressure → 0 |
| `src/sim/combat/combat_estimate.ts` | AoR garrison → 0 |
| `src/sim/combat/corps_directed_aor.ts` | Deleted |
| `src/sim/combat/corps_front_assign.ts` | deriveCorpsFrontEdgesFromBrigadeAoR → {} |
| `src/sim/combat/faction_resilience.ts` | Home defense bonus via AoR removed |
| `src/sim/combat/militia_garrison.ts` | AoR guard removed |
| `src/sim/combat/operational_groups.ts` | OG AoR operations removed |
| `src/sim/combat/recon_intelligence.ts` | AoR seed fallback removed |
| `src/sim/formation_hq_relocation.ts` | pickAoRDepthTarget removed |
| `src/state/displacement.ts` | R5 type renames |
| `src/state/displacement_state_utils.ts` | Legacy AoR lookup blocks removed |
| `src/sim/run_early_war_browser.ts` | assertNoAoRInPhaseI → assertNoAoRInEarlyWar |
| `src/sim/turn_phases/peace_phases.ts` | assertNoAoRInPhaseI → assertNoAoRInEarlyWar |
| `src/ui/warroom/data/war_data_extractor.ts` | !useOsid AoR branches removed |
| `src/validate/aor_contiguity.ts` | Deleted |
| `tests/aor_reshaping.test.ts` | Deleted |
| `tests/brigade_corps_front_assign.test.ts` | Updated fixture |
| `tests/brigade_deploy_orders.test.ts` | Removed AoR-collapse assertion |
| `tests/brigade_pressure.test.ts` | Updated expected pressure to 0 |
| `tests/corps_aor_contiguity.test.ts` | Deleted |
| `tests/corps_command.test.ts` | OG pressure test expects 1.0 |
| `tools/docs/aor_reconcile_apply.py` | Deleted |
| `tools/docs/aor_reconcile_scan.py` | Deleted |
| `docs/10_canon/Engine_Invariants_v0_6_0.md` | ZoC tombstone |
| `docs/10_canon/Game_Bible_v0_6_0.md` | ZoC tombstone |
| `docs/10_canon/Phase_Specifications_v0_6_0.md` | Peace/war framing |
| `docs/10_canon/Rulebook_v0_6_0.md` | ZoC tombstone |
| `docs/10_canon/Systems_Manual_v0_6_0.md` | ZoC tombstone + peace/war framing |
| `docs/10_canon/War_Specification_v0_6_0.md` | ZoC tombstone + peace/war framing |
| `docs/10_canon/context.md` | Peace/war framing |
| `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` | ZoC overlay marked removed |
| `docs/20_engineering/AOR_ZOC_LEGACY_AUDIT.md` | R1-R4 completion status |
| `docs/20_engineering/PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md` | ZoC readiness tombstone |
| `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` | ZoC tombstone + apply-brigade-movement |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | ZoC overlay legacy/removed |

---

## Next Steps

1. **R3-final (deferred):** Delete `brigade_aor_legacy.ts`, `aor_instantiation.ts`, remove `LegacyBrigadeAoRState` from `game_state.ts`, delete `tests/brigade_aor.test.ts` and `tests/emergence_aor_instantiation.test.ts`. Requires updating legacy test stubs first.
2. **R5-deferred:** `PhaseIJNAState` → `EarlyWarJNAState`; `applyPhase0ToPhaseITransition` → `applyPeaceToWarTransition`; `phase_i_militia_strength` → `early_war_militia_strength` (requires save migration function).
3. **Calibration run:** Verify 40w scenario hash unchanged after AoR cleanup (expected: same, all removed branches were no-ops).
4. **GUI Phase 6 decision:** Now that codebase is cleaner, revisit GUI Phase 6 scope.
