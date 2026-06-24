# Player Surface Polish Wave 2

**Date:** 2026-06-24
**Run ID:** N/A
**Baseline:** `codex/player-surface-polish-wave` merged on `main`
**Result:** UI/read-model polish packet ready for integration

## Summary
- Modal-required presidential decisions now use effective blocker severity across Inbox, President's Desk, pre-advance review, and Decision Room card counts, so answered convoy rows stop blocking and grouped command cards keep accurate counts.
- Formation and sector read models preserve missing condition or stale roster truth as unreported rather than inventing zero strength, healthy markers, or arbitrary stack targets.
- Tactical-map stack clicks now open the stack chooser before inspecting a single formation, preserving player agency when multiple visible units share a location.

## Changes Made

### Presidential Decision Surfaces
- `deriveInboxItems` now omits convoy rows after a player has staged a convoy decision.
- `effectiveInboxSeverity` centralizes modal-required blocking semantics for convoy, peace, and Dayton decision families.
- Pre-advance command review derives fallback blocker counts from `derivePresidentialBlockers(...)`.
- Decision Room manifest cards can fall back to Inbox-derived modal blockers when `playerDecisionSummary` is absent.
- Grouped Decision Room command cards carry `countWeight` so category counts reflect underlying blockers instead of wrapper-card count.
- Operation opportunity Inbox ids now use proposal ids parsed from `OPPORTUNITY:<proposalId>` where available.

### Formation, Sector, and Map Truth
- `GameStateAdapter` preserves absent formation cohesion/fatigue as `undefined`.
- `FormationDetail` and `BrigadeRow` render sparse condition fields through unreported branches instead of zero/default assumptions.
- `buildFormationsGeoJSON` preserves missing morale/cohesion/fatigue as nullable marker properties and uses an unreported icon suffix instead of healthy defaults.
- `buildSectorFormationAssignment` filters stale roster ids out of front/reserve/rear assignment buckets and records them as `unresolvedRosterIds`.
- `MapContainer` opens the stack overlay first when a click hits multiple co-located visible formations.

## Verification
- Focused UI/read-model pack passed: `node node_modules\vitest\vitest.mjs run tests\ui\inbox_items.test.ts tests\ui\presidential_blockers.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\president_desk_shell.test.ts tests\ui\presidential_decision_room.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui_map_sector_lookup.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\presidential_categories.test.ts tests\ui_map_render_smoke.test.ts --pool=forks --reporter=dot` passed 11 files / 231 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 572 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.

## Lessons Learned
- Modal blocker state is not identical to `InboxItem.severity`; player-required families need one effective-severity helper across all decision surfaces.
- Sparse formation metrics must survive all the way to map marker properties and detail panels; defaulting at the adapter or marker layer is enough to create false tactical confidence.
- Saved sector rosters can contain stale ids after overrides or data drift; player-facing assignment buckets should count resolved fielded formations and expose unresolved ids separately.

## Residual Queue
- Army HQ combat-effectiveness and Force Readiness still need a follow-up pass so missing fatigue, cohesion, morale, personnel, and officer data do not produce favorable readiness grades.
- Army HQ `SectorsSection` expanded brigade rows still need sparse personnel/cohesion copy cleanup.
- Sector adapter threat/density/defensive/intel fields still need an unreported-state model instead of defaulting absent intel to zero threat and full confidence.
- `buildMoraleGeoJSON` still needs an explicit missing-morale treatment; this wave only changed formation markers.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/inboxItems.ts` | Effective blocker severity, answered convoy filtering, opportunity proposal ids |
| `src/ui/map/components/PresidentialInbox.tsx` | Effective severity display |
| `src/ui/map/components/presidential_desk/DecisionCard.tsx` | Effective severity display |
| `src/ui/map/components/presidential_desk/DeskPacket.tsx` | Required item logic uses effective severity |
| `src/ui/map/data/preAdvanceCommandReview.ts` | Fallback blocker counts derive from presidential blockers |
| `src/ui/map/data/presidentialDecisionRoom.ts` | Summary-absent modal blocker fallback and count weights |
| `src/ui/map/data/presidentialCategories.ts` | Category counts sum card count weights |
| `src/ui/map/data/GameStateAdapter.ts` | Sparse condition preservation |
| `src/ui/map/data/types.ts` | Optional formation condition fields |
| `src/ui/map/components/BrigadeRow.tsx` | Sparse condition rendering compatibility |
| `src/ui/map/components/FormationDetail.tsx` | Sparse condition rendering compatibility |
| `src/ui/map/map/MapContainer.tsx` | Stack chooser before direct inspect |
| `src/ui/map/map/builders/buildFormationsGeoJSON.ts` | Nullable marker condition props and unreported icon suffix |
| `src/ui/map/utils/sectorUtils.ts` | Unresolved stale roster ids |
| `tests/` | Focused regressions for all changed surfaces |

## Scope
UI/read-model/map-projection/test/docs hygiene only. No simulation logic, scenario data, startup artifact, save schema, event evaluator mechanics, turn pipeline, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
