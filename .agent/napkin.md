# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|-----------------|-------------------|
| 2026-02-07 | self | Voronoi boolean ops still produced failures/leftover patches despite normalization | Add explicit post-merge coverage/overlap validation per mun1990; drive fixes from diagnostics |
| 2026-02-07 | self | Imported martinez-polygon-clipping as default (ESM error) | Use namespace import (`* as martinez`) |
| 2026-02-07 | self | Tried importing `jsts` package root (no index.js export) | Import from `jsts/org/locationtech/jts/io/*.js` (e.g. GeoJSONReader/Writer) |
| 2026-02-11 | self | Refactored shared type into new module but removed legacy export from `displacement_hooks` | Preserve exported type aliases (`export type { ... }`) when downstream imports from old locations |
| 2026-02-11 | self | Resolved add/add doc conflict by deleting markers only → duplicated content | For whole-file add/add conflicts, pick one side (HEAD/theirs) or fully dedupe before staging |

## User Preferences
- Prefer absolute paths for tool calls.
- If napkin isn’t loaded automatically, load it on request.
- Update napkin after significant changes or discoveries; do not wait until end of session.

## Patterns That Work
- P1 doc consolidations: REPO_MAP ↔ PIPELINE_ENTRYPOINTS cross-refs; DETERMINISM_* add-ons; pre-commit checklist in PIPELINE_ENTRYPOINTS.
- War Planning Map: #warroom-scene and #map-scene (only one visible); openWarPlanningMap → scene-open then map.show(); closeCallback → showWarroomScene().
- Voronoi: allocate cells by stable order, subtract prior masks to remove overlaps; area-based coverage diagnostics avoid boolean failure noise.
- Map/WGS84: fallback to `data/_deprecated/derived/legacy_substrate/settlements_substrate.geojson` when derived missing; viewer uses A1_BASE_MAP (role=settlement), `getPoliticalControlKey()` for S-prefixed sid; use `map:build:wgs84:from-geometry` when `settlements_wgs84_1990.geojson` exists.
- Split-muni merge: Voronoi loads from `data/derived/_audit/split_municipality_duplicate_settlements.json`; run `npm run map:audit:split-muni-duplicates` before full rebuild.
- PowerShell: use `;` not `&&` for command chaining.
- Project skills: `.cursor/skills/<name>/SKILL.md` with YAML frontmatter (name, description) and concise workflow steps.
- Smart-bot determinism: seeded RNG in BotManager; never `Math.random()` in bot logic; keep edge/formation traversal sorted before selection.
- Time-adaptive bots: optional `scenario_start_week`, deterministic week-based aggression taper; keep objective-edge planned-ops floor.
- Victory evaluation: end-of-run reporting (run_summary.json + end_report.md) without changing turn mechanics.
- Tactical map null-control: fix at init/source (MapApp → DataLoader → political_control_data → prepareNewGameState → initializePoliticalControllers); enforce no-null in prepareNewGameState with deterministic null coercion (mun majority → neighbor majority → RBiH fallback).
- Init-mode tests: call `prepareNewGameState` directly with `init_control_mode` instead of full `runScenario` for speed.
- Shared helper `getFactionAlignedPopulationShare` in `src/state/population_share.ts` for hostile-share and displacement consistency.

## Patterns That Don't Work
- Simplify + turf fallback alone did not reduce Voronoi polyclip failures.
- Gap-based salvage that collapses most municipalities to single polygons is too destructive.
- Chaikin smoothing on Voronoi edges caused white gaps between settlements (reverted).
- `npx tsx --test` on full scenario tests can hang on Windows; run faster unit subsets (typecheck, phase_i_displacement_hooks, settlement_control) first.

