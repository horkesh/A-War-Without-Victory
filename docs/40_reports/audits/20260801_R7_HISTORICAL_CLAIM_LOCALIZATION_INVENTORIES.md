# R7 Historical-Claim and Localization Inventories

**Date:** 2026-08-01

**Roadmap:** R7 Phase 0 corrected candidate; committee re-review pending

**Disposition:** Eighth blocked-review correction implemented; committee re-review required; broader content remediation remains open

## Result

The first Phase 0 candidate understated historical and localization coverage and overloaded the canon audit with lexical checks. The first correction fixed that scope but still accepted invalid source tiers, left genuine Ring-3 choices outside the strict canon gate, made INFO fail the CLI, and counted non-player technical literals. The second correction centralized the tier vocabulary, shared the refused-choice classifier, repaired the two real event rows, and filtered deterministic localization false positives, but its verb grammar remained incomplete and its paramilitary exception bypassed whole events/families. The third correction narrowed that exception and added missing victim-target/documentation forms. The fourth iterated every action but still used token windows. The fifth introduced clause spans but still ran direct-pattern ranges over the whole field, omitted colon/dash boundaries, and omitted common refusal forms. The sixth made spans clause-local but recognized anaphoric continuation only when `proceed|continue` immediately preceded `anyway|regardless`, and it ignored an accountability purpose in that clause. The seventh recognized reordered markers and the first purpose, but an early review sanitized later operative actions and `operation\w*` misread adjectival `operational`. This eighth correction assigns each recognized action its own governed purpose and uses exact operative nouns. It preserves production triggers, narratives, sources, essays, mechanics, save schema, the existing four-artifact baseline refresh, package/version/release state, and `FORAWWV`.

| Inventory | Corrected census | Accepted/complete | Open remediation |
|---|---:|---:|---:|
| Historical claims | 3,652 claims / 226 files | 1,431 documented; 0 direct sensitive-choice blocks | 1,598 need source notes; 487 need a source tier; 107 need source-floor completion; 29 need actor specificity |
| Sensitive-history canon gate | 299 events | 298 clean; 0 CRITICAL and 0 WARNING | 1 observational INFO reward-risk row |
| Localization keys | 5,542 EN keys | 5,541 Bosnian translations present through legacy `bcs` | 1 explicit EN fallback; 599 length-risk candidates |
| Localization source scan | 385 player-surface UI source files | deterministic candidate census | 575 embedded-English candidates; 8 concatenated-copy candidates; 388 dynamic-key candidates |

The former 3 blocked choice rows belonged to `drina_cleansing_decision_1992` and `rs_strategic_goals`; all three production rows remain remediated. The shared semantic classifier evaluates direct-pattern spans only inside their clause, partitions punctuation plus bounded colon and spaced en/em dashes, carries explicit refusal or negation across coordinated verbs inside one clause, and recognizes accountability noun and verb stems before a sensitive object. Later clauses reset that scope and are evaluated independently. After a sensitive warning, a non-negated `proceed|continue` clause containing `anyway|regardless` enumerates every recognized continuation, accountability, `execute`, and `launch` action in order; each action owns the purpose text up to the next action. Any operative action governing an exact attack, assault, campaign, combat, direct-action, offensive, operation, or strike noun blocks the clause even after earlier review/documentation. Accountability-only clauses remain contextual, and exact `operation|operations` nouns do not misclassify adjectival `operational review`. A later explicit direct clause is still evaluated independently. The Gate section-3 exception still requires the exact canonical event id, matching family, bounded option id, and exact shipped policy/deployment label.

Localization source findings are review candidates, not automatic product defects. Dynamic keys can be safe when finite maps are typed and covered; length risk is a bounded visual-review queue, not proof that 599 layouts overflow.

## Historical-claim contract

Schema 4 inventories every recognized authored JSON prose field in the bounded event/essay surfaces, including trigger-evidence arrays, even when `matched_terms` is empty. Each row carries:

- exact file, line, field path, stable claim id, event/essay subject id, ring, and bounded claim;
- event date/window and serialized live-state predicate when authored;
- source status, raw tier, tier-resolution status, exact authored citation text, provenance-only source note, and explicit provenance gaps;
- actor/respondent, semantic player-interaction type, status, and owner.

The corrected scanner no longer uses the first textual occurrence to locate duplicate strings. It maps each parsed JSON path to its exact source token line. Strict mode fails closed when a claim is not documented, a chronology/provenance anchor is blocked, or an event/essay year mismatch exists.

The claim inventory owns full prose provenance and interaction routing. The companion canon-gate audit owns direct refused-choice enforcement, Ring 3 section 3.6 mechanics, cost/reward restrictions, enabling edges, and live-state rupture predicates. Both use the same bounded semantic classifier and exact option-level paramilitary contract; neither recursively treats contextual historical prose as a player choice. Production has zero event/essay year mismatches, zero calendar-only rupture claims, and zero direct refused-choice violations.

