# Save / Replay / Generated-Artifact Stability — Dedicated Execution Plan

**Date:** 2026-05-29
**Status:** DRAFT — read-only plan. NO code edits, NO commits, NO scenario refreshes in this doc.
**Author lane:** Systems Programmer (save/replay determinism)
**Owner on execution:** Save-replay determinism bank (`docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md`)
**Authority:** Below canon (`CLAUDE.md` Sacred Rules). Expands — does NOT contradict — Phase 3 of `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md:138-164`.
**Command-board row:** P1 "Save/load/replay and generated-artifact stability" (`docs/plans/COMMAND_BOARD.md`, status ACTIVE).
**Format exemplar:** `docs/plans/2026-05-29-fall-1995-deferrals-ea5-ea6-eb1-plan.md` (multi-item, verification-heavy, file:line-grounded).

---

## 1. Objective + Why

Continue tightening **save/load/replay byte-stability** and **generated-artifact ownership** with the established proof-first, one-slice-per-commit discipline. The lane has closed a long run of static-ownership slices (replay manifest, replay sidecars, save-migration drift byte-identity, `latest_run_final_save` map-copy, baseline manifest, startup snapshot, terrain PMTiles, painted-compare, force-quality markdown, plus the ownership-matrix meta-guard). The Phase-3 directive (`2026-05-24-...-residuals-execution-plan.md:142`) states the **next slice must remain a mapped artifact-owner check before changing writes**.

Two concrete gaps are now visible and unowned:

1. **Untracked transient scenario scratch trees** under `data/derived/scenario/_*` that are neither gitignored nor classified by the ownership matrix — a drift/accidental-commit hazard.
2. No matrix row generalizes the `data/derived/scenario/_*` transient family the way `data/derived/_debug/**` is covered, so the ownership-matrix meta-guard (`tests/generated_artifact_ownership_matrix_contract.test.ts:77-135`) does not protect them.

**Why it matters:** Determinism is sacred (`CLAUDE.md` Sacred Rules — "No `Math.random()`, no timestamps, no `Date.now()` in sim code"). Saves/replays must be byte-stable across the same inputs on the same platform (`GENERATED_ARTIFACT_OWNERSHIP.md:50-62`). Every committed generated artifact must have a documented owner command, or it must not be committed (`GENERATED_ARTIFACT_OWNERSHIP.md:22-24`). Unclassified transient trees erode both guarantees and are exactly what the STOP gate names.

---

## 2. Scope & Non-Scope

### 2.1 In scope
- **Classification-first artifact-owner slices:** add/extend ownership-matrix rows + a paired `*_artifact_ownership.test.ts` guard for currently-unmapped generated artifacts, BEFORE touching any write path.
- **Transient `data/derived/scenario/_*` family:** gitignore coverage + a single transient catch-all matrix row + a guard test, mirroring the `data/derived/_debug/**` precedent (`tests/data_derived_debug_artifact_ownership.test.ts`).
- **Safe redundant-write removal WITH ownership proof:** only after the artifact's final owner is mapped, proven by baseline byte-identity + drift audit.
- **Save/load/replay determinism roundtrip proofs** (SRD-1 / SRD-2 from the determinism bank) where a mapped artifact's byte-stability is the contract under test.

### 2.2 Non-scope (explicit — these are the STOP gate)
- **NO refreshing/deleting/regenerating scenario-derived artifacts** (`baselines/manifest.json`, `baseline_ops_sensitivity*`, `sweeps/h2_4`, `recruitment_test_matrix_*`) without scenario/calibration **owner approval**.
- **NO refreshing/deleting/replacing committed PMTiles** (`data/derived/tiles/*.pmtiles`) without a terrain/tile pipeline owner decision + Git-LFS binary-attribute proof (`GENERATED_ARTIFACT_OWNERSHIP.md:35-37`).
- **NO committing unlisted diagnostics output** (`tools/diagnostics/output/*.json` other than the mapped drift file).
- **NO removing a redundant write without proof of final artifact ownership.**
- **NO calibration tuning, operation/event/scenario-control changes, schema/optional-field work** (that is Phase 1 / Phase 2 of the residuals plan).
- **NO edit to `docs/10_canon/FORAWWV.md`** (`CLAUDE.md` Sacred Rules).
- **NO baseline re-bless** — this lane produces byte-identical output; if a write change would move output it leaves the lane.

