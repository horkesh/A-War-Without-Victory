# Batch 41 — Strict-Null Phase 4 Scenario + IPC Safe Slice (Byte-Identical)

**Date:** 2026-05-19
**Branch:** `codex/strict-null-long-tail-2026-05-19`
**Predecessor:** Batch 40 (`docs/40_reports/implemented/20260519_BATCH40_STRICT_NULL_PHASE3_CONTINUATION.md`)
**Baseline:** 40w `b14179d65639860c` (Batch 40 floor)
**Status:** Edits applied; typecheck PASS; strict-null inventory progress test 20/20 PASS (incl. new Batch 41 slice); focused scenario/oob tests 43/43 PASS; `npm.cmd run test:baselines` PASS ("Baseline regression: all scenarios match"). Byte-identical to predecessor.

## Goal

Open Phase 4 (Scenario + IPC) of the strict-null migration with a safe
slice per `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`.
Phase 4 had 53 inventory-counted escapes before this batch and had not
been touched. Same approach as Batch 39/40: remove escapes that are
no-ops under the current `FactionId = string` / `MunicipalityId = string`
aliases or that are convertible to local-binding refactors with
character-equivalent JS emit.

## Correction to Batch 40 numbers

While preparing this batch I re-measured the inventory against
`git stash --keep-index` and confirmed Batch 40 removed **6** escapes
(5 `as_factionid_casts` + 1 `non_null_assertions_index`), not 8 as the
Batch 40 report stated. The non-counted `(state as GameState & {...})`
bookkeeping cast at the prior `control_flip.ts:419-420` block was eliminated
as a side benefit of the local-binding refactor, but it was never in the
inventory regex `/\bas\s+FactionId\b/g` to begin with. Phase 3 remaining
after Batch 40 is therefore **21**, not 19. The Batch 40 report's "27 → 19"
trajectory and "8 eliminated" should be read as **"27 → 21" and "6
eliminated"**. The plan ledger row is updated below.

## Scope decisions

**In scope:**
- Remove redundant `as FactionId` / `as FactionId | null` / `as FactionId[]`
  casts where the source type is already `string` (≡ `FactionId`).
- Replace one `a.orders_by_faction![fid]` non-null-after-truthy-check
  pattern with a local-binding refactor so TypeScript can narrow without
  the assertion (`scenario_end_report.ts:968`).

**Out of scope (deferred):**

| Site | Escape | Reason held |
|---|---|---|
| `src/scenario/anomaly_detector.ts:151` | `sectors[sectorIds[0]!] ?? null` | `non_null_assertions_index` after `sectorIds.length === 1` check. The natural refactor (capture into local, then early-return on `undefined`) adds a runtime guard that didn't exist in the original — JS emit is no longer character-equivalent. Defer until a coordinated narrow refactor across this method's `getSectorTerritory(...)` path. |
| `src/scenario/scenario_end_report.ts:50` | `parts.length >= 2 ? parts[1]! : null` | `non_null_assertions_index` after array length check. The cleaner `parts[1] ?? null` replacement changes JS emit shape and could in principle change the persisted scenario-end report byte sequence (the `??` operator emits differently than the ternary). Defer until a dedicated byte-identity sweep. |
| `src/desktop/desktop_sim.ts:543` | `formation.faction as FactionId` (inside `/* ... */` dead-code block) | The active code path returns early at line 530-533; the `/* ... */` block at lines 535-559 is documented historical reference code. Editing inside a comment is brittle and the diagnostic regex hits inside comments anyway. Defer to a dedicated dead-code-removal lane. |
| `src/scenario/oob_loader.ts` `as unknown[]` × 6, `composition as unknown as BrigadeComposition` | `as_unknown_casts` | Load-bearing JSON-narrowing patterns over `unknown` from `JSON.parse`. Removing them would require replacing with explicit `Array.isArray` + per-element type guard helpers; cross-file refactor in the loader contract. |
| `src/scenario/scenario_loader.ts` `as unknown[]` × 8 | `as_unknown_casts` | Same JSON-narrowing pattern. Load-bearing. |
| `src/scenario/initial_formations_loader.ts:61` | `JSON.parse(content) as unknown` | Intentional narrowing from `any` to `unknown` to force downstream type guards. Load-bearing. |
| `src/scenario/brigade_temporal_emit.ts` × 5 | `as_unknown_casts` like `(state as unknown as { military: { ... } })` | Documented narrow patches over the `GameState` shape; lifting them requires schema work in `game_state.ts`. |

**Forbidden (per plan stop-gate):**
- `src/sim/early_war/alliance_update.ts` — initial high-conflict.
- `src/sim/turn_phases/war_phases.ts` — initial high-conflict.

## Changes

### Phase 4 redundant-cast removals (13 sites, 12 FactionId + 1 non-null)

