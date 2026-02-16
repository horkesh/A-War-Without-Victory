# Paradox Team — State of the Game Meeting (2026-02-15)

**Convened by:** Orchestrator  
**Date:** 2026-02-15  
**Goal:** Gather Paradox team input on the current state of the game, including Formation-expert and Wargame-specialist perspectives, and agree on what needs to change in the current setup before continuing.

**Reference:** Previous state-of-game meetings: [PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_08.md), [PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md). Current phase: Phase 6 complete, MVP declared; scope frozen per Executive Roadmap.

---

## 1. Orchestrator — Big picture and single priority

**Where we are**
- **MVP declared** (Phase 6); A1 tactical base map STABLE; canonical scenarios use `start_phase: "phase_ii"` with `init_control_mode: "ethnic_1991"` and battle-only control changes (Phase I control flips disabled at runtime).
- **Launchable desktop** (Electron): Phases 1–3 done — rewatch, play myself (load scenario/state, advance turn), recruitment UI from map, New Game side picker, orders pipeline (stage attack/posture/move, full `runTurn` on advance), order target selection UX. Tactical map: NATO ops center aesthetic, War Status, ORDERS/AAR/EVENTS, replay scrubber.
- **Scenario split:** **apr1992_historical_52w** = full OOB at init + pool seeding → ~130k/91k/35k personnel, 121/93/39 brigades, defender-present battles and hundreds of flips. **historical_mvp_apr1992_52w** (player_choice) = runBotRecruitment only → ~22k total, few brigades, 0 defender-present; use for recruitment-centric play, not historical troop counts.
- **Bot AI:** Three-layer (army standing orders → corps AI → brigade AI); zero-attack bug fixed; strategic objectives; one-brigade-per-target; consolidation posture; RS early-war external support; player_faction excluded from bot. Remaining backlog: AoR imbalance, RS underperformance, HRHB near-passive, OG/operation targeting stub, etc. (CONSOLIDATED_BACKLOG §7).
- **Formations/AoR:** Corps-directed AoR (HQ mun + up to 2 neighbors, MAX_MUNICIPALITIES_PER_BRIGADE = 3); corps contiguity enforcement; recruitment priority reserves spawn headroom when formation_spawn_directive active.

**Where we're going**
- Continue only after aligning on **what must change in current setup** (see Formation-expert and Wargame-specialist sections below).
- Single agreed priority will be set after this meeting (Orchestrator → PM for phased plan if multiple workstreams).

**Handoffs**
- Formation-expert and Wargame-specialist inputs are captured below; Orchestrator synthesizes recommendations in §5.

---

## 2. Formation-expert — Current state and recommendations

**Current setup (canon and code)**

- **Militia emergence** (`src/sim/phase_i/militia_emergence.ts`): `phase_i_militia_strength` per (mun_id, faction) from `state.municipalities[munId].organizational_penetration`. RBiH: loyal=1, mixed=0.5, hostile=0; RS/HRHB: hostile=1, mixed=0.5, loyal=0. Declaration multiplier 1.5 if faction declared. When `op` is undefined, base strength 0 for all.
- **Pool population** (`src/sim/phase_i/pool_population.ts`): `militia_pools` from strength. Current constants: **POOL_SCALE_FACTOR = 55** (recalibrated 2026-02-15 for April 1992 scenario force levels; see SCENARIO_FORCE_CALIBRATION_2026_02_15.md). With population1991: `available = floor(strength × POOL_SCALE_FACTOR × (eligible pop / ELIGIBLE_POP_NORMALIZER) × FACTION_POOL_SCALE)`. FACTION_POOL_SCALE: RBiH 1.20, RS 1.05, HRHB 1.60 (2026-02-15 calibration). Displaced contribution: REINFORCEMENT_RATE, DISPLACED_CONTRIBUTION_CAP.
- **Formation spawn** (`src/sim/formation_spawn.ts`): Runs only when `formation_spawn_directive` is active. Spawns from pools with `pool.available >= batchSize` (getBatchSizeForFaction → **MIN_BRIGADE_SPAWN = 800**). Respects `getMaxBrigadesPerMun`; deterministic naming. Scenario can set `formation_spawn_directive` (e.g. `{ kind: "both" }`) at init.
- **Phase II init:** For **apr1992_historical_52w** (no recruitment_mode): `createOobFormationsAtPhaseIEntry` creates all OOB brigades at MIN_BRIGADE_SPAWN (800); militia_pools and phase_i_militia_strength are seeded when `init_formations_oob` is true so reinforcement can fill. For player_choice scenarios, pool seeding also runs but brigade count is capital/equipment-limited via runBotRecruitment.

