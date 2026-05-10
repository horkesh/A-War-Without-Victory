# v0.9.2 Tutorial + External Playtesting Milestone Closure

**Date:** 2026-05-10  
**Lane:** v0.9.2 Tutorial + External Playtesting  
**Status:** Agent-closed / operator-open

## Summary

v0.9.2 is now closed for agent-owned work. The tutorial/onboarding substrate is live in the app, the tutorial hardening lanes have already shipped, and the external playtest package is a complete operator-deployable kit under `docs/playtesting/v092/`.

This closure adds `docs/playtesting/v092/package_manifest.json`, a machine-readable contract binding the package to eight required documents and their required content tokens. It prevents the playtest kit from silently drifting back into "some docs exist" territory.

## Agent-Owned Scope Closed

- Onboarding overlay contract, tutorial state, IPC, restart/skip/auto-dismiss behavior.
- Tutorial anchor coverage for the campaign-loop surfaces.
- Role/dialog/focus/ESC accessibility hardening for the overlay.
- Recruitment messages, tester quickstart, feedback form schema, operator runbook, known-issues template, triage board, and weekly digest template.
- Machine-readable package manifest and regression coverage.

## Operator-Owned Scope Remains

- Outreach.
- Discord/forum setup.
- Feedback form creation from the schema.
- Incoming response triage.
- Weekly digest publication.

These are real remaining actions, but they are operator actions, not repo implementation blockers.

## Verification

- Red first: `npx.cmd vitest run tests/v092_playtest_package_docs.test.ts --reporter=dot` failed on missing `package_manifest.json`.
- Green focused: the same suite passed 4/4 after adding the manifest.

## Files

- `docs/playtesting/v092/package_manifest.json`
- `tests/v092_playtest_package_docs.test.ts`
- `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/40_reports/README.md`
- `docs/PROJECT_LEDGER.md`
- `.claude/napkin.md`
