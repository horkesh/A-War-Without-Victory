# Vienna Declaration — Local RS-HRHB Truces

**Date:** 2026-03-04
**Baseline:** n472 — 652/744 (87.6%), 89.7% area-weighted
**Result:** Implementation only — no calibration run yet (n473 planned after truces)

---

## Summary

- Implemented the Vienna Declaration truce mechanic: at week 4 (May 1992), a narrative event fires and sets `state.vienna_declaration_turn`. After that point, bot RS and HRHB corps filter each other's controlled OSIDs from `offensive_targets`, except in the Posavina corridor and Jajce where historical fighting continued.
- Player CAN still attack across the truce; doing so triggers a warning notification ("breaking an informal truce") and gives the opponent bot an aggression spike for 6 turns.
- 31 unit tests written and passing. No regressions to vitest suite (pre-existing `war_timeline.test.ts` failure unrelated).

---

## Changes Made

### 1. Core Truce Module (`src/sim/local_truces.ts`)

New file implementing the Vienna Declaration logic:

- `VIENNA_DECLARATION_TURN = 4` — May 1992
- `TRUCE_EXCEPTION_MUNICIPALITIES` — Posavina corridor (`brod`, `derventa`, `odzak`, `bosanski_samac`, `orasje`) + `jajce`
- `isViennaDeclarationActive(state)` — true if declaration fired and current turn ≥ declaration turn
- `isTruceException(osid)` — true if OSID is in an exception municipality
- `getTrucePartner(faction)` — RS↔HRHB partnership; RBiH returns null
- `checkAndFireViennaDeclaration(state)` — fires once at week 4, sets `state.vienna_declaration_turn`, returns narrative text
- `recordTruceBroken(faction, osid, state)` — records first truce break in `state.truce_broken_turn`, returns warning text
- `getTruceBreakAggressionBonus(faction, state)` — returns +0.25 aggression modifier if opponent broke truce in last 6 turns

### 2. GameState Schema (`src/state/game_state.ts`)

Two new optional fields added to `GameState`:

```typescript
/** Turn at which the Vienna Declaration fired (RS-HRHB non-aggression). */
vienna_declaration_turn?: number;

/** Turn at which each faction broke the Vienna Declaration truce. */
truce_broken_turn?: Record<FactionId, number>;
```

### 3. War Pipeline (`src/sim/turn_phases/war_phases.ts`)

Two additions:

**a) `evaluate-events` step extended:**
```typescript
const viennaText = checkAndFireViennaDeclaration(context.state);
if (viennaText) {
    context.report.events_fired = [...(context.report.events_fired ?? []),
        { id: 'vienna_declaration', text: viennaText }];
}
```
Declaration fires in the events step so it is set before `generate-bot-corps-orders` runs.

**b) New `check-truce-break` step** (runs just before `phase-ii-resolve-attack-orders`):
- Checks player faction's `brigade_attack_orders` against truce-partner OSIDs
- Calls `recordTruceBroken()` on first violation
- Appends `{ id: 'truce_broken', text: warning }` to `events_fired`

### 4. Bot Corps AI (`src/sim/combat/bot_corps_ai.ts`)

Two additions:

**a) Truce target filtering** — after `offensiveTargets` is assembled but before `avoidOsids` enforcement:
```typescript
if (isViennaDeclarationActive(state)) {
    const trucePartner = getTrucePartner(faction);
    if (trucePartner) {
        for (let i = offensiveTargets.length - 1; i >= 0; i--) {
            const osid = offensiveTargets[i]!;
            if (pc[osid] === trucePartner && !isTruceException(osid)) {
                offensiveTargets.splice(i, 1);
            }
        }
    }
}
```

**b) Aggression modifier** — truce-break retaliation added to base aggression:
```typescript
const truceBreakBonus = getTruceBreakAggressionBonus(faction, state);
let aggressionModifier = (doctrinePhase?.aggression_modifier ?? 0) + armyAggressionBonus + seasonalAdj + truceBreakBonus;
```

### 5. Tests (`tests/local_truces.test.ts`)

