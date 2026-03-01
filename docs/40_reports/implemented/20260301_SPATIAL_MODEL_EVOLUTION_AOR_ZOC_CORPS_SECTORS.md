# Spatial Model Evolution: AoR → ZoC → Corps Sectors

**Date:** 2026-03-01
**Status:** Implemented (all three generations live or superseded)
**Scope:** Engine spatial model + GUI visualization

---

## 1. Executive Summary

The simulation's spatial model has gone through three generations:

| Generation | Era | Unit location model | Control change | Status |
|------------|-----|---------------------|---------------|--------|
| **AoR** (Area of Responsibility) | Jan–Feb 2026 | Brigade owns a set of settlements | Passive pressure accumulation → breach → flip | **Removed** from Phase II (Feb 23) |
| **ZoC** (Zone of Control) | Feb 22 → present | Brigade occupies one OSID; projects ZoC to adjacents | Attack resolution only; no passive flip | **Active** — core mechanic |
| **Corps Sector** | Feb 22 → present | Derived partition of front edges by corps via multi-source BFS | Targeting constraint for bot AI; density reference | **Active** — derived each turn |

The GUI visualization (React + MapLibre map app) now renders corps-colored sector boundaries with click-to-inspect detail panels, replacing the old black-and-white front stripe.

---

## 2. Generation 1: AoR (Area of Responsibility)

### What it was

Each brigade owned a contiguous set of canonical settlements (`brigade_aor: Record<SID, FormationId | null>`). A brigade's AoR could span 5–20+ settlements. Settlements on a hostile boundary were "front-active" and required explicit AoR assignment for combat eligibility.

Control changed via **passive pressure accumulation**: opposing brigades holding adjacent settlements generated edge pressure each turn; when pressure exceeded a threshold, the settlement "breached" and flipped control. This was the primary territorial dynamic — not discrete attacks.

### Key mechanics

- **Contiguity enforcement**: Brigade AoR had to form a connected subgraph; pipeline steps `enforce-brigade-aor-contiguity` and `enforce-corps-aor-contiguity` repaired fragmentation each turn.
- **Corps-directed partitioning**: When corps command was present, front edges were partitioned into corps sectors via proximity, and brigades allocated along their corps' frontline portion.
- **Voronoi fallback**: Without corps command, brigades were assigned to settlements using Voronoi (proximity to brigade HQ).
- **Pressure/breach pipeline**: `compute-brigade-pressure` → `apply-pressure-to-edges` → control flip when accumulated pressure exceeded threshold.

### Key files (historical)

- `brigade_aor.ts` — Core AoR state and operations
- `aor_contiguity.ts` — Contiguity validation and repair
- `aor_reshaping.ts` — Brigade AoR mutations and rebalancing
- `brigade_pressure.ts` — Passive pressure/breach on edges

### Why it was replaced

1. **Passive control change was unrealistic**: Control flipping from sustained opposing pressure — without any discrete military action — violated the design principle that territorial change should require explicit combat.
2. **Static and coarse**: "Area ownership" couldn't represent precise tactical positioning; a brigade with 15 settlements in its AoR had no meaningful "location."
3. **Contiguity overhead**: Enclaves, sprawling corps, and fragmented territories required constant expensive rebalancing that still produced artifacts.
4. **No stacking**: Only one brigade per settlement in its AoR.

### Phase-out (Feb 23, 2026)

Full implementation report: [20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md](20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md)

Removed from GameState: `brigade_aor`, `brigade_aor_orders`, `brigade_mun_orders`, `brigade_municipality_assignment`. Pipeline steps removed: `validate-brigade-aor`, `enforce-*-contiguity`, `detect-brigade-encirclement`, `surrounded-brigade-reform`, `apply-municipality-orders`, `apply-aor-reshaping`, `compute-brigade-pressure`, `phase-ii-aor-init`. Canon updated: Phase II Spec, Systems Manual, Engine Invariants, Rulebook.

---

## 3. Generation 2: ZoC (Zone of Control)

### Design document

[20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md](../../30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md)

### What it introduced

HoI4/EU4-inspired spatial model: single tile per unit, adjacent tiles form ZoC, no passive control change.

- **Single location per brigade**: `location_osid` — each brigade occupies ONE operational settlement (OSID)
- **Stacking**: Multiple brigades can occupy the same OSID
- **ZoC projection**: Deployed brigades project ZoC to adjacent OSIDs in the operational contact graph
- **ZoC-locking**: An enemy brigade in friendly ZoC may only stay, retreat (to non-ZoC OSID), or attack the ZoC source
- **Linked ZoC**: When two+ friendly brigades' ZoC chains overlap through the graph, intermediate OSIDs form a "linked front" that blocks enemy movement
- **Attack-driven control change**: Control flips only via attack resolution (attacker wins → defender retreats → target OSID flips). No passive pressure.

### Key innovations

