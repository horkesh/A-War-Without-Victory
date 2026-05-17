# `strictNullChecks` Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the long-tail of type-laundering escapes (`as FactionId`, `as unknown`, `!.`, `![`) and the 455 optional `?:` fields on `GameState` into either honest required fields or explicitly narrowed reads, in deterministic phased commits, without changing runtime behavior or scenario hashes.

**Architecture:** `strictNullChecks` is already on in both `tsconfig.json` (`"strict": true`, line 7) and `src/ui/map/tsconfig.json` (line 14). The audit's premise ("TypeScript runs without strictNullChecks", `20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md:108`) is outdated. The actual milestone is repaying the escape-hatch debt the flag allowed to accumulate before it was on — primarily the 152 `as FactionId` casts across 72 files and the schema's wide optionality surface. Migrate in blast-radius order (state schema → sim engine → UI/adapter), one bounded module per commit, with type-only changes only. Behavioral fixes (e.g. Phase B `player_faction` default) are escalated out, not bundled.

**Tech Stack:** TypeScript strict mode (already on), Vitest static guards, deterministic inventory script under `tools/diagnostics/`, scenario hash compare for byte-stability.

---

## Scope

This is a follow-up milestone derived from `docs/40_reports/CONSOLIDATED_BACKLOG.md:253` (§16, P4 `strictNullChecks` migration) and the meta-pattern section of `docs/40_reports/audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md` §8.1 ("optionality crisis"). The deleted strict-null cleanup stub is superseded here; boundary contracts are handled as the early adapter/IPC portion of this plan rather than as a sibling lane.

In scope:
- Inventory all `as FactionId`, `as unknown`, `as any` boundary casts, `!.` non-null assertions, and `![` index assertions across `src/`.
- Classify `GameState`'s 455 `?:` fields by domain (sim core, state, scenario, UI/adapter, IPC, replay).
- Repay the cast debt module-by-module, ordered by blast radius: state schema first → sim engine → renderer/UI last.
- Per-phase commit pattern uses a deterministic waiver list (`tools/typed_strictness_waivers.json`) that shrinks monotonically.
- Each migration commit must be byte-stable against the current 40w calibration hash.

