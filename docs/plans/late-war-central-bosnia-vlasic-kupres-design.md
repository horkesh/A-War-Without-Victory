# Late-War Central Bosnia / Vlasic-Kupres Opportunities

**Date:** 2026-05-10  
**Status:** Phase 2 slice live for `vlasic_ridge_95`; Kupres/Cincar and Federation-western Bosnia remain future entries.  
**Generic substrate:** `docs/plans/late-war-operation-opportunity-system-design.md`

## Scope

This family covers non-sensitive Ring 1 military opportunities in Central Bosnia after the Washington Agreement. The first implemented entry is `vlasic_ridge_95`, an ARBiH 3rd Corps proposal for the Travnik / Vlasic ridge line in the spring 1995 window.

The family deliberately does not model civilian-harm choices, atrocity levers, rupture suppression, or sensitive-history T4 entries. It is an authorization shell over normal `CorpsOperation` execution, with the standard opportunity outcomes: approve, delay, redirect, under-resource, decline, and later AAR exit-class linkage.

## Implemented Entry

`vlasic_ridge_95`:

- **Tier:** T1 operation opportunity.
- **Faction / corps:** RBiH / `arbih_3rd_corps`.
- **Window:** turns 152-166, representing the spring 1995 Central Bosnia mountain-operation season.
- **Axes:** Travnik ridge line plus Skender Vakuf shoulder.
- **Variants:** `ridge_probe` for a narrower ridge action; `bugojno_support` for a support-axis redirection.
- **Historical exit reference:** `partial_success`, not a forced result.

## Prerequisite Mapping

- `date_window`: required, spring 1995.
- `corps_readiness`: required, via `computeCorpsOperationReadiness`.
- `staging_access`: required, Travnik / Turbe / Cukle anchors held by RBiH.
- `enemy_weakness`: required, at least one Vlasic-ridge target remains RS-held.
- `alliance_context`: required, RBiH-HRHB post-Washington coordination above 0.50.
- `logistics`: optional, RBiH supply pressure below critical band.
- `weather_season`: optional, spring mountain conditions.
- `commander_confidence`: optional, 3rd Corps commander state present.
- `force_quality`: optional, axis coordination above the two-axis threshold.

The entry requires at least two optional axes green. This lets a supply-strained but institutionally coherent corps still surface the proposal, while preventing a proposal when multiple soft signs point against it.

## Not Yet Implemented

- Autumn 1994 Kupres pressure / Cincar dependency node.
- A separate early failed/postponed Vlasic attempt entry.
- Federation-western Bosnia expansion entries.
- Dated-paint comparison tooling that reports opportunity eligibility alongside painted-target misses.

## Test Contract

`tests/operation_opportunities_central_bosnia_catalog.test.ts` proves:

- Catalog exposure through the Central Bosnia family and canonical catalog.
- Window discipline and live-state gates.
- Two-optional-axis topology.
- Decline resolution without op spawn.
- Approve and redirect through the canonical `buildCorpsOperation` path.
- AAR exit-class linkage for partial outcomes.
