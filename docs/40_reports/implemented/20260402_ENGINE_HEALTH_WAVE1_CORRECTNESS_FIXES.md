# 2026-04-02 Engine Health Wave 1 Correctness Fixes

## Scope

This report records the first implemented slice of the 2026-04-02 engine-health triage:

- objective-relevant operation intel confidence
- authoritative war exhaustion in victory termination
- more honest corps offensive launch feasibility
- commander force evaluation consuming `supply_by_osid`
- Army HQ gathering using real recent-front territory change

These are `v0.8.0.x` correctness fixes, not feature additions.

## Why this wave mattered

The engine-health audit surfaced a common pattern: the engine was often *almost* honest, but still making decisions from the wrong truth source.

- Operations preparation could use the highest sector-intel confidence even when the chosen objective lived in a different enemy sector.
- Victory/war termination could still read stale formation-profile exhaustion instead of the political war-exhaustion ledger.
- Corps launch feasibility could approve offensives based on attacker/defender base power while ignoring key defender advantages that real commanders would care about immediately.

That combination risks exactly the sort of Claude-made damage the triage was meant to catch: superficially plausible logic operating on the wrong authority.

## Implemented fixes

### 1. Objective-relevant intel confidence

File:
- `src/sim/combat/operation_preparation.ts`

Change:
- `getOperationIntelConfidence()` now tries to resolve the operation's actual target OSIDs to enemy sectors and prefers the intel record facing the sector that contains the objective.
- If the available state slice is too thin to support that mapping honestly, it falls back to the best facing-sector record instead of falsely treating the operation as blind.

Why this is the right contract:
- objective-specific intel should be used when the engine can truly resolve it
- older / thinner state slices must not collapse to zero confidence just because they lack enough geometry or controller context

### 2. Political war exhaustion is authoritative

File:
- `src/scenario/victory_conditions.ts`

Change:
- victory evaluation now reads `state.political.war_exhaustion[factionId]` first
- legacy `f.profile.exhaustion` remains only as a fallback

Why this is the right contract:
- political war exhaustion is the canonical strategic ledger
- victory and termination logic must not decide the end of the war from stale or shadow exhaustion fields

### 3. Launch feasibility now respects defender reality

File:
- `src/sim/combat/sector_offensive.ts`

Change:
- launch-feasibility checks now include defender artillery, entrenchment, and terrain defensive multipliers when estimating whether an offensive is actually viable

Why this is the right contract:
- a launch screen that ignores obvious defender bonuses will green-light offensives that any competent headquarters would reject
- this was a real “engine lies to itself” issue, not just tuning

### 4. Commander force evaluation now consumes local supply truth

Files:
- `src/sim/combat/commander/force_eval.ts`
- `src/sim/combat/commander/assess.ts`

Change:
- brigade fitness scoring now reads `supply_by_osid` from the commander briefing when that report is available
- brigades use the supply state at their actual `location_osid` instead of always inheriting the conservative unknown/default multiplier

Why this is the right contract:
- the commander briefing already carries local supply truth
- if force scoring ignores it, the engine is pretending to be more wired than it really is
- this closes the gap between “we derived supply by OSID” and “the commander actually uses it”

### 5. Army HQ gathering now sees recent front gains and losses

Files:
- `src/sim/combat/army_hq_gathering.ts`

Change:
- `recent_territory_change` is no longer hardcoded `0`
- gathering now derives a net gain/loss signal from `political.control_events`, scoped to each corps's current front neighborhood:
  - sector `territory_osids`
  - front-line `friendly_osids`
  - front-line `enemy_osids`

Why this is the right contract:
- Army HQ should not deliberate as if every front were territorially static
- this gives campaign planning a simple but real “this corps is gaining ground / losing ground / stable” input without inventing a huge new system

### 6. Player-facing map shell and threat language no longer leak raw internals

Files:
- `src/ui/map/components/TopToolbar.tsx`
- `src/ui/map/components/Tooltip.tsx`
- `src/ui/map/components/OperationHistoryPanel.tsx`
- `src/ui/map/components/CommanderSelectionModal.tsx`
- `src/ui/map/components/army_hq/PersonnelContent.tsx`
- `src/ui/map/components/army_hq/ThreatAssessment.tsx`
- `src/ui/map/components/army_hq/generateThreatAssessment.ts`

Change:
- standalone tactical map now exposes a real desktop return-to-Warroom action through `focusWarroom()`
- Codex has a visible top-toolbar entrypoint again
- formation tooltip, operation history, officer assignment, and personnel roster stop rendering raw corps ids to the player
- threat assessment now speaks in front-level abstractions such as `3rd Corps front - hostile operation in execution` instead of enemy corps ids or enemy operation names
- threat generation was split into a pure utility so the player-facing language contract can be tested without depending on React renderer imports

Why this is the right contract:
- player-facing surfaces must describe the player's war, not expose engine internals
- standalone desktop map without a clear path back to HQ is shell drift, not a minor UX nit
- pure view-model generators are easier to lock with tests than JSX-bound logic

### 7. Briefing and officer-event fallbacks no longer degrade to raw ids

Files:
- `src/ui/map/components/army_hq/SituationBriefing.tsx`
- `src/ui/map/components/OfficerEventBadge.tsx`

Change:
- situation briefing no longer falls back to raw `sector_id` in low-intel / thin-front alert titles
- officer replacement modal no longer falls back to raw `corps_id`

Why this is the right contract:
- fallback paths are where player-facing integrity quietly dies
- if a display name is missing, the right fallback is generic player language (`this sector`, `this corps`), not backend identifiers

### 8. Commander briefing now carries real brigade fatigue, and planning respects it

