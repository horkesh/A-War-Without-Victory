# A War Without Victory — Phase Specifications v0.7.3

## v0.7.3 phase model: War only

The simulation has a single lifecycle phase:

- **War**: Sustained conflict with fronts, OSID location, attack resolution, supply, exhaustion, frontage cap, local front density. *(ZoC removed 2026-03-02.)* See [War_Specification_v0_6_0.md](War_Specification_v0_6_0.md).

All canonical scenarios start in April 1992 directly in **War** phase. There is no pre-war or peace phase.

Early-war mechanics (militia emergence, JNA dissolution, pool population, alliance updates) run as part of the war-phase pipeline during the first ~12 weeks. See `src/sim/turn_phases/early_war_phases.ts`.

One game turn equals one week.

## Document purpose

This document is the index for the single-phase (War) lifecycle. The phase specification includes purpose, canonical inputs, mechanical behavior, output contract, and determinism requirements.

## Frozen subsystems (not lifecycle phases)

Phase 3A (Pressure Eligibility), Phase 3B (Pressure to Exhaustion Coupling), and Phase 3C (Exhaustion to Collapse Gating) remain design-frozen **subsystems** referenced by the Systems Manual. They are not lifecycle phases; they integrate into the War phase when enabled.

## v0.7.3 Canon audit

This document (v0.7.3) replaces the two-phase model (Peace, War) with a single-phase model (War only). The peace phase and September 1991 start date have been removed. The former `Peace_Specification_v0_6_0.md` is archived. Supersedes Phase_Specifications_v0_6_0 two-phase index.

---

*Phase Specifications v0.7.3 — War only*
