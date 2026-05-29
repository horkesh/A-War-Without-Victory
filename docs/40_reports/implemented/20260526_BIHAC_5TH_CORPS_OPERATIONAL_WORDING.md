# Bihac / 5th Corps Operational Wording Packet

**Date:** 2026-05-26
**Plan:** `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md`, Phase 1 safe factual corrections

## Scope

This packet corrects only Bihać / ARBiH 5th Corps operational wording. It does not change mechanics, event triggers, effects, scenario control, OOB, calibration, sensitive ghost entries, or civilian-harm/atrocity prose.

## Claims Corrected

- `bihac_5th_corps_offensive_1994`: replaced cinematic claims that the 5th Corps "achieved the impossible," "crushed" Abdic's forces, and overran the Grabez plateau with bounded wording: October 1994, Atif Dudakovic / ARBiH 5th Corps, Operation Grmec from the Bihac pocket toward VRS positions south/east of Bihac, Grabez/Grmec approaches toward Bosanska Krupa, followed by a later VRS/RSK/APWB counteroffensive.
- `operation_sana_1995`: replaced "single week," "sweeps south and east," "spearheads the largest" wording with a dated place sequence: September-October 1995, 5th Corps advanced from Bihac toward Bosanski Petrovac, Kljuc, Bosanska Krupa, and Sanski Most; Bosanski Petrovac fell on 15 September, Kljuc two days later, and Sanski Most on 10 October.
- Matching standalone Codex essays and `essay_index.json` now use shorter operational prose and include `Balkan Battlegrounds II, pp. 536-538` in sources.

## Sources

- BB2 p.536: APWB order-of-battle context.
- BB2 p.537: ARBiH 5th Corps Bihac order-of-battle context.
- BB2 p.538: endnote/source trail for Bihac fighting and 5th Corps reporting.
- Existing event/essay sources retained: ICTY Karadzic Trial Judgment and prior BB/UNSCR references.

## Verification

- `rg -n "5th Corps sweeps west|sweeps west|westward sweep|achieved the impossible|crushing Abdic|sweeps south and east|methodical and devastating|sheer determination|spearheads the largest|cleanses|ethnic|massacre|detention|camp|civilian|refugee" data\scenarios\events\war_1994.json data\scenarios\events\war_1995.json data\scenarios\essays\bihac_5th_corps_offensive_1994.json data\scenarios\essays\operation_sana_1995.json data\scenarios\essays\essay_index.json tests\ui\codex_essay_localization.test.ts` - PASS for removed operational phrases; remaining hits are existing excluded sensitive-history rows and negative test assertions.
- `node tools/diagnostics/event_notification_residuals.cjs --json` - PASS; 2 residual rows / 4 missing blocks remain, all classified `blocked-sensitive`.
- `npx.cmd vitest run tests/ui/codex_essay_localization.test.ts tests/ui/codex_essay_vocab_integration.test.ts tests/codex_source_quality.test.ts tests/event_timeline_integrity.test.ts --reporter=dot` - PASS; 73/73 tests.
- `git diff --check` - PASS.

## Remaining Excluded Rows

- `visit_to_front_rs` press option residuals remain blocked-sensitive for unsupported disclosure/propaganda framing.
- `visit_to_front_hrhb` press option residuals remain blocked-sensitive for unsupported detention/blockade implications.
- Existing Markale, Tuzla, Srebrenica, Zepa, UN hostage, refugee, and broader sensitive essay/index rows were not edited.
