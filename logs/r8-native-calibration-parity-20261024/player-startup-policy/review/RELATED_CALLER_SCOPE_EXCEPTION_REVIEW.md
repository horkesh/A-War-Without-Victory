# Related-caller seventh-test scope exception review

**Verdict: GO — narrowly bounded test-only exception.**

The preserved caller audit failed only the static source-text assertion at `tests/ui/event_decision_auto_launch_contract.test.ts:162`. The test expects `resolveBrowserEventDecision(nextState, eventId, responseId)`, while the approved runtime call at `src/ui/map/App.tsx:1976` is `resolveBrowserEventDecision(nextState, eventId, responseId, eventCatalogFull)`. The same test continues to pin the raw warning, generic player error, dismissal wiring, and the absence of raw error text at lines 163–170. Updating only the expected call literal to include `eventCatalogFull` aligns the contract with the approved catalog-aware caller and does not weaken an assertion.

## Exact exception

- Permit one additional test path outside the prior six-test allowlist: `tests/ui/event_decision_auto_launch_contract.test.ts`.
- Permit exactly one edit: change the line-162 expected literal from `resolveBrowserEventDecision(nextState, eventId, responseId)` to `resolveBrowserEventDecision(nextState, eventId, responseId, eventCatalogFull)`.
- No production edit, assertion removal, matcher broadening, fixture change, or other change in this file is covered.
- After the edit, run the changed test and the remaining three startup caller tests specified by the integrator through preserved cheap checks. Bind the changed-test hash and resulting receipts in a targeted final-review addendum. Reuse the unchanged 94/94 focused and TypeScript 0/0 evidence; this string-literal-only test edit is type-neutral.

## Systems and canon assessment

The exception changes no simulation state, save/schema boundary, catalog content, event outcome, UI behavior, ordering, or deterministic input. It therefore does not alter the Engine Invariants, Code Canon, or the six existing historical/UI review-seat conditions. No additional game-design, UI, historical, or canon panel is required for this exact test-only correction. The production and original six-test scope remains frozen.

## Bound evidence

- Pre-edit test SHA-256: `834b13dd48be89769a0bef2df02e7726cc3dc521706843fccdb9ddec9e94dda1`.
- Approved `src/ui/map/App.tsx` SHA-256: `8cfae1653dcd81fde35f25af60624aef6da479c5188ca06b50d51a56c0dea672`.
- Preserved receipt: `related-callers-01/receipt.json`, child/wrapper `1/1`, artifact contract pass.
- Receipt stdout SHA-256: `b17e6c22be2e635fff64b3a1f8e8ec489da28d941f853d23363a0b148005acbc`.
- Receipt stderr SHA-256: `d7c544577676e24e10bad6ebe032a29a61e5fa44184d4cfd8027c4fbf7028904`.
- Result: 7 files, 6 passed / 1 failed; 61 tests, 60 passed / 1 failed. The sole failure identifies line 162 and shows the four-argument runtime call.

This GO covers the edit and cheap targeted verification only. It does not certify a campaign, full suite, package, build, or native run.
