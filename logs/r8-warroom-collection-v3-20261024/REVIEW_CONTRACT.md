# Independent review — Warroom CDP collection v3 contract

## Verdict

**NO-GO pending one targeted documentary correction.** The draft is correctly scoped as an opt-in, non-admitting diagnostic collector. It preserves every Playwright failure, the frozen classifier/reader, the retained native failure, and the separation among Playwright, CDP, lifecycle, and NetLog streams. It also correctly forbids public `Response.body()`, fallback/resource loads, interception, cache-policy changes, browser/native execution, and any acceptance claim.

Five contract gaps must be closed before implementation. They affect the identity, candidate, and lifecycle guarantees the implementation is supposed to prove, so tests cannot safely fill them in by assumption.

## Blocking findings

### 1. The schema does not identify the observing CDP session

`CONTRACT.md:77-83` records the producer and domain but no sidecar-scoped observer/session identity, while event rows at `CONTRACT.md:94-99` carry only `request_id` and `generation`. CDP request IDs are meaningful inside their observing session; the artifact must make that namespace explicit.

Add an immutable collector-generated `observer_session_id` to the session object and every event/body-attempt key, or define an equivalent sidecar-wide namespace once and reference it unambiguously. State separately that `request_id` is the exact string received from the public CDP event and is never synthesized, normalized, or joined to a Playwright or NetLog identity. The observer ID may identify this collector instance only; it must not be described as a browser-internal ID or cross-stream join.

Add a fixture with two fake public CDP sessions reusing the same `requestId` and prove their rows cannot collide or be combined.

### 2. “Stale-generation terminal event” is not observable from the specified public events

`CONTRACT.md:62` correctly notes that redirected requests reuse a CDP `requestId`, but a later `loadingFailed` or `loadingFinished` event carries no generation field. The collector can bind it to current local state; it cannot prove that the browser event belongs to an earlier generation. The required negative at `CONTRACT.md:174` therefore risks a synthetic generation signal that the real producer does not supply.

Make redirect handling fail closed without inventing identity: once any `requestWillBeSent` for a request ID contains `redirectResponse`, mark that request-ID chain tainted for the remainder of the observation and prohibit body collection for every generation in that chain. Retain the exact ordered rows and local generations, but remove any claim that the collector detects a stale-generation terminal event. Replace that negative with real public-shape cases for redirect-chain taint, reused-ID ordering, and terminal events after a tainted redirect chain.

### 3. Partial setup failure does not have a complete disposal contract

`CONTRACT.md:37` makes setup failure fatal, and `CONTRACT.md:131-143` specifies normal/failure flush after a live collector exists, but it does not say how a session is disposed if `newCDPSession` succeeds and listener installation or `Network.enable` fails. That can leave listeners or a CDP session attached before the harness reaches the promised close path.

Specify staged setup ownership: as soon as session creation succeeds, the collector owns it; every later setup failure removes any installed listeners, detaches exactly once, produces a bounded setup-error receipt for the enclosing faction failure, and preserves both the primary setup error and cleanup error when both occur. `closeAndFlush()` must remain idempotent after partial setup. Extend the setup negatives to cover listener-install failure, `Network.enable` failure after listeners attach, detach failure during setup cleanup, and repeated cleanup.

### 4. Full raw URLs conflict with the privacy claim and have no retained-size bound

`CONTRACT.md:46` says secrets are never retained, while `CONTRACT.md:96` stores each request URL and `CONTRACT.md:97` stores each response URL for all observed network traffic. A URL can contain credentials, query values, fragments, or sensitive path data; the candidate rule's empty-query check does not protect noncandidate rows. The URL fields also lack a per-field size cap, so the 4,096-row cap does not adequately bound artifact size.

Define a bounded URL projection used for every row. At minimum, strip userinfo and query/fragment values, record only their presence, bound every retained component, and treat truncation/invalid parsing explicitly. If exact target matching requires the full transient URL, parse and evaluate it in memory, then retain only the privacy-safe projection. Apply bounded redaction to protocol/error strings as well. Add negative controls with credentials, long paths, secret query/fragment values, and oversized protocol/error text, proving that none appears in the serialized artifact.

### 5. The candidate origin must follow the selected runtime, not a development port

The candidate boundary must not hard-code `http://127.0.0.1:3002`. The retained packaged runtime used a dynamic loopback origin (`127.0.0.1:64245` in the preserved attempt), while port 3002 is the tactical development host. A 3002 predicate would exclude the exact packaged request this diagnostic is intended eventually to observe.

