# Event Pacing — Reconciliation Against the Locked Roadmap and the Timeline Test

**Seat:** Game Designer | **Date:** 2026-09-05 | **Supersedes:** the Q6 acceptance criterion in `evt_designer_report.md`. All other findings in that report stand.

I read all three sources myself rather than accept them secondhand. **All three claims are accurate as stated.** I have one refinement to each, and one measured result that argues *against* a recommendation I was about to make.

---

## Verification first

| Claim | Verified | Refinement |
|---|---|---|
| `MASTER_ROADMAP.md` §6.1 contains those three locked bullets | **Yes** — lines 297, 300, 301, under "6.1 Presidential role and cadence" | The §6.1 heading is literally *"Presidential role and **cadence**"*. This is the cadence ruling. My Q6 was written without it. |
| `tests/event_timeline_integrity.test.ts:24-28` forbids `recurrence` | **Yes** — `expect(event.once).toBe(true)` over all 159 | Every *other* assertion in the file is a chronology guardrail. That context changes the read — see §2. |
| Coverage is 159 of 299 | **Yes** — loads only the four `war_199x.json` files; 34+70+25+30 = 159; the uncovered 140 = `war_1992_hrhb_summer.json` (5) + `consequences.json` (135) | I measured what the gap actually hides. Mostly nothing. See §3. |

---

## 1. The locked line vs my Q6 — you are right, and I concede the criterion

> "A quiet week may be a truthful positive hold. It is better than a fabricated choice."
> "Optional initiatives require a cited authored row, deterministic conditions, an existing presidential lever, a once/cooldown rule, and non-blocking presentation."
> — `docs/plans/MASTER_ROADMAP.md` §6.1, lines 300-301

**Your reading is correct. My Q6 acceptance criterion violates the locked line and I withdraw it.** Not the diagnosis — the criterion.

### Why it violates, stated precisely

My Q6 had two parts, and they fail for the same reason with different severity:

- **"1995 → 0.6-0.7 decisions/week, ~30 decisions in w139-188"** — a *rate*. A rate adopted as a target is a quota, and a quota creates pressure to fill. The only way to fill a quota in a window where history is quiet is to invent a choice. The locked line forbids exactly that trade.
- **"No drought longer than 6 weeks"** — a *guarantee*, which is strictly worse. It licenses fabrication precisely at the moments when history has nothing citable to offer, because those are the only moments where the guarantee binds. **This is the more dangerous of the two and I withdraw it more firmly.**

I will not defend either. I'll note the self-inflicted part, because it's the useful lesson: my own report argued that a runtime event floor would be a railroad and must never be built ("build it as authoring coverage validated at load, never as a runtime 'if quiet, fire something'"). I applied the anti-railroad principle to the *mechanism* and then failed to apply it to my own *acceptance criterion*. A per-week authoring quota is the same railroad expressed in a spreadsheet instead of in code. The locked line caught what I did not.

### What the locked line does NOT say

It does not say the current distribution is correct, and it does not immunise the existing droughts. Read the modal: a quiet week **may** be a truthful positive hold. It earns that status by being *truthful* — by there being nothing citable to put in it. The line is a **floor on evidentiary standard, not a ceiling on density**. It ranks silence above fabrication; it says nothing about silence versus sourced content, because sourced content beats both.

So the locked line does not answer the question. It re-types it:

> **For each quiet week: is it quiet because history was quiet, or quiet because nobody authored the row?**

That is a question with a checkable answer, and it is a better question than mine.

### The measured answer for the window in dispute

Anchoring on the one event in the catalog with a pinned single-week trigger — `operation_storm_1995`, `turn_min: 174, turn_max: 174`, Operation Storm began 4 Aug 1995 — gives turn 1 ≈ week of 10 April 1992, i.e. **turn n ≈ 10 Apr 1992 + 7(n−1) days**. That anchor reproduces Storm exactly (w174) and is the only defensible mapping, since every other 1995 `turn_min` is a loose window floor, not a date.

Against the Historian's five named candidates:

| Candidate | Date | ≈ turn | Inside a measured drought? |
|---|---|---|---|
| Z-4 plan presented | 30 Jan 1995 | **~w148** | **YES — inside w139-159** |
| UNPROFOR → UNCRO | 31 Mar 1995 | **~w156** | **YES — inside w139-159** |
| Split Agreement | 22 Jul 1995 | **~w172** | **YES — inside w161-173** |
| Velika Kladuša | 21 Aug 1994 | ~w124 | No — sits just before the w130-137 drought |
| RS referendum | 27-28 Aug 1994 | ~w125 | No — same |

