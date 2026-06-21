# Operational SITREP i18n Boundary

Date: 2026-06-21

## Summary

Closed the next generated-copy leak from the Pyrrhic UI/i18n scout. Operational SITREP headlines, alert rows, operation summaries, front-contact bands, thin-front bands, and alliance-posture bands now preserve English fallback strings in the shared read model while carrying renderable copy tokens for localized surfaces. Army HQ War Summary and Situation tab resolve those tokens through EN/BCS i18n instead of printing English read-model prose directly.

Also closed the diplomacy follow-up found by the UI scout: Patron Relations timeline consequence rows now carry the same `labelToken` as the active-consequence chip, so BCS can localize `International sanctions` consistently in both places.

## Scope

- Added `OperationalSitrepCopyToken` metadata to shared SITREP headline, alert, and corps-operation summary rows.
- Added `localizedOperationalSitrepCopy(...)` for display-edge token resolution with localized `paramKeys`.
- Updated War Summary and Situation surfaces to render SITREP headline/alert copy through tokens.
- Localized Situation front-contact, thin-front, and alliance-posture band labels.
- Propagated diplomacy consequence `labelToken` into negotiation timeline rows.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts tests/ui/war_summary_campaign_cost_i18n.test.ts --pool=forks --reporter=dot` failed before implementation because BCS Situation and War Summary still rendered `Widespread thinly held front sectors need staff review.` and `Faction is collapse-eligible.`.
- Green focused proof: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts tests/ui/war_summary_campaign_cost_i18n.test.ts tests/operational_sitrep_views.test.ts tests/ui/diplomacy_panel.test.ts tests/ui/diplomacy_view.test.ts --pool=forks --reporter=dot` passed 35/35.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 239/239.
- `npm.cmd run qa:live-surface:browser` passed; evidence JSON was inspected (`ok: True`) and `.tmp_live_surface_browser_sweep` was removed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/dynamic-import/chunk-size warnings.
- `git diff --check` passed.

## Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, diplomacy mechanics, patron thresholds, operational outcomes, Srebrenica/Zepa event ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
