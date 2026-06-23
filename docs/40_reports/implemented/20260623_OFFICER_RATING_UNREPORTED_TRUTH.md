# Officer Rating Unreported Truth

**Date:** 2026-06-23
**Result:** UI/read-model command-surface truth hardening

## Summary
- Missing officer ratings no longer become invented poor commander traits in Army HQ, Corps Detail, Formation Detail, ORBAT, officer dossiers, or commander-selection surfaces.
- The UI now renders absent officer stat profiles as unreported, keeping actual low ratings distinct from missing source data.
- Commander-selection sorting, prep-time estimates, Army HQ operation commander cards, and Personnel quality chips now normalize missing ratings at the display boundary so `NaN` cannot surface as visible copy or unstable ordering.
- This is read-model/UI hardening only; no OOB source rows, commanders, scenario data, simulation mechanics, or calibration artifacts changed.

## Changes Made

### Officer Read Model
- `src/ui/map/data/GameStateAdapter.ts` now preserves absent officer `competence`, `aggressiveness`, `defensive_skill`, and `political_reliability` as unreported values instead of coercing them to `0`.
- Effective compliance modifier display is omitted when political reliability is absent, instead of synthesizing neutral compliance from missing data.

### Officer Display Helpers
- `src/ui/map/utils/officerCharacter.ts` now treats non-finite officer ratings as unreported across stat labels, pip displays, archetype summaries, rating color, reliability labels, compliance text, and preparation personality summaries.
- Real numeric ratings retain the existing 1-5 descriptor and pip behavior.
- `src/ui/map/components/OperationBriefingModal.tsx` now normalizes unreported commander ratings before recommendation-explanation derivation, preventing `NaN` thresholds from reaching operation briefing copy when a commander exists but has incomplete profile data.
- Commander-picking surfaces sort missing competence below reported competence and use neutral prep-time assumptions for unreported aggressiveness.
- Army HQ operation commander cards display 1-5 officer ratings directly instead of treating them as percentages; missing values display as unreported.
- Personnel roster quality chips show unreported text and neutral color for missing values.

### Tests
- `tests/ui_map_game_state_adapter.test.ts` pins the adapter boundary so absent officer ratings stay unreported and no compliance modifier is synthesized.
- `tests/ui/officer_dossier.test.ts` pins `OfficerProfile` against the old invented `Inept` / `Passive` / `Exposed` / `Defiant` fallback.
- `tests/ui_opord_player_safe_labels.test.ts` pins the Operation Briefing commander-rating normalization guard plus commander-selection, Army HQ operation-card, Personnel chip, and opening commander-sort guards.

## Verification
- `node node_modules\vitest\vitest.mjs run tests\ui_map_game_state_adapter.test.ts tests\ui\officer_dossier.test.ts tests\ui\officer_mini_bio.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui_opord_player_safe_labels.test.ts --pool=forks --reporter=dot` passed 70/70.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 522 tests.
- `npm.cmd run qa:live-surface:browser` passed; the first 5-minute local attempt timed out while still producing screenshots, then the sweep-owned npm/script/Vite processes were stopped and the rerun completed with `live surface browser sweep ok`.
- Live in-app browser inspection on `http://127.0.0.1:3003/` found Army HQ loaded with zero console errors and no visible `NaN` or invented poor-trait fallback copy.

## Scope
UI/read-model/test/docs polish only. No simulation logic, scenario source data, OOB source rows, event mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint, baselines, golden manifests, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