**Three of five land inside a named drought. Two do not** — I state that plainly rather than round it in my favour; they fall in the generally thin 1994 band, not in the specific gap.

That is sufficient to settle the substantive question. The 21-week w139-159 drought contains at least two citable, dated, sourced political decision points. **Those weeks are not truthfully quiet. They are unauthored.** The locked line protects the first category and offers nothing in defence of the second.

So: the locked line and my diagnosis do not conflict. The locked line kills my *unit of measurement* and leaves the *finding* standing.

### The replacement acceptance criterion — concrete, as asked

Replace the rate with a **sourced-candidate coverage ledger**. Not a number; a ledger with no open rows.

1. **Enumerate.** The Historian produces a closed, finite list of every citable political / diplomatic / command decision point in w139-188 meeting the source hierarchy (ICTY and BB first, per §6.4 line 325: *"Every claim uses the source hierarchy and claim ledger in R7. Unsupported claims are omitted."*). Each row carries a date, a citation, and a faction.
2. **Triage** each candidate into exactly one of:
   - **AUTHORED** — a row already exists.
   - **AUTHORABLE** — no row exists; sources are sufficient; a real presidential choice existed; it resolves through an **existing** lever or the event-response channel.
   - **NOT-AUTHORABLE** — no defensible player choice, or sources insufficient, or it would need a sixth lever. Recorded with the reason, then closed.
3. **Acceptance = every AUTHORABLE candidate has a row. Zero open. No target count, no rate, no drought bound.**
4. **The resulting cadence is correct by construction.** If the ledger yields 12 decisions across w139-188 rather than 30, **12 is right and my 30 was wrong.** The number must be an *output* of the ledger, never an *input* to it.

This criterion is strictly stronger than mine where it matters — it cannot be satisfied by fabrication, because every row needs a citation — and strictly weaker where it should be weak, because it makes no promise at all about distribution. A week that survives triage with nothing in it is then a *demonstrated* truthful positive hold rather than an assumed one, which is what the locked line actually asks for.

**Compliance check against the other two locked bullets.** The three in-drought candidates are diplomatic/patron events. Each resolves through the event-response channel, which both `Game_Bible` §21.5 and `Rulebook` §1 state explicitly is **not** a sixth lever ("Refusing a patron demand is not a sixth lever — it is a response option within the event system resolving through `patron_confidence`"). So no new lever, and the "cited authored row / deterministic conditions / existing lever / once-or-cooldown rule / non-blocking presentation" checklist is satisfiable for all three. Worth noting: that bullet says "**a once/cooldown rule**" — the locked line explicitly contemplates cooldowns, not only once-only. That matters for §2.

---

## 2. The once-only test

### (a) Does it change 3a from "nobody used the feature" to "deliberately fenced off"?

**It moves my read, but not all the way to your framing. The accurate description is a third thing: the constraint was worked around, not resolved.**

Against "deliberately fenced off as a design ruling":

- Every other assertion in that file is a **chronology** guardrail — no duplicate IDs, sorted by `turn_min`, `requires_events` ordering, Croat-Bosniak war after Vance-Owen, Žepa requires Srebrenica, ceasefire before Dayton, no anachronistic Mostar siege, no premature safe areas. The file is named *"Event timeline historical integrity"*.
- In that company, `all events are once-only` reads as a **property of a timeline**, not a verdict on recurrence. A dated historical row happens once. Markale happens once. Stari Most falls once. A recurring row has no place on a timeline.
- The engine simultaneously implements recurrence **fully** (`evaluate_events.ts:110-131`, `RecurrenceConfig` at `event_types.ts:695-698`) and the loader validates once/recurrence mutual exclusion (`event_loader.ts:424-425`). You do not build, type, and validate a feature you have ruled out.

The decisive evidence, and it reframes everything — **`action_cadence` exists *because* of this test.** Someone wanted repeatable presidential gestures, found `once: true` load-bearing for the timeline invariant, and built a parallel contract delivering repetition without touching `once`. The `event_types.ts` comment is the fingerprint: *"Kept distinct from `recurrence`: action handlers consume this contract."* That is the shape of a workaround, not of a prohibition. (INFERRED, but it is the only reading that explains all the facts: a fully-built unused feature, a hard test forbidding it, and a second field doing the same job by another route.)

