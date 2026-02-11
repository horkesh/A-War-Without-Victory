# Paradox convening: RBiH wipe-out fix

**Date:** 2026-02-10  
**Purpose:** Convene Paradox to agree a single priority and stepwise plan so RBiH is not eliminated by turn 26 in calibration runs; wire capability into Phase I control flip and document decisions for Process QA.

---

## 1. Problem statement

- **Observed:** In apr1992_50w_bots 30w runs, at turn 26 (~Oct 1992) RBiH control share is **0%**; benchmark target is ~20% (“hold core centers”). HRHB over-represented (~44% vs target ~15%); RS in band (~56% vs ~45%).
- **Historical:** By late 1992 ARBiH held ~20–30% and was organizing; VRS had ~60–70%. RBiH must not be eliminable in early war; the engine should allow “hold core + build up.”
- **Evidence:** `runs/apr1992_50w_bots__58862f1b4ddd95cf__w30/run_summary.json`, `end_report.md`; analysis in `docs/40_reports/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md`.
- **Root cause:** Phase I control flip uses only militia strength + stability; capability progression (VRS decline, ARBiH organization) is in state and updated each turn but **not used** in flip/pressure. Capability profiles were only updated in Phase II, so during Phase I they were never set. Early war is dominated by raw strength and RBiH collapses.

---

## 2. Per-role Q&A summary

| Role | Question | Synthesized answer |
|------|----------|--------------------|
| **Game Designer** | Acceptable to use capability in Phase I flip formula? Canon addendum? | Treat as allowed extension of “stability + defensive militia vs attacking militia”; add implementation-note (like coercion) so future readers know. |
| **Gameplay Programmer** | Where to wire capability? | (1) Add Phase I step to run `updateCapabilityProfiles` before control-flip. (2) In control_flip: scale attacker strength by `getFactionCapabilityModifier(..., 'ATTACK')`, defender effectiveDefense by `getFactionCapabilityModifier(..., 'DEFEND'/'STATIC_DEFENSE')`. Deterministic doctrine per faction. |
| **Formation-expert** | Pool/authority changes for core RBiH muns? | No change; focus is flip/pressure and init. |
| **Scenario-creator-runner-tester** | Tune init_control/thresholds first? | Secondary lever: after capability wiring, re-run 30w; if RBiH still below band, review init_control and FLIP_* constants. |
| **Technical Architect** | New entrypoints? Determinism? | No new entrypoints. Capability read-only per turn; doctrine keys fixed by faction. Document step in PIPELINE_ENTRYPOINTS and REPO_MAP. |
| **Product Manager** | Scope and phasing? | Single priority: wire capability into Phase I flip. Phasing: design/canon → code → scenario/tuning → tests/docs. |
| **Canon-compliance-reviewer** | Does §4.3 or Appendix D forbid capability in flip? | Canon silent; using capability to scale inputs is an extension; track as implementation-note. |
| **QA** | How to validate? | Re-run apr1992_50w_bots 30w; turn-26 benchmark “hold_core_centers” (0.2 ± 0.1). Determinism: same scenario + seed → same control shares. |

---

## 3. Agreed priority

**Priority:** Wire **capability progression into Phase I control flip** (and ensure capability is updated in Phase I) so that territorial outcomes reflect VRS/ARBiH curves and RBiH can hold a non-zero share (~20% target) by turn 26. Secondary: init/threshold tuning only if needed after wiring.

---

## 4. Stepwise plan with owners

1. **Design / canon** — Game Designer, Canon-compliance: Add implementation-note to Phase I §4.3 and Systems Manual System 10. **Done.**
2. **Code: Phase I capability update** — Gameplay Programmer: Add `phase-i-capability-update` step before `phase-i-control-flip`; call `updateCapabilityProfiles(context.state)`. **Done.**
3. **Code: Control flip capability scaling** — Gameplay Programmer: In control_flip, scale attacker strength and defender effectiveDefense by `getFactionCapabilityModifier` (deterministic doctrine: ATTACK for attacker, DEFEND/STATIC_DEFENSE for defender). **Done.**
4. **Scenario / tuning** — Scenario-creator-runner-tester: Re-run apr1992_50w_bots 30w; if RBiH still below band, review init_control and FLIP_* with Designer. **Done (run executed; RBiH still 0% at turn 26—follow-up tuning/defensive floor remains).**
5. **Tests and docs** — QA, Technical Architect: Update PIPELINE_ENTRYPOINTS, REPO_MAP, DETERMINISM_AUDIT; ledger entry; optional PROJECT_LEDGER_KNOWLEDGE. **Done.**
6. **Process QA** — After execution: verify context, ledger, no FORAWWV edit, commit discipline.

---

## 5. Post-implementation note

First 30w run after capability wiring: turn-26 RBiH control share remained 0%, RS 100%. Capability scaling is applied (defender DEFEND 0.6, attacker ATTACK 0.9); the formula correctly reflects 1992 asymmetry but does not by itself achieve “hold core” without additional levers. **Next steps:** init_control review, FLIP_THRESHOLD_BASE / FLIP_ATTACKER_FACTOR tuning, or defensive floor for core RBiH municipalities (canon-compliant). See ledger entry 2026-02-10 and `docs/40_reports/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md`.

---

## 6. References

- Analysis: `docs/40_reports/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md`
- Canon: Phase I §4.3, Systems Manual Appendix D
- Code: `src/sim/phase_i/control_flip.ts`, `src/state/capability_progression.ts`, `src/sim/turn_pipeline.ts`
- Ledger: PROJECT_LEDGER.md 2026-02-10 (RBiH wipe-out fix)