Files:
- `src/sim/combat/commander/commander_state.ts`
- `src/sim/combat/commander/briefing.ts`
- `src/sim/combat/commander/plan.ts`

Change:
- `CommanderBriefing` now carries:
  - `avg_fatigue_pct`
  - `brigades_above_fatigue_threshold`
- the briefing derives both values from the live `formation.ops.fatigue` field on subordinate brigades
- fresh offensive plans are now blocked when the corps-local brigade pool is already heavily fatigued

Why this is the right contract:
- commander intelligence should not know corps exhaustion globally while remaining blind to the actual wear state of the brigades it intends to spend
- `formation.ops.fatigue` is already the engine’s living tactical fatigue truth; this change makes the commander consume it instead of inventing a shadow field
- this closes another split-truth gap where the engine tracked local fatigue but the planner still behaved as if all available brigades were equally fresh

## Tests added or extended

- `tests/probe_preparation.test.ts`
  - added coverage proving objective-specific intel selection
- `tests/war_termination.test.ts`
  - added coverage proving political war exhaustion is authoritative
- `tests/corps_level_operations.test.ts`
  - added coverage proving launch feasibility rejects offensives that only look viable because defender bonuses were ignored
- `tests/commander/commander.test.ts`
  - added coverage proving brigade and corps force evaluation consume explicit supply-state truth
- `tests/army_hq_gathering.test.ts`
  - added coverage proving recent front gains/losses are derived from nearby control events instead of a placeholder constant
- `tests/ui_map_render_smoke.test.ts`
  - added coverage proving threat assessment uses friendly front labels and does not leak raw enemy corps ids or operation names
- `tests/commander/briefing_campaign_intent.test.ts`
  - added coverage proving the briefing summarizes subordinate brigade fatigue from `formation.ops.fatigue`
  - added coverage proving heavy local fatigue blocks creation of a fresh opportunity plan
- `tests/commander/commander.test.ts`
  - added coverage proving high average brigade fatigue blocks fresh offensive planning in the general commander suite

## Verification

Executed in clean implementation lane:
- `F:\AWWV_exec_clean`
- branch: `codex/engine-health-wave1`

Passing verification:

```powershell
node_modules\.bin\vitest.cmd run tests\probe_preparation.test.ts tests\war_termination.test.ts tests\corps_level_operations.test.ts
```

Result:
- `3` targeted engine-health test files passed
- `61` tests passed in that targeted slice

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\commander\commander.test.ts
```

Result:
- `1` additional commander suite passed
- `50` tests passed

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\army_hq_gathering.test.ts
```

Result:
- `1` Army HQ gathering suite passed
- `63` tests passed

Combined targeted sweep:

```powershell
node_modules\.bin\vitest.cmd run tests\probe_preparation.test.ts tests\war_termination.test.ts tests\corps_level_operations.test.ts tests\commander\commander.test.ts tests\army_hq_gathering.test.ts
```

Result:
- `5` test files passed
- `174` tests passed

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts
```

Result:
- `1` UI smoke suite passed
- `7` tests passed

Additional verification:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1
```

