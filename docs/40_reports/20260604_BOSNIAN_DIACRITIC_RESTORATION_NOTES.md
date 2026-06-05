# Bosnian (bcs) Diacritic Restoration — Conservative, Evidence-Based Pass

**Date:** 2026-06-04
**Target file:** `src/ui/map/i18n/messages.bcs.ts` (only message VALUES modified; keys/structure untouched)
**Companion audit:** `origin/claude/bosnian-lqa-audit:docs/40_reports/20260604_BOSNIAN_LQA_LEAKAGE_AUDIT.md`

---

## ⛔ DO NOT MERGE WITHOUT NATIVE BOSNIAN LQA REVIEW

This is an **automated, conservative, NON-native restoration**. It deliberately restores
**only** diacritics it can justify from (a) the file's own correct spellings and (b) a small
explicit list of unambiguous standard forms. It does **NOT** resolve č-vs-ć, ambiguous ijekavian
reflexes, or proper-noun spelling beyond what is certain. **A native Bosnian speaker must sign off
before this is merged.** ~1,500 stripped tokens were left untouched on purpose (see §4).

---

## 1. What was done

A blind `c→č` script is wrong (č vs ć, đ vs dj, ijekavian reflexes need native judgment), so the
restoration is **evidence-driven and whitelist-bounded**:

1. **File-own evidence.** Tokenized every message value. For any word that appears **elsewhere in
   the same file fully diacriticked**, that spelling is treated as authoritative and its
   ASCII-stripped duplicates are restored to match. 146 distinct diacriticked word-forms were found;
   **all 146 were internally unambiguous** (each stripped form mapped to exactly one diacritic
   spelling — zero internal contradictions).
2. **High-confidence common-word list.** A small, explicit list of standard Bosnian forms whose
   diacritic placement is certain and carries **no č/ć doubt and no meaning-flipping homograph**
   (e.g. `može`, `drži`, `položaj`, `još`, `štab`, `čeka(ju)`, `jačina`, `taktičke`, `površina`,
   `izložen`, `oružjem`, `režim`). Plus the war-crimes labels the task called out:
   `ZLOČINI / OSUĐEN / OSLOBOĐEN / OPTUŽEN / SUĐENJA`, and `etnička`, `zločina`.
3. **đ reconciliation.** Both stripped conventions (`medjunarod`/`medunarod`, `izmedju`/`izmedu`,
   `osudjen`/`osuden`, `dogadjaj`) standardized to the real character **đ**
   (`međunarod-`, `između`, `osuđen-`, `događaj`) — only where high-confidence.
4. **Interpolation-safe.** `{cost}`, `{strain}`, `{current}` and all other `{…}` placeholder spans
   are copied verbatim — never tokenized or altered. Keys, quoting, indentation, and TS structure
   are byte-preserved except inside the affected value strings.

### Deliberate exclusions (homographs left for native review)
`sto` (što vs sto=100/table), `most` (bridge), `nas` (naš vs nas=us), `sam` (sâm vs sam=am),
`vise` (više vs ...), `znaci` (znači vs znaci=signs), `opstaje/opstanak` (no š), plus all function
words (`se, su, smo, za, iz, uz, bez, sa, s, ne`). When a token's correct diacritics were ambiguous
and it did **not** appear correctly elsewhere in the file, it was **left unchanged**.

---

## 2. Counts

| Metric | Count |
|---|---|
| Locale entries (value lines) in file | 2810 |
| **Distinct entries changed** | **242** |
| **Total token occurrences restored** | **279** |
| — from file's own evidence | 10 |
| — from high-confidence word list | 239 |
| — đ reconciliation pass | 17 |
| — war-crimes / common-word pass | 13 |
| Evidence word-forms found in file (all unambiguous) | 146 |
| Ambiguous evidence forms (>1 spelling, never auto-applied) | 0 |

The evidence-only yield is small (10 occurrences) because most stripped words have **no**
correctly-spelled twin elsewhere in the file; they exist only in stripped form. The bulk of the
safe restoration therefore comes from the bounded high-confidence list, not from guessing.

### The 5 file-evidence tokens (restored from the file's own correct spelling)
| Stripped | Restored | Occurrences | Context check |
|---|---|---|---|
| `sljedeci` | `sljedeći` | 1 | adjective "next" |
| `vec` | `već` | 2 | adverb "already" |
| `kosta` | `košta` | 2 | verb "costs" |
| `vas` | `vaš` | 4 | all four are possessive "your" (verified in context) |
| `odlucite` | `odlučite` | 1 | verb "decide" |

---

## 3. Tests updated (stale assertions)

The restoration corrected strings that several i18n tests asserted in their **old stripped form**.
Those assertions were bumped to the corrected Bosnian text (the locale is now more correct; the test
fixtures had simply frozen the stripped spelling):

