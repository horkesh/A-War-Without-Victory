# Working On: Visual Overhaul Plan Execution

## Completed This Session
1. **Phase 1: Icon Language** — DONE. 22 SVG icons deployed to 4 components. React.memo + aria-hidden.
2. **Phase 2: Battle Marker Upgrade** — DONE. Interactive tooltips, outcome colors, size-scaled by casualties.

## Remaining Phases (continue next session)
3. **Map Counter Enrichment** — Add health bar (2px cohesion), supply dot (4px), operation icon to formation markers via Deck.gl. Enable `deckFormationCounters: true`.
4. **Settlement Panel Mini-Profile** — Formation cards with combat effectiveness, siege status, terrain profile.
5. **Operation Visualization on Main Map** — Objective OSID tints, ArcLayer brigade→objective, status glow.
6. **Battle Site Flyover** — `flyTo` with terrain pitch + bearing on battle click. Floating battle card.
7. **Terrain Cost Visualization** — Move mode: color OSIDs by terrain friction (green/amber/red).
8. **Elevation Profile on Ops Axes** — Pre-compute per-OSID elevation, SVG area chart along bezier.
9. **Front Line Terrain Tinting** — Enrich front edge data with friction, color high-elevation edges.

## Process
- /simplify between each phase
- Commit after each phase
- Document in ledger + napkin after each phase

## Reference
- Strategic design: `docs/plans/2026-03-20-terrain-map-ux-strategic-design.md`
- Visual overhaul plan: `docs/plans/2026-03-19-ui-visual-overhaul-design.md`
