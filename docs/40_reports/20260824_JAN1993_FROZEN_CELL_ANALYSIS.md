# January 1993 calibration — 86% of the error is not combat-reachable

Measured 2026-08-24 by replaying `control_events` from the definitive
`apr1992_definitive_188w` run over `initial_political_controllers`.
The replay reproduces the run's reported figures exactly (675 / 661 / 660 / 648),
which validates the method.

## The finding

| checkpoint | matched | mismatched | of those FROZEN since turn 0 |
|---|---|---|---|
| jan1993 | 675 | 37 | **32 (86%)** |
| apr1994 | 661 | 51 | 42 (82%) |
| apr1995 | 660 | 52 | 41 (79%) |
| oct1995 | 648 | 64 | 48 (75%) |

Only **183 of 712 OSIDs ever change hands** in 188 weeks. The rest hold their
turn-0 ethnic-majority assignment for the entire war.

At January 1993 exactly **five** mismatched cells are ones combat ever touched:

    op:gorazde:podkozara_donja_2   engine RBiH  wants RS    t1 RS->RBiH paramilitary
    op:srebrenica:obadi            engine RS    wants RBiH  t1 para, t14 combat
    op:visegrad:drinsko            engine RS    wants RBiH  t7 paramilitary
    op:visegrad:medjedja_2         engine RS    wants RBiH  t6 combat
    op:visoko:gornja_vratnica_2    engine RS    wants RBiH  t174 combat

## Why the six Goražde operation runs produced nothing

`Operacija Trnovo` was built with objectives `glamoc`, `kamen`, `sopotnica`,
`tosici`. **All four are in the frozen set.** Runs n280-n285 varied brigade
strength, axis structure, staging and OOB shape; none moved the number, because
the cells were never the kind of cell a combat lever reaches.

When the operation *did* force attacks (n285: three attacks on `glamoc` at
t17/t18/t19 with a 1,700-man assault brigade, nominal ratio 2.12 against an
800-man defender) the outcomes were `costly_victory` → `stalemate` →
`catastrophic`. An OSID flips only on `decisive_victory` (ratio 2.0 *after*
terrain and entrenchment), and these are the hills ringing the town.

## What the 32 frozen cells actually are

    [RBiH->RS] x18  bosanska_krupa:veliki_badic, cajnice:batotici, cajnice:miljeno_2,
                    cajnice:todorovici, donji_vakuf:jemanlici, donji_vakuf:korenici,
                    foca:brusna_2, gorazde:kolovarice, ilijas:krivajevici,
                    kalesija:seher_2, konjic:ljuta, pale:praca, travnik:gornje_krcevine,
                    travnik:paklarevo, trnovo:kijevo_2, ugljevik:jasikovac,
                    ugljevik:srednja_trnova_2, zvornik:djulici
    [RS->RBiH]  x8  bratunac:jezestica_2, foca:donje_zesce, gorazde:glamoc,
                    gorazde:kamen, gorazde:sopotnica, maglaj:jablanica,
                    trnovo:tosici, vlasenica:sebiocina
    [HRHB->RBiH] x3 jablanica:doljani_2, novi_travnik:rat_2, prozor:prozor_2
    [HRHB->RS]   x2 bosanski_samac:domaljevac_2, orasje:ostra_luka
    [RS->HRHB]   x1 stolac:pjesivac_kula_2

**None of the 18 `RBiH->RS` cells is an objective of any of the 16 pre-planned
operations** (verified by name search against `pre_planned_operations.ts`). They
start RBiH on Bosniak majority and are never attacked, so they cannot fall. This
is the engine failing to deliver the 1992 VRS Podrinje/Posavina campaign, not a
turn-0 derivation error.

## The lever, and the line around it

The sanctioned lever is **operation objective coverage** — extend existing 1992
VRS operations to include cells their historical campaign actually took. That is
ops tuning, an accessible parameter.

**Split the 18 before touching them.** Six sit in ICTY-documented cleansing
municipalities — `foca:brusna_2`, the three Čajniče cells, `zvornik:djulici`,
and the Višegrad pair already in the contested set. Making Bosniak-majority
villages there fall is modelling the real VRS campaign and is legitimate
*through combat operations*; doing it through
`coercion_pressure_by_municipality` is the atrocity-rewarding shortcut the §6
gate exists to police. That distinction is a Pyrrhic-panel matter, not a LOW-risk
data lever, and it is not mine to decide.

