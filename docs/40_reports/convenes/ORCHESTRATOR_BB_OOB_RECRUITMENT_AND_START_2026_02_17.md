# Balkan Battlegrounds vs OOB Formation Dates, No-Initial-Formations Start, and Pool-Based Recruitment

**Date:** 2026-02-17  
**Type:** Orchestrator convene — formation-expert, scenario-creator-runner-tester, balkan-battlegrounds-historical-extractor, gameplay-programmer  
**Purpose:** (1) Check historical formation dates from Balkan Battlegrounds against current OOB `available_from`; (2) Design start-of-game with no brigades on map and pool-adjusted recruitment; (3) Ensure what/where/when recruitment and deterministic Phase 0 tie-in.

---

## 1. Executive Summary

- **BB vs OOB dates:** Balkan Battlegrounds (BB1 Appendix G, BB2, knowledge masters) do **not** provide per-brigade formation dates. They provide corps-level strength evolution (April 1992, Dec 1992, etc.) and narrative (e.g. “4th Corps formed late,” “7th Corps formed 1993”). Our OOB `available_from` (turn 0 / 8 / 12 / 16 / 26) is design-derived; it is **not** in conflict with BB because BB does not specify brigade-level dates. **Recommendation:** Keep current turn-gates; optionally audit late-formed corps (ARBiH 4th/6th/7th) so their brigades have `available_from` > 0 where narrative supports it.
- **No brigades on map at start:** Desired behavior is **zero** formations placed at game start; user or bot recruits over time. Current `recruitment_mode: "player_choice"` still runs **setup-phase bot recruitment** at init and creates formations immediately. **Recommendation:** Introduce a scenario/runner option (e.g. `no_initial_formations: true` or `deferred_recruitment: true`) that: seeds pools and initializes `recruitment_state`, creates corps assets only (no brigade formations), and leaves brigade creation to first and subsequent turns.
- **Pools for recruitment:** Pools must be populated at start so recruitment can succeed. For Phase II–only scenarios this already happens via `updateMilitiaEmergence` + `runPoolPopulation` using org-penetration seeding (A/B/C). **Recommendation:** Ensure the same seeding path is used when no initial formations are created; optionally increase or tune initial pool scale so that early voluntary recruitment is feasible (where/when/eligibility already enforced by engine).
- **What/where/when and determinism:** Eligibility is already defined: `available_from <= turn`, faction presence in `home_mun`, pool ≥ manpower cost, capital and equipment sufficient. All ordering (factions, brigades, muns) is deterministic. **Recommendation:** Document this clearly in MILITIA_BRIGADE_FORMATION_DESIGN and Phase II spec; add a short “recruitable at start” note (only `available_from === 0` brigades at turn 0). Phase 0 → war start already feeds `organizational_penetration` → militia_emergence → pool_population; no change needed for determinism if the same init path is used.

---

## 2. Balkan Battlegrounds vs OOB Formation Dates

### 2.1 What BB Provides

- **BB1 Appendix G (pp. 496–501):** VRS OOB by corps and municipality; brigade names and locations. No per-brigade “formed on date” field.
- **Knowledge masters** (`ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`): Strength evolution by period (e.g. April 1992 ~60–80k ARBiH, ~80k VRS, ~25–35k HVO; Dec 1992 bands). Corps-level narrative: e.g. ARBiH “4th Corps formed late,” “6th Corps (Konjic) formed late,” “7th Corps (Travnik) formed 1993”; VRS “May 12, 1992 Mladić appointed”; HVO “Formed April 1992.”
- **BB extraction report** (`PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md`): JNA/12 May, takeover patterns, enclaves; no brigade formation dates.

**Conclusion:** There is no BB-derived table of “brigade X formed in week Y.” Our `available_from` is therefore **not** verifiable against BB at brigade level; it can only be checked against corps/regional narrative.

### 2.2 Current OOB `available_from` Distribution

| available_from (turn) | Count | Approx. calendar (1 turn ≈ 1 week) |
|-----------------------|-------|-------------------------------------|
| 0                     | 195   | April 1992 (game start)             |
| 8                     | 12    | ~2 months in (RBiH 4, HRHB 8)       |
| 12                    | 7     | ~3 months (all RBiH)                |
| 16                    | 2     | ~4 months (RBiH Guards, 120th)      |
| 26                    | 20    | ~6 months (all RBiH)                |

**By faction:**

- **RBiH:** 83 at 0, 4 at 8, 7 at 12, 2 at 16, 20 at 26 (late-war / enclave brigades).
- **RS:** 80 at 0 (all at start).
- **HRHB:** 32 at 0, 8 at 8.

This aligns with narrative: RS and most HVO/RBiH brigades from day one; ARBiH 4th/6th/7th and late formations gated later. No BB contradiction.

### 2.3 Recommendations (Dates)