---

## 3. Current-State Findings (file:line / path)

### 3.1 Closed slices (do not redo)
Per `2026-05-24-...-residuals-execution-plan.md:142` and the matrix, the following static-ownership rows are CLOSED:
- Replay manifest path/equivalence; replay sidecars `replay_sequence.jsonl` / `replay_timeline.json` (`GENERATED_ARTIFACT_OWNERSHIP.md:41-42`, guarded by `tests/replay_artifact_ownership.test.ts`).
- Replay save finalizer sidecars `replay_save_sequence.json` / `replay_save_manifest.json` (`GENERATED_ARTIFACT_OWNERSHIP.md:43-44`, `tests/replay_save_finalizer_artifact_ownership.test.ts`).
- Save-migration drift byte-identity (`GENERATED_ARTIFACT_OWNERSHIP.md:30`, `tests/save_migration_drift_artifact_ownership.test.ts`).
- `latest_run_final_save.json` map-copy byte-equivalence (`GENERATED_ARTIFACT_OWNERSHIP.md:38`, `tests/scenario_latest_run_final_save_artifact_ownership.test.ts`).
- Baseline manifest artifact-set ownership (`:31`, `tests/baseline_artifact_ownership.test.ts`); startup snapshot (`:29`, `tests/startup_snapshot_artifact_ownership.test.ts`); baseline-ops sensitivity (`:32`); H2.4 sweep (`:33`); recruitment matrix (`:34`); terrain PMTiles (`:35-37`); painted-compare (`:47`); force-quality markdown (`:46`); diagnostics-output wildcard (`:48`); `data/derived/_debug/**` (`:39`).
- Ownership-matrix meta-guard (`tests/generated_artifact_ownership_matrix_contract.test.ts`) — enforces every `*_artifact_ownership.test.ts` is cited by a matrix row, 5-column rows, POSIX repo-relative keys, and ≥1 transient catch-all that says "Default transient" + "Do not commit".

### 3.2 The named ownership-matrix meta-guard pattern (the contract)
`tests/generated_artifact_ownership_matrix_contract.test.ts:106-127`: parses `## Matrix` rows, collects cited test paths, asserts each cited test exists in git (`git ls-files`), and asserts **every** `tests/*artifact_ownership.test.ts` (except itself) is referenced by some row. Consequence: **adding a new ownership test without a matrix row that cites it FAILS the meta-guard**, and vice-versa. Any new slice MUST land matrix-row + test + citation together.

### 3.3 The remaining UNMAPPED / UNTRACKED artifacts (the gap)
- **Untracked & UNIGNORED transient scenario trees** (`git status --short` at session start):
  - `data/derived/scenario/_packet3_baseline_ops_4w/` (contains `baseline_ops_4w__fd3836147da67678__w4_n0` run tree).
  - `data/derived/scenario/_packet3_noop_4w/` (contains `apr1992_historical_52w__…__w52`, `noop_4w__…__w4_n0`).
  - `data/derived/scenario/_phase_e_simulator_tmp/` (contains `cohesion_only`, `intl_only` sub-runs).
  - `data/derived/scenario/_sarajevo_override_test/` (contains `base`, `override_a`, `override_b`).
- **Also present on disk, also `_`-prefixed scratch** (ignore status differs): `data/derived/scenario/_latest_40w_tmp/` (holds a bare `final_save.json`), `data/derived/scenario/_baseline_tmp/`.
- **Only ONE `_`-prefixed scenario dir is gitignored:** `.gitignore:81` covers `data/derived/scenario/_baseline_tmp/` only. The four untracked dirs above + `_latest_40w_tmp` are **not** matched by any `.gitignore` rule and **not** classified by the ownership matrix.
- **Precedent for the fix:** `data/derived/_debug/` is ignored at `.gitignore:39` AND has a transient catch-all matrix row at `GENERATED_ARTIFACT_OWNERSHIP.md:39` guarded by `tests/data_derived_debug_artifact_ownership.test.ts:24-53` (asserts the gitignore line via regex `^data\/derived\/_debug\/$`, asserts the matrix row text, and asserts `git ls-files` returns empty for the tree). This is the exact shape to replicate for the scenario `_*` family.

