# Code Canon (AWWV)

## Canon Precedence for Code
The codebase follows the same precedence rules as canonical docs:
- Engine invariants: `docs/10_canon/Engine_Invariants_v0_7_0.md`
- Rulebook: `docs/10_canon/Rulebook_v0_7_0.md`
- Systems Manual: `docs/10_canon/Systems_Manual_v0_7_0.md`
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

If you touch determinism-sensitive areas, also read:
- `docs/20_engineering/DETERMINISM_AUDIT.md`
- `docs/20_engineering/INVARIANTS_IN_CODE.md`

## Where to Start Reading the Code (First 30 Minutes)
Read `docs/context.md` first (workflow discipline and validation rules).

Primary entrypoints (from deterministic discovery):
- Scenario harness: `src/scenario/scenario_runner.ts`
- Scenario CLI: `src/cli/sim_scenario.ts`
- Single-turn sim CLI: `src/cli/sim_run.ts`
- War-phase pipeline: `src/sim/turn_pipeline.ts` (orchestrator; steps in `src/sim/turn_phases/war_phases.ts`)
- Canonical pipeline: `src/state/turn_pipeline.ts`
- War-phase browser advance (warroom subset): `src/sim/run_combat_browser.ts`
- AoR init shared helper: `src/scenario/aor_init.ts`
- Event framework (B1, report-only): `src/sim/events/`
- Serialization core: `src/state/serialize.ts` and `src/state/serializeGameState.ts`
- Minimal smoke entrypoint: `src/index.ts`
- Map pipeline: `docs/20_engineering/MAP_BUILD_SYSTEM.md` (scripts under `scripts/map/`)
- Product architecture authority: `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`
- Tactical Map (canonical map GUI): `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §0 and `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — React + MapLibre app in `src/ui/map/`; `npm run dev:map`

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
