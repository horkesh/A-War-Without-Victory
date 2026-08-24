# January 1993 calibration — five plans

Panel: Historian, Calibration, Engine, Red-team (2026-08-24). Measured on
`apr1992_definitive_188w` at week 39, `historical_fit.checkpoints[]`.
Baseline **675 / 712, 37 mismatched, 94.8%** (after the two correction-pass omissions were
closed). **33 of the 37 were never touched by week 39; 32 never touched in 188 turns; 4 were
ever contested** — `podkozara_donja_2`, `obadi`, `drinsko`, `medjedja_2`.

Red-team's standing objection is recorded and NOT overridden: the repo's posture is
CALIBRATION-LAST, the floor is a regression guard rather than a target, and 89% of the
mismatches were never contested in 188 turns. Plans 1 and 2 are the ones that
survive that objection; 3-5 are ranked but carry it.

---

## The structure the plans key on

Every Goražde/Srebrenica mismatch falls into one of three painted signatures. This is what
makes them plans rather than 18 separate cells.

**PATTERN A — painted `RBiH · RS · RS · RS`. The reference says ARBiH held it in Jan 1993 and
lost it during 1993. The engine has it RS by week 39 — a year early.** Seven cells, the
largest coherent group in the whole residue, and it spans BOTH regions:

    op:foca:donje_zesce       init RS, never contested
    op:gorazde:sopotnica      init RS, never contested
    op:bratunac:jezestica_2   init RS, never contested
    op:vlasenica:sebiocina    init RS, never contested
    op:visegrad:drinsko       t7  RBiH->RS  (paramilitary)
    op:visegrad:medjedja_2    t6  RBiH->RS  (combat)
    op:srebrenica:obadi       t1  RS->RBiH (para), t14 RBiH->RS (combat)

**PATTERN B — painted `RS × 4`, engine RBiH.** VRS ground the engine never takes. Eight cells;
six are homeland-gated (≥50% engine co-ethnic RBiH ⇒ absorbs everything below a 2.0 ratio).

    cajnice:batotici · todorovici · miljeno_2 · foca:brusna_2 · pale:praca
    kalesija:seher_2 · zvornik:djulici        (+ podkozara_donja_2, kolovarice — see Plan 1)

**PATTERN C — painted `RBiH × 4`, engine RS from turn 0, never contested.** Two cells:
`gorazde:glamoc`, `gorazde:kamen`. Historian: the reference is CORRECT (cited). The engine is
wrong from initialization.

---

## PLAN 1 — Two sourced reference corrections (Goražde)

**Targets:** `op:gorazde:podkozara_donja_2`, `op:gorazde:kolovarice` → RBiH **at jan1993 only**;
both stay RS at apr1994/apr1995/oct1995.

**Why:** Historian, cited. `podkozara_donja_2` contains **Biljin**, taken by the VRS **8 April
1994** (BB2 PDF p.479 / printed 460). `kolovarice` contains **Uhotići**; the ARBiH pocket at
Uhotić Hill was eliminated **10 April 1994** (same page). Both names verified unique across all
5,822 BiH settlements. The reference paints both RS at January 1993 — **fifteen months early**.
It amputates a real right-bank lobe of the enclave.

**Expected:** **+2 at jan1993, 0 elsewhere** (the engine already holds both RBiH at w39, and the
later checkpoints keep RS, which the engine also matches by then).

**Risk:** minimal. Zero engine change. The one caution is that `kolovarice` is also a known
micro-OSID merge defect — it is wrong under any single controller — so this corrects its
*timing* without claiming its geometry is sound.

**Falsified by:** re-reading BB2 p.479/460 and finding Biljin/Uhotići do not belong to those
cells. Constituent membership already verified against `canonical_to_operational_map.json`.

**Cost:** zero runs. **Do this one first.**

---

## PLAN 2 — Fix the turn-0 derivation (the largest lever, and the riskiest)

**Targets:** Pattern C directly (`glamoc`, `kamen`), and up to four Pattern A cells that are
init-RS-and-never-contested (`donje_zesce`, `sopotnica`, `jezestica_2`, `sebiocina`).
**Up to 6 cells across both regions.**

**Why — the mechanism, from the Engine seat:** `political_control_init.ts:41-62` sets an OSID's
controller by **unweighted plurality of member-settlement controllers** — one hamlet one vote,
no population or area weight (the ethnicity source carries shares only, so it cannot weight even
in principle). `podkozara_donja_2` is 9 settlements, 6 RS-leaning to 3, so it derives RS while
**all seven of its neighbours derive RBiH** — a topological island at turn 0. An ethnic map has
no notion of a front, so it manufactures islands where history had a continuous line.