Result:
- `Claude governance check: OK`

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts
```

Result:
- `4` commander / Army HQ files passed
- `124` tests passed

Execution note:
- `npm run desktop:map:build` is currently blocked in the clean lane by missing `@vitejs/plugin-react` resolution from the shared `node_modules` link
- that appears to be environment/tooling drift in the clean lane, not a regression introduced by this checkpoint

## Architectural takeaways

- `Best available` is not always the right truth source; the engine often needs `best relevant`.
- Shadow state fields are dangerous even when they look harmless.
- Feasibility logic is part of strategy honesty, not just combat tuning.
- A derived report that never gets consumed is not a feature yet; it is deferred wiring.
- Typed strategic fields that stay pinned to a placeholder constant are just decorative architecture until they ingest real events.
- Player-facing threat/intel surfaces should consume deeper engine truth only through a translation layer that talks about friendly fronts, not enemy internal ids.
- Standalone tactical map is a product shell, not just a renderer; if it has no route back to HQ or no visible records entrypoint, the shell architecture is lying.

## Roadmap fit

This report belongs to:
- `v0.8.0.x` correctness / stabilization

It directly supports:
- `v0.8.x-final` structural honesty
- `v0.8.1` commander maturity only after truthful substrate

## Canonical owner / demoted path / done means

Canonical owner:
- operation-preparation owns objective-relevant preparation intel reads
- political war-exhaustion ledger owns exhaustion truth for victory checks
- sector-offensive launch feasibility owns honest go/no-go screening
- commander force evaluation owns brigade-fitness use of `supply_by_osid`
- Army HQ gathering owns recent front-change signal for corps assessments
- top-toolbar / Army HQ player surfaces own navigation and player-facing presentation of tactical-map intelligence

Demoted path:
- “best record no matter which objective is being attacked”
- “formation profile exhaustion as de facto war-end authority”
- “base-power-only launch viability”
- “local supply report exists but force scoring still uses a fake default”
- “recent_territory_change exists in the type but is always 0 in practice”
- “raw corps ids / enemy op names in normal player-facing tactical-map UI”

Player-visible truth:
- player-facing surfaces may use deep engine truth internally, but they must narrate it as player front truth rather than enemy internal identifiers

Canonical UI surface:
- top toolbar for shell navigation
- Army HQ threat assessment for staff-level threat picture
- operation history for player-owned operational history naming

Done means:
- the new targeted regression tests pass together
- the three fixes are documented as canonical engine behavior
- threat assessment regression test proves no raw enemy corps ids or operation names leak through the player-facing surface

## Additional checkpoint: secondary player-facing leak sweep

Follow-on player-facing integrity work in the same clean lane added a shared label/filter layer for secondary panels and fallback strings.

Implemented:
- `src/ui/shared/playerFacingLabels.ts`
  - centralized shared helpers for player-facing corps/sector/assignment labels
  - added player-faction operation filtering helper for omniscient UI stores
- `src/ui/map/components/OperationsPanel.tsx`
  - standalone operations list now renders only player-faction operations
- `src/ui/map/components/OperationDetail.tsx`
  - sector labels no longer fall back to raw `sector_id`
- `src/ui/map/components/FormationDetail.tsx`
  - sector badge title now uses player-facing sector naming
- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - officer roster and commander reassignment dialog now resolve corps labels through display names
- `src/ui/map/utils/officerUtils.ts`
  - generic unavailability reasons no longer leak enclave ids or raw corps ids
- `tests/ui_map_render_smoke.test.ts`
  - now covers shared player-facing labels and player-faction operation filtering

Verification:
- `node_modules\\.bin\\vitest.cmd run tests\\ui_map_render_smoke.test.ts`
  - PASS (`9` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

Why this matters:
- The worst player-facing leaks often reappear in secondary panels and fallback text after the main surface is fixed.
- Omniscient renderer state is survivable only if player panels actively filter it before rendering.
- Player-facing labels need one shared translation layer or raw ids will keep coming back.

## Additional Wave 1 slice: player-facing label safety across map and Warroom

This follow-on slice tightened the display-translation layer so player-facing surfaces do not degrade to raw corps or sector ids when a secondary lookup is missing.

Implemented:
- `src/ui/shared/playerFacingLabels.ts`
  - shared helpers for corps / sector / assigned-command display names
- `src/ui/map/components/OperationDetail.tsx`
  - sector anchor labels no longer fall back to raw `sector_id`
- `src/ui/map/components/FormationDetail.tsx`
  - brigade sector hover/title text now uses player-facing sector labels
- `src/ui/map/utils/officerUtils.ts`
  - generic availability reasons no longer expose raw enclave ids or raw assigned corps ids
- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - officer roster and reassignment dialog now use formation display names instead of raw corps ids
- `tests/ui_map_render_smoke.test.ts`
  - added label-safety regression coverage for corps / sector / assigned-command helpers

Additional verification:

```powershell
node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts tests\warroom_smoke.test.ts
```

Result:
- `2` UI / Warroom smoke suites passed
- `11` tests passed

Why this matters:
- the first layer of player-truth integrity is not only hiding enemy data
- it is also preventing fallback strings from collapsing into engine identifiers when a lookup is missing
- that contract has to hold in both React tactical-map surfaces and older Warroom shell surfaces, or the product still feels like a debugging tool

## Additional Wave 1 slice: player-only command rail and map-op visibility

This checkpoint closes a more structural player-truth leak: several global tactical-map surfaces were still rendering omniscient multi-faction collections even after the first round of tooltip and fallback cleanup.

Implemented:
- `src/ui/shared/playerFacingLabels.ts`
  - now also owns `getPlayerFacingFaction`, `getPlayerVisibleFactions`, and `getPlayerVisibleOperations`
- `src/ui/map/components/OOBSidebar.tsx`
  - Army, Mobilization, Operations, and Sectors accordions now render only the player faction instead of all three factions
  - counts now derive from player-visible collections rather than omniscient totals
- `src/ui/map/components/SelectionPanel.tsx`
  - settlement operation lists now filter to player-faction operations before rendering
- `src/ui/map/map/builders/buildOperationArrowsGeoJSON.ts`
  - map operation arrows now render only player-visible operations
- `tests/ui_map_render_smoke.test.ts`
  - added regression coverage for player-visible faction filtering and player-only operation arrows

Verification:
- `node_modules\\.bin\\vitest.cmd run tests\\ui_map_render_smoke.test.ts tests\\warroom_smoke.test.ts`
  - PASS (`13` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

Why this matters:
- the most dangerous player-facing leaks are not only raw labels
- they are whole panels that quietly behave like staff-god-mode debug shells
- until a real renderer-state boundary exists, global lists and map overlays must filter omniscient state before they render

## Additional Wave 1 slice: ops truth after target/participant narrowing

This checkpoint fixed two quieter engine-health lies inside the operation-launch and preparation chain.

Implemented:
- `src/sim/combat/operation_preparation.ts`
  - `estimateForceRatio(...)` now narrows defender strength to the enemy sectors that actually cover the operation's objectives when that mapping is available
  - extracted shared objective-sector resolution helper so intel confidence and force-ratio estimation use the same target set
- `src/sim/combat/sector_offensive.ts`
  - launch feasibility is now re-checked after enclave filtering and reserve trimming so launch approval cannot borrow strength from brigades that never actually join the operation
- `tests/probe_preparation.test.ts`
  - added regression coverage proving force-ratio estimation ignores unrelated enemy sectors on the same front
- `tests/engine_health_wave1_ops_truth.test.ts`
  - added focused regression proving an operation is rejected when the only viable brigade is trimmed out of the actual participant set
- `vitest.config.ts`
  - wired the new focused engine-health regression into the whitelist harness so it actually runs in CI/local verification

Verification:
- `node_modules\\.bin\\vitest.cmd run tests\\probe_preparation.test.ts tests\\engine_health_wave1_ops_truth.test.ts`
  - PASS (`36` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

Environment note:
- `npx.cmd tsc --noEmit -p tsconfig.json` in the clean lane is still blocked by missing React/Vite packages in the linked toolchain. That remains lane environment drift, not a regression from this ops slice.

Why this matters:
- objective-specific preparation only becomes honest when confidence and force-ratio math are talking about the same enemy
- launch screening is still lying if it approves an operation based on brigades that will be filtered out before execution
- brittle monolithic legacy suites are not enough here; focused regression harnesses are how we keep these subtle optimism leaks dead

## Additional Wave 1 slice: player-visible map/state shell tightened again

This checkpoint pushed the player-truth sweep one layer deeper by fixing omniscient tactical-map summaries and making formation rendering obey the existing fog-derived visibility contract instead of treating every formation as globally renderable.

Implemented:
- `src/ui/shared/playerVisibility.ts`
  - added `filterPlayerVisibleMapFormations(...)` so map rendering can distinguish between player-owned formations and fog-visible enemy formations
- `src/ui/map/map/builders/buildFormationsGeoJSON.ts`
  - now renders all player formations plus only those enemy formations whose OSIDs are in `fogOfWar.visibleEnemyOsids`
  - stops the tactical map from quietly using full omniscient formation truth as its default render contract
- `src/ui/map/components/BottomStatusStrip.tsx`
  - active operation count is now player-facing instead of reading `loadedGameState.operations.length`
- `src/ui/map/components/SituationTab.tsx`
  - territory and casualty overview blocks now report only the player faction in normal player mode instead of a three-faction omniscient scoreboard
- `src/ui/warroom/components/FactionOverviewPanel.ts`
  - folded the pending player-facing command-label cleanup into the same checkpoint so Warroom keeps pace with the tactical-map truth model
- `tests/ui_player_visibility.test.ts`
  - added regressions proving map visibility keeps own formations plus only fog-visible enemy formations

Verification:
- `node_modules\\.bin\\vitest.cmd run tests\\ui_player_visibility.test.ts tests\\ui_map_render_smoke.test.ts tests\\warroom_smoke.test.ts`
  - PASS (`18` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

Why this matters:
- fog only becomes a meaningful product rule when renderer visibility actually consults it
- a player shell that still advertises omniscient ops, territory, or casualty totals is a debug shell in nicer clothes
- once player-facing filters exist, they need to be applied consistently across map, tactical HUD, and Warroom or the product will keep re-leaking the same truth through secondary surfaces

## Additional Wave 1 slice: Army HQ campaign intent now reaches corps planning

This checkpoint closed one of the most important “strategy talks to itself” gaps in the engine: Army HQ gathering was already producing front priorities, hold targets, and synchronized-op roles, but the corps commander briefing was flattening all of that down to a generic stance before planning began.

Implemented:
- `src/sim/combat/commander/commander_state.ts`
  - expanded `CommanderBriefing` with explicit Army HQ campaign intent fields:
    - `campaign_role`
    - `campaign_offensive_targets`
    - `campaign_hold_targets`
    - `campaign_stance_ceiling`
    - `campaign_sync_role`
    - `campaign_sync_targets`
- `src/sim/combat/commander/briefing.ts`
  - now reads the live faction `CampaignPlan`
  - carries the current corps’s front-priority role, offensive target shortlist, doctrine ceiling, and sync-op slice into the briefing
  - merges Army HQ `hold_targets` into `must_hold_osids`, so strategic hold intent reaches garrison logic instead of dying in the gathering layer
- `src/sim/combat/commander/plan.ts`
  - opportunity planning now prefers staging zones whose adjacent enemy OSIDs intersect Army HQ offensive targets when the corps is on a primary/secondary front
  - target ranking now prefers Army HQ offensive targets inside the chosen staging zone before falling back to local exposure scoring
- `tests/commander/briefing_campaign_intent.test.ts`
  - added regression coverage proving briefing propagation and hold-target merging
  - added regression coverage proving opportunity plans prioritize Army HQ offensive targets
- `vitest.config.ts`
  - wired the new briefing/intent regression into the allowlisted Vitest harness

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`115` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- Army HQ strategy is no longer reduced to “stance only”
- strategic hold intent now affects the same `must_hold` substrate the commander already respects
- corps commanders still choose how to fight, but they no longer ignore the theater-level target emphasis the engine is already computing

## Additional Wave 1 slice: corps reinforcement pressure now reaches Army HQ

This checkpoint closes another dead feedback loop in the command stack: corps commanders were already emitting reinforcement requests, but those requests died inside `CommanderOutput` and never reached Army HQ gathering.

Implemented:
- `src/state/game_state.ts`
  - `CorpsCommandState` now persists `commander_reinforcement_requests` as a canonical corps-side strategic signal
- `src/sim/combat/commander/commander_loop.ts`
  - `applyCommanderOutput(...)` now writes the commander’s reinforcement requests back into corps state for next-turn continuity
- `src/sim/combat/army_hq_gathering_types.ts`
  - `CorpsAssessment` now carries:
    - `commander_reinforcement_priority`
    - `commander_reinforcement_brigades_needed`
- `src/sim/combat/army_hq_gathering.ts`
  - Army HQ theater assessment now summarizes the persisted commander requests into a corps-level pressure signal
  - opportunity scoring now penalizes corps that are actively asking for reinforcement instead of pretending they are equally suitable offensive candidates
  - front-priority generation now refuses to leave a high/critical requesting corps on an `economy` role
- `src/sim/combat/army_hq_gathering_constants.ts`
  - added explicit reinforcement-pressure score modifiers so the signal is visible in role shaping instead of being hand-waved
- `tests/commander/reinforcement_signal_flow.test.ts`
  - new focused regression proving the commander signal survives `applyCommanderOutput(...)`
- `tests/army_hq_gathering.test.ts`
  - added regressions proving Army HQ sees the persisted signal and changes front-role classification because of it
- `vitest.config.ts`
  - wired the new focused commander/Army HQ regression file into the Vitest allowlist

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`66` tests)
- `node_modules\.bin\vitest.cmd run tests\commander\commander.test.ts tests\commander\briefing_campaign_intent.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`118` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- this repo already had the data and the types for corps reinforcement pressure, but not the behavior
- a request that never reaches the next decision-maker is not a subsystem, it is decorative architecture
- Army HQ can now hear when a corps is asking for help, which is the minimum honest substrate before any more elaborate reserve-transfer or synchronized-op logic can claim to be “strategic”

