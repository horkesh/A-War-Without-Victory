# Scenario Painted Control Target Tool

**Date:** 2026-04-30

## Summary

We were evaluating late-war runs against the wrong painted truth. `tools/compare_painted_vs_sim.cjs` was hard-wired to `painted_control_jan1993.json`, so April 1994, April 1995, and October 1995 scenario work could look "wrong" even when the target date itself needed a different historical control map.

This packet adds a local authoring tool and a target resolver so historical control truth becomes date-specific:

- `jan1993`
- `apr1994`
- `apr1995`
- `oct1995`

Late-war scenario evaluation should now specify the intended painted target explicitly instead of reusing Jan 1993 by habit.

## Files

| File | Purpose |
|---|---|
| `tools/painted_control_targets.cjs` | Shared deterministic target resolver, target listing, canonical writer, and summary helpers. |
| `tools/paint_control_targets.cjs` | Local HTTP server for the painter. |
| `tools/paint_control_targets.html` | Canvas-based map painter UI for OSID control targets. |
| `tools/compare_painted_vs_sim.cjs` | Now accepts `--target <id>`, `--painted <path>`, and `--list-targets`. |
| `tests/painted_control_targets.test.ts` | Focused coverage for canonical ordering, target slots, explicit painted-path comparison, and the painter API. |
| `package.json` | Adds `npm run paint:control`. |

## Workflow

Start the painter:

```bash
npm run paint:control
```

Open:

```text
http://127.0.0.1:4177/
```

The painter loads `data/derived/operational/operational_settlements.geojson`, edits `by_settlement_id`, and writes:

```text
data/source/calibration/painted_control_<target>.json
```

The April 1994 / April 1995 / October 1995 slots do not need to exist before editing. If a target file is missing, the UI seeds it from `jan1993` until the user saves. A sim run can also be loaded as a draft layer, then corrected manually.

Compare a run against an explicit target:

```bash
node tools/compare_painted_vs_sim.cjs runs/<run_dir> --target apr1994
```

List target slots:

```bash
node tools/compare_painted_vs_sim.cjs --list-targets
```

## Determinism

The writer never uses timestamps or system time. Target IDs are sanitized. OSID keys are sorted through a stable compare before writing. Only `RS`, `RBiH`, and `HRHB` values are persisted.

## Product impact

This moves us back toward healthy-engine work: the engine should be judged against the scenario date it is trying to represent, not against one stale control map. Calibration packets should name their target date, and late-war scenario work should first create or select the matching painted target.

## Follow-up Fix

The first build exposed a startup sync bug: target slots were listed alphabetically, so April 1994 appeared first, while the app still loaded Jan 1993 internally. The fix makes built-in target order chronological, forces the dropdown to the loaded target in `loadTarget(id)`, and loads the selected target on dropdown change instead of only changing the eventual save path.

The accidentally saved April 1994 paint was recovered into:

```text
data/source/calibration/painted_control_apr1994.json
```

`painted_control_jan1993.json` was restored to its committed Jan 1993 content.

## Definitive Target Set

As of 2026-05-01, the manual painted-control set is present for:

| Target | OSIDs | RS | RBiH | HRHB |
|---|---:|---:|---:|---:|
| `jan1993` | 712 | 385 | 247 | 80 |
| `apr1994` | 712 | 412 | 233 | 67 |
| `apr1995` | 712 | 393 | 240 | 79 |
| `oct1995` | 712 | 320 | 285 | 107 |

Use `--target apr1994`, `--target apr1995`, or `--target oct1995` for late-war run evaluation. Jan 1993 remains a legacy target file; the new date-specific targets use the tool's metadata schema and stable sorted OSID keys.

The painter geometry currently exposes 744 operational features, but the scenario controller/evaluation universe is 712 OSIDs. Built-in painted targets must stay on that 712-key universe until the simulation substrate itself is expanded; otherwise comparisons count geometry-only OSIDs as sim misses.
