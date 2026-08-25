# Consolidation sweep — the 1992 village-clearing mechanism the engine was missing

Built 2026-08-25 in response to the owner: *"We SHOULD be able to simulate what really
happened. Without cheating by cheap switches."* Flag-gated `consolidation_sweep_enabled`,
**default OFF**, and currently NOT enabled on the calibration scenario. Runs n291–n293.

## The gap it addresses

The engine has exactly one way for a settlement to change hands without a corps operation —
`detectParamilitaryTargets` — and it could only ever see topologically isolated pockets:

    const pockets = [...graphAnalysis.enemy_pockets];
    if (pockets.length === 0) continue;

That models mop-up. The 1992 upper-Drina campaign was not mop-up: JNA, Užice Corps, local
Serb TO and paramilitaries cleared minority villages that remained **contiguous** with other
minority ground, municipality by municipality, in areas already under Serb political control.

The scale gap is the evidence. **19 paramilitary flips in 188 simulated weeks, 14 of them RS,
all before t15** — against a real 1992 campaign that cleared hundreds of villages across Foča,
Višegrad, Čajniče, Rudo, Zvornik and Bratunac. Čajniče's `batotici`/`miljeno_2`/`todorovici`,
Foča's `brusna_2` and Pale's `praca` therefore survive to January 1993 although every painted
snapshot has them RS from 1992 — not because anything decided they should hold, but because
no mechanism could reach them.

The data to drive it already existed and was simply never consulted outside pocket geometry:
Čajniče and Foča both carry `paramilitary_rs: 60`, `sds_penetration: 85`, `to_control: 'controlled'`.
(These values are **derived**, not authored — see CORRECTION 1 below. An earlier draft of this
report called them authored and that was wrong.)

## Result — the mechanism works

n292 (sweep ON): paramilitary flips 19 → 38, and it took the cells six operations could not:

    t5  foca:brusna_2       RBiH -> RS     wanted RS
    t7  cajnice:batotici    RBiH -> RS     wanted RS
    t7  pale:praca          RBiH -> RS     wanted RS
    t8  cajnice:todorovici  RBiH -> RS     wanted RS
    t2  gorazde:sopotnica   RS -> RBiH     wanted RBiH
    t4  gorazde:glamoc      RS -> RBiH     wanted RBiH
    t5  gorazde:kamen       RS -> RBiH     wanted RBiH

Seven of the thirteen January-1993 Goražde mismatches, by the mechanism that historically
cleared them. `glamoc` and `kamen` in particular had defeated six successive ARBiH operation
designs (runs n280–n285) — they were never a combat problem.

## Result — and why it is NOT enabled

**Net −36 across the four checkpoints** (jan1993 −7, apr1994 −11, apr1995 −12, oct1995 −6).
Of 25 new flips, 14 correct and 11 wrong — and **10 of the 11 wrong are RBiH or HRHB taking
RS ground** (Brčko corridor ×2, Lukavica, Vareš, Olovo, Hadžići, Konjic, Bosanski Brod ×2,
Stari Grad).

**The predicate was defective and the defect was mine.** The gate required
`penetration.to_control === 'controlled'`, written believing it meant "this faction holds the
municipality". It does not — it is a single municipality-level value that reads `'controlled'`
for *every* municipality in the game. The gate was a no-op, so any faction with organisation
≥ 50 could sweep anywhere it bordered.

**Tightening it is not a tuning exercise** — and BOTH explanations this report originally gave
were REFUTED by the §6 panel the same day. Corrected below; record in
`20260825_PANEL_CONSOLIDATION_SWEEP.md`.

**CORRECTION 1 — the data is NOT authored.** This report said "the authored data cannot separate
the cases". `organizational_penetration` is **derived** by a fully faction-symmetric formula
(`organizational_penetration_formula.ts:60-115`) with **no faction branch**:

    paramilitary = 5  + 20 (aligned pop >= 35%) + 35 (planned war-start brigade)        -> max 60
    party        = 20 + 35 (IS the controller, "mayor bonus") + 20 (pop) + 10 (brigade) -> max 85

Čajniče-RS and Hadžići-RBiH read `60/85` identically **because both factions genuinely satisfy
all three conditions in their own municipality**. The formula is working, not failing.

**CORRECTION 2 — "the ARBiH spent that year losing villages rather than taking them" is FALSE.**
BB1 p.187: the ARBiH ran a *"major offensive in late July"* taking Trnovo, and *"a series of
Bosnian Army attacks from late August to November retook key territory around Višegrad."* It
conducted successful offensives in this exact region in 1992. The Historian seat declined to
endorse any constraint resting on that claim.

