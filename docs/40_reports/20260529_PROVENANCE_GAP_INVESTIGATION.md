# Provenance Gap Investigation — Officers / OOB / Essays

**Date:** 2026-05-29
**Author:** Historian + Research
**Status:** READ-ONLY INVESTIGATION + one mechanical index-integrity guard shipped
**Scope:** Deep confirmation of the officer / OOB / essay provenance gaps flagged in finding #3, plus a content-free essay index-integrity test. NO prose authored, NO citations invented, NO sensitive-history wording touched, NO OOB stat/behavior change. The full citation effort (~69 officers + per-formation OOB) is explicitly a multi-wave SCHEDULED content effort, NOT resolved here.
**Related plan:** `docs/plans/2026-05-29-officer-oob-source-attribution-plan.md` (the gated execution plan this investigation feeds).
**Source hierarchy (binding):** ICTY/ICJ verdicts FIRST → museum B/C/S primary → Balkan Battlegrounds (BB) → Wikipedia LAST (never the sole basis).

---

## 0. Executive summary

| Family | Confirmed counts | Provenance state |
| --- | --- | --- |
| Officers | **98 total**, **29** with `war_crimes_record`, **15** with mini-bio (`bio_short`) | **0** records carry any general `source` / `source_tier` / `provenance` field. ~69 have identity + corps assignment with zero recorded provenance. |
| OOB corps | **19** corps | **1** blanket file-level citation (`awwv_meta.source`); **0** per-corps source fields. |
| OOB brigades | **249** brigades | **0** per-brigade source field; **0** file-level meta (the file is a bare JSON array); only **8** carry an `elite_commander`. |
| Essays (index) | **96** index rows | Index is the runtime source of truth; all 96 have a backing on-disk file, all carry `sources`, all carry BCS localizations. |
| Essays (disk) | **110** on-disk essay files (+ `essay_index.json`) | **14** disk stems are not referenced by any index `event_id`; **13** are a genuine 1992 content deposit, the 14th is a duplicate of an already-indexed essay. |

**Prefix-mismatch verdict:** the `essay_<slug>` index id vs `<slug>` filename divergence is **latent / cosmetic, NOT a runtime mis-resolution.** The Codex runtime joins on `event_id`, never on `id` (proof in §3.3). No loader currently mis-resolves on it.

---

## 1. Officers (`data/scenarios/officers/apr1992_officers.json`)

**File shape:** `{ "officers": [ … ] }` — 98 records.

**Per-record fields (sampled):**
`id, name, faction, rank, competence, aggressiveness, defensive_skill, political_reliability, home_corps_id, compatible_corps_ids, available_from_turn, is_historical_start, origin, casualty_vulnerability, can_improve, improvement_rate, pool_tier, war_crimes_record, bio_short, command_style, known_for, political_alignment_note`.

**Confirmed counts (programmatic):**
- `war_crimes_record`: **29 / 98** — the only citation-bearing field, present only for prosecuted/indicted individuals.
- `bio_short` (mini-bio set): **15 / 98** — exactly the first-pass opening-commander set from the 2026-05-17 mini-bio plan.
- General source field (`source` / `source_tier` / `provenance`): **0 / 98**. There is **no** per-officer provenance field of any kind.

**Gap.** ~69 officers (deputies, future-turn replacements, tier_b/tier_c pool) have an identity and a `home_corps_id` / `compatible_corps_ids` corps tie with **zero recorded provenance**. The corps assignment is implicitly sourced to the OOB master (`oob_corps.json`) but is never cited per-officer. `tests/canon_officer_corps_refs.test.ts` already guards that every corps ref resolves — that is the model for a future provenance-integrity test, but it asserts *referential* integrity, not *source* provenance.

**This pass does not touch officer data.** Adding a `source_tier` field is a save/schema slice (Wave C of the plan) and is deferred.

---

## 2. OOB (`data/source/oob_corps.json`, `data/source/oob_brigades.json`)

**Corps file.** Top keys `awwv_meta, corps`. `awwv_meta.source` = `"Balkan Battlegrounds Vol. I Appendices G & H; VRS/ARBiH/HVO ORDER_OF_BATTLE_MASTER"` — a single blanket citation for all **19** corps. No per-corps `source` / `provenance` field.

