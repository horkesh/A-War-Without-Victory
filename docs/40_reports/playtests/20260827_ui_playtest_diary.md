# UI Playtest Diary — 2026-08-27

**Operator:** Claude (playtest lane, run in parallel with Codex on RE)
**Build:** `lane/playtest-harness` @ `b8d7cb747`, v0.9.9-beta.1
**Method:** real Electron app, real DOM clicks, `tools/playtest/run_electron.ts`
**Scenario:** `apr_1992`, all three factions

> **This diary is the home for the UI playtest lane.** Findings go here, not into
> `PROJECT_LEDGER.md` and not into the findings JSONL. The JSONL survives only as the
> harness's internal dedup index; it is not the record and should not be read as one.
>
> **Nothing below is fixed.** This lane records; it does not repair.

---

## 1. Session scope

| Field | Entry |
| --- | --- |
| Factions played | RBiH, RS, HRHB |
| Turns advanced | RBiH **8/8**, HRHB 8/10, RS 0/10 |
| In-game span | 6 Apr 1992 → 1 Jun 1992 |
| Stability | RBiH 8/8 on three consecutive runs |
| Evidence | `tools/playtest/evidence/`, per-run contact sheets in `tmp-playtest/<run>/contact_sheet.html` |

Everything past turn 9 is **unplayed**. No finding in this diary says anything about
mid- or late-war behaviour.

---

## 2. Three worst friction moments

### 1. The turn refuses to advance and will not say why

**Surface:** turn loop / Decision Room · **Bug** · affects all three factions

RBiH and HRHB both stall at turn 9 (1 Jun 1992); RS stalls at turn 1. Identical state
each time: `ADVANCE TURN ->` is present, enabled, and registers clicks — and the date
does not move. No message. No indication of what is missing.

The engine is *correct* to refuse: a required decision is outstanding. But the required
item lives only inside the Decision Room, and the turn surface shows nothing that leads
to it — no `REVIEW BLOCKERS` affordance, just a `SIGNATURE REQUIRED` badge in the status
bar that does not read as the route.

Two factions reaching the same state at different turns makes this structural, not
event-specific. RS only meets it sooner because it opens with six required decisions
instead of one.

**Evidence:** `tools/playtest/evidence/20260827_turn9_decision_room_blocker.png`

*How badly it misleads: this harness spent several hours concluding ADVANCE was broken.
A player has less information than the harness did.*

### 2. The Decision Room shows optional gestures above the item blocking the turn

**Surface:** Decision Room · **Friction**

With the room open at the stall, the ALL tab lists *Visit the front*, *Address the
nation*, *Decorate a unit* — all optional leadership gestures — above the single `REQ`
item that is actually holding the turn. Header reads `ALL 13 ITEMS · REQ 1 · REC 3 · MON
4 · RECORD 5`, so the count is right there; the ordering is what buries it.

### 3. Allied ground is reported as hostile

**Surface:** status bar · **Bug** · owner-reported, then caught by probe

`Friendly 31.5% | Hostile-held 68.5%` displayed on the same bar as `ALLIED`, while the
Situation panel reads *"Alliance posture: close coordination"*. Friendly + hostile sums
to exactly 100%, so this is a binary player-vs-everyone-else split that ignores alliance
state entirely.

**A fix must track a changing relationship, not a fixed faction list** — the same
campaign degrades to *"strained"* by 1 Jun 1992.

---

## 3. Findings by area

### Content that renders correctly and says the wrong thing

This whole category was invisible to the harness until 2026-08-27. The owner found eight
such defects by reading a single screenshot.

| Finding | Sev | Detail |
| --- | --- | --- |
| Front pairs resolve to one municipality | high | `Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)`. Owner: should read as one place, *Aginci in Kozarska Dubica*. **Hypothesis, unverified** — Bosanska Dubica was renamed Kozarska Dubica by RS, so both sides may be the same municipality under 1990 and RS names. |
| Allied ground counted hostile | high | See friction #3 above. |
| Place names lower-cased after the first word | medium | `Donji dubovik (bosanska krupa)` should be `Donji Dubovik (Bosanska Krupa)`. Affects most multi-word Bosnian place names. Looks like capitalise-first-letter over an id-derived string. |
| Typography inconsistent | medium | Measured: **5 distinct font families on the in-game surface**. Serif display + large italics on the opening, monospace/condensed sans in the shell. |
| Opening screen needs redesign | high | Owner verbatim: *"screams AI slop design with big italic letters for highlight and so on."* A redesign, not a tweak. Only became the first thing players see on 2026-08-27. |

### The sector → OG rename

| Finding | Sev | Detail |
| --- | --- | --- |
| "thinly held OG" is a category error | high | An OG *is* a collection of formations; you hold ground, not a formation group. The rename swapped the noun and left the terrain adjective. Owner's direction: describe dispersion — *"OG XXY is spread out"*. Copy fix only; **not** a sector-removal refactor. |
| Same sentence in two files, disagreeing | high | `messages.en.ts` says "thinly held front **OGs**"; the hardcoded fallback at `operational_sitrep_views.ts:174-179` still says "**sectors**". Player sees either, depending on code path. |
| "Sector Attack" still says Sector | medium | 104 display strings renamed to OG, 17 still contain "sector". Most are `{sector}` placeholders; **five are player-visible**, all the Sector Attack op type. |

### Design questions — not defects

| Finding | Sev | Detail |
| --- | --- | --- |
| RS opens with 6 required decisions, RBiH with 1 | high | Measured on turn 1 of each. Only **two of six** appear as inbox cards; the rest are room-only. Recorded as a **question** — a heavier RS opening may be intended, but the asymmetry is stated nowhere and the inbox/room split is a discoverability problem either way. |
| The president decides ~once every 7 weeks | high | 26 decisions in 188 turns (headless). For a surface premised on governing by deciding, most of the war is pressing Advance. |
| Four leadership-gesture events have no authored historical default | medium | `address_to_nation`, `visit_to_front`, `strategic_posture_review`, `decorate_a_unit`. Plausibly correct — history offers no default for "did the president visit the front in week 44" — but a "historical" playthrough is silently guessing. |

### Player-facing gaps

| Finding | Sev | Detail |
| --- | --- | --- |
| Controls with no accessible label | medium | Present on **every surface** — desk, war map, army HQ, records, chronicle, codex. Unreadable to a screen reader, ambiguous to everyone else. *(Counted separately per surface by the harness, which badly overstated its share of the ledger. It is one defect.)* |
| Operation directives rejected with reasons never shown | medium | **29 measured instances.** The engine writes `op_directive_rejection {target_osid, reason, turn}`, persists it, projects it to the client — and no surface under `src/ui/` reads it. The player spends Command Authority, gets nothing, is told nothing. |
| Peace-plan modal shows no default and no stakes | medium | Accept / Review Later / Reject, with no `HISTORICAL DEFAULT` marker and no dimension shifts — unlike event decisions, which show both. Affects Cutileiro, Vance-Owen, Owen-Stoltenberg, Contact Group. |
| Three major peace plans carry no per-option stakes | low | `vance_owen_plan_1993`, `owen_stoltenberg_plan_1993`, `contact_group_plan_1994`. The largest political decisions of the war are unlabelled choices. |
| Some surfaces expose no reachable control | medium | `codex`, `desk`, `records`, `army_hq`, `chronicle`, `war_map` each reported this at least once. **Low confidence** — likely navigation state in the driver rather than the app. Needs confirmation before anyone acts on it. |

### Noise, recorded so it is not mistaken for signal

`replace_co` and `request_op` produced ~1,850 `insufficient_command_authority` refusals
under the headless `counterfactual` policy, which fires both levers at every corps every
turn. **No human plays that way.** What it establishes is a ceiling — Command Authority
income supports only a small fraction of continuous lever use — not that any single
refusal is wrong.

---

## 3z. RS / HRHB 188-week runs — 12 events have no authored historical default

All three factions completed **188 turns** in calibration-comparable mode
(`decision_mode: historical`). RS and HRHB surfaced 14 findings RBiH never reached.

Twelve events carry no `historical_default_response_id`. **When that field is absent the
`historical` policy falls through to `options[0]` — and so does the bot**, because
`pickBotResponseV1` with `bot_response_logic: 'historical'` and no default returns the
first option. So "historical" silently means "whatever was authored first" on these.

Six are recurring leadership gestures (`address_to_nation_*`, `visit_to_front_*`,
`decorate_a_unit_*`, `strategic_posture_review_rs`), matching RBiH — history plausibly
offers no default for "did the president visit the front in week 44".

**The other six are dated, consequential, documented events, and those are different.**

### The Milošević pressure series — four events, no default

`milosevic_vopp_pressure`, `milosevic_drina_warning`,
`milosevic_isolation_warning_aug92`, `milosevic_owen_stoltenberg_distancing`.

