# Bosnian (bs) Localization Leakage Audit

**Date:** 2026-06-04
**Branch:** `claude/bosnian-lqa-audit` (from `origin/main` @ f9eeee9b)
**Lane:** P1 Localization Bosnian LQA — Phase 1 (Automated Leakage Audit), read-only
**Methodology source:** `docs/plans/2026-05-24-bosnian-localization-lqa-execution-plan.md`
**Scope read (READ ONLY):** `src/ui/map/i18n/messages.bcs.ts`, `messages.en.ts`, `index.ts`; `data/codex/ghost_entries_bcs/*.md`; `data/scenarios/events/*.json`

---

## ⛔ DO NOT AUTO-APPLY — GATED LANE

**Every suggested form in this packet requires native-speaker Bosnian LQA sign-off before any edit is committed.** This is an automated leakage scan produced by a NON-native auditor. The plan's global stop rule applies: *"Stop when a term requires native-speaker judgment."* Diacritic-restoration looks mechanical but interacts with ijekavian reflexes and proper-noun spelling; do not run a blanket `c→č` script. Nothing in this packet authorizes a code/locale/data change. The auditor changed **no** source, locale, or data file — only this report was created.

---

## Summary

| Metric | Count | Notes |
|---|---|---|
| Locale dictionaries present | 2 | `en` (3175 lines) + `bcs` (2817 lines). `SUPPORTED_LOCALES = ['en','bcs']`. |
| Distinct `bs`/`hr`/`sr` dictionaries | **0** | The non-EN locale is a single combined **`bcs`** dictionary, not separate bs/hr/sr. No `bs.ts`, `hr.ts`, `sr.ts` exist. |
| BCS UI strings inventoried | **~2810** | Key/value entries in `messages.bcs.ts`. |
| BCS strings carrying ≥1 proper diacritic (č/ć/š/ž/đ) | **341 (~12%)** | The other **~88%** are diacritic-stripped ASCII. |
| Suspected **hr-leak** (Croatian lexicon) | **0** | No `tjedan`, `tisuća`, `stožer`, `satnija`, `bojna`, `postrojba`, `nazočn`, `tijekom`, Croatian month names. |
| Suspected **sr-leak / ekavian** | **0** | No `covek`, `reč/rec`, `mleko`, `vreme`, `posle`, `ovde`, `gde`, `nedelja`. Consistently **ijekavian** (`prije`, `poslije`, `sljedeći`, `vrijeme`, `dvije` — 73 hits). |
| **Diacritic** issues (systemic) | **~2469 entries affected** (2810 − 341) | The dominant and effectively the *only* category of defect. |
| đ-transliteration inconsistency | **2 conventions, ~24 entries** | `medunarod`/`izmedu` (đ→d, ~12) vs `medjunarod`/`izmedju` (đ→dj digraph, in verdict/inbox blocks). |
| Event/essay JSON localizations with bcs/bs field | **0** | `data/scenarios/events/*.json` carry **no** `localizations`/`bcs` blocks — EN-only. |
| BCS Codex ghost-entry sidecars | **20** `.md` files in `data/codex/ghost_entries_bcs/` | All fully diacritic-stripped (see below). |

**Confidence note.** The *leakage* finding (no Croatian, no Serbian/ekavian) is **high confidence** — it is a negative result from explicit term-list and reflex checks, and negatives are robust. The *diacritic* finding is **high confidence** as a systemic defect but **per-string suggested forms are med/low confidence** and gated: restoring č vs ć and handling đ correctly is exactly where native judgment is required. Honest signal budget: the real story here is "good lexical register, broken orthography," not scattered dialect leakage.

---

## Headline Finding

**The `bcs` dictionary is lexically and dialectally Bosnian (ijekavian, no Croatian or Serbian vocabulary), but its orthography is broken: ~88% of strings have their diacritics (č, ć, š, ž, đ) stripped to bare ASCII.** The stripping is *inconsistent* — the same word appears both correct and stripped across the file, proving multiple uneven authoring passes rather than a deliberate ASCII-only policy:

- `settings.tab.a11y` = `Pristupačnost` (correct) **vs** `settings.audio.soundscape.label` = `audio signale **takticke** karte` (should be `taktičke`).
- `mainMenu.loadGame` = `Učitaj igru` (correct) **vs** `oob.loadSaveHelp` = `**Ucitaj** zapis...` (should be `Učitaj`).
- `armyHqCorps.locked` = `ZAKLJUČANO` (correct) **vs** dozens of `kriticno`/`kritičan` both appearing.

If a native pass standardizes diacritics, the file becomes production-grade Bosnian with no register rework needed.

---

## Findings Table

Issue codes: **DIA** = diacritic stripped/incorrect · **DJ** = đ transliteration inconsistency · **hr-leak** / **sr-leak** / **ekavian** = dialect leakage · **uncertain** = needs native call. All rows are **needs-native-review = Y** (gated lane).

### A. Systemic diacritic stripping (representative sample — pattern repeats across ~2469 entries)

