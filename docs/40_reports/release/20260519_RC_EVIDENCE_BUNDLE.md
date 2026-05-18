# RC Evidence Bundle — 2026-05-19

**Plan:** `docs/plans/2026-05-18-autonomous-rc-evidence-bundle-plan.md`.
**Branch:** `codex/rc-hardening-evidence-2026-05-19`.
**HEAD at bundle authoring:** `05b9ae5b` (later commits will append section 5).
**Origin:** branched from `0d3780a2` (`main`).
**Author:** autonomous RC hardening wave.

> **Scope reminder.** This bundle assembles repo-verifiable evidence and
> classifies remaining gates. It is **not** a launch decision, not a push,
> not a PR open. Operator-only and historian/user-gated rows are explicitly
> not marked complete; they are recorded as pending evidence for the
> operator to fill.

---

## 1. RC gate inventory

Gate classes:
- **repo-verified** — the gate is provable from a clean local repo + tests.
- **operator-only** — requires environment / certificates / VM / store
  dashboard / external service the autonomous worker cannot reach.
- **historian/user-gated** — requires sensitive-history prose review or
  player-design intent the user must approve.
- **not yet prepared** — no template or doc exists yet.

| Gate | Class | Owner doc / template | Repo-verifiable status |
|---|---|---|---|
| Typecheck | repo-verified | `npm.cmd run typecheck` | See §2 |
| Fast Vitest suite | repo-verified | `npm.cmd test` | See §2 |
| Scenario Vitest suite | repo-verified | `npm.cmd run test:vitest:scenario` | Not freshly run in this bundle. CI runs on every PR. |
| Baseline regression | repo-verified | `npm.cmd run test:baselines` | See §2 |
| Desktop / map build | repo-verified | `npm.cmd run desktop:map:build` | See §2 |
| Desktop release guard | repo-verified | `npm.cmd run desktop:release:check` | Not freshly run in this bundle. |
| NSIS package build | operator-only (local) | `npm.cmd run desktop:package:win:nsis` | A local installer exists at `dist-packaged/`. See §3. |
| NSIS package smoke | operator-only (local) | `npm.cmd run desktop:package:win:nsis:smoke -- --report-only` | Not freshly run in this bundle. |
| Linux AppImage package + smoke | operator-only (CI Linux) | `npm.cmd run desktop:package:linux:appimage(:smoke)` | Proved by `desktop-release-guard.yml` on each push. |
| Save/load round-trip determinism | repo-verified | `tests/scenario_continue_from_save_equivalence.test.ts` | Freshly run in Batch B. See §2 row. |
| Save migration drift | repo-verified | `tests/save_migration_drift_audit.test.ts`, `tools/diagnostics/save_migration_drift_audit.cjs` | Covered by `npm.cmd test` row. |
| Replay artifact equivalence | repo-verified | Same file as save/load round-trip | Freshly run in Batch B. |
| Determinism static scan | repo-verified | `tests/determinism_static_scan_r1_5.test.ts` | Covered by `npm.cmd test` row. |
| Docs-truth no-skip guard | repo-verified | `tests/docs_truth_no_skip_guard.test.ts` | New in Batch A. Covered by `npm.cmd test`. |
| Generated artifact ownership matrix | repo-verified | `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md` | New in Batch A. Static doc. |
| Pre-merge gate sequence | repo-verified | `docs/20_engineering/PRE_MERGE_GATE.md` | New in Batch A. Static doc. |
| Fast-suite drift taxonomy | repo-verified | `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md` | New in Batch A. Static doc. |
| Visual QA evidence inventory + capture matrix | repo-verified (audit) | `docs/40_reports/audits/20260519_VISUAL_QA_EVIDENCE_INVENTORY.md` | New in Batch C. Live captures pending operator. |
| Visual evidence — endgame verdict band | repo-verified (committed captures) | `docs/40_reports/implemented/visual_validation/20260518_cinematic_verdict/` | Captures already committed. |
| Visual evidence — endgame segmented flow | repo-verified (committed captures) | `docs/40_reports/implemented/visual_validation/20260518_endgame_small_screen_verdict_flow/` | Committed. |
| Visual evidence — Presidential loop | repo-verified (committed captures) | `docs/40_reports/implemented/visual_validation/20260518_presidential_loop/` | Committed. |
| Visual evidence — Track C/D | repo-verified (committed captures) | `docs/40_reports/implemented/visual_validation/20260517_track_*` | Committed. |
| Visual evidence — pre-advance modal, opening brief, coachmarks, op-history, force-quality/osid-damage, reduced-motion | **operator-only** | Capture matrix in `20260519_VISUAL_QA_EVIDENCE_INVENTORY.md` | Pending operator dev server presence. |
| Accessibility P0 — static guards | repo-verified | `tests/ui/accessibility_*` (33 tests) | Covered by `npm.cmd test`. |
| Accessibility — RC browser evidence | operator-only (browser/axe) | `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md` | Covered by linked report. |
| Branch merge evidence packet | repo-verified | `docs/40_reports/audits/20260518_BRANCH_MERGE_EVIDENCE_PACKET.md` | Covers the prior `codex/execute-2026-05-17-plans` branch; the RC hardening wave is a separate branch with §5 below. |
| Gated release & canon decision research | repo-verified | `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md` | Static decision research. |
| Clean-VM proof — Windows | **operator-only** | `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md` | Pending operator. Template ready. |
| Clean-VM proof — Linux | **operator-only** | Same template, Linux section | Pending operator. |
| Code signing — Windows | **operator-only** (certificate) | None in repo (intentional) | Pending; see `20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md` Microsoft Store MSIX / Trusted Signing recommendation. |
| SmartScreen reputation | **operator-only** | Same | Pending. |
| Store page / press kit / trailer | **operator-only / historian/user-gated** | `docs/plans/2026-05-17-marketing-store-launch-plan.md` | Pending. |
| BCS localization native-speaker review | **historian/user-gated** | `docs/40_reports/audits/20260518_BCS_LOCALIZATION_VERIFY_STALE.md` | Pending review; static implementation verified. |
| Sensitive-history Codex prose approval | **historian/user-gated** | Various sensitive event/notification rows | Pending historian approval. |
| FORAWWV edits | **historian/user-gated** | `docs/10_canon/FORAWWV.md` | No autonomous edits; user-owned. |
| Open Design Questions | **user-gated** | `docs/plans/MASTER_ROADMAP.md` Open Design Questions section | Pending user. |
| macOS dmg / notarization / auto-update | **operator-only** | `docs/plans/2026-05-18-autonomous-platform-packaging-bank.md` PPB-3 | Pending. |

