# 188w Endgame Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-generate the 188-week endgame `final_save.json` (garbage-collected since n1741) and use it to answer the four pending probes from `CONSOLIDATED_BACKLOG` §16: Sarajevo casualty-ratio railroad check, four-P0 endgame-latency re-verification, `patron_pressure` field-presence probe, and late-war force-quality shape (HRHB activity, RS/HRHB personnel growth, fatigue distribution).

**Architecture:** This is a *verification* plan only. No simulation behavior changes. New tooling is read-only diagnostics that consume `final_save.json` and emit sorted, deterministic tables. All four probes write a single evidence report under `docs/40_reports/audits/`. Fixes for anything discovered are out of scope and become follow-on plans.

**Tech Stack:** Node.js diagnostics (`*.cjs`) consuming `final_save.json`, existing scenario runner (`npm run sim:scenario:run`), 12 GB heap (`NODE_OPTIONS=--max-old-space-size=12288` per napkin), CONSOLIDATED_BACKLOG update.

---

## Scope

**In scope:**
- Reproducible 188w run with deterministic hash compared against n1741 baseline (`a4bf8b8095050881`).
- New read-only diagnostic: Sarajevo vs Mostar vs Banja Luka casualty-ratio comparison.
- Four-P0 latent-status re-verification at endgame (NATO `patron_pressure` NaN, multi-brigade `corps_command` fallback, `state.political` discard, casualty-faction cast) — each as a deterministic check against `final_save.json`.
- `patron_pressure` field-presence probe (absent / zero / populated bucketing per faction).
- Force-quality late-war shape via existing `force_quality_trajectory.cjs` and `reconstitution_188w_checkpoints.cjs`.
- Single evidence report aggregating all findings.
- Single-row update to `CONSOLIDATED_BACKLOG.md` §16.

**Out of scope:**
- Any fix for anomalies discovered (Sarajevo railroad, latent→active P0, missing patron_pressure system, HRHB inactivity). Each becomes a follow-on plan.
- MASTER_ROADMAP, PROJECT_LEDGER, or any other plan-file edits.
- Touching or recreating the deleted superseded 188w stub.
- Behavior changes to `src/sim/**`, `src/state/**`, or scenarios.

## Files

**Created (read-only diagnostics + evidence):**
- `tools/diagnostics/sarajevo_casualty_railroad.cjs` — new diagnostic comparing Sarajevo vs Mostar vs Banja Luka attacker/defender casualty ratios.
- `tools/diagnostics/patron_pressure_probe.cjs` — new diagnostic dumping `state.political.patron_pressure` per faction, bucketed `absent` / `zero` / `present`.
- `tools/diagnostics/p0_latent_recheck.cjs` — new diagnostic asserting all four P0s remain LATENT at endgame.
- `docs/40_reports/audits/20260517_ENDGAME_188W_VERIFICATION.md` — single aggregated evidence report.

**Reused (verified to exist):**
- `tools/diagnostics/force_quality_trajectory.cjs`
- `tools/diagnostics/reconstitution_188w_checkpoints.cjs`

**Read-only references:**
- `data/scenarios/apr1992_definitive_188w.json` (canonical scenario path, verified).
- `docs/40_reports/audits/20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md` (source of four P0 definitions).
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` §16 (single row update).

## Task 1: Fresh 188w Run

**Command (Windows PowerShell, single line; 12 GB heap is mandatory per napkin):**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=12288'; npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs
```

**Steps:**
1. Verify scenario path exists: `data/scenarios/apr1992_definitive_188w.json`.
2. Run the command above from clean `main` (`git status` clean).
3. Record run directory under `runs/<timestamp>-<scenario>/`, command line, final hash, final-save size (MB), elapsed time, anchor count, benchmark count, §6 floors status.
4. Paste all of the above into the evidence report under "Run Manifest".

**Acceptance:**
- A `final_save.json` exists at the recorded run directory.
- Run manifest captured in evidence report.

## Task 2: Hash / Anchor / Benchmark / Size Compare vs n1741

**Baseline (frozen):** n1741 hash `a4bf8b8095050881`, 188w, 26/27 anchors, 6/6 benchmarks, §6 floors PASS, 6.84 MB.

