# Native advance prerequisite 01: audio separation review

Date: 2026-10-24

Verdict: **GO for one bounded turn-39 observational calibration measurement, with a separate retained audio FAIL.** This is not a pass of the short native prerequisite, R8, runtime health, exact daily parity, or the 188-turn/all-faction acceptance.

## Evidence-backed separation

The run exited child/wrapper `1/1` solely because strict diagnostics retained one unmatched renderer network failure: `GET /assets/ambient_warroom-CO4FPnyV.ogg`, resource type `media`, range `bytes=0-`, `net::ERR_ABORTED`, event 32, before teardown. Console errors, page errors, main-process errors, and counted main-process stderr were all zero. The separately observed hillshade abort was matched to its exact tile signal and is not part of this decision.

The media failure did not prevent or alter the observed engine/input/canonical route:

- The visible Historical radio was selected and checked. Provenance records the 188-week scenario, `harness-seed`, RBiH, `decisionMode=historical`, autonomy 2, and `headless=false`.
- The authored `rbih_state_identity/civic@0` choice was made through the visible player path and recorded as a player receipt.
- The exact production Advance state machine recorded `advance-direct-transition`, from turn 0 to turn 1. The main-process stream contains one turn-1 final seal with `unresolved=0`.
- Provisional and settled turn-1 archives both exist and are byte-identical: SHA-256 `0b67f4bfb319a524251bc4941e17414fa122bb8f8a9058a9860d9d1f4228e64f`, 3,476,848 bytes. Settled readiness records turn 1, zero blockers, no owned modal, and the same stable autosave identity.
- Save -> Records -> Resume completed after the media abort. Before/after canonical autosave hashes are exactly `0b67f4bf...`; expected and actual loaded projections are exactly `e8e2c770...`; `canonicalBytesEqual=true` and loaded projection `exactBytes=true`.
- Media lifecycle signals around the abort show the same war-room source progressing from seek/wait to `seeked`, `canplay`, and `playing`, with ready state 4, no media error, and playback unpaused. Later the field ambience also reached `playing`. This supports isolation as a media playback lifecycle failure rather than evidence of engine, IPC, canonical-state, or input-path corruption.

The short run therefore provides positive evidence that the repaired real-game Advance/archive/save-load route works. It does **not** erase the known turn-1 two-OSID control divergence from n94; exact daily parity remains failed.

## Turn-39 measurement contract

One turn-39 run may answer the new question: whether an untouched normal Historical player campaign reaches the accepted January checkpoint map and score despite the already-declared daily divergence. Evaluate calibration evidence independently of process exit only when the sole runtime failure is the exact retained ambient identity above and every gameplay/input/canonical/archive/seal/checkpoint gate succeeds.

Fail the measurement immediately for any new or changed URL, method, resource type, range, error text, console/page/main-process error, unmatched network failure, missing or noncontiguous seal, missing provisional or settled archive, blocker/modal at settlement, skipped/multiple turn transition, canonical byte mismatch, loaded-projection mismatch, input/provenance mismatch, or unexplained controller difference. Preserve the raw audio failure and lifecycle signals; do not add a blanket allowlist or reclassify the abort as passing.

For turn 39, require the exact accepted checkpoint controller map and score 707, zero formerly-correct losses versus n91/n92, January protected/anchor gates, complete turn archives and stream seals, final Save -> Records -> Resume, and all existing provenance/input checks. A sole matching audio abort leaves strict native/R8 status **FAILED** even if the calibration observation passes. The run cannot authorize turn 188 or the other factions; those remain separate future decisions.

## Evidence

- `tmp/r8-native-calibration-parity-20261024/native-advance-prereq-01/receipt.json`
- `tmp/r8-native-calibration-parity-20261024/native-advance-prereq-01/stderr.log`
- `tmp-paradox-qa-20260710/paradox-local-qa-progress-native-calibration-rbih-advance-prereq-20261024-01.json`
- `tmp-paradox-qa-20260710/evidence/native-calibration-rbih-advance-prereq-20261024-01/rbih/turn-autosaves-pre-settlement/turn-001.json`
- `tmp-paradox-qa-20260710/evidence/native-calibration-rbih-advance-prereq-20261024-01/rbih/turn-autosaves/turn-001.json`