The remaining ~11 are ordinary front-line cells (Donji Vakuf, Travnik, Konjic,
Ilijaš, Kalesija, Ugljevik, Bosanska Krupa, Trnovo, Pale) with no §6 exposure.
`gorazde:kolovarice` is the known merge defect and is unwinnable under any
controller — exclude it from any target count.

## Falsification

If operation-objective extension is the right lever, adding objectives for the
non-§6 subset should move `jan1993` upward and leave the three later checkpoints
within noise. If those cells still do not flip after being targeted, the wall is
combat resolution (the `decisive_victory` threshold), not coverage — the same
wall `glamoc` hit — and operation tuning is exhausted as a lever for jan1993.

---

## Addendum — target ranking (measured 2026-08-24)

Two properties decide what a frozen cell is worth. **STABLE** = the reference wants it
RS at all four checkpoints, so taking it pays +1 four times. **MOVES** = the reference
returns it later, so the gain is partly or wholly given back unless the engine already
recaptures in that municipality at the right time.

Every one of the 18 has at least one RS-held neighbour at turn 0, verified against
`buildOsidAdjacency` — adjacency-valid chains exist for all of them. The older
"not adjacent" notes in `pre_planned_operations.ts` (krivajevici, praca) rule out
*specific* chains, not the cells.

| cell | painted profile | class | net value if taken | note |
|---|---|---|---|---|
| ugljevik:jasikovac | RS RS RS RS | STABLE | **+4** | RS nbr `zabrdje_2`; free Majevica bdes |
| ugljevik:srednja_trnova_2 | RS RS RS RS | STABLE | **+4** | same chain |
| kalesija:seher_2 | RS RS RS RS | STABLE | +4 | no brigades homed at any RS nbr — needs a march |
| pale:praca | RS RS RS RS | STABLE | +4 | `rs_4th_sarajevo` at `bulozi`, already committed |
| trnovo:kijevo_2 | RS RS RS RS | STABLE | +4 | `rs_trnovo_brigade` known destroyed pre-injection |
| donji_vakuf:jemanlici | RS RS RS RBiH | MOVES | +4 if recaptured | engine retakes `pribraca_2` t187 — timing fits |
| donji_vakuf:korenici | RS RS RS RBiH | MOVES | +4 if recaptured | engine retakes `komar_2` t182 — timing fits |
| bosanska_krupa:veliki_badic | RS RS RS RBiH | MOVES | +4 if recaptured | engine retakes all 3 RS nbrs t178–185 |
| konjic:ljuta | RS RS RBiH RBiH | MOVES | +2 | engine retakes `sitnik` t121, before apr1995 |
| ilijas:krivajevici | RS RS RS RBiH | MOVES | +2 | engine NEVER recaptures in Ilijaš — keeps 3, loses 1 |
| travnik:gornje_krcevine | RS RS RBiH RBiH | MOVES | **0** | engine never recaptures in Travnik — do not pursue |
| travnik:paklarevo | RS RS RBiH RBiH | MOVES | **0** | same — do not pursue |
| gorazde:kolovarice | RS RS RS RS | STABLE | — | known merge defect, unwinnable under any controller |
| foca:brusna_2, cajnice ×3, zvornik:djulici | RS ×4 | STABLE | +4 each | **§6 — ICTY municipalities, panel matter** |

The Travnik pair is the useful negative result: it is frozen, adjacency-reachable, and
still worth nothing, because the reference hands it back and the engine has no mechanism
to hand it back. Frozen does not imply worth fixing.

## First coverage test — Operation Majevica

Added as a **separate operation** (not a third Koridor axis: Koridor's multi-axis
readiness gate is documented as order-sensitive and Brčko is load-bearing).
`vrs_east_bosnian`, staging `op:ugljevik:zabrdje_2`, chain
`zabrdje_2 → jasikovac → srednja_trnova_2`, all links adjacency-verified. Brigades
`rs_1st/2nd/3rd_majevica` (1,904 / 1,819 / 1,251 men, available from turn 0, homed
in-sector, uncommitted elsewhere) against a local ARBiH presence of one 273-man brigade.