**What’s working**
- OOB path gives historically plausible brigade counts and personnel envelopes for 52w runs when using apr1992_historical_52w.
- Pool scale recalibration (POOL_SCALE_FACTOR 30, FACTION_POOL_SCALE) brought 30w personnel into band (~135k/116k/43k) with deterministic hash reproducibility.
- FORAWWV H2.4 respected: no formation creation without explicit directive or scenario init (formation_spawn_directive / init_formations_oob).

**Recommendations before continuing**

1. **Clarify scenario contract for “historical” vs “player” runs**  
   Document in one place: **apr1992_historical_52w** = full OOB + pool seeding (no recruitment_mode); **historical_mvp_apr1992_52w** = player_choice, few brigades, recruitment UI. Avoid confusion (e.g. “army strengths not up to par” when scenario choice was the cause). Formation-expert defers to PM/Game Designer for naming and docs placement.

2. **Formation_spawn_directive and Phase II-start scenarios**  
   For Phase II-start with OOB init, formation_spawn_directive is typically not set; spawn step is no-op. Reinforcement from pools is what grows OOB brigades. If future scenarios want **both** OOB at init and **emergent** spawn from pools (new brigades mid-campaign), they must set formation_spawn_directive and ensure pool population runs (already true when pools are seeded). No code change required; ensure scenario author checklist or design doc states this.

3. **Pool reporting and diagnostics**  
   Report sums all (mun, faction) pools by faction; scale is strength×30×population weight×faction scale per mun, so aggregates can be large. When debugging “why did faction X get few formations,” trace: organizational_penetration → phase_i_militia_strength → pool available → spawn (batchSize 800, directive, getMaxBrigadesPerMun). Consider adding a single diagnostic in run_summary or end_report for “pool totals by faction at init” for Phase II-start scenarios so Formation-expert-style tracing is easier without re-running.

4. **No change to constants without design/canon**  
   batchSize (800), POOL_SCALE_FACTOR (30), FACTION_POOL_SCALE, getMaxBrigadesPerMun, MAX_MUNICIPALITIES_PER_BRIGADE (3) are all calibrated or derived from canon/design. Do not change for “balance” without Game Designer + Formation-expert alignment and ledger entry.

---

## 3. Wargame-specialist — Current state and recommendations

*Note: No local wargame-specialist skill file exists; this section synthesizes a wargame/design perspective from CONSOLIDATED_BACKLOG, GUI design, bot handovers, and canon.*

**Current state from a wargame perspective**

- **Playable loop:** Desktop “play myself” works: load scenario (or New Campaign → side picker), advance turn, place attack/move/posture orders, recruit from map. Full turn pipeline runs (combat, supply, exhaustion, AoR rebalance, bot orders). Information density is high (War Status, ORDERS/AAR/EVENTS, corps detail, posture picker, target selection). Matches “serious wargame” direction (information density over chrome; NATO ops center).
- **Balance and historicity:** Canonical runs use ethnic_1991 init; control changes only via Phase II battle resolution. RS early-war external support (Drina/Prijedor muns, turn ≤26) and bot strategic objectives (corridor defense, siege targets, consolidation) give early-war asymmetry. 52w historical-fidelity runs (apr1992_historical_52w) produce hundreds of flips and defender-present battles; personnel envelopes are in band with recalibrated pools. Comparison to historical OOB (ARBiH 7 corps, VRS 6, HVO 4 OZs) is documented; 1 brigade ≈ 1k troops for implied personnel.
- **Gaps vs “ideal” wargame:** Operational groups not yet used by bot for multi-brigade ops; “one brigade per target” with OG+operation exception stubbed. AoR imbalance and RS/HRHB behavior remain on backlog. Supply/maintenance/doctrine are partial per canon audit. No multiplayer or campaign layer.

**Recommendations before continuing**

1. **Lock scenario naming and default for “run scenarios”**  
   Default CLI and docs to **apr1992_historical_52w** for “run scenarios” / historical benchmark. Keep **historical_mvp_apr1992_52w** explicitly for “player recruitment, few brigades” so expectations (army size, flips, defender-present) are clear. Reduces “regression” reports that are actually scenario-choice issues.

2. **Bot backlog ordering**  
   From CONSOLIDATED_BACKLOG §7: address **AoR extreme imbalance (HIGH)** and **RS early-war underperformance (MEDIUM)** before adding new systems. Defender-casualty floor and undefended-settlement casualties are in; HRHB near-passive and OG/operation targeting are lower priority. Wargame-specialist recommends Game Designer + Gameplay Programmer agree on one “next bot fix” (e.g. AoR rebalance or RS aggression) and do it before expanding scope.