## 2. Command evidence section

The commands below were freshly run during this RC hardening wave from
branch `codex/rc-hardening-evidence-2026-05-19`. Each row is dated to its
batch (A/B/C are this wave; D and E commands are the §5 final gate pass).
Rows marked "not freshly run in this bundle" should be re-run by the
operator (or read from CI) before the user marks RC ready.

| Check | Command | Result | Recorded at | Notes |
|---|---|---|---|---|
| Typecheck | `npm.cmd run typecheck` | **PASS** | Batch A, Batch B (post-edit), §5 final | Exit 0. |
| Focused docs-truth tests | `npx.cmd vitest run tests/docs_truth_no_skip_guard.test.ts tests/docs_desktop_v09_truth.test.ts --reporter=dot` | **PASS (2 files / 8 tests)** | Batch A | |
| Save/replay equivalence | `npx.cmd vitest run tests/scenario_continue_from_save_equivalence.test.ts --reporter=verbose` | **PASS (1 file / 2 tests)** | Batch B | ~22 s wall. |
| Full fast Vitest suite | `npm.cmd test` | **PASS** (786 files / 7161 tests / 18 skipped — all skipped are pre-existing `skipIf` fixture guards) | §5 final | ~826 s wall. |
| Baseline regression | `npm.cmd run test:baselines` | **PASS** ("all scenarios match") | §5 final | No anchor / benchmark / casualty-band drift. |
| Desktop / map build | `npm.cmd run desktop:map:build` | **PASS** (exit 0) | §5 final | ~18.4 s wall. Existing chunk-size warnings only. |
| Scenario Vitest suite | `npm.cmd run test:vitest:scenario` | not freshly run in this bundle | — | CI proves this on each PR. |
| Desktop release guard | `npm.cmd run desktop:release:check` | not freshly run in this bundle | — | Operator gate. |
| NSIS package build | `npm.cmd run desktop:package:win:nsis` | local artifact present (§3) | prior to this bundle | Not re-run; SHA recorded. |
| NSIS package smoke | `npm.cmd run desktop:package:win:nsis:smoke -- --report-only` | not freshly run in this bundle | — | Operator gate. |

## 3. Artifact and hash section

### Committed generated artifacts (in git)

| Artifact (repo-relative) | Size (bytes) | SHA-256 |
|---|---|---|
| `data/derived/startup/apr_1992_initial_save.json` | 1352514 | `6365ba2f64f5c9d626d085868fddb3a62b10963461307259978f8944b5222543` |
| `tools/diagnostics/output/save_migration_drift.json` | 3872 | `29898d4546c4f0ff0da53744d8b02f91cd0dddf5bcfefa16c4b4bfbf7d11241c` |
| `data/derived/scenario/baselines/manifest.json` | (see file) | `f65cdbe3b80f1ec26c9a8feb79ad5ec6805bbb268b613a1aae3060045a951567` |

These are repo-committed and reproducible from owner commands per
`docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`.

### Local build artifacts (NOT committed; operator-machine truth)

| Artifact (repo-relative, gitignored) | Size (bytes) | SHA-256 |
|---|---|---|
| `dist-packaged/A War Without Victory Setup 0.9.6-alpha.1.exe` | 957497059 | `49e6eff3be7761a4c0fe0d8dbb269032ccda80c9704c921cb99d45ebb0b2cdac` |

