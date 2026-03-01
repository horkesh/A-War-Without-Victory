# AoR & ZoC Legacy Audit — Comprehensive Reference Listing

**Created:** 2026-03-02
**Purpose:** Exhaustive inventory of all AoR (Area of Responsibility) and ZoC (Zone of Control) references across the codebase, with removal plan.

---

## Status Summary

| System | Status | Pipeline Active? | GameState Fields? | Files |
|--------|--------|-----------------|-------------------|-------|
| **AoR** | Legacy — phased out, superseded by OSID `location_osid` | No (no pipeline step) | Yes (`brigade_aor`, `brigade_aor_orders` via `LegacyBrigadeAoRState`) | 4 core + 20+ consumers |
| **ZoC** | **Active** — runs every turn | Yes (`zoc-computation`, `zoc-constrained-movement`) | Yes (`war_enemy_zoc_by_faction`, `war_linked_zoc_by_faction`) | 2 core + 5+ consumers |

**Key finding:** The MEMORY.md entry "ZoC DEPRECATED (2026-03-01)" is **incorrect**. ZoC is fully active in the turn pipeline. Virtual defense (`computeZocDefenderPower`) was removed, but core ZoC (enemy ZoC sets, linked ZoC, ZoC-constrained movement) remains.

---

## Part 1: AoR References

### 1A. Core AoR Source Files (candidates for deletion)

| File | Lines | Role | Consumers |
|------|-------|------|-----------|
| `src/sim/combat/brigade_aor_legacy.ts` | ~227 | Slim legacy API: `getBrigadeAoRSettlements`, `getSettlementGarrison`, `computeBrigadeDensity` | 10+ files |
| `src/sim/combat/corps_directed_aor.ts` | ~550 | Legacy corps-directed AoR allocation | 0 active callers in pipeline |
| `src/sim/combat/aor_reshaping.ts` | ~230 | Legacy AoR reshape order validation | Desktop GUI only |
| `src/sim/combat/aor_contiguity.ts` | ~250 | Legacy AoR contiguity checks | Tests only |
| `src/sim/emergence/aor_instantiation.ts` | ~100 | AoR init at Phase I→II transition | Pipeline (legacy path only) |
| `src/validate/aor_contiguity.ts` | ~80 | AoR contiguity validation | CLI tool |
| `src/cli/sim_aorcheck.ts` | ~50 | CLI: check AoR contiguity | Standalone |
| `src/cli/phaseF3_aor_fallback_usage_audit.ts` | ~100 | CLI: AoR fallback audit | Standalone |

### 1B. Active Consumers of `getLegacyAoR()` / `getBrigadeAoRSettlements()`

These files import and call AoR functions. Each must be updated or have AoR paths removed.

| File | Import | Usage |
|------|--------|-------|
| `src/sim/combat/battle_resolution.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements`, `getSettlementGarrison` | Garrison lookup, retreat AoR size, attacker AoR |
| `src/sim/combat/brigade_movement.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements` | Movement within AoR, reposition source |
| `src/sim/combat/brigade_movement_query.ts` | `getBrigadeAoRSettlements` | Movement range query |
| `src/sim/combat/brigade_pressure.ts` | `getLegacyAoR` | Pressure computation over AoR |
| `src/sim/combat/combat_estimate.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements`, `getSettlementGarrison` | Combat estimate garrison |
| `src/sim/combat/consolidation_flips.ts` | `getLegacyAoR` | Consolidation control flips via brigade_aor |
| `src/sim/combat/corps_front_assign.ts` | `getLegacyAoR` | Front assignment from brigade_aor |
| `src/sim/combat/faction_resilience.ts` | `getLegacyAoR` | Faction resilience via AoR coverage |
| `src/sim/combat/militia_garrison.ts` | `getLegacyAoR` | Militia garrison from brigade_aor |
| `src/sim/combat/operational_groups.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements` | OG donor settlement lookup |
| `src/sim/combat/recon_intelligence.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements` | Recon seed fallback from brigade_aor |
| `src/sim/combat/apply_brigade_reposition.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements` | Reposition within AoR |
| `src/sim/formation_hq_relocation.ts` | `getLegacyAoR` | HQ placement within AoR settlements |
| `src/state/displacement_state_utils.ts` | `getLegacyAoR` | Displacement municipality assignment |
| `src/desktop/desktop_sim.ts` | `getLegacyAoR`, `getBrigadeAoRSettlements` | Desktop queries |
| `src/ui/warroom/data/war_data_extractor.ts` | `getLegacyAoR` | Warroom data extraction |
| `src/sim/turn_phases/war_phases.ts` | `LegacyBrigadeAoRState` | Legacy path check |

