# §6 PACKET — Ring-3 half-migration in two atrocity events — PANEL PASSED, NOT IMPLEMENTED

**Date:** 2026-08-31 · **Status:** QUEUED. Panel ruled; nothing edited. Awaiting owner go-ahead.
**Panel:** unanimous GO on a **standard four-seat** §6 packet. Does not cross the bright line.
**Origin:** surfaced while authoring a missing `historical_default_response_id` for the playthrough
harness. Not caused by that work.

---

## The defect

Commit `3c2e8a47f` (2026-08-01, "fix(content): enforce R7 provenance and Ring-3 gates") relabelled
Ring-3 player options and rewrote their `sets_flags`, but left their **ids** and their
**`dimension_shifts`** untouched. Its own ledger entry says the change "retains ... event/response
ids" — id retention was DELIBERATE — and that only "option-level humanitarian and positive-morale
effects are removed", i.e. `dimension_shifts` were never in scope. A scope gap, not sloppiness.

All figures below verified by `git show` against `0ab531262` and HEAD.

### 1. `drina_cleansing_decision_1992` — mispriced, honestly worded

| | `0ab531262` (original) | HEAD |
|---|---|---|
| `systematic` label | "Systematic cleansing" | "Open command-accountability proceedings" |
| `systematic` effects | war_crimes_delta 5, morale +3 | `[]` |
| `systematic` dims | intl −25, cohesion **+5**, terr_legit −10 | intl **−25**, terr_legit **−10** |
| `restrained` label | "Military objectives only" | "Impose immediate civilian-protection restraints" |
| `restrained` effects | war_crimes_delta 1 | `[]` |
| `restrained` dims | intl −5, cohesion −10, mil_cred −5 | *unchanged* |

Both options are priced for a choice-set that no longer exists. The choice also lost ALL mechanical
consequence — the war-crimes differential (5 vs 1) is gone, and `drina_command_accountability` is
**written by these two options and read by nothing at all** (its only occurrences in the repo are
the option definitions).

**Net effect today:** RS pays **−25** international standing for opening command-accountability
proceedings — the joint-worst RS outcome in the game, tied with repudiating Dayton — versus **−15**
for denying the camps exist, and **+8** for "Always deny paramilitary deployment". The corpus's own
grammar says restraint earns standing; this row charges the largest penalty in the game for it.

### 2. `rs_strategic_goals` option `aggressive` — THE MORE SERIOUS ONE

| | `0ab531262` | HEAD |
|---|---|---|
| label | "Pursue with maximum force" | "Centralize operational command" |
| dims | mil_cred +15, cohesion +15, intl −15 | **byte-identical** |

**16 downstream events gate on flag value `aggressive`**, including
`csq_accelerated_camps_discovery_1992` ("The Camps Are Found"),
`csq_early_war_crimes_tribunal_1993`, `csq_early_nato_threshold_1994` and
`rs_paramilitary_policy_1992`.

The option reads as administrative reform and **is** the maximum-atrocity branch of the causal
graph. Ring 3 forbids the player authorising cleansing by name; here they can select that branch
believing they are centralising command. Drina is a bad number on an honest label. This is a
mislabelled atrocity branch.

### 3. The test certifies both, and pins the bot's choice

`tests/sensitive_history_player_choice_content.test.ts`

- `:40-43` asserts `aggressive` has label "Centralize operational command" AND flag `aggressive`
  in one `toMatchObject` — it **certifies** the id/label mismatch as correct.
- `:65-68` `toEqual` on the full drina label array — exactly two options, in that order.
- `:70-73` asserts NO option carries a `humanitarian_impact` effect.
- Reads `dimension_shifts` and option `id`s **nowhere**.

A migration-completion test that checks exactly the half that got migrated. Because it locks
accountability at `options[0]`, it is also *why* the bot picks it every run.

### 4. Array-position resolution — exactly one event

`pickBotResponseV1` returns `historicalDefault ?? options[0]`. `drina_cleansing_decision_1992` is
the ONLY event in the corpus with `bot_response_logic: 'historical'`, more than one option, and no
`historical_default_response_id` — 60 of its 61 peers have one. Confirmed in n390's
`event_decision_log`: 73 decisions, 57 `bot_ai_default`, 15 `bot_political`, **1 `bot_v1`** — this
row, `systematic`, RS, turn 11. Every calibration baseline encodes an atrocity-decision outcome
chosen by JSON ordering. `event_taxonomy_report.ts:736` only checks the reverse direction.

---

## Panel verdicts

