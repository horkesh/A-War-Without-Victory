# Branch Merge Evidence Packet — `codex/execute-2026-05-17-plans`

**Generated:** 2026-05-18 inside autonomous session (Batch 47, lane "Merge/PR Evidence Packet").
**Source plan:** `docs/plans/2026-05-18-autonomous-merge-pr-evidence-plan.md`.

> **Scope reminder.** This packet is **reviewer-friendly evidence** for a merge decision, not a request to push or open a PR. No push, no `gh pr create`, no rebase, no squash performed. The branch is left clean on its current tip for the user to decide.

---

## 1. Branch fingerprint

| Field | Value |
|---|---|
| Branch | `codex/execute-2026-05-17-plans` |
| Merge base with `origin/main` | `4fa16b13417437d4dafa29aa0bd82cc367ddd6f9` |
| Branch tip | `7e05b967798148239f69dea928afdf617acf00bd` |
| Commits ahead of `origin/main` | **68** |
| `git status` | clean (no unrelated dirty files at packet authoring) |
| `git diff --shortstat origin/main..HEAD` | 597 files changed, 73,639 insertions(+), 41,321 deletions(-) |

---

## 2. Commit category inventory

Categories derived from commit subject prefixes + scope tags. Each commit is grouped by **what kind of artifact it touched**, not by date. Detailed ledger entries in `docs/PROJECT_LEDGER.md`.

### 2.1 Sim / output-behavior changes

These commits touched simulation, scenario, sector, serialization, or replay paths. All committed as **byte-identical** (40w hash unchanged) unless explicitly noted otherwise — see ledger for per-batch hash proof.

| Commit | Subject |
|---|---|
| `5ef10e38` | refactor(strict-null): batch 39 phase 3 safe early-war + bot slice (byte-identical) |
| `a6207f30` | perf(serialization): batch 38 redundant week-39 serialize/hash cleanup (byte-identical) |
| `6af84501` | perf(sector): batch 37 split-pieces redundant normalize skip (byte-identical) |
| `0ecad4ee` | feat(sim): close batch 35 HRHB patron directive scope helper + per-corps divergence test (byte-identical) |
| `5ed61fa9` | feat(serialization): close batch 33 serialization sub-attribution + replay-frame consumer audit (byte-identical) |
| `a6093a4c` | feat(sector): close batch 32 enforceFinalSectorGeometryInvariants 5-phase attribution (byte-identical) |
| `ce637cb5` | docs(strict-null): batch 30 — phase 2 long-tail classification and safe-scope closure |
| `d89afd2a` | feat(sector): close batch 26 :severe-rescue sub-attribution (byte-identical) |
| `d7d45ac4` | feat(sector): close batch 25 :zero-assigned activeCounts hoist (-45.1%, byte-identical) |
| `217ab5d1` | feat(sector): close batch 24 territory-claim-rescue sub-attribution |
| `2a94fd44` | feat(sector): close batch 23 ensureMinimumSectorCoverage closure-hoist + 5-phase attribution |
| `6a109b99` | feat(roadmap): close batch 22 (sector normalize friendlyUniverse hoist; sector attribution held) |
| `f8c0153f` | feat(roadmap): close batch 21 (strict-null Batch 20 + sector normalize/seal attribution) |
| `2d66de92` | feat(roadmap): close batch 20 (strict-null Batch 19 + sector owner-truth-pass attribution + 52w baseline regression refresh) |
| `5d9053b5` | feat(roadmap): close batch 19 (GUI playtest verify-stale + strict-null Batch 18 + sector staffability-filter optimization) |
| `d2e40fd7` | chore(sector): batch 27 :floor-completion hoist attempt + revert (learning-only) |

Earlier sim-touching commits (batches 1-17 / R2 lanes) span operations, brigade dissolution, sector splitting, supply derivation, scenario integrity, war-phase ordering, etc. — see git log for the full list.

### 2.2 UI / product changes (latest wave: Batches 40-46, this branch's UI lane bank)

Pure read-model / presentation; no sim authority touched.

| Commit | Subject |
|---|---|
| `7e05b967` | docs(a11y): batch 46 RC browser evidence verification report (UI-7) |
| `e0d0ef01` | refactor(ui): batch 45 onboarding legacy cleanup + persistence coverage (UI-6) |
| `08d1aeb7` | feat(ui): batch 44 endgame faction report mobile subdivision (UI-5) |
| `dd23330a` | feat(ui): batch 43 Army HQ Briefing progressive disclosure (UI-4) |
| `49bcf5b3` | docs(playtest): batch 42 GUI playtest D3-D7 closeout (UI-3) |
| `b3c01c49` | feat(ui): batch 41 decision room pushback explanations (UI-2) |
| `f5b9475a` | feat(ui): batch 40 supply visibility read-model (UI-1) |

### 2.3 Performance / attribution

Hot-path attribution + targeted optimization without behavior change.

