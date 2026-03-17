# Ops Planning: G-2 Live Briefing + Visual Overhaul

**Date:** 2026-03-16
**Baseline:** Ops planning modal with Carto/OpenStreetMap tiles, hardcoded G-2 forecast (65% base), cyan/cyberpunk styling
**Result:** Fullscreen ops planning with game map, live engine predictions via full combat predictor, paper-styled commander assessment document, faction identity, warm NATO ops center palette

## Summary

- Replaced the ops planning modal's placeholder G-2 forecast with live engine data — force ratios, predicted combat outcomes, terrain analysis, supply readiness, and estimated casualties, all computed by the same `predictCombatOutcome()` the engine uses to resolve actual battles
- Redesigned the screen as a fullscreen takeover with two visual textures: dark glassmorphic data panels (the screens) + paper-styled military assessment document (the table). Commander assessment follows the Soviet-inherited *borbena zapovest* format used by VRS/ARBiH during the war
- Added faction identity: army crest, corps name, faction-colored accent, and faction-specific classification stamps in the assessment document (RBiH: "POVJERLJIVO", RS: "СТРОГО ПОВЕРЉИВО" in Cyrillic, HRHB: "POVJERLJIVO")

## Design Documents

- **Design doc:** `docs/plans/2026-03-16-ops-planning-redesign-g2-live-briefing.md`
- **Implementation plan:** `docs/plans/2026-03-16-ops-planning-g2-implementation.md`

---

## Phase 1: Visual Overhaul (Pre-G2)

### Map Fixed
The ops planning map was using `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` — generic OpenStreetMap tiles with no game data. Replaced with the game's own `awwv_map_style.json` via PMTiles protocol:
- OSID control polygons (faction-colored territory)
- Front lines (animated stripe)
- Hillshade, rivers, roads, place labels
- Click targets are now the game's actual OSID polygons (crosshair cursor)

`OpsMapRenderer.ts` now loads operational data via `loadOperationalSettlements()` + `loadOperationalPoliticalControl()`, builds control GeoJSON and front lines before map init. PMTiles protocol registered with idempotent try/catch guard.

### Fullscreen Takeover
Was: 95vw × 90vh modal centered with `bg-black/80` backdrop and `border-2 border-cyan-900`.
Now: `fixed inset-0` — true fullscreen, no backdrop, no inner container. The entire screen becomes the ops planning interface.

### Visual Style Aligned
Purged all cyan/cyberpunk colors (30+ occurrences across 5 files):
- `text-cyan-500` → `text-accent-gold`
- `border-cyan-900` → `border-[rgba(180,160,130,0.15)]`
- `bg-slate-950` → `bg-panel-bg`
- `bg-cyan-950/20` → `bg-panel-card`
- Removed CRT scanline overlay effect
- Axis colors changed from neon (`#ff4444`, `#44ff88`) to faction-derived tones (`#c24040`, `#4a9a55`, `#4080b8`, `#c4a35a`)
- Custom cyan scrollbar removed — inherits game's warm gold scrollbar from `globals.css`

### Faction Identity in Top Bar
- Army crest image (36×36px with gold glow shadow) — `army_crest_ARBiH.png`, `army_crest_VRS.png`, `army_crest_HVO.png`
- Corps display name (e.g., "Arbih 1st Corps") in uppercase with gold accent
- Sector name subtitle
- 3px left border in faction color (RS red, RBiH green, HRHB blue)

---

## Phase 2: Backend Prediction Engine

### `src/sim/combat/operation_prediction.ts` (new, ~300 lines)

Three exported functions:

**`predictAxisOutcome()`**
- Delegates to the existing `predictCombatOutcome()` from `combat_predictor.ts` with the first brigade as primary attacker and remaining brigades as additional attackers
- Maps the raw `CombatPrediction` into an `AxisPrediction` shape with classified terrain (mountain/urban/forest/open from multiplier thresholds) and entrenchment (heavy/moderate/light/unknown from entrenchment level)
- Returns null for empty axes (no brigades or no objectives)

**`generateCommanderAssessment()`**
- Three-tier personality-driven text generation:
  - **High competence (4-5):** Specific, actionable — references terrain, force ratios, supply, recommends tempo. "Force ratio INSUFFICIENT for mountain assault. Expect REPULSED. RECOMMEND ABORT."
  - **Medium competence (2-3):** General. "Mixed conditions. More preparation advised."
  - **Low competence (1):** Vague. Aggressive: "Attack. No reason to delay." Cautious: "Concerns remain. Perhaps reconsider."
