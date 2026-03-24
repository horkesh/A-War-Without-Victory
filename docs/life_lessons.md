# Life Lessons — AWWV Development

> Last updated: 2026-03-24 (nightshift — offensive paramilitaries + event wiring, 3 new lessons)
> Auto-generated daily at 06:00. Cross-checked against previous entries.
> Violation-tracked: lessons with recent violations stay at the top.
> Enforcement: session-start scan, pre-commit gate (`/awwv_pre_commit_check`), daily cron violation detection.

---

## Recently Violated (needs reinforcement)

### [Data] Data pipeline scripts that transform edges must preserve ALL fields — min_dist/type loss silently broke sector splitting (2026-03-23) — NEW
- **Context**: `merge_micro_osids.cjs` remapped edges with `return { a, b }` — stripping `type` and `min_dist` fields. The `derive_operational_settlements.ts` script computed `min_dist` from polygon geometry, but the merge step (run after derivation) discarded it. The operational contact graph had 0/2047 edges with `min_dist`, making ALL adjacency threshold filters (`frontEdgeAdj` at 33m, `strictAdj` at 5.5m, `caseBSplitAdj` at 16.6m) identical to full unfiltered adjacency.
- **Impact**: The strict Case B contiguity re-check (n682) — specifically designed to split sectors spanning opposite sides of enemy pockets — was a complete no-op. Sectors like "1st Corps - Trnovo, Kalinovik" grouped disconnected RBiH territory on both sides of an RS wedge. 93.1% calibration was artificially inflated by broken sector defense. True calibration after fix: 92.0%.
- **Wrong approach**: Adding fields to `parseEdges()` (n620 fix) without verifying the upstream data actually contains them. The parser could read `min_dist` but the data never had it.
- **Right approach**: When fixing a data pipeline, verify end-to-end: (1) source generates the field, (2) every transform preserves it, (3) consumer reads non-undefined values. Created `tools/enrich_contact_graph_min_dist.cjs` to compute `min_dist` from polygon geometry.
- **Do instead**: When adding a field to a data pipeline consumer, `grep` for every script that touches the intermediate file and verify it preserves the field. Run a count: `node -e "... edges.filter(e => e.field !== undefined).length"` to confirm non-zero at runtime.

### [Data] OSID key embeds the municipality — never trust canonical SID mun1990_id for OSID→mun mapping (2026-03-21) — NEW
- **Context**: `buildOsidToMunFromReverseMap` used the first canonical SID's `mun1990_id` to determine an OSID's municipality. But SIDs can cross municipality boundaries — e.g. `op:kresevo:kresevo_2` contains SIDs whose `mun1990_id` is "fojnica". This caused `factionHasPresenceInMun` to return false for kresevo, blocking 3 mandatory HRHB brigade spawns (95th, Kreševo, Vitezovi).
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

### [MapLibre] Never use setData() on dynamic sources in modal maps — VIOLATED 2026-03-19
- **Violation evidence**: Marked GUI_MASTER §4 as "RESOLVED" after the ops modal redesign, claiming `setData()` worked. It worked for the initial render only. When the user changed staging OSID, arrows silently stopped updating. Spent 3 fix cycles on wrong theories (distance scaling, empty centroid lookup, stale deps) before recognizing the same bug documented since 2026-03-11.
- **Cost**: 3 wasted fix iterations. User saw broken arrows across multiple test cycles.
- **Root cause**: `setData()` on `map.addSource()`-created GeoJSON sources works for initial data but silently fails on updates in modal/secondary MapLibre instances. Sources defined in base style JSON work fine.
- **Right approach**: The workaround was already documented in GUI_MASTER §4 and in the old `OpsPlanningModal.tsx` (`replaceArrowSourceData`): remove all layers + source, re-add with new data. Should have applied this from the start.
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
- **Right approach**: Three-step algorithm proven in edges viewer, then ported verbatim: (1) Flatten ALL segments across all groups, stitch via exact endpoint matching. (2) BFS-bridge dead ends through ALL non-hostile polygon edges (including exterior), max 8 hops. (3) Merge chains in-place during bridging. Results: 359 chains → 22 after 339 bridges.
- **Do instead**: When rendering polygon boundary features (front lines, sector demarcation, etc.), always include exterior/boundary edges in the adjacency graph. The `osids.size === 2` filter is correct for finding HOSTILE edges but wrong for building the FRIENDLY walk graph. The walk needs to traverse any non-hostile edge, including exterior ones.

### [Calibration] One change per run + mandatory insanity check — VIOLATED 2026-03-15
- **Violation evidence**: n747 (`56f2ae0`) bundled FOUR independent fixes (offensive_support trigger, auto-join op, force-assign sector, bot AI corps lookup) into a single calibration run. When the first three produced 0 elite battles (n746), attribution was ambiguous. Debug logging after n746 identified Change 4 as the sole blocker — if each fix had been a separate run, identification would have been immediate.
- **Cost**: One wasted calibration cycle (n746). No regression, but delayed root-cause identification.

### [Debugging] Persistent symptoms = multi-layer failure — VIOLATED 2026-03-15
- **Violation evidence**: Elite loan system had 5 bugs across 4 files. First session found bugs 1-3 (spawning/deployment layer) and assumed the system would work. Bugs 4-5 (request generation + brigade AI evaluation layers) weren't discovered until the zero-combat report forced a second investigation. Classic multi-layer: fixing one layer doesn't fix the system when other layers are independently broken.
- **Cost**: Extra investigation cycle. The systematic trace approach in the second pass was correct — should have been applied from the start.

---

## New Lessons (2026-03-24 nightshift)

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

## New Lessons (2026-03-23 session)

### [QA] Subagent index-counting errors are systematic — always force-verify with a script (2026-03-23) — NEW
- **Context**: During 5-round QA of 46 essays, 3 out of 6 reviewer agents miscounted array indices and reviewed the WRONG essays. Batches B, C, and D all reviewed essays 56-63 instead of their assigned ranges (56-63, 64-71, 72-79). Triple coverage on one range, zero on two others.
- **Wrong approach**: Trusting that a subagent given "review indices 64-71" will actually access the correct array elements. The agents counted lines in the JSON file instead of using array indexing, and the line-to-index mapping drifted.
- **Right approach**: Force the agent to run a verification script FIRST: `node -e "... for(let i=64;i<=71;i++) console.log(i, essays[i].event_id)"` and STOP if the output doesn't match expected event_ids.
- **Do instead**: When dispatching subagents to process specific array ranges, always include (1) the expected identifiers at each index, (2) a mandatory verification script, and (3) instructions to STOP and report if there's a mismatch. Don't trust positional access across agents.

### [Design] Design decisions cascade — capture them in memory before they get buried in conversation (2026-03-23) — NEW
- **Context**: Three major design decisions emerged in rapid conversation: (1) Codex is a dynamic encyclopedia, (2) game starts April 1992 only, (3) command hierarchy with AI slots. Each changes the foundational architecture. If captured only in conversation, they'd be lost on context compaction.
- **Right approach**: As soon as a design decision is made, write it to memory AND update the canonical docs (VERSIONING.md, napkin, ledger). Don't wait for implementation — the decision IS the deliverable.
- **Do instead**: When a conversation produces a design decision that changes the project's direction, immediately: (1) save to memory, (2) update VERSIONING.md or relevant canon doc, (3) note in napkin. Three touchpoints ensure the decision propagates to future sessions.

---

## Active Lessons (no recent violations)

### [Tooling] Grep for unused files misses .js extension imports — always tsc after bulk deletions (2026-03-21) — NEW
- **Context**: Agent-driven dead code scan grepped for `from.*filename` to find imports. TypeScript uses `.js` extensions in import paths (`from './foo.js'` resolves to `foo.ts`). The grep pattern didn't match these, flagging 18 actively-imported files as "orphaned."
- **Wrong approach**: Trusting grep results for unused file detection without compilation verification. Deleted 18 files that were actively imported, causing tsc errors.
- **Right approach**: After ANY bulk deletion, run `npx tsc --noEmit` immediately before committing. Restore files that cause import errors. Only commit after clean typecheck.
- **Do instead**: For dead code detection, use `tsc` as the source of truth, not grep. Grep is a fast first pass; tsc is the verification gate. Never commit bulk deletions without a clean typecheck + test run.

### [Rendering] MapLibre symbol layers are globally broken — use Deck.gl TextLayer (2026-03-21) — NEW
- **Context**: Settlement labels (27 major cities) were added as a MapLibre `symbol` layer with correct data (27 features), correct font PBFs (200 OK), correct layer config — but `queryRenderedFeatures` returned 0 for ALL 7 symbol layers in the map. "Unimplemented type: 4" errors from OSM PMTiles corrupt the symbol rendering pipeline.
- **Wrong approach**: Debugging the label layer in isolation (font loading, source data, layer ordering, collision detection). The problem is global — no symbol layer renders, not just labels.
- **Right approach**: Bypass MapLibre symbols entirely. Use Deck.gl `TextLayer` for text rendering — it uses its own WebGL pipeline and is unaffected by MapLibre's broken symbol pass. `fontSettings: { sdf: true }` for outlines, `characterSet: 'auto'` for Bosnian diacritics (Ć, Š, Č, Ž).
- **Do instead**: Never use MapLibre `type: 'symbol'` layers for text in this project. All text rendering goes through Deck.gl TextLayer. If you need icons, use Deck.gl IconLayer (already used for formation counters).

### [Data] Displacement event `displaced` field includes killed/fled as subsets — never add them (2026-03-21) — NEW
- **Context**: The adapter aggregated OSID displacement as `out = displaced + killed + fledAbroad`. But `displaced` means "total people removed from this OSID" — `killed` and `fled_abroad` are subsets, not additions. This inflated OSID removals by ~40% (Derventa showed 25,202 removals from 21,706 pre-war population).
- **Wrong approach**: `out = displaced + killed + fledAbroad` (double-counts killed/fled).
- **Right approach**: `out = displaced` (total removals). `lost = killed + fledAbroad` (subset of out, permanently gone). `displaced_alive = out - lost` (moved to another OSID).
- **Do instead**: When aggregating displacement events, `displaced` IS the total. The municipality-level `displacement_state` uses different field semantics — `displaced_out` (alive movers) and `lost_population` (killed/fled) are non-overlapping there. Don't mix the two accounting models.

### [Engine] When you find one trimming bug, check for others — same pattern repeats (2026-03-21) — NEW
- **Context**: `control_events` was trimmed to last 3 turns every turn cycle (empty by w40). Fixed it. Then found `turn_summaries` had `MAX_TURN_SUMMARIES = 3` — same pattern, same bug. Both were silently discarding history needed for the settlement timeline.
- **Wrong approach**: Fixing one and moving on without checking if the same pattern exists elsewhere.
- **Right approach**: After finding `control_events` trimming, immediately grep for similar patterns: `slice(0,`, `filter(e => e.turn >=`, `MAX_*` constants that limit array size. Found `MAX_TURN_SUMMARIES` in 30 seconds.
- **Do instead**: When you fix a "history silently discarded" bug, grep the codebase for the same pattern. Trimming/slicing constants are a code smell when the data feeds player-visible features.

### [Engine] All control_flip paths must emit control_events — audit when adding new flip paths (2026-03-21) — NEW
- **Context**: 5 code paths write `political_controllers[osid] = faction`. Only 2 of 5 emitted `control_events`. The missing 3 (rear_pocket_consolidation, sector_offensive null-claim, jna_phantom capture_osids) meant those control changes were invisible to the timeline.
- **Wrong approach**: Assuming all control flip paths already emit events. The assertion file (`assert_control_events.ts`) existed but only logged violations — it didn't fix them.
- **Right approach**: Grep for all `political_controllers[` assignments. Each one MUST have a corresponding `control_events.push()`. If adding a new flip path, add the event emission in the same PR.
- **Do instead**: After any change touching `political_controllers`, run `grep -n "political_controllers\[" src/sim/combat/` and verify each hit has an adjacent `control_events` push.

### [Platform] Git worktrees do NOT isolate tsx module resolution — always merge to main and run there (2026-03-21) — NEW
- **Context**: 14 scenario runs in the `.worktrees/zepa-calibration` worktree all used the MAIN tree's source code despite the worktree having different committed files. File hashes differed between worktree and main. `npm install` in the worktree didn't help.
- **Root cause**: tsx resolves imports through node_modules which can chain back to the main tree. Worktrees share the git repo but import resolution follows filesystem symlinks and module resolution algorithms that cross worktree boundaries.
- **Impact**: Wasted hours of investigation — every "fix" appeared to have no effect because the runner was executing the old code from main.
- **Do instead**: For calibration work, ALWAYS merge the branch to main and run from the main working directory. Use worktrees only for code editing isolation, not for running scenarios. Verify with file hash comparison: `md5sum <worktree/file> <main/file>`.

### [Engine] Ops process axes SEQUENTIALLY — first axis stall blocks all others (2026-03-21) — NEW
- **Context**: Op Foča had 5 axes (Foča Valley, Kalinovik, Mostar Heights, Konjic South, etc.). Foča Valley stalled at 1/7 captures → entire op entered recovery → axes 2-4 never executed.
- **Root cause**: The operation system uses a shared `current_objective_index` across all axes. When the first axis hits max_failures, the op recovers — no other axis gets a turn.
- **Impact**: Multi-front operations are structurally impossible. Any op with 2+ axes effectively only runs the first one.
- **Workaround**: Use the synthetic JNA corps pattern for truly parallel early-war ops. For VRS follow-up, use triggered operations that fire after the first op completes.
- **Do instead**: Never add more than 2 axes to an op expecting both to execute. If you need parallel axes, use separate ops on separate corps (real or synthetic).

### [Engine] Understand the FULL attack evaluation pipeline before debugging eligibility (2026-03-21) — NEW
- **Context**: 2nd Tuzla (3000 pers, at staging, adjacent to target, in op, not disrupted, not home defense) showed as "not eligible" in Op Teočak. Spent extensive investigation checking supply filters, home defense, corps assignment, MAX_ATTACKERS_PER_TARGET, and the combat predictor before adding debug logging.
- **Root cause**: `predictAllAdjacentTargets()` returned targets from the brigade's CURRENT position, not the staging position. 2nd Tuzla was still marching to staging in the early execution turns — it wasn't at kalesija_grad_2 yet, so rastosnica_2 wasn't adjacent. By the time it arrived, the op had accumulated failures.
- **Key pipeline** (bot_brigade_eval_attack.ts lines 143-212): Phase check → objective resolution → friendly capture check → `predictAllAdjacentTargets()` from brigade's CURRENT location → alliance filter → avoided_osids → find objective in targets → solo prediction → concentrated estimate → attack decision → attacker cap.
- **Do instead**: When a brigade is "not eligible" despite correct setup, FIRST add debug logging to the evaluation function. Don't theorize — trace the exact code path. The answer is always in the data: what does the brigade see at that specific turn? Check location, adjacency, and predicted targets for THAT turn, not w40 state.

