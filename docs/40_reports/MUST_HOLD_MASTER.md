# MUST_HOLD_MASTER.md — Must-Hold and Corridor Awareness Systems

## Purpose

The must-hold and corridor awareness systems provide the simulation with strategic geographic consciousness: a structured way for the bot AI, scenario authors, and players to designate locations whose loss carries outsized consequences, and a fully emergent mechanism for detecting and responding to corridor vulnerability. These systems were designed during the session of 2026-04-01 to address a gap between the historically grounded OOB and the bot AI's battlefield decision-making: the engine had no concept of terrain whose loss ends the war strategically, nor any awareness of territorial connectivity as a fighting priority. The must-hold system supplies authored intent at the scenario level; the corridor awareness system supplies emergent detection via existing articulation-point analysis that was already running every turn in `osid_graph_analysis.ts`.

---

## Design Principles

- **No railroads**: the hard garrison gate fires only when `garrison_deficit > 0` AND `is_under_pressure`. It is not a permanent lock. Brigades are never pinned to OSIDs by name.
- **Emergent bot behavior via signals, not hardcoded brigade IDs**: corridor status and must-hold flags raise garrison budget multipliers and target scoring weights. The bot responds to signals, never to a fixed assignment list.
- **Player can override anything, but sees consequences**: must-hold status is advisory to the player. If they pull a brigade from Brčko, the consequence category fires — it is not blocked.
- **Authored minimum footprint**: only display labels and `must_hold: true` flags are authored in data files. No brigade-to-OSID bindings, no hardcoded routing logic.
- **Corridor detection is FULLY EMERGENT**: articulation point analysis via BFS-removal, O(V+E) per node, already running in `osid_graph_analysis.ts` every turn. No new detection algorithm is required.

---

## Architecture (Approved Design)

### Must-Hold Zones

**State fields:**
- `CorpsFrontSector.must_hold?: boolean` — authored in scenario or set by bot/player
- `CorpsFrontSector.must_hold_source?: 'scenario' | 'bot' | 'player'` — provenance tracking
- `CorpsFrontSector.must_hold_reason?: string` — human-readable label for CoS briefing
- `ZoneAssessment.is_must_hold: boolean` — derived each turn from sector flags; not stored in scenario

**Garrison budget:**
- `computeGarrisonBudget(zone, personality, isMustHold)` — must-hold floor overrides from below
- Hard gate: only activates when `garrison_deficit > 0` AND `is_under_pressure`; not a permanent reservation

**Consequence categories** (for event triggers and CoS briefing text):
- `corridor_severed` — territorial connectivity broken
- `capital_fallen` — faction seat of government lost
- `safe_area_lost` — UNPROFOR-designated safe area lost
- `ethnic_enclave_fallen` — isolated population center lost
- `logistics_hub_lost` — supply throughput significantly degraded
- `ethnic_minority_enclave` — minority population pocket lost
- `corridor_threat_position` — position that interdicts enemy corridor

**HRHB Phase B must-holds** (Kiseljak, Kreševo, Vitez, Busovača, Prozor): activated by event trigger when `isRbihHrhbCombatEnabled()` fires. Not active in Phase A.

---

### Corridor Awareness (Emergent)

**Detection source:** `FactionGraphAnalysis.chokepoints[]` in `osid_graph_analysis.ts` — already computed every turn via articulation point detection (BFS-removal, O(V+E) per node).

**Why articulation points, not `measureCorridorWidth()`:** `measureCorridorWidth()` returns Infinity for main-body OSIDs because the Posavina Corridor is internal to the RS main body — it is not a peninsula. Articulation point analysis correctly identifies Brčko as a single-removal disconnect node. The existing `chokepoints[]` array is the right data source.

**Corridor cluster grouping:** extract and generalize from `detectSalients()` in `front_geometry_analysis.ts`. A corridor cluster is a named group of chokepoint OSIDs sharing a strategic label.

**Display labels only:** `data/source/corridor_labels.json` — OSID → display name mappings (~10 entries). Read-only authored data. No logic lives in this file.

**Status levels:**
- `SECURE` — chokepoint held, no pressure
- `AT_RISK` — chokepoint under attack or garrison below threshold
- `CRITICAL` — chokepoint contested or adjacent enemy advance
- `SEVERED` — chokepoint lost; connectivity broken

**Bot response:**
- Garrison budget multiplier in `computeGarrisonBudget` (Proposal 2 from calibration backlog) — corridor-width multiplier raises floor for CRITICAL/AT_RISK zones
- Target scoring bonus: ×2.0 for CRITICAL corridors, ×1.4 for AT_RISK corridors
- "Widen corridor" is a target scoring modifier, NOT a new operation type; Priority 1.5 in `managePlan`

**Player-facing:**
- Map overlay on tactical map
- CoS briefing text with zone name and status
- Army HQ panel badge when status degrades

---

### Garrison Safety Net Removal (Run A — DONE)

- Removed `emit.ts` lines 652-691 (garrison floor safety net)
- Committed: `9d2f7c30` — "refactor(commander): remove garrison floor safety net from emit.ts"
- Confirmed zero calibration delta (expected)
- Rationale: garrison-locked brigades are excluded from `surplus_pool` in `allocate.ts` Pass 2 and cannot reach `participatingBrigades`. The secondary check in `emit.ts` therefore had no reachable code path and violated the single-ownership principle. Dead code removed.

---

### Implementation Sequence

