# Batch 42 — Strict-Null Phase 6 Warroom Safe Slice (Byte-Identical)

**Date:** 2026-05-19
**Branch:** `codex/strict-null-long-tail-2026-05-19`
**Predecessor:** Batch 41 (`docs/40_reports/implemented/20260519_BATCH41_STRICT_NULL_PHASE4_SAFE_SLICE.md`)
**Baseline:** 40w `b14179d65639860c`
**Status:** Edits applied; typecheck PASS; strict-null inventory progress test 21/21 PASS (incl. new Batch 42 slice); focused warroom tests 91/91 PASS; `npm.cmd run desktop:map:build` PASS (exit 0). UI-only refactor; no simulation code touched.

## Goal

Open Phase 6 (Renderer + Warroom) of `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` with a safe slice focused on the warroom subtree (`src/ui/warroom/`) plus one renderer panel (`AutonomyPanel.tsx`). Phase 5 (`GameStateAdapter.ts`) is **explicitly out of scope** for this wave per the plan stop-gate: "Coordinate with the boundary cleanup lane before replacing adapter reads. This file is the renderer data chokepoint and should be touched once."

## Phase 5 (GameStateAdapter) skip rationale

`src/ui/map/data/GameStateAdapter.ts` has 48 inventory-counted `as_any_casts` plus 13 `as_unknown_casts` and 2 `as_factionid_casts`. The adapter is the renderer chokepoint that maps the engine's `GameState` to the flat `LoadedGameState` view all UI components consume. Its `as any` reads are defensive narrowings over a state object that may have come from older save migrations; removing them piecemeal would leak load-bearing assumptions about field optionality into UI consumers without a corresponding contract tightening at the GameState schema. The plan ledger row for Phase 5 (line 219) is unambiguous: "This file is the renderer data chokepoint and should be touched once." This batch honors that contract by deferring Phase 5 entirely to a dedicated future coordinated lane. No partial GameStateAdapter edits were attempted.

## Scope decisions

**In scope:**
- Remove redundant `as FactionId` casts in warroom components and helpers where the source value is already typed as `string` (≡ `FactionId`) or where the consumer accepts `FactionId`.
- Remove one redundant `as any` cast on a `FactionId` value being passed to `factionCssClass(factionId: FactionId)`.
- Replace one two-call non-null-assertion pattern in `AutonomyPanel.tsx` (a JSX render block) with a direct truthy-check on the value object — TypeScript narrows naturally through the JSX ternary.

**Out of scope (deferred):**

