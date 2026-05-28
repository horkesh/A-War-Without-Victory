# Phase G Closeout — Event-System Operationalization (Authoring Guide + CI Surface)

## Status

- **Date:** 2026-05-29
- **Branch:** `codex/diagnostics-output-artifact-doc-closeout`
- **Packets shipped:** G1, G2, G3, G4
- **Commits:** `facd88e2` (G1) / `95dc21d0` (G2) / `f1d8a97a` (G3) / `8b3ec8f3` (G4)
- **Test infrastructure:** G3 grew F2 suite 20 → 28 tests + added new 2-test strict-gate CI integration file; `npx tsc --noEmit` exit 0; baseline regression PASSING byte-identical (no engine code touched across Phase G).
- **Companion docs:** `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`, `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`, `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md`

This closeout consolidates the Phase G operationalization arc shipped on `codex/diagnostics-output-artifact-doc-closeout`. Where Phase D authored the causal-chain catalog, Phase E activated the political-dimension propagation gate, and Phase F instrumented the catalog with diagnostics, Phase G turns those substrates into a durable operating surface: a canonical authoring guide (G1), the Phase F closeout document itself (G2), a CI-ready heuristic-tuned canon-compliance gate (G3), and the named GitHub Actions workflow that runs it at PR time (G4). The closeout itself is documentation-only; no engine code, scenario data, or canon is touched here.

## Scope completed

### G1 — Event System Authoring Guide

Canonical authoring reference at `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md` (515 lines, 10 sections). Codifies the operational knowledge that Phase D + Phase B accumulated across 44+ packets into a single discoverable contract for future event authors. Covers:

- The disjoint dual-write channels (`dimension_shifts[].dimension` uses canonical `DimensionId` vocabulary; `effects[].kind` uses canonical `EffectKind` vocabulary).
- Sensitive-history canon-gate rules (`RING3_SENSITIVE_FAMILIES` exact + prefix matching, `CAMP_EXPOSURE_OPTION_IDS` engine-level freeze, §3.6 forward-looking guard requirement).
- Cost-floor magnitude mappings for sensitive-adjacent counterfactuals (the punitive vocabulary the Phase F2 audit verifies).
- The §6 Sensitive-History Design Gate sign-off chain (Historian → Game Designer → Canon Compliance Reviewer → Narrative Designer).
- Loader expectations (`validateDimensionShiftVocabulary`, `validateEffectKindVocabulary`, `validateRing3EnablingRejection`).
- Test-suite bump expectations when new authoring lands.
- Phase E activation hooks for any event whose `dimension_shifts` write to dimensions that may someday consume an `AWWV_PDP_*` sub-flag.

### G2 — Phase F closeout doc

Closeout document at `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md` (219 lines as of G4 amendments, 12 sections). Completes the Phase D / Phase E / Phase F closeout trilogy. Documents:

- The five Phase F packets (F1 runtime causality diagnostic / F2 static canon-gate audit / F3 static authoring graph / F4 Graphviz `.gv` renders + visualisations README / F5 end-to-end substrate integration test).
- Real-catalog statistics on the shipped Phase D + Phase E corpus (274 events / 376 edges / 3 foundationals / 2 Ring 3 / max chain depth 3 / max fanout 20).
- The heuristic-interpretation backlog (3 WARNINGs from F2 that became Phase G3 candidates).
- The trilogy structure: Phase D authored, Phase E activates, Phase F inspects.
- G3 and G4 amendment sections appended during Phase G follow-on packets, keeping the Phase F closeout the canonical entry point for the diagnostic suite + CI gate.

### G3 — F2 heuristic tuning + strict CI gate test

Two changes to `tools/diagnostics/sensitive_history_canon_gate_audit.ts` (875 lines current) plus a new strict-gate CI integration test:

- **Broadened canonical-punitive marker set.** Pre-G3 the audit only credited negative deltas on `internal_cohesion`, `military_credibility`, `international_standing` toward the §4 Cost Ledger floor. G3 broadens to all six canonical `DimensionId` punitives (`international_standing`, `internal_cohesion`, `military_credibility`, `patron_confidence`, `negotiating_leverage`, `territorial_legitimacy`) plus the EffectKind punitives `alliance_change < 0`, `recruitment_modifier < 1.0`, `equipment_quality_modifier < 1.0`. This resolves the three pre-G3 WARNINGs (`hrhb_territorial_scope_1993` `expansive_conquest`, `hrhb_territorial_scope_1993` `maximalist_with_serb_alliance`, `rbih_arms_embargo_lift_advocacy_1993` `seek_clandestine_arms`) under the canonical vocabulary, since they had been carrying patron-disinvestment / negotiating-leverage / international-standing punitives that the under-scoped marker set did not credit.
- **`reward_risk` INFO classification.** Positive `territorial_legitimacy` deltas + `recruitment_modifier` / `equipment_quality_modifier` multipliers > 1.0 on sensitive-adjacent options now emit a single aggregated INFO-severity violation per option. INFO is observational: it surfaces §6-reviewed sensitive-design decisions for visibility but does NOT block CI. The CRITICAL `forbidden_recruitment_modifier_above_one` signal is now scoped to extreme boosts (`> 1.20x`); the 1.0–1.20x band is intentionally vacated for §6-reviewed small canonical boosts. `pool_multiplier` is accepted as a field-name synonym alongside `multiplier` to match the catalog convention on `seek_clandestine_arms`. `reward_risk_markers` are stable-sorted via `strictCompare` before emission.
- **Strict-gate CI integration test.** New file `tests/sensitive_history_canon_gate_audit_strict_gate.test.ts` (81 lines, 2 tests) loads the real catalog, runs `buildSensitiveHistoryAudit`, and asserts `CRITICAL + WARNING = 0`. INFO is explicitly permitted. Failure prints every blocking violation with `event_id`, `family`, `kind`, `locator`, and `detail` for rapid author triage.
- **Real-catalog result.** 274 events scanned / 0 CRITICAL / 0 WARNING / 1 INFO (`seek_clandestine_arms` with `recruitment_modifier: 1.05 (pool_multiplier)` — §6-reviewed observational flag).

### G4 — GitHub Actions CI workflow

New workflow file at `.github/workflows/event-system-ci.yml` (94 lines). Single job `event-system-validation` with four sequential gates:

1. Gate 1 — `npx tsc --noEmit` typecheck.
2. Gate 2 — 18-file curated event-system + Phase E/F suite (`event_loader`, `event_loader_runtime_substrate`, `event_decisions`, `events_evaluate`, `events_evaluate_b3`, `event_families`, `event_state_shape_b2`, `event_causality_chain`, `event_family_graph`, `event_acceptance_report`, `event_taxonomy_report`, `event_presidential_acceptance`, `political_dimension_propagation_gate`, `political_dimensions_snapshot`, `phase_e2_cohesion_caution_bias`, `phase_e3_combined_activation`, `sensitive_history_canon_gate_audit`, `phase_d_causality_runtime_integration`).
3. Gate 3 — Phase F2 strict canon-compliance gate (`sensitive_history_canon_gate_audit_strict_gate.test.ts`).
4. Gate 4 — Baseline regression via `tools/scenario_runner/run_baseline_regression.ts`.

Triggers on push to `main` / `codex/**` / `feature/**` and on PR to `main`. Conventions match the existing repo set: Node 22, `npm install --legacy-peer-deps`, dual workspace install (root + `src/ui/map`), `actions/checkout@v5`, `actions/setup-node@v5`. Companion `.github/workflows/README.md` documents all five workflows (typecheck, baseline-regression, desktop-release-guard, release, event-system-ci) with per-gate description, local-equivalent commands, and convention notes.

The named workflow makes the canon-compliance gate a discrete PR-visible check rather than a regression buried inside the broader `test:vitest:fast` slice. G3 shipped the test that fails on canon-compliance regressions; G4 ships the CI surface that runs the test at PR time.

## Packet reference table

| Packet | Subject | Artifact | Lines | Tests | Commit |
|---|---|---|---|---|---|
| G1 | Event System Authoring Guide | `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md` | 515 | n/a (docs) | facd88e2 |
| G2 | Phase F closeout doc | `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md` | 219 | n/a (docs) | 95dc21d0 |
| G3 | F2 heuristic tuning + strict gate test | `tools/diagnostics/sensitive_history_canon_gate_audit.ts` + `tests/sensitive_history_canon_gate_audit_strict_gate.test.ts` | 875 + 81 | 28 + 2 | f1d8a97a |
| G4 | GitHub Actions CI workflow | `.github/workflows/event-system-ci.yml` + `.github/workflows/README.md` | 94 + catalog README | n/a (CI surface) | 8b3ec8f3 |

