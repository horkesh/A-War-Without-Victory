# GitHub Actions Workflows — AWWV

This directory contains the GitHub Actions workflow definitions for A War Without Victory. Each workflow is a single-purpose CI surface; the README catalogs what exists, what each checks, and the local-equivalent commands a contributor runs before pushing.

## Catalog

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| Typecheck | `typecheck.yml` | PR to `main` | Fast standalone `tsc --noEmit` gate (cheap signal on PRs that touch types only). |
| Full Suite + Structural Fingerprint | `full-suite-and-fingerprint.yml` | push to `main`, PR to `main` | Required full-suite gate: complete `test:vitest`, then `qa:first-hour:browser` and `qa:live-surface:browser` on relevant code-contract changes; separate structural fingerprint job compares the fresh 40w platform-stable fingerprint. |
| Baseline Regression | `baseline-regression.yml` | push to `main`, PR to `main` | Multi-job broad gate: typecheck, focused scenario anchor tests, `test:vitest:fast` (137 fast suites, includes the event-system tests via auto-discovery), `test:vitest:scenario`. The `test`/`scenarios` heavy steps are path-filtered (CODE set) and `scenario-anchors`/`scenarios` (SIM set) via the always-report shim — see "Always-report path-filter shim" below. |
| Desktop Release Guard | `desktop-release-guard.yml` | push to `main`, PR to `main` | Builds + smoke-tests the Linux AppImage and Windows NSIS desktop packages; uploads the artifacts on every run. The packaging/probe heavy steps are path-filtered (DESKTOP set) via the always-report shim — see below. |
| Release | `release.yml` | (see file) | Tagged-release publication pipeline. |
| **Event System CI** | **`event-system-ci.yml`** | **push to `main` / `codex/**` / `feature/**`, PR to `main`** | **Named, explicit CI surface for event-system validation. Wraps the Phase G3 F2 strict canon-compliance gate so it is visible at PR-review time as a discrete check rather than buried inside the broader fast-test slice. Phase H Packet 10 extended the test gate with 7 Phase H suites (74 tests) for the consequence-visualization layer.** |

## Always-report path-filter shim

