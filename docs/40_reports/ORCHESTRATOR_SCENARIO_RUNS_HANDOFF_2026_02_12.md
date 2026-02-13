# Orchestrator: Scenario runs handoff for historical verification

**Convened by:** Orchestrator  
**Date:** 2026-02-12  
**Purpose:** New scenario runs executed; delegate **scenario-creator-runner-tester** (and optionally **formation-expert**) to check final outputs against historical expected outcomes.

---

## Goal

- **Orchestrator:** Run a small set of canonical scenarios, capture final output paths, and delegate verification.
- **Subagent (scenario-creator-runner-tester):** Compare run results to historical expectations for BiH war (April 1992 start, Phase I/II); flag ahistorical or unintended outcomes; propose conceptual fixes only.
- **Subagent (formation-expert, if needed):** If formation/OOB/AoR or spawn behavior needs interpretation, verify brigade counts, AoR coverage, and spawn directives against canon and OOB masters.

---

## Runs executed (monitored output)

| Scenario | Run ID | Out dir | Key artifacts |
|---------|--------|---------|----------------|
| **apr1992_phase_ii_4w** | apr1992_phase_ii_4w__60c803f0e94e5ca0__w4 | `runs/apr1992_phase_ii_4w__60c803f0e94e5ca0__w4/` | end_report.md, control_delta.json, formation_delta.json, run_summary.json, final_save.json |
| **apr1992_4w** | apr1992_4w__a86c222f6a9dabf8__w4 | `runs/apr1992_4w__a86c222f6a9dabf8__w4/` | end_report.md, control_delta.json, formation_delta.json, run_summary.json, final_save.json |
| **player_choice_recruitment_no_flip_4w** | (run completed; out dir in `runs/` by scenario_id + hash + w4) | See `runs/` for latest `player_choice_recruitment_no_flip_4w__*__w4` | end_report.md, control_delta.json, run_summary.json |

All runs used: `npm run sim:scenario:run -- --scenario <path> --out runs`.

---

## Summary of final output (for quick reference)

### apr1992_phase_ii_4w (4 weeks, Phase II start, bots, OOB, formation_spawn both)

- **Control:** 86 settlements changed controller. Net: HRHB 1024→1015, RBiH 2409→2418, RS 2389→2389. Top flips: bosanska_krupa (9), banja_luka (6), bihac (6), stari_grad_sarajevo (6). Direction: RBiH→RS 29, RS→RBiH 38, HRHB→RS 14, RS→HRHB 5.
- **Formations:** 0 added, 0 removed. End state: HRHB 43, RBiH 131, RS 100.
- **Exhaustion:** HRHB 1→2, RBiH 4→14, RS 7→23. Total fatigue 0→382.
- **Displacement:** Settlement total 75→298; municipality total 2.14→8.18.

### apr1992_4w (4 weeks, default start, no bots, 3 formations)

- **Control:** 0 settlements changed. Net unchanged: HRHB 1024, RBiH 2409, RS 2389.
- **Formations:** 3 (1 per faction). 0 added, 0 removed.
- **Exhaustion:** 0 throughout. Displacement: settlement total 75→301, municipality 2.14→8.56.

---

## What to check (historical expected outcomes)

**Scenario-creator-runner-tester** should:

1. **Control and geography:** For April 1992 start and 4-week horizon, are control flips (when any) and net territorial changes plausible? Consider: RS expansion in Prijedor/Banja Luka/Bihac corridor, Sarajevo envelope, Eastern Bosnia (Zvornik, etc.). Flag if direction or magnitude is ahistorical (e.g. RBiH gaining heavily in RS heartland with no historical basis).
2. **Formation counts and OOB:** Do end-state formation counts (RBiH 131, RS 100, HRHB 43 in phase_ii_4w) align with OOB masters and BB for early 1992? Are any factions over/under-represented?
3. **RBiH–HRHB:** No open RBiH–HRHB war before week 26 (rbih_hrhb_war_earliest_week). Do control events or direction changes show any RBiH↔HRHB flips in these 4w runs? (Expected: none.)
4. **Recruitment (player_choice run):** If reviewing player_choice_recruitment_no_flip_4w, is recruitment volume and faction balance plausible for 4 weeks?

**Formation-expert** (if invoked): Interpret formation_delta.json, brigade fatigue in end_report, and AoR coverage vs canon/Phase II spec; flag if AoR or spawn behavior is wrong.

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

- **Priority:** Verify these three run outputs against historical expectations and report back (flags + proposals).
- **Owner:** Scenario-creator-runner-tester (primary); Formation-expert on request for formation/AoR deep-dive.
- **Orchestrator:** Will synthesize subagent findings and update ledger/napkin as needed; Process QA can validate after handoff.
