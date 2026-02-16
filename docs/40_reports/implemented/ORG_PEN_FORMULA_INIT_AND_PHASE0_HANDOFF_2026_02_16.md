# Implemented Work — Deterministic Org-Pen Initialization Formula and Phase 0->I Handoff Alignment

**Date:** 2026-02-16  
**Status:** Complete  
**Scope:** Initialization, Phase 0->I transition, deterministic input wiring, tests

---

## 1. Objective

Replace uniform or controller-only startup organizational penetration with deterministic municipality-variant values derived from:

- **A:** Municipality controller (mayor-party proxy)
- **B:** Faction-aligned 1991 population share
- **C:** Planned war-start brigade presence from OOB (`available_from <= war_start_turn`)

Goal: make Phase 0/Phase I startup conditions vary by municipality while preserving determinism and integrating with war-start brigade availability.

---

## 2. What Was Implemented

### 2.1 New Deterministic Formula Module

**File:** `src/state/organizational_penetration_formula.ts`

- Added pure function `deriveOrganizationalPenetrationFromFormula(inputs)`.
- Added centralized constants (`ORG_PEN_FORMULA_CONSTANTS`) for thresholds/weights/clamps.
- Derived outputs:
  - `police_loyalty` from controller-side B/C signal strength
  - `to_control` from controller-side B/C signal strength
  - party penetrations (`sda/sds/hdz`) from A+B+C weighted score
  - paramilitary penetrations (`patriotska_liga/paramilitary_rs/paramilitary_hrhb`) from B+C weighted score
- Clamped output ranges and deterministic value handling for missing/invalid inputs.

### 2.2 Refactor of Org-Pen Seeding Path

**File:** `src/state/seed_organizational_penetration_from_control.ts`

- Refactored seeding to consume explicit deterministic A/B/C maps via options:
  - `municipality_controller_by_mun`
  - `population_1991_by_mun`
  - `planned_war_start_brigade_by_mun`
- Added deterministic municipality key normalization (alnum-only) for cross-source joins.
- Preserved deterministic fallback behavior when explicit maps are missing (majority controller from settlement political controllers).

### 2.3 Scenario Initialization Wiring for A/B/C

**File:** `src/scenario/scenario_runner.ts`

- Added deterministic builder for C input:
  - `buildPlannedWarStartBrigadePresenceByMunicipality(oobBrigades, warStartTurn)`
  - Uses only planned OOB presence (`available_from <= warStartTurn`), not runtime spawn outcomes.
- Added loading of municipality controller map for A input where available.
- Passed A/B/C seed payload into `createInitialGameState(..., options.organizationalPenetrationSeed)`.

### 2.4 Phase 0->I Uninvested Handoff Alignment

**File:** `src/ui/warroom/run_phase0_turn.ts`

- Replaced fixed baseline penetration constants with formula-based seeding for uninvested municipalities during Phase 0->I handoff.
- Added deterministic helper to detect brigade home municipality from `mun:*` tags.
- Handoff now uses the same formula family as scenario initialization, avoiding drift between startup and transition behavior.

---

## 3. Tests Added/Extended

- **New:** `tests/organizational_penetration_formula.test.ts`
  - formula determinism
  - A/B/C weighting behavior
  - category derivation for police/TO
- **New:** `tests/organizational_penetration_seed_from_control.test.ts`
  - deterministic seeding for same inputs
  - municipality variance from A/B/C
  - municipality key alias normalization
- **Extended:** `tests/phase0_to_phasei_brigade_availability.test.ts`
  - Phase 0->I handoff now seeds uninvested municipalities with formula-derived, controller-consistent values
- **Regression run:** `tests/phase_i_militia_emergence.test.ts` remained passing

---

## 4. Determinism and Ordering Guarantees

- No `Date.now`, timestamps, or random APIs introduced.
- Stable ordering used for municipality keys, formation IDs, and map traversal.
- Formula is pure and side-effect free.
- C input uses deterministic planned OOB data, avoiding circular or runtime-dependent seeding.

---

## 5. Canon/Docs Propagation Targets

This implementation is propagated to:

- `docs/10_canon/Systems_Manual_v0_5_0.md` (implementation-note)
- `docs/10_canon/Phase_I_Specification_v0_5_0.md` (implementation-note)
- `docs/10_canon/Phase_0_Specification_v0_5_0.md` (implementation-note)
- `docs/10_canon/context.md` (implementation reference)
- `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md` (new consolidated section)
- `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` and `docs/40_reports/README.md`
- `docs/00_start_here/docs_index.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` and `docs/PROJECT_LEDGER.md`

---

## 6. Verification

Executed:

- `npm run -s typecheck`
- `npx tsx --test "tests/organizational_penetration_formula.test.ts" "tests/organizational_penetration_seed_from_control.test.ts" "tests/phase0_to_phasei_brigade_availability.test.ts" "tests/phase_i_militia_emergence.test.ts"`

Result: all pass.
