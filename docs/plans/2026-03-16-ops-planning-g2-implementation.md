# Ops Planning G-2 Live Briefing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded G-2 forecast panel with live engine predictions, commander personality-driven assessment documents, and faction identity — making the ops planning screen feel like a real Bosnian war HQ staff meeting.

**Architecture:** New read-only IPC query (`query-operation-prediction`) sends plan state to backend, which runs `predictCombatOutcome()` per axis and generates personality-filtered assessment text. Frontend consumes response via debounced calls, rendering a two-texture UI: dark glassmorphic data panels + paper-styled military assessment document with faction crest and classification markings.

**Tech Stack:** TypeScript, React, Zustand, MapLibre GL, Electron IPC, Vitest

**Design doc:** `docs/plans/2026-03-16-ops-planning-redesign-g2-live-briefing.md`

---

## Phase 1: Backend Prediction Engine + IPC

### Task 1: Define prediction types

**Files:**
- Create: `src/sim/combat/operation_prediction.ts`

**Step 1: Create the types file with request/response interfaces**

```typescript
// src/sim/combat/operation_prediction.ts
import type { FactionId, FormationId } from '../../state/game_state';

export interface OperationPredictionRequest {
  corpsId: string;
  axes: Array<{
    axisId: string;
    brigadeIds: string[];
    objectiveOsids: string[];
    stagingOsid?: string;
  }>;
  tempo: 'methodical' | 'standard' | 'all_out';
  artilleryPreparation: boolean;
  commanderOfficerId?: string;
}

export type PredictedOutcome =
  | 'decisive_victory' | 'victory' | 'costly_victory'
  | 'stalemate' | 'repulsed' | 'catastrophic';

export type TerrainType = 'mountain' | 'urban' | 'open' | 'forest';
export type EntrenchmentLevel = 'light' | 'moderate' | 'heavy' | 'unknown';

export interface AxisPrediction {
  axisId: string;
  predictedOutcome: PredictedOutcome;
  forceRatio: number;
  estimatedCasualties: number;
  terrain: TerrainType;
  entrenchment: EntrenchmentLevel;
  intelConfidence: number;
  supplyReadiness: number;
}

export interface CommanderAssessmentText {
  recommendation: 'launch' | 'delay' | 'abort';
  sections: {
    enemy: string;
    ownForces: string;
    assessment: string;
  };
  preparationWeeks: number;
  requiredForceRatio: number;
  requiredIntelConfidence: number;
}

export interface OperationPredictionResponse {
  overall: {
    forceRatio: number;
    intelConfidence: number;
    supplyReadiness: number;
    totalEstimatedCasualties: number;
    preparationWeeks: number;
  };
  axes: AxisPrediction[];
  commanderAssessment: CommanderAssessmentText;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/sim/combat/operation_prediction.ts`
Expected: no errors

**Step 3: Commit**

```bash
git add src/sim/combat/operation_prediction.ts
git commit -m "feat(ops-planning): define OperationPredictionRequest/Response types"
```

---

### Task 2: Implement per-axis combat prediction

**Files:**
- Modify: `src/sim/combat/operation_prediction.ts`
- Reference: `src/sim/combat/combat_predictor.ts` (predictCombatOutcome signature)
- Reference: `src/sim/combat/sector_intel.ts` (getSectorIntelConfidence)

**Step 1: Write the failing test**

Create: `tests/operation_prediction.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { predictAxisOutcome } from '../src/sim/combat/operation_prediction';

describe('predictAxisOutcome', () => {
  it('returns null when no brigades assigned', () => {
    const result = predictAxisOutcome(
      {} as any, // state
      { axisId: 'a1', brigadeIds: [], objectiveOsids: ['op:foo:bar'], stagingOsid: undefined },
      {} as any, // adjacency
      {} as any, // reverseMap
      {}          // terrainCache
    );
    expect(result).toBeNull();
  });

  it('returns null when no objectives', () => {
    const result = predictAxisOutcome(
      {} as any,
      { axisId: 'a1', brigadeIds: ['b1'], objectiveOsids: [], stagingOsid: undefined },
      {} as any,
      {} as any,
      {}
    );
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/operation_prediction.test.ts`
Expected: FAIL — `predictAxisOutcome` not exported

**Step 3: Implement predictAxisOutcome**

Add to `src/sim/combat/operation_prediction.ts`:

```typescript
import type { GameState } from '../../state/game_state';
import { predictCombatOutcome } from './combat_predictor';
import type { AxisPrediction, PredictedOutcome, TerrainType, EntrenchmentLevel } from './operation_prediction';

/**
 * Predict combat outcome for a single axis against its first objective.
 * Returns null if axis has no brigades or no objectives.
 */
export function predictAxisOutcome(
  state: GameState,
  axis: { axisId: string; brigadeIds: string[]; objectiveOsids: string[]; stagingOsid?: string },
  adjacency: Record<string, string[]>,
  reverseMap: Record<string, string>,
  terrainCache: Record<string, number>,
  supplyStateByOsid?: Record<string, any>,
  osidPopulationMap?: Record<string, number>,
  slopeByOsid?: Record<string, number>,
  ethnicComposition?: Record<string, Record<string, number>>,
): AxisPrediction | null {
  if (axis.brigadeIds.length === 0 || axis.objectiveOsids.length === 0) return null;

  const targetOsid = axis.objectiveOsids[0];
  const primaryBrigade = axis.brigadeIds[0];
  const additionalAttackers = axis.brigadeIds.slice(1);

  const prediction = predictCombatOutcome(
    state, primaryBrigade, targetOsid,
    adjacency, reverseMap, terrainCache,
    'attack', // posture
    additionalAttackers,
    supplyStateByOsid,
    osidPopulationMap,
    slopeByOsid,
    ethnicComposition
  );

  if (!prediction) {
    return {
      axisId: axis.axisId,
      predictedOutcome: 'stalemate',
      forceRatio: 0,
      estimatedCasualties: 0,
      terrain: classifyTerrain(terrainCache[targetOsid] ?? 1.0),
      entrenchment: 'unknown',
      intelConfidence: 0,
      supplyReadiness: 0,
    };
  }

  return {
    axisId: axis.axisId,
    predictedOutcome: prediction.predicted_outcome as PredictedOutcome,
    forceRatio: prediction.power_ratio,
    estimatedCasualties: prediction.expected_attacker_casualties,
    terrain: classifyTerrain(prediction.defender_terrain_mult),
    entrenchment: classifyEntrenchment(prediction.defender_entrenchment),
    intelConfidence: 0, // filled by caller from sector_intel
    supplyReadiness: 0, // filled by caller from supply state
  };
}

function classifyTerrain(mult: number): TerrainType {
  if (mult >= 1.7) return 'mountain';
  if (mult >= 1.5) return 'urban';
  if (mult >= 1.2) return 'forest';
  return 'open';
}

function classifyEntrenchment(level: number): EntrenchmentLevel {
  if (level >= 0.15) return 'heavy';
  if (level >= 0.08) return 'moderate';
  if (level > 0) return 'light';
  return 'unknown';
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/operation_prediction.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sim/combat/operation_prediction.ts tests/operation_prediction.test.ts
git commit -m "feat(ops-planning): implement predictAxisOutcome with terrain/entrenchment classification"
```

