# Command Surface Deep Polish

Date: 2026-06-23

## Summary

Closed the next Pyrrhic command-surface truth continuation after UI and formation/OOB scouts found residual player-facing contradictions. The shared fielded tactical formation boundary now excludes active-but-forming units, while missing lifecycle from the adapter and compatibility-created HQs remains explicitly unreported instead of active/perfect. OOB sector strength labels, Corps Front metrics/stance, Army HQ sector stance recommendations, settlement unit lists/tooltips, defense-preview brigade counts, Force Readiness/effectiveness contributors, and Situation OPSEC health lines now share the same player-truth policy.

## Changed Surfaces

- `src/ui/shared/playerVisibility.ts`: tightened fielded tactical formation checks so active-but-forming and unreported lifecycle units are not fielded.
- `src/ui/map/data/GameStateAdapter.ts`: missing formation lifecycle now maps to `unreported`; synthesized compatibility HQs are tagged and unreported instead of active/perfect.
- `src/ui/map/components/OOBSidebar.tsx`: sector strength badges render player-safe labels instead of raw strength enums.
- `src/ui/map/components/CorpsFrontPanel.tsx`: missing sector stance renders unreported; stale/absent combat metrics fall back to current field assignment where that gives a truthful player snapshot.
- `src/ui/map/components/army_hq/SectorsSection.tsx`: missing sector stance no longer produces a false current `Defend` recommendation.
- `src/ui/map/components/Tooltip.tsx` and `src/ui/map/components/tooltipPlayerSafe.ts`: settlement/front/defense tooltip unit lists filter to fielded units and defense preview uses current assignment truth.
- `src/ui/map/utils/formationAtOsid.ts`: settlement detail no longer lists destroyed/forming formations as physically stationed field units.
- `src/ui/map/components/SituationTab.tsx`: unassessed operation supply readiness displays as unassessed instead of `0%`.
- `src/ui/map/components/army_hq/ForceReadiness.tsx` and `src/ui/map/utils/combatEffectiveness.ts`: readiness/effectiveness summaries exclude active-but-forming brigades.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui_player_visibility.test.ts tests\ui_map_sector_lookup.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui_map_render_smoke.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui\war_summary_opsec_reconciliation.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 82/82 after reviewer follow-up.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 273/273.
- `npm.cmd run qa:first-hour:browser` passed and verified dev-server cleanup.
- `npm.cmd run qa:live-surface:browser` passed and verified dev-server cleanup.
- `git diff --check` passed.

## Scope And Determinism

UI/read-model/test/docs polish only. No simulation logic, scenario data, event mechanics, startup artifact, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Up

The product scout identified First-Hour Soundscape Playback Closeout as a separate next lane; this report does not implement playback. The next non-audio first-hour polish candidates are captured on the Command Board from the Pyrrhic next-lane scout.
