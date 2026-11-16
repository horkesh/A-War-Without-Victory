# RB6 historian findings: 'Operacija Džihad' in the ARBiH bot name pool

Seat: historian. No repo file edited. Pool read from `C:/Pyrrhic/AWWV-worktrees/ui-patriarch/src/sim/combat/operation_names.ts` and `historical_operation_names.ts`.

RECOMMEND: rename to Prevoj

(Ranked fallbacks: Sidro, then Kompas. Details in section 3.)

---

## 0. How I searched, and the gaps

- BB1 and BB2: full PDFs converted with `pdftotext -layout`, then regex-searched (`d[zž]ihad|jihad|jehad|ihad|holy war|mujah|mudžah`, plus every `Operation "X"` form). The partial KB (`data/derived/knowledge_base/balkan_battlegrounds/pages`, 406 pages) was also grepped. Page numbers below are PDF page numbers, which equal the KB `BB1_pNNNN` / `BB2_pNNNN` numbers (checked: the El Mujahid text sits in `BB1_p0423.json`). The printed page numbers are lower: BB1 printed = PDF minus 37, BB2 printed = PDF minus 19 (checked against the printed indexes). I give both where useful.
- ICTY texts downloaded from icty.org and searched: Hadžihasanović and Kubura trial judgment (IT-01-47-T, 15 Mar 2006) and appeal judgment (22 Apr 2008); Halilović trial judgment (IT-01-48-T, 16 Nov 2005); Delić trial judgment (IT-04-83-T, 15 Sep 2008); Orić trial judgment (IT-03-68-T, 30 Jun 2006); Karadžić trial judgment (IT-95-5/18-T, 24 Mar 2016); Mladić trial judgment volumes 1-4 (IT-09-92-T, 22 Nov 2017); Prlić trial judgment volumes 1-6 (IT-04-74-T, 29 May 2013).
- Gaps. Mladić volume 5 was not retrievable (404). I did not reach any Court of BiH judgment. A web search for an ARBiH 'Džihad' operation returned nothing. The pdftotext output garbles ICTY diacritics (Proljeće appears as `Prolje}e`), so ICTY searches used ASCII-tolerant patterns. Paragraph numbers below were read from the extracted text; footnote numbers are given where I could not tie a passage to a single paragraph.
- Sources not checked by me line by line: Prlić (5 hits for mujahedin, not examined; irrelevant to the naming question) and secondary sources (Wikipedia category "Military operations of the Bosnian War", fetched once, 45 pages, used only as a cross-check).

---

## 1. Was any ARBiH operation named Džihad / Dzihad / Jihad?

**Finding: none found.**

- BB1 and BB2: zero hits for jihad / džihad / dzihad / jehad / holy war (one unrelated hit for "hodza ... Muslim holy man", BB2 PDF p.361). The printed operation indexes list every named operation (BB1 PDF p.535, printed 498; BB2 PDF pp.595-596, "see Volume 1 for more entries"): no Džihad. KB pages: zero hits.
- ICTY (all texts above): zero hits for any operation named jihad. The word does occur, always as a description of the foreign mujahedin or as Serb rhetoric, see below.
- Wikipedia's "Military operations of the Bosnian War" category (45 pages) has no such operation either. A web search for 'ARBiH operacija Džihad' found none.
- Inside the repo the name has no source: `docs/40_reports/implemented/20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md` line 88 lists "Dzihad/Struggle" as one of 27 "placeholders" (Islamic terms). It was authored as flavour, not drawn from a record.

### What the sources actually say about the word

