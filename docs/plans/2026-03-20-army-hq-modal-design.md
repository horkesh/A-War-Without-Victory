# Army HQ Modal — Design Spec

**Date:** 2026-03-20
**Status:** Draft
**Author:** Pyrrhic Games (brainstorm session — UI/UX Developer, Modern Wargame Expert, Game Designer)

---

## 1. Purpose

The Army HQ modal is the player's primary interactive command center. It replaces the read-only `ArmyDetail` info panel with a self-contained, deeply drillable interface for commanding their army. It does NOT delegate to existing panels — all drill-down happens inside the modal.

**Design thesis:** The HQ should make the player feel like a real wartime commander — too few good officers, too many crises, every decision a trade-off. The player opens the HQ hoping to project power; what they find is constrained agency.

**Success criterion:** The player can answer "what needs my attention right now?" within 3 seconds of opening the modal.

---

## 2. Visual Concept: War Room Table

A dark wood command table surface. Cards laid out in a clean grid — cream paper stock on dark wood. No scattered layout, no rotation on cards (stamps rotate, cards don't). Atmosphere comes from texture and typography, not decorative chaos.

### Surface
- Dark wood grain background: CSS gradient `#2a2016` → `#1e1810` with repeating-linear-gradient overlays for grain
- Subtle vignette at edges (radial gradient darkening)
- No cork, no canvas — wood is the surface

### Cards
- Cream card stock: `#f0e8d8` → `#e4dcc8` gradient
- Flat on table — shadow underneath (`2px 3px 8px rgba(0,0,0,0.4)`)
- No pins, no tacks — cards are laid, not pinned
- Rubber stamp overlays: rotated 3-5deg, 65% opacity, border + text only (OFFENSIVE, BESIEGING, OVEREXTENDED, CRITICAL, READY)
- Hotspot badges inline: small pills for BATTLE (red), ADVANCE (green), RETREAT (amber)

### Typography
- Headings: Georgia serif, uppercase, letter-spaced
- Data values: `Courier New` monospace, bold
- Labels: system sans-serif, 10px uppercase, muted color
- Annotations: italic serif, 70% opacity (flavor text only — not functional content)

### Assets to generate (Gemini Pro)
- Dark wood table texture (tileable, 512x512, subtle grain)
- Optional: weathered paper card texture (tileable, subtle noise)
- Optional: coffee ring stain (single, subtle, placed once)

---

## 3. Layout Structure

Full-screen modal overlay (GlassPanel `position="overlay"`, dark backdrop).

```
+------------------------------------------------------------------+
| [Alert Strip]  pending actions, hotspots, urgent items            |
+------------------------------------------------------------------+
| [Army Commander]              | [Strategic Situation]             |
| Name, rank, stats, record     | Territory %, personnel, ops,      |
| ICTY badge if applicable      | exhaustion, this-week summary     |
+------------------------------------------------------------------+
| [Corps Grid — all corps cards visible]                            |
|                                                                   |
| +------------------+ +------------------+ +------------------+    |
| | 1st Krajina      | | SRK Sarajevo     | | Drina Corps      |   |
| | Talic, 18.2k     | | Galic, 14.8k     | | Zivanovic, 8.9k  |   |
| | [OFFENSIVE]       | | [BESIEGING]       | | [OVEREXTENDED]    |  |
| +------------------+ +------------------+ +------------------+    |
| +------------------+ +------------------+ +------------------+    |
| | Herzegovina      | | East Bosnia      | | 2nd Krajina      |   |
| | Grubac, 11.6k    | | Simic, 12.1k     | | Boric, 9.8k     |   |
| | [DEFENSIVE]       | | [BALANCED]        | | [BALANCED]        |  |
| +------------------+ +------------------+ +------------------+    |
|                                                                   |
+------------------------------------------------------------------+
| [Breadcrumb: HQ Overview]                          [ESC to close] |
+------------------------------------------------------------------+
```

### Responsive behavior
- 1920x1080: 3 corps cards per row
- 1366x768: 2 corps cards per row, alert strip compact
- Corps count varies by faction (RBiH 5-7, RS 6, HRHB 3-4) — CSS grid with `auto-fill, minmax(280px, 1fr)`

---

## 4. Components

### 4.1 Alert Strip

Fixed at the top of the modal. Surfaces actionable items the player should address this turn.

**Content (conditional, only shown when relevant):**
- Pending officer events: "2 officers awaiting your decision"
- Operations ready: "Op Corridor 92 ready to launch — awaiting go/no-go"
- Corps at critical state: "Drina Corps at 41% cohesion — OVEREXTENDED"
- Battles this turn: "4 battles fought this week"

**Interaction:** Each alert is clickable — scrolls to and highlights the relevant corps card, or opens the relevant drill-down.

**Visual:** Dark strip with gold left-border per alert item. Compact single line per alert. Dismiss individual alerts with X.

### 4.2 Army Commander Card

Wide card spanning the left ~60% of the top row. Shows the faction's army commander.

**Content:**
- Rank insignia (stars, matching existing `OfficerProfile` CSS)
- Name + archetype (e.g., "Gen. Ratko Mladic — Zealous Aggressor")
- Stat grid: Competence, Aggressiveness, Defensive Skill (pip bars, reuse `OfficerProfile` format)
- Combat record: battles, victories, win rate
- War crimes badge if applicable (ICTY INDICTED / CONVICTED)
- Tenure: weeks in command

**Interaction:** Click to expand — shows full officer dossier (experience points, skill drift history, operations commanded). Action button: "View Full Dossier."

### 4.3 Strategic Situation Card

Right ~40% of the top row. Faction-wide strategic overview.

**Content:**
- Territory: area-weighted percentage (reuse `BottomStatusStrip` calculation)
- Total personnel across all corps
- Active brigades count
- Active operations count
- War exhaustion index (bar + percentage)
- Supply reserves (general + heavy munitions bars)
- This week summary: battles fought, OSIDs gained/lost, casualties

**Interaction:** No drill-down. Pure information. This week summary uses hotspot badges (BATTLE, ADVANCE, RETREAT).

### 4.4 Corps Card (collapsed)

One per corps. Shows at-a-glance triage information.

**Content hierarchy (following UoC2 card pattern):**
- Line 1 (large): Corps name + region subtitle
- Line 2 (medium): Commander name + competence grade (A-F letter, color-coded)
- Line 3: Personnel (color-coded by threshold: ≥8k green, ≥4k amber, <4k red) + brigade count + sector count
- Cohesion bar: full-width 3px bar at card bottom (green/amber/red)
- Stamp overlay: corps stance (OFFENSIVE / DEFENSIVE / BALANCED / REORGANIZE) or status (BESIEGING / OVEREXTENDED / CRITICAL)
- Active operation indicator: op name + phase badge (EXECUTING / STALLED / PREPARING / RECOVERY)

**Visual weight by health:** Cards with critical issues get a subtle red left-border (3px). Healthy cards get no accent. This creates immediate visual triage without reading numbers.

### 4.5 Corps Card (expanded)

Click a corps card → it expands vertically in-place. Other cards compress to show only Line 1 (name + commander grade), keeping all corps labeled and visible.

**Expanded content is organized as collapsible sections (pages):**

#### Section: Commander
- Full `OfficerProfile` (reuse existing component, non-compact mode)
- Action buttons: **Replace Commander** (opens inline officer selection), **Dismiss Officer** (with confirmation)
- If acting commander: prominent "NO NAMED COMMANDER" warning + "Assign from Pool" button

#### Section: Sectors
- List of sector sub-cards, each showing:
  - Sector name + hotspot badge (BATTLE / QUIET / UNDER PRESSURE)
  - Brigade count (assigned + reserve)
  - Front edges count + density
  - Sector stance (with inline dropdown to change)
  - Click sector sub-card → expands to show brigade list within sector

#### Section: Operations
- Active operations as sub-cards:
  - Op name, phase badge, participating brigade count, objective count
  - Momentum indicator, failure count
  - Commander name + competence
  - Action buttons: **Force Launch** (if in assessment), **Stand Down** (terminate), **View Axes**
  - Click op sub-card → expands to show axes, objectives, per-brigade status
- If no active ops: "No active operations" + disabled "Operations launch from the map" note

#### Section: ORBAT
- Scrollable brigade list (compact `BrigadeRow`-style entries)
- Each shows: name, personnel, cohesion bar, fatigue, posture, status badge
- Click brigade → expands to show full stats, engagement history, war stories, equipment
- Future: **Reassign to [other corps]** button (deferred — requires engine support for brigade-in-transit state, 3-turn march, null-corps handling. Tracked separately as an engine feature, not part of this UI spec.)

#### Section: Combat Record
- Reuse `CombatSummaryPanel` data: battles, W/L/D, casualties taken/inflicted, OSIDs captured/lost
- Win rate, casualty exchange ratio
- Most decorated brigade, most casualties brigade

### 4.6 Officer Reserve Pool (accessible from Commander section)

When the player clicks "Replace Commander" or "Assign from Pool":

**Inline panel slides in** within the expanded corps card (not a separate modal).

**Content:**
- Available officers sorted by: home corps match → competence → aggressiveness
- Each officer shows: name, competence, aggressiveness, regional fit badge (HOME / COMPATIBLE / OUT OF REGION), estimated preparation impact
- Unavailable officers shown greyed with reason (KIA, CAPTURED, ASSIGNED, ENCLAVE LOCKED)
- Click officer → confirm replacement dialog

**This reuses the data and logic from `CommanderSelectionModal` but renders inline.**

### 4.7 Breadcrumb Bar

Fixed at the bottom of the modal.

**Format:** `Army HQ` > `1st Krajina Corps` > `Op Corridor 92` > `343rd Brigade`

Each segment is clickable — navigates back to that level. Clicking "Army HQ" collapses all expansions back to overview.

ESC key: if drilled in, go up one level. If at overview, close modal.

---

## 5. Player Actions

### Primary (available from HQ)

| Action | Where | Cost/Risk | Implementation |
|--------|-------|-----------|----------------|
| **Replace corps commander** | Commander section of expanded corps | 2-3 turn disruption penalty on new officer; pool shrinks | IPC: new `forceReplaceCorpsCommander` (see Note 1 below) |
| **Change corps stance** | Expanded corps header | Changes corps directive for bot AI | IPC: `stageCorpsStanceOrder` (existing) |
| **Change sector stance** | Sector sub-card dropdown | Changes sector reactive bonus + entrenchment rate | IPC: `stageSectorStanceOrder` (existing) |
| **Force launch operation** | Operation sub-card (if in assessment/ready) | Commander dissatisfaction if outcome poor | IPC: `stageOperationForceLaunch` (existing) |
| **Stand down operation** | Operation sub-card (if executing/stalled) | Wastes preparation turns, exhaustion penalty | IPC: `stageOperationHalt` (existing, requires `digInOnHalt: boolean`) |

**Note 1 — Replace Commander design gap:** The existing `acceptOfficerReplacement` IPC requires a `pendingOfficerEvent.eventId` — it's event-driven, not on-demand. The HQ needs a NEW IPC channel `forceReplaceCorpsCommander({ corpsId, newOfficerId })` that: (1) retires the current commander (status='retired'), (2) activates the new officer with assignment penalty, (3) does NOT require a pending event. This is distinct from the succession flow. The existing event flow (`OfficerEventBadge` → `acceptOfficerReplacement`) remains for automatic succession suggestions; the HQ adds player-initiated forced replacement as a separate action.

### Secondary (lower frequency)

| Action | Where | Cost/Risk | Implementation |
|--------|-------|-----------|----------------|
| **Dismiss officer permanently** | Commander section, danger action | Officer removed from pool forever | IPC: new `dismissOfficer` (sim-state mutation, see Note 2) |
| **Request patron aid** | Strategic Situation card (future) | Cooldown, probabilistic outcome | Deferred to patron aid system |

**Note 2 — Dismiss officer:** This requires a new IPC handler that sets `NamedOfficerState.status = 'dismissed'`. This is a sim-state mutation (not a simulation logic change — no pipeline steps or combat behavior affected).

### NOT in HQ (handled elsewhere)

- Brigade-level orders (attack, move, defend) — map interaction
- Operation planning (staging, objectives, axes) — OpsPlanningModal
- Equipment allocation — corps/brigade level panels
- Diplomatic actions — separate system
- Detailed OOB browsing — corps detail for deep unit inspection

---

## 6. Data Requirements

### From LoadedGameState

| Field | Used For |
|-------|----------|
| `formations` | All corps, brigades, army_hq filtered by faction |
| `namedOfficerData` + `namedOfficerStateById` | Army/corps commanders, reserve pool |
| `corpsFrontSectors` | Sector data per corps |
| `operations` | Active operations per corps |
| `controlBySettlement` | Territory percentage |
| `factionReserves` | Supply reserves |
| `warPhaseExhaustion` | War exhaustion index |
| `latestTurnSummary` | Battles, territory changes this turn |
| `casualtyLedger` | KIA/WIA per formation |
| `pendingOfficerEvents` | Alert strip items |
| `armyStance` | Current faction stance |

### New State (gameStore)

```typescript
armyHQOpen: boolean;
armyHQExpandedCorpsId: string | null;
armyHQExpandedSections: Record<string, boolean>; // section collapse state
armyHQOfficerSelectionCorpsId: string | null; // inline officer picker
// Breadcrumb is DERIVED from armyHQExpandedCorpsId + expanded sub-item, NOT stored.
```

**Reset rule:** When `armyHQOpen` is set to `false` (modal closes), all `armyHQ*` fields reset atomically: `armyHQExpandedCorpsId = null`, `armyHQExpandedSections = {}`, `armyHQOfficerSelectionCorpsId = null`. This prevents stale state on re-open.

### New IPC Channels

| Channel | Payload | Engine Action |
|---------|---------|---------------|
| `forceReplaceCorpsCommander` | `{ corpsId, newOfficerId }` | Retire current, activate new with assignment penalty |
| `dismissOfficer` | `{ officerId }` | Set status='dismissed', remove from pool permanently |

---

## 7. Component Architecture

```
ArmyHQModal (new, full-screen overlay)
├── ArmyHQAlertStrip (new)
├── ArmyHQTopRow (new layout wrapper)
│   ├── ArmyCommanderCard (new, uses OfficerProfile internally)
│   └── StrategicSituationCard (new)
├── CorpsCardGrid (new CSS grid wrapper)
│   └── ArmyHQCorpsCard[] (new, one per corps)
│       ├── CorpsCardCollapsed (default view)
│       └── CorpsCardExpanded (on click)
│           ├── CommanderSection (uses OfficerProfile)
│           │   └── InlineOfficerPicker (reuses CommanderSelectionModal logic)
│           ├── SectorsSection
│           │   └── SectorSubCard[] (expandable)
│           │       └── BrigadeList (compact rows)
│           ├── OperationsSection
│           │   └── OperationSubCard[] (expandable)
│           ├── OrbatSection
│           │   └── BrigadeSubCard[] (expandable to full detail)
│           └── CombatRecordSection (uses CombatSummaryPanel)
└── ArmyHQBreadcrumb (fixed bottom bar)
```

### Reused components
- `OfficerProfile` — army and corps commander display
- `CombatSummaryPanel` — combat record section
- `GlassPanel` — modal overlay wrapper (or custom overlay matching its backdrop)
- `Icon` — all stat icons
- `BrigadeRow` logic — compact brigade display in ORBAT

### New components (~12)
- `ArmyHQModal` — orchestrator, state management
- `ArmyHQAlertStrip` — conditional alert items
- `ArmyCommanderCard` — wide top card
- `StrategicSituationCard` — faction overview
- `ArmyHQCorpsCard` — collapsed + expanded states
- `CommanderSection` — officer display + actions
- `SectorsSection` + `SectorSubCard` — sector drill-down
- `OperationsSection` + `OperationSubCard` — operation drill-down
- `OrbatSection` + `BrigadeSubCard` — brigade drill-down
- `ArmyHQBreadcrumb` — navigation bar
- `InlineOfficerPicker` — reserve pool selection (reuses `CommanderSelectionModal` data logic)

---

## 8. Interaction Flow

### Opening the HQ
- Player clicks faction header in sidebar (same trigger as current `ArmyDetail`)
- OR player presses hotkey (e.g., `H`)
- Modal opens with overview state (all corps visible, nothing expanded)

### Drill-down
1. Click corps card → expands vertically, other cards compress to name-only
2. Click section header (Sectors, Operations, ORBAT) → section expands/collapses
3. Click sub-card (sector, operation, brigade) → sub-card expands showing detail
4. Breadcrumb updates at each level

### Navigation back
- Click breadcrumb segment → collapse back to that level
- ESC → go up one level (if at overview, close modal)
- Click collapsed corps card → switch expansion to that corps (auto-collapses previous)

### Taking actions
- Replace Commander → InlineOfficerPicker slides into Commander section
- Change stance → inline dropdown (no modal)
- Force launch → confirmation dialog (inline, not a separate modal)
- Reassign brigade → dropdown to select target corps + confirmation
- Dismiss officer → danger confirmation ("This is permanent. Officer removed from pool forever.")

---

## 9. What This Does NOT Change

- Simulation logic — zero pipeline/combat/calibration changes. Two new IPC handlers needed (`forceReplaceCorpsCommander`, `dismissOfficer`) that mutate officer state but do not affect simulation behavior.
- Map rendering — the map remains visible behind the modal backdrop
- Existing panels — `CorpsDetail`, `FormationDetail`, `SettlementDetailContent` all remain for quick-look use from the map. `ArmyDetail` is REPLACED by the HQ modal (same trigger: click faction header sets `selectedArmyId`). `ArmyDetail.tsx` is retired.
- Bot AI — bot factions never see this modal; their decisions flow through `bot_corps_directives.ts` as before
- Calibration — no sim-affecting changes

---

## 10. Implementation Phases

### Phase 1: Shell + Overview (MVP)
- `ArmyHQModal` with dark wood surface
- Army Commander card + Strategic Situation card
- Corps card grid (collapsed only, no expansion)
- Breadcrumb bar + ESC close
- Wire to existing `selectedArmyId` trigger

### Phase 2: Corps Drill-Down
- Corps card expand/collapse with vertical animation
- Commander section with `OfficerProfile`
- Sectors section with sub-cards
- Operations section with sub-cards
- ORBAT section with brigade list

### Phase 3: Actions
- Replace Commander (inline officer picker)
- Change corps stance (inline dropdown)
- Change sector stance (inline dropdown)
- Force launch / stand down operation
- Alert strip with pending actions

### Phase 4: Deep Drill-Down + Polish
- Brigade sub-card expansion (full stats, engagement history)
- Operation sub-card expansion (axes, objectives)
- Sector sub-card expansion (brigade positions within sector)
- Officer dismissal action (new `dismissOfficer` IPC handler)
- Asset integration (wood texture, paper texture from Gemini Pro)
- Hotkey `H` to open HQ (requires `keydown` listener in app shell)

---

## 11. References

### Existing code
- `src/ui/map/components/ArmyDetail.tsx` — current panel being superseded
- `src/ui/map/components/CorpsDetail.tsx` — reference for corps data display
- `src/ui/map/components/OfficerProfile.tsx` — reusable officer rendering
- `src/ui/map/components/OfficerEventBadge.tsx` — officer event flow
- `src/ui/map/components/CommanderSelectionModal.tsx` — officer selection logic
- `src/ui/map/components/CombatSummaryPanel.tsx` — reusable combat stats
- `src/ui/map/store/gameStore.ts` — state management patterns

### Design references
- Unity of Command 2 briefing cards — card content hierarchy pattern
- Decisive Campaigns — officer visual differentiation by quality
- EU4 outliner — "everything at a glance" philosophy
- HoI4 army group — persistent context during drill-down

### Mockups
- `docs/60_visualisations/army_hq_mockup.html` — Intelligence Board (rejected as layout, stamps/badges kept)
- `docs/60_visualisations/army_hq_mockup_war_table.html` — War Room Table (selected base)
- `docs/60_visualisations/army_hq_mockup_dossier.html` — Dossier Folders (rejected as primary, collapsible pages pattern kept)
