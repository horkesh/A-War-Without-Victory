# AoR / ZoC / Peace·War Legacy Audit

**Created:** 2026-03-02
**Expanded:** 2026-03-04 — corrected ZoC status (deleted, not active), added Peace/War naming section, confirmed AoR consumer list
**Updated:** 2026-03-07 — Phase I/II terminology purged from codebase; pipeline step names renamed (`militia-emergence`, `cohesion-drift`, etc.); type/function renames complete (`JNATransitionState`, `FrontDescriptor`, `createOobFormations`, `applyWarTransition`, `isEarlyWarAllowed`, `processDisplacementTakeover`, `runCohesionDrift`, `runMoraleDrift`)
**R1-R3 completed:** 2026-03-04 — dead AoR files deleted, all consumers migrated, ZoC + AoR doc tombstones applied
**Purpose:** Exhaustive inventory of all legacy references across codebase with phased removal plan.

---

## Executive Summary

| System | Code Status | Doc Status | Action Required |
|--------|-------------|------------|-----------------|
| **AoR** | ✅ R1-R3 complete — dead files deleted, consumers migrated to OSID/hq_sid. `brigade_aor_legacy.ts` + `aor_instantiation.ts` remain (still compile, no active callers outside legacy tests) | Stale refs in 3 canon + 3 eng docs | R4: update canon peace/war framing; R5: cosmetic type renames (optional) |
| **ZoC** | ✅ Fully deleted (2026-03-02) | ✅ R2 complete — 12 docs updated with tombstone notes | Done |
| **Peace/War naming** | ✅ Pipeline step names renamed (e.g. `militia-emergence`, `cohesion-drift`); type/function renames complete | ✅ R4+R5 complete — peace/war framing in canon + eng docs; codebase purged | Done |

---

## Part 1: AoR (Area of Responsibility)

### 1A. Dead Code — Safe to Delete Immediately

These files have no active pipeline callers. Deletion = zero behavioral change.

| File | Lines | Why Dead |
|------|-------|----------|
| `src/sim/combat/corps_directed_aor.ts` | ~550 | No pipeline callers; `aor_instantiation.ts` calls it but that file is also legacy |
| `src/sim/combat/aor_reshaping.ts` | ~230 | Reshape order system removed |
| `src/sim/combat/aor_contiguity.ts` | ~250 | Contiguity enforcement removed from pipeline |
| `src/validate/aor_contiguity.ts` | ~80 | Validation for dead system |
| `src/cli/sim_aorcheck.ts` | ~50 | CLI tool for dead system |
| `src/cli/phaseF3_aor_fallback_usage_audit.ts` | ~100 | Audit tool for dead system |
| `tools/docs/aor_reconcile_scan.py` | ~163 | Reconciliation tool for dead system |
| `tools/docs/aor_reconcile_apply.py` | ~223 | Reconciliation applicator for dead system |
| `tests/aor_reshaping.test.ts` | All | Tests dead reshape system |
| `tests/corps_aor_contiguity.test.ts` | All | Tests dead contiguity system |

**Estimated removal:** ~1,700 lines, 0 behavioral impact.

### 1B. Core Legacy API (delete after consumers migrated)

| File | Lines | Role |
|------|-------|------|
| `src/sim/combat/brigade_aor_legacy.ts` | ~227 | Slim legacy API: `getBrigadeAoRSettlements`, `getSettlementGarrison`, `computeBrigadeDensity`, `getLegacyAoR` |
| `src/sim/emergence/aor_instantiation.ts` | ~100 | AoR init at peace→war transition (legacy path only) |

### 1C. Active Consumers of `getLegacyAoR()` / `getBrigadeAoRSettlements()`

**Confirmed by grep (2026-03-04):** 25 files total.

