# RB6 replacements: 13 bot operation-name slots

Seats: historian + narrative designer. No repo file edited. Pool read from `C:/Pyrrhic/AWWV-worktrees/ui-patriarch/src/sim/combat/operation_names.ts` (HEAD `cfe33dc8f`, branch `claude/ui-bb-pages`) and `historical_operation_names.ts`.

Replace each string IN ITS SLOT (same array index). Pool lengths stay 38 / 39 / 35, as pinned in `tests/operation_name_collision.test.ts`, so `pickOperationName` (hash % length) selects the same slots as before.

Slot indices below are 0-based positions in each array as it stands in the file (RS_NAMES lines 73-120, RBiH_NAMES lines 129-172, HRHB_NAMES lines 181-220).

## 1. Replacement table

| faction | slot idx (line) | old | NEW | fallback 1 | fallback 2 | collision check summary |
|---|---|---|---|---|---|---|
| RS | 16 (line 99) | Operacija Vihor | **Operacija Granit** | Operacija Kremen | Operacija Plato | See section 2. Zero hits everywhere. Mineral, same register as Čelik / Kamen / Gvožđe. |
| RS | 28 (line 111) | Operacija Odmazda | **Operacija Smreka** | Operacija Prelaz | Operacija Zaravan | Zero hits. Spruce tree, same register as Hrast / Bor / Topola / Javor. (Prelaz = mountain crossing, Zaravan = plateau.) |
| RS | 30 (line 113) | Operacija Udar | **Operacija Nasip** | Operacija Pregrada | Operacija Utvrda | Zero hits. Embankment, fortification register next to Bedem / Redut / Bastion. (Pregrada = barrier, Utvrda = stronghold.) |
| RBiH | 12 (line 146) | Operacija Sabur | **Operacija Temelj** | Operacija Korijen | Operacija Obnova | Zero operation hits. One unrelated common-noun hit in docs (a translation sample). Aspirational and constructive (foundation), keeps the virtue register without the religious term. Obnova is a weaker second fallback: it can read as post-war reconstruction. |
| RBiH | 15 (line 149) | Operacija Hajka | **Operacija Ždral** | Operacija Vidra | Operacija Divokoza | Zero hits, also checked in the ICTY-garbled spelling (`@dral`, `}dral`). Crane, a plain animal in the ARBiH animal style (Tigar-Sloboda). |
| RBiH | 17 (line 151) | Operacija Oluja | **Operacija Snijeg** | Operacija Povjetarac | Operacija Mraz | Zero hits. Weather, like Kiša. Removes the collision with the real HV Oluja. |
| RBiH | 22 (line 156) | Operacija Džihad | **Operacija Prevoj** | Operacija Sidro | Operacija Kompas | Zero hits (earlier historian ranking confirmed and re-checked). Mountain pass, geography register of Neretva / Grmeč / Trebević. |
| RBiH | 23 (line 157) | Operacija Gazija | **Operacija Vedrina** | Operacija Slana | Operacija Izmaglica | Zero hits. Clear weather / serenity: weather plus aspirational in one word. |
| RBiH | 25 (line 159) | Operacija Grad | **Operacija Magla** | Operacija Povodanj | Operacija Studen | Zero hits. Fog, weather slot (Grad was weather, so the register is kept). Povodanj = flood, Studen = cold spell. |
| HRHB | 8 (line 194) | Operacija Bljesak | **Operacija Bujica** | Operacija Zapuh | Operacija Vrtlog | Zero hits. Torrent: punchy water/weather force. |
| HRHB | 10 (line 196) | Operacija Vihor | **Operacija Mećava** | Operacija Huk | Operacija Kovitlac | Zero hits, also checked in the ICTY-garbled spelling (`me}ava`, `me]ava`). Blizzard. Distinct from the RS slot, which previously shared the name Vihor. |
| HRHB | 13 (line 199) | Operacija Udar | **Operacija Mlaz** | Operacija Prelom | Operacija Sijevak | Zero hits. Jet / gush: punchy, concrete. Distinct from the RS slot, which previously shared the name Udar. |
| HRHB | 26 (line 212) | Operacija Proboj | **Operacija Zalet** | Operacija Napon | Operacija Okret | Zero hits. Run-up / impetus: force metaphor with no military term. |

Index note: 0-based, computed mechanically from the file with awk (RS 'Sjever' = 0). The old strings are unique within each pool, so replacing by string is equivalent to replacing by slot.

