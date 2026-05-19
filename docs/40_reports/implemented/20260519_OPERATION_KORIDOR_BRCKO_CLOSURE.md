# Operation Koridor Brcko Closure

**Date:** 2026-05-19
**Branch:** `codex/late-war-188w-brcko-probe-2026-05-19`
**Status:** Implemented

## Summary

The chronic 188w `op:brcko:brcko` anchor residue is closed by adding Brcko proper to Operation Koridor's `brcko_corridor` objective list. The change is deliberately narrow: no scenario paint, no FORAWWV edit, no sensitive-history prose, no hidden control flip, no faction-wide RS buff, and no ARBiH nerf.

## Change

- `src/sim/combat/pre_planned_operations.ts`: add `op:brcko:brcko` to Operation Koridor's `brcko_corridor` axis objectives, preserving alphabetical order.
- `tests/pre_planned_operations.test.ts`: add a focused assertion that the axis includes Brcko proper and remains alphabetically ordered.

## Run Evidence

| Run | Hash | Anchors | Benchmarks | Result |
|---|---|---:|---:|---|
| 40w n1918 | `5c6e7b62fa6670c0` | 27/27 | 6/6 | Byte-identical to n1916; 40w paints Brcko RS at turn 0, so the new objective is filtered as already controlled. |
| 188w n1919 | `7b57a8592f668137` | 27/27 | 6/6 | Brcko closes; this is the first clean 188w anchor sweep in the v0.9.x line. |

In n1919, Operation Koridor starts turn 0 and ends turn 10 as a 4-star Solid Victory. The Brcko axis captures `op:brcko:brcko` at turn 5, then captures `op:brcko:krepsic` and `op:brcko:skakava_donja`. Axis casualties are 487 KIA / 894 WIA inflicted and 278 KIA / 512 WIA suffered.

## Drift Assessment

Positive drift vs n1917:

- `op:brcko:brcko` moves RBiH -> RS and matches the painted Oct 1995 target.
- `op:brcko:donji_rahic`, `op:brcko:krepsic`, and `op:brcko:skakava_donja` also end RS.
- `op:pale:praca` moves RBiH -> RS, matching the painted reference.

Residual drift:

- `op:teslic:kamenica_2` moves RS -> HRHB. This is a non-anchor, non-benchmark, one-OSID residue and should be watched in later front-edge calibration rather than blocking this lane.

Sensitive-history watched controllers for Srebrenica, Zepa, Gorazde, and Teocak are unchanged vs n1917.

## Validation

- `npm.cmd run typecheck`: PASS.
- `npx.cmd vitest run tests/pre_planned_operations.test.ts --reporter=dot`: PASS, 18/18.
- `node tools/diagnose_run.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1919`: 0 errors / 26 warnings.
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1919`: exits nonzero with 49 long-run structural sector/intel signals; recorded as a known signal, not a determinism pass.
- `UPDATE_BASELINES=1 npm.cmd run test:baselines`: PASS as a probe, but only expanded the manifest back to the seven-artifact script default; the existing four tracked hashes were unchanged, so no manifest change is committed.
- `npm.cmd run test:baselines`: PASS with the preserved four-artifact manifest.

## Decision

Accept the single-objective Operation Koridor fix. It closes the Brcko anchor without broad tuning, preserves the 40w baseline hash, and produces a clean 188w 27/27 anchor sweep.
