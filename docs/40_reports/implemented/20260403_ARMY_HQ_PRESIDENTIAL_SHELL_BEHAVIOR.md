# Army HQ Presidential Shell Behavior Alignment

**Date:** 2026-04-03
**Wave:** Presidential command doctrine — behavior-level alignment
**Roles:** UI/UX Developer, Technical Architect

---

## Summary

Two concrete behavioral changes to Army HQ so the live shell journey matches the presidential command doctrine. The president can now return to the Warroom directly from Army HQ, and the back button communicates "field observation" instead of "the map."

## Problem

The presidential command doctrine says:
- Warroom = president's desk (LIVES here)
- Army HQ = military command center (VISITS here)
- Tactical Map = field situation room (OBSERVES here)

But the live Army HQ modal had only one exit: "← MAP" back to the Tactical Map. The president could not return to the Warroom from Army HQ without a two-step detour (close HQ → land on Tactical Map → click WARROOM). This broke the presidential model where Army HQ and Warroom are peer destinations the president moves between.

Additionally, "← MAP" implied the map was the player's primary identity, not the field situation room they observe.

## Changes

### Fix 1: WARROOM return affordance in Army HQ header
- Added a WARROOM button to the Army HQ header bar, next to the back button
- Only visible when Warroom return is available (same `shouldShowWarroomReturn` logic as PresidentialToolbar)
- Closes Army HQ then navigates: embedded mode uses `postMessage`, desktop mode uses `ipc.focusWarroom()`
- Styled in amber to match the PresidentialToolbar WARROOM button
- Tooltip: "Return to president's desk"
- Hidden when drilling into a corps (only shown at army overview level)

### Fix 2: "← MAP" renamed to "← FIELD"
- Back button now says "← FIELD" instead of "← MAP"
- Tooltip: "Return to field observation"
- Communicates the presidential relationship: the president returns to observing the battlefield

### Regression test
- Added test in `ui_shell_navigation.test.ts` verifying:
  - Army HQ source contains `'← FIELD'` and does not contain `'← MAP'`
  - Army HQ source contains `shouldShowWarroomReturn`, `focusWarroom`, `awwv-back-to-hq`
  - Army HQ source contains WARROOM button text and presidential tooltip

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/ArmyHQModal.tsx` | Import warroomReturn utils; "← MAP" → "← FIELD" with tooltip; WARROOM return button |
| `tests/ui_shell_navigation.test.ts` | Regression test for FIELD label and WARROOM affordance |

## Verification

- `tsc --noEmit` — clean
- `vitest run tests/ui_shell_navigation.test.ts` — 13/13 pass (12 existing + 1 new)
- `vite build` — success
- `check_claude_governance.ps1` — OK

## Completion Block

```
Canonical owner:     ArmyHQModal header — owns Army HQ exit routes (← FIELD to Tactical Map, WARROOM to president's desk)
Demoted path:        "← MAP" label implying the map is the player's identity; two-step HQ→Map→Warroom detour
Player-visible truth: President can return to desk directly from command center; back button says "FIELD" not "MAP"
Canonical UI surface: Army HQ header bar (exit routes), PresidentialToolbar (WARROOM on Tactical Map)
Done means:          WARROOM button visible in Army HQ header; ← FIELD label; 13/13 shell tests pass; tsc+vite+governance clean
```
