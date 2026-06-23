# Sector Density And Stale Drina Doc Hygiene

**Date:** 2026-06-23
**Result:** UI truth polish plus docs-only supersession cleanup

## Summary
- Army HQ sector rows now display density from current frontline assignment counts, matching the current assignment proof hooks instead of mixing saved sector density with projected counts.
- Formation Detail sector-picker labels now visibly say `current brigade(s)`, matching the already-current data hooks and ARIA copy.
- Historical Drina/Krivaja/Stupcanica reports and old event-system plans now carry supersession language so future agents do not reopen Srebrenica/Zepa as operation-delivery calibration work.

## Changes Made

### UI Truth
- `src/ui/map/components/army_hq/SectorsSection.tsx` derives displayed density from `frontlineIds.length / sector.length_edges` wherever the row is showing current assignment truth.
- `src/ui/map/i18n/messages.en.ts` and `src/ui/map/i18n/messages.bcs.ts` make Formation Detail sector-picker counts visibly current, not merely accessible-name current.

### Historical Report Hygiene
- Added or tightened supersession notes in historical Drina/Krivaja/Stupcanica reports and collapse/event plans.
- Left canon files untouched; current event-owned Srebrenica/Zepa policy already lives in active canon/board/master surfaces.

## Files Changed
| File | Change |
|---|---|
| `src/ui/map/components/army_hq/SectorsSection.tsx` | Current-assignment displayed density |
| `src/ui/map/i18n/messages.en.ts` | Visible current brigade copy |
| `src/ui/map/i18n/messages.bcs.ts` | Matching visible current brigade copy |
| `tests/ui/army_hq_sector_truth.test.ts` | Regression guard for saved-density leakage |
| `tests/ui/formation_detail_parity.test.ts` | Regression guard for visible current sector counts |
| `docs/40_reports/implemented/20260502_DRINA_LATE_WAR_ENCLAVE_PARTIAL.md` | Srebrenica/Zepa event-receipt supersession |
| `docs/40_reports/implemented/20260501_LATE_1995_SCRIPTED_OPS_PACKET.md` | Removed fall-delivery follow-up framing |
| `docs/40_reports/implemented/20260501_TARGET_AWARE_SCENARIO_HEALTH_BASELINE.md` | Superseded Drina scripted-op framing |
| `docs/40_reports/proposals/20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md` | Collapse review wording aligned to event-owned receipts |
| `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md` | Triggered ops clarified as chronology/AAR only |
| `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4C_STRAIN_GEOMETRY_SCOPE.md` | Triggered ops clarified as chronology/AAR only |
| `docs/40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md` | Sector-audit policy supersession |
| `docs/plans/2026-03-21-emergent-event-system-design.md` | Historical-plan warning |
| `docs/plans/2026-03-23-event-flag-wiring-plan.md` | Historical-plan warning |

## Verification
- Red proof failed before implementation on saved Army HQ density and ambiguous Formation Detail sector labels.
- Green proof: `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_sector_truth.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 19/19.
- Expanded focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_sector_truth.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 40/40.
- `npm.cmd run typecheck` passed.
- Targeted stale-language sweep over active Drina/Krivaja/Stupcanica report/plan paths returned no matches after supersession edits; `git diff -- docs\10_canon\FORAWWV.md` was empty.
- `npm.cmd run qa:player-journeys` passed 278/278.
- `npm.cmd run qa:live-surface:browser` produced `ok: true`, `serverPortCleanupVerified: true`, and `armyHqSectorAssignmentTruthLiveProof: { rows: 19, zeroCurrentRows: 6, badZeroRows: [] }`; the generated `.tmp_live_surface_browser_sweep` evidence folder was removed after inspection.
- `git diff --check` passed.

## Scope
UI/read-model/i18n/test/docs hygiene only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