---

### Task 3: Implement commander assessment text generation

**Files:**
- Modify: `src/sim/combat/operation_prediction.ts`
- Test: `tests/operation_prediction.test.ts`
- Reference: `src/sim/combat/operation_preparation.ts` (getPreparationMaxTurns, getRequiredForceRatio, getRequiredConfidence)

**Step 1: Write the failing test**

Add to `tests/operation_prediction.test.ts`:

```typescript
import { generateCommanderAssessment } from '../src/sim/combat/operation_prediction';

describe('generateCommanderAssessment', () => {
  it('aggressive competent commander recommends launch with good data', () => {
    const result = generateCommanderAssessment(
      { competence: 4, aggressiveness: 5 },
      { forceRatio: 2.0, intelConfidence: 0.8, supplyReadiness: 0.9, totalCasualties: 300 },
      [{ axisId: 'a1', predictedOutcome: 'victory', terrain: 'open', entrenchment: 'light',
         forceRatio: 2.0, estimatedCasualties: 300, intelConfidence: 0.8, supplyReadiness: 0.9 }]
    );
    expect(result.recommendation).toBe('launch');
    expect(result.sections.enemy).toContain('RELIABLE');
    expect(result.sections.assessment).toMatch(/LAUNCH|attack|immediate/i);
    expect(result.preparationWeeks).toBe(3); // 8 - 5 agg
  });

  it('cautious incompetent commander recommends abort with weak data', () => {
    const result = generateCommanderAssessment(
      { competence: 1, aggressiveness: 1 },
      { forceRatio: 0.8, intelConfidence: 0.2, supplyReadiness: 0.3, totalCasualties: 800 },
      [{ axisId: 'a1', predictedOutcome: 'repulsed', terrain: 'mountain', entrenchment: 'heavy',
         forceRatio: 0.8, estimatedCasualties: 800, intelConfidence: 0.2, supplyReadiness: 0.3 }]
    );
    expect(result.recommendation).toBe('abort');
  });

  it('moderate commander recommends delay with mixed data', () => {
    const result = generateCommanderAssessment(
      { competence: 3, aggressiveness: 3 },
      { forceRatio: 1.1, intelConfidence: 0.4, supplyReadiness: 0.6, totalCasualties: 500 },
      [{ axisId: 'a1', predictedOutcome: 'stalemate', terrain: 'forest', entrenchment: 'moderate',
         forceRatio: 1.1, estimatedCasualties: 500, intelConfidence: 0.4, supplyReadiness: 0.6 }]
    );
    expect(result.recommendation).toBe('delay');
  });
});
```

**Step 2: Run to verify failure**

Run: `npx vitest run tests/operation_prediction.test.ts`
Expected: FAIL — `generateCommanderAssessment` not exported

**Step 3: Implement assessment text generation**

Add to `src/sim/combat/operation_prediction.ts`:

```typescript
import { getPreparationMaxTurns, getRequiredForceRatio, getRequiredConfidence } from './operation_preparation';

interface CommanderProfile {
  competence: number;
  aggressiveness: number;
}

interface OverallMetrics {
  forceRatio: number;
  intelConfidence: number;
  supplyReadiness: number;
  totalCasualties: number;
}

const INTEL_LABELS: Array<[number, string]> = [
  [0.8, 'CONFIRMED'], [0.6, 'RELIABLE'], [0.4, 'PARTIAL'],
  [0.2, 'FRAGMENTARY'], [0, 'BLIND'],
];

const SUPPLY_LABELS: Array<[number, string]> = [
  [0.9, 'FULL'], [0.7, 'STRONG'], [0.5, 'ADEQUATE'],
  [0.3, 'STRAINED'], [0, 'CRITICAL'],
];

function labelFromThresholds(value: number, thresholds: Array<[number, string]>): string {
  for (const [threshold, label] of thresholds) {
    if (value >= threshold) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

export function generateCommanderAssessment(
  commander: CommanderProfile,
  overall: OverallMetrics,
  axes: AxisPrediction[],
): CommanderAssessmentText {
  const { competence, aggressiveness } = commander;
  const prepWeeks = getPreparationMaxTurns(aggressiveness);
  const reqForceRatio = getRequiredForceRatio(competence, aggressiveness);
  const reqIntelConf = getRequiredConfidence(competence, aggressiveness);

  // Determine recommendation based on commander personality thresholds
  const forceOk = overall.forceRatio >= reqForceRatio;
  const intelOk = overall.intelConfidence >= reqIntelConf;
  const supplyOk = overall.supplyReadiness >= 0.5;
  const passCount = [forceOk, intelOk, supplyOk].filter(Boolean).length;

  let recommendation: 'launch' | 'delay' | 'abort';
  if (passCount >= 2 && (forceOk || aggressiveness >= 4)) {
    recommendation = 'launch';
  } else if (passCount >= 1 || aggressiveness >= 3) {
    recommendation = 'delay';
  } else {
    recommendation = 'abort';
  }

  // Generate text sections based on competence level
  const intelLabel = labelFromThresholds(overall.intelConfidence, INTEL_LABELS);
  const supplyLabel = labelFromThresholds(overall.supplyReadiness, SUPPLY_LABELS);
  const primaryAxis = axes[0];
  const terrainStr = primaryAxis?.terrain?.toUpperCase() ?? 'UNKNOWN';
  const entrenchStr = primaryAxis?.entrenchment?.toUpperCase() ?? 'UNKNOWN';

  let enemy: string;
  let ownForces: string;
  let assessment: string;

  if (competence >= 4) {
    // High competence: specific, actionable
    enemy = `Enemy strength estimated at ${overall.forceRatio < 1 ? 'SUPERIOR' : 'INFERIOR'} force levels `
      + `(${intelLabel} confidence). ${terrainStr} terrain. `
      + `Entrenchment ${entrenchStr}.`;

    const fatigueNote = axes.some(a => a.supplyReadiness < 0.5)
      ? ' Supply concerns on one or more axes.' : '';
    ownForces = `${axes.reduce((s, a) => s + (a.forceRatio > 0 ? 1 : 0), 0)} axes assigned, `
      + `aggregate ratio ${overall.forceRatio.toFixed(1)}:1. `
      + `Supply ${supplyLabel}.${fatigueNote}`;

    const outcomeStr = primaryAxis?.predictedOutcome?.replace(/_/g, ' ').toUpperCase() ?? 'UNCERTAIN';
    if (recommendation === 'launch') {
      assessment = `Conditions ${overall.forceRatio >= 1.5 ? 'DECISIVE' : 'FAVORABLE'}. `
        + `Expect ${outcomeStr} on primary axis. `
        + (aggressiveness >= 4 ? 'Recommend ALL-OUT tempo. LAUNCH IMMEDIATELY.' : 'Recommend STANDARD tempo. Clear to LAUNCH.');
    } else if (recommendation === 'delay') {
      assessment = `Operation carries ${overall.forceRatio < 1 ? 'SIGNIFICANT' : 'MODERATE'} risk. `
        + `Expect ${outcomeStr}. `
        + `Recommend extending preparation ${Math.max(1, prepWeeks - 2)} weeks. `
        + `REQUEST reconnaissance-in-force before commitment.`;
    } else {
      assessment = `Force ratio INSUFFICIENT for ${terrainStr.toLowerCase()} assault. `
        + `Expect ${outcomeStr}. RECOMMEND ABORT.`;
    }
  } else if (competence >= 2) {
    // Medium competence: general, less specific
    enemy = `Enemy positions ${entrenchStr !== 'UNKNOWN' ? entrenchStr.toLowerCase() : 'of unknown strength'}. `
      + `Intel ${intelLabel.toLowerCase()}.`;
    ownForces = `Forces assigned. Ratio ${overall.forceRatio.toFixed(1)}:1. Supply ${supplyLabel.toLowerCase()}.`;

    if (recommendation === 'launch') {
      assessment = `Situation favorable. Recommend attack.`;
    } else if (recommendation === 'delay') {
      assessment = `Mixed conditions. More preparation advised.`;
    } else {
      assessment = `Conditions unfavorable. Advise reconsideration.`;
    }
  } else {
    // Low competence: vague, unhelpful
    enemy = aggressiveness >= 3 ? 'Enemy weak. Morale suspected low.' : 'Strength unclear. Reports conflicting.';
    ownForces = aggressiveness >= 3 ? 'Ready. Men eager to fight.' : 'Situation uncertain.';

    if (recommendation === 'launch') {
      assessment = 'Attack. No reason to delay.';
    } else if (recommendation === 'delay') {
      assessment = aggressiveness >= 3 ? 'Should attack soon.' : 'Perhaps more time needed.';
    } else {
      assessment = 'Concerns remain. Perhaps reconsider the operation scope.';
    }
  }

  return {
    recommendation,
    sections: { enemy, ownForces, assessment },
    preparationWeeks: prepWeeks,
    requiredForceRatio: reqForceRatio,
    requiredIntelConfidence: reqIntelConf,
  };
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/operation_prediction.test.ts`
Expected: 5 PASS (2 from Task 2 + 3 new)

**Step 5: Commit**

```bash
git add src/sim/combat/operation_prediction.ts tests/operation_prediction.test.ts
git commit -m "feat(ops-planning): commander assessment text generation with personality-driven templates"
```

---

### Task 4: Implement the top-level prediction query function

**Files:**
- Modify: `src/sim/combat/operation_prediction.ts`
- Test: `tests/operation_prediction.test.ts`

**Step 1: Write the failing test**

Add to `tests/operation_prediction.test.ts`:

```typescript
import { computeOperationPrediction } from '../src/sim/combat/operation_prediction';

describe('computeOperationPrediction', () => {
  it('returns empty axes and fallback assessment for empty request', () => {
    const result = computeOperationPrediction(
      {} as any, // minimal state
      {
        corpsId: 'corps_1',
        axes: [],
        tempo: 'standard',
        artilleryPreparation: false,
      },
      {}, // adjacency
      {}, // reverseMap
      {}, // terrainCache
    );
    expect(result.axes).toHaveLength(0);
    expect(result.overall.forceRatio).toBe(0);
    expect(result.overall.totalEstimatedCasualties).toBe(0);
    expect(result.commanderAssessment.recommendation).toBeDefined();
  });
});
```

**Step 2: Run to verify failure**

Run: `npx vitest run tests/operation_prediction.test.ts`
Expected: FAIL — `computeOperationPrediction` not exported

**Step 3: Implement top-level function**

Add to `src/sim/combat/operation_prediction.ts`:

```typescript
import { getCorpsCommander } from './officer_system';
import { getSectorIntelConfidence } from './sector_intel';

/**
 * Top-level prediction query: computes per-axis predictions and commander assessment.
 * READ-ONLY — does not mutate state.
 */
export function computeOperationPrediction(
  state: GameState,
  request: OperationPredictionRequest,
  adjacency: Record<string, string[]>,
  reverseMap: Record<string, string>,
  terrainCache: Record<string, number>,
  supplyStateByOsid?: Record<string, any>,
  osidPopulationMap?: Record<string, number>,
  slopeByOsid?: Record<string, number>,
  ethnicComposition?: Record<string, Record<string, number>>,
): OperationPredictionResponse {
  // Predict each axis
  const axisPredictions: AxisPrediction[] = [];
  for (const axis of request.axes) {
    const pred = predictAxisOutcome(
      state, axis, adjacency, reverseMap, terrainCache,
      supplyStateByOsid, osidPopulationMap, slopeByOsid, ethnicComposition
    );
    if (pred) {
      // Enrich with intel confidence from sector_intel
      // Find sector containing the first objective
      const sectors = state.military?.corps_front_sectors ?? [];
      for (const sec of sectors) {
        if (sec.sub_segments?.some((ss: any) => ss.hostile_osids?.includes(axis.objectiveOsids[0]))) {
          pred.intelConfidence = getSectorIntelConfidence(state, sec.sector_id);
          break;
        }
      }
      // Compute supply readiness for assigned brigades
      const formations = state.military?.formations ?? {};
      let supplied = 0;
      let total = 0;
      for (const bid of axis.brigadeIds) {
        const f = formations[bid];
        if (f) {
          total++;
          if ((f as any).supply_adequate !== false) supplied++;
        }
      }
      pred.supplyReadiness = total > 0 ? supplied / total : 0;
      axisPredictions.push(pred);
    }
  }

  // Aggregate overall metrics
  const totalCasualties = axisPredictions.reduce((s, a) => s + a.estimatedCasualties, 0);
  const avgForceRatio = axisPredictions.length > 0
    ? axisPredictions.reduce((s, a) => s + a.forceRatio, 0) / axisPredictions.length : 0;
  const avgIntel = axisPredictions.length > 0
    ? axisPredictions.reduce((s, a) => s + a.intelConfidence, 0) / axisPredictions.length : 0;
  const avgSupply = axisPredictions.length > 0
    ? axisPredictions.reduce((s, a) => s + a.supplyReadiness, 0) / axisPredictions.length : 0;

  // Find commander personality
  let commanderProfile: CommanderProfile = { competence: 3, aggressiveness: 3 }; // default
  if (request.commanderOfficerId && state.military?.named_officer_data) {
    const officer = state.military.named_officer_data.find(
      (o: any) => o.id === request.commanderOfficerId
    );
    if (officer) {
      commanderProfile = {
        competence: officer.competence ?? 3,
        aggressiveness: officer.aggressiveness ?? 3,
      };
    }
  } else {
    // Fall back to corps commander
    const corpsCdr = getCorpsCommander(request.corpsId, state);
    if (corpsCdr) {
      commanderProfile = {
        competence: corpsCdr.data.competence,
        aggressiveness: corpsCdr.data.aggressiveness,
      };
    }
  }

  const assessment = generateCommanderAssessment(
    commanderProfile,
    { forceRatio: avgForceRatio, intelConfidence: avgIntel, supplyReadiness: avgSupply, totalCasualties },
    axisPredictions
  );

  return {
    overall: {
      forceRatio: avgForceRatio,
      intelConfidence: avgIntel,
      supplyReadiness: avgSupply,
      totalEstimatedCasualties: totalCasualties,
      preparationWeeks: assessment.preparationWeeks,
    },
    axes: axisPredictions,
    commanderAssessment: assessment,
  };
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/operation_prediction.test.ts`
Expected: 6 PASS

**Step 5: Commit**

```bash
git add src/sim/combat/operation_prediction.ts tests/operation_prediction.test.ts
git commit -m "feat(ops-planning): top-level computeOperationPrediction aggregation + commander lookup"
```

---

### Task 5: Register IPC handler

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/ui/map/desktop/useIPC.ts`

**Step 1: Add IPC handler in electron-main.cjs**

Find the section with existing IPC handlers (around line 1109, near `stage-corps-operation-order`). Add after it:

```javascript
ipcMain.handle('query-operation-prediction', async (_event, requestJson) => {
  try {
    const request = JSON.parse(requestJson);
    const { computeOperationPrediction } = await import('../src/sim/combat/operation_prediction.ts');
    const { buildOsidAdjacency } = await import('../src/map/osid_adjacency.ts');
    const { buildTerrainCache } = await import('../src/sim/combat/combat_predictor.ts');

    const state = sim.deserializeState();
    const adjacency = buildOsidAdjacency(state);
    // Build reverse map: osid → formation_id at that location
    const reverseMap = {};
    for (const [fid, f] of Object.entries(state.military?.formations ?? {})) {
      if (f.location_osid) reverseMap[f.location_osid] = fid;
    }
    const terrainCache = buildTerrainCache(reverseMap);

    const result = computeOperationPrediction(
      state, request, adjacency, reverseMap, terrainCache
    );
    return JSON.stringify({ ok: true, data: result });
  } catch (err) {
    console.error('[IPC] query-operation-prediction error:', err);
    return JSON.stringify({ ok: false, error: String(err) });
  }
});
```

**NOTE**: The exact import paths and `sim.deserializeState()` call pattern should match the existing `stage-corps-operation-order` handler. Check the handler above this one for the exact pattern and adjust accordingly. The key difference: this handler does NOT mutate state or call `sendGameStateToRenderer()`.

**Step 2: Add UI-side IPC method in useIPC.ts**

Find the `WindowAwwv` interface (or the IPC hook). Add a new method:

```typescript
queryOperationPrediction: (request: OperationPredictionRequest) =>
  Promise<{ ok: boolean; data?: OperationPredictionResponse; error?: string }>;
```

And the implementation in the hook (matching the pattern of existing methods like `stageCorpsOperationOrder`):

```typescript
async queryOperationPrediction(request) {
  const raw = await window.awwv.queryOperationPrediction(JSON.stringify(request));
  return JSON.parse(raw);
},
```

**Step 3: Add the type import at top of useIPC.ts**

```typescript
import type { OperationPredictionRequest, OperationPredictionResponse } from '../../sim/combat/operation_prediction';
```

**Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit --project src/ui/map/tsconfig.json 2>&1 | grep -E "useIPC|operation_prediction"`
Expected: no errors (or only pre-existing warnings)

**Step 5: Commit**

```bash
git add src/desktop/electron-main.cjs src/ui/map/desktop/useIPC.ts
git commit -m "feat(ops-planning): register query-operation-prediction IPC handler"
```

---

## Phase 2: G-2 Panel Rebuild

### Task 6: Create ReadinessBar component

**Files:**
- Create: `src/ui/map/components/plan_ui/ReadinessBar.tsx`

**Step 1: Implement the reusable readiness bar**