## Additional Wave 1 slice: corps exhaustion now reaches commander planning

This checkpoint closes another quiet honesty gap in the commander pipeline: the old corps-op path already refused to launch new operations above `MAX_EXHAUSTION_FOR_OPERATION`, but the newer commander-plan path was missing that same constraint because `CommanderBriefing` did not carry corps exhaustion at all.

Implemented:
- `src/sim/combat/commander/commander_state.ts`
  - `CommanderBriefing` now includes canonical `corps_exhaustion`
- `src/sim/combat/commander/briefing.ts`
  - `buildBriefing(...)` now reads `corps_command[corpsId].corps_exhaustion` and threads it into the commander briefing contract
- `src/sim/combat/commander/plan.ts`
  - new-plan creation now respects the existing `MAX_EXHAUSTION_FOR_OPERATION` threshold from `bot_constants.ts`
  - exhausted corps stop at the planning gate instead of creating fresh offensive intentions the older operation path would have rejected
- `tests/commander/briefing_campaign_intent.test.ts`
  - added regression coverage proving the briefing now carries the live corps exhaustion value
- `tests/commander/commander.test.ts`
  - added regression coverage proving exhausted corps do not create new offensive plans

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`119` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- a corps that is too exhausted to launch should also be too exhausted to invent fresh offensive plans
- this keeps the commander-intelligence path and the older corps-op threshold from teaching different truths
- in this repo, a missing field in the briefing contract is often more dangerous than an obviously broken formula because it makes the AI sound sophisticated while staying strategically blind