## Verification command

To re-verify Phase G state, run:

```
node node_modules/vitest/vitest.mjs run tests/sensitive_history_canon_gate_audit.test.ts tests/sensitive_history_canon_gate_audit_strict_gate.test.ts --reporter=dot
node node_modules/tsx/dist/cli.mjs tools/diagnostics/sensitive_history_canon_gate_audit.ts --violations-only
npx tsc --noEmit
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

Expected outcomes:

- 30 tests GREEN across the two F2-suite files (28 + 2).
- F2 violations-only output: 0 CRITICAL + 0 WARNING + 1 INFO (`seek_clandestine_arms` reward_risk).
- `npx tsc --noEmit` exit 0.
- Baseline regression: "Baseline regression: all scenarios match." (byte-identical — Phase G touched no engine code).

PR-time verification additionally runs the four event-system-ci gates as a named GitHub Actions check (`Event System CI / Event system validation`).

## Open follow-ups (non-blocking, deferred)

1. **F2 INFO follow-up policy** — the single shipped INFO (`seek_clandestine_arms` `pool_multiplier: 1.05`) is documented as §6-reviewed observational. If new §6-reviewed sensitive options land with small canonical boosts, INFO will accumulate; future Phase G housekeeping can add an INFO-summary section to the diagnostic output if the count crosses a threshold worth a dedicated panel review.
2. **Phase F2 → CI promotion of additional gates** — the named workflow currently runs Gates 1–4. If Phase D / E add new author-facing diagnostic surfaces (e.g. an `enables_events_runtime` cycle check), they can be appended as Gate 5+ without modifying the existing four gates.
3. **Authoring-guide drift detection** — G1 is a manually-maintained reference. If future authoring patterns drift from the guide (e.g. a new canonical dimension lands), the guide does not auto-update. Detection is currently manual; an authoring-guide drift checker is not a Phase G deliverable.
4. **Heuristic-interpretation pattern reuse** — G3's INFO-vs-CRITICAL severity split is the first instance in the diagnostic suite of an observational-but-not-blocking severity. Future diagnostics (e.g. F3 graph anomalies, F5 e2e signal drift) may benefit from the same three-tier classification; not in Phase G scope.

## Hard constraints honored throughout

- Determinism preserved — no `Math.random()`, no `Date.now()`, no timestamps in tool, test, workflow, or doc code; `reward_risk_markers` and audit-output structures stable-sorted via `strictCompare`.
- `docs/10_canon/FORAWWV.md` never auto-edited.
- `.claude/scheduled_tasks.lock` never staged.
- Locked worktree (`F:/awwv-baseline-probe`) never entered.
- No initial OSID overrides.
- No `avoided_osids_by_faction` usage.
- No baseline refresh in Phase G (Phase G is observability + CI-surface only; cannot legitimately move a baseline).
- No emojis; markdown GitHub-flavored.

## Cross-references

- Trilogy entry 1 (authoring substrate): `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`
- Trilogy entry 2 (consumer activation): `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- Trilogy entry 3 (observability layer): `docs/40_reports/implemented/20260528_PHASE_F_CLOSEOUT.md`
- Event-system authoring how-to (G1): `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md`
- Sensitive-history canon: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
- Engine dimension vocabulary canonical map: `memory/engine_dimension_vocabulary.md`
- F2 tool source: `tools/diagnostics/sensitive_history_canon_gate_audit.ts`
- F2 strict-gate test source: `tests/sensitive_history_canon_gate_audit_strict_gate.test.ts`
- F2 suite tests: `tests/sensitive_history_canon_gate_audit.test.ts`
- G4 workflow source: `.github/workflows/event-system-ci.yml`
- G4 workflow catalog README: `.github/workflows/README.md`
- Sibling CI workflow conventions: `.github/workflows/baseline-regression.yml`
- Phase H scoping doc (consumes Phase G surfaces): `docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md`
- Phase H closeout: `docs/40_reports/implemented/20260529_PHASE_H_CLOSEOUT.md`
