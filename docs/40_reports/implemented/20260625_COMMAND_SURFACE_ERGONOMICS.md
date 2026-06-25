# Command Surface Ergonomics and Hit-Test Follow-Up

**Date:** 2026-06-25  
**Branch:** `codex/p2-command-surface-ergonomics`  
**Scope:** UI/read-model/accessibility/test/docs polish only.

## Summary

This packet closes the next Army HQ/OOB/Corps Front ergonomics findings from the Pyrrhic scouts. It does not touch simulation logic, scenario data, startup snapshots, save schema, calibration, structural fingerprints, packaging, or Srebrenica/Zepa event ownership.

## Implemented

- Army HQ sector rows now expose explicit `army-hq-sector-toggle` controls with truthful `aria-expanded`, stable detail `aria-controls`, matching detail ids, player-facing aria/title copy, and no nested inspect controls.
- OOB sector rows now describe their destination through aria/title copy and preserve the first authored friendly sector OSID when routing through shared field inspection.
- Army HQ ORBAT formation rows now expose `army-hq-formation-toggle`, stable detail ids, player-facing expand/collapse aria/title copy, and separate field-inspect controls.
- Corps Front brigade rows now expose `data-corps-front-row-kind` for frontline, reserve, command-directed, rear/support, and unresolved rows.
- Corps Front overview and Ops Snapshot preserve missing combat/supply-readiness truth as `Unreported` instead of dash placeholders or omitted fields.
- Formation Detail sector-picker aria copy now uses singular/plural current-brigade grammar.
- The shared `FlipCard` no longer uses rotated 3D faces that intercepted clicks in the Army HQ modal; inactive faces are hidden and cannot capture pointer events.

## Live Browser Proof

Manual in-app browser proof on `http://127.0.0.1:3003/` covered:

- fresh RBiH start and war-start splash,
- OOB sector expansion with player-facing aria/title labels and no raw id leaks,
- OOB sector click selecting the intended sector,
- Army HQ sector disclosure controls and detail ids,
- Army HQ ORBAT opening after the flip-card hit-test fix,
- Army HQ ORBAT formation detail expansion and inspect handoff,
- Formation Detail panel from Army HQ ORBAT,
- Corps Front Overview metrics and Forces tab row-kind hooks.

## Verification

- Focused UI/shell pack: `npm.cmd exec -- vitest run tests/ui_shell_frame_contract.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/accessibility_clickable_controls.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts --pool=forks --reporter=dot` passed 8 files / 137 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 613 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.

## Cleanup

Schrodinger and Halley were closed after their reports were absorbed. Browser-gate evidence folders were removed after verification; only `.tmp_dev_server` may remain while the active local dev server/browser session is still running.