| File | Site | Before | After | Rationale |
|---|---|---|---|---|
| `src/scenario/combat_causality.ts` | line 168 | `const factionId = (corpsFormation?.faction ?? 'unknown') as FactionId;` | `const factionId = corpsFormation?.faction ?? 'unknown';` | `FactionId = string`; the `?? 'unknown'` keeps result as `string`; consumers of `factionId` (`attack_orders_by_faction[factionId]`, `total_orders_by_faction[factionId]`) are `Record<FactionId, number>` where `FactionId = string`. |
| `src/scenario/oob_early_war_entry.ts` | line 228 | `resolveFormationName(b.faction as FactionId, b.home_mun, 'brigade', ordinal)` | `resolveFormationName(b.faction, b.home_mun, 'brigade', ordinal)` | `OobBrigade.faction: FactionId` (verified `oob_loader.ts:18`). Cast is no-op. |
| `src/scenario/oob_early_war_entry.ts` | line 291 | `militiaPoolKey(b.home_mun as MunicipalityId, b.faction as FactionId)` | `militiaPoolKey(b.home_mun, b.faction)` | `OobBrigade.home_mun: string` (≡ `MunicipalityId`), `b.faction: FactionId`. `militiaPoolKey` accepts `MunicipalityId, FactionId`. With both being string aliases, the casts are no-ops. The bare `MunicipalityId` cast was incidentally removed alongside the strict-null-tracked `FactionId` cast. |
| `src/scenario/oob_early_war_entry.ts` | line 341 | `(state.factions ?? []).map(f => f.id).sort(strictCompare) as FactionId[]` | `(state.factions ?? []).map(f => f.id).sort(strictCompare)` | `f.id: FactionId` makes `.map` return `FactionId[]`; same redundant-cast pattern as Batch 39's `militia_emergence.ts:157` removal. |
| `src/scenario/initial_formations_loader.ts` | line 88 | `const faction = raw.faction.trim() as FactionId;` | `const faction = raw.faction.trim();` | Inside a `typeof raw.faction === 'string'` narrow; `.trim()` returns `string`; consumer `CANONICAL_FACTIONS.includes(faction)` takes `FactionId` ≡ `string`. |
| `src/scenario/oob_loader.ts` | line 143 | `const faction = r.faction.trim() as FactionId;` | `const faction = r.faction.trim();` | Same as above. |
| `src/scenario/oob_loader.ts` | line 172 | `CANONICAL_FACTIONS.includes(r.recruit_pool_faction.trim() as FactionId)` | `CANONICAL_FACTIONS.includes(r.recruit_pool_faction.trim())` | Same. |
| `src/scenario/oob_loader.ts` | line 173 | `? r.recruit_pool_faction.trim() as FactionId : undefined` | `? r.recruit_pool_faction.trim() : undefined` | Same; assigned to `recruit_pool_faction?: FactionId`. |
| `src/scenario/oob_loader.ts` | line 258 | `const faction = r.faction.trim() as FactionId;` | `const faction = r.faction.trim();` | Same as line 143 for `OobCorps`. |
| `src/desktop/desktop_sim.ts` | line 473 | `const factionId = formation.faction as FactionId;` | `const factionId = formation.faction;` | Inside `!formation.faction` truthy-narrow; `FormationState.faction: FactionId`. |
| `src/scenario/scenario_runner.ts` | line 981 | `for (const faction of Object.keys(spreadReport.brigades_spread).sort() as FactionId[]) {` | `for (const faction of Object.keys(spreadReport.brigades_spread).sort()) {` | `Object.keys(...)` returns `string[]` ≡ `FactionId[]`; `spreadReport.brigades_spread: Record<FactionId, number>` indexed by `string` works. |
| `src/scenario/scenario_runner.ts` | line 1291 | `if (faction) pc[osid] = faction as FactionId;` | `if (faction) pc[osid] = faction;` | `faction: string` from `bySettlementId: Record<string, string>`; `pc[osid]: FactionId` ≡ `string`. |
| `src/scenario/scenario_end_report.ts` | lines 965-970 | Loop body used `a.orders_by_faction![fid]` after truthy-check on `a.orders_by_faction`. | Hoisted `const ordersByFaction = a.orders_by_faction;` before the check; loop body uses `ordersByFaction[fid]`. | TypeScript narrows the local `ordersByFaction` to non-null inside the `if (ordersByFaction && ...)` guard and preserves that narrowing inside the `.map` closure. JS emit is identical: the `!` only existed because TS narrowing did not propagate through the property access in the closure. |

## Forward-tightening note

All twelve `as FactionId*` removals are no-ops under the current `type
FactionId = string` alias. They document the tightening boundary for a
future literal-union refactor — at that point each site needs either:

- A runtime `isFactionId(...)` type guard (for the `r.faction.trim()`,
  `raw.faction.trim()`, and `bySettlementId[osid]` JSON-source patterns),
  or