- Recommendation (launch/delay/abort) based on `getRequiredForceRatio()`, `getRequiredConfidence()` thresholds from `operation_preparation.ts` — same thresholds the engine's go/no-go assessment uses
- Returns preparation weeks from `getPreparationMaxTurns(aggressiveness)`

**`computeOperationPrediction()`**
- Top-level orchestrator: iterates axes, calls `predictAxisOutcome`, enriches with supply readiness (from faction general reserve), resolves commander profile (explicit officer → corps commander → default), aggregates metrics, generates assessment
- Read-only — does not mutate state

### IPC Pipeline

```
UI: ipc.queryOperationPrediction(request)
  → preload.cjs: ipcRenderer.invoke('query-operation-prediction', payload)
  → electron-main.cjs: deserializeState + sim.queryOperationPrediction()
  → desktop_sim.ts: loadOperationalData + loadOperationalEdges + buildOsidAdjacency + buildTerrainCache + computeOperationPrediction
  → response: OperationPredictionResponse
```

- Operational data and edges **cached at module level** (immutable during gameplay) — only first call reads from disk
- IPC handler validates payload shape (corpsId string, axes array)
- 300ms debounce on the UI side — only fires when at least one axis has brigades AND objectives

### Types

```typescript
interface OperationPredictionRequest {
  corpsId: string;
  axes: Array<{ axisId, brigadeIds[], objectiveOsids[], stagingOsid? }>;
  tempo: 'methodical' | 'standard' | 'all_out';
  artilleryPreparation: boolean;
  commanderOfficerId?: string;
}

interface AxisPrediction {
  axisId, predictedOutcome, forceRatio, estimatedCasualties,
  terrain, entrenchment, intelConfidence, supplyReadiness
}

interface OperationPredictionResponse {
  overall: { forceRatio, intelConfidence, supplyReadiness, totalEstimatedCasualties, preparationWeeks };
  axes: AxisPrediction[];
  commanderAssessment: { recommendation, sections: { enemy, ownForces, assessment }, preparationWeeks, requiredForceRatio, requiredIntelConfidence };
}
```

---

## Phase 3: G-2 Panel UI Components

### ReadinessBar (`ReadinessBar.tsx`)
Reusable horizontal bar with label, qualitative text, and color (red → amber → green based on value thresholds). Used for Intel Confidence, Supply Readiness, and Force Ratio displays.

### AxisAssessmentCard (`AxisAssessmentCard.tsx`)
Collapsible per-axis card. Collapsed state shows: axis color dot, name, predicted outcome badge (DECISIVE VICTORY through CATASTROPHIC with severity colors), estimated casualties. Expanded state adds: force ratio, terrain type, entrenchment level, intel/supply readiness bars.

### CommanderAssessmentDoc (`CommanderAssessmentDoc.tsx`)
Paper-styled military document modeled on real VRS/ARBiH operational assessments:
- Cream background (`#ebe1cd`) with `paper-grain` texture overlay
- Small desaturated army crest (20×20px, 50% saturation)
- Faction-specific army name header: "ARMIJA REPUBLIKE BOSNE I HERCEGOVINE" / "VOJSKA REPUBLIKE SRPSKE" / "HRVATSKO VIJEĆE OBRANE"
- Classification stamp in dark red (`#8a2020`), slightly rotated (-2°): "POVJERLJIVO" / "СТРОГО ПОВЕРЉИВО"
- Reference number generated from turn (e.g., "Ref. G2/014-95")
- Three numbered sections: 1. ENEMY / 2. OWN FORCES / 3. ASSESSMENT
- Commander name signature line
- Whole document at -0.3° rotation for authenticity
- Placeholder text when no assessment available: "Assign forces and objectives to generate assessment..."

### G2BriefingPanel (`G2BriefingPanel.tsx`)
Orchestrates all sub-components:
1. Module header: "G-2 Intelligence Briefing" with live indicator dot
2. Three ReadinessBar instances (Intel, Supply, Force Ratio) with qualitative labels
3. Summary stats: total estimated casualties (severity-colored) + preparation weeks
4. Per-axis AxisAssessmentCards (collapsible)
5. CommanderAssessmentDoc pinned at bottom

Uses local view types (no cross-package import from `src/sim/`) to avoid brittle dependencies.