| Priority | File | Usage |
|----------|------|-------|
| HIGH | `src/sim/combat/battle_resolution.ts` | Garrison lookup, retreat AoR size, attacker AoR |
| HIGH | `src/sim/combat/brigade_movement.ts` | Movement within AoR, reposition source |
| HIGH | `src/sim/combat/brigade_movement_query.ts` | Movement range query |
| MEDIUM | `src/sim/combat/brigade_pressure.ts` | Pressure computation over AoR |
| MEDIUM | `src/sim/combat/combat_estimate.ts` | Combat estimate garrison |
| MEDIUM | `src/sim/combat/militia_garrison.ts` | Militia garrison from brigade_aor |
| MEDIUM | `src/sim/combat/operational_groups.ts` | OG donor settlement lookup |
| MEDIUM | `src/sim/combat/apply_brigade_reposition.ts` | Reposition within AoR |
| MEDIUM | `src/sim/combat/corps_front_assign.ts` | Front assignment from brigade_aor |
| MEDIUM | `src/sim/combat/faction_resilience.ts` | Faction resilience via AoR coverage |
| MEDIUM | `src/sim/combat/bot_brigade_ai_osid.ts` | Brigade AI uses AoR for targeting context |
| MEDIUM | `src/sim/combat/corps_sector_partition.ts` | Sector partition references brigade_aor |
| MEDIUM | `src/state/displacement_state_utils.ts` | Displacement municipality assignment |
| LOW | `src/sim/combat/recon_intelligence.ts` | Recon seed fallback from brigade_aor |
| LOW | `src/sim/formation_hq_relocation.ts` | HQ placement within AoR settlements |
| LOW | `src/state/game_state.ts` | `LegacyBrigadeAoRState`, `getLegacyAoR()`, `BrigadeAoROrder` types |
| LOW | `src/state/serialize.ts` | AoR field serialization |
| LOW | `src/sim/turn_phases/war_phases.ts` | Legacy path check |
| LOW | `src/desktop/desktop_sim.ts` | Desktop queries (phase-gated, peace only) |
| LOW | `src/ui/warroom/data/war_data_extractor.ts` | Warroom data extraction (phase-gated) |
| LOW | `src/ui/map/data/GameStateAdapter.ts` | Map adapter reads brigade_aor |
| LEGACY | `src/sim/combat/aor_contiguity.ts` | (see dead code above) |
| LEGACY | `src/sim/combat/aor_reshaping.ts` | (see dead code above) |
| LEGACY | `src/sim/combat/corps_directed_aor.ts` | (see dead code above) |
| LEGACY | `src/sim/emergence/aor_instantiation.ts` | (see core legacy above) |

### 1D. OSID Replacement Patterns

| AoR Usage | OSID-based Replacement |
|-----------|------------------------|
| `getBrigadeAoRSettlements(state, bid)` → SID list | Brigade `location_osid` + operational contact graph adjacency |
| `getSettlementGarrison(state, sid)` → brigade at SID | Find brigade where `location_osid` matches |
| `computeBrigadeDensity(state, bid)` → AoR coverage | Corps front sector density (`corps_front_sectors`) |
| `getLegacyAoR(state).brigade_aor` → SID→brigade map | Build from formations by `location_osid` |
| `getLegacyAoR(state).brigade_municipality_assignment` | Derive from `location_osid` → municipality |

### 1E. GameState Fields (remove after consumers migrated)

| Field | Type | File | Line |
|-------|------|------|------|
| `brigade_aor` | `Record<SettlementId, FormationId \| null>` | `game_state.ts` | ~84 |
| `brigade_aor_orders` | `BrigadeAoROrder[]` | `game_state.ts` | ~85 |
| `LegacyBrigadeAoRState` | Interface | `game_state.ts` | ~83 |
| `BrigadeAoROrder` | Interface | `game_state.ts` | ~69 |
| `getLegacyAoR()` | Accessor function | `game_state.ts` | ~91 |

### 1F. Test Files (partial legacy — keep, update fixtures after migration)

| File | Status |
|------|--------|
| `tests/brigade_aor.test.ts` | Keep — tests low-level legacy API; delete after migration |
| `tests/emergence_aor_instantiation.test.ts` | Keep — legacy path; delete after migration |
| `tests/battle_resolution.test.ts` | Keep — update fixtures after migration |
| `tests/brigade_pressure.test.ts` | Keep — update fixtures after migration |
| `tests/corps_command.test.ts` | Keep — update fixtures after migration |
| `tests/brigade_deploy_orders.test.ts` | Keep — update fixtures after migration |
| `tests/brigade_corps_front_assign.test.ts` | Keep — update fixtures after migration |
| `tests/displacement_takeover.test.ts` | Keep — update fixtures after migration |
| `tests/front_assignment.test.ts` | Keep — update fixtures after migration |
| `tests/formation_hq_relocation.test.ts` | Keep — update fixtures after migration |
| `tests/sandbox_slice_determinism.test.ts` | Keep — update fixtures after migration |

### 1G. Documentation (AoR)

