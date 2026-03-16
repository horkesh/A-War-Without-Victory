# Morning Report — Night Shift 2026-03-16

## Summary
All 8 planned milestones implemented and tagged (v0.3.2 through v0.4.4). 20 commits, 879 tests passing (was 763), ~5,500 new lines across ~50 files. Zero type errors.

## What Was Done

### v0.3.2 — Humanitarian Capital Per-Faction Attribution
- Fixed `computeHumanitarianData()` to attribute refugees to causer faction via `caused_by` field on DisplacementEvent
- 4 displacement event creation sites updated (displacement_takeover.ts ×2, minority_flight.ts, displacement.ts)
- Fallback to current OSID controller for legacy events
- /simplify: PASSED (minimal targeted fix)
- Version bumped: v0.3.2, tag pushed
- Commit: `5552108`

### v0.3.3 — Brigade AoR Sub-Segment Assignment (4 phases)
- **Phase A** (`28ff61c`): `primary_brigade_ids` on CorpsFrontSubSegment, `assigned_sub_segment_id` on FormationState, `assignBrigadesToSubSegments()` with home-proximity affinity algorithm, pipeline step
- **Phase B** (`9659089`): Combat resolver + predictor record `defending_sub_segment_id`
- **Phase C** (`cbd9f58`): `findWeakestSubSegment()`, weak sub-segment attack bonus, commander personality (aggressive=concentrate, cautious=spread)
- **Phase D** (`d0f6f10`): Bot reserve gap-fill, entrenchment reset (×0.3 on reassignment), gap double attack bonus
- Version bumped: v0.3.3, tag pushed

### INFRASTRUCTURE — Shared Utilities
- **deterministic_random.ts** (`20df364`): djb2 hash, `deterministicRandom()`, `deterministicInt()`, `deterministicPick()`
- **scenario_preseeding.ts** (`20df364`): Linear interpolation from historical baseline tables (capital, patron, support)
- **GlassPanel.tsx** (`8b89662`): 4-position glassmorphism panel (left/right/overlay/bottom-tray)
- **Command Briefing spec** (`8b89662`): 6-section design document
- No version bump (infrastructure)

### v0.4.0 — Peace Phase Interactivity
- **PeaceWarTransition.tsx** (`2833f82`): Overlay on phase change with faction briefings, OOB summary
- **PeaceStatusPanel** enhanced: End Turn button, staged investments indicator
- Org-pen heat map mode: DEFERRED (requires new GeoJSON builder)
- Version bumped: v0.4.0, tag pushed

### v0.4.1 — Complete Event System (5 phases)
- **Phase 1** (`a6851e8`): 8 EventEffect kinds, `applyEventEffects()`, `fired_event_ids` no-refire guard
- **Phase 2** (`8381d6f`): `EventResponseOption`, `PendingEventDecision`, bot auto-response, `resolveEventDecision()`, EventDecisionModal.tsx
- **Phases 3-4** (`b24311f`): 41 historical events (1992-1995), 6 decision events, `event_loader.ts`
- **Phase 5** (`b701b38`): EventModal.tsx, EventLogPanel.tsx, App wiring, GameStateAdapter, TopToolbar EVENTS button
- Version bumped: v0.4.1, tag pushed

### v0.4.2 — Additional Scenarios
- Jan 1993 mid-war scenario manifest (w39-w188)
- Sep 1991 full peace→war→Dayton (218w)
- ScenarioRegistry (6 entries, Mar 1994 + Jan 1995 blocked)
- ScenarioSelectionScreen.tsx with faction picker
- Phase 3: BLOCKED (user must paint Mar 1994 + Jan 1995 control maps)
- Version bumped: v0.4.2, tag pushed

### v0.4.3 — Economy & War Production
- 9 production facilities (expanded from existing), condition degradation
- 9 smuggling routes (3/faction) with deterministic disruption
- `update-smuggling-routes` pipeline step
- EconomyPanel.tsx with supply gauges, facility cards, route status
- Version bumped: v0.4.3, tag pushed

### v0.4.4 — Officer Experience & Weight of Command
- `officer_experience.ts`: post-op experience gain, outcome multipliers, ARBiH 1.5× learning
- `warlord_friction.ts`: reliability-based friction, deterministic via `deterministicRandom`
- Heroic stand (+aggressiveness, +morale), defeatism (-competence)
- Faction officer maturity tracking, OfficerProfile experience bar
- 2 pipeline steps: `check-warlord-friction`, `update-faction-officer-maturity`
- Version bumped: v0.4.4, tag pushed

## Test Results
- Suites: 75 passed (was 66)
- Tests: 879 passed (was 763), +116 new tests
- New test files: 9
- TypeScript: clean (0 errors)

## Decisions Made (FLAGGED FOR DAY SHIFT REVIEW)
- **[DECISION-1]**: Org-pen heat map mode (v0.4.0 Phase 3) deferred — requires new GeoJSON builder pipeline for peace phase data. Scope was larger than expected for a "0.5 session" task. Recommend implementing alongside the full peace map mode in a future milestone.
- **[DECISION-2]**: Sub-segment combat integration (v0.3.3 Phase B) kept minimal — the existing distance-weighted reactive defense already provides per-OSID variation since `assignBrigadesToSubSegments` places brigades near their sub-segment OSIDs. Only added `defending_sub_segment_id` tracking, not a fundamental defense formula change.
- **[DECISION-3]**: Bot auto-response for decision events uses `accept_first` as placeholder for `capital_based` logic. Proper capital comparison logic deferred.
- **[DECISION-4]**: Jan 1993 scenario uses existing `initial_control/jan1993.json` which was already present. If the user intended a freshly painted version, the manifest needs updating.

