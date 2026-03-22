# Ops Planning Redesign: Live G-2 Briefing

**Date**: 2026-03-16
**Status**: Design approved
**Scope**: Ops Planning fullscreen — replace placeholder G-2 forecast with live engine data, commander personality layer, authentic visual treatment, UX polish

## Design Philosophy

The ops planning screen is the game within the game. It should feel like a real staff meeting where lives are at stake — thrilling, weighty, consequential. The player sees real data (filtered by fog-of-war), reads a commander's personality-colored interpretation, and signs an order knowing the cost.

**Core principle**: Raw data is honest (within intel limits). Commander commentary is personality-driven. The player learns to read both.

**Visual principle**: The table with the screens. The map center feels physical — paper-grain texture, vignette, like looking down at a command table. The side panels are modern — glassmorphic readiness bars, clean typography. The commander's assessment is styled as a real military document from this war. Two textures in one screen: the physicality of the map table and the precision of the intelligence readouts.

---

## 1. Screen Layout (Three Zones + Identity)

Fullscreen takeover. No modal chrome.

### Top Bar — Corps Identity & Command Authority

A slim bar (h-14) anchoring the screen with faction identity:

- **Left**: Army crest image (`army_crest_ARBiH.png` / `army_crest_VRS.png` / `army_crest_HVO.png`) at 36×36px with a subtle gold glow shadow. Adjacent: corps name in IBM Plex Sans Condensed, bold, uppercase, tracking-wide — e.g. "1ST CORPS — ARMY OF THE REPUBLIC OF BOSNIA AND HERZEGOVINA". Below in smaller secondary text: sector name ("Sector Igman").
- **Center**: Operation name (editable input field), directive name label above.
- **Right**: Commander authority selector, status message, DISCARD / AUTHORIZE buttons.

The crest grounds the player in who they are. This isn't an abstract planning tool — it's *your* army, *your* corps, *your* men.

Background: `bg-panel-bg/95 backdrop-blur-md`, border-bottom `rgba(180,160,130,0.15)`. Same glassmorphic treatment as TopToolbar.

### Left Panel (360px) — "The Plan"

Player's input surface. Dark glassmorphic aesthetic (`bg-panel-bg/95 backdrop-blur-sm`).

Contents:
- Playbook type (Sector Offensive / Deceptive Maneuver / Reconnaissance)
- Tempo selector (Methodical / Standard / All-Out)
- Risk tolerance (Defer to Safety / Balanced / Decisive Action)
- Tactical axes: add axes, set staging OSID, designate objectives on map
- Artillery preparation toggle

Visual treatment: warm panel borders (`rgba(180,160,130,0.15)`), `accent-gold` section headers with `text-shadow` glow, `panel-card` backgrounds for interactive elements. Same design language as the game's existing sidebar panels.

### Center — "The Map"

The game's actual map (PMTiles, OSID control polygons, front lines, formations).

Visual treatment: **The physical table.** The map has a subtle `paper-grain` texture overlay at 2-3% opacity — just enough to feel tactile without obscuring data. A vignette shadow (`inset 0 0 60px rgba(0,0,0,0.4)`) frames the edges, creating depth — like looking down at a lit table in a dim room. The surrounding panels cast the map into a recessed center.

Enhancements:
- **Objective hover tooltip**: terrain type, estimated entrenchment, current controller, faction
- **Axis arrow outcome glow**: bezier arrows get a color-coded glow matching predicted outcome:
  - Green (`#4a9a55`): decisive victory / victory
  - Amber (`#c4a35a`): costly victory / stalemate
  - Red (`#c24040`): repulsed / catastrophic
- **Map mode indicator**: floats centered over map when player is clicking to set staging/objectives. Glassmorphic pill with accent-gold pulse dot.

### Right Panel (320px) — "The Briefing"

The G-2 intelligence panel. Two visual zones stacked:

**Upper zone**: Modern readiness dashboard. Dark glassmorphic (`bg-panel-bg/95`). Horizontal readiness bars, per-axis breakdown cards, clean data typography. This is the "screens on the wall" part of the HQ.

**Lower zone**: The commander's assessment document. A distinct visual break — cream paper background (`#ebe1cd`), `paper-grain` texture overlay, monospace font (IBM Plex Mono). Styled as a real military assessment document from the Bosnian war. This is the "piece of paper someone handed you" part of the HQ.

Three layers of information density:
1. **Glance** — summary bars + outcome badges (always visible)
2. **Inspect** — expanded per-axis details (click to expand)
3. **Interpret** — commander's written assessment (always visible, pinned bottom)

### Bottom Shelf (180px) — "The Forces"

Brigade cards for the selected corps. Enhanced with fitness indicator stripe:
- Green (`#4a9a55`): fresh, supplied, ready
- Amber (`#c4a35a`): fatigued (>50%) or low cohesion (<40%)
- Red (`#c24040`): combat ineffective (personnel < 400)

Data source: `FormationView.personnel`, `.fatigue`, `.cohesion` — already available.

---

## 2. Visual Treatment: The Two Textures

The planning screen has two distinct visual layers that create the "command post" atmosphere:

### 2a. The Dark Glass Layer (Panels, Data, Controls)

Used for: left panel, top bar, upper-right readiness dashboard, bottom force shelf.

Palette & effects:
- Background: `#1c1a17` at 95% opacity + `backdrop-blur: 12px` (glassmorphism)
- Borders: `rgba(180,160,130,0.15)` — warm gold, subtle
- Text primary: `#ddd5c8` (warm off-white)
- Text secondary: `#9a9080` (muted warm gray)
- Accent: `#c4a35a` (gold) with `text-shadow: 0 0 5px rgba(180,160,130,0.4)` glow
- Section headers: `font-mono text-[9px] uppercase tracking-[0.2em] text-accent-gold/60 border-l-2 border-accent-gold/30 pl-1` (matching TopToolbar `.module-header` pattern)
- Interactive cards: `bg-panel-card` (`#252220`) with `hover:bg-panel-hover` (`#332e2a`)
- Active state: `bg-panel-active` (`#3a3020`) with `border-accent-gold`
- Scrollbars: warm gold at 20% opacity (matching `globals.css`)

Typography:
- Labels & buttons: IBM Plex Mono, 9-10px, uppercase, wide tracking
- Data values: IBM Plex Mono, 12-18px (larger for key numbers like force ratio)
- Section titles: IBM Plex Sans Condensed, 10px, bold, uppercase

### 2b. The Paper Layer (Commander's Assessment)

Used for: commander's assessment document at bottom of right panel.

This is styled after real VRS/ARBiH operational documents from the war — typed on manual typewriters, thin paper, classification markings.

Palette & effects:
- Background: `#ebe1cd` (warm cream/paper color)
- `paper-grain` CSS class overlay (SVG fractalNoise at 4% opacity)
- Border: `1px solid rgba(180,160,130,0.3)` — slightly more visible than panel borders
- Subtle `box-shadow: inset 0 2px 8px rgba(0,0,0,0.08)` — paper sitting on a surface
- Text: `#2a2520` (near-black, warm) — typed ink on paper
- Classification text: `#8a2020` (dark red) — stamped markings

Typography (all IBM Plex Mono to simulate typewriter):
- Header: 9px, bold, uppercase, tracking-wide
- Body: 11px, normal weight, line-height 1.6
- Classification: 8px, bold, uppercase, dark red

Document structure (modeled on actual VRS/ARBiH G-2 assessments):

