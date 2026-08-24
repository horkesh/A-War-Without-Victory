# §6 REFERRAL — the engine cannot represent the 1992 Zvornik village clearances, and holds Petkovci as ARBiH ground through July 1995

**Status:** **PANEL RULED 2026-08-24 — SPLIT 3-1, therefore ESCALATES TO OWNER. This referral's central empirical claim is FALSIFIED: the rule blocks exactly ONE OSID.** No change proposed, no file modified.

> ## PANEL RESULT
>
> | seat | §6? | scope | current behaviour |
> |---|---|---|---|
> | Historian | **NO — re-ruled** (operations coverage) | endorses Engine's split for any future change | **COMPLIANT** *(withdrew NON-COMPLIANT)* |
> | Engine / Systems | **YES** | **split** — Zvornik fix ordinary; any `homelandLastStand` change = **bright line, 8 seats** | NON-COMPLIANT (narrow ground) |
> | Calibration | **YES** | ordinary, 4 seats | upholds the §3.2 fidelity failure |
> | Red Team | **NO** | ordinary matter, not §6 | **COMPLIANT** |
>
> **Split 2-2 on scope; 2 COMPLIANT against 2 fidelity-failure ⇒ escalates to the owner.**
>
> **The Historian withdrew NON-COMPLIANT after the corrected facts**, finding two of its three legs
> gone and one error its own: its nearest-neighbour table compared painted against **t0** rather than
> **t188**, and its 27-OSID query filtered on `fin[osid]==='RBiH'`, which **silently excluded every OSID
> that fell** — i.e. the counterexamples. It retracted *"the engine is structurally incapable of
> representing the 1992 cleansing of eastern Bosnia"* without reservation, and retracted the 27-OSID
> cluster as evidence (measured: 12 never contested, 11 attacked and held, 4 weekly-only — *"a mixed bag,
> not one phenomenon"*).
>
> ### ★ A CORRECTION TO THIS DOCUMENT'S OWN CORRECTION — the wrong statistic was quoted
>
> The counterexample table above quoted **population-weighted** co-ethnic shares. **The gate reads an
> unweighted mean of per-settlement fractions** (`bot_brigade_supply_ethnic.ts:59-69`). Recomputed by
> the engine's method:
>
> | OSID | ENGINE % | pop-weighted % | gate | t0 → t188 |
> |---|---|---|---|---|
> | `donja_kamenica` | **81.9** | 92.6 | OPEN | RBiH → **RS** |
> | `zvornik` | **63.8** | 64.2 | OPEN | RBiH → **RS** |
> | `novo_selo` | **59.1** | 71.2 | OPEN | RBiH → **RS** |
> | `krizevici` | **46.2** | 79.3 | **SHUT** | RBiH → RS — **proves nothing, remove it** |
> | `djulici` | **68.5** | 78.0 | OPEN | RBiH → RBiH *(never attacked)* |
> | `sapna` | **86.4** | 89.6 | OPEN | RBiH → RBiH *(attacked 6×, holds — correct)* |
>
> **The counterexample survives on three, and comfortably: `donja_kamenica` fell at 81.9% engine share,
> well above `djulici`'s 68.5%, with the gate open.** But `krizevici` was never a valid counterexample
> and this document quoted it as one.
>
> **The population-blind averaging is itself a defect**, and directionally consistent: it understates the
> Bosniak share by 9.5 pts at `djulici`, 10.7 at `donja_kamenica`, and **14.6 at `krizevici` — enough to
> move it across the 50% gate**. A mechanic that claims to model ethnic-homeland defence reads a
> statistic that is not the demography. Cheap to state, worth a data-pipeline item.
>
> ### ★ THE ACTUAL FINDING, and it belongs to the OPERATIONS lane
>
> The Historian's closing contribution, which is the most useful thing to come out of this referral:
>
> > The ICTY record places **Đulići in the same clearance sequence as the settlements inside the four
> > OSIDs that are already Zvornik Sweep objectives.** *Karadžić* ¶1269 finds Serb Forces took over
> > Đulići (a.k.a. Bijeli Potok) from April 1992, in the same sentence as Divič and Liplje. ¶1270 has
> > Đulići, Šetići, Klisa **and Petkovci** complying with the same weapons demand. ¶1260 has Kula Grad
> > attacked 8 and 26 April — and **Kula Grad sits inside `op:zvornik:novo_selo`, which IS an objective.**
> > **The historical record draws no line between Đulići and the four already on the list. The objective
> > list does.**
>
> The question a fix must answer is **why the axis's objective list stops where it does** — not how to
> make one OSID capturable, and nothing to do with absorption.
>
> ### ★ THE DECISIVE MEASUREMENT — the rule blocks ONE OSID, not a swathe
>
> Calibration re-implemented the gate predicate offline and ran the full funnel:
>
> | stage | n |
> |---|---|
> | mismatches in the baseline | 73 |
> | sim=RBiH / painted=RS (only class this rule can touch) | 34 |
> | ≥50% co-ethnic — absorption gate OPEN | 23 |
> | **never attacked once in 188 weeks** | **16** |
> | attacked | 7 |
> | attacker ever won | 3 |
> | reached the gate with `flip` still true | 2 |
> | **`homelandLastStand` is the binding cause** | **1** — `op:srebrenica:osmace_2` |
>
> Engine-wide: **8 candidate battles of 556; 7 absorbed by the generic `professionalResilience` clause
> regardless; 1 binding.** Of the three where an attacker won, one (`srednja_trnova_2`) was a **probe**,
> which `attack_resolution_osid.ts:1396` forces `flip = false` on *before* absorption is consulted —
> so the referral's mechanism cannot explain it at all.
>
> ### ★ THE CASE STUDY HAS NO BATTLES AT HEAD — verified with a positive control
>
> `op:zvornik:djulici`: **0 weekly hits, 0 AAR hits** in the baseline, against 3 / 3 / 4 / 2 for its
> four sibling objectives in the same axis. It is on no objective list. **The three battles this
> referral was built on came from a MODIFIED run** (`n5`, 629/712, hash `8bb3e63a269821e3`) in which the
> orchestrator had added it as an objective, and that causal story was carried onto HEAD behaviour —
> which is what the panel was convened to rule on. **At HEAD the ground is ARBiH-held because nothing
> ever attacks it.**
>
> ### ★ THE COUNTEREXAMPLE — the rule does NOT make co-ethnic ground uncapturable
>
> Same municipality, same operation, same weeks: four OSIDs **above** the threshold and RBiH at t0 that
> **fell to RS** — `donja_kamenica` **92.6%** Bosniak (a *higher* share than Đulići), `krizevici` 79.3%,
> `novo_selo` 71.2%, `zvornik` 64.2%. **Zvornik municipality scores 8 of 9 against painted.** The engine
> *does* represent the Zvornik clearance; the VRS reached decisive victory repeatedly on ground more
> Bosniak than the exhibit. §3.1's "precise inverse of the documented outcome" is false at municipality
> scale.
>
> ### ★ THE SUPPORTING QUEUE TABLE DOES NOT REPRODUCE
>
> Against the engine's own `getCoEthnicShare`, **none of the six rows in the supporting measurement's
> queue table matches**: `pobudje_2` claimed 99.2 / engine 94.4 · `delijas` 87.4 / **64.5** ·
> `brusna_2` 64.9 / **74.1** · and **`kijevo_2` claimed 77.8 / engine 32.0 — below the gate entirely.**
> "Six of seven sit behind this rule" is **not supported**. The engine computes co-ethnic share as an
> **unweighted arithmetic mean over constituent settlements**, population-blind — fragile near the
> threshold on a merge. Đulići is **68.5%**, not the 78% quoted.
>
> ### ★ THE REFERRAL CONTRADICTS ITS OWN SUPPORTING DOCUMENT
>
> The supporting measurement says the clause is *"nearly redundant in practice"*. That is correct, and
> Calibration has now quantified it: **1 of 556**. The referral escalated the opposite reading.
>
> ### What survives, and it is worth keeping
>
> 1. **The outcome at Petkovci is wrong regardless of cause** — a July 1995 execution site held as the
>    victims' army's ground for 188 weeks. Three seats uphold this as a fidelity failure. **The cause is
>    that nothing ever attacks it, which is worse than absorption, not better** — the ground is
>    uncontested for the entire war, and initial OSID control is sacrosanct, so the fix is nowhere near
>    the absorption rule.
> 2. **`homelandLastStand` is a Ring-1 mechanic modelling ethnic-homeland defence that no gate has ever
>    ruled on** (Historian, §6 §8 lesson 2: *"a feature that lives in neither Ring 1, 2 nor 3 does not
>    exist yet"*). Faction-hardcoded, binary, morale-independent, keyed on a population-unweighted 1991
>    census threshold. Under-examined by everyone who has looked at it, this referral's author included.
> 3. **It is load-bearing at the enclave rim** — `isEnclaveCapital` is exact-match on 8 capitals, so the
>    rim falls through to this clause. Engine seat measured 549 brigade-turns on the Srebrenica rim
>    where it is the sole absorber, up to the H1.8 event flips at t162/164. **Any future change to it is
>    an enclave-guard question**, which is why Engine rules that change bright-line even though this
>    ruling is ordinary.
> 4. **Observability gap, unanimous across three seats:** the `morale_absorption` snap event is
>    constructed and **never persisted** — zero hits in `run_summary.json`, `weekly_report.jsonl`,
>    `operation_aars.json`, `end_report.md`, `final_save.json`. Battle records do not even carry whether
>    a flip occurred, so a won battle that transfers nothing is indistinguishable from one that does.
>    **The engine's most ethically loaded predicate is invisible in its own output.** All three seats
>    ask for this regardless of the ruling.
>
> ### The experiment that would settle it, with a pre-derived expected value
>
> Calibration's discriminator: set `homelandLastStand = false`, re-run 188w. The offline funnel predicts
> **exactly 1 affected battle**, so the expected delta is **0 or ±1 matched OSID**. If it comes back
> larger, **that diagnoses the harness, not the rule** — proving the emergent schedule re-rolls under a
> change that provably touches one battle. Either outcome is informative, which is precisely what the
> earlier attempt lacked. Run on a fixed painted-reference SHA; diff the full `anchor_checks` and the
> full mismatch mask, never the net count.
>
> ### Corrections owed by this document
>
> - BB1 Zvornik citation is **PDF p.163 / printed 137**, not PDF p.174 (Historian). The house rail about
>   BB1 index misalignment caught its own referral.
> - `Karadžić` ¶1272 says *"more than 4,000"*, not ~4,000; the Karakaj figure is a range (¶1273 ~700,
>   ¶1304 ~750).
> - **Missed supporting finding (Historian):** *Karadžić* ¶1269 — *"From April 1992, Serb Forces attacked
>   or took over a number of villages including … **Đulići which was also known as Bijeli Potok**"* — a
>   direct trial-chamber finding of takeover, and it resolves the Đulići/Bijeli Potok identity that makes
>   ¶1273 read correctly.
> - **Process failure:** the supporting measurement was committed only to an unmerged branch, so the
>   panel was handed a dead repo path. Two seats ruled without it and said so. Now present in the main
>   worktree.
>
> ### Recommendation the panel converges on
>
> **Do not record the 23 gate-open OSIDs as known-unmodellable.** Only **one** is rule-blocked. The other
> 22 — Đulići/Petkovci included — are open because **nothing ever attacks them**, which is a
> targeting/operation-authoring problem that has never been diagnosed. Retiring them would write off
> targets whose actual blocker is unknown. Record **`op:srebrenica:osmace_2`** as rule-blocked; re-open
> the rest under a targeting lane.
>
> The referral's operational instruction — *stop spending engine work trying to capture these OSIDs* —
> holds, **but for the corrected reason: not because the rule protects them, but because the capture
> path was never built.**

> ## ⚠ CORRECTIONS FROM THE ENGINE SEAT — READ BEFORE ACTING ON ANYTHING BELOW
>
> ### ★ THE MOST IMPORTANT ONE: this document nearly recommended removing the enclave guard
>
> §3 below floats that the co-ethnic clause may be "nearly redundant" and removable. **That is false
> and it is dangerous.** Verified: `isEnclaveCapital` (`enclave_resilience.ts:558`) is **exact-match on
> `capital_osid` — 8 OSIDs total**. The broad membership predicate `osidBelongsToEnclave` exists at
> `:291` and is used in six other modules but **NOT** in the absorption path. **So the entire enclave
> RIM falls through to `homelandLastStand`.**
>
> Measured: **549 brigade-turns on the Srebrenica rim alone** where the co-ethnic clause is the *sole*
> absorber — `radovcici` 134, `milacevici` 83, `luka_2` 81, `osmace_2` 79, **`donji_potocari_2`
> (Potočari) 61**, `ljeskovik_2` 58, `bostahovine_2` 53. Those OSIDs then flip RBiH→RS at **t162 via
> `mechanism: 'event'`**, Žepa at t164 — the canon H1.8 event fall.
>
> **The co-ethnic clause is what holds Srebrenica's perimeter until the event owns its fall. Remove it
> and Srebrenica becomes capturable by ordinary combat from turn 13.** That is an H1.8 and
> enclave-guard crossing simultaneously — **BRIGHT LINE, eight seats**, not a cleanup.
>
> ### Falsified: "permanently, at any morale"
> Four paths flip a co-ethnic RBiH OSID on a non-decisive win: **no defender present ⇒ no absorption
> at all** (the whole block is inside `if (defenderFormation)`), plus the `paramilitary`, `event` and
> `consolidation` channels which bypass combat resolution entirely (45 of 203 control events in the
> cited run). **Of 207 RBiH-held ≥50% co-ethnic OSIDs, 148 are ungarrisoned and flip on any win.**
>
> ### Falsified: the blast-radius framing
> Only **59 OSIDs — 8.3% of the map** — are actually protected. "Much of eastern Bosnia" is not
> supported. And the co-ethnic *condition* is near-symmetric (RBiH 207 / RS 196): **the asymmetry is
> the hardcoded `defenderFaction === 'RBiH'` literal, not the census.**
>
> ### Falsified: the measurement sampled the two most unrepresentative turns in the run
> t1 and t188 are **2 of only 17 turns (of 188)** where zero RBiH brigades sit below floor. Across all
> brigade-turns: RBiH **6.5%** below floor, and **171 of 188 turns** have at least one. 69 distinct
> RBiH brigades go below 50. The endpoint reading was an artifact of reading the two save files.
>
> ### Falsified: the case study does not show the mechanism it blames
> At t188 Đulići is garrisoned by brigades at **morale 80 and 97** — `professionalResilience` absorbs
> those battles on its own. **Deleting `homelandLastStand` would change nothing at Đulići.** Also: the
> quoted `power_ratio` **2.00** is ≥ `VICTORY_THRESHOLD_DECISIVE`, which would classify as decisive and
> flip — so either the figure is rounded or something else blocked it. **The real blocker is that an
> ARBiH brigade is present at all**, which also closes the paramilitary channel
> (`paramilitary_sweep.ts:836`). The live question is a placement/OOB one: *why is a full-strength
> ARBiH brigade garrisoning Đulići in 1992?*
>
> ### Corrected input: the co-ethnic share is **68.5%**, not 78%
> Recomputed with the engine's own `computeOsidEthnicComposition`. Composition is an **unweighted mean
> over member settlements**, not population-weighted — on a 6-settlement merge the share is partly a
> settlement-count artifact. This document did not verify its own headline input.
>
> ### The cause is upstream: a census-driven MORALE ratchet, not absorption
> `morale_drift.ts` stacks five RBiH-favouring terms — affinity drift ±2/turn on census ≥0.70/<0.30,
> victory sensitivity 1.3× vs 0.8×, defeat sensitivity 0.7× vs 1.3×, home floor 30 vs 20, and
> `RBIH_EXISTENTIAL_FLOOR` 25 which is **RBiH-only and keyed to the identical ≥0.50 co-ethnic
> threshold**. §3.1's "census as protection" critique therefore lands on the morale model as much as on
> absorption — and stripping the co-ethnic term from absorption alone would remove the enclave guard
> while leaving the actual ratchet untouched.
>
> Also measured: **RS morale is not uniformly low** — median 65 at t1, 100 at t100, 39 only at t188.
> The RS collapse is a late-war phenomenon, so any change justified from the t188 snapshot is
> calibrated on the tail.
>
> ### Observability defect — this mechanism leaves no trace
> `snap_events` (`attack_morale_absorption.ts:130`) are **never persisted to any run artifact** — zero
> hits for `morale_absorption` in `run_summary.json`, `weekly_report.jsonl`, `operation_aars.json` or
> `end_report.md`. **The firing rate of each absorption branch cannot be measured from any output the
> harness produces**, which is how this document reached an endpoint-only conclusion unchallenged.
> Persisting them is a prerequisite for evaluating any future change here.
>
> ### Scope ruling (Engine seat): §6 **YES**, but **SPLIT**
> - **Correcting the Zvornik outcome = ORDINARY four seats.** It needs no absorption change: the engine
>   already flips 1992 cleansing municipalities via the `paramilitary` channel (Bijeljina t6/t7,
>   Višegrad t7), and the historical Zvornik village clearances were paramilitary operations, not
>   frontline VRS brigade actions. That is an application of the canon hierarchy, not a crossing.
> - **Any `homelandLastStand` change = BRIGHT LINE, eight seats**, plus the observability fix first.
> - §4.4's "log these as known-unmodellable" is answered: **no — they are modellable through the
>   existing event/paramilitary channel.**
>
> **Verdict on current behaviour: NON-COMPLIANT on the narrow ground only** — holding Petkovci as
> ARBiH-garrisoned ground through July 1995 is a §6 fidelity failure. It is *not* caused by the census
> input, *not* caused by the absorption rule, and *not* unmodellable.
**Date:** 2026-08-24
**Raised by:** Historian seat, during a routine provenance check on a failed calibration change.
**Referred by:** orchestrator. Implementer ≠ reviewer; neither may vote.

**This is not a calibration item and must not be handled as one.** It reached §6 from a +1 objective
tweak, which is precisely why it is written up separately.

---

## 1. WHAT WAS FOUND

A calibration change tried to make the VRS capture `op:zvornik:djulici`. It failed: the VRS **won all
three battles** (`power_ratio` 2.00 / 1.62 / 1.92, `attacker_won: true` each time) and **no control
flip occurred**. The blocking mechanism is `attack_morale_absorption.ts:113`:

```ts
const homelandLastStand = defenderFaction === 'RBiH' && coEthnicShare >= 0.50;
absorb = homelandLastStand ? (outcome === 'costly_victory' || outcome === 'victory') : …
```

The OSID is **78% Bosniak by the 1991 census**, so an RBiH defender absorbs every outcome below
`decisive_victory` (ratio ≥ 2.0), at any morale, permanently.

The provenance check then established that **the painted target is correct and the engine is wrong.**

---

## 2. THE HISTORICAL RECORD — ICTY, trial-chamber findings of fact

`op:zvornik:djulici` is a six-settlement merge: **Đulići** (98% Bosniak), **Klisa** (100%),
**Petkovci** (99%), **Šetići** (89%), Baljkovica Donja (85% Serb), Boškovići (89% Serb).

- **8–10 April 1992** — Zvornik town falls (BB1 PDF p.174 / printed 137).
- **Late April 1992** — *Krajišnik* TJ (IT-00-39-T) ¶365: *"By late April 1992, Serb authorities had taken control of the Muslim village of Đulići in Zvornik municipality, and the villagers surrendered their weapons to Serb forces."*
- **Second half of May 1992** — *Karadžić* TJ (IT-95-5/18-T) ¶1270: the Zvornik Crisis Staff called for surrender of weapons, *"complied with by villages, including **Đulići, Šetići, Klisa**, … and **Petkovci**."*
- **28 May – 1 June 1992** — *Karadžić* TJ ¶¶1272–1273: residents of Šetići and 13 hamlets ordered to gather at **Klisa**; ~4,000 gathered; *"On the morning of 1 June 1992, Klisa was surrounded by Serb soldiers… Between 5,000 and 6,000 women and children were moved out from Bijeli Potok and Đulići. Approximately **700 men from 13 Bosnian Muslim villages were separated**, had their hands tied behind their backs, and were transported to the **Karakaj Technical School**."* *Krajišnik* TJ ¶¶370–371: ~20 died of heat stroke within hours; *"**About 160 detainees were removed in small groups and executed**"*; 190 more shot at Karakaj.
- **Early June 1992** — *Krajišnik* TJ ¶365: *"Serbs were seen moving into the villages in Zvornik municipality where Muslims had been evicted."*
- **Which part of Zvornik stayed RBiH** — *Karadžić* TJ ¶1249: *"**A Bosnian Muslim part of the municipality remained around Sapna.**"* The painted file already encodes exactly that.

**Posture:** *Krajišnik* — trial conviction, Appeals 17 Mar 2009 (acquitted of genocide). *Karadžić* —
trial conviction 24 Mar 2016, Appeals 20 Mar 2019. The 2000 Karadžić/Mladić amended indictment
schedules the ~160 Karakaj killings — **indictment, not verdict**, cited as such.

---

## 3. THE TWO FACTS THAT MAKE THIS §6

### 3.1 The absorption rule inverts the causal direction of the event

The mechanism's input is the **1991 census co-ethnic share**. In this municipality that share is
**what the 1992 operation was conducted to eliminate**. The engine uses the pre-war Bosniak
population of these villages as the reason they cannot be taken — when the historical fact is that
that population was the target of the operation that took them.

The engine produces the **precise inverse of the documented outcome, in the precise window in which
the documented outcome occurred**: the VRS wins three battles at t7–t9 and takes nothing, and an
ARBiH garrison holds the ground at full strength through t188.

### 3.2 The engine holds a July 1995 execution site as ARBiH ground

**Petkovci is inside this OSID.** *Krstić* TJ (IT-98-33-T) ¶¶226–232: 1,500–2,000 prisoners were
driven to the **Petkovci School** on 14 July 1995 and executed at the **Petkovci Dam** during the
night of 14/15 July. *Karadžić* TJ ¶5356: *"**Petkovci fell within the area of responsibility of the
6th Battalion of the Zvornik Brigade.** The Command of the 6th Battalion was stationed in the old
school in Petkovci."*

**In the simulated war, that ground is ARBiH-held and ARBiH-garrisoned throughout July 1995.**

Note also that **Baljkovica**, in the same OSID, held a VRS battalion command post — *Krstić* TJ
¶231 places the dam execution site *"less than two kilometres from the command post of the Zvornik
Brigade's 6th Infantry Battalion in Baljkovica."* The July 1995 column breakthrough there was a
~1.5 km breach for roughly 24 hours, closed by the VRS on 17 July (*Karadžić* TJ fn. 18682), with
Zvornik Brigade units executing stragglers at Nezuk on 19 July (*Krstić* TJ ¶¶254–256). A single RS
value loses nothing.

---

## 4. WHAT THE PANEL IS ASKED TO RULE ON

**No change is proposed.** The orchestrator and the Historian both decline to propose one. The
questions are the panel's:

1. **Is this a §6 matter at all?** Under CLAUDE.md the panel decides whether a change touches §6, and
   that ruling precedes everything else.
2. **Is the current behaviour a §6 problem, independent of any fix?** The engine currently represents
   a documented site of mass executions as territory held by the victims' own army for the duration
   of the war. Is that a fidelity failure the gate should care about, or is it an acceptable
   consequence of a guard that exists for other reasons?
3. **Does the absorption rule's use of 1991 census share need examination?** It is not specific to
   this OSID — it applies wherever an RBiH defender stands on ≥50% co-ethnic ground, which is much of
   eastern Bosnia. **Any change here is a change to how the simulation represents ethnic cleansing,
   in either direction**, and is therefore the panel's to rule on and not an implementer's.
4. **If the rule stays as-is**, should the affected OSIDs be recorded as known-unmodellable rather
   than left as open calibration debt that future lanes will keep trying to close? Five of seven
   targets in the current queue sit behind this same rule (co-ethnic shares 99.2%, 87.4%, 77.8%,
   66.0%, 64.9%).

**Explicitly NOT proposed, and flagged so nobody reaches for it:** the cheap way to make these OSIDs
capturable is to weaken or condition `homelandLastStand`. **That is a change to how the game
represents Bosniak civilians defending their villages, and it must not be made as a calibration
convenience.** The rule's own comment records its intent — *"ARBiH didn't retreat from their
villages — they stood and died, and VRS paid in blood for every meter."* That intent is defensible;
whether it should also make the ground uncapturable is the question.

---

## 5. IMMEDIATE OPERATIONAL CONSEQUENCE, REGARDLESS OF THE RULING

**Do not spend further engine work trying to capture these OSIDs.** The calibration attempt that
raised this cost −10 matched OSIDs and captured nothing, and the −10 was itself unattributable noise
(a two-turn operation shift re-rolled the 188-week emergent schedule). The target is sound; the
capture path is what fails, in the exact weeks the record says capture happened.

---

## 6. EVIDENCE BOUNDARIES

Searched in full: BB1 (545 pp) and BB2 (607 pp) PDFs — **zero hits** for any of the six settlement
names. BB is a brigade-level operational history and does not carry settlement-level control at this
resolution; its silence is evidence about BB, not about these villages. ICTY PDFs searched in full:
*Krstić* IT-98-33-T, *Krajišnik* IT-00-39-T, *Karadžić* IT-95-5/18-T, plus the 2000 amended
indictment. **All paragraph numbers are PDF-edition** (this project has recorded that ICTY HTML and
PDF editions can differ by +3).

**Not searched:** *Popović* IT-05-88, *Tolimir* IT-05-88/2, *Mladić* IT-09-92, and the Court of BiH
register. Those would add detail but cannot reverse *Karadžić* ¶1249 or *Krajišnik* ¶365. A Belgrade
War Crimes Chamber verdict of 12 June 2008 covering Zvornik April–July 1992 was retrieved via NGO
reporting rather than the court's own register — corroboration, not a docket-verified citation.
