---
title: Code review and improvement suggestions
date: 2026-01-25
source: claude
confidence: high
primary_topics: [phases, map_and_geography, systems, negotiation, external_pressure_and_patrons, political_control, design]
---

**User**

My code base is here: __https://github.com/horkesh/AWWV__
Inspect it and suggest improvements.
---

**Assistant**

The user is asking me to inspect their GitHub repository for a game called "A War Without Victory" and suggest improvements. I have access to the game design documents which describe a complex strategic war simulation game set in Bosnia and Herzegovina during the 1991-1995 conflict.

Let me fetch the repository to see what the current code looks like.I'll inspect your repository and provide suggestions for improvements based on the comprehensive game design documents you've shared.
```
This block is not supported on your current device yet.
```

I can't directly fetch the GitHub repository URL because it wasn't provided by the user in a search result or directly in their message content - they put it in their message as a reference. Let me search for it instead to get access to the repository.
```
This block is not supported on your current device yet.
```

The search didn't find the exact repository. Let me try a more direct search with the full repository path.
```
This block is not supported on your current device yet.
```

Still no luck finding the repository. Let me try searching for "A War Without Victory" Bosnia game github.
```
This block is not supported on your current device yet.
```

The repository doesn't seem to be publicly accessible or indexed by search engines. This could mean:
1. The repository is private
2. The repository is very new and not yet indexed
3. The repository name or username might be slightly different

Since I can't access the repository directly, I should provide suggestions based on the extensive game design documentation the user has provided. The documents are very comprehensive and give me a good understanding of what the game is trying to accomplish. I can provide architectural and implementation suggestions based on the design principles outlined in the documents.I wasn't able to access your repository directly (it may be private or not yet indexed). However, based on the comprehensive game design documents you've provided, I can offer substantial architectural and implementation suggestions for "A War Without Victory."

## High-Level Architecture Recommendations

### 1. **Core State Management**
Given the complexity and determinism requirements:

```javascript
// Recommended state structure
{
  gameState: {
    currentTurn: number,
    phase: 'directive' | 'deployment' | 'military' | ...,
    endState: EndState | null,
    
    // Spatial layer
    settlements: Map<SettlementId, Settlement>,
    municipalities: Map<MunicipalityId, Municipality>,
    mcZones: Map<MCZId, MCZ>,
    
    // Military layer
    brigades: Map<BrigadeId, Brigade>,
    corps: Map<CorpsId, Corps>,
    operationalGroups: Map<OGId, OperationalGroup>,
    
    // Derived state (never serialized)
    fronts: Front[],
    corridors: Corridor[],
    
    // Political layer
    factions: Map<FactionId, Faction>,
    exhaustion: ExhaustionState,
    
    // External
    patrons: PatronState
  }
}
```

### 2. **Strict Separation of Concerns**

Based on your invariants, implement these as separate modules:

```
src/
├── core/
│   ├── state/           # Pure state structures
│   ├── validators/      # Invariant enforcement
│   └── derivations/     # Computed state (fronts, corridors)
├── systems/
│   ├── authority/
│   ├── combat/
│   ├── supply/
│   ├── exhaustion/
│   └── treaty/
├── turn/
│   └── phases/         # Turn resolution pipeline
└── ui/
    ├── map/
    ├── commands/
    └── negotiation/
```

### 3. **Invariant Validation System**

Create a comprehensive validator that runs after every state mutation:

```typescript
class InvariantValidator {
  validate(state: GameState): ValidationResult {
    const violations: Violation[] = [];
    
    // Settlement assignment invariants
    this.validateSettlementAssignment(state, violations);
    
    // AoR contiguity
    this.validateAoRContiguity(state, violations);
    
    // Authority-supply coherence
    this.validateAuthoritySupply(state, violations);
    
    // Exhaustion monotonicity
    this.validateExhaustionMonotonicity(state, violations);
    
    // No double-counting
    this.validateNoDoubleCounting(state, violations);
    
    return { valid: violations.length === 0, violations };
  }
  
  // Auto-correction instead of throwing
  autoCorrect(state: GameState, violations: Violation[]): GameState {
    let corrected = state;
    for (const violation of violations) {
      corrected = this.applyCorrection(corrected, violation);
    }
    return corrected;
  }
}
```

### 4. **Deterministic Derivation Pipeline**

Since you require strict determinism:

```typescript
class DerivedStateComputer {
  compute(state: GameState): DerivedState {
    // CRITICAL: Always use sorted iteration
    const sortedBrigades = Array.from(state.brigades.values())
      .sort((a, b) => a.id.localeCompare(b.id));
    
    return {
      fronts: this.computeFronts(state, sortedBrigades),
      corridors: this.computeCorridors(state),
      municipalityStatus: this.computeMunicipalityStatus(state)
    };
  }
  
  private computeFronts(state: GameState, brigades: Brigade[]): Front[] {
    // Deterministic front emergence from AoR adjacency
    // Must use stable ordering
  }
}
```

### 5. **Turn Resolution Pipeline**

Implement as a pure function pipeline:

```typescript
class TurnResolver {
  resolve(state: GameState): GameState {
    // Check for peace first
    if (state.endState) {
      return state; // No processing after peace
    }
    
    let nextState = state;
    
    // Fixed phase order
    nextState = this.directivePhase(nextState);
    nextState = this.deploymentPhase(nextState);
    nextState = this.militaryPhase(nextState);
    nextState = this.fragmentationPhase(nextState);
    nextState = this.supplyPhase(nextState);
    nextState = this.politicalPhase(nextState);
    nextState = this.exhaustionPhase(nextState);
    nextState = this.persistencePhase(nextState);
    
    // Validate invariants
    nextState = this.validator.validateAndCorrect(nextState);
    
    // Recompute derived state
    nextState.derived = this.derivedComputer.compute(nextState);
    
    return nextState;
  }
}
```

## Critical Implementation Patterns

### 6. **AoR Management**