**CORRECTION 3 — no available predicate separates the cases.** The Historian proposed gating on
possession of the municipal takeover apparatus; the Red-team tested it and it **allows 17 of 17**
— all 9 wrong flips and all 8 correct ones — because in every case the sweeping faction IS the
mayor of that municipality. Hadžići genuinely was an RBiH municipality exactly as Čajniče was an
RS one.

**What this actually means.** The asymmetry is **not structural**. The Serb side executed a
coordinated municipality-by-municipality campaign in 1992 and the Bosniak side did not — a fact
about **orders and intent**, not about apparatus, population or brigades, and therefore **not
derivable from game state**. Any constraint reproducing it must inject a fact the simulation does
not contain: **a railroad by this repo's own taxonomy**.

**CORRECTION 4 — "authored data, not a predicate" was a distinction without a difference.**
Moving the fact into scenario data changes its location, not its nature. If this ships, it ships
as an **explicitly declared railroad** carrying the BB citation — not dressed as derived
behaviour. Do NOT re-attempt a numeric threshold on `organizational_penetration`: measured twice,
on two different fields, and it does not separate the cases.

## Agency and consequence (owner requirement, satisfied by reuse)

The owner required player agency be tied in. No new decision surface was built, because the
correct one already exists and reusing it keeps single ownership of the concept. Consolidation
candidates flow into the **same ranking and the same player/bot branch** as pocket candidates:

1. Each deployment raises a `pending_paramilitary_request` carrying `estimated_civilian_risk`.
   The player answers per village — `allow`, `deny`, or `regular` (send regular forces instead) —
   or sets a standing `paramilitary_policy`, including `always_deny`.
2. The choice is written to `paramilitary_decision_history`: a durable record of what this
   president authorised.
3. On resolution `recordWarCrime` increments `war_crimes_events_emergent`, which sets
   `authorized_cleansing_condemnation` **at a threshold of ONE** and caps the grade at C,
   turning a `pyrrhic_success` into a `hollow_victory`.

So the ground is historically reachable and never free. A president who clears the Drina valley
gets the territory *and* the judgment — the thesis applied, not an exception to it.

## Guards preserved

Enclave membership remains an absolute skip against other factions' enclaves, so the ENCLAVE
GUARD (canon H1.8) is untouched — Teočak held RBiH at all four checkpoints in every run.
Defended settlements, adjacent defenders, regular-force-claimed targets, the per-turn caps
(2/faction, 1/municipality) and `PARAMILITARY_FADE_WEEK = 20` all continue to apply.

**RULED AGAINST BY BOTH POLLED SEATS (2026-08-25) — this must be fixed before any enable.**
The skip is `enc.faction !== faction`, so a faction CAN sweep inside its **own** enclave. That is
how `glamoc`, `kamen` and `sopotnica` returned to RBiH. An earlier draft of this report called
that "legitimate here, since all three are painted RBiH" — **both seats disagreed, on independent
grounds**:

- *Historian:* a besieged garrison consolidating its own perimeter is not the modelled
  phenomenon, and canon H1.8 makes enclave outcomes event-owned. The right answer for those
  three cells came out by accident.
- *Red-team:* the guard's stated rationale ("surrounded topology is correct siege geometry, not
  abandoned pocket") is faction-blind while the code is not — an unintended asymmetry, not a
  design.

Fix `glamoc`/`kamen`/`sopotnica` by another route; do not let a cleansing mechanism run inside an
enclave because the arithmetic happened to come out right.

## A second reward channel the grade cap does not touch (Red-team, 2026-08-25)

The `authorized_cleansing_condemnation` cap at threshold ONE governs the **player**.
`matched_osids` governs **us**. This mechanism was built because it raises a checkpoint score,
and a full session's effort was steered by that score. A change making cleansing improve the
project's own optimisation target creates an institutional incentive that no in-game penalty
addresses. The "Agency and consequence" section above is accurate about the player-facing loop
and **incomplete** about this one.

## If this is picked up again

The mechanism is sound and the code is in place. What it needs is a defensible
faction-and-period constraint expressed as **data**, not code — most plausibly a per-faction
consolidation window in the scenario timeline with a historical citation, in the same spirit as
`doctrine_phases` and `cohesion_floor`. Do not re-attempt a numeric threshold on
`organizational_penetration`: measured above, it does not separate the cases.
