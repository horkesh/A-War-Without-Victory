# GUI Audit Event Modal Dismissal

**Date:** 2026-05-22  
**Type:** Tactical-map modal hygiene fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit identified non-decision event notifications as modal-hygiene debt: the event dispatch surface could only be dismissed through its explicit acknowledgement button and did not inherit the shared modal semantics used elsewhere.

That made the surface inconsistent with the rest of the tactical shell: Escape and backdrop dismissal were absent, and the event dispatch was not exposed as a labelled dialog.

## Change

- Migrated `EventModal` from the bespoke `GlassPanel` overlay path to an explicit modal-style overlay with the same dismissal semantics.
- Kept the existing dispatch-paper body and acknowledgement button.
- Routed the acknowledgement button, Escape key, close affordance, and backdrop click through the same `onAcknowledge` path.
- Added a labelled dialog contract via `aria-labelledby="event-modal-title"`.
- Added a jsdom regression covering button, Escape, backdrop, and labelled-dialog behavior.

## Verification

- Red run `npx.cmd vitest run tests\ui\event_modal_dismissal.test.ts --reporter=dot` failed before the patch because Escape did not acknowledge and no labelled dialog existed.
- `npx.cmd vitest run tests\ui\event_modal_dismissal.test.ts --reporter=dot` passed 2/2 after the patch.

## Remaining GUI Audit Queue

This closes the event-notification dismissal/focus-semantics slice from audit Batch C. The broader 2026-05-22 GUI visual audit remains active for Vance-Owen peace-meter semantics, stacked stale peace modals, modal palette unification, stale-state resets, Warroom chrome scoping, no-op control feedback, onboarding spotlight/bridge-unavailable feedback, and polish cleanup.
