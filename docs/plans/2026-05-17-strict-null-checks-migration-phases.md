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
| 2 | Sim engine - combat | 15 remaining after Batch 47 (0 `as_factionid_casts` in combat after closeout) | 0 | >5 for combat helpers and command state | HIGH | Safe-scope CLOSED 2026-05-18; FactionId-cast closeout slice CLOSED 2026-05-20 Batch 47 (paramilitary_sweep, sector_offensive, sector_building, supply_condition); long-tail still blocked (gated/load-bearing/save-shape/cross-file refactor) — see `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md` |
| 3 | Sim engine - early war + bot | 35 | 0 | >5 for turn pipeline / bot flow | MEDIUM | Inventory only; source deferred |
| 4 | Scenario + IPC | 53 | 0 | 3-5 for loader/runner/desktop seams | MEDIUM | Inventory only; source deferred |
| 5 | UI adapter | 0 remaining after 2026-05-22 adapter tail (was 63) | 0 | >5 renderer consumers | MEDIUM | Boundary-cleanup lane CLOSED 2026-05-22; former Batch 48 retained sites now route through adapter-local helpers and typed UI faction definitions |
| 6 | Renderer + warroom | 74 | 0 | UI-local repeated consumers | LOW | Inventory only; source deferred |

## 2026-05-22 Current Escape Floor / Optional GameState Contract Floor

The major counted strict-null escape lanes are closed, with a small retained `as unknown` boundary tail:

| Category | Count |
|---|---:|
| `as_factionid_casts` | 0 |
| `as_unknown_casts` | 3 |
| `as_any_casts` | 0 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| `optional_fields_game_state` | 486 |

The remaining lane is optional `GameState` contract/schema work. The guarded optional-field domain floor is:

| Domain | Count |
|---|---:|
| `sim` | 304 |
| `state` | 174 |
| `derived` | 8 |
| `scenario` | 0 |
| `ipc` | 0 |
| `ui_adapter` | 0 |
| `unknown` | 0 |

Guard: `tests/strict_null_inventory_progress.test.ts` pins the current counted escape floor and domain split; `tests/strict_null_inventory.test.ts` covers the `--field-domains` CLI surface. Report: `docs/40_reports/implemented/20260522_STRICT_NULL_OPTIONAL_GAMESTATE_CONTRACT_GUARD.md`.

Next strict-null source work must classify small owned optional-field groups by save/default/validator readiness before making any field required. Broad optional-field removal is forbidden.

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
- 2026-05-20 Batch 46 audit (remaining `as_factionid_casts` inventory): full classification of the 28 still-counted sites under the current `FactionId = string` alias. All are byte-identical no-ops at runtime; the cast removability question reduces to "does removing the literal `as FactionId` text keep the surrounding expression well-typed?" The classification below is the basis for Batch 46-state, Batch 46-loader, and the Batch 46-D decision packet.
  - **State safe slice (eligible for Batch 46-state):** 18 sites across `src/state/displacement.ts` (5), `src/state/displacement_takeover.ts` (8), `src/state/supply_reserves.ts` (5). All are either (a) `Object.keys(record) as FactionId[]` over a `Record<FactionId, ...>` / `Partial<Record<FactionId, ...>>` (line bindings then index back into the same record), (b) literal `['RBiH','RS','HRHB'] as FactionId[]` arrays where `CANONICAL_FACTIONS` is the canonical replacement, (c) `pc[osid] as FactionId | undefined` widenings of `Record<SettlementId, FactionId | null>` lookups guarded by truthy/equality checks, or (d) `factionId as FactionId` on values already typed as `string` after `typeof === 'string'` narrowing. None mutate save shape; none introduce default object initialization for optional fields.
  - **Loader tiny slice (eligible for Batch 46-loader):** 1 site. `src/sim/political/political_leader_data_loader.ts:151` casts a `string`-narrowed `p.faction` to call `CANONICAL_FACTIONS.includes(...)` — `readonly FactionId[]` accepts `string` directly under `FactionId = string`, so the cast drops cleanly without a guard change. A second candidate site, `src/sim/ai_commander/response_parser.ts:101`, casts a `JSON.parse`-derived `data.faction` (`unknown`) before an `?? 'RBiH'` default — that one is JSON schema validation territory (replacing the cast with a `typeof === 'string'` guard would change runtime semantics for non-string truthy LLM-derived values), so it is documented in the Batch 46-D decision packet and routed to a future LLM-response schema-validation lane rather than touched here.
  - **Combat / adapter / JSON-schema blocked (Batch 46-D decision packet):** 9 sites across `src/sim/combat/paramilitary_sweep.ts` (2), `src/sim/combat/sector_offensive.ts` (2), `src/sim/combat/sector_building.ts` (1), `src/sim/combat/supply_condition.ts` (1), `src/ui/map/data/GameStateAdapter.ts` (2), and `src/sim/ai_commander/response_parser.ts` (1). The combat/adapter casts are themselves trivial aliases under `FactionId = string`, but Phase 2 (`paramilitary_sweep`, `sector_offensive`, `sector_building`, `supply_condition`) is guarded by the existing Phase 2 stop-gate ("conflict-prone in current multi-agent lane; leave as ledger entries until parent lane confirms they are free") and Phase 5 (`GameStateAdapter`) is guarded by "renderer data chokepoint; touch once." The `response_parser.ts` site is `unknown→FactionId` JSON schema validation territory rather than a trivial alias and is routed to a future LLM-response schema lane. For Batch 46 these nine sites are deliberately left in place — they require an explicit Phase 2 / Phase 5 / LLM-schema unlock from the parent lane owner before this lane edits them.
  - **Save-shape risk:** none. The classification above does not require any optional-field promotion, default-init insertion, or migration write. The Batch 46-state and Batch 46-loader slices are pure text-level alias removal plus one `typeof === 'string'` narrow.
- 2026-05-20 Batch 46-loader implementation: cleaned 1 inventory-counted `as_factionid_casts` in `src/sim/political/political_leader_data_loader.ts:151`. The cast was on a `p.faction` value already narrowed to `string` by the immediately preceding `typeof p.faction !== 'string'` guard, and the local `CANONICAL_FACTIONS: readonly FactionId[]` accepts `string` directly under `FactionId = string` — `.includes(p.faction)` typechecks without a cast. `tests/b2_political_leader_data.test.ts` 20/20 PASS. `src/sim/ai_commander/response_parser.ts:101` (`(data.faction as FactionId) ?? 'RBiH'` on `unknown` JSON-derived input) was **NOT** touched in this batch: that cast performs `unknown → FactionId` widening, not literal-union narrowing — replacing it with a `typeof === 'string'` guard would change runtime semantics for non-string truthy LLM-derived values (number/object would fall back to 'RBiH' under the guard, but pass through under the cast + `??`). Per the Batch C stop-gate ("JSON schema validation work — stop and document"), it is documented here and routed to a future LLM-response schema-validation lane that owns the wider AI-commander `unknown→typed` boundary along with neighbouring sites in `response_parser.ts` (e.g. `data.operation_plan as CorpsDecision['operation_plan']`, `data.brigade_movements as CorpsDecision['brigade_movements']`, `data.context_type as AdvisorResponse['context_type']`).
- 2026-05-20 Batch 46-D decision packet: deliberately NOT touched in this lane, with future-owner notes.
  - `src/sim/combat/paramilitary_sweep.ts` (2 sites, lines 113 + 592): each is trivially redundant under `FactionId = string` (`f.faction` is already `FactionId` from `FormationState`; `pc[targetOsid]` returns `FactionId | null` from `Record<SettlementId, FactionId | null>`). The Phase 2 stop-gate explicitly names this file as conflict-prone (paramilitary lane) — handed off to the Phase 2 closeout owner alongside the other Phase 2 long-tail.
  - `src/sim/combat/sector_offensive.ts` (2 sites, lines 698 + 1140): each is trivially redundant (`(corps?.faction ?? 'RS') as FactionId` where `corps.faction: FactionId` and `'RS'` is a literal `FactionId` value). Owned by the Phase 2 closeout owner; multiple active Phase 2 / operations-lane consumers makes this file's edit window narrow.
  - `src/sim/combat/sector_building.ts` (1 site, line 563): `[...allOpposingFactions].sort(strictCompare) as FactionId[]` where `allOpposingFactions: Set<string>`. Trivially redundant under `FactionId = string`. Owned by the Phase 2 closeout owner.
  - `src/sim/combat/supply_condition.ts` (1 site, line 46): `factionEntry.faction_id as FactionId` where `faction_id: string` per `SupplyReservesFactionEntry`. Trivially redundant. Owned by the Phase 2 closeout owner; the supply-related combat sub-cluster has the conflict-prone label per the Phase 2 stop-gate notes.
  - `src/ui/map/data/GameStateAdapter.ts` (2 sites, lines 1842 + 1863): `enclaveDef?.faction as FactionId | undefined` where `enclaveDef.faction: string` per the local `ENCLAVE_UI_DEFINITIONS` array literal. Trivially redundant under `FactionId = string`. The Phase 5 stop-gate explicitly says "renderer data chokepoint; touch once," so these two casts wait for the Phase 5 sweep that also covers the other 61 escapes in this file.

