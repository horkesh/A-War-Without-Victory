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

### CLOSED — territory compensates, and the exploit does not exist

The gap in my own analysis was question 5: is there a compensating term? **There is, it is
territory, and it more than offsets the cost bonus.** Measured across the RBiH A/B:

| run | ops | territory | territory anchor | REPORTED grade |
| --- | --- | --- | --- | --- |
| RBiH autonomy 0 (passive) | 2 | 23.41% | C | **B** |
| RBiH autonomy 1 (active) | 11 | 32.02% | A | **A** |

The active president holds **8.6 more points of territory**, worth two anchor tiers (C → A),
while both receive the same +1 cost shift. **The active player strictly dominates the passive
one by a full letter grade.**

**So the War-or-Game seat's finding is REFUTED, not merely overstated — and my own softened
restatement of it was also wrong.** I reported that abdication "buys you nothing over playing
actively." It is stronger than that: abdication *costs* you a letter grade. There is no
abdication exploit in this build. The game rewards fighting the war, which is what it should do.

What remains true, and is a much narrower claim: the +1 shift **is** grade-decisive in absolute
terms (it turns an earned C into a reported B), and player runs receive it while bot runs do not,
because the operations-suppression defect depresses player casualties. That inflates player
grades against the historical scale. **It does not create a perverse incentive.** Fixing the
operations suppression remains the correct action, for accuracy rather than for exploit-closure.

### The atrocity bright line works ON THE SREBRENICA PATH (narrowed — see §3p)

Unlooked-for, and the most reassuring result in this diary:

| run | territory | territory anchor | war_crimes_events | REPORTED grade |
| --- | --- | --- | --- | --- |
| RS autonomy 0 | **49.56%** | A+ candidate | 53 | **D** |
| RS autonomy 1 | **50.09%** | A+ candidate | 35 | **D** |

**RS holds half of Bosnia and is graded D.** A faction that achieves its maximal territorial war
aim through mass atrocity is graded near the bottom of the scale. That is AWWV's stated thesis —
atrocity is never rewarded — working in the default build, measured, not asserted.

This also resolves the question I had flagged as open: RBiH's `war_crimes_events: 10` did not cap
its grade while RS's 53 capped it to D. The gate is threshold/flag-driven rather than a raw
count, consistent with `memory/s6_liveness_authorized_cleansing_flag`. **Not a bright-line
failure.** The question is closed.

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

## 3r. The endgame tells the player he HELD Srebrenica and Žepa. The map says both fell.

**This is the strongest finding of the lane and it is player-facing.** Measured, not inferred,
in run `enc-probe` (RBiH player, historical policy, autonomy 0, 188 turns).

### The measurement

Harness now captures enclave provenance alongside the verdict:

```json
"enclave_provenance": {
  "enclave_state_present": false,
  "enclave_state_keys": [],
  "srebrenica_2_controller": "RS",
  "zepa_2_controller":       "RS",
  "gorazde_2_controller":    "RBiH"
}
```

against what the endgame reported to the player:

```
reported held: ["sarajevo","srebrenica","zepa","gorazde","bihac"]
reported lost: []
```

**Ground truth and the verdict disagree on the two most consequential outcomes in the game.**

### GOOD NEWS FIRST — the enclave guard is NOT breached

`op:srebrenica:srebrenica_2 = RS`, `op:rogatica:zepa_2 = RS`, `op:gorazde:gorazde_2 = RBiH`.
**Srebrenica and Žepa fell; Goražde held.** That is exactly what the ENCLAVE GUARD requires and
what canon H1.8 specifies. The simulation is behaving correctly. Nothing here goes to the §6
panel as a breach — I checked precisely because it looked like one.

### The defect is the REPORT, and it fails open

`src/sim/negotiation/compute_capital.ts:321-322`:

```ts
const enclaveState = state.military.enclave_state;
if (!enclaveState) return { held: KNOWN_ENCLAVES, lost: [] };
```

`enclave_state` is **absent** in this run (`enclave_state_present: false`, zero keys). The
function therefore returns every known enclave as HELD and none as lost — a result
indistinguishable, in the verdict, from a war in which the player genuinely saved every pocket.

**On the single most §6-sensitive field in the game, "I do not know" renders as "Srebrenica
held."** That is the wrong direction to fail. In a game whose stated thesis is that the player
authors the tragedy, the end-of-campaign screen currently absolves him of the two outcomes the
war is remembered for.

### It also feeds the grade, and gates four tiers

`RBIH_GRADE_ANCHORS` (`scoring.ts:504-535`) tests `enclaves_lost` in four of six tiers:

| grade | enclave condition |
| --- | --- |
| A+ | `enclaves_lost.length === 0` |
| A | `length <= 1` and not `sarajevo` |
| B | not `sarajevo` |
| C | `length <= 3` |

The fail-open sets `enclaves_lost = []`, which satisfies **every one of them unconditionally**.

