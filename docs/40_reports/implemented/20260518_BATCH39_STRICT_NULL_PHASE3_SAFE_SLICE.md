# Batch 39 — Strict-Null Phase 3 Safe Early-War + Bot Slice (Byte-Identical)

**Date:** 2026-05-18
**Baseline:** 40w `b14179d65639860c`
**Status:** Edits applied; typecheck PASS; strict-null inventory progress test 18/18 PASS (incl. new Batch 39 slice); focused early-war tests 18/18 PASS; 40w byte-identity proof n1915 hash `b14179d65639860c` (matches baseline); consistency validator PASS.

## Goal

Open Phase 3 of the strict-null migration with a safe early-war/bot slice per `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`. Allowed first slice: `src/sim/bot/simple_general_bot.ts` plus low-conflict files under `src/sim/early_war/`. Forbidden initial scope: `src/sim/early_war/alliance_update.ts` and `src/sim/turn_phases/war_phases.ts` (higher-conflict). The lane bank's Batch 39 directive: "Remove only local, type-safe escapes where the runtime invariant is already established. Prefer typed helpers and existing schema types over casts. Stop if a cast is preserving unmodeled save-shape uncertainty."

## Changes

Four files. Eight inventory-counted Phase 3 escapes eliminated, all by pure type-erasure or local-binding refactor — TypeScript emits character-equivalent JavaScript.

### 1. `src/sim/bot/simple_general_bot.ts` — Local-const refactor (5 `non_null_assertions_index`)

Hoisted the two empty-record initializers of `BotDecisions` into named `const` locals BEFORE the object literal, then replaced the five `decisions.posture_assignments![...] = ...` / `decisions.formation_assignments![...] = ...` write sites with direct writes to the locals.

```ts
// Before:
const decisions: BotDecisions = {
    posture_assignments: {},
    formation_assignments: {}
};
// ...
decisions.posture_assignments![edgeId] = 'push';
// ...
decisions.formation_assignments![formation.id] = targetEdgeId;

// After:
const postureAssignments: Record<string, 'push' | 'hold' | 'probe'> = {};
const formationAssignments: Record<string, string> = {};
const decisions: BotDecisions = {
    posture_assignments: postureAssignments,
    formation_assignments: formationAssignments
};
// ...
postureAssignments[edgeId] = 'push';
// ...
formationAssignments[formation.id] = targetEdgeId;
```

The `BotDecisions` sub-records and the `postureAssignments` / `formationAssignments` locals share **the same object identity** — they are the same JavaScript object references. Mutations through either name are observed by the other. Runtime semantics are identical; only type-checker handling of the optional `posture_assignments?` / `formation_assignments?` fields differs.

### 2. `src/sim/early_war/authority_degradation.ts:105` — Redundant cast (1 `as_factionid_casts`)

```ts
// Before:
report.changes.push({ faction_id: faction.id as FactionId, ... });
// After:
report.changes.push({ faction_id: faction.id, ... });
```

`faction: FactionState` (from `for (const faction of factions)` where `factions = state.factions ?? []` and `state.factions: FactionState[]`). `FactionState.id: FactionId` (verified `src/state/game_state.ts:961-962`). The cast was a no-op.

### 3. `src/sim/early_war/control_strain.ts:132` — Redundant cast (1 `as_factionid_casts`)

```ts
// Before:
const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare) as FactionId[];
// After:
const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
```

`state.factions: FactionState[]`. `f.id: FactionId` makes `.map((f) => f.id)` return `FactionId[]`. `.sort(strictCompare)` returns `FactionId[]`. The cast was redundant.

### 4. `src/sim/early_war/militia_emergence.ts:157` — Redundant cast (1 `as_factionid_casts`)

Same redundant-cast pattern as #3:

```ts
// Before:
const factionIds: FactionId[] = (state.factions ?? [])
    .map((f) => f.id)
    .slice()
    .sort(strictCompare) as FactionId[];
// After:
const factionIds: FactionId[] = (state.factions ?? [])
    .map((f) => f.id)
    .slice()
    .sort(strictCompare);
```

The explicit type annotation `: FactionId[]` was already enforcing the type; the trailing cast added nothing.

## Deliberately Skipped (Documented as Load-Bearing or Out-of-Scope)

