# Warroom CDP collection v3 contract

## Status, purpose, and authority

**DRAFT FOR INDEPENDENT REVIEW — NON-ADMITTING COLLECTION ONLY.** This contract authorizes no native/browser run, package build, campaign, calibration change, product change, classifier, reader, allowlist, or acceptance change. Production and harness code remain unchanged until an independent reviewer returns GO on this contract and the root orchestrator authorizes the smallest implementation.

The retained native attempts and the old twelve ambient aborts remain failed evidence. The frozen v1 reader and the v2 admission proposal remain immutable. A successful v3 collection must not reclassify, consume, remove, downgrade, or waive any Playwright `requestfailed` record. Every unresolved Playwright failure remains fatal under the existing runtime verdict.

The collection question is narrower: can one public Playwright-created CDP session passively record a failed ambient-media request under its **own CDP request identity** and, after that failure, obtain body bytes through a direct `Network.getResponseBody` call for that same CDP `requestId`? The result may be captured, unavailable, errored, pending at the flush deadline, or over the retained-byte cap. Every outcome is evidence; none is an admission.

This revised collection contract intentionally changes the proposed diagnostic producer's identity domain from a not-yet-proven Playwright-to-NetLog join to one internally consistent CDP session. It does not assert or synthesize any mapping:

- no Playwright request object or diagnostic ID is joined to a CDP `requestId`;
- no CDP `requestId` is joined to a `NetLogSource.id`;
- Playwright, CDP, lifecycle, and NetLog remain independent raw streams;
- URL, time, Range, order, byte count, or hash similarity does not create cross-stream identity.

Any future native proof or admission rule is a separate owner gate after implementation, focused checks, and independent review. This contract does not make that later run ripe for execution.

## Installed public API and source qualification

The exact installed dependency is Playwright Core 1.60.0. `node_modules/playwright-core/lib/coreBundle.js` is 3,206,963 bytes with SHA-256 `f74353fcb8e406756a70a6af0dfc4a5069acd577e35ec9d923ccf36ac009c2f5`.

The supported API surface is sufficient for this collector:

- `types/types.d.ts:9286` exposes `BrowserContext.newCDPSession(page: Page|Frame)`;
- `types/types.d.ts:16148-16335` exposes `CDPSession.on`, `send`, and `detach`;
- protocol typings expose `Network.enable` and `Network.getResponseBody`;
- the installed Chromium network implementation at `coreBundle.js:35034-35053` confirms why public `Response.body()` is forbidden: after `Network.getResponseBody`, it can fall back to `Network.loadNetworkResource` and `IO.read` when an empty body conflicts with a nonzero expected length.

The collector therefore uses `await page.context().newCDPSession(page)`, subscribes on that returned session, sends `Network.enable` without cache/buffer override parameters, and may send `Network.getResponseBody` only after an exact candidate's `Network.loadingFailed`. It never calls Playwright `Request.response()`, `Response.body()`, `Network.loadNetworkResource`, `IO.read`, Fetch-domain methods, interception, reload, navigation, or a second fetch. It does not access Playwright private fields.

`Network.enable` installs an observer and may impose diagnostic buffering overhead. It does not rewrite a request, response, cache policy, media element, playback state, or URL. That is the full passivity claim; this draft does not claim zero timing overhead.

## Collection window and candidate boundary

The collector is opt-in through a new exact CLI flag, proposed as `--cdp-network-collection-v3`. Flag absence must preserve the current harness path and output shape. One collector is created for the selected game `Page` after `waitForGamePage(app)` returns and before campaign/resume interaction proceeds. Setup failure is retained and is fatal when the flag is enabled.

The collector records ordered compact rows for these events from that one session:

1. `Network.requestWillBeSent`;
2. `Network.responseReceived`;
3. `Network.loadingFailed`;
4. `Network.loadingFinished`.

The raw stream is "raw" in the evidentiary sense that each received event produces one ordered, immutable compact row before interpretation. It is intentionally not a dump of every protocol property or every header. Secrets, cookies, authorization headers, post data, initiator stacks, and response bodies are never retained.

A body read is attempted only when the current request generation for the failed CDP `requestId` satisfies all supported exact filters:

- method is `GET`;
- CDP resource type is `Media`;
- protocol is exactly `http:`, hostname is exactly `127.0.0.1`, and the URL has an explicit valid port (the bounded observed port is retained; it is not fixed in advance);
- pathname matches `/assets/ambient_(warroom|field|archive)-[A-Za-z0-9_-]+.ogg` exactly;
- query and fragment are empty;
- request `Range` is present and exactly `bytes=0-`;
- `loadingFailed.errorText` is exactly `net::ERR_ABORTED`;
- the request ID's observed chain has never contained a redirect response and this generation has exactly one recorded request row;
- exactly one `responseReceived` row exists for that request generation before failure.

Failure to meet any filter still leaves the raw rows in the artifact and creates no body call. The collector records a compact reason list. It does not call a noncandidate "expected", "allowed", "benign", or "admitted".

CDP may reuse a `requestId` across a redirect chain. The collector assigns an increasing local `generation` for ordered description only. Once any `requestWillBeSent` for an ID contains `redirectResponse`, that whole observed request-ID chain is permanently tainted and no generation in it may trigger a body call. A later terminal event carries no browser generation field; the collector binds it to current local state without claiming that it detected a stale-generation event. Missing request state, duplicate response, terminal-before-request, terminal-after-terminal, reused-ID ordering, or a terminal after a tainted redirect chain is retained as an inconsistency and blocks collection qualification.

The smallest collector does not claim origin or frame ownership beyond the exact loopback hostname/observed port in the request URL and the received CDP `frameId`. It does not bind to a selected Playwright frame and does not call the Page domain to prove that the media request belongs to a non-main frame. Those remain proof gaps for any future admission contract, even if body capture succeeds.

## Proposed artifact schema

One fresh, exclusive sidecar is written below the faction evidence directory, proposed as `cdp-network-collection-v3.json`. It is referenced from the ordinary faction result but is not merged into, or used to filter, `networkFailures`.

Top-level schema:

```json
{
  "schema": "awwv.r8-warroom.cdp-network-collection.v3",
  "status": "complete|setup-error|runtime-error|flush-timeout|over-cap",
  "non_admitting": true,
  "session": {
    "observer_session_id": "sidecar-scoped immutable collector identity",
    "producer": "playwright-public-context-newCDPSession",
    "domain": "CDP Network",
    "network_enable_parameters": {},
    "body_method": "Network.getResponseBody",
    "cross_stream_mapping": "none"
  },
  "caps": {},
  "setup": {},
  "events": [],
  "body_attempts": [],
  "inconsistencies": [],
  "summary": {},
  "flush": {}
}
```

The collector derives `observer_session_id` from the sidecar's caller-supplied bounded artifact identity, using a fixed SHA-256 domain prefix. It identifies only this collector instance. It is not a Chromium internal ID and cannot join another stream. Two collectors therefore remain disjoint even if their public CDP sessions emit the same `requestId`.

Every `events` row has `observer_session_id`, `sequence`, `kind`, `request_id`, `generation`, and the event's finite CDP monotonic `timestamp` where that event supplies one. `request_id` is the exact bounded string received from the public CDP event: it is never synthesized, normalized, or joined to a Playwright or NetLog identity. An over-cap request ID yields only an overflow receipt, never a shortened or replacement `request_id`. No host wall-clock timestamp is needed. Every dynamic string is copied through one bounded projection before retention or use as a long-lived map key. Over-cap IDs stop observation; other over-cap fields are explicit cap violations and cannot qualify a candidate. Kind-specific compact fields are:

- `request`: privacy-safe URL projection, method, resource type, frame ID, loader ID, redirect-present boolean, chain-tainted boolean, and `actual_range` as `{status:"present",value:"bytes=0-"}`, `{status:"absent",value:null}`, or `{status:"invalid",value:null,error_code:"ambiguous-case-duplicate|non-string|over-cap"}`;
- `response`: privacy-safe URL projection, status, MIME type, protocol, cache/service-worker booleans, and only `content-range`, `content-length`, and `accept-ranges`, each with explicit present/absent/invalid state;
- `failure`: error text, canceled boolean, blocked reason if present, candidate boolean, and ordered disqualification reasons;
- `finish`: encoded data length.

