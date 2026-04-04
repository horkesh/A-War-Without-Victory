# Command Review Consolidation — Wave 8

**Date:** 2026-04-04
**Branch:** main
**Slot:** Wave 8 of the Command Friction / Order Interpretation series

## Mission

Bring the `OutcomeCategoryBadge` — introduced in Wave 7 (OperationBriefingModal's `CommandRecord`) — into the `OperationsSection` ops-card list view. The player can now see at a glance, on the corps card's operations tab, whether each executing or recovering operation was:

- **ordinary_compliance** — approved by commander, president approved (silence = healthy, no badge)
- **reluctant_compliance** — commander recommended postpone/abort, president approved without spending CA
- **direct_intervention** — president spent Command Authority to override the command chain

A second addition: a `[ REVIEW COMMAND DECISION ]` button appears on executing/recovery op-cards where a launch snapshot exists, opening the `OperationBriefingModal` directly from the list context. This closes the navigation gap where the player had to locate the briefing modal through a separate route.

The button label on the force-launch path was also corrected from `[ FORCE LAUNCH — N AUTH ]` to `[ DIRECT INTERVENTION — N AUTH ]` for terminology consistency with canonical doctrine.

---

## Changes Made

### `src/ui/map/components/army_hq/OperationsSection.tsx`

**`OutcomeCategoryBadge` component (new, lines 33–57)**

Pure display component — no state, no IPC. Props: `assessmentAtLaunch` and `wasForce`. Logic:

- `assessmentAtLaunch == null && !wasForce` → pre-feature op guard → returns `null`
- `deriveOperationOutcomeCategory(assessmentAtLaunch, wasForce)` → category
- `ordinary_compliance` → `null` (silence = healthy)
- `direct_intervention` → amber bold `⚠ Direct Intervention` badge
- `reluctant_compliance` → amber dim `Approved Against Recommendation` badge

**Inline badge wiring in op-card header (lines 574–590)**

The phase badge (`EXECUTION` / `RECOVERY` etc.) is now wrapped in a flex row. For `execution` and `recovery` phases, `OutcomeCategoryBadge` renders to the left of the phase badge. Planning-phase cards are excluded — the badge is only meaningful for launched operations.

**`[ REVIEW COMMAND DECISION ]` button (lines 615–622)**

Rendered for `execution`/`recovery` ops that have `commander_assessment_at_launch != null`. Calls `setOperationBriefingContext({ corpsId, operationName })` — the same store action that the modal uses for context. Opens the briefing modal from the list view without duplicating any modal logic.

**Button label fix**

`[ FORCE LAUNCH — N AUTH ]` → `[ DIRECT INTERVENTION — N AUTH ]`. Aligns with canonical terminology from `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`.

**Import additions**

- `deriveOperationOutcomeCategory` from `../../data/command_strain`
- `setOperationBriefingContext` from `useGameStore`

---

## Tests

File: `tests/command_authority.test.ts` — **11 new tests** in `describe('Wave 8: Command Review Consolidation')`.

All 11 pass. Full suite: 2095/2115 pass (20 pre-existing failures in `brigade_posture`, `commander_override`, `corps_front_sector_corps_ownership` — unrelated to this wave).

Wave 8 test coverage:
- `null` / `undefined` assessment + `wasForce=false` → `ordinary_compliance` (pre-feature op graceful fallback)
- `postpone/true` → `direct_intervention`
- `launch/true` → `direct_intervention` (wasForce wins)
- `postpone/false` → `reluctant_compliance`
- `abort/false` → `reluctant_compliance`
- Badge guard: `ordinary_compliance` → no badge (silence = healthy)
- Badge: `direct_intervention` → badge shown
- Badge: `reluctant_compliance` → badge shown
- Pre-feature op guard: `undefined + !wasForce → wouldSkip = true`
- Exhaustive tier coverage: all three categories reachable

---

## Verification

```
tsc --noEmit -p tsconfig.json        → clean (0 errors)
vitest run tests/command_authority   → 2095/2115 pass (20 pre-existing failures)
Wave 8 describe block                → 11/11 pass
desktop:map:build                    → clean
governance check                     → OK
```

---

## Silence = Healthy Audit

| Surface | Silence = healthy | Status |
|---------|------------------|--------|
| Front face strain badge | strain = 0 → hidden | unchanged (Wave 1) |
| Front face friction dot | frictionTypes.length = 0 → hidden | unchanged (Wave 3) |
| Back face friction panel | strain = 0 AND frictionEvents.length = 0 → null | unchanged (Wave 3) |
| CommandManagementSection | strain = 0 → renders null | unchanged (Wave 4) |
| OrderInterpretationSection | strain = 0 → null | unchanged (Wave 5) |
| StanceInterpretation | healthy → no preview | unchanged (Wave 6) |
| CommandRecord / outcome badge (Modal) | ordinary_compliance → no badge | unchanged (Wave 7) |
| **OutcomeCategoryBadge (OperationsSection)** | **ordinary_compliance → null** | **new (Wave 8)** |

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/OperationsSection.tsx` | +60 lines: `OutcomeCategoryBadge`, wiring, `[ REVIEW COMMAND DECISION ]` button, label fix |
| `tests/command_authority.test.ts` | +80 lines: 11 Wave 8 tests |

---

```
Canonical owner: OperationsSection (OutcomeCategoryBadge + Review Command Decision button in list view)
Demoted path: Nothing demoted — Wave 8 extends Wave 7 outcome category surfacing into list context
Player-visible truth: Every executing/recovery op in the list view shows an outcome category badge (silence=healthy) and a Review Command Decision button when a launch snapshot exists
Canonical UI surface: ArmyHQCorpsCard operations tab — op-card header row
Done means: OutcomeCategoryBadge wired in OperationsSection for execution/recovery phases; review button opens modal from list; label fix applied; 11 tests pass; tsc + build + governance clean
```
