# Life Lessons — Index

> Last restructured: 2026-04-11. 254 lessons across 9 topic files. Last updated: 2026-06-11.
> **Read this index every session.** Then load ONLY the topic files relevant to your current task.
> When adding new lessons, add them to the appropriate topic file and update the count here.

## New Lessons (2026-06-11)

### [Process] Worktree-isolated agents die silently on npm install — run scenario/test agents in MAIN checkout — see `docs/life_lessons/process.md`
- 3 D2-audit/build agents died at puppeteer download in fresh worktrees, 0 output bytes, no error. Fresh worktrees have no node_modules. Rule: scenario/test/build agents → MAIN checkout (708 pkgs intact); isolate ONLY artifact-reading docs/JSON agents. Re-validates "worktree agents are code generators" (2026-04-15) at a new fatal failure mode.

### [Process] `.bin` shims are empty — invoke packages directly via `node node_modules/<pkg>/dist/...` — see `docs/life_lessons/process.md`
- `node_modules/.bin/tsx` and `.bin/vitest` are empty shims in this environment. Use: tsx = `node node_modules/tsx/dist/cli.mjs`, vitest = `node node_modules/vitest/vitest.mjs run`. Prefer `npm run test:vitest`.

### [Process] Exclusive checkout ownership extends to the git WORKING TREE — one agent owns main at a time — see `docs/life_lessons/process.md` (promotes 2026-03-29)
- Multiple agents with git-write authority to the same checkout caused branch-HEAD drift and commit confusion. Rule: one main-checkout agent at a time; others use worktrees or wait; every branching agent restores HEAD to `main` before yielding. Promotes "exclusive file ownership" (2026-03-29) to working-tree level.

### [Calibration] Byte-identical hash when territory was expected to move = lever is INERT — instant NO-GO, don't theorize — see `docs/life_lessons/calibration.md`
- `planning_duration 5→3` returned hash == floor `345e044b` because op launch is Storm-trigger-bound, not planning-clock-bound. Hash equality is the fastest rejection signal. Close as NO-GO immediately; investigate the code path, then pivot to a different lever.

### [Process/Calibration] Memory briefs decay in ~48h under active development — re-diagnose against current main before running — see `docs/life_lessons/process.md` (promotes 2026-04-24)
- A 2-day-old brief misdirected two runs today: retired "follow-on" framing, stale "deep ceiling" conclusion, and an inert `planning_duration` lever. Write the assumed floor hash at the top of every brief; if current hash ≠ stated hash, the brief is stale. Re-validates "Verify inherited session-summary premises" (2026-04-24) at calibration-brief scope.

### [Operations] `planning_duration` is fully inert when op launch is event-trigger-bound + staging-gated — see `docs/life_lessons/calibration.md` (extends 2026-04-02)
- Op Sana fires at W175 via Storm trigger; `planning_duration` is not on that gate path. To shift a triggered op's timing, target the event `turn_min` or staging adjacency — not `planning_duration`. Extends the 2026-04-02 "parallel timers" lesson.

### [Operations] `getCurrentLaunchObjectives()` returns ONE objective per axis per turn — deep tails require parallel axes — see `docs/life_lessons/calibration.md`
- A single deep axis is depth-capped at 1 OSID/turn regardless of brigade count. To land a tail objective in-budget, SPLIT at a mid-chain OSID that is adjacent to the tail's head — each parallel axis advances independently. From the 506th-brigade Ključ investigation.

### [Process] Verify agent liveness before waiting — 0-byte output past expected window = dead → re-dispatch — see `docs/life_lessons/process.md`
- Orchestrator held for a dead audit agent (died at npm install, 0 output bytes) across multiple turns. Rule: check output growth at the expected completion time; if 0-byte past the window, re-dispatch as a main-checkout artifact-reading analyst immediately.

## New Lessons (2026-05-26)

### [Calibration] Rule 4 violations are NOT uniformly safe to remove — wrong-capture vs attrition-sink distinction — see `docs/life_lessons/calibration.md`
- Krivajevici (R29) was in the mismatch list (sim=RS, painted=RBiH — VRS CAPTURING it incorrectly) → removing safe: +9 count. Hotonj (R31) NOT in mismatch list (sim=RBiH, correctly matched — VRS FAILING to capture it, attrition-sink) → removing freed brigades from futile combat → −17 count. Before removing any Rule 4 violation, check `compare_painted_vs_sim.cjs`: if OSID is in mismatch → wrong-capture (safe); if NOT in mismatch → attrition-sink (load-bearing, do not remove).

### [Calibration] Event-based control_change is cascade-safe for historically datable territory changes — see `docs/life_lessons/calibration.md`
- R32 added control_change to `operation_storm_1995` for 9 Sanski Most OSIDs (painted=RBiH, sim=RS): +6 count / +0.8pp area, HRHB cascade intact (120 vs 121). Same pattern as R26 Srebrenica (+9). Events fire at turn 174+, after all combat ops resolved → no brigade attrition cascade. For "RS holds territory at Dayton that history liberated", add control_change to the existing event in `war_1995.json` rather than modifying op objectives.

### [Calibration] Audit ALL existing op objectives for Rule 4 violations — not just new ones — see `docs/life_lessons/calibration.md`
- krivajevici (Op Prsten, ilijas_ring) was a painted=RBiH VRS objective that sat undetected until a calibration mismatch flagged it. Removing it as a one-line subtractive change produced +9 correctly placed OSIDs (+2.7pp area). Rule: before any calibration session, run a bulk audit of all op objectives against `painted_control_oct1995.json` — cross-faction objectives are Rule 4 violations regardless of when they were written.

### [Calibration] Injecting a pre-planned op on a corps with an existing triggered op causes home-base losses even if the op never executes — see `docs/life_lessons/calibration.md`
- R28: Op Sana 95 (arbih_5th_corps) queued behind a triggered "Operation Sana" and stayed in planning w173-188 with zero captures. Brigade marching toward staging during planning vacated bosanska_krupa defensive sectors → VRS captured 6 correctly-RBiH OSIDs. Net: −6. Rule: before adding any pre-planned op, check `triggered_operations.ts` for existing ops on that corps. If one exists, the pre-planned always queues too late and brigade marching during planning creates defensive gaps with zero upside.

### [Calibration] Subtractive pre-planned op changes are the productive calibration lane — additive changes hit cascade ceiling at R22 — see `docs/life_lessons/calibration.md`
- Five consecutive additive pre-planned ops (R23/R24/R25/R27/R28) all regressed or were zero-delta. First subtractive change (R29) produced +9 count / +2.7pp area — largest single gain of the calibration arc. Mechanism: adding combat disrupts the HRHB western-Bosnia cascade; removing combat enhances it. Rule: when additive pre_planned changes consistently cascade negatively, switch to auditing existing op objectives for removal candidates (Rule 4 violations, non-adjacent dead-ends, painted-wrong-faction targets).

## New Lessons (2026-05-29)

### [Process] STOP-and-report safeguard prevents broken cleanups when audits recommend deletion — see `docs/life_lessons/process.md`
- Phase I cleanup arc (Packets I3a/I5/I6) fired the safeguard 5x correctly. Audit recommendations are hypotheses, not commands; dispatched agents must verify across `src/` + `tests/` + `tools/` and STOP if a live consumer is found. Per-entry triage outcomes: CLEANED / SKIPPED-CONSUMER / DEFERRED-CALIBRATION / DEFERRED-PACKET / COMMENTS-CURRENT.

### [Process] Audit "0 importers" claims must be verified across src + tests + tools before deletion — see `docs/life_lessons/process.md`
- Phase I1 audit's "0 importers" claims were scoped to `src/**` only; Phase I3 aborted 3 separate cleanup cycles when test-file imports surfaced. Pre-deletion grep must cover all three scopes; ambiguous-scope audit text defaults to scoped-to-src.