### 3.4 Replay machinery (writers — for SRD roundtrip proofs)
- `src/scenario/scenario_runner.ts:2028` declares `replaySequencePath = join(outDir, 'replay_sequence.jsonl')`; `:2070` gates `replay_timeline.json` on `emitWeeklySavesForVideo`; `:2740` `streamFinalizeReplaySaveSequenceFromJsonl(outDir, replaySequencePath)`; `:2745` `replay_save_manifest.json`; `:3157-3158` returns both sidecar paths. The `replay_artifact_ownership.test.ts:49-73` already asserts these exact writer lines — the byte-stability contract is the writers' determinism, not their existence.

---

## 4. Design

### 4.1 Next safe slice (recommended): transient scenario-scratch family classification
This is a **classification-only, no-write-change** slice — the safest possible per the STOP gate (it removes drift risk without touching any write path). It mirrors the closed `data/derived/_debug/**` slice exactly.

Three coordinated edits in ONE commit (they must land together or the meta-guard fails):
1. **`.gitignore`** — add a single rule covering the transient scenario scratch family. Preferred: a glob that matches the `_`-prefixed convention without swallowing committed evidence trees (`baselines/`, `baseline_ops_sensitivity*`, `sweeps/`, `recruitment_test_matrix_*` are all NON-`_`-prefixed, so they are safe). Candidate rule: `data/derived/scenario/_*/`. Verify it does NOT match any committed path via `git ls-files data/derived/scenario/ | grep '/_'` (expect empty) before committing.
2. **`GENERATED_ARTIFACT_OWNERSHIP.md`** — add ONE transient catch-all `## Matrix` row keyed `data/derived/scenario/_*/...` with columns: Owner = "Owner varies by scenario diagnostic / temp run; each producer documents its own command on promotion."; Validation = cites the new test; Commit policy = "No committed files. Do not commit `data/derived/scenario/_*` scratch; promote only by adding a narrower matrix row + focused validation first."; Transient policy = "Default transient. Ignored workspace scratch for scenario diagnostics, packet probes, and temp runs." The text MUST contain the literal strings `Default transient` and `Do not commit` (meta-guard `:130-134`) and `*` so it is recognized as a transient catch-all (`:98-101`).
3. **`tests/scenario_transient_scratch_artifact_ownership.test.ts`** (new) — mirror `tests/data_derived_debug_artifact_ownership.test.ts`: assert the `.gitignore` rule via regex, assert the matrix row text fragments, and assert `git ls-files data/derived/scenario` returns no `_`-prefixed entries.

### 4.2 Meta-guard matrix-extension pattern (reusable for every future slice)
For any subsequent artifact-owner check: (a) add the `## Matrix` row first; (b) add the guard test that `startsWith('| \`<artifact>\`')`-matches the row and `git ls-files`-checks tracked/untracked state; (c) cite the test path inside the row so the meta-guard's `matrixCitedTests` set includes it (`:94-96`). Land all three in one commit — partial lands fail `generated_artifact_ownership_matrix_contract.test.ts`.

### 4.3 Safe redundant-write removal (only after a future slice maps an owner)
Deferred until a specific redundant write is identified AND its final owner is matrix-mapped. The removal commit must: prove the artifact's sole remaining owner command; run the owner command and show byte-identical output (drift audit); run baseline regression byte-identical. No write removal lands in the next-slice commit.

---

## 5. Step-by-Step Implementation (numbered discrete commits)

Each commit = ownership test/classification **before** any write change. One slice per commit (`CLAUDE.md` "One change per calibration run"; residuals plan `:53-55` "One phase per commit").