Includes batches 32, 33, 37, 38 above (sector + serialization perf passes), plus `tools/perf/wall_clock_target_report.ts` + `tools/perf/profile_hotspot_report.ts` and assorted diagnostics in `tools/diagnostics/` added across the branch.

### 2.4 Tests / fixtures / generated artifacts

`tests/` saw ~30+ new files this branch (player-supply visibility, decision-room supply visibility, decision-room pushback explanations, faction-report mobile subdivision, situation-briefing progressive disclosure, onboarding persistence replacement, OPS-view exclusivity, map-mode no-duplicate-labels, washington joint pressure, wall-clock target report, etc.) plus regression baselines under `tests/__fixtures__/scenario/`.

| Notable | Commit |
|---|---|
| Fast-suite fixture repair | `84ec8554` test(merge-gate): repair full fast suite fixtures |
| Brigade dissolution coverage | (earlier batch — see git log) |

### 2.5 Docs / plans / reports / audits

| Commit | Subject |
|---|---|
| `c8e8b03f` | docs(release): document gated release decisions |
| `07f982ae` | docs(plans): add remaining-work coverage banks |
| `db3f6c79` | docs(plans): add autonomous evidence preparation plans |
| `65286301` | docs(plans): wire autonomous lane banks into roadmap |
| `ba16d403` | docs(plans): add focused autonomous lane banks |
| `0cb13777` | docs(plans): add autonomous roadmap lane bank |
| `ecbba41d` | docs(checkpoint): 2026-05-18 autonomous session — batches 19→32 closeout |
| `b4ad09bc` | docs(i18n): audit bcs localization plan — verify-stale |
| `ab44cc3c` | docs(ci): audit ci/test feedback loop plan — verify-stale |
| `de6516e2` | docs(audit): batch 34 — close H0 formal parent baseline verdict + accessibility P0 verify-stale |
| `d45ac235` | docs(backlog): annotate four verify-stale audit items so they don't resurface |
| `8c786eff` | docs(audit): batch 31 — consolidated verify-stale audit of 2026-05-17 plan wave |
| `91ee39f9` | docs(gui): close accessibility p0 verification batch |
| `376ad213` | docs(player-guide): promote Bosnian guide into docs/00_start_here/ and cross-link |
| `306b7dca` | docs(player-guide): add Bosnian-language new player guide (Vodič za nove igrače) |
| `69a9d0ed` | docs: clean batch report whitespace |
| `7032f46b` | chore(repo): clean root folder — drop tracked leftovers, retire Ralph tooling, archive GUI playtest report |

### 2.6 Operator-support-only (no engineering blocker)

`docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md` (see commit `c8e8b03f`) explicitly carves out the clean-VM, code-signing, SmartScreen, store/trailer publication, BCS localization quality, sensitive-history prose approval, and historian content approval gates as operator-only. Those remain **out of engineering scope** for this branch — no merge claim depends on them.

---

## 3. Evidence matrix

Each row records the strongest **locally verifiable** signal for a claim. Stale = evidence ran before a later commit that could invalidate it.

| Area | Evidence | Command / report | Risk |
|---|---|---|---|
| 40w determinism (sim batches) | `40w n1915 hash b14179d65639860c` byte-identical | per-batch ledger entry; e.g. Batch 39 `5ef10e38` ledger | Hash is locked at Batch 39 commit; later UI batches (40-46) do not touch sim and cannot alter it. **Not stale.** |
| 52w baseline regression | Refreshed Batch 20 (`2d66de92`) | ledger entry for Batch 20 | Later sector batches 21-32 reuse the same baseline; UI batches do not touch it. **Not stale.** |
| Typecheck | `npx.cmd tsc --noEmit` clean | per-batch ledger entry, latest at Batch 46 (`7e05b967`) | Re-ran in every UI batch on this branch. **Current at tip.** |
| Map build | `npm.cmd run desktop:map:build` clean | per-batch ledger entry, latest 16.76s at Batch 46 | Re-ran in every UI batch. **Current at tip.** |
| Targeted Vitest sweeps | UI-1: 40/40 / UI-2: 52/52 / UI-3: 46/46 / UI-4: 67/67 / UI-5: 114/114 / UI-6: 30/30 / UI-7: 33/33 | per-batch ledger entries (40-46) | Each sweep includes the regression layer plus the new focused test. **Current at tip.** |
| Full a11y matrix | 33/33 pass | `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md` | Static gate only. Live screen-reader / Playwright capture is operator-owned. |
| Whole-suite Vitest run | NOT executed in this packet | n/a | If a merge-ready signal is required, run `npm.cmd test` and `npm.cmd run test:baselines` (see §5). |
| Whitespace gate | `git diff --check` clean per batch | per-batch ledger | **Current.** |
| Generated artifacts | `dist/tactical-map/` rebuilt 7× during UI batches | per-batch ledger | Reproducible from source; do not block merge. |
| 40w run for UI batches | Skipped intentionally | per-batch ledger ("No 40w run — UI read-model only") | UI lanes touched only consumer-side projections; no sim path. |

---

## 4. Draft PR body (for the user's review when they're ready to push)

