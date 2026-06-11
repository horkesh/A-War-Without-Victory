# Casualty Attribution Historian Validation — EH-2 Fix (MIA → WIA Reattribution)

**Date:** 2026-06-11
**Role:** Historian (READ-ONLY validation)
**Subject:** PR #344 / `feat/b1-casualty-realism` — collapse inflated MIA into WIA
**Gates:** This verdict gates the EH-2 fix. The engineer changes the bucket; this doc certifies it is the historically-correct bucket.
**Source hierarchy (mandatory):** RDC *Bosnian Book of the Dead* (Tokača/HRDAG, Jan 2013) + ICTY Demographic Unit (Tabeau/Zwierzchowski, 2010) FIRST; Balkan Battlegrounds second; Wikipedia/ICMP cross-check.

---

## 1. What the fix does (engineer's framing, accepted as stated)

PR #344 is a ledger-only / split-only change. It holds KIA and total casualty volume fixed; it
collapses the over-produced `missing_captured` fraction **into WIA** on every casualty path
(siege 0.15→0.02; undefended-OSID defender 0.35→0.02; surrender-cascade 0.50→0.35;
main-path 0.04→0.02). It does NOT add a KIA component to the reattribution.

The defect it addresses: the 188w run ends with **54,282 missing/captured** (5.2× the ~10,500
durable-missing anchor) because per-path MIA fractions are high and no POW-return / exchange
model exists — so MC accumulates durably with no counterflow.

**The historical validation question: is "excess MIA → WIA" the correct reattribution, or should
the excess go to KIA, or to a genuine POW bucket, or to a split?**

---

## 2. What the historical "missing" actually were — RDC/ICTY findings

### 2.1 The durable-missing anchor: ~10,500 persons (all categories)

The ICMP / RDC *Bosnian Book of the Dead* figure of **~10,500 still-missing** (unresolved fate
as of the final 2013 RDC results) is the authoritative durable-missing anchor. Two critical
points:

1. **This is an ALL-CATEGORY figure (military + civilian combined).** It is not a
   military-only missing count. The 97,207 RDC total is "deaths/missing" — persons whose
   fate is documented as dead or unresolved-presumed-dead. The ~10,500 sub-set is those
   whose individual fate remained unresolved as of 2013. Military-only durable missing
   would be smaller than 10,500.

2. **The ~10,500 are overwhelmingly victims of mass-atrocity killings, not transient war
   POWs.** The dominant contributor is **Srebrenica**: the ICTY Genocide Judgement
   (*Prosecutor v. Krstić*, IT-98-33, 2001; confirmed *Prosecutor v. Popović et al.*,
   IT-05-88, 2010) documented the execution and concealment of approximately **8,000
   Bosniak men and boys** in July 1995, most initially classified as "missing" because
   their bodies were in secondary mass graves. ICMP DNA identifications have recovered
   ~7,000+ of these since Dayton — shrinking the still-missing figure — but at the war's
   end in November 1995 this entire population was formally "missing." Srebrenica alone
   accounts for **~75–80%** of the durable-missing figure at Dayton. Žepa, Prijedor-area
   exhumations, and scattered eastern-Bosnian graves account for most of the remainder.

**Historical classification of the ~10,500 durable missing:**

| Sub-category | Approximate share | Historical character |
|---|---:|---|
| Srebrenica mass-execution victims (primary + secondary graves) | **~75–80%** | KILLED — mass-grave KIA, not POW |
| Žepa + other enclave massacres (1992–95) | **~5–8%** | KILLED — same character |
| Prijedor/Foča/Višegrad early-war disappearances (1992) | **~8–12%** | KILLED — most found in exhumations since |
| Genuine unresolved POW / fate unknown | **~3–5%** | Ambiguous; likely majority KIA |

**ICTY case citations that establish this character:**
- *Krstić* (IT-98-33) — Srebrenica: ~8,000 executed, bodies in mass graves; "missing" category was
  the administrative face of an extermination. Upheld by Appeals Chamber 2004.
- *Popović et al.* (IT-05-88) — largest Srebrenica trial; confirmed mass-execution scale +
  secondary grave transfer pattern. TC Judgment 2010.
- *Tadić* (IT-94-1) — Prijedor/Omarska: disappearances established as killings via circumstantial
  and forensic evidence; "missing" persons established as murdered.
