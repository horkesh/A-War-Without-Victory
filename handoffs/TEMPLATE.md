# Handoff: [TITLE]

## Context
<!-- What the executor needs to know. Link to relevant docs, plans, or prior work. -->

## Read first
<!-- Mandatory reading before any work. -->
- `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md`
- `docs/PROJECT_LEDGER.md`
- `.claude/napkin.md`

## Mission
<!-- Clear, scoped task description. One vertical slice, not a shopping list. -->

## Inspect at minimum
<!-- Key files the executor must read before changing anything. -->

## Constraints
- Do not regress existing tests
- Smoke-test triad: `npx tsc --noEmit`, `npm run test:vitest`, map build
- Commit cleanly with descriptive message
- Update `docs/PROJECT_LEDGER.md`

## Required outputs
- Code changes (if applicable)
- Tests (if code changed)
- Implementation report in `docs/40_reports/implemented/`
- Ledger update

## Verification
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1`

## Completion block
```
Canonical owner:
Demoted path:
Player-visible truth:
Canonical UI surface:
Done means:
```
