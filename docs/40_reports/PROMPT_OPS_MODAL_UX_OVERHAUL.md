# Ops Modal UX Overhaul — Implementation Prompt

> **Role**: UI/UX Developer with access to `/ui-ux-developer` skill
> **Scope**: Mockups 2–5 only (parameter strip, brigade cards, G-2 phase, ops modal flow). NOT the War Room layout (mockup 1).
> **Rule**: NO simulation logic changes. All changes are presentation-layer only — Tailwind classes, JSX structure, tooltip text, new sub-components. State shapes and IPC payloads stay identical.

---

## Required Reading (read ALL before writing any code)

| Priority | File | Why |
|----------|------|-----|
| 1 | `docs/40_reports/UI_UX_AUDIT_20260325.md` | Full audit with 33 sections. Sections 15.3, 22–26 are your primary spec. |
| 2 | `docs/60_visualisations/mockup_02_parameter_strip.html` | Interactive before/after — open in browser |
| 3 | `docs/60_visualisations/mockup_03_brigade_cards.html` | Interactive before/after — open in browser |
| 4 | `docs/60_visualisations/mockup_04_g2_redesign.html` | Interactive before/after — open in browser |
| 5 | `docs/60_visualisations/mockup_05_ops_modal_flow.html` | Full 4-phase walkthrough — open in browser |
| 6 | `src/ui/map/components/ops_modal/types.ts` | Shared types, label maps, phase order |
| 7 | Every `.tsx` file in `src/ui/map/components/ops_modal/` | The code you're changing |

---

## Work Package 1: Parameter Strip (PlanParameters.tsx)

**File**: `src/ui/map/components/ops_modal/PlanParameters.tsx` (124 lines)
**Mockup**: `mockup_02_parameter_strip.html`
**Audit ref**: Section 15.3 — "THE PARAMETER STRIP — Critical Design Failure"

### Current state
- 15 pill buttons across 4 groups (TYPE, TEMPO, TOLERANCE, SUPPORT)
- Zero `title` attributes, zero subtitles, zero tooltips
- Group labels at 7px — say "Type", "Tempo", "Tolerance", "Support" with no explanation
- `REGARDLESS` tolerance looks identical to other pills — no danger indication
- Artillery prep toggle shows ◇/◆ with no cost or effect info

### Changes required

**1a. Group-level descriptions** — Change `ParamGroup` label prop and rendering:
```
Current:  <span>Type</span>
Proposed: <span>Type</span> + <span class="description">What kind of operation?</span>
```
Group descriptions:
- TYPE → "What kind of operation?"
- TEMPO → "Speed vs. casualties tradeoff"
- TOLERANCE → "When do brigades stop attacking?"
- SUPPORT → "Pre-assault fire support"

**1b. Per-pill subtitles** — Add a subtitle data map and render below each pill label:

| Pill | Subtitle |
|------|----------|
| SECTOR ATTACK | "One sector push" |
| GENERAL OFFENSIVE | "Corps-wide assault" |
| STRATEGIC DEFENSE | "Hold and absorb" |
| REORGANIZATION | "Rest and refit" |
| FEINT | "Fake attack, draw reserves" |
| PROBE | "Recon in force" |
| METHODICAL | "Slower, fewer losses" |
| STANDARD | "Balanced approach" |
| ALL-OUT | "Fast, heavy casualties" |
| DECISIVE ONLY | "Only if overwhelming (2.0×)" |
| VICTORY REQUIRED | "Only if clear win (1.5×)" |
| ACCEPT COSTLY | "Continue through losses (1.0×)" |
| ACCEPT STALEMATE | "Continue through draws (0.7×)" |
| REGARDLESS | "⚠ Attack into defeat (0.5×)" |

Subtitles: 7px, `text-text-secondary/50` (dimmer than label), visible at all times (not hover-only).

**1c. `title` attributes** — Every pill button gets a `title` with a one-sentence explanation. Example:
```
title="Sector Attack — Commits 3-8 brigades to push on a single sector front. Lowest risk. 4-8 turns typical."
```

