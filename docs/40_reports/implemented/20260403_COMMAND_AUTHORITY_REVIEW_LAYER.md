# Command Authority Review Layer — Implementation Report

**Date:** 2026-04-03
**Status:** IMPLEMENTED
**Roadmap slot:** v0.8.0 (second CA slice — review legibility)
**Governing doc:** `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`
**Execution plan:** `docs/plans/2026-04-03-delegation-override-command-friction-plan.md`
**Follows:** `docs/40_reports/implemented/20260403_COMMAND_AUTHORITY_VERTICAL_SLICE.md`

---

## What Was Implemented

Added a Command Authority explanation/review layer to the `OperationBriefingModal` — the existing command-review surface for operations. The player now sees WHY they're overriding, WHAT CA will be spent, and WHAT the tradeoff is, before committing to a force-launch.

### 1. DirectInterventionSection component

**File:** `src/ui/map/components/OperationBriefingModal.tsx`

New `DirectInterventionSection` sub-component shown inside the briefing modal when `assessment !== 'launch'` (commander recommends postpone or abort). Contains:

- **Level 3 label** — "Direct Intervention" badge, "Level 3" tag (canonical presidential doctrine terminology)
- **Plain-language explanation** — adapts to commander's recommendation:
  - postpone: "The commander recommends waiting. Forcing launch overrides that judgment."
  - abort: "The commander recommends aborting. Forcing launch overrides that assessment."
- **CA context row** — `Command Authority: 85 → 70 after | Cost: 15 | Recovery: +2/turn`
- **Force-launch button** — amber styling (distinct from the green normal-launch button). Disabled with explanation text when CA < 15.

When `assessment === 'launch'` (commander agrees), the section is absent — overriding is unnecessary and the player uses the standard Launch button.

### 2. `onForceLaunch` prop wired in App.tsx

**File:** `src/ui/map/App.tsx`

Added `handleForceLaunch` to `OperationBriefingModalWrapper` — calls `ipc.stageOperationForceLaunch` (same IPC path as the OperationsSection button). The CA deduction logic stays in `electron-main.cjs` (unchanged). Passed as `onForceLaunch` prop to the modal.

### 3. Tests

**File:** `tests/command_authority.test.ts` — 9 new tests in `review layer logic` suite:

- `shouldShowDirectIntervention` — shows for postpone/abort, hides for launch, hides without callback
- `computeCAContext` — correct remaining/canAfford at various CA levels (85, 100, 10, 15, 0)

All 9 pass. No regressions on the pre-existing 20 unrelated failures (brigade_posture, commander_override, etc. — pre-existing on main).

---

## What Was NOT Implemented (deferred)

- Force-launch from OperationsSection no longer needs to bypass the briefing — but the existing button remains (it still works for ops that haven't been briefed). No change to OperationsSection.
- Morale/competence side effects on force-launch (still future work)
- CA context in other Level 3 surfaces (brigade move, posture, sector assignment)

---

## Design Decision: Which Surface?

The `OperationBriefingModal` was chosen over a new confirmation dialog because it is already the canonical review surface for operations. The player already navigates here to see force ratio, supply, and commander assessment before deciding. Adding the CA layer here avoids a modal-on-modal pattern and keeps all operation decision context in one place.

The `DirectInterventionSection` only appears when it's meaningful — when the commander disagrees. When the commander recommends launch, there is no intervention section; the player just launches normally. This respects the doctrine: Level 3 is an *override*, not a default path.

---

## Verification

- `npx.cmd tsc --noEmit` — clean
- `npm.cmd run test:vitest` — 1888 pass, 20 fail (all pre-existing, zero new failures)
- Vite build from `src/ui/map/` — success (`✓ built in 6.61s`)
- `check_claude_governance.ps1` — OK

---

## Completion Block

```
Canonical owner: OperationBriefingModal.tsx (DirectInterventionSection)
Demoted path: Force-launch with only a button tooltip and toolbar gauge as context
Player-visible truth: When the commander does not recommend launch, the player sees
                      why they're overriding, the exact CA cost, and what will remain
Canonical UI surface: OperationBriefingModal — Direct Intervention section
Done means: DirectInterventionSection visible in briefing when assessment != launch;
            CA current/cost/remaining displayed; force-launch button disabled below 15;
            onForceLaunch wired in App.tsx; 9 new tests pass; tsc clean; build clean
```
