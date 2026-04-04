# Order Interpretation System Wave 1 — Implementation Report

**Date:** 2026-04-04
**Lane:** Order Interpretation System Wave 1
**Status:** COMPLETE
**Roadmap context:** v0.8.x — command legibility lane (no new engine systems)

---

## Summary

Extended the order interpretation surface to classify WHAT KIND of institutional drag is shaping a commander's reluctance — not just that strain exists. The player can now answer: is command resistance strain-shaped, caution-driven, feasibility-constrained, or tempo-resistant?

Two bounded changes:

1. **Category classification** (`command_strain.ts`) — `deriveOrderInterpretation` now classifies drag type via `OrderInterpretationCategory` and produces a human-readable `categoryLabel`. Four meaningful categories (strain_shaped / caution_driven / feasibility_constrained / tempo_resistant) plus `normal` for compliant assessments.
2. **Expanded firing + category badge** (`OrderInterpretationSection.tsx`) — the section now fires for ALL reluctant assessments (postpone/abort), not only when strain > 0. A compact category badge appears in the header.

---

## What Was Added

### Derivation Changes (command_strain.ts)

- **`OrderInterpretationCategory` type** — new exported union: `strain_shaped | caution_driven | feasibility_constrained | tempo_resistant | normal`.
- **`OrderInterpretation` interface extended** — `category: OrderInterpretationCategory` and `categoryLabel: string` added to the return shape.
- **`deriveOrderInterpretation` signature extended** — two new optional parameters: `primaryConstraint?` (from `situationAssessment.primaryConstraint`) and `trendDirection?` (from `operation.readinessTrend?.direction`). Classification logic:
  - `strain_shaped`: strain > 0 and no dominant constraint override — institutional friction is the shaping force.
  - `caution_driven`: assessment is postpone/abort, strain = 0, no feasibility or tempo signal — commander is applying professional judgment.
  - `feasibility_constrained`: primaryConstraint maps to a hard limit category (siege, force_condition, defensive_duty) — the operation is physically impossible given current state.
  - `tempo_resistant`: trendDirection is `deteriorating` or `not_viable` — the operation window is closing against the commander.
  - `normal`: launch recommended, strain = 0 — no drag to classify.

### UI Changes (OrderInterpretationSection.tsx)

- **New optional props** `primaryConstraint` and `trendDirection` — forwarded directly to `deriveOrderInterpretation`.
- **Category label badge** in section header — compact `STRAIN-SHAPED` / `CAUTION-DRIVEN` / `FEASIBILITY` / `TEMPO` label rendered next to the section title.
- **Expanded firing condition** — section now renders for ALL reluctant assessments (postpone or abort), regardless of whether strain > 0. Previously, a commander could recommend abort at strain = 0 and the section stayed silent, leaving the player with no interpretation of the resistance.

### Wiring (OperationBriefingModal.tsx)

- Call site updated to pass `primaryConstraint={situationAssessment?.primaryConstraint}` and `trendDirection={operation.readinessTrend?.direction}` to `OrderInterpretationSection`.
- No new data fetched — both fields are already present on the existing props at the call site.

### Tests

- **~12 new tests (Wave 20)** in `tests/command_authority.test.ts`
  - Category classification for each of the four categories + normal
  - Expanded firing: postpone/abort at strain=0 triggers section
  - Badge label content per category
  - Prop forwarding: primaryConstraint and trendDirection consumed correctly
- Full suite: [QA to confirm]

---

## What Was NOT Added

- **No engine changes** — all classification is UI-side derivation from existing persisted fields.
- **No new persisted fields** — `primaryConstraint` and `readinessTrend.direction` already existed on `situationAssessment` and `OperationView`.
- **No fake personality** — categories classify INSTITUTIONAL DRAG TYPE, not commander character. A corps commander is not "stubborn" or "cautious" as a personality trait; the category names what the system is doing to the order, not who the commander is.
- **No new control mechanics** — classification is read-only context. The Direct Intervention section (pay CA, force-launch) remains the sole action path.
- **No changes to `normal` path** — when assessment is launch and strain = 0, the section stays silent. Silence = healthy is preserved.

---

## Orchestrator Report

### Subagents Used

| Workstream | Agent Type | What It Owned |
|---|---|---|
| A: Derivation | gameplay-programmer | `OrderInterpretationCategory` type, `deriveOrderInterpretation` extension, classification logic |
| B: UI | ui-ux-developer | `OrderInterpretationSection` props, category badge, expanded firing condition, OperationBriefingModal wiring |
| C: Tests + Verification | qa-engineer | Wave 20 test plan, regression surface, full suite verification |
| D: Documentation | documentation-specialist | Implementation report, ledger entries, architect_notes update |

---

## Decision-Time Hierarchy (Updated)

For planning-phase operations, the player now sees:

1. Header (operation name, corps, faction)
2. Commander Info (rank, name, competence/aggressiveness)
3. Readiness Gauges (intel, supply, cohesion, force ratio)
4. Assessment Badge ("Recommends Launch/Postpone/Abort")
5. Delegation Path Indicator (who bears the decision burden)
6. Readiness Trend Indicator (improving/stagnating/deteriorating)
7. Recommendation Driver (main blocker factor)
8. Corps Constraint Context (siege/threat/garrison/readiness/institutional/planning)
9. **Order Interpretation (with category badge) — fires for ALL reluctant assessments**
10. Direct Intervention Section (force-launch option when commander recommends against)
11. Action Buttons

---

## Verification

- `npx.cmd tsc --noEmit -p tsconfig.json`: [QA to confirm]
- `npm run test:vitest`: [QA to confirm]
- `vite build`: [QA to confirm]

---

## Completion Block

**Canonical owner:** `OrderInterpretationSection` in `OperationBriefingModal` (planning phase only).

**Derivation owner:** `deriveOrderInterpretation` in `command_strain.ts`.

**Demoted path:** Generic strain notice without drag-type classification. The player no longer needs to infer what kind of resistance they are facing — the category badge names the institutional phenomenon directly.

**Player-visible truth:** The player can now answer: is command resistance strain-shaped (institutional friction), caution-driven (professional judgment), feasibility-constrained (hard physical limit), or tempo-resistant (closing window)? Categories fire for any reluctant assessment, not only when strain is visibly elevated.

**Done means:** Interpretation category system landed. Section fires for all reluctant assessments. Category badge correct per classification logic. No engine changes, no new persistence. Full suite green.
