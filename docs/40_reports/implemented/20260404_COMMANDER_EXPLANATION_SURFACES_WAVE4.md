# Commander Explanation Surfaces Wave 4 — Operation Constraint Context

**Date:** 2026-04-04
**Lane:** v0.8-to-v0.9 Commander Explanation Surfaces
**Status:** IMPLEMENTED

## Summary

Propagated the corps-level explanation hierarchy (dominant constraint + relief path) into the OperationBriefingModal, so the player sees WHY the commander recommends what they recommend at decision time — not just the assessment badge.

## Problem

The player saw "Recommends Postpone" in the operation briefing but had NO explanation of why. Readiness gauges (intel%, supply%, force ratio) showed operation-level numbers, but the corps-level strategic constraint (siege, garrison deficit, exhaustion, institutional strain) was only visible on the Army HQ corps card — requiring the player to exit the modal and navigate elsewhere.

## Solution

Wired the existing `situationAssessment` (already derived on-read from `CommanderState` via `deriveCorpsSituationAssessment()`) into the OperationBriefingModal as a compact `OperationConstraintContext` section.

### What the player now sees

Between the Assessment Badge and the Order Interpretation section:

```
Corps Constraint
[CONSTRAINT BADGE] Dominant reason sentence
-> Relief path sentence
```

- **Silence = healthy**: renders nothing when `primaryConstraint === 'none'`
- **Same truth, different density**: uses the same data as `CorpsSituationSection` (Army HQ corps card) but in a more compact format appropriate for the decision modal
- **No new derivation**: purely wires existing data — no fake heuristics

### Provenance audit finding (accepted)

`commander_assessment` (operation go/no-go) and `classifyPrimaryConstraint` (corps constraint) read **almost entirely disjoint state**:
- Assessment reads operation-level readiness (intel, supply, force ratio)
- Constraint reads corps-level strategic state (zones, threat, exhaustion, strain)

They CAN diverge — this is correct. The constraint provides strategic context that readiness gauges alone cannot explain.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/OperationBriefingModal.tsx` | +`OperationConstraintContext` component; wired `situationAssessment` from corps formation |
| `tests/command_authority.test.ts` | +9 Wave 14 tests (constraint propagation, silence=healthy, priority ordering) |

## Ownership

| Surface | Owner | Role |
|---------|-------|------|
| Army HQ corps card | `CorpsSituationSection` | Standing/ambient explanation |
| Operation briefing modal | `OperationConstraintContext` | Decision-time explanation |

No duplication — the standing surface shows full detail (factors, plan, threat); the decision-time surface shows compact constraint + relief only.

## Orchestration

4 subagents dispatched:
- **WS-A (Explore — provenance audit)**: Confirmed commander_assessment and classifyPrimaryConstraint read disjoint state. Found they CAN diverge — accepted as correct behavior.
- **WS-B (Explore — surface audit)**: Cataloged all existing explanation fragments. Confirmed the gap: zero constraint explanation at operation decision time. Confirmed zero redundancy with existing surfaces.
- **Implementation**: Central (orchestrator) — single file ownership, bounded change.
- **QA**: Integrated into Wave 14 test block.

Not delegated: implementation and test writing (single-file change, cleaner to keep central).

## Verification

- tsc: clean
- vitest at time of implementation: 228/228 in command_authority.test.ts; 2162/2182 full suite (20 failures in 6 files — all pre-existing, proven below)
- vite build: clean
- governance: OK

### Post-implementation suite status

This verification record was accurate when Wave 4 landed. It was later superseded by
`20260404_ACCEPTANCE_SUITE_STABILIZATION_WAVE1.md`, which eliminated the entire
pre-existing failing set and restored the full suite to **2182/2182 passing**.

### Pre-existing failure evidence

**Method:** `git stash` (revert to pre-Wave-4 HEAD a24aa5db), run same 6 files → same 20 failures. `git stash pop` to restore.

**Wave 4 changed files:** `.claude/architect_notes.md`, `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `src/ui/map/components/OperationBriefingModal.tsx`, `tests/command_authority.test.ts`, `docs/40_reports/implemented/20260404_COMMANDER_EXPLANATION_SURFACES_WAVE4.md` (new). None overlap with any failing test or its source dependencies.

| File (failures) | Failing tests | Error | Causality: why unrelated to Wave 4 |
|---|---|---|---|
| `tests/brigade_posture.test.ts` (12) | `applyPostureOrders` × 3, `applyPostureCosts` × 9 | Import/API mismatch — tests expect functions from `src/sim/combat/brigade_posture.ts` | Wave 4 touched only `OperationBriefingModal.tsx` (UI component) and `command_authority.test.ts`. No changes to brigade posture source or test. |
| `tests/commander_override.test.ts` (4) | `commanderReviewAssignment` → mission compliance × 1, non-priority excess × 1, position viability × 2 | `expected false to be true` — assertion mismatch in commander review assignment logic | Wave 4 touched only the briefing modal UI. No changes to `commander_review_assignment.ts` or this test file. |
| `tests/corps_front_sector_corps_ownership.test.ts` (1) | `does not let one corps sector claim another corps brigade` | `expected ['brig_beta2'] to include 'brig_beta'` — brigade ID mismatch in sector assignment | Wave 4 touched no sector code. Source: `corps_front_sectors.ts`. |
| `tests/war_phase_step_order.test.ts` (1) | `step count is stable` | `expected 148 to be 153` — war phase step count changed in prior work | Wave 4 added no war phase steps. Source: `war_phases.ts`. |
| `tests/desktop_pmtiles_protocol_route.test.ts` (1) | `rewrites desktop awwv origins to canonical app data route` | `expected 'pmtiles://awwv://warroom/...' to be 'pmtiles://awwv://app/...'` — warroom route rename | Wave 4 touched no desktop protocol code. Source: Warroom React migration. |
| `tests/engine_honesty_legacy_contracts.test.ts` (1) | `marks legacy front and theatre schema fields honestly as compatibility-only` | String assertion on `game_state.ts` schema comments — comment text changed | Wave 4 touched no GameState schema. Source: `src/state/game_state.ts` comment edits in prior work. |

## Visual Hierarchy (final)

```
1. Header (operation name, corps, stamp)
2. CommandRecord (executing/recovery) or ForceLaunchBadge (legacy)
3. Commander Info (rank, name, archetype)
4. Readiness Gauges (Intel, Supply, Cohesion)
5. Force Ratio
6. Assessment Badge + Postponement Count
7. [NEW] Corps Constraint Context (badge + reason + relief path)
8. Order Interpretation (institutional strain context, planning only)
9. Direct Intervention (override cost, if assessment !== launch)
10. Action Buttons
```
