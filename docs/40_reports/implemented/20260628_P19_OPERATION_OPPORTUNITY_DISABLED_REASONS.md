# P19 Operation Opportunity Disabled Reasons

**Date:** 2026-06-28
**Run ID:** n/a
**Baseline:** P19 fifth packet on `codex/p19-d2-polish-continuation`
**Result:** Local sixth packet ready for PR #460 update

## Summary
- Closed the remaining operation-opportunity disabled-control residual from the P19 scout reports.
- Kept the change UI/read-model/i18n/test/docs scoped: no simulation, event, scenario, calibration, packaging, or Srebrenica/Zepa event-owned receipt behavior changed.

## Changes Made
### Operation Opportunity Controls
- `OperationOpportunityDossierPanel` now filters empty OSID placeholders before deciding whether an opportunity has a map footprint.
- Disabled footprint highlight controls now expose reasoned `title` and accessible copy when no map footprint is reported.
- Disabled opportunity action and redirect buttons now explain whether the action is not staff-cleared or another opportunity decision is being sent.

### Tests And Documentation
- `tests/ui/army_hq_timing_copy.test.ts` now covers disabled footprint and action reasons under an available command bridge.
- `PROJECT_LEDGER`, `COMMAND_BOARD`, `MASTER_ROADMAP`, and the active P19 sweep plan record this sixth packet.

## Verification
- Red/green focused proof: `npm.cmd exec -- vitest run tests/ui/army_hq_timing_copy.test.ts --pool=forks --reporter=dot` passed 17 tests after failing against the missing labels.
- TypeScript: `npm.cmd run typecheck` passed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx` | Adds disabled-control reasons and empty-footprint filtering. |
| `src/ui/map/i18n/messages.en.ts` | Adds EN opportunity disabled-reason keys. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds matching BCS opportunity disabled-reason keys. |
| `tests/ui/army_hq_timing_copy.test.ts` | Adds regression coverage and IPC availability fixture control. |
| `docs/PROJECT_LEDGER.md` | Adds ledger entry. |
| `docs/plans/COMMAND_BOARD.md` | Adds P19 sixth packet status. |
| `docs/plans/MASTER_ROADMAP.md` | Syncs active P19 lane summary. |
| `docs/plans/2026-06-24-army-hq-sector-brigade-information-quality-sweep-plan.md` | Adds sixth packet and closeout queue. |

## Next Steps
- Run `git diff --check`, commit, push PR #460 update, and inspect GitHub checks/comments.
- Merge only after required GitHub checks are green, then delete branch/worktree and clean temporary evidence.
