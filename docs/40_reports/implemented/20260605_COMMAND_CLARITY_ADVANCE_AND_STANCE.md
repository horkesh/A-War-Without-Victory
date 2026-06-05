# Command Clarity: Advance Gate and Corps Stance Cleanup

**Date:** 2026-06-05

## Summary

The player-command shell now has clearer pre-advance blocking and no longer exposes the left OOB corps-card stance combobox as a fake direct-control surface.

## Changes

- `AdvanceTurnModal` now refuses the final advance action while pre-advance review is blocked or direct presidential blockers remain.
- The blocked modal shows an explicit blocker panel and an `Open review` route into the existing pre-advance review path.
- `OOBSidebar` no longer maintains local corps stance overrides.
- `CorpsCard` keeps the stance visible as a read-only badge when no real command handler is supplied, while preserving ORBAT access.

## Non-Goals

- No corps stance mechanics changed.
- No Army HQ command-relationship, autonomy, or sector stance mechanics changed.
- No simulation turn logic, save schema, migration, scenario data, baseline manifest, generated artifact, randomness, timestamps, or persisted output changed.

## Verification

- `npx.cmd vitest run tests/ui/advance_turn_button_gated_feedback.test.ts tests/ui/gui_audit_dead_controls.test.ts tests/ui/accessibility_form_labels.test.ts tests/ui/accessibility_clickable_controls.test.ts --reporter=dot`

