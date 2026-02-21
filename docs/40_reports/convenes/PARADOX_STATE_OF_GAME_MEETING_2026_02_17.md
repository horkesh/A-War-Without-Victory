# Paradox Team — State of the Game Meeting (2026-02-17)

**Convened by:** Orchestrator  
**Date:** 2026-02-17  
**Goal:** Entire Paradox team to provide analysis and suggestions on next steps. Full role coverage: Orchestrator, Product Manager, Technical Architect, Game Designer, Gameplay Programmer, Formation-expert, Scenario-creator-runner-tester, Systems Programmer, QA Engineer, Modern-wargame-expert, Documentation/Reports.

**Reference:** Previous state-of-game meetings: [PARADOX_STATE_OF_GAME_MEETING_2026_02_15.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_15.md), [PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md). Current phase: Phase 6 complete, MVP declared; scope frozen per Executive Roadmap.

---

## 1. Orchestrator — Big picture and single priority

**Where we are**

- **MVP declared** (Phase 6); A1 tactical base map STABLE. Canonical scenarios use `start_phase: "phase_ii"` with `init_control_mode: "hybrid_1992"` (Apr 1992) and battle-only control changes; Phase I control flips disabled at runtime for canonical runs.
- **Desktop (Electron):** Warroom-first launch; side + scenario picker (Sep 1991 / Apr 1992); Phase 0 playable (investments, referendum, declaration events, Phase I transition); Phase I/II advance with full `runTurn`; recruitment UI from map; orders pipeline (attack/posture/move, target selection); tactical map embedded as full-screen layer (no separate window). Staff Map (key 4), War Map enhancements (barbed-wire front lines, defended/undefended, formation markers, labels/AoR cleanup), dual defensive-arc front lines.
- **Scenario split:** **apr1992_definitive_52w** = canonical for desktop New Campaign and default CLI; **apr1992_historical_52w** = legacy 52w benchmark; **historical_mvp_apr1992_52w** = player_choice, few brigades. OOB corrected 2026-02-17: 236 brigades total, 195 mandatory at turn 0.
- **104w run and calibration (2026-02-17):** Engine-only calibration pass (POOL_SCALE_FACTOR 55→65, RS FACTION_POOL_SCALE 1.05→1.15, reinforcement 200/100→260/130, RS mandatory 80→120, battle thresholds and casualty constants tuned). Second pass (casualty magnitude) applied; 16w check shows improved att/def casualties and flips. Run folder and monitoring checklist in ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md.
- **Phase II systems:** Hostile-takeover displacement (timer→camp→reroute), minority flight, civilian_casualties by ethnicity, WIA trickleback; run_summary diagnostics (phase_ii_takeover_displacement, phase_ii_minority_flight, phase_ii_attack_resolution_weekly). Performance: consolidation adjacency cache and garrison coverage reuse reduced 4w run ~159s→~109s; determinism preserved (same final hash).
- **Bot AI:** Three-layer (army → corps → brigade); one-brigade-per-target; consolidation posture; RS early-war support; time-adaptive aggression; player_faction excluded. Backlog: AoR imbalance (HIGH), RS early-war underperformance (MEDIUM), HRHB near-passive, OG/operation targeting stub (CONSOLIDATED_BACKLOG §7).
- **Documented-unimplemented audit and Strategic Design Council audit** on file; Integration handover for external expert references both.

**Where we're going**

- Align on **next steps** from full-team analysis (this meeting). Single agreed priority will be set in §Synthesis; Orchestrator → PM for sequencing if multiple workstreams.

**Handoffs**

- All role inputs captured below; Orchestrator synthesizes in §Synthesis and sets single priority in §Single agreed priority and next steps.

---

## 2. Product Manager — Scope, priority, and sequencing

**Analysis**

- Post–Feb 15: scenario-contract and default documentation were the single priority; bot backlog (AoR imbalance, RS early-war) was “then select one item.” Since then, substantial delivery: Phase 0 gameplay, 104w calibration, displacement (takeover + minority flight), performance fixes, Staff Map/War Map polish, OOB correction. No single “next” has been re-locked after that burst.
- **Competing demands:** (1) Close 104w calibration loop (fill ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION results, optional 52w/104w re-run). (2) Bot backlog: AoR imbalance and RS early-war still HIGH/MEDIUM. (3) Phase 0 polish (e.g. Sep 1991 timing, referendum deadline vs scheduled event). (4) Documented-unimplemented systems (DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT, INTEGRATION handover) — when to pull into plan. (5) Process: keep CONSOLIDATED_* and 40_reports in sync with implemented work.

