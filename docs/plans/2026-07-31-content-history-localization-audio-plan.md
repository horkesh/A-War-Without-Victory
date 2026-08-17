# Content, Historical Attribution, Audio, and Accessibility Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Finish the sensitive-event, officer/OOB attribution, English accessibility/readability, and soundscape lanes with explicit evidence/licensing rules and no unresolved 1.0 content gate.

**Architecture:** Build four machine-auditable inventories: historical claims, named identities, localizable strings, and audio assets. Unsupported claims/identities are omitted rather than guessed; sensitive events are informational consequences rather than choices; the completed localization inventory is retained as the post-1.0 baseline; audio uses first-party or CC0/approved CC BY assets with a checksum and attribution manifest.

**Tech stack:** JSON data, TypeScript/React i18n, Vitest, Electron visual/audio proof, Balkan Battlegrounds KB, IRMCT/UN sources, Web Audio/OGG assets.

**Date:** 2026-07-31
**Status:** ACTIVE CURRENT LANE -- Phase 1.1 sensitive-history closeout complete; execute pre-1.0 Phases 1.2, 2, 4, and 5; Phase 3 localization deferred post-1.0 by owner decision 2026-08-15
**Roadmap workstream:** R7
**Canonical owner:** authored JSON plus source/license manifests; `src/ui/map/i18n/` for locale; `src/ui/map/audio/` for playback
**Collision rule:** Do not edit the same event/essay as R4. Do not edit map/Desk layout until R1/R2 finish.
**Activation:** Begin only after the owner says `Execute the master roadmap` or explicitly names this plan.

---

## 1. Resolved decisions

1. Sensitive history follows the canonical three-ring model. New Ring-2 material is informational/narrative and state-aware; Ring-3 refused mechanics remain refused.
2. The stale symmetric `ethnic cleansing on both sides` sentence is removed unless a precise side-specific tribunal/primary citation supports each claim. No generic balancing sentence is permitted.
3. Grabovica/Uzdol and Operation Neretva content is dated September 1993. It must distinguish findings about crimes from findings about individual command responsibility.
4. Named officers/formations require an exact identity plus source. Uncertain or conflicting matches remain absent with an audit row; no approximate identity is promoted into game data.
5. **Post-1.0:** the canonical Bosnian locale remains BCP 47 `bs` with regional formatting `bs-BA`. Persisted `bcs` preferences remain a legacy alias and migrate without breaking old saves/settings.
6. **Post-1.0:** automated translation may create a draft, never the production-quality claim. Pseudolocalization catches layout defects; a native-language pass catches linguistic defects. English is the sole required 1.0 language; existing Bosnian content must not be represented as production-complete before native review.
7. Audio sourcing order is first-party/generated UI cues, then CC0 ambience, then carefully attributed CC BY only when irreplaceable. CC BY-NC, anthem/folk melodies, speeches, screams, gunfire spectacle, and sensational atrocity audio are excluded.
8. `FORAWWV.md` is not an execution dependency and is not edited by this lane. Accepted product decisions live in the master roadmap and implementation reports.

## 2. Research basis

### History

- Local BB evidence: `data/derived/knowledge_base/balkan_battlegrounds/pages/BB2_p0453.json` and `BB2_p0454.json` place the Uzdol fighting on 14 September 1993.
- Official ICTY summary: <https://r.irmct.org/en/press/judgement-case-prosecutor-v-sefer-halilovic> records the Grabovica/Uzdol crime findings and Halilovic's acquittal.
- Official Sarajevo archive: <https://www.irmct.org/en/mip/features/sarajevo>.
- Official Srebrenica sources: ICTY Krstic appeal summary <https://aomenduchangnvrenshuqian.irmct.org/en/press/appeals-chamber-judgement-case-prosecutor-v-radislav-krstic> and UN A/54/549 <https://documents.un.org/api/symbol/access?l=en&s=A%2F54%2F549&t=pdf>.

### Localization

- W3C language tags use BCP 47: <https://www.w3.org/International/articles/language-tags/Overview.en>.
- Unicode CLDR identifies Bosnian as `bs` / `bs-BA`: <https://unicode.org/cldr/charts/49/summary/bs.html>.
- Microsoft recommends pseudolocalization for truncation, concatenation, missing-resource, and expansion defects, while stating it does not replace real-language validation: <https://learn.microsoft.com/en-us/globalization/methodology/pseudolocalization>.
- W3C recommends current WCAG 2.2 for testable accessibility criteria: <https://www.w3.org/WAI/standards-guidelines/wcag/>.

