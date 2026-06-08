# Bosnian Localization LQA Audit — `messages.bcs.ts`

**Date:** 2026-06-08
**Scope:** `src/ui/map/i18n/messages.bcs.ts` (paired with `messages.en.ts`)
**Target locale:** Bosnian (bs), Latin script, ijekavian
**Mode:** READ-ONLY audit. **No source strings were changed.** All findings below are flagged for later **native-speaker review** — they are NOT applied changes.
**Related plan:** `docs/plans/2026-05-24-bosnian-localization-lqa-execution-plan.md`

---

## Summary

| Metric | Value |
|---|---|
| Total EN keys | **3294** |
| Total BCS keys | **3293** |
| Parity gaps (EN→BCS missing) | **1** (documented intentional fallback probe — not a defect) |
| Orphan BCS keys (no EN counterpart) | **0** |
| Empty BCS values | **0** |
| EN==BCS identical strings | 67 (almost all legitimate: acronyms / proper nouns / loanwords) |
| **Total strings flagged for native review** | **~12** (1 grammar, 4 diacritic/typo, ~20 consistency occurrences across 3 themes) |

**Headline:** The BCS dictionary is in **good shape**. It is consistently **ijekavian Bosnian register** — no Croatian month names, no `tjedan`, no `časnik`, no `stožer`, no `povijest`, no Serbian ekavian forms (`vreme`, `mesec`, `procena`, `sledeći`, `deo`, `mesto`) were found. An existing deterministic test (`tests/ui_i18n.test.ts`) already enforces parity, empty-value bans, orphan bans, and a forbidden-pattern leakage guard. The remaining issues are **minor**: a handful of dropped diacritics/typos, one grammar slip (`sto` vs `što`), and terminology-consistency inconsistencies (notably how "Army HQ" and the staff adjective are rendered).

> Confidence note: this is an automated/heuristic audit by a non-native pass. Bosnian, Croatian, and Serbian share most of their lexicon; only genuine register/variant/orthography issues are flagged, conservatively. **Native-speaker review remains a hard gate** before any change is applied.

---

## 1. Croatian / Serbian leakage

**Result: NONE detected at med/high confidence.** Scanned for the full Croatian and Serbian-ekavian lexeme/orthography set (40+ patterns). Cross-checked that the **Bosnian-preferred** forms are the ones actually in use:

| Concept | Bosnian form in use (count) | Croatian alt (absent) | Serbian-ekavian alt (absent) |
|---|---|---|---|
| week | `sedmica` (36) | `tjedan` (0) | `nedelja` (0) |
| officer | `oficir` (29) | `časnik` (0) | — |
| HQ/staff | `štab` (50+) | `stožer` (0) | — |
| history | `historija` (49) | `povijest` (0) | `istorija` (0) |
| supply | `snabdijevanje` (20) | `opskrba` (0) | — |
| system | `sistem` (4) | `sustav` (0) | — |
| assessment | `procjena` (29) | — | `procena` (0) |
| next | `sljedeći` (21) | — | `sledeći` (0) |
| report | `izvještaj` (26) | — | `izveštaj` (0) |
| general/municipality | `opći` / `općina` (11/7) | — | `opšti` / `opština` (0) |
| time (noun) | `vrijeme` (3) | — | `vreme` (0) |

This is exactly the Bosnian ijekavian profile expected. The existing test (`tests/ui_i18n.test.ts` → *"keeps BCS copy free of common Serbian ekavian and Croatian lexical forms"*) already locks `tjed`, `povij`, `stozer`, `casnik`, `zapov`, `opskr`, `sustav`, `vreme`, `sledec`, `procena`, `opsta`, `opstina` out at CI time.

**No leakage findings to report.** (Auditor false positives that were investigated and cleared: `vremenska/vremenom` — correct Bosnian adjectival form of `vrijeme`, not the ekavian `vreme`; `naredba` — standard/shared, correct.)

---

## 2. EN ↔ BCS parity gaps

**Result: CLEAN.** A parity-contract test already exists and passes by construction here.

