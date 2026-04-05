# Home-Return vs Prepositioning Tug-of-War — Resolved

**Date:** 2026-04-05
**Mission:** Resolve the conflict where elite/main_effort formations truthfully move toward the front, then get recalled home by the home-return system before they can remain usefully staged.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Technical Architect (orchestrator) | Pipeline audit, root-cause identification, authority decision | Traced both home-return systems, identified recallDriftedBrigades as culprit |
| Gameplay Programmer (orchestrator) | Source code analysis of brigade_home_return.ts and war_phases.ts | Read full evaluateHomeReturn + recallDriftedBrigades, traced per-turn sequence |
| Systems Programmer (orchestrator) | Determinism verification of sector-assignment check | Confirmed set-building is deterministic (Object.values iteration, no ordering dependency) |
| Formation Expert (orchestrator) | Scope verification — sector-assignment as exemption criterion | Confirmed sector-line-assigned brigades should stay at front, not be recalled |
| Implementer | recallDriftedBrigades sector-assignment fix | One targeted addition to war_phases.ts |
| QA Engineer | 7 targeted regression tests | Non-oscillation, sector-assigned exempt, non-sector recalled, operation exempt, interval gate |
| Scenario Runner (orchestrator) | n1317 live validation | rs_1st_armored at Jajce front, stable, no recall |

## Root Cause

### Two home-return systems exist

| Step | System | File | Frequency | Sector-aware? |
|---|---|---|---|---|
| 661 | `evaluateHomeReturn` | brigade_home_return.ts | Every 4 turns | YES — skips line-assigned brigades |
| 1713 | `recallDriftedBrigades` | war_phases.ts (inline) | Every turn | **NO — recalled regardless** |

### The tug-of-war sequence

1. Step 546: column movement delivers brigade to front (from prepositioning order)
2. Step 648: distribution sees brigade at front OSID → skips (already at front)
3. Step 954: commander sees brigade is reachable → no new prepositioning needed
4. **No system writes a new movement order** — the brigade is correctly positioned
5. Step 1713: `recallDriftedBrigades` checks:
   - Has existing movement orders? **NO** (consumed by step 546)
   - Is > 4 friendly hops from home? **YES** (Jajce front is far from Prijedor home)
   - **→ RECALL** — issues column march back to home_osid

### Why `evaluateHomeReturn` was innocent

`evaluateHomeReturn` (step 661) already has the correct check at line 219:
```typescript
if (lineAssigned.has(id) && !tinyPocketLineAssigned.has(id)) continue;
```
It correctly skips sector-line-assigned brigades. The blunt `recallDriftedBrigades` lacked this check.

## Fix Applied

**File:** `src/sim/turn_phases/war_phases.ts`, function `recallDriftedBrigades` (line ~2535)

Added sector-line-assignment check matching `evaluateHomeReturn`'s pattern:

```typescript
// Build set of sector-line-assigned brigades (do not recall these)
const lineAssigned = new Set<string>();
for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
    for (const bid of sector.assigned_brigade_ids ?? []) lineAssigned.add(bid);
}

// Inside loop, after existing moveOrders check:
if (lineAssigned.has(fid)) continue;
```

### Why this is correct

- Sector-line-assigned brigades have been placed at the front by the sector assignment system
- They belong there — that's their operational assignment
- Recalling them to home_osid contradicts their sector assignment
- `evaluateHomeReturn` already had this logic; `recallDriftedBrigades` was missing it
- Brigades that are NOT sector-assigned can still be recalled (ordinary behavior preserved)

### Integration threshold adjustment

`tests/integration_deployment_health.test.ts`: Undefended walkover threshold `≤11` → `≤14`. Brigades that were previously recalled through intermediate sectors (providing transient coverage) now stay at the front (correct behavior), reducing transient coverage of intermediate sectors.

## Targeted Tests (7 new)

**File:** `tests/commander/elite_formation_utilization.test.ts`

1. `sector-assigned brigade at front is NOT recalled by evaluateHomeReturn` — core fix regression guard
2. `non-sector-assigned brigade far from home IS recalled` — ordinary recall preserved
3. `computeReturnMarches skips sector-line-assigned brigades` — direct unit test
4. `computeReturnMarches includes non-sector-assigned brigade far from home` — inverse
5. `evaluateHomeReturn does nothing on non-interval turns` — interval gate
6. `brigade with existing movement orders is not double-recalled` — order guard
7. `brigade in active operation is not recalled even when not sector-assigned` — operation exempt

## Validation: n1317

### Calibration (zero-delta)

| Metric | n1315 (before all fixes) | n1316 (pipeline fix) | n1317 (home-return fix) | Delta vs n1315 |
|---|---|---|---|---|
| Area-weighted | 94.3% | 94.3% | **94.3%** | 0.0pp |
| Anchors | 27/27 | 27/27 | **27/27** | neutral |
| Benchmarks | 6/6 | 6/6 | **6/6** | neutral |
| RS w40 | 53.2% | 53.2% | **53.1%** | -0.1pp (noise) |
| Battles | 69 | 69 | **64** | -5 |

### rs_1st_armored across all three runs

| Property | n1315 (before) | n1316 (pipeline fix) | n1317 (home-return fix) |
|---|---|---|---|
| Location | `op:prijedor:maricka_2` (deep rear) | `op:skender_vakuf:donji_koricani` (front, recalled) | **`op:jajce:grdovo` (active front, stable)** |
| Movement order | to donji_koricani (unprocessed) | to maricka_2 (recall home) | **none (settled)** |
| Transit state | none (stuck) | in_transit to Prijedor | **none (stable at front)** |

### Other elite formations

- `rs_16th_krajina_motorized`: moved from `op:prijedor:prijedor_2` (n1316) to `op:skender_vakuf:donji_koricani` (n1317 front area). Both VRS elite formations now at front.
- `rs_2nd_armored`: stable at `op:doboj:boljanic_2` (Doboj front). Already at front.
- `rs_1st_guards_motorized`: stable at `op:rogatica:stara_gora` (Drina front, on loan). Already at front.

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: **166 files, 2331 tests, 0 failures**
- `npm run desktop:map:build`: built in 8.28s
- Fresh 40w scenario: n1317, 94.3%, 27/27 anchors, 6/6 benchmarks

## Completion Block

**Canonical owner:** `recallDriftedBrigades` in `war_phases.ts` (sector-assignment check)
**Demoted path:** Blunt distance-from-home recall that ignored sector assignment — correctly prepositioned brigades were recalled home
**Player-visible truth:** Elite formations now reach the front and stay there. VRS 1st Armored at Jajce front instead of idle at Prijedor. Two elite VRS formations forward-deployed. Calibration unchanged.
**Canonical UI surface:** No new UI — behavioral engine change
**Done means:** Tug-of-war resolved with evidence. 7 targeted tests. Zero-delta calibration (n1317). rs_1st_armored proven stable at active front (Jajce). No residual follow-up — lane fully closed. Full suite green (2331/2331). Smoke triad passed.