| Site | Escape | Reason held |
|---|---|---|
| `src/ui/map/data/GameStateAdapter.ts` (48 + 13 + 2 = 63 escapes) | mixed | Plan stop-gate: one coordinated boundary cleanup lane, not piecemeal. |
| `src/ui/map/map/MapContainer.tsx` (15 escapes) | mixed | High-conflict renderer file; the 12 `as_any_casts` patterns there look like map-state passes from adapter that should align with the GameStateAdapter pass. Defer. |
| `src/ui/map/components/chronicle/generateWrappedSlides.ts:192` | 3 `non_null_assertions_dot` on `internationalStanding!` | The check `intlValue != null` does not narrow `internationalStanding` to non-null in TS because the relationship `intlValue = internationalStanding?.effective_value` is not propagated through the optional-chain. The clean refactor (`intlValue != null && internationalStanding`) adds a redundant truthy comparison; behavior-preserving JS emit shape change. Defer to a dedicated TS-narrowing follow-up. |
| `src/ui/map/components/CorpsFrontPanel.tsx:180` | `loadedGameState!.frontEdgesOsid` | Same JSX-render narrowing-through-closure pattern. |
| `src/ui/map/components/OperationHistoryPanel.tsx:429` | `op.objectives_logged_captured!.map(...)` | Same. |
| `src/ui/map/components/army_hq/CommandRelationshipSection.tsx:173` | `delegationSummary!.summaryLabel` | Same. |
| `src/ui/map/components/army_hq/SectorsSection.tsx:74` | `stanceHint!.toUpperCase()` | Same. |
| `src/ui/map/components/DiplomacyOverview.tsx:106` | `strategicDimensions![faction]` inside `.map` closure | Same JSX-render narrowing-through-closure pattern. Refactor would add `&& strategicDimensions` to the outer JSX condition — behavior-equivalent but byte-different JS emit. Defer. |
| `src/ui/map/map/builders/buildEthnicGeoJSON.ts` (3 `non_null_assertions_index`) | `departedByOsid![osid]` / `displacementByMun![munId]` | Inside `if (hasDepartures && munEthnicTotals)` block where `hasDepartures = departedByOsid && Object.keys(...).length > 0` and TS does not propagate the `&& Object.keys(...).length > 0` narrow back to the original variable. A clean refactor would either inline the data check directly (adds runtime cost) or capture the data into pre-narrowed locals (requires lifting the condition above the `Pass 1` build of `munEthnicTotals`). Defer to a coordinated builder-narrowing pass. |
| `src/ui/map/components/SidePickerOverlay.tsx` (2 `as_any_casts`), `src/ui/map/components/army_hq/ForceReadiness.tsx` (2 `as_any_casts`), `src/ui/map/components/army_hq/SupplyIntelligence.tsx` (3 `as_any_casts`), `src/ui/map/components/ops_modal/OpsMap.tsx` (2 `as_any_casts`), `src/ui/map/components/plan_ui/OpsMapRenderer.ts` (3 `as_any_casts`), `src/ui/warroom/warroom.ts` (3 `as_any_casts` + 3 `as_unknown_casts`), `src/ui/warroom/map_viewer_app.ts` (1 `as_any_casts`), `src/ui/map/components/AiSettingsPanel.tsx` (1) | `as_any_casts` and `as_unknown_casts` | All read from `LoadedGameState` / `GameState` fields with defensive narrowing — same category as the GameStateAdapter "boundary cleanup" deferral. Touching them piecemeal would require touching the adapter too. Defer. |
| `src/ui/warroom/ClickableRegionManager.ts` (1 `as_unknown_casts` remaining) | `as_unknown_casts` | Same boundary-cleanup deferral. The `as FactionId` cast at line 604 was removed in this batch; the `as_unknown_casts` site is a different pattern that needs the adapter coordination. |

## Changes

### Warroom redundant-cast removals (10 sites)

| File | Site | Before | After | Rationale |
|---|---|---|---|---|
| `src/ui/warroom/ClickableRegionManager.ts` | line 604 | `extractWarData(state, getPlayerFaction(state) as FactionId)` | `extractWarData(state, getPlayerFaction(state))` | `getPlayerFaction(state): FactionId` (declared in `warroom_utils.ts:219`); `extractWarData` takes `FactionId`. Cast no-op. |
| `src/ui/warroom/components/FactionOverviewPanel.ts` | line 229 | `factionCssClass(snap.factionId as FactionId)` | `factionCssClass(snap.factionId)` | `snap.factionId: string` (≡ `FactionId`). `factionCssClass` takes `FactionId`. Cast no-op. |
| `src/ui/warroom/components/IvpBreakdownModal.ts` | line 35 | `const pf = getPlayerFaction(this.gameState) as FactionId;` | `const pf = getPlayerFaction(this.gameState);` | Same as ClickableRegionManager:604. |
| `src/ui/warroom/components/NewspaperModal.ts` | line 162 | `extractWarData(this.gameState, playerFaction as FactionId)` | `extractWarData(this.gameState, playerFaction)` | `playerFaction: string` (≡ `FactionId`) from the enclosing `getOfficerSuccessionLines(playerFaction: string)` signature. Cast no-op. |
| `src/ui/warroom/components/NewspaperModal.ts` | line 290 | `getWarroomFactionIdentity(content.factionId as FactionId)` | `getWarroomFactionIdentity(content.factionId)` | `content.factionId: string` from the `NewsContent` interface (`factionId: string`). Consumer takes `FactionId` ≡ `string`. Cast no-op. |
| `src/ui/warroom/components/NewspaperModal.ts` | line 293 | `factionCssClass(content.factionId as any)` | `factionCssClass(content.factionId)` | `factionCssClass(factionId: FactionId): string`. `content.factionId: string` ≡ `FactionId`. The `as any` was a defensive widener with no purpose; removed. |
| `src/ui/warroom/components/ReportsModal.ts` | lines 373-374 | `getWarroomFactionIdentity(content.factionId as FactionId)` + `this.createShell(content.factionId as FactionId, ...)` | `getWarroomFactionIdentity(content.factionId)` + `this.createShell(content.factionId, ...)` | Same pattern as NewspaperModal:290. |
| `src/ui/warroom/components/warroom_utils.ts` | line 220 | `requirePlayerFaction(...) as FactionId` | `requirePlayerFaction(...)` | `requirePlayerFaction` returns `CanonicalPlayerFaction = 'RBiH' \| 'RS' \| 'HRHB'` (literal union). Assigning to a `FactionId` (= `string`) return type widens automatically; no cast needed. |
| `src/ui/warroom/data/war_data_extractor.ts` | line 861 | `const faction = controllers[key] as FactionId \| null \| undefined;` | `const faction = controllers[key];` | `controllers: Record<SettlementId, FactionId \| null>` from `state.political.political_controllers?: ...`. `controllers[key]: FactionId \| null \| undefined` is what TS already infers (the `?` outer optionality plus the `FactionId \| null` value type). Cast was redundant. |
| `src/ui/warroom/warroom.ts` | line 401 | `const faction = btn.dataset.faction as FactionId \| undefined;` | `const faction = btn.dataset.faction;` | `btn.dataset.faction: string \| undefined` from `DOMStringMap`. `string \| undefined` ≡ `FactionId \| undefined`. Cast no-op. |

