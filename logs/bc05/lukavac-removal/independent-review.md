# BC05 Lukavac political-event removal — independent review

**Verdict: GO. No blocking findings.**

Reviewed the frozen working diff against base `0690a47eacb133631f32324681c8eb5343afc03a` under the owner decision that Lukavac remains historical/military context and is not a live political event. The patch removes only the `operation_lukavac_93` catalog row from `data/scenarios/events/war_1993.json`, plus the authorized deletion of stale fresh-choice wording in the surviving 1993 NATO notice and the two mirrored essay bodies. No production `src/` file changed. `war_1994.json`, `war_1995.json`, the definitive scenario, maps, calibration floors, baselines, BC04 mechanics, and Dayton content remain unchanged.

The historical record is preserved. The standalone Lukavac essay, its essay-index entry, Balkan Battlegrounds/ICTY provenance, and the legacy `RESPONSE:operation_lukavac_93:{comply,defy_nato}` sections remain. The retained military implementation still represents the historical VRS action as pre-planned `Operation Trnovo`; the triggered-operation test comment now names that representation accurately. The retained NATO notice records the 9 August Council authorization without claiming an Igman disposition or promising a new Lukavac choice.

Old-save behavior is covered without a compatibility shim. The pending-decision regression constructs both serialized response options and resolves `comply` and `defy_nato` through the existing resolver, proving that resolution uses the pending record rather than a live catalog lookup. The real Codex resolver test proves that old fired-event and response receipts still unlock the retained essay and render the correct branch annotation. Generic synthetic fixtures retain pressure-gate, decision-queue, taxonomy, and reporting coverage formerly coupled to the deleted row.

The sensitive-claim inventory correction follows observed scanner semantics rather than lowering a safety threshold. The final expected safe-residual set has six files: the five unaffected residual essays plus the retained standalone Lukavac essay, which still emits a documented `safe_factual_correction` claim with `icty_icj_un` provenance. The rewritten standalone NATO essay no longer emits that risk class after its stale choice language was removed, but its `event_id`, `agreement_text` tier, and editorial source note are asserted separately. The essay-index legacy Lukavac response sections remain visible to the scanner.

Validation evidence:

- Focused Vitest coverage: all 12 announced files and 289 distinct tests are green by evidence union. The initial run passed 10 files and exposed two stale inventory assertions; `logs/bc05/lukavac-removal/final-focused-tests.log`. The targeted correction rerun passed both affected files, 52/52; `logs/bc05/lukavac-removal/correction-tests.log`. Per the owner stopping rule, unchanged passing suites were not rerun solely to produce a single green aggregate log.
- Direct TypeScript `tsc --noEmit`: exit 0; `logs/bc05/lukavac-removal/typecheck.log`.
- Scope verifier: 13/13 checks passed, including exact catalog preservation outside the intended removal/NATO wording cleanup, no `src/` changes, and preservation of 1994/1995/definitive scenario data; `logs/bc05/lukavac-removal/scope.log`.
- `git diff --check`: exit 0, with informational CRLF conversion warnings only in root-owned documentation; `logs/bc05/lukavac-removal/diff-check.log`.
- Pre-change absence proof recorded the expected failing event-presence assertion; `logs/bc05/lukavac-removal/red-event-absence.log`.

Review limitation: no campaign or calibration run was performed, as explicitly excluded. `operation-evidence.json` is used only to distinguish the historical military operation from the removed political event; this review makes no claim about operation tuning or territorial calibration.
