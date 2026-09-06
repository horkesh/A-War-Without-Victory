# Event-System Firing Saturation and Dead Catalog — Investigation

**Date:** 2026-09-05
**Trigger:** Owner observation — *"I noticed the 3 barracks events fire on the same week for some reason."*
**Scope:** Diagnostic only. **No code, data, or canon was changed by this investigation.**
**Status:** OPEN — findings recorded, routed, **no remediation performed**. Roadmap disposition ruled
(§10.3): **zero new plans, zero amendments**; simulation work is NO-GO until R7 closes.

> ### ⚠ READ IN THIS ORDER
> **§11 supersedes §4/D1 and §8.** The premise *"the campaign has no ending"* is **wrong**, and the
> one-line fix §8 recommends is a **gameplay regression**. §10 corrects §8's cost. Sections 1-9 are
> the original investigation and their measurements stand; their *conclusions about D1* do not.

**Seats convened (6):**

| Seat | Report | Contribution |
|---|---|---|
| Scenario-creator-runner-tester | [audits/…_EVENT_SATURATION_SCENARIO_TESTER.md](audits/20260905_EVENT_SATURATION_SCENARIO_TESTER.md) | Verified every headline number; found the `flag_not_set` root cause and the same-turn-prerequisite proof |
| Historian | [audits/…_EVENT_TIMING_HISTORIAN_ADJUDICATION.md](audits/20260905_EVENT_TIMING_HISTORIAN_ADJUDICATION.md) | Derived the epoch; ruled w54 correct and w4/w14/w160 artifacts; the Ahmići ruling |
| Game Designer | [audits/…_EVENT_PACING_GAME_DESIGNER.md](audits/20260905_EVENT_PACING_GAME_DESIGNER.md) | Located the written cadence targets; corrected the one-shot-gesture premise |
| Game Designer (reconciliation) | [audits/…_EVENT_PACING_DESIGNER_RECONCILIATION.md](audits/20260905_EVENT_PACING_DESIGNER_RECONCILIATION.md) | **Withdrew its own rate target** against locked §6.1; proposed the sourced-candidate coverage ledger |
| Product Manager | [audits/…_EVENT_ROADMAP_FIT_PM_RULING.md](audits/20260905_EVENT_ROADMAP_FIT_PM_RULING.md) | Routing table; **corrected §8's cost**; zero new plans; NO-GO before R8 |
| Scenario-tester (ending) | [audits/…_EVENT_DAYTON_ENDING_ADJUDICATION.md](audits/20260905_EVENT_DAYTON_ENDING_ADJUDICATION.md) | **Overturned D1's premise**; found the trap in the obvious fix |

---

## 0. Evidence base and how to reproduce

**Primary run:** `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/weekly_report.jsonl`, field
`events_fired` (per-week array of `{id, text}`), key `week_index`, 188 rows.

> ### ⚠ PROVENANCE CAVEAT — added 2026-09-06, after the fact
>
> **`n390` is not an admissible calibration baseline, and this report should not have used it without
> checking.** Two defects, both discovered only when a later run forced a provenance comparison:
>
> 1. **Node major.** `n390` was produced on **Node v24.13.0**. The repo pins **22** (`.nvmrc`), and
>    `run_scenario_with_preflight.ts` now *refuses to start* on a mismatched major, because the sim
>    calls implementation-approximated `pow/exp/log/atan2` in combat hot paths and a different V8
>    major can move a result by a final bit — enough to flip a battle.
>    `CALIBRATION_MASTER.md` already recorded `n374` as inadmissible for exactly this reason; `n390`
>    has the same defect and nobody had noticed.
> 2. **Off mainline.** `n390`'s commit `4b4e8e388` is **not an ancestor of HEAD** (verified with
>    `git merge-base --is-ancestor`) — its branch was re-landed under new SHAs. The declared canonical
>    baseline is **`n388`** (`CALIBRATION_MASTER.md:88-104`, commit `3474df2e0`, Node v22.23.2, clean
>    tree), and n390's merge-base with HEAD *is* that commit. This report treated the off-mainline run
>    as authoritative and the real baseline as unknown.
>
> **What this does and does not invalidate.** Every figure in §§1-5 is a **structural count** — how many
> events fired, in which weeks, gated on what — and each was independently reproduced across **six 188w
> runs with different scenario hashes** (§0). Counts of that kind do not turn on a final-bit combat
> difference, so the findings stand. But they were taken on a run the project's own gate would reject,
> and the check that would have caught it costs one line. **Any future work here should re-derive from
> `n388` or a successor, not from `n390`.**
Supporting: `final_save.json` (`military.event_flags`, `military.event_causality_log`,
`military.event_decision_log`, `political.political_controllers`), `initial_save.json`.

**Catalog:** 299 event definitions, loaded by `src/sim/events/event_loader.ts:48-60` from
`data/scenarios/events/` — `war_1992.json` (34), `war_1992_hrhb_summer.json` (5), `war_1993.json` (70),
`war_1994.json` (25), `war_1995.json` (30), `consequences.json` (135).

One event fires from outside the catalog: **`graz_accords`**, hardcoded at
`src/sim/turn_phases/war_phases.ts:1062-1066` and pushed directly into `result.fired`. It is therefore
invisible to every catalog-coverage metric. Reconciliation: 178 unique ids fired = **177 catalog
events + `graz_accords`**; 177 + 122 never-fired = 299. ✅

**Cross-run stability (MEASURED).** Six 188w runs with *different* scenario hashes:

| | firings | empty weeks | max events in a week |
|---|---|---|---|
| range across six runs | 175-178 | 82-86 | 7-8 |

The pattern is **structural, not seed-specific**. Nothing in this report is an artifact of one run.

**Regeneration.** All per-week and per-catalog figures below are derived by reading `events_fired`
out of `weekly_report.jsonl` and joining against the six catalog files on `id`. No tooling was added.
The intermediate join was written to a session scratchpad and is not committed; it is reproducible in
one pass from the two sources named above.

---

## 1. Headline: the system's failure mode is silence, not noise

The 178-firings figure counts **notifications**. The only load a player feels is a **decision event** —
one with a non-empty `response_options` array (`isPlayerDecisionEvent`, `evaluate_events.ts:49-51`).

| | catalog | fired in 188w |
|---|---|---|
| player-decision events | 84 / 299 (28%) | 73 |
| auto / flag-setter events | 215 / 299 | 105 |