**Steps:**
1. Read hash from new run's scenario summary / artifact manifest.
2. Diff against n1741: hash, anchor count (and the failing-anchor identity), benchmark count, §6 floors PASS/FAIL, final-save size delta.
3. Tabulate in the evidence report under "Baseline Comparison".

**Acceptance:**
- If hash matches n1741: baseline confirmed; proceed.
- If hash drifts on identical scenario config: **STOP GATE** — determinism regression. Halt all downstream tasks, file the drift in the evidence report, escalate to user.

## Task 3: Sarajevo Casualty Railroad Probe

**Files:**
- Create: `tools/diagnostics/sarajevo_casualty_railroad.cjs`

**Diagnostic contract:**
- Reads `final_save.json`.
- Computes per-OSID attacker-vs-defender casualty totals (lifetime, from event log or accumulated combat history fields — verify the field locations against `src/state/game_state.ts` before writing).
- Restricts to Sarajevo OSIDs, Mostar OSIDs, Banja Luka OSIDs (resolve via municipality → OSID map).
- Emits a sorted table: `osid | municipality | attacker_casualties | defender_casualties | ratio (att/def) | n_battles`.
- Sort key: `(municipality, osid)` ascending — deterministic.
- Compares city-level ratios: Sarajevo vs Mostar vs Banja Luka.

**Steps:**
1. Write the diagnostic with deterministic sort and no `Math.random`/`Date.now`.
2. Run against the new run's `final_save.json`.
3. Paste the full table and the city-level summary into the evidence report under "Sarajevo Railroad Probe".
4. Decision rule:
   - Ratios within ±20% across all three cities: **no railroad signal.**
   - Sarajevo ratio is a clear outlier (>2× either of the others or inverted): **STOP GATE** — Sarajevo railroad confirmed by casualty-ratio outlier. File evidence; do not propose fixes (out of scope).

**Acceptance:** Diagnostic emits a deterministic table; decision recorded.

## Task 4: Four-P0 Endgame Latency Re-verification

**Files:**
- Create: `tools/diagnostics/p0_latent_recheck.cjs`

**P0s to verify latent (per `20260517_STRUCTURAL_DEFECT_AUDIT_AND_VERIFICATION.md`):**
1. NATO `patron_pressure` NaN propagation through `getYearForTurn` (was LATENT at n1741 because `patron_pressure` absent from serialized state).
2. Multi-brigade attacks lose 50% pressure when `corps_command` undefined (was LATENT — `state.military.corps_command` populated for all 19 corps).
3. Settlement flips discarded when `state.political` undefined (was LATENT — `state.political` consistently defined).
4. Casualty-faction cast (per audit — confirm field name and check from §6 of the audit doc before writing the assertion).

**Diagnostic contract:**
- Loads `final_save.json`.
- For each P0, runs the deterministic existence/shape check and emits `P0_n | description | endgame_status (LATENT|ACTIVE) | evidence_field | evidence_value`.
- Exits non-zero if any P0 flipped LATENT → ACTIVE.

**Steps:**
1. Read the four exact field paths from the audit doc before coding (avoid drift).
2. Implement each check as a single boolean against `final_save.json`.
3. Run against the new run.
4. Paste the table into the evidence report under "Four-P0 Endgame Latency".
5. **STOP GATE:** if any P0 flips LATENT → ACTIVE at 188w, halt and escalate (this is the second stop gate).

**Acceptance:** All four P0s remain LATENT or the stop gate triggers.

## Task 5: `patron_pressure` Field-Presence Probe

**Files:**
- Create: `tools/diagnostics/patron_pressure_probe.cjs`

**Diagnostic contract:**
- Loads `final_save.json`.
- Walks `state.political` (and any sibling location where `patron_pressure` could live — grep `src/state` and `src/sim` first to confirm there is no other home).
- Per faction (`RBiH`, `RS`, `HRHB`), bucket the field as `absent` (not present), `zero` (present but 0), `present` (non-zero).
- Emits a 3-row table: `faction | bucket | value`.
- Notes whether the patron-pressure *system* runs at all (any non-zero seen across the whole save).

**Steps:**
1. Read field name from `src/sim/**` and `src/state/**` (one Grep pass).
2. Implement the bucket walk.
3. Run against new save.
4. Paste table + conclusion into the evidence report under "Patron Pressure Probe". Two conclusions are valid: (a) field is recomputed per-turn without persistence (fine), (b) system never runs (different bug — file as follow-on).

