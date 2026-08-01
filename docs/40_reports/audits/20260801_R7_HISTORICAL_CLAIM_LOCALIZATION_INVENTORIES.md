# R7 Historical-Claim and Localization Inventories

**Date:** 2026-08-01

**Roadmap:** R7 Phase 0 corrected candidate; committee re-review pending

**Disposition:** Diagnostics corrected after blocked review; content remediation remains open

## Result

The first Phase 0 candidate understated historical and localization coverage and overloaded the canon audit with lexical checks. This correction inventories authored historical prose without requiring a keyword hit, derives anchor provenance only from repository content, gives duplicate JSON strings exact field lines, covers expression/default/fallback UI literals, and restores the canon audit to canon-owned invariants. It changes no event, essay, translation, simulation rule, save, package, version, or release state.

| Inventory | Corrected census | Accepted/complete | Open remediation |
|---|---:|---:|---:|
| Historical claims | 3,652 claims / 226 files | 1,315 documented | 1,711 need source notes; 487 need a source tier; 107 need source-floor completion; 29 need actor specificity; 3 direct sensitive-choice rows are blocked |
| Sensitive-history canon gate | 299 events | 298 clean; 0 CRITICAL and 0 WARNING | 1 observational INFO reward-risk row |
| Localization keys | 5,542 EN keys | 5,541 Bosnian translations present through legacy `bcs` | 1 explicit EN fallback; 599 length-risk candidates |
| Localization source scan | 386 UI source files | deterministic candidate census | 607 embedded-English candidates; 8 concatenated-copy candidates; 388 dynamic-key candidates |

The 3 blocked choice rows belong to two genuine direct-choice subjects: `drina_cleansing_decision_1992` and `rs_strategic_goals`. Contextual references such as "hardline camp," civilian authority, treatment of civilians, Dayton refugee return, and future-consequence guard prose are not classified as direct choices. The canon-authorized paramilitary-policy surface is also excluded from this block.

Localization source findings are review candidates, not automatic product defects. Dynamic keys can be safe when finite maps are typed and covered; length risk is a bounded visual-review queue, not proof that 599 layouts overflow.

## Historical-claim contract

Schema 3 inventories every recognized authored JSON prose field in the bounded event/essay surfaces, including trigger-evidence arrays, even when `matched_terms` is empty. Each row carries:

- exact file, line, field path, stable claim id, event/essay subject id, ring, and bounded claim;
- event date/window and serialized live-state predicate when authored;
- source status, tier, exact authored citation text, provenance-only source note, and explicit provenance gaps;
- actor/respondent, semantic player-interaction type, status, and owner.

The corrected scanner no longer uses the first textual occurrence to locate duplicate strings. It maps each parsed JSON path to its exact source token line. Strict mode fails closed when a claim is not documented, a chronology/provenance anchor is blocked, or an event/essay year mismatch exists.

The claim inventory owns prose semantics and provenance. The companion canon-gate audit owns Ring 3 section 3.6 mechanics, cost/reward restrictions, enabling edges, and live-state rupture predicates. This separation removes 57 lexical false positives while retaining fail-closed coverage for calendar-only rupture claims. Production has zero event/essay year mismatches and zero calendar-only rupture claims.

## Neretva / Grabovica / Uzdol chronology and provenance

The September 1993 chronology passes, but both provenance anchors are blocked:

| Anchor | Event file | Window | Chronology | Authored provenance |
|---|---|---|---|---|
| `operation_neretva_93_1993` | `data/scenarios/events/war_1993.json` | turns 74-76 | PASS | BLOCKED |
| `grabovica_uzdol_massacres_1993` | `data/scenarios/events/war_1993.json` | turns 74-76 | PASS | BLOCKED |

The diagnostic now reports only authored repository provenance. The Neretva event has no authored citation, source tier, or source note. The Grabovica/Uzdol event has an ICTY Halilovic citation but no tier or note. Each linked essay has one authored citation, below its category's two-source floor, and no source tier. The earlier hard-coded *Balkan Battlegrounds* provenance string was removed from the diagnostic; no source is inferred from local research or memory.

## Localization contract

The inventory reports canonical Bosnian locale `bs`, formatting locale `bs-BA`, and current legacy alias/dictionary `bcs`. For every English key it records EN/BS text presence, fallback use, lengths, layout-risk disposition, status, source dictionary, and owner. The TypeScript AST scan covers:

- literal player copy in JSX and accessible attributes;
- player-copy literals in parameter defaults, JSX expressions, conditionals, nullish/logical fallbacks, and fallback call arguments;
- concatenated copy fragments;
- non-literal `t(...)` message keys.

Regression coverage pins previously missed examples including `LOADING SCENARIO`, `Own`, `Failed to resolve peace plan.`, and `Recorded event`. CSS-class lists and technical first call arguments are excluded from the new embedded-literal rule. The only missing Bosnian dictionary row remains the existing probe `settings.experimentalFallbackProbe`.

## Action order

1. Historian: close or explicitly omit the 1,711 source-note, 487 source-tier, 107 source-floor, and 29 actor-specificity rows.
2. Historian + Game Designer: resolve the 3 blocked rows in the two direct-choice subjects while preserving the canon-authorized paramilitary-policy surface.
3. Localization: supply the one missing `bs` translation and classify every dynamic-key candidate as finite/typed or replace it.
4. UI/UX + Localization: replace confirmed embedded/concatenated copy and verify the 599 length-risk rows with pseudo-locale plus 1280x720 and 3440x1440 evidence.

No unsupported historical claim is promoted by this report. Phase 0 completion is not claimed until committee re-review accepts the corrected diagnostic contract.

## Determinism and verification

- File-system walks, keys, findings, claims, citations, counters, and anchor rows use explicit stable ordering.
- Reports contain no generated timestamp or absolute path.
- Diagnostics use no randomness or wall clock.
- The combined inventory matrix passes 5 files / 31 tests; the canon-gate matrix passes 2 files / 33 tests.
- TypeScript and `canon:check` pass; final diff hygiene is required immediately before commit.
- `docs/10_canon/FORAWWV.md` was not edited.