**1d. REGARDLESS danger treatment** — When `plan.tolerance === 'repulsed'`:
- Use red pill class instead of gold: `bg-red-500/15 text-red-400 border border-red-400/30`
- Add CSS keyframe pulse: `@keyframes dangerPulse { 0%,100% { box-shadow: 0 0 4px rgba(239,68,68,0.1) } 50% { box-shadow: 0 0 12px rgba(239,68,68,0.3) } }`
- Subtitle in red: `text-red-400/70`

**1e. Artillery prep info** — Below the ◆/◇ toggle, show:
- When OFF: `text-[7px] text-text-secondary/40` → "No bombardment"
- When ON: `text-[7px] text-red-400/60` → "~200 rounds · +15% attack"

### STOP AND ASK
- If the pill subtitles cause layout overflow on < 1400px viewports, ask how to handle (truncate vs wrap vs hide below breakpoint)
- If you need to change `ParamGroup` interface, that's fine — it's a local component, not exported

---

## Work Package 2: Brigade Cards (BrigadeCard.tsx)

**File**: `src/ui/map/components/ops_modal/BrigadeCard.tsx` (112 lines)
**Mockup**: `mockup_03_brigade_cards.html`
**Audit ref**: Section 22 — "Brigade Cards: 'A:1' Misleads as Attack Rating"

### Current state
- "T:" and "A:" for tanks and artillery — "A:1" reads as "Attack: 1"
- COH/FAT at `text-[7px] text-text-secondary/50` — effectively invisible
- No unit type indicator
- No verbal cohesion descriptor
- No current location
- ~40px wasted space at bottom of 140px card

### Changes required

**2a. Equipment labels** — Replace single-letter abbreviations:
```tsx
// CURRENT (line 79-81):
{tanks > 0 && <span>T: <span className="text-white font-bold">{tanks}</span></span>}
{arty > 0 && <span>A: <span className="text-white font-bold">{arty}</span></span>}

// PROPOSED:
<span>TANKS <span className="text-white font-bold">{tanks}</span></span>
<span className="text-text-secondary/30">·</span>
<span>ARTY <span className="text-white font-bold">{arty}</span></span>
```
Always show both (even when 0) — "TANKS 0 · ARTY 1" is unambiguous.

**2b. Cohesion/Fatigue readability** — Change from 7px/50% to 9px/100%:
```tsx
// CURRENT (line 94):
<div className="flex justify-between text-[7px] text-text-secondary/50 mt-0.5">

// PROPOSED:
<div className="flex justify-between text-[9px] text-text-secondary mt-0.5">
```

**2c. Verbal cohesion descriptor** — Add after cohesion number:
```tsx
function getCohesionLabel(coh: number): { text: string; color: string } {
    if (coh >= 70) return { text: 'STRONG', color: 'text-green-400' };
    if (coh >= 40) return { text: 'ADEQUATE', color: 'text-amber-400' };
    return { text: 'CRITICAL', color: 'text-red-400' };
}
```
Render: `COH 55 ADEQUATE` with ADEQUATE in amber.

**2d. Fatigue descriptor**:
```tsx
function getFatigueLabel(fat: number): { text: string; color: string } {
    if (fat <= 2) return { text: 'FRESH', color: 'text-green-400' };
    if (fat <= 5) return { text: 'TIRED', color: 'text-amber-400' };
    return { text: 'EXHAUSTED', color: 'text-red-400' };
}
```

**2e. Unit type indicator** — The `brigade.name` often contains the type (Motorized, Mountain, Light Infantry). Extract or use `brigade.unit_type` if available on `FormationView`. If not available on the type, parse from name as fallback. Show as 8px gold uppercase label below the name:
```
94th Motorized Bde        ← name (10px bold white)
MOTORIZED INFANTRY        ← type (8px gold uppercase)
```

**2f. `title` attribute on the card button** — Add comprehensive tooltip:
```tsx
title={`${brigade.name}\nPersonnel: ${personnel.toLocaleString()}\nTanks: ${tanks} · Artillery: ${arty}\nCohesion: ${Math.round(cohesion)} · Fatigue: ${Math.round(fatigue)}\nMarch: ${marchTurns === 0 ? 'In position' : `${marchTurns} turns`}`}
```

**2g. Combat ineffective treatment** — Currently the overlay text is at `text-red-400/60 rotate-[-15deg]`. Also add a red left border:
```tsx
// When isUnavailable && isCombatIneffective, add:
style={{ borderLeftColor: '#c24040', borderLeftWidth: '3px' }}
```