**Acceptance:** Table emitted; one of the two conclusions recorded.

## Task 6: Force-Quality Late-War Shape

**Verified existing diagnostics (no new code):**
- `tools/diagnostics/force_quality_trajectory.cjs`
- `tools/diagnostics/reconstitution_188w_checkpoints.cjs`

**Steps:**
1. Run both diagnostics against the new run directory.
2. From `force_quality_trajectory.cjs`, extract late-war (turn ≥ 120) trends per faction: HRHB attack-event count, RS/HRHB personnel growth, fatigue distribution percentiles.
3. From `reconstitution_188w_checkpoints.cjs`, capture the checkpoint snapshots at apr1994, apr1995, oct1995.
4. Paste both outputs into the evidence report under "Force-Quality Late-War Shape".
5. Flag (not fix) anything visibly off: HRHB combat-inactive at endgame, RS/HRHB personnel growing despite attrition, fatigue distribution clipped.

**Acceptance:** Both diagnostics run; trends summarized in evidence report.

## Task 7: Evidence Report

**File:** `docs/40_reports/audits/20260517_ENDGAME_188W_VERIFICATION.md`

**Sections (mandatory order):**
1. Run Manifest (command, run-dir, hash, anchors, benchmarks, §6, size, elapsed).
2. Baseline Comparison vs n1741.
3. Sarajevo Railroad Probe (table + decision).
4. Four-P0 Endgame Latency (table + per-P0 evidence path).
5. Patron Pressure Probe (table + conclusion).
6. Force-Quality Late-War Shape (trajectory + checkpoint excerpts).
7. Findings Summary (one bullet per probe: PASS / SIGNAL / STOP-GATE).
8. Follow-on Work (list each discovered anomaly as a future plan; do not attempt fixes here).

**Acceptance:** All seven sections present; every section cites the exact run directory and diagnostic invocation it came from.

## Task 8: Backlog Row Update

**File:** `docs/40_reports/CONSOLIDATED_BACKLOG.md`

**Edit:** Update only the §16 row for "188w endgame verification" if it still points at the deleted superseded stub. After this plan executes, the row points to the evidence report and notes the run hash + final status. Do **not** edit any other row.

**Acceptance:** Single-line diff to the §16 row; rest of the file untouched.

## Verification

```powershell
npm.cmd run typecheck
$env:NODE_OPTIONS='--max-old-space-size=12288'; npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs
node tools\diagnostics\sarajevo_casualty_railroad.cjs <run-dir>\final_save.json
node tools\diagnostics\p0_latent_recheck.cjs <run-dir>\final_save.json
node tools\diagnostics\patron_pressure_probe.cjs <run-dir>\final_save.json
node tools\diagnostics\force_quality_trajectory.cjs <run-dir>
node tools\diagnostics\reconstitution_188w_checkpoints.cjs <run-dir>
```

Determinism statement: this plan adds only read-only `*.cjs` diagnostics and one Markdown evidence report. No sim/state/scenario file is touched. Hash must equal n1741 (`a4bf8b8095050881`) on identical scenario config; any drift is a stop gate.

## Stop Gates

1. **Determinism regression:** new run hash ≠ n1741 on identical scenario config → halt, file, escalate.
2. **P0 flip:** any of the four P0s flips LATENT → ACTIVE at 188w → halt, file, escalate; do not proceed to follow-on tasks.
3. **Sarajevo railroad confirmed:** Sarajevo casualty-ratio outlier vs Mostar/Banja Luka beyond ±20% threshold → halt, file evidence, do **not** propose fixes (follow-on plan).

## Out of Scope (explicit)

- Any code change that alters scenario outputs.
- Fixes to railroad, patron-pressure, HRHB inactivity, or P0s that flip — each becomes a separate plan.
- Updates to `docs/plans/MASTER_ROADMAP.md`, `docs/PROJECT_LEDGER.md`, the sibling stub plan, or git index.
- Committing anything (the user stages and commits).

## Closeout

- Stage only the three new diagnostic `.cjs` files, the evidence report, and the single-line `CONSOLIDATED_BACKLOG.md` §16 edit.
- Report final status: ACCEPTED-BASELINE / ACCEPTED-WITH-SIGNALS / BLOCKED with exact evidence paths.
