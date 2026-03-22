# Dayton Dimension Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the two parallel dimension systems (NegotiationCapital 5-field + StrategicDimensions 6-field) into a single system where base_value is computed from game state, event_modifier from player choices, and the composite score drives Dayton.

**Architecture:** The 6 strategic dimensions become the single source of truth. `computeDimensionBaseValues()` maps raw game state to base_values each turn. `computeNegotiatingCapital()` produces a weighted composite 0-100 score per faction. The old NegotiationCapital scoring fields are removed; raw breakdown stats kept as `NegotiationBreakdown`.

**Tech Stack:** TypeScript (sim engine + React UI). Vitest for tests. No new dependencies.

**Design spec:** `docs/plans/2026-03-22-dayton-dimension-merge-design.md`

---

### Task 1: Add DIMENSION_WEIGHTS and computeNegotiatingCapital
**Role:** Gameplay Programmer

**Files:**
- Modify: `src/sim/events/strategic_dimensions.ts`
- Test: `tests/strategic_dimensions.test.ts`

**Step 1: Write the failing test**

```typescript
// In tests/strategic_dimensions.test.ts — add to existing test file
import { computeNegotiatingCapital, DIMENSION_WEIGHTS } from '../src/sim/events/strategic_dimensions.js';

describe('computeNegotiatingCapital', () => {
    it('returns weighted sum of effective values for RS', () => {
        const store = initializeStrategicDimensions();
        // Set known values: all 50 → composite = 50
        const result = computeNegotiatingCapital(store, 'RS');
        expect(result).toBeCloseTo(50, 1);
    });

    it('weights military_credibility higher for RS than RBiH', () => {
        expect(DIMENSION_WEIGHTS.RS.military_credibility).toBeGreaterThan(DIMENSION_WEIGHTS.RBiH.military_credibility);
    });

    it('weights international_standing higher for RBiH than RS', () => {
        expect(DIMENSION_WEIGHTS.RBiH.international_standing).toBeGreaterThan(DIMENSION_WEIGHTS.RS.international_standing);
    });

    it('faction weights sum to 1.0', () => {
        for (const faction of ['RS', 'RBiH', 'HRHB']) {
            const sum = Object.values(DIMENSION_WEIGHTS[faction]).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 5);
        }
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/strategic_dimensions.test.ts`
Expected: FAIL — `computeNegotiatingCapital` and `DIMENSION_WEIGHTS` not exported

**Step 3: Write minimal implementation**

Add to `src/sim/events/strategic_dimensions.ts`:

```typescript
export const DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
    RS:   { military_credibility: 0.25, territorial_legitimacy: 0.25, international_standing: 0.10, patron_confidence: 0.15, internal_cohesion: 0.10, negotiating_leverage: 0.15 },
    RBiH: { military_credibility: 0.15, territorial_legitimacy: 0.15, international_standing: 0.25, patron_confidence: 0.15, internal_cohesion: 0.15, negotiating_leverage: 0.15 },
    HRHB: { military_credibility: 0.15, territorial_legitimacy: 0.20, international_standing: 0.15, patron_confidence: 0.25, internal_cohesion: 0.15, negotiating_leverage: 0.10 },
};

export function computeNegotiatingCapital(store: DimensionStore, faction: string): number {
    const weights = DIMENSION_WEIGHTS[faction];
    if (!weights || !store[faction]) return 50;
    let total = 0;
    for (const [dim, weight] of Object.entries(weights)) {
        total += (store[faction][dim]?.effective_value ?? 50) * weight;
    }
    return clamp(total, 0, 100);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/strategic_dimensions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sim/events/strategic_dimensions.ts tests/strategic_dimensions.test.ts
git commit -m "feat(dimensions): DIMENSION_WEIGHTS + computeNegotiatingCapital"
```

---

### Task 2: Add computeDimensionBaseValues
**Role:** Gameplay Programmer

