# Smoke Checklist and Scenario Run Report — 2026-02-20

**Purpose:** Record results of the smoke checklist (automated + manual), 20-week and 52-week apr1992_definitive_52w scenario runs, and provide recommendations.

**Scenario:** `data/scenarios/apr1992_definitive_52w.json` (April 1992 definitive; Phase II).

---

## 1. Smoke checklist

### 1.1 Automated (executed 2026-02-20)

| Item | Command | Result |
|------|--------|--------|
| TypeScript | `npx tsc --noEmit` | **PASS** |
| Unit tests | `npx vitest run` | **PASS** (11 files, 138 tests, ~2s) |
| Tactical map build | `npm run desktop:map:build` | **PASS** (Vite build ~2.4s; chunk size warning only) |

**Environment:** Windows PowerShell. Use `;` not `&&` for chaining commands (see napkin).

### 1.2 Manual desktop smoke (not executed in this session)

The following require launching the Electron app and interacting with the UI. Documented here for QA:

1. **Launch:** `npm run desktop` (builds map + sim + warroom, then launches Electron).
2. **War Map:** From warroom, open War Map; confirm map loads and shows control/front lines.
3. **Tactical map / 3D:** Open tactical map (optional companion or embedded); confirm 2D/2.5D/3D views and dataset selector (e.g. "Latest run" after a scenario run with `--map`).
4. **Sandbox:** If sandbox entry point exists, open it; confirm scenario/state load.
5. **3D panel:** Select a brigade; confirm reachable overlay; stage Deploy/Undeploy; stage multi-click move + confirm; advance turn; confirm state updates (per DESKTOP_GUI_IPC_CONTRACT: `game-state-updated`, `advance-turn`).

**Status:** **SKIP** (manual; not run in this session).

### 1.3 Smoke summary

- **Automated:** All three items passed.
- **Manual desktop:** Not run; use the steps above for pre-commit or release QA.

---

## 2. Scenario execution

### 2.1 Commands used

- **20w:**  
  `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 20 --unique --map --out runs`
- **52w:**  
  `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 52 --unique --map --out runs`

Both use preflight (`run_scenario_with_preflight.ts`) and the harness (`run_scenario.ts`). The `--map` flag copies the final state to `data/derived/latest_run_final_save.json` (overwritten by the last run, here 52w).

### 2.2 Run artifacts

| Run | Out dir | Final state hash | Wall time (approx) |
|-----|---------|-------------------|--------------------|
| 20w | `runs/apr1992_definitive_52w__08e0cea89bdf5835__w20_n14` | `1288f77600b95ed9` | ~2 min |
| 52w | `runs/apr1992_definitive_52w__102fea508092873d__w52_n15` | `2e42cec32c92b136` | ~4 min |

Key artifact paths (per run): `initial_save.json`, `final_save.json`, `run_summary.json`, `end_report.md`, `control_delta.json`, `activity_summary.json`, `control_events.jsonl`, `formation_delta.json`, `weekly_report.jsonl`, `replay.jsonl`.

---

## 3. Key metrics (from run_summary.json)

### 3.1 Anchor checks

- **20w:** 7/8 passed. **Failed:** `centar_sarajevo` (expected RBiH, actual RS).
- **52w:** Same: 7/8 passed; **centar_sarajevo** still RS (known issue; see convenes n10/n11).

### 3.2 Phase II attack resolution

| Metric | 20w | 52w |
|--------|-----|-----|
| Weeks with Phase II | 20 | 52 |
| Weeks with orders | 20 | 26 |
| Orders processed | 45 | 51 |
| Unique attack targets | 45 | 51 |
| Flips applied | 37 | 37 |
| Defender-absent battles | 45 | 51 |
| Defender-present battles | 0 | 0 |
| Casualty (attacker) | 264 | 276 |
| Casualty (defender) | 229 | 247 |

Observation: All resolved battles in both runs are defender-absent; no defender-present battles. Combat flips are concentrated in the first ~26 weeks; weeks 27–52 have zero attack orders in this run.

### 3.3 Historical alignment (vs reference jan1993)

| Controller | 20w final | 20w delta vs ref | 52w final | 52w delta vs ref |
|------------|-----------|------------------|-----------|-------------------|
| HRHB | 1018 | +62 | 1014 | +58 |
| RBiH | 2278 | +187 | 2286 | +195 |
| RS | 2526 | -249 | 2522 | -253 |

