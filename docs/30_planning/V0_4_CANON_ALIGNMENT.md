# v0.4 Canon Alignment Blueprint (Systems 1-11)
 
 ## Purpose
Define the doc-only integration plan to align all canon documents to v0.4 by incorporating Gap Systems 1-11 (from the gap implementation and addendum). This is a blueprint for doc updates and roadmap gating, not a mechanics or code change.
 
 ## Inputs
 - Gap systems specs: `docs/AWWV_Gap_Systems_Implementation_v1_0_0.md`, `docs/AWWV_Gap_Systems_v2_0_Addendum.md`
 - Current canon index: `docs/CANON.md`
 - Code canon rules: `docs/20_engineering/CODE_CANON.md`
 - Current roadmap: `docs/30_planning/ROADMAP_v1_0.md`
 - Missing systems synthesis: `docs/missing_systems_roadmap.md`
 
## Canon delta matrix (v0.3 -> v0.4)
 Each system must be incorporated across all canon layers: Engine Invariants, Phase Specs, Systems Manual, Rulebook, Game Bible, and Phase 0/Phase I specs where applicable. This table identifies required touchpoints.
 
 | System | Engine Invariants | Phase Specs | Phase 0 | Phase I | Systems Manual | Rulebook | Game Bible |
 | --- | --- | --- | --- | --- | --- | --- | --- |
 | 1. External Patron Pressure + IVP | Add invariants for deterministic IVP and patron state | Add turn-order hooks for IVP accumulation | Optional: pre-war patron baseline init | Add integration with exhaustion/negotiation | Full mechanics + state schema | Player-facing effects on constraints | Rationale: external constraints, not agency |
 | 2. Arms Embargo Asymmetry | Deterministic embargo state and progression | Add equipment-access hooks | Optional: pre-war baseline values | Early-war equipment constraints | Full mechanics + formulas | Player-facing asymmetry notes | Design rationale for asymmetry |
 | 3. Heavy Equipment + Maintenance | Irreversible degradation invariant | Posture/tempo integration points | Optional: pre-war equipment baseline | Early-war sustainment impacts | Full mechanics + state schema | Player-facing sustainability impact | Rationale: wasting assets |
 | 4. Legitimacy System | Control/authority/legitimacy separation invariants | Authority + pressure resistance hooks | Legitimacy initialization from stability | Control flips and authority consolidation gating | Full mechanics + formulas | Player-facing legitimacy meaning | Rationale: governance vs occupation |
 | 5. Enclave Integrity | Enclave detection + integrity monotonicity invariants | Turn-order hooks for detection + decay | N/A | N/A | Full mechanics + state schema | Player-facing enclave costs | Rationale: political liability |
 | 6. Sarajevo Exceptions | Special-case invariants (floors, visibility) | Turn-order hooks for Sarajevo state | N/A | N/A | Full mechanics + state schema | Player-facing red-line effects | Rationale: symbolic exception |
 | 7. Negotiation Capital + Territorial Valuation | Acceptance constraints + capital determinism | Treaty pipeline hooks | Optional: pre-war capital baselines | Integration with exhaustion/pressure | Full mechanics + state schema | Player-facing negotiation logic | Rationale: liabilities cheaper |
 | 8. AoR Assignment Formalization | AoR invariants (front-active must be assigned) | Front/AoR ordering constraints | N/A | AoR prohibited in Phase I | Full mechanics + state schema | Player-facing front responsibility | Rationale: responsibility not ownership |
 | 9. Tactical Doctrines | Posture eligibility invariants | Posture interaction hooks | N/A | Early-war posture gating | Full mechanics + posture matrices | Player-facing doctrinal effects | Rationale: asymmetric tactics |
 | 10. Capability Progression | Deterministic time-based progression invariant | Turn-order hooks for progression | Optional: pre-war baseline values | Early-war capability drift | Full mechanics + curves | Player-facing progression cues | Rationale: evolving capability |
 | 11. Contested Control Init | Control-status initialization invariant | Phase 0 -> Phase I handoff rule | Stability-based control status | Early-war flip resistance rules | Full mechanics + schema | Player-facing control status meanings | Rationale: institutional fragility |
 
 ## Doc-by-doc integration outline
 This section lists where each canon document must be updated to v0.4. It does not draft the text, but defines the required insertions and edits.
 
 ### Engine Invariants (v0.4)
 - Add invariants for: legitimacy distinct from control/authority, AoR assignment rules, equipment degradation irreversibility, enclave integrity monotonicity, Sarajevo exception floors, deterministic patron/IVP, deterministic capability progression, stability-based contested control initialization, and posture eligibility constraints.
 - Preserve determinism and serialization rules; all new state is serializable and derived state remains non-serialized.
 
 ### Phase Specifications (v0.4)
- Insert turn-order hooks for Systems 1-11 in the resolution pipeline (IVP accumulation, embargo adjustments, equipment degradation, legitimacy updates, enclave detection, Sarajevo updates, negotiation capital, AoR validation, doctrines, capability progression, contested control initialization).
 - Explicitly prohibit AoR instantiation in Phase I; define when AoR becomes available (post-Phase I).
 
 ### Phase 0 Specification (v0.4)
 - Integrate System 11 stability-based contested control initialization.
 - Define patron baseline, embargo baseline, and capability baseline if needed at pre-war start.
 
 ### Phase I Specification (v0.4)
 - Apply contested control effects to early-war flip resistance and authority state.
 - Add eligibility gates for tactical doctrines and early-war capability progression deltas.
 
 ### Systems Manual (v0.4)
- Full system specs for Systems 1-11, including state fields, formulas, and integration points.
 - Explicit cross-system dependencies (IVP -> negotiation/exhaustion; embargo -> equipment; legitimacy -> authority/recruitment).
 
 ### Rulebook (v0.4)
 - Player-facing explanations for new systems, focusing on effects and constraints.
 - Explicit statement that external actors constrain options; no direct player control.
 
 ### Game Bible (v0.4)
 - Rationale and design constraints for new systems.
 - Reinforce negative-sum dynamics, determinism, and non-victory outcomes.
 
 ### CANON index (v0.4)
 - Update canon list to point to v0.4 document versions once created.
 - Confirm precedence order remains unchanged.
 
 ## Code vs canon alignment notes (to resolve after doc updates)
 These are reconciliation items to address after v0.4 docs are aligned.
 
 - Negotiation capital exists in code; v0.4 canon adds explicit capital and territorial valuation mechanics. Compare current formulas in `src/state/treaty_acceptance.ts` and `src/state/territorial_valuation.ts` against v0.4 specs for alignment deltas.
 - Current political control and authority implementations should be checked for explicit legitimacy and AoR invariants once v0.4 is defined.
 - Capability progression and doctrine postures are not in code; ensure any future implementation follows deterministic turn-index curves.
 
 ## Ledger and ADR checklist (doc phase)
 - Ledger entry for v0.4 canon alignment (doc-only) with references to changed canon docs.
 - ADRs required when canon changes affect determinism contract, precedence rules, or canonical entrypoints (per `docs/20_engineering/CODE_CANON.md`).
 - FORAWWV: only flag required addenda; do not auto-edit FORAWWV.
 
 ## Roadmap gating expectation
A docs-only v0.4 canon alignment phase must precede any implementation phases that rely on Systems 1-11.
