# Event-System Investigation — Roadmap Fit and Routing Ruling

**Role:** Product Manager (scope, priority, phased delivery)
**Date:** 2026-09-05
**Scope:** Planning output only. No code, data, doc, or plan was changed by this analysis.

---

## 0. Provenance caveat — read before citing this report

`docs/40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md` and its three
`docs/40_reports/audits/20260905_EVENT_*.md` companions are **UNTRACKED at HEAD**
(`git status --short`; `git log -- <file>` returns empty). They are in-flight work by the sibling
event-lane agents in this session, alongside modified-but-uncommitted `docs/40_reports/README.md`
and `docs/PROJECT_LEDGER.md`.

**I independently re-verified every finding this ruling turns on**, against the working tree, and
those verifications are marked MEASURED below. I did **not** take the report on trust. Two things
worth carrying back:

- **Every count I checked reproduced exactly.** 299 catalog events; 299 with `once: true`; **0** with
  `recurrence`; **84** with `response_options`. The report's arithmetic is sound.
- **One citation in the report is wrong.** It cites `src/sim/events/observer_threshold_flags.ts`
  (§4/D4, twice). The actual path is **`src/sim/codex/observer_threshold_flags.ts`**;
  `ENABLE_OBSERVER_THRESHOLD_FLAGS = false` is at **`:51`**, not `:52`. Fix before the report is
  committed, or D4's "precedent to extend" line sends the next reader to a file that does not exist.

**Prerequisite to every routing action below:** the report must be committed. A routing table
pointing at an untracked file is not a routing table.

---

## 1. Routing table

Rules applied, quoted from source:

- **§10 row 1** (`MASTER_ROADMAP.md:460`): *"Incorrect result, broken control, crash, diagnostic
  error, stale save/map truth, determinism or migration failure | **Bug** -> RE while RE is open …
  otherwise the owning R1–R7 plan -> fix/test -> restart affected fresh campaign"*. RE is CLOSED
  (`:284`), so the second clause governs throughout.
- **§10 row 3** (`:462`): *"Historically unsupported or misplaced content | **Bug** if
  factual/chronological; **friction** if sourcing is correct but presentation is unclear -> R6/R7"*.
- **§10 row 4** (`:463`): *"Optional improvement outside 1.0 outcome and not required for 5/5 |
  Record in post-1.0 backlog; do not expand this roadmap."*
- **§5 register rule** (`:289`): *"A workstream may not gain a second active plan; amend the linked
  plan and this register together."*
- **The orphan rule**, established by precedent at
  `2026-07-31-full-campaign-electron-validation-plan.md:200-202`: *"It exists so that bugs found
  before R8 survive to the R8 gate … Without it they would be orphans: their owning lanes (R2, R4)
  are CLOSED."*

**§10's own header says *"During R8 and R9"* (`:456`).** None of these findings was produced during
R8; they come from a diagnostic sweep on `main` while R7 is the live lane. I apply §10 anyway
because it is the repo's only routing taxonomy and the lead asked for it — but the header is why
several rows below land in R8's *inert register* rather than in an active repair queue. JUDGEMENT.

