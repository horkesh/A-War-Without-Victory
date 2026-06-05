# Front Visit and Personnel Dossier Surface

**Date:** 2026-06-05

## Scope

Closed a focused front-visit/personnel UI batch from the Presidential Command Surface backlog.

This is UI/read-model only. It does not change front-visit eligibility, command authority costs, officer assignment mechanics, mobilization math, simulation turn logic, save schema, migrations, scenario data, baseline manifests, generated artifacts, randomness, timestamps, or deterministic ordering.

## Changes

- `FrontVisitSection` now shows reachable front labels as well as cut-off labels, both sorted deterministically for stable display.
- `PersonnelContent` now opens with a presidential personnel dossier before the raw force overview / mobilization / ORBAT / officer roster detail.
- The dossier summarizes commander vacancies, low-loyalty serving commanders, reserve officers, and mobilization strain from existing loaded-state data.
- Existing Personnel roster quality labels remain player-facing (`Command`, `Initiative`, `Defense`) rather than raw stat abbreviations.

## Verification

- `npx.cmd vitest run tests/ui/personnel_player_safe_display.test.ts tests/ui/officer_mini_bio.test.ts tests/front_visit_action.test.ts tests/ui/directive_card_stop_op_action.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains`
- `git diff --check`

No scenario or baseline regression was required because the change is UI-only and cannot affect sim/output/save/scenario bytes.

## Follow-Up

The next player-command UI batch should continue route/receipt cohesion, especially Records/Chronicle cross-links and broader Patron Relations actor-history polish after the current command/patron PR lands.
