# GUI Audit Dead Control Feedback

**Date:** 2026-05-22  
**Type:** Tactical-map / Army HQ UI correctness fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit Batch G found three dead-control or missing-feedback surfaces:

- Onboarding steps declared spotlight targets but the overlay never resolved target geometry or drew a highlight.
- Order Interpretation rendered an active `OVERRIDE` button that acknowledged the event through the same path as `ACCEPT`.
- Presidential decision and emergency-posture controls silently did nothing when the desktop command bridge was unavailable.

## Change

- `OnboardingOverlay` now resolves `data-tutorial-step` targets, computes a padded viewport rect, and renders a visible spotlight ring plus arrow for targeted tutorial steps.
- `OrderInterpretationPanel` no longer exposes an active override button unless a supported distinct override bridge exists. Current unsupported override events render an explicit unavailable note instead of a no-op control.
- `PresidentialAttentionPanel` now shows desktop-bridge-unavailable feedback, disables browser-only decision/personnel buttons, and sends bridge-missing attempts to `setLoadError`.
- `ArmyHQModal` keeps emergency posture visible but disabled when IPC is unavailable, shows a bridge-unavailable note, and reports missing IPC if a posture stage path is invoked without the bridge.
- Added `tests/ui/gui_audit_dead_controls.test.ts` covering spotlight rects/rendering, order override hiding, Presidential Attention bridge feedback, and Army HQ emergency posture bridge feedback.

## Verification

- Red run `npx.cmd vitest run tests\ui\gui_audit_dead_controls.test.ts --reporter=dot` failed before the patch on missing spotlight/override helpers and missing bridge feedback.
- `npx.cmd vitest run tests\ui\gui_audit_dead_controls.test.ts --reporter=dot` passed 5/5 after the patch.
- Focused surrounding suite `npx.cmd vitest run tests\ui\gui_audit_dead_controls.test.ts tests\v092_tutorial_anchor_coverage.test.ts tests\v092_tutorial_lane_e_overlay_a11y.test.ts tests\ui\emergency_posture_confirm.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\sim\command\phase4_ui_data_layer.test.ts --reporter=dot` passed 44/44.

## Remaining GUI Audit Queue

This closes GUI visual audit Batch G. Remaining 2026-05-22 GUI audit batch: H polish/cleanup.