### 1C. GameState Fields (AoR)

In `src/state/game_state.ts`:

| Field | Type | Line | Status |
|-------|------|------|--------|
| `brigade_aor` | `Record<SettlementId, FormationId \| null>` | 84 | Legacy, via `LegacyBrigadeAoRState` |
| `brigade_aor_orders` | `BrigadeAoROrder[]` | 85 | Legacy, via `LegacyBrigadeAoRState` |
| `BrigadeAoROrder` | Interface | 69-93 | Legacy type |
| `LegacyBrigadeAoRState` | Interface | 83-93 | Legacy wrapper |
| `getLegacyAoR()` | Function | 91-93 | Legacy accessor |

In `src/state/serializeGameState.ts`:
- Not actively serialized (omitted from derivedKeys or serialized conditionally)

### 1D. Test Files (AoR)

| File | Tests | Status |
|------|-------|--------|
| `tests/brigade_aor.test.ts` | `identifyFrontActiveSettlements`, `computeBrigadeDensity`, `getSettlementGarrison` | Legacy API tests |
| `tests/aor_reshaping.test.ts` | AoR reshape order validation (15+ cases) | Dead — reshaping removed |
| `tests/corps_aor_contiguity.test.ts` | Corps contiguity enforcement (~250 lines) | Dead — contiguity removed |
| `tests/emergence_aor_instantiation.test.ts` | AoR init at Phase I→II | Legacy path |
| `tests/brigade_deploy_orders.test.ts` | Uses `brigade_aor` field | Partial legacy |
| `tests/brigade_corps_front_assign.test.ts` | Front assignment via `brigade_aor` | Partial legacy |
| `tests/battle_resolution.test.ts` | Battle resolution with `brigade_aor` | Partial legacy |
| `tests/brigade_pressure.test.ts` | Pressure via AoR | Partial legacy |
| `tests/corps_command.test.ts` | Corps command with `brigade_aor` | Partial legacy |
| `tests/formation_hq_relocation.test.ts` | HQ within AoR settlements | Partial legacy |
| `tests/displacement_takeover.test.ts` | Displacement with `brigade_aor` | Partial legacy |
| `tests/front_assignment.test.ts` | Front assignment with `brigade_aor` | Partial legacy |
| `tests/sandbox_slice_determinism.test.ts` | Sandbox with `brigade_aor` | Partial legacy |

### 1E. Documentation (AoR)

**Canon (structural — need update on removal):**
- `docs/10_canon/Systems_Manual_v0_6_0.md` — §8 "OSID location, ZoC, and Corps Sectors (AoR removed)", line 481 "No assigned_brigade or brigade_aor"
- `docs/10_canon/context.md` — line 202 "Phase II spatial model (OSID/ZoC/Corps Sectors; AoR removed)"
- `docs/10_canon/War_Specification_v0_6_0.md` — AoR removal references
- `docs/10_canon/Peace_Specification_v0_6_0.md` — Phase I forbidding AoR