### [Calibration] Baseline-byte-identical is the proof-of-deadness for cleanup commits — see `docs/life_lessons/calibration.md`
- Pure dead-code removal must produce zero baseline drift. If `tools/scenario_runner/run_baseline_regression.ts` reports any artifact hash change post-cleanup, the code wasn't dead — restore and re-investigate consumers. Phase I2/I4/I5/I6 all proved byte-identical; I3a's narrowed scope (4 zero-importer exports only) was the corrected version after the broader I3 aborted.

## New Lessons (2026-05-28)

### [Events] Engine has two write channels for event effects — pick the right one — see `docs/life_lessons/events.md`
- `dimension_shifts[].dimension` requires a typed `DimensionId` (6 names only); `effects[].kind` requires an `EffectKind` from `EFFECT_KIND_ORDER`. The two vocabularies are disjoint — wrong-channel authoring is a silent DEAD write at runtime. Loader validation (Packet 44, `event_loader.ts:939+1003`) now catches both at catalog load. Pre-validation, 11 DEAD writes had accumulated across 6 packets. See `memory/engine_dimension_vocabulary.md` for the canonical map.

## New Lessons (2026-05-24)

### [Process] Skills are helper memory, not canon authority - verify live paths before prompts � see `docs/life_lessons/process.md`
- A Claude calibration prompt cited stale v0.6 canon paths because a local role skill was stale. Rule: before generating prompts, handoffs, or agent instructions that cite canon files, run a live path check against `docs/10_canon/`. If a skill disagrees with disk, fix the skill and document the sweep.
## New Lessons (2026-05-17)

### [Process] Sub-agent "wrote file" claims with synthetic verification outputs can be fully hallucinated — parent-side Glob audit is mandatory — see `docs/life_lessons/process.md`
- 14-agent parallel plan-drafting dispatch returned 6 reports with plausible-looking `ls -l` byte counts and `git diff --check clean` outputs, but parent-side `Glob` + `git status` after the batch showed those 6 paths did not exist on disk. Re-dispatch with hard verification protocol (Bash `ls -l` + Read offset=0 limit=15 + git status literal-paste) recovered all 6. Rule: for any parallel Write-tool dispatch ≥3 agents, run parent-side `Glob` + `git status --short` before consolidating outputs. Treat agent verification text as draft; treat parent-side filesystem state as ground truth. Re-validates the 2026-03-28 lesson "Verify agent edits landed on disk" at 14-agent scale.

## New Lessons (2026-04-26)

### [Process] Don't trust an expert hypothesis without empirical verification — see `docs/life_lessons/process.md`
- Issue #20 (Option K) was filed based on `/scenario-creator-runner-tester` hypothesis that HRHB silence was a "campaign-plan wiring problem" — `briefing.campaign_offensive_targets` allegedly empty. Empirical check of `state.military.campaign_plans.HRHB.front_priorities` at turn 188 final_save proved the campaign plan was fully populated with reachable targets (Mostar east bank, Maglaj, Gornji Vakuf — 1994 Cincar axis, Posavina). The hypothesis was empirically wrong. Real binding constraint was `fitness_offense < 0.4` due to cohesion floor → tier=garrison → N1297 → defensive-locked. Rule: when an issue body cites an expert hypothesis, verify it against persisted state (`final_save.json`, `weekly_report.jsonl`, `decision_trace`) before designing fixes around it.

### [Calibration] Headline metrics undercount — check destroyed_brigades + battles attribution before declaring "no change" — see `docs/life_lessons/calibration.md`
- Option K Fix A 188w showed HRHB "0 attacks / 1 op" identical to pre-Fix-A. Looked like a no-op. `/war-or-game` audit caught what the metric missed: Vitezovi fought 12 battles, took 2,587 casualties, destroyed turn 122; 5 other HRHB brigades destroyed in real combat. HVO IS fighting via reactive defense / loan / attachment — just not authoring `CorpsOperation` records. Rule: a "0 attacks" headline can mean (a) brigade never engaged, (b) brigade engaged via non-faction-led mechanism. Always cross-reference `destroyed_brigades.json` and per-brigade `battle_outcome_count` before concluding no change.

### [Architecture] State already persists what you'd otherwise instrument — check before writing diagnostic scripts — see `docs/life_lessons/architecture.md`
- Option K experts recommended writing instrumentation to dump `briefing.campaign_offensive_targets`, `decision_trace.hard_constraints`, etc. per-corps per-turn. State already does this: `state.military.corps_command[corpsId].commander_state.decision_trace` persists between turns; `state.military.campaign_plans[faction].front_priorities` persists across plan-validity windows. Reading `final_save.json` directly answered the diagnostic without a single line of new instrumentation code. Rule: before extending `commander_debug.ts` or writing a one-shot tracer, search for `decision_trace`, `force_assessment`, `commander_state` in saved state — the data is probably already there.

## New Lessons (2026-04-24)

### [Process] Verify inherited session-summary premises against the actual data before acting — see `docs/life_lessons/process.md`
- Option J inherited "all 249 brigades have equipment_class: unspecified" from a compacted session summary. False — OOB already had 137 light_infantry, 79 mountain, 20 motorized, 6 mechanized, 5 police, 2 special. Caught mid-execution; would have shipped bad framing if unchecked. Rule: before acting on a summary-level claim about data state, run one query against the actual file.

### [Calibration] Test OOB promotions in scenario before shipping — historical ahistoricalness can be empirical not theoretical — see `docs/life_lessons/calibration.md`
- Option J's `rs_1st_zvornik: mountain → motorized` looked historically reasonable (Drina Corps ran Srebrenica offensive July 1995). Empirical 188w run showed it caused Srebrenica to fall at w40 (Jan 1993). Reverted. Rule: for any OOB tier change that unblocks a corps, run the scenario once BEFORE committing — theoretical plausibility can hide ahistorical cascade.

### [Architecture] One gate may hide another — confirm the full causal chain before closing "unblocks X" issues — see `docs/life_lessons/architecture.md`
- Issue #13 diagnosis framed N1297 organizational readiness gate as THE blocker for HRHB offensives. Option J unblocked N1297 correctly, but HRHB still produced 0 attacks / 1 op in 188w. The real blocker is downstream in campaign-plan target generation. Rule: before declaring an issue closed, verify the binding constraint hasn't just moved.

## New Lessons (2026-04-16)

