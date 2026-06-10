# PR #374 — 4-Lens Pyrrhic Panel Review: BCS Localizations for Omarska + Višegrad Atrocity Essays

**Date:** 2026-06-10
**PR:** #374 `content(§6): BCS localizations + triggers for 2 atrocity essays (ICTY-grounded DRAFT)` — branch `content/bcs-atrocity-essays-omarska-visegrad`, DRAFT, HELD
**Panel authority:** Standing owner delegation — owner signature assumed IF the panel signs off; §6-sensitive content requires a UNANIMOUS 4-lens verdict. This panel carries the native-speaker review hold.
**Scope reviewed:** Full PR diff (1 file, `data/scenarios/essays/essay_index.json`, 3 insertions / 3 deletions); `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`; `docs/40_reports/20260529_PROVENANCE_GAP_INVESTIGATION.md` §3.5/§5.1; standalone EN source essays (`data/scenarios/essays/omarska_camp_1992.json`, `visegrad_1992.json`); trigger events in `data/scenarios/events/war_1992.json`; existing BCS corpus in the index (146 BCS rows: 136 boilerplate, 10 real prose).
**CI at review time:** ALL GREEN — typecheck ×2, test, full-suite, scenarios, scenario-anchors, structural-fingerprint, Event system validation, desktop-release-check, desktop-packaged-runtime-probe (10/10 pass).

---

## VERDICT: **BLOCK** (narrow respin — not unanimous GO)

- HISTORIAN: **BLOCK** (1 material finding — Vasiljević victim count)
- NARRATIVE/LANGUAGE: **BLOCK** (2 grammar errors in atrocity-central sentences)
- CANON/§6: **GO**
- RED-TEAM: **CONCUR-BLOCK** (no additional blockers; concurs with lenses 1–2)

Per the verdict rules, any lens BLOCK = the panel does NOT sign. The PR stays HELD and returns to the owner — **with a precise, small respin list below**. Every blocking item is a one-clause fix; the translation as a whole is high quality and close to shippable.

---

## Lens 1 — HISTORIAN (factual accuracy vs ICTY)

**Verdict: BLOCK (one material finding; remainder verified accurate).**

### MATERIAL — H1. Drina riverbank victim count (Višegrad, ¶4)

BCS: *"Presuda u predmetu Vasiljević posebno je obradila **ubistvo sedmorice Bošnjaka** na obali Drine 7. juna 1992…"*

ICTY *Vasiljević* (IT-98-32-T, 29 Nov 2002) found: **seven** Bosniak men were taken to the Drina bank and shot on 7 June 1992; **five were killed** (Meho Džafić, Ekrem Džafić, Hasan Kustura, Hasan Mutapčić, Amir Kurtalić); **two survived** by feigning death (witnesses VG-14 and VG-32) and became the chamber's key witnesses. Vasiljević was convicted of the **murder of five** and inhumane acts against the two survivors.

"Ubistvo sedmorice" ("the murder of seven") inflates the death count by two and erases the two survivors. The error is **inherited from the English source essay** ("the killing of seven Bosniak men") — but the BCS phrasing hard-commits to it, and the lens instruction ("no inflated/deflated numbers vs ICTY findings") binds against the ICTY record, not just against the EN text. In memorial-grade atrocity content, a wrong victim count is exactly the class of defect this gate exists to stop.

**Required fix (BCS):** e.g. *"Presuda u predmetu Vasiljević posebno je obradila strijeljanje na obali Drine 7. juna 1992, kada je sedam Bošnjaka odvedeno na obalu rijeke — petorica su ubijena, dvojica preživjela — utvrdivši krivicu optuženog kao učesnika u udruženom zločinačkom poduhvatu."*
**Required pairing:** the EN sentence in `data/scenarios/essays/visegrad_1992.json` (and its index copy, pinned by the sync test) carries the same defect and must be corrected in the same respin or an immediately-paired PR (e.g. *"…the Drina riverbank shooting of 7 June 1992, in which seven Bosniak men were taken to the bank and shot — five were killed, two survived…"*).

### Verified accurate (spot-checked against ICTY)

