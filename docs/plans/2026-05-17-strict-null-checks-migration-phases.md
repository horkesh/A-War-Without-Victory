# `strictNullChecks` Migration Phase Ledger

Date: 2026-05-17

Source plan: `docs/plans/2026-05-17-strict-null-checks-migration-plan.md`

Inventory artifacts:
- `docs/40_reports/strict_null_inventory_baseline.json`
- `docs/40_reports/strict_null_field_domains.json`
- `tools/diagnostics/strict_null_inventory.cjs`
- `tools/typed_strictness_waivers.json`

## Baseline Counts

Current-tree inventory counts:

| Category | Count |
|---|---:|
| `as_any_casts` | 395 |
| `as_factionid_casts` | 154 |
| `as_unknown_casts` | 97 |
| `non_null_assertions_dot` | 50 |
| `non_null_assertions_index` | 59 |
| `optional_fields_game_state` | 458 |

Optional field domain classification:

| Domain | Count |
|---|---:|
| `sim` | 280 |
| `state` | 170 |
| `derived` | 8 |
| `scenario` | 0 |
| `ipc` | 0 |
| `ui_adapter` | 0 |
| `unknown` | 0 |

Inventory note: the plan's lower-bound estimates for non-null assertions (`>=120` dot and `>=125` index) do not match the current tree when applying the plan's regex-style inventory to non-archived `src/`. The baseline records current-tree truth rather than inflating counts.

## Phase Order

Phase 1 through Phase 6 remain mandatory order. No source migration phase may start before the prior phase is merged and 40w hash-stable.

| Phase | Scope | Cast / assertion count | Optional field count | Downstream consumer count | Determinism risk | Status |
|---|---|---:|---:|---:|---|---|
| 1 | State schema | 25 remaining after partial source pass | 458 | >5 for `GameState` and state namespaces | HIGH | In progress; validator `any` casts reduced |
| 2 | Sim engine - combat | 21 remaining after Batch 20 | 0 | >5 for combat helpers and command state | HIGH | Safe-scope CLOSED 2026-05-18; long-tail blocked (gated/load-bearing/save-shape/cross-file refactor) — see `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md` |
| 3 | Sim engine - early war + bot | 35 | 0 | >5 for turn pipeline / bot flow | MEDIUM | Inventory only; source deferred |
| 4 | Scenario + IPC | 53 | 0 | 3-5 for loader/runner/desktop seams | MEDIUM | Inventory only; source deferred |
| 5 | UI adapter | 68 | 0 | >5 renderer consumers | MEDIUM | Inventory only; source deferred |
| 6 | Renderer + warroom | 74 | 0 | UI-local repeated consumers | LOW | Inventory only; source deferred |

## Phase File Assignment

Each listed file is assigned to exactly one phase. Files outside this first strict-null lane remain tracked by the baseline artifact and should be assigned by a later ledger expansion before they are migrated.

### Phase 1: State Schema

Files:
- `src/state/game_state.ts`
- `src/state/serialize.ts`
- `src/state/validateGameState.ts`
- `src/state/displacement.ts`
- `src/state/supply_reserves.ts`

Counts:
- `as_factionid_casts`: 10
- `as_unknown_casts`: 5
- `as_any_casts`: 19
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 8
- `optional_fields_game_state`: 458

Stop-gate notes:
- Do not promote `?:` fields to required unless existing saves and `validateGameState.ts` already prove presence without a migration.
- `state.meta.player_faction` remains a behavioral-default issue and belongs to the Phase B player-faction plan, not this type-only migration.
- 2026-05-17 partial pass: `src/state/validateGameState.ts` replaced save-shape `as any` reads with explicit `Record<string, unknown>` narrowing. Phase 1 escape hatches decreased from 42 to 25 without changing validation defaults or serialized state shape.
- Blocker: the 458 optional `GameState` fields remain deferred. Promoting them would require save-migration/default decisions and is outside this behavior-stable Phase 1 pass.

### Phase 2: Sim Engine - Combat

