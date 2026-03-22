# Army HQ Nerve Center — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the Army HQ Modal into the player's nerve center — a polished, animated command interface where everything is reachable from one point. Dark warroom aesthetic matching CorpsDetail panels, faction army crest prominently centered, card flip animations, equipment icons, and a mini staff map.

**Architecture:** Full-screen modal with three zones. Top zone: commander + army crest + strategic stats. Middle zone: corps cards as flip cards (front = summary, click = flip to detail back). Bottom zone: mini staff situation map (canvas-rendered, not MapLibre). All in warroom dark palette (`bg-panel-bg`, `bg-panel-card`, `text-text-primary`). CSS 3D transforms for card flip — no external library.

**Tech Stack:** React + Tailwind CSS + CSS 3D transforms. Canvas 2D for mini map. Existing `Icon` component for equipment/stance icons. `factionAssets.ts` for army crests.

**Design references:**
- Gary Grigsby's WitE2: deep OOB tree, HQ-centric expand/collapse, command range display
- HoI4: sidebar army list with commander portraits, division count, equipment icons, front line assignments
- Command: Modern Operations: dark professional theme, information density, message log
- Existing AWWV CorpsDetail panel: the canonical style (`bg-panel-bg`, amber headings, `border-panel-border`)
- User's warroom sidebar screenshot: amber corps names, tank/artillery icons with op/total, stance dropdown, ORBAT button

**Design rule:** NO green terminal (`#4af626`), NO CRT effects, NO glowing dots. Warroom palette only. See `docs/30_planning/HOI_VISUAL_GUI_OVERHAUL_SPEC.md` — "warmth of wood-paneled offices and brass fixtures rather than CRT terminals."

---

## Layout Overview

```
+------------------------------------------------------------------+
| [<- MAP]  ARBiH MAIN STAFF          Week 40 - Oct 1992      [x] |
+------------------------------------------------------------------+
|                                                                  |
|  +--COMMANDER--+    +--ARMY CREST--+    +--STRATEGIC SITUATION--+|
|  | Officer     |    |              |    | Territory    26.7%    ||
|  | Profile     |    |   [180px     |    | Personnel  141,887    ||
|  | with full   |    |    crest     |    | Brigades   125 active ||
|  | war crimes  |    |    image]    |    | Operations   4 active ||
|  | etc.        |    |              |    | Combat Eff.    28,737 ||
|  |             |    |  ARMIJA RBiH |    | Exhaustion     270.8  ||
|  +-------------+    +--------------+    | Supply           47   ||
|                                         +-----------------------+|
|  ALL CORPS (5)                                                   |
|  +----------+ +----------+ +----------+ +----------+ +--------+ |
|  | 1ST CORPS| | 2ND CORPS| | 3RD CORPS| | 4TH CORPS| |5TH CRP| |
|  |          | |          | |          | |          | |        | |
|  | Zaim I.  | | Zeljko K.| | Selmo C. | | Midhad H.| |Ramiz D.| |
|  |          | |          | |          | |          | |        | |
|  | T 12/15  | | T 45/60  | | T 38/50  | | T  2/ 5  | |T  8/12| |
|  | A 35/40  | | A120/150 | | A 98/110 | | A 15/20  | |A 32/40| |
|  |          | |          | |          | |          | |        | |
|  | 21k pers | | 48k pers | | 47k pers | |  6k pers | |14k per| |
|  | 35 brg   | | 40 brg   | | 27 brg   | | 11 brg   | |10 brg | |
|  | 8 sec    | | 10 sec   | |  4 sec   | |  1 sec   | | 1 sec | |
|  |          | |          | |          | |          | |Op:Prav| |
|  | [BALANCED]| |[BALANCED]| |[BALANCED]| |[BALANCED]| |[BALAN]| |
|  |===cohe===| |===cohe===| |===cohe===| |===cohe===| |=cohe==| |
|  +----------+ +----------+ +----------+ +----------+ +--------+ |
|                                                                  |
|  +--STAFF SITUATION MAP (canvas)-------------------------------+ |
|  | simplified territory shading + corps boundary lines         | |
|  | + active operation arrows + front line indicators           | |
|  +-------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

## Card Flip Mechanic

Each corps card is a **CSS 3D flip card**:

**FRONT (summary):**
- Corps name (amber/gold, uppercase)
- Commander name + effectiveness grade badge
- Equipment row: tank icon + `op/total`, artillery icon + `op/total`
- Personnel count, brigade count, sector count
- Active operation indicator (red dot + name)
- Stance badge (colored border/bg)
- Cohesion bar (bottom)

**BACK (detail — shown on click):**
- Commander full profile (OfficerProfile component)
- Sectors list with stance per sector
- Operations list with phase status
- ORBAT brigade list (scrollable)
- Combat record summary
- Stance dropdown (actionable)
- "Flip back" button

**Animation:** CSS `transform: rotateY(180deg)` with `perspective(1000px)`, `transition: transform 0.6s`, `backface-visibility: hidden`. No library needed.

---

## Task 1: Strip Green Terminal from ArmyHQCorpsCard

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`