**Files:**
- Modify: `src/sim/events/strategic_dimensions.ts`
- Test: `tests/strategic_dimensions.test.ts`

**Step 1: Write the failing test**

```typescript
import { computeDimensionBaseValues } from '../src/sim/events/strategic_dimensions.js';

describe('computeDimensionBaseValues', () => {
    it('computes territorial_legitimacy from territory percentage', () => {
        const store = initializeStrategicDimensions();
        const mockState = {
            political: { political_controllers: {} },
            military: { formations: {}, negotiation: { capital: { RS: { territory_controlled_pct: 49 } } } },
        };
        computeDimensionBaseValues(store, mockState as any, 'RS');
        // 49% × 1.2 = 58.8
        expect(store.RS.territorial_legitimacy.base_value).toBeCloseTo(58.8, 0);
    });

    it('negotiating_leverage derives from other dimensions', () => {
        const store = initializeStrategicDimensions();
        // Set known values
        store.RS.military_credibility.effective_value = 60;
        store.RS.territorial_legitimacy.effective_value = 80;
        store.RS.patron_confidence.effective_value = 40;
        computeDimensionBaseValues(store, {} as any, 'RS');
        // leverage = (60 + 80 + 40) / 3 = 60
        expect(store.RS.negotiating_leverage.base_value).toBeCloseTo(60, 0);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/strategic_dimensions.test.ts`
Expected: FAIL — `computeDimensionBaseValues` not exported

**Step 3: Write minimal implementation**

Add to `src/sim/events/strategic_dimensions.ts`:

```typescript
/**
 * Recompute base_value for all 6 dimensions from current game state.
 * Called each turn AFTER events fire (so event_modifier is already applied).
 * Reads raw stats from NegotiationCapital breakdown (territory %, casualties, etc.).
 */
export function computeDimensionBaseValues(store: DimensionStore, state: any, faction: string): void {
    if (!store[faction]) return;
    const cap = state.military?.negotiation?.capital?.[faction];
    const patron = state.military?.negotiation?.patron_relationships?.[faction];

    // military_credibility: ops success + casualty ratio
    const opsLaunched = cap?.operations_launched ?? 0;
    const opsSuccessful = cap?.operations_successful ?? 0;
    const opsRate = opsLaunched > 0 ? opsSuccessful / opsLaunched : 0.5;
    const casInflicted = cap?.military_casualties_inflicted ?? 0;
    const casTaken = cap?.military_casualties_taken ?? 1;
    const casRatio = casTaken > 0 ? casInflicted / casTaken : 1;
    const milCred = clamp(opsRate * 50 + Math.min(casRatio, 3) * (25 / 3), 0, 100);
    updateBaseValue(store, faction, 'military_credibility', milCred);

    // territorial_legitimacy: area-weighted territory %
    const terrPct = cap?.territory_controlled_pct ?? 0;
    updateBaseValue(store, faction, 'territorial_legitimacy', clamp(terrPct * 1.2, 0, 100));

    // international_standing: peace plan compliance - war crimes - civilian casualties
    const warCrimes = cap?.war_crimes_events ?? 0;
    const civCas = cap?.civilian_casualties_caused ?? 0;
    const plansAccepted = cap?.peace_plans_accepted?.length ?? 0;
    const plansRejected = cap?.peace_plans_rejected?.length ?? 0;
    const intlScore = 50 - (warCrimes * 10) - (civCas / 5000) + (plansAccepted * 10) - (plansRejected * 15);
    updateBaseValue(store, faction, 'international_standing', clamp(intlScore, 0, 100));

    // patron_confidence: patron support level
    const patronSupport = patron?.support_level ?? 50;
    updateBaseValue(store, faction, 'patron_confidence', clamp(patronSupport, 0, 100));

    // internal_cohesion: alliance + avg cohesion - exhaustion
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 1;
    const allianceVal = (faction === 'RBiH' || faction === 'HRHB') ? alliance * 40 : 20;
    const fmns = Object.values(state.military?.formations ?? {}) as any[];
    const factionBrigades = fmns.filter((f: any) => f.faction === faction && f.kind === 'brigade' && f.status === 'active');
    const avgCohesion = factionBrigades.length > 0
        ? factionBrigades.reduce((s: number, b: any) => s + (b.cohesion ?? 50), 0) / factionBrigades.length
        : 50;
    const exhaustion = state.military?.war_phase_exhaustion?.[faction] ?? 0;
    const cohScore = allianceVal + (avgCohesion / 2) - (exhaustion / 3);
    updateBaseValue(store, faction, 'internal_cohesion', clamp(cohScore, 0, 100));

    // negotiating_leverage: derived meta-dimension
    const milEff = store[faction].military_credibility.effective_value;
    const terrEff = store[faction].territorial_legitimacy.effective_value;
    const patEff = store[faction].patron_confidence.effective_value;
    updateBaseValue(store, faction, 'negotiating_leverage', clamp((milEff + terrEff + patEff) / 3, 0, 100));
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/strategic_dimensions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sim/events/strategic_dimensions.ts tests/strategic_dimensions.test.ts
git commit -m "feat(dimensions): computeDimensionBaseValues — 6 base formulas from state"
```

