# Strict Null Post-FactionId Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After the visible `as FactionId` count is closed or formally retained, turn the strict-null migration into a classified roadmap for `as unknown`, `as any`, and non-null assertions.

**Architecture:** Treat every remaining escape as one of six classes before any cleanup: trivial alias, schema boundary, save-shape risk, runtime invariant, UI adapter boundary, or deferred behavior fix. Work only from current inventory output and shrink category-specific caps monotonically.

**Tech Stack:** TypeScript strict mode, `tools/diagnostics/strict_null_inventory.cjs`, Vitest strict-null progress tests, scenario baseline gates for sim-facing files.

---

## Current Inventory Floor

This plan was authored before Batches 50/51, Batch C, and the two post-Batch-C tail passes. The historical Batch 48 floor remains useful context, but the current accepted floor is now lower.

Historical Batch 48 floor:

| category | count |
|---|---:|
| `as_factionid_casts` | 3 |
| `as_unknown_casts` | 80 |
| `as_any_casts` | 319 |
| `non_null_assertions_dot` | 40 |
| `non_null_assertions_index` | 43 |
| `optional_fields_game_state` | 463 |

Expected after the AI parser schema lane:
- `as_factionid_casts` should be 2, both retained in `GameStateAdapter.ts` because UI `FactionId` is a literal union.
- If the parser lane also removes `d!.stance`, `non_null_assertions_dot` may drop by 1.

Current post-tail floor as of 2026-05-21:

| category | count |
|---|---:|
| `as_factionid_casts` | 2 |
| `as_unknown_casts` | 6 |
| `as_any_casts` | 197 |
| `non_null_assertions_dot` | 11 |
| `non_null_assertions_index` | 38 |
| `optional_fields_game_state` | 463 |

Current floor as of the 2026-05-22 save-migration tail:

| category | count |
|---|---:|
| `as_factionid_casts` | 2 |
| `as_unknown_casts` | 0 |
| `as_any_casts` | 8 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| `optional_fields_game_state` | 477 |

At this floor, the remaining `as_any_casts` were limited to `src/ui/map/data/GameStateAdapter.ts`, and the two retained `as_factionid_casts` were also in `GameStateAdapter.ts` under the UI/engine `FactionId` stop-gate. That adapter lane is superseded by the 2026-05-22 GameStateAdapter tail below.

Current floor as of the 2026-05-22 GameStateAdapter tail:

| category | count |
|---|---:|
| `as_factionid_casts` | 0 |
| `as_unknown_casts` | 0 |
| `as_any_casts` | 0 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| `optional_fields_game_state` | 477 |

The visible counted escape lanes are now closed. Remaining strict-null work is the optional `GameState` field contract/schema lane, not broad cast cleanup.

Remaining `as_unknown_casts` are no longer the next broad safe batch. They are classified as behavior-shaped or intentionally incomplete mock/adapter bridges and should move only under their owning behavior/schema plans. The active safe lane has narrowed after the validator, corps front-lines builder, UI window bridge, bot-response / interaction-layer, CLI political-side / MapKit, core singleton, and AI settings panel slices: remaining `as any` cleanup should start only from a fresh per-file classification, because the large validator leaf cluster is already closed and the next visible clusters are library boundaries, save-shape risk, diagnostic harnesses, or behavior-shaped UI contracts.

## Scope

In scope:
- Read-only classification of every remaining `as unknown`, `as any`, `!.`, and `![` occurrence.
- Updating the strict-null phase ledger with a next-phase queue.
- Adding test caps for newly accepted floors.
- Producing implementable batch slices with stop gates and focused validation commands.

Out of scope:
- Source cleanup in the same planning pass.
- Promoting optional `GameState` fields to required.
- Save migration work without a dedicated save-schema plan.
- UI/engine `FactionId` unification.

## Classification Taxonomy

Use exactly these classes:

| class | meaning | allowed next action |
|---|---|---|
| trivial alias | Cast or assertion is provably type-only and removing it emits equivalent JS. | Safe cleanup batch with focused tests. |
| schema boundary | JSON, IPC, LLM, imported JSON, or external payload needs runtime validation. | Write schema-validation plan before code. |
| save-shape risk | Existing saves may omit or reshape the field. | Defer to save migration / validateGameState lane. |
| runtime invariant | Code depends on a real invariant, for example array length or prior initialization. | Replace with explicit assertion or local guard only with tests. |
| UI adapter boundary | Renderer read model consumes loose engine shape. | Coordinate with adapter/source contract plan; do not piecemeal. |
| deferred behavior fix | Removing the escape exposes a behavior bug or wrong state path. | New behavior plan, not strict-null cleanup. |