Files:
- `src/sim/combat/army_co_roster_loader.ts`
- `src/sim/combat/army_order_interpretation.ts`
- `src/sim/combat/army_reserve_system.ts`
- `src/sim/combat/attack_casualty_distribution.ts`
- `src/sim/combat/attack_history_recording.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `src/sim/combat/attack_retreat_displacement.ts`
- `src/sim/combat/battle_resolution.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/bot_brigade_eval_attack.ts`
- `src/sim/combat/bot_brigade_eval_front.ts`
- `src/sim/combat/brigade_front_distribution.ts`
- `src/sim/combat/brigade_home_return.ts`
- `src/sim/combat/brigade_movement.ts`
- `src/sim/combat/brigade_movement_query.ts`
- `src/sim/combat/combat_estimate.ts`
- `src/sim/combat/combat_math.ts`
- `src/sim/combat/combat_predictor.ts`
- `src/sim/combat/commander/briefing.ts`
- `src/sim/combat/commander/emit.ts`
- `src/sim/combat/commander/force_eval.ts`
- `src/sim/combat/commander/plan.ts`
- `src/sim/combat/commander_march_correction.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/corps_operation_readiness.ts`
- `src/sim/combat/exhaustion.ts`
- `src/sim/combat/faction_progression.ts`
- `src/sim/combat/front_emergence.ts`
- `src/sim/combat/hv_integration.ts`
- `src/sim/combat/jna_phantom_brigades.ts`
- `src/sim/combat/militia_garrison.ts`
- `src/sim/combat/officer_system.ts`
- `src/sim/combat/ongoing_mobilization.ts`
- `src/sim/combat/operation_casualty_attribution.ts`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/osid_column_movement.ts`
- `src/sim/combat/osid_graph_analysis.ts`
- `src/sim/combat/paramilitary_sweep.ts`
- `src/sim/combat/rear_pocket_consolidation.ts`
- `src/sim/combat/sector_building.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/sector_offensive_launch_helpers.ts`
- `src/sim/combat/sector_rearrangement.ts`
- `src/sim/combat/sector_splitting.ts`
- `src/sim/combat/subsegment_assignment.ts`
- `src/sim/combat/supply_condition.ts`
- `src/sim/combat/warlord_friction.ts`

Counts:
- `as_factionid_casts`: 66
- `as_unknown_casts`: 6
- `as_any_casts`: 14
- `non_null_assertions_dot`: 17
- `non_null_assertions_index`: 13

