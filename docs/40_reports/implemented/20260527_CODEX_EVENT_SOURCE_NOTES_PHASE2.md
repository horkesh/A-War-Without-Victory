# Codex Event Source Notes Phase 2

**Date:** 2026-05-27
**Status:** Implemented

## Summary

Added provenance-only `source_note` fields to 15 additional event rows that historian/canon review cleared for source-note treatment. The change did not alter narrative text, triggers, effects, response logic, bot policy, scenario setup, UI routing, save schema, or calibration behavior.

Rows covered:

- `battle_of_the_barracks_sarajevo`
- `battle_of_the_barracks_tuzla`
- `battle_of_the_barracks_zenica`
- `battle_of_the_barracks_visoko`
- `drina_valley_ethnic_cleansing_1992`
- `operation_corridor_1992`
- `london_conference_1992`
- `hvo_arbih_tensions_rise_1992`
- `jajce_falls_1992`
- `ahmici_massacre_1993`
- `central_bosnia_fighting_1993`
- `markale_area_shelling_1993`
- `markale_massacre_1994`
- `anti_sniping_agreement_1994`
- `second_markale_massacre_1995`

The notes remain bounded to provenance. They add no casualty figures, equipment quantities, causal claims, prohibited player choices, or alternate-outcome prevention framing.

## Diagnostic Delta

`codex_sensitive_claim_inventory` remains stable at 176 scanned files, 296 claims, and 245 stop-gated claims. Source status improved from 196 cited / 72 uncited to 224 cited / 44 uncited.

Remaining uncited event rows are intentionally gated:

- `croat_bosniak_war_begins_1993`
- `visit_to_front_hrhb`
- `federation_ground_offensive_1995`

## Verification

```powershell
npx.cmd vitest run tests\codex_sensitive_history_source_notes.test.ts tests\event_timeline_integrity.test.ts tests\codex_sensitive_claim_inventory.test.ts tests\codex_source_quality.test.ts --reporter=dot
node --check tools\diagnostics\codex_sensitive_claim_inventory.cjs
node tools\diagnostics\codex_sensitive_claim_inventory.cjs --json
git diff --check
```

All checks passed locally. `git diff --check` printed the existing CRLF normalization warning for `data/scenarios/events/war_1992.json` but returned success.

## Remaining Gates

- `croat_bosniak_war_begins_1993` needs narrative review before it can be source-noted because its broad "both sides" sensitive-history framing is too large for provenance-only treatment.
- `visit_to_front_hrhb` needs historian/narrative review because its detention-camp wording lacks a safe same-id source trail.
- `federation_ground_offensive_1995` needs operational wording and dynamic-outcome review before source-note treatment.
