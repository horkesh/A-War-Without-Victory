**Lesson memory extraction must happen at the close-boundary, not on the lesson-consumer side (2026-04-05):** Phase 4 wires `CommanderLesson` extraction in `emit.ts:buildUpdatedLessons()`, not in `plan.ts:selectWinningIntent()`. The lesson consumer (plan.ts) receives an already-assembled, already-filtered list; it applies deltas without extracting. This separation is load-bearing: `emit.ts` owns the `cappedHistory` with closed-turn entries and the `planDecision.plan` with target OSIDs — both required for extraction. `plan.ts` owns intent scoring — it should not need to know where lessons came from or how they decay. Pattern: place derived-memory extraction in the layer that owns the closed-turn record (emit/state assembly), not in the layer that consumes the signal (scoring/decision). The consumer receives a clean readonly list; the assembler applies expiry, extraction, and cap. Linked: `[2026-04-05] v0.8.1 Phase 4`.

**Personality and lesson modifiers are additive post-score, never override hard-blocks (2026-04-05):** Phase 4 adds `personality_delta` and `lesson_delta` to intent scoring in `selectWinningIntent()`. Both are applied AFTER the switch-case base score and BEFORE the hard-block rules. This ordering is canonical: soft signals can shift the winning intent among eligible candidates, but they cannot rescue a blocked candidate. A lesson saying "offensive good here" does not unblock an exhausted corps. A personality bias toward aggression does not override a campaign-role prohibition. Pattern: when adding soft behavioral modifiers to any scoring loop, always place them after base scoring and before hard-block evaluation. Hard-blocks are invariants; soft modifiers are preferences. The distinction must be encoded in the code structure, not just in documentation. Linked: `[2026-04-05] v0.8.1 Phase 4`.

**When a guard is added to one assignment-pipeline path, audit all paths for the same gap (2026-04-05):** The brigade assignment pipeline has multiple functions that can assign brigades to sectors: `assignCrossCorpsEnclaveDefenders` (Step 6b), `ensureMinimumSectorCoverage` (Step 7), `commanderReviewAssignment` (Step 8a), and `rehomeUnassignedBrigadesToPhysicalSectorOwners` (Step 8d). Lane A added a drifted-brigade home_osid gate to the enclave function (Step 6b) but not the rehoming function (Step 8d). Brigades stripped by `enforcePhysicalSectorOwnership` (Step 8c) then fell through to Step 8d and got cross-corps assigned anyway. Pattern: when adding a guard to one function in a multi-step pipeline, grep for every other function that can produce the same outcome (in this case, cross-corps assignment) and apply the same guard. The pipeline is a chain of fallbacks — a guard in one link is useless if the next link re-introduces the problem.

**Select-then-filter is a deadlock pattern — filter before select when the filter can reject the entire plan (2026-04-05):** `createOpportunityPlan` selected the top N brigades by fitness_offense from ALL surplus, then checked if those specific brigades could reach the objective. When the best-fitness brigades were deep in the rear (8+ BFS hops), the reachability check rejected every objective and the plan returned null — even though 25+ other surplus brigades WERE reachable. The planner had a structural deadlock: it always picked the best-but-unreachable and always failed. Fix: pre-filter the surplus pool by reachability BEFORE selecting. The plan forms with the best REACHABLE brigades instead of the best overall. Pattern: whenever a selection is followed by a hard filter that can reject the entire result (not just trim it), apply the filter first to the candidate pool. Select-from-filtered is always correct; select-then-filter-all-or-nothing is a deadlock waiting for the right data shape.

**UI components must never cast LoadedGameState to raw GameState — the adapter boundary is the contract (2026-04-04):** `ChiefOfStaffBriefing.buildStrainParagraphs` cast `LoadedGameState` to `GameState` via `as unknown as GameState` to call `computeCorpsCommandStrain`, which read `state.military.corps_command` — a path that exists on raw `GameState` but not on `LoadedGameState`. Crashed on every Army HQ open. The adapter (`GameStateAdapter`) transforms nested `GameState` into flat `LoadedGameState` with `FormationView[]`. `FormationView` already had `commandStrain`/`commandStrainLabel` populated at adapter time. Fix: read the adapter-derived field directly. Pattern: when a UI component needs a derived value that the adapter already computes, NEVER reach past the adapter into the raw state. The `as unknown as` double-cast is a type-safety red flag — if you see it crossing the adapter boundary, it is almost certainly wrong. Grep for `as unknown as GameState` periodically to catch future violations.

**On Windows, a missing `vite` shim is not the same thing as Vite being absent (2026-04-04):** This repo can end up in a state where `vite` is installed and `node .\\node_modules\\vite\\bin\\vite.js` works, but bare `vite` in npm scripts fails with `'vite' is not recognized...'`. That means the package exists but the npm/cmd shim resolution is broken or missing. For deterministic repo scripts, prefer calling the local Vite entrypoint directly in `package.json` instead of relying on the shell to resolve `vite`.

**Operation AAR success is not combat provenance unless the export tracks why control changed (2026-04-04):** `finalizeOperationAAR()` currently marks an operation `success` when all objectives are held at finalization, and `recordOperationWeeklyEntries()` logs captures whenever controller changes to the operation faction. That means `success + total_attacks = 0` does not automatically mean "rear-pocket consolidation, not a bug" and does not prove combat malfunction either. It means the AAR/export layer is provenance-blind: it cannot distinguish capture by operation combat from capture by consolidation or another control event that happened while the operation was active. Pattern: when reading scenario anomalies, separate **runtime truth** from **export truth** before classifying a symptom as gameplay-bug, non-bug, or reporting defect.

**Delegation visibility is a reading of existing state, not a new system — the three-tier outcome classification already existed (2026-04-04):** `deriveOperationOutcomeCategory()` (ordinary_compliance / reluctant_compliance / direct_intervention) was already called by CommandRecord and OutcomeCategoryBadge for post-launch operations. The delegation gap was purely pre-decision: the player could see delegation truth AFTER launching but not BEFORE. The fix was a new derivation (`deriveDelegationContext`) reading the same two inputs (commander_assessment + strain) to classify the pre-decision path. Pattern: before building a "new visibility system," audit whether the truth is already computed and displayed somewhere — the gap may be temporal (pre vs post decision) rather than structural. Adding a pre-decision mirror of an existing post-decision classification is cheaper and more consistent than inventing a parallel classification.

**Standing delegation summary extends an existing section rather than creating a new one (2026-04-04):** The corps-level delegation summary (how many active ops are under normal delegation vs presidential direction) was added to CommandRelationshipSection, not as a new section. Rationale: CommandRelationshipSection already owns the institutional relationship truth (strain, friction, stabilization). Delegation health is institutional truth. Adding it to CorpsSituationSection (which owns military/strategic constraints from CommanderState) would mix derivation paths. Pattern: when adding a new standing truth display, check which existing section already owns the derivation domain. Extend that section rather than creating a new one. The silence=healthy check must expand to include the new truth (delegation notice can make the section visible even when strain = 0 and no friction).

**Condition-based strain sources don't decay — they persist while the condition persists (2026-04-04):** Corps exhaustion strain (+1 at ≥50, +2 at ≥75) is the first condition-based strain source. Unlike event-based sources (force-launch, friction) that decay -1/turn, exhaustion strain has no decay because it reads current state, not historical events. Stabilization can't resolve it because there's no friction event to clear — the corps is physically exhausted. This creates a meaningful distinction: event-based strain recovers with time, condition-based strain recovers only by addressing the condition (reducing operational tempo). Pattern: when adding strain sources, distinguish events (decaying, resolvable) from conditions (persistent, must address root cause). Don't apply decay formulas to conditions or stabilization to non-friction sources.

**Three renders for one theme = one section scan for the player (2026-04-04):** Army HQ corps card had command-relationship information split across an inline friction panel, a "Command Management" section, and a "Command Standing" section. The player had to scan 3 visual groups to answer one question. Consolidation into a single "Command Relationship" section with internal reading order (status → forecast → constraint → friction → action) reduced section count while increasing comprehension speed. Pattern: when N adjacent sections serve the same player question, merge into one section with internal hierarchy. Keep sections separate only when they draw from genuinely different derivation paths (e.g., command strain vs CommanderState situation assessment).

**Postponement count IS the truthful trend record — no previous_assessment field needed (2026-04-04):** Wave 6 needed to show whether an operation is improving, stagnating, or deteriorating. Considered adding `previous_commander_assessment` to CorpsOperation. Rejected: `postponement_count` already captures the exact information because only 'postpone' increments it and resets to intel_gathering, 'launch' ends the cycle at 'ready' (assessment never re-runs), and 'abort' ends the operation. So postponement_count=0 means first assessment (no prior), ≥1+launch means improved, ≥1+postpone means stagnating, ≥1+abort means deteriorated. Zero new persisted fields, zero save/load risk. Pattern: before adding a "previous X" field, check whether the existing lifecycle transitions already encode the history.

**When the engine writes enough snapshots, derive explanation on-read instead of adding engine fields (2026-04-04):** Wave 5 needed to explain why the commander recommends postpone/abort. The engine's assessment formula uses 3 weighted factors (intel 40%, force ratio 30%, supply 30%) compared against personality-derived thresholds. All inputs were already snapshotted on the operation (intel_confidence_at_assessment, supply_readiness_at_assessment, force_ratio_estimate) and the commander's aggressiveness+competence were on NamedOfficerView. Instead of adding new engine-side fields (assessment_score, go_threshold, factor_scores), the UI reconstructs the exact formula on-read. This avoids engine scope creep and keeps the explanation derivation testable as a pure function. Pattern: if the engine already persists the raw inputs and the formula is deterministic, derive the display signal in the adapter/derivation layer. Only add engine fields when the formula needs state that doesn't survive to the next turn.

**When adding a guard filter to an existing function, update ALL test fixtures that call it (2026-04-04):** Adding `isBrigadeAssignedToFront()` to `applyPostureOrders` and `applyPostureCosts` was correct — posture mechanics should only apply to front-assigned brigades. But 12 tests broke silently: the functions returned early/skipped without error, and the tests saw zero changes without knowing why. Pattern: when adding a new guard (like checking `corps_front_sectors`), grep for ALL callers including test files, and update their fixtures to satisfy the new precondition. Silent skip on missing data is the hardest failure mode to diagnose — the function "works" but processes nothing.

**Test fixtures must satisfy the full precondition chain, not just the function's direct parameters (2026-04-04):** `commanderReviewAssignment` has 9 parameters, but internally it calls `findFrontAnchoredSectorId` (checks sub_segments), `getSectorComponent` (checks componentOf + territory_osids), `getSectorFrontOsids` (needs sub_segments for BFS), and `friendlyDistanceToAny` (needs adjacency + friendlyOsids). Tests that pass empty maps for "unused" parameters break when the function's internal helpers consume them. Pattern: when a function takes infrastructure maps (componentOf, adjacency, friendlyOsids), populate them with test-relevant entries even if you think they won't matter — the function's callees may use them as filters.

**Operation-level and corps-level assessment read disjoint state — propagate, don't unify (2026-04-04):** Wave 4 audit confirmed that `commander_assessment` (operation go/no-go) reads operation-level readiness (intel confidence, force ratio, supply) while `classifyPrimaryConstraint` (corps constraint) reads corps-level strategic state (zone assessments, threat, exhaustion, command strain). They share almost no inputs and CAN diverge — e.g., operation ready to launch while corps is under siege. This divergence is a feature: the operation readiness gauges tell one truth (tactical fitness), the corps constraint tells another (strategic context). The correct propagation model is to show BOTH at decision time, not to merge them. The corps constraint context section in the operation modal uses the SAME derivation as the Army HQ corps card, just in compact form. No new derivation, no reconciliation logic. Two honest truths from two different vantage points.

**Standing vs decision-time explanation surfaces have different density requirements (2026-04-04):** The Army HQ corps card (`CorpsSituationSection`) is the standing/ambient explanation — it shows the full hierarchy: badge + dominant reason + relief path + detail factors (military, institutional, threat, plan). The operation briefing modal (`OperationConstraintContext`) is the decision-time surface — it shows only badge + dominant reason + relief path. The detail factors are intentionally omitted because: (1) the modal is already dense with readiness gauges, force ratio, and action buttons; (2) the detail factors are one click away on the corps card; (3) the constraint badge + reason + relief path is the minimum needed for a presidential go/no-go decision. Pattern: when propagating explanation to a secondary surface, identify the minimum truthful slice — don't clone the full surface.

**Relief paths are the constraint's inverse stated with real numbers, not advisory theater (2026-04-04):** Wave 3 adds `reliefPath` to each constraint classification. The pattern: take the exact condition that triggered the constraint and state its inverse using the same real values. Garrison deficit of 4 → "Requires 4 additional brigades". Exhaustion at 65% → "Exhaustion at 65% — requires reduced tempo". Command compromised → "Stabilize or allow natural decay". For threat_pressure, where the player cannot control enemy behavior, the honest framing names what the player CAN do (reinforce, hold defensive positions) without promising outcomes. Never add "win battles to restore X" or "enemy will retreat when Y" — those are outcome predictions the engine cannot guarantee. The relief path is a derived string from the same `classifyPrimaryConstraint()` function, not a new data source.

**Descriptive explanation becomes decision-useful through priority-ordered constraint classification (2026-04-04):** Wave 1 showed a flat list of factors (military, institutional, threat, plan). Wave 2 adds `classifyPrimaryConstraint()` which selects THE single dominant factor using a fixed priority: siege > threat_pressure > defensive_duty > force_condition > institutional_strain > plan_lifecycle > none. Pattern: when a derivation produces multiple concurrent factors, add a classification pass that picks the dominant one by urgency priority. The classification is a pure function consuming the same real inputs — not a new data source. The UI shows the dominant reason prominently with a type badge, and the detail factors in secondary text below. This makes explanation decision-useful (the player knows what KIND of constraint is primary and what the main one IS) without adding any data the engine doesn't already compute.

**Commander plan reasons are transient unless explicitly persisted — persist the reason, not just the plan status (2026-04-04):** `PlanDecision.reason` in `plan.ts` computes explicit reason strings every turn ("corps in defensive stance — no new plans", "viability dropped to 0.15", "adopted pre-planned op: Op Corridor"). But the `CommanderState` only persisted the plan object and its `suspension_reason` — not the creation, advancement, or abandonment reasons. This meant the richest explanation data was computed and discarded. Pattern: when an engine loop produces a decision with a reason string, persist the reason alongside the decision in the state that survives to the next turn. `last_plan_action` + `last_plan_reason` on `CommanderState` is the minimal addition. Derive player-facing explanation on-read from these persisted fields — never in GameState, always in the adapter/derivation layer.

**Corps situation assessment is derived on-read from CommanderState, not stored on GameState (2026-04-04):** `deriveCorpsSituationAssessment()` in `command_strain.ts` consumes zone_assessments, threat_assessment, force_assessment, current_plan, last_plan_action/reason, plus corps stance/exhaustion/strain from FormationView. It produces postureSummary, militaryFactors, institutionalFactors, planExplanation, and threatContext. All null/empty = silence (healthy). This follows the established pattern: GameState holds canonical facts; adapter derives display signals. The derivation distinguishes military conditions (exhaustion, deficit, siege), institutional constraints (stance, strain), plan lifecycle (with persisted reasons), and threat context (pressure, concentration). One canonical surface in Army HQ corps card — not scattered across multiple panels.

**Sim-layer consequences must not import from UI code — use inline approximation (2026-04-04):** The CA recovery rate reduction (Wave 10) needs to know whether any corps is under strain from force-launched ops or unresolved friction. The full `computeCorpsCommandStrain` function lives in `src/ui/map/data/command_strain.ts` — UI code that sim code must not import. Rather than moving the function or creating a shared module (scope creep), the recovery step uses an inline approximation: count recent force-launched ops (within 3 turns) and unresolved friction events (within 2 turns), apply 0.5 penalty per source, cap at 2. This is intentionally a rougher calculation than the UI-side strain score — it captures the same directional signal (more interventions = slower recovery) without creating a sim→UI dependency. Pattern: when sim code needs a derived value that lives in UI, write a simpler inline version that reads the same GameState fields. Accept the duplication cost — it's smaller than the dependency cost. If the two calculations diverge significantly in the future, extract to a shared sim-level utility.

**Reluctant compliance is a distinct presidential outcome category, not a variant of ordinary approval (2026-04-04):** When a president launches an operation against a commander's explicit recommendation to postpone or abort — without spending CA and without triggering the Direct Intervention flag — the institutional record is meaningfully different from an ordinary approved launch. The command chain complied under presidential direction rather than in agreement with it. Collapsing both into "Approved" hides a pattern that matters for accountability and future institutional damage. Pattern: distinguish three outcome tiers from the launch snapshot: `ordinary_compliance` (commander said launch, president agreed — clean channel), `reluctant_compliance` (commander said postpone/abort, president overrode without CA — compliance under direction), `direct_intervention` (CA spent, flag set — override with cost). The `was_force_launched` field distinguishes the last from the first two; `commander_assessment_at_launch` distinguishes the first two from each other. Priority: direct_intervention overrides reluctant even if assessmentAtLaunch is postpone. Apply this three-tier pattern to any future decision surface where the cost paid (CA, resources) is separate from the institutional weight of the decision.

**Institutional interpretation surfaces should fire on clean approvals when context exists, not only on overrides (2026-04-04):** `DirectInterventionSection` only fires when the player overrides a reluctant commander. But command strain is a pre-decision context that matters even on clean approvals — a player launching an operation with a compromised corps should see the institutional friction before they click. Pattern: separate the "override cost display" (fires only on override path) from the "institutional context preview" (fires whenever strain > 0, regardless of approval path). The former is `DirectInterventionSection`; the latter is `OrderInterpretationSection`. Silence = healthy applies to both — neither fires at strain=0. Apply this separation to any future decision surface where context and cost are distinct: show context pre-decision, show cost at override.

**Lanes are not closed until docs match code truth — plan checkboxes and roadmap wording both need updating (2026-04-04):** A lane is not done when the last test passes. It is done when three things are true: (1) the implementation report exists, (2) the plan doc has all checkboxes checked and the status line updated, and (3) the roadmap wording reflects completion. Skipping the doc propagation wave leaves the plan in a zombie state — showing `[ ]` unchecked items for work that is actually complete, which misleads future sessions and audit passes. Pattern: always treat doc propagation as a mandatory final wave, not optional polish. The plan doc and roadmap are contracts with future sessions, not just historical records.

**Dual-path forks must always emit a diagnostic when the fallback fires (2026-04-04):** Any engine function that has a canonical path and a legacy fallback path must make the fallback visible. When `hasLiveSectorFrontlineTruth()` is false, activity counts come from `political_controllers` contact graph rather than hardened sector edges — activity summary data in those turns is approximate. The `console.warn` in `evaluateDisplacementTriggers` enforces this: silence means the canonical path fired; a warn means a developer or QA run should investigate why sectors were absent. Pattern: for every fork of the form `canonical ? canonicalPath() : legacyFallback()`, emit a warning on the fallback branch with the condition that triggered it and the quality implication. Never let a fallback fire silently — silent fallbacks make activity/reporting drift invisible.

**Vocabulary collisions between engine enums and UI severity strings cause insidious bugs (2026-04-04):** The string `'active'` was used both as a brigade `FormationState.status` value (engine-wide) and as a `ThreatItem.severity` level (UI). Any grep, type guard, or future `switch` on `'active'` could conflate the two. Fixed by renaming the threat severity to `'offensive'` — a term unambiguous in context. Pattern: when defining severity/state enums for UI display objects, always check that the string values are distinct from engine-level status enums (`'active'`, `'inactive'`, `'reserve'`, `'destroyed'`). Prefer domain-specific terms (`'offensive'`, `'hardened'`, `'gap'`) over generic lifecycle terms that the engine already owns.

**When demoting a brigade from assigned to reserve, always clear derived cache fields on the formation object (2026-04-04):** The sector pipeline sets `formation.assigned_sub_segment_id` as a derived cache field via `syncSectorAssignmentsToFormations` + `assignBrigadesToSubSegments`. When `assertBrigadeReachability` detects an unreachable brigade and the demotion loop moves it from `assigned_brigade_ids` → `reserve_brigade_ids`, it must also clear `formation.assigned_sub_segment_id = undefined`. Failing to do so leaves the formation carrying stale sub-segment truth that survives into the UI adapter, which reads the field directly. General pattern: any pipeline step that demotes or reassigns a formation must clear all derived cache fields that were set under the old assignment. The UI adapter is a consumer of cached formation fields — it should always see post-demotion truth, not pre-demotion remnants.

**Adapter canonical derivation: build reverse maps from authoritative sources before the main loop (2026-04-04):** When the `GameStateAdapter` derives a field from two possible sources — a canonical engine structure and a cached formation field — always build the reverse map from the canonical source once before the main formation loop, then do O(1) lookup per formation. In this case: `corps_front_sectors[*].sub_segments[*].primary_brigade_ids` → reverse map `brigadeId → sub_segment_id`, built before the formation loop, used as the primary source; formation field is fallback only. This pattern avoids O(brigades × sectors × sub_segments) per-brigade search and ensures the canonical source always wins over a stale cached field. Apply the same pattern to any adapter field that has both a live canonical structure and a cached formation copy.

**Sector assignment lessons — territory presence is not frontline truth (2026-04-04):** Phase 1.5 of `classifyBrigadesByTerritory` previously assigned brigades to sectors based on territory membership (OSID in `sector.territory_osids`) without verifying that the brigade could physically reach the sector front. This allowed deep-rear brigades — sometimes in topologically ambiguous positions adjacent to a different-component sector — to appear as sector-assigned. Fix: require BFS front-adjacency within `TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS` (30) friendly hops before writing to `assigned_brigade_ids`. Brigades that fail the check go to `remaining` for Phase 2 + downstream repair, NOT to reserve — premature reserve insertion in Phase 1.5 causes false state in disconnected topologies. Pattern: every sector assignment step must check physical reachability, not just administrative/territorial membership. The component check is necessary but not sufficient — a brigade can be in the same connected component as a sector but physically separated from its front by a narrow gap.

**assertBrigadeReachability must return actionable results, not just log (2026-04-04):** A diagnostic assertion that calls `console.error` and returns `void` is theater. The violations are logged but the false state survives into runtime. Changed `assertBrigadeReachability` to return `string[]` of unreachable brigade IDs; the caller in `corps_front_sectors.ts` demotes them from `assigned_brigade_ids` to `reserve_brigade_ids`. Does NOT throw — hard-crashing on a corrupted save is worse than a logged demotion. Pattern: any invariant check that detects broken state must either fix it or prevent it — logging alone is insufficient when the engine subsequently reads the broken state as truth.

**Compatibility-only fields need dual comments: canonical block + test-contract text (2026-04-04):** `brigade_front_assignment` at `game_state.ts:1697` needed both an expanded `// COMPATIBILITY-ONLY:` block (explaining no live writers, what owns truth instead, and the relevant report) AND the original `/** Legacy compatibility fallback only... */` JSDoc text. The reason for both: `engine_honesty_legacy_contracts.test.ts` asserts the exact JSDoc substring as a contract check. Replacing the JSDoc with comment-style text broke the test. Pattern: when adding expanded documentation to a compatibility field, preserve the existing JSDoc text that tests assert, and add the expanded block above it. Never replace tested documentation strings without updating the tests.

**Interpretation categories classify institutional drag type, not commander personality (2026-04-04):** `OrderInterpretationCategory` (strain_shaped / caution_driven / feasibility_constrained / tempo_resistant) names what the SYSTEM is doing to the order, not who the commander is as a person. `strain_shaped` means institutional friction is the shaping force (strain > 0). `caution_driven` means professional judgment is operating cleanly (strain = 0, assessment = postpone/abort). `feasibility_constrained` means a hard physical limit exists (siege, force deficit, defensive duty). `tempo_resistant` means the operation window is closing (deteriorating/not_viable trend). This distinction is load-bearing: "caution-driven" is not "stubborn commander" — it is the system correctly signaling that conditions are not met without any friction event. Pattern: when designing command explanation categories, classify the INSTITUTIONAL PHENOMENON (what is blocking the order), not an attributed personality trait. The category should be falsifiable from GameState fields, not inferred from a vague "personality" flag.

**Interpretation section firing scope: ALL reluctant assessments, not just strain > 0 (2026-04-04):** `OrderInterpretationSection` previously fired only when strain > 0. A commander could recommend abort at strain = 0 — no friction, no override, just honest infeasibility — and the section stayed silent, leaving the player with no label for the resistance. The expanded firing condition (postpone OR abort, regardless of strain) closes this gap. The `caution_driven` category handles the strain=0 reluctance case. Pattern: when an explanation section guards on a proxy (strain > 0) rather than the underlying question (is there resistance to explain?), audit whether the proxy can be false while the phenomenon is present. The correct guard is: "does the player have resistance to interpret?" not "is strain elevated?"

**Windows 11 notification method audit (2026-04-04, host: 10.0.26200):** Six methods tested in isolation. Results: BurntToast -- not installed (skipped silently). `msg *` -- exits 0 but no visible popup appears; Windows 11 without terminal services configured silently discards it. `Windows.UI.Notifications` via `Add-Type -AssemblyName Windows.UI.Notifications` -- fails with "assembly could not be found"; the WinRT assembly is not accessible via the `-AssemblyName` shorthand in PowerShell 5 on this machine. `Add-Type -TypeDefinition` with `ContentType=WindowsRuntime` inline C# -- fails; the C# compiler rejects `[void]` as a keyword in that position. Both WinRT paths are dead on this configuration without BurntToast installed. `WScript.Shell Popup` -- **CONFIRMED WORKING**; creates a real modal dialog that is always visible regardless of Focus Assist state; auto-dismisses after configurable timeout (8s used); returns 1 (user pressed OK) or -1 (auto-dismissed). This is the canonical method. Rule: on Windows 11 without BurntToast, WScript.Shell Popup is the only reliable visual notification. Do not assume `msg *` or WinRT paths work -- test explicitly on the target machine.

**Stop hooks fire before the parent script finishes post-processing — never use them for completion notifications (2026-04-04):** Claude's Stop hook fires as soon as the `claude` subprocess exits, not when the calling script finishes. If `run_handoff.ps1` invokes `claude` and then writes `response.md`, updates `meta.json`, generates review artifacts, and sends Slack *after* the subprocess exits, the Stop hook races all of that post-processing and always loses. Any notification fired from the Stop hook will announce completion before the artifacts exist. Pattern: use the Stop hook only for lightweight, artifact-free side-effects (e.g. writing a `completion_signal.json` diagnostic marker). Fire the user-facing completion notification at the end of the parent script, after all artifacts are committed. Apply the same reasoning to any hook that fires on subprocess exit but wraps a script with post-processing: the hook is not "done", the parent script is "done".

**Two resolution speeds create a real player cost curve (2026-04-04):** When a mechanic has a resolution loop (friction accumulates → player resolves), giving the player two speeds — slow/free (acknowledge one event) and fast/expensive (stabilize all at once, pay CA) — creates a genuine cost-benefit decision without making either path "correct". The slow path (Wave 3 one-by-one acknowledgement) is free but takes player attention per-event. The fast path (Wave 4 Stabilize, pay CA) costs a limited resource but clears the board in one click. Neither path changes how strain decays — both set `resolved: true` on friction events, which `computeCorpsCommandStrain()` excludes next read. The CA cost differentiates by crisis severity: 10 for strained (minor), 15 for compromised (major). Pattern: when a mechanic has accumulation + resolution, consider whether a "bulk resolution with cost" action would meaningfully engage the player versus a single "acknowledge all" button. The cost makes the decision real; without cost, bulk resolution is just a UX convenience.

**Constraint gates on player actions must live in the IPC handler, not just the UI (2026-04-04):** When a constraint prevents a player action (e.g. stance gate: can't set offensive when compromised), the enforcement must live in the IPC handler (`electron-main.cjs`) — not only in UI disable logic. The UI disable is a UX convenience that prevents confusion; the IPC handler is the security layer that prevents bypass (e.g. via direct API calls, dev tools, or future UI changes). Pattern: UI sends the request → IPC handler validates the constraint → rejects with `{ ok: false, reason: 'compromised', error: ... }` → UI surfaces the error. The `reason` field in the rejection allows the UI to show a contextual message without parsing error strings. Applied: `stage-corps-stance-order` now validates strain before accepting 'offensive'; `ArmyHQCorpsCard` disables the option in the dropdown. Both layers agree on the constraint. Generalises: any state-dependent action gate (supply gate on ops, exhaustion gate on stance) needs this two-layer pattern.

**Inline CJS strain computation is correct when TypeScript cannot be imported (2026-04-04):** `electron-main.cjs` is CommonJS and cannot import TypeScript modules (e.g. `command_strain.ts`). When the IPC handler needs a derived computation from the TypeScript layer, inline a faithful copy of the relevant logic. The inline must be: (1) mechanically identical to the canonical function (same constants, same decay formula, same sort order); (2) documented with "mirrors command_strain.ts" comment; (3) kept in sync if the canonical function changes. Do NOT: call the TypeScript module via `require()` in CJS, introduce a JSON config file for constants, or duplicate constants in a separate CJS helper without the canonical comment. The inline copy is a known limitation of the CJS/ESM boundary, not a design preference. If it becomes a maintenance burden, the right fix is migrating electron-main.cjs to ESM — not adding an indirect import layer.

**Friction resolution loops need composite keys, not stored IDs, when events have no natural identity (2026-04-04):** When wiring a player acknowledgement flow against engine-generated events that lack a stored `id` field, prefer a deterministic composite key over adding a new stored field. Pattern: `officerId:turn:type` is deterministic within a run, unique enough for the UI routing case, and requires no schema migration. The IPC handler matches by `officer_id + turn + type + resolved===false` — three fields that already existed. Adding a `uuid` or auto-increment id would require touching the engine type, the serializer, and every friction event creation site for no practical gain. Tradeoffs: composite key breaks if the same officer generates two events of the same type on the same turn (prevented by `deterministicRandom` producing one outcome per turn per officer). Generalises to: any acknowledgement flow where the event's uniqueness is guaranteed by domain constraints on the generating system.

**Closing a resolution loop requires only three pieces: existing filter, write path, and review surface (2026-04-04):** The Wave 3 friction resolution loop was viable because three pieces already existed independently: (1) `computeCorpsCommandStrain()` already filtered `!e.resolved` — the gate was there; (2) `FrictionEvent.resolved: boolean` already existed in the stored type — the write target was there; (3) `friction_events[]` was already the canonical engine array. The only thing missing was an IPC path to set `resolved: true` and a UI surface to show the unresolved items. Lesson: before designing a new mechanic, audit whether the residue of existing mechanics already has the required pieces. The resolution gate (`!e.resolved`) had been filtering events for turns without any player ever being able to exercise it. This is the "dormant gate" pattern — an engine filter designed for a player action that was never wired up.

**Silence = healthy is the correct default for institutional signals (2026-04-04):** When surfacing a derived institutional signal (command strain, supply pressure, officer friction) across multiple UI surfaces, the correct default is silence at the healthy threshold — not a zero-state badge or placeholder text. Three surfaces, three different manifestations of the same signal: CoS briefing paragraph (appears only when strain > 0, none of the document structure changes otherwise), OperationsSection notice (appears only when strain > 0 AND ops exist — two conditions must both be true), OperationBriefingModal compound warning (appears only when strain > 0 inside the pre-launch panel). In all three cases the zero-strain read path executes identically to pre-feature code. This is the correct pattern for information surfaces: they add signal, not noise. A "healthy" badge is noise; absence is signal. Generalises to any advisory indicator: supply sufficiency notice, commander confidence warning, exhaustion alert — only show when actionable, absent when nominal.

**Multi-surface signal propagation via existing prop channels (2026-04-04):** When propagating a derived signal to multiple UI surfaces, always audit what data is already available at each surface before adding new props or new GameState fields. Pattern: (1) check if the surface already has gameState or a relevant view-model; (2) if yes, import the utility and compute locally (B1 pattern — ChiefOfStaffBriefing); (3) if a parent already computed it, pass it down as optional props with healthy defaults (B2 pattern — OperationsSection via ArmyHQCorpsCard); (4) if the modal already reads from store, pass computed values into the sub-component directly (B3 pattern — DirectInterventionSection). Never add a GameState field just to make a derived value passable — derive it at the nearest convenient point. The three Wave 2 surfaces used all three patterns without any new GameState fields.

**Derive gameplay indicators on-read rather than storing derived state on GameState (2026-04-04):** When a gameplay metric can be computed from existing fields (e.g. was_force_launched + friction_events + current_turn), do not add a new GameState field for it. Instead, implement a pure utility function in the UI data layer (e.g. `src/ui/map/data/command_strain.ts`) that derives the value at read time. Benefits: no serialization burden, no GameState schema migration, no save-file compatibility risk, no divergence between stored and computed truth. The utility must be deterministic (sorted inputs, no Math.random(), no Date.now()), pure (no side effects), and owned by a single file with a clear canonical doc comment. The adapter layer calls the utility and populates view-model fields (e.g. FormationView.commandStrain) from it. Pattern generalizes to: effective supply status, threat level, diplomatic pressure score, operational momentum — any quantity that is a function of existing state rather than new independent state. Contrast: do NOT derive things that have real causal history that cannot be reconstructed from current state (e.g. "was this op postponed before it launched" must be snapshotted at decision time, not re-derived).

**WebP is canonical for all live UI/runtime assets (2026-04-04):** `src/ui/` imports zero `.png` files at runtime. Canonical live format is `.webp` for scene plates, flags, crests, textures, and UI art. PNG remains valid only for: raw/source art (`raw_sora/`), archived legacy (`_old/`), generated reports/docs outputs, and officer source photos. When adding new live runtime art, convert to `.webp` before importing. Tool: `warroom_resize_assets.ts` produces `.png` only — convert separately with sharp before committing as live asset. Vite MIME map in `src/ui/warroom/vite.config.ts` now includes `.webp → image/webp`. Any future `.png` found alongside a `.webp` twin in a live asset folder is a deletion candidate unless explicitly justified.

**Exact numbers in staff estimates are always lies — bucket them (2026-04-03):** When a UI surface renders engine-computed values as precise numbers (force ratio to 2 decimal places, exact casualty integers, raw defense strength) it is lying to the player. The president receives a staff briefing, not a simulation trace. Pattern: replace exact numbers with bucketed uncertainty ranges and qualify with "estimated"/"assessed". Force ratio → "Favorable (>1.5:1)" / "Contested" / "Unfavorable". Casualties → "Light / Moderate / Heavy / Severe". Strength category → "limited enemy presence (assessed)" not "THIN". Confidence → "High / Moderate / Low confidence" not "73%". The tab name "RawIntelTab" was the tell — it was always debug content masquerading as a player feature. When in doubt: if the label sounds like an engine variable, it should not be in normal play. Applied: RawIntelTab demoted from G2Phase ops clipboard; generateThreatAssessment.ts STRENGTH_DISPLAY map + describeConfidence() bucketing. Canonical reference: PLAYER_VISIBLE_STATE.md, DEBUG_SURFACE_POLICY.md.

**Live fields are not provenance — always snapshot at decision time (2026-04-03):** Any engine field that is recomputed each turn cannot serve as a historical record. `commander_assessment` is recomputed by the preparation pipeline every turn, so by the time an operation is in execution its value is stale relative to what the commander actually recommended when the president decided. Pattern: when the player makes a decision against a live field, snapshot it immediately into a dedicated `_at_launch` / `_at_decision` field set in the IPC handler — not deferred to pipeline re-reads. The live field stays authoritative for current state; the snapshot field is authoritative for provenance/history. Applied: `commander_assessment_at_launch` set in both `stage-operation-force-launch` and `stage-operation-decision` handlers in electron-main.cjs, carried into `OperationAAR`, mapped through GameStateAdapter, rendered in `CommandRecord` (modal) and provenance sentence (history panel). The same pattern generalises to any decision made against a live signal: force ratio, supply, readiness — snapshot at the moment of commitment.

**Command authority is the first real cost on presidential overrides (2026-04-03):** `CommandAuthority` on `MilitaryState` (current/max/spent_this_turn/lifetime_spent) is the player's resource for Level 3 Direct Intervention. Force-launch costs 15; recovery is +2/turn (base rate). The `recover-command-authority` war pipeline step runs after `apply-sector-stance-orders`. The IPC handler blocks the action when authority is insufficient — the cost is enforced server-side, not just UI-side. Future Level 3 actions (manual move = 5, override stance = 10, override recommendation = 20) should follow the same pattern: check in electron-main.cjs, deduct, serialize. `command_authority` is distinct from `political_capital` — the former is the player's, the latter is the non-player political bot's.

**Transient flags need permanent shadows for provenance (2026-04-03):** `force_launch` on CorpsOperation is cleared by `sector_offensive.ts` when entering recovery — before AAR compilation reads it. Pattern: when a flag is consumed/cleared during the lifecycle but must survive into history, add a permanent `was_X` shadow field set at the moment of the action, never cleared. Applied: `was_force_launched` set in electron-main.cjs alongside `force_launch`, read by `finalizeOperationAAR` to populate `OperationAAR.force_launched` + `ca_cost_at_launch`. The shadow field lives on the operation object, not in a side-channel log, keeping provenance collocated with the entity.

**Delegation/override substrate must precede all downstream command milestones (2026-04-03):** The embryonic audit found 18+ player IPC actions, none tagged by command level, none carrying cost. 8 embryonic mechanisms exist (stance_source, warlord_friction, army_hq_overrides, political_leader_types) but none surface to the player. The 6-phase execution plan (`docs/plans/2026-04-03-delegation-override-command-friction-plan.md`) must complete Phase 1 (command level tags) and Phase 2 (command_authority field) before v0.8.2 Political Leader Bot, v0.8.3 Order Interpretation, or v0.8.4 Autonomy can build on real foundations. Canonical terminology: command_authority = player resource for military overrides; political_capital = non-player political bot resource. Do not conflate them.

**Events system has 29-turn decision gaps despite being more capable than used (2026-04-03):** The event system already has 22 condition types, 11 effect types, pressure/recurrence/flags, and 95 events — but decision events cluster in 1992 and late 1995, leaving mid-1993 (29 turns) and 1994 (20 turns) with no player choice. Three presidential event types (Strategic Posture Review, Visit to the Front, Humanitarian Crisis Response) can ship as v0.8.0.x pure JSON content with zero engine changes, filling these gaps. Two more (Patron Pressure Response, Commander Confidence Crisis) gain depth from v0.8.2. Design: `docs/40_reports/implemented/20260403_PRESIDENTIAL_DECISIONS_BETWEEN_OPS.md`.

**Duplicate toolbar affordances silently confuse shell ownership (2026-04-03):** The date label and CHRONICLE button both opened Chronicle — two adjacent elements doing the same thing violates the one-canonical-entrypoint principle. When auditing shell ownership, check for duplicate click handlers on adjacent elements. The canonical path for Chronicle from the toolbar is the CHRONICLE button only; the date label is now a non-interactive display.

**Master roadmap must say the player is the president, not just the doctrine docs (2026-04-03):** It is not enough for `PRESIDENTIAL_COMMAND_DOCTRINE.md`, `UI_OWNERSHIP_MATRIX.md`, and `.claude/napkin.md` to remember the role. `MASTER_ROADMAP.md` also needs an explicit player-role reminder in the active command-chain section or planners will drift back toward brigade-commander assumptions. Keep the roadmap loud about the delegated presidential loop.

**"Visit to the front" belongs in the event/political layer, not a new subsystem (2026-04-03):** If AWWV adds presidential presence moments between operations, implement them as lightweight event-driven choices attached to a corps/sector that temporarily alter morale, urgency, commander compliance, and visibility. Do not turn this into a travel simulator, separate map mode, or unit-control mechanic.

**Presidential command doctrine is now a single referenceable contract (2026-04-03):** `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md` defines the player as faction president with three command levels: Level 1 Strategic Guidance (default loop — posture, events, priorities, reserves, plan approval), Level 2 Army/Corps Directives (active but delegated — stance, ops, commanders, OPSEC, loans), Level 3 Direct Intervention (exceptional override with visible cost — force-launch, override, manual repositioning). All shells, event text, briefings, and future mechanics must conform. Shell ownership: Warroom = LIVES, Army HQ = VISITS, Tactical Map = OBSERVES. Any new player-facing feature must name which command level it belongs to before implementation.

**Adapter defense-in-depth: filter faction-keyed families at adapter output (2026-04-03):** When the adapter ships faction-keyed records (`casualtyLedger`, `factionReserves`, `warPhaseSupplyPressure`, `warPhaseExhaustion`) to the renderer, scope them to the player's faction at the adapter return block via `scopeToPlayerFaction()`. Components already gate by `isPlayerFaction`, but adapter-level filtering prevents future component mistakes from leaking enemy truth. Observer mode (no `player_faction`) passes all factions through unchanged. This is the canonical defense-in-depth pattern for any new faction-keyed family added to `LoadedGameState`.

**Map-first principle for toolbar and shortcut affordances (2026-04-03):** High-frequency player interactions (ops snapshot, war summary) belong on the tactical map as lightweight summaries. Army HQ is for deep review (records, AAR, personnel, briefing drill-down). When a map-local surface already owns a concept (OperationsPanel, WarSummaryModal), toolbar buttons and keyboard shortcuts should open that surface first, with an explicit "HQ Review" handoff for deeper investigation. Do not route quick-glance affordances through the Army HQ modal.

**DragFactor is a structural truth pattern, not a display convenience (2026-04-04):** `DragFactor` (source + intensity + isPrimary + label) names a SYSTEM phenomenon at the right level of abstraction. `source` says what institutional force is acting (command_strain / professional_caution / hard_constraint / timing_gap). `isPrimary` says whether it is the dominant driver or a contributing factor. `intensity` and `label` are human-readable derivations from the same inputs that produced the category. This structure is load-bearing: the bullet list UI reads isPrimary to pick ● vs ○, and the label to render without format decisions in the component. Pattern: when a derivation produces multiple concurrent signals, model each as a typed factor object rather than concatenating prose. The component owns rendering; the derivation owns classification.

**cautionNotice is a fallback safety net, not the primary rendering path (2026-04-04):** Wave 1 introduced `cautionNotice` as the prose explanation for reluctant assessments. Wave 2 demotes it: when `dragFactors` is non-empty, the bullet list is the primary rendering path and `cautionNotice` is not shown. `cautionNotice` fires only when `dragFactors` is empty — covering callers that do not supply the full parameter set or derivation paths that predate the DragFactor model. Pattern: when adding a structured replacement for a prose fallback, never delete the fallback — keep it as a backward-compatibility net and document clearly which is primary. Silence is not the same as deletion: the cautionNotice path still exists and still fires for any path that needs it.

**Unresolved-sector warnings must come from the final canonical unresolved set (2026-04-03):** If a sector pipeline has `same-corps assignment -> enclave rescue -> coverage -> review -> final sync`, then classification-stage warnings are not authoritative. In AWWV, `PENDING_ENCLAVE_REVIEW` from `classifyBrigadesByTerritory(...)` was an example of intermediate diagnostics impersonating final truth. The real unresolved warning owner is the final unresolved set after sector sync.

**Stale `assigned_sub_segment_id` is false frontline residue (2026-04-03):** `assigned_sub_segment_id` is not harmless metadata. `commander_march_correction.ts` treats it as live frontage authority. If a brigade leaves sector ownership and keeps that field, the repo now has two contradictory truths about where the brigade belongs. Clear `assigned_sub_segment_id` whenever sector sync rebuilds assignments; let sub-segment assignment repopulate it only for brigades that are truly back on a sector line.

**Sector truth needs a final physical-ownership pass after late writers (2026-04-03):** Contiguity fixes and enclave-rescue fixes are not enough if later passes can still re-roster brigades on paper. In AWWV, sector output is only honest after a final strip pass that removes any brigade whose current `location_osid` is not on the sector front, in the sector territory, or one hop behind as reserve. Emit unresolved warnings only after that final pass, otherwise the warning stream and the sector roster disagree about what the engine really believes.

**Claude quality must be enforced by repo rails, not repeated reminders (2026-04-03):** If you want future Claude agents to behave at studio level, do not rely on each session restating taste or standards. Put the behavior into a short execution rail and wire the command surfaces to read it. `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md` now serves that role. Rule for future work: when a recurring quality expectation appears for the third time, promote it into a governed read-first standard instead of relying on chat memory.

**Repo-local orchestration matters more than personal skill edits (2026-04-03):** Improving `C:\\Users\\User\\.codex\\skills\\orchestrator\\SKILL.md` only helps the local personal skill path. To change how this repo trains future Claude work, also wire the behavior into `.claude` surfaces that the repo itself owns, such as `.claude/commands/orchestrator.md`, `.claude/agents/orchestrator-dispatcher.md`, `.claude/AGENT_TEAM_ROSTER.md`, and `.claude/agents/README.md`.

**Sector-mandatory means frontline-mandatory (2026-04-03):** Do not treat every active non-exempt field brigade as sector-mandatory by default. The truthful rule is narrower: a brigade only *must* have a sector when it is physically on, inside, or one hop behind a real hostile frontline that a sector could own. `hrhb_travnik_brigade` at `op:novi_travnik:rat_2` proved the distinction: the brigade had real operational neighbors, but `HRHB`-`RBiH` contacts there were still filtered from `war_front_edges_osid` by the alliance gate, so no frontline sector was supposed to exist there. Rule for future work: `collectUnresolvedSectorBrigades(...)` should accuse only missing frontline owners, not allied/interior formations.

**Sector reserve is not frontline truth (2026-04-03):** `reserve_brigade_ids` are still sector-owned but they are not physically on the line. `buildFrontlineAssignedFormationSet(...)` should therefore use only `assigned_brigade_ids`. Treating reserves as frontline leaks false line presence into fatigue recovery, officer-quality updates, scenario reporting, and any system that asks "who is actually holding the line right now?"

**Sector assignment truth must distinguish field corps from army-HQ reserves (2026-04-02):** The repo should never again speak as if `every active brigade must have a sector_id` without qualification. The true rule is narrower: every active non-exempt field brigade is sector-mandatory; idle Main Staff / General Staff reserve brigades are intentionally sectorless until loaned or attached. Canonical helper: `isSectorAssignmentExemptCorpsId(...)` in `corps_front_sectors_constants.ts`.

**Diagnostic assertion files are not the same thing as enforcement (2026-04-02):** A file named `sector_assertions.ts` can easily mislead agents into believing the invariant is hard-enforced even when the functions only log. In AWWV, be explicit: if a rail logs but does not throw or rewrite state, document it as a diagnostic sink, not an enforcement point.

**Dormant compatibility layers must say they are dormant (2026-04-02):** `brigade_pressure.ts` and `apply_brigade_reposition.ts` are dangerous not because they exist, but because they still look alive. When a legacy path is intentionally inert, comments should say so plainly or future work will route authority back into it by mistake.

**Phase F displacement-trigger eligibility must follow sector-owned edge scope when sectors are live (2026-04-03):** Once `corps_front_sectors` exists, displacement triggers should not rediscover front activity through the generic pressure/emergence edge scan. Build the eligible edge scope from sector `edge_ids`, then fall back to the old scan only when sector frontline truth is absent.

**`corps_attack_axis_orders` is retired live authority (2026-04-03):** The desktop/preload bridge and war-phase translation from corps attack axes into `brigade_attack_orders` are gone. Offensive truth must come from canonical brigade AI and operation paths, not a parallel corps-axis order surface that looks plausible but no live shell actually owns.

## 2026-04-02 - Player-facing operation documents must never print raw OSIDs

- OPORDs, objective lists, and HQ roster/history hover titles are player-facing surfaces.
- They must resolve settlement labels through shared display-name helpers instead of leaking raw OSIDs in body text or `title` attributes.
- If a planning/document surface needs exact internal identifiers, that belongs behind an explicit debug-only path, not in normal player play.

# AWWV Project Ledger — Thematic Knowledge Base

**Last Updated:** 2026-04-06
**Purpose:** Knowledge accumulation by theme.

**Repo truth must be treated as product architecture, not clerical cleanup (2026-04-06):** AWWV now carries enough cross-system truth that roadmap drift, architect-board drift, stale reports, and unclassified warnings are product risks, not documentation nits. Permanent rule: every lane or milestone close must leave one coherent artifact set across code verification, roadmap status, architect board, report, and ledger. Reports are evidence, not planning authority; chat memory is not durable governance. Keep `MASTER_ROADMAP.md` as milestone truth, `.claude/architect_notes.md` as active direction + open risks, `PROJECT_LEDGER.md` as dated change log, and reports as supporting evidence. When those disagree, the lane is not truly closed. Linked: `[2026-04-06] Studio Health / Repo Truth planning package`.


**Commander Intelligence Architecture — must_hold two-track system (2026-04-02, n1294–n1301):** The v0.8 commander system implements must_hold via two independent tracks in `zone_detection.ts`. Track 1 (scenario-authored): `must_hold_osids_by_corps` flows from scenario JSON → `Scenario` type → `MilitaryState` → `CommanderBriefing.must_hold_osids` → `detectZones(mustHoldOsids)` → `scenarioMustHold` flag → `ZoneAssessment.is_must_hold = true` → `computeGarrisonBudget()` 1.5× multiplier in `allocate.ts`. Track 2 (engine-derived chokepoints): coded via articulation-point detection from `FactionGraphAnalysis`, permanently disabled with `false &&` pending calibration. Root cause of disable: `MUST_HOLD_MIN_ISOLATED_FRACTION = 0.05` can't separate RS Brcko (~9% RS faction territory) from ARBiH Central Bosnia valley passes (~8% ARBiH faction territory) — any threshold either over-garrisons ARBiH 4th Corps or misses Brcko. Fix needs corps-boundary discriminator: only trigger if isolated cluster spans a different corps jurisdiction than the chokepoint. The `briefing.ts` → `buildBriefing()` populates `must_hold_osids` from `state.military.must_hold_osids_by_corps?.[corpsId] ?? []`.

**Commander Intelligence — organizational readiness gate (2026-04-02, n1297):** `bot_corps_stance.ts` applies a gate after the campaign-plan integration block: if `cmd.commander_state?.force_assessment.tier_counts.main_effort === 0` and current stance would exceed 'defensive', stance is capped at 'defensive'. This prevents corps from launching offensives when they have no main-effort-capable brigades (equipPriority ≥ 2 AND fitnessOffense ≥ 0.4). `ForceAssessment.tier_counts.main_effort` is computed in `force_eval.ts` and persisted on `CorpsCommandState.commander_state`.

**Commander Intelligence — op scale cap by main_effort_count (2026-04-02, n1298):** `plan.ts` `tryCreateFromPrePlanned` and `createOpportunityPlan` both apply: `const mainEffortLimit = mainEffortCap > 0 ? mainEffortCap : naturalRequired; const requiredBrigades = Math.max(MIN_BRIGADES_FOR_PLAN, Math.min(mainEffortLimit, naturalRequired))`. `mainEffortCap` = `forces.tier_counts.main_effort`. When 0 (no eligible heavy brigades), falls back to natural surplus pool size. At n1302, total order counts stayed identical to n1289 (91 orders), but ZEA rate rose 39%→47% — eligible attacker pools narrowing as intended.

**Commander Intelligence — enemy_concentration_zones (2026-04-02, n1299):** `assess.ts` `assessSituation()` builds osid→zone reverse map from `zones[]`, then iterates `prevIntel.concentration_detected` (keyed by sector_id, sourced from previous turn's `IntelPicture`). For each detected sector, walks its `territory_osids` to find zone_ids, deduplicates, passes as `concentrationZoneIds` to `assessThreats()`. `assessThreats()` now accepts `concentrationZoneIds: readonly ZoneId[] = []` and sorts into `enemy_concentration_zones` in the returned `ThreatAssessment`.

**Commander intelligence must consume live brigade fatigue, not invent a second wear model (2026-04-02):** The real local wear signal is `formation.ops.fatigue`, not `brigade_movement_state` and not a new commander-only field. `CommanderBriefing` now carries `avg_fatigue_pct` and `brigades_above_fatigue_threshold`, derived directly from subordinate brigades’ `ops.fatigue`. Fresh plan creation in `plan.ts` now blocks when average brigade fatigue is already too high. Rule for future work: if the commander is being made more “aware” of wear, wire it to `formation.ops.fatigue` first and only add new fields if the engine genuinely gains new information.

**A briefing fix is not complete if downstream force scoring still ignores the same signal (2026-04-02):** After fatigue entered `CommanderBriefing`, `force_eval.ts` was still rating tired brigades as if they were fresh. That split truth is exactly how AI theater creeps in: the planner sounds aware, but the scorer still lies. Wave 1 now applies fatigue directly in brigade offensive/defensive fitness using the same floors as `combat_math.ts` (`0.6` attack, `0.75` defend). Rule for future work: every newly introduced briefing signal should trigger an immediate check of the downstream scorer, allocator, and renderer that claim to use the same combat truth.

**A strategic role is not real until it constrains the local planner (2026-04-02):** `CampaignPlan` front roles were already making it into `CommanderBriefing`, but `economy` and `contain` were still mostly decorative until `managePlan(...)` explicitly blocked fresh offensive plan creation on those fronts. Rule for future work: whenever Army HQ assigns a front role, inspect the exact local invention point for new plans/ops and make sure the role changes behavior there, not just in surrounding comments or summaries.

**Synchronized operations are fake until they change both preference and legality (2026-04-02):** Passing `campaign_sync_role` and `campaign_sync_targets` into `CommanderBriefing` was not enough. The planner also had to (1) prefer synchronized-op targets over broader campaign targets and (2) reject generic fresh-offensive planning for roles like `feint` and `fixing` that the normal plan path cannot honestly execute. Rule for future work: whenever a coordination role enters a briefing contract, verify that it changes both target ranking and allowed plan types.

**Commander Intelligence — coordination competence (2026-04-02, n1300):** `battle_resolution.ts` `getCoordinationCompetenceFactor()` looks up active corps commander from `state.military.named_officers` + `named_officer_data`. Formula: `factor = 1.0 - (3 - competence) × 0.04`, clamped [0.85, 1.10]. Applied only to multi-brigade attacks: `coordFactor = attackerIds.length > 1 ? getCoordinationCompetenceFactor(state, attackerCorpsId) : 1.0`. Then `effN = effNBase * coordFactor`. The `effNBase` still uses the existing SAME_CORPS_EFFICIENCY / MULTI_BRIGADE_EFFICIENCY constants; competence is a modifier on top. `attackerCorpsId` = first attacker's `corps_id ?? undefined` (null-guarded for TypeScript).

**Commander Intelligence — strength-based target ranking (2026-04-02, n1301):** `plan.ts` `selectOpportunityTargets()` now accepts `briefing: CommanderBriefing` as third argument. Ranks `enemy_adjacent_osids` by approach count: `adjacency.get(osid).filter(n => zoneOsidSet.has(n)).length`. More staging-zone OSIDs adjacent to a target = more exposed = higher attack priority. Guarded against absent `spatial.adjacency` (unit tests) — falls back to lex sort when `adjacency` is undefined.

**Aggregate casualty ratio is faction-blind (2026-04-02):** n1302 WOG panel revealed that reporting a single att:def ratio for AWWV is misleading. ARBiH-attacks-VRS should show ARBiH taking 2–4× casualties (rifle-only vs armor+artillery). VRS-attacks-ARBiH should show VRS taking *fewer* than defenders due to firepower dominance. ARBiH defending against VRS also takes heavy casualties from VRS bombardment regardless of tactical role. The aggregate mixes both directions and produces a meaningless average. All calibration reviews must partition by faction pair. See `design_equipment_combat_asymmetry.md` in memory for expected ranges.

**Browser-safe tactical-map imports (2026-04-01):** `dev:map` and tactical-map browser bundles cannot safely import any shared helper that directly or indirectly owns Node file loading. The concrete regression was Vite crashing on `__vite-browser-external:fs` because `combat_math.ts` and `terrain_scalars.ts` leaked file-system dependencies into the browser graph. Permanent rule: shared modules stay browser-safe; adjacent `*_node.ts` modules own disk access and inject runtime data into the shared helpers. Enforce with a browser-bundle regression test, not just a successful Node build.

**Autonomous pipeline steps don't communicate — architectural root cause (2026-03-29):** Deep investigation session traced 10+ bugs to a single architectural gap: **no shared spatial reasoning layer.** Every system (ops, sectors, brigade assignment, retreat, movement, intel) independently rebuilds adjacency graphs, friendly OSID sets, connected components, and BFS from raw primitives — 15+ times per turn. Different systems use different definitions of "friendly," different BFS depths, and see different snapshots of political control (pre-combat vs post-combat). This produces: (1) retreat into dead ends (findEmergencyRetreatOsid is direction-blind, picked sela_2 over trnovo), (2) staging in narrow corridors (1-OSID chokepoint cut off 3 brigades), (3) empty sectors (component fragmentation prevents assignment), (4) zombie ops (corps launches blind without combat prediction, brigades refuse to execute), (5) phantom defenders (secondary co-located brigade contributes power but takes 0 casualties), (6) drift recall through enemy territory (raw BFS sees trapped brigades as "close to home"). Technical Architect proposed `SpatialContext` object computed at pipeline boundaries with shared reachable(), friendlyDistance(), components queries. This eliminates the entire category — fix the architecture, not the individual bugs.

**Corps launch decision vs brigade execution threshold mismatch (2026-03-29):** `evaluateCorpsOffensiveLaunch` checks "do we have brigades and enemies?" — NO combat prediction. `evaluateSectorAttack` checks predictor with costly_victory threshold. Result: corps creates 29 ARBiH ops, 86% fail because brigades refuse to execute what the corps blindly ordered. Zombie ops with 0 brigades block the corps 1-op slot permanently. Four systems can remove brigades from ops (dissolution, JNA withdrawal, elite recall, loan timeout) with no post-removal validation. Fix: (1) corps must sample predictor before launch, (2) ops commander reevaluates on any brigade loss, (3) player always notified of op state changes.

**Sela_2 pocket trap — full causal chain (2026-03-29):** Census gave 3 Kalinovik OSIDs to RBiH (militarily RS). Bot generated ops staging through sela_2, connected via 1-OSID corridor (ljuta). JNA attacked ljuta at 52:1, only 1 of 2 co-located brigades committed to defense (phantom defender). Retreat logic sent both INTO the pocket (direction-blind BFS). ljuta flipped RS, severing corridor. Sector system created pocket sector, locked brigades in. Drift recall saw 3 raw hops (through enemy) not 10+ friendly hops. All escape mechanisms blocked (line-assigned, sector-assigned exemptions). 40% of 4th Corps trapped defending 3 OSIDs that should be RS. Six separate bugs in the chain — all instances of the spatial reasoning gap.

**Operations validation root cause patterns (2026-03-28):** Four systematic patterns discovered via investigation + review: **(1) Staging validation must use definition order**: `validateOpAtInjection` Check C sorted objectives alphabetically then checked first enemy-held objective. But ops define objectives in march order — brigades walk through already-owned objectives. Fix: check adjacency to first objective in definition order, not sorted. 5 of 9 staging errors were false positives from this bug. **(2) Faction targeting is handled by Graz Accords, not objective filter**: Initial investigation flagged Op Corridor as "RS attacking HRHB allies." Reviewer overturned: VRS historically fought HVO in Posavina (Odžak fell July 1992, BB1 p.182). `local_truces.ts` explicitly exempts `vrs_1st_krajina` from Graz RS-HRHB block. No `isHostile()` check needed — existing faction-pair truces handle this. **(3) Brigade spawn timing three-way mismatch**: Brigade `available_from` (recruitment eligibility) ≠ actual creation turn (depends on pool capacity + territorial control) ≠ operation `available_from` (injection time). Ops inject at pipeline step ~808, recruitment at ~1518. Same-turn brigades lose the race. Example: arbih_254th (available_from=4) created at turn 31 due to Lopare being RS-controlled. Deferred fix: operation-aware pre-flight recruitment. **(4) Empty sectors from donor starvation**: `ensureMinimumSectorCoverage` only transfers from surplus sectors (2+ brigades). When all corps sectors have 0-1 brigades, no donor exists → empty sectors persist. SRK sector with 14 front edges gets 0 brigades while 1-edge sectors keep theirs. Deferred fix: edge-count triage.

**Anomaly detector consolidation-only pattern (2026-03-28):** `rear_pocket_consolidation.ts` auto-flips surrounded ≤3 OSID pockets. Tagged `mechanism: 'consolidation'`. Ops succeeding via this (Op Drina, Op Visegrad) show outcome=success + captures>0 + attacks=0. Check #12 must exclude these to avoid false positives. The combination uniquely identifies consolidation-only successes because normal combat ops cannot capture objectives with 0 attacks.

**Diagnostic fix patterns (2026-03-27):** Four fixes from diagnostic session: **(1) Probe type gate**: `bot_corps_directives.ts` attack-type gates must include `probe` alongside `sector_attack` — missing probe from the gate silently disabled all probe operations for the entire war. Any future attack type must be added to ALL type gates, not just the primary attack path. **(2) Strategic reserve overflow boundary**: `OVERFLOW_THRESHOLD` comparison must use `<` not `<=` — the off-by-one let reserves sit at exactly the threshold without redistribution. General rule: threshold boundaries in resource redistribution should use strict inequality to trigger flow. **(3) Orphan minority pools**: Minority faction pools stranded in enemy-controlled municipalities (e.g., Bosniak pools in RS-held east Herzegovina) should drain to strategic reserve, modeling displaced populations. Without drainage, these pools accumulate manpower that never reaches any brigade — a silent resource leak. **(4) Herzegovina Bosniak displacement reroute**: Expelled Bosniak minorities from east Herzegovina must contribute to ARBiH-held municipality pools (Mostar, Jablanica, Konjic). The 4th Corps starvation (2/10 healthy brigades) was a supply-demand mismatch: 11.5 personnel/turn supply vs ~3000/turn demand. The displaced population reroute provides the demographic base the corps needs. Combined effect: 92.2% area-weighted, 62 battles (was 44), HRHB 8 attacks (was 0), 4th Corps 9/10 healthy.

**Map Command rail layout (2026-03-27):** The left **OOBSidebar** (`Command`) uses **`--awwv-toolbar-clearance`** (7.5rem live / 8.5rem dev) so fixed UI clears the **centered floating crest**, not only the 48px **PresidentialToolbar** row. Result: a **wide empty band** under the thin bar on the **left** (asymmetric waste — crest is center). Corps vertical rhythm: **`space-y-3`** in Army section + tall **`CorpsCard`** / **`FlipCard`**. Prior **modal-focused** blank-space audits did not include this rail. **Remediation options:** separate **`top`** / CSS variable for left rail vs. center-right; tighten **`space-y`**; z-index crest over left rail if design accepts overlap. Source: [20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md](40_reports/implemented/20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md), [GUI_MASTER.md](40_reports/GUI_MASTER.md).

**Combat audit architecture decisions (2026-03-26):** 16 mechanical fixes across deployment, operations, intel, data, and combat layers. Key design decisions: **(1) Deterministic battle_id join key**: Format `{turn}:{osid}:{attacker}:{defender|null}` — embedded at production time in `attack_resolution_osid.ts`. Propagates to `battle_records`, `control_events.attacker_brigade`, `brigade_history.battle_id`, and `weekly_report`. Enables cross-layer post-run analysis without post-hoc joins. Friction skirmishes use `{turn}:{osid}:friction:{brigadeId}`. **(2) Frontline friction visibility**: `frontline_attrition.ts` now records `BrigadeEngagement` when casualties ≥ 15 (FRICTION_CASUALTY_THRESHOLD=15) with 35% deterministic probability (FRICTION_RECORD_CHANCE=0.35, seeded on `friction_{turn}_{brigadeId}`). Personnel losses that previously appeared from nowhere now show in brigade history. **(3) Intel decay vs buildup**: Passive intel buildup rates raised (RBiH 0.06→0.12, RS/HRHB 0.05→0.08) — confidence was decaying faster than it built, sectors stayed sub-threshold all war, no operations ever launched. Fix raises buildup so intel sustains past w10. **(4) OPSEC wiring**: `sector_offensive.ts` now pushes `op.sector_id` to `opsec_sectors[]` during planning phase. Previously `opsec_sectors` was read and applied but never written — dead code for the entire war. **(5) Concentration detection**: `sector_intel.ts` now adds +0.10 confidence boost when enemy sector has ≥2 reserve brigades. Gives defenders early warning of build-up. **(6) Assembly gate**: `computePlanningDuration()` extended by march time estimate; force_staging sub-phase now waits for 60% assembly (ASSEMBLY_THRESHOLD=0.6) or ASSEMBLY_TIMEOUT_TURNS=5 before advancing to supply_check. Eliminates zero-attacker operations. **(7) Anomaly detector**: `src/scenario/anomaly_detector.ts` — 10 automated post-run checks: battle_tempo_floor, outcome_distribution_skew, zero_personnel_active, brigade_never_fights, unlocated_formations, osid_seesawing, operation_stagnation, empty_contested_sector, corps_out_of_area, casualty_ratio_check.

**Battle definition (2026-03-26):** A "battle" for calibration purposes is **≥50 total casualties (attacker + defender combined) at one OSID in one turn**. Target: 150-250 battles per 40 weeks (historical 1-3 brigade-level engagements/week). Pre-fix baseline: 54 battles/40w (only 16-26% of historical tempo). This threshold may need adjustment once tactical friction is fully implemented.

**Codex essay QA methodology (2026-03-25):** 83 essays audited through 3 complete passes with 5 specialized rounds each (historian×4 parallel, operations expert, web/ICTY verification, war-or-game realism, geographic/directional). 24 corrections total. **Key lessons:** (1) First-pass "fixes" can introduce new errors — Stupni Do "Apostoli" was incorrectly removed, Sharp Guard predecessors were corrected wrong twice. Always verify fixes in a second pass. (2) Source hierarchy matters: ICTY verdicts > museum primary sources in local language > BB > English Wikipedia. The Sarajevo Tunnel Museum (Bosnian) says 29 January 1993 and 760m; Wikipedia says March and 800m; museum wins. (3) Web verification catches things BB and ICTY don't cover (Djukic fled vs died, Deliberate Force end date 20 Sep not 14 Sep). (4) Geographic/directional checks require map verification, not assumption ("sweeps west" from Bihac is impossible — west of Bihac is Croatia). (5) 13 essays in the index have no files — all 1992 foundation events. Essay index uses `essay_` prefix but files don't. (6) Parallel historian agents (4×~21 essays) enable full-corpus audit in one session. (7) Tone/framing issues (Round 4) are editorial decisions, not factual errors — track separately for user direction.

**Dynamic Codex architecture (2026-03-23):** The Codex is an unlockable encyclopedia that morphs with player decisions. Four essay layers: canonical (ICTY-sourced, immutable), dynamic (game-state paragraphs), divergence notes ("in the real war X, in yours Y"), ghost entries (events that never fired). Four tiers: FIXED (international scaffold, ~29), CONDITIONAL (binary fired/ghost, ~20), SHAPEABLE (dynamic paragraphs, ~33), AHISTORICAL (template-generated, ~14). Event dependency graph: 7 causal chains, Croat-Bosniak war is highest-degree hub (21 dependents). Essay template engine: `dynamic_sections[]` keyed by paragraph index + flag conditions, `ghost_when` for unfired events, `unlock_condition` for prologue vs event-triggered.

**Event flag wiring COMPLETE (2026-03-25):** All 25 orphan flags now consumed. Phase 4 wired 7 engine flag reads (arms_embargo→supply, corridor→RS aid, drina_cleansing/camps→patron pressure, coha→combat suppress, dayton→game over). Phase 5 wired 13 orphan flags as pressure modifiers and condition gates on downstream events. 7 endgame events converted FIXED→CONDITIONAL with pressure systems and requires_events chains. Full endgame chain: Srebrenica (pressure, gated on enclave_formed + demilitarized) → Zepa (requires Srebrenica) → Markale II (pressure, gated on siege + RRF) → Deliberate Force (requires Markale II) → Federation Offensive (requires Deliberate Force + Washington Agreement) → Ceasefire (requires Fed Offensive) → Dayton. **Key design principle**: pressure events accumulate readiness only when ALL prerequisites met (conditions + turn window + requires_events). The requires_events check in `updateEventReadiness()` prevents premature pressure accumulation. Orphan flags are now zero.

**Exhaustion accounting architecture (2026-03-25):** The pool exhaustion system (EXHAUSTION_THRESHOLD=0.25 half-rate, HARD_CAP=0.50 no-mobilization) is the designed demographic plateau mechanism. It works per-municipality: `exhaustionRatio = (available + committed + exhausted) / (censusEligible * 0.28)`. Three accounting bugs were fixed: (1) pool.available was excluded from numerator — mobilized-but-unassigned men are still demographically committed, (2) initial OOB brigade personnel never incremented pool.committed — 38k RS troops invisible at init, (3) strategic reserve sweeps decremented pool.available but never incremented pool.committed — 20-40k leaked. All casualty channels (battle resolution, frontline attrition, siege attrition) now use 75% feedback to pool.exhausted (was 25% for frontline/siege which handles 95% of losses). **Key pattern**: when an exhaustion/threshold system isn't biting, check the numerator accounting before tuning the threshold. The system was designed correctly — it just received bad data. **Key finding**: displacement does NOT reduce origin mobilization base (census is frozen at 1991). This is a structural positive feedback loop — displacement creates manpower instead of redistributing it. Fix implemented but minimal impact because displacement numbers are small relative to total population. **Pool decay (war weariness, 2026-03-25):** Secondary mechanism added after accounting fixes closed only 10k of 29k RS gap. `pool.available *= (1 - DECAY_RATE)` per turn models desertion, draft evasion, emigration. Faction-differentiated: HRHB 2.5% (exit-to-Croatia pipeline), RS 2.0% (desertion crisis + Belgrade competing demands), RBiH 1.2% (geographic entrapment — nowhere to go). Enclave municipalities (Srebrenica, Gorazde, Zepa) exempt — no escape route. Decayed men vanish entirely (not added to pool.exhausted — they left the war). Pipeline step: after ongoing-mobilization, before reroute-pool-surplus. Combined with A-series accounting fixes: RS w104 149k→124k (target 110-120k, 4k over), HRHB 68k→58k (target 50-55k, 3k over), ARBiH 194k→199k (target 165-180k). 40w calibration: 91.2% (-0.1pp). **Key design insight (game designer)**: pool decay serves the negative-sum identity — manpower visibly erodes even when "winning." Connects to v0.8 Command Chain ("no replacements" grounded in real empty pools) and v0.9 Consequences (war crimes displacement destroying your own recruitment base).

**Command hierarchy with AI slots (2026-03-23):** Political Leader → Army Commander → Corps Commanders → Brigades. Player chooses depth of involvement per decision. Officers have personalities (aggression, competence, loyalty) that FILTER orders through `interpretOrder()`. Three tiers of pushback: creative interpretation (normal), delay/objection (1-turn), refusal (extreme). AI API plugs in at political level for opposing factions (latency concern blocks corps-level API). Key insight: the player doesn't "choose a mode" — they choose where to intervene; the hierarchy always runs.

**Campaign structure decision (2026-03-23):** Game starts April 1992 ONLY. September 1991 start CUT. Peace phase CUT (pre-war events are Codex backstory, unlocked at game start). Three historical scenarios (April 1993/1994/1995) deferred to v1.2 — each requires months of /historian research for accurate OOB, territory, diplomatic state snapshots. The scenario loader needs mid-war entry support with pre-fired events and pre-set flags.

**Preparation-aware brigade assembly (2026-03-21):** `countAssembledBrigades()` in `operation_preparation.ts` force_staging sub-phase checks how many participating brigades are at staging/objective OSIDs. Gate: 60% assembled OR timeout at preparation_max_turns. The `planning_duration` field on PrePlannedOp is a FALLBACK — the preparation sub-phase machine is the PRIMARY transition gate. Aggressive commanders (aggressiveness ≥ 4) complete preparation in 3 turns regardless of planning_duration. The force_staging assembly check is the correct intervention point.

**Attack evaluation pipeline (2026-03-21):** Full pipeline in `bot_brigade_eval_attack.ts:143-212`: (1) phase=execution check, (2) `getSectorOffensiveCurrentObjective` per-axis, (3) friendly-capture skip, (4) `predictAllAdjacentTargets` from brigade's CURRENT location (not staging — if brigade is still marching, target won't be adjacent), (5) alliance filter (RBiH↔HRHB), (6) avoided_osids filter, (7) `targets.find(t => t.osid === currentObjective)` — if objective not in predicted targets, brigade CANNOT attack (this is where march-timing issues manifest), (8) solo prediction vs `min_attack_outcome` threshold, (9) concentrated estimate (`1 + N × 0.85` multiplier, N = adjacent axis participants — STATIC count, not dependent on commitment order), (10) `MAX_ATTACKERS_PER_TARGET = 12 (raised from 3)` cap. **Key insight**: step 4 uses CURRENT location, not staging. A brigade still marching to staging doesn't see the objective. This is why 2nd Tuzla appeared "not eligible" — it was in transit. The concentrated estimate uses static participant count (all adjacent axis members) so evaluation order doesn't matter for eligibility, only for the attack cap.

**Synthetic JNA corps pattern (2026-03-21):** Pre-planned ops queue sequentially per corps (one `active_operation` at a time). To run parallel early-war JNA-directed operations, create a synthetic corps ID (e.g. `jna_herzegovina_command`). JNA phantoms with that `corps_id` trigger `initializeCorpsCommand` to auto-create the entry. **Critical**: `initializeCorpsCommand` must be called AFTER `spawnJnaPhantomBrigades` in `scenario_runner.ts` (added second call at line 1276). **Rules**: (1) never share brigades between ops on different corps, (2) staging OSID must be adjacent to first objective, (3) JNA phantoms should use `no_equipment_handoff: true` to prevent equipment inflation.

**Herzegovina takeover pattern (2026-03-21):** 7 painted-RS OSIDs in Mostar hills (kruzanj_2, vranjevici_2), southern Konjic (glavaticevo_2, ljuta), and Kalinovik (golubici_2, sela_2, varos_2) were initially RBiH from census but VRS captured them April-June 1992 (BB1 p.480, p.496, p.193; BB2 p.514). JNA 37th Corps directed local Serb forces. Op Herzegovina on synthetic `jna_herzegovina_command` captures 4/7 (Kalinovik via Op Foča Kalinovik axis, glavaticevo via JNA phantom). Mostar Heights axis still not attacking (march timing). Session report: `docs/40_reports/20260321_HERZEGOVINA_CALIBRATION_SESSION.md`.

**Micro-OSID merge butterfly effects (2026-03-21):** Merging 32 micro-OSIDs (< 1 km², 744→712) caused 3 distinct butterfly effects: (1) Op Drina Zvornik Sweep lost 2 objectives (drinjaca, paljevici merged into novo_selo) → faster completion → freed VRS brigades → VRS took rastosnica_2 → cut Teočak corridor. Fix: add replacement objectives (krizevici, vitinica_2) to maintain 5-objective tempo. (2) Op Višegrad SE-first reorder → RS took kalesija_selo/seher_2 200km away → encircled Djulici/Vitinica RBiH brigades. Fix: reverted. (3) Non-existent staging OSID `pisari_2` in Op Koridor Posavina Flank silently prevented axis execution for entire war. Fix: → `crkvina_2`. **Key pattern**: removing operation objectives changes operation tempo, which changes when brigades become available for corps-directed assignment, which cascades through the entire map. Always add replacement objectives when removing merged ones. Always verify corridor connectivity after OSID merges.

**Operation staging OSID validation (2026-03-21):** `pisari_2` was a non-existent OSID used as staging for Op Koridor Posavina Flank. No error, no warning — the axis silently produced zero eligible attackers. This allowed 3 HRHB OSIDs (Derventa, Brod, Novo Selo) to survive surrounded by 11,000 VRS personnel for 40 weeks. **Lesson**: operation builder does not validate staging OSIDs. After any OSID merge, grep all `staging_osid` values in `pre_planned_operations.ts` and `triggered_operations.ts` against `osid_areas.json`. Future improvement: add validation at scenario init.

**Reactive defense pooling distance problem (2026-03-21):** When attacking rastosnica_2 with ARBiH 2nd Tuzla (3000 pers), ratio was 0.35 — catastrophic defeat. 25 VRS brigades contributed reactive defense within 5-hop BFS range, totaling 5,223 effective personnel. The 2nd Romanija (3000 pers) was physically at the target (0 hops). Even at 0.60^hops decay (the current model), the pooled defense makes counterattacks into established VRS sectors nearly impossible. The ARBiH Op Teočak succeeded yesterday because VRS had fewer brigades in the area; today's force redistribution (from OSID merge cascade) placed the 2nd Romanija at rastosnica_2. **Implication**: reactive defense makes VRS positions increasingly impregnable over time. ARBiH counterattacks need to fire EARLY (before VRS entrenches) to succeed.

**Žepa-Teočak seesaw (2026-03-21):** Žepa enclave defense and Teočak corridor are inversely coupled through VRS Drina Corps force allocation. When Žepa is weak (285th at 600 pers), VRS 1st Bratunac overruns it at w20 → VRS pushes south → 2nd Romanija pulled from Zvornik area → rastosnica_2 weakly defended → ARBiH Op Teočak succeeds → Teočak connected. When Žepa is strong (285th at 1500 pers), 1st Bratunac bounces → VRS stays in Zvornik → 2nd Romanija blocks rastosnica_2 → Op Teočak fails → Teočak cut off. **Solution**: both fixes simultaneously — (1) 285th bumped to 1500 (historical Žepa Brigade ~1500-2000 strength from ~8,400 Bosniak population, 2,350 military-age males), (2) Op Teočak strengthened with 2nd Tuzla (3000 pers) and fires earlier (w20→w25 becomes w20). The stronger op can punch through even with 2nd Romanija present. Result: Žepa holds (1st Bratunac stalemate w22, repulsed w23), Teočak connected (rastosnica_2 captured w24). **Key pattern**: when two anchors are coupled through the same corps' force allocation, fixing one breaks the other. Both anchors need to be strengthened simultaneously — defense for the enclave, offense for the corridor.

**Enclave OOB understrength pattern (2026-03-21):** Žepa had only 1 brigade (285th Light, 600 pers) — far below the historical ~2,000-3,000 armed defenders. Rogatica municipality had ~8,400 Bosniaks, ~2,350 military-age males. 1,500 is 64% mobilization — high but realistic for a besieged pocket where every man fights. The enclave garrison power (`enclave_resilience.ts`) adds TDF/police/civilian defense, but it wasn't enough to offset a 600-pers brigade against 1st Bratunac (1,800 pers). **Lesson**: when checking enclave defense, compare the OOB personnel vs attacker strength AND historical garrison size. Single-brigade enclaves are fragile regardless of resilience multipliers — the base must be sufficient.

**Displacement routing overhaul (2026-03-19):** Historically accurate per-municipality routing tables replaced region-level groupings. Key findings: (1) Zvornik displaced went WEST to Tuzla via Kalesija/Sapna, NOT south to Srebrenica — Drina split required. (2) Bratunac/Vlasenica displaced went INTO Srebrenica, forming the enclave population — this is correct and must not be blocked. (3) Krajina Bosniaks (Prijedor, Sanski Most, Bosanski Novi) primarily fled via ICRC/UNHCR organized convoys to Croatia — 35% flee-abroad rate vs 10% default. (4) Posavina Croats from Brod/Derventa went south to Žepče/Travnik, not 100km east to Orašje. (5) Enclaves correctly receive refugees (that's WHY they became enclaves) but at reduced militarization rate (0.005 vs 0.02) — besieged refugees arrive unarmed and starving. (6) Displacement pool contribution cascades non-linearly through combat outcomes — 5k extra militia committed can flip 6 marginal Zvornik OSIDs. (7) RS pool scale changes are catastrophic — 0.25→0.35 caused Sarajevo to collapse from 74.8% to 45.9%. Cross-faction cascade confirmed.

**Displacement timer bug (2026-03-19):** 4 of 5 OSID control-flip paths silently skipped displacement timer creation. Only battle resolution (`attack_resolution_osid.ts`) produced `settlement_flipped` records. Rear pocket consolidation, paramilitary sweep, JNA phantom captures, and null-OSID auto-claim all wrote `political_controllers[osid] = faction` without seeding timers. Result: 21.6% of RS-controlled OSIDs had zero Bosniak displacement (81/375). Fix: `seedDisplacementTimerOnFlip()` shared helper. Battle-driven timer also fixed to seed ALL minority factions (not just defender — Bosniaks in HRHB territory captured by VRS need timers too).

**AI Commander QA findings (2026-03-17):** Three API-powered AI commanders (Mladić, Halilović→Delić, Petković) ran 40w campaign and produced 345 diagnostic observations. Six actionable themes: (1) Alliance decay too fast (95 obs — initial 0.35 should be 0.75, war target April 1993 ~w52), (2) SRK density-gated from siege ops (24 obs — siege corps should be exempt from density gate), (3) Supply gate stripping all targets (23 obs — should be graduated, not binary), (4) Event timing wrong (33 obs — events should be conditional on game state, not calendar), (5) Operation state machine bug (16 obs — ops stuck in planning), (6) Late-war stasis (9 obs — 22 turns frozen). See `memory/ai_commander_three_agents.md` and `memory/conditional_events_design.md`.

**Conditional events design (2026-03-17):** Three event types: state-triggered (fires when game state condition met, e.g. Jajce falls when RS takes it), conditional-timed (fires at calendar week IF condition met, e.g. Bread massacre if Sarajevo besieged), unconditional-timed (fires regardless, e.g. Arms embargo). Condition schema: `{ type: "territory_control", municipality: "jajce", controller: "RS", threshold: 0.5 }`. Backward compatible — events without conditions fire by week as before. Next scenario: 52w+ covering Croat-Bosniak war (1993-1994).

**40_reports structure (2026-02-24):** Backlog is consolidated into themed docs (BACKLOG_*.md) in docs/40_reports/backlog/; originals archived to docs/_old/40_reports/backlog/. For historical fidelity, Phase 7, mobilization, etc., use the themed doc or the archived filename in _old. See docs/_old/README.md §40_reports/backlog and CONSOLIDATED_BACKLOG. Chronological record remains in `docs/PROJECT_LEDGER.md` (append-only).

**GUI master (2026-03-07):** `docs/40_reports/GUI_MASTER.md` is the living GUI reference (map + warroom). Read it first when starting GUI work and update during the session — same discipline as CALIBRATION_MASTER for calibration.

**Warroom master (2026-03-07):** `docs/40_reports/WARROOM_MASTER.md` is the living warroom reference (scene plate, modals implemented vs proposed, hotspots, commander assignment). Read first for warroom work; update during session. Links to nano banana brief.

Use this doc to find decisions, patterns, and rationale by topic. For full changelog and artifact lists, see PROJECT_LEDGER.md.

---

## 1. Project Identity & Governance

**How to use:** Check project name, non-negotiables, current phase, and what work is allowed or disallowed. Update "Current Phase" and "Phase tracking" when milestones change.

### Identity

- **Project:** A War Without Victory (AWWV)
- **Type:** Wargame simulation prototype
- **Repository:** AWWV
- **Current Focus:** MVP declared; scope frozen

### Non-negotiables

1. **Path A Architecture:** Polygons are territorial micro-areas (`poly_id`), separate from settlement entities (`sid`). Polygons may link only via municipalities (`mid`). No forced 1:1 matching between polygons and settlements.
2. **Aggregate Row Filtering:** Any row containing "∑" in ANY cell must be excluded from settlement-level data. Aggregate rows are for validation only.
3. **Deterministic Builds:** All outputs must be deterministic — stable sorting, fixed precision (3 decimals for LOCAL_PIXELS_V2), canonical JSON key ordering, no timestamps.
4. **Empty GeoJSON is Valid:** Always emit valid GeoJSON even if features array is empty. Never skip writing GeoJSON when feature count is zero.
5. **Canvas Polygon Isolation:** Every polygon must use its own `beginPath()`, `moveTo()` for first vertex, and `closePath()` before fill/stroke. Never connect polygons across paths.
6. **Municipality Outline Handling:** Municipality outlines can be single polygons. Union operations must handle both single and multiple polygon cases. Use convex hull fallback when union is unreliable.
7. **Render-Valid Primary Gate:** Primary gate is render-valid (finite, non-zero area, non-self-intersecting/triangulatable). GIS-valid is diagnostic only. Use deterministic convex hull salvage when needed, but measure hull inflation.
8. **Settlement ID Uniqueness:** All `settlement_id` values must be globally unique. When duplicates are detected, generate deterministic remapped IDs and record remapping in an issues report.
9. **Napkin:** At session start, read `.agent/napkin.md`. Update it as you work.
10. **Append-Only History:** Ledger changelog is append-only. Do not rewrite old entries except in "Current state / Current phase" sections.

*(See PROJECT_LEDGER.md §Identity, §Non-negotiables.)*

### Current Phase

- **Phase:** Post-MVP — War engine (Peace/War two-phase lifecycle), full combat system active
- **Status:** MVP declared 2026-02-08. Scope open for calibration, realism, and UI work.
- **Focus:** Historical calibration (90.3% area w40, 13/13 anchors), equipment pipeline (scavenge+capture+smuggle+production), civilian casualty overhaul, reactive defense system (Layers A+B+C), operation preparation system, warroom UI, elite brigade loan system.
- **Key Systems Live (2026-03-15):** 120-step war pipeline, OSID combat, sector stances (5 types), distance-weighted reactive defense, operation preparation (5-phase), sector intel, strategic reserve, fog-of-war, displacement, supply reserves, officer system, army HQ reserve pool (elite loan), warroom cork board + OsidThumbnailRenderer, ArmyReservePanel. 618 vitest tests.
- **Calibration baseline:** n913 — 90.3% area-weighted, 13/13 anchors (Brcko FIXED). Equipment rework + civilian casualty overhaul. Previous: n703 89.6% (11/13), hash `10b74532c37cfaac`.

### Phase tracking & milestones

| Milestone | Date |
|-----------|------|
| Path A adopted | 2026-01-24 |
| Phase A1 Base Map STABLE | 2026-02-07 |
| MVP declared | 2026-02-08 |
| Phase II battle resolution engine | 2026-02-12 |
| AoR/ZoC removed | 2026-03-02/04 |
| Phase I/II terminology purged → Peace/War | 2026-03-07 |
| Reactive defense Layers A+B+C complete | 2026-03-13 |
| Operation Preparation System | 2026-03-12 |
| Commander-driven brigade assignment (n696) | 2026-03-14 |
| Army HQ Reserve Pool / Elite Loan System | 2026-03-15 |
| UI/UX Overhaul Phases 1–2 (NATO quantization, ghost line purge) | 2026-03-15 |

### Allowed / Disallowed Work

**Allowed:** Map rebuild pipeline (Path A), polygon extraction, settlement metadata, municipality outline derivation, inspection tools, geometry validation, crosswalk updates, napkin updates.

**Disallowed:** 1:1 polygon-to-settlement matching; treating aggregate rows (∑) as settlements; skipping GeoJSON when zero features; connecting canvas polygons across paths; GIS-valid as hard gate; duplicate settlement IDs; rewriting old changelog entries; modifying raw files in `data/source/` (read-only).

*(See PROJECT_LEDGER.md §Allowed / Disallowed Work.)*

### Decision registry (key decisions with rationale)

| Date | Decision | Rationale | Consequences | Theme |
|------|----------|-----------|--------------|-------|
| 2026-01-24 | Adopt Path A (polygons ≠ settlements) | Previous 1:1 matching failed; incompatible ID schemes | Clean separation; polygons for viz, settlements point+graph | architecture |
| 2026-01-24 | Always emit GeoJSON with zero features | Downstream tools expect consistent structure | Empty GeoJSON valid; pipeline consistency | implementation |
| 2026-01-24 | Filter aggregate rows (∑) from settlement data | Aggregate rows are validation-only | Prevents totals becoming entities | implementation |
| 2026-01-24 | Render-valid primary gate, GIS-valid diagnostic | GIS too strict, drops usable geometry | More geometry preserved | architecture |
| 2026-03-15 | Officer succession is player-choice for player faction | Player agency over commander assignments; bot factions auto-succeed | `available_until_turn` creates `replacement_suggested` event instead of auto-retiring; `findHistoricalSuccessor()` recommends replacement; `pending_officer_events` on MilitaryState; IPC pipeline for accept/acknowledge | design |
| 2026-03-15 | War crimes records are informational-only | Ethical transparency without gamification; no combat modifier from atrocity data | 27 officers annotated (VRS 13, ARBiH 7, HVO 7); `war_crimes_record` on NamedOfficer; UI badge (red=convicted, green=acquitted, amber=indicted) | design |
| 2026-03-15 | Map modes use continuous gradients (interpolate expressions) | Continuous gradients convey magnitude better than 3-tier match bucketing | Casualties + morale modes use MapLibre `interpolate` expressions; removed broken `pressure` and redundant `density` modes | GUI |
| 2026-03-15 | Bottom strip is single unified bar (merged MapModeToolbar + BottomStatusStrip) | Reduces visual clutter; territory % now area-weighted km² | Layout: [Map Mode Pills] \| [Territory %] \| [Layer Toggles]; z-20; MapModeToolbar not rendered separately | GUI |

## 10. Sectors & Operations

1. **[2026-03-12] consolidateCrossCorpsFronts can steal correct corps territory (n624 gotcha)**
   Do instead: Step 3b majority-count consolidation finds connected components of front edges across corps boundaries and assigns minority-corps edges to the majority. Without osidToCorps protection, a corps with a larger connected front absorbs a smaller correct corps's territory — even when `mapOsidsToCorps` home-seed BFS correctly assigned it. Two protections required: (1) brigade presence at OSID, (2) `osidToCorps` mapping match. The BFS home-seed mapping is the authoritative source for corps territory — consolidation must not override it.
2. **[2026-03-06] Maneuver-only execution turns are not dead execution**
   Do instead: In combat-causality diagnostics, do not flag `execution_without_attack_orders` when execution-phase operation participants emitted movement orders. Operation-owned brigades can be healthy while still closing on the current objective.
2. **[2026-03-06] Planning phase must include movement into position**
   Do instead: Treat planning as the period where operation-owned brigades move toward staging and first-objective approach positions. Do not model planning as a passive timer detached from maneuver.
3. **[2026-03-06] Fixed-duration planning creates dead weeks after staging**
   Do instead: Let `sector_attack` transition from `planning` to `execution` once at least one full planning turn has elapsed and all active participants have reached `staging_osid` or friendly objective-approach positions. Do not keep an operation in planning just because the nominal duration has not expired.
4. **[2026-03-06] Live sector rearrangement is allowed when scenario-gated**
   Do instead: Keep sector rearrangement in live corps AI only when full-run combat-causality evidence stays green. Unit tests alone are not enough; use 40-week scenario acceptance as the runtime gate.
5. **[2026-03-06] Quiet weeks are not the same as broken combat causality**
   Do instead: Weekly `zero_battles` should invalidate only when attack orders were issued and still produced no battles. Quiet weeks with no attacks and no invalid operations remain warnings, visible under `battleless_weeks`.
6. **[2026-03-06] Good map fit is not proof of healthy combat**
   Do instead: Read `behavioral_health` before `historical_fit`, then explain `control_change_attribution`. A better-looking map is not a valid success signal if the combat-health layer regressed.
7. **[2026-03-06] `CALIBRATION_MASTER.md` is the control file for resumed tuning**
   Do instead: Treat calibration changes as gated work. Read the master file first, update it during the session, and do not resume historical shaping unless the combat-causality gate is green.
8. **[2026-03-18] Operations are corps-level — brigades from entire corps pool**
   Do instead: Operations launch from `generateCorpsDirectives` via `evaluateCorpsOffensiveLaunch`. Corps-wide brigade pool: all active subordinates with pers≥400, not disrupted, sorted by equipment priority. Contiguity seeded from ALL corps sectors' friendly OSIDs. `MAX_PARTICIPATING_BRIGADES=12`. Old catalog-based `generateCorpsOperationOrders` disabled. Probes remain sector-scoped (small recon actions). Per-sector cluster expansion and `computeReinforcementPool` REMOVED (n915).
9. **[2026-03-08] Player operations support multi-axis advance with per-axis staging**
   Do instead: OpsPlanningModal exposes the engine's existing `CorpsOperation.axes` system to the player. Each axis has independent brigade assignment, ordered objective chain, and optional staging OSID. Single-axis operations omit the `axes` payload for backward compatibility. IPC: `stage-corps-operation-order` in `electron-main.cjs`. Force-ratio preview aggregates enemy formations per objective OSID for planning intelligence.
10. **[2026-03-08] Frontline attrition uses corps_front_sectors, not legacy brigade_front_assignment**
   Do instead: Build `brigadeSector` lookup from `sector.assigned_brigade_ids` across `state.corps_front_sectors`. A brigade takes passive attrition if it appears in any sector's assigned list (location-validated by `classifyBrigadesByTerritory()`). Reserves exempt. Density from `sector.assigned_brigade_ids.length / sector.length_edges`. `isColdFront()` uses structured `CorpsFrontSector` data (faction, opposing_factions, sub_segments) — no legacy front_id string parsing. Key design decision: `assigned_brigade_ids` (all brigades in sector territory) not `sub_segments[].friendly_osids` (border-adjacent only — too narrow, dropped casualties ~50%). n366 = 88.2%.
11. **[2026-03-08] Sector classification: front/reserve/deep-rear three-tier system**
   Do instead: `classifyBrigadesByTerritory` assigns brigades by three tiers: (1) front — on `sub_segments.friendly_osids`, (2) reserve — 1 hop behind front, (3) deep rear — BFS to nearest own-corps sector front (assigned, not reserve). Never use full `territory_osids` Voronoi depth for sector assignment. Deep rear brigades get column march orders to their sector front via sector march rule (before home defense check). Paper-transfer (BFS steal from surplus sectors) removed — only physical movement.
12. **[2026-03-08] Column march stance: always include `stance: 'column'` in merged orders**
   Do instead: Movement merge in `generateBrigadeOrders` must set `stance: 'column'` on column march entries. `processOsidColumnMovement` gates on `order.stance === 'column'` — missing stance silently drops all marches.
13. **[2026-03-08] Corps HQ is organizational — not rendered on map**
   Do instead: `corps_asset`, `army_hq`, and `corps` formations filtered from `buildFormationsGeoJSON`. These are command abstractions, not physical map units.

14. **[2026-03-09] Idle stall threshold must account for pipeline phase ordering**
   Do instead: `advance-sector-offensives` runs before `bot-brigade-orders` in the turn pipeline. The first execution turn always has zero attacks and zero movement logged. Idle stall detection must use `>= 2` idle turns (not `>= 1`) before declaring an operation stalled. Apply this threshold in both `updateMultiAxisResults` and `updateLegacyFlatResults` paths. Failure limits: `MAX_TOTAL_FAILURES=5`, `MAX_CONSECUTIVE_FAILURES_ON_CURRENT=3`.
15. **[2026-03-09] Operation `min_attack_outcome` overrides probe threshold**
   Do instead: `PrePlannedOp` and `CorpsOperation` can specify `min_attack_outcome` to override `getSectorOffensiveProbeThreshold()`. Bot AI checks `activeOp.min_attack_outcome` first, then falls back to momentum-based thresholds. Use for operations that must attack even at unfavorable predicted outcomes (e.g., Op Teocak with `min_attack_outcome: 'repulsed'`).
16. **[2026-03-10] Cross-corps sector assignment is forbidden**
   Do instead: In `classifyBrigadesByTerritory()`, only assign a brigade to sectors owned by its resolved corps. Do not keep "physically on another corps front" or "territory match without corps restriction" fallbacks. The last-resort nearest-front BFS must also filter to same-corps sectors.
17. **[2026-03-14] Commander competence gates deliberate assignment; personality shapes what he optimizes for; pre-op staging connects op planning to brigade placement ahead of execution**
   Competence (normalized from 1–5 scale) acts as a gate: below 0.35, the commander doesn't deliberately plan and falls back to BFS. Above the threshold, aggressiveness (0–1) shapes the objective: aggressive (≥ 0.6) concentrates at highest threat-ratio sector; defensive (≤ 0.4) fills thinnest gap; balanced falls through to BFS. The pre-op staging weight (1.5× intel_gathering, 3.0× force_staging+) links `CorpsOperation.preparation_sub_phase` to brigade pull — brigades begin shifting toward the operational sector during preparation, not just execution. This is also why `priority_sector_id` on `CorpsDirective` (not `CorpsCommandState`) is the correct source: it's the directive, not raw command state.

| 2026-03-08 | Entrenchment reduces passive frontline attrition | Entrenched brigades suffer less sniping/shelling/bombardment — sqrt diminishing returns, floor 0.40 | Reduces total passive casualties ~25-60% for long-entrenched units; affects calibration | combat |
| 2026-01-24 | Municipality outlines can be single polygons | Union must handle single and multi | No rejection of valid single-polygon munis | architecture |
| 2026-01-24 | Convex hull fallback when union fails | Union unreliable for some geometries | Deterministic fallback + inflation reporting | architecture |
| 2026-01-24 | Measure hull inflation when using hull salvage | Convex hull can distort shapes | High-inflation flagged in metadata | architecture |
| 2026-01-24 | SVG ids as opaque geometry handles | SVG and Excel use different ID schemes | Explicit crosswalk; no silent mismatches | architecture |
| 2026-01-24 | Municipality borders from drzava.js | Union on micro-polygons fails; drzava has pre-authored shapes | Bypasses union; reliable border rendering | architecture |
| 2026-02-08 | MVP declared; scope frozen | Phase 6 complete; all gates green | Post-MVP in Phase 7 | process |
| 2026-02-09 | OOB primary sources: oob_brigades.json, oob_corps.json | Single canonical source for game and tools | Markdown/knowledge docs reference only | implementation |
| 2026-02-11 | Scenario init_control default → hybrid_1992 when init_control present | Avoid silent institutional default; settlement-majority by default | apr1992_phase_ii_4w and similar use hybrid unless overridden | implementation |
| 2026-02-11 | Phase I disable_phase_i_control_flip = military-action-only (not strict zero-flip) | Formation-led control pressure; militia-threshold path disabled | No-flip scenarios can still show control changes from military-action branch | implementation |
| 2026-02-11 | No-flip GO only for player_choice; ethnic/hybrid NO-GO | Calibration evidence: player_choice benefits; ethnic/hybrid 30w worse than default | Canonical no-flip scenario: player_choice_recruitment_no_flip_4w | process |
| 2026-02-11 | Phase II hard then dynamic brigade frontage cap | AoR ownership unchanged; combat power capped per brigade; urban fortress for large-urban muns | getBrigadeOperationalCoverageSettlements; BRIGADE_OPERATIONAL_AOR_HARD_CAP; large_urban_mun_data | architecture |
| 2026-02-11 | Ensure "every (faction, mun) has a brigade" only for brigade-home muns | Prevent 200+ settlement AoRs (e.g. 803rd Light); formation tags mun:* | homeMunsByFaction; ensure step assigns only when mun is brigade home | implementation |
| 2026-02-11 | MAX_MUNICIPALITIES_PER_BRIGADE = 8 in ensure step | Cap per-brigade municipality count in ensureBrigadeMunicipalityAssignment | First candidate below cap; no single brigade gets 200+ muns | implementation |
| 2026-02-12 | RBiH-aligned municipalities: nine muns always RBiH (control + spawn) | Bihać, Brčko, Gradačac, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša (added 2026-02-15); HVO subordinate to ARBiH | rbih_aligned_municipalities.ts; political_control_init, militia_emergence, control_flip, build_political_control_data | implementation |
| 2026-02-12 | Phase II combat: battle resolution engine (terrain, casualty_ledger, snap events) | Replace fixed 40/60 garrison combat with multi-factor engagements | battle_resolution.ts; casualty_ledger in GameState; terrain_scalars | implementation |
| 2026-02-12 | RBiH–HRHB gate in Phase II resolve_attack_orders | Block RBiH↔HRHB flips/casualties before rbih_hrhb_war_earliest_turn | Same gate as Phase I control_flip and alliance_update | implementation |
| 2026-02-13 | casualty_ledger in GAMESTATE_TOP_LEVEL_KEYS | Persist battle casualties in saves and Latest run | Serialization allowlist; 20w+ Phase II runs succeed | implementation |
| 2026-02-16 | April 1992 scenarios: hybrid_1992 + init_control apr1992 (canon) | ethnic_1991 is ahistorical for spring 1992; curated municipal file gives correct faction assignments | All 11 Apr 1992 scenario JSONs use hybrid_1992; Systems Manual implementation-note updated | implementation |
| 2026-02-16 | Tactical map embedded in warroom (iframe), faction fog-of-war | Single-window UX; player sees only own formations on canvas | awwv://warroom/tactical-map/* same-origin; buildFormationPositionGroups/drawOrderArrows filter by player_faction | implementation |
| 2026-02-16 | Phase II tuning: ongoing mandatory recruitment retry + recruitment-before-reinforcement + RS-scoped fast cleanup + RBiH-aligned ilijas/vogosca | Mandatory brigades skipped at setup were not retried in ongoing pass; reinforcement consumed pool before recruitment checks; Prijedor/Banja Luka fast-cleanup bonus was being applied cross-faction; user requested HRHB-RBiH exception expansion | `runOngoingRecruitment` includes mandatory brigades; `phase-ii-recruitment` runs before `phase-ii-brigade-reinforcement`; fast-cleanup municipalities are faction-scoped (RS only); RBiH-aligned municipality exceptions include Ilijaš and Vogošća | implementation |
| 2026-02-16 | RS Phase II mandatory recruitment bottleneck tuning | RS mandatory brigades stalled because home-municipality pools remained below mandatory floor during ongoing turns | Added deterministic RS-only mandatory mobilization accrual budget in ongoing recruitment and capped mandatory attempts per faction per turn; 16w validation improved RS brigades delta from +0 to +2 (`PROJECT_LEDGER.md` 2026-02-16) | implementation |
| 2026-02-24 | OSID-vs-SID key mismatch fix + force growth calibration | After OSID-as-base-layer migration, political_controllers is OSID-keyed but lookup functions still used canonical SID keys → zero formations spawned, zero ongoing mobilization | Two-pronged fix: (A) OSID→mun map rebuild in scenario_runner.ts; (B) OSID-prefix fallback in getMunicipalityController across 4 files. Calibrated through 6 runs: RBiH 144K, RS 101K, HRHB 50K (all within ±10% of historical). Key lesson: after any key-space migration, grep all `political_controllers[` lookups | implementation |

| 2026-03-08 | Audit remediation 5-phase execution | Paradox State of Game + N412 Deep Dive identified frozen fronts, supply collapse, determinism risk, mega-files, stale terminology | 5 phases: (1) determinism sort hardening, (2) frozen front cascade fix (concentration bonus, entrenchment degradation, aggression floor), (3) supply/morale balance (MAINTENANCE_DRAIN 0.045→0.035, critical morale penalty), (4) code health (displacement dedup, supply assertions), (5) terminology sweep + mega-file splitting + outcomeRank unification. n403 86.9% → n415 89.4%. Key lesson: frozen front cascades are self-reinforcing — must break at multiple points simultaneously; supply drain must match OOB growth; inline constant duplication causes scale drift | implementation |

17. **[2026-03-14] `isCaseBBridge()` — directional angle check for Case B pocket wrap-arounds (n694)**
    Case B edge adjacency (same hostile OSID, different friendly OSIDs) can create wrap-around sectors when the two friendly OSIDs face *opposite* directions from the shared hostile OSID — i.e., they're on opposite sides of an enemy pocket. Distance thresholds can't catch this because the triple junction is geometrically real (0m contact). Fix: compute bearing vectors H→fi and H→fj using OSID centroids; reject Case B when the angle between them exceeds 165°. Requires centroid data (`OsidCentroidMap`) preloaded from `operational_contact_graph.json`. Wired into both `buildEdgeAdjacency` and `buildEdgeAdjacencyStrictCaseB`. *Design note:* this catch requires spatial data (centroids); purely topological rules cannot distinguish legitimate vs wrap-around Case B connections.

18. **[2026-03-14] `consolidateIsolatedCorpsPockets` must check home-brigade presence before reassignment (n694)**
    Step 3c unconditionally swaps isolated sector pockets to the majority-neighbor corps. This breaks defended pockets — a brigade physically stationed in a disconnected corps front should keep its corps assignment even though the majority of surrounding front belongs to another corps. Guard: skip reassignment if any brigade of the correct corps has `location_osid` inside the pocket's front OSIDs. A defended position is not an isolated pocket — it's an enclave or salient.

19. **[2026-03-14] `reclassifyRearBrigades` reserve cap must NOT silently drop non-winning candidates (n695)**
    The reserve competition selects the strongest 1-hop-behind-front brigade per sector (cap = 1). Non-winning candidates must be returned to `assigned_brigade_ids` — they are valid assigned brigades, just not the reserve. Before n695, non-winners were stripped from all lists, causing them to appear as "sectorless" in diagnostics despite being reachable. Pattern: whenever a competition has cap < candidates, always return losers to their source collection.

*(See PROJECT_LEDGER.md §Decisions and changelog for full list.)*

---

## 2. Architecture & Systems Knowledge Base

**How to use:** Understand Path A, geometry contract, outline modes, and why certain approaches were chosen or abandoned. Link to ledger entries for dates.

### Path A Contract (current)

- **Polygons** (`poly_id`): Territorial micro-areas from SVG. Linked to municipalities via `mun_code` → `mid` crosswalk. NOT linked directly to settlements.
- **Settlements** (`sid`): Simulation entities from Excel. Point+graph entities, linked to municipalities via `mid`. NOT polygon entities.
- **Municipalities** (`mid`): Pre-1991 municipality IDs. Polygons and settlements both link via mid, not to each other.

*(See PROJECT_LEDGER.md §Geometry Contract (Path A).)*

### Path A Contract Evolution

### Sector Operations & Combat-Causality Rules (2026-03-05)

- `sector_attack` lifecycle has a single owner: `src/sim/combat/sector_offensive.ts`. The generic corps-layer timer in `src/sim/combat/corps_command.ts` must not advance `sector_attack`, or operations will enter/leave `execution` on the wrong schedule.
- When debugging opening operations, distinguish:
  - phase-timing bugs
  - staging/path bugs
  - execution-without-orders bugs
  - attack-without-battle bugs
- Repeated execution turns with no objective attempt are not harmless idle time. They are operation failure and should consume the same failure budget as a failed assault so the AI can skip/end bad ops instead of hanging forever.
- Calibration interpretation rule:
  - `n109` demonstrated that restoring full-run combat volume alone is not enough if invalid execution windows explode.
  - `n110` showed the better shape: keep live combat, but also collapse hanging execution windows back down before discussing scenario quality.

- **2026-01-24:** Path A adopted; outline modes (mid / mun_code / national) clarified; drzava.js chosen for municipality borders to avoid union failures.
- **2026-01-25:** Inferred municipality borders permitted from settlement-derived outlines; determinism + invariants audit; municipality boundaries from polygon fabric adjacency (no union).
- **2026-01-26–27:** Phase 0/1 settlement substrate; adjacency and contact graph; SVG-derived substrate becomes canonical.
- **2026-02-07:** A1 base map STABLE; WGS84 Voronoi; canonical non-SVG settlements + 1990 municipality boundaries; bih_adm3_1990.geojson canonical for 1990 boundaries.

*(See PROJECT_LEDGER.md entries 2026-01-24 through 2026-02-07.)*

### Outline Modes

| Mode | Crosswalk present | Outlines file | Meaning |
|------|-------------------|---------------|---------|
| mid | yes | municipality_outline*.geojson | pre-1991 opštine borders |
| mun_code | no | mun_code_outline.geojson | map-pack partitions (inspection-only) |
| national | no | national_outline.geojson | BiH border only |

**Mode "mid":** Requires `data/source/mun_code_crosswalk.csv`; produces outlines keyed by pre-1991 `mid`.  
**Mode "mun_code":** Fallback when crosswalk missing; inspection only.  
**Mode "national":** Always produced; union of all polygons.

**Missing crosswalk:** Polygons have `mid = null`; mun_code outlines for inspection; national outline always created; settlement points in deterministic grid (synthetic).

*(See PROJECT_LEDGER.md §Geometry Contract.)*

### Geometry System Patterns

**Working:**

- Municipality borders from drzava.js (bypasses unreliable union).
- Convex hull fallback with hull inflation measurement when union fails.
- Settlement adjacency from shared-edge cancellation / boundary detection (Phase 1 canonical).
- Allocating Voronoi cells by stable order and subtracting prior masks to remove large overlaps (napkin).
- Area-based coverage diagnostics to avoid boolean failure noise (napkin).

**Failed / avoid:**

- Union operations on micro-polygons for municipality outlines (unreliable).
- Simplify + turf fallback alone for Voronoi polyclip failures (napkin).
- Gap-based salvage that collapses most municipalities to single polygons (too destructive) (napkin).
- Chaikin smoothing on Voronoi edges (visible white gaps; polygons no longer abut) (napkin).

*(See PROJECT_LEDGER.md 2026-01-24–26; .agent/napkin.md Patterns That Work / Don't Work.)*

---

## 3. Implementation Knowledge Repository

**How to use:** Find proven patterns (map, simulation, data), failed experiments, and domain expertise. Update from napkin and ledger when new patterns emerge.

### Proven Patterns

**Map & visualization**

- War Planning Map: `#warroom-scene` and `#map-scene`; only one visible; `openWarPlanningMap` → scene-open then `map.show()`; closeCallback → `showWarroomScene()` (napkin).
- **Operational settlements (OSID):** As of 2026-02-22, **OSID is the canonical map unit** for simulation, rendering, and political control. **744 operational settlements** (was 753; 9 degenerate merged 2026-03-03; format `op:<mun>:<slug>`) from 5,823 canonical via 702 hand-curated merge groups in `data/source/merge_progress.json` + 51 singletons. Derive script: `scripts/derive_operational_settlements.ts`; outputs in `data/derived/operational/` (operational_settlements.geojson, canonical_to_operational_map.json, operational_contact_graph.json, operational_political_control.json, **operational_initial_master.json**). **After any OSID merge** run `npm run map:derive:operational-initial-master` so dev runner and political control init see 744 OSIDs (avoids "unknown settlement ids" at init). HoI map control layer: single merged mesh (global vertex table, per-vertex colors) for gap-free rendering. Report: 20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md; IMPLEMENTED_WORK_CONSOLIDATED §32.
- **HoI map 3D tilt and texture-on-terrain (2026-02-23):** Political control on HoI 2.5D map is no longer a floating polygon overlay; faction colors are rasterized onto a 2048×2048 texture and applied to the terrain mesh’s own geometry (same BufferGeometry → no gaps or terrain poke-through at any tilt). Ortho camera far plane 1000→100; overlay Y-offsets reduced; polygonOffset used for depth ordering; invisible control mesh retained for settlement hover/click raycasting. `t`/`T` adjust tilt (5°). Report: 20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md; IMPLEMENTED_WORK_CONSOLIDATED §35; PROJECT_LEDGER 2026-02-23.
- **HoI-style brigades + ZoC and Attack Resolution (2026-02-22):** Canon, data/state, engine, and bots/GUI phases implemented. One OSID per brigade; ZoC from deployed brigades; ZoC-lock (stay / retreat / attack only); control change only via attack resolution or corps ops; no single resolution flips more than one OSID. Attack resolution: formula spec (combat power, entrenchment, resilience, outcome bands, casualties, push-back); retreat tie-break: enemy-adjacency count asc then OSID sort. Pipeline: zoc-computation, zoc-constrained-movement, phase-ii-resolve-attack-orders (OSID path when operational data present). Bots: orders in OSID space; ZoC-lock behavior. Maps: brigade position from `location_osid` when set. See PROJECT_LEDGER.md 2026-02-22 "HoI-style brigades + ZoC and Attack Resolution Formula (full roadmap)"; design docs: 20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md, 20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md.
- Map viewer: derive `settlements_a1_viewer.geojson` from A1_BASE_MAP (role=settlement); use `getPoliticalControlKey()` for S-prefixed sid in political_control_data (napkin).
- WGS84 derivation: fallback to `data/_deprecated/derived/legacy_substrate/settlements_substrate.geojson` when derived path missing (napkin).
- Use `map:build:wgs84:from-geometry` when `settlements_wgs84_1990.geojson` exists (skips tessellation) (napkin).
- Split-muni merge: Voronoi loads from `data/derived/_audit/split_municipality_duplicate_settlements.json`; run `npm run map:audit:split-muni-duplicates` before full rebuild (napkin).
- Tactical map: canonical viewer for load-save and formations; `src/ui/map/`; `npm run dev:map` → http://localhost:3001/tactical_map.html. Required: settlements_a1_viewer.geojson, political_control_data.json (napkin).
- **GUI panel choreography (2026-03-07):** For map-side detail flows, do not stack competing overlays for settlement/sector/operation/formation detail. Use a right-side panel rail with horizontal drill-down: overview -> primary detail -> secondary detail sliding further right while preserving parent context. Keep panel precedence in a pure rail selector (`panelRail.ts`) and let `App.tsx` be the composition root that mounts only the active primary/secondary surfaces. Keep accordions inside a panel; use drill-right between panels. Report: `docs/40_reports/convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md`.
- **Settlement panel content (2026-03-07):** Right-panel settlement detail has 3 horizontal tabs (Overview | Military | Orders & events), same style as sector/operations. Overview: municipality, control, status, population (pre-war → current, Out/In/Lost, arrived by faction), “Fled from this settlement” by nation (Bosniaks/Serbs/Croats/Others), pre-war + current ethnic structure. Military: front sector, stationed formations (readiness/cohesion, click-through to Formation detail), militia pool. Orders & events: pending attack/move/reposition, recent control. Control tab removed. Spec: TACTICAL_MAP_SYSTEM §13.2; report: `docs/40_reports/implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md`.
- **Command briefing architecture (2026-03-07):** Put the high-level command briefing in `src/ui/map/App.tsx` as a thin orchestration layer, not inside `TopToolbar` and not buried in `SituationTab`. Feed it from a deterministic `commandBriefing` view-model in `GameStateAdapter.ts`, and let it route only into already-existing panels/modals during the information-hierarchy phase.
- **Warroom art pipeline (2026-03-07):** For the warroom, use one complete scene plate per faction and outline hotspots afterward. Do not rely on separate in-scene props or perspective sprites; scale and orientation drift break the illusion. Keep only flag, calendar, and ticker as separate runtime elements. Maintain stable camera/layout across faction variants so hotspot regions remain reusable. Report: `docs/40_reports/handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md`.
- **Warroom hotspot contract (2026-03-07):** Treat warroom hotspot ids as physical object anchors, not arbitrary action labels. Canonical room anchors: `desk_map`, `command_briefing_folio`, `newspaper_stack`, `intelligence_journal`, `diplomatic_telephone`, `desk_radio`, `wall_flag_area`, `wall_calendar_area`. Let `ClickableRegionManager.ts` route from those anchors, and keep old action strings only as compatibility fallback during transition.
- **Focused summary routing (2026-03-07):** Treat the summary modal as a command hub, not a dead-end overview. Route IVP, convoy, support, casualty, and OPSEC clicks into named summary sections from `TopToolbar.tsx` and `CommandBriefingLayer.tsx`, with `App.tsx` owning the summary-focus state. Keep operation routing separate via `OperationDetail` / `OperationsPanel`.
- **Staff Map and settlement borders (2026-02-17):** 4th zoom layer — press `4`, drag rectangle (≥5 settlements) to open procedural paper-map overlay at 8× (parchment, terrain hatching, serif labels, full-detail formation counters); separate overlay canvas, 10-pass pipeline, deterministic (detHash). Main map draws settlement polygon fills only; inter-settlement border strokes removed. IMPLEMENTED_WORK_CONSOLIDATED §17; TACTICAL_MAP_SYSTEM §2, §7–§9, §12. **Staff Map 12 visual enhancements (2026-02-17):** Faction stripe on counters, barbed-wire front lines, AoR crosshatch fill, contour lines, river labels, fold creases, contested-zone pencil hatch, coffee stain, margin annotations, irregular vignette, faction crests at top center, exit button top-left. IMPLEMENTED_WORK_CONSOLIDATED §18. **Staff Map crest stamp and war map barbed-wire (2026-02-17):** Staff map shows single player-faction crest as faded ink stamp (top-left); main war map front lines use barbed-wire (3-pass: glow + Bézier + barbs); detHash shared in constants.ts. IMPLEMENTED_WORK_CONSOLIDATED §19. **War map enhanced formation markers (2026-02-17):** drawNatoFormationMarker(FormationView, zoomLevel); readiness inner glow; strength numbers (formatStrength) / ×N for corps; name labels at tactical zoom; AABB hit-test; ResizeObserver canvas resize; formation dimming (war + staff). IMPLEMENTED_WORK_CONSOLIDATED §20. **Front line defended/undefended (2026-02-17):** Defended segment = at least one adjacent settlement in brigade AoR; defended = solid + barbed wire, undefended = dashed + reddish glow, no barbs. AoR crosshatch: black when Control layer ON, white when OFF. IMPLEMENTED_WORK_CONSOLIDATED §21. **War map labels and AoR cleanup (2026-02-17):** Labels URBAN_CENTER+TOWN only, always on; Labels and Brigade AoR toggles removed; AoR highlight automatic when formation selected; crosshatch density increased (spacing 5, width 1.5, alpha 0.55). IMPLEMENTED_WORK_CONSOLIDATED §22. **Dual defensive arc front lines (2026-02-17):** Front lines replaced with paired faction-colored defensive arc symbols on each side of settlement borders; arcs only where brigade AoR covers at least one adjacent settlement; barb ticks toward enemy; SIDE_RGB; old single-line/defended-undefended system removed. IMPLEMENTED_WORK_CONSOLIDATED §24.
- Start-control hardening: no-null invariant in `prepareNewGameState`; deterministic null coercion (municipality majority → neighbor majority → RBiH fallback) (napkin).
- **Canvas blend mode by background luminosity (2026-02-18):** When compositing a hillshade terrain layer onto a canvas, use `multiply` for light/parchment backgrounds (Staff Map `#f4e8c8`, opacity 0.22) and `overlay` for dark backgrounds (Main Map `#0d0d1a`, opacity 0.6). Multiply darkens correctly on light paper tones; overlay adds depth without washing out on dark tactical backgrounds. Wrong blend mode on wrong background produces flat or oversaturated results (dark-green `#2a3a28` experiment confirmed unsatisfactory and reverted).
- **Pre-projected terrain PNG alignment (2026-02-18):** To align a pre-rendered terrain PNG (e.g. GDAL hillshade) pixel-perfectly to a canvas map: store the DEM geographic bbox (minLon, minLat, maxLon, maxLat), project all four corners via `rc.project()` to canvas pixel coordinates, then `drawImage(img, projMinX, projMinY, projMaxX - projMinX, projMaxY - projMinY)`. No resampling or separate tile pipeline required; accuracy depends only on the map projection function being consistent between render passes.

**Simulation & state**

- Smart-bot determinism: seeded RNG in BotManager; never `Math.random()` in bot logic; edge/formation traversal sorted before selection (napkin).
- **Faction AI all phases (2026-02-18):** Phase 0 bot runs in headless pipeline (investments + relationship init); Phase 0 faction-specific strategies (RS paramilitary-first, RBiH TO-first, HRHB police/party) and alliance-aware coordination; Phase I bot posture (hold/probe/push) in bot_phase_i.ts; Phase II expanded operations catalog, defensive OGs, emergency defensive ops, inter-corps coordination, dynamic elastic defense. Report: FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md; IMPLEMENTED_WORK_CONSOLIDATED §25; Phase II Spec §12, Systems Manual §6.5 (ledger 2026-02-18).
- Time-adaptive bots: optional `scenario_start_week`; deterministic week-based aggression taper; keep objective-edge planned-ops floor (napkin).
- Victory evaluation: end-of-run only (`run_summary.json` + `end_report.md`); no change to turn mechanics (napkin).
- Formation spawn: MIN_BRIGADE_SPAWN 800; new brigade at 800; phase-i-brigade-reinforcement to 2500; second brigade when pool ≥ 800. Authority: consolidated/contested/fragmented; fragmented → no spawn (napkin).
- Phase I displacement: on control flip when Hostile_Population_Share > 0.30; applyPhaseIDisplacementFromFlips; same routing/killed/fled-abroad as Phase II (napkin).
- Brigade AoR at Phase II: phase-ii-aor-init populates from political_controllers + formation home muns; `ensureFormationHomeMunsInFactionAoR` (napkin).
- **Brigade Operations canon (2026-02-10):** Implementation reference: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md`. Canon was updated additively (Phase II Spec §4.3, §5, §7.1, §12; Systems Manual §2.1, §6.1–§6.4, §7, System 3/8, Appendix A; Engine Invariants §13.3, §14; Phase I §4.3.6). No existing canon text removed.
- **Recruitment system canon (2026-02-11):** Implementation reference: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/recruitment_system_implementation_report.md`, design: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/recruitment_system_design_note.md`. Canon updated additively: Systems Manual §13 (brigade activation at Phase I entry, player_choice vs auto_oob); Phase I implementation-note (recruitment_mode); MILITIA_BRIGADE_FORMATION_DESIGN §10 (recruitment mode, emergent suppression), §9 (MAX_BRIGADE_PERSONNEL 3000, reinforcement rate limit); context.md and CANON.md refs; REPO_MAP recruitment_engine/recruitment_types. No existing canon text removed.
- **Deferred recruitment (2026-02-17):** Scenario flag `no_initial_brigade_formations` with `recruitment_mode: "player_choice"` creates corps/army_hq only at init; brigades appear via turn-based recruitment from turn 0. Same Phase 0→militia→pool path; AoR/corps init valid with zero brigades. IMPLEMENTED_WORK_CONSOLIDATED §14; Systems Manual §13, Phase II Spec, MILITIA_BRIGADE_FORMATION_DESIGN §10.
- **Phase 0→I JNA_status hand-off (2026-02-24):** Single transition point: applyPhase0ToPhaseITransition sets state.phase_i_jna (transition_begun = RS declared, withdrawal_progress 0, asset_transfer_rs 0) and meta.phase_0_end_turn, phase_1_start_turn, escalation_reason so both scenario runner and warroom paths receive the same hand-off at transition. Phase I reads state.phase_i_jna. CONSOLIDATED_IMPLEMENTED §43; PROJECT_LEDGER 2026-02-24; backlog/PHASE0_JNA_STATUS_HANDOFF_HOWTO.md.
- OOB primary sources: brigades = `data/source/oob_brigades.json`, corps = `data/source/oob_corps.json`; all tools/code canonical (napkin).
- Authority derivation for formation lifecycle: `deriveMunicipalityAuthorityMap(state)` in `src/state/formation_lifecycle.ts` maps consolidated=1, contested=0.5, fragmented=0.2 (sorted mun order); used by brigade activation gating through `update-formation-lifecycle`. Canonical implementation reference: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §8.1.1.
- Browser Phase II advance: `src/sim/run_phase_ii_browser.ts` provides warroom-safe advance (turn increment + AoR initialization when AoRs are empty) using shared Node-free helpers in `src/scenario/aor_init.ts`.
- B1 events framework: `src/sim/events/event_types.ts`, `event_registry.ts`, `evaluate_events.ts`; pipeline `evaluate-events` step emits deterministic `events_fired` (historical + seeded random, report-only).
- B4 coercion tracking (implementation extension): optional `coercion_pressure_by_municipality` in state reduces Phase I flip threshold in `src/sim/early_war/control_flip.ts` with deterministic bounds.
- Capability-weighted Phase I flip (implementation extension): Phase I control flip scales attacker strength and defender effectiveDefense by `getFactionCapabilityModifier` (System 10 / Appendix D). Pipeline step `phase-i-capability-update` runs before `phase-i-control-flip` so profiles are set by year. Doctrine keys deterministic (ATTACK for attacker, DEFEND/STATIC_DEFENSE for defender). See `docs/40_reports/backlog/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md` and ledger 2026-02-10 RBiH wipe-out fix.
- **Phase I no-flip policy (2026-02-11):** Final calibration from 12w/30w matrix, 3x3 knob grid, and attack-scale sweep. Ethnic/hybrid: NO-GO for `disable_phase_i_control_flip` (default militia-pressure remains canonical). Player_choice: GO for recruitment-centric scenarios (RS 2834 vs 3329 at 30w). Knobs (attack_scale, stability_buffer_factor) apply only when no-flip enabled; player_choice invariant across tested range. See `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md`.
- **RBiH-aligned municipalities (2026-02-12, Velika Kladuša 2026-02-15):** Single source `src/state/rbih_aligned_municipalities.ts` (Bihać, Brčko, Gradačac, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša). Applied in political_control_init (all init paths), militia_emergence (HRHB strength → RBiH), control_flip (flip winner HRHB → RBiH override), build_political_control_data (MUN_NORMALIZATIONS). Control and spawns always RBiH there (napkin).
- **Phase II battle resolution (2026-02-12):** `src/sim/combat/battle_resolution.ts`; terrain scalars, casualty_ledger, multi-factor combat power, outcome thresholds; four snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade). Deterministic; sorted iteration; no RNG (napkin).
- **RS mandatory bottleneck control (2026-02-16):** For ongoing recruitment, apply a small deterministic RS-only manpower mobilization budget to pending mandatory brigade home municipalities before recruitment checks, and cap mandatory recruits per faction per turn to scenario/state max. This improves RS historical brigade activation without uncapped one-turn spikes (see `PROJECT_LEDGER.md` 2026-02-16).
- **OSID-vs-SID key mismatch pattern (2026-02-24):** After the OSID-as-base-layer migration, `political_controllers` uses OSID keys (format `op:<mun>:<slug>`) but many functions still iterate SID-keyed maps (canonical `S`-prefixed IDs) and check `pc[sid]` — returning `undefined` for every lookup. **Detection:** Any function that looks up `state.political_controllers[sid]` where `sid` is a canonical settlement ID will silently fail when controllers are OSID-keyed. The first key in `Object.keys(state.political_controllers)` starting with `op:` confirms OSID-keyed state. **Fix pattern:** (A) Rebuild the SID→mun map as OSID→mun using `buildOsidToMunFromReverseMap()` (converts the iteration keys); (B) Add OSID-prefix fallback in controller lookup: when SID lookup fails and `munId` is known, scan `op:<munId>:*` keys in sorted order to find controller (the municipality is encoded in the OSID key itself). **Affected systems (fixed 2026-02-24):** `factionHasPresenceInMun` (oob_phase_i_entry.ts), `getMunicipalityController` (pool_population.ts, minority_militia_decay.ts, control_strain.ts), scenario_runner.ts sidToMun rebuild. **Lesson:** After any key-space migration (SID→OSID, canonical→operational), grep for all `political_controllers[` lookups and verify key format compatibility. See `PROJECT_LEDGER.md` 2026-02-24.
- **Force growth calibration (2026-02-24):** Historical first-year force trajectories: RBiH ~60-80K → 130K (Apr 92 → Apr 93), RS ~80K → 110K, HVO ~30K → 50K. Calibrated via 6 iterative 52w scenario runs. Key parameters: `BASE_MOBILIZATION_RATE=0.003`, faction scales RBiH=1.1 / RS=0.15 / HRHB=1.2, surge curve 3.0/2.2/1.4/0.9/0.5/0.3 (weeks 1-12/13-26/27-52/53-78/79-104/105+), `RS_JNA_INHERITANCE_BONUS=30K`, `REINFORCEMENT_RATE=400`, exhaustion threshold 20%/hard cap 35%. RS low scale (0.15) is correct because VRS was already near full mobilization from JNA handover; RS controls largest territory with highest ethnic majority, so most eligible Serbs were mobilized by May 1992. See `PROJECT_LEDGER.md` 2026-02-24.
- **Bottom-up pipeline in phase_ii (2026-02-28):** When `recruitment_mode === 'bottom_up'`, the turn pipeline must run Phase I bottom-up steps (militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations) even when `meta.phase === 'phase_ii'`. Implemented in turn_pipeline.ts; canon: Engine Invariants §14.10. Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **40w calibration baseline (2026-02-28):** apr1992_definitive_40w uses `recruitment_mode: "player_choice"` so brigades spread to front OSIDs and generate attack orders; bottom_up is not used for this scenario. n246 baseline: RS=406, RBiH=265, HRHB=82; all 6 benchmarks pass. Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **Attack share step function (2026-02-28):** Corps attack_slots = max(1, floor(N × share)); tuning within a step can have zero effect. Document step thresholds when tuning bot doctrine; see BOT_AI_HOLISTIC_TUNING_REFERENCE.md and Phase G report.
- **Brigade operational cap (2026-02-11):** Hard then dynamic cap per brigade; `getBrigadeOperationalCoverageSettlements`; urban fortress for large-urban muns (≥60k 1991) via `large_urban_mun_data.ts`; UI and sim share `src/state/brigade_operational_cap.ts`. MAX_MUNICIPALITIES_PER_BRIGADE (8) in ensure step (2026-02-13) (napkin).
- **Brigade AoR overhaul (2026-02-14):** Corps-directed assignment when `state.corps_command` present: partition front into corps sectors, allocate brigades along each sector's frontline (home mun + up to 2 contiguous neighbors), derive settlement AoR, enforce contiguity (repair, orphan reassignment). Contiguity is a hard invariant; rebalance shed uses `wouldRemainContiguous` guard. Legacy Voronoi BFS when no corps (Phase I / tests). Tactical map AoR highlight: compound fill (evenodd), outer boundary only, breathing glow. Report: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md`; canon: Phase II §7.1, Systems Manual §2.1/§8, TACTICAL_MAP_SYSTEM Pass 6.
- **Phase I no-flip semantics (2026-02-13):** `disable_phase_i_control_flip` = military-action-only (militia-pressure path disabled; formation-led flips still possible). Scenario names with no_flip do not imply strict zero control changes (napkin).
- **Scenario harness diagnostics (2026-02-13):** `run_summary.json` includes `phase_ii_attack_resolution` (weeks_with_phase_ii, orders_processed, flips_applied, casualty_attacker/defender); end_report section "Phase II attack resolution (pipeline)" for diagnosing 0-flip Phase II outcomes (napkin).
- **Front system rebuild (2026-02-21):** assignable_front_segments, brigade_front_assignment (reserve rule), theatres, army_theatre_assignment; GUI assign-to-front and naming IPC; 2D/3D single source. TACTICAL_MAP_SYSTEM §10.4, §21.3; DESKTOP_GUI_IPC_CONTRACT state contract. IMPLEMENTED_WORK_CONSOLIDATED §28.
- **Headless corps fronts and run_summary (2026-02-21):** Phase II pipeline step `ensure-derived-corps-front-edges` populates corps_front_edges in headless runs; run_summary includes `front_corps_tracking: { corps_front_edges_present, corps_count }` when Phase II ran. IMPLEMENTED_WORK_CONSOLIDATED §29; PROJECT_LEDGER 2026-02-21.
- **Clone centralization (2026-02-11):** Single `cloneGameState` in `src/state/clone.ts` used by all turn pipelines and browser runners; avoids six duplicate polyfills (napkin).
- **Displacement system complete (2026-03-01):** Per-OSID census displacement depth. Key mechanics: (1) `getOsidCensusPopulation()` and `getOsidCensusHostileShare()` read `population_total`, `population_bosniaks/serbs/croats/others` from operational settlement records; faction→ethnic: RBiH=bosniak+other, RS=serb, HRHB=croat. (2) Hostile share cap 0.95 per-OSID, 0.80 municipality fallback. (3) Operational settlements loaded separately in turn_pipeline via `loadSettlementGraph()` (OSID-keyed, `op:` prefix validated); passed as `osidSettlements` param. (4) Sustained pool: `cumulative_displaced = displacementAmount` after initial fire (prevents double-counting). (5) Ethnic map layer: `buildEthnicGeoJSON.ts` uses departure events + per-mun arrivals for OSID-level ethnic composition. Results: n319 668k displaced (RBiH 458k, HRHB 150k, RS 60k); Ljubija 5,331→13,399 (+151%). Report: `20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`. **Key lesson:** The SID-keyed raw graph (5822 entries) and OSID-keyed operational graph (753 entries) serve different purposes; displacement requires OSID-keyed graph for per-OSID census lookups.
- **Elite brigade spawning bypass (2026-03-15, n745):** Elite brigades (`is_elite: true`) must bypass both `factionHasPresenceInMun` and militia pool drain in `runBotRecruitment`. Rationale: (1) OOB mun slugs use underscores (`han_pijesak`) while `operational_settlements.geojson` uses no-underscore (`hanpijesak`) → presence check always fails; (2) municipality militia pools are sized from census × 0.28 × 0.25 — far smaller than elite initial_personnel (1200+). Fix: early-continue only when `!brigade.is_elite` for presence check; pool drain block skipped for `isElite === true`; `effectiveManpower = brigade.initial_personnel`. No pool key is deducted for elites (they represent national professional units, not local conscripts). See PROJECT_LEDGER.md 2026-03-15.
- **`getCorpsReferenceOsid` corps-formation early-return trap (2026-03-15, n745):** In `army_reserve_system.ts`, `formations[corpsId]` returns the corps HQ formation, which always has `location_osid=undefined` and `home_osid=undefined`. Any `if (corpsFormation) { return ...; }` pattern that wraps both `location_osid` and `home_osid` will return `null` immediately, preventing the brigade fallback scan from ever running. Pattern to follow: check if the formation's OSID is non-null before returning; fall through to brigade scan if null. This trap applies to any corps-level formation lookup that expects a geographic anchor. See PROJECT_LEDGER.md 2026-03-15.
- **Army HQ Reserve Pool — Elite Brigade Loan System (2026-03-15):** Elites permanently assigned to faction Main Staff HQ corps (`vrs_main_staff`, `arbih_general_staff`, `hvo_main_staff`). Per-turn lifecycle: (1) `generateArmyReserveRequests` — each non-main-staff corps generates up to one request per type (`offensive_support`/`defensive_gap`/`exploitation`); priority scored by `computeDeployPriority` (geographic feasibility: MAX_AUTO_DEPLOY_HOPS=8, 0–3 hops=1.0×, 4–6=0.6×, 7–8=0.3×, >8 rejected); (2) `evaluateArmyReserveAssignments` — bot factions auto-assign best-match elites, player faction's requests surface in `pending_reserve_requests` for ArmyReservePanel; (3) `tickEliteLoans` — forced recall on ≥30% casualties OR morale<35 OR ≥50% personnel degradation; voluntary recall after ELITE_LOAN_MIN_DURATION=6 turns when op ended and sector threat<1.5; 4-turn cooldown (`last_recall_turn`) between deployments. **Elite identification:** Runtime check for presence of `elite_loan_state` on `FormationState` (not the `is_elite` OOB flag — which is for initial placement only). **Loan routing:** Phase 0a `loanedCorpsMap` in `classifyBrigadesByTerritory` routes loaned brigades through the target corps for sector assignment — they fight as if belonging to that corps while on loan. **Episode tracker:** `EliteBrigadeTracker` on `MilitaryState.elite_brigade_tracker` records per-brigade episodes with deployment dates, casualties taken, reason for recall — enables Campaign History in the UI. **Player/bot split:** Bot factions use `auto_assign: true`; player faction always `auto_assign: false` regardless of bot status. **OOB corrections:** rs_1st_guards + rs_65th_protection → vrs_main_staff; hvo_1st/2nd/3rd_guard → hvo_main_staff (2nd+3rd `is_elite: true`); arbih_guards + arbih_120th_black_swans already in arbih_general_staff. Report: `docs/40_reports/implemented/20260315_ARMY_HQ_RESERVE_POOL_LOAN_SYSTEM.md`. See PROJECT_LEDGER.md 2026-03-15.

**Data & tooling**

- PowerShell: use `;` not `&&` for command chaining (napkin).
- Null-control tracing: MapApp → DataLoader → political_control_data.json → build_political_control_data.ts → prepareNewGameState → initializePoliticalControllers; fix at init/source (napkin).

*(See .agent/napkin.md Patterns That Work; PROJECT_LEDGER.md changelog for implementation entries.)*

### Failed Experiments & Lessons

**Enclave brigades in sector operations (2026-03-14):** Enclave-tagged brigades (`tags: ["enclave"]`) are blocked from *column marching* outside the enclave in `bot_brigade_eval_front.ts`, and from *uncontested occupation* of non-enclave OSIDs in `bot_brigade_eval_attack.ts`. But neither guard applies to *operation participation*: `evaluateSectorOffensiveLaunch` selects brigades from `sectorBrigadeIds` without checking enclave membership vs objectives. A sector that straddles an enclave boundary (e.g. Goražde + northern Foča) can create an operation with Goražde enclave brigades marching through a paper corridor to attack Foča. **Fix (n57):** Filter in `evaluateSectorOffensiveLaunch`: after objectives are determined, exclude any brigade tagged `enclave` whose `location_osid` is not in the same enclave as any objective (`isOsidInSameEnclave`). This organically implements "corridor-widening only" — besieged units can expand their enclave perimeter but not march to distant objectives. See `PROJECT_LEDGER.md` 2026-03-14 n57.

**Failed-objective cooldown pattern (2026-03-14 n58):** When a corps repeatedly assaults the same hardened objective across multiple operation cycles with no captures, use `CorpsCommandState.failed_offensive_objectives` (Record<osid, {failure_count, cooldown_until_turn}>) to suppress it from `offensiveTargets` for a cooldown window. Pattern: `recordFailedObjectives()` called at recovery completion for failed sector_attack ops; filter applied in `bot_corps_directives.ts` after hard-enforce avoidOsids block. Constants: `OBJECTIVE_FAILURE_THRESHOLD=2`, `OBJECTIVE_FAILURE_COOLDOWN_TURNS=8`. Threshold=2 (one probe, one full assault) before cooldown is historically appropriate — gives the corps commander a genuine learning window without requiring a single-failure abort. Cooldown=8 turns (~2 months) models operational reassessment. Unlike geographic `avoid_municipalities` rules, this is fully organic — the corps can retarget after the cooldown expires if conditions change. See `PROJECT_LEDGER.md` 2026-03-14 n58.

**Supply filter doesn't catch strained pockets (2026-03-14):** A supply filter at operation launch that blocks `critical` brigades is insufficient when the pocket has a paper corridor. If ANY chain of faction-controlled OSIDs connects the pocket to a supply source (even a single pixel-wide RBiH strip through Foča to Kalinovik to Sarajevo), the BFS classifies the OSIDs as `strained` not `critical`. The filter passes. Solution was the enclave tag filter above, not a supply state filter. The `critical` supply filter still has value for truly isolated pockets with no corridor at all. See `PROJECT_LEDGER.md` 2026-03-14 n56.

**Geometry / build**

- Voronoi boolean ops: normalization/simplify still left failures and patches → use post-merge coverage/overlap validation per mun1990 (napkin Corrections).
- Martinez polygon clipping: default import ESM error → use namespace import `* as martinez` (napkin).
- JSTS: package root has no index.js → import from `jsts/org/locationtech/jts/io/*.js` (napkin).
- Simplify + turf fallback: did not reduce polyclip failures (napkin).
- Chaikin smoothing on Voronoi: white gaps; reverted (napkin).

*(See .agent/napkin.md Corrections, Patterns That Don't Work.)*

### Domain Expertise

**Historical OOB & naming**

- Balkan Battlegrounds: VRS OOB in Appendix G (pp. 496–501); ARBiH/HVO from narrative and regional charts; vojska.net for HVO. Ingest: `npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode extract --page-start 401 --page-end 501` (napkin).
- OOB primary sources: oob_brigades.json, oob_corps.json canonical; markdown reference only (napkin).
- **OOB brigade list correction (2026-02-17):** oob_brigades.json was corrected to contain only true brigades; 25 non-brigade units (battalions, companies, rear bases, schools, logistics, etc.) were removed. Totals: 236 brigades, 195 mandatory at turn 0 (RBiH 116, RS 80, HRHB 40). See MILITIA_BRIGADE_FORMATION_DESIGN §10, formation-expert SKILL, PROJECT_LEDGER 2026-02-17.
- Formation names: OOB-loaded from oob_brigades.json; emergent spawn uses historicalNameLookup (faction, mun_id, ordinal) (napkin).
- Bosansko Petrovo Selo / Petrovo → home_mun **gracanica** (napkin).
- Novi Grad = Bosanski Novi (northwestern BiH, mun1990 bosanski_novi); Novi Grad Sarajevo = separate Sarajevo borough (novi_grad_sarajevo); do not conflate (napkin).
- Bosanski Novi: name change only (Novi Grad), not a split; exclude from split-muni audit (napkin).

**Scenarios & control**

- Phase 0: start_phase "phase_0"; phase_0_referendum_turn, phase_0_war_start_turn; do not populate AoR at init (napkin).
- Phase I start: start_phase "phase_i"; war_start_turn=0, referendum_held=true; e.g. apr1992_phase_i_to_apr1993_52w.json (napkin).
- Sept 1992: init_control as path to file with `settlements` array for settlement-level control (Sarajevo, Srebrenica, Sapna); spec: docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md (napkin).
- Displaced pool: flows split by source mun 1991 ethnicity into displaced_in_by_faction; killed + fled-abroad in displacement.ts (napkin).

**Environment & process**

- OneDrive file locks: census_rolled_up_wgs84.json, settlement_graph_wgs84.json, map_viewer/index.html — errno -4094; retry; pause sync if needed (napkin).
- docs/50_research: README_KNOWLEDGE_BASE.md indexes assets; PDF extract not reliably readable; use markdown/code or human extraction (napkin).
- External expert handover: docs/40_reports/handovers/EXTERNAL_EXPERT_HANDOVER.md; map-only GUI handover separate (napkin).
- Early docs implementation plan: docs/40_reports/backlog/IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md; Phase 7; Phase A implemented (bots, victory, production) (napkin).
- **803rd Light / brigade AoR cap (2026-02-11/13):** Ensure step assigns uncovered (faction, mun) only when mun is a brigade home (formation tags `mun:*`); MAX_MUNICIPALITIES_PER_BRIGADE (8) caps per-brigade mun count in that step. See docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md (napkin).
- **Scenario force calibration (2026-02-15):** April 1992 player-facing scenario calibrated via POOL_SCALE_FACTOR 55, organizational penetration (party 85, paramilitary 60), FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60), mandatory spawn minimum 200, scenario recruitment resources and desktop constants sync; population loader by_municipality_id fallback. Report: docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/SCENARIO_FORCE_CALIBRATION_2026_02_15.md; canon: Systems Manual §13, Phase I implementation-note, context.
- **Brigade strength after combat:** Battle resolution applies losses in-place; phase-ii-brigade-reinforcement runs after attack resolution. Final save can show brigades < 3000 personnel; tactical map shows f.personnel from state (napkin).
- **Orchestrator scenario-run handoff:** Run canonical scenarios (e.g. apr1992_phase_ii_4w, apr1992_4w, player_choice_recruitment_no_flip_4w), capture outDir/run_id and end_report paths, then create handoff doc (docs/40_reports/) for scenario-creator-runner-tester to check vs historical expected outcomes (napkin).
- **Implemented work single source (2026-02-15, expanded 2026-02-16):** All implementation report content is in docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md (sections 1–12). Section 10 = Warroom/Phase 0 and systems integration; §11 = Warroom restyle, Apr 1992 scenario fix, embedded tactical map, fog-of-war; §12 = deterministic org-pen initialization and Phase 0->I handoff alignment (A/B/C formula seeding). New reports in `docs/40_reports/implemented/`: `WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md`, `ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md`. Canon (Phase 0/I, Systems Manual, context, docs_index) and 40_reports indices reference these updates.
- **Design cross-impact analysis as prerequisite (2026-02-18):** Before implementing any system that is tightly coupled to another planned-but-not-yet-implemented system, produce a written cross-impact analysis identifying every field, modal, event, and data structure in the downstream system that will need updating when the upstream system lands. The 2026-02-18 AoR Redesign Study vs Warroom War-Phase Modals analysis found 11 specific changes — all additive — that must be made to warroom modals when brigade AoR redesign ships. Doing this analysis before implementation prevents rework, keeps design docs in sync, and surfaces architectural surprises early. Pattern: list upstream changes in a table with downstream location, what changes, and impact class (additive/breaking/optional).
- **Warroom war-phase modals report propagation (2026-02-21):** Report [WARROOM_WAR_PHASE_MODALS_2026_02_21.md](40_reports/implemented/WARROOM_WAR_PHASE_MODALS_2026_02_21.md) propagated as IMPLEMENTED_WORK_CONSOLIDATED §31; CONSOLIDATED_IMPLEMENTED, 40_reports README, context.md implementation references updated. Ledger 2026-02-21.

*(See .agent/napkin.md Domain Notes; PROJECT_LEDGER.md for detailed changelog.)*

---

## 4. Canon & Specifications Evolution

**How to use:** Current canon docs, version, and a log of specification changes. For full text see `docs/10_canon/`.

### Current canon documents

| Document | Version | Scope |
|----------|---------|--------|
| Game_Bible | v0_6_0 | Design philosophy, constraints, two-phase lifecycle |
| Rulebook | v0_6_0 | Player-facing rules, two-phase lifecycle |
| Engine_Invariants | v0_6_0 | Determinism and war/peace invariants |
| Phase_Specifications | v0_6_0 | Peace/War phase contract |
| Peace_Specification | v0_6_0 | Referendum and war-start contract in peace |
| War_Specification | v0_6_0 | Unified war mechanics (formerly Phase I/II scope) |
| Systems_Manual | v0_6_0 | Systems 1–11, Washington Agreement, state schema |

### Specification updates log

| Date | Specification | Change | Rationale |
|------|---------------|--------|-----------|
| 2026-02-10 | Canon set | v0.5.0 consolidation: full v0.3 + v0.4 + ledger; no deletions; Phase_II restored to canon | Restore comprehensive canon after v0.4 inheritance-only truncation |
| 2026-02-09 | Phase I §4.8 | Full rewrite: RBiH–HRHB relationship, alliance strain, mixed muns, Washington lock | Alliance redesign implementation |
| 2026-02-09 | Phase 0 | Link to Phase I §4.8 for RBiH–HRHB declaration | Consistency |
| 2026-02-09 | Systems Manual §10 | Washington preconditions W1–W6, post-Washington effects | Alliance lifecycle |
| 2026-02-09 | Engine Invariants §J | Milestones time-indexed / precondition-driven; Washington may set/lock alliance | Alliance lifecycle |
| 2026-02-10 | Phase I §4.3 / Systems Manual §11 | Added non-normative implementation-note entries documenting coercion-pressure extension tracking | Canon/implementation boundary clarity |
| 2026-02-10 | Phase II, Systems Manual, Engine Invariants, Phase I | Brigade Operations completion report incorporated into canon (additive only); pipeline, state, AoR, posture, corps, OGs, settlement-level resolution | Single implementation reference; canon reflects brigade ops implementation |
| 2026-02-13 | Phase II Spec §5, §12; Systems Manual §7, §7.4; context.md; CANON.md | Pipeline steps 12–14 (resolve-attack-orders, brigade-reinforcement, update-og-lifecycle); battle resolution (terrain, casualty_ledger, snap events) implemented; JNA/OG/bot AI stubs noted | Orchestrator absorption; canon reflects battle resolution and Phase II turn pipeline |

*(See PROJECT_LEDGER.md 2026-02-09 canon update; RBiH_HRHB_ALLIANCE_REDESIGN_DESIGN.md; 2026-02-13 ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md.)*

### Known canon/spec gaps (comprehensive review 2026-02-23)

Identified via Orchestrator comprehensive review convene ([ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](40_reports/convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md)):

- **Phase 0→I JNA_status contract gap:** Phase 0 §7/§8 do not list JNA_status (transition_begun, withdrawal_progress, asset_transfer_RS); Phase I §3 expects it. Action: extend Phase 0 output contract. **Closed 2026-02-24:** Phase 0 §7.7 and §8 already included JNA_status; implementation now sets state.phase_i_jna and meta.phase_0_end_turn, phase_1_start_turn, escalation_reason at transition (Option A1 in applyPhase0ToPhaseITransition). Phase_0_Spec §7.7 and §8 implementation-notes added; Phase I Spec §3 implementation-note added. See PROJECT_LEDGER 2026-02-24, PHASE0_JNA_STATUS_HANDOFF_HOWTO.md.
- **Phase II ceasefire/Washington pipeline gap:** `phase-i-ceasefire-check` and `phase-i-washington-check` only run in Phase I pipeline; if preconditions first met in Phase II, milestones would not fire. Action: add steps or shared milestone evaluation for Phase II.
- **War termination / end-game unspecified:** Canon and Rulebook are largely silent on when negotiation opens, how the game ends, and scoring/evaluation. Action: minimal war termination spec (thresholds, end state, scoring).
- **Player action guide missing:** Rulebook is systems-first; a clear "Player's Turn Guide" or "Player Actions per Phase" section is missing. Action: add to Rulebook or linked doc.
- **Supply spec gap:** Supply is referenced in combat, exhaustion, authority, corridors, enclave integrity — but no formal specification at attack-resolution level. Action: produce supply spec after critical path items.

### Compliance

- **Engine Invariants:** Determinism, stable ordering, no timestamps/random in simulation; milestone semantics as in §J.
- **Determinism:** All simulation and bot logic uses seeded RNG and deterministic ordering; no unseeded Math.random().

---

## 5. Process & Team Knowledge

**How to use:** Meetings, handovers, roadmap, MVP, Phase 7 backlog. Update when new meetings or handovers occur.

### Strategic milestones

- **MVP declared:** 2026-02-08; Phase 6 complete; scope frozen. Post-MVP work in Phase 7 (see IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md, PHASE7_BACKLOG_QUEUE_MASTER_EARLY_DOCS.md).
- **Executive roadmap:** Phases 1–6 implemented; Phase 6 = MVP checklist and declaration (See PROJECT_LEDGER.md 2026-02-06.)

### Handovers

- **External expert:** docs/40_reports/handovers/EXTERNAL_EXPERT_HANDOVER.md (project-wide). Map-only GUI scope: docs/40_reports/handovers/GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md — deliverable = standalone map application (base map + layers + settlement panel + zoom).
- **Tactical map canonical:** What the tactical map loads is canonical; deprecation plan for settlements_viewer_v1 in PARADOX_TACTICAL_MAP_CANONICAL_DEPRECATION_CONVENE.md.
- **Launchable desktop GUI (2026-02-14):** Spec and playbook in docs/20_engineering — TACTICAL_MAP_SYSTEM.md §21, DESKTOP_GUI_IPC_CONTRACT.md, GUI_PLAYBOOK_DESKTOP.md, GUI_DESIGN_BLUEPRINT.md; context.md implementation references; Systems Manual implementation-note. See PROJECT_LEDGER.md 2026-02-14 documentation and canon pass.
- **Warroom-first desktop launcher (2026-02-15):** Electron default renderer is now warroom (`awwv://warroom/index.html`) with launcher flow (side picker + scenario picker: `sep_1991`/`apr_1992`) before entering HQ. Main process remains canonical state owner; warroom receives state via `game-state-updated` and uses `advance-turn` IPC with optional `phase0Directives` payload for deterministic pre-turn investment application in main. Optional tactical map companion window via `open-tactical-map-window` (`awwv://app/tactical_map.html`). See PROJECT_LEDGER.md 2026-02-15 desktop GUI rebuild entry; DESKTOP_GUI_IPC_CONTRACT.md and TACTICAL_MAP_SYSTEM.md §21.
- **GUI polish pass canon (2026-02-14):** Implemented report GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md propagated to TACTICAL_MAP_SYSTEM §2/§13 (tabs, formation panel, strategic zoom, modals, file inventory), GUI_DESIGN_BLUEPRINT §21, context.md implementation refs, docs_index; CONSOLIDATED_IMPLEMENTED §7 already linked. See PROJECT_LEDGER.md 2026-02-14 Canon propagation: GUI Polish Pass.
- **April 1992 scenario creation (2026-02-14):** Comprehensive report [ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — Phases A–H (research, formation-aware flip, OOB cleanup, initial formations, JNA ghost mechanic, scenario authoring/calibration, desktop GUI). **Canon April 1992 scenario:** **apr1992_definitive_52w** — single scenario for desktop New Campaign, bot optimization, and CLI default (`npm run sim:scenario:run:default`). apr1992_historical_52w is legacy (no recruitment_mode) for reference only. CONSOLIDATED_IMPLEMENTED §5, context.md implementation refs, docs_index. See PROJECT_LEDGER.md 2026-02-14 Canon propagation and 2026-02-16 canon scenario consolidation.
- **Orders pipeline and posture UX (2026-02-15):** Implemented report [ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — full runTurn in desktop advance, IPC order staging (stage-attack-order, stage-posture-order, stage-move-order, clear-orders), GameStateAdapter orders as Records, bot AI excludes meta.player_faction, posture picker (human labels, tooltip stats, inline description, disabled by cohesion/readiness). Canon: TACTICAL_MAP_SYSTEM §2, §13.3, §14.2, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.5. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Orders pipeline and posture UX.
- **Order target selection UX (2026-02-15):** Implemented report [ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — full targeting mode (visual overlay, enriched tooltips, Escape cancel, cursor feedback, attack two-step confirmation, preview arrow). Pure UI in MapApp; no engine/IPC changes. Canon: TACTICAL_MAP_SYSTEM §2, §8, §12.4, §13.3, §21. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Order target selection.
- **Corps AoR contiguity (2026-02-15):** Implemented report [CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — corps-level contiguity (checkCorpsContiguity, repairCorpsContiguity, enforceCorpsLevelContiguity); enclave exception; Step 9 in assignCorpsDirectedAoR; pipeline step `enforce-corps-aor-contiguity` after `rebalance-brigade-aor`; brigade repair prefers same-corps. Canon: Phase II §5, §7.1; Systems Manual §2.1. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Corps AoR contiguity.
- **Scenario init six fixes (2026-02-15):** Implemented report (see [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §3, §4, §6; originals archived to _old/40_reports/implemented_2026_02_15/) — formation marker stacking (buildFormationPositionGroups, hit-test), corps-to-brigade command lines (drawCorpsSubordinateLines), settlement panel vertical tabs; Velika Kladuša RBiH-aligned (nine muns); VRS brigade HQ resolution (resolveValidHqSid in recruitment_engine); brigade AoR contiguity at init (scenario_runner: corps before AoR, safety net in initializeBrigadeAoR). Canon: TACTICAL_MAP_SYSTEM §8, §13.2; Phase II §7.1; Systems Manual §2.1, §13. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Scenario init six fixes.
- **Player agency plan kickoff (2026-03-07):** Execute `docs/30_planning/PLAYER_AGENCY_IMPLEMENTATION_PLAN.md` by actual file impact, not phase labels. `Phase A` can stay parallel/UI-only; `Phase F` is not fully UI-only because `F1` changes `CorpsOperation` schema, IPC payloads, and brigade attack approval in `bot_brigade_ai_osid.ts`. Either split `F1` into an engine-touching commit with regression or treat all of `Phase F` as regression-gated. Between phases: simplify, update ledger + napkin, verify, then single-phase commit. See PROJECT_LEDGER.md 2026-03-07 kickoff entry.
- **Tactical map seven UI/sim fixes (2026-02-15):** Implemented report (see [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §6) — 4th Corps OOB (7 core brigades available_from: 0, mandatory: true); War Summary modal (per-faction counts, BATTLES THIS TURN, control gained/lost); white corps command lines (60%, 2px); AoR fill pulsing (0.08–0.22); corps panel ACTIONS (stance + bulk posture via stage-corps-stance-order); army_hq FormationKind (NATO xxx, panel, command lines, AoR merge); larger markers + vertical stacking (44×30/54×38/66×46, hit 36px). initializeCorpsCommand includes corps_asset. Canon: TACTICAL_MAP_SYSTEM §2, §8, §13, §20, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.4. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Tactical map seven UI/sim fixes.
- **Warroom restyle, scenario fix, embedded map, fog-of-war (2026-02-16):** Implemented report [WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md](40_reports/implemented/WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md); IMPLEMENTED_WORK_CONSOLIDATED §11. Four items: (1) Warroom UI unified to NATO ops-center CSS (modals.css, ticker, all modals/panels). (2) All April 1992 scenarios use init_control_mode hybrid_1992 and init_control apr1992 (curated municipal file); Systems Manual implementation-note updated. (3) Tactical map opens as full-screen iframe in warroom (awwv://warroom/tactical-map/*, same-origin, bridge inheritance, postMessage back-to-HQ). (4) Faction fog-of-war: buildFormationPositionGroups and drawOrderArrows filter by player_faction; enemy formations hidden on canvas; defender info still visible in attack panel/tooltips. Canon: TACTICAL_MAP_SYSTEM §21.1, §22; context.md; CONSOLIDATED_IMPLEMENTED.
- **Tactical map UX (2026-02-19):** Accessibility (ARIA live region, keyboard settlement navigation, focus-visible), larger click targets and 12px typography, desaturated accent #00d470, toolbar grouping, panel tabs 90px/10px, hover/selection glow and formation glow, tooltips with shortcuts, loading/error/empty states, optional quick tour. TACTICAL_MAP_SYSTEM §2; docs/plans/2026-02-19-warmap-figma-spec.md implementation note.
- **Tactical 3D parity pass (2026-02-20):** `map_operational_3d.ts` now mirrors key tactical-map behaviors: `layer-formations` actually toggles 3D formation sprites, initial 3D view is corps-first via camera LOD (brigades on zoom-in), and formation clicks are hierarchy-aware (corps -> subordinate links + union AoR; brigade -> parent corps link + brigade AoR). Selection synchronizes with embedded MapApp state through `window.__awwvMapApp.state`.
- **Three workstreams convene (2026-02-20):** Orchestrator convened roles for (1) 3D corps/brigade icon size and LOD, (2) AoR display in 3D to match plan §2.5/§4.5 and TACTICAL_MAP_SYSTEM Pass 6, (3) brigade AoR 1–4 canon/engine/GUI. Priority, ownership, and handoffs: [ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP_2026_02_20.md](40_reports/convenes/ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP_2026_02_20.md).
- **Warmap sandbox visual & UX port (2026-02-21):** Operational 3D warmap (`map_operational_3d.ts`) now has two-tier formation counters (brigade light / corps CRT), stem lines to terrain, enhanced AoR and polygon movement range, settlement highlight rings, right-side panel stack (Selection, Orders, Battle log, Forces), and SELECT/ATTACK/MOVE mode toolbar (1/2/3, Escape) using DesktopBridge `stagePostureOrder`/`stageAttackOrder`. See [WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md](40_reports/implemented/WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md); TACTICAL_MAP_SYSTEM §2, §21.2; DESKTOP_GUI_IPC_CONTRACT; Systems Manual implementation-note.
- **Sep 1991 Phase 0 pre-war correction (2026-02-16):** Sep 1991 now starts with referendum not yet held, uses scheduled referendum/war-start turns (26/30), and applies April 1992 mun1990 control exactly on `phase_0 -> phase_i` transition (before OOB recruitability checks). Key implementation detail: when scheduled referendum is later than default eligibility deadline, pass a schedule-aware `deadlineTurns` override or Phase 0 will terminate early as non-war. See PROJECT_LEDGER.md 2026-02-16 entry "Sep 1991 Phase 0 correction: pre-referendum start, scheduled referendum, and war-start Apr 1992 control handoff."
- **Sep 1991 declaration-timing calibration (2026-02-16):** For undeclared-at-start scenarios, the canonical Phase 0 runner must pass full declaration options (`buildPhase0TurnOptions`) into `runPhase0Turn`; referendum-only options can leave declaration pressure inert and stall progression. For Sep 1991 historical flow, use schedule-gated threshold calibration (HRHB sustained-violence context + pressure/relationship overrides, RS threshold/relationship calibration) rather than scripted declaration dates. See PROJECT_LEDGER.md 2026-02-16 entry "Sep 1991 declaration timing calibration: undeclared start, threshold-based Nov/Jan sequence, and canonical runner wiring."
- **Phase 0 capital trickle canon update (2026-02-16):** Capital remains non-renewable by default, but scheduled pre-war scenarios now allow deterministic limited trickle (Phase 0 §4.1.1) to reduce dead turns without removing scarcity. Runtime gate is `meta.phase === "phase_0"` plus scheduled referendum/war-start metadata; application order is canonical faction order. See PROJECT_LEDGER.md 2026-02-16 entry "Canon update + implementation: scenario-gated deterministic Phase 0 capital trickle."
- **Sep 1991 trickle calibration (2026-02-17):** 20w/31w runs validated PER_TURN=1, MAX_BONUS=20; cap reached by turn 20, no tuning required. See docs/40_reports/convenes/SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md; Phase_0_Spec §4.1.1 implementation-note; IMPLEMENTED_WORK_CONSOLIDATED §13.

### docs/40_reports structure (2026-02-13)

- **Entrypoint:** docs/40_reports/README.md — master index; points to consolidated views and subfolders.
- **Subfolders:** audit/, implemented/, backlog/, convenes/, handovers/. Reports are physically placed in these folders; CONSOLIDATED_* links use subfolder paths (e.g. implemented/ReportName.md).
- **Consolidated views:** CONSOLIDATED_IMPLEMENTED.md (what’s done), CONSOLIDATED_BACKLOG.md (not yet implemented), CONSOLIDATED_LESSONS_LEARNED.md (patterns and report-derived lessons). Napkin remains session source of truth for corrections and patterns.
- **Custodian:** reports-custodian skill (`.cursor/skills/reports-custodian/SKILL.md`) owns 40_reports structure; classifies new reports, keeps CONSOLIDATED_* and README in sync, archives superseded to docs/_old/. Works with Documentation Specialist for doc layout.
- **Orchestrator memo:** ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md (directive; physical reorg and custodian created 2026-02-13).

*(See PROJECT_LEDGER.md 2026-02-13 docs/40_reports cleanup and consolidation; 2026-02-13 physical reorg and reports-custodian.)*

### Pyrrhic team & meetings

- **Subagents:** formation-expert (militia/brigade, pools, constants); scenario-creator-runner-tester (BiH history, scenarios, run analysis, conceptual proposals).
- **State-of-game meetings:** e.g. PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md — knowledge base, PDF limitation, canon audit; 11 systems designed, 5 fully wired, 6 partial.
- **Ledger:** New entries appended to PROJECT_LEDGER.md; awwv-ledger-entry skill for auto-append.
- **Orchestrator scenario-run handoffs:** docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md, implemented/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md — run canonical scenarios, capture run IDs/artifacts, delegate to scenario-creator-runner-tester (and optionally formation-expert) for historical verification.
- **Orchestrator absorption (2026-02-13):** docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md — absorbed 40_reports (battle resolution, recruitment, AoR investigation, no-flip, ethnic init, tactical map) and updated Phase II / Systems Manual canon accordingly.

*(See PROJECT_LEDGER.md 2026-02-06–09 process entries; 2026-02-12–13 handoffs; napkin Domain Notes.)*

---

## 6. Technical Decision Chains

**How to use:** Trace how key decisions led to the next. For full chronology see PROJECT_LEDGER.md changelog.

### Geometry processing chain

1. **Path A adoption (2026-01-24)** — Polygons ≠ settlements; separate ID schemes. Rationale: 1:1 matching failed.
2. **Outline/crosswalk issues** — Mid-based outlines need crosswalk; union on fabric unreliable.
3. **Drzava.js for borders (2026-01-24)** — Municipality borders from drzava.js to avoid union. Consequence: reliable borders.
4. **Adjacency / edge cancellation (2026-01-25–26)** — Municipality boundaries from fabric adjacency or shared-edge cancellation instead of union.
5. **A1 / WGS84 / Voronoi (2026-02-07)** — A1 base map STABLE; WGS84 settlements; bih_adm3_1990.geojson canonical; Voronoi with stable order and coverage diagnostics.

*(See PROJECT_LEDGER.md 2026-01-24 through 2026-02-07; §Geometry Contract.)*

### Bot evolution chain

1. **Placeholder / random** — Early bots not deterministic.
2. **Determinism requirement** — Simulation must be reproducible.
3. **Seeded RNG + strategy profiles (2026-02-09 Phase A)** — BotManager seeded RNG; no Math.random(); strategy profiles and difficulty presets.
4. **Time-adaptive + constraints (2026-02-09)** — scenario_start_week; front-length and manpower sensitivity; objective-edge planned-ops preserved.

5. **Phase II bot AI overhaul (2026-02-13)** — Fixed zero-attack-order bug (3 root causes: pipeline ordering, posture timing, supply deadlock). Added historically-grounded strategic objectives per faction. Key lessons:
   - Pipeline ordering matters: formation lifecycle must run BEFORE bot AI evaluates posture eligibility.
   - Same-pass dependencies: when bot generates posture orders and attack orders in one function, attack logic must read pending postures, not stale state.
   - Grace periods prevent deadlocks: supply gates can permanently block activation when Phase I supply system doesn't align with Phase II AoR. Max-wait auto-activation (6 turns) solves this.
   - Strategic objectives drive coherent behavior: without faction-specific offensive/defensive municipality lists, bots attack whatever is weakest regardless of strategic value.
6. **AI consolidation and breakthrough (2026-02-14)** — Deterministic rear-cleanup priority (hostile-in-own-mun, isolated clusters); Phase I consolidation bonus in edge scoring and control-flip candidate ordering; Phase II consolidation posture for soft fronts (real front = brigade-vs-brigade), casualty-tracked cleanup; exception data (connected strongholds, isolated holdouts, fast-cleanup muns). Canon: Systems Manual §6.1, §6.5; Phase II Spec §12; AI_STRATEGY_SPECIFICATION §Consolidation and rear cleanup.

*(See PROJECT_LEDGER.md 2026-02-09, 2026-02-13, 2026-02-14; napkin Patterns That Work.)*

### Map and control chain

1. **Tactical map as canonical (2026-02-08)** — What tactical map loads = canonical data; settlements_a1_viewer.geojson, political_control_data.json required.
2. **Formation positions** — municipalityId = mun1990_id; DataLoader from control_region + mun1990_names.json.
3. **Start-control hardening (2026-02-09)** — No null control at init; deterministic coercion (mun majority → neighbor majority → RBiH fallback) in political_control_init and build_political_control_data.

*(See PROJECT_LEDGER.md 2026-02-08–09; napkin Tactical map, Start-control hardening.)*

### Phase II combat chain

1. **Garrison-based combat (2026-02-11)** — Fixed 40/60 casualties per flip; no terrain.
2. **Battle resolution engine (2026-02-12)** — Multi-factor combat (terrain, equipment, experience, cohesion, posture, supply, etc.); casualty_ledger; four snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade). resolve_attack_orders delegates to resolveBattleOrders().
3. **RBiH–HRHB gate in Phase II (2026-02-12)** — resolve_attack_orders blocks RBiH↔HRHB flips/casualties before rbih_hrhb_war_earliest_turn (same as Phase I).

4. **Bot AI strategic targeting (2026-02-13)** — Faction-specific offensive_objectives and defensive_priorities in bot_strategy.ts. RS targets Drina valley + Sarajevo siege ring; RBiH targets siege-breaking + central corridor; HRHB targets Lasva Valley connection. Offensive zone brigades probe at lower density threshold (50 vs 150-200).

5. **P3 priority municipality bypass for undefended targets (2026-03-06)** — Corps-level P3 filter restricted opportunistic targets to army_priorities municipalities. This blocked capture of undefended territory in areas like Krajina where municipalities appeared only in defensive_priorities. Fix: bypass P3 for truly undefended targets (undefended_front + weak_enemy_osids with reason 'undefended'); weak-but-defended still filtered. Design principle: taking undefended territory costs nothing — all factions historically consolidated empty areas without explicit orders. Strategic filters should only gate targets requiring actual combat.

6. **Rear pocket consolidation vs brigade attacks (2026-03-07)** — Pipeline consolidation (auto-flip surrounded territory without combat) is strictly superior to changing brigade attack decisions for pocket cleanup. Approaches tried: predictor/resolver rear pocket fix (n208, 30 pockets, 82.6%), adjacency-based home-defense attacks any mun (n212, 25 pockets, 82.5%), same mun (n213, 22 pockets, 83.6%) — all caused butterfly effects from additional attack decisions destabilizing fronts. Pipeline approach (n214, 12 pockets, 84.2%): zero butterfly effects because no attack decisions change. Design principle: when a problem can be solved without changing attack decisions, always prefer the non-combat path.

5. **Engine-only long-horizon calibration (2026-02-17)** — Raised personnel/recruitment throughput (`POOL_SCALE_FACTOR 55->65`, `FACTION_POOL_SCALE.RS 1.05->1.15`, reinforcement `200/100->260/130`, RS mandatory mobilization `80->120`) and battle resolution intensity/flip rates (`ATTACKER_VICTORY_THRESHOLD 1.3->1.2`, `STALEMATE_LOWER_BOUND 0.8->0.7`, `BASE_CASUALTY_PER_INTENSITY 20->35`, `MIN_CASUALTIES_PER_BATTLE 5->10`, `UNDEFENDED_DEFENDER_CASUALTY_SCALE 0.2->0.4`, intensity divisor `500->400`). 104w definitive run improved flips (404->557), total casualties (att/def 5065/2905->7234/4120), and first-52w casualties (4922->8074), but per-faction casualty totals remain below desired historical scale.
6. **Hostile-takeover displacement path (2026-02-17)** — Added a delayed Phase II displacement chain tied to at-war settlement flips: takeover timer (4 turns) -> camp pool (4 turns) -> deterministic motherland-ordered urban reroute with overflow. East-Bosnia Bosniak routing now prioritizes Srebrenica/Tuzla/Gorazde; enclave overrun (Srebrenica/Gorazde/Zepa) applies higher kill fraction than standard displacement. Tactical map now displays both 1991 and current population (derived from displacement state).
7. **Displacement refactor shared utils (2026-02-17)** — Extracted `displacement_state_utils.ts` with `getOrInitDisplacementState` and `getMunicipalityIdFromRecord`; displacement_takeover and minority_flight import from it. No behavior change; code organization only. IMPLEMENTED_WORK_CONSOLIDATED §23.

8. **Linked ZoC front-line system (2026-02-23)** — When two or more friendly brigades' zones of control form a connected chain through the OSID adjacency graph (brigade → zoc → zoc → brigade, max 4-node chain), intermediate ZoC OSIDs become a "linked front" blocking enemy movement. Algorithm: BFS connected components on subgraph of (brigade ∪ ZoC) OSIDs; components with 2+ brigades → all ZoC OSIDs in that component are linked. Enemies cannot enter linked ZoC (friendly-controlled territory within the chain) but CAN attack brigade positions. This models the historical reality that deployed units within mutual support range control ground between them. Effect: front lines stabilize after initial offensive phase (~17 weeks), matching Bosnian War's historical pattern of solidified fronts by mid-1992.

9. **OSID terrain-weighted column movement (2026-02-23)** — Multi-hop column transit for brigade redeployment through rear areas. Terrain-weighted Dijkstra pathfinding through friendly OSIDs (road quality, slope, friction, river, uphill). Column rate by composition: heavy mech (RS) = 2/turn, light infantry (RBiH) = 4/turn, mixed (HRHB) = 3/turn. Bot AI issues column march for brigades ≥3 BFS hops from front. Transit time = ceil(path_cost / rate). Pipeline: column step runs BEFORE zoc-constrained-movement (which clears all orders). Pattern: separate order `stance` field distinguishes column orders from 1-hop combat orders.

10. **Ethnic-majority init control + co-ethnic bot scoring (2026-02-25)** — Fixed critical bug: `hybrid_1992` init mode's ethnic lookup fails silently for OSID-keyed graphs (`sidToEthnicityKey("op:mun:slug")` → `"Sslug"` doesn't match canonical `"S123456"` keys). All OSID scenarios were initializing from municipality controller only. Fix: load `operational_political_control.json` (ethnic majority at 40% threshold, HRHB→RBiH aligned-municipality overrides) directly after state creation. RS starts 266/753 (35.3%) instead of 295/753 (39.2%). Bot scoring now includes co-ethnic motivation: `computeOsidEthnicComposition()` averages canonical SID census data per OSID; `getCoEthnicScore()` returns 0–80 bonus proportional to co-ethnic share (linear, full at ≥50%). All three faction scoring functions use this. Pattern: OSID-level data aggregation from canonical SIDs requires explicit reverse-map lookup — never assume OSID keys match canonical data keys.

11. **Bot AI territorial calibration patterns (2026-02-25)** — (a) Heartland penalty time-decay: flat avoidance penalties cause permanent combat death; time-decaying penalties (-400→-250→-150) create multi-phase offensives matching historical war phases. (b) Exact OSID Set matching vs municipality-pattern matching: narrow penalties (e.g. Bihać pocket) should use `Set.has()` on specific OSIDs rather than `osidMatchesAny()` substring matching on municipality patterns, which blocks entire municipalities. (c) Co-ethnic scoring activates faction-appropriate defense: HVO jumped from 2 to 18 orders because ethnic scoring motivated defense of Croat-majority OSIDs. (d) BFS `findNearestOsidByPattern()` enables retreat-to-pocket behavior (HVO Posavina → Orašje).

*(See PROJECT_LEDGER.md 2026-02-11–12, 2026-02-13, 2026-02-23, 2026-02-25; docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/battle_resolution_engine_report_2026_02_12.md.)*

### Phase I no-flip chain

1. **Hard short-circuit (2026-02-11)** — disable_phase_i_control_flip → stasis (zero flips). Insufficient.
2. **Military-action branch (2026-02-11)** — Formation-led control pressure; militia-threshold path disabled. Movement and displacement occur.
3. **Calibration (2026-02-11)** — 3x3 knob grid, attack-scale sweep; player_choice benefits, ethnic/hybrid 30w worse than default.
4. **Final policy (2026-02-11)** — No-flip GO only for player_choice recruitment scenarios; ethnic/hybrid NO-GO. Canonical scenario: player_choice_recruitment_no_flip_4w; PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md.

*(See PROJECT_LEDGER.md 2026-02-11; PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md.)*

### Tactical map order UX pattern (2026-02-20)

- Replace abstract caps with direct geographic selection when the mechanic is spatial (Move/Reposition AoR): select 1–4 connected settlements on map, validate contiguity and ownership at both UI and main-process validation layers, and keep Confirm/Cancel keyboard parity (Enter/Esc).
- Reuse a single validation helper for hover tooltip, cursor state, and click-path guardrails to keep UX feedback consistent and prevent drift between what looks valid and what actually stages.
- Render pending-order intent directly on map (attack + municipality move + settlement move + reposition arrows) so staged actions are legible without opening panel details.

*(See PROJECT_LEDGER.md 2026-02-20 “Brigade AoR UX pivot: settlement-select Move/Reposition + polish + docs alignment”.)*

---

### Map HoI and 2.5D renderer (2026-02-21)

- **map_hoi** — Parallel entrypoint: HoI-style warm palette, class-based components, same IPC and GameStateAdapter; operational_settlements.geojson for placeholder or 2.5D control layer.
- **HoIMapRenderer** — Three.js orthographic ~20° tilt; terrain; political control meshes; front ribbons; Bézier order arrows; formation sprites (zoom scaling); labels LOD; strategic points; enclave rings. WebGL fallback to 2D placeholder.
- **Operational settlements** — `npm run map:derive:operational-settlements`; Phases 1–2 prerequisite.

---

### AoR/OSID/front reconciliation (comprehensive review 2026-02-23)

- The comprehensive review ([ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](40_reports/convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md)) confirmed that AoR, OSID (location_osid, ZoC, attack resolution), and front segments (assignable_front_segments, brigade_front_assignment) form a triple-identity that needs reconciliation. Canon and code reference them in overlapping ways.
- AoR phase-out (2026-02-23) removed AoR from GameState and pipeline; Phase II is OSID/ZoC-only. Reconciliation plan (docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md) covers migration path and transitional state.
- **Ownership:** Technical Architect owns the reconciliation plan; PM to sequence remaining work (front segment integration, pipeline step cleanup, adapter unification).

### OSID deferreds closed (2026-02-22)

- **OSID front edges snapshot** — Keep canonical `front_edges` for existing consumers and persist additive `phase_ii_front_edges_osid` for HoI/OSID rendering paths; adapters expose `frontEdgesOsid` and `map_hoi` prefers it.
- **OSID attack snap events** — `attack_resolution_osid` now emits structured snap events and per-type counts for downstream UI/reporting (`last_stand`, `surrender_cascade`, `commander_casualty`, `ammo_crisis`, `pyrrhic_victory`).
- **OSID terrain scalar policy** — Defender terrain multiplier is precomputed per OSID deterministically using max composite over constituent SIDs (defense-favoring, stable order).
- **Spawn pass-through completion** — Browser and CLI spawn flows now pass `canonicalToOperational` so emergent brigades get `location_osid` where mapping exists.
- **HoI interaction polish** — `M` key centers player-capital heuristic, double-click settlement zooms tactical-in, and map gets subtle tactile overlay.

### Phase M mechanics decisions (2026-03-01)

- **Morale vs cohesion separation** — Morale is a separate field from cohesion. Morale drifts toward census-based population affinity (ethnic composition of municipality). Cohesion represents unit training/experience. Both affect combat but through different channels. Morale gates retreat resistance; cohesion affects combat power.
- **ZoC as attack-resolution modifier (not passive)** — ZoC defense is implemented as "virtual defense" within attack resolution, not as a passive terrain modifier. When an unoccupied OSID is attacked, a linked friendly brigade in an adjacent OSID provides virtual defense. The defender stays at their own OSID; if they lose, the target flips but the defender doesn't retreat (they were never "there"). This avoids the complexity of passive zone-of-control mechanics.
- **Census-driven population affinity** — Morale drift uses 1991 census data (`population_share.ts`) to compute ethnic majority per municipality. Brigade morale drifts toward the ethnic affinity of their location. This creates emergent behavior: units in friendly-majority territory maintain morale; units in hostile-majority territory lose morale over time.
- **Per-municipality displacement routing** — Static lookup tables (47 sub-regions × 3 ethnicities) in `displacement_routing_data.ts`. Runtime validation (is destination friendly-controlled?) happens in `displacement_takeover.ts` routing loop. This separates data from logic cleanly. Don't add `state` parameter to route lookup function.
- **Enclave morale initial value** — Set at 70. With Phase A per-faction retreat resistance (RBiH floor=55, RS=70, HRHB=65), RBiH enclaves at morale 70 are well above their resist floor and hold strongly. n268 originally revealed morale 70 = flat resist floor made enclaves too strong. The per-faction system partially addresses this by making the floor faction-dependent rather than universal.
- **Rear-area cleanup as corps directive** — Implemented as a corps-level directive that targets own-controlled OSIDs with enemy formations behind the front line. All factions historically secured their rear before pushing forward. Runs throughout the war (no time gate). Rear pockets (all neighbors faction-controlled) are targeted even without an adjacent brigade so reserves move toward them.
- **Breakthrough retreat deferred** — M5 was evaluated and deferred. The HVO Orasje pocket issue is an OOB gap (0 brigades assigned to `hvo_northwest_bosnia`), not a retreat mechanic issue. Breakthrough retreat adds schema complexity (isolation_turns tracking) and BFS pathfinding for a mechanic that primarily helps edge cases.

### Systematic OSID override calibration strategy (2026-03-05, n65 ATH 99.2%)

**Ledger ref:** [2026-03-05] Calibration ATH n65

#### The core insight: pre-positioning replaces bot dynamics tuning

When sector offensive planning locks brigades in march order for 20+ turns, organic attack counts become unreliable calibration levers. The correct solution is to pre-position VRS territory via `osid_control_overrides` so that brigades start *at* the front rather than marching to it. This shifts calibration from "tune bot parameters" to "pre-solve initial state".

#### Systematic override methodology

1. **Extract sim initial state**: Read `runs/.../initial_save.json`, collect all OSIDs where `political_controllers[osid] === "RS"`.
2. **Extract reference initial state**: Do the same for a baseline run (n48) known to have correct starting territory (RS=364).
3. **Compute set difference**: Cells in reference but not in sim = missed RS overrides. ALL of these in the n48→n59 diff were painted RS in `painted_control_jan1993.json`.
4. **Add all as overrides**: Add the full diff set as `osid_control_overrides = "RS"`. This restores correct starting territory in a single batch.
5. **Run calibration**: Identify remaining mismatches. Classify each as: bot fixable, consolidation permanent, or override fixable.
6. **Iterate**: Each run reveals ≤8 residual mismatches. 5 iterations (n61→n65) converged to engine ceiling.

#### Consolidation ceiling — do not chase

`applyConsolidationFlips` auto-flips OSIDs surrounded by same-faction neighbors, regardless of `avoided_osids` or `osid_control_overrides`. These produce *permanent* mismatches. In n65: 4 HRHB consolidation + 1 RS consolidation in Pale + 1 RBiH bot recapture + 1 Donji Vakuf area = 7 permanent mismatches. **Do not add overrides to fix them** — consolidation will undo them immediately, wasting override slots and potentially disrupting other bot behavior.

#### Pool exhaustion rate: 25% not 100%

`applyCasualtyPoolExhaustion` and `applyFrontlineAttrition` feed permanent losses back into `pool.exhausted`. At 100% rate, frontline municipality pools become exhausted within 10-15 turns → bot targeting breaks (no recruitable population). **25% rate** preserves demographic gating while preventing over-exhaustion. Files: `frontline_attrition.ts`, `pool_population.ts`.

#### Override direction law (calibration-critical)

| Override type | When to use | Effect |
|---|---|---|
| `osid_control_overrides[osid] = "RS"` | Painted=RS, sim=RBiH (RS under-capture) | Forces RS control at init |
| `avoided_osids` for RS | Painted=RBiH/HRHB, sim=RS (RS over-capture) | Prevents VRS from attacking there |

Confusing the two directions causes −0.7pp regression. Adding RS under-captures to `avoided_osids` prevents VRS from attacking them at all, guaranteeing they stay RBiH.

#### Force allocation fragility

Each new override block can redirect bot force allocation in non-obvious ways. Example: Kalesija overrides (n466) redirected VRS pressure → bonus Kupres fix. Adding Kladanj overrides on top disrupted that allocation → Kupres reverted. **Test each override block in isolation**; never stack two new groups without verifying final-state dynamics.

#### n65 final result

- **99.2% area-weighted** (737/744 = 99.1% count) — ATH as of 2026-03-05
- 171 overrides: 144 RS, 18 RBiH, 5 HRHB
- 22 organic attacks (RS=9, RBiH=13), 17 active weeks
- All 6 bot benchmarks PASS
- 7 permanent mismatches (engine ceiling — consolidation/recapture)
- RS sim=412 vs painted=411, RBiH sim=241, HRHB sim=91

#### Combat-causality acceptance gate

- **Combat-causality gate (2026-03-05):** The n77/n78/n79 zero-battle investigation showed that branch-level territory deltas can improve without functioning combat, via demographic drift, consolidation, or init effects. From this date forward, no combat-calibration claim is valid unless the run shows non-zero attack orders, non-zero battles in `weekly_report.jsonl`, and a short attribution split between combat flips and non-combat flips. Use `docs/40_reports/CALIBRATION_MASTER.md` as the single source of truth and update it during the session, not after. See ledger entry `[2026-03-05] Calibration governance: combat-causality debug brief + master calibration gate` and report `docs/40_reports/convenes/20260305_CALIBRATION_P0_COMBAT_CAUSALITY_DEBUG_BRIEF.md`.

#### Opening-operation placement discipline

- **Real startup path is `player_choice` recruitment (2026-03-05):** A brigade-placement fix in `src/scenario/oob_early_war_entry.ts` is insufficient for April 1992 scenario runs. The actual scenario startup flows through `src/sim/recruitment_engine.ts`, so fixed-home placement tags and placement preservation must exist in both paths.
- **Brigade placement and political control are separate levers (2026-03-05):** It is valid to move brigade `home_osid` and redesign pre-planned operation rosters/sectors/staging, but do not change starting controller from `RBiH` to `RS` to make an opening attack possible. If a selected `home_osid` is enemy-held at init, the brigade will be re-homed; choose friendly-held launch OSIDs instead.
- **Interpret partial recovery correctly (2026-03-05):** `n104` restored actual RS combat (`53` attack orders, `53` battles) but still recorded `24` execution-phase invalid operations. That outcome means "combat loop partly restored, named-operation emission still broken", not "calibration improving".
- **Operation ownership beats corps logic (2026-03-05):** Once a brigade is assigned to a live named operation, the operation owns its behavior until the operation object is cleared. Corps-level controls such as `home_defense_active`, reserve assignment, and generic target selection must not short-circuit operation planning/execution/recovery.
- **Proof scenario before full calibration (2026-03-06):** Use `data/scenarios/apr1992_vrs_operation_proof_4w.json` and `tests/scenario_vrs_operation_proof.test.ts` as the deterministic opening-op proof lane. It proves that at least one VRS opening operation can emit attack orders, resolve battles, and advance objectives before spending 40-week runs on wider cadence debugging.
- **Zero eligible attackers is its own failure boundary (2026-03-06):** Distinguish `execution_without_attack_orders` from `execution_without_eligible_attackers`. The first means an execution-phase op produced no attack/movement orders; the second means the current objective had no eligible direct attackers at all. Debug them differently.

### Strategic reserve and faction-differentiated mobilization (2026-03-06, n191)

**Ledger ref:** [2026-03-06] Strategic reserve system + faction-differentiated mobilization surge

#### Municipality-locked pool topology mismatch (root cause)

Municipality-locked militia pools create a structural mismatch: brigades draw from their home municipality pool at REINFORCEMENT_RATE (400/turn), but municipalities only generate ~5-50 people/turn from mobilization. Front-line municipalities run to zero in a few turns; rear municipalities accumulate 75k+ surplus (brigades at max 3,000 cap, pool growing each turn). Increasing mobilization surge factors only adds to rear surplus. The problem is topological — manpower is generated where it isn't needed and consumed where it can't be generated fast enough.

#### Strategic reserve solution

Faction-level manpower redistribution via `state.strategic_reserves`. Pipeline: `phase-ii-strategic-reserve-collection` (excess above 5,000 threshold flows to faction reserve) → `phase-ii-strategic-reserve-reinforcement` (under-strength brigades draw from reserve at reduced rate). Faction-specific draw rates reflect historical logistics capability: RS=0.25 (JNA inheritance), HRHB=0.25 (Croatian support), RBiH=0.02 (poor logistics until 1994 professionalization). Files: `src/sim/combat/strategic_reserve.ts`, `src/sim/turn_phases/war_phases.ts`.

#### Faction-differentiated mobilization surge

Global surge curve replaced with per-faction curves. VRS: lower initial rush (2.0× vs 2.5×), more sustained mid-war (1.1× vs 0.9×), reflecting JNA organized startup. ARBiH: higher initial rush (2.8×), faster burnout (0.45× at w79-104), reflecting desperate mass mobilization. HVO: moderate curve. File: `src/sim/combat/ongoing_mobilization.ts`.

#### Calibration result (n191)

Multi-checkpoint verification at both w40 (Dec 1992) and w80 (Jan 1994):
- RS: 102.6k (w40, target 90-100k) → 110.1k (w80, target 100-110k) — historically accurate plateau
- RBiH: 121.0k (w40, target 110-130k) → 175.4k (w80, target 140-160k) — within wider historical estimates
- HRHB: 41.5k (w40, target 40-45k) → 49.8k (w80, target 45-50k) — near peak
- Strategic reserves at w80: RS=0 (fully consumed), HRHB=0 (fully consumed), RBiH=70,262 (large surplus but low draw rate limits distribution)

#### Design principle

The strategic reserve solves the topology mismatch without artificial caps or scripted behavior. Combined with faction-differentiated surge, this produces historically accurate growth trajectories across multiple time checkpoints from purely organic mechanics. The system is deterministic (sorted pool keys, sorted formation ids, strictCompare throughout).

---

## Cross-references

- **Full changelog:** `docs/PROJECT_LEDGER.md` (append-only).
- **Tagging index:** `docs/PROJECT_LEDGER_TAGGING_INDEX.md`.
- **Reorganization plan:** `docs/PROJECT_LEDGER_REORGANIZATION_PLAN.md`.
- **Implementation guide:** `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md`.
- **Napkin:** `.agent/napkin.md` (corrections, patterns, domain notes).
## 2026-03-05 - Engine audit knowledge

- `sector_intel` is the live engine-side intelligence model, but the tactical-map fog overlay still depends on legacy `recon_intelligence`. Live saves can contain `sector_intel` with no `recon_intelligence` at all. Do not claim that FoW is fully wired end-to-end until the UI consumes the same intelligence source the sim derives.
- Corps can plan operations on their own, but generic named-op planning is currently load-bearingly ambiguous because sector-op launch later in the same corps-AI pass may replace a fresh non-sector active operation. Treat corps operation ownership as split until one path is canonical.
- Engine/UI ownership mismatch: operation participants are exempt from `home_defense_active` in `bot_brigade_ai_osid.ts`, but the formation detail panel still disables offensive posture buttons purely on `home_defense_active`. Do not assume the tactical UI currently reflects operation ownership rules.

## 2026-03-08 - N304 combat mechanics root causes — fatigue, equipment, attrition

Three critical bugs discovered and fixed, each with systemic lessons:

### Fatigue reset bug (formation_fatigue.ts)
- `FRONTLINE_FATIGUE_PER_TURN = 1.5` (fractional) was silently reset to 0 every turn by `Number.isInteger(1.5) === false` check in `updateFormationFatigue`. The check was meant to sanitize garbage values but blocked all fractional fatigue accumulation.
- **Lesson:** Guard clauses that use `Number.isInteger()` are dangerous for any float-valued field. Use `typeof !== 'number' || isNaN()` instead. This pattern may exist elsewhere in the codebase.
- **Impact:** 189 front-assigned brigades never tired. RS could sustain indefinite offensives with no combat power degradation. Fixing this alone improved ATH from 87% to ~93% because RS offensives naturally exhaust.

### Equipment losses missing from OSID attack path (attack_resolution_osid.ts)
- The primary battle resolution system (`resolveAttackOrdersOsid`) had **zero equipment loss logic**. Only the legacy SID path (`resolveBattleOrders`) in `battle_resolution.ts` had equipment loss code — but that path has `defenderFormation = undefined` and `defenderBrigadeId = undefined` hardcoded (AoR removal leftover), meaning ALL its battles were "undefended" and equipment losses were always 0.
- **Lesson:** When two parallel resolution paths exist (OSID vs legacy SID), features added to one may never reach the other. The OSID path is the live path; the legacy SID path is effectively dead code for combat. Equipment features must live in the OSID path.
- **Impact:** RS lost 165 tanks + 230 artillery in 40 weeks after fix. Equipment attrition reduces RS heavy firepower over time — matching VRS doctrinal arc (starts professional, degrades from attrition).

### Frontline attrition rate (frontline_attrition.ts)
- `BASE_ATTRITION_RATE` was reduced from 0.005 to 0.003 at n159 for RS/HRHB KIA running too high. With fatigue now working and equipment degrading RS firepower, the lower rate produced too few total casualties (97k vs historical ~120-130k for the first year). Restored to 0.005.
- **Lesson:** Attrition rate calibration depends on other systems working correctly. When fatigue was broken, 0.003 seemed right. With fatigue working, 0.005 is needed because RS offensives are naturally limited and produce fewer battle casualties.

### Emergent behavior: doctrinal arcs without hard caps
- With fatigue + equipment working, RS territorial acquisition naturally slows and stops by ~w30 without any hardcoded phase switch or RS stance change. This matches the design intent: "Arcs must emerge ORGANICALLY — NOT from hard caps or phase switches." ATH improved from 87% to 93.8% purely from fixing these mechanical bugs.
- RS delta went from -23 (RS under-acquiring by 23 OSIDs) to +1 (nearly perfect). The over-acquisition was actually caused by RS having infinite stamina (no fatigue) and infinite firepower (no equipment attrition).

### Legacy SID path status
- `resolveBattleOrders()` in `battle_resolution.ts` lines 930-933: `defenderBrigadeId = undefined`, `defenderFormation = undefined`. This was an intentional stub after AoR removal ("legacy SID path: militia-only, no brigade_aor lookup"). It still runs in the pipeline (line 856 of war_phases.ts) alongside the OSID path but produces only trivial casualties (2 wounded per battle, no equipment).
- **Decision:** Leave legacy SID path as-is; all real combat goes through OSID path. Legacy path exists for backward compat with SID-keyed scenarios.

## 2026-03-09 - Power-ratio casualty scaling + home defense vs operations conflict

### Power-ratio casualty scaling (combat_math.ts)
- `getPowerRatioCasualtyMult(powerRatio)` returns `[attackerMult, defenderMult]`. Cube-root scaling: `Math.pow(clampedRatio, POWER_RATIO_CASUALTY_EXPONENT)`. Constants: `POWER_RATIO_CASUALTY_EXPONENT=0.33`, `POWER_RATIO_CASUALTY_MAX=2.0`, `POWER_RATIO_CASUALTY_MIN=0.4`.
- **Defender-only application.** Applying to both sides double-counts the power advantage (outcome modifiers already capture the attacker's penalty via `OUTCOME_ATTACKER_MOD`). Defender-only adds within-band differentiation: 3:1 power ratio → defender takes 1.44x; 0.5:1 → defender takes 0.79x.
- **Lesson:** Linear (1.0) exponent far too aggressive. Square-root (0.5) still caused noticeable regression. Cube-root (0.33) provides meaningful differentiation within outcome bands without destabilizing the overall casualty model.

### Home defense vs operations conflict (compute_home_defense.ts)
- `isOperationParticipant(state, corpsId, brigadeId)` checks if brigade is on any axis of the corps' active operation during execution phase.
- **Root cause:** `canAdoptPosture()` in `brigade_posture.ts` silently returns false for brigades with `home_defense_active === true`, blocking attack/assault posture. No log, no warning — just a quiet no-op. Operations that assign brigades to attack from their home municipality silently fail.
- **Lesson:** Silent posture rejection is dangerous. The exemption mechanism (execution-phase only — planning/staging brigades still defend home) is essential, but the underlying silent rejection pattern should be addressed with diagnostic logging.
- **Impact:** This was the single root cause of Operation Teocak failure. Kalesija-based brigades (241st, 242nd, 245th) could not attack Rastosnica despite being ordered by corps.

## 2026-03-06 - Combat-causality recovery knowledge

- `n126` is the current April 1992 40w recovery milestone. It passed the live combat-causality gate with `91` attack orders, `81` battles, and `invalid_operation_count = 0`. Use it as the current evidence point for "combat restored," not as proof that all repo integration issues are solved.
- Live control-change attribution is now the canonical reporting path. Use `control_change_attribution` from `weekly_report.jsonl` and `run_summary.json` when discussing why territory changed.
- `control_events.jsonl` was a leftover Phase I / flip-era harness artifact. It is no longer a valid live-contract artifact for war-phase scenario reasoning.
- If a scenario/debug test still depends on `control_events.jsonl`, treat that as stale test debt rather than as evidence that flips remain a core live mechanic.
- `pre_planned_operations.ts` is load-bearing for opening-op recovery and easy to break with merges. Two concrete guards:
  - no merge markers may remain in that file
  - brigade corps membership must be resolved with `getFormationCorpsId(...)`, not `formation.corps_id`

## 2026-03-06 - Runtime sector rearrangement knowledge

- `sector_rearrangement.ts` is live in the corps AI runtime (wired into `generateCorpsDirectives()`).
- **Previous regression (n135)** from wiring into `generateAllCorpsOrders()` was caused by the `codex/combat-causality-hardening` merge, not rearrangement itself. Confirmed by bypass test n132 + pre-merge rollback n134.
- Thin consolidation: any 0-brigade sector merged into adjacent neighbor (no edge-count limit). MAX_SECTOR_EDGES cap prevents mega-sectors. `unmergeable` tracking (break→continue fix) ensures all eligible sectors are tried.
- Pocket containment: enemy OSIDs fully surrounded by corps territory → dedicated containment sectors.
- Architect rule: sector rearrangement now passes the combat-causality gate (n142 green). Any future topology changes still need scenario-level acceptance.

## 2026-03-06 - Sector fix: all 15 corps get front sectors

- **5 corps had zero front sectors**: vrs_2nd_krajina, vrs_east_bosnian, vrs_herzegovina, hvo_southeast_herzegovina, hvo_northwest_bosnia.
- **Root cause 1: BFS seeding** — `friendlyOsids` built only from edge-graph adjacency keys, excluding deep-interior OSIDs. Fix: include all `political_controllers` entries for the faction.
- **Root cause 2: consolidateCrossCorpsFronts** — over-stripped minority corps edges with no protection. Fix: `protectedCorps` set prevents any corps from losing ALL its edges.
- **Root cause 3: OOB tag mismatches** — 15 brigade tags used legacy corps IDs (e.g. `rs_drina_corps` instead of `vrs_drina`). Fixed in `oob_brigades.json`.
- **Root cause 4: HVO SE Herzegovina HQ** — was at Mostar (RBiH-controlled). Moved to Čitluk.
- **Design decision: Corps HQs are abstractions** — not physical map entities. BFS seeding uses `political_controllers`, not HQ OSID positions. HQ locations exist for GUI display only.
- **Result (n142):** All 15 corps have sectors. 25 misassigned brigades (was 50). 0 empty non-pocket sectors. Area-weighted 81.5% (expected regression from corrected corps assignments).
- **OOB tag canonical mapping** (for reference):
  - `rs_sarajevo_romanija_corps` → `vrs_sarajevo_romanija`
  - `rs_drina_corps` → `vrs_drina`
  - `rs_herzegovina_corps` → `vrs_herzegovina`
  - `hvo_oz_nw_herzegovina` → `hvo_tomislavgrad`
  - `hvo_oz_se_herzegovina` → `hvo_southeast_herzegovina`
  - `hvo_oz_posavina` → `hvo_northwest_bosnia`
  - `hvo_oz_central_bosnia` → `hvo_central_bosnia`
  - `hvo_oz_nw_bosnia` → `hvo_northwest_bosnia`

## 2026-03-07 - N200 UI operations surfacing

- Operation-readiness UI now derives from existing state rather than bespoke API: supply uses `active_operation.supply_readiness`, cohesion uses average participating brigade cohesion, and intel uses max `sector_intel` confidence for the operation's `sector_id`.
- The new operations map mode is intentionally deterministic and lightweight: effort is computed from sector assigned-vs-reserve brigade share plus a small tempo modifier. It is a visualization layer, not a simulation input.
- Current operation health percentage in the adapter is a proxy (`personnel / 2500` per brigade). If engine later exposes brigade peak strength, migrate the UI to that explicit field rather than tuning the proxy in place.

## 2026-03-07 - N201 sector intent + operation execution wiring

- `sector_stance_orders` is now the canonical sector-level defensive intent surface. It does not mutate brigades directly; instead `applySectorStanceOrders()` translates sector intent into standard `brigade_posture_orders` after the normal posture-order phase, preserving existing posture constraints and determinism.
- Operation-level player levers now belong on `CorpsOperation`, not ad hoc UI state: `min_attack_outcome`, `tempo`, `schwerpunkt_osid`, `artillery_preparation`, and `force_launch` are all persisted and consumed by the combat/lifecycle code.
- `composite_ivp` should be treated as the UI-facing summary gauge for international pressure. It is derived from the existing Sarajevo/enclave/atrocity/negotiation components rather than standing up a second IVP system.

## 2026-03-07 - N202 supply-agency + OPSEC follow-on

- `airdrop_allocation` is now a legitimate staged state surface. Even with faction-level reserve accounting still global, the allocation record is now deterministic, persisted, and visible to the UI, which unblocks later enclave-specific consequence work.
- OPSEC is modeled as a sector-level confidence modifier, not a hidden attack buff. It halves passive enemy intel buildup against marked sectors and automatically drops once the sector's operation goes hot.
- The latest 40w regression (`n242`) is a split verdict: benchmark-fit passed 6/6, but combat-causality validity regressed because multiple operations entered execution without eligible attackers. Future work on H/C should preserve the fit improvement while restoring causality validity.

## 2026-03-07 - N245 Phase C live mechanics are stateful, but calibration-neutrality is not yet proven

- The Phase C schema stubs are now live mechanics: `ivp_consequences_active`, `pending_convoy_decisions`, `smuggling_allocation`, and `sarajevo_tunnel_operational` are no longer just serialized fields.
- Convoys are deterministic and corridor-owned. If the route faction is the player, undecided convoy entries persist in state until the player stages `allow` / `block` / `divert` through desktop IPC; bots auto-resolve by IVP pressure band.
- IVP consequences use hysteresis (`30/60/80`, off at `20/50/70`) to avoid threshold flapping. RS patron/material support now reads those active consequences directly.
- The Sarajevo tunnel currently enters the model as a pressure/supply relief event, not a full enclave-local supply-network rewrite. If later calibration needs stronger Sarajevo-specific logistics effects, extend from this hook rather than inventing a second tunnel subsystem.
- `n245` preserved 6/6 benchmark checks but changed the final hash and left combat-causality invalid at the same 6-operation boundary. Treat Phase C as functional progress with unresolved calibration acceptance, not a finished acceptance gate.

## 2026-03-07 - N248 H gate closed at engine level; remaining drift is anchor calibration

- `repairScenarioArtifactState(...)` belongs at the scenario-harness boundary, not inside the war turn pipeline. The pipeline already displaces formations after combat; the harness also mutates state afterward (artifact-oriented control mutations), so it needs its own final invariant repair before serialization.
- Idle execution operations with zero movement, zero attack orders, and zero eligible attackers are not useful combat samples. Converting that first fully idle execution turn directly into `recovery` with `no_logged_attempt` preserves causality validity better than leaving the operation in an empty execution shell.
- The H-phase 40w gate is now clean on combat integrity terms: run `n248` restored `invalid_operation_count = 0` and kept benchmark-fit at `6/6`.
- The remaining misses after `n248` are territorial calibration anchors, not simulation-health failures:
  - municipality `srebrenica` still trends too RS-strong by week 40
  - OSID `op:brcko:brka_2` still flips/stays RS instead of the expected RBiH hold
- Those two anchor misses align with the existing napkin warning that Srebrenica/Brčko drift is primarily a pre-planned-operation / scenario-anchor problem rather than a generic H-mechanics defect.

## 2026-03-06 - N159 deep engine audit: organic VRS tempo decay

- **Core design decision:** VRS tempo decay must emerge organically — not from hardcoded stance transitions. RS stays offensive permanently; slowdown comes from fatigue, supply consumption, entrenchment wall, and ARBiH resistance.
- **Fatigue as combat power modifier:** `getFatigueMult()` in `combat_math.ts`. Fatigued units fight worse: attack floor 0.6×, defense floor 0.75×. This is the cleanest organic slowdown — simpler than overstretch calculations, naturally penalizes continuous fighting.
- **FATIGUE_MAX consolidation:** Was duplicated across 3 files (combat_math.ts as FATIGUE_CAP, formation_fatigue.ts, attack_resolution_osid.ts). Consolidated to single shared constant in `formation_constants.ts` = 30 (was 20).
- **Fatigue accumulation rebalanced:** Recovery every 2 turns (was every turn). +0.5/turn for frontline-assigned formations. Combined with combat fatigue (+2 att / +1 def per battle), this creates genuine fatigue pressure.
- **Entrenchment diminishing returns:** sqrt-based curve replaces linear. At 1 turn: 0.07 bonus (doubled from linear). At 6 turns: 0.171 (reduced from 0.21). First turns of digging matter most — rewards ARBiH early defenders.
- **RS doctrine phases:** Reduced from 3 to 2 (both offensive). RS_EARLY_WAR_END_WEEK=20 still marks reduced aggression (0.15→0.05) and max_attack_share (0.28→0.22). No artificial defensive regression.
- **Supply drain critical finding:** UN airdrops at 15 pts/turn were silently dominating RBiH supply, masking the entire maintenance drain system. Reduced to 3/turn. Single constants can mask entire systems — always audit income vs drain arithmetic.
- **Patron commitment historical basis:** RBiH 0.3 in 1992 (arms embargo), growing to 0.6 post-1994. RS 0.8 (JNA backing), declining to 0.55. HRHB 0.6 (Croatian support), increasing to 0.7. Initial material_support_level: RS 0.75, HRHB 0.65, RBiH 0.3.
- **HRHB supply fragility:** 59 siege counters from central Bosnia pockets drain faction reserves. Need higher initial supply (75) + patron commitment to stay strained (19.3%), not collapsed (0%).
- **Displacement kill fraction issue (RESOLVED n905, 2026-03-18):** Per-faction kill fractions implemented. RBiH displaced by RS = 4%, HRHB displaced by RS = 1%, RS displaced by non-RS = 1%, default = 2%. `getDisplacementKillFraction()` in `displacement_loss_constants.ts`. Bosniak civilian killed % now 83% (was 60%), Croat 8% (was 28%).
- **Calibration result:** n166 = 84.2% area-weighted (up from 81.5%). 146 attacks, 118 battles, 103 captures. RS weekly attacks decline 8→1 (organic tempo confirmed). All VRS corps still offensive at t26.
## 2026-03-07 - Player-agency docs synchronized after A-H closure

- The player-agency implementation plan is now documented as complete for Phases A/B/C/F/G/H, with Phase E still intentionally deferred by the plan itself.
- Canon and engineering docs should reference the live state surfaces, not the older plan sketches: `sector_stance_orders`, `opsec_sectors`, operation shaping levers, `airdrop_allocation`, `pending_convoy_decisions`, `smuggling_allocation`, `sarajevo_tunnel_operational`, and `composite_ivp`.
- The authoritative closure evidence for this documentation state is the `n248`/`n249` lane: combat-calibration valid, `invalid_operation_count = 0`, benchmark suite `6/6`, and only anchor-level drift remaining.

## 2026-03-07 - Paramilitary rear pocket cleanup subsystem

- **Design choice:** New `'paramilitary'` FormationKind rather than tag or equipment class. Clean lifecycle separation from brigades — no reinforcement, no bot AI, no formation spawn interaction.
- **Pocket detection:** Graph analysis via `analyzeFactionGraph()` finds enemy OSIDs where ALL neighbors are faction-controlled. Deterministic hash (char code sum + turn mixing) for spawn probability — no randomness.
- **Faction differentiation reflects historical organizational penetration:** RS=0.85 (Arkan's Tigers, White Eagles, SDS/JNA networks), HRHB=0.55 (HOS, Croatian volunteers), RBiH=0.30 (Patriotska Liga, Green Berets — largely integrated early).
- **Casualty model consistent with combat system:** Standard KIA=0.30, WIA=0.55, MIA=0.15 split via `recordBattleCasualties()`. Civilian casualties (2% of avg OSID population) recorded as war crimes against losing faction.
- **Player agency via standing policy:** `paramilitary_policy` ('ask'/'always_allow'/'always_deny') avoids per-turn micro-management. `paramilitary_deployment_count` per faction enables future consequence scaling (IVP, legitimacy, patron disapproval).
- **Fade mechanic:** PARAMILITARY_FADE_WEEK=20 hard cutoff. Defense-in-depth: checked in both pipeline step and function body. War professionalizes — paramilitaries absorbed or disbanded historically.
- **Defended pocket handling:** 3x casualty rate (24% of unit), dissolve without capturing. Paramilitary forces are not equipped to take defended positions.
- **Pipeline placement:** After `partition-corps-front-sectors` so pocket detection has accurate territory data. Before `process-brigade-movement` so captures are visible to subsequent steps.
- **Key lesson:** The original design convene recommended tag/class over new FormationKind. In practice, a separate kind proved cleaner because it allows exclusion from all formation lifecycle systems (reinforcement, bot AI, spawn) without adding conditional checks everywhere — the kind filter naturally excludes them.

### 2026-03-08 update: cluster detection + instant capture + civilian cas fix

- **Cluster pocket detection (BFS):** Upgraded from single-OSID to clusters of 1-3 connected same-controller enemy OSIDs where ALL external neighbors are faction-controlled. BFS expansion through same-controller enemies, capped at MAX_POCKET_CLUSTER=3. Fixes multi-OSID pockets like Banja Luka dragocaj+potkozarje_3.
- **`op:` prefix filtering:** `operational_contact_graph.json` has 315 canonical SID nodes (`S:`-prefixed) with no `political_controllers` entry. Must filter to `op:` nodes in BFS expansion and external neighbor checks — otherwise `allSurrounded` is always false.
- **Interior scanning:** Pockets deep in rear territory aren't adjacent to any front OSID. Must scan ALL controlled OSIDs, not just `front_osids`.
- **Instant capture (MARCH_TURNS=0):** Bot brigade AI opportunistically grabs undefended adjacent targets before paramilitaries can march (at MARCH_TURNS=2). Fix: instant capture since pockets are already surrounded. Bot corps AI also excludes active paramilitary targets from opportunistic targeting.
- **Civilian casualty initialization:** `state.civilian_casualties` was optional and not always present. Paramilitary code silently dropped civilian casualties. Fix: `??=` operator to initialize the object.
- **Rear pocket consolidation re-added:** Cluster-aware `rear_pocket_consolidation.ts` for post-week-20 auto-flip. Paramilitaries handle w0-20; rear pocket consolidation handles w20+. Original `consolidation_flips.ts` remains deleted.

## 2026-03-07 - N290 Sector-only operations: three structural fixes

- **Root cause:** Bot corps AI had two operation creation paths. The old `generateCorpsOperationOrders` (catalog-based) picked 5 brigades from the entire corps pool using hardcoded municipality templates — no sector awareness. The sector offensive path in `generateCorpsDirectives` was sector-aware but had a rear-area brigade dump: when a sector cluster had <3 front-line brigades, it pulled ALL remaining corps subordinates into the operation. For 1KK (36 brigades), this created 31-brigade ops for 3 objectives.
- **Fix 1 — Rear-area dump removed:** Only sector-assigned brigades participate in operations. If a sector lacks brigades, no launch — corps density balancing should reinforce the sector first through normal redistribution.
- **Fix 2 — MAX_PARTICIPATING_BRIGADES=12:** Hard cap in `sector_offensive.ts` prevents bloated sector offensives even with large sectors. Pre-planned ops and triggered ops are exempt (they have explicit rosters).
- **Fix 3 — Catalog ops disabled:** `generateCorpsOperationOrders` removed from the pipeline (step 3 in `generateAllCorpsOrders`). Sector offensive path in step 6 now handles all auto-generated operations.
- **Key lesson: Operations must be sector-sourced.** Pulling brigades from the entire corps pool creates bloated ops that disrupt force balance across the front. The 31-brigade operation left most of 1KK's front undefended while concentrating on 3 objectives. Sector-constrained ops naturally limit participation to what's locally available.
- **JNA ghost phantom for Kupres:** `capture_osids` on PhantomDef flips political control at spawn. `no_equipment_handoff` dissolves without distributing equipment to corps. Used for `jna_9th_corps_tg` → captures goravci + kupres_2 at turn 0, dissolves at turn 4. No 2KK pre-planned op (−6.7pp regression from any approach involving 2KK brigades).
- **Reverted post_op_stance/stance_cap:** Mechanism added to prevent bot AI from overriding post-operation stance was unnecessary once 2KK pre-planned op was removed. Clean removal from CorpsOperation, CorpsCommandState, sector_offensive, bot_corps_ai, pre_planned_operations.
- **Calibration result:** n290 = 88.1% area-weighted (+0.4pp over n278 baseline). KRAJINA 96.9% (was 90.1%). RS count delta −23 (was −68).

## 2026-03-07 - Phase E municipality support is asymmetric and intentionally local

- The safe Phase E shape is one shared municipality-support surface with faction-specific fiction and effects: `RBiH` gets `weapons_shipment`, `RS` gets `staff_priority`, `HRHB` gets `croatian_support_package`.
- Keep Phase E pool-constrained and one-turn scoped. It should redirect scarce help locally, not rewrite total mobilization ceilings or global manpower curves.
- In unattended scenario runs, Phase E is effectively dormant unless a player stages orders. Do not attribute headless regression drift to the mechanic unless support orders were actually present in state.

## 2026-03-07 - Officer display: character-rich profiles via shared OfficerProfile component

- **Never show raw officer stat numbers** (1-5 integers or `Math.round(x * 100)`). All officer displays use `OfficerProfile` component.
- **OfficerProfile** (`src/ui/map/components/OfficerProfile.tsx`): shared card showing archetype, origin badge, pip ratings (●●●○○), descriptive stat labels, combat record, tenure. Props: officer, label, compact?, emphasis?, className?.
- **officerCharacter.ts** (`src/ui/map/utils/officerCharacter.ts`): pure utility functions. `getArchetype()` derives 15 archetypes from stat profile (Master Strategist, Reckless Attacker, Paper Commander, etc.). Stat labels: Inept→Exceptional, Passive→Relentless, Exposed→Ironclad. `formatPips()`, `getRatingColor()`, `getOriginDisplay()` (origin→{label,color}), `formatRank()`, `formatCombatRecord()`, `formatTenure()`.
- **NamedOfficerView** extended with `origin` (string, from OfficerOrigin) and `political_reliability` (number, 1-5). Mapped in `GameStateAdapter`.
- **6 consumers** use OfficerProfile: CorpsDetail, OperationDetail, FormationDetail (compact), OrbatPanel, OperationsPanel, ArmyDetail. OOBSidebar uses `formatRank` for abbreviated sidebar display.
- **Design rule:** `compact` mode shows competence + one emphasis stat; full mode shows all 3. `emphasis` prop only matters when `compact=true` — do not pass it without compact (dead parameter).

## 2026-03-08 - N345 Cold-front attrition fix and cascade calibration

- **Graz Accords cold fronts**: RS↔HRHB front segments under active Graz Accords must be "cold" — no passive frontline attrition, no bombardment exposure. Before n345, 31 HRHB brigades on RS fronts took full attrition (0.5%/turn × supply/density/bombardment modifiers), causing 6.3k KIA by w40 (nearly the full-war total of 8k). `isColdFront()` in `frontline_attrition.ts` detects cold fronts via corps pair membership (`isCorpsInGrazPair`) and Kiseljak exclusion zone OSIDs.
- **Siege drain under truce**: HRHB Central Bosnia pocket is classified "critical" by supply BFS (can only traverse own-faction territory — RS territory blocks BFS even under truce). 50+ siege counters drained HRHB supply from 75→0 by w30. Fix: skip HRHB in `updateSiegeTurnCounters()` while Graz active. The supply BFS topology is correct (HRHB pocket IS isolated from Herzegovina) — but the consequence (siege drain) should not apply when the surrounding faction is a truce partner.
- **Cascade effect**: Fixing HRHB phantom attrition required reducing HRHB pool scale (1.60→1.05) to prevent troop overshoot (50k vs 41.5k target). This cascaded to RBiH: healthier HRHB → changed territorial dynamics → 4.1k less RBiH mobilization + 1.5k more RBiH casualties → 114k vs 120k target. Compensated by raising RBiH pool scale 0.18→0.25. Key lesson: faction pool scale changes have cross-faction effects through changed war dynamics, not just direct pool mechanics.
- **Terminology**: "Graz Accords" is the historically correct name for the RS-HRHB non-aggression pact. Code state field remains `vienna_declaration_turn` for backwards compatibility.

## 2026-03-08 - N403 Corps sector system overhaul

- **Territory cap (`MAX_TERRITORY_OSIDS = 40`)**: Exported constant in `corps_front_sectors.ts`. Prevents mega-sectors from consuming excessive BFS depth in `assignTerritoryVoronoi`. Sectors stop expanding once they reach the cap.
- **Edge adjacency no longer bridges hostile territory**: `buildEdgeAdjacency` removed hostile-side bridging. `isSegmentAdjacent` now does BFS through friendly territory when `friendlyOsids` provided — segments must be reachable through own-faction OSIDs, not through enemy space.
- **`equalizeSectorDensity` (new)**: Redistributes brigades across sectors proportional to front edge count. Surplus sectors donate brigades to under-staffed neighbors. Runs after initial brigade assignment, before sector classification.
- **`ensureMinimumSectorCoverage` enhanced**: Surplus sector transfers added — sectors with brigade surplus donate to adjacent zero-brigade sectors. More robust than paper-only transfers.
- **Exempt corps (`EXEMPT_CORPS_IDS`)**: Corps like `hvo_central_bosnia` skip sector creation entirely. Isolated pocket formations where formal front sectors are not meaningful.
- **Ghost sector filtering**: Sectors with <=1 edge and 0 territory filtered as topology artifacts. 73 total sectors post-filter, 17 zero-brigade.
- **`getSectorFrontOsids()` helper**: Extracted for reusable front OSID collection from sector sub-segments. `mergeUndersizedSubSegments` accepts `friendlyOsids` param for BFS-aware merging.
- **Calibration result**: n403 = 86.9% area-weighted. Troop: RBiH=120.5k, RS=106.0k, HRHB=44.2k. Previous: n384=87.9%, n366=88.2%, n345=86.8%, n304=93.8% (ATH).
- **Key lesson**: Hostile-side adjacency bridging created phantom sector connectivity — sectors claiming edges far from their actual territory. BFS through friendly territory is the correct adjacency model for front sectors.

## 2026-03-10 - N524→N527 Enclave defense overhaul (Sarajevo holds)

- **Root cause**: Sarajevo fell at weeks 2-7 because RS attacks brought 5:1 personnel ratio plus massive equipment advantage. No defense multiplier can fix this — when 45k troops attack 9k defenders, even a 2× multiplier still leaves the attacker with overwhelming force. The fix required raw volume (garrison power), not bigger multipliers.
- **ALWAYS_BESIEGED_ENCLAVES**: Sarajevo supply reads "adequate" despite total siege (BFS finds friendly routes within the pocket). Fix: `ALWAYS_BESIEGED_ENCLAVES` set forces Sarajevo to always return 'strained' supply state, so resilience grows from turn 0 instead of decaying. Without this, `initial_resilience=20` was pointless — it decayed every turn under "adequate" supply.
- **Enclave garrison power**: New `getEnclaveGarrisonPower()` in `enclave_resilience.ts`. Formula: `population × ENCLAVE_GARRISON_MOBILIZATION(0.05) × GARRISON_EFFECTIVENESS(0.15) × resilienceMult`. Represents organized civilian defense: TDF, Patriotic League, police, neighborhood watch, armed volunteers — historically real in Sarajevo (10-15k armed civilians outside TO structure). Added to ALL defense computation paths (attack_resolution_osid.ts, combat_predictor.ts).
- **Urban defense enhancements**: (1) Urban defense multiplier 1.5→2.0 for Sarajevo OSIDs. (2) `URBAN_TANK_TERRAIN_FLOOR=1.7` — tanks in urban terrain penalized at mountain-equivalent level. Historical basis: Grozny 1994 (105 of 120 tanks destroyed in first assault), Mogadishu, Vukovar. Applied via `isUrbanOsid()` in `getHeavyWeaponsOffensiveMult()`.
- **Enclave resilience scaling**: Defense bonus per resilience point increased 0.005→0.02. At resilience 20: 1.40× (was 1.10×). At resilience 45: 1.90×. Per-enclave config with `max_resilience` and `growth_mult`.
- **Calibration result**: n524 = 87.7% area-weighted. 138 battles, 87.7% success rate. 6/6 benchmarks, 8/14 anchors. RS 52.2% territory. Sarajevo core holds (RS 5 / RBiH 4 suburb split). Goražde flips to RBiH majority (RS 9 / RBiH 11). Drina region 67.5%→78.0%. Sarajevo region 67.7%→80.6%.
- **Key lesson 1: Personnel ratio trumps multipliers.** When attackers outnumber defenders 5:1 in raw personnel, adding defense multipliers changes the outcome from "massacre" to "decisive defeat." Only raw volume (garrison power from civilian population) can counterbalance raw volume.
- **Key lesson 2: Enclave defense is multi-layered.** No single mechanism (resilience OR urban bonus OR tank penalty OR garrison power) is sufficient. The combination creates emergent fortress-like behavior: resilience grows under siege → garrison power increases → defense multiplier stacks with urban and entrenchment → attacking becomes prohibitively costly. This matches Sarajevo's historical reality.
- **Key lesson 3: Check timing before tuning constants.** If a constant change (0.005→0.02 scaling) has zero effect, check whether the system is active during the relevant period. Resilience at 0 during weeks 2-7 means any scaling factor × 0 = 0. The constant wasn't wrong — the timing was.

## 2026-03-10 - N556→N560 Dissolution fix + doctrine source-of-truth discovery

- **Dissolution absolute floor bypass**: `DISSOLUTION_ABSOLUTE_FLOOR=150` bypassed the 2-of-3 criteria check. All 12 destroyed brigades had high morale (37-93) and cohesion (56+) but auto-dissolved at <150 pers. Fix: absolute floor counts as "low personnel" criterion, still requiring 2-of-3 (3-of-3 for enclave). Destroyed: 12→1.
- **Timeline JSON overrides code doctrine**: `data/scenarios/timelines/apr1992.json` `doctrine_phases` is read by `getActiveDoctrinePhase()` via `timeline?.doctrine_phases?.[faction] ?? FACTION_DOCTRINE_PHASES[faction]`. Changes to `FACTION_DOCTRINE_PHASES` in `bot_strategy.ts` have ZERO EFFECT when a timeline is active. Two runs (n558, n559) produced identical results to n556 because only code was changed. Must edit the timeline JSON.
- **Defensive stance hard-gates operations**: `bot_corps_directives.ts` line 1001: `stance === 'offensive' || stance === 'balanced'` — corps in `defensive` stance CANNOT launch sector offensives. RBiH was `defensive` for all 40 weeks → zero attacks. Changed to `balanced` from w15 → 24 RBiH attacks.
- **RBiH attack outcomes**: 37.5% success (9/24), 33% catastrophic (8/24). Historically plausible for 1992 local counterattacks — mostly desperate, occasionally successful. Total KIA +1,234.
- **HRHB 0 attacks despite offensive stance**: Graz Accords blocks ALL valid HRHB→RS targets. Even with `offensive` doctrine w0-26, HRHB has zero targets that pass the Graz filter. Exception list (corridor municipalities) too narrow — needs Herzegovina ops (Op Jackal) and Mostar area added.
- **Key lesson: Rate tuning cascades unpredictably.** Reducing frontline attrition (0.005→0.003) or increasing combat rates (0.08→0.10) produced NET NEGATIVE results — more surviving brigades change battle dynamics. Revert and try structural changes instead.
- **Key lesson: Counting bugs in diagnostic scripts.** `b.outcome === 'decisive'` vs actual `'decisive_victory'` field made RS success appear as 5-10% when actual was 91%. Led to wasted tuning. Always verify field values with `Object.keys()` before writing extraction scripts.

## 2026-03-11 - Displacement ethnic tracking: two silent adapter bugs

- **Event log path error**: `GameStateAdapter.ts` read `state.displacement_event_log` (top-level, undefined) instead of `state.displacement.displacement_event_log`. Same pattern as the `state.military.*` path bug — wrong namespace silently returns undefined, entire downstream chain dead. **All** per-OSID and per-mun departure tracking was empty. "Fled from this settlement" showed "breakdown by nation not recorded" for every settlement. Current ethnic structure and ethnic map mode were frozen at pre-war census.
- **Ghost residents**: `departedByOsid` accumulated only `displaced`, not `killed + fled_abroad`. Killed/fled people still counted as living residents in ethnic computation. Kamičani example: 688 killed/fled Bosniaks → 48% Bosniak shown vs correct 0%. Fix: accumulate `displaced + killed + fledAbroad` as `totalRemoved`.
- **Key lesson: The adapter is a single chokepoint.** All settlement ethnic display, ethnic map mode, and "fled" breakdown flow through `departedByOsid` in GameStateAdapter. A single wrong path or missing accumulation field silently breaks everything downstream — no error, no warning, just stale data. When ethnic/displacement display looks wrong, check the adapter FIRST, not the displacement engine or UI components.
- **Key lesson: Test with known-displaced settlements.** Use Kamičani (Prijedor), Kozarac, or Srebrenica as smoke tests — RS-controlled with near-100% Bosniak pre-war population. If ethnic structure doesn't show ~0% Bosniak after displacement, the pipeline is broken.

## 2026-03-11 - Connected component reachability for brigade assignment (n597→n598)

- **Physical reachability via BFS connected components**: Brigade-to-sector assignment must verify the brigade can reach the sector through contiguous friendly territory. BFS over `operational_contact_graph.json` (744 nodes, 3243 edges) partitions friendly OSIDs into components. Brigades only assign to sectors in their own component. Implemented as `buildFriendlyComponents()` + `getSectorComponent()` in `corps_front_sectors.ts`.
- **Proxy checks fail for fragmented maps**: Checking `territory_osids.length === 0` does NOT detect disconnected pockets — Sarajevo, Bihać, Srebrenica all have territory, they're just disconnected from the main blob. The correct invariant is BFS connectivity, not data shape.
- **Multiple code paths require multiple fix points**: Three paths in `corps_front_sectors.ts` assign brigades to sectors: (1) `classifyBrigadesByTerritory` Phase 2 pool distribution, (2) `ensureMinimumSectorCoverage` Steps 2-3 surplus transfers, (3) final prune. Fixing only Phase 2 (n596) left 12 disconnected assignments. All three needed the `brigComp === sectorComp` filter.
- **Diagnostic verification**: `tools/check_disconnected_sectors.cjs` — loads operational_contact_graph.json, runs BFS reachability, reports both disconnected brigade assignments and disconnected sector pockets. Authoritative post-fix verification tool.
- **Calibration result**: n598 = 86.6% area-weighted, 6/6 benchmarks, RS delta +6, 172 orders, 1 remaining edge case (arbih_712th_mountain fallback). Previous: n590 = 86.3%, n579 = 85.3%.

## 2026-03-12 - Enclave brigade retention: march guard + retreat filter (n601)

- **Enclave brigades must not march out of their pocket**: At turn 0, enclaves are connected to the main blob via corridors. The sector system assigns enclave brigades to sectors in the main blob. Column march moves them there. RS severs the corridor. Brigades stranded 100km away with full personnel, never to return. Fix: `evaluateSectorMarch` skips march if no sector front OSID is in the same enclave.
- **Emergency retreat needs BFS nearest-friendly before corps HQ**: `findEmergencyRetreatOsid` jumped from fallback_osid to corps HQ (100km away) without checking nearby friendly OSIDs. New step 3: BFS within 8 hops from current location finds nearest friendly OSID. Keeps brigades in their pocket.
- **1-hop retreat must filter to same-enclave**: `getFriendlyRetreatDestinations` filtered retreat candidates for enclave-tagged brigades to same-enclave OSIDs only. Without this, brigades drift out through temporary corridors one hop at a time.
- **Helper: `isOsidInSameEnclave(a, b)`** in `enclave_resilience.ts` — checks ENCLAVE_DEFINITIONS prefix matching for both OSIDs.
- **Impact**: Goražde 2/20 → 14/20 RBiH OSIDs. Srebrenica 8/16 → 16/16. All 13 enclave brigades in home pockets. 6/6 benchmarks pass. 86.5% area-weighted match.
- **Key insight**: The bug was NOT in the retreat system — it was in the bot AI march orders. The brigades marched out voluntarily before the corridor closed. The retreat fixes are defense-in-depth for when OSIDs flip under the brigade.

## 2026-03-15 - Supply-gate directive baking vs operation probe threshold (n76 Fix #35)

- **`bestMinOutcome` is computed in the directive and baked into launched operations via `min_attack_outcome`.** `getSectorOffensiveProbeThreshold` returns `activeOp.min_attack_outcome` first — if this was set at launch time under adverse conditions, it persists for the operation's full lifetime. Supply recovering after launch has no effect.
- **The supply health upgrade (adequate_fraction < 0.05 → costly_victory) must not propagate into operation probe thresholds.** The directive-level supply gate correctly prevents launching new operations when supply is dire (via `critical_fraction > 0.5 → strip offensive_targets`). The secondary `bestMinOutcome = 'costly_victory'` upgrade is for directive planning only. Passing it to `evaluateSectorOffensiveLaunch` as `minAttackOutcome` burns a permanent `costly_victory` restriction into the operation — which is then NOT relaxed when supply improves.
- **Pattern: separate directive-level and operation-level thresholds.** Capture `minAttackOutcomeForOpLaunch = bestMinOutcome` BEFORE any supply/context adjustments that should affect only the directive. Use the pre-adjustment value for `evaluateSectorOffensiveLaunch`. The directive can be as restrictive as needed for planning; the operation's baked threshold should reflect the un-adjusted priority baseline.
- **Debug signature for this class of bug:** `elig=0` throughout execution despite brigades adjacent to objectives and above 400 personnel. `getSectorOffensiveProbeThreshold` returning a value stricter than the predicted outcome. Check `activeOp.min_attack_outcome` directly — if it's unexpectedly high, trace back to where the operation was created and what `minAttackOutcome` was passed.
- **Double-penalizing supply is wrong.** Combat predictor already applies supply power penalty (critical supply → ~0.5× attack power). Blocking attacks at the threshold level via `min_attack_outcome` means a supply-starved brigade (a) attacks at half power AND (b) can't even attack. The realism is captured by the power penalty. Threshold gates should only reflect the commander's confidence in success, not supply-state double-accounting.
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 entry "Fix #35."

## 2026-03-15 - Operation participant reserve bypass pattern (n59+n70 Fix #34)

- **evaluateReserve must not fire for operation participants.** Brigades committed to a sector offensive (isActiveSectorOperationParticipant=true) have explicit march-toward-objective orders. Reserve logic intercepts them before evaluateSectorAttack runs — resulting in brigades staged in the right position but silently idling as corps reserve. Fix: `if (isActiveSectorOperationParticipant) return false;` at the top of evaluateReserve.
- **Cold-front adjacency creates invisible reserve traps.** OSIDs adjacent only to Graz-Accords partners (HRHB for RS) have `adjEnemy.length === 0` and `osidAnalysis.enemy_neighbors.length === 0`, satisfying the reserve condition. The Graz cold-front correctly prevents attacks; but it must not prevent operation participants from marching through staging positions near those fronts.
- **1-hop movement_orders are invisible to anyMoved stall detector.** `updateMultiAxisResults` checks `brigade_movement_state[bid].status === 'in_transit' || 'packing'` for anyMoved. Regular movement orders (movement_orders + 1-hop BFS) never write brigade_movement_state — they just update location_osid. The stall detector sees zero movement every turn → idle_streak accumulates → axis aborts with 0 attacks. Column march orders (column_march_orders + Dijkstra) set in_transit status, making movement visible. **Rule: execution-phase march-first must always use column_march_orders + findNearestFriendlyOsidDestination, never movement_orders + findNearestFriendlyOsidInSet.**
- **findNearestFriendlyOsidInSet vs findNearestFriendlyOsidDestination.** The former returns the first BFS step (a 1-hop neighbor). The latter returns the actual target OSID (for multi-hop Dijkstra column march). Using InSet as a column_march_orders destination stops the column after 1 hop — the brigade arrives at the first step, is no longer in_transit, but hasn't reached the objective. **Rule: column_march_orders must always use findNearestFriendlyOsidDestination.**
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 entry.

## 2026-03-15 - Recruited brigades inflate equipment pool (n718 side-finding)

### Recruited brigades spawn with full DEFAULT_COMPOSITION
- `ensureBrigadeComposition()` in `equipment_effects.ts` initializes any formation with missing composition from `DEFAULT_COMPOSITION` (RS: 40 tanks, 30 arty; HRHB: 10/10; RBiH: 1/3). This runs on first access — including newly recruited brigades.
- **Effect:** Each new RS brigade spawned during a run adds 40 tanks to the pool. Over 40 weeks, this inflated the RS tank total from the historical ~535 to ~605 (13% above starting inventory from recruitment alone).
- **This is not a calibration bug** — the equipment attrition mechanic correctly removes tanks. But equipment totals at end-of-run are not directly comparable to historical figures because recruitment inflates the supply side.
- **Design rule:** If recruits shouldn't spawn with armor, `ensureBrigadeComposition` needs an `equipment_class`-aware path — mountain/light brigades get zero tanks; mechanized/motorized get full complement. Low priority until equipment calibration becomes a target.
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 n718 entry.

## 2026-03-15 - Explicit-field validators silently strip new optional fields

- **Pattern:** `validateOfficerData()` constructs validated `NamedOfficer` objects by explicitly listing every field in an object literal. When `war_crimes_record` was added to the `NamedOfficer` type and the JSON data, it was never added to the validator's field list. The field was silently dropped during scenario loading.
- **Why TypeScript didn't catch it:** The field is optional (`war_crimes_record?: {...}`). Omitting an optional field from an object literal is perfectly valid — no compile error. The validator produced a type-correct object that was missing data.
- **The downstream illusion:** The UI adapter, components, and types were all correctly wired. `OfficerProfile.tsx` had a `WarCrimesBadge` component, `GameStateAdapter.ts` mapped the field, `types.ts` declared it. Everything compiled. But the badge never rendered because the data was `undefined` at runtime — stripped 3 layers upstream.
- **Rule:** When adding optional fields to a type that has an explicit-field validator, always update the validator simultaneously. Search for the type name + "push" or "result.push" to find validators that construct the type. Consider adding a test that round-trips the JSON through validation and asserts the field survives.
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 war crimes fix entry.

## 2026-03-15 - Elite commander vs named officer architecture

- **Named officers** (`apr1992_officers.json`): Corps commanders and above. Participate in the officer succession system — can die (casualty_vulnerability), transfer, be replaced. Drive operation preparation tempo via competence/aggressiveness personality traits. Player-choice succession for player faction; bot factions auto-succeed. 98 total (RS 32, RBiH 38, HRHB 28).
- **Elite commanders** (`oob_brigades.json`, `elite_commander` field): Permanent brigade-level. Cannot die, cannot promote to corps, cannot command operations. Represent iconic commander-unit bonds (e.g., Tirić and the Black Swans, Glasnović and the ABB). Purely informational for UI display. 8 total across all factions.
- **Key distinction:** Named officers flow through `officer_system.ts` (validation, state tracking, succession events, pending_officer_events). Elite commanders are static strings on the brigade OOB entry — no state tracking, no events, no gameplay effect. They never enter `named_officer_data` or `named_officer_state_by_id`.
- **Design rule:** Never suggest promoting an elite commander to corps or giving them operation command. The permanence is the point — these are the brigade's identity.

## 2026-03-15 - Combat death policy: casualty_vulnerability vs available_until_turn

- **`available_until_turn`** = organizational replacement. The officer's departure is a political or administrative decision: transfer, retirement, reassignment, loss of confidence. Creates a `replacement_suggested` event for the player faction. Deterministic timing.
- **`casualty_vulnerability`** = combat death risk. The officer may die during the simulation based on combat exposure and this probability modifier. Higher values (0.25-0.30) for officers historically KIA early. Organic and probabilistic — the officer might survive in an alternate history.
- **Never combine both for KIA officers.** Using `available_until_turn` to model a combat death creates a deterministic death date — the officer always dies at that exact turn. This violates the simulation's principle that combat outcomes should emerge from gameplay. Officers who historically died in combat (Nanić KIA Oct 1995, Hujdur KIA Sep 1993, Šehović KIA Aug 1992) use only `casualty_vulnerability`.
- **When to use `available_until_turn`:** Halilović replaced by Delić (political decision, turn 60). Talić replaced by Kelečević (transfer/death outside combat zone). Blaškić replaced by Filipović (political reassignment).

## 2026-03-15 - Orden heroja oslobodilačkog rata — all 9 recipients documented

- Bosnia's highest military decoration, awarded to 9 individuals (all ARBiH). All are now in the officer roster.
- **KIA recipients (3):** Safet Hadžić (KIA Apr 1992, Pretis factory), Mehdin Hodžić (KIA May 1992, Zvornik), Adil Bešić (KIA Nov 1992, Bihać). All have elevated casualty_vulnerability (0.25-0.30).
- **Survivors (3):** Hajrudin Mešić ("Zmaj od Majevice", 2nd Corps), Safet Zajko (1st Corps, 2nd Motorized), Nesib Malkić (2nd Corps, 210th Mountain).
- **Previously in roster (3):** Izet Nanić (5th Corps, KIA 1995), Midhad Hujdur "Hujka" (4th Corps, KIA 1993), Enver Šehović (3rd Corps, KIA 1992).
- **Design note:** The decoration is informational only — no gameplay modifier. It serves as a historical marker in officer profiles. The `casualty_vulnerability` field independently handles the elevated combat risk these officers faced.

---

## Equipment Acquisition & Degradation (2026-03-18)

### Per-brigade scaling is explosive
Any mechanic that gives +N per brigade per tick scales linearly with brigade count. ARBiH mobilizes from 74→125 brigades, so a "modest" +1 tank/16 turns becomes +125 tanks/tick. **Always use faction-level capped budgets** for production, never per-brigade.

### Three historical equipment sources for ARBiH
1. **Battlefield scavenging/capture** — recovering destroyed/abandoned VRS equipment after battles. Primary source of tanks. Both attack wins (capture from retreating defenders) and defense wins (recovering from repulsed attackers) produce equipment.
2. **Arms smuggling pipeline through Croatia** — Iran, Pakistan, black market. HVO/Croatia skimmed ~40% of every shipment. Split: 60% ARBiH, 40% HVO.
3. **Zenica steelworks** — local production of improvised mortars and howitzers. Artillery only, no tanks.

### RS equipment trajectory
VRS inherited ~677 tanks (520 in OOB + 157 from JNA phantom handoff). No new production (Serbia under sanctions). Should decline through: combat losses (~8% per battle), maintenance degradation (spare parts shortage), and write-off of non-operational vehicles. By w40: ~539 total, ~286 effective. Maintenance capacity declines to 0.74× by w52, 0.50× by w100.

### Equipment condition vs count
The degradation system (operational/degraded/non_operational) shifts condition fractions but by itself never removes equipment from the count. A tank at 0% operational is still a tank in the count. Write-off mechanic needed: permanently scrap equipment when degraded+non_operational exceeds 40%. Small formations (≤10 units) exempt — they maintain their few vehicles carefully.

## Civilian Casualty Modeling (2026-03-18)

### Kill fraction asymmetry is essential
Not all ethnic displacement has the same lethality. The Bosnian War's civilian deaths were overwhelmingly Bosniak (~75%), with Serbs (~20%) and Croats (~5%) much lower. Kill fractions must reflect this:
- RBiH displaced by RS: 4% (systematic ethnic cleansing — Prijedor, Zvornik, Foca, Visegrad)
- HRHB displaced by RS: 1% (expulsion, lower systematic killing)
- RS displaced by non-RS: 1% (mostly voluntary flight)
- Default: 2%

### Fled abroad vs killed must be tracked separately
Serbs having the highest fled_abroad count is correct (Serbia next door). Bosniaks having near-zero fled_abroad is correct (no neighboring state). Lumping both into a single "lost" field masks the difference between killing and displacement.

### Multiple tracking systems must all update all stores
If `civilian_casualties` and `displacement_event_log` both exist, every code path that generates civilian casualties must write to BOTH. Paramilitaries wrote to one, old displacement wrote to the other. Result: 3,700 phantom gap between systems.

## Essay Sourcing & QA Methodology (2026-03-26)

### Source hierarchy for Codex essays is non-negotiable
All 96 Codex essays are now standalone JSON (13 missing 1992 foundation events authored in this night shift). Source hierarchy: ICTY trial verdicts and judgments FIRST (legal record, cross-examined testimony), museum primary sources in B/C/S second (e.g., Sarajevo Tunnel Museum records overrode Wikipedia on tunnel construction date and codename), Balkan Battlegrounds third, Wikipedia last resort. When sources conflict, always escalate upward. Wikipedia is especially unreliable on Bosnian War operational details — dates, unit identities, and command attributions are frequently wrong.

### 3-pass QA audit catches errors that single-pass misses
The essay QA used 5 rounds per pass: (1) historian fact-check with parallel agents, (2) operations expert military accuracy, (3) web/ICTY verification, (4) war-or-game realism audit, (5) geographic/directional sanity check. Critical finding: first-pass "fixes" can introduce new errors. The Stupni Do "Apostoli" unit was removed as fabricated in Pass 1, then restored in Pass 2 when ICTY indictment confirmed both Apostoli and Maturice units. Sharp Guard predecessor names were corrected incorrectly twice before Pass 3 got them right. **Lesson: multi-pass verification is not redundant — each pass catches errors introduced by the previous pass.**

### Essay voice: documentary, not academic
No hedging language on ICTY-adjudicated facts. "The massacre killed 116 civilians" not "it is believed that approximately 116 civilians may have died." Documentary parity across factions — RS atrocities documented with the same clinical precision as ARBiH or HVO actions. 800-870 words per essay, standalone JSON with metadata (week, factions, category, prerequisites).

## Canon Audit: phase0 to early_war Rename (2026-03-26)

### "Phase 0" was a misleading abstraction
The simulation had a concept called "phase0" that predated the war phases. In reality, there is no pre-war phase in the simulation — what was called "phase0" IS the early war (April-June 1992: JNA withdrawal, militia emergence, authority vacuum). The name implied something before the war started, but the mechanics were all wartime: mobilization, territorial control shifts, ethnic displacement. Renaming `peace_phases` to `early_war_phases` and deleting all `phase0` references (11 src files, 3 scenario files, 16 test files, 3 warroom files) eliminated a persistent source of confusion about what the simulation actually models.

### Scope of a naming cleanup can be deceptive
What looked like a simple rename touched 33+ files across src, scenarios, tests, and warroom. The `phase0` concept had metastasized into type definitions, pipeline step names, scenario JSON fields, and test assertions. A "just rename it" task becomes a full audit when the old name is load-bearing in serialized data (scenario JSON) and runtime type checks. Always grep exhaustively before declaring a rename complete.

## Deterministic Vignette Generation (2026-03-26)

### Multiply-by-primes hash replaces Math.random for UI content
The Letter Home system generates casualty vignettes (personal narratives about fallen soldiers) deterministically using a hash function that multiplies character codes by prime numbers. This is critical: `Math.random()` is banned in simulation code, but the vignette system needed apparent randomness for template selection, name generation, and detail variation. The multiply-by-primes approach (seed from turn + brigade ID + casualty index) produces well-distributed values without any entropy source. Same game state always produces the same letters — saves and replays are byte-identical.

### UI-side rendering from adapter data, not sim state
Vignette content is generated in the UI layer (adapter/renderer), not in the simulation engine. The sim provides structured casualty data (type, brigade, turn, count); the UI's Letter Home engine selects templates, names, and details. This separation means the sim state stays lean (no string bloat) and the vignette system can be iterated without touching simulation code. 25 templates (5 per casualty type: KIA, WIA, MIA, captured, missing) + 9 name pools (3 ethnicities x 3 name types: first/last/patronymic).

## Integration Test Architecture (2026-03-26)

### Integration tests run full scenario slices, not unit mocks
The 5 original integration suites (scenario round-trip, event system, save/load, pool integrity, formation integrity) plus 4 new suites (deployment health, run diagnostics, run summary, state assertions) all instantiate the real scenario runner and advance the simulation by N turns. No mocking of GameState, no stubbed combat resolution, no fake event triggers. This catches the class of bugs that unit tests structurally cannot: pipeline ordering issues, state mutation side effects, event-combat interaction timing, and serialization round-trip fidelity.

### Integration tests are the last gate before calibration runs
The smoke-test triad (`tsc --noEmit` + `vitest run` + `desktop:map:build`) catches type errors, unit regressions, and build failures. But integration tests catch semantic regressions: "the scenario still runs to completion," "events still fire at the right week," "save/load produces identical state," "no brigade has negative personnel." These are the tests that would have caught the displacement phantom gap (3,700 missing casualties between two tracking systems) if they had existed earlier.

## Roadmap Assumptions Must Become Named Work (2026-03-31)

### Silent assumptions create implementation drift
If the roadmap says later milestones “assume” coherence, explanation, review, or determinism surfaces without naming those as explicit work, implementers will fill the gap differently or skip it entirely. Fix by converting hidden prerequisites into named roadmap lanes with linked plans and done-means. This is especially important for command hierarchy, explanation UI, and API-assisted autonomy where polished behavior can hide unresolved ownership.

### Hidden prerequisites need one plan each when ownership differs
If a “missing item” really contains different owners or different milestone slots, do not hide them in one umbrella plan. Split them into separate plans so roadmap slotting, done-means, and reviewer responsibility stay unambiguous.

## Gold Blockers Must Be Slotted Before Gold (2026-03-31)

### Stubs and partial systems are not harmless if v1.0 promises them
If the roadmap still says `save/load: partial`, `victory conditions: stub`, or `tutorial: not started` while `v1.0` promises a ship, those are not background imperfections. They are gold blockers. Move them into named roadmap lanes early enough that later features do not quietly depend on them.

### UI ownership must be explicit when multiple command surfaces coexist
When Army HQ, Warroom, map panels, and modal flows all exist, roadmap-level ownership must be explicit or each new feature will duplicate logic in a different place. A surface ownership matrix is an architectural dependency, not just UX cleanup.

## Sector-Anchored Corps Operations (2026-04-01)

### The right fix for loose corps ops is stricter launch semantics, not sector sovereignty
If broad corps-launched operations feel too detached from frontage truth, the answer is not to let sectors become independent launch authorities. The cleaner model is: corps remains the sole launch authority, every operation names a `primary_sector`, the default brigade pool comes from that sector, and non-primary brigades join only as explicit reinforcements or attachments. This preserves hierarchy while grounding the op locally.

### Operations should be sector-anchored, not sector-imprisoned
Hard sector-only launch rules are too rigid for real concentration of effort. Real operations may draw from neighboring frontage or reserve brigades, but those additions must be explicit and visible. The canonical pattern is: primary sector defines the local identity and default pool, while adjacent-sector or reserve brigades appear as tagged attachments with visible risk transfer elsewhere.

## BFS Territory Assignment — Corps Home Municipality Coupling (2026-03-26)

### A single brigade in the wrong corps cascades BFS territory through entire municipalities
The `mapOsidsToCorps` BFS in `sector_territory.ts` uses a `homeMunCorps` guard: municipalities are claimed by the corps whose brigades are homed there. A single brigade in the wrong corps (e.g. `rs_2nd_romanija_brigade` assigned to `vrs_drina` instead of `vrs_sarajevo_romanija`) causes the BFS to claim the entire municipality and cascade into adjacent territory. The Sokolac→Sarajevo cascade gave Drina Corps the Sarajevo siege ring. Fix: correct the OOB data. The BFS logic itself is correct — it faithfully propagates from home positions.

## Hidden Internal Caps in Utility Functions (2026-03-26)

### Utility functions with internal limits can silently disable constant changes in their consumers
`bfsDistance()` in `sector_utils.ts` had an internal `maxDepth = 10` that silently capped distance calculations regardless of the caller's intent. `MAX_REDISTRIBUTION_DISTANCE` was raised from 8 to 20, but the change was a no-op until the BFS internal cap was also raised. Pattern: utility functions with internal limits can silently disable constant changes in their consumers. Always trace the full call chain when adjusting thresholds.

## Silent Pipeline Drops — The Invisible Brigade Problem (2026-03-26)

### Calibration % means nothing if reached through broken mechanics
Phase 2 surplus allocation in `brigade_assignment.ts` silently dropped brigades when `reachable.length === 0`. A variable `unmatched` existed but was never consumed. These brigades vanished from the assignment pipeline — no sector, no warning, no diagnostic trace. The 91.7% calibration was inflated because these brigades' absence meant fewer incorrect deployments were visible. Fix: force-assign with cross-component fallback + console.warn. Golden rule: calibration % means nothing if reached through broken mechanics.

## Sector-Coverage Defense and Cross-Faction Spawning (2026-03-27)

### Sector-coverage defenders must NOT be displaced
Sector-coverage defenders project defense remotely — they are not physically at the attacked OSID. When a remote OSID flips, displacing the covering brigade causes it to abandon its actual position, creating walk-in opportunities at adjacent OSIDs (e.g. Gradačac). Fix: skip physical displacement for brigades contributing via sector coverage only.

### Cross-faction pools need both pool creation AND spawn bypass
HRHB brigades in RBiH-controlled municipalities (e.g. 107th, 101st Bihać, 110th, 115th) face a chicken-and-egg problem: `canFormEmergentBrigade` checks for faction municipal presence, but these brigades ARE the faction presence. Two fixes required in tandem: (1) 5x mobilization multiplier for HRHB pools in RBiH municipalities to seed the pool, and (2) `mandatory:true` OOB flag to bypass the `canFormEmergentBrigade` gate in `recruitment_engine.ts`.

### Enclave brigades bypass factionHasPresenceInMun
Enclave brigades (e.g. 255th Slavna at Teočak) spawn in enemy-controlled territory by definition. Code sites that gate on `factionHasPresenceInMun` must check for `tags.includes('enclave')` and bypass the gate. Three sites identified and patched.

### Elite brigades bypass canFormEmergentBrigade
Elite/professional units (e.g. Black Swans) are not municipality-pool formations. They bypass `canFormEmergentBrigade` because their existence is not contingent on local demographic pools. The elite pool gate must also be bypassed for loan deployments to operations.

### deployment_osid enables initial placement override
The `deployment_osid` OOB field separates identity (home_osid, used for municipality affinity and pool linkage) from initial physical placement. Elite brigades loaned to operations deploy at `deployment_osid` while retaining home identity. This enables ops-injection without teleporting the brigade's conceptual origin.

### garrison tag pins brigades via evaluateGarrisonAndDetachments
The `garrison` tag causes `evaluateGarrisonAndDetachments` (which fires before `evaluateSectorMarch` in the brigade AI pipeline) to hold the brigade at its current position. Combined with `enclave` tag, this pins enclave garrisons in place — they defend but do not march toward distant sector fronts.

### Supply filter architecture
The operation launch pipeline in `bot_corps_directives.ts` has a supply filter that excludes brigades from the operation pool. This filter runs AFTER the diagnostic trace is written (`op_launch_trace`), making supply-caused failures invisible to diagnostics. The supply derivation classifies 94% of RBiH territory as `strained` (historically correct — arms embargo). Only `critical` should be excluded from operations; strained is handled by the 0.75x combat multiplier in `getSupplyMult()`.

### Probe lifecycle ownership
Probes and feints are lifecycle-managed by `advanceSectorOffensives` in `sector_offensive.ts`. They must be skipped in `evaluateOperationProgress` (`bot_corps_operations.ts`) to avoid double phase transitions and double exhaustion costs. The skip condition at line 218 must include all operation types managed by the sector offensive system: `sector_attack`, `probe`, `feint`.

### Bilateral casualty scaling
`getPowerRatioCasualtyMult()` in `combat_math.ts` returns `[attackerMult, defenderMult]` using cube-root scaling (exponent 0.33). Both values must be applied — attacker to attacker casualties, defender to defender casualties. The attacker multiplier REDUCES attacker casualties when they have superior power (models the advantage of overwhelming force). The defender multiplier INCREASES defender casualties when outmatched. Clamped by POWER_RATIO_CASUALTY_MIN=0.6 and MAX=2.0.

### Point-only polygon contacts are not real adjacency (2026-03-28)
The `operational_contact_graph.json` has 46 edges with `min_dist=0` that are **point-only contacts** — two OSID polygons share a single snapped vertex but NO actual boundary segment (0 consecutive shared vertices). These are data artifacts from polygon derivation, NOT real geographic adjacency. 12 of them are cross-faction, creating phantom front edges between OSIDs that don't actually touch. Key example: `op:kalinovik:sela_2` and `op:kalinovik:golubici_2` share exactly 1 vertex at `[18.293588, 43.472983]` but 0 boundary segments. The contact graph says `min_dist=0` (adjacent), but RS territory (Obalj, Ljuta) lies between them. This caused sector `arbih_1st_corps:7` to bridge Trnovo and Kalinovik into one sector. **Fix**: enrich the contact graph with `shared_segments` count per edge. Use `shared_segments >= 1` (not `min_dist === 0`) for all adjacency — sector edges, territory contiguity, front edge generation. Stats: 46 point-only contacts, 1,979 real segment contacts. Related to n1029 (min_dist enrichment) — this is the next layer of contact graph integrity.

## [2026-03-29] Concurrent Corps Operations — Architectural Lessons

### Garrison Cannibalization Pattern
Corps AI overcommits brigades to operations, stripping sector garrisons. Three compounding gaps: (1) no garrison holdback at op launch — all available brigades enter op pool, (2) post-op drift lock — brigades left at op endpoint, sector-assigned by current location, then exempt from home recall, (3) large early-war ops scatter units across the map. The 6th Sanske Infantry (home: Sanski Most) was transferred to 1KK and sent to Derventa, leaving Sanski Most undefended for 40 weeks.

### Paramilitary Scope Matters
RS offensive paramilitary scope was hardcoded to Drina valley only, excluding the entire Krajina region. Expanding scope to include Prijedor/Sanski Most/Ključ immediately fixed a 6-OSID undefended pocket and added +3pp to calibration. The Krajina ethnic cleansing was one of the most documented campaigns of the war — the simulation simply wasn't modeling it.

### Anomaly Detector Blind Spots
26 anomaly checks existed but none compared sim results against painted targets. Undefended territory held by inertia (no defender, no attacker walking in) was invisible to all checks. Two new checks (#27 undefended_painted_mismatch, #28 adjacent_uncontested_territory) now catch this class of failure.

### Column March Skip Prevents Trivial Captures
`bot_brigade_ai_osid.ts:441-444` skips column-marching brigades entirely — they never evaluate uncontested occupation. A brigade marching past undefended enemy territory cannot capture it, even at zero cost. This is a systemic issue for any turn where brigades are reassigned between sectors.

## [2026-03-30] Commander Slot Cap — Recovery Phase Must Not Count

### Slot cap lifecycle interaction
The commander's slot cap (`getMaxOperationSlots`) counts ALL entries in `briefing.active_operations`, including ops in `phase: 'recovery'`. Recovery-phase ops are completed — they've finished execution and are cooling down before `advanceSectorOffensives` removes them (after `RECOVERY_DURATION` turns). Counting them as "active" for capacity purposes creates a 2-3 turn blackout per op cycle. With cap=1 for a typical 12-brigade corps, this compounds into multi-week combat droughts. Fix: `briefing.active_operations.filter(op => op.phase !== 'recovery')` for the slot cap check only — recovery ops should still be visible to briefing for other purposes (e.g. not re-planning the same objectives).

### Implication
Any slot cap, throttle, or concurrency limit applied to an array with a multi-phase lifecycle must explicitly define which phases consume capacity. Planning + execution = real capacity. Recovery = cooldown bookkeeping.

## [2026-03-30] Fix 2 (operation_history) — Write Without Read

### Operation history is currently inert
`emit.ts buildUpdatedState` correctly writes `OperationHistoryEntry` records (outcome: 'abandoned'/'partial', osids_lost = targeted OSIDs). These are persisted in `corps.commander_state.operation_history` (capped at 20). However, `plan.ts selectOpportunityTargets()` does NOT query this history. It reads only `zone.enemy_adjacent_osids` from the current spatial state. There is no cooldown that prevents a plan from re-targeting an OSID that appeared in `osids_lost` in the last N turns. The feedback loop is half-implemented: writer exists, reader does not.

### What the reader needs to do
`plan.ts` should filter `candidateOsids` against a recent-failure set derived from `briefing.previous_state?.operation_history`. An OSID that appears in the last 2-3 history entries' `osids_lost` should be on cooldown (skip for N turns). This prevents the Bihać paralysis pattern (5th Corps targeting brekovica_2 across 6 op generations).

## [2026-04-01] Deck counter visibility must not differ between normal and highlighted state

When Deck owns brigade counters, the base Deck layer and the highlighted Deck layer must render from the same formation visibility set. Rendering only `is_stack_top` in the base layer while rendering the full formation set in the highlighted overlay creates a hidden second visibility mode: units appear to vanish in normal map state and reappear when corps/sector/OOB selection highlights them. The invariant is simple: highlight may restyle a unit that is already visible, but must never be the thing that makes that unit visible in the first place.

## [2026-04-01] Hover context must not share the Deck white-counter path with selection

Deck brigade whitening and line-hover emphasis are different concepts and must not share the same highlighted id set. A broken version of `MapContainer.tsx` fed `hoveredSectorId` / `hoveredCorpsId` into the same highlighted formation list used for Deck white counters, and `buildTacticalDeckLayers.ts` also let the base Deck icon layer swap to white icons from that set. That made transient hover behave like selection and caused visible brigade flicker. Rule: hover may emphasize lines or contextual focus, but only selected brigade / sector / corps state may whiten brigade counters.

## [2026-04-01] Corps selection must be corps-owned, not sector-derived

Corps selection and sector selection are not interchangeable. A broken version of the map highlight bridge derived corps-selected brigades indirectly from sector membership, which omitted reserve or otherwise non-sector-assigned brigades that still belonged to the corps. Rule: sector highlighting may rely on `sector_id`, but corps highlighting must have direct access to `corps_id` and select all corps-owned brigades whether or not they currently sit in a sector assignment.

## [2026-04-01] Idle Army HQ reserve brigades are legitimate sectorless exceptions

The current architecture does not make `sector_id` universal. Unloaned elite reserve brigades in `arbih_general_staff`, `vrs_main_staff`, and `hvo_main_staff` are intentionally exempt from normal sector ownership until they are loaned to a field corps. Inactive/forming brigades may also lack sector assignment. Treat missing `sector_id` as a bug only for active, non-exempt field-corps brigades. This resolves the contradiction between sector comments claiming universality and the actual army-reserve loan design.
## Player Knowledge Integrity (2026-04-01)

### Fog is not a substitute for a player-facing state boundary
If the renderer receives near-full game truth and the UI merely draws fog polygons over it, the product is still architecturally omniscient. A player-facing wargame must distinguish between simulation truth and player-visible truth at the data-boundary level, not just at the rendering layer.

### Raw ids in player UI are a systems smell, not a cosmetic nit
Strings like `arbih_3rd_corps`, raw `sector_id`, raw `axis_1`, or backend assignment ids leaking into normal UI mean the display layer is still coupled directly to engine identifiers. Treat this as a contract violation. Player-safe surfaces render display names; raw ids belong only to explicit debug/dev views.

### Tactical map, Warroom, and Codex must share one honest information contract
Navigation and information ownership are linked. If standalone tactical map has no clear return path, or Codex survives only as a hidden shortcut, the shell architecture has drifted. Player knowledge integrity is not just a payload issue; it also requires explicit UI ownership of where intelligence, records, and command review live.

### Threat assessment should speak in friendly-front abstractions
Army HQ threat views may consume deeper engine truth, but the player-facing wording should stay anchored on the player's fronts: `3rd Corps front - hostile operation in execution`, not enemy corps ids or enemy operation names. The UI may know more than it says; that translation layer is part of product honesty.

## Studio Truth Governance (2026-04-01)

### A few short contracts beat a lot of remembered advice
If product-truth rules only live in chat, audits, or reviewer instinct, they will be forgotten. The durable fix is to keep a small set of governing docs that define player-visible state, canonical UI ownership, debug-only surfaces, and the fixed completion block for serious work.

### Every serious change should answer the same five lines
The minimum owner-friendly completion language is:
- Canonical owner
- Demoted path
- Player-visible truth
- Canonical UI surface
- Done means

If a task cannot answer those five lines, it is not actually ready to be called done.

## Engine Health Wave 1 (2026-04-02)

### Objective-specific intel should degrade gracefully, not collapse to fake blindness
Preparation logic should prefer the intel record that actually faces the targeted enemy sector when the engine can resolve the objective honestly. But thinner state slices and older tests may not carry enough geometry/controller structure to map objective OSIDs back to enemy sectors. In that case, the honest fallback is “best known facing-sector intel,” not `0`. This preserves objective relevance without making the engine lie that it knows nothing.

### War termination must read the political exhaustion ledger, not shadow profile fields
If victory logic reads `formation profile exhaustion` while the political layer maintains canonical `war_exhaustion`, the engine can end a war from stale or shadow state. Treat `state.political.war_exhaustion` as authoritative everywhere strategic termination matters; keep legacy profile exhaustion only as compatibility fallback.

### Launch feasibility is strategy truth, not just combat tuning
Corps offensive go/no-go checks that ignore obvious defender artillery, entrenchment, and terrain bonuses are not merely “undertuned” â€” they are epistemically wrong. Feasibility screening is part of command honesty. If those defender advantages are known enough to affect real headquarters decisions, they belong in launch screening, not only in later combat resolution.
### A derived report that nobody consumes is not implemented truth yet
`supply_by_osid` reaching the commander briefing looked like good architecture, but until brigade fitness actually read local supply state by brigade location, the commander was still making decisions from a fake default. In this repo, always inspect the last consumer in the chain. A data report is only real when the scorer, planner, or UI surface that claims to depend on it actually reads it.

### A typed strategic field pinned to a placeholder constant is decorative, not alive
`recent_territory_change` in Army HQ gathering looked like strategic-awareness scaffolding, but while it stayed hardcoded to `0` it was only decorative architecture. The right repair was not to invent a giant new subsystem; it was to feed the field from the existing `political.control_events` stream, scoped to each corps's current front neighborhood. In this repo, always ask whether a field is powered by live events or merely present in the type system.

### Army HQ intent must reach `CommanderBriefing` as structured targets, not only as stance flavor
If `CampaignPlan` only affects corps stance ceilings, the strategic layer still talks mostly to itself. The corps commander needs structured Army HQ intent in its briefing: front role, offensive targets, hold targets, and synchronized-op slice. The safest first implementation is to thread those fields into `CommanderBriefing`, merge campaign hold targets into `must_hold_osids`, and use offensive targets to bias opportunity staging/target choice without removing corps autonomy.

### Corps reinforcement requests are only real once Army HQ can hear them
`DecisionResult.reinforcement_requests` and `CommanderOutput.reinforcement_requests` already existed, but until `applyCommanderOutput(...)` persisted them into `CorpsCommandState`, Army HQ gathering had no way to consume the signal. The honest contract is: corps commanders may emit reinforcement pressure each turn, corps state persists it, and Army HQ reads it as a strategic pressure signal for front-role shaping. Do not short-circuit that by pretending these are already the same object as `pending_reserve_requests`; that older reserve-loan queue is a downstream Army HQ decision surface, not the raw corps signal.

### Corps exhaustion must travel through the briefing contract, not just legacy launch gates
The older corps-op path already respected `MAX_EXHAUSTION_FOR_OPERATION`, but the newer commander-planning path was missing the same truth because `CommanderBriefing` did not carry `corps_exhaustion`. Treat exhaustion as part of what the commander knows, not just a late launch veto in older code. If a corps is too exhausted to launch, it should also be too exhausted to create a fresh offensive plan.

### Re-check “dead mechanic” audit findings against live consumers before implementing them
Engine-health audits are valuable, but in a fast-moving repo an old true finding can become half-stale after downstream consumers are added. The feint audit item is the current example: feints are still underpowered, but they already flow through sector intel into `offensive_signs`, commander `concentration_detected`, and `fortify` reactions. Before spending a checkpoint on a “dead” mechanic, prove whether it is still dead, only weak, or already consumed.

### Commander briefing must distinguish enemy frontage from enemy quality
Brigade counts and front pressure are not enough for honest planning. If the briefing cannot tell a lightly held infantry sector from an artillery-and-armor heavy sector, the commander will size operations as if every enemy front were the same. Adjacent enemy heavy equipment should be summarized in the briefing contract and allowed to raise the required brigade mass for new offensives.

### Shared label helpers are cheaper than another anti-leak sweep
Player-facing raw-id leaks often survive not in the main happy-path labels, but in fallback strings and secondary shells like Warroom. If map and Warroom each improvise their own `?? id` fallback, raw corps or sector ids will eventually leak back in. Centralize player-facing corps / sector / assigned-command label translation in one shared helper and make fallbacks generic (`This corps`, `Assigned sector`, `Assigned command`) rather than engine identifiers.

### Omniscient UI stores must be filtered before global player panels render
If `LoadedGameState` still carries full-faction operation truth, any global player-facing list such as the standalone Operations panel must filter by `player_faction` before rendering. Otherwise the adapter can stay omniscient while the panel silently becomes a cheat surface. Until a real player-visible state boundary exists, panel-level filtering is part of the product contract.

### Sidebars grouped by all factions are debug shells in disguise
If an Army / Operations / Sectors rail groups content by RS, RBiH, and HRHB inside normal player mode, that surface is leaking omniscient truth even when individual cards look polished. Treat all global rails and overlay builders as player-faction-only by default; opt into debug omniscience explicitly elsewhere.

### Focused regression files are safer than trusting broad legacy suites
Some long-lived node:test suites in this repo already carry unrelated failures or stale expectations, which makes them weak gates for new engine-health work. When fixing a subtle split-truth bug, add a small focused regression file and wire it into the Vitest whitelist, rather than pretending a noisy broad suite proves the new invariant.

### Launch feasibility must be checked against the final participant set
If launch screening runs before enclave filters, reserve trimming, or other participant narrowing, the operation can be approved based on brigades that never actually join it. In AWWV, feasibility is only honest when it is evaluated on the real participating brigade set.

### Objective-specific prep logic must stay objective-specific all the way down
It is not enough for intel confidence to be objective-aware if force-ratio estimation still sums defenders from every facing sector on the front. Preparation math should use one shared notion of “which enemy sectors this operation is actually targeting.”
### Player-facing fog only matters if formation rendering consumes it
If the tactical map builder ignores `fogOfWar.visibleEnemyOsids` and renders every formation in `LoadedGameState`, then fog is just decorative paint over an omniscient renderer. Player-owned formations can render unconditionally; enemy formations should render only when the player-visible state boundary explicitly exposes them.

### Summary chrome leaks just as badly as detail panels
Bottom strips, overview cards, and situation tabs often get treated like harmless dashboard furniture, but they are where omniscient territory percentages, casualty ledgers, and operation totals quietly leak back into player mode. Product-truth sweeps must include those summary surfaces, not just the obvious tooltip/detail panels.

### Tooltip cards are player surfaces, not debug exceptions
Hover cards feel small, but players experience them as authoritative UI. Treat formation, settlement, and front tooltips exactly like any other player-facing panel: own truth may be detailed, enemy truth should collapse to contact-level abstraction unless a deliberate player-facing design says otherwise.

### Settlement timelines can re-leak omniscient truth even after the visible card looks clean
Filtering stationed units and pending orders is not enough if the same selected-settlement panel still forwards raw operation history or brigade movement logs into its timeline tab. For dossier-style surfaces, protect every tab at the input boundary, not just the first screenful of content.

### Warroom contact snapshots should be abstract before they hit the UI
If `extractWarData()` hands Warroom exact enemy formation names or ids, every report or magazine renderer has to remember not to print them. Fix that once at the snapshot boundary: make hostile contacts player-facing by construction (`Enemy contact` + strength/location context), then let every downstream Warroom surface consume the same safe contract.

### Records panels are debug shells unless they consume player-scoped history helpers
Operation history and active-op ledgers feel archival, which makes them easy places for omniscient truth to survive. If a records panel reads global operation arrays directly from `LoadedGameState`, it is still a debug shell. Route those surfaces through the same player-visibility helpers used elsewhere.
### Compatibility sinks are still dangerous if they refresh timestamps

In AWWV, a legacy helper can look harmless because it only computes zero deltas, but it still becomes a second authority path if it updates canonical state metadata like `last_updated_turn`. A compatibility sink is only honest when it consumes old calls without mutating live truth at all.

### Hard-disabled mechanics are architecture debt, not neutral safety rails

When a mechanic survives in types, comments, and docs but the live branch is effectively `false && ...`, the repo becomes more misleading than if the mechanic had simply been deleted. In AWWV, treat these as engine-health bugs: either remove the decorative path or replace it with a narrower honest discriminator. The engine `must_hold` repair is the model case — revive the signal only with a corps-boundary-aware test that can explain why it fires.

### Commander intelligence gets fake quickly when local briefings hide neighboring friendly reality

A corps AI that sees enemy pressure but not adjacent friendly corps posture will look “decisive” while still planning in a vacuum. The honest first step is not full multi-corps coordination; it is making neighboring corps stance and active-op load part of the briefing contract. In AWWV, proximity-based adjacent-corps summaries are cheap, deterministic, and much better than pretending local commanders operate alone.

### Retired player commands must fail early, not stage successfully and vanish later

If a command reaches desktop IPC, serializes into state, shows up in adapters, and only then disappears in a no-op war-phase sink, the product has already lied to the player. In AWWV, retired commands like brigade reposition should be rejected at the earliest contract boundary with a clear replacement path, and player-facing adapters should stop surfacing their stale save data.

### Commander reinforcement pressure and elite reserve requests are not the same thing, but they must connect

`commander_reinforcement_requests` on `CorpsCommandState` are the raw corps-to-Army-HQ pressure signal. `pending_reserve_requests` in the elite loan system are the downstream Army HQ reserve-action surface. Treating them as separate is correct; leaving them disconnected is not. The honest contract is: corps commanders persist reinforcement pressure, Army HQ theater assessment reads it, and the elite reserve queue must also consume it when generating candidate reserve loans.

### Recent territorial change only matters if front-role scoring actually consumes it

Computing `recent_territory_change` in theater assessment is not enough by itself. If Army HQ front-priority scoring ignores that field, the theater layer will still rank a bleeding corps like a normal offensive opportunity front. In AWWV, territorial trend must be consumed where roles are assigned, and any doc that points this gap at the wrong subsystem becomes a future bug magnet.

### Fence half-dead legacy helpers with static tests before they get reused

If a legacy helper still has one tolerated compatibility consumer, future refactors will be tempted to import it again because it “already works.” In AWWV, that is exactly when a dead authority path comes back to life. Prefer a small static regression gate that names the allowed consumer set explicitly, so the next accidental import fails fast instead of silently reviving old truth.
### Player-facing fallback strings are where raw engine ids sneak back in

The obvious primary labels can look clean while Army HQ headings, reserve requests, briefing alerts, or enclave summaries still do `?? corpsId` or `?? enclaveId`. In AWWV, treat fallback text as a governed player-safety surface: use one tiny pure helper layer and neutral fallbacks like `This corps`, `Friendly enclave`, `Assigned command`, and `Assigned brigade` instead of reprinting engine identifiers.

### Transitional operation creators are more dangerous than dormant sinks

The worst legacy combat files are not the inert no-op sinks; they are the older creation paths that still produce real operations while skipping newer canonical fields. In AWWV, every permitted operation creator must satisfy the same core contract as the canonical lifecycle owner. Emergency defensive ops in `bot_corps_operations.ts` were a model example: still live, still side-effecting, and still creating unanchored operations until they were forced to derive `sector_id` from the participant brigades.
### Stale regression suites are dangerous when they still look authoritative

The scripted-operation node:test suites were still enforcing an older catalog (`9` pre-planned ops, triggered `Operation Jajce`) and older queue truth long after the live engine had moved on. In AWWV, a stale regression file is not neutral documentation; it is an active source of wrong confidence. If a suite still looks canonical, modernize it to current truth or fence it off explicitly.

### Summary chrome lies just as easily as detail panels

Warroom `ownSupply` looked harmless because it was only a summary box, but it was still counting municipalities outside the player’s control. In this repo, overview numbers are not safer than detail tabs. If a summary panel says `own`, it must be scoped to the player’s actual holdings, not global state.

### Queued-order lists are player surfaces too

Raw formation ids do not stop being leaks just because they appear in a small order queue instead of a marquee panel. Order rails, badges, and miniature lists are still part of the product shell. If a player-facing list needs a fallback, use neutral brigade text rather than engine identifiers.

### Canonical contracts only become real after the last “special case” disappears

It is not enough for “most” operations to carry `sector_id`. As long as probe ops or some other live creator can still omit the field, every downstream system has to keep treating the contract as optional. In AWWV, the last exception is usually the most dangerous one because it teaches future work that the rule is negotiable.

### Summary-shell labels are still product truth, not harmless chrome

Players trust the small overview boxes as much as the big detail panels. If a summary card prints raw `mun_id`, enclave slugs, or route-faction codes, the product is still leaking engine truth even when the deeper surfaces are clean. In AWWV, municipality/enclave/corridor fallback text belongs in one shared player-safe helper layer so overview panels do not quietly improvise their own raw-id leaks.

### Validation-only retirement still leaves a fake command alive

If validation rejects a command but preload, IPC clients, and the main process still advertise it, the repo is still teaching future work that the mechanic exists. In AWWV, a retired command is only honestly retired when the earliest desktop/UI boundary stops exporting it entirely.

### Exempt reserve corps must not be judged by field-corps invariants

Army-HQ reserve formations like General Staff / Main Staff brigades are intentionally allowed to exist without front sectors until they are loaned into field-corps command. If a player-facing alert blindly says every active brigade-bearing corps must have sectors, the UI becomes the liar. In AWWV, reserve-corps exceptions should live in pure briefing policy and be regression-tested there.

### Deception mechanics are fake until they touch a live pressure currency

Feints can look “implemented” because they exist in types, intel, and UI language, but that still means very little if they never alter the same values that reserve requests, threat balancing, and command caution actually consume. In AWWV, the honest repair path is to wire feints into `threat_ratio` or another existing canonical pressure signal instead of inventing a decorative side effect.
### Transitional operation creators must obey the same anchor contract as canonical ones

In AWWV, the most dangerous legacy combat files are not dead sinks but older creator paths that still birth real operations while skipping newer required fields. Corridor-breach operations were one such case: still live, still side-effecting, and still creating ops without `sector_id` until explicitly repaired. Treat every permitted operation creator as part of the same canonical contract surface.

### Test discovery rules are authority surfaces too

If test discovery is manual, the config becomes a silent second owner of correctness: a regression file can exist in `tests/` and still never run. As of 2026-04-03, this repo's Vitest harness uses automatic discovery via `tools/test/discover_test_files.mjs`, and the `node:test` chunk runner uses the same helper. Future work should preserve that single discovery authority instead of reintroducing manual include lists or separate scanners.

### Player-facing sector orders must not secretly write the older front-assignment lane

If a tactical-map action is labeled as a brigade-to-sector command, it must route through the canonical sector override contract all the way down. In AWWV, `stageAssignBrigadeToSectorAction(...)` accidentally writing `assignBrigadeToFront(...)` was not just a UI bug; it revived `brigade_front_assignment/local_fronts`, which still influences combat density. Treat any player-facing order surface that secretly writes an older authority lane as a serious engine-health bug.

### A player-facing concept is still alive if preload, IPC, adapter, and sidebar all still mention it

Even after a mechanic has a newer canonical replacement, the old concept remains live product truth if the desktop bridge exports it, the main process handles it, the adapter serializes it, and a sidebar still reasons from it. In AWWV, `assignBrigadeToFront(...)` and `brigadeFrontAssignment` had already outlived their intended player-facing role, but they still shaped the desktop shell until every one of those boundaries was cleaned up together.

### Sparse-state adapter reads are part of engine health, not just test hygiene

If `parseGameState(...)` assumes whole state branches like `displacement` always exist, tests may be the first thing to complain, but the real bug is that the player shell only works on happy-path saves. In AWWV, optional-reading sparse branches is not “being lax”; it is making the renderer robust to compatibility saves, partial fixtures, and evolving state contracts.

### Wrong-branch reads in adapters silently delete whole gameplay signals

The OPSEC briefing card disappeared not because OPSEC was unimplemented, but because the adapter read `opsec_sectors` from the wrong place. That kind of bug is especially dangerous: the data exists, the UI logic exists, and only the translation layer lies. In AWWV, adapters are authority surfaces and should be audited with the same suspicion as core sim code.

### An unused desktop bridge is still a live product promise until removed

If preload exports a method, the React IPC contract mirrors it, and Electron handles it, the repo is still promising that capability to future work even when no current UI calls it. In AWWV, `renameFrontSegment(...)` and `renameTheatre(...)` were dead shell bridges that needed removal precisely because they looked alive and therefore invited accidental reuse.

### Sector truth and frontline fatigue must use the same assignment currency

If sectors are the primary frontline organization model but fatigue still keys off legacy front assignment, the engine is silently using two different meanings of "on the line." In AWWV, frontline-duty fatigue should treat sector membership as primary truth and only fall back to `brigade_front_assignment` for compatibility while the deeper local-front lane is still being classified.

### Shared frontline helpers and reports must follow the same sector-first contract as core mechanics

Once sectors become the practical frontline authority, any shared helper like `isBrigadeAssignedToFront(...)` becomes a high-risk seam: battle resolution, posture gating, and reporting all inherit whatever lie it tells. In AWWV, the safe pattern is one shared helper that reads sectors first and legacy front assignment second, and then reuse that helper everywhere instead of letting each subsystem invent its own idea of "frontline."

### Precedence bugs in tiny combat helpers can preserve legacy behavior long after the main architecture moves on

Even if sectors are treated as primary truth in big systems, a small helper like `getLocalFrontDensityModifier(...)` can still bend combat if it checks `brigade_front_assignment/local_fronts` first. In AWWV, whenever both a new and old assignment currency coexist, the lookup order itself is a gameplay rule and should be treated as one.

### A runtime export is still a live promise even after the UI stops calling it

In AWWV, retiring a feature only at preload/IPC level is not enough if `desktop_sim.ts` still exports the old mutator. Future work will discover the export, assume the capability is still supported, and route around the shell cleanup. Dead desktop-sim exports should be removed once archived code is the only remaining caller.
### A player-facing contract is still fake if one detail panel bypasses it

In AWWV, shared helpers like `filterPlayerFacingOperations(...)` only become real protection once every consuming panel uses them. `OperationDetail.tsx` was still reading `loadedGameState.operations` directly, which meant the repo could claim player-safe operation filtering while a selected-key path still exposed enemy truth. When a player-facing filter exists, add a tiny keyed lookup helper beside it and route every detail panel through the same contract instead of letting each panel rediscover its own selection logic.

### A shell affordance can be "technically present" and still functionally absent

The standalone tactical map already had a Warroom-focus IPC path and Codex still existed, but both were buried deeply enough that the product still felt like it had lost them. In AWWV, navigation and reference affordances should be judged by live-user discoverability, not by whether some underlying hook technically survives. If a player needs specialist knowledge or keyboard habits to find a route back or open Codex, the shell is still lying about what the product supports.
### Warroom command prose must never be more certain than the extracted player-facing snapshot

In AWWV, headquarters surfaces like Command Briefing and Reports are part of the player shell, not theatrical wrappers around hidden truth. Hardcoded lines such as “no critical enclaves” or fake-specific authorship like “2nd Corps Intelligence Section” become structural lies if the underlying Warroom snapshot never proved them. Warroom can summarize and frame, but its prose should always be derived from player-facing extraction or stay explicitly generic.
### Hiding raw enemy ids is not enough if the panel still reasons from omniscient state

In AWWV, a player-facing surface can look safe because it prints only friendly-front language while still cheating underneath. Army HQ threat assessment was a clear example: no raw enemy corps ids or op names in the text, but the warnings still came from exact enemy operation phase/state. Treat data provenance as part of player-safety. If a panel is supposed to be a staff abstraction, it should be derived from player-plausible intel inputs, not from cleaned-up omniscient inputs.
### Small fallback strings are still part of the product shell

In AWWV, once the obvious leaks are fixed, the remaining debug smell usually survives in support rails, order summaries, and report prose. Raw `mun_id`, raw brigade ids, or raw OSID strings in those places are not harmless because players read them as the game speaking plainly. Treat fallback copy as a governed surface: if the UI has to degrade, it should degrade to a human label or a neutral safe phrase, not to an engine identifier.
### Card titles and summary badges are fallback hot spots

In AWWV, the easiest place for raw ids to sneak back in is not the big hero panel but the compact cards: corps cards, tactical cards, combat-summary badges, enclave tiles, and loan banners. Those components often use `name ?? id` or `display_name ?? key` patterns that feel harmless until the product is missing one label. Route those fallbacks through shared player-safe helpers instead of letting each card improvise its own last-resort string.
### Warroom extractors are part of the player shell, not backend plumbing

If `extractWarData(...)` or newspaper/report builders fall back to raw ids, the leak is just as real as if a React component printed them directly. In AWWV, treat Warroom data extractors and prose generators as player-facing authority surfaces: they need the same player-safe naming contract as the map UI, not their own `name ?? id` shortcuts.
### Older planning surfaces are where raw-id fallback leaks like to survive

Once the obvious map-shell leaks are cleaned up, the remaining player-truth damage often lives in less-central panels that still look alive: old Warroom settlement panels, planning maps, search indexes, and modal hover tooltips. In AWWV, those surfaces need the same player-safe fallback discipline as the primary shell; otherwise the product still degrades into engine identifiers precisely where nobody is looking closely.
### Officer-event adapters are player-facing surfaces too

If pending personnel/replacement events are derived in an adapter and that adapter falls back to raw officer ids or corps ids, the leak is still real even though no React component explicitly prints the id. In AWWV, event/adaptor text should degrade to neutral phrases like `An officer` and player-safe corps names, not to backend identifiers.
### Tactical-map shells should default to command density, not roomy dashboard spacing

In AWWV, once the shell is truthful, the next quality jump is usually density: toolbar chrome, detail panels, and operation cards should behave like a command console, not a generic spacious web app. Compact spacing is not just cosmetic; it determines how much command context the player can hold on screen at once.
### Shared panel primitives are spacing authority surfaces

If a common shell primitive like `GlassPanel` is roomy by default, every downstream overlay inherits that waste even when the individual panel code is otherwise disciplined. In AWWV, density work should start at the shell primitives and the structural rails (`OOBSidebar`, Army HQ, Codex), not only at the leaf cards.
### Shared fallback helpers should be treated as player-truth authority surfaces

In AWWV, once a helper like `playerSafeText.ts` exists, every Warroom/map shell that needs a last-resort officer, settlement, or municipality label should route through it instead of cloning a local version. Duplicated “small” fallback helpers drift quickly and become quiet re-entry points for raw ids, inconsistent phrasing, and different ideas of what counts as player-safe text.
### Political-facing and military-facing faction names should not be improvised per screen

In AWWV, peace/diplomacy surfaces often want political names while event/combat surfaces want military names. If each component carries its own faction label map, the product slowly develops several dialects and raw faction codes creep back in as fallbacks. Canonical player-safe helpers for both political and military faction names are cheaper and safer than letting each screen decide for itself.
### Adapter-side `name ?? id` fallbacks are product policy, not harmless plumbing

In AWWV, once a data adapter or loader chooses to fall back to a raw id, every downstream screen inherits that choice. Facilities, routes, movement logs, historical events, and peace-plan titles all proved that player-facing leakage can start in the adapter layer long before React renders anything. Humanize or neutralize those fallbacks at the source instead of expecting every shell to clean them up later.
### Prose builders and narrative outputs need the same player-safe naming contract as UI panels

In AWWV, NewspaperModal, Chronicle builders, and Warroom data extractors are not “secondary output”; they are part of the product shell. If they fall back to officer ids, event ids, or formation ids, the repo still speaks like tooling even after the visible panels are cleaned up. Route prose generation through the same player-safe helpers as the UI.
### Shared frontline helpers must not union old and new authority paths once the new path exists

In AWWV, `buildFrontlineAssignedFormationSet(...)` feeds battle eligibility, posture, fatigue, and reporting. If that helper unions corps sectors with legacy `brigade_front_assignment`, stale legacy data can keep extra brigades frontline forever. Once sectors exist, they should be authoritative; legacy front assignment should become fallback-only rather than “safety net truth.”
### Loaded-state defaults are another authority layer

In AWWV, `GameStateAdapter` is not just a parser; it defines the default vocabulary many UI panels inherit. If formation names, officer names, or fired-event titles fall back to raw ids there, the leak spreads widely. Hardening the view model is often more effective than fixing half a dozen leaf panels one by one.
### Compatibility objects should not stay live runtime truth after their last real consumer is gone

In AWWV, `local_fronts` survived as a rebuilt runtime object long after sectors had become the real frontline authority. Once the last meaningful fallback could be computed directly from `brigade_front_assignment + assignable_front_segments`, continuing to rebuild `local_fronts` every turn only preserved the illusion that the old lane still mattered. Strong cleanup often means deleting the rebuild path before deleting the schema field.
### Legacy fallback helpers should validate their own inputs instead of demanding ritual repair passes

In AWWV, `brigade_front_assignment` survived only as a compatibility lane, but `buildFrontlineAssignedFormationSet(...)` still trusted any non-null legacy entry. That forced the engine to keep running repair passes just to stop stale front IDs and dead formations from polluting frontline truth. A compatibility fallback is healthier when the helper itself ignores invalid segments and inactive formations, so the repo stops preserving old state merely to keep old assumptions comfortable.
### Compatibility phases should stop running once modern authority already exists

In AWWV, once `corps_front_sectors` already exist, rerunning `ensureBrigadeFrontAssignments(...)` every war turn only keeps the legacy front-assignment lane warm. A good migration rule is: if the new authority is already present, compatibility repair should stand down and only wake up for true absence or old-save recovery.
### Dead loaded-state bridges are product debt even when the engine still keeps the underlying data

In AWWV, `theatres`, `army_theatre_assignment`, and `segment.theatre_id` still existed for sim/compatibility reasons, but no live player-facing surface actually used them. Keeping those fields in `LoadedGameState` made the shell imply ownership it no longer had. When a product surface does not use a concept, stop carrying it in the loaded UI model even if the engine still stores it underneath.
### Stale contract docs can resurrect dead systems just as effectively as stale code

In AWWV, engineering docs that still listed `assign-brigade-to-front`, `rename-front-segment`, or theatre naming as live tactical-shell affordances were actively misleading, because the actual preload/main-process bridge had already retired them. When a product concept dies, update the contract docs quickly or the repo will keep teaching future agents that the ghost is still real.
### Shared shell spacing must be treated like gameplay balance, not cosmetics

In AWWV, if `TopToolbar`, `AccordionHeader`, `GlassPanel`, or the main command rail are roomy by default, every downstream panel inherits wasted space no matter how carefully the leaf components are designed. Density work should start with the shared shell authorities and toolbar-clearance rules, because that is where command context is won or lost across the whole product.
### Large overlays must speak the same density language as the tactical shell

In AWWV, Army HQ, Codex, and similar full-size overlays cannot be allowed to drift into a roomier, slower dashboard style just because they are modal. If those shells use larger paddings, taller tab rows, and oversized crests by default, the player experiences the product as several stitched-together interfaces instead of one command console.
### Architecture docs need explicit authority, not just timestamps

In AWWV, the dangerous architecture docs are not necessarily the oldest ones. They are the ones that still look polished and plausible enough to be mistaken for current truth. A strong repo should name which architecture documents are live authority and which are historical archaeology, otherwise implementers will keep mixing eras and calling it context.
### Repo root is a product surface too

In AWWV, the repository root teaches every new human and agent how seriously the project is curated. A placeholder README and stray trace dumps signal accidental ownership. A strong root should point cleanly at the live authorities and archive session residue instead of letting it masquerade as current truth.
### Ownership comments belong in the code, not only in engineering docs

In AWWV, if a file is an old harness, a smoke path, or a compatibility entrypoint, the warning should live in the file header itself. Otherwise the repo depends on implementers remembering external docs while staring at code that still looks live.
- 2026-04-02: In the current map shell, `PresidentialToolbar` is the live top-level authority, not `TopToolbar.tsx`. Any future shell/navigation work must start from the mounted toolbar before trusting polished but unmounted legacy components.
- 2026-04-02: AAR and operation history should route through Army HQ `RECORDS` as the canonical owner. If another shell needs those surfaces, it should hand the player into Army HQ rather than reopen parallel history ownership.
- 2026-04-02: Tactical operations UI should read as a field-facing snapshot. If a panel can launch/review/own operations *and* Army HQ can also do that, the panel is probably overstepping and should hand off to HQ.
- 2026-04-02: Army HQ `SUMMARY` is a player-facing shell, not an all-faction debug dashboard. In player mode it should show own-side exact values and theater-wide aggregates, while enemy-wide totals stay in staff abstractions instead of exact scoreboard tables.
- 2026-04-02: Warroom `FactionOverviewPanel` is a strategic shell summary, not a second command desk. It may summarize command posture and direct the player toward Army HQ, but detailed formations, officer rosters, and commander reassignment belong to Army HQ command-review surfaces.
- 2026-04-02: If the tactical map is a live desktop shell, the mounted toolbar must expose a visible path back to Warroom. A bridge method sitting unused in legacy code does not count as product-shell ownership.
### 22. Player-facing vocabulary drift is a shell-integrity bug, not copy polish

If Army HQ, Chronicle, OPORD, or Warroom panels still say OSID, raw faction ids, or similar engine nouns, the shell still sounds like an internal tool even if the underlying data is player-safe. Treat vocabulary cleanup as part of player-truth enforcement and lock it into the canonical existing test suites rather than adding orphan test files the repo will not normally run.

### Tactical operations panel must stay map-facing

If `OperationsPanel.tsx` says Army HQ owns command review, it must not still expose launch, halt, or other command staging buttons. Tactical operations UI may summarize field state and hand off to Army HQ or corps orders, but command authority must stay singular.

### Player-facing faction rails should never fall back to raw faction ids

OOB headings, operation subtitles, and briefing headers are core shell surfaces. They must use player-safe military or political faction names rather than raw ids like `RBiH` when a clearer human-facing label is available.

### Event and attack modals are player shells, not debug/status readouts

Attack confirmations, event queues, and decision modals should use player-safe military or political faction language just like any larger panel. These are high-attention decision surfaces, so raw faction ids leak product tone fast.

### Tactical rail detail panels must obey the same player-language contract as modals

Operation detail, corps detail, and sector dossier rails are part of the live command shell. They should not keep raw faction ids just because they feel more technical than the toolbar or OOB.

### Bottom status strips must not quietly become omniscient scoreboards

If a persistent shell strip shows exact all-faction territory or strength percentages, it is acting like a debug/status console even when the styling is elegant. High-frequency strips should default to player-safe framing and leave richer cross-faction totals to explicitly owned analysis surfaces.

### Summary shells are where raw engine vocabulary quietly re-enters

If a summary tab or war dashboard still says RBiH, RS, or similar shorthand, the live shell is still talking like an internal tool even if the deeper panels are clean. Treat summary surfaces as first-class player-language contracts and lock them into the existing player-visibility test suite.


### A safe launcher does not make an unsafe destination acceptable

If a bottom strip, menu item, or button is made player-safe but the dashboard or modal it opens still exposes exact enemy truth, the shell contract is still broken. Player-facing truth must hold across the entire interaction path, not just the first click.


### Administrative panels can leak just as badly as battlefield panels

Economy, supply, and reserve screens often get treated as harmless because they are not on the map. In a faction-play strategy game they are still player shells. If they show exact all-faction values by default, the product is still leaking debug truth under calmer styling.


### Shared relationship concepts must keep one player-facing label across shells

If peace shell, tactical shell, and Warroom each name the same alliance or diplomatic relationship differently, the product feels like multiple stitched interfaces. Treat cross-shell vocabulary as architecture, not cosmetic copy.


### Peace-phase faction cards should not expose exact hostile declaration telemetry by default

Mounted peace shells are still player surfaces. Exact hostile declaration percentages make them feel like debug dashboards even when the styling is elegant. Keep exact pre-war capital for the player side, but reduce hostile declaration status to qualitative posture unless an explicitly owned intelligence surface says otherwise.


### Phase 0 Warroom copy is part of the same shell contract as war-phase shells

Raw shorthand like `RS declaration imminent` or `Army of RBiH` leaks product tone even if the later war shells are cleaner. Treat Warroom Phase 0 badges, warnings, and event modal body text as player-facing language that needs the same discipline as tactical-map rails and Army HQ summaries.


### Shared shell padding becomes product drift if nobody owns it

Warroom modals, newspapers, magazines, and scenario cards inherit spacing from a small number of shell classes. If those classes stay loose, every new surface feels airy and under-filled no matter how good the content is. Tighten the shared shells first before polishing one-off panels.


### Army HQ should read like a command desk, not a presentation

If Army HQ cards and collapsible sections have too much fixed height and padding, the interface starts feeling ceremonial instead of operational. Prefer compact corps cards, shorter section headers, and tighter expanded-detail spacing so more command truth stays above the fold.

### Product shells need an explicit hierarchy, not just a component map

In AWWV, it is not enough to know which panel owns operations or records. The repo also needs to say which shell starts play, which shell owns the battlespace, which shell owns command review, and which shell owns knowledge. If that stays implicit, Warroom, Tactical Map, Army HQ, and Codex drift into overlapping tools.

### Dead constructors are more dangerous than dead fields

In AWWV, a legacy state field can be relatively harmless if everyone knows it is compatibility baggage. A constructor or builder that still looks capable of recreating that layer is worse, because it teaches future work that the layer might still be canonical. If a runtime layer has been retired, kill the constructor too or mark it unmistakably as archival.

### Dead writers are worse than dead readers

In AWWV, a compatibility field can linger for save/load reasons without doing much harm. A live pipeline writer that keeps rebuilding that field every turn is different: it keeps the old concept feeling current. If a layer is no longer canonical, stop refreshing it in the live pipeline before you worry about full schema deletion.

### Docs that claim a bridge is gone must be verified against the live shell

In AWWV, "we already removed that IPC" is not trustworthy until preload, Electron main, the live IPC hook, and the live adapter all agree. Compatibility ghosts often survive in exactly one of those layers and quietly keep a dead concept available.

### Hover titles are a common leak path for raw engine ids

In AWWV, a panel can look player-safe at first glance while still leaking raw OSIDs or municipality ids through `title=` attributes and admin detail rows. Player-shell audits need to check hover text and metadata fields, not just visible labels.

### Browser fallbacks and sample shells can quietly resurrect dead authority

In AWWV, a mock `dev:map` state that still seeds `brigade_front_assignment`, `army_theatre_assignment`, or `theatres` teaches every future shell change that those concepts are still alive. Sample state and browser fallbacks are part of product truth; they must not smuggle retired authority back into the live shell.

### Compatibility comments need to tell the next agent what not to trust

If `GameState` comments say “HoI-style theatre model” without also saying “compatibility-only,” Claude or a tired developer will eventually treat that field like a live design commitment. In a repo with long migrations, schema comments are operational guidance and should explicitly mark residue as fallback-only.

### Shared shell padding is often the real source of “blank space everywhere”

In AWWV, the worst UI airiness usually does not come from one bad card. It comes from a few reused shells like Army HQ, summary modals, and Codex carrying oversized padding and gutters. Tightening the shared command shells first changes the whole product tone faster than polishing isolated leaf components.

### Diplomatic and civic shells should use political names, not faction shorthand

In AWWV, `RBiH`, `RS`, and `HRHB` can be acceptable in some military-facing summaries, but they feel like backend shorthand in peace-plan and settlement-control shells. Diplomatic and civic surfaces should default to player-safe political names through `getPlayerSafePoliticalFactionName(...)`.

### Diplomacy checklists are part of player-facing language, not internal design notation

If a ceasefire or Washington tracker says `RS territory > 40%` or `HRHB exhaustion > 35`, the player is reading design shorthand instead of a political brief. Diplomacy shells should translate those conditions into player-facing faction names even when the underlying thresholds stay mechanical.

### Warroom header badges should be consistent across peace and war shells

If the peace shell badge uses a military-facing label but the live war shell falls back to the raw faction id, the product reads like stitched eras instead of one command interface. Keep Warroom header badges on the same player-facing label contract across phases.

### Hover titles need the same player-safe contract as visible labels

If the visible queue entry is humanized but the `title=` attribute still carries a raw OSID, the player shell is still leaking engine truth on hover. Player-safe audits need to check hover text in queues and strips, not just modals and detail panels.

### Late commander review can silently reintroduce sector lies after earlier truthful assignment passes

If sector assignment and coverage passes are made honest, do not assume the job is done. In AWWV, `commander_override.ts` was still able to move an exposed brigade into the corps' globally "safest" sector without respecting connected-component truth, recreating a reachability invariant violation late in the pipeline. When chasing surviving sector mismatches, always inspect the post-assignment review/mutation layers, not just the main assignment passes.

### Persisted player intent must never outrank current geography

`brigade_sector_override` looked harmless because it belonged to the player shell, but it was still writing directly into sector truth. If a brigade retreats or relocates into another connected component, an old override becomes stale intent and must be ignored instead of reapplied. In this repo, shell persistence can be just as dangerous as AI logic if it is allowed to bypass current spatial truth.

### Short assignment hop caps are not the same thing as true reachability

In AWWV, `PHASE_2C_MAX_HOPS` is a distribution cap for assigning pooled brigades inside an operational zone. It should not be reused as a binary truth test for whether a brigade can belong to a sector at all. Doing so turns deep-rear but still truthful brigades into fake "unreachable" unresolveds and creates later-turn churn that looks like a sector-construction bug.

### Stale scenario-authored brigade references are different from runtime missing-brigade failures

`Operation Foca` still carried `jna_mostar_garrison_tg` even though the brigade predictably withdraws before queued injection time. That warning looked like a runtime integrity failure, but the real problem was stale authored data. When queued-op warnings appear, first ask whether the brigade is supposed to exist at that lifecycle moment before changing validation logic.

### Territory repair must never launder ownership across corps boundaries

In AWWV, disconnected-territory repair and orphan territory sweeps are not neutral cleanup passes. If they can hand an OSID to the nearest same-faction sector regardless of corps, they silently rewrite sector truth and then force brigade assignment to solve a contradiction the territory layer itself created. If an OSID has a truthful owner corps, only same-corps sectors may claim it; otherwise it should stay unresolved rather than being laundered.

### Elite-loan validity must be one shared rule across bot, preplanned, and player paths

The dangerous split is not multiple `deployEliteLoan(...)` functions. The dangerous split is different callers using different ideas of whether a loan is actually possible. In AWWV, reserve auto-assignment, queued pre-planned elite deployment, and desktop approve/redirect actions all need the same question answered from the same helper: can this brigade reach the receiving corps's sector territory through friendly space right now?

### On-loan elites must obey the receiving corps, not their original corps metadata

An elite brigade can stay owned by Main Staff in `corps_id` while still being operationally attached elsewhere. Any return-to-corps, homeward movement, or sector-assignment logic that reasons from original `corps_id` while `elite_loan_state.on_loan` is true will eventually create contradictory states: on-loan brigades marching home, sitting unresolved, or getting assigned to the wrong corps' sector truth.

### Legacy frontline density must be all-or-nothing once sectors are canonical

If sectors exist, they are the frontline truth. A single brigade that happens to be missing from sector assignment must not silently regain density bonuses or penalties from `brigade_front_assignment`, because that creates per-brigade split truth inside combat math. Legacy frontline density is only acceptable when sector frontline truth is absent globally.

### Player-safe selectors need to be reused by every modal, not just the main panels

In AWWV, a shell can look player-safe overall while one modal still reaches into raw omniscient collections. `OperationBriefingModal` showed the pattern: the safe selector already existed, but the modal had its own direct `loadedGameState.operations.find(...)`. Once player-safe selectors exist, modals and secondary panels should consume them instead of re-querying raw state locally.
**Legacy frontline assignments are no longer runtime truth (2026-04-03):** `brigade_front_assignment` now survives only as compatibility residue for serialization/history. Runtime frontline ownership is sector-only: `front_assignment.ts` derives the frontline-assigned set purely from `corps_front_sectors`, `war_phases.ts` no longer runs an `ensure-brigade-front-assignment` step, and `local_front_defense.ts` no longer revives legacy density from front assignments. Rule for future work: if a runtime mechanic needs to know whether a brigade is on the line, it must consume sector truth or return neutral behavior, never rehydrate `brigade_front_assignment`.

**Player shell DTOs must only carry the fields the live shell actually renders (2026-04-03):** The tactical-map `sectorIntel` view model no longer exports `enemy_faction` or `enemy_corps_id` because the live Army HQ threat view does not use them. Fog-of-war derivation may still inspect raw engine `sector_intel`, but the player shell should only receive the minimum threat-summary DTO required by the UI. Rule for future work: if a shell component does not render a field, do not include it in the player-facing adapter contract “for convenience.”
**Player-facing operation collections should be scoped at the adapter, not only filtered in components (2026-04-03):** `GameStateAdapter` now reduces `operations`, `activeOperations`, `operationHistory`, and `pendingReserveRequests` to the player faction before the live shell reads them. Rule for future work: keep `playerVisibility.ts` as a guardrail, but treat adapter-level scoping as the real shell-ingress contract whenever the data is only meaningful for the player faction.

**Warroom should summarize command truth, not transport raw operation payloads (2026-04-03):** `WarDataSnapshot.ownCorpsOps` now carries only a summary operation DTO (`type`, `phase`, `started_turn`), and Warroom enemy-contact summaries now derive from engaged front edges instead of global enemy casualty ledgers. Rule for future work: if Warroom only narrates or summarizes a system, it should not receive the full engine object for that system.

**Trap remediation is part of sector truth, not a cleanup excuse (2026-04-03):** In `brigade_assignment.ts`, the late repair passes used to be able to move unreachable brigades into any same-corps sector that happened to be path-reachable, even across connected components. That is false sector truth. Rule for future work: any post-assignment repair or rebalance pass must obey the same component discipline as the main assignment phases; if no truthful destination exists, leave the brigade unresolved instead of laundering it into a different component.

**Shared friendly-side OSIDs are not proof of one frontline (2026-04-03):** Two hostile pockets can face the same friendly-side line and still be different frontlines. `areSectorsFrontEdgeAdjacent(...)` must never short-circuit to `true` just because two sectors share a friendly OSID. Rule for future work: sector merges are legal only when the merged edge set remains one contiguous frontline component, not merely when territory or friendly-side geometry touches.

**Sector invariant (2026-04-03):** Sectors are frontlines, not collections of OSIDs or saved sub-segments. Under the current rule set, a saved sector with multiple sub-segments is invalid state and should be rebuilt or split until one sector equals one frontline.

**Adapter scoping is not enough if panels keep becoming second owners (2026-04-03):** Even when `GameStateAdapter` already scopes `operations` to the player faction, corps-level tactical panels can still recreate duplicate ownership by scanning `loadedGameState.operations` directly and behaving like independent command-review shells. Rule for future work: corps and sector panels may summarize live operations, but they should consume shared player-facing selectors and hand off full review/authorization to Army HQ or dedicated briefing flows instead of becoming parallel operations surfaces.

**A warning is only final if every rescue path has already run (2026-04-03):** In the sector pipeline, `classifyBrigadesByTerritory(...)` was still emitting `UNRESOLVED ... fell through sector pipeline` before `assignCrossCorpsEnclaveDefenders(...)` had a chance to rescue same-faction enclaves. That made the warning stream lie about the final outcome. Rule for future work: terminal warnings belong at the true end of the ownership chain, after every legitimate recovery step has had its chance.

**Army-HQ sector exemptions stop the moment a reserve is on loan (2026-04-03):** `vrs_main_staff`, `arbih_general_staff`, and `hvo_main_staff` brigades may be sectorless while idle, but that exemption does not survive a live loan. Once `elite_loan_state.on_loan` is true, the brigade must resolve like a field unit and unresolved reporting should treat it that way.

**Scenario reporting should not reconstruct eligibility truth from proxy fields (2026-04-03):** `phase_f_displacement.trigger_report` is the canonical owner of weekly activity counts. Rebuilding `front_active_set_size`, `pressure_eligible_size`, or `displacement_trigger_eligible_size` from `front_segments`, pressure deltas, or realized municipal displacement creates a second reporting authority and makes stale artifacts look like live engine faults. Rule for future work: if canonical Phase F activity metrics are absent, report zero and fix the producer instead of re-deriving from proxies.

**Commander review may not rewrite frontline truth without movement (2026-04-03):** Once a brigade's current `location_osid` is physically on a corps sector frontline, commander override logic must treat that sector as anchored truth. Strategic review may plan future movement, but it may not immediately transfer the brigade into another sector roster just because the target sector is safer or higher priority on paper. If a brigade is still physically anchoring sector A, it belongs to sector A until movement changes that fact.

**Cross-corps enclave rescue is truthful only when the location itself belongs to that sector (2026-04-03):** `assignCrossCorpsEnclaveDefenders(...)` may rescue a brigade into another same-faction corps sector only if the brigade is physically on that sector's frontline or inside its `territory_osids`. Same-component affinity alone is not enough; otherwise the engine just launders unresolved brigades into the wrong theater.

**Legacy SID combat is reporting fallback, not co-equal combat truth (2026-04-03):** `attack_resolution_osid` is the canonical war-phase combat summary. `resolve_attack_orders` survives only as a compatibility fallback when operational combat data is unavailable. Rule for future work: any scenario rollup, diagnostic, or report that can see both summaries must prefer OSID output first and only fall back to SID data when the canonical OSID report is absent.

**Officer growth must read sector frontline truth, not brigade posture (2026-04-03):** `updateBrigadeOfficerQuality(...)` used to treat any non-`defend` posture as "frontline" service. That is false authority because posture is mutable shell-era residue while sectors are the live frontline owner. Rule for future work: if live `corps_front_sectors` exist, progression and drift systems must use sector/frontline assignment, not posture heuristics. A posture fallback is only acceptable when no live sector truth exists at all.

**Deep shell concepts need one owner even when multiple shells can open them (2026-04-03):** War Summary now lives in `army_hq/WarSummaryContent`, and `WarSummaryModal` is only a presentation wrapper. Rule for future work: if Tactical Map, Army HQ, Warroom, or Codex can all open the same concept, only one component may own the actual model/logic; every other path must wrap or hand off to it instead of recreating a second truth standard.

**Operation selection should open the tactical ops shell, not create a second tactical detail owner (2026-04-03):** `selectedOperationKey` now opens `OperationsPanel`, and the old rail-mounted `OperationDetail` surface is gone. Rule for future work: Tactical Map gets one map-facing operations surface; deeper review belongs to Army HQ/briefing flows, not a second tactical panel family.

**Summary shells must not reconstruct front truth from compatibility fields (2026-04-03):** `SituationTab` used to fall back to `assignableFrontSegments.length` when canonical `frontPressureByEdge` data was absent. That kept a second front-summary authority alive in the UI. Rule for future work: if canonical front/pressure summary data is absent, show zero or unavailable state and fix the producer instead of re-deriving from compatibility leftovers.

**Codex is a shell handoff, not a Records subtab (2026-04-03):** Army HQ Records may link into Codex, but it must present that as a handoff to a separate shell. Rule for future work: if clicking a control opens a global shell, do not visually model it as one more inline subtab of the current shell.

**Front tooltips must read sector truth, not compatibility front segments (2026-04-03):** The live front tooltip no longer derives persistence/context from `assignableFrontSegments`; it uses `corpsFrontSectors` instead. Rule for future work: once a player-facing front feature has a canonical sector owner, do not let tooltip or hover helpers sneak compatibility front DTOs back into the shell.

**Compatibility front snapshots should not ride in live player DTOs (2026-04-03):** Once summaries, tooltips, and shell actions stop consuming `assignable_front_segments`, remove the matching `LoadedGameState` field too. Leaving compatibility snapshots in the live DTO teaches future implementers that the old concept still owns player truth.

**Dead helpers inside authoritative engine files are future bugs (2026-04-03):** An unused helper like `deriveCorpsFrontMapping(...)` is more dangerous inside `bot_corps_directives.ts` than in an obvious archive folder. If it reads compatibility state from a live AI file, future work will eventually treat that compatibility lane as canonical again. Delete it once no live caller remains.

**Deleting a rebuild path is not enough if the schema still blesses the old concept (2026-04-03):** `local_fronts` had already stopped rebuilding every turn, but as long as `GameState` still declared the field and the live AI hub still re-exported front-compat helpers, the repo kept teaching future work that the concept was still real. Rule for future cleanup: when a compatibility lane loses runtime authority, remove the schema residue and public export surface in the same wave or it will grow back through inference rather than code.

**Campaign memory is its own shell, not a flavor variant of records (2026-04-03):** In AWWV, `Chronicle` is the campaign-memory owner, `Army HQ Records` owns operational review, and `Codex` owns static reference. Rule for future work: if a Warroom prop like the newspaper wants to show “what happened,” hand it off to Chronicle once the tactical shell exists instead of building another local archive packet.

**A dead field with a live writer is still a live lie (2026-04-03):** `assignable_front_segments` had already lost its real shell/AI readers, but the turn pipeline kept rebuilding it every turn. Rule for future cleanup: once a compatibility field loses its canonical readers, remove the runtime writer immediately even if the field itself has to survive a little longer for old saves or tests.

**Parallel reserve-loan prototype rails are a future-bug magnet even when runtime no longer imports them (2026-04-03):** `army_reserve_system.ts` is the live elite-loan owner; the old `elite_loan.ts` prototype and its dedicated tests were retired because they encoded a different lifecycle while no longer driving runtime. Rule for future work: when a subsystem gains a new canonical owner, delete the old prototype rail once it stops serving live runtime, or the next cleanup will drift onto the wrong implementation just because it still looks neat and test-backed.

**Missing roadmap lanes should become execution-grade plans before the work starts (2026-04-03):** Sector/frontline truth, UI density + shell cohesion, and product architecture simplification are now covered by `docs/plans/2026-04-03-v080x-sector-frontline-truth-plan.md`, `docs/plans/2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md`, and `docs/plans/2026-04-03-v08to09-product-architecture-simplification-plan.md`. Rule for future work: if a priority becomes â€œobviousâ€ in chat but has no execution-grade Pyrrhic plan, write the plan before implementation so the repo does not drift back to implicit ownership.
- 2026-04-03: Tactical shell authority rule — `PresidentialToolbar` is the mounted tactical-map shell. `TopToolbar` is legacy reference only. Global shell shortcuts must route through canonical actions/IPC, never through DOM text/button scans.
- 2026-04-03: Scenario harness rule — `src/scenario/scenario_runner.ts` may report or apply real breach outcomes, but it may not seed synthetic `front_posture`, brigade edge assignments, `front_segments`, or `front_pressure` to force them.
- 2026-04-03: Supply pressure and war exhaustion rule — when `corps_front_sectors` exists, it is the frontline authority for frontage/exposure mechanics. Legacy front-edge/front-descriptor inputs survive only as compatibility fallback.

- 2026-04-03: Summary-generator naming rule - helper builders like `generateThreatAssessment(...)` are part of the player shell and must route visible names through `playerSafeText` helpers. Do not trust raw formation names in report/title generators just because they are not mounted React panels.
- 2026-04-03: Desktop bridge rule - preload owns fanout, shells only subscribe. If Warroom or tactical map ever needs to "re-register" for state updates, the bridge contract is wrong. Embedded shells must mirror the same event model, including turn reports, instead of inventing a weaker parallel callback path.
- 2026-04-03: Operations-review naming rule - Army HQ operations review, operation briefing, tactical operations detail, and officer replacement prompts must derive corps/brigade/place labels from player-safe helpers (`getPlayerSafeCorpsName`, `getPlayerSafeBrigadeName`, `getOsidDisplayName`). These are command-trust surfaces, not places for raw `corps_name` or fallback ids.
- 2026-04-03: Stale architecture docs are an active false-authority risk - if an older polished engineering doc still presents a retired shell like `TopToolbar` as live, future agents will route new work into the wrong surface. When a shell owner changes, update the code and the glossy architecture docs in the same wave.
- 2026-04-03: Shared detail panels must not become hidden shell routers - `SettlementDetailContent` is now renderer-only and takes explicit callbacks for sector/operation drilldown. Rule for future work: if a component is reused by tooltip and selection shells, it should render player-safe content and accept navigation callbacks from its owner instead of reading/writing global store state directly.
- 2026-04-03: Army HQ geography rule - ORBAT, sector detail, and operation-history review are primary command surfaces, so location names there must prefer canonical OSID display maps (`getOsidDisplayName`) over rough `formatOsidLabel(...)`/`humanizeOsid(...)` fallbacks.
- 2026-04-03: Warroom control language rule - settlement control status shown to the player must be humanized before render. Do not surface raw simulation enum casing/underscore vocabulary in Warroom administrative shells.
- 2026-04-03: AAR is a command-trust surface, not a debug dump - after-action reports must use player-safe faction labels, brigade names, and canonical place names. Do not let battle review panels fall back to raw brigade ids or `humanizeOsid(...)` just because they are "reporting" rather than issuing orders.
- 2026-04-03: Reserve shells should share the same geography contract as command shells - even narrow management panels like `ArmyReservePanel` should resolve base and staging locations through the canonical OSID display map instead of rough string humanization.
- 2026-04-03: Tactical-shell density rule - if one decorative toolbar element forces every rail and panel lower, that is not local styling debt; it is shell-envelope debt. Reduce the global clearance budget before micro-tuning inner panel padding.
- 2026-04-03: Chronicle and ops-planning hover are still player-facing report surfaces - they must use player-safe place and faction naming just like command panels, even if they are narrative or planning aids rather than the main shell.
- 2026-04-03: Warroom should hand off deep staff review instead of owning a parallel packet - faction overview, command briefing, and report-review desk props now route into canonical tactical-shell destinations through `src/ui/shared/shellHandoff.ts`, and the same handoff survives browser/dev new-tab launches through a one-shot query-param round trip. Rule for future work: when a Warroom interaction needs detailed staff depth, add a shell handoff to Army HQ/Codex rather than another Warroom-local modal owner.
- 2026-04-03: Dead shell packets should be deleted once the anchor routes directly to the owning shell - `OperationalSituationModal` survived after the desk map already routed straight to tactical play, which made Warroom look like it still owned a second operations packet. Rule for future work: if an anchor now hands off directly, delete the old intermediate modal instead of leaving it around as fallback theater.
- 2026-04-03: Dead compatibility helpers are worse than noisy comments if they still look reusable - `src/state/theatres.ts` had no live imports, but its existence kept suggesting theatre tagging was still a plausible runtime layer. Rule for future work: once a compatibility helper loses every live importer, remove the file and replace it with explicit tests/docs rather than preserving a polished ghost.
- 2026-04-03: Dead shell APIs are still dangerous even when no UI calls them - the desktop bridge was still exporting `stageBrigadeAoROrder`, `stageCorpsFrontOrder`, and `stageOgSubfrontOrder` long after the live tactical shell stopped using them. Rule for future work: if a player-facing command path loses its live UI owner, retire it from preload/main-process/DesktopSim in the same wave instead of leaving a fake capability at the shell boundary.
- 2026-04-03: Dead runtime steps are more dangerous than dead files - `corps_front_assign.ts` looked legacy, but the real danger was that `war_phases.ts` still scheduled `ensure-derived-corps-front-edges` and `apply-corps-front-orders` every war turn while the functions themselves derived and assigned nothing. Rule for future work: if a subsystem becomes compatibility residue, remove its live pipeline steps and reporting hooks in the same wave, or the repo will keep treating a no-op as meaningful authority.
- 2026-04-03: Retired compatibility fields should not keep a ceremonial pipeline step - once `brigade_reposition_orders` stopped being a live player command and the adapter stopped exposing it, keeping `apply-brigade-reposition` in `war_phases.ts` was just ritualized false authority. Rule for future work: if a compatibility field survives only for old saves/tools, runtime should either ignore it completely or consume it in a narrowly owned migration path, never in the main turn pipeline.
- 2026-04-03: Polished canon docs can become false-authority bugs - when sectors become the frontline owner and shell ownership shifts, high-trust docs like `Systems_Manual_v0_7_0.md`, `context.md`, and `TACTICAL_MAP_SYSTEM.md` must be updated in the same wave or future agents will route new work back into retired front/theatre/toolbar lanes.
- 2026-04-03: Sector frontline truth can still vanish in reporting if two valid edge universes are compared without a bridge - `CorpsFrontSector.edge_ids` are OSID frontier edges, while some harness/report paths still walk canonical settlement edges. Rule for future work: when a subsystem accepts both canonical and operational geometry, explicitly bridge between them at the boundary instead of letting “no matches” collapse into fake zero activity.
- 2026-04-03: Local package CLIs are part of repo truth on Windows - if the repo can run only when `node_modules/.bin` shims happen to exist, the build/run contract is brittle. Rule for future work: canonical pipeline wrappers should invoke local package entrypoints directly or provide repo-local wrappers, not rely on PATH luck inside nested shell hops.
- 2026-04-04: Consolidation passes should happen every 5-8 micro-reports per lane to prevent doc drift — after the 2-day sprint produced 20+ micro-reports across 3 lanes, orientation cost for new agents became high. Consolidated lane summaries with canonical owner tables and end-to-end flow descriptions restore navigability. Micro-reports are preserved as traceability artifacts, not replaced.

- 2026-04-04: Interpretation category must reach the consequence surface, not just the explanation surface — Wave 1/2 gave players a category label and drag-factor list, but the override button copy was still category-blind. Rule for future work: when a derivation system classifies institutional drag by type, the classification must propagate to every downstream consequence surface (not just the explanation panel) or the category is only cosmetic.
- 2026-04-04: Pre-compute at modal level, pass as prop — when a display component needs a derived value that depends on other modal-level state, compute it in a useMemo at the parent level and pass as a pre-computed prop. Do not import derivation functions into dumb display components. This matches the existing ReadinessTrendIndicator / RecommendationDriverSection pattern and keeps display components dependency-free.

- 2026-04-04: Dispatch from the real bench, not a generic team block. Use `.claude/AGENT_TEAM_ROSTER.md` plus the repo taskforce briefs in `.claude/agents/` to fit specialists to the actual task shape. Do not name fictional or unavailable roles like `gap-finder`; use real challenge roles such as `architect`, `technical-architect`, `product-manager`, `quality-assurance-process`, `authority-auditor`, `ui-truth-keeper`, or `operations-reality-checker` as appropriate.

**`assignCrossCorpsEnclaveDefenders` fires for drifted brigades as well as genuine enclave defenders — discriminate by `home_osid` coverage (2026-04-04):** The enclave-defender repair pass in `brigade_assignment.ts` is designed for brigades physically isolated inside foreign-controlled territory. It also fires for drifted brigades — brigades whose `location_osid` was captured by foreign-corps operations or marches but whose home municipality is still in own-corps hands. The discriminator: a genuine enclave defender has no own-corps sector whose `territory_osids` includes the brigade's `home_osid`. A drifted brigade does. Gate on this check after the `ownCorpsHasSectorInComponent` pass; skip drifted brigades and leave them for normal repositioning/recall. Without this gate, drifted brigades are permanently re-homed into foreign corps sectors, corrupting density metrics and AI force evaluation for both sides.

**Sector split products can be zero-brigade — the pipeline has no post-split equalization within own corps (2026-04-04):** `splitNonContiguousSectors` partitions a parent sector's `territory_osids` by geographic connectivity. Brigades are assigned to child sectors only if their current location falls in the child's component. When parent brigades are concentrated in one component, the other child sector gets correct front edges but zero brigades. The assignment pipeline has no mechanism to recruit from adjacent own-corps sectors to fill these orphan children. Diagnostic: sector IDs with `split0`/`splitN` suffixes in the end report, cross-referenced with `assigned_brigade_count: 0`. Fix options: (a) splitter refuses to emit a zero-brigade child, or (b) post-split equalization pass borrows from sibling/adjacent own-corps sectors with surplus. Investigate in `sector_splitting.ts` + `brigade_assignment.ts`.

**Non-contiguous split children require a territory-membership pre-pass, not BFS equalization (2026-04-04):** The fill contract for split child sectors fails through two simultaneous blocks: (1) Phase 1 of `classifyBrigadesByTerritory` exhausts all brigades into the largest child via `location_osid` → `frontOsidToSectorIndices`, leaving nothing for Phase 1.5; (2) `ensureMinimumSectorCoverage` Step 2 is double-blocked — the `> 1` donor guard and the cross-component BFS filter both reject split siblings, which are disconnected by definition. Correct repair: a territory-membership pre-pass at the start of `ensureMinimumSectorCoverage`, before Steps 1/2. For each zero-brigade sector with front edges, find a sibling brigade whose `location_osid` is in the zero-sector's `territory_osids`, is not on the sibling's frontline, and leaves the donor with ≥ 1 remaining. Move (not copy) one brigade. No BFS needed — territory membership is a stronger predicate than component reachability in this context. Rejected alternatives: (a) splitter refusal breaks the geographic split contract; (b) relaxing the cross-component filter still blocks on `> 1` guard. Pattern: when a repair pass is blocked by a connectivity check that is correct for its primary use case but wrong for disconnected split products, add a pre-pass that uses a more direct authority (territory membership) rather than weakening the BFS filter for all callers.
- 2026-04-04: Validation gates must anchor on the latest relevant complete runs, not older anomaly artifacts. If a gate compares against a run hundreds of sessions older than the current ATH baseline, first prove that run is still the intended comparator. Otherwise demote it as stale-run noise and do not let it block roadmap work.
**Derived front-edge refresh needs a matching final truth rebuild for every dependent authority (2026-04-08):** Re-deriving `war_front_edges_osid` near the end of the pipeline is not enough if dependent structures like `corps_front_sectors`, `unresolved_sector_brigades`, and `sector_combat_ratings` still reflect pre-recruitment or pre-recall state. That creates a split-brain save: newer front edges over older sector truth. Pattern: when a late pipeline step refreshes an authority that other derived structures depend on, either rebuild every dependent structure in the same late phase or explicitly mark the older structures non-authoritative and do not serialize them as final truth. Linked: `[2026-04-08] fix(engine): Seal sector builder and rebuild final sector truth after late writers`.
**Sibling front de-overlap must move edge truth, not just label truth (2026-04-08):** If two same-corps sectors share a friendly front OSID, deleting that OSID from the weaker sibling’s `friendly_osids` without moving the corresponding `edge_ids` creates a silent contradiction: the sector still owns front edges whose friendly endpoint it no longer claims. Pattern: whenever front ownership changes, transfer the incident edge ownership first, then rebuild `sub_segments` from edge truth. Linked: `[2026-04-08] fix(engine): Make sector overlap cleanup edge-truth-safe and block late truth-violating transfers`.
**Late balancing passes need the same physical-truth gate as emergency coverage passes (2026-04-08):** It is not enough to protect `ensureMinimumSectorCoverage()`’s early rescue logic. Any later equalization or reinforcement pass that can move brigades between sibling sectors must also refuse to transfer brigades that donor sectors already truthfully own by frontline, territory, or one-hop reserve claim. Otherwise a system can appear repaired earlier in the builder and still serialize false sector ownership after a later “balance” step. Linked: `[2026-04-08] fix(engine): Make sector overlap cleanup edge-truth-safe and block late truth-violating transfers`.
**Triggered operations need completed-history gates, not idle-corps gates (2026-04-08):** `Operation Herzegovina Consolidation` used to trigger on `corpsOpFinished(vrs_herzegovina)` alone. In noop or reduced harness states, that condition was accidentally true before `Operation Visegrad` or `Operation Foca` had ever happened, so the op validated against missing brigades and emitted false noise. Pattern: if a triggered op is supposed to be a follow-on to named earlier operations, encode those prerequisites explicitly through operation-history checks (`corpsCompletedOp(...)`) instead of inferring them from present-time idleness.
**Compatibility warnings need a “should this authority exist?” gate (2026-04-08):** `evaluateDisplacementTriggers()` was warning whenever `hasLiveSectorFrontlineTruth()` was false, even in empty-roster noop harnesses where no sector truth could or should exist. Pattern: fallback warnings should require both the structural context (for example an operational SID→OSID mapping) and the live-force context (an active brigade roster) before declaring a missing-authority fault. Otherwise harnesses drown in expected compatibility noise and teams stop trusting the warnings.
**Completed-operation proofs must read archival authority, not runtime slots (2026-04-08):** A final save is allowed to have an empty `active_operations` list after an op completes. Proof tests that still expect completed progress to survive there are reading the wrong owner. Pattern: when verifying a finished operation, use `operation_aars.json` / completed AAR history for progress and completion evidence; reserve `active_operations` for live runtime only.
**Recovery gates must run each test under its native harness (2026-04-08):** A Vitest-authored test can appear “broken” when it is actually being launched through `tsx --test`. Pattern: if a repo-level recovery/check script mixes Node tests and Vitest tests, keep each file in the runner that owns its assertion/runtime contract instead of flattening them into one generic command.
**Operation truth needs a final authority pass after late brigade writers (2026-04-08):** Active operations can drift after creation when elite loans attach or recall, brigades are replaced, or late lifecycle changes occur after the op was first anchored. Pattern: before serialization, rebuild operation truth from active formations plus final sector truth: filter participants to active brigades only, filter every axis roster to that surviving set, re-derive the sector anchor from live brigade locations, and demote empty execution ops into explicit recovery instead of saving them as fake live execution. Linked: `[2026-04-08] fix(engine): Final operation truth reconciliation and axis-integrity hardening`.
**Axis rosters are equal citizens of operation truth, not derived decoration (2026-04-08):** A fix that updates `participating_brigades` but leaves `axis.assigned_brigades` stale only moves the drift one layer down. Pattern: every path that adds, removes, recalls, or replaces an operation participant must update both the flat participant list and the axis-level roster, or diagnostics and execution will disagree about who is really fighting. Linked: `[2026-04-08] fix(engine): Final operation truth reconciliation and axis-integrity hardening`.
**Operation anchors should prefer physical brigade truth over stale sector overlap (2026-04-08):** When deriving `sector_id` for a live or queued operation, a sector that physically owns the participating brigades through `territory_osids` or frontline `friendly_osids` is more truthful than a sector that merely still lists those brigades in an old assigned/reserve roster. Pattern: anchor selection should score physical ownership first, then fall back to roster overlap only when live location truth is unavailable. Linked: `[2026-04-08] fix(engine): Final operation truth reconciliation and axis-integrity hardening`.
**Launch-time feasibility checks must use the same truth surface as brigade-side order issuance (2026-04-08):** A probe that looks plausible from coarse geometry or objective lists can still be dead on arrival if the actual brigade cannot produce a legal, above-threshold adjacent attack this turn. Pattern: operation birth logic must validate candidate objectives through the same concrete attackability and political-block filters that the brigade AI will face one phase later. If launch and execution read different truth surfaces, the engine manufactures fake work. Linked: `[2026-04-08] fix(engine): Close dead-on-arrival probe birth and align combat-causality diagnostics with final attack truth`.
**Recovery invalidation must key off recovery reason, not just the absence of logged attempts (2026-04-08):** An operation that exits because every objective became politically blocked is not the same failure as an operation that promised action and then never attacked. Pattern: downstream diagnostics should classify recoveries from the explicit lifecycle reason (`no_logged_attempt`, `political_blocked`, `brigade_attrition`, etc.), not infer failure solely from missing attack logs. Otherwise honest clean exits pollute failure metrics. Linked: `[2026-04-08] fix(engine): Close dead-on-arrival probe birth and align combat-causality diagnostics with final attack truth`.
**Eligible-attacker diagnostics must read post-trim, post-block order truth (2026-04-08):** Counting "eligible attackers" before final corps-level trimming, share limits, or political blocking creates a stale metric that can disagree with the orders that actually survive into combat. Pattern: any execution-quality metric that claims to describe attacking forces must be derived from the final emitted order set, not a pre-filter approximation. Linked: `[2026-04-08] fix(engine): Close dead-on-arrival probe birth and align combat-causality diagnostics with final attack truth`.
**Packaged runtime proof should extend one canonical probe manifest instead of spawning sibling probe commands (2026-04-08):** Desktop runtime coverage stayed coherent when every new packaged route and contract was added to `desktop:package:probe` as another manifest assertion rather than as `desktop:sandbox:probe`, `desktop:operational:probe`, or other parallel scripts. Pattern: when expanding packaged-runtime proof, strengthen the single canonical probe path and its manifest first; only add a separate probe command if the launch environment is fundamentally different. Linked: `[2026-04-08] fix(desktop): Prove packaged operational tactical-map renderer reaction through the real session/store path`.
**Packaged-mode truth needs a real packaged probe in CI; unit tests and builds are not enough (2026-04-08):** Vitest plus `npm run build` can stay green while asar path resolution, packaged window routing, or IPC/session lifecycle is broken. Pattern: any desktop packaging change that matters to shipped behavior must be verified through a real packaged executable launched by a packaged-runtime probe, and that same probe should be the CI gate. Linked: `[2026-04-08] fix(desktop): Prove packaged operational tactical-map renderer reaction through the real session/store path`.
**Renderer freshness proof should validate the exact pushed payload, not merely eventual plausible state (2026-04-08):** A packaged renderer reacting to bridge traffic is necessary but still too weak if the proof only checks that state "looks right" after settling. Pattern: when verifying renderer-side bridge consumption, compare against the exact pushed payload identity already owned by the real store path (for example store fingerprint and probe marker), rather than inventing a synthetic UI assertion. Linked: `[2026-04-08] fix(desktop): Require packaged tactical-map renderer freshness and exact pushed-payload identity`.
**Historical-op triggers need both chronology and live relevance (2026-04-08):** A triggered operation should not exist just because the calendar says so. `Operation Kotor Varos` still hit the validation gate even after the map had already made every objective RS-controlled, producing startup warning noise instead of useful planning truth. The fix was not to suppress validation output globally; it was to make the trigger contract honest by requiring at least one remaining enemy-held objective before the operation is considered live. Pattern: historical or scripted operation offers need two gates - "is it the right time?" and "is there still anything left to do?" A pure time gate is a stale-content trap.

**`no_logged_attempt` is execution failure, not a catch-all for bad operation birth (2026-04-08):** Dead-on-arrival probes were being born in planning, failing to become execution-ready, then entering recovery as `no_logged_attempt`. That polluted combat-causality because the engine was classifying a planning/orchestration failure as a combat/execution failure. The correct contract is: if a probe misses its immediate launch window without ever becoming usefully executable, it should enter `planning_invalidated` recovery. Reserve `no_logged_attempt` for operations that actually reached execution truth and still failed to attack. Pattern: recovery reasons are part of causality provenance, not just cleanup labels. Choose them by lifecycle ownership.

**Generic corps trimming must never silently override named operation ownership (2026-04-08):** `bot_brigade_ai_osid.ts` had a corps-level attack-share cap and RBiH warlord-friction trimming that could remove attack orders from brigades already participating in active operations. The result was a planner/executor civil war: an operation could be born honestly, then starved by a generic cap that did not know it was touching named-op participants. Fix: split attacks into pinned active-operation attackers and trimmable generic attackers, then trim only the latter. Pattern: when a global balancing pass acts on the same objects as a higher-priority ownership system, add a "pinned" exemption for objects already claimed by the higher-priority system.

**Combat diagnostics must read operation-local final truth, not corps-wide approximations (2026-04-08):** `eligible_attacker_count` was originally derived from `eligible_attackers_by_corps`, which is a coarse corps snapshot taken before final order trimming. That made operation diagnostics disagree with the operation's real surviving attack orders. Fix: keep the legacy field name for compatibility, but derive it from the operation's own surviving participant attack orders after final order truth is known, and only invalidate execution lulls when the operation has never logged prior attempts or captures. Pattern: when diagnosing a per-entity failure (operation, sector, brigade), use the entity's final local truth owner. Corps- or faction-level aggregates are good for dashboards, not for blame.

**Split-child overlap rescue needs an edge-floor guard, not a blanket frontline prohibition (2026-04-09):** The original territory-membership pre-pass in `ensureMinimumSectorCoverage(...)` correctly refused to steal frontline-essential brigades from donor sectors, but that rule was too strict for sibling sectors created by contiguity splitting when both sectors truthfully share the same front OSID. In that shape, a brigade can be "frontline-essential" to the donor and still be the honest brigade for the zero-covered sibling. The right repair is narrow: prefer ordinary territory rescues first, then allow a shared-front overlap rescue only when the donor remains at or above its own hostile-edge floor after the transfer (`assigned_brigade_ids.length > max(1, length_edges)` before donation). Pattern: when a frontline guard blocks a split-child repair, do not weaken the guard globally; add an overlap-specific exception tied to the donor's retained frontage floor and deterministic candidate ordering.
**Post-run validators must consume serialized unresolved truth, not reconstruct retired assignment doctrine (2026-04-09):** `tools/validate_run_consistency.cjs` was still enforcing "every brigade in a corps with sectors must be assigned" even though the live engine had already narrowed the owner to `military.unresolved_sector_brigades`. That produced false failures on honest final saves. Pattern: when a validator is checking the result of a canonical builder or reconciliation pass, read the builder's serialized unresolved/error set directly instead of re-deriving a broader doctrine from nearby state. If the sim already decided what counts as unresolved, downstream harnesses should validate that owner, not compete with it.
