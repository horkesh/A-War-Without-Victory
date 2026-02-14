# Canon Checkpoint — Militia/Brigade Formation and Phase I

**Date:** 2026-02-06  
**Convened by:** Orchestrator (per Paradox meeting recommended next steps)  
**Handoff to:** Game Designer, Canon Compliance Reviewer  
**Purpose:** Confirm militia/brigade formation behavior and large-settlement resistance align with Phase I spec and Rulebook; document any open design choice. Close canon silence with a short design note or STOP AND ASK.

---

## Checkpoint task

1. **Game Designer:** From a design and canon perspective, confirm that:
   - Militia pool population (pool keyed by mun_id, faction) and formation spawn behavior align with Phase I specification and Rulebook v0.4.0 / Game Bible v0.4.0.
   - Large-settlement resistance (and any related control-flip or formation rules) align with Phase I spec and canon.
   - Any open design choice is documented here or in a short design note; if canon is silent, state it and recommend clarification or leave to product.

2. **Canon Compliance Reviewer:** Review the militia/brigade and Phase I–related code paths (e.g. formation spawn, pool population, control flip) and:
   - Map each behavioral assumption to canon clauses (Phase I spec, Systems Manual, Rulebook, Engine Invariants) by doc and section.
   - Flag any mismatch, canon silence, or conflict with explicit citations.
   - Provide a clear approve/block recommendation.

3. **Output:** Once both have responded, fill “Checkpoint outcome” below. If any blocker or canon silence is found, STOP AND ASK before further implementation that depends on it.

---

## Checkpoint outcome (filled)

**Game Designer:**

- *Alignment with Phase I / Rulebook / Game Bible:* Phase I Specification v0.4.0: control_status modifies early-war flip resistance and authority initialization; HIGHLY_CONTESTED eligible for rapid flips after declaration; SECURE requires sustained pressure; AoR prohibited throughout Phase I. Engine Invariants v0.4.0: AoR prohibited in Phase I; control status affects early-war flip resistance and authority init; legitimacy distinct from control; authority consolidation requires control and sufficient legitimacy. Militia emergence and pool (mun_id, faction) support control-flip resistance and formation lifecycle; control flip ordering (stability ASC, mun ID) and large-settlement resistance behavior align with Phase I turn structure (militia-emergence → control-flip → displacement-hooks → control-strain → authority-update → jna-transition). Rulebook/Game Bible do not spell out militia pool schema; Phase I spec and Engine Invariants give the constraints that matter for flip resistance and Phase I scope.
- *Open design choices (if any):* None that block. Pool keying (mun_id, faction) and formation spawn directive are implementation choices consistent with “militia emergence” and “no AoR in Phase I.”
- *Canon silence (if any):* Explicit “militia pool schema” (e.g. key structure, available/committed) is not in Phase I spec v0.4 or Rulebook; leave as implementation detail. Large-settlement resistance as a flip modifier is implied by control_status and stability in Phase I spec and Engine Invariants; no addendum needed unless we want a single named “large-settlement resistance” rule in canon.

**Canon Compliance Reviewer:**

- *Change-to-canon mapping:* (1) Militia emergence / pool population: Phase I spec “early-war flip resistance” and control_status (Phase I § Contested control effects; Engine Invariants § K). (2) Formation spawn / brigade creation: Phase I has no AoR; formations created from pools are consistent with “militia emergence” and later Phase II AoR assignment (Engine Invariants § B). (3) Control flip: Phase I spec control_status and HIGHLY_CONTESTED/SECURE; resolution order and stability from Phase I control-flip implementation; Engine Invariants § K. (4) Large-settlement resistance: subsumed under control_status and stability in Phase I spec and Engine Invariants § K; no separate canon clause required.
- *Blockers / mismatches:* None. No mismatch between current militia/brigade/control-flip behavior and Phase I spec v0.4.0, Engine Invariants v0.4.0, or Rulebook.
- *Recommendation (approve / block):* **Approve.** Implementation aligns with canon; no block.

**Orchestrator:** Both approve. Checkpoint closed. No escalation.