### [Architecture] Atrocity is a consequence, not a lever — see `docs/life_lessons/architecture.md`
- v0.9.0 Sensitive History Design Gate settled in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`. Three rings: modeled (Ring 1), narrative (Ring 2), refused (Ring 3). Any sensitive-history feature must fit a ring or not be built.

### [Architecture] The least bad version of a tragedy — scoring thesis for negative-sum games — see `docs/life_lessons/architecture.md`
- v0.9.0 Victory Conditions canon settled in `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`. Score is supporting context; outcome class + grade are the primary verdict drivers; condemnation flags can cap or taint any result. No leaderboards, no "winner" labels.

## New Lessons (2026-04-15)

### [Process] Worktree agents produce uncommitted changes — extract, apply, verify on main — see `docs/life_lessons/process.md`
- All 5 worktree agents (Lanes A–E) couldn't verify/commit — 8000+ tsc errors from missing UI workspace deps. Changes extracted as patches, applied to main. Treat worktree agents as code generators, not self-contained CI.

### [Process] Verify pipeline step names by grepping the actual pipeline, not agent memory — see `docs/life_lessons/process.md`
- Investigation agent said `evaluate-patron-events`, actual name was `update-patron-pressure`. Test failed. Always grep `name:` field in war_phases.ts before writing step-name tests.

### [Architecture] Scenario proof requires turn-threshold analysis before claiming feasibility — see `docs/life_lessons/architecture.md`
- Rupture needs turn >= 140. 40w/52w scenarios can't reach it. 188w run proved correct non-firing (Srebrenica held). Check precondition thresholds against scenario lengths BEFORE promising proof.

### [Architecture] Correct non-firing is valid scenario proof for condition-gated behavior — see `docs/life_lessons/architecture.md`
- 188w: Srebrenica held → rupture correctly did NOT fire. This proves the gate works. Non-firing when conditions aren't met IS proof, not a gap.

### [UI] Component mount tests require React at root level — see `docs/life_lessons/architecture.md`
- React in `src/ui/map/node_modules` doesn't help vitest at root. Install react + @testing-library/react at root to unblock mount tests.

## New Lessons (2026-04-10)

### [Architecture] Validator exemptions that suppress real sim failures are always wrong — fix the sim — see `docs/life_lessons/architecture.md`
- bb454db4 exempted army HQ brigades from unresolved-sector validator. Hid a real sim gap (65th genuinely unresolved). dc742d9e fixed the actual sim. Pattern: when a validator fails, fix the system under test, not the test harness.

### [Architecture] Latent contract violations are worth closing proactively — don't wait for live triggers — see `docs/life_lessons/architecture.md`
- rescueUnassignedLoanedElitesInTerritory() could bypass 1-reserve-per-sector invariant. Zero delta (n1420 = n1421). Guard added anyway. If a code path CAN violate an invariant, fix it now.

### [UI] Player-facing state must go through tier-gated abstractions — never expose raw numerics — see `docs/life_lessons/ui_map.md`
- 6 hardening commits follow same pattern: replace raw state with playerSafe*() functions. The abstraction boundary IS the information control point.

---

## New Lessons (2026-04-09)

### [Process] Update working-on.md at every commit — not just at session start — see `docs/life_lessons/process.md`
- Napkin violation (2026-04-08): file covered first 3 lanes, stale for 3+ hours across 6 subsequent commits. working-on.md is a crash-recovery artifact — treat updating it as a mandatory commit checklist step, like tsc and vitest. Delete only at session closeout.

### [Testing] Proof tests for completed operations must read operation_aars.json — not active_operations — see `docs/life_lessons/process.md`
- active_operations is empty after completion — that's correct behaviour, not a test failure. Proof tests for historical ops must read `operation_aars.json` (the archival record) and verify presence, outcome, and objectives there.

### [Testing] Trigger conditions must encode prerequisite completion history — not just time gates or corps state — see `docs/life_lessons/process.md`
- `Operation Herzegovina Consolidation` false-triggered on noop harnesses via `turn >= N && corps idle`. Fix: require `operation_aars` proof for prerequisite ops (Višegrad, Foča). Any trigger that passes on a noop harness fires at wrong times in real scenarios.

### [Architecture] Final reconciliation passes required after all late writers — sector truth and operation truth — see `docs/life_lessons/architecture.md`
- Recruitment, mobilization, elite-loan recall, and dissolution all fire after sectors/ops are built. Two new war-phase steps (`reconcile-final-sector-truth`, `reconcile-final-operation-truth`) rebuild authoritative state after all late writers. Every new late writer must be checked against these passes.

### [Architecture] Operation birth quality and runtime truth are distinct failure classes — fix each separately — see `docs/life_lessons/architecture.md`
- n1367: ZEA 52.6%, 94 invalid ops, zombie op. Required three separate passes: (1) harness/birth quality, (2) runtime truth reconciliation, (3) orchestration honesty. Each anomaly counter maps to a distinct code area. Don't conflate them.

### [Architecture] Active operation participants must be pinned against generic attack-share trimming — see `docs/life_lessons/architecture.md`
- Committed brigades' attack orders were stripped by generic per-corps trimming after op launch. Fix: `isPinnedActiveOperationAttacker(...)` exempts execution-phase op participants. Any new trimming/friction pass must check this before removing attack orders.

---

## New Lessons (2026-04-08)

### [Desktop] Extend the probe manifest — never add parallel probe commands — see `docs/life_lessons/platform.md`
- 6 desktop routes proved by extending one `desktop:package:probe` manifest, not by creating parallel probe commands. Parallel commands fragment the CI contract. Add new routes as `window_checks[]` entries; only create a new probe command if the route requires a fundamentally different launch environment.

### [Desktop] Unit tests cannot prove packaged-mode behavior — CI needs a separate packaged probe job — see `docs/life_lessons/platform.md`
- `desktop-release-guard.yml` added after recognizing tsc+vitest+build passes even when packaged asar resolution or window routing is broken. `desktop:package:probe` must be a mandatory CI gate before any release artifact ships.

### [Architecture] Warroom boundary law: `extractWarData()` is the only raw-state reader — see `docs/life_lessons/architecture.md`
- 6 boundary cleanups found the same violation: warroom components reading `state.political.*`/`state.military.*` directly. Fix pattern: extend `WarDataSnapshot`, consume from snapshot. Grep audit: `state\.political\.|state\.military\.` inside `src/ui/warroom/components/`.

### [Architecture] Explicit undefined beats implicit missing-case in navigation maps — see `docs/life_lessons/architecture.md`
- `mapRegionToShellCommand()` returning `undefined` for `desk_map` meant "navigate to map" but looked like a missing case. Fix: explicit JSDoc block naming the intentional unmapped region and its downstream effect.

### [Architecture] Territory observability determines fog-gate requirement — classify snapshot fields before adding — see `docs/life_lessons/architecture.md`
- Before adding to `WarDataSnapshot`: classify Tier 1 (player-only, fog-gated), Tier 2 (publicly observable), or Tier 3 (derived from player actions). Document the tier in JSDoc. Missing classification defaults to implicit Tier 1 — wrong for territory control, exhaustion, and other observable facts.

---

## New Lessons (2026-04-07)

### [Testing] Integration test geographic boundaries are historical claims — apply historian gate — see `docs/life_lessons/process.md`
- `SARAJEVO_MUNICIPALITIES` included `'pale'` (RS political capital, 20 km east of siege perimeter) without historian review. Non-SRK VRS transit through Pale is historically plausible. Test had been wrong since creation. Fix: remove `pale`; keep >80% threshold. Rule: any municipality/OSID list in a test is a historical claim — run it past the Historian role before committing.

### [Process] "Pre-existing and unrelated" is NOT a lane-close condition — see `docs/life_lessons/process.md`
- DRINA commit (`aa30dac8`) documented "1 pre-existing SRK deployment failure" and still closed Phase F. Required an unplanned correction session. Rule: repo truth = 100% green. Either fix in the same commit, or open a named ticket — do NOT mark the lane closed until green. "Pre-existing" is record-keeping, not resolution.

### [Testing] When a ratio test fails at the margin, check the denominator set before adjusting the threshold — see `docs/life_lessons/process.md`
- 6/8 = 0.75 failed >0.80. First instinct: lower threshold. Correct action: inspect the 8-brigade set. Two were in `pale` — wrong boundary, not wrong threshold. Rule: when a percentage test fails within 10pp of threshold, the set is more likely wrong than the threshold.

### [Process] Historian adjudication is the right tool for test boundary disputes — see `docs/life_lessons/process.md`
- When a test encodes geography or OOB, the Historian (ICTY-first source hierarchy) is the correct arbiter — not intuition or threshold-lowering. Used 2026-04-07: sr.wiki brigade data proved Guards Brigade base = Han Pijesak, not Rogatica. Also exposed a secondary OOB error (`rs_1st_guards_motorized` wrong `home_osid`).

---

## New Lessons (2026-04-06)

### [Data] Peace plan proposed_split constants are historical claims AND routing parameters — historian gate before commit — see `docs/life_lessons/data_pipeline.md`
- O-S RS:30→52 flipped routing from auto-reject to scoring (gap 35pp→13pp). VOPP RS:30→43 changed floor calibration. Wrong constant = wrong faction behavior, not just wrong display. Add `// Source: [citation]` to every `proposed_split` entry; absence = unverified.

### [Data] Sim territory is OSID-count; historical sources are area-weighted — design floor thresholds in sim units — see `docs/life_lessons/data_pipeline.md`
- VOPP floor: area-weighted gap = 27pp, sim OSID-count gap = 22pp. A 27pp floor would never trigger. Always compute `sim_gap = RS_osid_count_pct − proposed_RS_pct` before finalizing any threshold.

