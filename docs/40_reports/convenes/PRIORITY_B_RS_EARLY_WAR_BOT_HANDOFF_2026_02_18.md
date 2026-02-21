# Priority (B): RS Early-War Bot Fix — Handoff

**Date:** 2026-02-18  
**Authority:** Product Manager (per state-of-game meeting 2026-02-17)  
**Single priority:** One bot-fix — **RS early-war** (chosen from AoR rebalance vs RS early-war).

**Reference:** [PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md) §13 — (A) complete; next (B) with owner and acceptance criteria.

**Implementation complete (2026-02-18):** RS early-war window extended from weeks 0–12 to 0–26 in `bot_strategy.ts` (doctrine phases, standing orders, `getEffectiveAttackShare`) and `bot_corps_ai.ts` (E1 offensive bias). Constant `RS_EARLY_WAR_END_WEEK = 26`; test updated to assert taper at week 26. Phase II Spec §12 and Systems Manual §6.5 implementation-notes added. 4w checkpoint run succeeded (final_state_hash in run_summary); 16w run available for comparison.

---

## 1. Scope

Improve **RS bot activity in the first 26 weeks** of Phase II (Apr 1992 start) so that RS behaves more aggressively in the early-war window without breaking defender balance or determinism.

- **In scope:** Tuning or logic in Phase II bot (corps AI and/or brigade AI) that affects RS stance, attack share, target selection, or posture in weeks 0–26. Determinism must be preserved (sorted iteration, no `Math.random()`). Checkpoint runs: 4w and 16w with `run_summary` and hash comparison.
- **Out of scope:** New systems, Phase I bot changes (Phase I bot posture already added in FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18), AoR rebalance (contiguity + surrounded-brigade already done), HRHB or RBiH profile changes unless needed to preserve balance.

---

## 2. Design intent (Game Designer)

- **Goal:** RS more active in first 26 weeks (territorial expansion, attack orders, flips) in line with AI_STRATEGY_SPECIFICATION benchmark: turn 26 early territorial expansion (`expected_control_share=0.45`, tolerance 0.15).
- **Constraint:** Do not break defender balance (RBiH/HRHB should not be overrun unrealistically; no single-faction wipe in 16w).
- **Canon:** AI_STRATEGY_SPECIFICATION (RS early-war posture, time-adaptive doctrine), Systems Manual §6.5 (Phase II bot). Any new constant or behavior that affects canon must get an implementation-note.

---

## 3. Acceptance criteria

| Criterion | Owner | Check |
|-----------|--------|--------|
| RS attack activity in weeks 0–26 increased vs current baseline (e.g. `phase_ii_attack_resolution_weekly` orders/flips for RS) | Gameplay Programmer | 16w run_summary comparison |
| No regression: 4w and 16w deterministic hash or key metrics (personnel, control share) within acceptable band | QA / Gameplay Programmer | 4w/16w checkpoint |
| Defender balance: RBiH control share at 16w not below agreed floor (e.g. not collapsed) | Game Designer | 16w run inspection |
| Determinism: same scenario + seed → same bot decisions; no new randomness | Systems Programmer / QA | Existing determinism tests + manual run |

---

## 4. Implementation hints

- **Existing levers:** `src/sim/phase_ii/bot_strategy.ts` (doctrine phases: RS 0–12 offensive, 12–52 balanced; `max_attack_share_override`, `aggression_modifier`); `src/sim/phase_ii/bot_corps_ai.ts` (E1 RS early-war comment; stance selection); `src/sim/phase_ii/bot_brigade_ai.ts` (posture, target scoring). Phase I bot already gives RS 40% push + early push boost (FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18).
- **Possible directions:** Extend RS offensive window (e.g. 0–20 or 0–26), raise `max_attack_share_override` for RS in early window, or strengthen RS objective-SID scoring for Drina/Prijedor/Sarajevo in weeks 0–26. Choose one or two levers; avoid broad reworks.

---

## 5. Owners and handoff

| Role | Responsibility |
|------|-----------------|
| **Game Designer** | Confirm success criteria and defender-balance floor; sign off on design intent. |
| **Gameplay Programmer** | Implement tuning/changes in bot_strategy.ts and/or bot_corps_ai/bot_brigade_ai; run 4w/16w checkpoints; document constants in implementation-note if canon-touching. |
| **Process QA** | After implementation, invoke quality-assurance-process for sign-off if needed (per state-of-game §13). |

---

## 6. References

- [PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md) §13 (single priority B)
- [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md) §7 (RS early-war underperformance MEDIUM)
- [AI_STRATEGY_SPECIFICATION.md](../../20_engineering/AI_STRATEGY_SPECIFICATION.md) (RS profile, time-adaptive doctrine)
- [FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md](../implemented/FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md) (Phase I RS push share, Phase II already expanded)
