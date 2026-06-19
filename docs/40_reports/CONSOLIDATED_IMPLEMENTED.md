# Consolidated: Implemented Work (40_reports)

**Purpose:** Single view of work that has been implemented and absorbed into code/canon.

**Latest first-hour faction modal gate parity:** [implemented/20260619_FIRST_HOUR_FACTION_MODAL_GATE_PARITY.md](implemented/20260619_FIRST_HOUR_FACTION_MODAL_GATE_PARITY.md) - RBiH, RS, and HRHB new-campaign starts all reset to `WAR HAS STARTED`, proceed through identity briefing and foundational decisions, and lock top-level toolbar routes while the required decision modal owns focus.

**Latest commander read-model surface parity:** [implemented/20260618_COMMANDER_READ_MODEL_SURFACE_PARITY.md](implemented/20260618_COMMANDER_READ_MODEL_SURFACE_PARITY.md) - ORBAT, Corps Detail, and Formation Detail now share the opening commander read-model, showing display-only turn-0 command labels without seating officers in sim state.

**Latest first-hour shell/Records/Chronicle polish:** [implemented/20260618_FIRST_HOUR_SHELL_RECORDS_CHRONICLE_POLISH.md](implemented/20260618_FIRST_HOUR_SHELL_RECORDS_CHRONICLE_POLISH.md) - Browser-fallback foundational decisions now file into Records and Chronicle during opening week, shell chrome renders `Opening week`, Records/Chronicle badges use readable separators, decision-modal shell ownership is guarded, and Army HQ/raw fallback copy uses player-safe labels.

**Latest Army HQ first-paint/drilldown polish:** [implemented/20260618_ARMY_HQ_FIRST_PAINT_DRILLDOWN_POLISH.md](implemented/20260618_ARMY_HQ_FIRST_PAINT_DRILLDOWN_POLISH.md) - Army HQ first paint now exposes a corps Command Access strip, corps drilldowns surface sectors/operations first, Records defaults to Aftermath/campaign archive, field inspections use an atomic Tactical Map route, and raw-copy fallback guards cover sector/operation/formation details.

**Latest Command Briefing route contract:** [implemented/20260618_COMMAND_BRIEFING_ROUTE_CONTRACTS.md](implemented/20260618_COMMAND_BRIEFING_ROUTE_CONTRACTS.md) - Command briefing action chips now carry real owner routes, shell helper handoffs, SitRep labels, and humanized enclave titles.

**Latest Decision Room routing closeout:** [implemented/20260618_DECISION_ROOM_ROUTING_AND_FIXTURE_SYNC.md](implemented/20260618_DECISION_ROOM_ROUTING_AND_FIXTURE_SYNC.md) - Pre-advance review, `1 REVIEW`, and operation opportunities now open Warroom Decision Room routes; player-faction filtering is shared; Krivaja/Stupcanica stale unit fixtures are receipt-aware.

**Latest Srebrenica/Zepa receipt gate:** [implemented/20260618_SREBRENICA_EVENT_RECEIPT_OPERATION_GATE.md](implemented/20260618_SREBRENICA_EVENT_RECEIPT_OPERATION_GATE.md) - Krivaja/Stupcanica operation-context rows now require event-owned Srebrenica/Zepa fall receipts first, with timeline/player-copy corrections and active docs synced.

**Latest P1 raw-copy calendar boundary:** [implemented/20260618_P1_RAW_COPY_CALENDAR_BOUNDARY.md](implemented/20260618_P1_RAW_COPY_CALENDAR_BOUNDARY.md) - Event decisions and inbox rows now render calendar dates and sanitize non-diagnostic event/dossier internals; toolbar load errors route through player-facing error copy.

**Latest first-hour shell and dev-map hardening:** [implemented/20260618_FIRST_HOUR_SHELL_AND_DEV_MAP_HARDENING.md](implemented/20260618_FIRST_HOUR_SHELL_AND_DEV_MAP_HARDENING.md) - `dev:map`/map build no longer depend on a missing root Vite shim, Warroom handoffs use shared cleanup, the route label is `Army HQ`, and foundational decision future branches are hidden until explicit reveal.

**Latest operational geometry invalid-coordinate closeout:** [implemented/20260617_OPERATIONAL_GEOMETRY_INVALID_COORDINATE_CLOSEOUT.md](implemented/20260617_OPERATIONAL_GEOMETRY_INVALID_COORDINATE_CLOSEOUT.md) - Operational settlement generation now drops invalid polygon parts, the committed artifact has an integrity test, and live map smoke no longer emits invalid-coordinate overlay warnings.

**Latest OOB metadata substrate:** [implemented/20260617_HVO_ELITE_COMMANDER_METADATA_SUBSTRATE.md](implemented/20260617_HVO_ELITE_COMMANDER_METADATA_SUBSTRATE.md) - OOB elite commander metadata now round-trips through the loader, preserving existing ARBiH/RS/HVO rows while leaving the Vitezovi identity/modeling decision open.

**Latest opening command/startup history truth:** [implemented/20260617_OPENING_COMMAND_AND_STARTUP_HISTORY.md](implemented/20260617_OPENING_COMMAND_AND_STARTUP_HISTORY.md) - Opening corps now show time-safe acting commanders through the Army HQ/OOB read-model, Army HQ route wiring is live-browser verified, later official commanders are not backdated, JNA synthetic command staff is labeled, and JNA setup control no longer appears as false turn-0 combat history.

**Latest UI truth and decision hierarchy hardening:** [implemented/20260617_UI_TRUTH_AND_DECISION_HIERARCHY.md](implemented/20260617_UI_TRUTH_AND_DECISION_HIERARCHY.md) - Live command surfaces hide future/postwar legal outcomes by default, explicit officer dossiers retain archival access, and decision modals show the full response list before detailed future-consequence previews.

**Latest shell navigation exclusivity:** [implemented/20260616_SHELL_NAVIGATION_EXCLUSIVITY.md](implemented/20260616_SHELL_NAVIGATION_EXCLUSIVITY.md) - Army HQ routes now close Codex/Chronicle centrally, Records routes force the Records tab, Codex/Decision History Escape no longer stack Pause, and App-level Warroom/Inbox/Wrapped handoffs now clear competing shells before opening the next top-level surface.

**Latest issue #170 fingerprint/cache hardening:** [implemented/20260616_ISSUE170_FINGERPRINT_CACHE_HARDENING.md](implemented/20260616_ISSUE170_FINGERPRINT_CACHE_HARDENING.md) - Structural fingerprint v2 now pins sorted OSID control flips, final-sector cache keys include front-edge content, and operation-roster cache invalidation has dynamic coverage.

**Latest stale-truth/process hardening:** [implemented/20260616_STALE_TRUTH_AND_PROCESS_HARDENING.md](implemented/20260616_STALE_TRUTH_AND_PROCESS_HARDENING.md) - Engine-health CI reports upstream scenario failures clearly, Sarajevo siege UI requires current control freshness, decision consequence copy uses authored names or neutral fallbacks, and life-lessons counts/topic files are synced.

**Latest engine-health CI dependency hardening:** [implemented/20260616_ENGINE_HEALTH_CI_DEPENDENCY_HARDENING.md](implemented/20260616_ENGINE_HEALTH_CI_DEPENDENCY_HARDENING.md) - Required `engine-health-188w` now starts under `if: always()` and fails explicitly when `scenarios` does not succeed.

**Latest UI copy raw-ID fallback closure:** [implemented/20260616_UI_COPY_RAW_ID_FALLBACKS.md](implemented/20260616_UI_COPY_RAW_ID_FALLBACKS.md) - Command planning, Chief of Staff prose, Warroom hotspot titles, and autonomy proposal values now keep raw ids internal and render neutral/player-safe copy.

**Latest comment sweep: Verdict/refugee hardening:** [implemented/20260616_COMMENT_SWEEP_VERDICT_REFUGEE.md](implemented/20260616_COMMENT_SWEEP_VERDICT_REFUGEE.md) - Verdict snapshot tests count exact faction-tab outcome badges, and refugee surge beats compare against the actual prior week.

**Latest Chronicle and receipt safe labels:** [implemented/20260616_CHRONICLE_RECEIPT_SAFE_LABELS.md](implemented/20260616_CHRONICLE_RECEIPT_SAFE_LABELS.md) - Consequence receipts and Chronicle Wrapped divergence bullets resolve authored/player-safe labels while preserving raw ids internally.

**Latest Codex response-label copy:** [implemented/20260616_CODEX_RESPONSE_LABEL_COPY_POLISH.md](implemented/20260616_CODEX_RESPONSE_LABEL_COPY_POLISH.md) - Distance from History and Dilemma Spine use authored response labels or neutral fallback copy, with raw response ids kept in internal fields.

**Latest operation and plan-ID command copy:** [implemented/20260616_OPERATION_PLAN_ID_COPY_POLISH.md](implemented/20260616_OPERATION_PLAN_ID_COPY_POLISH.md) - Back-the-Officer TG cards, operation proposal cards, and proactive force-launch ready-plan cards keep raw ids internal and render authored copy or `Unspecified operation`.

**Latest selection/raw-ID polish:** [implemented/20260616_SELECTION_AND_RAW_ID_POLISH.md](implemented/20260616_SELECTION_AND_RAW_ID_POLISH.md) - Standalone brigade selection now clears stale corps/army/HQ context, parent drilldowns route to the right owner IDs, and request-operation objective copy uses player-safe ordinal labels instead of visible raw OSIDs.

**Latest player-safe enclave/supply truth:** [implemented/20260616_PLAYER_SAFE_ENCLAVE_SUPPLY_TRUTH.md](implemented/20260616_PLAYER_SAFE_ENCLAVE_SUPPLY_TRUTH.md) - Player campaigns now scope enclave resilience, enclave map overlays, and supply summaries to the loaded player faction; Supply mode names known-friendly classes instead of stale global surplus thresholds.

**Latest decision consequence record focus:** [implemented/20260606_DECISION_CONSEQUENCE_RECORD_FOCUS.md](implemented/20260606_DECISION_CONSEQUENCE_RECORD_FOCUS.md) - President's Desk Records-filed consequence rows now route to the concrete Army HQ Decision Consequences record, and shell handoff validation accepts the existing `decisions` Records subtab.

**Latest optional local military state validate-when-present contract:** [implemented/20260606_OPTIONAL_LOCAL_STATE_VALIDATE_WHEN_PRESENT.md](implemented/20260606_OPTIONAL_LOCAL_STATE_VALIDATE_WHEN_PRESENT.md) - `military.casualty_ledger` and `military.enclave_state` remain optional but now reject malformed present local payloads without materializing absent fields or resolving ids.

**Latest command objective picker:** [implemented/20260606_COMMAND_OBJECTIVE_PICKER.md](implemented/20260606_COMMAND_OBJECTIVE_PICKER.md) - Request-op directives now offer deterministic known-objective pickers in both Decision Room and Army HQ request rows while preserving existing commander objection, CA cost, staging, and receipt behavior.

**Latest Warroom native overlay residue batch:** [implemented/20260606_WARROOM_NATIVE_OVERLAY_RESIDUE_BATCH.md](implemented/20260606_WARROOM_NATIVE_OVERLAY_RESIDUE_BATCH.md) - Intelligence, Staff, and Faction now have the only native Warroom preview overlays with explicit drill-ins to existing owner surfaces, while retired StrategicDashboard/EventLog local command variants are removed from live source.

**Latest command card role/filter framing:** [implemented/20260606_COMMAND_CARD_ROLE_FRAMING.md](implemented/20260606_COMMAND_CARD_ROLE_FRAMING.md) - Command Surface category cards now render Act/Inspect/Monitor chips and route exact six-card category filters while preserving category order, count semantics, and owner-surface behavior.

**Latest command-surface repurpose read-models:** [implemented/20260606_COMMAND_SURFACE_REPURPOSE_READMODELS.md](implemented/20260606_COMMAND_SURFACE_REPURPOSE_READMODELS.md) - Enclave, Economy, and Chief-of-Staff panels now carry presidential readout framing with locale-independent ordering guards.

**Latest receipt family quality/localization:** [implemented/20260606_RECEIPT_FAMILY_QUALITY_LOCALIZATION.md](implemented/20260606_RECEIPT_FAMILY_QUALITY_LOCALIZATION.md) - Decision consequence family labels now render through stable localized family IDs, Records archive-summary chrome is localized, and the loaded browser smoke covers patron, reserve, operation-opportunity, and Chronicle-filed convoy receipts together.

**Latest supply panel player-scoped read-model:** [implemented/20260606_SUPPLY_PANEL_PLAYER_SCOPED_READMODEL.md](implemented/20260606_SUPPLY_PANEL_PLAYER_SCOPED_READMODEL.md) - Supply map logistics panel counts are now localized, deterministic, and scoped to the loaded player faction even when the panel falls back to legacy supply pressure/condition rows.

**Latest local military state validate-when-present contract:** [implemented/20260606_LOCAL_MILITARY_STATE_VALIDATE_WHEN_PRESENT.md](implemented/20260606_LOCAL_MILITARY_STATE_VALIDATE_WHEN_PRESENT.md) - `military.brigade_desired_aor_cap`, `military.og_orders`, `military.settlement_holdouts`, and `military.faction_officer_maturity` remain optional but now reject malformed present local-state payloads without materializing absent fields or resolving ids.

**Latest map-derived artifact ownership:** [implemented/20260606_MAP_DERIVED_ARTIFACT_OWNERSHIP.md](implemented/20260606_MAP_DERIVED_ARTIFACT_OWNERSHIP.md) - `data/derived/georef/`, `data/derived/operational/`, and `data/derived/municipality_audit/` are now classified as committed retained generated map evidence with owner commands and static tracked-file guards.

**Latest sector component map reuse:** [implemented/20260606_SECTOR_COMPONENT_MAP_REUSE.md](implemented/20260606_SECTOR_COMPONENT_MAP_REUSE.md) - `buildFactionSectors(...)` now reuses the friendly territory component map from pre-component setup during brigade classification, preserving the current `d1ace172a29b2353` 40w floor.

**Latest derived military scalar maps validate-when-present contract:** [implemented/20260606_DERIVED_MILITARY_SCALAR_MAPS_VALIDATE_WHEN_PRESENT.md](implemented/20260606_DERIVED_MILITARY_SCALAR_MAPS_VALIDATE_WHEN_PRESENT.md) - Derived/runtime military scalar maps remain optional but now reject malformed present boolean, finite non-negative number, and non-negative integer payloads without materializing absent fields or changing runtime producers.

**Latest runtime military state validate-when-present contract:** [implemented/20260606_RUNTIME_MILITARY_STATE_VALIDATE_WHEN_PRESENT.md](implemented/20260606_RUNTIME_MILITARY_STATE_VALIDATE_WHEN_PRESENT.md) - `military.corps_equipment_reserve`, `military.militia_garrison`, and `military.unresolved_sector_brigades` remain optional but now reject malformed present runtime payloads without materializing absent fields or changing runtime producers.

**Latest desk consequence route localization:** [implemented/20260606_DESK_CONSEQUENCE_ROUTE_LOCALIZATION.md](implemented/20260606_DESK_CONSEQUENCE_ROUTE_LOCALIZATION.md) - President's Desk consequence rows now route by each receipt's filed surface, sending Chronicle-filed decisions to Chronicle and Records-filed receipts to Army HQ Records with localized route chrome.

**Latest supply/production economy state validate-when-present contract:** [implemented/20260606_SUPPLY_PRODUCTION_STATE_VALIDATE_WHEN_PRESENT.md](implemented/20260606_SUPPLY_PRODUCTION_STATE_VALIDATE_WHEN_PRESENT.md) - Supply reserve maps and `military.production_facilities` remain optional but now reject malformed present economy-state payloads without materializing absent fields or enforcing deferred upper bounds.

**Latest recruitment/smuggling economy state validate-when-present contract:** [implemented/20260606_RECRUITMENT_SMUGGLING_STATE_VALIDATE_WHEN_PRESENT.md](implemented/20260606_RECRUITMENT_SMUGGLING_STATE_VALIDATE_WHEN_PRESENT.md) - `military.recruitment_state` and `military.smuggling_routes` remain optional but now reject malformed present economy-state payloads without materializing absent fields or changing recruitment/smuggling behavior.

**Latest launch artifact ownership:** [implemented/20260605_LAUNCH_ARTIFACT_OWNERSHIP.md](implemented/20260605_LAUNCH_ARTIFACT_OWNERSHIP.md) - `dist-packaged/...` package outputs are now explicit operator-owned transient artifacts in the generated-artifact ownership matrix; release evidence records exact artifact identity, but packaged binaries stay out of git.

**Latest sector active-combat scan reuse:** [implemented/20260605_SECTOR_ACTIVE_COMBAT_SCAN_REUSE.md](implemented/20260605_SECTOR_ACTIVE_COMBAT_SCAN_REUSE.md) - `buildCorpsFrontSectors(...)` now reuses one sorted active-combat formation scan across per-faction and per-corps sector construction, preserving the current `d1ace172a29b2353` 40w floor.

**Latest Patron actor-history route cohesion:** [implemented/20260605_PATRON_ACTOR_HISTORY_ROUTE_COHESION.md](implemented/20260605_PATRON_ACTOR_HISTORY_ROUTE_COHESION.md) - Patron-defiance material cuts now file through Records/Chronicle consequence routes and appear in the Patron Relations timeline without changing patron mechanics or save state.

