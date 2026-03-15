# Pipeline Entry Points (AWWV)

**High-level map:** See [REPO_MAP.md](REPO_MAP.md) for pipelines, GUI locations, and the full "Change X → Go Here" table.

**Quick change routing:** Scenario changes → `src/scenario/`, `data/scenarios/`. Early-war control flip (incl. B4 coercion) → `src/sim/early_war/control_flip.ts`. Authority derivation → `src/state/formation_lifecycle.ts`. Events (B1) → `src/sim/events/`. Map build → [MAP_BUILD_SYSTEM.md](MAP_BUILD_SYSTEM.md). Full routing: REPO_MAP.md §Change X → Go Here.

## Canonical Entry Points
### Scenario Harness (Deterministic, Multi-Turn)
- `src/scenario/scenario_runner.ts`
  - Outputs: `runs/<run_id>/` artifacts (see harness docs and tests).
  - Used by: `tools/scenario_runner/` scripts (baseline regression, sweeps).
  - Combat causality: emits `combat_causality` to `weekly_report.jsonl` and `run_summary.json` using `src/scenario/combat_causality.ts`. Execution-phase operation movement orders count as maneuver, not invalid stalled combat.
  - Reporting split (2026-03-06): `run_summary.json` now exposes `behavioral_health`, `historical_fit`, and `control_change_attribution` as stable top-level families. Weekly rows expose `behavioral_health` plus compatibility copies of `combat_causality` and `control_change_attribution`.
  - Recovery gate refinement (2026-03-06): quiet weeks with no attack orders and no invalid operations remain visible in `behavioral_health.battleless_weeks`, but weekly `zero_battles` invalidation is reserved for attack-orders-without-battles. Whole-run zero battles still hard-fails at scenario-runner level.
  - Benchmark contract (2026-03-06): bot benchmark rows are validated by `validateBotBenchmarkSummary()` in `src/scenario/scenario_end_report.ts`; fraction/share fields must remain fractional through summary serialization.
  - **War timeline loading:** When `scenario.war_timeline` is set (e.g. `"apr1992"`), loads `data/scenarios/timelines/{id}.json`, validates via `validateWarTimeline()`, stores on `state.war_timeline`. All consumer functions read from timeline first, fall back to hardcoded. Type definitions and resolvers in `src/state/war_timeline.ts`.

### Scenario CLI (Scripted)
- `src/cli/sim_scenario.ts`
  - Deterministic multi-turn run from a saved state + script.
  - Outputs: save and scenario summary.

### Single-Turn CLI (Local Run)
- `src/cli/sim_run.ts`
  - Runs one turn from an initialized state; emits save + derived artifacts.

### Baseline Regression (Determinism Gate)
- `tools/scenario_runner/run_baseline_regression.ts`
  - Canonical regression gate for scenario harness outputs.

### Map Build Pipeline
- Canonical commands are defined in `docs/20_engineering/MAP_BUILD_SYSTEM.md`.
- Scripts live in `scripts/map/` and must only be invoked via documented entry commands.

### Canonical data for map/warroom UI (initial political control)
- **Artifact:** `data/derived/political_control_data.json` is the **canonical source** for initial (Turn 0) political control used by warroom and all map viewers.
- **Produced by:** `npm run map:viewer:political-control-data` (script: `scripts/map/build_political_control_data.ts`).
- **Contract:** Warroom and map UIs must use this file for initial control display; no alternate source for that purpose. When the artifact includes `control_status` or contested flags, those drive contested overlays (e.g. crosshatch) in map UIs.
- **OSID-keyed init (dev runner, scenario with operational data):** When the settlement graph is OSID-keyed (744 entries), political control init uses `data/derived/operational/operational_initial_master.json`. **After any OSID merge** run `npm run map:derive:operational-initial-master` so this file matches `operational_settlements.geojson` (see MAP_BUILD_SYSTEM.md §Operational (OSID) layer).

