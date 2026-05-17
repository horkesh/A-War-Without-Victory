# HRHB Patron Directive Scope Decision Memo

**Date:** 2026-05-17
**Lane:** HRHB patron directive scope
**Status:** Recommendation accepted; ready for runtime implementation plan execution.

## Decision Required

HRHB/HVO patron pressure needs one selected interpretation before code changes:

1. **Faction-wide ceiling**: Zagreb constrains all HRHB/HVO corps equally.
2. **Per-corps ceiling**: Posavina, Central Bosnia, Herzegovina, and Tomislavgrad can carry distinct patron pressure.
3. **Hybrid**: a faction-wide default with named corps exemptions.

Recommended scope: **hybrid**. Keep a faction-wide Zagreb patron ceiling as the default, with a small deterministic table of named HVO/OZ exceptions where the historical record or calibration evidence requires different local behavior.

Approval status: accepted 2026-05-17. Implement the hybrid scope in `docs/plans/2026-05-17-hrhb-patron-directive-scope-plan.md`.

## Research Basis

- Zagreb belongs in the default layer: Balkan Battlegrounds describes Croatian state involvement in Bosnian Croat organization, arming, and deployment decisions, which supports a broad patron ceiling rather than purely local pressure. Source: BB1 p.180.
- Regional behavior was not uniform: Herzegovina and Posavina carry different evidence patterns for HV/HVO activity, and the local OOB canon models HVO as operational zones rather than ordinary corps. Sources: BB1 p.180; `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md`.
- Posavina needs exemption capacity: Bosanski Brod/Odzak and Orasje/Brcko evidence includes HVO, HV, and Bosnian Army pressure against VRS/corridor objectives that a flat ceiling could suppress. Sources: BB1 p.182, BB1 p.219.
- Central Bosnia and northern Herzegovina need local tension capacity: mixed Croat-Muslim areas had collocated forces, competing control, and chain-of-command friction, so local overrides are historically safer than a single all-HRHB modifier. Source: BB1 p.225.
- Full per-corps patron state overfits the current evidence and expands calibration risk without enough benefit.

## Recommendation Frame

Use **hybrid**. It represents Zagreb as a real faction-level constraint while preserving historically important regional variation.

Use **faction-wide** if the goal is lowest implementation risk and easiest calibration. This is simplest to reason about, but it may flatten Central Bosnia versus Herzegovina behavior.

Use **per-corps** only if the design needs every HRHB/HVO corps to carry independent patron-pressure state. This is the most expressive option, but it expands tests, data, and calibration burden.

## Implementation Consequences

- No code should land until the selected scope is explicit.
- Tests must assert only the selected option, not all possible options.
- Non-HRHB factions must keep prior behavior.
- Any 40w drift must be attributed to the selected scope and recorded in calibration evidence.

## Next Step

Implement `tests/hrhb_patron_directive_scope.test.ts` first, verify it fails for the current behavior, then add the smallest deterministic scope helper in the directive owner identified by the test. The first implementation should cover only default HRHB behavior, named exception lookup, non-HRHB no-op behavior, and calibration drift attribution.