```
┌─────────────────────────────────────────────┐
│ [Army Crest, small    G-2 INTELLIGENCE      │
│  20×20px]             ASSESSMENT             │
│                                  CONFIDENTIAL│
│ 1st Corps / Sector Igman    Ref. G2/014-95  │
│─────────────────────────────────────────────│
│                                              │
│ 1. ENEMY: Estimated 2 battalions entrenched  │
│    (MODERATE confidence). Terrain favors     │
│    defender. Heavy weapons detected at       │
│    OBJ ALPHA.                                │
│                                              │
│ 2. OWN FORCES: 3 brigades assigned, force    │
│    ratio 1.4:1. Supply adequate for 3-week   │
│    operation. 107th Mtn reports HIGH fatigue. │
│                                              │
│ 3. ASSESSMENT: Operation carries MODERATE    │
│    risk. Recommend METHODICAL tempo to       │
│    preserve force integrity. Expect COSTLY   │
│    VICTORY on primary axis.                  │
│                                              │
│ G-2 Officer                                  │
│ [Commander name if assigned]                 │
└─────────────────────────────────────────────┘
```

Key details:
- Small army crest (20×20px, desaturated ~50%) in top-left corner of the document
- "CONFIDENTIAL" stamp in dark red, top-right, slightly rotated (-2°) for authenticity
- Reference number generated from corps ID + turn number
- Numbered sections (matching Soviet-inherited format): ENEMY, OWN FORCES, ASSESSMENT
- Key words in assessment text are **emphasized** (uppercase or bold): outcome predictions, risk levels, tempo recommendations
- Commander's name at bottom if one is assigned to the operation
- The whole document has a slight `rotate(-0.3deg)` — imperceptible consciously but adds to the "paper on a table" feel

### 2c. Color & Animation Language

**Readiness bars** in the upper briefing panel use a three-stop gradient:
- Red (`#c24040`) at 0% → Amber (`#c4a35a`) at 50% → Green (`#4a9a55`) at 100%
- Bar background: `rgba(180,160,130,0.08)`
- Bar fill animates on value change: `transition: width 600ms ease-out`

**Outcome badges** use solid background pills:
- DECISIVE VICTORY: `bg-[#4a9a55]/20 text-[#4a9a55] border-[#4a9a55]/30`
- VICTORY: `bg-[#4a9a55]/15 text-[#5aaa65]`
- COSTLY VICTORY: `bg-[#c4a35a]/15 text-[#c4a35a]`
- STALEMATE: `bg-[#c4a35a]/10 text-[#9a9080]`
- REPULSED: `bg-[#c24040]/15 text-[#c24040]`
- CATASTROPHIC: `bg-[#c24040]/20 text-[#ff5555] font-black`

**Casualty numbers** use severity coloring:
- <200: `text-text-secondary` (muted — acceptable losses)
- 200-500: `text-[#c4a35a]` (amber — significant)
- 500-1000: `text-[#d4804a]` (orange — heavy)
- 1000+: `text-[#c24040]` (red — severe)

**The authorization moment** uses a darkening overlay:
- `bg-black` opacity animates from 0 → 0.15 over 800ms
- Casualty number in top bar scales 1.0 → 1.05 → 1.0 (200ms pulse)
- Commander assessment document gets a brief `border-glow` intensification
- After 1.5s: "DIRECTIVE AUTHORIZED" appears in gold, then screen closes

### 2d. Faction-Specific Touches

The crest and corps name already identify the faction. Additionally:

- The top bar's left border (2px) uses the faction color: RS red / RBiH green / HRHB blue
- The classification stamp on the assessment document uses faction-appropriate language:
  - RBiH: "POVJERLJIVO" (Confidential)
  - RS: "СТРОГО ПОВЕРЉИВО" (Strictly Confidential, Cyrillic)
  - HRHB: "POVJERLJIVO" (Confidential)
- The assessment document header includes the army's formal name:
  - RBiH: "ARMIJA REPUBLIKE BOSNE I HERCEGOVINE"
  - RS: "VOJSKA REPUBLIKE SRPSKE"
  - HRHB: "HRVATSKO VIJEĆE OBRANE"

These are small details but they make the player *feel* which side they're commanding. The document on the table belongs to a real army.

---

## 3. G-2 Panel: Live Engine Data

