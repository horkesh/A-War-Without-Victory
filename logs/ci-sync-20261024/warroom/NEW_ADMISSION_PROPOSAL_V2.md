# Conditional v2 ambient loop-restart admission proposal

## Status and authority boundary

This superseding proposal corrects gaps in the original proposal without overwriting it. It is conditional design work only. The retained native run remains failed, and the current diagnostic patch does not implement any admission or reader change.

The legacy `ambient-browser-abort-lifecycle` classifier remains unchanged. The v1 reader at `tmp/r8-native-shakedown-20261024/prep/read_native_result.cjs` remains immutable. Any implementation would require owner approval, a new classifier name and schema, a new reader file, independent review, and new native evidence.

## Exact runtime qualification

The relevant runtime is Electron 41.0.3 with Chromium 146.0.7680.80. Chromium tag `146.0.7680.80` resolves to `f08938029c887ea624da7a1717059788ed95034d`. That exact implementation calls `Seek(EarliestPossiblePosition())` for looped end-of-playback and schedules actual `seeking` and `seeked` events through its seek path:

- `https://chromium.googlesource.com/chromium/src/+/refs/tags/146.0.7680.80`
- `https://chromium.googlesource.com/chromium/src/+/f08938029c887ea624da7a1717059788ed95034d/third_party/blink/renderer/core/html/media/html_media_element.cc`

This makes a loop restart plausible. It does not show that a particular seek was automatic, prove that a request failure was harmless, or provide request-to-NetLog identity.

## Critical distinctions

`loop === true`, `seeking`, `seeked`, `waiting`, and a `bytes=0-` request are not enough to distinguish an automatic loop from script or user seeking. A future admission must prove that no application seek intent caused the observed cycle.

Ogg playback time cannot be converted to a byte offset by a generic arithmetic mapping. The Range rule must never infer an expected byte from `currentTime`, duration, content length, or a tuned tolerance.

For this fixed full asset only, `Range: bytes=0-` may corroborate a restart when the exact asset bytes and identity are proven. Any other range fails the proposed branch unless a future format-specific, reviewed proof establishes its meaning. No threshold tuning is allowed.

## Required evidence before an admission can exist

All evidence must be retained from one new run and be uniquely connected:

1. Existing request bounds remain exact: `ERR_ABORTED`, `GET`, media, non-main-frame, exact loopback origin, empty query/fragment, exact ambient asset path, finite ordered timestamps, and no relaxation of the existing two-second ceiling.
2. The actual production detached media element has one stable element/source epoch and `loop === true`.
3. The element emits one actual `seeking` and one later actual `seeked` for that identity/epoch, with ordered pre-seek playing and post-seek playable states.
4. The generic Playwright request object is already a unique in-process identity through the existing WeakMaps. The failure record must retain a deterministic diagnostic request ID allocated at request observation, or another reviewed binding that connects request start, Range, and failure without URL/time ambiguity. Persisting that ID is new semantic scope and needs owner approval.
5. The actual request Range is exactly `bytes=0-`.
6. The exact served asset is the fixed 206,420-byte warroom Ogg and is bound to the qualified source/package hash. A URL hash token or matching length alone is insufficient. If request/response bytes cannot be bound, fail.
7. The associated NetLog source is uniquely bound to the same request, includes the exact Range, reads the complete fixed asset, and ends normally. URL/timing proximity alone is insufficient. If CDP/NetLog identity cannot be retained or deterministically joined, fail.
8. The observer records JavaScript seek intent for the same element: the `currentTime` setter and `fastSeek` must be observed through wrappers that preserve native descriptors, receiver behavior, return values, and thrown-error identity. Any explicit seek intent overlapping the cycle rejects automatic-loop admission.
9. The existing `load()` intent and source-epoch evidence close the other explicit resource-reset path. Explicit load, source replacement, `emptied`, DOM `abort`, teardown, or navigation rejects the loop branch.
10. No lifecycle `error`, non-null `MediaError`, truncated lifecycle stream, truncated request stream, or missing mandatory field exists.
11. Exactly one request and one automatic-loop candidate remain after all joins. Every request and signal is consumed once; ambiguity rejects admission.
12. A direct, version-qualified browser provenance signal for automatic looping could replace the negative seek-intent proof only if its semantics and availability are demonstrated for the exact Chromium build. No such signal is currently proven.

If JavaScript seek-intent observation plus exact request/NetLog binding still cannot prove automatic looping, stop. Do not implement the admission.

## Required new reader and raw evidence

An approved implementation must create a new reader file and schema version. The reader must require the complete raw lifecycle stream, complete raw request/failure stream, seek-intent stream, source/load-intent stream, exact asset binding, and uniquely joined NetLog stream. Summary counts or bounded tails cannot qualify the admission.

The new reader must report the legacy browser-abort branch and the proposed loop-restart branch separately. Empty candidate sets must not make an exactness check vacuously sufficient, and no other green gate may waive an unresolved request.

## Mandatory tests and negative controls

Tests must use the actual observer/network producer paths and reject:

- missing, duplicated, reversed, or truncated `seeking`/`seeked`;
- `loop` false, missing, or unreadable;
- any explicit `currentTime` setter or `fastSeek` intent overlapping the cycle;
- wrappers that alter descriptor flags, native receiver checks, return values, or thrown errors;
- explicit `load()`, source change, source-epoch reuse, `emptied`, DOM `abort`, lifecycle error, or non-null `MediaError`;
- missing, duplicated, reused, or ambiguous request identity;
- missing Range, header read failure, or any Range other than exact `bytes=0-`;
- Ogg time-to-byte arithmetic or any end-distance/current-time threshold;
- asset URL/length agreement without exact byte/hash binding;
- missing, ambiguous, incomplete, or abnormal NetLog request completion;
- URL/time-only joins between Playwright and NetLog;
- wrong origin, query, fragment, method, resource type, frame, element, or epoch;
- ordinary manual/script seek on a looped element;
- synthetic lifecycle/request records that bypass the real producer;
- any attempt to classify the retained old run.

Positive tests must demonstrate one uniquely bound automatic-loop cycle using a real production detached-audio fixture and complete raw evidence. The classifier must remain absent until that proof is feasible.

## Current diagnostic patch boundary

The currently approved patch records only actual `seeking`/`seeked` events, the element's `loop` boolean, and compact Range metadata with explicit present/absent/read-error states. It does not wrap `currentTime` or `fastSeek`, allocate persisted request IDs, parse NetLog, classify failures, or change acceptance. Those are possible later scopes only after owner approval.
