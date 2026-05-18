# Autonomous Save Replay Determinism Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:determinism-auditor before changing serialization, replay, save migration, or scenario-runner code.

**Goal:** Close the remaining determinism/turn-pipeline evidence gaps: save-continue hash-chain, save/load/replay equivalence, and packaging-build determinism support.

**Architecture:** Work from committed artifacts and fixtures toward tests. Prefer small contract tests that prove artifact ownership before changing scenario-runner or serialization code. A loaded save must continue to the same deterministic future state as the original run unless an explicit migration/output contract says otherwise.

**Tech Stack:** TypeScript, Vitest, scenario runner, save migration registry, replay artifacts, Node diagnostics, existing desktop build scripts.

---

## Global Rules

- Start every lane with `git status --short --branch`.
- Use `rg` to locate current save/replay tests before adding new fixtures.
- Do not weaken `validateGameStateShape`, migration rejection, or player-faction validation.
- Do not regenerate snapshots unless the test proves the committed artifact is stale.
- Any output-affecting change needs focused tests, 40w proof, consistency validation, and docs/ledger propagation.

## SRD-1 - Save-Continue Hash Chain

**Objective:** Prove that loading a committed mid-run save and continuing produces the same final state hash as uninterrupted simulation over the same weeks.

**Likely files:**

- `src/scenario/scenario_runner.ts`
- `src/state/serializeGameState.ts`
- `src/state/save_migration.ts`
- `tests/save_continue_hash_chain.test.ts` or an adjacent existing test
- scenario fixtures under `tests/fixtures/` only if needed

**Tasks:**

1. Locate existing save/load and scenario-runner helpers.
2. Add a focused test that runs a short deterministic scenario, captures a mid-run save, reloads it, continues, and compares final hash/artifact-equivalent fields.
3. If the test fails, diagnose whether the mismatch is serialization shape, migration default, replay materialization, or runner phase ordering.
4. Fix only the proven owner.
5. If a fix changes 40w output, run 40w and explain the re-anchor.

**Validation:**

- `npm.cmd run typecheck`
- focused save/load/replay tests
- `npm.cmd run test:baselines` if scenario artifacts are touched
- 40w + consistency if behavior/output changes
- `git diff --check`

## SRD-2 - Replay Artifact Equivalence

**Objective:** Prove replay frames and summary cards read the same canonical final state when produced from uninterrupted run artifacts and loaded-save continuation artifacts.

**Likely files:**

- `src/replay/`
- `src/scenario/`
- replay-related tests found with `rg "replay" tests src`

**Tasks:**

1. Inventory replay artifact writers and readers.
2. Add a test comparing selected-frame manifest, final summary, and read-model rows across uninterrupted vs loaded-save continuation.
3. Repair only deterministic ordering or artifact-ownership defects.
4. Do not change visual replay presentation in this lane.

**Validation:**

- focused replay tests
- `npm.cmd run typecheck`
- `git diff --check`

## SRD-3 - Packaging Build Determinism Support

**Objective:** Prepare repo-side proof for reproducible desktop builds without claiming cross-machine proof.

**Likely files:**

- `tools/build/`
- `tests/desktop_packaging_targets.test.ts`
- `docs/40_reports/release/`
- `docs/50_launch/release/`

**Tasks:**

1. Inventory existing AppImage/NSIS smoke scripts and emitted hashes.
2. Add or update deterministic manifest fields only if they reduce manual transcription risk.
3. Add tests for stable JSON shape and sorted artifact records.
4. Document which proof remains operator-only: clean VM, code signing, SmartScreen, Settings -> Apps, registry cleanup, macOS dmg, and auto-update.

**Validation:**

- packaging target tests
- build script `node --check` where relevant
- `npm.cmd run desktop:map:build` if packaging inputs change
- `git diff --check`

## Ready-to-paste Claude Prompt

### 1. Role and objective

You are the autonomous AWWV determinism worker. Execute one substantial lane from `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md`, starting with SRD-1 unless Codex specifies another lane.

### 2. Canon references

Read `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 1, `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md`, current save/replay tests, and the scenario runner before editing.

### 3. Determinism and ledger constraints

Save/replay work is determinism-critical. No timestamps, randomness, environment-dependent ordering, or hidden defaults. Use sorted traversal and explicit fixtures. Update implemented report and ledger only after tests pass.

### 4. STOP AND ASK triggers

Stop for unexpected 40w hash drift, migration validation weakening, loaded-save behavior divergence that cannot be explained, generated artifact churn without a proven owner, or cross-platform proof claims from a single machine.

### 5. Output format and validation

Report lane, files changed, tests run, hash/consistency proof if relevant, generated artifacts changed, docs updated, commit hash or uncommitted status, and remaining determinism gaps.
