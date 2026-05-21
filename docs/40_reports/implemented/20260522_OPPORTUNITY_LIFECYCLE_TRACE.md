# Opportunity Lifecycle Trace (2026-05-22)

**Status:** Implemented.
**Scope:** Operation Opportunity observability only. No operation eligibility, decision semantics, combat math, scenario data, or tuning changed.

## Change

The Operation Opportunity layer now persists a compact append-only trace at `state.military.operation_opportunity_traces`.

Rows separate:

- `blocked` in-window catalog entries that failed eligibility.
- `eligible` entries surfaced as proposals.
- decision outcomes: `delayed`, `declined`, `redirected`, `under_resourced_approved`, `approved`.
- `spawn_failed` when approval/redirect/under-resource cannot spawn a `CorpsOperation`.
- `t3_authorized_no_offensive` for approved defensive-crisis T3 entries.
- `expired` for proposal expiry.

The trace is sorted deterministically by turn, opportunity, proposal, and lifecycle event rank. It is diagnostic-only and does not affect proposal eligibility, decisions, operation spawning, AAR linkage, or combat resolution.

## Why

Fresh painted-target diagnostics show the late-war Krajina-collapse gap cannot be tuned safely from area percentages alone. Before outcome changes, the repo needs a compact record that distinguishes:

- catalog entry never eligible,
- entry blocked by live prerequisites,
- entry surfaced for review,
- entry accepted but failed to spawn,
- entry accepted and launched.

This is the evidence boundary required before adding late-war catalog gaps or defender-trajectory predicates.

## Verification

- Red test observed first: the new lifecycle trace assertions failed because `operation_opportunity_traces` was undefined.
- `npx.cmd vitest run tests/operation_opportunities_substrate.test.ts --reporter=dot` PASS, 44/44.
- `npm.cmd run typecheck` PASS.
- `npm.cmd run test:baselines` PASS, all scenarios match.
- `npm.cmd run desktop:package:probe` PASS.
- `git diff --check` clean aside from the existing CRLF normalization warning on `src/sim/combat/operation_opportunities.ts`.