- 2026-05-20 Batch 46-state implementation: cleaned 18 inventory-counted `as_factionid_casts` across `src/state/displacement.ts` (5 → 0), `src/state/displacement_takeover.ts` (8 → 0), and `src/state/supply_reserves.ts` (5 → 0). Replacements followed three patterns: (a) `['RBiH', 'RS', 'HRHB'] as FactionId[]` literal arrays → `CANONICAL_FACTIONS` (newly imported in `displacement.ts`); (b) `Object.keys(record) as FactionId[]` / `value as FactionId` / `fid as FactionId` redundant alias casts → bare identifier under `FactionId = string`; (c) `pc[osid] as FactionId | undefined` / `pc[externalSid] as FactionId | undefined` widenings of `Record<SettlementId, FactionId | null>` lookups → bare `pc?.[osid]` lookups where downstream truthy guards already narrow `null | undefined` away before the value is used as `FactionId`. No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced. Phase 1 escape hatches drop from 25 to 15 (state-file `as_factionid_casts` from 10 to 0; the 8 `non_null_assertions_index` in `supply_reserves.ts` and 2 in `displacement.ts` and the 5 `as_unknown` / 2 `as_any` in `serialize.ts` + `validateGameState.ts` are out-of-scope save-shape sites). `displacement_takeover.ts` is not yet in the Phase 1 file list — it is classified as state-namespace adjacent and should be folded into Phase 1 by a future ledger expansion before any further inventory accounting changes its membership.

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
- 2026-05-20 Batch 47 Phase 2 combat closeout: cleaned the six `as_factionid_casts` enumerated in the Batch 46-D decision packet across `src/sim/combat/paramilitary_sweep.ts` (lines 113 + 592), `src/sim/combat/sector_offensive.ts` (lines 698 + 1140), `src/sim/combat/sector_building.ts` (line 563), and `src/sim/combat/supply_condition.ts` (line 46). Replacements followed three patterns: (a) bare-identifier removal where the value is already typed as `FactionId` — `f.faction as FactionId` → `f.faction` (paramilitary_sweep:113), `factionEntry.faction_id as FactionId` → `factionEntry.faction_id` (supply_condition:46); (b) `Record<SettlementId, FactionId | null>` lookup-narrowing — `pc[targetOsid] as FactionId | undefined` → `pc[targetOsid]`, downstream truthy guard `if (previousController && previousController !== f.faction)` narrows `FactionId | null | undefined` → `FactionId` before `seedDisplacementTimerOnFlip(state, targetOsid, previousController, f.faction)` (paramilitary_sweep:592); (c) `(corps?.faction ?? 'RS') as FactionId` → `const faction: FactionId = corps?.faction ?? 'RS'` declaration-type-annotation pattern matching the Batch 19 `(formation.faction as string) || 'RBiH'` → `formation.faction || 'RBiH'` typed `: FactionId` precedent (sector_offensive:698 + 1140); plus a bare-removal `[...allOpposingFactions].sort(strictCompare) as FactionId[]` → `[...allOpposingFactions].sort(strictCompare)` over a `Set<string>` sorted-array assigned to a `FactionId[]` field (sector_building:563). All six removals are no-ops at runtime under the current `type FactionId = string` alias (`src/state/game_state.ts:45`). Top-level `as_factionid_casts` total drops from 9 (Batch 46 floor) to 3 — the residual 3 are exactly the Batch 46-D decision-packet sites left as ledger entries: `src/ui/map/data/GameStateAdapter.ts` × 2 (Phase 5 stop-gate: "renderer data chokepoint; touch once") and `src/sim/ai_commander/response_parser.ts` × 1 (LLM-response JSON-schema validation lane: `unknown→FactionId` widening on `data.faction` is not a trivial alias removal because replacing with a `typeof === 'string'` guard would change runtime semantics for non-string truthy LLM-derived values). Added `PHASE_2_COMBAT_BATCH_47_FILES` constant + a focused "cleans the Batch 47 Phase 2 combat closeout FactionId-cast slice" assertion to `tests/strict_null_inventory_progress.test.ts`, restricted to the `as_factionid_casts` category only (the four files retain other inventory categories — combat-specific `as_unknown_casts`, `as_any_casts`, `non_null_assertions_*` — that are still load-bearing per the Phase 2 long-tail classification, analogous to the Batch 45 / Batch 46 war_phases / state precedent). `npm.cmd run typecheck` PASS; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 26/26 PASS (was 25/25, +Batch 47); focused combat tests across `paramilitary_sweep.test.ts`, `sector_offensive*.test.ts`, `sector_partition_buildCorpsFrontSectors_integration.test.ts`, `combat_supply_pressure.test.ts`, `supply_pressure_vs_condition_reconciliation.test.ts`, `exhaustion_gate_sector_offensive.test.ts`, `sector_counter_attack.test.ts` 134/134 PASS; `npm.cmd run test:baselines` PASS ("Baseline regression: all scenarios match"). 40w/52w/baseline_ops_4w/noop_4w byte-identical floor preserved.
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

Counts (post-Batch-48):
- `as_factionid_casts`: 2 (was 2; both retained as UI-literal-union-shadowing — see Batch 48 narrative)
- `as_unknown_casts`: 0 (was 13)
- `as_any_casts`: 8 (was 48)
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0
- **Total escapes**: 10 (was 63) — closeout of the boundary-cleanup lane.

Stop-gate notes:
- Coordinate with the boundary cleanup lane before replacing adapter reads. This file is the renderer data chokepoint and should be touched once.
- 2026-05-20 Batch 48 Phase 5 boundary cleanup CLOSED: removed 53 inventory-counted escapes (2 `as_factionid_casts` mistakenly classified in Batch 46-D as redundant under engine `FactionId = string` were NOT removable — see UI-literal-union finding below; 13 `as_unknown_casts` cleaned; 40 of 48 `as_any_casts` cleaned). All edits are pure type-erasure or local-cast-tightening under behavior-preserving constraints: `state: any` upstream of these accessors means downstream `... as any | undefined` widenings were redundant alias removals; `as unknown[]` casts inside `Array.isArray(...)` truthy branches were tightening-removals that left `any[]` (no runtime change); 4 `state.X.Y as any | undefined` widenings on `Record<string, unknown>`-typed fields were tightened to typed casts (`as Record<string, unknown>`, `as { ... } | undefined`) that no longer match the inventory regex. The `state as unknown as GameState` double-cast at L834/L839 was simplified to a single `state as GameState` cast (no inventory hit). The 1 `(state as any).opsec_sectors` redundant cast was removed since `state` is already `any`. The 10 retained sites are:
  - **L401** `let state = json as any;` — JSON entry boundary chokepoint. `parseGameState(json: unknown, ...)` accepts external IPC/save payloads as `unknown`; the `as any` cast is the documented one-step widening into the parsing function's free-form access pattern. Tightening to `as Record<string, unknown>` would require ~200 downstream `typeof` guards.
  - **L551** `const ops = f.ops as any | undefined;` — `f: Record<string, unknown>` from `formationsRecord`; `f.ops: unknown`. The `as any | undefined` widening enables downstream `ops?.fatigue`, `ops?.doctrine`, etc. without per-property `typeof` narrowing. Tightening to `as { fatigue?: number; doctrine?: number; readiness?: number; ... } | undefined` would require enumerating the FormationView ops shape at the read boundary — out of scope (would require a contract change to `GameState.military.formations[id].ops`).
  - **L607** `const rawCS = f.combat_summary as any | undefined;` — Same pattern; downstream reads 14+ fields off `rawCS`. Tightening would require a typed `CombatSummary` shape declaration at the read boundary.
  - **L665** `const bh = (f.brigade_history as any | undefined) ?? brigadeHistoryRecord?.[id];` — Same pattern; combines two `Record<string, unknown>`-sourced lookups. Downstream reads 10+ fields off `bh`.
  - **L736** `const bh = (f.brigade_history as any | undefined) ?? brigadeHistoryRecord?.[id];` — Mirror site of L665 in the brigade fallback summary computation. Same Record-widening pattern, same retain rationale.
  - **L934** `const activeOps = (Array.isArray(cc?.active_operations) ? cc.active_operations : cc?.active_operation ? [cc.active_operation] : []) as any[];` — Multi-branch ternary joining a (potentially narrowed) array branch + a `[singleton]` branch + `[]`. Without the `as any[]` widening, TS unions the branch types to `(any[] | unknown[] | never[])` and downstream `for (const op of activeOps)` plus `op.name`, `op.type`, etc. lose typing. Tightening would require enumerating the CorpsOperation shape inline.
  - **L2278** `const opsArray = (Array.isArray(cmd?.active_operations) ? cmd.active_operations : cmd?.active_operation ? [cmd.active_operation] : []) as any[];` — Mirror site of L934 inside `deriveActiveOperations`. Same multi-branch ternary pattern, same retain rationale.
  - **L2916** `return compareToHistorical(ledger, historicalBaseline as any);` — `historicalBaseline` is the resolved type of a `JSON.parse` of `data/reference/historical_baseline.json` (via `resolveJsonModule`). `compareToHistorical` expects `HistoricalBaseline` (from `src/state/negotiation_types.ts`). The JSON literal type may not structurally match the interface (e.g., optional vs required fields, milestone array element typing); the `as any` widening bypasses the boundary. Tightening would require either schema-validating the JSON at load time (runtime behavior change) or tightening `HistoricalBaseline` to be a supertype of the JSON literal.
  - **L1842, L1863** `faction: enclaveDef?.faction as FactionId | undefined,` — **UI-local literal-union `FactionId` shadows the engine `FactionId = string`.** `src/ui/map/data/types.ts:8` declares `export type FactionId = 'RS' | 'RBiH' | 'HRHB' | null;` (literal union, includes `null`). `GameStateAdapter.ts` imports `FactionId` from `./types.js` (UI type), NOT from `state/game_state.ts` (engine type). The Batch 46-D decision packet incorrectly classified these two sites as "trivially redundant under `FactionId = string`" — that reasoning applied to the ENGINE type but the SHADOWED UI literal-union requires the cast because `enclaveDef.faction: string` (from `ENCLAVE_UI_DEFINITIONS[i].faction: string`) does not structurally match the literal union without `as FactionId | undefined`. These two casts are RETAINED until either (a) the UI literal-union `FactionId` is unified with the engine `FactionId = string` (a contract decision spanning the renderer-engine boundary) or (b) `ENCLAVE_UI_DEFINITIONS[i].faction` is typed as the UI literal-union directly at its declaration site. Both options are out of scope for Batch 48's behavior-preserving constraint.

  **UI-literal-union FactionId finding:** This shadowing was not documented in prior strict-null batches and is the root cause for why L1842/L1863 could not be cleaned. Future strict-null sweeps that encounter a `FactionId` import must first verify whether it resolves to `state/game_state.ts:45` (engine, `= string`) or `src/ui/map/data/types.ts:8` (UI, literal union) before classifying as "trivially redundant." Added to `docs/PROJECT_LEDGER_KNOWLEDGE.md` as a reusable process rule.

  **Behavior-preserving refactors applied in Batch 48 (no `as any`/`as unknown` cleanup, behavior re-shaping only):**
  - L1112 `(state.political.control_events as unknown[]) ?? []` → `const rawControlEvents: unknown[] = Array.isArray(state.political.control_events) ? state.political.control_events : [];` — Restructured to an explicit `Array.isArray` guard with an `unknown[]` annotation. The chain after this no longer needs an `as unknown[]` cast. Behavior on non-array truthy inputs differs: original `(non-array as unknown[]).map(...)` would have thrown at runtime; new code returns `[]`. In practice control_events is always either an array or null/undefined (engine pushes to it as an array), so the edge case does not fire in any save the renderer consumes.
  - L1589 `Object.entries(rawArrived as any).sort(...)` → `Object.entries(rawArrived as Record<string, unknown>).sort(...)` — Tightened cast preserves runtime semantics; `Object.entries(unknown)` is rejected by TS but `Object.entries(Record<string, unknown>)` returns `[string, unknown][]` with the same runtime call.
  - L2304 `((a as any).attack_attempt_count as number ?? 0)` → `((a as { attack_attempt_count?: number }).attack_attempt_count ?? 0)` — Tightened cast preserves runtime semantics; the `as number` middle cast was a type-only assertion that did not change runtime behavior, only TS narrowing. The new cast yields `number | undefined`, then `?? 0` produces `number` — identical runtime behavior.
  - L2706/L2730 `const fd = factionDims as any;` + `if (!fd || typeof fd !== 'object') continue;` → `if (!factionDims || typeof factionDims !== 'object') continue; const fd = factionDims as Record<string, unknown>;` (similar at L2730 with `Record<string, Record<string, unknown> | undefined>` for the negotiating-capital nested access). Restructured the guard ordering so the typeof narrowing applies before the cast. Behavior-preserving: the guard runtime semantics are identical (both skip when value is null/undefined/non-object); only the TS-level narrowing path changes.
  - L2747 `const r = rel as any;` → `const r = rel as { override_authority?: unknown } | null | undefined;` — Tightened cast preserves runtime semantics; downstream `typeof r.override_authority === 'number'` narrows.

  **Categories of edits applied (40 of 48 `as_any_casts` cleaned):**
  - 22 sites: redundant `as any | undefined` / `as any[] | undefined` on `state.path.field` where `state: any` is the parseGameState-local declaration (L407, L412, L434, L689, L690, L714 [`(f as any)`], L730 [×2 `(f as any)`], L1133, L1146, L1186, L1244, L1253, L1255, L1272, L1275, L1314, L1361, L1409, L1479, L1828, L1846, L2056, L2266, L2339, L2342, L2408, L2438, L2588, L2706, L2710, L2730, L2734, L2747, L2869, L1699 [redundant `(state as any)`]) — bare access yields the same `any` type without the cast.
  - 13 sites: `as unknown[]` removals (L527, L737, L834, L839, L1112, L1198, L1698, L1700, L1701, L1715, L1718, L1721, L2327) — either via `Array.isArray`-guard restructure (L1112) or pure cast removal in narrow truthy branches (others, where TS narrows the unknown to `any[]`).
  - 5 sites: behavior-preserving cast tightening to typed shapes (L1114, L1589, L2304, L2706/2730 cluster, L2747) — replaces `as any` with `as Record<string, unknown>` / `as { field?: T }` / etc. that does not match the inventory regex.

