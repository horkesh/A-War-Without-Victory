---
name: Brigade-to-Sector Assignment Redesign
description: Redesign classifyBrigadesByTerritory to incorporate corps commander intent, home-affinity weighting, and prevent distant brigades from crowding local fronts
type: project
status: complete
---

## Problem

`classifyBrigadesByTerritory` in `src/sim/combat/corps_front_sectors.ts` is a pure BFS algorithm. It assigns brigades to sectors in three phases:
1. **Phase 1 (positional)**: Brigade physically at a front OSID → assigned to that sector
2. **Phase 2a (home affinity)**: Pooled brigades try to find a sector covering their home municipality (same component, need > 0)
3. **Phase 2b (proximity)**: `score = need / (1 + distance)`, hard cap at 8 hops

**No corps commander input at any stage.** The corps commander's personality (aggressiveness, competence) and the corps's CorpsCommandState are not passed to this function. Brigade-to-sector assignment is entirely geometry.

### Concrete failure mode: 3rd Corps Tesanj/Doboj

At w40, 3rd Corps has 25 brigades. The Tesanj/Doboj/Maglaj front gets 9 brigades including:
- 330th Liberation (Zenica home → Doboj location): Phase 2a fails (no Zenica sector), Phase 2b pulls it to Doboj, column march moves it there over many turns. Now fighting 5+ hops from home at 0.70× effectiveness floor.
- 727th Slavna (Travnik home → Tesanj location): same path.

Meanwhile 8 Travnik-area brigades (303rd, 314th, 329th, 706th, 712th, etc.) sit in the rear, either absorbed by Central Bosnia's HVO front sectors or beyond Phase 2b's reach.

A real 3rd Corps commander would:
- Keep Zenica/Travnik brigades on the Central Bosnia front (their home ground)
- Staff the Tesanj/Doboj front with Tesanj/Maglaj brigades (local units)
- Only pull Zenica units to Doboj if local supply is exhausted and the threat is critical

### Structural gap

Two disconnected layers:
| Layer | Decides | Corps commander input |
|---|---|---|
| `classifyBrigadesByTerritory` | Which brigade defends which sector | **None** |
| `evaluateSectorStances` | How aggressively each sector defends | Threat ratio only |
| `generateCorpsDirectives` | Attack targets, `priority_sector_id` | Commander aggressiveness/competence |
| `evaluateInteriorMovement` | Where to march rear brigades | `priority_sector_id` hint only |

The `priority_sector_id` in a directive is the only thread connecting command intent to brigade placement — and only affects marching direction, not the assignment table.

## Proposed Redesign

### Principle: Home-first, then corps intent, then BFS

Phase 2 should be rethought as a **soft-priority stack**, not a hard-distance formula:

**Phase 2a — Home-municipality STRONG affinity (same as today, expanded)**
A brigade should strongly prefer a sector in its home municipality. Currently this requires the sector to have `need > 0`. Proposed: even if need = 0, a home-municipality brigade stays assigned to that sector (it knows the terrain, it has motivation). Remove the `need > 0` gate for home-municipality matches.

**Phase 2b — Corps commander distribution**
After home-affinity fills, the corps commander's style influences how surplus brigades distribute:
- **Aggressive commander**: concentrate surplus brigades at the sector with the highest threat_ratio (mass at the point of decision)
- **Defensive commander**: distribute surplus evenly to thin sectors (fill the line)
- Use `CorpsCommandState.commander_aggressiveness` (0–1) as a blending weight between the two strategies

**Phase 2c — Proximity BFS (unchanged, last resort)**
Same `score = need / (1 + distance)` formula for brigades that didn't match Phase 2a or 2b. This is the fallback for genuinely unattached brigades (no home sector exists, corps intent doesn't cover them).

**Hard distance cap: reduce from 8 to 4 hops for Phase 2c**
8 hops is too permissive — it pulls Zenica brigades to Doboj. 4 hops keeps brigades in their operational zone. Brigades beyond 4 hops from any sector stay unassigned (handled by `ensureMinimumSectorCoverage`).

**Phase 2d — Commander override: priority sector concentration**
If `directive.priority_sector_id` is set, the corps commander explicitly wants brigades there. After 2a/2b/2c, any unassigned surplus brigades within 6 hops of the priority sector get assigned there, regardless of home municipality. This is the "concentration for the decisive point" mechanic.

### What NOT to change
- Phase 1 (positional): pure ground truth, must stay
- `ensureMinimumSectorCoverage`: safety net for empty sectors, must stay
- `reclassifyRearBrigades`: reserve/deep-rear classification, must stay
- `deduplicateBrigadesAcrossSectors`: correctness guard, must stay
- The GOLDEN RULE: never drop a brigade from the system entirely

### Files to modify
- `src/sim/combat/corps_front_sectors.ts`: `classifyBrigadesByTerritory` (lines 590–826)
- `src/sim/combat/corps_front_sectors_constants.ts`: add `PHASE_2C_MAX_HOPS = 4` constant
- Caller: `buildFactionSectors` must pass CorpsCommandState or corps commander aggressiveness

### Calibration risk
Medium. Changing brigade distribution changes who defends what, which changes battle outcomes. Run full 40w after each phase change. Expected: Tesanj/Doboj front becomes less crowded, Travnik/Central Bosnia front fills with local brigades, overall area-weighted match may improve slightly (brigades fighting on home territory are more effective).

### Not doing now (deferred)
- Brigade quality/equipment-class matching to sector type (mechanized brigades shouldn't defend mountain sectors)
- Proactive redeployment orders (corps AI issuing explicit "move 303rd from Travnik to Zenica sector" directives)
- Reserve pooling at corps level (corps holds 1-2 brigades as explicit reserve, not counted in sector density)

## Implementation Status (n696, 2026-03-14)

Implemented as n696. All four phases (2a home affinity gate removal, 2b competence-gated commander distribution, 2c 4-hop BFS cap, 2d pre-op staging weight) implemented in `classifyBrigadesByTerritory`. `buildCorpsCommanderProfiles()` reads named officers. 11 new tests. 6/6 benchmarks pass. 88.6% area-weighted. Hash `5bd0de05277f63e5`.

Not implemented (still deferred):
- Brigade quality/equipment-class matching to sector type
- Proactive redeployment orders
- Corps-level reserve pooling

## Why: Doctrinal Arc Alignment

**VRS**: Starts with professional JNA-inherited assignment logic (tight home affinity), degrades over time (forced to pull distant units as local pools exhaust). The redesign's home-first + corps-intent model naturally produces this arc if VRS local unit supply degrades.

**ARBiH**: Starts as rabble with poor distribution (Zenica brigades end up in Doboj because no home sector exists), improves as ARBiH builds local front sectors. The 4-hop cap would correctly force ARBiH's early-war chaos — distant brigades simply don't reach, leaving sectors thin.

**HVO**: Small pool, tight geography. Home-first works well for HVO (Mostar brigades defend Mostar). The current 8-hop cap is the main issue.

**Why:** The current pure-BFS assignment is historically wrong. A corps commander doesn't distribute brigades by proximity score — he knows his units, knows their home regions, and uses that knowledge to assign them. The redesign bakes in that knowledge structurally.
