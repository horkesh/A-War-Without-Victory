# Orchestrator: Absorption of Recent Changes and Canon Update

**Date:** 2026-02-13  
**Role:** Orchestrator  
**Scope:** Absorb docs/40_reports from recent sessions (combat resolution, brigade recruitment, AoR/strength, tactical map, no-flip, etc.); verify canon alignment and apply necessary canon updates.

---

## 1. Reports Absorbed (40_reports)

| Report | Summary |
|--------|---------|
| **battle_resolution_engine_report_2026_02_12.md** | Multi-factor battle resolution: terrain scalars, equipment/experience/cohesion/posture/supply/corps/operations/OG/resilience/disruption; casualty ledger (KIA/WIA/MIA + equipment); 1.3× victory threshold; four snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade); Pyrrhic Victory. Replaces fixed 40/60 casualty placeholder. |
| **combat_balance_and_corridor_ai_refactor_pass_2026_02_12.md** | Strategic target selection (scoreTarget), RS corridor defense AI (Posavina), faction-specific posture limits, equipment in combat resolution, Phase I consolidation 4→8 turns, pipeline wiring for sidToMun. |
| **ongoing_recruitment_implementation_report_2026_02_11.md** | Phase II accrual (equipment from production/embargo/trickle, capital from org inputs/trickle); runOngoingRecruitment with elective cap; phase-ii-recruitment pipeline step; determinism and tests. Systems Manual §13 already updated. |
| **recruitment_system_implementation_report.md** | Three-resource brigade activation at Phase I entry; ongoing Phase II accrual + recruitment; reference for canon §13. |
| **recruitment_system_design_note.md** | Design and formulas for recruitment; extended window implemented. |
| **BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md** | Confirmed casualties applied (personnel &lt; 3000 in final save); 229 AoR root cause = ensure step concentrating muns on one brigade; MAX_MUNICIPALITIES_PER_BRIGADE (8) added. |
| **803rd_light_223_settlements_investigation.md** | AoR ownership vs operational coverage cap; ensure step restricted to home muns (2026-02-11); cap 8 muns (2026-02-13). |
| **ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md** / **2026_02_13.md** | Scenario run handoffs; phase_ii_attack_resolution in run_summary; no-flip semantics clarified. |
| **PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md** | Military-action-only semantics; player_choice GO for recruitment-centric; ethnic/hybrid NO-GO default. |
| **PARADOX_ETHNIC_INITIAL_CONTROL_CONVENE.md** | init_control_mode: institutional | ethnic_1991 | hybrid_1992. |
| **refactor_pass_2026_02_11_brigade_aor.md** | Brigade AoR refactor (ensure step, home muns only). |
| **municipality_supra_layer_implementation_report.md** | brigade_municipality_assignment → brigade_aor derivation; sync order. |

---

## 2. Canon Update Mapping

### 2.1 Phase II Specification v0.5.0

- **§5 Phase II Turn Structure**  
  **Gap:** Pipeline list omits **phase-ii-resolve-attack-orders**, **phase-ii-brigade-reinforcement**, **phase-ii-recruitment** (and possibly **phase-ii-aor-sync** if run after reshape). Implementation (turn_pipeline.ts) runs resolve-attack-orders and brigade-reinforcement between pressure and consolidation; recruitment runs in Phase II when recruitment_state exists.  
  **Update:** Add these steps to the ordered list so canon matches implementation.

- **§12 Stubs / Known Limitations**  
  **Outdated:** "Equipment capture in Phase II exists but is not yet wired into the Phase II settlement control resolution pipeline" and "Urban defense bonus (e.g. Sarajevo, Tuzla) is not yet included in the resilience module."  
  **Reality:** Battle resolution (2026-02-12) wires equipment losses and capture into resolve_attack_orders; urban/Sarajevo bonus is in terrain modifier.  
  **Update:** Revise §12 to state that Phase II attack resolution includes battle resolution with terrain (including urban/Sarajevo), personnel/equipment losses, casualty ledger, and equipment capture on surrender; JNA transfer and OG donor proportionality remain unimplemented as stated.