1. **Keep** current `available_from` distribution unless new evidence appears.
2. **Optional audit:** For ARBiH 4th Corps (Mostar), 6th (Konjic), 7th (Travnik), confirm brigades under those corps have `available_from` > 0 if BB/narrative says “formed late 1992 / 1993.” Current 7 at 12 and 20 at 26 already capture many late formations.
3. **Document:** In MILITIA_BRIGADE_FORMATION_DESIGN or OOB README, state that `available_from` is in **game turns** (weeks), derived from design and corps-level narrative, not from a BB brigade-level formation-date table.

---

## 3. No Brigades on Map at Start — Design

### 3.1 Current Behavior

- **`init_formations_oob: true`:** `createOobFormationsAtPhaseIEntry` creates **all** OOB slots (corps + brigades) at Phase I/II entry where faction has presence in home/HQ mun. Brigades appear on map with personnel filled from pools over time.
- **`recruitment_mode: "player_choice"`:** Same init runs militia_emergence and pool_population, initializes `recruitment_state`, then **immediately** runs `runBotRecruitment`, which creates formations and places them. So the map **does** have brigades at start (those the bot chose to recruit).

User intent: **no** brigades on map at start; user or bot recruits over time. So we need a mode where:

- Corps assets (and optionally army HQs) **are** created (for command structure and UI).
- **No** brigade formations are created at init.
- `recruitment_state` and `militia_pools` are initialized so that first-turn and later recruitment can succeed.

### 3.2 Proposed Addition: Deferred Recruitment / No Initial Formations

**Option A — Scenario flag (recommended):**

- Add a scenario field, e.g. `no_initial_brigade_formations: true` (or `deferred_recruitment: true`).
- When `recruitment_mode === 'player_choice'` and this flag is set:
  - Do **not** call `runBotRecruitment` at init.
  - Do create corps (and army_hq) assets only (no brigade formations).
  - Run militia_emergence and runPoolPopulation as today (so pools exist).
  - Set `state.recruitment_state` from scenario (capital, equipment, trickles, max_recruits_per_faction_per_turn).
  - Leave `state.formations` with only corps_asset (and army_hq) entries; brigades appear only when player or bot recruits on turn 0 or later.

**Option B — New recruitment_mode value:**

- e.g. `recruitment_mode: "player_choice_deferred"` that behaves like Option A (no setup-phase recruitment).

Both preserve determinism: same init order, same seeding, no randomness; only the “create brigade formations at init” step is skipped.

### 3.3 What Must Still Work

- **Eligibility:** Brigades recruitable only when `available_from <= meta.turn`, faction has presence in `home_mun`, pool ≥ manpower cost, and capital/equipment sufficient. Already enforced in `recruitment_engine.ts` and ongoing recruitment.
- **Where:** `factionHasPresenceInMun(state, faction, home_mun, sidToMun)` — already used.
- **When:** `available_from` — already used in catalog filtering.
- **AoR at Phase II:** If there are zero brigades at start, `initializeBrigadeAoR` and `ensureFormationHomeMunsInFactionAoR` will only assign AoR from political control (no formation home muns). When first brigades are recruited, AoR can be updated on next turn (e.g. phase-ii-aor-reshape or existing sync step). Design: AoR init with no formations is valid (control-only); first recruitment then adds formation home muns in a later step or on next turn.

---

## 4. Pools Adjusted So They Can Recruit

### 4.1 Current Pool Seeding (Phase II Start)

For `recruitment_mode === 'player_choice'` or `init_formations_oob`:

1. If `phase_i_militia_strength` is empty, `updateMilitiaEmergence(state)` (from `state.municipalities[].organizational_penetration`).
2. If `militia_pools` is empty, `runPoolPopulation(state, settlements, municipalityPopulation1991)`.

For **Phase II–only** scenarios (no Phase 0), `organizational_penetration` is seeded by the A/B/C formula (controller, population share, planned OOB presence at war start). So pools are deterministic and non-empty where op is non-zero.

### 4.2 Ensuring Pools Support Recruitment

- **Manpower:** Each recruitment deducts `manpower_cost` (default 800) from the pool for `(home_mun, faction)`. So for “no initial formations” to allow recruitment, every (mun, faction) that has at least one OOB brigade with `available_from === 0` should have pool `available >= MIN_MANDATORY_SPAWN` (200) or the brigade’s `manpower_cost` so that at least one brigade can be recruited there. Current pool formula (strength × POOL_SCALE_FACTOR × population factor × FACTION_POOL_SCALE) already produces large aggregates; the main risk is **fragmentation** (many muns with small pools). Recommendation: no change to formula for now; if playtests show “can’t recruit anywhere,” consider a one-time bootstrap that guarantees a minimum pool per (mun, faction) where an OOB brigade exists and faction has presence, or document that player/bot must prioritize high-pool muns first.
- **Capital and equipment:** Scenario-supplied `recruitment_capital` and `equipment_points` (and trickles) already define what the player/bot can spend. For deferred recruitment, same values apply from turn 0; no change needed.
- **Phase 0 tie-in:** When the scenario is Phase 0 → Phase I/II, `organizational_penetration` is set by Phase 0 investment and outcomes; at war start, militia_emergence and pool_population use that op. So pools are **deterministic** given the same Phase 0 history. When the scenario is Phase II only, A/B/C seeding is deterministic. Recommendation: document that “no initial formations” uses the **same** militia_emergence and pool_population path as today; only the step that creates brigade formations at init is skipped.