| # | Finding | Route | Rule | Note |
|---|---|---|---|---|
| **D1(a)** | `flag_not_set` is key-presence; `coha_expires_1995` writes `coha_active:false`; `ceasefire_1995` can never fire; Dayton event chain dead three deep | **R8 register (new row B10)** | §10 row 1 — broken control; owning lane R4 is CLOSED → orphan rule | **See §2. NOT cheap — see §4.** |
| **D1(b)** | `rs_/hrhb_dayton_acceptance_1995` `turn_min: 190` vs scenario `"weeks": 188` | **Split from D1(a) → post-1.0 backlog, flagged to R6/calibration** | §10 row 4 | A scenario-horizon *parameter*, not a broken control. Changing `weeks` re-bases every 188w baseline. |
| **D2** | Endgame decision drought w139-188 (7 decisions in 50 weeks) | **R8 register as a FRICTION row (F1), not a bug** | §10 row 2 (*"understandable but … badly prioritized"*) | R8 Phase 3 already requires *"actual decision-gap and presidential-beat-gap analysis"* (`:193`). Do not author 23 events before that diary exists. |
| **D3 (lint)** | `turn_min == turn_max` + same-turn `requires_events` = dead by construction; recommend a **loader lint** | **R8 register (B12)** | §10 row 1 — broken control | The lint is byte-neutral; **acting on what it finds is not.** Split in §4. |
| **D3 (instances)** | `nato_ultimatum_sarajevo_1994` + `sarajevo_exclusion_zone_1994` | **R8 register (B12), same row** | §10 row 1 | Fixing them makes two events start firing at w96-98 → calibration-moving. |
| **D4** | 70 events read 32 flags nothing writes; they are **odometers**, a projection step never built | **post-1.0 backlog** | §10 row 4 | The report itself prices it: **2 new decisions in 188 weeks**. It is not required for a 5/5 diary, and it is the highest-calibration-risk item in the set (~69 new consequence firings with live effects). |
| **D5** | 32 ahistorical branches correctly dark; `us_halts_federation_advance_1995` near-miss | **NOT SCHEDULED — closes with no code** | — | The report's own ruling. See §5. |
| **§3 / §3a** | `Rulebook §17.5` recurrence target missed; 0/299 use `recurrence` | **post-1.0 backlog** | §10 row 4 | Adopting `recurrence` requires **editing a green invariant** (`tests/event_timeline_integrity.test.ts:23-27` asserts all-once). Not 1.0 scope. |
| **§3b** | 3 `strategic_posture_review_*` have no handler — unfinished wiring | **R8 register (B13)** | §10 row 1 — a control that does nothing | Byte-neutral to the sim (player-action path only), but it is unscheduled feature work under owner decision D1 (2026-09-04). See §6. |
| **§3b** | 11 of 12 gestures `escalation: "static"` — the live-canon gap | **R8 register (B13), same row** | §10 row 3 (friction against `Rulebook §17.5`) | One data field. Byte-neutral to headless. |
| **§5a / §5b** | Barracks/Prijedor/camps + late-1994 systematic 4-5 week early bias | **R8 register (B11, one grouped row)** | §10 row 3 — *"**Bug** if factual/chronological"* | §10 makes these bugs, so they may **not** go to the backlog (row 4 is for *optional improvements*). R8 then gets §12's escape: *"explicitly proven outside the 1.0 definition of done."* |
| **§5a** | Srebrenica/Žepa `turn_min` narrowing | **§6 PANEL** — carved out of B11 | `CLAUDE.md` Sacred Rules: *"the ENCLAVE GUARD [is] the panel's to rule on"* | The Historian's own carried caution. Not the PM's call and not R8's. |
| **§5c** | Missing content by window (Velika Kladuša/RS referendum, UNCRO/Z-4, Split Agreement 22 Jul 1995) | **attached as EVIDENCE to F1**, not scheduled separately | §10 row 2 | These are the *cited authored rows* §6.1 (`:301`) demands. They make F1 actionable; they are not a lane. |
| **§5 / graz** | `graz_accords` hardcoded at `war_phases.ts:1062-1066`, comment says wk 4, epoch says wk 5 | **post-1.0 backlog** | §10 row 4 | A one-week comment/behaviour drift on a hardcode invisible to every catalog metric. Not 5/5-relevant. |
| **P1** | `ahmici_massacre_1993` arithmetically unreachable — `faction_controls_municipality HRHB vitez ≥ 0.5` vs 1-of-3 OSIDs | **§6 PANEL (standard four)** | The Historian's ruling in the report; `CLAUDE.md` panel rule | Panel first. **Do not pre-decide the fix shape.** |
| **P1 (data tail)** | `operational_initial_master.json` paints 3 Vitez OSIDs HRHB; `hybrid_1992` gives runtime 1 | **post-1.0 backlog, flagged to the live derived-data lane** | §10 row 4 | Adjacent to the known 269-row master/derive divergence (`MASTER_ROADMAP.md:148-153`). Not this report's finding to own. |
| **P2** | Srebrenica w162 vs w171; Žepa w164 vs w173 | **§6 PANEL** | ENCLAVE GUARD, panel-owned | Compounded by the known hardcoded t162 write (`memory/srebrenica_fall_is_a_hardcoded_write.md`). |
| **P3** | The commissioned `faction_controls_municipality ≥ 0.5` small-OSID sweep, **never run** | **RUN IT NOW — read-only diagnostic** | Not a routing question | The cheapest, highest-value item in the whole report. See §4 and §6. |
| **P4** | `ENDGAME_AND_NEGOTIATION_DESIGN.md:339,341` RESOLVED decisions vs shipped data (7 events, 0 `response_options`) | **§6 PANEL — canon-vs-data reconciliation** | Panel owns §6/H1.8 | The panel *reconciles the documents*; it does not commission a Srebrenica decision event. The report declined to propose one; so do I. |
| **§7** | Prior closure `20260508_V090_EVENTS_AUTHORING_SATURATION.md` measured authoring, never firing | **No route — it is context** | — | The report explicitly does not overturn it. Nothing to schedule. |
| **(lead's own finding)** | `tests/event_timeline_integrity.test.ts` loads only the four `war_199x.json` files (`:11-15`); `consequences.json` (135) and `war_1992_hrhb_summer.json` (5) — **140 of 299 events, 47%** — are covered by no invariant | **post-1.0 backlog** | §10 row 4 | MEASURED. Real gap, but extending the test would fail immediately on unsorted/cross-file rows, and fixing *that* is unscoped work inside R7. Record it with the exact numbers so it is not re-derived. |

**Splits made explicit:** D1 → (a) broken control to R8 / (b) horizon parameter to backlog. D3 → lint
(byte-neutral) / instances (calibration-moving), same row, two costs. §5a → chronology bugs to R8 /
enclave rows to the panel. P1 → event gate to the panel / `operational_initial_master` divergence to
the data backlog.

---

## 2. The hard ruling — where D1 goes

### 2.1 MEASURED: there are two Dayton endings, and only one of them is dead

This is the fact the question turns on, and it is not in the report.

| | **Mechanical ending** | **Narrated ending** |
|---|---|---|
| Trigger | `shouldInitiateDayton` (`src/sim/negotiation/dayton_negotiation.ts:96-120`) | `ceasefire_1995` → `dayton_talks_begin_1995` → `dayton_signed_1995` |
| Gate | `warWeek >= effectiveDaytonTriggerWeek(state)`; `DAYTON_TRIGGER_WEEK = 188` (`:54`), `..._CLOSE_OUT = 180` (`:66`) | `flag_not_set coha_active` |
| Depends on the event catalog? | **NO** — pure week arithmetic plus a patron-override fallback | Entirely |
| Terminal write | `pending_dayton` menu → `resolvePendingDaytonCloseOut` (`:215`) → `game_over` | `event_flags.dayton_signed` → `turn_pipeline.ts:87-90` → `game_over` |
| Status today | **WORKS** | **DEAD** |

MEASURED, `data/scenarios/events/war_1995.json`: `ceasefire_1995` `turn_min 181`, condition
`{"type":"flag_not_set","flag":"coha_active"}`, requires `federation_ground_offensive_1995`;
`coha_expires_1995` `turn_min 156` writes `{"coha_active": false, "coha_expired": true}`. MEASURED,
`src/sim/events/event_types.ts:830-833`: `return !(condition.flag in flags)` — key presence, exactly
as reported. The report's diagnosis is correct and reproduces.

### 2.2 So: is R8's row claim in tension with the finding? **No. It is true, and narrower than it reads.**

R8's row says all three factions ran *"week 0 to Dayton (188 turns)"*. The source
(`docs/40_reports/playtests/20260901_d2_full_campaign_all_three_factions.md:13`) says *"All three
factions run week 0 to Dayton with zero unanswered decisions and zero unresolved authorizations
across all 188 turns."*

That is a **duration and decision-hygiene claim**, discharged by the horizon trigger at
`DAYTON_TRIGGER_WEEK = 188`, which never consults an event. It was never a claim that the Dayton
*event chain* fired. **The finding does not falsify it and does not change D1's routing.**

It *does* make the row's wording load more than it can carry. **Recommended, docs-only, legal now:**
amend the R8 row (`MASTER_ROADMAP.md:286`) from "week 0 to Dayton (188 turns)" to "week 0 to the
**horizon-triggered Dayton negotiation** (188 turns)". A precision, not a retraction. It costs one
clause and it stops the next reader concluding the ending is proven working.

### 2.3 Ruling: D1 goes to **R8's Phase 3 register**. Not R7. Not a reopened R4.

**Not the R7 amendment.** That plan's §2 Non-Goals are explicit: *"No engine, sim, state, scenario,
calibration, or canon edit"* and *"No bug fixes. Every bug in this audit is pre-seeded to R8 under
owner decision D1 (2026-09-04, HOLD FOR R8)."* Its §9.1 destination rule sends anything that is not
English-the-player-reads to route 2 (bug → R8) or route 3 (backlog). D1 is a broken control in
event data and engine predicate semantics. Route 2. Unambiguous.

**Not a reopened or amended R4.** Three reasons, in descending strength:

1. **The repo has already ruled this exact case.** R7 amendment §9.2 and the R8 register header
   (`2026-07-31-full-campaign-electron-validation-plan.md:200-202`) invented the pre-seed pattern
   *precisely* for bugs whose owning lane is closed — naming R2 and R4 by name. B1–B9 are already
   parked there under exactly this logic. Reopening R4 for D1 would overturn a settled pattern
   eight rows deep.
2. **D1 is not R4's subject matter.** R4's "Complete when" (`:280`) reads: *"Five presidential levers
   remain; Decision Room owns action; Desk owns triage; events, Chronicle, Cost Ledger, and Codex
   share deterministic receipts and priority truth."* All of that holds. D1 is event-window
   arithmetic and a predicate's presence-vs-truthiness semantics. Reopening a lane whose acceptance
   criteria are all still satisfied would make "CLOSED" mean nothing.
3. **Reopening costs more than it buys.** R4 closed on PR #481 → `40d3c5452` with 232 green tests
   and dual independent GO. Reopening means re-running its closure gate to land one predicate fix,
   while R7 — the only lane between here and R8 — is live.

**But D1 does not get B1–B9's disposition.** Those rows are "measured display-only; D1 covers it;
final". D1-the-defect is different in kind, and its register row must say so:

> **D1 is a precondition of R8's own success criteria, not merely a finding routed to R8.** R8
> Phase 5 requires *"final two clean diaries score 5/5 with clean diagnostics"*, and R8's own
> "Complete when" requires campaigns that *"cover full duration and required surfaces"*. A campaign
> whose last authored event is `holbrooke_ceasefire_demand_oct95` at w183, followed by five silent
> weeks and a negotiation menu with no narrative build-up, cannot produce a 5/5 endgame diary. Every
> Dayton ticker line — `ticker_events.ts:419-442`, thirteen entries at turns 195-207 — is gated on
> `dayton_talks_begin_1995` or `dayton_signed_1995` and is therefore **dead twice over**: past the
> horizon *and* behind a dead prerequisite.

So: **B10, flagged in the register as R8-Phase-2-blocking rather than R8-Phase-3-triageable.** It is
the first thing R8 fixes when R8 opens, not something R8 weighs.

---

## 3. Plan shape

### Recommendation: **ZERO new plan documents. Zero amendments to any existing plan.**

The roadmap says *"do not expand this roadmap"* (`:463`) and *"A workstream may not gain a second
active plan"* (`:289`). R7 already carries **four** linked plans (parent + opening + cinematic +
presentation amendment). A fifth is exactly the expansion the register rule exists to prevent — and
nothing in this report is R7's *subject matter* anyway.