### STOP AND ASK
- If `FormationView` doesn't have a `unit_type` field, ask whether to add it to the adapter or parse from name
- If card height 140px can't fit the new content, ask before increasing (suggest 160px)

---

## Work Package 3: G-2 Phase (G2Phase.tsx, NarrativeTab.tsx, RawIntelTab.tsx)

**Files**:
- `src/ui/map/components/ops_modal/G2Phase.tsx` (142 lines)
- `src/ui/map/components/ops_modal/NarrativeTab.tsx`
- `src/ui/map/components/ops_modal/RawIntelTab.tsx`

**Mockup**: `mockup_04_g2_redesign.html`
**Audit ref**: Section 24 — "G-2 Phase: Cream Text Fails WCAG AA"

### Changes required

**3a. Widen clipboard** — In `G2Phase.tsx` line 47:
```tsx
// CURRENT:
<div className="absolute top-16 right-4 bottom-4 w-[360px] pointer-events-auto

// PROPOSED:
<div className="absolute top-16 right-4 bottom-4 w-[480px] pointer-events-auto
```

**3b. WCAG contrast fix** — In `G2Phase.tsx` line 55-56, change paper colors:
```tsx
// CURRENT paper body:
bg-[#f0e8d8]  border-[#c0b090]

// PROPOSED:
bg-[#faf6ef]  border-[#c0b090]
```
In `NarrativeTab.tsx`, update ALL text colors on parchment:
```
#4a4238 → #2a2218  (body text)
#3a3228 → #1a1610  (headings)
#5a4e3e → #3a3228  (secondary)
#6a5e4e → #4a4238  (tertiary)
```
This brings contrast from ~3.5:1 to ~5.2:1, passing WCAG AA.

**3c. Add Map Legend tab** — New third tab in `G2Phase.tsx` alongside "Assessment" and "Raw Intel":
```tsx
type G2Tab = 'assessment' | 'raw_intel' | 'map_legend';
```
Create `MapLegendTab.tsx` as a new component showing:
- Territory colors (friendly/enemy/contested)
- Front line styles (corps front gold, other front gray)
- Operation markers (objective red, schwerpunkt gold star, staging green)
- Selection states (selectable vs out of range)
- Terrain modifiers (mountain, forest, urban, river — with defense bonus %)

Use the parchment styling to match the other tabs.

**3d. Quick Assessment summary box** — In `NarrativeTab.tsx`, add a bordered summary box ABOVE the narrative sections:
```tsx
{prediction && (
    <div className="mb-4 p-3 rounded border border-[#c0b090] bg-[#f0ead8]">
        <div className="text-[9px] font-bold uppercase tracking-wider text-[#1a1610] mb-2">Quick Assessment</div>
        <div className="grid grid-cols-2 gap-1 text-[9px]">
            <span>Force Ratio</span><span className="font-bold">{prediction.overall.forceRatio.toFixed(1)}:1</span>
            <span>Intel Confidence</span><span className="font-bold">{Math.round(prediction.overall.intelConfidence * 100)}%</span>
            <span>Predicted</span><span className="font-bold">{prediction.overall.predictedOutcome}</span>
            <span>Recommendation</span><span className="font-bold">{prediction.overall.recommendation}</span>
        </div>
    </div>
)}
```
Pass `prediction` to `NarrativeTab` — check if it's already available via props.

**3e. Inline translations** — In `NarrativeTab.tsx`, after each B/C/S section header, add English:
```
Current:  "1. NEPRIJATELJ"
Proposed: "1. NEPRIJATELJ — Enemy Forces"
```
Translations:
- NEPRIJATELJ → Enemy Forces
- VLASTITE SNAGE → Own Forces
- PROCJENA → Assessment
- ZAKLJUČAK → Conclusion

**3f. Recommendation reasoning** — In `RawIntelTab.tsx`, below the recommendation badge, add a one-line reason. This requires the prediction result to include reasoning text. Check `usePrediction.ts` — if the prediction already computes factors (force ratio, terrain, supply), format them as a sentence:
```
"LAUNCH — Force ratio 2.0:1 favorable, terrain mixed, supply adequate"
```
If the data isn't available in the prediction result, add a `getRecommendationReasoning(prediction)` helper that synthesizes from available fields.