`.github/scripts/detect-changed-paths.sh` (task #81, 2026-06-09) lets REQUIRED status
checks short-circuit their HEAVY steps to a fast success on doc-only PRs while STILL
ALWAYS reporting their check name. It generalizes the proven full-suite shim
(`detect-full-suite-changes.sh`, task #76).

Why a step-level gate, not a workflow `paths:` filter: a `paths:` filter on a REQUIRED
check NEVER reports on a non-matching PR, so GitHub blocks that PR forever on a
"pending" required check (the "required + path-filtered" gotcha). The shim instead lets
the workflow ALWAYS trigger and each job ALWAYS report — only the heavy steps are gated.

**Integrity (task #346):** the skip decision runs a TRUSTED copy of the detection
logic, NOT the PR's working copy. On `pull_request` each detect step first
`git checkout origin/$GITHUB_BASE_REF -- .github/scripts/detect-*.sh` before running it,
so a PR that edits a `detect-*.sh` script to always emit `relevant=false` CANNOT
force-skip a REQUIRED gate — the base-branch logic decides. (On push to `main` the
checked-out copy already IS the trusted base, so no restore is needed.) The only
remaining surface is editing the restore line in the workflow YAML itself, which is
conspicuous in a workflow-file diff at review time — the standard GitHub trust boundary
for `pull_request` (not `pull_request_target`) workflows.

| Job | Required? | `PATH_SET` | Heavy steps gated |
|---|---|---|---|
| `test` (Baseline Regression) | yes | `code` | `npm install` + `test:vitest:fast` |
| `full-suite` (Full Suite + Structural Fingerprint) | yes | full-suite set | `npm install` + startup snapshot rebuild + `test:vitest` + `qa:first-hour:browser` + `qa:live-surface:browser` |
| `structural-fingerprint` (Full Suite + Structural Fingerprint) | yes | full-suite set | `npm install` + startup snapshot rebuild + fresh 40w structural-fingerprint compare |
| `scenario-anchors` (Baseline Regression) | yes | `sim` | `npm install` + `test:vitest:scenario:anchors` |
| `scenarios` (Baseline Regression) | no | `sim` | `npm install` + `test:vitest:scenario` |
| `desktop-release-check` (Desktop Release Guard) | no | `desktop` | Linux AppImage package + smoke |
| `desktop-packaged-runtime-probe` (Desktop Release Guard) | yes | `desktop` | Windows NSIS package + runtime probe |

`typecheck` is intentionally left ALWAYS-RUN (fast, broad type signal) and is the
`needs:` parent that keeps the gated Baseline jobs reporting. `full-suite` and
`structural-fingerprint` use the sibling `detect-full-suite-changes.sh` shim.
The browser gates are intentionally inside the already-required `full-suite` job so
new first-hour or live-surface regressions block relevant PRs immediately instead of
depending on a separate branch-protection update.

Path sets (a changed file matching ANY entry => heavy steps run):

- **code** — `src/ tools/ tests/ data/scenarios/ data/calibration/ scripts/` + `package.json package-lock.json vitest.config.ts tsconfig.json` + the Baseline workflow + the shim script. Identical to the full-suite set, so the `test` slice never shrinks coverage vs the full-vitest gate. `package-lock.json` (task #351) ensures a lockfile-only dep/security bump still runs the full suite.
- **desktop** — `src/desktop/ src/ui/ tools/` + `package.json` (electron-builder `build` block + `desktop:*` scripts) + the Desktop workflow + the shim script. Per the 2026-06-05 CI/PR-batching policy ("desktop packaging required only for desktop/package/UI/runtime paths").
- **sim** — `src/sim/ src/state/ src/scenario/ data/scenarios/ data/calibration/` + `package.json package-lock.json vitest.config.ts tsconfig.json` + the Baseline workflow + the shim script + the scenario TEST files the anchor gate executes (`tests/scenario_anchor_contract.test.ts`, `tests/integration_deployment_health.test.ts`, `tests/scenario_harness_contracts.test.ts`, `tests/integration_run_summary.test.ts`). The scenario test files (task #351) ensure a scenario-test-only PR still runs the anchor gate.

Fail-safe: an unresolved PR/push base, or an unknown `PATH_SET`, forces `relevant=true`
(run the heavy gate) — coverage is never silently dropped.

## Event System CI — what it runs

Phase G Packet 4 (2026-05-28) added `event-system-ci.yml` to automate the canon-compliance defense established by the Phase G3 strict gate test (`tests/sensitive_history_canon_gate_audit_strict_gate.test.ts`). Phase H Packet 10 (2026-05-29) extended the test gate with the seven Phase H suites (74 tests) so PR-time enforcement covers the consequence-visualization layer alongside the Phase B/D/E/F substrate. The workflow runs four sequential gates in a single `event-system-validation` job:

### Gate 1 — TypeScript typecheck

```
npx tsc --noEmit
```

Catches loader-vocabulary, event-shape, and substrate-writer typing errors.

### Gate 2 — Event-system + Phase E/F/H suite (25 test files, ~434 tests)

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

Phase H causality-query API + UI consequence-visualization layer (Packet 10, 74 tests):

- `tests/causality_query.test.ts` (H2 — causality query API, 25 tests)
- `tests/ui/event_decision_modal_decision_context.test.ts` (H3 — decision-context modal, 5 tests)
- `tests/ui/faction_branch_tags_badge.test.ts` (H4 — faction-branch badges, 6 tests)
- `tests/ui/codex_panel_unlock_state.test.ts` (H5 — codex unlock state, 8 tests)
- `tests/ui/chronicle_causality_slides.test.ts` (H6 — chronicle causality slides, 11 tests)
- `tests/ui/catalog_wireup_integration.test.ts` (H7 — catalog wire-up, 8 tests)
- `tests/ui/decision_history_overlay.test.ts` (H8 — decision-history overlay, 11 tests)

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

# Gate 2 (one-shot all 25 files — Phase E/F substrate + Phase H consequence layer)
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
  tests/causality_query.test.ts \
  tests/ui/event_decision_modal_decision_context.test.ts \
  tests/ui/faction_branch_tags_badge.test.ts \
  tests/ui/codex_panel_unlock_state.test.ts \
  tests/ui/chronicle_causality_slides.test.ts \
  tests/ui/catalog_wireup_integration.test.ts \
  tests/ui/decision_history_overlay.test.ts \
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