```typescript
class AoRManager {
  // Enforce: each settlement assigned to exactly one brigade
  assignSettlement(
    state: GameState,
    settlementId: SettlementId,
    brigadeId: BrigadeId
  ): GameState {
    // Validate contiguity
    if (!this.maintainsContiguity(state, settlementId, brigadeId)) {
      throw new Error('AoR must remain contiguous');
    }
    
    // Update assignment
    const updated = { ...state };
    updated.settlements.get(settlementId).assignedBrigade = brigadeId;
    
    // Recompute brigade AoR
    updated.brigades.get(brigadeId).aoR = 
      this.computeAoR(updated, brigadeId);
    
    return updated;
  }
  
  // Generate cohesion loss, exhaustion from reshaping
  reshapeAoR(
    state: GameState,
    transfers: SettlementTransfer[]
  ): GameState {
    let updated = state;
    
    for (const transfer of transfers) {
      // Apply transfer
      updated = this.assignSettlement(
        updated,
        transfer.settlementId,
        transfer.newBrigadeId
      );
      
      // Apply costs
      updated = this.applyCohesionLoss(updated, transfer);
      updated = this.applyExhaustion(updated, transfer);
    }
    
    return updated;
  }
}
```

### 7. **Treaty System**

```typescript
class TreatyProcessor {
  evaluate(state: GameState, treaty: Treaty): TreatyEvaluation {
    // Check structural completeness
    const completeness = this.checkCompleteness(treaty);
    if (!completeness.valid) {
      return {
        accepted: false,
        rejectionReason: completeness.reason
      };
    }
    
    // Compute acceptance deterministically
    const acceptance = this.computeAcceptance(state, treaty);
    
    if (acceptance.score < acceptance.threshold) {
      return {
        accepted: false,
        breakdown: acceptance.breakdown
      };
    }
    
    // If peace-triggering and accepted, end immediately
    if (this.isPeaceTrigger(treaty)) {
      return {
        accepted: true,
        endState: this.computeEndState(state, treaty)
      };
    }
    
    return { accepted: true };
  }
  
  private checkCompleteness(treaty: Treaty): CompletenessCheck {
    // Brčko requirement
    if (this.isPeaceTrigger(treaty) && !treaty.brckoSpecialStatus) {
      return {
        valid: false,
        reason: 'brcko_unresolved'
      };
    }
    
    // Bundle requirements
    if (!this.checkCompetenceBundles(treaty)) {
      return {
        valid: false,
        reason: 'competence_bundle_violation'
      };
    }
    
    return { valid: true };
  }
}
```

### 8. **Supply Tracing**

```typescript
class SupplyTracer {
  trace(
    state: GameState,
    settlement: Settlement,
    faction: Faction
  ): SupplyState {
    // Build connectivity graph for faction
    const graph = this.buildControlledGraph(state, faction);
    
    // Find paths to supply sources
    const paths = this.findSupplyPaths(
      graph,
      settlement,
      faction.supplySources
    );
    
    // Evaluate corridor states
    const corridorStates = paths.map(path =>
      this.evaluateCorridorState(state, path)
    );
    
    // Aggregate to supply state
    return this.aggregateSupplyState(corridorStates);
  }
  
  private evaluateCorridorState(
    state: GameState,
    path: SettlementPath
  ): CorridorState {
    // Compute dependency, capacity, redundancy
    // Returns: 'open' | 'brittle' | 'cut'
  }
}
```

## Testing Strategy

### 9. **Invariant Test Suite**

```typescript
describe('Game Invariants', () => {
  test('every settlement assigned to exactly one brigade', () => {
    const state = createTestState();
    const settlements = Array.from(state.settlements.values());
    
    // Check no settlement unassigned
    expect(settlements.every(s => s.assignedBrigade)).toBe(true);
    
    // Check no overlap
    const assignments = new Map<SettlementId, BrigadeId>();
    for (const settlement of settlements) {
      expect(assignments.has(settlement.id)).toBe(false);
      assignments.set(settlement.id, settlement.assignedBrigade);
    }
  });
  
  test('exhaustion is monotonic', () => {
    let state = createTestState();
    const initialExhaustion = state.exhaustion.total;
    
    // Run several turns
    for (let i = 0; i < 10; i++) {
      state = turnResolver.resolve(state);
      expect(state.exhaustion.total).toBeGreaterThanOrEqual(
        initialExhaustion
      );
    }
  });
  
  test('peace stops all war processing', () => {
    const state = createPeaceState();
    const prePeace = JSON.stringify(state.fronts);
    
    const postPeace = turnResolver.resolve(state);
    
    // Fronts should not be recomputed
    expect(JSON.stringify(postPeace.fronts)).toBe(prePeace);
  });
});
```

### 10. **Determinism Tests**

```typescript
test('identical inputs produce identical outputs', () => {
  const state1 = createTestState();
  const state2 = createTestState();
  
  const result1 = turnResolver.resolve(state1);
  const result2 = turnResolver.resolve(state2);
  
  // Deep equality check
  expect(serializeState(result1)).toBe(serializeState(result2));
});

test('no timestamps in serialization', () => {
  const state = createTestState();
  const serialized = serializeState(state);
  
  // Should not contain Date objects or timestamps
  expect(serialized).not.toMatch(/\d{13}/); // Unix timestamps
  expect(serialized).not.toMatch(/Date/);
});
```

## Performance Considerations

### 11. **Spatial Indexing**

```typescript
class SpatialIndex {
  private settlementGraph: Map<SettlementId, Set<SettlementId>>;
  private brigadeAoRIndex: Map<BrigadeId, Set<SettlementId>>;
  
  rebuild(state: GameState): void {
    // Build adjacency index for O(1) neighbor lookup
    this.settlementGraph = this.buildAdjacency(state.settlements);
    
    // Build AoR index for O(1) brigade settlement lookup
    this.brigadeAoRIndex = this.buildAoRIndex(state);
  }
  
  getAdjacent(settlementId: SettlementId): Set<SettlementId> {
    return this.settlementGraph.get(settlementId) ?? new Set();
  }
  
  getBrigadeSettlements(brigadeId: BrigadeId): Set<SettlementId> {
    return this.brigadeAoRIndex.get(brigadeId) ?? new Set();
  }
}
```

### 12. **Memoization for Derived State**

```typescript
class MemoizedDerivations {
  private cache = new Map<string, any>();
  
  getFronts(state: GameState): Front[] {
    const key = this.getStateHash(state.brigades, state.settlements);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const fronts = this.computeFronts(state);
    this.cache.set(key, fronts);
    return fronts;
  }
  
  invalidate(): void {
    this.cache.clear();
  }
}
```

## Recommendations Summary

