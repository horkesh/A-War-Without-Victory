# 2026-04-02 - Theatre Tagging Runtime Retirement

## Purpose

This checkpoint retires another polished but non-canonical writer from the live engine.

The player shell had already stopped treating theatres as active ownership truth, but the
turn pipelines were still rebuilding default theatres and tagging assignable front segments
with `theatre_id` every turn. That kept a dead concept looking live.

## What changed

- removed live turn-pipeline calls to:
  - `ensureDefaultTheatres(...)`
  - `assignFrontSegmentTheatres(...)`
- both `src/sim/turn_pipeline.ts` and `src/sim/turn_phases/war_phases.ts` now derive
  `assignable_front_segments` directly from current front edges with no theatre tagging pass
- marked `src/state/theatres.ts` honestly as a legacy theatre compatibility helper module
- added a regression in `tests/engine_honesty_legacy_contracts.test.ts` proving:
  - the live turn pipelines no longer call the theatre helpers
  - the theatre helper file is documented as compatibility-only

## Why this matters

This is a classic repo-swamp issue:

- the shell truth had already moved on
- but the pipelines still emitted a polished-looking layer every turn
- and that made the repo feel as if theatres still mattered to active product logic

They did not.

Leaving that writer alive would keep confusing future implementation and make it easier
for old shell ideas to re-enter through “helpful” metadata.

## Canonical truth after this pass

- live frontline shell truth: corps-front sectors and canonical front edges
- compatibility metadata only: theatres / theatre-tagged front segments

## Verification

- `node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts tests\front_assignment.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

This does not delete the theatre compatibility module or fields from the schema.

It does stop the live pipelines from advertising theatre tagging as if it were still
part of current frontline authority.