**Step 1:** Replace all `#4af626` green references with warroom palette tokens.

Color mapping:
- `text-[#4af626]` corps names → `text-amber-400`
- `text-[#4af626]/60` secondary → `text-text-secondary`
- `text-[#4af626]/40` muted → `text-text-secondary/60`
- `bg-[#4af626]/5` → `bg-panel-card`
- `border-[#4af626]/20` → `border-panel-border`
- `bg-black/60` card bg → `bg-panel-card`
- `bg-[#12110f]` header → `bg-panel-card`
- Grade colors: keep red/amber, change green grade → `text-emerald-400`

**Step 2:** Add equipment icons row to the collapsed card (front face) using `Icon` component:

```tsx
<div className="flex items-center gap-4 mt-2 text-[12px]">
    <span className="flex items-center gap-1">
        <Icon name="tanks" size={14} className="text-text-secondary" />
        <span className="text-text-primary font-bold tabular-nums">{tanksOp}</span>
        <span className="text-text-secondary/60">/{tanksTotal}</span>
    </span>
    <span className="flex items-center gap-1">
        <Icon name="artillery" size={14} className="text-text-secondary" />
        <span className="text-text-primary font-bold tabular-nums">{artyOp}</span>
        <span className="text-text-secondary/60">/{artyTotal}</span>
    </span>
</div>
```

**Step 3:** Build, verify visually. Commit.

---

## Task 2: Card Flip Animation Wrapper

**Files:**
- Create: `src/ui/map/components/army_hq/FlipCard.tsx`

**Step 1:** Create a reusable FlipCard component:

```tsx
interface FlipCardProps {
    isFlipped: boolean;
    front: React.ReactNode;
    back: React.ReactNode;
    className?: string;
}

export function FlipCard({ isFlipped, front, back, className }: FlipCardProps) {
    return (
        <div className={`relative ${className}`} style={{ perspective: '1000px' }}>
            <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                {/* Front */}
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                    {front}
                </div>
                {/* Back */}
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    {back}
                </div>
            </div>
        </div>
    );
}
```

**Step 2:** Integrate FlipCard into ArmyHQCorpsCard — replace the `isExpanded`/`isCompressed` ternary with FlipCard wrapping front (collapsed view) and back (expanded detail view).

**Step 3:** Build, test flip animation visually. Commit.

---

## Task 3: Corps Card Front Face (Summary)

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`

Redesign the collapsed card to be the flip card front face:

```
+---------------------------+
| 1ST KRAJINA CORPS  [BAL]  |
| Momir Talic     EF: A     |
|                            |
| [tank] 119/211  [art] 570/595 |
|                            |
| PERSONNEL    ORBAT   FRONT |
|  48,047      36 brg  7 sec |
|                            |
| * Op: Koridor (EXECUTION)  |
| ====== cohesion bar ====== |
+---------------------------+
```

- Corps name: `text-amber-400 font-bold uppercase`
- Stance badge: top-right, colored border (`offensive`=red, `defensive`=blue, `balanced`=amber, `reorganize`=gray)
- Commander: name + grade in one line
- Equipment: Icon + operational bold / total muted
- Stats: three columns (personnel, orbat, front)
- Active op: red dot + name, only if present
- Cohesion bar: bottom strip, green/amber/red

**Step:** Implement, build, commit.

---

## Task 4: Corps Card Back Face (Detail)

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`

The back face uses existing sub-components but restyled to warroom palette:

- `CommanderSection` — officer profile, full detail
- `SectorsSection` — sector list with stances
- `OperationsSection` — op list with phases
- `OrbatSection` — brigade list (scrollable, max-height)
- `CombatRecordSection` — battle stats
- Stance dropdown (actionable via IPC)
- "Flip back" button at top

Each sub-component needs its green terminal references stripped (same palette swap as Task 1).

**Step:** Restyle all 5 sub-components, integrate into back face, build, commit.

---

## Task 5: Mini Staff Situation Map

**Files:**
- Create: `src/ui/map/components/army_hq/StaffMap.tsx`

A lightweight canvas-rendered situation map showing:
- Faction territory as colored regions (simplified polygons from OSID data)
- Corps boundary lines (dashed, labeled)
- Active operation arrows
- Front line as a thick line

**Not** a MapLibre instance. Uses `<canvas>` with 2D context. Renders from `controlBySettlement` + OSID centroid positions + `corpsFrontSectors`.

Sizing: ~400px tall, full width of modal content area. Dark background matching panel-bg.

This is the most complex task and can be deferred to a follow-up if needed. The nerve center works without it — the map is a polish item.

**Step:** Implement canvas renderer, wire to game state, build, commit.

---

## Task 6: Sub-Component Palette Cleanup

**Files:**
- Modify: `src/ui/map/components/army_hq/CommanderSection.tsx`
- Modify: `src/ui/map/components/army_hq/SectorsSection.tsx`
- Modify: `src/ui/map/components/army_hq/OperationsSection.tsx`
- Modify: `src/ui/map/components/army_hq/OrbatSection.tsx`
- Modify: `src/ui/map/components/army_hq/CombatRecordSection.tsx`
- Modify: `src/ui/map/components/army_hq/CollapsibleSection.tsx`

Strip all `#4af626` green references from every sub-component. Apply warroom palette:
- Section headers: `text-text-secondary text-[10px] uppercase tracking-[0.25em]`
- Borders: `border-panel-border`
- Backgrounds: `bg-panel-card` or `bg-panel-bg`
- Values: `text-text-primary font-mono tabular-nums`
- Labels: `text-text-secondary`

**Step:** Batch update all 6 files, build, verify no green remains, commit.

---

## Task 7: Delete Unused Components

**Files:**
- Delete: `src/ui/map/components/army_hq/TeletypeTicker.tsx` (no longer imported)
- Delete: `src/ui/map/components/army_hq/Stamp.tsx` (not used in new design)

**Step:** Delete files, build, verify clean, commit.

---

## Task 8: Situation Briefing — Emergent Intelligence Panel

**Files:**
- Create: `src/ui/map/components/army_hq/SituationBriefing.tsx`
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx` (add briefing to top section)

**Purpose:** This is the feature that makes Army HQ a NERVE CENTER, not just an OOB viewer. The engine already computes supply states, intel confidence, morale thresholds, operation phases, cohesion decay, officer events, alliance status — but the player has to click through 5 different corps, 30 sectors, and 125 brigades to find what needs attention. The Situation Briefing synthesizes ALL of this into prioritized, actionable items.

**Design philosophy:** Think of a chief of staff who reads all the reports and presents the commander with "Sir, three things need your attention today." Not raw data — interpreted intelligence.

### Intelligence Sources (all from `LoadedGameState`)

The briefing scans the entire game state and produces categorized alerts:

**CRITICAL (red, pulsing) — immediate action required:**
- Corps with avg cohesion < 40 → "3RD CORPS cohesion critical (32) — recommend REORGANIZE"
- Brigades on `critical` supply → "4 brigades in GORAZDE cut off from supply"
- Operation at `assessment` phase → "Op PRAVDA awaits GO/NO-GO decision"
- Officer replacement pending → "Gen. Halilovic replacement suggested — ACCEPT/DECLINE"
- Active enemy operation detected (from battles against player) → "ENEMY OFFENSIVE detected in 2ND CORPS sector"

**WARNING (amber) — situational awareness:**
- Sectors with intel confidence < 0.3 → "Low intelligence in DRINA sector 2 — consider PROBE"
- Corps with exhaustion > 20 → "1ST KRAJINA exhaustion 24.5 — offensive capacity degraded"
- Brigades with personnel < 400 → "7 brigades combat ineffective (< 400 pers)"
- Supply reserves below 30 → "General supply reserves LOW (28) — reduce operations tempo"
- Alliance below 0.5 (if applicable) → "RBiH-HRHB alliance deteriorating (0.42)"
- Sectors with < 2 brigades on front → "THIN FRONT: 3rd Corps sector 2 has 1 brigade on 6 edges"

**INFO (muted) — context and opportunities:**
- Operations completing this turn → "Op KORIDOR entering RECOVERY — 5 objectives captured"
- Territory changes this turn → "NET: +2 OSIDs this turn (gained kljuc:sanica, lost pale:bulozi)"
- Faction comparison → "RS controls 51.0% territory (+1.1% this turn)"
- Officer experience events → "Col. Dudakovic gained competence from defensive stand"

### Data extraction (pure function, no engine dependency)

```tsx
interface BriefingItem {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: 'supply' | 'combat' | 'intel' | 'personnel' | 'operations' | 'diplomatic' | 'territory';
    title: string;           // e.g. "SUPPLY CRITICAL"
    detail: string;          // e.g. "4 brigades in Gorazde cut off"
    corpsId?: string;        // links to corps card
    actionLabel?: string;    // e.g. "PROBE", "REORGANIZE", "ACCEPT"
    actionCorpsId?: string;  // clicking action opens corps card
}