---

→ /simplify → commit

---

### Task 3: Rename NegotiationCapital → NegotiationBreakdown
**Role:** Systems Programmer

**Files:**
- Modify: `src/state/negotiation_types.ts` — remove 5 scoring fields, rename interface
- Modify: `src/sim/negotiation/compute_capital.ts` — update references
- Modify: any file importing `NegotiationCapital` — update to `NegotiationBreakdown`

**Step 1: Search for all NegotiationCapital references**

Run: `grep -rn "NegotiationCapital" src/ --include="*.ts" | head -30`

**Step 2: Rename interface and remove scoring fields**

In `src/state/negotiation_types.ts`:
- Rename `NegotiationCapital` → `NegotiationBreakdown`
- Remove the 5 scoring fields: `military_position`, `humanitarian_standing`, `international_credibility`, `military_effectiveness`, `political_cohesion`
- Keep all raw breakdown fields
- Remove old `CAPITAL_WEIGHTS` (replaced by `DIMENSION_WEIGHTS` in strategic_dimensions.ts)

**Step 3: Update all imports**

Find-and-replace `NegotiationCapital` → `NegotiationBreakdown` across all files.

**Step 4: Update compute_capital.ts**

Remove the lines that compute `cap.military_position`, `cap.humanitarian_standing`, etc. Keep the raw data computation.

**Step 5: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git commit -m "refactor(types): NegotiationCapital → NegotiationBreakdown, remove 5 scoring fields"
```

---

### Task 4: Add pipeline step + wire Dayton
**Role:** Systems Programmer

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts` — add `compute-dimension-bases` step
- Modify: `src/sim/negotiation/bot_negotiation.ts` — rewire `getCompositeCapital()`
- Modify: `src/sim/negotiation/dayton_negotiation.ts` — read from DimensionStore

**Step 1: Add pipeline step**

In `war_phases.ts`, find the `evaluate-events` step and add a new step after it:

```typescript
{ name: 'compute-dimension-bases', run: (state) => {
    const neg = state.military.negotiation;
    if (!neg?.strategic_dimensions) return;
    for (const faction of CANONICAL_FACTIONS) {
        computeDimensionBaseValues(neg.strategic_dimensions, state, faction);
    }
}},
```

**Step 2: Rewire bot_negotiation.ts**

Replace `getCompositeCapital()` to read from DimensionStore:

```typescript
export function getCompositeCapital(state: GameState, faction: FactionId): number {
    const dims = state.military.negotiation?.strategic_dimensions;
    if (!dims) return 50;
    return computeNegotiatingCapital(dims, faction);
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run`
Run: `npm run sim:scenario:run:40w` — verify zero combat/territory regression

**Step 4: Commit**

