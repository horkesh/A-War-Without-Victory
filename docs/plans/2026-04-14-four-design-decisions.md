# Four Design Decisions — 2026-04-14

Four design decisions blocking further bounded implementation. Each proposed with exact mechanics, historical basis, and implementation scope.

---

## Decision 1: Negotiation Pressure → Consequences

### Current state

`faction.negotiation.pressure` accumulates monotonically every turn from exhaustion deltas, front breaches, supply isolation, and sustainability collapse (`src/state/negotiation_pressure.ts`). At w40: RBiH=4251, RS=4257, HRHB=4005. **No system reads this value to trigger any consequence.** It's a dead accumulator.

Additionally, `situation_score` in `political_personality.ts` clamps `war_exhaustion` to 0-100 (line 303-307), but actual values are 270-400 at w40. The clamp means exhaustion always reads as 100 after ~w5, contributing zero differential to political decisions. This is a second dead wire.

**Further dead wires discovered by research agent:**
- `spendNegotiationCapital()` in `negotiation_capital.ts` — only called from CLI tool `sim_negcap.ts`, never from the turn pipeline. `spent_total` field accumulated but never read by gameplay.
- `faction.negotiation.capital` (FactionState level integer) is a SEPARATE system from `state.military.negotiation.capital` (NegotiationBreakdown with 15 fields). The FactionState one is written each turn but only read by reporting. The NegotiationBreakdown one is the real system consumed by peace plans, patron pressure, and scoring.
- `civilian_casualties_caused` on NegotiationBreakdown — hardcoded to 0 with TODO comment.
- `negotiation_offers.ts` line 352 reads `faction.negotiation.pressure` at `PRESSURE_THRESHOLD = 10` to gate offer generation — this IS a consumer, but offers are a separate system from consequences.

### Proposed design

**Two fixes, both bounded:**

**Fix A — Rescale exhaustion in situation_score (~5 lines)**

Replace the 0-100 clamp with a 0-600 normalization:
```
const exhaustion_level = clamp(
    (state.political?.war_exhaustion?.[faction] ?? 0) / 6,  // 600 → 100
    0, 100
);
```
At w40: RS/HRHB (400) → 66.7, RBiH (271) → 45.2. Now differentiates between factions and between early/late war. Political personality scoring immediately becomes exhaustion-sensitive.

**Fix B — Negotiation pressure feeds peace plan acceptance floor (~15 lines)**

In `political_peace_plan.ts`, before the accept/reject scoring:
```
// High negotiation pressure lowers the faction's resistance to bad deals.
// At pressure 0: no effect. At pressure 4000+: acceptance floor drops by up to 15 points.
const pressureEffect = clamp(faction_negotiation_pressure / 4000, 0, 1) * 15;
const adjustedFloor = Math.max(0, personality.acceptance_floor - pressureEffect);
```

This means: as the war drags on and pressure mounts, factions become willing to accept peace plans they would have rejected earlier. The player feels the squeeze — their faction's negotiating position erodes with accumulated suffering.

### Historical justification

The Bosnian War followed exactly this pattern. By 1994-95, all three factions accepted deals (Washington Agreement, Dayton) they would have rejected in 1992 because accumulated exhaustion, refugee crises, and patron pressure eroded their positions. Izetbegović accepted territorial concessions at Dayton that were unthinkable in 1992. Karadžić's position weakened as Serbian casualties mounted and Milošević pushed for settlement.

### Game identity

This is the core negative-sum promise: fighting longer doesn't win, it just makes the eventual deal worse. The player should feel their negotiating floor dropping as pressure accumulates — creating genuine tension between "fight for a better position" and "settle now before it gets worse."

### Scope

- Fix A: 5 lines in `political_personality.ts`
- Fix B: 15 lines in `political_peace_plan.ts`
- Tests: extend existing political scoring tests
- Proof: 40w scenario showing differential situation_scores, bot peace plan evaluation change

---

## Decision 2: Feint Enemy Effects — ALREADY IMPLEMENTED

### Research finding

**Feint enemy effects already exist.** `brigade_assignment.ts` line 45 defines `FEINT_THREAT_MULTIPLIER = 1.5`, and lines 69-97 implement `hasActiveEnemyFeintAgainstSector()` which scans all corps_command active_operations for feint ops in planning/execution phase. At line 2130-2131, if an enemy feint targets a sector, that sector's `threat_ratio` is multiplied by 1.5×. This inflates the perceived threat, causing the defending corps to over-allocate brigades defensively.

