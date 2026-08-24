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