Worked example, `milosevic_vopp_pressure` — *"Milošević Orders Karadžić: Accept
Vance-Owen"*, options `acknowledge_pressure` / `resist_patron`, no default. The run took
`acknowledge_pressure` **by fallback**, logged as *"no authored default and no staff
recommendation; took first option"*.

**This needs the Historian, not me.** My understanding is that the Bosnian Serb Assembly
rejected Vance-Owen at Bijeljina in May 1993 despite Milošević's pressure — which would
make `resist_patron` the historical outcome and the fallback the ahistorical one. I have
not verified that against ICTY or BB and am not asserting it. What is verified: the event
has no authored default, and both the player-historical path and the bot take the first
option regardless of which is right.

### `drina_cleansing_decision_1992` — §6-sensitive, and I am not ruling on it

*"The Drina Valley Question"*, faction RS, `bot_response_logic: 'historical'`, **no
`historical_default_response_id`**. The run took `systematic` at turn 12, by fallback.

**Two things to flag and nothing more — this is the panel's to rule on:**

1. A cleansing decision with no authored historical default resolves, for both the bot
   and a historical playthrough, to whichever option was written first.
2. **The option id and its label disagree.** `systematic` is labelled *"Open
   command-accountability proceedings"*; `restrained` is labelled *"Impose immediate
   civilian-protection restraints"*. Read by id, `systematic` is the permissive branch;
   read by label, it is the accountability branch. One of the two is stale, and on a §6
   surface that is not a cosmetic discrepancy — anything reasoning over ids (including
   the `options[0]` fallback above) may be selecting the opposite of what the label says.

I have not determined which is correct and have made no change. Recorded for the §6 panel
per the standing delegation.

### Stakes gaps

`gornji_vakuf_clashes_1993` and `hrhb_washington_agreement_1994` show no per-option
stakes — the Washington Agreement being the event that ended the Croat-Bosniak war.

---

## 3y. Cross-faction measurements from the three 188-week runs

Same policy (`historical`), same mode (`historical`), same scenario, 188 turns each.
Differences below are the factions, not the harness.

| | RBiH | RS | HRHB |
| --- | --- | --- | --- |
| Turns played | 188 | 188 | 188 |
| Presidential decisions | 26 | 24 | 24 |
| Operation authorizations accepted | **2** | **19** | **1** |
| Diverged from historical default | 0 | 0 | 0 |
| `game_over` at turn 188 | false | false | false |

**Note on any territory figure in this diary:** the baseline's `territory_final`
(RS 49 / Federation 51) is the POST-DAYTON negotiated settlement, and the runs measure
the turn-188 ceasefire line with an empty Dayton proposal. Those are different
quantities. See §3x for the correction; do not read any run's territory percentage as a
divergence from history.

### Operation authorizations are wildly asymmetric — RS 19, RBiH 2, HRHB 1

The `historical` policy's only lever is accepting pre-planned operation authorizations
(`HISTORICAL_OP:` / `APPROVE_OP:` proposals), so this counts how many the faction was
offered across the entire war.

**RS is offered nineteen; HRHB is offered one.** Directionally this matches history — the
VRS ran far more set-piece offensives than the HVO — but an order-of-magnitude gap is
worth someone confirming is intended rather than an artefact of how the operation catalog
was authored per faction. Recorded as a measurement, not a defect.

It also reframes the presidential-agency picture: for HRHB, a full historical playthrough
involves **one** operation authorization in 188 weeks.

### Decision cadence holds across all three factions

26 / 24 / 24 decisions in 188 turns — roughly 1.3 per ten turns each. The sparse cadence
recorded for RBiH is not faction-specific.

### Dayton never resolves — affects all three

Every run ends `game_over: false` at turn 188. `DAYTON_TRIGGER_WEEK` is 188 and
`war_start_turn` is 0, so the trigger fires during the LAST advance, after which the loop
exits without seeing `pending_dayton`. This is the harness off-by-one recorded in
`tools/playtest/TODO.md` item 4, still open — **the endgame, verdict and cost-ledger paths
remain unexercised on every run**, and no finding in this diary covers them.

---

## 3x. The endgame — first data, and a misreported casualty figure

The Dayton off-by-one is fixed (harness), so campaigns now reach their settlement.
**This is the first endgame data this lane has produced.** All three factions:
`game_over: true`, `dayton_resolved: true`, no absent milestones, Srebrenica genocide
recorded as occurring in every run.

### The casualty comparison divides military dead by TOTAL war dead

The closing statement tells the player, e.g.: *"Total military casualties were 32% of
historical levels"* (RBiH run; RS 54%, HRHB 51%).

`endgame_comparison.ts:159` computes it as:

```ts
costLedger.total_military_killed / baseline.total_killed
```

The numerator is **military** dead. The denominator, `total_killed: 97207`, is **all**
war dead. `data/reference/historical_baseline.json` carries the correct denominator in
the same file, unused for this note:

```json
"military_killed": { "RBiH": 31270, "RS": 21173, "HRHB": 7788 }   // sum 60,231
"civilian_killed": 38476
```

Against the right denominator the figures become roughly **52% / 87% / 82%** rather than
32% / 54% / 51% — understated by a factor of about 1.61 across the board.

This is not an internal diagnostic. It is a sentence the game shows the player at the end
of their war, and it tells them their war was far less lethal than it was.

### Territory — a CALIBRATION item, deprioritised (owner, 2026-08-27)

**Two corrections to this section, the second undoing the first.**

Owner's first correction was right: *"51% for FBiH was after the Dayton and it includes
for ARBiH and HVO held territories."* Composition checks out — `endgame_comparison.ts`
sums RBiH + HRHB and the baseline field is `RBiH_HRHB_Federation`.

**I then over-corrected**, striking the comparison entirely on the grounds that a
ceasefire line and a Dayton settlement are incomparable. That was wrong. The autumn 1995
offensives had already pushed RS to roughly 45-46%, and Dayton adjusted to 49% — about
three points apart, not a gulf. Comparing end-of-war territory to 51/49 is broadly fair.

So the divergence is real on either baseline:

| Run | RS share at week 188 | vs ~46% ceasefire | vs 49% Dayton |
| --- | ---: | ---: | ---: |
| Playing RBiH | 63.1% | +17 | +14 |
| Playing HRHB | 55.9% | +10 | +7 |

**Owner ruling: this is calibration work and not a priority now.** Recorded and parked.
Note the two percentages are from SEPARATE RUNS and are not additive — an earlier
phrasing of mine invited reading them as one picture, which would imply a nonsensical
81% Federation share.

### THE ENGINE FINDING: a faction behaves differently as player than as bot

**Owner: "The discrepancies however are engine work."** This is the part that matters.

Same scenario, same `historical` policy, same decision mode, every side taking authored
historical defaults. Only which faction the PLAYER controls differs:

| Player | Total military dead | Total civilian dead |
| --- | ---: | ---: |
| RBiH | **31,365** | 31,335 |
| RS | **52,318** | 34,687 |
| HRHB | **49,494** | 32,541 |

**Military dead swing by 67%** on player-faction choice alone. Civilian dead are stable
within 5%, and the ethnic distribution of civilian death barely moves (Bosniak 27.3-28.5k,
Serb 1.9-3.6k, Croat 1.8-2.6k) — so whatever this is, it is specific to military
attrition.

Per faction, as player versus as bot:

| Faction | As PLAYER | As bot (run A) | As bot (run B) |
| --- | ---: | ---: | ---: |
| RBiH | **11,892** | 22,150 | 23,940 |
| RS | 18,051 | 12,717 | 18,729 |
| HRHB | 6,825 | 6,756 | 12,117 |

RBiH is the clearest: **roughly half the military dead as player than as bot.** RS and
HRHB are mixed, so "the player always fights less" is NOT established.

### MECHANISM ESTABLISHED — the player is offered far fewer operations than the bot launches

Measured directly. Operations launched across the full 188 weeks, same faction, differing
only in whether it was player-controlled:

| Faction | Ops as PLAYER | Ops as BOT | Military dead as player | as bot |
| --- | ---: | ---: | ---: | ---: |
| RBiH | **2** | **14** | 11,892 | 22,150 |
| RS | **16** | **25** | 18,051 | 12,717 / 18,729 |

**RBiH launches SEVEN TIMES fewer operations as player than as bot**, and loses roughly
half as many soldiers. RS launches 16 against 25 — the same direction, less extreme.

**The gap is in what is OFFERED, not what is accepted.** The `historical` policy accepts
*every* `HISTORICAL_OP:` / `APPROVE_OP:` proposal it is shown — that is unconditional in
`acceptOperationAuthorizations`. It accepted 2 as RBiH and 19 as RS, which means only 2
were ever presented to a player RBiH across the entire war, while the same faction under
bot control mounted 14 operations needing no authorization at all.

So a faction's offensive tempo collapses the moment a human takes it over, not because
the human refuses operations but because the authorization pipeline never offers them.