### Audio/licensing

- CC0 permits reuse without conditions, while attribution remains a good provenance practice: <https://creativecommons.org/public-domain/>.
- Creative Commons recommends TASL attribution (Title, Author, Source, License): <https://creativecommons.org/reusing-cc-licensed-content/>.
- Freesound supports CC0/CC BY/CC BY-NC; this plan accepts only CC0 or specifically approved CC BY: <https://freesound.org/help/faq/>.

## 3. Purpose and non-goals

### In scope

- finite sensitive-history claim/source cleanup and retained Ring-2 backlog;
- officer/OOB exact-identity and provenance completion;
- English string correctness, accessibility, readability, and packaged-offline presentation proof;
- real UI cues and restrained ambient beds with manifest/checksum/license proof;
- packaged-offline verification for English/audio surfaces.

### Non-goals

- no atrocity mechanic, camp subsystem, body-count optimization, faction atrocity ranking, or prevent-genocide reward;
- no uncertain officer identity, invented quotation, or unverified event date;
- no machine-only production translation claim;
- no unfinished multilingual locale migration, pseudolocalization, translation completion, native LQA, or locale-specific visual proof in the 1.0 gate; Phase 3 is post-1.0;
- no remote font/audio runtime dependency, unlicensed media, anthem/folk tune, or graphic/sensational sound;
- no package/version/tag/release or `FORAWWV.md` edit.

## 4. External-agent execution contract

```powershell
git status --short --branch
Get-Content -Raw .claude/napkin.md
Get-Content -Raw docs/life_lessons.md
Get-Content -Raw docs/plans/MASTER_ROADMAP.md
Get-Content -Raw docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md
Get-Content -Raw docs/audio/AMBIENT_BED_ASSET_MANIFEST.md
rg -n "source_notes|responding_faction|requires_player_response" data/scenarios/events data/scenarios/essays
rg -n "Locale|messages.bcs|useLocale|audioAssets|sound_manifest" src/ui/map tests/ui
```

Rules:

- Source notes contain provenance, not copied source prose.
- Historical factual claims cite BB volume/page or an official primary/tribunal/UN source.
- Asset downloads are copied into the repo only after license page, source URL, author, original filename, SHA-256, and allowed-use review are recorded.
- Do not modify a binary without retaining its source/license lineage.
- Work one phase per logical commit; `/simplify` and independent review precede verification.

## 5. Phase sequence

## Phase 0 -- Four deterministic inventories

**Assigned role:** Documentation Specialist + Historian + UI/UX Developer
**Independent review:** Process QA

### Task 0.1 -- Historical claim inventory

**Files:**

- Modify `tools/diagnostics/codex_sensitive_claim_inventory.cjs`
- Modify `tools/diagnostics/sensitive_history_canon_gate_audit.ts`
- Modify `tests/codex_sensitive_claim_inventory.test.ts`
- Modify `tests/codex_sensitive_history_source_notes.test.ts`

- [x] Emit event/essay id, ring, claim, event date/window, state predicate, source tier, citation, respondent, and player interaction type.
- [x] Fail semantically on direct sensitive player choices; route missing provenance and generic symmetry through the claim inventory; keep calendar-only rupture claims in the canon audit; fail event/essay date mismatches.
- [x] Check Grabovica/Uzdol/Neretva chronology and authored provenance separately, without hard-coded source substitution.

### Task 0.2 -- Identity, locale, and audio inventories

**Files:**

- Create `tools/diagnostics/officer_oob_provenance.ts`
- Create `tools/diagnostics/localization_coverage.ts`
- Create `tools/diagnostics/audio_asset_provenance.ts`
- Create `tests/officer_oob_provenance.test.ts`
- Create `tests/localization_coverage.test.ts`
- Create `tests/audio_asset_provenance.test.ts`