### Tactical Map System (standalone map GUI)
- **Engineering reference:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- **Code:** `src/ui/map/` (Vite app; entry: `tactical_map.html` → `main.ts` → `MapApp.ts`)
- **Dev server:** `npm run dev:map` — Vite on port 3001; open `http://localhost:3001/tactical_map.html`
- **Canonical map data:** The set of files the Tactical Map loads defines the canonical map data. Full list: TACTICAL_MAP_SYSTEM.md §5 (required: `settlements_a1_viewer.geojson`, `political_control_data.json`; optional: A1_BASE_MAP, settlement_edges, settlement_names, mun1990_names, settlement_ethnicity_data; on-demand: political_control_data_sep1992.json). Served via custom Vite plugin from project root (`/data/derived/`). For repo cleanup 2026, other map assets may be moved to `data/_deprecated/` (move only, no delete); this list is never moved.

### Knowledge Base Ingest (Historical Canon)
- `tools/knowledge_ingest/balkan_battlegrounds_kb.ts`
  - Inputs: `docs/Balkan_BattlegroundsI.pdf`, `docs/Balkan_BattlegroundsII.pdf`
  - Outputs: `data/derived/knowledge_base/balkan_battlegrounds/`

### docs/50_research PDF text extraction
- `npm run docs:50-research:extract` — `tools/knowledge_ingest/extract_50_research_pdfs.ts`
  - Inputs: `docs/50_research/*.pdf`
  - Outputs: `docs/50_research/extracts/*.txt` (agent-readable). See `docs/50_research/README_KNOWLEDGE_BASE.md`.

### War-Phase Browser Advance (Warroom)
- `src/sim/run_combat_browser.ts` — `runWarTurn(state, input)` — browser-safe war-phase turn advance. No Node/fs. Used by warroom when advancing a turn in war phase. War phase uses location_osid only (no AoR). Does not run supply pressure or exhaustion; full war-phase use Node `runTurn`.

### War-phase location_osid (AoR removed)
- AoR init is removed. War-phase brigade location is **location_osid** only; set at formation creation and via `backfillFormationLocationOsid` at war entry. See docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md. Legacy `src/scenario/aor_init.ts` is deprecated and must not be used for war-phase state.

### Turn Contract (Main Game)
- Canonical turn contract for desktop and headless runs:
  - **Input:** `GameState` + settlement edges + optional directives/orders payload.
  - **Output:** updated `GameState` + deterministic turn report metadata.
- Main game execution is single-owner:
  - Main process / scenario harness runs turn advancement (`runTurn` or phase-specific runners).
  - Tactical map views (2D/3D) are display-only clients that stage orders through IPC.
  - Renderer-side map code must not advance canonical turns directly.

### Tactical Sandbox 7-step Subset (Non-Canon)
- `src/ui/map/sandbox/sandbox_engine.ts` intentionally runs a reduced browser-safe subset for sandbox experimentation:
  1. apply posture orders
  2. process brigade movement
  3. degrade equipment
  4. compute brigade pressure
  5. resolve attack orders
  6. apply WIA trickleback
  7. advance turn counter
- This subset is **not canon** and must not be used for canonical saves or shared campaign state.
- Sandbox-only exceptions (for example movement pre-claim and traversal through uncontrolled settlements) stay confined to sandbox mode.

## Turn pipeline and canon systems (Phase Specifications v0.5)

Canon global turn-order hooks (docs/10_canon/Phase_Specifications_v0_5_0.md) map to step names as follows. Steps are defined in `src/sim/turn_phases/war_phases.ts` (war phase + early-war) and `src/sim/turn_phases/peace_phases.ts` (peace phase), orchestrated by `src/sim/turn_pipeline.ts`. Gaps (e.g. explicit “System 10 capability step” ordering) should be closed per PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md.

