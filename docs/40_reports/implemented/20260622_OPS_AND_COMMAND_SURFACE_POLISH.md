# Ops And Command Surface Polish

## Summary

The next command-surface polish slice closes several player-truth defects found by live review and Pyrrhic specialist audit:

- Ops-planning G-2 prediction failures no longer print raw IPC/engine diagnostics, exception payloads, invalid-response strings, or OSID-bearing errors.
- Ops planning staging labels now resolve to player-facing settlement names instead of raw staging OSIDs.
- The ops modal phase rail now renders through EN/BCS i18n keys instead of hardcoded English labels.
- OOB and Corps Detail active-operation objective progress now displays one-based player progress instead of the zero-based engine index.
- Corps Front logistics totals now include command-directed override brigades assigned to the sector.
- Army HQ corps cards and ORBAT expanded brigade rows now convert equipment condition fractions into operational equipment counts.
- Authorize-phase eligibility findings now map validation codes to neutral staff copy instead of raw validator detail.
- G-2 assessment proceed is disabled while prediction is still loading or absent, while sanitized unavailable/error states remain explicitly proceedable.
- Corps Front metadata now distinguishes the calendar date from the numeric turn.
- Formation Detail sector assignment choices now use projected current brigade counts instead of raw assigned-only shorthand.
- Army HQ corps cards now label planning-only operations as planning operations instead of implying an executing operation or no operation.

## Implementation

- Updated `src/ui/map/components/ops_modal/G2Phase.tsx` to render neutral localized G-2 error title/body keys instead of raw error strings.
- Updated `src/ui/map/components/ops_modal/PlanPhase.tsx` to use the existing OSID display-name map for selected staging.
- Updated `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` and `src/ui/map/components/ops_modal/types.ts` so phase labels resolve through i18n keys.
- Updated `src/ui/map/components/OOBSidebar.tsx` and `src/ui/map/components/CorpsDetail.tsx` so active-operation objective progress is shown as one-based player progress.
- Updated `src/ui/map/components/CorpsFrontPanel.tsx` so command-directed override brigades contribute to sector logistics manpower.
- Updated `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` and `src/ui/map/components/army_hq/OrbatSection.tsx` so equipment readiness fractions produce operational counts.
- Updated `src/ui/map/components/ops_modal/AuthorizePhase.tsx` so validation warnings render player-safe messages by validation code.
- Updated `src/ui/map/components/ops_modal/G2Phase.tsx` so the proceed button reflects loading/awaiting/unavailable states honestly.
- Updated `src/ui/map/components/CorpsFrontPanel.tsx` so the header displays a numeric turn beside the calendar date.
- Updated `src/ui/map/components/FormationDetail.tsx` so sector picker counts use the shared current assignment projection.
- Updated `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` so planning-only operations have explicit status copy.
- Added EN/BCS i18n keys for G-2 error copy and ops phase labels; tightened ORBAT operational-count formatting in both locales.
- Added focused regressions in:
  - `tests/ui/ops_planning_target_discovery.test.ts`
  - `tests/ui/oob_operations_panel.test.ts`
  - `tests/ui/corps_front_panel_routing.test.ts`
  - `tests/ui/gui_audit_label_discipline.test.ts`

## Verification

- Red proof: the focused pack failed before fixes on raw G-2 error display, raw staging OSID display, hardcoded phase labels, zero-based OOB objective progress, missing command-directed Corps Front manpower, and equipment readiness fractions rendered as counts.
- Green proof: `node node_modules\vitest\vitest.mjs run tests\ui\ops_planning_target_discovery.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 57/57.
- Second red proof: the focused pack then failed on raw Authorize eligibility text, G-2 proceed while assessment was unavailable, Corps Front double-date metadata, Formation Detail raw `0b` sector count, and planning-only Army HQ operation status.
- Final combined green proof: `node node_modules\vitest\vitest.mjs run tests\ui\ops_planning_target_discovery.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 74/74.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:live-surface:browser` passed; the script verified dev-server cleanup on port 3239, and `.tmp_live_surface_browser_sweep` was removed afterward.

## Follow-Up Queue

The ops modal and Army HQ/OOB specialist findings from this slice are closed. The broader plan still keeps Records and Decision Room provenance consistency plus the targeted live-browser sweep as separate lanes.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario source data, event mechanics, operation authorization behavior, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