- [x] Identity report: id, display name, faction, formation/corps ref, source, confidence, duplicate/conflict.
- [x] Locale report: every player-facing key, `en`/`bs` coverage, fallback use, concatenation, embedded English, and layout-risk length.
- [x] Audio report: cue id, file, SHA-256, duration, loudness, source URL, author, license, attribution, and sensitive-content class.
- [x] Stable ordering; no timestamps/absolute paths for all four implemented inventory families.

### Phase 0 partial execution evidence -- 2026-08-01

- [Officer/OOB and audio inventory report](../40_reports/audits/20260801_R7_OFFICER_AUDIO_PROVENANCE_INVENTORY.md).
- Officer/OOB: 374/374 rows keyed, 0 supported, 2,286 blocking findings, 12 normalized-name collisions. Positive support must be owned per row and cannot be inherited from manifest defaults.
- Audio: 36/36 cues keyed, 17 provided, 19 placeholders, 0 unregistered binaries, 54 blocking findings, 5 warnings, and three required ambient beds absent. Registry/bundle resolution and recursive binary ownership are fail-closed; `OggS` remains a container-signature precheck rather than decode/LUFS proof.
- Verification: focused 5 files / 22 tests; parent integration 2 files / 11 tests; TypeScript, canon/determinism/baseline, EOL, and diff checks green.
- All four Phase 0 inventories are accepted. The historical/localization contract survived fourteen bounded review corrections and an integrated R4/R7 repair: sensitive-warning continuations are structural and fail closed; exact paramilitary exceptions remain option-bounded; seven safe R4 essays now carry reviewed source tiers; and neutral operational `both sides` prose no longer triggers a moral-symmetry false positive. The production Ring-3 choices remain remediated. Historical, identity, licensing, and audio remediation remains open in pre-1.0 Phases 1, 2, and 4; localization remediation is retained for post-1.0 Phase 3.

### Phase 0 accepted evidence -- historical claims and retained localization inventory

- [Historical-claim and localization inventory report](../40_reports/audits/20260801_R7_HISTORICAL_CLAIM_LOCALIZATION_INVENTORIES.md).
- Historical claims: schema 4 records 3,651 prose rows across 227 files; 1,466 documented, 1,574 need source notes, 489 need source tiers, 108 need source-floor completion, 14 need actor specificity, and zero direct sensitive-choice rows remain blocked. Unknown tiers are invalid and recognized `pending` tiers remain unresolved. Zero event/essay year mismatches; zero calendar-only rupture claims.
- Required chronology: Operation Neretva 93 and Grabovica/Uzdol event/essay anchors are in 1993 files at turns 74-76. Authored provenance is independently BLOCKED for both; the diagnostic supplies no hard-coded source.
- Sensitive-history canon gate: 299 events, 0 CRITICAL, 0 WARNING, and 1 observational INFO. Both audits share the deterministic clause-local classifier, explicit refusal/boundary grammar, fail-closed exact-purpose anaphoric-warning guard, and exact option-level six-label paramilitary contract. The actual strict CLI treats INFO as nonblocking.
- Sensitive-choice content: `rs_strategic_goals` retains the historical Assembly record but replaces the direct refused-act instruction with strategic/command framing; `drina_cleansing_decision_1992` now offers accountability/restraint policy, has no response-level humanitarian effect, and no longer writes a cleansing-intensity control flag. Historical consequence rows remain intact.
- Localization: 5,542 EN keys, 5,541 legacy-`bcs` translations mapped to canonical `bs`, one explicit fallback probe, 599 length-risk candidates, and 971 source-review findings across 385 player-surface UI files after 32 deterministic technical/glyph false positives were removed.
- Status: accepted diagnostic contract; Phase 1 remediation active. Independent committee review passes. On the integrated parent, the combined R7/R4 dependent matrix passes 23 files / 659 tests, TypeScript passes, and the actual strict CLI exits 0 with 0 CRITICAL / 0 WARNING / 1 INFO. The fresh integrated baseline/canon rerun remains serialized behind R5's exclusive real-save lane.

