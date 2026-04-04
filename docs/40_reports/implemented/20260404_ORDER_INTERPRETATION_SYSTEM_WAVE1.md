# Order Interpretation System Wave 1 - Implementation Report

**Date:** 2026-04-04
**Lane:** Order Interpretation System Wave 1
**Status:** COMPLETE
**Roadmap context:** v0.8.x - command legibility lane (no new engine systems)

---

## Summary

Extended the order interpretation surface to classify what kind of institutional drag is shaping a commander's reluctance, not just that strain exists. The player can now answer: is command resistance strain-shaped, caution-driven, feasibility-constrained, or tempo-resistant?

Two bounded changes:

1. **Category classification** (`command_strain.ts`) - `deriveOrderInterpretation` now classifies drag type via `OrderInterpretationCategory` and produces a human-readable `categoryLabel`. Four meaningful categories (`strain_shaped`, `caution_driven`, `feasibility_constrained`, `tempo_resistant`) plus `normal` for compliant assessments.
2. **Expanded firing + category badge** (`OrderInterpretationSection.tsx`) - the section now fires for all reluctant assessments (`postpone`/`abort`), not only when strain > 0. A compact category badge appears in the header.

---

## What Was Added

### Derivation Changes (`command_strain.ts`)

- **`OrderInterpretationCategory` type** - new exported union: `strain_shaped | caution_driven | feasibility_constrained | tempo_resistant | normal`
- **`OrderInterpretation` interface extended** - `category: OrderInterpretationCategory` and `categoryLabel: string | null` added to the return shape
- **`deriveOrderInterpretation` signature extended** - two new optional parameters:
  - `primaryConstraint?` from `situationAssessment.primaryConstraint`
  - `trendDirection?` from `operation.readinessTrend?.direction`

Classification logic now follows this priority:

1. `strain_shaped`
   - strain >= compromised threshold -> alarm
   - strain > 0 -> caution
2. `feasibility_constrained`
   - `primaryConstraint` is `siege`, `threat_pressure`, or `defensive_duty`
   - assessment is `postpone` or `abort`
3. `tempo_resistant`
   - assessment is `postpone`
   - `trendDirection === "improving"`
   - command reads the directive as premature while readiness is still building
4. `caution_driven`
   - assessment is `postpone` or `abort`
   - no stronger strain/feasibility/tempo signal applies
5. `normal`
   - compliant assessment, no institutional drag worth surfacing

### UI Changes (`OrderInterpretationSection.tsx`)

- **New optional props** `primaryConstraint` and `trendDirection` forwarded into `deriveOrderInterpretation`
- **Category label badge** in the header
  - `STRAIN-SHAPED`
  - `CAUTION-DRIVEN`
  - `FEASIBILITY`
  - `TEMPO`
- **Expanded firing condition**
  - section now renders for all reluctant assessments, even at strain 0
  - silence = healthy remains intact for normal compliant cases

### Wiring (`OperationBriefingModal.tsx`)

- Call site now passes:
  - `primaryConstraint={situationAssessment?.primaryConstraint}`
  - `trendDirection={operation.readinessTrend?.direction}`
- No new state fetched and no new persistence added

### Tests

- **33 focused tests** (Wave 20) in `tests/ui/command_strain_interpretation.test.ts`
  - category classification for all five categories
  - backward compatibility for existing two-argument callers
  - `interventionStrength` behavior across categories
  - `cautionNotice` behavior across categories
- **Updated regression coverage** in `tests/command_authority.test.ts`
  - the old `strain=0 + postpone => normal` assertion was intentionally updated to the new `caution_driven` truth

---

## What Was NOT Added

- No engine changes
- No new persisted fields
- No commander-personality fiction
- No new control mechanics
- No noisy UI for the healthy path

This remains a pure derivation and visibility lane.

---

## Orchestrator Report

### Subagents Used

| Workstream | Agent Type | What It Owned |
|---|---|---|
| A: Derivation | gameplay-programmer | `OrderInterpretationCategory`, `deriveOrderInterpretation`, classification logic |
| B: UI | ui-ux-developer | Section props, category badge, expanded firing, modal wiring |
| C: Tests + Verification | qa-engineer | Wave 20 test plan, regression surface, full-suite verification |
| D: Documentation | documentation-specialist | Report, ledger, knowledge, architect notes |

### Material Finding Integrated

- QA caught an older assertion that expected `strain=0 + postpone => normal`
- Wave 1 intentionally changes that to `caution_driven`
- The regression expectation was updated accordingly

---

## Decision-Time Hierarchy (Updated)

For planning-phase operations, the player now sees:

1. Header (operation name, corps, faction)
2. Commander Info
3. Readiness Gauges
4. Assessment Badge
5. Delegation Path Indicator
6. Readiness Trend Indicator
7. Recommendation Driver
8. Corps Constraint Context
9. **Order Interpretation with category badge**
10. Direct Intervention Section
11. Action Buttons

---

## Verification

- `npx.cmd vitest run tests/command_authority.test.ts tests/ui/command_strain_interpretation.test.ts`: **323/323**
- `npx.cmd vitest run`: **2277/2277**
- `npx.cmd tsc --noEmit -p tsconfig.json`: clean
- `npm.cmd run build`: clean
- `powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1`: OK

---

## Completion Block

**Canonical owner:** `OrderInterpretationSection` in `OperationBriefingModal` (planning phase only)

**Derivation owner:** `deriveOrderInterpretation` in `command_strain.ts`

**Demoted path:** Generic strain notice without drag-type classification. The player no longer has to infer what kind of resistance they are facing.

**Player-visible truth:** The player can now distinguish whether command resistance is strain-shaped, caution-driven, feasibility-constrained, or tempo-resistant. The section fires for all reluctant assessments, not only for visibly strained ones.

**Done means:** Interpretation category system landed. Category badge matches the real derivation. Healthy compliant cases stay silent. No engine changes, no persistence changes, full suite green.
