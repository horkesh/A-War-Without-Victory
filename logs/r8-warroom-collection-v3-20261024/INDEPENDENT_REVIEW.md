# Independent implementation review — Warroom CDP collection v3

## Verdict

**NO-GO pending one targeted correction.** The implementation stays within the approved diagnostic-only file scope and uses only the public CDP session, `Network.enable`, and direct candidate-scoped `Network.getResponseBody`. It does not add an admission, classifier, reader, Playwright/NetLog join, browser/native run, package build, campaign, calibration change, or tuning. The retained focused run passes 91/91, both syntax checks pass, and nonincremental TypeScript passes, all with child/wrapper exit `0/0`.

Those checks do not cover several required fail-closed paths, and source inspection finds five blocking contract mismatches.

## Blocking findings

### Critical — terminal deletion forgets permanent redirect-chain taint and generation

`tools/ui/cdp_network_collector.cjs:235-264` derives the next generation and redirect taint only from the current `requests` entry. Both terminal handlers delete that entry at `tools/ui/cdp_network_collector.cjs:420` and `tools/ui/cdp_network_collector.cjs:447`. If Chromium later reuses the same CDP `requestId`, the collector restarts at generation 1 with no taint. A previously redirected chain can therefore later become a body candidate, contrary to `CONTRACT.md:57` and `CONTRACT.md:62`, which require redirect taint for the remainder of observation.

Keep bounded per-request-ID chain history separate from live request state, or retain equivalent bounded terminal history, so generation and taint survive terminal cleanup. Add a real public-shape fixture that redirects, terminates, then reuses the same ID and proves the later generation remains tainted and sends no body command.

### Critical — missing monotonic timestamps can still trigger body capture

Request, response, and failure rows write `null` for missing/non-finite timestamps at `tools/ui/cdp_network_collector.cjs:269`, `tools/ui/cdp_network_collector.cjs:294`, and `tools/ui/cdp_network_collector.cjs:409`. `candidateReasons()` at `tools/ui/cdp_network_collector.cjs:309-330` never checks them, so a request/response/failure triple with absent timestamps still calls `Network.getResponseBody`. This violates the mandatory missing-timestamp negative at `CONTRACT.md:181` and weakens the ordered raw-record claim.

Retain timestamp validity in the generation state and require finite request, response, and failure timestamps before a body attempt. Add separate request/response/failure missing and non-finite controls and prove each sends only `Network.enable`.

### Critical — setup-failure cleanup can reset the shared close deadline

`cleanupAfterSetupFailure()` creates a fresh deadline with `now() + closeTimeoutMs` at `tools/ui/cdp_network_collector.cjs:468-470`. The setup catch always calls it at `tools/ui/cdp_network_collector.cjs:491-496`, including when `closeAndFlush()` is already waiting under `activeCloseDeadline`. A late `Network.enable` rejection can therefore spend the original close budget and then receive another full detach budget. The cancellation branch correctly consults `activeCloseDeadline` at line 479; setup-failure cleanup must do the same.

Use the active close deadline when one exists, and ensure listener removal plus detach cannot extend it. Add a controlled late setup rejection/detach fixture that measures the shared clock and proves total close work does not reset the five-second budget.

### Critical — full parsed URLs and secret-bearing errors remain in collector state/artifacts

`projectUrl()` returns `{ parsed, projection }` at `tools/ui/cdp_network_collector.cjs:190`, and `onRequest()` stores that object in the `requests` map at lines 252-263. The full parsed URL, including username, password, query, and fragment values, therefore remains live until a terminal event or collection end. Separately, `boundedError()` at line 98 slices error text without redaction, and `compactScalar()` retains bounded protocol/failure strings verbatim. An injected error such as `https://user:password@host/path?token=secret` would remain in `setup.primary_error`, `cleanup_error`, a body-attempt error, or a listener-error inconsistency. The setup test itself injects `enable-secret-...` and only verifies length. These behaviors contradict the contract's transient-URL rule and bounded-redaction promise.

Derive bounded candidate facts during `onRequest()` and retain only the privacy-safe projection plus booleans needed by `candidateReasons()`. Do not store the `URL` object or raw URL. Route every retained free-form error/protocol value through a bounded secret-redaction projection before storing it. Extend privacy controls with credential/query-bearing setup, detach, body-command, listener, failure, and protocol strings, proving neither raw secrets nor a full URL object survives in collector state or serialized output.

### Critical — inconsistent streams can still be reported as complete, and mandatory negatives are absent

`pushInconsistency()` at `tools/ui/cdp_network_collector.cjs:208-215` only appends a row. Close then changes `collecting` to `complete` at line 536 regardless of `artifact.inconsistencies`. The enabled harness lifecycle treats any `complete` artifact as success at `tools/ui/paradox_local_qa.cjs:825-828`. That does not implement `CONTRACT.md:62`, which says missing state, duplicate response/terminal, reused-ID conflicts, and other state conflicts block collection qualification.

Make any state inconsistency produce an explicitly incomplete/fatal collector status while preserving all rows. Then complete the agreed focused negative matrix. The new helper tests currently contain 11 cases and omit, among others: separate missing/wrong Range and URL/method/type/error controls; missing request/response/timestamp; duplicate response/terminal; ordinary `loadingFinished`; unavailable/malformed/empty/over-cap/rejected body results; target/live-ID/body-attempt caps; after-close events; handler runtime error; `createSession` rejection; sidecar write/digest error; and preservation of both an original harness failure and an independently fatal collector failure. The passing 91/91 result is valid for the cases it runs, but it is not the contract's required focused coverage.