**Precision, because this matters:** in *this* run the fail-open was **not grade-decisive** —
territory (23.4%) was the binding constraint, and C's `<= 3` test would have passed even with
Srebrenica and Žepa correctly listed. **The defect is live but latent here.** It becomes
grade-decisive at territory ≥ 25%, where the A/A+ tiers turn on exactly the field that is being
reported wrong. Recorded as live-and-latent, not as "it inflated this grade."

### What DID move the grade — the +1 shift, confirmed end-to-end

Walking the anchors against measured capital (territory 23.41%, war_crimes_events 10):

    A+  needs > 33   -> no
    A   needs >= 30  -> no
    B   needs >= 25  -> no   (23.41 < 25)
    C   needs >= 18  -> YES  => earned grade C

**Reported grade: B.** The one-step gap is `humanCostGradeShift`, which I independently computed
at **+1** for this run from its casualty ratio (61,425 / 140,000 = 0.439, threshold ≤ 0.75).
Two independent derivations agree.

**So §3t's mechanism is now confirmed end-to-end, not just in source:** the human-cost shift is
live, default-ON, and grade-decisive. A player run that earns C is reported as B, on the strength
of casualty totals that are low because the player's operations were suppressed.

### One open question, deliberately not answered here

`war_crimes_events: 10` and the grade still improved by a step. The atrocity gate
(`capGradeByCondemnation`) keys on the emergent `authorized_cleansing_condemnation` flag rather
than on a raw war-crimes count (per `memory/s6_liveness_authorized_cleansing_flag`), so this is
**not** evidence the bright line failed — the two are different quantities. But "ten war-crimes
events, grade improved" is a sentence that needs an owner-legible answer before 1.0, and I am
recording the question rather than guessing at it.

### Why Krivaja-95 still did not fire — narrowed, still open

§3v established that Krivaja-95 requires `srebrenicaFallReceiptFired`. Srebrenica **did** fall
here (controller = RS), so the fall is real; either the `srebrenica_falls_1995` event receipt
never fired and the fall arrived by another path, or it fired and Krivaja was blocked downstream
by corps availability or the frequency gate. `enclave_state` being absent entirely suggests the
enclave subsystem is not participating in this pipeline at all, which would be the common cause
of both. **Not determined. Next experiment: capture event receipts in the summary.**

### Disposition

Highest-value fix in the lane, and cheap: the fallback at `compute_capital.ts:322` should fail
**closed** (or report unknown), never report the §6 outcomes as held. Whether `enclave_state`
*should* be populated in this pipeline is the larger question underneath it.

Recorded, not fixed.

## 3q. RS t42 cliff — ROOT-CAUSED. One unbuildable queue entry sterilizes a corps for the rest of the war.

Scenario-tester seat verdict, verified independently against source. **Two defects stack; t42 is
not a threshold, it is simply where the last still-launchable pre-planned operation happened to
start.**

### The third case — offered, ACCEPTED, and still never launched

I framed this as not-offered vs offered-and-not-taken. It is neither. From the seat's
instrumented trace of `state.meta.pending_proposal_reviews`:

```
HISTORICAL_OP:preplanned:vrs_sarajevo_romanija:Operation Trnovo |t69 |acc=true |res=69
HISTORICAL_OP:preplanned:vrs_drina:Operation Zvezda 94          |t100|acc=true |res=100
```

**The player authorized both. Neither ever launched.** The harness is behaving correctly — this
is not a probe artifact, which is the first thing I asked to be checked given this lane's history.

### SUPPRESSION A — the permanent head-of-queue block

`src/sim/combat/pre_planned_operations.ts:1581-1593`, verified verbatim:

```ts
// Build axes — brigades may not exist yet; keep queue entry for retry
const result = buildAxesFromDef(effectiveDef, state, adjacency);
if (!result) return false;
if (result.participating.length < MIN_OPERATION_PARTICIPANTS) {   // = 2
    collectOpInjectionWarnings(state, [{ ... check: 'participants_below_attack_floor' ... }]);
    return false;
}
```

**Three paths return false without shifting the queue** (`:1579`, `:1582`, `:1584-1593`). The
shift happens only on success, at `:1598`. The other shift sites (`:1521`, `:1527`, `:1551`,
`:1571`) cover `declined` and `all_objectives_owned` — **a failed BUILD never shifts.**

The retention is deliberate and the comment says so: *"brigades may not exist yet; keep queue
entry for retry."* That is sound for a transient miss. **There is no staleness bound and no
abandonment path**, so a permanently-unsatisfiable head entry retries forever.

It then stacks with `:1382`:

```ts
if ((cmd.queued_operations?.length ?? 0) > 0) continue;
```

which refuses every *other* pre-planned operation for a corps whose queue is non-empty.
**One unbuildable head entry therefore sterilizes the entire corps for the remainder of the
war.** Measured — both queues frozen identically from t50 through t188:

```
vrs_drina             queued=["Operation Zvezda 94","Operation Pracha River"]
vrs_sarajevo_romanija queued=["Operation Trnovo","Operation Kijevo"]
```

The proximate trigger is missing brigades:

```
t70 |Operation Trnovo   |brigade_missing|Brigade "rs_igman_brigade" not found in formations
t70 |Operation Trnovo   |brigade_missing|Brigade "rs_trnovo_brigade" not found in formations
t70 |Operation Trnovo   |axis_empty     |Axis would be empty: 0 valid brigades
t70 |Operation Trnovo   |participants_below_attack_floor|1 viable participant(s); 2 required
t101|Operation Zvezda 94|participants_below_attack_floor|1 viable participant(s); 2 required
```

The bot launched exactly these two operations at t69 and t100 — the same turns — because in its
world the brigades existed.

### SUPPRESSION B — the emergent channel is off for the player

`selectBotBrigadeOrderFactions` (`war_phases.ts:928-939`) filters the player faction out of
`generateAllCorpsOrders`, the sole path to `evaluateCorpsOffensiveLaunch` /
`evaluateSectorOffensiveLaunch` → `pickOperationName` — the source of every `Operacija *` name in
the bot's list. **My read of this one was right.**

### The autonomy tension, resolved — and it corrects the Operations seat

Autonomy 1 **does** restore the emergent channel. It simply does not help. RS corps stances over
the 146 turns after t42:

| | offensive | defensive | balanced | reorganize |
| --- | --- | --- | --- | --- |
| autonomy 0 | 876 | 0 | 292 | 0 |
| autonomy 1 | 333 | 435 | 397 | 3 |

At autonomy 0 the stances are frozen leftovers — the bot AI never runs for RS. At autonomy 1 it
demonstrably does, and what it emits after t42 is:

```
probe_vrs_2nd_krajina_t52, probe_vrs_2nd_krajina_t65, probe_vrs_2nd_krajina_t70
```

**Probes only. Zero capture-capable emergent operations.**

So the Operations seat's proposed explanation — *"RS's operations arrive through the
authorization channel, which is not autonomy-gated, and that asymmetry is the whole story"* — is
**not what the instrument shows.** The emergent channel genuinely switches on and yields nothing
but probes. The autonomy-invariance is caused by the probe defect, not by authorization routing.

### Two of my candidate mechanisms are REFUTED

- **`deferUnauthorizedHistoricalOperationsForPlayer`** (`historical_operation_authorization.ts:159-161`)
  is called from exactly two sites — `desktop_sim.ts:293` and `campaignRecruitmentActions.ts:308`
  — **both at campaign start, before any operation exists.** It never runs inside the headless
  turn loop, so its `delete command.queued_operations` is not in play at all. The Operations
  seat's claim that it wipes the 1KK / Drina / SRK / EBC follow-on chains is **wrong for the
  headless harness**, and I relayed it without checking the call sites.
- **`deferredCorps`** (`:1384`, `:1397`) is a within-pass set rebuilt on each call. It is not what
  persists. What persists is the unshifted queue entry.

### Relation to the known w101 probe finding — stacked, not identical

`memory/frozen_vrs_front_probe_root_cause` is what you hit *after* clearing this one. At autonomy
0 the emergent channel is off entirely, so the probe defect is invisible; turn autonomy on and it
becomes the binding constraint. **Fixing the queue block alone will not restore RS's late war,
and neither will fixing probes alone.** That is the single most important sentence for whoever
picks this up.

### Open — the trigger, not the defect

Why `rs_igman_brigade` (documented at `pre_planned_operations.ts:568-577` as spawning t29 and
alive at t69) does not exist at t70 in the player run when it does in the bot run. The seat
flagged honestly that it *inferred* the brigade's presence in the bot run from the fact that the
bot launched Trnovo at t69 (which requires ≥2 participants) rather than observing it directly.
**Next experiment.** Note the separation: the missing brigade is the trigger; **the permanent
block is the defect** that turns one missed spawn into 146 silent weeks.

### Harness instrumentation — verified before acceptance

The seat added an `ops-trace` probe (`tools/playtest/probes.ts:512`, `:526`). I verified rather
than accepted: `npx tsc --noEmit` exits 0; no `Math.random` / `Date.now` / `new Date` /
`performance.now` anywhere in the file; output is sorted; the probe reads `ctx.state`, returns no
findings, and is inert unless `PLAYTEST_OPS_TRACE` names a path. **Decisive check:**
`trace-RS-0b` (instrumented) and `au-RS-0-named` (un-instrumented) produce **byte-identical**
summaries. No engine source modified. Accepted.

Runs: `tmp-playtest/trace-RS-0` (aut 0, 16 ops / t42), `trace-RS-0b` (aut 0, widened capture,
identical), `trace-RS-1` (aut 1, 15 ops / t86 — the one late op is *triggered*, not emergent, so
the emergent cliff does not move).

## 3p. Red-team closure — my attribution was wrong, and the ops fix is what makes scoring bite

Gap-finder seat, returned last. It reproduced the grade ordering independently, confirmed two of
my readings, and **contradicted my attribution in a way that changes what should happen next.**

Independent reproduction (its own runs, not mine):

```
rt-passive   passive,        autonomy 0, 0 levers,    0 ops,  territory 22.42%  earned C -> emitted B
rt-active    counterfactual, autonomy 1, 1899 levers, 16 ops, territory 32.08%  earned A -> emitted A
```

