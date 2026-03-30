# Working On — v0.8 Corps Commander Intelligence (Post Night Shift)

## Current State
- **11 commits** implementing full PERCEIVE->DECIDE->EXECUTE commander pipeline
- **92.2% area-weighted** (n1213, ties ATH) but **war goes silent after w20** (P0)
- **War-or-Game: NOT APPROVED** — territory correct, combat catastrophically low
- **USE_COMMANDER_LOOP = true** in bot_corps_ai.ts (feature flag, old code preserved)
- **41 unit tests** in tests/commander/commander.test.ts

## P0: War Goes Silent After Week 20
The commander's PLAN phase only creates opportunity operations for `projecting` zones. By w20, all corps are `defending`/`balanced`. Fix in `src/sim/combat/commander/plan.ts`:
- Lower opportunity threshold from `projecting` to `balanced` with surplus >= 3
- Add continuous probe mechanism for `active_defense` sectors
- Consider army HQ operation generation for strategic course correction

## Railroad Hunter Agents (Results Pending)
3 agents were dispatched at shift end to catalog hardcoded railroads:
1. **Corps exemptions** — SIEGE_EXEMPT, name checks, magic thresholds
2. **Brigade movement** — 15 separate systems fighting each other
3. **Operation launch** — doctrine blocks, exhaustion gates, hardcoded timing

Re-dispatch if results were lost with shift context.

## Step 10 (Old Code Removal) — DEFERRED
Old `generateCorpsDirectives` preserved behind feature flag. Don't remove until:
1. P0 combat drought is fixed
2. War-or-Game approves
3. Integration test baselines updated

## Open Issues
- P0: 19 silent weeks (w21-w39)
- P1: 36 battles (was 62)
- P1: Donji Vakuf still RBiH
- P2: 0 tanks (equipment tracking broken)
- P2: Att:Def ratio 0.27:1
- P2: Kalinovik pocket (3 RBiH OSIDs)

## Key Files
- Commander: `src/sim/combat/commander/` (10 files)
- Wiring: `src/sim/combat/bot_corps_ai.ts` (USE_COMMANDER_LOOP flag)
- Serializer: `src/state/serializeGameState.ts` (Map/Set support added)
- Tests: `tests/commander/commander.test.ts`
- Visual morning report: `docs/60_visualisations/20260330_nightshift_morning_report.html`
- Markdown morning report: `morning-report.md`