**Suggestions**

1. **Re-establish one “next single priority”** after this meeting. Options: (A) 104w calibration sign-off and doc fill; (B) One bot-fix (AoR rebalance or RS early-war) with owner and acceptance criteria; (C) Phase 0 deadline/referendum fix if blocking play; (D) One item from Integration handover as a spike. PM recommends Orchestrator pick one of (A)–(D) so PM can sequence and hand off.
2. **Keep scope frozen** for MVP; any new system from the audit or Integration handover should be explicitly added to roadmap/backlog with phase and owner, not ad hoc.
3. **Handoff discipline:** Any new priority gets a short PM note: scope, assumptions, risks, handoff to which role(s), and Process QA checkpoint.

---

## 3. Technical Architect — Architecture and entrypoints

**Analysis**

- **Entrypoints:** PIPELINE_ENTRYPOINTS, REPO_MAP, and CODE_CANON are the source of truth. Desktop flow (warroom → advance-turn → runTurn) and scenario_runner (createInitialGameState, runScenario) are well documented. Phase 0 and Phase II displacement add steps but do not introduce new top-level entrypoints; they fit existing turn_pipeline and runner.
- **Cross-cutting:** Legitimacy, IVP, embargo, Phase 3B/3C, enclave/Sarajevo are feature-gated and wired behind flags; Integration handover describes how they could be turned on and in what order. No new ADR required for current state; any decision to enable a gated system should be documented (and possibly ADR if it affects entrypoints or data contracts).
- **Tech debt:** Browser-safe extraction (legitimacy_utils, etc.) is done; no outstanding “Node in browser” risks noted. Map and desktop single source of truth is docs/20_engineering (TACTICAL_MAP_SYSTEM, DESKTOP_GUI_IPC_CONTRACT).

**Suggestions**

1. **Before adding a new system from the audit:** Confirm with REPO_MAP and PIPELINE_ENTRYPOINTS where it plugs in; if it adds a new entrypoint or state shape, add an ADR or at least an implementation-note in the relevant phase spec.
2. **Keep single source for “what’s implemented”:** IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15 (and its §11–§24 propagation) remains the reference; any new implemented report should be merged into consolidated and propagated per napkin “Canon propagation.”
3. **No architecture change recommended** for next steps; next priority is likely calibration, bot fix, or Phase 0 fix — all within current architecture.

---

## 4. Game Designer — Design intent and canon

**Analysis**

- Canon (Game Bible, Rulebook, Phase specs, Systems Manual) is authoritative. Recent behavior (no-flip default, hybrid_1992 init, RBiH–HRHB alliance timing, displacement takeover/minority flight, WIA trickleback) is reflected in implementation-notes and consolidated implemented work; no canon conflict reported.
- **Balance and historicity:** 104w calibration aims to bring personnel/casualties into historical bands; design intent is “plausible trajectory” not strict replay. STRATEGIC_DESIGN_COUNCIL_AUDIT flagged UI truthfulness (control/supply/cohesion) and “strategic honesty” — advisory; no canon change implied.
- **Formation constants and pool scales** (POOL_SCALE_FACTOR, FACTION_POOL_SCALE, MIN_BRIGADE_SPAWN, etc.) are design-sensitive; Formation-expert and Game Designer alignment required before changes (per Feb 15 meeting).

**Suggestions**

1. **No canon or mechanic change** for next steps unless a chosen priority explicitly requires it (e.g. a new bot behavior that touches Rulebook or Systems Manual). If it does, Game Designer to cite canon and add implementation-note.
2. **Bot backlog:** AoR imbalance and RS early-war are design-relevant (player experience, faction asymmetry). When PM selects “one bot fix,” Game Designer to confirm design intent and success criteria (e.g. “RS more active in first 26 weeks without breaking defender balance”).
3. **Phase 0:** Referendum deadline vs scheduled referendum is a design/timing question; if we fix it, define intended behavior in one sentence and ensure scenario schedule and deadlineTurns align.

---

## 5. Gameplay Programmer — Phase logic and simulation

**Analysis**