| Canon hook | System | Pipeline step(s) |
|------------|--------|-------------------|
| 1 | Patron + IVP | `update-patron-ivp` |
| 2 | Arms embargo | `update-embargo-profiles` |
| 3 | Heavy equipment + maintenance | `update-heavy-equipment` |
| 4 | Legitimacy | `update-legitimacy` |
| 5 | Enclave integrity | `update-enclave-integrity` |
| 6 | Sarajevo exception | `update-sarajevo-exception` |
| 7 | Negotiation capital | `update-negotiation-pressure`, `update-negotiation-capital` |
| 8 | OSID location + home defense | `compute-home-defense-active` (sets home_defense_active, decrements counterattack_window_turns); `osid-column-movement`; `apply-brigade-movement` (brigade_movement_orders.ts); front snapshot from `derive-osid-front-segments` (war phase only). No AoR. ZoC removed n344 — zoc-computation + zoc-constrained-movement steps deleted; replaced by apply-brigade-movement. **Priority:** sector march orders (from bot_brigade_ai_osid) take priority over home_defense_active when present. |
| 9 | Tactical doctrines | `update-doctrine-eligibility` |
| 10 | Capability progression | `update-capability-profiles` (war phase); early-war: `capability-update` (before control flip) |
| 11 | Contested control | Initialization (control_status from stability); early-war flip in `control-flip` |
| B1 | Events (narrative) | `evaluate-events` (first step in both early-war and war phase) |
| B4 | Coercion pressure | `control-flip` uses `coercion_pressure_by_municipality` to reduce flip threshold |

Early-war steps: `evaluate-events` (first), `militia-emergence`, `pool-population`, `minority-militia-decay`, `brigade-reinforcement`, `formation-spawn`, `alliance-update`, `ceasefire-check`, `washington-check`, `capability-update`, `control-flip` (B4 coercion; capability-weighted attacker/defender), `displacement-hooks`, `control-strain`, `authority-update`, `jna-transition`, etc. Full order and conditions are in `src/sim/turn_phases/war_phases.ts`.

**Bottom-up in war phase:** When `state.meta.recruitment_mode === 'bottom_up'`, `runTurn` injects the following early-war steps after the main `phases` loop: militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations. This is required so that war-start scenarios still run bottom-up formation growth. See Engine Invariants §14.10 and docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.

**Events (B1):** `src/sim/events/` — `event_types.ts`, `event_registry.ts`, `evaluate_events.ts`. `evaluate-events` runs first in both early-war (`earlyWarPhases`) and war phase (`phases`). Deterministic: same seed + turn → same events_fired.

**Authority derivation:** `update-formation-lifecycle` derives municipality authority via `deriveMunicipalityAuthorityMap` (formation_lifecycle.ts) from political control (consolidated/contested/fragmented); used for brigade activation gating.

