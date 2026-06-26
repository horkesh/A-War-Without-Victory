# P13/P14 Player Truth Batch

Date: 2026-06-26
Branch: `codex/p13-player-truth-batch`
Status: implemented and locally verified; GitHub closeout pending

## Summary

Closed the next owner-playthrough truth packet without reopening packaging, calibration, save schema, startup artifacts, scenario data, or Srebrenica/Zepa event ownership. The batch focuses on player-facing provenance: no false zeroes, no stale shell handoffs, no enemy identity leakage through fog contacts, no turn-zero setup history masquerading as campaign gains, and no commander vacancy claims when the source roster is simply absent.

## Implemented

- President's Desk handoffs now open the Desk home surface and use Desk copy, not generic inbox or Decision Room labels.
- Pre-advance blockers derive from live required decision rows instead of trusting stale aggregate summary counts.
- Settlement timelines no longer infer control changes from displacement attribution alone.
- Brigade/corps combat records preserve sparse provenance: missing KIA/WIA/MIA, engagements, win/loss, exchange ratio, and ground movement stay unreported unless the source reports them.
- Turn-zero setup-control battle summaries are suppressed from campaign battle narration.
- Fog-visible enemy contacts project as generic `enemy_contact` map markers instead of leaking hostile formation faction identity through marker ids/icons.
- Army HQ sector expansion includes rear/support elements with personnel/location context and inspect affordances.
- The dead operational heatmap mode-7 builder and map source/layer wiring were removed.
- Decision Room active-card and active-category state reconciles against the current live card list after state changes.
- Chronicle consequence receipts carry their owning record surface so Chronicle-filed rows stay in Chronicle focus instead of routing through Army HQ Records.
- Missing officer roster source now renders as commander record unreported; explicit empty rosters remain true vacancies. Synthetic JNA command labels keep their existing synthetic presentation.
- Codex review follow-up: grouped combat record metrics now require all grouped fields before rendering, and OOB pseudo-groups such as `_ungrouped` no longer receive commander-source fallback copy.

## Verification

- Focused P13/P14 proof passed: 16 files / 260 tests.
- Codex review-fix proof passed: 2 files / 48 tests.
- Adjacent command-surface proof passed: 6 files / 56 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed: 43 files / 671 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `npm.cmd run desktop:map:build` passed with the existing non-fatal Vite chunk-size warning.
- `git diff --check` passed.

## Scope

UI/read-model/map-projection/i18n/test/docs polish only. No simulation control/combat logic, event evaluator mechanics, scenario data, startup artifact regeneration, save schema migration, baseline manifest, golden manifest, structural fingerprint artifact, packaged installer artifact, randomness, timestamps, locale persistence, persisted output ordering, or Srebrenica/Zepa event-owned fall receipt behavior changed.