`glamoc` is the clean case: the reference says RBiH at all four checkpoints, the Historian has
it sourced (Konjbaba, ARBiH-held until 18 April 1994), and the engine derives RS and never
revises it. Same for `kamen`.

**Options, in increasing order of blast radius:**
(a) **island guard at init** — where an OSID derives a controller that ALL its neighbours
    contradict, take the neighbours' faction. Narrow, targets exactly the defect found.
(b) **population-weight the plurality** — requires a population-carrying ethnicity source; the
    current one has shares only. Data work before engine work.
(c) ~~adopt a frozen `initial_osid_controllers` as `apr1992_definitive_40w` does~~ —
    **FALSIFIED, do not attempt.** The 23-OSID turn-0 diff was measured: frozen agrees with the
    reference on 12, derived on 11 — a coin flip. But **9 of the frozen list's 12 are cells the
    188w run TOUCHES by week 39** (bratunac_2, zapolje_2, visegrad_2, kamenica_2, prelovo_2,
    velji_lug, donja_kamenica, krizevici, obadi) — cells RS takes by op or sweep in the opening
    weeks. The frozen list already has them RS at turn 0. **That is not a better reading of April
    1992; it is the war's own output written back into the starting position**, and it "agrees
    with the reference" tautologically because the reference describes January 1993, by which
    time those cells had in fact fallen. Strip the laundering and the frozen list is genuinely
    right on **3** uncontested cells while the derivation is right on **9**. At most **3 of 37**
    mismatches are attributable to the choice of list. The derivation is NOT the villain here.

**Risk: HIGH and repo-wide.** Turn-0 control feeds everything downstream. This is the one plan
that could move all four checkpoints and the 639→648 floor lineage at once.

**Falsified by:** ALREADY RUN — see (c). The hypothesis "the derivation is the defect and
someone already knew" is **not supported**: 12-to-11 with 9 of the 12 laundered. Option (a),
the island guard, survives on its own evidence (`podkozara_donja_2`'s 7-hostile/0-friendly
turn-0 encirclement), and Pattern C (`glamoc`, `kamen`) survives as a per-cell derivation
question with a Historian citation behind it. Do NOT stack the 23-OSID table as corroboration —
that would be double-counting two unrelated pieces of evidence.

**Cost:** one 188w run per variant, and it must be 188w — a 40w pass is a false green for this
class.

---

## PLAN 3 — Eastern-front timing gate (Pattern A, the captured three)

**Targets:** `visegrad:medjedja_2` (t6 combat), `visegrad:drinsko` (t7 paramilitary),
`srebrenica:obadi` (t14 combat). **3 cells, both regions.**

**Why:** all three are painted `RBiH · RS · RS · RS` — the reference wants ARBiH holding them
through January 1993 and losing them later in 1993. The engine takes all three in the first
14 weeks. This is the "engine is a year early in eastern Bosnia" hypothesis in its purest form.

**The obvious lever does not exist, and this is the plan's main finding.** `available_from` is
**op-level, not axis-level** — the axis type has `axis_id`, `name`, `brigades[]`, `objectives[]`,
`staging_osid` and no launch gate. So Operation Visegrad cannot be delayed for `medjedja_2`
without also delaying `visegrad_2` and `kamenica_2`, which currently MATCH — trading two to fix
one. And Višegrad town genuinely fell in April 1992 (ICTY *Lukić & Lukić*, *Vasiljević*):
delaying it would be historically false on established facts.

**What remains admissible:** `drinsko` fell to a **paramilitary sweep at t7**, not to an
operation — it is not a Visegrad objective and appears nowhere in `src/`. So the paramilitary
path, not the op catalogue, is the lever for at least one of the three. See Plan 4.

**Expected:** +1 to +3 at jan1993, **−1 to −3 at the three later checkpoints** unless the
delayed capture actually lands in the w39-w104 window. Non-monotone by construction.

**Risk:** medium-high, and it needs the Rule-4 amendment (below) landed first.

---

## PLAN 4 — Audit the early paramilitary sweep

**Targets:** the mechanism behind `podkozara_donja_2` (t1), `drinsko` (t7), `obadi` (t1), and
`foca:patkovina`/`potkozarje_3` (t1). **4 of 14 turn-1 control events are paramilitary; 0 of 10
combat events contradict the reference, 1 of 4 paramilitary ones does.** The error is
path-localised.

**Why:** `paramilitary_sweep.ts` rear-pocket cleanup erases enemy OSIDs fully enclosed by
friendly territory. Combined with a derivation that manufactures islands (Plan 2), the sweep is
doing early map-shaping that no operation authorised. It runs to `PARAMILITARY_FADE_WEEK = 20`,
so its whole footprint lands before the January 1993 checkpoint.

