# v0.9.1 Codex Humanitarian And Diplomatic Breadth

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

Expanded authored Dynamic Codex coverage using only existing resolver atoms and interpolation tokens. No resolver behavior, historical baseline contract, save schema, or Cost Ledger generation changed.

New consumers:

| Essay | Section | Gate |
|---|---|---|
| Drina valley ethnic cleansing | `v091_drina_rs_war_crimes_findings` | `GAME_OVER AND FINDING:war_crimes_record_RS` |
| Omarska and Trnopolje camps | `v091_camps_displacement_findings` | `GAME_OVER AND FINDING:civilian_displacement_record AND DISPLACEMENT_ABOVE:1.1` |
| HVO detention camps | `v091_hvo_camps_hrhb_war_crimes_findings` | `GAME_OVER AND FINDING:war_crimes_record_HRHB` |
| Markale / Sarajevo shelling | `v091_sarajevo_shelling_human_cost_findings` | `GAME_OVER AND FINDING:human_cost_record AND CASUALTY_ABOVE:1.1` |
| Dayton talks | `v091_dayton_talks_milestone_timing_note` | `GAME_OVER AND MILESTONE:dayton_accords` |
| Grabovica and Uzdol | `v091_grabovica_uzdol_rbih_war_crimes_findings` | `GAME_OVER AND FINDING:war_crimes_record_RBiH` |

## Determinism And Canon

The inserts are downstream Ring 2 narrative reflection. They consume already-emitted source-labeled Cost Ledger findings or milestone comparison rows. They do not create findings, change event triggers, alter rupture logic, change scoring, add player levers, or mutate canonical historical essay text.

## Verification

- Red: `npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` failed on missing sections/render paths.
- Green: `npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` passed 27/27 after authoring.

## Follow-Up

Broader dynamic essay authoring remains open, but future additions should keep this same rule: only author against real existing endgame packets and avoid speculative narrative without a deterministic atom/token source.
