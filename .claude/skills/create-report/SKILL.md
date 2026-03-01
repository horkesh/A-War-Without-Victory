---
name: create-report
description: Create a detailed implementation report for recently completed work and place it in the appropriate docs/40_reports subfolder. Use when a development session produces code changes, calibration runs, or system modifications that need to be documented.
user_invocable: true
---

# Create Report

## Mandate

- **Purpose:** Generate a comprehensive, structured implementation report for work done in the current or recent session.
- **Scope:** Code changes, calibration results, scenario runs, system modifications, bug fixes, refactors — any work that should be recorded for the project record.
- **Output location:** `docs/40_reports/implemented/` (for completed work) or `docs/40_reports/convenes/` (for analysis/meetings).

## Workflow

### 1. Gather context

Read the following to understand what was done:
- `git diff HEAD~1..HEAD --stat` or `git log --oneline -5` — recent commits
- Current conversation context — what the user worked on
- Any scenario run output in `runs/` — latest run results
- `docs/PROJECT_LEDGER.md` — last few entries for continuity

### 2. Determine report type

| Work Type | Subfolder | Naming |
|-----------|-----------|--------|
| Code implementation (features, fixes, refactors) | `implemented/` | `YYYYMMDD_DESCRIPTIVE_TITLE.md` |
| Calibration run + analysis | `implemented/` | `YYYYMMDD_CALIBRATION_RUN_TITLE.md` |
| Team convene / analysis session | `convenes/` | `YYYYMMDD_DESCRIPTIVE_TITLE.md` |
| Handover to next session | `handovers/` | `YYYYMMDD_DESCRIPTIVE_TITLE.md` |

### 3. Write the report

Use this structure:

```markdown
# [Title]

**Date:** YYYY-MM-DD
**Run ID:** (if applicable)
**Baseline:** (previous run/state)
**Result:** (new run/state)

## Summary
- 2-3 bullet overview of what was done and why

## Changes Made
### [Phase/Category 1]
- File changes with rationale
### [Phase/Category 2]
- ...

## Scenario Results (if applicable)
### OSID Match Rate
### Troop Strengths
### Casualties
### Displacement
### Key Control Checks
### Bot Benchmarks

## Lessons Learned
- What worked, what didn't, what to try next

## Files Changed
| File | Change |
|------|--------|
| ... | ... |

## Next Steps
- Prioritized list of follow-up work
```

### 4. Place and register

1. Write report to correct subfolder
2. Update `docs/40_reports/CALIBRATION_MASTER.md` if calibration data changed
3. Update `docs/40_reports/README.md` §1 table if report is a new high-level category
4. Flag for `/orchestrator` to propagate to canon/engineering docs

## Authority boundaries

- This skill writes reports only — no code changes, no canon edits
- Defers to **reports-custodian** for structural decisions about 40_reports
- Defers to **orchestrator** for propagation to canon and engineering docs
- Never edits `docs/10_canon/FORAWWV.md`

## Related skills

- **reports-custodian**: Owns 40_reports structure; consult for classification
- **orchestrator**: Propagates findings to canon, engineering, and other docs
- **propagate-to-canon**: Updates technical docs after changes
- **awwv-ledger-entry**: Appends to PROJECT_LEDGER.md
- **scenario-report**: Specialized scenario run reporting (per standing directive)