**Engineering (structural — need update on removal):**
- `docs/20_engineering/REPO_MAP.md` — AoR file locations
- `docs/20_engineering/GUI_DESIGN_BLUEPRINT.md` — line 527 "AREA OF RESPONSIBILITY" display
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` — AoR pipeline references

**Planning (historical — leave as-is):**
- `docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md` — 70-line reconciliation doc
- `docs/30_planning/design/BOT_AI_DESIGN_SPEC.md` — "built for AoR regime"
- `docs/30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md` — replacement proposal

**Reports (historical — leave as-is):**
- `docs/40_reports/implemented/20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md`
- `docs/40_reports/implemented/20260301_SPATIAL_MODEL_EVOLUTION_AOR_ZOC_CORPS_SECTORS.md`
- `docs/40_reports/convenes/BRIGADE_AOR_REDESIGN_IMPLEMENTATION_PLAN_2026_02_18.md`
- `docs/40_reports/convenes/AOR_CONTIGUITY_AND_SURROUNDED_BRIGADE_DESIGN_2026_02_17.md`
- Plus ~10 more historical reports (see agent search results)

### 1F. Config & Tooling (AoR)

| File | Reference |
|------|-----------|
| `.claude/napkin.md` | "Peace to war transition: no initializeBrigadeAoR" |
| `.agent/napkin.md` | "When encountering AoR or SID, address it" |
| `.cursor/rules/aor-sid-address.mdc` | 16-line rule document |
| `.cursor/agents/formation-expert.md` | Formation expert owns AoR |
| `.cursor/AGENT_TEAM_ROSTER.md` | AoR in formation expert mandate |
| `tools/docs/aor_reconcile_scan.py` | 163-line reconciliation scanner |
| `tools/docs/aor_reconcile_apply.py` | 223-line reconciliation applicator |

---

## Part 2: ZoC References

### 2A. Core ZoC Source Files (ACTIVE — not candidates for deletion)

| File | Lines | Role |
|------|-------|------|
| `src/sim/combat/zoc.ts` | ~297 | Core ZoC: `computeEnemyZocOsidsForFaction`, `computeLinkedZocForFaction`, `computeZoCState`, `isBrigadeInEnemyZoc`, `getValidRetreatDestinations` |
| `src/sim/combat/zoc_constrained_movement.ts` | ~90 | `applyZocConstrainedMovement` — movement respecting ZoC |
| `src/sim/combat/osid_adjacency.ts` | ~50 | Extracted from zoc.ts — `buildOsidAdjacency`, `isBrigadeDeployed`, `type Osid` |

### 2B. Pipeline Integration (ZoC)

In `src/sim/turn_phases/war_phases.ts`:
- **Line 97-98:** Imports `computeZoCState`, `applyZocConstrainedMovement`
- **Line 302:** Pipeline step `'zoc-computation'` — computes enemy + linked ZoC
- **Line 311:** `computeZoCState(context.state, edges, opData.operationalToCanonical)`
- **Line 319:** Writes `state.war_enemy_zoc_by_faction`
- **Line 325:** Writes `state.war_linked_zoc_by_faction`
- **Line 400:** Pipeline step `'zoc-constrained-movement'` — applies movement with ZoC blocking

### 2C. GameState Fields (ZoC)

In `src/state/game_state.ts`:

| Field | Type | Line |
|-------|------|------|
| `war_enemy_zoc_by_faction` | `Record<FactionId, string[]>` | 1250 |
| `war_linked_zoc_by_faction` | `Record<FactionId, string[]>` | 1252 |

In `src/state/serializeGameState.ts`:
- Lines 76-77: Both fields listed in serialization

### 2D. ZoC Constants (formation_constants.ts)

| Constant/Function | Purpose |
|--------------------|---------|
| `MAX_ZOC_SETTLEMENTS` | Max ZoC per brigade |
| `MIN_ZOC_SETTLEMENTS` | Min ZoC per brigade |
| `getPersonnelBasedZoCCap()` | Personnel-scaled ZoC cap |
| `getEffectiveZoCCap()` | Effective cap (player/bot desired + personnel) |

Used in: `operational_groups.ts` (donor settlement count), archived UI.

### 2E. Active ZoC Consumers

| File | Usage |
|------|-------|
| `src/sim/turn_phases/war_phases.ts` | Pipeline orchestration |
| `src/sim/turn_pipeline_types.ts` | `zocState` cache type |
| `src/sim/combat/operational_groups.ts` | `getPersonnelBasedZoCCap` for donor cap |
| `src/state/settlement_control.ts` | Comment: "HoI ZoC / spawn-by-OSID" |

### 2F. Test Files (ZoC)

| File | Tests |
|------|-------|
| `tests/linked_zoc.test.ts` | ~450 lines: two-brigade linking, chains, distance limits, movement blocking, attack bypass, per-faction independence |

### 2G. Documentation (ZoC)

**Canon (active — describes current system):**
- `docs/10_canon/Engine_Invariants_v0_6_0.md` — §6.1 ZoC Defensive Projection, retreat destinations
- `docs/10_canon/Game_Bible_v0_6_0.md` — ZoC overview, movement constraints
- `docs/10_canon/Rulebook_v0_6_0.md` — lines 124-147: comprehensive ZoC rules
- `docs/10_canon/Systems_Manual_v0_6_0.md` — §8 OSID/ZoC/Corps Sectors, deployment/movement
- `docs/10_canon/Phase_Specifications_v0_6_0.md` — War phase includes ZoC
- `docs/10_canon/War_Specification_v0_6_0.md` — ZoC-constrained movement
- `docs/10_canon/context.md` — "Phase II spatial model (OSID/ZoC/Corps Sectors)"

**Engineering:**
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` — ZoC computation + constrained movement steps
- `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — ZoC overlay (Phase 5)
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` — ZoC overlay rendering
- `docs/20_engineering/PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md` — ZoC readiness tiers