## Confirmed implementation properties

- The disabled path is inert and adds no result field.
- The enabled path finalizes before normal result assembly and before teardown; finalization is idempotent.
- On the existing failure path, the faction entry retains `networkFailures`, the original thrown error, and a separate collector error/receipt when finalization returns one.
- Direct body results retain only byte count and SHA-256; no body bytes are serialized.
- Static inspection finds no `Network.loadNetworkResource`, `IO.read`, Fetch/interception command, public `Response.body()`, reload, or second-fetch path in the changed implementation.
- The repository Vitest dispatcher was used. The earlier `npx.cmd` typecheck startup failure was preserved; the corrected direct TypeScript invocation passes `0/0`.

## Bounded residual for later native feasibility work

The production game is hosted in an outer page with an embedded tactical iframe. `newCDPSession(page)` observes one target; no evidence in this implementation packet establishes that Media requests from an out-of-process child iframe would appear in this session. A future separately authorized native result with zero CDP candidates must therefore be reported as **target coverage not established**, never as proof that no ambient abort occurred. This review does not authorize auto-attach, child-target discovery, extra sessions, or any broader producer change.

## Evidence and scope

Reviewed `tools/ui/cdp_network_collector.cjs`, the minimal opt-in wiring in `tools/ui/paradox_local_qa.cjs`, `tests/cdp_network_collector.test.ts`, the two added harness lifecycle tests, the approved contract, and preserved receipts. Reused final evidence: `focused-green-03` 91/91 and exit `0/0`; `helper-syntax-02` and `harness-syntax-02` exit `0/0`; `typecheck-02` exit `0/0`. Historical RED and correction failures remain preserved as reported. No test was repeated because the retained passing checks are unaffected evidence for the paths they cover.

No production or test source was edited by this review. No browser, native app, package, campaign, calibration, tuning, classifier, reader, acceptance, commit, or push action occurred.

## Targeted correction verification — revised approach required

The targeted correction closes the five original source findings: chain taint/generation now survives terminals, all three event timestamps are candidate prerequisites, setup cleanup reuses an active close deadline, retained URLs keep only safe facts/projections and free-form errors are redacted, and stream inconsistencies make the collector incomplete/fatal. The expanded focused evidence passes 128/128 with syntax and typecheck `0/0`.

One material correction defect remains. The new permanent `chains` map is capped by `caps.liveRequestIds` at `tools/ui/cdp_network_collector.cjs:285-287` and never deletes terminal history. The 128-live-request budget therefore acts as a 128-lifetime-distinct-request budget: 129 sequential completed requests stop observation even though only one request is live at a time. That contradicts `CONTRACT.md:123`, and it could end collection before the later ambient event. The retained NetLog has 303 unique `URL_REQUEST` sources; that is not a CDP identity/count or cross-stream join, but it confirms that a 128-lifetime assumption is unsafe.

The root orchestrator approved the smallest revised approach: retain the existing 128 live-request cap; bound permanent chain history by the existing 4,096 event-row cap because every new chain necessarily has a retained request row; add a public-shape fixture with 129 sequential completed distinct IDs proving live count 1 does not overflow; and add a history/event-bound negative. This changes no acceptance criterion, public-session shape, runtime authority, or effective artifact budget. Final verification is limited to this gap and will reuse the 128-pass evidence for all unchanged corrections.

## Final targeted verification

**PASS — GO for the bounded non-admitting collector implementation.** The revised correction changes only the approved history bound, its two public-shape fixtures, and the matching contract clarification.

`tools/ui/cdp_network_collector.cjs:285-287` now bounds permanent chain history by `caps.eventRows` while `tools/ui/cdp_network_collector.cjs:281-283` retains the separate `caps.liveRequestIds` limit for concurrently live state. The new sequential fixture completes 129 distinct request IDs, retains 387 ordered event rows, sends only `Network.enable`, and closes `complete` without overflow. The bound-negative fixture proves a third distinct history stops at a two-row configured event/history bound with one explicit `request-id-histories` receipt.

Final gap evidence passes: helper tests 47/47, helper syntax `0/0`, and direct nonincremental TypeScript `0/0`. The unchanged harness portion remains covered by the prior corrected focused run (83 harness tests within 128/128 total, `0/0`), and the prior harness syntax receipt remains applicable. The exact gap diff contains no harness, lifecycle, classifier, reader, or acceptance change.

All original review findings are closed. The implementation remains an opt-in public-CDP diagnostic collector. It preserves Playwright failures and old evidence, retains no body bytes, performs no cross-stream identity join, and treats every inconsistency, timeout, cap violation, setup/runtime error, or sidecar failure as incomplete/fatal. `status:"complete"` establishes collection completion only.

The out-of-process iframe coverage residual remains open exactly as documented above. It does not block this diagnostic implementation, but a future zero-candidate native artifact cannot establish absence of the ambient request. No browser/native run, auto-attach, child-target session, package, campaign, calibration/tuning, classifier, reader, acceptance change, old-run reclassification, commit, or push is authorized or evidenced by this GO.