```bash
git commit -m "feat(pipeline): compute-dimension-bases step + Dayton reads unified dimensions"
```

---

→ /simplify → commit

---

### Task 5: UI — Composite score + weight emphasis + tooltips
**Role:** UI/UX Developer

**Files:**
- Modify: `src/ui/map/components/army_hq/StrategicPosition.tsx`
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Modify: `src/ui/map/data/types.ts`

**Step 1: Add negotiatingCapital to LoadedGameState**

In `types.ts`, add:
```typescript
negotiatingCapital?: number;
```

**Step 2: Derive in GameStateAdapter**

```typescript
negotiatingCapital: deriveNegotiatingCapital(state),
```

```typescript
function deriveNegotiatingCapital(state: any): number | undefined {
    const dims = state.military?.negotiation?.strategic_dimensions;
    const faction = state.meta?.player_faction;
    if (!dims || !faction) return undefined;
    const weights = dims[faction];
    if (!weights) return undefined;
    let total = 0;
    const WEIGHTS: Record<string, Record<string, number>> = {
        RS:   { military_credibility: 0.25, territorial_legitimacy: 0.25, international_standing: 0.10, patron_confidence: 0.15, internal_cohesion: 0.10, negotiating_leverage: 0.15 },
        RBiH: { military_credibility: 0.15, territorial_legitimacy: 0.15, international_standing: 0.25, patron_confidence: 0.15, internal_cohesion: 0.15, negotiating_leverage: 0.15 },
        HRHB: { military_credibility: 0.15, territorial_legitimacy: 0.20, international_standing: 0.15, patron_confidence: 0.25, internal_cohesion: 0.15, negotiating_leverage: 0.10 },
    };
    const w = WEIGHTS[faction];
    if (!w) return undefined;
    for (const [dim, weight] of Object.entries(w)) {
        total += (weights[dim]?.effective_value ?? 50) * weight;
    }
    return Math.round(Math.max(0, Math.min(100, total)));
}
```

**Step 3: Update StrategicPosition.tsx**

Add composite bar at top, weight emphasis on dimension bars, tooltips with base/modifier breakdown.

**Step 4: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`

**Step 5: Commit**

```bash
git commit -m "feat(ui): composite Negotiating Capital score + weighted dimension bars + tooltips"
```

---

## Execution Order

Tasks 1-2 are sequential (Task 2 uses Task 1's exports).
Task 3 depends on Tasks 1-2 (renames old types).
Task 4 depends on Tasks 1-3 (wires new functions into pipeline).
Task 5 depends on Task 1 (reads DIMENSION_WEIGHTS) but can start in parallel with Tasks 3-4.

```
Task 1 → Task 2 → Task 3 → Task 4
                          ↘ Task 5
```

## Done Gate

- [ ] `computeNegotiatingCapital()` returns weighted composite from DimensionStore
- [ ] `computeDimensionBaseValues()` computes 6 base values from game state
- [ ] `NegotiationCapital` renamed to `NegotiationBreakdown` (no scoring fields)
- [ ] Pipeline step `compute-dimension-bases` runs after `evaluate-events`
- [ ] Dayton reads composite from unified DimensionStore
- [ ] UI shows composite bar + weight emphasis + tooltips
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` passes
- [ ] `desktop:map:build` passes
- [ ] 40w scenario: zero combat/territory regression

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions flagged for user review
- [ ] Napkin read at start, updated during work
- [ ] Ledger entry appended on completion
- [ ] Life lessons scanned, relevant ones flagged
- [ ] tsc + vitest after every phase
- [ ] /simplify between each phase
- [ ] Version bump + tag on milestone completion

## Completion Checklist

- [ ] Implementation report in `docs/40_reports/implemented/`
- [ ] Canon docs updated (if applicable)
- [ ] Master files updated (if applicable)
- [ ] VERSIONING.md milestone marked complete
- [ ] PROJECT_LEDGER.md entry appended
- [ ] Napkin updated