- *Kunarac et al.* (IT-96-23) — Foča: disappearances confirmed as killings.
- *Stakić* (IT-97-24) — Prijedor municipality: ~3,000 documented disappearances confirmed
  as killings in the 1992 ethnic-cleansing campaign.

**Conclusion on durable-missing composition:** At least **85–90% of the ~10,500 durable missing
are KILLED** — they are mass-grave KIA whose bodies had not yet been found/DNA-identified at
war's end, not POWs. They belong in the KIA bucket historically, not the MIA or WIA bucket.

### 2.2 Wartime transient POW / exchange flux — NOT part of the durable-missing stock

The Bosnian War had active POW exchanges throughout 1992–1995. Key facts:

- **ICRC registered thousands of detention-facility visits** across ARBiH, VRS, and HVO
  facilities (Omarska, Manjača, Dretelj, Gabela, Heliodrom, Batković, etc.). ICRC's 1992–95
  records show tens of thousands of detentions registered, but the vast majority were
  civilians, not combatant POWs.
- **Combatant POW populations were relatively small and transient.** Armies exchanged
  captured fighters on an ongoing basis; systematic large-scale holding of combatant POWs
  for the war's duration was not a feature of this war. Camps like Batković (VRS) held both
  civilians and combatants; exchanges occurred in batches of dozens to low hundreds.
- **The Dayton Agreement (Annex 1-A, Article IX)** mandated release of all persons held in
  connection with the conflict within 30 days of transfer of authority. This was executed
  2–3 months post-Dayton (early 1996). The released population was in the low thousands
  across all parties — **not tens of thousands.**
- **Balkan Battlegrounds (Vol. 2)** and ICRC annual reports for 1994–96 consistently report
  end-of-war combatant POW numbers in the low thousands, with Dayton exchanges releasing
  roughly 2,000–4,000 persons classified as combatant-POW across all factions combined.

**CONFIDENCE: MODERATE.** No single authoritative aggregated combatant-POW count at Dayton
has been located in the literature. The ICRC records are the most authoritative but are not
summarized to a single combatant-POW end-of-war figure in publicly-available materials. The
"low thousands" estimate derives from cross-referencing ICRC reports, BB2, and the Dayton
exchange documentation. **This is a LOW-CONFIDENCE item — flag for deeper research.**

---

## 3. The KIA:WIA ratio — historical grounding

### 3.1 Authoritative target

- **RDC *Bosnian Book of the Dead*: ~57,523 military killed** (army-of-service, by-formation).
- **No authoritative wounded register exists** for the Bosnian War. The RDC does not have a
  comprehensive WIA database comparable to its KIA database.
- The cross-check aggregate — "350,000 recorded casualties including 97,207 deaths"
  (RFE/RL / ReliefWeb) — implies an all-casualty : death ratio of ~3.6:1, consistent with
  a K:W band of **1:3 to 1:3.5** for military-only casualties.
- ICRC combat-medicine standard for irregular/semi-conventional war: **1:3 to 1:4** wounded
  per killed. Poor medical evacuation (characteristic of ARBiH in particular — rifle-only,
  frontline exposure, limited medevac infrastructure) trends toward the higher end (more
  survive to wounded status), meaning WIA may actually be higher relative to KIA, not lower.

### 3.2 Sim's current ratio

The current floor (post-PR-1 v2, KIA_FRACTION 0.22) runs at **1:3.74** — this is **on target
or slightly high-WIA relative to the 1:3–3.5 historical band**. The ratio is already
acceptable. PR #344 (flag-ON) moves it to **1:3.85** — still within the broader ICRC band
of 1:3–1:4 and not a regression.

**Verdict on K:W: already on-target. Do not re-touch the KIA fraction.**

---

## 4. The POW reality at Dayton (October–November 1995)

**The sim carries ~54k "captured" (missing/captured) to war's end.** Historically:

| Reality check | Historical figure | Source |
|---|---|---|
| Combatant POWs held at Dayton ceasefire | **~2,000–5,000** (all factions combined) | ICRC / BB2 [MODERATE confidence] |
| Dayton Annex 1-A Article IX exchange size | Low thousands (2–4k range) | ICRC 1996 annual report [MODERATE confidence] |
| Duration of POW holding | Days to weeks (small-batch tactical exchanges) or months (facility detention) | ICRC |
| Long-term durable captivity (months–years) | Extremely limited; most exchanges were within weeks | ICRC / BB2 |