### [Architecture] A single floor threshold across structurally different peace plans silently fails — per-plan map required — see `docs/life_lessons/architecture.md`
- CG: 14pp sim gap < 18pp single floor → silently routed to scoring for 3 phases. 96% referendum was ignored by engine. Per-plan `RS_PLAN_FLOOR_GAPS` with explicit entry and OSID-count gap for every plan.

### [Architecture] Political engine changes gated on specific trigger_weeks are calibration-safe by construction — see `docs/life_lessons/architecture.md`
- All Phase 5+6 political changes showed 0.0pp calibration delta. Root cause: `peace_plans.ts:139` gates on `trigger_week === warWeek`. If all trigger weeks exceed scenario duration, state "calibration-inert by construction" — the unchanged calibration is a correctness property.

---

## New Lessons (2026-04-05)

### [Architecture] BFS spanning tree edges are NOT the graph — bridge detection on a tree is trivially 100% bridges — see `docs/life_lessons/architecture.md`
- `runSupplyBfs` records only tree edges in `edges_used`. Bridge detection on this tree classified 100% of edges as brittle, collapsing supply adequate-BFS to source nodes only. The OSID graph is a dense mesh (avg degree 5.75) with abundant redundancy. When analyzing graph properties (bridges, connectivity), always operate on the actual subgraph, not the BFS traversal tree.

### [Architecture] When a guard is added to one pipeline path, audit ALL paths that produce the same outcome — see `docs/life_lessons/architecture.md`
- Lane A added a drifted-brigade gate to `assignCrossCorpsEnclaveDefenders` (Step 6b) but NOT to `rehomeUnassignedBrigadesToPhysicalSectorOwners` (Step 8d). Banja Luka LI brigades were protected at 6b but fell through at 8d. When adding a guard to prevent outcome X, grep for EVERY function in the pipeline that can also produce X.

### [Architecture] Movement orders must declare stance explicitly — missing stance silently changes the processing system — see `docs/life_lessons/architecture.md`
- Fix B wrote `{ destination_sids }` without `stance: 'column'`. `osid_column_movement` requires `stance === 'column'`; without it, `apply-brigade-movement` attempts single-hop adjacency which silently fails for distant destinations. Always include `stance: 'column'` for multi-hop movement orders.

---

## New Lessons (2026-04-04)

### [Architecture] Never cast LoadedGameState to raw GameState — the adapter boundary is the contract — see `docs/life_lessons/architecture.md`
- `ChiefOfStaffBriefing` used `as unknown as GameState` to call `computeCorpsCommandStrain` — crashed reading `state.military.corps_command` which doesn't exist on `LoadedGameState`. The adapter already had `commandStrain`/`commandStrainLabel` on `FormationView`. NEVER bypass the adapter boundary with double-casts.

### [Architecture] Engine-written data with no UI consumer is invisible infrastructure debt — see `docs/life_lessons/architecture.md`
- `friction_events[]` fired every turn since v0.4.4 — zero UI consumers — player had zero visibility. A mechanic is not implemented until it has BOTH a write path AND a read path that reaches the player. Mark PARTIAL in ledger if either is missing.

### [Architecture] Derive gameplay display signals on-read — never add computed fields to GameState — see `docs/life_lessons/architecture.md`
- `command_strain` computed in pure `command_strain.ts` → adapter → `FormationView`. GameState holds canonical facts; adapter derives display signals. Only add to GameState if the value must survive save/load AND cannot be recomputed.

### [Process] Phased migration with flag-gate → final-deletion-pass is the correct pattern for large UI refactors — see `docs/life_lessons/process.md`
- Warroom React migration: implement behind flag → verify across N waves → delete flag + legacy in one atomic final commit. Lane is not closed until the flag is gone.

### [Calibration] Implementing a feedback write without a feedback read is half-done — VALIDATED 2026-04-04 — see `docs/life_lessons/calibration.md`
- Canonical evidence: `friction_events[]` written every turn since v0.4.4, never read until Friction Wave 1. When writing a feedback mechanism, immediately verify the reader exists and is reachable. If not, mark PARTIAL.

---

## New Lessons (2026-04-02)

### [Combat] Aggregate casualty ratio is faction-blind — always partition by attacker/defender faction pair — see `docs/life_lessons/combat.md`
- A single att:def ratio for AWWV is meaningless. ARBiH-attacks-VRS: ARBiH takes 2–4× casualties (rifle-only vs armor+artillery). VRS-attacks-ARBiH: VRS may take *fewer* than defenders. ARBiH defending against VRS still bleeds from bombardment. Report faction pairs, not the aggregate.

### [Calibration] Garrison multiplier for must_hold zones can free adjacent brigades toward unintended targets — see `docs/life_lessons/calibration.md`
- n1302 DRINA regression (~1.5pp): must_hold 1.5× garrison for Brcko/Doboj corridors potentially freed Drina Corps brigades from those garrison duties → eastern OSID overcapture. Garrison changes don't just protect — they redistribute the surplus elsewhere. Always check which corps get freed brigades and where they go.

### [Architecture] Fraction-of-faction-total thresholds can't discriminate between strategically different corridors — see `docs/life_lessons/architecture.md`
- Track 2 chokepoint detection: `MUST_HOLD_MIN_ISOLATED_FRACTION = 0.05` (5% of faction territory) hits RS Brcko (~9%) AND ARBiH Central Bosnia valley passes (~8%). Any single threshold either over-garrisons ARBiH 4th Corps or misses Brcko. Fix: use corps-boundary discriminator (only trigger if isolated cluster spans a different corps jurisdiction) or absolute OSID count.

### [Operations] `planning_duration` and `preparation_max_turns` are parallel timers — declared window doesn't constrain anti-paralysis — see `docs/life_lessons/calibration.md`
- `getPreparationMaxTurns(aggressiveness)` fires before `planning_duration`. Aggressive commander (aggressiveness=5) → max_turns=3, silently overrides any `planning_duration`. Fix: `max(aggressivenessMaxTurns, op.planning_duration ?? 0)` at init.

### [Operations] Assembly zone for pre-planned ops must stay narrow — all-corps expansion defeats force_staging wait — see `docs/life_lessons/calibration.md`
- Expanding to all corps sectors hits ASSEMBLY_THRESHOLD on turn 1 (any 3 brigades anywhere in the corps count). Correct scope: staging_osid + objectives only. ASSEMBLY_TIMEOUT_TURNS=5 is the safety valve.

---

## New Lessons (2026-04-01)

### [Combat] Equipment asymmetry must apply to BOTH sides of every battle — see `docs/life_lessons/combat.md`
- When the well-equipped faction defends, their heavy weapons must punish the attacker. One-sided equipment multipliers silently break anchor fidelity (brcko failed for multiple runs because RS artillery was silent on defense).

### [Sectors] Sector merge guards must use front-edge adjacency, not OSID polygon contact — see `docs/life_lessons/sectors.md`
- Two OSIDs can share a polygon edge across a mountain range with no tactical connection. Always check edge-to-edge triple-junction adjacency (33m threshold) for sector merge decisions.

### [Data] Data-driven geographic classification beats string matching — see `docs/life_lessons/data_pipeline.md`
- Compute classification from authoritative data (census, elevation, slope), write to JSON, load once at scenario start. Pattern: `data/derived/operational/<type>_osids.json` + `*_node.ts` loader.

---

## Recently Violated (always read these)

### [Process] Orchestrator must not analyze scenario results — dispatch experts — VIOLATED 2026-06-11 (with mitigation) — see `docs/life_lessons/process.md`
- After 3 dispatched analysis agents died (worktree npm-install deaths), the orchestrator directly analyzed the D2 audit run (byte-identical interpretation, §6 OSID checks, NaN scan) and the `planning_duration` calibration result; the orchestrator-enforcement hook fired. Mitigation: experts WERE dispatched first and died; self-analysis was a fallback of last resort. **Nuanced lesson**: when an expert dispatch dies, the correct recovery is a NON-worktree artifact-reading analyst (reads existing JSON files, no npm install → no death) — not self-analysis. The orchestrator may gather RAW data (hash, exit code), but the verdict goes to an expert. See `process.md` for the full entry.

