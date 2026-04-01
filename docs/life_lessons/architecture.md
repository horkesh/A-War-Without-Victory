# Life Lessons — Architecture, Engine, Scaling, Defaults, Data Integrity
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Architecture] Phase B column march doesn't reserve the target in osidCount — simultaneous pileup (2026-04-01) — NEW
- **Context**: `distributeBrigadesToFront` Phase B iterates eligible brigades and for each one calls `pickLeastStackedTarget`, then issues a column march order. `osidCount` is only updated for direct adjacent moves (dist=1). For multi-hop marches, `osidCount` is never incremented for the target. When multiple brigades near the same area are processed in the same turn, every brigade sees the target as empty and issues a march order to it. In n1274 this produced 9 vrs_1st_krajina brigades simultaneously ordered to `op:lukavac:brijesnica_donja_2`.
- **Why it didn't show before**: Before distance-weighting (n1274), brigades had global target scatter — different brigades picked different distant targets, so simultaneous pileup was rare. Distance-weighting concentrates local brigades on the same nearby OSID, making the missing reservation visible.
- **Fix**: When issuing a column march order in Phase B, immediately increment `osidCount.set(target, (osidCount.get(target) ?? 0) + 1)` so the next brigade in the loop sees the target as "reserved."
- **Do instead**: Any time you write a pick-and-order loop, ask: "Does picking update the state that the next pick reads?" If not, you have a simultaneous-reservation bug.

### [Architecture] Phase B distance-weighting changes drift destination, not drift permanence (2026-04-01) — NEW
- **Context**: Brigade drift has two components: (1) Phase B picks the wrong march target, sending brigades far from home. (2) Phase 1 assigns by physical position unconditionally — once a brigade is physically at a front OSID, Phase 1 locks it there regardless of home municipality. Fixing Phase B target selection (Proposal 1, n1274) changed WHERE brigades drifted to (Vozuća instead of Maglaj) but didn't prevent Phase 1 from locking them in the new location. The drift pathology persists in a different form.
- **Root cause of permanence**: Home_osid affinity exists only in Phase 2 as a -2 hop discount. Phase 1 fires first and is unconditional. There is no mechanism to recall a brigade that Phase B has marched to a new front OSID — the new physical position becomes the new assignment.
- **Implication**: Fixing march target selection alone is insufficient. Full drift prevention requires either (a) a stronger home-affinity signal that survives Phase 1, OR (b) emergent structural signals (corridor-width, commitment-ratio) that make the commander naturally value certain sectors more highly, OR (c) a post-march recall step.
- **Do instead**: When fixing a two-component bug (selection + locking), verify both components are addressed. Fixing selection without fixing locking just changes which wrong location the brigade gets locked into.

### [Architecture] Concurrent ops exposed that single-op cap was accidentally preventing garrison stripping (2026-03-30) — NEW
- **Context**: For 1200+ runs, Sarajevo never fell. Concurrent ops (n1211) changed `active_operation` (single nullable) to `active_operations[]`. With multiple op slots, more brigades get committed → sector system redistributes more aggressively → Sarajevo garrison shipped to Breza → city falls to paramilitary sweep at turn 11. The old single-op cap accidentally prevented this by limiting how many brigades could be pulled from garrison.
- **Wrong approach**: Assuming that a feature change (concurrent ops) only affects what it explicitly changes (op slots). The cascade through brigade redistribution was invisible because the single-op cap was an accidental safety net, not a deliberate design choice.
- **Right approach**: When removing a constraint (single op → multiple ops), investigate what the constraint was accidentally protecting. The constraint may have been load-bearing for behaviors it wasn't designed to control. Run the full diagnostic suite, not just calibration %.
- **Do instead**: Before removing any cap, gate, or limit, ask: "What behaviors does this accidentally prevent?" Run `tools/diagnose_run.cjs` after the change and check brigade positions, empty sectors, and garrison health — not just area-weighted match.

### [Architecture] Hidden BFS depth caps silently disable constant changes — always trace the full call chain (2026-03-26) — NEW
- **Context**: `MAX_REDISTRIBUTION_DISTANCE=8` was raised to 20 in `brigade_front_distribution.ts`. Calibration: unchanged. Root cause: `bfsDistance()` in `sector_utils.ts` had an internal `maxDepth=10` local variable that silently capped BFS depth regardless of the external constant. The constant was read and passed in correctly — the cap was invisible in the caller.
- **Wrong approach**: Changing a named constant and assuming the behavior changed. The constant was correctly used in the calling code; the override was deep inside the helper function.
- **Right approach**: When a constant change produces no effect, trace ALL code paths that implement the behavior. Any private loop variable, local `maxDepth`, or early-return inside a helper can be the true ceiling, silently overriding the public constant.
- **Do instead**: After changing a BFS-depth constant, search for all depth-bounding constructs in the call chain: `while (queue.length && depth < X)`, `if (depth >= X) continue`, `const maxDepth = N` inside helper functions. Any internal cap lower than the new constant is the true ceiling. Raise both, then verify behavior actually changed.

### [Architecture] Silent drops in assignment pipelines hide broken deployment — always log unmatched items (2026-03-26) — NEW
- **Context**: Phase 2 surplus allocation in `brigade_assignment.ts` silently dropped brigades when `reachable.length === 0`. No log, no fallback, no error — the brigade simply never got a sector assignment. Symptom: wrong brigade density in aggregate stats. Diagnosis took hours because nothing signaled the drop.
- **Wrong approach**: `if (reachable.length === 0) continue;` — entity disappears into the void with zero trace. The aggregate count is wrong but no error fires, no warning appears.
- **Right approach**: Any assignment pipeline step that can produce "no match" must (1) emit at minimum a `console.warn` identifying the entity, its properties, and the condition that failed; (2) either handle it with a fallback or throw explicitly. Silent drops are invisible bugs that inflate calibration numbers artificially.
- **Do instead**: Grep every pipeline step that loops over brigades/formations for `continue` statements without a preceding log. A `continue` after a failed lookup is a silent drop unless there's a warning. The fix pattern: `console.warn('brigade_assignment: no reachable sector for brigade', brigadeId, 'forcing cross-component assignment'); force-assign to best`.