1. **It is the self-description of the foreign mujahedin, not of the ARBiH.**
   - Hadžihasanović and Kubura trial judgment, para. 415 (fn. 776): "the term 'mujahedin' refers to Muslims fighting a jihad, or holy war." Para. 444 quotes Indictment paras 18-20: foreign fighters "prepared to conduct a 'Jihad' or 'Holy War'" and the 7th Muslim Brigade allegedly incorporating them. Paras 416-418 find that relations between the foreigners and the local population deteriorated because of their rigid attitude.
   - Delić trial judgment, para. 167: most foreign mujahedin "actively supported the military struggle ... ready to conduct a Jihad or 'Holy War'"; para. 166 ends "It appears that the advent of foreign Mujahedin was endorsed by the political leadership of the RBiH." Para. 171: locals called the Poljanice group "the Arabs", "El Jihad" and "El Mujahed". Para. 179: after formation the El Mujahed Detachment (EMD) was still called "El Mudzahedin" or "Jihad Unit" (fn. 464). Para. 328: an EMD report of 11-16 Sep 1995 says "A Jihad military operation is under way" (this concerns the Operation Farz period; the operation itself was named Farz).
2. **The ICTY did not find that the ARBiH commanded the detachment in 1993.** Hadžihasanović and Kubura appeal judgment, para. 230: the relationship between the El Mujahedin detachment and the 3rd Corps "was not one of subordination. It was quite close to overt hostility"; the appeal found no effective control by Hadžihasanović over it for the period charged. (The trial chamber had found control from 13 Aug 1993; the appeal reversed that.)
3. **BB mentions the unit only as "El Mujahid" Detachment** (foreign Islamic volunteers) spearheading 3rd Corps / 35th Division attacks: BB1 PDF pp.273, 422-423 (printed 236, 385-386), BB2 PDF pp.499, 504. BB2 PDF pp.27-28 is an erratum added for an allegation of beheading of VRS prisoners at Podsijelovo (21 Jul 1995), sourced to a 2001 Tanjug item citing Glas Srpski. Treat that as an allegation of a Serb outlet, not a finding.
4. **Serb wartime rhetoric used "mujahedin" as a smear for Muslims and for the whole ARBiH.**
   - Mladić trial judgment vol. 4, para. 3703: at the 16th Bosnian Serb Assembly session, 12 May 1992, a speaker said "the enemy, Ustasas and mujahedin, must be defeated by whatever means are necessary"; another said Serbs would be shown "the way to Istanbul, Teheran, just as we did to the mujahedin" (the discussed 'enemy' there is Bosnian Muslims generally).
   - Karadžić trial judgment, Bijeljina/Batković section (para. 621 ff., fn. 2090-2092): VRS soldiers looked for "balijas or Mujahedin" and killed two detainees so labelled.
   - Mladić trial judgment vol. 1, fn. 5032 (Prijedor camp evidence): guards shouting "hit the Mujahedin" at Muslim detainees.

### Verdict on the name

