# [084] Temporal/writer argument — independent review

**Verdict: GO_CONDITIONAL_P4_ONLY_WITH_QUALIFICATIONS.** The retained mapping and phase-order evidence supports a bounded, direction-specific P4 inference for the observed t177–179 rows. It does not support a captured gate fact or an all-writers claim.

## Accepted conditional inference

Under the finite writer set inspected in `084-order-whowrites.stdout.log` and `084-order-greps.stdout.log`, plus the premise that an `in_transit` movement state has a non-empty `destination_sids`, a post-turn row whose `mv_state` is `in_transit` and whose state-sourced destination is `BG2` supports this inference: the same brigade had an `in_transit` movement state containing `BG2` at that turn's earlier readiness gate. The inspected creators and retargeters run before the gate; the inspected post-gate movement-state writer, `correctTransitStates`, can delete the state but does not create or retarget it. A row that survives post-turn therefore excludes that deletion for that brigade on that turn.

This supports only the conditional t177–179 temporal bridge for the 112th and 4th Guards. It does not itself prove the aggregate `any_approaching` result, the exact approach-set member, all writers, or the gate branch taken. The separate graph/membership premises remain required.

## Findings and required wording

1. **The field mapping is asymmetric.** `mv_state` is a direct read of `brigade_movement_state[id].status` (`src/scenario/brigade_temporal_emit.ts:185,212`). `mv_destinations` prefers a non-empty movement-state destination list, but falls back to the movement order when that state list is empty (`:187-192`). The gate predicate reads only movement-state status and destinations (`src/sim/combat/sector_offensive_launch_helpers.ts:602-617`). Therefore the same-destination inference requires the stated non-empty-state-destination premise; the serialized destination alone does not prove its source.

2. **Replace “all creators/rewriters precede the gate.”** The receipts establish only that all *known sites found by the finite searches* that create or retarget `in_transit` precede the gate, and that the known inspected post-gate sites are deletion-only. `whowrites` missed the alias mutation in `correctTransitStates`, so its inventory is demonstrably non-exhaustive. This is the instructed first-unexcluded-writer stopping boundary, not a reason to expand the search.

3. **Do not use final-turn elite-loan absence to exclude t177–179 writers.** `084-order-actors-out.json` measures absence at t181 only; it cannot establish absence at t177, t178, or t179. That premise should be removed from the exclusion argument. The forward implication above survives because the identified elite-loan sites are deletion-only, so retained post-turn presence is the relevant direction. Conversely, post-turn absence cannot establish gate absence.

4. **Keep the claim conditional and source-derived.** Sequential phase order plus the inspected writer directions provide a source inference. They are not direct captured gate state, an exhaustive alias-aware writer proof, or historical-cause evidence.

## Cheapest direct diagnostic left available

If a future run is separately authorized, the existing opt-in `src/sim/combat/axis_readiness_debug.ts` output can directly capture aggregate `any_approaching` / `held_by_approaching`. It does not identify the exact brigade member, so it cannot by itself close the remaining membership premise. No run or instrumentation change was performed in this review.

## Evidence and checks

- Worker report SHA-256: `4b01f6b97c0744bd698cc4d5720d98428ba22402bd30bbb52577073090f2df6a`.
- Actor receipt exit `0`; actor output SHA-256 `38ad0f099516eae3761d9e875bdc424198be93082d4f7e3048046c4f597d8204`.
- Grep receipt exit `0`; grep output SHA-256 `7e1ce769e5949e2d589fd8a53c7e88761f604fee5e281710cbe61bf3c83a87c5`.
- `whowrites` receipt exit `0`; output SHA-256 `14d9b2428325c1c4d3f419b693af5989b31281c114d7941903da55fe0fe63c80`.
- Focused retained-file/source reads and hash checks exited `0`. No campaign, replay, comparator, test, collector, historical extraction, broad writer inventory, or reconstruction was run.

## Preserved boundaries

Calibration remains **NO-GO**; n42 remains observational **GO**. Original 517 attribution and actual-used literal 31 remain open. This review makes no town/match, 188-week, or acceptance change.
