# A War Without Victory -- Phase Specifications v0.4.0
 
## Scope and inheritance
This document **supersedes** the prior Phase Specifications version and incorporates all earlier phase specifications by reference unless explicitly overridden or extended below.
 
## v0.4 Additions (Systems 1-11 integration)
 
 ### Global turn-order hooks (applies to all war phases unless stated)
 1. **Capability Progression (System 10):** update faction capability profiles deterministically by turn index.
 2. **Patron + IVP (System 1):** update patron_state and international_visibility_pressure.
 3. **Arms Embargo (System 2):** update embargo profiles and equipment access ceilings.
 4. **Heavy Equipment (System 3):** apply degradation and maintenance actions.
 5. **Legitimacy (System 4):** update legitimacy scores and apply effects.
 6. **Enclaves (System 5):** detect enclaves, compute integrity, update humanitarian pressure.
 7. **Sarajevo (System 6):** update Sarajevo-specific siege state and visibility.
 8. **Negotiation Capital (System 7):** update capital and territorial valuation inputs.
 9. **AoR (System 8):** assign/validate AoR **only outside Phase I**; front-active settlements require AoR.
 10. **Tactical Doctrines (System 9):** evaluate posture eligibility and apply doctrine modifiers.
 11. **Contested Control (System 11):** initialize or update control_status from stability where applicable.
 
 ### Phase 0 (Pre-War) integration
 - Initialize stability-based control_status (System 11) using Phase 0 stability calculation.
 - Initialize patron, embargo, and capability baselines if defined for pre-war start.
 
 ### Phase I (Early War) integration
 - Apply control_status to early-war flip resistance and authority state.
 - Tactical doctrine eligibility is constrained by early-war capability and supply.
 - AoR assignment remains prohibited in Phase I.
 
### Phase II+ (Post-Phase I) integration
 - AoR assignment and enforcement are enabled for front-active settlements.
 - Doctrine postures interact with pressure and equipment degradation as defined in Systems Manual v0.4.
- Front-active definition (for AoR eligibility): adjacency to opposing control, pressure-eligible edges, contested corridors, enclave membership, or contested/fragmented authority.

### Turn-order positioning notes
- IVP and patron updates occur before exhaustion and negotiation updates to ensure consistent downstream modifiers.
- Capability progression updates occur before doctrine eligibility evaluation.
- AoR validation occurs after control updates and before pressure generation.

### Validation requirements (v0.4 additions)
- AoR invariants enforced only after Phase I.
- Contested control thresholds enforced at Phase 0 initialization.
- Doctrine eligibility and capability progression must be deterministic and re-evaluated per turn.