### [Engine] Zombie op types consume corps slots but execute nothing — always verify op type has execution path (2026-03-26) — NEW
- **Context**: `general_offensive` and `strategic_defense` op types were valid string values in `PrePlannedOperationDef`. They could be injected and queued. The operation lifecycle moved them through planning → execution. But `bot_corps_operations.ts` execution logic had zero handling for these types — they ran `sector_attack` code only. Zombie ops held corps' `active_operation` slot indefinitely, blocking queued ops.
- **Root cause**: Op type enum and execution logic were decoupled. Adding a new op type to the definition didn't require adding execution logic — the compiler didn't enforce it.
- **Right approach**: Coerce unsupported op types to `sector_attack` at injection time with a warning. Future: make op type a discriminated union where each type's execution is a required method.
- **Do instead**: When adding a new operation type, grep for every switch/if-else on `operation.type` in the execution pipeline (`sector_offensive.ts`, `bot_corps_operations.ts`). If the type is not handled in any branch, it's a zombie. Add a `console.error` in the default/fallthrough case to surface new zombies immediately.

### [Architecture] Map hybrid strategy for high-fidelity tactical overlays (2026-03-20)
- **Problem**: Attempting to render hundreds of dynamic game indicators (bars, dots, floating icons) purely in MapLibre layers leads to complex GeoJSON generation and limited animation flexibility.
- **Right approach**: Use a hybrid stack. MapLibre GL JS for the base map (roads, terrain, static labels) and Deck.gl for the tactical overlay (map counters, unit status, movement previews).
- **Do instead**: For complex game-state-driven visuals, leverage Deck.gl's interleaved layers or synchronized overlay. Use Deck.gl for anything that requires high-frequency updates, interpolation, or advanced shader effects (glows).

### [Architecture] Data pipeline outputs are coupled — regenerating one file invalidates others (2026-03-19) — VIOLATED THIS SESSION
- **Violation evidence**: Vertex snapping changed polygon vertices in `operational_settlements.geojson`. Regenerating the pipeline also regenerated `operational_contact_graph.json` with different `min_dist` values and `distance_contact` types. This changed which OSID pairs got front edges, cascading through combat. The contact graph was coupled to the polygon data but updated independently.
- **Cost**: Regression from 91% to 88.4% (initially attributed to geometry fix, actually from contact graph change). Multiple revert cycles.
- **Right approach**: When modifying polygon geometry, test whether the contact graph changes. If it does, the calibration WILL shift. Either: (a) modify polygons WITHOUT regenerating the contact graph, or (b) regenerate everything and recalibrate.
- **Do instead**: Before regenerating ANY data pipeline output, check which other files it touches. The `derive_operational_settlements.ts` script regenerates 3 files simultaneously (settlements, contact graph, mapping). Changing one means changing all. Use `md5sum` before and after to verify which files actually changed.