Out of scope:
- Schema redesign (widening `?:` → required without migration is forbidden — see Stop Gates).
- Behavioral defaults (e.g. `player_faction ?? 'RBiH'`) — escalate to a dedicated plan (Phase B model, `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`).
- Enabling `exactOptionalPropertyTypes` or `noUncheckedIndexedAccess` (deferred — see sibling plan's stop gate).
- Touching `docs/10_canon/FORAWWV.md` (canon hierarchy rule).

## Task 1: Build the Strictness Inventory Script

**Files:**
- Create: `tools/diagnostics/strict_null_inventory.cjs`
- Create: `tests/strict_null_inventory.test.ts`
- Create: `tools/typed_strictness_waivers.json` (initially empty `{ "files": [] }`)
- Reference data file: `docs/40_reports/audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md`

**Steps:**
1. Write a Vitest unit test that runs the inventory script against a fixture of synthetic `.ts` files (one with `as FactionId`, one with `!.`, one with a `?:` optional field) and asserts deterministic counts plus sorted-key JSON output.
2. Implement the script. It MUST emit deterministic JSON keyed by absolute path then line number. Categories:
   - `as_factionid_casts` (regex `\bas\s+FactionId\b`)
   - `as_unknown_casts` (regex `\bas\s+unknown\b`)
   - `as_any_casts` (regex `\bas\s+any\b`)
   - `non_null_assertions_dot` (regex `\w!\.`)
   - `non_null_assertions_index` (regex `\w!\[`)
   - `optional_fields_game_state` (parse `src/state/game_state.ts` for `?:` at field declarations; classify by surrounding interface — `GameState`, `MilitaryState`, `PoliticalState`, `DisplacementState`, etc.)
3. Sort output deterministically: files alphabetically, occurrences by line number, no `Date.now()`, no `Math.random()`.
4. Exclude `src/_archived/` and `node_modules/` from the inventory.
5. Run the focused test: `npx.cmd vitest run tests/strict_null_inventory.test.ts`.
6. Run the inventory against the real repo and commit the baseline output as `docs/40_reports/strict_null_inventory_baseline.json`.

**Acceptance:** Two consecutive runs of the inventory against an unchanged tree produce byte-identical JSON. Baseline JSON shows non-zero counts for each category (lower-bound sanity: ≥150 `as FactionId`, ≥120 `!.`, ≥125 `!\[`, ≥455 optional fields if you sum the `GameState` interfaces).

Inventory must include a per-category top-20 hotspots list so phase ordering is data-driven, not opinion-driven.

## Task 2: Domain-Classify the 455 Optional Fields

**Files:**
- Modify: `tools/diagnostics/strict_null_inventory.cjs` (add classifier)
- Test: extend `tests/strict_null_inventory.test.ts`
- Output: `docs/40_reports/strict_null_field_domains.json`

**Steps:**
1. Add a red test fixture with two synthetic interfaces (`SimCoreState`, `RendererState`) each with `?:` fields; assert domain assignment is correct.
2. Implement a deterministic classifier that maps each optional field to a domain bucket: `sim`, `state`, `scenario`, `ipc`, `ui_adapter`, `derived`, `unknown`. Use surrounding `interface` name + import path as the discriminator.
3. Emit domain counts and a per-domain field list (sorted alphabetically).
4. Cross-check classifier output against the §2 SKIP/OVERSHOW/MASK-AS-DEFAULT tables in the structural defect audit (`20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md` §2.1–§2.3). Any field that appears in those tables MUST be in the `state` or `sim` bucket, not `unknown`.

**Acceptance:** Total field count equals the inventory's optional-field count (no drops). `unknown` bucket is empty or contains explicit justifications inline. Phase ordering in Task 3 cites this artifact, not the audit.

## Task 3: Phase-Plan Modules by Blast Radius

**Files:**
- Create: `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` (companion phase ledger, owned by this plan)

**Steps:**
1. From the Task 2 artifact, lock the phase order:
   - **Phase 1 (state schema)** — `src/state/game_state.ts`, `src/state/serialize.ts`, `src/state/validateGameState.ts`, `src/state/displacement.ts`, `src/state/supply_reserves.ts`. Boundary: any field consumed by >5 callers.
   - **Phase 2 (sim engine — combat)** — `src/sim/combat/*.ts` (cast hotspots include `attack_resolution_osid.ts:6`, `ongoing_mobilization.ts:7`, `corps_operation_readiness.ts:3`).
   - **Phase 3 (sim engine — early war + bot)** — `src/sim/early_war/*`, `src/sim/bot/*`, `src/sim/turn_phases/war_phases.ts` (cast count: 10).
   - **Phase 4 (scenario + IPC)** — `src/scenario/*`, `src/desktop/desktop_sim.ts`.
   - **Phase 5 (UI adapter)** — `src/ui/map/data/GameStateAdapter.ts` (13 `as any` boundary reads — coordinate with sibling cleanup plan).
   - **Phase 6 (renderer + warroom)** — `src/ui/map/components/*`, `src/ui/warroom/*`.
2. For each phase, record (a) cast hotspot count, (b) optional-field count, (c) downstream consumer count, (d) expected determinism risk (LOW / MEDIUM / HIGH).
3. Phase 1 → Phase 6 is mandatory order. No phase may start before the prior phase's commit is on `main` and 40w hash-stable.

**Acceptance:** Phase ledger names every file in scope and assigns it to exactly one phase. No file appears in two phases.

## Task 4: Per-Phase Migration Pattern (Repeatable for Phases 1–6)

**Files (per phase, instance template):**
- Modify: the phase's owned files only
- Test: `tests/strict_null_inventory_progress.test.ts` (one assertion per phase: counts strictly decrease vs baseline)
- Modify: `tools/typed_strictness_waivers.json` (remove entries as files are cleaned)

**Steps (repeat per phase):**
1. Subset the phase's files via `tools/typed_strictness_waivers.json`. While a file is on the waiver list, the inventory test ignores it. When a file is cleaned, remove it from the waiver list. Waiver list shrinks monotonically.
2. For each file, replace `as FactionId` casts with one of three patterns:
   - **Narrowing read** — `const f = readFaction(state.meta.player_faction); if (f == null) return; …`. New helper lives in `src/state/faction_helpers.ts`.
   - **Required-field tightening** — only when the field is structurally always present (validated by `validateGameState.ts`); promote `?:` → required in the schema and remove the cast.
   - **Explicit `assertNonNull`** — `assertFaction(value, 'context')` throws a deterministic error. New helper in `src/state/assertions.ts`. NEVER use `!.` or `as FactionId` to silence.
3. Replace `as unknown as T` boundary reads at adapter/IPC seams with `isRecord` + typed accessors (`readString`, `readNumber`, `readArray`) owned by this plan's boundary-contract phase.
4. Replace `!.` and `![` with explicit guards. No `!` operator may survive in the phase's files.
5. Run focused tests: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts <phase-specific tests>`.
6. Run `npm.cmd run typecheck`.
7. Run `npm.cmd run sim:scenario:run:40w` and compare `run_summary.json` hash against the active baseline captured from `MASTER_ROADMAP.md` / `CALIBRATION_MASTER.md` at commit time.
8. Commit only after typecheck green AND vitest green AND 40w hash byte-identical.

**Acceptance per phase:**
- Inventory counts for that phase's files = 0 for `as_factionid_casts`, `non_null_assertions_dot`, `non_null_assertions_index`.
- Waiver list entries for that phase's files all removed.
- 40w hash byte-identical to pre-phase baseline.
- No new runtime undefined-paths (verified by full Vitest suite `npm.cmd run test:vitest`).

Each phase ships as ONE commit. Per CLAUDE.md "One change per calibration run" — phases are sequential, not interleaved.

## Task 5: Determinism Guard

**Files:**
- Create: `tests/strict_null_migration_hash_stable.test.ts`

**Steps:**
1. Write a vitest test that runs a fixed 4-turn deterministic mini-scenario through the pipeline and asserts the final-state hash matches a checked-in expected hash.
2. Hash function MUST use `strictCompare` sorting (per CLAUDE.md sacred rules) and exclude any field whose serialization is known platform-dependent (see `.github/workflows/baseline-regression.yml:92` note about platform-bound byte-hash).
3. The test runs in every phase commit's CI gate.

**Acceptance:** Hash is byte-stable across all 6 phase commits. If a phase commit changes the hash, the phase is rolled back and the cause is investigated (type narrowing should never change behavior).

## Task 6: Stop-Gate Escalation Protocol

**Steps:**
1. If during any phase the migration requires a behavioral default — e.g. `state.meta.player_faction == null` → must default to `'RBiH'` — STOP. Do not bundle the default into this plan. Write a dedicated plan modeled after Phase B (`docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`).
2. If a `?:` field cannot be promoted to required without a migration step (existing saves lack the field), STOP. Defer the field to `state` Phase 4 (scenario + IPC + save migration coordination), do not silent-default.
3. If `validateGameState.ts` would need to start rejecting saves that currently load, STOP. That is a save-migration concern, not a type concern.
4. Stop-gate decisions are recorded in `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` with: file, field/cast, blocker reason, escalation target plan filename.

**Acceptance:** Zero behavioral changes ship in this plan. Every blocker gets a dedicated escalation plan.

## Verification (Whole Milestone)

Run after every phase:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/strict_null_migration_hash_stable.test.ts`
- `npm.cmd run test:vitest:fast`
- `npm.cmd run sim:scenario:run:40w` and diff hash vs baseline
- `node tools/diagnostics/strict_null_inventory.cjs > <tmp>; diff against expected progress JSON`

Run once at milestone close:
- `npm.cmd run test:vitest` (full suite)
- `npm.cmd run desktop:map:build` (no UI regression)
- Confirm `docs/40_reports/strict_null_inventory_baseline.json` final state shows zero `as_factionid_casts`, zero `non_null_assertions_dot`, zero `non_null_assertions_index` for non-archived `src/`.

## Documentation And Ledger

Update:
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` §16 — flip the `strictNullChecks migration` row from "P4 (long)" to "IN PROGRESS — Phase N/6" as phases land. Mark CLOSED only when Task 4 acceptance holds for all six phases.
- `docs/PROJECT_LEDGER.md` — one entry per phase commit. Determinism note required (40w hash byte-stable).
- `docs/40_reports/audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md` §2.4 — correct the outdated claim that "TypeScript `strictNullChecks` is off"; the actual root cause is the cast escape hatches the flag permitted before it was enabled. Add an "as-of date" footnote pointing at this plan.
- DO NOT edit `docs/10_canon/FORAWWV.md` (canon rule).
- DO NOT touch `docs/plans/MASTER_ROADMAP.md` until the user integrates the final plan set (per orchestrator brief).

## Determinism Statement

This is a pure type-narrowing migration. No commit in any phase may change scenario output, AAR contents, sim ordering, or serialized state shape. Every phase commit MUST be 40w-hash byte-identical against the prior baseline. Any divergence is a defect, not a feature.

## Stop Gates And Closeout

- Stop if any phase commit changes the 40w hash. Roll back, investigate, refile as a behavioral fix plan.
- Stop if a `?:` field cannot be removed without a save migration — defer field, do not silent-default.
- Stop if a cast cannot be replaced without inserting a runtime default value — escalate via Task 6 protocol.
- Stop if `exactOptionalPropertyTypes` or `noUncheckedIndexedAccess` is needed — those are separate milestones with their own plans.
- Stage only inventory script, focused tests, phase-owned files, phase ledger, and this plan's ledger entry per commit. Never bundle phases.

## Open Design Questions (Carry Into Execution)

1. **Save-migration ordering** — for any `?:` field promoted to required in Phase 1, do existing saves need a migration step in `src/state/save_migration.ts`? Backlog item §16 already flags "Save migration gap — only 2 migration steps for years of schema evolution." Coordinate with that backlog row.
2. **`state.political` second iceberg** — audit §8.2 flags 1041 unguarded `state.political.*` reads. Should it be its own phase (Phase 2.5) or absorbed into Phase 1? Decide before Phase 1 starts; record in phase ledger.
3. **Inventory test brittleness** — regex-based counts will drift if the codebase adopts new escape patterns (`satisfies` casts, `as const`). Decide whether to use ts-morph AST for the inventory; trade-off is determinism risk vs precision. Default = regex with explicit `// strict-null:waived` annotation support.
4. **Boundary contract sequencing** — the deleted cleanup stub is superseded here. Ship the adapter/IPC typed-accessor phase before broad UI cleanup so `GameStateAdapter.ts` is touched once.

## References

- Backlog: `docs/40_reports/CONSOLIDATED_BACKLOG.md` §16 (line 253)
- Audit: `docs/40_reports/audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md` §2.4, §8.1, §8.2
- Superseded deleted stub: strict-null cleanup plan.
- Phase B model (escalation template): `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`
- CI gates: `.github/workflows/typecheck.yml`, `.github/workflows/baseline-regression.yml`
- Canon: `docs/10_canon/` (Engine Invariants determinism rules — `strictCompare`, no `Math.random`, no `Date.now`)
