# Continuation 7 comparator proxy readiness correction

## Disposition

READY FOR TARGETED REVIEW. No campaign was run. This correction changes only ignored diagnostic helper artifacts.

The comparator now requires the exact same-run proxy events instead of accepting any selected-actor write at turn 138 or any selected-actor rejection at turn 139.

## Exact proxy gates

- Turn 138 write: `completed_turn === 138`, actor `arbih_737th_muslim_light`, action `column_order`, target `op:bugojno:udurlije`, boundary `pre_write`, selection boundary `post_selection_pre_write`, one of the six column-order-capable helpers, and production callsite `distribute-brigades-to-front` or `final-distribute-brigades-to-front`.
- Turn 139 rejection: actor `arbih_737th_muslim_light`, source `op:busovaca:gornja_rovna`, destination `op:bugojno:udurlije`, and a reason in the production `ColumnMovementRejectionReason` union.

The destination is `op:bugojno:udurlije`; `op:travnik:udurlije` is rejected by the fixture. The rejection check accepts the production reason union and does not assert or import n39's observed `posture_dig_in` reason.

Recognized column helpers are `main_phase_b`, `rear_stack_dispersion`, `threatened_reserve_commit`, `empty_front_subsegment_fill`, `shared_front_stack_deconflict`, and `must_hold_garrison_pin`. `main_phase_a` is excluded because it is the direct-location action family.

## Focused evidence

- RED command: `node logs/prusac-diagnostic-20260929/continuation7_front_writer_campaign_20261004_proxy_fixture.cjs`
- RED exit: `1`
- RED reason: the pre-correction comparator did not export the required exact turn-138 gate; the assertion observed `undefined` instead of a function.
- GREEN command: same focused fixture command.
- GREEN exit: `0`
- GREEN output: `PASS`, 14 write negatives, 9 recognized rejection-reason controls, and 11 rejection negatives.
- Syntax command: `node --check` on the comparator and proxy fixture.
- Syntax exit: `0`

Evidence files:

- `continuation7_front_writer_campaign_20261004_proxy_red.command.txt`, `.log`, `.exit.txt`
- `continuation7_front_writer_campaign_20261004_proxy_green.command.txt`, `.log`, `.exit.txt`
- `continuation7_front_writer_campaign_20261004_proxy_syntax.command.txt`, `.log`, `.exit.txt`

Negative controls cover wrong actor, argument and receipt turns, action kind, destination, source, write boundary, selection boundary, helper, callsite, rejection reason, null/primitive input, and missing required fields. The exported gate functions return false for malformed inputs rather than throwing.

## Hashes

- Pre-review comparator preservation: `8e57420073add4f7cbfaee4b2feb42e84860c9b9215ff2d321617d3117e8b0ee`
- Corrected comparator: `3d7b511a97ac4940bd96ff4724620519e2d8d9a23b8959c88a6e81aab6e34fbc`
- Proxy fixture: `1deb15cb51f83232e842f8b78cbc299cb4d1292cd0fac1fa654093b5bcc205dc`
- RED log: `892e485dfffcd161320cf9b4ac1c07138bf660594cdbc73088071af452c3407c`
- GREEN log: `8b9927f06a410b31be9fb258f35f1b78da4193def1f8a942e18081823c4e2e9c`
- Syntax log: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty stdout from successful `node --check`)

## Preservation and limits

`continuation7_front_writer_campaign_20261004_compare_extract_prereview.cjs` is a byte-for-byte preservation of the comparator immediately before this correction. The earlier original comparator, before the previous normalizer refactor, was overwritten and has no byte-for-byte backup. The earlier original `continuation7_front_writer_campaign_20261004_helper_summary.md` was also overwritten and has no byte-for-byte backup. This packet does not present reconstructed content as raw recovery.

These gates validate the agreed run-bound proxy receipts if a future authorized campaign produces them. They do not establish a historical cause, prove an internal comparator branch, or import the n39 rejection reason. Campaign execution, root preflight, full control audit, and acceptance remain outside this packet.
