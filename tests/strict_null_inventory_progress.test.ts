import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PHASE_1_FILES = [
    'src/state/game_state.ts',
    'src/state/serialize.ts',
    'src/state/validateGameState.ts',
    'src/state/displacement.ts',
    'src/state/supply_reserves.ts',
];

const PHASE_2_COMBAT_BATCH_4_FILES = [
    'src/sim/combat/army_co_roster_loader.ts',
    'src/sim/combat/attack_casualty_distribution.ts',
    'src/sim/combat/combat_estimate.ts',
];

const PHASE_2_COMBAT_BATCH_5_FILES = [
    'src/sim/combat/combat_math.ts',
    'src/sim/combat/faction_progression.ts',
    'src/sim/combat/operation_casualty_attribution.ts',
    'src/sim/combat/warlord_friction.ts',
];

const PHASE_2_COMBAT_BATCH_7_FILES = [
    'src/sim/combat/attack_history_recording.ts',
    'src/sim/combat/commander/briefing.ts',
    'src/sim/combat/exhaustion.ts',
    'src/sim/combat/militia_garrison.ts',
    'src/sim/combat/osid_graph_analysis.ts',
];

const PHASE_2_COMBAT_BATCH_8_FILES = [
    'src/sim/combat/brigade_movement_query.ts',
];

const PHASE_2_COMBAT_BATCH_9_FILES = [
    'src/sim/combat/bot_brigade_eval_attack.ts',
];

const PHASE_2_COMBAT_BATCH_10_FILES = [
    'src/sim/combat/hv_integration.ts',
    'src/sim/combat/sector_splitting.ts',
];

const PHASE_2_COMBAT_BATCH_11_FILES = [
    'src/sim/combat/brigade_home_return.ts',
    'src/sim/combat/brigade_movement.ts',
    'src/sim/combat/brigade_front_distribution.ts',
];

const PHASE_2_COMBAT_BATCH_12_FILES = [
    'src/sim/combat/rear_pocket_consolidation.ts',
    'src/sim/combat/sector_rearrangement.ts',
    'src/sim/combat/subsegment_assignment.ts',
];

const PHASE_2_COMBAT_BATCH_13_FILES = [
    'src/sim/combat/ongoing_mobilization.ts',
];

const PHASE_2_COMBAT_BATCH_14_FILES = [
    'src/sim/combat/jna_phantom_brigades.ts',
];

const PHASE_2_COMBAT_BATCH_15_FILES = [
    'src/sim/combat/army_reserve_system.ts',
];

const PHASE_2_COMBAT_BATCH_16_FILES = [
    'src/sim/combat/army_order_interpretation.ts',
];

const PHASE_2_COMBAT_BATCH_17_FILES = [
    'src/sim/combat/attack_retreat_displacement.ts',
];

const PHASE_2_COMBAT_BATCH_19_FILES = [
    'src/sim/combat/bot_brigade_ai_osid.ts',
    'src/sim/combat/bot_brigade_eval_front.ts',
    'src/sim/combat/officer_system.ts',
    'src/sim/combat/operation_preparation.ts',
    'src/sim/combat/osid_column_movement.ts',
];

const PHASE_2_COMBAT_BATCH_20_FILES = [
    'src/sim/combat/attack_resolution_osid.ts',
    'src/sim/combat/commander/emit.ts',
    'src/sim/combat/commander/plan.ts',
];

const PHASE_2_COMBAT_BATCH_18_FILES = [
    'src/sim/combat/battle_resolution.ts',
    'src/sim/combat/combat_predictor.ts',
    'src/sim/combat/commander/force_eval.ts',
    'src/sim/combat/corps_operation_readiness.ts',
    'src/sim/combat/front_emergence.ts',
];

const PHASE_3_EARLY_WAR_BATCH_39_FILES = [
    'src/sim/bot/simple_general_bot.ts',
    'src/sim/early_war/authority_degradation.ts',
    'src/sim/early_war/militia_emergence.ts',
];

const PHASE_3_EARLY_WAR_BATCH_40_FILES = [
    'src/sim/early_war/control_flip.ts',
    'src/sim/early_war/control_strain.ts',
    'src/sim/early_war/minority_militia_decay.ts',
    'src/sim/early_war/pool_population.ts',
];

const PHASE_4_SCENARIO_BATCH_41_FILES = [
    'src/scenario/combat_causality.ts',
    'src/scenario/oob_early_war_entry.ts',
];

const PHASE_6_WARROOM_BATCH_42_FILES = [
    'src/ui/warroom/components/FactionOverviewPanel.ts',
    'src/ui/warroom/components/IvpBreakdownModal.ts',
    'src/ui/warroom/components/NewspaperModal.ts',
    'src/ui/warroom/components/ReportsModal.ts',
    'src/ui/warroom/components/warroom_utils.ts',
    'src/ui/warroom/data/war_data_extractor.ts',
];

const SIM_NON_COMBAT_BATCH_43_FILES = [
    'src/sim/codex/dynamic_section_builder.ts',
    'src/sim/compile_turn_summary.ts',
    'src/sim/consolidation_scoring.ts',
    'src/sim/events/evaluate_events.ts',
    'src/sim/local_truces.ts',
];

// Batch 44 lists only the files that are FULLY clean across all
// inventory categories. desktop_sim.ts, corps_dialogue.ts, and
// political_control_init.ts retain non-FactionId-cast escapes (as_unknown
// state-shape widenings + JSON.parse(...) as unknown loader guards) that
// are out of scope for this lane per the safe-slice stop-gates.
const STATE_SIM_DESKTOP_BATCH_44_FILES = [
    'src/sim/negotiation/compute_combat_effective.ts',
    'src/sim/turn_phases/early_war_phases.ts',
    'src/state/assignable_front_segments.ts',
    'src/state/seed_organizational_penetration_from_control.ts',
];

