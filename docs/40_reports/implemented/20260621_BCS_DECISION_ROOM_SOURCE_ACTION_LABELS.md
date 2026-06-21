# BCS Decision Room Source / Action Labels

**Date:** 2026-06-21

**Status:** Implemented

## Summary

Closed BCS Decision Room source/action label leaks without changing the English decision-surface registry contract. `presidentialDecisionRoom` now localizes inbox source labels, manifest decision source/action labels, paramilitary action labels, inbox handoff labels, and peace-plan briefing action labels at the read-model projection boundary.

## Player Impact

BCS Decision Room cards no longer show English source/action copy such as `Presidential Inbox`, `Diplomatic channel`, `Humanitarian channel`, `Review deployment`, `Review proposal`, `Review convoy`, or `Review Plan` on the covered generated decision surfaces.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/presidential_decision_room.test.ts --pool=forks --reporter=dot` failed on the BCS `Presidential Inbox` source/handoff labels and `Review Plan` action label.
- Green proof: the same focused command passed 38/38 after the fix.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, decision-surface registry literals, route commands, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