**Coordinator note:** Batch 48 is the single coordinated boundary-cleanup wave the Phase 5 stop-gate called for. Future strict-null work on this file is gated by either (a) GameState schema tightening that would let the 4 Record-widening sites (L551/607/665/736) drop their `as any | undefined` widenings, or (b) UI/engine FactionId unification that would let the 2 literal-union casts (L1842/L1863) drop, or (c) JSON-schema validation for `historicalBaseline` (L2916) and parseGameState's external input (L401). None of those are pure cleanup tasks — each requires a coordinated contract decision.

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
- 2026-05-19 Batch 42 (Phase 6 warroom safe slice): cleaned 13 inventory-counted Phase 6 escapes (10 `as_factionid_casts` + 1 `as_any_casts` + 2 `non_null_assertions_dot`) across `src/ui/warroom/ClickableRegionManager.ts:604` (cast on `getPlayerFaction(state)`), `src/ui/warroom/components/FactionOverviewPanel.ts:229` (cast on `snap.factionId`), `src/ui/warroom/components/IvpBreakdownModal.ts:35` (cast on `getPlayerFaction(this.gameState)`), `src/ui/warroom/components/NewspaperModal.ts:162,290,293` (2 `as FactionId` + 1 `as any` on `content.factionId`), `src/ui/warroom/components/ReportsModal.ts:373,374` (2 casts on `content.factionId`), `src/ui/warroom/components/warroom_utils.ts:220` (cast on `requirePlayerFaction(...)` return; the literal-union `CanonicalPlayerFaction` widens automatically to `FactionId = string`), `src/ui/warroom/data/war_data_extractor.ts:861` (redundant `| null | undefined` cast where TS already infers the same type from `Record<SettlementId, FactionId | null>?` lookup), `src/ui/warroom/warroom.ts:401` (cast on DOM `btn.dataset.faction: string | undefined`), and `src/ui/map/components/AutonomyPanel.tsx:148-150` (JSX ternary refactored from `{resolved ? ... statusIndicator!.cls ... statusIndicator!.label ...}` to `{statusIndicator ? ... statusIndicator.cls ... statusIndicator.label ...}` — same branch behavior, TS narrows natively from the value-object truthy check). Six files now fully CLEAN for the inventory regex: FactionOverviewPanel.ts, IvpBreakdownModal.ts, NewspaperModal.ts, ReportsModal.ts, warroom_utils.ts, war_data_extractor.ts. **Phase 5 (`GameStateAdapter.ts` — 63 escapes) is deliberately skipped this wave per the plan stop-gate ("This file is the renderer data chokepoint and should be touched once").** Phase 6 remaining inventory: 61 escapes (was 74). `npx tsc --noEmit` PASS; 21/21 strict-null progress tests PASS incl. new Batch 42 slice; 91/91 focused warroom tests PASS; `npm.cmd run desktop:map:build` PASS. `npm.cmd run test:baselines` not re-run for this batch because the touched files are pure UI/warroom components that do not participate in scenario simulation; the Batch 41 baselines run remains the active byte-identity floor.

## Deferred Inventory Expansion

The baseline also finds strictness escapes in CLI, validation, map/data, additional state helpers, AI commander, negotiation, replay, event, and pressure modules. Those files are intentionally not migrated in this independent lane because the user requested inventory/baseline/phase-ledger work first and warned against broad source migrations during parallel agent activity.

Before any later source cleanup touches those files, this ledger must be expanded to assign each remaining inventory file to exactly one phase or a new approved follow-up phase.

### Batch 49: AI Commander Response Parser Schema Validation (2026-05-20)

Files:
- `src/sim/ai_commander/response_parser.ts`

Pre-Batch-49 inventory counts (file-local):
- `as_factionid_casts`: 1 (line 101, `(data.faction as FactionId) ?? 'RBiH'` in `parseAdvisorResponse`)
- `non_null_assertions_dot`: 1 (line 43, `d!.stance` in `parseArmyResponse` corps_directives loop)
- Non-counted same-shape schema casts: `data.operation_plan as CorpsDecision['operation_plan']`, `data.brigade_movements as CorpsDecision['brigade_movements']`, `data.reserve_deployment as ArmyDecision['reserve_deployment']`, `data.context_type as AdvisorResponse['context_type']`, plus `Record<string, unknown>` directive/sector_stances widenings and `as string[]` / `as 'accept' | 'reject'` literal-union narrowings.

Post-Batch-49 inventory counts (file-local):
- `as_factionid_casts`: 0
- `non_null_assertions_dot`: 0
- Remaining non-counted schema casts: unchanged from the pre-batch list except for the `data.context_type` widening, which was also replaced by a `parseAdvisorContextType` helper in the same wave (the cast was not in the inventory regex but sits on the same `unknown → typed` schema boundary; cleaning it here keeps the helper API symmetric).

