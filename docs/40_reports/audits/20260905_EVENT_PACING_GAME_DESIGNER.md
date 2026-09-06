# Event Pacing — Game Designer Assessment

**Seat:** Game Designer | **Date:** 2026-09-05 | **Scope:** design assessment only, no code or data changed.
**Evidence basis:** the brief's measured 188w run figures (independently verified by the scenario-tester seat) plus my own independent catalog measurements, marked MEASURED-HERE below where I re-derived or corrected a number.

---

## Executive summary

Three findings change the shape of the brief's question.

1. **There IS a written cadence target — it is structural, not per-week, and the data inverts it.**
   `docs/plans/2026-03-21-emergent-event-system-design.md` §6.2 (lines 182-186) specifies **~30% one-shot / ~40% recurring-escalating / ~30% recurring-deteriorating** — i.e. **70% of events should recur**. The catalog is **100% one-shot, 0% recurring**. `Rulebook_v0_9_0.md` §17.5 line 567 carries the same requirement as canon.

2. **The 12 presidential gestures are NOT one-shot in the shipped game.** All 12 carry an `action_cadence` block (`max_fires` 5-8, `cooldown_turns` 8-10) that a **real, validated, deliberately-separate** contract consumes on the desktop player-action path. Nine of twelve are repeatable there. Three — `strategic_posture_review_{rbih,rs,hrhb}` — carry the config and have **no handler anywhere in `src/`**. The headless run can never show any of this.

3. **The dead flag layer is one missing pipeline step, not 66 bad events** — and fixing it adds almost no player decisions.

The single highest-priority defect for D2 is the unreachable ending, and it has **two** independent blockers, not the one the brief names.

---

## Q1 — Is there a written target cadence?

**A per-week number: NOT WRITTEN DOWN.** I searched `docs/10_canon/`, `docs/30_planning/`, and `docs/plans/` for cadence/pacing/events-per-turn language. No document states a target events-per-week or decisions-per-week figure for any period. (`docs/plans/2026-08-10-phase4-exhaustion-arc-repacing-design.md` uses "re-pacing" in the attrition-curve sense, not the event sense.)

**A written *structural* cadence target: YES, three of them — and all three are missed.**

| Written target | Citation | MEASURED-HERE actual |
|---|---|---|
| Event mix: **decision ~60% / consequence ~30% / forced ~10%** | `docs/10_canon/Game_Bible_v0_9_0.md` §21.1, lines 257-259 | **28.1%** decision (84 of 299 events carry `response_options`) |
| Recurrence mix: **~30% one-shot / ~40% escalating / ~30% deteriorating** | `docs/plans/2026-03-21-emergent-event-system-design.md` §6.2, lines 182-186 | **100% one-shot / 0% recurring** |
| "**Recurring decisions** — some events fire multiple times with escalating stakes. Options narrow as the player defers." | `docs/10_canon/Rulebook_v0_9_0.md` §17.5, line 567 (**canon**, Tier 4) | 0 events use `recurrence`; 11 of the 12 that carry `action_cadence` use `escalation: 'static'` |

Per-file decision counts (MEASURED-HERE):

| File | events | with `response_options` |
|---|---|---|
| `war_1992.json` | 34 | 11 |
| `war_1992_hrhb_summer.json` | 5 | 5 |
| `war_1993.json` | 70 | 35 |
| `war_1994.json` | 25 | 17 |
| `war_1995.json` | 30 | 11 |
| `consequences.json` | 135 | 5 |
| **total** | **299** | **84 (28.1%)** |

**Status caveat, stated honestly:** the 2026-03-21 design doc is headed *"Historical plan: Do not execute directly"* and *"SUPERSEDED for implementation details by `docs/plans/2026-05-24-...`"*. Its §6.2 percentages are therefore **design intent, not canon**. But the requirement itself survives supersession, because `Rulebook_v0_9_0.md` §17.5 line 567 restates it in a live canon document, and `event_loader.ts:424-425` + `RecurrenceConfig` (`event_types.ts:695-698`) show the engine was built to it.

**One more written control worth naming, because of what it reveals:** every pacing mechanism in the codebase is a **ceiling**. `MAX_EVENTS_PER_TURN = 4` (`evaluate_events.ts:39`); `mutex_group` same-turn suppression (Rulebook §17.5 line 569); the notification cap of 5/turn (`docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md` line 401). **There is no floor anywhere.** Nothing in the system guarantees that any week has content. That is the architectural reason the drought exists: the system was designed against crowding, and crowding turned out not to be the problem — `MAX_EVENTS_PER_TURN` bound exactly once in 188 weeks.

