# Life Lessons — Index

> Last restructured: 2026-03-29. 158 lessons across 8 topic files.
> **Read this index every session.** Then load ONLY the topic files relevant to your current task.
> When adding new lessons, add them to the appropriate topic file and update the count here.

## Recently Violated (always read these)

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

### [MapLibre] Never use setData() on dynamic sources in modal maps — VIOLATED 2026-03-19
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
| [calibration.md](life_lessons/calibration.md) | Calibration, OOB, Combat, Bot AI | 36 | Running calibration scenarios, tuning parameters, OOB changes |
| [architecture.md](life_lessons/architecture.md) | Architecture, Engine, Scaling, Defaults, Data Integrity | 46 | Changing engine structure, state, pipeline, adding systems |
| [data_pipeline.md](life_lessons/data_pipeline.md) | Data, Pipeline, Geometry | 10 | Modifying derived data, running data scripts, geometry work |
| [ui_map.md](life_lessons/ui_map.md) | UI, GUI, MapLibre, Rendering, React | 12 | Frontend, map, tactical overlay, modal work |
| [process.md](life_lessons/process.md) | Process, Planning, QA, Quality, Night Shift, Debugging | 41 | General development process (skim at session start) |
| [sectors.md](life_lessons/sectors.md) | Sectors, Design | 5 | Sector system, front lines, territory assignment |
| [platform.md](life_lessons/platform.md) | Platform, Tooling | 4 | Build issues, platform-specific bugs, tooling |
| [events.md](life_lessons/events.md) | Events | 1 | Event system, flag gates, triggers |