Stop-gate notes:
- `src/sim/combat/paramilitary_sweep.ts`, supply-related combat code, and fatigue-related combat code are conflict-prone in the current multi-agent lane. Leave them as ledger entries until the parent lane confirms they are free.
- 2026-05-18 Batch 4 narrow pass: cleaned the strict-null inventory escapes in `army_co_roster_loader.ts`, `attack_casualty_distribution.ts`, and `combat_estimate.ts`. This removes 3 Phase 2 leaf escapes (`as_factionid_casts`: 1, `as_any_casts`: 1, `non_null_assertions_dot`: 1) and adds a focused progress assertion in `tests/strict_null_inventory_progress.test.ts`. No defaults, schema changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 5 continuation: cleaned the strict-null inventory escapes in `combat_math.ts`, `faction_progression.ts`, `operation_casualty_attribution.ts`, and `warlord_friction.ts`, plus adjacent non-null assertions in those files that the regex inventory does not count. This removes 4 inventory-counted Phase 2 escapes (`as_factionid_casts`: 1, `non_null_assertions_dot`: 1, `non_null_assertions_index`: 2) and adds a focused Batch 5 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count is 110 across still-open combat files (`as_factionid_casts`: 64, `as_unknown_casts`: 7, `as_any_casts`: 13, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 10). No defaults, schema changes, ordering changes, or serialized output changes were introduced; 40w stayed hash-stable at `42607f83870e01d5`.
- 2026-05-18 Batch 7 continuation: cleaned the strict-null inventory escapes in `attack_history_recording.ts`, `commander/briefing.ts`, `exhaustion.ts`, `militia_garrison.ts`, and `osid_graph_analysis.ts`. This removes 5 inventory-counted Phase 2 escapes (`as_factionid_casts`: 4, `as_unknown_casts`: 1) and adds a focused Batch 7 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 5 ledger baseline decreases from 110 to 105. No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 8 continuation: cleaned the strict-null inventory escapes in `brigade_movement_query.ts`. This removes 2 inventory-counted Phase 2 escapes (`as_factionid_casts`: 2) and adds a focused Batch 8 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 7 handoff decreases from 105 to 103 (`as_factionid_casts`: 58, `as_unknown_casts`: 6, `as_any_casts`: 13, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 10). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 9 continuation: cleaned the strict-null inventory escape in `bot_brigade_eval_attack.ts`. This removes 1 inventory-counted Phase 2 escape (`as_factionid_casts`: 1) and adds a focused Batch 9 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 8 handoff decreases from 103 to 102 (`as_factionid_casts`: 57, `as_unknown_casts`: 6, `as_any_casts`: 13, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 10). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 10 continuation: cleaned the strict-null inventory escapes in `hv_integration.ts` and `sector_splitting.ts`. This removes 2 inventory-counted Phase 2 escapes (`as_any_casts`: 2) and adds a focused Batch 10 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 9 handoff decreases from 102 to 100 (`as_factionid_casts`: 57, `as_unknown_casts`: 6, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 10). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 11 continuation: cleaned the strict-null inventory escapes in `brigade_home_return.ts`, `brigade_movement.ts`, and `brigade_front_distribution.ts`. This removes 8 inventory-counted Phase 2 escapes (`as_factionid_casts`: 4, `as_unknown_casts`: 2, `non_null_assertions_index`: 2) and adds a focused Batch 11 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 10 handoff decreases from 100 to 92 (`as_factionid_casts`: 53, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 8). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 12 continuation: cleaned the strict-null inventory escapes in `rear_pocket_consolidation.ts`, `sector_rearrangement.ts`, and `subsegment_assignment.ts`. This removes 5 inventory-counted Phase 2 escapes (`as_factionid_casts`: 5) and adds a focused Batch 12 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 11 handoff decreases from 92 to 87 (`as_factionid_casts`: 48, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 8). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 13 continuation: cleaned the strict-null inventory escapes in `ongoing_mobilization.ts`. This removes 7 inventory-counted Phase 2 escapes (`as_factionid_casts`: 7) and adds a focused Batch 13 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 12 handoff decreases from 87 to 80 (`as_factionid_casts`: 41, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 8). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 14 continuation: cleaned the strict-null inventory escapes in `jna_phantom_brigades.ts`. This removes 5 inventory-counted Phase 2 escapes (`as_factionid_casts`: 3, `non_null_assertions_index`: 2) and adds a focused Batch 14 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 13 handoff decreases from 80 to 75 (`as_factionid_casts`: 38, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 6). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 15 continuation: cleaned the strict-null inventory escapes in `army_reserve_system.ts`. This removes 4 inventory-counted Phase 2 escapes (`as_factionid_casts`: 4) and adds a focused Batch 15 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 14 handoff decreases from 75 to 71 (`as_factionid_casts`: 34, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 6). No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
- 2026-05-18 Batch 16 continuation: cleaned the strict-null inventory escapes in `army_order_interpretation.ts`. This removes 2 inventory-counted Phase 2 escapes (`as_factionid_casts`: 2) and adds a focused Batch 16 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 15 handoff decreases from 71 to 69 (`as_factionid_casts`: 32, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 6). No defaults, schema changes, random source changes, ordering changes, serialized output changes, or C2 telemetry order changes were introduced.
- 2026-05-18 Batch 17 continuation: cleaned the strict-null inventory escapes in `attack_retreat_displacement.ts`. This removes 3 inventory-counted Phase 2 escapes (`as_factionid_casts`: 3) and adds a focused Batch 17 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 16 handoff decreases from 69 to 66 (`as_factionid_casts`: 29, `as_unknown_casts`: 4, `as_any_casts`: 11, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 6). No defaults, schema changes, random source changes, ordering changes, serialized output changes, or retreat/displacement behavior changes were introduced.
- 2026-05-18 Batch 18 continuation: cleaned the strict-null inventory escapes in `battle_resolution.ts`, `combat_predictor.ts`, `commander/force_eval.ts`, `corps_operation_readiness.ts`, and `front_emergence.ts`. This removes 11 inventory-counted Phase 2 escapes (`as_factionid_casts`: 8, `as_unknown_casts`: 1, `non_null_assertions_dot`: 2) and adds a focused Batch 18 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 17 handoff decreases from 66 to 55 (`as_factionid_casts`: 21, `as_unknown_casts`: 3, `as_any_casts`: 11, `non_null_assertions_dot`: 14, `non_null_assertions_index`: 6). The five cleaned files were all behavior-preserving: removed redundant `as FactionId` casts on values already typed as `FactionId`, removed a dead `corps_command[...]['faction' as never]` fallback that always evaluated to `undefined`, replaced two `seg!.field!` chains with explicit `typeof === 'number'` guards in `deriveFrontStability`, and reworded a comment that contained a literal "as unknown" tag. No defaults, schema changes, random source changes, ordering changes, serialized output changes, or simulation behavior changes were introduced.
- 2026-05-18 Batch 19 continuation: cleaned the strict-null inventory escapes in `bot_brigade_ai_osid.ts`, `bot_brigade_eval_front.ts`, `officer_system.ts`, `operation_preparation.ts`, `osid_column_movement.ts`, and (out-of-slice) `commander_march_correction.ts`. This removes 16 inventory-counted Phase 2 escapes (`as_factionid_casts`: 9, `as_unknown_casts`: 1, `non_null_assertions_dot`: 4, `non_null_assertions_index`: 2) and adds a focused Batch 19 progress assertion in `tests/strict_null_inventory_progress.test.ts`. Phase 2 remaining inventory count from the Batch 18 handoff decreases from 55 to 39 (`as_factionid_casts`: 12, `as_unknown_casts`: 2, `as_any_casts`: 11, `non_null_assertions_dot`: 10, `non_null_assertions_index`: 4). Cleanup patterns: removed redundant `as FactionId` casts on values already typed as `FactionId`; replaced `(formation.faction as string) || 'RBiH'` with `formation.faction || 'RBiH'` typed `: FactionId`; inlined `Array.isArray(op.axes)` narrowing in `getBrigadeAxis` / `isOperationParticipant` so `op.axes!` becomes `axes`; captured `assignedSector.territory_osids ?? []` and `state.military.brigade_movement_orders` into locals to drop `assignedSector!` and `state.military.brigade_movement_orders!`; introduced an inline string-literal type guard for `o.faction` in `validateOfficerData` and removed the parallel `validFactions` array plus an `as unknown[]` cast that Array.isArray already narrows; tightened `ms.path` narrowing to `ms.path && ms.path.length >= 2`. Deliberately NOT introduced: an auto-init `if (!state.military.brigade_movement_state) state.military.brigade_movement_state = {};` guard in `correctTransitStates`, because the field is absent from `apr_1992_initial_save.json` and adding the idempotent init would have shifted the serialized save shape from `undefined` to `{}` on turn 0 — the two `non_null_assertions_index` escapes at the `delete state.military.brigade_movement_state![bid]` sites are preserved to keep byte-identity. No defaults, schema changes, random source changes, ordering changes, serialized output changes, or simulation behavior changes were introduced.