31 unit tests covering:
- Constants (VIENNA_DECLARATION_TURN, TRUCE_EXCEPTION_MUNICIPALITIES)
- `isViennaDeclarationActive` — 4 tests
- `isTruceException` — 3 tests
- `getTrucePartner` — 3 tests
- `checkAndFireViennaDeclaration` — 5 tests (before/at/after/repeat/peace)
- `recordTruceBroken` — 6 tests (inactive, no partner, exception, RS break, HRHB break, no overwrite)
- `getTruceBreakAggressionBonus` — 6 tests (inactive, no break, at break, within window, expired, RBiH)

---

## Design Rationale

### Why Vienna Declaration at week 4?

Historical: the Graz/Vienna meetings between Karadžić and Boban occurred in early May 1992. Week 4 of the simulation corresponds to early May 1992 (scenario starts April 6, 1992). The week 4 trigger gives the VRS its early offensive window (weeks 0–3) before the truce settles in.

### Why exception municipalities?

Posavina corridor: RS and HRHB were both fighting RBiH there (often indirectly collaborating), and skirmishes occurred between them. Historically, the corridor was contested. Jajce: RS besieged Jajce (which fell October 1992) with HVO troops present — friction was real and documented.

### Why +0.25 aggression spike for 6 turns?

The spike represents the political outrage + reactive military mobilization after a truce violation. It is intentionally moderate — enough to create observable reactive behavior without distorting the larger calibration. Six turns = ~6 weeks, consistent with other short-term modifiers in the engine.

### Bot enforcement vs player freedom

The truce is enforced ONLY on bot AI via target filtering. The player retains full freedom to attack across the truce line. This matches the "informal" nature of the Vienna Declaration — it was never formalized, and local commanders sometimes ignored it. The warning + aggression spike gives the player meaningful consequences without hard-blocking their options.

---

## Lessons Learned

1. **Event system (`events_fired`) is the right hook for narrative events.** Extending the `evaluate-events` step to also call `checkAndFireViennaDeclaration` keeps all narrative firing in one pipeline location.

2. **Truce filtering belongs in `generateCorpsDirectives`, not `bot_brigade_ai_osid`.** The directive is the authoritative target list; filtering at the directive level ensures brigade AI never even sees truce-partner OSIDs as candidates.

3. **Exception municipalities via Set lookup is O(1).** No performance concern even with 744 OSIDs.

4. **First-break-only recording prevents warning spam.** `recordTruceBroken` is idempotent — only the first violation per faction is recorded. Subsequent attacks against truce-partner cells don't fire new warnings each turn.

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/local_truces.ts` | New — Vienna Declaration truce module (7 exports) |
| `src/state/game_state.ts` | Added `vienna_declaration_turn?` and `truce_broken_turn?` to `GameState` |
| `src/sim/turn_phases/war_phases.ts` | Import + evaluate-events extension + new `check-truce-break` step |
| `src/sim/combat/bot_corps_ai.ts` | Import + truce filtering in `generateCorpsDirectives` + aggression spike |
| `tests/local_truces.test.ts` | New — 31 unit tests, all passing |

---

## Next Steps

1. **Run n473:** 40w calibration with Vienna Declaration active. Expected: CENTRAL_CORRIDOR should recover slightly (RS no longer attacks HRHB cells in Travnik-area corridors); possible CENTRAL_BOSNIA impact if HRHB brigades previously tangled with RS.
2. **CENTRAL_CORRIDOR regression (n472 −3.2pp):** After n473, assess if truce fixes corridor regression or if RS 1st KK directive targets need Doboj/Maglaj/Breza added explicitly.
3. **Donji Vakuf cells:** 4 cells (donji_vakuf_2, jemanlici, korenici, prusac_2) sim=RBiH vs painted=RS. Consider adding to RS OGZ target list.
4. **Truce GUI indicator:** When `vienna_declaration_turn` is set, show an indicator in the warroom UI (e.g. faction relationship panel) showing "Vienna Truce active — except Posavina/Jajce." Phase 5+ GUI work.
