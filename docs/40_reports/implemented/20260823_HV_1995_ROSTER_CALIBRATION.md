# HV 1995 Roster Calibration

**Date:** 2026-08-23
**Baseline:** n272 at clean `4dd557537f6ca5e453440729ad270b1d453d2e92`
**Result:** n273 at clean `99bc0cf62729e43908a714dda3621c1100a1cbad`

## Summary

- The already-coupled turn-174 spawn and `hv_phantom` movement repair was retained. This packet did not split or retune that hard constraint.
- A permanent catalog diagnostic established what the production western-Bosnia catalog actually authors. It now distinguishes default routes from redirect variants, requires formation-specific spawn evidence, calls date overlap only `AUTHORED_POST_SPAWN_WINDOW`, and binds catalog claims to the run commit by Git blob identity.
- Two clean one-change 188-week runs isolated the content changes. Adding 1st HGZ to Southern Move's main roster was trajectory-inert in n272 because the operation remained blocked on Sipovo staging. Adding 1st HGZ to Mistral II's Sipovo axis in n273 produced 12 operation turns and 5 full-stack battle hits for the formation, completed the Sipovo dependency, and raised historical control fit from 628/712 to 637/712.

## Changes Made

### Permanent diagnostic

`tools/diagnostics/hv_1995_lifecycle.ts` now traverses all four production western-Bosnia opportunities and reports, per expeditionary formation:

- default-route and named-variant assignments separately;
- the observed spawn turn from the run artifact;
- authored date-window overlap before or after that spawn;
- `NOT_ESTABLISHED` when the formation's spawn is absent or when the current catalog blob differs from the run commit's catalog blob.

The catalog projection does not claim runtime staging access, eligibility, selection, or combat. Those are separate artifact projections. Adversarial tests prove that redirect-only authorship remains distinguishable, a missing spawn cannot become a pre-spawn conclusion, and a changed checkout catalog cannot reinterpret an older run. Known 112th Brigade default-route authorship and its post-spawn window are the catalog positive controls.

### Historically authorized roster corrections

- Added `hv_1st_hgz_1995` to Southern Move's modeled main Mrkonjic axis. Balkan Battlegrounds Volume I, printed p.390 (digital p.427), names 1st HGZ among the operation's three main shock formations.
- Added `hv_1st_hgz_1995` to the default and redirect-variant Mistral II Sipovo axis. Balkan Battlegrounds Volume I, printed pp.380-381 (digital pp.417-418), places 1st HGZ on Vitorog and in the supporting advance into Sipovo.

The evidence does not authorize putting 126th HGR on the modeled main Southern Move axis: the source assigns it a diversion 15-20 km west. Nor does the source individually identify the modeled 7th HGR, 134th HGR, or 141st Reserve Brigade among the unnamed five home-defense and three reserve formations supporting Maestral. Those roles remain open.

## Scenario Results

Both runs used Node `v24.13.0`, the headless harness, 188 weeks, collapse disabled, and consumed-input digest `be30f7c708f3e27a0df84507bc0566219f88fa5a5772ca961b3cce486625752b`. Both recorded `git_dirty: false`.

| Measure | n272: Southern roster only | n273: plus Mistral Sipovo | Delta |
|---|---:|---:|---:|
| Matched October 1995 OSIDs | 628/712 | 637/712 | +9 |
| Named anchors | 31/31 | 31/31 | 0 |
| Final hash | `68fb8b09c4fd7260` | `cc88344e922ac8b4` | changed |
| 1st HGZ operation turns | 0 | 12 | +12 |
| 1st HGZ full-stack battle hits | 0 | 5 | +5 |
| Invalid operations | 0 | 0 | 0 |

The n272→n273 controller comparator was positive-controlled by mutating one matched OSID and observing the expected score delta. Exactly nine cells changed; all nine were gains from RS to the painted HRHB target, with zero losses and zero neutral controller churn:

- Mrkonjic Grad: `bjelajce_2`, `gerzovo_2`, `majdan_2`, `mrkonjic_grad_2`, `podrasnica_2`.
- Sipovo: `gornji_mujdzici_2`, `pribeljci_2`, `sipovo_2`, `volari_2`.

Mistral II began at turn 175 and entered execution at turn 178. Its weekly diagnostic reached 11 logged capture receipts before recovery, but the canonical AAR credits 9/11 objectives and grades the operation `partial`; the receipt count is not reported as canonical completion. Southern Move was blocked at turn 182, became eligible at turn 183 after the Sipovo dependency changed, entered execution at turn 184, and held 5/6 objectives at the turn-188 boundary. The 1st HGZ itself did not join Southern Move within this horizon because it was still owned by Mistral II's lifecycle when Southern Move formed; no Southern Move battle participation by 1st HGZ is claimed.

n273 is valid for combat calibration: 764 attack orders, 556 battles, zero invalid operations, zero recovery-without-logged-attempt rows, and zero zero-eligible-attacker operations. The strict 188-week engine-health gate passes all hard checks at 637 matched OSIDs, 6 stranded brigades, 2 ghost-destroyed rows, 0 consistency failures, and K:W 3.702. Troop totals, casualty deltas, and displacement deltas between n272 and n273 were not separately analyzed; no conclusion about them is made here.

## Verification

- TDD red: four failures demonstrated the old harness's duplicate-route blindness, reachability overclaim, missing-spawn misclassification, and absent provenance validator.
- Focused green after repair: 114/114 tests across the lifecycle, western catalog, general opportunity catalog, and opportunity-substrate files.
- Wider HV/engine slice: 228/228 tests across 14 files.
- Scenario anchors: 4 selected tests passed; the suite retains its explicit negative control.
- TypeScript typecheck passed.
- n273 strict engine-health gate passed.
- Protected tracked artifacts remained unchanged: `latest_run_final_save.json` SHA-256 `A9EBCEA481BDE4FEF0E69FAC119E124812922247C1D07F19D95A3F8BF2BE1E4C`; manifest SHA-256 `2BD8549068935249C7FEE8C9BFC27C9B21950C0AA11C2D38B41043024124D03F`.

## Review and Limits

Historical/canon review granted GO for both 1st HGZ assignments and explicitly withheld authorization for inferred main-axis roles for the 126th, 7th, 134th, or 141st formations. Initial QA and red-team review held promotion on the diagnostic and missing durable evidence; their harness findings were reproduced and repaired in commit `8f7f419c6`. Final re-review is required before integration.

The scenario baseline manifest was not refreshed. n273 is calibration evidence, not a new pinned baseline.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` | 1st HGZ rostered on Mistral II Sipovo and Southern Move main axes with BB citations |
| `tools/diagnostics/hv_1995_lifecycle.ts` | Provenance-bound catalog/date-overlap diagnostic with route identity and positive controls |
| `tests/hv_1995_lifecycle_diagnostic.test.ts` | Adversarial and positive-control coverage |
| `tests/operation_opportunities_federation_western_bosnia_catalog.test.ts` | Default/variant and Southern roster contracts |
| `docs/plans/2026-08-23-hv-1995-roster-calibration-design.md` | Design and evidence boundary |

## Next Steps

1. Obtain independent final GO on the repaired exact head.
2. Merge the complete tree only; do not split timing from movement.
3. Leave 126th/7th/134th/141st operation roles open until formation-specific historical and map-axis evidence exists.
4. Do not regenerate the baseline manifest as part of this packet.
