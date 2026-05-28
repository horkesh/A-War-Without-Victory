# GitHub Actions Workflows — AWWV

This directory contains the GitHub Actions workflow definitions for A War Without Victory. Each workflow is a single-purpose CI surface; the README catalogs what exists, what each checks, and the local-equivalent commands a contributor runs before pushing.

## Catalog

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| Typecheck | `typecheck.yml` | PR to `main` | Fast standalone `tsc --noEmit` gate (cheap signal on PRs that touch types only). |
| Baseline Regression | `baseline-regression.yml` | push to `main`, PR to `main` | Multi-job broad gate: typecheck, focused scenario anchor tests, `test:vitest:fast` (137 fast suites, includes the event-system tests via auto-discovery), `test:vitest:scenario`. |
| Desktop Release Guard | `desktop-release-guard.yml` | push to `main`, PR to `main` | Builds + smoke-tests the Linux AppImage and Windows NSIS desktop packages; uploads the artifacts on every run. |
| Release | `release.yml` | (see file) | Tagged-release publication pipeline. |
| **Event System CI** | **`event-system-ci.yml`** | **push to `main` / `codex/**` / `feature/**`, PR to `main`** | **Named, explicit CI surface for event-system validation. Wraps the Phase G3 F2 strict canon-compliance gate so it is visible at PR-review time as a discrete check rather than buried inside the broader fast-test slice.** |

## Event System CI — what it runs

Phase G Packet 4 (2026-05-28) added `event-system-ci.yml` to automate the canon-compliance defense established by the Phase G3 strict gate test (`tests/sensitive_history_canon_gate_audit_strict_gate.test.ts`). The workflow runs four sequential gates in a single `event-system-validation` job:

### Gate 1 — TypeScript typecheck

```
npx tsc --noEmit
```

Catches loader-vocabulary, event-shape, and substrate-writer typing errors.

### Gate 2 — Event-system + Phase E/F suite (18 test files)

Loader + decisions + evaluation + acceptance reporting:

- `tests/event_loader.test.ts`
- `tests/event_loader_runtime_substrate.test.ts`
- `tests/event_decisions.test.ts`
- `tests/events_evaluate.test.ts`
- `tests/events_evaluate_b3.test.ts`
- `tests/event_families.test.ts`
- `tests/event_state_shape_b2.test.ts`
- `tests/event_causality_chain.test.ts` (Phase F1)
- `tests/event_family_graph.test.ts` (Phase F3)
- `tests/sim/events/event_acceptance_report.test.ts`
- `tests/sim/events/event_taxonomy_report.test.ts`
- `tests/sim/events/event_presidential_acceptance.test.ts`

Phase E political-dimension propagation + Phase F diagnostics:

- `tests/political_dimension_propagation_gate.test.ts`
- `tests/political_dimensions_snapshot.test.ts`
- `tests/phase_e2_cohesion_caution_bias.test.ts`
- `tests/phase_e3_combined_activation.test.ts`
- `tests/sensitive_history_canon_gate_audit.test.ts` (Phase F2 audit unit tests)
- `tests/phase_d_causality_runtime_integration.test.ts` (Phase F5 runtime integration)

### Gate 3 — Phase F2 strict gate (canon-compliance hard rail)

```
node node_modules/vitest/vitest.mjs run \
  tests/sensitive_history_canon_gate_audit_strict_gate.test.ts \
  --reporter=dot
```

Loads the real catalog via `buildSensitiveHistoryAudit` and asserts `CRITICAL + WARNING = 0` violations. `INFO` `reward_risk` violations (e.g. `seek_clandestine_arms`'s §6-reviewed 1.05x `recruitment_modifier`) are permitted and surfaced for visibility but do **not** block CI. See `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md` G3 amendment for the design call.

### Gate 4 — Baseline regression

```
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

SHA256 comparison of run artifacts against committed baselines. Detects engine-behavior drift via byte-equality.

## Run the same checks locally

```bash
# Gate 1
npx tsc --noEmit

# Gate 2 (one-shot all 18 files)
node node_modules/vitest/vitest.mjs run \
  tests/event_loader.test.ts \
  tests/event_loader_runtime_substrate.test.ts \
  tests/event_decisions.test.ts \
  tests/events_evaluate.test.ts \
  tests/events_evaluate_b3.test.ts \
  tests/event_families.test.ts \
  tests/event_state_shape_b2.test.ts \
  tests/event_causality_chain.test.ts \
  tests/event_family_graph.test.ts \
  tests/sim/events/event_acceptance_report.test.ts \
  tests/sim/events/event_taxonomy_report.test.ts \
  tests/sim/events/event_presidential_acceptance.test.ts \
  tests/political_dimension_propagation_gate.test.ts \
  tests/political_dimensions_snapshot.test.ts \
  tests/phase_e2_cohesion_caution_bias.test.ts \
  tests/phase_e3_combined_activation.test.ts \
  tests/sensitive_history_canon_gate_audit.test.ts \
  tests/phase_d_causality_runtime_integration.test.ts \
  --reporter=dot

# Gate 3 (strict canon-compliance gate; the one to run after editing event JSON)
node node_modules/vitest/vitest.mjs run \
  tests/sensitive_history_canon_gate_audit_strict_gate.test.ts \
  --reporter=dot

# Gate 4
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

The broader `npm run test:vitest:fast` command also covers Gates 1–3 (it auto-discovers all non-scenario vitest files in `tests/`), but the explicit per-file invocation above is what the CI workflow runs and is the fastest path to triaging a Gate 3 failure locally.

## Convention notes

- Node version: **22** across all workflows. Bumping in one workflow without bumping the rest causes spurious diff between local-dev and CI behaviour.
- Install command: `npm install --legacy-peer-deps`. `npm ci` would fail under the same peer-dep skew (`react-dom@18` vs `@testing-library/react@14`) that motivated the legacy flag.
- Map workspace: `npm install --legacy-peer-deps --prefix src/ui/map` is required because root `tsc --noEmit` references map UI types.
- Action versions: `actions/checkout@v5` and `actions/setup-node@v5` (matches `baseline-regression.yml`, `typecheck.yml`, `desktop-release-guard.yml`). Pinning to v4 mid-workflow set causes intermittent cache-key drift.

## Cross-references

- Strict gate origin and G3 design call: `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md` (see the "G3 amendment" section near the end).
- Event-system authoring patterns this CI validates: `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md` (§4 loader validation, §7 diagnostic tools).
- Sensitive-history canon: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
- F2 tool source: `tools/diagnostics/sensitive_history_canon_gate_audit.ts`.
- Strict gate test source: `tests/sensitive_history_canon_gate_audit_strict_gate.test.ts`.
- Baseline regression source: `tools/scenario_runner/run_baseline_regression.ts`.