## Investigative note: feints are weak, but not dead anymore

During this wave I also re-checked the earlier engine-health finding that feints had “zero enemy effect.” That finding is now partially stale.

Confirmed live behavior:
- `deriveSectorIntel(...)` classifies enemy feints as `offensive_prep`
- enemy-facing sector intel records set `offensive_signs=true`
- commander `makeDecisions(...)` converts that into `concentration_detected`
- the enemy commander can react by shifting the facing sector to `fortify`

What remains true:
- feints are still weaker and cruder than they should be as a deception system
- but they are no longer literally inert

Why this matters:
- this is a good example of a dangerous repo blindspot: a finding that was once correct can become half-stale after surrounding systems evolve
- before “fixing” an audit item, prove whether it is still dead, half-alive, or already consumed by the current pipeline

## Additional Wave 1 slice: adjacent enemy heavy equipment now shapes commander planning

This checkpoint closes another commander-briefing blindspot: the corps commander could already count brigades and pressure, but still had no way to distinguish a lightly held infantry front from an adjacent armored/artillery-heavy sector.

Implemented:
- `src/sim/combat/commander/commander_state.ts`
  - `CommanderBriefing` now includes canonical `enemy_equipment_summary`
- `src/sim/combat/commander/briefing.ts`
  - now derives adjacent enemy-sector heavy equipment truth from the real corps-front contact map
  - summarizes total enemy `tanks`, `artillery`, and whether the facing enemy is effectively `infantry_only`
- `src/sim/combat/commander/plan.ts`
  - opportunity and pre-planned offensive creation now require an extra brigade when the facing enemy front is heavy enough to be qualitatively different
  - this extra requirement can pull in one support-grade brigade when needed, instead of pretending the corps should attack the same way against every enemy mix
- `tests/commander/briefing_campaign_intent.test.ts`
  - added regression coverage proving the briefing carries adjacent enemy equipment truth
  - added regression coverage proving heavy enemy equipment increases required brigades for opportunity planning
- `tests/commander/commander.test.ts`
  - updated commander briefing fixtures to match the stricter contract

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`121` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- without this, the commander was still planning as if “enemy frontage” mattered but “enemy quality” did not
- heavy opposing armor/artillery now changes the concentration requirement before the operation exists, not only later in combat math
- this is the kind of fix that makes the AI less theatrical and more honestly constrained

## Additional Wave 1 slice: brigade fatigue now reaches commander force scoring

This checkpoint closes the next split-truth gap after the briefing/planning fatigue fix: the commander could now *know* local brigade fatigue, but force evaluation still rated tired brigades as if they were fresh.

Implemented:
- `src/sim/combat/commander/force_eval.ts`
  - brigade offensive and defensive fitness now apply a fatigue multiplier derived from live `formation.ops.fatigue`
  - the multiplier is aligned with the canonical combat floors already used in `combat_math.ts`
    - attack floor `0.6`
    - defense floor `0.75`
  - borderline assault brigades can now fall out of `main_effort` when fatigue has actually worn them down
- `tests/commander/commander.test.ts`
  - added regression coverage proving brigade fitness drops with heavy local fatigue
  - added regression coverage proving fatigue can demote a borderline assault brigade out of `main_effort`

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\commander.test.ts tests\commander\briefing_campaign_intent.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`126` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- briefing awareness alone was not enough; the commander could still block one plan for fatigue while rating the same tired brigades as pristine assault assets in allocation logic
- this keeps force scoring, planning, and combat power pointed at the same wear model instead of reintroducing fatigue blindness one layer lower
- in this repo, a signal only becomes honest once every downstream scorer that claims to care about combat fitness actually consumes it

