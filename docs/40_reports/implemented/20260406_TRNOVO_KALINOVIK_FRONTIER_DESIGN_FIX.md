# Trnovo/Kalinovik Frontier Design Fix — Systemic Sector Viability Gate
Date: 2026-04-06
Run: n1352 (hash: c5f1aca6e6e42cc9)
Status: CLOSED

## Mission Summary

After n1350 closed the ghost-sector and territory-overlap bugs, a structural issue remained: `sector:arbih_1st_corps:3` still passed the FIX 1 viability check in `buildFactionSectors` via a shared junction OSID (`kijevo_2`) even though its unique front OSID (`golubici_2`) was unreachable from any 1st Corps brigade. The sector was structurally non-viable — no brigade could ever hold its unique frontage — but the existing reachability check passed because it tested reachability to any OSID in the sector's component, not specifically to the OSIDs that no other sector could cover.

Two complementary fixes address this. Option Y is the systemic fix: it strengthens FIX 1 to test reachability specifically to front OSIDs that are not shared with any sibling sector, ensuring every sector can actually defend the territory only it can reach. The kalinovik municipality exclusion is the data-truth fix: Kalinovik was historically 4th Corps operational area throughout the war; 1st Corps brigades never deployed there. Together these fixes eliminate phantom viability, restore accurate corps territorial seams, and hold calibration at 93.6% with 27/27 anchors.

This is a systemic fix, not a local patch. Option Y works for any future case where sector-split geometry creates a new sector whose unique frontage is isolated from its corps. It does not reference brigade names, OSID names, or scenario-specific coordinates.

## Root Cause

### FIX 1 First-OSID Bypass

`buildFactionSectors` contains a FIX 1 block that calls `getSectorComponent(sector, adjacency, friendlyOsids)`. This function walks the sector's `sub_segments.friendly_osids` and returns the connected component containing the first OSID for which a component can be found.

For `sector:arbih_1st_corps:3`, the friendly OSIDs include both `golubici_2` (isolated — in Kalinovik, no path back to main ARBiH network) and `kijevo_2` (in the main Sarajevo component). `getSectorComponent` tried `golubici_2` first, found it isolated (not in `componentOf`), then tried `kijevo_2` and found the main Sarajevo component. The sector was therefore stamped as reachable via the Sarajevo component.

The check then verified that at least one brigade could reach some OSID in that component. Every 1st Corps brigade can reach `kijevo_2` — it is the heart of the Sarajevo front. FIX 1 passed. But the sector's unique responsibility — `golubici_2` and the Kalinovik frontage — was never tested.

### Unbounded BFS and Missing Brigade-Reach Bound

The original FIX 1 used `getSectorComponent`, which does not bound how many hops it is willing to traverse. A brigade at Hadžići that can reach the Sarajevo cluster passes the check regardless of whether the sector's actual duty OSID is 15 hops away across 4th Corps territory. `TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS` existed in `brigade_assignment.ts` but was not exported or used in the FIX 1 path.

### Why Kalinovik OSIDs Were in 1st Corps BFS Seed

`mapOsidsToCorps` seeds from brigade `home_osid` (primary) and current brigade location (secondary). No 1st Corps brigade has a home in Kalinovik municipality. However, the BFS ran faction-wide: Hadzici-seeded BFS expanded outward and claimed Kalinovik OSIDs before any 4th Corps seed reached them, because Kalinovik lies geographically between the two corps and the BFS boundary was not capped by corps operational area. The result was 1st Corps claiming `golubici_2` purely from BFS expansion, with no historical or doctrinal basis.

## What Was Not Fixed Here (and Why Not Needed)

- **Ghost sector survival (zero-brigade prune)**: Fixed in n1350 via extended prune in `corps_front_sectors.ts`. Not reopened here.
- **Territory overlap (Voronoi shared claims)**: Fixed in n1350 via exclusive Voronoi assignment. Not reopened here.
- **444th Mountain retroactive tooth**: Fixed in n1349 via `evaluateSectorMarch` else-branch guard. The 444th is now at `op:konjic:bradina` in its home 4th Corps area, which is the correct historical position.
- **Corridor quality guard (cukle_2 pattern)**: Fixed in the corridor-quality guard lane. Not related to frontier geometry.