### STOP AND ASK
- If `PredictionResult` type doesn't have the fields needed for the summary box, list what's available and ask how to proceed
- If `NarrativeTab` doesn't receive `prediction` as a prop, ask whether to thread it through or restructure

---

## Work Package 4: Ops Modal Flow (OpsPlanningModal.tsx, CommanderPhase.tsx, AuthorizePhase.tsx, ObjectiveList.tsx)

**Files**: Multiple — the orchestrator and 3 phase components
**Mockup**: `mockup_05_ops_modal_flow.html`
**Audit ref**: Sections 22–26, bugs B5/B6/B7/B14

### 4a. FIX: Pointer-events click bug (B5 + B6) — CRITICAL

**Root cause**: `CommanderPhase.tsx` line 118:
```tsx
<div className="absolute inset-0 z-10 flex items-end justify-center pb-8 pointer-events-none">
```
The `pointer-events-none` on the parent means clicks pass through to the MapLibre canvas underneath. The inner `pointer-events-auto` elements SHOULD receive clicks, but the MapLibre canvas at z-index below intercepts them first on some browsers/Electron.

**Fix approach** (investigate in this order):
1. Add `pointer-events-none` to the OpsMap canvas container when NOT in plan phase (or always, and relay clicks via JS)
2. Or: wrap each phase in a `pointer-events-auto` container that covers the full area, not just the inner panels
3. Or: use `onPointerDown` instead of `onClick` which may propagate differently

The same issue affects map clicks in Plan phase (`handleOsidClick` in OpsPlanningModal). The OpsMap component handles its own clicks — verify the click handler chain: MapLibre `map.on('click')` → `handleMapClick` → `onOsidClick` prop → `handleOsidClick` in OpsPlanningModal.

**STOP AND ASK before implementing** — describe the pointer-events fix you intend to make and get approval. This is the highest-risk change.

### 4b. Commander confirmation step

**File**: `CommanderPhase.tsx` line 112-115
**Current**: `handleSelectOfficer` calls `setSelectedOfficer` + `onAdvance()` immediately — one click, no undo.

**Fix**: Add local state `pendingOfficerId`. Clicking a card sets `pendingOfficerId` (highlights the card with gold border). Show a confirmation bar at the bottom:
```
"Selected: Col. Momir Talić (HOME CORPS) — [CONFIRM & PROCEED →]  [Cancel]"
```
Only call `setSelectedOfficer` + `onAdvance()` on confirm click.

### 4c. Phase stepper enlargement

**File**: `OpsPlanningModal.tsx` lines 278-306

Current phase dots: `w-2.5 h-2.5` (10px = ~2.5 Tailwind units → 10px).
Change to: `w-3 h-3` minimum, or `w-4 h-4` for better touch targets.

Current phase labels: `text-[9px]` — this is fine, but add a keyboard hint:
```tsx
<span className="text-[7px] text-text-secondary/30 ml-1">{i + 1}</span>
```
Shows "1" "2" "3" "4" next to each label as keyboard shortcut hint.

### 4d. Close button enlargement

**File**: `OpsPlanningModal.tsx` lines 340-349

```tsx
// CURRENT:
className="... w-8 h-8 ..."

// PROPOSED:
className="... w-10 h-10 ..."
title="Close operations planning (ESC) — draft will be lost"
```

### 4e. ObjectiveList: always-visible controls

**File**: `ObjectiveList.tsx` lines 90-114

Remove `opacity-0 group-hover:opacity-100` from reorder and remove buttons:
```tsx
// CURRENT (lines 94, 102, 111):
className="... opacity-0 group-hover:opacity-100"

// PROPOSED — remove opacity-0, keep hover color change:
className="... text-text-secondary/40 hover:text-white"  // reorder
className="... text-text-secondary/40 hover:text-red-400"  // remove
```

### 4f. ObjectiveList: per-objective terrain info

Below each objective name, show terrain type and defense modifier if available. This requires terrain data per OSID — check if `loadedGameState` has terrain scalars keyed by OSID. If available, show:
```
1. ★ Jajce
   Mixed terrain · ~1,200 est. defenders · Urban +50%
```
As `text-[8px] text-text-secondary/60` below the name line.

