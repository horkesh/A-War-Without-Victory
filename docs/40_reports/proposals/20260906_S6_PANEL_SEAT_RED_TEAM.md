# RED-TEAM SEAT — §6 Panel verdict, 2026-09-06

**Seat:** Red team. **Convened:** 2026-09-06. Answered independently; no other seat consulted.
**Authority:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md:213`, `:227`.
**Scope discipline:** read-only. No code, data, or canon touched.

| Item | Verdict |
|---|---|
| **P1 — Ahmići never fires** | **NON-COMPLIANT** |
| **P2 — Srebrenica/Žepa fall two months early** | **NON-COMPLIANT** |
| **P4 — canon vs data on the Srebrenica decision** | **COMPLIANT** — the premise is false; see §P4 |
| **Overall** | **GO, CONDITIONED.** Two conditions, both binding. |

---

## THREE REFUTATIONS OF THE CONVENER'S FRAMING

The brief invited this. All three are MEASURED.

### R1 — P1's stated root cause is wrong. It is not OSID granularity.

The investigation says the gate *"encodes a map resolution that does not exist"* and the sweep says
*"achievable fractions in a 3-OSID municipality: 0.00, 0.33, 0.67, 1.00. There is no 0.5."*

True, and irrelevant. **1.00 ≥ 0.5.** Granularity only bites because HRHB holds one OSID — so the
question is why it holds one, and the answer is not resolution.

MEASURED — `data/derived/operational/operational_initial_master.json`:
```
op:vitez:vitez_2     political_controller HRHB
op:vitez:preocica_3  political_controller HRHB
op:vitez:kruscica    political_controller HRHB
```
All three are painted HRHB. Under the master's painting HRHB holds 3/3 = 1.00 and Ahmići fires
comfortably. The investigation noted this divergence in one line and marked it *"not investigated
here"*; it is in fact the whole of the stated root cause.

MEASURED — why the runtime disagrees: `apr1992_definitive_188w.json:8` sets
`init_control_mode: "hybrid_1992"`. `political_control_init.ts:867-877` routes that to
`initializePoliticalControllersFromHybrid1992(...)` off
`data/source/municipalities_1990_initial_political_controllers_apr1992.json` + census ethnic override
at ≥0.70. **`operational_initial_master.json` is read only on the fall-through path at `:895-898`** —
`hybrid_1992` never reads it. So the runtime 1-of-3 is the census-derived value.

**Consequence for the panel: there is no data-repair option here, and that is load-bearing.**
The Sacred Rule is *"NEVER override initial OSIDs: initial OSID control from census/referendum is
sacrosanct."* Repainting Vitez to match the master would be exactly that override. The master is not
the authority for this scenario; the census is. **Anyone who proposes "just fix the data divergence"
is proposing a Sacred-Rule violation, and the panel should refuse it in advance.** The gate is the
only legitimate surface.

### R2 — P1(d)'s premise is wrong. Vitez not flipping is CORRECT history.

The brief asks whether the real defect is *"that Vitez never flips at all in 188 weeks of a war
fought largely in the Lašva valley."* No.

The HVO held Vitez town continuously from the outbreak of the Croat–Bosniak war through the
Washington Agreement. The Vitez pocket was encircled and besieged; it never fell. `war-or-game`'s test
is *"would a real observer find this absurd"* — an observer would find a **flipping** Vitez absurd.
`enclave_resilience.ts:810-816` models exactly this: HRHB pockets (Žepče/Lašva/Kiseljak) are contained
by ARBiH and released only at `washington_signed`, *"so the pockets stay HVO-held — matching painted
Oct-1995."* The engine is right.

MEASURED, net flips in `control_delta.json` (n390) — vitez 0, busovača 0, novi_travnik 0, kiseljak 0,
fojnica 0, prozor 0, jablanica 0, zenica 0; travnik 2, gornji_vakuf 1, bugojno 2, kakanj 5, vareš 2,
mostar 1, stolac 2, čapljina 1. *(Net only; churn is invisible to this artifact per the sweep's own
caveat.)* The central-Bosnia ARBiH gains of mid-1993 are thin, which is a separate calibration
observation — but **the frozen cells are the historically frozen ones.**

The real defect is smaller and more precise: **the historically correct state of Vitez at this map
resolution IS 1-of-3 — HVO holds the town, Bosniaks hold Kruščica and Preočica.** The gate demands
2-of-3, i.e. it demands an *ahistorical* HVO position as the precondition for the historical massacre.
The map is right. The threshold is wrong. Fix the threshold, do not chase the map.

### R3 — P4's premise is false. Canon and data do not disagree.

The brief calls `ENDGAME_AND_NEGOTIATION_DESIGN.md:339` *"a RESOLVED decision."* MEASURED, the
document's own header at `:3`:

```
**Status:** DESIGN — awaiting review and refinement
**Date:** 2026-03-15
**Owner:** Game Designer + Orchestrator
```

*"Resolved 2026-03-15"* is a **section heading inside an unreviewed draft**, meaning "settled in this
brainstorm", not "ratified". The file sits in `docs/30_planning/`, not `docs/10_canon/`, and the canon
hierarchy places it below everything it contradicts.

What canon actually says — `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, Ring 3, *"This list is exhaustive
and binding"*:

- **#1** — *"No 'commit genocide' decision tree. Genocide is never a button, a slider, a **multi-option
  event**, or a player-authorized instruction."*
- **#10** — *"No gamified 'prevent genocide' mechanic. The player cannot earn points for preventing
  Srebrenica; they can only keep the enclave intact through ordinary military means."*
- **§3** — the paramilitary surface *"must never become… a risk/reward tooltip that frames atrocity as
  a trade."*

`:339` proposes *"RS player faces a decision event… Historical path: gain territory, lose catastrophic
humanitarian capital… Restraint path: occupy without massacre, less humanitarian cost."* That is a
multi-option event on genocide framed as a cost/benefit trade — Ring 3 #1, #10 and §3 simultaneously.
`MASTER_ROADMAP.md:324` agrees with canon: *"Sensitive outcomes are informational consequences, not
player choices or optimization rewards."*

**So the measurement — seven 1995 events with zero `response_options` — is the CORRECT state.** I
re-verified it directly against the catalog; all seven confirmed at 0. The data implements canon. A
superseded planning line disagrees with both.

This is not a canon-vs-data reconciliation. It is a **stale planning document**, and the fix is a
one-line status annotation on `:339` pointing at Ring 3 #1/#10. That is documentation hygiene, not §6
work, and it needs no panel.

---

## P1 — Ahmići: **NON-COMPLIANT**

### (a) Is the current state absurd, or simulation noise?

**Absurd, and not noise.** The determinative fact is one the investigation did not find.

MEASURED: essays unlock off `firedEventIds`. `codexEssayResolver.ts:87-89` — *"must ALL have fired
before this essay can unlock. Layered ON TOP of the existing event-fire/ghost unlock."*
`data/scenarios/essays/ahmici_massacre_1993.json` carries `event_id: "ahmici_massacre_1993"`, zero
`ghost_when`, zero `requires_events`, zero `unlock_turn_min` (grep count 0).

**Therefore the Ahmići essay — carrying `Blaškić`, `Kordić`, `Kupreškić` — has never unlocked in any
playthrough ever run.** `trusina_killings_1993.json` and `sovici_doljani_attack_1993.json` have the
same shape and their events fire, so both unlock.

