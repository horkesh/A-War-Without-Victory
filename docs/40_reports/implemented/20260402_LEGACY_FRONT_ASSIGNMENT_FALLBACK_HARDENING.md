# 2026-04-02 Legacy Front Assignment Fallback Hardening

## Summary

Hardened the remaining legacy `brigade_front_assignment` fallback so stale entries no longer silently influence frontline truth, then removed the redundant end-of-turn repair pass that only existed to keep that old map looking alive.

## Problem

After sectors became the real frontline authority, the old front-assignment lane survived mostly as compatibility state. But `buildFrontlineAssignedFormationSet(...)` still trusted every non-null legacy entry, even if:

- the `front_id` no longer existed in `assignable_front_segments`
- the formation was no longer active

That made the engine overly dependent on `ensureBrigadeFrontAssignments(...)` repair passes just to keep the fallback map from poisoning frontline truth.

There was also a duplicate repair path at end-of-turn in `refreshFrontEdgeSnapshot(...)`, even though the war pipeline already has an explicit `ensure-brigade-front-assignment` phase.

## What Changed

### 1. Validate legacy fallback entries before trusting them

In `src/sim/combat/front_assignment.ts`:

- legacy fallback now only counts brigades whose `front_id` still exists in `assignable_front_segments`
- inactive formations are ignored even if they still have stale legacy entries

This makes the helper itself more honest and reduces dependence on global repair passes.

### 2. Remove redundant end-of-turn assignment repair

In `src/sim/turn_pipeline.ts`:

- `refreshFrontEdgeSnapshot(...)` no longer calls `ensureBrigadeFrontAssignments(...)`
- it now only refreshes front-edge-derived segment state and clears `local_fronts`

The explicit compatibility repair step still exists in the war pipeline, but the engine no longer performs a second cleanup pass at turn end just to preserve the old lane.

## Verification

- `node_modules\.bin\tsx.cmd --test tests\front_assignment.test.ts tests\local_front_density_modifier_precedence.test.ts tests\formation_fatigue_frontline_assignment.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

- inspect whether `ensureBrigadeFrontAssignments(...)` itself can be narrowed further now that sectors own frontline truth and end-of-turn refresh no longer depends on it
- keep auditing comments/docs that still describe `brigade_front_assignment` as live authority rather than fallback compatibility state
