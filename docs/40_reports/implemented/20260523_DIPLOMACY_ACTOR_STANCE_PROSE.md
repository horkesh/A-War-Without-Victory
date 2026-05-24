# Diplomacy Actor Stance Prose

**Date:** 2026-05-23

**Scope:** UI read-model/presentation enhancement. No diplomacy mechanics, negotiation resolution, simulation behavior, scenario data, save schema, calibration/army-arc tuning, painted targets, or generated scenario output changed.

## Summary

The read-only Diplomacy panel now gives each external actor row a deterministic stance summary derived from existing support, constraint, commitment, isolation, sanctions, and patron-label bands. This turns the panel from a set of raw qualitative labels into a scan-friendly diplomatic readout without exposing formulas or adding new state authority.

## Implementation

- Added `stanceSummary` to `DiplomacyActorView`.
- `buildDiplomacyView(...)` now derives one public-safe summary per actor:
  - sanctions pressure,
  - elevated/high patron constraint,
  - strong/likely support,
  - elevated/high diplomatic isolation,
  - or a quiet-channel fallback.
- `DiplomacyPanel` renders the stance prose under each actor's qualitative bands.
- Tests cover both read-model projection and visible panel rendering, while preserving the existing player-truth guard.

## Verification

- Red test: `npx.cmd vitest run tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts --reporter=dot` failed before implementation because `stanceSummary` was absent and not rendered.
- Green focused suite: `npx.cmd vitest run tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts tests\ui\diplomacy_player_truth.test.ts tests\ui\warroom_shell_ownership.test.ts --reporter=dot` passed 10/10.

## Remaining Work

Diplomacy now has a live panel, Warroom route, negotiation timeline, needle hints, and per-actor stance prose. The remaining AAA+++ lift is deeper actor/treaty history and, if canonical state is extended, richer per-power stance causes and consequences.