```powershell
npm.cmd run test:vitest -- tests/sensitive_history_semantics.test.ts tests/codex_sensitive_claim_inventory.test.ts tests/codex_sensitive_history_source_notes.test.ts tests/officer_oob_provenance.test.ts tests/localization_coverage.test.ts tests/audio_asset_provenance.test.ts tests/sensitive_history_player_choice_content.test.ts --pool=forks --reporter=dot
npm.cmd run test:vitest -- tests/sensitive_history_canon_gate_audit.test.ts tests/sensitive_history_canon_gate_audit_strict_gate.test.ts --pool=forks --reporter=dot
npm.cmd run test:vitest -- tests/rs_six_strategic_goals_foundational.test.ts tests/integration_event_system.test.ts tests/sim/events/event_acceptance_report.test.ts tests/sim/events/event_taxonomy_report.test.ts tests/event_loader_runtime_substrate.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run typecheck
```

`/simplify` -> review -> commit `test(content): inventory claims identities locale and audio`

## Phase 1 -- Sensitive-history content closeout

**Assigned role:** Historian + Documentation Specialist
**Independent review:** Canon Compliance Reviewer + Game Designer

### Task 1.1 -- Repair highest-risk existing content

**Files:**

- Modify `data/scenarios/essays/croat_bosniak_war_begins_1993.json`
- Modify `data/scenarios/essays/grabovica_uzdol_massacres_1993.json`
- Modify `data/scenarios/essays/operation_neretva_93_1993.json`
- Modify `data/scenarios/essays/essay_index.json`
- Modify any paired event in `data/scenarios/events/war_1993.json`
- Modify `tests/codex_sensitive_claim_inventory.test.ts`
- Modify `tests/codex_sensitive_history_source_notes.test.ts`
- Create `tests/r7_sensitive_history_phase1_content.test.ts`

- [x] Remove unsupported generic symmetry.
- [x] State side-specific findings with exact sources and neutral prosecutorial language.
- [x] Keep Grabovica/Uzdol in September 1993 and distinguish crime findings from command-liability outcome.
- [x] Keep atrocity informational; no decision response or reward.

**Phase 1.1 execution evidence -- 2026-08-02:**

- Both September anchors retain turns 74-76 and now pass chronology and authored-provenance checks. The event and essay rows cite repository-local *Balkan Battlegrounds* Vol. II, pp. 434-435 and the ICTY Halilovic Trial/Appeal record; all three essay pairs carry a resolved `icty_icj_un` tier and provenance-only source note.
- The Grabovica/Uzdol record names ARBiH personnel for the crimes, states the exact dates and bounded victim findings, and distinguishes those findings from the failure to prove Sefer Halilovic's superior authority/effective control. The Appeal Chamber's affirmed acquittal is an individual-liability outcome, not a reversal of the crime findings.
- Unsupported Neretva claims were omitted: coastal-corridor objective, campaign superlative, decisive escalation, broad force/composition advantage, diplomatic causation, collective-guilt framing, and generic symmetry. The retained account is limited to sourced dates, places, movements, and bounded outcomes.
- Authored content improved the inventory from 1,466 to 1,483 documented claims. Remaining Phase 1.2 queues are 1,563 source notes, 489 tiers, 104 source-floor rows, and 12 actor-specificity rows.
- Runtime `essay_index.json` mirrors the leaf sources, tiers, source notes, and English content. Existing turn windows, runtime effects, and save schema are unchanged; the atrocity event has no response or beneficial reward.
- Verification passes the 16-file fast matrix with 247 tests passed and 5 intentional skips, the separate 2-test source-quality suite, TypeScript, targeted JSON parsing, and diff hygiene. The actual strict canon CLI exits 0 with 0 CRITICAL, 0 WARNING, and 1 observational INFO.
- This checkpoint intentionally excludes scenario/baseline/performance/Electron/package/FORAWWV/release work; integrated baseline/canon execution remains serialized outside this phase.

### Task 1.2 -- Finish retained Ring-2 informational backlog

**Files selected by Phase 0:**

- Specific JSON under `data/scenarios/events/`
- Specific JSON under `data/scenarios/essays/`
- `tests/2026...` focused files or existing event/essay suites

- [x] Reclassify nonsensitive deposit essays out of the sensitive queue.
- [x] Author only inventory rows with adequate sources and a concrete player-facing purpose.
- [x] Use current-state predicates for divergent outcomes.
- [x] If a claim lacks evidence, omit it and close the row as `unsupported/omitted`; do not pause the entire phase.

**Phase 1.2 checkpoint A -- 2026-08-15:**

