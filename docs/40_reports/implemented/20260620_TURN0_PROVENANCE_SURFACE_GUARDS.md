# Turn-0 Provenance Surface Guards

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Extended the turn-0 territory provenance guard to the remaining player-facing summary surfaces found by the Pyrrhic UI scout.
- Records AAR, the tactical bottom status strip, and Chronicle Wrapped no longer treat scenario-start `territory_net` as post-start ground gained or lost.
- This complements the earlier Generals Digest, Chief of Staff briefing, and Turn Aftermath guard.

## Changes Made
### Records AAR
- AAR territory sections now render only when `shouldNarrateTerritorySummary(...)` allows territory narration.
- Turn-0 scenario-start `territory_net` and `notable_flips` no longer produce AAR gain/loss rows.

### Tactical Bottom Status
- Territory trend arrows now ignore turn-0 summary provenance.
- The control bar still renders current control percentages; only false opening-week trend arrows are suppressed.

### Chronicle Wrapped
- Opening and peak territory calculations now skip turn-0 summary territory data.
- Early battles still count normally; only the territory-gain/loss aggregation is guarded.

## Verification
- Red proof: focused pack first failed on AAR turn-0 territory copy, bottom-strip trend arrow, and Wrapped `earlyGains` including turn-0 setup.
- Focused green: `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts tests/ui/bottom_status_strip_labels.test.ts tests/wrapped_slides.test.ts --pool=forks --reporter=dot` passed 42/42 after implementation.

## Scope / Determinism
- UI/read-model display and focused tests only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue the next Pyrrhic polish items: Army HQ Operations shorthand copy, BCS `OSID` localization cleanup, and OperationsPanel brigade drilldown context.
