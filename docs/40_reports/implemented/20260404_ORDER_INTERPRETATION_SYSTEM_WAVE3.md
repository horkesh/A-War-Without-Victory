# Order Interpretation System Wave 3 — Implementation Report

**Date:** 2026-04-04
**Status:** CLOSED
**Suite:** 2300/2300 passing

---

## Summary

Wave 3 makes interpretation categories consequential at the decision surface. The `DirectInterventionSection` in `OperationBriefingModal` now shows category-differentiated copy that tells the player WHY overriding a `feasibility_constrained` situation is different from overriding a `caution_driven` one.

---

## What Changed

### New function: `deriveInterventionRisk()` in `command_strain.ts`

```ts
export function deriveInterventionRisk(
    category: OrderInterpretationCategory,
    commanderAssessment: 'postpone' | 'abort',
    severity: 'normal' | 'caution' | 'alarm',
): string | null
```

Standalone pure helper. Returns category-differentiated consequence copy:

| Category | Severity/Assessment | Copy |
|---|---|---|
| `strain_shaped` | `alarm` | "Command cohesion is already compromised. Another intervention will deepen institutional damage." |
| `strain_shaped` | `caution` | "This corps carries active command strain. Forcing launch adds further institutional friction." |
| `feasibility_constrained` | — | "Command reads this as structurally blocked. Override does not resolve the constraint." |
| `tempo_resistant` | — | "The commander judges timing is premature. Forcing launch proceeds before conditions are fully set." |
| `caution_driven` | `abort` | "The commander judges this operation is not viable. Overriding that carries full institutional cost." |
| `caution_driven` | `postpone` | "The commander recommends waiting for better conditions. Override launches against that professional judgment." |
| `normal` | — | `null` |

### `OperationBriefingModal.tsx`

- Added `deriveOrderInterpretation` and `deriveInterventionRisk` to imports.
- Added `interventionRisk` `useMemo` at modal level (planning phase, non-launch assessment only). Calls `deriveOrderInterpretation` once to extract `{ category, severity }`, then calls `deriveInterventionRisk`.
- Added `interventionRisk?: string | null` prop to `DirectInterventionSection`.
- Replaced hardcoded `explanation` string with: `interventionRisk ?? (generic fallback)`.
- Passed `interventionRisk={interventionRisk}` at call site.

---

## What Was NOT Changed

- `OrderInterpretation` interface: unchanged. `deriveInterventionRisk` is a standalone helper, not a field.
- `deriveOrderInterpretation`: unchanged. Wave 1/2 contracts unaffected.
- Wave 1/2 tests: all 47 pass without modification.
- No engine changes. No new persisted state. No fake locks, fake personality, fake compliance mechanics.

---

## Orchestration

4 parallel workstreams dispatched:

| Agent | Owned | Key finding |
|---|---|---|
| Technical Architect | Consequence-truth audit, anti-theater guardrails, surface ownership | Category-aware copy belongs in `DirectInterventionSection` (override-consequence owner). Theater rejections: compliance chance, personality resistance, differential CA cost, feasibility lockout. |
| Gameplay Programmer | `deriveInterventionRisk` specification | Standalone `string \| null` return. Switch-on-category pattern. `commanderAssessment` narrowed to `postpone \| abort`. |
| UI/UX Developer | Surface integration plan | Pre-compute at modal level, pass as prop. Same render slot, same style, null-fallback. No new sections. |
| QA Engineer | Test plan | 9 test cases in existing `command_strain_interpretation.test.ts`. Wave 1/2 unaffected. |

**Divergence resolved:** Gameplay Programmer proposed deriving inside `DirectInterventionSection`; UI/UX Developer proposed pre-computing at modal level. Followed UI/UX — display components stay dumb, matches existing `ReadinessTrendIndicator` / `RecommendationDriverSection` pattern.

---

## Tests

9 new tests in `tests/ui/command_strain_interpretation.test.ts` (Wave 3 suite). Total for the file: 56 tests (47 Wave 1/2 + 9 Wave 3).

Test coverage:
- `normal` returns null
- `strain_shaped` alarm vs caution distinction
- `feasibility_constrained` structural framing
- `tempo_resistant` timing framing
- `caution_driven` postpone vs abort distinction
- Word-count guard (all ≤ 35 words)
- Pairwise distinctness across all 6 non-normal cases

---

## Verification

- `npx.cmd tsc --noEmit`: clean
- `npm run test:vitest tests/ui/command_strain_interpretation.test.ts`: 56/56
- `npm run test:vitest` (full): 2300/2300
- `vite build`: clean
- `check_claude_governance.ps1`: OK

---

## Completion Block

```
Canonical owner:    deriveInterventionRisk() in command_strain.ts
Demoted path:       Hardcoded assessment === 'abort' ternary in DirectInterventionSection
Player-visible truth: Category-differentiated consequence copy at the override decision surface
Canonical UI surface: DirectInterventionSection in OperationBriefingModal
Done means:         feasibility drag reads differently from caution drag at the override button; full suite green
```
