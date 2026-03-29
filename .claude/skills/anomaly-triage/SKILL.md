---
name: anomaly-triage
description: Post-scenario anomaly investigation pipeline. Dispatches expert agents to investigate anomalies, cross-cut review for root causes, then presents findings with go/no-go recommendations. Use after any scenario run that produces anomaly reports, or when the user asks to investigate anomalies.
---

# Anomaly Triage

## What You Are

An automated investigation pipeline that turns anomaly detector output into root-cause diagnoses and actionable fix proposals. You are the bridge between detection and resolution.

## When to Invoke

- After any scenario run (`npm run sim:scenario:run:40w` or `sim:scenario:run:default`)
- When the user says "investigate anomalies", "triage anomalies", or "what's wrong with the sim"
- When the orchestrator routes anomaly findings to you

## Pipeline

### Phase 1: Extract Anomalies

Read the latest `run_summary.json` from the most recent run directory:
```bash
ls -td runs/apr1992_definitive_40w__* | head -1
```
Then extract `anomaly_detection.reports` from the summary.

**Skip** anomalies with severity `info` — those are informational only.
**Prioritize** `critical` over `warning`.

### Phase 2: Group by Owner

Route each anomaly to its owning expert using this table:

| Anomaly Type | Owner Skill | Domain |
|-------------|-------------|--------|
| `disconnected_sector_territory` | sector-expert | Territory contiguity |
| `empty_contested_sector` | sector-expert | Sector-brigade gap |
| `phantom_sector_advantage` | sector-expert | Stale derived data |
| `unassigned_frontline_brigades` | sector-expert | Brigade assignment |
| `rear_brigades_in_sector` | sector-expert | Brigade distribution |
| `frontline_density_imbalance` | sector-expert | Density allocation |
| `undefended_front_subsegments` | sector-expert | Sub-segment coverage |
| `brigade_far_from_home` | operations-expert | Drift from ops/march |
| `orphan_operation_brigades` | operations-expert | Op staging/reachability |
| `operation_stagnation` | operations-expert | Blocked ops |
| `operation_zero_eligible_execution` | operations-expert | Failed op execution |
| `brigade_stacking` | gameplay-programmer | Movement/placement logic |
| `brigade_never_fights` | gameplay-programmer | Bot AI engagement |
| `zero_combat_corps` | gameplay-programmer | Dead front / bot AI |
| `combat_ineffective_concentration` | formation-expert | Reinforcement/mobilization |
| `morale_collapse_cluster` | formation-expert | Morale/cohesion systems |
| `zero_personnel_active` | formation-expert | Dissolution/lifecycle |
| `battle_tempo_floor` | war-or-game | Overall sim health |
| `outcome_distribution_skew` | war-or-game | Combat balance |
| `casualty_ratio_check` | war-or-game | Combat model |
| `osid_seesawing` | war-or-game | Front stability |
| `corps_out_of_area` | war-or-game | Realism |

### Phase 3: Dispatch Expert Investigations (PARALLEL)

For each expert that has anomalies assigned, dispatch an Agent with:

1. **The anomaly details** — full description, entities, turn, severity
2. **Required reading** — the expert's skill file lists required reading; include those paths
3. **Investigation mandate**:
   - Read the relevant source code paths end-to-end
   - Identify the ROOT CAUSE — not the surface symptom
   - Distinguish between "expected behavior" (e.g., HVO zero combat under Graz Accords) and "bugs"
   - For bugs: trace the exact code path that produces the anomaly
   - Propose a fix with specific file + function + change description
   - Estimate calibration impact (will this change territory outcomes?)
4. **What NOT to do**: Do not implement fixes. Investigation only.

