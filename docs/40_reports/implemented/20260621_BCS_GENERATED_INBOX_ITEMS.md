# BCS Generated Inbox Items

**Date:** 2026-06-21

**Status:** Implemented

## Summary

Closed the remaining BCS Presidential Inbox generated-copy leaks for Dayton negotiations, humanitarian convoy decisions, reserve requests, current-turn territory loss/gain situation rows, and the date marker. `deriveInboxItems` now projects those rows through EN/BCS i18n keys instead of hardcoded English strings.

## Player Impact

BCS Inbox rows no longer show English generated copy such as `Dayton Negotiation`, `Humanitarian Convoy`, `Reserve Request`, `Territory Lost`, `Territory Gained`, or `Situation as of`. Reserve request purpose text now uses the existing localized reserve-purpose vocabulary instead of echoing raw purpose ids like `defensive`.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/inbox_items.test.ts --pool=forks --reporter=dot` failed on hardcoded BCS generated Inbox copy.
- Green proof: `npm.cmd exec -- vitest run tests/ui/inbox_items.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 48/48 after the fix.
- TypeScript: `npm.cmd run typecheck` passed.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, route commands, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
