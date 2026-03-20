# Night Shift Handoff Template

Copy this to `nightshift-handoff.md` in project root before activating night shift.

---

```markdown
# Night Shift Handoff — [DATE]

## Plans to Execute (in order)
1. `docs/plans/[plan-file-1.md]` — [brief description]
2. `docs/plans/[plan-file-2.md]` — [brief description]

## Execution Order
[If different from plan order, specify here. Reference cross-plan review if relevant.]

## Special Instructions
- [Any deviations from the plan]
- [Items to skip (blocked, external)]
- [Constants or values pre-decided by day shift]

## DO NOT Touch
- `src/ui/map/components/ops_modal/` (16-file ops planning modal — redesigned 2026-03-19)
- [Any other files or systems off-limits]

## Architectural Decisions Pre-Made
- [Decision 1]: we chose X (don't re-evaluate)
- [Decision 2]: we chose Y

## Expected Outcome
- [What should be true when day shift wakes up]
- [Version bump expected? Which version?]
- [Tag expected?]

## Build State at Handoff
- tsc: [clean/errors]
- vitest: [X suites, Y tests, Z skipped]
- Last commit: [hash]
- Current version: [X.Y.Z]
```
