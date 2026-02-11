# A War Without Victory (AWWV)
## Gap Analysis and Integration Guidance
**Status:** Informational, non-canonical  
**Purpose:** Recovery, clarification, and integration planning  
**Audience:** External subject-matter experts, systems designers, senior engineers  
**Scope:** Conceptual and structural gaps only — no mechanics proposed  

---

## 1. Purpose of this document

This document identifies **conceptual, structural, and systemic gaps** between:

- the historical design discussions of *A War Without Victory* (AWWV),
- the current canonical documentation (Rulebook, FORAWWV.md, Phase specs),
- and the implemented engine state (Phases A–F).

It exists to:
- make **lost or under-specified design intent visible**,
- prevent silent symmetry or distortion,
- guide **clean addenda and future implementation** without retroactive rewriting,
- and enable an external expert to integrate missing dimensions **without inventing mechanics**.

This is **not a redesign** and **not a feature request**.

---

## 2. Current canonical and implementation baseline

### 2.1 Implemented and locked

- **Phase A:** Canonical game state, deterministic weekly turn pipeline
- **Phase E:** Spatial interaction systems  
  (pressure eligibility & diffusion, front emergence, AoRs, rear political control zones)
- **Phase F:** Population displacement  
  (settlement + municipality, irreversible, capacity degradation only)
- **Exhaustion:** Irreversible, faction-level, monotonic
- **Determinism:** No randomness, no timestamps, no serialized derived state

### 2.2 Explicitly deferred

- **Negotiation & End-State:** Phase O (legacy naming), not yet implemented
- **Treaties, patron intervention, enforcement:** Deferred consumers of pressure/exhaustion

### 2.3 Core modeling principles (non-negotiable)

- Strategic-level simulation (not tactical)
- No hard-coded historical outcomes
- Negative-sum framing
- Territory is political and logistical, not purely spatial
- Internal fragmentation is possible
- External actors apply asymmetric pressure

---

## 3. Source of findings

This analysis synthesizes:
- ChatGPT design discussions (deep on systems, map, determinism, negotiation logic)
- Claude design audits (strong on political/international dimensions)
- The consolidated **GAP_AND_RECOVERY_REPORT.md**

Several historically and systemically important concepts were **discussed but never canonized**, or **implicitly dropped** during later formalization.

---

## 4. Tier 1 gaps — structurally blocking if unclarified

These gaps materially affect multiple systems.  
If left ambiguous, they will **force incorrect assumptions downstream**.

---

### 4.1 External patron pressure (distinct from military pressure and exhaustion)

#### Finding
Design discussions repeatedly treated **external patrons** (e.g. US, Croatia, FRY/Serbia) as:
- asymmetric actors,
- capable of applying pressure independent of battlefield outcomes,
- able to **override internal faction preferences**.

The **Washington Agreement** was explicitly discussed as:
- *not* an exhaustion-based negotiation,
- *not* a voluntary equilibrium,
- but a **patron-enforced internal realignment**.

#### Current state
- Canon recognizes “pressure,” but only as:
  - military,
  - supply-related,
  - coercive via fronts.
- No distinct concept of patron pressure exists.
- Negotiation pressure is implicitly exhaustion-driven only.

#### Why this matters
Without clarification:
- Washington-type outcomes cannot be modeled correctly.
- Patron-driven consolidation collapses into “voluntary negotiation.”
- Factions appear unrealistically sovereign.

#### Required clarification
Explicitly state whether **external patron pressure**:
- exists as a first-class constraint,
- exists only as a modifier to other systems,
- or is explicitly out of scope (with justification).

---

### 4.2 Heavy equipment asymmetry and maintenance burden

#### Finding
Early design discussions explicitly contrasted:
- VRS: heavy equipment inheritance (JNA), artillery, armor, logistics tail
- ARBiH: manpower-heavy, equipment-poor, lower maintenance burden

Key point:
> Heavy equipment imposes **ongoing sustainment and maintenance costs**, even when idle, and becomes a liability under sanctions and isolation.

#### Current state
- Supply and exhaustion are modeled generically.
- Force composition is not conceptually distinguished.
- Maintenance burden is not acknowledged.

#### Why this matters
Ignoring this:
- Collapses historically crucial asymmetry,
- Distorts exhaustion trajectories,
- Makes sanctions and embargo effects incoherent.

#### Required clarification
Explicitly state whether:
- force composition asymmetry exists conceptually,
- heavy equipment implies higher sustainment pressure,
- or whether these differences are intentionally abstracted away.

---

### 4.3 Arms embargo as asymmetric, time-dependent constraint

