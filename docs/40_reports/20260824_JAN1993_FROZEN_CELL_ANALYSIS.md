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
