## 2026-11-26 — G1 follow-up: REPLACE-CO seats the President's pick; a named appointee stops acting after RELIEF_ACTING_DURATION

Authority: owner ruling G1 and the orchestrator's 2026-11-26 ruling on the #872 register items (both MUST-FIX; queueReplacementMatter deleted).

**Change.**
- `applyCoReplacements` (`war_phases.ts`) passes the staged `replacement_officer_id` to `relieveOfficer` (`order_interpretation.ts`). `relieveOfficer` seats the pick when it is still in the eligible candidate list: same faction, corps_commander, in reserve, enclave-compatible. Otherwise the ranking picks, and `co_replacement_record` carries `requested_officer_id` and `pick_fallback`, two optional fields written only then. Before, the engine ignored the President's explicit pick.
- `processOfficerSuccession` step 4 clears `acting_commander` for a named presidential appointee once `turns_in_command >= RELIEF_ACTING_DURATION`. Before, a REPLACE-CO seat stayed acting for the whole war. Generic stopgaps are unchanged.
- `queueReplacementMatter`, its matcher and its key builder are removed (no caller). The `isPresidentialAppointee` reader of acknowledged `replacement_suggested` records stays, for save compatibility.
- Canon: Engine Invariants §15.1 (the pick rule, the acting duration, line references). Two-seat panel, unanimous. FORAWWV unchanged. The strict-null inventory pin is 624 → 626 (sim 378 → 380).

**Measured.** Headless never stages a REPLACE-CO, so the headless pair is unchanged by construction. The PR body lists the measured pair and the live RBiH a2 hist and a2 emer cells.
