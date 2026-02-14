# Orchestrator: Scenario runs handoff for historical verification

**Convened by:** Orchestrator  
**Date:** 2026-02-13  
**Purpose:** New scenario runs executed; delegate **scenario-creator-runner-tester** (and optionally **formation-expert**) to check final outputs against historical expected outcomes.

---

## Goal

- **Orchestrator:** Run a small set of canonical scenarios, capture final output paths, and delegate verification.
- **Subagent (scenario-creator-runner-tester):** Compare run results to historical expectations for BiH war (April 1992 start, Phase I/II); flag ahistorical or unintended outcomes; propose conceptual fixes only.
- **Subagent (formation-expert, if needed):** If formation/OOB/AoR or spawn behavior needs interpretation, verify brigade counts, AoR coverage, and spawn directives against canon and OOB masters.

---

## Runs executed (monitored output)

| Scenario | Run ID | Out dir | Key artifacts |
|----------|--------|---------|----------------|
| **apr1992_phase_ii_4w** | apr1992_phase_ii_4w__e9030069f8c5c321__w4 | `runs/apr1992_phase_ii_4w__e9030069f8c5c321__w4/` | end_report.md, control_delta.json, formation_delta.json, run_summary.json, final_save.json |
| **apr1992_4w** | apr1992_4w__a86c222f6a9dabf8__w4 | `runs/apr1992_4w__a86c222f6a9dabf8__w4/` | end_report.md, control_delta.json, formation_delta.json, run_summary.json, final_save.json |
| **player_choice_recruitment_no_flip_4w** | player_choice_recruitment_no_flip_4w__b6a89680b0f60aaf__w4 | `runs/player_choice_recruitment_no_flip_4w__b6a89680b0f60aaf__w4/` | end_report.md, control_delta.json, run_summary.json |

All runs used: `npm run sim:scenario:run -- --scenario <path> --out runs`.

---

## Summary of final output (for quick reference)

### Findings (implementation semantics + interpretation)

- `disable_phase_i_control_flip: true` is wired and applied as designed in current code path, but it means **military-action-only** control resolution in Phase I (brigade-led flips still possible), not "zero flips."
- The `apr1992_phase_ii_4w` formation count (55) is consistent with `recruitment_mode: "player_choice"` + `init_formations_oob: true` in current runner behavior (constrained recruitment subset), not full legacy OOB auto-spawn.
- The remaining open diagnostic question for `apr1992_phase_ii_4w` is whether 0 flips came from no attack orders or from defender-favored outcomes; add/report `phase_ii_resolve_attack_orders` summary in run artifacts to disambiguate.
- **Closure status:** see `docs/40_reports/ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md` for final decisions on the three open questions.

### apr1992_phase_ii_4w (4 weeks, Phase II start, bots, OOB, formation_spawn both)

- **Control:** 0 settlements changed. Net unchanged: HRHB 1024, RBiH 2409, RS 2389.
- **Formations:** 1 added, 0 removed. End state: HRHB 5, RBiH 26, RS 24 (55 total).
- **Exhaustion:** HRHB 0.002→0.008, RBiH 0.002→3.01, RS 1.002→6.01. Total fatigue 0→50.
- **Displacement:** Settlement total 75→301; municipality total 2.14→8.59.

### apr1992_4w (4 weeks, default start, no bots, 3 formations)

- **Control:** 0 settlements changed. Net unchanged: HRHB 1024, RBiH 2409, RS 2389.
- **Formations:** 3 (1 per faction). 0 added, 0 removed.
- **Exhaustion:** 0 throughout. Displacement: settlement total 75→301, municipality 2.14→8.56.

### player_choice_recruitment_no_flip_4w (4 weeks, Phase I, military-action-only scenario)

- **Control:** 275 settlements changed (scenario sets `disable_phase_i_control_flip: true`, which enables military-action-only control resolution). Net: HRHB 1024→1003, RBiH 2409→2301, RS 2389→2518. Top flips: lopare (29), travnik (29), kotor_varos (27), brcko (25), maglaj (20). Direction: RBiH→RS 149, RS→RBiH 43, HRHB→RS 45, RS→HRHB 22, RBiH→HRHB 9, HRHB→RBiH 7.
- **Control events:** 550 phase_i_control_flip (consistent with military-action-only path; validate balance/plausibility against expected policy trajectory).
- **Formations:** 0 added, 0 removed. End state: HRHB 10, RBiH 25, RS 32.
- **Exhaustion:** Low. Total fatigue 0. Displacement unchanged (22/164112).

---

## What to check (historical expected outcomes)

**Scenario-creator-runner-tester** should:

1. **Control and geography:** For April 1992 start and 4-week horizon, are control flips (when any) and net territorial changes plausible? For phase_ii_4w, previous handoff (2026-02-12) had 86 flips; this run had 0 — confirm whether Phase II attack resolution is intended to flip control or not.
2. **Formation counts and OOB:** Phase II run shows 55 formations (HRHB 5, RBiH 26, RS 24); 2026-02-12 handoff reported 274 (HRHB 43, RBiH 131, RS 100). Confirm which OOB/init path is canonical and whether formation spawn or init changed.
3. **RBiH–HRHB:** No open RBiH–HRHB war before week 26. No RBiH↔HRHB-only flips in phase_ii (0 flips). For player_choice run, direction mix includes HRHB↔RBiH (16 total) — acceptable if no-flip was not actually applied.
4. **No-flip semantics + trajectory:** player_choice_recruitment_no_flip_4w has `disable_phase_i_control_flip: true`, which is military-action-only (not strict zero-flip). Check whether 275 flips and RS net gain are still within policy expectation ("reduce RS over-expansion versus default"), or require tuning/new scenario gate.

**Formation-expert** (if invoked): Interpret formation_delta.json, brigade fatigue, and AoR vs canon; explain 55 vs 274 formation count discrepancy for Phase II.

---

## Required reading (for subagent)

- `docs/knowledge/SCENARIO_01_APRIL_1992.md`, `docs/knowledge/SCENARIOS_02-08_CONSOLIDATED.md`, `docs/knowledge/SCENARIOS_EXECUTIVE_SUMMARY.md`
- `docs/knowledge/SCENARIO_DATA_CONTRACT.md`, `docs/knowledge/SCENARIO_GAME_MAPPING.md`
- OOB masters: `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`
- `docs/40_reports/SCENARIO_RUN_WHAT_ACTUALLY_HAPPENS.md`

---

## Expected output from subagent

- **Scenario definition summary** (per run: init_control, init_formations, start_phase, weeks, key options).
- **Run summary:** Control flips, formation deltas, army strengths; **one-line plausibility verdict** per run.
- **Flags:** Bullet list of ahistorical or unintended items with short rationale.
- **Proposals:** Numbered conceptual recommendations (what to add/change, which role could implement). No code.

---

## Single priority and handoff

- **Priority:** Verify these three run outputs against historical expectations; explain Phase II 0-flip vs previous 86-flip and 55 vs 274 formations; confirm no-flip flag handling.
- **Owner:** Scenario-creator-runner-tester (primary); Formation-expert on request for formation/OOB deep-dive.
- **Orchestrator:** Will synthesize subagent findings and update ledger/napkin as needed; Process QA can validate after handoff.

## Decision link

- Final decision memo: `docs/40_reports/ORCHESTRATOR_SCENARIO_HANDOFF_DECISIONS_2026_02_13.md`