const WAR_PIPELINE_BATCH_45_FILES = [
    'src/sim/turn_phases/war_phases.ts',
];

const WAR_PHASES_NON_NULL_TAIL_FILES = [
    'src/sim/turn_phases/war_phases.ts',
];

const STATE_BATCH_46_FILES = [
    'src/state/displacement.ts',
    'src/state/displacement_takeover.ts',
    'src/state/supply_reserves.ts',
];

const PHASE_2_COMBAT_BATCH_47_FILES = [
    'src/sim/combat/paramilitary_sweep.ts',
    'src/sim/combat/sector_offensive.ts',
    'src/sim/combat/sector_building.ts',
    'src/sim/combat/supply_condition.ts',
];

const PHASE_5_ADAPTER_BATCH_48_FILES = [
    'src/ui/map/data/GameStateAdapter.ts',
];

const AI_COMMANDER_BATCH_49_FILES = [
    'src/sim/ai_commander/response_parser.ts',
];

// Batch C (Strict-Null schema-boundary lane, 2026-05-21): each of the twelve
// files in scope had its `as_unknown_casts` count driven to zero. Per-file
// slice constants pin the floor so future edits cannot silently regress.
// Plan: docs/plans/2026-05-20-strict-null-schema-boundary-validation-plan.md
const BATCH_C_SECTOR_OFFENSIVE_LAUNCH_HELPERS_FILES = [
    'src/sim/combat/sector_offensive_launch_helpers.ts',
];
const BATCH_C_VALIDATE_GAME_STATE_FILES = [
    'src/state/validateGameState.ts',
];
const BATCH_C_REPLAY_FRAME_SUMMARY_FILES = [
    'src/sim/replay/replay_frame_summary.ts',
];
const BATCH_C_WAR_DISPATCHES_FILES = [
    'src/sim/ai_commander/war_dispatches.ts',
];
const BATCH_C_DESKTOP_SIM_FILES = [
    'src/desktop/desktop_sim.ts',
];
const BATCH_C_COLLECT_BRIEFING_FILES = [
    'src/sim/briefing/collect_briefing.ts',
];
const BATCH_C_SERIALIZE_FILES = [
    'src/state/serialize.ts',
];
const BATCH_C_POLITICAL_CONTROL_INIT_FILES = [
    'src/state/political_control_init.ts',
];
const BATCH_C_OOB_LOADER_FILES = [
    'src/scenario/oob_loader.ts',
];
const BATCH_C_SCENARIO_LOADER_FILES = [
    'src/scenario/scenario_loader.ts',
];
const BATCH_C_WAR_TIMELINE_FILES = [
    'src/state/war_timeline.ts',
];
const BATCH_C_BRIGADE_TEMPORAL_EMIT_FILES = [
    'src/scenario/brigade_temporal_emit.ts',
];

const POST_BATCH_C_UNKNOWN_TAIL_FILES = [
    'src/scenario/scenario_runner.ts',
    'src/sim/ai_commander/prompt_builder.ts',
    'src/ui/map/components/AutonomyPanel.tsx',
    'src/ui/map/components/SituationTab.tsx',
    'src/ui/map/components/icons/Icon.tsx',
    'src/ui/map/components/warroom/AdvanceTurnModal.tsx',
    'src/ui/map/desktop/useIPC.ts',
    'src/ui/map/scripts/debugLoadSave.ts',
    'src/ui/warroom/ClickableRegionManager.ts',
];

const VALIDATE_FORMATIONS_AS_ANY_TAIL_FILES = [
    'src/validate/formations.ts',
];

const VALIDATE_MILITIA_POOLS_AS_ANY_TAIL_FILES = [
    'src/validate/militia_pools.ts',
];

const VALIDATE_END_STATE_AS_ANY_TAIL_FILES = [
    'src/validate/end_state.ts',
];

const VALIDATE_FRONT_SEGMENTS_AS_ANY_TAIL_FILES = [
    'src/validate/front_segments.ts',
];

const VALIDATE_FRONT_STATE_AS_ANY_TAIL_FILES = [
    'src/validate/front_posture.ts',
    'src/validate/front_posture_regions.ts',
    'src/validate/front_pressure.ts',
];

const UI_CORPS_FRONT_LINES_AS_ANY_TAIL_FILES = [
    'src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts',
];

const UI_MAP_NON_NULL_TAIL_FILES = [
    'src/ui/map/map/MapContainer.tsx',
    'src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts',
];

const SAFE_UNKNOWN_TAIL_FILES = [
    'src/sim/ai_commander/corps_dialogue.ts',
    'src/sim/negotiation/scoring.ts',
];

const VALIDATE_FACTIONS_SUPPLY_RIGHTS_AS_ANY_TAIL_FILES = [
    'src/validate/factions.ts',
    'src/validate/supply_rights.ts',
];

const LOW_RISK_AS_ANY_LEAF_FILES = [
    'src/map/front_regions.ts',
    'src/sim/economy/smuggling_routes.ts',
    'src/sim/events/strategic_dimensions.ts',
    'src/sim/early_war/alliance_update.ts',
    'src/state/territorial_valuation.ts',
    'src/state/political_control_init.ts',
    'src/ui/map/data/diplomacyView.ts',
];

const UI_WINDOW_BRIDGE_AS_ANY_TAIL_FILES = [
    'src/ui/map/App.tsx',
    'src/ui/map/components/SidePickerOverlay.tsx',
];

const BOT_RESPONSE_INTERACTION_LAYER_AS_ANY_TAIL_FILES = [
    'src/sim/events/bot_response.ts',
    'src/ui/map/map/interactionLayerConfig.ts',
];

