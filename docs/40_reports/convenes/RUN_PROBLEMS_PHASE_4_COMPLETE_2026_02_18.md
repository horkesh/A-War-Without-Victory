# Run Problems Phase 4 Complete — Orchestrator Checkpoint & PM Handover

**Date:** 2026-02-18  
**Phase:** 4 (Defender-present battles: diagnosis and fix)

---

## 1. Phase 4 completion

- **Diagnosis:** Documented in DEFENDER_PRESENT_BATTLES_DIAGNOSIS_2026_02_18.md. Root cause: every attack hit settlements with no enemy brigade in AoR (defender_brigade = brigade_aor[targetSid]); bot preferred undefended/high-win-probability targets; AoR coverage limits how many front settlements have a defending brigade.
- **Design bar:** Non-trivial fraction of Phase II attacks defender-present by 52w (e.g. 5–10%). No change to battle resolution math.
- **Fix implemented:** In bot_brigade_ai: (1) hasDefenderBrigade(state, sid) — true when settlement controller has a formation with that sid in AoR. (2) Score bonus SCORE_DEFENDER_PRESENT_BONUS = 100 when target has defender brigade, so defended strategic targets can outweigh undefended preference. (3) Unit tests for hasDefenderBrigade in bot_three_sides_validation.test.ts.
- **Ledger:** PROJECT_LEDGER entry appended.

**Exit criterion:** Diagnosis documented; design bar set; fix implemented and verified (code path + tests). Actual defender_present_battles count in a given run depends on AoR coverage; the lever is in place for future garrison/AoR tuning.

---

## 2. Refactor-pass (Phase 4 scope)

- **Scope:** src/sim/phase_ii/bot_brigade_ai.ts, tests/bot_three_sides_validation.test.ts, docs/40_reports/convenes (diagnosis, this checkpoint).
- **Result:** No dead code or duplication; helper and bonus are minimal; tests are focused.

---

## 3. Orchestrator: single next priority

**Single agreed priority:** No further phases from the Run Problems implementation plan. Plan complete (Phases 1–4).

If PM adds follow-ups (e.g. AoR/garrison tuning to increase defender-present fraction, or 52w calibration check), those are separate work items.

---

## 4. PM handover

**Scope:** None (plan complete).

**Handoff to dev:** None unless PM creates new priority (e.g. Phase L re-run to confirm defender_present_battles band after AoR redesign).
