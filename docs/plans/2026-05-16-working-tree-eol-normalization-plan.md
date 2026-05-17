# Working-Tree EOL Normalization Plan

**Date:** 2026-05-16
**Lane:** Studio Health / Repo Truth (Permanent Side Lane)
**Status:** Proposed
**Source:** `CODE_AUDIT_2026-05-16.md` — Findings 1 + 4
**Companion docs:** `GUI_PLAYTEST_2026-05-16.md` (downstream symptom: HMR cascade)

---

## Problem

Local Windows working trees have **~311 files with mixed CRLF + LF line endings inside the same file** (per `git ls-files --eol` reporting `w/mixed`). The git index is clean LF (so CI passes), but on disk the files are hybrid.

Confirmed downstream effects:

1. **`npx tsc --noEmit` reports 30+ phantom parse errors** in `src/ui/map/` and related — unclosed JSX tags, unterminated strings, missing braces — even though `file_path` opens of the same files show valid TypeScript at the reported lines. The errors are EOL artifacts, not real syntax bugs.
2. **Vite HMR cascade failure observed during the 2026-05-16 GUI playtest.** Twelve+ components (`PresidentialInbox.tsx`, `PresidentialToolbar.tsx`, `App.tsx`, `MapContainer.tsx`, `PeaceStatusPanel.tsx`, `TurnAftermathRecordsPanel.tsx`, `WarSummaryContent.tsx`, `AdvanceTurnModal.tsx`, `FormationDetail.tsx`, `PresidentialDecisionRoomPanel.tsx`, `WarroomStatusBar.tsx`, …) failed to hot-reload simultaneously, blanking the tactical map to a cream-colored base layer. Five of those file names are direct matches with the tsc phantom-error list. The rest are downstream import failures.
3. **Canon docs are affected** (`docs/10_canon/Game_Bible_v0_9_0.md`, `docs/10_canon/Systems_Manual_v0_9_0.md`, `docs/10_canon/War_Specification_v0_9_0.md`, `docs/20_engineering/CODE_CANON.md`, several more). Any diff a human reviewer reads against these is polluted with EOL noise, hiding real changes.
4. **Determinism / calibration tests are affected** (`tests/artifact_determinism.test.ts`, `tests/audit_state_of_game_determinism.test.ts`, `tests/calibration.test.ts`, `tests/bot_orders_perf_profile.test.ts`). The smoke-test triad guarded by CLAUDE.md is the wrong gate to be running on a polluted working tree.

## Why this matters per the Studio Health / Repo Truth lane

The permanent side lane in `MASTER_ROADMAP.md` lists four principles:

- *"Every lane or milestone close must leave one coherent story across code, roadmap, architect board, report, and ledger."*
- *"Build warnings, generated artifacts, and calibration claims must have explicit disposition or retention rules."*
- *"Reports are evidence, not competing planning authorities."*
- *"Chat-memory-only decisions are not durable decisions."*

A working tree where `tsc --noEmit` spuriously fails on parse errors, where Vite cascades on innocent edits, and where canon doc diffs are noise-dominated violates all four. The mixed-EOL state is the kind of low-grade entropy that erodes truth across the studio without ever being the explicit subject of a PR.

## Scope

### What's affected

Per-directory `w/mixed` count, as of 2026-05-16:

| Directory | Files | Notes |
|---|---|---|
| `tests/` | 98 | Includes determinism + calibration tests |
| `docs/` | 62 | Includes canon: Game Bible, Systems Manual, War Spec, CODE_CANON, MAP_UI_MASTER, etc. |
| `src/ui/map/` | 40 | Includes the components that cascaded in HMR |
| `src/sim/` | 34 | Includes `combat_math.ts`, `combat_predictor.ts`, `bot_corps_*.ts` |
| `scripts/` | 26 | |
| `tools/` | 20 | |
| `src/state/` | 10 | |
| `src/desktop/` | 4 | |
| `src/scenario/`, `src/validate/`, `src/map/`, `data/`, `.claude/` | 2 each | |
| `src/_archived/` | 1 | |
| **Total** | **~311** | |

### What's clean (model for what "compliant" looks like)

`src/cli/`, `src/turn/`, `src/utils/`, `src/data/`, `src/data_prereq/`, `src/shared/`, `src/docs/`, and `.github/` are all 0/0. Whatever convention is in force there is the target end state for the whole tree.

## Approach

Two-part fix. Part A prevents recurrence (commit once, stays). Part B heals the existing damage (commit once, done).

### Part A — `.gitattributes` upgrade

Replace the current single-line policy:

```
* text=auto
data/derived/startup/*.json text eol=lf
*.pmtiles filter=lfs diff=lfs merge=lfs -text
*.osm.pbf filter=lfs diff=lfs merge=lfs -text
```

with explicit per-extension `eol=lf` rules for every source format:

```
* text=auto

# Source code — always LF in working tree, regardless of OS
*.ts   text eol=lf
*.tsx  text eol=lf
*.js   text eol=lf
*.jsx  text eol=lf
*.cjs  text eol=lf
*.mjs  text eol=lf

# Data and config — LF
*.json text eol=lf
*.yml  text eol=lf
*.yaml text eol=lf

# Docs — LF
*.md   text eol=lf

# Web assets — LF
*.css  text eol=lf
*.html text eol=lf

# Shell — LF
*.sh   text eol=lf

# Existing rules retained
data/derived/startup/*.json text eol=lf
*.pmtiles filter=lfs diff=lfs merge=lfs -text
*.osm.pbf filter=lfs diff=lfs merge=lfs -text
```