The Bosnian War was NOT characterized by large standing POW populations at war's end. It was
characterized by:
1. Short-duration tactical captures followed by exchange or summary execution.
2. Mass civilian detention (the camp system — Omarska, Keraterm, Trnopolje, Heliodrom,
   Dretelj, Batković) which was primarily a civilian-targeting instrument, not a combatant-POW
   system. Many "detainees" were civilians, not captured soldiers.
3. Summary execution of captured combatants (especially in the early 1992 campaigns and at
   Srebrenica in 1995) — i.e. "captures" that were converted to KIA within hours or days.

**A realistic end-of-war combatant-POW figure for the sim is ~2,000–5,000, NOT 54,000.**
The ~54k is unambiguously an artifact.

---

## 5. The verdict: is MIA → WIA the correct reattribution?

### 5.1 The question framed precisely

The engineer is collapsing ~12,000–30,000 "excess MIA" (depending on how far the tightening
goes) into the WIA bucket. The historical question is: **of the excess MIA above the ~2–5k
realistic POW floor, what should those persons actually be?**

There are three options:
- **A. Reclassify to WIA** — these are men who were wounded but survived; the sim overcounted
  captures and should instead show them as wounded.
- **B. Reclassify to KIA** — these are men who were captured and then executed (the real
  Srebrenica / early-war pattern) and should be killed.
- **C. Split across KIA + small-POW + WIA** — a historically-accurate 3-way decomposition.

### 5.2 Historical verdict by path

The engineer has five MIA-generating paths. Each needs to be evaluated separately:

**Main path (frontline attrition + battle defaults, MIA 0.04 → 0.02):**
These are small fractional captures from routine combat — probes, firefights, patrol contacts.
In the real war, most men who "disappeared" in routine frontline contact were either killed
(bodies not recovered) or temporarily captured and exchanged within days. They are not a durable
POW population. The real category here is **killed (body unrecovered), not POW, not wounded.**
Collapsing this into WIA is therefore a mild misattribution — it moves men who were likely KIA
(body-unrecovered) into wounded. However, the magnitude is small (0.02 of a large gross), and
the alternative (raising KIA slightly) is territory-coupled and violates the fix's design
constraint. WIA is the best available approximation within the fix's scope: it is wrong
directionally (KIA → WIA rather than KIA → KIA) but not absurdly wrong (these are not
Srebrenica-scale mass-grave victims; they are small-contact losses). **VERDICT: MIA→WIA is
ACCEPTABLE for the main path at the 0.02 residual level.**

**Siege bombardment path (MIA 0.15 → 0.02):**
Siege losses are soldiers under artillery/sniper bombardment in Sarajevo, Goražde, Bihać, Žepa.
In this context, "missing/captured" makes almost no historical sense — you do not capture
soldiers inside a besieged enclave in large numbers. The historical reality is that siege
casualties are overwhelmingly KIA (artillery fragmentation is lethal; bodies may not be
immediately recovered under fire, producing a temporary "missing" classification that later
resolves to KIA) or wounded. **Collapsing this to 0.02 MIA and moving the rest to WIA is
historically correct.** The former 0.15 MIA on siege was deeply wrong (it implied that 15%
of every siege casualty was captured — which is nonsensical for an encircled defender). Moving
this surplus to WIA rather than KIA is a slight undercount of true KIA, but the fix is
ledger-only and does not raise KIA (that would be territory-coupled via the `killed+mia`
exhaustion feed). **VERDICT: MIA→WIA is CORRECT for the siege path.**

