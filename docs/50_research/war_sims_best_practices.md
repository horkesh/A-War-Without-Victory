# War-Sim Best Practices — Evidence-Based Survey

**Phase H4.0 — A War Without Victory (AWWV)**  
**Purpose:** Evidence-based survey of UI/UX best practices from comparable strategic/operational war simulations to inform AWWV Warroom GUI improvements. No new mechanics; recommendations are Clarification (align UI with canon), Extension (expose existing state), or Out-of-scope (new mechanics/canon).

---

## Comparable Titles (Shortlist)

| Title | Scale / Type | UI/UX strength | Weakness | Applicable to AWWV |
|------|--------------|-----------------|----------|--------------------|
| **Unity of Command / UoC2** | Operational, turn-based | Clean readability; HQ-as-menu; icon status; minimal clutter | Some abstraction away from raw data | Information hierarchy; contextual hubs; readable unit/status presentation |
| **Decisive Campaigns** (e.g. Barbarossa, Ardennes) | Operational, IGOUGO / WEGO | Clear turn resolution feedback; sitrep-style reports; supply/stack clarity | Dense at first | Turn feedback; report surfaces; supply visibility |
| **The Operational Art of War (TOAW)** | Operational, turn-based | Scenario editor; detailed OOB; hex clarity; optional complexity | Steep learning curve; information overload | Layering (optional detail); map interaction patterns |
| **Command Ops 2** | Operational, real-time w/ pause | Order delay; uncertainty; “what commander knows” vs raw truth | Different scale (tactical-operational) | Transparency vs fog; delay signaling; sitrep metaphor |
| **Shadow Empire** | Strategic, 4X-ish | Political/economic UI; faction relations; report screens | Very dense; procedural content | Faction overview; report/narrative surfaces; readability under density |
| **Hearts of Iron IV** | Strategic, real-time | Map layering; tooltips; focus trees; ledger-style summaries | Not turn-based; many subsystems | Map layers; tooltip discipline; summary panels |
| **Twilight Struggle** | Strategic (card-driven) | Card/info surfacing; headline vs ops; tension between known/unknown | Board-game origin | Information pacing; “headline” vs detail; uncertainty presentation |
| **Crusader Kings (II/III)** | Character/domain | Realm view; vassal/authority UI; event narrative | Different genre | Authority/legitimacy visualization; narrative event presentation |
| **Gary Grigsby’s War in the East 2** | Strategic/operational | Detailed OOB; logistics; turn resolution phases | Extremely complex | Phase/turn resolution feedback; logistics visibility |
| **Strategic Command** | Strategic, turn-based | Clear production/diplomacy panels; map + sidebar | Simpler than AWWV | Panel consistency; sidebar vs map balance |
| **Order of Battle** | Operational | Clean unit cards; supply lines on map; campaign persistence | Less political | Unit/supply visualization; persistence feedback |
| **Panzer Corps 2** | Operational | Hex tooltips; unit stats; scenario objectives | Tactical focus | Map hover tooltips; objective clarity |

---

## Per-Title Notes (What They Do Well / Poorly / Applicable)

### Unity of Command / Unity of Command II
- **Well:** Simple, readable unit representations; icon-based status (damage, entrenchment, supply); HQ locations as UI menus (Force Pools, Engineering, logistics in one place); no “fighting the game for information.”
- **Poorly:** Some players want more raw numbers; abstraction can obscure edge cases.
- **Applicable to AWWV:** Information hierarchy; contextual organization (desk props as “menus”); status indicators without clutter; HQ/command-room metaphor aligns with Warroom.

**Sources:** Design Case Study: Unity of Command (GameDeveloper); How Unity Of Command 2 balances game design with military history (Rock Paper Shotgun); UoC2 Manual (Steam). SOURCE: web-fetched summaries; manual link: https://cdn.steamstatic.com/steam/apps/809230/manuals/Manual_-_Unity_of_Command_II_-_Revision_8.pdf

### Decisive Campaigns Series
- **Well:** Turn resolution feedback (phase-by-phase); sitrep-style after-action; supply and stack clarity; scenario structure.
- **Poorly:** Some titles dense; manual required for full clarity.
- **Applicable to AWWV:** Turn resolution feedback; situation report / newspaper metaphor; supply/control visibility.

**Sources:** SOURCE UNKNOWN — would look up: official manuals, Matrix/Slitherine dev diaries, community UI guides.

### The Operational Art of War (TOAW IV)
- **Well:** Scenario editor; detailed order of battle; hex tooltips; optional complexity layers.
- **Poorly:** Steep learning curve; information overload if all layers on.
- **Applicable to AWWV:** Map layering (political control vs contested vs future OOB); optional detail; stable tooltip on hover.

**Sources:** SOURCE UNKNOWN — would look up: TOAW IV manual, Matrix forums, GDC/postmortems on wargame UI.

### Command Ops 2
- **Well:** Order delay and friction; “what the commander sees” vs ground truth; sitrep and delay signaling.
- **Poorly:** Real-time; different scale.
- **Applicable to AWWV:** Transparency vs fog (Rulebook/Systems Manual: “explicit uncertainty and delay signaling”; UI must not imply false precision).

**Sources:** SOURCE UNKNOWN — would look up: Command Ops 2 manual, Panther Development blog.

### Shadow Empire
- **Well:** Political/economic screens; faction relations; report-style screens; procedural content structure.
- **Poorly:** Very dense; readability under load.
- **Applicable to AWWV:** Faction overview layout; report/magazine surfaces; handling density without new mechanics.

### Hearts of Iron IV
- **Well:** Map layers (political, supply, etc.); tooltips everywhere; focus trees; ledger-style summaries.
- **Poorly:** Real-time; many subsystems can overwhelm.
- **Applicable to AWWV:** Layer toggles (already in War Planning Map); tooltip discipline; summary panels (faction overview).