**Latest command clarity: advance gate and stance cleanup:** [implemented/20260605_COMMAND_CLARITY_ADVANCE_AND_STANCE.md](implemented/20260605_COMMAND_CLARITY_ADVANCE_AND_STANCE.md) - Advance confirmation now hard-blocks unresolved pre-advance review, and the left OOB corps card no longer exposes fake direct stance overrides.

**Latest opening brief dismissal persistence:** [implemented/20260605_OPENING_BRIEF_DISMISSAL_PERSISTENCE.md](implemented/20260605_OPENING_BRIEF_DISMISSAL_PERSISTENCE.md) - Presidential opening brief dismissal now survives same-faction save refreshes while resetting on first load or faction change.

**Latest brigade order-surface validate-when-present contract:** [implemented/20260605_BRIGADE_ORDER_SURFACES_VALIDATE_WHEN_PRESENT.md](implemented/20260605_BRIGADE_ORDER_SURFACES_VALIDATE_WHEN_PRESENT.md) - Brigade movement/order/deploy/posture/attack and sector-override surfaces remain optional but now reject malformed present payloads without materializing absent orders or changing order consumption.

**Latest Records route cohesion:** [implemented/20260605_RECORDS_ROUTE_COHESION.md](implemented/20260605_RECORDS_ROUTE_COHESION.md) - Army HQ Records now summarizes archive counts/routes and decision consequences expose stable Records/Chronicle filing destinations without changing sim/save/scenario state.

**Latest front visit and personnel dossier surface:** [implemented/20260605_FRONT_VISIT_PERSONNEL_DOSSIER.md](implemented/20260605_FRONT_VISIT_PERSONNEL_DOSSIER.md) - Front Visit now shows reachable fronts, and Personnel opens with a presidential dossier for vacancies, low-loyalty commanders, reserve officers, and mobilization strain.

**Latest Patron Relations material receipts:** [implemented/20260605_PATRON_RELATIONS_MATERIAL_RECEIPTS.md](implemented/20260605_PATRON_RELATIONS_MATERIAL_RECEIPTS.md) - Patron Relations now projects existing patron-defiance supply cuts into stable material consequence records without changing patron mechanics.

**Latest command directive target affordances:** [implemented/20260605_COMMAND_DIRECTIVE_TARGET_AFFORDANCES.md](implemented/20260605_COMMAND_DIRECTIVE_TARGET_AFFORDANCES.md) - Request-op directives now frame objectives through corps staff review, resolve fixed OSID captions to display names, and block ambiguous typed settlement names before player-command IPC.

**Latest sector coverage BFS target cache:** [implemented/20260605_SECTOR_COVERAGE_BFS_TARGET_CACHE.md](implemented/20260605_SECTOR_COVERAGE_BFS_TARGET_CACHE.md) - `ensureMinimumSectorCoverage(...)` now finds the nearest vacant local front target with one bounded BFS instead of one BFS per candidate target; the closed slice preserved `aa8f7a07962cecaf`, now historical after the PR #208 OOB refloor.

**Latest municipality support IPC routing:** [implemented/20260605_MUNICIPALITY_SUPPORT_IPC_ROUTING.md](implemented/20260605_MUNICIPALITY_SUPPORT_IPC_ROUTING.md) - Desktop municipality-support staging now writes the validated military order surface instead of an effect-dead top-level field.

**Latest review backlog coverage batch:** [implemented/20260605_REVIEW_BACKLOG_ENGINE_BATCH.md](implemented/20260605_REVIEW_BACKLOG_ENGINE_BATCH.md) - Issue #170 Trnovo controlled-waypoint preservation and HRHB Graz branch coverage are closed; same-axis concentration and final-sector disconnected-territory hardening are deferred after 40-week Boljanic anchor proof failed.

**Latest supply siege state validate-when-present contract:** [implemented/20260605_SUPPLY_SIEGE_STATE_VALIDATE_WHEN_PRESENT.md](implemented/20260605_SUPPLY_SIEGE_STATE_VALIDATE_WHEN_PRESENT.md) - `military.siege_turn_counters` and `military.sarajevo_tunnel_operational` remain optional but now reject malformed present supply siege state without changing supply mechanics.

**Latest formation spawn directive validate-when-present contract:** [implemented/20260605_FORMATION_SPAWN_DIRECTIVE_VALIDATE_WHEN_PRESENT.md](implemented/20260605_FORMATION_SPAWN_DIRECTIVE_VALIDATE_WHEN_PRESENT.md) - `military.formation_spawn_directive` remains optional but now rejects malformed present directive payloads without changing formation spawning.

**Latest narrative queue validate-when-present contract:** [implemented/20260605_NARRATIVE_QUEUE_VALIDATE_WHEN_PRESENT.md](implemented/20260605_NARRATIVE_QUEUE_VALIDATE_WHEN_PRESENT.md) - `military.narrative_queue` remains optional but now rejects malformed present AAR work-queue rows without changing combat resolution or AAR generation.

**Latest operation observability validate-when-present contract:** [implemented/20260605_OPERATION_OBSERVABILITY_VALIDATE_WHEN_PRESENT.md](implemented/20260605_OPERATION_OBSERVABILITY_VALIDATE_WHEN_PRESENT.md) - `military.op_injection_warnings` and `military.watched_operations` remain optional but now reject malformed present operation-observability rows without changing operation launch.

**Latest command friction events validate-when-present contract:** [implemented/20260605_FRICTION_EVENTS_VALIDATE_WHEN_PRESENT.md](implemented/20260605_FRICTION_EVENTS_VALIDATE_WHEN_PRESENT.md) - `military.friction_events` remains optional but now rejects malformed present command-friction rows without materializing the lazy event bus.

**Latest cosmetic AI buffer validate-when-present contract:** [implemented/20260604_COSMETIC_AI_BUFFERS_VALIDATE_WHEN_PRESENT.md](implemented/20260604_COSMETIC_AI_BUFFERS_VALIDATE_WHEN_PRESENT.md) - Cosmetic corps dialogue, war dispatch, and battle narrative buffers remain optional but now reject malformed present payloads.

**Latest save migration fixture artifact ownership:** [implemented/20260604_SAVE_MIGRATION_FIXTURE_ARTIFACT_OWNERSHIP.md](implemented/20260604_SAVE_MIGRATION_FIXTURE_ARTIFACT_OWNERSHIP.md) - The committed `tests/fixtures/save_migration/v*.json` legacy schema fixtures now have an explicit ownership row and static guard.

**Latest command briefing validate-when-present contract:** [implemented/20260604_LAST_BRIEFING_VALIDATE_WHEN_PRESENT.md](implemented/20260604_LAST_BRIEFING_VALIDATE_WHEN_PRESENT.md) - `military.last_briefing` remains optional but now rejects malformed present command briefing packets without materializing the field.

**Latest Ahmici same-turn lock follow-up:** [implemented/20260604_AHMICI_SAME_TURN_LOCK_FOLLOWUP.md](implemented/20260604_AHMICI_SAME_TURN_LOCK_FOLLOWUP.md) - The Ahmici rupture and alliance-held alt-path are now same-turn mutex alternatives, and per-turn alliance update honors active alliance locks.

**Latest military credibility no-data consumer fix:** [implemented/20260604_MILITARY_CREDIBILITY_NO_DATA_CONSUMER.md](implemented/20260604_MILITARY_CREDIBILITY_NO_DATA_CONSUMER.md) - The PR #173 `military_credibility` op-launch consumer now ignores no-evidence low values while preserving evidenced low-credibility caution under the default-off flags.

**Latest event staff recommendation defaults:** [implemented/20260527_EVENT_STAFF_RECOMMENDATION_DEFAULTS.md](implemented/20260527_EVENT_STAFF_RECOMMENDATION_DEFAULTS.md) - Abstract command-presence events now carry visible `Staff recommendation` metadata separate from historical defaults. `visit_to_front_rbih` becomes the 18th production modal-ready required-response row, while RS/HRHB visit rows remain gated and historical bot calibration is unchanged.

**Latest event expansion roadmap contract:** [implemented/20260527_EVENT_EXPANSION_ROADMAP_CONTRACT.md](implemented/20260527_EVENT_EXPANSION_ROADMAP_CONTRACT.md) - Event expansion is now scoped as a gated full historical/counterfactual database with branch-visibility diagnostics first, a foundational decisions packet second, explicit historical labels, historical bot calibration, causal branch opens/closes, detailed modal explanations, and no broad authoring until source/default/sensitive gates are satisfied.

**Latest force-quality diagnostic artifact ownership:** [implemented/20260527_FORCE_QUALITY_DIAGNOSTIC_ARTIFACT_OWNERSHIP.md](implemented/20260527_FORCE_QUALITY_DIAGNOSTIC_ARTIFACT_OWNERSHIP.md) - A static guard now locks the four committed `tools/diagnostics/_force_quality_*.md` diagnostics as retained force-quality evidence rather than transient run output or current calibration truth.

**Latest painted-compare artifact ownership:** [implemented/20260527_PAINTED_COMPARE_ARTIFACT_OWNERSHIP.md](implemented/20260527_PAINTED_COMPARE_ARTIFACT_OWNERSHIP.md) - A static guard now locks the five committed `tools/diagnostics/_phase5a_painted_compares/*.txt` diagnostics as intentional Phase 5a painted-vs-sim evidence rather than transient run output.

**Latest consequence runtime queue schema contract:** [implemented/20260527_CONSEQUENCE_RUNTIME_QUEUE_SCHEMA_CONTRACT.md](implemented/20260527_CONSEQUENCE_RUNTIME_QUEUE_SCHEMA_CONTRACT.md) - Consequence runtime queues are now required persisted v31 save/load contracts with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no event or operation behavior change.

**Latest officer decision queue schema contract:** [implemented/20260527_OFFICER_DECISION_QUEUE_SCHEMA_CONTRACT.md](implemented/20260527_OFFICER_DECISION_QUEUE_SCHEMA_CONTRACT.md) - Officer pending/history queues are now required persisted v30 save/load contracts with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no officer behavior change.

**Latest triggered-operation bookkeeping schema contract:** [implemented/20260527_TRIGGERED_OPERATION_BOOKKEEPING_SCHEMA_CONTRACT.md](implemented/20260527_TRIGGERED_OPERATION_BOOKKEEPING_SCHEMA_CONTRACT.md) - Triggered-operation accepted/declined/used-name records are now required persisted v29 save/load contracts with `{}` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no operation behavior change.

**Latest reserve request schema contract:** [implemented/20260527_RESERVE_REQUEST_SCHEMA_CONTRACT.md](implemented/20260527_RESERVE_REQUEST_SCHEMA_CONTRACT.md) - Reserve pending/history queues are now required persisted v28 save/load contracts with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no reserve behavior change.

**Latest convoy decision schema contract:** [implemented/20260527_CONVOY_DECISION_SCHEMA_CONTRACT.md](implemented/20260527_CONVOY_DECISION_SCHEMA_CONTRACT.md) - Convoy pending/history queues are now required persisted v27 save/load contracts with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no convoy behavior change.

**Latest cost ledger annotation schema contract:** [implemented/20260527_COST_LEDGER_ANNOTATION_SCHEMA_CONTRACT.md](implemented/20260527_COST_LEDGER_ANNOTATION_SCHEMA_CONTRACT.md) - `military.cost_ledger_annotations` is now a required persisted v26 save/load contract with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no cost-ledger behavior change.

**Latest event modifier schema contract:** [implemented/20260527_EVENT_MODIFIER_SCHEMA_CONTRACT.md](implemented/20260527_EVENT_MODIFIER_SCHEMA_CONTRACT.md) - Active event modifier queues are now required persisted v25 save/load contracts with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no event behavior change.

**Latest pending event decisions schema contract:** [implemented/20260527_PENDING_EVENT_DECISIONS_SCHEMA_CONTRACT.md](implemented/20260527_PENDING_EVENT_DECISIONS_SCHEMA_CONTRACT.md) - `military.pending_event_decisions` is now a required persisted v24 save/load contract with `[]` legacy migration, current-version missing/malformed rejection coverage, drift/startup snapshot proof, and no event behavior change.

**Latest pending event notifications schema contract:** [implemented/20260527_PENDING_EVENT_NOTIFICATIONS_SCHEMA_CONTRACT.md](implemented/20260527_PENDING_EVENT_NOTIFICATIONS_SCHEMA_CONTRACT.md) - `military.pending_event_notifications` is now a required persisted v23 save/load contract with `[]` legacy migration, current-version missing/malformed rejection coverage, drift report proof, and no runtime notification-emission change.

**Latest event presidential acceptance diagnostic:** [implemented/20260527_EVENT_PRESIDENTIAL_ACCEPTANCE_DIAGNOSTIC.md](implemented/20260527_EVENT_PRESIDENTIAL_ACCEPTANCE_DIAGNOSTIC.md) - A deterministic diagnostic now proves all 17 production modal-ready required-response rows surface for the responding player, resolve to exactly one player decision-log entry, and auto-resolve headlessly on historical defaults with no stuck pending decisions.

**Latest event loader semantic validation:** [implemented/20260527_EVENT_LOADER_SEMANTIC_VALIDATION.md](implemented/20260527_EVENT_LOADER_SEMANTIC_VALIDATION.md) - Runtime event loading now shares vocabulary with taxonomy diagnostics and fails closed for unknown effect/condition semantics, duplicate IDs, unresolved event references, invalid response defaults, and declared enum/range violations while preserving the current 247-row catalog.

**Latest generated artifact ownership matrix meta-guard:** [implemented/20260527_GENERATED_ARTIFACT_OWNERSHIP_MATRIX_META_GUARD.md](implemented/20260527_GENERATED_ARTIFACT_OWNERSHIP_MATRIX_META_GUARD.md) - A static meta-contract now keeps the generated artifact ownership matrix shape, POSIX artifact keys, cited tests, ownership-test row references, and transient catch-all policy language aligned.

**Latest replay sidecar artifact ownership:** [implemented/20260526_REPLAY_SIDECAR_ARTIFACT_OWNERSHIP.md](implemented/20260526_REPLAY_SIDECAR_ARTIFACT_OWNERSHIP.md) - A static guard now locks `runs/<scenario_run>/replay_sequence.jsonl` and `runs/<scenario_run>/replay_timeline.json` as transient scenario runner/video replay sidecars, including `emitWeeklySavesForVideo` gating and `runs/` no-commit proof.

**Latest data-derived debug artifact ownership:** [implemented/20260526_DATA_DERIVED_DEBUG_ARTIFACT_OWNERSHIP.md](implemented/20260526_DATA_DERIVED_DEBUG_ARTIFACT_OWNERSHIP.md) - A static guard now locks `data/derived/_debug/**` as ignored, default-transient diagnostic scratch with no committed files and owner varying by diagnostic script.

**Latest phantom-spawn marker schema contract:** [implemented/20260526_PHANTOMS_SPAWNED_SCHEMA_CONTRACT.md](implemented/20260526_PHANTOMS_SPAWNED_SCHEMA_CONTRACT.md) - `military.phantoms_spawned` is now a required persisted v20 `string[]` with `[]` migration proof, current-version string-array validation, order/content preservation coverage, and strict-null floor 464.

**Latest diagnostics output artifact ownership:** [implemented/20260526_DIAGNOSTICS_OUTPUT_ARTIFACT_OWNERSHIP.md](implemented/20260526_DIAGNOSTICS_OUTPUT_ARTIFACT_OWNERSHIP.md) - A static guard now locks `tools/diagnostics/output/save_migration_drift.json` as the only committed diagnostics output artifact and keeps unlisted `tools/diagnostics/output/*.json` files default-transient until a matrix row exists.

**Latest displacement civilian-casualties schema contract:** [implemented/20260526_DISPLACEMENT_CIVILIAN_CASUALTIES_SCHEMA_CONTRACT.md](implemented/20260526_DISPLACEMENT_CIVILIAN_CASUALTIES_SCHEMA_CONTRACT.md) - `displacement.civilian_casualties` is now a required persisted v19 record with `{}` migration proof, current-version nested casualty validation, empty-map first-write regression coverage, run-summary non-empty gating, and strict-null floor 465.

**Latest displacement lazy-map schema contract:** [implemented/20260526_DISPLACEMENT_LAZY_MAP_SCHEMA_CONTRACT.md](implemented/20260526_DISPLACEMENT_LAZY_MAP_SCHEMA_CONTRACT.md) - `displacement_state`, `minority_flight_state`, and `sustainability_state` are now required persisted v18 records with current-version rejection coverage, v17 `{}` migration proof, pre-v18 top-level rescue, current v18 residue guarding, and strict-null floor 466.

**Latest displacement operational schema contract:** [implemented/20260526_DISPLACEMENT_OPERATIONAL_SCHEMA_CONTRACT.md](implemented/20260526_DISPLACEMENT_OPERATIONAL_SCHEMA_CONTRACT.md) - Three displacement operational substrate records are now required persisted v17 contract fields with current-version rejection coverage, v16 `{}` migration proof, pre-v17 top-level rescue, malformed v17 top-level residue guarding, and strict-null floor 469.

**Latest run final-save static artifact ownership:** [implemented/20260526_LATEST_RUN_FINAL_SAVE_STATIC_ARTIFACT_OWNERSHIP.md](implemented/20260526_LATEST_RUN_FINAL_SAVE_STATIC_ARTIFACT_OWNERSHIP.md) - A static guard now locks `data/derived/latest_run_final_save.json` ownership across generated-artifact docs, scenario run scripts, the `--map` copy helper, validation tests, transient default policy, and paired-ledger refresh requirement without refreshing the tracked save.

