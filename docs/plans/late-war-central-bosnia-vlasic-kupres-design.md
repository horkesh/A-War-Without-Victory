# Late-War Central Bosnia / Vlasic-Kupres Opportunities

**Date:** 2026-05-15
**Status:** Phase 2 slices live for `kupres_cincar_94`, `vlasic_ridge_95`, and the first Federation-western Bosnia dependency consumer `mistral_2_95`.
**Generic substrate:** `docs/plans/late-war-operation-opportunity-system-design.md`

## Scope

This family covers non-sensitive Ring 1 military opportunities in Central Bosnia after the Washington Agreement. Implemented entries now include `kupres_cincar_94`, an HRHB/HVO/HV autumn 1994 dependency opportunity around Kupres/Cincar; `vlasic_ridge_95`, an ARBiH 3rd Corps proposal for the Travnik / Vlasic ridge line in the spring 1995 window; and `donji_vakuf_95`, an ARBiH 7th Corps September 1995 proposal for Donji Vakuf.

The family deliberately does not model civilian-harm choices, atrocity levers, rupture suppression, or sensitive-history T4 entries. It is an authorization shell over normal `CorpsOperation` execution, with the standard opportunity outcomes: approve, delay, redirect, under-resource, decline, and later AAR exit-class linkage.

## Implemented Entry

`kupres_cincar_94`:

- **Tier:** T1 operation opportunity.
- **Faction / corps:** HRHB / `hvo_tomislavgrad`.
- **Window:** turns 132-142, representing the autumn 1994 Kupres/Cincar window.
- **Axes:** Kupres line, with a redirect variant for the Glamoč shoulder dependency.
- **Variants:** `kupres_line_only` for a narrower Kupres action; `glamoc_shoulder` for a dependency-shaping western shoulder.
- **Historical exit reference:** `partial_success`, not a forced result.
- **Dependency purpose:** opens live-control anchors used by later Federation-western Bosnia opportunities; it is not a hidden calendar flag.

`vlasic_ridge_95`:

- **Tier:** T1 operation opportunity.
- **Faction / corps:** RBiH / `arbih_3rd_corps`.
- **Window:** turns 152-166, representing the spring 1995 Central Bosnia mountain-operation season.
- **Axes:** Travnik ridge line plus Skender Vakuf shoulder.
- **Variants:** `ridge_probe` for a narrower ridge action.
- **Historical exit reference:** `partial_success`, not a forced result.

`donji_vakuf_95`:

- **Tier:** T1 operation opportunity.
- **Faction / corps:** RBiH / `arbih_7th_corps`.
- **Window:** turns 177-180, representing the September 1995 Donji Vakuf window.
- **Axes:** northern and southern Donji Vakuf lines from Bugojno staging.
- **Variants:** none.
- **Historical exit reference:** `partial_success`, not a forced result.
- **Dependency purpose:** fills the Donji Vakuf catalog gap without using painted-control overrides or changing combat math.

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

`kupres_cincar_94` maps the same vocabulary with HRHB/HVO-specific owners:

- `date_window`: required, autumn 1994.
- `corps_readiness`: required, via `computeCorpsOperationReadiness` for `hvo_tomislavgrad`.
- `staging_access`: required, Livno / Tomislavgrad / Kupres staging anchors held by HRHB.
- `enemy_weakness`: required, at least one Kupres/Cincar objective remains RS-held.
- `alliance_context`: required, RBiH-HRHB post-Washington coordination above 0.50.
- `logistics`: optional, HRHB supply pressure below critical band.
- `weather_season`: optional, autumn mountain conditions.
- `commander_confidence`: optional, HVO Tomislavgrad commander state present.
- `force_quality`: optional, axis coordination above the Kupres/Cincar threshold.

`donji_vakuf_95` maps the same vocabulary with ARBiH 7th Corps owners:

- `date_window`: required, September 1995.
- `corps_readiness`: required, via `computeCorpsOperationReadiness` for `arbih_7th_corps`.
- `staging_access`: required, Bugojno staging anchors held by RBiH.
- `enemy_weakness`: required, at least one Donji Vakuf objective remains RS-held.
- `alliance_context`: required, Operation Storm theater rupture has fired.
- `logistics`: optional, RBiH supply pressure below critical band.
- `weather_season`: optional, September conditions.
- `commander_confidence`: optional, 7th Corps commander state present.
- `force_quality`: optional, axis coordination above the Donji Vakuf threshold.

## Remaining Work

- A separate early failed/postponed Vlasic attempt entry.
- Additional Federation-western Bosnia expansion entries beyond the first `mistral_2_95` slice.
- Dated-paint comparison tooling that reports opportunity eligibility alongside painted-target misses.

## Test Contract

`tests/operation_opportunities_central_bosnia_catalog.test.ts` proves:

- Catalog exposure through the Central Bosnia family and canonical catalog.
- Kupres/Cincar dependency surfacing, gates, variants, and canonical spawn.
- Donji Vakuf surfacing, Storm-rupture/staging/live-objective gates, and canonical spawn.
- Window discipline and live-state gates.
- Two-optional-axis topology.
- Decline resolution without op spawn.
- Approve and redirect through the canonical `buildCorpsOperation` path.
- AAR exit-class linkage for partial outcomes.
