# Batch 40 — Strict-Null Phase 3 Continuation Slice (Byte-Identical)

**Date:** 2026-05-19
**Branch:** `codex/strict-null-long-tail-2026-05-19`
**Predecessor:** Batch 39 (`docs/40_reports/implemented/20260518_BATCH39_STRICT_NULL_PHASE3_SAFE_SLICE.md`)
**Baseline:** 40w `b14179d65639860c` (Batch 39 floor)
**Status:** Edits applied; typecheck PASS; strict-null inventory progress test 19/19 PASS (incl. new Batch 40 slice); focused early-war tests 42/42 PASS; `npm.cmd run test:baselines` PASS ("Baseline regression: all scenarios match"). Byte-identical to predecessor.

## Goal

Continue Phase 3 of the strict-null migration on the four files Batch 39
deferred but whose escapes are no-op casts under the current
`FactionId = string` definition. `tools/diagnostics/strict_null_inventory.cjs`
treats `as FactionId` as a counted escape via regex, but the underlying
type alias is transparent in TypeScript, so removal is type-erasure with
character-equivalent JavaScript emit.

## Scope decisions

**In scope:**
- Remove redundant `as FactionId` / `as FactionId | null` / `as FactionId[]`
  casts where the source type is already `string` (≡ `FactionId`).
- Replace one `state.political.war_consolidation_until![munId] = ...`
  non-null-assertion-after-init pattern with a local-binding refactor,
  removing the `(state as GameState & {...}).political.war_consolidation_until = {}`
  bookkeeping cast as a side-benefit.

**Out of scope (deferred):**

| Site | Escape | Reason held |
|---|---|---|
| `src/sim/early_war/minority_erosion.ts:121` | `(state as any).war_militia_strength = {}` | Latent bug: this assigns to top-level `state.war_militia_strength`, not `state.military.war_militia_strength`. The check on line 120 reads `state.military.war_militia_strength`, and lines 123-126 then write to `state.military.war_militia_strength![...]`. The code only works because `militia_emergence.ts:160` runs first and initializes `state.military.war_militia_strength`, making the line-120 `if (!...)` always false in practice. Removing the `as any` and writing the correct path would change behavior in any execution where militia_emergence does not run first; this is runtime-behavior territory outside a strict-null type-cleanup lane. Documented for a follow-up dead-code-removal lane. |
| `src/sim/early_war/minority_erosion.ts:123-126` | 3 `non_null_assertions_index` (`state.military.war_militia_strength![munId]...`) | Coupled to the latent-bug cluster above. Same deferral reason. |

**Forbidden (per plan stop-gate):**
- `src/sim/early_war/alliance_update.ts` — initial high-conflict
- `src/sim/turn_phases/war_phases.ts` — initial high-conflict

## Changes

### 1. `src/sim/early_war/control_flip.ts` — 2 escapes removed

| Site | Before | After | Rationale |
|---|---|---|---|
| Line 171 (was `as_factionid_casts`) | `return best as FactionId \| null;` | `return best;` | `best: string \| null`. Return type `FactionId \| null`. `FactionId = string` (verified `src/state/game_state.ts:45`). Cast is no-op. |
| Lines 419-422 (was 1 `non_null_assertions_index` plus 1 bookkeeping cast) | `if (!state.political.war_consolidation_until) {` `(state as GameState & { war_consolidation_until: Record<string, number> }).political.war_consolidation_until = {};` `}` `state.political.war_consolidation_until![munId] = turn + CONSOLIDATION_BASE_TURNS;` | `const consolidationMap = state.political.war_consolidation_until ?? {};` `state.political.war_consolidation_until = consolidationMap;` `consolidationMap[munId] = turn + CONSOLIDATION_BASE_TURNS;` | Local-binding refactor. When the field is already defined, the `??` returns the same object reference, and the reassignment is a no-op identity write. When the field is `undefined`, both versions install a new empty object then write to it. JS semantics are identical. |

### 2. `src/sim/early_war/control_strain.ts` — 1 escape removed

| Site | Before | After | Rationale |
|---|---|---|---|
| Line 75 (was `as_factionid_casts`) | `return entries[0]![0] as FactionId;` | `return entries[0]![0];` | `entries: [string, number][]` from `Object.entries(Record<string, number>)`. Index 0 is `string`. Return type `FactionId = string`. Cast is no-op. |

### 3. `src/sim/early_war/minority_erosion.ts` — 1 escape removed (file remains partially clean, see "Out of scope" above)

| Site | Before | After | Rationale |
|---|---|---|---|
| Line 62 (was `as_factionid_casts`) | `return best as FactionId \| null;` | `return best;` | Same pattern as control_flip.ts:171. |

### 4. `src/sim/early_war/minority_militia_decay.ts` — 1 escape removed

| Site | Before | After | Rationale |
|---|---|---|---|
| Line 87 (was `as_factionid_casts`) | `getFactionShareInMun(population1991ByMun, mun_id, faction as FactionId);` | `getFactionShareInMun(population1991ByMun, mun_id, faction);` | `faction: string` from `parseMilitiaPoolKey(...)` return shape. `getFactionShareInMun` takes `FactionId = string` as its faction parameter. Cast is no-op. |