Ratios verified by calling `humanCostGradeShift` directly and bracketing MIA at 0-10%: passive
0.457 → +1, active 0.604 → +1, verdict identical throughout. **The active president grades a full
letter higher**, matching the au-RBiH-0 / au-RBiH-1 pair. My withdrawal of the abdication finding
stands.

### CORRECTION 1 — the letter grade has exactly three terms

Confirmed and worth recording as a fact about the model:

    grade = capGradeByCondemnation( applyHumanCostShift( anchorGrade ) )

`computeFactionGrade` reads **nothing** but the anchors, and the RBiH anchors test only
`territory_controlled_pct`, `enclaves_lost` and `war_crimes_events`. **There is no exhaustion
term, no political-collapse term, and no manpower term in the letter grade at all.** Abdication
costs ~10 points of territory = two anchor bands; the +1 gives back one. Net −1 for the
abdicator. The shift narrows a two-letter gap to one; it never closes or inverts it.

### CORRECTION 2 — "the atrocity bright line demonstrably works" was TOO BROAD

I wrote that after seeing RS graded D on 50% territory. **Half of it is demonstrated and half of
it was never executed.**

`capGradeByCondemnation` (`scoring.ts:418-425`) recognises two flags, and its own header states
the split: *"genocide is event-gated to the Srebrenica path; authorized_cleansing is
emergent-only."*

- **`genocide_condemnation` → cap D.** Event-gated to Srebrenica, **not** emergent-gated. This is
  the path that produced RS→D in every RS run. **Genuinely demonstrated working on the default
  path.** That result stands.
- **`authorized_cleansing_condemnation` → cap C.** Emergent-only. The emergent atrocity block at
  `scoring.ts:819` is gated on `state.meta.decision_mode === 'emergent'`, and
  `run_headless.ts:114` **defaults decision-mode to `'historical'`**. So in `enc-probe` and in
  every run this lane has produced, that path **was never executed at all**.

**This is a coverage hole in my own playtesting, not just a caveat.** Every run in this diary is
historical decision mode, so the entire emergent atrocity system — the §2a condemnation mechanism
that `memory/s6_liveness_authorized_cleansing_flag` records as making atrocity grade-decisive —
is **untested by this lane**. It is inert-by-design in these runs, which is not the same as
correct. **Next: re-run with `--decision-mode emergent`.**

Also recorded: RBiH's `war_crimes_events: 10` is **identical across every RBiH run, passive and
active**. It is scripted, not player-caused — and it permanently blocks RBiH's A+ anchor, which
tests `war_crimes_events === 0`. Worth knowing before anyone treats A+ as reachable for RBiH.

### CORRECTION 3 — my attribution is REFUTED, and the sequencing reasoning with it

I claimed the +1 is a player-vs-bot artifact: "every player gets +1 and the bot gets 0." **That
is not what the data shows.** Measured shifts:

| run | player faction shift | bot faction shift |
| --- | --- | --- |
| RBiH-player | RBiH **+1** | RS bot **+1** |
| RS-player | RS 0 | RBiH bot 0 |
| HRHB-player | — | RBiH bot 0 |

**The RS bot receives the +1 too, inside an RBiH-player run.** The term cannot see the player.
What it sees is that when RBiH is the player the whole war is ~35% less lethal *for everyone*,
and all factions fall into the +1 band together. **It is a run-level constant that currently
cancels** — which is precisely why it is harmless today.

And the consequence inverts my recommendation's reasoning:

> `rt-active` launched 16 operations and fired 1,899 levers and still only reached ratio 0.604 —
> nowhere near the 0.75 boundary. **Maximal player activity does not lift RBiH out of the +1 band
> today.** Now fix operations suppression: the active player moves toward the bot's ~0.80 and
> **crosses 0.75, losing the +1**, while the passive player launches nothing, stays at ~0.457, and
> **keeps it**. Fixing operations does not remove the differential — it **creates** it.

**So "operations first" survives as a priority and dies as a justification.** I reversed the
War-or-Game seat's blocking condition on the reasoning that the scoring term is merely downstream
and would self-correct. That reasoning does not survive: the ops fix is what makes the scoring
term start discriminating, and it would then discriminate *against fighting*.

**Revised integrator ruling.** Operations first, as before — but the scoring item is **OPEN and
gated on the ops fix**, not closed, with a mandatory re-test of the passive/active grade ordering
once operations land. The seat notes the inversion window is narrow and it has **not** measured
one: it needs an active president who crosses 0.75 on casualties while gaining less than a full
anchor band of territory (e.g. active 24% → C with shift 0, against passive 22% → C with +1 → B).
Off the observed trend, not obviously impossible.

### A lead, explicitly NOT a finding

The Pyrrhic score runs the other way: `rt-passive` 74.7 against `rt-active` 14.2, a 60-point gap
in the abdicator's favour, on a metric the VerdictScreen shows next to the grade. The passive
president ends with military credibility, international standing and negotiating leverage all
pinned at A+.

