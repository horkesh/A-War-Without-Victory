# Warroom Toolbar And Hotspot IA Plan

**Status:** ACCEPTED direction, 2026-06-02. Docs-only plan; no implementation in this file.

**Owner direction:** The Warroom may be completely rethought. Only the map and calendar should bypass dedicated Warroom items. Everything else should open a Warroom-native surface first. The briefing folio means **Command Surface**.

## Product Goal

The Warroom should be the president's room, not a decorative launch screen and not a hidden set of mystery links. It needs two equivalent navigation paths:

- **Immersive path:** click the physical object in the room.
- **Explicit path:** click the matching Warroom-only toolbar item.

The toolbar is not a modal. It is Warroom-level navigation chrome, visible only while the player is in the Warroom. It exists because hotspots alone are not discoverable enough for a strategy game with many high-value presidential surfaces.

## Core Rule

Only two Warroom interactions leave the Warroom directly:

- **Map / cork board -> War Map.**
- **Calendar -> Advance confirmation.**

Every other Warroom object opens a dedicated Warroom-native item, modal, or overlay first. That overlay may offer drill-in buttons to Army HQ, Records, Chronicle, or tactical map surfaces, but the room object itself must not dump the player into Army HQ briefing as a default.

## Toolbar And Hotspot Matrix

| Toolbar Item | Matching Hotspot | Primary Destination | Drill-In Allowed |
| --- | --- | --- | --- |
| President's Desk | Desk papers / president desk area | President's Desk overlay: required signatures, Command Authority, recent consequences, next actions | Army HQ, Records, War Map, Advance |
| Command Surface | Briefing folio | Command Surface cards and directive categories | Decision Room, directive dossier |
| Diplomacy | Telephone | Diplomacy / Patron Relations Warroom overlay | Patron details, negotiations, counter-offers |
| Intelligence | Radio / intelligence journal | Radio Intelligence / Intelligence Briefs Warroom overlay | Dossiers, records, relevant map focus |
| Staff | Commander coat / staff object | Staff and Personnel Warroom overlay | Army HQ Personnel, commander dossiers, replacement actions |
| Chronicle | Newspaper stack | News and Chronicle Warroom overlay | Chronicle, authored-choice ledger, public record |
| Faction | Wall flag / faction symbol | Faction Overview Warroom overlay | Legitimacy, doctrine, constraints, faction status |
| War Map | Desk map / cork board | Tactical War Map | Direct route; leaves Warroom |
| Advance | Wall calendar | Advance confirmation | Direct route; stays in Warroom confirmation flow |

## Implementation Slices

1. **Remove tutorial rendering.** Stop mounting first-run tutorial and coachmark overlays from the app shell. Existing tutorial modules may remain dormant unless tests require cleanup.
2. **Add Warroom toolbar.** Render a restrained Warroom-only toolbar with the matrix items above. It should be visible without covering hotspots or the status bar.
3. **Unify toolbar and hotspot dispatch.** Hotspots and toolbar buttons call the same route function so they cannot drift.
4. **Create Warroom-native overlays for missing surfaces.** Start with lightweight overlays that reuse existing read models where practical. The first implementation can be thin, but every destination must be understandable and closable from the Warroom.
5. **Stop Army HQ briefing as fallback.** Army HQ opens only from explicit Staff/Records/drill-in actions or military-specific directive flows.
6. **Command Surface access.** Command Surface is reachable directly from the toolbar and from the briefing folio. It must not require opening President's Desk first.

## Verification Contract

Before this lane can be called complete:

- Browser proof shows no tutorial/coachmark popups after starting a campaign.
- Browser proof shows the Warroom toolbar is visible and exposes President's Desk and Command Surface.
- Every toolbar item opens the same destination as its matching hotspot.
- No non-map/non-calendar hotspot exits directly to the tactical map or generic Army HQ briefing.
- Map exits to the War Map.
- Calendar opens the advance confirmation path.
- Closing every overlay returns cleanly to the Warroom.
- Focus order and accessible names distinguish toolbar items, hotspots, and overlays.

## Non-Goals

- No simulation, calibration, event, or save-schema changes.
- No new presidential authority beyond the locked command model.
- No direct brigade or axis micromanagement.
- No broad visual redesign of the Warroom scene art in this slice.

## Open Design Work

The names and visual treatment of Warroom-native overlays can still be refined, but the routing contract is locked for implementation: toolbar mirrors hotspots; only map and calendar bypass dedicated Warroom surfaces; briefing folio opens Command Surface.
