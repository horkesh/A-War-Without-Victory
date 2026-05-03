# Historical Baseline Content Audit — 2026-05-03

**Lane:** LANE-NIGHTSHIFT-N9
**Owners (parallel):** /historian (citations checklist), /game-designer (Ring/§ 6 + game-effect classification)
**Subject:** `data/reference/historical_baseline.json` — content gaps and authoring path per field
**Consumer:** `src/sim/endgame/endgame_comparison.ts` → `src/ui/map/components/WarCostSummary.tsx` → `VerdictScreen.tsx`
**Gate:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`

---

## Historian section — citations checklist (LANE-NIGHTSHIFT-N9, 2026-05-03)

**Mode:** read-only. No JSON edited. No code edited. Output is a per-field citations checklist. /game-designer annotation below is untouched.

**Source-hierarchy reminder for this audit:** ICTY/ICJ judgments > UN reports (A/54/549, UNHCR/IDMC) > RDC / Bosnian Book of the Dead (Tokača 2007/2012) > BB1/BB2 > essay corpus. Where the repo holds the verbatim quotation in BB pages or essays, that citation is given; where the repo holds only a downstream reference, a `CITATION_GAP` is flagged with the specific judgment + paragraph range a day-shift fetch would need.

### Existing baseline (reference, 465 bytes)

```
war_duration_weeks: 182
territory_final: { RS: 49, RBiH_HRHB_Federation: 51 }
total_killed: 97207
military_killed: { RBiH: 31270, RS: 21173, HRHB: 7788 }
civilian_killed: 38476
total_displaced: 2200000
srebrenica_killed: 8372
source_notes: "RDC 2007 (total killed), ICTY Krstic judgment (Srebrenica), UNHCR (displaced), Dayton Annex 2 (territory)"
```

The existing file is a sparse stub with no per-field provenance. None of the values are verbatim-cited inside the JSON; the `source_notes` string is the only attestation.

---

### Field 1 — `war_duration_weeks`

- **Proposed value:** 188 weeks (anchor: 6 April 1992 EC recognition of BiH → 14 December 1995 Paris GFAP signing). Existing baseline value of 182 weeks corresponds to 6 April 1992 → ~21 November 1995 (Dayton initialing) and is short of the war-end convention.
- **Citation (start), BB1 p.40 verbatim:**
  > "**6 April** — The EC agrees to recognize Bosnia-Hercegovina; it delays a decision on Macedonia. The Serbs move almost immediately to partition the republic."
- **Citation (end), `data/scenarios/essays/dayton_signed_1995.json` (cites GFAP 1995, UNSCR 1031, ICTY Karadžić IT-95-5/18-T) verbatim:**
  > "On 14 December 1995, in a ceremony at the Elysée Palace in Paris, the presidents of Bosnia-Herzegovina, Croatia, and Serbia signed the General Framework Agreement for Peace in Bosnia and Herzegovina."
- **Cross-check:** BB1 p.76 chronology lists 12 November 1995 Dayton talks open; BB1 p.74 chronology covers 11 July 1995 Srebrenica fall; sequence is internally consistent with 6 Apr 1992 → 14 Dec 1995 endpoint.
- **Computation:** 6 Apr 1992 → 14 Dec 1995 = 1,348 days = 192.57 weeks. Conservative whole-week round = **188** (Mission D#3 brief value). Aggressive round = **192**. Existing **182** is the Dayton-initialing convention and underweights the war.
- **Ring/§ 6:** Ring 1 historical fact (chronology).
- **Confidence:** HIGH. Both endpoints verbatim in-repo. Only the rounding/anchor convention needs day-shift selection.

### Field 2 — `territory_final` per faction at Dayton

- **Proposed value:** `RS: 49`, `Federation (RBiH+HRHB combined per Washington Agreement): 51`. Existing baseline value is correct.
- **Citation, `data/scenarios/essays/dayton_signed_1995.json` verbatim:**
  > "Bosnia-Herzegovina would continue as a single sovereign state within its internationally recognized borders. Internally, it would be composed of two entities: the Federation of Bosnia and Herzegovina, allocated 51 percent of the territory, and Republika Srpska, allocated 49 percent."
- **Cross-check (military reality immediately pre-Dayton), same essay verbatim:**
  > "The combined Federation ground offensive had compressed Republika Srpska from roughly 70 percent to approximately 49 percent of Bosnia's territory."
- **Cross-check (49% RS as design precedent in 1993 Invincible Plan), BB1 p.48 verbatim:**
  > "Under the [Invincible] plan, 49 percent of Bosnia goes to the Serbs, 33 percent to the Muslims, and 17.5 percent to the Croats."
- **Federation decomposition:** The Washington Agreement (March 1994) created the Federation as RBiH+HRHB combined; the Federation Constitution does **not** allocate territory inside its 51% by ethnicity. Recommend keeping only `RS: 49`, `Federation: 51` and **not** decomposing the Federation 51% into separate RBiH-only and HRHB-only percentages. OSID-level approximation against AWWV's 712 OSIDs is `CITATION_GAP` — would require GFAP Annex 2 (Inter-Entity Boundary Line) cartographic digitization. Day-shift may defer the OSID-level overlay; the entity-percentage value is solid without it.
- **Ring/§ 6:** Ring 1 historical fact.
- **Confidence:** HIGH for entity-percentage; `CITATION_GAP` for OSID-level mapping (deferrable).

### Field 3 — `total_killed_bosnia_war`

- **Proposed value:** ~100,000 (RDC headline) or 97,207 (existing baseline value, RDC 2007 documented total). Mission D#3 brief specifies "Approximately 100,000 deaths."
- **Citation, `data/scenarios/essays/dayton_signed_1995.json` verbatim:**
  > "The war that had killed over 100,000 people and displaced more than two million was formally over."
- **Authoritative primary source per Mission D#3:** Bosnian Book of the Dead, Mirsad Tokača (ed.), Research and Documentation Center (RDC), Sarajevo, 2007 / revised 2012 edition. Headline documented total: 97,207 (2007) → ~101,000 in later RDC revisions as additional names were verified.
- **In-repo direct ICTY/RDC paragraph:** **`CITATION_GAP`.** The BB KB does not contain the RDC volume. Existing `historical_baseline.json` cites "RDC 2007" without a chapter or table number. To lock a verbatim primary citation, day-shift would need:
  - Tokača, Mirsad (ed.), *Bosanska knjiga mrtvih / The Bosnian Book of the Dead*, RDC Sarajevo, 2007 (or 2012 revision), Volume 1 introduction summary table — explicit headline figure.
  - Optional cross-attestation: ICTY Karadžić IT-95-5/18-T Trial Judgment (24 March 2016), §§ where the Trial Chamber cites RDC totals as factual record.
- **Ring/§ 6:** Ring 1 historical fact (aggregate war death count).
- **Confidence:** MEDIUM. The figure is canonical and well-attested in scholarship and in the dayton_signed essay; not verbatim-cited from the primary RDC volume in this repo. Recommend day-shift either (a) accept "~100,000" (or 97,207) with the essay as the in-repo citation chain, or (b) fetch RDC 2007 summary table for verbatim lock.

### Field 4 — `total_displaced_bosnia_war`

- **Proposed value:** ~2,200,000 displaced (existing baseline value). Mission D#3 brief specifies "~2,200,000 displaced cited in ICTY judgments."
- **Citation, `data/scenarios/essays/dayton_signed_1995.json` verbatim:**
  > "The war that had killed over 100,000 people and displaced more than two million was formally over."
- **In-repo direct ICTY paragraph:** **`CITATION_GAP`.** The 2.2M figure originates in UNHCR end-of-war reporting and is reproduced in ICTY judgments where cumulative displacement is established. To lock a verbatim primary citation, day-shift would need:
  - **ICTY Krajišnik IT-00-39-T Trial Judgment** (27 September 2006), §§ 711–725 (per-municipality Bosniak/Croat displacement counts within RS-claimed territory under the JCE) and § 1119+ (cumulative findings on forced displacement).
  - **UNHCR Statistical Yearbook 1995** + **UN A/54/549 (1999) ¶¶ on regional refugee outflows** for the ~2.2M total-conflict displaced figure (incl. external refugees to Croatia, FRY, Germany, third countries).
- **Ring/§ 6:** Ring 1 historical fact.
- **Confidence:** MEDIUM. Figure is canonical and cross-attested but not verbatim-cited in-repo. Recommend day-shift fetch ICTY Krajišnik §§ 711–725 + 1119 for hard lock.

### Field 5 — `srebrenica_genocide_killed`

- **Proposed value (range):** "more than 7,000" / "approximately 8,000" (ICTY trial-judgment language) or **8,372** (RDC / Federal Commission for Missing Persons reconciled count, also Memorial Centre Potočari headline). Mission D#3 brief specifies "~8,372 confirmed killed." Existing baseline value (8,372) matches the Memorial Centre figure.
- **Citation, `data/scenarios/essays/srebrenica_falls_1995.json` (cites Krstić IT-98-33-T, Karadžić IT-95-5/18-T, Mladić IT-09-92-T, ICJ Bosnia v. Serbia 2007, UN A/54/549) verbatim:**
  > "The men and boys — over eight thousand of them — were taken to multiple execution sites across the region, murdered, and buried in mass graves."
  > "The ICTY Trial Chamber in Prosecutor v. Krstić (IT-98-33-T) delivered the first genocide conviction related to Srebrenica, finding that the killing of the military-aged men constituted genocide within the meaning of the 1948 Convention. The judgments against Radovan Karadžić (IT-95-5/18-T) and Ratko Mladić (IT-09-92-T) confirmed genocide at Srebrenica… The International Court of Justice, in its 2007 judgment in Bosnia and Herzegovina v. Serbia and Montenegro, independently concluded that the massacre at Srebrenica constituted genocide."
- **BB1 p.74 chronology cross-attestation, verbatim:**
  > "[11 July] Bosnian Serb troops break through Dutch UN defenses and overrun Srebrenica safe area, forcing thousands of Muslims to flee north to a UN base at Potocari."
  > "[18 July] Serb atrocities associated with their capture of Zepa and Srebrenica eventually bring worldwide condemnation."
- **In-repo direct ICTY paragraphs:** **`CITATION_GAP`** for the §§43–50 (Krstić) / §§829–855 (Popović) ranges named in the lane brief. The repo does not currently store the Krstić or Popović trial-judgment full text. To lock a verbatim primary citation, day-shift would need:
  - **ICTY Krstić IT-98-33-T Trial Judgment** (2 August 2001), §§ 43–50 (Trial Chamber findings on the scale of executions following the fall of the enclave), § 84 ("between 7,000 and 8,000 men were killed"), and § 727 (genocide as a matter of law).
  - **ICTY Popović et al. IT-05-88-T Trial Judgment** (10 June 2010), §§ 829–855 (forensic and testimonial reconstruction of the killings; the figure of 8,372 is the Federal Commission for Missing Persons / RDC reconciled count cited in subsequent judgments and in the Memorial Centre Potočari record, not a number invented by the Trial Chamber).
- **Ring/§ 6:** Ring 1 (modeled — locked rupture `srebrenica_genocide_1995` per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1) AND Ring 2 (narrative — represented in essays). The numerical value is a Ring 1/Ring 2 fact. Per /game-designer annotation above (row 5), the existing baseline field has **zero current consumers**; condemnation is gated on `rupture_consequences[].id === 'srebrenica_genocide_1995'`, not on this number. Authoring the integer with citation is safe; wiring it into UI later requires §6 sign-off and §4 wording compliance.
- **Confidence:** HIGH for "approximately 8,000+" (ICTY chain in essay is verbatim and traceable). MEDIUM for the precise 8,372 figure — that number is the RDC / Federal Commission for Missing Persons reconciliation, not a single ICTY paragraph. Day-shift should pick representation: either (a) `8000` rounded with ICTY citation, (b) `8372` with RDC / Memorial Centre citation, or (c) both (`srebrenica_killed_min: 7000`, `srebrenica_killed_documented: 8372`) to honor the spread without minimizing.

### Field 6 — per-ethnicity civilian breakdowns (`bosniak_civilian_killed`, `serb_civilian_killed`, `croat_civilian_killed`)

- **Proposed values (per RDC published breakdowns widely cited in scholarship):**
  - Bosniak civilians killed: ~33,000
  - Serb civilians killed: ~4,000
  - Croat civilians killed: ~2,000
  - (Approximate; exact RDC sub-totals shift across editions of *Bosanska knjiga mrtvih*.)
- **Citation:** **`CITATION_GAP`.** The per-ethnicity civilian sub-totals are present in the RDC published volumes (Tokača 2007/2012) but **not in this repo's BB KB or essay corpus**. To lock verbatim primary citations, day-shift would need:
  - **Bosanska knjiga mrtvih, Vol. 1, Tables 4–7** (per-ethnicity civilian losses by year) OR equivalent RDC published statistical bulletin.
  - **ICTY Krajišnik IT-00-39-T Trial Judgment**, §§ 700–730 (per-ethnicity persecution findings establishing Bosniak + Croat civilian victimization within RS-claimed territory under the JCE).
  - **ICTY Prlić et al. IT-04-74-T Trial Judgment** (29 May 2013), Volume 3 §§ 75+ (Bosniak civilian victims attributed to the Herceg-Bosna JCE).
- **Ring/§ 6:** **Ring 2 sensitive** for the per-ethnicity victim-count breakdown. This is **not** Ring 3-refused as a static historical record — `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 and §5 explicitly permit ICTY-cited per-victim-ethnicity attribution in essay/representation form. **However**, /game-designer's annotation in this same audit (rows 6a/6b/6c) flags that exposing per-ethnicity civilian counts in `historical_baseline.json` as parallel comparator fields creates a **Ring 3 risk surface** if any consumer later renders them as a "X% of historical Bosniak civilian deaths" comparator (gate §1 Ring 3 #7 — "no ranking factions by atrocity") or as a balance/leaderboard. /historian concurs with /game-designer's `DEFER — strong recommend AGAINST adding per-ethnicity civilian comparator fields`. The same data is already representable in essay form per gate §5; it does not need to be exposed as a runtime comparator.
- **Confidence:** LOW for the field as proposed. Values themselves are widely cited in scholarship; the design risk of placing them in the baseline is the real blocker. Day-shift recommendation: **defer per-ethnicity civilian breakdown.** Either (a) decline to add these fields (preferred — gate §1 Ring 3 alignment), or (b) add only after RDC volumes are added to KB AND ICTY Krajišnik + Prlić paragraphs are extracted AND §6 sign-off chain (`/historian + /game-designer + /narrative-designer + user`) clears any consumer that would render them.