- **Omarska:** iron-ore complex repurposed late May 1992 under Prijedor Crisis Staff + police ✓ (*Stakić* IT-97-24-T); ~3,000 Bosniak/Croat detainees + small number of women ✓ (*Kvočka* IT-98-30/1-T); white house / red house / hangar / Restoran layout and functions ✓; Željko Mejakić camp commander + shift-commander hierarchy + outside armed visitors unrestrained by camp authorities ✓ (*Kvočka*); daily beatings, call-outs, killings, documented sexual violence ✓ (*Tadić*, *Kvočka*); *Tadić* as first completed ICTY trial ✓; ITN/Marshall/Williams revelation, Fikret Alić image ✓; Manjača/Trnopolje transfers, killings during closure ✓; *Karadžić* scheduled-facilities framing ✓; ArcelorMittal postwar ownership ✓.
- **Višegrad:** pre-war Bosniak majority, >13,000 (1991 census ~13,471) ✓; JNA (Užice Corps) checkpoint/disarmament pattern, mid-April control, mid-May formal withdrawal ✓ (BB Vol. I, *Lukić & Lukić*); Milan Lukić returned from abroad, led group known as White Eagles ✓; Pionirska street fire 14 June ~70 ✓ and Bikavac 27 June ~70 ✓ ("approximately seventy" matches the chambers' own summary language; trial chamber proved 59 and "at least 60" named victims respectively — "približno sedamdeset" is the judgment-summary form, acceptable); bodies thrown from the bridge ✓; reduction to a few hundred survivors ✓; *Karadžić* scheduled-municipality + Assembly-minutes/intercepts campaign architecture ✓.
- **No new factual claim** appears in the BCS beyond the EN source apparatus. Confirmed sentence-by-sentence.

### Inherited EN imprecisions (NOT blocking — note-level, pre-existing, carried faithfully)

- H2. ITN access dated "6 August 1992"; the crew's camp visit is most commonly dated **5 August** with broadcast 6 August (the event row's own `historical_source` says "ITN broadcast 6 August 1992", so the index/event are internally consistent). Follow-up: consider "početkom augusta" or splitting visit/broadcast.
- H3. "južno od Prijedora" mirrors EN "south of Prijedor"; the Omarska complex is more precisely south-east of Prijedor town. Cosmetic.
- H4. Fikret Alić's famous image was shot at **Trnopolje**, not Omarska; the essay does not claim otherwise, but in an Omarska essay the framing invites the misreading. Optional clarifying clause in a follow-up EN+BCS pass.

---

## Lens 2 — NARRATIVE / LANGUAGE (BCS prose quality)

**Verdict: BLOCK (two grammar errors a native speaker would not write, in atrocity-central sentences; otherwise strong).**

Overall assessment: the register is exactly right — documentary, restrained, dignified, the ICTY-summary voice the gate §4 demands. Ijekavian is consistent; Bosnian-standard lexical choices (`općina`, `hiljada`, `sedmica`, `historija`, `uslovi`, `sprat`, `Švicarska`, `odbrana`, `-isati/-ovati` verb forms, `Savjet`, `vijeće`, `čovječnost`, `zatočenici`) are correct throughout. The boilerplate it replaces was an embarrassment ("the English title left inside the Bosnian body"); this is a real memorial translation. But the panel is standing in for the owner's native red pen, and the red pen catches:

### MATERIAL — L1. Pionirska sentence agreement error (Višegrad, ¶3)

*"…uključujući spaljivanje **žive** približno sedamdeset **osoba Bošnjaka** u kući u Pionirskoj ulici 14. juna…"*

"žive" fails case agreement (the numeral-governed NP requires genitive plural **"živih"**), and "sedamdeset osoba Bošnjaka" is a clumsy double genitive. As written, a native reader stumbles — in the single most important sentence of the essay. **Fix:** *"…uključujući spaljivanje približno sedamdeset živih Bošnjaka u kući u Pionirskoj ulici 14. juna…"* or restructure: *"…u kući u Pionirskoj ulici, u kojoj je 14. juna živo spaljeno približno sedamdeset Bošnjaka…"*

### MATERIAL — L2. Garbled adverb (Omarska, ¶2)

*"…i premlaćivani ako se procijenilo da se **prespori** kreću."*

Needs the adverb: **"da se kreću presporo"** (or *"da su prespori"*). As written it is ungrammatical.

### Note-level (owner-preference / polish — follow-up task, not blocking)