For this non-admitting collector, retaining the original exact hostname `127.0.0.1` rule is acceptable if the artifact also records the observed bounded port and explicitly preserves the origin/frame ownership proof gap. A stricter rule may instead bind to an origin obtained from the already selected game page or existing harness server provenance, provided the contract names that public source and tests dynamic-port cases. It must not guess a fixed port or infer ownership from URL similarity.

## Required clarification in the same correction

Make request-header extraction case-insensitive and fail closed on ambiguous duplicate-casing `Range` keys. The compact row should preserve present/absent/invalid state without retaining unrelated request headers. Also state that body-attempt settlement gets an ordered sequence (or an equivalent immutable ordering field), so asynchronous completion order is evidentiary rather than inferred from array mutation.

For an event-row cap, define the exact overflow receipt and stop-observation point. The artifact may explicitly become incomplete at the first overflow; it must not simultaneously claim that every later event remains represented after the bounded listener is closed. Row counts alone do not bound arbitrary IDs, URLs, headers, MIME/protocol values, or inconsistency strings; every dynamic field and every long-lived map key needs an explicit limit, and truncation/overflow must disqualify the affected lineage.

The one five-second close budget must cover pending setup, body attempts, and detach without resetting between stages. Detach timeout/error needs a bounded retained state, and late setup/body/detach settlement must be unable to mutate the frozen snapshot. The focused test command should go through the repository Vitest dispatcher (for example `npm.cmd run test:vitest -- <files> ...` or its direct wrapper entrypoint), rather than invoking `npx vitest` independently of repository policy.

## Confirmed boundaries

Subject to the corrections above, the contract is genuinely diagnostic and does not waive acceptance. `status:"complete"` is collection completeness only; it cannot classify an abort. A direct `Network.getResponseBody` result remains bound only to the raw CDP request ID in this public session. It proves no Playwright identity, NetLog identity, frame ownership, decoder consumption, loop cause, harmlessness, or native admission.

The proposed implementation scope and cheap validation are proportionate: one helper, focused fixtures, minimal opt-in harness wiring, two syntax checks, focused Vitest, and nonincremental TypeScript. No browser, Electron/native launch, package build, campaign, calibration, tuning, reader, classifier, or old-run edit belongs to this packet.

## Review scope

Read-only review of `CONTRACT.md` against the current R8 plan, the retained v2 infeasibility proposal and reviews, repository workflow, and the installed public-CDP constraints already established by the retained exact-source audit. No source, harness, test, classifier, reader, acceptance, native/browser, package, or campaign action was performed. This file is the only review artifact created.

## Targeted correction verification

**PASS — contract GO for the bounded non-admitting implementation.** The single correction pass closes all five blocking findings and the required clarifications:

- `observer_session_id` now creates an explicit sidecar-scoped namespace on the session, every event, and every body-attempt key. The contract distinguishes that local collector identity from the exact public-CDP `requestId`, forbids synthesis/normalization/cross-stream joining, and requires a two-session collision control.
- A redirect permanently taints the observed request-ID chain. The draft no longer claims that public terminal events expose a browser generation, and the fixtures use only real public event shapes for redirect taint, reused-ID ordering, and later terminal handling.
- Session ownership begins when `newCDPSession` resolves. Partial listener/`Network.enable` failures now require listener removal, exactly-once detach, dual-error retention, and idempotent cleanup.
- Retained URLs use a bounded privacy-safe projection. Userinfo and query/fragment values are discarded; all dynamic fields and long-lived keys have explicit bounds; overflow stops observation with one bounded receipt and makes incompleteness explicit.
- The candidate accepts an explicit dynamic port on exact hostname `127.0.0.1`, records the bounded observed port, and preserves the origin/frame ownership gap. It does not hard-code the development port or create new binding machinery.
- Range extraction is case-insensitive and rejects duplicate-case ambiguity. Body completion has an immutable settlement sequence. Pending setup, body attempts, and detach share one non-resetting five-second close deadline. The focused tests use the repository Vitest dispatcher.

The corrected contract remains diagnostic only. A `complete` artifact cannot admit or reclassify any Playwright failure, identify a Playwright request or NetLog source, establish decoder consumption or frame ownership, or make a native run ripe. The retained native result remains failed, and the frozen classifier/reader and old evidence remain unchanged.

This GO authorizes only the contract's smallest test-first helper, focused fixtures, and minimal opt-in harness wiring after root authorization. It authorizes no browser/native run, package build, campaign, calibration or gameplay change, tuning, classifier, reader, acceptance change, old-run edit, commit, or push.
