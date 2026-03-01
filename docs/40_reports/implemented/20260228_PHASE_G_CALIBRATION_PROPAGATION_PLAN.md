# Phase G Calibration Report — Propagation Plan

**Source report:** `docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md`  
**Date:** 2026-02-28  
**Purpose:** Propagate pipeline behavior, calibration baseline, technical learnings, and known gaps into canon and technical documentation. FORAWWV.md is not edited.

---

## 1. Pipeline behavior (canon / invariants)

**Requirement:** When `state.meta.recruitment_mode === 'bottom_up'`, the turn pipeline must run the Phase I bottom-up formation steps **even when** `state.meta.phase === 'phase_ii'`. Steps: phase-i-militia-emergence, compute-siege-state, phase-i-pool-population, phase-i-formation-spawn, activate-corps, promote-formations. This is already implemented in `turn_pipeline.ts`; document as required behavior.

### 1.1 Engine_Invariants_v0_5_0.md

- **Location:** After §14.8 (Phase gating) or as new §14.10.
- **Add new subsection:**

```markdown
### 14.10 Bottom-up recruitment in Phase II context

When `state.meta.recruitment_mode === 'bottom_up'`, the turn pipeline **must** run the following Phase I formation steps after the main Phase II steps, regardless of `state.meta.phase`:
- phase-i-militia-emergence
- compute-siege-state
- phase-i-pool-population
- phase-i-formation-spawn
- activate-corps
- promote-formations

This ensures that scenarios starting in `phase_ii` with bottom-up formation growth still populate militia pools and spawn formations each turn. Implementation: `src/sim/turn_pipeline.ts` (injection block when `recruitment_mode === 'bottom_up'`). Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
```

### 1.2 Phase_I_Specification_v0_5_0.md

- **Location:** After the existing implementation-note (recruitment mode) around line 234 (§4.2.3 or equivalent).
- **Add:**

```markdown
**Implementation-note (bottom_up in phase_ii):** When `recruitment_mode` is `"bottom_up"`, the pipeline runs the Phase I bottom-up formation steps (militia emergence, siege state, pool population, formation spawn, activate-corps, promote-formations) even when `meta.phase === 'phase_ii'`. This allows scenarios that start in Phase II (e.g. 40-week calibration) to still use bottom-up militia-to-brigade growth. See Engine Invariants §14.10 and docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
```

### 1.3 Phase_II_Specification_v0_5_0.md

- **Location:** In or near the section that describes turn pipeline / Phase II steps (e.g. §5 or pipeline ordering).
- **Add one sentence to an implementation-note or pipeline section:**

```markdown
When `recruitment_mode === 'bottom_up'`, the Phase II runTurn injects the Phase I bottom-up formation steps after the main phases loop (Engine Invariants §14.10; report: 20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md).
```

### 1.4 Systems_Manual_v0_5_0.md

- **Location:** §13 (Recruitment and militarization), after the paragraph that describes `recruitment_mode` player_choice and auto_oob.
- **Add:**

```markdown
When `recruitment_mode` is `"bottom_up"`, formation growth uses militia emergence and pool population; the turn pipeline runs the Phase I bottom-up steps (militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations) **even in phase_ii** so that scenarios starting in Phase II can still grow formations. Engine Invariants §14.10; implementation: `src/sim/turn_pipeline.ts`. **Calibration note:** The 40-week calibration scenario uses `player_choice` (not bottom_up) because in bottom_up mode RS brigades are 1-per-HQ with no stacking, so spreadBrigadesToFrontOsids does not move them to the front and they generate no attack orders. See docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
```

### 1.5 PIPELINE_ENTRYPOINTS.md

- **Location:** In the "Turn pipeline and canon systems" section, after the Phase I steps bullet (around line 90).
- **Add:**

```markdown
**Bottom-up in Phase II:** When `state.meta.recruitment_mode === 'bottom_up'`, `runTurn` injects the following Phase I steps after the main `phases` loop: phase-i-militia-emergence, compute-siege-state, phase-i-pool-population, phase-i-formation-spawn, activate-corps, promote-formations. This is required so that phase_ii-start scenarios still run bottom-up formation growth. See Engine Invariants §14.10 and docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
```

---

## 2. Calibration baseline

**Requirement:** Document that the 40w calibration scenario uses `recruitment_mode: "player_choice"` (not bottom_up); reason: in bottom_up mode RS brigades are 1-per-HQ with no stacking → no spreading to front → no attack orders. player_choice is used for calibration; bottom_up remains for other scenarios.

### 2.1 BOT_AI_HOLISTIC_TUNING_REFERENCE.md

- **Location:** Add a new subsection under "Essential File Locations" or "Current Tuning Parameters" — e.g. **"40-week calibration scenario (apr1992_definitive_40w)"**.
- **Add:**