| File:line | Current string (excerpt) | Issue | Suggested Bosnian form | Conf. |
|---|---|---|---|---|
| messages.bcs.ts:16 | `Ponovo pokreni uvodni **vodic**...` | DIA | `vodič` | high |
| messages.bcs.ts:18 | `audio signale **takticke** karte` | DIA | `taktičke` | high |
| messages.bcs.ts:20 | `Glavna **jacina** zvuka` | DIA | `jačina` | high |
| messages.bcs.ts:45 | `Dijagnostika **rusenja**` | DIA | `rušenja` | high |
| messages.bcs.ts:46 | `Lokalno **cuva** izvještaje...` | DIA | `čuva` | high |
| messages.bcs.ts:48 | `mogu **ukljuciti**... **greske**... **ukljucuju**... **biljeske**... **korisnicka**... **salju**` | DIA (6 in one string) | `uključiti / greške / uključuju / bilješke / korisnička / šalju` | high |
| messages.bcs.ts:201 | `'opsPlanning.narrative.classified': '**OGRANICENO**'` | DIA | `OGRANIČENO` | high |
| messages.bcs.ts:214 | `'...g2Chief': '**Nacelnik** G-2'` | DIA | `Načelnik` | high |
| messages.bcs.ts:405–408 | `RATNI **ZLOCINI** - **OSUDEN** / OSLOBODEN / **OPTUZEN** / UMRO PRIJE **SUDENJA**` | DIA | `ZLOČINI / OSUĐEN / OPTUŽEN / SUĐENJA` | high |
| messages.bcs.ts:801 | `'operationsSection.emptyHelp': '**Cekaju** se naredbe...'` | DIA | `Čekaju` | high |
| messages.bcs.ts:884 | `'sectorsSection.stance.elastic': '**ELASTICNO**'` | DIA | `ELASTIČNO` | high |
| messages.bcs.ts:1329 | `'formationDetail.disrupted': '**POREMECENO**'` | DIA | `POREMEĆENO` | high |
| messages.bcs.ts:1462 | `'officerEvent.recommended': '**Preporuceno**'` | DIA | `Preporučeno` | high |
| messages.bcs.ts:1533 | `'replay.casualties': '**Žrtve**'` (correct ž) vs many stripped | DIA (inconsistency exemplar) | n/a — shows file is mixed | high |
| messages.bcs.ts:1839 | `'settlement.ethnicity.bosniaks': '**Bosnjaci**'` | DIA | `Bošnjaci` | high |
| messages.bcs.ts:2027 | `Nema zabiljezenih događaja...` | DIA (`zabiljezenih`) + correct `događaja` in same line | `zabilježenih` | high |
| messages.bcs.ts:2194 | `**Osudjeno** zbog genocida...` | DIA+DJ | `Osuđeno` | high |
| messages.bcs.ts:2775 | `Drzite Sarajevo, Tuzlu, Zenicu, **Bihac**...` | DIA (proper nouns) | `Držite ... Bihać` | med (proper-noun spelling — native call) |

### B. đ-digraph inconsistency (two conventions, both wrong)

| File:line | Current string | Issue | Suggested Bosnian form | Conf. |
|---|---|---|---|---|
| messages.bcs.ts:1435 | `situation.ivp` / `Medunarodni pritisak (IVP)` (đ→d) | DJ | `Međunarodni` | high |
| messages.bcs.ts:1621 | `'strategicPosition.internationalStanding': '**Medunarodni** polozaj'` | DIA+DJ | `Međunarodni položaj` | high |
| messages.bcs.ts:2173 | `'verdict.report.internationalCondemnation': '**Medjunarodna** osuda'` (đ→dj) | DJ | `Međunarodna` | high |
| messages.bcs.ts:2198 | `'verdict.dimension.internationalStanding': '**Medjunarodni** polozaj'` | DIA+DJ | `Međunarodni položaj` | high |
| messages.bcs.ts:2115 | `Ravnoteza **izmedju** brzine...` (đ→dj) | DJ | `između` | high |
| messages.bcs.ts:445 | `Most za **nadjacavanje** naredbe...` | DIA+DJ | `nadjačavanje` (the `dj` here is ambiguous č/đ — **native call**) | med |
| messages.bcs.ts:2780 | `...koridor **izmedju** istocnih...` | DJ | `između` | high |

> Note: lines 2173–2248 (`verdict.*`) and 2774–2785 (`inbox.openingBrief.*`) use the `dj` digraph convention; the rest of the file uses bare `d`. A native pass should standardize on the real character **đ** and reconcile both blocks.

### C. Dialect leakage (Croatian / Serbian)