### [Process] Validate expert diagnosis against run data BEFORE implementing the fix — VIOLATED 2026-04-07 (second instance) — see `docs/life_lessons/process.md`
- Phase F DRINA investigation: subagent claimed "Op Teočak deleted" as the root cause — Op Teočak had NOT been deleted. Claim was deferred rather than immediately verified in code. Also violated in 2026-03-31 (trimming diagnosis). Two instances in two weeks: this pattern is an active threat. Require mechanistic verification ("what diagnostic field would change if this fix is correct?") before accepting any subagent root-cause claim.

### [Architecture] When a guard is added to one pipeline path, audit ALL paths — CONFIRMED STRONG PATTERN (promoted 2026-04-11) — see `docs/life_lessons/architecture.md`
- Violated 2026-04-05 (Step 6b guard without Step 8d), complied 2026-04-06, validated 2026-04-07. Reserve cap audit 2026-04-10 cataloged 14 write sites across 3 files — strongest validation yet. Three consecutive compliance instances over 4 days. No violations since original fix.

### [Architecture] Movement orders must declare stance explicitly — ARCHIVED 2026-04-07 (no new violations)
- Fixed 2026-04-05. No new violations. `stance: 'column'` required for multi-hop movement orders. Archived from active watch.

### [Calibration] Slot cap must exclude recovery-phase ops — AND verify every caller uses the function you fixed (2026-03-30, RESOLVED 2026-04-04) — ARCHIVED
- **RESOLVED** — fix confirmed committed, no longer an active threat. Demoted from active violation to archive on 2026-04-05. See `docs/life_lessons/calibration.md` for full entry.

### [Data] Data pipeline scripts that transform edges must preserve ALL fields — min_dist/type loss silently broke sector splitting (2026-03-23) — NEW
- **Context**: `merge_micro_osids.cjs` remapped edges with `return { a, b }` — stripping `type` and `min_dist` fields. The `derive_operational_settlements.ts` script computed `min_dist` from polygon geometry, but the merge step (run after derivation) discarded it. The operational contact graph had 0/2047 edges with `min_dist`, making ALL adjacency threshold filters (`frontEdgeAdj` at 33m, `strictAdj` at 5.5m, `caseBSplitAdj` at 16.6m) identical to full unfiltered adjacency.
- **Impact**: The strict Case B contiguity re-check (n682) — specifically designed to split sectors spanning opposite sides of enemy pockets — was a complete no-op. Sectors like "1st Corps - Trnovo, Kalinovik" grouped disconnected RBiH territory on both sides of an RS wedge. 93.1% calibration was artificially inflated by broken sector defense. True calibration after fix: 92.0%.
- **Wrong approach**: Adding fields to `parseEdges()` (n620 fix) without verifying the upstream data actually contains them. The parser could read `min_dist` but the data never had it.
- **Right approach**: When fixing a data pipeline, verify end-to-end: (1) source generates the field, (2) every transform preserves it, (3) consumer reads non-undefined values. Created `tools/enrich_contact_graph_min_dist.cjs` to compute `min_dist` from polygon geometry.
- **Do instead**: When adding a field to a data pipeline consumer, `grep` for every script that touches the intermediate file and verify it preserves the field. Run a count: `node -e "... edges.filter(e => e.field !== undefined).length"` to confirm non-zero at runtime.

### [Data] OSID key embeds the municipality — never trust canonical SID mun1990_id for OSID->mun mapping (2026-03-21) — NEW
- **Context**: `buildOsidToMunFromReverseMap` used the first canonical SID's `mun1990_id` to determine an OSID's municipality. But SIDs can cross municipality boundaries — e.g. `op:kresevo:kresevo_2` contains SIDs whose `mun1990_id` is "fojnica". This caused `factionHasPresenceInMun` to return false for kresevo, blocking 3 mandatory HRHB brigade spawns (95th, Kresevo, Vitezovi).
- **Wrong approach**: Assuming all SIDs in an OSID share the same `mun1990_id`. The OSID clustering is geographic (proximity-based), not municipality-bounded. A cluster near a municipality border can contain SIDs from both municipalities.
- **Right approach**: Extract municipality directly from the OSID key format `op:<mun>:<cluster>`. The OSID naming convention is canonical — `parts[1]` is always the municipality slug. This is faster and immune to cross-boundary SID topology.
- **Do instead**: When you need an OSID's municipality, use `osid.split(':')[1]`, not a reverse lookup through canonical SIDs. The OSID key is the authoritative source for municipality membership.

### [Pipeline] Derived data computed before a mutation step is stale after it — recompute or move (2026-03-21) — NEW
- **Context**: `compute-sector-combat-ratings` (step 639) ran before `generate-bot-corps-orders` (step 888). Bot directives rearrange, concentrate, and split sectors — renumbering their IDs. The saved `corps_front_sectors` had post-rearrangement IDs, but `sector_combat_ratings` retained pre-rearrangement IDs. Result: 8 sectors with no ratings, 9 orphan ratings, 13 data mismatches. The sector panel showed all-zero combat stats.
- **Wrong approach**: Computing derived data once and assuming the source won't change. The pipeline has 140 steps; any step that mutates the source invalidates prior derivations.
- **Right approach**: Either (a) move the derivation step AFTER all mutations, or (b) add a recompute step after the last mutation. In this case, the initial compute serves `evaluate-army-hq-gathering` (step 877), so we added a second `recompute-sector-combat-ratings` after step 888.
- **Do instead**: When adding a pipeline step that mutates a data structure (sectors, formations, front edges), grep for ALL steps that DERIVE from that structure and check their pipeline position. If any derivation runs BEFORE the mutation, the derived data is stale in the final save. The pattern: `state.X = compute(state.Y)` is valid only if no later step mutates `state.Y`. Use `grep -n "name:" war_phases.ts` to audit step ordering.

### [MapLibre] visibility:hidden > display:none for stable context (2026-03-20)
- **Problem**: Toggling `display:none` on a MapLibre container (like the Minimap) frequently causes layer re-render failures or blank screens if context isn't handled perfectly (M1 - P1 UI Audit).
- **Right approach**: Keep the map in the layout to preserve its context. Use `visibility: hidden`, `opacity: 0`, and `pointer-events: none` to hide it.
- **Do instead**: When toggling map visibility, use CSS opacity/visibility and always call `map.resize()` inside a `requestAnimationFrame` to ensure the resize happens after the DOM has updated.

### [Architecture] Map hybrid strategy for high-fidelity tactical overlays (2026-03-20)
- **Problem**: Attempting to render hundreds of dynamic game indicators (bars, dots, floating icons) purely in MapLibre layers leads to complex GeoJSON generation and limited animation flexibility.
- **Right approach**: Use a hybrid stack. MapLibre GL JS for the base map (roads, terrain, static labels) and Deck.gl for the tactical overlay (map counters, unit status, movement previews).
- **Do instead**: For complex game-state-driven visuals, leverage Deck.gl's interleaved layers or synchronized overlay. Use Deck.gl for anything that requires high-frequency updates, interpolation, or advanced shader effects (glows).

### [MapLibre] Never use setData() on dynamic sources in modal maps — VIOLATED 2026-03-19 — ARCHIVED 2026-04-06 (no MapLibre code touched in 6 phases; restore when UI work resumes)
- **Violation evidence**: Marked GUI_MASTER section 4 as "RESOLVED" after the ops modal redesign, claiming `setData()` worked. It worked for the initial render only. When the user changed staging OSID, arrows silently stopped updating. Spent 3 fix cycles on wrong theories (distance scaling, empty centroid lookup, stale deps) before recognizing the same bug documented since 2026-03-11.
- **Cost**: 3 wasted fix iterations. User saw broken arrows across multiple test cycles.
- **Root cause**: `setData()` on `map.addSource()`-created GeoJSON sources works for initial data but silently fails on updates in modal/secondary MapLibre instances. Sources defined in base style JSON work fine.
- **Right approach**: The workaround was already documented in GUI_MASTER section 4 and in the old `OpsPlanningModal.tsx` (`replaceArrowSourceData`): remove all layers + source, re-add with new data. Should have applied this from the start.
- **Rule**: In ANY MapLibre map inside a modal/overlay, NEVER use `setData()` for dynamically-added sources. Always use remove+re-add. Before claiming a known bug is "resolved," reproduce the specific failure mode (update after initial render), don't just verify initial render works.

