# Army HQ Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-contained Army HQ command center modal replacing `ArmyDetail.tsx`, with War Room Table aesthetic, card-based corps overview, vertical expand drill-down, and inline player actions.

**Architecture:** Full-screen modal overlay triggered by `selectedArmyId`. New Zustand state fields (`armyHQ*`) with atomic reset. ~12 new React components under `src/ui/map/components/army_hq/`. Dark wood surface, cream paper cards, rubber stamp overlays. Reuses `OfficerProfile`, `CombatSummaryPanel`, `Icon`, and `GlassPanel` backdrop pattern.

**Tech Stack:** React 18, Zustand, TypeScript, Tailwind CSS (custom inline styles for wood/paper textures), existing IPC layer via `useIPC`.

**Spec:** `docs/plans/2026-03-20-army-hq-modal-design.md`

**Post-phase discipline (EVERY phase):**
1. `/simplify` — review for reuse, quality, efficiency
2. Smoke-test triad: `npx tsc --noEmit` ; `npm run test:vitest` ; `npm run desktop:map:build`
3. Commit with descriptive message
4. Update `docs/PROJECT_LEDGER.md`, `.claude/napkin.md`, `working-on.md`
5. Propagate to canon docs if new IPC/state/components introduced

---

## Phase 1: Shell + Overview (MVP)

### Task 1.1: Add Army HQ State to gameStore

**Files:**
- Modify: `src/ui/map/store/gameStore.ts`

**Step 1:** Add state fields after existing selection state:

```typescript
// Army HQ modal state
armyHQOpen: boolean;
armyHQExpandedCorpsId: string | null;
armyHQExpandedSections: Record<string, boolean>;
armyHQOfficerSelectionCorpsId: string | null;
setArmyHQOpen: (open: boolean) => void;
setArmyHQExpandedCorpsId: (id: string | null) => void;
toggleArmyHQSection: (key: string) => void;
setArmyHQOfficerSelectionCorpsId: (id: string | null) => void;
```

**Step 2:** Initialize in store creation:

```typescript
armyHQOpen: false,
armyHQExpandedCorpsId: null,
armyHQExpandedSections: {},
armyHQOfficerSelectionCorpsId: null,
setArmyHQOpen: (open) => set({
  armyHQOpen: open,
  // Atomic reset on close
  ...(open ? {} : {
    armyHQExpandedCorpsId: null,
    armyHQExpandedSections: {},
    armyHQOfficerSelectionCorpsId: null,
  }),
}),
setArmyHQExpandedCorpsId: (id) => set({
  armyHQExpandedCorpsId: id,
  armyHQExpandedSections: {},
  armyHQOfficerSelectionCorpsId: null,
}),
toggleArmyHQSection: (key) => set((s) => ({
  armyHQExpandedSections: {
    ...s.armyHQExpandedSections,
    [key]: !s.armyHQExpandedSections[key],
  },
})),
setArmyHQOfficerSelectionCorpsId: (id) => set({ armyHQOfficerSelectionCorpsId: id }),
```

**Step 3:** Wire `selectedArmyId` to open the HQ modal. In the existing `setSelectedArmyId` setter, add `armyHQOpen: !!id` so the modal opens automatically when a faction is selected.

**Step 4:** Run `npx tsc --noEmit` — verify no type errors.

**Step 5:** Commit: `feat(store): add Army HQ modal state to gameStore`

---

### Task 1.2: Create ArmyHQModal Shell

**Files:**
- Create: `src/ui/map/components/army_hq/ArmyHQModal.tsx`

**Step 1:** Create the directory and modal shell:

```typescript
import { useGameStore } from '../../store/gameStore';

export function ArmyHQModal() {
  const open = useGameStore((s) => s.armyHQOpen);
  const setOpen = useGameStore((s) => s.setArmyHQOpen);
  const faction = useGameStore((s) => s.selectedArmyId);
  const state = useGameStore((s) => s.loadedGameState);

  if (!open || !faction || !state) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={(e) => {
      if (e.target === e.currentTarget) setOpen(false);
    }}>
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Wood table surface */}
      <div
        className="relative flex-1 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(170deg, #2a2016 0%, #1e1810 40%, #161310 100%)',
        }}
      >
        {/* Wood grain overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)',
              'repeating-linear-gradient(87deg, transparent, transparent 60px, rgba(0,0,0,0.03) 60px, rgba(0,0,0,0.03) 61px)',
            ].join(', '),
          }}
        />

        {/* Content area — scrollable */}
        <div className="relative flex-1 overflow-y-auto p-6">
          {/* Placeholder for cards */}
          <div className="text-center text-accent-gold text-lg font-bold uppercase tracking-wider mt-8">
            Army Headquarters — {faction}
          </div>
        </div>

        {/* Breadcrumb bar */}
        <div className="relative shrink-0 px-6 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-accent-gold font-semibold uppercase tracking-wider">
            HQ Overview
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 border border-white/10 rounded transition-colors"
          >
            ESC
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2:** Add ESC key handler (useEffect with keydown listener).

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): ArmyHQModal shell — dark wood surface + breadcrumb`

---

### Task 1.3: Wire Modal into App + Retire ArmyDetail Trigger

**Files:**
- Modify: `src/ui/map/components/MapApp.tsx` (or wherever `ArmyDetail` is rendered)
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`

**Step 1:** Find where `ArmyDetail` is rendered (search for `<ArmyDetail` in the component tree). Add `<ArmyHQModal />` alongside or replacing it. The HQ modal renders when `armyHQOpen` is true; `ArmyDetail` should be conditionally hidden when `armyHQOpen` is true (keep `ArmyDetail` alive but hidden for fallback during development — retire fully in Phase 4).

**Step 2:** Verify clicking the faction header in the OOB sidebar opens the HQ modal.

**Step 3:** Run smoke-test triad: `npx tsc --noEmit` ; `npm run test:vitest` ; `npm run desktop:map:build`.

**Step 4:** Commit: `feat(ui): wire ArmyHQModal into app, hide ArmyDetail when HQ open`

---

### Task 1.4: Army Commander Card

**Files:**
- Create: `src/ui/map/components/army_hq/ArmyCommanderCard.tsx`

**Step 1:** Build the card component using data from `getFactionArmyCommander(faction, state)`:

Content: rank stars, name + archetype, competence/aggressiveness/defensive_skill stat rows, combat record (battles/victories/win rate), war crimes badge, tenure.

Visual: cream card (`#f0e8d8` → `#e4dcc8`), Georgia serif heading, Courier New monospace stats, shadow on dark surface.

Reuse `OfficerProfile` internally for the stat pips, or render custom layout matching the mockup.

**Step 2:** Import into `ArmyHQModal` and render in the top row.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): ArmyCommanderCard — officer stats on paper stock`

---

### Task 1.5: Strategic Situation Card

**Files:**
- Create: `src/ui/map/components/army_hq/StrategicSituationCard.tsx`

**Step 1:** Build the card with faction-wide overview data:
- Territory % (reuse `useMemo` pattern from `BottomStatusStrip` with `osid_areas.json`)
- Total personnel (sum from formations)
- Active brigades count
- Active operations count
- War exhaustion (from `warPhaseExhaustion`)
- Supply reserves (from `factionReserves`)
- This week: battles count, OSIDs gained/lost (from `latestTurnSummary`)

Visual: cream card, stat-row layout (label left, value right, Courier New monospace), hotspot badges for this-week events.

**Step 2:** Import into `ArmyHQModal` top row, beside Army Commander card (CSS grid: `grid-template-columns: 3fr 2fr`).

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): StrategicSituationCard — faction-wide overview`

---

### Task 1.6: Corps Card Grid (Collapsed Only)

