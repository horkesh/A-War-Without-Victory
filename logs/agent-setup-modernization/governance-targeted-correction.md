# Active governance targeted correction

**Date:** 2026-09-12  
**Scope:** `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md` only.

The modernization preparation is now the sole active task identity:

- line 3: `## Task` — Agent setup modernization preparation (P0–P4), exact base and excluded product/runtime surfaces
- line 13: `## Canonical owner` — shared contract plus owner-activated modernization plan
- line 21: `## Demoted path`
- line 29: `## Decision boundary`
- line 36: `## Done means`
- line 45: `## UI/report truth`
- line 51: `## Roadmap slot`
- line 57: `## What this unlocks`
- line 63: `## Historical record — RE 1.0 Engine Integrity`

The complete preexisting tracked RE governance body from `HEAD` remains below line 63. Its former
level-two headings were mechanically demoted to level three so `Task` and `Canonical owner` cannot
be mistaken for the active packet. A line-by-line comparison passed after accounting only for that
heading-level change.

Focused results:

- historical text preservation: PASS
- exactly one active instance of each required heading: PASS, 8/8
- `scripts/repo/check_claude_governance.ps1`: PASS, exit 0
- scoped `git diff --check`: PASS, exit 0

No other file was changed for this targeted correction.