**Commit 1 — Transient scenario-scratch classification (next safe slice; NO write change).**
1. Pre-flight: `git status --short --branch`; `git ls-files 'data/derived/scenario/_*'` (top-level-anchored pathspec — expect EMPTY: no top-level `_`-prefixed scenario dir is committed); `git check-ignore data/derived/scenario/_packet3_noop_4w` (expect: not ignored — proving the gap). NOTE: the unanchored form `git ls-files data/derived/scenario/ | rg '/_'` is NOT empty — it lists the TRACKED nested `recruitment_test_matrix_2026_02_11/_tmp_player_choice_recruitment_4w__…__w4/` evidence files. Those nested `_tmp*` paths are intentionally out of scope of the top-level `_*/` glob, must remain tracked, and are NOT the check used here.
2. Add `.gitignore` rule `data/derived/scenario/_*/` (after `:81`). This glob is anchored to the level immediately under `scenario/`, so it matches only top-level `_`-prefixed dirs and does NOT reach the nested `recruitment_test_matrix_*/_tmp*` committed tree.
3. Re-verify: `git check-ignore data/derived/scenario/_packet3_noop_4w/` now matches; `git status --short` no longer lists the four `_*` dirs; `git ls-files 'data/derived/scenario/_*'` still EMPTY (the top-level glob caught no committed tree); the nested `recruitment_test_matrix_*/_tmp*` files remain tracked (`git ls-files data/derived/scenario/recruitment_test_matrix_2026_02_11/` non-empty, unchanged).
4. Add the transient catch-all matrix row to `GENERATED_ARTIFACT_OWNERSHIP.md`.
5. Add `tests/scenario_transient_scratch_artifact_ownership.test.ts` citing-mirror of the `_debug` guard.
6. Run the meta-guard + new guard + `_debug` guard (regression) + typecheck (§6).
7. Commit. Ledger entry. COMMAND_BOARD next-action update.

**Commit 2+ (future slices — only if a concrete next artifact-owner check is identified).** Repeat the §4.2 pattern: matrix row + guard test + citation, classification before any write. Only after that may a §4.3 redundant-write-removal commit proceed, gated on byte-identity proof.

---

## 6. Determinism & Byte-Stability

- **No write paths change in Commit 1** — classification-only. Therefore all scenario/save/replay output is byte-identical by construction; no baseline can move. This is the strongest determinism posture and is why it is the recommended next slice.
- **Determinism contract** (`GENERATED_ARTIFACT_OWNERSHIP.md:50-62`): every owner command must be byte-identical for the same inputs on the same platform. Any future write-touching slice must prove this via owner-command re-run + drift audit.
- **Drift audit:** `node tools/diagnostics/save_migration_drift_audit.cjs` must produce byte-identical `save_migration_drift.json` (no `git status` movement) before/after any save-path slice.
- **Baseline regression byte-identity:** `npm.cmd run test:baselines` must pass with no manifest hash movement for any write-touching slice; if a hash moves, STOP and route to the owning calibration/scenario plan (do NOT re-bless here).
- **40w/188w hash:** classification slices are expected 40w byte-identical; a moved 40w hash = a leaked write change → STOP and explain (residuals plan stop gate `:106`).

---

## 7. Test Plan

Per slice, before commit:
```powershell
npx.cmd vitest run tests/generated_artifact_ownership_matrix_contract.test.ts ^
  tests/scenario_transient_scratch_artifact_ownership.test.ts ^
  tests/data_derived_debug_artifact_ownership.test.ts ^
  tests/replay_artifact_ownership.test.ts ^
  tests/replay_save_finalizer_artifact_ownership.test.ts ^
  tests/baseline_artifact_ownership.test.ts ^
  tests/startup_snapshot_artifact_ownership.test.ts ^
  tests/save_migration_drift_artifact_ownership.test.ts ^
  tests/scenario_latest_run_final_save_artifact_ownership.test.ts ^
  tests/terrain_tiles_artifact_ownership.test.ts ^
  tests/painted_compare_artifact_ownership.test.ts ^
  tests/force_quality_diagnostic_artifact_ownership.test.ts ^
  tests/baseline_ops_sensitivity_artifact_ownership.test.ts ^
  tests/scenario_sweep_artifact_ownership.test.ts ^
  tests/recruitment_test_matrix_artifact_ownership.test.ts ^
  tests/diagnostics_output_artifact_ownership.test.ts --reporter=dot
npm.cmd run typecheck
git diff --check
```
For any write-touching slice additionally:
- Save/load/replay roundtrip: focused SRD-1 / SRD-2 tests (`save_continue_hash_chain`, `scenario_continue_from_save_equivalence.test.ts`, `replay_save_emit.test.ts`, `replay_player.test.ts`).
- `npm.cmd run test:baselines` (byte-identity).
- `node tools/diagnostics/save_migration_drift_audit.cjs` then `git status --short` (expect clean).