- **Pipeline:** Phase 0, Phase I, Phase II pipelines are documented in PIPELINE_ENTRYPOINTS and phase specs. Ordering: phase-ii-recruitment before phase-ii-brigade-reinforcement; phase-ii-wia-trickleback after reinforcement; displacement takeover after attack-resolution flips; minority flight in own step. All deterministic (sorted iteration, seeded RNG where needed).
- **State:** GAMESTATE_TOP_LEVEL_KEYS and serializeGameState are the contract. New keys (e.g. minority_flight_state, civilian_casualties) were added with ledger and propagation. No known missing keys for current features.
- **Performance:** Consolidation adjacency cached by edges ref; garrison coverage reuse; same 4w hash after changes. Safe to keep optimizing hot paths with same determinism checks.

**Suggestions**

1. **Next implementation work** should stay within current pipeline and state schema unless the chosen priority explicitly requires a new step or key (then Systems Programmer + canon compliance).
2. **Bot fixes:** AoR rebalance or RS early-war will touch bot_brigade_ai / bot_corps_ai or brigade_aor; preserve sorted traversal and no Math.random(); run 4w/16w checkpoint and compare run_summary and hash.
3. **Tests:** Keep phase_ii_attack_resolution and run_summary diagnostics covered; add or extend tests for any new pipeline step or state key.

---

## 6. Formation-expert — Militia, pools, AoR, OOB

**Analysis**

- **OOB (2026-02-17):** 236 brigades, 195 mandatory at turn 0 (RBiH 116, RS 80, HRHB 40); 25 non-brigade units removed from catalog. Scenario recruitment resources and desktop NEW_GAME_* constants are aligned with apr1992_definitive_52w.
- **Pools and spawn:** POOL_SCALE_FACTOR 55 (65 in engine-only 104w calibration), FACTION_POOL_SCALE (RBiH 1.20, RS 1.15, HRHB 1.60 in calibrated run). MIN_MANDATORY_SPAWN 200, MIN_BRIGADE_SPAWN 800. RS mandatory mobilization budget (80/turn) addresses pending mandatory brigades when pool was exhausted.
- **AoR:** Corps-directed; HQ mun + up to 2 neighbors; MAX_MUNICIPALITIES_PER_BRIGADE 8; contiguity enforced; same-HQ and missing-HQ fallbacks in place. Bot backlog “AoR extreme imbalance” is behavioral (which brigades get which targets), not formation-spawn logic.

**Suggestions**

1. **Do not change** POOL_SCALE_FACTOR, FACTION_POOL_SCALE, MIN_BRIGADE_SPAWN, MIN_MANDATORY_SPAWN, or MAX_MUNICIPALITIES_PER_BRIGADE without Game Designer + Formation-expert alignment and ledger.
2. **104w calibration:** Second-pass casualty constants (BASE_CASUALTY_PER_INTENSITY 50, MIN_CASUALTIES_PER_BATTLE 15, etc.) are combat-layer; Formation-expert defers to Gameplay Programmer and Game Designer for sign-off. Formation-expert cares that end-state personnel and brigade counts remain traceable to pool/recruitment and OOB.
3. **Optional:** run_summary “pool totals by faction at init” (or similar) still recommended for “why few formations” debugging; low priority.

---

## 7. Scenario-creator-runner-tester — Scenarios and historical fidelity

**Analysis**

- **Scenario contract** is documented: apr1992_definitive_52w (canon desktop/CLI default), apr1992_historical_52w (52w benchmark), historical_mvp_apr1992_52w (player_choice, few brigades). hybrid_1992 + apr1992 init used for April 1992 starts; RBiH-aligned municipalities and rbih_hrhb_war_earliest_turn in place.
- **104w run:** ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION defines historical bands and monitoring checklist. Results (e.g. personnel, flips, casualties) should be compared to Sept/Dec 1992 bands and plausibility for 1994.
- **Displacement:** run_summary now includes phase_ii_takeover_displacement, phase_ii_minority_flight, civilian_casualties; audits (DISPLACEMENT_TAKEOVER_12W_AUDIT, DISPLACEMENT_PHASE_D_VALIDATION) exist. Scenario-creator-runner-tester can use these to flag ahistorical population or casualty patterns.

**Suggestions**

1. **Fill 104w calibration report** with actual results from the last 104w run (historical_alignment final, phase_ii_attack_resolution totals, control deltas) so we have a baseline for “next steps” and future comparison.
2. **Short checkpoint runs** (16w, 20w, 52w) for any bot or combat change; compare run_summary and end_report to this baseline before claiming improvement.
3. **Sep 1991 scenarios:** If Phase 0 referendum/schedule is fixed, scenario-creator-runner-tester to sanity-check sep_1991_phase0 (and any scheduled referendum scenario) for declaration timing and transition.

