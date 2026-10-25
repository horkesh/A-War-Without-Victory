# Installed-adapter fixture attempt 02

## Verdict

The corrected fixture launched installed Chromium exactly once and answered two parts of the fixed question, but it did not prove the required complete chain.

- The outer `Page` CDP session observed zero matching events.
- The embedded cross-origin `Frame` CDP session observed one `Network.requestWillBeSent` and its matching `Network.responseReceived` for the post-attach range request.
- The frame session did not observe `Network.loadingFinished` or `Network.loadingFailed` before the fixture snapshot and detach, even though the browser read all 26 response bytes and matched their SHA-256.
- Because `Network.loadingFinished` was absent, the fixture did not call `Network.getResponseBody`; direct same-session body proof is absent.
- The independent response-only fake control remained fail-closed: status `inconsistent`, one response, zero requests, inconsistency `response-without-request`.

Accordingly, `context.newCDPSession(frame)` is proven to cross the target boundary for request and response events in this installed adapter, while complete request/response/finish/body collection remains unproven. The zero-event outer Page stream cannot be treated as complete traffic coverage.

## Exact attempt

Wrapper:

`C:\Users\User\AppData\Local\Volta\tools\image\node\22.23.2\node.exe tools/diagnostics/run_preserved_preflight.cjs --attempt-dir tmp/player-bot-capability-parity-20261024/native23-cdp-failure-diagnosis/adapter-attempt-02 --entry-script tmp/player-bot-capability-parity-20261024/native23-cdp-failure-diagnosis/installed_adapter_fixture_v2.cjs --timeout-ms 120000 --allow-artifact RESULT.json -- C:\Users\User\AppData\Local\Volta\tools\image\node\22.23.2\node.exe tmp/player-bot-capability-parity-20261024/native23-cdp-failure-diagnosis/installed_adapter_fixture_v2.cjs {evidenceDir}`

The receipt records the expanded argv, exact fixture snapshot, process ID, exit status, timeout status, and artifact contract.

- child exit: 1
- wrapper exit: 1
- timed out: false
- signal: null
- spawn error: null
- artifact contract: pass
- launch count recorded by fixture: 1
- stdout/stderr: both empty

## Actual target and event evidence

- Outer URL: `http://localhost:61868/outer.html`
- Outer target: `1327DBAE2FC9110F47573141E369B733`, type `page`
- Frame URL: `http://127.0.0.1:61867/frame.html`
- Frame target: `1903DBDC29163B87F515BEEF1698DB28`, type `iframe`
- Matching request ID: `20836.2`
- Matching frame ID: `1903DBDC29163B87F515BEEF1698DB28`
- Request: `GET /asset.bin`, `Range: bytes=0-`
- Response: 206
- Browser-consumed body: 26 bytes, SHA-256 `3910462cf065a7e2dd8305280146b3221d0f449105a2bd3299263b5549238824`
- Server witnesses: outer document GET, frame document GET, and asset GET with the expected range header

The fixture awaited the browser's full `arrayBuffer()` and then 100 ms before filtering the streams. It detached immediately after finding no finish event. This preserved run cannot distinguish a later event from an adapter behavior that omits the event; neither explanation may be promoted to fact without new evidence.

## Boundary implications

The earlier native turn-23 orphan is consistent with observing the wrong target: this actual fixture shows that the outer Page target can see none of a post-attach embedded-frame request while the Frame target sees its request and response. It does not establish that a Frame session satisfies the current collector contract because finish and same-session body proof are still missing.

No production attachment change is ready for implementation on this evidence. The smallest candidate remains attaching the collector to the explicitly identified gameplay `Frame`, with a coverage window beginning only after `Network.enable` completes. A reviewable contract must keep these fail-closed consequences:

- traffic before attachment is outside the declared window and cannot be claimed as covered;
- any response without its request inside the window remains inconsistent;
- gameplay-frame navigation or replacement ends the current window unless a newly identified frame session is explicitly started;
- session detach, setup, finalization, or flush failure remains fatal;
- an empty outer Page stream does not establish absence of traffic;
- multi-target auto-attach is out of scope because this fixture did not show it is necessary.

## Playtest capture proposal

The native failure also exposed an independent reporting gap in `tools/ui/paradox_local_qa.cjs`: `playtest` is block-scoped at line 7476, collector finalization throws at lines 7491-7494, and the catch entry at lines 7539-7564 therefore cannot retain the completed playtest.

The minimal proposal for independent review is to declare a nullable in-memory `playtest` variable beside the other per-faction state before the `try`, assign the actual `await playTurns(...)` result to it, and include that exact object in the catch entry when present. This preserves the already captured gameplay result when a later collector finalization fails. It must not synthesize `evidenceManifest`, because manifest construction was never reached.

## Stopping rule applied

This was the one authorized corrected attempt. It failed the complete-chain acceptance condition, so there was no retry, no AWWV/Electron/native-game launch, no download, and no production edit.