### Phase 3: Sim Engine - Early War + Bot

Files:
- `src/sim/bot/simple_general_bot.ts`
- `src/sim/early_war/alliance_update.ts`
- `src/sim/early_war/authority_degradation.ts`
- `src/sim/early_war/control_flip.ts`
- `src/sim/early_war/control_strain.ts`
- `src/sim/early_war/militia_emergence.ts`
- `src/sim/early_war/minority_erosion.ts`
- `src/sim/early_war/minority_militia_decay.ts`
- `src/sim/early_war/pool_population.ts`
- `src/sim/turn_phases/war_phases.ts`

Counts:
- `as_factionid_casts`: 18
- `as_unknown_casts`: 0
- `as_any_casts`: 3
- `non_null_assertions_dot`: 1
- `non_null_assertions_index`: 13

Stop-gate notes:
- `src/sim/early_war/alliance_update.ts` and `src/sim/turn_phases/war_phases.ts` are currently high-conflict because RBiH-HRHB and phase-pipeline lanes may be active.
- 2026-05-18 Batch 39 (first Phase 3 safe slice): cleaned 8 inventory-counted Phase 3 escapes by pure type-erasure/local-binding refactor across `src/sim/bot/simple_general_bot.ts` (5 `non_null_assertions_index` removed via local-const hoist; sub-records share object identity with the locals), `src/sim/early_war/authority_degradation.ts` (line 105: redundant `as FactionId` on `faction.id` where `FactionState.id: FactionId` already), `src/sim/early_war/control_strain.ts` (line 132: redundant `as FactionId[]` on already-typed `.map((f) => f.id).sort(strictCompare)`), and `src/sim/early_war/militia_emergence.ts` (line 157: same redundant-cast pattern). Three files now fully CLEAN; `control_strain.ts` partial (line 75 `Object.entries` return cast retained — load-bearing). Phase 3 remaining inventory: 27 escapes (was 35), concentrated in `Object.entries` / `Object.keys` narrowing patterns (`control_flip.ts:171,422`, `control_strain.ts:75`, `minority_erosion.ts:62,121,123-126`, `minority_militia_decay.ts:87` via `parseMilitiaPoolKey`, `pool_population.ts:217`) plus the still-forbidden `alliance_update.ts` + `war_phases.ts`. 40w n1915 hash `b14179d65639860c` matches baseline literally; `strict_null_inventory_progress.test.ts` 18/18 PASS incl. new Batch 39 slice assertion.
- 2026-05-19 Batch 40 (Phase 3 continuation): cleaned 6 more inventory-counted Phase 3 escapes (5 `as_factionid_casts` + 1 `non_null_assertions_index`) across `control_flip.ts` (line 171 `return best as FactionId | null` → `return best`; lines 419-422 `(state as GameState & {...}).political.war_consolidation_until = {}` + `state.political.war_consolidation_until![munId]` → local-binding `const consolidationMap = state.political.war_consolidation_until ?? {}; state.political.war_consolidation_until = consolidationMap; consolidationMap[munId] = ...`), `control_strain.ts` (line 75 `return entries[0]![0] as FactionId` → `return entries[0]![0]`), `minority_erosion.ts` (line 62 `return best as FactionId | null` → `return best`), `minority_militia_decay.ts` (line 87 `faction as FactionId` → `faction`), and `pool_population.ts` (line 217 `(Object.keys(byFaction) as FactionId[]).sort(strictCompare)` → `Object.keys(byFaction).sort(strictCompare)`). The bookkeeping `(state as GameState & {...})` cast at `control_flip.ts:419-420` is also gone as a side benefit but was not in the inventory regex. All five `as FactionId*` removals are no-ops under the current `FactionId = string` alias and document the tightening boundary for a future literal-union refactor. Four more files (control_flip, control_strain, minority_militia_decay, pool_population) are now fully CLEAN; `minority_erosion.ts` remains partial with 4 escapes at lines 121-126 deferred as a latent-bug cluster (`(state as any).war_militia_strength = {}` assigns to top-level `state.war_militia_strength` not `state.military.war_militia_strength`; the line-120 check is always false in practice because `militia_emergence.ts` runs first and initializes the field — runtime-behavior fix outside this lane). Phase 3 remaining inventory: 21 escapes (was 27). The Batch 40 implemented report's "27 → 19 / 8 eliminated" claim was an overcount; the correction (27 → 21 / 6 eliminated) is recorded in the Batch 41 implemented report. `npm.cmd run test:baselines` PASS ("Baseline regression: all scenarios match"); 40w/52w/baseline_ops_4w/noop_4w byte-identical to the Batch 39 floor. `strict_null_inventory_progress.test.ts` 19/19 PASS incl. new Batch 40 slice assertion.
- 2026-05-19 Batch 41 (Phase 4 opens): cleaned 13 inventory-counted Phase 4 escapes (12 `as_factionid_casts` + 1 `non_null_assertions_index`) across `combat_causality.ts:168` (cast on `corpsFormation?.faction ?? 'unknown'`), `oob_early_war_entry.ts` (lines 228, 291, 341 — `b.faction`, `b.faction`, and `(state.factions ?? []).map(f => f.id).sort(strictCompare)`), `initial_formations_loader.ts:88` (cast on `raw.faction.trim()` after `typeof === 'string'` guard), `oob_loader.ts` (lines 143, 172, 173, 258 — same `r.faction.trim()` / `r.recruit_pool_faction.trim()` pattern), `desktop_sim.ts:473` (cast on `formation.faction` after `!formation.faction` truthy-narrow; the mirror cast at line 543 inside a `/* ... */` retired-code block is deliberately preserved as out-of-scope dead-code-block residue), `scenario_runner.ts` (lines 981, 1291 — `Object.keys(...).sort()` and `bySettlementId` value), and `scenario_end_report.ts:968` (local-binding refactor `const ordersByFaction = a.orders_by_faction; if (ordersByFaction && ...) ordersByFaction[fid]` replaces `a.orders_by_faction![fid]` in a `.map` closure). All twelve `as FactionId*` removals are no-ops under the current `FactionId = string` alias. Two more files (`combat_causality.ts`, `oob_early_war_entry.ts`) are now fully CLEAN. Phase 4 remaining inventory: 40 escapes (was 53). The remaining Phase 4 escapes are all classified as load-bearing JSON-narrowing patterns (`as unknown[]` on `JSON.parse` outputs in `oob_loader.ts` × 6, `scenario_loader.ts` × 8, `brigade_temporal_emit.ts` × 5, `initial_formations_loader.ts` × 1) plus 2 `non_null_assertions_index` after length checks (`anomaly_detector.ts:151`, `scenario_end_report.ts:50`) whose refactor would change emitted JS shape, plus 1 dead-code-block FactionId cast in `desktop_sim.ts`. `npm.cmd run test:baselines` PASS; `strict_null_inventory_progress.test.ts` 20/20 PASS incl. new Batch 41 slice assertion; focused scenario/oob tests 43/43 PASS.