---

## 8. Systems Programmer — Determinism and core systems

**Analysis**

- **Determinism:** DETERMINISM_TEST_MATRIX and Engine Invariants govern. Recent work: uniqueRunFolder uses monotonic counter; displacement and minority flight use sorted iteration and deterministic routing; WIA trickleback and battle resolution use fixed constants and stable ordering. No timestamps or Math.random() in sim hot paths; bot uses seeded RNG.
- **Serialization:** GAMESTATE_TOP_LEVEL_KEYS updated for new state; replay_timeline and run_summary are canonicalized (e.g. control_events sorted). No known nondeterminism introduced in Phase 0 or Phase II displacement.

**Suggestions**

1. **Any new pipeline step or state key:** Ensure sorted iteration and stable ordering; add to GAMESTATE_TOP_LEVEL_KEYS if persisted; run determinism test (same scenario, two runs, same hash).
2. **Performance patches:** Consolidation and garrison caching are safe (edges-ref cache, no new iteration order). Continue pattern: cache by stable ref, reuse sorted structures.
3. **No change** to determinism contract recommended for “next steps”; next priority is likely calibration or bot logic within existing invariants.

---

## 9. QA Engineer — Test strategy and regression

**Analysis**

- **Node vs Vitest:** npm test (node:test) and test:vitest (7 suites) are separate; napkin documents both. Guards: no-flip, Phase II diagnostics, B3 counter-offer, partial-system state tests; determinism and scenario init tests in place.
- **Regression:** Baseline hashes and run_summary comparisons are the main regression signal for sim. GUI and desktop are exercised by build and manual flow; no full E2E automation for desktop advance flow.

**Suggestions**

1. **Before release of next priority:** Run typecheck, npm test (or critical subset), test:vitest; one short scenario run (e.g. 4w) and confirm hash or run_summary key metrics if sim changed.
2. **104w / long runs:** Use for calibration and sign-off, not as gate for every commit; keep 4w/16w as fast regression check.
3. **Process QA:** Invoke quality-assurance-process after Orchestrator/PM handoffs and before merge when process is in scope.

---

## 10. Modern-wargame-expert — Advisory (UI/UX, strategic layer)

**Analysis**

- **Advisory only:** No new mechanics or canon edits. STRATEGIC_DESIGN_COUNCIL_AUDIT already captured genre mirror, strategic honesty, UI misrepresentation risks, and FORAWWV addendum candidates.
- **Current UI:** Information density is high (War Status, ORDERS/AAR/EVENTS, corps/brigade panels, replay); NATO ops-center aesthetic and Staff Map/War Map improvements support “serious wargame” direction. Control/supply/cohesion representation remains a known gap vs ideal (documented in audit).

**Suggestions**

1. **Next steps:** Prefer correctness and clarity over new chrome. Ensure scenario intent (historical vs player_choice) and dataset labels (Latest run, Jan 1993, baseline) are unambiguous so players do not misinterpret “wrong” numbers.
2. **Bot and calibration:** More plausible faction behavior (AoR balance, RS activity) improves “strategic honesty”; no UI change required for that.
3. **No new panels or flows** recommended until bot/AoR and calibration are in a good state; then revisit audit items (e.g. supply/cohesion display) if needed.

---

## 11. Documentation / Reports Custodian — Docs and 40_reports

**Analysis**

- **CONSOLIDATED_IMPLEMENTED** points to IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15 (sections 1–24); CONSOLIDATED_BACKLOG §1–§8; CONSOLIDATED_LESSONS_LEARNED. 40_reports README and docs_index reference state-of-game meetings and convenes.
- **Propagation:** New implemented reports are merged into consolidated and propagated to canon (Phase I/II, Systems Manual, TACTICAL_MAP_SYSTEM, context, PROJECT_LEDGER_KNOWLEDGE, ledger) per napkin “Canon propagation.”
- **Gaps:** 104w calibration report (ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION) has placeholder for “fill results when run completes”; some convenes could be linked from CONSOLIDATED_BACKLOG if they drive next work.

**Suggestions**

