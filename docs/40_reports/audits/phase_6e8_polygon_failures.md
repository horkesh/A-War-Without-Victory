# Phase 6E.8 — Polygon simplification failures audit

Audit-only. No geometry or source/derived data was modified.

## Summary

- **Total failures:** 0
- **Source artifact:** data/derived/polygon_failures.json

## Failed SIDs (sorted by sid)

| sid | municipality | reason | has_polygon_in_substrate |
| --- | ------------ | ------ | ------------------------ |

## Reason histogram


## Fixability

| Reason | Classification |
| ------ | -------------- |
| Simplification did not produce valid polygon | **requires upstream source correction** — invalid or degenerate geometry that cannot be deterministically repaired without invention (e.g. open ring, self-intersection, or topology failure after simplification). Deterministic repair (e.g. close ring if ≥4 points and first≠last, then revalidate) may be allowed in a later phase only if mistake-log rules explicitly permit it; otherwise escalate to source correction. |

No deterministic repair was applied in this phase. Any repair must be scoped in a separate phase and must comply with FORAWWV (no invention; audit first).

## No geometry changed

This phase did not modify any source or derived geometry. Outputs are read-only audit artifacts.