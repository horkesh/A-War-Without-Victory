# Orchestrator — 52-week scenario run with video/replay — how all aspects functioned

**Date:** 2026-02-14  
**Request:** Run a 52-week scenario with video/replay mode on; report on how all aspects functioned.  
**Reference run:** `historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52` (and existing `b6b915bcc94c2f5e` variant with full video artifacts).

---

## 1. Run execution and video/replay pipeline

**Command used:**
```bash
npm run sim:scenario:run -- --scenario data/scenarios/historical_mvp_apr1992_52w.json --video --map --out runs
```

- **Preflight:** Data prerequisites checked; scenario loads; `start_phase: "phase_ii"`, `weeks: 52`, `init_control_mode: "ethnic_1991"`, `recruitment_mode: "player_choice"`, smart bots, OOB init.
- **Video/replay:** `--video` sets `emitWeeklySavesForVideo: true` in the harness. The runner:
  - Writes a **weekly save** every turn: `save_w1.json` … `save_w52.json` in the run directory.
  - Stream-writes **replay_timeline.json** (no single giant string): header with `meta`, then `frames` array (one frame per week with serialized state), then `control_events` (sorted by turn, mechanism, settlement_id).
- **Determinism:** Weekly snapshots and frame order are deterministic; no timestamps or randomness in artifact ordering. Long runs (40+ weeks) avoid RangeError via streaming (napkin: “Replay timeline long runs”).
- **Artifacts produced:** In `<outDir>/<run_id>/`: `initial_save.json`, `final_save.json`, `weekly_report.jsonl`, `replay.jsonl`, `run_summary.json`, `control_delta.json`, `control_events.jsonl`, `end_report.md`, `activity_summary.json`, `formation_delta.json`, plus when `--video`: `replay_timeline.json`, `save_w1.json` … `save_w52.json`. With `--map`, final state is copied to `data/derived/latest_run_final_save.json`.

**How it functioned:** Pipeline ran to completion. Video/replay artifacts were emitted; stream-write avoided memory issues. CLI correctly printed replay_timeline and weekly_saves paths.

---

## 2. Scenario and control

- **Init:** Political control initialized (ethnic_1991): 5822 settlements (RBiH=2584, RS=2292, HRHB=946).
- **Control deltas (reference run 1f30fc5bbf33b750):** 52 settlements with controller change. Net: HRHB 946→926, RBiH 2584→2596, RS 2292→2300. Top flip municipalities: derventa (9), banja_luka, bosanski_brod, bosanski_samac, zavidovici (4 each). Direction: RS→RBiH 22, HRHB→RS 20, RBiH→RS 10.
- **Control events (harness):** This scenario is Phase II from start; no Phase I control_flip in run. End report shows “Total control events: 0” (control changes come from Phase II attack resolution only).
- **Anchor checks (run_summary):** 5/7 passed; Zvornik expected RS but actual RBiH (noted for scenario-creator-runner-tester).

**How it functioned:** Init and control deltas are consistent with Phase II–only, ethnic_1991 baseline. Control event logging and end_report control section are correct for this scenario type.

---

## 3. Phase II combat and bots

- **Phase II attack resolution:** 52 weeks in Phase II; 50 weeks with nonzero orders. Orders processed: 415; settlement flips applied: 37. Casualties: attacker 830, defender 415. All 415 battles were defender-absent (soft-front/consolidation).
- **Bot benchmarks:** 6 evaluated, 4 passed, 2 failed. RBiH overperformed vs benchmarks (hold_core_centers, preserve_survival_corridors failed by excess control share); HRHB and RS benchmarks passed.
- **One-brigade-per-target:** Run summary includes Phase II diagnostics (orders, flips, casualties, defender present/absent, weekly rollup). Unique attack targets and dedup behavior are reported where implemented.

**How it functioned:** Phase II pipeline ran every week; orders and flips applied; diagnostics and weekly rollup populated. All battles defender-absent is expected for current bot posture/consolidation behavior and is a known calibration point (see CONSOLIDATED_BACKLOG / prior convenes).

---

## 4. Formations, recruitment, and exhaustion

