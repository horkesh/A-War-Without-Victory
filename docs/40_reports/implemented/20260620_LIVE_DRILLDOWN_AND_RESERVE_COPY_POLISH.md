# Live Drilldown and Reserve Copy Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Added stable live-browser hooks for Army HQ Personnel brigade links, Army HQ sector front-segment rows, and Records AAR formation links.
- Extended `qa:live-surface:browser` to prove the new Army HQ hooks in a real browser and to record AAR formation-link proof when the live fixture exposes battle rows.
- Cleaned Army Reserve request copy so normal player surfaces use localized known labels and neutral fallbacks instead of raw request prose or unknown ids.

## Changes Made

### Live Browser Drilldown Hooks
- `PersonnelContent` ORBAT brigade buttons now expose command id, command kind, and formation id for browser targeting while preserving the existing `inspectOnField(...)` route.
- `SectorsSection` rows and front-segment labels now expose sector id and `length_edges` metadata for live proof.
- `AARPanel` battle rows and formation links now expose battle OSID, role, and formation id metadata.
- `live_surface_browser_sweep.cjs` now verifies Army HQ Personnel -> Formation Detail and Army HQ corps-card sector front-segment metadata. Records AAR formation-link proof is conditional because the first-hour fixture can have no visible AAR battle rows.

### Army Reserve Copy Boundary
- Army Reserve panel and Reserve Request modal no longer render raw `description`, `why_needed`, `how_to_use`, unknown purpose ids, or unknown reason ids as normal player copy.
- Army reserve cause, provenance, evidence, severity, attention, and toolbar copy now route through EN/BCS i18n keys with neutral unknown fallbacks.
- Focused tests pin unknown reserve ids and corps-authored prose as hidden internal payloads.

## Verification
- Red proof observed first for missing live hooks in `personnel_player_safe_display`, `aar_tooltip_friction_labels`, `gui_audit_label_discipline`, and `first_hour_browser_gate_contract`.
- Focused green pack passed: `npm.cmd exec -- vitest run tests/army_reserve_legibility.test.ts tests/ui/decision_family_modals.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/aar_tooltip_friction_labels.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` (59/59).
- Typecheck passed: `npm.cmd exec -- tsc --noEmit --pretty false`.
- Live browser sweep passed: `npm.cmd run qa:live-surface:browser`; evidence recorded Army HQ Personnel proof and sector front-segment proof as true, and Records AAR formation proof as `skipped:no-visible-aar-battle-row`.
- Player journey gate passed: `npm.cmd run qa:player-journeys` (234/234).

## Lessons Learned
- Live browser gates should not fail on absent optional fixture state unless the tool creates that state first. Record explicit skipped evidence instead.
- Army Reserve requests carry corps/system prose for diagnostics and payloads, but the player-copy edge needs authored labels and neutral fallbacks.
- Command-strain localization is a larger type-boundary migration and should remain a dedicated branch, not a drive-by partial conversion.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/PersonnelContent.tsx` | Added stable ORBAT brigade selector metadata. |
| `src/ui/map/components/army_hq/SectorsSection.tsx` | Added stable sector/front-segment selector metadata. |
| `src/ui/map/components/AARPanel.tsx` | Added stable battle-row and formation-link selector metadata. |
| `tools/ui/live_surface_browser_sweep.cjs` | Added live Army HQ drilldown proofs and conditional Records AAR proof. |
| `src/ui/map/components/ArmyReservePanel.tsx` | Removed raw reserve request prose from normal visible copy. |
| `src/ui/map/components/ReserveRequestModal.tsx` | Replaced unknown id/title-case fallback with localized neutral copy. |
| `src/ui/map/utils/armyReserveSeverity.ts` | Routed reserve copy through i18n keys and neutral fallbacks. |
| `src/ui/map/i18n/messages.en.ts` / `messages.bcs.ts` | Added reserve purpose/cause/provenance/evidence/severity copy keys. |
| Focused tests | Pinned live hooks and reserve-copy fallback behavior. |

## Next Steps
- Run the dedicated command-strain localization lane with a full structured-copy type migration and render-edge component updates.
- Add a mid-campaign live fixture if Records AAR formation-link proof should be mandatory rather than conditional.

## Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
