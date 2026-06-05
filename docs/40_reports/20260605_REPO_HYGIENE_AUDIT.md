# Repo Hygiene Audit — Worktree & Branch Prune Plan (READ-ONLY)

**Date:** 2026-06-05
**Author:** Claude (isolated agent worktree `agent-af1e5553ed325930d`)
**Mode:** READ-ONLY audit. ZERO destructive git operations performed. `git fetch origin` only.
**Reference point:** `origin/main` = `2f6daf18` (primary worktree `F:/A-War-Without-Victory` is on `main` @ `2f6daf18`, identical to `origin/main`).

> This document is a **plan**, not an execution. Every command below is for the OWNER to run after review.
> "ahead" = commits unique to the branch (`git rev-list --count origin/main..<branch>`).
> A branch is **MERGED** (safe) only when ahead == 0.

---

## Headline counts

| Metric | Count |
|---|---|
| Worktrees total | 73 |
| Local branches total | 158 |
| Merged branches (ahead==0, incl. `main` + live worktree stubs) | 45 |
| Unmerged branches (ahead>0 — PRESERVE) | 113 |
| Worktrees safe to remove now (branch merged) | 6 (+1 auditor self = do-not-remove) |
| Merged branches directly deletable (not checked out anywhere) | 36 |
| Codex-active / do-not-touch | `main` + all `codex/*` + every live worktree's branch |

**CRITICAL:** 113 local branches carry unique commits not in `origin/main`. **Do NOT bulk-delete by name pattern.** The single highest-risk branch is `codex/roadmap-noncalibration-2026-05-22` (**138 unique commits**, real i18n work). See PRESERVE list.

---

## A. Worktrees whose branch is MERGED — SAFE to remove now

These worktrees hold a branch fully contained in `origin/main`. Removing the worktree loses nothing (the commits are already in main). **Exception:** the auditor's OWN worktree `agent-af1e5553ed325930d` must NOT be removed while this audit runs — listed for completeness only.

