# Defender-present battles: diagnosis and design bar (Run Problems Phase 4)

**Date:** 2026-02-18  
**Run:** 52w apr1992_definitive_52w had 76 attacks, 0 defender-present, 76 defender-absent.

---

## 1. Root cause

- **Defender-present** is defined in scenario_runner as `battle.defender_brigade != null` (i.e. a brigade was defending the settlement).
- In battle_resolution.ts, **defender_brigade** is set from **brigade_aor[targetSid]** — the formation that has the target settlement in its AoR. If no formation has that settlement in AoR, defender is militia-only (or empty) and **defender_brigade** is null.
- So every attack in the run was against a settlement that **no enemy brigade had in its AoR** (militia or empty only).

**Why:** (1) **Bot target selection** in bot_brigade_ai scores enemy-adjacent settlements and picks by score; casualty-aversion makes "undefended (garrison 0) always viable" and can filter out high-cost targets. So the bot tends to pick low-garrison / high-win-probability targets, which are often those without a defending brigade. (2) **AoR coverage** — defending brigades may not have many front settlements in their AoR (operational cap, rear-heavy assignment), so even when the bot attacks the front, many targets have only militia.

---

## 2. Levers

| Lever | Description |
|-------|--------------|
| **Bot: prefer defended targets** | When scoring targets, add a small bonus for settlements that have an enemy brigade in AoR, so that when scores are close we sometimes attack defended settlements and get set-piece battles. |
| **Bot: relax casualty-aversion** | Lower CASUALTY_AVERSION_THRESHOLD or MIN_WIN_PROBABILITY so that more defended (higher-cost) targets remain viable. |
| **Garrison / AoR** | Ensure defensive posture or AoR assignment places more brigades on front settlements so that a larger fraction of front has brigade coverage (Formation Expert / Gameplay Programmer). |

---

## 3. Design bar

**Target:** A non-trivial fraction of Phase II attacks should be defender-present by 52w (e.g. at least 5–10% of attacks encounter a defending brigade). No change to battle resolution math unless designer requests.

---

## 4. Implemented fix (minimal)

- **Change:** In bot_brigade_ai, when scoring attack targets, add a **score bonus for "target has defender brigade"** (enemy faction has a formation with this settlement in its AoR). Helper `hasDefenderBrigade(state, sid)` returns true when `state.brigade_aor[sid]` is set and that formation’s faction equals `state.political_controllers[sid]`. Bonus `SCORE_DEFENDER_PRESENT_BONUS = 100` so that defended targets with strategic value can outweigh `SCORE_UNDEFENDED` (150) and yield set-piece battles over 52 weeks.
- **Determinism:** Use existing brigade_aor and sorted iteration; no RNG.
- **Tests:** hasDefenderBrigade unit tests in bot_three_sides_validation.test.ts (true when controller + AoR match; false when no AoR or faction mismatch).
- **Verification:** 52w run: defender_present_battles count depends on AoR coverage (many front settlements may still have no defender brigade in AoR); the lever is in place for future AoR/garrison tuning to increase defender-present fraction.