- **Missing in BCS (1):** `settings.experimentalFallbackProbe` — **intentional**. Listed in `INTENTIONAL_EN_ONLY` in `tests/ui_i18n.test.ts` to keep the English-fallback path exercised. Not a defect.
- **Orphan BCS keys:** 0.
- **Empty BCS values:** 0.

Existing coverage (`tests/ui_i18n.test.ts`):
- *"translates every EN key into BCS (except documented fallback probes)"*
- *"has no orphan BCS keys without an English counterpart"*
- *"has no empty BCS or EN message values"*

No parity action required.

---

## 3. Consistency, diacritics, and grammar (the real findings)

### 3a. SEVERITY: MEDIUM — Terminology inconsistency: "Army HQ" rendering

The same English concept **"Army HQ" / "Army Headquarters"** is rendered three different ways:

| Rendering | Count | Examples |
|---|---|---|
| `Štab armije` (translated — preferred) | 13 | `armyHq.dialogTitle`, `decisionRoom.source.armyHqBriefing`, `toolbar.armyHqTitle` |
| `Armijski HQ` / `Armijskog HQ-a` (hybrid) | 4 | `operationsPanel.subtitle`, `presidentialToolbar.armyHq`, `corpsDetail.fieldSnapshotHelp`, `corpsFront.fieldSnapshotHelp` |
| left as `Army HQ` (untranslated) | 1 | `warSummary.campaignDrag.commandStrainDetail` ("...prati se u **Army HQ -> Command Relationship**.") |
| bare `HQ` | 3 | `operationsPanel.hqReview`, `corpsDetail.prepareOperationInHq`, `corpsFront.draftNewDirective` |

- **Issue:** Mixed register — full translation vs. English acronym vs. untranslated.
- **Bosnian-preferred:** Standardize on **`Štab armije`** (already the majority and the canonical military term). `warSummary.campaignDrag.commandStrainDetail` notably still carries the **fully English** tail `Army HQ -> Command Relationship` while its sibling `warSummary.note.commandStrain` is correctly translated to `Štab armije -> Komandni odnos`.
- **Confidence:** high (that an inconsistency exists). The exact preferred surface form (translate acronym vs. keep "HQ") is a **native/UX call** — short toolbar buttons may justify a clipped form, but the body-prose English leftover should be translated.

### 3b. SEVERITY: MEDIUM — Inconsistent "staff" adjective + one typo

The adjective "staff(-)" is rendered three ways:

| Form | Count | Example key |
|---|---|---|
| `štabni` / `štabnog` | 3 | `turnAftermath.narrative.quiet` (`štabnog rada`), `decisionModal.officer.staffFallback` (`Štabni oficir`) |
| `štabski` / `štabskog` | 3 | `coachmark.decisionRoom.body`, `onboarding.05.body`, `warSummary.overview.enemyControlDetail` |
| `štapski` **(typo)** | 1 | `inbox.quiet.body` — `štapskog konteksta` should be `štabskog` (or `štabnog`) |

- **Issue:** `štabni` vs `štabski` used interchangeably for "staff (context/work)"; `štapski` is an outright typo (missing the `b`, reads as "of a walking-stick").
- **Bosnian-preferred:** pick one (both `štabni` and `štabski` are acceptable; `štabni` is the more common military collocation) and fix the `štapski` typo. **Native review** to choose.
- **Confidence:** `štapski` typo = **high**; `štabni`/`štabski` harmonization = **med** (stylistic).

### 3c. SEVERITY: MEDIUM — Grammar: `sto` used where `što` (relative pronoun) is required

- **Key:** `onboarding.05.body`
- **String:** *"...Riješite **sto** možete; odgodite **sto** morate."*
- **Issue:** `sto` = "table/desk" (a noun, and indeed the deliberate translation of "President's Desk" elsewhere). Here the relative pronoun **"what"** is meant → must be **`što`**. Correct: *"Riješite **što** možete; odgodite **što** morate."*
- Same risk exists conceptually wherever "desk" (`sto`) and "what" (`što`) co-occur, but only this one string actually misuses it.
- **Bosnian-preferred:** `što` (both occurrences in this string).
- **Confidence:** high.