**The seat disclaimed its own result and it was right to.** au-RBiH-0 vs au-RBiH-1 — same policy,
autonomy 0 vs 1 — score **74.4 vs 74.6**, essentially identical. The collapse is specific to the
`counterfactual` policy's 1,899 lever attempts, which spam CO replacements and attack orders and
*should* plausibly wreck patron confidence and cohesion. **Recorded as a lead for a separate
look, not as a finding, and not for the owner yet.** It does not touch the letter grade.

### Housekeeping

The seat flagged `tools/playtest/probes.ts` appearing modified mid-session in this shared
worktree. **Accounted for:** that is the scenario-tester seat's env-gated `ops-trace` probe, which
I verified independently (tsc clean, no RNG or wall-clock, sorted output, and the instrumented run
byte-identical to the un-instrumented one) and committed in `e8e54f2cb`. Not an unexplained edit.

### Still not determined, stated plainly

- The emergent-mode atrocity gate — never executed; needs `--decision-mode emergent`.
- Whether the Pyrrhic collapse is lever-spam or genuine activity punishment.
- Whether the post-ops-fix inversion window is actually reachable.

## 3o. §6 LIVENESS — VERIFIED END TO END IN EMERGENT MODE. Both condemnation paths fire.

The coverage hole identified in §3p is now closed. Run `fv-RS` (RS player, historical policy,
autonomy 0, **`--decision-mode emergent`**, 188 turns), all three faction verdicts:

| faction | | territory | territory anchor | emergent war crimes | condemnation flag | **GRADE** |
| --- | --- | --- | --- | --- | --- | --- |
| RS | *player* | **46.7%** | A+ candidate | 28 | `genocide_condemnation` | **D** |
| RBiH | bot | **32.2%** | **A** | 4 | `authorized_cleansing_condemnation` | **C** |
| HRHB | bot | 21.1% | C | 0 | — | C |

**Both condemnation flags fire. Both caps apply. Territory does not buy a good grade when
atrocity is present.**

- **RS holds 46.7% of Bosnia — its maximal war aim — and is graded D.**
- **RBiH earns an A on territory (32.2%, anchor threshold 30%) and is capped to C** by four
  authorized paramilitary sweeps. Four. The threshold is 1, and it bites at 4.
- HRHB, with no emergent war crimes, keeps the grade its territory earned.

This is AWWV's central ethical thesis — atrocity is never rewarded — **working end to end in the
default emergent build, measured across all three factions rather than inferred from one.**

### Correction: "the flag never fires" was MY HARNESS, not the engine

Everything I reported earlier about `authorized_cleansing_condemnation` never firing was a
**capture gap in my own harness.** `run_headless.ts:591` read:

```ts
player_verdict: verdict?.faction_verdicts?.[cfg.faction] ?? null,
```

The engine grades **every** faction (`scoring.ts:921` builds `faction_verdicts`); my summary
narrowed that to the player's entry and discarded the rest. The flag had been firing on RBiH the
whole time — I simply never wrote it down.

**And the faction it fires on is never the player**, which is why the narrowed capture hid it so
completely:

- RS is the only faction that accrues emergent war crimes heavily as a player (28), and it trips
  `genocide_condemnation` first — which correctly short-circuits the weaker check (`scoring.ts:819`
  skips authorized-cleansing when genocide is present, because D is a harsher cap than C).
- RBiH and HRHB as players launch too few operations to take ground, so they generate no rear
  pockets, no sweep requests, and no emergent war crimes at all.

So the flag is observable **only on bot factions** in every run this lane can currently produce.
That is a property of the operations-suppression defect (§3q), not of the §6 system.

### Two of my own claims, corrected

- **"The player may be structurally exempt from the atrocity mechanism" — REFUTED.** I raised it
  as a hypothesis and flagged it unconfirmed; good, because it is wrong. RS-as-player accrues
  **28** emergent war crimes against RS-as-bot's 11, and `pending_paramilitary_requests` is **0**
  at end in every run, so nothing piled up unanswered. The harness's missing paramilitary lever
  did not produce the signature I feared.
- **§3t's "the bright line works on the Srebrenica path" was too narrow** in the opposite
  direction from §3p's correction. Both paths work: `genocide_condemnation` (event-gated) and
  `authorized_cleansing_condemnation` (emergent-gated). §3p correctly narrowed an over-broad
  claim; this run lets it be broadened again, on evidence this time.

### Harness changes, all capture-only

- `all_faction_verdicts` — grade, outcome class, condemnation flags, territory, war crimes, for
  every faction. Sorted. This is the fix for the gap above.
- `atrocity_by_faction` — `war_crimes_events`, `war_crimes_events_emergent`,
  `civilian_casualties_caused`, `is_player`, per faction.
- `pending_paramilitary_requests_at_end` — so an unanswered-request backlog can never again be
  confused with an engine property.

**Known harness gap, recorded rather than fixed:** `LeverPlan` still has no lever for
`pending_paramilitary_requests`. A player faction cannot yet be made to authorize or refuse a
sweep from this harness, so the *player's own* authorized-cleansing path remains untested even
though the mechanism is now proven live. That is the next harness lever to build, and it is the
one that would let a playthrough actually exercise the choice §6 exists to govern.