Everything in this panel comes from real engine computations. Nothing is hardcoded.

### 3a. Operation Summary (Always Visible)

Three horizontal readiness bars at the top:

**Intel Confidence**
- Source: `sector_intel` records for sectors containing target OSIDs
- Display: horizontal bar + qualitative label
- Labels: Blind (<20%), Fragmentary (20-40%), Partial (40-60%), Reliable (60-80%), Confirmed (80%+)
- Color: red → amber → green gradient

**Supply Readiness**
- Source: fraction of assigned brigades with adequate supply (from `supply_reserves` state)
- Display: horizontal bar + qualitative label
- Labels: Critical (<30%), Strained (30-50%), Adequate (50-70%), Strong (70-90%), Full (90%+)
- Color: red → amber → green gradient

**Force Ratio**
- Source: aggregate `estimateForceRatio()` across all axes — own brigade personnel vs estimated enemy personnel in target sectors
- Display: "1.4 : 1" numeric + qualitative label
- Labels: Inferior (<0.8), Contested (0.8-1.2), Favorable (1.2-1.8), Overwhelming (1.8+)
- Note: this is the *honest* number from sector intel, not commander-filtered

**Preparation Time**
- Source: `getPreparationMaxTurns(commander.aggressiveness)` from `operation_preparation.ts`
- Display: "Commander estimates X weeks to ready"
- Updates live when player changes commander selection

**Total Estimated Casualties**
- Source: sum of per-axis casualty predictions (see 3b)
- Display: single number, colored by severity
- Severity: <200 = text-secondary, 200-500 = amber, 500-1000 = orange, 1000+ = red

### 3b. Per-Axis Breakdown (Collapsed by Default)

Each axis shows one row in collapsed state:
- Axis color dot + name
- **Predicted outcome badge**: DECISIVE VICTORY / VICTORY / COSTLY VICTORY / STALEMATE / REPULSED / CATASTROPHIC
  - Source: `predictCombatOutcome()` from `combat_predictor.ts` for first objective on axis
  - Badge color: see §2c
- **Estimated casualties**: attacker-side losses for this axis
  - Source: `combat_math.ts` casualty calculation with actual power ratios
- Chevron to expand

Expanded state adds:
- **Axis force ratio**: this axis's brigades vs estimated defenders at first objective
- **Terrain**: dominant terrain type at objective OSID (Mountain / Urban / Open / Forest)
  - Source: OSID properties from `operational_settlements.geojson`
- **Entrenchment estimate**: Light / Moderate / Heavy / Unknown
  - Source: sector intel if confidence > 40%, else "Unknown"
- **Intel confidence**: for this specific sector
- **Supply status**: of brigades assigned to this axis specifically

### 3c. Commander's Assessment (Always Visible, Pinned Bottom)

Styled as an authentic military document (see §2b for full visual treatment).

Content is generated from real data, filtered through commander personality:

**Personality axes that affect commentary:**
- **Aggressiveness** (1-5): aggressive commanders downplay risks, emphasize opportunity. Cautious commanders highlight threats, recommend delay.
- **Competence** (1-5): competent commanders give specific, actionable assessments referencing terrain, force ratios, supply. Incompetent ones give vague reassurances or generic caution.

**Assessment document sections:**
1. ENEMY — situation summary (strength estimate, entrenchment, confidence qualifier)
2. OWN FORCES — assigned strength, force ratio, supply status, flagged issues (fatigued brigades, low supply)
3. ASSESSMENT — risk level, recommended tempo, predicted outcome, recommendation (launch/delay/abort)

**Examples by personality:**

*Aggressive (5), High competence (4)*:
```
1. ENEMY: Estimated 1 battalion, LIGHT entrenchment
   (RELIABLE confidence). Terrain open — no natural
   advantage to defender.

2. OWN FORCES: 4 brigades, ratio 2.1:1. Supply STRONG.
   All formations report combat effective.

3. ASSESSMENT: Conditions DECISIVE. Recommend ALL-OUT
   tempo. Window is narrow — enemy reinforcement
   expected within 2 weeks. LAUNCH IMMEDIATELY.
```

