# Content, Historical Attribution, Bosnian Localization, and Audio Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Finish the sensitive-event, officer/OOB attribution, Bosnian localization, and soundscape lanes with explicit evidence/licensing rules and no unresolved content gate.

**Architecture:** Build four machine-auditable inventories: historical claims, named identities, localizable strings, and audio assets. Unsupported claims/identities are omitted rather than guessed; sensitive events are informational consequences rather than choices; Bosnian uses a canonical BCP 47 locale with legacy preference compatibility; audio uses first-party or CC0/approved CC BY assets with a checksum and attribution manifest.

**Tech stack:** JSON data, TypeScript/React i18n, Vitest, Electron visual/audio proof, Balkan Battlegrounds KB, IRMCT/UN sources, Web Audio/OGG assets.

**Date:** 2026-07-31
**Status:** READY -- content remediation may start after R4 event inventory; UI localization/audio starts after R1/R2 UI convergence
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
5. The canonical Bosnian locale is BCP 47 `bs` with regional formatting `bs-BA`. Persisted `bcs` preferences remain a legacy alias and migrate without breaking old saves/settings.
6. Automated translation may create a draft, never the production-quality claim. Pseudolocalization catches layout defects; a native-language pass catches linguistic defects. If native review is unavailable at release, Bosnian ships labeled `Preview` while English remains default rather than blocking the program.
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
- full localizable-string inventory, `bs` locale contract, pseudo pass, Bosnian draft/review workflow;
- real UI cues and restrained ambient beds with manifest/checksum/license proof;
- accessibility and packaged-offline verification for localized/audio surfaces.

### Non-goals

- no atrocity mechanic, camp subsystem, body-count optimization, faction atrocity ranking, or prevent-genocide reward;
- no uncertain officer identity, invented quotation, or unverified event date;
- no machine-only production translation claim;
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

- [ ] Emit event/essay id, ring, claim, event date/window, state predicate, source tier, citation, respondent, and player interaction type.
- [ ] Fail on sensitive player choices, calendar-only rupture claims, missing source notes, generic symmetry language, and event/essay date mismatch.
- [ ] Add explicit check that Grabovica/Uzdol/Neretva content is in 1993 files/windows.

### Task 0.2 -- Identity, locale, and audio inventories

**Files:**

- Create `tools/diagnostics/officer_oob_provenance.ts`
- Create `tools/diagnostics/localization_coverage.ts`
- Create `tools/diagnostics/audio_asset_provenance.ts`
- Create `tests/officer_oob_provenance.test.ts`
- Create `tests/localization_coverage.test.ts`
- Create `tests/audio_asset_provenance.test.ts`

- [ ] Identity report: id, display name, faction, formation/corps ref, source, confidence, duplicate/conflict.
- [ ] Locale report: every player-facing key, `en`/`bs` coverage, fallback use, concatenation, embedded English, and layout-risk length.
- [ ] Audio report: cue id, file, SHA-256, duration, loudness, source URL, author, license, attribution, and sensitive-content class.
- [ ] Stable ordering; no timestamps/absolute paths.

```powershell
npm.cmd run test:vitest -- tests/codex_sensitive_claim_inventory.test.ts tests/codex_sensitive_history_source_notes.test.ts tests/officer_oob_provenance.test.ts tests/localization_coverage.test.ts tests/audio_asset_provenance.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
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
- Modify any paired event in `data/scenarios/events/war_1993.json`
- Modify focused essay/event tests

- [ ] Remove unsupported generic symmetry.
- [ ] State side-specific findings with exact sources and neutral prosecutorial language.
- [ ] Keep Grabovica/Uzdol in September 1993 and distinguish crime findings from command-liability outcome.
- [ ] Keep atrocity informational; no decision response or reward.

### Task 1.2 -- Finish retained Ring-2 informational backlog

**Files selected by Phase 0:**

- Specific JSON under `data/scenarios/events/`
- Specific JSON under `data/scenarios/essays/`
- `tests/2026...` focused files or existing event/essay suites

- [ ] Reclassify nonsensitive deposit essays out of the sensitive queue.
- [ ] Author only inventory rows with adequate sources and a concrete player-facing purpose.
- [ ] Use current-state predicates for divergent outcomes.
- [ ] If a claim lacks evidence, omit it and close the row as `unsupported/omitted`; do not pause the entire phase.

```powershell
npm.cmd run test:vitest -- tests/codex_sensitive_claim_inventory.test.ts tests/codex_sensitive_history_source_notes.test.ts tests/event_timing.test.ts tests/event_timeline_integrity.test.ts tests/essay_index_integrity.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
```

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

- [ ] Resolve exact duplicate IDs and dead corps refs.
- [ ] Require explicit source/citation for new named rows.
- [ ] Preserve uncertain/conflicting candidates only in the audit output, not playable data.
- [ ] Ensure officer bios and faction/corps assignments survive startup/save/round-trip.
- [ ] Do not derive historical identity from name similarity alone.

```powershell
npm.cmd run test:vitest -- tests/canon_officer_corps_refs.test.ts tests/officer_oob_provenance.test.ts tests/officer_state_persistence.test.ts tests/officer_bio_read_model.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
```

`/simplify` -> historian/QA review -> commit `fix(oob): close officer provenance`

## Phase 3 -- Bosnian locale contract and localizability

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

- [ ] Require zero failing historical claim, identity, locale, and audio inventory rows except explicitly `unsupported/omitted` or `preview-language-review` dispositions.
- [ ] Run full content/event/Codex, locale, accessibility, audio, baseline, browser, and packaged-runtime tests.
- [ ] Inspect English, Bosnian, and pseudo locale at the three viewport sizes.
- [ ] Verify packaged runtime makes no remote font/audio request.
- [ ] Create `docs/40_reports/implemented/20260731_CONTENT_HISTORY_LOCALIZATION_AUDIO.md`.
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
- [ ] `bs`/`bs-BA` is canonical, `bcs` migrates, pseudo coverage is complete, and Bosnian is honestly labeled for its review state.
- [ ] Every audible asset has source/license/checksum lineage and passes sensitivity rules.
- [ ] Offline packaged runtime, accessibility, browser, baseline, and content suites are green.

## 7. Copy-ready execution prompt

```text
Role and objective: Implement roadmap R7 using docs/plans/2026-07-31-content-history-localization-audio-plan.md, one phase at a time.

Locked decisions: sensitive history is informational consequence, unsupported claims/identities are omitted, Neretva/Grabovica/Uzdol is 1993, locale is bs/bs-BA with bcs compatibility, Bosnian without native review is Preview, audio is first-party/CC0 then approved CC BY with TASL and no sensational/anthem/folk material.

Read first: .claude/napkin.md, docs/life_lessons.md, docs/plans/MASTER_ROADMAP.md, docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md, local BB pages and official sources cited in the plan, docs/audio manifests, and target files.

Constraints: TDD, exact provenance, deterministic inventories, /simplify before verification, one logical commit, no FORAWWV/package/version/tag/release change.

Handoff: files, tests/results, claims/identity/locale/audio inventory counts, source/license citations, screenshots/audio proof, docs/ledger updates, next phase.
```

## 8. Orchestrator completion block

**Canonical owner:** authored source manifests, locale dictionary, audio manifest.
**Demoted path:** owner-wait content gate, guessed identity, generic BCS claim, untracked/unlicensed asset.
**Player-visible truth:** precise sourced history, honest language support, restrained functional sound.
**Canonical UI surface:** existing event/Codex surfaces, Settings language/audio controls, and surface ambience.
**Done means:** every retained content row has a sourced/omitted disposition and every locale/audio asset has testable lineage.