**STOP AND ASK** if terrain data per OSID isn't readily available — don't build a new data pipeline for this.

### 4g. AuthorizePhase: Operation Summary panel

**File**: `AuthorizePhase.tsx`

Add a summary panel to the LEFT of the OPORD document. Use the data already computed in the component (`allObjs`, `allBrigades`, `plan.*`, `prediction`):

```tsx
<div className="flex gap-6 items-start">
    {/* NEW: Summary panel */}
    <div className="w-[280px] bg-[rgba(20,18,15,0.92)] backdrop-blur-xl rounded-lg
                    border border-[rgba(180,160,130,0.15)] p-4 text-[10px]">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3">
            Operation Summary
        </div>
        {/* Commander, type, tempo, tolerance, brigade count, personnel total,
            objective list, schwerpunkt, staging, G-2 prediction, est casualties */}
    </div>

    {/* EXISTING: OPORD document */}
    <div className="relative z-10 max-h-[80vh] overflow-y-auto">
        <OpordDocument ... />
    </div>
</div>
```

### 4h. AuthorizePhase: probe customization

**File**: `AuthorizePhase.tsx` lines 127-139

**Current**: `handleProbe` hardcodes `allBrigades.slice(0, 3)` and `allObjs.slice(0, 1)`.

**Fix**: Add a `probeMode` state. When player clicks "Order Probe", show a selection UI instead of immediately submitting:
```tsx
const [probeMode, setProbeMode] = useState(false);
const [probeBrigades, setProbeBrigades] = useState<string[]>([]);
const [probeObjective, setProbeObjective] = useState<string>('');
```
Show: checkboxes for brigade selection (max 3), radio for objective (pick 1).
Then submit with selected values instead of hardcoded slices.

**STOP AND ASK** — this is medium complexity. Confirm scope before building the selection UI.

### 4i. AuthorizePhase: skip animation button

**File**: `AuthorizePhase.tsx` line 57

After the stamp animation starts, show a skip button:
```tsx
{isStamped && !transmitted && (
    <button onClick={() => { /* skip delay, set transmitted */ }}
            className="text-[9px] text-text-secondary/50 hover:text-text-secondary">
        Skip animation →
    </button>
)}
```

### 4j. OpsMap: compact map legend (Plan phase)

**File**: `src/ui/map/components/ops_modal/OpsMap.tsx`

Add a floating legend in the bottom-left corner, only visible when `enabled={true}` (Plan phase):
```tsx
{enabled && (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-auto
                    bg-[rgba(20,18,15,0.85)] backdrop-blur-sm rounded-md
                    border border-[rgba(180,160,130,0.15)] px-3 py-2 text-[8px]">
        <div className="text-accent-gold font-bold uppercase tracking-wider mb-1">Legend</div>
        <div className="space-y-0.5 text-text-secondary">
            <div>🔴 Objective · ★ Schwerpunkt · 🟢 Staging</div>
            <div>━ Corps front · Bright = selectable · Dim = out of range</div>
        </div>
    </div>
)}
```

---

## Execution Order

1. **WP4a first** — Fix pointer-events. Without this, the modal is untestable.
2. **WP1** — Parameter strip (highest audit severity, self-contained file)
3. **WP2** — Brigade cards (self-contained file)
4. **WP3** — G-2 phase (3 files, moderate complexity)
5. **WP4b–4j** — Remaining flow fixes (lower risk, can be incremental)

## Verification

After each work package:
1. `npx tsc --noEmit` — must pass
2. `npm run desktop:map:build` — must build
3. Visual check: open ops modal in the app (`npm run dev:map` or `npm run desktop`), walk through all 4 phases

## Constraints

- **NO sim logic changes** — don't touch `src/sim/`, `src/state/`, `src/scenario/`
- **NO IPC payload changes** — `CorpsOperationOrderPayload` stays identical
- **NO new npm dependencies** — everything is Tailwind + inline styles
- **Determinism is sacred** — but this is UI-only, so determinism isn't at risk
- **Preserve B/C/S language** — the Bosnian/Croatian/Serbian military terms stay. Add translations ALONGSIDE, never replace.