Using "Džihad" as a name for generic ARBiH bot operations would attach the label that the ICTY record ties to the foreign El Mujahed Detachment and that Serb wartime propaganda used to brand all Bosnian Muslims. In the sources the word means "holy war" (the code comment's "spiritual, not holy war" is the reading the sources do NOT use for a military unit). It would put that label on ordinary ARBiH operations, including in the player's own faction, every run. It is historically unsupported (no such operation) and it echoes the propaganda framing. The pool already covers its "Islamic term" intent with names that are real or milder (see section 3).

---

## 2. What the ARBiH actually named its operations

Verified, with citations. (PDF page numbers; BB1 printed = PDF - 37, BB2 printed = PDF - 19.)

| Convention | Names | Evidence |
|---|---|---|
| Rivers, mountains, places | Neretva-93, Una 95, Sana 95, Grmeč 94, Trebević-1/-2/-3, Vranduk, Kinšasa (6 Sep 1995, unexplained nickname) | Neretva-93: BB1 p.239; Halilović trial judgment paras 2, 175 (the Chamber was "not convinced that these combat operations were called 'Operation Neretva'" and doubted the name was ever used at the time; so the name is itself contested). Trebević: BB1 pp.224, 238; Halilović paras 700, 714; Delić fn at para 113 (Trebević-3, 6 Dec 1993). Una 95: BB1 p.342. Sana 95: BB1 pp.416-419, 432, 457 (fn. 692). Grmeč 94: BB2 p.546 (Oct-Dec 1994, 5th Corps). Vranduk and Kinšasa: Delić paras 441, 443, 450 and fns. |
| Weather, season, time of day | Proljeće 94 (Spring), Proljeće (27 May 1995) and Proljeće II (21 Jul 1995), Zora 95 (Dawn), Uragan 95 (Hurricane) | Proljeće 94: BB2 p.505 (2nd Corps, Vijenac). Proljeće / II: Delić paras 394-396. Zora 95: BB1 p.342. Uragan: BB1 pp.421, 423; Delić paras 285, 397 (planned by the 2nd and 3rd Corps commanders, maps signed by Delić). |
| Animal plus aspirational word | Tigar-Sloboda 94 (Tiger-Freedom) | BB1 pp.282-283 (printed 245-246), BB2 p.533; 5th Corps against Abdić. |
| Geometry, capability | Trokut I (Triangle I), Domet-1 (Reach-1) | Trokut I: BB1 p.343 (5th Corps, 3 Jul 1995). Domet-1: BB1 p.338 (Vlašić, 20 Mar 1995). |
| Religious or virtue terms (1995, 3rd Corps / 35th Division) | Sabur-95 (Patience), Farz-95 (religious obligation) | Sabur: Delić para 393, fns 1000-1002 (order of the 35th Division commander for "Sabur-95", April 1995). Farz: Delić paras 285, 397; fn. 866 ("Wartime Diary of the ABiH 3rd Corps for Operation 'Farz-95'"); the 3rd Corps order of 25 Aug 1995 is in the footnote to para 397. Tekbir '95 appears in the Wikipedia category but not as an operation in BB (BB1 PDF pp.449, 452-453 only cite an article about Tekbir, a 1997 periodical piece). |
| Numbered series and year suffix | Trebević-1/2/3, Trokut I, Proljeće II, Domet-1, '94/'95 suffixes | BB1 index p.535 (printed 498); Delić paras 394-396. |

Observations for the naming-style decision:
- The documented ARBiH pattern is overwhelmingly geography, weather, and place-plus-year. Religious terms are the minority, are concentrated in 3rd Corps / 35th Division 1995 operations, and are real names (Sabur, Farz), not generic flavour.
- ARBiH operation names in BB/ICTY are attached to specific operations. No source treats any religious term as a pool of interchangeable flavour names.
- The "Džihad" slot's stated intent ("Islamic terms") is already served by Sabur, Ihlas, Gazija, Zavet.
- BB itself is not complete on 1995 names; Farz is absent from BB (the repo cites BB2 pp.508-509 for it but those pages describe the 1994 Vozuća battle; the name itself comes from the ICTY Delić judgment).

---

## 3. Replacement names for the slot (ranked)

Constraints applied: one word after "Operacija", fictional, not a real operation name of any army 1992-95 in BB/ICTY, not reserved, not in any of the three pools, neutral (no religious, ethnic, or faction-specific content).

Check performed for each: regex over BB1, BB2 and the ICTY texts for `Operation "<name>"` and for the bare word; check against the three pools and the reserved list; check against the Wikipedia operation category.

1. **Operacija Prevoj** (mountain pass). Zero operation hits, zero bare-word hits in BB1/BB2/ICTY; absent from all pools and the reserved list. Geography register, matches the documented ARBiH style (Neretva, Grmeč, Trebević).
2. **Operacija Sidro** (anchor). Zero hits, not in pools. Neutral concrete noun, in the style of the existing Put / Most / Krug / Slap.
3. **Operacija Kompas** (compass). Zero hits, not in pools. Neutral, "direction" register like Smjer / Put.

(Rejected during checking: Vrelo has bare-word hits in the texts (place-name usage); Ogledalo and Raskrsnica are free but clumsy.)

Note for implementation, not a proposal: the pool is hashed by `pool.length`, so replacing the string in place keeps every other pick unchanged; only runs that drew this slot change their label. Saves holding `Operacija Džihad` in `used_operation_names` stay harmless.

### Other names in the three pools that match a real operation, or carry a loaded or misleading connotation

No changes proposed; listed for the register.

Real operations (collision with a real name in BB/ICTY):
- RBiH `Sabur`: real ARBiH Operation Sabur-95 (Apr 1995, 35th Division), Delić trial judgment para 393, fns 1000-1002. Not in the reserved list. Strongest collision in the pool.
- RBiH `Oluja`: real HV Operation Oluja / Storm, Aug 1995 (BB1 PDF pp.13, 15, 312 and index). Not reserved; it is also the best-known operation name of the war.
- HRHB `Bljesak`: real HV Operation Bljesak / Flash, May 1995 (BB1 PDF pp.313, 333, 335 and index). Not reserved.
- RS `Udar` and HRHB `Udar`: real VRS Operation Udar (Cerska, Jan-Feb 1993), Karadžić trial judgment para 4954, fn 16684 ("VRS Analysis of 'Operation Udar'"). Not reserved.
- HRHB `Proboj`: real VRS Operation Proboj (Dec 1992, Directive 4), Karadžić trial judgment para 4948, fns 16661-16662. Not reserved.
- RS `Vihor` and HRHB `Vihor`: real Croatian (ZNG) Operation Vihor, Banija, Dec 1991 (BB2 PDF p.244). Outside 1992-95 and in Croatia, so low severity; also the same name sits in two pools.
- RS `Bor`: BB1 PDF p.91 names Operation BOR, the 1990 Slovenian covert arms shipment. Pre-war; negligible.

Loaded or misleading connotation (no source collision):
- RBiH `Hajka` (hunt / battue): hunting metaphor applied to people, echoes dehumanising "hunt" language in Serb rhetoric.
- RBiH `Gazija` (ghazi): honorific for a warrior of the faith; in an operation label it reads as holy-war framing, the same issue as Džihad at lower strength.
- RBiH `Kopljem` ("by the spear"): archaic and ambiguous; the usual reading in the repo comment is martial, but it is not a recognised Bosnian operation convention. I could not verify any source for it.
- RBiH `Grad`: the code comment reads "Hail", but the word is also the name of the BM-21 Grad rocket launcher, a VRS and JNA staple; a player will likely read it as the weapon. (General knowledge; not checked in BB/ICTY text.)
- RBiH `Zavet`: "covenant / vow"; also a recognised Serbian national-myth term (Kosovo covenant). Weak connotation; general knowledge, not checked in BB/ICTY text.
- RBiH `Ihlas` (sincerity, Islamic term): not loaded in itself, but it is the most overtly religious entry left in the pool.
- RS `Odmazda` (retribution / reprisal): evokes reprisals against civilians; matters in a game with a §6 liveness / atrocity surface.

Cross-pool duplicates (informational): Prag, Greben, Grom, Čelik, Kamen, Oklop, Vihor, Udar (RS and HRHB); Zamah, Val, Strijela (RBiH and HRHB); Čelik (RS and RBiH). `used_operation_names` is keyed by name across factions, so the second faction to draw a shared name skips to the next one.

Reserved-list observations (outside the question, unverified beyond what is stated): I found no source for `Crveni Lav` in BB1/BB2 or the ICTY texts (BB1 PDF p.397 uses "Daring Lion" for a French RRF plan for Goražde, a NATO/UN plan, not an ARBiH operation). `Brana` is listed under VRS/JNA; a Wikipedia snippet describes Operation Brana '94 as an ARBiH operation at Vozuća. I did not confirm either from primary sources.

---

RECOMMEND: rename to Prevoj