- The inventory now distinguishes the six known unindexed Wave-4 authoring deposits from player-facing Codex essays. Their 12 prose claims remain auditable as `essay_deposit` / `non_runtime_deposit`, but carry no release stop gate and no longer inflate the sensitive-history remediation queue.
- All 491 claims whose citations and provenance notes were already complete but whose source tier was missing now carry a resolved tier. Explicit fictional command abstractions use `design_counterfactual`; formal instruments, BB-grounded operational accounts, adjudicated history, and corroborated participant accounts retain distinct tier identities.
- Seven source-floor essay families were completed and mirrored into the runtime index: London Conference, Vance-Owen, the RS Assembly rejection, Contact Group, Sarajevo NATO ultimatum, October 1995 ceasefire, and Dayton talks. Exact BB pages are used where BB is the corroborating source (`BB1 p. 22`; `BB2 pp. 28-31`); other rows use named UN/NATO/ICTY instruments or Holbrooke's bounded participant account.
- Live census: 3,654 claims / 228 files; 2,016 documented, 12 non-player-facing deposits, 1,553 source-note rows, 62 source-floor rows, 11 actor-specificity rows, and zero source-tier rows. Phase 1.2 remains active.
- Focused verification passes 5 files / 65 tests and TypeScript. `canon:check` passed its static determinism scan and embedded no-refresh baseline regression; a redundant explicit second baseline invocation was interrupted after that successful embedded run.

```powershell
npm.cmd run test:vitest -- tests/codex_sensitive_claim_inventory.test.ts tests/codex_sensitive_history_source_notes.test.ts tests/event_timing.test.ts tests/event_timeline_integrity.test.ts tests/essay_index_integrity.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
```

**Phase 1.2 checkpoint B -- 2026-08-15:**

- The remaining two-source essay floor is closed: 62 deficient claims across 20 live essay families and their index-only dynamic sections moved to complete authored provenance. Every standalone essay fix is mirrored in `essay_index.json`.
- Corroboration is claim-bounded. Operational rows use exact printed pages from *Balkan Battlegrounds*; legal and atrocity rows keep adjudicated findings separate from military context; diplomatic rows distinguish agreements from participant accounts. Trusina uses two distinct Court of Bosnia and Herzegovina proceedings rather than a generic timeline citation.
- Live census: 3,654 claims / 228 files; 2,078 documented, 12 non-player-facing deposits, 1,553 source-note rows, zero source-floor rows, 11 actor-specificity rows, and zero source-tier rows. Phase 1.2 continues with the source-note and actor-specificity queues.
- A regression now fails if any player-facing essay falls below the two-source floor. The broader Phase 1.2 matrix passes 5 files / 69 tests; TypeScript, diff hygiene, and `canon:check` (static scan plus embedded no-refresh baseline regression) pass.

**Phase 1.2 checkpoint C -- 2026-08-15:**

- The bounded actor-specificity queue is closed. Eleven live essay claims that used generic `both sides` / `all sides` wording now name the relevant parties (Bosnian government, Bosnian Serb leadership, VRS, ARBiH, and/or HVO) while retaining the established chronology and attribution boundaries. The spatial phrase `surrounded on all sides` was rewritten without changing its meaning so it no longer collides with the symmetry diagnostic.
- Every changed leaf essay is mirrored in `essay_index.json`; index-integrity and source-note contracts pass. A production regression now fails if any player-facing history claim enters `needs_actor_specificity`.
- Live census: 3,654 claims / 228 files; 2,081 documented, 12 non-player-facing deposits, 1,561 source-note rows, and zero source-floor, actor-specificity, or source-tier rows. Phase 1.2 continues on the sole remaining provenance class: source notes.

**Phase 1.2 checkpoint D -- 2026-08-15:**

- The summer-1992 Herceg-Bosna posture packet is machine-citable. Three decisions already carrying exact claim-bounded source notes and resolved tiers now expose the corresponding `historical_source` field; no narrative, choice, effect, or timing changed.
- The 63 claims owned by consolidation, local alliance-friction, and Zagreb supply-channel decisions move from `needs_source_note` to `documented`. The citations are limited to the exact *Balkan Battlegrounds* pages and ICTY Prlić sections already named in their authored notes.
- Live census: 3,654 claims / 228 files; 2,144 documented, 12 non-player-facing deposits, 1,498 source-note rows, and zero source-floor, actor-specificity, or source-tier rows.