```markdown
### 40-week calibration scenario (apr1992_definitive_40w)

- **recruitment_mode:** `"player_choice"` (not `bottom_up`). In bottom_up mode, RS brigades are placed 1-per-HQ at init; `spreadBrigadesToFrontOsids` only moves over-stacked brigades, so 61/77 RS brigades stay at interior HQ OSIDs with no front contact and generate no attack orders. player_choice creates all OOB brigades at turn 0 and spreads them to front positions, enabling calibration of bot attack/territory metrics. bottom_up remains the mode for other scenarios (e.g. militia-emergence play). Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
```

- **Location:** In "Calibration Status Summary" or "Run Results Tracker", add a short note that the 40w baseline is n246 with player_choice and reference the report for n246 metrics and benchmark pass.

### 2.2 Scenario / calibration docs

- **docs/40_reports/CALIBRATION_REPORT_BOT_AI_FEB_2026.md** (or CALIBRATION_REPORT_SESSION3_...): If these docs reference the 40w scenario or apr1992_definitive_40w, add a sentence: "The 40w calibration scenario uses recruitment_mode: player_choice so that brigades are spread to front OSIDs and generate attack orders; bottom_up is not used for this scenario (see 20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md)."
- **docs/30_planning/20260228_STRUCTURAL_CHANGES_FOR_90PCT_CALIBRATION.md:** If it discusses scenario choice, add a bullet that 40w calibration uses player_choice and link the Phase G report.

---

## 3. Technical learnings (BOT_AI / phase II doctrine / calibration)

### 3.1 BOT_AI_HOLISTIC_TUNING_REFERENCE.md

- **Location:** New subsection **"Technical learnings (Phase G calibration 2026-02-28)"** or merge into "Key Gaps & Tuning Priorities" / "Decisions Log".
- **Add:**

```markdown
### Technical learnings (Phase G calibration 2026-02-28)

- **Attack share step function:** For a corps with N brigades, `attack_slots = max(1, floor(N × share))`. Tuning within a step (e.g. 0.08→0.10) can have zero effect; e.g. for 1KK (26 brigades), 0.08 and 0.10 both yield 2 slots. Document step thresholds when tuning; jumping a step (e.g. 0.08→0.12) may add a marginal third slot that reduces territory efficiency.
- **Aggression as quality filter:** `aggression_modifier` (e.g. -0.05) acts as a quality threshold; when attack slots are limited, the quality filter is more valuable than extra slots. Removing it allows marginal attacks that can reduce net territory.
- **Phase timing interdependence:** `RS_EARLY_WAR_END_WEEK` (e.g. 20) is a coordinated design point with RBiH doctrine phase at week 20. Changing RS timing alone creates asymmetric overlaps (e.g. RS offensive + RBiH more-active phase simultaneously), which can worsen RS territory. Keep RS_EARLY_WAR_END_WEEK=20 unless RBiH doctrine boundaries are adjusted in sync.
- **bottom_up vs player_choice:** bottom_up places RS 1-per-HQ → no spreading → no front contact → no attack orders; use player_choice for calibration scenarios that need front-loaded brigades and attack order validation.
```

---

## 4. Known gaps (document as known issues / follow-ups)

### 4.1 BOT_AI_HOLISTIC_TUNING_REFERENCE.md

- **Location:** Add to "Identified Issues & Next Steps" or create **"Known structural gaps (Phase G)"**.
- **Add:**

```markdown
### Known structural gaps (Phase G calibration 2026-02-28)

- **HRHB Northwest Bosnia OOB:** `hvo_northwest_bosnia` has 0 brigades in OOB. Posavina (Orasje, Bosanski Brod, Derventa, Odžak) is undefended by HRHB. Fix: assign Posavina brigades (e.g. hrhb_jure_franceti_brigade, hrhb_kralj_petar_kreimir_iv_brigade) to `hvo_northwest_bosnia` in OOB. Expected: HRHB 82→85–88 OSIDs.
- **Vozuca wrong flip:** `op:zavidovici:vozuca_2` flips RBiH in sim but historically was VRS-held (BB1 p499, BB2 p507). Fix options: osid_control_overrides (init only), stronger RS East Bosnian Corps priority for Zavidovici, or avoid_municipalities for RBiH 2nd Corps targeting Zavidovici.
```

### 4.2 Optional: docs/40_reports or docs/30_planning known-issues list

- If the project has a single "Known issues" or "Follow-ups" doc (e.g. in CONSOLIDATED_BACKLOG or a dedicated file), add the same two bullets (HRHB OOB, Vozuca) with reference to the Phase G report.

---

## 5. Ledger and knowledge base

### 5.1 PROJECT_LEDGER.md

- **Status:** The Phase G calibration is already summarized in the ledger (entry at ~line 8631: "Two-session investigation resolved the n242–n244 identical hash mystery..." with n246 result and benchmarks).
- **Action:** Append one line to that entry (or the next 2026-02-28 entry) so the report is explicitly cited:

```markdown
**Report:** docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md. Propagation plan: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_PROPAGATION_PLAN.md.
```

- If the existing entry is a single long paragraph, add the "Report:" and "Propagation plan:" lines at the end of that paragraph.

### 5.2 PROJECT_LEDGER_KNOWLEDGE.md

- **Location:** §3 Implementation Knowledge Repository (Proven Patterns) or §6 Technical Decision Chains; or add a new short subsection under "Calibration" / "Bot evolution chain".
- **Add thematic entries:**

```markdown
- **Bottom-up pipeline in phase_ii (2026-02-28):** When `recruitment_mode === 'bottom_up'`, the turn pipeline must run Phase I bottom-up steps (militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations) even when `meta.phase === 'phase_ii'`. Implemented in turn_pipeline.ts; canon: Engine Invariants §14.10. Report: 20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **40w calibration baseline (2026-02-28):** apr1992_definitive_40w uses `recruitment_mode: "player_choice"` so brigades spread to front OSIDs and generate attack orders; bottom_up is not used for this scenario. n246 baseline: RS=406, RBiH=265, HRHB=82; all 6 benchmarks pass. Report: 20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **Attack share step function (2026-02-28):** Corps attack_slots = max(1, floor(N × share)); tuning within a step can have zero effect. Document step thresholds when tuning bot doctrine; see BOT_AI_HOLISTIC_TUNING_REFERENCE.md and Phase G report.
```

---

## 6. PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md

- **Location:** Near the recruitment_mode / bottom_up mention (e.g. § "recruitment_mode field" or 40w run step).
- **Add:**

```markdown
When the scenario starts in phase_ii (e.g. 40w), the pipeline still runs Phase I bottom-up steps when recruitment_mode is bottom_up (Engine Invariants §14.10; turn_pipeline.ts). The 40w calibration scenario uses player_choice, not bottom_up, so that RS brigades are spread to front OSIDs and generate attack orders; see docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
```

---

## 7. Summary table

| File | Section / location | Action |
|------|-------------------|--------|
| docs/10_canon/Engine_Invariants_v0_5_0.md | After §14.8 or new §14.10 | Add §14.10 Bottom-up recruitment in Phase II context |
| docs/10_canon/Phase_I_Specification_v0_5_0.md | After implementation-note (recruitment mode) ~line 234 | Add implementation-note (bottom_up in phase_ii) |
| docs/10_canon/Phase_II_Specification_v0_5_0.md | Pipeline / Phase II steps §5 | Add one sentence on bottom_up injection |
| docs/10_canon/Systems_Manual_v0_5_0.md | §13 Recruitment | Add paragraph on bottom_up in phase_ii + calibration note |
| docs/20_engineering/PIPELINE_ENTRYPOINTS.md | After Phase I steps bullet | Add "Bottom-up in Phase II" paragraph |
| docs/30_planning/BOT_AI_HOLISTIC_TUNING_REFERENCE.md | New + existing subsections | Add 40w calibration scenario; Technical learnings; Known structural gaps |
| docs/40_reports/CALIBRATION_REPORT_BOT_AI_FEB_2026.md | Where 40w/scenario referenced | Add sentence on player_choice for 40w |
| docs/30_planning/20260228_STRUCTURAL_CHANGES_FOR_90PCT_CALIBRATION.md | If scenario choice discussed | Add bullet + link to Phase G report |
| docs/20_engineering/PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.md | recruitment_mode / 40w | Add note on bottom_up in phase_ii and 40w player_choice |
| docs/PROJECT_LEDGER.md | Existing Phase G entry ~8631 | Append Report + Propagation plan lines |
| docs/PROJECT_LEDGER_KNOWLEDGE.md | §3 or §6 | Add bottom_up pipeline, 40w calibration, attack share step themes |

---

## 8. Conflict check

No conflict with existing canon was identified. The report describes already-implemented behavior and calibration decisions; all proposed additions are additive (new subsections or implementation-notes) and do not alter existing normative text. FORAWWV.md is not edited per user instruction.

---

## 9. Execution order

1. Canon first: Engine_Invariants → Phase_I_Spec → Phase_II_Spec → Systems_Manual.
2. Engineering: PIPELINE_ENTRYPOINTS → PHASE_I_OVERHAUL_MILITIA_TO_BRIGADES.
3. BOT_AI_HOLISTIC_TUNING_REFERENCE: 40w subsection, Technical learnings, Known gaps.
4. Calibration docs: CALIBRATION_REPORT_BOT_AI_FEB_2026, 20260228_STRUCTURAL_CHANGES (if applicable).
5. Ledger: append Report + Propagation plan to existing Phase G entry.
6. PROJECT_LEDGER_KNOWLEDGE: add three thematic entries.