**So I correct my own Q1.** I wrote that the 70/30 recurrence target was "missed." That is incomplete and I withdraw the wording. It is **enforced to zero** by a test whose actual purpose is chronological integrity. Nobody declined to use recurrence; a test made it unusable in the only four files anyone authors into.

That changes the fix. It is no longer "author some recurring events." It is a scoping question:

> **The four `war_199x.json` files are dated historical timelines, and once-only is the correct invariant for them. Recurring presidential content does not belong in those files at all.**

Resolving `Rulebook` §17.5 therefore does not require weakening the timeline invariant — it requires a separate home for standing/recurring content, with the timeline files left exactly as they are. That is a better answer than relaxing the test, and it is the one I'd put to the panel.

### (b) Does the gesture-escalation recommendation survive the test untouched?

**Confirmed — it survives, and by construction rather than by luck.** Itemised against every assertion in the file:

| Assertion | Recommendation #3 | Effect |
|---|---|---|
| `event.once === true` (l.24-28) | `once: true` stays set on all 12 | **passes** |
| no duplicate IDs | no events added or removed | **passes** |
| sorted by `turn_min` | no `turn_min` edited | **passes** |
| `requires_events` ordering | untouched | **passes** |
| `total event count is 159` | count unchanged | **passes** |
| required fields present | untouched | **passes** |

The test never reads `action_cadence`, and `escalation` lives **inside** `action_cadence`. Wiring the three `strategic_posture_review_*` handlers is `src/desktop/` code with no data change at all. Your belief is correct.

And the reason is the point: `action_cadence` was *designed* to be invisible to this test. So #3 is not merely test-compatible — it is the one fix that uses the exact mechanism built to satisfy repeatability without violating the timeline invariant.

**This should move #3 up the ranking, and under the locked line it moves up twice.** The gestures are `source_tier: "design_counterfactual"` and carry an explicit `source_note`: *"Staff-recommendation row only: this abstracts presidential command presence and does not claim a specific historical visit."* They make **no historical claim**. So they are the one category of presidential content that can give a quiet week texture **without fabricating history** — which is precisely the trade the locked line forbids everywhere else. A week in which the only thing a president can do is visit the front, and it changes nothing, *is* the negative-sum experience the game is about.

Revised: **#3 rises above #2.** #2 (authoring 1995 rows) is now gated on the Historian's ledger and bounded by what is citable. #3 is unbounded by sources, already built, test-safe, canon-mandated (`Rulebook` §17.5), and compliant with `MASTER_ROADMAP` §6.1 line 301 including its "once/cooldown rule" clause.

---

## 3. The coverage gap and the odometer layer — I measured it, and it argues against the recommendation I was forming

I was about to recommend splitting D4 into "extend the test to 299 first, as a de-risking gate, then do the bridge." **I ran the checks, and that recommendation is not supported.** Reporting it against my own prior.

Measured across the 140 uncovered events (`war_1992_hrhb_summer.json` + `consequences.json`):

| Invariant the test enforces on 159 | Status in the uncovered 140 |
|---|---|
| No duplicate IDs across files | **0 collisions** with the tested 159; **0 dupes** within the uncovered files |
| `requires_events` targets exist | **0 unknown targets** |
| `requires_events` fires at or after prerequisite | **0 violations** |
| Required fields (`id`, `trigger`, `effect`) | **0 missing** |
| Sorted by `turn_min` | **48 out-of-order pairs** in `consequences.json` (first: `csq_international_disillusionment_1993` t40 → `csq_civic_identity_consolidation_1993` t30) |

**Three of the four semantically load-bearing invariants already hold, unenforced.** The only failure is the sort invariant — and sortedness is file hygiene, not semantics: the engine sorts candidates itself (`evaluate_events.ts:426`, "Sort by priority, trigger week, then event id"), and `consequences.json` is a **conditional consequence library, not a timeline**, so chronological file order is arguably not even the right invariant for it.

**So: the coverage gap is real, but the latent-defect fear it suggests is unfounded.** Extending the test would catch nothing semantic today.

### Revised sequencing answer

