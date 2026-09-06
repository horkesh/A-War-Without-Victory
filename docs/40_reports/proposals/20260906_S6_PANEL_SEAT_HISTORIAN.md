# Pyrrhic §6 Panel — HISTORIAN seat verdict

**Date:** 2026-09-06 · **Seat:** Historian · **Answered independently.**
**Authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md:213` · **Scope:** read-only. Nothing changed.
**Source rule applied:** `SENSITIVE_HISTORY_DESIGN_GATE.md:226` — ICTY / Court of BiH / ICJ / UN first, BB second, no Wikipedia.

---

## SUMMARY

| Item | Verdict |
|---|---|
| **P1 — Ahmići never fires** | **NON-COMPLIANT** |
| **P2 — Srebrenica/Žepa nine weeks early** | **NON-COMPLIANT** |
| **P4 — canon vs design doc on a Srebrenica decision** | **COMPLIANT** (the shipped data is correct; the design doc is stale) |
| **Overall** | **GO** — P1 and P2 repair may proceed to a plan, under the five conditions in §5 |

I **adopt** the 2026-09-05 Historian pass (`audits/20260905_EVENT_TIMING_HISTORIAN_ADJUDICATION.md`) on the
epoch and on the P1/P2 factual findings — I re-derived both independently rather than inheriting them —
and I **refine it in two places** and **partly refute the convener's brief in three**. Those are in §4.

---

## 0. What I re-measured myself

I did not take the brief's measurements on trust. Re-derived this session:

**Epoch.** `scenario_runner.ts:1963` → `{1992, month:3, day:6}`, month 0-indexed → 6 Apr 1992.
week N = floor((date − 6 Apr 1992)/7)+1. Recomputed by hand: w54 = 12–18 Apr 1993 · w160 = 24–30 Apr 1995 ·
w162 = 8–14 May 1995 · w171 = 10–16 Jul 1995 · w173 = 24–30 Jul 1995. **The epoch is sound.**

**Firing, from `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/weekly_report.jsonl`:**

```
ahmici_massacre_1993             *** NEVER FIRED ***
trusina_killings_1993            w54
sovici_doljani_attack_1993       w54
srebrenica_falls_1995            w162
srebrenica_column_breakout_1995  w163
zepa_falls_1995                  w164
un_hostage_crisis_1995           w160
coha_expires_1995                w156
```

**Vitez control (`data/derived/operational/operational_settlements.geojson`, runtime saves):** three OSIDs;
HRHB holds `op:vitez:vitez_2` only, at t0 and t188; zero net flips. Achievable fractions 0.00/0.33/0.67/1.00.
**MEASURED — the brief is correct.**

All headline numbers in the brief and in the two prior reports reproduce. I found no measurement error.

---

## 1. P1 — Ahmići — **NON-COMPLIANT**

### (a) Compliance

**NON-COMPLIANT** with §6, on the Ring-2 limb.

§1 Ring 2 places "Historical events in `data/scenarios/events/` — **Ahmići massacre**, …" among the things
the game *does* depict, "drawing on ICTY judgments." The row exists, carries
`source_tier: "icty_icj_un"` and cites *Blaškić*, *Kordić* and *Kupreškić* by case number — and it is
**arithmetically unreachable in every playthrough that has ever been run or ever will be**. A Ring-2
obligation discharged by a row that cannot fire is not discharged. The catalog asserts a citation it never
renders.

This is not a near-miss or a tuning question, which is what makes it a gate matter rather than a bug.
`0.5` against a 3-OSID municipality is not a high bar; **it is not a bar at all** — there is no reachable
value on either side of it that the map can express. The gate encodes a map resolution that does not exist.

### (b) Does it make an unsigned-off historical claim?

**Yes.** And I want to state the claim precisely, because the loose version of it is wrong.

The game does **not** assert that Ahmići did not happen. What it does, deterministically, every run, is
render mid-April 1993 **selectively complete in one direction**:

| 16–17 Apr 1993 | Perpetrator | In-game |
|---|---|---|
| Trusina killings | ARBiH (Zulfikar Detachment) | **fires w54** |
| Sovići / Doljani | HVO — territorial attack | **fires w54** |
| **Ahmići massacre** | **HVO — ~116 Bosniak civilians killed** | **never** |

Mid-April 1993 is the hinge of the Croat–Bosniak war, and Ahmići is its most judicially documented crime:
four ICTY trial judgements reach it — *Kupreškić et al.* (IT-95-16-T, TJ 14 Jan 2000), *Blaškić*
(IT-95-14-T, TJ 3 Mar 2000; AJ 29 Jul 2004), *Kordić & Čerkez* (IT-95-14/2-T, TJ 26 Feb 2001), and
evidentially *Prlić et al.* (IT-04-74). *Blaškić* establishes the HVO Operative Zone Central Bosnia command
at the Hotel Vitez, the Viteška Brigade, and the 4th Military Police Battalion ("Džokeri") at the Bungalow
at Nadioci as the forces that attacked the village on the morning of 16 April 1993.
Trusina is prosecuted before the **Court of BiH** in *Memić et al.* — I record it as a Court of BiH
prosecution with first-instance convictions and note that I did not re-verify its final appellate posture
this session; per §10.2 that is stated as what it is, not rounded up.

A campaign that renders the ARBiH-perpetrated massacre and the HVO's territorial attack, and never the
HVO-perpetrated massacre, on the same two days, in every run, is making a claim about the shape of that
week. The project has not signed off on it. It **inherited it from a threshold constant**, and — because a
non-firing event leaves no trace in any artifact — it has presumably been true of every campaign ever
played, unnoticed.

I note this cuts *against* HRHB, not for it. That is not a mitigation; it is the reason the fix is safe (§1d).

### (c) Minimum correct repair — and here I depart from the brief

The brief offers "threshold to 0.33, **retarget to the specific OSID `op:vitez:vitez_2`**, or something
else", and the 2026-09-05 pass called the OSID retarget "most faithful, since Ahmići is a village in the
HVO-held zone". **I traced where Ahmići actually sits, and that reasoning is wrong on its facts — though it
arrives at the right answer for a different reason.**

MEASURED:
- Ahmići is census settlement **`S160113`** (466 inhabitants; 356 Bosniak, 87 Croat).
- `data/derived/census_rolled_up_wgs84.json` → `{"from":"S160113","into":"S160318"}`.
  **S160318 = Pirići** (691; 466 Bosniak, 185 Croat) — the adjacent hamlet, attacked the same morning.
- `operational_settlements.geojson` lists **S160318 among the constituents of `op:vitez:preocica_3`**.

**Ahmići is not in `op:vitez:vitez_2`.** It is in a Bosniak-majority cell (`preocica_3`: 4,356 Bosniak /
1,364 Croat) that is **RBiH-controlled at runtime** — which is historically correct. Ahmići was a Bosniak
village the HVO **attacked**; it was not a village the HVO held.

That reframes the repair menu, and it rules one option out that nobody has proposed yet but someone will:

> **MUST NOT — do not gate on control of the OSID containing Ahmići.** Requiring HRHB control of
> `preocica_3` would encode "the HVO already held Ahmići" as the precondition for the massacre. That
> inverts the fact and makes the atrocity a consequence of holding the village rather than of taking it.
> It is the more "obvious" fix and it is the historically falsifying one.

**My recommendation, in order:**

1. **PREFERRED — retarget to `{"type":"territory_control","osid":"op:vitez:vitez_2","faction":"HRHB"}`.**
   Right answer, right reason: `vitez_2` is the **perpetrators' basing cell** — Blaškić's Operative Zone HQ,
   the Viteška Brigade, the Bungalow at Nadioci. The condition then reads "the HVO holds Vitez town",
   which is the documented precondition for the attack (*Blaškić* TJ). It is the tightest live predicate
   available, it stays satisfiable, and — decisively — it stays **falsifiable**: in a campaign where the
   ARBiH takes Vitez town, Ahmići does not occur. That is the correct counterfactual and it is exactly the
   §5 "counterfactual register" shape the gate already blesses.
2. **ACCEPTABLE BUT INFERIOR — threshold `0.5` → `0.33`.** It works, but 0.33 is satisfied at t0 and
   forever after, so the gate degenerates to "turn ≥ 54 AND tensions flag" — effectively calendar-only.
   §2 criterion 11 binds *ruptures* and Ahmići is expressly **not** a rupture (§2 roster: "scale below mass
   threshold; operational-level atrocity"), so this is not a violation. But it is the spirit of the thing,
   and it trades a dead gate for a vacuous one.

**MUST NOT, beyond the OSID inversion above:**

3. **Do not repaint the Vitez OSIDs.** `operational_initial_master.json` paints all three HRHB, and the
   runtime gives one — the convener's brief inherits this from the investigation as an unexplained
   "divergence". **It is not a divergence and it is not a defect.** The master file carries the
   *institutional* layer; the runtime applies `init_control_mode: "hybrid_1992"`, which overlays 1991-census
   ethnic majority ≥0.70 (`scenario_types.ts:119-121`). Kruščica (3,208 Bosniak / 1,433 Croat) and
   Preočica (4,356 / 1,364) flip to RBiH on the census. **That output is historically right** — those were
   the Bosniak villages of the upper Lašva; the HVO held Vitez town and the ARBiH held Stari Vitez,
   Kruščica and Preočica. It is also sacrosanct under `CLAUDE.md` ("NEVER override initial OSIDs"). Anyone
   who repairs Ahmići by repainting Vitez has broken a sacred rule *and* falsified the map to do it.
4. **Do not delete the control condition.** Railroad; the investigation is right about this.
5. **Do not touch `turn_min: 54`.** 16 Apr 1993 = w54. The date is exactly right. The gate is what is wrong.

### (d) Does repairing it create a reward-for-atrocity surface?

**No, and the direction is the opposite.** MEASURED — the row's entire effect set is punitive to the
perpetrator: `effect: {humanitarian_impact, faction: HRHB, war_crimes_delta: 3}`, plus
`negotiation_capital HRHB international_credibility −25`. There is no territorial gain, no supply gain, no
morale gain, and **`response_options: []`** — the same as its two siblings that already fire. Firing it
strictly worsens HRHB's position.

Two further checks, because "it looks punitive" is not sufficient:

- **§2a is untouched.** The emergent-cumulative condemnation flag is driven by
  `war_crimes_events_emergent` (sole writer `recordWarCrime`) and `civilian_casualties_caused`, and §2a(ii)
  **expressly excludes** "scripted `humanitarian_impact`/calendar-windowed events". Ahmići is exactly such
  an event. No route to the grade through §2a.
- **Ring 3 #4 holds.** More war crimes, monotonically worse. The repair adds a penalty to a faction; it
  inverts nothing.

**§6:222 is not engaged.** This is a Ring-2 fidelity repair moving *toward* the stated thesis. The standard
four are the right panel; the broader eight are not required and would be the wrong instrument.

---

## 2. P2 — Srebrenica and Žepa — **NON-COMPLIANT**

### (a) Compliance

**NON-COMPLIANT**, on a narrower ground than "it breaches the bright line" — and I want to be careful here,
because the loose version of this charge would be an overreach.

What is **not** wrong: the enclaves fall (guard holds), the fall is event-owned per **H1.8**, control flips
are attributable per **H2.1**, no atrocity is rewarded, no lever is created, the rupture
`srebrenica_genocide_1995` still fires on its discrete OSID+flag predicate. **The bright line is not
crossed.** Anyone arguing this item to the broader eight is arguing the wrong case.

What **is** wrong is §1 Ring 2. The row is a citation-bearing depiction whose own narrative effect states
*"Over 8,000 Bosniak men and boys are executed"* — that figure is *Krstić*'s finding — and it attaches it
to **8–14 May 1995**. Four ICTY judgements, the ICJ, and the UN Secretary-General's own report state one
date, identically:

| Fact | Date | Week | Authority |
|---|---|---|---|
| Directive 7 (Karadžić) — "unbearable situation of total insecurity… no hope of further survival" | 8 Mar 1995 | w149 | *Krstić* (IT-98-33-T) ¶28; *Popović et al.* (IT-05-88-T); UN A/54/549 |
| Directive 7.1 (Mladić) | 31 Mar 1995 | w152 | *Popović et al.* |
| UNSCR 998 — Rapid Reaction Force authorised | 16 Jun 1995 | w164 | UN |
| Krivaja-95 launched | 6 Jul 1995 | w170 | *Krstić* ¶¶120-123; *Popović et al.* |
| **Srebrenica falls** | **11 Jul 1995** | **w171** | *Krstić*; *Popović et al.*; *Karadžić* (IT-95-5/18-T); *Mladić* (IT-09-92-T); ICJ *Bosnia v. Serbia* (26 Feb 2007) |
| Column breakout, Šušnjari/Jaglići | 11–12 Jul 1995 | w171 | *Krstić* |
| Split Agreement | 22 Jul 1995 | w172 | BB II |
| **Žepa falls** (Stupčanica-95) | **25 Jul 1995** | **w173** | *Tolimir* (IT-05-88/2, TJ 12 Dec 2012) |

The game ships 11 Jul 1995 as May. On the single best-adjudicated date in the entire subject matter, the
depiction contradicts the judgments it cites. A Ring-2 row that cites *Krstić* and then dates *Krstić*'s
finding nine weeks wrong is not "drawing on ICTY judgments"; it is overwriting one.

### (b) Does the early dating violate §6 *in substance*, given the guard holds in letter?

**Yes — but the substantive harm is causal, not moral, and naming it correctly matters.**

The harm is not that the game is soft on the genocide. It is that the campaign teaches a **false sequence of
cause and effect** about the most consequential fortnight of the war. In history, the fall of Srebrenica is
the *cause*: of the London Conference, of the Split Agreement three days later, of the shift from
safe-area peacekeeping to Deliberate Force. In the shipped campaign it is an *antecedent* of none of them —
it happens before the RRF exists and eleven weeks before Split. A player reading the chronicle learns that
Srebrenica fell into a static May and that the international rupture that followed was unrelated to it.

**The catalog proves this against itself, and this is the finding I most want in front of the panel** —
it requires no external source at all:

> `rapid_reaction_force_1995` is authored at **`turn_min: 168`** (w168 = 19–25 Jun 1995), which is
> **correct** for UNSCR 998 and the Mt Igman deployment.
> `srebrenica_falls_1995.pressure.modifiers` contains
> `{flag: "rrf_deployed", rate_bonus: −0.5}` — a deliberate authored **brake**, encoding that the RRF's
> presence should slow the enclave's collapse.
> The RRF event cannot fire until **six weeks after Srebrenica has already fallen.**

**The one restraining term in the Srebrenica pressure model is structurally dead, and it is dead because of
the date.** The author who wrote that modifier understood the causal structure correctly and the
`turn_min: 160` floor silently disconnected it. The catalog is internally inconsistent with its own
correctly-dated neighbour. That is a defect on the catalog's own terms, before any historian is consulted.

### (c) Is correction permitted, and must the pin move in the same change?

**Permitted: yes. Same change: yes, mandatory.**

The pin is deliberate, and I read its intent from its assertions rather than its existence. The case name is
*"Srebrenica and Zepa fall rows are **event-authored territorial receipts**"*, and its load-bearing
assertions are the `control_change.faction === 'RS'`, the OSID lists, and the `territory_control`
preconditions — i.e. it defends **H1.8** (enclave falls occur only via explicit events, never by proximity
or accumulated activity) and **H2.1** (flips attributable). The `turn_min` and `pressure.threshold`
assertions pin the row's *shape*; **nothing in the test asserts that 160 is historically right, and no
comment claims it.** Moving `turn_min` does not weaken what the guard protects.

Conditions on the pin edit:
- **Edit it, never delete it.** Every H1.8/H2.1 assertion — `control_change.faction`, both OSID lists, both
  `territory_control` conditions, `zepa.requires_events` — survives unchanged.
- **Strengthen it while it is open.** Add an assertion that the receipt window contains w171 for Srebrenica
  and w173 for Žepa, so the next person who moves this number is told *why* it is where it is. The pin's
  present weakness is that it pins a number without recording its reason — which is how it came to defend a
  wrong one.

### (d) Is there a historically defensible reason for w160 the investigation missed?

**I looked for one and there is none for the fall. But the brief is missing the mechanism, and the
mechanism changes the remedy — so this is a partial refutation, not a bare "no".**

**The brief treats `turn_min` as the fall date. It is not.** MEASURED: `srebrenica_falls_1995` carries a
`pressure` block the brief does not mention —
`{base_rate: 1, threshold: 8, decay_rate: 0.5, modifiers: [coha_expired +2, rrf_deployed −0.5,
un_hostage_crisis_occurred +1]}`. Per `pressure_system.ts:33-56`, readiness accrues **only inside the
window**, so `turn_min` is when the squeeze *starts*, and the receipt lands when readiness crosses 8.
`coha_expires_1995` fired w156 → `coha_expired` true → effective rate 3 → 160:3, 161:6, 162:9 ≥ 8.
**That reproduces the measured w162 exactly.** The fall is `turn_min + 2`, not `turn_min`.

Read that way, the architecture is **defensible and rather good**: a strangulation that accumulates, sped by
the collapse of the ceasefire regime and the hostage crisis, slowed by the RRF. It is a fair model of
Directive 7. What is not defensible is the constant. If w160 were meant as "the squeeze begins", the
historical answer is **Directive 7, 8 March 1995 = w149** — not late April — and at rate 3 a w149 start
would put the fall in *March*. There is no rate/threshold reading of the shipped constants under which
`turn_min: 160` yields July. **The date is an authoring artifact of a shared floor**, as the 2026-09-05
pass ruled: w160 is the `turn_min` the May-1995 cluster (Tuzla Kapija, hostage crisis) needs, and the July
events were bound to it. I concur with that finding and add the mechanism to it.

`turn_max: 185` is defensible — it is enclave-guard slack. **Keep it.**

### (e) Consequence for the remedy — two findings that shrink the change

**1. Žepa needs no change at all, and its correct date falls out for free.**
`zepa_falls_1995` has `requires_events: ["srebrenica_falls_1995"]` and
`pressure: {base_rate: 3, threshold: 6, decay_rate: 0}` — so it fires **exactly 2 turns after** Srebrenica's
receipt, regardless of its own `turn_min: 160`, which is inert. MEASURED: 162 → 164, +2. ✅
**11 Jul → 25 Jul 1995 is 14 days — exactly two weeks.** Fix Srebrenica and Žepa lands on 24–30 Jul,
containing 25 Jul, correctly, for free. **The minimum repair is a one-field change:**
`srebrenica_falls_1995.trigger.turn_min`. Žepa's pin assertion (`toBe(160)`) does not even need editing.

**2. Do not compute the new `turn_min` by subtracting a fixed offset — measure it.** With the RRF brake
becoming live for the first time (§2b), the rate is not constant across the window: 3 before
`rrf_deployed`, 2.5 after. A naive `171 − 2 = 169` is *approximately* right and may land w172. My
recommendation is stated as a **target, not a constant**: the receipt should land in **w171** (10–16 Jul,
containing 11 Jul), and the value of `turn_min` that produces it is a measured calibration against the
pressure constants, on a **188w run**. Per this project's own rule, a 40w run cannot see any of this.

**3. Do not narrow `turn_max`.** The 2026-09-05 pass flagged this as the panel's call and declined to rule.
**I rule: leave `turn_max` at 185/190.** A wide ceiling costs nothing historically — with pressure the
receipt arrives ~2 turns after the window opens either way — and it is the only thing standing between a
future calibration change that delays eligibility and a **guard breach**. Historical precision on
`turn_min` is free; historical precision on `turn_max` is purchased with a risk that Srebrenica does not
fall. **That trade is refused.** The guard is not narrowed on my seat's vote.

---

## 3. P4 — canon vs shipped data — **COMPLIANT**

### (a) Which document governs

**`SENSITIVE_HISTORY_DESIGN_GATE.md`, and it is not close.**

- It declares itself **"CANON (v0.9.0 gate)… Authority: Canon hierarchy, Tier 2 (above Rulebook, below
  Engine Invariants)"**, adopted for v0.9.0 and last amended 2026-08-16.
- `ENDGAME_AND_NEGOTIATION_DESIGN.md` sits in `docs/30_planning/design/` and is described **by the gate
  itself**, in its own §9 reference list, as *"original design discussion"*. Its decisions are dated
  **2026-03-15** — five months before the gate's current text.
- The gate's header states: **"Supersedes: open question #7 in `MASTER_ROADMAP.md` ('Srebrenica — how do we
  handle the genocide mechanically and narratively?')"**. **This exact question has already been taken off
  the table by name.** Decision #4 is a surviving fragment of the question the gate was written to close.

There is also no three-way conflict. `MASTER_ROADMAP.md` §6.4 — *"Sensitive outcomes are informational
consequences, not player choices or optimization rewards"* — **agrees with the gate**. The brief frames this
as roadmap-contradicts-design-doc; in fact it is **two documents agreeing and one stale line dissenting**.

### (b) Is the shipped data compliant?

**Yes. Emphatically, and it is the design doc that is out of compliance.**

Zero `response_options` on all seven rows is not an omission — it is the gate being obeyed. §1 Ring 3 is
declared *"exhaustive and binding"* and item **#1** reads:

> *"**No "commit genocide" decision tree.** Genocide is never a button, a slider, a multi-option event, or a
> player-authorized instruction."*

A decision event on `srebrenica_falls_1995` with a "restraint path" is a multi-option event on genocide.
That is item #1 verbatim. The design doc's own framing — *"Historical path: gain territory, lose
catastrophic humanitarian capital… Restraint path: occupy without massacre, **less humanitarian cost**"* —
is additionally **#5** (an atrocity-efficiency framing) and **#4** (a body-count optimization surface),
because a branch that is explicitly cheaper is a lever by construction.

**One live hazard I am flagging, which nobody has raised.** MEASURED: none of the seven rows carries a
`family` field (`family: undefined` on all seven). The Ring-3 mechanical guard
(`validateRing3EnablingRejection` / `isRing3SensitiveFamily`, `event_families.ts:189-228`) keys on `family`,
and `rs_drina_campaign` is in `RING3_SENSITIVE_FAMILIES`. **So the loader's Ring-3 rejection is currently
unarmed on exactly the events P4 is about** — the data is compliant by authorial restraint, not by
enforcement. If anyone ever adds `response_options` to `srebrenica_falls_1995`, **nothing stops them.**
I recommend, as a separate low-risk hardening item outside this panel's two repair lanes, that the
Srebrenica/Žepa rows be given the appropriate Ring-3 `family` tag so the guard bites. That is a change to
sensitive-history data and would need its own §6 pass; I raise it, I do not propose it here.

### (c) Standard four, or broader eight?

**Standard four.** Confirming that canon governs and correcting a stale planning doc to match it does not
cross the bright line — **it enforces it.** The bright line is *"atrocity is never rewarded; enclave
outcomes event-owned per H1.8; the canon hierarchy"*, and this ruling upholds all three.

The correct output is a **documentation correction**: mark
`ENDGAME_AND_NEGOTIATION_DESIGN.md:339` decision #4 **SUPERSEDED by `SENSITIVE_HISTORY_DESIGN_GATE.md`
§1 Ring 3 #1**, with a pointer, in the same change as any P1/P2 work or immediately after. Decision #5
(Operation Storm, *"scripted trigger, player-influenced scope"*) is **not** in conflict — Storm is a
military operation, not an atrocity, and `operation_storm_1995` being a scripted notification at w174
(4 Aug 1995, exact) is consistent with it; the "player-influenced scope" clause describes the follow-up
Federation offensive, which is Ring-1 operations territory and outside this gate. **I would leave #5 alone**
and correct only #4, so that the correction is precisely as wide as the conflict.

**The broader eight would be required for the opposite proposal** — actually *building* the restraint
decision. That would amend Ring 3, which is declared exhaustive and binding, and would be a change to what
the game is about.

### (d) Should a Srebrenica restraint decision exist? — **NO**

The panel asked to be asked, so I will answer plainly and give the historical reason, since that is my seat.
**No. Not as a §6 formality — on the history.**

**1. The design doc's premise is the account the tribunals rejected.** Its stated lesson is *"it wasn't
militarily necessary — RS could have taken Srebrenica without it."* The military-necessity framing was the
defence theory at trial, and the judgments went the other way on the specific point that matters here. The
object of the operation was set at the **strategic level, in March**, four months before any commander stood
outside the town: Directive 7 ordered the creation of *"an unbearable situation of total insecurity with no
hope of further survival or life for the inhabitants of Srebrenica and Žepa"* (*Krstić* ¶28; A/54/549).
And *Krstić* found the **forcible transfer** of the ~25,000 women, children and elderly from Potočari — not
only the executions — to be part of the genocidal conduct (*Krstić* TJ ¶¶595-599; affirmed in substance in
*Popović et al.*, *Tolimir*, *Karadžić*, *Mladić*). **"Occupy without massacre" is therefore not a branch
that existed at the point the game would offer it.** The removal of the population *was* the operation's
object. A game presenting it as a July choice by the player would teach that the genocide was a
battlefield decision, taken by a man with an alternative in front of him — which is precisely the
exculpatory story four judgements and the ICJ rejected.

**2. The lesson the design doc wants already exists, and exists better.** *"It wasn't militarily
necessary"* is delivered today by the enclave **holding** through ordinary military means, with §5's
`enclave_defended` ghost entry recording the counterfactual in historical voice and the absence of a
`genocide_condemnation` flag as the only "reward" — which is exactly Ring 3 #10 (*"The reward is the absence
of a flag, not a badge"*). **That mechanism is already canon, already built, and already carries the lesson
without making genocide a menu item.** Adding the decision would not deliver something missing; it would
deliver the same lesson through a surface the gate forbids.

**3. Where the design doc's instinct is legitimate, and I want this on the record so the "no" is not read as
complacency.** The doc is reacting to something real: the RS player currently has **no agency anywhere near
Srebrenica**. The enclave falls by an event write; per this project's own record, **zero of 599 battles ever
target it**. The president's experience of the war's central atrocity is a notification. The honest version
of that complaint is **not** a decision about the massacre — it is that **Krivaja-95 should exist as a real
operation the enclave can survive**, so that holding Srebrenica is something a player can actually attempt
and fail at. That is Ring 1, operations and calibration, no bright line anywhere near it. I flag it as an
**observation**, explicitly not a recommendation this panel is being asked to adopt, and explicitly not a
condition on my GO.

---

## 4. Where I refute or refine the briefs

Refuting the framing is in scope, so I am explicit about it.

1. **REFUTED — "retarget to `op:vitez:vitez_2`… most faithful, since Ahmići is a village in the HVO-held
   zone."** Ahmići (S160113) merged into Pirići (S160318), which sits in **`op:vitez:preocica_3`**, a
   Bosniak-majority RBiH cell. `vitez_2` is the right target for the *opposite* reason — it is the
   perpetrators' base, not the victims' village. The distinction is not pedantic: the stated reasoning
   points a future implementer straight at gating on `preocica_3`, which would encode that the HVO already
   held Ahmići.
2. **REFUTED — the Vitez painted-vs-runtime "divergence" (investigation §6/P1, carried into the brief).**
   It is not a divergence. It is `hybrid_1992` applying the 1991 census ethnic override, and its output is
   both historically correct and sacrosanct. Recorded so that it is not "fixed".
3. **REFUTED IN PART — the brief's P2 framing treats `turn_min` as the fall date.** There is a `pressure`
   block; the fall is `turn_min + 2`. This changes the remedy from an arithmetic substitution to a measured
   calibration, and it is why Žepa needs no edit.
4. **NEW — the RRF brake is structurally dead, and the catalog contradicts itself.**
   `rapid_reaction_force_1995` is correctly dated (`turn_min: 168`, w168 = 19–25 Jun 1995) and fires six
   weeks after the enclave has already fallen, so `rrf_deployed: −0.5` has never once applied. The catalog
   proves the w160 floor wrong without any external source.
5. **NEW — the Ring-3 loader guard is unarmed on all seven P4 rows** (`family: undefined`). The data is
   compliant by restraint, not enforcement.
6. **NEW — a data inconsistency found in passing, not §6-decisive, routed to the data lane.**
   `operational_settlements.geojson` lists S160318 (Pirići, containing Ahmići) as a constituent of
   `op:vitez:preocica_3`, while `canonical_to_operational_map.json` maps `S160318 → op:busovaca:bare_2` and
   omits it from its 34-member Vitez list. The two derived artifacts disagree about which OSID contains the
   site of Ahmići. It does not change any verdict above — under either reading Ahmići is outside `vitez_2`
   and in a non-HVO cell — but somebody should reconcile it, and it should not be discovered for the first
   time by whoever implements P1.
7. **ADOPTED** — the 2026-09-05 Historian pass's epoch derivation, its w54 "correct compression, do not
   touch" ruling, and its P1/P2 factual findings, all re-derived independently this session.
8. **ADOPTED** — the 2026-09-06 P3 sweep's verdict that Ahmići is the sole hard blocker of its kind, and its
   class-B caveat that `operation_lukavac_93` is **unsettled, not cleared**. I note for the record that the
   sweep's own self-caught polarity error (`mostar_liberation_1992`) is why I trust the rest of it.

---

## 5. OVERALL VERDICT — **GO**

**Repair work on P1 and P2 may proceed to a plan**, subject to five conditions from this seat:

1. **P1 gate, not date, and not the map.** `turn_min: 54` unchanged. Initial Vitez control unchanged.
   Preferred fix is `territory_control op:vitez:vitez_2 = HRHB`; threshold→0.33 acceptable but inferior;
   gating on the OSID that contains Ahmići and deleting the control condition are both **refused**.
2. **P2 moves `turn_min` on `srebrenica_falls_1995` only.** `turn_max` **is not narrowed** — the enclave
   guard is not traded for date precision. Žepa needs no edit; its correct date follows from
   `requires_events` + pressure.
3. **P2's new `turn_min` is measured, not computed.** Target: the Srebrenica receipt lands in **w171**
   (containing 11 Jul 1995), which puts Žepa in w173 (containing 25 Jul 1995). Validate on a **188w** run.
   A 40w run cannot see any of this.
4. **The test pin is re-authored in the same change, never deleted**, retaining every H1.8/H2.1 assertion
   and adding an assertion that records *why* the window sits where it does.
5. **P4 resolves as a documentation correction, standard four, no build.** Mark
   `ENDGAME_AND_NEGOTIATION_DESIGN.md:339` decision #4 SUPERSEDED by the gate §1 Ring 3 #1. Leave decision
   #5 (Storm) alone. **No Srebrenica restraint decision is to be built**, and my seat's answer on the
   substance is **no**.

**GO. No BLOCK from the Historian seat on either repair lane.**

---

### Sources cited

ICTY: *Kupreškić et al.* IT-95-16-T (TJ 14 Jan 2000) · *Blaškić* IT-95-14-T (TJ 3 Mar 2000; AJ 29 Jul 2004) ·
*Kordić & Čerkez* IT-95-14/2-T (TJ 26 Feb 2001) · *Prlić et al.* IT-04-74 · *Krstić* IT-98-33-T (TJ 2 Aug
2001; AJ 19 Apr 2004) · *Popović et al.* IT-05-88-T (TJ 10 Jun 2010) · *Tolimir* IT-05-88/2 (TJ 12 Dec 2012;
AJ 8 Apr 2015) · *Karadžić* IT-95-5/18-T (24 Mar 2016) · *Mladić* IT-09-92-T (22 Nov 2017).
Court of BiH: *Memić et al.* (Trusina) — cited as a Court of BiH prosecution with first-instance
convictions; final appellate posture not re-verified this session, and stated as such per §10.2.
ICJ: *Bosnia and Herzegovina v. Serbia and Montenegro*, Judgment 26 Feb 2007.
UN: A/54/549 (15 Nov 1999) · UNSCR 819 (16 Apr 1993) · UNSCR 824 (6 May 1993) · UNSCR 998 (16 Jun 1995).
Balkan Battlegrounds vols. I–II — Lašva Valley 1993; Krivaja-95; Split Agreement 22 Jul 1995.
Wikipedia not used.
