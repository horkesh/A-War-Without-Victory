# Ongoing Recruitment System Implementation Report

**Date:** 2026-02-11  
**Scope:** Complete ongoing brigade recruitment system per plan (accrual + per-turn recruitment), documentation retry, refactor pass, and consolidation.

---

## 1. Summary

Implemented the full ongoing recruitment loop for Phase II: recruitment capital and equipment points accrue each turn from production, embargo, militia pools, authority/legitimacy, and displacement; factions can activate additional OOB brigades during the game when eligible. All logic is deterministic. Follow-up work: retried the previously locked implementation report update, applied a small refactor pass on the new recruitment module, then produced this report, updated the ledger, and committed the codebase.

---

## 2. Implementation Delivered

### 2.1 State and scenario config

- **`src/state/recruitment_types.ts`**  
  Extended `RecruitmentResourceState` with:
  - `recruitment_capital_trickle?: Record<FactionId, number>`
  - `equipment_points_trickle?: Record<FactionId, number>`
  - `max_recruits_per_faction_per_turn?: number`

- **`src/scenario/scenario_types.ts`**  
  Added optional scenario fields: `recruitment_capital_trickle`, `equipment_points_trickle`, `max_recruits_per_faction_per_turn`.

- **`src/scenario/scenario_loader.ts`**  
  Normalized the new recruitment fields (resource records and integer cap).

- **`src/scenario/scenario_runner.ts`**  
  Passes the new scenario recruitment options into `initializeRecruitmentResources()`.

### 2.2 Recruitment engine extensions

- **`src/sim/recruitment_engine.ts`**
  - New `RunBotRecruitmentOptions`: `includeCorps`, `includeMandatory`, `maxElectivePerFaction`.
  - `initializeRecruitmentResources()` accepts optional trickles and `max_recruits_per_faction_per_turn`.
  - Mandatory and elective recruitment both respect `available_from` (turn gate).
  - Ongoing path uses `includeCorps: false`, `includeMandatory: false`, and `maxElectivePerFaction` from state (default 1).

### 2.3 Per-turn accrual and ongoing recruitment

- **`src/sim/recruitment_turn.ts`** (new)
  - **Accrual:** `accrueRecruitmentResources(state, settlements, localProduction?)`
    - Equipment: production facilities under faction control × local production capacity × type weight × embargo scaling; plus optional scenario equipment trickle.
    - Capital: scenario capital trickle + organizational base from militia pools, scaled by authority, legitimacy, and displacement multiplier.
  - **Ongoing recruitment:** `runOngoingRecruitment(state, oobCorps, oobBrigades, sidToMun, municipalityHqSettlement)` calls bot recruitment with options (no corps/mandatory, elective cap from state).
  - Deterministic ordering: faction IDs, facility IDs, municipality IDs, pool keys; no RNG or timestamps.
  - Refactor: added `factionById()` map to avoid repeated `.find()` in accrual loops.

- **`src/sim/turn_pipeline.ts`**
  - New phase **`phase-ii-recruitment`** (Phase II only, when `recruitment_state` exists):
    1. Run `accrueRecruitmentResources()` using supply-resolution local production when available.
    2. Load OOB catalog (brigades, corps, municipality HQ map) via cached loader.
    3. Run `runOngoingRecruitment()` with graph-derived `sidToMun` and HQ map.
    4. Report `phase_ii_recruitment` (accrual deltas, recruited counts, remaining capital/equipment per faction).

### 2.4 Validation and serialization

- **`src/state/validateGameState.ts`**  
  Shape validation for `recruitment_state` when present: `recruitment_capital`, `equipment_pools`, `recruited_brigade_ids`, and optional trickle/cap fields.

- **Serialization:** Existing `recruitment_state` handling in `serializeGameState.ts` and top-level key set unchanged; new fields are part of the same object and are serialized with it.

---

## 3. Tests

