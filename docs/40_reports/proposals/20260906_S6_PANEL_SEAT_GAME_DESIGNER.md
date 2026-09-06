# §6 Panel — GAME DESIGNER seat verdict

**Date:** 2026-09-06
**Seat authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md:213` (panel membership), `:228`
(*"`/game-designer` reviews must verify the change does not create a Ring 3 refused surface by accident"*).
**Polled independently.** I read the prior game-designer audit and reconciliation as evidence. I adopt
part of the reconciliation's P8 reading, reject part of the convener's P1 framing, and add three findings
of my own that no seat has recorded.

**No code, data, or canon was changed.**

Legend: **[M]** measured by me this session · **[M-cited]** measured by another seat, cited not re-run ·
**[I]** inferred · **[DO]** design opinion.

---

## Summary

| Item | Verdict |
|---|---|
| **P1 — Ahmići unreachable** | **NON-COMPLIANT as shipped. Repair is COMPLIANT** — with a preference between the two proposed repairs and one panel-composition condition. |
| **P4 — canon vs. design doc** | **Shipped data is COMPLIANT. The design doc is the defect.** A Srebrenica restraint decision **IS** a Ring 3 refused surface. Reconciling toward canon does **not** need the broader eight. Building the decision **does**, and I vote NO on it. |
| **P8 — recurrence** | Prior reading substantially correct; separate home is sound with one machine-checkable exclusion. **Not §6 business, except for that exclusion.** |
| **Overall** | **GO** — repair work on P1 and P2 may proceed to a plan, under the conditions in §5. |

---

## P1 — `ahmici_massacre_1993` never fires

### (a) COMPLIANT or NON-COMPLIANT

**The status quo is NON-COMPLIANT. The repair is COMPLIANT.** I want the panel record to carry both
halves, because the convener's framing asks only about the repair and that quietly concedes the harder point.

The gate does not contain a positive "must depict" clause, so there is no single line to cite for the
status quo. The finding is structural, and it lands on two:

- **§1 Ring 2** names *"Ahmići massacre"* first in its list of historical events the game depicts
  (`SENSITIVE_HISTORY_DESIGN_GATE.md:45`). A Ring-2 placement is a positive assertion that the game
  represents the event. A row that is arithmetically unreachable in every run is not a representation;
  it is a representation-shaped file. **[M-cited]** — the sweep
  (`20260906_FACTION_CONTROLS_MUNICIPALITY_THRESHOLD_SWEEP.md`, class A) establishes 1 of 3 Vitez OSIDs
  at both t0 and t188, zero net flips, and no achievable 0.5 in a 3-OSID municipality.
- **§1 Ring 3 #9** — *"All perpetrators are named."* The clause is written against justified-atrocity
  framing, and I am reading it slightly wider than its sentence, so I flag that as **[I]**. But the
  effect is not arguable: the catalog fires **Trusina** (Bosniak-perpetrated, 16 Apr 1993) and
  **Sovići/Doljani** (HVO territorial, 17 Apr) and never the HVO-perpetrated massacre in the same week,
  **deterministically, in every campaign ever run**. The game does not assert Ahmići did not happen. It
  renders the hinge week of the Croat-Bosniak war selectively complete in one direction, every time, and
  a non-firing event leaves no trace in any artifact — nobody could have noticed from a run.

That is what makes it a §6 matter rather than a bug ticket. **Repairing it moves toward the stated
thesis, not across it.** I agree with the Historian's routing: the standard four, not the broader eight.

### (b) Does repair create a Ring 3 refused surface by accident?

**No.** I checked all eleven clauses rather than the one about options. The load-bearing ones:

- **#1 (no decision tree)** — the row has **no `response_options`** **[M]**. Repair edits a trigger
  predicate; it adds no option, no branch, no `enables_events`. The loader's Ring-3 enabling rejection
  (`validateRing3EnablingRejection`, `src/sim/events/event_families.ts:189-228`) is untouched. **PASS.**
- **#4 (no body-count optimization surface)** — this is the clause that would actually bite, and it is
  the one nobody has measured. I traced the effect **[M]**:

  `effect: {kind: 'humanitarian_impact', faction: 'HRHB', war_crimes_delta: 3}` →
  `src/sim/events/apply_effects.ts:108` → `applyHumanitarianImpact` (`:355-365`) → increments
  `cap.war_crimes_events` **only**. Plus `negotiation_capital / international_credibility: −25` for HRHB.

  **Both directions are strictly worse for the perpetrator faction, and there is no input under which
  firing Ahmići improves an HRHB outcome.** PASS on #4, and on **#5** (no atrocity-efficiency metric)
  by the same trace.
- **§2a purity preserved [M].** `applyHumanitarianImpact` writes the shared `war_crimes_events` and
  **never** `war_crimes_events_emergent` — the separation is documented at
  `src/state/negotiation_types.ts:33-43` precisely so a calendar-windowed scripted event can never trip
  `authorized_cleansing_condemnation` (§2 criterion 11). **Repairing Ahmići therefore cannot leak a
  calendar event into the emergent condemnation flag.** This is the single most important measurement
  under (b) and I record it as the seat's answer, not as a footnote.
- **#11 (no calendar-driven atrocity recording)** — Ahmići is **not** a rupture; §2's own table
  (`:91`) excludes it on scale. It sets no condemnation flag. **PASS.**

### (b′) MY OWN FINDING — the two proposed repairs are not equivalent, and one of them is a railroad

The convener presents *"threshold 0.33, or retarget to `op:vitez:vitez_2`"* as alternatives. They are not
alternatives of equal standing, and the difference is exactly my seat's business.

The investigation itself warns *"Do not delete the control condition — that makes it a railroad."*
**A threshold of 0.33 against a municipality where HRHB holds 1 of 3 at t0, t188, and every turn between,
with zero net flips, is the deleted condition wearing a predicate's clothes.** It is satisfied at turn 0,
cannot be unsatisfied by anything any player or bot does, and therefore encodes no cause. Under
`FORAWWV.md` §IX.6 **H2.1** (*"every control flip must be attributable to an explicit cause"*) and
**H1.8** (*"consequence pathways require explicit operations or events; adjacency or activity alone is
insufficient"*) the event-owned pathway is legitimate — but a gate that is true by construction is not a
pathway, it is a calendar with a decoration. That is the shape §2 criterion 3 exists to forbid for
ruptures, and while Ahmići is not a rupture, adopting the shape here is precedent I will not sign.

**Retargeting to `territory_control op:vitez:vitez_2 = HRHB` is the better repair and my seat prefers it**,
for three reasons: it names the place the HVO actually held (Vitez town); it is a live predicate that
would stop being satisfied if the modeled war ever took Vitez town, so the counterfactual stays reachable
in principle; and it is H2.1-attributable in form as well as in effect. Both repairs fire in every run
*today*; only one of them would ever stop.

**A third option the panel should ask about before choosing either.** The investigation records
(§6/P1, "Also noted for the data lane") that `operational_initial_master.json` paints **all three** Vitez
OSIDs HRHB while `hybrid_1992` init gives the runtime one. **[M-cited, uninvestigated]** If that
divergence is the real defect, the 0.5 threshold is correct as authored and needs no §6 edit at all —
the repair is a data-truth fix and this panel item evaporates. I am **not** recommending that action:
*"NEVER override initial OSIDs"* is a sacred rule and initial control from census/referendum is
sacrosanct. I am saying the panel should not edit a gate to work around a divergence nobody has yet
explained. **Route the divergence first; choose the gate repair second.**

### (c) Does "informational, no `response_options`" settle the Ring 3 question?

**No — it settles one clause of eleven, and it is necessary but not sufficient.**

Absence of options discharges **#1** and nothing else. Ring 3 also refuses things that informational
content does perfectly well on its own: **#4** body-count optimization (an informational effect that
*improved* a faction's standing would breach it — I had to trace the writer to know it does not),
**#5** atrocity-efficiency framing, **#7** ranking factions by atrocity, **#9** justified-atrocity
framing, **#6** alternate-history minimization. Ahmići's narrative and `source_note` are §4-clean
**[M]** — the note explicitly disclaims *"prohibited player choices, or alternate-outcome prevention
framing"* — and the ICTY citations (Blaškić IT-95-14-T, Kordić IT-95-14/2-T, Kupreškić IT-95-16-T) meet
§4's required-citation rule.

So the Ring 3 question is settled **by the eleven-clause check I performed**, not by the absence of
options. I want that distinction in the record because *"it's only informational"* is the exact reasoning
that would wave through a future row where clause #4 does bite.

### P1 condition — panel composition

§6's sign-off table has no row for *"repair a dead trigger on an atrocity event."* The nearest rows are
**"Change to atrocity event content" → `/historian` + `/narrative-designer`** (`:216`). This panel has no
narrative-designer seat. **My GO is conditioned on:** if the repair touches only `trigger.condition`, the
convened four suffice; **if one word of `narrative`, `title`, or `source_note` changes, a
`/narrative-designer` §4 signature is required before merge.** Implementer ≠ reviewer applies to that too.

**P1 VERDICT: NON-COMPLIANT as shipped; repair COMPLIANT.** Prefer the `op:vitez:vitez_2` retarget over
the 0.33 threshold. Route the master/init divergence before choosing.

---

## P4 — canon vs. the resolved design decision

### (a) Which governs

**The gate governs. This is not close, and the design doc says so itself.**

- `SENSITIVE_HISTORY_DESIGN_GATE.md:3-9` — **Status: CANON**, *"Authority: Canon hierarchy, Tier 2 (above
  Rulebook, below Engine Invariants)"*, and — decisively — **`Referenced by:` lists
  `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`**, while `:8` records that the gate
  **supersedes** MASTER_ROADMAP open question #7, *"Srebrenica — how do we handle the genocide mechanically
  and narratively?"* The gate is the answer to the question the design doc was discussing.
- The gate's own §9 References files `ENDGAME_AND_NEGOTIATION_DESIGN.md` under *"Canon and design"* as
  **"original design discussion."** **[M]**
- `ENDGAME_AND_NEGOTIATION_DESIGN.md:3` — **"Status: DESIGN — awaiting review and refinement"**, dated
  **2026-03-15**. **[M]** It is not in the canon hierarchy at any tier. Its §6 heading reads
  *"Design Decisions (Resolved 2026-03-15)"* — resolved **within that document**, five months before the
  gate, by the discussion the gate then settled.
- `MASTER_ROADMAP.md:324` §6.4 — *"Sensitive outcomes are informational consequences, not player choices
  or optimization rewards"* — is **consistent with** the gate, not a competing authority. **[M]**

**So there is no genuine conflict of authorities. There is a stale document.** The word "RESOLVED" in the
design doc is doing damage precisely because it reads as settled to anyone who arrives there first — which
is what happened to the seat that flagged this.

### (b) Is the shipped data compliant?

**COMPLIANT.** Zero `response_options` on all seven 1995 events **[M-cited; I re-read three: 
`srebrenica_falls_1995`, `zepa_falls_1995`, `operation_storm_1995` — none carries the field]** is the
gate-compliant state, not a gap. It is what §1 Ring 3 #1, §6.4, and H1.8 jointly require.

**The defect is the design doc, and it should be corrected.** The bright-line rule in `CLAUDE.md` exists
to stop a thesis moving silently in engine behaviour while canon still claims otherwise. **This is that
failure arriving from the opposite direction** — a design doc claiming a thesis the canon has refused,
sitting unmarked where a future implementer will read it as a mandate. Correcting it is a documentation
fix (annotate `:339` and `:341` as superseded by the gate, with the pointer), requires no canon amendment,
and crosses nothing.

### (c) Is a Srebrenica restraint decision a Ring 3 refused surface?

**YES. Unambiguously, on three independent clauses.** This is my seat's core answer.

1. **§1 Ring 3 #1** — *"No 'commit genocide' decision tree. Genocide is never a button, a slider, a
   **multi-option event**, or a player-authorized instruction."* A decision event offering
   *"historical path / restraint path"* at Srebrenica **is** a multi-option event one of whose options is
   the genocide. Framing the pair from the restraint side does not change what the other option is. The
   player is not merely present at the massacre; the player is asked.
2. **§1 Ring 3 #10** — *"No gamified 'prevent genocide' mechanic. The player cannot earn points for
   preventing Srebrenica; they can only keep the enclave intact through ordinary military means. The
   reward is the absence of a `genocide_condemnation` flag, not a badge."* The design doc's restraint
   path offers **"less humanitarian cost"** — a *priced* alternative. That is the badge, denominated in
   capital instead of points.
3. **§4 / §2a(ii)(a)** — the design doc's own framing is *"gain territory, lose catastrophic humanitarian
   capital"* versus *"occupy without massacre, less humanitarian cost."* **That is a trade, stated as a
   trade.** §3's "What it must never become" forbids exactly this shape for the one authorized-war-crime
   surface that does exist: *"a risk/reward tooltip that frames atrocity as a trade."* §8's first life
   lesson is the same sentence in general form: *"Atrocity is a consequence, not a lever. The moment a
   sensitive-history feature becomes a player-optimizable trade-off, it is wrong."*

**And the engine already refuses it mechanically.** `RING3_SENSITIVE_FAMILIES` includes
`rs_drina_campaign`, `rs_drina_campaign_tempo` and `un_safe_area_enforcement`, with prefix matching over
`rs_drina_campaign` and `un_safe_area_` (`src/sim/events/event_families.ts:189-228`) **[M]**. Under the
gate's *"Mechanical enforcement — Ring-3 enabling rejection"* paragraph (`:66`), **no response option may
open a Ring-3 sensitive-family event.** A restraint branch that toggles the Srebrenica arc is rejected at
load. The refusal is not merely doctrinal; it is already wired.

**The one thing the design doc gets right, and where it already lives.** Its stated lesson — *"it wasn't
militarily necessary; RS could have taken Srebrenica without it"* — is a true and important claim, and the
gate already has a **Ring 2** home for it that costs no lever: the essays and the ICTY/ICJ record (§5),
and the counterfactual register at §5 *"Counterfactual register (canonical pattern)"*. The lesson does not
need a button. **It needs the recorder that §5 already designates — which brings me to a finding.**

### (c′) MY OWN FINDING — the gate's canonical counterfactual recorder is dead by construction

`SENSITIVE_HISTORY_DESIGN_GATE.md:196-203` names the Mission E **`enclave_defended` ghost entry** as
*"the §3-compliant counterfactual recorder for sensitive-history divergence"* and *"the canonical pattern
for any future 'what the modeled war produced instead of the historical atrocity' annotation"*, gated on
the `enclave_held_through_turn` flag.

**MEASURED: that flag has zero writers.**

- `src/sim/turn_phases/war_phases.ts:1084-1086` — *"The Srebrenica `enclave_held_through_turn` threshold
  flag is §6-gated and is **NOT written here**."*
- `src/sim/codex/observer_threshold_flags.ts:18-21` — *"is §6-GATED … and is **DELIBERATELY NOT written**
  here. It is deferred for separate §6 historian handling."*
- Only other references are the reader (`dynamic_section_builder.ts:453,461`). No writer anywhere in `src/`.

So the gate cites as its **canonical pattern** a mechanism that has never run in any campaign. Combine that
with `memory/srebrenica_fall_is_a_hardcoded_write.md` (all 10 OSIDs flip in one tick at t162,
mechanism=event; **0 of 599 battles ever target the enclave**) **[M-cited, memory]** and the picture is
this: Ring 3 #10 promises the player that they *"can keep the enclave intact through ordinary military
means,"* and the reward for doing so is a recorder with no writer, reached by a route no battle takes.

**I am not blocking on this and it is not P4's question.** But it is the substantive thing behind the
design doc's discomfort, and it deserves a name: **the honest answer to "should there be a Srebrenica
decision" is "no — and the non-decision avenue the gate promises instead is currently dark."** That is a
Ring-2/§5 authoring item, needs no lever, no option, and no bright-line crossing. **I ask that it be
recorded as a new panel item (P9) rather than folded into P4.**

### (d) Does resolving P4 cross the bright line?

**It depends entirely on the direction, and the panel should not let those two be spoken of as one item.**

- **Reconciling toward canon** — annotating `ENDGAME_AND_NEGOTIATION_DESIGN.md:339,341` as superseded,
  pointing at the gate: **does NOT cross.** Nothing moves; a stale document is marked stale. **Standard
  four is sufficient. My seat says do this, and do it soon** — it is the cheapest item in this whole
  investigation and it is the one that stops the next reader repeating this discovery.
- **Building the restraint decision** — **CROSSES.** It would make atrocity a player-optimizable
  trade-off, which is the atrocity-is-never-rewarded thesis itself. Per `CLAUDE.md` it requires the
  **broader eight-seat panel, unanimous, implementer excluded**, a same-change amendment to the gate
  (§1 Ring 3 #1 and #10 would both have to be rewritten, not merely reinterpreted), **and surfacing to
  the owner as a proposal while it is still a proposal.**

### (e) Should such a decision exist? — plainly

**No.** Not gated, not carefully worded, not later. This is my seat's opinion and I state it as **[DO]**.

Three reasons, in the order I actually weight them.

1. **It inverts the game's answer to its own central question.** AWWV's player-experience direction is
   *"authorship of the tragedy"* and *"powerlessness, not a power fantasy."* A restraint button converts
   the worst crime of the war into the player's **finest hour** — the moment they were offered the
   massacre and declined. That is the most flattering thing this game could ever say to a player, and it
   would be said at Srebrenica. The gate's §8 rule is *"when in doubt, the answer is no"*; I am not in
   doubt.
2. **A choice offered is a choice priced, and pricing this one is the breach.** The moment restraint has a
   cost, genocide has a benefit — the player is invited to compute. §3 already forbids exactly this
   framing for the one authorized-war-crime surface the game does expose. There is no wording that
   removes the arithmetic; the arithmetic is what the option *is*.
3. **The historical claim does not need the mechanic.** *"It wasn't militarily necessary"* is a claim about
   the past, and the game's instrument for claims about the past is Ring 2 — where it is already made, with
   Krstić, Karadžić, Mladić and the ICJ behind it. A branch does not strengthen that claim; it converts an
   adjudicated finding into a scenario the player got to try both ways. **That is a weaker statement about
   history, not a stronger one**, and it is §5's *"the historical record is not a reward"* read backwards.

I would add one thing for whoever eventually re-opens this, since someone will. The design doc's instinct
was not stupid — it was reaching for player *comprehension* of the fact that the genocide was chosen by
people who could have chosen otherwise. That is a real and worthy design goal. **It is a narrative and
Codex problem, not a decision-event problem**, and P9 above is where it should be worked.

**P4 VERDICT: shipped data COMPLIANT. The design doc is NON-COMPLIANT as a statement of intent and should
be annotated as superseded. A Srebrenica restraint decision IS a Ring 3 refused surface. Reconciliation:
standard four. Construction: broader eight + owner, and my seat votes NO.**

---

## P8 — recurrence, `once: true`, and Rulebook §17.5

### (a) Prohibition, or worked-around invariant?

**I agree with the prior reading and I verified its load-bearing evidence myself.** **[M]** —
`tests/event_timeline_integrity.test.ts` is titled *"Event timeline historical integrity"*; the assertion
at `:23-27` sits among duplicate-ID, `turn_min` sortedness, `requires_events` ordering, Vance-Owen/
Croat-Bosniak ordering, ceasefire-before-Dayton, and the Srebrenica/Žepa receipt pin at `:90-117`. Every
neighbour is a chronology guardrail. Meanwhile the engine implements recurrence fully
(`evaluate_events.ts:110-131`, `RecurrenceConfig`) and the loader validates once/recurrence mutual
exclusion (`event_loader.ts:424-425`). **You do not build, type, and validate a feature you have ruled
out.** `action_cadence` then delivers repetition by a parallel contract that the test cannot see.

**Refinement, because the two framings offered are both slightly wrong.** It is not *"the test is a
prohibition"* and not *"§17.5 is simply unimplemented."* It is: **§17.5 is implemented in the engine and
unexpressed in the data, because the only four files anyone authors into are dated timelines where
`once: true` is the correct invariant.** Once-only is right for Markale, right for Stari Most, right for
Ahmići. It is wrong for a standing presidential decision, and nothing in the repo has a home for one.

**One thing I want to add that neither prior pass said.** §17.5's second sentence —
*"Options narrow as the player defers"* — is not a pacing feature. It is the **single best mechanical
expression of AWWV's thesis anywhere in the Rulebook**: agency that degrades because you did not use it,
which is exactly `Rulebook §17.4`'s constrained agency and the consequence-loop direction. **It is worth
implementing and it is not worth deleting from canon.** If the panel were ever tempted to resolve the
canon-vs-test conflict by amending §17.5 away, that would be the wrong direction of fix.

### (b) Separate home — sound, or fragmentation?

**Sound.** The catalog is *already* partitioned by kind, not unified — `consequences.json` is a
conditional consequence library (135 rows, and the reconciliation measured 48 out-of-order pairs in it
because chronological order is not even the right invariant for a library), `war_1992_hrhb_summer.json` is
a third shape, and the loader takes an explicit file list (`event_loader.ts:48-60`). A
`standing_decisions.json` follows the existing grain rather than cutting across it.

Conditions I attach:

1. **Any new file must be in the loader's list and in the catalog-wide ID-uniqueness assertion**, or it is
   invisible the way `graz_accords` is invisible today (hardcoded at `war_phases.ts:1062-1066`, outside
   every coverage metric). Fragmentation is a discoverability failure, and that is the fix for it.
2. **Do NOT extend the `once` assertion to all 299.** The prior seat is right and the reason is worth
   restating: it passes today, which is the trap — it would entrench catalog-wide the exact constraint
   §17.5 needs relaxed, and foreclose this resolution before anyone rules on it.
3. **§6 CARVE-OUT — this is the only part of P8 that is my seat's business. See (c).**

### (c) Is P8 §6 business?

**No — with one exception that must not be dropped.**

Recurrence, escalation, catalog layout and the three unwired `strategic_posture_review_*` handlers are
ordinary design and canon-implementation matters. Routing them here would do to this gate what §10.5
warns against for formation provenance: *"Routing brigade homes to the §6 panel would collapse the gate
under its own volume and devalue it for the cases that genuinely need it."* The same reasoning applies
verbatim to event pacing. **P8 should not have been before this panel and should go back to the ordinary
design path.**

**The exception, and I want it minuted as a condition of my GO.** §17.5's mechanic is *"fire multiple
times with **escalating stakes**; options narrow as the player defers."* Applied to sensitive-history
content that is **Ring 3 #1 and #4 simultaneously** — a recurring, escalating atrocity decision is the
purest possible form of the thing this gate exists to refuse, and it would arrive not by anyone deciding
to build it but by a general mechanic being applied uniformly to a catalog that contains atrocity rows.
**That is precisely "a Ring 3 refused surface by accident," which is the sentence my seat is here to
enforce.**

**Condition:** any separate home for recurring content must carry an explicit exclusion — **no Ring-3
sensitive-family row and no `category: "humanitarian"` atrocity row may live in it or carry `recurrence`
or `escalation`.** This is machine-checkable today via `isRing3SensitiveFamily`
(`event_families.ts:219-228`) plus a category check, and it should be a loader validation, not a comment.
With that exclusion in place, P8 is not §6 business at all and I am content for it to leave this panel.

---

## Overall verdict

# GO

**Repair work on P1 (Ahmići gate) and P2 (Srebrenica/Žepa date correction) may proceed to a plan.**

Neither crosses the bright line. Both move toward the stated thesis: P1 by ending a deterministic
one-sided depiction of the war's hinge week; P2 by dating the genocide correctly. Neither adds an option,
a lever, a trade, or a reward.

**Conditions attached to my signature:**

1. **P1 — prefer the `op:vitez:vitez_2` retarget over the 0.33 threshold** (§P1(b′)). A threshold satisfied
   at t0 that nothing can unsatisfy is the deleted control condition, i.e. the railroad the investigation
   itself told us not to build.
2. **P1 — route the `operational_initial_master.json` / `hybrid_1992` Vitez divergence before choosing a
   gate edit.** Do not edit a §6-relevant gate to work around a data divergence nobody has explained.
   *"NEVER override initial OSIDs"* is not a reason to skip the question; it is a reason to ask it carefully.
3. **P1 — `/narrative-designer` §4 signature required if any prose changes** (gate `:216`). Trigger-only
   edits do not need it. This panel has no narrative seat and cannot discharge that row.
4. **P1 — measure before merge.** The repair adds `war_crimes_events +3` and
   `international_credibility −25` for HRHB in every run **[M]**. Direction is monotonically correct
   (never an improvement), so §6 is safe — but credibility feeds negotiation, and this is a
   calibration-moving change requiring its own controlled 188w run under one-change-per-run discipline.
   Do not land it bundled with P2.
5. **P2 — the enclave guard is a merge gate, not a plan gate.** The dates (w171 / w173) are right and the
   Historian owns them. But `srebrenica_falls_1995` / `zepa_falls_1995` are pinned by
   `tests/event_timeline_integrity.test.ts:90-117` on `turn_min`, `pressure.threshold`, the exact trigger
   condition and the `control_change` OSID lists **[M]** — this is a deliberate §6 receipt, and narrowing
   `turn_max` risks a non-fall. **A counterfactual non-fall must be earned by the modeled war through
   ordinary military means (Ring 3 #10); one produced by a windowing accident is not an achievement, it is
   an erasure.** The plan must measure fall/no-fall on 188w and bring the result back to this panel.
   The panel rules; the implementer does not.
6. **P4 reconciliation is authorized as documentation work and should be scheduled now** — annotate
   `ENDGAME_AND_NEGOTIATION_DESIGN.md:339` and `:341` as superseded by
   `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 3 #1/#10 and `MASTER_ROADMAP.md:324`. No canon amendment,
   no lever, no eight-seat panel.
7. **P4 construction is NOT authorized.** My seat votes **NO** on a Srebrenica restraint decision, and
   would vote no on the broader eight.
8. **P8 leaves this panel** with the Ring-3 exclusion in §P8(c) attached to any separate-home design.
9. **New item P9 opened** — the `enclave_defended` counterfactual recorder is dead by construction
   (`observer_threshold_flags.ts:18-21`, `war_phases.ts:1084-1086`, zero writers for
   `enclave_held_through_turn`) **[M]**, while the gate §5 names it the canonical pattern. Ring-2 authoring
   work, no lever, no bright-line exposure. It is the right answer to the impulse behind P4.

**Nothing in this verdict authorizes a change to §1 Ring 3, §2, §2a, or the enclave guard.**

---

*Game Designer seat, polled independently, 2026-09-06. Implementer ≠ reviewer: I wrote no code, data, or
canon in this session.*