Additionally, `sector_intel.ts:computeOffensiveSigns()` (line 217) detects feints as offensive signs at confidence >= 0.5, feeding into the commander belief system.

**The napkin P2 "feint has zero enemy effect" is stale.** The effect was implemented and is functional. No design decision needed — only napkin cleanup.

### Action: Mark stale in napkin

---

## Decision 3: HRHB Patron Directive Scope

### Current state

`data/scenarios/timelines/apr1992.json` has three directives for HRHB:
- w0-40: "Consolidate Herzegovina" — defensive ceiling
- w40-50: "Prepare Central Bosnia" — balanced ceiling
- w50+: "Secure Croat Territory" — offensive ceiling

Code in `bot_corps_stance.ts` applies the ceiling to ALL HVO corps (`if (faction === 'HRHB')`). In the 40w window this is fine. In 52w+, the historical reality was more nuanced: Herzegovina HVO was aggressive earlier while Central Bosnia escalated later.

### Proposed design

**Add optional `corps_ids` field to directive schema (~10 lines code, ~15 lines JSON)**

Schema change in `bot_corps_stance.ts`:
```typescript
type PatronDirective = {
    start_week: number;
    end_week: number;
    stance_ceiling: string;
    corps_ids?: string[];  // If absent, applies to all corps (backward compatible)
    description?: string;
};
```

Code change (line 261):
```typescript
if (activeDirective) {
    // Skip if directive is scoped to specific corps and this corps isn't listed
    if (activeDirective.corps_ids && !activeDirective.corps_ids.includes(corps.id)) continue;
    // ... existing ceiling logic
}
```

JSON change — split the existing directives into per-corps timelines:
```json
"patron_directives": {
    "HRHB": [
        { "name": "Consolidate Herzegovina", "start_week": 0, "end_week": 40, "stance_ceiling": "defensive", "description": "Zagreb: secure Herzegovina, maintain alliance" },
        { "name": "Herzegovina Offensive", "start_week": 40, "end_week": 999, "stance_ceiling": "offensive", "corps_ids": ["hvo_southeast_herzegovina"], "description": "Zagreb: take Mostar hinterland" },
        { "name": "Central Bosnia Restraint", "start_week": 40, "end_week": 50, "stance_ceiling": "balanced", "corps_ids": ["hvo_central_bosnia"], "description": "Zagreb: prepare positions, avoid premature escalation" },
        { "name": "Central Bosnia Offensive", "start_week": 50, "end_week": 999, "stance_ceiling": "offensive", "corps_ids": ["hvo_central_bosnia"], "description": "Zagreb: secure Lašva Valley" }
    ]
}
```

### Research findings — corps-level detail

| Corps | Historical Role | Graz Truce? | When aggressive? |
|---|---|---|---|
| `hvo_southeast_herzegovina` | HVO heartland (Mostar, Čitluk, Čapljina) | Yes — cold front with `vrs_herzegovina` | Never vs RS (Graz). vs RBiH: April 1993 (East Mostar siege) |
| `hvo_central_bosnia` | Blaškić's command (Vitez, Busovača, Kiseljak) | No | April 1993 (Lašva Valley, Ahmići). Has hard-coded defensive gate until `war_started_turn` in `bot_corps_stance.ts:247-252` |
| `hvo_northwest_bosnia` | Posavina pocket (Orašje). Radio-only comms. | Graz-exempt (`GRAZ_EXEMPT_HRHB_CORPS`) | **Fighting from day one** vs RS (spring-summer 1992). Brigades tagged `pocket_destroyable`. |
| `hvo_tomislavgrad` | Western Herzegovina/Livno | Yes — truce with `vrs_2nd_krajina` | Never significantly aggressive |

**Key insight:** The current faction-wide defensive ceiling is **actively wrong** for `hvo_northwest_bosnia` — Posavina was fighting RS from week 1 and should never be capped at defensive. The ceiling is **redundant** for Herzegovina and Tomislavgrad (already under Graz cold-front truces). It only meaningfully constrains `hvo_central_bosnia`, which already has its own hard-coded defensive gate.

### Historical justification

The patron directive should reflect Zagreb's differentiated control:
- **Posavina**: exempt — fighting for survival, Zagreb couldn't restrain them even if it wanted to
- **Herzegovina/Tomislavgrad**: redundant — Graz truces already enforce the constraint
- **Central Bosnia**: the only corps that genuinely needs Zagreb's restraint until the war starts

