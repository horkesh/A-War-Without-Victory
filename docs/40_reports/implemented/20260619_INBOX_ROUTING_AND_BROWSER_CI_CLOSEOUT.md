# Inbox Routing and Browser CI Closeout

**Date:** 2026-06-19

**Type:** UI route ownership, command-surface routing, and CI gate hardening.

## Summary

- Closed the residual inbox routing mismatch by making operation opportunities Decision Room-owned in manifest/routing metadata and removing legacy Army HQ briefing inbox action variants.
- Closed the adjacent briefing-route defect found during the sweep: operation, sector, and settlement briefing cards now route to Tactical Map field inspection instead of expanding Army HQ corps briefing or doing nothing.
- Wired the first-hour and live-surface browser gates into the already-required `full-suite` GitHub Actions job.

## Changes Made

### Inbox Ownership

- `operation_opportunity` now uses `ownerSurface: 'decision_room'`.
- `InboxItem.action` no longer includes `army_hq_opportunity` or `army_hq_briefing`.
- `handlePresidentialInboxAction` no longer contains legacy Army HQ briefing/opportunity fallbacks.
- Reserve requests and personnel matters remain Army HQ staff handoffs by design.

### Briefing Routes

- Decision Room briefing cards for operation, sector, and settlement targets now emit `field` navigation targets.
- Army HQ Situation Briefing recap clicks delegate the same operation/sector/settlement targets through field inspection.
- The Warroom-hosted Decision Room uses the visible shell handoff callback for non-local targets, so field/records/Army HQ/chronicle/inbox routes do not mutate state invisibly behind the Warroom overlay.

### CI

- `.github/workflows/full-suite-and-fingerprint.yml` now runs:
  - `npm run qa:first-hour:browser`
  - `npm run qa:live-surface:browser`
- Both steps are gated by the existing full-suite path detector and run after complete Vitest in the required `full-suite` job.

## Verification

- Focused RED/GREEN route proof for Decision Room briefing field targets.
- Focused RED/GREEN Warroom host ownership proof.
- Focused CI/inbox contract proof.

Commands run:

- `node .\node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts tests\ui\situation_briefing_progressive_disclosure.test.ts --pool=forks --reporter=dot`
- `node .\node_modules\vitest\vitest.mjs run tests\ui\warroom_shell_ownership.test.ts --pool=forks --reporter=dot`
- `node .\node_modules\vitest\vitest.mjs run tests\ui_presidential_toolbar_summary_click.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot`
- `node .\node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts tests\ui\situation_briefing_progressive_disclosure.test.ts tests\ui\warroom_shell_ownership.test.ts tests\ui\decision_surface_registry.test.ts tests\ui_presidential_toolbar_summary_click.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run qa:player-journeys`
- `npm.cmd run qa:first-hour:browser`
- `npm.cmd run qa:live-surface:browser`
- `git diff --check`

## Scope

UI route metadata, UI navigation callbacks, tests, GitHub Actions workflow wiring, and docs only. No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, golden manifest, generated artifact, packaged installer artifact, randomness, timestamp source, or persisted output ordering changed.

## Residuals

- Vitezovi identity/modeling remains the active product/data decision packet.
- Further raw-copy work should be driven only by fresh failing proof on reachable surfaces.
- Browser gates are now CI-blocking inside `full-suite`; future CI restructuring must preserve equivalent branch-protected enforcement.