Implementation:
- Added two narrow helpers near the existing `VALID_STANCES` / `VALID_SECTOR_STANCES` sets: `parseFactionId(value: unknown, fallback: FactionId): FactionId` requires both `typeof === 'string'` and `CANONICAL_FACTIONS.includes(value)`; `parseAdvisorContextType(value: unknown): AdvisorResponse['context_type']` requires both `typeof === 'string'` and `VALID_ADVISOR_CONTEXT_TYPES.has(value)` against the three literal context-type strings declared in `src/sim/ai_commander/ai_types.ts:86` (`'situation_analysis' | 'operation_planning' | 'peace_plan'`).
- Promoted the `FactionId` import to a value+type import (`CANONICAL_FACTIONS, type FactionId`) from `src/state/game_state.ts`.
- `parseAdvisorResponse(...)`: replaced `(data.faction as FactionId) ?? 'RBiH'` with `parseFactionId(data.faction, 'RBiH')`; replaced `(data.context_type as AdvisorResponse['context_type']) ?? 'situation_analysis'` with `parseAdvisorContextType(data.context_type)`.
- `parseArmyResponse(...)` corps_directives loop: hoisted `d?.stance` to a `rawStance` local with `typeof === 'string' && VALID_STANCES.has(rawStance)` narrowing; the `d!.stance` non-null assertion drops because the typeof narrowing makes the conditional branch type `string` directly.

Fallback-semantics narrowing (documented contract change for invalid LLM input):
- For *valid* LLM inputs (canonical-string `faction`, valid `context_type`) the parser output is byte-identical to the pre-Batch-49 behavior.
- For *invalid* inputs the contract narrows: non-canonical strings (e.g. `'NATO'`) and non-string truthy values (e.g. `42`, `{...}`) on `data.faction` now fall back to the supplied default (`'RBiH'` for `parseAdvisorResponse`) instead of being passed through the cast as a type lie. Identical narrowing applies to `data.context_type` (non-canonical strings fall back to `'situation_analysis'`).
- Safe at every downstream consumer because `getAdvisorRecommendation` (`src/sim/ai_commander/player_advisor.ts:35`) supplies its own caller-side `faction: FactionId` parameter to `logDecision`; the parsed advisor `faction` is informational metadata returned in the response object, not a sim-state mutation key. UI consumers benefit from the canonical-only guarantee.

Stop-gate notes:
- The parser remains the AI commander JSON boundary. Future Batch 50+ continuation passes can fold `data.operation_plan`, `data.brigade_movements`, `data.reserve_deployment`, sector stance iteration, and recommendation iteration into shared `typeof === 'string' && VALID_SET.has(value)` helpers, but those changes touch `unknown → object` boundaries that are out of scope for the visible `as FactionId` closeout this batch delivers.
- No prompt format change. No AI commander behavior tuning. No `parseCorpsResponse` operation-plan schema redesign. No `GameStateAdapter.ts`, combat files, save fixtures, or scenario harness touched.

`tests/ai_commander_parser.test.ts` extended from 8 → 14 tests with the six new fallback-semantics tests (missing/non-canonical-string/non-string-truthy faction; missing/invalid context_type; preserved valid `operation_planning`/`peace_plan` context types). `tests/strict_null_inventory_progress.test.ts` extended from 27 → 28 tests with a Batch 49 slice assertion. Repo-wide `as_factionid_casts` floor drops from 3 → 2; the residual 2 are exactly the two retained Batch 48 `enclaveDef?.faction as FactionId | undefined` UI-literal-union casts in `src/ui/map/data/GameStateAdapter.ts` (lines 1842, 1863), gated by the UI/engine FactionId-unification stop-gate documented in the Batch 48 narrative.

`npm.cmd run typecheck` PASS; `npx.cmd vitest run tests/ai_commander_parser.test.ts --reporter=dot` 14/14 PASS; `npx.cmd vitest run tests/ai_commander_parser.test.ts tests/ai_commander_validation.test.ts tests/ai_commander_event_decision.test.ts tests/ai_commander_ipc.test.ts tests/ai_commander_prompt.test.ts --reporter=dot` 72/72 PASS broader AI commander surface check; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 28/28 PASS. `npm.cmd run test:baselines` not re-run: the parser is consumed by the AI commander integration path (advisor button click + AI commander turn invocation); the baseline scenario runner uses formula bots and does not exercise the parser at all. The Batch 47/48 baselines floor remains the active byte-identity reference.

### Batch 50: UI-only trivial alias / JSX truthy-narrowing — Batch A closeout (2026-05-20)

Executes Batch A from `docs/40_reports/audits/20260520_STRICT_NULL_POST_FACTIONID_CLASSIFICATION.md` §7. Eight UI-only files cleaned:

- `src/ui/map/components/CorpsFrontPanel.tsx` — `_sector ? collectSectorFriendlyOsids(_sector, loadedGameState!.frontEdgesOsid) : []` → `(_sector && loadedGameState) ? collectSectorFriendlyOsids(_sector, loadedGameState.frontEdgesOsid) : []`. `_sector` non-null already implies `loadedGameState` non-null (since `findPlayerFacingSectorById(state, id)` returns null when state is null), so the explicit `&& loadedGameState` is a TS-only truthy-narrow with no runtime semantic change.
- `src/ui/map/components/OperationHistoryPanel.tsx` — JSX predicate `(op.objectives_logged_captured?.length ?? 0) > 0` → `op.objectives_logged_captured && op.objectives_logged_captured.length > 0`. TS now narrows the array reference itself into the truthy branch so the subsequent `.map(...)` is type-safe without `!`.
- `src/ui/map/components/army_hq/CommandRelationshipSection.tsx` — replaced `hasDelegationNotice = delegationSummary?.summaryLabel != null` predicate-variable with `delegationSummaryLabel = delegationSummary?.summaryLabel ?? null` value-binding; silence check switched from `!hasDelegationNotice` to `delegationSummaryLabel === null`; JSX gate switched from `{hasDelegationNotice && (... delegationSummary!.summaryLabel ...)}` to `{delegationSummaryLabel !== null && (... delegationSummaryLabel ...)}`. Same boolean truth value; carries the narrowed string into the JSX.
- `src/ui/map/components/army_hq/SectorsSection.tsx` — removed intermediate boolean alias `stanceMismatch = stanceHint !== null && stanceHint !== currentStance`; inlined the predicate at the JSX gate so TS narrows `stanceHint` to non-null directly. `{stanceHint!.toUpperCase()}` → `{stanceHint.toUpperCase()}`.
- `src/ui/map/components/chronicle/generateWrappedSlides.ts` — hoisted `internationalStandingDetail` local binding above the `slides.push({...})` literal with `internationalStanding && intlValue != null` narrowing both. Three `internationalStanding!.base_value` / `internationalStanding!.event_modifier` sites collapse into one narrowed branch; `detail: internationalStandingDetail` in the slides literal. `intlValue != null` already implies `internationalStanding` non-null (since `intlValue = internationalStanding?.effective_value`), so the explicit `internationalStanding && ` guard is a TS-only narrow with no runtime semantic change.
- `src/ui/map/map/builders/buildEthnicGeoJSON.ts` — three `departedByOsid![osid]` / `displacementByMun![munId]` index sites converted to optional chaining (`departedByOsid?.[osid] ?? {}`, `displacementByMun?.[munId]`). Inside `if (hasDepartures && munEthnicTotals)` and `else if (hasDisplacement)` branches the params are guaranteed truthy per the line-127 invariant; optional chaining is a TS-only safety with no runtime semantic change.
- `src/ui/map/map/builders/buildPoliticalMetricGeoJSON.ts` — hoisted `metricsByOsid: Record<string, PoliticalMetricView> = args.politicalMetricsByOsid ?? {}` typed local at the top of the function; `args.politicalMetricsByOsid![osid]` (inventory-counted) and the inner `.filter` predicate access both rewritten against the typed local. The non-inventory-counted `featuresByOsid.get(osid)!` and `metrics[args.metric]!` remain (post-`]` `!`, not identifier-prefixed, out of the strict-null regex scope).
- `src/ui/map/map/builders/buildSupplyReachGeoJSON.ts` — same pattern. `supplyStateByOsid: Record<string, SupplyReachClass> = args.supplyStateByOsid ?? {}` hoisted; `args.supplyStateByOsid![osid]` rewritten against the typed local.

Inventory delta confirmed against `node tools/diagnostics/strict_null_inventory.cjs`:

| Category | Pre-Batch-50 | Post-Batch-50 | Δ |
|---|---:|---:|---:|
| `as_factionid_casts` | 2 | 2 | 0 |
| `as_unknown_casts` | 80 | 80 | 0 |
| `as_any_casts` | 319 | 319 | 0 |
| `non_null_assertions_dot` | 39 | 32 | −7 |
| `non_null_assertions_index` | 43 | 38 | −5 |
| `optional_fields_game_state` | 463 | 463 | 0 |

All deltas match the Batch A audit prediction exactly.

`tests/strict_null_inventory_progress.test.ts` cap (Phase 1 ≤ 25 escapes) re-verified at 28/28 PASS. No new per-batch slice assertion added: Batch A is the UI-only trivial-alias lane; the pinned 39/43 ceiling is captured by the broader categorical floor in the existing audit's expected-delta table, and the per-file `non_null_assertions_*` counts on the eight touched files all drop to zero post-cleanup (verifiable by file-grouped slice if a future regression check is wanted).