```tsx
// src/ui/map/components/plan_ui/ReadinessBar.tsx

interface ReadinessBarProps {
  label: string;
  value: number; // 0-1
  qualitativeLabel: string;
  /** Optional override for bar color. Defaults to red→amber→green gradient. */
  barColor?: string;
}

const BAR_COLORS = [
  { threshold: 0.7, color: '#4a9a55' },
  { threshold: 0.4, color: '#c4a35a' },
  { threshold: 0, color: '#c24040' },
];

function getBarColor(value: number): string {
  for (const { threshold, color } of BAR_COLORS) {
    if (value >= threshold) return color;
  }
  return BAR_COLORS[BAR_COLORS.length - 1].color;
}

export function ReadinessBar({ label, value, qualitativeLabel, barColor }: ReadinessBarProps) {
  const color = barColor ?? getBarColor(value);
  const pct = Math.max(0, Math.min(100, value * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
          {qualitativeLabel}
        </span>
      </div>
      <div className="h-1.5 bg-[rgba(180,160,130,0.08)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-600 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/ui/map/components/plan_ui/ReadinessBar.tsx
git commit -m "feat(ops-planning): ReadinessBar reusable component"
```

---

### Task 7: Create AxisAssessmentCard component

**Files:**
- Create: `src/ui/map/components/plan_ui/AxisAssessmentCard.tsx`

**Step 1: Implement the collapsible axis card**

