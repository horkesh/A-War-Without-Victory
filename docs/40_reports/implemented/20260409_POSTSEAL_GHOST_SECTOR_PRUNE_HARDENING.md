# 2026-04-09 - Post-Seal Ghost Sector Prune Hardening

## Lane summary

- **Lane title:** Post-seal ghost sector prune
- **Why this lane:** Fresh baseline `n1405` still ended with a live contested ARBiH 1st Corps child sector, `sector:arbih_1st_corps:8`, that had front edges but no territory, no assigned brigades, and no reserve brigades. That leaked into final truth as both `empty_contested_sector` and `undefended_front_subsegments`.
- **Canonical owner after cleanup:** `src/sim/combat/corps_front_sectors.ts` final sector builder
- **Demoted path after cleanup:** late ghost-shell persistence after sibling-front canonicalization / post-merge sealing

## Candidate seams considered

1. Add a new reserve or emergency-coverage doctrine for newly split contested sectors.
2. Reopen split-child territory rescue in `ensureMinimumSectorCoverage(...)`.
3. Prune late ghost sectors that become empty only after post-merge/post-seal mutators.

## Exact seam chosen

`buildCorpsFrontSectors(...)` already had an early zero-brigade prune inside `buildFactionSectors(...)`, but several late mutators still ran after that prune:

- `canonicalizeSiblingFrontOwnership(...)`
- `sealMergedSectorTruth(...)`
- `relocateMisassignedBrigadesToTruthfulOwners(...)`
- second `sealMergedSectorTruth(...)`

Those passes could leave behind a sector shell with live front edges but no `territory_osids`, `assigned_brigade_ids`, or `reserve_brigade_ids`. Because no post-seal prune existed, that shell survived into final sector truth and then into sub-segment assignment/anomaly reporting.

## Why this was the highest-value bounded step

This was still pure hardening:

- the owner was already clear (`buildCorpsFrontSectors(...)`)
- the final state was wrong now, not merely ugly
- no new gameplay contract was needed
- the seam was narrow and directly provable against the same `40w` run that exposed it

Podrinje strandedness remained a stronger redesign candidate than a bounded hardening lane, and East Bosnian zero-eligible execution remained runtime-real but strategically below a live final-truth leak.

## Canon / invariants alignment

- **War Specification v0.6.0:** War-front truth is derived and deterministic; control/frontline mechanics must not serialize false authority.
- **Systems Manual v0.7.0 §2.1:** corps sectors are the canonical frontline spatial truth, and brigades/shells should prefer sectors whenever they exist.
- **Engine Invariants v0.7.0 §13 / derived-state rules:** derived frontline state must be recomputed each turn and kept coherent.
- **CODE_CANON.md:** downstream UI/harness surfaces should consume canonical owner truth, not compensate for stale artifacts.

The fix preserves that model. It does not invent a new sector-viability rule or new reserve doctrine; it simply stops serializing a ghost artifact after the canonical builder has already determined that the sector owns nothing.

## Files changed

- `src/sim/combat/corps_front_sectors.ts`
- `tests/postmerge_ghost_sector_prune.test.ts`
- `docs/40_reports/implemented/20260409_POSTSEAL_GHOST_SECTOR_PRUNE_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

### Code

Added `pruneGhostArtifactSectors(...)` to `src/sim/combat/corps_front_sectors.ts` and used it in two places:

1. the existing early ghost-sector prune path inside `buildFactionSectors(...)`
2. a new post-seal prune immediately after the second `sealMergedSectorTruth(...)` in `buildCorpsFrontSectors(...)`

The prune is intentionally narrow and deterministic:

- sector still has `length_edges > 0`
- `territory_osids.length === 0`
- `assigned_brigade_ids.length === 0`
- `reserve_brigade_ids.length === 0`

That matches the live `n1405` ghost shape and avoids pruning sectors that still own territory or brigades.

### Regression coverage

`tests/postmerge_ghost_sector_prune.test.ts` locks the exact post-seal ghost shape:

- ghost sector with edges but no territory/brigades is removed
- contested sectors with territory or brigades are preserved

## Verification

### Targeted tests

- `npx.cmd vitest run tests/postmerge_ghost_sector_prune.test.ts`
- `npx.cmd vitest run tests/sector_builder_sealing.test.ts tests/final_sector_truth_reconciliation.test.ts tests/sector_front_overlap_canonicalization.test.ts`

### Scenario / runtime proof

- Baseline scenario: `npm.cmd run sim:scenario:run:40w` -> `n1405`, hash `dbd50f6e5aaacb95`
- Post-fix scenario: `npm.cmd run sim:scenario:run:40w` -> `n1406`, hash `b9d4706b45e36354`
- Consistency: `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1406`

### Full verification bar

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed.

## Exact scenario / anomaly proof

### Baseline

Run `n1405`:

- `end_report.md` included:
  - `empty_contested_sector` for one sector
  - `undefended_front_subsegments` for `subseg:arbih_1st_corps:split1`
- `final_save.json` showed:
  - `sector:arbih_1st_corps:8`
  - `assigned_brigade_ids = []`
  - `reserve_brigade_ids = []`
  - `territory_osids = []`
  - sub-segment `subseg:arbih_1st_corps:split1` with `gap = true`

### Post-fix

Run `n1406`:

- `end_report.md` no longer contains either:
  - `empty_contested_sector`
  - `undefended_front_subsegments`
- `final_save.json` no longer contains `sector:arbih_1st_corps:8`
- `brigade_far_from_home_unassigned` remains unchanged at `2/211` (`rs_1st_podrinje`, `rs_5th_podrinje`)

### Before / after difference

- **Fixed:** late ghost sector `sector:arbih_1st_corps:8`
- **Fixed:** `subseg:arbih_1st_corps:split1` unmanned-gap anomaly
- **Unchanged but unrelated:** Podrinje strandedness
- **No new ownership regressions introduced:** run-consistency validator stayed green with `0` unresolved assignment-sync violations

## Player-visible truth after cleanup

The player/harness-facing truth is simpler and more honest:

- no empty contested ghost child sector is serialized for ARBiH 1st Corps
- no false unmanned front gap is reported for that child
- residual warnings now focus on still-real seams rather than a leaked builder artifact

## Canonical UI / reporting surface after cleanup

- canonical frontline owner: `corps_front_sectors`
- canonical downstream reporting surfaces: scenario `end_report.md`, `run_summary.json`, and any UI/harness view derived from final sector truth

No UI owner changed in this lane; the fix removed a false engine artifact before it reached downstream surfaces.

## Residual risks

- This lane intentionally prunes only the exact ghost shape `edges + no territory + no brigades`. If a future seam produces a sector that is empty but still truthfully owns territory, it will remain visible and require its own lane.
- Podrinje strandedness remains blocked on a resolver-contract decision.
- `cmd_vrs_east_bosnian_t29` remains a separate runtime seam, but not the highest-value one for this lane.

## Stop reason for the lane

Lane complete. One real runtime-truth seam is materially stronger, the ownership story is cleaner, verification is green, and fresh scenario proof shows the target anomaly family disappearing rather than being reworded.

## Exact next lane

Reassess the board from `n1406`, then choose between:

1. `cmd_vrs_east_bosnian_t29` zero-eligible execution as the next substrate cleanup lane, if runtime evidence still supports it as a mechanical seam.
2. stop-and-ask on Podrinje strandedness if it rises back to the top, because that now requires a new resolver contract rather than preservation of an existing owner.