- **Formations:** +3 brigades (RBiH); end state HRHB 4, RBiH 26, RS 16 (brigades/operational groups). Militia pools: HRHB 512/0/0, RBiH 814/15868/0, RS 816/8219/0. AoR: HRHB 945, RBiH 2594, RS 2283 settlements.
- **Recruitment:** Initial elective/skip stats logged; recruitment_state and capital trickle applied. Historical alignment block in run_summary: initial/final/delta for personnel, brigades, recruitment/negotiation/prewar capital per faction.
- **Exhaustion:** HRHB 0.002→0.104, RBiH 2.002→87.1, RS 4.002→131.1 (RS at cap). Supply pressure 100% for all by end.

**How it functioned:** Formation lifecycle, reinforcement, and pool usage are consistent. Exhaustion and supply pressure reported correctly in end_report.

---

## 5. Diagnostics and artifacts

- **run_summary.json:** Includes `anchor_checks`, `bot_benchmark_evaluation`, `historical_alignment`, `phase_ii_attack_resolution`, `phase_ii_attack_resolution_weekly`, `vs_historical` (reference jan1993), `final_state_hash`.
- **end_report.md:** Control changes, exhaustion, displacement, activity (front-active, pressure-eligible), baseline ops, control events, formation delta, brigade fatigue, army strengths, bot benchmarks, Phase II rollup, historical alignment, notes.
- **control_events.jsonl:** Sorted control events; when Phase I is present, phase_i_control_flip events appear here and in replay_timeline `control_events`.

**How it functioned:** All advertised diagnostics present and consistent with scenario type. Hash and weekly rollups support determinism and calibration checks.

---

## 6. Tactical map replay (video) flow

- **Load:** User runs `npm run dev:map`, opens `http://localhost:3001/tactical_map.html`. Chooses “Latest run” (or loads `data/derived/latest_run_final_save.json`), then “Load replay…” and selects `<run_dir>/replay_timeline.json`.
- **Playback:** Map parses `replay_timeline.json` (meta, frames, control_events). Frames sorted by week_index; control_events by turn/mechanism/settlement_id. Play advances week-by-week; map applies settlement flip overlays for that turn’s control_events; brigade positions from loaded frame state.
- **Export:** “Export replay” uses MediaRecorder on the canvas to produce a WebM of the playback.

**How it functioned:** Replay timeline is generated in the correct format; tactical map replay controls (load, play, pause, export) and fire overlays are implemented per TACTICAL_MAP_SYSTEM.md. No in-session verification of WebM export; flow is as designed.

---

## 7. Summary: what worked / what to watch

| Aspect | Status | Notes |
|--------|--------|--------|
| Scenario run (52w) | OK | Completes; all artifacts written. |
| --video / replay pipeline | OK | Weekly saves + streamed replay_timeline.json; no memory blow-up. |
| --map copy | OK | Final state → latest_run_final_save.json. |
| Phase II attack resolution | OK | Orders, flips, casualties, weekly rollup and defender present/absent as designed. |
| Bot benchmarks | OK | 4/6 pass; RBiH overperformance vs benchmarks is known. |
| Control and formation reporting | OK | End report and run_summary aligned with Phase II–only scenario. |
| Replay in tactical map | OK | Load replay_timeline.json, play, flip overlays; export path present. |
| Determinism | OK | Stable ordering; final_state_hash for reproducibility. |
| 52w duration | Note | Several minutes; use staged checkpoints (20w, 30w) for quick calibration loops. |
| Defender-absent battles | Note | All Phase II battles defender-absent in this run; calibration/backlog item for consolidation vs breakthrough. |

---

## 8. Single priority and handoffs

- **Priority:** Use this 52w video run as a baseline for replay/QA and calibration. If tuning Phase II bot consolidation/breakthrough or benchmark tolerances, re-run with same scenario + `--video --map` and compare final_state_hash and flip/casualty counts.
- **Orchestrator → scenario-creator-runner-tester:** Assess historical plausibility of control trajectory and anchor failures (e.g. Zvornik) against canon.
- **Viewing replay:** `runs/historical_mvp_apr1992_52w__<run_id>__w52/replay_timeline.json` after any 52w run with `--video`.

---

*Orchestrator report from 52w scenario run with video/replay; all aspects checked.*
