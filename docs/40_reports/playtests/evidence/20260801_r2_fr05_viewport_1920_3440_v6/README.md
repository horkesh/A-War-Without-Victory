# FR-05 Army HQ responsive-viewport proof

This directory is the authoritative isolated Electron proof for FR-05. It loaded the immutable RS turn-104 owner save, opened Army HQ Summary through the production desktop shell, resized the real `BrowserWindow` content area, and captured both required viewports. It did not package the application or alter release state.

## Authoritative v6 result

- Runtime: app `0.9.9-beta.1`, Electron `41.0.3`, Chromium `146.0.7680.80`.
- Repository state under test: `10c96a33b50c2bf80ac121cb94a4ef1248e8fff0` plus the local R2 implementation diff.
- Source save: [`../20260731_session16_rs_104week_player/autosaves/final-autosave.json`](../20260731_session16_rs_104week_player/autosaves/final-autosave.json), SHA-256 `aaebe5bd01d9ac78ffb264b74f3827ba34307c4f5ad312b4e735aa65fdca7062`; unchanged after the proof.
- Isolation: dedicated user-data/save roots and remote-debug port `3247`; repository saves were unchanged, the entire launched process tree exited, and the port was free afterward.
- Diagnostics: zero console errors/warnings, page errors, request failures, HTTP errors, or unexpected main-process output.
- [`army-hq-summary-1920x1080.png`](army-hq-summary-1920x1080.png), SHA-256 `2a683a4135ce55da6e3a74d096294b23ea5546b894a2140797e5cefe627bdfff`: two objective columns, four objective cards, one non-interactive posture note, no document or horizontal panel overflow, and complete right-edge paint coverage. The Summary panel intentionally scrolls vertically at this height.
- [`army-hq-summary-3440x1440.png`](army-hq-summary-3440x1440.png), SHA-256 `a939da57e218faa86dcfe5b0acda748005a414a3cacf9ed08384fc2183ad4ba8`: three objective columns, four objective cards, one non-interactive posture note, no document or panel overflow, and complete right-edge paint coverage.
- [`evidence.json`](evidence.json) is the machine-readable assertion, process, diagnostic, hash, and cleanup record.

Both viewports contained zero objective-card controls, zero posture-note controls, zero raw localization tokens, zero duplicated `Operation Operation` copy, and zero repeated `hold present policy` phrases.

## Non-authoritative attempts

[`non-authoritative-attempts/`](non-authoritative-attempts/) preserves the complete diagnostic records for v1-v5:

- v1-v4 failed in the proof harness before responsive acceptance: unstable load click, stale/outgoing embedded frame handling, invalid viewport emulation, and the wrong post-load route.
- v5 passed DOM geometry but used software rendering; manual inspection found an unpainted black right half at 3440x1440. Its JSON and both screenshots are retained and explicitly rejected.
- v6 removed the software-rendering override, sized the physical Electron window, added pixel-level right-region coverage, and then passed both machine assertions and manual visual inspection.

This focused viewport proof closes FR-05's responsive-layout acceptance. It is not a fresh 104-week owner diary and does not regrade the original `3/5` President-feel score; FR-03, FR-06, and final integrated owner acceptance remain separate gates.