Every finding fits an existing container:

| Artifact | Action | Kind |
|---|---|---|
| `docs/40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md` + 3 audits | **Commit** (currently untracked); fix the `observer_threshold_flags.ts` path citation | new report, no plan |
| `docs/plans/2026-07-31-full-campaign-electron-validation-plan.md` **§ Phase 3, "Pre-seeded finding register"** (`:196-214`) | **Append rows B10–B13 and friction row F1**, using the existing `ID / Bug / Writer / Reader / Layer / Discharged early?` columns | amend an existing section of an existing plan — the precedent action |
| `docs/plans/MASTER_ROADMAP.md` **§10 backlog table** (`:471-482`) | **Append 6 rows** (D1(b) horizon, D4 odometers, recurrence model, graz epoch, P1 data tail, test-coverage gap) — each carrying its key list, per the standing rule that backlog rows record enough that *"nobody re-greps them"* | append to an existing table |
| `docs/plans/MASTER_ROADMAP.md` §5 R8 row (`:286`) + Current Execution Snapshot | **One-clause precision edit** (§2.2) + an unscheduled-work paragraph recording that this investigation landed and moved no lane, in the established style of `:97` and `:142` | edit |
| `docs/40_reports/proposals/20260905_PANEL_<sha>_EVENT_CATALOG_HISTORICAL_CLAIMS.md` | **New §6 panel record** for P1, P2, P4 — following `20260830_PANEL_63671dd8c_ENCLAVE_TRIGGER_AND_PLANNING_CANON.md` | a **report**, not a plan. Panels produce records. |
| `docs/PROJECT_LEDGER.md` | One entry | per Ledger Protocol |

