# R7 Bosnian locale source checkpoint

**Date:** 2026-08-02

**Roadmap owner:** R7 Phase 3

**Status:** SOURCE CONTRACT COMPLETE; NATIVE LANGUAGE REVIEW AND INTEGRATED VISUAL EVIDENCE OPEN

**Release claim:** None; Bosnian remains visibly Preview

## Outcome

The UI now has one canonical Bosnian identity: `bs`, formatted through `bs-BA`. A persisted legacy `bcs` preference is accepted only at the compatibility boundary, resolves as `bs`, and is rewritten as `bs` when storage is writable. Canonical source ownership is `messages.bs.ts` / `bsMessages`; `messages.bcs.ts` is a read-only import shim. Existing event, Codex, ghost-entry, and formation-name data that still use authored `bcs` fields are reached through explicit legacy-content adapters rather than leaking the old identifier into production locale comparisons.

Settings display `Bosanski (Preview)` and English remains the default. This is a deliberate truth claim: the repository carries a complete draft dictionary, but this checkpoint does not claim a native linguistic pass or production LQA.

## Implemented contract

- `SUPPORTED_LOCALES` is exactly `en | bs`; runtime QA may additionally select `qps` without persisting it.
- `getLocale()` resolves stored `bcs` as `bs` even if its best-effort rewrite cannot write to storage; `setLocale('bcs')` remains a bounded compatibility input and persists `bs` when storage is writable.
- `formatLocalizedNumber()` resolves Bosnian through `bs-BA` and `en|qps` through `en-US`. Six named high-traffic surfaces use it; [the formatting inventory](../../provenance/LOCALE_FORMATTING_INVENTORY.md) records 47 host-default residual calls in 26 other files rather than claiming global completion. Calendar labels use the explicit locale month table and UTC arithmetic.
- Main menu, settings, map consumers, warroom helpers, formation names, Codex, ghost entries, consequence receipts, letter-home prose, and localized number/date helpers consume canonical `bs`.
- The single known Bosnian fallback probe is translated. Probe operation payload identity is canonical (`<operation> (Probe)`) in every locale; localized `probeName` copy is presentation-only and never enters staged state or commander assignment identity.
- Browser entrypoints accept `?locale=bs`; QA entrypoints accept `?locale=qps`. The live-surface harness now uses semantic test IDs for all shell navigation, pause/tutorial recovery, Army HQ drilldown, and turn-zero provenance rather than English labels. One continuous executable component journey drives the real menu, war splash, faction briefing, opening inbox, Desk, and decision modal under EN, BS, and QPS, loads the catalog-backed `rbih_state_identity` event, and selects its declared `historical_default_response_id`. The legacy `?locale=bcs` boundary remains compatibility-only.
- A separate executable identity proof drives the real `AuthorizePhase`, crosses the `useIPC` / `window.awwv` bridge into production `stageAuthoredOperation`, then serializes and deserializes the canonical April 1992 startup save. EN, BS, and QPS produce byte-identical complete saves with canonical `Operation Sana (Probe)` pending identity. Presentation locale never enters authored operation state.
- Ordinary tests use the canonical `bs` setter. The only test call to `setLocale('bcs', ...)` is the explicit persisted-preference compatibility case in `tests/ui_i18n.test.ts`; 136 ordinary calls in 78 test files were migrated.

## Deterministic pseudo-locale

`qps` is built from the canonical English dictionary and is never written to locale storage. It:

- wraps visible messages in delimiters and targets 40% body expansion across the full 5,556-key corpus. Ratio eligibility is explicit: source length at least 20 code units and enough unprotected ASCII letters to supply the target; 2,234 eligible messages stay within 1.38–1.42 after excluding the fixed four-character wrapper;
- preserves `{interpolation}`, HTML-like markup, entities, and printf tokens byte-for-byte;
- covers every English key;
- uses only existing source glyphs plus the Bosnian glyph set;
- emits strict code-point key order and contains no clock, timestamp, absolute path, randomness, or environment-derived content.

