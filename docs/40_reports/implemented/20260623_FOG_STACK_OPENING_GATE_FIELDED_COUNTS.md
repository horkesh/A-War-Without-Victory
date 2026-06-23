# Fog Stack, Opening Gate, And Fielded Counts

Date: 2026-06-23

## Summary

Closed the next Pyrrhic scout tranche while GitHub checks were running.

- Tactical map stack expansion now uses the same player-visible, fielded-formation boundary as map counters, so hidden enemy formations cannot appear in the stack overlay under fog of war.
- Later-turn saves no longer let an undismissed opening-brief flag suppress pending event-decision auto-launch when the opening brief itself is not renderable.
- Operation opportunities now declare `decision_room` ownership in the decision-surface registry, matching the manifest and route behavior while preserving Army HQ as source handoff.
- Personnel, Supply Intelligence, Ops commander selection, and Game Over final standings now exclude active-but-forming brigades from player-facing fielded strength, maintenance, and active-brigade counts.
- Baseline Regression failures on the prior pushed head were folded in: pending event decision adapter tests now include player-faction ownership truth, and GUI audit sector-copy expectations now match the semicolon command-summary copy.

## Verification

Focused proof passed:

```powershell
node node_modules\vitest\vitest.mjs run tests\ui_player_visibility.test.ts tests\ui_adapter_boundary.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\event_decision_auto_launch_contract.test.ts tests\ui\decision_surface_registry.test.ts tests\ui\inbox_dedup.test.ts tests\ui\onboarding_track_d_consolidation.test.ts tests\ui\onboarding_automount_edge_cases.test.ts tests\warroom_shell_layer.test.ts tests\ui\personnel_player_safe_display.test.ts tests\ui\supply_intelligence_mobilization.test.ts tests\ui\ops_planning_target_discovery.test.ts tests\ui\game_over_i18n.test.ts --pool=forks --reporter=dot
```

Result: 13 files, 184 tests passed.

Additional verification:

```powershell
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run qa:live-surface:browser
git diff --check
```

Results: typecheck passed. `qa:player-journeys` passed 285/285. `qa:live-surface:browser` passed with 41 browser steps, `live surface browser sweep ok`, and dev-server port cleanup verified. Diff check passed with the existing CRLF normalization warning for `src/ui/map/components/army_hq/SupplyIntelligence.tsx`. The generated `.tmp_live_surface_browser_sweep` evidence folder was removed after inspection.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