**Phase 1.2 closeout -- 2026-08-15:**

- The retained provenance queue is closed: 3,642 claims are documented and the 12 known unindexed deposits remain explicitly `not_player_facing`; there are zero unresolved player-facing claims across all 3,654 inventoried rows.
- All 549 conditional consequence claims are classified `design_counterfactual`. Every runtime essay and dynamic section carries complete provenance, and paired event rows inherit missing metadata without overwriting stronger authored evidence.
- Every player-facing historical event claim is documented. The unsupported Operation Circle unit/settlement detail was narrowed to the sourced Gorazde-pocket claim; the unsupported post-Storm caliber/depot/transfusion story was replaced by BB1 pp.417-419's bounded 5th Corps Sana evidence.
- Text-file provenance is now machine-readable: TypeScript/TSX accepts bounded leading `// historical_source|source_tier|source_note` headers and Markdown accepts the same keys in leading frontmatter. Header lines are excluded from claim scanning. The remaining 16 ghost-entry and 50 source read-model claims now carry explicit historical or design-counterfactual boundaries.
- Regression coverage requires every consequence row, runtime essay/dynamic section, paired event, historical event, and global player-facing claim to stay documented. Focused RED/GREEN and the essay-integrity matrix pass; full workstream verification is recorded in the ledger closeout entry.

`/simplify` -> historian/canon review -> commit `fix(content): close sensitive history claims`

## Phase 2 -- Officer/OOB attribution closeout

**Assigned role:** Formation Expert + Historian
**Independent review:** QA Engineer

**Files:**

- Modify `data/scenarios/officers/apr1992_officers.json`
- Modify `data/source/oob_corps.json`
- Modify `data/source/oob_brigades.json` only for exact sourced corrections
- Modify `src/sim/oob_lookup.ts`
- Modify `tests/canon_officer_corps_refs.test.ts`
- Modify `tests/officer_oob_provenance.test.ts`
- Create `tests/officer_state_persistence.test.ts`
- Create `tests/officer_bio_read_model.test.ts`

- [x] Resolve exact duplicate IDs and dead corps refs.
- [x] Require explicit source/citation for new named rows.
- [x] Preserve uncertain/conflicting candidates only in the audit output, not playable data.
- [x] Ensure officer bios and faction/corps assignments survive startup/save/round-trip.
- [x] Do not derive historical identity from name similarity alone.

```powershell
npm.cmd run test:vitest -- tests/canon_officer_corps_refs.test.ts tests/officer_oob_provenance.test.ts tests/officer_state_persistence.test.ts tests/officer_bio_read_model.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
```

`/simplify` -> historian/QA review -> commit `fix(oob): close officer provenance`

**Phase 2 closeout -- 2026-08-15:**

- The playable census is 334 exact supported identities: 68 officers, 19 corps, 244 brigades, and 3 named elite-command links. Forty unsupported, conflicting, or duplicate candidates remain explicit research-only audit rows and are absent from playable data. The diagnostic reports zero unsupported playable rows and zero blocking violations.
- Four exact brigade alias families now have one immutable playable ID apiece. The unsupported `Hrvoje Vukčić Hrvatinić` Odžak assignment is omitted because the accepted evidence instead identifies a Jajce formation/remnant and a later same-name Prozor-Rama regiment. All live operation, localization, diagnostic, and regression references use retained IDs.
- Two exact official-source officer mappings, Slavko Lisica and Midhat Hujdur, are retained. Unsupported officer identities and five unsupported elite-commander attributions were removed; two unsupported court dispositions were removed rather than inferred.
- The OOB lookup now exposes exact immutable-ID resolution and rejects duplicate IDs. Startup, canonical serialization, hydration, and the UI read model preserve the retained officer roster, assignment fields, and biographies without name-similarity promotion.
- Opening Posavina availability now reflects the documented April-May 1992 Brod-Derventa-Modriča force. The regenerated startup artifact keeps the Bosnian Posavina edge under Northwest Bosnia command and passes sector-truth validation.
- Focused verification passes 8 files / 84 tests; adjacent stale-reference coverage passes 2 files / 55 tests; TypeScript passes. The simplification pass retained the explicit implementation, and independent QA/determinism review is recorded in the project ledger.