**Latest recruitment test matrix artifact ownership:** [implemented/20260526_RECRUITMENT_TEST_MATRIX_ARTIFACT_OWNERSHIP.md](implemented/20260526_RECRUITMENT_TEST_MATRIX_ARTIFACT_OWNERSHIP.md) - A static guard now locks the committed 2026-02-11 recruitment test matrix tree, retained run-directory classification including failed `_tmp_player_choice_recruitment_4w` evidence, and per-run artifact shape without refreshing scenario outputs.

**Latest H2.4 sweep artifact ownership:** [implemented/20260526_H24_SWEEP_ARTIFACT_OWNERSHIP.md](implemented/20260526_H24_SWEEP_ARTIFACT_OWNERSHIP.md) - A static guard now locks the committed H2.4 sweep tree, owner command, validation tests, aggregate summary rows, retained run-directory classification, and per-run artifact shape without refreshing scenario outputs.

**Latest baseline ops sensitivity artifact ownership:** [implemented/20260526_BASELINE_OPS_SENSITIVITY_ARTIFACT_OWNERSHIP.md](implemented/20260526_BASELINE_OPS_SENSITIVITY_ARTIFACT_OWNERSHIP.md) - A static guard now locks the committed H1.11 sensitivity artifact trees, owner command, validation tests, retained run2 classification, and byte-identity expectations without refreshing scenario outputs.

**Latest Phase F displacement capacity schema contract:** [implemented/20260526_PHASE_F_DISPLACEMENT_CAPACITY_SCHEMA_CONTRACT.md](implemented/20260526_PHASE_F_DISPLACEMENT_CAPACITY_SCHEMA_CONTRACT.md) - Three Phase F displacement capacity maps are now required persisted v16 contract fields with current-version rejection coverage, legacy `{}` migration proof, and strict-null floor 472.

**Latest v15 fast fixture alignment:** [implemented/20260526_V15_FAST_FIXTURE_ALIGNMENT.md](implemented/20260526_V15_FAST_FIXTURE_ALIGNMENT.md) - Stale fast-suite schema fixtures now include inert v15 event bookkeeping records and a v14 round-trip fixture covers the v15 migration path after Baseline Regression exposed fixture drift.

**Latest event bookkeeping schema contract:** [implemented/20260526_EVENT_BOOKKEEPING_SCHEMA_CONTRACT.md](implemented/20260526_EVENT_BOOKKEEPING_SCHEMA_CONTRACT.md) - Six military event bookkeeping records are now required persisted v15 contract fields with current-version rejection coverage, legacy empty-default migration proof, and strict-null floor 475.

**Latest CI schema fixture alignment:** [implemented/20260526_CI_SCHEMA_FIXTURE_ALIGNMENT.md](implemented/20260526_CI_SCHEMA_FIXTURE_ALIGNMENT.md) - Stale current-schema fixtures and the tracked latest-run final-save fixture now include required empty event/political records so Baseline Regression exercises the current save contract without production behavior changes.

**Latest political war substrate schema contract:** [implemented/20260526_POLITICAL_WAR_SUBSTRATE_SCHEMA_CONTRACT.md](implemented/20260526_POLITICAL_WAR_SUBSTRATE_SCHEMA_CONTRACT.md) - Six political war substrate records are now required persisted v6/v7 contract fields with current-version rejection coverage, legacy `{}` migration proof, and strict-null floor 481.

**Latest startup snapshot artifact ownership:** [implemented/20260526_STARTUP_SNAPSHOT_ARTIFACT_OWNERSHIP.md](implemented/20260526_STARTUP_SNAPSHOT_ARTIFACT_OWNERSHIP.md) - A static guard now locks the April 1992 startup snapshot artifact owner, validation commands, npm script mapping, source key/path, and builder wrapper calls without refreshing the generated startup save or claiming byte proof.

**Latest sector current profile evidence:** [implemented/20260526_SECTOR_CURRENT_PROFILE_EVIDENCE_CLOSEOUT.md](implemented/20260526_SECTOR_CURRENT_PROFILE_EVIDENCE_CLOSEOUT.md) - Fresh 40w sector/frontline profiling preserved final hash `f219401f4a17f311`; top measured buckets are `reconcile-final-sector-truth`, `partition-corps-front-sectors`, and `sealMergedSectorTruth:ensure-coverage`, with next code work gated to byte-identical final-sector-truth/partition planning.

**Latest run final-save map-copy ownership:** [implemented/20260526_LATEST_RUN_FINAL_SAVE_MAP_COPY_OWNERSHIP.md](implemented/20260526_LATEST_RUN_FINAL_SAVE_MAP_COPY_OWNERSHIP.md) - The scenario runner `--map` final-save copy now has an exported helper and a temp-root byte-equivalence test that proves `data/derived/latest_run_final_save.json` receives source-identical bytes without touching the tracked artifact.

**Latest save migration drift byte identity:** [implemented/20260526_SAVE_MIGRATION_DRIFT_BYTE_IDENTITY.md](implemented/20260526_SAVE_MIGRATION_DRIFT_BYTE_IDENTITY.md) - The save migration drift audit test now proves its committed diagnostic artifact regenerates byte-for-byte and restores committed bytes on failure.

**Latest event decision log schema contract:** [implemented/20260526_EVENT_DECISION_LOG_SCHEMA_CONTRACT.md](implemented/20260526_EVENT_DECISION_LOG_SCHEMA_CONTRACT.md) - `military.event_decision_log` is now a required persisted v14 contract field with legacy `[]` migration and current-version validator rejection coverage.

**Latest displacement aggregate schema contract:** [implemented/20260526_DISPLACEMENT_AGGREGATE_SCHEMA_CONTRACT.md](implemented/20260526_DISPLACEMENT_AGGREGATE_SCHEMA_CONTRACT.md) - The v8 displacement aggregate records are now required persisted contract fields with current-version rejection tests and v1/v7 migration proof for `{}` defaults.

**Latest displacement event log schema contract:** [implemented/20260526_DISPLACEMENT_EVENT_LOG_SCHEMA_CONTRACT.md](implemented/20260526_DISPLACEMENT_EVENT_LOG_SCHEMA_CONTRACT.md) - `displacement.displacement_event_log` is now a required persisted v7 contract field with legacy `[]` migration and current-version validator rejection coverage.

**Latest replay manifest ownership equivalence:** [implemented/20260526_REPLAY_MANIFEST_OWNERSHIP_EQUIVALENCE.md](implemented/20260526_REPLAY_MANIFEST_OWNERSHIP_EQUIVALENCE.md) - Scenario runs now expose `replay_save_manifest` path metadata and save-continue tests compare sparse manifest tails against uninterrupted runs; replay sidecars are explicitly transient in generated-artifact ownership docs.

**Latest army command schema contract:** [implemented/20260526_ARMY_COMMAND_SCHEMA_CONTRACT.md](implemented/20260526_ARMY_COMMAND_SCHEMA_CONTRACT.md) - A2/C1 command observability records `military.army_co_decision_traces` and `military.army_corps_directives_by_faction` are now required persisted v10 contracts with migration/validator tests.

**Latest Bihac / 5th Corps operational wording:** [implemented/20260526_BIHAC_5TH_CORPS_OPERATIONAL_WORDING.md](implemented/20260526_BIHAC_5TH_CORPS_OPERATIONAL_WORDING.md) - Bihać/5th Corps event and Codex prose now use bounded Operation Grmeč and Operation Sana wording with BB2 pp. 536-538 source support.

**Latest HVO Southern Move catalog:** [implemented/20260524_HVO_SOUTHERN_MOVE_CATALOG.md](implemented/20260524_HVO_SOUTHERN_MOVE_CATALOG.md) - Mistral 2 now owns Drvar/Grahovo plus Sipovo only, while `southern_move_95` covers Mrkonjic Grad from Sipovo staging under `hvo_tomislavgrad`.

**Latest BCS Operations Planning parameter localization:** [implemented/20260523_BCS_OPS_PLANNING_PARAMETER_LOCALIZATION.md](implemented/20260523_BCS_OPS_PLANNING_PARAMETER_LOCALIZATION.md) - Ops phase-gate messages and PlanParameters operation-name/type/tempo/tolerance/support chrome now render through English/BCS localization.

**Latest BCS Convoy Decision chrome localization:** [implemented/20260523_BCS_CONVOY_DECISION_CHROME_LOCALIZATION.md](implemented/20260523_BCS_CONVOY_DECISION_CHROME_LOCALIZATION.md) - Humanitarian convoy decision modal chrome/prose and War Summary inline convoy action buttons now render through English/BCS localization.

**Latest BCS War Summary situation chrome localization:** [implemented/20260523_BCS_WAR_SUMMARY_SITUATION_CHROME_LOCALIZATION.md](implemented/20260523_BCS_WAR_SUMMARY_SITUATION_CHROME_LOCALIZATION.md) - War Summary non-overview convoy, local-support, OPSEC, and diplomacy headings/empty states plus OPSEC operation-health labels now render through English/BCS localization.

**Latest BCS Presidential Toolbar chrome localization:** [implemented/20260523_BCS_PRESIDENTIAL_TOOLBAR_CHROME_LOCALIZATION.md](implemented/20260523_BCS_PRESIDENTIAL_TOOLBAR_CHROME_LOCALIZATION.md) - Tactical-map toolbar primary labels, titles, advance copy, current-turn suffix, and command-authority accessibility text now render through English/BCS localization.

**Latest BCS Settlement Timeline localization:** [implemented/20260523_BCS_SETTLEMENT_TIMELINE_LOCALIZATION.md](implemented/20260523_BCS_SETTLEMENT_TIMELINE_LOCALIZATION.md) - Settlement timeline dates, empty state, and component-owned casualty row now render through deterministic English/BCS localization.

**Latest BCS War Planning map date formatting:** [implemented/20260523_BCS_WAR_PLANNING_MAP_DATE_FORMATTING.md](implemented/20260523_BCS_WAR_PLANNING_MAP_DATE_FORMATTING.md) - War Planning map turn-date labels now use deterministic English/BCS short month tables keyed by active locale.

**Latest BCS Warroom date formatting:** [implemented/20260523_BCS_WARROOM_DATE_FORMATTING.md](implemented/20260523_BCS_WARROOM_DATE_FORMATTING.md) - Warroom date, month-year, week, and short toolbar labels now use deterministic English/BCS month tables keyed by active locale.

**Latest BCS map shared date formatting:** [implemented/20260523_BCS_MAP_SHARED_DATE_FORMATTING.md](implemented/20260523_BCS_MAP_SHARED_DATE_FORMATTING.md) - Tactical-map shared turn date labels now use deterministic English/BCS short month tables keyed by active locale.

**Latest BCS Decision Room card prose localization:** [implemented/20260523_BCS_DECISION_ROOM_CARD_PROSE_LOCALIZATION.md](implemented/20260523_BCS_DECISION_ROOM_CARD_PROSE_LOCALIZATION.md) - Decision Room owned generated card titles, explanations, evidence, source owners, and action labels now render through the English/BCS substrate while source-provided external prose remains a separate localization target.

**Latest BCS Decision Room read-model chrome localization:** [implemented/20260523_BCS_DECISION_ROOM_READ_MODEL_CHROME_LOCALIZATION.md](implemented/20260523_BCS_DECISION_ROOM_READ_MODEL_CHROME_LOCALIZATION.md) - Decision Room category lenses, command lanes, product-loop labels/fallbacks, count summaries, source-handoff labels, and handoff actions now render through the English/BCS substrate.

**Latest BCS Presidential Inbox chrome localization:** [implemented/20260523_BCS_PRESIDENTIAL_INBOX_CHROME_LOCALIZATION.md](implemented/20260523_BCS_PRESIDENTIAL_INBOX_CHROME_LOCALIZATION.md) - Presidential Inbox panel title, situation divider, severity/type badges, notification dismiss, update chip, opening briefs, quiet state, and toolbar badge titles now render through the English/BCS substrate.

**Latest BCS Decision Room panel chrome localization:** [implemented/20260523_BCS_DECISION_ROOM_PANEL_CHROME_LOCALIZATION.md](implemented/20260523_BCS_DECISION_ROOM_PANEL_CHROME_LOCALIZATION.md) - Army HQ Decision Room panel title, advanced toggle/metrics, loop headings, dossier labels, source handoff headings, and review-before-advance section labels now render through the English/BCS substrate.

**Latest BCS Decision Room advance-readiness localization:** [implemented/20260523_BCS_DECISION_ROOM_ADVANCE_READINESS_LOCALIZATION.md](implemented/20260523_BCS_DECISION_ROOM_ADVANCE_READINESS_LOCALIZATION.md) - Decision Room advance-readiness headlines, active-dossier advance badge, and pre-advance pending-decision gate title now render through the English/BCS substrate.

**Latest BCS Warroom status bar localization:** [implemented/20260523_BCS_WARROOM_STATUS_BAR_LOCALIZATION.md](implemented/20260523_BCS_WARROOM_STATUS_BAR_LOCALIZATION.md) - Warroom status bar phase, priority, advance, docket panel, empty-state, urgency-title, and category badge labels now render through the English/BCS substrate.

**Latest BCS Warroom priority docket localization:** [implemented/20260523_BCS_WARROOM_PRIORITY_DOCKET_LOCALIZATION.md](implemented/20260523_BCS_WARROOM_PRIORITY_DOCKET_LOCALIZATION.md) - Warroom priority docket summary, source-handoff summary, and open-Decision-Room label now render through the English/BCS substrate.

**Latest BCS Letter Home localization:** [implemented/20260523_BCS_LETTER_HOME_LOCALIZATION.md](implemented/20260523_BCS_LETTER_HOME_LOCALIZATION.md) - Chief of Staff Letter Home now passes active locale into the deterministic generator, and all 25 shipped casualty vignette templates carry BCS prose.

**Latest BCS Chief of Staff header localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_HEADER_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_HEADER_LOCALIZATION.md) - Army HQ Chief of Staff briefing stamp, daily-briefing label, and staff title chrome now render through the English/BCS substrate.

**Latest BCS Chief of Staff combat-tone localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_COMBAT_TONE_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_COMBAT_TONE_LOCALIZATION.md) - Army HQ Chief of Staff precise/aggressive combat and territory summary prose now renders through the English/BCS substrate.

**Latest BCS Chief of Staff command-strain localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_COMMAND_STRAIN_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_COMMAND_STRAIN_LOCALIZATION.md) - Army HQ Chief of Staff command-strain institutional warning prose now renders through the English/BCS substrate for all briefing tones.

**Latest BCS Chief of Staff alert-tone localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_ALERT_TONE_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_ALERT_TONE_LOCALIZATION.md) - Army HQ Chief of Staff precise/aggressive cohesion, operation, and thin-front alert prose now renders through the English/BCS substrate.

**Latest BCS Chief of Staff alert localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_ALERT_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_ALERT_LOCALIZATION.md) - Army HQ Chief of Staff cautious-tone cohesion, operation, and thin-front alert prose now renders through the English/BCS substrate.

**Latest BCS Chief of Staff exhaustion localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_EXHAUSTION_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_EXHAUSTION_LOCALIZATION.md) - Army HQ Chief of Staff war-exhaustion warning prose now renders through the English/BCS substrate for all briefing tones.

**Latest BCS Chief of Staff combat/territory localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_COMBAT_TERRITORY_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_COMBAT_TERRITORY_LOCALIZATION.md) - Army HQ Chief of Staff cautious-tone battle and territory summary prose now renders through the English/BCS substrate while preserving existing summary derivation.

**Latest BCS Chief of Staff stable briefing localization:** [implemented/20260523_BCS_CHIEF_OF_STAFF_STABLE_BRIEFING_LOCALIZATION.md](implemented/20260523_BCS_CHIEF_OF_STAFF_STABLE_BRIEFING_LOCALIZATION.md) - Army HQ Chief of Staff stable/no-alert greeting bank and baseline prose now render through the English/BCS substrate while preserving deterministic turn-based phrase selection.

**Latest BCS War Summary overview localization:** [implemented/20260523_BCS_WAR_SUMMARY_OVERVIEW_LOCALIZATION.md](implemented/20260523_BCS_WAR_SUMMARY_OVERVIEW_LOCALIZATION.md) - Army HQ War Summary overview territory, military-strength, displacement, SITREP, civilian-impact, full-faction labels, and staff-assessment prose now render through the English/BCS substrate.

**Latest BCS War Summary campaign-cost localization:** [implemented/20260523_BCS_WAR_SUMMARY_CAMPAIGN_COST_LOCALIZATION.md](implemented/20260523_BCS_WAR_SUMMARY_CAMPAIGN_COST_LOCALIZATION.md) - Army HQ War Summary title, subsection tabs, campaign-cost labels/severity, and campaign-drag labels/detail copy now render through the English/BCS substrate.

**Latest BCS Turn Aftermath archive localization:** [implemented/20260523_BCS_TURN_AFTERMATH_ARCHIVE_LOCALIZATION.md](implemented/20260523_BCS_TURN_AFTERMATH_ARCHIVE_LOCALIZATION.md) - Turn Aftermath campaign pulse/cost archive prose, cost-driver labels, Army HQ Records filters, metric labels/details, badges, and empty states now render through the English/BCS substrate.

