# Locale-sensitive formatting inventory

**Date:** 2026-08-02

**Scope:** production map UI (`src/ui/map/**/*.{ts,tsx}`)

The canonical formatter is `formatLocalizedNumber()` in `src/ui/map/i18n/index.ts`. It resolves Bosnian through `bs-BA` and English / nonpersisted `qps` through `en-US`, so player presentation does not inherit the host operating-system locale.

## Covered core surfaces

The following six player-facing surfaces have no zero-argument `toLocaleString()` calls and are guarded by `tests/ui/r7_locale_surface_contract.test.ts`:

- after-action report (`AARPanel.tsx`);
- brigade row (`BrigadeRow.tsx`);
- settlement detail (`SettlementDetailContent.tsx`);
- endgame verdict (`VerdictScreen.tsx`);
- operation history (`OperationHistoryPanel.tsx`);
- Army HQ operations (`army_hq/OperationsSection.tsx`).

The selected core surfaces contain 50 calls to `formatLocalizedNumber()`. The helper definition in `src/ui/map/i18n/index.ts` makes 51 matching source expressions in the production map UI.

## Honest residual

A deterministic source census after the repair finds:

- 47 zero-argument `toLocaleString()` call sites across 26 other map UI files;
- 20 explicit-locale sites: 16 `toLocaleString(...)` calls with arguments and 4 `Intl.NumberFormat(...)` calls, including legacy `en-US` authored narrative helpers and older direct Bosnian switches;
- no `toLocaleDateString()`, `toLocaleTimeString()`, or `Intl.DateTimeFormat` use in the map UI.

Calendar presentation currently uses UTC arithmetic plus the explicit `en | bs | qps` month table in `utils/formatters.ts`, so it is locale-aware without host date formatting. The 47 residual number sites are not claimed complete and remain follow-up localization debt; this Phase 3 repair covers the six named high-traffic surfaces only.

Reproduce the residual census:

```powershell
npm.cmd exec vitest run tests/ui/r7_locale_surface_contract.test.ts -- --maxWorkers=1 --minWorkers=1
```

The executable guard scans every `src/ui/map/**/*.{ts,tsx}` file and pins all three counts: 47 host-default calls, 20 explicit-locale/`Intl.NumberFormat` calls, and 51 helper expressions.