### [Engine] Synthetic JNA corps for parallel early-war operations (2026-03-21) — NEW
- **Context**: VRS Herzegovina Corps needed to run Op Višegrad, Op Foča, AND Op Herzegovina simultaneously in the first weeks. Pre-planned ops queue sequentially per corps — one active at a time.
- **Solution**: Create `jna_herzegovina_command` synthetic corps. JNA phantoms with that corps_id trigger `initializeCorpsCommand` to create the entry. Ops on this corps run PARALLEL with vrs_herzegovina ops.
- **Gotcha 1**: `initializeCorpsCommand` must be called AFTER `spawnJnaPhantomBrigades` — the first call (before spawn) doesn't see the phantoms.
- **Gotcha 2**: Never share brigades between ops on different corps — the first op grabs them and the second runs empty.
- **Gotcha 3**: Staging OSID must be adjacent to the first objective — non-adjacent staging means weeks of marching and the op stalls.
- **Do instead**: For any new JNA-level early-war operation, use a synthetic corps ID. Put only dedicated units (JNA phantoms + unshared VRS brigades) on the op. Verify staging adjacency.

### [Engine] MAX_ATTACKERS_PER_TARGET raised 3→12 — coordination penalty handles concentration naturally (2026-03-21) — DONE
- **Context**: `bot_brigade_targeting.ts:35` and `battle_resolution.ts:58` capped brigades attacking the same OSID at 3 per turn. Raised to 12 (MAX_PARTICIPATING_BRIGADES). Coordination penalty (0.8× at 3+) provides natural diminishing returns.

### [Engine] Per-axis zero-progress abort enables true parallel axis execution (2026-03-21) — DONE
- **Context**: Multi-axis ops had cross-axis contamination in the zero-progress abort. If total failures across ALL axes >= 3 with zero captures, ALL executing axes stalled. A stalled Foča Valley axis (idle, no attackers) killed a progressing Kalinovik axis.
- **Fix**: Changed zero-progress check from aggregate to per-axis. Each axis checks its OWN failure/capture/attempt counts. Per-axis tracking for objective advancement, failure counts, and stall detection was already implemented — this was the last contamination point.
- **Architecture note**: The multi-axis system now has fully independent axes. Each axis has: `current_objective_index`, `failure_count`, `consecutive_failures_on_current`, `consecutive_catastrophic_on_current`, `idle_execution_turn_streak`, `movement_only_execution_turns`, `status`, `momentum`. The operation enters recovery only when ALL axes are terminal (complete or stalled).

### [Engine] Ping-pong captures count as failures — raise MAX_TOTAL_FAILURES to compensate (2026-03-21) — NEW
- **Context**: Kalinovik axis stalled at 1/5 captures. rs_kalinovik_brigade took varos_2 three times (w11-w13, all decisive r=29+) but RBiH retook it between turns. Each recapture counted as a "failure" (defender still holds). 3 ping-pong + 2 idle turns = 5 = MAX_TOTAL_FAILURES → axis stalled before reaching golubici_2.
- **Root cause**: The op system checks OSID control the FOLLOWING turn. If RBiH retakes the OSID between attacker's decisive victory and next turn's check, the capture is a "failure." The combat was won but the HOLDING failed.
- **Fix**: Raised MAX_TOTAL_FAILURES 5→8. Gives ops enough runway to push through ping-pong zones. The consecutive failure cap (3) and catastrophic stall (3) already prevent suicidal attacks — the total cap was too conservative.
- **Impact**: 93.1% ATH (+0.3pp). All ops across the map benefit from the extra attempts.
- **Future**: Distinguish between "attack failed" and "captured but retaken" in the failure tracking. The latter should not count toward the failure cap.

### [Engine] Preparation sub-phase overrides planning_duration — use force_staging assembly check (2026-03-21) — NEW
- **Context**: Added `planning_duration: 5` to Op Teočak to give 2nd Tuzla march time. But `tickPreparation` in `operation_preparation.ts` drives through intel_gathering→force_staging→supply_check→assessment→ready based on commander personality. An aggressive commander completes in 3 turns regardless of planning_duration.
- **Root cause**: `preparationReady` (sub_phase === 'ready') at `sector_offensive.ts:800` fires before the `elapsed > planDuration` check. Preparation is the PRIMARY gate; planning_duration is a FALLBACK for ops without preparation.
- **Fix implemented**: Added `countAssembledBrigades()` to `force_staging` sub-phase. Don't advance to supply_check until 60% of participating brigades are at staging/objective OSIDs (or timeout at preparation_max_turns). This naturally extends planning for ops with distant brigades.
- **Do instead**: When an op needs assembly time, rely on the force_staging assembly check, not planning_duration. The preparation system controls the transition.

### [Calibration] Coupled anchors need simultaneous fixes — Žepa/Teočak seesaw (2026-03-21) — NEW
- **Context**: Žepa enclave and Teočak corridor are inversely coupled through VRS Drina Corps force allocation. Fixing Žepa alone (285th bump to 1500) blocked Teočak — VRS stayed north and 2nd Romanija blocked rastosnica_2. Fixing Teočak alone (Op Teočak) worked only when Žepa was weak (VRS pushed south, leaving north open).
- **Wrong approach**: Fixing one anchor at a time, testing, seeing the other break, then trying to find a Goldilocks value. This wasted 4 calibration runs. The coupling was structural — no single-variable solution existed.
- **Right approach**: When two anchors are coupled through the same corps' force allocation, fix BOTH simultaneously. Strengthen the defense (OOB bump) AND strengthen the offense (op improvement). Test the combination, not individual changes.
- **Do instead**: Before changing any enclave OOB or corridor operation, check: is there another anchor in the same corps' area that could be affected? If yes, plan both fixes together. Known coupled pairs: Žepa↔Teočak (Drina Corps), Višegrad↔Rogatica (Herzegovina Corps).

### [Calibration] NEVER add a painted-opposite-faction OSID as an operation objective (2026-03-21) — NEW
- **Context**: Added `vitinica_2` (painted RBiH) as an Op Drina objective to maintain 5-objective tempo after micro-OSID merge. VRS captured it at w6 with ratio 29.91. vitinica_2 is part of the Sapna corridor connecting Teočak to Tuzla — a critical lifeline that must stay RBiH throughout the war. Also tried `djulici` (painted RS, valid) but that cascaded into Žepa enclave falling.
- **Wrong approach**: Adding objectives without checking `painted_control_jan1993.json`. Assuming objectives are just tempo placeholders that won't be reached. Not verifying corridor anchors after every op change.
- **Right approach**: Before adding ANY OSID to an operation, check its painted target. If it's painted as the DEFENDING faction, it MUST NOT be an objective — the operation will capture it. Use `node -e "console.log(require('./data/source/calibration/painted_control_jan1993.json').by_settlement_id['op:...:...'])"`.
- **Do instead**: When replacing merged objectives, ONLY use OSIDs whose painted target matches the attacking faction. Always check: vitinica_2 (RBiH), rastosnica_2 (RBiH) = never RS objectives. After any Op Drina change, verify: vitinica_2 RBiH, Teočak connected, Žepa RBiH.

### [UI] Agent-generated aesthetics must match the established design language — never CRT/terminal on a warroom game (2026-03-21) — NEW
- **Context**: An external agent restyled ArmyHQModal as a green CRT terminal ("NATO MISSION TERMINAL v4.2", `#4af626` phosphor green, scanline overlay, teletype ticker, glowing dots). The game's design spec (HOI_VISUAL_GUI_OVERHAUL_SPEC.md) explicitly says "warmth of wood-paneled offices and brass fixtures rather than CRT terminals."
- **Wrong approach**: Letting agents make autonomous aesthetic decisions without referencing the design spec or matching existing panels. The agent invented a new design language instead of extending the existing one.
- **Right approach**: All UI panels must use the established warroom palette: `bg-panel-bg`, `bg-panel-card`, `border-panel-border`, `text-text-primary`, `text-text-secondary`. Amber/gold accents for headings. No green terminal, no CRT effects. Reference CorpsDetail, FormationDetail, SettlementPanel for the canonical style.
- **Do instead**: Before any UI aesthetic work, read HOI_VISUAL_GUI_OVERHAUL_SPEC.md and GUI_MASTER.md. Match existing panels. When reviewing agent-generated UI, immediately check for palette violations (green text, CRT effects, terminal chrome).

### [Calibration] Data merges have operation-tempo butterfly effects — always verify corridor connectivity (2026-03-21) — NEW
- **Context**: Merging 32 micro-OSIDs (< 1 km²) removed `drinjaca` and `paljevici` from Op Drina Zvornik Sweep (5→3 objectives). The operation completed faster, freeing VRS brigades earlier. Those brigades took `rastosnica_2` before ARBiH Op Teočak could fire (w25), cutting the Teočak-Tuzla corridor — a historically critical lifeline.
- **Wrong approach**: Removing operation objectives without checking what the freed brigades would do. Assuming a data-only change (OSID merge) wouldn't affect simulation behavior. Not diffing yesterday's run against today's run to identify regressions.
- **Right approach**: After any OSID merge, check ALL operations that referenced merged OSIDs. Replace removed objectives with same-area alternatives to maintain operation tempo. After running, verify corridor connectivity (BFS from enclaves/pockets to heartland). Compare with previous run's control map.
- **Do instead**: When removing OSIDs from operations, add replacement objectives of equal count. After calibration runs, check: (1) Teočak→Tuzla, (2) Goražde connectivity, (3) Srebrenica enclave size, (4) Bihać pocket integrity. Use `bfsComponent()` checks, not visual inspection.

### [Calibration] Operation objective reorder causes 200km butterfly effects — always compare full territory diff (2026-03-21) — NEW
- **Context**: Reordering Op Višegrad objectives SE-first (toward Rogatica) caused RS to take `kalesija_selo` and `seher_2` in Kalesija municipality — 200 km from Višegrad. This encircled 3 ARBiH brigades at Djulici/Vitinica (historically connected). The reorder also shifted 12 OSIDs across Rogatica, Srebrenica, and Pale.
- **Wrong approach**: Evaluating op changes by local effect only (Višegrad captures). Not checking distant consequences. Committing based on aggregate metrics (area-weighted %) without checking structural correctness (corridor integrity, encirclement).
- **Right approach**: After ANY operation change, run full territory diff (`n986 vs n983` style comparison). Check for gains AND losses. Verify no RBiH pocket is newly encircled. A 0.3pp improvement that creates an ahistorical encirclement is WORSE than no change.
- **Do instead**: After calibration runs, always run: (1) territory diff vs previous, (2) BFS connectivity for known corridors, (3) check for new 1-OSID pockets. Never commit based on aggregate % alone.

### [Data] Non-existent staging OSIDs silently break operation axes (2026-03-21) — NEW
- **Context**: Op Koridor Posavina Flank used staging OSID `op:bosanski_samac:pisari_2` which doesn't exist in the 712-OSID set (and likely never existed). The axis silently failed to execute — no error, no warning. Derventa remained HRHB for 40 weeks while 11,000 VRS personnel surrounded it.
- **Wrong approach**: Not validating staging OSIDs against the actual OSID set. The operation builder doesn't check if the staging OSID exists — it just silently produces no eligible attackers.
- **Right approach**: Add a validation step that checks ALL pre-planned and triggered operation staging OSIDs against `osid_areas.json` at scenario start. Log a warning for any missing OSID. Better: fail hard so broken ops are caught immediately.
- **Do instead**: After ANY OSID merge, grep all operation definitions (pre_planned_operations.ts, triggered_operations.ts) for staging OSIDs and verify they exist. Run `node -e "const a = require('./data/derived/operational/osid_areas.json').areas; ['pisari_2',...].forEach(s => console.log(s, a['op:...'] ? 'OK' : 'MISSING'))"`.

### [Calibration] Always diff yesterday's run before investigating a regression (2026-03-21) — NEW
- **Context**: Teočak was connected yesterday, cut off today. Instead of immediately diffing yesterday's code and run output against today's, time was spent investigating reactive defense, OOB, and supply systems — none of which caused the issue. The actual cause (Op Drina objective count change from micro-OSID merge) was found only after finally bisecting the commits.
- **Wrong approach**: Theorizing about root causes and testing hypotheses without first establishing exactly WHAT changed between the working and broken states.
- **Right approach**: `git checkout <yesterday_commit> -- <files>; npm run sim:scenario:run:40w; diff`. Compare the territory output field by field. The diff immediately shows which OSIDs flipped. Then bisect commits to find which change caused it.
- **Do instead**: When a previously-working feature breaks, FIRST run yesterday's code and compare output. THEN bisect commits. NEVER theorize before establishing the diff. The bisect will tell you exactly which commit broke it.

### [Design] Emergent constraints beat hardcoded gates — let the supply system do its job (2026-03-21) — NEW
- **Context**: Besieged enclave forces (Sarajevo, Goražde, Srebrenica) launched full corps offensives despite supply strangulation. Initial fix was a hardcoded enclave gate that checked `getEnclaveIdForOsid()` and blocked enclave brigades from operations.
- **Wrong approach**: Hardcoding which enclaves can't attack. Fragile, not extensible, doesn't respond to changing game state (e.g. if a corridor opens, the hardcode still blocks).
- **Right approach**: The supply system already derives per-OSID supply state (`adequate`/`strained`/`critical`) via `findHeartlandComponent` + BFS. Sarajevo is correctly marked `strained` (local source disconnected from heartland). Filter supply-constrained brigades from the offensive pool and the constraint emerges naturally. Bihać works correctly without exemption — its sources ARE in the heartland.
- **Do instead**: When a game system needs to constrain behavior, look for an existing system that already derives the right signal. Wire the constraint to that signal rather than creating a parallel detection mechanism. The supply system knew Sarajevo was cut off — the offensive system just wasn't listening.

### [Calibration] Graz Accords cold front check must exclude mixed-opponent sectors (2026-03-21) — NEW
- **Context**: `isSectorColdFront()` checked if `opposing_factions.includes('HRHB')` — but SRK sectors face both HRHB (Kiseljak pocket) and RBiH (Sarajevo enclave). All 5 SRK sectors were forced to `screening` stance (0× entrenchment, 0.5× reactive defense) for the entire war.
- **Wrong approach**: Checking if ANY opponent is the truce partner. A sector facing RS↔HRHB+RBiH is an active combat zone that happens to also border the truce partner.
- **Right approach**: Cold front only when the sector's ONLY opponents are the truce pair. `hasNonTruceFoe` guard.
- **Do instead**: When implementing faction-pair mechanics (truces, alliances), always check whether a third faction is also present. Two-way mechanics applied to three-way contact zones produce false positives.

