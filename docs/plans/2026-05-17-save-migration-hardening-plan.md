# Save Migration Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the pre-1.0 save migration gap (`CONSOLIDATED_BACKLOG.md` §16, P3 hygiene / v1.0-blocking) so that saves predating recent `GameState` schema evolution load with deterministic, version-stamped defaults instead of silently `undefined`-propagating into engine code. Today `save_migration.ts` registers only two steps (`version: 1` HRHB enclave fields and `version: 2` `corps_command.active_operations` array), while `src/state/serialize.ts:migrateState` carries 30+ version-anonymous defaults in its `case CURRENT_SCHEMA_VERSION` body. The 2026-05-17 Phase B `player_faction` ship is the latest instance of a field landing without a migration step.

**Worker execution note (2026-05-17):** Runtime migration backfill, strict validation, diagnostic tooling, per-version fixture contract, startup artifact compatibility check, and engineering procedure docs are implemented in the save-migration worker lane. Parent integration still owns roadmap/ledger/knowledge-ledger updates and final 40w hash recording.

**Architecture:** Treat the `save_migration` registry as the single source of truth for forward-compat shape evolution. Move version-anonymous defaults from `serialize.ts:migrateState` into versioned `registerMigration({version, migrate})` entries; tighten `validateGameState` so post-version-N saves missing a required field reject with a typed error; lock the contract with one round-trip fixture per schema version; document the bump procedure so future field additions cannot re-open the gap.

**Tech Stack:** TypeScript state layer (`src/state/`), Vitest, scenario runner artifacts, deterministic JSON serializer (`src/state/serializeGameState.ts`).

---

## Scope

This is a follow-up to:
- `docs/40_reports/audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md` — "Migration gap (only 2 migration steps for years of schema evolution) — LIVE (hygiene)".
- `docs/PROJECT_LEDGER.md` 2026-05-17 entry **fix(sim): default player_faction in headless harness (Phase B)** — instructive case of a new field shipping without a migration step.
- `CONSOLIDATED_BACKLOG.md` §16 row **Save migration gap**.
- Incoming coordination from `2026-05-17-logistics-priority-wire-or-remove-plan.md`: migrate or discard orphan legacy top-level `state.logistics_priority` into canonical `state.military.logistics_priority` during save-migration hardening.

In scope:
- Deterministic audit of `GameState` shape drift between the last registered migration (`version: 2`) and the current `case CURRENT_SCHEMA_VERSION` defaulting body.
- Backfill of `save_migration.ts` entries (one per coherent schema delta) with sensible defaults and `CURRENT_SCHEMA_VERSION` bump.
- Validator hardening in `src/state/validateGameState.ts` so missing required-as-of-version-N fields surface as typed errors, not silent `undefined` reads.
- Round-trip contract test: one fixture per schema version that loads, advances one turn, saves, reloads byte-stable.
- Documented schema version bump procedure.
- Determinism stop-gate on any default whose value can move scenario outputs.

