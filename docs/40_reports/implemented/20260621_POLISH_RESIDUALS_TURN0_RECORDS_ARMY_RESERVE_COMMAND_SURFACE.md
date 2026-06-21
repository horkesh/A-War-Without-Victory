# Polish Residuals: Turn-0, Records, Army Reserve, Command Surface

**Date:** 2026-06-21
**Result:** Implemented

## Summary

- Closed residual player-polish defects found by the latest Pyrrhic live/browser and command-surface scouts.
- Kept the work UI/read-model/store/test/docs scoped: no simulation logic, scenario data, save schema, calibration baseline, or installer output changed.
- Expanded live raw-token coverage for command-strain/order-interpretation fallback leaks.

## Changes Made

### Turn-0 Provenance

- `buildTurnAftermathView(...)` now gates `notable_flips` behind `shouldNarrateTerritorySummary(...)`, matching the existing turn-0 territory net guard.
- Added a regression where a turn-0 summary with a notable flip still produces no player-facing gain/loss/notable terrain narration.

### Records Copy

- `TurnAftermathRecordsPanel` now localizes the cost severity token through the existing turn-after-action severity labels before interpolating it into Records copy.
- Added BCS coverage so Records shows localized severity copy instead of `critical`.

### Army Reserve Drilldown

- Army Reserve pool brigade rows now route through the shared `inspectOnField(...)` helper with `{ kind: 'field-formation-in-army-reserve', ... }` instead of a bare formation setter.
- Added store coverage that preserves both the selected Army HQ and selected reserve formation while clearing unrelated focused Records targets.

### Codex / Warroom Command Surface Chrome

- Codex dilemma-spine status/action labels and distance-from-history chrome now render through EN/BCS i18n keys while preserving authored dilemma titles, branch labels, essay titles, and historical comparison values.
- Warroom command-card strip, command-card category chrome, pending footer copy, and App-hosted Decision Room shell chrome now render through EN/BCS i18n keys without changing route ids or command-surface category ids.
- CI followup: unmapped command-card ids still render their authored fallback title/blurb while using the existing faction-tinted placeholder art path.

### Live Browser Raw-Token Guard

- `qa:live-surface:browser` now also fails globally on the raw command-strain id `STRAIN-SHAPED`.
- English command-strain/order-interpretation fallback prose such as `ORDER INTERPRETATIONS - N PENDING`, `Officer morale`, and defensive fallback prose is guarded in BCS/BS live-surface mode, avoiding false failures when English UI copy is intentionally visible in English mode.
- Failure evidence writing now recreates the live-sweep output directory before writing the failure JSON, so startup failures still leave inspectable evidence.
- The deterministic first-hour AAR battle fixture remains a separate browser-harness hardening item; this packet only expands the safe always-present raw-token guard.

## Verification

- Focused red/green for turn-0/Records/Army Reserve tests was run before closeout.
- Focused localization pack passed:
  `node node_modules\vitest\vitest.mjs run tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\command_card_strip_accessibility.test.ts tests\ui\warroom_shell_ownership.test.ts tests\ui_i18n.test.ts --pool=forks --reporter=dot`
- TypeScript passed after the residual code changes.
- `npm.cmd run qa:player-journeys` passed 240/240.
- `npm.cmd run qa:live-surface:browser` passed from the normal package script, proving Desk, War Map, Army HQ, Records, Chronicle, Codex, owner drilldown, Codex dilemma/distance sections, and strict server port cleanup; the first-hour fixture still records `recordsAarFormationLinkLiveProof: "skipped:no-visible-aar-battle-row"` as expected.
- CI followup proof `node node_modules\vitest\vitest.mjs run tests/ui/presidential_categories.test.ts tests/ui/command_card_strip_accessibility.test.ts --pool=forks --reporter=dot` passed 18/18 after restoring unmapped command-card fallback title/blurb rendering.

## Files Changed

| File | Change |
| --- | --- |
| `src/ui/map/data/turnAftermath.ts` | Gate notable flips behind the shared turn-0 territory narration guard. |
| `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx` | Localize Records cost severity interpolation. |
| `src/ui/map/components/ArmyReservePanel.tsx` | Route reserve brigade click-throughs through the shared field-inspection helper. |
| `src/ui/map/components/CodexPanel.tsx` | Localize Codex chrome while preserving authored data. |
| `src/ui/map/components/warroom/CommandCard.tsx` | Localize command-card category chrome. |
| `src/ui/map/components/warroom/CommandCardStrip.tsx` | Localize command-surface strip chrome. |
| `src/ui/map/App.tsx` | Localize App-hosted Decision Room shell chrome. |
| `src/ui/map/i18n/messages.en.ts` / `messages.bcs.ts` | Add EN/BCS keys for Codex, command surface, and Decision Room shell chrome. |
| `tools/ui/live_surface_browser_sweep.cjs` | Add command-strain raw-token and BCS English-leak sentinels; harden failure-evidence writing. |
| `tests/ui/*` | Add focused regression and localization coverage. |

## Next Steps

- Build a deterministic live-browser AAR fixture that injects one known first-hour battle/formation row, then make the Records AAR live proof hard-fail instead of skipping when no battle rows exist.
- Treat the enclave-resilience denominator question as a separate design/calibration lane; do not tie it to Srebrenica/Zepa fall delivery.