| Run | Change | Expected delta |
|-----|--------|----------------|
| A | Remove garrison floor safety net (DONE, commit `9d2f7c30`) | Zero |
| B | `must_hold?` on `CorpsFrontSector` + `is_must_hold` on `ZoneAssessment` + `isMustHold` param on `computeGarrisonBudget` | Zero |
| C | Corridor-width multiplier in `computeGarrisonBudget` (Proposal 2) | Behavioral |
| D | Author `must_hold: true` on first scenario sectors | Behavioral |
| E | `corridor_labels.json` + `CorridorCluster` in briefing (read-only) | Zero |
| F | Wire `CorridorCluster` to garrison budget + target scoring | Behavioral |

Runs B and E are zero-delta structural additions and can be committed without a calibration run. Runs C, D, and F each require a full 40w run and sign-off before the next change (one change per calibration run rule).

---

## Historical Must-Hold Lists

### RS (VRS)

| Location | Consequence of loss |
|----------|---------------------|
| Posavina Corridor arc (Brčko–Šamac–Doboj) | RS split into non-contiguous halves — strategic paralysis |
| Brčko town | Corridor narrowest point; no land link E↔W RS |
| Doboj | Ozren pocket severed; corridor middle cut; ARBiH 2nd Corps connects west |
| Sarajevo siege ring (Ilidža, Pale, Vogošća, Ilijaš, Hadžići, Grbavica) | SRK mission ends; Strategic Goal 5 collapses |
| Banja Luka | RS political capital + 1KK HQ — institutional collapse |
| Bijeljina/Semberija | Eastern corridor terminus; Serbia overland supply severed |
| Zvornik | Primary Drina crossing to Serbia; Belgrade logistics severed |

---

### RBiH (ARBiH)

| Location | Category | Consequence of loss |
|----------|----------|---------------------|
| Sarajevo urban core | Capital | BiH government loses seat; international recognition threatened |
| Tuzla | City (NOT enclave) | 2nd Corps base; refugee logistics hub; northeast collapses |
| Bihać | Isolated enclave | 5th Corps + 250k civilians with no fallback |
| Goražde | Enclave | Largest eastern enclave; only Drina enclave with southern approach |
| Srebrenica | Enclave | 40–80k civilians; VRS Directive 4 confirms intent |
| Žepa | Enclave (secondary) | Srebrenica-linked; fall together |
| Zenica | City | 3rd Corps HQ; central corridor anchor; industrial base |
| Travnik | City | 3rd Corps HQ and operational anchor — NOT a supply corridor (corrected) |
| Gornji Vakuf | Supply hinge | Cuts Tomislavgrad→Mostar axis; Phase B HVO–ARBiH flashpoint Oct 1992 |
| Mostar East | Urban enclave | Only ARBiH presence in Herzegovina; besieged by HVO in Phase B |
| Gradačac | Secondary | Bosniak population center; calibration P0 confirms weight |
| Orašje | Dual-value | Bosniak/Croat population survival AND corridor interdiction position |

**RBiH Supply Corridors (corrected — supply does NOT route through Travnik):**
- `rbih_neretva_supply`: Ploče/Split → Mostar → Jablanica → Konjic → Sarajevo (primary trunk)
- `rbih_prozor_jablanica`: Tomislavgrad → Prozor → Jablanica (switchpoint; Oct 1992 HVO seizure confirms weight)

---

### HRHB (HVO)

| Location | Phase | Consequence of loss |
|----------|-------|---------------------|
| Western Herzegovina belt (Grude, Široki Brijeg, Čitluk, Ljubuški) | Both | Base of HVO existence — recruitment, institutions, supply |
| Mostar West Bank | Both | Urban capital; logistical hub; Herzegovina OZ collapses |
| Tomislavgrad / Livno | Phase A | Supply from Croatia severed |
| Prozor | Phase B (Oct 1992+) | Supply hinge cut — Croatia→Herzegovina→Central Bosnia axis severs |
| Vitez / Busovača pocket | Phase B (event-triggered) | Central Bosnia zone lost; ~15–20k troops encircled |
| Kiseljak–Kreševo pocket | Phase B (event-triggered) | Kiseljak: isolated garrison. Kreševo: southern anchor, loss exposes Kiseljak from three directions |
| Orašje | Phase A | Pins RS Posavina reserves; corridor interdiction lost |
| Čapljina / Stolac | Both | Southern flank anchor; Split coastal road severed |
| Žepče | Phase B | Northern enclave garrison destroyed |

---

## Corridor Labels to Author (corridor_labels.json)

Target path: `data/source/corridor_labels.json`

```json
{
  "op:brcko:brcko": "Brčko Corridor",
  "op:doboj:doboj_2": "Doboj Corridor",
  "op:gorazde:gorazde_2": "Goražde Approach",
  "op:kalesija:teocak_krstac_2": "Teočak-Tuzla Corridor",
  "op:jablanica:jablanica_2": "Neretva Supply Axis",
  "op:prozor:prozor_2": "Prozor Hinge",
  "op:mostar:mostar_2": "Herzegovina Heartland"
}
```

These entries are display labels only. They do not affect simulation logic until wired to `CorridorCluster` in Run F.

---

## Sources

**ICTY verdicts (primary):** Karadžić IT-95-5/18, Mladić IT-09-92, Krajišnik IT-00-39, Krstić IT-98-33, Prlić et al. IT-04-74, Blaškić IT-95-14, Kordić and Čerkez IT-95-14/2.

**Secondary:** Burg & Shoup, _The War in Bosnia-Herzegovina_ (BB1/BB2).

**Project canon:** `docs/10_canon/FORAWWV.md`, `HISTORICAL_TIMELINE_MASTER.md`, `BOSNIAK_CROAT_CONFLICT_MASTER.md`, OOB data files.