### Phase 4: Scenario + IPC

Files:
- `src/desktop/desktop_sim.ts`
- `src/scenario/anomaly_detector.ts`
- `src/scenario/brigade_temporal_emit.ts`
- `src/scenario/campaign_unlock.ts`
- `src/scenario/combat_causality.ts`
- `src/scenario/initial_formations_loader.ts`
- `src/scenario/oob_early_war_entry.ts`
- `src/scenario/oob_loader.ts`
- `src/scenario/scenario_end_report.ts`
- `src/scenario/scenario_loader.ts`
- `src/scenario/scenario_runner.ts`

Counts:
- `as_factionid_casts`: 13
- `as_unknown_casts`: 26
- `as_any_casts`: 5
- `non_null_assertions_dot`: 6
- `non_null_assertions_index`: 3

Stop-gate notes:
- Any loader default or save-migration change is a behavior/save migration concern. Record and escalate instead of silently defaulting.

### Phase 5: UI Adapter

Files:
- `src/ui/map/data/GameStateAdapter.ts`

Counts:
- `as_factionid_casts`: 2
- `as_unknown_casts`: 13
- `as_any_casts`: 53
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0

Stop-gate notes:
- Coordinate with the boundary cleanup lane before replacing adapter reads. This file is the renderer data chokepoint and should be touched once.

