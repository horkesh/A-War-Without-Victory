# Situation and War Summary Copy Polish

**Date:** 2026-06-19

**Type:** UI/read-model copy polish.

## Summary

Cleaned first-hour reachable Situation / War Summary copy so the player sees staff-facing language instead of telemetry labels. The English Situation pressure lane now renders `International Pressure`, a qualitative current-pressure line, and qualitative driver strength instead of `IVP`, `Composite IVP`, threshold tables, or formula math. The operational-security lane now renders `Operational Security` / `Security screen active` instead of `OPSEC` copy.

## Changes

- `SituationTab` pressure score fallback now treats missing pressure components as zero instead of producing `NaN`.
- Pressure component rows now show qualitative driver strength (`quiet`, `visible`, `strong`, etc.) rather than `raw x weight -> contribution` math.
- English Situation and War Summary labels now use `Situation Report`, `International Pressure`, `Pressure`, `Operational Security`, and `Security`.
- BCS strings were intentionally left untouched for the owner/native-language pass.

## Verification

- Red/green focused proof: `tests/ui/gui_audit_label_discipline.test.ts` failed before the copy/read-model change, then passed.
- Focused pack passed: `npx.cmd vitest run tests/ui/gui_audit_label_discipline.test.ts tests/ui/war_summary_opsec_reconciliation.test.ts` (6/6).

## Scope

UI copy/read-model only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
