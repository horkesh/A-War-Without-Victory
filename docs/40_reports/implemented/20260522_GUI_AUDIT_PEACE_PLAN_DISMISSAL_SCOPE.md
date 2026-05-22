# GUI Audit Peace Plan Dismissal Scope

**Date:** 2026-05-22  
**Type:** Tactical-map UI modal-state fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit flagged stale stacked peace-plan modal behavior. `App.tsx` tracked dismissal as one global boolean, so dismissing one `pendingPeacePlan` could suppress a later or changed plan while the save remained loaded.

That made the shell unable to distinguish "the president already dismissed this exact offered plan" from "a different peace proposal now needs review."

## Change

- Added `getPeacePlanDismissalKey(...)` and `shouldShowPeacePlanModal(...)` in `src/ui/map/utils/peacePlanDismissal.ts`.
- The dismissal key is scoped to `planId@turnOffered`, preserving same-plan dismissal while allowing later or different plans to surface.
- `App.tsx` now stores `dismissedPeacePlanKey` instead of a global boolean.
- Save-load fingerprint resets and Inbox/Dayton actions still clear dismissal so deliberate review routes reopen the modal.
- Added a focused regression proving a dismissed Vance-Owen turn-40 modal does not suppress a later Contact Group turn-118 modal, plus a static guard against reintroducing the global boolean.

## Verification

- Red run `npx.cmd vitest run tests\ui\peace_plan_dismissal_scope.test.ts --reporter=dot` failed before the patch because `src/ui/map/utils/peacePlanDismissal.js` did not exist and `App.tsx` still used the global boolean.
- `npx.cmd vitest run tests\ui\peace_plan_dismissal_scope.test.ts --reporter=dot` passed 2/2 after the patch.
- `npx.cmd vitest run tests\ui\peace_plan_dismissal_scope.test.ts tests\ui\peace_plan_modal.test.ts tests\ui_adapter_boundary.test.ts tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts --reporter=dot` passed 25/25.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `git diff --check` passed.

## Remaining GUI Audit Queue

This closes the stacked stale peace-modal slice from audit Batch C. The broader 2026-05-22 GUI visual audit remains active for modal palette unification, stale-state resets, Warroom chrome scoping, no-op control feedback, onboarding spotlight/bridge-unavailable feedback, and polish cleanup.