| Check | Result | Conf. |
|---|---|---|
| Croatian lexicon (`tjedan`, `tisuća`, `stožer`, `satnija`, `bojna`, `postrojba`, `nazočn`, `tijekom`, month names siječ/svib/kolov/...) | **None found** — file uses `sedmica` (week), `štab`-equivalent (diacritic-stripped `stab`), `bataljon`-style. | high |
| Serbian ekavian (`covek`, `rec`, `mleko`, `vreme`, `posle`, `ovde`, `gde`, `nedelja`, `uspeh`) | **None found** — consistently ijekavian. | high |
| Cyrillic characters | **None** — Latin script throughout. | high |

**No hr-leak or sr-leak rows.** This is the clean part of the audit.

### D. Codex BCS ghost-entry sidecars (`data/codex/ghost_entries_bcs/`, 20 files)

| File | Issue | Example | Suggested | Conf. |
|---|---|---|---|---|
| `cleansing_refused.md` | DIA throughout | `Odbijeno **etnicko ciscenje**`, `**zlocin**`, `dogadjaj` | `etničko čišćenje`, `zločin`, `događaj` | high |
| `winter_held.md` | DIA throughout | `Zima je **izdrzana**`, `**citanju**`, `**zabiljezila**` | `izdržana`, `čitanju`, `zabilježila` | high |
| (other 18 sidecars share the identical boilerplate paragraph) | DIA throughout | `dogadjaj` (đ→dj), `historijska sjenka` (ijekavian OK) | restore č/ć/š/ž/đ | high |

These 20 files are **lexically Bosnian and ijekavian-correct** but **100% diacritic-stripped**, same root cause as the UI dictionary.

---

## EN-only surfaces (what still needs a `bs` pass / has no localization at all)

1. **Event content** — `data/scenarios/events/war_1992–1995.json` and `consequences.json` carry **no `localizations`/`bcs` field**. All event titles/descriptions/choice text are **EN-only** in data; only whatever is surfaced through `messages.*.ts` keys is translatable. Any future bs event pass needs a localization schema added to these JSONs first (none exists today).
2. **Codex essays** (the main, non-ghost essays) — only the 20 *ghost* entries have BCS sidecars. The primary historical essays were not in this scan's confirmed BCS set; treat as **EN-only until proven otherwise**.
3. **EN dictionary itself** — `messages.en.ts` has **3175** lines vs bcs **2817**; the bcs dictionary is a `Partial<Record<MessageKey,string>>`, so **~360 keys fall back to English at runtime** (the `t()` resolver in `index.ts:84` does `dictionaries[locale][key] ?? enMessages[key]`). These untranslated keys are a coverage gap, not leakage. A native pass should diff the keysets to enumerate exactly which keys are missing.

No hardcoded Croatian/Serbian strings were found leaking into EN or BCS-tagged content.

---

## Readiness checklist for the future native bs pass

- [ ] **Decide locale identity:** keep one combined `bcs`, or split into `bs`/`hr`/`sr`? Current code hardwires `bcs` only (`index.ts`, `messages.bcs.ts`). A true `bs` split is an architecture decision, not an LQA edit.
- [ ] **Diacritic restoration (the big one):** native pass over ~2469 stripped UI entries + 20 ghost sidecars. **Do NOT script a blind `c→č`** — č vs ć, s vs š, z vs ž, and đ are context-dependent.
- [ ] **Standardize đ:** pick the real character `đ`; reconcile the `medjunarod`/`izmedju` (verdict/inbox) block with the `medunarod`/`izmedu` block.
- [ ] **Proper-noun spelling:** `Bihać`, `Bošnjaci`, `Žepa`, `Goražde`, etc. — verify diacritics on place/ethnonym names (historian + native).
- [ ] **Keyset diff:** enumerate the ~360 EN-fallback keys missing from `messages.bcs.ts` and translate them.
- [ ] **Event JSON localization schema:** if events are to be localized, add a `localizations.bcs` block design first (none exists).
- [ ] **Add a deterministic leakage test** (plan Phase 1): assert no Croatian/Serbian terms and (optionally) flag diacritic-stripped entries, with an explicit allowlist.
- [ ] **Visual-fit pass** (plan Phase 3): restored diacritics do not change string length materially, but verify dense Warroom/ORBAT controls after the pass.

---

## Methodology + Caveat

- **Inventory:** read `messages.bcs.ts` in full (all 2817 lines), `index.ts`, sampled `messages.en.ts` line count, listed `data/` localization surfaces, read 2 of 20 BCS ghost sidecars in full and confirmed the rest share boilerplate.
- **Leakage detection:** ran the plan's Croatian/Serbian term lists plus an ekavian-reflex check and an ijekavian-positive check (Grep, content mode). Counted diacritic coverage and đ-digraph variants.
- **Caveat — I am NOT a native Bosnian speaker.** Every suggested form is a candidate, not a verdict. The negative leakage result (no hr/sr) is high-confidence because it derives from explicit term lists; the diacritic suggestions are mechanical-looking but gated because č/ć/đ and ijekavian reflexes need a native eye. I did not fabricate confidence: where a call is genuinely ambiguous (proper nouns, `nadjačavanje`), it is marked med/low.
- **No files were modified** except the creation of this packet. `git status --short` shows exactly one new file.