This is the `Player/headless equivalence requires bound inputs, not matching labels`
guardrail: both paths are labelled "historical", and the inputs are not the same.

**Knock-on:** whole-war military dead move 31,365 / 52,318 / 49,494 by player faction,
because the sides the player's faction would have fought also take fewer casualties. The
civilian toll and its ethnic distribution barely move, which fits — this is an offensive
tempo effect, not a general reduction in violence.

### ROOT CAUSE — two causes, and the second is the severe one

Traced in source on owner instruction. Of the three candidates, it is **not** "never
generated"; it is **suppression plus an unpopulated substitute**.

**Cause 1 — bot-only generation channels are switched off for whoever you play.**

- `historical_operation_authorization.ts:60` —
  `if (state.meta?.player_faction !== input.faction) return 'not_required';`
  Bots bypass presidential authorization entirely. Only the player's faction pays the
  authorize-then-inject cost.
- `war_phases.ts:2334` — the `evaluate-army-hq-gathering` step does
  `if (faction === context.state.meta.player_faction) continue;`, disabling an entire
  operation-generation channel for the player's faction alone.
- Player-facing proposal channels (`proposal_generation.ts:123,186`,
  `operation_opportunities.ts:1662`) are gated on `autonomy_level === 1`, and the
  default is 0.
- `pre_planned_operations.ts:1397` — a pending authorization calls
  `deferredCorps.add(def.corps)`, and line 1385 then blocks every other operation for
  that corps in the same pass. One unresolved authorization freezes a whole corps.

**Cause 2 — the substitute catalog is authored 17 / 1 / 1.**

```
ALL_PRE_PLANNED = [...VRS_PRE_PLANNED, ...HRHB_PRE_PLANNED, ...ARBIH_PRE_PLANNED]
  faction: 'RS'    x17
  faction: 'RBiH'  x1
  faction: 'HRHB'  x1
```

The suppressed autonomous channels are meant to be replaced by pre-planned operations the
player authorizes. **For RS that works** — 17 definitions, 16 operations launched as
player against 25 as bot. **For RBiH the replacement is a single definition**, so it loses
roughly thirteen autonomous operations and gets one authored operation back. That is the
2-versus-14, and it is why RS barely suffers while RBiH is crippled.

*(Counted from the array composition after two different regexes disagreed — 17 vs 2 —
so neither was trusted.)*

### What it means

The design intent is coherent: the player's faction should not run itself, it should act
through presidential authorization. The implementation only holds for RS, because only RS
has a populated catalog. **Play RBiH or HRHB and your army effectively stops mounting
operations** — not because you declined anything, but because there is nothing to
authorize.

Engine and content work, not calibration. Two possible directions, not a recommendation:
give the suppressed channels a player-facing equivalent, or author the ARBiH and HVO
catalogs toward parity with the VRS's 17.

### Not a finding — my own field path

`verdict_grade` came back null on three runs and I nearly recorded "the endgame produces
no verdict". The verdict was present the whole time
(`outcome_type`, `outcome_label`, `faction_verdicts`, `dayton_result`, …); the grade is
**per-faction inside `faction_verdicts`**, not a top-level field. Harness path corrected.
Recorded here because it would have been the fifth false critical of the session from the
same habit — reporting a harness defect as an app defect.

---

## 3w. Human cost — civilian deaths by nationality

Owner asked for civilian deaths reported separately and by nationality, noting they
"used to be much higher". First measurement this lane has produced. **RBiH, `historical`
policy, `historical` decision mode, 188 weeks.**

| Nationality | Civilians killed | Military killed | Civilians caused | Refugees created |
| --- | ---: | ---: | ---: | ---: |
| Bosniak (RBiH) | **27,610** | 11,892 | 1,472 | 298,071 |
| Serb (RS) | **1,910** | 12,717 | **29,315** | 1,129,259 |
| Croat (HRHB) | **1,815** | 6,756 | 548 | 75,234 |
| **Total** | **31,335** | **31,365** | — | 1,502,564 |

Baseline `civilian_killed` is 38,476, so the run reaches **81%** of historical civilian
deaths. Military dead reach 31,365 against a 60,231 military baseline — **52%**.

The SHAPE is right and worth saying so: Bosniaks are 88% of civilian dead, and RS forces
caused 94% of them. Both match the documented record.

### Open questions for whoever picks this up

**1. Is this a regression?** Cannot be answered from this lane. Every earlier run stopped
at turn 188 without resolving Dayton, so no cost ledger was ever built and there is NO
prior civilian-death measurement here to compare against. If a higher figure is
remembered it comes from runs outside this lane; a specific prior run id is needed rather
than an inference.

**2. Civilian and military dead are almost equal — 31,335 vs 31,365.** Historically
civilians were ~38.5k against ~60k military, a ratio near 0.64, not 1.00. Either
civilians are over-represented, military dead are under-represented, or both. Note the
military figure is separately depressed (52% of baseline), which points at the military
side. Needs the Historian and the casualty model, not a harness change.

**3. The cost ledger computes the by-nationality breakdown and discards it.**
`buildCostLedger` reads `civCasualties[faction].killed`, adds it to `total_civilian_killed`,
and never stores it on the `CostLedgerEntry` — the entry carries
`civilian_casualties_caused` (perpetrator) but not `civilian_killed` (victim). The
breakdown exists in memory for one loop iteration and is thrown away. Anything downstream
that wants civilian deaths by nationality — the Cost Ledger surface, the verdict, any §6
assessment — cannot get it from the ledger that is supposed to own it. The harness reads
`displacement.civilian_casualties` directly as a workaround.

**4. Only RBiH measured.** Territory varied with player faction (36.9% vs 44.1%
Federation), so human cost may vary too. RS and HRHB not yet run for this breakdown.

---

## 3a. Cutileiro Plan — pre-war, and it ends the war at turn 2

**Owner ruling 2026-08-27: "Cutileiro is ahistorical anyway so it should be cut out
completely." NOT IMPLEMENTED — recorded only. No engine change was made.**

### Measured

| decision_mode | player response | result |
| --- | --- | --- |
| historical | accept Cutileiro | **game over at turn 2** |
| historical | reject Cutileiro | war continues normally |

Reproduced directly against `startCampaign` + `advance`, RBiH, `apr_1992`.

### Why it happens, from the code itself

`peace_plan_data.ts` gives Cutileiro `trigger_week: 0` and comments it as *"pre-war, but
included for completeness in Apr 1992 scenarios"*. It is the ONLY plan at week 0; the
others are 40 / 70 / 118 / 185. The plan was signed 18 March 1992 and Izetbegović
withdrew on 28 March — both before this scenario's 6 April start.

**Three subsystems carry special cases for it**, which is the strongest evidence that it
does not fit:

1. `peace_plans.ts` — an `openingPlanCatchUp` scheduling exception, because week 0 does
   not exist in a model whose turn advances before war phases run, plus a `turn_offered`
   back-dating branch.
2. `peace_plans.ts` — a `replayDocumentedCutileiroOutcome` guard whose own comment says
   it exists to stop week-one signals *"manufactur[ing] an ahistorical unanimous
   settlement before play begins."*
3. `political_peace_plan.ts` — a hard exclusion from political personality scoring:
   *"pre-war plan with non-genuine acceptance dynamics."*

**The guard only holds when the player's response matches the documented one.** RBiH's
documented response is `rejected`; accepting bypasses the guard, every faction is
re-derived, and the unanimous settlement the comment warns about is exactly what occurs.
There is even an existing test named *"keeps an HRHB historical campaign running when
HRHB accepts Cutileiro"* — the failure mode was known.

### Scope if it is actioned

Removing the plan would also delete the scheduling exception, the back-dating branch,
the replay guard and the personality-scoring exclusion — a net simplification, since all
four exist only to contain this one plan. It touches ~10 assertions in
`tests/peace_plans.test.ts`, where Cutileiro is also used as the generic fixture for
tests that are not about it.

**Constraints on landing it:** behaviour-changing, so it needs a 188-week validation;
calibration is currently PAUSED and Codex owns the RE lane. Separately, the Codex essay
`data/scenarios/essays/cutileiro_plan_lisbon_1992.json` is history and arguably should
survive the mechanic — Cutileiro happened, it just did not happen during the war this
campaign simulates. That is a call for whoever actions this.

### Harness consequence, already applied

The `historical` policy now REJECTS peace plans. Accepting ended the baseline campaign at
turn 2, which measures nothing. Rejecting reproduces the historical *trajectory* (the war
continued) though not the historical *signature* (it was signed, then withdrawn).

---

## 3b. Player runs were never calibration-comparable

`desktop_sim.startNewCampaign` defaults to `decisionMode: 'emergent'`. The 188w
calibration scenario sets no `decision_mode` and takes the engine default, `historical`.

In emergent mode **every faction-attributed event routes through the political scorer**,
so the two non-player factions behave differently from a calibration run regardless of
what the player does. Any divergence measured this way would have been dominated by that.

