# Seamless Command Room to Tactical Map Transition - 2026-08-01

## Status

R1 is complete locally. The warm Command Room to Tactical Map target passes with current-turn/current-fingerprint truth, zero warm renderer churn, zero warm static-resource requests, clean diagnostics, and player-visible Electron interaction proof. No package, installer, version, tag, publication, or release state was created or changed.

## Problem and measured cause

The original route treated the canonical tactical map as a disposable screen. Command Room navigation destroyed the main MapLibre map, minimap, Deck overlay, and WebGL contexts; repeat entry rebuilt the document and renderer owners and re-read static map substrate. The Phase 0 baseline measured cold current-state p50/p95 at 5,368/5,380.87 ms and warm interactive p50/p95 at 4,251.05/4,628.045 ms.

Phases 1 and 2 first established one campaign-scoped viewport and one stable shell document. This packet closes the remaining R1 work: immutable resource ownership, critical-first initialization, packaged static-resource cache semantics, exact reveal timing, deferred minimap readiness, offline-safe entry documents, and full player-visible evidence.

## Implemented contract

### Static resources and critical-first initialization

- `DataLoader.ts` now shares process-lifetime promise/result caches for immutable packaged geometry, mappings, terrain, damage seed, census, adjacency, and event catalogs. Concurrent and sequential callers receive the same parsed resource.
- A rejected cache entry is evicted, so an explicit retry performs a real new request.
- Read-only map proxies prevent mutation through cached `Map` results. Campaign-derived political control and other live player truth remain uncached.
- `MapContainer.tsx` starts safe requests early but constructs the base map after required operational geometry and political control. SID aliases remain required for exact current-state placement. Terrain, census, adjacency, and scars are staged or demand-loaded and do not block the first truthful frame.
- Optional enrichment failures remain diagnostic and nonfatal; required-source failures retain the visible retry path.

### Electron cache and protocol parity

- Packaged content-hashed Vite assets use immutable caching.
- Packaged HTML and non-hashed derived resources revalidate with stable validators.
- PMTiles and ordinary static responses share containment checks, ETag behavior, conditional response handling, byte-range correctness, and exposed range headers.
- Development behavior remains revalidated so source edits are visible. Path traversal and encoded containment escapes remain rejected.

### Reveal, minimap, and fonts

- Warm reveal uses the retained current-revision gate, direct resize, one render listener, repaint, and then input admission. It no longer spends two application frames before beginning that work.
- The minimap remains retained after construction but is deferred until the primary current-state frame; it never gates primary map interaction.
- Tactical-map and legacy Warroom entry documents no longer request Google Fonts. Existing family declarations fall through to local/system fonts.
- Phase 4 Task 4.3 code splitting was intentionally skipped: the Phase 3 cold p95 was already 125.2 ms against the 1,500 ms entry gate, so speculative module churn was prohibited.

## Acceptance results

| Metric | Phase 0 baseline | Final authoritative | Target | Result |
|---|---:|---:|---:|---|
| Warm switch p50 | 4,251.05 ms | 114.45 ms | Informational | Improved 97.3% |
| Warm switch p95 | 4,628.045 ms | 139.515 ms | <= 150 ms | PASS |
| Warm MapLibre constructions | 2/cycle | 0/cycle | 0 | PASS |
| Warm WebGL releases | 2/cycle | 0/cycle | 0 | PASS |
| Warm Deck constructions/releases | Uncounted initially | 0/0 per cycle | 0/0 | PASS |
| Warm static resource requests | 6/cycle across four families | 0/cycle | 0 | PASS |
| Cold current-state p50 | 5,368 ms | 70.7 ms | <= 1,000 ms | PASS |
| Cold current-state p95 | 5,380.87 ms | 78.8 ms | <= 1,500 ms | PASS |
| Incomplete/stale samples | 0 | 0 of 72 | 0 | PASS |
| Unexpected diagnostics | 0 | 0 | 0 | PASS |

The final performance artifact is `tmp-map-transition-perf/phase4-minimap-reveal-font-authoritative-v1/baseline.json` (103,301 bytes; SHA-256 `33a32edb7dda961533bf8f846326cf41603da2a465f7d76abbb26669dba06b5b`). It records three clean launches, three warmups and twenty measured cycles per launch, 72/72 complete ordered samples, cold p50/p95 70.7/78.8 ms, and warm p50/p95 114.45/139.515 ms. Each measured warm cycle has zero MapLibre/Deck construction, zero release, and zero static-resource request. All three closes were graceful and process-exit verified.

