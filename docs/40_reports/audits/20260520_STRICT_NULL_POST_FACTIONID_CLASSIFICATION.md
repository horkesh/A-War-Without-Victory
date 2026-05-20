# Strict-Null Post-FactionId Classification Audit

**Date:** 2026-05-20
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19` (HEAD: `1321c0ac` — Post-Batch-49 reconciliation)
**Plan:** [`docs/plans/2026-05-20-strict-null-post-factionid-roadmap.md`](../../plans/2026-05-20-strict-null-post-factionid-roadmap.md)
**Inventory snapshot:** [`data/derived/_debug/strict_null_inventory_post_factionid.json`](../../../data/derived/_debug/strict_null_inventory_post_factionid.json) (regenerable via `node tools/diagnostics/strict_null_inventory.cjs`)
**Type:** Classification-only audit. No source files, tests, generated saves, canon, or `FORAWWV.md` touched. No cleanup batch executed.

---

## 1. Inventory Snapshot

### Top-level counts (2026-05-20, current main + Batch 49 closeout)

| Category | Baseline (2026-05-17) | Batch 48 floor | Current (post Batch 49) | Δ vs Batch 48 |
|---|---:|---:|---:|---:|
| `as_factionid_casts` | 154 | 3 | **2** | −1 (Batch 49) |
| `as_unknown_casts` | 97 | 80 | **80** | 0 |
| `as_any_casts` | 395 | 319 | **319** | 0 |
| `non_null_assertions_dot` | 50 | 40 | **39** | −1 (Batch 49 `d!.stance`) |
| `non_null_assertions_index` | 59 | 43 | **43** | 0 |
| `optional_fields_game_state` | 458 | 463 | **463** | 0 |

The expected Batch 49 delta (`as_factionid_casts` 3 → 2; `non_null_assertions_dot` 40 → 39) is confirmed. Other categories are unchanged because Batch 49 was scoped to the AI commander parser only.

### `as_factionid_casts` — 2 retained, both stop-gated

| File:Line | Site | Class |
|---|---|---|
| `src/ui/map/data/GameStateAdapter.ts:1845` | `enclaveDef?.faction as FactionId \| undefined` | UI adapter boundary (literal-union stop-gate) |
| `src/ui/map/data/GameStateAdapter.ts:1866` | `enclaveDef?.faction as FactionId \| undefined` | UI adapter boundary (literal-union stop-gate) |

Both retained under the `PROJECT_LEDGER_KNOWLEDGE.md` "UI `FactionId` literal-union shadows the engine `FactionId = string`" durable rule. Cleanup requires either (a) unifying the renderer-engine `FactionId` types, or (b) typing `ENCLAVE_UI_DEFINITIONS[i].faction` at the literal union at its declaration site. Not a strict-null cleanup task.

### Top 20 hotspots per category

#### `as_any_casts` (319)

| Count | File |
|---:|---|
| 33 | `src/cli/phase3abc_audit_harness.ts` |
| 31 | `src/cli/phase3a_ab_harness.ts` |
| 31 | `src/validate/formations.ts` |
| 27 | `src/cli/sim_scenario.ts` |
| 23 | `src/state/save_migration.ts` |
| 12 | `src/ui/map/map/MapContainer.tsx` |
| 12 | `src/validate/militia_pools.ts` |
| 10 | `src/validate/end_state.ts` |
| 9 | `src/cli/sim_front_state.ts` |
| 9 | `src/validate/front_segments.ts` |
| 8 | `src/cli/phaseD3_trace_missing_census_settlements.ts` |
| 8 | `src/ui/map/data/GameStateAdapter.ts` |
| 7 | `src/validate/front_posture.ts` |
| 6 | `src/validate/front_posture_regions.ts` |
| 5 | `src/scenario/scenario_runner.ts` |
| 5 | `src/validate/front_pressure.ts` |
| 4 | `src/cli/sim_phase5_check.ts` |
| 4 | `src/ui/map/App.tsx` |
| 3 | `src/cli/phaseD2_settlement_count_reconcile_audit.ts` |
| 3 | `src/cli/phaseF0_null_political_control_settlements_report.ts` |

Remaining 35 files account for the residual 79 sites (singletons and ≤3-count entries; see snapshot JSON for full list).

#### `as_unknown_casts` (80)

| Count | File |
|---:|---|
| 8 | `src/scenario/scenario_loader.ts` |
| 8 | `src/state/war_timeline.ts` |
| 7 | `src/state/political_control_init.ts` |
| 6 | `src/scenario/oob_loader.ts` |
| 5 | `src/scenario/brigade_temporal_emit.ts` |
| 4 | `src/sim/briefing/collect_briefing.ts` |
| 3 | `src/desktop/desktop_sim.ts` |
| 3 | `src/state/serialize.ts` |
| 3 | `src/ui/warroom/warroom.ts` |
| 2 | `src/data/operational_data.ts` |
| 2 | `src/map/settlements.ts` |
| 2 | `src/scenario/scenario_runner.ts` |
| 2 | `src/sim/ai_commander/war_dispatches.ts` |
| 2 | `src/sim/combat/sector_offensive_launch_helpers.ts` |
| 2 | `src/sim/replay/replay_frame_summary.ts` |
| 2 | `src/state/validateGameState.ts` |
| 1 | `src/cli/sim_scenario.ts` |
| 1 | `src/data/geography.ts` |
| 1 | `src/data/settlement_ethnicity.ts` |
| 1 | `src/scenario/campaign_unlock.ts` |

Remaining 16 files cover 17 singleton/2-count sites; see snapshot.

#### `non_null_assertions_dot` (39)

| Count | File |
|---:|---|
| 7 | `src/sim/combat/corps_front_sectors.ts` |
| 5 | `src/scenario/scenario_runner.ts` |
| 3 | `src/ui/map/components/chronicle/generateWrappedSlides.ts` |
| 3 | `src/ui/map/map/MapContainer.tsx` |
| 2 | `src/sim/combat/sector_offensive.ts` |
| 2 | `src/sim/events/event_constraints.ts` |
| 2 | `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts` |
| 2 | `src/sim/replay/replay_player.ts` |
| 1 | `src/scenario/anomaly_detector.ts` |
| 1 | `src/sim/endgame/endgame_comparison.ts` |
| 1 | `src/sim/political/political_peace_plan.ts` |
| 1 | `src/sim/recruitment_engine.ts` |
| 1 | `src/sim/turn_phases/war_phase_negotiation_steps.ts` |
| 1 | `src/sim/turn_phases/war_phases.ts` |
| 1 | `src/state/displacement_takeover.ts` |
| 1 | `src/ui/map/components/CorpsFrontPanel.tsx` |
| 1 | `src/ui/map/components/OperationHistoryPanel.tsx` |
| 1 | `src/ui/map/components/army_hq/CommandRelationshipSection.tsx` |
| 1 | `src/ui/map/components/army_hq/SectorsSection.tsx` |
| 1 | `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` |

#### `non_null_assertions_index` (43)

| Count | File |
|---:|---|
| 7 | `src/state/treaty_apply.ts` |
| 6 | `src/state/supply_reserves.ts` |
| 4 | `src/sim/turn_phases/war_phases.ts` |
| 3 | `src/sim/early_war/minority_erosion.ts` |
| 3 | `src/sim/formation_spawn.ts` |
| 3 | `src/ui/map/map/builders/buildEthnicGeoJSON.ts` |
| 2 | `src/scenario/scenario_runner.ts` |
| 2 | `src/sim/combat/commander_march_correction.ts` |
| 2 | `src/sim/negotiation/counter_offer_generator.ts` |
| 2 | `src/state/displacement.ts` |
| 1 | `src/sim/combat/paramilitary_sweep.ts` |
| 1 | `src/sim/combat/sector_offensive.ts` |
| 1 | `src/sim/recruitment_engine.ts` |
| 1 | `src/sim/war_stories.ts` |
| 1 | `src/state/displacement_state_utils.ts` |
| 1 | `src/ui/map/components/DiplomacyOverview.tsx` |
| 1 | `src/ui/map/map/builders/buildPoliticalMetricGeoJSON.ts` |
| 1 | `src/ui/map/map/builders/buildSupplyReachGeoJSON.ts` |
| 1 | `src/ui/warroom/map_viewer_app.ts` |

---

## 2. Classification Taxonomy

The plan's six-class taxonomy is applied below. Counts here are file-grouped totals; site-level granularity is in the snapshot JSON.

| class | meaning | allowed next action |
|---|---|---|
| `trivial-alias` | Cast or assertion is provably type-only; removal emits equivalent JS. | Safe cleanup batch with focused tests. |
| `schema-boundary` | JSON, IPC, LLM, imported JSON, or external payload needs runtime validation. | Write schema-validation plan before code. |
| `save-shape-risk` | Existing saves may omit or reshape the field. | Defer to save migration / validateGameState lane. |
| `runtime-invariant` | Code depends on a real invariant (e.g. array length, prior init). | Replace with explicit assertion or local guard only with tests. |
| `ui-adapter-boundary` | Renderer read model consumes loose engine shape. | Coordinate with adapter/source contract plan; do not piecemeal. |
| `deferred-behavior-fix` | Removing the escape exposes a behavior bug or wrong state path. | New behavior plan, not strict-null cleanup. |

---

## 3. `as_unknown_casts` Classification (80 sites, 23 files)

### `schema-boundary` (62 sites)

All `JSON.parse(...) as unknown` + downstream `Array.isArray(x) ? (x as unknown[]).filter(...)` + `as unknown as Type` patterns at scenario/data load boundaries. These are by-design ingestion gates that need runtime validation contracts before tightening; replacing the bare `as unknown` with `typeof`/`isRecord` narrowing changes runtime semantics for malformed input.

| File | Sites | Reason |
|---|---:|---|
| `src/scenario/scenario_loader.ts` | 8 | `(raw as unknown[]).filter((x): x is string ...)` post-`JSON.parse` |
| `src/scenario/oob_loader.ts` | 6 | Identical pattern + `r.composition as unknown as BrigadeComposition` |
| `src/scenario/brigade_temporal_emit.ts` | 5 | `(state as unknown as { military: { corps_command?: ... } })` engine-state-shape widening (cross-engine save-shape) |
| `src/state/political_control_init.ts` | 7 | `JSON.parse(content) as unknown` followed by typed-shape narrowing |
| `src/state/war_timeline.ts` | 8 | `(obj.equipment_decay as unknown[]).length` over loaded state arrays |
| `src/state/serialize.ts` | 3 | `JSON.parse(payload) as unknown` + `candidate as unknown as GameState` load boundary |
| `src/state/validateGameState.ts` | 2 | `(list as unknown[]).length` legacy validator iteration |
| `src/scenario/initial_formations_loader.ts` | 1 | `JSON.parse(content) as unknown` |
| `src/scenario/campaign_unlock.ts` | 1 | `(raw as unknown[]).filter(...)` |
| `src/data/geography.ts` | 1 | `JSON.parse(content) as unknown` |
| `src/data/operational_data.ts` | 2 | `JSON.parse(content) as unknown` |
| `src/data/settlement_ethnicity.ts` | 1 | `JSON.parse(content) as unknown` |
| `src/map/settlements.ts` | 2 | `JSON.parse(await readFile(...)) as unknown` |
| `src/cli/sim_scenario.ts` | 1 | `JSON.parse(jsonText) as unknown` |
| `src/scenario/scenario_runner.ts` | 2 | Partial `as unknown as ...` for typed-test-state pathways |
| `src/sim/replay/replay_frame_summary.ts` | 2 | `frame.military as unknown as Record<string, unknown> \| undefined` replay frame schema |
| `src/sim/briefing/collect_briefing.ts` | 4 | `(cc as unknown as Record<string, unknown>)['faction']` runtime field access bypassing typed corps_command shape; reads optional `enclave_resilience` not in `MilitaryState` interface |
| `src/sim/ai_commander/war_dispatches.ts` | 2 | `(state.military as unknown as Record<string, unknown>).enclave_state` — optional state path not yet typed |
| `src/desktop/desktop_sim.ts` | 3 | `(state as unknown as { military: { control_events?: unknown[] } })` IPC-boundary optional field access |

Together these comprise the **JSON ingestion / state-shape-tolerant read** surface. A schema-validation plan owning `JSON.parse → typed object` would close this category; piecemeal cleanup would not.

### `ui-adapter-boundary` / `library-boundary` (5 sites)

| File | Sites | Reason |
|---|---:|---|
| `src/ui/warroom/warroom.ts` | 3 | `(window as unknown as { awwv?: DesktopBridge }).awwv` Electron bridge type widening; `} as unknown as GameState` fixture cast |

These tighten only when the Electron `window.awwv` bridge gets a global ambient declaration. UI-only; not a strict-null cleanup task.

### `runtime-invariant` (4 sites)

| File | Sites | Reason |
|---|---:|---|
| `src/sim/combat/sector_offensive_launch_helpers.ts` | 2 | `undefined as unknown as OperationalToCanonicalReverseMap` — placeholder for required parameter when caller does not need the reverse-map projection (intentional no-arg path; tested for both call sites) |

Trivial-alias-adjacent: the function signature could be loosened to accept `OperationalToCanonicalReverseMap \| undefined`, at which point the cast disappears. Signature-tightening lane.

### `deferred-behavior-fix` (0 sites)

None in this category for `as_unknown_casts`.

### Unresolved bounded count: 9 sites

Sites in singleton files (`src/data/geography.ts`, `src/data/settlement_ethnicity.ts`, `src/scenario/campaign_unlock.ts`, etc.) follow the same JSON-parse pattern and are already classified as `schema-boundary` above.

---

## 4. `as_any_casts` Classification (319 sites, ~55 files)

### `diagnostic-harness` / `validator-tolerant-shape` (≈ 195 sites, 18 files)

CLI diagnostic harnesses and tolerant validators built to consume legacy/partial state shapes. These ARE NOT shipped sim code — they are operator/developer tooling. The `(state as any).foo?.bar` pattern is intentional: the validator tolerates pre-migration or partial state and reports gaps rather than throwing.

| File | Sites | Reason |
|---|---:|---|
| `src/cli/phase3abc_audit_harness.ts` | 33 | `(fp as any)[k]` dynamic key lookup across partial states |
| `src/cli/phase3a_ab_harness.ts` | 31 | Partial state literal construction (`{} as any`, `political: {} as any`) |
| `src/cli/sim_scenario.ts` | 27 | `(data as any).schema` JSON-parse-boundary reads inside CLI script |
| `src/cli/sim_front_state.ts` | 9 | Partial state |
| `src/cli/phaseD3_trace_missing_census_settlements.ts` | 8 | Diagnostic |
| `src/cli/sim_phase5_check.ts` | 4 | Diagnostic |
| `src/cli/phaseD2_settlement_count_reconcile_audit.ts` | 3 | Diagnostic |
| `src/cli/phaseF0_null_political_control_settlements_report.ts` | 3 | Diagnostic |
| `src/cli/phaseD0_political_control_inputs_audit.ts` | 2 | Diagnostic |
| Other `src/cli/*` (sum) | ~24 | Diagnostic singletons/2-counts (`mapkit_validate.ts`, `phaseE4_*`, `phaseF1_*`, `phaseF2_*`, `phaseF4_*`, `sim_formations.ts`, `sim_generate_formations.ts`, `sim_militia.ts`, `sim_negcap.ts`, `sim_run.ts`, `sim_set_posture.ts`, `sim_set_posture_region.ts`, `sim_treaty.ts`) |
| `src/validate/formations.ts` | 31 | `(state as any)?.military?.formations ?? (state as any)?.formations` legacy-shape-tolerant validator |
| `src/validate/militia_pools.ts` | 12 | Same pattern |
| `src/validate/end_state.ts` | 10 | `(endState as any).kind/treaty_id/since_turn/note` variant-discriminator access |
| `src/validate/front_segments.ts` | 9 | Same |
| `src/validate/front_posture.ts` | 7 | Same |
| `src/validate/front_posture_regions.ts` | 6 | Same |
| `src/validate/front_pressure.ts` | 5 | Same |
| `src/validate/factions.ts` | 2 | Same |
| `src/index.ts` | 3 | CLI entrypoint |

Tightening these would require the validators to commit to a fixed shape (the opposite of their design). **Out of scope** for strict-null cleanup; deferred indefinitely or owned by a separate "validator type-tightening" lane.

### `schema-boundary` (≈ 47 sites)

| File | Sites | Reason |
|---|---:|---|
| `src/state/save_migration.ts` | 23 | `(state as any).meta?.turn`, `(state as any).factions`, `asRecord((state as any).military)` reading pre-migration state shapes |
| `src/scenario/scenario_runner.ts` | 5 | Partial test-state `} as any` + scenario field tolerance |
| `src/state/political_control_init.ts` | 1 | `CANONICAL_IDS.includes(controller as any)` (trivial-alias under `FactionId = string`; minor cleanup) |
| Other `src/state/*` and `src/scenario/*` singletons | ~9 | Load-boundary tolerance |
| `src/sim/early_war/alliance_update.ts` | 1 | Cross-cluster optional-shape read |
| `src/sim/early_war/minority_erosion.ts` | 1 | Same |
| `src/sim/economy/smuggling_routes.ts` | 1 | Same |
| `src/sim/events/bot_response.ts` | 2 | Schema-boundary read |
| `src/sim/events/strategic_dimensions.ts` | 1 | Schema-boundary read |
| `src/sim/turn_phases/war_phase_negotiation_steps.ts` | 1 | Schema-boundary read |
| `src/sim/turn_phases/war_phases.ts` | 1 | Save-shape (per Batch 45 ledger) |
| Other singletons (`map/front_regions.ts`, etc.) | ~2 | One-off load-boundary |

Owned by save-migration lane (`save_migration.ts` is the dominant member) and the existing schema-validation plan. Not a trivial-cleanup target.

### `ui-adapter-boundary` (28 sites)

| File | Sites | Reason |
|---|---:|---|
| `src/ui/map/map/MapContainer.tsx` | 12 | MapLibre/Deck.gl plugin protocol & expression types not exposed via vendored typings (`pmtilesProtocol as any`, `deckOverlay as any`, `filterExpr ... as any`) — **library-boundary** sub-class |
| `src/ui/map/data/GameStateAdapter.ts` | 8 | Retained per Batch 48 stop-gate (1 JSON entry boundary, 4 Record-widening, 2 ternary-widening, 1 JSON-import) |
| `src/ui/map/components/SidePickerOverlay.tsx` | 2 | UI consumer read |
| `src/ui/map/components/ops_modal/OpsMap.tsx` | 2 | UI consumer read |
| `src/ui/map/components/army_hq/SupplyIntelligence.tsx` | 3 | UI consumer read |
| `src/ui/map/components/army_hq/ForceReadiness.tsx` | 2 | UI consumer read |
| `src/ui/map/components/plan_ui/OpsMapRenderer.ts` | 3 | UI consumer |
| `src/ui/map/data/diplomacyView.ts` | 1 | UI consumer |
| `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` | 3 | GeoJSON builder fixture |
| `src/ui/map/map/interactionLayerConfig.ts` | 1 | UI consumer |
| `src/ui/map/App.tsx` | 4 | Top-level UI |
| `src/ui/map/components/AiSettingsPanel.tsx` | 1 | UI consumer |
| `src/ui/warroom/warroom.ts` | 3 | Warroom consumer |
| `src/ui/warroom/map_viewer_app.ts` | 1 | Warroom consumer |

Some of these (especially `MapContainer.tsx` MapLibre/Deck.gl casts) are **library-boundary**: they require third-party `@types` upgrades, not strict-null cleanup.

### Comment / regex false-positive (1 site)

| File | Sites | Reason |
|---|---:|---|
| `src/state/territorial_valuation.ts` | 1 | Line 183 is a JSDoc comment fragment (`as any effectively controlled settlement`); regex false-positive |

Recommend documenting in the snapshot legend; rewriting the JSDoc to avoid the literal `as any` substring is harmless but cosmetic.

### `trivial-alias` candidates (≤8 sites total, distributed in singletons)

Only candidates suitable for a `Batch A: trivial alias-only` lane:
- `src/state/political_control_init.ts:231` — `CANONICAL_IDS.includes(controller as any)` (trivial-alias under `FactionId = string`)
- `src/state/territorial_valuation.ts:183` — JSDoc rewording (regex false-positive cleanup)

The remaining 317 sites are out of trivial-alias scope.

---

## 5. `non_null_assertions_dot` Classification (39 sites, 21 files)

### `runtime-invariant` (15 sites)

| File:Line | Pattern | Removal strategy |
|---|---|---|
| `src/sim/combat/corps_front_sectors.ts:178,182,209,323,576` (5) | `nodeProcess!.hrtime.bigint()` after module-level `nodeProcess: typeof process \| undefined` lookup | Tighten module-local `nodeProcess` to non-nullable after one-time guard; one local binding hoist removes all 5 sites |
| `src/sim/combat/corps_front_sectors.ts:1515` | `winnerEntry!.piece.edge_ids` after enclosing winner-resolution logic | Local binding |
| `src/sim/combat/corps_front_sectors.ts:2131` | `formations[brigadeId]!.elite_loan_state!.loaned_to_corps` chained | Local binding pair after lookup guard |
| `src/sim/combat/sector_offensive.ts:535` | `op.axes!.reduce(...)` after operation-shape predicate | Local binding |
| `src/sim/combat/sector_offensive.ts:783` | `op.active_probe!.started_turn` after `hasUnresolvedProbe(op)` | Local binding |
| `src/sim/recruitment_engine.ts:777` | `pool!.available += ...` after `if (!pool) continue` | Local binding |
| `src/sim/political/political_peace_plan.ts:224` | `acceptOption.dimension_shifts!.push(...)` after array-init guarantee | Local binding |
| `src/sim/endgame/endgame_comparison.ts:87` | `rupture!.recorded_turn!` after `Number.isFinite(rupture?.recorded_turn)` | Local binding |
| `src/scenario/anomaly_detector.ts:1006` | `assignment!.sector_id` inside `assignments.map(...)` Set construction; requires verification of upstream array-length narrowing | Local binding pending verification |

All removable as a single batch via local-binding refactor pattern (Batch 19 / Batch 41 precedents). Proving test: existing unit tests for the surrounding sim function are sufficient; no new test fixtures required.

### `trivial-alias` after guard (6 sites)

| File:Line | Pattern | Removal strategy |
|---|---|---|
| `src/sim/events/event_constraints.ts:70,76` (2) | `restriction.allowed_municipalities!.includes(...)` inside `if (restriction.allowed_municipalities)` truthy guard | Local binding hoist out of the `.filter` arrow |
| `src/sim/replay/replay_player.ts:71,72` (2) | `frame.metadata!.turn!` after `typeof frame.metadata?.turn === 'number'` | Local binding (`const t = frame.metadata?.turn; return t;`) |
| `src/scenario/scenario_runner.ts:1870,2450,2771,2772,2775` (5) | `replayTimelineStream!.write/end/on` after feature-flag-gated stream initialization | Hoist local non-nullable binding inside the gate; same Batch 19 stream-binding precedent |

### `save-shape-risk` (3 sites)

| File:Line | Pattern | Reason |
|---|---|---|
| `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts:274,278` (2) | `state.political.local_strain!.by_entity[entityId]` | Requires `state.political.local_strain` to be initialized; field optional on `PoliticalState` |
| `src/sim/turn_phases/war_phase_negotiation_steps.ts:76` | `context.state.military.negotiation!.pending_dayton = menu` | Negotiation state may be undefined pre-Dayton |
| `src/sim/turn_phases/war_phases.ts:???` (1) | Documented as save-shape per Batch 45 ledger |
| `src/state/displacement_takeover.ts:???` (1) | Documented as save-shape per Batch 46 ledger |

Cleanup requires save-migration / `validateGameState` initialization contract; not a strict-null lane.

### `ui-adapter-boundary` / JSX truthy-narrowing (10 sites)

Applies the Batch 42 `AutonomyPanel.tsx:148-150` precedent (predicate-variable → value-truthy narrowing):

| File | Sites |
|---|---:|
| `src/ui/map/map/MapContainer.tsx` | 3 |
| `src/ui/map/components/chronicle/generateWrappedSlides.ts` | 3 |
| `src/ui/map/components/CorpsFrontPanel.tsx` | 1 |
| `src/ui/map/components/OperationHistoryPanel.tsx` | 1 |
| `src/ui/map/components/army_hq/CommandRelationshipSection.tsx` | 1 |
| `src/ui/map/components/army_hq/SectorsSection.tsx` | 1 |
| `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` | 1 |

All UI-only; same risk profile as Batch 42. **Recommended Batch A**.

### `deferred-behavior-fix` (0 sites)

None in this category.

---

## 6. `non_null_assertions_index` Classification (43 sites, 19 files)

### `save-shape-risk` (30 sites)

| File | Sites | Field | Optionality |
|---|---:|---|---|
| `src/state/treaty_apply.ts` | 7 | `state.political.control_overrides![sid]`, `state.political.control_recognition![sid]` | Both fields optional on `PoliticalState`; populated by treaty acceptance only |
| `src/state/supply_reserves.ts` | 6 | `general_supply_reserve![factionKey]`, `heavy_munitions_reserve![factionKey]` | Documented save-shape per Batch 46 ledger |
| `src/sim/turn_phases/war_phases.ts` | 4 | Same as supply_reserves + `events_fired` | Documented save-shape per Batch 45 ledger |
| `src/sim/combat/commander_march_correction.ts` | 2 | `brigade_movement_state![bid]` | Documented save-shape per Batch 19 ledger |
| `src/sim/negotiation/counter_offer_generator.ts` | 2 | `status.last_counter_turn![faction]` | Optional negotiation state |
| `src/state/displacement.ts` | 2 | `displacement_state![route.to_mun]` | Documented save-shape per Batch 46 ledger |
| `src/state/displacement_state_utils.ts` | 1 | `civilian_casualties![factionId]` | Optional displacement field |
| `src/sim/formation_spawn.ts` | 3 | `state.military.formations![formationId] = ...` | Formations record always present in shipped scenarios but `?:` on `MilitaryState`; write idempotency depends on init |
| `src/sim/war_stories.ts` | 1 | `formations![id]` | Same as above (read) |
| `src/sim/recruitment_engine.ts` | 1 | `militia_pools![poolKey]` | Optional militia pool record |
| `src/scenario/scenario_runner.ts` | 2 | Partial-state writes during scenario harness setup | Setup-time only |

All save-shape sites stay deferred per the existing Batch 19 / 45 / 46 stop-gate: rewriting to an idempotent default-init shifts serialized save shape from `undefined` to `{}` on turn 0, breaking every downstream save hash. Defer to a dedicated save-schema lane.

### `runtime-invariant` (3 sites)

| File:Line | Pattern |
|---|---|
| `src/sim/combat/paramilitary_sweep.ts:619` | `cc![currentController] ??= { ... }` after enclosing controller-resolution guard |
| `src/sim/combat/sector_offensive.ts:366` | `state.military.brigade_movement_orders![bid] = ...` after init guard |
| `src/scenario/scenario_runner.ts:1535` | `state.political.coercion_pressure_by_municipality![munId] = ...` after creation step in same function |

Removable with local-binding refactor + focused tests.

### `deferred-behavior-fix` (3 sites)

| File:Line | Issue |
|---|---|
| `src/sim/early_war/minority_erosion.ts:123,124,126` (3) | `(state as any).war_militia_strength = {}` writes to top-level `state.war_militia_strength` (does not exist); `state.military.war_militia_strength` is the real field; the line-120 truthy check never fires because `militia_emergence.ts` already initializes the real field. **Latent bug** documented in Batch 40 ledger. Not a strict-null cleanup task; needs a behavior plan. |

### `ui-adapter-boundary` (7 sites)

| File | Sites |
|---|---:|
| `src/ui/map/map/builders/buildEthnicGeoJSON.ts` | 3 |
| `src/ui/map/map/builders/buildPoliticalMetricGeoJSON.ts` | 1 |
| `src/ui/map/map/builders/buildSupplyReachGeoJSON.ts` | 1 |
| `src/ui/map/components/DiplomacyOverview.tsx` | 1 |
| `src/ui/warroom/map_viewer_app.ts` | 1 |

Same risk profile as Batch 42 UI-only batch.

---

## 7. Recommended Next-Phase Batch Queue

The plan's Task 3 asks for "a first safe implementation batch of no more than 8 files." Three batches are scoped below.

### Batch A — UI-only trivial alias / JSX truthy-narrowing (recommended next batch)

**Class:** `trivial-alias` + `ui-adapter-boundary` JSX truthy-narrowing
**Risk:** UI-only; no sim behavior, no save-shape, no scenario data.
**Files (≤8):**
1. `src/ui/map/components/CorpsFrontPanel.tsx` (1 dot)
2. `src/ui/map/components/OperationHistoryPanel.tsx` (1 dot)
3. `src/ui/map/components/army_hq/CommandRelationshipSection.tsx` (1 dot)
4. `src/ui/map/components/army_hq/SectorsSection.tsx` (1 dot)
5. `src/ui/map/components/chronicle/generateWrappedSlides.ts` (3 dot)
6. `src/ui/map/map/builders/buildEthnicGeoJSON.ts` (3 index)
7. `src/ui/map/map/builders/buildPoliticalMetricGeoJSON.ts` (1 index)
8. `src/ui/map/map/builders/buildSupplyReachGeoJSON.ts` (1 index)

**Pattern:** Apply the Batch 42 `AutonomyPanel.tsx:148-150` predicate-variable → value-truthy narrowing precedent. Local-binding hoist for builder array sites.
**Expected inventory delta:** `non_null_assertions_dot` 39 → 32 (−7) and `non_null_assertions_index` 43 → 38 (−5).
**Validation:** `npm.cmd run typecheck` + `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` + UI focused tests; `npm.cmd run desktop:map:build` for the JSX/builder changes. Baselines not required (UI-only, no sim path).
**Stop gate:** Stop if any JSX truthy refactor requires moving the predicate boundary (i.e. the predicate is computed externally to the truthy branch). Document and skip the site.

### Batch B — Sim runtime-invariant cleanup with focused tests

**Class:** `runtime-invariant` and `trivial-alias` after guard
**Risk:** Sim behavior must be byte-identical; requires baseline run.
**Files (≤8):**
1. `src/sim/combat/corps_front_sectors.ts` (7 dot, all `nodeProcess!.` plus 2 enclosing-guard sites; addressed via a single non-nullable module-local `nodeProcess` binding + 2 local hoists)
2. `src/sim/combat/sector_offensive.ts` (2 dot — `op.axes!`, `op.active_probe!`)
3. `src/sim/events/event_constraints.ts` (2 dot — `.includes()` truthy-guarded hoists)
4. `src/sim/replay/replay_player.ts` (2 dot — `typeof === 'number'` narrowed reads)
5. `src/sim/political/political_peace_plan.ts` (1 dot — guaranteed array push)
6. `src/sim/endgame/endgame_comparison.ts` (1 dot — `Number.isFinite` narrowing)
7. `src/sim/recruitment_engine.ts` (1 dot — `if (!pool) continue` guard)
8. `src/scenario/scenario_runner.ts` (5 dot — replayTimelineStream feature-flag-gated, all in one local binding)

**Pattern:** Local-binding refactor pattern from Batch 19 / Batch 41 precedents. No new test fixtures; existing unit tests for surrounding sim functions are sufficient.
**Expected inventory delta:** `non_null_assertions_dot` 32 → 11 (−21) (combined with Batch A).
**Validation:** `npm.cmd run typecheck` + `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` + focused vitest suites for `corps_front_sectors`, `sector_offensive`, `event_constraints`, `replay`, `peace_plan`, `endgame`, `recruitment_engine`, `scenario_runner` + **`npm.cmd run test:baselines` PASS required** (sim-facing).
**Stop gate:** Stop if any local-binding refactor cannot prove byte-identical 40w. Stop if a target file is in active multi-agent edit lane (check `git status` before starting).

### Batch C — Schema-boundary validation plan (NOT immediate code)

**Class:** `schema-boundary`
**Risk:** Replacing `JSON.parse(x) as unknown` + downstream `as` narrowing with runtime validators changes runtime semantics on malformed input. Requires a written schema-validation plan owning the contract before implementation.
**Files (≤12, by inventory weight):**
- `src/scenario/scenario_loader.ts` (8 unknown)
- `src/state/war_timeline.ts` (8 unknown)
- `src/state/political_control_init.ts` (7 unknown)
- `src/scenario/oob_loader.ts` (6 unknown)
- `src/scenario/brigade_temporal_emit.ts` (5 unknown)
- `src/sim/briefing/collect_briefing.ts` (4 unknown)
- `src/desktop/desktop_sim.ts` (3 unknown)
- `src/state/serialize.ts` (3 unknown)
- `src/state/validateGameState.ts` (2 unknown)
- `src/sim/replay/replay_frame_summary.ts` (2 unknown)
- `src/sim/ai_commander/war_dispatches.ts` (2 unknown)
- `src/sim/combat/sector_offensive_launch_helpers.ts` (2 unknown — signature-tightening)

**Pattern:** Each file needs a `parse<X>(raw: unknown): X | null` helper with `typeof`/`isRecord`/`Array.isArray` narrowing chains, in the spirit of the Batch 49 `parseFactionId` / `parseAdvisorContextType` helpers. Helpers may live in `src/state/schema_validators.ts` (new file) or co-located.
**Required before implementation:** A dedicated schema-validation plan (`docs/plans/2026-MM-DD-strict-null-schema-validation-plan.md`) that lists the helper contracts, the fallback semantics narrowing for each loader, and the explicit save-shape gate for state-shape readers.
**Stop gate:** Stop if any helper changes runtime semantics for valid inputs. Stop if helper would require schema changes that break existing saves. Stop if `validateGameState.ts` and `save_migration.ts` are touched (separate lane).

### Deferred (not in next 3 batches)

| Group | Reason |
|---|---|
| CLI/validate `as any` diagnostic harness (≈ 195 sites, 18 files) | Out of strict-null scope; validators tolerate partial state by design. Owned by a separate "validator type-tightening" lane only if validators commit to a fixed shape. |
| `save_migration.ts` `as any` (23 sites) | Save-migration lane; requires schema-versioning decisions. |
| `GameStateAdapter.ts` 8 `as any` + 2 `as FactionId` (10 sites) | Phase 5 chokepoint; closed at Batch 48 floor. Cleanup blocked until contract decisions (UI/engine FactionId unification, JSON-schema validation for `historicalBaseline`, `parseGameState` external input). |
| `MapContainer.tsx` 12 `as any` library-boundary (12 sites) | Requires MapLibre / Deck.gl `@types` upgrades. |
| `state.political.control_overrides![sid]` + sibling treaty/displacement/supply/negotiation index assertions (≈ 30 sites) | Save-shape; documented stop-gate from Batches 19/40/45/46/47. Defer to save-schema lane. |
| `state.war_militia_strength` triple assertion in `minority_erosion.ts` (3 sites) | Latent **deferred-behavior-fix**; needs new behavior plan, not strict-null cleanup. |
| `optional_fields_game_state` (463 fields) | Save-migration / default-decision lane. Out of strict-null cast cleanup. |

---

## 8. Stop Gates Re-Confirmed Against Current Tree

Per the plan's stop gates:

| Gate | Status |
|---|---|
| Inventory counts match current main plus accepted parser delta | ✅ 2/319/80/39/43 confirms Batch 49 (`as_factionid_casts` −1, `non_null_assertions_dot` −1) |
| No source cleanup proposed that looks like a behavior fix | ✅ Batch A and B are pure type erasure / local-binding refactors. `minority_erosion.ts` latent bug stays deferred. |
| Optional `GameState` promotion not required for next 3 batches | ✅ All `save-shape-risk` sites stay deferred. |
| `GameStateAdapter.ts` cleanup does not require engine schema changes | ✅ The 10 retained sites stay retained. No GameStateAdapter edits proposed. |
| No batch mixes schema validation with trivial-alias cleanup | ✅ Batch A (trivial alias UI) and Batch B (runtime invariant sim) are separate from Batch C (schema-boundary plan). |

---

## 9. Verification Performed

```powershell
git status --short --branch           # clean except .claude/settings.local.json + data/derived/latest_run_final_save.json
git log --oneline --decorate -8       # HEAD = 1321c0ac
node tools\diagnostics\strict_null_inventory.cjs > data\derived\_debug\strict_null_inventory_post_factionid.json   # 9030 lines
git diff --check                      # clean (no edits to source/tests)
```

Typecheck / vitest / baselines not run: per the plan's "No baseline run is needed for a classification-only docs/test-cap pass unless source files change" gate. No source files or tests were modified.

---

## 10. Handoff

- **First recommended safe batch (Batch A):** 8 UI-only files, expected delta `non_null_assertions_dot` 39→32, `non_null_assertions_index` 43→38. Validation gated by typecheck + strict-null inventory test + `npm.cmd run desktop:map:build`; baselines not required.
- **Next batch after that (Batch B):** 8 sim files, expected delta `non_null_assertions_dot` 32→11. Validation gated by typecheck + focused vitest suites + **`npm.cmd run test:baselines` PASS required**.
- **Third batch (Batch C):** Plan-only — author a schema-validation plan, do not write cleanup code.
- **Deferred / stop-gated items:** ≈ 280 sites across CLI/validate diagnostic harness, save migration, GameStateAdapter Phase 5, MapContainer library boundary, save-shape state writes, and the `minority_erosion.ts` latent behavior bug. All documented above with class + owner.
- **`strictNullChecks` migration is NOT closed.** Closing requires Batches A + B + C + a save-shape/behavior lane + UI/engine FactionId unification + validator type-tightening lane.