**Files:**
- Create: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`

**Step 1:** Build the collapsed corps card:
- Line 1: Corps name (Georgia serif, uppercase) + region subtitle
- Line 2: Commander name + competence grade (A-F letter)
- Line 3: Personnel (color-coded) + brigade count + sector count
- Cohesion bar at bottom (3px, green/amber/red)
- Stamp overlay (stance: OFFENSIVE/DEFENSIVE/BALANCED/REORGANIZE or status)
- Active op indicator (name + phase badge)
- Red left-border for critical corps (cohesion < 40%)

Derive data from `state.formations` (filter by faction + corps kind), `state.corpsFrontSectors`, `state.operations`, officer data.

**Step 2:** Render in a CSS grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` with `gap: 16px`.

**Step 3:** Wire `onClick` to `setArmyHQExpandedCorpsId(corpsId)` (no expansion yet — just selection highlight).

**Step 4:** Run smoke-test triad.

**Step 5:** Commit: `feat(ui): ArmyHQCorpsCard — collapsed cards in responsive grid`

---

### Task 1.7: Phase 1 Post-Phase Discipline

**Step 1:** Run `/simplify` on all new files.

**Step 2:** Run full smoke-test triad: `npx tsc --noEmit` ; `npm run test:vitest` ; `npm run desktop:map:build`.

**Step 3:** Commit any simplify fixes.

**Step 4:** Update `docs/PROJECT_LEDGER.md` — new entry for Phase 1.

**Step 5:** Update `.claude/napkin.md` — current state, backlog item progress.

**Step 6:** Update `working-on.md` — Phase 1 complete, Phase 2 next.

**Step 7:** Commit documentation: `docs: Army HQ Phase 1 — shell + overview documented`

---

## Phase 2: Corps Drill-Down

### Task 2.1: Corps Card Expand/Collapse Animation

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`

**Step 1:** When `armyHQExpandedCorpsId === thisCorpsId`, render the expanded view. Other cards compress to a single-line summary (name + grade only, ~32px height). Use CSS `max-height` transition for smooth animation (collapsed: `max-height: 0; overflow: hidden`, expanded: `max-height: 2000px`).

**Step 2:** Update breadcrumb to show `HQ Overview > {Corps Name}` when expanded.

**Step 3:** Clicking a different collapsed card auto-switches expansion.

**Step 4:** Run `npx tsc --noEmit`.

**Step 5:** Commit: `feat(ui): corps card expand/collapse with compression`

---

### Task 2.2: Commander Section

**Files:**
- Create: `src/ui/map/components/army_hq/CommanderSection.tsx`

**Step 1:** Build section showing the corps commander using `OfficerProfile` (non-compact). Add section header "Commander" with collapsible toggle. Show "NO NAMED COMMANDER — Acting commander in place" warning if `acting_commander` is true. Placeholder buttons for "Replace Commander" and "Dismiss" (disabled, wired in Phase 3).

**Step 2:** Import into the expanded area of `ArmyHQCorpsCard`.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): CommanderSection — officer profile in expanded corps`

---

### Task 2.3: Sectors Section

**Files:**
- Create: `src/ui/map/components/army_hq/SectorsSection.tsx`
- Create: `src/ui/map/components/army_hq/SectorSubCard.tsx`

**Step 1:** Build collapsible section listing all sectors for this corps (from `state.corpsFrontSectors` filtered by `corps_id`). Each `SectorSubCard` shows: sector display name, hotspot badge (compute from `latestTurnSummary.battles` cross-referenced with sector territory OSIDs), brigade count (assigned + reserve), front edge count, density, sector stance as text label. Stance dropdown placeholder (wired in Phase 3).