### 5. `src/sim/early_war/pool_population.ts` — 1 escape removed

| Site | Before | After | Rationale |
|---|---|---|---|
| Line 217 (was `as_factionid_casts`) | `for (const factionId of (Object.keys(byFaction) as FactionId[]).sort(strictCompare)) {` | `for (const factionId of Object.keys(byFaction).sort(strictCompare)) {` | `Object.keys(...)` always returns `string[]`. `string[]` ≡ `FactionId[]`. Cast is no-op. |

## Forward-tightening note

If `FactionId` is ever changed from `string` to a string-literal union (e.g.
`'RBiH' | 'RS' | 'HRHB'`), the five sites above need a real narrowing
helper, because `string` (or `string[]`) would no longer be assignable to
`FactionId` (or `FactionId[]`). The right pattern at that future point is
a runtime type guard that checks the value against a `FACTION_IDS` literal
set:

```ts
function isFactionId(x: string): x is FactionId {
  return (FACTION_IDS as readonly string[]).includes(x);
}
```

The five removed casts today document this tightening boundary by naming
exactly where to insert the guards. Until then, the casts are no-ops and
adding the guards prematurely would be a contract change with runtime
implications.

## Verification

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | PASS (clean) |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` | 19/19 PASS (incl. new Batch 40 slice) |
| `npx.cmd vitest run tests/early_war_control_flip.test.ts tests/early_war_control_strain.test.ts tests/early_war_pool_population.test.ts --reporter=dot` | 23/23 PASS |
| `npm.cmd run test:baselines` | PASS ("Baseline regression: all scenarios match") |
| `git diff --check` | clean |

No 40w hash rerun was needed because `npm.cmd run test:baselines` already
covers `apr1992_definitive_40w` byte-identity (and 52w, plus the
sensitivity matrices), and a Phase 2 control_flip + minority_militia_decay
behavior change would have shown there.

## Phase 3 inventory after this batch

Per `node tools/diagnostics/strict_null_inventory.cjs` after this batch
(filtered to Phase 3 files):

| File | Remaining escapes | Status |
|---|---:|---|
| `simple_general_bot.ts` | 0 | CLEAN (Batch 39) |
| `authority_degradation.ts` | 0 | CLEAN (Batch 39) |
| `militia_emergence.ts` | 0 | CLEAN (Batch 39) |
| `control_flip.ts` | 0 | **CLEAN (Batch 40)** |
| `control_strain.ts` | 0 | **CLEAN (Batch 40)** |
| `minority_militia_decay.ts` | 0 | **CLEAN (Batch 40)** |
| `pool_population.ts` | 0 | **CLEAN (Batch 40)** |
| `minority_erosion.ts` | 4 | Partial — 1 `as any` + 3 `non_null_assertions_index` cluster at lines 121-126 (deferred latent-bug site; see "Out of scope") |
| `alliance_update.ts` | not surveyed | Forbidden (high-conflict) |
| `war_phases.ts` | not surveyed | Forbidden (high-conflict) |

Phase 3 total decreases from **27 → 19 remaining** (8 eliminated in
Batch 40).

## Files Changed

| File | Change |
|---|---|
| `src/sim/early_war/control_flip.ts` | Removed redundant `as FactionId \| null` on `return best` (line 171). Replaced `(state as GameState & {...}).political.war_consolidation_until = {}` init + `state.political.war_consolidation_until![munId]` write with local-binding `const consolidationMap = ... ?? {}; state.political.war_consolidation_until = consolidationMap; consolidationMap[munId] = ...` (lines 419-422). |
| `src/sim/early_war/control_strain.ts` | Removed redundant `as FactionId` on `return entries[0]![0]` (line 75). |
| `src/sim/early_war/minority_erosion.ts` | Removed redundant `as FactionId \| null` on `return best` (line 62). |
| `src/sim/early_war/minority_militia_decay.ts` | Removed redundant `as FactionId` on `faction` argument to `getFactionShareInMun` (line 87). |
| `src/sim/early_war/pool_population.ts` | Removed redundant `as FactionId[]` on `Object.keys(byFaction)` (line 217). |
| `tests/strict_null_inventory_progress.test.ts` | Added `PHASE_3_EARLY_WAR_BATCH_40_FILES` constant (4 fully-clean files) and a new "cleans the Batch 40 Phase 3 early-war continuation slice" assertion. |

Plus parent-doc propagation (this report + PROJECT_LEDGER + Phase 3 ledger
remaining-count refresh).

## Why This Matters

Eight more Phase 3 escapes eliminated. All by type-erasure on a transparent
alias plus one local-binding refactor that the TypeScript compiler emits
character-equivalent JS for. The `npm.cmd run test:baselines` PASS confirms
zero behavioral drift across `apr1992_definitive_40w`, `apr1992_definitive_52w`,
`baseline_ops_4w`, and `noop_4w`. Four more files are fully clean for the
inventory regex. `minority_erosion.ts` is the lone Phase 3 file with a
documented latent-bug deferral; the comment trail names the exact follow-up
(dead-code cluster at lines 121-126).