3. **One source of truth for “what good looks like”**  
   HISTORICAL_FIDELITY_APR1992_SUCCESS_CRITERIA and FORMATION_BRIGADE_VS_HISTORICAL_OOB_COMPARISON should be the reference for “historically plausible” runs. When changing constants (formation-expert) or bot strategy (gameplay), check these docs and run a short 20w/30w checkpoint to avoid drifting away from the agreed band.

4. **UI: no new chrome before correctness**  
   Current setup is already dense. Before adding new panels or flows, fix any remaining “wrong number of brigades / wrong control” issues that stem from scenario choice or bot logic, and ensure replay/dataset UX (Latest run, Jan 1993, failure recovery) stays solid. Information density over aesthetics is already satisfied; next wins are correctness and clarity of scenario intent.

---

## 4. Other roles (brief)

- **Product Manager:** Next single priority to be set after this meeting; if multiple workstreams (formation docs, bot backlog, scenario naming), PM to sequence and hand off per orchestrator direction.
- **Gameplay Programmer:** Implement only what Orchestrator/PM prioritize; preserve determinism and run baselines.
- **Game Designer:** Formation-expert and Wargame-specialist recommendations above assume no canon changes; any design change (e.g. new formation creation rule, new scenario type) requires Game Designer and canon compliance.
- **Technical Architect / Systems Programmer:** No new systems proposed in this meeting; pipeline and state schema remain as-is unless a recommended change touches them.

---

## 5. Synthesis — What needs to change before continuing

**Agreed recommendations**

| # | Change | Owner / note |
|---|--------|----------------|
| 1 | **Document scenario contract** — “Historical 52w” = apr1992_historical_52w (full OOB, pool seeding); “Player recruitment” = historical_mvp_apr1992_52w (player_choice, few brigades). Single doc or checklist so authors and users know which scenario to use for which goal. | PM + Documentation; Formation-expert and Wargame-specialist input above. |
| 2 | **Default “run scenarios” to apr1992_historical_52w** — Already in place per napkin (`npm run sim:scenario:run:default`). Ensure docs and any “run scenarios” instructions point to this default. | Documentation / DevOps. |
| 3 | **Order bot backlog** — Prioritize AoR imbalance (HIGH) and RS early-war (MEDIUM) before new features; one agreed “next bot fix” with Game Designer + Gameplay Programmer. | PM + Game Designer + Gameplay Programmer. |
| 4 | **No formation constant or pool changes without design** — batchSize, POOL_SCALE_FACTOR, FACTION_POOL_SCALE, getMaxBrigadesPerMun, MAX_MUNICIPALITIES_PER_BRIGADE stay unless Formation-expert + Game Designer align and ledger. | Formation-expert + Game Designer. |
| 5 | **Optional: pool/formation diagnostics** — Consider adding init pool totals by faction (or similar) to run_summary/end_report for Phase II-start scenarios to ease “why few formations” tracing. | Gameplay Programmer (optional). |

**Explicitly out of scope for “before continuing”**

- New formation creation mechanics or settlement-level TO entity (canon/design spike would be separate).
- Changing Phase I control flip semantics or re-enabling flips for canonical runs.
- Implementing OG operation targeting or full corps command integration (backlog).
- New GUI panels or flows before bot/AoR correctness is improved.

---

## 6. Single agreed priority and next steps

**Single priority:**  
**Close the scenario-contract and default documentation (recommendation 1 and 2)** so that every future run and report uses the right scenario for the goal (historical 52w vs player recruitment). Then **select one bot backlog item** (AoR imbalance or RS early-war) and assign owner and acceptance criteria.

**Next steps**
1. **Orchestrator → PM:** Sequence (1) scenario-contract doc + default docs check, (2) one bot-fix selection with Game Designer + Gameplay Programmer.
2. **PM → Documentation:** Add or update scenario-author/runner doc with “Historical 52w” vs “Player recruitment” and point to apr1992_historical_52w as default for `sim:scenario:run:default`.
3. **PM → Game Designer + Gameplay Programmer:** Choose AoR rebalance or RS early-war as next bot work; document in backlog or convene and then implement.
4. **Process QA:** After (1)–(3), invoke quality-assurance-process for handoff sign-off if needed.

**Artifacts**
- This meeting: `docs/40_reports/convenes/PARADOX_STATE_OF_GAME_MEETING_2026_02_15.md`
- Ledger: entry appended to `docs/PROJECT_LEDGER.md` for this convening.