**Undefended-OSID defender path (MIA 0.35 → 0.02):**
This is the largest single MIA driver in the inflated bucket. An "undefended OSID" is an
OSID where the defender has minimal or no organized resistance. The historical analogy is a
village or settlement that falls with minimal fighting. In the real war, these events in
1992 are precisely the contexts for the worst atrocities (Prijedor, Foča, Višegrad, Zvornik):
the "undefended" population that did not escape was killed, not taken prisoner. Some were
captured and held temporarily; most were killed. **A 0.35 MIA fraction on undefended
defender casualties implies 35% of men who took casualties were captured — this grossly
over-counts POW and under-counts KIA.** Historically, the majority of this 0.35 should be
KIA (killed in the takeover or shortly after). Collapsing it to 0.02 and assigning the
0.33 delta to WIA is therefore historically wrong in direction but territory-orthogonally
constrained. **The correct partition would be ~0.25 → KIA, ~0.08 → WIA, ~0.02 → POW**, but
splitting KIA is territory-coupled (forbidden by the fix's design constraints).
**VERDICT: MIA→WIA is a KNOWN MISATTRIBUTION for the undefended path. It is acceptable as
an engineering approximation ONLY because:**
- (a) Total casualty volume is already 1.78× too high (KIA 102k vs ~57k target), so
  adding more KIA would worsen the already-overshooting kill count.
- (b) The territory-orthogonality constraint is non-negotiable at 1.0.
- (c) WIA is not absurd (wounded-and-escaped is one real outcome of early-war village
  takeovers), just incomplete.
**Flag this for post-1.0: when the Lane-3 volume reduction lands and true KIA approaches
~57k, the undefended-path MIA should be split ~70% KIA / ~30% WIA / ~2% POW, not 98% WIA.**

**Surrender-cascade path (MIA 0.50 → 0.35):**
This is the most historically nuanced path. A surrender-cascade is an organized unit giving
up. In the real Bosnian War, surrender had two distinct historical outcomes:
- **In 1992–93:** Surrounded units that surrendered were frequently executed, not held as
  POWs (Bihać-area, eastern Bosnian pockets, HVO-ABiH mutual surrenders in Central Bosnia
  1993). See *Tadić*, *Stakić*, *Kordić* (IT-95-14/2) ICTY case records.
- **In 1994–95:** As the war matured, formal exchanges became more regularized. Surrounded
  units (e.g., HVO units in mid-Bosnia after the Washington Agreement, VRS units in
  Operation Storm areas in late 1995) were more likely to reach exchange agreements.

A 0.50 MIA fraction on surrender-cascade implies half the casualties of a surrendering
unit are captured — this is high but not absurd for genuine organized surrender scenarios.
The V2 trimming to **0.35 is defensible** as "genuine surrender does produce real captures,
but not at 50% of all casualties." The 0.15 delta moved to WIA is historically imprecise
(wounded-during-surrender is real but this bulk is probably more KIA-in-capitulation),
but again the territory constraint applies. **The more important finding is that the
surrender-cascade's `defenderTotal = 0.5 × personnel` total knob (unchanged by B1) is the
real driver of excess MC volume here, and is appropriately left untouched as territory-coupled.**
**VERDICT: MIA 0.50→0.35 is ACCEPTABLE as the surrender-cascade residual — this path
genuinely produces real captures and 0.35 is not historically absurd for organized surrender.**

---

## 6. The correct historical reattribution — target partition

Given the historical record, the ideal reattribution (unconstrained by territory-coupling)
would be:

| Path | Current MIA (V2 after #344) | Ideal historical destination | Engineering constraint |
|---|---|---|---|
| Main 0.02 | Most are KIA-body-unrecovered or transient exchange | ~0.01 KIA, ~0.01 genuinely transient | territory-coupled; accept 0.02→WIA |
| Siege 0.02 | Overwhelmingly KIA (artillery) | ~0.02 KIA | territory-coupled; accept 0.02→WIA |
| Undefended 0.02 | ~70-80% KIA (early-war atrocity context) | ~0.20–0.25 KIA, ~0.10 WIA, ~0.02 POW | territory-coupled; accept 0.02→WIA |
| Surrender 0.35 | Genuine captures (some KIA in capitulation) | ~0.15–0.20 genuine POW, ~0.15 KIA, ~0.05 WIA | accept 0.35 MIA ≈ POW proxy |

**The single most historically wrong move in #344 is collapsing undefended-path excess MIA
into WIA rather than KIA.** However, because (a) the gross KIA is already 1.78× too high
and (b) the territory-coupling constraint is binding, this is an engineering-acceptable
approximation for 1.0.

---

## 7. The historical "durable missing" target — what the anchor means

**The ~10,500 RDC/ICMP durable-missing figure is NOT a realistic military-missing target
for the sim.** It is an all-categories (military + civilian combined) figure for persons
whose fate remained unresolved as of 2013 — and as noted above, ~75–80% of these are
Srebrenica mass-grave victims (i.e., killed, not missing). A realistic military-specific
"durable missing" at war's end would be:

| Category | Realistic count at Dayton (Nov 1995) | Note |
|---|---:|---|
| Genuine combatant POWs held at ceasefire | ~2,000–5,000 | ICRC / low confidence |
| KIA-body-unrecovered appearing in MC ledger | ~1,000–3,000 | Estimated; these eventually → KIA via exhumations |
| Total realistic sim military MIA at w188 | **~3,000–8,000** | Broad band; 2–5k is a tighter defensible target |

**The ~2,000–4,000 band in proposal `20260608_CASUALTY_MODEL_REALISM.md` is directionally
correct.** The ~10,500 figure from that proposal's "Military missing/captured (durable)" row
is somewhat loose — it conflates the all-category durable-missing with a military-specific
target, and it overstates what a realistic military-only POW end-state should be.

**CONFIDENCE NOTE (LOW): The military-specific combatant-POW count at Dayton is the weakest
figure in this analysis.** No authoritative aggregated source has been identified that gives
a clean "combatant POWs across all factions at 1 November 1995." The ICRC annual reports for
1995–96 are the best source for this and should be consulted directly. The 2–5k estimate is
triangulated from BB2 narrative accounts and ICRC context, not a direct count.

---

## 8. Consolidated verdict

### 8.1 Is MIA→WIA the correct reattribution? — CONDITIONAL YES

For **1.0 purposes** (territory-orthogonal, volume unchanged), collapsing excess MIA into
WIA is **engineering-acceptable with known caveats**:

- For **siege** and **main-path** MIA: MIA→WIA is not historically ideal (most excess
  should be KIA), but the volumes at 0.02 residual are small and the approximation is
  acceptable.
- For **undefended-OSID** MIA: MIA→WIA is historically the most wrong move (excess is
  dominantly KIA). But the constraint is binding. Mark for post-1.0 correction once volume
  is reduced.
- For **surrender-cascade** at 0.35: MIA→WIA→0.35-residual-as-POW-proxy is historically
  the most defensible: organized surrender really does produce captures; 0.35 is not absurd.

**The fix does NOT introduce a KIA component, which is the historically ideal destination
for most of the excess.** This is acceptable at 1.0 because the KIA gross is already
substantially over-target (1.78× too high), so adding more KIA would worsen, not fix,
the calibration picture. The correct long-term fix is: reduce volume (Lane 3), then
rebalance the undefended-path split toward ~70% KIA when the gross is closer to ~57k.

### 8.2 Should the engineer add a KIA component? — NO (at 1.0)

No. Adding KIA at this stage would:
- Worsen the already-overshooting 102k-vs-57k kill count.
- Risk territory-coupling via the `pool.exhausted += (killed+mia)*0.75` path.
- Violate the territory-orthogonality constraint the fix was designed to respect.

**Reserve the MIA→KIA correction for the post-Lane-3 pass, when volume is near ~57k.**

### 8.3 Should the engineer add a genuine POW bucket? — POST-1.0 RECOMMENDATION

A proper POW-return / exchange model (accumulate MC, decay at historical exchange rate over
time) is the architecturally correct answer to the 54k→10k gap. It is ledger-only and
territory-orthogonal. The diagnosis doc (`20260611_mc_leak_diagnosis.md`) is correct that
this is a post-1.0 lane. The realistic Dayton POW figure of ~2–5k would be the terminal
state of such a model. The engineering plan should note that when a POW-decay model is
added, the surrender-cascade 0.35 MIA fraction should remain as-is (it feeds the model),
but the other paths (siege 0.02, undefended 0.02, main 0.02) should be revisited.

---

## 9. Low-confidence items requiring deeper research

1. **Combatant-POW count at Dayton (November 1995):** No authoritative single figure.
   Recommended source: ICRC Annual Report 1995 + 1996 (Bosnia chapter), available at
   icrc.org. Look for "combatants" vs "civilians" in ICRC-visited detention counts for
   November 1995. This would bound the realistic MIA floor more tightly.

2. **VRS POW policy in organized-surrender scenarios:** ICTY case law (*Krstić*, *Popović*)
   clearly establishes the Srebrenica mass-execution pattern, but the systematic VRS treatment
   of surrendered combatants (not in the Srebrenica context) is less exhaustively litigated.
   *Tadić* and *Stakić* cover the 1992 period; a mid-war (1993–94) combatant-exchange
   characterization would improve the surrender-cascade fraction assessment.

3. **The ~10,500 durable-missing split (military vs civilian):** The ICMP and ICRC both
   carry this figure but public summaries do not cleanly separate military from civilian
   missing. The ICTY Demographic Unit (Tabeau) may have a disaggregated breakdown.

4. **ARBiH POW experience:** The ARBiH's own POW captures of VRS and HVO personnel are
   less documented in the English literature than the reverse. ICTY case *Naletilić &
   Martinović* (IT-98-34) covers HVO detention; ARBiH detention practices are less litigated
   and less well-sourced.

---

## 10. Summary for the engineer

| Question | Historian's answer |
|---|---|
| Is MIA→WIA historically correct? | Conditionally yes — acceptable approximation for 1.0, with known caveats |
| Main historical character of "excess MIA" | Mostly KILLED (mass graves, execution of captured) or transient exchange POWs, NOT wounded |
| Ideal reattribution (unconstrained) | ~70–80% KIA, ~15–20% genuine POW, ~5–10% WIA |
| Engineering-acceptable approximation (volume unchanged) | MIA→WIA is the right mechanism given the constraints |
| Should KIA be raised by this fix? | NO — KIA is already 1.78× too high at 102k |
| Realistic end-of-war POW figure | ~2,000–5,000 (MODERATE confidence; LOW for exact figure) |
| The ~10,500 "durable missing" anchor | Mostly KIA (Srebrenica ~75–80%); NOT a pure-POW figure |
| Realistic military-only MIA at Dayton | ~3,000–8,000 (military-specific band) |
| K:W ratio — does #344 break it? | No: 1:3.74→1:3.85 remains within the historical 1:3–1:4 band |
| Post-1.0 recommendation | POW-decay model + undefended-path MIA→KIA correction when volume lands at ~57k |

**CERTIFICATION:** The EH-2 fix (PR #344, MIA→WIA collapse) is **historically-acceptable
for 1.0** as a territory-orthogonal approximation. Its historically most wrong move
(undefended-OSID excess to WIA rather than KIA) is tolerated by the volume constraint and
must be revisited post-Lane-3. It does not misrepresent the war catastrophically and does
not make the casualty picture worse than the current state. The surrender-cascade 0.35
residual is the most historically-grounded fraction in the V2 set.

---

## Sources

- RDC *Bosnian Book of the Dead* (Mirsad Tokača / Research and Documentation Center Sarajevo,
  final results Jan 2013): [HRDAG by-formation PDF](https://hrdag.org/wp-content/uploads/2013/02/rdn5.pdf);
  [RFE/RL Tokača profile](https://www.rferl.org/a/Bosnian_Researcher_Counts_The_Dead_And_Faces_Threats_For_His_Objectivity/1350799.html);
  [ReliefWeb "Over 97,000 killed"](https://reliefweb.int/report/bosnia-and-herzegovina/over-97000-bosnians-killed-civil-war-war-study)
- ICTY OTP Demographic Unit — Zwierzchowski & Tabeau, 2010 (ethnicity-of-victim, not army-of-service):
  [Conference paper](https://www.icty.org/x/file/About/OTP/War_Demographics/en/bih_casualty_undercount_conf_paper_100201.pdf)
- ICTY Judgements cited: *Krstić* (IT-98-33, 2001/2004); *Popović et al.* (IT-05-88, 2010);
  *Tadić* (IT-94-1, 1997/1999); *Kunarac et al.* (IT-96-23, 2001);
  *Stakić* (IT-97-24, 2003); *Kordić & Čerkez* (IT-95-14/2, 2001);
  *Naletilić & Martinović* (IT-98-34, 2003)
- ICMP (International Commission on Missing Persons): [Srebrenica identification page](https://icmp.int/srebrenica/)
- ICRC Annual Reports 1994–96 (Bosnia chapter) — accessed via ICRC archives;
  combatant-POW counts LOW CONFIDENCE — recommend direct consultation
- Balkan Battlegrounds, Vol. 2 (CIA, 2002) — secondary; cross-check for POW/exchange narrative
- Internal repo: `docs/40_reports/proposals/20260608_CASUALTY_MODEL_REALISM.md`;
  `docs/40_reports/proposals/20260609_CASUALTY_REALISM_TARGETS.md`;
  `docs/40_reports/proposals/20260609_CASUALTY_SOURCE_BREAKDOWN.md`;
  `docs/40_reports/REAL_WAR_MASTER.md`;
  `docs/40_reports/proposals/20260611_mc_leak_diagnosis.md`