**Events per week**

| events in week | 0 | 1 | 2 | 3 | 4 | 5 | 7 |
|---|---|---|---|---|---|---|---|
| weeks | **84** | 58 | 33 | 7 | 1 | 3 | 2 |

**Player decisions per week**

| decisions in week | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| weeks | **132** | 44 | 9 | 1 | 2 |

**70% of the campaign asks the president to decide nothing.**

`MAX_EVENTS_PER_TURN = 4` (`evaluate_events.ts:39`) applies only to decision events; auto/flag-setters
bypass it by design (`:546-576`). It **bound exactly once in 188 weeks**: `event_causality_log` holds
three `overflowed` entries, all at t96 (`decorate_a_unit_rs`, `visit_to_front_hrhb`,
`visit_to_front_rs`), which then fired at t97. Zero `mutex_suppressed`. **The cap is not the problem
and tuning it is a no-op.**

**Architectural note (Game Designer).** Every pacing control in the codebase is a **ceiling** —
`MAX_EVENTS_PER_TURN`, `mutex_group`, a notification cap of 5. There is **no floor anywhere**. The
system was built against crowding; crowding was never the problem.

---

## 2. Density decays across the war — and the true curve is worse than it looks

| Period | weeks | firings | per week | empty weeks | **decisions** |
|---|---|---|---|---|---|
| 1992 (w1-40) | 40 | 50 | 1.25 | 28% | 19 |
| 1993 (w41-92) | 52 | 58 | 1.12 | 37% | 22 |
| 1994 (w93-144) | 52 | 41 | 0.79 | 58% | 25 |
| 1995 (w145-188) | 44 | 29 | 0.66 | 55% | **7** |

**The 1994 "peak" of 25 is borrowed.** All 12 presidential-gesture events carry `turn_min: 84`, all
carry `response_options`, and all fire w89-97. Strip them and 1994 has ~13 real decisions. The true
decision curve is **19 → 22 → 13 → 7 with a +12 one-time bolus** — flat-and-thin, then a cliff.

**Decision droughts ≥8 weeks:** w57-64 (8), w130-137 (8), **w139-159 (21)**, **w161-173 (13)**.
Weeks 139-173 contain **exactly one** player decision (`un_hostage_crisis_1995`, w160) across 35 weeks —
nine months of 1995 as a spectator sport.

**Event-firing droughts ≥3 weeks:** w31-34 (4), w41-43 (3), w84-86 (3), w91-93 (3), w107-109 (3),
w112-116 (5), w124-128 (5), w132-134 (3), w140-144 (5), **w146-155 (10)**, w184-188 (5).

**w145-159 has zero authored decision events at all** — all 11 decisions in `war_1995.json` sit at
`turn_min ≥ 160`. That drought is not engine behaviour; it is an empty catalog.

The COHA window w139-158 contains **exactly two authored events, both with zero options**
(`coha_ceasefire_begins_1995` t139-140, `coha_expires_1995` t156-158): a ceasefire authored as a
bracket around nothing. `coha_active` is a hard combat gate at six sites
(`attack_resolution_osid.ts:531`, `bot_brigade_ai_osid.ts:880`, `frontline_attrition.ts:209`,
`sector_offensive.ts:1198` and `:1734`, `tactical_group_lifecycle.ts:424`), so freezing combat is
correct — but the Game Designer's ruling is that a frozen front is when a president has the **most**
to decide, and modelling the ceasefire as a content vacuum rather than a political interval is a
design miss, not a fidelity win.

---

## 3. There is a written cadence target, and the catalog inverts it

| Source | Target | Measured | Verdict |
|---|---|---|---|
| `Rulebook_v0_9_0.md:567` (§17.5) | *"Recurring decisions — some events fire multiple times with escalating stakes. Options narrow as the player defers."* | 0 events use `recurrence`; 11 of the 12 `action_cadence` events use `escalation: "static"` | **MISSED** |
| `Game_Bible_v0_9_0.md:257` (§21.1) | *"Decision events (~60%)"* | 84 / 299 = **28%** | **MISSED** |
| `docs/plans/2026-03-21-emergent-event-system-design.md §6.2:182-186` | ~30% one-shot / 40% recurring-escalating / 30% recurring-deteriorating | **100% one-shot** | **MISSED** |

No per-week numeric cadence target is written down anywhere.

**Caveat carried from the Game Designer:** the 2026-03-21 plan is headed *"Historical plan /
SUPERSEDED for implementation details"*, so its percentages are intent, not canon. The requirement
survives as live canon via `Rulebook §17.5`.

### 3a. The recurrence model exists in the engine and is unused by the catalog

**MEASURED:** all 299 definitions are `once: true`. Zero carry a `recurrence` field
(`once === false` count is 0; `once === undefined` count is 0). Yet the engine implements it fully:

- `evaluate_events.ts:110-131` — `recurrence.max_fires` and `recurrence.cooldown_turns` gating
- `event_loader.ts:424-425` — validates `once` and `recurrence` are mutually exclusive
- `event_types.ts:534, 695-698` — `RecurrenceConfig`

**Consequence:** the natural-event stream is a strictly finite one-shot budget of 299 items (177
reachable) spread over 188 weeks, so decaying density is **structurally forced**, not tunable by
conditions.

### 3b. CORRECTION — the presidential gestures are NOT one-shot in the shipped game

This was measured wrongly from a headless run first, and the error is recorded here because a headless
`events_fired` count **structurally cannot see the player-action path**.

All 12 gestures carry an `action_cadence` block — the only 12 in the 299-event catalog:

| Events | `max_fires` | `cooldown_turns` | `escalation` |
|---|---|---|---|
| `strategic_posture_review_{rbih,rs,hrhb}` | 8 | 8 | `escalating` |
| `visit_to_front_*`, `address_to_nation_*`, `decorate_a_unit_*` | 5 | 10 | `static` |

