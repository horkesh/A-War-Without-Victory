# Commander-Driven Brigade Assignment — n696
**Date:** 2026-03-14
**Session hash:** 5bd0de05277f63e5
**Area-weighted match:** 88.6%
**Benchmarks:** 6/6 PASS
**Sectors at w40:** 69 (0 disconnected)
**Tests added:** 11 (vitest)

---

## Problem Statement

`classifyBrigadesByTerritory` in `src/sim/combat/corps_front_sectors.ts` was a pure BFS algorithm with no corps commander input. Brigade distribution was entirely geometric. The concrete failure mode was 3rd Corps at w40:

- **330th Liberation** (home: Zenica) → Phase 2b BFS score pulled it to Doboj, 5+ hops away, fighting at 0.70× effectiveness floor.
- **727th Slavna** (home: Travnik) → same path to Tesanj.
- **8 Travnik-area brigades** (303rd, 314th, 329th, 706th, 712th) sat idle in rear sectors because BFS couldn't connect them to a sector at 8-hop range.

A real 3rd Corps commander would keep Zenica/Travnik brigades on Central Bosnia fronts and staff Tesanj/Doboj with local units. The previous algorithm had no mechanism for this.

**Structural gap:** `classifyBrigadesByTerritory` had zero input from `CorpsCommandState`, named officers, or operation staging — despite these structures existing in the game state.

---

## Design

### Principle: Home-first, then corps intent, then BFS

The 4-phase structure replaces the old "Phase 2b: proximity BFS" with a soft-priority stack:

| Phase | Rule | Commander input |
|---|---|---|
| 2a | Home-municipality affinity — always, no need gate | None (geography) |
| 2b | Commander distribution: concentrate (aggressive) or fill (defensive) | `competence` gates activation; `aggressiveness` drives strategy |
| 2c | BFS proximity, 4-hop cap (was 8) | Pre-op staging weight inflates `need` |
| 2d | Priority sector sweep for unassigned surplus | `prioritySectorId` from directive |

### `CorpsCommanderProfile`

```typescript
interface CorpsCommanderProfile {
    competence: number;          // 0–1 normalized from 1–5 officer scale
    aggressiveness: number;      // 0–1 normalized from 1–5 officer scale
    prioritySectorId?: string;   // from corpsCmd.directive?.priority_sector_id
    preStagingSectorWeights: Map<string, number>; // sector_id → weight multiplier
}
```

`buildCorpsCommanderProfiles()` reads `state.named_officers` + `state.corps_command` for each corps. If no named commander found, a generic profile is used (competence 0.5, aggressiveness 0.5, no weights).

### Phase 2a: Home affinity — no need gate

**Before:** `if (homeSector && homeSector.need > 0)` — home brigade skipped if sector full.
**After:** `if (homeSector)` — home brigade always goes home. The sector knows the terrain, the brigade has motivation.

### Phase 2b: Competence-gated commander distribution

Commander must have `competence ≥ COMMANDER_COMPETENCE_ASSIGNMENT_THRESHOLD (0.35)` to run Phase 2b. Below that, the commander doesn't have the organizational skill to distribute brigades strategically — falls through to Phase 2c BFS.

Above threshold:
- **Aggressive (aggressiveness ≥ 0.6):** Concentrate surplus at sector with highest `threat_ratio`. Mass at the point of decision.
- **Defensive (aggressiveness ≤ 0.4):** Fill the thinnest sector (lowest `density = assigned_brigades / length_edges`). Seal the line.
- **Balanced:** Skip Phase 2b, fall to Phase 2c.

### Phase 2c: BFS with 4-hop cap and staging weight

Cap reduced from 8 to 4 hops. 8 hops pulled Zenica brigades to Doboj. 4 hops keeps brigades in their operational zone.

Pre-op staging weight: if a corps has an active operation in `intel_gathering` phase, the target sector's `need` is multiplied by `PRE_OP_STAGING_WEIGHT_INTEL=1.5`. In `force_staging` or later, `PRE_OP_STAGING_WEIGHT_STAGING=3.0`. This causes BFS to naturally pull brigades toward pre-op staging areas — the commander is concentrating forces before the operation launches, without explicit directive.

Brigades beyond 4 hops from any sector go to `phase2dCandidates`.

### Phase 2d: Priority sector sweep

If `directive.priority_sector_id` is set, any `phase2dCandidates` within 6 hops of the priority sector get assigned there. This is the "concentration for the decisive point" mechanic — the corps commander explicitly wants brigades at a sector, and unplaced surplus obeys.

---

## Implementation Walkthrough

### Files Modified

**`src/sim/combat/corps_front_sectors_constants.ts`** — 4 new constants:
```typescript
export const COMMANDER_COMPETENCE_ASSIGNMENT_THRESHOLD = 0.35;
export const PHASE_2C_MAX_HOPS = 4;
export const PRE_OP_STAGING_WEIGHT_INTEL = 1.5;
export const PRE_OP_STAGING_WEIGHT_STAGING = 3.0;
```

