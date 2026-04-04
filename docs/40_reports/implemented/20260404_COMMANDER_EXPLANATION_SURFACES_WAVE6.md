# Commander Explanation Surfaces Wave 6 — Readiness Trend

**Date:** 2026-04-04
**Status:** IMPLEMENTED
**Lane:** Commander Explanation Surfaces (v0.8-to-v0.9)
**Orchestrator:** Yes — 3 parallel audit subagents dispatched (provenance, UI density, trend classification)

## Summary

Wave 6 adds temporal legibility to the operation decision point. The player can now tell whether an operation's readiness is improving, stagnating, or deteriorating — and how much preparation time remains.

## What Changed

### Derivation: `deriveReadinessTrend()` in `src/ui/map/data/command_strain.ts`

Pure function deriving readiness direction from existing persisted fields — **no new persistence needed**.

Key insight: `postponement_count` is a truthful record of prior 'postpone' assessments, because only 'postpone' increments it and resets to `intel_gathering`. 'launch' ends the cycle. 'abort' ends the operation.

**Truth table:**
| postponements | current assessment | → direction |
|---|---|---|
| 0 | launch | nearing_launch (silence) |
| 0 | postpone | building |
| 0 | abort | not_viable |
| ≥1 | launch | improving |
| ≥1 | postpone | stagnating |
| ≥1 | abort | deteriorating |

**Timeline urgency** derived from `preparation_turns_elapsed / preparation_max_turns`:
- Normal: "Turn X of Y in preparation"
- ≥75% elapsed: "running short"
- Final turn: "decision forced next turn"

### Types: `OperationView.readinessTrend` in `src/ui/map/data/types.ts`

New optional field carrying `{ direction, label, timelineFraction, timelineLabel }`.

### Adapter: `src/ui/map/data/GameStateAdapter.ts`

Calls `deriveReadinessTrend()` for planning-phase operations only. Executing/recovery ops don't need it — the decision is past.

### UI: `ReadinessTrendIndicator` in `src/ui/map/components/OperationBriefingModal.tsx`

Compact directional signal placed between Assessment Badge and Recommendation Driver in the modal hierarchy:
1. Assessment badge
2. **Readiness trend indicator** (Wave 6) ← NEW
3. Recommendation driver (Wave 5)
4. Corps constraint context (Wave 4)
5. Order interpretation
6. Direct intervention

Visual design:
- Arrow icon (↑ improving / → stable / ↓ deteriorating) with semantic color (green/amber/red)
- One-line label explaining the trend
- Optional timeline bar with urgency coloring when ≥75% elapsed
- Silence = healthy: renders null when first-try launch

## What Did NOT Change

- **No engine changes** — pure UI-side derivation from existing persisted fields
- **No new persisted fields** — `postponement_count`, `commander_assessment`, `preparation_turns_elapsed`, `preparation_max_turns` already exist
- **No standing surface changes** — `CorpsSituationSection` already shows plan state via Wave 1's `planExplanation`
- **No changes to accepted waves 1-5** — hierarchy preserved, new component inserted between existing surfaces

## Design Decision: Derivation-Only

Considered adding `previous_commander_assessment` to CorpsOperation for richer comparison. Rejected because:
1. `postponement_count` already captures the exact same information (a postponement IS the prior assessment)
2. 'launch' → 'postpone' regression can't happen (launch sets sub_phase to 'ready', assessment isn't re-run)
3. Zero persistence change = zero save/load compatibility risk

## Orchestration

- **WS-A (Technical Architect):** Provenance/derivation audit — dispatched to verify derivation-only approach sufficiency
- **WS-B (UI/UX Developer):** Surface density audit — dispatched to verify placement doesn't overcrowd modal
- **WS-C (Gameplay Programmer):** Trend classification audit — dispatched to verify truth table completeness
- **Central integration:** All implementation done centrally after confirming the approach via own audit of `operation_preparation.ts`

## Tests

15 new Wave 16 tests in `tests/command_authority.test.ts`:
- Direction classification for all 6 combinations (nearing_launch, building, not_viable, improving, stagnating, deteriorating)
- Postponement count pluralization
- Null/undefined assessment graceful handling
- Timeline fraction computation
- Timeline urgency warnings (normal, ≥75%, final turn)
- Launch suppresses urgency warnings

## Verification

- tsc: clean
- vitest: **2206/2206 pass (0 failures)**
- vite build: clean
- governance: OK