> The NSIS installer above is from a prior local build on this host. It is
> NOT reproducible from this branch's commits alone; for any release
> decision the operator must rebuild from the release commit, record the
> fresh SHA into `docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md`,
> and use that exact artifact for `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md`.
> Do not use the SHA above as release truth.

### Operator-pending artifacts (build required)

- Linux AppImage — must be produced from CI or operator-host
  `npm.cmd run desktop:package:linux:appimage`.
- macOS dmg / pkg / notarized bundle — not in scope; PPB-3 deferred.
- Microsoft Store MSIX — operator decision; see gated release research.

## 4. Known issues and waivers

### Carried known issues (from roadmap / backlog, not new)

| Issue | Severity | Owner doc |
|---|---|---|
| Late-war Teocak / Srebrenica residue at 188w | P1 | `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md` |
| Strict-null Phase 2 long tail (~66 remaining escapes) | P2 | `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md` |
| Sensitive-content notification residual (20 rows / 102 blocks behind review plan) | P1 | `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md` |
| Visual-QA captures for 5 surfaces (pre-advance modal, opening brief, coachmarks, op-history, map modes, reduced-motion) | P2 | `docs/40_reports/audits/20260519_VISUAL_QA_EVIDENCE_INVENTORY.md` |
| Clean-VM proof, signing, SmartScreen, store, BCS native-speaker review | P0 for distribution / P2 for repo work | `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md` |

### New waivers created in this bundle

**None.** Per plan stop-gate, no new waiver is created without user
approval. Waiver rows from operator-only template
(`20260517_RELEASE_EVIDENCE_TEMPLATE.md` §Waivers) are left empty and
operator-fillable.

## 5. Final gate sequence (this branch, this wave)

Recorded at HEAD `05b9ae5b` (the §5 results below are also folded into the
Batch D commit that ships this bundle). Gates run sequentially from a clean
working tree (working note `working-on.md` is gitignored). Commands run on
the dev host; cross-platform CI proof comes from the GitHub Actions
workflows linked in §6.

| Check | Command | Result | Notes |
|---|---|---|---|
| Typecheck | `npm.cmd run typecheck` | **PASS** (exit 0) | `tsc --noEmit -p tsconfig.json`. |
| Full fast Vitest suite | `npm.cmd test` | **PASS** (exit 0) | 786 test files passed, 2 skipped; 7161 tests passed, 18 skipped. ~826 s wall on this host. Skipped suites are the pre-existing `skipIf` conditional fixture cases (real-save dependent) — no new unconditional skips were introduced by this wave. |
| Desktop / map build | `npm.cmd run desktop:map:build` | **PASS** (exit 0) | `vite build --config src/ui/map/vite.config.ts`. ~18.4 s wall. Existing chunk-size warnings only (pre-existing; see napkin perf entries). |
| Baseline regression | `npm.cmd run test:baselines` | **PASS** (exit 0) | "Baseline regression: all scenarios match." No anchor / benchmark / casualty-band drift. |
| `git diff --check` | `git diff --check` | **PASS** (exit 0) at every Batch A/B/C commit. The Batch D commit also passes (docs-only). | |

### Skipped Vitest count interpretation

Of 18 skipped tests in the fast suite, none are new in this wave. All are
the documented `skipIf(...)` conditional fixture guards (`real_save_*`
tests gated on whether a real save fixture is present). The static
`tests/docs_truth_no_skip_guard.test.ts` confirms no unconditional `.skip(`
was introduced in `tests/docs_*truth*.test.ts`.

## 6. Cross-references

- `docs/40_reports/audits/20260518_BRANCH_MERGE_EVIDENCE_PACKET.md`
- `docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md`
- `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md`
- `docs/40_reports/audits/20260519_VISUAL_QA_EVIDENCE_INVENTORY.md`
- `docs/40_reports/implemented/20260518_MERGE_GATE_FAST_SUITE_BATCH36.md`
- `docs/40_reports/implemented/20260519_SAVE_REPLAY_DETERMINISM_PROOF.md`
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
- `docs/20_engineering/PRE_MERGE_GATE.md`
- `docs/40_reports/release/20260517_RELEASE_EVIDENCE_TEMPLATE.md`
- `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md`
- `docs/plans/2026-05-17-clean-vm-cosmetic-finalization-plan.md`
- `docs/plans/2026-05-17-gold-gate-launch-day-plan.md`
- `docs/plans/2026-05-17-external-playtest-readiness-plan.md`
- `docs/plans/2026-05-17-marketing-store-launch-plan.md`

## 7. Stop conditions explicitly honored

- No clean-VM closure claimed.
- No code signing closure claimed.
- No SmartScreen closure claimed.
- No store / press kit / trailer claim.
- No native-speaker BCS localization closure.
- No sensitive-history Codex prose closure.
- No FORAWWV edit.
- No Open Design Question decided.
- No new waivers created.
- No push, no PR, no force-anything.

## 8. Verdict

This bundle is **not a release decision**. It is the autonomous worker's
repo-side evidence substrate. The user / Codex consumes this bundle plus
the operator-only rows in §1 before any RC tag, push, or PR.