## Issues Found
- **[ISSUE-1]**: `production_facilities.ts` already existed with 7 facilities — the plan said to create it from scratch but the existing infrastructure was sufficient. Added 2 RS facilities to complete the set.
- **[ISSUE-2]**: `FormationDetail.tsx` already had equipment visibility (tanks/artillery condition bars) — Phase 4 of v0.4.3 was already implemented. No changes needed.

## Skipped (Blocked)
- **v0.4.2 Phase 3 (Mar 1994 + Jan 1995 scenarios)**: Blocked on user painting control maps. Placeholder entries in ScenarioRegistry marked `available: false`.
- **v0.4.5 (AI Commander)**: Not in handoff scope — requires day shift design review + API key setup.

## Observations & Proposals

### Opportunities Noticed
- **[OPP-1]**: The event system could benefit from a "chain" mechanism — events that fire in response to other events (e.g., Markale massacre → NATO ultimatum). Would take ~30 lines. Currently they fire independently by turn range.
- **[OPP-2]**: The smuggling route system naturally enables a "sanctions" mechanic — international sanctions reduce disruption_chance threshold, making smuggling more reliable when sanctions are enforced. Would integrate with patron_pressure.
- **[OPP-3]**: Officer experience + friction + relationships create a rich decision space for the AI Commander (v0.4.5). The friction system's "unauthorized op" type would be particularly interesting for Claude to reason about.

### Problems Discovered
- **[PROB-1]**: The `buildOsidAdjacency` function is called in multiple places during the war phase pipeline. The adjacency graph doesn't change within a turn, so it could be computed once and passed through context. Not a correctness issue but a performance consideration for larger maps.

### Feature Ideas (DO NOT IMPLEMENT — for day shift consideration)
- **[IDEA-1]**: Event images could use Gemini-generated illustrations. The `image` field on EventDefinition is ready — just needs the visual assets placed in `data/scenarios/events/images/`.
- **[IDEA-2]**: The scenario selection screen could show a mini-timeline visualization (1991→1995 with scenario start marked). Would be ~50 lines of SVG.
- **[IDEA-3]**: Warlord friction could trigger "loyalty missions" for the player — send a trusted officer to the friction source to resolve it. Would integrate with the operation preparation system.

### Code Quality Notes
- `corps_front_sectors.ts` is now ~4,100 lines. Consider extracting sub-segment assignment into `subsegment_assignment.ts`.
- `App.tsx` is accumulating conditional rendering blocks (events, economy, peace transition). Consider a `PanelManager` component.

## Commits (chronological)
1. `5552108` — fix(capital): attribute humanitarian refugees to causer faction
2. `28ff61c` — feat(aor): Phase A — brigade sub-segment assignment data layer
3. `9659089` — feat(aor): Phase B — per-sub-segment combat defense resolution
4. `cbd9f58` — feat(aor): Phase C — bot AI per-sub-segment targeting
5. `d0f6f10` — feat(aor): Phase D — gap mechanics, entrenchment reset
6. `188f425` — chore: bump version to v0.3.3
7. `20df364` — feat(infra): deterministic_random + scenario_preseeding
8. `8b89662` — feat(infra): GlassPanel component + Command Briefing spec
9. `2833f82` — feat(peace): v0.4.0 — peace phase interactivity
10. `724fc12` — chore: bump version to v0.4.0
11. `a6851e8` — feat(events): Phase 1 — unified event effect system
12. `8381d6f` — feat(events): Phase 2 — player decision events
13. `b24311f` — feat(events): Phases 3-4 — historical event content
14. `b701b38` — feat(events): Phase 5 — event UI
15. `5f1731c` — chore: bump version to v0.4.1
16. `78ec051` — feat(scenarios): v0.4.2 — additional scenarios + selection screen
17. `1f20b2b` — chore: bump version to v0.4.2
18. `e52dab2` — feat(economy): v0.4.3 — economy & war production
19. `80e4292` — chore: bump version to v0.4.3
20. `1837269` — feat(officers): v0.4.4 — officer experience & weight of command
21. `c388a31` — chore: bump version to v0.4.4

## Build State at End of Shift
- tsc: clean
- vitest: 75 suites, 879 tests, 1 skipped
- Last commit: c388a31
- Current version: v0.4.4
- All tags pushed: v0.3.2, v0.3.3, v0.4.0, v0.4.1, v0.4.2, v0.4.3, v0.4.4

## Recommended Next Steps for Day Shift
1. Review DECISION-1 through DECISION-4 above
2. Paint Mar 1994 + Jan 1995 control maps to unblock v0.4.2 Phase 3
3. Generate visual assets (Gemini Pro) for the 41 event illustrations
4. Run 40w calibration to verify no regression from AoR + economy changes
5. Plan v0.4.5 (AI Commander) — now has full officer experience, events, economy to reason about
6. Consider OPP-1 (event chains) and IDEA-3 (loyalty missions) for next sprint
7. Extract `subsegment_assignment.ts` from corps_front_sectors.ts (code quality)