- **753 Operational Settlements (OSIDs)**: Simplified graph from 5,823 canonical settlements. Format: `op:<municipality>:<slug>`.
- **Deterministic retreat**: Valid destinations are friendly-controlled OSIDs not in enemy ZoC, tie-broken by enemy adjacency count ascending then OSID string sort.
- **Virtual ZoC defense**: Linked friendly brigade defends adjacent unoccupied OSID; if virtual defender loses, target flips but defender stays at own OSID.

### Key files

- `src/sim/phase_ii/zoc.ts` — ZoC computation, linked ZoC, retreat destinations
- `src/sim/phase_ii/zoc_constrained_movement.ts` — Movement locked by ZoC
- `src/sim/phase_ii/attack_resolution_osid.ts` — Attack outcomes in OSID space

### Canon status

ZoC is fully canonical. Documented in:
- Systems Manual v0.6.0 §2.1, §8
- Rulebook v0.6.0 §5.2
- Engine Invariants v0.6.0 §9.8, §B
- War Specification v0.6.0 §2, §4

---

## 4. Generation 3: Corps Sectors

### Problem it solved

ZoC solved brigade positioning and attack-driven control, but all brigades of a corps competed for the same front with no natural partitioning. The entire RBiH-RS boundary was one connected component (167 edges, 80 brigades). Without sectors:

- Corps could sprawl across unrelated fronts without command/control limits
- Bot targeting had no geographic constraint — a corps could attack targets far from its main position
- Density calculations were meaningless at faction level (80 brigades / 167 edges = sparse, but locally it varied wildly)

### What Corps Sectors introduced

**Multi-source BFS partitioning**: Each OSID is assigned to the nearest corps HQ via breadth-first search through friendly-controlled territory.

- Seed: All corps HQs start at distance 0 (sorted by ID for determinism)
- Wave: Each neighboring friendly OSID assigned to the first corps that reaches it
- Result: `osidToCorps: Map<OSID, FormationId>` — each OSID belongs to exactly one corps' sector

**Front edge partitioning**: Each hostile-boundary edge is assigned to the corps that owns its friendly-side OSID.

**Sub-segments**: Edges within a sector are grouped into connected components — the smallest tactical groupings.

### Sector structure

```typescript
CorpsFrontSector {
    sector_id: string;           // "sector:<corps_id>"
    corps_id: FormationId;
    faction: FactionId;
    sub_segments: [{
        sub_segment_id: string;  // "subseg:<corps_id>:<index>"
        edge_ids: string[];      // contiguous hostile edges
        friendly_osids: string[];
        enemy_osids: string[];
        length_edges: number;
    }];
    assigned_brigade_ids: FormationId[];
    reserve_brigade_ids: FormationId[];
    density: number;             // brigades / edges
    threat_ratio: number;        // enemy_power / defensive_power
    defensive_power: number;
    opposing_factions: string[];
}
```

### How it's used

1. **Bot targeting constraint**: Corps attack orders are filtered to OSIDs adjacent to the corps' sector. Prevents geographic sprawl (e.g., 2nd Corps attacking deep into Drina territory).
2. **Brigade-to-sector assignment**: Each brigade mapped to its sub-segment based on `location_osid` proximity.
3. **Local front density**: Sub-segments serve as keys for `local_fronts` and `brigade_front_assignment`. Density modifier applied at faction level (not per-sector — see Lesson L35).
4. **GUI visualization**: Corps-colored map overlays, click-to-inspect panels.

### Key files

- `src/sim/phase_ii/corps_front_sectors.ts` — Multi-source BFS, sector building
- `src/sim/phase_ii/local_front_defense.ts` — Defensive power for sectors/sub-segments
- `src/sim/phase_ii/bot_corps_ai.ts` — Sector-filtered offensive targets

### Calibration impact

| Run | Match | Delta | Notes |
|-----|-------|-------|-------|
| n295 (pre-ZoC) | 85.1% | — | AoR-era baseline |
| n299 (ZoC + sectors for structure only) | 86.3% | +1.2pp | First OSID + ZoC + sectors |
| n300–n302 (per-sector density) | 77–78% | -8pp | **Catastrophic** — VRS too thin per-corps |
| n303 (sectors for targeting only) | 86.7% | +0.4pp | Current best |

**Lesson L35**: Do not use per-corps density for the THIN/DENSE modifier. VRS overextension is real but managed by distributing forces. Density modifier should reflect faction-level front density, not per-corps. Per-sector density may apply to attack sectors only (future Phase 3).

### Derived, not serialized

Corps sectors are **computed fresh each turn** from formations + control + graph. Nothing is serialized. This follows Engine Invariants §13: fronts and sectors are derived state.

### Pipeline position (turn_pipeline.ts)

```
zoc-computation
zoc-constrained-movement
phase-ii-location-osid-backfill
refreshFrontEdgeSnapshot
buildCorpsFrontSectors          ← sectors derived here
assignBrigadesToSectors
rebuildLocalFrontsFromSectors
phase-ii-resolve-attack-orders  ← attacks use sector-adjacent targets
```

---

## 5. GUI: Corps Sector Visualization

### What was added (Mar 01, 2026)

The React + MapLibre map app (`src/ui/map/`) now renders corps-colored sector boundaries with interactive detail panels. This replaces the old black-and-white front stripe.