Full-suite + smoke triad before sign-off: `npx tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`. Poll CI after push (memory: agent-reported GREEN is local-subset only).

---

## 8. Verification Gates

1. Meta-guard green (matrix complete + every ownership test cited).
2. New + regression ownership guards green.
3. `git status --short` shows the four `_*` dirs gone (ignored), no NON-`_` committed tree newly ignored.
4. `git diff --check` clean; typecheck clean.
5. Byte-identity: no baseline/drift/40w hash movement (classification slice).
6. Ledger + COMMAND_BOARD updated.

---

## 9. Risks (incl. the STOP gate)

- **Deleting/refreshing scenario-derived artifacts without approval** — STOP gate. Mitigation: this lane only *ignores* `_`-prefixed scratch and *classifies*; it never deletes/refreshes `baselines/`, `baseline_ops_sensitivity*`, `sweeps/`, `recruitment_test_matrix_*`. Verify the gitignore glob does not match any committed tree (`git ls-files … | rg '/_'` empty) before commit.
- **Over-broad gitignore swallowing a committed evidence tree** — Mitigation: all committed evidence trees are NON-`_`-prefixed; the rule targets `_*` only; verified with `git ls-files` + `git check-ignore` both directions.
- **Committing unlisted diagnostics output** — STOP gate. Mitigation: the new row is a *transient catch-all* (Do-not-commit), and the guard asserts `git ls-files` returns empty; promotion requires a narrower row first.
- **PMTiles bytes** — STOP gate. Out of scope; no terrain/tile artifact touched.
- **Removing a redundant write without owner proof** — STOP gate. No write removal in the next slice; future removals gated on §4.3 byte-identity proof.
- **Meta-guard partial-land failure** — Mitigation: matrix row + test + citation land in ONE commit.

---

## 10. Rollback

Commit 1 is `.gitignore` + one doc row + one new test — fully reversible via `git revert <sha>`. No generated output changes, no save/replay write paths touched, so revert restores byte-identical prior state with zero baseline impact. Any future write-touching slice rolls back by reverting its commit and (only if it owned an output move) restoring the prior manifest — none expected in this lane.

---

## 11. Dependencies

- Ownership-matrix meta-guard contract (`tests/generated_artifact_ownership_matrix_contract.test.ts`) — shipped.
- `data/derived/_debug/**` precedent (`tests/data_derived_debug_artifact_ownership.test.ts`, `.gitignore:39`) — shipped, the template.
- Determinism bank (`docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md`) for SRD-1/SRD-2 roundtrip proofs on future write-touching slices.
- Residuals Phase 3 (`docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md:138-164`) — this plan is its detailed expansion; closeout must update both.

---

## 12. Owner

Save-replay determinism bank. Reviewers: determinism-auditor, scenario-harness-engineer, QA engineer (per residuals plan Phase 3 `:140-141`).

---

## 13. Definition of Done

- Next safe slice (transient scenario-scratch classification) landed as ONE commit: `.gitignore` rule + transient catch-all matrix row + new `scenario_transient_scratch_artifact_ownership.test.ts`, all three citing-consistent so the meta-guard passes.
- Four untracked `data/derived/scenario/_*` dirs (+ `_latest_40w_tmp`) ignored; `git status --short` clean of them; no committed evidence tree newly ignored.
- All 15 ownership guards + meta-guard green; typecheck + `git diff --check` clean; baseline/drift/40w byte-identical (classification slice).
- COMMAND_BOARD P1 "Save/load/replay" next-action advanced to the following mapped artifact-owner check; residuals Phase 3 status note updated; `docs/PROJECT_LEDGER.md` entry appended. `docs/10_canon/FORAWWV.md` untouched.

— End of plan —
