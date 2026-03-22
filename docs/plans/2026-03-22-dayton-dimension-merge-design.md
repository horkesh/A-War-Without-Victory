# Dayton Dimension Merge — Design Spec

**Date:** 2026-03-22
**Status:** APPROVED
**Version:** v0.6.3 scope
**Parent:** `docs/plans/2026-03-22-v06x-master-roadmap.md`
**Audit:** `docs/plans/2026-03-22-integration-audit-findings.md` §3

---

## Problem

Two parallel dimension systems exist and don't talk to each other:

| System | Dimensions | Computed? | Used? |
|--------|-----------|-----------|-------|
| **NegotiationCapital** (old) | 5: military_position, humanitarian_standing, international_credibility, military_effectiveness, political_cohesion | Per-turn from state | Drives Dayton budget |
| **StrategicDimensions** (new) | 6: military_credibility, territorial_legitimacy, international_standing, patron_confidence, internal_cohesion, negotiating_leverage | Initialized at 50, never updated | Display only in Army HQ |

The v0.6.x vision ("political wargame") requires a single dimension system that events feed and Dayton reads.

---

## Solution

**The 6 strategic dimensions become the single source of truth.** The old NegotiationCapital 5-field scoring is retired. Its raw stats survive as inputs to the new system.

Each dimension: `effective_value = clamp(base_value + event_modifier, 0, 100)`

- `base_value` — recomputed every turn from game state
- `event_modifier` — accumulated from player event choices
- `effective_value` — what the player sees and what Dayton reads

---

## base_value Formulas

| Dimension | Formula | Key Inputs |
|---|---|---|
| military_credibility | ops_success_rate × 50 + casualty_ratio_advantage × 25 | Operations launched/succeeded, casualties inflicted/taken |
| territorial_legitimacy | area_weighted_territory_pct × 1.2 | controlBySettlement, osid_areas.json |
| international_standing | 50 - (war_crimes × 10) - (civilian_casualties / 5000) + (peace_plans_accepted × 10) | War crimes events, civilian casualties, peace plan history |
| patron_confidence | patron_support_level × 100 | Patron relationship support_level |
| internal_cohesion | (alliance_value × 40) + (avg_brigade_cohesion / 2) - (exhaustion / 3) | RBiH-HRHB alliance, brigade avg cohesion, war exhaustion |
| negotiating_leverage | (military_credibility + territorial_legitimacy + patron_confidence) / 3 | Derived from other dimensions |

All values clamped 0–100. `negotiating_leverage` is a meta-dimension — its base_value derives from other dimensions' effective_values, making it the only dimension that compounds.

---

## Dayton Capital Budget

A single composite score (0–100) derived from the 6 dimensions with faction-specific weights:

```
capital = Σ (dimension_effective_value × faction_weight)
```

### Weights per Faction

| Dimension | RS | RBiH | HRHB |
|---|---|---|---|
| military_credibility | 0.25 | 0.15 | 0.15 |
| territorial_legitimacy | 0.25 | 0.15 | 0.20 |
| international_standing | 0.10 | 0.25 | 0.15 |
| patron_confidence | 0.15 | 0.15 | 0.25 |
| internal_cohesion | 0.10 | 0.15 | 0.15 |
| negotiating_leverage | 0.15 | 0.15 | 0.10 |

**Rationale:** RS wins with military facts on the ground. RBiH wins with international sympathy and legitimacy. HRHB depends on Zagreb's patronage.

Package costs in `territorial_packages.ts` and `institutional_packages.ts` remain static — they're already denominated in capital points. Flag-based cost modifiers are a future extension point (v0.6.3+), not part of this merge.

---

## UI — Strategic Position Panel

### Composite Score (new)
Top of Strategic Position panel in Army HQ Briefing tab:

```
NEGOTIATING CAPITAL: 67 ████████████████████░░░░░░░░░░
```

Large number + bar. Color: green (>60), amber (40–60), red (<40).

### Dimension Bars (enhanced)
The 6 existing bars get two additions:

1. **Weight emphasis** — bars that contribute more to the composite are visually thicker:
   - >0.20 weight: 4px bar height
   - 0.15–0.20: 3px
   - <0.15: 2px

2. **Tooltips** — hover shows breakdown:
   ```
   Territorial Legitimacy: 47
     Base: 62 (49.2% territory controlled)
     Events: -15 (Drina cleansing -25, corridor secured +10)
     Weight: 25% of negotiating capital
   ```

### CoS Integration
The CoS briefing references dimensions when they shift significantly. Already has inline links to corps — extends to dimension-contextual language: "Commander, our international standing has taken a severe hit. We're going to feel this at the peace table."

---

## Engine Changes

### Pipeline Step
New step `compute-dimension-bases` inserted between `evaluate-events` and existing negotiation computation:

```
update-event-readiness     → pressure counters
evaluate-events            → fires events, applies event_modifier via dimension_shifts
compute-dimension-bases    → NEW: recomputes base_value from game state
compute-negotiation-capital → reads unified dimensions, produces composite
```

Order matters: events modify `event_modifier` first, then base values recompute from fresh state.

### Functions

**New:**
- `computeDimensionBaseValues(state, faction)` — maps raw game state to 6 base_value updates. Calls `updateBaseValue()` on DimensionStore for each dimension.
- `computeNegotiatingCapital(store, faction)` — weighted sum of effective_values → single 0–100 composite.
- `DIMENSION_WEIGHTS` — faction-specific weight table.

**Modified:**
- `computeNegotiationCapital()` in `compute_capital.ts` — slim wrapper calling the new functions. Still computes raw breakdown stats for tooltips.
- `getCompositeCapital()` in `bot_negotiation.ts` — rewired to call `computeNegotiatingCapital()`.
- `initiateDaytonNegotiation()` in `dayton_negotiation.ts` — reads composite from DimensionStore.

**Retired:**
- 5 scoring fields on `NegotiationCapital` → interface renamed to `NegotiationBreakdown`
- Old `CAPITAL_WEIGHTS` (5-dim) → replaced by `DIMENSION_WEIGHTS` (6-dim)

### Type Changes

```typescript
// OLD — retired as scoring system
interface NegotiationCapital {
    military_position: number;        // REMOVED
    humanitarian_standing: number;     // REMOVED
    international_credibility: number; // REMOVED
    military_effectiveness: number;    // REMOVED
    political_cohesion: number;        // REMOVED
    // Raw stats KEPT:
    territory_controlled_pct: number;
    refugees_created: number;
    // ... etc
}

// NEW — raw stats only, renamed
interface NegotiationBreakdown {
    territory_controlled_pct: number;
    territory_controlled_km2: number;
    civilians_under_protection: number;
    refugees_created: number;
    refugees_received: number;
    military_casualties_inflicted: number;
    military_casualties_taken: number;
    civilian_casualties_caused: number;
    enclaves_held: string[];
    enclaves_lost: string[];
    peace_plans_accepted: string[];
    peace_plans_rejected: string[];
    operations_launched: number;
    operations_successful: number;
    war_crimes_events: number;
}
```

---

## Backward Compatibility

- Old saves with `NegotiationCapital` 5-field scores: **ignored**. DimensionStore (backfilled via existing `initializeStrategicDimensions()`) becomes authoritative.
- Old saves without `event_readiness` or `event_flags`: already handled.
- No save migration needed — graceful fallback on missing fields.

---

## Testing

| Test | What |
|------|------|
| `computeDimensionBaseValues` unit tests | Each of 6 formulas with known state → expected base_value |
| `computeNegotiatingCapital` unit tests | Weighted sum for each faction with known dimensions → expected composite |
| `updateBaseValue` integration | Verify base recompute doesn't clobber event_modifier |
| Pipeline ordering | Events fire → base recompute → composite derived (correct order) |
| Backward compat | Save without strategic_dimensions → backfilled, composite still works |
| UI composite display | StrategicPosition shows composite score + weighted bar emphasis |

**Calibration impact:** None for 40w/52w runs (Dayton fires at w188). Run 40w anyway to verify zero combat/territory regression.

---

## Scope

**In scope:**
- Merge two dimension systems into one
- base_value formulas for all 6 dimensions
- Composite score computation with faction weights
- UI: composite bar + weight emphasis + tooltips
- Pipeline step
- Type rename (NegotiationCapital → NegotiationBreakdown)
- ~10-15 tests

**Out of scope (future extensions):**
- Flag-based package cost modifiers (v0.6.3+)
- OSID-level territory transfers at Dayton
- Area-weighted territory split in Dayton resolution
- AI Commander prompt awareness of dimensions
- Dimension-to-verdict grade mapping

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/events/strategic_dimensions.ts` | Add `DIMENSION_WEIGHTS`, `computeNegotiatingCapital()` |
| `src/sim/negotiation/compute_capital.ts` | Rewrite: `computeDimensionBaseValues()`, slim wrapper, raw breakdown only |
| `src/state/negotiation_types.ts` | Rename `NegotiationCapital` → `NegotiationBreakdown`, remove 5 score fields, add `DIMENSION_WEIGHTS` |
| `src/sim/negotiation/bot_negotiation.ts` | Rewire `getCompositeCapital()` → `computeNegotiatingCapital()` |
| `src/sim/negotiation/dayton_negotiation.ts` | Read composite from DimensionStore |
| `src/sim/turn_phases/war_phases.ts` | Add `compute-dimension-bases` pipeline step |
| `src/ui/map/components/army_hq/StrategicPosition.tsx` | Composite score bar + weight emphasis + tooltips |
| `src/ui/map/data/GameStateAdapter.ts` | Derive composite score for UI |
| `src/ui/map/data/types.ts` | Add `negotiatingCapital` to LoadedGameState |