**Section being amended, named exactly as asked:** the R8 register at
`docs/plans/2026-07-31-full-campaign-electron-validation-plan.md` **Phase 3 → "Pre-seeded finding
register -- 2026-09-03 showcase GUI audit"**, line 196. Its title needs widening — it is about to
hold two audits, not one. Rename to **"Pre-seeded finding register"** with the two sources listed
beneath, exactly as it already lists its two sources at `:212-213`.

### Phase structure for the register additions

None. **The register is inert by contract** — *"R8 remains WAITING ON R7. This register is inert
until R8 opens — it starts nothing and claims no R8 progress"* (`:199-200`). Rows, not phases.
Phasing is R8's to do when R8 opens, with a diary in hand. Writing a phase plan now for work that
cannot start is the AI-theater failure mode the `roadmap-patch` skill exists to prevent.

**The one thing that does need a phase structure is the §6 panel packet**, and that belongs in the
panel record, not in `docs/plans/`: seat list (Historian + scenario-tester/calibration +
Engine/systems + Red-team — the standard four, per the report's own Historian ruling that nothing
here crosses the bright line), the three questions (P1 gate, P2 enclave dates, P4 canon-vs-data),
the P3 sweep output as evidence, implementer ≠ reviewer, unanimous GO = signature.

---

