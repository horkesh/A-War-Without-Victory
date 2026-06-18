# Codex and Replay Player-Safe Labels

**Date:** 2026-06-18
**Type:** UI/read-model presentation hardening
**Result:** Raw Cost Ledger, rupture, and replay identifiers stay internal on Codex and Verdict Replay surfaces.

## Summary

- Dynamic Codex essay tokens now render player-safe labels for Cost Ledger faction suffixes, annotation tags, and rupture lists.
- Verdict Replay sparse-manifest control totals now render military labels and nouns instead of `faction:osids` debug copy.
- The batch is UI/read-model only: no simulation, scenario data, save schema, baseline manifest, generated artifact, calibration floor, or packaged installer artifact changed.

## Changes Made

### Codex Dynamic Essays

- `codexEssayResolver.ts` now maps Cost Ledger faction suffixes to player-facing military labels: `RS -> VRS`, `RBiH -> ARBiH`, `HRHB -> HVO`.
- Cost Ledger annotation tags and `{rupture_list}` entries are humanized before rendering, so values such as `accelerated_safe_areas_1993` and `srebrenica_genocide_1995` do not appear as visible copy.
- Focused resolver tests now pin dynamic Cost Ledger findings, annotations, and rupture lists against raw faction brackets and snake_case IDs.
- The broad Codex vocab integration suite now expects the same player-facing labels, closing the required fast-suite CI mismatch from the older raw `RS`/`HRHB`/`RBiH` bracket assertions.

### Verdict Replay

- `ReplayScrubber` now formats sparse control totals as readable summaries such as `VRS 42 settlements` instead of `RS:42`.
- Replay tab tests now guard the sparse manifest path and live Verdict replay route against raw `faction:osids` strings.

## Verification

- `npx.cmd vitest run tests\ui\codex_essay_resolver.test.ts --pool=forks --reporter=dot`
- `npx.cmd vitest run tests\ui\codex_essay_resolver.test.ts tests\ui\replay_scrubber_autoplay.test.ts tests\ui\endgame_verdict_replay_tab_live.test.ts tests\ui\endgame_verdict_screen_mount.test.ts --pool=forks --reporter=dot`
- `npx.cmd vitest run tests\ui\codex_essay_vocab_integration.test.ts --pool=forks --reporter=dot`
- `npx.cmd vitest run tests\ui\codex_essay_vocab_integration.test.ts tests\ui\codex_essay_resolver.test.ts tests\ui\replay_scrubber_autoplay.test.ts tests\ui\endgame_verdict_replay_tab_live.test.ts tests\ui\endgame_verdict_screen_mount.test.ts tests\ui\decision_consequence_trail.test.ts tests\operational_sitrep_views.test.ts --pool=forks --reporter=dot`
- `npm.cmd run test:vitest:fast`

## Files Changed

| File | Change |
| --- | --- |
| `src/ui/map/components/codex/codexEssayResolver.ts` | Added player-safe Cost Ledger faction and identifier label formatting. |
| `src/ui/map/components/replay/ReplayScrubber.tsx` | Added readable sparse control-total labels. |
| `tests/ui/codex_essay_resolver.test.ts` | Pinned Cost Ledger, annotation, and rupture token copy. |
| `tests/ui/codex_essay_vocab_integration.test.ts` | Synced broad integration expectations to player-safe labels. |
| `tests/ui/replay_scrubber_autoplay.test.ts` | Pinned sparse manifest labels. |
| `tests/ui/endgame_verdict_replay_tab_live.test.ts` | Pinned live Verdict Replay labels. |
| `tests/ui/endgame_verdict_screen_mount.test.ts` | Updated mount coverage for replay label copy. |

## Next Steps

- Continue Pauli's remaining raw-copy queue: decision consequence reserve reasons, operational sitrep labels, event-modal effect fallback, War Cost Summary, and Army HQ Campaign Cost wording.
- Keep raw IDs available for internal joins, sorting, diagnostics, and tests, but require visible labels to pass through authored or player-safe formatters.