`npm.cmd run typecheck` PASS; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 28/28 PASS; focused vitest run of `command_authority_explanation_delegation`, `ui/accessibility_form_labels`, `ui/command_relationship_campaign_drag_proof`, `ui_map_political_metrics`, `ui_map_supply_reach`, `ui_opord_player_safe_labels`, `v093_a11y_lane_c_warroom_decision_room`, `wrapped_slides` 118/118 PASS; `npm.cmd run desktop:map:build` PASS (3.56 MB JS bundle, 186 kB CSS); `git diff --check` clean. `npm.cmd run test:baselines` NOT run — Batch A is UI-only (read-only render-model consumers and GeoJSON view builders, no sim path, no GameState writes, no scenario data, no save schema), so the Batch 47/48 baselines floor remains the active byte-identity reference per the audit's "Baselines not required (UI-only, no sim path)" stop-gate.

### Batch 51: Sim runtime-invariant cleanup — Batch B closeout (2026-05-20)

Executes Batch B from `docs/40_reports/audits/20260520_STRICT_NULL_POST_FACTIONID_CLASSIFICATION.md` §7 and §5 (the 15-site `runtime-invariant` + 6-site `trivial-alias after guard` classification for `non_null_assertions_dot`). Eight sim/scenario files cleaned via local-binding refactor (Batch 19 / Batch 41 precedent) and one non-null typed alias for a flag-gated module-local:

