# Settlement Timeline Copy And Provenance

**Date:** 2026-06-20  
**Type:** UI/read-model settlement timeline polish  
**Branch:** `codex/pyrrhic-settlement-timeline-copy`

## Summary

Settlement timelines now avoid a broken mojibake dash in final-held operation rows and dedupe matching scenario-start control when both the snapshot controller and a persisted turn-0 initial-control event describe the same faction.

## What Changed

- Final-held operation timeline titles now use ASCII-safe copy: `{operation} - objective held at operation close`.
- Matching snapshot start-control and persisted turn-0 `initial_control` rows collapse to a single scenario-start control row.
- Focused provenance tests pin exact clean title copy, reject mojibake markers, and verify the turn-0 duplicate control case.

## Verification

- Red proof from the worker branch failed on the broken `Local Push â€” objective held at operation close` title and duplicate turn-0 control row.
- Green proof: `npx.cmd vitest run tests/settlement_timeline_provenance.test.ts --reporter=dot`
- Green proof: `npm.cmd run typecheck`
- Green proof: `git diff --check`

## Scope And Determinism

This is UI/read-model timeline copy/provenance, focused tests, and documentation only. It does not change simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