**Update when code is removed:**
- `docs/10_canon/Systems_Manual_v0_6_0.md` — §8 mentions AoR removal; update to reflect complete removal
- `docs/10_canon/context.md` — war-phase spatial model framing — update to current terminology
- `docs/20_engineering/REPO_MAP.md` — remove deleted file entries from file list
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` — remove any AoR pipeline refs
- `docs/20_engineering/GUI_DESIGN_BLUEPRINT.md` — remove "AREA OF RESPONSIBILITY" display mockup
- `.cursor/rules/aor-sid-address.mdc` — remove or update rule
- `.cursor/agents/formation-expert.md` — remove AoR ownership
- `.claude/napkin.md` — remove "no initializeBrigadeAoR" note (will be moot)

**Leave as-is (historical records):**
- All `docs/40_reports/` entries
- `docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md`
- `docs/_old/` entries

---

## Part 2: ZoC (Zone of Control)

### 2A. Code Status: FULLY DELETED (2026-03-02)

The following files were deleted as part of n344:

| Deleted File | Lines Removed | What It Did |
|-------------|--------------|-------------|
| `src/sim/combat/zoc.ts` | ~297 | Core: `computeEnemyZocOsidsForFaction`, `computeLinkedZocForFaction`, `computeZoCState`, `isBrigadeInEnemyZoc`, `getValidRetreatDestinations` |
| `src/sim/combat/zoc_constrained_movement.ts` | ~90 | `applyZocConstrainedMovement` — movement blocked by enemy ZoC |
| `tests/linked_zoc.test.ts` | ~450 | ZoC chain, distance, movement blocking tests |

Pipeline steps removed: `zoc-computation`, `zoc-constrained-movement`
GameState fields removed: `war_enemy_zoc_by_faction`, `war_linked_zoc_by_faction`
Constants replaced: `MAX_ZOC_SETTLEMENTS`, `MIN_ZOC_SETTLEMENTS` → `BRIGADE_OPERATIONAL_FRONTAGE_CAP = 48`
Replacement: `apply-brigade-movement` via `brigade_movement_orders.ts`, defense via `local_front_defense.ts` density

**Retained from ZoC system:** `src/sim/combat/osid_adjacency.ts` — `buildOsidAdjacency`, `type Osid` (still actively used)

### 2B. Stale ZoC References in Live Docs (ACTION REQUIRED)

These files still describe ZoC as present and active. They need targeted updates to reflect deletion.

**Canon (7 files — must update):**

| File | Reference Type | What to Fix |
|------|---------------|-------------|
| `docs/10_canon/Engine_Invariants_v0_6_0.md` | §6.1 "ZoC Defensive Projection, retreat destinations" | Remove ZoC section; update retreat to OSID-based |
| `docs/10_canon/Game_Bible_v0_6_0.md` | ZoC overview, movement constraints | Replace with sector-line defense + frontage cap explanation |
| `docs/10_canon/Rulebook_v0_6_0.md` | Lines 124–147: comprehensive ZoC rules | Replace with local_front_defense + movement order rules |
| `docs/10_canon/Systems_Manual_v0_6_0.md` | §8 "OSID/ZoC/Corps Sectors" | Remove ZoC from §8; update to "OSID/Corps Sectors/Frontage" |
| `docs/10_canon/Phase_Specifications_v0_6_0.md` | "War phase includes ZoC" | Remove ZoC from war phase description |
| `docs/10_canon/War_Specification_v0_6_0.md` | "ZoC-constrained movement" | Replace with movement order mechanics |
| `docs/10_canon/context.md` | "War-phase spatial model (OSID/Corps Sectors/Frontage)" | ✅ Updated — ZoC removed, frontage cap + local_front_defense added |

**Engineering (5 files — must update):**

| File | Reference Type | What to Fix |
|------|---------------|-------------|
| `docs/20_engineering/AOR_ZOC_LEGACY_AUDIT.md` | Part 2 said ZoC "ACTIVE" | **This document** — already corrected in this revision |
| `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` | "ZoC overlay (Phase 5)" | Mark as removed / not implemented |
| `docs/20_engineering/MAP_UI_MASTER.md` | ZoC overlay reference | Remove or mark removed |
| `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` | ZoC pipeline steps listed | Remove `zoc-computation` and `zoc-constrained-movement` entries |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | ZoC overlay rendering | Mark ZoC overlay as removed |

**Planning docs (leave as-is — historical):**
- `docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md` — original ZoC design spec
- `docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md` — ZoC in attack resolution spec

**Archived UI (no action — already archived):**
- `src/_archived/ui_legacy/` — 5 files with ZoC rendering code; archived, no impact

---

## Part 3: Peace / War Naming (formerly Phase I / Phase II)

### 3A. Pipeline Step Names — ✅ RENAMED (2026-03-07)

Pipeline step names have been renamed to remove Phase I/II prefixes:
- `militia-emergence` (was `phase-i-militia-emergence`), `pool-population`, `minority-militia-decay`, `brigade-reinforcement`, `formation-spawn`, `control-flip`, `displacement-hooks`, `control-strain`, `authority-update`, `jna-transition`
- `cohesion-drift` (was `phase-ii-cohesion-drift`), `morale-drift`, `supply-osid`, `enclave-resilience`, `resolve-attack-orders`, etc.

### 3B. Run Summary Fields — ✅ RENAMED (2026-03-07)

Run summary fields updated to remove Phase I/II prefixes.

### 3C. Type Names and Function Names — ✅ RENAMED (2026-03-07)

All internal type/function renames completed:

| Old Name | New Name |
|---|---|
| `PhaseIJNAState` | `JNATransitionState` |
| `PhaseIIFrontDescriptor` | `FrontDescriptor` |
| `createOobFormationsAtPhaseIEntry` | `createOobFormations` |
| `applyPhase0ToPhaseITransition` | `applyWarTransition` |
| `isPhaseIAllowed` | `isEarlyWarAllowed` |
| `processPhaseIIDisplacementTakeover` | `processDisplacementTakeover` |
| `runPhaseIICohesionDrift` | `runCohesionDrift` |
| `runPhaseIIMoraleDrift` | `runMoraleDrift` |

### 3D. Canon and Engineering Documentation — ✅ UPDATED (2026-03-07)

All canon and engineering docs updated to use Peace/War terminology. Historical planning docs (`PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md`, `PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md`) retain legacy terminology with deprecation notes.

---

## Phased Removal Plan

### ✅ Phase R1: Dead AoR Code — COMPLETE (2026-03-04)
**Scope:** 10 files (~1,700 lines) deleted. Zero behavioral change.
**Files deleted:** `corps_directed_aor.ts`, `aor_reshaping.ts`, `aor_contiguity.ts` (combat + validate), `sim_aorcheck.ts`, `phaseF3_aor_fallback_usage_audit.ts`, `aor_reconcile_scan.py`, `aor_reconcile_apply.py`, `tests/aor_reshaping.test.ts`, `tests/corps_aor_contiguity.test.ts`
**Commit:** `23a39fa`

### ✅ Phase R2: ZoC Doc Cleanup — COMPLETE (2026-03-04)
**Scope:** 12 doc files (7 canon + 5 engineering) updated with ZoC tombstone notes.
**Pattern:** Removed ZoC sections, replaced with frontage cap + local_front_defense descriptions, added "(ZoC removed 2026-03-02)" annotations throughout.
**Commit:** `23a39fa`

### ✅ Phase R3: AoR Consumer Migration — COMPLETE (2026-03-04)
**Scope:** 18 consumer files migrated. Dead branches removed. `brigade_aor` field is never populated by any active pipeline step; all consumers now use OSID/hq_sid/location_osid.
**Result:** tsc clean, 296 vitest pass. Behavioral hash unchanged (migration = removing dead branches).
**Note:** `brigade_aor_legacy.ts` + `aor_instantiation.ts` + `LegacyBrigadeAoRState` deliberately retained (still compile, used by legacy test stubs). Full deletion deferred to R3-final when legacy tests are updated.
**Commit:** `23a39fa`

### ✅ Phase R4: AoR + Peace/War Doc Cleanup — COMPLETE (2026-03-04)
**Scope:** Peace/War terminology updated in 4 canon docs. ZoC tombstone already done by R2.
**Pattern:** Replaced "Phase I / Phase II" with "peace phase / war phase" where architectural.

### ✅ Phase R5: Peace/War Type + Pipeline Renames — COMPLETE (2026-03-07)
**Scope:** All type/function/constant/pipeline-step renames completed. Phase I/II terminology fully purged from codebase.
**Completed:** `PhaseIJNAState` → `JNATransitionState`; `PhaseIIFrontDescriptor` → `FrontDescriptor`; `createOobFormationsAtPhaseIEntry` → `createOobFormations`; `applyPhase0ToPhaseITransition` → `applyWarTransition`; `isPhaseIAllowed` → `isEarlyWarAllowed`; `processPhaseIIDisplacementTakeover` → `processDisplacementTakeover`; `runPhaseIICohesionDrift` → `runCohesionDrift`; `runPhaseIIMoraleDrift` → `runMoraleDrift`; pipeline steps: `phase-i-militia-emergence` → `militia-emergence`, `phase-ii-cohesion-drift` → `cohesion-drift`, etc.

---

## Metrics

| Category | Dead Code | Active Consumers | Stale Docs | Total Files |
|----------|-----------|-----------------|------------|-------------|
| AoR | 10 files | 25 files | 6 docs | 41 |
| ZoC | 0 (deleted) | 0 | 12 docs | 12 |
| Peace/War naming | 0 (fully renamed) | 0 | 0 (all updated) | Done |
| **Total** | **10** | **25** | **22** | **~77** |

---

## What NOT to Do

- ~~**Do not rename pipeline step names**~~ — ✅ Renamed 2026-03-07 (save migration handled)
- **Do not delete `osid_adjacency.ts`** — still actively used (was extracted from ZoC, serves adjacency queries)
- **Do not remove AoR consumers before migrating them** — will break battle resolution, movement, garrison
- **Do not touch `docs/40_reports/` or `docs/_old/`** — historical record, leave as-is
- ~~**Do not rename `phase_i_militia_strength` without a save migration function**~~ — ✅ Renamed 2026-03-07
