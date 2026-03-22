# Operation Storm — Design (Planning)

Design-only document for the late-war intervention commonly known as Operation Storm (Oluja). Implementation will follow canon adoption; no code in this phase.

## Purpose

Define **conditions** (when Storm can trigger) and **effects** (high-level what changes) so that a future Phase II pipeline precondition step can be added in the same pattern as the Washington Agreement check.

## Conditions (preconditions for implementation)

All of the following are intended as concrete preconditions (AND) for when Operation Storm may trigger. Exact thresholds and state fields are to be refined at implementation time.

1. **Washington Agreement active (or signed):** RBiH–HRHB alignment and Washington milestone must be in effect (same conceptual gate as Phase II Washington check). Storm is a post–Washington Agreement development.
2. **RS/VRS threat level or territorial share:** Republika Srpska / VRS territorial control or military threat meets a scenario- or state-defined threshold (e.g. share of settlements, front length, or threat index).
3. **Exhaustion:** Faction-level or combined exhaustion meets a threshold (e.g. HRHB or RBiH exhaustion high enough to motivate external/Croat intervention).
4. **IVP (international visibility pressure):** International visibility pressure (or equivalent) meets a threshold so that the intervention is politically plausible in the simulation.

**Historian note:** The knowledge base does not yet contain a dedicated Storm narrative. Balkan Battlegrounds (BB1) index points to pp. 268–279, 365–379, 391–392, 412–416 for Oluja/Storm. **Historical preconditions and outcomes are to be refined after BB extraction from those BB1 Storm pages.** This design doc should be updated when historical extraction is available.

## Effects (high-level)

When Storm triggers (design intent):

- **HRHB/Croat intervention against RS:** Shift in front priorities, possible offensive posture or territorial objectives against RS/VRS.
- **Narrative/event:** Player-facing event or milestone reflecting the operation.
- **State implications:** Implementation may add state flags, front-priority changes, or exhaustion/IVP modifiers; exact state mutations are left to implementation design.

No total victory or automatic control flip is implied; Storm is a conditional late-war shift, consistent with Phase II Spec §11.2 (War Termination) and Rulebook/Game Bible.

## Implementation note

When implemented, add a **precondition-check step** in the Phase II pipeline (same pattern as Washington Agreement): a dedicated step that evaluates the conditions above and, if met, applies the effects (state updates, narrative, and/or front-priority changes). Reference: Phase II Spec §11.2; phase-ii-washington-check as the pattern to follow.

**Implemented (Pipeline 2.4, 2026-02-25):** Phase II Spec §11.3 added; pipeline step **phase-ii-operation-storm-check** runs after phase-ii-washington-check. Preconditions: Washington active, RS territorial share ≥ STORM_RS_THREAT_SHARE (0.35), combined RBiH+HRHB exhaustion ≥ STORM_COMBINED_EXHAUSTION (60), IVP negotiation_momentum ≥ STORM_IVP_MOMENTUM (0.55). Effect: sets state.meta.operation_storm_triggered. Thresholds are Architect-decided; flag for user review. See implementation report docs/40_reports/implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md.

## References

- Phase II Specification v0.5.0 §11.2 War Termination and End-Game
- Phase II pipeline: phase-ii-washington-check (precondition pattern)
- Historian / BB: BB1 Oluja/Storm pages (to be extracted)
