# HRHB Patron Directive Scope Decision Memo

**Date:** 2026-05-17
**Lane:** HRHB patron directive scope
**Status:** Design-gated; no runtime behavior change.

## Decision Required

HRHB/HVO patron pressure needs one selected interpretation before code changes:

1. **Faction-wide ceiling**: Zagreb constrains all HRHB/HVO corps equally.
2. **Per-corps ceiling**: Posavina, Central Bosnia, Herzegovina, and Tomislavgrad can carry distinct patron pressure.
3. **Hybrid**: a faction-wide default with named corps exemptions.

Selected scope: pending user decision

## Recommendation Frame

Use **hybrid** if the goal is to represent a broad Zagreb political ceiling while preserving room for region-specific HVO behavior where evidence or design needs require it.

Use **faction-wide** if the goal is lowest implementation risk and easiest calibration. This is simplest to reason about, but it may flatten Central Bosnia versus Herzegovina behavior.

Use **per-corps** only if the design needs every HRHB/HVO corps to carry independent patron-pressure state. This is the most expressive option, but it expands tests, data, and calibration burden.

## Implementation Consequences

- No code should land until the selected scope is explicit.
- Tests must assert only the selected option, not all possible options.
- Non-HRHB factions must keep prior behavior.
- Any 40w drift must be attributed to the selected scope and recorded in calibration evidence.

## Next Step

After selection, implement `tests/hrhb_patron_directive_scope.test.ts` first, verify it fails for the current behavior, then add the smallest deterministic scope helper in the directive owner identified by the test.
