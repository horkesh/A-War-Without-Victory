# GUI Shell Reorganization Scope

**Date:** 2026-05-24
**Status:** Planning scope, not yet implementation plan
**Branch/worktree:** `codex/presidential-desk-flow`

## 1. Problem Statement

The current GUI has too many surfaces acting like the player's home:

- Warroom.
- Presidential Inbox.
- Command Briefing layer.
- Army HQ Briefing.
- Presidential Decision Room.
- Pre-advance review.
- Warroom priority docket.
- Turn Aftermath.

Each surface is individually defensible, but together they produce a confusing command loop. The player can click an Inbox item, land in a broad "decisions pending review" surface, find no obvious clickable resolution, then be blocked from advancing and routed back to the same confusing place.

The layout problem is related: panels and overlays can appear on top of each other because the app has many independent booleans and local panel owners rather than one strict shell model.

## 2. Product Direction

The player is the president, not a brigade commander.

The UI should support this loop:

1. **Brief:** What changed, what matters, what requires authority.
2. **Decide:** Resolve presidential blockers through clear cards/modals.
3. **Call:** Ask Army CO, diplomacy, humanitarian desk, or staff offices for bounded options.
4. **Inspect:** Open tactical map, corps dossiers, records, or Codex only when needed.
5. **Advance:** See exact blockers before time advances.
6. **Review:** Track consequences after the turn.

## 3. Ownership Rules

### One Shell Rule

At any moment, the player is in one primary shell:

- Warroom.
- President's Desk.
- Tactical Map.
- Army HQ.
- Records / Chronicle.
- Codex.

Blocking decision modals can appear above a shell, but shells should not visually stack as unrelated overlays.

### One Right Rail Rule

On the tactical map, only one right-rail owner may be active:

- Inbox/home state.
- Settlement detail.
- Sector detail.
- Corps detail.
- Formation detail.
- Operation detail.
- ORBAT/reserve detail.

Secondary drill-down is allowed only as explicit parent-to-child rail behavior. Unrelated panels should not pile up.

### Decision Modal Rule

Blocking presidential decisions route directly to their owning modal or panel.

They must not require the player to understand the Decision Room first.

### Warroom Object Rule

Warroom hotspots should map to obvious presidential verbs:

| Object | Verb |
|---|---|
| Desk folio | Open President's Desk / briefing |
| Telephone | Call Army CO / diplomacy / humanitarian desk |
| Calendar | Advance-week protocol |
| Map board | Inspect tactical map |
| Radio / newspapers | Public record, events, Chronicle |
| Flag / crest | Faction state, legitimacy, institution |

### Surface Ownership Rule

| Information family | Owner |
|---|---|
| Urgent presidential blockers | President's Desk |
| Military advice and command constraints | Army HQ / Army CO call |
| Operational map inspection | Tactical Map |
| Historical record and AARs | Records / Chronicle |
| Static rules and explanations | Codex |
| Post-turn consequences | Turn Aftermath, then Desk follow-up |
| Broad synthesis / context | Desk, not a separate first-layer Decision Room |

## 4. Phased Reorganization Plan

### Phase 0: Fix The Blocker Loop

Scope: current work item.

- Add a direct blocker read model.
- Make Inbox blocking cards route to concrete modals/panels.
- Make advance blocking list exact reasons with direct action buttons.
- Keep Decision Room as secondary context.

Primary plan: `docs/plans/2026-05-24-presidential-blocker-flow-plan.md`.

### Phase 1: Layout Inventory

Inventory every surface mounted in `src/ui/map/App.tsx`.

Classify each as:

- Shell.
- Rail.
- Blocking modal.
- Non-blocking modal.
- Overlay.
- Utility/dev surface.

Deliverable:

- A table of all mounted surfaces.
- Current trigger state.
- Whether it can overlap other surfaces.
- Proposed owner after reorganization.

### Phase 2: Shell State Model

Replace scattered shell booleans with a small app-level shell model.

Candidate model:

```ts
type PrimaryShell =
  | 'warroom'
  | 'presidents_desk'
  | 'tactical_map'
  | 'army_hq'
  | 'records'
  | 'codex';
```

Keep `blockingModal` separate so blocking decisions can appear above any shell and return to the previous shell after resolution.

### Phase 3: President's Desk MVP

Create a first-layer desk surface using existing read models:

- Presidential Inbox.
- Direct blockers.
- Decision Room cards, simplified.
- Pre-advance review.
- Turn aftermath follow-ups.

The Desk replaces the current "Inbox right rail + Decision Room inside Army HQ" first-layer experience.

It should have no tabs in the MVP. Use sections/cards:

- Needs your decision.
- Staff recommends.
- Risks this week.
- Track consequences.
- Ready to advance.

### Phase 4: Tactical Rail Cleanup

Enforce the one-right-rail rule.

- Keep `panelRail.ts` or replace it with a stricter selector.
- Ensure map selection, Inbox/home, OperationsPanel, OrderQueue, and detail panels cannot stack incoherently.
- Keep parent-child drill-down only where intentional.

### Phase 5: Warroom Hotspot Cleanup

Update Warroom navigation so physical objects map to presidential verbs, not implementation tabs.

Expected changes:

- Folio opens President's Desk.
- Telephone opens a call menu or call flow.
- Calendar opens advance protocol.
- Map board opens tactical map.
- Flag opens faction state.
- Radio/newspaper opens Chronicle / public record.

### Phase 6: Visual Asset Pass

Use AI-generated images after layout ownership is stable.

Priority asset targets:

- Stable Warroom scene plates by faction/year.
- President's Desk document/card backgrounds.
- Office/call surfaces for Army CO, diplomacy, humanitarian desk, intelligence.
- Event and decision card imagery.
- Report packet covers and faction-specific stamps/seals.

Do not use images as disguised tabs. Use them to clarify office identity, event memory, and document texture.

## 5. Non-Goals

- Do not redesign the simulation.
- Do not expose brigade-level command as a presidential action.
- Do not remove the tactical map.
- Do not remove Army HQ; change its role.
- Do not make a full visual asset pass before the shell ownership is stable.

## 6. Immediate Recommendation

Implement Phase 0 first.

The blocker loop is the current user pain and gives us a testable routing contract. Once blockers resolve directly, broader shell work can proceed without building a new President's Desk on top of broken decision ownership.