Two guard defects found, both worth fixing independent of score:
- `paramilitary_sweep.ts:407` — the enclave check is `enc.faction !== faction`, so it protects
  only OTHER factions' enclaves. An RBiH sweep inside the RBiH-held Goražde enclave is unguarded.
- `podkozara_donja_2` is not in the Goražde `osid_list` at all, so it would not have been
  protected either way.

**Expected:** unknown; this is an audit, not a tuned lever. Likely interacts with Plan 2 — if the
derivation stops making islands, the sweep stops finding pockets to erase.

**Risk:** medium. Touches early-war map formation broadly.

---

## PLAN 5 — Čajniče / Pattern B reachability (LOWEST yield, highest cost)

**Targets:** `batotici`, `todorovici`, `miljeno_2`, `brusna_2`, `praca` — 5 cells, all
init-RBiH, all never contested in 188 turns.

**Why it is last:** six of the eight Pattern B cells are **homeland-gated** — defender RBiH at
≥50% engine co-ethnic share absorbs everything below a 2.0 victory ratio. Combat cannot reach
them at this altitude. And the non-combat alternative is closed twice over:
`coercion_pressure_by_municipality` is **disconnected dead code** (`runControlFlip` has no
production caller; its pipeline step is a stub), and even if rewired, `applyWaveFlip`'s parity
clause would make holdouts rather than flips.

**What is actually open:** the Engine seat's correction — this is **not a hard ceiling**.
41 emergent operations fired over 188 turns and **none targeted the upper Drina**; all 59 sectors
sit at `defend` stance at t188; `operation_opportunities` mentions čajniče/pale/goražde/foča
**zero times**. So the lever is **bot targeting and sector stance**, not operation authoring.

**§6 FLAG — NON-NEGOTIABLE.** If anyone revives `coercion_pressure_by_municipality` for these
cells: it is a **non-combat takeover dial**, and Čajniče/Foča/Višegrad are ICTY-documented
cleansing sites (*Kunarac*, *Krnojelac*, *Lukić*). Setting it because it moves `matched_osids`
makes atrocity instrumentally rewarded inside the calibration loop. That is a §6 matter for the
panel, **not** a LOW-risk autonomous data lever.

---

## Two rule changes these plans depend on

1. **Sacred Rule 4 must screen against all four references, not `painted_control_jan1993.json`
   alone.** Checkpoint scoring landed 2026-08-24 and the rule did not move with it. Live proof:
   `op:ilijas:krivajevici` was removed from Op Prsten as a "Rule 4 violation — painted RBiH",
   worth **+9**, the largest single-run gain in the calibration arc — and it is correct at three
   of four checkpoints. Re-adding it is the inverse operation.

2. **A lever closed by measurement belongs in `calibration.md`, not only in a source comment.**
   `Pracha River available_from: 41` and the `kijevo_2` −26 revert both live only beside the code
   they closed, and both were one edit from being re-proposed today.

## Gate before any of 2-5 runs

`engine_health_gate.cjs:223-227` reads the TOP-LEVEL `historical_fit.osid_pair_match` — the
oct1995 figure — and **never reads `checkpoints[]`. jan1993 is entirely ungated**, against a
threshold (`188w.matched_osids_min: 622`) with **26 points of slack** below a measured 648. A
change that wins +3 at jan1993 and loses −20 at oct1995 passes CI green today.

---

## An owner item this surfaced, independent of calibration

**The repo holds two irreconcilable answers to who held this ground in April 1992, and one of
them is contaminated by prior engine runs.**

`apr1992_definitive_188w` DERIVES turn-0 control from the census. `apr1992_definitive_40w`
carries a frozen 712-entry `initial_osid_controllers`. They differ on **23 OSIDs**, 12/11, with
no tiebreaker — and **9 of the frozen list's 23 divergent values demonstrably came from combat
and paramilitary outcomes rather than from a census**.

The Sacred Rule says initial OSID control from census/referendum is sacrosanct. The frozen list
satisfies that only nominally: a third of its divergences are engine output written back into a
starting position. This is falsifiable by anyone — re-derive `initial_osid_controllers` from the
census and diff it against what is committed.

Not a calibration item. Worth an owner decision alongside the disconnected
`coercion_pressure_by_municipality` lever and the `control_flip.ts:446-449` audit hole (a
`political_controllers` write with no `control_event` pushed — unreachable today, but it would
make moved territory invisible to the very method this whole diagnosis rests on).