1. **Enforce immutability** - Use TypeScript `readonly` and immutable data structures
2. **Validate constantly** - Run invariant checks after every mutation
3. **Separate pure from impure** - Keep state updates pure, side effects isolated
4. **Test determinism** - Every test should be reproducible
5. **Document invariants** - Comments should reference the design doc sections
6. **Use TypeScript strictly** - `strict: true`, no `any` types
7. **Implement undo/redo** - Natural with immutable state
8. **Create debug tools** - Visualize AoRs, fronts, supply paths
9. **Version savefiles** - Include schema version for migrations
10. **Performance profile** - Your settlement graph will be large (6,141 nodes)

Would you like me to elaborate on any specific aspect, such as the front emergence algorithm, supply tracing implementation, or the treaty evaluation system?
---

**User**

Give me cursor prompt to implement all those changes. Make sure mistake log system and ledger systems are included and updated. Make sure it understands the reasons for changes.
---

**Assistant**

The user wants a comprehensive Cursor prompt that will guide an AI coding assistant to implement all the architectural improvements I suggested. This needs to be:

1. Comprehensive and well-structured
2. Include all the suggestions I made
3. Add mistake log and ledger systems (important for tracking changes and debugging)
4. Explain the "why" behind each change
5. Reference the game design documents
6. Be actionable for Cursor AI

I should create a detailed, multi-section prompt that:
- Starts with context about the project
- References the design documents
- Explains the core problems being solved
- Provides implementation guidance
- Includes the mistake log and ledger systems
- Maintains the invariants from the design docs
- Is structured so Cursor can work through it systematically

The prompt should be copy-pasteable and ready to use.# Comprehensive Cursor Implementation Prompt for AWWV Refactoring

```markdown
# CONTEXT: A War Without Victory - Strategic War Simulation

You are refactoring a complex strategic war game simulating the 1991-1995 Bosnia and Herzegovina conflict. This is a deterministic, turn-based simulation with strict invariants and no randomness.

## CRITICAL DESIGN PRINCIPLES (from Game Bible v0.2.5)

### Core Invariants (MUST NEVER VIOLATE):
1. **No unitless control** - Control requires formation presence
2. **One brigade per settlement** - Each settlement assigned to exactly one brigade AoR, no overlap, no gaps
3. **No settlement targeting** - Players command brigades via AoR reshaping, not individual settlements
4. **Exhaustion is monotonic** - Can only increase, never decrease
5. **Determinism** - No randomness, no timestamps in state, stable iteration ordering required
6. **Peace is terminal** - Accepted peace-triggering treaty ends war immediately, no further processing
7. **Derived state never serialized** - Fronts, corridors, municipality status computed each turn
8. **Authority ≠ Control** - These are separate variables that frequently diverge

### Why This Refactoring Matters:
- **Current Problem**: Code likely has scattered state management, weak invariant enforcement, potential non-determinism
- **Goal**: Create a robust, testable, maintainable system that enforces game rules automatically
- **Benefit**: Bugs become impossible rather than unlikely; game behavior becomes predictable and verifiable

## IMPLEMENTATION ROADMAP

### Phase 1: Core Architecture & State Management

#### 1.1 Create Strict Type System
**WHY**: TypeScript types prevent entire classes of bugs. The game has complex invariants that types can enforce.

**WHAT TO DO**:
```typescript
// src/types/core.ts

// Settlement must always have assignedBrigade (invariant enforcement)
export interface Settlement {
  readonly id: SettlementId;
  readonly name: string;
  readonly municipalityId: MunicipalityId;
  readonly coordinates: Coordinates;
  readonly population: Population;
  assignedBrigade: BrigadeId; // Mutable but NEVER null/undefined
  controllingFaction: FactionId;
  readonly adjacentSettlements: ReadonlySet<SettlementId>;
}

// Brigade AoR is derived, not stored independently
export interface Brigade {
  readonly id: BrigadeId;
  readonly factionId: FactionId;
  readonly name: string;
  manpower: number;
  cohesion: number; // 0-1
  posture: BrigadePosture;
  readiness: ReadinessState;
  exhaustionContribution: number;
  // AoR is computed from settlement.assignedBrigade, not stored here
}

// Exhaustion is append-only
export interface ExhaustionState {
  readonly total: number; // Monotonically increasing
  readonly military: number;
  readonly political: number;
  readonly societal: number;
  readonly history: ReadonlyArray<ExhaustionEvent>; // Immutable log
}

// Derived state is NEVER persisted
export interface DerivedState {
  fronts: ReadonlyArray<Front>;
  corridors: ReadonlyArray<Corridor>;
  municipalityStatus: ReadonlyMap<MunicipalityId, MunicipalityStatus>;
}

export interface GameState {
  readonly currentTurn: number;
  readonly phase: TurnPhase;
  readonly endState: EndState | null; // Once set, game stops
  
  // Core state (serialized)
  settlements: Map<SettlementId, Settlement>;
  municipalities: Map<MunicipalityId, Municipality>;
  brigades: Map<BrigadeId, Brigade>;
  factions: Map<FactionId, Faction>;
  exhaustion: ExhaustionState;
  
  // Derived state (recomputed each turn, NEVER serialized)
  derived?: DerivedState;
}
```

**LEDGER ENTRY PATTERN**:
```typescript
// Every state mutation gets logged
export interface StateChange {
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly timestamp: string; // For logging only, NOT for game logic
  readonly changeType: ChangeType;
  readonly details: unknown;
  readonly reason: string;
}

export interface StateLedger {
  readonly changes: ReadonlyArray<StateChange>;
  readonly checkpoints: ReadonlyMap<number, GameState>; // Per-turn snapshots
}
```

#### 1.2 Create Invariant Validation System
**WHY**: Invariants must be enforced automatically. Manual checking leads to bugs.

**WHAT TO DO**:
```typescript
// src/core/validators/InvariantValidator.ts

export interface Violation {
  readonly type: ViolationType;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly location: string; // Where violation occurred
  readonly autoFixable: boolean;
}

export class InvariantValidator {
  private mistakeLog: MistakeLog;
  
  constructor(mistakeLog: MistakeLog) {
    this.mistakeLog = mistakeLog;
  }
  
