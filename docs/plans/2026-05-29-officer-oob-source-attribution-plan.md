# Officer / OOB / Source Attribution + Essay Rosters — Inventory + Citation Plan

**Date:** 2026-05-29
**Status:** PLANNING-ONLY (no content/citations authored, no commit)
**Owner lane:** Research/operator lane plus content bank
**Authoring role:** Historian (with Research/Content hat)
**Related command-board row:** P2 "Officer/OOB/source attribution and essay rosters" — **GATED** (`docs/plans/COMMAND_BOARD.md` line 42). Stop Gate = "Missing citation or uncertain identity match."
**Source phase expanded:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 3 ("Officer/OOB/Source Attribution"). This plan must not contradict that phase: allowed work = "inventories, source notes, uncertainty classification, and non-sensitive attribution packets"; stop gates = "uncertain identity match, missing source, sensitive biography judgment, or OOB behavior changes without engine plan."
**Older source plan inherited:** `docs/plans/2026-05-17-officer-character-mini-bio-plan.md` (the mini-bio schema + first-pass that this plan extends).
**Depth exemplar followed:** `docs/plans/2026-05-29-ring3-sensitive-event-authoring-plan.md` (gated, source-tiered, one-family-at-a-time content plan).
**Collision rule:** Inventory + citation + packets ONLY. No OOB stat/behavior change, no engine edit, no new sensitive-history prose, no scenario-calibration change. Stop and escalate on any missing citation or uncertain identity match (the row stop gate).

---

## 0. Required reading (cite before any work)

