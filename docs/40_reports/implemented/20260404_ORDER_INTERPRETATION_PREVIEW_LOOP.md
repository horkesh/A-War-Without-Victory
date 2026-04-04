# Order Interpretation Preview Loop — Wave 5

**Date:** 2026-04-04
**Status:** IMPLEMENTED
**Verification:** tsc clean, 12/12 Wave 5 tests pass, desktop:map:build clean, governance OK

---

## The Gap

The `DirectInterventionSection` in `OperationBriefingModal` surfaces institutional cost only when the player is about to override a reluctant commander (assessment = `postpone` or `abort`). On a clean approval path (assessment = `launch`), the player saw no information about the command strain context they were operating under — even if the corps was carrying significant institutional damage from prior interventions.

Result: a player with a strained (or compromised) corps could click Launch with no awareness of the elevated friction they were committing into.

---

## What Was Built

### Work Item 1 — `deriveOrderInterpretation` (pure function)

**File:** `src/ui/map/data/command_strain.ts`

Added `OrderInterpretation` interface and `deriveOrderInterpretation(strain, commanderAssessment)` at the bottom of the existing derivation module.

- `severity`: `'normal'` (strain=0) / `'caution'` (strain 1–5) / `'alarm'` (strain ≥6)
- `cautionNotice`: `null` when severity=normal (silence=healthy); staff-briefing prose otherwise
- `interventionStrength`: `'direct_intervention'` when commander says `postpone`/`abort`; `'ordinary_approval'` otherwise

Caution notice: "This corps is carrying command strain from recent presidential interventions. Operations proceed, but at elevated institutional friction."

Alarm notice: "Command cohesion is compromised. Institutional damage is severe. Further operations risk command breakdown."

### Work Item 2 — `OrderInterpretationSection` component

**File:** `src/ui/map/components/army_hq/OrderInterpretationSection.tsx` (NEW)

- Returns `null` when severity = `'normal'` (silence = healthy)
- Caution (strain 1–5): amber-500/30 border, amber-900/10 background — matches `CommandManagementSection` color language
- Alarm (strain ≥6): red-500/30 border, red-900/10 background
- Small label: "ARMY HQ INTERPRETATION" (9px, uppercase, secondary color)
- Body: `cautionNotice` text from `deriveOrderInterpretation`
- When `interventionStrength === 'direct_intervention'`: second line in semibold — "Approving this order would constitute Direct Intervention. Institutional damage will compound."
- No buttons, no actions — purely informational

### Work Item 3 — Wired into `OperationBriefingModal`

**File:** `src/ui/map/components/OperationBriefingModal.tsx`

`OrderInterpretationSection` is rendered:
- After the `CommandRecord` / `ForceLaunchBadge` block
- Before `DirectInterventionSection`
- Before action buttons
- Only when `operation.phase === 'planning'` (decision-ready state only)

The `DirectInterventionSection` is unchanged — it continues to own the override-cost display. The two sections address different questions:
- `OrderInterpretationSection`: "What is the institutional context before I commit?"
- `DirectInterventionSection`: "What will overriding a reluctant commander cost me?"

### Work Item 4 — 5+ tests in `tests/command_authority.test.ts`

Added `describe('Wave 5: Order Interpretation Preview', ...)` block with 12 tests:

1. Returns normal/null when strain=0 (any assessment)
2. Returns normal/null when strain=0 regardless of assessment
3. Returns caution when strain 1–5 (non-null notice, ordinary_approval)
4. Returns alarm when strain ≥6 (non-null notice)
5. interventionStrength is direct_intervention when commander says postpone
6. interventionStrength is ordinary_approval when commander says launch
7. interventionStrength is direct_intervention when commander says abort
8. interventionStrength is ordinary_approval when assessment is null
9. interventionStrength is ordinary_approval when assessment is undefined
10. Alarm text differs from caution text
11. strain=5 is caution (boundary — not yet alarm)
12. strain=6 is alarm (boundary)

---

## Silence = Healthy Rule

`OrderInterpretationSection` returns `null` at strain=0. The component never renders noise for healthy corps. The pattern is consistent with `CommandManagementSection` (same rule), `ChiefOfStaffBriefing` strain paragraphs (same rule), and `OperationsSection` command-risk notice (same rule).

---

## Ownership

- `deriveOrderInterpretation`: owned by `src/ui/map/data/command_strain.ts` — same module as `computeCorpsCommandStrain` and `getCommandStrainLabel`
- `OrderInterpretationSection`: owned by `src/ui/map/components/army_hq/OrderInterpretationSection.tsx`
- Wiring: `src/ui/map/components/OperationBriefingModal.tsx` — single call site, planning phase only

---

## Verification Results

```
npx.cmd tsc --noEmit -p tsconfig.json     → clean (no output)
npm run test:vitest -t "Wave 5"           → 12/12 pass
desktop:map:build                         → built in 8.63s (warnings are pre-existing chunk size notices)
check_claude_governance.ps1               → Claude governance check: OK
```

---

## Canonical Completion Block

```
Canonical owner:       src/ui/map/data/command_strain.ts (deriveOrderInterpretation)
                       src/ui/map/components/army_hq/OrderInterpretationSection.tsx
Demoted path:          n/a — this is a new surface, no prior component demoted
Player-visible truth:  Army HQ reads strain > 0 as institutional friction before any launch
Canonical UI surface:  OperationBriefingModal, planning phase only, after CommandRecord, before DirectInterventionSection
Done means:            tsc clean + 12 Wave 5 tests pass + build clean + governance OK
```