**Latest BCS Turn Aftermath localization:** [implemented/20260523_BCS_TURN_AFTERMATH_LOCALIZATION.md](implemented/20260523_BCS_TURN_AFTERMATH_LOCALIZATION.md) - Turn Aftermath modal chrome, metrics, empty states, enum badges, generated headlines, narrative lines, cost reasons, strategic-signal wrapper labels, and judgment prose now render through the English/BCS substrate.

**Latest BCS Codex chrome localization:** [implemented/20260523_BCS_CODEX_CHROME_LOCALIZATION.md](implemented/20260523_BCS_CODEX_CHROME_LOCALIZATION.md) - `CodexPanel` title, essay-count line, empty/locked instructions, ghost/context labels, dynamic-section labels, pending text, and source heading now render through the English/BCS substrate.

**Latest BCS Codex/Chronicle comparison localization:** [implemented/20260523_BCS_CODEX_CHRONICLE_COMPARISON_LOCALIZATION.md](implemented/20260523_BCS_CODEX_CHRONICLE_COMPARISON_LOCALIZATION.md) - Codex dynamic comparison notes, Chronicle endgame cards, and Chronicle Wrapped comparison bullets now render current generated historical-comparison note shapes through the shared English/BCS formatter.

**Latest BCS Cinematic Verdict comparison localization:** [implemented/20260523_BCS_CINEMATIC_VERDICT_COMPARISON_LOCALIZATION.md](implemented/20260523_BCS_CINEMATIC_VERDICT_COMPARISON_LOCALIZATION.md) - `CinematicVerdict` visible comparison callouts and verdict share-summary comparison lines now reuse the localized historical-divergence note formatter.

**Latest BCS War Cost divergence-note localization:** [implemented/20260523_BCS_WAR_COST_DIVERGENCE_NOTES_LOCALIZATION.md](implemented/20260523_BCS_WAR_COST_DIVERGENCE_NOTES_LOCALIZATION.md) - `WarCostSummary` known generated historical divergence-note shapes now render through localized mappings with raw source-note fallback.

**Latest BCS Verdict Dayton-value localization:** [implemented/20260523_BCS_VERDICT_DAYTON_VALUES_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_DAYTON_VALUES_LOCALIZATION.md) - rich `VerdictScreen` Dayton package, institution, and patron-override values now render through stable localized mappings with raw source fallback.

**Latest BCS Verdict dimension-label localization:** [implemented/20260523_BCS_VERDICT_DIMENSION_LABELS_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_DIMENSION_LABELS_LOCALIZATION.md) - rich `VerdictScreen` negotiating-capital dimension labels now render through stable localized dimension-ID mappings with source-label fallback.

**Latest BCS Verdict condemnation localization:** [implemented/20260523_BCS_VERDICT_CONDEMNATION_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_CONDEMNATION_LOCALIZATION.md) - rich `VerdictScreen` known condemnation notice body text now renders through the existing English/BCS localization substrate.

**Latest BCS Verdict outcome-class localization:** [implemented/20260523_BCS_VERDICT_OUTCOME_CLASS_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_OUTCOME_CLASS_LOCALIZATION.md) - rich `VerdictScreen` faction-tab and report outcome-class badges now render through the existing English/BCS localization substrate.

**Latest BCS Verdict milestone localization:** [implemented/20260523_BCS_VERDICT_MILESTONE_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_MILESTONE_LOCALIZATION.md) - rich `VerdictScreen` milestone-comparison chrome and fallback duration-row labels now render through the existing English/BCS localization substrate.

**Latest BCS Verdict scene-prose localization:** [implemented/20260523_BCS_VERDICT_SCENE_PROSE_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_SCENE_PROSE_LOCALIZATION.md) - deterministic verdict scene headlines, subheadlines, and default Cost Ledger fallback/totals prose now render through the existing English/BCS localization substrate.

**Latest BCS Verdict share-summary localization:** [implemented/20260523_BCS_VERDICT_SHARE_SUMMARY_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_SHARE_SUMMARY_LOCALIZATION.md) - verdict share-summary wrapper text and outcome-class labels now render through the existing English/BCS localization substrate.

**Latest BCS Verdict Dayton-label localization:** [implemented/20260523_BCS_VERDICT_DAYTON_LABELS_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_DAYTON_LABELS_LOCALIZATION.md) - rich `VerdictScreen` FactionReport Dayton detail labels now render through the existing English/BCS localization substrate.

**Latest BCS Cinematic Verdict chrome localization:** [implemented/20260523_BCS_CINEMATIC_VERDICT_CHROME_LOCALIZATION.md](implemented/20260523_BCS_CINEMATIC_VERDICT_CHROME_LOCALIZATION.md) - `CinematicVerdict` static metric labels, campaign/not-recorded fallback text, share-summary heading, and copy button now render through the existing English/BCS localization substrate.

**Latest BCS War Cost Summary localization:** [implemented/20260523_BCS_WAR_COST_SUMMARY_LOCALIZATION.md](implemented/20260523_BCS_WAR_COST_SUMMARY_LOCALIZATION.md) - `WarCostSummary` static labels, section headings, opportunity labels, exit-class labels, source prefix, and helper formatter strings now render through the existing English/BCS localization substrate.

**Latest BCS Verdict report-label localization:** [implemented/20260523_BCS_VERDICT_REPORT_LABELS_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_REPORT_LABELS_LOCALIZATION.md) - the rich `VerdictScreen` FactionReport static headings, mobile report toggles, and final-stat row labels now render through the existing English/BCS localization substrate.

**Latest BCS Verdict chrome localization:** [implemented/20260523_BCS_VERDICT_CHROME_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_CHROME_LOCALIZATION.md) - the rich `VerdictScreen` mobile lower-section tabs and footer chrome now render through the existing English/BCS localization substrate.

**Latest BCS Verdict fallback localization:** [implemented/20260523_BCS_VERDICT_FALLBACK_LOCALIZATION.md](implemented/20260523_BCS_VERDICT_FALLBACK_LOCALIZATION.md) - the no-verdict `VerdictScreen` fallback now renders outcome, final standings, metric rows, campaign duration, and footer actions through the existing English/BCS localization substrate.

**Latest BCS Game Over localization:** [implemented/20260523_BCS_GAME_OVER_LOCALIZATION.md](implemented/20260523_BCS_GAME_OVER_LOCALIZATION.md) - the fallback Game Over modal now renders outcome, final standings, faction metric lines, campaign duration, and footer actions through the existing English/BCS localization substrate.

**Latest BCS Side Picker localization:** [implemented/20260523_BCS_SIDE_PICKER_LOCALIZATION.md](implemented/20260523_BCS_SIDE_PICKER_LOCALIZATION.md) - the new-campaign side picker now renders its title, force suffix, load/continue controls, file input label, and close action through the existing English/BCS localization substrate.

**Latest BCS Credits localization:** [implemented/20260523_BCS_CREDITS_LOCALIZATION.md](implemented/20260523_BCS_CREDITS_LOCALIZATION.md) - the Credits screen now renders title, section headings, source framing, dedication, and close affordances through the existing English/BCS localization substrate.

**Latest BCS Main Menu localization:** [implemented/20260523_BCS_MAIN_MENU_LOCALIZATION.md](implemented/20260523_BCS_MAIN_MENU_LOCALIZATION.md) - the full-screen Main Menu now renders publisher line, theater/date line, primary actions, and secondary actions through the existing English/BCS localization substrate.

**Latest BCS Settings Audio localization:** [implemented/20260523_BCS_SETTINGS_AUDIO_LOCALIZATION.md](implemented/20260523_BCS_SETTINGS_AUDIO_LOCALIZATION.md) - the Settings Audio tab, soundscape row, master-volume row, and associated aria labels now render through the existing English/BCS localization substrate.

**Latest BCS pause menu localization:** [implemented/20260523_BCS_PAUSE_MENU_LOCALIZATION.md](implemented/20260523_BCS_PAUSE_MENU_LOCALIZATION.md) - the in-game pause menu now renders title, shortcut, actions, overlay label, and preserved-planning notice through the existing English/BCS localization substrate.

**Latest soundscape observer wiring:** [implemented/20260523_SOUNDSCAPE_OBSERVER_WIRING.md](implemented/20260523_SOUNDSCAPE_OBSERVER_WIRING.md) - the tactical-map root now mounts a remount-safe observer that turns newly observed loaded-state turn summaries into silent-bus cue calls while suppressing initial hydration.

**Latest soundscape cooldown suppression:** [implemented/20260523_SOUNDSCAPE_COOLDOWN_SUPPRESSION.md](implemented/20260523_SOUNDSCAPE_COOLDOWN_SUPPRESSION.md) - the silent audio bus now honors cue cooldown metadata when callers provide explicit timestamps, without adding wall-clock reads or playback IO.

**Latest soundscape event adapter:** [implemented/20260523_SOUNDSCAPE_EVENT_ADAPTER.md](implemented/20260523_SOUNDSCAPE_EVENT_ADAPTER.md) - a pure UI adapter now maps newly observed turn summaries, decisive battles, fired events, and completed operation AARs to stable cue requests without playback side effects.

**Latest soundscape cue metadata readiness:** [implemented/20260523_SOUNDSCAPE_CUE_METADATA_READINESS.md](implemented/20260523_SOUNDSCAPE_CUE_METADATA_READINESS.md) - the tactical-map audio manifest now records cooldown, missing-asset status, and reduced-motion policy metadata for every silent placeholder cue.

**Latest launch high concept:** [../50_launch/marketing/high_concept.md](../50_launch/marketing/high_concept.md) - launch-facing one-pager now separates playable-now scope, pending operator evidence, and future/gated claims with traceable evidence pointers.

**Latest diplomacy actor stance prose:** [implemented/20260523_DIPLOMACY_ACTOR_STANCE_PROSE.md](implemented/20260523_DIPLOMACY_ACTOR_STANCE_PROSE.md) - Diplomacy actor rows now render deterministic public-safe stance prose from existing support, constraint, isolation, and sanctions bands.

**Latest localized crash diagnostics:** [implemented/20260523_LOCALIZED_CRASH_DIAGNOSTICS.md](implemented/20260523_LOCALIZED_CRASH_DIAGNOSTICS.md) - React error boundaries now record opt-in local crash diagnostics with the boundary zone as the UI surface, closing the console-only localized failure gap.

**Latest sector enemy-personnel index:** [implemented/20260523_SECTOR_ENEMY_PERSONNEL_INDEX.md](implemented/20260523_SECTOR_ENEMY_PERSONNEL_INDEX.md) - sector brigade assignment now builds one deterministic enemy-personnel-by-OSID index per invocation instead of rescanning all formations per sector for territory assignment and threat recomputation.

**Latest brigade movement order helper:** [implemented/20260523_BRIGADE_MOVEMENT_ORDER_HELPER.md](implemented/20260523_BRIGADE_MOVEMENT_ORDER_HELPER.md) - column-march movement producers now use a shared typed helper instead of repeated local `destination_sids` shape casts, while preserving optional `stance` semantics.

**Latest formation-spawn directive narrowing:** [implemented/20260523_FORMATION_SPAWN_DIRECTIVE_NARROWING.md](implemented/20260523_FORMATION_SPAWN_DIRECTIVE_NARROWING.md) - active formation-spawn directive reads now use a local narrowing helper instead of caller-side non-null assertions, while preserving the optional directive contract.

**Latest CLI harness BFS queue cursor:** [implemented/20260523_CLI_HARNESS_BFS_QUEUE_CURSOR.md](implemented/20260523_CLI_HARNESS_BFS_QUEUE_CURSOR.md) - Phase 3A A/B and Phase 3ABC diagnostic harness seed-builder BFS loops now use head cursors instead of `Array.shift()` while preserving deterministic report hashes.

**Latest event-notification blocked residual classification:** [implemented/20260522_EVENT_NOTIFICATION_BLOCKED_RESIDUAL_CLASSIFICATION.md](implemented/20260522_EVENT_NOTIFICATION_BLOCKED_RESIDUAL_CLASSIFICATION.md) - The final 2 rows / 4 missing notification blocks are now diagnostically classified as blocked-sensitive, with 0 unclassified residual blocks.

**Latest strict-null optional interface summary:** [implemented/20260522_STRICT_NULL_OPTIONAL_INTERFACE_SUMMARY.md](implemented/20260522_STRICT_NULL_OPTIONAL_INTERFACE_SUMMARY.md) - `tools/diagnostics/strict_null_inventory.cjs --field-interfaces` now groups optional `GameState` fields by interface/domain so future optional-field work can pick bounded owner slices from evidence.

**Latest event-notification Srebrenica demilitarization slice:** [implemented/20260522_EVENT_NOTIFICATION_SREBRENICA_DEMILITARIZATION.md](implemented/20260522_EVENT_NOTIFICATION_SREBRENICA_DEMILITARIZATION.md) - `srebrenica_demilitarization_1993` now has complete non-source recipient notification coverage; Phase D residual is down to 2 rows / 4 blocked-sensitive press blocks.

**Latest event-notification 1992 historian slice:** [implemented/20260522_EVENT_NOTIFICATION_1992_HISTORIAN_ROWS.md](implemented/20260522_EVENT_NOTIFICATION_1992_HISTORIAN_ROWS.md) - `drina_cleansing_decision_1992` and `concentration_camps_revealed_1992` now have complete non-source recipient notification coverage; Phase D residual is down to 3 rows / 10 blocks.

**Latest event-notification front-visit command-signaling slice:** [implemented/20260522_EVENT_NOTIFICATION_FRONT_VISIT_COMMAND.md](implemented/20260522_EVENT_NOTIFICATION_FRONT_VISIT_COMMAND.md) - Sarajevo and Drina front-visit command-signaling options now have non-source recipient notification coverage; Phase D residual is down to 5 rows / 20 blocks.

**Latest event-notification Igman/Lukavac slice:** [implemented/20260522_EVENT_NOTIFICATION_IGMAN_LUKAVAC.md](implemented/20260522_EVENT_NOTIFICATION_IGMAN_LUKAVAC.md) - `operation_lukavac_93` now has complete non-source recipient notification coverage; Phase D residual dropped to 6 rows / 26 blocks before the front-visit command-signaling slice.

**Latest event-notification NATO/UN crisis slice:** [implemented/20260522_EVENT_NOTIFICATION_NATO_UN_CRISIS.md](implemented/20260522_EVENT_NOTIFICATION_NATO_UN_CRISIS.md) - `nato_ultimatum_sarajevo_1994` and `un_hostage_crisis_1995` now have complete non-source recipient notification coverage; Phase D residual dropped to 7 rows / 30 blocks before the Igman/Lukavac slice.

**Latest event-notification residual diagnostic:** [implemented/20260522_EVENT_NOTIFICATION_RESIDUAL_DIAGNOSTIC.md](implemented/20260522_EVENT_NOTIFICATION_RESIDUAL_DIAGNOSTIC.md) - `tools/diagnostics/event_notification_residuals.cjs` computes the current missing recipient-block floor from event JSON and a focused test pins the 7-row / 30-block residual event set.

**Latest event-notification front-visit narrative-tone slice:** [implemented/20260522_EVENT_NOTIFICATION_FRONT_VISIT_TONE.md](implemented/20260522_EVENT_NOTIFICATION_FRONT_VISIT_TONE.md) - Bihac, RBiH press, Mostar, and central-Bosnia front-visit response options now have non-source recipient notification coverage; Phase D residual is down to 9 rows / 38 blocks.

**Latest event-notification 1995 late-war outcome slice:** [implemented/20260522_EVENT_NOTIFICATION_1995_LATE_WAR_OUTCOME.md](implemented/20260522_EVENT_NOTIFICATION_1995_LATE_WAR_OUTCOME.md) - `karadzic_mladic_split_1995`, `us_halts_federation_advance_1995`, `holbrooke_ceasefire_demand_oct95`, and `dayton_talks_begin_1995` now have complete non-source recipient notification coverage; Phase D residual dropped to 9 rows / 46 blocks before the front-visit narrative-tone slice.

**Latest event-notification 1994 late-war diplomacy slice:** [implemented/20260522_EVENT_NOTIFICATION_1994_LATE_WAR_DIPLOMACY.md](implemented/20260522_EVENT_NOTIFICATION_1994_LATE_WAR_DIPLOMACY.md) - `contact_group_plan_1994`, `belgrade_embargo_rs_1994`, and `carter_ceasefire_1994` now have complete non-source recipient notification coverage; Phase D residual dropped to 13 rows / 62 blocks before the 1995 late-war outcome slice.

**Latest event-notification Washington-timing slice:** [implemented/20260522_EVENT_NOTIFICATION_WASHINGTON_TIMING.md](implemented/20260522_EVENT_NOTIFICATION_WASHINGTON_TIMING.md) - `washington_agreement_1994` and `ic_rbih_restraint_post_washington` now have complete non-source recipient notification coverage under the two-clock Washington policy; Phase D residual dropped to 16 rows / 74 blocks before the 1994 late-war diplomacy slice.

**Latest event-notification narrative-tone slice:** [implemented/20260522_EVENT_NOTIFICATION_NARRATIVE_TONE_1992.md](implemented/20260522_EVENT_NOTIFICATION_NARRATIVE_TONE_1992.md) - `rs_strategic_goals` and `rbih_state_identity` now have complete non-source recipient notification coverage; Phase D residual dropped to 18 rows / 82 blocks before the Washington-timing slice.