  /**
   * WHY: Game Bible requires all invariants checked after every state change
   * WHAT: Validates all invariants, logs violations, auto-corrects if possible
   */
  validateAndCorrect(state: GameState): GameState {
    const violations: Violation[] = [];
    
    // INVARIANT: Every settlement assigned to exactly one brigade
    this.validateSettlementAssignment(state, violations);
    
    // INVARIANT: AoRs must be contiguous
    this.validateAoRContiguity(state, violations);
    
    // INVARIANT: Exhaustion is monotonic
    this.validateExhaustionMonotonicity(state, violations);
    
    // INVARIANT: Authority cannot be Consolidated if supply Critical
    this.validateAuthoritySupplyCoherence(state, violations);
    
    // INVARIANT: No derived state in serialization
    this.validateNoDerivedStateSerialized(state, violations);
    
    // INVARIANT: Peace stops all war processing
    if (state.endState) {
      this.validateNoWarProcessingAfterPeace(state, violations);
    }
    
    // Log all violations
    for (const violation of violations) {
      this.mistakeLog.record({
        type: 'invariant_violation',
        violation,
        state: this.serializeStateSnapshot(state),
        timestamp: new Date().toISOString()
      });
    }
    
    // Auto-correct fixable violations
    let correctedState = state;
    for (const violation of violations.filter(v => v.autoFixable)) {
      correctedState = this.applyCorrection(correctedState, violation);
      
      this.mistakeLog.record({
        type: 'auto_correction',
        violation,
        correction: 'Applied automatic fix',
        timestamp: new Date().toISOString()
      });
    }
    
    // If non-fixable violations remain, throw
    const fatal = violations.filter(v => !v.autoFixable && v.severity === 'error');
    if (fatal.length > 0) {
      throw new InvariantViolationError(fatal);
    }
    
    return correctedState;
  }
  
  /**
   * WHY: Settlement assignment is foundational - violation breaks entire system
   */
  private validateSettlementAssignment(state: GameState, violations: Violation[]): void {
    const assignmentCounts = new Map<SettlementId, number>();
    
    // Count assignments
    for (const settlement of state.settlements.values()) {
      if (!settlement.assignedBrigade) {
        violations.push({
          type: 'unassigned_settlement',
          severity: 'error',
          message: `Settlement ${settlement.id} has no assigned brigade`,
          location: `Settlement[${settlement.id}]`,
          autoFixable: true // Can assign to nearest brigade
        });
      }
      
      const count = assignmentCounts.get(settlement.id) || 0;
      assignmentCounts.set(settlement.id, count + 1);
    }
    
    // Check for duplicates
    for (const [settlementId, count] of assignmentCounts) {
      if (count > 1) {
        violations.push({
          type: 'duplicate_settlement_assignment',
          severity: 'error',
          message: `Settlement ${settlementId} assigned ${count} times`,
          location: `Settlement[${settlementId}]`,
          autoFixable: false // Ambiguous which to keep
        });
      }
    }
  }
  
  /**
   * WHY: Game Bible explicitly requires exhaustion be irreversible
   */
  private validateExhaustionMonotonicity(state: GameState, violations: Violation[]): void {
    // Check against previous turn if available
    const previousCheckpoint = this.mistakeLog.getLastCheckpoint();
    if (previousCheckpoint) {
      if (state.exhaustion.total < previousCheckpoint.exhaustion.total) {
        violations.push({
          type: 'exhaustion_decreased',
          severity: 'error',
          message: `Exhaustion decreased from ${previousCheckpoint.exhaustion.total} to ${state.exhaustion.total}`,
          location: 'exhaustion.total',
          autoFixable: true // Restore previous value
        });
      }
    }
  }
}
```

#### 1.3 Create Mistake Log System
**WHY**: Track all errors, corrections, and anomalies for debugging and analysis.

**WHAT TO DO**:
```typescript
// src/core/logging/MistakeLog.ts

export interface MistakeEntry {
  readonly id: string; // Deterministic: `turn-${turn}-${sequenceNumber}`
  readonly turn: number;
  readonly type: MistakeType;
  readonly severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  readonly category: MistakeCategory;
  readonly message: string;
  readonly context: MistakeContext;
  readonly timestamp: string; // ISO string, for logging only
  readonly stackTrace?: string;
}

export type MistakeType =
  | 'invariant_violation'
  | 'auto_correction'
  | 'unexpected_state'
  | 'performance_warning'
  | 'data_inconsistency';

export type MistakeCategory =
  | 'spatial'
  | 'military'
  | 'supply'
  | 'authority'
  | 'exhaustion'
  | 'treaty'
  | 'validation';

export interface MistakeContext {
  readonly affectedEntities: string[];
  readonly stateSnapshot?: Partial<GameState>;
  readonly expectedValue?: unknown;
  readonly actualValue?: unknown;
  readonly autoFixed: boolean;
}

export class MistakeLog {
  private entries: MistakeEntry[] = [];
  private sequenceNumber = 0;
  private checkpoints = new Map<number, GameState>();
  
  /**
   * WHY: Centralized error tracking allows pattern analysis and debugging
   */
  record(params: Omit<MistakeEntry, 'id' | 'timestamp'>): void {
    const entry: MistakeEntry = {
      ...params,
      id: `turn-${params.turn}-${this.sequenceNumber++}`,
      timestamp: new Date().toISOString()
    };
    
    this.entries.push(entry);
    
