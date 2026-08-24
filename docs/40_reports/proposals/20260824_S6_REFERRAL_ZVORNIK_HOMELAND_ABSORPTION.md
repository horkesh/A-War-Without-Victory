# §6 REFERRAL — the engine cannot represent the 1992 Zvornik village clearances, and holds Petkovci as ARBiH ground through July 1995

**Status:** REFERRED TO THE PYRRHIC §6 PANEL. **No change is proposed. No engine or data file has been modified.**
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
