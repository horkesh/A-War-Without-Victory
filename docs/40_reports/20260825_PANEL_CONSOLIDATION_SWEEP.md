# §6 PANEL — consolidation sweep — RECORD (INCOMPLETE: 2 of 4 seats polled)

**Status: NOT A VERDICT.** Two of four seats have reported. **Scenario-tester/calibration and
Engine/systems remain unpolled.** Nothing here authorises enabling the mechanism, and it remains
`consolidation_sweep_enabled` DEFAULT OFF, unset on the calibration scenario.

Packet (neutral, written before polling):
`scratchpad/PANEL_CONSOLIDATION_SWEEP.md`. Each seat polled independently and told explicitly
that the implementer built the mechanism and wants it enabled — a bias to correct for.

## Question

Should the paramilitary sweep target enemy-held settlements CONTIGUOUS with other enemy ground —
not only isolated pockets — in municipalities a faction controls politically and dominates
organisationally?

---

## SEAT 1 — Historian: **COMPLIANT with a constraint. Ordinary ruling, not a crossing.**

**Premise UPHELD, and it is BB's own framing.** BB1 p.180 titles a chapter *"Ethnic Cleansing as
a Military Operation: Prijedor, Sanski Most, and Ključ, May–July 1992"* — municipality-scale and
systematic, not mop-up of cut-off pockets. The Višegrad apparatus is concrete: ~1,000 local Serb
TO irregulars + 100–200 municipal police, *"assisted by some soldiers of the JNA 37th (Užice)
Corps"* (BB1 p.174), reinforced by *"volunteers from Šešelj's Serbian Chetnik Movement"*
(BB1 p.175). Foča fell April 1992 (BB1 p.187). **The engine having only pocket-clearing is a
genuine representational gap.**

**IMPLEMENTER'S PREMISE REFUTED.** The implementer argued the constraint should be
faction-and-period because *"the ARBiH spent 1992 losing villages, not taking them."* False:

- BB1 p.187 — Trnovo: ARBiH *"major offensive in late July, seizing the passage to Goražde and
  pushing VRS troops out of Trnovo."*
- BB1 p.187 — Višegrad: *"a series of Bosnian Army attacks from late August to November retook
  key territory around Višegrad,"* reaching within 3 km of the hydroelectric dam.

The ARBiH ran successful offensives **in this very region** in 1992. The Historian declined to
endorse any constraint resting on that claim.

**Distinction the Historian drew instead:** those were *combat operations*, which the engine
already models. What BB describes on the Serb side is a **party-military takeover apparatus** —
SDS structures, municipal police, TO, JNA support, paramilitary volunteers — acting where the
party already held the municipality. Recommended gating on possession of that apparatus.

**Period:** documented campaign concentrates April–July 1992 (weeks 0–13).
`PARAMILITARY_FADE_WEEK = 20` is a defensible outer bound; do not extend.

**Settlement list: CANNOT CONFIRM.** `Batotici`, `Miljeno`, `Todorovići`, `Brusna`, `Sopotnica` —
**zero pages** in the BB KB. `Glamoč` matches the western-Bosnia municipality, a name collision
the seat refused to launder into a citation. BB works at municipality/operational scale; the
painted reference is the authority at hamlet granularity.

**Own-enclave sweep: NO.** Correct-looking result for `glamoc`/`kamen`/`sopotnica` was accidental;
canon H1.8 makes enclave outcomes event-owned.

---

## SEAT 2 — Red-team (railroad-hunter): **NON-COMPLIANT AS PROPOSED. Ordinary ruling, adjacent to the line.**

**Current code is EMERGENT — there is no railroad today.**
`organizational_penetration_formula.ts:60-115` has **no faction branch**. All three factions run
one function:

    paramilitary = 5  + 20 (aligned pop >= 35%) + 35 (planned war-start brigade)        -> max 60
    party        = 20 + 35 (IS the controller, "mayor bonus") + 20 (pop) + 10 (brigade) -> max 85