---

## 5. What / Where / When — Recruitable Brigades

- **What:** OOB catalog filtered by `available_from <= state.meta.turn`; mandatory vs elective from `mandatory` flag; equipment class from OOB or best affordable.
- **Where:** Faction must have presence in brigade’s `home_mun` (`factionHasPresenceInMun`). HQ settlement resolved from `municipality_hq_settlement` or first faction-controlled settlement in mun (deterministic).
- **When:** `available_from` is the turn from which the brigade can be recruited. At turn 0, only `available_from === 0` brigades are eligible; at turn 8, brigades with `available_from <= 8` become eligible, etc.

All ordering in recruitment_engine (factions, brigades, muns) is deterministic (sorted). No change required for determinism.

**Recommendation:** Add one sentence to Systems Manual or MILITIA_BRIGADE_FORMATION_DESIGN: “At game start (turn 0), only brigades with `available_from === 0` are recruitable; later turns unlock brigades by `available_from <= turn`.”

---

## 6. Phase 0 Tie-In and Determinism

- **Phase 0 → war start:** Phase 0 sets `state.municipalities[].organizational_penetration` via investment and (optionally) formula-based fallback. At transition to Phase I/II, the same state is used; militia_emergence reads op, pool_population builds pools. No extra randomness; turn order and faction order are fixed.
- **Phase II–only:** Org penetration is seeded by A/B/C (controller, population share, planned war-start OOB presence). Same deterministic order.
- **No initial formations:** Skipping brigade creation at init does not add any non-determinism; it only leaves `state.formations` without brigade entries until recruitment runs. Recommendation: when implementing `no_initial_brigade_formations` or `deferred_recruitment`, ensure that the **first** time recruitment runs (e.g. turn 0 or turn 1), the order of evaluation (factions, then brigades, then muns) is the same as in current setup-phase and ongoing recruitment so that replays and regression tests stay deterministic.

---

## 7. Recommendations for Next Steps

### 7.1 Immediate (No Code Change)

1. **Document** in `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10 (or OOB README):
   - `available_from` is in game turns (weeks); derived from design and corps-level narrative; BB does not provide per-brigade formation dates.
2. **Document** eligibility for recruitment: “At turn 0 only `available_from === 0` brigades are recruitable; `available_from <= turn` for later turns; where = faction presence in home_mun; pools and capital/equipment must be sufficient.”

### 7.2 Short-Term (Implementation)

3. **Add scenario option** `no_initial_brigade_formations: true` (or `deferred_recruitment: true`):
   - When set with `recruitment_mode: 'player_choice'`: do not run setup-phase bot recruitment; create corps (and army_hq) assets only; initialize militia_emergence, pool_population, recruitment_state; leave brigade formations to turn 0+ recruitment.
4. **Ensure AoR and corps command** behave with zero brigade formations at start (control-only AoR; corps with no subordinates until recruitment).
5. **Tests:** Add a small scenario or test that enables this flag and asserts initial formation count = corps only (no brigades), and that after one recruitment step (or one turn) at least one brigade exists and has valid hq_sid and tags.

### 7.3 Optional (Audit / Tuning)

6. **Audit** ARBiH 4th/6th/7th Corps brigades in OOB: if any are currently `available_from: 0` but narrative says “formed late 1992/1993,” consider setting them to 12 or 26.
7. **Playtest** deferred recruitment: confirm pools and initial capital/equipment allow the player or bot to recruit a plausible set of brigades in the first few turns; if not, tune POOL_SCALE_FACTOR or scenario resources for that mode.

### 7.4 Ledger and Canon

8. **PROJECT_LEDGER:** One-line entry when the scenario option and init change are implemented (determinism preserved; no initial brigade formations when flag set).
9. **Phase II Spec / Systems Manual:** Short implementation-note that “no initial formations” mode exists and how it ties to Phase 0 (same op → pools path).

---

## 8. References

- **OOB:** `data/source/oob_brigades.json` (236 brigades, 195 mandatory at turn 0); `data/source/oob_corps.json`.
- **BB / knowledge:** `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`; `data/derived/knowledge_base/balkan_battlegrounds/extractions/PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md`.
- **Code:** `src/scenario/scenario_runner.ts` (createOobFormations, militia_emergence, pool_population at init); `src/sim/recruitment_engine.ts` (eligibility, recruitBrigade, runBotRecruitment); `src/scenario/oob_phase_i_entry.ts` (createOobFormationsAtPhaseIEntry, factionHasPresenceInMun).
- **Canon:** `docs/10_canon/Phase_0_Specification_v0_5_0.md` (org penetration, capital); `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10 (OOB, recruitment mode).

---

*Report produced by Orchestrator with formation-expert, scenario-creator-runner-tester, and balkan-battlegrounds-historical-extractor context. No canon changes; recommendations only.*
