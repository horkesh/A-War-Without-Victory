# CDP frame inconsistency diagnosis 01

## Decision

The retained native opening did not expose a runtime resource failure, a wrong CDP target, or a lost observer session. The collector incorrectly treated a lawful `Network.requestWillBeSent` -> `Network.loadingFailed` chain as structurally inconsistent when no `Network.responseReceived` event occurred.

The smallest repair removes only the fatal `failure-without-response` assertion. The failure row remains retained, and the existing candidate predicates still require exactly one response plus finite request, response, and failure timestamps before a body attempt. No gameplay, URL eligibility, protocol eligibility, target binding, budget, cap, or harness behavior changed.

## Retained evidence

- CDP artifact: `tmp-paradox-qa-20260710/evidence/terrain-native-cold-load-rbih-t1-20261025-02/rbih/cdp-network-collection-v3.json`
- CDP SHA-256: `d5f5ca3e3bac88fb1fc0ae17a284b1df8183f216b4584dc8749bde54e0f0b999`
- Status/summary: `inconsistent`; 213 requests, 211 responses, 8 failures, 205 finishes, 0 target-like failures, 0 body attempts, 2 inconsistencies, 0 cap violations, 0 pending at flush.
- Selected target: iframe target `8778EA545EB90912FB9054284B55427C`; both inconsistent requests carry that exact `frame_id` and loader `287E1352FE37E449F3D155424B3AF1D4`.
- Inconsistency 1: request `2504.13828`, request sequence 255 at `311468.035391`, `GET /data/derived/tiles/hillshade.pmtiles`, `Fetch`, range `bytes=9726509-9806118`; failure sequence 267 at `311468.047686`, `net::ERR_ABORTED`, `canceled=true`, no response.
- Inconsistency 2: request `2504.13829`, request sequence 256 at `311468.035742`, same URL/type/frame/loader, range `bytes=9806119-9885319`; failure sequence 269 at `311468.047775`, `net::ERR_ABORTED`, `canceled=true`, no response.
- The collector retained both failures as non-candidates with `wrong-path`, `wrong-resource-type`, `wrong-range`, `response-count`, and `missing-response-timestamp`. The repair does not alter those predicates.
- All eight failures are expected canceled hillshade PMTiles range fetches. Six have request -> response -> failure chains; the two above have request -> failure chains. The harness independently retained all eight as expected tile aborts, while console, page/network, and raw-network failure arrays are empty.
- Three observed OGG media requests prove the session and classifier were pointed at the gameplay iframe. Each has request -> HTTP 206 response -> finish, including the audible field and warroom tracks. Therefore `target_like_failures=0` and zero body attempts are correct: direct body retrieval is deliberately triggered only by a failed target-shaped ambient request, and no ambient request failed.
- Result SHA-256: `3d51bac94a9110a1b7dc083218913dd18f312ae751ca10aa486c20c26d674d4e`
- Progress SHA-256: `0db7f0703f13cf8649dcb17801b3da5cd77cd22faef31d15fa5417d2a2d465eb`
- NetLog SHA-256: `9b3ccb1d675ee66190ec17e286c6100104a46897bbbbb34041dc1ed8b676c417`
- Harness stderr SHA-256: `549cac7fef809f7299531c5fdfdd752a3f000df399b98030e24802f15019ffe3`

## Protocol authority

The repository-vendored DevTools protocol defines `Network.loadingFailed` as "Fired when HTTP request has failed to load" and gives it its own request id, timestamp, resource type, error text, and optional canceled flag. It states no prior-response prerequisite. `Network.responseReceived` is the separate event fired when an HTTP response is available.

- Vendored protocol: `node_modules/devtools-protocol/json/browser_protocol.json` (`Network.loadingFailed`, around line 18525)
- Vendored Playwright type: `node_modules/playwright-core/types/protocol.d.ts` (`loadingFailedPayload`, around line 11757)
- Official protocol: https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-loadingFailed
- Primary PDL: https://chromium.googlesource.com/devtools/devtools-frontend/+/main/third_party/blink/public/devtools_protocol/domains/Network.pdl

## Repair and focused proof

- `tools/ui/cdp_network_collector.cjs`: removed the single `state.responseCount === 0` fatal inconsistency branch from `onFailure`.
- `tests/cdp_network_collector.test.ts`: replaced the obsolete missing-response inconsistency expectation with an exact two-chain production fixture; retained requestless failure coverage; added a target-shaped request -> failure case proving response-less chains remain body-ineligible.
- RED: `red-focused-test.log`, exit 1, 2 expected failures / 53 passed before the collector change.
- GREEN: `green-focused-test.log`, exit 0, 55/55 tests passed after the change.
- Static parse: `node-check.log`, `node --check tools/ui/cdp_network_collector.cjs`, exit 0.
- Collector SHA-256: HEAD `74dd518319567cbb1b04aa62e6cf37a6c9370ef504bdd75ea9982e09ccdfee36`; working `b8c957b337ba81d375a471c4b0d84f1a0fda1a0c2a4f9c52d0a84b0b3b6a7259`.
- Harness SHA-256 unchanged: `771410a733e4ebc8d821ded0bc44bf6f3719f0dabf275aa5432ad00445938484`.
- Test SHA-256: HEAD `67bbc4e58582d6d82abf0305ad1ac49a50568fa93051919d130f0cbb1683f7d0`; working `2df81fcfc198ac9421548c3ef9986bdf059fcf10ab0e933bc0f3360d5e3371e9`.

`failure-without-request`, `response-without-request`, reused request ID without redirect, duplicate response, duplicate terminal, listener/session/frame lifecycle errors, and all timestamp/body eligibility checks remain fatal or ineligible as before. The repair adds no state, serialization, randomness, time input, iteration-order dependency, or gameplay output. No determinism risk was found under `docs/10_canon/Engine_Invariants_v0_9_0.md`, `docs/PHASE_A_INVARIANTS.md`, `docs/20_engineering/CODE_CANON.md`, and `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`.

No native run, browser run, engine run, build, package, campaign, full suite, commit, or retry was performed.