---

## Q2 — Is 70% zero-decision weeks a defect, or correct for the thesis?

**It is a defect — but a narrower and different one than "no agency", and the headline number is not where the defect lives.**

### First, a correction to the framing

132 zero-decision weeks is not 132 weeks in which the president can do nothing. Every one of those weeks the player still has the **five presidential levers** (`Rulebook_v0_9_0.md` §1 and §17.3 item 3; `Game_Bible_v0_9_0.md` §21.5 — all five SHIPPED 2026-06-01) and the **six tactical levers** (`PLAYER_TURN_GUIDE.md` §4). The turn is not empty. What is empty is the **event layer specifically**.

That distinction is the whole argument, because canon says what the event layer is for:

> "The event system is a **metagame layer on top of the military simulation**. The map is where brigades fight; **the events are where the war is won or lost**."
> — `docs/plans/2026-03-21-emergent-event-system-design.md` §1

> "Events are the **primary vehicle** for political and strategic dynamics."
> — `docs/10_canon/Game_Bible_v0_9_0.md` §21.1, line 255

So: in 132 of 188 weeks, the layer canon calls *primary*, and where canon says *the war is won or lost*, is absent. That is a defect on canon's own terms, not on genre convention.

### Where the line sits between constrained agency and no agency

Canon draws it, in `Rulebook_v0_9_0.md` §17.4 "General Principles":

- "**No total control:** Orders may be degraded by command friction, supply shortages, or low cohesion."
- "**Incomplete information:** Fog of war limits what the player sees."
- "**Consequences accumulate.**"

Every one of those describes a player who **acts and is disappointed**. Constrained agency in AWWV is defined as *the act that fails, costs, or arrives too late* — not as *the absence of the act*. And `Game_Bible_v0_9_0.md` §21.1 line 258 makes the point explicitly for the event layer: "Decision events... **Every option costs something.**" The costing happens inside the choice.

**The line, stated as a rule:** constrained agency requires a choice that disappoints. It cannot be delivered by a turn with no choice. A silent week does not communicate powerlessness — it communicates that nothing is happening, which in the Bosnian War is historically false and thematically inert. Powerlessness is *"you may airdrop to Goražde or to Srebrenica, not both"*; it is not *"no card this week"*.

The stated player-experience direction is **"authorship of the tragedy"**. Authorship requires authored acts. You cannot hold a player responsible for 35 weeks in which you never asked them anything.

### Verdict

70% is at or just past the top of a defensible band — but **the aggregate is not the defect**. The defect is the *distribution*: a 21-week and a 13-week decision drought (w139-159, w161-173) covering the period that contains Srebrenica, Žepa, Deliberate Force and Storm, and a campaign that ends on five silent weeks.

A game whose thesis is exhaustion is entitled to quiet weeks. It is not entitled to be quietest exactly where the history is loudest. **Fix the shape, not the percentage.** If the aggregate stayed at 65-70% but no drought ran past six weeks and the endgame were the densest stretch in the campaign, I would sign this off.

---

## Q3 — Is the decaying decision curve backwards?

**Yes — and it is authored, not emergent. Two of the three sub-claims are stronger than the brief states.**

### 3a. The 1994 "peak" is a one-time bolus, not a peak

MEASURED-HERE: the 12 presidential-gesture events in `war_1993.json` all carry `trigger.turn_min: 84`, no `turn_max`, and all 12 carry `response_options` (3-5 options each). They fire w89-97 — inside the 1994 window. Strip them from the brief's measured 1994 count of 25 and 1994 has roughly **13** genuine decisions, not 25.

So the real curve is not `19 → 22 → 25 → 7`. It is approximately `19 → 22 → 13 → 7` with a **+12 spike in w89-97**. The campaign does not decay from a high plateau; it runs flat-to-thin throughout and then falls off a cliff once a one-time bundle is spent. That is a worse diagnosis than the brief's, and it means "1995 is under-authored relative to 1994" understates it — **1994 is also thin**, it just borrowed.

### 3b. The 1995 thinness is in the catalog, not the engine