### 3d. SEVERITY: LOW — Dropped diacritics (typos)

ASCII forms where a diacritic was dropped (render as wrong/awkward Bosnian):

| Key | String fragment | Should be |
|---|---|---|
| `onboarding.02.body` | "...kontrolna **ploca**..." | `ploča` |
| `advanceTurn.warning` | "...Ovo se ne može **ponistiti**." | `poništiti` |
| `turnAftermath.narrative.mixed` | "...**ostavljajuci** štabu..." | `ostavljajući` |
| `advanceTurn.blockedSummary` | "...ili **stabne** blokere..." | `štabne` |

- **Confidence:** high (clear orthography errors). Note `ć/č/š/đ/ž` must be preserved; these four are the only confirmed drops in the dictionary (the broader `stab*` matches were `stabiliz-/stabil-` loanword false positives and are fine).

### 3e. SEVERITY: INFO — EN==BCS identical strings (67)

Reviewed all 67. They fall into expected, legitimate categories and are **not** defects:
- **Acronyms / labels:** `KIA`, `WIA`, `MIA/POW`, `OPSEC`, `MVP`, `IVP`, `XP`, `na` (N/A), `OZ`-style codes.
- **Proper nouns / loanwords:** `Dayton`, `Brčko`, `Balkan Battlegrounds`, `Schwerpunkt`, `tempo`, `RS`, `momentum`.
- **Pure interpolation templates:** `{label} ({detail}).`, `{label}: {headline}` (no translatable text).
- **`signal`** (`turnAftermath.memoryTone.signal`) — single-word token; borderline (could be `signal` either way in BS, so fine).

No action needed, but a native reviewer may wish to localize a few borderline UI tokens (e.g. `tempo`, `momentum` in `operationsPanel`/`operationsSection`) if a Bosnian term is preferred over the international loanword — **low priority, native call.**

---

## Existing test coverage (note)

`tests/ui_i18n.test.ts` already provides a strong deterministic contract:
- Full EN→BCS parity (minus documented probe), no orphans, no empties.
- A forbidden-pattern leakage guard (Croatian + Serbian-ekavian lexemes).
- Specific copy assertions (e.g. `deskAuthority.recovers` "up to … friction" wording in both locales).

**Recommendation for the leakage guard (later, with native sign-off):** consider extending the forbidden list to also catch dropped-diacritic typos that the current ASCII patterns miss — but the current guard is intentionally ASCII-insensitive in places, so any addition must avoid false positives on loanwords (`stabilizovati`, etc.). Do not add until native review confirms the target forms.

---

## Prioritized action list (for native review, NOT yet applied)

| # | Sev | Key(s) | Issue | Suggested (native-confirm) |
|---|---|---|---|---|
| 1 | MED | `warSummary.campaignDrag.commandStrainDetail` | English `Army HQ -> Command Relationship` left untranslated | translate to `Štab armije -> Komandni odnos` (match sibling) |
| 2 | MED | 4 `Armijski HQ` + 3 bare `HQ` keys | "Army HQ" rendered 3 ways | standardize on `Štab armije` (UX may keep clipped form for buttons) |
| 3 | MED | `inbox.quiet.body` | `štapskog` typo | `štabskog` / `štabnog` |
| 4 | MED | `štabni` vs `štabski` (6 keys) | inconsistent staff adjective | harmonize on one |
| 5 | MED | `onboarding.05.body` | `sto` → relative pronoun | `što` (×2) |
| 6 | LOW | `onboarding.02.body` | `ploca` | `ploča` |
| 7 | LOW | `advanceTurn.warning` | `ponistiti` | `poništiti` |
| 8 | LOW | `turnAftermath.narrative.mixed` | `ostavljajuci` | `ostavljajući` |
| 9 | LOW | `advanceTurn.blockedSummary` | `stabne` | `štabne` |

**All of the above are flagged for native-speaker review. None have been applied.** `messages.bcs.ts` and all code remain unmodified by this audit.
