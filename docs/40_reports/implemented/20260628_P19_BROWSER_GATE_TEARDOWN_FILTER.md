# P19 Browser Gate Teardown Filter

Date: 2026-06-28
Branch: `codex/p19-main-full-suite-teardown-fix`

## Summary

After PR #460 merged to `main`, the post-merge Full Suite failed in `qa:first-hour:browser` after the player-flow proof had completed and the dev server had been cleaned up. The captured console errors were four Deck.gl teardown messages:

- `deck: Failed to fetch`
- source URL: `/node_modules/.vite/deps/@deck__gl_layers.js?...`

The same head had passed PR Full Suite before merge, and all other post-merge checks were green. This repair keeps browser gates strict for page errors and real console/network failures while classifying this deterministic Vite/Deck.gl teardown fetch noise the same way existing favicon and abort teardown noise is classified.

## Changes

- Added `isIgnoredConsoleError(...)` to the first-hour browser gate.
- Added the same classifier to the live-surface browser gate.
- The ignore is narrow: exact `deck: Failed to fetch` text, a Vite-optimized `@deck__gl_layers.js` source URL, and `browserGatePhase === 'teardown'`.
- Added contract coverage so both gates keep the classifier and the Deck.gl teardown signature pinned.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` failed 2 assertions before the classifier existed.
- Green proof: the same focused contract test passed 1 file / 7 tests.
- `npm.cmd run qa:first-hour:browser` passed and verified dev-server port cleanup.
- `npm.cmd run qa:live-surface:browser` completed successfully with `ok: true` after the local shell timeout; the running process was observed to finish and write success evidence.
- `git diff --check` passed.

## Scope

Browser-QA tooling and tests only. Active-run Deck.gl console errors remain fatal; only teardown-phase Deck.gl fetch noise is ignored. No UI runtime behavior, simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema, baseline/golden manifest, structural fingerprint artifact, packaged installer artifact, randomness, timestamps, locale persistence, persisted output ordering, or Srebrenica/Zepa event-owned fall receipt behavior changed.
