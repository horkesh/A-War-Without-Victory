# Event Dependency Graph — AWWV Codex

**Generated:** 2026-03-23 by /historian
**Scope:** All 94 game events mapped for causal dependencies, tier classification, and branch points.

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total events | 94 |
| Fixed (no conditions, specific turn) | ~29 |
| Conditional (game-state conditions) | ~20 |
| Dependent (requires_events) | 26 |
| Player decision events | 8 |
| Events with sets_flags | 38 |
| Orphan flags (set but never consumed) | ~25 |
| Longest dependency chain | 4 hops |
| Highest fan-out node | croat_bosniak_war_begins_1993 (11 direct dependents) |

## Critical Branch Points

1. **Croat-Bosniak alliance** (alliance < 0.1): Gates 21 events including Washington Agreement → entire 1995 Federation offensive
2. **RS Strategic Goals choice** (all_six/selective): Gates Drina cleansing decision
3. **Srebrenica falls** (currently FIXED): Should it be conditional?
4. **Markale massacre** (currently FIXED): Gates NATO ultimatum chain
5. **Brčko/Corridor** (RS controls Brčko): Flag set but never consumed downstream

## Key Finding: Orphan Flags

Nearly ALL flags (~25) are set but never consumed by any event condition. The only flag actually gated on is `rs_strategic_goals`. The event system is mostly one-way — flags are breadcrumbs without consequences.

## 7 Causal Chains

- **Chain A: Croat-Bosniak War** (21 dependents, the largest)
- **Chain B: Srebrenica Arc** (enclave → shelling → demilitarization → falls)
- **Chain C: NATO Intervention** (Markale → ultimatum → exclusion → Deliberate Force)
- **Chain D: Peace Process** (London → Vance-Owen → Owen-Stoltenberg → Contact Group → Dayton)
- **Chain E: Bihać Arc** (Abdić → pact → crisis → 5th Corps)
- **Chain F: RS Strategy** (strategic goals → cleansing decision → camps → London Conference)
- **Chain G: Late-War Reversal** (Washington + Deliberate Force → Federation offensive → halt)

## Scenario Pre-Fire Requirements

For later-start scenarios, these events must be pre-fired:
- **April 1993 (turn ~52):** ~35-40 events (all 1992 + early 1993)
- **April 1994 (turn ~104):** ~65-70 events (through Washington Agreement)
- **April 1995 (turn ~156):** ~75-80 events (through COHA)

See full analysis in historian agent output.