*Cautious (1), High competence (5)*:
```
1. ENEMY: Estimated 2+ battalions entrenched (PARTIAL
   confidence). Mountain terrain. Heavy weapons
   suspected but unconfirmed.

2. OWN FORCES: 3 brigades, ratio 1.2:1. Supply
   ADEQUATE. 107th Mtn reports fatigue above 60%.

3. ASSESSMENT: Operation carries SIGNIFICANT risk.
   Force ratio thin for mountain assault. Recommend
   METHODICAL tempo, extend preparation 2 weeks.
   REQUEST reconnaissance-in-force before commitment.
```

*Aggressive (4), Low competence (2)*:
```
1. ENEMY: Weak. Morale suspected low.

2. OWN FORCES: Ready. Men eager to fight.

3. ASSESSMENT: Attack. No reason to delay.
```

*Cautious (2), Low competence (1)*:
```
1. ENEMY: Strength unclear. Reports conflicting.

2. OWN FORCES: Situation uncertain.

3. ASSESSMENT: Concerns remain. Perhaps reconsider
   the operation scope.
```

**Implementation note**: Initially template-driven with variable slots. AI-generated commentary is a future enhancement that slots into the same document format.

---

## 4. IPC: New Prediction Query

The G-2 panel needs live predictions from the engine. This requires a new IPC channel.

### Request: `query-operation-prediction`

```typescript
interface OperationPredictionRequest {
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
```

### Response: `OperationPredictionResponse`

```typescript
interface OperationPredictionResponse {
  overall: {
    forceRatio: number;
    intelConfidence: number;
    supplyReadiness: number;
    totalEstimatedCasualties: number;
    preparationWeeks: number;
  };
  axes: Array<{
    axisId: string;
    predictedOutcome: 'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed' | 'catastrophic';
    forceRatio: number;
    estimatedCasualties: number;
    terrain: 'mountain' | 'urban' | 'open' | 'forest';
    entrenchment: 'light' | 'moderate' | 'heavy' | 'unknown';
    intelConfidence: number;
    supplyReadiness: number;
  }>;
  commanderAssessment: {
    recommendation: 'launch' | 'delay' | 'abort';
    text: string;
    preparationWeeks: number;
    requiredForceRatio: number;
    requiredIntelConfidence: number;
  };
}
```

### Backend Handler

1. Read current game state (formations, sector_intel, supply_reserves, named_officers)
2. For each axis:
   - Identify defending brigades in target sectors (from sector intel)
   - Call `predictCombatOutcome()` with attacker brigades vs estimated defenders
   - Call casualty estimation from `combat_math.ts`
   - Read terrain from OSID properties
   - Read entrenchment from sector intel records
3. Aggregate across axes for overall numbers
4. Generate commander assessment text from template + personality + data
5. Return response

**Performance**: This query reads state but doesn't mutate it. Should complete in <50ms. Called on every plan change but can be debounced (200ms) to avoid flooding during rapid edits.

---

## 5. UX Polish

### 5a. The Authorization Moment

When the player clicks AUTHORIZE:
1. Button enters "confirming" state — text changes to total estimated casualties number
2. Screen subtly darkens (overlay opacity 0 → 0.15 over 800ms)
3. Commander's assessment document gets a brief `border-glow` intensification
4. Casualty estimate pulses once (scale 1.0 → 1.05 → 1.0)
5. After 1.5 seconds, order transmits
6. Brief "DIRECTIVE AUTHORIZED" confirmation in gold, then screen closes

No confirmation dialog. The player already decided. This is just a beat of gravity — "you signed this."

### 5b. Consequence Echo

When the player opens the ops planning screen for a NEW operation, if the corps has a recently completed operation (within last 4 turns), a slim banner appears at the top:

> "Last operation: CORRIDOR 92 — Costly Victory. 1,247 casualties. Commander Galić: 'Objectives achieved, but the cost was high.'"

One line. Fades after 5 seconds or on any interaction. Connects planning to outcomes. Makes the next plan feel heavier.

Data source: `CorpsOperation` history on corps state (completed operations with outcome + casualties).

### 5c. Brigade Fitness Stripe

Each brigade card in the bottom force shelf gets a 3px left border indicating readiness:
- **Green** (`#4a9a55`): personnel ≥ 80% TOE, cohesion ≥ 60, fatigue ≤ 30
- **Amber** (`#c4a35a`): any one condition failing
- **Red** (`#c24040`): personnel < 400 (combat ineffective) OR cohesion < 20 OR fatigue > 70

This already exists in the `TacticalCard` component (cohesion/fatigue bars). The fitness stripe is an at-a-glance summary that doesn't require reading individual stats.

### 5d. Commander Preview in Selection

When hovering/selecting a commander in the CommanderSelectionModal, show a preview card:
- Name, rank, competence/aggressiveness ratings (already shown)
- **NEW**: "Preparation: ~X weeks" (from `getPreparationMaxTurns`)
- **NEW**: "Minimum force ratio: X:1" (from `getRequiredForceRatio`)
- **NEW**: "Intel threshold: X%" (from `getRequiredConfidence`)
- **NEW**: One-line personality summary: "Aggressive and competent — will launch fast with moderate preparation" / "Cautious and methodical — expects thorough intelligence before committing"

This lets the player understand that picking a commander isn't cosmetic — it reshapes the operation's character, timeline, and risk profile.

---

## 6. Data Flow

```
Player modifies plan (axes, brigades, objectives, commander)
  ↓
OpsPlanningModal detects change (useEffect on plan state)
  ↓
Debounce 200ms
  ↓
IPC: query-operation-prediction(planState)
  ↓
Backend: reads game state, runs combat_predictor, generates assessment
  ↓
Response: OperationPredictionResponse
  ↓
G2 Panel re-renders with real data
  ↓
Axis arrows on map update glow color based on predicted outcome
  ↓
Commander assessment document re-generates with new data + personality filter
```

State never mutates during prediction. The query is read-only against current game state.

---

## 7. What Changes vs Current

| Component | Current | After |
|-----------|---------|-------|
| Screen identity | Generic "Operations Command" | Army crest + corps name + faction color |
| G-2 odds | Hardcoded 65% base | Real `predictCombatOutcome()` per axis |
| G-2 casualties | Hardcoded axis×500 | Real `combat_math` predictions |
| G-2 duration | Hardcoded axis×2 weeks | Real `getPreparationMaxTurns()` |
| G-2 SIGINT | Hardcoded 88% | Real `sector_intel` confidence |
| Supply readiness | Not shown | Real brigade supply fraction |
| Force ratio | Not shown | Real `estimateForceRatio()` |
| Terrain | Not shown | Real OSID properties |
| Entrenchment | Not shown | Real sector intel estimate |
| Commander assessment | Not shown | Authentic military document, personality-filtered |
| Per-axis breakdown | Not available | Collapsible cards with outcome + casualties |
| Authorization | Instant close | Weight pause with casualty focus |
| Consequence echo | None | Previous op result banner |
| Brigade fitness | Individual stat bars only | At-a-glance color stripe |
| Commander preview | Name + ratings only | Mechanical impact preview |
| Risk tolerance | UI-only, not sent | Maps to `min_attack_outcome` on payload |
| Axis arrow color | Static | Outcome-driven glow |
| Assessment visual | N/A | Paper document with faction crest, classification stamp, Bosnian war format |
| Faction identity | None | Army crest, corps name, faction accent color, native language labels |

---

## 8. Implementation Phases

### Phase 1: IPC + Backend Prediction
- New `query-operation-prediction` IPC handler
- Wires `combat_predictor.ts`, `sector_intel`, `supply_reserves`, `operation_preparation.ts`
- Returns `OperationPredictionResponse`
- Unit tests for prediction handler