**Sources:** SOURCE UNKNOWN — would look up: HOI4 wiki UI pages, Paradox dev diaries.

### Twilight Struggle
- **Well:** Card/info surfacing; headline vs operations; tension between known and unknown.
- **Poorly:** Board-game; different medium.
- **Applicable to AWWV:** Information pacing; “headline” (newspaper) vs detail (reports); uncertainty presentation.

### Crusader Kings (II/III)
- **Well:** Realm view; vassal/authority UI; event narrative; legitimacy-style concepts.
- **Poorly:** Character-centric; different genre.
- **Applicable to AWWV:** Authority/legitimacy visualization (Rulebook: “control does not imply legitimacy”); narrative event presentation (placeholder newspapers/reports).

**Sources:** SOURCE UNKNOWN — would look up: Paradox UI dev diaries, accessibility reviews.

### Gary Grigsby’s War in the East 2
- **Well:** Detailed OOB; logistics visibility; turn resolution phases.
- **Poorly:** Extremely complex; niche audience.
- **Applicable to AWWV:** Phase/turn resolution feedback; logistics/supply visibility (future layer).

### Strategic Command, Order of Battle, Panzer Corps 2
- **Well:** Panel consistency; map + sidebar; unit cards; supply lines; hex tooltips; scenario objectives.
- **Applicable to AWWV:** Map hover tooltips (settlement name, control, authority); zoom behavior; modal/panel consistency.

**Sources:** SOURCE UNKNOWN — would look up: official manuals, Slitherine/Matrix store pages, community UI guides.

---

## Best-Practice Library (Patterns by Theme)

### Information hierarchy & pacing
1. **Progressive disclosure:** Show summary first (e.g. faction overview), detail on demand (modals, tooltips). Avoid dumping all state at once.
2. **Headline vs detail:** Newspaper/ticker = high-level; reports/magazine = aggregated; map = spatial. Match information type to surface (Rulebook/Phase G: “explicit uncertainty and delay”).
3. **Stable hierarchy:** Critical info (phase, turn, control) always visible; secondary (exhaustion, supply) in panels or overlays.
4. **No false precision:** Where data is estimated, delayed, or subject to friction, UI must not present it as exact (Engine Invariants; Systems Manual; Phase G spec).

### Map interaction and layering
5. **Layer toggles:** Political control, contested outline, (future) OOB, ethnicity, displacement — each as optional layer with deterministic data source.
6. **Zoom that preserves context:** Center on interest (e.g. click to center zoom); preserve focus; consistent zoom levels (Strategic / Operational / Tactical).
7. **Hover tooltips:** Settlement name, control, authority (from existing state); no new mechanics; deterministic content from canonical data.
8. **Click for detail:** Click settlement → detail panel (name, control, authority, optional future fields); read-only; no orders from map (Phase G: map is diagnostic/explanatory).

### Reports & narrative surfaces (sitrep, newspaper, ticker)
9. **Sitrep metaphor:** Reports modal = delayed field reports (T-1, T-2); newspaper = T-1 “yesterday’s news”; ticker = international events. Content from turn index and state only (deterministic).
10. **Placeholder → generated:** MVP uses placeholder text; future: same surfaces filled from turn events (no new mechanics; expose existing state).
11. **Consistent date/turn:** All surfaces use same turn-to-date conversion; single source of truth (no timestamps; turn index only).

### Turn resolution feedback
12. **Advance-turn confirmation:** Show current turn, next turn; confirm before running pipeline (already in AWWV).
13. **Post-turn feedback:** After advance, phase/turn overlay updates; optional “what changed” summary (extension: expose state diff or key events).
14. **Phase indicator:** Always visible (e.g. phase_0, phase_1); canonical phase name from state.

### Transparency vs fog
15. **Certainty signaling:** If information is delayed or estimated, label it (e.g. “Field report, T-1”; “Estimate”). Never imply exact knowledge where canon says delayed/friction.
16. **Fog vs known:** Where applicable (e.g. intel), distinguish “known” vs “uncertain”; AWWV Phase 0 may have full control visibility — still reserve pattern for Phase II+.

### Accessibility / readability
17. **Font and contrast:** Readable fonts; sufficient contrast (WCAG-relevant); avoid low-contrast text on textured background.
18. **Zoom and scale:** Support zoom (browser or in-app) without breaking layout; focus trap in modals.
19. **Keyboard and focus:** ESC closes modals; tab order; focus trap in modal; back stack or consistent “close” target.

### Error prevention (confirmations, undo scope, safe defaults)
20. **Destructive actions confirmed:** Advance turn already has confirmation; any future “commit” action should confirm.
21. **Safe defaults:** Layer toggles default to safe (e.g. political control on); no default that hides critical info.
22. **No undo from UI:** Simulation is deterministic; “undo” is replay from save, not in-scope for MVP UI.

---

## Sources (Summary)

- **With links:** Unity of Command (GameDeveloper case study; RPS article; Steam manual PDF).
- **SOURCE UNKNOWN (would look up):** Decisive Campaigns manuals/dev diaries; TOAW IV manual/forums; Command Ops 2 manual/Panther blog; Shadow Empire/HOI4/CK/GG WiE2/Strategic Command/Order of Battle/Panzer Corps 2 — manuals, Matrix-Slitherine-Paradox dev diaries, GDC talks on wargame UI, reputable reviews (e.g. PC Gamer, Rock Paper Shotgun wargame coverage).

---

*This document is part of Phase H4.0. Do not invent mechanics; all recommendations must be tagged Clarification / Extension / Out-of-scope and respect determinism and canon.*