1. **When next priority is chosen:** Add or update one convene or handoff doc that states the priority, owner, and acceptance criteria; link from CONSOLIDATED_BACKLOG or README if it’s a backlog item.
2. **This meeting:** Add PARADOX_STATE_OF_GAME_MEETING_2026_02_17 to CONSOLIDATED_BACKLOG §6 (state-of-game meetings) and to 40_reports README.
3. **No doc restructure** recommended; keep single consolidated implemented doc and pointer pattern.

---

## 12. Synthesis — What the team recommends for next steps

**Agreed recommendations**

| # | Recommendation | Owner / note |
|---|----------------|--------------|
| 1 | **Set one “next single priority”** — Choose among: (A) 104w calibration sign-off and doc fill, (B) One bot-fix (AoR rebalance or RS early-war) with owner and acceptance criteria, (C) Phase 0 referendum/deadline fix if blocking, (D) One Integration-handover spike. | Orchestrator (decide); PM (sequence and hand off). |
| 2 | **Fill 104w calibration report** — Populate ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md §6 (or equivalent) with actual run results (historical_alignment, phase_ii_attack_resolution, control deltas) for baseline and future comparison. | Scenario-creator-runner-tester or Orchestrator; Documentation link. |
| 3 | **Keep scenario and formation constants stable** — No change to POOL_SCALE_FACTOR, FACTION_POOL_SCALE, MIN_BRIGADE_SPAWN, formation_spawn_directive semantics, or scenario contract without Formation-expert + Game Designer alignment and ledger. | Formation-expert, Game Designer. |
| 4 | **Bot backlog ordering** — When selecting “one bot fix,” prioritize AoR imbalance (HIGH) or RS early-war (MEDIUM); Game Designer to confirm design intent and success criteria; Gameplay Programmer to implement with determinism and 4w/16w checkpoint. | PM + Game Designer + Gameplay Programmer. |
| 5 | **Documentation and 40_reports** — Add this meeting to CONSOLIDATED_BACKLOG §6 and 40_reports README; when next priority is chosen, add convene/handoff with priority, owner, acceptance criteria. | Reports Custodian; Documentation. |

**Explicitly out of scope for immediate next steps (unless chosen as priority)**

- Enabling gated systems (legitimacy, IVP, Phase 3B/3C, embargo, enclave/Sarajevo) without explicit roadmap inclusion.
- New formation mechanics or canon changes.
- Re-enabling Phase I control flips for canonical runs.
- Full OG/operation targeting implementation (backlog).
- New GUI panels or flows before bot/AoR and calibration are in a good state.

---

## 13. Single agreed priority and next steps

**Single priority (Orchestrator decision):**  
**Re-establish one next priority from the four options (A–D) and document it.** Recommended default: **(A) 104w calibration sign-off and doc fill** so the project has a clear baseline and closed loop before committing to the next bot or Phase 0 change. If (A) is already satisfied (results filled), then **(B) One bot-fix (AoR rebalance or RS early-war)** with owner and acceptance criteria.

**Execution update (2026-02-17):**  
**(A) Complete.** [ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md](ORCHESTRATOR_104W_APR1992_RUN_AND_CALIBRATION_2026_02_17.md) §3 checklist cross-referenced to §6; §7 Sign-off and baseline added (doc fill complete, calibration loop closed, full 52w/104w n121 re-run deferred). **Next single priority: (B) One bot-fix** — AoR rebalance or RS early-war, with owner and acceptance criteria. PM to produce short scope + handoff; Game Designer + Gameplay Programmer to agree on which fix, success criteria, and checkpoint run (4w/16w).

**Next steps**

1. ~~**Orchestrator:** Confirm whether 104w results are already filled…~~ **Done.** Sign-off in 104w report §7.
2. **Orchestrator → PM:** Priority (B) selected. PM to choose AoR rebalance or RS early-war; produce short scope + handoff and assign owner(s).
3. **PM → Game Designer + Gameplay Programmer:** Agree on one bot-fix (AoR or RS early-war), success criteria, and checkpoint run (4w/16w).
4. **Reports Custodian:** This meeting already in CONSOLIDATED_BACKLOG §6 and 40_reports README; no further update needed unless next convene is created for (B).
5. **Process QA:** After (B) handoff is executed, invoke quality-assurance-process for sign-off if needed.

**Artifacts**

- This meeting: `docs/40_reports/convenes/PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md`
- Ledger: entry appended to `docs/PROJECT_LEDGER.md` for this convening.