**Planning:**
- `docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md` — Original ZoC design spec
- `docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md` — ZoC in attack resolution

### 2H. Archived UI (ZoC)

| File | References |
|------|-----------|
| `src/_archived/ui_legacy/data/GameStateAdapter.ts` | `enemyZocByFaction` parsing |
| `src/_archived/ui_legacy/renderer/HoIMapRenderer.ts` | ZoC overlay meshes, selection ZoC |
| `src/_archived/ui_legacy/MapApp.ts` | `getPersonnelBasedZoCCap` |
| `src/_archived/ui_legacy/map_hoi/MapModeToolbar.ts` | ZoC layer toggle (F6) |
| `src/_archived/ui_legacy/types.ts` | ZoC type definitions |

---

## Part 3: Removal Plan

### Phase R1: Remove Dead AoR Code (Safe — no behavioral change)

**Delete files:**
1. `src/sim/combat/corps_directed_aor.ts` — no active pipeline callers
2. `src/sim/combat/aor_reshaping.ts` — reshape orders are dead
3. `src/sim/combat/aor_contiguity.ts` — contiguity checks are dead
4. `src/validate/aor_contiguity.ts` — validation for dead system
5. `src/cli/sim_aorcheck.ts` — CLI for dead system
6. `src/cli/phaseF3_aor_fallback_usage_audit.ts` — audit for dead system
7. `tools/docs/aor_reconcile_scan.py` — reconciliation for dead system
8. `tools/docs/aor_reconcile_apply.py` — reconciliation for dead system

**Delete tests:**
1. `tests/aor_reshaping.test.ts` — tests dead reshape system
2. `tests/corps_aor_contiguity.test.ts` — tests dead contiguity system

**Estimated impact:** 0 behavioral change. These files have no active callers in the turn pipeline.

### Phase R2: Migrate AoR Consumers to OSID-Only (Requires careful work)

Each consumer of `getLegacyAoR()` / `getBrigadeAoRSettlements()` needs an OSID-only replacement. The pattern is:

| AoR Usage | OSID Replacement |
|-----------|-----------------|
| `getBrigadeAoRSettlements(state, bid)` → list of SIDs | Brigade's `location_osid` → operational_contact_graph adjacency |
| `getSettlementGarrison(state, sid)` → brigade at SID | Find brigade where `location_osid` maps to SID |
| `computeBrigadeDensity(state, bid)` → AoR coverage | Use corps front sector density instead |
| `getLegacyAoR(state).brigade_aor` → SID→brigade map | Build from formations where `location_osid` is set |
| `getLegacyAoR(state).brigade_municipality_assignment` | Derive from `location_osid` → municipality mapping |