### Game identity

This serves the theme of patron control — Zagreb doesn't give the same orders to every corps. Herzegovina gets the green light earlier because of Mostar's strategic importance. Central Bosnia is held back to avoid premature alliance collapse. The player (if playing HRHB) feels Zagreb's constraints as real institutional friction — you can't just attack everywhere at once.

### Scope

- 10 lines code change in `bot_corps_stance.ts`
- 15 lines JSON change in `apr1992.json`
- Tests: patron directive test with corps_ids scoping
- Proof: 52w scenario showing differentiated HVO corps behavior

---

## Decision 4: Stranded Brigade Lifecycle

### Current state

When a brigade is unreachable from any same-corps sector:
- If tagged `pocket_destroyable` → dissolved (`brigade_assignment.ts:895-900`)
- Otherwise → removed from sector, logged as `[PROVISIONAL] UNRESOLVED` (`brigade_assignment.ts:902-904`)
- No ongoing lifecycle — they drift without canonical behavior

**However:** The canonical stranded examples (rs_1st_podrinje, rs_5th_podrinje) are NO LONGER stranded in n1570 — the Podrinje story recovery lane fixed them. The 39 "orphan" brigades in n1570 are mostly corps HQs (0 personnel) and interior brigades in peaceful areas.

**Research agent findings on current behavior:**
- `brigade_assignment.ts:840-906`: BFS reachability check → try reassign to same-corps sector → try nearest reachable sector → if `pocket_destroyable` tag → dissolve → else log `[PROVISIONAL] UNRESOLVED` and remove from sector
- `pocket_destroyable` is a manual tag on specific Posavina HVO brigades only (105th Modrica, Hrvoje Vukčić)
- `commander_march_correction.ts` cancels march orders when destination becomes isolated
- `corps_front_sectors.ts:2418` demotes unreachable brigades from assigned to reserve

**Existing enclave systems (separate from brigade stranding):**
- `enclave_integrity.ts`: Settlement-level BFS, integrity scoring (supply 40%, authority 30%, population 20%, connectivity 10%), Sarajevo special rules, siege_duration, collapsed flag
- `enclave_resilience.ts`: Hard-coded definitions for 8 known enclaves (5 RBiH, 3 HRHB). Defense bonuses up to 1.9×, garrison power, cohesion recovery. **Does NOT dynamically detect new pockets.**

**The gap:** The codebase handles stranded brigades *administratively* (remove from sector, log warning) but lacks a *behavioral model* for cut-off formations. No surrender mechanic, no isolation attrition, no dynamic pocket detection. The enclave system only covers hard-coded enclaves with pre-defined OSID lists.

### Proposed design

**Autonomous garrison defense with gradual degradation (~40 lines)**

When a brigade becomes unreachable from any same-corps sector AND has been unresolved for 3+ consecutive turns:

1. **Tag as stranded**: `formation.stranded_since_turn = currentTurn` (new field, set once)

2. **Autonomous defense**: Stranded brigades receive an implicit defensive stance. They defend their current OSID if attacked but cannot launch operations, cannot be assigned to sectors, and cannot receive reinforcements.

3. **Degradation**: Each turn while stranded:
   - Morale: -2/turn (isolation, no command structure)
   - Cohesion: -1/turn (supply difficulty, no rotation)
   - Personnel: no reinforcement possible (cut off from recruitment)

4. **Resolution conditions**:
   - **Reconnected**: If BFS from brigade location can reach any same-corps sector → clear stranded tag, normal pipeline resumes
   - **Collapsed**: If morale drops below 15 → brigade dissolves (surrender/dispersal). Generates a snap event for the player.
   - **Captured**: If the brigade's OSID flips to enemy control → brigade destroyed as normal

5. **No breakout**: Stranded brigades do NOT attempt to march toward friendly lines. Rationale: the Bosnian War had very few successful breakouts from encirclement. Most trapped units either held on, surrendered, or were overrun. Automated breakout marches would be unrealistic and create weird pathfinding artifacts.

### Historical justification

The Bosnian War had many stranded garrisons:
- **Srebrenica** (ARBiH): held for 3 years in complete isolation, slowly degrading until overrun in July 1995
- **Goražde** (ARBiH): survived in pocket throughout the war with gradually declining morale
- **Orašje** (HVO): held through Croatian supply across the Sava
- **Various VRS outposts**: small garrisons in isolated positions, typically held until relieved or abandoned