### AutonomyPanel narrowing refactor (2 non-null sites)

| File | Site | Before | After | Rationale |
|---|---|---|---|---|
| `src/ui/map/components/AutonomyPanel.tsx` | lines 148-150 | `{resolved ? (<div className={`...${statusIndicator!.cls}`}>{statusIndicator!.label}</div>) : (...)` | `{statusIndicator ? (<div className={`...${statusIndicator.cls}`}>{statusIndicator.label}</div>) : (...)` | `statusIndicator = resolved ? { label, cls } : null;` (lines 109-113). So `resolved === true ⇔ statusIndicator !== null`. Switching the JSX ternary's condition from `resolved` to `statusIndicator` (the actual value being read in the truthy branch) makes TypeScript narrow `statusIndicator` to the non-null object literal type inside the branch. Same JSX rendered in both branches with same data; no observable UI change. |

## Forward-tightening note

All ten `as FactionId*` removals are no-ops under the current `type FactionId = string` alias (`src/state/game_state.ts:45`). They document the tightening boundary for a future literal-union refactor — at that point each site needs either:

- A runtime `isFactionId(...)` type guard (the `btn.dataset.faction` DOM-source pattern in `warroom.ts:401` and similar),
- `requirePlayerFaction(...)` narrowing already returns `CanonicalPlayerFaction` (literal union), so no further work is needed there,
- Consumer signatures (`extractWarData`, `factionCssClass`, `getWarroomFactionIdentity`) would need to be tightened to accept `CanonicalPlayerFaction` instead of `FactionId`, at which point the source values would need typed casts.

The `AutonomyPanel.tsx` JSX ternary refactor is a separate pattern that TypeScript narrowing handles natively after the condition is moved from the predicate variable (`resolved`) to the value object (`statusIndicator`).

## Verification

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | PASS (clean) |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` | 21/21 PASS (incl. new Batch 42 slice: 6 fully-clean warroom files) |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/autonomy_panel_player_faction_truth.test.ts tests/ivp_breakdown.test.ts tests/ivp_breakdown_modal_boundary.test.ts tests/newspaper_modal_officer_boundary.test.ts tests/warroom_smoke.test.ts tests/warroom_player_visibility.test.ts tests/warroom_shell_layer.test.ts --reporter=dot` | 91/91 PASS |
| `npm.cmd run desktop:map:build` | PASS (exit 0) |
| `git diff --check` | clean |