### Shared Constants (`opsConstants.ts`)
Extracted from duplicates across files:
- `INTEL_LABELS`, `SUPPLY_LABELS`, `FORCE_RATIO_LABELS` — threshold arrays
- `OUTCOME_STYLES` — badge colors per outcome type
- `labelFromThresholds()`, `getCasualtySeverityColor()` — utility functions
- `FACTION_HEX_COLORS` — RS/RBiH/HRHB hex colors for inline styles
- `AXIS_COLORS`, `TEMPO_IPC_MAP` — pre-existing, now alongside new constants

---

## Phase 4: UX Polish

### Authorization Weight Pause
When player clicks AUTHORIZE, screen darkens (`rgba(0,0,0,0.15)` overlay over 700ms). No confirmation dialog — the player already decided. Just a beat of gravity before the order transmits and the screen closes.

### Brigade Fitness Stripe
TacticalCard left accent strip now shows at-a-glance readiness:
- Green (`#4a9a55`): personnel OK, cohesion ≥ 40, fatigue ≤ 50
- Amber (`#c4a35a`): one condition failing
- Red (`#c24040`): combat ineffective (personnel < 400, cohesion < 20, or fatigue > 70)

---

## /simplify Passes (3 Rounds)

### Round 1 (after visual overhaul)
- Extracted `AXIS_COLORS` to shared `opsConstants.ts` (was duplicated in OpsPlanningModal + AxisDrilldown)
- Extracted `TEMPO_IPC_MAP` to shared constants (was inline ternary chain)
- Removed `loadedGameState` from axes effect dependency (prevented bezier recalculation on every game state change)
- Removed redundant `const current = value` alias in RiskToleranceSelector
- Reduced bezier resolution 10000 → 500 (20× CPU reduction, imperceptible visual difference)
- Nullified `onOsidClick` on OpsMapRenderer dispose

### Round 2 (after Phase 1 backend)
- **Fixed BUG:** `opData.edges` always undefined — `loadOperationalData()` doesn't populate edges. Added `loadOperationalEdges()` call.
- **Fixed BUG:** `supply_adequate` field doesn't exist on FormationState — replaced with faction general reserve estimation
- Removed unnecessary `(state.military.named_officer_data as any[])` cast — field is already typed as `NamedOfficer[]`
- Added IPC payload validation in electron-main.cjs handler
- Cached operational data + edges at module level in desktop_sim.ts

### Round 3 (after Phases 2-4)
- Extracted `INTEL_LABELS`, `SUPPLY_LABELS`, `FORCE_RATIO_LABELS`, `OUTCOME_STYLES`, `labelFromThresholds()`, `getCasualtySeverityColor()` from duplicate definitions in AxisAssessmentCard + G2BriefingPanel → shared `opsConstants.ts`
- Replaced inline `FACTION_COLORS` with shared `FACTION_HEX_COLORS` from opsConstants
- Removed `(loadedGameState as any)?.namedOfficerData` cast — field exists on `LoadedGameState`
- Removed unused `onCommanderChange` prop from CommandTopBar interface

---

## Tests

12 new tests in `tests/operation_prediction.test.ts`:

| Test | What it verifies |
|------|-----------------|
| `predictAxisOutcome: null when no brigades` | Empty brigade list returns null |
| `predictAxisOutcome: null when no objectives` | Empty objective list returns null |
| `generateCommanderAssessment: aggressive competent → launch` | High agg + good data = launch recommendation |
| `generateCommanderAssessment: cautious incompetent → abort` | Low comp + weak data = abort |
| `generateCommanderAssessment: moderate → delay` | Mixed data = delay recommendation |
| `generateCommanderAssessment: low comp aggressive → vague bullish` | Vague "enemy weak" text |
| `generateCommanderAssessment: high comp cautious → specific caution` | Detailed terrain/intel concerns |
| `generateCommanderAssessment: empty axes → default assessment` | Handles zero-axis edge case |
| `generateCommanderAssessment: preparation weeks match personality` | `getPreparationMaxTurns` correctly applied |
| `generateCommanderAssessment: required thresholds match personality` | Force ratio + intel thresholds match |
| `computeOperationPrediction: empty request` | Zero axes → zero casualties, valid response |
| `computeOperationPrediction: default commander profile` | Falls back to competence=3, aggressiveness=3 |

Full suite: **944 tests pass** (81 suites, 1 skipped).

---

## Files

