# Stage-1 native calibration diagnostic code review

Date: 2026-10-24  
Verdict: **GO for one RBiH turn-1 diagnostic only**

## Verified before launch

- The primary React opening route selects the existing `Historical` radio, reads `aria-checked=true`, emits `command-mode-historical-selected`, and only then clicks Begin.
- The success and failure progress records retain `campaignModeSelectionEvidence`; the post-selection step is captured by the existing screenshot callback.
- Initial provenance now identifies the 188-week scenario and records requested faction, decision mode, autonomy, headless state, seed, scenario hash, and startup hash from the archived canonical initial autosave.
- The read-only comparator loads and hash-checks the archived native t0 autosave, compares its exact controller map/hash against n94 t0, then compares the canonical t1 controller map and ordered event prefix against the self-checked n94 reconstruction.
- The n94 replay self-check reports zero failures across 268 events and 25 retained checkpoints.
- The bounded 32-input classification is accepted with the sole documented GeoJSON CRLF/LF representation caveat recorded in `PLAN_REVIEW.md`; no raw-32-exact claim is permitted.
- Independent rerun: `pnpm exec vitest run tests/paradox_local_qa_harness.test.ts tests/native_calibration_outcome_compare.test.ts` returned exit 0, 2 files and 87/87 tests passed in 1.60 seconds.
- Implementer nonincremental TypeScript receipt reports exit 0.

## Required turn-1 runtime verdict

The one-turn lane passes its diagnostic question only if retained evidence proves the reviewed package/hash, visible post-click Historical state, exact initial metadata (`RBiH`, historical, autonomy 2, headless false, harness seed), exact t0 controller map, normal visible UI/IPC Advance, canonical t1 archive, exact t1 controller map and ordered event prefix, and save/load consistency. New or expanded runtime/network/media errors, engine errors, canonical-state/capture failures, input-policy failure, or any controller difference stop the sequence.

The known two non-main-frame media aborts remain a separate strict native/R8 failure and cannot be relabelled as passed or waived.

## Explicitly unreached

Turn 1 does not establish checkpoint scores, n91/n92 formerly-correct preservation, the complete protected anchor/enclave/Farz set, full-campaign health, or 188-turn parity. These remain **UNREACHED** and must be completed before any turn-188 acceptance claim.

At the short stage, the comparator currently renders empty future collections as passing gates (for example, no protected checks before turn 39). Those fields are vacuous and must not be cited as evidence. Only the t0/t1, input, policy, reference, capture, and save-consistency results named above are qualified for this stage. The full comparator still requires correction/qualification before the 188-turn lane.