- L3. **Calques:** "tijelo stražara" for "a body of guards" (reads as a physical body; prefer *"sastav stražara"*); "u neuobičajenom detalju" (prefer *"neuobičajeno detaljno"*); "oklop JNA" for "JNA armour" (prefer *"oklopne jedinice JNA"*); "s privatnim računima prema određenim zatočenicima" (prefer *"koji su imali privatne račune s pojedinim zatočenicima"*); final Višegrad sentence ("čini kontrast … nemogućim da ga … zaobiđe") is a heavy English-syntax calque — meaning survives, but *"kontrast … koji nijedan pošten historijski zapis ne može zaobići"* is what a native would write.
- L4. "dok su srpske formacije ostavile naoružane" (Višegrad ¶2) — grammatically forced to the correct parse (JNA subject, formations object) but garden-paths; *"dok su srpske formacije ostavljene naoružane"* is unambiguous. Meaning-sensitive spot (who armed whom), worth the one-word fix.
- L5. **Corpus consistency:** the 10 existing real BCS rows decline the tribunal as **"ICTY-a"/"ICTY-em"** (8+1 occurrences); this PR uses "ICTY-ja"/"ICTY-jem" throughout. Both are defensible; pick one corpus-wide (owner call) — recommend conforming to the existing "ICTY-a".
- L6. "uopšte" (Omarska ¶4): Bosnian prescriptive standard (Halilović) prefers **"uopće"**; "uopšte" is common in practice. The automated purity guard does not cover this pair. Owner call.

### The 5 flagged wording points — rulings

| # | Flagged point | Ruling |
|---|---|---|
| 1 | Register consistency (ijekavian throughout) | **PASS with notes** — ijekavian consistent; only "uopšte" (L6) and the L3 calques flagged; "razina" is acceptable Bosnian. |
| 2 | Place/name forms | **PASS with one owner call** — "Mehmed-paše Sokolovića" ✓ (standard hyphenation + genitive); "Pionirska ulica" ✓; "Bikavac" ✓; "Krizni štab" ✓; "Restoran" ✓; "bijela kuća"/"crvena kuća" ✓ (matches survivor/judgment usage). **"Beli orlovi": recommend KEEP** — it is the group's own (Serbian) proper name and the dominant rendering in Bosnian press and BCS ICTY transcripts; "Bijeli orlovi" would ijekavianize a proper noun. Final call remains the owner's. |
| 3 | Andrić title | **PASS** — "Na Drini ćuprija" is the canonical title; the title-line fix ("Visegrad: na drini cuprija" → "Višegrad: Na Drini ćuprija, 1992") is correct and overdue. |
| 4 | Tone | **PASS** — dignified, documentary, neither clinical-cold nor euphemistic; "geografija patnje" and the closing literary contrast are both present in the EN source. The L1/L2 grammar errors are the only thing undercutting memorial-grade polish. |
| 5 | Faithfulness | **PARTIAL** — no claim added, no claim dropped in substance; two slips: (a) EN "three thousand Bosniak and Croat **men**" → BCS drops "muškaraca" (the contrast with "manji broj žena" implies it, but add the word); (b) the inherited EN errors (H1 Vasiljević count — material; H2/H3 — minor) are carried faithfully, which is the one place faithfulness and accuracy conflict. Accuracy wins: fix both languages. |

---

## Lens 3 — CANON / §6 COMPLIANCE

**Verdict: GO.**

- **No erasure, no softening, no both-sidesing.** Every perpetrator name (Mejakić, Milan Lukić), every crime category (killings, daily beatings, sexual violence, burnings alive, expulsion), every victim number in the EN record is carried into the BCS. Nothing is attenuated; nothing is editorialized. "Zločini protiv čovječnosti" is named as such where the tribunal found it (§4: no euphemism — satisfied).
- **Victims named per the documented record:** only Fikret Alić (public historical figure, named in the EN source) — §5 constraint satisfied; no new named victims introduced.
- **No reward framing:** essays are Ring 2 representation; this PR adds prose to existing indexed rows. No unlock-as-reward change, no Pyrrhic-score surface, no player option.
- **Triggers correct and untouched:** `omarska_camp_1992` (RS controls Prijedor ≥0.5 AND `war_crimes_above` RS >2, turns 14–30) and `visegrad_1992` (RS controls Višegrad ≥0.5, turns 12–30) are discrete deterministic game-state predicates — §1 Ring-3 #11 compliant (no calendar-driven firing), representation-only marker rows with no response options, carrying the §3.6 forward-looking guard in their `source_note`s. **This PR does not modify them** (verified: diff touches only `essay_index.json`).
- **Calibration-inert claim VERIFIED:** the only changed file is `data/scenarios/essays/essay_index.json`; the sim-side consumer (`src/sim/codex/dynamic_section_builder.ts`) reads only `dynamic_sections` join keys — untouched by this diff (its own comments state the sim "consumes the build result without re-reading essay_index"). UI consumers: `CodexPanel.tsx`, `codexEssayResolver.ts`. CI confirms: scenarios, scenario-anchors, and structural-fingerprint all green.
- **§6 sign-off table:** "Change to atrocity event content / New essay touching atrocity" requires `/historian` + `/narrative-designer` — both seats sat on this panel. No "reward for atrocity" effect is possible from this diff, so the non-delegable user-approval row is not triggered; the standing delegation covers the rest.
- This PR is precisely the "gated localization / sensitive-history content lane" that `20260529_PROVENANCE_GAP_INVESTIGATION.md` §3.5/§5.1 deferred to — correctly routed through the gate, correctly HELD as draft.