## Additional Wave 1 slice: Army HQ economy/contain roles now constrain corps planning

This checkpoint closes another strategy-honesty gap: `CampaignPlan` front roles were already reaching `CommanderBriefing`, but local corps planning still treated `economy` and `contain` mostly as flavor unless local opportunity scoring happened to fail on its own.

Implemented:
- `src/sim/combat/commander/plan.ts`
  - fresh offensive plan creation is now explicitly blocked when Army HQ has marked the corps front as `economy` or `contain`
  - the planner now returns a truthful reason instead of falling through to a generic `no viable plan available`
- `tests/commander/briefing_campaign_intent.test.ts`
  - added regressions proving fresh offensive plans are not created on `economy` or `contain` fronts

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`128` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- a theater role that only works because local opportunity scoring happens to fail is decorative strategy, not command authority
- `economy` and `contain` now mean something mechanically at the exact place where fresh offensives are invented
- this makes Army HQ and corps planning tell the same story about which fronts are supposed to push and which fronts are supposed to hold

## Additional Wave 1 slice: synchronized-op intent now changes local target choice and role legality

This checkpoint closes the next decorative-strategy seam after front-role honesty: synchronized-operation roles and targets were already reaching `CommanderBriefing`, but the generic opportunity planner was still largely treating them as descriptive metadata.

Implemented:
- `src/sim/combat/commander/plan.ts`
  - synchronized-op `main_effort` / `supporting` targets now outrank broader campaign offensive targets when choosing staging priorities and opportunity objectives
  - synchronized-op `feint` / `fixing` roles now explicitly block the generic fresh-offensive path, because the normal offensive-plan machinery cannot honestly realize those roles yet