## Phase 3 -- DEFERRED POST-1.0 -- Bosnian locale contract and localizability

**Scope boundary (owner decision 2026-08-15):** Tasks 3.1-3.3 remain the executable localization packet but do not gate R7 completion, R8, R9, or 1.0. Do not revert already-landed translations or compatibility. English remains the sole required 1.0 language, and existing Bosnian support must not be advertised as production-complete until this phase and native review are complete.

**Assigned role:** UI/UX Developer + Documentation Specialist
**Independent review:** QA Engineer; external native Bosnian language review remains an evidence input when available

### Task 3.1 -- Canonicalize locale identity with compatibility

**Files:**

- Modify `src/ui/map/i18n/index.ts`
- Rename/create `src/ui/map/i18n/messages.bs.ts` while retaining a legacy import/alias as needed
- Modify `src/ui/map/components/SettingsScreen.tsx`
- Modify locale preference persistence found by `rg -n "bcs" src/ui/map`
- Modify `tests/ui_i18n.test.ts`
- Modify `tests/ui/settings_screen_i18n.test.ts`

- [ ] Make `bs` the canonical UI locale and `bs-BA` the `Intl` formatting locale.
- [ ] Migrate stored `bcs` to `bs`; accept `bcs` only as a read compatibility alias.
- [ ] Display `Bosanski`, not an ambiguous production claim for all B/C/S variants.
- [ ] Keep English fallback explicit and report every use.

### Task 3.2 -- Add deterministic pseudolocalization

**Files:**

- Create `src/ui/map/i18n/messages.qps.ts`
- Create `tools/i18n/build_pseudolocale.ts`
- Create `tests/ui_pseudolocalization.test.ts`
- Extend browser/player journey harness locale selection

- [ ] Expand text by approximately 40%, add delimiters, preserve tokens/markup, and remain deterministic.
- [ ] Fail on concatenated player sentences, missing keys, clipped essential text, and font glyph gaps.
- [ ] Capture 1920x1080, 1366x768, and 3440x1440 sheets for the Desk, Decision Room, Army HQ, map, Records, Codex, Chronicle, and endgame.

### Task 3.3 -- Complete Bosnian strings and review disposition

- [ ] Translate the inventory in context; preserve military/historical terminology consistently.
- [ ] Run one linguistic pass and one in-product pass.
- [ ] Record reviewer, date, key, issue class, and resolution outside runtime state.
- [ ] If native review is unavailable by release, label the locale `Bosanski (Preview)` and retain English as default; do not claim production LQA.

```powershell
npm.cmd run test:vitest -- tests/ui_i18n.test.ts tests/localization_coverage.test.ts tests/ui_pseudolocalization.test.ts tests/ui/settings_screen_i18n.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui/warroom_date_i18n.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
```

`/simplify` -> accessibility/language review -> commit `feat(i18n): complete Bosnian locale contract`

## Phase 4 -- Audio assets and restrained soundscape

**Assigned role:** UI/UX Developer + Documentation Specialist
**Independent review:** Game Designer + Canon Compliance Reviewer + QA Engineer

### Task 4.1 -- Supply the priority UI cue set

**Files:**

- Add `.ogg` files under the existing packaged audio asset directory found by `src/ui/map/audio/audioAssets.ts`
- Modify `src/ui/map/audio/audioAssets.ts`
- Modify `src/ui/map/audio/sound_manifest.ts`
- Add/update one `docs/audio/LICENSES/<cue>.md` per asset
- Modify `tests/ui/audio_manifest.test.ts`
- Modify `tests/audio_asset_provenance.test.ts`

- [ ] Prefer first-party generated clicks/paper/radio-control tones; otherwise CC0.
- [ ] Normalize loudness and trim silence without destroying source lineage.
- [ ] Record original and processed SHA-256, processing command, source, author, license, and TASL attribution.
- [ ] Keep mute/master volume and first-gesture unlock authoritative.

### Task 4.2 -- Add restrained ambient beds

**Files:**

- Add room/field/archive `.ogg` assets
- Modify `docs/audio/AMBIENT_BED_ASSET_MANIFEST.md`
- Modify `src/ui/map/audio/audio_event_adapter.ts`
- Modify `tests/ui/audio_ambient_floor.test.ts`