The loader and inventory now consume `src/sim/events/source_tiers.json` as the shared runtime vocabulary. `tribunal` and any other unknown value are `invalid`; `pending` is recognized by the loader but unresolved for documentation; only the five resolved tiers can produce `documented` claim status.

## Sensitive-choice remediation

- `rs_strategic_goals`: turns 1-3, the Six Strategic Goals narrative, General Mladić warning, branch/flag compatibility, and ICTY/ICJ source record remain. The former `aggressive.description` instruction to proceed after the genocide warning now states that the Assembly decision is historical record and gives the player only centralized-command/reporting control in English and BCS. Its response-level `humanitarian_impact` effect and matching material-effect reference were removed; historical atrocities remain consequence/record surfaces.
- `drina_cleansing_decision_1992`: turns 8-30, the live-state trigger, field-report narrative, event id, response ids, recipient ownership, and ICTY/BB source record remain. Player labels now choose formal command-accountability proceedings or immediate civilian-protection restraints. Response-level `humanitarian_impact` effects and the `drina_cleansing_intensity` control flag were removed; the replacement write-only flag records command-accountability posture. The separate non-player `drina_valley_ethnic_cleansing_1992` event retains the historical narrative and humanitarian consequence.
- Canon mapping: Sensitive History Design Gate Ring 3 #1/#2 and section 3 make atrocity a consequence rather than a lever and reserve direct war-crime authorization to the exact three-value paramilitary-policy surface. The exception is six shipped option labels, not a container whitelist. No new historical assertion was introduced; BB1 p.187 remains the local operational chronology reference for the contested Drina theater.

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

Regression coverage pins previously missed examples including `LOADING SCENARIO`, `Own`, `Failed to resolve peace plan.`, and `Recorded event`. CSS-class lists, raw glyph entities, the debug-only load/save script, assertion labels, technical API placeholders, and technical IPC fallbacks are excluded deterministically. This removes 32 known false-positive rows without losing the four pinned player literals. The only missing Bosnian dictionary row remains the existing probe `settings.experimentalFallbackProbe`.

## Action order

1. Historian: close or explicitly omit the 1,598 source-note, 487 source-tier, 107 source-floor, and 29 actor-specificity rows.
2. Localization: supply the one missing `bs` translation and classify every dynamic-key candidate as finite/typed or replace it.
3. UI/UX + Localization: replace confirmed embedded/concatenated copy and verify the 599 length-risk rows with pseudo-locale plus 1280x720 and 3440x1440 evidence.

No unsupported historical claim is promoted by this report. Phase 0 completion is not claimed until committee re-review accepts the corrected diagnostic contract.

## Determinism and verification

- File-system walks, keys, findings, claims, citations, counters, and anchor rows use explicit stable ordering.
- Reports contain no generated timestamp or absolute path.
- Diagnostics use no randomness or wall clock.
- Earlier RED reproduced all four second-review failures, the third-review option-level defects, the fourth-review first-action defect, the fifth-review token-window defects, and the sixth-review clause-ownership defects. Seventh-review RED reproduced two accountability false positives, two reordered operative false negatives, and both consumer guards: 6 failures in the 3-file / 101-test matrix; reordered safe/unsafe controls and a later direct clause already behaved correctly. Purpose-precedence review then pinned operative-before-review versus review-before-operative ordering with 3 expected failures in the 3-file / 103-test matrix. Final direct-action vocabulary review pinned a mixed direct-action-before-review clause with another 3 expected helper/consumer failures in the 3-file / 104-test matrix.
- Eighth-review RED pinned the exact operational-review control, three required review-then-operative forms, marker/action permutations, and multiple-action clauses at the helper and both consumers. The 3-file / 113-test matrix failed 9 assertions: 1 helper false positive, 6 helper false negatives, and both consumer contracts.
- The eighth-review focused matrix passes 4 files / 122 tests.
- The expanded inventory/provenance matrix passes 7 files / 103 tests; the canon matrix passes 2 files / 34 tests; the foundational/adjacent event matrix passes 5 files / 110 tests with 5 pre-existing skips.
- The actual `--strict --violations-only --json` CLI exits 0 with 0 CRITICAL, 0 WARNING, and 1 INFO.
- The intentional `apr1992_52w` baseline refresh changes only `end_report.md`, `final_save.json`, `run_summary.json`, and `weekly_report.jsonl` hashes; activity, control, formation, watched-operation, and every other scenario hash remain unchanged.
- TypeScript, standalone no-refresh baseline regression, `canon:check`, and final diff hygiene pass.
- `docs/10_canon/FORAWWV.md` was not edited.
