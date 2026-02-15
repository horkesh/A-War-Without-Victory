# Pipeline Entry Points (AWWV)

**High-level map:** See [REPO_MAP.md](REPO_MAP.md) for pipelines, GUI locations, and the full "Change X → Go Here" table.

**Quick change routing:** Scenario changes → `src/scenario/`, `data/scenarios/`. Phase I control flip (incl. B4 coercion) → `src/sim/phase_i/control_flip.ts`. Authority derivation → `src/state/formation_lifecycle.ts`. Events (B1) → `src/sim/events/`. Map build → [MAP_BUILD_SYSTEM.md](MAP_BUILD_SYSTEM.md). Full routing: REPO_MAP.md §Change X → Go Here.

## Canonical Entry Points
### Scenario Harness (Deterministic, Multi-Turn)
- `src/scenario/scenario_runner.ts`
  - Outputs: `runs/<run_id>/` artifacts (see harness docs and tests).
  - Used by: `tools/scenario_runner/` scripts (baseline regression, sweeps).

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

### Phase II Browser Advance (Warroom)
- `src/sim/run_phase_ii_browser.ts` — `runPhaseIITurn(state, input)` — browser-safe Phase II turn advance. No Node/fs. Used by warroom when advancing a turn in phase_ii. Populates AoR from control + formation home muns when faction AoRs empty (via `src/scenario/aor_init.ts`). Does not run supply pressure or exhaustion; full Phase II use Node `runTurn`.

### AoR Init (Shared)
- `src/scenario/aor_init.ts` — `populateFactionAoRFromControl`, `ensureFormationHomeMunsInFactionAoR`. Browser-safe. Consumers: scenario_runner (re-exports), run_phase_ii_browser, turn_pipeline `phase-ii-aor-init`.

## Turn pipeline and canon systems (Phase Specifications v0.5)

Canon global turn-order hooks (docs/10_canon/Phase_Specifications_v0_5_0.md) map to `src/sim/turn_pipeline.ts` step names as follows. Gaps (e.g. explicit “System 10 capability step” ordering) should be closed per PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md.

| Canon hook | System | Pipeline step(s) |
|------------|--------|-------------------|
| 1 | Patron + IVP | `update-patron-ivp` |
| 2 | Arms embargo | `update-embargo-profiles` |
| 3 | Heavy equipment + maintenance | `update-heavy-equipment` |
| 4 | Legitimacy | `update-legitimacy` |
| 5 | Enclave integrity | `update-enclave-integrity` |
| 6 | Sarajevo exception | `update-sarajevo-exception` |
| 7 | Negotiation capital | `update-negotiation-pressure`, `update-negotiation-capital` |
| 8 | AoR | `phase-ii-aor-init`, `phase-e-aor-derivation` (Phase II only) |
| 9 | Tactical doctrines | `update-doctrine-eligibility` |
| 10 | Capability progression | `update-capability-profiles` (Phase II); Phase I: `phase-i-capability-update` (before control flip) |
| 11 | Contested control | Initialization (control_status from stability); Phase I flip in `phase-i-control-flip` |
| B1 | Events (narrative) | `evaluate-events` (first step in Phase I and Phase II) |
| B4 | Coercion pressure | `phase-i-control-flip` uses `coercion_pressure_by_municipality` to reduce flip threshold |

Phase I steps: `evaluate-events` (first), `phase-i-militia-emergence`, `phase-i-pool-population`, `phase-i-minority-militia-decay`, `phase-i-brigade-reinforcement`, `phase-i-formation-spawn`, `phase-i-alliance-update`, `phase-i-ceasefire-check`, `phase-i-washington-check`, `phase-i-capability-update`, `phase-i-control-flip` (B4 coercion; capability-weighted attacker/defender), `phase-i-displacement-hooks`, `phase-i-control-strain`, `phase-i-authority-update`, `phase-i-jna-transition`, etc. Full order and conditions are in turn_pipeline.ts.

**Events (B1):** `src/sim/events/` — `event_types.ts`, `event_registry.ts`, `evaluate_events.ts`. `evaluate-events` runs first in both Phase I (`phaseIPhases`) and Phase II (`phases`). Deterministic: same seed + turn → same events_fired.

**Authority derivation:** `update-formation-lifecycle` derives municipality authority via `deriveMunicipalityAuthorityMap` (formation_lifecycle.ts) from political control (consolidated/contested/fragmented); used for brigade activation gating.

**AoR init:** `phase-ii-aor-init` uses `populateFactionAoRFromControl` and `ensureFormationHomeMunsInFactionAoR` from `src/scenario/aor_init.ts` (via scenario_runner re-export). Phase II AoR steps: `validate-brigade-aor`, `rebalance-brigade-aor`, `enforce-corps-aor-contiguity` (when corps_command present; enclave-aware), `apply-municipality-orders`. See Phase_II_Specification_v0_5_0.md §5.

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
- **New GameState field or serialized state:** Add to `src/state/serializeGameState.ts` (allowlist/denylist and key order); if it crosses canon boundary (e.g. B4 coercion), add an implementation-note in the relevant canon spec.
- **New pipeline step or reorder:** Update the canon-hook table and step list in this doc; update REPO_MAP §Key Pipelines / Change X → Go Here if the “go here” file changes.