All 13 NEW names are mutually distinct, are absent from all three pools and the reserved list (stem match with diacritics folded, same rule as `normalizeOperationNameStem`), and none equals a named paramilitary unit in `data/source/oob/paramilitary_named_units.ts` (Patriotska Liga / Green Berets, HOS, White Eagles; guard test `tests/paramilitary_name_pool_exclusion.test.ts`). The fallbacks are also distinct from the NEW names and from each other, except Povodanj and Zapuh, each used once.

## 2. Collision check method and results

Method (diacritics folded, whole-word, case-insensitive):
- (a) Pools and reserved list: parsed from `operation_names.ts` and `historical_operation_names.ts`.
- (b) Authored names: every `Operacija|Operation|Operacije|Operaciju|Op.` + word in `src`, `data/scenarios`, `data/derived` (non-geojson, knowledge_base excluded), `tests`, `tools`, `scripts`, `docs` (1,586 distinct following-words; `data/derived` has no `*operation*` file, only `operational*`), plus a bare-word search over all `src/sim/**/*.ts` (pre_planned, triggered, opportunity catalogues, event code) and all `data/scenarios/**/*.json` (events, essays, ids and titles) and all `docs/**/*.md`.
- (c) Real operations: `Operation "<name>"` and bare-word search over the full BB1 and BB2 text (`pdftotext -layout` of `docs/Balkan_BattlegroundsI.pdf`, `II.pdf`) and over the ICTY texts on disk (Karadžić TJ, Mladić TJ vol. 1-4, Prlić TJ vol. 1-6, Hadžihasanović-Kubura TJ and AJ, Halilović TJ, Delić TJ, Orić TJ, Krajišnik, Kordić, Blaškić, Brđanin, Krstić, Milošević 98bis and others in the scratchpad). A short web search for the finalists (Operacija Prevoj / Granit / Okop / Smreka / Bujica / Nalet / Zalet / Mećava / Temelj / Lasta / Snijeg / Magla / Vedrina / Sidro) returned no such operation; the web search is weak evidence (no OR support) and only a supplement.

Result for all 13 NEW names and all fallbacks listed above: 0 operation-form hits and 0 bare-word hits in BB1/BB2/ICTY; 0 hits in pools, reserved list and authored catalogues. Exceptions noted: Temelj has one bare common-noun hit in a docs translation sample (not an operation).

