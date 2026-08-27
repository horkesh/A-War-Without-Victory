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

**Leading hypothesis, being measured, NOT yet established:** player operations require
presidential authorization while bot operations do not, and the `historical` policy
accepted only 2 authorizations as RBiH against 19 as RS. If a faction's operations are
gated behind an authorization the player rarely grants, that faction fights less as
player — and everyone it would have fought loses fewer troops too, which would explain
the whole-war totals moving rather than just one side's.

This is the `Player/headless equivalence requires bound inputs, not matching labels`
guardrail: the labels match (both "historical"), the inputs do not.

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
