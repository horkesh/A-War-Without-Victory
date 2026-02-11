# War Planning Map — GUI Expert Advisor Handover

**Date:** 2026-02-07  
**Prepared by:** Orchestrator (Paradox team convened)  
**Audience:** External expert advisor (GUI/UX, interaction design)  
**Main priority:** The map that opens when the player clicks the wall map in the warroom — this is **the meat of the game**.

**Expert Proposal Adopted (2026-02-07):** The recommendations in [WAR_PLANNING_MAP_EXPERT_PROPOSAL.md](WAR_PLANNING_MAP_EXPERT_PROPOSAL.md) were adopted and implemented per [WAR_PLANNING_MAP_EXPERT_PROPOSAL_TEAM_DISCUSSION.md](WAR_PLANNING_MAP_EXPERT_PROPOSAL_TEAM_DISCUSSION.md).

**Addendum — Full-screen scene (2026-02-08):** The map opens as a **full-screen scene** (scene swap), not an overlay. Clicking the wall map hides the warroom and shows the map as the sole content of the viewport; close/ESC returns to the warroom. See [PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE.md](PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE.md).

---

## 1. Team Inputs (Orchestrator Assembly)

The following roles have contributed to this handover:

| Role | Input |
|------|-------|
| **Orchestrator** | Strategic direction: one base geographical map, then information layers; war system (orders) is separate; settlement click must give layered info (settlement, municipality, side). |
| **Product Manager** | Phased delivery: Base map → Layers (political control, contested) → Settlement click panel → Hover tooltips → OOB/ethnicity/displacement (Phase II). War Planning Map launchable from warroom; full-screen presentation acceptable. |
| **Game Designer** | Design intent: player sees base geography, then layers. Settlement click must provide settlement (identity, role), municipality (containing unit, boundaries), side (faction/control). Map is "the same map, detailed" — same base geography as wall map with more layers and interaction. |
| **Technical Architect** | Base map from `A1_BASE_MAP.geojson`; coordinate spaces must not be mixed at render time. War system (orders, hierarchy, flow) is a separate design/tech track. |
| **UI/UX Developer** | **Two map surfaces:** (1) **Standalone Tactical Map** — `src/ui/map/` (see `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`), `npm run dev:map` (port 3001): full settlement panel, OOB sidebar, front lines, dataset switching, load state. (2) **Warroom map scene** — `WarPlanningMap.ts` / `TacticalMap.ts` in `src/ui/warroom/`: map that opens from the wall map; political control and contested layers; settlement panel and OOB/ethnicity/displacement as per warroom scope. |
| **Wargame Specialist** | NATO tactical aesthetic; brigade/corps/OG hierarchy; Order of Battle layer is Phase II. |

---

## 2. What the Map Must Show

### 2.1 Base Geographical Map (Foundation)

- One clear **base geographical map** of Bosnia and Herzegovina.
- Must include: national boundary, rivers, roads (MSR and secondary), settlements (polygons or markers).
- Source: `A1_BASE_MAP.geojson` (or equivalent once map/geometry expert resolves river clipping and alignment).
- Visual style: "1990s paper" / NATO tactical — see `.agent/napkin.md` and `docs/40_reports/NATO_AESTHETIC_SPEC.md`.

### 2.2 Information Layers (On Top of Base)

| Layer | Status | Description |
|-------|--------|-------------|
| **Political control** | Live | Settlement-level control by faction (RBiH, RS, HRHB); color fill per faction. |
| **Contested outline** | Live | Crosshatch or outline for CONTESTED / HIGHLY_CONTESTED settlements. |
| **Order of Battle** | Phase II placeholder | Brigade, corps, operational group (OG) positions and boundaries. |
| **Population / ethnicity** | Phase II placeholder | Census-derived ethnicity; population markers. |
| **Displacement** | Phase II placeholder | Displaced population flows. |

### 2.3 Zoom Levels

- **Strategic (Level 0):** Full BiH extent; major cities labeled.
- **Operational (Level 1):** Regional zoom; corps boundaries, brigade AoRs, front segments.
- **Tactical (Level 2):** Maximum zoom; individual settlement polygons; unit symbols (NATO APP-6 style).

---

## 3. How the User Sees Information

### 3.1 Settlement Click → Layered Info Panel (Must Have)

When the user **clicks a settlement**, a panel (or drill-down) must show **three layers of information**:

1. **Settlement** — Identity (name, SID), role (urban center / town / village), population, key attributes.
2. **Municipality** — Containing municipality (name, mun1990_id), boundaries, controller.
3. **Side** — Faction/control for that settlement (and optionally municipality).

Data sources: `political_control_data.json`, `settlements_viewer_v1.geojson` (or A1), municipality lookup.

### 3.2 Hover Tooltips (Should Have)