- **`tests/recruitment_engine.test.ts`**
  - New/updated: trickle and per-turn recruit cap in `initializeRecruitmentResources`; `available_from` gate in `runBotRecruitment`; per-faction elective cap via `RunBotRecruitmentOptions`.

- **`tests/recruitment_turn.test.ts`** (new)
  - `accrueRecruitmentResources`: accrues capital and equipment from trickle + production/population inputs and updates state.
  - `runOngoingRecruitment`: respects per-faction recruit cap (deterministic single recruit when cap is 1).

- **Verification:** `npx tsc --noEmit` and `npx tsx --test tests/recruitment_engine.test.ts tests/recruitment_turn.test.ts` (17 tests) pass. Full `npx vitest run` reports many “No test suite found” for `node:test`-based files (pre-existing runner mismatch).

---

## 4. Canon and design docs

- **`docs/10_canon/Systems_Manual_v0_5_0.md`** §13  
  Updated to describe initial + ongoing recruitment and accrual (equipment from production/embargo/trickle, capital from organizational inputs/trickle).

- **`docs/40_reports/recruitment_system_design_note.md`** §8.2  
  Extended recruitment window marked as implemented; formula placeholders and determinism note added.

- **`docs/40_reports/recruitment_system_implementation_report.md`**  
  Retried and applied: overview updated for ongoing Phase II accrual + recruitment; pipeline and config tables updated; “Future Work” line on equipment trickle removed (now implemented).

---

## 5. Refactor pass (post-implementation)

- **Scope:** Files modified or created in the session (recruitment and related).
- **Change:** In `src/sim/recruitment_turn.ts`, replaced repeated `(state.factions ?? []).find(f => f.id === …)` with a single `factionById(state)` map, used in production accrual and per-faction accrual loops.
- **Result:** No dead code removed; one small duplication removed; typecheck and recruitment tests pass.

---

## 6. Ledger and napkin

- **`docs/PROJECT_LEDGER.md`**  
  Entry added: “2026-02-11 - Implement ongoing deterministic brigade recruitment with per-turn accrual” (summary, change list, outcomes, canon alignment, determinism, artifacts).

- **`.agent/napkin.md`**  
  Pattern added: ongoing recruitment pipeline determinism (stable ordering, `available_from`, per-faction per-turn cap).

---

## 7. Files touched (artifact list)

| Area              | Files |
|-------------------|-------|
| State/types       | `src/state/recruitment_types.ts`, `src/state/validateGameState.ts` |
| Scenario          | `src/scenario/scenario_types.ts`, `src/scenario/scenario_loader.ts`, `src/scenario/scenario_runner.ts` |
| Recruitment logic | `src/sim/recruitment_engine.ts`, `src/sim/recruitment_turn.ts` |
| Pipeline          | `src/sim/turn_pipeline.ts` |
| Tests             | `tests/recruitment_engine.test.ts`, `tests/recruitment_turn.test.ts` |
| Canon/design      | `docs/10_canon/Systems_Manual_v0_5_0.md`, `docs/40_reports/recruitment_system_design_note.md`, `docs/40_reports/recruitment_system_implementation_report.md` |
| Ledger/napkin     | `docs/PROJECT_LEDGER.md`, `.agent/napkin.md` |
| Report            | `docs/40_reports/ongoing_recruitment_implementation_report_2026_02_11.md` |

---

## 8. Success criteria (plan)

- Recruitment capital and equipment points **change over time** in scenarios with `recruitment_mode: 'player_choice'`, driven by production/embargo and optional trickles. **Met** (accrual step in pipeline).
- Sides **recruit additional brigades** during the run when they have sufficient resources and eligibility. **Met** (ongoing recruitment step, cap per faction per turn).
- Same scenario + seed produces **identical** accrual and recruitment outcomes. **Met** (deterministic ordering and no RNG).
- Canon and design docs updated; PROJECT_LEDGER entry for the change. **Met.**

---

*End of report.*