Add `.editorconfig` at repo root (belt-and-suspenders for editors that don't read `.gitattributes`):

```ini
root = true

[*]
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{md,csv,tsv}]
trim_trailing_whitespace = false
```

### Part B — Heal the working tree

After Part A is committed:

```sh
git add --renormalize .
git commit -m "chore(eol): renormalize working tree per upgraded .gitattributes"
```

`git add --renormalize` re-runs the attribute filters on every tracked file. Since the index is already LF, no diff is staged — but the working tree is rewritten with normalized EOLs. On Windows, follow with:

```sh
git rm -rf --cached .
git reset --hard
```

to force a clean recheckout under the new attributes.

### Part C — CI guard (optional but cheap)

Add a CI check that future drift is caught:

```yaml
# .github/workflows/eol-guard.yml
name: EOL guard
on: [push, pull_request]
jobs:
  eol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          mixed=$(git ls-files --eol | awk '$2=="w/mixed"' | wc -l)
          if [ "$mixed" -gt 0 ]; then
            echo "::error::$mixed files have mixed CRLF/LF line endings"
            git ls-files --eol | awk '$2=="w/mixed"{print $4}' | head -50
            exit 1
          fi
```

This is ungated on Linux runners (which won't ever produce mixed-EOL working trees themselves), so it serves purely as a regression sentinel for any future contributor whose editor saves CRLF without renormalizing.

## Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| AC-1 | `.gitattributes` upgraded with per-extension `eol=lf` rules | File diff in PR |
| AC-2 | `.editorconfig` present at repo root | File present |
| AC-3 | `git ls-files --eol \| awk '$2=="w/mixed"' \| wc -l` returns `0` | One bash command |
| AC-4 | `npx tsc --noEmit -p tsconfig.json` returns clean (no phantom parse errors in `src/ui/map/`) | Run locally on Windows after PR merge |
| AC-5 | `npx tsc --noEmit -p src/ui/map/tsconfig.json` returns clean | Same |
| AC-6 | 40w calibration baseline hash unchanged after PR | Run `npm run sim:scenario:run:40w -- --unique --out runs` ; compare final_save hash to `n1740` `86ebf26ae0271465` |
| AC-7 | `npm run test:vitest` passes | Standard run |
| AC-8 | `npm run desktop:map:build` passes | Standard run |
| AC-9 | CI EOL guard (if Part C taken) passes on the renormalize commit and fails on a deliberately-CRLF'd test file | Manual test |

## Risk and rollback

### Risks

- **Renormalize commit can look enormous** in diff viewers that don't ignore whitespace. The commit message must clearly say "no content change, EOL normalization only." `git diff --ignore-cr-at-eol` and `git diff -w` on the commit should show empty.
- **Active branches will need to rebase / merge.** Anyone with a long-lived feature branch will hit conflicts that are pure EOL. Mitigation: do this when feature-branch activity is low, communicate ahead of time, and rebase strategy is `git rebase main -X theirs` (since main's EOL is now canonical).
- **Determinism baselines.** No simulation behavior should change because LF-vs-CRLF is post-write detail. AC-6 protects against this — if the 40w hash drifts, something we don't understand is happening and we revert.

### Rollback

```sh
git revert <renormalize-commit>
git revert <gitattributes-commit>
```

is safe at any point. Working tree returns to current state (mixed EOLs) on next checkout. No data loss.

## Out of scope for this plan

- **Auto-formatting beyond EOL** (e.g. trailing whitespace, indentation). The `.editorconfig` declares those rules but this plan does not run prettier or eslint --fix. Those are separate lanes.
- **Renaming or restructuring files.** Pure mechanical EOL normalize only.
- **Performance baselines.** This plan should not move any perf number. If it does, revert and investigate.

## Validation plan

Once PR is up:

1. Run `git ls-files --eol | awk '$2=="w/mixed" || $1=="i/-text"' | wc -l` — expect 0.
2. `npm run typecheck` — expect 0 errors.
3. `npm run test:vitest:fast` — expect green.
4. `npm run desktop:map:build` — expect green.
5. `npm run sim:scenario:run:40w -- --unique --out runs` — expect final_save hash matches `n1740` `86ebf26ae0271465`.
6. Open the dev server (`npm run desktop`), advance one turn, observe no HMR errors in console.

If all six pass, merge. If AC-6 fails, revert and investigate; the EOL change should be hash-stable by construction.

## Estimated effort

- Part A (`.gitattributes` + `.editorconfig`): 15 min draft + 30 min review
- Part B (renormalize): 5 min command + ~10 min waiting for CI
- Part C (CI guard): 30 min if desired, 0 min if deferred
- **Total:** 1–2 hours wall-clock, single PR, no scenario reruns required beyond the validation step

## Owner

Unassigned. Self-contained — any engineer with Windows + Linux access can run it. Recommend the same person doing the next routine repo-health pass.