### Phase 2: G-2 Panel Rebuild
- Replace hardcoded G2ForecastPanel with real data consumer
- Summary bars (intel, supply, force ratio)
- Per-axis collapsible cards (outcome, casualties, terrain, entrenchment)
- Debounced IPC calls on plan change
- Axis arrow glow on map

### Phase 3: Commander Assessment + Faction Identity
- Template-driven text generation from personality + data
- Paper-styled assessment document component
- Army crest integration in top bar and assessment
- Faction-specific classification stamps and language
- Corps name display
- Personality summary in CommanderSelectionModal
- Commander mechanical preview (prep time, thresholds)

### Phase 4: UX Polish
- Authorization weight pause with casualty focus
- Consequence echo banner
- Brigade fitness stripe
- Risk tolerance → min_attack_outcome mapping
- Map paper-grain texture overlay
- Vignette shadow on map edges

---

## 9. Files Affected

**New files:**
- `src/ui/map/components/plan_ui/G2BriefingPanel.tsx` (replaces G2ForecastPanel)
- `src/ui/map/components/plan_ui/AxisAssessmentCard.tsx` (per-axis collapsible)
- `src/ui/map/components/plan_ui/CommanderAssessmentDoc.tsx` (paper-styled document)
- `src/ui/map/components/plan_ui/ReadinessBar.tsx` (reusable readiness indicator)
- `src/ui/map/components/plan_ui/assessmentTemplates.ts` (personality-driven text generation)
- `src/sim/combat/operation_prediction.ts` (backend prediction query logic)
- IPC handler in desktop main process

**Modified files:**
- `src/ui/map/components/OpsPlanningModal.tsx` — wire new G2BriefingPanel, debounced prediction calls, army crest + corps identity
- `src/ui/map/components/plan_ui/CommandTopBar.tsx` — army crest, corps name, faction accent
- `src/ui/map/components/plan_ui/OpsMapRenderer.ts` — axis arrow glow based on outcome, paper-grain overlay
- `src/ui/map/components/TacticalCard.tsx` — fitness stripe
- `src/ui/map/components/CommanderSelectionModal.tsx` — mechanical preview
- `src/ui/map/desktop/useIPC.ts` — new `queryOperationPrediction` method
- `src/desktop/` — IPC handler registration

**Not modified:**
- `combat_predictor.ts`, `combat_math.ts`, `sector_intel.ts`, `operation_preparation.ts` — consumed as-is, no changes needed

---

## 10. Reference: Real VRS/ARBiH Order Format

The commander's assessment document format is based on actual military orders from the Bosnian war. The VRS and ARBiH inherited the Soviet/JNA combat order structure (*borbena zapovest*). A typical order contained:

```
[ARMY/CORPS DESIGNATION]          [CLASSIFICATION]
[Location]                        [Reference No.]
                                  [Date]

[ORDER TITLE]

1. THE ENEMY — situation, positions, strength, intentions
2. DECISION — commander's concept, main/supporting axes
3. TASKS TO SUBORDINATE UNITS — specific unit assignments
4. FIRE SUPPORT — artillery, ammunition, coordination
5. COOPERATION — inter-unit coordination, boundaries
6. COMMAND AND SIGNALS — CP locations, frequencies, codes
7. REAR SERVICES — supply, medical, ammunition

COMMANDER
[Rank and Name]
[Signature]
```

Our G-2 assessment uses a simplified version (sections 1-3 only: ENEMY, OWN FORCES, ASSESSMENT) since it's an intelligence brief, not an operational order. The operational order is what the player is *building* on the left panel — the assessment is what their intelligence officer hands them before they sign it.

Sources:
- ICTY Krstić Judgment (IT-98-33-T), §§ on Directive 7 and Krivaja 95
- Srebrenica Military Narrative (NSA/DocumentCloud)
- ICTY VRS Military Structure exhibit (Borovčanin case)
