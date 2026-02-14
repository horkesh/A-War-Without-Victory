# Orchestrator — 52-week scenario run summary

**Date:** 2026-02-14  
**Run:** `historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52` (52 weeks, with video/replay)  
**Artifacts:** `runs/historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52/` (replay_timeline.json, replay.jsonl, save_w1..w52.json, end_report.md, run_summary.json)

---

## 1. Big-picture summary (where we are)

- **Scenario:** Historical MVP Apr 1992, 52 weeks, Phase II from start, ethnic_1991 init, player_choice recruitment, smart bots.
- **Control:** 30 settlement flips over 52 weeks. Net: RBiH +13, RS −8, HRHB −5. Direction: RS→RBiH 19, RBiH→RS 6, HRHB→RS 5. Top flip muns: banja_luka, bosanski_petrovac, zavidovici (5 each); bosanska_krupa (4).
- **Phase II combat:** 52 weeks in Phase II; 50 weeks with attack orders. 130 orders processed, 10 flips applied; 260 attacker / 130 defender casualties. All 130 battles were defender-absent (soft-front/consolidation-style engagements).
- **Exhaustion:** HRHB 0.002→0.10, RBiH 1.0→64.1, RS 3.0→100.1 (RS at cap).
- **Formations:** +3 RBiH brigades (13→16); RS 9, HRHB 4 (operational groups). Personnel end state: RBiH 15,868, RS 7,753, HRHB 0 (brigade personnel).
- **Bot benchmarks:** 4/6 passed. RBiH overperformed vs benchmarks (hold_core_centers, preserve_survival_corridors failed by excess control share); RS and HRHB benchmarks passed.
- **Replay/video:** Run includes `replay_timeline.json` and weekly saves for tactical map animation. Final state copied to `data/derived/latest_run_final_save.json` for “Latest run” in map viewer.

---

## 2. Single agreed priority and owner

- **Priority:** Validate and tune AI consolidation/breakthrough behavior against this 52w baseline: all Phase II battles were defender-absent (soft front); 10 flips over 52 weeks is low. Confirm whether consolidation posture and target scoring are producing the intended rear-cleanup and corridor behavior, and whether RS exhaustion cap is dominating late-game.
- **Owner:** Gameplay Programmer + QA Engineer — run determinism check (re-run same scenario, compare final_state_hash and flip counts), then scenario-creator-runner-tester to assess historical plausibility of control trajectory and casualty levels.

---

## 3. Team coordination and handoffs

- **Orchestrator → PM:** If calibration passes, next single priority is Phase 7 backlog per roadmap; if not, sequence “AI consolidation calibration” (targets, thresholds, benchmark tolerance) before further content.
- **Orchestrator → Process QA:** This run and summary are a handoff artifact; validate ledger/context/napkin updates if this run is adopted as a new baseline or reference.
- **Viewing replay:** `npm run dev:map` → open `http://localhost:3001/tactical_map.html` → Dataset “Latest run” or load `data/derived/latest_run_final_save.json` → “Load replay…” → select `runs/historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52/replay_timeline.json`.

---

*Orchestrator summary from 52w run with video/replay artifacts.*