**Brigade file.** A bare top-level JSON array of **249** brigade objects — **no `awwv_meta` block at all**, so not even a file-level blanket citation. Per-brigade keys: `id, faction, name, corps, home_mun, home_settlement, home_osid, kind, default_equipment_class, available_from, mandatory, initial_personnel, initial_cohesion, initial_officer_quality, is_elite, elite_commander`. Only **8** brigades carry an `elite_commander` (named + traited). **0** carry a per-brigade source field.

**Gap.** Single blanket citation for the whole corps file; the brigade file has no provenance at all. No recorded uncertainty for contested HQ OSIDs (e.g. `jna_herzegovina_command`). The Goražde precedent (`gorazde_defender_corrections.md`: Independent 81st Division ≠ 5th Corps) proves blanket-citation files can carry wrong unit→formation attributions. Per-formation citation is **Wave D** of the plan — large (249 brigades), chunked by faction/corps, deferred.

---

## 3. Essays (`data/scenarios/essays/`)

### 3.1 What the runtime actually loads

`src/ui/map/components/CodexPanel.tsx:18` imports `essay_index.json` **directly** as the data source. The per-essay on-disk `*.json` files are the authoring/generation deposit; the generator copies `title` / `content` / `sources` verbatim into the index (verified: index rows and disk files are byte-identical for `content` / `title` / `sources`). The on-disk files are **NOT** read at runtime.

### 3.2 Confirmed counts

- Index rows: **96**. All 96 resolve to an on-disk file (0 missing in the index→disk direction). All 96 carry a `sources` array and BCS localizations.
- On-disk essay files: **110**.
- Disk stems not referenced by any index `event_id`: **14**.

### 3.3 Prefix-mismatch mechanism — and why it is latent, not a live bug

- Index `id` format = `essay_<event_id>` (e.g. `essay_srebrenica_falls_1995`). The on-disk filename and the essay's `event_id` carry **no** `essay_` prefix (`srebrenica_falls_1995.json` / `event_id: srebrenica_falls_1995`).
- **The unlock join is on `event_id`, not `id`.** `codexEssayResolver.ts:517` — `const eventUnlocked = context.firedEventIds.has(essay.event_id);`. The `essay_`-prefixed `id` is used ONLY as a React list/map key in `CodexPanel.tsx` (`new Map(essays.map((essay) => [essay.id, …]))` and `essays.find((e) => e.id === selectedEssayId)`). It is never joined against fired events, event ids, or filenames at runtime.
- Therefore **no loader currently mis-resolves on the prefix.** The mismatch is a cosmetic naming divergence (and a future-drift hazard), not a runtime fault.
- **One documented exception** to `id === essay_<event_id>`: `essay_washington_agreement_1994` whose `event_id` was deliberately repointed to the HRHB event `hrhb_washington_agreement_1994` (PROJECT_LEDGER line ~2895) so it unlocks off the HRHB acceptance event. The filename stem stays `washington_agreement_1994`. All other 95 rows satisfy `id === essay_<event_id>`.

### 3.4 The 14 unindexed disk stems

| Stem | Year | event_id matches a real event? | sources | Wikipedia-only? | content len |
| --- | --- | --- | --- | --- | --- |
| cutileiro_plan_lisbon_1992 | 1992 | no | 4 | no | 4845 |
| foca_1992 | 1992 | no | 4 | no | 3750 |
| gorazde_pocket_consolidation_1992 | 1992 | **yes** | 3 | no | 3204 |
| keraterm_camp_1992 | 1992 | no | 4 | no | 4025 |
| kupres_battle_1992 | 1992 | no | 3 | no | 4568 |
| milosevic_isolation_warning_aug92 | 1992 | **yes** | 4 | no | 3647 |
| omarska_camp_1992 | 1992 | no | 4 | no | 4225 |
| prijedor_takeover_1992 | 1992 | no | 5 | no | 3925 |
| sarajevo_jna_column_dobrovoljacka_1992 | 1992 | no | 4 | no | 4223 |
| trnopolje_camp_1992 | 1992 | no | 4 | no | 4227 |
| vase_miskina_breadline_1992 | 1992 | no | 4 | no | 4221 |
| visegrad_1992 | 1992 | no | 4 | no | 4004 |
| zvornik_takeover_1992 | 1992 | no | 4 | no | 3633 |
| washington_agreement_1994 | 1994 | (already indexed via `hrhb_washington_agreement_1994`) | 2 | no | 3841 |

