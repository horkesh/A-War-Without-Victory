# BCS Localization Verify-Stale Audit

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-17-bcs-localization-plan.md` (6 implementation tasks)
**Verdict:** **VERIFIED-STALE** — all 6 implementation tasks substantively complete on disk. No source churn required.

## Plan Task-by-Task Verification

| Task | Plan deliverable | Disk state | Status |
|---|---|---|---|
| 1. Scope translatable surfaces | English/BCS-aware UI strings extracted into dictionary keys | First-pass surface is `SettingsScreen.tsx`; 49 keys extracted (`settings.title`, `settings.tab.*`, `settings.turnConfirmation.*`, etc.) | **DONE for first-pass batch** |
| 2. Define localization API | locale enum, typed message keys, lookup helper with English fallback, parameter interpolation | `src/ui/map/i18n/index.ts` (91 lines): `SUPPORTED_LOCALES = ['en', 'bcs']`, `Locale` type, `DEFAULT_LOCALE = 'en'`, `LOCALE_STORAGE_KEY = 'awwv.locale'`, `t(key, params?, locale?)` with `{name}` interpolation, English fallback when BCS key missing | **DONE** |
| 3. Extract first-pass strings | English dictionary populated from initial scoped surface | `src/ui/map/i18n/messages.en.ts` (49 lines) | **DONE** |
| 4. Add BCS dictionary | BCS translations for extracted keys, typed `Partial<Record<MessageKey, string>>` | `src/ui/map/i18n/messages.bcs.ts` (48 lines), translates 47/49 keys (2 deliberately fall back to English, including `settings.experimentalFallbackProbe`) | **DONE** |
| 5. Add locale control | Language selector in settings, persisted preference, English default | `SettingsScreen.tsx` imports `{ SUPPORTED_LOCALES, t, useLocale, type Locale } from '../i18n'`; uses `useLocale()` hook + `setLocale` from a `<select>`; preference persists to `localStorage` under `awwv.locale` | **DONE** |
| 6. Test fallback and layout | Vitest coverage for lookup, fallback, missing-key behavior | `tests/ui_i18n.test.ts` (54 lines, **6 tests all pass**): default-locale lookup, BCS lookup, English fallback for missing BCS key, locale storage round-trip, supported-locale validation, interpolation | **DONE** |

## API Surface Summary

```typescript
// src/ui/map/i18n/index.ts (canonical)
export const SUPPORTED_LOCALES = ['en', 'bcs'] as const;
export type Locale = 'en' | 'bcs';
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'awwv.locale';

export function isSupportedLocale(value: unknown): value is Locale;
export function resolveLocale(value: unknown): Locale;
export function getLocale(storage?: LocaleStorage): Locale;
export function setLocale(nextLocale: Locale, storage?: LocaleStorage): Locale;
export function getActiveLocale(): Locale;
export function subscribeLocale(listener: () => void): () => void;
export function t(key: MessageKey, params?: MessageParams, locale?: Locale): string;
export function useLocale(): [Locale, (next: Locale) => void];
```

The store uses `useSyncExternalStore` for React 18+ compatibility; storage access is wrapped in try/catch so missing/blocked `localStorage` (e.g., headless tests) falls back to `DEFAULT_LOCALE` cleanly.

## Verification

```
npx.cmd vitest run tests/ui_i18n.test.ts --reporter=dot
```

Result: **6/6 PASS** (default-en lookup, BCS lookup, English-fallback for missing key, plus three more covering storage / supported-locale guard / interpolation).

## Scope Of Remaining Work (Future Extraction Batches)

The plan explicitly endorses small-batch string extraction. The first batch covers `SettingsScreen`; future batches can extend coverage to the components named in Task 1 — `ChronicleOverlay`, `ArmyHQModal`, `VerdictScreen`, plus the Warroom shell — **as long as canon proper nouns and historically sensitive labels stay English per the canon hierarchy rule.** Each extraction batch must:

1. Add new keys to `messages.en.ts` (single source of truth for English).
2. Add the corresponding BCS string (or omit and rely on English fallback).
3. Update the component to call `t('key')` instead of using literals.
4. Update or extend `tests/ui_i18n.test.ts` with a representative key.

The `MessageKey` union is exported from `messages.en.ts`, so adding a key to English automatically makes it available in the BCS partial — TypeScript will flag missing BCS translations only when the BCS dictionary is changed to a non-Partial mapping (currently it's `Partial<Record<MessageKey, string>>` to allow graceful fallback).

## Pairing With The Bosnian Player Guide

The Bosnian-language player guide added earlier in this session (`docs/00_start_here/VODIC_ZA_NOVE_IGRACE.md`, commits `306b7dca` + `376ad213`) is doc-only and lives alongside `NEW_PLAYER_GUIDE.md`. The two artifacts complement each other:

- **`docs/00_start_here/VODIC_ZA_NOVE_IGRACE.md`** translates the new-player onboarding doc.
- **`src/ui/map/i18n/messages.bcs.ts`** translates in-app UI copy via the localization layer.

Both keep canon source text (FORAWWV, Game Bible, Rulebook, Engine Invariants, Phase Specs) in English untouched, consistent with the plan's stop-gate: "Stop if translation changes would alter scenario data, diagnostics, save compatibility, or canon meaning."

## Recommended Follow-Up

1. Mark the plan as IMPLEMENTED in `docs/40_reports/CONSOLIDATED_BACKLOG.md` (if it appears as open) and in `docs/plans/MASTER_ROADMAP.md` if cited as open.
2. Future extraction batches: small, scoped, each with corresponding `tests/ui_i18n.test.ts` coverage.
3. Historian/canon review of historically sensitive BCS labels (e.g., proper nouns, war-related terminology) should run before scaling to broader UI surfaces.