The Phase 3 artifact, `tmp-map-transition-perf/phase3-resource-cache-authoritative-v1/baseline.json` (103,301 bytes; SHA-256 `a3e7c73ad82b040fb0c7d5b33f4ee45a838a6e3821bfc391578b578c8e6857c2`), proved the resource and cold targets but left warm p95 at 229.605 ms. That measurement selected the reveal path for Phase 4.

## Player-visible Electron proof

The supplemental schema-5 artifact is `tmp-map-transition-perf/phase5-player-visible-interaction-authoritative-v8/baseline.json` (19,204 bytes; SHA-256 `2855c269ad72a6a4e8d21b664e61cc92c5c6e045980211b215148a73f50ab34e`). Across three isolated clean RBiH launches it proves:

- the hidden map is `aria-hidden="true"` and inert both before and after a Desk-scoped `H` shortcut;
- `ArrowRight` moves the actual MapLibre camera east by 0.274658 degrees, `+` increases zoom by exactly 1, and `Home` restores longitude, latitude, zoom, and pitch exactly;
- a visible formation counter opens the exact matching formation detail;
- a map click opens a settlement detail with an OSID;
- returning to the Command Room restores exclusive input ownership;
- `rbih_state_identity` resolves to catalog `historical_default_response_id: civic`, and the selected response carries `historical_marker: historical_default`;
- the visible Warroom Advance control advances exactly one turn; the Cutileiro Plan is deferred through `Review Later`, and the subsequent read-only Foča event is acknowledged without inventing a policy choice;
- the reopened map renders turn 1 with matching fingerprint/current-state readiness.

The packet contains 21 screenshots, leaves repository saves unchanged, closes all three launches gracefully, leaves no Electron process, and reports zero unexpected console, page, request, HTTP, stdout, or stderr diagnostics. A whole-artifact scan found no URL scheme, absolute path, raw state, user root, or screenshot hash.

Failed v5-v7 packets remain retained as rejected diagnostic evidence. They successively exposed an incorrect confirmation-dialog assumption, a modal transition hit-test race, and an informational-event acknowledgement that the harness had not yet classified. Each failed closed with clean diagnostics and verified process exit. The accepted v8 harness permits only one neutral `Review Later` and bounded read-only `Acknowledged` actions; any unapproved decision surface remains a failure.

## Verification

- TDD hardening: 42/42 focused profiler and harness tests pass.
- Resource/lifecycle focused slice: 67/67 tests pass.
- The final R1 focused/docs matrix passes 18 files / 187 tests; Electron runtime contracts pass 8 files / 85 tests; player journeys pass 44 files / 769 tests.
- The first-hour browser artifact is `.tmp_first_hour_browser_gate/first_hour_browser_gate.json` (36 proof steps; SHA-256 `32a8fc488b634bd254450006255830668e13177cbf63d0c600f97c53ab68aee5`). The live-surface artifact is `.tmp_live_surface_browser_sweep/live_surface_browser_sweep.json` (42 proof steps/screenshots; SHA-256 `428d278c7cc869411eb6c60015937279ae95fd95c76b145bb4be5a63bed1b84d`). Both record `ok: true`, complete teardown, and verified server-port cleanup.
- TypeScript and Node syntax checks pass.
- Tactical-map and Warroom production builds pass. These are transient local directory builds, not packaging.
- The desktop release check, repository EOL check, and diff check pass. The live-surface command's outer five-minute wrapper expired after step 41, but the owned harness completed step 42 and wrote the successful teardown artifact before validation; no partial run is represented as acceptance evidence.
- Independent review first blocked screenshot-hash camera proof, direct IPC advance, incomplete hidden-state ownership, and string-only tests. All four findings were repaired with profile-only telemetry, visible controls, before/after ownership proof, and behavioral tests before final approval.

## Determinism, privacy, and scope

Profiling remains explicit and default-off. Camera telemetry is available only through the profiling bridge, returns bounded numeric state, and never enters game state, saves, replay, scenario output, or committed generated artifacts. Caches own immutable package substrate only. No simulation rule, event timing/content, scenario, OOB, fog projection, historical claim, save schema, deterministic baseline, package version, tag, installer, publication, or release state changed. `docs/10_canon/FORAWWV.md` is unchanged.