```tsx
// src/ui/map/components/plan_ui/AxisAssessmentCard.tsx
import { useState } from 'react';
import { AXIS_COLORS } from './opsConstants';
import { ReadinessBar } from './ReadinessBar';
import type { AxisPrediction } from '../../../../sim/combat/operation_prediction';

interface AxisAssessmentCardProps {
  prediction: AxisPrediction;
  axisName: string;
  colorIndex: number;
}

const OUTCOME_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  decisive_victory: { bg: 'bg-[#4a9a55]/20', text: 'text-[#4a9a55]', label: 'DECISIVE VICTORY' },
  victory: { bg: 'bg-[#4a9a55]/15', text: 'text-[#5aaa65]', label: 'VICTORY' },
  costly_victory: { bg: 'bg-[#c4a35a]/15', text: 'text-[#c4a35a]', label: 'COSTLY VICTORY' },
  stalemate: { bg: 'bg-[#c4a35a]/10', text: 'text-[#9a9080]', label: 'STALEMATE' },
  repulsed: { bg: 'bg-[#c24040]/15', text: 'text-[#c24040]', label: 'REPULSED' },
  catastrophic: { bg: 'bg-[#c24040]/20', text: 'text-[#ff5555]', label: 'CATASTROPHIC' },
};

function getCasualtySeverityColor(casualties: number): string {
  if (casualties >= 1000) return '#c24040';
  if (casualties >= 500) return '#d4804a';
  if (casualties >= 200) return '#c4a35a';
  return '#9a9080';
}

const INTEL_LABELS: Array<[number, string]> = [
  [0.8, 'Confirmed'], [0.6, 'Reliable'], [0.4, 'Partial'],
  [0.2, 'Fragmentary'], [0, 'Blind'],
];

const SUPPLY_LABELS: Array<[number, string]> = [
  [0.9, 'Full'], [0.7, 'Strong'], [0.5, 'Adequate'],
  [0.3, 'Strained'], [0, 'Critical'],
];

function labelFromThresholds(value: number, thresholds: Array<[number, string]>): string {
  for (const [threshold, label] of thresholds) {
    if (value >= threshold) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

export function AxisAssessmentCard({ prediction, axisName, colorIndex }: AxisAssessmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = AXIS_COLORS[colorIndex % AXIS_COLORS.length];
  const outcome = OUTCOME_STYLES[prediction.predictedOutcome] ?? OUTCOME_STYLES.stalemate;
  const casualtyColor = getCasualtySeverityColor(prediction.estimatedCasualties);

  return (
    <div className="border border-[rgba(180,160,130,0.1)] rounded bg-panel-card/50">
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-panel-hover/50 transition-colors"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider flex-1 truncate">
          {axisName}
        </span>
        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${outcome.bg} ${outcome.text} border-current/20`}>
          {outcome.label}
        </span>
        <span className="text-[10px] font-mono font-bold min-w-[50px] text-right" style={{ color: casualtyColor }}>
          ~{Math.round(prediction.estimatedCasualties).toLocaleString()}
        </span>
        <span className={`text-[10px] text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[rgba(180,160,130,0.06)] space-y-2">
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-text-secondary uppercase tracking-wider">Force Ratio</span>
              <div className="text-text-primary font-mono font-bold">{prediction.forceRatio.toFixed(1)} : 1</div>
            </div>
            <div>
              <span className="text-text-secondary uppercase tracking-wider">Terrain</span>
              <div className="text-text-primary font-bold uppercase">{prediction.terrain}</div>
            </div>
            <div>
              <span className="text-text-secondary uppercase tracking-wider">Entrenchment</span>
              <div className="text-text-primary font-bold uppercase">{prediction.entrenchment}</div>
            </div>
          </div>
          <ReadinessBar
            label="Intel"
            value={prediction.intelConfidence}
            qualitativeLabel={labelFromThresholds(prediction.intelConfidence, INTEL_LABELS)}
          />
          <ReadinessBar
            label="Supply"
            value={prediction.supplyReadiness}
            qualitativeLabel={labelFromThresholds(prediction.supplyReadiness, SUPPLY_LABELS)}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/ui/map/components/plan_ui/AxisAssessmentCard.tsx
git commit -m "feat(ops-planning): AxisAssessmentCard with collapsible detail"
```

---

### Task 8: Create CommanderAssessmentDoc component

**Files:**
- Create: `src/ui/map/components/plan_ui/CommanderAssessmentDoc.tsx`
- Reference: `src/ui/map/utils/factionAssets.ts` (getArmyCrest)

**Step 1: Implement the paper-styled assessment document**

```tsx
// src/ui/map/components/plan_ui/CommanderAssessmentDoc.tsx
import { getArmyCrest } from '../../utils/factionAssets';
import type { CommanderAssessmentText } from '../../../../sim/combat/operation_prediction';

interface CommanderAssessmentDocProps {
  assessment: CommanderAssessmentText | null;
  faction: string;
  corpsName: string;
  sectorName: string;
  commanderName?: string;
  turn: number;
}

const FACTION_ARMY_NAMES: Record<string, string> = {
  RBiH: 'ARMIJA REPUBLIKE BOSNE I HERCEGOVINE',
  RS: 'VOJSKA REPUBLIKE SRPSKE',
  HRHB: 'HRVATSKO VIJEĆE OBRANE',
};

const FACTION_CLASSIFICATION: Record<string, string> = {
  RBiH: 'POVJERLJIVO',
  RS: 'СТРОГО ПОВЕРЉИВО',
  HRHB: 'POVJERLJIVO',
};

export function CommanderAssessmentDoc({
  assessment, faction, corpsName, sectorName, commanderName, turn
}: CommanderAssessmentDocProps) {
  const crestSrc = getArmyCrest(faction);
  const armyName = FACTION_ARMY_NAMES[faction] ?? faction;
  const classification = FACTION_CLASSIFICATION[faction] ?? 'CONFIDENTIAL';
  const refNumber = `G2/${String(turn).padStart(3, '0')}-95`;

  if (!assessment) {
    return (
      <div className="bg-[#ebe1cd] paper-grain rounded p-4 border border-[rgba(180,160,130,0.3)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]"
           style={{ transform: 'rotate(-0.3deg)' }}>
        <p className="text-[11px] text-[#2a2520]/50 font-mono italic text-center py-6">
          Assign forces and objectives to generate assessment...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#ebe1cd] paper-grain rounded border border-[rgba(180,160,130,0.3)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden"
         style={{ transform: 'rotate(-0.3deg)' }}>
      {/* Document header */}
      <div className="px-4 pt-3 pb-2 border-b border-[#c8b99a]/40 flex items-start justify-between">
        <div className="flex items-start gap-2">
          {crestSrc && (
            <img src={crestSrc} alt="" className="w-5 h-5 opacity-50 mt-0.5" style={{ filter: 'saturate(0.5)' }} />
          )}
          <div>
            <div className="text-[8px] font-mono font-bold text-[#2a2520]/60 uppercase tracking-wider leading-none">
              {armyName}
            </div>
            <div className="text-[7px] font-mono text-[#2a2520]/40 uppercase tracking-wider mt-0.5">
              {corpsName} / {sectorName}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-mono font-bold text-[#8a2020] uppercase tracking-wider"
               style={{ transform: 'rotate(-2deg)' }}>
            {classification}
          </div>
          <div className="text-[7px] font-mono text-[#2a2520]/40 mt-0.5">
            Ref. {refNumber}
          </div>
        </div>
      </div>

      {/* Document title */}
      <div className="px-4 pt-2 pb-1">
        <div className="text-[9px] font-mono font-bold text-[#2a2520]/70 uppercase tracking-[0.15em] text-center">
          G-2 Intelligence Assessment
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 pb-3 space-y-2">
        <div>
          <span className="text-[9px] font-mono font-bold text-[#2a2520]/80">1. ENEMY: </span>
          <span className="text-[10px] font-mono text-[#2a2520]/70 leading-relaxed">
            {assessment.sections.enemy}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono font-bold text-[#2a2520]/80">2. OWN FORCES: </span>
          <span className="text-[10px] font-mono text-[#2a2520]/70 leading-relaxed">
            {assessment.sections.ownForces}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono font-bold text-[#2a2520]/80">3. ASSESSMENT: </span>
          <span className="text-[10px] font-mono text-[#2a2520]/70 leading-relaxed">
            {assessment.sections.assessment}
          </span>
        </div>
      </div>

      {/* Signature */}
      <div className="px-4 pb-3 pt-1 border-t border-[#c8b99a]/20">
        <div className="text-[8px] font-mono text-[#2a2520]/50 uppercase tracking-wider">
          {commanderName ? `G-2 Officer / ${commanderName}` : 'G-2 Officer'}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/ui/map/components/plan_ui/CommanderAssessmentDoc.tsx
git commit -m "feat(ops-planning): CommanderAssessmentDoc with paper texture, faction crest, classification stamp"
```

---

### Task 9: Create G2BriefingPanel combining all sub-components

**Files:**
- Create: `src/ui/map/components/plan_ui/G2BriefingPanel.tsx`

**Step 1: Implement the full G-2 panel**

```tsx
// src/ui/map/components/plan_ui/G2BriefingPanel.tsx
import { ReadinessBar } from './ReadinessBar';
import { AxisAssessmentCard } from './AxisAssessmentCard';
import { CommanderAssessmentDoc } from './CommanderAssessmentDoc';
import type { OperationPredictionResponse } from '../../../../sim/combat/operation_prediction';

interface G2BriefingPanelProps {
  prediction: OperationPredictionResponse | null;
  axisNames: Array<{ id: string; name: string }>;
  faction: string;
  corpsName: string;
  sectorName: string;
  commanderName?: string;
  turn: number;
}

const INTEL_LABELS: Array<[number, string]> = [
  [0.8, 'Confirmed'], [0.6, 'Reliable'], [0.4, 'Partial'],
  [0.2, 'Fragmentary'], [0, 'Blind'],
];

const SUPPLY_LABELS: Array<[number, string]> = [
  [0.9, 'Full'], [0.7, 'Strong'], [0.5, 'Adequate'],
  [0.3, 'Strained'], [0, 'Critical'],
];

const FORCE_LABELS: Array<[number, string]> = [
  [1.8, 'Overwhelming'], [1.2, 'Favorable'], [0.8, 'Contested'], [0, 'Inferior'],
];

function labelFromThresholds(value: number, thresholds: Array<[number, string]>): string {
  for (const [threshold, label] of thresholds) {
    if (value >= threshold) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

function getCasualtySeverityColor(casualties: number): string {
  if (casualties >= 1000) return '#c24040';
  if (casualties >= 500) return '#d4804a';
  if (casualties >= 200) return '#c4a35a';
  return '#9a9080';
}

export function G2BriefingPanel({
  prediction, axisNames, faction, corpsName, sectorName, commanderName, turn
}: G2BriefingPanelProps) {
  const overall = prediction?.overall;
  const axes = prediction?.axes ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(180,160,130,0.15)] pb-2 mb-4">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent-gold/60 border-l-2 border-accent-gold/30 pl-1">
          G-2 Intelligence Briefing
        </h3>
        {prediction && (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
        )}
      </div>

      {/* Summary bars */}
      <div className="space-y-3 mb-4">
        <ReadinessBar
          label="Intel Confidence"
          value={overall?.intelConfidence ?? 0}
          qualitativeLabel={labelFromThresholds(overall?.intelConfidence ?? 0, INTEL_LABELS)}
        />
        <ReadinessBar
          label="Supply Readiness"
          value={overall?.supplyReadiness ?? 0}
          qualitativeLabel={labelFromThresholds(overall?.supplyReadiness ?? 0, SUPPLY_LABELS)}
        />

        {/* Force ratio - numeric display */}
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Force Ratio</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-text-primary">
              {overall ? overall.forceRatio.toFixed(1) : '—'} : 1
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{
              color: (overall?.forceRatio ?? 0) >= 1.2 ? '#4a9a55'
                : (overall?.forceRatio ?? 0) >= 0.8 ? '#c4a35a' : '#c24040'
            }}>
              {labelFromThresholds(overall?.forceRatio ?? 0, FORCE_LABELS)}
            </span>
          </div>
        </div>

        {/* Preparation time */}
        {overall && overall.preparationWeeks > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Preparation</span>
            <span className="text-[10px] font-mono text-text-primary">
              ~{overall.preparationWeeks} weeks
            </span>
          </div>
        )}

        {/* Total casualties */}
        {overall && overall.totalEstimatedCasualties > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Est. Casualties</span>
            <span className="text-base font-mono font-bold" style={{
              color: getCasualtySeverityColor(overall.totalEstimatedCasualties)
            }}>
              ~{Math.round(overall.totalEstimatedCasualties).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Per-axis breakdown */}
      {axes.length > 0 && (
        <div className="space-y-1.5 mb-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent-gold/60 border-l-2 border-accent-gold/30 pl-1 mb-2">
            Axis Assessment
          </div>
          {axes.map((axisPred, i) => {
            const name = axisNames.find(a => a.id === axisPred.axisId)?.name ?? axisPred.axisId;
            return (
              <AxisAssessmentCard
                key={axisPred.axisId}
                prediction={axisPred}
                axisName={name}
                colorIndex={i}
              />
            );
          })}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Commander's assessment document */}
      <CommanderAssessmentDoc
        assessment={prediction?.commanderAssessment ?? null}
        faction={faction}
        corpsName={corpsName}
        sectorName={sectorName}
        commanderName={commanderName}
        turn={turn}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/ui/map/components/plan_ui/G2BriefingPanel.tsx
git commit -m "feat(ops-planning): G2BriefingPanel combining readiness bars, axis cards, and assessment doc"
```

---

### Task 10: Wire G2BriefingPanel into OpsPlanningModal with debounced IPC

**Files:**
- Modify: `src/ui/map/components/OpsPlanningModal.tsx`

**Step 1: Add prediction state and debounced IPC call**

At the top of OpsPlanningModal, add imports:

```typescript
import { G2BriefingPanel } from './plan_ui/G2BriefingPanel';
import type { OperationPredictionResponse } from '../../../sim/combat/operation_prediction';
```

Inside the component, add prediction state and debounced fetcher:

```typescript
const [prediction, setPrediction] = useState<OperationPredictionResponse | null>(null);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Debounced prediction query
useEffect(() => {
    if (!isOpen || state.axes.every(a => a.brigadeIds.length === 0 || a.objectives.length === 0)) {
        setPrediction(null);
        return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
        try {
            const res = await ipc.queryOperationPrediction({
                corpsId: selectedCorpsId!,
                axes: state.axes.map(a => ({
                    axisId: a.id,
                    brigadeIds: a.brigadeIds,
                    objectiveOsids: a.objectives,
                    stagingOsid: a.stagingOsid,
                })),
                tempo: TEMPO_IPC_MAP[state.tempo],
                artilleryPreparation: state.artilleryPrep,
                commanderOfficerId: state.commanderId ?? undefined,
            });
            if (res.ok && res.data) setPrediction(res.data);
        } catch (err) {
            console.warn('[OpsPlanningModal] prediction query failed:', err);
        }
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, [isOpen, state.axes, state.tempo, state.artilleryPrep, state.commanderId, selectedCorpsId]);
```

**Step 2: Replace the G2ForecastPanel in the right panel JSX**

Find the right panel section (currently renders `<G2ForecastPanel ...>`) and replace with:

```tsx
<G2BriefingPanel
    prediction={prediction}
    axisNames={state.axes.map(a => ({ id: a.id, name: a.name }))}
    faction={loadedGameState?.formations.find(f => f.corps_id === selectedCorpsId)?.faction ?? 'RBiH'}
    corpsName={selectedCorpsId?.replace(/_/g, ' ').toUpperCase() ?? 'UNKNOWN CORPS'}
    sectorName={sector?.display_name ?? 'UNKNOWN SECTOR'}
    commanderName={state.commanderId ? loadedGameState?.namedOfficerData?.find(o => o.id === state.commanderId)?.name : undefined}
    turn={loadedGameState?.turn ?? 0}
/>
```

**Step 3: Remove old G2ForecastPanel import**

Delete: `import { G2ForecastPanel } from './plan_ui/G2ForecastPanel';`

**Step 4: Remove the logistics/recon brief hardcoded sections**

Delete the `mt-6 space-y-3` div that contains the hardcoded "Logistics Check" and "Recon Brief" boxes — this data now comes from the G2BriefingPanel.

**Step 5: Verify typecheck**

Run: `npx tsc --noEmit --project src/ui/map/tsconfig.json 2>&1 | grep OpsPlanningModal`
Expected: no errors

**Step 6: Verify build**

Run: `npx vite build --config src/ui/map/vite.config.ts 2>&1 | tail -3`
Expected: `✓ built in Xs`

**Step 7: Commit**

```bash
git add src/ui/map/components/OpsPlanningModal.tsx
git commit -m "feat(ops-planning): wire G2BriefingPanel with debounced IPC prediction"
```

---

## Phase 3: Faction Identity in Top Bar

### Task 11: Update CommandTopBar with army crest and corps name

**Files:**
- Modify: `src/ui/map/components/plan_ui/CommandTopBar.tsx`

**Step 1: Add faction identity props**

Update the interface:

```typescript
interface CommandTopBarProps {
    opName: string;
    onNameChange: (val: string) => void;
    onClose: () => void;
    sectorName: string;
    commanderId?: string | null;
    onCommanderClick?: () => void;
    onAuthorize?: () => void;
    isSubmitting?: boolean;
    statusMessage?: string | null;
    // NEW
    crestSrc?: string;
    corpsDisplayName?: string;
    factionColor?: string;
}
```

**Step 2: Add crest + corps name to left side of the bar**

Replace the existing left section with:

```tsx
<div className="flex items-center gap-4">
    {/* Faction crest + corps identity */}
    <div className="flex items-center gap-3">
        {crestSrc && (
            <img src={crestSrc} alt="" className="w-9 h-9 drop-shadow-[0_0_6px_rgba(196,163,90,0.3)]" />
        )}
        <div className="flex flex-col">
            <h2 className="text-[11px] font-bold text-accent-gold uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(200,165,110,0.4)]">
                {corpsDisplayName ?? 'Operations Command'}
            </h2>
            <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">
                Sector: {sectorName}
            </span>
        </div>
    </div>

    <div className="h-8 w-px bg-white/10" />
    {/* ... rest of existing: directive name input, command authority button */}
```

**Step 3: Add faction accent left border**

On the outer div, add a left border in faction color:

```tsx
<div className="h-14 flex items-center justify-between px-5 bg-panel-bg/95 border-b border-[rgba(180,160,130,0.15)] relative z-30 backdrop-blur-md"
     style={{ borderLeft: `3px solid ${factionColor ?? '#c4a35a'}` }}>
```

**Step 4: Pass props from OpsPlanningModal**

In `OpsPlanningModal.tsx`, where `<CommandTopBar>` is rendered, add:

```tsx
import { getArmyCrest } from '../utils/factionAssets';

// Derive faction from the first formation in this corps
const corpsFaction = loadedGameState?.formations.find(f => f.corps_id === selectedCorpsId)?.faction ?? 'RBiH';
const FACTION_COLORS: Record<string, string> = { RS: '#c24040', RBiH: '#4a9a55', HRHB: '#4080b8' };

<CommandTopBar
    // ... existing props
    crestSrc={getArmyCrest(corpsFaction)}
    corpsDisplayName={selectedCorpsId?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown Corps'}
    factionColor={FACTION_COLORS[corpsFaction] ?? '#c4a35a'}
/>
```

**Step 5: Verify build**

Run: `npx vite build --config src/ui/map/vite.config.ts 2>&1 | tail -3`
Expected: `✓ built in Xs`

**Step 6: Commit**

```bash
git add src/ui/map/components/plan_ui/CommandTopBar.tsx src/ui/map/components/OpsPlanningModal.tsx
git commit -m "feat(ops-planning): army crest, corps name, and faction accent in top bar"
```

---

## Phase 4: UX Polish

### Task 12: Authorization weight pause

**Files:**
- Modify: `src/ui/map/components/OpsPlanningModal.tsx`

**Step 1: Add authorization animation state**

Add state:

```typescript
const [authorizing, setAuthorizing] = useState(false);
```

**Step 2: Modify handleAuthorize to include weight pause**

Replace the existing `setTimeout` at the end of handleAuthorize:

```typescript
dispatch({ type: 'SET_STATUS', msg: 'DIRECTIVE AUTHORIZED' });
setAuthorizing(true);
setTimeout(() => {
    setAuthorizing(false);
    setOpsPlanningModalOpen(false);
    dispatch({ type: 'SET_SUBMITTING', val: false });
    dispatch({ type: 'SET_STATUS', msg: null });
}, 1500);
```

**Step 3: Add darkening overlay to JSX**

After the opening `<div className="ops-planning-v2 ...">`, add:

```tsx
{/* Authorization weight overlay */}
{authorizing && (
    <div className="absolute inset-0 z-[1100] bg-black pointer-events-none animate-[fadeIn_800ms_ease-out_forwards]"
         style={{ opacity: 0.15 }} />
)}
```

**Step 4: Commit**

```bash
git add src/ui/map/components/OpsPlanningModal.tsx
git commit -m "feat(ops-planning): authorization weight pause with screen darken"
```

---

### Task 13: Brigade fitness stripe on TacticalCard

**Files:**
- Modify: `src/ui/map/components/TacticalCard.tsx`

**Step 1: Add fitness computation and stripe**

In `TacticalCard.tsx`, add after the existing stat computations:

```typescript
function getFitnessColor(personnel: number, cohesion: number, fatigue: number): string {
    if (personnel < 400 || cohesion < 20 || fatigue > 70) return '#c24040'; // red
    if (personnel < 800 || cohesion < 40 || fatigue > 50) return '#c4a35a'; // amber
    return '#4a9a55'; // green
}
```

In the JSX, find the left accent strip div (`<div className={`w-1.5 shrink-0 ...`}>`) and change to:

```tsx
<div className="w-1.5 shrink-0" style={{ backgroundColor: isAssigned ? (axisColor ?? getFitnessColor(pers, coh, fat)) : getFitnessColor(pers, coh, fat) }} />
```

**Step 2: Commit**

```bash
git add src/ui/map/components/TacticalCard.tsx
git commit -m "feat(ops-planning): brigade fitness stripe on TacticalCard (green/amber/red)"
```

---

### Task 14: Final verification

**Step 1: Run full typecheck**

Run: `npx tsc --noEmit --project src/ui/map/tsconfig.json 2>&1 | grep -c "error TS"`
Expected: 0 new errors (only pre-existing warnings)

**Step 2: Run full test suite**

Run: `npm run test:vitest`
Expected: 932+ tests pass (plus new operation_prediction tests)

**Step 3: Run full Vite build**

Run: `npx vite build --config src/ui/map/vite.config.ts 2>&1 | tail -3`
Expected: `✓ built in Xs`

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat(ops-planning): G-2 live briefing — final verification pass"
```

---

## Deferred (Future Tasks)

These are documented but NOT part of this plan:

- **Task D1**: Consequence echo banner (requires completed operations history on CorpsOperation)
- **Task D2**: Commander preview in CommanderSelectionModal (requires modal refactor)
- **Task D3**: Axis arrow outcome glow on OpsMapRenderer (requires prediction → renderer bridge)
- **Task D4**: Map paper-grain texture overlay
- **Task D5**: Risk tolerance → min_attack_outcome mapping in payload
- **Task D6**: AI-generated assessment text (future AI integration slot)
