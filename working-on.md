# Working On — Session 2026-03-29 (Session 3) — COMPLETE

## Completed This Session
1. Concurrent corps operations — `active_operations[]` replaces `active_operation` (84 files, +1459/-525)
2. Emergency defense overflow slot (is_emergency flag)
3. Bot secondary op type guard (probe/sector_attack only in slot 1+)
4. Save migration v1→v2
5. Krajina paramilitary scope (6 municipalities added)
6. MAX_POCKET_CLUSTER 3→6
7. 2 new anomaly checks (#27 undefended_painted_mismatch, #28 adjacent_uncontested_territory)
8. Merged to main. n1211 = 90.9% area-weighted.

## Next Session Priorities

### P0: Equipment Asymmetry in Combat Resolution
ARBiH should not have the offensive potential it currently shows. Two missing factors:
1. **Equipment gap** — most ARBiH brigades in 1992 had only rifles. Attacking a VRS brigade with artillery and tanks using 2500 men armed with rifles = catastrophic losses. Combat resolution must weight equipment heavily.
2. **Officer cadre** — ARBiH had very few trained officers in 1992. Limits coordination, combined arms, operational planning.
3. **Combat predictor** must factor equipment asymmetry so corps AI rejects suicidal ops before committing brigades.
This naturally gates ARBiH offensive capability without artificial slot caps.

### P0: Intelligent Corps/Army Commanders
Replace hardcoded rules with per-turn CO decision-making:
- Corps CO looks at his front each turn — which sectors are under pressure, which are quiet
- Ensures ALL sectors properly defended FIRST
- Only surplus brigades (2-3) allocated for ops
- Picks objectives based on opportunity
- Would NEVER strip garrison from Sanski Most to send to Derventa
- Fewer magic numbers (MIN_SECTOR_BRIGADES, slot caps, exhaustion thresholds), more situational awareness
- Connects to v0.8 Command Chain roadmap and existing AI commander infrastructure

### P1: RS w40 Benchmark Gap
RS ends at 49.7% vs 55.3% target (-5.6pp). RS stalls mid-war. Only 33 orders, 32 ops with zero eligible attackers. Need investigation: is RS not launching enough ops, or are ops launching but failing to execute?

### P1: Sarajevo Regression
-3.5pp from prior run. Needs investigation.

### P2: Invalid Operations
41 invalid operations (32 zero-eligible-attacker). Ops launching but nobody can fight. Staging/reachability issue.

### P2: HRHB Passivity
8 total orders, 2 dead corps (HVO Central Bosnia at morale 0, HVO Tomislavgrad). Structural problem.

### P2: Column March Occupation Skip
`bot_brigade_ai_osid.ts:441-444` skips column-marching brigades — they can't capture adjacent undefended territory even at zero cost.

### P2: Garrison Cannibalization
No holdback at op launch. Corps strips sectors bare for ops. Post-op drift lock prevents return. Three-gap fix needed (see corps-overcommit investigation report).

## Key Investigation Reports (this session)
- War-or-Game: NOT APPROVED on concurrent ops alone (RBiH overshoot). CONDITIONAL after Krajina fixes.
- Gap Finder: 3 gaps found, all fixed (emergency defense, secondary op guard, save migration).
- Krajina investigation: garrison cannibalization root cause (6th Sanske to Derventa, 17th Ključ to Glamoč).
- Paramilitary investigation: scope exclusion + MAX_POCKET_CLUSTER=3 prevented Krajina capture.
- Anomaly audit: 2 missing checks identified and implemented.
- Corps overcommit: 3 compounding gaps (no holdback, drift lock, large op scatter).
