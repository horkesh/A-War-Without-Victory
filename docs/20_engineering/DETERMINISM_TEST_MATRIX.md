# Determinism Test Matrix (AWWV)

## Rules → Gates
### No timestamps / wall-clock values
- Gate: `tests/determinism_static_scan_r1_5.test.ts`
- Gate: `tests/scenario_harness_contracts.test.ts` (`H1.1 scenario determinism`)
- Gate: `tests/scenario_harness_contracts.test.ts` (`H2.4 scenario bots determinism`)
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Perf sidecars: `tests/scenario_timing_instrumentation.test.ts`, `tests/wall_clock_target_report.test.ts`, and `tests/profile_hotspot_report.test.ts` cover opt-in wall-clock/profile reports that stay outside deterministic saves and scenario truth artifacts.

### Stable ordering (collections, records, outputs)
- Gate: `tests/turn_pipeline_order.test.ts`
- Gate: `tests/phase_e_pressure_determinism.test.ts`
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Gate: `tests/sandbox_slice_determinism.test.ts` (slice settlements/edges/controllers canonical ordering)
- Gate: `tests/front_edges_strict_order.test.ts` (SID/OSID front-edge output uses `strictCompare`, not locale collation)

### Derived state not serialized as source of truth
- Code invariant: `src/state/serializeGameState.ts` (denylist + key ordering + wrapper rejection)
- Gate: `tests/scenario_harness_contracts.test.ts` (`H1.1 scenario determinism`)

### Byte-identical reruns from identical inputs
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Gate: `tests/scenario_harness_contracts.test.ts` (`H1.1 scenario determinism`)

### Platform-stable structural fingerprint (CI determinism authority, C1 2026-06-09)
- **Why:** the byte-hash baselines CI job was removed 2026-05-04 because
  `final_save.json` SHA256 diverges between the Windows dev box and the Linux CI runner
  (platform float serialization). That left determinism regression with no machine signal
  on CI (`LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST`).
- **Replacement:** `tools/diagnostics/structural_fingerprint.cjs` fingerprints only
  MEANINGFUL, platform-stable fields of a scenario run — per-faction OSID control map,
  anchor pass/fail map, and bot-benchmark tallies (all integers/strings/booleans). It
  DELIBERATELY excludes `final_save.json` byte-hash and per-faction brigade/formation
  counts (the latter vary run-to-run even at identical territory — verified — so they are
  a run-snapshot artifact, not territory truth).
- **Gate:** CI job `structural-fingerprint` in `.github/workflows/full-suite-and-fingerprint.yml`
  runs a fresh 40w and compares against committed `data/calibration/structural_fingerprint_40w.json`
  via `npm run ci:structural-fingerprint:check`. A structural move without a deliberate
  `npm run ci:structural-fingerprint:update` fails the gate.
- **Tool self-test:** `tests/structural_fingerprint.test.ts` (determinism, order-independence,
  formation-exclusion, and positive sensitivity to control/anchor/benchmark changes).
- **Reference platform = Linux/Node 22 (DoD C2):** Windows==Linux byte-hashes are NOT
  promised; the structural fingerprint IS the cross-platform determinism authority.

### Full vitest suite required on code-path PRs (stale-pin false-green closure, C1)
- Gate: CI job `full-suite` in `.github/workflows/full-suite-and-fingerprint.yml` runs
  `npm run test:vitest` (the COMPLETE suite via `vitest.config.ts`, not a slice). The
  Baseline Regression `test`/`scenarios` jobs run only the fast/scenario SLICES, so a test
  the `tools/test/discover_test_files.mjs` heuristics mis-bucket can drop from both with no
  signal. The full-suite job runs everything the config discovers, so full-suite-only pins
  (`strict_null_inventory_progress`, `war_phase_step_order`, consequence/substrate
  inventory) can no longer reach main green.

## System-specific determinism (B1, authority, B4)
- **events_fired (B1):** Same state + seed + turn → same `report.events_fired`; RNG used only for random-event probability; registry iteration order fixed. **Test:** `tests/events_evaluate.test.ts` (trigger matching, phase/turn bounds, determinism, registry order). Baseline regression implicitly covers event path via scenario outputs.
- **Authority derivation:** `deriveMunicipalityAuthorityMap` iterates municipality IDs in sorted order; no randomness. See MILITIA_BRIGADE_FORMATION_DESIGN.md §8.1.1.
- **Coercion pressure (B4):** Read-only per turn from state; no randomness in flip threshold. Same state → same flip outcomes.

## Gaps (Explicit)
- Static scan for `Date.now` / `new Date` / `Math.random`: enforced in `tests/determinism_static_scan_r1_5.test.ts` (src/ and tools/scenario_runner/ scope).
- Explicit “no Map/Set in GameState” runtime test: covered in serializer, not a dedicated test.

## Sandbox Slice Determinism
- `src/ui/map/sandbox/sandbox_slice.ts` canonicalizes slice outputs after filtering:
  - settlements sorted by SID
  - edges canonicalized (`a <= b`) then sorted by `a:b`
  - political controller keys emitted in sorted SID order
- Gate: `tests/sandbox_slice_determinism.test.ts` (ordering + idempotence)