Inputs are census share, controller identity, and authored OOB. **`60/85` is not a faction tier —
it is the signature of "≥35% aligned population + a war-start brigade + holds the mayoralty."**
Čajniče-RS and Hadžići-RBiH read identically because both factions genuinely satisfy all three
conditions in their own municipality.

**BOTH proposed constraints FAIL, and the seat falsified its own as well as the Historian's.**
The Historian's apparatus gate was tested against the actual cases:

| test set | party-dominance verdict |
|---|---|
| the 9 wrong flips (Hadžići, Brčko, Novo Sarajevo, Olovo, Vareš, Doboj, Konjic, Bosanski Brod, Stari Grad) | **9 allowed, 0 blocked** |
| the 8 correct flips (Čajniče, Foča, Pale, Kalinovik, Šipovo, Ključ, Skender Vakuf, Čapljina) | 8 allowed, 0 blocked |

**17 of 17 allowed — zero discriminating power.** In every case the sweeping faction *is* the
mayor: Hadžići genuinely was an RBiH municipality exactly as Čajniče was an RS one.

**The decisive finding:** the asymmetry the panel is chasing is not structural. The Serb side
executed a coordinated municipality-by-municipality campaign in 1992; the Bosniak side did not.
That is a fact about **orders and intent**, not about apparatus, population or brigades — and it
is therefore **not derivable from game state**. Any constraint reproducing it must inject a fact
the simulation does not contain. **That is a railroad by this repo's own taxonomy** (faction gate
or phase railroad).

**"Data not code" is a distinction without a difference here.** Moving the fact into authored
scenario data changes its location, not its nature. The seat directed that this framing not be
allowed to launder the railroad.

**A SECOND REWARD CHANNEL THE GRADE CAP DOES NOT TOUCH.** The `authorized_cleansing_condemnation`
cap governs the *player*. `matched_osids` governs *us*. This mechanism exists because it raises a
checkpoint score, and the session's whole effort was directed by that score. A change making
cleansing improve the project's optimisation target creates an institutional incentive no in-game
penalty addresses. The packet's claim of neutralisation is incomplete.

**Own-enclave sweep: NO**, on code grounds. `enc.faction !== faction` is an unintended asymmetry
in a guard whose stated rationale ("surrounded topology is correct siege geometry") is
faction-blind while the code is not.

**Strongest case for doing nothing:** *"A wrong map that admits it is wrong is worth more than a
right map that lies about why."* Today the January 1993 error is visible and attributable.
Enabled with a railroad constraint, the map improves for a reason the simulation does not
contain, and the error becomes invisible.

**Verdict:** does not oppose the mechanism; opposes enabling it **while calling the constraint
emergent**. If the panel wants it, it ships as an **explicitly declared railroad** with the
historical citation attached.

---

## Where the two seats agree

1. The representational gap is **real** — BB frames the 1992 campaign as a military operation, and
   the engine cannot represent it at all.
2. **Own-enclave sweep: NO**, unanimously, on independent grounds (canon H1.8 / unintended code
   asymmetry).
3. **Ordinary §6 ruling, not a bright-line crossing** — atrocity stays grade-penalised at
   threshold ONE, enclave outcomes stay event-owned, canon hierarchy untouched.
4. Both **refuted a claim the implementer had already committed to the repo.**

## Where they diverge

The Historian proposed the apparatus gate; the Red-team **tested and falsified it** (17/17). The
Historian has not been re-polled on that result. **That is the first thing to resolve when polling
resumes.**

## Outstanding

- **Scenario-tester/calibration seat** — unpolled. Owns: is a −36 recoverable by fixing the
  predicate, and does the western-Bosnia cascade survive?
- **Engine/systems seat** — unpolled. Owns: the `to_control` no-op, the own-enclave guard
  asymmetry, and whether a declared railroad is implementable without contaminating the
  faction-symmetric formula.
- **Historian re-poll** on the falsified apparatus gate.
