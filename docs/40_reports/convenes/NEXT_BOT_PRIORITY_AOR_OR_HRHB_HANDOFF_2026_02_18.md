# Next Bot Priority: AoR Behavioral Balance vs HRHB Activity — Handoff

**Date:** 2026-02-18  
**Purpose:** Scope and handoff for the **next single bot-fix** after Priority (B) RS early-war and Priority (C) Phase 0 referendum/deadline. Two candidates; Orchestrator or PM picks one.

**Reference:** [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md) §7 (Bot AI remaining work). RS early-war and defender-casualties-at-zero already implemented.

---

## 1. Candidate A: AoR behavioral imbalance (HIGH)

**Problem:** After contiguity and surrounded-brigade reform (2026-02-17), some brigades still end up with very large or very small AoR (e.g. 803rd Light 223 settlements pattern). The **behavioral** cause is how targets/settlements are assigned during rebalance and consolidation (which brigade gets which front-active or surplus settlements).

**Scope (if chosen):**
- **In scope:** Tuning or logic in rebalance/consolidation scoring or assignment (e.g. in `brigade_aor.ts`, consolidation scoring, or bot brigade AI target selection) so that no single brigade is assigned a grossly disproportionate share of settlements. Preserve determinism (sorted iteration, no new RNG). Checkpoint: 4w/16w run_summary and formation AoR size distribution.
- **Out of scope:** Changing contiguity/surrounded-brigade rules; changing MAX_MUNICIPALITIES_PER_BRIGADE or operational cap semantics; new systems.

**Design intent (Game Designer):** Reduce extreme AoR size variance (e.g. cap or penalize assignment that would push a brigade far above cohort average) while keeping front coverage and corps-sector coherence.

**Acceptance criteria (draft):**
| Criterion | Owner |
|-----------|--------|
| No brigade exceeds a reasonable AoR size bound (e.g. derived from operational cap + margin, or percentile cap) in 16w run | Gameplay Programmer |
| 4w/16w deterministic hash or key metrics within acceptable band | QA |
| Determinism preserved | Systems Programmer / QA |

**Owners:** Game Designer (success criteria, bound definition); Gameplay Programmer (implementation); Formation-expert (AoR semantics if needed).

---

## 2. Candidate B: HRHB near-passive (LOW–MEDIUM)

**Problem:** HRHB bot issues relatively few attack orders and appears underactive compared to RS and RBiH.

**Scope (if chosen):**
- **In scope:** Tuning in Phase II bot (e.g. `bot_strategy.ts` HRHB doctrine/attack share, `bot_corps_ai.ts` stance, `bot_brigade_ai.ts` target scoring for HRHB) to increase HRHB attack activity without breaking balance. Determinism preserved. Checkpoint: 4w/16w run_summary (e.g. `phase_ii_attack_resolution_weekly` orders for HRHB).
- **Out of scope:** New systems; changing RBiH/RS profiles unless needed for balance.

**Design intent (Game Designer):** HRHB more active (probe, territorial pressure) in line with historical Croat military activity; no single-faction wipe or unrealistic HRHB sweep.

**Acceptance criteria (draft):**
| Criterion | Owner |
|-----------|--------|
| HRHB attack activity (orders/flips) in 16w run increased vs current baseline | Gameplay Programmer |
| Defender balance: RBiH/RS control share not collapsed; no regression on 4w/16w hash or key metrics | Game Designer / QA |
| Determinism preserved | Systems Programmer / QA |

**Owners:** Game Designer (success criteria, balance floor); Gameplay Programmer (implementation).

---

## 3. Recommendation and next steps

| Option | Priority in backlog | Effort (rough) | Impact |
|--------|---------------------|----------------|--------|
| **A (AoR behavioral)** | HIGH | Medium (scoring/assignment logic) | Reduces outlier brigades; improves consistency |
| **B (HRHB activity)** | LOW–MEDIUM | Low–medium (tuning levers) | Improves three-faction feel; more symmetric activity |

**Recommendation:** Either is valid. **A** addresses the remaining HIGH bot item; **B** is lower risk and may be faster (tuning only). Orchestrator or PM to pick one and create a single-priority convene (e.g. "Priority D: AoR behavioral balance" or "Priority D: HRHB activity") with final scope and owners; then hand off to Game Designer + Gameplay Programmer.

**Next steps:**
1. Orchestrator/PM: Choose A or B as next single bot priority.
2. Game Designer: Confirm design intent and acceptance criteria for chosen option.
3. Create short implementation handoff (scope, checkpoint runs, Process QA after).

---

## 5. Implementation complete — Candidate B (HRHB activity)

**Date completed:** 2026-02-18.

**Chosen option:** Candidate B (HRHB near-passive → increased attack activity).

**Changes:**
- **bot_strategy.ts:** Added `HRHB_LASVA_OFFENSIVE_START_WEEK` (12), `HRHB_LASVA_OFFENSIVE_END_WEEK` (26), `HRHB_LASVA_ATTACK_SHARE` (0.45). `getEffectiveAttackShare` now returns 0.45 for HRHB in weeks 12–26 so more HRHB brigades can be in attack/probe posture.
- **bot_corps_ai.ts:** In the HRHB (E3) block, during weeks 12–26 (Lasva Offensive), non-Herzegovina corps with avgPers >= 0.4 are nudged from defensive/reorganize to balanced so more corps participate in attacks.

**Determinism:** No new randomness; all iteration remains sorted. Same scenario + seed → same bot decisions.

**Checkpoint:** `npx tsc --noEmit`, `npm test`, `npx vitest run tests/bot_three_sides_validation.test.ts tests/brigade_aor.test.ts` pass. Optional 4w/16w run_summary comparison for HRHB order counts can be done in a follow-up calibration pass.

---

## 4. References

- [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md) §7
- [AOR_CONTIGUITY_AND_SURROUNDED_BRIGADE_DESIGN_2026_02_17.md](AOR_CONTIGUITY_AND_SURROUNDED_BRIGADE_DESIGN_2026_02_17.md)
- [PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md](PRIORITY_B_RS_EARLY_WAR_BOT_HANDOFF_2026_02_18.md)
- [BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md](../implemented/BOT_AI_INVESTIGATION_AND_OVERHAUL_2026_02_13.md)
