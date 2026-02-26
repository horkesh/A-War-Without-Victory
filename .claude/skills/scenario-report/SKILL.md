---
name: scenario-report
description: Use when running a scenario (e.g. 52-week) and producing a full Paradox team report with tracked metrics and per-role assessments, or when the user asks for a scenario run with everyone weighing in.
---

# Scenario Report (Full Paradox Team Run Review)

## Overview

Run a scenario to completion, collect all harness artifacts, then have the **Orchestrator** convene the Paradox team so each specialist reviews the run from their domain. Produce one **detailed report** with: (1) tracked game systems (troop strengths, brigades, recruitment, militia, displacement, losses, camps, capital/equipment/manpower), and (2) per-role assessments — what works, what does not, what needs changing, tuning, or investigating.

**Related skills:** orchestrator (convene team, single priority); reports-custodian (40_reports placement); quality-assurance-process (validate process after report).

---

## When to Use

- User requests a scenario run with "full team review," "everyone weighing in," or "detailed report with each specialization."
- Periodic comprehensive run review (e.g. 52-week canonical run) to assess state of the game.
- Need a single artifact that summarizes run outcomes and specialist findings for handoff or ledger.

**When NOT to use:** Single-role analysis, regression-only runs without team review, or runs where only harness artifacts (no convene) are needed.

---

## Workflow (Orchestrator-led)

1. **Setup** — Read `.agent/napkin.md`, `.agent/skills-catalog.md`, `.cursor/AGENT_TEAM_ROSTER.md`. Optionally awwv-read-first for scenario/harness.
2. **Run** — Execute a **new** scenario run (do not reuse a previous run). Example: `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 52 --unique --video --map --out runs`. Document run_id and artifact paths from this run.
3. **Collect** — Capture run_id and paths to all artifacts (see Artifacts below).
4. **Convene** — Dispatch to each relevant Paradox role (via Task/mcp_task or equivalent) with run_id and artifact paths; ask: "From your specialization: what works as intended, what does not, what needs changing, tuning, or investigating?" **Subagent types:** Use **formation-expert**, **scenario-creator-runner-tester**, and **historian** when available in the Task subagent enum (see `.cursor/TASK_SUBAGENT_TYPES.md` and `.cursor/AGENT_TEAM_ROSTER.md`). Historian assesses historical plausibility from the BB KB (citation-backed). If the Task tool does not accept those types, use **generalPurpose** with a combined prompt covering Formation (brigades, militia, pools, AoR, OOB, recruitment), Scenario (historical anchors, init_control, ahistorical outcomes), and Historian (BB KB, citation-backed plausibility) and label the response "Formation & Scenario & Historian (combined)."
5. **Synthesize** — Build the report (see Report structure). Add tracked-dimensions summary from run_summary + end_report. State single priority and owner.
6. **Publish** — Write report under `docs/40_reports/convenes/` (e.g. `PARADOX_52W_FULL_TEAM_RUN_REPORT_YYYY_MM_DD.md`). Per reports-custodian, update 40_reports README / CONSOLIDATED_* if needed. Optionally invoke quality-assurance-process.

Orchestrator may batch roles (e.g. QA + determinism-auditor) or do a single "periodic Paradox team review" pass plus specialist deep-dives; see `.cursor/AGENT_TEAM_ROSTER.md`.

---

## Artifacts to Collect

All under the run directory (e.g. `runs/<scenario>__<hash>__w<N>_n<M>/`):

| Artifact | Path | Key contents |
|----------|------|---------------|
| run_summary.json | run_summary.json | summary, historical_alignment (personnel, brigades, recruitment/negotiation/prewar capital), vs_historical, anchor_checks, phase_ii_attack_resolution (+ weekly), phase_ii_takeover_displacement, phase_ii_minority_flight, civilian_casualties, bot_benchmark_evaluation |
| end_report.md | end_report.md | Control changes, exhaustion/displacement, formation delta/fatigue, army strengths (formations_by_faction, militia_pools_by_faction, aor_counts_by_faction), Phase II section |
| final_save.json | final_save.json | Full state: formations, political_controllers, displacement_state, militia_pools, recruitment_state, civilian_casualties |
| control_delta.json | control_delta.json | Flips, direction/municipality counts, net control before/after |
| formation_delta.json | formation_delta.json | formations_added/removed, counts by kind |
| activity_summary.json | activity_summary.json | Front-active, pressure-eligible, displacement-trigger metrics |
| control_events.jsonl | control_events.jsonl | Turn, mechanism, settlement_id |
| weekly_report.jsonl | weekly_report.jsonl | Per-week rows (factions, exhaustion, displacement) |

