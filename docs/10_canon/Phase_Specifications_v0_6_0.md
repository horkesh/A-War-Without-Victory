# A War Without Victory — Phase Specifications v0.6.0

## v0.6.0 phase model: Peace and War only

The simulation has exactly two lifecycle phases:

- **Peace** (Pre-War): Organizational preparation, referendum gate, investment. See [Peace_Specification_v0_6_0.md](Peace_Specification_v0_6_0.md).
- **War**: Sustained conflict with fronts, OSID location, ZoC, attack resolution, supply, exhaustion. See [War_Specification_v0_6_0.md](War_Specification_v0_6_0.md).

There is no separate "Phase I" or "Phase II". Canonical April 1992 scenarios start directly in **War**. War start is referendum-gated (CANON.md War Start Rule).

One game turn equals one week.

## Document purpose

This document is the index for the two-phase (Peace/War) lifecycle. Each phase specification includes purpose, canonical inputs, mechanical behavior, output contract, and determinism requirements.

## Frozen subsystems (not lifecycle phases)

Phase 3A (Pressure Eligibility), Phase 3B (Pressure → Exhaustion Coupling), and Phase 3C (Exhaustion → Collapse Gating) remain design-frozen **subsystems** referenced by the Systems Manual. They are not lifecycle phases; they integrate into the War phase when enabled.

## v0.6 Canon consolidation

This document (v0.6.0) replaces the three-phase lifecycle (Phase 0, Phase I, Phase II) with the two-phase model (Peace, War). Supersedes Phase_Specifications_v0_5_0.md and all Phase_0/Phase_I/Phase_II specs. Deprecated docs are in docs/_old/10_canon/.

---

*Phase Specifications v0.6.0 — Peace and War only*
