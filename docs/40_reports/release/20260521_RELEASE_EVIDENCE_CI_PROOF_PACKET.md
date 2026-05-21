# Release Evidence CI Proof Packet - 2026-05-21

**Plan:** `docs/plans/2026-05-20-release-evidence-ci-proof-packet-plan.md`.
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19`.
**HEAD at packet authoring:** `f368b225d7810bf3df863ae0fa51bfa6adaafe30`.
**origin/main at packet authoring:** `f368b225d7810bf3df863ae0fa51bfa6adaafe30`.
**Recorded:** 2026-05-21 12:20 Sarajevo time.

This packet records repo-verifiable evidence for the current main tip after the strict-null, sector performance, H1 diagnostic, and notification safe-slice wave. It is not a release decision and does not close operator-only distribution gates.

---

## 1. Git Fingerprint

| Field | Value |
|---|---|
| Branch | `codex/teslic-collateral-and-strict-null-2026-05-19` |
| HEAD | `f368b225d7810bf3df863ae0fa51bfa6adaafe30` |
| origin/main | `f368b225d7810bf3df863ae0fa51bfa6adaafe30` |
| Ahead / behind | `0 / 0` |
| Dirty files | `.claude/settings.local.json`; `data/derived/latest_run_final_save.json` |

The two dirty files above are expected local/transient artifacts and were left unstaged. No unclassified source, docs, fixture, scenario, or generated-save changes were present when this packet was authored.

Recent accepted commits at this tip:

| Commit | Scope |
|---|---|
| `f368b225` | Safe front-visit notification recipient blocks |
| `bb74b9ee` | Notification residual review classification |
| `d5cea95e` | H1 watched-operation diagnostic warning fallback |
| `78a02e60` | H1 watched-operation visibility packet |
| `ed2747f0` | Sector formation-scan performance cache |
| `54aa450f` | ForceReadiness strict-null cleanup |

---

## 2. Local Verification Matrix

| Check | Command | Result | Notes |
|---|---|---|---|
| Working tree | `git status --short --branch` | **PASS** | Branch even with `origin/main`; only the two expected transient files dirty. |
| Typecheck | `npm.cmd run typecheck` | **PASS** | `tsc --noEmit -p tsconfig.json`, exit 0. |
| Strict-null inventory guard | `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` | **PASS (60/60)** | Pins all accepted strict-null slices through Batch C/tail and ForceReadiness. |
| Strict-null inventory snapshot | `node tools/diagnostics/strict_null_inventory.cjs` | **PASS** | Current count floor: `2 / 4 / 180 / 10 / 36 / 463`. |
| Baseline regression | `npm.cmd run test:baselines` | **PASS** | Output included `Baseline regression: all scenarios match.` |
| Desktop map build | `npm.cmd run desktop:map:build` | **PASS** | Built `tactical_map-B9Y2o7ot.js` and CSS; existing Vite externalization/chunk warnings only. |
| Whitespace/conflict marker guard | `git diff --check` | **PASS** | Exit 0. |

Strict-null count tuple order: `as_factionid_casts / as_unknown_casts / as_any_casts / non_null_assertions_dot / non_null_assertions_index / optional_fields_game_state`.

Additional touched-area checks already recorded for this wave:

| Lane | Evidence |
|---|---|
| Notification safe slice | `npx.cmd vitest run tests/sim/events/event_notification_content_backfill.test.ts tests/sim/events/two_level_surfacing.test.ts tests/ui/inboxItems.notifications.test.ts tests/event_timeline_integrity.test.ts --reporter=dot` PASS (26/26). |
| H1 diagnostic | `npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts --reporter=dot` PASS (4/4); fresh 188w evidence run PASS. |
| Sector performance | Focused sector partition, instrumentation, hotspot, final-sector-truth, and war-phase tests PASS; 40w timed run hash-stable. |

---

## 3. GitHub Actions Status

Captured with `gh run list --branch main --limit 16` after the local release matrix completed.

| Workflow | Commit | Run id | Status | Conclusion |
|---|---|---:|---|---|
| Baseline Regression | `f368b225` | `26219828460` | in_progress | pending |
| Desktop Release Guard | `f368b225` | `26219828457` | in_progress | pending |
| Baseline Regression | `bb74b9ee` | `26219610349` | in_progress | pending |
| Desktop Release Guard | `bb74b9ee` | `26219610192` | completed | success |
| Baseline Regression | `d5cea95e` | `26219471764` | in_progress | pending |
| Desktop Release Guard | `d5cea95e` | `26219471980` | completed | success |
| Baseline Regression | `78a02e60` | `26219290360` | completed | success |
| Desktop Release Guard | `78a02e60` | `26219290346` | completed | success |
| Baseline Regression | `ed2747f0` | `26218365341` | completed | success |
| Desktop Release Guard | `ed2747f0` | `26218365343` | completed | success |
| Baseline Regression | `54aa450f` | `26217414011` | completed | success |
| Desktop Release Guard | `54aa450f` | `26217414089` | completed | success |

Stop-gate interpretation: current-tip local verification is green, but CI was not fully settled at packet authoring. Do not claim current-tip CI green until the `f368b225` Baseline Regression and Desktop Release Guard runs complete successfully.

---

## 4. Baseline And Scenario Evidence

| Evidence | Result |
|---|---|
| Current-tip baseline regression | `npm.cmd run test:baselines` PASS, `Baseline regression: all scenarios match.` |
| Sector performance 40w pre-cache run | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1920`, hash `5c6e7b62fa6670c0`, wall `99.16s`. |
| Sector performance 40w post-cache run | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1921`, hash `5c6e7b62fa6670c0`, wall `95.23s`, total `96384.533ms`. |
| H1 188w evidence run | `runs/apr1992_definitive_188w__210e69404d054959__w188_n1922`, final hash `7b57a8592f668137`. |

H1 diagnostic decision surfaced by the evidence: Krivaja-95 is present but blocked by `brigade_ineligible`; Cerska-Kamenica and Stupcanica-95 remain missing from structured watched-operation/AAR evidence. The next H1 owner is lifecycle tracing for non-warning skip reasons, not operation outcome tuning.

Notification safe-slice decision surfaced by the evidence: the safe front-visit copy lane is closed, reducing residual notification content from 20 rows / 102 recipient blocks to 20 rows / 90 recipient blocks. Historian-required, narrative-tone, Washington-timing, late-war-outcome, and blocked-sensitive blocks remain gated.

---

## 5. Generated Artifact Ownership

| Artifact | Status | Owner / rule |
|---|---|---|
| `.claude/settings.local.json` | Dirty, unstaged | Local tool/session state; intentionally excluded. |
| `data/derived/latest_run_final_save.json` | Dirty, unstaged | Local latest-run pointer/save artifact; intentionally excluded. |
| `data/derived/_debug/h1_sensitive_history_status_188w.json` | Gitignored, regenerated | Diagnostic evidence derived from the 188w run; not committed. |
| `runs/apr1992_definitive_*` evidence dirs | Gitignored, regenerated | Scenario evidence directories; referenced by run id/hash, not committed. |
| `dist/tactical-map/*` | Build output, gitignored | Rebuilt by `npm.cmd run desktop:map:build`; not committed. |

No generated artifact was mixed into this proof packet commit without an explicit owner.

---

## 6. Operator-Only Evidence

These gates remain open and must not be inferred from the repo-side checks above.

| Gate | Status |
|---|---|
| Windows clean-VM install | Not run in this packet. |
| Linux clean-VM install | Not run in this packet. |
| Windows SmartScreen UX | Not run in this packet. |
| Code signing / certificate path | Not run in this packet. |
| Store packaging / MSIX submission | Not run in this packet. |
| External playtest artifacts | Not run in this packet. |
| Native-speaker BCS localization review | Not run in this packet. |
| Sensitive-history prose sign-off | Partially prepared by reviewer packets; remaining notification blocks still gated. |

---

## 7. Verdict

Repo-side verification is green at `f368b225`: typecheck, strict-null guard, current strict-null inventory, baseline regression, desktop map build, and `git diff --check` all pass.

Current-tip GitHub Actions were still pending when the packet was authored. The release/merge proof becomes CI-green only after `26219828460` and `26219828457` complete successfully.