function generateBriefing(state: LoadedGameState, faction: string): BriefingItem[]
```

This is a PURE FUNCTION — no IPC, no side effects. It reads game state and produces sorted briefing items. Critical first, then warning, then info. Max ~15 items (player shouldn't be overwhelmed).

### UI Layout

The briefing panel sits between the top section (commander/crest/stats) and the corps cards:

```
+--SITUATION BRIEFING--------------------------------------------+
| CRITICAL                                                        |
| [!] 3RD CORPS cohesion critical (32)           [→ REORGANIZE]  |
| [!] Op PRAVDA awaits GO/NO-GO                  [→ 5TH CORPS]   |
|                                                                  |
| WARNING                                                          |
| [△] Low intel in DRINA sector 2                [→ PROBE]       |
| [△] 7 brigades combat ineffective                               |
| [△] Supply reserves LOW (28)                                    |
|                                                                  |
| INFO                                                             |
| [i] NET: +2 OSIDs this turn                                    |
| [i] RS territory 51.0%                                          |
+----------------------------------------------------------------+
```

- Clicking a briefing item's action button flips the relevant corps card
- Clicking the item itself highlights the relevant corps card (amber border pulse)
- Items with `corpsId` show a small corps badge
- Collapsible — can hide INFO section by default, show only CRITICAL + WARNING

**Step 1:** Write `generateBriefing()` pure function with all intelligence sources.
**Step 2:** Write `SituationBriefing.tsx` component with categorized display.
**Step 3:** Wire into ArmyHQModal between top section and corps cards.
**Step 4:** Add click-to-corps-card interaction.
**Step 5:** Build, verify with loaded save, commit.

---

## Execution Order

1. **Task 6** first — palette cleanup of sub-components (removes green from detail views)
2. **Task 1** — strip green from corps card
3. **Task 2** — FlipCard wrapper component
4. **Task 3** — card front face redesign
5. **Task 4** — card back face integration
6. **Task 8** — Situation Briefing (the nerve center feature)
7. **Task 7** — delete unused components
8. **Task 5** — mini staff map (can be deferred)

Total: ~7 tasks (6 core + 1 optional map), each 15-30 minutes.

---

## Acceptance Criteria

- [ ] Zero `#4af626` green references in any army_hq component
- [ ] All text uses warroom palette tokens (`text-text-primary`, `text-text-secondary`, `text-amber-400`)
- [ ] Army crest 180px centered in top section
- [ ] Corps cards flip on click with smooth 3D animation
- [ ] Front face shows: name, commander, equipment icons with op/total, stats, stance, cohesion bar
- [ ] Back face shows: full commander profile, sectors, operations, ORBAT, combat record, stance dropdown
- [ ] Situation Briefing panel shows prioritized intelligence from engine state
- [ ] Briefing items categorized: CRITICAL (red), WARNING (amber), INFO (muted)
- [ ] Briefing covers: supply, cohesion, intel, operations, personnel, territory, alliance
- [ ] Clicking briefing action flips relevant corps card
- [ ] `<- MAP` button closes modal, `<- BACK` returns from card detail
- [ ] `desktop:map:build` passes with zero errors
- [ ] No runtime errors when opening Army HQ with loaded save