- `src/sim/combat/corps_front_sectors.ts` (7 dot) — five `nodeProcess!.hrtime.bigint()` / `nodeProcess!.cwd()` sites under the `SECTOR_PARTITION_PERF_FLAG` perf instrumentation collapsed to a new module-local non-null alias `perfNodeProcess: NodeJS.Process = nodeProcess ?? ({} as NodeJS.Process)`. The flag derivation `nodeProcess?.env?.PERF_PROFILE_SECTOR_PARTITION === 'true'` already requires `nodeProcess` to be defined when the flag is true; `perfNodeProcess` captures the same reference under a non-null type for use inside flag-gated code. In browser builds where `nodeProcess` is undefined the flag is false and `perfNodeProcess` is never read (the `{} as NodeJS.Process` placeholder is unreachable). The nullable `nodeProcess` retains its existing role for non-perf optional reads (`nodeProcess?.env?.SECTOR_COLDSTART_CACHE_DISABLED`); singular ownership preserved. The two non-perf sites also closed: `winnerEntry!.piece.edge_ids.filter(...)` (inside an arrow callback that loses narrowing across `.filter(...)`) hoisted to `const winnerPiece = winnerEntry.piece;` after the existing `if (!winnerEntry) continue;` guard; `formations[brigadeId]!.elite_loan_state!.loaned_to_corps` (chained optional-truthy-but-not-narrowed access) hoisted to `const loanState = formations[brigadeId]?.elite_loan_state;` with `loanState?.on_loan && loanState.loaned_to_corps` truthy-narrowing the ternary branch.
- `src/sim/combat/sector_offensive.ts` (2 dot) — `op.axes!.reduce(...)` in `getTotalObjectiveCount(op)` rewritten as `const axes = op.axes; if (Array.isArray(axes) && axes.length > 0) return axes.reduce(...)`. The inline check is exactly what `isMultiAxis(op)` returns (`Array.isArray(op.axes) && op.axes.length > 0`), so runtime semantics are byte-identical; `isMultiAxis` remains in use at the other `op.axes!` site on the same line above (which is `!,` postfix not `!.` dot, out of regex scope). `op.active_probe!.started_turn` after `hasUnresolvedProbe(op)` (which checks `op.active_probe !== undefined && !op.active_probe.resolved`, returns `boolean`, no type guard) hoisted to `const activeProbe = op.active_probe; if (hasUnresolvedProbe(op) && activeProbe && (turn - activeProbe.started_turn) >= 1)` — the `activeProbe &&` carries TS narrowing without changing runtime (hasUnresolvedProbe already implies activeProbe truthy).
- `src/sim/events/event_constraints.ts` (2 dot) — `restriction.allowed_municipalities!.includes(...)` and `restriction.blocked_municipalities!.includes(...)` inside `.filter(osid => ...)` arrow callbacks: TS does not carry the outer `if (restriction.allowed_municipalities)` truthy-guard narrowing through arrow callbacks because `restriction` is a loop variable and property reads could in principle change. Hoisted `const allowed = restriction.allowed_municipalities;` and `const blocked = restriction.blocked_municipalities;` ABOVE the `if` guard; `const`-bindings narrow correctly inside the arrow callback. Byte-identical: same `.includes(mun)` call on same array reference.
- `src/sim/replay/replay_player.ts` (2 dot) — `frame.metadata!.turn!` after `typeof frame.metadata?.turn === 'number'` and `frame.meta!.turn!` after `typeof frame.meta?.turn === 'number'` hoisted to `const metaTurn = frame.metadata?.turn; if (typeof metaTurn === 'number') return metaTurn;` and `const altMetaTurn = frame.meta?.turn; if (typeof altMetaTurn === 'number') return altMetaTurn;`. The `typeof === 'number'` check narrows the local from `number | undefined` to `number`. Byte-identical: same field reads, same predicates, same returned values across all input branches.
- `src/sim/political/political_peace_plan.ts` (1 dot) — `acceptOption.dimension_shifts!.push(...)` after a literal initializer guaranteed the array. Hoisted `const acceptDimensionShifts: NonNullable<EventResponseOption['dimension_shifts']> = [...]` above the `acceptOption` literal; the literal references `acceptDimensionShifts` (same array object, reference equality preserved); the conditional `.push(...)` uses the typed local. Byte-identical: same array constructed at same code point, same push at same code point, same content order.
- `src/sim/endgame/endgame_comparison.ts` (1 dot) — `Number.isFinite(rupture?.recorded_turn) ? rupture!.recorded_turn! : null` rewritten as `const recordedTurn = rupture?.recorded_turn; playerWeek = typeof recordedTurn === 'number' && Number.isFinite(recordedTurn) ? recordedTurn : null`. `Number.isFinite` returns `false` for `undefined` and for non-number arguments, so the explicit `typeof recordedTurn === 'number' && ` guard is redundant at runtime but required for TS narrowing (`Number.isFinite` is not a type guard in the project's lib-es-DOM signature). Byte-identical for all input cases.
- `src/sim/recruitment_engine.ts` (1 dot) — `pool!.available += mandatoryDrain;` after a `pool = pools[poolKey]!` reassignment where `pools: Record<string, any>`. TS loses flow-narrowing across the `let`-declared `pool` rebind. Rewrote the block so the seeded pool is hoisted to `const seededPool = pools[poolKey];` (typed `any` because `pools` is `Record<string, any>`); the reassignment `pool = seededPool` and the mutation `seededPool.available += mandatoryDrain;` both reference the same object. Byte-identical: same property writes in same order on same object.
- `src/scenario/scenario_runner.ts` (5 dot) — five `replayTimelineStream!.write(...)`/`.end()`/`.on(...)` sites inside feature-flag-gated (`emitWeeklySavesForVideo`) `timedSync`/`timedAsync` arrow-callback closures. TS does not carry the outer `if (emitWeeklySavesForVideo && replayTimelineStream)` narrowing through arrow callbacks. Hoisted local `const stream = replayTimelineStream;` (init block) / `const stream = replayTimelineStream;` (mid-loop write block) / `const stream = replayTimelineStream;` (close block) — each captures the non-nullable narrowing of `replayTimelineStream` at the gate entry for use inside the immediately-following arrow callback. Module-local `replayTimelineStream` retains its nullable type and acts as the durable cross-scope reference (set on init, checked for truthiness on subsequent visits, finalized on close); local `stream` captures are scope-bound to each gated block. Singular ownership preserved. Byte-identical: same `.write`/`.end`/`.on` calls in same order on same stream object.

Inventory delta confirmed against `node tools/diagnostics/strict_null_inventory.cjs`:

| Category | Pre-Batch-51 | Post-Batch-51 | Δ |
|---|---:|---:|---:|
| `as_factionid_casts` | 2 | 2 | 0 |
| `as_unknown_casts` | 80 | 80 | 0 |
| `as_any_casts` | 319 | 319 | 0 |
| `non_null_assertions_dot` | 32 | 11 | −21 |
| `non_null_assertions_index` | 38 | 38 | 0 |
| `optional_fields_game_state` | 463 | 463 | 0 |

Delta exactly matches Batch B audit prediction (`non_null_assertions_dot` 32 → 11; index lane unchanged because Batch B was scoped to dot-style runtime-invariant cleanup).

Static-grep guard at `tests/sector_partition_instrumentation.test.ts:197` widened from `(?:nodeProcess|process)!\.hrtime\.bigint\s*\(` to `(?:perfNodeProcess|nodeProcess|process)!?\.hrtime\.bigint\s*\(` to accept the new alias and the now-optional `!`. The test's intent (instrumentation block uses `hrtime.bigint()`, not `Date.now`/`Math.random`/etc.) is preserved; banned-pattern guards (lines 181-187) are unchanged and still pass.

`npm.cmd run typecheck` PASS; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 28/28 PASS; focused vitest run of `corps_front_sectors_multi`, `corps_front_sector_corps_ownership`, `sector_partition_buildCorpsFrontSectors_integration` (100+ deterministic state variants, 138 s wall — exercises corps_front_sectors heavily), `sector_partition_instrumentation`, `sector_offensive`, `sector_offensive_idle_recovery`, `sector_offensive_in_transit_predictor`, `sector_offensive_launch_gates`, `exhaustion_gate_sector_offensive`, `recruitment_engine`, `replay_player`, `peace_plans`, `peace_plans_war_ended_early_producer`, `sim/political/political_peace_plan`, `v091_endgame_milestone_closure`, `endgame_188w_diagnostics`, `scenario_runner_artifact_repair`, `consequence_chains`, `consequence_consumers`, `consequence_effects` — 263/263 PASS. **`npm.cmd run test:baselines` PASS — "Baseline regression: all scenarios match." Byte-identical across all baseline scenarios.** `git diff --check` clean.

### Post-FactionId Roadmap (2026-05-20)

The visible non-UI `as FactionId` lane closed at Batch 49. The remaining strict-null inventory is classified in [`docs/40_reports/audits/20260520_STRICT_NULL_POST_FACTIONID_CLASSIFICATION.md`](../40_reports/audits/20260520_STRICT_NULL_POST_FACTIONID_CLASSIFICATION.md), which executes [`docs/plans/2026-05-20-strict-null-post-factionid-roadmap.md`](2026-05-20-strict-null-post-factionid-roadmap.md). Current post-Batch-C / post-unknown-tail / validator / UI-builder / bot-response / CLI / core-singleton / UI-IPC / front-state CLI / political-control audit CLI / treaty CLI / warroom-viewer UI / event-effects-mock / ForceReadiness floor (top-level): `as_any_casts` 180, `as_factionid_casts` 2 (both retained in `GameStateAdapter.ts` under literal-union stop-gate), `as_unknown_casts` 4, `non_null_assertions_dot` 10, `non_null_assertions_index` 36, `optional_fields_game_state` 463.

Next three implementable batches (proposed; no source code written by this plan):

- **Batch A — UI-only trivial alias / JSX truthy-narrowing. CLOSED 2026-05-20 (Batch 50).** 8 files: `CorpsFrontPanel.tsx`, `OperationHistoryPanel.tsx`, `army_hq/CommandRelationshipSection.tsx`, `army_hq/SectorsSection.tsx`, `chronicle/generateWrappedSlides.ts`, `buildEthnicGeoJSON.ts`, `buildPoliticalMetricGeoJSON.ts`, `buildSupplyReachGeoJSON.ts`. Delta confirmed `non_null_assertions_dot` 39→32 (−7), `non_null_assertions_index` 43→38 (−5). Pattern: Batch 42 `AutonomyPanel.tsx` predicate-variable → value-truthy narrowing precedent. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 28/28; focused vitest run across `command_authority_explanation_delegation`, `ui/accessibility_form_labels`, `ui/command_relationship_campaign_drag_proof`, `ui_map_political_metrics`, `ui_map_supply_reach`, `ui_opord_player_safe_labels`, `v093_a11y_lane_c_warroom_decision_room`, `wrapped_slides` 118/118; `npm.cmd run desktop:map:build` PASS; `git diff --check` clean. Baselines NOT required (UI-only; no sim path).
- **Batch B — Sim runtime-invariant cleanup. CLOSED 2026-05-20 (Batch 51).** 8 files: `corps_front_sectors.ts` (7 dot, `nodeProcess!.` cluster collapsed via `perfNodeProcess` non-null alias + 2 enclosing-guard local hoists), `sector_offensive.ts` (2 dot), `event_constraints.ts` (2 dot), `replay_player.ts` (2 dot), `political_peace_plan.ts` (1), `endgame_comparison.ts` (1), `recruitment_engine.ts` (1), `scenario_runner.ts` (5 `replayTimelineStream!.` via per-block `const stream` capture). Delta confirmed `non_null_assertions_dot` 32→11 (−21). Pattern: Batch 19 / Batch 41 local-binding refactor precedents. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 28/28; 20-suite focused vitest run 263/263 PASS (includes `sector_partition_buildCorpsFrontSectors_integration` 100+ deterministic state variants at 138 s wall); **`npm.cmd run test:baselines` PASS — "Baseline regression: all scenarios match."** Byte-identical across all baseline scenarios. `git diff --check` clean. `tests/sector_partition_instrumentation.test.ts:197` static-grep guard widened to accept the new `perfNodeProcess` alias and the now-optional `!`; banned-pattern guards unchanged.
- **Batch C — Schema-boundary validation. CLOSED 2026-05-21 (C0-C12 in 13 commits).** 12 files driven to 0 `as_unknown_casts` each: `scenario_loader.ts` (8), `war_timeline.ts` (8), `political_control_init.ts` (7), `oob_loader.ts` (6), `brigade_temporal_emit.ts` (5), `collect_briefing.ts` (4), `desktop_sim.ts` (3), `serialize.ts` (3), `validateGameState.ts` (2), `replay_frame_summary.ts` (2), `war_dispatches.ts` (2), `sector_offensive_launch_helpers.ts` (2). Implementation: new `src/state/schema_validators.ts` module (six narrowing primitives: `asRecord` / `asArray` / `asString` / `asFiniteNumber` / `asBoolean` / `asTypedArray`) + per-loader composed helpers co-located with each consumer (Batch 49 `parseFactionId` precedent generalized). Delta confirmed `as_unknown_casts` 80 → 28 (−52, predicted floor hit exactly). Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 40/40 (12 new `BATCH_C_*` slice assertions); `npm.cmd run test:baselines` PASS at tip ("Baseline regression: all scenarios match" across 40w/52w/baseline_ops_4w/noop_4w); `npm.cmd run desktop:map:build` PASS for the `desktop_sim.ts` IPC bridge gate; per-file focused vitest suites PASS at each commit. Three latent path-bugs documented at helper sites in `collect_briefing.ts` for separate behavior lanes (`corps_command.faction` / `f.ops.disrupted_turns` / `state.military.enclave_resilience` are all structurally absent at runtime; Batch C preserves the same `undefined` fallback the casts produced). Plan: [`2026-05-20-strict-null-schema-boundary-validation-plan.md`](2026-05-20-strict-null-schema-boundary-validation-plan.md).
- **Post-Batch-C JSON/array type-erasure tail. CLOSED 2026-05-21.** 8 low-risk data/map/scenario loader leaves cleaned 10 additional `as_unknown_casts` by changing `JSON.parse(...) as unknown` to `const x: unknown = JSON.parse(...)` and dropping already-array-narrowed array casts. Files: `src/cli/sim_scenario.ts`, `src/data/geography.ts`, `src/data/operational_data.ts`, `src/data/settlement_ethnicity.ts`, `src/map/settlements.ts`, `src/scenario/campaign_unlock.ts`, `src/scenario/initial_formations_loader.ts`, `src/sim/pressure/phase3a_pressure_eligibility.ts`. Delta confirmed `as_unknown_casts` 28 → 18. Validation PASS: `npm.cmd run typecheck`; focused vitest 65/65 + 1 skipped across campaign/data/map/scenario loader surfaces; `npm.cmd run test:baselines` PASS.
- **Post-Batch-C unknown bridge/reporting tail. CLOSED 2026-05-21.** 9 additional files cleaned 12 `as_unknown_casts` by replacing double-casts with explicit report fields, typed state reads, direct `Window & ...` bridge casts, an explicit `unknown` JSON.parse annotation, and a literal JSX aria prop. Files pinned at zero `as_unknown_casts`: `src/scenario/scenario_runner.ts`, `src/sim/ai_commander/prompt_builder.ts`, `src/ui/map/components/AutonomyPanel.tsx`, `src/ui/map/components/SituationTab.tsx`, `src/ui/map/components/icons/Icon.tsx`, `src/ui/map/components/warroom/AdvanceTurnModal.tsx`, `src/ui/map/desktop/useIPC.ts`, `src/ui/map/scripts/debugLoadSave.ts`, `src/ui/warroom/ClickableRegionManager.ts`. Delta confirmed `as_unknown_casts` 18 → 6. Retained six sites are classified as behavior-shaped or intentionally incomplete mock/adapter bridges: `corps_dialogue.ts`, `apply_effects.ts`, `scoring.ts`, `loadedGameState.ts`, `VerdictScreen.tsx`, and `warroom.ts`. Validation PASS: `npm.cmd run typecheck`; strict-null inventory progress test includes the new post-Batch-C safe-slice assertion.
- **Post-unknown `as any` validator slice 1. CLOSED 2026-05-21.** `src/validate/formations.ts` cleaned 31 `as_any_casts` by replacing permissive property reads with a local `asRecord(...)` helper, narrow literal-union guards, and explicit numeric type guards before comparisons. Delta confirmed `as_any_casts` 319 → 288. `tests/strict_null_inventory_progress.test.ts` pins the file at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/formations_validate.test.ts tests/strict_null_inventory_progress.test.ts --reporter=dot` 43/43.
- **Post-unknown `as any` validator slice 2. CLOSED 2026-05-21.** `src/validate/militia_pools.ts` cleaned 12 `as_any_casts` with the same tolerant validator pattern: local `asRecord(...)`, `isPoliticalSide(...)`, and explicit numeric guards for `available`, `committed`, `exhausted`, `updated_turn`, and optional `fatigue`. Delta confirmed `as_any_casts` 288 → 276. `tests/strict_null_inventory_progress.test.ts` pins the file at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/militia_pools.test.ts tests/strict_null_inventory_progress.test.ts --reporter=dot` 47/47. Baselines not required (validator-only type narrowing).
- **Post-unknown `as any` validator slice 3. CLOSED 2026-05-21.** `src/validate/end_state.ts` cleaned 10 `as_any_casts` with local `asRecord(...)` and tuple guards for treaty snapshot validation. Delta confirmed `as_any_casts` 276 → 266. `tests/strict_null_inventory_progress.test.ts` pins the file at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/end_state.test.ts tests/strict_null_inventory_progress.test.ts --reporter=dot` 49/49. Baselines not required (validator-only type narrowing).
- **Post-unknown `as any` validator slice 4. CLOSED 2026-05-21.** `src/validate/front_segments.ts` cleaned 9 `as_any_casts` with local `asRecord(...)` and explicit numeric guards for segment counters / turn fields. Delta confirmed `as_any_casts` 266 → 257. `tests/strict_null_inventory_progress.test.ts` pins the file at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/front_segments_validate.test.ts tests/strict_null_inventory_progress.test.ts --reporter=dot` 46/46. Baselines not required (validator-only type narrowing).
- **Post-unknown `as any` validator slice 5. CLOSED 2026-05-21.** `src/validate/front_posture.ts`, `src/validate/front_posture_regions.ts`, and `src/validate/front_pressure.ts` cleaned 18 `as_any_casts` with local `asRecord(...)` helpers and explicit numeric guards. Delta confirmed `as_any_casts` 257 → 239. `tests/strict_null_inventory_progress.test.ts` pins the three files at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; focused front posture/pressure vitest plus strict-null inventory progress 51/51. Baselines not required (validator-only type narrowing).
- **Post-unknown `as any` UI-map builder slice. CLOSED 2026-05-21.** `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` cleaned 3 `as_any_casts` by typing internal stitcher chain slots as nullable, guarding merged chain reads, replacing `chains as any` null-out writes with typed `null` assignments, and returning the typed `Feature<LineString>[]` feature array directly. Delta confirmed `as_any_casts` 239 → 236. `tests/strict_null_inventory_progress.test.ts` pins the builder at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; focused map/front-line/glow tests plus strict-null inventory progress 51/51. Baselines not required (UI/map builder type narrowing only; no sim path or scenario output).
- **Post-unknown `as any` validator slice 6. CLOSED 2026-05-21.** `src/validate/factions.ts` and `src/validate/supply_rights.ts` cleaned 3 `as_any_casts` by replacing political-side membership casts with `isPoliticalSideId(...)`, reading typed `command_capacity` directly, and typing `corridor.scope` as `Record<string, unknown>` under the existing object guard. Delta confirmed `as_any_casts` 236 → 233. `tests/strict_null_inventory_progress.test.ts` pins both files at zero `as_any_casts`. Validation PASS: `npm.cmd run typecheck`; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 48/48. Baselines not required (validator-only type narrowing).
- **Post-unknown `as any` low-risk leaf slice. CLOSED 2026-05-21.** Seven singleton leaves cleaned across `src/map/front_regions.ts`, `src/sim/economy/smuggling_routes.ts`, `src/sim/events/strategic_dimensions.ts`, `src/sim/early_war/alliance_update.ts`, `src/state/territorial_valuation.ts`, `src/state/political_control_init.ts`, and `src/ui/map/data/diplomacyView.ts`. Delta confirmed `as_any_casts` 233 → 226. The smuggling-route `alliance_value` read is preserved as a legacy-shaped compatibility read via `'alliance_value' in state.political.rbih_hrhb_state` with the same zero fallback. Validation PASS: `npm.cmd run typecheck`; focused vitest run 170/170; `npm.cmd run test:baselines` PASS (`Baseline regression: all scenarios match.`).
- **Post-unknown `as any` UI window bridge slice. CLOSED 2026-05-21.** `src/ui/map/App.tsx` and `src/ui/map/components/SidePickerOverlay.tsx` cleaned 6 `as_any_casts` by declaring typed `Window` bridge callbacks for manual save load and continue-last-run, then replacing casted assignments/deletes/calls with typed property access. Delta confirmed `as_any_casts` 226 → 220. Validation PASS: `npm.cmd run typecheck`; focused UI/inventory vitest 51/51; `npm.cmd run desktop:map:build` PASS. Baselines not required (UI-only bridge typing).
- **Post-unknown `as any` bot-response / interaction-layer slice. CLOSED 2026-05-21.** `src/sim/events/bot_response.ts` and `src/ui/map/map/interactionLayerConfig.ts` cleaned 3 `as_any_casts` by reading event-effect deltas through `getNumericDelta(effect: EventEffect)` and typing the MapLibre zoom-width expression as `ExpressionSpecification`. Delta confirmed `as_any_casts` 220 → 217. Validation PASS: `npm.cmd run typecheck`; focused bot-response/UI/inventory vitest 111/111; `npm.cmd run desktop:map:build` PASS; `npm.cmd run test:baselines` PASS (`Baseline regression: all scenarios match.`).
- **Post-unknown `as any` CLI political-side / MapKit slice. CLOSED 2026-05-21.** `src/state/identity.ts` added `isPoliticalSideId(...)`; seven simulation helper CLIs replaced tuple-membership `as any` casts with the shared guard; `sim_formations.ts` used typed `FormationState` reads; `sim_phase5_check.ts` typed settlement edges as `EdgeRecord[]` and read front-posture assignments directly; `mapkit_validate.ts` reads `f.properties?.sid` from the existing `Record<string, unknown>`. Delta confirmed `as_any_casts` 217 → 202. Validation PASS: `npm.cmd run typecheck`; focused CLI/inventory vitest 59/59. `npm.cmd run map:validate` could not run because no `settlements_polygons*.geojson` artifact is present under `data/derived` in this checkout.
- **Post-unknown `as any` core singleton slice. CLOSED 2026-05-21.** `src/state/serialize.ts`, `src/state/validateGameState.ts`, `src/sim/turn_pipeline_types.ts`, `src/sim/turn_phases/war_phase_negotiation_steps.ts`, and `src/sim/turn_phases/war_phases.ts` cleaned 4 `as_any_casts` by removing a `GameState` spread cast, using validator `isRecord(...)` for displacement, typing `TurnReport.counter_offers`, and assigning a typed `BrigadeMovementOrder` literal directly. Delta confirmed `as_any_casts` 202 → 198. Validation PASS: `npm.cmd run typecheck`; focused serialization/displacement/negotiation/turn-pipeline/inventory vitest 91/91; `npm.cmd run test:baselines` PASS (`Baseline regression: all scenarios match.`).
- **Post-unknown `as any` AI settings panel IPC fix. CLOSED 2026-05-21.** `src/ui/map/components/AiSettingsPanel.tsx` replaced the casted optional `ipc.invoke?.('set-ai-commander-config', ...)` call with the typed `ipc.setAiCommanderConfig(...)` bridge already exposed by `useIPC()`. Delta confirmed `as_any_casts` 198 → 197. Validation PASS: `npm.cmd run typecheck`; focused UI/AI IPC/inventory vitest 82/82 before final static assertion; final static+inventory rerun 67/67; `npm.cmd run desktop:map:build` PASS. Baselines not required (UI-only IPC bridge fix).

- **Post-unknown `as any` CLI front-state diagnostic slice. CLOSED 2026-05-21.** `src/cli/sim_front_state.ts` cleaned 9 `as_any_casts` by reading typed `FrontSegmentState` fields directly and switching the diagnostic pressure read from stale top-level `state.front_pressure` to canonical `state.military.front_pressure?.[edge_id]`. Delta confirmed `as_any_casts` 197 → 188. Validation PASS: red/green strict-null inventory assertion (failed at 9 before the source edit, passed after); `npm.cmd run typecheck`; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 55/55; `npm.cmd run sim:frontstate -- data\derived\startup\apr_1992_initial_save.json --top 1` PASS; `npm.cmd run sim:frontstate -- data\derived\latest_run_final_save.json --top 1` PASS. Baselines not required (diagnostic CLI only; no sim path or scenario output).
- **Post-unknown `as any` political-control audit CLI slice. CLOSED 2026-05-21.** `src/cli/phaseD0_political_control_inputs_audit.ts` and `src/cli/phaseE4_null_political_control_diagnosis.ts` cleaned 4 `as_any_casts` by replacing `(indexData as any).political.settlements` with a typed `readSettlements(...)` helper that supports the current top-level `settlements` shape and the older nested `political.settlements` shape. Delta confirmed `as_any_casts` 188 → 184. Validation PASS: red/green strict-null assertion (failed at 4 before the source edit, passed after); `npx.cmd vitest run tests/political_control_audit_cli.test.ts tests/strict_null_inventory_progress.test.ts --reporter=dot` 58/58; `npm.cmd run typecheck`. `phaseE4:null_political_control_diagnosis` now runs; `phaseD0:political_control_inputs_audit` now reports a real validation failure instead of TypeError because current `settlements_index_1990.json` has display-name `mun1990_id` values (for example `Banja Luka`) rather than slug ids matching `^[a-z0-9_]+$`. That is a separate generated-data lane, not a strict-null cleanup.
- **Post-unknown `as any` treaty CLI slice. CLOSED 2026-05-21.** `src/cli/sim_treaty.ts` cleaned its final `as_any_cast` by validating parsed clause kinds with an explicit `isTreatyClauseKind(...)` guard and returning `TreatyClauseKind` from `parseClauseSpec(...)`. Delta confirmed `as_any_casts` 184 → 183. Validation PASS: red/green strict-null assertion (failed at 1 before the source edit, passed after); `npm.cmd run typecheck`; `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` 57/57; `npm.cmd run sim:treaty -- propose data\derived\startup\apr_1992_initial_save.json --proposer RBiH --turns 1 --clause military:ceasefire_global:RS:global:all --json --out-report data\derived\_debug\tmp_treaty_draft.json` PASS. Baselines not required (CLI authoring helper only; no sim path).
- **Warroom viewer / diplomacy overview strict-null tail slice. CLOSED 2026-05-21.** `src/ui/warroom/map_viewer_app.ts` and `src/ui/map/components/DiplomacyOverview.tsx` cleaned one `as_any_cast`, one dot non-null assertion, and two index non-null assertions by parsing local save files as `unknown`, using local record readers, capturing the control-status record before contested writes, hoisting settlement majority text under a value guard, and binding `strategicDimensions ?? {}` before faction lookup. Delta confirmed `as_any_casts` 183 → 182, `non_null_assertions_dot` 11 → 10, `non_null_assertions_index` 38 → 36. Validation PASS: red/green strict-null assertion (failed at 4 before the source edit, passed after); `npm.cmd run typecheck`. Baselines not required (UI-only read-model/viewer cleanup; no sim path).
- **Event-effects / loaded-state mock unknown tail slice. CLOSED 2026-05-21.** `src/sim/events/apply_effects.ts` and `src/ui/map/__mocks__/loadedGameState.ts` cleaned two `as_unknown_casts` by replacing the negotiation-capital writer's `unknown` bridge with a typed dynamic record view and completing the UI mock with required empty `LoadedGameState` arrays. Delta confirmed `as_unknown_casts` 6 → 4. Validation PASS: red/green strict-null assertion (failed at 2 before the source edit, passed after); `npm.cmd run typecheck`; focused event/UI/inventory vitest 98/98; `npm.cmd run test:baselines` PASS (`Baseline regression: all scenarios match.`).
- **ForceReadiness Army HQ as-any tail slice. CLOSED 2026-05-21.** `src/ui/map/components/army_hq/ForceReadiness.tsx` cleaned two `as_any_casts` by reading `FormationView.homeHops` and `OperationView.participating_brigade_ids` directly. Delta confirmed `as_any_casts` 182 → 180. Validation PASS: red/green strict-null assertion (failed at 2 before the source edit, passed after); `npm.cmd run typecheck`. Baselines not required (UI-only read-model consumer).

Deferred / stop-gated (≈ 175 sites; documented per-class in the classification audit):

- CLI / validate diagnostic harness `as any` (remaining large clusters are mostly phase3/sim scenario harnesses and generated-data audit tools) — validators tolerate partial state by design; out of strict-null scope unless a slice has typed local contracts and a focused diagnostic proof.
- `save_migration.ts` `as any` (23 sites) — save-migration lane.
- `GameStateAdapter.ts` 8 `as any` + 2 `as FactionId` (10 retained sites) — Phase 5 chokepoint floor at Batch 48; requires contract decisions (UI/engine FactionId unification, JSON-schema validation for `historicalBaseline`, `parseGameState` external input).
- `MapContainer.tsx` 12 `as any` (library-boundary) — requires MapLibre / Deck.gl `@types` upgrades.
- ≈30 `non_null_assertions_index` sites across `treaty_apply.ts` (7), `supply_reserves.ts` (6), `war_phases.ts` (4), `commander_march_correction.ts` (2), `formation_spawn.ts` (3), `displacement.ts` (2), `displacement_state_utils.ts` (1), `negotiation/counter_offer_generator.ts` (2), `recruitment_engine.ts` (1), `scenario_runner.ts` (2), `war_stories.ts` (1), plus the remaining dot sites split across save-shape/default-decision, UI/map renderer boundary, warroom viewer fallback, and anomaly assignment invariants; see the classification audit for per-site stop-gates.
- `minority_erosion.ts` `war_militia_strength` 3 sites — **deferred-behavior-fix** (writes to wrong state path; needs behavior plan).
- 463 optional `GameState` fields — save-migration / default-decision lane.

`strictNullChecks` migration is NOT closed; closing requires Batches A + B + C + save-shape/behavior lane + UI/engine FactionId unification + validator type-tightening lane.

2026-05-22 update: the deferred cast/assertion list above is retained as historical classification context only. The GameStateAdapter tail closed the largest counted escape lanes, so current strict-null work is no longer broad cast/assertion cleanup; it is the 486-field optional `GameState` contract/schema/defaulting lane plus the small retained `as unknown` boundary tail.

## Source Migration Status

No source phase was completed in this lane. Current worktree status shows unrelated active edits in protected source areas (`supply`, `paramilitary`, `RBiH-HRHB`, `fatigue`, and turn pipeline files), so type-only source migration is deferred to avoid conflicts.

## 2026-05-22 Sim Scenario CLI Tail Addendum

- `src/cli/sim_scenario.ts` is now closed for `as_any_casts` and pinned by `tests/strict_null_inventory_progress.test.ts`.
- Delta: top-level `as_any_casts` 122 -> 95; `as_unknown_casts`, `non_null_assertions_dot`, and `non_null_assertions_index` are all 0.
- Verification: red/green strict-null assertion, focused deterministic scenario summary tests 89/89, and `npm.cmd run typecheck` PASS.
- Remaining `as_any_casts`: `src/cli/phase3a_ab_harness.ts` (31), `src/cli/phase3abc_audit_harness.ts` (33), `src/state/save_migration.ts` (23), and `src/ui/map/data/GameStateAdapter.ts` (8). The old deferred list above is superseded for current counts by this addendum.

## 2026-05-22 Phase 3A A/B Harness Tail Addendum

- `src/cli/phase3a_ab_harness.ts` is now closed for `as_any_casts` and pinned by `tests/strict_null_inventory_progress.test.ts`.
- Delta: top-level `as_any_casts` 95 -> 64; `as_unknown_casts`, `non_null_assertions_dot`, and `non_null_assertions_index` remain 0.
- Verification: red/green strict-null assertion, `npm.cmd run typecheck` PASS, `npm.cmd run sim:phase3a:ab` PASS after stale fixture repair, and current inventory proof from `node tools\diagnostics\strict_null_inventory.cjs`.
- Fixture repair: the harness mock states now declare `meta.phase: 'war'` and use canonical strategy-table faction IDs (`RBiH`, `RS`, `HRHB`) instead of placeholder IDs. This restores diagnostic harness compatibility with the current turn pipeline and bot strategy tables without calibration tuning.
- Remaining `as_any_casts`: `src/cli/phase3abc_audit_harness.ts` (33), `src/state/save_migration.ts` (23), and `src/ui/map/data/GameStateAdapter.ts` (8). The sim-scenario addendum above is superseded for current counts by this addendum.

## 2026-05-22 Phase 3ABC Audit Harness Tail Addendum

- `src/cli/phase3abc_audit_harness.ts` is now closed for `as_any_casts` and pinned by `tests/strict_null_inventory_progress.test.ts`.
- Delta: top-level `as_any_casts` 64 -> 31; `as_unknown_casts`, `non_null_assertions_dot`, and `non_null_assertions_index` remain 0.
- Verification: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS 89/89, `npm.cmd run typecheck` PASS, `npm.cmd run phase3:abc_audit` PASS with deterministic A-D report hashes, and current inventory proof from `node tools\diagnostics\strict_null_inventory.cjs`.
- Fixture repair: the harness mock states now declare `meta.phase: 'war'`, use canonical strategy-table faction IDs (`RBiH`, `RS`), and write front-posture assignments with required `edge_id` fields. This restores diagnostic harness compatibility with the current turn pipeline and typed front-posture contract without calibration tuning.
- Remaining `as_any_casts`: `src/state/save_migration.ts` (23) and `src/ui/map/data/GameStateAdapter.ts` (8). The Phase 3A A/B addendum above is superseded for current counts by this addendum.

## 2026-05-22 Save Migration Tail Addendum

- `src/state/save_migration.ts` is now closed for `as_any_casts` and pinned by `tests/strict_null_inventory_progress.test.ts`.
- Delta: top-level `as_any_casts` 31 -> 8; `as_unknown_casts`, `non_null_assertions_dot`, and `non_null_assertions_index` remain 0.
- Verification: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS 90/90, `npm.cmd run typecheck` PASS, `npm.cmd run test:baselines` PASS (`Baseline regression: all scenarios match.`), `git diff --check` PASS, and current inventory proof from `node tools\diagnostics\strict_null_inventory.cjs`.
- Implementation note: the slice replaces casts on `state` / `state.military` with direct typed reads or the existing tolerant `asRecord(...)` save-boundary helper. It does not add, remove, or change migration defaults.
- Remaining visible strict-null escapes at this floor: `src/ui/map/data/GameStateAdapter.ts` has 8 `as_any_casts` and 2 retained `as_factionid_casts`. The Phase 3ABC addendum above is superseded for current counts by this addendum, and the GameStateAdapter addendum below supersedes this line for current counts.

## 2026-05-22 GameStateAdapter Tail Addendum

- `src/ui/map/data/GameStateAdapter.ts` is now closed for inventory-counted `as_any_casts` and `as_factionid_casts`, and the Phase 5 adapter assertion is pinned at exact zero across all counted escape/assertion categories.
- Delta from the save-migration tail: top-level `as_any_casts` 8 -> 0 and `as_factionid_casts` 2 -> 0; `as_unknown_casts`, `non_null_assertions_dot`, and `non_null_assertions_index` remain 0.
- Verification: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts tests\adapter_field_completeness.test.ts tests\game_state_adapter_estimated_civilian_risk.test.ts tests\ui_adapter_boundary.test.ts tests\ui_map_game_state_adapter.test.ts --reporter=dot` PASS 148/148, `npm.cmd run typecheck` PASS, `npm.cmd run desktop:map:build` PASS with existing Vite warnings, `git diff --check` PASS, and current inventory proof from `node tools\diagnostics\strict_null_inventory.cjs`.
- Remaining strict-null work: 486 optional `GameState` fields plus 3 retained `as unknown` boundary casts. This is primarily a contract/schema/default-decision lane, not broad cast/assertion cleanup.
