---
name: awwv-plan-change
description: Produce a stepwise plan, required docs, tests, and ledger notes for a proposed change. Use when the user runs /awwv_plan_change or asks for a plan to change code or data.
---

# /awwv_plan_change

## Trigger
Planning a code or data change.

## Inputs
- Change summary and affected areas.

## Output
- Stepwise plan.
- Required docs and tests.
- Ledger notes and phase scope.

## Determinism safeguards
- Explicit checklist for ordering, randomness, timestamps.

## STOP AND ASK
- If plan crosses multiple phases or conflicts with canon.