### [Process] Prove it in a test script BEFORE pushing renderer changes — VIOLATED 2026-03-19
- **Violation evidence**: Built an HTML edges viewer that correctly rendered continuous front lines with gap bridging. Then "ported" the fix to the game renderer (`buildCorpsFrontLinesGeoJSON.ts`) by writing new code from memory instead of extracting the proven algorithm. Pushed 4 broken versions: (1) friendlyAdj excluded exterior polygon edges (2 bridges instead of 345), (2) deadEndCoords Map overwritten during iteration, (3) `frontier=[]` didn't break outer loop, (4) bridges added as disconnected features instead of merged into chains.
- **Cost**: 4 broken commits, user frustration, hours of churn. The working algorithm existed in the viewer the entire time.
- **Right approach**: (1) Write a Node script that runs the algorithm on real data and prints chain count / bridge count / dead ends. (2) Verify output matches expectations. (3) Port the verified algorithm verbatim. (4) Run the same diagnostic on the ported code.
- **Do instead**: `tsc clean + build succeeds` is necessary but NOT sufficient. For rendering algorithm changes, always create a diagnostic script that verifies correctness on real data before pushing. The edges viewer is the test harness for front line rendering.

### [Architecture] Data pipeline outputs are coupled — regenerating one file invalidates others (2026-03-19) — VIOLATED THIS SESSION
- **Violation evidence**: Vertex snapping changed polygon vertices in `operational_settlements.geojson`. Regenerating the pipeline also regenerated `operational_contact_graph.json` with different `min_dist` values and `distance_contact` types. This changed which OSID pairs got front edges, cascading through combat. The contact graph was coupled to the polygon data but updated independently.
- **Cost**: Regression from 91% to 88.4% (initially attributed to geometry fix, actually from contact graph change). Multiple revert cycles.
- **Right approach**: When modifying polygon geometry, test whether the contact graph changes. If it does, the calibration WILL shift. Either: (a) modify polygons WITHOUT regenerating the contact graph, or (b) regenerate everything and recalibrate.
- **Do instead**: Before regenerating ANY data pipeline output, check which other files it touches. The `derive_operational_settlements.ts` script regenerates 3 files simultaneously (settlements, contact graph, mapping). Changing one means changing all. Use `md5sum` before and after to verify which files actually changed.

### [Rendering] Front line continuity requires cross-group stitching + BFS bridging through ALL polygon edges (2026-03-19) — NEW
- **Context**: Front lines had gaps at triple junctions where 3 OSIDs meet. The game renderer (`buildCorpsFrontLinesGeoJSON.ts`) stitched segments within sector groups but not across groups. The BFS bridge initially only walked through edges shared by exactly 2 OSIDs, missing exterior polygon edges.
- **Wrong approach**: (1) Stitching only within sector groups — gaps at group boundaries. (2) BFS through `osids.size === 2` edges only — exterior polygon edges (shared by 1 OSID) are essential for boundary walks at triple junctions. (3) Adding bridge connector features instead of merging chains in-place — disconnected short segments instead of continuous lines.
- **Right approach**: Three-step algorithm proven in edges viewer, then ported verbatim: (1) Flatten ALL segments across all groups, stitch via exact endpoint matching. (2) BFS-bridge dead ends through ALL non-hostile polygon edges (including exterior), max 8 hops. (3) Merge chains in-place during bridging. Results: 359 chains -> 22 after 339 bridges.
- **Do instead**: When rendering polygon boundary features (front lines, sector demarcation, etc.), always include exterior/boundary edges in the adjacency graph. The `osids.size === 2` filter is correct for finding HOSTILE edges but wrong for building the FRIENDLY walk graph. The walk needs to traverse any non-hostile edge, including exterior ones.

### [Calibration] One change per run + mandatory insanity check — VIOLATED 2026-03-15
- **Violation evidence**: n747 (`56f2ae0`) bundled FOUR independent fixes (offensive_support trigger, auto-join op, force-assign sector, bot AI corps lookup) into a single calibration run. When the first three produced 0 elite battles (n746), attribution was ambiguous. Debug logging after n746 identified Change 4 as the sole blocker — if each fix had been a separate run, identification would have been immediate.
- **Cost**: One wasted calibration cycle (n746). No regression, but delayed root-cause identification.

### [Debugging] Persistent symptoms = multi-layer failure — VIOLATED 2026-03-15
- **Violation evidence**: Elite loan system had 5 bugs across 4 files. First session found bugs 1-3 (spawning/deployment layer) and assumed the system would work. Bugs 4-5 (request generation + brigade AI evaluation layers) weren't discovered until the zero-combat report forced a second investigation. Classic multi-layer: fixing one layer doesn't fix the system when other layers are independently broken.
- **Cost**: Extra investigation cycle. The systematic trace approach in the second pass was correct — should have been applied from the start.

## New Lessons (always read these)

### [Architecture] Always check what's already running before building a new detection system (2026-04-01) — NEW → see `architecture.md`
- `osid_graph_analysis.ts` already had articulation point detection. The entire "authored corridor" design was superseded by finding existing infrastructure. Grep for the core algorithm before designing anything new.

### [Architecture] Secondary checks that duplicate primary system logic are always dead code (2026-04-01) — NEW → see `architecture.md`
- Garrison floor safety net in `emit.ts` could never fire: `allocateBrigades()` already excluded garrison-locked brigades from surplus_pool. When a secondary check duplicates the primary system's exclusion, its precondition is permanently false. Single-ownership principle.

### [Architecture] Emergent > authored when topology is already encoded in game state (2026-04-01) — NEW → see `architecture.md`
- OSID graph already captures chokepoint topology via articulation point detection. Display labels are the only authoring needed. Default to emergent computation; author only human-meaningful labels.

### [Calibration] Expert hypotheses on regression causes need mechanistic verification before acting (2026-04-01) — NEW → see `calibration.md`
- brcko regression hypothesis ("thin RS ops drain corridor garrison") was plausible but wrong — garrison-locked brigades cannot reach surplus_pool. Trace the mechanism in code before designing a countermeasure.

### [Combat] Phase B re-orders in-transit brigades every turn unless guarded (2026-04-01) — NEW → see `combat.md`
- Add `if (brigade_movement_state?.[bid]?.status === 'in_transit') continue;` at top of Phase B loop. Re-issuing a march order resets transit state and discards accumulated progress.

### [Combat] home_osid is a recruitment artifact, not a strategic destination (2026-04-01) — NEW → see `combat.md`
- Remove `home_osid` from all march target scoring. It biased 9 VRS brigades toward inland recruitment towns instead of assigned sector fronts.

### [Combat] Commander has zero movement authority by design — must explicitly add it (2026-04-01) — NEW → see `combat.md`
- Commander writes only `directive`, `active_operations`, `sector_stance`. It never touches `brigade_movement_orders`. The authority gap is structural — must be bridged explicitly in code.

### [Combat] Commander correction pass must also cancel wrong in-transit states (2026-04-01) — NEW → see `combat.md`
- `correctMarchOrders` only catches pending orders. Brigades already converted to `in_transit` by `osid-column-movement` (step 576) escape correction. Add `correctTransitStates` for the other half.

### [Sectors] Sub-segment IDs must use sector_id as prefix, not corps_id (2026-04-01) — NEW → see `sectors.md`
- `corps_id` is shared across all sectors; counter resets per call → duplicate IDs, second overwrites first silently in every Map lookup.

### [Sectors] `else if` in front-edge friendly assignment = contested OSID blind spot (2026-04-01) — NEW → see `sectors.md`
- Use bare `else` (matching `findSubSegments` pattern). `else if (meta.side_b === faction)` silently produces sub-segments with empty `friendly_osids` for contested OSIDs.