**No, the coverage gap does not change how I'd sequence D4 — and specifically, extending the test is *not* a de-risking gate and must not be sequenced as a blocker.** Doing so would buy schedule cost for zero risk reduction.

The D4 risk is exactly what I said originally and the test does not touch it: ~69 events with real mechanical effects firing for the first time ever → calibration drift, requiring its own controlled 188w run under one-change-per-run discipline. That risk is not reduced by an ordering assertion.

What I *do* recommend, decoupled from sequencing:

- **Extend the uniqueness, `requires_events`, and required-field assertions to all 299** as ordinary regression hygiene whenever convenient. Not before D4, not as a gate — the value is preventing *future* drift, and D4 will be the first time these rows carry live traffic.
- **Do NOT extend the `once` assertion to all 299.** All 299 currently have `once: true`, so it would pass today — and that is the trap. Extending it would entrench across the whole catalog the exact constraint that `Rulebook` §17.5 needs relaxed, and would foreclose the "separate home for recurring content" resolution in §2(a) before anyone has ruled on it.
- **Re-scope or drop the sort assertion for `consequences.json`.** It is a library, not a timeline. Enforcing chronological order on it asserts something untrue about what the file is.

---

## 4. Noted for the record — the Srebrenica/Žepa pin

Confirmed, and it is broader than turn_min. The case *"Srebrenica and Zepa fall rows are event-authored territorial receipts"* pins **all** of: `srebrenica_falls_1995.trigger.turn_min === 160`, `pressure.threshold === 8`, the exact `territory_control` trigger condition, the `control_change` faction (`RS`), and the specific OSID list including `op:srebrenica:donji_potocari_2` and `op:srebrenica:bostahovine_2`; plus `zepa_falls_1995.turn_min === 160`, `threshold === 6`, its exact condition, and `osids === ['op:rogatica:zepa_2']`.

That is a comprehensively locked §6 receipt, and it confirms your point: the Historian's date correction to 171/173 is not a data edit, it breaks a deliberate receipt. **Panel, not a lane.** Agreed and recorded.

**One warning I want on the record.** The test does *not* assert on `response_options`. So adding options to `srebrenica_falls_1995` would **pass this test** while contradicting the name of the very case that fences the row — "territorial **receipts**". Nobody should read "the test allows it" as "the design allows it." That gap is a reason to route to the panel, not a permission slip. This applies equally to the `ENDGAME_AND_NEGOTIATION_DESIGN` §6 item 4 divergence I flagged in the original report — the panel should rule on whether that resolved design decision or the shipped receipt is authoritative, and neither the test nor I should pre-empt it.

---

## 5. Net change to my report

| Item | Status |
|---|---|
| Q6 rate target (0.6-0.7 dec/wk, ~30 decisions) | **WITHDRAWN.** Replaced by the sourced-candidate coverage ledger (§1). |
| Q6 "no drought >6 weeks" | **WITHDRAWN**, more firmly — it licenses fabrication where it binds. |
| Q6 "drought length should fall as the campaign advances" | **WITHDRAWN as a target.** Survives only as an *observation* about the drama curve, with no normative force. |
| Q1 "the recurrence target was missed" | **CORRECTED** to "enforced to zero by a chronology test." Changes the fix from authoring to scoping (§2a). |
| Q3 diagnosis (1994 bolus; w145-159 zero authored decisions; COHA vacuum) | **STANDS.** Reinforced — three of five Historian candidates land inside measured droughts. |
| Q4 gesture findings, `action_cadence`, the 3 unwired handlers | **STANDS**, strengthened. `action_cadence` is now explicable as a workaround *for* this test. |
| Q5 odometer diagnosis | **STANDS.** |
| Ranking | **#3 (gestures) moves above #2 (1995 authoring).** #1 (Dayton, two blockers) unchanged. #4 unchanged and explicitly **not** gated on test coverage. #5 unchanged. |
| Dayton double-blocker (`turn_min 190` vs `"weeks": 188`) | **STANDS** — unaffected by any of this, and still the cheapest fix on the list. |

**Revised D2 order:** 1. Dayton ending (both blockers). 2. Gesture escalation + the 3 unwired handlers. 3. Historian ledger for w139-188, then author every AUTHORABLE row. 4. Odometer bridge, after D2, own controlled run. 5. Spike weeks — still not a defect, still do nothing.