### [OOB] Verify unit identity across sources before treating as separate formations (2026-03-21) — NEW
- **Context**: `rs_rogatica_brigade` and `rs_1st_podrinje` were both in the OOB — same unit (renamed when transferred from SRK to Drina Corps Nov 1992). Phantom brigade inflated Drina strength by 1800 personnel, causing 6pp Drina region error.
- **Do instead**: When OOB has two units with the same home municipality or overlapping area, verify they aren't the same unit under different names. Cross-reference Wikipedia, ICTY, and Balkan Battlegrounds. Unit redesignation on corps transfer was common in VRS.

### [Architecture] A corps_id on a brigade means nothing if the corps formation doesn't exist (2026-03-19) — NEW
- **Context**: `hvo_central_bosnia` was referenced by `corps_id` on 7 HRHB brigades, existed in `corps_command`, but never appeared in `formations`. The sector system's `getCorpsForFaction()` filters `formations` for `kind === 'corps_asset'` — a missing formation means 0 sectors, 0 edges, 0 operations, regardless of how many brigades point at it. The corps was a phantom — present in the org chart but absent from the game world.
- **Root cause**: The `activate-corps` pipeline step only ran in the peace phase. Scenarios starting directly in war phase (the 40w/52w scenarios) skipped it. `hvo_central_bosnia` (`available_from: 10`) never got created.
- **Right approach**: Always verify both ends of a formation→corps reference. A brigade with `corps_id: 'hvo_central_bosnia'` is useless unless `formations['hvo_central_bosnia']` exists with `kind: 'corps_asset'` and `status: 'active'`. Pipeline steps that create formations must run in ALL phases, not just peace.
- **Do instead**: When a corps has `subordinate_count: N` but `0` sectors, check if the corps exists as a formation. If it's in `corps_command` but not in `formations`, the formation was never created. Grep for `getCorpsForFaction` to see what the sector system actually uses.

### [Architecture] Readiness state machines need irreversible transitions (2026-03-19) — NEW
- **Context**: `deriveReadinessState()` ran every turn and could revert `active` brigades to `forming` when cohesion dropped below 40. All 29 HRHB brigades oscillated between active/forming every turn due to supply-driven cohesion fluctuations. The `activation_turn` field kept resetting to the latest recovery turn (w55 of 56w), so the system thought they had just activated.
- **Wrong approach**: A pure function that derives readiness from current cohesion. The function has no memory of whether the brigade was ever active — it just looks at the current number.
- **Right approach**: Once a brigade transitions past `forming`, it should NEVER revert to `forming`. Low cohesion after activation → `overextended` (30-39) or `degraded` (<15), not `forming`. The `forming` state means "hasn't activated yet" — not "currently low cohesion."
- **Do instead**: In any state machine where states represent lifecycle phases (forming→active→degraded), make forward transitions irreversible. A re-derived state should respect the lifecycle direction. Use `activation_turn !== null` as evidence that the brigade has been activated before.

### [Sectors] Enclave corps get absorbed by sector consolidation — brigade-presence must protect at component level (2026-03-19) — NEW
- **Context**: `hvo_central_bosnia` had 5 brigades at Kiseljak/Zepce front OSIDs but got 0 sectors. `consolidateCrossCorpsFronts` found CB edges in connected components dominated by `hvo_tomislavgrad`. Per-edge protection (`isEdgeProtectedFromReassignment`) saved edges where brigades stood, but adjacent edges without brigades were consolidated into Tomislavgrad. Over multiple components, CB lost all edges.
- **Wrong approach**: Per-edge brigade protection. An edge 50m from a brigade gets absorbed while the brigade's own edge is protected — splitting the sector boundary mid-pocket.
- **Right approach**: If ANY edge in a connected component has a brigade from the minority corps, protect ALL edges of that corps in the component. Brigade presence = corps has a physical claim to the entire local front, not just the specific OSID.
- **Do instead**: When debugging "corps X has 0 sectors despite brigades at front", trace through: (1) does the corps exist as a formation? (2) does `mapOsidsToCorps` assign its home OSIDs? (3) does `partitionFrontEdges` give it edges? (4) does consolidation steal them? Use debug logging at each step boundary.

### [Pipeline] Orders issued late in pipeline survive to next turn — know which step consumes them (2026-03-19) — NEW
- **Context**: Post-operation return march orders issued at step 708 (`advance-sector-offensives`) appeared to have no effect. Investigation revealed the war pipeline has TWO movement steps: step 496 (`osid-column-movement`, column marches) and step 517 (`apply-brigade-movement`, one-hop + clears ALL orders). Column-stance orders issued at step 708 survive to next turn's step 496, which runs BEFORE step 517 — so they ARE processed correctly.
- **Wrong approach**: (1) Assuming orders were being eaten — wasted time adding a "preserve column orders" fix to `brigade_movement_orders.ts` that was unnecessary. (2) Using `movement_report.column_starts: 0` as evidence of failure — that field comes from a different step. (3) Not verifying with a simple console.log first.
- **Right approach**: When issuing state mutations late in the pipeline, trace which step CONSUMES that state field next turn. Draw the pipeline step order on paper: `496:column-move → 517:one-hop-move(clears) → 608:return-displaced → 708:advance-ops`. Column orders from step 708 are consumed at step 496 next turn because 496 < 517.
- **Do instead**: Before assuming pipeline orders don't work, add a temporary console.log to confirm they fire. Then trace consumption: find ALL steps that read `brigade_movement_orders` and note their order. The step with the lowest number that handles your order type is the consumer.