### Architecture

```
GameState.corps_front_sectors  (engine, derived per turn)
    ↓  GameStateAdapter.parseGameState()
LoadedGameState.corpsFrontSectors  (CorpsFrontSectorView[])
    ↓  buildCorpsFrontLinesGeoJSON()
FeatureCollection<LineString>  (features with corps_id/faction properties)
    ↓  MapContainer → front-lines source → setPaintProperty()
MapLibre GL layers  (corps-colored glow + solid front line, clickable)
```

### Visual design

- **Glow layer** (`faction-border-glow`): Colored blur behind the front line, per-corps color via dynamic `setPaintProperty` at runtime.
- **Front line** (`front-line-base`): Solid colored line, corps-colored. Replaces old black base + white dash stripe.
- **Old `front-line-dash` layer**: Removed (the white barbed-wire stripe).
- **Click interaction**: Click a front edge → right panel shows Corps Sector detail (name, faction, stance, metrics, brigade lists).
- **Hover enrichment**: Front edge hover features include `sector_id` and `corps_id` for tooltip display.

### Corps color palettes (4 shades per faction)

| Faction | Palette |
|---------|---------|
| RS (red) | `#c24040`, `#d46a4a`, `#a83030`, `#e08858` |
| RBiH (green) | `#4a9a55`, `#3a8a70`, `#5aaa40`, `#2a7a60` |
| HRHB (blue) | `#4080b8`, `#5070a0`, `#3090d0`, `#6060c0` |

Each corps gets `palette[sortedIndex % 4]` within its faction.

### Files changed

| File | Change |
|------|--------|
| `src/ui/map/data/types.ts` | Added `CorpsFrontSectorView` interface and field on `LoadedGameState` |
| `src/ui/map/data/GameStateAdapter.ts` | Parse `corps_front_sectors` → `corpsFrontSectors` |
| `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` | **New** — corps-colored front GeoJSON + MapLibre color expression |
| `src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.ts` | Enriched with `corps_id`/`sector_id` |
| `src/ui/map/map/MapContainer.tsx` | Conditional corps front builder + dynamic paint properties |
| `src/ui/map/map/useMapInteractions.ts` | Added `onFrontEdgeClick` handler |
| `src/ui/map/map/awwv_map_style.json` | Removed `front-line-dash` layer; updated `front-line-base` |
| `src/ui/map/store/gameStore.ts` | `selectedCorpsFrontSectorId` state with mutual exclusion |
| `src/ui/map/components/CorpsFrontPanel.tsx` | **New** — Corps Sector detail panel |
| `src/ui/map/App.tsx` | Mounted `<CorpsFrontPanel />` |

### Fallback

When `corpsFrontSectors` is empty (pre-war saves, Phase I), the map falls back to `buildFrontLinesGeoJSON` — generic faction-colored borders with no corps distinction.

---

## 6. Terminology

| Term | Meaning | Scope |
|------|---------|-------|
| **AoR** | Area of Responsibility — legacy brigade territory model | Removed from Phase II |
| **ZoC** | Zone of Control — adjacent OSID influence from deployed brigades | Active; core mechanic |
| **Sector** (Corps Sector) | Derived partition of front edges assigned to a corps via multi-source BFS | Active; derived each turn |
| **Sub-segment** | Connected component of front edges within a sector | Active; smallest tactical unit |
| **OSID** | Operational Settlement ID — 753-node simplified graph | Active; base spatial unit |

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single OSID per brigade, not territory set | HoI-style precision; enables stacking; no ambiguity |
| Linked ZoC connects brigades | Ground between two friendly brigades within mutual ZoC range is effectively controlled |
| Attack-driven control change only | Eliminates passive pressure/breach; control changes are event-driven |
| Sectors for targeting, not density | Per-sector density destroyed VRS (too thin per-corps); faction-level density is correct (L35) |
| Multi-source BFS from corps HQs | Deterministic; fair (sorted order); geographic (nearest corps gets nearest OSIDs) |
| Sectors are derived, not serialized | No stale data; fresh each turn from formations + control + graph |
| Corps-colored GUI replaces B&W stripe | HoI-style visual distinction between corps; enables click-to-inspect |

---

## 8. References

- **AoR phase-out**: [20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md](20260223_AOR_PHASEOUT_OSID_ZOC_FULL_IMPLEMENTATION.md)
- **ZoC design**: [20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md](../../30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md)
- **Reconciliation**: [AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md](../../30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md)
- **Calibration**: [CALIBRATION_MASTER.md](../CALIBRATION_MASTER.md) (runs n295–n303)
- **Local fronts**: [20260301_LOCAL_FRONTS_AND_BRIGADE_CALIBRATION.md](../20260301_LOCAL_FRONTS_AND_BRIGADE_CALIBRATION.md)
- **Canon**: Systems Manual v0.6.0 §2.1, §8; Engine Invariants v0.6.0 §9.8, §B; War Specification v0.6.0 §2, §4
- **GUI spec**: [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md)
