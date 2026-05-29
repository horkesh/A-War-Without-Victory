# Codex Historical Accuracy Sweep - 2026-05-23

## Scope

- Audited all 96 indexed Codex essays in `data/scenarios/essays/essay_index.json`.
- Compared every indexed essay's `title`, `category`, `sources`, and `content` against its standalone source essay file in `data/scenarios/essays/`.
- Searched the Codex corpus for stale or embarrassing history phrases around direction of advance, perpetrator framing, operation attribution, NATO dates, and duplicated/generated wording.
- Checked the user-reported Operation Sana issue against the local Balkan Battlegrounds knowledge base.

## Corrections

- Operation Sana:
  - Replaced the false "5th Corps sweeps west" framing with a south-and-east breakout from the Bihac pocket.
  - Corrected the BCS title from a westward sweep to `5. korpus probija se prema jugu i istoku`.
  - Added Balkan Battlegrounds I page references.
  - Corrected the capture sequence using BB1 pp. 417, 419-420, 426-428: Petrovac on 15 September, Kljuc two days later, Krupa as the offensive widened, renewed 9 October assault, Sanski Most on 10 October.
- Trusina:
  - Replaced the generic "Crimes on All Sides" title with the more specific standalone title: `The Trusina Killings: ARBiH Crimes in the Konjic Valley`.
  - Replaced the BCS title with `Trusina: zlocini ARBiH u konjickoj dolini`.
- Indexed essay drift:
  - Synchronized stale indexed core fields from their standalone source essays while preserving index-only dynamic sections and localizations.
  - This pulled in existing standalone corrections for Sharp Guard predecessor operations, Federation/Sana attribution, Operation Cincar sequencing, Grabovica/Uzdol command wording, Operation Storm civilian/property wording, Mistral 2 defender detail, Srebrenica shelling duplicated wording, Resolution 820 chronology, Charles Redman timing, NATO Deliberate Force end-date nuance, and Stupni Do casualty wording.

## Regression Coverage

- `tests/ui/codex_essay_localization.test.ts` now fails if any indexed Codex essay drifts from its standalone source essay across title, category, sources, or content.
- Added targeted guards for:
  - Operation Sana direction and capture chronology.
  - The stale Sana phrases `sweeps west`, `westward sweep`, `cisti zapad`, the wrong mid-October Kljuc wording, and the wrong 11 October Sanski Most wording.
  - Trusina perpetrator/place specificity and absence of generic both-sides title language.

## Residual Risk

- This was a text/source consistency and red-flag phrase sweep, not a full scholarly rewrite of every essay.
- BCS Codex essay bodies remain concise localized summaries rather than full translations of the English essays.
- No simulation behavior, scenario data, save schema, calibration value, OOB, or generated run output changed.

## Verification

- Source/index drift script: all indexed core fields match standalone essays; total drift 0.
- Stale-phrase scan: only regression-test negative assertions remain.
- Focused Vitest/typecheck/diff checks are recorded in the project ledger entry for this change.