MEASURED-HERE, `war_1995.json` — all 11 decision events by `turn_min`:

```
160 un_hostage_crisis_1995              (2 opts)
174 karadzic_mladic_split_1995          (2)
175 hv_hvo_cooperation_1995             (4)
175 rbih_late_war_offensive_1995        (4)
176 holbrooke_us_belgrade_channel_1995  (2)
178 deliberate_force_rs_compliance_1995 (2)
182 us_halts_federation_advance_1995    (2)
183 holbrooke_ceasefire_demand_oct95    (2)
184 dayton_talks_begin_1995             (2)
190 rs_dayton_acceptance_1995           (2)  <- unreachable, see Q6
190 hrhb_dayton_acceptance_1995         (2)  <- unreachable, see Q6
```

**Weeks 145-159 contain zero authored decision events.** Not blocked, not suppressed by the cap — never written. The measured w139-159 drought is not an engine behaviour to debug; it is empty catalog space.

### 3c. The COHA ceasefire as a content vacuum — yes, this is a design miss

MEASURED-HERE: the entire w139-158 ceasefire window is covered by **two** authored events, both with **zero** response options:

- `coha_ceasefire_begins_1995` — `turn_min 139, turn_max 140`, `opts 0`, category `diplomatic`
- `coha_expires_1995` — `turn_min 156, turn_max 158`, `opts 0`, category `military`

The ceasefire is authored as a bracket around nothing.

This is a miss on canon grounds, not taste. A ceasefire is the one interval in which a president's political agency is *maximised*, because combat is frozen and politics is all that remains. `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` §5 enumerates exactly the material such an interval should carry — patron relationship arcs (line 183), negotiation capital, the international pressure arc (line 319), alliance history (line 318). None of it is authored into the window where the engine has helpfully cleared the board for it. Modelling a ceasefire as "combat stops and so does the game" inverts the relationship between the military and metagame layers that `Game_Bible` §21.1 asserts.

### 3d. The sharpest instance — routed, not recommended

`docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` §6 records two resolved design decisions (dated 2026-03-15):

> **item 4. Srebrenica — The central moral question.** "RS player faces a **decision event** at the Srebrenica operation. Historical path: ... Restraint path: occupy without massacre... The game never rewards the genocide, but shows it wasn't militarily necessary."
> **item 5. Operation Storm — Scripted trigger, player-influenced scope.** "As RS, player manages the retreat — pull back to defensible lines vs fight for every OSID."

MEASURED-HERE: `srebrenica_falls_1995` has **`response_options: []`**. `operation_storm_1995` has **`response_options: []`**. `zepa_falls_1995`, `srebrenica_column_breakout_1995`, `nato_deliberate_force_1995`, `federation_ground_offensive_1995`, `operation_mistral_2_1995`, `operation_sana_1995` — all zero options.

The two moments the endgame design names as the game's moral and dramatic peaks are authored as zero-choice consequences.

**I am flagging this and stopping.** Srebrenica/Žepa outcomes are event-owned per canon **H1.8** and sit inside §6 and the ENCLAVE GUARD, which are the Pyrrhic panel's to rule on (CLAUDE.md Sacred Rules; the 2026-03-21 plan header itself warns: *"Srebrenica/Žepa fall receipts are event-owned under the current Section 6 policy; do not infer a scripted-op or wholesale event-rebuild lane from this file"*). I am not proposing that a Srebrenica decision event be built. I am reporting that a resolved design decision and the shipped data disagree, and that the disagreement is on the game's central ethical claim. **Route to the panel (Historian + scenario-tester + Engine/systems + Red-team) as a canon-vs-data reconciliation question.** Note also that memory records Srebrenica currently falls by a hardcoded write at t162 with 0 of 599 battles ever targeting the enclave — so the panel is being asked about a mechanism that is already event-owned in a very literal sense.

---

## Q4 — Are the 12 gestures deliberate scarcity or an authoring default?

**Neither, and this is the finding that most changes the brief's picture. They are authored as repeatable; the repetition lives on a different code path than the one measured.**

### What the data actually says

MEASURED-HERE — all 12 gesture events carry an `action_cadence` block. They are **the only 12 events in the entire 299-event catalog that carry one** (`grep -c action_cadence` → 12 in `war_1993.json`, 0 in the other five files):

