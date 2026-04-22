# HRHB Political Goal — Plan/Data Mismatch Resolution

**Date:** 2026-04-22
**Scope:** Diagnosis only. No code/data changes in this report.
**Blocker:** v0.9.0 Consequence System Chain 2 authoring.

## Problem

Plan `docs/plans/2026-03-24-v090-consequence-system-plan.md` Appendix B (lines 598–601) declares the flag-dependency map:

```
hrhb_political_goal ── croat_republic ──> (historical path)
                   ├── united_front ────> Chain 2 (alliance holds)
                   └── strategic_ambiguity > (weaker Chain 2 variant)
```

But in the 52-week bot-only baseline, `hrhb_political_goal` resolves to `united_front`, not `croat_republic`. Chain 2's gate (`flag_equals: hrhb_political_goal = united_front`) therefore fires on the historical baseline, suppressing 21 Croat–Bosniak war events and breaking the baseline calibration.

## Investigation

### 1. Game data — `data/scenarios/events/war_1992.json`

Three sibling decision events, all with `bot_response_logic: 'historical'`:

| Event | Option 0 | Option 1 | Option 2 | Option 0 historical? |
|---|---|---|---|---|
| `rs_strategic_goals` (L3–151) | `all_six` | `selective` | `aggressive` | Yes — May 12, 1992 Assembly vote |
| `rbih_state_identity` (L153–278) | `civic` | `bosniak_national` | `pragmatic` | Yes — Izetbegović civic platform |
| `hrhb_political_goal` (L280–419) | `united_front` | `croat_republic` | `strategic_ambiguity` | **No** — see below |

The `united_front` option (L303) reads: *"We are Croats and Bosnians… Zagreb will be furious. Tudjman may cut support"* — with `patron_confidence: -25`, `aggression_affinity: -0.7`. The `croat_republic` option (L346) reads: *"Herceg-Bosna is a Croat political entity… Zagreb provides arms, officers, and purpose. The Bosniaks will become adversaries"* — with `patron_confidence: +15`, `aggression_affinity: +0.7`. The historical_source footer (L418) cites *"Tudjman-Boban Zagreb meeting Dec 1991. Kljuić removal Feb 1992"* — both of which were moments when the `croat_republic` line **prevailed** over the united-front faction inside the HDZ-BiH.

### 2. Bot logic — `src/sim/events/bot_response.ts`

```ts
// Historical: always first option (the historical choice)
if (logic === 'historical' || logic === 'accept_first') return options[0];
```

Unambiguous: `'historical'` means **positional index 0**, not a marker lookup. The plan itself restates this on line 379: *"`bot_response_logic: 'historical'` on rs_strategic_goals, rbih_state_identity, and hrhb_political_goal ensures bots always pick Option A (historical)."*

### 3. Sibling consistency check