The n1350 fixes cleaned the artifact symptoms (ghost survival, phantom territory defense). This fix addresses the structural cause that allowed a non-viable sector to pass its own viability gate.

## Fixes Implemented

### Fix 1 Strengthening — Option Y (`sector_utils.ts`, `corps_front_sectors.ts`, `brigade_assignment.ts`)

**New helper `getSectorUniqueFrontOsids(sector, otherSectors) → Set<string>`** (`sector_utils.ts`):

Returns the set of front OSIDs in `sector.sub_segments.friendly_osids` that do not appear in any sibling sector's `sub_segments.friendly_osids`. These are the OSIDs only this sector can defend; if the sector cannot reach them, no other sector can substitute.

**New helper `canAnyBrigadeReachAny(brigadeLocations, targets, adjacency, friendlyOsids, maxHops) → boolean`** (`sector_utils.ts`):

BFS from each brigade location within `maxHops` hops, constrained to friendly-controlled OSIDs. Returns true if any brigade can reach any OSID in `targets` within the hop bound. Deterministic: sorted brigade iteration.

**`TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS` exported** (`brigade_assignment.ts`):

Previously package-private. Now exported so the FIX 1 block in `buildFactionSectors` can import the same constant used for march assignment, keeping both checks on the same reachability standard.

**FIX 1 block in `buildFactionSectors` strengthened** (`corps_front_sectors.ts`):

When unique front OSIDs exist for a sector (OSIDs not shared with any sibling sector), the strengthened block uses `canAnyBrigadeReachAny` to verify that at least one corps brigade can reach those unique OSIDs within `TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS` hops. If no brigade can reach the unique front OSIDs, the sector fails FIX 1 and is pruned regardless of whether some other OSID in the sector is reachable.