const CLI_POLITICAL_SIDE_MAPKIT_AS_ANY_TAIL_FILES = [
    'src/cli/mapkit_validate.ts',
    'src/cli/sim_formations.ts',
    'src/cli/sim_generate_formations.ts',
    'src/cli/sim_militia.ts',
    'src/cli/sim_negcap.ts',
    'src/cli/sim_phase5_check.ts',
    'src/cli/sim_set_posture.ts',
    'src/cli/sim_set_posture_region.ts',
];

const CORE_SINGLETON_AS_ANY_TAIL_FILES = [
    'src/state/serialize.ts',
    'src/state/validateGameState.ts',
    'src/sim/turn_phases/war_phase_negotiation_steps.ts',
    'src/sim/turn_phases/war_phases.ts',
];

const AI_SETTINGS_PANEL_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/AiSettingsPanel.tsx',
];

const CLI_FRONT_STATE_AS_ANY_TAIL_FILES = [
    'src/cli/sim_front_state.ts',
];

const POLITICAL_CONTROL_AUDIT_CLI_AS_ANY_TAIL_FILES = [
    'src/cli/phaseD0_political_control_inputs_audit.ts',
    'src/cli/phaseE4_null_political_control_diagnosis.ts',
];

const CLI_TREATY_AS_ANY_TAIL_FILES = [
    'src/cli/sim_treaty.ts',
];

const UI_WARROOM_DIPLOMACY_STRICT_NULL_TAIL_FILES = [
    'src/ui/warroom/map_viewer_app.ts',
    'src/ui/map/components/DiplomacyOverview.tsx',
];

const EVENT_EFFECTS_LOADED_STATE_UNKNOWN_TAIL_FILES = [
    'src/sim/events/apply_effects.ts',
    'src/ui/map/__mocks__/loadedGameState.ts',
];

const FORCE_READINESS_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/army_hq/ForceReadiness.tsx',
];

const SUPPLY_INTELLIGENCE_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/army_hq/SupplyIntelligence.tsx',
];

const OPS_MAP_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/ops_modal/OpsMap.tsx',
];

const PHASE_D2_SETTLEMENT_RECONCILE_AS_ANY_TAIL_FILES = [
    'src/cli/phaseD2_settlement_count_reconcile_audit.ts',
];

const PHASE_D3_TRACE_MISSING_CENSUS_AS_ANY_TAIL_FILES = [
    'src/cli/phaseD3_trace_missing_census_settlements.ts',
];

const PHASE_F0_NULL_CONTROL_AS_ANY_TAIL_FILES = [
    'src/cli/phaseF0_null_political_control_settlements_report.ts',
];

const PHASE_F1_UNKNOWN_CONTROL_AS_ANY_TAIL_FILES = [
    'src/cli/phaseF1_unknown_control_behavior_audit.ts',
];

const PHASE_F2_CONTROLSTATUS_AS_ANY_TAIL_FILES = [
    'src/cli/phaseF2_controlstatus_migration_audit.ts',
];

const PHASE_F4_UNKNOWN_ATTRIBUTION_AS_ANY_TAIL_FILES = [
    'src/cli/phaseF4_unknown_control_attribution_audit.ts',
];

const SMOKE_ENTRYPOINT_AS_ANY_TAIL_FILES = [
    'src/cli/sim_run.ts',
    'src/index.ts',
];

const OPS_MAP_RENDERER_AS_ANY_TAIL_FILES = [
    'src/ui/map/components/plan_ui/OpsMapRenderer.ts',
];

const MAP_CONTAINER_AS_ANY_TAIL_FILES = [
    'src/ui/map/map/MapContainer.tsx',
];

const WARROOM_MOCK_STATE_STRICT_NULL_TAIL_FILES = [
    'src/ui/warroom/warroom.ts',
];

const VERDICT_SCREEN_CODEX_UNKNOWN_TAIL_FILES = [
    'src/ui/map/components/VerdictScreen.tsx',
];

const SCENARIO_RUNNER_AS_ANY_TAIL_FILES = [
    'src/scenario/scenario_runner.ts',
];

const SIM_SCENARIO_AS_ANY_TAIL_FILES = [
    'src/cli/sim_scenario.ts',
];

const PHASE3A_AB_HARNESS_AS_ANY_TAIL_FILES = [
    'src/cli/phase3a_ab_harness.ts',
];

const PHASE3ABC_AUDIT_HARNESS_AS_ANY_TAIL_FILES = [
    'src/cli/phase3abc_audit_harness.ts',
];

const SAVE_MIGRATION_AS_ANY_TAIL_FILES = [
    'src/state/save_migration.ts',
];

const RUNTIME_NON_NULL_ASSERTION_TAIL_FILES = [
    'src/scenario/anomaly_detector.ts',
    'src/scenario/scenario_runner.ts',
    'src/sim/negotiation/counter_offer_generator.ts',
    'src/state/displacement_takeover.ts',
];

const RUNTIME_NON_NULL_ASSERTION_TAIL_2_FILES = [
    'src/sim/combat/sector_offensive.ts',
    'src/sim/turn_phases/war_phase_negotiation_steps.ts',
    'src/sim/war_stories.ts',
    'src/state/displacement_state_utils.ts',
];

const RUNTIME_NON_NULL_ASSERTION_TAIL_3_FILES = [
    'src/sim/combat/commander_march_correction.ts',
    'src/sim/combat/paramilitary_sweep.ts',
    'src/sim/early_war/minority_erosion.ts',
];

const RUNTIME_NON_NULL_ASSERTION_TAIL_4_FILES = [
    'src/sim/formation_spawn.ts',
];

const RECRUITMENT_ENGINE_NON_NULL_TAIL_FILES = [
    'src/sim/recruitment_engine.ts',
];

const PHASE3C_EXHAUSTION_GATING_NON_NULL_TAIL_FILES = [
    'src/sim/pressure/phase3c_exhaustion_collapse_gating.ts',
];

const SUPPLY_RESERVES_NON_NULL_TAIL_FILES = [
    'src/state/supply_reserves.ts',
];

