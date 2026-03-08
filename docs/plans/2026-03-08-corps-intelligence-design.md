# Corps Intelligence: Front Geometry Analysis + Commander Personality

**Date:** 2026-03-08
**Status:** Design — pending implementation

---

## Problem

The corps AI is list-driven. It receives target OSIDs from army priorities, finds
undefended sectors, and spots small pockets. It has no awareness of *front shape* —
it can't see salients, doesn't know which OSIDs are critical to hold, and doesn't
prefer attacks that shorten the line. A real corps commander looks at a map and
sees shapes: bulges to exploit, necks to defend, lines to straighten.

Additionally, officer personality has almost no effect on corps behavior. The only
current influence is `(aggressiveness - 3) × 0.05` on aggression modifier — a
±0.10 range that barely changes outcomes.

## Design Principles

1. **Geometry is universal.** Every corps gets the same geometric analysis regardless
   of its commander. Salient detection and ethnic hold constraints are structural
   facts, not personality-dependent.

2. **Personality modulates response.** Commander traits shape *how aggressively* the
   corps responds to what geometry reveals — not whether it sees it.

3. **Build on existing infrastructure.** `isChokepoint()` in `osid_graph_analysis.ts`
   already does articulation-point detection via BFS. `getCoEthnicShare()` already
   returns ethnic fractions. The consolidation score in target sorting is the natural
   injection point for line-shortening.

4. **Determinism.** All algorithms use sorted iteration, BFS with deterministic seed
   selection, and `strictCompare` tiebreaks. No randomness.

---

## Part 1: Salient Detection

### What is a salient?

A **salient** is a connected group of faction-controlled OSIDs that protrudes into
enemy territory, connected to the main body through a narrow "neck." If the enemy
captures the neck OSIDs, the salient becomes a pocket.

### Detection algorithm

New function `detectSalients()` in `front_geometry_analysis.ts`.

**Input:** faction, sector territory OSIDs, OSID adjacency graph, political controllers.

**Step 1: Build friendly subgraph.**
Extract all faction-controlled OSIDs within the sector. Build adjacency restricted
to these OSIDs only.

**Step 2: Find articulation points.**
Extend the existing `isChokepoint()` pattern. For each front-line friendly OSID
(has at least one enemy neighbor), test if removing it disconnects the friendly
subgraph. Use BFS from a seed through remaining friendly OSIDs; check if all
friendly neighbors of the removed OSID are still reachable.

This is O(V × (V + E)) per sector — with 30–80 front-line OSIDs per sector and
~5 neighbors each, this is trivially fast.

**Step 3: Compute cut components.**
For each articulation point found, remove it and find the disconnected components
via BFS. The smaller component(s) that contain front-line OSIDs = salient body.
The articulation point itself = neck OSID.

**Step 4: Merge adjacent neck OSIDs.**
Some salients have 2–3 OSID wide necks. If two articulation points are adjacent
and guard the same salient body (overlapping cut components), merge them into a
single salient record with `neck_width = 2`.

**Step 5: Score vulnerability.**
```
vulnerability = body_size / neck_width
```
Higher = more vulnerable (large salient hanging on a narrow neck).

Filter: only keep salients with `vulnerability >= 2.0` (at least twice as many
body OSIDs as neck OSIDs — a 1:1 ratio is just a normal front).

### Enemy salient detection

Same algorithm applied to enemy-controlled OSIDs in the sector's `enemy_osids`.
The neck OSIDs of an enemy salient become high-priority offensive targets — capturing
them pockets the entire salient body.

### Output

```typescript
interface SalientRecord {
    salient_id: string;           // Deterministic: sorted body OSIDs hash
    side: 'own' | 'enemy';       // Whose salient
    body_osids: string[];         // OSIDs in the salient body (sorted)
    neck_osids: string[];         // Critical connection points (sorted)
    neck_width: number;           // Number of neck OSIDs
    body_size: number;            // Number of body OSIDs
    vulnerability: number;        // body_size / neck_width
    front_exposure: number;       // Fraction of body perimeter touching enemy
}
```

---

## Part 2: Line-Shortening Score

### Current state