Out of scope:
- Schema redesign. No field renames, no shape refactors. Forward-compat migrations only.
- The `strictNullChecks` long-term hygiene milestone (`CONSOLIDATED_BACKLOG.md` §16 row "`strictNullChecks` migration"). Not v1.0-blocking; tracked separately.
- The `?? 'RBiH'` masking-default sweep — owned by Phase B+ in `2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`.
- Changes to `src/state/serializeGameState.ts` top-level key allowlist. The allowlist (`schema_version`, `meta`, `factions`, `turn_summaries`, `operation_history`, `pending_paramilitary_requests`, `paramilitary_policy`, `paramilitary_deployment_count`, `military`, `political`, `displacement`) is canonical and stable.
- Changes to scenario-loader-side defaults (e.g., the harness's `player_faction ?? 'RBiH'` overlay). The migration step for `player_faction` (Task 2, `version: 11`) advertises the field; it does not set RBiH.

## Task 1: Schema Drift Audit Diagnostic

**Files:**
- Create: `tools/diagnostics/save_migration_drift_audit.cjs`
- Create: `tests/save_migration_drift_audit.test.ts`
- Read-only reference: `src/state/game_state.ts`, `src/state/serialize.ts`, `src/state/save_migration.ts`, `src/state/validateGameState.ts`

**Steps:**
1. Write a failing test that runs the diagnostic and expects a deterministic JSON report at `tools/diagnostics/output/save_migration_drift.json` listing every field that `serialize.ts:migrateState` defaults but the migration registry does not version-stamp.
2. Implement the diagnostic by walking three sources and intersecting them:
   - `serialize.ts:migrateState` body — extract every `if (!('<key>' in <parent>) ...)`, `<parent>.<key> === undefined`, and `<parent>.<key> ??=` site via deterministic regex.
   - `validateGameState.ts` shape — extract every `'<key>' in <parent>` shape guard.
   - Registered migrations — `getLatestSchemaVersion()` plus the bodies of each `registerMigration`.
3. Emit a table sorted by `parent.field` via `strictCompare`: `field | added-when (commit/ledger if found, else 'unknown') | default-needed | current-load-behavior | proposed-migration-version`.
4. Run focused test.

**Acceptance:** Diagnostic emits stable JSON sorted by `parent.field`. Report counts ≥ 30 defaulted fields currently in `serialize.ts:migrateState` (today's body defaults at minimum: `meta.referendum_held`, `meta.referendum_turn`, `meta.war_start_turn`, `meta.peace_scheduled_referendum_turn`, `meta.peace_scheduled_war_start_turn`, `meta.peace_war_start_control_path`, `meta.referendum_eligible_turn`, `meta.referendum_deadline_turn`, `meta.game_over`, `meta.outcome`, `pol.negotiation_status`, `pol.ceasefire`, `pol.negotiation_ledger`, `pol.supply_rights`, `pol.municipalities`, `pol.war_consolidation_until`, `pol.war_control_strain`, `pol.war_supply_pressure`, `pol.war_supply_condition`, `pol.war_exhaustion`, `pol.war_exhaustion_local`, `mil.front_segments`, `mil.theatres`, `mil.army_theatre_assignment`, `mil.formations`, `mil.front_posture`, `mil.front_posture_regions`, `mil.front_pressure`, `mil.assignable_front_segments`, `mil.brigade_front_assignment`, `mil.militia_pools`, `mil.war_militia_strength`, `mil.war_jna`, `disp.war_displacement_initiated`, `disp.settlement_displacement`, `disp.settlement_displacement_started_turn`, `disp.municipality_displacement`, `disp.hostile_takeover_timers`, `disp.displacement_camp_state`, `disp.displacement_event_log`, `disp.displacement_humanitarian_aggregates`, `disp.displacement_origin_dest_arrivals`, `disp.displacement_recent_by_turn`, plus formation lifecycle defaults (`form.kind`, `form.readiness`, `form.cohesion`, `form.morale`, `form.activation_gated`, `form.activation_turn`) and militia-pool `fatigue`, plus A2/C1 substrate fields under `mil`).

No migration backfill happens in this task. The diagnostic output is the input to Task 2.

## Task 2: Migration Backfill — One Step Per Schema Delta

**Files:**
- Modify: `src/state/save_migration.ts`
- Modify: `src/state/game_state.ts` (bump `CURRENT_SCHEMA_VERSION`)
- Modify: `src/state/serialize.ts:migrateState` — relocate version-stamped defaults out of the anonymous `case` body so `applyMigrations` is the single source of versioned defaulting. Keep the inline body as a thin pre-migration sanitizer (rescue / sweep / canonicalize only).
- Test: `tests/save_migration_versioned_steps.test.ts`

**Steps:**
1. Group the Task 1 audit output into coherent migration steps by feature/phase. Proposed grouping — finalize from audit:
   - `version: 3` — Phase 0 meta + faction declaration defaults (`meta.referendum_*`, `meta.war_start_*`, `meta.peace_*`, `meta.game_over`, `meta.outcome`, faction `declaration_pressure`/`declared`/`declaration_turn`).
   - `version: 4` — Political-domain defaults (`pol.negotiation_status`, `pol.ceasefire`, `pol.negotiation_ledger`, `pol.supply_rights`, `pol.municipalities`).
   - `version: 5` — Military-domain default skeleton (`mil.front_segments`, `mil.theatres`, `mil.army_theatre_assignment`, `mil.formations`, `mil.front_posture`, `mil.front_posture_regions`, `mil.front_pressure`, `mil.assignable_front_segments`, `mil.brigade_front_assignment`, `mil.militia_pools`).
   - `version: 6` — Peace-phase substrate (`mil.war_militia_strength`, `mil.war_jna`, `pol.war_consolidation_until`, `pol.war_control_strain`, `pol.war_alliance_rbih_hrhb`, `disp.war_displacement_initiated`).
   - `version: 7` — War-phase supply / exhaustion / displacement substrate (`pol.war_supply_pressure`, `pol.war_supply_condition`, `pol.war_exhaustion`, `pol.war_exhaustion_local`, `disp.hostile_takeover_timers`, `disp.displacement_camp_state`, `disp.settlement_displacement*`, `disp.municipality_displacement`, `disp.displacement_event_log`).
   - `version: 8` — Phase E/F humanitarian aggregates (`disp.displacement_humanitarian_aggregates`, `disp.displacement_origin_dest_arrivals`, `disp.displacement_recent_by_turn`).
   - `version: 9` — Formation lifecycle + militia-pool fatigue (`form.kind`, `form.readiness`, `form.cohesion`, `form.morale`, `form.activation_gated`, `form.activation_turn`, `mil.militia_pools[*].fatigue`).
   - `version: 10` — A2 / C1 substrate (`mil.army_co_decision_traces`, `mil.army_corps_directives_by_faction`, `mil.named_officer_data` `stubbornness`/`override_tolerance`, `mil.named_officers.recent_overrides`).
   - `version: 11` — `meta.player_faction` advertisement (Phase B from 2026-05-17 ledger). The migration leaves `undefined` for legacy saves (matches the current validator's "allows undefined" semantics). It exists to mark when the field entered the schema; the harness owns RBiH default.
   - `version: 12` — Top-level optional fields (`state.turn_summaries`, `state.operation_history`, `state.pending_paramilitary_requests`, `state.paramilitary_policy`, `state.paramilitary_deployment_count`). Defaults: only inject when at least one sibling top-level optional is present and this one is missing (round-trip stability for legacy saves that never carried these).
2. Write each migration as a pure in-place patch using strictly-deterministic iteration (sorted keys via `strictCompare`). No `Date.now`, no `Math.random`, no logging side effects.
3. After every default is moved into a versioned `registerMigration`, simplify `serialize.ts:migrateState` to call `applyMigrations(candidate)` after the rescue / sweep / canonicalize block. Keep only:
   - `structuredClone` of input.
   - `rescueLegacyTopLevelFields` legacy-residue rescue.
   - Faction-ID canonicalization, AoR phase-out deletion, top-level stray-field sweep.
4. Bump `CURRENT_SCHEMA_VERSION` to the highest registered migration version.
5. Run focused test.

**Acceptance:** `tests/save_migration.test.ts` and `tests/migration_nested_ownership.test.ts` pass byte-stable (their `getLatestSchemaVersion()` and `CURRENT_SCHEMA_VERSION` references follow the bump). Diagnostic from Task 1 reports zero version-anonymous defaults remaining in `serialize.ts:migrateState`. Each migration step has a one-line `description` tying it to a ledger date or canon-doc anchor for future debugging.

## Task 3: Validator Hardening — Reject Missing Required-As-Of-Version-N

**Files:**
- Modify: `src/state/validateGameState.ts`
- Modify: `src/state/serialize.ts:deserializeState` (post-`applyMigrations` validation gate)
- Test: `tests/save_migration_validator_rejection.test.ts`

**Steps:**
1. Add an opt-in strict validation mode `validateGameStateShape(state, { requireVersion: number })`. When `state.schema_version >= requireVersion`, fields gated by that version graduate from "validate type when present" to "must be present".
2. For each migration introduced in Task 2, declare a sidecar map `VERSION_REQUIRED_FIELDS: Record<number, ReadonlyArray<{ path: string; check: (v: unknown) => boolean }>>` declaring what becomes required at that version.
3. In `serialize.ts:deserializeState`, after `applyMigrations`, call `validateGameStateShape(migrated, { requireVersion: CURRENT_SCHEMA_VERSION })`. On failure, throw with a multi-line error listing every missing path and the version that made it required.
4. Tests:
   - A synthesized `v1` save loads and migrates to current without rejection.
   - A synthesized post-migration save with a hand-stripped required field rejects with a typed error mentioning the version and path.
   - A legacy `v0` save (no `schema_version`) still loads byte-stable through the registry.

**Acceptance:** No path through `deserializeState` produces a state where a required-as-of-current-version field is `undefined`. Failure cases produce one error per missing field, not a single opaque "validation failed" message. The validator remains pure (no I/O, no logging). Strict mode is opt-in to preserve the permissive shape contract used by early-load diagnostics.

## Task 4: Round-Trip Contract Fixtures — One Per Schema Version

**Files:**
- Create: `tests/fixtures/save_migration/v01_hrhb_enclave.json`
- Create: `tests/fixtures/save_migration/v02_corps_command_active_ops.json`
- Create: `tests/fixtures/save_migration/v<N>_<feature>.json` for every new version 3..CURRENT introduced in Task 2.
- Create: `tests/save_migration_round_trip_contract.test.ts`
- Read-only anchor: `data/derived/startup/apr_1992_initial_save.json` as the current-version reference.

**Steps:**
1. For each schema version `V ∈ {1, 2, …, CURRENT_SCHEMA_VERSION}`, hand-author a minimum-viable `GameState` fixture stamped `schema_version: V`. Each fixture ≤ 200 lines of JSON, including only the fields required by `V` (use validator strict mode to confirm minimum-viable shape).
2. Round-trip contract test, parameterized over `[v01, v02, …, vCURRENT]`:
   - `const s1 = deserializeState(fixturePayload)` — applies all pending migrations.
   - `assert.equal(s1.schema_version, CURRENT_SCHEMA_VERSION)`.
   - `const advanced = runOneTurn(s1)` using the scenario runner's single-step harness (peace or war as appropriate for the fixture's phase).
   - `const s2 = deserializeState(serializeState(advanced))`.
   - `assert.equal(serializeState(s2), serializeState(advanced))` — byte-stable round-trip.
3. The current-version anchor (`V = CURRENT_SCHEMA_VERSION`) reuses `data/derived/startup/apr_1992_initial_save.json` instead of a hand-authored fixture; this keeps the baked startup artifact migration-compatible and reuses the existing `tests/startup_snapshot_contract.test.ts` contract.
4. Run focused test (single vitest file).

**Acceptance:** All fixtures load, migrate to current, advance one turn, and round-trip byte-stable. Adding a new migration in the future fails this test until a `v<N+1>` fixture is added — the desired forcing function.

`runOneTurn` should use the existing scenario-runner step harness. If the harness does not expose a single-step entry, add one inside the test file as a thin wrapper and document it. Do not introduce a new public API.

## Task 5: Schema Version Bump Procedure Documentation

**Files:**
- Modify: `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` — add a "Save schema evolution" subsection.
- Create: `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md` — concise procedure doc.

**Steps:**
1. Document the four-step procedure for any future schema change:
   - Add the field to the `GameState` interface as `?:` optional.
   - Register a migration in `save_migration.ts` with the next free version number and a sensible default. Bump `CURRENT_SCHEMA_VERSION`.
   - If the field becomes required for engine correctness at that version, add it to `VERSION_REQUIRED_FIELDS` for strict validation.
   - Add a `v<N+1>_<feature>.json` fixture under `tests/fixtures/save_migration/`. The round-trip test will fail until this fixture exists.
2. Inline the Task 6 determinism stop-gate so future authors cannot bypass it.
3. Cross-link from `CLAUDE.md` Sacred Rules and from `docs/PROJECT_LEDGER_KNOWLEDGE.md`.

**Acceptance:** Procedure doc is one screen, copy-pasteable, and links to live files. Every step references a concrete file or test — no prose-only canon claim.

This task does not touch runtime code. It is the discipline scaffold that prevents the migration gap from re-opening.

## Task 6: Determinism Stop Gate

**Files:**
- Modify: `src/state/save_migration.ts` — header comment block documenting the stop-gate.
- Modify: `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md` (created in Task 5).
- Read-only reference: `CLAUDE.md` Sacred Rules — determinism + RNG seed handling.

**Steps:**
1. Classify every default introduced in Task 2 as either:
   - **Inert** — default cannot influence simulation outputs (empty maps, `null` for not-yet-occurred turn fields, structural skeletons). No sign-off required.
   - **Sensitive** — default could influence scenario outcomes, RNG seeding, faction defaults, or any field consumed by the bot / combat / political pipelines. Requires explicit user sign-off recorded in `docs/PROJECT_LEDGER.md` before the migration ships.
2. Concrete examples that must be flagged Sensitive:
   - `meta.player_faction` advertisement (already shipped Phase B; sensitive-class confirmation here even though the migration itself sets nothing — the user must acknowledge that the field exists in the schema as of this version).
   - Any RNG seed-adjacent field (none currently identified in the audit; if surfaced, hard-stop and escalate).
   - Faction-asymmetric defaults (e.g., `FACTION_MORALE_RESIST_FLOOR`-style values landing in state — not expected by the audit, flag if encountered).
   - Any default that, applied to a `v1` save and re-saved as current, would change the next-turn pipeline output.
3. The classification table goes into the Task 1 audit output, is reviewed before Task 2 ships, and is referenced in the implementation report.

**Acceptance:** Every migration step carries a `Sensitive: yes/no` annotation. Any `Sensitive: yes` step has an explicit user-signed line in the implementation report before commit. If the audit surfaces a sensitive default not covered above, **stop and escalate** — do not auto-decide.

## Verification

**Commands:**
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts`
- `npm.cmd run desktop:startup-snapshot:build` — confirms the baked startup artifact survives the migration registry round-trip.
- `npm.cmd run sim:scenario:run:40w` — calibration smoke. Compare `runs/<dir>/final_save.json` hash against the active calibration baseline recorded in `MASTER_ROADMAP.md` / `CALIBRATION_MASTER.md` at execution time. If hash drifts, see "Determinism flags".
- `node tools\diagnostics\save_migration_drift_audit.cjs` — emits the post-migration drift report (should be empty).

**Acceptance:**
- All focused tests pass.
- 40w calibration hash matches the pre-plan baseline byte-for-byte. If it drifts, the drift must be traced to a specific Sensitive-classified migration and signed off before the plan ships.
- `desktop:startup-snapshot:build` confirms `data/derived/startup/apr_1992_initial_save.json` is byte-stable through `deserializeState → applyMigrations → serializeState`.

To locate the new run directory, use the scenario command output first; if needed, list the newest matching directory with PowerShell and paste the exact path into the implemented report.

## Determinism Flags

This plan is structurally low-risk because all introduced defaults are intended to be inert (Task 6 enforces this). **Any calibration hash drift is a stop signal**, not a "re-baseline" prompt. Drift causes:
- A migration defaulted a field the engine consumed before the default was reached on legacy loads (engine had been reading `undefined` and treating it as `0` / falsy / skip). Fixing the migration is correct; the drift must be explained.
- A migration default differs from the implicit default the engine had been falling back to. Reconcile or revert.
- Iteration order of `applyMigrations` differs from `serialize.ts:migrateState` order. Migrations apply in ascending `version` order — confirm no inter-step dependency exists that the inline order silently provided.

Re-baseline only after Task 6 sign-off documents each drift-causing change.

## Docs and Ledger

Update:
- `docs/40_reports/implemented/YYYYMMDD_SAVE_MIGRATION_HARDENING.md` — implementation report with the Task 1 audit table, Task 2 migration list, Task 6 sensitivity classifications, and calibration hash confirmation.
- `docs/plans/MASTER_ROADMAP.md` — mark this plan implemented.
- `docs/PROJECT_LEDGER.md` — append behavioral/output statement. Required determinism statement: "Save migration registry now versions all `serialize.ts:migrateState` defaults. 40w calibration hash unchanged vs pre-plan baseline (`<hash>`). Sensitive-classified defaults: `<list or none>`. Schema version bumped from 2 to `<N>`."
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — append a Save Schema Evolution entry pointing at `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md`.

Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off — route any canon-level claim about save compatibility through the appropriate panel.

## Stop Gates And Closeout

- Stop after Task 1 if the audit contains any field whose origin commit/ledger cannot be identified — escalate the unknown-origin field before grouping into a migration version.
- Stop after Task 6 if any default is classified Sensitive and lacks a user-signed line in the report.
- Stop before commit if 40w calibration hash drifts and the drift is not explained by a signed Sensitive migration.
- Stage only `src/state/save_migration.ts`, `src/state/serialize.ts`, `src/state/validateGameState.ts`, `src/state/game_state.ts`, `tools/diagnostics/save_migration_drift_audit.cjs`, the new fixture files under `tests/fixtures/save_migration/`, the new focused tests, the new engineering doc, the implemented report, roadmap, and ledger files owned by this plan. Do not bundle unrelated state-layer changes.