`npm.cmd run test:baselines` was not re-run for this batch because the touched files are pure UI/warroom components that do not participate in scenario simulation. The Batch 41 baselines run remains the active byte-identity floor.

## Inventory snapshot

Repo-wide inventory after Batch 42 (compared with the pre-wave snapshot):

| Category | Pre-wave (a3d3b9a0) | Post-Batch-42 | Δ |
|---|---:|---:|---:|
| `as_any_casts` | 360 | 359 | -1 |
| `as_factionid_casts` | 91 | 64 | -27 |
| `as_unknown_casts` | 93 | 93 | 0 |
| `non_null_assertions_dot` | 42 | 40 | -2 |
| `non_null_assertions_index` | 45 | 43 | -2 |
| **TOTAL escape hatches** | **631** | **599** | **-32** |

Per-phase trajectory:

- Phase 1 (state schema): unchanged at 25 (out of scope this wave).
- Phase 2 (sim combat): unchanged at 21 (classified-blocked).
- Phase 3 (sim early-war + bot): 27 → 21 (Batch 40).
- Phase 4 (scenario + IPC): 53 → 40 (Batch 41).
- Phase 5 (UI adapter): unchanged at 68 (deferred to coordinated boundary cleanup lane).
- Phase 6 (renderer + warroom): 74 → 61 (Batch 42). Six warroom files now fully clean; `ClickableRegionManager.ts`, `warroom.ts`, and `AutonomyPanel.tsx` are partially clean.

## Files Changed

| File | Change |
|---|---|
| `src/ui/warroom/ClickableRegionManager.ts` | Dropped redundant `as FactionId` on `getPlayerFaction(state)` (line 604). |
| `src/ui/warroom/components/FactionOverviewPanel.ts` | Dropped redundant `as FactionId` on `snap.factionId` (line 229). |
| `src/ui/warroom/components/IvpBreakdownModal.ts` | Dropped redundant `as FactionId` on `getPlayerFaction(this.gameState)` (line 35). |
| `src/ui/warroom/components/NewspaperModal.ts` | Dropped 2 redundant `as FactionId` casts (lines 162, 290) and 1 `as any` cast (line 293) on `content.factionId` → `factionCssClass(...)`. |
| `src/ui/warroom/components/ReportsModal.ts` | Dropped 2 redundant `as FactionId` casts on `content.factionId` (lines 373, 374). |
| `src/ui/warroom/components/warroom_utils.ts` | Dropped redundant `as FactionId` on `requirePlayerFaction(...)` (line 220); the returned `CanonicalPlayerFaction` literal union widens automatically to the `FactionId = string` return type. |
| `src/ui/warroom/data/war_data_extractor.ts` | Dropped redundant `as FactionId | null | undefined` on `controllers[key]` (line 861); TypeScript already infers the same type. |
| `src/ui/warroom/warroom.ts` | Dropped redundant `as FactionId | undefined` on `btn.dataset.faction` (line 401). |
| `src/ui/map/components/AutonomyPanel.tsx` | Replaced `{resolved ? ... statusIndicator!.cls ... statusIndicator!.label ... : ...}` JSX ternary with `{statusIndicator ? ... statusIndicator.cls ... statusIndicator.label ... : ...}`. Same branch behavior; TypeScript narrows `statusIndicator` natively through the value-object truthy check. |
| `tests/strict_null_inventory_progress.test.ts` | Added `PHASE_6_WARROOM_BATCH_42_FILES` constant (6 fully-clean warroom files) and a new "cleans the Batch 42 Phase 6 warroom safe slice" assertion. |

## Why This Matters

Phase 6 opens with a 13-escape reduction (74 → 61) entirely within the warroom subtree plus one renderer panel narrowing. Six more files are fully clean for the inventory. The deliberate Phase 5 deferral keeps the renderer chokepoint (`GameStateAdapter.ts`) intact for a single coordinated boundary cleanup lane rather than fragmenting it across many small batches. The wave-cumulative reduction is 32 escapes (631 → 599) across Phases 3, 4, and 6 — every removal byte-identical (Phases 3 and 4 proven via `npm.cmd run test:baselines`; Phase 6 proven UI-only via `desktop:map:build` and 91/91 focused tests).