Each `body_attempts` row is keyed by `observer_session_id`, that session's exact `request_id`, and local `generation`. It includes `trigger_sequence`, an immutable `settled_sequence` allocated when the asynchronous attempt settles or is frozen pending, `state`, and `provenance:"direct-Network.getResponseBody"`. Array position is not treated as completion order. States are:

- `captured`: decoded byte count and lowercase SHA-256 only; body bytes and text are discarded;
- `unavailable`: protocol returned no usable body field;
- `error`: direct command rejected or decoding failed, with bounded error text;
- `truncated`: decoded body exceeded the retention cap; record lower-bound byte count when known, omit hash, discard bytes;
- `pending`: direct call did not settle before the flush deadline.

The collector must distinguish `base64Encoded:true` from false and decode accordingly. Malformed base64, non-string body, non-finite lengths, or decode exceptions are `error`, never empty success. A zero-byte body is `captured` with byte count zero and its real SHA-256; it cannot satisfy a future fixed-asset proof.

Every request and response URL is parsed transiently for filtering, then discarded. The retained URL projection contains bounded `protocol`, `hostname`, `port`, bounded pathname components, plus booleans `had_userinfo`, `had_query`, and `had_fragment`; it never retains username, password, query text, fragment text, or a full URL. Invalid parsing and component overflow are explicit states and disqualify the lineage. Request-header extraction scans keys case-insensitively, retains no unrelated header, and treats more than one case-insensitive `Range` key as ambiguous/invalid even if the values agree. Protocol, MIME, header, error, and inconsistency data use bounded values or fixed enumerated codes.

`summary` contains counts only: rows by kind, target-like failures, body attempts by state, inconsistencies, cap violations, and pending operations at flush. It has no acceptance boolean. `status:"complete"` means only that setup, event handling, direct attempts, and serialization settled within this collection contract; it says nothing about whether a browser failure is harmless.

## Finite budgets and fail-closed behavior

Proposed hard caps are deliberately small for one diagnostic session:

- 4,096 total compact event rows;
- 128 tracked live CDP request IDs;
- 4,096 permanent request-ID chain histories, sharing the existing event-row budget because every new history requires a retained request row; completed IDs do not consume the 128 live-ID allowance;
- 16 target-like ambient generations;
- 16 body attempts;
- 1 MiB decoded body per attempt before retained hash/count qualification;
- 400 characters per retained error;
- 256 characters per CDP/frame/loader ID and protocol/MIME/header value;
- 256 characters per URL pathname component, 64 pathname components, and 2,048 characters across the retained privacy-safe URL projection;
- 400 characters for any other dynamic string; inconsistency/disqualification reasons use fixed codes where possible;
- 5,000 ms total flush deadline after collection close begins.

At the first event-row, live-ID, target-generation, body-attempt, dynamic-field, or long-lived-key overflow, the collector atomically allocates one bounded overflow receipt containing `observer_session_id`, the next sequence, fixed cap code, configured limit, and observed scalar length/count when available. It then marks `status:"over-cap"`, removes all Network listeners, records `observation_stopped_at_sequence`, starts no new body attempt, and continues only enough bookkeeping to close already pending attempts. The artifact expressly makes no completeness claim for browser events after that stop point. It must not evict old rows, retain a tail, overwrite a prior generation, retain an uncapped URL/ID/header/error/inconsistency in an array or map, or silently present the bounded prefix as exact. No truncated value may be used for filtering, identity, or joining. An artifact with a cap violation is incomplete.

The body-byte cap is a retention/qualification bound, not a promise that Chromium will send at most that amount over the protocol. `Network.getResponseBody` has no streaming or maximum-size argument. The exact ambient asset is expected to be 206,420 bytes, but the implementation must treat that as future evaluation data rather than a collector constant.

## Flush, serialization, and teardown lifecycle

Collector construction returns a handle immediately and begins public-session setup behind one tracked setup promise. Setup ownership is staged: once `newCDPSession` resolves, the collector owns that session; it records each installed listener before proceeding; and any subsequent listener-install or `Network.enable` failure removes installed listeners and detaches the owned session exactly once. It retains a bounded primary setup error plus a separately bounded cleanup error when both occur. Its bounded `awaitReady()` must settle before campaign/resume interaction proceeds; timeout or setup rejection is retained and fatal. `closeAndFlush()` remains idempotent after partial setup or partial cleanup. The handle exposes one idempotent asynchronous `closeAndFlush()` operation:

1. mark the collection closed so no new body attempt can start;
2. remove CDP event listeners;
3. await any still-pending session setup and all already-started body attempts under one shared five-second close deadline;
4. convert every still-unsettled attempt to an immutable `pending` row;
5. remove any still-installed listeners and detach the owned CDP session exactly once within the remaining time on that same deadline, recording bounded `detach-timeout` or `detach-error` rather than waiting beyond it;
6. write the sidecar once through the harness's exclusive/atomic JSON path;
7. return the artifact reference and counts.

The five-second budget starts once and is never reset between setup, body, and detach stages. Late setup, body, or detach settlement after the deadline must not mutate the frozen artifact, result object, or verdict. Listener, command, detach, serialization, or write failures are explicit collector errors.

On the normal path, `closeAndFlush()` completes before the faction result is assembled, before `writeProgress(result)`, before runtime-diagnostic verdict calculation, and before application teardown. On the failure path, it completes before the failed faction entry and progress record are assembled, then the original failure is rethrown. If collection flush also fails, both failures are retained and the collector failure remains fatal. The `finally` block may invoke the idempotent close only as a safety net, but it must still occur before `app.close()`.

This ordering deliberately excludes teardown traffic from the v3 collection. Existing Playwright teardown diagnostics continue under their current contract. The result must never be written first and "filled in" later.

## File-level implementation plan after contract GO

No production file is changed during contract review. After independent GO and root authorization, use test-first implementation in this order:

1. Add `tests/cdp_network_collector.test.ts` with the RED cases below. Run it and retain the expected failures caused by the missing module/API.
2. Add `tools/ui/cdp_network_collector.cjs`, a small require-safe helper that owns the sidecar-scoped observer namespace, redirect-chain-tainted state machine, privacy-safe projections, bounded fields, compact schema, direct body read, caps, tracked staged session setup/cleanup, and idempotent shared-deadline flush. It receives a bounded artifact identity, `createSession`, hash, and clock/deadline dependencies; it must not import Electron, launch a browser, or know Playwright request objects or NetLog.
3. Add RED integration/source-contract cases to `tests/paradox_local_qa_harness.test.ts` for opt-in wiring, disabled-path absence, independent stream retention, and flush-before-result/teardown ordering.
4. Update `tools/ui/paradox_local_qa.cjs` only to parse the exact opt-in flag, construct the helper from `page.context().newCDPSession(page)`, place the sidecar under the existing fresh evidence directory, await the helper at both normal and exceptional exits, reference its receipt in the faction entry, and leave `attachPageDiagnostics`, all existing attribution functions, `networkFailures`, runtime counts, classifiers, and NetLog launch unchanged.

There is no new reader or classifier in this scope. If keeping the helper separate proves more invasive than a compact local implementation, stop and return to review rather than introduce a framework.

## Required TDD positives and negative controls

All tests exercise the real helper state machine and its public-session adapter. Fakes may stand in for the CDP transport; they must emit the same public event/method shapes and inspect every sent command.

Positive collection case:

- one request, response, and `net::ERR_ABORTED` failure under one CDP ID/generation;
- exact local ambient URL on a dynamic loopback port, GET, Media, and one case-insensitive `Range: bytes=0-`;
- one direct `Network.getResponseBody` after failure;
- correct text or base64 decoding, byte count, and SHA-256;
- exact ordered compact rows and a complete flush.

Required negatives:

- missing/wrong/non-string/over-cap Range and duplicate case-insensitive Range keys (including equal values); wrong URL protocol/host/path/query/fragment/method/type/error text; dynamic loopback ports accepted without an ownership claim;
- missing request, response, or timestamp; duplicate response; duplicate terminal event;
- redirect-chain taint, reused-ID ordering, and terminal events after a tainted redirect chain, without a synthetic stale-generation signal;
- `loadingFinished` rather than failure (record only, no body call);
- no body field, malformed base64, decode throw, command rejection, empty body, body over cap, and unresolved command at deadline;
- more than 16 candidates/body attempts, more than 128 simultaneously live IDs, 129 sequentially completed distinct IDs without a false live-ID overflow, and more than 4,096 rows/request-ID histories without eviction or tail-only success;
- credentials, secret query/fragment values, long paths, and over-cap URL component, request/frame/loader ID, header value, MIME/protocol value, error, and inconsistency data, proving secrets and uncapped dynamic strings are neither serialized nor used as map keys;
- event arriving after close and body promise settling after the frozen snapshot;
- listener error, detach error/timeout, serialization/write error, and repeated `closeAndFlush()`;
- setup error/timeout from `newCDPSession`, listener installation, or `Network.enable`; `Network.enable` failure after listeners attach; detach failure during setup cleanup; repeated cleanup; and setup still pending when close begins;
- one shared close deadline across pending setup, body attempts, and detach, proving no stage resets the five-second budget;
- two collectors whose fake public sessions reuse the same `requestId`, proving `observer_session_id` prevents collision or combination;
- asynchronous body attempts settling in reversed order, proving `settled_sequence` records completion order;
- the first overflow emits exactly one bounded receipt, removes listeners at that sequence, and makes no later-event completeness claim;
- command audit proving the only sends are `Network.enable` and candidate-scoped `Network.getResponseBody`;
- explicit rejection of `Network.loadNetworkResource`, `IO.read`, Fetch/interception commands, reload, second fetch, and public `Response.body()` in source/wiring checks;
- disabled CLI path creates no session, no sidecar, and no output-shape change;
- enabled collector success does not remove a Playwright failure or lower `runtimeDiagnostics.networkFailures`;
- flush timeout/error preserves the original harness failure and remains independently fatal;
- result/progress and `app.close()` cannot occur before collector flush completes.

No positive test may call the collector an admission, allowance, expected abort, harmless abort, or Playwright/CDP/NetLog match.

## Cheapest implementation checks, expected cost, and stop rule

Question: does the smallest opt-in helper honor the public CDP-only, passive, bounded, flush-before-verdict contract without changing existing Playwright or NetLog semantics?

Run with telemetry/update reporting disabled and retain each stdout/stderr/exit receipt in a fresh implementation attempt directory:

```powershell
$env:CI='1'; $env:DO_NOT_TRACK='1'; $env:NO_UPDATE_NOTIFIER='1'
node --check tools/ui/cdp_network_collector.cjs
node --check tools/ui/paradox_local_qa.cjs
node tools/test/run_vitest_default.mjs tests/cdp_network_collector.test.ts tests/paradox_local_qa_harness.test.ts --pool=forks --reporter=dot
npx.cmd tsc --noEmit --incremental false --pretty false
```

Pass criteria: both syntax checks exit 0; every focused test passes with the RED failures preserved from before implementation; nonincremental TypeScript exits 0; no command outside the allowed CDP command audit appears; git diff is limited to the helper, focused tests, and minimal harness wiring.

Expected cost: syntax checks under ten seconds total, focused tests about one to three minutes, and typecheck under three minutes. Cap each command at 180 seconds. Stop at the first unexpected failure, inspect all emitted failure categories, correct through a new focused RED/GREEN attempt, and rerun only the affected check. Do not launch Electron, a browser, a package build, a campaign, or any native probe. Do not tune a collector to make a failed Playwright runtime gate green.

## Proof gaps after a successful implementation

Even a fully passing implementation leaves these questions open:

- whether `Network.getResponseBody` remains available after this real ambient `loadingFailed` event;
- whether the returned bytes, if any, equal the packaged asset;
- whether the CDP event corresponds to any particular Playwright failure object;
- whether the CDP request corresponds to any NetLog source;
- whether the request came from a non-main frame under the existing Playwright meaning;
- whether Chromium's decoder consumed the bytes;
- whether loop restart, an application seek, explicit load, source change, navigation, or teardown caused the request/failure;
- whether an observed abort is harmless or admissible.

Those gaps are why this is a collection contract. A future owner-authorized native feasibility run must be separately proposed with its exact package/input binding, one-run cost, stop rule, and independent reader plan. Until then, the current native acceptance result remains failed.