The common pattern: hold in place, degrade slowly, hope for relief or a negotiated end. No dramatic breakout attempts.

### Game identity

Stranded brigades are the war's quiet tragedy — men trapped by the front lines, slowly losing hope. For the player, they create a constraint: reconnecting a stranded brigade requires an offensive to reopen the corridor, which costs resources and political capital. The stranding itself is a consequence of earlier strategic choices. This serves the negative-sum identity: you can't undo strategic mistakes cheaply.

### Scope

- 40 lines: new `stranded_since_turn` field, per-turn degradation in a pipeline step, reconnection check, collapse trigger
- Tests: stranded lifecycle test (tag, degrade, reconnect, collapse)
- Proof: scenario where a brigade becomes stranded, degrades for N turns, then either reconnects or collapses

---

## Implementation Priority

1. **Decision 1 Fix A** (exhaustion rescale in situation_score) — 5 lines, fixes a dead wire where political scoring can't differentiate exhaustion between factions due to a bad 0-100 clamp on values that reach 400+
2. **Decision 3** (HRHB directive scope) — 10 lines code + 15 lines JSON. Key insight: the current ceiling is actively wrong for Posavina (fighting from day one) and redundant for Herzegovina/Tomislavgrad (already under Graz truces). Only Central Bosnia genuinely needs it.
3. **Decision 1 Fix B** (pressure → acceptance floor) — 15 lines, requires careful threshold tuning against actual pressure values (~4000 at w40)
4. **Decision 4** (stranded lifecycle) — 40 lines, the most complex but canonical examples are already resolved. Priority drops unless new stranding emerges in 52w scenarios.

~~**Decision 2**~~ — **Already implemented.** `FEINT_THREAT_MULTIPLIER = 1.5` in `brigade_assignment.ts`. No work needed.

---

## Implementation Plan

### Fix 1A — Exhaustion Rescale in situation_score (BUG FIX)

**File:** `src/sim/political/political_personality.ts`
**Line:** 303-307
**Current:**
```typescript
const exhaustion_level = clamp(
    state.political?.war_exhaustion?.[faction] ?? 0,
    0,
    100,
);
```
**Replace with:**
```typescript
// war_exhaustion is unbounded monotonic (typically 0-600+ at 40w).
// Normalize to 0-100 scale for situation_score formula.
// At 0: full score contribution. At 600: fully exhausted (100).
const exhaustion_level = clamp(
    (state.political?.war_exhaustion?.[faction] ?? 0) / 6,
    0,
    100,
);
```
**Expected values at w40:** RS/HRHB (400) → 66.7, RBiH (271) → 45.2
**Previous:** ALL factions → 100 (no differentiation)
**situation_score impact:** Exhaustion component goes from `(100-100)*0.3 = 0` (dead) to `(100-66.7)*0.3 = 10` for RS and `(100-45.2)*0.3 = 16.4` for RBiH — RBiH now has a measurably better political position due to lower exhaustion, which is historically correct.

**Test:** Extend `tests/sim/political/political_personality.test.ts` — verify that situation_score differentiates between factions with different war_exhaustion values.
**Proof:** 40w scenario — compare bot peace plan evaluation before/after. Verify RS situation_score < RBiH situation_score.

### Fix 3 — HRHB Patron Directive Per-Corps Scope

**File 1:** `src/sim/combat/bot_corps_stance.ts` lines 257-264
**Current:**
```typescript
type PatronDirective = { start_week: number; end_week: number; stance_ceiling: string };
// ...
const activeDirective = directives.find(d => turn >= d.start_week && turn < d.end_week);
if (activeDirective && STANCE_RANK[stance] > STANCE_RANK[activeDirective.stance_ceiling as CorpsStance]) {
    stance = activeDirective.stance_ceiling as CorpsStance;
}
```
**Replace with:**
```typescript
type PatronDirective = { start_week: number; end_week: number; stance_ceiling: string; corps_ids?: string[] };
// ...
const activeDirective = directives.find(d =>
    turn >= d.start_week && turn < d.end_week
    && (!d.corps_ids || d.corps_ids.includes(corps.id))
);
if (activeDirective && STANCE_RANK[stance] > STANCE_RANK[activeDirective.stance_ceiling as CorpsStance]) {
    stance = activeDirective.stance_ceiling as CorpsStance;
}
```