## 4. Sequencing against §11 barriers

### 4.1 The report's §8 cost column is wrong about its own #1 item

The report prices D1 as *"One line + one number"* and ranks it first as the cheap unblocking fix.
**MEASURED, that is incorrect, and it is the most important correction in this analysis.**

Trace what fixing D1(a) actually does on the 188w calibration scenario:

1. `flag_not_set` becomes truthy → `ceasefire_1995` becomes eligible at **w181** (its
   `federation_ground_offensive_1995` prerequisite already fires; `holbrooke_ceasefire_demand_oct95`
   fired at w183 in the evidence run and carries the same prerequisite).
2. → `dayton_talks_begin_1995` (`turn_min 184`) fires at w184.
3. → `dayton_signed_1995` (`turn_min 184`, requires `dayton_talks_begin_1995`) fires at **w185** —
   one turn late, because of D3's same-turn-prerequisite mechanic — and writes
   `sets_flags: {"dayton_signed": true}`.
4. → `src/sim/turn_pipeline.ts:87-90`: `if (working.military.event_flags?.dayton_signed === true &&
   !working.meta.game_over) { working.meta.game_over = true; ... }`
5. → `:92-99`: *"Game over gate: if game_over is set, short-circuit to report-only mode (no
   combat/movement)"*.

**Fixing D1(a) ends every 188w run at ~w185 and turns the final 3-4 turns into report-only.** That
moves the final control map, the calibration floor, `npm run test:baselines`, and the 40w/188w
fingerprints. It trips §11's *"Run two byte-identical long scenarios after any deterministic
simulation/output change"* (`:499`) — and it will not be byte-identical, so it is a **re-floor
decision**, not a run.

Whether that is a *defect* or a *correct war ending* is a real design question — the war did end —
but it is emphatically not "one line", and the R8 register row must carry this trace or the next
implementer will land it as a one-liner and blow the baseline.

**A cheaper shape the report did not name (JUDGEMENT, offer it to the panel/R8, do not decide it
here):** fix the **consumer**, not the predicate. Change `ceasefire_1995`'s condition from
`{"type":"flag_not_set","flag":"coha_active"}` to a positive test on `coha_expired` (which
`coha_expires_1995` already writes `true`). The report itself MEASURED that the predicate's blast
radius is exactly one event — *"Exactly one collision exists, and it is `ceasefire_1995`"* — so the
two fixes are **behaviourally identical** and the data fix is reviewable in isolation without
changing a predicate 99 events share. Same calibration cost either way; far lower review risk.

