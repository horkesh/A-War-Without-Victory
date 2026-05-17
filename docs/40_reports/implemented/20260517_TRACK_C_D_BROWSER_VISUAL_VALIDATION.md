# Track C/D Browser Visual Validation

**Date:** 2026-05-17  
**Scope:** AAA+++ Phase 1 Track C map modes and Track D onboarding coachmark anchors  
**Result:** Browser validation complete for the live Turn 40 tactical shell; one coachmark geometry defect found and fixed.

## Summary

- Loaded the latest run in the tactical map at `http://127.0.0.1:3002/` and validated the Turn 40 VRS save.
- Captured live browser screenshots for Supply, Authority, and Legitimacy map modes with modal blockers dismissed.
- Verified the Decision Room and Chronicle filter coachmark targets have nonzero live browser rectangles.
- Found and fixed the Chronicle filter coachmark target: it was attached to a `display: contents` wrapper, producing a `0x0` runtime rectangle. The marker now sits on the real filter row.

## Visual Evidence

| Surface | Evidence |
|---|---|
| Supply mode | `implemented/visual_validation/20260517_track_c_supply_mode_unblocked.jpg` |
| Authority mode | `implemented/visual_validation/20260517_track_c_authority_mode_unblocked.jpg` |
| Legitimacy mode | `implemented/visual_validation/20260517_track_c_legitimacy_mode_unblocked.jpg` |
| HQ coachmark anchors | `implemented/visual_validation/20260517_track_d_hq_coachmark_anchors.jpg` |
| Chronicle filter anchor | `implemented/visual_validation/20260517_track_d_chronicle_filter_anchor.jpg` |

## Browser Findings

### Track C Map Modes

- Supply mode rendered without blocking modals and exposed the expected bottom-strip supply context.
- Authority mode rendered through keyboard shortcut `8` and exposed the expected mode label.
- Legitimacy mode rendered through keyboard shortcut `9` and exposed the expected mode label.
- Captured images were nonblank 1280x720 browser screenshots with broad channel variance, confirming canvas/rendered UI content rather than blank output.

### Track D Coachmarks

- Codex toolbar anchor is present in the live toolbar.
- Decision Room anchor is present after opening HQ with `H`, with a live browser rectangle of approximately `1246x667`.
- Chronicle filter anchor is present after opening Chronicle with `C`, with a live browser rectangle of approximately `675x24` after the fix.
- Operation Opportunity anchor did not appear in the latest Turn 40 VRS save because there were no active opportunity proposals in that save. Its render path remains covered by the Track D regression tests and by the dossier component wiring.

## Fix Applied

`src/ui/map/components/chronicle/ChronicleOverlay.tsx` now places `data-coachmark-id="chronicle-filter"` on the actual filter row:

- Before: marker on a `display: contents` wrapper, runtime rectangle `0x0`.
- After: marker on the flex row containing the filter buttons, runtime rectangle `675x24`.

## Determinism

UI-only geometry and documentation update. No simulation rule, random path, save schema, serializer, combat pipeline, scenario data, or generated scenario output changed.

## Verification

- Browser validation on the local tactical map confirmed:
  - Supply, Authority, and Legitimacy mode screenshots were captured without modal blockers.
  - Decision Room coachmark target has a nonzero live rectangle.
  - Chronicle filter coachmark target has a nonzero live rectangle after the fix.

## Follow-Up

- Track C/D visual-validation debt is closed for the latest Turn 40 browser shell.
- Opportunity coachmark visual proof still depends on a save/run with active `operationOpportunityProposals`; the current latest save does not expose that live surface.
