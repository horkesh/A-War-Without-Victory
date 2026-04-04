# Command Chain Truth Wave 3 — Activity/Reporting Truth Alignment

**Date:** 2026-04-04  
**Status:** Implemented, verified  
**Scope:** `displacement_triggers.ts`, `generateThreatAssessment.ts`, `ThreatAssessment.tsx`, new test file

---

## Summary

Wave 3 completes the activity/reporting truth alignment pass identified in the Command Chain Truth audit. Waves 1 and 2 hardened sector/frontline truth at the engine and adapter level. Wave 3 ensures that:

1. The displacement trigger fork is observable — the proxy path can never fire silently.
2. The threat severity vocabulary is unambiguous — `'active'` no longer collides with brigade formation status.
3. Three new regression tests lock the above invariants and activity summary correctness.

---

## Work Item 1 — Displacement trigger fork observable

**File:** `src/sim/displacement_pipeline/displacement_triggers.ts`

### Problem

`evaluateDisplacementTriggers` contained a silent dual-path fork at lines 122–124:

```typescript
const eligible = hasLiveSectorFrontlineTruth(state)
    ? getSectorOwnedEligiblePressureEdges(...)   // canonical path
    : getEligiblePressureEdges(...);             // proxy path
```

When `hasLiveSectorFrontlineTruth()` returned false, the proxy path (Path B) fired without any diagnostic signal. Activity counts derived from this path — `front_active_set_size`, `pressure_eligible_size`, `displacement_trigger_eligible_size` — came from `political_controllers` contact graph rather than hardened sector edge truth. This made activity summary drift invisible.

### Fix

- Extracted `hasSectorTruth` as a local variable so the condition is evaluated once.
- Added `console.warn` when `hasSectorTruth === false`:
  ```
  [displacement_triggers] hasLiveSectorFrontlineTruth=false — using legacy pressure eligibility fallback.
  Activity counts may differ from canonical sector truth.
  ```
- Added a comment block above the fork documenting Path A (canonical: reads `corps_front_sectors.edge_ids`) and Path B (legacy fallback: reads `political_controllers` contact graph), and when each fires.
- The fork decision logic is **unchanged** — Path B is a valid safety valve for peace phase and early turns before sector construction.

---

## Work Item 2 — Threat severity vocabulary collision fixed

**Files:** `src/ui/map/components/army_hq/generateThreatAssessment.ts`, `ThreatAssessment.tsx`

### Problem

`ThreatItem.severity` used the string `'active'` to label enemy offensive preparation. The string `'active'` is also the standard brigade formation status value across the codebase (`formation.status === 'active'`). Any search/grep for `'active'` conflated the two distinct concepts, and any future code reading `severity === 'active'` could be confused with formation status checks.

### Fix

Renamed `'active'` → `'offensive'` throughout both files:

| Location | Old | New |
|---|---|---|
| `ThreatItem` interface `severity` type | `'active' \| 'hardened' \| 'gap'` | `'offensive' \| 'hardened' \| 'gap'` |
| `generateThreatAssessment.ts` push call | `severity: 'active'` | `severity: 'offensive'` |
| `SEVERITY_STYLES` key | `active: { label: 'ACTIVE THREATS' }` | `offensive: { label: 'OFFENSIVE THREATS' }` |
| `ThreatAssessment` component filter | `i.severity === 'active'` | `i.severity === 'offensive'` |
| `ThreatSection` render call | `severity="active"` | `severity="offensive"` |
| `ThreatSection` props type | `'active' \| 'hardened' \| 'gap'` | `'offensive' \| 'hardened' \| 'gap'` |

Brigade formation `status === 'active'` is **not touched** anywhere.

---

## Work Item 3 — Wave 3 regression tests

**File:** `tests/sector_frontline_truth_wave3.test.ts` (new, 7 tests)

### Test A — Proxy fork observability (P0, 2 tests)

- `"displacement triggers: proxy path emits diagnostic warning when sectors unavailable"` — state with `corps_front_sectors = {}` → spy on `console.warn` → assert called with text matching `/legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i`.
- Inverse: canonical path (sectors present) → no legacy-fallback warning emitted.

### Test B — Zero activity integrity (P0, 2 tests)

- `"returns explicit zeros when turnReport has no phase_f_displacement"` — empty turnReport → result equals `{ front_active_set_size: 0, pressure_eligible_size: 0, displacement_trigger_eligible_size: 0 }` with all fields `typeof === 'number'`.
- Regression guard: canonical trigger_report present → correct values returned.

### Test C — Activity summary stats fidelity (P1, 3 tests)

- Four weeks `[10, 0, 20, 15]` → `front_active_set_size`: max=20, min=0, mean≈11.25, nonzero_weeks=3. `pressure_eligible_size`: max=8, min=0, mean≈4.75. `displacement_trigger_eligible_size`: max=4, min=0, mean≈2.25.
- Empty week list → all-zero stats, `weeks=0`.
- Single all-zero week → `nonzero_weeks=0`, `max=0`.

---

## Verification

```
npx.cmd tsc --noEmit -p tsconfig.json  → clean
npm run test:vitest -- tests/sector_frontline_truth_wave3.test.ts  → 7/7 pass
npm run test:vitest -- tests/sector_frontline_truth_wave1.test.ts tests/sector_frontline_truth_wave2.test.ts  → 15/15 pass
powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1  → OK
```

---

## Files Changed

- `src/sim/displacement_pipeline/displacement_triggers.ts` — warn + comment block at fork
- `src/ui/map/components/army_hq/generateThreatAssessment.ts` — severity type + push value renamed
- `src/ui/map/components/army_hq/ThreatAssessment.tsx` — SEVERITY_STYLES key, label, filter, section call, props type renamed
- `tests/sector_frontline_truth_wave3.test.ts` — new, 7 tests