- `CLAUDE.md` Sacred Rules — determinism (no `Math.random`/`Date.now`/timestamps in sim/tooling); canonical faction IDs **`RBiH` / `RS` / `HRHB`** only; "Never auto-edit `docs/10_canon/FORAWWV.md`"; "NEVER override initial OSIDs."
- `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 3 (the row this plan expands) + its "Historical and Sensitive-History Gates" section.
- `docs/plans/COMMAND_BOARD.md` line 42 (Verification/Proof + Stop Gate) and the Dispatch Rules.
- Source hierarchy (project memory `historical_research_sources.md`; Gate §6 evidence rule): **ICTY/ICJ verdicts FIRST → museum B/C/S primary → Balkan Battlegrounds (BB) → Wikipedia LAST (never the sole basis; not acceptable for `/historian` sign-off).**
- OOB data of record: `data/source/oob_corps.json` (19 corps incl. `vrs_east_bosnian`, `arbih_7th_corps`-absent, `jna_herzegovina_command`; `awwv_meta.source` = "Balkan Battlegrounds Vol. I Appendices G & H; VRS/ARBiH/HVO ORDER_OF_BATTLE_MASTER"); `data/source/oob_brigades.json` (249 brigades; 8 with `elite_commander`).
- Officer roster of record: `data/scenarios/officers/apr1992_officers.json` (98 officers; fields `historical_corps_id`, `war_crimes_record`, `bio_short`, `command_style`, `known_for`, `political_alignment_note`, optional `sensitive_history_note`).
- Essay corpus: `data/scenarios/essays/essay_index.json` (index, 96 essay rows, ids carry `essay_` prefix) + per-essay `*.json` files in `data/scenarios/essays/` (111 files; filenames carry NO `essay_` prefix; each essay has a `sources` array).
- Goražde defender-correction precedent (project memory `gorazde_defender_corrections.md`): Independent 81st Division was NOT 5th Corps; `slatina_2` + `ustipraca_2` are RS; post-Dayton municipality = IEBL ground truth. This is the *class* of attribution error this lane must catch.
- Existing tests this lane must keep green: `tests/canon_officer_corps_refs.test.ts`, `tests/officer_mini_bio_schema.test.ts`, `tests/oob_loader.test.ts`, `tests/codex_essays_wave_4.test.ts`, `tests/codex_source_quality.test.ts`, `tests/codex_sensitive_claim_inventory.test.ts`.
- Existing precedent audit: `docs/40_reports/audits/20260517_OFFICER_MINI_BIO_SOURCE_REVIEW.md` (the first-pass 15-officer source review and its source-class taxonomy).

---

## 1. Objective + Why

**Objective.** Produce a complete, auditable inventory of every officer, OOB formation (corps + brigade), and Codex essay that requires a source attribution; record the highest-tier provenance for each per the source hierarchy; classify each entry's identity-match certainty; and package the uncited/uncertain items into review packets — **without authoring any uncited claim and without changing any OOB stat, behavior, or scenario output.**

**Why now.** Three concrete gaps make this lane real, not aspirational:

1. **Officer provenance is partial and field-fragmented.** Of 98 officers, only **29** carry a `war_crimes_record` (the only citation-bearing field, and only for prosecuted/indicted individuals) and only **15** carry mini-bio fields (exactly the first-pass opening commanders from the 2026-05-17 plan). There is **no general provenance/source field** on the officer record — the assignment of each officer to a `historical_corps_id` is implicitly sourced to the OOB master but never cited per-officer. The remaining ~69 officers (deputies, future-turn replacements, tier_b/tier_c pool) have identity + corps assignment with **zero recorded provenance**.
2. **Essay index/file divergence + prefix mismatch.** The index keys essays with an `essay_` prefix (e.g. `essay_independence_referendum_1992`); the on-disk files and their `event_id` do **not** (`independence_referendum_1992.json`). Worse, **14 on-disk essay files are not referenced by the index at all**, of which **9 are 1992 events** (`foca_1992`, `keraterm_camp_1992`, `omarska_camp_1992`, `prijedor_takeover_1992`, `trnopolje_camp_1992`, `vase_miskina_breadline_1992`, `visegrad_1992`, `zvornik_takeover_1992`, `cutileiro_plan_lisbon_1992`) plus `gorazde_pocket_consolidation_1992`. These are the "13 missing 1992 events" the project memory flagged — they are now partly on disk but unindexed and unverified for `sources` integrity.
3. **OOB provenance is a single blanket citation.** `oob_corps.json` and `oob_brigades.json` cite one master source (BB Vol. I App. G/H + ORDER_OF_BATTLE_MASTER) for the entire file. There is no per-formation provenance, no recorded uncertainty for contested HQ OSIDs (e.g. `jna_herzegovina_command` HQ at `op:nevesinje:sopilja`), and the Goražde precedent proves blanket-citation files can carry wrong unit→formation attributions.

Leaving this open risks ad-hoc, uncited officer/essay authoring that fails the citation gate or commits an identity error (a Goražde-class mistake) that silently corrupts the historical layer.

---

## 2. Scope & Non-Scope

**In scope (this plan delivers):**
- An **inventory artifact** enumerating every officer, every OOB corps + brigade, and every essay (index row + on-disk file) that needs a source attribution, with current provenance status (cited / uncited / blanket-only).
- A **per-entry source-tier record** (highest tier available) and an **identity-match certainty classification** (confirmed / probable / uncertain).
- A reconciliation map for the **essay prefix mismatch** and the **index↔disk divergence** (which files are unindexed, which 1992 events are still missing).
- **Review packets** for every uncited or uncertain entry, routed for `/historian` + `/canon-compliance-reviewer` (+ `/formation-expert` for OOB) sign-off.
- Read-only diagnostic tooling + tests that *measure* provenance/index integrity (no data mutation by the tooling).

**Out of scope (explicitly NOT in this plan):**
- Authoring any new officer `bio_short`/`sensitive_history_note`/`war_crimes_record` prose, essay `content`, or any uncited claim. (Drafting happens per-entry only after the §5 citation/sign-off process.)
- Changing any OOB `initial_personnel`, `competence`, `available_from`, `home_corps_id`, `historical_corps_id`, or any stat/behavior field. (OOB-behavior changes need a separate engine/calibration plan — Phase 3 stop gate; calibration-owned.)
- Overriding initial OSIDs or HQ OSIDs (Sacred Rule).
- Any sensitive-history biography judgment (atrocity/culpability/intent) — routes to `docs/plans/2026-05-29-ring3-sensitive-event-authoring-plan.md` / `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`; not resolved here.
- Editing `docs/10_canon/FORAWWV.md`.
- Calibration / scenario-hash-moving changes of any kind.

---

## 3. Current-State Findings (file/path evidence)

### 3.1 Officer attribution
- File: `data/scenarios/officers/apr1992_officers.json` — **98 officer records**.
- Citation-bearing fields present: `war_crimes_record` (court/verdict/charges/summary) on **29** officers; `bio_short`/`command_style`/`known_for`/`political_alignment_note` on **15** (the first-pass set in `tests/officer_mini_bio_schema.test.ts` `FIRST_PASS_OPENING_COMMANDERS`); `sensitive_history_note` on 0.
- Implicit-but-uncited: `historical_corps_id` ties each historical-start officer to an `oob_corps.json` corps; provenance is the OOB master, never recorded per-officer.
- **Gap:** ~69 officers have identity + corps assignment with no recorded provenance; the file has no general `source`/`source_tier` field for non-prosecuted officers.
- Reference-integrity guard exists: `tests/canon_officer_corps_refs.test.ts` asserts every `home_corps_id`/`compatible_corps_ids` resolves in `oob_corps.json`. This is the model for a provenance-integrity test.

### 3.2 OOB formations
- `data/source/oob_corps.json` — **19 corps**, single `awwv_meta.source` blanket citation (BB Vol. I App. G/H + ORDER_OF_BATTLE_MASTER) + a `corrections` note (e.g. "Removed 6th Corps, 28th/81st Independent (not field corps in Apr 1992)"). HQ OSIDs added 2026-02-24 from `municipality_hq_settlement`.
- `data/source/oob_brigades.json` — **249 brigades**; only **8** carry an `elite_commander` (name + traits + origin); the rest are unit-anonymous. No per-brigade provenance field.
- **Gap:** no per-formation citation, no recorded uncertainty for contested HQ placements, and the Goražde precedent (`gorazde_defender_corrections.md`) shows blanket-citation files can mis-attribute units to formations (Independent 81st Division ≠ 5th Corps). The `corrections` note shows corrections happen but are not source-cited line-by-line.

### 3.3 Essays
- Index: `data/scenarios/essays/essay_index.json` — **96 essay rows**; `id` carries the `essay_` prefix; each row has `event_id` (no prefix) + a `sources` array (e.g. ICTY/ICJ citations) + `generated: true`.
- On-disk files: `data/scenarios/essays/*.json` — **111 files** (110 essays + `essay_index.json`); filenames carry NO `essay_` prefix.
- **Prefix mismatch confirmed:** index `id` = `essay_<slug>`, file = `<slug>.json` / `event_id` = `<slug>`. Any loader/test that joins index→file by `id` (rather than `event_id`) will mis-resolve.
- **Index↔disk divergence confirmed:** 14 on-disk files have no matching `event_id` in the index — `cutileiro_plan_lisbon_1992`, `foca_1992`, `gorazde_pocket_consolidation_1992`, `keraterm_camp_1992`, `kupres_battle_1992`, `milosevic_isolation_warning_aug92`, `omarska_camp_1992`, `prijedor_takeover_1992`, `sarajevo_jna_column_dobrovoljacka_1992`, `trnopolje_camp_1992`, `vase_miskina_breadline_1992`, `visegrad_1992`, `washington_agreement_1994`, `zvornik_takeover_1992`. **Nine are 1992 events** — the long-flagged "missing 1992 essays" are now partly on disk but unindexed/unverified.
- Existing essay/citation tests: `tests/codex_essays_wave_4.test.ts`, `tests/codex_source_quality.test.ts`, `tests/codex_sensitive_claim_inventory.test.ts`.

---

## 4. Inventory Methodology (enumerate every entry needing a citation)

Build one read-only diagnostic that emits a deterministic, sorted JSON inventory (no `Date.now`, no random ordering — sort by id with `strictCompare` semantics). Proposed tool: `tools/diagnostics/source_attribution_inventory.cjs` (CJS to match existing `codex_sensitive_claim_inventory.cjs`).

**Officer family.** For each of the 98 records: emit `{ id, name, faction, rank, historical_corps_id, has_war_crimes_record, has_mini_bio, provenance_status }`, where `provenance_status` ∈ {`cited` (war_crimes_record OR mini-bio source-class recorded), `blanket-only` (corps assignment cites OOB master only), `uncited`}.

**OOB family.** For each corps (19) and brigade (249): emit `{ id, faction, name, kind, hq_osid|home_osid, has_named_commander, provenance_status }`. Default `provenance_status` = `blanket-only` (the file-level meta source) until a per-formation citation is recorded; flag contested HQ OSIDs for the uncertain bucket.

**Essay family.** Cross-join index↔disk: for each index row emit `{ id (essay_-prefixed), event_id, on_disk (bool), sources_count, sources_tier_top }`; for each on-disk file with no index `event_id` emit `{ event_id, indexed:false, year, sources_count }`. The diagnostic must surface the prefix mismatch as an explicit field (`id_prefix_matches_event_id: false`) so it is countable, and list unindexed 1992 events separately.

**Output.** A single sorted JSON written under the diagnostics-output artifact path already owned by the COMMAND_BOARD "diagnostics output ownership" matrow (do not commit a new unlisted JSON without adding a matrix row — that is a Save/load lane stop gate). The human-readable inventory report goes to `docs/40_reports/audits/YYYYMMDD_SOURCE_ATTRIBUTION_INVENTORY.md`.

---

## 5. Source-Tier Citation Process (per entry)

Each entry that the inventory marks `uncited` or `blanket-only` (and every uncertain identity) passes this process, in order, before any citation prose is recorded:

1. **Tier search (historian).** Find the highest-tier source per the hierarchy: **ICTY/ICJ verdict → museum B/C/S primary → Balkan Battlegrounds (BB) → Wikipedia (never the basis).** Record the exact citation (ICTY case number, museum collection, BB volume/appendix/page). Wikipedia may corroborate but can never be the sole `source_tier`.
2. **Identity-match certainty bar.** Classify the match: **confirmed** (named in a tier-1/tier-2 source in the exact role/formation/period), **probable** (named in BB or corroborated secondary, role consistent), **uncertain** (name/role/formation match cannot be established at the certainty bar). **An `uncertain` entry is STOPPED and escalated — never quietly recorded as cited** (the COMMAND_BOARD stop gate "uncertain identity match"). The Goražde precedent is the model: do not assert a unit→formation tie unless the source confirms it.
3. **Provenance record.** Add the citation to the entry: officers → a recorded source-class in the audit report (mirroring `20260517_OFFICER_MINI_BIO_SOURCE_REVIEW.md`'s taxonomy: scenario-source-backed / conservative-inference / generic-fallback) and, where a data field is appropriate and behavior-neutral, a `source_tier` field; OOB → a per-formation provenance note in the audit (data-field addition only via a separate schema-proof slice); essays → ensure the `sources` array carries the tier-1/tier-2 citation.
4. **Sensitive-history gate.** Any officer entry touching atrocity/culpability/intent, or any essay in a Ring-3 family, does NOT get its sensitive prose authored here — it routes to the Ring-3 plan / SENSITIVE_HISTORY_DESIGN_GATE with `/historian` + `/narrative-designer` (+ `/game-designer`, `/war-or-game`) sign-off. This lane only records the *provenance*, never the sensitive claim.
5. **Canon review.** `/canon-compliance-reviewer` confirms faction IDs are canonical (`RBiH`/`RS`/`HRHB`), corps refs resolve, and no OOB behavior field changed.

A `blanket-only` entry may remain blanket-only if no higher-tier per-entry source exists — but it must be explicitly recorded as such (not silently treated as fully cited).

---

## 6. Per-Family Sequencing (one roster/family at a time — do not bundle)

Lowest-risk, highest-integrity-leverage first. One family per commit; each ends with §7 gates + a `docs/PROJECT_LEDGER.md` entry.

- **Wave A — Inventory baseline (no citations authored).** Build `tools/diagnostics/source_attribution_inventory.cjs` + its test; emit the sorted inventory + write the audit report enumerating all three families' gaps. Pure measurement. (This is the bulk of the "inventory" deliverable.)
- **Wave B — Essay index integrity.** Reconcile the prefix mismatch (decide the canonical key: `event_id` is the join key the loader should use — confirm against the essay loader before any rename) and the 14 unindexed files. Add the 9 unindexed **1992 events** to the index (index rows only — `sources` already on disk; verify each `sources` array meets the tier bar; no essay `content` authored here). STOP for any essay whose on-disk `sources` is empty or Wikipedia-only.
- **Wave C — Officer provenance.** Walk the ~69 uncited/blanket-only officers. Record source-class per the §5 process into the audit report; add a behavior-neutral `source_tier` field only via a save/schema-proof slice if a data field is warranted. STOP on any uncertain identity match. Sensitive entries route out.
- **Wave D — OOB formation provenance.** Per-corps then per-brigade provenance notes in the audit; flag contested HQ OSIDs (e.g. `jna_herzegovina_command`) and any Goražde-class unit→formation tie for `/formation-expert` review. No stat/behavior change. Brigade family is large (249) — chunk by faction, then by corps.

Conditional: if Wave C/D surface an OOB-behavior correction (not just a citation), it is **handed off** to the calibration/engine lane — not made here (Phase 3 stop gate).

---

## 7. Test / Verification Gates (run on every commit)

```powershell
# Officer ↔ corps reference integrity (must stay green; the provenance-integrity model)
npx.cmd vitest run tests\canon_officer_corps_refs.test.ts tests\officer_mini_bio_schema.test.ts tests\oob_loader.test.ts --reporter=dot

# Essay index integrity + source-quality + sensitive-claim inventory
npx.cmd vitest run tests\codex_essays_wave_4.test.ts tests\codex_source_quality.test.ts tests\codex_sensitive_claim_inventory.test.ts --reporter=dot

# New inventory diagnostic + its test (Wave A onward)
node --check tools\diagnostics\source_attribution_inventory.cjs
node tools\diagnostics\source_attribution_inventory.cjs --json

# Typecheck + whitespace
npm.cmd run typecheck
git diff --check
```

**Add tests when data changes** (Phase 3 instruction):
- `tests/source_attribution_inventory.test.ts` (NEW) — asserts the inventory tool runs, output is deterministic/sorted, and counts match (98 officers / 19 corps / 249 brigades / index-row count).
- `tests/essay_index_integrity.test.ts` (NEW) — asserts every index `event_id` has an on-disk file, every on-disk essay file is indexed (catches the 14-file divergence), and the `id`↔`event_id` prefix relationship is consistent (catches future prefix drift). This test is the durable guard against the prefix mismatch reappearing.
- Citation-completeness assertion: a roster test that fails if a newly-marked-`cited` officer/essay lacks a recorded `source_tier`/non-empty `sources`.

**Determinism:** tooling is read-only, sorted output, no `Math.random`/`Date.now`/timestamps. **No scenario hash drift** is permitted — officers/OOB/essays feed scenarios; any data edit must be proven baseline-neutral (40w/188w hash unchanged) or be explicitly explained. Provenance-only audit-report additions are inert.

---

## 8. Risks

- **Missing citation (the stop gate).** An entry cannot be cited above Wikipedia. *Mitigation:* record as `uncited`/`blanket-only`, package into a review packet, escalate — never fabricate a citation.
- **Uncertain identity match (the stop gate).** Name/role/formation tie cannot be confirmed (Goražde-class risk). *Mitigation:* §5 step-2 certainty bar; `uncertain` is STOPPED and escalated, not recorded as fact.
- **Prefix-mismatch breakage.** Renaming index keys to "fix" the prefix could break the essay loader if it joins on `id`. *Mitigation:* confirm the loader's join key (`event_id`) before any rename; prefer adding the integrity test over renaming; treat any rename as a behavior-affecting change needing loader-test proof.
- **Accidental OOB behavior change.** Touching `oob_*.json` for provenance risks editing a stat field. *Mitigation:* provenance recorded in the audit report by default; data-field additions only via a save/schema-proof slice; `oob_loader`/baseline gates catch drift.
- **Scenario hash drift.** Any officer/essay/OOB data edit could move a baseline. *Mitigation:* baseline-neutral proof per edit; default to report-only.
- **Sensitive-history creep.** Recording an officer's war-crimes provenance shades into authoring a culpability claim. *Mitigation:* §5 step-4 routes all sensitive prose to the Ring-3 plan / SENSITIVE_HISTORY_DESIGN_GATE; this lane records provenance only.
- **Unlisted diagnostics artifact.** Committing the inventory JSON without an ownership-matrix row trips the Save/load-lane stop gate. *Mitigation:* add the matrix row first, or keep the JSON transient.

## 9. Rollback

- Wave A (tooling + audit report): revert the single commit; no data/schema change, no hash risk.
- Wave B (essay index rows): revert the index-row additions; loader unaffected if `event_id` join confirmed; restore prior index byte-for-byte.
- Wave C/D (provenance): audit-report-only by default → revert the report; any `source_tier`/provenance data field added via a schema slice rolls back with its migration/default proof and restores the prior baseline byte-for-byte.

## 10. Dependencies

- **Essay loader** join-key (`event_id`) must be confirmed before any index rename (Wave B blocker).
- **Save/load lane** ownership matrix (`docs/plans/COMMAND_BOARD.md` P1 line 38) governs where the inventory JSON may be written.
- **Ring-3 / sensitive-history plan** (`docs/plans/2026-05-29-ring3-sensitive-event-authoring-plan.md`) + `SENSITIVE_HISTORY_DESIGN_GATE.md` own all sensitive prose; this lane hands sensitive entries to them.
- **Calibration/engine lane** owns any OOB-behavior correction surfaced by Wave C/D.
- **`/formation-expert`** review for OOB unit→formation ties; **`/canon-compliance-reviewer`** for faction-ID + corps-ref + behavior-neutrality.

## 11. Owner & Sign-Off

- **Author:** Historian (Research/Content hat).
- **Reviewers:** `/canon-compliance-reviewer` (canon/behavior-neutrality), `/formation-expert` (OOB ties), `/narrative-designer` (any prose), `/war-or-game` (only if a record shades into a sensitive claim).
- **User approval:** required for any sensitive-history biography judgment and for any OOB-behavior change (the latter is calibration-owned and out of this lane).

## 12. Definition of Done

- A complete inventory artifact + audit report enumerates every officer (98), OOB corps (19) + brigade (249), and essay (index rows + on-disk files) with provenance status and identity-match certainty.
- The essay prefix mismatch and the 14-file index↔disk divergence are reconciled or formally recorded; the 9 unindexed 1992 events are indexed (or explicitly packeted as still-missing) with their `sources` verified to the tier bar.
- Every entry the inventory marked `cited` has a recorded `source_tier`/non-empty `sources`; every `uncited`/`uncertain` entry is in a review packet and escalated (none silently treated as cited).
- New integrity tests (`essay_index_integrity`, `source_attribution_inventory`) are green; existing officer/OOB/essay tests stay green; typecheck/`git diff --check` clean; no scenario hash drift (or each delta explained + baseline-proven).
- Each family has a `docs/PROJECT_LEDGER.md` entry; `docs/plans/COMMAND_BOARD.md` line 42 updated (CLOSED when all four waves are adjudicated).
- No OOB behavior change, no initial-OSID override, no sensitive-history prose, and no `FORAWWV.md` edit introduced by this lane.