### [Sectors] SRK siege ring cannot rely on Phase B cross-front march accidents (2026-04-01) — NEW → see `sectors.md`
- Any Phase B eligibility filter breaks SRK coverage. Verify sub-segment assignment can sustain the siege ring independently before modifying Phase B.

### [Sectors] Alphabetical tiebreak in sub-segment assignment = architectural cascade risk (2026-04-01) — NEW → see `sectors.md`
- Diff brigade-to-subsegment mapping before/after any scoring change. Assignments shifting for brigades outside the targeted sector = cascade risk, must be analyzed before proceeding.

### [Calibration] Brigade distribution regression vs sector assignment overreach — distinguish before reverting (2026-04-01) — NEW → see `calibration.md`
- When a distribution fix drops anchors, check WHY. If the brigade followed its sub-segment assignment correctly, fix the assignment upstream — not the distribution fix downstream.

### [Architecture] Phase B column march doesn't reserve the target — simultaneous pileup (2026-04-01) — NEW → see `architecture.md`
- osidCount only updated on direct moves, not on column march issuance. Multiple brigades see same target as empty, all march there. Fix: increment osidCount when issuing a march order.

### [Architecture] Phase B distance-weighting changes drift destination, not drift permanence (2026-04-01) — NEW → see `architecture.md`
- Phase 1 (physical position) assigns unconditionally. Phase B distance fix changes WHERE a brigade drifts to, but Phase 1 still locks it there. Two-component bug requires two-component fix.

### [Process] Decisions without traces are undebuggable — instrument before investigating (2026-03-31) — NEW → see `process.md`

### [Calibration] Fix the symptom in ALL callers — AND verify your fix is on the actual code path (2026-03-31) — NEW → see `calibration.md`

### [Process] Validate expert diagnosis against run data BEFORE implementing the fix (2026-03-31) — NEW → see `process.md`

### [Process] READ mandatory startup files BEFORE any action — reverted deliberate work due to ignorance (2026-03-30) — NEW → see `process.md`

### [Process] Worktree merges lose uncommitted working tree state — commit enrichment data before branching (2026-03-30) — NEW → see `process.md`

### [Architecture] Concurrent ops exposed that single-op cap was accidentally preventing garrison stripping (2026-03-30) — NEW → see `architecture.md`

### [Process] Parallel agent dispatch needs exclusive file ownership — overlapping edits corrupt files (2026-03-29) — NEW → see `process.md`

### [Calibration] Paramilitary scope exclusions silently prevent entire regions from being modeled (2026-03-29) — NEW → see `calibration.md`

### [Process] JNA ghosts for early ops must be topology-verified — adjacent to objectives, not just nearby (2026-03-29) — NEW → see `calibration.md`

### [Calibration] Home recall for line-assigned brigades is catastrophically wrong — BiH brigades routinely deployed far from home (2026-03-29) — NEW → see `calibration.md`

### [Calibration] JNA ghosts that accelerate early ops cascade through operation queues — verify downstream timing (2026-03-29) — NEW → see `calibration.md`

### [Process] Gap finder asks the questions nobody else thinks to ask — use before architectural work (2026-03-29) — NEW → see `process.md`

### [Data] Point-only polygon contacts (shared vertex, 0 segments) are not real adjacency — filter on shared_segments >= 1 (2026-03-28) — NEW → see `data_pipeline.md`

### [Architecture] Supply filters are double penalties when combat multipliers already model the constraint (2026-03-28) — NEW → see `architecture.md`

### [Calibration] Probes are recon, not campaigns — they should not trigger operation cooldown or double exhaustion (2026-03-28) — NEW → see `calibration.md`

### [Calibration] Half-implemented bilateral scaling silently inverts ratios — verify both sides of any paired multiplier (2026-03-28) — NEW → see `calibration.md`

### [Process] Verify agent edits landed on disk — agent "success" claims are not proof (2026-03-28) — NEW → see `process.md`

### [Calibration] Calibration % means nothing if reached through broken mechanics — GOLDEN RULE (2026-03-26) — NEW → see `calibration.md`

### [Architecture] Hidden BFS depth caps silently disable constant changes — always trace the full call chain (2026-03-26) — NEW → see `architecture.md`

### [Architecture] Silent drops in assignment pipelines hide broken deployment — always log unmatched items (2026-03-26) — NEW → see `architecture.md`

### [Architecture] Cross-faction pools have a chicken-and-egg problem — hardcode the seed list (2026-03-27) — NEW → see `architecture.md`

### [Architecture] home_mun must match home_osid's municipality — mismatches silently block placement (2026-03-27) — NEW → see `architecture.md`

### [Engine] Zombie op types consume corps slots but execute nothing — always verify op type has execution path (2026-03-26) — NEW → see `architecture.md`

### [Calibration] Sector-coverage defenders must NOT be physically displaced (2026-03-27) — NEW → see `calibration.md`

### [Calibration] garrison tag pins brigades but operations can still pull them — remove from op if garrison needed (2026-03-27) — NEW → see `calibration.md`

### [Calibration] When a threshold system isn't biting, check the numerator accounting before tuning the threshold (2026-03-25) — NEW → see `calibration.md`

### [QA] First-pass fixes can introduce new errors — always verify corrected content (2026-03-25) — NEW → see `process.md`

### [QA] Primary sources in local language override English Wikipedia (2026-03-25) — NEW → see `process.md`

### [Process] Experts must know their domain's data schema — one read of game_state.ts beats four greps (2026-03-29) — NEW → see `process.md`

### [Process] Dispatch experts by file ownership, not by gut feel (2026-03-29) — NEW → see `process.md`

### [Process] Orchestrator must not analyze scenario results — dispatch experts (2026-03-29) — NEW → see `process.md`

### [Process] Validate internal consistency after every run, not just calibration % (2026-03-29) — NEW → see `process.md`

### [Process] NEVER fabricate historical claims — dispatch /historian, don't speculate (2026-03-24) — NEW
- **Context**: When analyzing 4th Corps weakness, I stated "Significant reinforcement from 3rd Corps (Central Bosnia) units redeploying south" as if it were sourced fact. User called it out. I had no source — it was speculation presented as history.
- **Wrong approach**: Reasoning about what "probably happened" historically and presenting it as established fact. In a project with a `/historian` agent specifically for sourced historical research, this is a role violation.
- **Right approach**: When a question requires historical knowledge, dispatch `/historian` with specific questions and source requirements. Present only what the historian returns with citations. If no source exists, say "no source found" — never fill the gap with inference dressed as fact.
- **Do instead**: Before making ANY historical claim in investigation or design, ask: "Is this sourced?" If not, dispatch `/historian`. The project exists to model historical reality — unsourced claims corrupt the foundation.

### [Process] When investigation reveals a new fix, add it to the plan immediately — don't defer to "later" (2026-03-24) — NEW
- **Context**: During Sarajevo siege investigation, discovered RBiH pool scale 0.08 was a major bottleneck. Noted "the real bottleneck is pool scale" but planned to mark FIX-1 done and move on. User corrected: "When you encounter things like this, dynamically add them to the plan!"
- **Wrong approach**: Identifying a root cause during investigation but not adding it to the task list because "I shouldn't change multiple things at once." The one-change-per-run rule applies to calibration runs, not to task planning.
- **Right approach**: When investigation reveals a new fix, create a task immediately. Plan all known fixes upfront, execute one at a time.
- **Do instead**: If during a calibration run you discover a new issue or root cause, immediately `TaskCreate` it. Don't wait until the current fix is done to "remember" the next one.

### [Process] Build diagnostic tools, not one-off scripts — every investigation script should become a permanent tool (2026-03-24) — NEW
- **Context**: Needed to track brigade locations, check siege health, find stranded pools. Initially wrote one-off node -e commands. User corrected: "This should be a standard diagnostic tool. We need a toolset."
- **Wrong approach**: Writing throwaway diagnostic commands that disappear after the conversation.
- **Right approach**: Create `tools/diagnose_run.cjs` — a permanent post-run diagnostic that runs after every calibration run. Checks brigade drift, siege health, empty sectors, combat ineffective concentration, stranded pools.
- **Do instead**: When you write a diagnostic query more than once, extract it into a permanent tool in `tools/`. If it catches a bug class, it should run after every calibration run forever.