`rs_strategic_goals` option 0 is `all_six` (historically correct — the May 12, 1992 Banja Luka assembly adopted all six strategic goals as drafted, per the event's own cited ICTY Karadžić Trial Judgment IT-95-5/18-T, 2016).

`rbih_state_identity` option 0 is `civic` (historically correct — Izetbegović's Presidency and the SDA maintained civic multi-ethnic rhetoric through 1992, per the event's own cited Divjak quote and ARBiH ethnic composition data).

The pattern "Option 0 = historical" is followed by 2 of 3 events. `hrhb_political_goal` breaks it.

### 4. Consumer audit — does anything else read option order?

`grep` for `options[0]` / `response_options[0]` across `src/` returned only `bot_response.ts` (5 hits, all within the selection function). `grep` for `united_front | croat_republic | strategic_ambiguity` across `src/` and `data/` returned:

- The event definition itself (war_1992.json).
- Flag values stored as **strings** in save files (`latest_run_final_save.json`, `_baseline_tmp/…/final_save.json`) — schema is `{flag_name: string_value}`, not position-indexed.
- Essay linkage (`data/scenarios/essays/hrhb_political_goal.json`) — keyed by `event_id`, not option index.
- Calibration snapshot `data/calibration/baseline_40w.json` — captures the resolved flag value.
- The plan document itself.

No code or data file reads option **order**; only the resolved flag **value** matters downstream. Reordering is safe at the schema level.

## Historical Finding

Herceg-Bosna's actual political trajectory through 1991–1993 followed the `croat_republic` path, not `united_front`:

- **18 November 1991:** The Croatian Community of Herceg-Bosna was proclaimed at Grude as a "political, cultural, economic and territorial whole" on Bosnian soil, explicitly modeled on the 1939 Banovina borders (ICTY *Prlić et al.* Trial Judgment, Vol. 1, §§438–447, 2013).
- **December 1991, Zagreb:** Tuđman convened Mate Boban and the HDZ-BiH leadership and directed alignment with the Karadžić-led Serb project toward partition. This is the Tuđman-Boban Zagreb meeting cited in the event's own `historical_source` footer.
- **February 1992:** Stjepan Kljuić — the leading proponent of a unified, multi-ethnic Bosnia inside the HDZ-BiH (the real-world "united_front" voice referenced in the event narrative) — was forced out as party president and replaced by Miljenko Brkić, aligning the party with Boban and Zagreb (ICTY *Kordić & Čerkez* Trial Judgment, §491, 2001, cited in the event footer; see also Marko Attila Hoare, *How Bosnia Armed*, 2004, ch. 3).
- **3 July 1992:** Boban proclaimed the Croatian Republic of Herceg-Bosna with its own presidency, defense department, and currency (ICTY *Prlić et al.* Trial Judgment, Vol. 1, §§455–464).
- **Outcome:** The ICTY *Prlić et al.* judgment (2013, upheld 2017) found a Joint Criminal Enterprise whose purpose was the ethnic consolidation of Herceg-Bosna as a Croat entity for eventual annexation to Croatia — exactly the `croat_republic` option's language.

Burg & Shoup (*The War in Bosnia-Herzegovina*, 2000, pp. 73–77, 135–138) describe the same arc: HDZ-BiH's "moderate" Kljuić wing was decisively marginalized by Herzegovinian hardliners backed by Zagreb well before the open HVO–ARBiH conflict of 1993.

**Conclusion:** `croat_republic` is the historically attested choice. `united_front` represents the counterfactual "Kljuić wins" branch.

## Diagnosis

The bug is in the **game data**. The `hrhb_political_goal` response_options are ordered contrary to the project-wide convention (Option 0 = historical) that the plan, the `historical` bot logic, and the two sibling events all assume.

- **Not the plan:** Appendix B correctly identifies `croat_republic` as historical.
- **Not the bot logic:** `'historical'` = `options[0]` is consistent with intent and with the other two events.
- **The data:** `hrhb_political_goal` has `united_front` in slot 0 where `croat_republic` belongs.

## Minimal Fix Proposal — Option A (Reorder)

Swap options 0 and 1 in `data/scenarios/events/war_1992.json` so the array becomes:

```
[croat_republic, united_front, strategic_ambiguity]
```

- Line range affected: ~L301–L417 of `war_1992.json`.
- No field renames, no schema change, no new code.
- Flag values remain string-keyed (`"croat_republic" | "united_front" | "strategic_ambiguity"`).

Option B (marker field `is_historical: true`) would require touching `EventResponseOption` in `event_types.ts`, `pickBotResponseV1`, and adding the marker to every existing `'historical'` event — larger blast radius, and changes a working contract for two already-correct events.

Option C (re-gate Chain 2 on a different trigger) leaves the data bug in place and is the wrong layer of fix — the data is simply wrong.

**Recommended: Option A.**

## Regression Risk

- **Code readers of option order:** None found outside `bot_response.ts`. Confirmed via `grep -rn "response_options\[0\]\|options\[0\]" src/`.
- **Flag consumers:** All read the **string value** of `hrhb_political_goal`, not the index. Safe.
- **Save-game compatibility:** Flag values persist as strings in save JSON (`latest_run_final_save.json` L407060: `"hrhb_political_goal": "united_front"`). An in-flight save taken before the reorder would replay correctly — the bot would now pick `croat_republic` on a fresh run, but an existing save that already recorded `"united_front"` is still a valid enum value and Chain 2 gates would still evaluate correctly against it.
- **Calibration baseline:** `data/calibration/baseline_40w.json` L43 captures the current (wrong) resolution. After the fix, the baseline flag will be `croat_republic` and Chain 2 will correctly **not** fire on the historical run. This is the desired behavior — Chain 2 should only fire on ahistorical player choices.
- **Essays:** `data/scenarios/essays/hrhb_political_goal.json` is keyed by `event_id`, not option index. Safe.
- **Tests:** None of the 3513 tests reference these option ids by position (worth a `grep` confirmation pre-commit, but none surfaced in the search above).
- **Narrative UI:** The `label` and `description` strings travel with each option object; reordering the array does not reorder the text-to-option binding.

**Net risk:** very low. The fix is a one-hunk JSON edit. Recommend smoke-test triad (`tsc --noEmit` + `vitest run` + `desktop:map:build`) plus one 52w scenario run to confirm `hrhb_political_goal` now resolves to `croat_republic` and the 21-event Croat–Bosniak chain fires on the baseline as intended.
