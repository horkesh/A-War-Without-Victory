# Optional `GameState` Schema Contract — Dedicated Plan

**Date:** 2026-05-29
**Owner lane:** Strict-null / save-contract lane (systems-programmer)
**Reviewers:** save/schema QA; canon-compliance-reviewer only if behavior could move (it must not)
**Status:** Planning only. NO source code, NO data, NO commit. This document expands Phase 2 of `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` (the thin "Optional `GameState` Contract" phase) into a dedicated, execution-grade plan. It does not contradict that source plan — it elaborates its four steps with the exact migration/default/validator/fixture pattern proven across v6–v33.
**Branch:** `codex/diagnostics-output-artifact-doc-closeout`.
**Behavior change introduced by this plan:** none (it is a plan). The slices it specifies are save-validation/default contracts that are **byte-identical** to the historical-default path.

---

## 0. Source-plan alignment (read first)

The COMMAND_BOARD row "Optional `GameState` schema contract" (`docs/plans/COMMAND_BOARD.md:37`) is **ACTIVE**, owned by the strict-null / save-contract lane, and points at `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 2 (lines 109–136). That phase prescribes exactly four steps per family:

1. Pick one optional-field family from the inventory.
2. Classify it (persisted contract / derived-runtime-only / legacy-compat / unsafe-to-change).
3. Add migration/default/validator tests **before** changing shape.
4. Promote, narrow, or document the family.

The phase's **stop gates** (source plan line 132–136, mirrored in the board): legacy save compatibility unclear; default changes scenario output; field is a real boundary/type-shape issue, not cosmetic optionality. The board's stop gate is identical in spirit: **Behavior change, broad type churn, legacy-save incompatibility.** This plan inherits those gates verbatim and adds the proof obligations that make each one falsifiable.

This plan does **not** reopen, supersede, or contradict the source plan; it is the detailed expansion the COMMAND_BOARD next-action calls for ("Continue by classifying the next optional-field family with migration/default/validator proof; `military.event_constraints` remains a deferred nested-object slice").

---

## 1. Objective + why

**Objective:** Tighten the optional-field contract of `GameState` toward strict-null correctness **without any behavior change**, by classifying and promoting one optional-field family at a time to a persisted save-validation/default contract — each with migration + default + validator + round-trip fixture + inventory-delta proof.

**Why now:**
- The strict-null escape-hatch cleanup is CLOSED at zero (`COMMAND_BOARD.md:62`: zero counted `as FactionId` / `as unknown` / `as any` / non-null assertions). The **only remaining strict-null work is the optional-field contract.**
- Optional `?:` fields on persisted interfaces are silent save-contract holes: a field that is structurally required for migrated/current saves but typed optional means the validator does not assert it, the migration does not default it, and a malformed legacy save can deserialize into a shape the engine assumes is present. Each promoted family removes one such hole.
- The current optional-field floor is **465** (`sim` 298, `state` 159, `derived` 8) per the source plan (line 114) and the board row (line 37). v6 through v33 closed dozens of array/record families. The next correct unit of work is the **first deferred nested-object slice: `military.event_constraints`.**

---

## 2. Scope & non-scope

### In scope
- Classify the next optional-field family/families from the live `strict_null_inventory.cjs` output.
- For each family classified as **persisted contract**: add (a) a migration that defaults it deterministically, (b) a validator branch that shape-checks it when present, (c) a version-gated required-field row when (and only when) the field becomes structurally guaranteed for current saves, (d) round-trip fixture coverage as the version table demands.
- Document families classified as **derived/runtime-only**, **legacy-compat**, or **unsafe-to-change** with a one-line justification in this plan and the board, leaving the TS optional marker intentionally retained (the precedent set for v21–v33 slices, source plan line 114).
- Record the inventory-count delta for each commit.

### Non-scope (hard boundaries — these ARE the stop gates)
- **NO behavior change.** No reader/writer logic changes. A migration default or validator addition that alters any scenario output is an immediate STOP. Proof obligation: 40w baseline byte-identity.
- **NO broad type churn.** Do not flip the TS `?:` marker on the recently-closed v21–v33 slices to required — that was intentionally avoided to prevent fixture churn (source plan line 114). Promotion is a *save-contract* promotion (migration+default+validator), not a blanket type rewrite.
- **NO legacy-save incompatibility.** Every migration must round-trip every existing fixture (v01..vN-1) byte-stably. A nested-object slice must NOT be eagerly materialized on legacy saves if doing so injects a key the original save never had (see §4.2 — the `event_constraints` nested-object hazard).
- **NO** removal of optional fields just to lower the inventory count (source plan Non-Goals line 18).
- **NO** scenario/event data edits, calibration tuning, UI work, or `docs/10_canon/FORAWWV.md` edits.

---

## 3. Current-state findings (file:line)

### 3.1 The optional-field floor and how the inventory tool classifies
- **Floor = 465** (`sim` 298, `state` 159, `derived` 8): source plan `2026-05-24-engine-quality-residuals-execution-plan.md:114`; board `COMMAND_BOARD.md:37`.
- The inventory tool `tools/diagnostics/strict_null_inventory.cjs`:
  - Scans only `src/state/game_state.ts` for optional fields via `scanOptionalGameStateFields` (`:145`), matching lines of the form `<name>?:` with the regex at `:164` (`/^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\?:/`). It tracks the enclosing `export interface` name (`:156`) and brace depth (`:159`, `:182`) so each optional field is attributed to its interface.
  - Each field is bucketed into a **domain** by `classifyDomain` (`:80`): `ui_adapter`, `ipc`, `scenario`, `derived`, `sim`, `state`, or `unknown`, keyed off the interface name regex and file path. `military.*` fields land in `sim` (the `Military` interface name matches the `sim` rule at `:96`). Top-level `state.*` fields land in `state`.
  - `--field-domains` (`:351`) emits `optional_field_domains` (counts + `fields_by_domain` + `unknown_justifications`); `--field-interfaces` (`:352`) emits per-interface counts. Default emits the full inventory with `counts`, `categories`, `hotspots`. Output is canonically sorted (`stableStringify` → `sortObject`, `:24`) so the inventory itself is deterministic and diffable.
  - **Implication:** the count delta after each slice is the difference in `counts.optional_fields_game_state` (and the per-domain delta in `--field-domains`). A *validator-only* slice that keeps the TS `?:` marker does **not** move the inventory count — that is expected and is the whole reason v21–v33 are "intentionally retained" optional markers (source plan line 114). The count moves only when a field's `?:` is removed (made required), which is precisely the broad-type-churn risk we are forbidden from triggering blindly.

### 3.2 Closed families (the precedent the new slices follow)
Source plan line 114 and board line 37 enumerate the closed save-validation/default contracts: v6 political war substrate (`war_consolidation_until`, `war_control_strain`, `war_supply_pressure`, `war_supply_condition`, `war_exhaustion`, `war_exhaustion_local`), v7–v8 displacement logs/aggregates, v10 army CO traces/directives, v14 event decision log, v15 event bookkeeping records, v16–v19 displacement capacity/substrate/lazy maps + civilian casualties, v20 `phantoms_spawned`, v21 `paramilitary_decision_history`, v22 overflow queue, v23 pending notifications, v24 pending decisions, v25 active modifier queues, v26 cost-ledger annotations, v27 convoy queues, v28 reserve queues, v29 triggered-op bookkeeping, v30 officer queues, v31 consequence runtime queues, v32 `closed_event_ids`, v33 `event_causality_log`.

**Every closed slice is an array or a record.** The migration uses `ensureArray` (`save_migration.ts:57`) or `ensureRecord` (`:48`), the validator uses an `Array.isArray` / `isRecord` version-gated row in `VERSION_REQUIRED_FIELDS` (`validateGameState.ts:937–972`) plus a conditional element-shape validator (`validateGameState.ts:1185–1202` pattern). The migrations are pure deterministic empty-default writes (`save_migration.ts:721–756`).

### 3.3 The deferred nested-object slice: `military.event_constraints`
- **Type:** `event_constraints?: EventConstraints` at `src/state/game_state.ts:2378` — the only remaining deferred slice the board names.
- **Shape:** `EventConstraints` (`src/sim/events/event_constraints.ts:12–22`) is a **nested object** with three optional array members: `operation_blocks?`, `doctrine_overrides?`, `scope_restrictions?` (each an array of objects with `faction`, `expires_turn`, `reason`, and—for scope—`allowed_municipalities?`/`blocked_municipalities?`). This is structurally unlike every closed array/record family: it is a partially-optional **object slice** whose members are themselves optional arrays.
- **Writer:** `applyDoctrineConstraint` (`src/sim/events/apply_effects.ts:387–417`) **lazily** creates `state.military.event_constraints = {}` (`:392–394`) and lazily creates each member array on first push (`bus.operation_blocks ??= []` `:400`, `doctrine_overrides` `:406`, `scope_restrictions` `:412`). Crucially: a save where no constraint event has ever fired has **no `event_constraints` key at all**.
- **Readers:** `isOperationBlocked` (`event_constraints.ts:25`), `getActiveDoctrineOverride` (`:37`), `filterByScope` (`:49`) — all tolerate `undefined` (`if (!constraints?.operation_blocks) return false`). Bot consumer: `bot_corps_directives.ts:87`. AI prompt consumer: `prompt_builder.ts:259`. None assume the key exists.
- **Current contract status:** NOT in `VERSION_REQUIRED_FIELDS` (`validateGameState.ts:937–972` — absent), NOT in the conditional validator block (`validateGameState.ts:1185–1202` — absent), NOT defaulted by any migration (`save_migration.ts` — absent). It is fully optional, fully unvalidated. This is the open hole.

### 3.4 Migration/validator machinery
- `CURRENT_SCHEMA_VERSION = 33` (`src/state/game_state.ts:42`). The event-system arc shipped v32/v33 (`save_migration.ts:740–756`).
- `registerMigration` (`save_migration.ts:298`); helpers `asRecord` (`:34`), `ensureRecord` (`:48`), `ensureArray` (`:57`). `ensureRecord` replaces a non-object value with `{}` and returns it — but note it **always** writes the key if absent, which is the byte-identity hazard for a nested slice that legacy saves legitimately omit.
- `validateGameStateShape` (`validateGameState.ts:982`): denylist check (`:998`), then version-gated `VERSION_REQUIRED_FIELDS` loop (`:1004–1012`) which requires a field only when `stateVersion >= field.version && field.version <= options.requireVersion`, then the per-slice conditional validators (`:1185+`). Serialize path enforces `validateGameStateShape(migrated, { requireVersion: CURRENT_SCHEMA_VERSION })` (`serialize.ts:29`).
- Round-trip fixture contract: `tests/save_migration_round_trip_contract.test.ts:15–19` asserts one fixture per schema version `v01..v(N-1)` and migrates each to `CURRENT_SCHEMA_VERSION` byte-stably (`:21–29`); plus the startup artifact (`:31–42`). **A validator-only slice with no version bump needs no new fixture file** (the existing v32 fixture already exercises the path).

---

## 4. Design

### 4.1 Recommended next family: `military.event_constraints` (the deferred nested-object slice)

This is the explicit board next-action and the only named deferred slice. Classify it as a **persisted contract — validate-when-present, do NOT eagerly default.** Rationale:

- It is genuinely persisted (written by event effects, read by bot/AI across turns), so it deserves a validator (closes a real shape hole).
- It is legitimately absent on most saves (no constraint event fired), and its writer materializes it lazily. Eagerly defaulting it to `{}` in a migration would **inject a key legacy saves never had**, risking byte-identity drift on the startup artifact and every fixture — a direct hit on the legacy-save-incompatibility stop gate. Therefore the slice is **validator-only, no migration default, no version-required row, TS optional retained.** This is the "derived/runtime-lazy persisted" sub-classification: persisted but optional-by-construction.

This makes `event_constraints` the model for the *nested-object* sub-pattern, distinct from the array/record default pattern of v6–v33. Closing it correctly establishes the precedent for any remaining nested-object optional slices.

### 4.2 The nested-object validate-when-present pattern (the core deliverable for §5 Step 1)

For `event_constraints`, the validator addition mirrors `validateCascadePenalties` (`validateGameState.ts:540`) but for a nested object:

- Add `validateEventConstraints(value, errors)`: assert `isRecord(value)`; for each present member (`operation_blocks`, `doctrine_overrides`, `scope_restrictions`) assert `Array.isArray`; for each element assert object shape — `faction` non-empty string, `expires_turn` non-negative integer (optional for `scope_restrictions` per the type at `event_constraints.ts:19`), `reason` string, and for scope the optional `allowed_municipalities`/`blocked_municipalities` are string arrays when present. Members absent ⇒ no error (validate-when-present).
- Add the conditional invocation in `validateGameStateShape` mirroring `validateGameState.ts:1185` (`'event_constraints' in military && military.event_constraints !== undefined` ⇒ `validateEventConstraints(...)`).
- **Do NOT** add a `VERSION_REQUIRED_FIELDS` row (that would require the key on every current save and break lazy-absence saves).
- **Do NOT** add a migration (no eager default).
- Keep `event_constraints?:` optional at `game_state.ts:2378`.

Net inventory delta: **0** (TS marker retained). The slice is closed as a *validation* contract, not a count reduction — exactly as v21–v33 were. The board row must record this so the floor=465 is not mistaken for "stuck."

### 4.3 Subsequent families (after `event_constraints`)

After `event_constraints`, classify the next family from the live `--field-domains` output. The protocol per family:
1. Run `strict_null_inventory.cjs --field-domains`; pick the highest-value unhandled `sim`/`state` family (favor genuinely-persisted families with real readers/writers over cosmetic/derived ones).
2. Classify: **array/record persisted** → migration `ensureArray`/`ensureRecord` + version bump + `VERSION_REQUIRED_FIELDS` row + conditional validator + new fixture; **nested-object persisted, lazy** → validator-only (the `event_constraints` pattern, no bump); **derived/runtime-only** → document + retain optional, no contract; **legacy-compat / unsafe** → document + retain optional.
3. Only families classified array/record-persisted-and-structurally-required get a version bump.

Recommended ordering after `event_constraints`: survey the `state` domain (159 fields) for top-level persisted records lacking validators, and the `sim`/`Military` nested-object members (e.g. `ai_decision_log`, `ai_army_decisions`, `corps_dialogues`, `war_dispatches` at `game_state.ts:2380–2386` — note these are cosmetic/replay and likely classify derived/runtime-only, documented-and-retained). One family per commit; never bundle.

---

## 5. Step-by-step implementation (numbered discrete commits)

Each family = ONE commit. Each commit ships: validator (and migration+default+fixture only if array/record-persisted) + version-required row if applicable + tests + inventory delta recorded. Write tests BEFORE the shape/validator change (source plan Step 3).

### Commit 1 — `military.event_constraints` (validate-when-present; no version bump)
1. Add red tests first: `save_migration_validator_rejection.test.ts` cases that a malformed `event_constraints` (non-object; member non-array; element missing `faction`; bad `expires_turn`) is REJECTED by `validateGameStateShape`, and that an absent `event_constraints` and a well-formed one PASS.
2. Add `validateEventConstraints` to `validateGameState.ts` (pattern §4.2) + the conditional invocation near `:1185`.
3. Do NOT add a migration, version-required row, or fixture.
4. Verify: `strict_null_inventory.cjs` count unchanged (delta 0, expected); validator-rejection tests green; round-trip fixtures still byte-stable (v32 fixture unchanged); typecheck; `git diff --check`.
5. Record in ledger + board: `event_constraints` closed as validate-when-present nested-object contract; floor still 465; TS optional retained.

### Commit 2..N — next optional-field family (per §4.3 protocol)
For an **array/record-persisted-and-required** family only:
1. Red tests first: `save_migration_versioned_steps.test.ts` (migration defaults the field for a pre-version fixture), `save_migration_validator_rejection.test.ts` (malformed REJECTED, well-formed/absent-at-old-version PASS), `save_migration_round_trip_contract.test.ts` (new `v<NN>_*.json` fixture migrates byte-stably).
2. Bump `CURRENT_SCHEMA_VERSION` (`game_state.ts:42`) to `NN`.
3. Add `registerMigration({ version: NN, … ensureArray/ensureRecord(mil, 'field') })` (`save_migration.ts` tail, pure deterministic empty default).
4. Add the element-shape validator function + version-gated `VERSION_REQUIRED_FIELDS` row (`{ version: NN, path: 'military.field', check: Array.isArray|isRecord }`) + conditional invocation.
5. Add the `v<NN-? >`… actually add the new `v<NN>_*.json` round-trip fixture so the contract's "one fixture per version" assertion (`save_migration_round_trip_contract.test.ts:15`) still holds (fixtures cover up to `CURRENT_SCHEMA_VERSION - 1`; a bump from NN-1→NN requires the `v<NN-1>` fixture to exist).
6. Verify (see §7). Record inventory delta (will be 0 if TS optional retained; non-zero only if `?:` removed — justify any removal against the type-churn gate).

For a **derived/runtime-only or legacy/unsafe** family: no code change; document the classification + justification in this plan §4.3 and the board; retain the optional marker. This is a docs-only "closure" of that family's classification.

---

## 6. Determinism & legacy-save compatibility

- **Determinism (sacred, CLAUDE.md):** every migration is a pure deterministic empty-default write — no `Math.random`, no `Date.now`, no timestamps, no env reads, no unordered iteration. Validators are pure functions over the value. The inventory tool is already deterministic (`stableStringify`, `strictCompare`).
- **Legacy-save compatibility — the load-bearing proof:** every migration must round-trip every existing fixture `v01..v(N-1)` byte-stably (`save_migration_round_trip_contract.test.ts`). For `event_constraints` (no migration), the proof is that the validator never rejects a legitimately-absent slice and the startup artifact still serializes identically.
- **No behavior change — prove via baseline byte-identity:** before/after each commit, the 40w Jan-1993 scenario hash and `npm run test:baselines` must be byte-identical to the current baseline of record (656/712, hash recorded in MEMORY/ledger; the calibration arc baseline `COMMAND_BOARD.md:32`). A validator/migration-default slice that touches a baseline is an immediate STOP — it means a default changed scenario output (source plan stop gate line 134) and the field is not inert.
- **Validators run at serialize time** (`serialize.ts:29`), so a too-strict validator would fail save on a legitimate state — the validator-rejection tests must include the legitimate-state PASS cases to guard against over-tightening.

---

## 7. Test plan

Per commit (focused, before the shape change where the slice changes shape):
- `tests/save_migration.test.ts` — migration registration/ordering.
- `tests/save_migration_versioned_steps.test.ts` — the specific version's default applied to a pre-version fixture (array/record commits only).
- `tests/save_migration_validator_rejection.test.ts` — malformed REJECTED + legitimate (incl. absent) PASS for the new slice.
- `tests/save_migration_round_trip_contract.test.ts` — all `v01..v(N-1)` fixtures + startup artifact migrate byte-stably (and the new `v<NN-1>` fixture exists for array/record bump commits).
- `tests/save_migration_drift_audit.test.ts` + `node tools/diagnostics/save_migration_drift_audit.cjs` — migration drift byte-identity.
- `node tools/diagnostics/strict_null_inventory.cjs` and `--field-domains` — record the count/domain delta (expected 0 for retained-optional slices; document expectation).
- `npm run typecheck` (`npx tsc --noEmit`); `git diff --check`.
- Baseline byte-identity: `npm run test:baselines` and the 40w hash equal to the recorded baseline.

Full smoke triad after the family lands: `npx tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`.

## 8. Verification gates (must all pass before commit)
1. Validator-rejection tests: malformed slice rejected, legitimate/absent slice accepted.
2. Round-trip fixtures byte-stable for all prior versions + startup artifact.
3. Migration drift audit clean (array/record commits).
4. `strict_null_inventory.cjs` delta recorded and explained (0 = retained-optional, expected).
5. 40w baseline + `test:baselines` byte-identical to baseline of record.
6. `tsc --noEmit` clean; `git diff --check` clean; generated artifacts unstaged unless owned.

## 9. Risks (the stop gates)
- **Behavior change:** a migration default or validator that moves any scenario output. Mitigation: §6 baseline byte-identity gate; STOP on any baseline drift.
- **Broad type churn:** flipping recently-closed v21–v33 `?:` markers to required, or a sweeping interface rewrite. Mitigation: one family per commit; TS optional retained unless a single field is provably structurally guaranteed; inventory delta justified.
- **Legacy-save incompatibility:** eagerly defaulting a lazily-absent nested slice (the `event_constraints` hazard) or an over-strict validator rejecting a legitimate legacy state. Mitigation: validate-when-present for nested-lazy slices; no eager default; round-trip fixtures over all prior versions; legitimate-PASS test cases.
- **Inventory misread:** treating floor=465 as "stuck" when validator-only closures correctly leave the count unchanged. Mitigation: board/ledger note that retained-optional closures are count-neutral by design.

## 10. Rollback
- Validator-only commit (`event_constraints`): `git revert` the single commit; no version bump to unwind, no fixture to remove, save shape unchanged.
- Array/record commit: `git revert` reverts the version bump + migration + validator + fixture together (one commit). Because each version is additive and empty-default, reverting restores the prior `CURRENT_SCHEMA_VERSION` and the prior fixture set; no migrated save data is lost (defaults were inert).

## 11. Dependencies
- Source plan `2026-05-24-engine-quality-residuals-execution-plan.md` Phase 2 (parent).
- `tools/diagnostics/strict_null_inventory.cjs` (+ `--field-domains`) — family selection.
- `src/state/save_migration.ts`, `src/state/validateGameState.ts`, `src/state/serialize.ts`, `src/state/game_state.ts` — the surfaces edited.
- Existing fixtures under `tests/fixtures/save_migration/`.
- No dependency on the event-system authoring arc (that arc owns v32/v33 already; this lane only *validates* `closed_event_ids`/`event_causality_log` if it ever revisits them — out of scope here).

## 12. Owner
Strict-null / save-contract lane (systems-programmer). Reviewer: save/schema QA; canon-compliance-reviewer only if any slice could move behavior (it must not).

## 13. Definition of Done
1. `military.event_constraints` closed as a validate-when-present nested-object contract: validator added, malformed-rejection + legitimate/absent-PASS tests green, no migration/no version bump/no fixture, TS optional retained, baseline byte-identical.
2. Each subsequent family classified (persisted-array/record → full migration+default+validator+fixture+bump; nested-lazy → validator-only; derived/legacy/unsafe → documented + retained) with the relevant proof.
3. Inventory delta recorded per commit with its expected value justified.
4. All verification gates (§8) green; baseline byte-identity proven.
5. COMMAND_BOARD row `:37` and `docs/PROJECT_LEDGER.md` updated; the deferred-`event_constraints` note removed once closed; the nested-object validate-when-present sub-pattern documented for future slices.