Also worth recording: the bot's "historical" is not simply the historical default. It is
a ladder — authored AI default, then the political scorer for `POLITICAL_LOGICS` events,
then `pickBotResponseV1` (`historical` / `accept_first` / `reject_all` /
personality-weighted). "Historical" means different things on the player and bot paths.

**Harness change applied:** `decisionMode` is plumbed through `startCampaign`, exposed as
`--decision-mode`, and the headless driver now DEFAULTS to `historical` so runs are
calibration-comparable by default. Each run prints which mode it is in and whether that
mode is comparable.

---

## 3v. PYRRHIC PANEL — four seats on the player-vs-bot operations gap

Convened 2026-08-27 on two questions: what autonomy level a president is meant to play at,
and whether operation content is distributed consistently across factions. Four seats polled
independently, each briefed with measured data and file:line claims and told explicitly to
test the claim rather than ratify the briefing. I am the named integrator; the reconciliation
below is mine and is marked where it goes beyond what any single seat said.

**Verdicts: Game Designer PARTLY AGREE · Operations REFUTES THE MECHANISM · Historian
DEFENSIBLE ON TOTALS, NOT ON COMPOSITION · War-or-Game NON-COMPLIANT (refuses sign-off).**

**This is a split verdict, not a unanimous GO. Per CLAUDE.md it escalates to the owner.**
Nothing here is authorized. This section is the evidence package for that escalation.

### What survives — the narrowed finding