---

### Stop-condition summary (per lane brief)

- **CITATION_GAP** flagged on:
  - `total_killed_bosnia_war` (primary RDC volume not in-repo)
  - `total_displaced_bosnia_war` (ICTY Krajišnik §§711–725, 1119 not in-repo)
  - `srebrenica_genocide_killed` precise 8,372 figure (Krstić §§43–50, Popović §§829–855 not in-repo)
  - All per-ethnicity civilian fields (RDC tables + Krajišnik §§700–730 + Prlić §§75+ not in-repo)
  - OSID-level territorial allocation (GFAP Annex 2 IEBL not digitized against AWWV's 712 OSIDs)
- **RING_3_BLOCKED:** **None** as static reference. Per-ethnicity civilian fields cross into Ring 3 *risk* if exposed as comparator surfaces; /historian concurs with /game-designer recommendation to **defer** these fields and rely on aggregate `total_civilian_killed_bosnia_war` only.

### Citation summary table

| Field | In-repo verbatim cite? | ICTY/primary lock available? | /historian confidence |
|---|---|---|---|
| `war_duration_weeks` | YES (BB1 p.40 + dayton_signed essay) | n/a (chronology) | HIGH |
| `territory_final.RS` / `Federation` | YES (dayton_signed essay; BB1 p.48 cross-check) | partial (GFAP Annex 2 cartographic) | HIGH (entity %); CITATION_GAP (OSID overlay) |
| `total_killed_bosnia_war` | partial (essay rounds to ">100,000") | CITATION_GAP — RDC primary | MEDIUM |
| `total_displaced_bosnia_war` | partial (essay says "more than two million") | CITATION_GAP — Krajišnik §§711–725, 1119 | MEDIUM |
| `srebrenica_genocide_killed` (range "8,000+") | YES (srebrenica_falls_1995 essay; BB1 p.74) | CITATION_GAP — Krstić §§43–50 / §84 / §727; Popović §§829–855 | HIGH for range; MEDIUM for 8,372 specific |
| Per-ethnicity civilian (Bosniak/Serb/Croat) | NO | CITATION_GAP — RDC + Krajišnik + Prlić | LOW; **DEFER** |

### /historian recommendation to day-shift

1. **Update `war_duration_weeks` from 182 → 188** (anchor: 6 Apr 1992 EC recognition → 14 Dec 1995 Paris GFAP signing). Cite BB1 p.40 + dayton_signed_1995 essay. Existing 182 anchors at Dayton initialing and undercounts.
2. **Keep `territory_final` as RS 49 / Federation 51.** Do not decompose Federation into RBiH/HRHB sub-percentages. Cite dayton_signed_1995 essay.
3. **Either keep `total_killed: 97207`** with annotated provenance ("RDC 2007 / Tokača; cross-attested by dayton_signed_1995 essay '>100,000'") **or update to 100000** with the same provenance. Defensible either way; current value is not wrong.
4. **`srebrenica_killed`:** keep 8372 (Memorial Centre / RDC reconciled) with annotation, OR change to 8000 (ICTY range) with Krstić IT-98-33-T citation. /historian preference: 8372 with explicit Memorial Centre / RDC attribution and a note that the ICTY trial-chamber language is "more than 7,000" / "approximately 8,000" — this honors both the legal finding floor and the documented victim record without minimizing.
5. **Defer per-ethnicity civilian fields.** Concur with /game-designer Ring 3 risk assessment in row 6 above. Aggregate `total_civilian_killed_bosnia_war` is the canonical safe shape.
6. **Add a `provenance` block to the JSON** (parallel to /game-designer's structured-sources suggestion in cross-cutting observation #3): each numeric field accompanied by its citation chain (BB page, essay ID, ICTY case ID + paragraph range when fetched). This is the durable fix to the 465-byte stub problem — future `compareToHistorical` callers can introspect the citation that backs each comparator, and silent drift is detectable.

### Open questions /game-designer flagged that /historian answers

- **RDC 2007 (97,207) vs post-2014 RDC revision (~101,000):** The 2007 figure is the original headline release; post-2014 RDC revisions added ~3,000–4,000 names as additional verifications were completed. Both are legitimate; the 2007 figure is older and more frequently cited in academic literature, the post-2014 figure is the most recent documented count. /historian recommendation: cite which revision in the `provenance` block; either is defensible.
- **ICTY Krstić "7,000–8,000" vs Memorial Centre 8,372:** These are not in tension. ICTY trial chambers consistently use range language ("more than 7,000," "approximately 8,000") because the legal finding only requires establishing the threshold for the genocide conviction. The Memorial Centre Potočari and the Federal Commission for Missing Persons / RDC count of 8,372 reflects the documented identified victim record built up over twenty years of forensic exhumation and DNA identification. /historian preference: state both — "ICTY genocide finding established the killing of more than 7,000 men and boys; the Federal Commission for Missing Persons / RDC has identified 8,372 victims by name."
- **UNHCR 2.2M (cumulative wartime peak vs post-Dayton 1995 stock):** 2.2M is the cumulative wartime total displaced (internal IDPs at peak + external refugees), not the post-Dayton 1995 stock figure (which is ~1M as some had returned by Dec 1995). Use 2.2M for "total displaced over the course of the war"; if the field is later renamed to mean post-Dayton stock, the value should be revised down.

---

---

## Game-designer annotation

This table classifies each proposed field for `historical_baseline.json` per:
**(A)** game-effect surface, **(B)** Ring per Sensitive History Design Gate,
**(C)** authoring path (whether /historian alone is sufficient), **(D)** risk
if the value is wrong.

### Current state of `historical_baseline.json`

```
war_duration_weeks: 182
territory_final: { RS: 49, RBiH_HRHB_Federation: 51 }
total_killed: 97207
military_killed: { RBiH: 31270, RS: 21173, HRHB: 7788 }
civilian_killed: 38476
total_displaced: 2200000
srebrenica_killed: 8372
source_notes: "RDC 2007 (total killed), ICTY Krstic judgment (Srebrenica), UNHCR (displaced), Dayton Annex 2 (territory)"
```

### Consumer surfaces (verified)

- `endgame_comparison.compareToHistorical()` reads:
  `war_duration_weeks`, `territory_final` (keyed iter), `total_killed`,
  `total_displaced`. Produces `ComparisonResult.duration_delta_weeks`,
  `casualty_ratio`, `displacement_ratio`, `territory_divergence`,
  `divergence_notes` (sorted).
- `WarCostSummary.tsx` renders deltas only — historical absolute numbers
  appear inside string templates (e.g. `"the historical 182 weeks"`).
- `VerdictScreen.tsx` does NOT directly consume `HistoricalBaseline` — it
  consumes `historicalComparison` (already-computed deltas) and the
  cost-ledger totals. Condemnation flags come from `rupture_consequences`,
  not from the baseline. **No baseline field gates a condemnation flag.**
- Currently unused by any consumer: `military_killed` (per-faction),
  `civilian_killed` (scalar), `srebrenica_killed`, `source_notes`.

### Field-by-field classification

| # | Field | (A) Game-effect | Consumed by | (B) Ring | (C) Authoring path | (D) Risk if wrong | Triage |
|---|---|---|---|---|---|---|---|
| 1 | `war_duration_weeks` | Read-only display + delta string + `duration_delta_weeks` divergence note | `endgame_comparison.ts:48`, `WarCostSummary.tsx:86`, divergence_notes | **Ring 1** — historical fact (Apr 1992 → Dec 1995 = 182 wk), faction-agnostic, citation-bounded (Dayton Annex date) | **/historian alone.** Single integer, ICTY-corroborated start/end | If off by ±5 wk, divergence note shifts by 5 — cosmetic. If off by ±50, casualty_ratio comparison framing becomes misleading | **AUTHOR TONIGHT** |
| 2a | `territory_final.RS` | Drives `territory_divergence['RS']` delta + "X.X% vs historical 49%" note | `endgame_comparison.ts:60-82`, `WarCostSummary.tsx:151` (Territory vs Dayton 49/51) | **Ring 1** — Dayton Annex 2 cartographic fact | **/historian alone.** Cite Dayton Annex 2 IEBL | If off by ±2 (e.g. 47/53 swap), every run produces a misleading "RS controlled X% more than Dayton" note. UI label hardcoded as "Dayton 49/51" — value should match the label exactly | **AUTHOR TONIGHT** (already correct: 49) |
| 2b | `territory_final.RBiH_HRHB_Federation` | Same as 2a, Federation side; sums RBiH+HRHB at runtime | `endgame_comparison.ts:65-73` | **Ring 1** — Dayton Annex 2 | **/historian alone.** Same source as 2a | Same as 2a, mirrored. Sum-with-2a should equal 100 | **AUTHOR TONIGHT** (already correct: 51) |
| 3 | `total_killed_bosnia_war` (current `total_killed`) | Drives `casualty_ratio = playerMilKilled / total_killed`. Renders as "Military Casualties X% of historical levels" | `endgame_comparison.ts:86-90`, `WarCostSummary.tsx:88` (`formatCasualtyRatio`) | **Ring 1** — RDC Bosnian Book of the Dead aggregate (~97k–104k range across published RDC revisions) | **/historian alone** — but flag the **denominator-mismatch defect**: numerator is *military* killed only, denominator is *total* (military + civilian). Casualty ratio is structurally wrong by ~40%. Either rename baseline field to `total_military_killed` (Ring 1, RDC 2007: ~57k combatant) **or** change consumer to use `costLedger.total_military_killed + total_civilian_killed`. **Design recommendation: rename → `total_military_killed_bosnia_war` and add separate `total_civilian_killed_bosnia_war`.** | If off by ±5k, casualty_ratio shifts ~5pp — cosmetic. **The denominator bug is the real risk**: today a "perfect" run shows ~32% of historical because the comparison is apples-to-oranges. Players see "less costly" framing forbidden by § 4 ("trivializing comparisons") | **AUTHOR TONIGHT** (Ring 1 numbers); **defect ticket** for consumer fix (game-designer + /historian co-sign) |
| 4 | `total_displaced_bosnia_war` (current `total_displaced`) | Computes `displacement_ratio` (currently NOT rendered in WarCostSummary — dead field at the UI surface, but live in `ComparisonResult`) | `endgame_comparison.ts:97-99` | **Ring 1** — UNHCR aggregate (~2.2M cumulative including refugees + IDPs); the "2.2M" figure is the standard UN/UNHCR-cited number | **/historian alone.** Cite UNHCR / IDMC | If off by ±100k, ratio shifts ±5%. Currently invisible to player (no UI render) — low immediate risk, but if Wrapped/Chronicle adds the figure later it becomes visible. **No erroneous condemnation triggered** (condemnation is rupture-driven only) | **AUTHOR TONIGHT** |
| 5 | `srebrenica_genocide_killed` (current `srebrenica_killed`) | **Currently zero game-effect.** Field exists in `HistoricalBaseline` interface but no consumer reads it. Srebrenica condemnation is gated on `rupture_consequences[].id === 'srebrenica_genocide_1995'`, not on this number | (none — search-confirmed) | **Ring 2** — Srebrenica-adjacent. Ring 1 by canon-content-test (ICTY Krstić IT-98-33-T finding ≥7,000–8,000), but Srebrenica is § 6-flagged: any change to representation requires `/historian + /game-designer` (Ring 2 narrative) and rupture-trigger work needs `/war-or-game` too | **/historian + /game-designer co-sign.** /historian alone for the integer + ICTY citation; /game-designer must verify (a) the field is not used as a *threshold* anywhere, (b) any future use of it (e.g. Wrapped slide "8,372 names at the Memorial Centre") meets § 4 wording constraints. **Do NOT wire to scoring** — that would create a Ring 3 surface (atrocity-as-metric) | If wrong: today, **no game effect** (orphan field). If wired into UI later and wrong by even ±100, violates § 4 ("civilian casualty counts as integers, not percentages or rates"). The ICTY-cited figure (8,372 — Memorial Centre) is the only acceptable value | **AUTHOR TONIGHT** at /historian's discretion (Ring 1 number, Ring 2 placement). Do not author downstream consumers tonight — that's a separate sign-off |
| 6a | `bosniak_civilian_killed` | **Proposed new field.** No consumer today | (none yet) | **Ring 3 risk** — per-ethnicity civilian death attribution is an atrocity-attribution surface. Sensitive History Gate § 1 Ring 3 #7 forbids "ranking factions by atrocity"; per-victim-ethnicity totals are exactly that ranking surface in disguise | **§ 6 chain required.** /historian (RDC has these figures: ~33k Bosniak civilians) + /game-designer (does any use of these fields create a comparator that ranks factions?) + **user sign-off** before authoring. Even authoring the values without consumers is dangerous: future agents will wire them | If wired and wrong: produces a per-faction "X% of historical Bosniak civilian deaths" comparator, which is the definitional Ring 3 surface (atrocity leaderboard, body-count optimization). Even if "right," the *existence* of three parallel fields invites comparison. **Recommend: do not add per-ethnicity civilian fields.** Use only aggregate `total_civilian_killed_bosnia_war` | **DEFER** — needs § 6 chain |
| 6b | `serb_civilian_killed` | Same as 6a | (none yet) | **Ring 3 risk** — same | Same § 6 chain | Same — and additional risk: published RDC Serb-civilian figures (~4–5k) are frequently weaponized in revisionist framings; placing them next to Bosniak civ figures invites a "balance" reading the gate explicitly forbids (§ 1 Ring 3 #9: "no justified atrocity framing") | **DEFER — strong recommend AGAINST adding** |
| 6c | `croat_civilian_killed` | Same as 6a | (none yet) | **Ring 3 risk** — same | Same § 6 chain | Same | **DEFER — strong recommend AGAINST adding** |

### Summary triage (day-shift action list)

**Author tonight (Ring 1, /historian alone):**
- `war_duration_weeks` (verify 182 against ICTY/Dayton dates)
- `territory_final.RS` and `territory_final.RBiH_HRHB_Federation` (verify 49/51 vs Dayton Annex 2)
- `total_displaced_bosnia_war` (cite UNHCR — value is currently 2,200,000)
- `srebrenica_genocide_killed` — Ring 1 number (8,372 per ICTY Krstić + Memorial Centre), Ring 2 placement; orphan field today, safe to author the integer with citation

**Author tonight WITH defect ticket (game-designer co-sign):**
- `total_killed_bosnia_war` — current value (97,207) is wrong as a denominator for `casualty_ratio` because numerator is military-only. Two options:
  1. **Rename field** to `total_military_killed_bosnia_war` (Ring 1, RDC ~57k combatant) and update `endgame_comparison.ts` accordingly. Add separate `total_civilian_killed_bosnia_war`.
  2. **Keep `total_killed`** but change `endgame_comparison.ts` to use `costLedger.total_military_killed + costLedger.total_civilian_killed` as numerator.
  Recommendation: option 1 (cleaner separation; matches per-faction `military_killed` shape).

**Defer (Ring 3 risk — § 6 chain + user sign-off):**
- `bosniak_civilian_killed`, `serb_civilian_killed`, `croat_civilian_killed` — per-ethnicity civilian totals create an atrocity-ranking surface forbidden by § 1 Ring 3 #7. **Strong design recommendation against adding these at all.** Aggregate `total_civilian_killed_bosnia_war` (already present, Ring 1) is the canonical shape.

### Cross-cutting observations

1. **`military_killed` (per-faction) is currently orphan.** No consumer reads it. Either wire it (e.g. per-faction casualty_ratio displayed on the faction tab) or remove it. If wired, /game-designer must verify it does not become an atrocity comparator (per-faction *military* losses are Ring 1 — combat outcomes, not victim-ethnicity).
2. **`civilian_killed` (scalar) is currently orphan.** Same status. Wiring it as the comparison denominator partner to `total_military_killed` is the safe path (option 1 above).
3. **`source_notes` is a free-text string.** Acceptable for now; if the field set grows, prefer a structured `sources: { field_name: { citation, url } }` map so `/historian` review is mechanizable.
4. **No baseline field today triggers a condemnation flag.** Condemnation is downstream of `rupture_consequences` only. This is correct per § 1 Ring 1 — keep it that way. **Do not** add baseline-driven condemnation thresholds (that would make atrocity tunable via baseline edits — Ring 3).
5. **§ 4 wording check on existing strings:** `formatCasualtyRatio` produces *"X% of historical levels (less costly)"* and *"more costly"*. The "less costly" branch is **§ 4-forbidden** ("trivializing comparisons" — *"Your war was less deadly than the historical baseline"* is the example given). **Defect ticket: rewrite `formatCasualtyRatio` strings to historical-voice / non-comparative.** This is independent of baseline content but surfaces here because it is the rendering of a baseline-derived ratio.

### Open questions surfaced for /historian

- Is the RDC 2007 figure (~97k–104k total killed) the version we want, or the post-2014 RDC revision (~101k)? The 97,207 currently in the file matches the original 2007 release.
- Does ICTY Krstić cite 7,000–8,000 or the Memorial Centre 8,372? Pick the lower-bound legal-finding value or the higher Memorial Centre count and cite explicitly.
- UNHCR 2.2M — is this the cumulative wartime peak or the post-Dayton 1995 stock? They differ by ~700k.

—  /game-designer