The existing consolidation score counts friendly neighbors:
```typescript
const getConsolidationScore = (osid: string): number => {
    const neighbors = adjacency.get(osid) ?? [];
    return neighbors.filter(n => controller(n) === faction).length;
};
```
This correlates with line shortening but is imprecise. An OSID with 4 friendly
neighbors and 1 enemy neighbor shortens the line by 3 edges, but one with 4
friendly neighbors and 4 enemy neighbors lengthens it by 0.

### Improved calculation

For each potential target OSID T, compute the net front perimeter change if T
were captured:

```typescript
function getLineShorteningScore(
    target: string,
    adjacency: Map<string, string[]>,
    faction: string,
    getController: (osid: string) => string | null
): number {
    const neighbors = adjacency.get(target) ?? [];
    let friendlyNeighbors = 0;  // Edges removed from front (were front, now interior)
    let enemyNeighbors = 0;     // Edges added to front (were interior, now front)
    for (const n of neighbors) {
        if (!n.startsWith('op:')) continue;
        const ctrl = getController(n);
        if (ctrl === faction) friendlyNeighbors++;
        else if (ctrl && ctrl !== faction) enemyNeighbors++;
    }
    // Negative = line gets shorter (good). Positive = line gets longer (bad).
    return enemyNeighbors - friendlyNeighbors;
}
```

**Integration:** Replace the consolidation score in the target sorting function.
Sort ascending (most negative = best line shortening = highest priority).

The sorting key hierarchy becomes:
1. Supply priority (critical → strained → adequate)
2. Intel score (thin → normal → dense → fortress)
3. **Line-shortening score** (replaces consolidation)
4. Strict alphabetical tiebreak

---

## Part 3: Ethnic Hold Constraints

### Concept

Some territory cannot be abandoned even when militarily suboptimal to defend,
because co-ethnic civilians live there. Ozren is the canonical example: the VRS
corps commander protecting Serb civilians in the salient won't consider withdrawal
even though the geometry suggests shortening the line.

### Implementation

For each **own salient** detected:
1. Look up `getCoEthnicShare(osid, faction, ethnicMap)` for every OSID in
   the salient body and neck.
2. If ANY neck OSID has co-ethnic share ≥ 0.40, the salient is **ethnically
   critical** — the neck gets unconditional `hold_osid` status.
3. If the average co-ethnic share across the salient body is ≥ 0.50, the
   entire salient is an **ethnic hold zone** — all body OSIDs get added to
   `hold_osids` and no withdrawal logic applies.

The threshold is 0.40 for necks (lower than the 0.50 used in combat homeland
defense) because losing a neck with even a plurality of co-ethnics is politically
catastrophic — it pockets the entire co-ethnic population behind it.

### Output

```typescript
interface CriticalHold {
    osid: string;
    reason: 'salient_neck' | 'ethnic_hold' | 'chokepoint';
    salient_id?: string;
    co_ethnic_share: number;
    priority: number;  // Higher = more critical to hold
}
```

Priority scoring:
- `salient_neck` with `co_ethnic_share >= 0.40`: priority = 100 (unconditional)
- `salient_neck` without ethnic: priority = 60
- `ethnic_hold` (body OSID): priority = 40
- `chokepoint` (existing): priority = 20

---

## Part 4: Commander Personality

### Current influence (narrow)

```typescript
aggressionModifier += (officer.aggressiveness - 3) × 0.05;
// Competence ≥ 4 → downgrade min_outcome from 'victory' to 'costly_victory'
```

### Expanded influence (four dimensions)

Commander traits affect four aspects of the directive:

#### 4a. Aggressiveness → Target priority and tempo

**Enemy salient exploitation priority:**
```typescript
// Enemy salient neck OSIDs get a priority boost based on commander aggressiveness
// Injected into offensive_targets BEFORE the normal target list
const salientPriorityBoost = officer.aggressiveness >= 4;
// agg 4–5: enemy salient necks inserted at top of offensive_targets
// agg 1–3: enemy salient necks mixed into normal priority order
```

**Max attackers per target:**
```typescript
// Aggressive commanders concentrate force on fewer targets
max_attackers_per_target = base + (officer.aggressiveness >= 4 ? 1 : 0);
// agg 4–5: +1 concentration (hit harder)
// agg 1–3: default
```