16 test files updated (all in `tests/ui/`). Only tokens **actually restored in the locale** were
bumped; homograph tokens the pass deliberately left stripped (e.g. `takticke`, `Sto`, `nas`,
`Preporucujem`, `ocekuje`, `Nacelnik`, proper nouns) were kept stripped in the assertions:

- `settings_screen_i18n.test.ts` — `jacina→jačina` (kept `takticke` — not restored)
- `advance_turn_button_gated_feedback.test.ts` — `cekanju→čekanju`
- `chief_of_staff_briefing_i18n.test.ts` — `polozaj→položaj`, `Stab→Štab`, `jos→još`, `vasu→vašu`, `ceka/Ceka→čeka/Čeka`, `vase→vaše`, `duze→duže`, `cekamo→čekamo`, `izlozen→izložen`
- `emergency_posture_confirm.test.ts` — `Stab armije→Štab armije`
- `endgame_interaction_proof.test.ts` — `Medjunarodni polozaj→Međunarodni položaj`, `Medjunarodna→Međunarodna`, `Osudjeno→Osuđeno`, `medjunarodni→međunarodni`, `duze→duže`
- `presidential_decision_room.test.ts` — `cekanju→čekanju` (3×), `zlocina→zločina`, `Staba→Štaba`
- `presidential_decision_room_panel_i18n.test.ts` — `sljedeci→sljedeći`, `Sta→Šta`
- `warroom_priority_docket.test.ts` — `cekanju→čekanju`
- `war_summary_empty_states.test.ts` — `cekanju→čekanju`
- `war_summary_opsec_reconciliation.test.ts` — `polozaj→položaj`
- `war_summary_campaign_cost_i18n.test.ts` — `staba→štaba`, `oruzjem→oružjem`
- `war_summary_personnel_label.test.ts` — `oruzjem→oružjem`
- `codex_panel_dynamic_mount.test.ts` — `duze→duže`
- `turn_aftermath.test.ts` — `jos→još`
- `inbox_dedup.test.ts` — `cekaju→čekaju`, `vasu→vašu`, `Drzite→Držite`

Full UI i18n suite (`tests/ui/` + `tests/ui_i18n.test.ts`): **1024/1024 passing** after bumps.

---

## 4. LEFT UNCHANGED — needs native review

**~1,504 distinct stripped tokens (≈3,409 occurrences)** that plausibly need diacritics were
left untouched because their correct diacritics are ambiguous to a non-native auditor and the file
provides no internal evidence. These are NOT errors in this pass — they are the remaining native-LQA
workload. High-frequency examples a native reviewer should adjudicate first:

`pregled(75)` · `komandni(52)` · `predsjednicki(27)` · `cijena(28)` · `komandant(26)` ·
`procjena(19)` · `kohezija(17)` · `uspjelo(18)` · `posljedica(10)` · `predsjednicka/predsjednicke/predsjednicku` ·
`procjene/procjenu` · `pobjeda/pobjedu/pobjede` · `oficir/oficira/oficiri` · `ratistu/ratista` ·
`okrsaj/okrsaja/okrsaji` (→ likely `okršaj`) · `rusenja` (→ `rušenja`) · `zabiljezeno/zabiljezena/zabiljezenih` (→ `zabilježen-`) ·
`uravnotezeno/uravnotezen` (→ `uravnotežen-`) · `kriticnu/kriticnom` (→ `kritičn-`) ·
`predsjednicki/predsjednickih` (→ `predsjednički`) · `tumacenje` · `ucinak` · `nadjacavanje` (č vs đ — explicitly ambiguous) ·
`bihac/bosnjaci/zenicu/srebrenici/srebrenicka` (proper nouns — `Bihać`, `Bošnjaci`, `Zenicu`, `Srebrenici`, `Srebrenička` — historian+native call).

Most of these are **genuinely Bosnian words that almost certainly need a diacritic**, but the exact
diacritic (č vs ć especially) requires a native eye. The full token list is reproducible from the
restoration tooling; this section lists the highest-frequency representatives.

> Note on a verified non-trivial case: `stapskog → štapskog` (line 2788) is **correct** — the
> adjective from `štab` undergoes the standard b→p shift before `-ski` (`štab → štapski`). It is a
> legitimate restoration, not a typo, and is included in the applied pass.

---

## 5. Verification

- `tsc --noEmit --skipLibCheck` on `messages.bcs.ts` → **PASS** (exit 0).
- Runtime import of the locale → **PASS** (2810 keys intact, structure unchanged).
- `git diff --check` → clean (no whitespace errors).
- i18n test suites → updated stale assertions (§3); see commit for the green run.
- `npm run desktop:map:build` → see commit notes for pass/fail.

---

## 6. Honest caveat

I am **not** a native Bosnian speaker. The evidence-based restorations and the bounded common-word
list are high-confidence, but final orthographic sign-off — especially č vs ć, the remaining ~1,500
stripped tokens, and proper-noun spelling — **requires native LQA before merge.**