That converts the finding from "a notification is missing" into a direct canon breach.
`SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 2 names *"Ahmići massacre"* in its list of events the game
*"depicts fully — in events, essays, Chronicle, Wrapped."* It does not. Ring 2 is where canon says the
record lives, and for Ahmići the record is unreachable.

The player-visible result, deterministically, every run: mid-April 1993 delivers the
Bosniak-perpetrated killings at Trusina and the HVO's territorial attack at Sovići/Doljani, each with
its ICTY essay, and is silent on the most judicially documented crime of that war. Not asserted false —
**structurally unreachable, and asymmetrically so by perpetrator.** No artifact records a non-firing
event, so nothing has ever surfaced it. A real observer's reaction to a Lašva-valley April 1993 that
includes Trusina and excludes Ahmići is not "the model diverged"; it is a question about the authors.

I attacked this and could not sustain the counter-argument. The strongest one — *"Ring 2 is discharged
by the essay regardless of the event"* — is dead on the measurement above.

Secondary, and weaker: the event carries `war_crimes_delta: 3` and `international_credibility −25`
against HRHB, neither ever applied. I decline to argue this as "atrocity rewarded." MEASURED,
`apply_effects.ts:353-364` writes only `war_crimes_events`; the grade-decisive §2a channel is
`war_crimes_events_emergent`, whose *"sole writer"* is `recordWarCrime` (`paramilitary_sweep.ts:841-851`),
and `negotiation_types.ts:34-42` records that scripted `humanitarian_impact` deliberately never touches
it. **Firing Ahmići cannot move HRHB's outcome class.** The bright line is not engaged. This is
atrocity **unrecorded**, not atrocity rewarded — a §6 representation failure, correctly routed to the
standard four, and I concur with the Historian that the eight-seat panel is not required.

### (b) Attacking both repairs

**Threshold 0.5 → 0.33 — measured-safe, but the worse repair. I recommend against it.**

Blast radius, MEASURED (nobody had run this): `vitez` appears as a `faction_controls_municipality`
municipality **exactly once** in the entire catalog — `war_1993.json:1574`, Ahmići. The only other
`vitez` references are `add_objectives` lists in `consequences.json:401,1437` (operation objectives,
threshold-independent) and `max_brigades_per_mun_data.ts:46` (`vitez: 2`, unrelated). **Collateral is
zero.** So the objection "what does this do to everything else that reads that municipality" is
answered: nothing. I clear it on that count and reject it on three others.

1. **It is arithmetically a hair's breadth.** `1/3 = 0.3333… ≥ 0.33` → **true**; `≥ 0.34` → **false**
   (verified). The repair survives on the fourth decimal place. A later tidy-up to `0.34`, or an
   author "rounding to a third", silently re-kills the event — and re-kills it invisibly, because a
   non-firing event leaves no trace. That is the exact failure mode we are here to close, rebuilt with
   a shorter fuse.
2. **It makes the gate unfalsifiable.** In a 3-OSID municipality where HRHB holds 1 at t0 and t188 and
   Vitez has zero flips, `≥ 0.33` is constant-true for all 188 weeks. The condition then contributes
   nothing, and the event reduces to `turn ≥ 54` — a **pure calendar trigger**. `MASTER_ROADMAP.md:282`
   (R6) states the standard: *"Calendar/weak-predicate events cannot manufacture control."* Ahmići is
   Ring 2, so §2 criterion 11's calendar prohibition does not bind it *de jure*; the design principle
   still applies, and a panel that installs a weak predicate here sets the precedent for the next one.
3. **It hides the silent premium instead of exposing it.** The sweep's §E is right that `0.5` against
   3 OSIDs silently means `0.667`. Writing `0.33` to mean `1` does not fix that — it adds a second
   number that does not mean what it reads.

**Retarget to `territory_control op:vitez:vitez_2 HRHB` — the better repair. I endorse it.**

It is the historically load-bearing predicate: MEASURED, `latest_run_final_save.json:112379,112812-816,
115688` place an HRHB `base_osid` / `hq_osid` / `hq_sid` at `op:vitez:vitez_2` — the HVO Viteška
brigade sits in Vitez town, and Vitez town is where the 16 April 1993 attack was mounted from. The
predicate states the true enabling condition ("the HVO holds Vitez town"), reads at the resolution the
map actually has, and — unlike `0.33` — **would go false if the ARBiH ever took Vitez town.** It is
constant-true in the historical run because the history is constant, not because the predicate is
vacuous. That distinction is the whole argument.

Cost: it is one OSID rather than an aggregate, so it is brittle to an OSID rename or a merge. Cheap
insurance is a static test asserting `op:vitez:vitez_2` exists — which the `osid_744_drawn_712_simulated`
merge-defect history says is worth having anyway.

### (c) Where is the railroad line?

The line is **falsifiability**, not mechanism. A gate is a railroad when no reachable game state can
make it false.

- Deleting the control condition → railroad. The investigation says so and is right.
- `≥ 0.33` on a 3-OSID municipality → **functionally a railroad**, because `controlled ≥ 1` is
  unfalsifiable here in practice. It is a railroad wearing a threshold.
- `territory_control op:vitez:vitez_2 HRHB` → **not** a railroad. An ARBiH capture of Vitez town
  suppresses it. That the engine does not currently produce that capture is a fact about this war's
  history, not about the predicate.
- A `ghost_when` counterfactual register on the essay, per §3 / `enclave_defended.md` precedent → also
  not a railroad, and worth considering as a companion so the ICTY record is reachable on ahistorical
  paths too. Not required for this verdict.

Two things would cross into railroad territory and should be pre-refused: writing control to satisfy
the gate (Sacred Rule violation — see R1), and any floor-style "if the week is 54, fire it" mechanism.
The investigation's own §8 rule is correct: *"authoring coverage validated at load, never a runtime
'if quiet, fire something'."*

### (d) Is "the event fires" the right goal?

**No — and the brief's alternative is also wrong (R2).** The right goal is neither "the event fires"
nor "Vitez flips."

The right goal is: **the Ring 2 record for Ahmići is reachable to a player, on the historical path,
without any of it being manufactured.** Firing the event is the means; the essay unlock is the end. A
repair that fires the event but leaves the essay locked would have solved nothing, and a panel that
signs off on "the event fires now" without checking the essay would be signing off on the wrong
proposition. **I record this as a required acceptance criterion, not a suggestion:** the repair is
accepted only when the Ahmići essay is measured unlocked in a 188w run.

---

## P2 — Srebrenica/Žepa: **NON-COMPLIANT**

### (a) Absurd? Yes — and the reason is causal, not calendrical.

Nine weeks of drift alone would be a fidelity nit. What makes it absurd is what it inverts.

MEASURED firing order, n390 `weekly_report.jsonl`:
```
w160 tuzla_gate_massacre_1995, un_hostage_crisis_1995
w162 srebrenica_falls_1995
w164 zepa_falls_1995
w168 rapid_reaction_force_1995        <- sets rrf_deployed
w170 second_markale_massacre_1995
w171 nato_deliberate_force_1995
w172 operation_summer_95, federation_ground_offensive_1995
w174 operation_storm_1995
```
Real, on the engine's own epoch (`scenario_runner.ts:1963`, 6 Apr 1992; week N = floor((d−6 Apr 1992)/7)+1):
Tuzla Gate 25 May = w164 · hostage crisis 25 May–18 Jun = w164-167 · RRF (UNSCR 998) 16 Jun = w167 ·
**Srebrenica 11 Jul = w171** · Summer '95 25-29 Jul = w172-173 · **Žepa 25 Jul = w173** · Storm 4 Aug =
w174 · Markale II 28 Aug = w178 · Deliberate Force 30 Aug = w178.

**The game has both enclaves falling before the Rapid Reaction Force exists.** The RRF was created in
response to the hostage crisis and was on Mt Igman *when Srebrenica fell*; its presence and its failure
to intervene is not incidental to the story, it is the story — the force was there and the safe area
fell anyway. In-game it arrives four weeks after the enclave is already gone, to protect nothing. A
real observer would find that inversion absurd well before noticing the date.

Second inversion: Žepa falls (w164) eight weeks before Grahovo/Glamoč (w172), where really they were
the same fortnight — so the Krajina sequence that leads into Storm is decoupled from the enclave
collapse it ran alongside. The Split Agreement (22 Jul 1995 = w172), the thing that explains Croatia
entering Bosnia, is absent from the catalog entirely.

**And the game's own instrument names this failure.** `tools/verify_checkpoints.cjs:114-119`:

> *"A FALL is a TRANSITION and is asserted TWO-SIDED — RBiH through w156 AND RS at w188. Asserting
> `== 'RS'` at all four would be historically wrong (**Srebrenica is RBiH until ~w168**)… **An early
> fall is an atrocity-rewarded breach and fails as loudly as a missing one.**"*

The guard asserts only w156 and w188, so anything in (156, 188] passes and w162 sails through. **The
guard is vacuous against precisely the breach it names**, and the same file's own comment puts the
enclave RBiH until ~w168 while the engine surrenders it at w162. The convener's *"holds in letter"* is
accurate and understates it: the guard's letter passes, its written intent does not. That is the basis
of my NON-COMPLIANT.

*(A third figure for the record: the guard says ~w168, the Historian says w171, my arithmetic says
w171. Whoever writes the fix should reconcile that comment.)*

### (b) Is the scripted single-tick write the deeper absurdity? **No — and this is the panel's trap.**

I expected to answer yes. Canon refutes it. `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 1:

> *"Enclaves generally fall when control flips through combat; **the 1995 Srebrenica and Žepa fall
> receipts are the explicit exception, authored by sensitive-history event `control_change` effects.**"*

MEASURED, `srebrenica_falls_1995.effects[3]` is a `control_change` over **12** OSIDs (the report says
10 flip; two are already RS, including the RS→RS write in `srebrenica_fall_is_a_hardcoded_write.md`),
plus `enclave_formation_displacement` at `casualty_fraction: 0.6`. Three engine constants are aligned
to it: `CONTAIN_RELEASE_TURN_BACKSTOP = 160` (`enclave_resilience.ts:787`, comment: *"Aligned to the
`srebrenica_falls_1995` event window floor (turn_min 160)… this backstop is the guarantee that contain
can only ever delay an AHISTORICAL early fall, never prevent the historical one"*), and
`SREBRENICA_MIN_TURN = 160` (`rupture_consequences.ts:24`).

The scripted write **is** H1.8, deliberately, and its purpose is §6: the fall must not be preventable
by favourable dice, and must not be presentable as a player achievement (Ring 3 #10). **Replacing it
with an emergent combat outcome would cross the bright line** and require the eight-seat panel plus
owner surfacing. **The panel must not let a P2 date repair become a mechanism repair.** Any proposal
in that direction should be refused at this table and re-routed.

The genuine tension worth recording — not acting on — is that §2 criterion 3 forbids *"calendar-window
heuristic substitution"* for rupture triggers, while the rupture's predicate (RS controls
`op:srebrenica:srebrenica_2`) is satisfied by a write whose own gate is `turn_min` plus a
`territory_control` clause that is constant-true from t0 (0 of 599 battles ever target the enclave).
The rupture reads an emergent-looking predicate produced by a calendar. Canon knowingly accepts this
for exactly one event. It should stay one.

### (c) If the dates are fixed but the mechanism stays scripted, has anything improved?

**Yes, and I want to be precise about what.** The player still cannot affect the outcome — by design,
Ring 3 #10, and that is not a defect. What improves is **legibility of causation**: NATO's force
arrives, then fails; the enclaves fall; then the Krajina offensives and the air campaign follow.
Today the player watches an air campaign and a reaction force respond to something that already
finished. Chronology is the only channel a scripted event has for carrying causation, so correcting it
is not cosmetic — it is the entire available repair.

### ⚠ THE BINDING CONDITION — the repair as scoped makes the game WORSE

This is my most important finding on P2 and it is not in either document.

`nato_deliberate_force_1995` has `turn_min: 165`, gated `rrf_deployed` + `requires_events:
["second_markale_massacre_1995"]`; `second_markale_massacre_1995` has `turn_min: 165`, gated
`sarajevo_siege_active` + `rrf_deployed`. Both fire as soon as the RRF flag lands: **w170 and w171**.
Real dates are **w178 for both** (28 and 30 Aug 1995).

Move Srebrenica 160→171 and Žepa 160→173 *and nothing else*, and the resulting order is:

```
w168 RRF · w170 Markale II · w171 Deliberate Force · w171 Srebrenica falls · w173 Žepa falls
```

**NATO's punitive air campaign would already be running when Srebrenica falls, and Markale II would
precede the massacre.** Today the game at least preserves "the enclaves fell, then the West finally
acted." The isolated repair destroys that and substitutes an inversion an observer would find *more*
absurd than the one being fixed. **Correcting Srebrenica in isolation is a net fidelity regression.**

Neither the Historian's §5a corrected-`turn_min` table nor the panel brief contains
`second_markale_massacre_1995` or `nato_deliberate_force_1995`. That is a hole in the corrected table,
not merely in the brief.

**Minimum coherent packet** (dates mine, for the Historian to ratify — I am the red-team seat, not the
sourcing seat):

| Event | Current `turn_min` | Corrected | Real |
|---|---|---|---|
| `tuzla_gate_massacre_1995` | 160 (pinpoint) | 164 | 25 May 1995 |
| `un_hostage_crisis_1995` | 160 | 164 | 25 May – 18 Jun 1995 |
| `srebrenica_falls_1995` | 160 | **171** | 11 Jul 1995 |
| `srebrenica_column_breakout_1995` | 160 | 171 | 11-16 Jul 1995 |
| `zepa_falls_1995` | 160 | **173** | 25 Jul 1995 |
| `second_markale_massacre_1995` | 165 | **178** | 28 Aug 1995 |
| `nato_deliberate_force_1995` | 165 | **178** | 30 Aug 1995 |

`rapid_reaction_force_1995` at 168 is already near-correct (w167) — leave it.

### What the repair is measured SAFE against (clearances nobody had produced)

- **All four checkpoints.** `verify_checkpoints.cjs:43` — `jan1993: 39, apr1994: 104, apr1995: 156,
  oct1995: 188`. **No checkpoint falls between w162 and w173.** Territory score at every checkpoint is
  unchanged, and the w188 final control map is unchanged (the fall happens either way).
- **The enclave guard.** Two-sided assertion is RBiH through w156 / RS at w188. Both hold; the guard
  gets *more* correct, not less.
- **The rupture.** `SREBRENICA_MIN_TURN = 160`; 171 ≥ 160, so `srebrenica_genocide_1995` still records.
- **Containment.** `CONTAIN_RELEASE_TURN_BACKSTOP = 160` releases before `srebrenica_fell` either way,
  so `isEnclaveContainmentReleased` behaviour is byte-identical.
- **`turn_max` untouched.** The Historian's carried caution is about narrowing `turn_max`; this packet
  narrows nothing. Windows stay 185/190, leaving 14-19 weeks inside the horizon.

### Traps to pre-refuse

1. **Do NOT bump `CONTAIN_RELEASE_TURN_BACKSTOP` from 160 to 171 "for consistency."** Its comment
   invites it (*"aligned to the event window floor"*). It would give the VRS eleven extra weeks of
   suppressed targeting against **Goražde and Bihać**, which is territory-moving and floor-moving.
   Leave all three engine `160`s alone; the alignment they need is `event ≥ constant`, which holds.
2. **Do NOT touch the `control_change` mechanism** (see (b)) — that is a bright-line crossing.
3. **Residual risk requiring measurement:** 12 OSIDs sit RBiH for 9 extra weeks, and the
   `enclave_formation_displacement` at `casualty_fraction 0.6` shifts 9 weeks later. Intermediate
   `faction_area_ratio` reads and casualty-ledger timing move. `us_halts_federation_advance_1995`
   (window 182-188) is clear of both. Per `REAL_WAR_MASTER.md` §0, faction totals feed
   `applyHumanCostShift` against a frozen baseline with boundaries at 0.75/1.33/2.0, and RS sits at
   0.961 — comfortable, but this is a **one-change-per-run 188w item**, not a data tweak. `n388`
   headroom is pre-v38 and indicative only.

---

## P4 — canon vs data: **COMPLIANT**

Full argument at **R3**. In short: the data is correct, canon is correct, and they agree. A
2026-03-15 planning draft whose own header reads *"awaiting review and refinement"* disagrees with
both. There is nothing here to reconcile and nothing to build.

### (a) Which is the safer failure? Argue against my own instinct first.

**The strongest case for a restraint choice** — and I do think it is genuinely strong: a game that
narrates Srebrenica at the player without ever implicating them teaches nothing about complicity. The
project's own stated player experience is *"authorship of the tragedy."* You cannot author what you
were never asked about, and P7 says the player is unasked for 70% of the war. `:339`'s argument —
*"shows it wasn't militarily necessary"* — is historically sound: Srebrenica was militarily taken
before the killings began, and the killings were a separate decision. A restraint path would model
that separation, which is precisely the historical truth most often elided.

**And it still fails, for a reason the case cannot answer.** Presenting it as a path *the player may
take* makes the massacre a **branch with a payoff column**, and `:339` writes the payoff column out
loud: *"Historical path: gain territory, lose catastrophic humanitarian capital, trigger NATO bombing.
Restraint path: … less humanitarian cost, NATO may still come."* However the numbers are set, a player
optimising the verdict screen will compare them. That is Ring 3 #4's *"body-count optimization
surface"* and §3's *"risk/reward tooltip that frames atrocity as a trade"*, arriving at the one event
in the game where a genocide conviction attaches. And it is unfixable by tuning: making restraint
strictly dominant turns genocide into a trap option, which teaches that the massacre was *stupid*
rather than *criminal* — a worse lesson than silence.

**The safer failure is the game that does not offer the choice.** A game that under-implicates is
incomplete. A game that renders genocide as a costed option is complicit in a way no calibration pass
undoes, and — as `SENSITIVE_HISTORY_DESIGN_GATE.md` §7 argues about officer records — *"the fact that
deleting it moves no metric is a reason for care, not a licence."* The asymmetry is total: one failure
is fixable later, the other is not fixable at all once shipped.

### (b) Moral-education mechanic, or atrocity-optimization surface?

**Optimization surface, on the shipped architecture.** Not because the intent is bad — the intent at
`:339` is decent — but because this engine converts every `response_option` into scored consequences
that land on a verdict screen the player can replay toward. There is no such thing as an unscored
choice here. Anything with two options and different outcomes is an optimization surface by
construction, and the moral weight is carried entirely by prose the second playthrough skips.

Canon already routes this correctly: the moral load sits in Ring 2 (essays, Chronicle, Cost Ledger)
and in Ring 1's locked, non-negotiable `genocide_condemnation` rupture. Ring 3 #10 is exact — *"the
reward is the absence of a `genocide_condemnation` flag, not a badge."* **The restraint path already
exists**: hold the enclave militarily. It is just very hard, unrewarded, and un-narrated, which is
correct.

The genuine gap `:339` half-identifies — that the player is never made to *feel* implicated — is real,
and P7 is where it belongs. It is a pacing and narrative problem across w139-188, not a licence for a
decision event at Srebrenica.

### (c) Does resolving this cross the bright line?

**Direction-dependent, and the panel must state the direction explicitly rather than "resolving P4."**

- **Resolving toward canon** (annotate `:339` as superseded by Ring 3 #1/#10; leave the seven events
  at zero options): **no crossing.** It moves toward the stated thesis, changes no behaviour, and does
  not need this panel at all — it is documentation hygiene. This is what I sign off on.
- **Resolving toward `:339`** (build a Srebrenica restraint decision): crosses Ring 3 #1, #10, #4, §3
  and H1.8 simultaneously. It requires the **broader eight-seat panel**, a canon amendment in the same
  change per the CLAUDE.md crossing rule, and **surfacing to the owner as a proposal before the panel
  convenes**, not after. I would vote NO in that panel, but that is not this panel's business.

**A four-seat panel must not quietly authorise the second by "resolving the disagreement."** There is
no disagreement to resolve.

---

## P7 — a president with nothing to decide for 70% of the war

**Reproduced independently** from n390 `weekly_report.jsonl` joined to the six catalog files on
`response_options.length > 0`: **188 weeks, 84 zero-event, 132 zero-decision (70.2%), longest decision
drought 21 weeks starting w139, exactly 0 decisions in w139-158, last event at w183.** Every number in
the brief confirmed.

**The uncomfortable version, since that is this seat's job: it is unfinished content wearing realism
as an excuse, and the tell is the shape, not the percentage.**

The realism defence is genuinely available and I will not dismiss it. Alija Izetbegović did not face a
decision every week. `MASTER_ROADMAP.md:217` forbids *"'invent a decision' to fill a quiet historical
interval"*, and §6.1's *"a quiet week may be a truthful positive hold"* is right. If the argument were
only about 70%, I would side with the defence.

But three measured facts make the defence untenable **as an account of this particular distribution**:

1. **The curve runs backwards.** Decisions per period are 19 → 22 → 25 → **7**, and the 1994 figure is
   inflated by a +12 one-time gesture bolus at w89-97, so the true curve is 19 → 22 → ~13 → 7. 1995 —
   Srebrenica, Storm, Deliberate Force, Dayton, the year with the densest real decision load of the
   entire war — is the emptiest. No theory of historical quiet produces that shape. Only an authoring
   budget that ran out does.
2. **The quietest window is the one with the most to decide.** w139-158 is the COHA ceasefire and
   contains **two** authored events, both with zero options. `coha_active` is a hard combat gate at
   six sites, so the front is correctly frozen — and a frozen front is exactly when a president is
   doing nothing *but* deciding: rearmament, the Split channel, the Washington structures, whether to
   hold. The game models the interval as an absence of war rather than a presence of politics. Zero
   decisions across twenty weeks of ceasefire is not a truthful positive hold; it is an empty file.
   `war_1995.json` has all eleven of its decision events at `turn_min ≥ 160`.
3. **The last five weeks are silent and the final event is a defect, not a hold.** Last authored event
   w183; `ceasefire_1995` (window 181-200) never fires on the `flag_not_set` key-presence bug. The
   campaign does not end quietly — it stops.

So the honest formulation: **the 70% is defensible; this 70% is not.** The Game Designer's rule (a) no
drought exceeds 6 weeks, (b) drought length must FALL as the campaign advances — currently exactly
inverted — is the right acceptance criterion, and the sourced-candidate coverage ledger (§10.3) is the
right instrument, because it makes cadence an output.

One caution against my own argument: `§3b` establishes that a headless run **cannot see the
player-action path**, and 9 of the 12 `action_cadence` gestures do repeat there. The 70.2% is a
measurement of the bot path. It is a floor on player-facing silence, not the exact figure — the real
player sees more, though only self-initiated gestures, which is not the same as being asked. And the
five presidential and six tactical levers remain live in all 132 weeks. **The event layer is silent,
not the game.** That distinction matters and I do not want it lost: the correct verdict is *fix the
shape*, not *raise the number*.

**Direct answer: not realistic — an artifact.** The distribution's shape, not its magnitude, is the
proof, and it is out of scope for this panel. It belongs on the D2/R8 authoring lane, where §10.3
already routes it.

---

## OVERALL: **GO — CONDITIONED**

Repair work on **P1 and P2 may proceed to a plan**, subject to two binding conditions. Absent either,
my verdict converts to **BLOCK**.

**Condition 1 (P2 scope).** The P2 plan must cover the **full 1995 chronology block** — at minimum
`tuzla_gate_massacre_1995`, `un_hostage_crisis_1995`, `srebrenica_falls_1995`,
`srebrenica_column_breakout_1995`, `zepa_falls_1995`, `second_markale_massacre_1995`,
`nato_deliberate_force_1995`. A plan that moves only the two Srebrenica rows puts Deliberate Force
before the fall and is a net fidelity regression; **I BLOCK that plan specifically.** Dates to be
ratified by the Historian seat; the last two rows are absent from the §5a table and must be added.

**Condition 2 (P1 acceptance criterion).** The P1 repair is accepted only when the **Ahmići essay is
measured unlocked** in a 188w run — not merely when the event is measured fired. The essay is the Ring
2 obligation; the event is the mechanism. I recommend the **retarget to
`territory_control op:vitez:vitez_2 HRHB`** over the `0.33` threshold, for the falsifiability and
fourth-decimal-place reasons above, and I record that **repainting Vitez control to match
`operational_initial_master.json` is a Sacred-Rule violation and must be refused if proposed.**

**Additionally recorded, not blocking:**

- **P4 needs no repair work.** Resolve it as documentation hygiene in the canon direction only. Any
  proposal to build a Srebrenica decision event leaves this panel's authority entirely.
- **P2 is a one-change-per-run 188w calibration item**, not a data tweak. Checkpoints, the enclave
  guard, the rupture and containment are measured clear; the casualty-ledger timing shift is not, and
  needs the run.
- **Do not touch the three engine `160`s** (`CONTAIN_RELEASE_TURN_BACKSTOP`, `SREBRENICA_MIN_TURN`, the
  event floor alignment comment). The invariant they need is `event ≥ constant`, which the packet
  preserves.
- **Recommended follow-up, outside this panel:** `verify_checkpoints.cjs`'s enclave guard is vacuous
  against the early-fall breach it explicitly names. Adding a "not RS before w168" assertion would
  make the instrument test its own stated proposition. Also reconcile the ~w168 / w171 discrepancy in
  its comment.
- **Sweep gap standing:** `operation_lukavac_93` (class B) remains genuinely unsettled; net-delta
  artifacts cannot answer it. Not a blocker here, but it should not be recorded as cleared.

Neither P1 nor P2 crosses the bright line. Both move toward the stated thesis. The standard four
seats are the correct forum, and I concur with the Historian on that routing.
