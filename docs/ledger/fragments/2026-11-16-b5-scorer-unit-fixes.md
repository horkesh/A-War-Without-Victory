## 2026-11-16 — B5 scorer fixes 1-3: the emergent political scorer reads territory trend, exhaustion and the patron term in the state's own units (historical byte-identical, emergent hash-identical)

- **Why.** The Batch B emergent triage (B5) found three unit and order defects in the political scorer that emergent bots, peace-plan responses and political-logic events use. Each made the scorer less tied to game state than its comments say. None decided a pick on its own.
  - **Territory trend was always "stable".** `turn_summaries` is newest-first and keeps every turn, so `slice(-3)` read the war's first three summaries for the whole war, oldest-first, with the sign reversed. `territory_snapshot` is an area fraction (0..1), and the ±1.0 threshold was meant in percentage points.
  - **Exhaustion was under-read about 6×.** `war_exhaustion / 600` kept `exhaustion_level` at or below ~16 all war (188w end state: HRHB ~8100, RBiH ~8700, RS ~9800, against the 10000 cap). A war-weary faction never read as exhausted, and the RBiH survival term (situation_score < 50) could not fire.
  - **The patron term treated a neutral option as aggressive.** `aggression_affinity` 0 took the −0.5 branch.
- **Fix.** `src/sim/political/political_personality.ts` and `political_event_decision.ts`.
  - The trend compares the newest and the third-newest snapshot that carry the faction, in percentage points, against ±1 pp (`TERRITORY_TREND_WINDOW`, `TERRITORY_TREND_THRESHOLD_PP`).
  - `exhaustion_level` uses the shared `recoveredExhaustionLevel` (`state/war_weariness_bands.ts`), the same 0..100 read as the war-weariness bands, the phase-3c gate and the UI.
  - The patron term is +0.5 for a defensive option, −0.5 for an aggressive one and 0 for a neutral one.
- **Proof.**
  - **Historical 188w byte-identical** to a main run (`df206642c`, B0/B1/B4 merged): final hash `df791f73c26ed642`, the baselines manifest value. Every artifact matches except `run_meta.json`. Checkpoints 709/709/708/681, guard intact. (Also byte-identical on the earlier main `e3a0c2b6a`: `01572f50dfea2378`.)
  - **Hands-off emergent 188w hash-identical** with and without the fixes: `b5507e7b9b6463a2` (710/707/707/670). Its guard breaches (Farz 0/4 receipts, Seher t164, Petrovo t179) are the same on main and belong to package P2. The fixes are live (the trend now reads gaining or losing on 6-10% of turns per faction; mid-war exhaustion reads 60-95 instead of 10-16), but no pick crosses: the 15 emergent picks that differ from history win by authored-option margins of 0.10-4.42, and the state terms move a score by at most ~1.3.
  - Tests: new `tests/sim/political/scorer_unit_fixes_b5.test.ts` (9); `tests/cohesion_divisor_rescale.test.ts` updated to the new scale. The political, events and peace-plan slices pass (21 files, 298 tests). tsc is clean.
- Logs: `C:/Pyrrhic/AWWV-worktrees/_logs/b5-scorer-20261116/`.