    // Log to console in dev
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[MISTAKE LOG] ${entry.severity.toUpperCase()}: ${entry.message}`, entry);
    }
    
    // In production, could send to analytics
  }
  
  checkpoint(turn: number, state: GameState): void {
    this.checkpoints.set(turn, this.cloneState(state));
  }
  
  getLastCheckpoint(): GameState | null {
    const turns = Array.from(this.checkpoints.keys()).sort((a, b) => b - a);
    return turns.length > 0 ? this.checkpoints.get(turns[0])! : null;
  }
  
  /**
   * WHY: Pattern detection helps identify systemic issues
   */
  getPatterns(): MistakePattern[] {
    // Group by type and category
    const patterns = new Map<string, MistakeEntry[]>();
    
    for (const entry of this.entries) {
      const key = `${entry.type}-${entry.category}`;
      const group = patterns.get(key) || [];
      group.push(entry);
      patterns.set(key, group);
    }
    
    return Array.from(patterns.entries())
      .filter(([_, entries]) => entries.length >= 3) // Pattern = 3+ occurrences
      .map(([key, entries]) => ({
        pattern: key,
        count: entries.length,
        firstOccurrence: entries[0].turn,
        lastOccurrence: entries[entries.length - 1].turn,
        entries
      }));
  }
  
  export(): string {
    return JSON.stringify({
      entries: this.entries,
      patterns: this.getPatterns(),
      summary: this.getSummary()
    }, null, 2);
  }
  
  private getSummary() {
    return {
      total: this.entries.length,
      bySeverity: this.groupBy(this.entries, e => e.severity),
      byCategory: this.groupBy(this.entries, e => e.category),
      autoFixedCount: this.entries.filter(e => e.context.autoFixed).length
    };
  }
}
```

#### 1.4 Create State Ledger System
**WHY**: Complete audit trail of all state changes for replay, debugging, and verification.

**WHAT TO DO**:
```typescript
// src/core/ledger/StateLedger.ts

export interface LedgerEntry {
  readonly id: string; // `${turn}-${phase}-${sequence}`
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly operation: Operation;
  readonly timestamp: string; // For logging only
  readonly beforeState: StateSnapshot;
  readonly afterState: StateSnapshot;
  readonly reason: string;
  readonly metadata: Record<string, unknown>;
}

export interface Operation {
  readonly type: OperationType;
  readonly target: string; // Entity ID
  readonly action: string;
  readonly params: Record<string, unknown>;
}

export type OperationType =
  | 'brigade_aor_reshape'
  | 'posture_change'
  | 'authority_update'
  | 'supply_trace'
  | 'exhaustion_increment'
  | 'treaty_evaluation'
  | 'front_emergence';

export interface StateSnapshot {
  readonly settlements: Record<SettlementId, Partial<Settlement>>;
  readonly brigades: Record<BrigadeId, Partial<Brigade>>;
  readonly exhaustion: Partial<ExhaustionState>;
  // Only capture changed entities, not entire state
}

export class StateLedger {
  private entries: LedgerEntry[] = [];
  private sequenceNumber = 0;
  
  /**
   * WHY: Every state mutation must be traceable to understand how we got here
   */
  recordChange(params: {
    turn: number;
    phase: TurnPhase;
    operation: Operation;
    before: GameState;
    after: GameState;
    reason: string;
    metadata?: Record<string, unknown>;
  }): void {
    const entry: LedgerEntry = {
      id: `${params.turn}-${params.phase}-${this.sequenceNumber++}`,
      turn: params.turn,
      phase: params.phase,
      operation: params.operation,
      timestamp: new Date().toISOString(),
      beforeState: this.extractDiff(params.before, params.after, 'before'),
      afterState: this.extractDiff(params.before, params.after, 'after'),
      reason: params.reason,
      metadata: params.metadata || {}
    };
    
    this.entries.push(entry);
  }
  
  /**
   * WHY: Deterministic replay enables bug reproduction and testing
   */
  replay(fromTurn: number = 0, toTurn?: number): GameState {
    const entries = this.entries.filter(e => {
      if (e.turn < fromTurn) return false;
      if (toTurn !== undefined && e.turn > toTurn) return false;
      return true;
    });
    
    let state = this.getInitialState();
    
    for (const entry of entries) {
      state = this.applyOperation(state, entry.operation);
    }
    
    return state;
  }
  
  /**
   * WHY: Diff extraction keeps ledger size manageable (only changes, not full state)
   */
  private extractDiff(
    before: GameState,
    after: GameState,
    which: 'before' | 'after'
  ): StateSnapshot {
    const snapshot: StateSnapshot = {
      settlements: {},
      brigades: {},
      exhaustion: {}
    };
    
    // Only include entities that changed
    for (const [id, settlement] of after.settlements) {
      const beforeSettlement = before.settlements.get(id);
      if (!beforeSettlement || !this.deepEqual(beforeSettlement, settlement)) {
        snapshot.settlements[id] = which === 'before' 
          ? this.toPartial(beforeSettlement)
          : this.toPartial(settlement);
      }
    }
    
    // Similar for brigades, exhaustion, etc.
    
    return snapshot;
  }
  
  /**
   * WHY: Ledger must be exportable for external analysis
   */
  export(): string {
    return JSON.stringify({
      entries: this.entries,
      stats: this.getStats(),
      timeline: this.getTimeline()
    }, null, 2);
  }
  
  private getStats() {
    return {
      totalEntries: this.entries.length,
      byPhase: this.groupBy(this.entries, e => e.phase),
      byOperation: this.groupBy(this.entries, e => e.operation.type),
      turnRange: {
        first: this.entries[0]?.turn || 0,
        last: this.entries[this.entries.length - 1]?.turn || 0
      }
    };
  }
  
  private getTimeline(): TimelineEntry[] {
    // Group entries by turn for visualization
    const byTurn = new Map<number, LedgerEntry[]>();
    
    for (const entry of this.entries) {
      const group = byTurn.get(entry.turn) || [];
      group.push(entry);
      byTurn.set(entry.turn, group);
    }
    
    return Array.from(byTurn.entries()).map(([turn, entries]) => ({
      turn,
      entryCount: entries.length,
      operations: entries.map(e => e.operation.type)
    }));
  }
}
```

### Phase 2: Turn Resolution System

#### 2.1 Implement Turn Pipeline
**WHY**: Fixed phase order ensures determinism and causality traceability.

**WHAT TO DO**:
```typescript
// src/turn/TurnResolver.ts

export class TurnResolver {
  constructor(
    private validator: InvariantValidator,
    private derivedComputer: DerivedStateComputer,
    private ledger: StateLedger,
    private mistakeLog: MistakeLog
  ) {}
  
  /**
   * WHY: Game Bible requires fixed phase order for determinism
   * WHAT: Executes all phases in sequence, validates after each
   */
  resolve(state: GameState): GameState {
    // CRITICAL: Peace is terminal - no processing after peace
    if (state.endState !== null) {
      this.mistakeLog.record({
        turn: state.currentTurn,
        type: 'unexpected_state',
        severity: 'warning',
        category: 'validation',
        message: 'Attempted to resolve turn after peace achieved',
        context: {
          affectedEntities: [],
          autoFixed: false
        }
      });
      return state;
    }
    
    let nextState = { ...state, currentTurn: state.currentTurn + 1 };
    
    // Checkpoint before turn
    this.mistakeLog.checkpoint(nextState.currentTurn, nextState);
    
    // Execute phases in fixed order
    nextState = this.executePhase(nextState, 'directive', this.directivePhase.bind(this));
    nextState = this.executePhase(nextState, 'deployment', this.deploymentPhase.bind(this));
    nextState = this.executePhase(nextState, 'military', this.militaryPhase.bind(this));
    nextState = this.executePhase(nextState, 'fragmentation', this.fragmentationPhase.bind(this));
    nextState = this.executePhase(nextState, 'supply', this.supplyPhase.bind(this));
    nextState = this.executePhase(nextState, 'political', this.politicalPhase.bind(this));
    nextState = this.executePhase(nextState, 'exhaustion', this.exhaustionPhase.bind(this));
    nextState = this.executePhase(nextState, 'persistence', this.persistencePhase.bind(this));
    
    // Recompute derived state
    nextState.derived = this.derivedComputer.compute(nextState);
    
    // Final validation
    nextState = this.validator.validateAndCorrect(nextState);
    
    return nextState;
  }
  
  private executePhase(
    state: GameState,
    phase: TurnPhase,
    phaseFunction: (state: GameState) => GameState
  ): GameState {
    const before = state;
    const after = phaseFunction({ ...state, phase });
    
    // Log phase execution
    this.ledger.recordChange({
      turn: state.currentTurn,
      phase,
      operation: {
        type: 'phase_execution' as OperationType,
        target: 'global',
        action: `execute_${phase}`,
        params: {}
      },
      before,
      after,
      reason: `Executing ${phase} phase`
    });
    
    // Validate after each phase
    return this.validator.validateAndCorrect(after);
  }
  
  private militaryPhase(state: GameState): GameState {
    // Process all combat interactions
    // This is where fronts generate pressure
    return state;
  }
  
  private exhaustionPhase(state: GameState): GameState {
    // CRITICAL: Exhaustion only increases
    const newExhaustion = this.computeExhaustionIncrement(state);
    
    return {
      ...state,
      exhaustion: {
        total: state.exhaustion.total + newExhaustion.total,
        military: state.exhaustion.military + newExhaustion.military,
        political: state.exhaustion.political + newExhaustion.political,
        societal: state.exhaustion.societal + newExhaustion.societal,
        history: [
          ...state.exhaustion.history,
          {
            turn: state.currentTurn,
            increment: newExhaustion,
            sources: this.identifyExhaustionSources(state)
          }
        ]
      }
    };
  }
}
```

### Phase 3: AoR Management System

#### 3.1 Implement AoR Manager
**WHY**: AoR reshaping is the primary player control mechanism. Must enforce contiguity and assignment invariants.

**WHAT TO DO**:
```typescript
// src/systems/military/AoRManager.ts

export class AoRManager {
  constructor(
    private spatialIndex: SpatialIndex,
    private ledger: StateLedger,
    private mistakeLog: MistakeLog
  ) {}
  
  /**
   * WHY: Game Bible: "Each settlement is assigned to exactly one brigade's AoR"
   * WHAT: Validates and executes AoR reshape with costs
   */
  reshapeAoR(
    state: GameState,
    transfers: SettlementTransfer[]
  ): GameState {
    // Validate all transfers maintain invariants
    for (const transfer of transfers) {
      this.validateTransfer(state, transfer);
    }
    
    let updatedState = state;
    
    for (const transfer of transfers) {
      const before = updatedState;
      
      // Apply transfer
      updatedState = this.applyTransfer(updatedState, transfer);
      
      // Apply costs (cohesion loss, exhaustion)
      updatedState = this.applyCosts(updatedState, transfer);
      
      // Log the change
      this.ledger.recordChange({
        turn: state.currentTurn,
        phase: state.phase,
        operation: {
          type: 'brigade_aor_reshape',
          target: transfer.settlementId,
          action: 'transfer',
          params: {
            from: transfer.fromBrigadeId,
            to: transfer.toBrigadeId
          }
        },
        before,
        after: updatedState,
        reason: `Player-directed AoR reshape: transfer ${transfer.settlementId}`,
        metadata: {
          cohesionLoss: transfer.cohesionLoss,
          exhaustionCost: transfer.exhaustionCost
        }
      });
    }
    
    return updatedState;
  }
  
  private validateTransfer(state: GameState, transfer: SettlementTransfer): void {
    const settlement = state.settlements.get(transfer.settlementId);
    if (!settlement) {
      throw new Error(`Settlement ${transfer.settlementId} not found`);
    }
    
    // Check brigades exist
    if (!state.brigades.has(transfer.toBrigadeId)) {
      throw new Error(`Target brigade ${transfer.toBrigadeId} not found`);
    }
    
    // Check brigades are adjacent (at least one shared settlement boundary)
    if (!this.areBrigadesAdjacent(state, settlement.assignedBrigade, transfer.toBrigadeId)) {
      throw new Error(`Brigades not adjacent - transfer would create non-contiguous AoR`);
    }
    
    // Check transfer maintains contiguity for both brigades
    if (!this.maintainsContiguity(state, transfer)) {
      this.mistakeLog.record({
        turn: state.currentTurn,
        type: 'data_inconsistency',
        severity: 'error',
        category: 'spatial',
        message: `Transfer would break AoR contiguity`,
        context: {
          affectedEntities: [transfer.settlementId, transfer.fromBrigadeId, transfer.toBrigadeId],
          autoFixed: false
        }
      });
      throw new Error(`Transfer would break AoR contiguity`);
    }
  }
  
  /**
   * WHY: AoRs must be contiguous clusters, not scattered settlements
   */
  private maintainsContiguity(state: GameState, transfer: SettlementTransfer): boolean {
    // Simulate transfer
    const testState = this.simulateTransfer(state, transfer);
    
    // Check source brigade still contiguous
    const sourceAoR = this.computeAoR(testState, transfer.fromBrigadeId);
    if (!this.isContiguous(testState, sourceAoR)) {
      return false;
    }
    
    // Check target brigade still contiguous
    const targetAoR = this.computeAoR(testState, transfer.toBrigadeId);
    if (!this.isContiguous(testState, targetAoR)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * WHY: Game Bible: AoR changes generate cohesion loss and exhaustion
   */
  private applyCosts(state: GameState, transfer: SettlementTransfer): GameState {
    const sourceBrigade = state.brigades.get(transfer.fromBrigadeId)!;
    const targetBrigade = state.brigades.get(transfer.toBrigadeId)!;
    
    // Shrinking AoR = less cohesion loss (concentrating force)
    // Expanding AoR = more cohesion loss (stretching force)
    const targetCohesionLoss = 0.05; // Expanding is harder
    const sourceCohesionLoss = 0.02; // Shrinking is easier
    
    return {
      ...state,
      brigades: new Map(state.brigades).set(transfer.fromBrigadeId, {
        ...sourceBrigade,
        cohesion: Math.max(0, sourceBrigade.cohesion - sourceCohesionLoss)
      }).set(transfer.toBrigadeId, {
        ...targetBrigade,
        cohesion: Math.max(0, targetBrigade.cohesion - targetCohesionLoss)
      })
    };
  }
  
  /**
   * WHY: AoR is derived from settlement assignments, not stored
   */
  computeAoR(state: GameState, brigadeId: BrigadeId): Set<SettlementId> {
    const aor = new Set<SettlementId>();
    
    for (const [id, settlement] of state.settlements) {
      if (settlement.assignedBrigade === brigadeId) {
        aor.add(id);
      }
    }
    
    return aor;
  }
}
```

### Phase 4: Derived State Computation

#### 4.1 Implement Derived State Computer
**WHY**: Fronts, corridors, municipality status are emergent from base state, never stored.

**WHAT TO DO**:
```typescript
// src/core/derivations/DerivedStateComputer.ts

export class DerivedStateComputer {
  constructor(
    private spatialIndex: SpatialIndex,
    private mistakeLog: MistakeLog
  ) {}
  
  /**
   * WHY: Game Bible: "Derived states must be recomputed each turn"
   * WHAT: Computes all emergent state from base state
   */
  compute(state: GameState): DerivedState {
    // CRITICAL: Use stable ordering for determinism
    const sortedBrigades = this.getSortedBrigades(state);
    const sortedSettlements = this.getSortedSettlements(state);
    
    return {
      fronts: this.computeFronts(state, sortedBrigades),
      corridors: this.computeCorridors(state, sortedSettlements),
      municipalityStatus: this.computeMunicipalityStatus(state)
    };
  }
  
  /**
   * WHY: Game Bible: "Fronts emerge where opposing brigades' AoRs meet"
   * WHAT: Identifies front lines from AoR adjacency
   */
  private computeFronts(state: GameState, brigades: Brigade[]): Front[] {
    const fronts: Front[] = [];
    const processedPairs = new Set<string>();
    
    for (const brigade of brigades) {
      const aor = this.getAoR(state, brigade.id);
      
      // Find adjacent enemy brigades
      for (const settlementId of aor) {
        const adjacent = this.spatialIndex.getAdjacent(settlementId);
        
        for (const adjId of adjacent) {
          const adjSettlement = state.settlements.get(adjId)!;
          const adjBrigade = state.brigades.get(adjSettlement.assignedBrigade)!;
          
          // Check if opposing factions
          if (adjBrigade.factionId !== brigade.factionId) {
            const pairKey = this.makePairKey(brigade.id, adjBrigade.id);
            
            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey);
              
              // Create front object
              fronts.push(this.createFront(state, brigade, adjBrigade));
            }
          }
        }
      }
    }
    
    return fronts;
  }
  
  /**
   * WHY: Game Bible: "Corridors are Open, Brittle, or Cut based on dependency, capacity, redundancy"
   */
  private computeCorridors(state: GameState, settlements: Settlement[]): Corridor[] {
    const corridors: Corridor[] = [];
    
    for (const faction of state.factions.values()) {
      // Find critical supply paths for this faction
      const paths = this.identifyCriticalPaths(state, faction);
      
      for (const path of paths) {
        const corridorState = this.evaluateCorridorState(state, path, faction);
        
        corridors.push({
          id: this.makeCorridorId(path),
          factionId: faction.id,
          path,
          state: corridorState,
          dependency: this.computeDependency(state, path),
          capacity: this.computeCapacity(state, path),
          redundancy: this.computeRedundancy(state, path)
        });
      }
    }
    
    return corridors;
  }
  
  /**
   * WHY: Determinism requires stable ordering
   */
  private getSortedBrigades(state: GameState): Brigade[] {
    return Array.from(state.brigades.values())
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  
  private getSortedSettlements(state: GameState): Settlement[] {
    return Array.from(state.settlements.values())
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
```

### Phase 5: Testing Infrastructure

#### 5.1 Create Invariant Tests
**WHY**: Invariants are the contract. Breaking them breaks the game.

**WHAT TO DO**:
```typescript
// src/core/__tests__/invariants.test.ts

describe('Game Invariants', () => {
  let validator: InvariantValidator;
  let mistakeLog: MistakeLog;
  
  beforeEach(() => {
    mistakeLog = new MistakeLog();
    validator = new InvariantValidator(mistakeLog);
  });
  
  describe('Settlement Assignment Invariant', () => {
    test('every settlement must be assigned to exactly one brigade', () => {
      const state = createTestState({
        settlements: 100,
        brigades: 10
      });
      
      const settlements = Array.from(state.settlements.values());
      
      // Check no unassigned
      expect(settlements.every(s => s.assignedBrigade !== null)).toBe(true);
      
      // Check no duplicates
      const assignments = new Map<SettlementId, BrigadeId>();
      for (const settlement of settlements) {
        expect(assignments.has(settlement.id)).toBe(false);
        assignments.set(settlement.id, settlement.assignedBrigade);
      }
      
      // Check exactly one assignment per settlement
      expect(assignments.size).toBe(settlements.length);
    });
    
    test('auto-corrects unassigned settlements', () => {
      const state = createCorruptedState({
        unassignedSettlements: ['settlement-1', 'settlement-2']
      });
      
      const corrected = validator.validateAndCorrect(state);
      
      // Should auto-assign to nearest brigade
      expect(corrected.settlements.get('settlement-1')!.assignedBrigade).toBeTruthy();
      expect(corrected.settlements.get('settlement-2')!.assignedBrigade).toBeTruthy();
      
      // Should log the correction
      const mistakes = mistakeLog.getEntries();
      expect(mistakes.some(m => m.type === 'auto_correction')).toBe(true);
    });
  });
  
  describe('Exhaustion Monotonicity Invariant', () => {
    test('exhaustion never decreases', () => {
      let state = createTestState();
      const resolver = new TurnResolver(validator, derivedComputer, ledger, mistakeLog);
      
      const exhaustionHistory: number[] = [state.exhaustion.total];
      
      // Run 20 turns
      for (let i = 0; i < 20; i++) {
        state = resolver.resolve(state);
        exhaustionHistory.push(state.exhaustion.total);
      }
      
      // Check monotonicity
      for (let i = 1; i < exhaustionHistory.length; i++) {
        expect(exhaustionHistory[i]).toBeGreaterThanOrEqual(exhaustionHistory[i - 1]);
      }
    });
    
    test('throws if exhaustion manually decreased', () => {
      const state = createTestState();
      
      // Corrupt state
      const corrupted = {
        ...state,
        exhaustion: {
          ...state.exhaustion,
          total: state.exhaustion.total - 10 // ILLEGAL
        }
      };
      
      expect(() => validator.validateAndCorrect(corrupted)).toThrow(InvariantViolationError);
    });
  });
  
  describe('Peace Terminal Invariant', () => {
    test('no war processing after peace', () => {
      const peacefulState = createTestState({
        endState: {
          type: 'negotiated_peace',
          treatyId: 'treaty-1',
          territorialOutcome: {}
        }
      });
      
      const resolver = new TurnResolver(validator, derivedComputer, ledger, mistakeLog);
      const nextState = resolver.resolve(peacefulState);
      
      // State should be unchanged
      expect(nextState).toEqual(peacefulState);
      
      // Should log warning
      const mistakes = mistakeLog.getEntries();
      expect(mistakes.some(m => 
        m.type === 'unexpected_state' && 
        m.message.includes('peace achieved')
      )).toBe(true);
    });
  });
  
  describe('Determinism Invariant', () => {
    test('identical inputs produce identical outputs', () => {
      const state1 = createTestState({ seed: 42 });
      const state2 = createTestState({ seed: 42 });
      
      const resolver = new TurnResolver(validator, derivedComputer, ledger, mistakeLog);
      
      const result1 = resolver.resolve(state1);
      const result2 = resolver.resolve(state2);
      
      expect(serializeState(result1)).toEqual(serializeState(result2));
    });
    
    test('no timestamps in serialized state', () => {
      const state = createTestState();
      const serialized = serializeState(state);
      
      // Should not contain timestamps (except in logs which aren't serialized)
      expect(serialized).not.toMatch(/\d{13}/); // Unix ms
      expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO dates
    });
  });
});
```

## IMPLEMENTATION CHECKLIST

Use this as you work through the refactoring:

### Core Architecture
- [ ] Create strict TypeScript types (settlement, brigade, exhaustion, etc.)
- [ ] Implement InvariantValidator with all 8+ invariants
- [ ] Create MistakeLog system with pattern detection
- [ ] Create StateLedger with replay capability
- [ ] Separate GameState from DerivedState
- [ ] Ensure no derived state in serialization

### Turn System
- [ ] Implement TurnResolver with fixed phase order
- [ ] Add phase execution wrapper with validation
- [ ] Implement all 8 phases (directive through persistence)
- [ ] Add peace-terminal check at resolver entry
- [ ] Create checkpoint system per turn

### Spatial System
- [ ] Implement AoRManager with contiguity validation
- [ ] Create SettlementTransfer validation
- [ ] Add AoR reshaping with costs (cohesion, exhaustion)
- [ ] Build SpatialIndex for O(1) adjacency lookups
- [ ] Ensure computeAoR derives from assignments only

### Derived State
- [ ] Implement DerivedStateComputer
- [ ] Create front emergence algorithm from AoR adjacency
- [ ] Create corridor evaluation (Open/Brittle/Cut)
- [ ] Add municipality status computation
- [ ] Ensure stable sorting for determinism

### Treaty System
- [ ] Implement TreatyProcessor with Brčko check
- [ ] Add competence bundle validation
- [ ] Create deterministic acceptance scoring
- [ ] Add peace-trigger detection
- [ ] Implement end-state computation

### Supply System
- [ ] Create SupplyTracer with pathfinding
- [ ] Implement corridor state evaluation
- [ ] Add supply state derivation (Adequate/Strained/Critical)
- [ ] Link supply state to authority validation

### Testing
- [ ] Write invariant validation tests
- [ ] Create determinism tests
- [ ] Add ledger replay tests
- [ ] Test mistake log pattern detection
- [ ] Create performance benchmarks

### Documentation
- [ ] Add inline comments referencing Game Bible sections
- [ ] Document all invariants in code
- [ ] Create migration guide from old structure
- [ ] Write debugging guide using ledger and mistake log

## COMMON PITFALLS TO AVOID

1. **Don't store derived state** - Fronts, corridors, municipality status must be computed
2. **Don't use Map.entries() without sorting** - Breaks determinism
3. **Don't skip validation after mutations** - Run validator after EVERY change
4. **Don't allow exhaustion to decrease** - Not even for "balance"
5. **Don't process turns after peace** - Check endState first
6. **Don't assign settlements to multiple brigades** - Validate before assignment
7. **Don't use Date.now() in game logic** - Only in logs
8. **Don't throw on auto-fixable violations** - Fix and log instead

## SUCCESS CRITERIA

You've succeeded when:
1. All invariant tests pass
2. Determinism tests show identical replays
3. Ledger can reconstruct any past state
4. Mistake log identifies violation patterns
5. No derived state in save files
6. Turn resolution has fixed phase order
7. Peace immediately stops all processing
8. AoR reshaping enforces contiguity
9. Supply traces through corridors correctly
10. Treaty evaluation is deterministic

## NEXT STEPS AFTER IMPLEMENTATION

1. Run full test suite
2. Generate mistake log report for existing games
3. Use ledger to replay problematic turns
4. Profile performance with 6,141 settlements
5. Create debug UI showing AoRs and fronts
6. Export ledger for external analysis tools
7. Document patterns found in mistake log
8. Optimize hot paths identified in profiling

---

Remember: The goal is **correctness first, performance second**. These systems make bugs impossible rather than unlikely. Take your time, validate constantly, and trust the invariants.
```

---

This prompt is ready to paste into Cursor. It provides:

1. **Complete context** from your game design documents
2. **Detailed implementation guidance** with code examples
3. **Built-in mistake logging and ledger systems**
4. **Clear explanations of WHY each change matters**
5. **Concrete success criteria**
6. **Common pitfalls to avoid**
7. **Testing strategy**
8. **Checklist for tracking progress**

The AI will understand not just WHAT to implement, but WHY it's critical for your game's deterministic simulation requirements.