| Worktree path | Branch | behind / ahead | Action |
|---|---|---|---|
| `.claude/worktrees/agent-a436e10c1b45425bd` | `worktree-agent-a436e10c1b45425bd` | 1 / 0 | remove worktree + delete branch |
| `.claude/worktrees/agent-a8d307c6e8340e6a9` | `worktree-agent-a8d307c6e8340e6a9` | 15 / 0 | remove worktree + delete branch |
| `.claude/worktrees/agent-aa4210ac20b47596e` | `worktree-agent-aa4210ac20b47596e` | 1 / 0 | remove worktree + delete branch |
| `.worktrees/author-op` | `claude/author-new-op-2026-06-01` | 128 / 0 | remove worktree + delete branch |
| `.worktrees/issue-170-phase-e-off-skip-2` | `codex/issue-170-phase-e-off-skip-2` | 22 / 0 | **codex/** — confirm Codex done, then remove |
| `F:/AWWV-formation-spawn-directive` | `codex/formation-spawn-directive-validate` | 3 / 0 | **codex/** — confirm Codex done, then remove |
| `F:/AWWV-review-cache-fingerprints` | `codex/review-cache-fingerprints` | 21 / 0 | **codex/** — confirm Codex done, then remove |
| `.claude/worktrees/agent-af1e5553ed325930d` | `worktree-agent-af1e5553ed325930d` | 0 ahead | **AUDITOR'S OWN WT — do not remove during audit** |

Note: the 3 `codex/*` merged worktrees are merged into main but Codex-owned; treat as safe only after confirming no active Codex session holds them.

---

## B. Merged branches NOT checked out in any worktree — directly deletable

36 branches are fully in `origin/main` and bound to no worktree. The 6 `worktree-agent-*` stubs here are orphans: their original worktree dirs were re-pointed to renamed feature branches (e.g. dir `agent-a84685068567e36ed` now holds `claude/oob-source-attribution`), leaving the stub branch dangling and merged.

**codex/* merged stubs (confirm Codex closure first):**
```
codex/baseline-artifact-ownership
codex/baseline-artifact-ownership-2
codex/diagnostics-output-artifact-doc-closeout
codex/diagnostics-output-artifact-owner
codex/displacement-aggregate-contract
codex/displacement-ci-fixture-repair
codex/displacement-event-log-contract
codex/displacement-operational-contract
codex/displacement-v18-schema-contract
codex/event-bookkeeping-schema-contract
codex/event-decision-log-schema-contract
codex/game-state-schema-contract
codex/h24-sweep-ownership
codex/latest-run-final-save-owner
codex/latest-run-final-save-ownership
codex/political-war-substrate-schema-contract
codex/presidential-desk-flow
codex/replay-sidecar-ownership
codex/save-drift-byte-identity
codex/save-migration-drift-artifact-owner
codex/save-replay-artifact-stability
codex/sector-current-profile
codex/sector-next-target-profile
codex/sector-truth-byte-identity
codex/sector-truth-reconciliation-plan
codex/startup-snapshot-artifact-ownership
codex/v18-state-test-fixture-hotfix
codex/v19-civilian-casualties-required
codex/v20-phantoms-spawned-contract
```

**claude/* + orphan worktree-agent stubs (lowest risk — all merged, none Codex-owned, none checked out):**
```
claude/calibration-historical-army-arc-2026-05-24
worktree-agent-a84685068567e36ed
worktree-agent-aa1990803c1fc2462
worktree-agent-aaef1ade22a0e8505
worktree-agent-abd7cb90a11ff783a
worktree-agent-ad531427addce2a7e
worktree-agent-aeff0a7f51bc6016b
```

---

## C. UNMERGED — PRESERVE (work would be LOST if pruned)

**113 branches carry unique commits.** Do NOT delete any of these. The full set = every branch with ahead>0 (see Appendix). Below are the high-value ones whose loss would be most damaging, with their unique commits.

### `codex/roadmap-noncalibration-2026-05-22` — 138 ahead (HIGHEST RISK)
Long-lived divergent branch (also 137 behind). Real i18n localization work present beyond the merge commits:
```
64a8096a ui(i18n): localize operations planning parameters
5fe48b7e ui(i18n): localize convoy decision chrome
87337fe2 ui(i18n): localize war summary situation chrome
... (+ repeated merge commits folding origin/main)
```
→ **PRESERVE. Needs a human rebase/merge decision, not a prune.**

### `codex/standing-og-phase-c` — 25 ahead
```
8b3d3eb3 fix(ci): reconcile standing og baseline proof
b76bac5d fix(engine): close standing-og final sector seal
eafd1ec3 fix(engine): align standing-og readiness and ozren home
8f1cfecd fix(engine): split shared-sector defense prediction cap
4cb5b640 fix(engine): floor fixed-home standing og morale
3801f1e2 fix(engine): apply shared defender aftermath
... (+19 more — engine work, calibration-touching)
```

### `worktree-agent-ab59e5061b28ba63c` — 7 ahead
```
f104ce58 fix(ui): defer Dayton negotiation modal while booted to Main Menu (#80)
cf922383 fix(ui): defer auto-pop gameplay modals while booted to Main Menu (#80)
6e942640 fix(ui): route ?shellHandoff deep-links to the game shell (#80)
22295874 fix(ui): deep-link packaged desktop_window child windows to game shell (#80)
69580aac fix(ui): preserve campaign on picker cancel (#80, #138)
19851a28 fix(ui): New Game / Load reach faction picker even with a save loaded (#80, #138)
```

### `claude/prebake-placement-and-rehome-idempotency` — 6 ahead
```
678c43e6 docs(handoff): Standing OG Defensive Model packet for Codex
76eaa39f docs(adr): fold Pyrrhic panel into ADR-0007
48f6e9c7 docs(adr): rewrite ADR-0007 → Standing OG Defensive Model
8228b7e1 calib: re-floor 40w/52w for the 712th Turbe placement fix
30dd188b docs(adr): ADR-0007 (DRAFT) persistent standing-OG membership
8dab69a9 fix(oob): home the 712th Mountain at Turbe, not a phantom OSID (#80-followup)
```

### `claude/free-war-phase1a2-2026-06-01` — 4 ahead
```
79111bf3 Free War Slice B: emergent mission garrison-budget responds to boosted weight
f3776174 test(free-war): bump pinned effective-weight expectation for Slice A.3
a2568c24 feat(bot): Free War Phase 1 Slice A.3 — K_LOSS 0.45 / HI 4.00
97101060 feat(bot): Free War Phase 1 Slice A.2 — strengthen territory-trend coefficients
```

### `codex/standing-og-phase-c-flagon-eval` — 4 ahead
```
70c5f1d3 test(engine): add standing og health invariant
5eca5ce3 docs: record phase c baseline proof
f8505f07 feat(engine): scaffold shared sector defense fatigue
4613d2b9 docs: add standing og defensive model adr
```

### Remaining PRESERVE branches (all carry unique work; ahead 1–2)
`feat/patron-defiance-receipt-slice4a`, `claude/author-op-slice23`, `claude/patron-relations-panel`,
`claude/request-op-lever`, `i18n-car-1-desk-shell-decision-modals`, `codex/docs-catchup-20260530`,
`codex/state-meta-decision-mode-contract`, `codex/sector-perf-*`, `fix/free-war-verdict-breakdown-fresh-atrocity`,
plus every `worktree-agent-*` with ahead≥1 and every other `claude/*`/`codex/*` lever/slice branch. **All PRESERVE.**

> The full 113-branch unmerged set = every branch in the Appendix table (and unattached branches) with `ahead > 0`. None are deletion candidates.

---

## D. DO-NOT-TOUCH (Codex-active / live worktrees)

- **`main`** @ `2f6daf18` — primary worktree `F:/A-War-Without-Victory`, Codex's active branch. NEVER touch.
- **Every `codex/*` branch** — Codex-owned. The merged ones in §A/§B are *candidates* but require confirming no live Codex session before removal.
- **Every branch currently checked out in a live worktree** — a checked-out branch cannot be `git branch -d`'d until its worktree is removed first. Covers all ~70 active worktrees.
- **`.worktrees/standing-og-phase-c-188w-validation-b`** — detached HEAD @ `8d1f2f20`; no branch, live validation worktree. Leave it.
- **This auditor's worktree** `agent-af1e5553ed325930d`.

---

## E. SAFE, COPY-PASTEABLE PRUNE PLAN (OWNER runs after review)

> Run from the **primary** worktree `F:/A-War-Without-Victory`. PowerShell.
> Windows file-lock caveat: `git worktree remove` can hit `Permission denied` if an editor/agent holds the dir. If so, close holders and run `git worktree prune` to clean stale records, then delete the dir manually and `git worktree prune` again.

### E1. SAFE NOW — remove merged worktrees (non-codex, not the auditor's)
```powershell
git worktree remove .claude/worktrees/agent-a436e10c1b45425bd
git worktree remove .claude/worktrees/agent-a8d307c6e8340e6a9
git worktree remove .claude/worktrees/agent-aa4210ac20b47596e
git worktree remove .worktrees/author-op
git worktree prune
```

### E2. SAFE NOW — delete merged branches not checked out (lowest-risk set)
```powershell
git branch -d claude/calibration-historical-army-arc-2026-05-24
git branch -d worktree-agent-a84685068567e36ed
git branch -d worktree-agent-aa1990803c1fc2462
git branch -d worktree-agent-aaef1ade22a0e8505
git branch -d worktree-agent-abd7cb90a11ff783a
git branch -d worktree-agent-ad531427addce2a7e
git branch -d worktree-agent-aeff0a7f51bc6016b
# After E1 removes the worktrees, their now-free merged stub branches:
git branch -d worktree-agent-a436e10c1b45425bd
git branch -d worktree-agent-a8d307c6e8340e6a9
git branch -d worktree-agent-aa4210ac20b47596e
git branch -d claude/author-new-op-2026-06-01
```
(`git branch -d` is the SAFE variant — it REFUSES to delete anything not fully merged. Never use `-D` here.)

### E3. VERIFY-FIRST (codex/ merged — confirm Codex has no live session)
```powershell
# Worktrees (remove only after confirming closure):
git worktree remove .worktrees/issue-170-phase-e-off-skip-2
git worktree remove F:/AWWV-formation-spawn-directive
git worktree remove F:/AWWV-review-cache-fingerprints
git worktree prune
# Then the 28 codex/* merged stub branches from §B (each is -d safe):
git branch -d codex/baseline-artifact-ownership
git branch -d codex/baseline-artifact-ownership-2
git branch -d codex/diagnostics-output-artifact-doc-closeout
# ... (remaining codex/* from §B, all -d safe)
```

### E4. DO NOT RUN — unmerged (would lose work)
Every branch in §C. Especially:
```
# DO NOT: git branch -D codex/roadmap-noncalibration-2026-05-22   # 138 unique commits
# DO NOT: git branch -D codex/standing-og-phase-c                 # 25 unique commits
# DO NOT delete any branch with ahead>0.
```

---

## Appendix — full worktree → branch → status map

| Worktree | Branch | ahead | Status |
|---|---|---|---|
| `F:/A-War-Without-Victory` (PRIMARY) | `main` | 0 | CODEX-ACTIVE — do not touch |
| `.claude/worktrees/agent-a027b7dc...` | `worktree-agent-a027b7dc...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a3a47538...` | `worktree-agent-a3a47538...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-a436e10c...` | `worktree-agent-a436e10c...` | 0 | MERGED — remove (E1) |
| `.claude/worktrees/agent-a5be10ea...` | `worktree-agent-a5be10ea...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a5ccc74d...` | `worktree-agent-a5ccc74d...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a61f3561...` | `worktree-agent-a61f3561...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a628f1da...` | `worktree-agent-a628f1da...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a6673229...` | `worktree-agent-a6673229...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-a6944421...` | `worktree-agent-a6944421...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-a7d12826...` | `worktree-agent-a7d12826...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a8468506...` | `claude/oob-source-attribution` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-a8d307c6...` | `worktree-agent-a8d307c6...` | 0 | MERGED — remove (E1) |
| `.claude/worktrees/agent-aa199080...` | `refactor/merge-eventlog-into-authored-choices` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-aa3b270d...` | `worktree-agent-aa3b270d...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-aa4210ac...` | `worktree-agent-aa4210ac...` | 0 | MERGED — remove (E1) |
| `.claude/worktrees/agent-aae9c5e9...` | `worktree-agent-aae9c5e9...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-aaef1ade...` | `codex/batch-g-faction-corps-slug-closeout` | 1 | UNMERGED — preserve (codex) |
| `.claude/worktrees/agent-ab4cb0e9...` | `worktree-agent-ab4cb0e9...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-ab580d55...` | `worktree-agent-ab580d55...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-ab59e506...` | `worktree-agent-ab59e506...` | 7 | UNMERGED — preserve (UI #80) |
| `.claude/worktrees/agent-ab622e0a...` | `worktree-agent-ab622e0a...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-abd7cb90...` | `i18n-car-1-desk-shell-decision-modals` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-ac0f9ae1...` | `worktree-agent-ac0f9ae1...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-ac3d7080...` | `worktree-agent-ac3d7080...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-ad1b0af3...` | `worktree-agent-ad1b0af3...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-ad22f09c...` | `worktree-agent-ad22f09c...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-ad531427...` | `claude/patron-relations-panel` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-ad71b5cd...` | `worktree-agent-ad71b5cd...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-adb3c483...` | `worktree-agent-adb3c483...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-ae0f77a9...` | `worktree-agent-ae0f77a9...` | 2 | UNMERGED — preserve |
| `.claude/worktrees/agent-ae3ddf9d...` | `worktree-agent-ae3ddf9d...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-af1e5553...` | `worktree-agent-af1e5553...` | 0 | MERGED — **AUDITOR'S OWN, do not remove** |
| `.claude/worktrees/agent-af7aa47f...` | `worktree-agent-af7aa47f...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-afb14809...` | `worktree-agent-afb14809...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-afe9901b...` | `worktree-agent-afe9901b...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-aff0e8ec...` | `worktree-agent-aff0e8ec...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/agent-aff881ab...` | `worktree-agent-aff881ab...` | 1 | UNMERGED — preserve |
| `.claude/worktrees/patron-defiance-receipt` | `feat/patron-defiance-receipt-slice4a` | 2 | UNMERGED — preserve |
| `.worktrees/_docscatch` | `codex/docs-catchup-20260530` | 2 | UNMERGED — preserve (codex) |
| `.worktrees/author-op` | `claude/author-new-op-2026-06-01` | 0 | MERGED — remove (E1) |
| `.worktrees/author-op-s1` | `claude/author-op-slice1` | 1 | UNMERGED — preserve |
| `.worktrees/author-op-s23` | `claude/author-op-slice23` | 2 | UNMERGED — preserve |
| `.worktrees/authorop-p2` | `claude/authorop-codex-p2` | 1 | UNMERGED — preserve |
| `.worktrees/cmd-cards` | `claude/command-surface-cards` | 1 | UNMERGED — preserve |
| `.worktrees/dist-cqfix` | `claude/dist-history-consequences-fix-2026-06-01` | 1 | UNMERGED — preserve |
| `.worktrees/elite-deploy` | `claude/elite-deploy-lever` | 1 | UNMERGED — preserve |
| `.worktrees/free-war-p1b` | `claude/free-war-phase1a2-2026-06-01` | 4 | UNMERGED — preserve |
| `.worktrees/front-visit` | `claude/front-visit-action` | 1 | UNMERGED — preserve |
| `.worktrees/issue-170-phase-e-off-skip-2` | `codex/issue-170-phase-e-off-skip-2` | 0 | MERGED — remove (E3, codex) |
| `.worktrees/patron-supply` | `claude/patron-supply-defiance` | 1 | UNMERGED — preserve |
| `.worktrees/prebake` | `claude/prebake-placement-and-rehome-idempotency` | 6 | UNMERGED — preserve |
| `.worktrees/pushback` | `claude/force-op-pushback` | 1 | UNMERGED — preserve |
| `.worktrees/pushback-p2` | `claude/pushback-codex-p2` | 1 | UNMERGED — preserve |
| `.worktrees/replace-co` | `claude/replace-co-lever` | 1 | UNMERGED — preserve |
| `.worktrees/request-op` | `claude/request-op-lever` | 2 | UNMERGED — preserve |
| `.worktrees/sector-frontline-profile` | `codex/sector-frontline-profile` | 1 | UNMERGED — preserve (codex) |
| `.worktrees/standing-og-defensive-docs` | `codex/standing-og-defensive-docs` | 1 | UNMERGED — preserve (codex) |
| `.worktrees/standing-og-phase-c` | `codex/standing-og-phase-c` | 25 | UNMERGED — preserve (codex) |
| `.worktrees/standing-og-phase-c-188w-validation-b` | (detached `8d1f2f20`) | — | DETACHED — leave |
| `.worktrees/standing-og-phase-c-flagon-eval` | `codex/standing-og-phase-c-flagon-eval` | 4 | UNMERGED — preserve (codex) |
| `.worktrees/state-meta-decision-mode-contract` | `codex/state-meta-decision-mode-contract` | 2 | UNMERGED — preserve (codex) |
| `.worktrees/stop-op` | `claude/stop-op-lever` | 1 | UNMERGED — preserve |
| `.worktrees/stopop-p2` | `claude/stopop-codex-p2` | 1 | UNMERGED — preserve |
| `.worktrees/worktree-typecheck-deps` | `codex/worktree-typecheck-deps` | 1 | UNMERGED — preserve (codex) |
| `F:/AWWV-ahmici-hostile-threshold` | `codex/issue-170-ahmici-hostile-threshold` | 1 | UNMERGED — preserve (codex) |
| `F:/AWWV-ahmici-same-turn-followup` | `codex/ahmici-same-turn-hostile-followup` | 1 | UNMERGED — preserve (codex) |
| `F:/AWWV-chain3-flags` | `codex/issue-170-chain3-flags` | 1 | UNMERGED — preserve (codex) |
| `F:/AWWV-codex-roadmap` | `codex/roadmap-noncalibration-2026-05-22` | 138 | UNMERGED — **PRESERVE (highest risk, codex)** |
| `F:/AWWV-formation-spawn-directive` | `codex/formation-spawn-directive-validate` | 0 | MERGED — remove (E3, codex) |
| `F:/AWWV-review-cache-fingerprints` | `codex/review-cache-fingerprints` | 0 | MERGED — remove (E3, codex) |
| `F:/AWWV-save-migration-fixture-ownership` | `codex/save-migration-fixture-ownership` | 1 | UNMERGED — preserve (codex) |
| `F:/AWWV-sector-zero-assigned` | `codex/issue-170-bilateral-flip-mun-fallback` | 1 | UNMERGED — preserve (codex) |

*(Local branches without a worktree are covered in §B (merged) and §C (unmerged); the 113-unmerged set = every branch with ahead>0.)*
