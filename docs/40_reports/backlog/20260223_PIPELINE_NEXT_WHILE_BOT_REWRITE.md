# Pipeline / Backlog — Next While Bot Rewrite

**Date:** 2026-02-23  
**Purpose:** Single list of work that can proceed in parallel with the external expert’s bot AI rewrite. Bot implementation depends on [BOT_AI_DESIGN_SPEC.md](../../30_planning/design/BOT_AI_DESIGN_SPEC.md); these items do not block on it.  
**Source:** [ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](../convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md), [20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md](../implemented/20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md), CONSOLIDATED_BACKLOG.

---

## 1. Critical path (comprehensive review convene)

| # | Item | Owner | Notes |
|---|------|--------|--------|
| 1.1 | **War termination / end-game minimal spec** | Game Designer | When negotiation opens (thresholds), how the game ends (treaty / timeout / surrender), minimal scoring/evaluation. Unblocks playtesting. Phase II Spec or Systems Manual subsection. **Done 2026-02-24:** WAR_TERMINATION_MINIMAL_SPEC.md; Architect sign-off §13. |
| 1.2 | **Player’s Turn Guide** | Game Designer / Documentation | Rulebook or linked doc: what the player does each turn by phase (Phase 0: allocate capital; Phase I: …; Phase II: review reports, postures, attack orders, corps operations, end turn). Unblocks playtesting. **Confirmed 2026-02-24:** Rulebook v0.5.0 §15 covers all phases and actions above. |
| 1.3 | **Supply specification** | Architect / Gameplay | Formal spec (sources, OSID graph tracing, corridors, enclave supply) at level of attack resolution formula. After 1.1–1.2; Systems Manual §14 and pipeline exist but not fully specified. |

---

## 2. Important (same convene)

| # | Item | Owner | Notes |
|---|------|--------|--------|
| 2.1 | **Phase 0 hand-off: JNA_status** | Game Designer / Gameplay | Add JNA_status (transition_begun, withdrawal_progress, asset_transfer_RS) to Phase 0 §7 Hand-Off Data and §8 Output Contract so Phase I §3 is satisfied. Implement if not already passing it. |
| 2.2 | **Phase II ceasefire / Washington in pipeline** | Gameplay Programmer | Ceasefire and Washington precondition checks must run when `meta.phase === 'phase_ii'` (pipeline step or shared milestone). Document in Phase II Spec and PIPELINE_ENTRYPOINTS. |
| 2.3 | **Phase I→II edge cases** | Game Designer / Gameplay | Stuck-in-Phase-I: time-based fallback + player-facing explanation; entrenchment init policy (e.g. scenario param `phase_ii_entrenchment_init_turns` or accept weak first turns). **Done 2026-02-25:** [20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md](../implemented/20260225_PIPELINE_2_3_2_4_2_5_EDGE_CASES_OPERATION_STORM_SCORING.md). |
| 2.4 | **Late-war intervention (Operation Storm)** | Game Designer | Spec as design doc; conditions (Washington active, RS threat, exhaustion, IVP). Implement after canon. **Done 2026-02-25:** Phase II Spec §11.3, phase-ii-operation-storm-check step; same report. |
| 2.5 | **Scoring / evaluation** | Game Designer | Minimal evaluation criteria with war termination (territory, population preserved, exhaustion). **Done 2026-02-25:** WAR_TERMINATION_MINIMAL_SPEC §8, Phase II §11.2.4; same report. |

---

## 3. AoR phase-out follow-ups (decisions for review)

| # | Item | Owner | Notes |
|---|------|--------|--------|
| 3.1 | **phase-ii-recon-intelligence** | Gameplay Programmer | Still gated on `getLegacyAoR(state).brigade_aor`. Switch to location_osid/OSID so consistent with OSID-era bot. |
| 3.2 | **aor_init.ts cleanup** | Systems / Gameplay | Module retained but unused; remove or repurpose (no imports from scenario_runner or run_phase_ii_browser). |
| 3.3 | **Test / baseline strategy** | QA / Scenario Harness | 14 Vitest AoR-related failures + 3 scenario/baseline failures (golden hash, zvornik/srebrenica init-control anchors). Choose: (1) canon reconciliation for init-control anchors then baseline refresh, or (2) explicit golden-baseline update workflow with report and safety checklist. Document and execute. |

---

## 4. Other backlog (no bot dependency)

| # | Item | Owner | Notes |
|---|------|--------|--------|
| 4.1 | **Phase 0 output contract completeness** | Game Designer / Gameplay | Beyond JNA_status: confirm `transition.phase_0_end_turn`, `phase_1_start_turn`, `escalation_reason` implemented and persisted; add to contract if missing. |
| 4.2 | **GUI / Warroom** | UI / PM | Batch advance two weeks, start-of-game information, other GUI backlog per CONSOLIDATED_BACKLOG §4. |
| 4.3 | **Headless vs desktop Phase II** | QA / Gameplay | Some front/corps state is desktop-only (e.g. corps_front_edges). Regression and acceptance criteria should cover both headless and desktop. |

---

## 5. Suggested order (PM to sequence)

1. **Canon/docs (no code):** 2.1 (Phase 0 JNA_status), 2.2 (Phase II ceasefire/Washington docs), 1.1 (war termination minimal), 1.2 (Player’s Turn Guide).
2. **Pipeline (small):** 2.2 implementation — add Phase II ceasefire/Washington check step (or shared milestone).
3. **Recon-intelligence:** 3.1 — move off legacy AoR onto location_osid/OSID.
4. **Cleanup:** 3.2 (aor_init), 3.3 (test/baseline strategy).
5. **Design/spec only:** 1.3 (supply spec), 2.4 (Operation Storm spec), 2.3 (Phase I→II edge-case policy).

---

## 6. References

- [ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](../convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md)
- [20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md](../implemented/20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md) §4 Decisions for review
- [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md)
- [BOT_AI_DESIGN_SPEC.md](../../30_planning/design/BOT_AI_DESIGN_SPEC.md) (external expert; parallel track)