**War-phase OSID:** No AoR, no ZoC (removed n344; zoc-computation + zoc-constrained-movement steps deleted; GameState fields war_enemy_zoc_by_faction + war_linked_zoc_by_faction removed; replaced by apply-brigade-movement via brigade_movement_orders.ts). Pipeline steps: `supply-osid` (OSID supply reachability and supply_state_by_osid for supply_mult in combat), `update-siege-counters` (siege counter tracking from OSID supply state, gated by supply_reserves_enabled), `derive-osid-front-segments` (sets war_front_edges_osid; assignable_front_segments derived from it), `partition-corps-front-sectors` (builds corps front sectors via BFS; `splitNonContiguousSectors` post-build BFS through friendly OSIDs splits disconnected components; classification substeps: (a) `assignTerritoryVoronoi` — multi-source BFS from front-edge friendly OSIDs backward through friendly territory, creating contiguous `territory_osids` per sector; (b) `classifyBrigadesByTerritory` — three-tier classification: front (in sector territory), reserve (outside all sectors → nearest sector), deep-rear (unreachable); (c) `ensureMinimumSectorCoverage` — reserve promotion only (no paper-transfers), guarantees every non-cutoff sector has >=1 assigned brigade with connectivity-checked reserve promotion via friendly-territory BFS; `buildEdgeAdjacency` uses faction-aware grouping so sub-segments are geographically contiguous — see `src/sim/combat/corps_front_sectors.ts`), `derive-sector-intel` (sector-facing intelligence: per-sector-pair confidence model; passive buildup each contact turn, decay when no contact; recon-by-force sets confidence=1.0 after each engagement; faction recon profiles in `src/sim/combat/sector_intel_constants.ts`; writes `state.sector_intel: Record<friendly_sector_id, SectorIntelRecord[]>`; replaced legacy recon-intelligence; see `src/sim/combat/sector_intel.ts`), `generate-bot-corps-orders` (consumes canonical `state.corps_front_sectors`, runs `rearrangeSectorsForCorps()` plus live offensive concentration from `sector_rearrangement.ts`, writes rearranged sectors back to state, and populates `CorpsDirective.reinforce_sector_ids` for sectors below 50% target density and `CorpsDirective.priority_sector_id` for the sector facing the most offensive targets — see `src/sim/combat/bot_corps_ai.ts`), `advance-sector-offensives` (operations pass through a preparation phase before execution; preparation is a multi-turn state machine: `intel_gathering` → `force_staging` → `supply_check` → `assessment` → `ready`; commander personality — competence × aggressiveness — drives preparation tempo and launch thresholds; probes may be ordered during preparation for intel gain; `tickPreparation()` advances sub-phases each turn; execution begins only when `preparation_sub_phase === 'ready'`; anti-paralysis safety valve forces launch after `preparation_max_turns`; see `operation_preparation.ts` and Systems Manual §7.6), `generate-bot-brigade-orders` (Rule 5c: overstocked front brigades march to `reinforce_sector_ids` targets; Rule 7 priority prefix: interior brigades march to `priority_sector_id` first; planning-phase operation brigades may move into first-objective approach positions — see `src/sim/combat/bot_brigade_ai_osid.ts`), `check-truce-break` (detects player brigade_attack_orders against Vienna Declaration truce-partner OSIDs; sets state.truce_broken_turn and emits warning event; `src/sim/local_truces.ts`), `resolve-attack-orders` (OSID attack resolution; uses supply_state_by_osid when present; **trims `state.control_events` to last 3 turns before call, sorts by `(turn, settlement_id)` after; each flip pushes a `ControlEvent` with `mechanism:'combat'` into `state.control_events`**), `update-sector-offensive-results`, `displace-enemy-territory` (displace formations in enemy OSID when operational data + edges present), After brigade reinforcement: `strategic-reserve-collection` (excess pool.available above OVERFLOW_THRESHOLD=5000 flows to faction strategic reserve), `strategic-reserve-reinforcement` (under-strength brigades draw from faction reserve at reduced rate — logistics friction; faction-specific draw rates: RS=0.25, HRHB=0.25, RBiH=0.02). See `src/sim/combat/strategic_reserve.ts`.

