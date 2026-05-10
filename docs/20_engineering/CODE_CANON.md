# Code Canon (AWWV)

## Canon Precedence for Code
The codebase follows the same precedence rules as canonical docs:
- Engine invariants: `docs/10_canon/Engine_Invariants_v0_9_0.md`
- Rulebook: `docs/10_canon/Rulebook_v0_9_0.md`
- Systems Manual: `docs/10_canon/Systems_Manual_v0_9_0.md`
- FORAWWV addenda: `docs/FORAWWV.md`
- Code: this repository

When code contradicts canon, follow the contradiction protocol in this doc.

## Determinism Contract (Code-Facing)
Non-negotiables (must hold for all sim execution paths):
- No randomness unless explicitly defined in canon and deterministic.
- No timestamps or wall-clock derived values.
- Stable ordering for all collections and iterables.
- Byte-identical reruns from identical inputs.
- Derived state must not be serialized as source of truth.

Debug-only profiling exception: wall-clock probes may use monotonic process timers only when gated by an explicit profiling environment flag, kept out of game state/save state/scenario truth artifacts, and documented with a deterministic-output guard. Current example: bot-orders profiling behind `PERF_PROFILE_BOT_ORDERS=true`, which writes only `data/derived/_debug/bot_orders_perf_profile.json`.

If you touch determinism-sensitive areas, also read:
- `docs/20_engineering/DETERMINISM_AUDIT.md`
- `docs/20_engineering/INVARIANTS_IN_CODE.md`

## Where to Start Reading the Code (First 30 Minutes)
Read `docs/context.md` first (workflow discipline and validation rules).

### Canonical turn pipelines (one owner per phase)
- **War-phase pipeline:** `src/sim/turn_pipeline.ts` — `runTurn()`. Sole canonical runtime for live war behavior. Steps in `src/sim/turn_phases/war_phases.ts` and `early_war_phases.ts`; types in `src/sim/turn_pipeline_types.ts`.
- **Peace/state pipeline:** `src/state/turn_pipeline.ts` — `runOneTurn()`. Sole canonical runtime for non-war weekly state progression (directives → deployments → military_interaction → fragmentation_resolution → supply_resolution → political_effects → exhaustion_update → persistence).

If you are changing war behavior, start at `src/sim/turn_pipeline.ts`. If you are changing peace/state progression, start at `src/state/turn_pipeline.ts`. Nothing else is co-equal with these two.

### Canonical harnesses and surfaces (callers of the pipelines)
- Scenario harness: `src/scenario/scenario_runner.ts` — routes to peace vs war runner based on `state.meta.phase`.
- Scenario CLI: `src/cli/sim_scenario.ts`.
- Single-turn sim CLI: `src/cli/sim_run.ts`.
- Event framework (B1): `src/sim/events/`.
- Serialization core: `src/state/serialize.ts` and `src/state/serializeGameState.ts`.
- Map pipeline: `docs/20_engineering/MAP_BUILD_SYSTEM.md` (scripts under `scripts/map/`).
- Tactical Map (canonical map GUI): `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §0 and `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — React + MapLibre app in `src/ui/map/`; `npm run dev:map`.
- Product architecture authority: `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`.

### Bounded variant (not co-equal with canonical pipelines)
- `src/sim/run_combat_browser.ts` — `runPhaseIITurn()`. Browser-safe war-phase turn advance (no Node/fs). Increments the turn counter only; does not run supply pressure or exhaustion. Used by the warroom when advancing a turn in war phase. Full war-phase behavior comes from `runTurn()` in Node; do not treat this file as equivalent to `src/sim/turn_pipeline.ts`.

### Demoted / smoke-only (do not treat as canonical)
- `src/index.ts` — minimal deterministic smoke harness. Not the game entrypoint.
- `src/turn/pipeline.ts` — legacy prototype `executeTurn()`. Only invoked by `src/index.ts`. Live war behavior belongs in `src/sim/turn_pipeline.ts`.
- `src/scenario/aor_init.ts` — deprecated (AoR removed in n344). Do not use for war-phase state; war phase uses `location_osid` only.

## Single Source of Truth for Entry Points
Only the entrypoints listed in `docs/20_engineering/REPO_MAP.md` and `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`,
and approved in ADRs, are canonical.
Do not add or use shadow entrypoints.
Do not treat historical root summaries or handoff memos as co-equal architecture authority; use `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md` to resolve doc-era conflicts.

## Contradiction and Change Protocol
If code conflicts with canon:
1) Do not edit canon docs to match code.
2) Record the conflict in `docs/PROJECT_LEDGER.md`.
3) Create an ADR under `docs/ADR/` referencing the conflicting canon docs.
4) Resolve by changing code or by issuing a FORAWWV addendum.

## How to Propose Code Canon Changes
Use the ADR template in `docs/ADR/ADR-0001-template.md`.
Ledger entries are required for any change to:
- Determinism contract
- Canon precedence or doc roles
- Canonical entrypoints
See `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` for the current enforcement coverage.

## Development Cycle

Code changes are implemented either during day shift (user + Claude interactive) or night shift (autonomous Claude executing prepared plans). The night shift enforces all Code Canon rules — determinism contract, canon precedence, entrypoint discipline — without human oversight. See `.claude/skills/nightshift/SKILL.md`.

## Assumptions
- Assumption: There is a single canonical scenario runner.
  - How to verify: Use the discovery checklist in `docs/20_engineering/REPO_MAP.md`.
- Assumption: Derived state is not serialized as source of truth.
  - How to verify: Inspect serialization code and compare to derived list.
