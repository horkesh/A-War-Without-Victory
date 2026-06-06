# Command Card Role And Category Filter Framing

## Summary

The six presidential command-surface category cards now carry stable player-facing role metadata and render a compact role chip: `Act`, `Inspect`, or `Monitor`.

The same batch also makes command-card handoff exact: clicking a six-card category now passes both the existing Decision Room lens and the selected command category id, so predicate-owned categories such as Home Front and Conscience filter the Decision Room to their real cards instead of falling back to the mixed `all` view.

This clarifies whether a card is expected to lead to a presidential act, an inspection surface, or a records/monitoring flow while keeping category order, command authority, simulation behavior, save state, scenario data, baselines, and generated artifacts unchanged.

## Scope

- Added `PresidentialCommandCategoryRole` metadata to `presidentialCategories.ts`.
- Projected role metadata into derived command-category counts.
- Rendered a role chip on `CommandCard`.
- Shared the command-category membership predicate between count derivation and Decision Room filtering.
- Extended the command-strip one-shot focus request to carry an exact `commandCategoryId`.
- Updated `PresidentialDecisionRoomPanel` to filter main priority cards and seed the active dossier from the selected six-card category.
- Extended command-category, command-strip, and Decision Room panel tests to pin role assignment, exact category request, predicate/count alignment, and Conscience filtering.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\presidential_categories.test.ts tests\ui\command_card_strip_accessibility.test.ts tests\ui\presidential_decision_room_panel_i18n.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

Scenario/baseline regression was not required because this is UI presentation/read-model routing only.