### 4.2 Byte-neutral vs calibration-moving

**Genuinely byte-neutral to the simulation (cheap):**

| Item | Why byte-neutral |
|---|---|
| **P3 sweep** | Read-only diagnostic. Zero writes. |
| Committing the report, panel record, register rows, backlog rows | Docs. |
| §6 panel rulings themselves | Docs + canon; the *fixes* they authorize are not. |
| **D3's lint**, as a lint only | A loader validation that flags a shape. Byte-neutral *provided it warns*; if it throws, it blocks load and forces the instance fixes, which are not. |
| 3 `strategic_posture_review_*` handlers | Desktop player-action path (`src/desktop/*_contract.cjs`). Headless `events_fired` cannot see it — the report's own §9 method note 1. Needs packaged-Electron proof (§11 line 3), not a scenario pair. |
| Gesture `escalation: static → escalating` | Same path. `action_cadence` is consumed only by desktop handlers (`event_types.ts:532`; `evaluate_events.ts:121`). |

**Calibration-moving — each needs a paired 188w run and a re-floor decision, and each is its own
run under `CLAUDE.md`'s "One change per calibration run":**

D1(a) · D1(b) horizon · D3 instances · D4 odometers (~69 new consequence firings with live effects;
`observer_threshold_flags.ts:46-50` states the bar in terms: *"only after a dual-horizon calibration
re-floor confirms the OSID control map stays bit-identical"*) · every §5a/§5b `turn_min` edit · P1's
Vitez gate · P2's enclave windows.

**And 188w is mandatory for all of them.** `memory/feedback_188w_validate_combat_changes_before_merge`
— 40w GO is a false-green. The report says it too: *"a 40w run cannot see w181 at all."*

### 4.3 Correct order

```
NOW, byte-neutral, no lane moves
  1. Commit the report + 3 audits; fix the observer_threshold_flags path citation
  2. Run the P3 sweep  ── read-only ── MUST precede step 4: it may enlarge P1's scope
                                        from one row to a class, and the panel cannot
                                        rule on a scope it has not been shown
  3. Register + backlog + roadmap rows; R8 row precision edit; ledger entry

THEN, docs/canon only
  4. §6 panel: P1 (Vitez gate) · P2 (enclave dates) · P4 (canon-vs-data)
     - standard four seats; implementer != reviewer; unanimous GO = signature
     - the panel RULES; it may authorize a fix it does not schedule

R7 CLOSES  ── unchanged, untouched by any of the above ──

R8 OPENS
  5. B10 (D1) FIRST — before Phase 2's campaigns, not in Phase 3's triage.
     Paired 188w + explicit re-floor decision. Alone on its branch.
  6. Phase 2 campaigns → Phase 3 diaries → F1 (the drought) is MEASURED from the
     player seat, then authored against the §5c sources, then re-run
  7. B11 chronology / B12 lint+instances / B13 gestures — serialized, one per run,
     each with §12's "prove outside the 1.0 definition of done" available

POST-1.0
  8. D4 odometers · recurrence model · D1(b) horizon · graz epoch ·
     P1 data tail · event-test coverage gap
```

**The barrier this order protects:** the R7 presentation amendment is *"renderer-only and
byte-neutral to the simulation"* by its own contract. Steps 1-4 are all docs, diagnostics, or
desktop-path — **nothing in them can perturb a byte of the simulation while that gate is open.**
Every calibration-moving item sits strictly after R7 closes. That is the whole point of the
ordering, and it is the answer to the lead's question 4.

---

## 5. What should NOT be scheduled — and why

Aggressive, as asked. **Nine items.**

1. **Spike weeks / `MAX_EVENTS_PER_TURN`.** MEASURED at `evaluate_events.ts:39` (`= 4`); the report
   measured it binding **once in 188 weeks** (three `overflowed` entries at t96), zero
   `mutex_suppressed`. The report says it: *"The cap is not the problem and tuning it is a no-op."*
   **Do nothing.**
2. **D5's 32 ahistorical branches.** `event_loader.ts:43-46` documents them as *"calibration-safe by
   construction since they literally cannot fire on the historical path."* Firing them breaks
   calibration. This is the free-war model working. **Do nothing.**
3. **`us_halts_federation_advance_1995`.** A near-miss on an area threshold that moves with a
   calibration floor that is still moving. Fitting content to a moving number is the error.
   **Do nothing.**
4. **Any runtime event floor.** "If the week is quiet, fire something" is a railroad — banned by
   `feedback_emergent_not_railroads`, by the Game Designer's own ruling in the report (*"never as a
   runtime 'if quiet, fire something'"*), and by roadmap §3's *"'invent a decision' to fill a quiet
   historical interval"* (`:217`) in its list of things *"no longer allowed"*. §6.1 (`:300`) settles
   it outright: *"A quiet week may be a truthful positive hold. It is better than a fabricated
   choice."* **Not a candidate at any priority.**
5. **The `recurrence` rollout.** Adopting it means editing `tests/event_timeline_integrity.test.ts`
   lines 23-27 — a green invariant asserting `all events are once-only` — to permit what it
   forbids. And it is unnecessary for the live-canon gap: `Rulebook §17.5` compliance is reachable
   through `action_cadence`'s `escalation` field, which already exists, is already validated
   (`event_loader.ts:377-386`), and is already wired. **Backlog.**
6. **D2's ~30 authored decisions, authored now.** This is the largest work item in the report and
   the most tempting. Do not. It is 23 new decision events *with effects* into the single most
   calibration-sensitive window in the game (1995: Storm, Deliberate Force, the enclaves), authored
   against a drought nobody has yet felt from the player's seat. `feedback_measure_the_premise_before_building`.
   R8 Phase 3 will measure it (`:193`) and R8 Phase 4 is an *"Automatic remediation loop"*.
   **Route it, evidence it with §5c's sources, and let R8's diary size it.**
7. **A new lane, of any name.** Roadmap §10 row 4: *"do not expand this roadmap."* §5: no second
   active plan. Nothing here justifies it — see §3.
8. **Reopening R4.** §2.3.
9. **Extending `event_timeline_integrity.test.ts` to the missing 140 events.** Genuinely a 47%
   coverage hole and genuinely worth recording — but it would fail on contact, and fixing what it
   surfaces is unscoped data work landing inside a byte-neutral R7 gate. **Backlog, with the
   numbers, so it is never re-derived.**

---

## 6. Go/no-go before R8

### **NO-GO on everything that touches the simulation. Conditional GO on exactly two things.**

**GO — both zero-risk to R7's byte-neutral gate:**

- **Run the P3 sweep.** Read-only. It is a §6-panel-commissioned measurement that *"has not been
  run"*, and P1's panel ruling is materially different if Ahmići is one row versus a class of
  silently-unreachable historical claims. Blocking the panel on a grep is not a trade.
- **Convene the §6 panel on P1/P2/P4, and commit the docs.** The panel is the repo's designated
  authority (`CLAUDE.md`: *"§6, the §6 bright line, and the ENCLAVE GUARD are the panel's to rule
  on"*) and it does not wait on R8. It produces a record; the record authorizes a fix it does not
  schedule. **The Historian's read is correct that this is the standard four, not the broader eight
  — nothing here crosses the bright line; P1 in particular moves *toward* the stated thesis.**

*(Committing the report and writing the register/backlog rows is hygiene rather than scheduling, but
it is a prerequisite to both of the above and should land first.)*

**NO-GO — everything else, including the items that look free:**

- **D1**, despite being blocking. §4.1: it ends every 188w run at w185. Landing that while R7 is the
  live lane puts a re-floor decision inside a gate whose contract is byte-neutrality.
- **The 3 gesture handlers and the `escalation` field**, despite being byte-neutral to the sim.
  These are the strongest temptation in the set — cheap, live-canon-satisfying, and the report ranks
  them #3. But they are **unscheduled feature work on the desktop player-action path**, and owner
  decision D1 (2026-09-04, HOLD FOR R8) governs exactly that: no unscheduled repair while R7 is
  live. The R7 amendment §9.6 already ruled the analogous case — *"D1 governs scheduling, and its
  logic … applies as well to a defect discovered on 2026-09-05 as to one discovered on 2026-09-03."*
  Worse in kind: landing new desktop code immediately before the packaged-Electron validation gate
  means **R8 validates a build R7 never closed on.** That is precisely the failure R8 exists to
  catch. **NO-GO.**
- D2 authoring, D3 instances, D4, all §5a/§5b chronology.

### The bottom line for the lead

**R7 stays exactly as it is.** Nothing in this 512-line report belongs to it, and the one item that
superficially looks like R7's (chronological content, §10 row 3 → R6/R7) is calibration-moving and
therefore incompatible with the R7 amendment's byte-neutral contract.

**The report's true product is not a work queue — it is R8's endgame brief.** Before it, R8 would
have opened, run three packaged campaigns, and discovered at the last click of the last diary that
the campaign has no narrated ending. It now opens knowing that, with the defect traced writer-to-
reader and its real calibration cost priced. That is worth more than landing any of it early.

**One-line recommendation:** commit it, run P3, convene the panel, write five register rows and six
backlog rows, correct one clause in R8's roadmap row — **and touch no simulation byte until R7
closes.**

---

## Appendix — MEASURED vs JUDGEMENT

**MEASURED (verified by me against the working tree today):**

- `src/sim/events/event_types.ts:830-833` — `flag_not_set` is `!(condition.flag in flags)`.
- `war_1995.json`: `ceasefire_1995` min 181 / max 200, cond `flag_not_set coha_active`, requires
  `federation_ground_offensive_1995`, 0 options. `coha_expires_1995` min 156 sets
  `{coha_active:false, coha_expired:true}`. `dayton_talks_begin_1995` min 184 requires
  `ceasefire_1995`, 2 options. `dayton_signed_1995` min 184 requires `dayton_talks_begin_1995`, sets
  `dayton_signed:true`. `rs_/hrhb_dayton_acceptance_1995` min **190**.
- `apr1992_definitive_188w.json:6` and `..._dayton_close.json:5` — `"weeks": 188`.
- `src/sim/turn_pipeline.ts:87-90` — `dayton_signed === true` → `game_over`; `:92-99` short-circuits
  to report-only.
- `src/sim/negotiation/dayton_negotiation.ts:96-120` `shouldInitiateDayton` is week-based; `:54`
  `DAYTON_TRIGGER_WEEK = 188`; `:66` `..._CLOSE_OUT = 180`; `:72-74` `effectiveDaytonTriggerWeek`.
  **No event dependency.**
- Catalog totals across all six files: **299** events, **299** `once: true`, **0** `recurrence`,
  **84** with `response_options`. Per-file: 34 / 5 / 70 / 25 / 30 / 135.
- `tests/event_timeline_integrity.test.ts:11-15` loads only the four `war_199x.json` files;
  `:177` asserts `allEvents.length === 159` (= 34+70+25+30 ✓); `:23-27` asserts all-once; `:29-37`
  asserts sorted-by-`turn_min`; `:39-52` allows **equal** `turn_min` for `requires_events`;
  `:94` and `:107` pin Srebrenica and Žepa to `turn_min` 160. **140 of 299 events uncovered.**
- `src/sim/events/evaluate_events.ts:39` — `MAX_EVENTS_PER_TURN = 4`.
- `src/sim/turn_phases/war_phases.ts:1062-1066` — `graz_accords` pushed directly into `result.fired`.
- `src/sim/codex/observer_threshold_flags.ts:51` — `ENABLE_OBSERVER_THRESHOLD_FLAGS = false`
  (**not** `src/sim/events/…:52` as the report cites).
- `src/ui/warroom/content/ticker_events.ts:419-442` — 13 Dayton ticker lines at turns 195-207, all
  gated on `dayton_talks_begin_1995` / `dayton_signed_1995`.
- D2 playtest claim source: `20260901_d2_full_campaign_all_three_factions.md:13`.
- The report and its 3 audit files are UNTRACKED; `docs/40_reports/README.md` and
  `docs/PROJECT_LEDGER.md` are modified-uncommitted.

**JUDGEMENT (mine, argued from the above):**

- D1 → R8 register, not R4 reopening, not R7 (§2.3).
- D1 is R8-Phase-2-blocking, not Phase-3-triageable.
- R8's "week 0 to Dayton" is true but should be reworded for precision.
- Zero new plans; five register rows; six backlog rows; one panel record.
- D2 (drought) is friction to be sized by R8's diary, not authoring to do now.
- §5a/§5b chronology are §10-row-3 bugs and therefore may not go to the backlog.
- The consumer-side fix for D1(a) is lower-risk than the predicate-side fix.
- NO-GO on the gesture handlers despite their being byte-neutral.
