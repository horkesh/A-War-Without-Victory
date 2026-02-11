# A War Without Victory -- Engine Invariants v0.4.0
 
 One game turn equals one week.
 
## Scope and inheritance
This document **supersedes** the prior Engine Invariants version and incorporates all earlier invariants by reference unless explicitly overridden or extended below.
 
## v0.4 Additions and Extensions (Systems 1-11)
 
 ### A. Legitimacy and Control
 - Legitimacy is distinct from political control and authority; control does not imply legitimacy.
 - Legitimacy must never increase as a direct consequence of military success.
 - Authority consolidation requires control and sufficient legitimacy; low legitimacy caps authority at Contested.
- Legitimacy erosion is easier than recovery and must be gradual and deterministic.
 
 ### B. AoR Assignment
 - Every **front-active** settlement must be assigned to exactly one brigade AoR.
 - Rear Political Control Zones may have no AoR and must not generate pressure.
 - AoR assignment does not confer political control.
 - AoR assignment is prohibited in Phase I.
- AoR assignment must be exclusive (no settlement assigned to multiple brigades).
- AoR must match political control (no opposing brigade ownership).
- Pressure generation is invalid from settlements with no AoR.
 
 ### C. External Patron Pressure and IVP
 - Patron state and international visibility pressure (IVP) are deterministic functions of turn index and state.
 - IVP accumulation must be monotonic when inputs worsen; decay is allowed only if defined explicitly.
 - External patron systems constrain options; they may not directly confer victory or create control flips.
- IVP triggers are limited to explicit events (Sarajevo siege visibility, enclave humanitarian pressure, atrocity visibility).
- Patron commitment changes are time-indexed and cannot be player-directed.
 
 ### D. Arms Embargo Asymmetry
 - Embargo profiles are deterministic and faction-specific.
 - Smuggling progression is deterministic and time-indexed.
 - Embargo effects are differential (never binary on/off) and must not be bypassed.
- Ammunition and equipment ceilings must be enforced by embargo profiles.
 
 ### E. Heavy Equipment Degradation
 - Heavy equipment is a wasting asset; degradation is monotonic absent explicit repair rules.
 - Maintenance can slow degradation but cannot restore non-operational equipment without explicit repair allocation.
 - Equipment state is serializable and auditable per turn.
- Operational tempo must influence degradation deterministically.
 
 ### F. Enclave Integrity
 - Enclaves are detected deterministically via settlement connectivity.
 - Enclave integrity decays under siege conditions; integrity decay is monotonic unless explicit relief rules apply.
 - Enclave humanitarian pressure must be accumulated deterministically and feed IVP.
- Enclave collapse triggers must be deterministic and auditable.
 
 ### G. Sarajevo Exception
 - Sarajevo has special integrity floors and visibility multipliers as specified in v0.4 systems.
 - Sarajevo siege visibility must feed IVP deterministically.
 - Treaties must address Sarajevo control explicitly; omission is an invariant violation.
- Sarajevo supply uses a dual-channel model; external supply cannot reach zero.
 
 ### H. Negotiation Capital and Territorial Valuation
 - Negotiation capital is deterministic, auditable, and spendable.
 - Territorial valuation must be deterministic; “liabilities are cheaper” asymmetry is enforced.
 - Required clauses (e.g., Brcko, Sarajevo) and competence bundles are enforced deterministically.
- Treaties omitting required clauses are rejected deterministically, regardless of acceptance score.
- Acceptance must be computed, not chosen by player action.
- Negotiation capital spending must never reduce exhaustion or violate monotonic exhaustion rules.
 
 ### I. Tactical Doctrines and Posture Eligibility
 - Posture eligibility rules (INFILTRATE, ARTILLERY_COUNTER, COORDINATED_STRIKE) are deterministic.
 - Doctrines must not override supply, equipment, or exhaustion invariants.
- Doctrine postures may be temporarily disabled when eligibility gates are not met.
 
 ### J. Capability Progression
 - Capability progression is deterministic and time-indexed; no randomness.
 - Progression curves may shift capabilities but must not violate determinism or exhaustion monotonicity.
- Milestone events (e.g., Washington Agreement, Drina blockade) must be deterministic. Milestones may be **time-indexed** (fire at a deterministic turn derived from scenario start), **precondition-driven** (fire when all preconditions are met, where each precondition is a deterministic function of state), or **hybrid** (preconditions with a time gate). All milestone evaluation must be a pure function of game state with no randomness.
- The **Washington Agreement** milestone is precondition-driven: it fires when ceasefire duration, IVP momentum, patron constraint, RS territorial threat, and combined RBiH–HRHB exhaustion all exceed their respective thresholds (see Phase I §4.8 for details). When it fires, the RBiH–HRHB alliance state is set to a post-federation value and locked.
- The **RBiH–HRHB bilateral ceasefire** is precondition-driven: it fires when war duration, mutual exhaustion, stalemate, IVP, and patron constraint thresholds are all met (see Phase I §4.8).
 
 ### K. Contested Control Initialization
 - Initial political control must include stability-based control status (SECURE/CONTESTED/HIGHLY_CONTESTED).
 - Control status derives from Phase 0 stability calculations and carries into Phase I.
- Control status affects early-war flip resistance and authority initialization.