| Event group | `action_cadence` | pressure threshold | opts |
|---|---|---|---|
| `strategic_posture_review_{rbih,rs,hrhb}` | `max_fires: 8, cooldown_turns: 8, escalation: 'escalating'` | 11 | 4 |
| `visit_to_front_{rbih,rs,hrhb}` | `max_fires: 5, cooldown_turns: 10, escalation: 'static'` | 13 | 5 |
| `address_to_nation_{rbih,rs,hrhb}` | `max_fires: 5, cooldown_turns: 10, escalation: 'static'` | 13 | 4 |
| `decorate_a_unit_{rbih,rs,hrhb}` | `max_fires: 5, cooldown_turns: 10, escalation: 'static'` | 13 | 3 |

`action_cadence` is not dead metadata. It is validated on load (`event_loader.ts:377-386`, dispatched at `:427-428`), typed (`event_types.ts:532`, `ActionCadenceConfig`), and its doc comment states the separation deliberately:

> "Cap/cooldown metadata for a **player-initiated desktop action**. Kept distinct from `recurrence`: action handlers consume this contract." — `event_types.ts`, ~line 703

And handlers do consume it: `front_visit_contract.cjs:139-140`, `address_nation_contract.cjs:70-71`, `decorate_unit_contract.cjs:130-131`, driven by IPC in `electron-main.cjs` (`get-front-visit-availability` :2846 / `initiate-front-visit` :2874; `get-address-nation-availability` :2944 / `initiate-address-nation` :2968; `get-decorate-unit-availability` :3031 / `initiate-decorate-unit` :3054, with the cap/cooldown comments at :2869, :2916, :2943, :2965, :3007, :3028).

`evaluate_events.ts:121` documents the seam from the other side: `once: true` seals the row against the natural queue *without coupling the evaluator to the desktop-only `action_cadence` contract*.

### Three consequences

1. **The brief's premise is half wrong, in the game's favour.** "After w97 the president can never visit the front or address the nation again" is true of the event stream and true of the measured headless run, and **false of the shipped desktop game** for 9 of the 12. A headless 188w `events_fired` count structurally cannot observe `action_cadence` firings. Any future pacing measurement must instrument the desktop action path separately or it will keep under-counting presidential agency.

2. **Three of the twelve are genuinely unfinished.** MEASURED-HERE: `grep -rn "strategic_posture_review" src/` returns **zero hits**. The three `strategic_posture_review_*` events carry `max_fires: 8, cooldown_turns: 8, escalation: 'escalating'` — the richest cadence config in the catalog, 4 options each, and the only `escalating` ones — and nothing consumes it. They fire once from the pressure queue and are sealed forever. This is plain unfinished wiring, and it is the one that would satisfy `Rulebook` §17.5's "escalating stakes" sentence.

3. **The scarcity is not deliberate design.** No doc specifies a one-shot cadence for these. The 2026-03-21 design §6.2 puts one-shot at ~30% and reserves it for "peace plans, treaties, foundational decisions" — a repeated presidential gesture is the *paradigm case* of the other 70%. Deliberate scarcity would look like `max_fires: 1` with a stated rationale; what is actually there is `max_fires: 5` with the recurring path wired for three of four groups.

### What stops "visit the front" being a free morale button

It already isn't, and the existing answer is the right one — it just needs finishing.

MEASURED-HERE, `visit_to_front_rbih` option `visit_sarajevo`: `morale_change +5`, `cohesion_change +3`, **`patron_pressure −3`**, plus `dimension_shifts` on `military_credibility +5` and `internal_cohesion +5`. The event's `staff_recommended_response_id` is **`stay_capital_rbih`** — the staff's advice is *don't go*. The narrative names the cost explicitly: "time away from Sarajevo, exposure to risk, and a political signal about which theater you prioritize." Every gesture is a choice between three fronts, and choosing one is declining the others.

So the cost model is: an opportunity cost between theatres, a patron cost, a 10-turn cooldown, and a hard cap of 5.

**What is missing is the negative-sum part, and it is one field.** Eleven of twelve use `escalation: 'static'` — the price does *not* rise with use. That is precisely what `Rulebook` §17.5 ("escalating stakes") and design §6.2 line 184 ("rewards increase... but costs increase too") require and do not get.

**Recommendation (DESIGN OPINION):** do not add cooldowns. Change `escalation` and implement option decay.