**File 2:** `data/scenarios/timelines/apr1992.json` lines 377-382
**Current:** 3 faction-wide directives
**Replace with:** Per-corps scoped directives:
```json
"patron_directives": {
    "HRHB": [
        { "name": "Consolidate Herzegovina", "start_week": 0, "end_week": 40, "stance_ceiling": "defensive",
          "corps_ids": ["hvo_southeast_herzegovina", "hvo_central_bosnia", "hvo_tomislavgrad"],
          "description": "Zagreb: secure Herzegovina, maintain RBiH alliance. Posavina exempt (fighting for survival)." },
        { "name": "Herzegovina Offensive", "start_week": 40, "end_week": 999, "stance_ceiling": "offensive",
          "corps_ids": ["hvo_southeast_herzegovina"],
          "description": "Zagreb: take Mostar hinterland" },
        { "name": "Central Bosnia Restraint", "start_week": 40, "end_week": 50, "stance_ceiling": "balanced",
          "corps_ids": ["hvo_central_bosnia"],
          "description": "Zagreb: prepare positions, avoid premature escalation" },
        { "name": "Central Bosnia Offensive", "start_week": 50, "end_week": 999, "stance_ceiling": "offensive",
          "corps_ids": ["hvo_central_bosnia"],
          "description": "Zagreb: secure Lašva Valley" },
        { "name": "Tomislavgrad Hold", "start_week": 40, "end_week": 999, "stance_ceiling": "balanced",
          "corps_ids": ["hvo_tomislavgrad"],
          "description": "Zagreb: maintain western positions" }
    ]
}
```

**Key change:** `hvo_northwest_bosnia` (Posavina) is excluded from ALL directives — it was fighting from day one. The w0-40 defensive ceiling now explicitly lists the three corps it applies to.

**Test:** Add test in `tests/patron_directives.test.ts` verifying corps_ids scoping.
**Proof:** 40w scenario — verify Posavina HVO is NOT capped at defensive. 52w scenario — verify Herzegovina goes offensive at w40 while Central Bosnia stays balanced until w50.

### Fix 1B — Negotiation Pressure → Acceptance Floor

**File:** `src/sim/political/political_peace_plan.ts`
**Location:** Before the accept/reject scoring block (~line 220)
**Insert:**
```typescript
// High negotiation pressure erodes resistance to bad deals.
// At pressure 0: no effect. At ~4000 (typical w40): floor drops by ~15 points.
const factionPressure = factionState?.negotiation?.pressure ?? 0;
const pressureFloorReduction = Math.min(15, factionPressure / 267);
// Apply: reduce the effective territory floor gap that triggers hard rejection
const adjustedTerritoryFloor = Math.max(0, territoryFloorGap - pressureFloorReduction);
```

**Mechanics:** The territory floor gap (e.g. 18pp for Vance-Owen) shrinks as pressure accumulates. At pressure 4000, the floor drops by 15 points — a faction that would have rejected a plan requiring 18pp territorial concession now accepts at 3pp concession. The war's accumulated suffering makes factions willing to accept increasingly bad deals.

**Test:** Extend `tests/sim/political/political_peace_plan.test.ts` — verify that high-pressure factions accept plans they would reject at low pressure.
**Proof:** 40w/52w scenario — verify bot peace plan responses change as pressure accumulates.

### Fix 4 — Stranded Brigade Lifecycle (DEFERRED unless needed)

**Implementation only if 52w scenario produces new stranding. Current priority: document the contract, defer the code.**

**New field:** `stranded_since_turn?: number` on `FormationState`
**New pipeline step:** `check-stranded-brigades` after `reconcile-final-sector-truth`
**Behavior:**
1. Tag: if brigade unreachable from any same-corps sector for 3+ consecutive turns → set `stranded_since_turn`
2. Degrade: -2 morale/turn, -1 cohesion/turn while stranded
3. Reconnect: BFS reaches same-corps sector → clear tag, resume normal pipeline
4. Collapse: morale < 15 → dissolve (generate snap event)
5. No breakout: stranded brigades hold position only

**Test:** Unit test for stranded lifecycle (tag, degrade, reconnect, collapse paths)
**Proof:** Synthetic test scenario with a brigade forced into isolation

---

## Verification Plan

After each fix, run in order:
1. `npx tsc --noEmit -p tsconfig.json`
2. Targeted test suite for the changed seam
3. `npm run test:vitest` (full suite)
4. `npm run desktop:map:build`
5. 40w scenario run with `compare_painted_vs_sim.cjs` (for behavior changes)
6. Compare anchors, benchmarks, anomalies against n1570 baseline

One fix per scenario run per one-change-then-verify protocol.