**Priority order (by risk):**
1. `recon_intelligence.ts` — already has OSID path, legacy is fallback only
2. `brigade_pressure.ts` — pressure computation
3. `consolidation_flips.ts` — control flip logic
4. `corps_front_assign.ts` — front assignment
5. `militia_garrison.ts` — garrison lookup
6. `battle_resolution.ts` — highest risk, most complex
7. `combat_estimate.ts` — estimate depends on garrison
8. `brigade_movement.ts` / `brigade_movement_query.ts` — movement range
9. `apply_brigade_reposition.ts` — reposition
10. `operational_groups.ts` — OG donor lookup
11. `formation_hq_relocation.ts` — HQ placement
12. `displacement_state_utils.ts` — displacement municipality
13. `faction_resilience.ts` — resilience coverage
14. `desktop_sim.ts` / `war_data_extractor.ts` — UI layer (lower priority)

**After all consumers migrated:**
- Delete `src/sim/combat/brigade_aor_legacy.ts`
- Delete `src/sim/emergence/aor_instantiation.ts`
- Remove `LegacyBrigadeAoRState`, `BrigadeAoROrder`, `getLegacyAoR()` from `game_state.ts`
- Remove `brigade_aor` from serialization
- Delete remaining AoR test fixtures

### Phase R3: Clean Up AoR Documentation

**Update (structural references):**
- `docs/10_canon/Systems_Manual_v0_6_0.md` — remove "(AoR removed)" suffix, update §8
- `docs/10_canon/context.md` — remove "AoR removed" from spatial model
- `docs/20_engineering/REPO_MAP.md` — remove deleted file entries
- `docs/20_engineering/GUI_DESIGN_BLUEPRINT.md` — remove AoR display mockup
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` — remove AoR pipeline refs

**Leave as-is (historical):**
- All `docs/40_reports/` entries — historical record
- `docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md` — historical
- All `docs/_old/` entries — archived

**Update config:**
- `.cursor/rules/aor-sid-address.mdc` — remove or update
- `.cursor/agents/formation-expert.md` — remove AoR ownership
- `.claude/napkin.md` — remove AoR entries
- `.agent/napkin.md` — remove AoR entries

### Phase R4: ZoC Cleanup (Future — only if ZoC is deprecated)

ZoC is **currently active** and should NOT be removed. If a future decision deprecates ZoC:

**Would require removing:**
- `src/sim/combat/zoc.ts` (~297 lines)
- `src/sim/combat/zoc_constrained_movement.ts` (~90 lines)
- Pipeline steps `zoc-computation` and `zoc-constrained-movement` from `war_phases.ts`
- GameState fields `war_enemy_zoc_by_faction`, `war_linked_zoc_by_faction`
- Serialization entries in `serializeGameState.ts`
- `tests/linked_zoc.test.ts` (~450 lines)
- ZoC constants in `formation_constants.ts`
- All canon ZoC sections (6+ files)
- Archived UI ZoC rendering (5+ files)

**NOT recommended at this time.** ZoC provides movement constraints and front-line modeling that has no replacement.

### Phase R5: Fix Incorrect Memory Entry

The MEMORY.md entry stating "ZoC DEPRECATED (2026-03-01): Entire OSID ZoC system removed" is **factually incorrect**. ZoC remains active. This entry should be corrected to reflect that only `computeZocDefenderPower` (virtual defense) was removed, not the ZoC system itself.

---

## Metrics

| Category | AoR Files | ZoC Files |
|----------|-----------|-----------|
| Core source | 8 | 3 |
| Active consumers | 17 | 4 |
| Tests | 13 | 1 |
| Canon docs | 4 | 7 |
| Engineering docs | 3 | 4 |
| Planning docs | 3 | 2 |
| Reports (historical) | 15+ | 0 |
| Config/tooling | 7 | 3 |
| Archived UI | 3+ | 5 |
| **Total references** | **~75** | **~30** |
