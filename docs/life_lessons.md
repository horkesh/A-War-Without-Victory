# Life Lessons — AWWV Development

> Last updated: 2026-03-16 (planning session: 4 new lessons from full-roadmap cross-plan reviews)
> Auto-generated daily at 06:00. Cross-checked against previous entries.
> Violation-tracked: lessons with recent violations stay at the top.
> Enforcement: session-start scan, pre-commit gate (`/awwv_pre_commit_check`), daily cron violation detection.

---

## Recently Violated (needs reinforcement)

### [Calibration] One change per run + mandatory insanity check — VIOLATED 2026-03-15
- **Violation evidence**: n747 (`56f2ae0`) bundled FOUR independent fixes (offensive_support trigger, auto-join op, force-assign sector, bot AI corps lookup) into a single calibration run. When the first three produced 0 elite battles (n746), attribution was ambiguous. Debug logging after n746 identified Change 4 as the sole blocker — if each fix had been a separate run, identification would have been immediate.
- **Cost**: One wasted calibration cycle (n746). No regression, but delayed root-cause identification.

### [Debugging] Persistent symptoms = multi-layer failure — VIOLATED 2026-03-15
- **Violation evidence**: Elite loan system had 5 bugs across 4 files. First session found bugs 1-3 (spawning/deployment layer) and assumed the system would work. Bugs 4-5 (request generation + brigade AI evaluation layers) weren't discovered until the zero-combat report forced a second investigation. Classic multi-layer: fixing one layer doesn't fix the system when other layers are independently broken.
- **Cost**: Extra investigation cycle. The systematic trace approach in the second pass was correct — should have been applied from the start.

---

## Active Lessons (no recent violations)

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

---

## Internalized (Consistently Applied)

### [Process] Determinism is sacred (2026-02-25)
- No `Math.random()`, no timestamps, sorted iteration via `strictCompare`. Consistently followed — no violations in last 3 days.

### [Process] Smoke-test triad after every change (2026-02-21)
- `tsc --noEmit` + `vitest run` + `desktop:map:build`. Consistently run. No recent failures from skipping.

### [Platform] Windows shell uses semicolons (2026-02-07)
- PowerShell: `;` not `&&`. No recent violations.