`action_cadence` is a distinct validated contract from `recurrence` (`event_types.ts:532`;
`event_loader.ts:377-386, 427-428`; the type comment reads *"Kept distinct from `recurrence`: action
handlers consume this contract"*), consumed by desktop player-action handlers —
`src/desktop/front_visit_contract.cjs:36-38`, `address_nation_contract.cjs:25-27`,
`decorate_unit_contract.cjs:48-50`, each mapping faction → event id, wired through
`electron-main.cjs`. `evaluate_events.ts:121` documents the seam explicitly.

**So 9 of 12 DO repeat** on the player-action path. **3 of 12 are genuinely dead:**
`strategic_posture_review_{rbih,rs,hrhb}` have no handler — the only reference anywhere in the repo is
a diagnostic, `tools/diagnostics/presidential_cadence_report.ts:44`. They carry the richest config
(8 fires, the only `escalating` ones) and nothing consumes it. **Unfinished wiring, not scarcity
design.**

The live gap against `Rulebook §17.5` is one field: 11 of 12 use `escalation: "static"`, so repetition
never costs more.

---

## 4. Defects

### D1 — The campaign has no ending. **BLOCKING for D2.**

The last 15 weeks of a full run:

```
w179  operation_mistral_2_1995, operation_sana_1995
w180  (none)      w181  (none)
w182  csq_arbih_resistance_revival_RS
w183  holbrooke_ceasefire_demand_oct95   <- last thing that ever happens
w184  w185  w186  w187  w188   (all empty)
```

**Two independent blockers, both required to fix:**

**(a) `flag_not_set` is a KEY-PRESENCE test, not a truthiness test.**

- Reader — `src/sim/events/event_types.ts:830-833`:
  ```ts
  case 'flag_not_set': {
      const flags = state.military.event_flags ?? {};
      return !(condition.flag in flags);
  }
  ```
- Writer — `data/scenarios/events/war_1995.json`, `coha_expires_1995` (fired w156) has
  `sets_flags: {"coha_active": false, "coha_expired": true}`. Writing `false` **inserts the key**.
- Consumer — `ceasefire_1995` (turn_min 181) is gated on `{"type":"flag_not_set","flag":"coha_active"}`.
- MEASURED in `final_save.json`: `military.event_flags.coha_active === false`, key **present**.

From w139 the key exists permanently, so `ceasefire_1995` can never fire, killing the chain three
deep: `ceasefire_1995` → `dayton_talks_begin_1995` (184) → `dayton_signed_1995` (184) →
`rs_/hrhb_dayton_acceptance_1995` (190), all bound by `requires_events`.

**Blast radius audit (MEASURED):** all 99 `flag_not_set` usages in the catalog were cross-referenced
against every flag any event writes as `false` (`coha_active`,
`joint_operations_agreement_active`, `svk_corps_active`). **Exactly one collision exists, and it is
`ceasefire_1995`.** For flags never written at all, absent and falsy agree, so nothing else moves.

*Do not fix by deleting the key.* `coha_active === true` is read at six combat sites (listed in §2);
deleting changes what those reads see. Fix the predicate.

**(b) Two Dayton events open beyond the scenario horizon.** `rs_dayton_acceptance_1995` and
`hrhb_dayton_acceptance_1995` both have `turn_min: 190`, while `apr1992_definitive_188w.json:6` and
`apr1992_definitive_188w_dayton_close.json:5` both declare `"weeks": 188`.

**Historian's horizon note:** Dayton was initialled 21 Nov 1995 = **w190**; Paris signing 14 Dec 1995 =
**w193**. If D2 means "play to Dayton", the horizon needs **≥190**, not 188.

**Validation caveat:** per the 188w rule, verify on 188w — a 40w run cannot see w181 at all.

### D2 — Endgame decision drought w139-188

Pure authoring, no engine work. See §2. Target ~30 decisions in w139-188 rather than 7.

### D3 — Two windows dead by construction

**`nato_ultimatum_sarajevo_1994`** has `turn_min == turn_max == 96` and `requires_events:
["markale_massacre_1994"]`, which fires *at* w96. `triggerMatches` (`event_types.ts:717-719`) reads
`state.military.fired_event_ids`, which is populated **by** the firing pass — so a same-turn
prerequisite can never be satisfied during candidate eligibility, and a one-turn window then closes
forever. It also takes `sarajevo_exclusion_zone_1994` (97-98) down with it.

**Proven, not inferred:** `rbih_nato_ultimatum_compliance_1994` has the *identical* prerequisite with a
96-98 window and **fired at w97**. One turn of slack is the whole difference.

**Recommended as a loader lint, not an instance fix:** any event with `turn_min == turn_max` **and** a
`requires_events` naming an event whose window opens on the same turn is dead by construction.

### D4 — 70 events read 32 flags that nothing writes

Three independent counts landed at 66/28, 71/33, and 70/32 — different counting boundaries, same
finding. The reconciled measurement, counting **data writers as well as code writers** (see the
correction in §6):

- 234 distinct flags **written** by the catalog (`sets_flags` / `set_flags`, at every nesting depth)
- 134 distinct flags **read** by trigger conditions
- **32 read but never written by catalog or engine**, gating **70 events** (69 in `consequences.json`,
  1 in `war_1993.json`)
- **None of the 32 appear in `final_save.json`'s `event_flags`** — confirming no code path writes them
  either

The 32: `alliance_low_water_mark_below_0_10`, `corps_reorganization_active_RS`,
`cumulative_casualties_x100_{RBiH,RS,HRHB}`, `gorazde_fallen`, `major_operation_success{,_HRHB,_RS}`,
`paramilitary_offensive_authorized`, `patron_resist_streak{,_RBiH,_HRHB}`, `peace_plan_acceptance_gap`,
`peace_plan_accepted`, `peace_plan_offered`, `post_dayton_phase`, `rbih_hrhb_war_active`,
`srebrenica_fallen`, `supply_route_open_grain_corridor{,_HRHB,_RS}`,
`turns_since_corridor_hostility{,_HRHB,_RS}`, `turns_since_major_offensive_{RBiH,RS,HRHB}`,
`war_exhaustion_x100_{RBiH,RS,HRHB}`, `zepa_fallen`.

**Diagnosis (Game Designer, sharper than a bare coverage count):** they are read with `flag_at_least`
(`war_exhaustion_x100` 34 uses, `turns_since_major_offensive` 12, `cumulative_casualties_x100` 9,
`patron_resist_streak` 7). These are **odometers** — per-turn integer counters projecting state the
engine *already computes*. Nothing was authored against fictional state; **a projection step was never
built**. The only writers of `event_flags` in `src/` are `evaluate_events.ts:168` (copying event
`sets_flags`), `peace_plans.ts:514-515`, and `campaignRecruitmentActions.ts:62`, and none writes any of
the 32.

**Critical sequencing caveat:** of the 70 blocked events **only 2 carry `response_options`**.
Implementing the projection adds **two decisions in 188 weeks**. It is atmosphere and
`Rulebook §17.4` "consequences accumulate" — **not a pacing fix, and it must not be sold into D2 as
one.** It is also the only item here with real 188w calibration risk (~69 new consequence firings with
live effects) and needs its own controlled run.

**Precedent to extend, not reinvent:** `src/sim/codex/observer_threshold_flags.ts:1-16` documents
exactly this pattern for two *other* flags — *"gate on a single positive flag each that no upstream
system currently writes (verified: zero writers in src/ + data/scenarios/events/), so the entries are
wired-but-dark"* — and is `ENABLE_OBSERVER_THRESHOLD_FLAGS = false` at `:51`, covering only
`equipment_quality_collapsed` / `negotiation_capital_exhausted`. It produces none of the 32.

> **Path correction (2026-09-05, PM review):** this file was first cited as
> `src/sim/events/observer_threshold_flags.ts`. **That path does not exist.** It is under
> `src/sim/codex/`.

### D5 — What is *correctly* dead: do not touch

Of the 110 never-firing `consequences.json` rows, **32 are ahistorical branches correctly staying
dark**. `event_loader.ts:43-46` states this outright: they are *"gated on ahistorical flags —
calibration-safe by construction since they literally cannot fire on the historical path."*
E.g. `csq_minority_defections_1992` and `csq_bosniak_unity_1993` both need
`rbih_state_identity == "bosniak_national"`; `csq_accelerated_camps_discovery_1992` needs
`rs_strategic_goals == "aggressive"`. The flags **are** written; the bot takes the historical option.
That is the free-war model functioning. **Firing them would break calibration.**

Also leave alone: `us_halts_federation_advance_1995`, a near-miss on an area threshold
(`faction_area_ratio RS at_most 0.51`, read area-weighted at `event_types.ts:978-988`) that moves with
the calibration floor. Fitting content to a number that is still moving is the error, not the miss.

---

## 5. Historical adjudication of the clusters

**Epoch derived, not assumed.** `src/scenario/scenario_runner.ts:1963` sets
`scenario_start_date = {1992, month: 3, day: 6}`, month 0-indexed (`seasonal_effects.ts:123`) →
**6 April 1992**. Therefore **week N = floor((date − 6 Apr 1992) / 7) + 1**. Validated against five
pinpoint (`turn_min == turn_max`) catalog rows — VOPP w39, UNSCR 819 w54, UNSCR 824 w57, Markale I w96,
Storm w174 — **all five exact**.

| Cluster | Verdict |
|---|---|
| **w4 — four Barracks** | **ARTIFACT.** Real span w3→w9, and four *different kinds* of event: Visoko seized 26 Apr (w3); Sarajevo blockade/Dobrovoljačka 2-3 May (w4); Tuzla Brčanska Malta **ambush of a column withdrawing under agreement** 15 May (w6); Zenica **negotiated evacuation, no shot** 18 May (w7); Viktor Bubanj 24 May (w7); last JNA out of Sarajevo 5 Jun (w9). |
| **w14 — Prijedor + 3 camps** | **ARTIFACT, twice.** w14 = 6-12 Jul 1992; nothing here is July. Prijedor takeover 30 Apr = **w4** (10 weeks late); camps ~24-25 May = **w8** (6 weeks late; ICTY *Kvočka* charges 26 May – 30 Aug 1992). They are 4 weeks apart, not simultaneous — and the causal middle, **Kozarac 24-26 May (w8)**, is absent from the catalog entirely. Collapsing takeover onto camps deletes why the camps existed. |
| **w54 — mid-April 1993** | **CORRECT COMPRESSION. DO NOT TOUCH.** w54 = 12-18 Apr 1993 and all six genuinely land in it: Ahmići 16 Apr, Trusina 16 Apr, UNSCR 819 16 Apr, UNSCR 820 17 Apr, Sovići/Doljani 17 Apr, Srebrenica demilitarization 18 Apr. The real hinge week of the war. |
| **w160 — 1995** | **ARTIFACT: a shared floor masquerading as a cluster.** Tuzla Kapija and the hostage crisis are 25-26 May = **w164** (4 weeks early, and correctly co-located *with each other* — the VRS shelled Tuzla the same day as the first Pale strike and took the 377 hostages next day). But binding those to the same `turn_min` as July is wrong: **Srebrenica falls 11 Jul = w171** (fired w162, **9 weeks early**); column 12 Jul = w171 (fired w163); **Žepa 25 Jul = w173** (fired w164, 9 weeks early). |

Also: the `graz_accords` hardcode comments *"fires at week 4 (6 May 1992)"* — 6 May 1992 is **week 5**
under the engine's own epoch.

### 5a. Corrected `turn_min` table (Historian; not applied)

| Event id | Current | **Corrected `turn_min`** | Suggested `turn_max` | Real date |
|---|---|---|---|---|
| `battle_of_the_barracks_visoko` | 4-6 | **3** | 4 | 26 Apr 1992 |
| `battle_of_the_barracks_sarajevo` | 4-6 | **4** | 9 | 2 May – 5 Jun 1992 |
| `battle_of_the_barracks_tuzla` | 4-6 | **6** | 7 | 15 May 1992 |
| `battle_of_the_barracks_zenica` | 4-6 | **7** | 8 | 18 May 1992 |
| `graz_accords` (hardcode) | wk 4 | **5** | — | 6 May 1992 |
| `prijedor_takeover_1992` | 14-30 | **4** | 6 | 30 Apr 1992 |
| *(new)* `kozarac_attack_1992` | — | **8** | 9 | 24-26 May 1992 |
| `omarska_camp_1992` | 14-30 | **8** | 10 | ~25 May 1992 |
| `keraterm_camp_1992` | 14-30 | **8** | 10 | ~24 May 1992 |
| `trnopolje_camp_1992` | 14-30 | **8** | 10 | ~24-25 May 1992 |
| `concentration_camps_revealed_1992` | 16-30 | 17 (optional) | 19 | 2-6 Aug 1992 |
| **w54 cluster (all six)** | 54- | **NO CHANGE** | — | 16-18 Apr 1993 |
| `tuzla_gate_massacre_1995` | 160-160 | **164** | 164 | 25 May 1995 |
| `un_hostage_crisis_1995` | 160-163 | **164** | 167 | 25 May – 18 Jun 1995 |
| `srebrenica_falls_1995` | 160-185 | **171** | 172 | 11 Jul 1995 |
| `srebrenica_column_breakout_1995` | 160-190 | **171** | 173 | 11-16+ Jul 1995 |
| `zepa_falls_1995` | 160-190 | **173** | 174 | 25 Jul 1995 |

> **Historian's caution, carried forward unresolved:** narrowing `turn_max` on `srebrenica_falls_1995` /
> `zepa_falls_1995` touches the **ENCLAVE GUARD**. The *dates* are the recommendation; whether the
> windows may be tightened without risking a non-fall is the panel's call and must be measured before
> merge.

### 5b. Secondary drift found while validating — a systematic late-1994 early bias

| Event id | `turn_min` | True week | Error |
|---|---|---|---|
| `contact_group_plan_1994` | 117 | 118 | 1 early |
| `bihac_5th_corps_offensive_1994` | 129 | ~134 | 5 early |
| `operation_cincar_1994` | 131 | 135 | 4 early |
| `bihac_crisis_1994` | 135 | 138 | 3 early |
| `carter_ceasefire_1994` | 138 | 142 | 4 early |
| `coha_ceasefire_begins_1995` | 139 | 143-144 | 4-5 early |
| `coha_expires_1995` | 156 | 161 | 5 early |
| `operation_flash_1995` | 157 | 161 | 4 early |

`embargo_lifted_non_enforcement_1994` (136 vs 136) and the whole 1993 file are clean, so the bias is
localised to late-1994/early-1995 authoring. **It is itself a partial cause of the w140-144 drought:**
the events that belong there were placed 4-5 weeks earlier, vacating the window.

### 5c. Missing content by calendar window

| Window | Calendar | Missing (Historian) |
|---|---|---|
| w112-116 | 23 May – 26 Jun 1994 | A real post-Washington lull, mildly under-served. Contact Group **formation** (26 Apr 1994) is the one clear gap. |
| **w124-128** | 15 Aug – 18 Sep 1994 | **Highest value.** Velika Kladuša falls 21 Aug 1994, APWB abolished, ~30k Abdić supporters flee — the catalog *opens* the Abdić arc (w77, w80) and never closes it. RS Assembly rejects the CG plan 8 Aug; **RS referendum 27-28 Aug 1994, 96.65% No** — absent. UNSCR 942/943, 23 Sep. |
| w140-144 | 5 Dec 1994 – 8 Jan 1995 | Mostly self-inflicted — see §5b. |
| **w146-155** | 16 Jan – 26 Mar 1995 | **Best drought to fill:** every candidate is political, so the COHA combat freeze is undisturbed. UNPROFOR→UNCRO (UNSCR 981/982/983, 31 Mar 1995) is unrepresented anywhere in the catalog; Z-4 plan 30 Jan 1995; Croatia's UNPROFOR non-renewal. |
| w184-188 | 9 Oct – 12 Nov 1995 | **Not a content gap — a firing failure.** The 5 Oct 1995 ceasefire *is* catalogued (window 181-200) and never fires. See D1. |

**Correction to the dispatch brief:** the **Split Agreement is 22 July 1995 (w172), not March 1995**,
and it is absent from the catalog — causally load-bearing, since Summer '95, Storm and Mistral 2 all
fire with nothing explaining why Croatia entered Bosnia. No evidence was found of a distinct March 1995
Croatian-Bosnian military agreement.

---

## 6. Two items ROUTED TO THE §6 PANEL — not acted on

### P1 — `ahmici_massacre_1993` never fires in any playthrough

**The first diagnosis was wrong and is recorded here because the error is instructive.** It was
reported as blocked on a dead flag `hvo_arbih_tensions_rising`. **That flag is written** — by
`hvo_arbih_tensions_rise_1992` in `data/scenarios/events/war_1992.json` via `sets_flags`; it fires at
**w23** in this very run and reads `true` in `final_save.json`. The original check was `src/`-only, and
**event flags are written from data.**

**The real blocker is the other conjunct:** `faction_controls_municipality HRHB vitez ≥ 0.5`.

MEASURED from `political.political_controllers`, identical in `initial_save.json` and
`final_save.json`:

```
op:vitez:kruscica   = RBiH
op:vitez:preocica_3 = RBiH
op:vitez:vitez_2    = HRHB
```

Vitez has **three** OSIDs; HRHB holds **one**; Vitez appears in **none** of the run's control flips.
**1/3 = 0.333 < 0.5, constant from turn 1 to turn 188.** Ahmići is **arithmetically unreachable in
every playthrough** — an OSID-granularity artifact, not a flag bug. The gate encodes a map resolution
that does not exist. `turn_min = 54` is historically exact: **the date is right and the gate is wrong.**

**Historian's ruling:** this is an unsigned-off historical claim and needs **the standard §6 four**
(Historian + scenario-tester/calibration + Engine/systems + Red-team), *not* the broader eight —
nothing here crosses the bright line; it moves **toward** the stated thesis. Ahmići is the most
judicially documented crime of the Croat-Bosniak war (4 ICTY judgements, ~116 civilians). The catalog
fires **Trusina** (Bosniak-perpetrated, same day) and **Sovići/Doljani** (HVO territorial attack, next
day) but never the HVO-perpetrated massacre. The game does not assert Ahmići did not happen; it renders
mid-April 1993 **selectively complete in one direction, deterministically, every run** — and a
non-firing event leaves no trace in any artifact, so this has presumably been true of every campaign
ever run.

**Proposed fix shape (panel's to rule on):** fix the **gate, not the date** — threshold to 0.33
(matches map resolution and the fact the HVO held Vitez town), or re-target to the specific OSID
`op:vitez:vitez_2` (most faithful). **Do not delete the control condition** — that makes it a railroad.

**Also noted for the data lane:** `operational_initial_master.json` paints all three Vitez OSIDs HRHB,
but `hybrid_1992` init gives the runtime only one. Separate divergence, not investigated here.

### P2 — Srebrenica and Žepa fall two months early

Srebrenica falls in-game at w162 (mid-May 1995) against a true w171 (11 Jul 1995); Žepa w164 against
w173 (25 Jul 1995). The **ENCLAVE GUARD holds in letter** — the enclaves fall — but the campaign dates
the genocide before the Split Agreement and before the RRF was authorised. Consistent with the known
hardcoded write at t162 (`memory/srebrenica_fall_is_a_hardcoded_write.md`). Raised as a **second,
independent §6 item**, separate from the timing corrections in §5a.

### P3 — A commissioned sweep that nobody has run

`faction_controls_municipality` at `≥ 0.5` against **small-OSID municipalities** is a **defect class**,
not one row. One row was checked because one row was asked about. Any other event dead for the same
reason is another unexamined historical claim. **This sweep has not been run.**

### P4 — Flagged by the Game Designer, not ruled on

`docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md:339` records a **RESOLVED** decision that
Srebrenica is *"The central moral question"* with an RS *"decision event… Restraint path"*, and `:341`
gives Operation Storm *"Scripted trigger, player-influenced scope."*

MEASURED: `srebrenica_falls_1995`, `operation_storm_1995`, `zepa_falls_1995`,
`srebrenica_column_breakout_1995`, `nato_deliberate_force_1995`, `operation_mistral_2_1995`,
`operation_sana_1995` — **all have zero `response_options`.**

A resolved design decision and the shipped data disagree about the game's central ethical claim. This
is §6 / ENCLAVE GUARD / H1.8 territory. **The Game Designer explicitly declined to propose building a
Srebrenica decision event, and this report does not propose one either.** Routed as a canon-vs-data
reconciliation.

---

## 7. Relationship to prior closure

`docs/40_reports/implemented/20260508_V090_EVENTS_AUTHORING_SATURATION.md` declared the events-authoring
surface **"saturated at 121 events"** and assessed condition-kind utilization as *"healthy but
lopsided"*, counting `flag_at_least` at 80 uses (§118). **It measured authoring, never firing.** The
`flag_at_least` predicates it counted as healthy utilization are the same reads that D4 shows have no
writers.

That report *did* know about missing substrate — but only for a handful of specific named flags
(`corps_reorganization_active_RS`, `doctrine_reform_initiated_RS`, ghost observer flags, corridor
streaks, §4 "STOP-gated themes"), and framed it as **blocking new authoring**, not as leaving 70
already-shipped events dead. **This investigation does not overturn that closure; it extends it from an
authoring count to a firing measurement.**

`implemented/20260801_R4_PHASE3_EVENT_REACHABILITY_CHECKPOINT.md` covers **notification delivery**
reachability, not firing saturation, and does not overlap.

---

## 8. Recommended order for D2 (no work performed)

> ## ⚠ §8 SUPERSEDED IN PART — read §10 before using this table
>
> Two things below were **wrong** and were corrected by the 2026-09-05 PM roadmap-fit review and the
> ending adjudication. **D1's cost is not "one line + one number" — it is the most expensive item in
> the set**, and the premise that "the campaign has no ending" is itself wrong. See **§10**. The
> ordering logic is retained as written; the pricing and the routing are not.

| # | Item | Cost | Why here |
|---|---|---|---|
| 1 | **D1 — the Dayton ending.** Both blockers: `flag_not_set` semantics at `event_types.ts:832`, **and** the `turn_min: 190` vs `"weeks": 188` horizon. | ~~One line + one number~~ **WRONG — see §10** | A campaign with no ending fails the playtest at the last click. Validate on **188w** — 40w cannot see w181. |
| 2 | **D2 — endgame decision drought w139-188.** COHA window first (largest hole, clearest content source: §5c). | Pure authoring | What a playtester actually feels. Target ~30 decisions, not 7. |
| 3 | **Gesture escalation + wire the 3 `strategic_posture_review_*` handlers.** | Small | Cheapest structural win, and the only item satisfying **live canon** (`Rulebook §17.5`) rather than a superseded plan doc. |
| 4 | **D4 — the odometer projection layer.** Extend `observer_threshold_flags.ts`, default-OFF behind its own `ENABLE_*` gate, then re-floor. | Medium + a controlled 188w run | **Schedule AFTER D2.** Adds two decisions in 188 weeks; it is atmosphere, not pacing, and carries real calibration risk. |
| 5 | **Spike weeks.** | — | **Do nothing.** The cap bound once in 188 weeks; raising the floor makes the spikes less conspicuous anyway. |

**Target cadence profile (Game Designer, design opinion):** hold 1992 at 1.2-1.4 total / ~0.5 decisions
per week; 1993 at 1.1-1.3 / ~0.5; 1994 at 0.9-1.1 / ~0.4; **raise 1995 to 1.0-1.4 total and 0.6-0.7
decisions** (currently 0.16). Two rules matter more than the numbers: **(a) no drought exceeds 6 weeks
anywhere; (b) drought length must FALL as the campaign advances** — currently exactly inverted. If a
floor is ever built, build it as **authoring coverage validated at load, never as a runtime "if quiet,
fire something"** — that would be a railroad.

**On whether 70% silent weeks is the thesis or a defect (Game Designer, from canon):** those 132 weeks
still carry the five presidential and six tactical levers; what is silent is the **event layer**, which
`Game_Bible §21.1` calls *"the primary vehicle"*. `Rulebook §17.4` defines constrained agency as the
act that is **degraded**, not the act never asked for, and *"every option costs something"* (§21.1) puts
the cost **inside** the choice. Silence reads as "nothing happened", not as powerlessness — and a player
cannot be held to *"authorship of the tragedy"* for 35 weeks they were never asked about. **Verdict:
fix the shape, not the percentage.** 65-70% aggregate is fine under rules (a) and (b) above.

---

## 9. Method notes worth keeping

1. **A headless run cannot see the player-action path.** The `action_cadence` gestures (§3b) were
   measured as one-shot from `events_fired` and are not. Any claim about player-facing cadence drawn
   from a headless artifact is a claim about the bot path only.
2. **Event flags are written from DATA, not just code.** The Ahmići misdiagnosis (§6/P1) came from a
   `src/`-only grep. The re-audit in D4 counts `sets_flags` at every nesting depth in all six catalog
   files *and* checks the final save — and the orphan finding survived that stricter test.
3. **A field's semantics must come from its writer AND its reader.** `flag_not_set` reads presence;
   `sets_flags: {x: false}` writes presence. Both are individually reasonable; the pair is the bug.
4. **Cross-run stability is cheap and settles "is this the seed?"** Six hashes, one query (§0).

---

## 10. CORRECTIONS — 2026-09-05 PM roadmap-fit review

Two findings above were wrong. Both were caught by a review that re-derived the measurements rather
than trusting this report, and both are recorded rather than silently edited.

### 10.1 D1's cost was wrong by an order of magnitude — and in the direction that would break a baseline

§8 priced D1 as *"one line + one number"*. **MEASURED, it is the most expensive item in the set.**
The trace nobody followed when the fix was proposed:

```
fix flag_not_set  ->  ceasefire_1995 fires w181
                  ->  dayton_talks_begin_1995 fires w184
                  ->  dayton_signed_1995 fires ~w185, sets_flags {dayton_signed: true}
                  ->  turn_pipeline.ts:87-90  sets meta.game_over = true, outcome 'dayton_agreement'
                  ->  turn_pipeline.ts:92-99  SHORT-CIRCUITS to report-only: no combat, no movement
```

**Fixing D1 therefore ends every 188-week run at ~w185 and makes the final 3-4 turns report-only.** It
moves the final control map, the matched-OSID floor, `test:baselines`, and both fingerprints. It is a
**re-floor decision, not a run**. Landing it as a one-liner blows the baseline.

**A cheaper shape this report failed to name: fix the CONSUMER, not the predicate.** Retarget
`ceasefire_1995`'s condition to a positive test on `coha_expired`, which `coha_expires_1995` already
writes `true`. This report's own blast-radius audit (§4/D1) measured the predicate's effect as exactly
one event, so the two fixes are behaviourally identical — but the data fix does not touch a predicate
that 99 conditions share. *(The territorial consequence above is unchanged either way; only the risk
surface differs.)*

### 10.2 "The campaign has no ending" is FALSE — there are two Dayton endings, and only one is dead

**MEASURED:** `shouldInitiateDayton` (`src/sim/negotiation/dayton_negotiation.ts:96-120`) is pure week
arithmetic — `DAYTON_TRIGGER_WEEK = 188` (`:54`), `DAYTON_TRIGGER_WEEK_CLOSE_OUT = 180` (`:66`) under
`meta.dayton_close_out`. **It never consults an event.** It raises a `pending_dayton` negotiation menu
via `war_phase_negotiation_steps.ts:66-79`, which `resolveDaytonNegotiation` consumes to set
`meta.game_over`.

Confirmed in the run's `final_save.json`: `military.negotiation.pending_dayton` is **present** at t188,
`dayton_result` undefined, `meta.game_over: false`.

So there are **two independent Dayton endings**:

| Route | Mechanism | Status |
|---|---|---|
| **Horizon negotiation** | `shouldInitiateDayton` week trigger -> `pending_dayton` menu -> `resolveDaytonNegotiation` | **LIVE.** This is the ending R8's D2 report validated. |
| **Event chain** | `ceasefire_1995` -> ... -> `dayton_signed_1995` -> `turn_pipeline.ts:88` | **DEAD** (§4/D1) |

**Consequence for §4/D1's framing:** the defect is not "the campaign cannot end". It is that the
campaign ends **without narrative closure** — the authored ceasefire/talks/signing/acceptance cards
never play — and that a **second, redundant `game_over` route is dead code**. Whether that route should
be repaired or removed is an open question, not a foregone fix.

**Corollary — R8's roadmap row is NOT in tension with this report.** `MASTER_ROADMAP.md:286` and
`playtests/20260901_d2_full_campaign_all_three_factions.md:13` claim all three factions ran *"week 0 to
Dayton (188 turns)"* with zero unanswered decisions. That is a **duration and decision-hygiene claim,
discharged by the horizon trigger, and it is true.** An earlier draft of this investigation treated it
as a contradiction; it is not. A one-clause precision edit to that roadmap row (*"to the
**horizon-triggered Dayton negotiation**"*) is the only change warranted.

Supporting measurement, and a genuine defect the corrected framing surfaces:
`src/ui/warroom/content/ticker_events.ts:419-442` carries **13 Dayton ticker lines at turns 195-207**,
every one gated on `requiresEventId: 'dayton_signed_1995'` — dead twice over, since the gating event
never fires *and* the turns exceed the 188-week horizon.

### 10.3 Routing, in one line

The PM review ruled **zero new plans and zero amendments**: D1 and the chronology, lint, and
gesture-wiring items become **pre-seeded register rows on R8** (`docs/plans/2026-07-31-full-campaign-electron-validation-plan.md`,
"Pre-seeded finding register", which exists precisely for *"bugs found before R8 [whose] owning lanes
(R2, R4) are CLOSED"*); the §6 items go to the panel; the rest goes to the `MASTER_ROADMAP.md` §10
post-1.0 backlog. **Nothing routes to R7, and nothing justifies a new lane.**

Note also `MASTER_ROADMAP.md:217`, which lists among things *no longer allowed*: **"'invent a decision'
to fill a quiet historical interval"**. Read with §6.1's *"a quiet week may be a truthful positive
hold"*, this settles the pacing question against any per-week rate target. The replacement acceptance
criterion is a **sourced-candidate coverage ledger** — every citable candidate triaged
AUTHORED / AUTHORABLE / NOT-AUTHORABLE, acceptance being zero open AUTHORABLE rows, with the resulting
cadence an *output* rather than an input.

---

## 11. THE ENDING, ADJUDICATED — and why the obvious fix is a trap

Seat report: [audits/20260905_EVENT_DAYTON_ENDING_ADJUDICATION.md](audits/20260905_EVENT_DAYTON_ENDING_ADJUDICATION.md).
This supersedes §4/D1's framing and §10.2's partial correction. **Do not act on §4/D1 or §8 without
reading this section.**

### 11.1 The ending is reachable — on the path the player actually plays

**The answer differs across three paths, and only one of them is the shipped player experience.**

| Path | Ending | Evidence |
|---|---|---|
| **(a) headless / calibration** | **NONE.** Menu opens at t188, nothing consumes it, `resolvePendingDaytonCloseOut` returns null at its first line. The run ends by exhausting a `for` loop. | `final_save.json`: `pending_dayton` present, `dayton_result` undefined, `game_over: false`, **no `endgame_snapshot`** |
| **(b) `dayton_close_out` scenario** | Works — **but nothing ships it.** `package.json:54` is the only 188w script and points at the base scenario; `electron-main.cjs:2230` rejects any `scenarioKey` but `apr_1992`. | Used by tests only |
| **(c) packaged Electron / R8** | **YES, fully works.** t188 -> `pending_dayton` -> blocking decision -> `advance-turn` hard-refused (`electron-main.cjs:2317-2331`) -> modal -> `resolve-dayton` IPC -> `game_over`, `outcome: 'dayton'`, `dayton_result`, `freezeEndgameSnapshot`, VerdictScreen renders the Dayton block. | The final-turn trigger does **not** bite here: resolution is a modal + IPC, not a turn |

**This was known and documented.** `dayton_negotiation.ts:48-53` says in terms that the 188 trigger
*"lands on the FINAL turn, so the menu opens but there is no turn left to negotiate across — the
campaign freeze-frames on an open menu"*, citing a 2026-06-09 audit. That is exactly the measured
state. `DAYTON_TRIGGER_WEEK_CLOSE_OUT = 180` exists to give *"~8 turns of air"* (`:56-64`).

**`DEFAULT_MAX_TURNS = 208`** (`war_termination.ts:14`) — the turn-limit fallback sits 20 weeks past
the horizon, closing the last escape hatch for headless.

### 11.2 D1 restated correctly

The ending is reachable and correct on the player path. What is actually broken:

1. **The narrative chain is dead at one operator** (§4/D1a). Every other precondition holds in the
   measured run: `federation_ground_offensive_1995` fired at t172, `rbih_state_identity = 'civic'`, and
   the windows 181-200 / 184-210 / 184-215 all sit inside 188.
2. **Two of five events are out of horizon** — `rs_/hrhb_dayton_acceptance_1995` at `turn_min: 190`.
   Dead regardless of the operator fix.
3. **Headless has no ending at all**, and so produces no verdict, no cost ledger, no Pyrrhic grade.
4. **Route 1 is not merely dead — it becomes DESTRUCTIVE the moment (1) is fixed.**

**Player-visible today at w188:** the war just stops, the Dayton modal appears cold with no run-up, and
turn advance is blocked. Mechanism without story.

### 11.3 ⚠ THE TRAP — fixing the flag bug in isolation is a GAMEPLAY REGRESSION

```
fix flag_not_set
  -> dayton_signed_1995 fires ~t184-185, sets {dayton_signed: true}
  -> turn_pipeline.ts:88-91  sets game_over = true, outcome = 'dayton_agreement'
  -> shouldInitiateDayton returns FALSE on game_over  (dayton_negotiation.ts:98)
  -> THE DAYTON NEGOTIATION MENU NEVER OPENS. The player loses the modal entirely.
```

And it degrades further downstream:

- `turn_pipeline.ts:88-91` **never calls `freezeEndgameSnapshot`**. It is an undocumented **fourth**
  game-over writer — the contract at `endgame_snapshot.ts:8-17` names exactly three
  (`resolvePeacePlan`, `resolveDaytonNegotiation`, `checkWarTermination`).
- `outcome: 'dayton_agreement'` matches **none** of `computeFullVerdict`'s branches:
  `src/sim/negotiation/scoring.ts:883-890` sets `outcomeType = 'dayton'` **only when
  `neg?.dayton_result` exists**, which this route never sets. Result: `outcomeType = 'termination'`,
  label *"War Ended"*, and **VerdictScreen's entire Dayton block renders nothing.**

**So the one-line fix trades a narrative gap for a gameplay regression plus a broken verdict screen.**

### 11.4 Correct fix order — DO NOT BUNDLE

1. **Delete `turn_pipeline.ts:88-91` as its own change.** Route 1 is **delete, not repair**: it is a
   provable no-op today (`dayton_signed` has no other writer in `src/`, and the flag is absent from the
   save), and repairing it would mean duplicating `resolveDaytonNegotiation`'s entire postlude — at
   which point it *is* the same route. `dayton_signed_1995` should be narrative framing that **precedes**
   the negotiation, never a termination trigger.
2. **Fix `ceasefire_1995`'s condition as DATA** (`flag_equals coha_active false`) — **not** by
   redefining `flag_not_set` engine-wide, which would require auditing all 99 other users.
3. **Fix the two `turn_min: 190` events.**
4. **Decide the headless ending separately.**

### 11.5 Two further defects found while adjudicating

- **The `dayton_close_out` scenario file has DRIFTED from the base scenario** — missing
  `firepower_deficit_penalty_enabled`, `calibration_scenario`, and 6 OSID overrides. **It will not
  reproduce the floor. Re-sync it before anyone runs it.**
- **`docs/plans/2026-07-31-command-event-codex-convergence-plan.md:414` is half-wrong.** It calls
  `resolvePendingDaytonCloseOut` *"unreachable production code / false-green"*. `scenario_runner.ts:3144`
  is an unconditional live call site — it is **live code that no shipped invocation reaches**. Different
  defect, different fix.
- **More dead-by-dependency player-visible content:** `ticker_events.ts:435,438,439,441,442` (five
  post-Dayton lines at turns 203-207, unreachable twice over) and
  `dynamic_section_builder.ts:474-478,626` (Codex sections permanently pinned to the "no Dayton" branch).

### 11.6 Instrumentation gap, not a contradiction

D2's *"zero pending decisions"* claim is **true as measured and silent on Dayton**:
`tools/ai_play/parity_probe.ts:262-266` reports only `pending_event_decisions` and
`pending_proposal_reviews`, and the string `dayton` does not appear in that file. Meanwhile
`pending_dayton` is declared with `receiptPath: dayton_result` and is a **blocking** instance
(`player_decision_manifest.ts:81,87,251-266`); the terminal neutralizer only downgrades it when
`game_over === true`, which is false. **The run ends holding a blocking decision.** Harmless to
territory — no OSID repaint — but it cannot produce a verdict.

**Recommendation:** the D2 instrument should assert `blockingCount === 0` off the shared manifest rather
than enumerating two named registers.

### 11.7 Flagged as a decision, not taken as an action

Consider making the post-loop close-out **unconditional** when the loop hits its horizon with a menu
open. `resolveDaytonNegotiation` provably never repaints OSID control (it writes only a split
percentage), so territory is untouched, and **every calibration run would gain a verdict and a Pyrrhic
grade instead of a freeze-frame**. It moves `final_state_hash` on observational fields, so it needs
one-change-per-run treatment. **Calibration owner's call, not this report's.**