### [Architecture] Sector assignment based on current location creates drift lock-in — once a brigade moves, it's trapped (2026-03-24) — NEW
- **Context**: SRK brigades fought at Vogosca w3-5, drifted to Gorazde via operation march/attack-through, then `classifyBrigadesByTerritory` assigned them to the Gorazde sector (because they're physically there), and `evaluateSectorMarch` reinforced the assignment by marching them to the sector front. A self-reinforcing loop.
- **Wrong approach**: Assuming sector assignment by physical location is sufficient. Once a brigade drifts during an operation, the location-based assignment locks it into the wrong sector permanently.
- **Right approach**: Three-part fix: (1) home-distance guard in `evaluateSectorMarch` — don't march >N hops from home, (2) return-march protection — don't override post-operation return marches, (3) `recall-drifted-brigades` pipeline step — actively pull stranded brigades home each turn.
- **Do instead**: When adding movement systems (operations, column march, attack-through), always verify the round-trip: can the brigade get back home after the operation? If not, add a recall mechanism.

### [Calibration] Always compute per-turn per-municipality mobilization and compare to attrition rate — "the number looks small" is the clue (2026-03-24) — NEW
- **Context**: FACTION_MOBILIZATION_SCALE.RBiH=0.02 produced only ~3 troops/turn for Stari Grad (39k Bosniaks). Frontline attrition drained ~9/turn. Net: brigades lost ~6/turn and hit dissolution floor after 40 weeks. Zero-battle brigades ended at 146 personnel — drained purely by passive attrition with no reinforcement.
- **Wrong approach**: Setting mobilization scale based on faction-level totals (targeting 120-130k) without checking per-municipality flow. The 0.02 scale hit the right global number but created municipality-level starvation — Sarajevo brigades couldn't sustain themselves while other RBiH corps had surplus.
- **Right approach**: For any mobilization scale change, compute: `per_mun_mobilized = census * BASE_RATE * SCALE * surge`. If < attrition drain per turn (~5-10 for a front-line mun), the brigades will die. Also run `tools/diagnose_run.cjs` and check "combat ineffective concentration" per corps.
- **Do instead**: When tuning mobilization, always check the municipality-level flow, not just faction totals. A scale that produces the right global number can still starve individual municipalities.

### [Calibration] Area-weighted % is blind to siege/positional bugs — brigades can be 80km from home with 92.6% calibration (2026-03-24) — NEW
- **Context**: SRK Sarajevo siege was completely non-functional after w5. Three brigades drifted from Sarajevo to Gorazde (~80km south). Siege-ring sector had zero brigades, zero density, zero eligible attackers for 35 consecutive weeks. Calibration stayed at 92.6% because Sarajevo OSIDs are RBiH in both painted and sim — the siege doesn't flip territory.
- **Wrong approach**: Relying solely on OSID control match % and faction territory shares to validate sim health. These metrics measure WHERE territory is, not WHETHER key military operations are happening. A corps can have zero combat activity for 35 weeks and the calibration number doesn't move.
- **Right approach**: Supplement area-weighted % with positional health checks: (1) siege health — besieging corps must have N+ brigades near siege target, (2) brigade drift — flag brigades > M hops from home with no active operation, (3) corps activity — flag corps with zero eligible attackers for > K consecutive weeks, (4) sector coverage — no sector with > 5 front edges should have zero brigades.
- **Do instead**: After every calibration run, check not just "are the right OSIDs the right color" but "are the right brigades in the right places doing the right things." Add siege health and drift checks to `compare_painted_vs_sim.cjs`. A passing calibration % with a dead siege is worse than a failing calibration % that tells you something is wrong.

### [Events] MAX_EVENTS_PER_TURN=3 creates fragile event chains — pipeline changes cascade into missing events (2026-03-24) — NEW
- **Context**: v0.6.5 added `offensive-paramilitary-detect` pipeline step. This changed early-war state enough that at w5, `jna_withdrawal_1992` got crowded out by 4+ eligible events (barracks events + others). The `jna_withdrawn` flag never fires, breaking the intended cascade to `drina_cleansing`, `operation_corridor`, and `srebrenica_enclave` flag gates.
- **Wrong approach**: Adding a pipeline step and only checking calibration % — not diffing the event firing list. The event dropout was caught by the event_timing test, not by manual review.
- **Right approach**: Before adding any pipeline step that runs in weeks 0-12, run a 40w scenario and diff the event firing list against baseline. If an event drops out, investigate whether its flag is consumed downstream.
- **Do instead**: After any sim-affecting change, run `node -e "... baseline.events_fired.map(e => e.id).sort()"` and compare to the new run. Missing events = broken flag cascade.

### [Calibration] Offensive territory gains cascade through adjacency — halve expected gains (2026-03-24) — NEW
- **Context**: Plan estimated +2-3pp from offensive paramilitaries sweeping Drina valley. Actual: +0.6pp. The 28 paramilitary captures gave VRS adjacency to 10+ additional OSIDs that regular combat then captured (over-capture). The net was modest because over-capture offset correct captures.
- **Wrong approach**: Estimating linear impact (N OSIDs captured = N OSIDs closer to painted). Territory gains are nonlinear — each capture changes the adjacency graph for regular combat.
- **Right approach**: When estimating calibration impact of territory-changing systems, halve the expected gain and budget for cascade over-capture.
- **Do instead**: Before implementing a territory-changing system, count how many NEW hostile OSIDs become adjacent after the system runs. That's the cascade risk. If cascade OSIDs > direct captures, the system will over-capture unless constrained.

### [Quality] /simplify with 3 parallel review agents catches real bugs — run after major features (2026-03-24) — NEW
- **Context**: /simplify found: duplicate spawn functions (-29 lines), 3 unnamed magic numbers, inline adjacency building duplicating `buildOsidAdjacency`, per-OSID enclave checks reducible to O(1) Set lookup.
- **Wrong approach**: Skipping post-implementation review because "tests pass and calibration is good." Code quality issues are invisible to tests.
- **Right approach**: Run /simplify between major feature phases. The 3-agent parallel review (reuse, quality, efficiency) catches different categories simultaneously.
- **Do instead**: After every feature commit, run /simplify. Estimate 10-20% code reduction from the review. The spawn duplication was obvious in hindsight but emerged naturally from parallel development of rear-pocket and offensive modes.

## Topic Files

| File | Topics | Lessons | Load when... |
|------|--------|---------|-------------|
| [calibration.md](life_lessons/calibration.md) | Calibration, OOB, Bot AI | 53 | Running calibration scenarios, tuning parameters, OOB changes |
| [combat.md](life_lessons/combat.md) | Combat, Brigade Distribution, March System | 4 | Combat resolution, brigade movement, march/distribution system |
| [architecture.md](life_lessons/architecture.md) | Architecture, Engine, Scaling, Defaults, Data Integrity | 59 | Changing engine structure, state, pipeline, adding systems |
| [data_pipeline.md](life_lessons/data_pipeline.md) | Data, Pipeline, Geometry | 10 | Modifying derived data, running data scripts, geometry work |
| [ui_map.md](life_lessons/ui_map.md) | UI, GUI, MapLibre, Rendering, React | 14 | Frontend, map, tactical overlay, modal work |
| [process.md](life_lessons/process.md) | Process, Planning, QA, Quality, Night Shift, Debugging | 65 | General development process (skim at session start) |
| [sectors.md](life_lessons/sectors.md) | Sectors, Design | 9 | Sector system, front lines, territory assignment, sub-segments |
| [platform.md](life_lessons/platform.md) | Platform, Tooling | 4 | Build issues, platform-specific bugs, tooling |
| [events.md](life_lessons/events.md) | Events | 2 | Event system, flag gates, triggers |