The original claim ("the player is offered ~7× fewer operations because of the autonomy
proposal gates") does not survive. Two seats independently showed the measurement was a
harness artifact: my `historical` policy fires only `acceptOperationAuthorizations` and never
`request_op`, and `LeverPlan` has no authored-op lever at all — so the run measured a
president who authorized the slate and then issued no orders for 188 weeks.

**But a narrower version does survive, and the A/B that landed after the panel is what
saves it.** The harness's silence is a *constant across factions*: the same policy, the same
levers, the same unfired channels. Under that identical instrument —

| player faction | autonomy 0 | autonomy 1 | same faction as bot |
| --- | --- | --- | --- |
| RBiH | **2** ops | 11 ops | **14** ops |
| RS | **16** ops | 15 ops | 25 ops |

RS loses 36% of its operations to being played. RBiH loses 86%. Both were measured by the
same deaf probe, so the probe cannot explain the gap between them. **The 8× asymmetry between
RS-as-player and RBiH-as-player is real and is not a harness artifact.** Note also that RS is
nearly autonomy-invariant (16 vs 15) while RBiH is not (2 vs 11) — consistent with RS's
operations arriving through the authorization channel, which is not autonomy-gated, and
RBiH's through the bot pipeline, which is.

### The mechanism I named was the wrong one

**`war_phases.ts:928-939` — `selectBotBrigadeOrderFactions` — is the dominant gate, and it
was absent from my analysis.** It filters the player's faction out of BOTH
`generate-bot-corps-orders` and `generate-bot-brigade-orders` unless `autonomy_level >= 1`.
No corps orders → no `commander_state` → no plans → zero emergent sector offensives. That
single line is the bulk of 2 → 11, not the proposal channels.

I had checked `sector_offensive.ts` and `bot_corps_directives.ts` for a `player_faction`
check, found none, and concluded emergent operations run for the player. **The gate is at the
dispatch site, not the implementation.** Absence at the callee proves nothing about the caller;
I recorded an absence without tracing the call chain upward. This is the narrow-lookup failure
mode in a new shape and belongs in life-lessons.

### FALSIFIED BY MEASUREMENT — the Operations seat's severe defect is not real

**The seat's claim:** `Krivaja-95` and `Farz 95` carry `army_hq_op_id`; their only delivery
path is `evaluateArmyHQGathering`, whose sole call site (`war_phases.ts:2335`) sits behind a
`player_faction` skip; therefore an RS player can never launch the Srebrenica operation, and
an RBiH player can never launch Farz 95.

**I was about to escalate that to the §6 panel. It is wrong, and my own run disproves it:**

    RBiH-as-PLAYER, autonomy 0, 188w:
      t9-16    Operation Circle  [arbih_1st_corps]  partial
      t161-171 Operation Farz 95 [arbih_3rd_corps]  SUCCESS

**Farz 95 launched, for a player, and succeeded.** Source confirms why. There are two
unrelated subsystems, and the seat conflated them by name:

- `injectArmyHqOperations` (`triggered_operations.ts:1249`), pipeline step
  `inject-army-hq-operations` (`war_phases.ts:2063`) — **this is the launcher.** Gated on
  `ENABLE_TG_ARMY_HQ_OPS`, the trigger predicate, `armyHqFrequencyGateOpen`, and primary-corps
  availability. **No `player_faction` check, at either the function or the dispatch site.**
- `evaluateArmyHQGathering` (`army_hq_gathering.ts:993`), pipeline step
  `evaluate-army-hq-gathering` (`war_phases.ts:2329`) — a **separate brigade-concentration
  planner**, documented in its own header as *"Called once per turn per bot faction."* Bot-only
  by design, and not the delivery path for either operation.

The seat traced `army_hq_op_id` to the file whose name matched and stopped there. **This is the
same error I made and the same error the panel caught me in — an absence claimed from one file
without walking the call graph — committed by the seat that caught me.** Recorded because a
review process that produces confident file:line citations is exactly the one where an unchecked
citation travels furthest: this one was one step from a §6 escalation on the strength of its
precision.

**The §6 escalation is withdrawn. Nothing here goes to the enclave-guard panel.**

### What is actually true about Krivaja-95 — the design is deliberate and §6-compliant

Traced to the source. **Krivaja-95 is not the authored mechanism by which Srebrenica falls, and
was explicitly built so that it could never become one.** `triggered_operations.ts:334-338`:

> Current contract: Srebrenica/Zepa fall receipts are **event-owned** by `srebrenica_falls_1995`
> / `zepa_falls_1995`. Krivaja/Stupcanica are **chronology/AAR context only and must not become
> alternate fall-delivery mechanics if the event path misses.**

The trigger implements exactly that (`triggered_operations.ts:463`):

```ts
trigger: (state, turn) => turn >= 170 && srebrenicaFallReceiptFired(state),
```

`srebrenicaFallReceiptFired` (`:144`) reads the `srebrenica_falls_1995` event receipt. **The
operation requires the fall to have ALREADY happened** — it is the after-action representation
of Krivaja-95, not its cause. The `t>=170` floor is itself a §6 canonical floor
(`LANE-NIGHTSHIFT-KRIVAJA-95-T168-FLOOR-FIX`, 2026-05-06, bumped 168→170 per
`Engine_Invariants_v0_9_0.md §6` + `SENSITIVE_HISTORY_DESIGN_GATE.md`, sign-off precedent
`b03333af` / `bc44ddec`). The fall itself is anchored as an event, not an operation outcome:
`historical_anchors.ts:296` (`expected_week_max: 170`, XOR with `csq_srebrenica_stalemate_1995`)
and `:330` (*"Srebrenica fell to RS (forced by srebrenica_falls_1995 event)"*).

**This is canon H1.8 working as designed.** Enclave outcomes are event-owned. The Operations
seat's finding inverted it: it read a deliberate §6 safeguard as a defect, and I nearly escalated
that safeguard to the §6 panel as a breach of itself. Its non-firing in my runs is therefore
**not a defect at any severity** — it is chronology context that requires a receipt plus a free
`vrs_drina`, and nothing depends on it.

### And `army_hq_only` is a routing flag, not a disable

`triggered_operations.ts:525`, with the authoring comment intact:

```ts
army_hq_only: true, // net-new: never fires via legacy triggered path (inert flag-off)
```

It means *this def routes exclusively through `injectArmyHqOperations`, never through the legacy
`checkTriggeredOperations` path.* The skip the Operations seat found at `:1019-1020` **is that
routing**, not a suppression — which is why Farz 95 launched normally for a player. Krivaja-95
carries no `army_hq_only`, so it remains eligible on both paths; its blocker is the receipt, not
a flag.

**All four questions I sent to a verification seat are now answered from source:** the
two-subsystem reading is correct, there is no `player_faction` gate on the army-HQ launch path,
Krivaja-95's non-firing is the event-owned contract working, and `army_hq_only` routes rather
than disables. Nothing here goes to the §6 panel.

### THE ACTUAL SEVERE FINDING — an RS player's army goes silent for 146 weeks

This is what naming the operations bought, and no seat had it because no seat had the names.

    RS as PLAYER : 16 operations, the last one STARTS at t42
    RS as BOT    : 25 operations, the last one STARTS at t164

**An RS player mounts his final operation in early 1993 and then conducts none at all for the
remaining 146 weeks of the war** — through Srebrenica, through Deliberate Force, through Storm,
to Dayton. The bot in the same seat is still launching operations at t164.

The two factions therefore fail in *different shapes*, which the aggregate counts hid:

- **RBiH-as-player is sparse but not truncated** — 2 operations, yet one of them is at t161.
- **RS-as-player is dense then truncated** — 16 operations, all of them by t42, then nothing.

A single "player launches fewer operations" finding covers both and explains neither. This
supersedes the shape of the finding this panel was convened on, and it lands next to the known
frozen-VRS-front result (`memory/frozen_vrs_front_probe_root_cause`: RS gets zero
capture-capable attacks from w101) — plausibly the same root, now visible 59 weeks earlier and
in the player seat specifically. **Not yet root-caused. Recorded, not fixed.**

### The scoring model rewards abdication — found by the seat looking at none of this

`src/sim/negotiation/scoring.ts:462` — `humanCostGradeShift` is a step function against a
frozen 140,000 baseline for RBiH. At ratio ≤ 0.75 the player gains **+1 letter grade**.

RBiH's military dead roughly halve under player control (11,892 vs 22,150 as bot). A player
who authorizes nothing and lets his army sit for 188 weeks crosses that threshold and is
**graded a full step higher** than the same war fought by the bot.

AWWV's stated thesis is that the player authors the tragedy and that the war is negative-sum.
The current build's dominant RBiH strategy is to decline to fight the war of national survival
and collect a better score for it. **Atrocity is gated; abdication is rewarded.** Default-ON,
live today.

The War-or-Game seat refuses to sign off on any operations fix until this is closed, on the
grounds that fixing operations alone reduces an exploit rather than removing it, and that the
build currently teaches its player the inverse of its thesis. **I concur and record the
blocking condition as binding on this lane's recommendations.**

### Serb civilian deaths — WITHDRAWN as framed, see §3s

**This subsection is superseded.** The claim below was tested by a Historian seat and does not survive: it is not player-ethnicity-specific, the ~4,000 figure is the engine own tuning target, and the comparison is invalid because the civilian model has no siege or execution pathway. Full reframing in **§3s**. Retained only so the escalation is traceable to its withdrawal.


1,910 in the RBiH-player run against an RDC-shaped expectation near ~4,000 (seat confidence:
medium-high on the ~10% share). The seat's argument for escalating this outside the
engineering queue: the civilian model is decoupled from the military one, so the finding
survives whether or not the operations bug is fixed — and a build that halves Serb civilian
dead specifically when the player is Bosniak is not a calibration ticket.

### Content composition — Historian

Totals are **defensible**; composition is not. Verified against BB2 directly:

- **Three of the twelve "ARBiH" operations are Serb operations** — `Una 94` (VRS 2nd Krajina,
  11–15 July 1994, BB2 p.534/540), `Breza 94` (VRS 1st+2nd Krajina with SVK, 30 Aug–~15 Sept
  1994, BB2 p.535/542), and `Pauk`/Spider (VRS+SVK+APWB, BB1 p.417) — all authored
  `faction: 'RBiH'` in `operation_opportunity_catalog_5th_corps.ts` as defensive-commitment
  authorizations. Defensible as modelling; it makes the true ratio **23 : 9 : 6**, not 23:12:7.
- **`Mistral 2` is authored twice** — `triggered_operations.ts` at t≥175 and
  `operation_opportunity_catalog_federation_western_bosnia.ts` at t175–190. HVO's 7 is really 6.
- **1993 is empty for both non-Serb factions** — ~15:1:1 in 1992, **~4:0:0 in 1993**, 2:5:2 in
  1994, 2:6:4 in 1995. The catalog is *not* flat and already reverses tempo in roughly the right
  direction; the hole is that the single year of the Croat-Bosniak war contains no named ARBiH
  or HVO operation at all. `Neretva 93` (BB1 index p.202) at minimum.
- **`Uragan 95` missing** — ARBiH 2nd+3rd Corps, Ozren salient, 10–14 Sept / 5–7 Oct 1995
  (BB1 p.421–425, 460). The largest ARBiH operation conducted without Croat help: *"No HV or
  HVO forces assisted the Bosnian Army in the Ozren area"* (BB1 p.425). AWWV's `Farz 95` covers
  only the Vozuća wing.
- **`Mistral 1` does not exist.** The t160–170 Grahovo/Glamoč operation is **`Ljeto 95`**, late
  July 1995, Gotovina (BB1 p.402–407). `Maestral` was one operation with two phases, not a pair.
- **Cuts the other way:** BB names VRS operations AWWV also lacks — `Lukavac 93`, `Kladanj 93`,
  `Brgule 94`, `Štit 94`, `Zima 94`, `Zvezda 95`. Filling history on all sides *widens* the VRS
  lead rather than narrowing it. **The ratio is not the defect. The composition is.**
- Verified-correct attributions, checked and not gaps: `Grmeč 94` is ARBiH 5th Corps (BB2 p.546,
  p.555), `Tigar-Sloboda 94` is Dudaković's ruse against Abdić (BB2 p.534), `Cincar` is HVO
  (BB2 p.527), `Una 95` was **HV** not HVO (BB1 p.420) so its absence is correct.
- Seat's own limit, flagged by the seat: BB1 pp.189–363 are not extracted in this repo, which
  covers most of 1993–early 1995.

### The canon question — Game Designer

`FORAWWV.md:353` defines the president as commanding through five levers including *"authorize
op — approve an operation a commander **proposes**"*, with **no autonomy qualifier**. The
Systems Manual defines autonomy as an *execution* boundary — who moves the brigades — not an
*information* one. Gating proposal supply on `autonomy_level === 1` therefore contradicts canon.

And the opportunity path is a **silent dead channel**: `generateOpportunityProposalReviews`
returns `[]` at level 0, `applyBotOpportunityDecisions` (`operation_opportunities.ts:1630`)
skips proposals whose approver is the player, and the row is then flipped to `expired`. Ten
authored RBiH and five HVO operations become eligible, are shown to nobody, are decided by
nobody, and expire with no receipt. The gate is `!== 1`, so they die at Levels 2–3 too.
`messages.en.ts:1730` meanwhile promises Level-0 players *"Full Control — all orders yours."*

The seat also blocked the obvious fix: **authoring twenty more ARBiH pre-planned operations to
level the count is mechanics-change-to-move-match-%** and would make the 1992 board
ahistorical. The player-facing content already exists as the 10+5 opportunity entries. It is
not missing; it is misfiled behind a gate canon does not authorize.

### Reconciled disposition — sequence, not conflict

The four seats' recommendations read as a conflict and are not one. In dependency order:

1. **Close the scoring inversion first.** War-or-Game's blocking condition. Everything below
   is an exploit-reduction rather than a fix until this is done.
2. **Root-cause the RS-player 146-week operational silence** (last op starts t42 vs t164 as
   bot). This replaces the withdrawn `Krivaja-95` §6 item; check it against the known
   frozen-VRS-front result before treating it as new.
3. **Decouple proposal supply from the autonomy ladder** — gate on "a human player faction
   exists", leaving `selectBotBrigadeOrderFactions`'s `>= 1` execution gate intact. Player-only,
   so the 188w baseline stays byte-identical.
4. **Fix composition, not totals** — refile the three Serb operations, de-duplicate `Mistral 2`,
   rename `Mistral 1` → `Ljeto 95`, add `Neretva 93` and `Uragan 95`.
5. **Serb civilian undercount** — escalate independently; decoupled from all of the above.

**Separate lane, do not bundle:** `deferUnauthorizedHistoricalOperationsForPlayer`
(`historical_operation_authorization.ts:159-161`) does `delete command.queued_operations`,
wiping the 1KK 4-op, Drina 3-op, SRK 2-op and EBC 1-op follow-on chains for an RS player. Real,
expensive, and autonomy-invariant — which is precisely why it cannot explain the level-0 delta
this panel was convened on.

### Corrections to my own prior entries in this diary

- **Section 3y's "RS 19 / RBiH 2 / HRHB 1 authorizations" is a count of what the harness
  accepted, not of what is authored.** Real catalogs: pre-planned RS 17 / RBiH 1 / HRHB 1,
  triggered RS 6 / RBiH 1 / HRHB 1, opportunity RBiH 10 / HRHB 5.
- **"The army effectively stops mounting operations" was right about the outcome and wrong
  about the cause** — and my subsequent correction ("emergent operations run for the player
  anyway") was itself wrong. Superseded by the dispatch-gate finding above.
- **My casualty comparator was wrong.** I benchmarked 31,365 against the ~60,231 historical
  figure. The engine's own blessed 188w checkpoint (`REAL_WAR_MASTER.md`, commit `26929e6b8`)
  produced **56,553** and was signed off as inside the band. The player run deletes **45% of
  the deaths from the engine's own accepted baseline** while RS-as-player retains 92.5%.
- **My "all three factions follow authored historical defaults" premise is false, and section
  3z of this same diary is why.** ~20 decisions have no authored default, including
  `strategic_posture_review_rbih` and `drina_cleansing_decision_1992`. I recorded that finding
  and then built a controlled-experiment claim on top of it without connecting the two. The
  experiment has more than one uncontrolled variable.
- **Engine Invariants §14.10a does not support the argument I cited it for.** Withdrawn.

### Residual — CLOSED, and closing it overturned the panel's severest finding

The level-0 RBiH run reports `operations_launched: 2`; the traced mechanism allows at most one
(`Operation Circle`, `pre_planned_operations.ts:998`, the entire `ARBIH_PRE_PLANNED` catalog).
**Closed 2026-08-27.** The harness now persists `operation_history` AAR names per faction; the
rerun names the two operations as `Operation Circle` (t9-16) and **`Operation Farz 95`
(t161-171, success)**. The second one is the operation the Operations seat had just declared
unreachable for a player — so the residual it flagged as "cheap to close, close it before
building on this" was, correctly, the thread that unravelled its own severest claim.

**The seat was right to flag it and right about why.** A count of 2 where the mechanism allowed
1 was the only visible symptom that the mechanism was wrong, and it was visible only because
the seat refused to round its own residual away. That discipline is the reusable part of this
panel, more than any individual verdict in it.

## 3u. Historical operation codenames are drawn with no date gate — and the Historian's fix would re-open a closed bug

Found while verifying the Historian seat's "`Uragan 95` is missing" claim. The claim is correct
about authored operations and incomplete about the engine: `Uragan`, `Neretva` and `Ljeto` all
exist in `src/sim/combat/operation_names.ts` — the **codename pool for emergent bot operations**
— annotated with their real historical referents:

```
'Operacija Neretva',   // Neretva 93 — anti-HVO, Sep 1993
'Operacija Uragan',    // Hurricane — 2nd Corps Vozuca, Sep 1995
'Operacija Ljeto',     // Summer 95 — Grahovo/Glamoc, Jul 1995
```

**`pickOperationName` (`operation_names.ts:251`) accepts `turn` and uses it only as hash input**
(`key = \`${corpsId}:${turn}\``) and as the value written into `used_operation_names`. Selection
is `simpleHash(key) % pool.length` then scan-forward for the first unused name. **There is no
date constraint and no theatre constraint on which codename a given operation receives.**

So an emergent ARBiH operation in autumn 1992 can be issued the name `Operacija Uragan` — a real
September 1995 offensive — or `Operacija Neretva`, a real September 1993 operation against the
HVO, possibly while the operation in question is fighting the VRS. My own runs show the pool in
use: `Operacija Stjena`, `Bedem`, `Čelik`, `Odmazda`, `Javor`, `Hrast`, `Zvijezda`, `Kiša`,
`Džihad`, `Sjena`, `Ihlas`, `Strijela`, `Hajka`, `Grad`, `Odluka` are all pool draws.

### This bug class is already known, and was closed for four names only

`LANE-NIGHTSHIFT-STUPCANICA-W27-TRIGGER-FIX` (2026-05-07) removed **Krivaja**, **Stupčanica**,
**Sana** and **Maestral** from the pools. The commit's own rationale, quoted from the file header:

> Bot ops were picking up names like "Operacija Stupčanica" / "Operacija Krivaja" / "Operacija
> Sana" / "Operacija Maestral" at any turn (e.g. w27 …), **masquerading as the canonical
> sensitive-history operations and tripping AAR scans + war-or-game scrutiny.**

**The filter's criterion was name COLLISION with an authored operation, not historicity.**
Neretva, Uragan and Ljeto are real named operations with real dates and real targets, but
because nothing authored elsewhere in the engine carries those names, they were never
candidates for exclusion. The masquerade the 2026-05-07 fix was written to stop is still
available through them — it is simply less visible, because there is no canonical operation
sitting next to them to make the collision obvious.

### The dependency the Historian seat could not see

The Historian recommends authoring **`Neretva 93`**, **`Uragan 95`**, and renaming the t160-170
Grahovo/Glamoč operation to **`Ljeto 95`**. All three names are currently live in the bot pool.

**Authoring them without removing them from the pool in the same change reproduces the exact
2026-05-07 defect for three more names** — a canonical operation and a randomly-dated bot
operation sharing a name in the same run. Anyone actioning the Historian's composition fix must
also extend the exclusion list; the two findings are a single change, not two.

Recorded, not fixed. Severity: low on its own, **medium as a trap laid across the Historian's
recommendation** — which is the reason it is written up here rather than filed as cosmetic.

## 3t. The grade shift is real, but it is NOT an abdication reward — it is the operations bug reaching the scorer

Verified from source and from four measured runs. **The War-or-Game seat's mechanism is
confirmed; its interpretation and its recommended sequence are both wrong.**

### The mechanism, confirmed

`src/sim/negotiation/scoring.ts:447-471`:

```ts
const HISTORICAL_CASUALTY_BASELINE = Object.freeze({ RBiH: 140000, RS: 95000, HRHB: 35000 });

export function humanCostGradeShift(faction: string, casualties: number): number {
    const ratio = casualties / hist;
    if (ratio <= 0.75) return 1;   // materially less bloody than history
    if (ratio < 1.33) return 0;    // historical-level (par)
    if (ratio < 2.0) return -1;
    return -2;
}
```

Default-ON (`scoringSimpleEnabled`, owner-adopted 2026-08-10). Reached at `:782` via
`applyHumanCostShift(earned.grade, faction, factionTotalCasualties(state, faction))`.

**Correction to the seat's arithmetic.** It computed the ratio from *killed only* (11,892 /
140,000 = 0.085). The function is fed `factionTotalCasualties` (`:485-488`) = **killed + wounded
+ missing_captured**, matching the baseline's stated KIA+WIA+MIA definition. The seat's input was
wrong by roughly 5×. Its conclusion nevertheless survives — see below — but the number it quoted
does not.

### What the measurements actually show

| run | RBiH K+W | ratio | shift |
| --- | --- | --- | --- |
| RBiH as **player**, autonomy 0 (2 operations) | 61,425 | 0.439 | **+1** |
| RBiH as **player**, autonomy 1 (11 operations) | 78,523 | 0.561 | **+1** |
| RBiH as **bot** (inside the RS-player run) | 107,559 | 0.768 | **0** |

**The passive player and the active player both get +1.** An RBiH player who launches 11
operations — 5.5× the activity — lands at 0.561, still comfortably under the 0.75 threshold. He
would have to roughly double his casualties again to lose the bonus.

**So abdication is not rewarded relative to fighting.** The seat's headline — *"the dominant
RBiH strategy is to decline to fight the war of national survival and collect a better score for
it"* — is **overstated and I should not have relayed it in that form.** Playing passively buys
you nothing over playing actively.

### The real finding, which is worse in a more interesting way

**Every RBiH player gets +1 while the RBiH bot gets 0, regardless of how the player plays.**

That is not a scoring defect. It is the operations-suppression defect arriving at the scorer:

    player faction filtered out of bot corps/brigade order generation
      (selectBotBrigadeOrderFactions, war_phases.ts:928)
        -> far fewer operations launched
          -> far fewer casualties taken and inflicted
            -> ratio falls under the 0.75 threshold
              -> +1 letter grade, free, to any player

The scoring model is not inverted. **It is being fed a broken input and faithfully rewarding
it.** The frozen 140k/95k/35k baseline is explicitly documented as "a HISTORICAL FACT … not fit
to sim output" — which is correct design, and precisely why it cannot absorb a sim that
under-produces casualties by 45% in the player seat.

RS shows the same root through a different sign: autonomy 0 → 0.890 → shift 0; autonomy 1 →
0.730 → shift **+1**. Being *more* active moved RS across the threshold in the favourable
direction, because autonomy 1 restores the bot pipeline and changes the whole war. The
common factor in both factions is that **player-faction casualty totals are not commensurable
with bot totals**, so a threshold calibrated on history discriminates player-vs-bot rather than
well-played-vs-badly-played.

### This reverses the seat's recommended sequence

War-or-Game made closing the scoring interaction a **blocking condition** on the operations fix,
reasoning that fixing operations first "merely reduces an exploit rather than removing it."

**The evidence says the dependency runs the other way.** The grade shift is downstream of the
casualty totals, which are downstream of operation suppression. Fix the suppression and player
casualties rise toward the bot's 0.768 — the free +1 disappears without touching `scoring.ts` at
all. Closing the scoring side first would mean re-tuning a threshold against numbers that are
about to move, which is the "calibrate the floor rather than a healthy engine" trap this project
has an explicit lesson about.

**Integrator ruling: operations first, then re-measure the shift.** I am recording the seat's
blocking condition as *not sustained on the evidence*, and noting that I concurred with it in an
earlier report before measuring — that concurrence was premature and is withdrawn.

Recorded, not fixed.

## 3s. Serb civilian deaths — the finding is WITHDRAWN as framed, and reframed

Historian seat verdict, 2026-08-27. **The claim "the engine under-counts Serb civilian deaths by
roughly half, specifically when the player is Bosniak" is wrong in three independent ways and
must not reach the owner in that form.** It is also, as the seat noted, the exact sentence a
bad-faith reader would quote.

### Correction to MY premise first

I reported that the engine's civilian total (31,335) matched the blessed checkpoint's 31,115
within 1%, and concluded the defect was one of *share* rather than *volume*.

**`REAL_WAR_MASTER.md`'s 31,115 is not a historical baseline — it is a prior run of the same
engine**, on a page that labels civilian coverage NOT ESTABLISHED. Matching it demonstrates
run-to-run reproducibility, not historical validity. Against history (RDC 39,199) the run is
**20% low**. Both statements are true; only the second bears on the finding, and I quoted the
one that does not.

Decomposition of the 1,990 shortfall, from the seat:

    volume: 31,335 / 39,199 = 0.799
    share:      6.1% / 10%  = 0.610
    product:  0.799 x 0.610 = 0.487  =  1,910 / 3,920  (exact)

Attribution: share ~61%, volume ~24%, interaction ~14%. **Neither factor alone is "half."**

### The baseline is contested, by a factor of two

| source | civ total | Bosniak | Serb | Croat | Serb share |
| --- | --- | --- | --- | --- | --- |
| RDC *Book of the Dead* (2007) | 39,199 | ~32,500 (83%) | **~3,920 (10%)** | ~2,000 (>5%) | 10% |
| ICTY OTP (Zwierzchowski & Tabeau 2010, Tbl 6a) | 36,700 | 25,609 (69.8%) | **7,480 (20.4%)** | 1,675 (4.6%) | 20.4% |

The ICTY figures were extracted verbatim from the primary PDF by the seat (Civilians Men
19,715 / 6,299 / 1,230 / 1,482; Civilians Women 5,894 / 1,181 / 445 / 453). **Confidence: HIGH.**

They diverge for one arithmetic reason: both classify by military-list membership, RDC held the
RS army registries (20,665 Serb dead assigned to JNA-VRS formations) and ICTY's database assigns
only 15,299. The ~5,400 difference is the same people binned differently — Serb dead absent from
the military lists ICTY holds **default to civilian**.

**A consistency point that decides which source AWWV should use.** `REAL_WAR_MASTER.md:44`
records the owner's rejection of the Tabeau ethnicity split for the army-of-service question, on
the ground that *"it undercounts the VRS (late/incomplete RS registries)."* You cannot reject
Tabeau's Serb **soldier** count as registry-driven and simultaneously adopt Tabeau's Serb
**civilian** count, which is inflated by the same missing registries. Consistency points to RDC —
**but that is a prior decision, not independent evidence**, and it should be surfaced as such.

### "~4,000" is the engine's own tuning target

`src/state/displacement_loss_constants.ts:16-17`:

```ts
/** RS civilian departure from RBiH/HRHB was mostly voluntary flight (~1% lethality).
 * Historical: sim was producing ~10,860 RS civ killed vs ~4k actual (n159 audit B2). */
export const DISPLACEMENT_KILLED_FRACTION_RS_FROM_NON_RS = 0.01;
```

Commit `fcc184696` (2026-03-06) cut the Serb civilian kill fraction **4% → 1%, deliberately, to
hit the ~4,000 RDC anchor**, because the engine had been producing 10,860. Bosniak was separately
raised to 4% because "Bosniak ethnic cleansing was uniquely severe."

**The finding was using the engine's calibration target as evidence that the engine misses that
target.** The real open question is not a bug but **source selection**: tuned to RDC (~4,000), the
parameter is under-set ~1.9× against ICTY (7,480). That is a Historian/panel decision.

### It is not player-ethnicity-specific — it tracks war intensity

Every 188w run in the worktree, tabulated by the seat:

| run | player | ops | total civ | Bosniak | Serb | Croat | Serb % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| au-RBiH-0 | RBiH aut0 | 2 | 31,335 | 27,610 | 1,910 | 1,815 | 6.1% |
| au-RBiH-1 | RBiH aut1 | 11 | 31,771 | 27,080 | 2,410 | 2,281 | 7.6% |
| hc-HRHB | HRHB | 1 | 32,541 | 27,327 | 2,838 | 2,376 | 8.7% |
| au-RS-1 | RS aut1 | 15 | 32,244 | 26,781 | 3,179 | 2,284 | 9.9% |
| au-RS-0 | RS aut0 | 16 | 34,687 | 28,527 | 3,596 | 2,564 | **10.4%** |

- **The RS-player run reproduces the historical shape almost exactly** — 82.2/10.4/7.4 against
  RDC's 83/10/>5. The engine is fully capable of the historical share.
- **Bosniak civilian dead are nearly invariant** (26,781-28,527, ±3.2%) while Serb varies **1.88×**
  and Croat 1.41×. Serb and Croat deaths are the only variable component of the model.
- The variation is **monotone in war intensity, not player ethnicity.** Serb civilian deaths in
  this engine require RS-held ground changing hands; in a run with two Federation operations,
  almost none did. An engine that killed 3,900 Serb civilians in that run would be the defect.

### The comparison is invalid regardless — no siege, no execution pathway

Exactly two civilian-death pathways exist, and both require territory changing hands or hostile
occupation: `recordCivilianDisplacementCasualties` (`displacement.ts:558,565,854,862`;
`displacement_takeover.ts:771,894`) and `paramilitary_sweep.ts:950`. **There is no siege pathway,
no shelling-under-static-front pathway, and no mass-execution pathway.**

The war's two largest civilian-death events therefore sit entirely outside the model:
- **Sarajevo siege — 4,954 civilians** (ICTY, Tabeau 2003), 44 months, no control change, ~13% of
  all civilian dead.
- **Srebrenica, July 1995 — ~8,000.** The takeover is modelled; the executions are not. Per canon
  H1.8 the enclave outcome is deliberately event-owned.

Both are overwhelmingly Bosniak. So the engine is missing **~13,000 real Bosniak civilian deaths**
and still reports 27,610 against a historical Bosniak civilian total of ~32,500 — its displacement
pathway alone produces roughly **1.4× the historical takeover-pathway Bosniak subtotal**. The
numerator is over-produced *and* the denominator is missing 13k deaths from unmodelled causes.
**A percentage built on that denominator cannot be scored against RDC percentages at all.** That
does not qualify the finding; it invalidates it.

### Srebrenica classification cuts against the comparison, hard

RDC's own assessors (HRDAG, rdn5.pdf §1.5) state that BBD "Status in War" is set by military-list
membership only and that *"civilians are in our opinion underrepresented"* — families registered
dead relatives as soldiers to obtain post-mortem benefits. The combat/non-combat field built to
fix this is **96.4% missing** and "of no use at all." ICTY's Srebrenica finding is ~⅓ 28th
Division, ~⅔ civilians, and the classification is contested in live proceedings. Reclassifying
toward military lowers the Bosniak civilian count and **raises the Serb share toward ICTY's 20%**;
toward civilian does the reverse. **Any Serb-share finding must state which convention it
assumes.** The original claim stated none.

### LATENT TRAP — worth its own ticket

`scenario_runner.ts:1554-1556` sets the census to `undefined` inside a **silent catch**. The census
currently loads clean (110 municipalities, 0 missing breakdowns, 4,360,093 / 43.3% Bosniak /
31.3% Serb / 17.5% Croat — matching the real 1991 census to a tenth of a point). But
`displacement.ts:565` and `:862` carry a hardcoded
`recordCivilianDisplacementCasualties(state, 'RBiH', lostAmount, 0)` fallback. **If that data file
ever moves, every civilian death in the game silently becomes Bosniak, with no error.** Not
firing today; one file-move away from firing.

### What should reach the owner instead

> The engine's civilian-casualty model has no siege pathway and no mass-execution pathway — only
> takeover and displacement. Historically those two missing pathways produced roughly 13,000
> deaths (Sarajevo 4,954, Srebrenica ~8,000), so neither the engine's civilian total nor its
> ethnic shares are comparable to the historical record yet. `REAL_WAR_MASTER` already records
> this as NOT ESTABLISHED; the code confirms why. **Per-nationality civilian comparisons should
> not be run until that gap closes, because every such comparison currently measures the coverage
> gap rather than the model.**
>
> Underneath it, one genuine structural property: **Serb and Croat civilian deaths are the only
> variable component.** Bosniak deaths vary ±3.2% across all outcomes; Serb deaths vary 1.88× —
> because Bosniak deaths come from the invariant 1992 takeover wave while non-Bosniak deaths
> require Federation counter-offensives. A statement about mechanism, not about ethnic accounting.
>
> And one decision for the Historian/panel, not a bug: the Serb civilian rate is calibrated to
> RDC (~4,000); ICTY's figure is 7,480. The preference for RDC rests on the owner's rejection of
> the Tabeau split over incomplete RS registries — coherent and consistent, but it should be
> **recorded as the explicit reason** rather than left implicit, precisely because this is the
> number that will be contested.

### Housekeeping from the same seat

- `tmp-playtest/hc/summary.json` reports a civilian total with NULL per-faction figures (older
  schema). Do not read per-faction numbers from it.
- The prior Historian verdict's "BB1 pp.189-363 not extracted" is **imprecise**: pp.189-213 and
  215-225 ARE extracted. Actual BB1 gaps: 1-37, 78-155, 214, 226-400, 502-505, 546+.
- `HISTORICAL_TIMELINE_MASTER.md` contains **no** civilian casualty statistics and is not a source
  for this question. The BB knowledge base carries narrative references but no aggregate
  civilian-casualty-by-ethnicity data — it is a CIA operational military history, the wrong
  instrument here.

## 4. Fixed this session (recorded, not open)

| What | Detail |
| --- | --- |
| Desktop app could not start a campaign at all | IPC validator rejected any payload without `decisionMode` while its own callee defaults it; two callers, only one updated by the case-file commit. |
| Blank game screen after start | `manualChunks` split `components/army_hq/` four ways by filename, creating a circular chunk dependency; the TDZ error killed the React render. |
| Case-file opening unreachable | Desktop launch showed the warroom's instant faction picker — the flow the 2026-08-23 plan was written to replace. Now routed through the case-file sequence. |
| Old Command Post flashed before the new opening | Owner-reported. `#main-menu` was visible by default while the desktop path awaited map data, the shell iframe, and state. |

---

## 5. Harness honesty

Ten driver defects were found and fixed this session. **Four share one root: the harness
took an action that changed app state, then measured the state it had just changed.**

| Action | Consequence | Reported as |
| --- | --- | --- |
| blind `Escape` fallback | paused the game | "ADVANCE does not move the date" |
| `Open Decision Room` every pass | navigated off the decision | "0 decision cards" |
| surface tour before the turn loop | stranded the shell in Army HQ | "no ADVANCE control" |
| bare `×` to clear a banner | closed the Decision Room | queue could never be worked |

Every one produced a false critical about the app. Any new interaction must state what it
perturbs before it is added.

Two more worth naming: a `Frame` handle captured once goes stale and then answers queries
with **zero matches instead of throwing**, so the driver reported "0 decision cards" while
the card was visible in its own screenshot. And a readiness regex written through a shell
heredoc turned `\b` into a literal backspace — `tsc` passed, because a backspace inside a
regex literal is valid TypeScript.

---

## 6. Open

- **RS advances 0 turns.** `clearReviewQueue` is never *called*: something returns true on
  all 20 clearing passes, prime suspect `resolveOpenDecisionModal` looping on a modal that
  does not close. Next step is to log which clearer returns true per pass — **not** to add
  another route. Handed over after ten attempts; see `tools/playtest/TODO.md` item 10.
- **Turn 9 ceiling** unbroken on RBiH and HRHB.
- **Nothing beyond 1 Jun 1992 has been played through the UI**, so no claim in this diary
  extends to the middle or end of the war.


<!--
Coverage block. Every OPEN finding must appear here, or diary_check reports it
UNDOCUMENTED. Fingerprints are what is read; titles are for humans.
-->
<!-- diary-coverage
071aa478b1c1  [medium] Decision `address_to_nation_rbih` has no authored historical default
072256b5b4e9  [high] A "front" has both sides in the same municipality
07ddb9a5fad8  [high] Player faces almost no decisions across the campaign
0a33a4fe74ef  [low] Lever `replace_co` refused: no_current_co
0ac8f0df01a3  [high] Opening screen needs a complete redesign to match the game aesthetic
102752f61718  [high] The same sentence is maintained in two files and they disagree: "A thinly held front OG needs st
121de4b137cf  [medium] Decision `csq_third_party_mediation_offered` has no authored historical default
14db02d9277d  [medium] Decision `strategic_posture_review_rs` has no authored historical default
182e6e7f012e  [medium] Peace-plan modal offers no historical default and no per-option stakes
1bc0a56b95c2  [medium] Interactive control with no accessible label
1e2303120fe2  [medium] Interactive control with no accessible label
2bfd8975d35e  [medium] The Sector Attack operation type still says "Sector" in player-facing text
35b2632dfcf3  [medium] Surface "in_game" renders text in 5 different font families
36f51e543f63  [medium] Decision `milosevic_isolation_warning_aug92` has no authored historical default
40cebc4589ae  [medium] Decision `decorate_a_unit_hrhb` has no authored historical default
410897e96e98  [low] Lever `request_op` refused: insufficient_command_authority (#.#/#)
448a72521b99  [medium] Decision `milosevic_drina_warning` has no authored historical default
50b8dda5812e  [medium] Interactive control with no accessible label
50bb59700448  [medium] Typography is inconsistent across surfaces
56b6bda5d71e  [medium] Interactive control with no accessible label
582f880d10c1  [medium] Advance is offered and does nothing when a room-only blocker is outstanding
5dcd7a783734  [low] Lever `replace_co` refused: not_a_field_command
5ff0afb189d7  [medium] Interactive control with no accessible label
681d5f62ef1f  [medium] Decision `strategic_posture_review_rbih` has no authored historical default
6c2feb3668af  [low] Decision `contact_group_plan_1994` shows no stakes on any option
6c6f24ff39fa  [high] Territory bar counts allied ground as "hostile-held"
6cd4fa018f9a  [critical] Turn cannot be advanced after four attempts
6f579329b22e  [medium] Surface "war_map" has no reachable control
7269b4bdc6f0  [low] Decision `gornji_vakuf_clashes_1993` shows no stakes on any option
72962be702b1  [medium] Surface "army_hq" has no reachable control
764fd700316e  [medium] Retired term "sector" still in player-visible copy in ui\shared\operational_sitrep_views.ts
78be3027390d  [low] Decision `vance_owen_plan_1993` shows no stakes on any option
78cd60d64f40  [high] Copy says a formation group is "thinly held" — an OG holds ground, it is not held
7a0d6330c9bc  [medium] Decision `visit_to_front_rs` has no authored historical default
7afde0e4e2d4  [high] RS opens with six required presidential decisions; RBiH opens with one
7c85fee759a7  [high] Two sources for the same sitrep copy disagree: i18n says "OGs", the hardcoded fallback says "sec
81513817311f  [medium] Surface "desk" has no reachable control
82d7f0d636aa  [medium] Decision `drina_cleansing_decision_1992` has no authored historical default
850a3806cfbc  [medium] Interactive control with no accessible label
864769f1dd1d  [medium] Decision `visit_to_front_hrhb` has no authored historical default
919e8513877e  [medium] Place names are lower-cased after the first word
91b00300864a  [low] Lever `replace_co` refused: insufficient_command_authority (#/#)
9a16b34a3a19  [medium] Surface "records" has no reachable control
a0ccbbe32a3a  [low] Decision `owen_stoltenberg_plan_1993` shows no stakes on any option
a1259f689f15  [medium] Surface "chronicle" has no reachable control
a3d3e77f12f8  [medium] Decision `decorate_a_unit_rbih` has no authored historical default
a89743c17ab3  [medium] Decision `address_to_nation_rs` has no authored historical default
ab660671b06e  [high] Territory bar counts allied HVO ground as "hostile-held"
ad599a9641f7  [medium] Retired term "sector" still in player-visible copy in ui\map\i18n\messages.en.ts
ad92ce300e18  [medium] Decision `milosevic_owen_stoltenberg_distancing` has no authored historical default
adf0fc5fc3d4  [low] Lever `replace_co` refused: insufficient_command_authority (#.#/#)
ae77d671480f  [high] Decision Room room-only blockers are unreachable from the screen that refuses the turn
b615fa723d8f  [medium] Interactive control with no accessible label
b9ce83d06de9  [medium] Decision `visit_to_front_rbih` has no authored historical default
bea6d0522e3e  [low] Decision `hrhb_washington_agreement_1994` shows no stakes on any option
c019b7857b38  [medium] Decision `milosevic_vopp_pressure` has no authored historical default
d4d184df999e  [medium] Decision `address_to_nation_hrhb` has no authored historical default
d5daa3a10f94  [high] Priority-front labels pair a settlement with its own municipality under two names
e341d4e3cfc7  [low] Lever `request_op` refused: not_a_field_command
e4b031f59b77  [medium] Surface "codex" has no reachable control
ea9d210f3201  [low] Lever `request_op` refused: insufficient_command_authority (#/#)
f832cc39d03a  [medium] Place names rendered with lower-case words after the first
fb548f6d5e27  [medium] Decision `decorate_a_unit_rs` has no authored historical default
fc75f83f7348  [medium] Interactive control with no accessible label
ff048ab927a1  [medium] Operation directive rejected with a reason the player is never shown
-->