Replay/replay_timeline if run used `--video`. Source: `src/scenario/scenario_runner.ts`, `src/scenario/scenario_end_report.ts`.

---

## Role → Review Focus

| Role | Focus |
|------|--------|
| Orchestrator | Run/reuse, convene, synthesize, single priority |
| Product Manager | Scope, sequencing, roadmap/ledger alignment |
| Game Designer | Design intent, mechanics vs canon, balance; bot benchmarks |
| Gameplay Programmer | Phase/sim logic, pipeline, Phase II attack/displacement/reinforcement |
| Formation-expert | Brigades, militia, pools, AoR, OOB, recruitment; historical_alignment, formation_delta |
| Scenario-creator-runner-tester | Historical anchors, init_control, ahistorical outcomes; vs_historical, anchor_checks |
| **Historian** | Citation-backed historical plausibility from BB KB; control/holdouts/enclaves/JNA; "what does the record say?" for run outcomes |
| Systems Programmer | Determinism, ordering, serialization, invariants |
| Scenario-harness-engineer | Runner, preflight, diagnostics, artifact completeness |
| Canon-compliance-reviewer | Outputs vs canon and phase specs |
| QA Engineer | Regression, test strategy; use determinism-auditor for ordering |
| Determinism-auditor | Ordering, nondeterminism in pipelines/outputs |
| Performance Engineer | Run duration, hotspots |
| Retrospective Analyst | Synthesize gaps, spec/code discrepancies (after others) |
| Documentation Specialist | Report placement, release notes |
| Reports-custodian | 40_reports structure, CONSOLIDATED_* |

---

## Report Structure (deliverable)

Single markdown file in `docs/40_reports/convenes/` containing:

1. **Title and metadata** — Scenario, run_id, weeks, artifact paths, date.
2. **Executive summary** (Orchestrator) — One paragraph: outcome, key numbers, top 3 findings.
3. **Tracked dimensions (table)** — Troop strengths (personnel, brigades by faction), recruitment/capital, militia pools, displacement (minority flight + takeover), military and civilian losses, camps, control flips and net control, capital/equipment/manpower. Source: run_summary.json + end_report.md (+ final_save high-level).
4. **Per-role sections** — For each invoked role: "What works as intended," "What does not," "What needs changing, tuning, or investigating." Attributed by role name.
5. **Consolidated findings** — Prioritized issues and recommendations (bugs, tuning, investigations, docs).
6. **Single priority and owner** (Orchestrator) — Next step or handoff.
7. **References** — Paths to run_summary, end_report, final_save; canon (Systems Manual, Phase II spec); PROJECT_LEDGER.

Style reference: existing convene reports in `docs/40_reports/convenes/` (e.g. FULL_RUN_ANALYSIS_52W_APR1992_*, PHASE_L_CALIBRATION_*).

---

## Out of Scope (avoid creep)

- Report only; no code or data changes in this workflow.
- Use existing harness outputs; if a dimension is missing, note it in the report as a tracking gap.
- Single run unless user explicitly asks for multi-run or sensitivity.
- Ledger: if the report leads to behavior/output changes, add a ledger entry when those changes are made (awwv-ledger-entry).

---

## Checklist Before Delivery

- [ ] Scenario run completed (**new run**; do not reuse an existing run); run_id documented.
- [ ] All artifacts listed above present; paths recorded.
- [ ] Orchestrator convened relevant roles and received inputs.
- [ ] Report includes: executive summary, tracked dimensions, per-role sections, consolidated findings, single priority.
- [ ] Report file in docs/40_reports/convenes/; 40_reports README/CONSOLIDATED_* updated per reports-custodian.
- [ ] Napkin updated with any corrections or patterns from the run or review.