### Created (6 new files)
| File | Purpose |
|------|---------|
| `src/sim/combat/operation_prediction.ts` | Prediction engine: predictAxisOutcome, generateCommanderAssessment, computeOperationPrediction |
| `src/ui/map/components/plan_ui/ReadinessBar.tsx` | Reusable horizontal readiness bar |
| `src/ui/map/components/plan_ui/AxisAssessmentCard.tsx` | Collapsible per-axis assessment card |
| `src/ui/map/components/plan_ui/CommanderAssessmentDoc.tsx` | Paper-styled military assessment document |
| `src/ui/map/components/plan_ui/G2BriefingPanel.tsx` | G-2 briefing panel orchestrator |
| `tests/operation_prediction.test.ts` | 12 prediction engine tests |

### Modified (12 files)
| File | Change |
|------|--------|
| `src/ui/map/components/OpsPlanningModal.tsx` | Fullscreen + game map + G2BriefingPanel wiring + debounced IPC + faction identity + authorization pause |
| `src/ui/map/components/plan_ui/OpsMapRenderer.ts` | Game map via PMTiles + operational data loading + warm OSID colors |
| `src/ui/map/components/plan_ui/CommandTopBar.tsx` | Army crest + corps name + faction accent border |
| `src/ui/map/components/plan_ui/AxisDrilldown.tsx` | Warm palette (purged cyan) |
| `src/ui/map/components/plan_ui/G2ForecastPanel.tsx` | Warm palette (superseded by G2BriefingPanel) |
| `src/ui/map/components/plan_ui/RiskToleranceSelector.tsx` | Warm palette + removed redundant alias |
| `src/ui/map/components/plan_ui/opsConstants.ts` | Shared assessment constants + thresholds + utilities |
| `src/ui/map/components/TacticalCard.tsx` | Brigade fitness stripe |
| `src/desktop/desktop_sim.ts` | queryOperationPrediction wrapper with cached data loading |
| `src/desktop/electron-main.cjs` | query-operation-prediction IPC handler |
| `src/desktop/preload.cjs` | Exposed queryOperationPrediction |
| `src/ui/map/desktop/useIPC.ts` | Added queryOperationPrediction method |

---

## Architecture Decisions

1. **Full combat predictor, not simplified estimate:** The G-2 panel uses the same `predictCombatOutcome()` that resolves actual battles, including all 12+ combat modifiers (terrain, entrenchment, urban defense, heavy weapons, fatigue, concentration bonus, etc.). Player sees what will actually happen, within intel confidence limits.

2. **IPC query, not client-side computation:** Prediction requires OSID adjacency graph, terrain cache, and reverse map — complex dependencies that live in the engine. A read-only IPC handler is cleaner than shipping engine internals to the browser.

3. **Local view types instead of cross-package imports:** UI components define their own `AxisPredictionView` / `PredictionView` types that mirror the engine response shape. Avoids brittle dependency from `src/ui/map/` → `src/sim/combat/`.

4. **Module-level caching for operational data:** OSID edges and operational data are immutable during gameplay. Cached on first access in `desktop_sim.ts` to avoid disk reads on every 300ms prediction query.

5. **Two-texture visual design:** Dark glassmorphic panels (data/controls) + cream paper document (commander assessment). Creates the "command post" atmosphere — screens on the wall, documents on the table.

6. **Personality-filtered assessment, not raw data filter:** The commander's personality affects the TEXT (tone, specificity, recommendations), not the NUMBERS. Raw data (force ratios, intel confidence) is honest within fog-of-war limits. The player learns to read both the data and the messenger.

---

## Deferred Items

| Item | Priority | Notes |
|------|----------|-------|
| Axis arrow outcome glow | P2 | Color bezier arrows green/amber/red based on predicted outcome. Needs prediction → OpsMapRenderer bridge. |
| Consequence echo banner | P2 | "Last op: CORRIDOR 92 — Costly Victory, 1,247 casualties." Needs completed ops history on CorpsOperation. |
| Commander preview in selection | P2 | Show prep time, force ratio threshold, intel threshold when hovering officer in CommanderSelectionModal. |
| Risk tolerance → min_attack_outcome | P3 | Currently UI-only. Map to `min_attack_outcome` on CorpsOperationOrderPayload. |
| AI-generated assessment text | P3 | Future LLM slot. Template system designed to accept AI text in the same document format. |
| Per-OSID supply derivation | P3 | Current supply readiness uses faction reserve level. Per-OSID derivation from supply_state_derivation would be more accurate. |