#### Finding
Embargo was discussed as:
- asymmetric in effect,
- interacting with force structure,
- affecting replacement rates and learning curves,
- changing faction trajectories over time.

#### Current state
- No explicit embargo concept exists.
- Supply abstraction risks treating embargo as symmetric or cosmetic.

#### Why this matters
Without clarification:
- Time-based asymmetry disappears.
- Early vs late war dynamics flatten incorrectly.

#### Required clarification
Explicitly state whether the embargo:
- is in scope as a strategic constraint,
- is abstracted into other systems,
- or is explicitly out of scope.

---

## 5. Tier 2 gaps — conceptual integrity risks

These do not block implementation immediately, but **will distort outcomes if left vague**.

---

### 5.1 Intra-faction political fragmentation

#### Finding
Design intent allowed:
- fragmentation within the same faction,
- loss of unified authority under pressure,
- internal political collapse without external conquest.

#### Current state
- Factions are implicitly unitary.
- Fragmentation exists implicitly but not acknowledged as expected behavior.

#### Why this matters
Affects:
- negotiation plausibility,
- patron leverage,
- collapse dynamics.

#### Required clarification
Explicitly state whether factions can fragment internally, and under what conceptual conditions.

---

### 5.2 Legitimacy as a distinct dimension

#### Finding
Early texts state:
> authority, control, and legitimacy are distinct.

Legitimacy was discussed as:
- internal and external,
- affecting patron behavior and negotiation credibility.

#### Current state
- Control and authority are defined.
- Legitimacy is named but undefined.

#### Why this matters
Ambiguity here leads to:
- inconsistent interpretation,
- ad hoc future additions.

#### Required clarification
Explicitly state whether legitimacy:
- is a conceptual-only dimension,
- will become stateful later,
- or is intentionally excluded.

---

### 5.3 Early-war coercive authority shifts (pre-front)

#### Finding
Early war dynamics were discussed as including:
- institutional capture,
- policing,
- checkpoints,
- coercion **before** stable fronts emerge.

#### Current state
- Phase 0 exists, but coercive authority shifts are under-specified.
- Front logic dominates interpretation.

#### Why this matters
Without clarification:
- early war collapses too quickly into front-based logic,
- pre-war dynamics lose explanatory power.

#### Required clarification
Explicitly state whether non-combat coercion is recognized conceptually in Phase 0.

---

## 6. Tier 3 gaps — scope discipline (prevent future drift)

These must be **explicitly accepted or rejected** to avoid repeated re-litigation.

---

### 6.1 International visibility pressure (IVP)

- Appeared primarily in Claude audits.
- Treated more as an analytical lens than a system.

**Clarification needed:**  
Is IVP:
- a first-class system,
- a modifier acting through patrons/sanctions,
- or narrative-only?

---

### 6.2 Enclaves and city-specific exceptions (e.g. Sarajevo)

- Discussed historically.
- No explicit endorsement of hard-coded exceptions.

**Clarification needed:**  
Are cities/enclaves:
- emergent outcomes of systems,
- or subject to special rules (generally discouraged)?

---

### 6.3 JNA garrison and historical force placement data

- Suggested as initialization data.
- Never canonized.

**Clarification needed:**  
Is this data:
- part of canonical initialization,
- or analytical reference only?

---

## 7. Integration roadmap (non-mechanical)

This roadmap shows **where clarified concepts attach** to the existing architecture.

### 7.1 Conceptual → structural staging

1. **FORAWWV addendum**
   - Clarify scope, inclusion, or exclusion of each gap
   - No mechanics, no numbers

2. **State schema (if needed)**
   - Add inert conceptual placeholders only
   - No behavior, no serialization of derived state

3. **Pipeline validation**
   - Assert no changes to determinism
   - Assert no control flips or side effects

4. **Deferred consumption**
   - Negotiation / End-State (Phase O) consumes:
     - patron pressure
     - fragmentation
     - legitimacy

### 7.2 Explicit non-actions
- No treaty logic now
- No patron AI now
- No sanctions math now
- No special cases for cities

---

## 8. How an external expert should use this document

An external expert should:
1. Read this document **before** proposing mechanics.
2. Produce a **clarification addendum** answering each Tier 1–3 item:
   - in scope / out of scope
   - conceptual level only
3. Validate that clarifications:
   - do not contradict existing canon,
   - do not require immediate code changes.
4. Only then proceed to system design or implementation phases.

---

## 9. Final note

This gap analysis is intentionally conservative.

Its goal is not to expand the game, but to:
- recover original design intent,
- prevent silent distortion,
- and ensure future work aligns with the intellectual foundation of *A War Without Victory*.

No mechanic should be designed until these gaps are explicitly resolved.