### [Architecture] Sector assignment based on current location creates drift lock-in — once a brigade moves, it's trapped (2026-03-24) — NEW
- **Context**: SRK brigades fought at Vogosca w3-5, drifted to Gorazde via operation march/attack-through, then `classifyBrigadesByTerritory` assigned them to the Gorazde sector (because they're physically there), and `evaluateSectorMarch` reinforced the assignment by marching them to the sector front. A self-reinforcing loop.
- **Wrong approach**: Assuming sector assignment by physical location is sufficient. Once a brigade drifts during an operation, the location-based assignment locks it into the wrong sector permanently.
- **Right approach**: Three-part fix: (1) home-distance guard in `evaluateSectorMarch` — don't march >N hops from home, (2) return-march protection — don't override post-operation return marches, (3) `recall-drifted-brigades` pipeline step — actively pull stranded brigades home each turn.
- **Do instead**: When adding movement systems (operations, column march, attack-through), always verify the round-trip: can the brigade get back home after the operation? If not, add a recall mechanism.

### [Architecture] A corps_id on a brigade means nothing if the corps formation doesn't exist (2026-03-19) — NEW
- **Context**: `hvo_central_bosnia` was referenced by `corps_id` on 7 HRHB brigades, existed in `corps_command`, but never appeared in `formations`. The sector system's `getCorpsForFaction()` filters `formations` for `kind === 'corps_asset'` — a missing formation means 0 sectors, 0 edges, 0 operations, regardless of how many brigades point at it. The corps was a phantom — present in the org chart but absent from the game world.
- **Root cause**: The `activate-corps` pipeline step only ran in the peace phase. Scenarios starting directly in war phase (the 40w/52w scenarios) skipped it. `hvo_central_bosnia` (`available_from: 10`) never got created.
- **Right approach**: Always verify both ends of a formation->corps reference. A brigade with `corps_id: 'hvo_central_bosnia'` is useless unless `formations['hvo_central_bosnia']` exists with `kind: 'corps_asset'` and `status: 'active'`. Pipeline steps that create formations must run in ALL phases, not just peace.
- **Do instead**: When a corps has `subordinate_count: N` but `0` sectors, check if the corps exists as a formation. If it's in `corps_command` but not in `formations`, the formation was never created. Grep for `getCorpsForFaction` to see what the sector system actually uses.

### [Architecture] Readiness state machines need irreversible transitions (2026-03-19) — NEW
- **Context**: `deriveReadinessState()` ran every turn and could revert `active` brigades to `forming` when cohesion dropped below 40. All 29 HRHB brigades oscillated between active/forming every turn due to supply-driven cohesion fluctuations. The `activation_turn` field kept resetting to the latest recovery turn (w55 of 56w), so the system thought they had just activated.
- **Wrong approach**: A pure function that derives readiness from current cohesion. The function has no memory of whether the brigade was ever active — it just looks at the current number.
- **Right approach**: Once a brigade transitions past `forming`, it should NEVER revert to `forming`. Low cohesion after activation -> `overextended` (30-39) or `degraded` (<15), not `forming`. The `forming` state means "hasn't activated yet" — not "currently low cohesion."
- **Do instead**: In any state machine where states represent lifecycle phases (forming->active->degraded), make forward transitions irreversible. A re-derived state should respect the lifecycle direction. Use `activation_turn !== null` as evidence that the brigade has been activated before.

### [Engine] Ops process axes SEQUENTIALLY — first axis stall blocks all others (2026-03-21) — NEW
- **Context**: Op Foca had 5 axes (Foca Valley, Kalinovik, Mostar Heights, Konjic South, etc.). Foca Valley stalled at 1/7 captures -> entire op entered recovery -> axes 2-4 never executed.
- **Root cause**: The operation system uses a shared `current_objective_index` across all axes. When the first axis hits max_failures, the op recovers — no other axis gets a turn.
- **Impact**: Multi-front operations are structurally impossible. Any op with 2+ axes effectively only runs the first one.
- **Workaround**: Use the synthetic JNA corps pattern for truly parallel early-war ops. For VRS follow-up, use triggered operations that fire after the first op completes.
- **Do instead**: Never add more than 2 axes to an op expecting both to execute. If you need parallel axes, use separate ops on separate corps (real or synthetic).

### [Engine] Understand the FULL attack evaluation pipeline before debugging eligibility (2026-03-21) — NEW
- **Context**: 2nd Tuzla (3000 pers, at staging, adjacent to target, in op, not disrupted, not home defense) showed as "not eligible" in Op Teocak. Spent extensive investigation checking supply filters, home defense, corps assignment, MAX_ATTACKERS_PER_TARGET, and the combat predictor before adding debug logging.
- **Root cause**: `predictAllAdjacentTargets()` returned targets from the brigade's CURRENT position, not the staging position. 2nd Tuzla was still marching to staging in the early execution turns — it wasn't at kalesija_grad_2 yet, so rastosnica_2 wasn't adjacent. By the time it arrived, the op had accumulated failures.
- **Key pipeline** (bot_brigade_eval_attack.ts lines 143-212): Phase check -> objective resolution -> friendly capture check -> `predictAllAdjacentTargets()` from brigade's CURRENT location -> alliance filter -> avoided_osids -> find objective in targets -> solo prediction -> concentrated estimate -> attack decision -> attacker cap.
- **Do instead**: When a brigade is "not eligible" despite correct setup, FIRST add debug logging to the evaluation function. Don't theorize — trace the exact code path. The answer is always in the data: what does the brigade see at that specific turn? Check location, adjacency, and predicted targets for THAT turn, not w40 state.

### [Engine] Synthetic JNA corps for parallel early-war operations (2026-03-21) — NEW
- **Context**: VRS Herzegovina Corps needed to run Op Visegrad, Op Foca, AND Op Herzegovina simultaneously in the first weeks. Pre-planned ops queue sequentially per corps — one active at a time.
- **Solution**: Create `jna_herzegovina_command` synthetic corps. JNA phantoms with that corps_id trigger `initializeCorpsCommand` to create the entry. Ops on this corps run PARALLEL with vrs_herzegovina ops.
- **Gotcha 1**: `initializeCorpsCommand` must be called AFTER `spawnJnaPhantomBrigades` — the first call (before spawn) doesn't see the phantoms.
- **Gotcha 2**: Never share brigades between ops on different corps — the first op grabs them and the second runs empty.
- **Gotcha 3**: Staging OSID must be adjacent to the first objective — non-adjacent staging means weeks of marching and the op stalls.
- **Do instead**: For any new JNA-level early-war operation, use a synthetic corps ID. Put only dedicated units (JNA phantoms + unshared VRS brigades) on the op. Verify staging adjacency.

### [Engine] MAX_ATTACKERS_PER_TARGET raised 3->12 — coordination penalty handles concentration naturally (2026-03-21) — DONE
- **Context**: `bot_brigade_targeting.ts:35` and `battle_resolution.ts:58` capped brigades attacking the same OSID at 3 per turn. Raised to 12 (MAX_PARTICIPATING_BRIGADES). Coordination penalty (0.8x at 3+) provides natural diminishing returns.

### [Engine] Per-axis zero-progress abort enables true parallel axis execution (2026-03-21) — DONE
- **Context**: Multi-axis ops had cross-axis contamination in the zero-progress abort. If total failures across ALL axes >= 3 with zero captures, ALL executing axes stalled. A stalled Foca Valley axis (idle, no attackers) killed a progressing Kalinovik axis.
- **Fix**: Changed zero-progress check from aggregate to per-axis. Each axis checks its OWN failure/capture/attempt counts. Per-axis tracking for objective advancement, failure counts, and stall detection was already implemented — this was the last contamination point.
- **Architecture note**: The multi-axis system now has fully independent axes. Each axis has: `current_objective_index`, `failure_count`, `consecutive_failures_on_current`, `consecutive_catastrophic_on_current`, `idle_execution_turn_streak`, `movement_only_execution_turns`, `status`, `momentum`. The operation enters recovery only when ALL axes are terminal (complete or stalled).

### [Engine] Ping-pong captures count as failures — raise MAX_TOTAL_FAILURES to compensate (2026-03-21) — NEW
- **Context**: Kalinovik axis stalled at 1/5 captures. rs_kalinovik_brigade took varos_2 three times (w11-w13, all decisive r=29+) but RBiH retook it between turns. Each recapture counted as a "failure" (defender still holds). 3 ping-pong + 2 idle turns = 5 = MAX_TOTAL_FAILURES -> axis stalled before reaching golubici_2.
- **Root cause**: The op system checks OSID control the FOLLOWING turn. If RBiH retakes the OSID between attacker's decisive victory and next turn's check, the capture is a "failure." The combat was won but the HOLDING failed.
- **Fix**: Raised MAX_TOTAL_FAILURES 5->8. Gives ops enough runway to push through ping-pong zones. The consecutive failure cap (3) and catastrophic stall (3) already prevent suicidal attacks — the total cap was too conservative.
- **Impact**: 93.1% ATH (+0.3pp). All ops across the map benefit from the extra attempts.
- **Future**: Distinguish between "attack failed" and "captured but retaken" in the failure tracking. The latter should not count toward the failure cap.

### [Engine] Preparation sub-phase overrides planning_duration — use force_staging assembly check (2026-03-21) — NEW
- **Context**: Added `planning_duration: 5` to Op Teocak to give 2nd Tuzla march time. But `tickPreparation` in `operation_preparation.ts` drives through intel_gathering->force_staging->supply_check->assessment->ready based on commander personality. An aggressive commander completes in 3 turns regardless of planning_duration.
- **Root cause**: `preparationReady` (sub_phase === 'ready') at `sector_offensive.ts:800` fires before the `elapsed > planDuration` check. Preparation is the PRIMARY gate; planning_duration is a FALLBACK for ops without preparation.
- **Fix implemented**: Added `countAssembledBrigades()` to `force_staging` sub-phase. Don't advance to supply_check until 60% of participating brigades are at staging/objective OSIDs (or timeout at preparation_max_turns). This naturally extends planning for ops with distant brigades.
- **Do instead**: When an op needs assembly time, rely on the force_staging assembly check, not planning_duration. The preparation system controls the transition.

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

### [Architecture] Organic emergence beats hard caps (2026-03-06)
- **Context**: VRS tempo needed to decay over a 40-week war. Personnel needed faction-specific ceilings.
- **Wrong approach**: Adding phase switches ("RS goes defensive at week X"), hardcoded personnel caps, or forced stance transitions. These create artificial cliffs that don't match historical gradual degradation.
- **Right approach**: Fatigue (+2/battle, recovery only off frontline), supply drain (MAINTENANCE_DRAIN 0.045/formation), entrenchment walls (sqrt curve), and pool demographics create organic decay. RS attacks naturally decline 8->1 by w40 without any forced switch.
- **Do instead**: When a faction's behavior needs to change over time, find the emergent lever (fatigue, supply, pool exhaustion) — never add a hard phase switch or cap. If you can't find an emergent lever, the underlying system is missing a mechanic.

### [Architecture] Scope determines lookup granularity (2026-03-08)
- **Context**: First attempt at sector-based frontline attrition used `sub_segments[].friendly_osids` — only border-adjacent OSIDs.
- **Wrong approach**: Using the narrowest scope (border OSIDs). Only 55% of RBiH brigades were at border-adjacent positions. Casualties dropped ~50%. The issue: many brigades are in the sector's depth zone, not directly at the border.
- **Right approach**: Use `assigned_brigade_ids` — any brigade whose `location_osid` is within the sector's `territory_osids`. This captures brigades in the depth zone who still take sniping/shelling/disease attrition.
- **Do instead**: When choosing which entities a system applies to, map out the full spatial hierarchy (border -> territory -> faction space) and pick the level that matches the mechanic's real-world scope. Passive attrition = entire sector territory. Active combat = border only.

### [Architecture] FormationKind beats conditional checks everywhere (2026-03-07)
- **Context**: Paramilitary units needed to be excluded from reinforcement, bot AI, fatigue, and 6+ other systems.
- **Wrong approach**: Adding `if (f.is_paramilitary) continue;` checks in every system that should skip them. Fragile, easy to miss one, creates maintenance burden.
- **Right approach**: New `FormationKind = 'paramilitary'` type. Existing kind-filters (`f.kind !== 'brigade'`) naturally exclude them from all formation systems without any new conditional checks.
- **Do instead**: When a new entity type needs different lifecycle rules, make it a new Kind (or equivalent type discriminator) so existing filters exclude it automatically. Only add explicit checks for systems where the new type DOES participate.

### [Architecture] When you have 50+ overrides for one behavior, the mechanic is missing (2026-03-07)
- **Context**: Gorazde, Srebrenica, Zepa were being auto-captured via consolidation. Overrides were piling up to prevent it. The ceiling was stuck at ~93.6%.
- **Wrong approach**: Keep adding `avoided_osids` and `osid_control_overrides` for each enclave. Eventually hit a hard ceiling from override debt.
- **Right approach**: Enclaves aren't a tuning problem — they're an engineering problem. Surrounded OSIDs with ethnic co-control or supply access need an enclave resilience mechanic, not more overrides.
- **Do instead**: Count your overrides. When you have 10+ overrides for the same structural behavior, stop adding overrides and build the mechanic instead.

### [Architecture] Connected components, not proxy checks, for reachability (2026-03-11)
- **Context**: Brigades were being assigned to sectors they could never physically reach — e.g. 5th Corps brigades in Bihac pocket assigned to Kljuc/Sanski Most sectors on the other side of RS territory. The Bosnian War had real disconnected pockets (Sarajevo, Srebrenica, Bihac, Maglaj, Tesanj, Ozren).
- **Wrong approach**: Checking `territory_osids.length === 0` as a proxy for "unreachable." Pockets HAVE territory (friendly-controlled OSIDs) — they're just disconnected from the main blob. This proxy silently passed while 28 brigades were assigned to sectors they could never reach.
- **Right approach**: BFS connected components over the OSID adjacency graph (`operational_contact_graph.json`, 744 nodes, 3243 edges). Partition all friendly OSIDs into components. A brigade can only be assigned to a sector in its same connected component. Implemented as `buildFriendlyComponents()` + `getSectorComponent()` in `corps_front_sectors.ts`.
- **Three code paths needed the fix**: (1) `classifyBrigadesByTerritory` Phase 2 pool distribution, (2) `ensureMinimumSectorCoverage` Step 2/3 surplus transfers, (3) the final sector prune. Fixing only one path left 12 bugs (n596). All three paths must filter by `brigComp === sectorComp`.
- **RECURRED n635**: Two more fallback paths found in `classifyBrigadesByTerritory` (line 463 no-sectors-for-corps, line 529 Phase 2b no-reachable fallback) plus the brand-new cross-component density transfer in `bot_corps_directives.ts` (added n631, guarded n635). Total: 6 code paths needed component guards across 3 files. The n631 density transfer was written *during the same session* as the component fix — proving that even awareness of the invariant doesn't prevent new violations when adding new assignment paths.
- **Do instead**: When checking whether entity A can reach entity B on a war map, NEVER use proxy checks (empty territory, zero edges, same corps). Use BFS connected components through same-faction territory. The real invariant is physical connectivity, not data shape. **Any code that assigns a brigade to a sector or issues a march order to a sector MUST check connected component membership.** Run `check_disconnected_assignments.cjs` after every calibration run.

### [Architecture] Derived state must be computed AFTER all its producers have run (2026-03-14) — NEW
- **Context**: `defensive_power` and `threat_ratio` were computed inside `classifyBrigadesByTerritory` (Step 6 of `buildCorpsFrontSectors`). Step 7 (`ensureMinimumSectorCoverage`) and Steps 8a/8b also modify `assigned_brigade_ids`. Sectors rescued by Step 7 from scratch had `dp=0` forever — no brigades existed when dp was computed. Cascade: `dp=0` -> `threat_ratio=0` -> density equalization scores those sectors near-minimum -> SRK siege ring brigades never get reassigned there -> siege ring stays thin.
- **Wrong approach**: Computing derived values mid-pipeline when producers haven't all finished. The value appears valid (no crash, no assertion) but is stale by end of pipeline.
- **Right approach**: Extract to `recomputeSectorPowerAndThreat()`, call as the final step (Step 8c) AFTER all assignment steps complete. If a value depends on a mutable collection, compute it after that collection is fully settled.
- **Do instead**: For any derived field X that depends on collection Y: find ALL pipeline steps that modify Y. If any run AFTER X is computed, move X's computation to after the last Y modifier. This applies to `assigned_brigade_ids`, `territory_osids`, brigade counts — any collection that multiple pipeline steps touch.

### [Architecture] Use blacklists not whitelists for blocking logic that must cover new cases by default (2026-03-14) — NEW
- **Context**: Graz Accords truce was written as a whitelist: block ONLY two specific corps pairs (`vrs_2nd_krajina<>hvo_tomislavgrad`, `vrs_herzegovina<>hvo_southeast_herzegovina`). Every other RS<>HRHB combination was silently exempt. When SRK pushed into HVO Sarajevo area — which should be cold-front per Graz — no block triggered because SRK wasn't in the pair list. Adding new corps or fronts to the game automatically exempts them.
- **Wrong approach**: Whitelist the blocked pairs. New pairs require explicit developer addition; omission means attacks pass through.
- **Right approach**: Block all RS->HRHB attacks at faction level, then explicitly exempt the Posavina corridor (`vrs_1st_krajina`, `vrs_2nd_krajina`) where the Corridor 92 conflict was active. New corps default to blocked, not exempt.
- **Do instead**: When a constraint should apply broadly with narrow exceptions, write it as a blacklist with exemptions. When a constraint should apply narrowly with a broad default, write it as a whitelist. Getting this wrong means every new feature or faction addition bypasses the guard by default. Ask: "if I add a new entity tomorrow, do I want it blocked or allowed?"

### [Architecture] Phase 1 positional capture prevents home-affinity recovery for displaced brigades (2026-03-14) — NEW
- **Context**: In `classifyBrigadesByTerritory`, Phase 1 captures brigades physically located at a front OSID using `continue` — Phase 2a home-affinity never runs for captured brigades. A Zenica brigade that marched to the Doboj front edge gets permanently captured into the Doboj sector; its home-sector chance is gone. The 4-hop cap in Phase 2c (n696) mitigates this by preventing initial long-range displacement, but once a brigade is Phase 1 captured far from home, the phase ordering trap is permanent.
- **Wrong approach**: Adding home-affinity logic in Phase 2a and assuming it will fix displaced brigades. If they were captured by Phase 1, Phase 2a never runs for them.
- **Right approach**: The 4-hop cap is the correct structural prevention — stop brigades from marching far from home in the first place. Phase 1 positional capture is correct behavior (a brigade at the front should defend that front); the problem is how it got there, not Phase 1.
- **Do instead**: When adding recovery logic in Phase N, trace whether early-capture phases (with `continue`) will prevent Phase N from seeing the problematic cases. Document Phase 1's scope limitation explicitly. If brigades shouldn't drift far from home, enforce that constraint in march orders, not in assignment recovery.

### [Architecture] Port systems incrementally, not all-at-once (2026-03-08) — promoted from Recently Violated (clean 4 days)
- **Violation evidence**: Phase 3 GameState domain segregation (`6cf1038`) changed 64 files in one commit. Required 6 automated fixup tools to repair broken tests. Volume of fixup tooling signals scope was too large for one pass.
- **Do instead**: When porting a system to a new model, port one subsystem at a time. Each port step should leave tests green. If you need more than 2 fixup tools, the change is too large.

### [Architecture] Virtual identity routing must be respected by ALL consumers (2026-03-15) — NEW
- **Context**: The elite loan system routed brigades through `loanedCorpsMap` in `classifyBrigadesByTerritory` (sector assignment) but the bot brigade AI used `brigade.corps_id` directly. The sector system saw the elite as a Drina Corps brigade; the AI saw it as a Main Staff brigade with no operations. Result: elites assigned to correct sectors but received zero operation orders for 40 weeks.
- **Wrong approach**: Patching the routing in one consumer (sector assignment) and assuming others will follow. Each consumer independently looks up `corps_id`.
- **Right approach**: After adding any identity-routing mechanism (loan, detachment, operational control), grep ALL references to the original identity field (`corps_id`, `faction`, etc.). Each reference is a potential bypass. A routing system that only works in one consumer is worse than none — it creates the illusion of correctness.
- **Do instead**: When adding virtual identity (loaned corps, temporary faction, etc.), search for ALL references to the real identity field. Test by tracing: "if I follow this entity through every pipeline step, does it use the virtual identity consistently?" The `bot_brigade_ai_osid.ts` corps lookup was the fifth bug found — invisible from the other four layers.

### [Architecture] Redundant gates mask each other — fix one and the next blocks (2026-03-18) — NEW
- **Context**: Offensive corps had no operations. Investigation found SECONDARY_OP_COOLDOWN_TURNS=8 was the suspected blocker. Fixed it to 3 for offensive stance. Result: zero effect (identical hash). The real blocker was isDefenseStrained (density < 0.167). Fixing that revealed supply_critical as the NEXT blocker. The engine has 5+ independent gates on operation launch; when multiple block simultaneously, fixing one reveals nothing.
- **Wrong approach**: Assuming the first blocked gate is THE problem. Fixing cooldown when density was the binding constraint wasted a fix cycle.
- **Right approach**: The `op_launch_trace` diagnostic was the correct solution — log ALL gates, not just the first one that blocks. Now the engine reports `blocked:density_strained(0.120<0.167)` so you know exactly which gate to fix. After fixing, re-check — the trace will show the next gate.
- **Do instead**: When a multi-gate system blocks something, instrument ALL gates (not just the first match). Use a trace array that captures every gate's status. Then fix the binding gate first and re-run to see if the next gate becomes binding. This is why `op_launch_trace` exists.

### [Architecture] Formula bots silently override player/AI intent — add override guards (2026-03-18) — NEW
- **Context**: AI army commander set corps stances (offensive/defensive), but `generateCorpsStanceOrders()` in `bot_corps_stance.ts` overwrote them every turn with the formula bot's computed stance. The AI's strategic decisions were silently ignored. The first Mladic run produced identical results to the formula bot because every stance order was overwritten.
- **Wrong approach**: Injecting decisions into state and assuming downstream systems will respect them. The formula bot's stance generation runs DURING the turn pipeline and overwrites any pre-turn mutations.
- **Right approach**: Added an explicit override guard: `generateCorpsStanceOrders()` now checks `ai_army_decisions[faction]` and uses the AI stance instead of computing its own. Only active when AI decisions exist; formula-only mode unchanged.
- **Do instead**: When adding any override mechanism (AI, player, or scripted), trace the FULL pipeline to find every system that writes to the same field. Each writer is a potential override bypass. The guard must be at EVERY write point, not just the first one. Test by checking: "if I set X before the turn, is X still set after the turn?"

### [Architecture] Two stores tracking the same data will diverge (2026-03-18) — NEW
- **Context**: `civilian_casualties` and `displacement_event_log` tracked civilian deaths through 3 independent write paths: `processDisplacementTakeover` wrote to both, `advanceParamilitaries` wrote to `civilian_casualties` only, and `updateDisplacement` wrote to event log only (and lumped killed+fled into `killed`). Result: 3,700 divergence between the two stores.
- **Wrong approach**: Having two parallel stores that both track "civilian deaths" but are written to by different code paths. Each new write path only updated one store (the one the author knew about).
- **Right approach**: Either unify into one store (make one authoritative and derive the other) or ensure a single write function that updates ALL stores. `recordCivilianDisplacementCasualties()` now serves as that single function — every write path calls it.
- **Do instead**: When you find two fields/stores tracking the same data, immediately audit ALL write paths. If any write path updates one but not the other, there's a divergence bug. Prefer a single authoritative store with a single write function. If two stores are needed (e.g., summary + log), the write function must update both atomically.

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

### [Architecture] Pipeline grouping and splitting steps must use compatible adjacency (2026-03-13)
- **Context**: `splitNonContiguousSectors` (Step 4b) used shared-OSID connectivity — two edges are adjacent if they share any OSID endpoint. `findSubSegments` (Step 1) used triple-junction connectivity — edges must share an OSID AND their other sides must be adjacent. The splitter was LESS restrictive than the grouper, so it never split sectors that the grouper had merged. But when the splitter was made MORE restrictive (using `sharedBoundaryAdj` instead of `osidAdjacency`), it over-fragmented — 2nd Corps went from 13 sectors to 31.
- **Wrong approach**: Using different adjacency sources for grouping vs splitting. Shared-OSID was too permissive (connected edges facing different directions at triple junctions). `sharedBoundaryAdj` was too restrictive (stricter than the grouper's `osidAdjacency`).
- **Right approach**: Both steps now use triple-junction adjacency through the same `osidAdjacency` source. The splitter calls `buildEdgeAdjacency` with the same adjacency the grouper used. This ensures: if the grouper connected two edges, the splitter won't separate them (and vice versa).
- **Do instead**: When a pipeline has a grouping step and a splitting/validation step, verify they use the SAME adjacency/connectivity definition. If the splitter is stricter, it fragments the grouper's output. If permissive, it fails to split what should be separate. Test with both "should split" and "should stay joined" cases.

### [Architecture] Code comments describing sort/selection intent can be outright lies (2026-03-13)
- **Context**: In `splitNonContiguousSectors`, the code comment said "shared-OSID connectivity prevents sectors spanning disconnected fronts." This was true for one case (Srebrenica<>Cerska) but false for another (Zavidovici<>Kakanj). At triple junctions, shared-OSID connects edges facing different directions — exactly the bridging the comment claimed to prevent.
- **Wrong approach**: Trusting the comment and assuming the algorithm was correct because it fixed the original reported bug (n620 Srebrenica<>Cerska).
- **Right approach**: Test the algorithm against MULTIPLE topologies, including the case the comment claims to handle. The Zavidovici<>Kakanj case has the same topology as Srebrenica<>Cerska (edges meeting at a shared OSID but facing non-adjacent hostile sides) but was not caught because nobody tested the "same OSID, different hostile sides that ARE adjacent vs NOT adjacent" distinction.
- **Do instead**: When an algorithm claims to enforce a property (like "no disconnected sectors"), test with at least two topologies: one where the property should prevent merging and one where it should allow it. A single regression test for the original bug is not enough — the algorithm must be tested against the full space of cases it claims to handle.

### [Architecture] Enclave brigades must not leave their pocket (2026-03-12)
- **Context**: All 13 RBiH enclave brigades (Gorazde, Srebrenica, Zepa) displaced from home pockets. 7 Gorazde brigades in Visoko, 5 Srebrenica brigades scattered. Gorazde fell to 2/20 RBiH OSIDs.
- **Wrong approach**: Assumed the retreat system was the problem. Added BFS nearest-friendly to `findEmergencyRetreatOsid` and enclave filter to `getFriendlyRetreatDestinations`. Ran scenario — identical state hash. The brigades had full 1500 personnel = never retreated at all.
- **Right approach**: The brigades marched out VOLUNTARILY via bot AI sector march orders (`evaluateSectorMarch`). At turn 0, Gorazde is connected to the main RBiH blob (271/350 OSIDs in one component). Sector system assigns brigades to main blob sectors. March orders move them out. RS severs corridor. Stranded. The fix is an enclave march guard: enclave-tagged brigades skip march if destination is outside their enclave.
- **Do instead**: When entities are "in the wrong place," check voluntary movement (bot AI orders, march, operations) BEFORE checking involuntary displacement (retreat, emergency). The bot AI is the most common cause of misplaced units. Also: if a code change produces the same state hash, the code path was never exercised — look for a different mechanism.

### [Architecture] Options object beats trailing optional params (2026-03-12)
- **Context**: `forceRetreatWithPenalties` grew to 8 params — 3 consecutive optional numerics followed by optional `adjacency`. 5 of 6 call sites passed `undefined, undefined, undefined, adjacency`.
- **Wrong approach**: Adding optional params one at a time to a positional argument list. Each new param pushes the next one further right, and callers must pass `undefined` placeholders for all intermediate params they don't use.
- **Right approach**: Group optional params into an options object: `{ personnelRetain?, cohesionLoss?, disruptedTurns?, adjacency? }`. Callers pass only what they need: `{ adjacency }`.
- **Do instead**: When a function has 3+ optional params OR callers pass `undefined` to skip params, refactor to an options object. The signal is `undefined, undefined, undefined, X` at a call site.

### [Architecture] Post-pipeline assertions beat per-path guards for cross-cutting invariants (2026-03-12)
- **Context**: The disconnected brigade bug recurred 3 times (n598->n601->n635) despite knowing the invariant. Each recurrence was a new code path added without the component guard. Even the developer who wrote the fix added a new violating path in the same session (n631 density transfer, guarded in n635).
- **Wrong approach**: Guarding each code path individually — every new path requires remembering to add the guard. With 6+ paths across 3 files, omission is inevitable.
- **Right approach**: Single post-pipeline assertion (`assertBrigadeReachability`) runs AFTER all code paths have executed. Catches violations regardless of which path introduced them. Added as the last step in `buildCorpsFrontSectors()`. Pattern proven and then applied to 4 more systems: dissolved brigades in sectors, control event consistency, operation lifecycle, formation territory.
- **Do instead**: For invariants with 3+ code paths that can violate them, add a single end-of-pipeline assertion rather than guarding each path. The assertion is the safety net; per-path guards are optimization. Five assertions now live in `war_phases.ts` (118 steps). Plan: `docs/40_reports/INVARIANT_FOOLPROOFING_PLAN.md`.

### [Architecture] Operations need explicit phase lifecycle (2026-03-06)
- **Context**: Operations would enter execution phase and stay there with no attacks, triggering `execution_without_attack_orders` warnings indefinitely.
- **Wrong approach**: Treating a quiet execution turn as always a broken state. Triggering failure logic and resetting ops.
- **Right approach**: A quiet execution turn with movement orders is a maneuver turn — brigades staging. Only trigger failure if brigades have staged AND zero attacks happen over multiple turns. The gate: have all participants reached staging positions?
- **Do instead**: Operations need explicit states: planning -> staging -> attacking -> completion. A turn with movement-only is still progress.

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

### [Architecture] Timeline JSON overrides code doctrine phases (2026-03-10)
- **Context**: Changed `FACTION_DOCTRINE_PHASES` in `bot_strategy.ts` twice (n558, n559). Both runs produced IDENTICAL results to n556 because `data/scenarios/timelines/apr1992.json` has its own `doctrine_phases` that takes priority via `getActiveDoctrinePhase()`.
- **Do instead**: When modifying faction doctrine phases, ALWAYS edit the timeline JSON (`data/scenarios/timelines/apr1992.json`) first. The hardcoded `FACTION_DOCTRINE_PHASES` in `bot_strategy.ts` is only a fallback for when no timeline is active. Keep both in sync, but the timeline is the source of truth.

### [Architecture] Build extension points early — registry patterns prevent god components (2026-03-16) — NEW
- **Context**: Cross-series review found that 7 shared systems (briefing, settings, SFX, verdict, menu, codex, App.tsx) were each modified by 3-6 milestones across v0.5.x and v0.6.x. Without extension points, each milestone would edit the same files, creating merge conflicts and bloated components. App.tsx alone was touched by 6 milestones.
- **Wrong approach**: Building a component in one milestone and having subsequent milestones modify its internals. Each edit increases coupling and merge conflict risk. By v0.6.4, the original component is unrecognizable.
- **Right approach**: When building a component that WILL be extended by later milestones, use a simple **open registry pattern**: an array of items + a `register()` function. Later milestones push onto the array without modifying the original file. Cost: ~10 lines of code. Savings: prevents 6+ milestones of invasive edits.
- **How to apply**: For any component in a multi-milestone roadmap: count how many future milestones will touch it. If >=3, add a registry pattern. Applies to: panel sections, menu items, briefing collectors, SFX manifests, settings sections, post-game tabs.

### [Architecture] Hidden BFS depth caps silently disable constant changes — always trace the full call chain (2026-03-26) — NEW
- **Context**: Raised `MAX_REDISTRIBUTION_DISTANCE` from 8 to 20 in `brigade_front_distribution.ts`. The change was a complete no-op because `bfsDistance()` in `sector_utils.ts` had its own hardcoded `maxDepth = 10`. Any distance >10 returned `Infinity`, so the 8→20 raise changed nothing until the BFS cap was also raised.
- **Wrong approach**: Changing a constant and assuming it takes effect. The constant was consumed by a function that had its own internal cap.
- **Right approach**: When changing a threshold/constant, trace every function in the call chain to verify no intermediate cap is lower than the new value.
- **Do instead**: `grep` for the constant name AND the functions that consume it. Read those functions for internal caps, early returns, or clamping logic. A constant change that doesn't match its consumer's internal limits is dead code.

### [Architecture] Silent drops in assignment pipelines hide broken deployment — always log unmatched items (2026-03-26) — NEW
- **Context**: Phase 2 surplus allocation in `brigade_assignment.ts` had a code path where `reachable.length === 0` caused brigades to be silently dropped. A variable `unmatched` existed but was never used. These brigades vanished from sector assignment entirely — invisible to all diagnostics.
- **Wrong approach**: Allowing pipeline stages to silently discard items when no match is found. The code returned nothing instead of logging or falling back.
- **Right approach**: Every pipeline stage that processes a collection must account for 100% of inputs. If an item can't be placed, either force-assign with a fallback or emit a warning. Never silently drop.
- **Do instead**: When writing assignment/matching pipelines, add an `else` branch for the no-match case. At minimum `console.warn`. Preferably a fallback. At the end of the pipeline, assert `assigned.length === input.length`.

### [Architecture] Cross-faction pools have a chicken-and-egg problem — hardcode the seed list (2026-03-27) — NEW
- **Context**: Cross-faction pool seeding loop iterated only active formations. Brigades couldn't spawn without pools, pools couldn't be created without active brigades. The loop found zero cross-faction pairs because the formations that needed cross-faction pools hadn't been created yet.
- **Wrong approach**: Only scanning active formations for cross-faction pool pairs. This creates a circular dependency: formations need pools to spawn, but pools need formations to exist.
- **Right approach**: Hardcode `CROSS_FACTION_POOL_MUNICIPALITIES` constant with known cross-faction pairs (e.g., HVO brigades under ARBiH command). Merge into the pool seeding loop before scanning formations. The list is small and stable — it comes from the OOB, not from runtime state.
- **Do instead**: When a seeding/initialization loop depends on entities that don't exist yet, hardcode the seed data. Don't try to discover it dynamically from entities that haven't been created. Known cross-faction relationships are OOB facts, not emergent properties.

### [Architecture] home_mun must match home_osid's municipality — mismatches silently block placement (2026-03-27) — NEW
- **Context**: 255th Slavna had `home_mun: "ugljevik"` but `home_osid` in Zvornik. `factionHasPresenceInMun` checked Ugljevik (RS-controlled), returned false, and the brigade was never placed. The mismatch between the two fields created a silent spawn failure.
- **Wrong approach**: Assuming `home_mun` and `home_osid` are independent fields that can point to different municipalities. The placement system uses `home_mun` for control checks and `home_osid` for physical location — if they disagree, the brigade falls through.
- **Right approach**: For non-enclave brigades, `home_mun` MUST be the municipality embedded in `home_osid` (i.e., `home_osid.split(':')[1]`). For enclave brigades in enemy territory, use the `enclave` tag to bypass the municipality control check entirely.
- **Do instead**: When adding a brigade to the OOB, verify `home_mun === home_osid.split(':')[1]`. If the brigade is behind enemy lines, tag it as `enclave` and set both fields consistently. Add a preflight check that flags any brigade where `home_mun` doesn't match the OSID's municipality.

### [Architecture] Supply filters are double penalties when combat multipliers already model the constraint (2026-03-28) — NEW
- **Context**: Supply filter in `bot_corps_directives.ts` excluded both `critical` AND `strained` brigades from operation pools. 94% of RBiH territory was `strained` (arms embargo). After filtering, 0-1 brigades per corps — below minimum 3 for sector attack. Meanwhile, `getSupplyMult()` in `combat_math.ts` already applied 0.75x combat penalty for strained brigades.
- **Wrong approach**: Binary exclusion filter that prevented ALL RBiH operations for 40 weeks while probes (which used a different code path without the filter) worked fine.
- **Right approach**: Only exclude `critical` supply from operations. Strained gets the combat penalty (0.75x), which correctly models degraded capability without preventing operations entirely.
- **Do instead**: When adding a gate/filter that prevents an action, check if there's already a penalty/multiplier that models the same constraint more granularly. Binary filters + continuous penalties = double penalty.

