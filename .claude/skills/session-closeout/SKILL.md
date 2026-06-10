---
name: session-closeout
description: Use at the end of every work session, before the user leaves, or when explicitly invoked. Mandatory verification that all work is documented, knowledge extracted, lessons learned, and docs propagated. Do not allow session to end with gaps.
---

# Session Closeout

## Overview
Mandatory end-of-session verification. Every piece of work must leave a trace — in the right place, for the right audience. A session without closeout is a session that never happened.

## When to Use
- End of any session where code, data, or docs changed
- Before the user leaves / goes to sleep
- When explicitly invoked via `/session-closeout`
- After completing a major feature or investigation

## The Checklist

Run each check. For each FAIL, fix it before closing. Report status as a table.

### 1. PROJECT_LEDGER.md
**Check**: Does the ledger have an entry for this session's work?
**How**: Read the last entry in `docs/PROJECT_LEDGER.md`. Does it cover ALL changes made this session?
**FAIL if**: Changes were made but no ledger entry exists, or the entry is stale/incomplete.
**Fix**: Append a complete ledger entry with Change, Calibration, Determinism, Verification, and Files sections.

### 2. PROJECT_LEDGER_KNOWLEDGE.md
**Check**: Was thematic knowledge discovered that isn't captured in code or existing docs?
**How**: Review session work for insights about game mechanics, historical patterns, architecture decisions, root cause analyses. These are the "why" behind changes.
**FAIL if**: A root cause was found (e.g., "supply filter killed RBiH ops because 94% strained") and the insight isn't in LEDGER_KNOWLEDGE.
**Fix**: Append the knowledge entry with context and implications.

### 3. Life Lessons
**Check**: Did anything go wrong that should prevent future sessions from repeating the mistake?
**How**: Review: Did we fix a symptom before finding root cause? Did an agent claim success without verification? Did a fix cascade unexpectedly? Did we bundle changes?
**FAIL if**: A pattern of failure occurred but no lesson was written.
**Fix**: Add to the appropriate topic file in `docs/life_lessons/` AND update the index in `docs/life_lessons.md` (Recently Violated or New Lessons section).

### 4. Napkin
**Check**: Is `.claude/napkin.md` Current State section up to date?
**How**: Does it reflect the latest calibration number, open items, and session work?
**FAIL if**: Napkin still shows previous session's state or is missing this session's key outcomes.
**Fix**: Update Current State block. Remove stale items from Open.

### 5. Memory
**Check**: Was anything learned that future sessions need but can't derive from code?
**How**: Review: user preferences, design decisions, investigation results, architectural choices, feedback received.
**FAIL if**: A design decision was made (e.g., "architect decided supply filter only excludes critical") with no memory file.
**Fix**: Create/update memory file in `.claude/projects/.../memory/` and add to MEMORY.md index.

### 6. working-on.md
**Check**: Is there incomplete work that the next session needs to continue?
**How**: Review task list and deferred items.
**PASS if**: All work complete — delete working-on.md if it exists.
**FAIL if**: Work is incomplete and no working-on.md exists, or it's stale.
**Fix**: Write/update `working-on.md` at project root with current state, completed items, deferred items, and architect decisions pending review.

### 7. Canon Propagation
**Check**: Did any mechanics change that canon docs describe?
**How**: Review changes to `src/sim/`, `src/state/`, constants, pipeline steps. Cross-reference with `docs/10_canon/` (Systems Manual, Phase Specs, Rulebook).
**FAIL if**: A mechanic changed (e.g., supply filter behavior, counter-attack scope, planning duration) and the relevant canon doc still describes the old behavior.
**Fix**: Either update the canon doc directly (edits to `FORAWWV.md` require Pyrrhic-panel sign-off) OR flag it with `propagate-to-canon` skill.

### 8. CALIBRATION_MASTER.md
**Check**: Were calibration runs performed this session?
**How**: Check if new run directories exist in `runs/`.
**FAIL if**: Calibration runs happened but `docs/40_reports/CALIBRATION_MASTER.md` doesn't have the latest numbers.
**Fix**: Update with latest run number, area-weighted %, anchors, benchmarks, key deltas.

## Output Format

```
## Session Closeout

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | PROJECT_LEDGER | PASS/FAIL | ... |
| 2 | LEDGER_KNOWLEDGE | PASS/FAIL/N/A | ... |
| 3 | Life Lessons | PASS/FAIL/N/A | ... |
| 4 | Napkin | PASS/FAIL | ... |
| 5 | Memory | PASS/FAIL/N/A | ... |
| 6 | working-on.md | PASS/FAIL/N/A | ... |
| 7 | Canon Propagation | PASS/FAIL/N/A | ... |
| 8 | CALIBRATION_MASTER | PASS/FAIL/N/A | ... |

[For each FAIL: what's missing and what to do]
```

## After All Checks Pass

Only after ALL items are PASS or N/A:
- Report the final table to the user
- State: "Session closeout complete. Safe to end."