- `tests/commander/briefing_campaign_intent.test.ts`
  - added regressions proving synchronized-op targets outrank broader campaign targets
  - added regressions proving `feint` / `fixing` synchronized roles suppress generic fresh offensive plan creation

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts tests\commander\commander.test.ts tests\commander\reinforcement_signal_flow.test.ts tests\army_hq_gathering.test.ts`
  - PASS (`131` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- synchronized operations are no longer just a nicer target list; they now actually change what the corps planner prefers
- `feint` and `fixing` were especially dangerous because they looked implemented while still falling through the generic offensive path
- when a role cannot yet be executed honestly, the right first fix is to block the fake path rather than keep pretending it works

## Additional Wave 1 slice: hover tooltips now obey player-facing truth

This checkpoint starts the visible player-knowledge cleanup where users actually feel it first: hover tooltips. Before this change, tooltip surfaces still behaved like a staff/debug shell and could reveal exact enemy unit names, line composition, and local settlement truth that the player-facing product contract does not allow.

Implemented:
- `src/ui/map/components/tooltipPlayerSafe.ts`
  - new canonical helper module for player-safe tooltip shaping
  - own formations keep exact detail
  - enemy formations collapse to an `Enemy contact` abstraction
  - settlement hover unit lists keep only player-owned stationed formations
  - front hover keeps own line detail but reduces enemy side to contact-count abstraction
- `src/ui/map/components/Tooltip.tsx`
  - now routes formation, front, and settlement hover content through the player-safe shaping rules instead of rendering raw omniscient state directly
  - defense preview now uses player-owned brigades only
- `tests/ui_map_tooltip_player_visibility.test.ts`
  - added regressions proving own formations keep exact detail, enemy formations are abstracted, settlement tooltips exclude enemy stationed-unit leaks, and front hover hides enemy formation names
- `vitest.config.ts`
  - wired the new focused regression file into the repo’s explicit Vitest whitelist

Verification:
- `node_modules\.bin\vitest.cmd run tests\ui_map_tooltip_player_visibility.test.ts tests\ui_player_visibility.test.ts`
  - PASS (`8` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- in a grand-strategy / operational game, hover surfaces are part of the player contract, not harmless chrome
- exact enemy unit names and line composition in normal hover are cheat-surface leaks, not “nice debug detail”
- codifying the rule in one helper module is cheaper and safer than re-fighting the same leak in every tooltip-shaped component

## Additional Wave 1 slice: settlement selection panel now filters dossier and timeline truth

This checkpoint closes the next player-facing leak seam after tooltip cleanup: the selected-settlement panel was already filtering some visible lists, but its dossier/timeline inputs still forwarded raw omniscient operation history and brigade movement logs.

Implemented:
- `src/ui/shared/playerVisibility.ts`
  - added `filterPlayerFacingOperationHistory(...)` so settlement/history surfaces can consume only player-faction operation AARs
  - added `filterPlayerFacingMovementsByOsid(...)` so timeline panels only receive movement records for player-owned formations
- `src/ui/map/components/SelectionPanel.tsx`
  - stationed formations, sector lookup, pending orders, operation targeting, movement timeline, and operation-history timeline inputs now all route through player-facing filters
  - the selection panel no longer mixes a player-safe overview with omniscient dossier tabs
- `tests/ui_player_visibility.test.ts`
  - added regressions proving operation history and per-OSID movement logs are filtered to player-owned truth before downstream panels consume them

Verification:
- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`20` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- settlement detail panels are not “safer” just because they are selected rather than hovered; they are still player surfaces
- partial filtering is dangerous because it makes one tab look honest while another tab quietly leaks enemy unit or operation truth
- pushing the filters into shared visibility helpers is cheaper than doing another one-off anti-leak sweep later

## Additional Wave 1 slice: Warroom enemy contacts now stay abstract

This checkpoint closes the next player-facing leak seam in the desktop shell: Warroom report and magazine surfaces were still printing exact enemy formation names because the warroom snapshot contract itself carried raw enemy identifiers.

Implemented:
- `src/ui/warroom/data/war_data_extractor.ts`
  - `ContactedFormation` is now player-facing by construction: abstract `label` plus strength/contact context, no raw enemy formation id or name
  - contacted enemy extraction now emits `Enemy contact` instead of exact hostile formation labels
- `src/ui/warroom/components/ReportsModal.ts`
  - enemy-contact report lines now render the abstract Warroom contact label instead of raw hostile formation names
- `src/ui/warroom/components/MagazineModal.ts`
  - enemy assessment rows now render the same abstract contact label
- `tests/warroom_player_visibility.test.ts`
  - new regressions proving the snapshot contract stays abstract and both Warroom report surfaces avoid raw enemy formation names
- `vitest.config.ts`
  - wired the new Warroom visibility regression into the explicit Vitest whitelist and jsdom match list

Verification:
- `node_modules\.bin\vitest.cmd run tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts tests\ui_player_visibility.test.ts`
  - PASS (`10` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- if the snapshot contract is omniscient, every polished Warroom panel has to “remember not to say too much,” which always regresses
- abstracting enemy contacts at extraction time is cheaper and safer than patching each downstream Warroom panel separately
- this keeps Warroom acting like a headquarters shell instead of a debug console with nice typography

## Additional Wave 1 slice: operation records now obey player-facing visibility

This checkpoint closes the next “polished debug archive” seam in the player shell: the operation-history surface was still reading global active operations and global completed-operation history directly from `LoadedGameState`.

Implemented:
- `src/ui/shared/playerVisibility.ts`
  - added `filterPlayerFacingActiveOperations(...)` so records/history surfaces can consume only player-faction live operations
- `src/ui/map/components/OperationHistoryPanel.tsx`
  - active and completed operation lists now route through player-facing visibility helpers
  - corps-name resolution now derives from player-facing formations instead of the full omniscient formation set
- `tests/ui_player_visibility.test.ts`
  - expanded regression coverage to prove active-operation filtering follows the same player-faction rule as operation-history filtering

Verification:
- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`19` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- history/records panels are where omniscient truth loves to survive because they feel archival rather than live
- if the records tab can see everyone’s operations, it is still a debug shell even if the map itself is player-safe
- once the helper contract exists, every records-style surface should consume it instead of rolling its own filters
## Additional Wave 1 slice: legacy brigade pressure no longer writes canonical front pressure

This checkpoint drains one of the nastier half-alive authority paths in the core engine. `brigade_pressure.ts` already described itself as a dormant compatibility layer, but its sink function still mutated `state.military.front_pressure` by refreshing timestamps even when every computed delta was zero.

Implemented:
- `src/sim/combat/brigade_pressure.ts`
  - converted `applyBrigadePressureToState()` into a truly inert compatibility sink
  - kept the reusable brigade-pressure computation helpers intact for targeted historical tests, but removed the hidden write path into canonical front-pressure state
- `tests/engine_honesty_legacy_contracts.test.ts`
  - added a regression proving the legacy brigade-pressure sink no longer mutates `front_pressure`

Verification:
- `node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts tests\brigade_pressure.test.ts`
  - PASS (`23` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- `src/state/front_pressure.ts` is the canonical pressure owner and should be the only normal writer
- dormant compatibility layers become dangerous when they still touch live state “harmlessly”
- this removes one more split-truth edge where comments, imports, and runtime behavior were disagreeing

## Additional Wave 1 slice: engine must-hold zones now use real corps-boundary isolation

This checkpoint drains another decorative-architecture trap from commander zone detection. Engine-derived `must_hold` looked alive, but the live path had been hard-disabled because the old chokepoint heuristic overfired on internal corps geometry and could not distinguish “vital external corridor” from “same-corps internal split.”

Implemented:
- `src/sim/combat/commander/zone_detection.ts`
  - replaced the dead `false && ...` must-hold branch with a corps-boundary-aware isolation test
  - engine-derived `must_hold` now fires only when removing a chokepoint disconnects the current zone from a substantial friendly component that sits outside the corps’s own territorial set
  - internal same-corps chokepoints without scenario support no longer become fake must-hold zones
- `tests/commander/briefing_campaign_intent.test.ts`
  - added regressions proving an outside-corps corridor chokepoint becomes `is_must_hold === true`
  - added regressions proving an internal same-corps chokepoint stays `is_must_hold === false` without scenario-authored must-hold data

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts`
  - PASS (`13` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- `must_hold` only matters if the engine can derive it honestly instead of either overflagging everything or giving up entirely
- hard-disabled mechanics are usually worse than missing mechanics because they convince later agents the system is already accounted for
- this restores one more piece of commander defensive truth without reintroducing the old false-positive corridor panic

## Additional Wave 1 slice: commander briefings now include adjacent friendly corps posture

This checkpoint closes another local-only commander blindspot. The corps commander could already see enemy pressure, campaign intent, fatigue, exhaustion, and heavy equipment, but it still had no structured awareness of what neighboring friendly corps were doing right now.

Implemented:
- `src/sim/combat/commander/commander_state.ts`
  - added `AdjacentCorpsSummary` and `CommanderBriefing.adjacent_corps`
- `src/sim/combat/commander/briefing.ts`
  - added deterministic collection of adjacent friendly corps based on active same-faction brigades physically neighboring the corps area
  - each adjacent summary now carries neighboring `corps_id`, current `stance`, and active-operation count
- `tests/commander/briefing_campaign_intent.test.ts`
  - added a regression proving the briefing includes nearby friendly corps while excluding distant same-faction corps

Verification:
- `node_modules\.bin\vitest.cmd run tests\commander\briefing_campaign_intent.test.ts`
  - PASS (`14` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- local commanders should not plan as if neighboring friendly corps do not exist
- “adjacent corps” only becomes real when the briefing contract carries it, not when a design note says it would be nice
- proximity-based summaries are a cheap honest first step toward cross-corps timing without pretending true synchronized planning already exists

## Additional Wave 1 slice: retired brigade reposition orders no longer masquerade as a live player command

This checkpoint closes a nastier product-truth contradiction than a typical legacy helper. Brigade reposition orders were still accepted by the desktop contract, serialized into state, parsed by the tactical-map adapter, and documented as a live order type — but the war phase consumed them as a no-op compatibility sink with no gameplay effect.

Implemented:
- `src/desktop/desktop_sim.ts`
  - `validateBrigadeRepositionOrder(...)` now rejects new reposition orders explicitly with a retirement message instead of validating a fake feature
- `src/ui/map/data/GameStateAdapter.ts`
  - player-facing loaded state no longer exposes `repositionOrders`; stale save data may still carry the field, but the tactical-map shell no longer presents it as an active order type
- `tests/engine_honesty_legacy_contracts.test.ts`
  - added regressions proving the desktop contract rejects new reposition staging
  - added regressions proving the player shell does not expose retired reposition orders

Verification:
- `node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts`
  - PASS (`5` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- fake commands are worse than missing commands because they train players and future agents to trust a lie
- if a war-phase sink intentionally does nothing, the earliest honest desktop boundary should reject it rather than stage it
- player-facing adapters should not keep presenting retired order types just because old saves still contain the field

## Additional Wave 1 slice: commander reinforcement pressure now reaches the elite reserve queue

This checkpoint closes the next split-truth loop in the Army HQ layer. Corps commanders were already persisting reinforcement requests onto `CorpsCommandState`, and Army HQ gathering was already reading them for front-priority scoring, but the actual elite reserve request generator still ignored those commander signals and relied only on its older sector/op heuristics.

Implemented:
- `src/sim/combat/army_reserve_system.ts`
  - added deterministic summarization of `commander_reinforcement_requests`
  - `generateArmyReserveRequests(...)` now converts explicit commander pressure into a real reserve request candidate
  - commander-signaled pressure now competes with the older offensive/defensive/exploitation heuristics instead of dying after theater assessment
- `tests/army_reserve_system.test.ts`
  - added a regression proving a corps with commander reinforcement pressure but no legacy heuristic trigger still produces a pending elite reserve request

Verification:
- `node_modules\.bin\vitest.cmd run tests\army_reserve_system.test.ts tests\army_hq_gathering.test.ts tests\commander\reinforcement_signal_flow.test.ts`
  - PASS (`79` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- reinforcement loops are only real when the same signal survives all the way from corps assessment to reserve action
- if Army HQ scoring hears the corps commander but the reserve queue does not, the repo still has a split-truth command stack
- this turns commander reinforcement pressure from a diagnostic into an actionable reserve input without pretending the full strategic reserve system is finished

## Additional Wave 1 slice: Army HQ front priorities now respect recent territorial trend

This checkpoint closes another theater-level honesty gap. Army HQ was already computing `recent_territory_change` per corps, but front-priority scoring still leaned almost entirely on brigade count, strength class, exhaustion, and current threat. A corps actively losing ground could still be ranked like a normal opportunity front because the trend signal was not being consumed where role assignment actually happens.

Implemented:
- `src/sim/combat/army_hq_gathering_constants.ts`
  - added explicit opportunity-score modifiers for recent territorial loss and gain
- `src/sim/combat/army_hq_gathering.ts`
  - `computeOpportunityScore(...)` now penalizes corps that have been losing ground and modestly rewards corps that are consolidating gains
- `tests/army_hq_gathering.test.ts`
  - added a regression proving a corps with recent territorial losses no longer outranks a similarly strong stable corps for the primary role

Verification:
- `node_modules\.bin\vitest.cmd run tests\army_hq_gathering.test.ts`
  - PASS (`66` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- theater command should not rank a bleeding corps as an offensive opportunity just because the static force snapshot still looks healthy
- this turns recent control-change history from a decorative metric into a real front-role input
- the remaining work is now clearer: Army HQ is trend-aware, but the local commander assess path still lacks its own explicit territory-trend signal

## Additional Wave 1 slice: legacy brigade AoR imports are now fenced by a regression gate

This checkpoint hardens one of the easiest future-Claude failure modes: half-dead legacy helpers that still look reusable. `brigade_aor_legacy.ts` is now effectively a legacy/test-support module, but without a guardrail it would be easy for a future change to import it back into live runtime code and quietly reawaken the wrong authority path.

Implemented:
- `tests/engine_honesty_legacy_contracts.test.ts`
  - added a static regression that scans active `src/` files and fails if non-archived runtime code starts importing `brigade_aor_legacy.ts`
  - current honest allowance: only `brigade_pressure.ts` may still import it, and that module is already fenced as a no-op compatibility sink

Verification:
- `node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts`
  - PASS (`6` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

Why this matters:
- the most dangerous legacy code is the kind that still looks reusable enough for the next fix to pull it back in
- static regression gates are cheaper than another archaeological cleanup after the wrong helper starts shaping runtime truth again
- this is the kind of small hardening step that keeps the repo honest over time instead of relying on memory
