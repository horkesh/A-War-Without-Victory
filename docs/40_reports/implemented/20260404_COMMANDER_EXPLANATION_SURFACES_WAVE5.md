# Commander Explanation Surfaces Wave 5 — Recommendation Driver

**Date:** 2026-04-04
**Lane:** v0.8-to-v0.9 Commander Explanation Surfaces
**Status:** IMPLEMENTED

## Summary

Added recommendation explanation to the OperationBriefingModal. When the commander recommends postpone or abort, the player now sees WHY — which specific readiness factor (intel, force ratio, or supply) is the main blocker, and what would need to change.

## Problem

The player saw "Recommends Postpone" + corps constraint context (Wave 4) but could not distinguish:
- Is it postpone because of bad intel, or because of insufficient forces?
- What specifically needs to improve for the recommendation to change?
- Is this barely short of launch or far from it?

The readiness gauges showed the raw numbers but didn't connect them to the recommendation.

## Solution

Pure UI-side derivation that mirrors the engine's assessment formula using snapshot data already on OperationView + commander personality from NamedOfficerView.

### New derivation function

`deriveRecommendationExplanation()` in `command_strain.ts`:
- Reconstructs the engine's exact assessment formula:
  - `requiredConfidence = clamp(0.6 - agg*0.06 + comp*0.04, 0, 1)`
  - `requiredForceRatio = max(1.0, 1.5 - agg*0.10 + comp*0.05)`
  - `goThreshold = 0.7 - agg*0.08`
  - `assessmentScore = confMet*0.4 + forceMet*0.3 + supply*0.3`
- Identifies the main blocker (lowest factor fullness)
- Returns: `{ recommendationReason, mainBlocker, wouldImproveIf }`
- Silence = healthy when assessment is 'launch'

### What the player now sees

Between Assessment Badge and Corps Constraint Context:

```
Recommendation Driver
[icon] Intelligence at 35% (commander needs 44%) — the main factor short of launch standard
→ Improve intelligence gathering; more time in preparation raises confidence
```

Or for abort:
```
Recommendation Driver
Operation has been postponed 2 times without improvement — Intelligence at 20%; Force ratio at 0.5:1 (commander needs 1.3:1)
```

### Key design decisions

1. **UI-side derivation, not engine-side snapshots**: The UI already has all inputs (intel, supply, force ratio snapshots + commander aggressiveness/competence). Adding engine-side fields would be scope creep. The derivation mirrors the exact engine formula.

2. **Silence = healthy for launch**: No recommendation explanation when the commander recommends launch. The assessment badge + readiness gauges are sufficient.

3. **No wouldImproveIf for abort**: Abort means the operation is not viable. Offering fake improvement advice would be advisory theater.

4. **Placement**: Between Assessment Badge and Corps Constraint Context. This creates the hierarchy: WHAT (badge) → WHY-tactical (recommendation driver) → WHY-strategic (corps constraint) → CONSEQUENCE (order interpretation) → OVERRIDE (direct intervention).

## Provenance audit finding (accepted)

The engine's assessment formula (operation_preparation.ts lines 527-553) uses a 3-factor weighted score:
- Intel confidence (40%) — ratio of actual to required, capped at 1.0
- Force ratio (30%) — ratio of actual to required, capped at 1.0
- Supply readiness (30%) — raw 0-1 value

The go-threshold varies by commander aggressiveness (0.30 for reckless to 0.62 for timid). Postpone window is [threshold-0.15, threshold). All snapshot values are already stored on the operation. The UI can reconstruct the exact formula without engine changes.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/command_strain.ts` | +`deriveRecommendationExplanation()` + `RecommendationExplanation` interface |
| `src/ui/map/components/OperationBriefingModal.tsx` | +`RecommendationDriverSection` component; wired derivation via useMemo |
| `tests/command_authority.test.ts` | +10 Wave 15 tests (silence, blocker identification per factor, abort, aggressiveness impact, null fallback) |

## Ownership

| Surface | Owner | Role |
|---------|-------|------|
| Army HQ corps card | `CorpsSituationSection` | Standing/ambient explanation |
| Operation modal: constraint | `OperationConstraintContext` | Strategic corps-level constraint |
| Operation modal: recommendation | `RecommendationDriverSection` | Tactical recommendation driver |

No duplication — constraint explains strategic WHY (corps-level), recommendation explains tactical WHY (operation readiness vs thresholds).

## Decision-Time Explanation Hierarchy (final)

```
1. Header (operation name, corps)
2. CommandRecord (executing/recovery) or ForceLaunchBadge (legacy)
3. Commander Info (rank, name, competence & aggressiveness)
4. Readiness Gauges (Intel, Supply, Cohesion)
5. Force Ratio
6. Assessment Badge + Postponement Count
7. [NEW] Recommendation Driver (main blocker + would improve if)
8. Corps Constraint Context (badge + reason + relief path)
9. Order Interpretation (institutional strain, planning only)
10. Direct Intervention (override cost, if assessment !== launch)
11. Action Buttons
```

## Orchestration

| Agent | Owned | Finding |
|-------|-------|---------|
| WS-A (Explore — recommendation provenance) | Full engine formula audit | 3-factor weighted score, threshold varies by aggressiveness, all snapshots already on OperationView. UI can derive without engine changes. |
| WS-B (Explore — surface fit) | Data availability + visual hierarchy | All needed data available; commander aggressiveness on NamedOfficerView; readiness bars already render the raw values. |
| Central (orchestrator) | Implementation, tests, integration | Single-file derivation + component + wiring. |

Not delegated: implementation (single-file derivation, cleaner central).

## Verification

- tsc: clean
- vitest: **2192/2192** (0 failures, 10 new Wave 15 tests)
- vite build: clean
- governance: OK
