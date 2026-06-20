# Docs Process and Canon Terminology Cleanup

Date: 2026-06-20

## Summary

Normalized active process and planning docs to the current Pyrrhic-panel sign-off model and tightened sensitive-history wording around Srebrenica/Žepa fall ownership.

## Changes

- Replaced stale owner/manual-review language in active process pointers, planning lanes, role guidance, and roadmap/board rows with Pyrrhic-panel sign-off language.
- Kept owner escalation only for BLOCK, split-verdict, or bright-line uncertainty cases.
- Clarified that Srebrenica and Žepa control transitions are owned by `srebrenica_falls_1995` / `zepa_falls_1995` event receipts.
- Reframed Krivaja-95 and Stupčanica-95 references as chronology, force-composition, operation-health, or AAR context rather than operation-delivered fall mechanics.

## Verification

- `rg` scans for stale owner/manual-review phrases and operation-delivery wording.
- `git diff --check`.

## Scope

Docs/process only. No simulation logic, UI code, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, package artifacts, randomness, timestamps, or persisted output ordering changed.
