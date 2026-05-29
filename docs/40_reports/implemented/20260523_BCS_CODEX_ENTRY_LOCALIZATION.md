# BCS Codex Entry Localization - 2026-05-23

## Scope

Localized the Codex content path beyond shell chrome. This is UI/data localization only: no simulation behavior, save schema, scenario data, event predicates, unlock logic, dynamic-section predicates, OOB, diagnostics, or tuning changed.

## Changes

- `resolveCodexEssay(...)` now accepts the active locale and resolves localized title, category, body, ghost summary, dynamic-section content, and optional sources.
- `CodexPanel` now subscribes to `useLocale()` and renders localized Codex sidebar titles, badges, selected title/body, and sources when BCS is active.
- `data/scenarios/essays/essay_index.json` now carries `localizations.bcs` coverage for all 96 indexed Codex essays.
- All 61 indexed dynamic Codex sections now carry BCS content.
- `data/codex/ghost_entries_bcs/` now contains Bosnian sidecar Markdown for all 20 ghost-entry files.
- `tests/ui/codex_essay_localization.test.ts` guards essay, dynamic-section, and ghost-sidecar coverage, and checks common Croatian and Serbian-ekavian forms.

## Verification

- `npx.cmd vitest run tests/ui/codex_essay_localization.test.ts --reporter=dot` - 5/5 passed.
- `npx.cmd vitest run tests/ui_i18n.test.ts tests/ui/codex_essay_resolver.test.ts tests/ui/codex_essay_vocab_integration.test.ts tests/ui/codex_essay_localization.test.ts --reporter=dot` - 91/91 passed.
- `npm.cmd run typecheck` - passed.

## Notes

The localized essay bodies are a first Bosnian Codex content layer stored separately from the canonical English essay text. The contract now prevents future Codex entries or dynamic inserts from shipping without a BCS field.