const DISPLACEMENT_NON_NULL_TAIL_FILES = [
    'src/state/displacement.ts',
];

const TREATY_APPLY_NON_NULL_TAIL_FILES = [
    'src/state/treaty_apply.ts',
];

// The Phase 5 GameStateAdapter tail is closed for inventory-counted escapes.
// The historical Batch 48 list below records the former retained sites:
//   - 1 JSON entry boundary at L401 (`json: unknown` → `any`)
//   - 4 `Record<string, unknown>` field widenings at L551/607/665/736
//     (f.ops, f.combat_summary, f.brigade_history × 2 — load-bearing for
//     downstream free-form property access through the FormationRecord
//     `Record<string, unknown>` boundary)
//   - 2 multi-branch ternary widenings at L934 + L2278 (`activeOps` /
//     `opsArray` joining a typed-array branch with a `[singleton]` branch)
//   - 1 JSON-import baseline cast at L2916 (`historicalBaseline as any`
//     to bypass structural mismatch with the `HistoricalBaseline` interface
//     across a JSON resolve)
//   - 2 UI-local literal-union `FactionId` casts at L1842 + L1863 — the
//     UI `FactionId` in `src/ui/map/data/types.ts:8` is the literal union
//     `'RS' | 'RBiH' | 'HRHB' | null` and SHADOWS the engine
//     `FactionId = string` alias from `src/state/game_state.ts:45`; the
//     `string` source value (`ENCLAVE_UI_DEFINITIONS[i].faction`) does not
//     structurally match the literal union without the cast.
const ACCEPTED_PHASE_5_ADAPTER_BATCH_48_REMAINING = 0;

const ESCAPE_CATEGORIES = [
    'as_factionid_casts',
    'as_unknown_casts',
    'as_any_casts',
    'non_null_assertions_dot',
    'non_null_assertions_index',
] as const;

const ACCEPTED_PHASE_1_REMAINING_ESCAPE_HATCHES = 25;

type EscapeCategory = typeof ESCAPE_CATEGORIES[number];

interface InventoryCategory {
    counts_by_file?: Record<string, number>;
}

interface StrictNullInventory {
    counts: Record<string, number>;
    categories: Record<string, InventoryCategory>;
    optional_field_domains: {
        total: number;
        domain_counts: Record<string, number>;
        unknown_justifications: unknown[];
    };
    optional_field_interfaces: {
        interfaces: Array<{
            interface: string;
            domain: string;
            count: number;
            fields: string[];
        }>;
    };
}

function phaseCount(inventory: StrictNullInventory, category: EscapeCategory, files: readonly string[]): number {
    const countsByFile = inventory.categories[category]?.counts_by_file ?? {};
    return files.reduce((sum, file) => sum + (countsByFile[resolve(file)] ?? 0), 0);
}

