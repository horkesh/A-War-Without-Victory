# A War Without Victory -- Phase 0 Specification v0.4.0
 
## Scope and inheritance
This document **supersedes** the prior Phase 0 Specification and incorporates all earlier Phase 0 rules by reference unless explicitly overridden or extended below.
 
 ## v0.4 Additions
 
### Stability-based contested control (System 11)
 - Phase 0 stability scores must produce initial control_status values:
   - SECURE, CONTESTED, HIGHLY_CONTESTED.
 - control_status is attached to municipality/settlement control initialization and carried into Phase I.
- Thresholds:
  - SECURE: stability_score >= 60
  - CONTESTED: 40 <= stability_score < 60
  - HIGHLY_CONTESTED: stability_score < 40
- Stability score components include demographic, organizational, and geographic factors as defined in the Phase 0 stability rules.
 
 ### Baseline external constraint states
 - Patron state, embargo profiles, and capability baselines are initialized deterministically at Phase 0 start if defined in Systems Manual v0.4.
 - These baselines do not override referendum gating or war start invariants.

 ### RBiH–HRHB relationship (Phase 0 link to Phase I §4.8)
 - The RBiH–HRHB relationship used for HRHB declaration enabling conditions (e.g. “relationship ≤ +0.2” for strained or worse) is the **same** numeric quantity as Phase I §4.8 (`phase_i_alliance_rbih_hrhb`).
 - When Phase 0 runs before Phase I, scenario or init may supply an initial value for this relationship; when Phase I state exists, Phase 0 declaration logic must use that state value so that declaration and Phase I flip behaviour are consistent.