### 2.2 Systems Manual v0.5.0

- **§7 Combat interaction and pressure**  
  **Current:** "Combat is resolved as pressure exchange rather than discrete battles."  
  **Reality:** Phase II resolves **attack orders** as discrete engagements: power ratio (≥1.3 victory), terrain modifier, casualty model (KIA/WIA/MIA, equipment losses), cumulative casualty_ledger, snap events. Pressure/density still feed into combat power.  
  **Update:** Add a subsection (e.g. §7.4) stating that in Phase II, attack orders are resolved as discrete battles: combat power (garrison × equipment × experience × cohesion × posture × supply × terrain × corps × operations × OG × resilience × disruption), outcome threshold, per-engagement and cumulative casualties, and optional snap events; casualty_ledger is persisted. Retain §7 pressure/diffusion/exhaustion language for the pressure substrate.

- **§13 Recruitment**  
  Already updated per ongoing_recruitment_implementation_report (initial + ongoing, accrual, trickles, cap). No change needed.

### 2.3 Engine Invariants v0.5.0

- **§13 Derived state / serialization**  
  casualty_ledger is **persisted** (canonical state), not derived. No change to §13.1 (derived states not serialized). If Invariants list top-level state, casualty_ledger can be noted as canonical state; otherwise no edit required.

### 2.4 context.md and CANON.md

- **context.md "Implementation references"**  
  Add battle resolution: e.g. "Battle resolution (Phase II): docs/40_reports/battle_resolution_engine_report_2026_02_12.md — multi-factor combat, terrain, casualty ledger, snap events; canon updated in Phase II §5, §12 and Systems Manual §7."
- **CANON.md "See Also"**  
  Add reference to battle_resolution_engine_report_2026_02_12.md alongside BRIGADE_OPERATIONS and recruitment_system_implementation_report.

### 2.5 FORAWWV.md

- **No auto-edit.** If design insight arises (e.g. "discrete battles vs pressure-only"), flag only:  
  **docs/10_canon/FORAWWV.md may require an addendum** about Phase II combat being modeled as discrete battles with cumulative casualties while pressure remains the substrate for eligibility and scaling. Do NOT edit FORAWWV automatically.

---

## 3. Changes Applied (Canon Edits)

The following edits were applied to align canon with implemented behavior:

1. **Phase_II_Specification_v0_5_0.md** — §5: Added phase-ii-resolve-attack-orders, phase-ii-brigade-reinforcement, and (when recruitment_state present) phase-ii-recruitment to the pipeline list; §12: Updated stubs to reflect battle resolution (terrain, urban bonus, equipment/capture, casualty ledger) and to leave only JNA transfer, OG donor proportionality, bot AI limits, maintenance as not yet implemented.
2. **Systems_Manual_v0_5_0.md** — §7: Added subsection describing Phase II attack-order resolution as discrete battles (combat power, outcome threshold, casualties, casualty_ledger, snap events), with reference to battle_resolution_engine_report.
3. **context.md** — Implementation references: added battle resolution bullet.
4. **CANON.md** — See Also: added battle_resolution_engine_report_2026_02_12.md.

---

## 4. Subagents Used

- **Canon compliance reviewer:** Used to map behavioral changes to canon clauses and identify gaps (Phase II turn structure, §12 stubs, Systems Manual §7).
- **Documentation specialist / docs-only-ledger:** Canon edits documented here; ledger entry appended for doc-only canon update.

---

## 5. Summary

Recent 40_reports (battle resolution, combat balance/corridor AI, ongoing recruitment, AoR/strength investigation, no-flip, ethnic init, tactical map) were absorbed. Canon was updated so that:

- **Phase II Specification** reflects the full turn pipeline (attack resolution, reinforcement, recruitment) and corrected stubs (battle resolution and urban/equipment/casualty implemented).
- **Systems Manual** §7 now describes Phase II discrete battle resolution and casualty tracking alongside the pressure substrate.
- **context.md** and **CANON.md** point to the battle resolution implementation report.

No change to FORAWWV.md; addendum may be considered separately for discrete-battles vs pressure-only design framing.
