# Morning Report — Night Shift 2026-03-30

## Summary
Built the complete v0.8 Corps Commander Intelligence system in one shift: 10 new files (~3,800 lines), 11 commits, 41 tests. Calibration: **92.2% area-weighted** (tied ATH), up from 90.2% baseline. Architecture: PERCEIVE->DECIDE->EXECUTE per-corps commander loop. **Critical finding: war goes silent after week 20** (19 consecutive zero-combat weeks). War-or-Game: NOT APPROVED — territory correct, combat activity catastrophically reduced.

## What Was Done
11 commits implementing the full commander pipeline:
1. Type definitions (16 types)
2. buildBriefing() — input assembly
3. ASSESS — zones, corridor BFS, force eval
4. ALLOCATE — Grigsby two-pass garrison (fixes Sarajevo)
5. PLAN — multi-turn intentions
6. DECIDE — intel-reactive stance/reserves
7. EMIT — bridge to existing downstream
8+9. Wire commander loop + GameState persistence
10. Simplify: 3 bugs fixed (state persistence, previousState null, dead ternary)
11. Serializer: Map/Set support (Engine Invariant updated)
12. 41 unit tests

## Calibration (n1213)
- **92.2% area-weighted** (+2.0pp from 90.2% baseline, ties ATH)
- 22/22 anchors PASS, 6/6 benchmarks PASS
- Sarajevo: HELD (7 brigades). Gorazde: HELD (4 brigades)
- 36 battles (was 62). 19 silent weeks w21-w39.

## P0: War Goes Silent After Week 20
The single most important finding. Pre-planned ops complete by w20, then the commander generates zero new operations for 19 weeks. Root cause: PLAN phase only creates opportunity plans for `projecting` zones. By w20 all corps are `defending`/`balanced`. Fix: lower the threshold, add continuous probe mechanism.

## Decisions for Review
1. **Serializer updated** — Maps/Sets valid in GameState (sorted on serialize)
2. **USE_COMMANDER_LOOP = true** — old code preserved behind feature flag
3. **Officer personality** — derived from existing 4 attributes (1-5 scale)

## Build State
- tsc: clean | vitest: 1661 tests (41 new), 17 pre-existing failures | Last commit: 86aa10a1

## Next Steps
1. Fix P0 combat drought (highest leverage)
2. Review railroad hunter findings (pending)
3. Update integration test baselines
4. Investigate 0 tanks (equipment tracking broken)
5. Step 10 (old code removal) after war-or-game approves