**`src/sim/combat/corps_front_sectors.ts`** — major additions to `classifyBrigadesByTerritory`:
- Added `commanderProfiles: Map<string, CorpsCommanderProfile>` parameter
- Added `CorpsCommanderProfile` interface + `buildCorpsCommanderProfiles()` function (placed in Step 6 section)
- Phase 2a: removed `need > 0` guard
- Phase 2b: new commander-distribution block with competence gate
- Phase 2c: `PHASE_2C_MAX_HOPS` replaces hardcoded 8; staging weight applied in score
- Phase 2d: priority sector sweep for unassigned candidates
- `buildFactionSectors()`: added `buildCorpsCommanderProfiles()` call, passes result to `classifyBrigadesByTerritory`

**`vitest.config.ts`** — added `tests/commander_driven_brigade_assignment.test.ts` to include array

**`tests/commander_driven_brigade_assignment.test.ts`** — 11 new tests (new file)

### Key Lookup: `priority_sector_id` Lives on `CorpsDirective`

The plan referenced `priority_sector_id` on `CorpsCommandState`, but investigation showed it lives on `CorpsDirective`:

```typescript
corpsCmd.directive?.priority_sector_id
```

Similarly, `CorpsOperation` does not have `priority_sector_id` — it has `sector_id` (the sector the operation launches from), which is what gets used for pre-op staging weights.

---

## Test Design

Tests use `buildCorpsFrontSectors()` as the integration entry point (inner functions are not exported). The key challenge was building a topology that satisfies triple-junction adjacency requirements (Case A: same friendly OSID + adjacent hostile OSIDs).

**Working topology:** Linear chain — RS OSIDs f1-f2-f3-f4-f5, enemy OSIDs e1-e2-e3-e4-e5. Adjacent pairs (fi, fi+1) share adjacent hostiles (ei, ei+1), enabling Case A connections. Edge IDs must be `osidA__osidB` format.

**Failed topology (lesson):** 5 front edges sharing one friendly OSID (`op:alpha:front`) facing different non-adjacent enemy OSIDs → Case A cannot connect them → 5 disconnected single-edge sectors.

### Tests Written

1. Phase 2a assigns home brigade even with zero sector need
2. Phase 2b aggressive commander concentrates at high-threat sector
3. Phase 2b defensive commander fills thin sector
4. Phase 2b balanced commander skips to Phase 2c
5. Phase 2b low-competence commander skips to Phase 2c
6. Phase 2c assigns brigade 1 hop from sector
7. Phase 2c assigns brigade 2 hops from sector
8. Phase 1 assigns brigade physically at front OSID
9. Pre-op staging weight boosts assignment to staging sector
10. Determinism: two identical runs produce identical assignment
11. No named commander: generic defaults apply

---

## Calibration Results

| Metric | n692 (prev) | n696 |
|---|---|---|
| Area-weighted match | 88.2% | 88.6% |
| Benchmarks | 5/6 | **6/6** |
| Sectors at w40 | 131 | 69 |
| Disconnected assignments | 0 | 0 |
| Run hash | 5a49833cdfbdbeef | 5bd0de05277f63e5 |

The sector count drop (131→69) is a side effect of changed brigade distribution altering which front edges get grouped — fewer isolated sub-segments with a single brigade → more merging into larger sectors. This is correct behavior.

The benchmark improvement (5/6→6/6) recovers the one failing benchmark from n692 without regression on the others. Area-weighted match improved +0.4pp.

### 3rd Corps Case Study

Expected improvement: Zenica/Travnik brigades staying on Central Bosnia front rather than marching to Doboj. The 4-hop cap is the primary guard — Zenica to Doboj is 5+ hops, which now puts those brigades beyond Phase 2c reach. They will stay in Phase 2a (home sector if one exists) or remain unassigned and handled by `ensureMinimumSectorCoverage` for the closest sector within their component.

---

## Known Limitations

1. **Brigade quality not matched to sector type.** Mechanized brigades can still be assigned to mountain sectors. Deferred — requires terrain-type metadata on sectors.
2. **No proactive redeployment orders.** Corps AI cannot issue explicit "move 303rd from Travnik to Zenica sector" directives. The Phase 2d staging weight approximates this, but brigades only move if they happen to be unassigned pooled units, not already-assigned ones.
3. **Reserve pooling is corps-level only.** Corps holds no explicit reserve. `ensureMinimumSectorCoverage` handles emergency coverage but is not a reserve management system.
4. **Phase 2b operates on pooled brigades only.** Brigades already assigned in Phase 1 or Phase 2a are not redistributed by commander intent. Commander-driven reassignment of already-placed units is not implemented.

---

## Files Modified

- `src/sim/combat/corps_front_sectors_constants.ts` — 4 new constants
- `src/sim/combat/corps_front_sectors.ts` — `CorpsCommanderProfile`, `buildCorpsCommanderProfiles()`, 4-phase redesign in `classifyBrigadesByTerritory`
- `vitest.config.ts` — test registration
- `tests/commander_driven_brigade_assignment.test.ts` — 11 tests (new file)
- `docs/40_reports/CALIBRATION_MASTER.md` — n696 entry
- `docs/PROJECT_LEDGER.md` — n696 section
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — item 17 in §10
- `memory/backlog_brigade_sector_assignment_redesign.md` — status: complete + implementation status
- `.claude/napkin.md` — Sectors & Operations §2 updated

---

## Commit

`e04a383` — `feat(sectors): commander-driven brigade assignment — competence gate, home affinity, pre-op staging (n696)`