**Latest strict-null Warroom fallback-region cleanup:** [implemented/20260524_STRICT_NULL_WARROOM_FALLBACK_REGION_TYPES.md](implemented/20260524_STRICT_NULL_WARROOM_FALLBACK_REGION_TYPES.md) - The production strict-null escape floor is now zero for counted `as FactionId`, `as unknown`, `as any`, dot non-null, and index non-null sites. The remaining strict-null lane is the 488-field optional `GameState` contract floor split by domain (`sim` 305, `state` 175, `derived` 8, no unknown bucket) after the displacement aggregate schema contract promotion.

**Strict-null GameStateAdapter tail:** [implemented/20260522_STRICT_NULL_GAME_STATE_ADAPTER_TAIL.md](implemented/20260522_STRICT_NULL_GAME_STATE_ADAPTER_TAIL.md) - `src/ui/map/data/GameStateAdapter.ts` now contributes zero counted `as_any_casts` and `as_factionid_casts`; the current top-level strict-null floor is guarded by the optional GameState contract report.
**Latest strict-null optional GameState contract guard:** [implemented/20260522_STRICT_NULL_OPTIONAL_GAMESTATE_CONTRACT_GUARD.md](implemented/20260522_STRICT_NULL_OPTIONAL_GAMESTATE_CONTRACT_GUARD.md) - The remaining strict-null lane is now pinned as a 477-field optional `GameState` contract floor split by domain (`sim` 296, `state` 173, `derived` 8, no unknown bucket) with zero counted casts/assertions.

**Strict-null GameStateAdapter tail:** [implemented/20260522_STRICT_NULL_GAME_STATE_ADAPTER_TAIL.md](implemented/20260522_STRICT_NULL_GAME_STATE_ADAPTER_TAIL.md) - `src/ui/map/data/GameStateAdapter.ts` now contributes zero counted `as_any_casts` and `as_factionid_casts`; top-level strict-null counted escapes are all zero except the optional `GameState` field inventory.

**Latest strict-null save migration tail:** [implemented/20260522_STRICT_NULL_SAVE_MIGRATION_TAIL.md](implemented/20260522_STRICT_NULL_SAVE_MIGRATION_TAIL.md) - `src/state/save_migration.ts` now contributes zero `as_any_casts`; top-level strict-null inventory is down to `as_any_casts 8`, all in `GameStateAdapter.ts`.

**Latest strict-null Phase 3ABC audit harness tail:** [implemented/20260522_STRICT_NULL_PHASE3ABC_AUDIT_HARNESS_TAIL.md](implemented/20260522_STRICT_NULL_PHASE3ABC_AUDIT_HARNESS_TAIL.md) - `src/cli/phase3abc_audit_harness.ts` now contributes zero `as_any_casts`; top-level strict-null inventory is down to `as_any_casts 31` with `as_unknown` and non-null assertion categories at zero.

**Latest strict-null Phase 3A A/B harness tail:** [implemented/20260522_STRICT_NULL_PHASE3A_AB_HARNESS_TAIL.md](implemented/20260522_STRICT_NULL_PHASE3A_AB_HARNESS_TAIL.md) - `src/cli/phase3a_ab_harness.ts` now contributes zero `as_any_casts`; top-level strict-null inventory is down to `as_any_casts 64` with `as_unknown` and non-null assertion categories at zero.

**Latest strict-null sim scenario CLI tail:** [implemented/20260522_STRICT_NULL_SIM_SCENARIO_CLI_TAIL.md](implemented/20260522_STRICT_NULL_SIM_SCENARIO_CLI_TAIL.md) - `src/cli/sim_scenario.ts` now contributes zero `as_any_casts`; top-level strict-null inventory is down to `as_any_casts 95` with `as_unknown` and non-null assertion categories at zero.

**Latest GUI retired chrome removal H9:** [implemented/20260522_GUI_AUDIT_RETIRED_CHROME_REMOVAL_H9.md](implemented/20260522_GUI_AUDIT_RETIRED_CHROME_REMOVAL_H9.md) - ninth Batch H slice from the 2026-05-22 GUI visual audit: unused retired tactical chrome files were deleted after import review, with a guard keeping them off disk.

**Latest GUI Army HQ commander empty-state H8:** [implemented/20260522_GUI_AUDIT_ARMY_HQ_COMMANDER_EMPTY_STATE_H8.md](implemented/20260522_GUI_AUDIT_ARMY_HQ_COMMANDER_EMPTY_STATE_H8.md) - eighth Batch H slice from the 2026-05-22 GUI visual audit: Army HQ commander lookup now falls back to active flattened officer data when sidecar state rows are absent.

**Latest GUI Warroom desk map H7:** [implemented/20260522_GUI_AUDIT_WARROOM_DESK_MAP_H7.md](implemented/20260522_GUI_AUDIT_WARROOM_DESK_MAP_H7.md) - seventh Batch H slice from the 2026-05-22 GUI visual audit: the Warroom desk-map projection now fills more of its hotspot and uses stronger paper/frame/ink contrast.

**Latest GUI supply legend overlap H6:** [implemented/20260522_GUI_AUDIT_SUPPLY_LEGEND_OVERLAP_H6.md](implemented/20260522_GUI_AUDIT_SUPPLY_LEGEND_OVERLAP_H6.md) - sixth Batch H slice from the 2026-05-22 GUI visual audit: Supply mode overlays now anchor outside the left OOB sidebar column so they do not cover Situation/Alliance content.

**Latest GUI Command Briefing banner H5:** [implemented/20260522_GUI_AUDIT_COMMAND_BRIEFING_BANNER_H5.md](implemented/20260522_GUI_AUDIT_COMMAND_BRIEFING_BANNER_H5.md) - fifth Batch H slice from the 2026-05-22 GUI visual audit: the COMMAND BRIEFING banner now anchors away from the top-center counter field and uses opaque, high-contrast backing/text.

**Latest GUI Warroom calendar H4:** [implemented/20260522_GUI_AUDIT_WARROOM_CALENDAR_H4.md](implemented/20260522_GUI_AUDIT_WARROOM_CALENDAR_H4.md) - fourth Batch H slice from the 2026-05-22 GUI visual audit: Warroom calendar labels now fall back to full turn-derived dates for partial metadata and use a sober non-truncating font contract.

**Latest GUI map mode shortcut contract H3:** [implemented/20260522_GUI_AUDIT_MAP_MODE_SHORTCUT_CONTRACT_H3.md](implemented/20260522_GUI_AUDIT_MAP_MODE_SHORTCUT_CONTRACT_H3.md) - third Batch H slice from the 2026-05-22 GUI visual audit: numeric map-mode shortcuts now derive from `MAP_MODES`, key `9` selects Legitimacy, and player/engineering docs describe the nine live modes.

**Latest GUI ops planning draft guard H2:** [implemented/20260522_GUI_AUDIT_OPS_PLANNING_DRAFT_GUARD_H2.md](implemented/20260522_GUI_AUDIT_OPS_PLANNING_DRAFT_GUARD_H2.md) - second Batch H slice from the 2026-05-22 GUI visual audit: Ops Planning now confirms discard when a draft has assigned objectives or brigades, and axis IDs derive from local plan state instead of a module-global counter.

**Latest GUI polish cleanup H1:** [implemented/20260522_GUI_AUDIT_POLISH_CLEANUP_H1.md](implemented/20260522_GUI_AUDIT_POLISH_CLEANUP_H1.md) - first Batch H polish slice from the 2026-05-22 GUI visual audit: dead coachmark selector fields, dev separators, raw warning glyphs, duplicated force-launch constants, and OpsMap console logs are cleaned up with static guards.

**Latest GUI dead control feedback:** [implemented/20260522_GUI_AUDIT_DEAD_CONTROL_FEEDBACK.md](implemented/20260522_GUI_AUDIT_DEAD_CONTROL_FEEDBACK.md) - Batch G from the 2026-05-22 GUI visual audit: onboarding targets now draw a spotlight, unsupported order overrides no longer render as active no-op controls, and browser/no-IPC decision controls show bridge-unavailable feedback.

**Latest GUI Warroom shell ownership:** [implemented/20260522_GUI_AUDIT_WARROOM_SHELL_OWNERSHIP.md](implemented/20260522_GUI_AUDIT_WARROOM_SHELL_OWNERSHIP.md) - Batch F from the 2026-05-22 GUI visual audit: tactical chrome is now game-only, Warroom return affordances recognize `?view=warroom`, Army HQ close labels are de-duplicated, and Decision Room command-lane headlines are de-duplicated.

**Latest GUI stale-state resets:** [implemented/20260522_GUI_AUDIT_STALE_STATE_RESETS.md](implemented/20260522_GUI_AUDIT_STALE_STATE_RESETS.md) - Batch E from the 2026-05-22 GUI visual audit: selection-bound confirmations, Army HQ last-tab state, hidden Decision Room lens filters, and Inbox home overlay state now reset when their owning surface changes.

**Latest GUI modal palette unification:** [implemented/20260522_GUI_AUDIT_MODAL_PALETTE_UNIFICATION.md](implemented/20260522_GUI_AUDIT_MODAL_PALETTE_UNIFICATION.md) - Batch D from the 2026-05-22 GUI visual audit: `OperationBriefingModal` and `CommanderSelectionModal` now use dark panel tokens instead of the old light command-card palette.

**Latest GUI peace plan split meters:** [implemented/20260522_GUI_AUDIT_PEACE_PLAN_SPLIT_METERS.md](implemented/20260522_GUI_AUDIT_PEACE_PLAN_SPLIT_METERS.md) - Batch C peace-meter slice from the 2026-05-22 GUI visual audit: `GameStateAdapter` now resolves pending peace-plan display data through a static `PEACE_PLANS` import, so Vance-Owen meters render the catalog split instead of falling back to `0%`.

**Latest GUI peace plan dismissal scope:** [implemented/20260522_GUI_AUDIT_PEACE_PLAN_DISMISSAL_SCOPE.md](implemented/20260522_GUI_AUDIT_PEACE_PLAN_DISMISSAL_SCOPE.md) - Batch C stale peace-modal slice from the 2026-05-22 GUI visual audit: pending peace-plan dismissal is now scoped by `planId@turnOffered`, so dismissing one offered plan does not hide later or changed proposals.

**Latest GUI event modal dismissal:** [implemented/20260522_GUI_AUDIT_EVENT_MODAL_DISMISSAL.md](implemented/20260522_GUI_AUDIT_EVENT_MODAL_DISMISSAL.md) - Batch C event-notification slice from the 2026-05-22 GUI visual audit: non-decision event dispatches now use the shared Modal wrapper, expose a labelled dialog, and acknowledge through the same path for button, Escape, close affordance, and backdrop dismissal.

**Latest GUI MapLibre dasharray repair:** [implemented/20260522_GUI_AUDIT_MAPLIBRE_DASHARRAY.md](implemented/20260522_GUI_AUDIT_MAPLIBRE_DASHARRAY.md) - first Batch A render-correctness slice from the 2026-05-22 GUI visual audit: front stripes and supply-reach outlines now use literal `line-dasharray` values only, with isolated supply outlines split into a separate filtered layer.

**Latest GUI visual audit label discipline:** [implemented/20260522_GUI_AUDIT_LABEL_DISCIPLINE.md](implemented/20260522_GUI_AUDIT_LABEL_DISCIPLINE.md) - first Batch B slice from the 2026-05-22 GUI visual audit: Operational SITREP priority-front strings are recovered through player-facing OSID display names, Local Support headings no longer expose `Phase E`, and Army HQ opportunity pulse no longer exposes the internal `T3` reserve-crisis sentinel.

**Latest GUI decision/ops closeout:** [implemented/20260523_BCS_WAR_SUMMARY_INBOX_LOCALIZATION.md](implemented/20260523_BCS_WAR_SUMMARY_INBOX_LOCALIZATION.md), [implemented/20260523_BCS_OPS_PLANNING_LOCALIZATION.md](implemented/20260523_BCS_OPS_PLANNING_LOCALIZATION.md), [implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md](implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md), [implemented/20260516_GUI_D7_RIGHT_RAIL_DEV_HOST_CLOSEOUT.md](implemented/20260516_GUI_D7_RIGHT_RAIL_DEV_HOST_CLOSEOUT.md), [implemented/20260516_OPS_PLANNING_TARGET_DISCOVERY.md](implemented/20260516_OPS_PLANNING_TARGET_DISCOVERY.md), [implemented/20260516_CONVOY_SYSTEM_COMPLETION.md](implemented/20260516_CONVOY_SYSTEM_COMPLETION.md) - Audit Round 2 O7-O9 is closed for officer/OOB refs, renderer IPC contract shape, and tutorial copy/spotlight hygiene; D7 right-rail/dev-host residuals are closed; Ops Planning now has Suggest Plan, available-target count/highlight, guarded phase feedback, forward-sector default staging, and BCS-localized phase chrome, parameters, G-2 labels/narrative, CommanderPhase chrome, OPORD body sections, map legend prose, and authorization labels; War Summary overview, selected SituationTab empty/OPSEC states, and Presidential Inbox quiet-state chrome are also dictionary-backed; humanitarian convoys now have direct lifecycle tests and a dedicated Inbox modal resolver while aging/owner-semantics remain canon-blocked.
**Latest GUI decision/ops closeout:** [implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md](implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md), [implemented/20260516_GUI_D7_RIGHT_RAIL_DEV_HOST_CLOSEOUT.md](implemented/20260516_GUI_D7_RIGHT_RAIL_DEV_HOST_CLOSEOUT.md), [implemented/20260516_OPS_PLANNING_TARGET_DISCOVERY.md](implemented/20260516_OPS_PLANNING_TARGET_DISCOVERY.md), [implemented/20260516_CONVOY_SYSTEM_COMPLETION.md](implemented/20260516_CONVOY_SYSTEM_COMPLETION.md) - Audit Round 2 O7-O9 is closed for officer/OOB refs, renderer IPC contract shape, and tutorial copy/spotlight hygiene; D7 right-rail/dev-host residuals are closed; Ops Planning now has Suggest Plan, available-target count/highlight, guarded phase feedback, and forward-sector default staging; humanitarian convoys now have direct lifecycle tests and a dedicated Inbox modal resolver while aging/owner-semantics remain canon-blocked.

**Latest Track C/D browser visual validation:** [implemented/20260517_TRACK_C_D_BROWSER_VISUAL_VALIDATION.md](implemented/20260517_TRACK_C_D_BROWSER_VISUAL_VALIDATION.md) - browser validation captured Supply, Authority, and Legitimacy map modes; verified Decision Room and Chronicle coachmark anchor geometry; and fixed the Chronicle filter coachmark target from a `0x0` `display: contents` wrapper to a real filter-row rectangle.

**Latest CRT command-surface art direction:** [implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md](implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md) - live tactical command surfaces no longer render the CRT scanline overlay; OOBSidebar and Field Ops Snapshot stay in the archival dark-panel shell and are guarded by a static regression.

**Latest onboarding consolidation:** [implemented/20260516_FIRST_SESSION_PRODUCT_PROOF.md](implemented/20260516_FIRST_SESSION_PRODUCT_PROOF.md) - AAA+++ Phase 1 Track D is implemented for engineering scope: single-owner onboarding overlay, transition-gated PeaceWarTransition, first-hover coachmarks, and 3-bullet opening briefs.

**Latest tactical map information design:** [implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md](implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md) - AAA+++ Track C C1-C4 is implemented as deterministic UI read models: contested/disputed OSID bands, front-stability styling, supply-reach/isolation overlay, and separate Authority/Legitimacy map modes.

**Latest engine-health classifications:** [implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md](implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md), [implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md](implemented/20260516_BRIGADE_FRONT_ASSIGNMENT_ADAPTER_AUDIT.md), [implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md](implemented/20260516_VRS_1ST_KRAJINA_TESLIC_DRIFTERS.md), [implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md](implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md), [implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md](implemented/20260516_ARMY_HQ_ELITE_LOAN_DEPLOYMENT.md) - n1842 H1/H4/H5 are implemented pending parent scenario/188w verification; H1 adds defender-aware launch feasibility with typed `defender_power_too_high` / `no_launch_readiness` blockers; H2/H3 are closed report-only.

**Latest tactical shell frame cohesion:** [implemented/20260516_TACTICAL_SHELL_FRAME_COHESION.md](implemented/20260516_TACTICAL_SHELL_FRAME_COHESION.md) - tactical side rails and legacy side panels now share top/bottom frame clearance, right rail panels dock flush to the viewport edge, War Begins covers tactical rails, hidden flip-card backs no longer create corps-card gaps, and Side Picker load/continue actions use in-game icons instead of emoji.

**Latest first-run inbox / HQ flow polish:** [implemented/20260516_FIRST_RUN_INBOX_HQ_FLOW_POLISH.md](implemented/20260516_FIRST_RUN_INBOX_HQ_FLOW_POLISH.md) - tactical first-run overlays now sequence War Begins before tutorial and suppress orientation while blocking onboarding is active; Presidential Inbox situation cards route to Army HQ BRIEFING without becoming badge obligations; and Army HQ BRIEFING starts with Chief of Staff context before Decision Room synthesis.

**Latest presidential decision room:** [implemented/20260502_PRESIDENTIAL_DECISION_ROOM_STRATEGIC_PRIORITIES.md](implemented/20260502_PRESIDENTIAL_DECISION_ROOM_STRATEGIC_PRIORITIES.md), [implemented/20260502_DECISION_ROOM_PRIORITY_LENSES.md](implemented/20260502_DECISION_ROOM_PRIORITY_LENSES.md), [implemented/20260502_PRE_ADVANCE_REVIEW_ITEM_DEEP_LINKS.md](implemented/20260502_PRE_ADVANCE_REVIEW_ITEM_DEEP_LINKS.md) - Army HQ BRIEFING contains a deterministic Strategic Priorities board that prioritizes existing review, opportunity, SITREP, briefing, hard-turn, active-cost, and Chronicle signals and routes each card to an existing owner; local lenses filter the board by source category and pre-advance review rows preserve source targets.

