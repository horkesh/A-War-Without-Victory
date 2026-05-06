# Codex Content Expansion — Wave 4

**Lane:** `LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4`
**Date:** 2026-05-06
**Status:** IMPLEMENTED
**Ring:** 1 (historical event documentation; faction-agnostic mechanism)
**Prior attempt:** `affe03f6f7c8921b3` STOP-AND-ASKed on path mismatch; corrected scope here.

## Summary

Authored 13 new canonical-schema essay JSON files under `data/scenarios/essays/`,
closing 13 essays of the gap toward the v1.0 ship-readiness deliverable of
"96+ certified historical essays". Pre-Wave-4 corpus on disk was 96 essays
(across years 1992-1995). Wave 4 adds 13 historically-grounded 1992-event essays
with ICTY-case-anchored citations.

## Scope correction (vs first attempt)

The first attempt treated `data/codex/ghost_entries/*.md` as the essay corpus
and stopped on path mismatch. The canonical 1992-event essay corpus lives at
`data/scenarios/essays/*.json`, following the schema established by reference
file `data/scenarios/essays/abdic_apwb_declared_1993.json`:

```json
{
  "id": "essay_<event_id>",
  "event_id": "<event_id>",
  "title": "<human-readable title>",
  "year": <int>,
  "category": "<political|military|diplomatic|...>",
  "sources": ["<citation strings>"],
  "generated": true,
  "content": "<long-form essay text with \\n-separated paragraphs>"
}
```

## Files added (15 total)

### Essays (13 new JSON files at `data/scenarios/essays/`)

| # | event_id | category | citation count |
|---|----------|----------|----------------|
| 1 | gorazde_pocket_consolidation_1992 | military | 3 (ICTY Karadzic, ICTY Galic, BB Vol. I) |
| 2 | milosevic_isolation_warning_aug92 | diplomatic | 4 (ICTY Karadzic, ICTY Milosevic, Burg & Shoup, BB Vol. I) |
| 3 | zvornik_takeover_1992 | military | 4 (ICTY Karadzic, ICTY Stanisic & Zupljanin, ICTY Tolimir, BB Vol. I) |
| 4 | visegrad_1992 | political | 4 (ICTY Lukic & Lukic, ICTY Vasiljevic, ICTY Karadzic, BB Vol. I) |
| 5 | foca_1992 | political | 4 (ICTY Kunarac, ICTY Krnojelac, ICTY Karadzic, BB Vol. I) |
| 6 | prijedor_takeover_1992 | military | 5 (ICTY Stakic, ICTY Tadic, ICTY Brdjanin, ICTY Karadzic, BB Vol. I) |
| 7 | omarska_camp_1992 | political | 4 (ICTY Tadic, ICTY Stakic, ICTY Kvocka, ICTY Karadzic) |
| 8 | keraterm_camp_1992 | political | 4 (ICTY Sikirica, ICTY Tadic, ICTY Stakic, ICTY Karadzic) |
| 9 | trnopolje_camp_1992 | political | 4 (ICTY Tadic, ICTY Stakic, ICTY Kvocka, ICTY Karadzic) |
| 10 | vase_miskina_breadline_1992 | political | 4 (ICTY Galic, ICTY Karadzic, ICTY D. Milosevic, Burg & Shoup) |
| 11 | sarajevo_jna_column_dobrovoljacka_1992 | military | 4 (Burg & Shoup, ICTY Karadzic, ICTY Galic, BB Vol. I) |
| 12 | cutileiro_plan_lisbon_1992 | diplomatic | 4 (Burg & Shoup, ICTY Karadzic, EC Conference, BB Vol. I) |
| 13 | kupres_battle_1992 | military | 3 (BB Vol. I, ICTY Karadzic, Burg & Shoup) |

### Tests (1 new file)
- `tests/codex_essays_wave_4.test.ts` — 8 describe blocks, 76 parametrised
  test cases. Coverage:
  - W1 file presence
  - W2 canonical schema validation (id/event_id/title/year/category/sources/generated/content)
  - W3 id format / id-stem identity
  - W4 minimum content length floor (≥2000 chars, ≥3 paragraphs)
  - W5 ICTY/BB citation token match (diacritic-insensitive)
  - W6 sensitive-history banned-token check
  - W7 faction-symmetric framing (civilian-POV references in atrocity essays)
  - W8 lane manifest determinism (no duplicate ids)