Settlement total 5822 in both; RS holds fewer settlements than reference in both runs; RBiH/HRHB more.

### 3.4 Formation and personnel (final)

| Faction | Brigades (active/total) | Personnel (final) |
|---------|--------------------------|------------------|
| HRHB | 28 / 28 | 23,355 |
| RBiH | 81 / 81 | 100,713 |
| RS | 67 / 67 | 55,501 (20w) / 55,647 (52w) |

Formation delta: +4 brigades (no removals) in both runs.

### 3.5 Civilian casualties (cumulative)

| Faction | 20w killed / fled_abroad | 52w killed / fled_abroad |
|---------|--------------------------|---------------------------|
| HRHB | 4,579 / 11,062 | 4,579 / 11,062 |
| RBiH | 30,166 / 0 | 30,166 / 0 |
| RS | 16,695 / 42,414 | 16,719 / 42,558 |

### 3.6 Bot benchmarks (52w only; 20w = not reached)

- Evaluated: 6; passed: 4; failed: 2.
- **Failed:** RBiH `hold_core_centers` (turn 26), RBiH `preserve_survival_corridors` (turn 52).
- **Passed:** HRHB secure_herzegovina_core, RS early_territorial_expansion, HRHB hold_central_bosnia_nodes, RS consolidate_gains.

### 3.7 Displacement (phase_ii_minority_flight / phase_ii_takeover_displacement)

- **20w:** minority_flight displaced_total 355,077; takeover_displacement displaced_total 175,897; camps_created 9; timers_matured 11.
- **52w:** minority_flight displaced_total 357,493; takeover_displacement same 175,897; camps_created 9; timers_matured 11 (takeover); weeks_with_activity 24 (minority) / 34 (takeover).

---

## 4. Determinism and regression

- Runs use `--unique` (monotonic counter run folders); no timestamps in saves (Engine Invariants).
- `run_summary.json` counts are integerized for stable regression (see napkin).
- No baseline comparison was run in this session; for regression, re-run the same commands and compare `final_state_hash` and key run_summary fields (e.g. flips_applied, anchor_checks, phase_ii_attack_resolution).

---

## 5. Recommendations

### 5.1 Immediate

1. **Desktop smoke:** Run the manual desktop smoke steps ( §1.2 ) before release or phase commit; optionally add a short “Desktop smoke” section to a pre-commit checklist (e.g. PIPELINE_ENTRYPOINTS or awwv-pre-commit-check).
2. **centar_sarajevo anchor:** Keep tracking per PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_19_n11 and any centar_sarajevo investigation; no new finding from this run.
3. **Defender-present battles:** Phase II attack resolution reported 0 defender-present battles in both runs; consider bot/garrison/AoR or battle-resolution review if historical or design intent expects defended battles (see DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18 if present).

### 5.2 Short term

4. **Determinism baseline:** Store a golden `final_state_hash` (and optionally key run_summary excerpts) for 20w and 52w apr1992_definitive_52w in CI or docs; fail build or flag if a code change changes the hash.
5. **Scenario run in CI:** If feasible, add a single short scenario (e.g. 4w or 8w) to CI to catch obvious harness/state regressions; reserve 20w/52w for nightly or manual.
6. **Preflight deprecation:** The `(node:...) DEP0190 DeprecationWarning` (passing args to child with `shell: true`) comes from preflight spawning the harness; fix by using an array of arguments and `shell: false` (or equivalent) to remove the warning.

### 5.3 Process

7. **Report placement:** This report lives in `docs/40_reports/convenes/` as a smoke + scenario run record; link from 40_reports README “convenes” row if you want it in the master index.
8. **Ledger:** If this run is used as an official baseline or triggers a change (e.g. CI scenario), add an entry to PROJECT_LEDGER per ledger discipline.

---

## 6. References

- Scenario: `data/scenarios/apr1992_definitive_52w.json`
- Harness: `tools/scenario_runner/run_scenario.ts`; preflight: `tools/scenario_runner/run_scenario_with_preflight.ts`
- DESKTOP_GUI_IPC_CONTRACT: `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- Napkin: `.agent/napkin.md` (PowerShell `;`, unique run folders, run_summary integerization, long-run timing)
- Convenes: PARADOX_52W_FULL_TEAM_RUN_REPORT_2026_02_19_n11, PARADOX_TACTICAL_SANDBOX_3D_MAP_CONVENE_2026_02_20
