# Night Shift Handoff — 2026-03-15

## Plans to Execute (in dependency order)

1. **v0.3.2 — Humanitarian capital per-faction attribution fix**
   - Scope: napkin backlog item #11. Small engine fix in `src/sim/negotiation/compute_capital.ts`.
   - `computeHumanitarianData()` currently sums ALL displacement globally. Fix: attribute `refugees_created` to the faction controlling the origin OSID at time of displacement.
   - No plan file — this is a targeted bug fix. ~30 lines.
   - After fix: run 40w scenario, verify humanitarian_standing is non-zero and faction-differentiated.
   - Bump to v0.3.2, tag.

2. **v0.3.3 — Brigade AoR sub-segment assignment**
   - Plan: `docs/plans/2026-03-15-v0.3.3-brigade-aor-subsegment.md`
   - Design doc: `docs/30_planning/design/BRIGADE_AOR_SUBSEGMENT_DESIGN.md`
   - 4 phases: (A) assignment only → (B) combat integration → (C) bot AI enhancement → (D) gap mechanics + UI
   - ~520 lines estimated.
   - After completion: run 40w, verify no calibration regression >2pp. Bump to v0.3.3, tag.

3. **INFRASTRUCTURE — shared utilities for v0.4.x**
   - Plan: `docs/plans/2026-03-15-infrastructure-shared-utilities.md`
   - 4 phases: (1) GlassPanel.tsx → (2) deterministic_random.ts → (3) scenario_preseeding.ts → (4) Command Briefing spec
   - Tests for each utility. No version bump — this is infrastructure.

4. **v0.4.0 — Peace Phase Interactivity**
   - Plan: `docs/plans/2026-03-15-v0.4.0-peace-phase-interactivity.md`
   - 5 deliverables: E2E verification → PeaceWarTransition → Peace map overlays → PeaceStatusPanel enhancement → Integration test
   - ~345 lines. Use GlassPanel from infrastructure.
   - Bump to v0.4.0, tag.

5. **v0.4.1 — Complete Event System**
   - Plan: `docs/plans/2026-03-15-v0.4.1-complete-event-system.md`
   - 5 phases: Effect system → Decision events → 1992 content → 1993-1995 content → Event UI
   - ~2,200 lines. This is the UNIVERSAL EVENT BUS — design for extensibility (7 event categories).
   - Use GlassPanel for EventModal, EventLogPanel. Use deterministicRandom for random event triggers.
   - Event JSON files go in `data/scenarios/events/`. Schema includes optional `image` field (placeholder if missing).
   - Bump to v0.4.1, tag.

6. **v0.4.2 — Additional Scenarios**
   - Plan: `docs/plans/2026-03-15-v0.4.2-additional-scenarios.md`
   - Phases 1+2+4 ONLY. Phase 3 (Mar 1994 + Jan 1995) is BLOCKED — user must paint control maps.
   - Phase 1: Complete January 1993 scenario (user already painted). Use scenario_preseeding.ts.
   - Phase 2: Extend September 1991 scenario to full peace→war→Dayton.
   - Phase 4: ScenarioSelectionScreen with 5 cards (greyed-out for unpainted scenarios).
   - Bump to v0.4.2, tag.

7. **v0.4.3 — Economy & War Production**
   - Plan: `docs/plans/2026-03-15-v0.4.3-economy-war-production.md`
   - 4 phases: Production wiring → Smuggling mechanic → Economy UI → Equipment visibility
   - ~745 lines. Economy events post through v0.4.1 event bus. Capital integration task at end.
   - Use GlassPanel for EconomyPanel. Use deterministicRandom for smuggling disruption.
   - Bump to v0.4.3, tag.

8. **v0.4.4 — Officer Experience & Weight of Command**
   - Plan: `docs/plans/2026-03-15-v0.4.4-officer-experience.md`
   - 5 phases: Experience gain → Learning curve + brain drain → Warlord friction → Commander relationships → Experience UI
   - ~755 lines. Officer events post through v0.4.1 event bus. Capital integration. Use deterministicRandom for friction.
   - Use GlassPanel for friction log.
   - Bump to v0.4.4, tag.

## Execution Order (dependency DAG)

```
v0.3.2 (humanitarian fix)  ←── START HERE
v0.3.3 (brigade AoR)       ←── can parallel with v0.3.2 if confident
  ↓
INFRASTRUCTURE (GlassPanel + deterministic_random + scenario_preseeding)
  ↓
v0.4.0 (peace interactivity)
  ↓
v0.4.1 (event system)       ←── universal event bus, all later milestones use it
  ↓
v0.4.2 (scenarios)           ←── Phases 1+2+4 only, skip Phase 3 (blocked)
  ↓
v0.4.3 (economy)
  ↓
v0.4.4 (officer experience)
```

v0.4.5 (AI Commander) is NOT in this handoff — requires day shift design review + API key setup.

## Special Instructions

- **Cross-plan review**: Read `docs/30_planning/CROSS_PLAN_REVIEW_V04.md` before starting. It defines integration points between all plans.
- **Event system is the universal bus**: v0.4.3 economy events and v0.4.4 officer events MUST post through the v0.4.1 event system. Do NOT create parallel notification mechanisms.
- **Capital integration**: After v0.4.3 and v0.4.4, update `compute_capital.ts` to read the new systems (production → military_effectiveness, officer maturity → military_effectiveness, friction → political_cohesion).
- **Visual assets use placeholders**: All image references should gracefully fall back to gradient/programmatic placeholders. No crashes on missing images.
- **Calibration check after v0.3.2 and v0.3.3**: Run `npm run sim:scenario:run:40w` and verify results are reasonable. Don't need to run the comparison tool — just check that capital values and territory look right.

## DO NOT Touch

- `src/ui/map/components/OpsPlanningModal.tsx` — external expert is redesigning this
- Any files in `src/ui/warroom/assets/` — user manages visual assets
- `docs/10_canon/FORAWWV.md` — flag for manual review only
- Don't implement v0.4.5 (AI Commander) — that needs day shift + API key

## Architectural Decisions Pre-Made

1. **Event categories**: `military | political | humanitarian | diplomatic | economic | command | territorial` — use these exactly.
2. **GlassPanel positions**: `left | right | overlay | bottom-tray` — four options only.
3. **deterministicRandom**: Use djb2 hash, return `(hash % 10000) / 10000`. Simple, fast, deterministic.
4. **Scenario preseeding**: Interpolate capital values linearly between historical baseline points in the design doc. Don't over-engineer — simple linear interpolation from the table.
5. **Event JSON schema**: Include optional `image` field. If file missing, placeholder renders. No crashes.
6. **Brigade AoR**: Soft AoR (Option B from design doc) — primary brigade + reactive support. NOT hard boundaries.
7. **Smuggling routes**: 3 per faction as defined in the v0.4.3 plan. Don't add more.
8. **Warlord friction**: `deterministicRandom(officerId, \`friction:${turn}\`)` < probability. Conservative.

## Expected Outcome

When day shift wakes up:
- v0.3.2, v0.3.3, v0.4.0, v0.4.1, v0.4.2 (partial), v0.4.3, v0.4.4 all implemented and tagged
- ~5,500+ new lines of code across ~40 files
- ~100+ new tests
- Total tests: 860+
- Event system live with 40+ historical events
- Economy visible, officer experience tracking
- All commits pushed to GitHub
- Morning report with observations and proposals

## Build State at Handoff

- tsc: clean
- vitest: 66 suites, 763 tests, 1 skipped
- Last commit: cfb90f1
- Current version: v0.3.1
- Branch: main
