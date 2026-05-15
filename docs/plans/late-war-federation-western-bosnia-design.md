# Late-War Federation / Western Bosnia Opportunities

**Date:** 2026-05-15  
**Status:** First non-sensitive slice live as `mistral_2_95`.  
**Generic substrate:** `docs/plans/late-war-operation-opportunity-system-design.md`

## Scope

This family covers non-sensitive Federation / Western Bosnia military opportunities that depend on live theater conditions rather than calendar rails. The first implemented entry is `mistral_2_95`, an HRHB/HVO/HV T1 proposal for the Drvar / Grahovo and Sipovo / Mrkonjic axes after the western theater has ruptured.

The family deliberately keeps Operation Storm as a theater-opening context, not a BiH-player-owned operation. It also keeps civilian-harm choices, atrocity levers, rupture suppression, and sensitive-history T4 entries out of scope.

## Implemented Entry

`mistral_2_95`:

- **Tier:** T1 operation opportunity.
- **Faction / corps:** HRHB / `hvo_main_staff`, with `hvo_tomislavgrad` as a secondary-axis corps.
- **Window:** turns 175-190, representing the late-summer / early-autumn 1995 western Bosnia window.
- **Axes:** Drvar / Grahovo axis plus Sipovo / Mrkonjic axis.
- **Variants:** `drvar_grahovo_axis` and `sipovo_mrkonjic_axis`.
- **Dependency gates:** Operation Storm theater rupture plus live Kupres/Cincar anchors (`op:kupres:bucovaca`, `op:glamoc:glamoc_2`) held by HRHB.
- **Historical exit reference:** `partial_success`, not a forced result.

## Prerequisite Mapping

- `date_window`: required, late 1995.
- `political_authorization`: required, Washington Agreement signed and RBiH-HRHB coordination above 0.50.
- `corps_readiness`: required, HVO Main Staff and HVO Tomislavgrad readiness above the Mistral floor.
- `staging_access`: required, Livno staging plus Kupres/Cincar dependency anchors held by HRHB.
- `enemy_weakness`: required, at least one Mistral objective remains RS-held.
- `alliance_context`: required, western theater rupture has occurred.
- `logistics`: optional, HRHB supply pressure below critical band.
- `weather_season`: optional, late-summer western Bosnia conditions.
- `commander_confidence`: optional, both corps commander states present.
- `force_quality`: optional, HVO/HV axis coordination above threshold.

The entry requires at least two optional axes green. That keeps the proposal from becoming a naked Storm/calendar trigger while allowing the opportunity to surface when live logistics or commander-state evidence is imperfect but the military institution is coherent.

## Single-Owner Migration

`Operation Mistral 2` no longer appears in the active `triggered_operations` catalog. The opportunity catalog is the single owner for this non-sensitive late-war operation because its eligibility depends on theater rupture, Cincar/Kupres dependency anchors, staging access, corps readiness, alliance context, and live enemy-held objectives.

## Remaining Work

- Winter 94 / Leap / Summer 95 western-theater dependency entries if local OSID and owner evidence is sufficient.
- Southern Move as a later endgame-pressure opportunity with diplomacy/ceasefire context.
- Additional campaign-proof diagnostics after a current 188w/default run.

## Test Contract

`tests/operation_opportunities_federation_western_bosnia_catalog.test.ts` proves:

- Family and canonical catalog exposure.
- Single ownership: Mistral 2 is absent from active `triggered_operations`.
- Storm-rupture and Kupres/Cincar dependency gates.
- Window discipline and live enemy-target gates.
- Canonical multi-axis `buildCorpsOperation` spawn on approval.