- **13 are a genuine 1992 content deposit** — the "Wave-4" content essays guarded by `tests/codex_essays_wave_4.test.ts` (filesystem-only; never asserts index membership). All content-complete (≥3204 chars), all ICTY/BB-cited, none Wikipedia-only.
- **The 14th (`washington_agreement_1994`) is a false positive** — its content is already in the index under `event_id: hrhb_washington_agreement_1994`; only its disk stem differs from that event_id.
- The prior inventory's "9 unindexed 1992 essays" undercounted: there are **13** unindexed 1992 essays on disk.

### 3.5 Why these 13 were NOT indexed in this pass (the gate)

`tests/ui/codex_essay_localization.test.ts` asserts that **every indexed essay carries `localizations.bcs` (title + category + content)**. The 13 deposit files have **no** BCS localizations on disk. Indexing them would force either (a) authoring BCS translation prose, or (b) weakening that existing test. Most are sensitive-history Ring-3 subjects (the Prijedor camps — Omarska/Keraterm/Trnopolje — Foča, Višegrad, Zvornik). Both options are out of this lane's scope (NO prose, NO sensitive-history wording, §6-gated). **Indexing the 13 is therefore deferred to the gated localization / sensitive-history content lane.**

Additionally, 11 of the 13 have **no matching event** in the event catalog, so even if indexed they would never unlock at runtime until their trigger events exist — a second reason indexing is a deliberate downstream content task, not a mechanical metadata move.

---

## 4. The mechanical fix shipped this pass

A single content-free deliverable: **`tests/essay_index_integrity.test.ts`** — a durable structural guard that pins the invariants discovered above:

1. Every index row resolves to an on-disk file (index → disk).
2. Every index `id` carries the `essay_` prefix.
3. Every index `id` equals `essay_<event_id>` except the one documented Washington exception (catches future prefix drift).
4. The set of on-disk stems not referenced by the index is exactly the known 14-stem deposit (catches NEW unindexed files immediately, and documents the current divergence).
5. Every deposit file is content-complete (`id` convention, ≥2000-char content, ≥1 source) — proving indexing them later is a metadata-only move once localization is authored.

No data file was edited. No essay prose, `id`, `event_id`, or `sources` value was changed. Zero scenario-hash risk: `essay_index.json` is consumed only by `CodexPanel.tsx` (UI/codex), never by the sim runner.

---

## 5. Source-tiered remediation backlog (prioritized, SCHEDULED — not this pass)

The full citation effort is a **multi-wave scheduled content effort**, gated on `/historian` + `/canon-compliance-reviewer` (+ `/formation-expert` for OOB) sign-off, source-tiered ICTY/ICJ → museum → BB → never-Wikipedia. It is **NOT resolvable in this pass.**

1. **Essay indexing (gated content lane).** Author BCS localizations for the 13 deposit essays, verify each `sources` array meets the tier bar, confirm/author their trigger events, then add the 13 index rows (metadata copy from disk). Sensitive Ring-3 subjects route through `SENSITIVE_HISTORY_DESIGN_GATE`.
2. **Officer provenance (Wave C).** Record source-class for the ~69 uncited/blanket-only officers per the §5 process of the plan; add a behavior-neutral `source_tier` field only via a save/schema slice. STOP on any uncertain identity match (Goražde-class risk).
3. **OOB corps provenance (Wave D-a).** Per-corps citation notes; flag contested HQ OSIDs (`jna_herzegovina_command`).
4. **OOB brigade provenance (Wave D-b).** Per-brigade citation, chunked by faction then corps (249 brigades); flag any Goražde-class unit→formation tie for `/formation-expert` review.

**Explicit statement:** the ~69 officer citations and the per-formation OOB citations are a scheduled, reviewed, multi-wave content effort. This investigation confirms the gaps and ships only the structural index-integrity guard; it authors no citation and changes no provenance data.