- Settlement hover: name, controller faction, population.
- Brigade AoR hover (Operational/Tactical): brigade name, parent corps, exhaustion %.
- No critical info only in color; labels must accompany color coding.

### 3.3 Brigade, Corps, Municipality Info

| Entity | Where to show | What to show |
|--------|---------------|--------------|
| **Brigade** | Operational/Tactical zoom; hover + click | Name, parent corps, exhaustion, strength (when sim provides it). |
| **Corps** | Operational zoom; boundary outline | Corps boundary, name; click → corps info panel (Phase II). |
| **Settlement** | All zoom levels; click | Settlement panel (identity, municipality, side). |
| **Municipality** | Via settlement panel; optional municipality boundary overlay | Name, controller, list of settlements. |

---

## 4. How Orders Are Issued (War System — Separate)

**Critical:** Order-giving and order-flow are **out of scope** for the map/GUI handover. They are a **separate system**.

- The user must eventually give **orders to brigades, corps, OGs, and army**.
- Orders **must flow** through the chain of command (army → corps → brigades).
- The **map shows the result** of orders and state; it does **not** (in MVP) implement the order input UX.
- A future "war system" handover will cover: order input UI, hierarchy, propagation, confirmation flow.

**For this handover:** The map is primarily **read-only** for MVP — the player inspects situation (control, contested, settlement/municipality/side). Order-giving UX is deferred.

---

## 5. Current Implementation (Technical Context)

| Component | Path | Notes |
|-----------|------|-------|
| War Planning Map | `src/ui/warroom/components/WarPlanningMap.ts` | Opens on wall map click; canvas-based; layer toggles (Political control, Contested); zoom cycles on map click. |
| Tactical Map | `src/ui/warroom/components/TacticalMap.ts` | Used inside wall frame; loads A1_BASE_MAP, control zones, settlements; zoom levels. |
| Clickable regions | `src/ui/warroom/ClickableRegionManager.ts` | Wall map click opens War Planning Map. |
| Data | `data/derived/A1_BASE_MAP.geojson`, `political_control_data.json`, `control_zones_A1.geojson`, `settlements_viewer_v1.geojson` | Map geometry and political control. |

**Known issues (separate track):** River clipping and layer alignment are being handled by a map/geometry expert. Do not assume rivers are fully clipped or layers perfectly aligned when designing; leave room for fixes.

---

## 6. Decisions Needed From Expert

The expert advisor is asked to **propose or decide**:

1. **Layout of settlement info panel** — Tabs (Settlement | Municipality | Side)? Sections? Collapsible?
2. **Interaction model for zoom** — Click map to cycle vs dedicated +/- buttons vs both? Keyboard shortcuts?
3. **Placement of layer toggles** — Side panel (current) vs top bar vs floating?
4. **Brigade/corps info presentation** — When OOB layer is active: tooltips only? Click → sidebar? Modal?
5. **Accessibility** — Focus trap, keyboard nav, labels (no color-only critical info).
6. **Order-giving placeholder** — Should the map show a reserved area or affordance for future "issue order" action, or leave it entirely out of scope?

---

## 7. Constraints (Must Follow)

- **Canon:** Do not invent mechanics; align with Rulebook, Game Bible, phase specs.
- **Determinism:** No timestamps, random seeds, or nondeterministic iteration in simulation-facing code.
- **Patterns:** `.agent/napkin.md` — label clipping, coordinate spaces, visual restraint (roads grey, rivers dusty blue, etc.). Read at session start.
- **Read-only for MVP:** Map inspects state; does not mutate simulation state.

---

## 8. Reference Documents

| Doc | Purpose |
|-----|---------|
| `docs/40_reports/GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md` | Strategic pillars (base map → layers; war system separate; settlement click). |
| `docs/40_reports/WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md` | PM + Game Designer joint recommendations. |
| `docs/40_reports/HANDOVER_WARROOM_GUI.md` | Warroom GUI handover; War Planning Map described. |
| `docs/40_reports/IMPLEMENTATION_PLAN_GUI_MVP.md` | Interaction specs; zoom levels; modal designs. |
| `docs/40_reports/NATO_AESTHETIC_SPEC.md` | Color palette, symbolic language. |
| `docs/40_reports/CLICKABLE_REGIONS_SPECIFICATION.md` | Wall map click → opens War Planning Map. |
| `.agent/napkin.md` | Visual preferences, failure patterns (read at session start). |

---

## 9. Run and View

```powershell
npm run dev:warroom
```

Then open the warroom; click the wall map to open the War Planning Map. Do not use `file://` — use a dev server.

---

**Orchestrator:** This handover synthesizes Paradox team input. The map that opens on wall-map click is the primary game surface. The expert should focus on: what it shows, how it shows it, how the user sees brigade/corps/settlement/municipality info, and how (if at all) to prepare for future order-giving. War system (orders) remains a separate track.