- Flip the nine `'static'` gestures to `'escalating'` (visits, addresses) or `'deteriorating'` (decorations — decorating units while the front rots should read as hollower each time).
- Implement `available_from_fire` / `unavailable_after_fire` on options — specified at design §6.3 lines 190-197, currently unimplemented. The fifth address to the nation should offer fewer and worse options than the first.
- Wire the three `strategic_posture_review_*` handlers.

The design principle: **a presidential gesture repeated is a president with nothing else left.** The fifth front visit should cost more, buy less, and be read by the Chronicle as a leader performing command rather than exercising it. That is the negative-sum answer, and it is a data change plus one option-availability feature, not new mechanics.

---

## Q5 — What do the wired-but-dark events cost, and should they be implemented or deleted?

**Implement. They are authored against a missing one-step state→flag bridge — not against fictional state. But they will not fix the pacing, and saying otherwise would misdirect the D2 lane.**

### Independent measurement (MEASURED-HERE, small delta from the brief)

Cross-checking every `flag_*` condition in all six catalog files against every `sets_flags` writer:

- 145 distinct flags referenced by `flag_*` conditions; 234 distinct flags written by `sets_flags`.
- **33 flags are read but never written** by anything.
- **71 events are gated on at least one unwritten flag** — 70 in `consequences.json`, 1 in `war_1993.json`.

The brief's figures (28 flags / 66 events) came from the scenario-tester filtered to never-fired events; mine counts all catalog references. Same finding, different boundary — I record the delta rather than assert a correction.

Largest offenders: `war_exhaustion_x100_{RBiH,RS}` (12 events each), `war_exhaustion_x100_HRHB` (10), `rbih_hrhb_war_active` (5), `turns_since_major_offensive_{RBiH,RS,HRHB}` (4 each), `cumulative_casualties_x100_*` (3 each), `patron_resist_streak*` (3+2+2), `post_dayton_phase` (3).

### The diagnosis the flag names give away

MEASURED-HERE — the condition **type** used to read them is `flag_at_least`, not `flag_equals`:

```
flag_at_least  war_exhaustion_x100_*            34 uses
flag_at_least  turns_since_major_offensive_*    12
flag_at_least  cumulative_casualties_x100_*      9
flag_at_least  patron_resist_streak*             7
flag_at_least  post_dayton_phase                 3
flag_at_least  major_operation_success*          3
```
Example: `csq_patron_pressure_resisted_streak` → `{"type": "flag_at_least", "flag": "patron_resist_streak", "min": 3}`.

These are **odometers**, not choice-flags. `_x100` is a fixed-point integer suffix. They are per-turn counters that project state the engine **already computes** — exhaustion, cumulative casualties, weeks since the last major operation, consecutive patron refusals, campaign phase.

