# Decision Room and Corps Front Copy Polish

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish

## Summary

Decision Room operation-opportunity cards now present review windows as calendar dates instead of raw turn identifiers, and Corps Front security controls now use player-facing operational-security language instead of `OPSEC` shorthand in English UI copy.

## Player Impact

- Decision Room opportunity evidence now says `Review by {date}` instead of `Expires T{turn}`.
- Corps Front badges, status rows, buttons, and staged-result messages now use `Operational security`, `Tighten sector security`, and `Relax sector security` copy.
- BCS copy remains unchanged pending owner/native-language review.

## Verification

- Red/green regression: `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui/gui_audit_label_discipline.test.ts`
- TypeScript: `npm.cmd run typecheck`
- Player journeys: `npm.cmd run qa:player-journeys`
- Live browser gate: `npm.cmd run qa:first-hour:browser`
- Tactical map build: `npm.cmd run desktop:map:build`
- Whitespace: `git diff --check`

## Scope

UI/read-model copy and tests only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