## 3n. Queue-block fix — BUILT, MEASURED, REVERTED. Do not re-attempt without reading this.

The §3q root cause was real and the fix was correct in isolation. **It was reverted anyway**, on
two independent grounds. Recorded in full so the next person does not rebuild it.

### What was built

`injectQueuedOperation` (`pre_planned_operations.ts`) attempted only the HEAD entry of
`cmd.queued_operations`; a head that could not build returned false without shifting, and
`injectPrePlannedOperations` skips any corps whose queue is non-empty — so one unbuildable entry
sterilized the corps permanently.

The change iterated the queue: `injected` consumes and returns true; `consume` (moot / unknown /
declined) drops the entry and returns false, **deliberately preserving the pre-fix cadence**;
`retry` leaves the entry queued and tries the NEXT one; a pending authorization returns `halt` so
a later op can never jump ahead of a decision the president is being asked. Nothing was discarded
that was not already discarded.

`tsc` clean, `tests/pre_planned_operations.test.ts` green.

### Ground 1 — it did not do what it was built to do

**RS as player, 188 turns: 16 operations, last starting t42 — identical to before.**

The ops-trace shows why. By late war those queues hold a SINGLE entry each
(`["Operation Zvezda 94"]`, `["Operation Trnovo"]`); the later entries the root-cause seat saw
stacked behind them — Pracha River, Kijevo — had already run at t42 and t25. **There was nothing
for the loop to try.** The multi-entry queues in that seat's trace were an early-war snapshot; by
the time the cliff forms the queues are already down to one permanently-unbuildable op:

```
t70 |Operation Trnovo   |brigade_missing|Brigade "rs_igman_brigade" not found in formations
t101|Operation Zvezda 94|participants_below_attack_floor|1 viable participant(s); 2 required
```

### Ground 2 — the calibration "gain" was churn, and it worsened a known-bad site

Two full 188w calibration runs, one variable:

| checkpoint | without | with | delta |
| --- | --- | --- | --- |
| jan1993 | 695 | 695 | 0 |
| apr1994 | 674 | 675 | +1 |
| apr1995 | 668 | 671 | +3 |
| oct1995 | 652 | 653 | **+1** |

Anchors 31/31 in both, zero differences. Enclave guard clean in both. `op:kalesija:gojcin_2` and
the Farz P-A failure appear identically in both, so both are **pre-existing** and not caused by
the change.

But the oct1995 +1 is nine settlements moving in both directions, scored against
`data/source/calibration/painted_control_oct1995.json` (`by_settlement_id`):

| cell | ref | without | with | |
| --- | --- | --- | --- | --- |
| `op:bihac:trubar` | RBiH | RS | RBiH | improved |
| `op:bugojno:medini` | RBiH | HRHB | RBiH | improved |
| `op:centar_sarajevo:radava` | RS | RBiH | RS | improved |
| `op:ilidza:sarajevo_dio_ilidza_2` | RS | RBiH | RS | improved |
| `op:mrkonjic_grad:gerzovo_2` | HRHB | RS | HRHB | improved |
| `op:bosanski_petrovac:jasenovac_2` | RBiH | RBiH | HRHB | REGRESSED |
| `op:sanski_most:kljevci` | RBiH | RBiH | RS | REGRESSED |
| **`op:kljuc:hadzici`** | **RBiH** | RBiH | **RS** | **REGRESSED** |
| **`op:kljuc:kljuc_2`** | **RBiH** | RBiH | **RS** | **REGRESSED** |

**5 improved, 4 regressed — netting exactly the +1.** And two of the four regressions are at
**Ključ**, which `memory/brcko_firepower_deficit_fix_adopted` records as a known-open site where
RS control is the DEFECT, not the target. The change was worsening a known-bad site while the
aggregate ticked upward: buying score with wrong behaviour, which this project has an explicit
rule against.

**Reverted.** A change that misses its purpose and regresses a known-open site has no claim on
having been built.

### What this leaves

The queue-block defect in §3q is **still real and still unfixed**. Anyone fixing it should know:

- Fixing it does NOT lift the RS t42 cliff. The cliff's dominant cause is that at
  `autonomy_level === 0` the bot corps/brigade pipeline does not run for the player faction at
  all — and `docs/plans/2026-07-11-broader-assisted-execution-plan.md:7` says that is deliberate
  ("keeping `meta.autonomy_level === 0` as manual control"). At autonomy 1 the channel switches
  on and emits only probes, which is the separate w101 probe defect
  (`memory/frozen_vrs_front_probe_root_cause`). **Two defects stacked plus a design decision.**
- Any fix in this area moves bot behaviour, so it needs a paired 188w run and a
  cell-by-cell reference diff — the aggregate delta is not sufficient evidence. This one looked
  like +5 across the board and was 5-for-4 churn underneath.
- The Ključ pair (`kljuc_2`, `hadzici`) is the sentinel to watch: it moved first and it moved the
  wrong way.

### Process note, recorded against myself