`tools/ui/localization_viewport_contract.ts` pins 24 future evidence cases: Desk, Decision Room, Army HQ, Map, Records, Codex, Chronicle, and Endgame at 1366x768, 1920x1080, and 3440x1440. This source lane does not claim those real captures. Clipping disposition and browser/Electron screenshots remain R7 Phase 5 integrated evidence.

## Exact localization census

| Measure | Count |
|---|---:|
| English authored keys | 5,556 |
| Bosnian draft strings | 5,556 |
| English fallback uses | 0 |
| Length-risk review keys | 599 |
| Player-surface source files scanned | 385 |
| Embedded-English candidates | 579 |
| Confirmed concatenated-copy findings | 0 |
| Dynamic-message-key candidates | 391 |
| Exact open review findings | 970 |

The 970 findings are not 970 confirmed bugs. They are the deterministic review remainder: 579 source-literal candidates and 391 dynamic-key candidates. The diagnostic owns their machine-readable disposition and stable ordering. This checkpoint removes arithmetic and selector-expression false positives while retaining a regression fixture that proves a real localized-expression-plus-literal construction is still found.

The review record is [LOCALIZATION_REVIEW_LEDGER.json](../../provenance/LOCALIZATION_REVIEW_LEDGER.json). Its unresolved owner is `preview-language-review`; reviewer/date remain null for the native pass. No runtime state or save data carries review workflow metadata.

## Verification

- Earlier independent-review RED: **9 failures / 64 tests** across the original 7-file repair matrix. Follow-up challenges exposed localized probe identity and remaining English-text harness navigation before those defects were closed.
- Proof-correction RED: the former component route stopped after independently rendered intro surfaces, the persistence assertion serialized a helper payload rather than a save, and the new real `AuthorizePhase` proof failed until it had a semantic authorization selector. The canonical-locale guard also rejected ordinary `setLocale('bcs', ...)` use until 136 calls in 78 test files moved to `bs`.
- Full affected regression surface, including the new untracked-at-first-count persistence test: **81 files / 929 tests passed**.
- Focused locale, pseudolocale, diagnostic, operation-staging, desktop-persistence, real route, and real save-boundary matrix: **9 files / 91 tests passed**.
- Continuous real Desk/historical-default plus AuthorizePhase/save proofs: **3 files / 10 tests passed**.
- Lightweight player-journey matrix: **44 files / 771 tests passed**.
- `npm.cmd run typecheck`: passed.
- Localization diagnostic CLI: exited 0 and reproduced 5,556 English keys, 5,556 Bosnian strings, zero fallback, and the exact 970-finding review remainder.
- Pseudo-locale builder CLI: exited 0 and emitted a deterministic module; the full-corpus test covers all 5,556 keys and the exact 2,234-message eligible distribution.
- `node --check tools/ui/live_surface_browser_sweep.cjs`, protected-path scope, the one-owner legacy setter assertion, and final diff hygiene: passed.

The expected stderr in malformed-save browser fixtures is negative-path test evidence and did not fail the player-journey matrix.

## Deferred evidence and non-goals

- Native Bosnian linguistic and in-product review: open; `Bosanski (Preview)` remains mandatory.
- Real three-viewport capture sheets and clipping review: deferred to R7 Phase 5.
- The 970-item source review queue: exact and executable, not silently waived.
- No simulation rule, save schema, scenario, baseline, performance artifact, package, Electron build, release/version/tag/signing/publication state, or `FORAWWV.md` changed. One UI staging defect was corrected so locale-dependent probe text can no longer change persisted operation identity.
- No browser/Electron capture is claimed by this source checkpoint.

## Files of record

- `src/ui/map/i18n/index.ts`
- `src/ui/map/i18n/messages.bs.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `src/ui/map/i18n/messages.qps.ts`
- `src/ui/map/i18n/pseudolocalize.ts`
- `tools/i18n/build_pseudolocale.ts`
- `tools/diagnostics/localization_coverage.ts`
- `tools/ui/localization_viewport_contract.ts`
- `tools/ui/live_surface_browser_sweep.cjs`
- `docs/provenance/LOCALIZATION_REVIEW_LEDGER.json`
- `docs/provenance/LOCALE_FORMATTING_INVENTORY.md`
