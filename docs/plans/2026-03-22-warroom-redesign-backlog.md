# Warroom Redesign — Backlog

**Date:** 2026-03-22
**Status:** BACKLOG — needs full reexamination before implementation
**Depends on:** v0.6.0 merge complete, event decision UI working
**Related:** Event system design, strategic dimensions, game timeline, player-as-leader identity

---

## Why Redesign

The warroom (`src/ui/warroom/`) is a separate Vite app with canvas-based rendering, its own modal system (12+ components), faction HQ backgrounds by year, wall calendar, newspaper, and tactical map. It was built for the peace phase before the v0.6.0 metagame layer existed.

Now that we have:
- Strategic dimensions (6 per faction, visible in Army HQ)
- Event flags and foundational decisions
- Pressure system and emergent events
- Game timeline concept
- Player-as-political-leader identity

The warroom needs to become the **political domain** of the president's command — the counterpart to the Army HQ (military domain). Currently it's a standalone app that doesn't know about any of these systems.

## What Needs Reexamination

1. **Integration with metagame:** Warroom should display strategic dimensions, event flags, pending decisions, pressure indicators, and the game timeline. Currently it has none of these.

2. **Modal consolidation:** 12+ warroom modals (DiplomacyModal, CommandBriefingModal, ReportsModal, NewspaperModal, MagazineModal, etc.) may overlap with Army HQ panels. Need to decide what lives where.

3. **Navigation model:** Player needs smooth transitions between warroom (political), map (tactical), and Army HQ (military). Currently warroom is a separate Vite app — needs to be either embedded in the Electron app or connected via state sharing.

4. **Event decision presentation:** Foundational decisions and metagame events should be presentable in the warroom aesthetic (paper documents, official seals, presidential briefing style) — not just the map overlay modal.

5. **Peace phase vs war phase:** The warroom was built for peace phase. Now that the metagame runs during war phase too, the warroom needs to work in both phases.

6. **Asset integration:** Faction HQ backgrounds (15 images, by year), flags, newspaper/magazine modals — these are rich visual assets that should be preserved and leveraged.

7. **Tech stack decision:** Currently separate Vite app with vanilla TS + canvas. The map UI is React + Tailwind + MapLibre. Need to decide: migrate warroom to React, or keep separate and communicate via IPC?

## Scope

This is a v0.7+ effort. The immediate v0.6.0 work (event decision UI, dimension visualization) should be done in the map-side Army HQ. The warroom redesign integrates everything AFTER the metagame is proven.

## Navigation Model (from brainstorm)

The player moves between three views:
- **Map** — tactical picture, always-available OOB sidebar, context panels
- **Army HQ** — military command (corps, operations, intelligence) — accessed via army crest
- **Warroom** — political command (dimensions, events, diplomacy, timeline) — accessed via faction crest

Smooth transitions: from map, click faction crest → warroom. In warroom, click tactical map element → map view. From map, click army crest → Army HQ. From Army HQ, click back → map.

## Items to Decide (when this is picked up)

- [ ] Single Electron window with view switching, or multi-window?
- [ ] Warroom migrated to React, or kept as canvas?
- [ ] Which modals move to Army HQ, which stay in warroom, which are deleted?
- [ ] How does the game timeline span both domains?
- [ ] How do event decisions present differently in warroom vs map overlay?
- [ ] What happens to the wall calendar, newspaper, faction HQ backgrounds?
