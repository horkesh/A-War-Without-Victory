# Independent review — fail-closed v2 loop feasibility

## Verdict

**GO for the hard stop; NO-GO for a v2 admission deliverable.** The authorized development correctly terminated at feasibility. No v2 classifier or reader may be created from the available producer and retained evidence because the required Playwright-request-to-NetLog-source identity is not established. The retained native gate remains **FAILED**.

This is a bounded conclusion about the inspected Electron 41.0.3 / Chromium 146.0.7680.80 source, Playwright 1.60.0 surface, current producer, and retained run. It is not a universal claim that Chromium can never expose a suitable mechanism.

## Findings

No critical, suggestion, or nice-to-have finding blocks the feasibility result.

### Cross-layer identity

The exact Chromium source and hashes independently match `CHROMIUM_SOURCE_PROVENANCE.json`:

- `url_request.mojom` SHA-256 `a86c1f9a0b726340fd8e70188669ee98355fc7aeb748c511c2bdbe66ab4d93da`: `devtools_request_id` is a separate optional field; `net_log_create_info` is restricted and otherwise the request receives default NetLog parameters.
- `url_loader.cc` SHA-256 `f4127058e83b99169ec70293feba5a12f624db049f1fdf89b328a1d7820a9039`: the DevTools ID is retained for observer callbacks while `CreateRequest` receives `request.net_log_create_info` independently.
- `url_request.cc` SHA-256 `8d8f0da2b349bde7549418ede0d3163b6aced4eceb5a0ac25b52180eb1405989`: absent supplied NetLog identity, `URLRequest` creates its own `URL_REQUEST` source; the cited `REQUEST_ALIVE` and `URL_REQUEST_START_JOB` payloads do not add a DevTools ID.

The public Playwright `Request` API does not expose a NetLog source ID. CDP's `Network.RequestId` is a CDP identity; the inspected sources and retained streams do not bind it to `NetLogSource.id`.

### Retained evidence and fail-closed behavior

`FEASIBILITY_AUDIT.json` accurately records that the Playwright failure has no persisted diagnostic, DevTools, loader, network, or NetLog identity. It also records three distinct NetLog `URL_REQUEST` sources for the same ambient URL: 359, 763, and 858. Source 858 has `Range: bytes=0-`, 206,420 filtered bytes, and normal `REQUEST_ALIVE` completion, but selecting it as the failed Playwright request would still depend on the forbidden URL/time/header/byte association. The packet does not make that association and does not manufacture a positive fixture.

The audit reports current hashes for the harness (`2a7b4632...de9fa9`), harness tests (`51c0f6e1...9d39f85`), frozen v1 reader (`4acc5c28...5e590d`), retained NetLog, Playwright progress, and failed result. The legacy classifier and reader remain outside the v2 work.

### Attempts and verification

The two setup failures are preserved and correctly classified:

- `feasibility-01`: child 1 / wrapper 126; the first script expected `progress.networkFailures` at the wrong level and produced no audit.
- `feasibility-02`: child 1 / wrapper 126; the literal `{evidenceDir}` reached the child and produced no audit.
- `feasibility-03`: child 0 / wrapper 0, no timeout, empty stderr, artifact contract passed.

Independent fresh execution of `audit_feasibility_v2.cjs` exited 0 and reproduced `FEASIBILITY_AUDIT.json` byte-for-byte at SHA-256 `905b5b40b4809a3f382893e93938512e577d13f2cfa5e765de048a155cbaccf1`; retained at `review/verification-01/FEASIBILITY_AUDIT.json`.

## Output-format changes

None. No v2 schema, classifier, reader, product source, or acceptance result was created or changed by this feasibility work.

## Remaining gate

Any later v2 development requires separately authorized real-runtime work that demonstrates one non-mutating identity present in both the Playwright failure record and its exact NetLog source, plus the proposal's automatic-loop and complete-stream proofs. Until then, the only correct result is rejection; the old native failure remains failed.
