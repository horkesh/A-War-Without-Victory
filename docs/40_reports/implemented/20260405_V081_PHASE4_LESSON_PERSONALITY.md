# v0.8.1 Phase 4 — Lesson Memory and Personality Weighting

**Date:** 2026-04-05
**Type:** Implementation — v0.8.1 Commander Maturity Phase 4
**Phase in series:** 4 of 6
**Status:** ACCEPTED
**Baseline:** n1323 — 94.0%, 27/27 anchors, 6/6 benchmarks
**Verification:** tsc clean, 2460/2460 vitest (173 files)

---

## Purpose

Phase 4 wires `CommanderLesson[]` and `OfficerPersonality` into `selectWinningIntent()` scoring so candidate choice reflects recent learned outcomes and officer temperament, while remaining deterministic, auditable, and bounded.

## Deliverables

### 1. Lesson Extraction (emit.ts — `buildUpdatedLessons()` helper)

New private helper extracts lessons from `cappedHistory` entries where `ended_turn === briefing.turn`:

- `abandoned` plan → `offensive_failure` lesson (weight −0.20, expires +8 turns)
- `success` outcome → `success_pattern` lesson (weight +0.12, expires +5 turns)

Extraction pipeline:
- **Step A:** Expiry filter on previous lessons (remove entries where `expires_turn` ≤ current turn)
- **Step B:** Extraction from operation history entries that ended this turn
- **Step C:** Merge new lessons with surviving previous lessons, sort by `created_turn` then `lesson_id`, cap at 12

`buildUpdatedState()` now calls `buildUpdatedLessons()` instead of passing previous lessons through unchanged.

---

### 2. Personality Weighting (plan.ts — `selectWinningIntent()`)

Sixth optional parameter `lessons?: readonly CommanderLesson[]` added to `selectWinningIntent()`.

Personality delta block applied per candidate:
- **Offensive intents** (`stage_operation`, `launch_opportunity`): `aggression` ±0.20 and `initiative` ±0.08
- **Defensive intents** (`hold_line`, `reinforce_zone`): `caution` ±0.20

`personality_delta` appended to `score_breakdown` when non-zero.

---

### 3. Lesson Application (plan.ts — `selectWinningIntent()`)

`appliedLessonIds: Set<string>` collected in outer scope, populated inside the candidate-map closure.

Per candidate, matching lessons are applied:
- `offensive_failure` dampens `stage_operation` and `launch_opportunity` scores
- `success_pattern` boosts `stage_operation` and `launch_opportunity` scores
- **Zone filtering:** A lesson applies only when `lesson.zone_id` is `undefined` OR matches the candidate's `target_zone`
- **Delta cap:** Combined lesson delta capped ±0.35 to prevent runaway accumulation

`lesson_delta` appended to `score_breakdown` when non-zero.

---

### 4. Trace Population

`lessons_applied: [...appliedLessonIds].sort(strictCompare)` (was `[]`)

Records all lesson IDs that contributed a non-zero delta to any candidate in the current competition round.

---

## Lesson Generation Table

| Outcome | Category | Weight | Expires |
|---|---|---|---|
| `abandoned` | `offensive_failure` | −0.20 | +8 turns |
| `success` | `success_pattern` | +0.12 | +5 turns |
| `partial`, `stalemate`, `failure` | — (deferred) | — | — |

---

## Hard Guards

- Personality and lesson modifiers are additive **post-score** — never pre-score
- Hard-block evaluation runs **after** personality and lesson deltas are applied
- Modifiers cannot override hard blocks (exhaustion, stance, supply, campaign role)
- Backward compatible: `null`/`undefined` lessons → zero deltas, no crash

---

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/plan.ts` | `selectWinningIntent()` 6th param; personality + lesson delta blocks; `appliedLessonIds` tracking; `lessons_applied` in trace |
| `src/sim/combat/commander/emit.ts` | `buildUpdatedLessons()` helper; `buildUpdatedState()` uses it instead of passthrough |

---

## Tests

25 targeted Phase 4 tests in `tests/commander/commander_phase4_lesson_personality.test.ts`:

| Category | Count | Coverage |
|---|---|---|
| Lesson extraction | 3 | `abandoned` → `offensive_failure`; `success` → `success_pattern`; non-terminal outcomes produce no lesson |
| Lesson expiry | 4 | Expired lessons removed before merge; unexpired survive; cap-at-12 enforced; sort order deterministic |
| Personality weighting | 6 | Aggression boosts offensive; caution boosts defensive; initiative secondary modifier; balanced personality → no delta; personality_delta in score_breakdown; zero when non-matching intent type |
| Lesson influence | 6 | `offensive_failure` dampens offensive candidates; `success_pattern` boosts; zone-specific lesson fires only on matching target_zone; corps-level intents with no target_zone unaffected by zone-scoped lessons; delta cap ±0.35 enforced; lesson_delta in score_breakdown |
| Determinism | 3 | Same inputs → identical winner, trace, and lessons_applied; lesson set order does not change winner; personality values do not introduce nondeterminism |
| Backward compatibility | 3 | Null lessons param → zero delta; undefined personality → zero delta; old saves without lesson history produce no crash |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2460/2460 (173 files, 0 failures)

---

## Key Finding

**Zone-specific lesson scoping:** `stage_operation` and `launch_opportunity` candidates carry no `target_zone` (they are corps-level intents), so zone-specific lessons never fire on them. Zone filtering only affects candidates with an explicit `target_zone` value. This is correct behavior — corps-level intents respond to corps-level lessons; zone-level lessons require future zone-routing work.

---

## Deferred to Later Phases

| Item | Target Phase |
|---|---|
| Relationship effects (`player_trust`, `sibling_corps_trust`, `patron_alignment`) on scoring | Phase 5 |
| `stalemate` and `failure` lesson extraction (execution pipeline hasn't resolved these yet) | Future execution pipeline |
| `defensive_failure`, `reserve_misuse`, `intel_surprise` lesson categories | Future phases |
| Zone-specific lesson routing for corps-level intents | Phase 5/6 |

---

## Recommended Next Phase

**v0.8.1 Phase 5 — Constraint/Preference Separation and Relationship Effects**
