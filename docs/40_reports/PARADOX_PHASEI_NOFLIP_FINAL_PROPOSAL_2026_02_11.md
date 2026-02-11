# Paradox: Phase I No-Flip Calibration — Final Proposal (2026-02-11)

**Status:** Final proposal  
**Convened roles:** Game Designer, Gameplay Programmer, Canon Compliance Reviewer, Determinism Auditor, QA Engineer, Scenario Harness Engineer  
**Evidence base:** PARADOX_PHASEI_SCENARIO_LEVEL_TUNING_PASS_2026_02_11.md, PARADOX_PHASEI_MILITARY_ACTION_CALIBRATION_SWEEP_2026_02_11.md, phase_i_knob_grid_summary_w12.json, phase_i_attack_scale_sweep_summary.json

---

## A) Recommended Product Decision

### Default behavior (unchanged)
- **ethnic_1991** and **hybrid_1992** families: Use **default** Phase I control flip (militia-pressure + brigade amplification).
- Rationale: All tested no-flip profiles underperform default at 30w (RS 2836/2831 vs best no-flip 2921/3175). Short-term (12w) gains in some ethnic profiles (a=1.4) do not carry through; hybrid 12w fit collapses by 30w.

### Scenario-flagged no-flip mode
- **player_choice** recruitment-focused scenarios: **GO** for `disable_phase_i_control_flip: true` as canonical option.
- Rationale: No-flip improves balance substantially (RS 2834 vs default 3329 at 30w). Knob tuning is neutral in tested range (all 9 grid combinations yield identical output), so canonical defaults (attack 1.0, buffer 0.2) suffice.

### Policy summary
| Scenario family   | Default mode      | No-flip adoption                            |
|-------------------|-------------------|---------------------------------------------|
| ethnic_1991      | militia-pressure  | NO-GO — remain default only                |
| hybrid_1992      | militia-pressure  | NO-GO — remain default only                |
| player_choice    | militia-pressure  | GO — use no-flip when recruitment-centric   |

---

## B) Canon Compliance Position

### Canon-safe (normative)
- **Militia-pressure control flip (§4.3):** Phase I spec defines flip via stability + defensive militia vs attacking militia. This remains the normative path for ethnic/hybrid.
- **Brigade amplification:** Canon permits brigade strength in adjacent muns to amplify attack (e.g. 0.5×). Implemented in default branch.

### Implementation-note / experimental (non-normative)
- **disable_phase_i_control_flip:** Scenario-gated switch; not in Phase I spec. Treated as implementation-note per context.md v0.5 policy.
- **militaryActionOnly branch:** Brigade-only flip (no militia pressure) is experimental. Phase I spec states "organizational mechanics (militia, police, paramilitaries)" — military-action-only diverges from this.
- **phase_i_military_action_attack_scale / phase_i_military_action_stability_buffer_factor:** Experimental tuning; used only when disable_phase_i_control_flip=true. Non-normative until promoted by canon addendum.

### Canon ambiguity
- Phase I §4.3 does not explicitly forbid a brigade-led alternative path. The spec is silent on scenario-gated variants. **No conflict** — experimental path is additive and scenario-gated.
- **Escalation order** if canon change needed: Game Designer → Phase I spec addendum → context.md update.

---

## C) Determinism and Stable-Ordering Guarantees

### Current guarantees (preserve)
- **Scenario knobs:** Scalar inputs; clamped deterministically in scenario_loader (attack [0.1, 2.0], buffer [0, 1]).
- **Control flip path:** `munIds.sort(strictCompare)`; candidates sort by stability ASC, mun_id ASC (§9.2).
- **No new randomness:** Knobs are pass-through; no RNG, Date.now, or nondeterministic iteration.
- **Artifacts:** `generated_at: "deterministic-no-timestamp"` pattern; no wall-clock in outputs.

### Determinism Auditor finding
No determinism risks identified. Knobs are deterministic scalar inputs; iteration order and flip resolution order unchanged.

---

## D) Implementation Plan (Phased, Minimal-Risk)

### Phase 1: Policy documentation (no code change)
1. Update napkin §Domain Notes: Finalize no-flip policy (ethnic/hybrid NO-GO; player_choice GO).
2. Add entry to PROJECT_LEDGER_KNOWLEDGE.md under "Phase I" / "No-flip calibration": decision rationale, go/no-go table.
3. Add PROJECT_LEDGER.md changelog entry for this proposal.

### Phase 2: Scenario authoring (config only)
1. Ensure player_choice recruitment scenarios that benefit from no-flip have `disable_phase_i_control_flip: true`.
2. Omit `phase_i_military_action_attack_scale` and `phase_i_military_action_stability_buffer_factor` unless tuning is needed (defaults 1.0/0.2 apply).
3. Do **not** add `disable_phase_i_control_flip` to ethnic or hybrid canonical scenarios.