## Domain Notes
- **Canon & docs:** All canon in docs/10_canon/ is v0_5_0. Implementation-notes (coercion, capability-weighted flip, formation-aware flip, rbih_hrhb_war_earliest_week) are non-normative per context.md. Thematic knowledge: PROJECT_LEDGER_KNOWLEDGE.md; chronology: PROJECT_LEDGER.md. What’s left: IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS, PHASE7_BACKLOG_QUEUE, PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.
- **Repo/environment:** Workspace may be displaced (e.g. different drive); confirm napkin + ledger + canon present; scripts use path.resolve(import.meta.url) for ROOT. OneDrive file locks (census_rolled_up_wgs84.json, etc.): retry; pause sync if persistent. Novi Grad = Bosanski Novi (northwest BiH); Novi Grad Sarajevo = Sarajevo borough; use geometry when name-based mapping is ambiguous.
- **Map & tactical viewer:** Canonical map = what tactical map loads. Required: settlements_a1_viewer.geojson, political_control_data.json. See docs/20_engineering/TACTICAL_MAP_SYSTEM.md. Sep 1992 layer: municipalities_1990_initial_political_controllers_sep1992.json + map:viewer:political-control-data --control-key=sep1992; copy output to src/ui/warroom/public/data/derived/.
- **Phase I:** start_phase phase_i → turn 0 in Phase I (war_start_turn=0). Displacement on control flip when Hostile_Population_Share > 0.30 (phase-i-displacement-apply). Control: municipality-level decision, settlement-level application (wave + holdouts). runControlFlip needs TurnInput.settlementDataRaw (settlement_ethnicity_data) for holdouts; weekly displacement from displacement_state when phase is phase_i. init_control_mode: institutional | ethnic_1991 | hybrid_1992 per PARADOX_ETHNIC_INITIAL_CONTROL_CONVENE. No-flip / military-action-only is scenario-gated (disable_phase_i_control_flip, phase_i_military_action_* knobs). **Final no-flip policy (2026-02-11):** ethnic/hybrid NO-GO (default only); player_choice GO for recruitment-centric scenarios. See PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md.
- **Phase II / formations:** AoR at Phase II entry (phase-ii-aor-init); formation hq_sid from municipality_hq_settlement.json. OOB primary sources: data/source/oob_brigades.json, oob_corps.json. New GameState top-level keys must be added to GAMESTATE_TOP_LEVEL_KEYS in serializeGameState.ts or saves fail.
- **Scenarios:** Phase 0: start_phase "phase_0", phase_0_referendum_turn, phase_0_war_start_turn; do not populate AoR at init. Sept 1992 settlement-level control: init_control as path to file with `settlements` array. formation_spawn_directive: { kind: "both" } for brigade spawn from pools. Run: `npm run sim:scenario:run -- --scenario <path> --out runs`.
- **Bots & calibration:** Seeded RNG; scenario_start_week for time-adaptive aggression. Benchmark reporting in run_summary.json + end_report.md. Calibration knobs in bot_strategy.ts; no-flip-v2 helps player_choice balance but can worsen ethnic/hybrid at long horizon—keep scenario-gated. 3x3 no-flip military-action knob grid (attack 0.8/1.0/1.2 x buffer 0.1/0.2/0.3) showed strong attack-scale sensitivity for ethnic/hybrid and near-zero stability-buffer sensitivity in tested range; player_choice was fully invariant across all tested knob pairs. Follow-up attack-scale-only sweep (0.6..1.4 at buffer 0.2): some 12w ethnic profiles looked promising (a=1.4), but no tested ethnic/hybrid profile beat default at 30w.
- **No-flip policy finalization (2026-02-11):** Canonical scenarioization completed for recruitment-focused use via `data/scenarios/player_choice_recruitment_no_flip_4w.json`; author-facing checklist added in `docs/20_engineering/PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md`; calibration folders now explicitly labeled temporary (`data/scenarios/_tmp_grid_knobs/README.md`, `data/scenarios/_tmp_attack_scale_sweep/README.md`).
- **Displacement & recruitment:** Displaced pool by source mun 1991 ethnicity; killed + fled-abroad in displacement.ts. Recruitment: recruitment_state in GAMESTATE_TOP_LEVEL_KEYS; player_choice path seeds militia/pools before bot recruitment.
- **References:** Balkan Battlegrounds OOB (BB1 Appendix G); MIN_BRIGADE_SPAWN 800; historical troop tuning in PARADOX_HISTORICAL_TROOP_NUMBERS_SEPT1992_CONVENE; formation-expert and scenario-creator-runner-tester for militia/OOB and BiH scenario authoring.