Rejected candidates worth recording (so nobody re-proposes them):
- Okop: BB1 names a JNA exercise "OKOP" (1991, Slovenia period). Not an operation, but a real JNA name.
- Lasta: the RS MUP special police battalion "Lasta" (BB1, BB2 Treskavica order of battle). Real unit name.
- Jasen: Jasenovac echo. Brijeg, Kula, Vrh, Greda, Dolina: settlement or authored-text hits. Duga, Iskra, Zrno, Jela, Kesten, Prevlaka: many bare hits (place names or firms).
- Nalet: "zračni nalet" = air raid, a weapon-system and bombing connotation. Nevera: reads as a typo of "nevjera" (infidelity). Uspon, Pritisak, Naval, Zaokret: authored scenario text uses them.
- Inje (a 5th Inje Brigade unit name in BB2), Rosa (a person's name in data and one ICTY hit), Zamet (Rijeka district).

Connotation read (d): no replacement is religious, ethnic, weapon-system, a hunting-of-people metaphor, or a reprisal term. Divokoza (fallback) is a hunted animal but not a people-hunt metaphor. Spelling (e): Ždral, Mećava keep the correct diacritics. Natural-Bosnian-reading risk: Vedrina and Temelj are slightly literary; both are standard words. If the owner prefers plainer, use Povjetarac for Gazija's slot and Korijen for Sabur's slot (both zero hits).

## 3. Text elsewhere that quotes the 13 old names

Searched whole repo (src, tests, tools, scripts, data, docs, .claude, handoffs, logs) for `Operacija|Operation|Op` + old name, and for the bare words (Džihad/Dzihad, Hajka, Gazija, Odmazda, Sabur, Vihor, Bljesak, Proboj, Udar); excluded `data/derived/latest_run_final_save.json`, `docs/PROJECT_LEDGER_ARCHIVE*`, `docs/70_archive`, node_modules, git-ignored run output dirs (`runs`, `saves`, `tmp`). Settlement and municipality names (a village "Proboj" in `data/source*/master_municipalities.json`, OSM geojson, etc.) and the common nouns udar/proboj/grad in UI copy are not operation quotes and are not listed.

All paths relative to `C:/Pyrrhic/AWWV-worktrees/ui-patriarch/`.

### 3a. Must update with the rename (live source)
- `src/sim/combat/operation_names.ts`: slot lines 99 (Vihor), 111 (Odmazda), 113 (Udar), 146 (Sabur), 149 (Hajka), 151 (Oluja), 156 (Džihad), 157 (Gazija), 159 (Grad), 194 (Bljesak), 196 (Vihor), 199 (Udar), 212 (Proboj). The trailing English comments on those lines must change too (e.g. line 156 `// Struggle (spiritual, not holy war)`, line 146 `// Patience (Islamic virtue)`). Header comment line 12 ("ARBiH: ... aspirational, Islamic terms") and the section banner line 124 ("weather, animals, aspirational, Islamic") describe a style that no longer holds after this change (Ihlas, Zavet, Šahin, Ćuprija remain as the only Turkish/Islamic-register entries); wording update optional.

### 3b. Fixture that uses a name but does not depend on the pool (optional)
- `tests/ui/settlement_timeline_i18n.test.ts:346` (`operation_display_name: 'Operacija Proboj'`), `:366`, `:368` (expect strings). The test passes a literal display name; it does not read the pool. Safe to leave. If wanted, change to any neutral name for consistency (all three lines together).
- `tests/operation_name_collision.test.ts`: pins pool lengths 38/39/35 only; no old names. No change needed. No other test names an old string (`tests/paramilitary_name_pool_exclusion.test.ts` checks only paramilitary unit names).

### 3c. Planning and design docs (forward-looking, update optional)
- `docs/plans/2026-11-15-pre-freeze-work-list.md:42` (row C4 `RB6 "Operacija Džihad"`): update status when the change lands.
- `docs/plans/2026-03-21-army-hq-nerve-center-v2.md:45, 64, 92` (mockups: "Op SABUR", "Op Sabur").
- `docs/plans/2026-03-22-operation-detail-redesign.md:37` ("Operation Vihor is in RECOVERY ..." example sentence).
- `docs/60_visualisations/three_commanders_api_report.html:770` (sample briefing "continues Vihor"; a recorded API run).
- `docs/40_reports/implemented/20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md:84` (Vihor/Whirlwind), `:88` ("Dzihad/Struggle", the "Islamic terms" placeholder list, plus Sabur), `:92` (Bljesak/Flash, Udar/Strike). Historical implementation record of the original placeholder pool; leave and add a rename note if wanted.
- `docs/40_reports/implemented/20260312_INTEL_GATED_OPERATIONS.md:108` (Džihad), `docs/40_reports/20260326_DEPLOYMENT_AND_COMBAT_AUDIT.md:136` (Gazija).

### 3d. Measured-run evidence (leave as is; the names are what those runs actually produced)
- `docs/40_reports/CALIBRATION_MASTER.md`: 104 (VRS Grom/Vihor), 882, 884, 886 (Sabur), 1740, 1744 (Operacija Oluja, an ARBiH bot op), 1822 (Sabur), 3778, 3801, 3803, 3808 (Bljesak, HRHB bot op), 4469 (`Operacija Džihad:t32`).
- `docs/PROJECT_LEDGER.md`: 1094 (Džihad), 1103 (Vihor), 2050, 2074 (Bljesak), 9778 (`arbih_3rd_corps:Operacija Džihad:t32`), 12297 (Sabur), 12381, 12385 (Oluja), 13157 (Sabur).
- `docs/ledger/fragments/2026-11-14-rf-ai2-readiness-gate.md:19` (Džihad), `:28` (Vihor).
- `docs/40_reports/REAL_WAR_MASTER.md`: 984 (Vihor), 1008 (Gazija), 1033 (Džihad), 1883 (Udar).
- `docs/40_reports/diagnostics/20260501_operation_delivery_audit_n1605.md:29, 91` (Hajka); `20260502_phase5b_force_ratio_188w_evidence.md:185` (Hajka); `20260502_phase5_force_ratio_n1607_evidence.md:198` (Grad).
- `docs/40_reports/20260919_OPERATION_LIFECYCLE_ENGINE_HEALTH_AUDIT.md:206, 207` (Odmazda, Udar, Vihor lists), `:409` (Odmazda); `20260811_SARAJEVO_ROMANIJA_DRINA_CORRIDOR_MISMATCH_TRIAGE.md:1281` (Sabur, Odmazda); `20260824_FROZEN_VRS_FRONT_ROOT_CAUSE.md:13` (Vihor); `20261114_UNHELD_POCKETS_DIAGNOSIS.md:351` (Odmazda).
- `docs/40_reports/audits/`: `20260522_ARC_DELTA_N1954_N1955_WAVE1.md:358, 360` (Udar); `20260522_ARC_DELTA_N1955_N1956_WAVE2.md:106, 108, 128, 445, 519` (Gazija, Oluja, Udar); `20260522_ARC_DELTA_N1956_N1958_8_FIXES.md:188, 520` (Gazija, Oluja); `20260522_ARC_FINAL_N1956_N1961_14_FIXES.md:63, 65` (Gazija, Oluja); `20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md:112, 268` (Sabur); `20260522_WAVE_20_N1984_VERIFICATION.md:169, 215` (Udar); `20260522_WAVE_4_HVO_UNBLOCK_N1963.md:339` (Džihad, Grad); `20261105_live_jan1993/attribution/RESULT.md:174` (Gazija).
- `docs/40_reports/implemented/20260507_PERSONA_PROMPT_RESTRUCTURE.md:34, 77`, `20260507_D3_PERSONA_SUPPRESSOR_VALIDATION.md:89`, `20260509_V090_COST_LEDGER_PROSECUTORIAL_PHASE_1.md:37` (all "Operacija Oluja", discussing the real HV operation).
- `docs/PROJECT_LEDGER_KNOWLEDGE.md:160` and `logs/prusac-diagnostic-20260929/sana_ivanjska_joint_validation_plan.md:1471, 1483` (Bljesak, HRHB bot op); `logs/bc04/n392-receipts.json:12559-12560` (`vrs_east_bosnian:Operacija Udar:t167`).
- Saved-run evidence: `docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json` (Džihad, Hajka, Oluja) and `historical-acceptance-turn70-autosave.json` (Hajka, Oluja). Old saves keep old names in `used_operation_names` and `operation_history`; harmless, display only.
- Recommendation: do not rewrite these; the measured names are the provenance of the run. A one-line rename map in the RB6 ledger fragment is enough (Vihor/Odmazda/Udar RS, Sabur/Hajka/Oluja/Džihad/Gazija/Grad RBiH, Bljesak/Vihor/Udar/Proboj HRHB, to the NEW names above). Note the pool picker keeps the same slot, so a re-run labels the same operation with the new name, which makes label-keyed comparisons with old runs (e.g. the `n427` / `Operacija Džihad:t32` row at CALIBRATION_MASTER.md:4469) need the map.

### 3e. Quotes of the REAL historical operations (not pool quotes; leave unchanged, they are correct history)
- Oluja (HV, Aug 1995): `data/scenarios/essays/essay_index.json:3897, 3899`; `data/scenarios/events/consequences.json:5109`; `src/ui/map/i18n/messages.bcs.ts:1139` (`aar.notable.storm`); `docs/00_start_here/VODIC_ZA_NOVE_IGRACE.md:81`; the 13 persona files `tools/claude_plays_vrs/personas/*.json` (line 22-31 each), which tell the model NOT to call an ARBiH operation "Operacija Oluja".
- Bljesak (HV, May 1995): `data/scenarios/essays/essay_index.json:3785, 3787`.
- Proboj, as an ordinary noun or part of an essay/event title, not an operation name: `data/scenarios/essays/essay_index.json:2728, 4137, 4647`; `data/scenarios/events/war_1993.json:1330-1347` (option "Pokrenuti proboj"); `src/ui/map/i18n/messages.bcs.ts:2166, 3609, 3666`.
- `docs/40_reports/proposals/20260522_HRHB_OP_CATALOG_PROPOSAL.md:119` (notes a source variant "Vihor" for an HVO Posavina counterstrike) and `docs/40_reports/proposals/20261114_PRE_1_0_REALISM_AUDIT.md:124` (Gazija in a table of bot ops).

## 4. Housekeeping the implementer should know

- Reserved list is unaffected. Real operation names that the old pool carried (Sabur, Oluja, Bljesak, Udar, Proboj) are now gone from the pool, so adding them to `RESERVED_HISTORICAL_OPERATION_NAMES` is optional and would prevent future re-introduction. (Sabur-95: Delić TJ para 393; Udar and Proboj: Karadžić TJ paras 4954, 4948; Oluja, Bljesak: BB1.)
- After the swap, run `tests/operation_name_collision.test.ts`, `tests/paramilitary_name_pool_exclusion.test.ts`, `tests/stupcanica_w27_trigger_fix.test.ts`, `tests/sector_offensive.test.ts` and `tests/ui_adapter_boundary.test.ts` (the ones that import the pool). Determinism: slot count unchanged; only the label strings of the 13 slots change; startup-baked ops that stored an old name keep it until the snapshot is re-baked.
- Tone check by the narrative seat: every NEW name is a plain concrete noun; none can read as a boast, a threat or a slur in the player-visible AAR and Chronicle text that quotes it.
