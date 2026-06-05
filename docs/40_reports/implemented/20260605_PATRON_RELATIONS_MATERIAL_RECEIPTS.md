# Patron Relations Material Receipts

**Date:** 2026-06-05

## Scope

Closed a focused patron/diplomacy/receipt read-model slice: Patron Relations now exposes the existing patron-defiance material cuts as stable material consequence records, instead of collapsing them into only one latest summary sentence.

This is UI/read-model only. It does not change patron mechanics, event choices, material-support calculations, simulation turn logic, save schema, migrations, scenario data, baseline manifests, generated artifacts, randomness, timestamps, or deterministic ordering.

## Changes

- `buildDiplomacyView(...)` now projects player-faction `patron_defiance_supply_cuts` into newest-first `entries` on `PatronDefianceCutsView`.
- Entry ordering is deterministic: turn descending, cut fraction descending, support-after ascending.
- `DiplomacyPanel` renders those entries under the Patron Relations confidence/cut block as material consequence records.
- Existing one-line patron defiance summary remains intact for the latest cut and count.

## Verification

- `npx.cmd vitest run tests/ui/directive_card_stop_op_action.test.ts tests/ui/diplomacy_view.test.ts tests/ui/diplomacy_panel.test.ts tests/ui/consequence_receipts.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`

No scenario or baseline regression was required because the change is UI/read-model only and does not affect sim/output/save/scenario bytes.

## Follow-Up

Broader Patron Relations route polish, actor history depth, and Records/Chronicle receipt cross-links remain product work. This slice makes the existing material consequence visible in the patron surface without adding mechanics.
