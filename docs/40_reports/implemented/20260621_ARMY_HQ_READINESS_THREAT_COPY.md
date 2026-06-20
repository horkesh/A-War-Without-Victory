# Army HQ Readiness / Threat Copy Boundary

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Routed Army HQ readiness grades, readiness details, readiness recommendations, threat-section chrome, and command-access readiness chips through EN/BCS i18n keys.
- Reused the shared readiness-grade label helper across Force Readiness, corps summary cards, and the Army HQ Command Access strip.
- Added a focused BCS regression test for the readiness/threat boundary and verified it in a live browser after the manual sweep caught the command-access strip leak.

## Changes Made

### Army HQ Readiness Copy
- `ForceReadiness` now renders panel title, readiness grades, incoming-threat badge, ineffective/fatigue/disrupted/overextended details, active-operation summary, recommendations, and corps-open action through i18n keys.
- `ArmyHQCorpsCard` now renders readiness grades and fatigue/cohesion vitals through the same readiness/i18n boundary.
- `ArmyHQModal` Command Access now passes localized readiness-grade labels into `armyHq.commandAccessReadiness` instead of interpolating raw grade ids.

### Threat Assessment Copy
- `ThreatAssessment` now renders title, section labels, and front-open action through i18n keys instead of hardcoded English.

### Tests
- Added `tests/ui/army_hq_readiness_threat_copy.test.ts` to pin BCS rendering against English fallback leaks such as `FORCE READINESS`, `COMBAT READY`, `INCOMING`, `fatigue`, `disrupted`, `overextended`, `Reinforce front sectors`, `THREAT ASSESSMENT`, `OFFENSIVE THREATS`, and raw command-access grade copy.

## Verification
- Red proof: `npm.cmd exec -- vitest run tests/ui/army_hq_readiness_threat_copy.test.ts --pool=forks --reporter=dot` initially failed on hardcoded `FORCE READINESS` / `THREAT ASSESSMENT`.
- Focused green: `npm.cmd exec -- vitest run tests/ui/army_hq_readiness_threat_copy.test.ts --pool=forks --reporter=dot` passed 3/3.
- I18n pack: `npm.cmd exec -- vitest run tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 13/13.
- TypeScript: `npm.cmd exec -- tsc --noEmit --pretty false` passed.
- Manual live browser: BCS RBiH first-hour start -> Army HQ showed `SPR SPREMNO ZA BORBU` / `SPR OSLABLJENO`, corps cards showed `zamor` / `kohezija`, targeted readiness/threat English leak list was empty, and console errors were empty.
- `npm.cmd run qa:player-journeys` passed 234/234.
- `npm.cmd run qa:live-surface:browser` passed and temporary evidence was removed.
- `npm.cmd run qa:first-hour:browser` passed and temporary evidence was removed.

## Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, Srebrenica/Zepa lifecycle ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Up
- The manual BCS first-hour browser pass exposed an existing unrelated localization gap: the opening identity brief's faction force-description paragraphs still fall back to English. That belongs in the next first-hour BCS copy-polish lane, not this Army HQ readiness/threat boundary.
