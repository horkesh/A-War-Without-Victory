# Handoff: Command Authority — Post-Override Provenance

## Context

The Command Authority system has two shipped slices:
- `992328de` — CA resource (gauge, deduction, recovery)
- `de42853a` — Pre-override review section in OperationBriefingModal

**What's missing:** once the player has force-launched an operation, the game forgets it happened. Override is "I spent 15 authority" — not "I overruled command here and the game remembers." This slice makes post-override provenance legible.

## Read first

- `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md`
- `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`
- `docs/plans/2026-04-03-delegation-override-command-friction-plan.md`
- `docs/PROJECT_LEDGER.md` (last 80 lines)
- `.claude/napkin.md`
- `.claude/architect_notes.md`

## Inspect at minimum

- `src/sim/combat/operation_aar.ts` — full file (OperationAAR interface + finalizeOperationAAR function, lines 88–650)
- `src/ui/map/components/OperationBriefingModal.tsx` — full file (DirectInterventionSection, rendering logic)
- `src/state/game_state.ts` — CorpsOperation fields around force_launch (line ~320), OperationAAR in state (operation_history field)
- `src/desktop/electron-main.cjs` — force_launch + CA deduction block (lines ~1055–1075)
- `tests/command_authority.test.ts` — existing tests to understand test patterns

## What exists (confirmed by pre-flight read)

**On `CorpsOperation` (`game_state.ts` line 320):**
```typescript
force_launch?: boolean;  // set true by electron-main.cjs when player force-launches
```

**AAR compilation** (`operation_aar.ts` lines 614–648): Constructs `OperationAAR` and pushes to `state.operation_history[]`. The `force_launch` boolean is on the live operation but is NOT currently copied to the AAR.

**OperationAAR interface** (`operation_aar.ts` lines 88–116): No `force_launched` or CA-cost field exists yet.

**force_launch is reset to false** in `sector_offensive.ts` when the operation enters recovery — so by AAR time, the flag may already be cleared. **This means you must capture it before reset.**

**FORCE_LAUNCH_COST = 15** is a constant in both `OperationBriefingModal.tsx` (line 12) and `electron-main.cjs`.

## Mission

### Step 1 — Snapshot force_launch on the operation before it's cleared

`sector_offensive.ts` resets `force_launch` to false when entering recovery. Before that reset, we need to have preserved the provenance.

Add a new permanent field to `CorpsOperation` in `game_state.ts`:
```typescript
/** True if this operation was ever force-launched by the player. Permanent — not cleared on recovery. */
was_force_launched?: boolean;
```

In `electron-main.cjs`, after `op.force_launch = true`, also set:
```typescript
op.was_force_launched = true;
```

### Step 2 — Add provenance fields to OperationAAR

In the `OperationAAR` interface (`operation_aar.ts`), add AFTER `axis_summaries`:
```typescript
/** True if the player force-launched this operation against command recommendation. */
force_launched?: boolean;
/** CA cost paid at time of force-launch. Always 15 when force_launched is true. */
ca_cost_at_launch?: number;
```

In `finalizeOperationAAR` (lines 614–648), in the aar object literal, add:
```typescript
force_launched: operation.was_force_launched ?? false,
ca_cost_at_launch: (operation.was_force_launched) ? 15 : undefined,
```

The constant 15 is acceptable here — there is no per-operation CA cost field. Use the same value as `FORCE_LAUNCH_COST` in electron-main.cjs.

### Step 3 — Show provenance in OperationBriefingModal

In `OperationBriefingModal.tsx`, add a new component `ForceLaunchBadge` that renders when the operation prop has `was_force_launched === true`:

```tsx
/** Shown on operations in execution/recovery that were force-launched. */
function ForceLaunchBadge({ casCost }: { casCost?: number }) {
    return (
        <div style={{ /* amber/orange tint, compact */ }}>
            <span>⚡ Presidential Override — Direct Intervention</span>
            {casCost !== undefined && (
                <span style={{ opacity: 0.7 }}>  Cost: {casCost} CA</span>
            )}
        </div>
    );
}
```

Render it near the top of the modal body (before the assessment section), conditionally:
```tsx
{operation.was_force_launched && (
    <ForceLaunchBadge casCost={15} />
)}
```

Do NOT show it when the player is viewing a pre-launch briefing (planning phase + commander recommends launch). Only show it on operations that are already in execution or recovery and carry the was_force_launched flag.

**Style guidance:** Match the existing amber styling in `DirectInterventionSection`. Keep it compact — one line with an icon and label, with the CA cost as a subdued secondary text. No fake morale/penalty numbers.

### Step 4 — Adapter and type plumbing

The OperationBriefingModal receives operation data through `LoadedGameState`. Verify that `was_force_launched` flows through:
- `game_state.ts`: field on CorpsOperation (Step 1 ✓)
- `GameStateAdapter.ts`: check if ops are serialized/passed to the renderer already, or if the adapter needs updating
- `types.ts`: if there's a renderer-side CorpsOperation type, add `was_force_launched?: boolean`

Follow the existing pattern for `force_launch` — mirror it exactly for `was_force_launched`.

## Constraints

- **Do NOT invent friction penalties, morale hits, or competence debuffs.** None exist in the engine yet. Truthful provenance only.
- **Do NOT redesign the AAR system.** This is two fields on an interface + one display component.
- **Do NOT change the pre-launch review section** (DirectInterventionSection) — it's already accepted.
- Smoke-test triad: `npx.cmd tsc --noEmit`, `npm run test:vitest`, `vite build` from `src/ui/map/`

## Required outputs

1. Code changes as scoped above
2. Focused regression tests (add to `tests/command_authority.test.ts`):
   - `was_force_launched` is set on CorpsOperation when force-launched
   - `force_launched` and `ca_cost_at_launch` are set in OperationAAR when operation had `was_force_launched: true`
   - AAR `force_launched` is false (or absent) for normal non-overridden operations
3. Implementation report: `docs/40_reports/implemented/20260403_COMMAND_AUTHORITY_PROVENANCE.md`
4. `docs/PROJECT_LEDGER.md` entry
5. `docs/PROJECT_LEDGER_KNOWLEDGE.md` entry if a reusable lesson emerged

## Verification

```
npx.cmd tsc --noEmit -p tsconfig.json
npm run test:vitest
cd src/ui/map && node_modules/.bin/vite build (or npm run build from that dir)
powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1
```

For vite build, check `src/ui/map/package.json` for the correct build command.

## Completion block

```
Canonical owner:      src/sim/combat/operation_aar.ts (provenance fields) +
                      src/ui/map/components/OperationBriefingModal.tsx (badge)
Demoted path:         force_launch boolean (cleared on recovery, invisible after)
Player-visible truth: Operations that were force-launched carry a permanent "Presidential Override" badge in the briefing modal
Canonical UI surface: OperationBriefingModal — execution/recovery phase header
Done means:           CorpsOperation.was_force_launched survives recovery; OperationAAR.force_launched propagated; badge visible on executing/recovery ops that were overridden; 3 new tests pass
```
