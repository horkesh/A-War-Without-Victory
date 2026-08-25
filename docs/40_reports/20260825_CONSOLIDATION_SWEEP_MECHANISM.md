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

The data to drive it was already authored and simply never consulted outside pocket geometry:
Čajniče and Foča both carry `paramilitary_rs: 60`, `sds_penetration: 85`, `to_control: 'controlled'`.

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

**Tightening it is not a tuning exercise.** The authored data cannot separate the cases:

    RIGHT: cajnice / foca / pale   RS   paramilitary 60, SDS 85   (RBiH PL 25 or 5)
    WRONG: hadzici / olovo / vares RBiH paramilitary 60, SDA 85   (RS 5)

Both factions occupy the identical top tier. A dominance-gap threshold rescues only Brčko and
Doboj. What actually separates them is historical rather than numerical: the 1992 consolidation
campaign was Serb, and locally Croat in Herzegovina and Posavina, while the ARBiH spent that
year losing villages rather than taking them. Encoding that as a faction test in engine code is
exactly the railroad the cohesion-floor ruling warns against — a faction asymmetry belongs in
**authored data with a stated historical rationale**, not in a predicate. That is a design
decision for the owner and the panel, not a calibration edit.

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

Note one consequence worth knowing: the skip is `enc.faction !== faction`, so a faction CAN
sweep inside its **own** enclave. That is how `glamoc`, `kamen` and `sopotnica` returned to
RBiH — legitimate here, since all three are painted RBiH, but it is behaviour to be aware of
before enabling.

## If this is picked up again

The mechanism is sound and the code is in place. What it needs is a defensible
faction-and-period constraint expressed as **data**, not code — most plausibly a per-faction
consolidation window in the scenario timeline with a historical citation, in the same spirit as
`doctrine_phases` and `cohesion_floor`. Do not re-attempt a numeric threshold on
`organizational_penetration`: measured above, it does not separate the cases.