describe('strict null inventory progress', () => {
    it('pins the optional GameState contract domain floor after current escape closeout', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // TG activation (commit 0b681ffe, flags default-ON) added +5 optional GameState fields in
        // the `sim` domain (TG/Army-HQ/OG-promotion state: e.g. ArmyHqOperation.tg_id,
        // CorpsOperation.{army_hq_op_id,tg_commander_officer_id,op_kind_donor_policy},
        // MilitaryState.{tg_recent_compositions,tg_formations_by_corps,og_promotions,army_hq_*},
        // FormationState.{tg_recovery_suppressed_until_turn,tg_donations_this_scenario}), so
        // 482 → 487 / sim 312 → 317; then +1 → 488 / sim 318 for the new optional
        // CorpsOperation.army_hq_telemetry_snapshot (AAR Army-HQ telemetry sidecar snapshotted
        // at beginRecovery so finalizeOperationAAR can emit it after TG dissolution — #48,
        // telemetry-only, behaviorally hash-neutral on territory/anchors). The as_unknown_casts (3) and non_null_assertions_dot (7)
        // escape hatches live in src/ui/map/data/backTheOfficer.ts (TG-UI surfacing, commit
        // 9fede550 — predates this activation); they are existing accepted UI-layer hatches.
        // Free War Phase 0 (decision_mode de-railroad) added +1 optional GameState
        // field in the `state` domain (GameStateMeta.decision_mode, an optional
        // 'historical' | 'emergent' in src/state/game_state.ts), so 488 → 489 /
        // state 162 → 163. Unset = historical = byte-identical baseline; the field
        // gates the bot event-decision scorer (emergent) vs the historical railroad.
        // Free War Phase 4 (author-new-op, #67) added +12 optional GameState fields:
        //   - AuthoredOpDef (new interface, classifyDomain → `state` via game_state.ts
        //     path): axes, sector_id, staging_osid, target_settlements, tempo,
        //     min_attack_outcome, schwerpunkt_osid, artillery_preparation,
        //     planning_duration = +9 state.
        //   - CorpsCommandState (classifyDomain → `sim` via /Corps/): pending_authored_op,
        //     authored_op_rejection = +2 sim.
        //   - CorpsOperation (classifyDomain → `sim` via /Corps|Operation/):
        //     authored_by_player = +1 sim.
        // So 489 → 501 / state 163 → 172 / sim 318 → 321. All OPTIONAL → absent in
        // old saves and all headless scenarios → byte-identical baseline by construction.
        // STOP-OP presidential lever (Presidential Command Model slice 1/N) added +2
        // optional GameState fields on CorpsCommandState (classifyDomain → `sim` via
        // /Corps/): pending_op_halt, halted_op_record. So 501 → 503 / sim 321 → 323.
        // Both OPTIONAL → absent in old saves and all headless scenarios → byte-identical
        // baseline by construction (apply-op-halts early-outs when none staged).
        // REQUEST-OP presidential lever (Presidential Command Model slice 2/N) added +3
        // optional GameState fields (all classifyDomain → `sim`):
        //   - CorpsCommandState (via /Corps/): pending_op_directive, op_directive_rejection = +2 sim.
        //   - CorpsOperation (via /Corps|Operation/): requested_by_president = +1 sim.
        // So 503 → 506 / sim 323 → 326. All OPTIONAL → absent in old saves and all headless
        // scenarios → byte-identical baseline by construction (inject-op-directive early-outs
        // when none staged).
        // REPLACE-CO presidential lever (Presidential Command Model slice 3/N) added +2
        // optional GameState fields on CorpsCommandState (classifyDomain → `sim` via
        // /Corps/): pending_co_replacement, co_replacement_record. So 506 → 508 / sim 326 → 328.
        // Both OPTIONAL → absent in old saves and all headless scenarios → byte-identical
        // baseline by construction (apply-co-replacements early-outs when none staged).
        // Patron-defiance consequence-receipt (Slice 4a) added +1 optional GameState field
        // on MilitaryState (classifyDomain → `sim` via /Military/): patron_defiance_supply_cuts.
        // So 508 → 509 / sim 328 → 329. OPTIONAL append-only → absent in old saves and all
        // headless/historical scenarios (written only inside decision_mode === 'emergent' on a
        // non-zero cut) → byte-identical baseline by construction.
        // B7 Sarajevo lifeline substrate (PR #271) added +1 optional GameState field on
        // SarajevoState (classifyDomain → `state` via game_state.ts path): `lifeline`
        // (SiegeLifelineState). So 507 → 508 / state 172 → 173. OPTIONAL + re-derived each
        // turn → absent on every flag-OFF run (ENABLE_SARAJEVO_LIFELINE default-OFF) and on
        // legacy saves → byte-identical baseline by construction (40w bb0462f4d37dab2d / 188w
        // 0abca945388ddb59 unchanged). No new type-escape cast: as_factionid_casts / as_any_casts /
        // as_unknown_casts / non_null_assertions all UNCHANGED — this bump is purely the
        // optional-field ratchet recording the contract-mandated new persisted field.
        // Command-friction lane: +1 optional field `command_friction_record` on
        // CorpsCommandState (game_state.ts:819, sim domain). So 508 → 509 / sim
        // 327 → 328. OPTIONAL + written ONLY by the two player-only apply paths
        // (replace-CO / force-op consequences) → absent on every headless/historical
        // run → byte-identical baseline by construction (40w bb0462f4d37dab2d / 188w
        // 0abca945388ddb59 unchanged).
        // Dayton build P1-3 (#277): +2 optional GameState-reachable fields
        // (peace_dysfunction_index / entity_autonomy_index on the Dayton/verdict path —
        // post-w188, so 40w/52w byte-identical) → 509→511 / derived 8→10. +1 as_unknown:
        // one contained JSON-import double-cast `osidAreas as unknown as OsidAreaData`
        // (package_area_resolver.ts), the established typed-JSON-import idiom (joins the
        // existing 3). non_null_assertions / as_factionid / as_any UNCHANGED.
        // FORCE-LAUNCH patron-cost lane (#327): +1 optional field
        // `force_launch_consequence_applied` on CorpsOperation (game_state.ts, sim domain) —
        // the one-shot guard that marks an op's force-launch-over-objection patron cost as
        // charged. So 511 → 512 / sim 328 → 329. OPTIONAL + set ONLY on the player-only
        // force-launch apply path (was_force_launched is never set on the bot/headless path)
        // → absent on every headless/historical run → byte-identical baseline by construction
        // (40w 235c61f408dc3d95 unchanged). No new type-escape: the apply step narrows via an
        // `if (!cmd ...) continue` guard, so as_factionid / as_unknown / as_any /
        // non_null_assertions are ALL UNCHANGED — this bump is purely the optional-field ratchet.
        // VRS contain-posture lane (#339): +1 optional field
        // `last_contained_osids_by_faction` on PoliticalState (game_state.ts → `state`
        // domain via the "Political" interface-name match). So 512 → 513 / state 173 → 174.
        // OPTIONAL + written ONLY when `AWWV_VRS_CONTAIN_POSTURE` is enabled (the war_phases
        // compute block early-skips via `if (isVrsContainPostureEnabled())`, and the §6
        // strangle-not-capture posture is default-OFF) → absent on every headless/historical
        // run → byte-identical baseline by construction (40w 235c61f408dc3d95 unchanged). No
        // new type-escape: the contain build's new src code (contain_posture_gate.ts /
        // enclave_resilience.ts / commander/plan.ts / war_phases.ts compute block) uses the
        // `'RS'` string literal, NOT an `as FactionId` cast, so as_factionid (still 1) /
        // as_unknown / as_any / non_null_assertions are ALL UNCHANGED — this bump is purely
        // the optional-field ratchet recording the contract-mandated new persisted field.
        expect(current.counts).toMatchObject({
            as_factionid_casts: 1,
            as_unknown_casts: 4,
            as_any_casts: 0,
            non_null_assertions_dot: 7,
            non_null_assertions_index: 0,
            // A2 close-out (#71): +1 optional field `StateMeta.dayton_close_out` (the
            // default-off scenario flag arming the Dayton terminal verdict). state domain,
            // player/scenario-gated → byte-identical when unset. 513→514 / state 174→175.
            // Displacement v36 (per-OSID flow tally): +1 optional field
            // `DisplacementDomainState.displacement_flows_by_osid[].by_ethnicity` (the
            // optional per-OSID per-ethnicity breakdown inside the new read-model substrate).
            // state domain; read-model only → calibration byte-identical. 514→515 / state 175→176.
            // Robustness audit P1-B (task #95): +1 optional field
            // `MilitaryState.event_effect_anomalies` (append-only diagnostic log of REJECTED
            // non-finite event-effect payloads; writer recordNonFiniteEffectAnomaly in
            // apply_effects.ts). sim domain (/Military/ match). Written ONLY when an effect
            // carries a NaN/±Infinity payload — never on hand-authored finite historical data
            // → absent on every calibration run → byte-identical baseline by construction.
            // 515→516 / sim 329→330. No new type-escape casts.
            // War-weariness Chronicle #402: +1 optional field
            // `PoliticalState.war_weariness_band_first_reached` (the OBSERVATIONAL
            // first-crossing turn anchor per faction/FEEL-band, recorded by
            // recordWarWearinessBandCrossings in src/state/exhaustion.ts). state domain
            // (PoliticalState → "Political" interface match). Written ONLY once a faction
            // crosses a band; PURELY OBSERVATIONAL (no sim code reads it → control/
            // territory/ops byte-identical). Absent on a steady-only/legacy save → the
            // no-crossing path is byte-identical. The 40w final save gains this anchor
            // once crossings occur (a clean, honest ratchet of newly-realized info, NOT a
            // behavior change). No new type-escape casts (uses sorted localeCompare, the
            // 'strained'|'cracking'|'collapsing' literals, and the WarWearinessBand alias).
            // 516→517 / state 176→177.
            // Command-anchor polish (#records-command): +1 optional field
            // `FormationState.hq_osid` (command-only operational HQ anchor for corps/army HQ
            // drilldowns). sim domain; display/drilldown metadata only. It does not imply
            // tactical field presence and is absent-safe via existing location fallback, so
            // calibration stays byte-identical when unset. 517->518 / sim 330->331. No new
            // type-escape casts.
            // Pre-planned op satisfaction trace: +1 optional field
            // `MilitaryState.preplanned_operations_satisfied_by_start`, an observability-only
            // list of pre-planned operations already satisfied at scenario injection. sim domain;
            // no sim reader consumes it for behavior, so absent legacy saves and non-satisfied
            // injections remain byte-identical. 518->519 / sim 331->332. No new type-escape casts.
            optional_fields_game_state: 519,
        });
        expect(current.optional_field_domains.total).toBe(519);
        expect(current.optional_field_domains.domain_counts).toMatchObject({
            derived: 10,
            ipc: 0,
            scenario: 0,
            sim: 332,
            state: 177,
            ui_adapter: 0,
            unknown: 0,
        });
        expect(current.optional_field_domains.unknown_justifications).toEqual([]);

        const watchedOperationTrace = current.optional_field_interfaces.interfaces.find(
            (entry) => entry.interface === 'WatchedOperationTraceRow',
        );
        expect(watchedOperationTrace).toEqual({
            interface: 'WatchedOperationTraceRow',
            domain: 'sim',
            count: 9,
            fields: [
                'breakdown',
                'launch_attacker_power',
                'launch_defender_count',
                'launch_defender_ids',
                'launch_defender_power',
                'launch_defender_power_by_id',
                'launch_feasibility_ratio',
                'launch_objective_osid',
                'launch_primary_defender_id',
            ],
        });
    });

    it('keeps Phase 1 state-schema escape hatches at or below the accepted deferred ceiling', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_1_FILES),
            0,
        );

        expect(currentTotal).toBeLessThanOrEqual(ACCEPTED_PHASE_1_REMAINING_ESCAPE_HATCHES);
    });

    it('cleans the Batch 4 Phase 2 combat leaf slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_4_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 5 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_5_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 7 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_7_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 8 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_8_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 9 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_9_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 10 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_10_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 11 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_11_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 12 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_12_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 13 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_13_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 14 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_14_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 15 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_15_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 16 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_16_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 17 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_17_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 18 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_18_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 19 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_19_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 20 Phase 2 combat continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_2_COMBAT_BATCH_20_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 39 Phase 3 early-war + bot safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_3_EARLY_WAR_BATCH_39_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 40 Phase 3 early-war continuation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_3_EARLY_WAR_BATCH_40_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 41 Phase 4 scenario safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_4_SCENARIO_BATCH_41_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 42 Phase 6 warroom safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_6_WARROOM_BATCH_42_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 43 sim non-combat safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, SIM_NON_COMBAT_BATCH_43_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 44 state + sim + desktop safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const currentTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, STATE_SIM_DESKTOP_BATCH_44_FILES),
            0,
        );

        expect(currentTotal).toBe(0);
    });

    it('cleans the Batch 45 war pipeline FactionId-cast slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // war_phases.ts retains save-shape-preserving non-null assertions on
        // optional supply_reserve / heavy_munitions_reserve / events_fired
        // collections plus one deliberately preserved `as any` widening. Those
        // are documented as out-of-scope per the lane's save-shape stop-gate
        // (analogous to the Batch 19 commander_march_correction precedent).
        // This slice pins only the as_factionid_casts category at zero.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', WAR_PIPELINE_BATCH_45_FILES);

        expect(factionIdCount).toBe(0);
    });

    it('cleans the Batch 46 state FactionId-cast slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // displacement.ts, displacement_takeover.ts, and supply_reserves.ts
        // retain save-shape-preserving `non_null_assertions_index` escapes on
        // optional state collections (e.g. `state.military.general_supply_reserve![fid]`)
        // that would shift serialized save shape if rewritten to an idempotent
        // default-init. Those are documented as out-of-scope per the lane's
        // save-shape stop-gate (analogous to the Batch 19 / Batch 45 precedent).
        // This slice pins only the as_factionid_casts category at zero.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', STATE_BATCH_46_FILES);

        expect(factionIdCount).toBe(0);
    });

    it('cleans the Batch 47 Phase 2 combat closeout FactionId-cast slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // paramilitary_sweep.ts, sector_offensive.ts, sector_building.ts, and
        // supply_condition.ts close out the Batch 46-D decision packet's
        // Phase 2 combat sites. Other inventory categories in these files
        // remain out-of-scope per the Phase 2 long-tail classification
        // (gated / load-bearing / save-shape / cross-file refactor): see
        // `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md`.
        // GameStateAdapter.ts (Phase 5) and response_parser.ts (LLM-schema) sites
        // from the Batch 46-D packet are not in this slice — they remain
        // documented as future-owner lanes per their respective stop-gates.
        // This slice pins only the as_factionid_casts category at zero.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', PHASE_2_COMBAT_BATCH_47_FILES);

        expect(factionIdCount).toBe(0);
    });

    it('closes the Phase 5 GameStateAdapter adapter-local escape inventory', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // GameStateAdapter.ts retains exactly 10 documented load-bearing
        // escapes after Batch 48 (see `ACCEPTED_PHASE_5_ADAPTER_BATCH_48_REMAINING`
        // constant for the per-site classification):
        // - 1 JSON entry boundary cast (`json as any`)
        // - 4 Record<string, unknown> field widenings (f.ops, f.combat_summary,
        //   f.brigade_history × 2)
        // - 2 multi-branch ternary widenings (activeOps / opsArray)
        // - 1 JSON-import baseline cast (historicalBaseline as any)
        // - 2 UI-local literal-union FactionId casts (enclave faction lookups
        //   against ENCLAVE_UI_DEFINITIONS[i].faction: string, target field
        //   typed as `'RS' | 'RBiH' | 'HRHB' | null | undefined`)
        // The former Batch 48 retained sites are now closed; keep this exact
        // zero unless a new adapter stop-gate is explicitly documented first.
        const adapterTotal = ESCAPE_CATEGORIES.reduce(
            (sum, category) => sum + phaseCount(current, category, PHASE_5_ADAPTER_BATCH_48_FILES),
            0,
        );

        expect(adapterTotal).toBe(ACCEPTED_PHASE_5_ADAPTER_BATCH_48_REMAINING);
    });

    it('cleans the Batch C sector_offensive_launch_helpers slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_SECTOR_OFFENSIVE_LAUNCH_HELPERS_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C validateGameState slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_VALIDATE_GAME_STATE_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C replay_frame_summary slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_REPLAY_FRAME_SUMMARY_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C war_dispatches slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_WAR_DISPATCHES_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C desktop_sim slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_DESKTOP_SIM_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C collect_briefing slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_COLLECT_BRIEFING_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C serialize slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_SERIALIZE_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C political_control_init slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_POLITICAL_CONTROL_INIT_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C oob_loader slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_OOB_LOADER_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C scenario_loader slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_SCENARIO_LOADER_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C war_timeline slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_WAR_TIMELINE_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch C brigade_temporal_emit slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', BATCH_C_BRIGADE_TEMPORAL_EMIT_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the post-Batch-C unknown-cast tail safe slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', POST_BATCH_C_UNKNOWN_TAIL_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the validateFormations as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FORMATIONS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the validateMilitiaPools as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_MILITIA_POOLS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the validateEndState as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_END_STATE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the validateFrontSegments as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FRONT_SEGMENTS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the front posture and pressure validator as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FRONT_STATE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the UI corps front-lines builder as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', UI_CORPS_FRONT_LINES_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the factions and supply-rights validator as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', VALIDATE_FACTIONS_SUPPLY_RIGHTS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the low-risk as-any leaf slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', LOW_RISK_AS_ANY_LEAF_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the UI window bridge as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', UI_WINDOW_BRIDGE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the bot response and interaction-layer as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', BOT_RESPONSE_INTERACTION_LAYER_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the CLI political-side and MapKit singleton as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CLI_POLITICAL_SIDE_MAPKIT_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the core singleton as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CORE_SINGLETON_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the AI settings panel IPC as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', AI_SETTINGS_PANEL_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the CLI front-state diagnostic as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CLI_FRONT_STATE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the political-control audit CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', POLITICAL_CONTROL_AUDIT_CLI_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the treaty CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', CLI_TREATY_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the warroom viewer and diplomacy overview strict-null tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const categories: Array<keyof Pick<
            StrictNullInventory['categories'],
            'as_any_casts' | 'non_null_assertions_dot' | 'non_null_assertions_index'
        >> = [
            'as_any_casts',
            'non_null_assertions_dot',
            'non_null_assertions_index',
        ];
        const total = categories.reduce(
            (sum, category) => sum + phaseCount(current, category, UI_WARROOM_DIPLOMACY_STRICT_NULL_TAIL_FILES),
            0
        );
        expect(total).toBe(0);
    });

    it('cleans the event-effects and loaded-state mock unknown-cast tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', EVENT_EFFECTS_LOADED_STATE_UNKNOWN_TAIL_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the ForceReadiness Army HQ as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', FORCE_READINESS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the SupplyIntelligence Army HQ as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', SUPPLY_INTELLIGENCE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the OpsMap deck overlay as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', OPS_MAP_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase D2 settlement reconcile CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE_D2_SETTLEMENT_RECONCILE_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase D3 missing-census trace CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE_D3_TRACE_MISSING_CENSUS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase F0 null-control CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE_F0_NULL_CONTROL_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase F1 unknown-control CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE_F1_UNKNOWN_CONTROL_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase F2 control-status CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE_F2_CONTROLSTATUS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase F4 unknown-attribution CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE_F4_UNKNOWN_ATTRIBUTION_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the smoke entrypoint and sim-run CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', SMOKE_ENTRYPOINT_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the OpsMapRenderer as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', OPS_MAP_RENDERER_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the tactical MapContainer MapLibre/deck bridge as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', MAP_CONTAINER_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the warroom mock-state strict-null tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const anyCount = phaseCount(current, 'as_any_casts', WARROOM_MOCK_STATE_STRICT_NULL_TAIL_FILES);
        const unknownCount = phaseCount(current, 'as_unknown_casts', WARROOM_MOCK_STATE_STRICT_NULL_TAIL_FILES);

        expect(anyCount).toBe(0);
        expect(unknownCount).toBe(0);
    });

    it('cleans the VerdictScreen Codex ghost-entry unknown-cast tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', VERDICT_SCREEN_CODEX_UNKNOWN_TAIL_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the scenario runner startup/max-turn as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', SCENARIO_RUNNER_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the sim_scenario CLI as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', SIM_SCENARIO_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase 3A A/B harness as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE3A_AB_HARNESS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the Phase 3ABC audit harness as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', PHASE3ABC_AUDIT_HARNESS_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the save migration as-any tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const anyCount = phaseCount(current, 'as_any_casts', SAVE_MIGRATION_AS_ANY_TAIL_FILES);
        expect(anyCount).toBe(0);
    });

    it('cleans the runtime non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', RUNTIME_NON_NULL_ASSERTION_TAIL_FILES);
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', RUNTIME_NON_NULL_ASSERTION_TAIL_FILES);

        expect(nonNullDotCount).toBe(0);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the second runtime non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', RUNTIME_NON_NULL_ASSERTION_TAIL_2_FILES);
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', RUNTIME_NON_NULL_ASSERTION_TAIL_2_FILES);

        expect(nonNullDotCount).toBe(0);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the third runtime non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        const anyCount = phaseCount(current, 'as_any_casts', RUNTIME_NON_NULL_ASSERTION_TAIL_3_FILES);
        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', RUNTIME_NON_NULL_ASSERTION_TAIL_3_FILES);
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', RUNTIME_NON_NULL_ASSERTION_TAIL_3_FILES);

        expect(anyCount).toBe(0);
        expect(nonNullDotCount).toBe(0);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the formation-spawn runtime non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', RUNTIME_NON_NULL_ASSERTION_TAIL_4_FILES);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the recruitment-engine non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', RECRUITMENT_ENGINE_NON_NULL_TAIL_FILES);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the Phase 3C exhaustion-gating non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', PHASE3C_EXHAUSTION_GATING_NON_NULL_TAIL_FILES);
        expect(nonNullDotCount).toBe(0);
    });

    it('cleans the supply-reserves non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', SUPPLY_RESERVES_NON_NULL_TAIL_FILES);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the displacement non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', DISPLACEMENT_NON_NULL_TAIL_FILES);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the treaty-apply non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', TREATY_APPLY_NON_NULL_TAIL_FILES);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the war-phases non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', WAR_PHASES_NON_NULL_TAIL_FILES);
        const nonNullIndexCount = phaseCount(current, 'non_null_assertions_index', WAR_PHASES_NON_NULL_TAIL_FILES);
        expect(nonNullDotCount).toBe(0);
        expect(nonNullIndexCount).toBe(0);
    });

    it('cleans the UI map non-null assertion tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', UI_MAP_NON_NULL_TAIL_FILES);
        expect(nonNullDotCount).toBe(0);
    });

    it('cleans the safe unknown-cast tail slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());
        const unknownCount = phaseCount(current, 'as_unknown_casts', SAFE_UNKNOWN_TAIL_FILES);
        expect(unknownCount).toBe(0);
    });

    it('cleans the Batch 49 AI commander response_parser schema-validation slice', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/strict_null_inventory.cjs') as {
            buildInventory: (rootDir: string) => StrictNullInventory;
        };
        const current = diagnostic.buildInventory(process.cwd());

        // response_parser.ts is the AI commander JSON boundary that ingests
        // `unknown` LLM output and narrows it to typed AdvisorResponse /
        // ArmyDecision / CorpsDecision shapes. Batch 49 replaces the two
        // inventory-counted escape sites with explicit schema validation:
        //   - 1 `as FactionId` widening on `data.faction` at parseAdvisorResponse
        //     replaced by `parseFactionId(value, fallback)` helper that requires
        //     both `typeof === 'string'` and `CANONICAL_FACTIONS.includes(value)`.
        //     Fallback semantics narrow: non-canonical strings and non-string
        //     truthy values now fall back to the supplied default ('RBiH' for
        //     parseAdvisorResponse) instead of being passed through. Documented
        //     in the Batch 49 ledger entry; covered by new parser tests.
        //   - 1 `d!.stance` non-null-assertion-dot at parseArmyResponse hoisted
        //     to a `rawStance` local with `typeof === 'string' &&
        //     VALID_STANCES.has(rawStance)` narrowing. Behavior-identical because
        //     VALID_STANCES only matches the three valid string stances.
        // The adjacent `parseAdvisorContextType` helper also replaced the
        // redundant `(data.context_type as AdvisorResponse['context_type']) ??
        // 'situation_analysis'` widening — that cast was not in the inventory
        // regex but is part of the same schema boundary. Other unknown→typed
        // widenings in this file (`data.operation_plan as
        // CorpsDecision['operation_plan']`, `data.brigade_movements as
        // CorpsDecision['brigade_movements']`, `data.reserve_deployment as
        // ArmyDecision['reserve_deployment']`, plus the `Record<string,
        // unknown>` directive/sector_stances widenings and the `as string[]` /
        // `as 'accept' | 'reject'` literal-union narrowings) do not match the
        // inventory regex and remain as future schema-validation lane work.
        // This slice pins both `as_factionid_casts` and `non_null_assertions_dot`
        // categories at zero for response_parser.ts.
        const factionIdCount = phaseCount(current, 'as_factionid_casts', AI_COMMANDER_BATCH_49_FILES);
        const nonNullDotCount = phaseCount(current, 'non_null_assertions_dot', AI_COMMANDER_BATCH_49_FILES);

        expect(factionIdCount).toBe(0);
        expect(nonNullDotCount).toBe(0);
    });
});