### Phase 3: Code clarity (optional, low risk)
1. Add JSDoc in `control_flip.ts`: "militaryActionOnly: experimental; used when scenario.disable_phase_i_control_flip=true. Not in Phase I canon."
2. Add comment in `scenario_types.ts` that knobs apply only when `disable_phase_i_control_flip === true`.
3. **No** behavioral changes; comments only.

### Phase 4: Cleanup (optional)
1. Archive or remove `_tmp_*` calibration scenarios from `data/scenarios/` if no longer needed for regression.
2. Keep `runs/phase_i_*_summary.json` artifacts for audit trail.

---

## E) Validation Plan

### Required scenario matrix
| Scenario family   | Mode     | 12w | 30w | Notes                                   |
|------------------|----------|-----|-----|----------------------------------------|
| ethnic_1991_init_4w | default | ✓   | ✓   | Baseline; RS ~2729 @12w, ~2836 @30w   |
| hybrid_1992_init_4w | default | ✓   | ✓   | Baseline; RS ~2955 @12w, ~2831 @30w   |
| player_choice_recruitment_no_flip_4w | no-flip | ✓ | ✓ | RS ~2839 @12w, ~2834 @30w              |

### Pass/fail criteria
- **Default ethnic/hybrid:** RS share at 30w within ±5% of baseline (ethnic 2836, hybrid 2831). Displacement and recruitment counts within ±10%.
- **No-flip player_choice:** RS share at 30w ≤ 2900 (vs default 3329). Recruitment mandatory/elective/skipped counts unchanged from calibration sweep.
- **Determinism:** Same scenario + same run id → byte-identical run_summary.json and control_events output.

### Regression checks
- **Recruitment:** `[Recruitment] Mandatory: 0, Elective: 46, Skipped: control=57 manpower=104...` (or equivalent) in player_choice runs.
- **Casualty/fatigue:** Logged in end_report; no regression in Phase II transition.
- **Displacement:** Municipality displacement totals within expected band per scenario family.

### Gates
- `npm run typecheck` — pass.
- `tests/scenario_determinism_h1_1.test.ts` — pass.
- `tools/scenario_runner/run_baseline_regression.ts` — include ethnic_1991, hybrid_1992, player_choice_no_flip in manifest if regression matrix exists.

---

## F) Risk Register + Mitigations

| Risk                                | Likelihood | Impact | Mitigation                                         |
|-------------------------------------|------------|--------|----------------------------------------------------|
| User enables no-flip on ethnic/hybrid | Medium    | High   | Document NO-GO in scenario authoring guide; add napkin/ledger note |
| Knob drift if defaults change       | Low        | Medium | Pin defaults in control_flip.ts; document in spec  |
| Canon drift (military-action promoted) | Low      | Medium | Keep implementation-note until Game Designer promotes |
| Determinism regression              | Low        | High   | No new logic; scalar pass-through; existing gates  |
| player_choice regression if seed changes | Low   | Medium | Include in baseline regression; freeze scenario hashes |

---

## G) Go / No-Go Table

| Scenario family   | 12w horizon | 30w horizon | Verdict   |
|-------------------|-------------|-------------|-----------|
| **ethnic**        |             |             |           |
| default           | GO          | GO          | Use default |
| no-flip any knob  | NO-GO       | NO-GO       | Do not adopt |
| **hybrid**        |             |             |           |
| default           | GO          | GO          | Use default |
| no-flip any knob  | NO-GO       | NO-GO       | Do not adopt |
| **player_choice** |             |             |           |
| default           | GO          | NO-GO*      | RS over-expansion at 30w |
| no-flip           | GO          | GO          | Adopt for recruitment scenarios |

\*Default player_choice is acceptable for non-recruitment use cases; for recruitment-centric flows, no-flip is preferred.

---

## H) Executive Recommendation

**We recommend adopting no-flip mode only for player_choice recruitment-focused scenarios.** Calibration shows that no-flip substantially improves balance (RS 2834 vs 3329 at 30w) in that family, while ethnic and hybrid historical scenarios perform worse with no-flip at medium and long horizons. The default militia-pressure control flip remains the canonical path for ethnic_1991 and hybrid_1992. Knob tuning (attack scale, stability buffer) has negligible effect on player_choice and need not be exposed; the existing defaults (1.0, 0.2) are sufficient. No code changes are required to implement this policy—only scenario authoring and documentation updates. Future R&D may explore family-specific military-action weighting for ethnic/hybrid, but this is out of scope for the current release.
