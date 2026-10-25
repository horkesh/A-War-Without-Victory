# Installed-adapter fixture attempt 01

## Outcome

**STOPPED — fixed question unanswered.** The cheap prerequisites passed, but the sole authorized attempt failed before `run()` and before any browser launch. No retry was performed.

Playwright 1.60.0 declares `BrowserContext.newCDPSession(page: Page|Frame)` in the installed type surface. The existing Chromium executable is readable at `C:/Users/User/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`; no download or install occurred.

The preserved attempt exited child `1`, wrapper `126`, with no timeout, signal, or spawn error. Node could not resolve the fixture's collector import because `../../../../tools/ui/cdp_network_collector.cjs` climbs one directory above the repository from the fixture directory. The correct repository-relative depth would be `../../../tools/ui/cdp_network_collector.cjs`, but the source was left unchanged because the one-attempt/no-retry stop rule applies. `RESULT.json` was never created, so the wrapper correctly failed its artifact contract. The fake mid-flight negative was also unreached.

There were zero Chromium, Electron, AWWV, package, or native-game launches. No target/frame IDs or CDP event witnesses exist from this attempt. Therefore it does not prove whether a frame-scoped session captures the complete post-attach chain, and it cannot support an attachment change or multi-target expansion.

## Retained evidence

- Exact argv, source snapshot, timestamps, and terminal status: `adapter-attempt-01/start.json` and `adapter-attempt-01/receipt.json`.
- Exact failure: `adapter-attempt-01/stderr.log`, 1,448 bytes, SHA-256 `35141caf04bd6ad2fa6755df814fed31d77f51d88c164e9ad102ce3ef0c54ca8`.
- Attempt binding and prerequisite hashes: `ADAPTER_ATTEMPT_BINDING.json`.

Tracked worktree remains clean at `bff97de7af9406dc2cb907674e2463fccb43052a`.

## Smallest pending proposals

The collector attachment proposal remains conditional and is **not ready for independent implementation review** until a separately authorized fresh attempt answers the adapter question. If a future owner authorizes another attempt, the smallest correction is the one-character path-depth fix only; preserve this failed attempt, use a new exclusive attempt directory, and keep the same 120-second cap and pass criteria. Do not launch the game as a substitute.

The independent playtest-capture gap already has a source-supported minimal proposal: lift the actual `playtest` reference into function scope before `try`, assign it directly from `await playTurns(...)`, and include that same object in the failure entry when later collector finalization throws. Do not synthesize a missing `evidenceManifest`; it was never built. This is a proposal only—no production source was changed.

Output-format changes: none to production or committed artifacts. This report and binding are ignored diagnostic files.

