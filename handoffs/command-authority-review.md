# Handoff: Command Authority legibility in command review

## Context

`992328de` landed the first Command Authority vertical slice:
- `command_authority` field on `MilitaryState` (current/max/spent_this_turn/lifetime_spent)
- +2/turn recovery in war pipeline
- Force-launch costs 15 CA — deducted in `electron-main.cjs`
- `CommandAuthorityGauge` on `PresidentialToolbar` (green/amber/red)
- `[FORCE LAUNCH — 15 AUTH]` button in `OperationsSection.tsx` (Army HQ ops list)

**The gap (architect-identified):** Force-launch is a button that executes immediately. The player sees the cost label and toolbar gauge but has no review moment: no explanation of WHY they're overriding, what they're giving up, or what the tradeoff is. CA is a number, not yet a decision.

**The existing review surface:** `OperationBriefingModal.tsx` — already shows commander assessment badge (launch/postpone/abort), readiness gauges, commander info, and go/no-go decision buttons. This is where operations are reviewed. It does NOT currently have a force-launch option or any CA content.

## Read first (all required)

- `src/ui/map/components/OperationBriefingModal.tsx` — the review surface to extend
- `src/ui/map/components/army_hq/OperationsSection.tsx` — current force-launch button (lines ~460–560)
- `src/ui/map/components/PresidentialToolbar.tsx` — existing CA gauge for reference
- `src/ui/map/data/types.ts` — `LoadedGameState`, `commandAuthority` field
- `src/ui/map/data/GameStateAdapter.ts` — how commandAuthority reaches the renderer
- `src/state/game_state.ts` — `CommandAuthority` interface and `MilitaryState`
- `src/desktop/electron-main.cjs` — `stage-operation-force-launch` handler (deducts CA there)
- `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md` — canonical terminology
- `docs/40_reports/implemented/20260403_COMMAND_AUTHORITY_VERTICAL_SLICE.md` — what was built
- `tests/command_authority.test.ts` — existing tests (10 tests, all pass)
- `docs/PROJECT_LEDGER.md` (last 40 lines)

## Mission

Add one clear explanation/review layer so the player can understand:
1. **Why an override is being proposed** — what the commander's recommendation is, and that forcing launch contradicts it
2. **What Command Authority will be spent** — current, cost, remaining after
3. **What the immediate tradeoff is** — plain language, not jargon

**The surface to use:** `OperationBriefingModal.tsx`. This is already the command-review surface for operations. Add the CA/override content there.

## Scope (one honest vertical slice)

### Change 1: Add `onForceLaunch` to OperationBriefingModal

Add `onForceLaunch?: () => void` to `OperationBriefingModalProps`.

The modal already reads from `useGameStore`. Add `commandAuthority` from `loadedGameState.commandAuthority`.

### Change 2: Direct Intervention section in the modal

When `assessment !== 'launch'` (commander recommends postpone or abort), add a section below the assessment badge:

```
┌─────────────────────────────────────────────────────┐
│ DIRECT INTERVENTION                      Level 3    │
│                                                     │
│ The commander does not recommend launching.         │
│ Forcing launch overrides the command chain.         │
│                                                     │
│ Command Authority: 85 → 70 after this action        │
│                   Cost: 15 | Recovery: +2/turn      │
│                                                     │
│ [ FORCE LAUNCH — OVERRIDE COMMAND CHAIN ]           │
└─────────────────────────────────────────────────────┘
```

When `assessment === 'launch'` (commander recommends launch), the player should just use the normal Launch button. No force-launch section shown — overriding is unnecessary when the commander agrees.

Adjust wording slightly based on assessment:
- postpone: "The commander recommends waiting. Forcing launch overrides that judgment."
- abort: "The commander recommends aborting. Forcing launch overrides that assessment."

**Force-launch button in the Direct Intervention section:**
- Shows `[ FORCE LAUNCH — OVERRIDE COMMAND CHAIN ]`
- Disabled when CA < 15, with explanation: "Insufficient Command Authority (X/15)"
- Styled distinctly — amber/warning tone, not the green of a normal launch

### Change 3: Wire `onForceLaunch` in the rendering parent

Find where `OperationBriefingModal` is rendered (check imports across the UI). Pass an `onForceLaunch` callback that calls the existing IPC handler `ipc.stageOperationForceLaunch`. 

Note: The existing force-launch IPC call is currently in `OperationsSection.tsx` `handleForceLaunch`. The modal's callback should call the same IPC. Do not duplicate the deduction logic — it stays in `electron-main.cjs`. The modal just needs a callback prop that triggers it.

### Change 4: OperationsSection force-launch button (optional but preferred)

The `[FORCE LAUNCH — 15 AUTH]` button in `OperationsSection.tsx` currently executes without review. Consider whether it should:
a) Open the briefing modal first (so the review layer is always shown), or
b) Stay as a direct button but with updated tooltip text pointing to the review layer

Option (a) is better UX but may require more wiring. Option (b) is safer for this slice. Choose whichever keeps the scope honest. If (a), note this explicitly in the implementation report.

### Change 5: Tests

Add to `tests/command_authority.test.ts` or a new focused test file:
- Unit test: CA context values are correct (current=85, cost=15 → remaining=70)
- Unit test: override section only appears when assessment !== 'launch'
- Unit test: force-launch button disabled when CA < 15

These can be pure logic/data tests — no React rendering needed. Test the logic that determines what the modal displays.

## Constraints

- Do NOT redesign the whole command-review system
- Do NOT add a second resource
- Do NOT invent a new modal — use OperationBriefingModal
- No brigade-commander framing
- Terminology must match `PRESIDENTIAL_COMMAND_DOCTRINE.md`:
  - Level 3 = "Direct Intervention" (not "force override", not "tactical control")
  - The resource = "Command Authority" (not "political capital", not "authority points")
  - "Delegation" = routine command chain decisions without player input

## Verification minimum

- `npx.cmd tsc --noEmit -p tsconfig.json` — must be clean
- `npm.cmd run test:vitest` — all tests pass (currently 1204 tests pass)
- `vite build` — build succeeds (use `npm run desktop:map:build`)
- `powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1`

## Required outputs

- Code changes (OperationBriefingModal.tsx, possibly OperationsSection.tsx, possibly parent render location)
- Focused tests
- Implementation report: `docs/40_reports/implemented/20260403_COMMAND_AUTHORITY_REVIEW_LAYER.md`
- Ledger update: `docs/PROJECT_LEDGER.md`
- Knowledge update: `docs/PROJECT_LEDGER_KNOWLEDGE.md` if a reusable pattern emerged
- Update `.claude/napkin.md` only if a genuinely reusable lesson emerged

## Required completion block

```
Canonical owner:
Demoted path:
Player-visible truth:
Canonical UI surface:
Done means:
```

## Shell notes

- Windows, PowerShell. Use `;` not `&&` to chain commands.
- `npx.cmd tsc --noEmit` for typecheck
- `npm.cmd run test:vitest` for tests
- `npm.cmd run desktop:map:build` for vite build