**Step 2:** Import into expanded corps card.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): SectorsSection — sector sub-cards in expanded corps`

---

### Task 2.4: Operations Section

**Files:**
- Create: `src/ui/map/components/army_hq/OperationsSection.tsx`
- Create: `src/ui/map/components/army_hq/OperationSubCard.tsx`

**Step 1:** Build collapsible section listing active operations for this corps (from `state.operations` filtered by `corps_id`). Each `OperationSubCard` shows: op name, phase badge (colored pill: green=executing, amber=stalled/preparing, red=recovery), participating brigade count, objective count, momentum, failure count, commander name + competence. Placeholder action buttons (Force Launch, Stand Down — wired in Phase 3). Show "No active operations" if empty.

**Step 2:** Import into expanded corps card.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): OperationsSection — operation sub-cards in expanded corps`

---

### Task 2.5: ORBAT Section

**Files:**
- Create: `src/ui/map/components/army_hq/OrbatSection.tsx`

**Step 1:** Build collapsible section with scrollable brigade list. For each subordinate brigade: name (faction-colored), personnel count with Icon, cohesion 5-segment bar (reuse pattern from `BrigadeRow`), fatigue with Icon, posture/status badge. Use compact layout (~28px per row). Max-height with scroll for corps with 15+ brigades.

**Step 2:** Import into expanded corps card.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): OrbatSection — compact brigade list in expanded corps`

---

### Task 2.6: Combat Record Section

**Files:**
- Create: `src/ui/map/components/army_hq/CombatRecordSection.tsx`

**Step 1:** Build collapsible section reusing `CombatSummaryPanel` data. Show battles fought, W/L/D, casualties taken/inflicted, OSIDs captured/lost, win rate, casualty exchange ratio. Derive from corps formation's `combatSummary` field.

**Step 2:** Import into expanded corps card.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): CombatRecordSection — corps combat stats`

---

### Task 2.7: Phase 2 Post-Phase Discipline

**Step 1:** Run `/simplify` on all Phase 2 files.

**Step 2:** Run full smoke-test triad.

**Step 3:** Commit any simplify fixes.

**Step 4:** Update ledger, napkin, working-on.md.

**Step 5:** Commit documentation.

---

## Phase 3: Actions

### Task 3.1: Alert Strip

**Files:**
- Create: `src/ui/map/components/army_hq/ArmyHQAlertStrip.tsx`

**Step 1:** Build alert strip component. Scan `loadedGameState` for:
- `pendingOfficerEvents` with `!acknowledged` → "N officers awaiting your decision"
- `operations` with `phase === 'ready'` or `preparation_sub_phase === 'assessment'` → "Op X ready to launch"
- Corps with avg cohesion < 40% → "Corps X at N% cohesion — CRITICAL"
- `latestTurnSummary.battles.length > 0` → "N battles this week"

Each alert: dark background, gold left-border, text, clickable (sets `armyHQExpandedCorpsId` to relevant corps).

**Step 2:** Import at top of `ArmyHQModal` content area.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): ArmyHQAlertStrip — actionable alerts at top`

---

### Task 3.2: Replace Commander Action + InlineOfficerPicker

**Files:**
- Create: `src/ui/map/components/army_hq/InlineOfficerPicker.tsx`
- Modify: `src/ui/map/components/army_hq/CommanderSection.tsx`
- Modify: `src/desktop/electron-main.cjs` (new IPC handler)
- Modify: `src/ui/map/desktop/useIPC.ts` (new IPC wrapper)

**Step 1:** Add `forceReplaceCorpsCommander` IPC handler to `electron-main.cjs`:
- Payload: `{ corpsId, newOfficerId }`
- Logic: (1) Find current commander for corpsId, set `status='retired'`, `assigned_corps_id=null`. (2) Find new officer, set `status='active'`, `assigned_corps_id=corpsId`, `turns_in_command=0`, `acting_commander=false`. Apply assignment penalty if not home corps. (3) Serialize + broadcast.

**Step 2:** Add `forceReplaceCorpsCommander` wrapper to `useIPC.ts`.

**Step 3:** Build `InlineOfficerPicker` — list of available reserve officers sorted by home corps match → competence. Each row: name, competence, aggressiveness, regional fit badge. Click → confirmation → calls `ipc.forceReplaceCorpsCommander`.

**Step 4:** Wire "Replace Commander" button in `CommanderSection` to set `armyHQOfficerSelectionCorpsId`, which shows/hides `InlineOfficerPicker`.

**Step 5:** Run smoke-test triad.

**Step 6:** Commit: `feat(ui): Replace Commander action — inline officer picker + new IPC`

---

### Task 3.3: Change Corps Stance

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` (expanded header)