*Observation (pre-existing, out of scope):* the gate §5 unlock model says "all historical essays are available from scenario start," while the codex resolver reports these essays as unlocking on their trigger events (tier 0/FIXED). That tension predates this PR and is an architecture/canon reconciliation question for the codex tier system, not a defect of this diff.

---

## Lens 4 — RED-TEAM

**Verdict: CONCUR-BLOCK (no independent blocker found; concurs with H1, L1, L2).**

Attack surface examined:

1. **Meaning-changing mistranslation hunt:** sentence-by-sentence EN↔BCS comparison found none that invert or shift culpability, scale, or agency. Worst candidates are H1 (count, inherited) and the L3/L4 calques (awkward, not meaning-changing). The Karadžić "instruments of a campaign" paragraph — the most §6-sensitive attribution prose in the PR — is rendered exactly.
2. **Ahistorical trigger firing:** both triggers require RS control of the specific municipality (Omarska additionally RS war-crimes count) — they cannot fire for the wrong faction or in a war where the precondition never emerges. Turn windows (12/14–30) bound them to 1992. Untouched by the diff. No exposure.
3. **Schema/index regression:** diff is 3 replaced JSON string values inside existing `localizations.bcs` objects; `essay_index_integrity` (6), `codex_essay_localization` (9), `codex_essay_resolver` (46), sensitive-history source-notes (2), source-quality (2) all pass in CI; full-suite (3,513 tests) green. JSON validity confirmed by every consumer test.
4. **Purity-guard gap:** the automated Bosnian-purity guard's banned list does not cover "beli" (so "Beli orlovi" passed silently — in this case defensibly, as a proper noun) or "uopšte/uopće". The guard is a floor, not a substitute for native review — which is exactly why L1/L2 reached this panel. **Follow-up:** consider adding an allowlisted-proper-noun mechanism + the uopšte pair to the guard if the owner standardizes.
5. **"Faithful translation of a flawed source" loophole:** the PR's "no new claims" framing is true but would have laundered the inherited Vasiljević count error into a second language under a panel signature. That is the single most important reason this PR should not ship as-is: once the panel signs, the BCS becomes owner-authorized memorial text. Block until H1 is fixed in both languages.
6. **Hash/baseline risk:** none — no sim-consumed file touched; structural-fingerprint and scenario-anchors green; current floor (188w 649/712, `5f57d172`) cannot move from this diff.

---

## Conditions for re-submission (all small; respin should be ~5 string edits)

**Blocking (must fix before the panel will sign):**
1. **H1** — Correct the Drina riverbank sentence in BCS (5 of 7 killed, 2 survivors; suggested wording above) **and** the matching EN sentence in `visegrad_1992.json` + its index copy (sync-pinned), in this PR or an immediately-paired one.
2. **L1** — Fix the Pionirska agreement error ("spaljivanje približno sedamdeset živih Bošnjaka" or the restructured form).
3. **L2** — Fix "da se prespori kreću" → "da se kreću presporo".

**Owner-preference items to settle in the respin (one pass, no second hold needed):**
4. "Beli orlovi" (panel recommends keep) — confirm.
5. "uopšte" vs "uopće"; "ICTY-ja" vs corpus-standard "ICTY-a".

**Follow-up tasks (non-blocking, file as tasks):**
6. L3/L4 calque polish pass on both essays.
7. Restore "muškaraca" in the Omarska detainee sentence.
8. H2/H3/H4 EN-source precision pass (ITN visit date, Omarska bearing, Alić/Trnopolje clarifier) — EN + BCS together.
9. Purity-guard hardening (proper-noun allowlist; uopšte pair).
10. Canon reconciliation note: gate §5 unlock model vs codex trigger-unlock architecture (pre-existing).

---

*Panel: HISTORIAN, NARRATIVE/LANGUAGE, CANON/§6, RED-TEAM — convened 2026-06-10 under the standing owner delegation. Verdict BLOCK: the panel does not sign; PR #374 remains HELD and returns to the owner with the respin list above. The translation is near-shippable — the block is narrow and the fixes are supplied verbatim.*