**Aggression modifier (expanded range):**
```typescript
// Current: (agg - 3) × 0.05 → range [-0.10, +0.10]
// New:     (agg - 3) × 0.08 → range [-0.16, +0.16]
aggressionModifier += (officer.aggressiveness - 3) * 0.08;
```

#### 4b. Defensive Skill → Reserve allocation and neck defense

**Reserve fraction modulation:**
```typescript
// Current: hardcoded by stance (offensive=0.10, balanced=0.20, defensive=0.30)
// New: modulated by defensive_skill
const defSkillAdj = (officer.defensive_skill - 3) * 0.03;
reserve_fraction = baseByStance + defSkillAdj;
// def_skill 5: +0.06 reserve (more cautious)
// def_skill 1: -0.06 reserve (thinner reserves)
// Clamped to [0.05, 0.40]
```

**Own salient reinforcement priority:**
```typescript
// High defensive_skill commanders push reinforce_sector_ids toward
// sectors containing own salients
// def_skill >= 4: own salient sectors get priority reinforcement
```

#### 4c. Competence → Risk tolerance and min_outcome

**Risk tolerance (expanded):**
```typescript
// Current: competence >= 4 downgrades min_outcome one step
// New: graduated
if (officer.competence >= 5) {
    // Accept costly_victory on everything — elite risk assessment
    min_attack_outcome = 'costly_victory';
} else if (officer.competence >= 4) {
    // Accept costly_victory when current is victory (existing behavior)
    if (min_attack_outcome === 'victory') min_attack_outcome = 'costly_victory';
} else if (officer.competence <= 2) {
    // Upgrade min_outcome one step — poor risk assessment, overly cautious
    if (min_attack_outcome === 'costly_victory') min_attack_outcome = 'victory';
}
```

**Target selection quality:**
```typescript
// High-competence commanders prefer line-shortening targets
// Low-competence commanders ignore line-shortening (sort weight = 0)
const useLineShorteningSort = officer.competence >= 3;
```
(This doesn't remove the analysis — it determines whether line-shortening
enters the sort key. Low-competence commanders still get ethnic holds and
salient neck holds because those are structural, not analytical.)

#### 4d. Political Reliability → Ethnic hold weight

```typescript
// Controls how strongly ethnic composition affects hold decisions
// High political_reliability: ethnic holds are absolute (threshold 0.35)
// Low political_reliability: ethnic holds require stronger majority (threshold 0.55)
const ethnicNeckThreshold = 0.40 + (3 - officer.political_reliability) * 0.05;
// pol_rel 5: 0.30 threshold (very protective of co-ethnics)
// pol_rel 3: 0.40 threshold (default)
// pol_rel 1: 0.50 threshold (less influenced by ethnic politics)
```

This creates a subtle but meaningful personality spectrum: a politically
reliable commander locks down co-ethnic territory even at 30% population
share, while a purely military-minded commander only holds for clear
majorities.

---

## Part 5: FrontGeometryAssessment — Data Flow

### Structure

```typescript
interface FrontGeometryAssessment {
    own_salients: SalientRecord[];
    enemy_salients: SalientRecord[];
    line_shortening_scores: Map<string, number>;  // target OSID → score
    critical_holds: CriticalHold[];
}
```

### Pipeline integration

Computed **inline** at the start of `generateCorpsDirectives()` in `bot_corps_ai.ts`.
Not a separate pipeline step — avoids plumbing and uses data already available
in the function scope (adjacency, controllers, sectors, ethnic map).

```
generateCorpsDirectives(state, ...)
  │
  ├─ For each corps:
  │   ├─ analyzeFrontGeometry(faction, sectors, adjacency, controllers, ethnicMap)
  │   │   → FrontGeometryAssessment
  │   │
  │   ├─ Inject enemy salient necks into offensive_targets
  │   │   (priority based on commander aggressiveness)
  │   │
  │   ├─ Inject critical_holds into hold_osids
  │   │   (unconditional — all commanders)
  │   │
  │   ├─ Replace consolidation score with line_shortening_scores in sort
  │   │   (only if commander competence >= 3)
  │   │
  │   └─ Modulate reserve_fraction, max_attackers, min_outcome
  │       (based on commander traits)
```

### What changes in existing code