**Step 1:** In the expanded corps card header, add a stance dropdown (offensive/balanced/defensive/reorganize) using the existing `stageCorpsStanceOrder` IPC. Match the pattern from `CorpsCard.tsx`.

**Step 2:** Run `npx tsc --noEmit`.

**Step 3:** Commit: `feat(ui): corps stance dropdown in HQ expanded card`

---

### Task 3.4: Change Sector Stance

**Files:**
- Modify: `src/ui/map/components/army_hq/SectorSubCard.tsx`

**Step 1:** Add sector stance dropdown to each `SectorSubCard`. Options constrained by corps stance (use `CORPS_STANCE_ALLOWED_SECTOR_STANCES` mapping). Use existing `stageSectorStanceOrder` IPC.

**Step 2:** Run `npx tsc --noEmit`.

**Step 3:** Commit: `feat(ui): sector stance dropdown in HQ sector sub-cards`

---

### Task 3.5: Force Launch / Stand Down Operation

**Files:**
- Modify: `src/ui/map/components/army_hq/OperationSubCard.tsx`

**Step 1:** Wire "Force Launch" button (visible when `preparation_sub_phase === 'assessment'` or `phase === 'ready'`). Uses `stageOperationForceLaunch` IPC.

**Step 2:** Wire "Stand Down" button (visible when `phase === 'execution'` or `phase === 'stalled'`). Uses `stageOperationHalt` IPC with `digInOnHalt: true` default.

**Step 3:** Add inline confirmation dialogs (not separate modals — just a "Are you sure?" expand within the sub-card).

**Step 4:** Run smoke-test triad.

**Step 5:** Commit: `feat(ui): operation force-launch and stand-down in HQ`

---

### Task 3.6: Phase 3 Post-Phase Discipline

**Step 1:** Run `/simplify` on all Phase 3 files.

**Step 2:** Run full smoke-test triad.

**Step 3:** Commit any simplify fixes.

**Step 4:** Update ledger, napkin, working-on.md.

**Step 5:** Propagate new `forceReplaceCorpsCommander` IPC to Systems Manual §7.5.

**Step 6:** Commit documentation.

---

## Phase 4: Deep Drill-Down + Polish

### Task 4.1: Brigade Sub-Card Expansion

**Files:**
- Create: `src/ui/map/components/army_hq/BrigadeSubCard.tsx`
- Modify: `src/ui/map/components/army_hq/OrbatSection.tsx`

**Step 1:** When a brigade row in ORBAT is clicked, expand to show full detail: all stats (cohesion bar, morale bar, fatigue, personnel, entrenchment, disruption), combat effectiveness + worst modifier, equipment (tank/arty condition bars), engagement history (last 5 engagements), narrative arc badge, war story text. Reuse data patterns from `FormationDetail.tsx` but render in the HQ card style (cream paper, monospace data).

**Step 2:** Update breadcrumb: `HQ > Corps > Brigade`.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): brigade drill-down in Army HQ ORBAT section`

---

### Task 4.2: Operation Sub-Card Expansion

**Files:**
- Modify: `src/ui/map/components/army_hq/OperationSubCard.tsx`

**Step 1:** When an operation sub-card is clicked, expand to show: all axes with status (executing/stalled/complete), per-axis objectives with progress, per-axis participating brigades, commander assessment details, preparation phase history. Reuse data from `OperationView.axes[]`.

**Step 2:** Update breadcrumb: `HQ > Corps > Operation`.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): operation drill-down in Army HQ ops section`

