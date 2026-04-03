# Handoff: Command Authority — Override in Operation History Panel

## Context

The previous provenance slice (`was_force_launched` flag, `OperationAAR.force_launched`, live-op badge) is accepted and committed. The provenance data now exists on completed operations but is invisible in the canonical retrospective surface.

**Canonical retrospective surface:** `OperationHistoryPanel` (Army HQ Records tab → ops subtab). This is where the player reviews ALL completed operations. It currently shows grade, objectives, casualties, equipment, timeline. It does NOT show whether an operation was presidentially overridden.

**Gap:** `force_launched` and `ca_cost_at_launch` are defined on `OperationAAR` (game_state.ts) but are not mapped through the adapter or rendered anywhere in the history panel.

## Read first

- `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md`
- `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`
- `docs/PROJECT_LEDGER.md` (last 80 lines)
- `.claude/napkin.md`
- `.claude/architect_notes.md`

## Inspect at minimum

- `src/ui/map/components/OperationHistoryPanel.tsx` — full file (especially the CompletedOpCard component rendering, both compact and expanded sections)
- `src/ui/map/data/types.ts` — the `operationHistory` array element type (around line 578–611)
- `src/ui/map/data/GameStateAdapter.ts` — `deriveOperationHistory()` function (around lines 1966–2018)
- `src/sim/combat/operation_aar.ts` — `OperationAAR` interface (lines 88–120), confirm `force_launched` and `ca_cost_at_launch` are present
- `tests/command_authority.test.ts` — existing test patterns

## What exists (confirmed)

**On `OperationAAR` interface** (`operation_aar.ts` lines ~116–119):
```typescript
force_launched?: boolean;
ca_cost_at_launch?: number;
```
These are populated in `finalizeOperationAAR` from `op.was_force_launched`.

**Renderer-side `operationHistory` type** (`types.ts` ~lines 578–611): does NOT yet include `force_launched` or `ca_cost_at_launch`.

**`deriveOperationHistory()`** (`GameStateAdapter.ts` ~lines 1966–2018): does NOT yet extract these fields.

**`OperationHistoryPanel.tsx`**: does NOT yet render these fields.

## Mission

### Step 1 — types.ts

Add to the `operationHistory` array element type:
```typescript
force_launched?: boolean;
ca_cost_at_launch?: number;
```

### Step 2 — GameStateAdapter.ts

In `deriveOperationHistory()`, in the mapped object per AAR, add:
```typescript
force_launched: aar.force_launched === true ? true : undefined,
ca_cost_at_launch: typeof aar.ca_cost_at_launch === 'number' ? aar.ca_cost_at_launch : undefined,
```

### Step 3 — OperationHistoryPanel.tsx

**Where to render:** In the CompletedOpCard compact header row — after the recovery reason badge and before or after the grade display. A compact badge is better than hidden-in-expand, because presidential override is campaign-level significance, not a detail.

**What to render:** When `op.force_launched === true`, show a compact badge:
- Label: "Presidential Override" (or "⚡ Override")
- Secondary: "Cost: {ca_cost_at_launch} CA" (subdued)
- Style: amber/orange tint, matching the ForceLaunchBadge in OperationBriefingModal for consistency
- Must be visible in the compact (collapsed) card view — not buried in the expanded section

**Exact styling guidance:** Look at how the recovery reason badge is styled in the existing panel. Mirror that pattern (compact pill/badge, single line). Add the override badge in the same row or immediately adjacent.

Do NOT add it only in the expanded view — the player should be able to scan the history and spot overrides at a glance.

### Step 4 — Tests

Add focused tests to `tests/command_authority.test.ts`:
- `deriveOperationHistory` includes `force_launched: true` when AAR has it
- `deriveOperationHistory` includes `ca_cost_at_launch: 15` when set
- `deriveOperationHistory` does NOT include `force_launched` when AAR has it unset/false

Use the existing test patterns. The adapter may need to be called with a mock game state — follow how other tests mock `LoadedGameState` or `GameStateAdapter`.

If `deriveOperationHistory` is a private method that can't be unit-tested directly, test it via the exposed `adapt()` method on a minimal game state with one completed operation.

## Constraints

- Do NOT redesign the OperationHistoryPanel layout.
- Do NOT add an override badge in the expanded section ONLY — it must be visible in compact view.
- Do NOT invent friction penalties or morale debuffs.
- Match the amber color/style of the existing ForceLaunchBadge in OperationBriefingModal.
- Smoke-test triad: `npx.cmd tsc --noEmit`, `npm run test:vitest`, vite build from `src/ui/map/`

## Required outputs

1. Code changes (3 files: types.ts, GameStateAdapter.ts, OperationHistoryPanel.tsx)
2. Focused regression tests in `tests/command_authority.test.ts`
3. Implementation report: `docs/40_reports/implemented/20260403_COMMAND_AUTHORITY_HISTORY_PANEL.md`
4. `docs/PROJECT_LEDGER.md` entry
5. `docs/PROJECT_LEDGER_KNOWLEDGE.md` entry only if a new reusable lesson emerges (do not duplicate the "permanent shadows" pattern already recorded)

## Verification

```
npx.cmd tsc --noEmit -p tsconfig.json
npm run test:vitest
# vite build — check src/ui/map/package.json for the correct command
powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1
```

## Completion block

```
Canonical owner:      src/ui/map/components/OperationHistoryPanel.tsx
Demoted path:         force_launched/ca_cost_at_launch stuck at AAR layer, invisible to player
Player-visible truth: Completed operations that were presidentially overridden show an amber "Presidential Override" badge in the operation history panel
Canonical UI surface: Army HQ Records → ops subtab → CompletedOpCard compact header
Done means:           force_launched flows through adapter → types → panel; badge visible in compact card view; tests cover the full pipeline; tsc + vitest + vite build clean
```