| Site | Escape | Why deferred |
|---|---|---|
| `control_flip.ts:171` | `return best as FactionId | null` | `best: string \| null` from `Object.entries(counts)` key. Removing the cast would require either restructuring the loop to type the counter map with `FactionId` keys (cross-file refactor) or filtering keys against the known FactionId set. Out of safe-scope. |
| `control_flip.ts:422` | `state.political.war_consolidation_until![munId] = ...` | Save-shape state initialization pattern. Lane bank explicitly says "do not touch movement-state/save-shape casts unless a schema default lane exists." |
| `control_strain.ts:75` | `return entries[0]![0] as FactionId` | Same `Object.entries` key-typing issue as `control_flip.ts:171`. Return-type refactor with cross-call-site implications. |
| `minority_erosion.ts:62` | `return best as FactionId | null` | Same `Object.entries` pattern. |
| `minority_erosion.ts:121` | `(state as any).war_militia_strength = {}` | Save-shape state init. Off-limits without a schema default lane. |
| `minority_erosion.ts:123-126` | `state.military.war_militia_strength![munId]...` | Couples to the `as any` save-shape init at 121. |
| `minority_militia_decay.ts:87` | `faction as FactionId` | `faction: string` returned by `parseMilitiaPoolKey` whose return type is `{ mun_id: string; faction: string }` in `src/state/militia_pool_key.ts:20`. Removing the cast would require typing `parseMilitiaPoolKey`'s `faction` field as `FactionId` and validating callers. Cross-file refactor. |
| `pool_population.ts:217` | `(Object.keys(byFaction) as FactionId[]).sort(strictCompare)` | Same `Object.keys`-narrowing pattern. Object.keys always returns `string[]` regardless of input record key type. |

`control_strain.ts` retains its line-75 load-bearing return cast; this batch removed only its other (line-132) redundant cast, so the file is partially clean (was 2 → now 1) and intentionally not added to the fully-clean Batch 39 slice constant.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (clean) |
| `vitest run tests/strict_null_inventory_progress.test.ts` | 18/18 PASS |
| ↪ new Batch 39 slice: simple_general_bot + authority_degradation + militia_emergence total escapes == 0 | PASS |
| ↪ all 17 prior batch slices still at 0 | PASS |
| `vitest run tests/early_war_authority_degradation.test.ts tests/early_war_militia_emergence.test.ts tests/early_war_control_strain.test.ts` | 18/18 PASS |
| 40w byte-identity (n1915, default) vs `b14179d65639860c` | PASS — hash matches |
| `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1915` | PASS |
| ↪ 0 false owners / 0 disconnected sectors / 0 empty contested / 0 below-floor missed legal donors | PASS |
| Scenario-creator-runner-tester verdict | GO |

## Files Changed

| File | Change |
|---|---|
| `src/sim/bot/simple_general_bot.ts` | Hoisted `postureAssignments` and `formationAssignments` locals before `BotDecisions` literal; replaced 5 non-null assertion writes with direct local writes. |
| `src/sim/early_war/authority_degradation.ts` | Dropped redundant `as FactionId` on `faction.id` in report push (line 105). |
| `src/sim/early_war/control_strain.ts` | Dropped redundant `as FactionId[]` on `.map((f) => f.id).sort(strictCompare)` (line 132). |
| `src/sim/early_war/militia_emergence.ts` | Dropped redundant `as FactionId[]` on `.map((f) => f.id).slice().sort(strictCompare)` (line 157). |
| `tests/strict_null_inventory_progress.test.ts` | Added `PHASE_3_EARLY_WAR_BATCH_39_FILES` constant (3 fully-clean files) and a new "cleans the Batch 39 Phase 3 early-war + bot safe slice" assertion. |
| `docs/40_reports/implemented/20260518_BATCH39_STRICT_NULL_PHASE3_SAFE_SLICE.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, strict-null Phase 3 ledger, lane-bank queue).

## Phase 3 Remaining Inventory After This Batch

Pre-Batch-39 Phase 3 total (per `strict_null_inventory_baseline.json` + Phase 3 file list): 35 escapes. After Batch 39: **27 remaining** (8 eliminated). Per-file breakdown of remaining work:

| File | Remaining escapes | Status |
|---|---:|---|
| `simple_general_bot.ts` | 0 | CLEAN (Batch 39) |
| `authority_degradation.ts` | 0 | CLEAN (Batch 39) |
| `militia_emergence.ts` | 0 | CLEAN (Batch 39) |
| `control_strain.ts` | 1 | Partial — 1 load-bearing return cast at line 75 |
| `control_flip.ts` | 2 | Deferred — Object.entries pattern + save-shape init |
| `minority_erosion.ts` | 5 | Deferred — Object.entries pattern + `(state as any)` save-shape |
| `minority_militia_decay.ts` | 1 | Deferred — cross-file return-type refactor (parseMilitiaPoolKey) |
| `pool_population.ts` | 1 | Deferred — Object.keys narrowing pattern |
| `alliance_update.ts` | not surveyed | Forbidden initially (high-conflict) |
| `war_phases.ts` | not surveyed | Forbidden initially (high-conflict) |

Note: the lane bank's quoted Phase 3 total of 35 in the ledger header includes `alliance_update.ts` and `war_phases.ts` survey lines not separately inventoried here.

## Why This Matters

Phase 3 begins. The cleanups are not load-bearing in any sense — they are type-erasure cleanups that the TypeScript compiler emits identical JS for. The byte-identical 40w hash + validator-PASS consistency confirm zero behavioral drift. Three of the eight Phase 3 candidate files are now fully clean, narrowing the remaining Phase 3 work to the four files with `Object.entries`/`Object.keys` narrowing patterns (which need a typed helper or filter refactor) plus the two save-shape state-init patterns (which need a schema-default lane). This batch is the floor of Phase 3 progress; the next pass needs either typed helpers or a schema lane to advance.