| Seat | Verdict |
|---|---|
| Historian | Drina: **leave default unauthored** — no option matches the record. Separately: `milosevic_isolation_warning_aug92` → `acknowledge_pressure` |
| canon-compliance-reviewer | **NON-COMPLIANT**. Standard four seats. Repair (b) + author the default |
| game-designer | **GO** on (b)+(c)+default+loader guard. **BLOCK** on (a), "no in any packet" |
| war-or-game | **GO**, four seats, conditional on scope expanding to `aggressive` |

**Unanimous on breadth: FOUR seats, not eight.** The bright line is "atrocity is never rewarded";
the data currently inverts that, so repairing it moves *toward* stated canon. The eight-seat panel
exists to CROSS the line, not to restore it. Atrocity remains event-owned in the Ring-2
`drina_valley_ethnic_cleansing_1992` per H1.8 — which fires on territory + JNA withdrawal,
**independent of this decision**, so the campaign proceeds whichever option is chosen.

**Historical ruling (Historian).** Paper orders were issued — Karadžić's order on application of
the international law of war, 13 June 1992 — but genuine chain-of-command accountability was not
opened: ICTY *Karadžić* IT-95-5/18-T Trial Judgement, 24 March 2016, JCE conviction on the
Municipalities component covering Zvornik/Višegrad/Foča, with findings of leadership knowledge and
failure to punish (life on appeal, 20 March 2019). Nor did civilian-protection restraint take hold:
BB1 p.196, p.201. The actual posture was a third thing not on the menu: written orders for the
record while the campaign proceeded. Caveat recorded by the Historian: the late-July 1992 Zvornik
Yellow Wasps subordination would strengthen a `restrained` reading but could NOT be corroborated
from the repo BB corpus — do not cite BB for it without running
`balkan-battlegrounds-historical-extractor`.

**Open disagreement.** Historian says leave the default unauthored; canon and design say author it.
Design's counter, which the integrator finds stronger: the omission dates to the original
2026-03-22 authoring, not the migration, so there is no prior deliberate "we decline to name it"
decision to respect — and unauthored is not neutrality, it is a ruling made by array position and
invisible in the JSON.

**Option (a) — restore the deleted `systematic` atrocity option — is REFUSED**, with three
independent locks: canon Ring 3 #1, the label `toEqual` test, and `isDirectRefusedSensitiveChoice`
(which refuses the old prose via `/\bmaximum\s+displacement\b/`), plus recorded deliberate intent.

---

## Scope if adopted

1. Re-price all four options against corpus grammar — do not patch only the number that got noticed.
2. Rename id `systematic`. **Do NOT** change flag VALUE `aggressive` without updating all 16 gates —
   option id and flag value are separable, and the conditions read the value.
3. Relabel `aggressive` honestly, or explicitly defer it with a named owner. Shipping the Drina fix
   alone leaves a worse instance certified green by the same test file.
4. Author `historical_default_response_id` on drina — the last positional resolution in the game.
5. Amend `sensitive_history_player_choice_content.test.ts` to assert `dimension_shifts` and option
   `id`s, or this recurs on the next content migration. Canon seat signs the amendment.
6. Consider adding the third option (design seat's (c)): the historical posture is not on the menu,
   and the engine already produces it by accident, unlabelled and mispriced.

## Verification required

**188w with `control_delta` diffed. 40w is a false-green here.** `international_standing` feeds
op-launch hesitation (`sector_offensive.ts:262`), which gates operations, which take territory. That
channel is turn-gated at `INTL_STANDING_OPS_HESITATION_MIN_TURN = 100` and thresholded at `< 30`,
so a t11 shift is *probably* inert — but probably is not measured. In n390 RS
`international_standing` is base 0 / event_modifier −110 / effective clamped at 0, so the endgame is
likely inert while t11–t100 is not.

**Useful precedent:** `3c2e8a47f`'s ledger records that stripping this row's effects changed exactly
four hashes (end_report, final_save, run_summary, weekly_report) and left control/formation/activity
unchanged — a prior for a bounded, deliberate baseline change on this exact event.

**Optics:** reducing −25 will read in a diff as softening an atrocity penalty. The repair entry MUST
cite the `0ab531262 → 3c2e8a47f` provenance so that reading is not available to a future reviewer.

## Logged separately — not this packet's problem

Four of eighteen endgame dimension values are rail-saturated: RS and HRHB `international_standing`
pinned at 0, RBiH `international_standing` and `negotiating_leverage` pinned at 100.
`international_standing` is a dead signal at Dayton for two of three factions. Same class as the
exhaustion de-saturation work. Needs an owner.