## Task 1: Generate The Fresh Inventory Snapshot

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_STRICT_NULL_POST_FACTIONID_CLASSIFICATION.md`

**Commands:**

```powershell
node tools\diagnostics\strict_null_inventory.cjs > data\derived\_debug\strict_null_inventory_post_factionid.json
```

**Steps:**
1. Confirm current `git status --short --branch`.
2. Generate inventory from the current tree.
3. Record top 20 files per category.
4. Record exact counts and compare to the Batch 48 floor plus AI parser lane delta.

**Acceptance:** The report starts from current disk truth, not old roadmap counts.

## Task 2: Classify Remaining `as unknown` Sites

**Files to inspect first:**
- `src/scenario/oob_loader.ts`
- `src/scenario/scenario_loader.ts`
- `src/scenario/brigade_temporal_emit.ts`
- `src/state/serialize.ts`
- any current top-five `as_unknown_casts` files from the generated inventory.

**Steps:**
1. For each site, record file, line, source of value, destination type, and class.
2. Mark JSON parse outputs as schema boundary unless already guarded by `Array.isArray` or `isRecord`.
3. Mark `unknown[]` casts after `Array.isArray` as likely trivial alias only if removing the cast preserves typecheck.
4. Do not change source code in this task.

**Acceptance:** Every `as_unknown_casts` occurrence is classified, or the report lists a bounded unresolved count with exact files.

## Task 3: Classify Remaining `as any` Sites

**Files to inspect first:**
- top files from inventory, especially UI and adapter-heavy files.
- retained `GameStateAdapter.ts` sites after Batch 48.
- loader / imported JSON boundaries.

**Steps:**
1. Split into UI adapter boundary, schema boundary, save-shape risk, and trivial alias.
2. Flag `state as any` or `record as any` writes as higher risk than reads.
3. Treat imported JSON structural mismatch as schema boundary, not cleanup.
4. Build a proposed next three-batch queue:
   - Batch A: trivial alias-only, no sim behavior.
   - Batch B: runtime invariant guards with focused tests.
   - Batch C: schema-boundary validation plan, not immediate code.

**Acceptance:** The report names a first safe implementation batch of no more than 8 files.

## Task 4: Classify Non-Null Assertions

**Files to inspect first:**
- top `non_null_assertions_dot` files.
- top `non_null_assertions_index` files.
- files already documented as length-check emit-shape risks.

**Steps:**
1. Classify each assertion as runtime invariant, trivial alias, save-shape risk, or deferred behavior fix.
2. For array index assertions after length checks, check whether a local binding can remove the assertion without changing emitted JS shape.
3. For state-path assertions, verify whether the field is initialized by migration/validation or only by convention.
4. For each cleanup candidate, name the focused test that proves the invariant.

**Acceptance:** No assertion is scheduled for cleanup without a proving test or explicit assertion helper strategy.

## Task 5: Update Strict-Null Roadmap

**Files:**
- Modify: `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`
- Modify: `tests/strict_null_inventory_progress.test.ts` only if new accepted caps are established.
- Modify: `docs/PROJECT_LEDGER.md`

**Steps:**
1. Add a "post-FactionId roadmap" section to the phase ledger.
2. Record category floors after AI parser closeout.
3. Link the classification report.
4. Add caps only for accepted floors, not speculative targets.
5. Append a ledger entry stating this is classification/planning only.

**Acceptance:** The roadmap has next implementable slices for each category and no stale claim that `as FactionId` remains the main strict-null work.

## Required Verification

```powershell
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
git diff --check
```

Run `npm.cmd run typecheck` only if source or tests change. No baseline run is needed for a classification-only docs/test-cap pass unless source files change.

## Stop Gates

- Stop if inventory counts do not match current main plus accepted parser delta.
- Stop if a source cleanup looks like a behavior fix.
- Stop if optional `GameState` promotion is required.
- Stop if `GameStateAdapter.ts` cleanup requires engine schema changes.
- Stop if a batch would mix schema validation with trivial alias cleanup.