- [ ] Use nonmusical room tone, paper, distant office/radio texture, and restrained environmental beds.
- [ ] Exclude anthem/folk melodies, speeches, screams, close gunfire, bombardment spectacle, and atrocity-specific cues.
- [ ] Crossfade by surface; do not encode hidden enemy information.
- [ ] Ensure silence remains a valid user setting and missing optional assets fail softly.

```powershell
npm.cmd run test:vitest -- tests/ui/audio_manifest.test.ts tests/ui/audio_bus.test.ts tests/ui/audio_event_adapter.test.ts tests/ui/audio_cue_observer.test.ts tests/ui/audio_hook_points.test.ts tests/ui/audio_preferences.test.ts tests/ui/settings_audio_preferences.test.ts tests/ui/audio_ambient_floor.test.ts tests/audio_asset_provenance.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:release:check
```

`/simplify` -> sensitivity/license/QA review -> commit `feat(audio): supply restrained soundscape assets`

## Phase 5 -- Integrated content/presentation proof

**Assigned role:** QA Engineer
**Independent review:** Process QA + Historian

- [ ] Require zero failing historical claim, identity, and audio inventory rows except explicitly `unsupported/omitted` dispositions; localization findings remain tracked post-1.0 and are non-blocking here.
- [ ] Run full content/event/Codex, English accessibility, audio, baseline, browser, and packaged-runtime tests.
- [ ] Inspect English at 1920x1080, 1366x768, and 3440x1440 across the required surfaces.
- [ ] Verify packaged runtime makes no remote font/audio request.
- [ ] Create `docs/40_reports/implemented/20260731_CONTENT_HISTORY_AUDIO.md` and record the Phase 3 post-1.0 deferral explicitly.
- [ ] Update master roadmap, ledger, and reusable knowledge.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run qa:player-experience
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
npm.cmd run desktop:release:check
git diff --check
```

## 6. Success criteria

- [ ] Sensitive-history inventory has no unsupported live claim or prohibited interaction.
- [ ] Grabovica/Uzdol/Neretva content is correctly placed in 1993 and legally/factually precise.
- [ ] No playable officer/OOB identity lacks exact provenance.
- [ ] Every audible asset has source/license/checksum lineage and passes sensitivity rules.
- [ ] English offline packaged runtime, accessibility, browser, baseline, and content suites are green.
- [ ] Post-1.0 localization debt remains linked to Phase 3 and no 1.0 surface claims production-complete Bosnian support.

## 7. Copy-ready execution prompt

```text
Role and objective: Implement the pre-1.0 scope of roadmap R7 using docs/plans/2026-07-31-content-history-localization-audio-plan.md, one phase at a time; skip deferred Phase 3.

Locked decisions: sensitive history is informational consequence, unsupported claims/identities are omitted, Neretva/Grabovica/Uzdol is 1993, English is the sole required 1.0 language, localization Phase 3 is post-1.0, and audio is first-party/CC0 then approved CC BY with TASL and no sensational/anthem/folk material.

Read first: .claude/napkin.md, docs/life_lessons.md, docs/plans/MASTER_ROADMAP.md, docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md, local BB pages and official sources cited in the plan, docs/audio manifests, and target files.

Constraints: TDD, exact provenance, deterministic inventories, /simplify before verification, one logical commit, no FORAWWV/package/version/tag/release change.

Handoff: files, tests/results, claims/identity/audio inventory counts, non-blocking localization-debt status, source/license citations, English screenshots/audio proof, docs/ledger updates, next phase.
```

## 8. Orchestrator completion block

**Canonical owner:** authored source manifests and audio manifest; locale dictionary remains post-1.0 Phase 3 scope.
**Demoted path:** owner-wait content gate, guessed identity, production-complete Bosnian claim, untracked/unlicensed asset.
**Player-visible truth:** precise sourced history, English release-language honesty, restrained functional sound.
**Canonical UI surface:** existing event/Codex surfaces, English Settings/audio controls, and surface ambience.
**Done means:** every retained content row has a sourced/omitted disposition, every audio asset has testable lineage, English accessibility/package proof is green, and Phase 3 remains explicitly tracked post-1.0.