### [MapLibre] isStyleLoaded() returns false during map.on('load') after adding sources — don't use style-loaded guards in init (2026-03-19) — NEW
- **Context**: Ops modal arrow source and layers were never created during map init. `replaceArrowSource()` was called inside the `map.on('load')` callback, but after adding other sources (territory, front lines, objectives, staging) in that same callback, `isStyleLoaded()` returns false. MapLibre's style state transitions to "loaded" before the callback, but adding sources during the callback puts the style back into a non-loaded state internally. Any code that guards on `isStyleLoaded()` will skip.
- **Wrong approach**: Using `replaceArrowSource()` (which does remove+re-add) during init. The remove step finds nothing to remove (source doesn't exist yet), then the add step runs, but the style-loaded state is already compromised by earlier source additions in the same callback. The source appears to be added but layers silently fail to render.
- **Right approach**: During the `map.on('load')` init callback, create sources and layers directly via `map.addSource()` + `map.addLayer()` without any `isStyleLoaded()` guards. Reserve the remove+re-add pattern (`replaceArrowSource`) for subsequent updates triggered by React effects, where the style IS fully loaded.
- **Do instead**: In any MapLibre `map.on('load')` callback, never gate source/layer creation on `isStyleLoaded()`. If you have a helper function that does remove+re-add (designed for updates), do NOT call it during init — the "remove" step is a no-op and the "add" step may silently fail. Create init sources/layers inline, then use the helper for updates only. This is distinct from the `setData()` modal bug (GUI_MASTER section 4) — that bug affects updates, this one affects init.

### [Geometry] TopoJSON topology() quantizes coordinates — never rebuild topology from final GeoJSON (2026-03-19) — NEW
- **Context**: Front line gaps caused by `topojsonClient.merge()` not creating shared arcs between cluster polygons. 37 OSID pairs have no shared polygon edges despite being adjacent. Attempted fix: Pipeline Phase 5d second topology pass to create shared arcs. TopoJSON `topology()` quantization altered polygon coordinates even at 1e8 quantization, regressing calibration from 91% to 87%.
- **Wrong approach**: Round-tripping GeoJSON through `topology()` to fix shared arcs. The quantization step inherent in TopoJSON topology construction snaps coordinates to a grid, altering polygon shapes downstream. Even at very high quantization (1e8), the coordinate drift is enough to change polygon areas and shift calibration results.
- **Right approach**: Fix polygon boundaries at the source (vertex snapping at the geometry level) without rebuilding topology. Snap near-miss boundary vertices directly, preserving original coordinate precision.
- **Do instead**: Never rebuild topology from final GeoJSON if coordinate precision matters for downstream calibration. If polygons need shared boundaries, fix them at the vertex level (geometric snapping) rather than through topological reconstruction. TopoJSON is a serialization format, not a geometry repair tool.

### [Scaling] Per-brigade mechanics are explosive — use faction-level capped budgets (2026-03-18) — NEW
- **Context**: `faction_progression.ts` gave every active brigade +1 tank/16 turns and +1 artillery/8 turns. With 125 ARBiH brigades this produced 243 phantom tanks (historical ~30-50) and 668 phantom artillery (historical ~150-250). Mountain infantry in Drina pockets were acquiring tanks.
- **Wrong approach**: Per-brigade-per-tick equipment tickers. Any per-brigade mechanic scales linearly with brigade count. As OOB grows from recruitment, the output explodes quadratically (more brigades = more production = more equipment = more brigades survive = more production).
- **Right approach**: Faction-level capped budgets. ARBiH gets 2 tanks + 3 artillery per 12 turns from smuggling (split 60/40 ARBiH/HVO), plus 3 artillery per 8 turns from Zenica steelworks. Fixed output regardless of brigade count. Distribution goes to best-equipped brigade (concentrates on mech/motor, not light infantry).
- **Do instead**: When designing any per-tick mechanic, ask: "what happens when there are 125 entities?" If the answer is "125x the output," use a faction-level budget instead. Per-brigade scaling is acceptable only for consumption (maintenance drain), never for production.

### [Architecture] Proxy mechanics mask missing real mechanics — check before building (2026-03-18) — NEW
- **Context**: The equipment auto-ticker in `faction_progression.ts` existed because `captureEquipment()` was never wired into `attack_resolution_osid.ts` (the OSID-based resolver used for all sector operations). The capture function existed only in the legacy `battle_resolution.ts` (dead code path). The auto-ticker was a proxy for captures that weren't happening.
- **Wrong approach**: Building a proxy mechanic (auto-ticker) to compensate for a missing real mechanic (capture). The proxy masked the bug — nobody noticed captures weren't happening because equipment was arriving anyway.
- **Right approach**: Before building any compensating mechanic, verify that the primary mechanic works. If ARBiH isn't capturing tanks, check whether `captureEquipment()` is called in the live combat path, not whether a separate system can inject tanks.
- **Do instead**: When a mechanic's output seems low and you're tempted to add a supplementary source, first verify the primary source is actually producing output. Check call sites, not just function existence. A function that exists but is never called in the live path is dead code.

### [Data Integrity] Transfers must debit the source — or you get duplication (2026-03-18) — NEW
- **Context**: `brigade_dissolution.ts` transferred 70% of equipment to the nearest same-corps brigade but never zeroed the dissolved brigade's `composition`. On reconstitution, the brigade kept its original equipment — duplicating 70% per dissolution/reconstitution cycle.
- **Wrong approach**: Transferring data without clearing the source. The transfer function updated the recipient but left the donor unchanged. Classic double-spend.
- **Right approach**: Any function that transfers a resource (equipment, personnel, supply) MUST zero the source field after transfer. Use a pattern: `const transferred = source.field * rate; target.field += transferred; source.field = 0;`
- **Do instead**: When writing any transfer/redistribution function, the final step must be zeroing the source. Search the codebase for other transfer functions and audit: does the source get debited? If not, there's a duplication bug.

### [Defaults] Default cases in switch/if chains catch everything you forgot (2026-03-18) — NEW
- **Context**: `displacement_loss_constants.ts` had explicit kill fractions for RS displaced by non-RS (1%) and RBiH displaced by RS (2%), with a 4% default. Croats hit the 4% default because no explicit HRHB case existed — giving them double the Bosniak rate. Historically inverted: Bosniak ethnic cleansing by RS was uniquely severe (~75% of civilian deaths), Croat displacement had much lower kill rates.
- **Wrong approach**: Using a generous default and assuming you've covered all important cases. The default was 4% — higher than any explicit case — and silently applied to all uncovered faction combinations.
- **Right approach**: Every faction combination (3 displaced-by x 3 displacing = 9 combinations) needs an explicit rate. The default should be the LOWEST plausible rate (1-2%), not the highest, so forgotten cases fail safe rather than fail lethal.
- **Do instead**: In any system with faction-specific behavior (kill fractions, mobilization, doctrine), enumerate ALL faction combinations explicitly. If you must have a default, make it conservative (low impact), never aggressive. Review: what faction combinations exist? Are they all covered?

### [Architecture] Two stores tracking the same data will diverge (2026-03-18) — NEW
- **Context**: `civilian_casualties` and `displacement_event_log` tracked civilian deaths through 3 independent write paths: `processDisplacementTakeover` wrote to both, `advanceParamilitaries` wrote to `civilian_casualties` only, and `updateDisplacement` wrote to event log only (and lumped killed+fled into `killed`). Result: 3,700 divergence between the two stores.
- **Wrong approach**: Having two parallel stores that both track "civilian deaths" but are written to by different code paths. Each new write path only updated one store (the one the author knew about).
- **Right approach**: Either unify into one store (make one authoritative and derive the other) or ensure a single write function that updates ALL stores. `recordCivilianDisplacementCasualties()` now serves as that single function — every write path calls it.
- **Do instead**: When you find two fields/stores tracking the same data, immediately audit ALL write paths. If any write path updates one but not the other, there's a divergence bug. Prefer a single authoritative store with a single write function. If two stores are needed (e.g., summary + log), the write function must update both atomically.

### [Sectors] Small adjacent sectors in the same corps should merge (2026-03-18) — NEW
- **Context**: Brcko anchor failed (12/13) because the 215th and 108th brigades were in different sectors despite defending the same front. Reactive defense (which operates within sectors) never activated — each brigade fought alone against 3-11x odds. The sector system split co-located brigades into separate sectors.
- **Wrong approach**: Accepting any sector partition where brigades are technically "in a sector." The sector system created many 1-2 edge sectors at Brcko instead of merging them into a defensible unit.
- **Right approach**: Undersized sectors (fewer edges than a threshold) adjacent to same-corps sectors should be merged. This ensures reactive defense covers the full defensive line. The merge in `mergeUndersizedSubSegments` already existed but the threshold was wrong for this case.
- **Do instead**: When a front line defense fails despite having adequate forces present, check whether the forces are in the same sector. If two brigades are 1 hop apart but in different sectors, reactive defense won't help either one. Merge thresholds should be aggressive for same-corps sectors on the same front.

### [Design] Engine soundness over calibration percentage (2026-03-18) — NEW
- **Context**: After implementing 7 engine fixes, calibration dropped from 90.4% to 89.9% but AI commander observations dropped from 321 to 21. The engine is MORE correct (commanders stopped complaining) even though the number went down slightly.
- **Wrong approach**: Optimizing for area-weighted match %. A broken engine can hit 90% if errors cancel out — wrong mobilization rate offset by wrong defense stacking offset by wrong alliance timing. The percentage is a snapshot of one scenario; it doesn't validate that mechanics are sound.
- **Right approach**: Ask "does the command hierarchy work?" not "did the percentage go up?" When a general orders an offensive and nothing happens, that's a soundness failure regardless of the territory number. When operations claim to execute but produce zero battles, that's a broken pipeline. When alliance decays in 3 months instead of 12, the political model is wrong.
- **Do instead**: Use AI commander observations as the primary engine health metric. Target: 0 bugs, 0 calibration issues, minimal design gaps. The area-weighted % is a secondary sanity check (stay above 85%), not the goal. An 88% run where every system works correctly is better than a 92% run where operations are stuck and morale is broken.

### [QA] AI commanders are your best alpha testers — run them after every engine change (2026-03-18) — NEW
- **Context**: Three API-powered AI commanders (Mladić, Halilović→Delić, Petković) played a 40-week campaign and produced 321 diagnostic observations. They found: alliance decays too fast (22 obs), ARBiH over-mobilized (84 obs), operations not producing visible combat (38 obs), territory pacing wrong (16 obs), no patron directive system (12 obs), Jajce timing off (11 obs), late-war stasis (6 obs). Each observation includes severity, expected vs actual, and affected system.
- **Wrong approach**: Relying only on area-weighted % and benchmark pass/fail to evaluate engine health. These catch territorial accuracy but miss behavioral absurdities, force strength calibration, political timeline accuracy, and design gaps.
- **Right approach**: Run `npm run sim:qa:commanders` after every engine change. The AI commanders read the game state with historical knowledge and flag anything that doesn't match reality. The observation count is the engine's health metric — it should decrease with each fix cycle. Self-correction loop: fix → re-run → count → repeat.
- **Do instead**: After every calibration run or engine change, run the three-commander QA. If observations increase, the change introduced problems. If they decrease, the engine improved. Target: 0 bugs, <50 calibration, <10 design gaps.

### [Architecture] Redundant gates mask each other — fix one and the next blocks (2026-03-18) — NEW
- **Context**: Offensive corps had no operations. Investigation found SECONDARY_OP_COOLDOWN_TURNS=8 was the suspected blocker. Fixed it to 3 for offensive stance. Result: zero effect (identical hash). The real blocker was isDefenseStrained (density < 0.167). Fixing that revealed supply_critical as the NEXT blocker. The engine has 5+ independent gates on operation launch; when multiple block simultaneously, fixing one reveals nothing.
- **Wrong approach**: Assuming the first blocked gate is THE problem. Fixing cooldown when density was the binding constraint wasted a fix cycle.
- **Right approach**: The `op_launch_trace` diagnostic was the correct solution — log ALL gates, not just the first one that blocks. Now the engine reports `blocked:density_strained(0.120<0.167)` so you know exactly which gate to fix. After fixing, re-check — the trace will show the next gate.
- **Do instead**: When a multi-gate system blocks something, instrument ALL gates (not just the first match). Use a trace array that captures every gate's status. Then fix the binding gate first and re-run to see if the next gate becomes binding. This is why `op_launch_trace` exists.

### [Architecture] Formula bots silently override player/AI intent — add override guards (2026-03-18) — NEW
- **Context**: AI army commander set corps stances (offensive/defensive), but `generateCorpsStanceOrders()` in `bot_corps_stance.ts` overwrote them every turn with the formula bot's computed stance. The AI's strategic decisions were silently ignored. The first Mladić run produced identical results to the formula bot because every stance order was overwritten.
- **Wrong approach**: Injecting decisions into state and assuming downstream systems will respect them. The formula bot's stance generation runs DURING the turn pipeline and overwrites any pre-turn mutations.
- **Right approach**: Added an explicit override guard: `generateCorpsStanceOrders()` now checks `ai_army_decisions[faction]` and uses the AI stance instead of computing its own. Only active when AI decisions exist; formula-only mode unchanged.
- **Do instead**: When adding any override mechanism (AI, player, or scripted), trace the FULL pipeline to find every system that writes to the same field. Each writer is a potential override bypass. The guard must be at EVERY write point, not just the first one. Test by checking: "if I set X before the turn, is X still set after the turn?"

### [Data] Nested JSON keys cause silent zero-data bugs (2026-03-18) — NEW
- **Context**: `osid_areas.json` has areas nested under an `areas` key: `{ total_area_km2: 51337, osid_count: 744, areas: { "op:banja_luka:...": 135.3, ... } }`. The runner loaded the top-level object and used it directly as `Record<string, number>`, getting string keys like "total_area_km2" instead of OSID keys. Result: all territory percentages showed 0% for all factions. The AI commanders diagnosed this themselves: "All factions show 0% territory — this is mechanically impossible."
- **Wrong approach**: Assuming JSON files are flat `Record<string, number>`. Not checking the actual structure before using it.
- **Right approach**: `osidAreas = raw.areas ?? raw` — check for nested key, fall back to flat. Better: validate the loaded data has the expected shape (keys start with `op:`).
- **Do instead**: When loading a JSON data file, always check the actual structure first (`node -e "console.log(Object.keys(require('./file.json')))"` or read first 5 lines). Don't assume flat. Add a shape check after loading: if the first key doesn't match expected format, the data is nested or wrong.

### [Process] Area-weighted territory is the ONLY valid metric — never use OSID counts (2026-03-18) — NEW
- **Context**: Throughout the session, territory was reported as OSID count percentages (e.g., "RS 49.4%"). The user corrected: "I prefer area-weighted at all times." OSID counts are misleading because a single Krajina OSID can be 300km² while a Sarajevo OSID is 2km². RS at 49.4% by OSID count is actually 60.3% by area — a 10pp difference that completely changes the strategic picture.
- **Wrong approach**: Using `Object.keys(pc).filter(o => pc[o] === faction).length / total` — counts OSIDs regardless of size. Quick to compute but fundamentally misleading.
- **Right approach**: Load `data/derived/operational/osid_areas.json` (nested under `.areas` key), sum area per faction. Use area-weighted % everywhere: scripts, diagnostic prompts, reports, commander briefings.
- **Do instead**: Any time you compute territory percentages, use area-weighted. Load osid_areas.json once at startup. If displaying territory to user, AI, or in reports, it MUST be area-weighted. OSID counts are only acceptable for internal debugging where you need to know "how many OSIDs changed."

### [Planning] Multi-milestone roadmaps need freeze points, not just feature lists (2026-03-16) — NEW
- **Context**: Full roadmap review of 20 milestones (v0.5.0→v1.0.0) revealed a 7-step content dependency chain: events → essays → codex → help → tutorial → localization → store page. A change to event titles at v0.6.0 would cascade stale content through 6 downstream milestones. Without explicit freeze points, late changes destabilize everything.
- **Wrong approach**: Treating each milestone as independent. "We can always fix the text later." Late text changes require re-translation (v0.7.2), re-reviewed essays (v0.6.4), updated help tooltips (v0.5.2), and new store screenshots (v0.9.1). The cost of a "simple" late change multiplies through the dependency chain.
- **Right approach**: Define explicit freeze points in the roadmap where specific categories of change become prohibited: event freeze, content freeze, feature freeze, text freeze, code freeze. Each freeze narrows what CAN change, preventing cascading rework.
- **How to apply**: When planning any multi-milestone roadmap (>5 milestones), identify the content/feature/text dependency chains and place freeze points after the last milestone that produces each category. After a freeze, changes to that category require explicit Orchestrator approval with impact assessment on all downstream milestones.

### [Planning] Cross-plan reviews catch rework before it happens (2026-03-16) — NEW
- **Context**: v0.5.0 Phase 4 added diplomatic briefing items to the UI-side `buildCommandBriefing()` in GameStateAdapter. v0.5.1 Phase 2 rebuilt the entire briefing system sim-side in `collect_briefing.ts`. Without cross-plan review, the v0.5.0 work would have been thrown away and rewritten in v0.5.1. Also caught: capital bars built twice (v0.5.0 + VerdictScreen), SaveBrowser ordering dependency, help content duplicating codex content.
- **Wrong approach**: Writing plans in isolation and assuming they won't conflict. Each plan looks correct independently; integration failures only appear when comparing them.
- **Right approach**: After writing a batch of plans, do a dedicated cross-plan review pass looking for: shared systems modified by multiple plans, components built twice, execution ordering assumptions, content overlap. Produce a separate review document with numbered findings and apply changes to all affected plans.
- **How to apply**: Every batch of 3+ plans gets a cross-plan review before handoff. For plans spanning multiple version series (v0.5.x + v0.6.x), also do a cross-series review focusing on systems that evolve across the boundary.

### [Architecture] Build extension points early — registry patterns prevent god components (2026-03-16) — NEW
- **Context**: Cross-series review found that 7 shared systems (briefing, settings, SFX, verdict, menu, codex, App.tsx) were each modified by 3-6 milestones across v0.5.x and v0.6.x. Without extension points, each milestone would edit the same files, creating merge conflicts and bloated components. App.tsx alone was touched by 6 milestones.
- **Wrong approach**: Building a component in one milestone and having subsequent milestones modify its internals. Each edit increases coupling and merge conflict risk. By v0.6.4, the original component is unrecognizable.
- **Right approach**: When building a component that WILL be extended by later milestones, use a simple **open registry pattern**: an array of items + a `register()` function. Later milestones push onto the array without modifying the original file. Cost: ~10 lines of code. Savings: prevents 6+ milestones of invasive edits.
- **How to apply**: For any component in a multi-milestone roadmap: count how many future milestones will touch it. If ≥3, add a registry pattern. Applies to: panel sections, menu items, briefing collectors, SFX manifests, settings sections, post-game tabs.

### [Planning] Calibration sandwiches need a freeze protocol (2026-03-16) — NEW
- **Context**: v0.6.0 adds 60+ events with mechanical effects. v0.6.1 calibrates the game. v0.6.3 adds AI-generated procedural events with MORE mechanical effects. The calibration sits in the middle — stable before, destabilized after. Without a freeze protocol, the calibration work becomes invalid.
- **Wrong approach**: Calibrate once and assume all subsequent milestones are calibration-neutral. Any milestone that adds mechanical effects (events, AI content, economy changes) invalidates the calibration.
- **Right approach**: After the calibration milestone, establish a **calibration freeze baseline** (`data/calibration/v0.6.1_freeze.json`). Any subsequent milestone with sim-affecting changes MUST regression-test against this baseline. Pass criterion: all benchmarks within 2%.
- **How to apply**: After any calibration sprint, store the baseline. Tag it. Every future PR that touches `src/sim/` must include a calibration regression check in its checklist.

### [OOB] Home brigades must be strong enough to survive the initial blitz (2026-03-15) — NEW
- **Context**: Gradačac fell to VRS at w23 (PR 19.24 — essentially undefended). The 213th Vitežka started at 550 personnel and was swept at w5 during the VRS blitz, displaced to Doboj, and never returned. Gradačac was never captured historically — the 213th was one of ARBiH's strongest formations. Similarly, the 215th Vitežka at Bijela (700 pers) was overrun at w7.
- **Wrong approach**: Starting brigades at 550-700 personnel and expecting the recruitment pool to reinforce them in time. The VRS blitz hits at w3-w7 with PR 5-19 — brigades need to be combat-capable from turn 0.
- **Right approach**: Brigades defending critical positions (Gradačac, Bijela, Teočak, etc.) must start with enough personnel to absorb the initial blitz (1200-1500 pers). The pool reinforces them AFTER the front stabilizes, not before. Don't use `hold_municipalities` as a substitute for adequate initial strength — a properly manned home brigade holds its position naturally.
- **How to apply**: When reviewing OOB for a position that should hold historically, check: (1) is the home brigade's initial_personnel enough to survive a PR 2-3:1 attack? (2) does the brigade have defense_terrain_bonus appropriate for the terrain? (3) is the brigade available from turn 0 (not gated behind available_from)?

### [Architecture] Virtual identity routing must be respected by ALL consumers (2026-03-15) — NEW
- **Context**: The elite loan system routed brigades through `loanedCorpsMap` in `classifyBrigadesByTerritory` (sector assignment) but the bot brigade AI used `brigade.corps_id` directly. The sector system saw the elite as a Drina Corps brigade; the AI saw it as a Main Staff brigade with no operations. Result: elites assigned to correct sectors but received zero operation orders for 40 weeks.
- **Wrong approach**: Patching the routing in one consumer (sector assignment) and assuming others will follow. Each consumer independently looks up `corps_id`.
- **Right approach**: After adding any identity-routing mechanism (loan, detachment, operational control), grep ALL references to the original identity field (`corps_id`, `faction`, etc.). Each reference is a potential bypass. A routing system that only works in one consumer is worse than none — it creates the illusion of correctness.
- **Do instead**: When adding virtual identity (loaned corps, temporary faction, etc.), search for ALL references to the real identity field. Test by tracing: "if I follow this entity through every pipeline step, does it use the virtual identity consistently?" The `bot_brigade_ai_osid.ts` corps lookup was the fifth bug found — invisible from the other four layers.

### [Debugging] Formation kind values: always verify against save files (2026-03-16) — NEW
- **Evidence**: `generateArmyHQOverrides` filtered for `f.kind === 'corps'` but corps formations use `kind: 'corps_asset'`. The function returned empty arrays for every faction on every turn — the entire Phase B army HQ override system was dead code. No error, no warning, just silent zero results.
- **Root cause**: The kind value was assumed from the type name, not verified against actual data. Other files in the codebase already used `f.kind === 'corps' || f.kind === 'corps_asset'`.
- **Rule**: When writing code that filters formations by `kind`, check the save file for actual values. Never assume `'corps'` — check for `'corps_asset'`, `'army_hq'`, `'brigade'`, `'paramilitary'` etc. The type system doesn't catch string literal mismatches against runtime data.
- **Related**: Save field name lesson (2026-03-12) — `corps_id` not `corps`, `location_osid` not `current_osid`.

### [Debugging] Paper-transfer systems need end-to-end smoke tests (2026-03-15) — NEW
- **Context**: The elite loan system set `on_loan=true`, updated tracker episodes, generated requests, deployed brigades — all correctly. But elites never fought. Five bugs across four files prevented combat. The "system works" appearance (correct flags, tracker entries, UI) masked total behavioral failure for 40 weeks.
- **Wrong approach**: Trusting that correct state means correct behavior. The loan state was perfect; the behavior was zero.
- **Right approach**: Define a smoke test before claiming any new system works: "what observable behavior MUST occur?" For elite loans: "at least one elite must appear in `weekly_report` battles." If the smoke test fails, trace the entity through every pipeline step: spawn → deploy → sector assign → corps command lookup → operation participation → brigade AI → attack order → battle resolution.
- **Do instead**: For every new system that should produce observable behavior (combat, movement, territorial change), define the smoke test up front. Run it before claiming the system works. If the smoke test fails, do NOT debug the most complex layer — trace from input to output and check each handoff.

### [Architecture] Derived state must be computed AFTER all its producers have run (2026-03-14) — NEW
- **Context**: `defensive_power` and `threat_ratio` were computed inside `classifyBrigadesByTerritory` (Step 6 of `buildCorpsFrontSectors`). Step 7 (`ensureMinimumSectorCoverage`) and Steps 8a/8b also modify `assigned_brigade_ids`. Sectors rescued by Step 7 from scratch had `dp=0` forever — no brigades existed when dp was computed. Cascade: `dp=0` → `threat_ratio=0` → density equalization scores those sectors near-minimum → SRK siege ring brigades never get reassigned there → siege ring stays thin.
- **Wrong approach**: Computing derived values mid-pipeline when producers haven't all finished. The value appears valid (no crash, no assertion) but is stale by end of pipeline.
- **Right approach**: Extract to `recomputeSectorPowerAndThreat()`, call as the final step (Step 8c) AFTER all assignment steps complete. If a value depends on a mutable collection, compute it after that collection is fully settled.
- **Do instead**: For any derived field X that depends on collection Y: find ALL pipeline steps that modify Y. If any run AFTER X is computed, move X's computation to after the last Y modifier. This applies to `assigned_brigade_ids`, `territory_osids`, brigade counts — any collection that multiple pipeline steps touch.

### [Architecture] Use blacklists not whitelists for blocking logic that must cover new cases by default (2026-03-14) — NEW
- **Context**: Graz Accords truce was written as a whitelist: block ONLY two specific corps pairs (`vrs_2nd_krajina↔hvo_tomislavgrad`, `vrs_herzegovina↔hvo_southeast_herzegovina`). Every other RS↔HRHB combination was silently exempt. When SRK pushed into HVO Sarajevo area — which should be cold-front per Graz — no block triggered because SRK wasn't in the pair list. Adding new corps or fronts to the game automatically exempts them.
- **Wrong approach**: Whitelist the blocked pairs. New pairs require explicit developer addition; omission means attacks pass through.
- **Right approach**: Block all RS→HRHB attacks at faction level, then explicitly exempt the Posavina corridor (`vrs_1st_krajina`, `vrs_2nd_krajina`) where the Corridor 92 conflict was active. New corps default to blocked, not exempt.
- **Do instead**: When a constraint should apply broadly with narrow exceptions, write it as a blacklist with exemptions. When a constraint should apply narrowly with a broad default, write it as a whitelist. Getting this wrong means every new feature or faction addition bypasses the guard by default. Ask: "if I add a new entity tomorrow, do I want it blocked or allowed?"

### [Architecture] Phase 1 positional capture prevents home-affinity recovery for displaced brigades (2026-03-14) — NEW
- **Context**: In `classifyBrigadesByTerritory`, Phase 1 captures brigades physically located at a front OSID using `continue` — Phase 2a home-affinity never runs for captured brigades. A Zenica brigade that marched to the Doboj front edge gets permanently captured into the Doboj sector; its home-sector chance is gone. The 4-hop cap in Phase 2c (n696) mitigates this by preventing initial long-range displacement, but once a brigade is Phase 1 captured far from home, the phase ordering trap is permanent.
- **Wrong approach**: Adding home-affinity logic in Phase 2a and assuming it will fix displaced brigades. If they were captured by Phase 1, Phase 2a never runs for them.
- **Right approach**: The 4-hop cap is the correct structural prevention — stop brigades from marching far from home in the first place. Phase 1 positional capture is correct behavior (a brigade at the front should defend that front); the problem is how it got there, not Phase 1.
- **Do instead**: When adding recovery logic in Phase N, trace whether early-capture phases (with `continue`) will prevent Phase N from seeing the problematic cases. Document Phase 1's scope limitation explicitly. If brigades shouldn't drift far from home, enforce that constraint in march orders, not in assignment recovery.

### [Architecture] Port systems incrementally, not all-at-once (2026-03-08) — promoted from Recently Violated (clean 4 days)
- **Violation evidence**: Phase 3 GameState domain segregation (`6cf1038`) changed 64 files in one commit. Required 6 automated fixup tools to repair broken tests. Volume of fixup tooling signals scope was too large for one pass.
- **Do instead**: When porting a system to a new model, port one subsystem at a time. Each port step should leave tests green. If you need more than 2 fixup tools, the change is too large.

### [Process] Classify tasks by actual system impact, not plan labels (2026-03-07) — promoted from Recently Violated (clean 4 days)
- **Violation evidence**: n500 bundled THREE structural engine changes: ops-only attack doctrine, unified sector defense, attack-through. Attribution of calibration regressions became impossible.
- **Do instead**: One structural behavior change per commit. "This plan section" is not a valid bundling criterion — impact is.

### [Architecture] Pipeline grouping and splitting steps must use compatible adjacency (2026-03-13)
- **Context**: `splitNonContiguousSectors` (Step 4b) used shared-OSID connectivity — two edges are adjacent if they share any OSID endpoint. `findSubSegments` (Step 1) used triple-junction connectivity — edges must share an OSID AND their other sides must be adjacent. The splitter was LESS restrictive than the grouper, so it never split sectors that the grouper had merged. But when the splitter was made MORE restrictive (using `sharedBoundaryAdj` instead of `osidAdjacency`), it over-fragmented — 2nd Corps went from 13 sectors to 31.
- **Wrong approach**: Using different adjacency sources for grouping vs splitting. Shared-OSID was too permissive (connected edges facing different directions at triple junctions). `sharedBoundaryAdj` was too restrictive (stricter than the grouper's `osidAdjacency`).
- **Right approach**: Both steps now use triple-junction adjacency through the same `osidAdjacency` source. The splitter calls `buildEdgeAdjacency` with the same adjacency the grouper used. This ensures: if the grouper connected two edges, the splitter won't separate them (and vice versa).
- **Do instead**: When a pipeline has a grouping step and a splitting/validation step, verify they use the SAME adjacency/connectivity definition. If the splitter is stricter, it fragments the grouper's output. If permissive, it fails to split what should be separate. Test with both "should split" and "should stay joined" cases.

### [Architecture] Code comments describing sort/selection intent can be outright lies (2026-03-13)
- **Context**: In `splitNonContiguousSectors`, the code comment said "shared-OSID connectivity prevents sectors spanning disconnected fronts." This was true for one case (Srebrenica↔Cerska) but false for another (Zavidovići↔Kakanj). At triple junctions, shared-OSID connects edges facing different directions — exactly the bridging the comment claimed to prevent.
- **Wrong approach**: Trusting the comment and assuming the algorithm was correct because it fixed the original reported bug (n620 Srebrenica↔Cerska).
- **Right approach**: Test the algorithm against MULTIPLE topologies, including the case the comment claims to handle. The Zavidovići↔Kakanj case has the same topology as Srebrenica↔Cerska (edges meeting at a shared OSID but facing non-adjacent hostile sides) but was not caught because nobody tested the "same OSID, different hostile sides that ARE adjacent vs NOT adjacent" distinction.
- **Do instead**: When an algorithm claims to enforce a property (like "no disconnected sectors"), test with at least two topologies: one where the property should prevent merging and one where it should allow it. A single regression test for the original bug is not enough — the algorithm must be tested against the full space of cases it claims to handle.

### [Combat] Flat reserve pooling erases organizational structure (2026-03-13)
- **Context**: The reactive defense model computed `sectorReserves = totalPower - physicalPower` — a single aggregate number for all reserves. The corps spends significant effort on home-municipality affinity assignment (Phase 2a in `classifyBrigadesByTerritory`), positioning brigades where they belong. But in combat, a brigade the corps placed 1 hop from a key point contributed identically to one 8 hops away. The corps's organizational work was invisible to the combat system.
- **Wrong approach**: Pooling all reserves into one number and drawing a fraction. This is simple but erases two critical dimensions: physical distance (how far is the reserve from the fight?) and organizational motivation (is this the brigade's home?). Result: probes are meaningless (same defense everywhere), corps positioning doesn't matter, 74% of front OSIDs that are empty get the same defense as occupied ones in many cases.
- **Right approach**: Per-brigade contribution with distance decay (BFS hops through friendly territory) and home-municipality motivation bonus. Each reserve brigade's contribution = `brigadePower × distanceDecay(hops) × homeBonus`. Casualty distribution uses the same weights — brigades that contributed more to defense absorb more casualties.
- **Do instead**: When a higher-level system (corps) makes positioning decisions, the lower-level system (combat) MUST respect those decisions. If combat treats all reserves as interchangeable, the organizational layer is wasted. Check: does the combat model differentiate between a well-positioned reserve and a distant one? If not, the model is too aggregate.

### [Combat] Defense non-uniformity requires per-entity spatial weighting (2026-03-13)
- **Context**: Defense evolved through three models: (1) `totalPower / edges × density` (n500 — completely uniform), (2) `physicalPower + reactiveResponse` (n524 — two tiers: at-OSID vs flat reactive), (3) REACTIVE_DEFENSE_RATIO=1.5 (n651 — stronger reactive, actually MORE uniform). All are aggregate models that compute a single sector-wide number. Per-entity tracking was never done.
- **Wrong approach**: Computing aggregate defense and dividing equally. This worked for "is the sector defended at all?" but couldn't express "WHERE is it defended strongly vs weakly?" — which is the entire point of probes, concentration, and maneuver.
- **Right approach**: Per-brigade contribution with spatial weighting. Each brigade's contribution depends on BFS distance to the specific attacked OSID. This makes defense genuinely non-uniform: strong near concentrations, weak at the periphery. The extra computation (BFS per brigade per battle, bounded by max 5 hops) is trivial.
- **Do instead**: When a model needs spatial variation within a single organizational unit (sector, region, zone), aggregate division doesn't work. You need per-entity contribution with spatial weighting. Ask: "does the model produce different defense values at different points in the sector?" If the answer is "only two tiers" or "uniform," the model is too coarse.

### [Data] Zero-tolerance thresholds against float-noise data are system-wide failures (2026-03-13)
- **Context**: `SHARED_BOUNDARY_THRESHOLD = 0` in `osid_adjacency.ts` was supposed to only include edges with exact shared polygon boundaries. But the operational GeoJSON has float-precision gaps on virtually all polygon boundaries — only 131 of 3243 edges (4%) had `min_dist === 0`. The remaining 96% of edges were excluded, breaking sector sub-segment connectivity across the entire map. Zavidovići was the most visible failure (all edges `distance_contact` with sub-micron gaps), but the problem was everywhere.
- **Wrong approach**: Setting an exact-zero threshold on derived geometric data. Float precision in GeoJSON means "zero distance" almost never occurs — the threshold silently excluded 96% of legitimate adjacency edges without any warning.
- **Right approach**: Threshold `0.00005` (≈5.5 meters in geographic coordinates) captures 64% of edges — all true neighbors with float-noise gaps — while excluding genuinely distant polygons. The Srebrenica↔Cerska sector-split fix uses shared-OSID connectivity (independent of this threshold), so raising it is safe.
- **Do instead**: When setting thresholds on derived geometric data, check the actual value distribution first (percentiles, histogram). A "strict zero" that passes only 4% of data is a data quality issue, not a feature. Always validate thresholds against the actual data they filter.

### [Architecture] Organic emergence beats hard caps (2026-03-06)
- **Context**: VRS tempo needed to decay over a 40-week war. Personnel needed faction-specific ceilings.
- **Wrong approach**: Adding phase switches ("RS goes defensive at week X"), hardcoded personnel caps, or forced stance transitions. These create artificial cliffs that don't match historical gradual degradation.
- **Right approach**: Fatigue (+2/battle, recovery only off frontline), supply drain (MAINTENANCE_DRAIN 0.045/formation), entrenchment walls (sqrt curve), and pool demographics create organic decay. RS attacks naturally decline 8→1 by w40 without any forced switch.
- **Do instead**: When a faction's behavior needs to change over time, find the emergent lever (fatigue, supply, pool exhaustion) — never add a hard phase switch or cap. If you can't find an emergent lever, the underlying system is missing a mechanic.

### [Calibration] Fixing one faction cascades to all others (2026-03-08)
- **Context**: HRHB was taking 6.3k KIA from phantom attrition on cold (Graz Accords) fronts where no combat should occur.
- **Wrong approach**: Fixing HRHB attrition in isolation and expecting other factions to stay stable. After the fix, HRHB was suddenly too healthy, which changed territorial dynamics, which changed RBiH mobilization pressure.
- **Right approach**: Treat faction calibration as a system — fixing HRHB required HRHB pool scale 1.60→1.05 AND RBiH pool scale 0.18→0.25 to maintain equilibrium. All three factions must be re-verified after any single-faction fix.
- **Do instead**: After fixing any faction-specific bug, immediately check all three factions' troop strength, KIA, and territorial outcomes. Budget time for at least one cascade recalibration run.

### [Debugging] The bug is never where you think it is (2026-03-08)
- **Context**: n304 had too-low casualties and RS wasn't degrading. Looked like a combat balance issue.
- **Wrong approach**: Tuning combat constants (attacker/defender rates, morale thresholds). The real bugs were: (1) `Number.isInteger` check was resetting fractional fatigue to 0 every turn — a type coercion bug masquerading as a balance problem, (2) equipment losses were simply missing from the OSID attack path — only the legacy SID path had them.
- **Right approach**: Trace the actual data flow. Print fatigue values across turns. Check whether equipment loss code even exists in the code path being executed. The answer was "no."
- **Do instead**: Before tuning constants, verify the mechanic is actually executing. Add a diagnostic tool/script to trace the value you're calibrating across turns. If the value isn't changing when it should, you have a bug, not a balance problem.

### [Calibration] Data problems masquerade as engine bugs (2026-03-07)
- **Context**: 84.2% calibration plateau. Combat loop looked broken — VRS wasn't capturing historically-held territory.
- **Wrong approach**: Debugging the combat resolution engine, checking morale, checking attack thresholds. The engine was working correctly — VRS operations simply weren't targeting the right OSIDs.
- **Right approach**: Pre-planned operation target chains in `pre_planned_operations.ts` were missing key OSIDs (Zvornik corridor, Brčko corridor). Adding the correct targets was a data change, not an engine fix.
- **Do instead**: When calibration hits a plateau, check whether operations are targeting the right places before debugging why combat isn't working. Use `weekly_report.jsonl` to trace what was attacked, what was defended, and what was ignored.

### [Architecture] Scope determines lookup granularity (2026-03-08)
- **Context**: First attempt at sector-based frontline attrition used `sub_segments[].friendly_osids` — only border-adjacent OSIDs.
- **Wrong approach**: Using the narrowest scope (border OSIDs). Only 55% of RBiH brigades were at border-adjacent positions. Casualties dropped ~50%. The issue: many brigades are in the sector's depth zone, not directly at the border.
- **Right approach**: Use `assigned_brigade_ids` — any brigade whose `location_osid` is within the sector's `territory_osids`. This captures brigades in the depth zone who still take sniping/shelling/disease attrition.
- **Do instead**: When choosing which entities a system applies to, map out the full spatial hierarchy (border → territory → faction space) and pick the level that matches the mechanic's real-world scope. Passive attrition = entire sector territory. Active combat = border only.

### [Debugging] Override direction is critical and confusing (2026-03-04)
- **Context**: RS territory calibration. RS was under-capturing some areas and over-capturing others.
- **Wrong approach**: Adding under-captured OSIDs to `avoided_osids`. This made RS *even less likely* to capture them — the exact opposite of intended. Cost: -0.7pp regression.
- **Right approach**: `avoided_osids` = fix OVER-captures (prevent VRS from attacking there). `osid_control_overrides` = fix UNDER-captures (force-start RS control). The names are confusing because they describe the *mechanism*, not the *problem*.
- **Do instead**: Before adding any override, state the problem as "RS has too much/too little here" and then match: too much → avoided_osids, too little → osid_control_overrides. Never guess — get it wrong and you regress.

### [Architecture] FormationKind beats conditional checks everywhere (2026-03-07)
- **Context**: Paramilitary units needed to be excluded from reinforcement, bot AI, fatigue, and 6+ other systems.
- **Wrong approach**: Adding `if (f.is_paramilitary) continue;` checks in every system that should skip them. Fragile, easy to miss one, creates maintenance burden.
- **Right approach**: New `FormationKind = 'paramilitary'` type. Existing kind-filters (`f.kind !== 'brigade'`) naturally exclude them from all formation systems without any new conditional checks.
- **Do instead**: When a new entity type needs different lifecycle rules, make it a new Kind (or equivalent type discriminator) so existing filters exclude it automatically. Only add explicit checks for systems where the new type DOES participate.

### [Calibration] Test override blocks in isolation (2026-03-07)
- **Context**: Calibration overrides interact in unexpected ways. Adding 10+ HRHB cell overrides across multiple regions caused cascading regressions (POSAVINA_NE -9.9pp, SARAJEVO -9.3pp).
- **Wrong approach**: Bulk-adding overrides across regions in one change. Each override shifts force balance, supply lines, and bot targeting — effects compound non-linearly.
- **Right approach**: Add overrides by isolated geographic cluster (one region at a time). Verify each cluster's impact before adding the next. Some overrides are "load-bearing" — removing them causes net losses even though they look wrong individually.
- **Do instead**: Add override changes one cluster at a time, run calibration between each, and measure delta. If a single override causes >1pp regression elsewhere, investigate before adding more.

### [Process] OSID-level anchors, not municipality-level (2026-03-07)
- **Context**: Scenario anchors for pockets (e.g., Bihać) were set at municipality level. Municipality-level anchors gave false failures because a municipality can be partially controlled.
- **Wrong approach**: `anchor: "bihac"` — reports failure if any OSID in bihać municipality is lost, even if the pocket (Bihać city) is held.
- **Right approach**: `anchor: "op:bihac:bihac_2"` — checks the specific OSID that represents the pocket core.
- **Do instead**: Always use OSID-level anchors for calibration checkpoints. Municipality-level is too coarse for a 744-OSID map.

### [Calibration] One change per run + mandatory insanity check (2026-03-11, updated from 2026-03-10)
- **Context**: n500 bundled three structural changes — attribution impossible when defense collapsed. Separately, n587 insanity check found morale-0 zombie brigades and 50:1 casualty ratios that pure metrics (area%, benchmarks) never caught. Earlier, "brigades idling in deep rear" (#1) and "83% catastrophic attacks from posture bug" (#2) went undetected for multiple runs because nobody looked at the actual save state.
- **Wrong approach**: (1) Bundling multiple changes into one run. (2) Trusting area% and benchmark pass/fail as sufficient evidence of healthy behavior. Metrics can pass while the sim produces absurdities.
- **Right approach**: One change → one fresh 40w run → comparison tool → **/war-or-game insanity check**. The insanity check is NOT optional — it catches behavioral bugs that metrics miss. Check: brigade states (morale-0? stuck in rear? combat-ineffective attacking?), casualty ratios (>20:1?), tempo (zero-battle weeks?), troop strengths, equipment (`composition` field, NOT `equipment`).
- **Do instead**: After every calibration run, invoke /war-or-game or manually inspect the save for absurdities. Record both metrics AND insanity-check findings in CALIBRATION_MASTER.md. If you skip the insanity check, you will eventually ship a run with a fundamental behavioral bug hidden behind passing benchmarks.

### [Debugging] Persistent symptoms = multi-layer failure (2026-03-10)
- **Context**: Deep-rear brigade evacuation (`89cac36`) — RS had 15 brigades stuck in deep rear. Initial investigation expected 1-2 bugs. Found 7 across: brigade AI evaluation chain, column march destination calculation, transit state reset, territory classification lookup, sector Voronoi gaps, and bot context missing fields.
- **Wrong approach**: Fixing the first bug found and expecting the symptom to resolve. Each fix revealed the next layer.
- **Right approach**: When a symptom persists after the first fix, switch from "find the bug" to "enumerate all layers that could cause this symptom." Build a layer-by-layer diagnostic. The 7-bug fix worked because it systematically audited: evaluation → decision → movement → destination → territory → sector → context.
- **Do instead**: If the first fix doesn't resolve the symptom, stop fixing and start mapping. List every system between input and output. Check each layer independently. Multi-layer failures are the norm in cross-system symptoms, not the exception.

### [Process] Session-scoped infrastructure must be re-created every session (2026-03-10)
- **Context**: Life-lessons daily cron (`3 6 * * *`) was documented in MEMORY.md but not in the napkin. Previous session didn't schedule it. Cron is session-only — dies when Claude exits.
- **Wrong approach**: Documenting session-scoped infrastructure only in reference docs (MEMORY.md). The napkin is what gets actioned at session start; MEMORY.md is background context.
- **Right approach**: Any session-scoped resource (crons, background tasks, watchers) must be in the napkin's Session Startup section with explicit "schedule this" instructions.
- **Do instead**: When adding any session-scoped infrastructure, add it to the napkin Session Startup section immediately. If it's not in the napkin, it won't happen next session.

### [GUI] GameStateAdapter field paths: always verify `state.military.*` (2026-03-10)
- **Context**: Sectors stopped being clickable, hoverable, and highlighting. No white glow line. No zoom from Command. Investigation took hours across MapLibre layer timing, queryRenderedFeatures, line-offset, React race conditions — all red herrings.
- **Wrong approach**: Debugging MapLibre layers, adding diagnostic click handlers, testing line-offset behavior. The entire rendering and interaction pipeline was correct — it simply had no data to work with.
- **Right approach**: A single `console.warn` showing `frontEdgesOsid: undefined` in `runUpdate` revealed the root cause in seconds. `GameStateAdapter.ts:1201` read `(state as any).war_front_edges_osid` instead of `state.military.war_front_edges_osid`. The field was in the save data but at the wrong path — silently returning `undefined`, causing the entire downstream chain (source → layers → interactions → highlights) to never initialize.
- **Do instead**: When a GUI feature "stops working," check `GameStateAdapter.ts` field paths first. Log the field value before any layer/interaction debugging. Watch for `(state as any).X` patterns that should be `state.military.X`. The `front_edges` field (line 1185) correctly uses `state.military.front_edges` — use it as a reference pattern.

### [GUI] Never show raw engine values to the player (2026-03-07)
- **Context**: Officer stats were displayed as raw 1-5 integers. Players saw "Competence: 3" with no context.
- **Wrong approach**: `Math.round(stat * 100)` or showing raw integers. Meaningless to players, breaks immersion, invites min-maxing.
- **Right approach**: `OfficerProfile` component with archetype labels ("Master Strategist"), pip ratings (●●●○○), descriptive text, and origin badges. The underlying 1-5 values drive mechanics but are never shown.
- **Do instead**: Every engine value shown to the player must go through a presentation layer that gives it meaning. Pips, bars, descriptive labels, archetypes — never raw numbers.

### [Process] Update CALIBRATION_MASTER during the session, not after (2026-03-06)
- **Context**: Calibration work produces insights that are lost if not captured immediately. Multiple sessions' worth of constants and run results were scattered across reports.
- **Wrong approach**: Writing calibration notes at end of session or in ad-hoc reports. Knowledge fragments across 20+ report files.
- **Right approach**: `CALIBRATION_MASTER.md` is the single source of truth for current constants, run history, and open questions. Update it as you change constants, not after.
- **Do instead**: Open CALIBRATION_MASTER.md at session start. Update it every time you change a constant or complete a calibration run. Same discipline for GUI_MASTER.md during GUI work.

### [Calibration] Constants need inline range documentation (2026-03-06)
- **Context**: UN airdrops were set to 15 pts/turn — silently dominating RBiH's entire supply system. Only discovered during the n159 audit when drilling into a cascade failure.
- **Wrong approach**: Treating constants as opaque tuning levers. No documentation of expected value range or system impact.
- **Right approach**: Constants get inline docs noting their expected range and which subsystems they dominate. When AIRDROP_MAX_SUPPLY_PER_TURN was capped 15→3, the entire RBiH supply flow changed.
- **Do instead**: When adding a constant, document: expected range, what happens at min/max, and which systems it dominates. A buried constant can be the true control knob while its "documented" parameters do nothing.

### [Calibration] Measure secondary region deltas, not just the target (2026-03-07)
- **Context**: n237 — adding HRHB overrides caused POSAVINA_NE to drop −9.9pp and SARAJEVO −9.3pp. The HRHB region improved; two others regressed.
- **Wrong approach**: Only checking the target region's delta after a change.
- **Right approach**: After every override or pool change, check 2–3 secondary regions that share a border or supply line with the changed area. Faction changes trigger cascades: weaker HRHB → VRS easier wins → different front geometry → different casualty distribution.
- **Do instead**: Always run a full-region ATH diff after any calibration change, not just the target region.

### [Architecture] When you have 50+ overrides for one behavior, the mechanic is missing (2026-03-07)
- **Context**: Goražde, Srebrenica, Žepa were being auto-captured via consolidation. Overrides were piling up to prevent it. The ceiling was stuck at ~93.6%.
- **Wrong approach**: Keep adding `avoided_osids` and `osid_control_overrides` for each enclave. Eventually hit a hard ceiling from override debt.
- **Right approach**: Enclaves aren't a tuning problem — they're an engineering problem. Surrounded OSIDs with ethnic co-control or supply access need an enclave resilience mechanic, not more overrides.
- **Do instead**: Count your overrides. When you have 10+ overrides for the same structural behavior, stop adding overrides and build the mechanic instead.

### [Debugging] One fix can expose a second deeper bug (2026-03-08)
- **Context**: Wiring equipment loss into undefended-path battles caused total combat shutdown (0 battles). Looked like the equipment formula was wrong.
- **Wrong approach**: Tune the equipment loss formula because "that's what changed." Assume the new code is the bug.
- **Right approach**: The real issue was that undefended-path battles had `defenderFormation = undefined` hardcoded — equipment loss was impossible. The new code was correct; it exposed a hollow legacy path. When one fix causes a cascade failure, audit what the fix exposed.
- **Do instead**: When a fix causes regression, ask "what did this expose?" before tuning the fix. The regression is often a symptom of a deeper pre-existing hole.

### [Process] Determinism requires explicit sorting, not hope (2026-03-04)
- **Context**: `Object.keys()` and `Object.entries()` iteration order is not guaranteed. Map source updates diverged across runs.
- **Wrong approach**: Assuming iteration order is stable because it "usually is." Running tests on a single machine where the order happened to be consistent.
- **Right approach**: Every iteration over maps, every `Object.keys()`, every array derived from records must be explicitly sorted via `strictCompare`. Document the sorting contract in function signatures.
- **Do instead**: Search for any `Object.keys()` or `Object.entries()` without a `.sort(strictCompare)` call. Each one is a latent nondeterminism bug.

### [Architecture] Systems need a single owner file (2026-03-05)
- **Context**: `recon_intelligence.ts` had BFS logic in one file, consumers GUI-only (no bot), types in game_state.ts. When OSID migration happened, the dead SID-keyed BFS hung around for weeks undetected.
- **Wrong approach**: Split a system across: types in game_state, logic in module, constants in a separate constants file consumed by 3 different places.
- **Right approach**: One owner file declares types, constants, and core logic. `sector_intel.ts` + `sector_intel_constants.ts` as a self-contained pair — immediately obvious whether the system was being used.
- **Do instead**: When a system spans more than 2 files for its core logic (not consumers), consolidate. Dead code becomes visible when ownership is clear.

### [Architecture] If you enforce a property every turn, the model is wrong (2026-02-22)
- **Context**: AoR model treated brigade location as a set of owned settlements, requiring contiguity enforcement, enclave fragmentation, and 20+ lines of rebalancing code every turn.
- **Wrong approach**: Add more enforcement code each time the model drifts. Contiguity enforcement, sector rebalancing, AoR re-computation.
- **Right approach**: Brigade location should be a single node (`location_osid`) in the contact graph. Contiguity, sector assignment, and territory claims become derived views — no enforcement loop needed.
- **Do instead**: When you add per-turn enforcement code for a property, stop. The model should make the property invariant automatically. Find the model that makes it true by construction.

### [Debugging] Empty execution windows need layer-by-layer diagnosis (2026-03-07)
- **Context**: Drina corps went dormant — zero operations for weeks 4–40 after pre-planned operations. Investigators assumed the operation relaunch was broken.
- **Wrong approach**: Debugging the operation execution code when the real gap was in corps directive generation. Three separate investigations before finding the right layer.
- **Right approach**: Three-layer diagnosis: (1) Is the operation launching? (2) Are brigades assigned? (3) Is the operation progressing? Find which layer is broken before touching code.
- **Do instead**: Build layer-by-layer diagnostic tooling. A blank execution window can mean: no launch, no assignment, no progression — each has a different fix.

### [Architecture] Operations need explicit phase lifecycle (2026-03-06)
- **Context**: Operations would enter execution phase and stay there with no attacks, triggering `execution_without_attack_orders` warnings indefinitely.
- **Wrong approach**: Treating a quiet execution turn as always a broken state. Triggering failure logic and resetting ops.
- **Right approach**: A quiet execution turn with movement orders is a maneuver turn — brigades staging. Only trigger failure if brigades have staged AND zero attacks happen over multiple turns. The gate: have all participants reached staging positions?
- **Do instead**: Operations need explicit states: planning → staging → attacking → completion. A turn with movement-only is still progress.

### [Calibration] Supply is a three-faction cascade — change one, verify all (2026-03-06)
- **Context**: PATRON_AID_SCALE at 6 meant RBiH felt near-zero embargo. Raising it to 12 broke HRHB. Each faction's supply formula interacts.
- **Wrong approach**: Tuning one faction's supply constants and checking only that faction's outcome.
- **Right approach**: Supply cascade validation: RBiH (UN airdrops + patron) → RS (self-sufficient + patron) → HRHB (Croatian pipeline + embargo). All three must be checked after any supply constant change.
- **Do instead**: Have a supply validation checklist: after any supply change, check all three factions' reserve levels, run a 40w scenario, verify no faction hits critical unexpectedly.

### [Debugging] Formation state is a state machine — guard transitions, not values (2026-03-08)
- **Context**: `Number.isInteger(1.5) === false` caused the fatigue recovery guard to skip recovery, leaving fractional fatigue unreset. Looked like a formula error.
- **Wrong approach**: Checking if a value is an integer as a guard for a state transition. This is a type assumption, not a state guard.
- **Right approach**: Guard transitions with `typeof !== 'number'` (data presence) not `Number.isInteger` (value shape). Fatigue has explicit transitions: accumulate → recover in cycles → ceiling at 30. Guard the transition, not the value format.
- **Do instead**: For any state machine field, document the transitions explicitly. Never guard with shape assumptions (`isInteger`, `isArray`) when presence (`!= null`, `typeof`) is the right gate.

### [Bot AI] New mechanics competing with bot AI need explicit target exclusion (2026-03-07)
- **Context**: Paramilitary brigades competed with bot AI for undefended rear pocket OSIDs. Bot AI struck immediately; paramilitaries with MARCH_TURNS=2 never captured anything.
- **Wrong approach**: Assume bot AI and new mechanics will naturally share territory. Set MARCH_TURNS and expect the system to work.
- **Right approach**: Bot AI must explicitly exclude paramilitary target OSIDs from its offensive targets. New mechanics that compete for territory must gate the bot's access to that target class.
- **Do instead**: When adding any new mechanic that captures OSIDs, immediately check `generateCorpsDirectives` and `bot_brigade_ai_osid.ts` for conflicts. Add explicit exclusions before wiring the mechanic.

### [Calibration] Confidence thresholds should be named constants, not magic numbers (2026-03-05)
- **Context**: Sector intelligence used raw float comparisons throughout GUI and bot code. Changing a threshold required finding every comparison site.
- **Wrong approach**: Inline threshold comparisons: `if (confidence > 0.5)`. Each site independently defines "good enough."
- **Right approach**: `sector_intel_constants.ts` defines named tiers: CONFIDENCE_ROUGH_STRENGTH=0.2, CONFIDENCE_FRONT_BRIGADES=0.3, CONFIDENCE_FULL_STRENGTH=0.5, CONFIDENCE_DEEP_INTEL=0.8. Every consumer uses the same gates.
- **Do instead**: Any threshold that gates information or behavior should be a named constant. If you have two float comparisons that look similar but use slightly different values, they're silently diverging.

### [GUI] Defer heavy work off the main thread (2026-03-01)
- **Context**: Formation icon creation (canvas draw + getImageData + MapLibre GPU upload) was synchronous in a single rAF, freezing the UI for hundreds of milliseconds per load.
- **Wrong approach**: Doing DOM manipulation, image encoding, and GPU operations synchronously in the render path.
- **Right approach**: `requestIdleCallback` with 400ms timeout deferred icon loading without blocking UI. Heavy work belongs off the hot path.
- **Do instead**: Any work touching DOM, canvas, or GPU inside a render callback needs a `requestIdleCallback` or next-tick defer. If the UI stutters during load, find the synchronous work in the render path.

### [Debugging] Validate attribution at three layers: firing → accounting → outcome (2026-03-01)
- **Context**: Displacement system attributed all casualties to "encirclement" due to OSID/SID mismatch. Ledger said "working" because accounting was technically correct. But 4.36M displaced = 4× history.
- **Wrong approach**: Validating only that a mechanism fires and the accounting is non-negative. Missing the sanity check on outcome magnitude.
- **Right approach**: Three-layer validation: (1) mechanism fires correctly, (2) accounting correct (no negatives), (3) outcome magnitude is historically plausible. All three must pass.
- **Do instead**: For any new casualty/displacement/loss mechanic, add a magnitude sanity check: is the total within 0.5×–2× of historical? If not, the mechanism has a hidden amplifier.

### [Process] Pre-run validity checks prevent calibration dead-ends (2026-03-06)
- **Context**: Multiple early calibration runs produced zero battles (n35, n52) because operation preconditions weren't checked before investing in a 40w run.
- **Wrong approach**: Running full 40w scenarios to discover that combat is fundamentally broken (no attack orders, wrong OSID keys, zero eligible brigades).
- **Right approach**: Proof-lane test (`scenario_vrs_operation_proof_4w.json`) validates that one VRS opening op can attack, battle, and advance in 4 turns. Run this before any 40w calibration.
- **Do instead**: Maintain a lightweight proof test that validates the critical path of the simulation. Run it before every calibration run. Saves 5-10 minutes per failed long run.

### [Combat] Personnel ratio trumps multipliers (2026-03-10)
- **Context**: Sarajevo fell despite enclave resilience, urban defense bonus, and terrain multipliers. 4 RBiH brigades (2,000 pers) vs 4 RS brigades (5,100 pers + 160 tanks + 120 artillery). Power ratio 3.5-18× at each OSID.
- **Wrong approach**: Stacking more multipliers on defense (enclave 0.005→0.02, urban 1.5→2.0, tank penalty). Each helped marginally but none could bridge a 5:1 raw personnel + equipment gap. Multiplier-stacking cannot fix a volume problem.
- **Right approach**: Add RAW VOLUME to the defense — enclave garrison power representing organized civilian defense (TDF, Patriotic League, police, volunteers). Formula: `population × 5% × 15% × resilienceMult`. This provides meaningful base defense regardless of how few brigades the OOB seeds.
- **Do instead**: When a power ratio is extreme (>3:1), look for missing volume (troops, militia, civilian defense), not better multipliers. Multipliers scale what exists; if there's not enough to scale, they're useless.

### [Combat] Enclave defense is multi-layered — all layers needed simultaneously (2026-03-10)
- **Context**: Fixing Sarajevo required 5 simultaneous changes, none sufficient alone: supply detection, resilience scaling, urban tank penalty, urban defense, garrison volume.
- **Wrong approach**: Trying each fix in isolation. Resilience scaling alone didn't matter because supply misclassified → resilience decayed. Urban tank penalty alone didn't matter because personnel ratio was extreme. Each fix addressed one layer of a multi-layer problem.
- **Right approach**: Identify all the layers that should be contributing to defense, verify each is actually functioning, then fix all broken layers together. Test the combined effect.
- **Do instead**: For complex outcomes (city defense, enclave survival), trace EVERY contributing system: supply state → resilience building → defense bonus → equipment penalties → urban terrain → garrison volume. If any layer reads wrong, the combined defense collapses.

### [Tooling] weekly_report.jsonl uses `week_index` not `week` (2026-03-10)
- **Context**: Extraction scripts used `w.week` and got `undefined` for all entries. Field name is `week_index`.
- **Do instead**: For weekly report extraction, always use `week_index`. Check field names with `Object.keys(line)` before writing extraction scripts.

### [Debugging] When same constants change nothing, check timing (2026-03-10)
- **Context**: Changed enclave defense scaling from 0.005→0.02 (4× improvement) but battle results were identical. The reason: Sarajevo fell at week 2-7, before the changed system could accumulate enough resilience to matter.
- **Do instead**: When tuning a system produces identical outcomes, check whether the battles happen BEFORE the tuned system activates. If the problem occurs at turn 2 and your fix accumulates over 20 turns, the fix is aimed at the wrong timescale.

### [Architecture] Timeline JSON overrides code doctrine phases (2026-03-10)
- **Context**: Changed `FACTION_DOCTRINE_PHASES` in `bot_strategy.ts` twice (n558, n559). Both runs produced IDENTICAL results to n556 because `data/scenarios/timelines/apr1992.json` has its own `doctrine_phases` that takes priority via `getActiveDoctrinePhase()`.
- **Do instead**: When modifying faction doctrine phases, ALWAYS edit the timeline JSON (`data/scenarios/timelines/apr1992.json`) first. The hardcoded `FACTION_DOCTRINE_PHASES` in `bot_strategy.ts` is only a fallback for when no timeline is active. Keep both in sync, but the timeline is the source of truth.

### [Debugging] Rate tuning cascades unpredictably (2026-03-10)
- **Context**: Reducing frontline attrition (0.005→0.003) and increasing combat rates (0.08→0.10) both produced NET NEGATIVE results — fewer total KIA, more destroyed brigades. More surviving brigades changes battle dynamics in unpredictable ways.
- **Do instead**: Prefer structural changes (enabling new attack sources, fixing gates) over rate tuning. When rate changes regress all metrics, revert immediately — the system is nonlinear and small rate changes have chaotic downstream effects.

### [Debugging] Verify outcome field values before writing extraction scripts (2026-03-10)
- **Context**: Diagnostic scripts used `b.outcome === 'decisive'` but the actual field is `'decisive_victory'`. RS attack success appeared as 5-10% when actual was 91%. Led to multiple wasted tuning attempts (REACTIVE_DEFENSE_RATIO, attrition rates) based on wrong data.
- **Do instead**: Always check field values with `Object.keys()` or sample data before writing extraction logic. One wrong enum string can invalidate an entire investigation.

### [Architecture] Connected components, not proxy checks, for reachability (2026-03-11)
- **Context**: Brigades were being assigned to sectors they could never physically reach — e.g. 5th Corps brigades in Bihać pocket assigned to Kljuc/Sanski Most sectors on the other side of RS territory. The Bosnian War had real disconnected pockets (Sarajevo, Srebrenica, Bihać, Maglaj, Tesanj, Ozren).
- **Wrong approach**: Checking `territory_osids.length === 0` as a proxy for "unreachable." Pockets HAVE territory (friendly-controlled OSIDs) — they're just disconnected from the main blob. This proxy silently passed while 28 brigades were assigned to sectors they could never reach.
- **Right approach**: BFS connected components over the OSID adjacency graph (`operational_contact_graph.json`, 744 nodes, 3243 edges). Partition all friendly OSIDs into components. A brigade can only be assigned to a sector in its same connected component. Implemented as `buildFriendlyComponents()` + `getSectorComponent()` in `corps_front_sectors.ts`.
- **Three code paths needed the fix**: (1) `classifyBrigadesByTerritory` Phase 2 pool distribution, (2) `ensureMinimumSectorCoverage` Step 2/3 surplus transfers, (3) the final sector prune. Fixing only one path left 12 bugs (n596). All three paths must filter by `brigComp === sectorComp`.
- **RECURRED n635**: Two more fallback paths found in `classifyBrigadesByTerritory` (line 463 no-sectors-for-corps, line 529 Phase 2b no-reachable fallback) plus the brand-new cross-component density transfer in `bot_corps_directives.ts` (added n631, guarded n635). Total: 6 code paths needed component guards across 3 files. The n631 density transfer was written *during the same session* as the component fix — proving that even awareness of the invariant doesn't prevent new violations when adding new assignment paths.
- **Do instead**: When checking whether entity A can reach entity B on a war map, NEVER use proxy checks (empty territory, zero edges, same corps). Use BFS connected components through same-faction territory. The real invariant is physical connectivity, not data shape. **Any code that assigns a brigade to a sector or issues a march order to a sector MUST check connected component membership.** Run `check_disconnected_assignments.cjs` after every calibration run.

### [Process] Multiple code paths = multiple fix points (2026-03-11)
- **Context**: The disconnected brigade bug existed in three separate code paths that all performed brigade-to-sector assignment: `classifyBrigadesByTerritory` Phase 2, `ensureMinimumSectorCoverage` Steps 2-3, and the sector prune step.
- **Wrong approach**: Fixed Phase 2, ran scenario, claimed "fixed." n596 still had 12 disconnected assignments because `ensureMinimumSectorCoverage` was a second path doing the same wrong assignment without the reachability check.
- **Right approach**: After fixing one path, grep for ALL call sites that perform the same logical operation (in this case, "assign brigade to sector"). Fix ALL of them before claiming done.
- **RECURRED n635**: Even after fixing 3 paths (n598), two more fallback paths in `classifyBrigadesByTerritory` were missed (line 463, 529) PLUS the n631 density transfer added a new unguarded path. Grepping for "assign brigade to sector" isn't enough — you must also grep for "move brigade to sector" (march orders, reassignment orders). The invariant surface is: ANY code that changes which sector a brigade belongs to.
- **Do instead**: After any bug fix, search for every code path that performs the same operation. Use `Grep` for the key function/field names. One fix point is rarely enough for cross-cutting concerns. **For brigade-sector assignment specifically: grep for `assigned_brigade_ids.push`, `sectorReassignmentOrders.push`, `to_sector_id`, and any fallback/continue path in classification loops.** Add `check_disconnected_assignments.cjs` to the standard post-run diagnostic.

### [Architecture] Enclave brigades must not leave their pocket (2026-03-12)
- **Context**: All 13 RBiH enclave brigades (Goražde, Srebrenica, Žepa) displaced from home pockets. 7 Goražde brigades in Visoko, 5 Srebrenica brigades scattered. Goražde fell to 2/20 RBiH OSIDs.
- **Wrong approach**: Assumed the retreat system was the problem. Added BFS nearest-friendly to `findEmergencyRetreatOsid` and enclave filter to `getFriendlyRetreatDestinations`. Ran scenario — identical state hash. The brigades had full 1500 personnel = never retreated at all.
- **Right approach**: The brigades marched out VOLUNTARILY via bot AI sector march orders (`evaluateSectorMarch`). At turn 0, Goražde is connected to the main RBiH blob (271/350 OSIDs in one component). Sector system assigns brigades to main blob sectors. March orders move them out. RS severs corridor. Stranded. The fix is an enclave march guard: enclave-tagged brigades skip march if destination is outside their enclave.
- **Do instead**: When entities are "in the wrong place," check voluntary movement (bot AI orders, march, operations) BEFORE checking involuntary displacement (retreat, emergency). The bot AI is the most common cause of misplaced units. Also: if a code change produces the same state hash, the code path was never exercised — look for a different mechanism.

### [Architecture] Options object beats trailing optional params (2026-03-12)
- **Context**: `forceRetreatWithPenalties` grew to 8 params — 3 consecutive optional numerics followed by optional `adjacency`. 5 of 6 call sites passed `undefined, undefined, undefined, adjacency`.
- **Wrong approach**: Adding optional params one at a time to a positional argument list. Each new param pushes the next one further right, and callers must pass `undefined` placeholders for all intermediate params they don't use.
- **Right approach**: Group optional params into an options object: `{ personnelRetain?, cohesionLoss?, disruptedTurns?, adjacency? }`. Callers pass only what they need: `{ adjacency }`.
- **Do instead**: When a function has 3+ optional params OR callers pass `undefined` to skip params, refactor to an options object. The signal is `undefined, undefined, undefined, X` at a call site.

### [Architecture] Post-pipeline assertions beat per-path guards for cross-cutting invariants (2026-03-12)
- **Context**: The disconnected brigade bug recurred 3 times (n598→n601→n635) despite knowing the invariant. Each recurrence was a new code path added without the component guard. Even the developer who wrote the fix added a new violating path in the same session (n631 density transfer, guarded in n635).
- **Wrong approach**: Guarding each code path individually — every new path requires remembering to add the guard. With 6+ paths across 3 files, omission is inevitable.
- **Right approach**: Single post-pipeline assertion (`assertBrigadeReachability`) runs AFTER all code paths have executed. Catches violations regardless of which path introduced them. Added as the last step in `buildCorpsFrontSectors()`. Pattern proven and then applied to 4 more systems: dissolved brigades in sectors, control event consistency, operation lifecycle, formation territory.
- **Do instead**: For invariants with 3+ code paths that can violate them, add a single end-of-pipeline assertion rather than guarding each path. The assertion is the safety net; per-path guards are optimization. Five assertions now live in `war_phases.ts` (118 steps). Plan: `docs/40_reports/INVARIANT_FOOLPROOFING_PLAN.md`.

### [UI] Never share MapLibre layers between independent selection highlights (2026-03-16) — NEW
- **Context**: Brigade AoR highlighting needed to show the selected brigade's sub-segment front line. Five attempts tried to reuse the existing sector edge glow layers (shared between sector/corps highlight and brigade highlight). Each attempt caused one system to break the other — race conditions between useEffects, hover overwriting click, clear paths erasing each other's state.
- **Wrong approach**: Sharing MapLibre layers between two independent selection features (sector highlight and brigade highlight). Setting filters on shared layers from two different useEffects creates a last-writer-wins race. Suppressing hover when a brigade is selected broke sector navigation.
- **Right approach**: Create DEDICATED MapLibre layers for each selection feature. Brigade AoR uses `brigade-aor-pos` and `brigade-aor-neg` layers on the same source but with independent filters and opacity. Sector highlight is completely untouched.
- **Do instead**: When adding a new map highlight feature, ALWAYS create new layers. Never reuse layers owned by another useEffect. Shared source is fine; shared layers are not.

### [Night Shift] Distinguish "deferred integration" from "forgotten wiring" — flag both explicitly (2026-03-16) — NEW
- **Context**: Night shift v0.4.4 implemented `checkHeroicStand()` and `checkDefeatism()` in `officer_experience.ts` — well-written functions with clear APIs. But neither is imported or called anywhere. Unlike the event loader (which was accidental dead code), these appear to be intentionally deferred: integrating them requires battle resolution to link power ratios back to corps commanders, which is non-trivial. Similarly, `ScenarioSelectionScreen.tsx` (v0.4.2) was created but not imported in `App.tsx` — correctly deferred because App.tsx was on the "DO NOT Touch" list.
- **Wrong approach**: Leaving deferred functions without any marker. The morning report lists "heroic stand (+aggressiveness, +morale)" as implemented, but there's no note saying "integration deferred — needs battle resolution linkage." A future developer (or nightshift) sees the export, assumes it's active, and builds on a foundation that doesn't exist.
- **Right approach**: When creating a function that can't be wired yet, add a `// TODO(nightshift): not yet called — needs X to integrate` comment at the export AND note it in the morning report as "API ready, integration deferred: [reason]." When a component can't be imported due to DO NOT Touch constraints, note that too.
- **Do instead**: Every exported function must be either (a) imported and called, or (b) explicitly marked as deferred with the reason. The morning report must distinguish "implemented and active" from "API created, integration pending."

### [Night Shift] Every new function must be imported and called — dead code is invisible failure (2026-03-16) — NEW
- **Context**: Night shift (v0.4.1) created `event_loader.ts` with `loadEventDefinitions()` to load 41 historical events from JSON files. The function is well-written, well-documented, properly handles errors, sorts deterministically. But it is **never imported or called anywhere**. `evaluateEvents()` iterates `EVENT_REGISTRY` from `event_registry.ts` — a hardcoded array of 15 narrative-only placeholder events. All 41 rich events with mechanical effects (morale, supply, alliance, war crimes, decisions) are dead code.
- **Wrong approach**: Creating a loader function and data files, then moving on to the next milestone without wiring the loader to the consumer. The nightshift morning report declared "41 historical events" implemented — because the files exist. Nobody checked whether the events actually fire.
- **Right approach**: After creating any function, immediately verify it is (1) imported by its consumer, (2) called at runtime, and (3) produces observable output. For events: run the scenario, grep the weekly report for `events_fired`, confirm the right events appear at the right turns.
- **Do instead**: Before marking any feature complete, answer: "How do I know this code actually runs?" If the answer requires tracing imports, do the trace. A function that exists but is never called is worse than no function — it creates false confidence. **Minimum bar: the function must appear in at least one import statement outside its own file.**

### [Night Shift] Output serialization must include new report fields (2026-03-16) — NEW
- **Context**: The `evaluate-events` pipeline step correctly sets `context.report.events_fired` with fired event data. But `buildWeeklyReport()` in `scenario_reporting.ts` never includes `events_fired` in its output row. The scenario runner manually attaches `column_movement` and `movement_report` from the turn report (lines 1919-1923) but doesn't do the same for `events_fired`. Result: events fire at runtime but are invisible in all scenario output files.
- **Wrong approach**: Adding a report field to the pipeline context type (`turn_pipeline_types.ts`) and setting it in the pipeline step, then assuming it will appear in the output. The weekly report builder has its own explicit field list.
- **Right approach**: When adding a new field to `TurnReport`, also add it to `buildWeeklyReport()` or the manual attachment block in `scenario_runner.ts`. Verify by running a scenario and checking the JSONL output for the new field.
- **Do instead**: Treat "field appears in output" as part of the definition of done. If you add `context.report.X`, grep `scenario_reporting.ts` and `scenario_runner.ts` for where report fields are serialized. Add your field there. Verify with: `node -e "..."` checking the weekly_report.jsonl.

### [Night Shift] Placeholder registries must be replaced, not left alongside real data (2026-03-16) — NEW
- **Context**: `event_registry.ts` contains 15 hardcoded placeholder events (narrative-only, no `once` flag, fire every turn in their range). The night shift created 41 rich events in JSON files plus a loader — but left the placeholder registry intact and active. Even if the loader were connected, the placeholders would still fire alongside the real events, producing duplicates (e.g. both `srebrenica_enclave` placeholder AND `srebrenica_enclave_forms_1992` real event).
- **Wrong approach**: Creating the replacement system (JSON loader) without removing or replacing the thing it replaces (hardcoded registry). Both systems coexist in silent conflict.
- **Right approach**: When building a replacement for a hardcoded registry, the old registry must be emptied or removed in the same commit that connects the new one. If the new system isn't ready to connect, leave the old one and don't create the replacement yet.
- **Do instead**: Search for the constant that the consumer reads (`EVENT_REGISTRY`). If you're replacing its source, replace it completely. Never leave two competing sources of truth.

### [Night Shift] Effect handlers must guard against missing state fields (2026-03-16) — NEW
- **Context**: `applySupplyDelta()` correctly guards `if (!state.military.general_supply_reserve) return;` — it silently no-ops when the field doesn't exist. Similarly `applyHumanitarianImpact` and `applyPatronPressure` guard against missing `negotiation` state. This is defensive but makes failures invisible: supply_delta events fire, appear in the fired list, but have zero effect because the state field doesn't exist yet at that point in the game.
- **Wrong approach**: Silent no-ops that mask broken preconditions. The effect "succeeds" (no error) but does nothing.
- **Right approach**: Two options: (1) Initialize the state field with defaults before events evaluate (so effects always apply), or (2) Log a warning when an effect is skipped due to missing state, so the developer knows the effect didn't apply. Option 1 is preferred — effects should be mechanical, not conditional on state initialization order.
- **Do instead**: When writing an effect handler that guards against missing state, ask: "Should this state always exist by the time this effect runs?" If yes, the guard is hiding a bug. If no (e.g. peace phase doesn't have military formations), the guard is correct but should be documented.

### [Night Shift] Smoke-test each milestone's observable behavior before moving to the next (2026-03-16) — NEW
- **Context**: Night shift implemented 8 milestones in sequence. The morning report lists all commits, test counts, version tags. But no milestone was smoke-tested for observable behavior. The event system (v0.4.1) was declared complete with "41 historical events" — but zero events produce observable output in a scenario run. A single `grep events_fired weekly_report.jsonl` would have revealed the disconnection immediately.
- **Wrong approach**: Using "tests pass + tsc clean" as the completeness criterion. Unit tests verify individual functions in isolation; they don't verify that the functions are wired into the pipeline. 13 event tests pass — but events don't fire in an actual game.
- **Right approach**: For each milestone, define ONE observable behavior check that can only pass if the full pipeline is connected: "Run a 10-week scenario. Does X appear in the output?" For events: do `events_fired` entries appear in weekly reports? For economy: do production facility outputs change supply reserves? For officer experience: do officer stats change after operations?
- **Do instead**: Before bumping the version for a milestone, run the scenario and verify the feature's output in the run artifacts. Not tests. Not type checks. Actual scenario output.

### [Night Shift] Per-entity loops must not multiply global effects (2026-03-16) — NEW
- **Context**: Decision events (London Conference, Vance-Owen) iterated all 3 factions. For each bot faction, the chosen response effects were applied independently. With 2 bot factions, effects applied twice; with 3 bots (headless), 3x. The London Conference "accept" gave RBiH +30 credibility instead of +10.
- **Wrong approach**: Iterating factions and applying the same global effect inside the loop. The response effects target a specific faction (hardcoded `"faction": "RBiH"`), not the iterating faction. The loop multiplies instead of distributing.
- **Right approach**: Diplomatic events fire once globally. Bot auto-responds once (pick one response, apply once). Player gets one decision. The faction loop was conceptually wrong — a peace conference produces one outcome, not three independent outcomes.
- **Do instead**: When writing a per-entity loop that applies effects, ask: "Do these effects target the iterating entity, or a fixed target?" If fixed target, the loop is multiplying. Apply once outside the loop.

### [Bot AI] Stale-count reads cause oscillation — always track planned movements (2026-03-16) — NEW
- **Evidence**: `evaluateSectorMarch` in `bot_brigade_eval_front.ts` used `countCorpsBrigadesAtOsid()` to check overstacking. Since all brigades evaluate against the same static state in one pass, 7 brigades at OSID X all see count=7 and all march to OSID Y. Next turn: all 7 at Y, march back to X. Perpetual oscillation.
- **Root cause**: Per-entity evaluation loop reads shared static state without tracking the effects of earlier entities' decisions in the same loop.
- **Rule**: Any per-entity evaluation loop that reads entity counts at locations MUST maintain a running adjustment map (departures/arrivals) so entity N sees the effects of entities 1..N-1's decisions. This applies to: overstacking redistribution, front gap filling, sector march, and any future per-brigade movement evaluation.
- **Fix**: `columnAssignments: Map<Osid, number>` passed through `BrigadeEvaluationContext`, decremented on departure, incremented on arrival, checked before issuing movement orders.

### [React] useEffect timing: never set external handlers in a separate effect from object creation (2026-03-17) — NEW
- **Evidence**: OpsMapRenderer's `onOsidClick` was set in a useEffect with deps `[state.selectedAxisId, state.axes, ...]`. The renderer was created in a different useEffect with dep `[isOpen]`. React's effect lifecycle cleared the handler between re-runs, leaving `onOsidClick = undefined` at click time. Console confirmed: map fired, features found, but `onOsidClick? false`.
- **Root cause**: Separate useEffects with different dependency arrays create a timing gap where cleanup of one effect clears state that another effect set.
- **Rule**: When an external object (class instance, MapLibre map, etc.) needs a callback from React state, use a **ref** to hold the latest state and set the callback ONCE in the same effect that creates the object. The callback reads from the ref at invocation time. Never use a separate useEffect to wire callbacks to externally-created objects.
- **Fix**: `clickStateRef.current = { selectedAxisId, axes, ... }` updated every render. `onOsidClick` set once in `[isOpen]` effect, handler reads from ref.

### [UI] Verify which server the user is testing on before debugging (2026-03-17) — NEW
- **Evidence**: Spent multiple iterations debugging map click handlers that were "not working." The user was testing on port 3002 (Electron built bundle) while code changes only went to port 3001 (Vite dev server via HMR). All fixes were correct but invisible to the user.
- **Root cause**: Assumed the user was on the dev server. Console errors showed `MapContainer.tsx:253` (main map) and `localhost:3002` (Electron port), not the OpsMap renderer.
- **Rule**: When a UI fix "doesn't work" despite code being correct, check: (1) Which port/server is the user on? (2) Is HMR reaching them or do they need a rebuild? (3) Are console errors from the right component? Ask early: "Are you on localhost:3001 or 3002?"

### [Calibration] Home affinity in assignment cannot be a primary sort key (2026-03-17) — NEW
- **Evidence**: Tried 4 approaches to fix 3rd Corps displacement (Tešanj brigades at Gornji Vakuf): primary sort by home (n843), 0.5x distance (n844), pre-pass all (n845), pre-pass rear-only (n846). ALL regressed calibration from 5/6 to 4/6 benchmarks. The -2 hop discount (n842 baseline) is the sweet spot.
- **Root cause**: Pulling brigades home weakens active fronts. The home-distance effectiveness mechanic already penalizes displacement (floor 0.70), so the sim self-corrects over time. Forcing home assignment disrupts the balance.
- **Rule**: Brigade displacement is a STRUCTURAL issue (operations move units, garrison-fill reassigns by proximity). Fix with post-operation return-to-home logic, not assignment algorithm weighting. Never make home affinity a primary sort key in garrison fill.

---

## Internalized (Consistently Applied)

### [Process] Determinism is sacred (2026-02-25)
- No `Math.random()`, no timestamps, sorted iteration via `strictCompare`. Consistently followed — no violations in last 3 days.

### [Process] Smoke-test triad after every change (2026-02-21)
- `tsc --noEmit` + `vitest run` + `desktop:map:build`. Consistently run. No recent failures from skipping.

### [Platform] Windows shell uses semicolons (2026-02-07)
- PowerShell: `;` not `&&`. No recent violations.