Verified absence (per the narrow-lookup rule, checked against the bare names, not literal assignments): `grep -rn "war_exhaustion_x100\|turns_since_major_offensive\|patron_resist_streak\|post_dayton_phase" src/` returns **zero hits**. And there are only three writers of `event_flags` in all of `src/`: `evaluate_events.ts:168` (applies an event's own `sets_flags`), `negotiation/peace_plans.ts:514-515` (two literals: `war_ended_early`, `early_peace_implemented`), and `ui/map/desktop/campaignRecruitmentActions.ts:62`.

**So nothing was authored against state the engine cannot produce.** It was authored against a *projection* of state the engine produces every turn into `event_flags` as integers — a step that was specified (the whole point of `flag_at_least` existing as a condition type) and never written. This is roughly one deterministic pipeline step in the Aftermath band writing ~15 integer flags from existing fields.

### What it is worth, honestly

- **Not wasted content.** ~69 authored consequence events, each with real effects, plus the Cost Ledger and Dynamic Codex annotations that `Game_Bible` §21 implementation-notes (lines 438, 444) describe as consuming them.
- **Not a healthy conditional reserve.** A reserve is content held back by *game conditions*. This is held back by a *missing writer* — it cannot fire under any playthrough, which is the definition of dead, not reserved.
- **It is the mechanical substrate of a canon principle.** `Rulebook` §17.4: "**Consequences accumulate:** displacement, exhaustion, and international pressure compound over time." Those are exactly the three odometers that do not exist. The principle is canon; its instrument is missing.

**The correction that matters for sequencing:** of the 71 blocked events, **only 2 carry `response_options`** (MEASURED-HERE). This restores atmosphere, causal texture and Chronicle material. It adds **two** player decisions across 188 weeks. It is not a pacing fix, and it must not be sold into the D2 lane as one.

**Risk note:** firing ~69 new consequence events with real mechanical effects is a behavioural change with 188w calibration consequences. It goes through the one-change-per-run discipline with its own controlled run — not bundled — which is exactly why it competes badly for D2 schedule despite being good work.

**Delete nothing.** The 32 ahistorical branches correctly staying dark (`event_loader.ts:43-46`) are working as designed and are not part of this.

---

## Q6 — Target cadence profile, and what to fix first

### Recommended cadence profile (DESIGN OPINION, stated as such)

| Period | weeks | total events/wk now | target | decisions/wk now | target | max tolerated zero-decision run |
|---|---|---|---|---|---|---|
| 1992 w1-40 | 40 | 1.25 | 1.2-1.4 (hold) | 0.48 | 0.5 (hold) | 4 |
| 1993 w41-92 | 52 | 1.12 | 1.1-1.3 (hold) | 0.42 | 0.5 | 5 |
| 1994 w93-144 | 52 | 0.79 | 0.9-1.1 | 0.48 nominal / **~0.25 real** (see Q3a) | 0.4 | 6 |
| 1995 w145-188 | 44 | 0.66 | **1.0-1.4** | **0.16** | **0.6-0.7** | **4** |

Concretely: **w139-188 should carry roughly 30 player decisions, not 7.**

**The rule matters more than the numbers.** Two constraints, in priority order:

1. **No decision drought longer than 6 weeks, anywhere.** The current 21-week and 13-week droughts are the defect; the 70% aggregate is not.
2. **Drought length must fall as the campaign advances.** The endgame gets the shortest gaps. Right now the ordering is exactly inverted.

I deliberately do **not** recommend raising the aggregate much. 1992-93 are close to right. This is a redistribution, and most of the redistribution is authoring 1995 content — cheap, no engine work, no calibration risk.

**Architectural note for whoever implements:** every existing control is a ceiling (`MAX_EVENTS_PER_TURN = 4` at `evaluate_events.ts:39`, `mutex_group`, the 5/turn notification cap). Nothing is a floor. If a floor is ever built, build it as *authoring coverage validated at load* — "no 6-week window in the catalog lacks a reachable decision for each faction" — **not** as a runtime "if quiet, fire something" mechanism. The latter would be a railroad and would violate `Game_Bible` §21.1's "they emerge from game state conditions" and the emergent-not-railroads rule.

### Ranking for D2

**1. Unreachable Dayton ending — FIX FIRST, and there are TWO blockers, not one.**

The brief names the one-line `flag_not_set` key-presence bug. There is a second, independent one:

- MEASURED-HERE: `rs_dayton_acceptance_1995` and `hrhb_dayton_acceptance_1995` both have `trigger.turn_min: 190`.
- MEASURED-HERE: `data/scenarios/apr1992_definitive_188w.json` declares `"weeks": 188`. So does `apr1992_definitive_188w_dayton_close.json`.

**Turn 190 > 188. Two of the four Dayton events cannot fire in any 188-week run even after the flag bug is fixed.** (Historically consistent — w190 from an early-April-1992 start lands in December 1995, and Dayton was signed 14 Dec 1995. The scenario stops two weeks short of its own ending.) Either extend the D2 scenario to ~w194 or move those two `turn_min` values; verify `dayton_signed_1995` (`turn_min 184`, requires `dayton_talks_begin_1995`) actually chains before declaring it fixed.

Rationale for first place: a campaign with no ending fails the playtest at the last click regardless of how good weeks 1-183 were, `VICTORY_AND_PYRRHIC_SCORING` is the entire deliverable of a playthrough, and the fix is one line plus one number. Highest value, lowest cost — it is not close.

**2. Endgame decision drought (w139-188) — the real pacing defect.**
Pure content authoring; no engine work, no calibration risk beyond what the new events' own effects carry. ~15-20 decision events across the COHA window and the post-Storm run-in. This is the defect a playtester will actually *feel*, and it is ranked second only because #1 is nearly free. Do the COHA window first (w139-159, currently zero authored decisions) — it is the largest single hole and the one with the clearest canonical content source (`ENDGAME_AND_NEGOTIATION_DESIGN.md` §5: patron arcs, negotiation capital, alliance history).

**3. One-shot gestures — cheapest structural win per unit of work.**
Wire the three missing `strategic_posture_review_*` handlers; flip the nine `'static'` escalation values; implement `available_from_fire` / `unavailable_after_fire`. This is the only item on the list that satisfies a sentence of live **canon** (`Rulebook` §17.5) rather than a plan doc, and it converts 12 spent one-shots into a standing presidential rhythm that costs more each time it is used. Pairs naturally with #2 — the gestures are the connective tissue between the authored 1995 set-pieces.

**4. Dead flag layer — good work, wrong quarter.**
High value for atmosphere and for `Rulebook` §17.4's "consequences accumulate", one pipeline step. But it delivers **2 decisions out of 71 events**, and it is the only item here with genuine 188w calibration risk, so it needs its own controlled run under one-change-per-run discipline. That competes directly with the D2 schedule for the smallest pacing return of the four. Schedule it immediately *after* D2.

**5. Spike weeks — NOT A DEFECT. Do nothing.**
`MAX_EVENTS_PER_TURN` bound exactly once in 188 weeks (3 overflow entries at t96, refired t97). The two 7-event weeks are the correct shape for July 1995 and September 1995 — history spikes, and a simulation that flattened those spikes would be lying. Leave the cap at 4. Note that raising the floor per #2 will make the spikes *less* conspicuous by contrast, which is a further reason not to touch them.

**Separate track, not ranked:** the Srebrenica / Operation Storm design-vs-data divergence (Q3d) → **Pyrrhic panel**, as a §6 / enclave-guard canon-vs-data reconciliation. Not a D2 item and not mine to rule on.

---

## Evidence index

**Canon**
- `docs/10_canon/Game_Bible_v0_9_0.md` §21.1 lines 255-261 (event types, 60/30/10, pressure system); §21.5 (presidential command model)
- `docs/10_canon/Rulebook_v0_9_0.md` §17.4 lines ~541-547 (general principles); §17.5 lines 550-569 (decision events, recurring decisions, 4-event cap); §7.4 line 352 (condition types)
- `docs/10_canon/PLAYER_TURN_GUIDE.md` §1 (turn = one week), §3 (per-phase player surface), §4 (six tactical levers)
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` §6 Non-Goals lines ~305-313
- `docs/10_canon/FORAWWV.md` H2.4 line 169 (agency requires explicit orders)

**Design / planning**
- `docs/plans/2026-03-21-emergent-event-system-design.md` §1 (vision), §2 (player identity), §6.1-6.3 lines 166-197 (recurrence model, 30/40/30 mix, option decay)
- `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` §5, §6 items 3/4/5, §6b
- `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` lines 54, 237, 645
- `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md` line 401

**Code**
- `src/sim/events/evaluate_events.ts:39` (`MAX_EVENTS_PER_TURN`), `:110-131` (`canEventFire`, recurrence), `:121` (action_cadence seam comment), `:168` (`applyDefinitionFlags`), `:426`, `:560`, `:576`
- `src/sim/events/event_loader.ts:43-46` (ahistorical exclusion), `:377-386` (`validateActionCadence`), `:424-425` (once/recurrence exclusivity), `:427-428`
- `src/sim/events/event_types.ts:532` (`action_cadence` field), `:695-698` (`RecurrenceConfig`), ~`:703` (`ActionCadenceConfig` doc comment)
- `src/desktop/front_visit_contract.cjs:139-140`, `address_nation_contract.cjs:70-71`, `decorate_unit_contract.cjs:130-131`
- `src/desktop/electron-main.cjs:2846, 2869, 2874, 2916, 2941-2944, 2965, 2968, 3007, 3027-3031, 3054`
- `src/sim/negotiation/peace_plans.ts:514-515`

**Data**
- `data/scenarios/events/war_1993.json` (12 gesture events, the only `action_cadence` blocks in the catalog)
- `data/scenarios/events/war_1995.json` (30 events, 11 decisions, all reachable ones `turn_min >= 160`)
- `data/scenarios/events/consequences.json` (135 events, 5 decisions, 70 gated on unwritten flags)
- `data/scenarios/apr1992_definitive_188w.json` (`"weeks": 188`), `apr1992_definitive_188w_dayton_close.json` (`"weeks": 188`)
