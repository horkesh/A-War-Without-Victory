# BCS Localization Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Add a Bosnian/Croatian/Serbian localization path for player-facing UI copy while preserving the existing English UI and avoiding changes to simulation identifiers, scenario data, or canon source text.

## Architecture

Introduce a lightweight localization layer at the UI boundary. Internal IDs, diagnostics, save data, and scenario constants remain English/stable. User-facing strings move into locale dictionaries with typed lookup helpers and fallbacks.

## Tech Stack

- TypeScript locale dictionaries
- React context or existing store preference for active locale
- Vitest for lookup, fallback, and smoke rendering coverage

## Implementation Tasks

1. Scope translatable surfaces
   - Inventory UI strings in the tactical map shell, Chronicle overlay, Army HQ, War Room, reports panels, verdict screens, and settings.
   - Classify strings as user-facing, diagnostic/developer-facing, canon quotation, or internal ID.
   - Exclude diagnostics and persisted identifiers from translation.

2. Define localization API
   - Add locale enum, typed message keys, and a translation lookup helper.
   - Require English fallback for every key.
   - Support interpolation for numbers, faction names, dates, and operation labels.

3. Extract first-pass strings
   - Move high-traffic UI strings into English dictionary.
   - Replace direct literals in the first scoped surfaces.
   - Keep low-risk extraction in small batches to simplify review.

4. Add BCS dictionary
   - Add BCS translations for extracted keys.
   - Preserve proper nouns and historically sensitive names according to canon docs.
   - Flag uncertain terminology in comments or a follow-up translation review list.

5. Add locale control
   - Add a language selector in settings/options.
   - Persist preference locally.
   - Ensure default remains English unless a stored preference exists.

6. Test fallback and layout
   - Verify missing BCS keys fall back to English.
   - Check long BCS strings in narrow panels and compact controls.
   - Add targeted UI tests for representative screens.

## Files To Touch

- `src/ui/map/i18n/*`
- Selected `src/ui/map/components/**` files in small batches
- `tests/ui_i18n*.test.ts`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Run focused i18n tests.
- Run affected UI tests.
- Run `npm.cmd run typecheck`.
- Browser-check representative desktop and mobile widths for overflow.

## Documentation And Ledger

- Document what is translated and what remains stable/internal.
- Add terminology notes for historically sensitive labels.
- Add ledger entry with validation commands.

## Stop Gates

- Stop if translation changes would alter scenario data, diagnostics, save compatibility, or canon meaning.
- Stop if BCS copy needs domain expert review before merge.
- Stop if extracted strings create broad UI churn beyond the planned batch.