**Dispatch template for each expert agent:**
```
You are the {EXPERT_NAME} investigating {N} anomalies from a {DURATION}w scenario run.

## Your anomalies
{LIST OF ANOMALY DESCRIPTIONS}

## Required reading
- {EXPERT SKILL FILE PATHS}
- The run's final_save.json for state inspection: {RUN_DIR}/final_save.json
- The run_summary.json for context: {RUN_DIR}/run_summary.json

## Your task
For EACH anomaly:
1. Is this EXPECTED behavior or a BUG? (e.g., HVO not fighting under Graz Accords = expected)
2. If bug: trace the code path. What function produces this state? What's the root cause?
3. Propose a fix: file, function, specific change. Do NOT implement — investigation only.
4. Rate severity: P1 (engine broken), P2 (wrong behavior), P3 (suboptimal)
5. Estimate: will fixing this change calibration outcomes?

## Rules
- Health of the engine > calibration percentages
- Root causes only — never patch symptoms
- Read the code before concluding anything
- If two anomalies share a root cause, say so
```

### Phase 4: Cross-Cut Review

After all expert investigations return, dispatch a **review panel** of 3 agents in parallel:

1. **Technical Architect** — reviews proposed fixes for:
   - Architecture impact (does the fix create coupling? break invariants?)
   - Pipeline ordering (will the fix invalidate derived data?)
   - Scope creep (is the fix minimal and surgical?)

2. **War-or-Game** — reviews findings for:
   - Historical plausibility (is the "expected behavior" actually realistic?)
   - Combat balance (will fixes shift the war in unrealistic ways?)
   - Known historical patterns that explain the anomaly

3. **Systems Programmer** — reviews for:
   - Determinism (does the fix introduce nondeterminism?)
   - Ordering sensitivity (will the fix produce different results with different iteration order?)
   - Edge cases (what happens at week 0? Week 52? With 0 brigades?)

Each reviewer receives ALL expert findings and proposed fixes. Their job is to challenge, validate, or flag concerns — not to implement.

### Phase 5: Present to User

Compile all findings into a structured report:

```markdown
## Anomaly Triage Report — n{RUN_NUMBER}

### Run: {RUN_DIR}
{TOTAL} anomalies: {CRITICAL} critical, {WARNING} warning, {INFO} info

### Expected Behavior (no action needed)
| Anomaly | Expert | Why it's expected |
|---------|--------|-------------------|

### Bugs — Root Causes Found
| # | Anomaly | Root Cause | Fix Proposal | Severity | Calibration Impact | Expert | Reviewer Concerns |
|---|---------|------------|-------------|----------|-------------------|--------|-------------------|

### Shared Root Causes
{Where multiple anomalies trace to the same underlying issue}

### Reviewer Flags
{Any concerns raised by the cross-cut review panel}

### Recommended Action Order
{Sequenced list: fix X before Y because dependency}

**Awaiting your go/no-go on each proposed fix.**
```

## Key Principles

1. **Root cause, never symptoms.** If 9 empty sectors all trace to brigade_assignment.ts line 350, that's ONE root cause with 9 symptoms.
2. **Expected behavior is not a bug.** HVO not fighting = Graz Accords. RBiH overcapture = mobilization scale. Label these clearly.
3. **Engine health > calibration %.** A fix that drops calibration 2pp but repairs broken mechanics is ALWAYS the right call.
4. **One fix per investigation.** Don't bundle. Present each fix independently so the user can approve/reject individually.
5. **Shared root causes are gold.** When one fix resolves 5 anomalies, highlight it — that's the highest-value work.
6. **Parallel dispatch.** All expert investigations run simultaneously. All reviewers run simultaneously. Minimize wall-clock time.
7. **No implementation without go/no-go.** This pipeline STOPS at the report. The user decides what gets built.

## Files This Skill Reads
- `run_summary.json` — anomaly reports from scenario run
- `final_save.json` — full game state for inspection
- Expert skill files — for required reading lists
- Source code — traced during investigation (not modified)

## Files This Skill Does NOT Modify
- Everything. This is investigation-only. Fixes are implemented separately after user approval.