Four ad-hoc parsers written during this analysis returned confident wrong answers — a catalog
year-tally that found 7 of ~40 entries, an enclave-definition scan that missed every
`capital_osid`, an anchor diff that reported "0 of 31 passing" for both runs, and a painted-
reference lookup that reported all nine cells absent. Each was wrong because I guessed the field
name or the file shape instead of reading it first. The last one mattered: it would have shown
"no reference data" for the exact cells that decided this revert. **Inspect the shape, then
write the lookup** — and reconcile every derived number against one you already know.

## 3m. BROADER PANEL — RS Srebrenica decision. EIGHT SEATS, EIGHT NO-GO. Refused unanimously.

Owner proposal, 2026-08-28: an event lets the RS player decide whether to take Srebrenica. The
event does not mention genocide; taking it produces the genocide as consequence; declining leaves
the enclave standing and grants it a corridor to RBiH territory, severing RS in two.

Convened per CLAUDE.md's broader-panel rule — the §6 four (Historian, scenario-tester/calibration,
Engine/systems, Red-team) plus Game Designer, Narrative Designer, Canon Compliance Reviewer,
War-or-Game. Eight seats, polled independently, implementer excluded. **All eight returned NO-GO,
for eight different sufficient reasons.**

### The verdicts

| seat | ruling |
| --- | --- |
| Narrative | Cannot be written honestly. Directive 7 names the population as the objective, so an accurate option breaches Ring 3 #1 and a neutral one makes the GAME the author of the euphemism. Refused to supply event text — per its brief, itself decisive. |
| Game Designer | Priced both branches. The 10 fall OSIDs are **364.4 km² = 0.71% of Bosnia**. Max punitive corridor = 4.25 points. Take → D (capped); decline → C or B. **Declining dominates by 1-2 grades.** Price it realistically and it is theatre; price it to bite and you have built "commit genocide or your state dies". |
| Calibration | Baseline is RED today; corridor route is 2 cells and cheap only because `luka_2`/`pomol_2` are held ahistorically; adding options **reclassifies the row for every run** (`isPlayerDecisionEvent` = presence of options); in emergent mode the RS **bot** could decline. |
| War-or-Game | The decision was taken **8 March 1995 in Directive 7**, not July. Measured corridor: 3 RS OSIDs / 35.2 km through the Drina Corps rear in the one month of 1995 with no exogenous enabler. 2nd Corps attacked that axis six times in 1994 — "advanced marginally if at all". |
| Canon | **JURISDICTION.** Ring 3 #1 is not one of the bright line's three named limbs and was never delegated. **Eight unanimous seats cannot cross a line the owner did not delegate.** Owner amendment required; panel verdict cannot substitute. |
| Engine | Decision half cheap and its counterfactual branch already built; **corridor fails** — severing RS costs **zero** supply isolation (1 isolated OSID before and after; RS holds sources in both halves). |
| Historian | The decision is historically sound — **the VRS declined twice on this enclave** (Srebrenica Apr 1993, Žepa May 1993). The corridor is fantasy and **manufactures a military necessity the perpetrators did not have**. |
| Red-team | **Decline strictly dominates on every axis the game scores.** Degenerate line named. And it refuted the evidence the proposal was built on — see below. |

### MY EVIDENCE WAS WRONG — five corrections, all mine

I built the case for this proposal on a measured run and read it incorrectly at nearly every point.

- **"Zero authorized sweeps."** The field is `null`, not `0` — *never written*, not *written and stayed zero*. A bot in the same run incremented it four times. **The harness's own source documents this as unmeasurable, in a comment I wrote the previous day**: *"a lever this harness does not yet fire… a player faction may be structurally unable to accrue the emergent counter."* I cited a number my own instrument says cannot be read.
- **"He refused every historical default."** He was never asked. `pending_paramilitary_requests_at_end: 0`; zero paramilitary findings across 2,640 records. The 15 off-default choices were all diplomatic (`defy_nato`, `maintain_hostages`, `remove_mladic`). **No atrocity was ever offered to refuse.**
- **"2,652 lever attempts"** — 2,597 are *rejections* for `insufficient_command_authority`. The run's own recorded finding: *"Player faces almost no decisions across the campaign."* I read effort; it was paralysis.
- **"The scripted war crimes should still bite."** They cannot. `RS_GRADE_ANCHORS` reads `war_crimes_events` at exactly one tier (A+, >55% + ≤2), and RS cannot reach A+ anyway. At A/B/C/D/F it is never read.
- **"Earned D."** Earned **B**. `grade_description` is the B anchor text; one flag dropped it four tiers.

Also corrected by the panel: **H1.8 does not say what I told all eight seats it says.** Its text is *"Consequences require explicit cause… adjacency or activity alone is insufficient"* — it forbids emergent/proximity falls, not player-caused ones. Both Game Designer and Canon caught this independently. And I quoted `contain_posture_gate.ts`'s "§6 HARD INVARIANT" as canon; **no canon document makes that commitment**, and canon contemplates the opposite in three places (Ring 3 #11, §2 criterion 3, the `enclave_defended` register).

### THE FINDING THAT SURVIVES — and it is bigger than the proposal

Three seats measured the same thing independently.

**The fall is a hardcoded write onto a board nobody contests.**

