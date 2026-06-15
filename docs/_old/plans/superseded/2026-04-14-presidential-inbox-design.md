# Presidential Inbox — Design

**Date:** 2026-04-14
**Grade target:** Player experience D+ → C-
**Pattern:** EU4 outliner + Victoria 3 decision list + Hearts of Iron national focus tree

## Concept

The Presidential Inbox is a persistent right-side panel that collects all pending decisions and situational highlights into one prioritized list. It IS the game loop for a presidential player. When nothing is selected on the map, the inbox is visible. A toolbar badge lets the player return to it from any context.

On the first turn, the inbox includes a one-time "Presidential Brief" card that sets the scene for the chosen faction.

## Architecture

### New files
- `src/ui/map/components/PresidentialInbox.tsx` — the panel component
- `src/ui/map/data/inboxItems.ts` — derives inbox items from LoadedGameState
- `data/scenarios/briefs/` — per-faction opening brief JSON (3 files)

### Modified files
- `src/ui/map/components/panelRail.ts` — add `'inbox'` to `PanelRailPanel`, return it as default
- `src/ui/map/App.tsx` — render inbox when panel rail says `'inbox'`, add toolbar badge handler
- `src/ui/map/components/PresidentialToolbar.tsx` — add INBOX badge that forces inbox open
- `src/ui/map/store/gameStore.ts` — add `openingBriefDismissed` flag

## Inbox Item Priority Stack

| Priority | Type | Source | Blocking? | Action |
|---|---|---|---|---|
| 1 | Event decision | `pending_event_decisions` with `requires_player_response` | Yes — turn won't advance | Opens EventModal |
| 2 | Peace plan | `pending_peace_plan` | No | Opens PeacePlanModal |
| 3 | Autonomy proposal | `pending_proposal_reviews` (stance/ops) | No | Opens AutonomyPanel |
| 4 | Reserve request | `pending_reserve_requests` | No | Opens ArmyReservePanel |
| 5 | Officer event | `pending_officer_events` | No | Opens ArmyHQ Personnel |
| 6 | Situation highlight | Derived from turn summary | No | Informational (expandable) |

### Situation highlights (item 6)
Derived from `turn_summaries` and state deltas. 3-5 per turn max. Examples:
- "VRS forces captured Jajce" (territory loss — red)
- "Operation Prsten advancing on Sarajevo outskirts" (enemy op — amber)
- "Ceasefire proposed by international mediators" (diplomatic — blue)
- "Army exhaustion rising — commanders becoming cautious" (exhaustion — grey)

All text uses dates (via `turnToDateString`) and place names (via `getOsidDisplayName`), never weeks or OSIDs.

## Opening Brief (first turn only)

A card pinned to the top of the inbox on the first turn. Dismissed once, never returns (stored in `gameStore.openingBriefDismissed`). Per-faction content:

**RBiH:**
> You are the president of the Republic of Bosnia and Herzegovina. Your nation declared independence in March 1992, and the war has begun. The JNA and Bosnian Serb paramilitaries are seizing territory across the country. Your army is poorly armed — mostly rifles against tanks and artillery. Your strategic goals: hold the major cities, keep the international community engaged, survive long enough to negotiate from strength. You command through Army HQ and your corps commanders. You do not move brigades — you set strategic direction and approve operations.

**RS:**
> You lead Republika Srpska. The Bosnian Serb entity controls the JNA's heavy equipment — tanks, artillery, logistics infrastructure. Your strategic goals: secure a contiguous territory connecting all Serb-majority areas, control the Posavina corridor linking eastern and western holdings, and force international recognition. Your military advantage is overwhelming but temporary — international pressure and war exhaustion will erode your position. Every month of war costs you diplomatic capital.

**HRHB:**
> You lead Herzeg-Bosna, the Croatian community's wartime entity. Zagreb provides your political direction and military support. Your strategic goals: secure Herzegovina as a Croat-majority region, protect Croat communities in central Bosnia, and maintain the alliance with Sarajevo as long as it serves Croatian interests. You are caught between two larger forces. Your patron in Zagreb may order you to fight, negotiate, or stand down — and you may not always agree.

## Panel Layout

```
┌─────────────────────────────┐
│ PRESIDENTIAL INBOX      (3) │  ← header with pending count
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔴 BLOCKING             │ │  ← red badge for blocking items
│ │ Sarajevo Siege Response  │ │
│ │ Decide how to respond... │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ⚡ OP PROPOSAL           │ │  ← amber badge for proposals
│ │ 1st Corps: Authorize Op  │ │
│ │ Operacija Tigar-Sloboda  │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📋 RESERVE REQUEST       │ │  ← blue badge for requests
│ │ 3rd Corps needs support  │ │
│ │ Defensive gap at Maglaj  │ │
│ └─────────────────────────┘ │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  ← divider
│ SITUATION                    │
│ • VRS captured 2 positions   │
│   near Bratunac               │
│ • Exhaustion rising (67/100) │
│ • 14 Oct 1992                │
└─────────────────────────────┘
```

## Toolbar Badge

In PresidentialToolbar, replace scattered alert badges with one unified:
```
[INBOX 3] — click to force inbox panel open
```
The count is the sum of all actionable items (priorities 1-5). Red when blocking items exist. Amber when proposals/requests pending. Grey when only informational.

## Implementation Scope

- `inboxItems.ts`: ~80 lines (derive items from state)
- `PresidentialInbox.tsx`: ~150 lines (render items, handle clicks)
- `panelRail.ts`: ~5 lines (add inbox as default)
- `App.tsx`: ~15 lines (render inbox, handle toolbar callback)
- `PresidentialToolbar.tsx`: ~20 lines (add badge, callback)
- `gameStore.ts`: ~3 lines (openingBriefDismissed flag)
- Brief JSON: ~30 lines each (3 files)

Total: ~400 lines of new code + ~90 lines brief content.

## What this does NOT include
- Tutorial system (no tooltips, no step-by-step)
- Victory condition explanation (VerdictScreen already handles endgame)
- New decision UIs (all items route to existing modals)
- Turn-by-turn narrative (Chronicle already does this)
- AI advisor integration (AiAdvisorPanel exists separately)
