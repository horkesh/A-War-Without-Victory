# Peace Specification v0.6.0 — Peace Phase (Pre-War)

**Project:** A War Without Victory
**Phase:** Peace (Pre-War)
**Version:** v0.6.0
**Status:** Canon (v0.6 two-phase model)
**Date:** 2026-02-28

---

## 1. Purpose and Scope

The Peace phase models the political, organizational, and alliance struggle before sustained organized violence becomes self-sustaining.

This phase exists to:
- Model organizational preparation and institutional positioning
- Allow players to shape early-war asymmetries through capital allocation
- Create initial conditions without scripting outcomes
- Establish alliance states and declaration pressures before war begins
- Initialize Stability Scores and authority states for all municipalities

The Peace phase does NOT:
- Create military formations
- Allow control transfer via force
- Resolve combat or sustained fronts
- Predetermine territorial outcomes
- Script historical events

---

## 2. Conceptual Definition

The Peace phase represents the period from Yugoslavia's disintegration (Sept 1991) through the outbreak of sustained organized violence in Bosnia and Herzegovina (approximately April 1992).

During this period:
- Political control exists (based on 1990 elections and institutional dominance)
- Armed groups organize clandestinely
- Authority erodes in contested areas
- Inter-ethnic tensions escalate
- International recognition crisis unfolds
- Declarations (RS, HRHB) may emerge from accumulated pressure

Peace phase is about **shaping the war that will occur**, not fighting it.

---

## 3. Canonical Inputs (Locked)

Peace operates on fixed historical data representing late 1991 initial conditions.

### 3.1 Initial Political Control

**Source:** `data/source/municipalities_1990_initial_political_controllers.json`

Each municipality has a political controller determined by:
- 1990 election results (primary factor)
- Institutional dominance (SDA, SDS, HDZ control of municipal government)
- Demographic composition (secondary factor, never sole determinant)

Political controller ∈ {RBiH, RS, HRHB, null}

**Null control** is rare and represents municipalities where no faction exercises credible authority at game start.

### 3.2 Demographic Data

**Source:** `data/source/bih_census_1991.json`

Per-municipality demographic composition (Bosniak, Serb, Croat, Other/Yugoslav %). Used for Stability Score calculation and Control Strain potential.

### 3.3 Infrastructure Data

**Source:** `data/derived/settlements_substrate.geojson` and related — settlement locations, connectivity, strategic routes, adjacency. Used for Stability Score geographic vulnerability factors.

### 3.4 Institutional Presence (Historical Research)

**Source:** Historical research (Balkan Battlegrounds, expert sources). Initial state of police loyalty, TO control, SDS/PL/JNA presence. Implementation may use deterministic proxy seeding; see implementation-notes in consolidated reports.

---

## 4. Peace Phase Systems

### 4.1 Pre-War Capital

Each faction starts with asymmetric **Pre-War Capital** pools. Initial Capital (tuning): RS 100, RBiH 70, HRHB 40. Capital is spent on Peace-phase actions; default is non-renewable. **Capital Scarcity:** Pools are insufficient to invest everywhere; players must prioritize.

**Conditional Capital Earn (scenario-gated):** When scenario defines scheduled referendum and war-start turns, factions may earn additional pre-war capital via deterministic per-turn trickle (e.g. PREWAR_CAPITAL_TRICKLE_PER_TURN, PREWAR_CAPITAL_TRICKLE_MAX_BONUS). Application order: canonical faction order (RBiH, RS, HRHB).

### 4.2 Organizational Penetration Investment

Players allocate capital to: Police Organization, TO Positioning, Party Organization (SDS/SDA/HDZ), Paramilitary Organization (Patriotska Liga, SDS militias, HVO cadres). Costs and outcomes as in deprecated Phase_0_Specification_v0_5_0 §4.2. Outcomes improve Stability Score and affect militia emergence and authority in War phase.

### 4.3 Alliance Management (RBiH-HRHB Only)

Alliance state [-1, +1]; initial +0.6. Coordinated vs unilateral investment; alliance degrades with unilateral actions in contested territory. Design: cooperation vs preparation for eventual split.

### 4.4 Declaration Pressure Accumulation

RS and HRHB declarations emerge when conditions are met (not player buttons). RS: organizational threshold, JNA coordination, relationship ≤ -0.5, FRY support; pressure +10/turn, declare at ≥100. HRHB: organizational threshold, Croatian support, alliance ≤ +0.2, and RS declared or war started. Effects on legitimacy, authority, and war escalation as in deprecated Phase 0 spec §4.4.

### 4.5 Stability Score Initialization

Formula: Base 50 + Demographic + Organizational - Geographic Vulnerabilities. Stability Bands: 80-100 Very Stable down to 0-20 Collapse Imminent. Pre-war investment modifies organizational factors. Final scores carried forward to War phase.

### 4.6 Authority Degradation (Peace)

Authority states: Consolidated, Contested, Fragmented. Degradation from opposing investment, demographic hostility, institutional capture, or isolated violence. Reduces Stability, increases militia friction and Control Strain potential in War. Does not flip control.

---

## 5. Peace Turn Structure

Turn duration: 1 week. Sequence: Directive Phase (capital allocation), Investment Resolution, Alliance Update, Declaration Pressure, Declaration Check, Authority Degradation, Stability Update, Escalation Check (transition to War). No combat, no flips, no formations.

---

## 6. Transition to War

Peace ends when **Escalation Threshold** is met: (1) Sustained armed clashes 2+ weeks, (2) Monopoly collapse in 3+ municipalities, (3) At least one faction pair relationship ≤ -0.6. **War start is referendum-gated:** CANON.md War Start Rule (Phase D0.4a) requires the mandatory EC-coerced RBiH independence referendum and current_turn == referendum_turn + 4. Transition is emergent and irreversible.

---

## 7. Peace → War Hand-Off

Hand-off data: Stability Scores, Organizational Factors, Alliance State, Declaration States, Authority States, Political Control (unchanged), JNA Status (transition_begun, withdrawal_progress, asset_transfer_RS). All Peace consequences persist into War; no reset.

---

## 8. Output Contract

Peace phase MUST produce per-municipality outputs (political_control, stability_score, authority_state, organizational_factors), faction-level outputs (capital_remaining, declaration_state), alliance rbih_hrhb_relationship, transition info (phase_0_end_turn, phase_1_start_turn, escalation_reason), and JNA_status. Implementation uses state.meta and state.phase_i_jna (or war-era equivalents) as defined in runtime.

---

## 9. Determinism and Auditability

Deterministic capital resolution, no randomness, stable ordering of faction actions, reproducible declaration triggers. All actions and effects logged and auditable.

---

## 10. Design Constraints and Non-Effects

No outcome scripting; no formations; no control flips; no combat systems; capital scarcity; declarations emergent. Peace does not create formations, pressure, combat, AoR, supply, Control Strain, negotiation, or exhaustion.

---

## 11. Canonical Interpretation (Binding)

Peace models organizational positioning and political legitimacy before sustained violence. Players shape asymmetries through scarce capital; declarations emerge from systemic conditions. Control does not flip; war begins on contested legitimacy.

---

## 12. v0.6 Canon consolidation

This document (v0.6.0) is the Peace phase specification in the two-phase (Peace/War) model. It supersedes Phase_0_Specification_v0_5_0.md. Deprecated Phase 0/I/II docs are in docs/_old/10_canon/. Runtime phase value for this phase is **peace**.