---

### Task 4.3: Sector Sub-Card Expansion

**Files:**
- Modify: `src/ui/map/components/army_hq/SectorSubCard.tsx`

**Step 1:** When a sector sub-card is clicked, expand to show: brigade positions within sector (assigned vs reserve, front vs rear), per-brigade personnel + cohesion mini-bar, sector combat power estimate, recent battles within sector territory.

**Step 2:** Update breadcrumb: `HQ > Corps > Sector`.

**Step 3:** Run `npx tsc --noEmit`.

**Step 4:** Commit: `feat(ui): sector drill-down in Army HQ sectors section`

---

### Task 4.4: Officer Dismissal Action

**Files:**
- Modify: `src/ui/map/components/army_hq/CommanderSection.tsx`
- Modify: `src/desktop/electron-main.cjs` (new IPC handler)
- Modify: `src/ui/map/desktop/useIPC.ts` (new IPC wrapper)

**Step 1:** Add `dismissOfficer` IPC handler to `electron-main.cjs`:
- Payload: `{ officerId }`
- Logic: Set `NamedOfficerState.status = 'dismissed'`, `assigned_corps_id = null`. Serialize + broadcast.

**Step 2:** Add `dismissOfficer` wrapper to `useIPC.ts`.

**Step 3:** Wire "Dismiss Officer" button in `CommanderSection` — danger-styled, requires confirmation dialog ("This is permanent. Officer X will be removed from the reserve pool forever.").

**Step 4:** Run smoke-test triad.

**Step 5:** Commit: `feat(ui): dismiss officer action — permanent pool removal`

---

### Task 4.5: Hotkey H

**Files:**
- Modify: `src/ui/map/map/MapContainer.tsx` (or app shell where global keydown exists)

**Step 1:** Add `keydown` listener: if key === 'h' or 'H' (and no input focused), toggle `armyHQOpen`. If open, set `selectedArmyId` to `state.player_faction`. If already open, close.

**Step 2:** Run `npx tsc --noEmit`.

**Step 3:** Commit: `feat(ui): hotkey H opens Army HQ modal`

---

### Task 4.6: Asset Integration

**Step 1:** Generate dark wood table texture (512x512 tileable) via Gemini Pro or find CC0 texture. Save to `src/ui/map/assets/`.

**Step 2:** Replace CSS gradient wood simulation in `ArmyHQModal` with the real texture as `background-image`.

**Step 3:** Optional: generate weathered paper card texture, apply as card background.

**Step 4:** Commit: `feat(ui): wood and paper textures for Army HQ`

---

### Task 4.7: Retire ArmyDetail.tsx

**Files:**
- Modify: wherever `<ArmyDetail` is rendered — remove it entirely
- Keep `src/ui/map/components/ArmyDetail.tsx` in the codebase but no longer imported (or delete if confident)

**Step 1:** Remove `ArmyDetail` from the render tree. The HQ modal now handles all army-level display.

**Step 2:** Run smoke-test triad — verify no broken imports.

**Step 3:** Commit: `refactor: retire ArmyDetail panel — replaced by Army HQ modal`

---

### Task 4.8: Phase 4 Post-Phase Discipline

**Step 1:** Run `/simplify` on ALL army_hq/ files.

**Step 2:** Run full smoke-test triad.

**Step 3:** Commit any simplify fixes.

**Step 4:** Update ledger, napkin, working-on.md.

**Step 5:** Propagate to: GUI_MASTER (new modal), REPO_MAP (new directory), Systems Manual (new IPC channels), MAP_UI_MASTER (component directory).

**Step 6:** Commit final documentation: `docs: Army HQ modal complete — all 4 phases documented`
