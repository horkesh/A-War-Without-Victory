# AAA Polish Wave 4: Live Copy and AAR Provenance

**Date:** 2026-06-20
**Baseline:** `codex/aaa-polish-wave4-live-sweep` from current `main`
**Result:** focused UI copy tests, typecheck, first-hour browser gate, and live-surface browser gate passed

## Summary
- Closed the next Pyrrhic specialist wave from the live player sweep: first-hour Situation, toolbar, Inbox, sector briefing, and Operation History copy now avoid raw staff telemetry and misleading capture language on the audited English surfaces.
- Opening Situation copy now uses qualitative front posture and alliance posture instead of raw front-contact counts, thin-front counts, and a `0.75` coordination score.
- Staff and inbox labels now avoid visible `PAX`, `AUTH`, `INTEL`, and `front sitrep` on the checked player surfaces.
- Turn-0 settlement timeline setup-control rows now render as scenario-start provenance rather than implying territory was taken after the player started.
- Operation History axis summaries now label objective end-state as held at end, not captured, so Krivaja/Stupcanica chronology cannot be read as a substitute fall-delivery receipt for Srebrenica/Zepa.

## Changes Made
### First-hour command copy
- `SituationTab` renders qualitative `Front posture: ...` and `Alliance posture: ...` labels.
- `OperationalSitrepView` headline and alert copy now speak about sectors needing staff review instead of exact thin-front counts.
- English toolbar labels render `Authority` instead of `AUTH`.
- English Corps Front personnel copy renders `personnel` instead of `PAX`.
- Presidential category prompt copy now says `front situation` instead of `front sitrep`.
- `PresidentialInbox` now maps `intel` to `INTELLIGENCE` and uses a neutral `REVIEW ITEM` fallback for unknown item types.

### Settlement and AAR provenance
- `buildSettlementTimeline(...)` treats persisted turn-0 setup/initial-control events as `Controlled by ... at scenario start` with `initial control` detail.
- Operation History axis objective rows now say `Axis held at end` or `Held by another axis`; the axis meta label now reads `Held x/y | Attacks z`.
- Existing detailed operation review provenance remains intact: logged captures and held-at-end objectives stay split through `objectives_logged_captured` / `objectives_held_without_logged_capture`.

### Browser gate hardening
- `tools/ui/live_surface_browser_sweep.cjs` now treats visible `PAX` as a raw technical token in the live surface gate.

## Verification
- `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/gui_polish_typography_floor.test.ts tests/operational_sitrep_views.test.ts tests/ui/inbox_dedup.test.ts tests/settlement_timeline_provenance.test.ts --pool=forks --reporter=dot` passed 45/45.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed with port 3237 cleanup.
- `npm.cmd run qa:live-surface:browser` passed with port 3239 cleanup.
- Manual live browser spot-check on `http://127.0.0.1:3003/` verified RBiH opening splash/identity, `Authority`, qualitative front/alliance posture, no visible `AUTH`, `INTEL`, `PAX`, `Front contacts:`, or `thinly held: 402`, and sector drilldown without `PAX`.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/SituationTab.tsx` | Qualitative front and alliance posture copy |
| `src/ui/shared/operational_sitrep_views.ts` | Staff-review headline/alert copy |
| `src/ui/map/components/PresidentialInbox.tsx` | Player-safe type labels and neutral fallback |
| `src/ui/map/data/presidentialCategories.ts` | `front situation` wording |
| `src/ui/map/i18n/messages.en.ts` | English copy updates for personnel, toolbar authority, inbox, Situation, and Operation History |
| `src/ui/map/utils/buildSettlementTimeline.ts` | Turn-0 setup-control scenario-start provenance |
| `tools/ui/live_surface_browser_sweep.cjs` | Live raw-token gate includes `PAX` |
| `tests/*` | Focused copy/provenance regression coverage |

## Determinism And Scope
UI/read-model copy, i18n templates, focused tests, browser-gate raw-token coverage, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Residuals
- BCS strings still need native-speaker LQA before mirroring English `SITREP`/abbreviation cleanup.
- Live browser gates remain RBiH-first; all-faction browser coverage should be expanded in a separate QA-gate lane.
- A deeper operation AAR provenance lane can expose per-axis logged-capture provenance if needed; this wave only prevents misleading English end-state labels.