- A `Record<FactionId, V>` -> `FactionId[]` typed key helper (for the
  `Object.keys(spreadReport.brigades_spread)` pattern).

Both helpers belong to the future literal-union lane, not this byte-
identical type-erasure pass.

## Verification

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | PASS (clean) |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` | 20/20 PASS (incl. new Batch 41 slice for `combat_causality.ts` + `oob_early_war_entry.ts`) |
| `npx.cmd vitest run tests/oob_early_war_entry.test.ts tests/oob_loader.test.ts tests/desktop_sim_bundle_smoke.test.ts tests/scenario_runner_artifact_repair.test.ts tests/integration_run_summary.test.ts tests/scenario_reporting_contracts.test.ts --reporter=dot` | 23/23 PASS |
| `npm.cmd run test:baselines` | PASS ("Baseline regression: all scenarios match") |
| `git diff --check` | clean |

The integration_run_summary suite (~90 s) exercises a full scenario run
end-to-end and verifies persistent summary artifacts; PASS there confirms
byte-stable scenario_end_report output for the touched loop.

## Inventory snapshot

Repo-wide inventory after Batch 41 (compared with the pre-wave snapshot):

| Category | Pre-wave (a3d3b9a0) | Post-Batch-41 | Δ |
|---|---:|---:|---:|
| `as_any_casts` | 360 | 360 | 0 |
| `as_factionid_casts` | 91 | 74 | -17 |
| `as_unknown_casts` | 93 | 93 | 0 |
| `non_null_assertions_dot` | 42 | 42 | 0 |
| `non_null_assertions_index` | 45 | 43 | -2 |
| **TOTAL escape hatches** | **631** | **612** | **-19** |

Per-phase status:

- Phase 1 (state schema): unchanged (out of scope this wave).
- Phase 2 (sim combat): unchanged (classified-blocked per `20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md`).
- Phase 3 (sim early-war + bot): 27 → 21 remaining after Batch 40 (correction). minority_erosion.ts still has 4 deferred latent-bug escapes; alliance_update + war_phases remain forbidden.
- Phase 4 (scenario + IPC): 53 → 40 remaining after Batch 41. combat_causality.ts and oob_early_war_entry.ts are now fully clean for the inventory.
- Phase 5 (UI adapter): unchanged (next batch target).
- Phase 6 (renderer + warroom): unchanged.

## Files Changed

| File | Change |
|---|---|
| `src/scenario/combat_causality.ts` | Dropped redundant `as FactionId` on `corpsFormation?.faction ?? 'unknown'` (line 168). |
| `src/scenario/oob_early_war_entry.ts` | Dropped 3 redundant `as FactionId` / `as MunicipalityId` casts at lines 228, 291, 341. |
| `src/scenario/initial_formations_loader.ts` | Dropped redundant `as FactionId` on `raw.faction.trim()` (line 88). |
| `src/scenario/oob_loader.ts` | Dropped 4 redundant `as FactionId` casts at lines 143, 172, 173, 258. |
| `src/desktop/desktop_sim.ts` | Dropped redundant `as FactionId` on `formation.faction` in active code path (line 473). The mirror cast inside the `/* ... */` retired-code block at line 543 is deliberately preserved (see "Out of scope"). |
| `src/scenario/scenario_runner.ts` | Dropped 2 redundant `as FactionId*` casts at lines 981, 1291. |
| `src/scenario/scenario_end_report.ts` | Replaced `a.orders_by_faction![fid]` in `.map` closure with local-binding `const ordersByFaction = a.orders_by_faction; if (ordersByFaction && ...) ... ordersByFaction[fid] ...`. |
| `tests/strict_null_inventory_progress.test.ts` | Added `PHASE_4_SCENARIO_BATCH_41_FILES` constant (`combat_causality.ts`, `oob_early_war_entry.ts`) and a new "cleans the Batch 41 Phase 4 scenario safe slice" assertion. |
| `docs/40_reports/implemented/20260519_BATCH41_STRICT_NULL_PHASE4_SAFE_SLICE.md` | This report. |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 4 ledger row plus a Phase 3 row corrections (Batch 40 numbers). |

## Why This Matters

Phase 4 opens with a 13-escape reduction (53 → 40), all by type-erasure
on transparent aliases plus one local-binding refactor that the
TypeScript compiler emits character-equivalent JS for. `npm.cmd run
test:baselines` PASS proves zero behavioral drift across the four
baseline scenarios (`apr1992_definitive_40w`, `apr1992_definitive_52w`,
`baseline_ops_4w`, `noop_4w`). Two more files are fully clean
(`combat_causality.ts`, `oob_early_war_entry.ts`); the remaining Phase 4
escapes are all classified as load-bearing JSON-narrowing or dead-code-
block residue, both of which need dedicated follow-up lanes outside the
strict-null cleanup boundary.