### Phase 6: Renderer + Warroom

Files:
- `src/ui/map/components/AiSettingsPanel.tsx`
- `src/ui/map/components/AutonomyPanel.tsx`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `src/ui/map/components/DiplomacyOverview.tsx`
- `src/ui/map/components/OperationHistoryPanel.tsx`
- `src/ui/map/components/SidePickerOverlay.tsx`
- `src/ui/map/components/SituationTab.tsx`
- `src/ui/map/components/VerdictScreen.tsx`
- `src/ui/map/components/army_hq/CommandRelationshipSection.tsx`
- `src/ui/map/components/army_hq/ForceReadiness.tsx`
- `src/ui/map/components/army_hq/SectorsSection.tsx`
- `src/ui/map/components/army_hq/SupplyIntelligence.tsx`
- `src/ui/map/components/chronicle/generateWrappedSlides.ts`
- `src/ui/map/components/icons/Icon.tsx`
- `src/ui/map/components/ops_modal/OpsMap.tsx`
- `src/ui/map/components/plan_ui/OpsMapRenderer.ts`
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts`
- `src/ui/map/map/builders/buildEthnicGeoJSON.ts`
- `src/ui/map/map/builders/buildPoliticalMetricGeoJSON.ts`
- `src/ui/map/map/builders/buildSupplyReachGeoJSON.ts`
- `src/ui/map/map/interactionLayerConfig.ts`
- `src/ui/warroom/ClickableRegionManager.ts`
- `src/ui/warroom/components/FactionOverviewPanel.ts`
- `src/ui/warroom/components/IvpBreakdownModal.ts`
- `src/ui/warroom/components/NewspaperModal.ts`
- `src/ui/warroom/components/ReportsModal.ts`
- `src/ui/warroom/components/warroom_utils.ts`
- `src/ui/warroom/data/war_data_extractor.ts`
- `src/ui/warroom/map_viewer_app.ts`
- `src/ui/warroom/warroom.ts`

Counts:
- `as_factionid_casts`: 10
- `as_unknown_casts`: 9
- `as_any_casts`: 34
- `non_null_assertions_dot`: 14
- `non_null_assertions_index`: 7

Stop-gate notes:
- UI files are intentionally last. Do not start while adapter and source contract phases remain open.

## Deferred Inventory Expansion

The baseline also finds strictness escapes in CLI, validation, map/data, additional state helpers, AI commander, negotiation, replay, event, and pressure modules. Those files are intentionally not migrated in this independent lane because the user requested inventory/baseline/phase-ledger work first and warned against broad source migrations during parallel agent activity.

Before any later source cleanup touches those files, this ledger must be expanded to assign each remaining inventory file to exactly one phase or a new approved follow-up phase.

## Source Migration Status

No source phase was completed in this lane. Current worktree status shows unrelated active edits in protected source areas (`supply`, `paramilitary`, `RBiH-HRHB`, `fatigue`, and turn pipeline files), so type-only source migration is deferred to avoid conflicts.
