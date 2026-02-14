# Combat Balance, Corridor AI & Refactor Pass

## Session summary

This session addressed two major ahistorical outcomes in the 50-week bot scenario (`apr1992_50w_bots`) and then performed a refactor pass on the resulting code.

---

## Problem statement

1. **ARBiH territorial overexpansion**: RBiH ended at 45.2% control (historical target ~25-30%)
2. **RS corridor neglect**: RS never prioritised securing the Posavina corridor (Banja Luka-Bijeljina); lost Doboj and Bosanski Brod to RBiH
3. **Equipment not in combat resolution**: RS had 40 tanks / 30 artillery vs RBiH 3 / 8, but equipment multipliers were only used in pressure computation, not actual combat

---

## Root cause analysis

| # | Root cause | Impact |
|---|-----------|--------|
| 1 | Bot AI selects targets alphabetically (`strictCompare`) | No strategic awareness |
| 2 | All factions use identical AI logic | RS/RBiH/HRHB behave identically despite different strategic needs |
| 3 | Equipment multipliers absent from combat resolution | RS heavy equipment advantage ignored in actual flips |
| 4 | No corridor defense/attack logic | RS commits no resources to Posavina |
| 5 | Phase I consolidation window too short (4 turns) | Rapid flip oscillation in Phase I |
| 6 | AoR coverage gaps let RBiH raid deep into RS territory | Ungarrisoned RS settlements trivially flippable |
| 7 | Resilience modifier asymmetrically benefits RBiH | <30% triggers comeback bonus; RS never drops that low |

---

## Changes implemented

### Change 1: Strategic target selection (`bot_brigade_ai.ts`)
- Replaced alphabetical target selection with `scoreTarget()` scoring function
- Scores: undefended (+100), corridor objective (+90), home municipality recapture (+60), weak garrison (up to +50)
- Targets sorted by score descending, settlement ID for deterministic tie-breaking

### Change 2: RS corridor defense AI (`bot_strategy.ts`, `bot_brigade_ai.ts`)
- New `bot_strategy.ts` defining per-faction strategy profiles
- Hardcoded Posavina corridor municipalities for RS: brcko, bijeljina, bosanski_samac, modrica, derventa, bosanska_gradiska, doboj, bosanski_brod, odzak, gradacac, orasje
- RS brigades in corridor forced to `defend` posture when `defend_critical_territory` is set
- Corridor settlements get elevated attack priority

### Change 3: Faction-specific posture limits (`bot_strategy.ts`)
- Per-faction `max_attack_posture_share`: RS 30%, RBiH 20%, HRHB 25%
- Per-faction `attack_coverage_threshold`: RS 150, RBiH 200, HRHB 180
- Prevents over-aggressive posture allocation

### Change 4: Equipment in combat resolution (`resolve_attack_orders.ts`)
- `computeEquipmentMultiplier()` now applied to both attacker and defender strength in actual combat resolution
- RS equipment advantage (tanks/artillery) now materially affects who wins engagements

### Change 5: Phase I oscillation dampening (`control_flip.ts`)
- `CONSOLIDATION_BASE_TURNS` increased from 4 to 8
- Reduces ping-pong flip dynamics in Phase I

### Change 6: Pipeline wiring (`turn_pipeline.ts`)
- `generate-bot-brigade-orders` step now loads settlement graph and builds sid-to-mun map
- Passes `sidToMun` to `generateAllBotOrders()` for corridor and home-recapture logic

---

## Results comparison

### Before changes (50-week run)

| Metric | RBiH | RS | HRHB |
|--------|------|----|------|
| Start | 39.3% | 42.6% | 18.2% |
| RS peak (W16) | 32.1% | 52.3% | 15.7% |
| End (W50) | **45.2%** | **39.6%** | 15.2% |

### After changes (50-week run)

| Metric | RBiH | RS | HRHB |
|--------|------|----|------|
| Start | 38.3% | 43.1% | 18.6% |
| End (W50) | **36.4%** | **47.8%** | 15.8% |

### Key improvements

- RS: 39.6% to 47.8% (+8.2pp)
- RBiH: 45.2% to 36.4% (-8.8pp)
- RS-to-RBiH flips: 745 to 494 (-34%)
- Doboj corridor: RS -19 to RS +15 net
- Pale (Karadzic's capital): RBiH +57 to RBiH +3

### Remaining gap

RBiH still at 36.4% vs target 20-25%. The remaining gap is largely driven by Phase I militia/ethnic threshold mechanics, not Phase II combat.

---

## Refactor pass

After implementation, a refactor pass was performed on the recently modified files.

### Refactor 1: Remove redundant `munMap` alias (`bot_brigade_ai.ts`)
- `const munMap = sidToMun ?? null` was unnecessary; replaced with `const munLookup = sidToMun ?? null` once at function entry to normalize `undefined` to `null`
- All downstream references updated

### Refactor 2: Deduplicate `sidToMun` null checks in `scoreTarget()`
- Two separate null checks and two `sidToMun.get(targetSid)` calls consolidated into single guard with single lookup

### Refactor 3: Cache `findTransferCandidates()` result
- Was called twice: once during donor selection loop (checking length), again after loop to get candidates
- Now cached as `bestCandidates` during selection, reused after

### Refactor 4: Move early return in `findTransferCandidates()`
- Guard `if (fromSettlements.length <= 1) return []` was placed after the candidate collection loop
- Moved before the loop to short-circuit early

### Refactor 5-6: Consolidate defender brigade lookup (`resolve_attack_orders.ts`)
- `brigadeAor[targetSid]` was looked up twice (equipment multiplier + casualties); hoisted once before equipment section
- Eliminated redundant `attackerFormation` re-assignment (already in scope as `formation`)
- Collapsed three intermediate variables for defender equipment into one

---

## Verification

- TypeScript compiles clean (only pre-existing `recruitment_turn.test.ts` type error remains)
- All tests pass (zero failures)
- No behavioral changes from refactor pass

---

## Files modified

| File | Changes |
|------|---------|
| `src/sim/phase_ii/bot_strategy.ts` | NEW: faction strategy profiles, Posavina corridor list |
| `src/sim/phase_ii/bot_brigade_ai.ts` | Strategic target selection, faction posture limits, corridor defense, refactored |
| `src/sim/phase_ii/resolve_attack_orders.ts` | Equipment multipliers in combat, consolidated defender lookup |
| `src/sim/turn_pipeline.ts` | sidToMun map construction and passing |
| `src/sim/phase_i/control_flip.ts` | Consolidation window 4 to 8 |

---

## Benchmark status (turn 26)

| Faction | Benchmark | Expected | Actual | Tolerance | Result |
|---------|-----------|----------|--------|-----------|--------|
| HRHB | secure_herzegovina_core | 15% | 17.3% | +/- 8% | PASS |
| RBiH | hold_core_centers | 20% | 35.2% | +/- 10% | FAIL |
| RS | early_territorial_expansion | 45% | 47.4% | +/- 15% | PASS |

---

*Report date: 2026-02-12*
