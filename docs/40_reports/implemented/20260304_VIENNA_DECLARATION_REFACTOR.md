# Vienna Declaration — Implementation and Refactor Pass

**Date:** 2026-03-04
**Baseline:** n472 — 652/744 (87.6%), 89.7% area-weighted
**Result:** Implementation + refactor complete; n473 calibration run planned

---

## Summary

- Implemented the Vienna Declaration truce mechanic: at week 4 (May 1992), a narrative event fires and sets `state.vienna_declaration_turn`. After that, bot RS and HRHB corps filter each other's controlled OSIDs from `offensive_targets`, except in the Posavina corridor and Jajce where historical fighting continued.
- Player CAN still attack across the truce; doing so triggers a warning notification and gives the opponent bot an aggression spike for 6 turns.
- Followed with a refactor pass: removed a redundant boolean condition, replaced two array-spread patterns with direct push calls. 31 unit tests pass with no regressions.

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

**Refactor (same file):** `getTruceBreakAggressionBonus` had `currentTurn >= brokenTurn && currentTurn < brokenTurn + TRUCE_BREAK_SPIKE_TURNS`. The first clause is always true (`brokenTurn` is set at or before the current turn). Removed the redundant clause.

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

Calls `checkAndFireViennaDeclaration(context.state)` and pushes the narrative event to `context.report.events_fired` if fired. Declaration fires before `generate-bot-corps-orders` runs so the bot respects the truce on the same turn it takes effect.

```typescript
const viennaText = checkAndFireViennaDeclaration(context.state);
if (viennaText) {
    context.report.events_fired!.push({ id: 'vienna_declaration', text: viennaText });
}
```

**b) New `check-truce-break` step** (runs just before `phase-ii-resolve-attack-orders`):

Checks the player faction's `brigade_attack_orders` against truce-partner OSIDs. Calls `recordTruceBroken()` on first violation and appends `{ id: 'truce_broken', text: warning }` to `events_fired`.

```typescript
(context.report.events_fired ??= []).push({ id: 'truce_broken', text: warning });
```

**Refactor (same file):** Both event-firing sites originally used `[...(array ?? []), item]` spread patterns. Replaced with `.push()` and `??=` (logical nullish assignment) — cleaner and avoids allocating intermediate arrays.

### 4. Bot Corps AI (`src/sim/combat/bot_corps_ai.ts`)

Two additions:

**a) Truce target filtering** — after `offensiveTargets` is assembled but before `avoidOsids` enforcement:

```typescript
if (isViennaDeclarationActive(state)) {
    const trucePartner = getTrucePartner(faction);
    if (trucePartner) {
        const pc = state.political_controllers ?? {};
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

31 unit tests covering all 7 exports:
- Constants (VIENNA_DECLARATION_TURN, TRUCE_EXCEPTION_MUNICIPALITIES)
- `isViennaDeclarationActive` — 4 tests
- `isTruceException` — 3 tests
- `getTrucePartner` — 3 tests
- `checkAndFireViennaDeclaration` — 5 tests (before/at/after/repeat/peace)
- `recordTruceBroken` — 6 tests (inactive, no partner, exception, RS break, HRHB break, no overwrite)
- `getTruceBreakAggressionBonus` — 6 tests (inactive, no break, at break, within window, expired, RBiH)

All 31 pass. Pre-existing `war_timeline.test.ts` failures confirmed pre-existing via `git stash`.

---

## Design Rationale

### Why Vienna Declaration at week 4?

Historical: the Graz/Vienna meetings between Karadžić and Boban occurred in early May 1992. Week 4 of the simulation corresponds to early May 1992 (scenario starts April 6, 1992). The week 4 trigger gives the VRS its early offensive window (weeks 0–3) before the truce settles in.

### Why exception municipalities?

Posavina corridor: RS and HRHB were both fighting RBiH there, and skirmishes occurred between them. Historically, the corridor was contested. Jajce: RS besieged Jajce (which fell October 1992) with HVO troops present — friction was real and documented.

### Why +0.25 aggression spike for 6 turns?

The spike represents political outrage + reactive military mobilization after a truce violation. It is intentionally moderate — enough to create observable reactive behavior without distorting the larger calibration. Six turns = ~6 weeks, consistent with other short-term modifiers in the engine.

### Bot enforcement vs player freedom

The truce is enforced ONLY on bot AI via target filtering. The player retains full freedom to attack across the truce line. This matches the informal nature of the Vienna Declaration — it was never formalized, and local commanders sometimes ignored it. The warning + aggression spike give the player meaningful consequences without hard-blocking their options.

### Refactor: push over spread

`[...(array ?? []), item]` allocates a new array and spreads the existing contents for every event fired. At the `evaluate-events` callsite, `events_fired` is guaranteed to be assigned from `result.fired` just above, so `!.push()` is safe and expresses intent clearly. At the `check-truce-break` callsite, `??=` initializes on first use, also cleaner than spread.

---

## Lessons Learned

1. **Event system (`events_fired`) is the right hook for narrative events.** Extending the `evaluate-events` step to also call `checkAndFireViennaDeclaration` keeps all narrative firing in one pipeline location.

2. **Truce filtering belongs in `generateCorpsDirectives`, not `bot_brigade_ai_osid`.** The directive is the authoritative target list; filtering at the directive level ensures brigade AI never even sees truce-partner OSIDs as candidates.

3. **Exception municipalities via Set lookup is O(1).** No performance concern even with 744 OSIDs.

4. **First-break-only recording prevents warning spam.** `recordTruceBroken` is idempotent — only the first violation per faction is recorded.

5. **Remove tautological conditions immediately.** `currentTurn >= brokenTurn` was always true by construction (you can't know a future break turn). Spotted in refactor pass. Keep boolean expressions to only what can actually vary.

6. **`??=` (logical nullish assignment) is cleaner than spread for optional arrays.** `(arr ??= []).push(item)` initializes only when needed and mutates in place — preferred over `arr = [...(arr ?? []), item]` which always allocates.

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/local_truces.ts` | New — Vienna Declaration truce module (7 exports); refactor: remove tautological condition |
| `src/state/game_state.ts` | Added `vienna_declaration_turn?` and `truce_broken_turn?` to `GameState` |
| `src/sim/turn_phases/war_phases.ts` | Import + evaluate-events extension + new `check-truce-break` step; refactor: push over spread |
| `src/sim/combat/bot_corps_ai.ts` | Import + truce filtering in `generateCorpsDirectives` + aggression spike |
| `tests/local_truces.test.ts` | New — 31 unit tests, all passing |

---

## Next Steps

1. **Run n473:** 40w calibration with Vienna Declaration active. Expected: CENTRAL_CORRIDOR should recover slightly (RS no longer attacks HRHB cells in Travnik-area corridors); possible CENTRAL_BOSNIA impact if HRHB brigades previously tangled with RS.
2. **CENTRAL_CORRIDOR regression (n472 −3.2pp):** After n473, assess if truce fixes corridor regression or if RS 1st KK directive targets need Doboj/Maglaj/Breza added explicitly.
3. **Donji Vakuf cells:** 4 cells (donji_vakuf_2, jemanlici, korenici, prusac_2) sim=RBiH vs painted=RS. Consider adding to RS OGZ target list.
4. **Truce GUI indicator:** When `vienna_declaration_turn` is set, show an indicator in the warroom UI (e.g. faction relationship panel) showing "Vienna Truce active — except Posavina/Jajce." Phase 5+ GUI work.
