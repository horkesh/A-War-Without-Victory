# Installed-adapter fixture attempt 03

## Corrected verdict

The corrected fixture passed. Playwright 1.60.0 `context.newCDPSession(frame)` on the actual cross-origin embedded Frame captured a complete post-attachment generic Fetch chain and returned the exact response body from that same session. The simultaneous outer Page session captured none of that request's chain.

The earlier attempt-02 inference is corrected: its `1 request / 1 response / 0 finish` output did not show that the adapter omitted `Network.loadingFinished`. Attempt 02 projected terminal events with `url: null`, then filtered every event by URL before joining by request ID. It discarded the terminal row from its reported stream. Its fixed 100 ms delay was also an avoidable race. Attempt 03 retained full projected streams and waited for the terminal event by Frame-session request ID.

This is a generic Frame attachment result. The Fetch URL `/asset.bin` and resource type `Fetch` do not satisfy the collector's ambient-media abort classifier and do not prove production ambient-abort body eligibility.

## Exact result

- child exit: 0
- wrapper exit: 0
- timed out: false
- signal: null
- spawn error: null
- artifact contract: pass
- browser launch count: 1
- stdout/stderr: both empty
- terminal wait: `Network.loadingFinished`, request ID `18480.2`, matching response already observed
- Frame matching counts: request 1, response 1, finish 1, failure 0
- outer Page matching counts: request 0, response 0, finish 0, failure 0
- response status: 206
- request Range: `bytes=0-`
- browser body: 26 bytes, SHA-256 `3910462cf065a7e2dd8305280146b3221d0f449105a2bd3299263b5549238824`
- direct same-Frame-session body: 26 bytes, the same SHA-256, base64 encoded by CDP
- fake midflight orphan: rejected as `inconsistent` with `response-without-request`

Targets were distinct:

- outer Page target `A74C68C9A8198C760106389760E09268`
- embedded iframe target `57315C37D322FA486C4D34903C6289EE`

The retained `Network.loadingFinished` row has `url: null`, confirming why attempt 02's URL filter removed it. Attempt 03 joins that row to request `18480.2` only through the same Frame session and exact request ID. It does not add a URL to the terminal row or reconstruct a request.

## Minimal harness attachment contract for review

For CDP collection, resolve the actual embedded gameplay Frame first, create the public CDP session with `page.context().newCDPSession(frame)`, and complete `Network.enable` before subsequent gameplay actions. Record the selected Frame identity and URL with the sidecar provenance.

The declared coverage window begins only after the Frame exists and collector setup completes. Electron startup, outer-page loading, and embedded-frame traffic before that point are outside the window and cannot be claimed as covered. An empty outer Page stream is not evidence that embedded-frame traffic is absent.

Keep the current strict request-ID rules. A response or terminal without its request inside the declared session window remains inconsistent. A gameplay Frame replacement, target/session detach, or navigation that invalidates the attached target must end the window and fail closed; it must not silently continue under the old session. Setup, flush, and detach failures remain fatal. Multi-target auto-attach is not required by this evidence.

## Playtest capture proposal for review

Declare a nullable per-faction `playtest` variable before the `try`, assign the exact `await playTurns(...)` result to it, use it for normal manifest construction, and include that same in-memory object in the catch entry when present. This preserves completed gameplay evidence when later CDP finalization fails. Do not synthesize an `evidenceManifest` when its construction was never reached.

No production source was changed and no AWWV/Electron/native-game process was launched.
