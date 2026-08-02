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
- `formatLocalizedNumber()` resolves Bosnian through `bs-BA` and `en|qps` through `en-US`. Six named high-traffic surfaces use it; [the formatting inventory](../../provenance/LOCALE_FORMATTING_INVENTORY.md) records 46 host-default residual calls in 26 other files rather than claiming global completion. Calendar labels use the explicit locale month table and UTC arithmetic.
- Main menu, settings, map consumers, warroom helpers, formation names, Codex, ghost entries, consequence receipts, letter-home prose, and localized number/date helpers consume canonical `bs`.
- The single known Bosnian fallback probe is translated. Probe operation payload identity is canonical (`<operation> (Probe)`) in every locale; localized `probeName` copy is presentation-only and never enters staged state or commander assignment identity.
- Browser entrypoints accept `?locale=bs`; QA entrypoints accept `?locale=qps`. The live-surface harness now uses semantic test IDs for all shell navigation, pause/tutorial recovery, Army HQ drilldown, and turn-zero provenance rather than English labels. An executable component journey covers the menu, war splash, faction briefing, opening Desk route, and historical-default decision under EN, BS, and QPS. The legacy `?locale=bcs` boundary remains compatibility-only.

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

- Independent-review RED: **9 failures / 64 tests** across the 7-file repair matrix, matching the missing contracts and stale assertions. A follow-up display-only challenge then failed **1/1 targeted assertion** because canonical `(Probe)` still rendered verbatim in Bosnian; the shared player-safe projector now localizes that suffix without changing staged bytes. A final harness-wide challenge caught the remaining English-text navigation outside the foundational route; the repaired contract now rejects every awaited text-navigation helper and requires semantic turn-zero filed-record state.
- Corrected Phase 3 changed/dependent localization and determinism matrix: **27 files / 274 tests passed**.
- Lightweight player-journey matrix: **44 files / 771 tests passed**.
- `npm.cmd run typecheck`: passed.
- Localization diagnostic CLI: exited 0 and reproduced the exact census above.
- Pseudo-locale builder CLI: exited 0; the full-corpus test covers all 5,556 keys and the exact 2,234-message eligible distribution.
- `node --check tools/ui/live_surface_browser_sweep.cjs`: passed.
- Semantic route/component proof: **4 files / 50 tests passed**, including all three EN/BS/QPS journeys and the Desk consequence state attribute.
- JSON review-ledger parsing and final diff hygiene are part of the commit gate.

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