**Enclave guard:** both objectives border `op:ugljevik:teocak_krstac_2`. Teočak must hold
(canon H1.8) and holds RBiH at all four checkpoints in the baseline. It is deliberately
not an objective; every run carrying this op must re-verify it.

---

## Čajniče coverage — TWO ATTEMPTS, BOTH NET-NEGATIVE. Reverted. (2026-08-24)

The three Čajniče cells CAN be taken, easily and repeatably. Both attempts captured
`batotici` t1, `miljeno_2` t2, `todorovici` t3, and both picked up two free riders:
`foca:brusna_2` and — notably — `gorazde:kolovarice`, the cell recorded for months as an
unwinnable merge defect. jan1993 gained **+7 in both runs**. They hold no ARBiH formation
at turn 0; nothing was ever attacking them.

The problem is never Čajniče. It is what the run does everywhere else.

| run | axis staffing | jan1993 | apr1994 | apr1995 | oct1995 | NET |
|---|---|---|---|---|---|---|
| n287 (committed) | — | 677 | 663 | 662 | 647 | — |
| n288 | `rs_ajnie_brigade` moved off visegrad_seizure | 680 (+3) | 661 (−2) | 660 (−2) | 644 (−3) | **−4** |
| n289 | phantom-only, nothing taken from any axis | 678 (+1) | 656 (−7) | 655 (−7) | 640 (−7) | **−20** |

**A wrong diagnosis, corrected by n289.** n288 was read as "moving `rs_ajnie_brigade` off
`visegrad_seizure` weakened it, so `visegrad:medjedja_2` was never taken (t6 in n287, never
in n288)". n289 restored that brigade and staffed the sweep with two phantoms instead —
**and `medjedja_2` was still never captured.** The brigade was not the cause. Adding a
*second axis* to Operation Visegrad is: it had been single-axis, and the multi-axis
readiness dynamic is the same one documented at the top of Operation Koridor
(`posavina_flank` firing before `brcko_corridor` finished its march → `zero_eligible_axis`).

**The phantom-only version was WORSE, not better,** which is the finding that matters.
It subtracted nothing from any working axis — two new ghost formations and one axis, pure
addition — and still cost −7 at every later checkpoint. The damage in n289 lands on
Operation Donji Vakuf (`torlakovac_2`, `babin_potok_2`, `komar_2`, `kutanja`, `pribraca_2`,
`oborci_2`), plus Šekovići, Kalinovik and Nevesinje — a different corps, hundreds of km
away, with the western-Bosnia cascade site itself untouched (Grahovo 4/4, Šipovo 5/5,
Mrkonjić 5/6). So this is not the R23–R29 cascade *site*; it is the same underlying
property seen through a different outlet: **any new early combat perturbs global turn
ordering, and something downstream loses a battle it used to win.**

This is precisely what `life_lessons/calibration.md` (2026-05-26) records: five consecutive
additive pre-planned op changes all regressed or went zero-delta, and *"trying to find an
additive op that doesn't cascade is a dead end."* Two more data points now say the same
thing at the current floor. **Do not attempt a third variant.**

**Why Majevica worked and this did not.** Majevica added an operation to a corps with an
EMPTY queue and no existing op to interfere with, on a corps whose work was already
finished by t17. Čajniče adds an axis to an operation that is *currently executing*. The
distinction — new op on an idle corps vs new axis on a live op — is the one that predicts
the outcome, and it is the rule to carry forward.

**What would actually unlock these cells** is the frozen-VRS-front defect (every VRS corps
stops capturing within ~28 turns, then idles 160+). Fixing that is an engine-health lane;
until it is fixed, coverage additions must fight for room inside a 28-turn window that is
already fully subscribed, and every one of them costs more elsewhere than it gains.

**Reverted.** `jna_uzice_cajnice_tg`, `jna_cajnice_to_tg` and the `cajnice_sweep` axis are
removed. HEAD stays at the n287 line: 677 / 663 / 662 / 647.