```markdown
## Summary

Closes 68 commits' worth of autonomous batch work since `origin/main` —
the v0.9.x autonomous roadmap lane bank execution from late 2026-05-17
through 2026-05-18, including the 7-batch UI product lane bank wave
(supply visibility, decision-room pushback, GUI playtest D3-D7 closeout,
Army HQ + Decision Room progressive disclosure, endgame faction-report
mobile subdivision, onboarding legacy cleanup, a11y RC browser-evidence
verification).

## Major behavior / output changes

- 40w hash byte-identical across all simulation-touching batches
  (n1915 `b14179d65639860c`).
- Strict-null Phase 2 + Phase 3 long-tail safe slices landed without
  emit drift.
- Sector pipeline got 5-phase attribution + hoist + rescue
  optimizations, all byte-identical.
- HRHB patron directive scope helper + per-corps divergence test
  added without baseline drift.
- UI: supply truth, Army CO pushback rationale, GUI playtest defects,
  Army HQ progressive disclosure, mobile faction report subdivision,
  onboarding cleanup, a11y verification — all UI-only, no sim auth.

## Hash / determinism proof

- `40w n1915` byte-identical to baseline (Batch 39 ledger).
- 52w baseline regression refreshed at Batch 20.
- Every byte-identical batch records its hash in
  `docs/PROJECT_LEDGER.md`.

## Test / build proof

- Typecheck (`npx tsc --noEmit`) clean at every batch.
- `desktop:map:build` clean at every UI batch.
- Targeted Vitest sweeps: per-batch ledger, latest UI-7 33/33.
- Full a11y matrix 33/33 pass — see
  `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md`.

## Generated artifacts

- `dist/tactical-map/` rebuilt during UI batches. Reproducible from
  source — do not block merge.

## Review guide

- Start with `docs/PROJECT_LEDGER.md` — every batch has a ledger entry
  with the change summary, determinism note, verification, and
  artifacts list.
- For the UI lane bank: read
  `docs/40_reports/GAME_STATE_RATING_MASTER.md` rows 3, 8, 15, 20, 21,
  24 (updated this branch).
- For the playtest defect closeout: read
  `docs/40_reports/playtest/GUI_PLAYTEST_2026-05-16.md` (defect-by-defect
  status legend added in Batch 42).
- For the a11y RC verification: read the audit file above.

## Known residual risks

- Live browser/Playwright a11y capture is deferred to operator-owned
  follow-up (no engineering blocker — see §3 of the merge evidence
  packet).
- Full `npm test` + `npm run test:baselines` were NOT re-executed at
  branch tip in the autonomous session; per-batch focused sweeps and
  CI history are the merge signal. The user may want to run the merge
  gate locally before pushing.

## Operator-only gates (not blocking engineering merge)

Clean-VM proof, Windows/macOS code signing, SmartScreen reputation,
store/press/trailer publication, BCS localization quality, sensitive-
history prose approval, FORAWWV edits, Open Design Question decisions,
historian approval — per
`docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## 5. Optional fresh merge gate (NOT run in this batch)

The plan's Task 4 says fresh gates run only "if the user asks for a merge-ready packet". The user prompt for this autonomous run asked for the packet, not the merge-ready gates, so the following were intentionally **NOT executed at branch tip** in Batch 47:

- `npm.cmd run typecheck` (last run at Batch 46 tip — clean)
- `npm.cmd test` (full Vitest sweep — not executed at tip)
- `npm.cmd run test:baselines` (40w + 52w baselines — not re-executed at tip; per-batch byte-identical proof recorded in ledger)
- `npm.cmd run desktop:map:build` (last run at Batch 46 tip — clean)
- `git diff --check` (clean per batch)

If the user wants the full merge gate, request a follow-up batch to run those four commands and record results in this packet.

---

## 6. Reviewer reading path

1. **`docs/PROJECT_LEDGER.md`** — latest 7 entries cover Batches 40-46 (the UI lane bank).
2. **`docs/40_reports/GAME_STATE_RATING_MASTER.md`** — rows 3, 8, 15, 20, 21, 24 carry the UI-batch deltas.
3. **`docs/40_reports/playtest/GUI_PLAYTEST_2026-05-16.md`** — defect-by-defect status legend.
4. **`docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md`** — a11y RC.
5. **`docs/40_reports/audits/20260518_GATED_RELEASE_AND_CANON_DECISION_RESEARCH.md`** — operator-only gate carve-out.
6. **This packet** (`docs/40_reports/audits/20260518_BRANCH_MERGE_EVIDENCE_PACKET.md`) — branch fingerprint, commit inventory, evidence matrix, draft PR body, fresh-gate status.

---

## 7. Stop gates honored

- No push performed.
- No PR created.
- No squash / rebase.
- No FORAWWV edit.
- No operator-only gate claimed closed.
- No simulation, scenario, save schema, or canon text touched in this batch (Batch 47 is documentation-only).

If the user reads this packet and decides to push / open a PR, that is a separate, explicit ask.