**Latest tactical map overlay cleanup:** [implemented/20260516_REMOVE_SECTOR_DEMARCATION_OVERLAY.md](implemented/20260516_REMOVE_SECTOR_DEMARCATION_OVERLAY.md) - same-faction lateral sector demarcation lines and their hit layers were removed from the tactical map; sector readability now uses front/contact lines, selected-sector fill/glow, and brigade rings.

**Latest tactical map click/camera fix:** [implemented/20260516_TACTICAL_MAP_CLICK_PICKING_AND_CAMERA_BOUNDS.md](implemented/20260516_TACTICAL_MAP_CLICK_PICKING_AND_CAMERA_BOUNDS.md) - brigade counter clicks now resolve through deterministic screen-space fallback before OSID/sector hitboxes, direct formation clicks clear stale rail context, panel/control chrome clears the command shell, and the map is fixed to 30-degree BiH-bounded navigation.

**Latest React Warroom dynamic board overlays:** [implemented/20260516_REACT_WARROOM_DYNAMIC_BOARD_OVERLAYS.md](implemented/20260516_REACT_WARROOM_DYNAMIC_BOARD_OVERLAYS.md) - the React shell now renders dynamic board regions under their hotspots: the corkboard/desk-map shows a player-faction-only paper map with current front lines, and the wall board shows the current date in blue marker.

**Latest opportunity surface:** [implemented/20260501_OPERATION_OPPORTUNITY_FOOTPRINT_REDIRECT_DTO.md](implemented/20260501_OPERATION_OPPORTUNITY_FOOTPRINT_REDIRECT_DTO.md) - pending opportunity proposals now persist objective/staging footprints and redirect variant snapshots; Army HQ dossiers render player-safe labels, map highlighting, and variant-specific Redirect controls.

**Latest commander CPU optimization:** [implemented/20260515_COMMANDER_ENEMY_EQUIPMENT_SUMMARY_CONTEXT.md](implemented/20260515_COMMANDER_ENEMY_EQUIPMENT_SUMMARY_CONTEXT.md) - n1838 kept final hash `0cb626c032204372` and moved enemy-equipment summary support maps to a pass-local context; `.buildBriefing.enemyEquipmentSummary` dropped 115.916ms -> 11.176ms, with 54.218ms of context construction cost. Prior commander optimization: [implemented/20260515_COMMANDER_CORPS_SUBORDINATES_INDEX.md](implemented/20260515_COMMANDER_CORPS_SUBORDINATES_INDEX.md).

**Latest bot-order CPU optimization:** [implemented/20260515_BOT_ORDERS_LAZY_OFFICER_LOOKUP.md](implemented/20260515_BOT_ORDERS_LAZY_OFFICER_LOOKUP.md) - n1833 kept final hash `0cb626c032204372` and made the pass-local bot-order officer lookup lazy; `bot_orders.executeFactionDirectives.officerIndex` dropped 42.553ms / 120 builds -> 4.279ms / 46 builds while preserving direct-objective sectorAttack prediction semantics.

**Latest bot-order CPU profile split:** [implemented/20260515_BOT_ORDERS_UNCONTESTED_CANDIDATE_GATES_PROFILE_SPLIT.md](implemented/20260515_BOT_ORDERS_UNCONTESTED_CANDIDATE_GATES_PROFILE_SPLIT.md) - n1836 kept final hash `0cb626c032204372` and split uncontested candidate gates by operational-prefix, controller, alliance, and enclave guards; the largest home-defense child was `.candidateGates.controller` at 6.802ms / 21,038 checks, so these local gates are not follow-up optimization targets from this evidence. Prior profile split: [implemented/20260515_BOT_ORDERS_DEFENDER_POWER_RESIDUAL_PROFILE_SPLIT.md](implemented/20260515_BOT_ORDERS_DEFENDER_POWER_RESIDUAL_PROFILE_SPLIT.md).

**Latest bot-order rejected CPU candidate:** [implemented/20260515_BOT_ORDERS_DEFENSIVE_SECTOR_LOOKUP_CACHE_REJECTED.md](implemented/20260515_BOT_ORDERS_DEFENSIVE_SECTOR_LOOKUP_CACHE_REJECTED.md) - n1831 kept final hash `0cb626c032204372`, but the lazy corps sector-id lookup added 15.278ms of index cost and worsened `.defensive.sectorCounterAttackSectorLookup` 13.205ms -> 14.669ms, so the implementation was reverted. Earlier rejected shape: [implemented/20260515_BOT_ORDERS_UNCONTESTED_SALIENT_CACHE_REJECTED.md](implemented/20260515_BOT_ORDERS_UNCONTESTED_SALIENT_CACHE_REJECTED.md).

**As of 2026-02-15:** All implemented report content has been consolidated into one dated document. Individual reports have been archived (not deleted).