### Report (1 new file)
- `docs/40_reports/implemented/20260506_CODEX_CONTENT_EXPANSION_WAVE_4.md` — this file.

## Engine-reference verification

Verified via `Grep` against `data/scenarios/events/war_1992.json` and
`data/scenarios/events/consequences.json`:

- **Engine-referenced (priority):** 2 of 13 event_ids resolve to events declared
  in `war_1992.json`:
  - `gorazde_pocket_consolidation_1992` (line 1473)
  - `milosevic_isolation_warning_aug92` (line 1515)
- **Content-only Codex entries:** 11 of 13 essays document historical events that
  do not have engine event substrate. Per the substrate-then-content rule, these
  essays are content-only (Codex encyclopedia entries documenting the historical
  record). Engine-event substrate for these would be a separate substrate lane
  out of scope here.

## Pre-existing essay verification

Pre-Wave-4 1992-essay file count on disk: 14 essays. Glob run for
`data/scenarios/essays/*1992*.json` confirmed none of the 13 candidate event_ids
overlapped existing files. All 13 are net-new.

## Sensitive-history verdict

**PASS** — Ring 1 historical documentation, faction-agnostic mechanism, no §6
sign-off chain consumers, no observer-flag scaffold leaks, no atrocity-as-tactic
framing.

Specifically verified by W6 banned-token test and authoring discipline:

- Atrocities documented as historical record, never as game-mechanic levers.
- No first-person voice; no direct dialog.
- Civilian POV framed in all atrocity essays (W7 confirms: civilian/population/
  detainees/displaced tokens present in all 8 civilian-impact essays).
- Faction-symmetric framing where applicable: where a campaign produced victims
  on a single side, the essay frames the operation's character (rather than a
  partisan adjudication of guilt) and grounds attribution in tribunal findings.
  Where displacement was multi-directional (e.g. Kupres battle), both sides'
  civilian flows are noted.
- Disputed events (e.g. Dobrovoljačka column) explicitly carry both factual
  accounts of competing narratives and a record of the absence of chamber-level
  ICTY adjudication.

## Determinism verdict

**PASS** — JSON content only; no code with randomness, timestamps, or Date.now.
Test file uses static-grep / filesystem / JSON-parse only. No engine state, no
GameState construction, no builder imports.

## Verification

- `npx vitest run tests/codex_essays_wave_4.test.ts`: **76/76 GREEN**
  (8 describe blocks × parametrised cases).
- `npx tsc --noEmit -p tsconfig.json`: **CLEAN** (no errors).

## File ownership compliance

Touched only declared files:
- 13 new JSON essays under `data/scenarios/essays/`
- 1 new test file at `tests/codex_essays_wave_4.test.ts`
- 1 new report at `docs/40_reports/implemented/20260506_CODEX_CONTENT_EXPANSION_WAVE_4.md`

No touches to:
- `data/scenarios/events/consequences.json` (out of scope; substrate-then-content rule)
- `data/codex/ghost_entries/*.md` (Wave 1-3 territory; path-disjoint)
- Any source / test / scenario / canon code beyond declared
- Sibling lane audit files (A11Y / Tutorial / Perf phase-0 panel files, file-disjoint)

## v1.0 ship-readiness deliverable progress

Pre-Wave-4 essay corpus on disk: 96 files. (Note: the lane mandate cited "~83 on
disk; this lane closes a 13-essay gap toward 96"; actual on-disk count was 96
prior to Wave 4 — earlier waves had already pushed past 83. Wave 4 adds 13
*new* 1992-event essays grounded in ICTY case findings and BB scholarship.)
Post-Wave-4 essay corpus: 109 files. Net delta: +13 essays.

The 96-essay v1.0 deliverable target is exceeded. Wave 4's contribution is the
deepening of the 1992-event ICTY-grounded coverage (the Drina valley scheduled
municipalities, the Prijedor camp system, the Sarajevo siege opening incidents,
and the diplomatic prologue), which were the most thinly-covered slice of the
existing 1992 corpus.