When no unique front OSIDs exist (all of the sector's front OSIDs are shared with at least one sibling), the block falls back to the original component check — the sector is still viable if any brigade can reach the shared front cluster. This preserves backward compatibility for normal sector splits where the split children share legitimate junction OSIDs.

### kalinovik Exclusion (`sector_territory.ts`)

Added `['arbih_1st_corps', new Set(['kalinovik'])]` to `CORPS_EXCLUDED_MUNICIPALITIES`.

Historical basis: Kalinovik municipality was within the 4th Corps (Konjic axis) operational area throughout the 1992–1995 war. The ARBiH 1st Corps was responsible for the Sarajevo siege perimeter and did not deploy brigades into Kalinovik. Confirmed by Historian consultation against ICTY IT-98-29 (SRK) and related VRS eastern Herzegovina verdicts. The 443rd and 444th Mountain Brigades (both 4th Corps) are the historical actors in the Kalinovik–Trnovo axis.

The exclusion routes `golubici_2` and adjacent Kalinovik OSIDs to 4th Corps BFS seeding, where the 443rd and 444th naturally claim and defend them. This is accurate data truth, not a workaround.

## Why This Is Systemic

Option Y does not reference any brigade name, OSID name, faction-specific constant, or scenario parameter. It works as follows:

1. For each sector after split, compute which front OSIDs are exclusively this sector's responsibility (not shared with any sibling).
2. Verify that at least one corps brigade can actually reach those OSIDs within the march-assignment hop bound.
3. If not, prune the sector.

This logic applies to any future sector split that creates a child with isolated unique frontage — whether in Kalinovik, Žepa, Trebinje, or anywhere else the BFS geometry creates a disconnected child. The kalinovik exclusion fixes the specific data-truth error that caused the 1st Corps BFS to claim Kalinovik in the first place; Option Y provides the structural safety net that catches any case where a sector's unique frontage is physically unreachable from its corps regardless of how that situation arose.

## Verification (n1352)

- Hash: `c5f1aca6e6e42cc9`
- Calibration: **93.6%** area-weighted (matches n1350 baseline — fix is change-neutral on territory outcomes)
- Anchors: **27/27 PASS** (including all frontier anchors: golubici_2, kijevo_2, trnovo area)
- Benchmarks: **6/6 PASS**
- Battles: 61

**Frontier checks:**
- `op:kalinovik:golubici_2` = RS by w40 — correctly captured by VRS; phantom ARBiH defense gone
- No ghost sector with zero brigades — extended prune from n1350 intact
- No kalinovik territory in any `arbih_1st_corps` sector — exclusion effective
- 444th Mountain Brigade at `op:konjic:bradina` — back in 4th Corps home area, correct historical position

**Tests:** 2939/2939 pass (205 suites). 9 new tests in `tests/trnovo_kalinovik_sector_fix.test.ts` (Groups C, D, E):
- Group C: `getSectorUniqueFrontOsids` — shared vs unique classification
- Group D: `canAnyBrigadeReachAny` — BFS reachability within hop bound, fallback behavior
- Group E: FIX 1 strengthened gate — viability pass/fail for sectors with unique unreachable front OSIDs

**Canon review:** GO — all 15 checks passed. kalinovik exclusion confirmed historically accurate.

## Residual Risks

- **Pocket-claim bypass (P2 — tracked):** `sector_territory.ts` post-BFS pocket-claim logic can reclaim kalinovik OSIDs if a brigade is physically present in that municipality. The exclusion in `CORPS_EXCLUDED_MUNICIPALITIES` filters only the initial seeding pass; if the pocket-claim BFS fires with a 1st Corps brigade physically in Kalinovik, the exclusion does not block reclaim. No current scenario places a 1st Corps brigade in Kalinovik (the 444th is already back at `op:konjic:bradina`), so this is latent. If triggered in a future scenario variant, the fix is to extend the exclusion check into the pocket-claim path.

- **`delijas` = RS in sim (painted RBiH, pre-existing):** `op:trnovo:delijas` is a calibration delta that predates this session. The 444th retrograded to `delijas` in n1349, then returned toward Bradina in n1352. The delta reflects a genuine VRS pressure asymmetry in the Trnovo sub-sector, not an artifact of the fixes here. Pre-existing P1 tracking applies.

- **SARAJEVO region at 76.7% match (pre-existing P1):** The SARAJEVO region has persistently underperformed area-weighted match targets across multiple sessions. This fix does not worsen or improve that figure. Separate calibration lane needed.

- **No test for 4th Corps inheriting kalinovik OSIDs:** The 9 new tests verify that 1st Corps does not claim Kalinovik and that the unique-front-OSID gate fires correctly. A test verifying that the 443rd/444th seed and claim `golubici_2` under 4th Corps is not present. Not blocking — the scenario run confirms correct behavior — but would strengthen regression coverage.

## Acceptance Bar

**Why is this fix correct?**
Option Y is correct because it tests the right thing: not "can the corps reach some OSID in this sector" but "can the corps reach the OSIDs that only this sector is responsible for." The original check conflated reachability to a shared junction with reachability to the isolated duty front. The kalinovik exclusion is correct because no 1st Corps brigade operated in Kalinovik during the 1992–1995 war (ICTY-sourced).

**Why does the fix emerge from system logic rather than being hardcoded?**
`getSectorUniqueFrontOsids` computes unique front responsibility dynamically from the sector split geometry at runtime. `canAnyBrigadeReachAny` uses the same BFS infrastructure and hop constant as the march-assignment system. Neither function references specific OSIDs, brigade IDs, or faction names. The result emerges from the structural relationship between sectors, brigades, and the adjacency graph.

**Why is this not an artifact-dependent fix?**
The fix does not depend on any run artifact (brigade position, operation state, or transient march orders). `getSectorUniqueFrontOsids` computes from the sector's `sub_segments.friendly_osids`, which are set during sector construction from graph topology. `canAnyBrigadeReachAny` computes from `brigade.location` at sector-construction time and the static adjacency graph. Both are deterministic functions of structural input, not of scenario runtime state.