| What you need | Where to go |
|---------------|-------------|
| **Full consolidated content** | [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — sections 1–37 with all implementation summaries (… §48 = HoI GUI Overhaul …). |
| **React map app (canonical GUI) — full status for external review** | [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md) — comprehensive done/remaining vs AWWV_GUI_ARCHITECTURE_REWORK_v2.md; Phases 1–2 complete, Phase 3 partial; full component and file inventory; verification checklist. |
| **Archived individual reports** | `docs/_old/40_reports/implemented_2026_02_15/` — original report files preserved for history. New reports (2026-02-16+) remain in [implemented/](implemented/) (e.g. WARROOM_RESTYLE_*, … [20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md](implemented/20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md) (§39), [20260224_SESSION_REPORT_FORMATIONS_ZOC_PLAN_EXECUTION_AND_FIXES.md](implemented/20260224_SESSION_REPORT_FORMATIONS_ZOC_PLAN_EXECUTION_AND_FIXES.md) (§40), [20260224_MOBILIZATION_FORCE_GROWTH_AND_SCENARIO_INIT_FULL_REPORT.md](implemented/20260224_MOBILIZATION_FORCE_GROWTH_AND_SCENARIO_INIT_FULL_REPORT.md) (§41), [20260224_OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION.md](implemented/20260224_OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION.md) (§42)). |

---

| **Operation opportunity force-quality dossier** | [implemented/20260501_OPERATION_OPPORTUNITY_FORCE_QUALITY_DOSSIER.md](implemented/20260501_OPERATION_OPPORTUNITY_FORCE_QUALITY_DOSSIER.md) — pending opportunity proposals now persist a force-quality trait snapshot and Army HQ dossiers render player-safe bands for readiness, staging, coordination, support, recovery, reserves, and collapse risk. |
| **Operation opportunity decision bridge** | [implemented/20260501_OPERATION_OPPORTUNITY_DECISION_BRIDGE.md](implemented/20260501_OPERATION_OPPORTUNITY_DECISION_BRIDGE.md) — pending `OPPORTUNITY:<proposal_id>` reviews now resolve through a rich review-row IPC bridge; Authorize, Delay, Under-resource, and Decline are live in Army HQ dossiers, with Redirect backend-validated pending variant DTOs. |
| **Operation opportunity dossier surface** | [implemented/20260501_OPERATION_OPPORTUNITY_DOSSIER_SURFACE.md](implemented/20260501_OPERATION_OPPORTUNITY_DOSSIER_SURFACE.md) — pending `OPPORTUNITY:<proposal_id>` reviews route from Presidential Inbox to Army HQ briefing dossiers with prerequisite chips, recommendation, expiry, and the original Authorize / Decline MVP actions. |
| **Dev-map browser-safe import recovery** | [implemented/20260401_DEV_MAP_BROWSER_SAFE_IMPORT_RECOVERY.md](implemented/20260401_DEV_MAP_BROWSER_SAFE_IMPORT_RECOVERY.md) — recovered `npm run dev:map` after Node-only `fs/path` loaders leaked into the tactical-map browser import graph; split Node loaders into `*_node.ts`, kept shared helpers browser-safe, and added a browser-bundle regression test. |
| **Shell ownership + HQ records canonicalization** | [implemented/20260402_SHELL_OWNERSHIP_AND_HQ_RECORDS_CANONICALIZATION.md](implemented/20260402_SHELL_OWNERSHIP_AND_HQ_RECORDS_CANONICALIZATION.md) — clarified that `PresidentialToolbar` is the live tactical-map shell, routed AAR/operation-history ownership through Army HQ `RECORDS`, added explicit top-shell buttons for summary/records/ops/events/Codex, and reframed tactical `OperationsPanel` as a field snapshot with `HQ Review` routing. |
| **Army HQ war summary player-truth pass** | [implemented/20260402_ARMY_HQ_WAR_SUMMARY_PLAYER_TRUTH.md](implemented/20260402_ARMY_HQ_WAR_SUMMARY_PLAYER_TRUTH.md) — removed exact all-faction overview tables from Army HQ `SUMMARY` in player mode, keeping own-side exact values and theater-wide aggregates while pushing enemy-wide truth back into staff abstractions. |
| **Engine-health Wave 1 correctness fixes** | [implemented/20260402_ENGINE_HEALTH_WAVE1_CORRECTNESS_FIXES.md](implemented/20260402_ENGINE_HEALTH_WAVE1_CORRECTNESS_FIXES.md) — first implemented slice of the 2026-04-02 engine triage: objective-relevant intel confidence, authoritative political war exhaustion in victory checks, and defender-aware corps launch-feasibility screening. |
| **Spatial model evolution (AoR → ZoC → Corps Sectors)** | [20260301_SPATIAL_MODEL_EVOLUTION_AOR_ZOC_CORPS_SECTORS.md](implemented/20260301_SPATIAL_MODEL_EVOLUTION_AOR_ZOC_CORPS_SECTORS.md) — three generations of spatial model, from AoR passive pressure through ZoC attack-driven control to Corps Sector BFS partitioning + GUI visualization. Canon propagated to Systems Manual §2.1/§8, War Spec §4, context.md, IPC contract. |
| **Multi-sector corps, supply gating, sector offensives** | [20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md](implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md) — Phase A: multi-sector promotion (MIN_SECTOR_EDGES, sector_targets). Phase B: supply gating (critical→defend, strained→victory-only; corps thresholds). Phase C: sector offensives (named operations, momentum, lifecycle). n314 87.4%. Canon: Systems Manual §2.1, §6.4, §6.5, §14.5; War Spec §5, §10. |
| **Phase M — Year-one mechanics (complete)** | [PHASE_M_EXECUTION_PLAN.md](implemented/PHASE_M_EXECUTION_PLAN.md), [20260301_PHASE_M_IMPLEMENTATION_REPORT.md](implemented/20260301_PHASE_M_IMPLEMENTATION_REPORT.md), [20260301_PHASE_M_CALIBRATION_REPORT.md](implemented/20260301_PHASE_M_CALIBRATION_REPORT.md), [20260301_PHASE_M_REFACTOR_PASS_REPORT.md](implemented/20260301_PHASE_M_REFACTOR_PASS_REPORT.md) — morale drift, ZoC virtual defense, enclave deprivation, displacement routing. M1-M4 implemented; M5 deferred. n268 baseline 81.0%. Peace/war lifecycle migration complete. |
| **Phase C — GUI tooltips, shortcuts, modals (complete)** | [PHASE_C_EXECUTION_PLAN.md](implemented/PHASE_C_EXECUTION_PLAN.md), [20260228_PHASE_C_GUI_IMPLEMENTATION_REPORT.md](implemented/20260228_PHASE_C_GUI_IMPLEMENTATION_REPORT.md) — tooltips, MapModeToolbar, keyboard shortcuts, AttackConfirmation modal, OrderQueue. All 5 sub-phases complete with refactor pass. |
| **Local fronts + per-brigade defense calibration** | [20260301_LOCAL_FRONTS_AND_BRIGADE_CALIBRATION.md](implemented/20260301_LOCAL_FRONTS_AND_BRIGADE_CALIBRATION.md) — `local_front_defense.ts`, front density modifier (thin 0.6×, dense 1.25×), `defense_terrain_bonus` per brigade. n295 = 85.1%. |
| **Displacement three-bug fix** | [20260301_DISPLACEMENT_THREE_BUG_FIX.md](implemented/20260301_DISPLACEMENT_THREE_BUG_FIX.md) — OSID/SID key mismatch, dead minority flight, double-counting. Fixed `buildMunControlFromOsids()` and `buildMunDominantController()`. |
| **Displacement validation (340k gap analysis)** | [20260301_DISPLACEMENT_VALIDATION_REPORT.md](implemented/20260301_DISPLACEMENT_VALIDATION_REPORT.md) — post-fix validation at n299. 340k vs ~1M target, gap decomposed: single-timer depth, territorial coverage, disabled minority flight. |
| **Map load recent saves fix** | [20260301_MAP_LOAD_RECENT_SAVES_FIX.md](implemented/20260301_MAP_LOAD_RECENT_SAVES_FIX.md) — parseGameState robustness: unwrap `{state}`, clear error messages, backward compat. |
| **Map formation icon freeze fix** | [20260301_REACT_MAP_FORMATION_ICON_FREEZE_FIX.md](implemented/20260301_REACT_MAP_FORMATION_ICON_FREEZE_FIX.md) — deferred icon registration and setData to idle callback. |
| **3D map GUI integration (archived — legacy)** | [3D_MAP_GUI_INTEGRATION_REPORT.md](implemented/3D_MAP_GUI_INTEGRATION_REPORT.md) — tactical_map.html era; superseded by React+MapLibre. |
| **HoI GUI overhaul session (archived — legacy)** | [20260226_HOI_GUI_OVERHAUL_SESSION_REPORT.md](implemented/20260226_HOI_GUI_OVERHAUL_SESSION_REPORT.md) — legacy HoI 3D GUI work; superseded by React+MapLibre. |
| **Corps sector ID format fix (n304)** | Ledger entry 2026-03-01 — `assignedFrontIds` format mismatch fixed in `bot_corps_ai.ts`. n304 = 86.7% (653/753). |
| **Supply reserves Phase A** | [20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md](implemented/20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md) — Faction-level two-category reserves (general_supply + heavy_munitions [0..100]), maintenance drain (0.15/formation/turn), combat expenditure (per-battle deduction), effective supply state (reachability × reserves interaction table). Pipeline step compute-supply-reserves; getSupplyMult integration. Gated by `supply_reserves_enabled` scenario flag (default false). 14 calibration constants. n338 86.9%. Canon: Systems Manual §14.2, Engine Invariants §4, War Spec §7. |
| **Ceiling removal — emergent growth (n369–n374)** | [20260303_CEILING_REMOVAL_EMERGENT_GROWTH.md](implemented/20260303_CEILING_REMOVAL_EMERGENT_GROWTH.md) — Removed `FACTION_HISTORICAL_PEAK` hardcoded caps (values were factually wrong). Replaced with tuned mobilization scales (RBiH 0.14, RS 0.22, HRHB 0.18) + exhaustion thresholds (0.15/0.25). Personnel emerges from demographics, mobilization, attrition. HRHB pool 2.10→1.70 (later 1.55 in n382). n374 = 87.6%. |
| **Comprehensive combat formula (n375–n392)** | [20260303_COMPREHENSIVE_COMBAT_FORMULA_IMPLEMENTATION.md](implemented/20260303_COMPREHENSIVE_COMBAT_FORMULA_IMPLEMENTATION.md) — Four mechanics: officer quality (VRS 1.10→decay, ARBiH 0.85→growth), ethnic homeland defense (+12%), bombardment casualty multiplier (1.0–1.8×), bombardment exposure attrition (ratio-based ln model, RATE=0.012, SCALE=2.0). n392 = 88.6% (667/753) ATH. Canon: Systems Manual §5, §7; context.md. |
| **Area-weighted territory & degenerate OSID merge** | [20260303_AREA_WEIGHTED_TERRITORY_AND_DEGENERATE_MERGE.md](implemented/20260303_AREA_WEIGHTED_TERRITORY_AND_DEGENERATE_MERGE.md) — Area-weighted territory percentages via `osid_areas.json` (51,337 km²) replacing count-based; RS 55.2%→65.1% area matches historical ~65%. 9 degenerate OSIDs (< 0.01 km²) merged, 753→744. New: `generate_osid_areas.cjs`, `loadOsidAreas()`, `useOsidAreas()` hook. Comparison tool area columns. Audit: `DEGENERATE_OSID_AUDIT.md`. |
| **Officers System — two-tier (Phases A–D, n403)** | [20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md](implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md) — Two-tier officer system: Tier 2 per-brigade `officer_quality` [0.05, 0.90] with growth/loss mechanics, faction learning rates (RBiH 1.5×, RS 0.7×, HRHB 1.0×), VRS brain drain. Tier 1: 63 named historical officers with competence/aggressiveness/defensiveness ratings, corps combat modifiers (0.94–1.10 range), succession from officer pool, HVO political sorting. Bot AI: corps aggressiveness shift, ARBiH warlord friction (pre-w78), VRS Mladić override. War timeline `officer_config` per faction. Three-tier combat math fallback. 6 new files, ~15 modified, 63 new tests. Critical fix: normalizeScenario whitelist (war_timeline was never loading). n403 = 88.0% (655/744). Canon: Systems Manual §4, §7.4, §7.5; context.md. |
| **Sectors overhaul — contiguity + min coverage + bot directives** | [20260305_SECTORS_OVERHAUL_GUI_SRC_FIX.md](implemented/20260305_SECTORS_OVERHAUL_GUI_SRC_FIX.md) — buildEdgeAdjacency faction-aware (friendly-side OSID only → contiguous sectors); ensureMinimumSectorCoverage Step 7; CorpsDirective reinforce_sector_ids/priority_sector_id; bot Rule 5c (reinforce) + Rule 7 priority prefix; SRC officer vrs_srk→vrs_sarajevo_romanija fix; GUI first-engagement data. REPO_MAP, PIPELINE_ENTRYPOINTS updated. |
| **Sector visualization fix — hover/click/consolidation** | [20260306_SECTOR_VISUALIZATION_HOVER_CLICK_FIX.md](implemented/20260306_SECTOR_VISUALIZATION_HOVER_CLICK_FIX.md) — Per-segment hover features with per-segment offset (centroid cross product). Hover highlight: filter-based by sector_id (replaces feature-state). Hostile-side OSID adjacency in consolidateCrossCorpsFronts (fixes cross-corps splits). Authoritative contact-graph pair filtering (removes phantom edges). Centroid-to-centroid fallback removed (93 invisible edges intentionally not rendered). |
| **Sector-facing intelligence — replace recon_intelligence** | [20260305_SECTOR_INTEL_IMPLEMENTATION.md](implemented/20260305_SECTOR_INTEL_IMPLEMENTATION.md) — Sector-pair confidence model (SectorIntelRecord, strength_category, posture_observed); faction recon profiles; derive-sector-intel pipeline step; recon-by-force; bot target weighting by intel. recon_intelligence.ts deleted. 17 tests, 95.6% calibration unchanged. context.md, REPO_MAP updated. |
| **Combat-causality hardening and operation cadence** | [20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md](implemented/20260306_COMBAT_CAUSALITY_HARDENING_AND_OPERATION_CADENCE.md) — Added movement-aware combat-causality diagnostics so execution maneuver turns no longer trip invalid-operation flags; allowed `sector_attack` planning to end early once all active participants reach `staging_osid`. `n112` removed invalid-operation windows; `n113` improved to `60` attack orders / `51` battles with `invalid_operation_count = 0`, leaving only isolated battleless weeks. |
| **Combat-causality recovery and controlled calibration resumption** | [20260306_COMBAT_CAUSALITY_RECOVERY_AND_CONTROLLED_CALIBRATION_RESUMPTION.md](implemented/20260306_COMBAT_CAUSALITY_RECOVERY_AND_CONTROLLED_CALIBRATION_RESUMPTION.md) — Consolidated the entire recovery lane: causality gate, proof scenario, invariant hardening, reporting split, live sector rearrangement acceptance, planning-phase brigade maneuver, quiet-week gate refinement, and `n158` as the restored calibration-safe runtime baseline. Includes lessons learned, must-have assumptions, and do/don’t rules. |
| **Live sector rearrangement and operation planning recovery** | [20260306_LIVE_SECTOR_REARRANGEMENT_AND_OPERATION_PLANNING_RECOVERY.md](implemented/20260306_LIVE_SECTOR_REARRANGEMENT_AND_OPERATION_PLANNING_RECOVERY.md) — Restored live sector rearrangement with offensive concentration, moved planning-phase brigades into approach positions, and refined combat-causality so quiet weeks do not invalidate otherwise healthy runs. `n158` reached `124` attack orders / `103` battles / `0` invalid ops. |
| **Recovery-plan reporting/UI/benchmark hardening** | [20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md](implemented/20260306_RECOVERY_PLAN_REPORTING_UI_AND_BENCHMARK_HARDENING.md) — Added split scenario reporting (`behavioral_health`, `historical_fit`, `control_change_attribution`), benchmark contract validation, live `fogOfWar` adapter derived from `sector_intel`, operation-owned brigade UI exception, and ratio-preserving `run_summary.json` serialization. `n130` confirmed the same deterministic final state with corrected historical-fit fractions. |
| **Runtime recovery after sector rearrangement regression** | [20260306_RUNTIME_RECOVERY_SECTOR_REARRANGEMENT_ROLLBACK.md](implemented/20260306_RUNTIME_RECOVERY_SECTOR_REARRANGEMENT_ROLLBACK.md) — `n135` exposed a live 40-week regression after sector rearrangement was wired into corps-AI runtime. Architect ruled the helper out of the live path pending scenario-level acceptance; `n136`/`n137` restored a deterministic combat-valid baseline. |
| **P3 priority municipality bypass for undefended targets (n192)** | bot_corps_ai.ts: undefended_front and weak_enemy_osids (reason 'undefended') bypass P3 priority municipality filter; weak-but-defended still filtered; adjacency check. RS=331 (44.5%), Krajina 85.5%, 151 attacks, 124 battles. Combat-causality GREEN. |
| **GUI polish orchestrated execution** | [20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md](implemented/20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md) — Pressure map mode (buildPressureGeoJSON, osid-pressure-fill); Ops Planning modal full engine integration (stageCorpsOperationOrder); arrow/staged-head animation; battle pulse; BottomStatusStrip territory/ops/casualties; Minimap polish; panel motion/shimmer CSS. |
| **GUI Panel Rework and General Polish** | [20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md](implemented/20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md) — refactored CorpsFrontPanel to stacked accordions; extracted shared AccordionHeader; numeric shortcuts 1-5; loading shimmer skeletons; interactive TopToolbar glow; standardized sidebar (p-3) and SelectionPanel (bottom 2rem) alignment. |
| **Strategic Reserve + Faction-Differentiated Mobilization Surge (n191)** | Ledger entry 2026-03-06 — Strategic reserve system solves municipality-locked pool topology mismatch via faction-level manpower redistribution (OVERFLOW_THRESHOLD=5000, faction draw rates RS/HRHB=0.25, RBiH=0.02). Faction-differentiated mobilization surge curves (VRS sustained, ARBiH fast burnout, HVO moderate). Mobilization scales retuned (RBiH 0.10, RS 0.12, HRHB 0.29). Multi-checkpoint calibration: n191 RS=102.6k/110.1k, RBiH=121.0k/175.4k, HRHB=41.5k/49.8k (w40/w80). New file: `src/sim/combat/strategic_reserve.ts`. Pipeline: two new steps after brigade-reinforcement. GameState: `strategic_reserves` field. |
| **N159 Deep Engine Audit Calibration (Phases A-E)** | [20260306_N159_DEEP_ENGINE_AUDIT_CALIBRATION.md](implemented/20260306_N159_DEEP_ENGINE_AUDIT_CALIBRATION.md) — 14-issue deep engine audit: organic VRS tempo decay (fatigue as combat power modifier, sqrt entrenchment, RS stays offensive permanently), casualty rebalancing (att 0.04/def 0.028, ratio 3.26:1), supply drain (MAINTENANCE_DRAIN 0.045, UN airdrops capped 3/turn), historical patron commitment (RBiH 0.3 in 1992 under embargo). FATIGUE_MAX=30 consolidated. n166 = 84.2% area-weighted, combat-causality gate GREEN. |
| **Refactor pass — GUI polish session** | [20260305_REFACTOR_PASS_GUI_POLISH.md](implemented/20260305_REFACTOR_PASS_GUI_POLISH.md) — Deduplicated OpsPlanningModal OSID-filter helpers (`buildOsidFilteredFeatures`), simplified useKeyboardShortcuts digit parsing (1–5), extracted shared `src/ui/map/map/rewritePmtilesUrls.ts`; MapContainer + OpsPlanningModal use it. |
| **Paramilitary Rear Pocket Cleanup (2026-03-08 update)** | [20260307_PARAMILITARY_SWEEP_FEATURE.md](implemented/20260307_PARAMILITARY_SWEEP_FEATURE.md) — New `'paramilitary'` FormationKind for autonomous rear pocket cleanup. Cluster BFS pocket detection (1-3 connected same-controller enemy OSIDs, ALL external neighbors faction-controlled, `op:` prefix filtering). Instant capture (MARCH_TURNS=0). Faction-differentiated spawn rates (RS=0.85, HRHB=0.55, RBiH=0.30). Military + civilian casualty recording (civilian_casualties `??=` init fix). Bot corps AI defers to paramilitary targets. Player policy (ask/always_allow/always_deny). Active weeks 0-20 (PARAMILITARY_FADE_WEEK). Pipeline: paramilitary-detect + paramilitary-advance after partition-corps-front-sectors. |
| **Entrenchment-based passive attrition reduction** | Ledger entry 2026-03-08 — Entrenched brigades take less passive frontline attrition (both base and bombardment exposure). `mult = max(0.40, 1.0 - sqrt(turns) * 0.10)`. At 6 turns: 24.5% reduction. At 52 turns: 60% (floor). Module: `frontline_attrition.ts`. Constants: `ENTRENCHMENT_ATTRITION_REDUCTION_PER_SQRT_TURN=0.10`, `ENTRENCHMENT_ATTRITION_FLOOR=0.40`. Canon: Systems Manual §7.4, CALIBRATION_MASTER. |
| **Frontline attrition sector port (n366)** | [20260308_FRONTLINE_ATTRITION_SECTOR_PORT.md](implemented/20260308_FRONTLINE_ATTRITION_SECTOR_PORT.md) — Ported frontline attrition from legacy `brigade_front_assignment` + `local_fronts` to `corps_front_sectors` `assigned_brigade_ids` lookup. Brigades in sector territory take attrition; reserves exempt. Density: `sector.assigned_brigade_ids.length / sector.length_edges`. `isColdFront()` rewritten for structured CorpsFrontSector data. n366 = 88.2% area-weighted. Canon: Systems Manual §7.4, context.md, CALIBRATION_MASTER. |
| **Turn AAR System** | [20260308_TURN_AAR_SYSTEM.md](implemented/20260308_TURN_AAR_SYSTEM.md) — Full after-action report system: `TurnSummary` schema (`src/state/turn_summary.ts`), `captureAARSnapshot` + `compileTurnSummary` (`compile_turn_summary.ts`), two new war-phase pipeline steps (`capture-aar-snapshot` at position 2, `compile-turn-summary` second-to-last), `turn_summaries[]` field on GameState (last 3 turns, persists through save/load). GUI: `AARPanel.tsx` (7-section collapsible overlay — Combat, Territory, Unit Events, Faction Pulse, Displacement, Notable Events), "AAR" button in TopToolbar. Approach: snapshot-diff for arcs/decorations/supply; turn-tagged filter for battles/territory/displacement/notable events. Zero changes to existing sim systems. Simplify pass fixed 5 issues. |
| **Sector Reclassification, Pre-Planned Ops Expansion, Warroom Regions, and Simplify** | [20260308_SECTOR_PREPLAN_WARROOM_SIMPLIFY.md](implemented/20260308_SECTOR_PREPLAN_WARROOM_SIMPLIFY.md) — Post-equalization `reclassifyRearBrigades` step (demotes deep-rear assigned to reserve, capped 1-2/sector). Removed hostile-side adjacency bridging from `splitNonContiguousSectors` (~90 lines). Pre-planned ops expanded: Operation Corridor (1KK), Operation Teočak (ARBiH w14), `faction` field, `available_from` gating, queued chaining. Warroom faction-specific region loading. GUI: CombatSummaryPanel redesign, removed ArmyDetail/CorpsDetail. Simplify: extracted `isEligibleOperationFormation` to shared `formation_constants.ts`, `buildAxesFromDef`/`buildCorpsOperation` helpers, fixed `available_from: 0` falsy bug. |
| **Ops Planning Modal Phase 1+2: Multi-Axis, Staging, Force Preview** | [20260308_OPS_PLANNING_MODAL_PHASE2_MULTI_AXIS_STAGING_FORCEPREVIEW.md](implemented/20260308_OPS_PLANNING_MODAL_PHASE2_MULTI_AXIS_STAGING_FORCEPREVIEW.md) — Full rewrite of OpsPlanningModal: multi-axis operations (AxisState model, per-axis brigades, ordered objective chains), per-axis staging areas (MapClickMode toggle, diamond markers on map), force-ratio preview (enemyStrengthByOsid aggregation, color-coded green/yellow/red), post-submit confirmation overlay. AXIS_COLORS 4-color palette, Bezier arrow rendering, numbered objective markers. IPC: CorpsOperationOrderPayload extended with `axes[]` + `staging_osid`. Simplify pass: removed 6× setTimeout double-refresh, hoisted friendlyPersonnel computation, simplified playerFaction to direct state access. Post-rewrite cosmetic fixes: stale closure (activeAxisIdRef), defensive ops removed, MapLibre attribution hidden, control opacity 0.55, faction name pre-generation via `simpleHash()`. GUI-only, no calibration impact. |
| **Rear Pocket Consolidation + Corps AI Pocket Targeting (2026-03-08 update)** | [20260307_REAR_POCKET_CONSOLIDATION_AND_CORPS_TARGETING.md](implemented/20260307_REAR_POCKET_CONSOLIDATION_AND_CORPS_TARGETING.md) — Rear pocket consolidation RE-ADDED as cluster-aware `rear_pocket_consolidation.ts` (BFS 1-3 connected enemy OSIDs, post-week-20 auto-flip, skips clusters with defending brigades). Weeks 0-20: paramilitary sweep. Week 20+: rear pocket consolidation. Corps AI rear pocket municipality+sector filter bypass retained; bot AI excludes active paramilitary targets; home-defense exception for truly undefended targets retained. |

---

| **Player agency implementation A-H** | [20260307_PLAYER_AGENCY_IMPLEMENTATION_A_TO_H.md](implemented/20260307_PLAYER_AGENCY_IMPLEMENTATION_A_TO_H.md) - completed Phases A/B/C/E/F/G/H from the player-agency plan: defensive surfacing, sector stance intent, operation shaping levers, airdrops/convoys/smuggling/tunnel, composite IVP, asymmetric municipality support, OPSEC, feint/probe, and H-phase harness closure. Verification path: focused Vitest for Phase E, `desktop:map:build`, 40w regressions `n226`, `n242`, `n245`, `n248`, `n249`, `n252`, plus informational 52w run `n254`. Final 40w status: `invalid_operation_count = 0`, `valid_for_combat_calibration = true`, benchmark suite `6/6`; remaining 40w drift is limited to `srebrenica` and `op:brcko:brka_2`. |
| **Operations system: commander + faction name pools** | [20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md](implemented/20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md) — Two enhancements: (1) Named officers from the reserve pool command operations; chain-of-command isolation during execution phase. Selection: regional match, then competence/aggressiveness. Wired into all creation/clearing points. (2) Faction-specific operation name pools (~40 each): VRS JNA bureaucratic style, ARBiH aspirational/Islamic, HVO Croatian weather/force. Sequential consumption via `state.used_operation_names` (no repeats). Pre-planned/triggered names excluded from pools. State: `CorpsOperation.commander_officer_id`, `NamedOfficerState.assigned_operation`, `GameState.used_operation_names`. Simplify pass: removed dead code (~65 lines), fixed mutation pattern, extracted helper. n265/n267 verified. ATH 84.4% unchanged. Canon: Systems Manual §7.5, §6.4. |
| **Settlement panel rich content and tabs** | [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md) — Right-panel settlement detail: 3 horizontal tabs (Overview | Military | Orders & events), same style as sector/operations. Overview: municipality, control, status, population (pre-war → current, Out/In/Lost, arrived by faction), “Fled from this settlement” by nation (Bosniaks/Serbs/Croats/Others), pre-war + **current ethnic structure** (getCurrentEthnicForOsid). Military: front sector, stationed formations (readiness/cohesion, click-through to Formation detail), militia pool. Orders & events: pending attack/move/reposition, recent control. Control tab removed; controller/status in Overview. Nation labels via ethnicityOrFactionToNationLabel. buildEthnicGeoJSON type guard fix for displacement entry. No engine/canon change. |

| **Audit remediation — full 5-phase execution (2026-03-08)** | [20260308_AUDIT_REMEDIATION_FULL_5_PHASES.md](implemented/20260308_AUDIT_REMEDIATION_FULL_5_PHASES.md) — Systematic 5-phase remediation from Pyrrhic State of the Game + N412 Deep Dive audits. Phase 1: determinism (24 sorted iterations, ~8000 unnecessary sorts removed). Phase 2: frozen front cascade (concentration bonus, entrenchment degradation, aggression floor; n414 87.4%). Phase 3: supply/morale balance (MAINTENANCE_DRAIN 0.045→0.035, critical morale penalty, cohesion decay; n415 89.4%, +2.5pp). Phase 4: code health (displacement dedup -412L, supply assertions, tmp cleanup). Phase 5: terminology sweep (400 refs across 154 files), mega-file splitting (bot_corps_ai 2,197→225L + 5 modules, bot_brigade_ai_osid 1,994→1,343L + 4 modules), outcomeRank unification (3 inline dicts → single OUTCOME_RANK constant). 11 commits, 389/389 tests. |
| **Distinction potential: OOB decoration overhaul + army HQ seeding (2026-03-08)** | [20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md](implemented/20260308_DISTINCTION_POTENTIAL_OOB_DECORATION_OVERHAUL.md) — Stripped `historical_decorations` + `honor` from 46 OOB brigades (war-earned titles must not be pre-awarded at April 1992). Replaced with `distinction_potential` field: reduces decoration-earning thresholds 30–35% in `decoration_evaluator.ts`. Seeded `initial_officer_quality` for distinguished brigades (ARBiH Slavna=0.10, Viteška=0.15; RS tier_1=0.60, tier_2=0.62). Army HQs seeded: VRS oq=0.75/coh=72, HVO oq=0.50/coh=65, ARBiH oq=0.12/coh=38/morale=45. Schema: `distinction_potential` on FormationState. Loaders + spawn paths extended. tsc clean, 378 tests pass. |
| **Evaluation Remediation Plan - Consolidated Closure (2026-03-09)** | [20260309_EVALUATION_REMEDIATION_CONSOLIDATED.md](implemented/20260309_EVALUATION_REMEDIATION_CONSOLIDATED.md) — Completion of 4-phase Pyrrhic Team remediation: QA Unification (coverage metrics, unified script), Warroom UI Completion (Command Briefing and Ops Situation modals), Engine & State Refactoring (nested `military`, `political`, `displacement` domains), and Bot AI Modularization (purely functional bot brigade AI). Verified via strict `sim:scenario:probe` ensuring zero behavioral changes. |
| **UI blank-space remediation plan (2026-03-26, planned)** | [20260326_UI_BLANK_SPACE_REMEDIATION_PLAN.md](implemented/20260326_UI_BLANK_SPACE_REMEDIATION_PLAN.md) — Ordered P0/P1/P2 execution plan focused on layout density only (no mechanics changes): Army HQ Summary/Briefing, War Summary, Operations list, Pause, Army Reserve, Chronicle, and Ops modal. Includes measurable acceptance criteria and screenshot walkthrough checklist. |
| **UI blank-space remediation P0/P1/P2-B + live verification (2026-03-26)** | [20260326_UI_BLANK_SPACE_P0_IMPLEMENTATION.md](implemented/20260326_UI_BLANK_SPACE_P0_IMPLEMENTATION.md), [20260326_UI_BLANK_SPACE_P1_IMPLEMENTATION.md](implemented/20260326_UI_BLANK_SPACE_P1_IMPLEMENTATION.md), [20260326_UI_BLANK_SPACE_P2B_IMPLEMENTATION.md](implemented/20260326_UI_BLANK_SPACE_P2B_IMPLEMENTATION.md), [20260326_UI_BLANK_SPACE_LIVE_VERIFICATION_LOG.md](implemented/20260326_UI_BLANK_SPACE_LIVE_VERIFICATION_LOG.md) — Multi-agent execution of high-impact layout-density fixes with screenshot-based verification; no gameplay/mechanics changes. |
| **UI blank-space remediation P2-C + console debug + verification addendum (2026-03-26)** | [20260326_UI_BLANK_SPACE_P2C_IMPLEMENTATION.md](implemented/20260326_UI_BLANK_SPACE_P2C_IMPLEMENTATION.md), [20260326_UI_CONSOLE_DEBUG_WAVE2.md](implemented/20260326_UI_CONSOLE_DEBUG_WAVE2.md), [20260326_UI_BLANK_SPACE_VISUAL_VERIFICATION_WAVE2.md](implemented/20260326_UI_BLANK_SPACE_VISUAL_VERIFICATION_WAVE2.md), [20260326_UI_BLANK_SPACE_VISUAL_VERIFICATION_WAVE2_ADDENDUM.md](implemented/20260326_UI_BLANK_SPACE_VISUAL_VERIFICATION_WAVE2_ADDENDUM.md) — Remaining overlay pass shipped (Army Reserve + Chronicle), bottom-strip runtime crash fixed, and post-fix visual verification updated (`BS-010` PASS, `BS-011` PARTIAL). |

*Last updated: 2026-03-08. For backlog (not yet implemented), see [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md). For patterns and corrections, see [CONSOLIDATED_LESSONS_LEARNED.md](CONSOLIDATED_LESSONS_LEARNED.md) and .claude/napkin.md.*
# 2026-04-02 - Player-safe ops labels and HQ roster polish

- OPORD / objective-list surfaces now resolve settlement names through player-safe labels instead of printing raw OSIDs.
- Army HQ ORBAT recent-engagement hover titles now use formatted settlement names.
- Fixed a lingering Army HQ war-summary fallback bug in the wounded table.
- Report: `docs/40_reports/implemented/20260402_PLAYER_SAFE_OPS_LABELS_AND_HQ_ROSTER_POLISH.md`

# 2026-04-02 - Warroom faction shell handoff

- Warroom `FactionOverviewPanel` no longer renders detailed formations, officer rosters, or commander reassignment.
- Warroom now summarizes command-shell posture and explicitly hands detailed command review back to Army HQ via the desk map.
- Report: `docs/40_reports/implemented/20260402_WARROOM_FACTION_SHELL_HANDOFF.md`

# 2026-05-16 - Tactical React shell audit and polish

- Fixed IPC-less browser/dev tactical-map inspection by loading the baked April 1992 startup snapshot, guarding Node `process` access, and enabling tutorial progression without desktop IPC.
- Rebuilt the top toolbar around the intentionally floating HQ crest, fixed the Summary modal blank state, defaulted the Corridor Heartbeat red/green path network off, and raised the layer popover above right-side panels.
- Report: `docs/40_reports/implemented/20260516_TACTICAL_UI_AUDIT_AND_POLISH.md`

# 2026-05-16 - Tactical shell frame cohesion

- Aligned the command sidebar, right rail, legacy side panels, and bottom strip under shared shell clearances.
- Fixed corps-card flip layout so hidden back faces no longer create large blank gaps, raised War Begins above side rails, replaced first-screen emoji glyphs with in-game icons, brought AdvanceTurnModal into the dark command-shell palette, and hid/docked the order queue so empty chrome no longer floats over the command rail.
- Report: `docs/40_reports/implemented/20260516_TACTICAL_SHELL_FRAME_COHESION.md`

# 2026-05-16 - First-run inbox and HQ flow polish

- Sequenced War Begins, tutorial, and first-turn orientation; routed Presidential Inbox situation cards into Army HQ BRIEFING; and moved the Chief of Staff report above Presidential Decision Room synthesis.
- Filtered faction-owned event, proposal, reserve, and officer inbox cards to the current player faction.
- Report: `docs/40_reports/implemented/20260516_FIRST_RUN_INBOX_HQ_FLOW_POLISH.md`

# 2026-05-26 - Sector edge metadata lookup reuse

- Reused pass-local front-edge metadata in corps sector construction while retaining lazy direct-call fallback behavior.
- Preserved final hash `f219401f4a17f311`; comparable 40w profile wall time improved from 103.310s to 91.556s.
- Report: `docs/40_reports/implemented/20260526_SECTOR_EDGE_METADATA_LOOKUP_REUSE.md`

# 2026-05-26 - Sector coverage sorted corps group reuse

- Reused one invocation-local strict-sorted `sectorsByCorps.entries()` view inside `ensureMinimumSectorCoverage(...)` instead of resorting the same corps groups across coverage passes.
- Preserved final hash `f219401f4a17f311` and baseline regression; local phase buckets improved while full profile wall time remained noisy, so no scenario speedup is claimed.
- Report: `docs/40_reports/implemented/20260526_SECTOR_COVERAGE_CORPS_GROUP_REUSE.md`

# 2026-05-26 - Army command schema contract

- Promoted `military.army_co_decision_traces` and `military.army_corps_directives_by_faction` from optional `MilitaryState` fields to required persisted v10 contracts.
- Added v10 required-field validation, current-version rejection tests, legacy v1/v9 migration proof, and current-version fixture alignment.
- Strict-null counted escape categories remain zero; optional `GameState` field inventory is now 488 (`sim` 305, `state` 175, `derived` 8).
- Report: `docs/40_reports/implemented/20260526_ARMY_COMMAND_SCHEMA_CONTRACT.md`

# 2026-05-26 - Baseline artifact-set ownership

- Added a static guard that keeps scenario baseline `manifest.artifacts[]`, runner default artifacts, scenario `expected_files`/hash keys, and generated-artifact ownership docs aligned.
- Updated the baseline manifest ownership row to explicitly name the `.json`, `.md`, and `.jsonl` hashed run outputs while stating that only `manifest.json` is committed under `data/derived/scenario/baselines/`.
- Report: `docs/40_reports/implemented/20260526_BASELINE_ARTIFACT_SET_OWNERSHIP.md`

# 2026-05-26 - Save migration drift artifact ownership

- Added a static guard for `tools/diagnostics/output/save_migration_drift.json` ownership across generated-artifact docs, diagnostic script write path, committed JSON `generated_by`, and deterministic script constraints.
- Preserved migration logic, validator logic, artifact bytes, scenario outputs, replay behavior, event prose, GUI, and calibration data.
- Report: `docs/40_reports/implemented/20260526_SAVE_MIGRATION_DRIFT_ARTIFACT_OWNERSHIP.md`

# 2026-05-26 - CI schema fixture alignment

- Added required empty `military.event_decision_log` and political war substrate records to stale current-schema test fixtures and the tracked latest-run final-save fixture.
- Preserved production code, migration logic, validator logic, event prose, GUI behavior, scenario source data, combat logic, and calibration tuning.
- Report: `docs/40_reports/implemented/20260526_CI_SCHEMA_FIXTURE_ALIGNMENT.md`

# 2026-05-26 - Event bookkeeping schema contract

- Promoted `military.fired_event_ids`, `military.event_readiness`, `military.event_fire_counts`, `military.event_last_fired_turn`, `military.event_flags`, and `military.enabled_event_ids` to required persisted v15 contracts.
- Added v15 migration/default, current-version rejection, strict-null inventory, and direct-fixture alignment proof without changing event eligibility or response behavior.
- Report: `docs/40_reports/implemented/20260526_EVENT_BOOKKEEPING_SCHEMA_CONTRACT.md`

# 2026-05-26 - Terrain PMTiles artifact ownership

- Added a static generated-artifact ownership guard for `hillshade.pmtiles`, `osm.pmtiles`, and `terrain.pmtiles`.
- Documented the committed PMTiles as terrain/tile pipeline-owned Git LFS binary artifacts with desktop PMTiles route/range consumer coverage.
- Report: `docs/40_reports/implemented/20260526_TERRAIN_TILES_ARTIFACT_OWNERSHIP.md`

# 2026-05-27 - Event loader row validation

- Added structural row validation to the event loader before parsed JSON is cast to `EventDefinition[]`.
- Invalid ids, triggers, turn bounds, `requires_events`, primary effects, effect arrays, and response options now fail closed while preserving the 247-row catalog baseline.
- Report: `docs/40_reports/implemented/20260527_EVENT_LOADER_ROW_VALIDATION.md`

# 2026-05-27 - Migration nested ownership v21 fixture alignment

- Added the required empty `paramilitary_decision_history` field to the nested migration ownership current-schema fixture.
- Closed the Baseline Regression fast-test failure without changing production migration or validation logic.
- Report: `docs/40_reports/implemented/20260527_MIGRATION_NESTED_OWNERSHIP_V21_FIXTURE.md`

# 2026-05-27 - Event state shape validation

- Added validation for pending event decisions, event decision logs, and active event modifier arrays when present in GameState.
- Preserved schema version, migration behavior, event firing, event prose, GUI behavior, and scenario output.
- Report: `docs/40_reports/implemented/20260527_EVENT_STATE_SHAPE_VALIDATION.md`

# 2026-05-27 - Event mutex filtering

- Added same-turn `mutex_group` filtering after canonical event candidate sorting and before the unchanged four-event cap.
- Added additive `mutex_suppressed_ids` diagnostics; persisted overflow queueing remains deferred.
- Report: `docs/40_reports/implemented/20260527_EVENT_MUTEX_FILTERING.md`

# 2026-05-27 - Event overflow queue implementation

- Added persisted save-schema v22 `military.event_overflow_queue` for events delayed only by the four-event cap.
- Queued ids are re-resolved, re-gated, canonically sorted with new candidates, mutex-filtered, capped, and replaced by the next post-cap overflow ids.
- Refreshed startup/baseline generated artifacts for schema-byte drift; event JSON, prose, GUI, bot historical-default policy, and calibration logic are unchanged.
- Report: `docs/40_reports/implemented/20260527_EVENT_OVERFLOW_QUEUE_IMPLEMENTATION.md`

# 2026-05-27 - Pending event notifications schema contract

- Added save schema v23 `military.pending_event_notifications` with an inert `[]` legacy migration default and current-version missing/malformed rejection coverage.
- Retained the TypeScript optional marker for runtime/legacy compatibility; event notification emission, event JSON/prose, event ordering, GUI behavior, bot choices, scenario data, and calibration logic are unchanged.
- Refreshed the save-migration drift report to v23 / 23 migrations / 56 strict required fields.
- Report: `docs/40_reports/implemented/20260527_PENDING_EVENT_NOTIFICATIONS_SCHEMA_CONTRACT.md`

# 2026-05-27 - Codex sensitive-claim inventory Phase 0

- Added a deterministic read-only diagnostic for Codex, chronicle, notification, event, and consequence prose surfaces.
- Current live baseline scans 176 files and reports 297 claims, including 245 stop-gated review items.
- No prose, citations, event behavior, UI rendering, scenario data, or sensitive-history mechanics changed.
- Report: `docs/40_reports/audits/20260527_CODEX_SENSITIVE_CLAIM_INVENTORY_PHASE0.md`

# 2026-05-27 - Codex safe factual corrections Phase 1

- Replaced cinematic/over-causal Deliberate Force and Mistral 2 wording in `war_1995.json` with bounded operational phrasing.
- Added a content regression test to keep the removed phrases from returning.
- No triggers, effects, bot policy, save schema, calibration data, or sensitive-history mechanics changed.
- Report: `docs/40_reports/implemented/20260527_CODEX_SAFE_FACTUAL_CORRECTIONS_PHASE1.md`

# 2026-05-27 - Codex sensitive-history source notes Phase 1

- Added provenance-only source notes to seven Srebrenica/Zepa event rows without changing narrative text or mechanics.
- Added a content regression test to keep the notes bounded away from casualty, causality, prohibited-choice, and alternate-outcome prevention framing.
- Current inventory remains 176 files / 296 claims / 245 stop-gated; cited source status improved to 196 and uncited dropped to 72.
- Report: `docs/40_reports/implemented/20260527_CODEX_SENSITIVE_HISTORY_SOURCE_NOTES_PHASE1.md`

# 2026-05-27 - Codex event source notes Phase 2

- Added provenance-only source notes to 15 additional cleared event rows without changing narrative text or mechanics.
- Extended the content regression test to cover barracks, Corridor, London Conference, Prozor/Jajce, central Bosnia, Ahmici, Markale, and anti-sniping rows.
- Current inventory remains 176 files / 296 claims / 245 stop-gated; cited source status improved to 224 and uncited dropped to 44.
- Report: `docs/40_reports/implemented/20260527_CODEX_EVENT_SOURCE_NOTES_PHASE2.md`

# 2026-05-27 - Event expansion roadmap contract

- Reframed event expansion as a gated full historical/counterfactual database program.
- Implemented branch-visibility metadata/diagnostics as the immediate safe slice, followed by a foundational decisions packet before broad authoring.
- Preserved the sensitive-history, source, and historical-default gates; no event JSON, runtime behavior, save schema, GUI, scenario output, or calibration behavior changed.
- Report: `docs/40_reports/implemented/20260527_EVENT_EXPANSION_ROADMAP_CONTRACT.md`

# 2026-05-27 - Event future consequence modal slice

- Added behavior-neutral `future_consequences` metadata to `rbih_state_identity`, `hrhb_political_goal`, `rs_assembly_rejects_voplan_1993`, and `belgrade_embargo_rs_1994`.
- Rendered future-consequence cards in the existing event decision modal using branch-visibility wording, not runtime open/close claims.
- Preserved evaluator behavior, response effects, bot choices, save schema, scenario setup, generated artifacts, and calibration behavior.
- Report: `docs/40_reports/implemented/20260527_EVENT_FUTURE_CONSEQUENCE_MODAL_SLICE.md`
# 2026-06-05 Audio Asset Resolution Path

Report: `docs/40_reports/implemented/20260605_AUDIO_ASSET_RESOLUTION_PATH.md`

The tactical-map audio bus now routes future playable binaries through a Rollup URL-import map instead of bare manifest path strings. No binary audio assets shipped; current cues remain deterministic silent placeholders until an asset is explicitly imported and marked `provided`.

---

# 2026-06-06 Sector Enemy Personnel Index Reuse

Report: `docs/40_reports/implemented/20260606_SECTOR_ENEMY_PERSONNEL_INDEX_REUSE.md`

`classifyBrigadesByTerritory(...)` now reuses the existing active enemy personnel by OSID view for per-sector garrison budgeting instead of rescanning all formations once per sector. The changed profile and 40-week timed run preserved `d1ace172a29b2353`; focused sector tests, typecheck, consistency validation, baseline regression, and diff check passed.

---

# 2026-06-06 Receipt Route Browser Proof

Report: `docs/40_reports/implemented/20260606_RECEIPT_ROUTE_BROWSER_PROOF.md`

Records-filed President's Desk consequence rows now route to Army HQ Records -> Decision Consequences; AAR tab counts now come from `latestTurnSummary` instead of completed-operation history; patron-defiance Chronicle duplicate generation is suppressed in the generator path. The new live browser smoke loads a deterministic modified startup save through the app save loader and proves the desk-to-Records route and AAR/Operation History count split.

---