| File | Change |
|------|--------|
| `bot_corps_ai.ts` | Import and call `analyzeFrontGeometry()` per corps; inject results into directive construction; expand officer trait modulation |
| `osid_graph_analysis.ts` | Export `isChokepoint()` helper if not already exported; add `detectSalients()` function (or put in new file) |
| `front_geometry_analysis.ts` | **NEW** — `analyzeFrontGeometry()`, `detectSalients()`, `getLineShorteningScore()`, ethnic hold logic |
| `game_state.ts` | Optional: add `FrontGeometryAssessment` to `CorpsCommandState` for GUI visibility |

### What does NOT change

- `attack_resolution_osid.ts` — combat resolution untouched
- `bot_brigade_ai_osid.ts` — brigade AI reads from directive as before
- `bot_strategy.ts` — army strategy unchanged
- `corps_front_sectors.ts` — sector construction unchanged
- Pipeline step list — no new steps (inline computation)

---

## Part 6: GUI Visibility (optional, deferred)

The `FrontGeometryAssessment` could be exposed through `GameStateAdapter` for
map visualization:

- Render own salients with a subtle highlight (show the player their vulnerable
  geometry)
- Show neck OSIDs with a "critical hold" indicator
- Show enemy salients with an "opportunity" highlight

This is strictly optional and should be deferred until the engine logic is
validated through calibration runs.

---

## Part 7: Testing Strategy

### Unit tests (`tests/front_geometry_analysis.test.ts`)

**Salient detection:**
- Simple salient: 3 OSIDs connected to main body through 1 neck → detected
- Wide connection: 5 OSIDs connected through 3 → NOT a salient (vulnerability < 2.0)
- No salient: straight front line → empty result
- Enemy salient: same detection from enemy perspective
- Multi-neck: 2 adjacent articulation points → single salient with neck_width=2
- Determinism: same input → same output across runs

**Line-shortening score:**
- OSID with 4 friendly, 1 enemy neighbor → score = -3 (shortens)
- OSID with 1 friendly, 4 enemy neighbors → score = +3 (lengthens)
- OSID with 2 friendly, 2 enemy → score = 0 (neutral)

**Ethnic hold constraints:**
- RS salient neck with 60% Serb → ethnically critical hold
- RS salient neck with 20% Serb → normal hold (not ethnic)
- High political_reliability → lower threshold (0.30)
- Low political_reliability → higher threshold (0.50)

**Commander modulation:**
- Aggressive officer (agg=5) → enemy salient necks at top of targets
- Cautious officer (agg=1) → enemy salient necks in normal priority
- High def_skill → larger reserve fraction
- Low competence → line-shortening sort disabled
- High competence → min_outcome downgraded

### Integration test

Run 40w scenario, verify:
- Salients detected in expected areas (Ozren, Goražde, Bihać pocket)
- Enemy salient necks appear in offensive_targets
- Ethnic hold OSIDs appear in hold_osids
- No regression in territory match rate (calibration neutral or positive)

---

## Part 8: Estimated Scope

| Component | Size |
|-----------|------|
| `front_geometry_analysis.ts` (new) | ~200 lines |
| `bot_corps_ai.ts` changes | ~80 lines |
| `osid_graph_analysis.ts` changes | ~30 lines (export helpers) |
| Tests | ~250 lines |
| Total | ~560 lines |

### Implementation order

1. `front_geometry_analysis.ts` — salient detection + line-shortening + ethnic holds
2. Unit tests for the above
3. Wire into `generateCorpsDirectives()` — inject geometry results into directive
4. Commander personality expansion — officer trait modulation
5. Integration test — 40w scenario run, verify no regression

---

## Non-Goals

- **Withdrawal logic:** The AI will not voluntarily abandon salients. Ethnic holds
  prevent this for populated areas, and the existing "no retreat" combat mechanic
  handles the rest. A future design could add voluntary withdrawal for unpopulated
  salients with high vulnerability, but that's beyond this scope.

- **Inter-corps coordination:** Adjacent corps don't coordinate pincer attacks on
  shared enemy salients. Each corps independently identifies enemy salients in its
  sector. Coordination would require a new army-level system.

- **Dynamic re-assessment:** The geometry assessment runs once per turn. No mid-turn
  re-evaluation after battles change control. This matches the weekly turn granularity.

- **GUI visualization:** Deferred. Engine logic first, GUI later.