```
All ten OSIDs flip in ONE tick at t162, mechanism `event`, no attacker:
  op:srebrenica:brezovice_2   t162   RS -> RS   [event]   <-- writes RS onto a cell ALREADY RS
```

- **Zero of 599 battles** across 188 weeks target ANY of the eleven Srebrenica enclave OSIDs.
- The Drina Corps attacks the enclave **once in the entire war**, t45, and is destroyed: power ratio 0.35, 482 attacker casualties vs 102, RS loses 2 tanks + 1 artillery and RBiH **captures** 3 tanks + 2 artillery.
- Drina Corps mounts **four operations in 188 weeks**, last starting **t41**. Nothing t49→t188.
- **RS's last combat capture anywhere on the map is t73.** Zero after t100. Every RS operation from t105 records `attacks=0, outcome=failure`. In 1995 RS gains ground by eleven `event` writes and three `consolidation` writes — **it does not fight for any of it.**

**This corrects project memory:** `frozen_vrs_front_probe_root_cause` records the wall at w101. Measured at cell level it is **t73**.

**And `srebrenica_demilitarized` is a fire receipt, not an outcome** — the same defect one link up the chain, and cleaner. `srebrenica_demilitarization_1993` offers RBiH three options including `refuse` ("keep the enclave armed"); the flag sits in the row's **top-level** `sets_flags`, **none of the three options carries it**, and `applyDefinitionFlags` runs at fire time before the options branch. The player refuses and the flag is set anyway. Its own gate is vacuous too: `rbih_state_identity ∈ {civic, bosniak_national, pragmatic}` against an event that fires turn 2-5 unconditionally with exactly those three options — **the OR covers the entire value space.**

**Two canon claims are false in code:**
- `contain_posture_gate.ts` claims the fall flows through the scripted events **AND** Krivaja-95/Stupčanica-95. **The AND is false.** Krivaja is gated on `srebrenicaFallReceiptFired` at t≥170; the event fires t162. It launches onto ground the event already took and produces no AAR at all. `enclave_resilience.ts` states the true version — the two comments contradict.
- **Canon Ring 3 #10 describes a mechanic the engine does not have.** *"The player can only keep the enclave intact through ordinary military means"* — there is no ordinary military contest at Srebrenica for either side. Keeping it requires nothing; taking it is impossible.

### The question now upstream of everything

`srebrenica` **is** in RS's `DRINA_VALLEY` offensive objectives (`bot_strategy.ts:95-101`, `:203`). The contain posture is DEFAULT-OFF. The release backstop fires unconditionally at t≥160. **And still 0 of 599 battles land there.**

**Why does the VRS never attack an enclave that sits on its own target list?** Engine flagged this as upstream of the entire lane and did not chase it. It is the next thing to answer.

### Traps recorded for whoever implements a tenability gate

- `evaluateCondition` ends in **`default: return true`** — a typo'd condition kind passes silently, producing a vacuous gate with no error.
- `pressure_system.ts:29,48` call `evaluateCondition` **without `edges`**, so `corridor_severed` evaluates false on the accumulation path and would **silently disable the event entirely**.
- `enclave_supply_status` matches if ANY OSID is at-or-worse, and `adequate` is severity 0 — the obvious predicate is vacuous.
- **`zepa_falls_1995` carries `requires_events: ["srebrenica_falls_1995"]`.** Making Srebrenica conditional silently makes Žepa conditional and breaches the guard twice. Least visible dependent, most dangerous.
- `HistoricalEpochOsidAnchor` has **no `xor_with`** — the event anchor has an escape hatch, the OSID anchor does not. Blocking either way.
- At t188 all 13 Srebrenica cells read supply `adequate`; **t160 was not measurable** from existing artifacts. That measurement gates predicate choice — gate on `critical` while the enclave reads `adequate` and an unconditional fall becomes an unconditional NON-fall.

### Sequence the panel converged on

1. **Get the baseline green.** `verify_checkpoints.cjs` exits 1 today — `op:kalesija:gojcin_2` plus an unflagged **FARZ P-A** failure (`op:lukavac:brijesnica_donja_2` taken t57, ~100 weeks before the t≥160 window).
2. **Diagnose the post-t73 RS capability collapse** — why the VRS stops fighting, and why it never attacks a target on its own list.
3. **Only then** consider making the fall consult the board — cheap, possibly zero production LOC, no bright-line crossing.

Removing the flip's unconditionality before (2) does not make the outcome emergent. It makes Srebrenica never fall.

### Also worth adopting regardless (Canon)

H1.8 amended to say it governs *cause*, not *certainty*; `VICTORY_AND_PYRRHIC_SCORING.md` §6 Non-Goal #3 made outcome-constant; the `contain_posture_gate.ts` and `verify_checkpoints.cjs` comment corrections; `srebrenica_falls_1995` has **no `family` field**, so the Ring-3 validator does not protect the most sensitive row in the game; and both gate docs self-assert Tier-2 rank while appearing in neither stated hierarchy.

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
471db488caa5  [medium] Decision `us_halts_federation_advance_1995` has no authored historical default
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
