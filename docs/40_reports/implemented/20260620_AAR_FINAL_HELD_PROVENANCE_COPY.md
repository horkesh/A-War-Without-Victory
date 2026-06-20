# AAR Final-Held Provenance Copy

Date: 2026-06-20

## Summary

Closed the downstream AAR provenance wording lane from the Pyrrhic polish sweep. Player-facing UI now distinguishes logged captures from objectives merely held at operation close:

- Army HQ completed-operation compact AAR says `OBJ HELD AT CLOSE`, not `OBJ TAKEN`.
- Forced-operation Turn Aftermath receipts use `objectives held at resolution` and the read-model field is `objectivesHeldAtClose`.
- Settlement timelines say `objective captured` only when `objectives_logged_captured` contains the OSID; otherwise final-held objectives say `objective held at operation close`.
- Chronicle operation and officer spotlight entries say `objectives held at close`.
- Opportunity Ledger AAR counts say `{held}/{targeted} held at close`.
- Officer combat record labels say `Held objectives`, while preserving the existing count field for compatibility.
- BCS mirrors no longer use the high-risk `UZETO` / `zauzela` / `zauzetih` wording on these AAR final-held surfaces; native LQA can refine the exact phrasing later.

Srebrenica/Zepa remain event-owned receipts. Krivaja/Stupcanica remain chronology/AAR context only and were not tuned or reframed as fall-delivery mechanics.

## Files

- `src/ui/map/components/TurnAftermathModal.tsx`
- `src/ui/map/components/chronicle/generateChronicleEntries.ts`
- `src/ui/map/data/forcedOpReceipts.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `src/ui/map/utils/buildSettlementTimeline.ts`
- `tests/ui/forced_op_receipts.test.ts`
- `tests/ui/turn_aftermath_modal_i18n.test.ts`
- `tests/settlement_timeline_provenance.test.ts`
- `tests/chronicle_entries.test.ts`
- `tests/ui/gui_audit_label_discipline.test.ts`
- `tests/ui/operation_aar_records_review.test.ts`
- `tests/ui/officer_dossier.test.ts`

## Verification

- Focused red proof first failed 6 surfaces on stale captured/taken copy.
- `npm.cmd exec -- vitest run tests/ui/forced_op_receipts.test.ts tests/ui/turn_aftermath_modal_i18n.test.ts tests/settlement_timeline_provenance.test.ts tests/chronicle_entries.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/officer_dossier.test.ts --pool=forks --reporter=dot` passed 73/73.
- `npm.cmd run typecheck` passed.
- `npm.cmd exec -- vitest run tests/ui/forced_op_receipts.test.ts tests/ui/turn_aftermath_modal_i18n.test.ts tests/settlement_timeline_provenance.test.ts tests/chronicle_entries.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/officer_dossier.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 85/85.
- `npm.cmd run qa:live-surface:browser` passed with port 3239 cleanup.

## Determinism And Scope

UI/read-model copy, i18n templates, focused tests, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