After combat resolution: `generate-army-reserve-requests` (scans all non-exempt corps; generates loan requests for offensive_support/defensive_gap/exploitation; bot AI auto-assigns bot-faction requests via `evaluateArmyReserveAssignments`; player-faction requests persist in `state.military.pending_reserve_requests` for UI; `army_reserve_system.ts`), `tick-elite-loans` (replaces old `elite-loan-lifecycle`; force-recalls on ≥30% casualties/morale<35/cohesion<25/permanent-degradation; auto-joins target corps's active operation each turn; voluntary recall after op ends + threat subsides + ELITE_LOAN_MIN_DURATION met; updates EliteBrigadeTracker episodes; battle counters synced in real-time by `recordBrigadeEngagement`; `army_reserve_system.ts`), `generate-war-stories` (per-turn narrative generation from brigade_history → FormationState.war_story; `war_stories.ts`), `compute-combat-summaries` (aggregates subordinate brigade_history tallies onto FormationState.combat_summary for corps/army_hq; `combat_summary_aggregator.ts`), `wia-trickleback`. After `alliance-update`, RBiH–HRHB milestone checks run: `ceasefire-check`, `washington-check` (same precondition logic as early-war). Brigade location is location_osid only; war entry uses backfillFormationLocationOsid. Combat code in `src/sim/combat/`; early-war code in `src/sim/early_war/`. See War_Specification_v0_6_0.md §5 and AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md. Game version: see `docs/20_engineering/VERSIONING.md`.

## Non-Canonical / Legacy Harnesses
These exist for smoke and internal checks, not for authoritative runs:
- `src/index.ts` (smoke entrypoint)
- `src/turn/pipeline.ts` (minimal turn harness used by `src/index.ts`)

## UI / Asset Tooling (Non-Sim, Opt-In)
These are **not** simulation entrypoints. They are opt-in tooling and must remain isolated from deterministic sim outputs.

- Asset worker tooling (ADR-0003):
  - `tools/asset_worker/ensure_assets.ts` (`npm run assets:ensure`)
  - `tools/asset_worker/post/postprocess_assets.ts` (`npm run assets:post`)
  - `tools/asset_worker/validate/validate_assets.ts` (`npm run assets:validate`)
  - `tools/asset_worker/mcp/server.ts` (`npm run assets:mcp`)
- Warroom build staging (ADR-0003):
  - `tools/ui/warroom_stage_assets.ts` (`npm run warroom:build`)
- Tactical Map dev server (non-sim, opt-in):
  - `src/ui/map/vite.config.ts` (`npm run dev:map`, port 3001)

## Run Contracts (Must Hold)
- Determinism contract in `docs/20_engineering/CODE_CANON.md` applies to all entrypoints.
- Any new entrypoint requires an ADR + ledger entry.

## Pre-commit doc checklist (when changing code/data)
When adding or changing the following, update docs as below so REPO_MAP and PIPELINE_ENTRYPOINTS stay authoritative:
- **New entrypoint (script, CLI, or pipeline entry):** Add to [REPO_MAP.md](REPO_MAP.md) under the relevant pipeline and to this doc under Canonical Entry Points (or Non-Canonical) and, if turn-related, to the canon table.
- **New GameState field or serialized state:** Add to `src/state/serializeGameState.ts` allowlist (`GAMESTATE_TOP_LEVEL_KEYS`) and key order; if it crosses canon boundary (e.g. B4 coercion), add an implementation-note in the relevant canon spec. Example: `control_events` added to GAMESTATE_TOP_LEVEL_KEYS in 2026-03-04 (commit 6400a9b). `sector_intel` added 2026-03-05 (replaces `recon_intelligence`). `pending_officer_events` added 2026-03-15 to `MilitaryState` (officer succession events for player faction; `PendingOfficerEvent` type in `officer_types.ts`).
- **Scenario summary schema changes:** If `run_summary.json` or `weekly_report.jsonl` contracts change, update this file, `REPO_MAP.md`, `CALIBRATION_MASTER.md`, and any map/UI docs that consume the changed fields. Preserve fractional reporting fields (`share`, `ratio`, `rate`, `tolerance`, `deviation`) during normalization.
- **New pipeline step or reorder:** Update the canon-hook table and step list in this doc; update REPO_MAP §Key Pipelines / Change X → Go Here if the “go here” file changes.

## Night Shift Launch

For autonomous overnight execution of implementation plans, use the night shift system. Prepare a `nightshift-handoff.md` in the project root (template: `docs/20_engineering/NIGHTSHIFT_HANDOFF_TEMPLATE.md`), then launch:

```bash
claude --dangerously-skip-permissions -p “Read nightshift-handoff.md and execute the night shift. Follow .claude/skills/nightshift/SKILL.md protocol exactly. Do not stop until all plans are complete or blocked.”
```
