# Addendum — narrowed foundational-option proof finding

This addendum corrects finding 2 in `TARGETED_CORRECTION_VERIFICATION.md`. The original review overlooked the new production-adapter matrix in `tests/browser_campaign_start_fallback.test.ts:231-311`. That matrix does exercise every authored foundational option through both `resolveBrowserEventDecision` and `resolveDesktopEventDecision`, compares a substantial complete opening projection, proves serialize/load parity, advances both states, and verifies authored flags plus dimension-modifier persistence, including cross-faction shifts. Those properties are established by the retained 92/92 focused receipt and must not be retested unchanged.

**Corrected verdict remains NO-GO with two narrow correction items:** the legacy identity adapter regression already reported, and the following remaining source-truth/display proof.

## Corrected finding 2

The adapter matrix proves parity and persistence for the projected fields, but it does not prove every authored non-dimension effect or its clock against the event definition:

- `openingProjection` at `tests/browser_campaign_start_fallback.test.ts:233-248` omits formation morale, `meta.war_alliance_rbih_hrhb`, aggression modifiers, and equipment-quality modifiers. Those are the actual targets of the foundational options' `morale_change`, `alliance_change`, `aggression_modifier`, and `equipment_quality_modifier` effects.
- The post-Advance assertions at `:297-306` check authored flags and dimension modifiers only. They do not assert the morale/alliance deltas, the RS aggression modifier values and 52/26-turn clocks, or the HRHB equipment-quality multiplier and 52-turn clock before and after Advance.
- Adapter equality of notifications, firing maps, and decision logs at `:277` proves both adapters agree, but no assertion binds their exact receipt turn/faction, notification target/content, or firing count/last-fired/readiness values to the authored event and opening turn. `tests/player_start_surface_contracts.test.ts:139-149` binds response ID/source and dimension deltas, but not those remaining authored values.
- The real foundational modal loop at `tests/player_start_surface_contracts.test.ts:67-88` asserts titles, option labels, and absence of forbidden future-knowledge strings. It does not assert the display-safe immediate-effect and dimension rows for each option. The real policy modal fixture at `:91-121` similarly asserts source, labels, descriptions, markers, accessibility, and no implicit response, but not every displayed consequence row.

The smallest correction is to extend the existing adapter matrix, not create another matrix: for each catalog option, assert each authored effect against its actual state target and exact duration/expiry before and after the already-present first Advance; assert the exact opening receipt/notification/firing clocks from the catalog; and extend the existing real modal loop to assert every display-safe effect and dimension row. No duplicate browser/Electron parity or extra Advance coverage is needed.

The first blocker remains unchanged: `resolvePlayerEventDecisionWithOpeningPolicy` applies the turn-0 transition guard to every `rbih_state_identity`, while both production adapters always use that wrapper. The correction must preserve the exact opening tuple, allow a coherent catalog turn-2–5 legacy identity through ordinary resolver semantics (including optional absent headless metadata), queue no early policy in that lane, and reject mixed tuples without mutation.

No source or test was edited and no command was rerun for this addendum. Retained 32/32 policy, 92/92 focused, and TypeScript exit 0 evidence remains valid for the currently hashed candidate. A final targeted run is needed only after the two bounded corrections.
