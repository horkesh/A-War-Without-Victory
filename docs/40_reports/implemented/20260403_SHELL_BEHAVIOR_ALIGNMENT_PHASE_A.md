# Shell Behavior Alignment — Phase A Report

**Date:** 2026-04-03
**Author:** UI/UX Developer (agent)
**Scope:** Audit and fix remaining shell behavior mismatches after presidential play commits

## What Was Audited

Files read and cross-referenced against presidential command doctrine:

- `src/ui/map/components/PresidentialToolbar.tsx` — toolbar affordances
- `src/ui/map/components/army_hq/ArmyHQModal.tsx` — Army HQ modal behavior
- `src/ui/map/App.tsx` — keyboard shortcuts, panel routing, shell handoff
- `src/ui/map/hooks/useKeyboardShortcuts.ts` — global keyboard handler
- `src/ui/map/utils/shellNavigation.ts` — shell navigation helpers
- `src/ui/map/components/OperationsPanel.tsx` — ops panel shell ownership
- `src/ui/warroom/warroom.ts` — warroom shell entry
- `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`

## Mismatches Found

### 1. DUPLICATE AFFORDANCE: Date click AND CHRONICLE button both open Chronicle (FIXED)

**Location:** `PresidentialToolbar.tsx` lines 148-155 (pre-fix)

The date label (`formatTurnLabel`) was a `<button>` with `onClick={() => setChronicleOpen(true)}`. The CHRONICLE button immediately to its left did the same thing. Two adjacent elements opening the same shell violates the "one canonical entrypoint" principle from `UI_OWNERSHIP_MATRIX.md`.

**Impact:** Player confusion — clicking the date opens Chronicle unexpectedly. The CHRONICLE button is the canonical path; the date should just display the current date.

### 2. No remaining keyboard shortcut violations

All shortcuts verified correct:
- `H` — toggles Army HQ (correct: command review shell)
- `S` outside Army HQ — opens WarSummaryModal on tactical map (correct: map-local briefing)
- `S` inside Army HQ — switches to Summary tab (correct: stays in command review)
- `O` — toggles OperationsPanel (correct: map-local field snapshot)
- `C` — toggles Chronicle (correct: reference shell accessible from any shell)
- `X` — toggles Codex (correct: reference shell accessible from any shell)
- `E` — toggles Event Log (correct: tactical map owns event display)
- `Space` — advance turn (correct: Level 1 presidential action)
- `Escape` — level-up navigation (correct: clears selection, then pause menu)

### 3. Shell handoff flows verified correct

- OPS toolbar button → OperationsPanel (not Army HQ) — correct since recent fix
- RECORDS toolbar button → Army HQ Records tab — correct handoff
- SUMMARY toolbar button → WarSummaryModal (map-local) — correct
- Army Crest click → Army HQ Briefing tab — correct
- Army HQ "FIELD" button → close modal, return to tactical map — correct
- Army HQ "WARROOM" button → close modal, focus warroom — correct
- Army HQ Escape with expanded corps → collapse to army overview — correct
- Army HQ Escape at army overview → close, return to tactical map — correct

### 4. No brigade-commander framing found

All labels, tooltips, and docstrings use presidential framing:
- "Visit Army HQ" not "Open command"
- "Return to field observation" not "Back to map"
- "Return to president's desk" not "Go to main menu"
- "Field situation briefing" not "Battle report"

## What Was Fixed

### Fix 1: Demote date-click Chronicle duplicate

**File:** `src/ui/map/components/PresidentialToolbar.tsx`

Changed the date label from an interactive `<button>` to a non-interactive `<span>`. Added tooltip: "Current date — use CHRONICLE to review timeline" to guide users to the canonical path.

**Before:**
```tsx
<button
    onClick={() => useGameStore.getState().setChronicleOpen(true)}
    className="font-mono text-[12px] text-text-primary tracking-wider uppercase hover:text-amber-400 transition-colors cursor-pointer bg-transparent border-none p-0"
>
    {formatTurnLabel(loadedGameState.label)}
</button>
```

**After:**
```tsx
<span
    className="font-mono text-[12px] text-text-primary tracking-wider uppercase"
    title="Current date — use CHRONICLE to review timeline"
>
    {formatTurnLabel(loadedGameState.label)}
</span>
```

## What Was Simplified

- Removed duplicate Chronicle entrypoint (date click) — CHRONICLE button is now the single canonical path from the toolbar
- No temporary parallel entrypoints remain
- No new code added, only removal of an interactive handler

## Playwright Evidence

Test script: `scripts/playwright_shell_navigation_verify.mjs`

8 checks covering:
1. Date label is non-interactive span (Chronicle duplicate removed)
2. CHRONICLE button opens Chronicle overlay
3. H opens Army HQ, Escape returns to tactical map
4. Army HQ tab navigation (BRIEFING/SUMMARY/RECORDS/PERSONNEL)
5. OPS button opens OperationsPanel (not Army HQ)
6. S key opens WarSummaryModal (not Army HQ)
7. C key toggles Chronicle
8. Army HQ FIELD button returns to tactical map

Requires Vite dev server on port 3003 with loaded game state. Run with:
```bash
node scripts/playwright_shell_navigation_verify.mjs
```

## Completion Block

```
Canonical owner: Chronicle → CHRONICLE button on PresidentialToolbar
Demoted path: Date label click (was duplicate Chronicle opener, now non-interactive)
Player-visible truth: Date displays current turn date; CHRONICLE button opens timeline
Canonical UI surface: PresidentialToolbar owns the CHRONICLE entrypoint from tactical map
Done means: Date label is <span> not <button>; only CHRONICLE button opens Chronicle from toolbar
```
