# Adjudication — does an AWWV campaign have a reachable ending?

**Scenario-tester verdict, 2026-09-05.** No code or data changed. No new scenario run —
everything below is read off disk from `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390/final_save.json`
and the working tree at `main` (58f8031d7).

**Headline: D1 as written is WRONG.** The campaign HAS a reachable, resolvable ending, and it is
the one the player actually plays. But it is reachable on **only one of the three paths**, and the
correct statement of the defect is materially different from "the campaign has no ending".

---

## 1. Verification of A / B / C

### A. The event chain is dead — CONFIRMED, and worse than stated

MEASURED, every claim holds:

- `src/sim/events/event_types.ts:830-832` — `case 'flag_not_set': { const flags = state.military.event_flags ?? {}; return !(condition.flag in flags); }`. Key-presence test. Confirmed verbatim.
- `coha_expires_1995` (`data/scenarios/events/war_1995.json`, turn_min 156 / turn_max 158) has `sets_flags: {"coha_active": false, "coha_expired": true}` — it INSERTS the key. (You had the `coha_expired` half missing; immaterial.)
- `final_save.json`: `'coha_active' in military.event_flags === true`, value `false`. `coha_expired === true`. So `flag_not_set` returns `false` from w156 onward, forever.
- `ceasefire_1995` never fires. `fired_event_ids` (177 entries) does not contain it.
- No event in the 299-event catalog (6 files: `consequences.json`, `war_1992.json`, `war_1992_hrhb_summer.json`, `war_1993.json`, `war_1994.json`, `war_1995.json`) contains the string `war_ended_early`. Exhaustive full-JSON substring scan of every event object, not a field grep. CONFIRMED.
- `war_ended_early` has exactly one writer in `src/`: `src/sim/negotiation/peace_plans.ts:514`. CONFIRMED.
- `dayton_signed` has exactly one reader and zero non-event writers in `src/`: read at `src/sim/turn_pipeline.ts:88`; written only by the `dayton_signed_1995` event's `sets_flags`. CONFIRMED.

**Three additions you did not have, and one matters a lot:**

1. **`flag_not_set` is the ONLY thing blocking the chain.** Every other precondition of
   `ceasefire_1995` is satisfied in the measured run: `requires_events: ["federation_ground_offensive_1995"]`
   → FIRED at t172. `turn_min 181 / turn_max 200` → the 188w horizon is inside the window.
   Downstream, `dayton_talks_begin_1995` (t184-210) needs `rbih_state_identity ∈ {civic, bosniak_national, pragmatic}`
   → measured `civic`. `dayton_signed_1995` (t184-215) needs only `dayton_talks_begin_1995`.
   So fixing the one condition operator WOULD light up ceasefire → talks → signed inside 188 weeks.
   That is a real, single-point fix — not a tangle.

2. **But two of the five events are out of horizon regardless.**
   `rs_dayton_acceptance_1995` and `hrhb_dayton_acceptance_1995` both carry **`turn_min: 190`** on a
   **188-week** scenario. They can never fire on the shipped campaign length even with the flag bug
   fixed. That is a SECOND, independent content defect the D1 report did not identify, and it is not
   fixed by the operator change. (Measured from `war_1995.json`.)

3. **`dayton_signed_1995` firing would be actively harmful today** — see §4 below. This is the
   most consequential correction in this report.

Also dead-by-dependency, worth naming because it is player-visible content:
- `src/ui/warroom/content/ticker_events.ts:435,438,439,441,442` — five post-Dayton ticker lines at
  turns 203-207, all `requiresEventId: 'dayton_signed_1995'`. Unreachable on a 188w campaign twice
  over (event dead AND turn > 188).
- `src/sim/codex/dynamic_section_builder.ts:474-478,626` — Codex dynamic sections branch on
  `dayton_signed_1995` having fired; they permanently take the "no Dayton" branch.

### B. Two game_over routes — CONFIRMED, and there is a THIRD you did not list

- **Route 1 (DEAD): CONFIRMED.** `src/sim/turn_pipeline.ts:88-91`. Gated on `dayton_signed`, written
  only by the dead event. Dead today.
- **Route 2 (LIVE): CONFIRMED.** `src/sim/turn_phases/war_phase_negotiation_steps.ts:67-79`
  (`evaluate-dayton-trigger`) → `shouldInitiateDayton` (`src/sim/negotiation/dayton_negotiation.ts:96-120`)
  → `warWeek >= effectiveDaytonTriggerWeek(state)` (`:73`), `DAYTON_TRIGGER_WEEK = 188` (`:54`),
  `DAYTON_TRIGGER_WEEK_CLOSE_OUT = 180` (`:66`), gated on `meta.dayton_close_out` (`:73`). Sets
  `negotiation.pending_dayton = menu` (`war_phase_negotiation_steps.ts:77`). CONFIRMED.
  Route 2 has **two** consumers, not one:
    - **2a — desktop player:** IPC `resolve-dayton` (`src/desktop/electron-main.cjs:3437-3453`) →
      `resolveDaytonNegotiation` → `meta.game_over = true`, `meta.outcome = 'dayton'`
      (`dayton_negotiation.ts:463-464`), `delete neg.pending_dayton` (`:476-478`),
      `freezeEndgameSnapshot(state)` (`:483`).
    - **2b — headless close-out:** `resolvePendingDaytonCloseOut` (`dayton_negotiation.ts:216-231`),
      called from `src/scenario/scenario_runner.ts:3144` in the post-loop. Gated on
      `meta.dayton_close_out !== true` → returns null (`:217`). Flag set only at
      `scenario_runner.ts:1716-1718` from `scenario.dayton_close_out`.
- **Route 3 (you listed the pieces but not as a route):** `war_termination.ts` via the
  `check-victory-conditions` step (`war_phase_negotiation_steps.ts:29-42`) →
  `applyWarTermination` (`war_termination.ts:186-192`).
  Your reading of `:74-83` (`war_ended_early`) and `:91-100` (`turn_limit`) is correct.
  **`DEFAULT_MAX_TURNS = 208` (`war_termination.ts:14`)** — so on a 188-week campaign the turn-limit
  route CANNOT fire either. It is 20 weeks past the horizon. That closes the last "well, something
  ends it" escape hatch for the headless path.

### C. The 188w final state — CONFIRMED exactly

Re-measured from `final_save.json`:

```
meta.turn 188 · war_start_turn 0 · max_turns undefined · game_over false · outcome undefined
meta.dayton_close_out undefined · decision_mode 'historical' · player_faction undefined
negotiation.pending_dayton PRESENT · negotiation.dayton_result undefined
event_flags: 'coha_active' key present = false · 'dayton_signed' absent · 'war_ended_early' absent
endgame_snapshot ABSENT
```

Every one of your C facts is correct. I add: **`endgame_snapshot` is absent** — no verdict, no cost
ledger, no historical comparison was ever frozen. That is the concrete artifact of the non-ending.

**Ordering note (INFERRED from code, MEASURED consistent):** `turn_pipeline.ts:141-145` increments
`meta.turn` BEFORE running `warPhases`, and `warPhaseNegotiationSteps` sits at
`war_phases.ts:4326`. So the trigger evaluates with `turn === 188` during the final simulated turn —
the menu opens on the last turn, exactly as the `DAYTON_TRIGGER_WEEK` doc-comment
(`dayton_negotiation.ts:48-53`) already admits.

---

## 2. Does a campaign have a reachable ending today? — differs across all three paths

### (a) Headless / calibration path — **NO ENDING.** Confirmed broken.

`sim:scenario:run:188w` → `data/scenarios/apr1992_definitive_188w.json`, which does not set
`dayton_close_out`. Therefore:
- Route 1 dead (event chain).
- Route 2 opens the menu at t188 and nothing consumes it — `resolvePendingDaytonCloseOut` returns
  `null` at its first line (`:217`).
- Route 3 turn-limit needs t≥208; horizon is 188.

The run terminates because the **for-loop runs out of weeks**, not because the war ends. `game_over`
is false, `outcome` undefined, no `endgame_snapshot`. This is a freeze-frame.

### (b) `dayton_close_out` variant — **YES, ends properly. But nothing ships it, and the file has drifted.**

`data/scenarios/apr1992_definitive_188w_dayton_close.json` sets `"dayton_close_out": true` (`:7`) and
`"decision_mode": "emergent"` (`:6`). Trigger pulls to w180, menu opens with 8 turns of air, post-loop
`resolvePendingDaytonCloseOut` resolves it via `buildHistoricalDefaultDaytonProposal` →
`game_over: true`, `outcome: 'dayton'`, `dayton_result` written, `endgame_snapshot` frozen.

Two problems:

1. **No shipped run command uses it.** `package.json` has exactly one 188w script — `sim:scenario:run:188w`
   (`package.json:54`) — pointing at the base scenario. The close-out scenario is exercised only by
   `tests/dayton_headless_close_out.test.ts` and `tests/dayton_close_out_desktop_parity.test.ts`.
   `docs/plans/2026-07-31-command-event-codex-convergence-plan.md:414` calls
   `resolvePendingDaytonCloseOut` "currently unreachable production code covered by a passing test
   suite (a false-green)". **That claim is half-wrong and worth correcting:** the call site at
   `scenario_runner.ts:3144` is unconditional and genuinely live — the function is reachable the
   moment a scenario sets the flag. It is not unreachable code; it is **live code no shipped
   invocation reaches**. Different defect, different fix.
2. **The close-out scenario has DRIFTED from the base.** Diffed the two JSONs: the close-out file is
   missing `calibration_scenario: true`, missing `firepower_deficit_penalty_enabled: true`, and is
   missing six `osid_control_overrides` present in the base (`op:travnik:paklarevo`,
   `op:zvornik:djulici`, `op:donji_vakuf:jemanlici`, `op:kladanj:brgule`, `op:kladanj:vucinici_2`,
   `op:srebrenica:brezovice_2`). It is a stale fork. **Any territorial figure it produces will not
   match the current floor**, so it cannot be used as a drop-in "same run, but it ends" comparison
   without re-syncing it first. Flag this before anyone runs it expecting 639.

### (c) Packaged-Electron player path — **YES. This one works, and it is the path R8 exercises.**

MEASURED chain:
- New campaign loads `data/scenarios/apr1992_definitive_188w.json` via a baked startup snapshot
  (`src/desktop/desktop_sim.ts:129,133,284`); `startNewCampaign` sets `player_faction`,
  `decision_mode`, `autonomy_level = 2` (`:325-347`). It does **not** set `dayton_close_out` →
  trigger week is 188.
- The desktop has **no week horizon**. `advanceTurn` (`desktop_sim.ts:365+`) just calls `runTurn`.
  The 188 in the scenario is a scenario-runner loop bound, not a state field.
- At the turn that lands on `meta.turn === 188`, `evaluate-dayton-trigger` writes `pending_dayton`.
- `pending_dayton` becomes a **blocking** player decision (`src/state/player_decision_manifest.ts:79-88`
  family `dayton_negotiation`, `gatePolicy: 'modal_required'`; `singletonInstance` returns
  `instance(family, 'dayton:'+turn, true)` — `true` is the blocking flag, `:251-266`).
- `advance-turn` IPC hard-refuses while a blocking decision exists
  (`src/desktop/electron-main.cjs:2317-2331`, `error: 'pending_required_decisions'`).
- `App.tsx:2035-2036` renders `<DaytonNegotiationModal>` whenever `pendingDayton && !gameOver`.
- Player submits → `resolve-dayton` → `game_over`, `outcome: 'dayton'`, `dayton_result`,
  `freezeEndgameSnapshot` → `computeFullVerdict` sees `neg.dayton_result` and returns
  `outcomeType: 'dayton'`, label "Dayton Agreement" (`src/sim/negotiation/scoring.ts:885-887`) →
  `VerdictScreen.tsx:540,888-940` renders the full Dayton verdict.

**The player's campaign ends, on the intended climax, with the intended verdict screen.** The
`DAYTON_TRIGGER_WEEK = 188` "final turn" concern does **not** bite here: resolution is an IPC call
driven by a modal, not something that needs a subsequent turn. The player never needs a 189th turn.

---

## 3. Is the t188 state correct for a calibration run, or a stall? — **A STALL. And the D2 "zero pending decisions" claim measures a different register.**

It is a stall, unambiguously. `pending_dayton` is by construction a **request awaiting a receipt**:
the manifest declares `statePath: 'military.negotiation.pending_dayton'` with
`receiptPath: 'military.negotiation.dayton_result'` (`player_decision_manifest.ts:81,87`). Present
request + absent receipt + `game_over: false` is the definition of unresolved. It is also, by the
manifest's own logic, a **blocking** decision — the terminal-state neutralizer at
`player_decision_manifest.ts:400-405` only downgrades instances to non-blocking `if (game_over === true)`,
and here it is false. So a calibration run ends holding a blocking player decision open.

Whether that's *harmful* to calibration is a separate question and the answer is no: the
territorial numbers are already final by then, and `resolveDaytonNegotiation` never repaints OSID
control (it computes only a split %, per `scenario_types.ts:87-88` and the ledger). Calibration is
unaffected. But "unaffected" is not "correct terminal state" — the run cannot produce a verdict,
a Pyrrhic grade, or a cost ledger, because `freezeEndgameSnapshot` is never reached.

**Reconciling the D2 report.** The two "pendings" are **different registers, and the D2 report never
looked at the Dayton one.** `docs/40_reports/playtests/20260901_d2_full_campaign_all_three_factions.md:88`
("Zero pending decisions, zero unresolved authorizations") is sourced from
`tools/ai_play/parity_probe.ts`, which reports exactly two things
(`parity_probe.ts:262-266`): `military.pending_event_decisions` (the event inbox) and
`meta.pending_proposal_reviews` (operation authorizations). It never reads
`military.negotiation.pending_dayton` and never calls `summarizePlayerDecisions` /
`listBlockingPlayerDecisions` — the string `dayton` does not appear in the file.

So the D2 claim is **true as measured and silent on Dayton**. It is not a contradiction; it is a
coverage gap. The report's title, "week 0 to Dayton", is accurate about the calendar and inaccurate
about the ending — the probe walked up to week 188 and stopped; it never resolved anything.
**Recommendation: the D2 instrument should assert `blockingCount === 0` from the shared manifest, not
from two hand-picked fields.** That is the check that would have caught this.

---

## 4. D1, restated correctly

Not (i). Closest to (ii), but (ii) is still imprecise because it understates the risk in route 1.
The accurate statement is:

> **D1 (restated).** The campaign's ending is reachable and correct on the **player path**: at week 188
> the Dayton negotiation menu opens, hard-gates turn advance, and resolving it produces
> `game_over`/`outcome: 'dayton'`/a frozen verdict. What is broken is everything around it:
> **(a)** the five-event Dayton narrative chain never fires — a single mis-specified condition
> operator (`flag_not_set` is key-presence, but `coha_expires_1995` sets the key to `false`) kills
> `ceasefire_1995` and everything downstream of it, so the climax arrives with **no narrative
> framing at all**; **(b)** two of those five events (`rs_/hrhb_dayton_acceptance_1995`,
> `turn_min: 190`) are out of horizon on a 188-week campaign and would stay dead even after (a) is
> fixed; **(c)** the **headless/calibration path has no ending at all** — the menu opens on the final
> turn and nothing consumes it (`DEFAULT_MAX_TURNS = 208` puts the turn-limit fallback 20 weeks out
> of reach), so calibration runs terminate by exhausting a for-loop, holding an open blocking
> decision, with no `endgame_snapshot`; and **(d)** `turn_pipeline.ts:88` is not merely dead — if (a)
> is fixed naively it becomes **live and actively destructive** (see below).

**Player-visible consequence at w188 (packaged Electron, the R8 path):**
The war simply stops. There is no ceasefire announcement, no "talks begin at Wright-Patterson",
no Holbrooke framing beyond the one orphaned `holbrooke_ceasefire_demand_oct95` that does fire
(t183, MEASURED). The Dayton negotiation modal appears cold, with no narrative run-up, and turn
advance is blocked until the player answers it. The player gets the mechanism of the ending
without the story of it. That is a real defect and it is the one worth fixing — but it is a
**narrative/content** defect, not "the game cannot end".

---

## 5. Severity and correct fix for `flag_not_set`

**Demote from P0 to P1 — but do not fix it as a one-liner, because the naive fix regresses the
working ending.**

Severity: the bug does not prevent the campaign from ending on the path a player takes. It
suppresses the entire narrative closure of the game's climax, plus the post-Dayton Codex sections
(`dynamic_section_builder.ts:474-478,626`) and five ticker lines. That is serious for a game whose
entire thesis is authorship of a tragedy — but it is not "no ending", and it is not release-blocking
in the way D1 implied. **P1, narrative/content, owned by the event lane.**

### The trap: fixing `flag_not_set` alone would BREAK the working ending

This is the finding I would most want acted on. Trace it:

1. Fix the condition → `ceasefire_1995` fires ~t181, `dayton_talks_begin_1995` ~t184,
   **`dayton_signed_1995` ~t184-185**, which sets `event_flags.dayton_signed = true`.
2. On the **next** `runTurn`, `turn_pipeline.ts:88-91` fires: `game_over = true`,
   `outcome = 'dayton_agreement'`. This happens at roughly **week 185**.
3. `shouldInitiateDayton` returns `false` when `meta.game_over` (`dayton_negotiation.ts:98`).
   **The Dayton negotiation menu now never opens.** The player never sees the modal, never makes
   the territorial/institutional choices, never gets a `dayton_result`.
4. `turn_pipeline.ts:88-91` **does not call `freezeEndgameSnapshot`**. The endgame-snapshot contract
   at `src/sim/endgame/endgame_snapshot.ts:10-17` names exactly three legitimate writers
   (`peace_plans.ts:520`, `dayton_negotiation.ts:483`, `war_termination.ts:190`). Route 1 is an
   undocumented **fourth** game-over writer that honours none of them.
5. `computeFullVerdict` (`scoring.ts:883-895`) then sees no `dayton_result`, and
   `outcome === 'dayton_agreement'` matches **none** of its branches (`ceasefire*`, `peace_plan*`,
   `victory_*`, `timeout_stalemate`) → `outcomeType: 'termination'`, `outcomeLabel: 'War Ended'`.
   The VerdictScreen's whole `daytonResult` block (`VerdictScreen.tsx:888-940`) renders nothing.

**Net: fixing the flag bug in isolation trades a narrative gap for a gameplay regression — it would
delete the playable Dayton negotiation and replace the climax with a silent auto-game-over three
weeks early, labelled "War Ended".** Anyone who fixes the operator without touching
`turn_pipeline.ts:88` will ship that.

### Recommended fix, in order

1. **Remove `turn_pipeline.ts:88-91` first, as its own change.** It is dead code today, so removal is
   a provable no-op on every current path (verified: `dayton_signed` has no other writer in `src/`,
   and the flag is absent from the measured 188w save). It is *not* a second route worth repairing —
   it bypasses the endgame-snapshot contract, produces an outcome string no consumer understands,
   and pre-empts the real, richer route 2. Repairing it would mean duplicating
   `resolveDaytonNegotiation`'s entire postlude, at which point it is the same route. **Delete it,
   and let `dayton_signed_1995` be what it should be — narrative framing that *precedes* the
   negotiation, not a termination trigger.** Note the endgame-snapshot doc-comment lists three
   writers and this is a fourth; the comment is currently wrong and should be left correct.
2. **Then fix the condition.** Two clean options, panel's call:
   (a) change `ceasefire_1995`'s condition to `{"type":"flag_equals","flag":"coha_active","value":false}`
   — data-only, one file, no engine change, no other event affected; or
   (b) redefine `flag_not_set` as "absent OR falsy" in `event_types.ts:830-832` — engine change,
   affects every other `flag_not_set` user, needs an audit of all of them first.
   **I recommend (a).** It is the narrower blast radius, and `flag_equals` already exists and is
   already used elsewhere in this same file. Changing the operator's semantics engine-wide to fix
   one authoring mistake is the larger risk.
3. **Fix the two out-of-horizon events.** Pull `rs_/hrhb_dayton_acceptance_1995` from `turn_min: 190`
   to ≤188, or accept them as dead and delete them. They cannot fire as authored.
4. **Separately, decide the headless ending** — see §6.

Do **not** bundle 1-4. Step 1 is a no-op-by-proof; step 2 changes event firing at t181-188 on every
188w run and needs its own before/after.

---

## 6. `DAYTON_TRIGGER_WEEK = 188` on a 188-week scenario

**Yes on the headless path; no on the player path. The two need different answers.**

- **Headless:** exactly right, and the code already says so. `dayton_negotiation.ts:48-53`:
  *"On a 188-week horizon this lands on the FINAL turn, so the menu opens but there is no turn left
  to negotiate across — the campaign freeze-frames on an open menu."* MEASURED: that is precisely
  the state in `final_save.json`. And yes — that is exactly why `dayton_close_out` pulls it to 180
  (`:56-64`: *"giving the negotiation ~8 turns of air before the 188-week horizon instead of a single
  final-turn snapshot"*).
- **Player:** the "no turn left" framing does not apply. Resolution is a modal + IPC call, not a
  turn-consuming action, and the desktop has no 188 cap anyway. The player resolves it in place on
  turn 188 and the game ends there. Nothing is lost.

**Does any shipped campaign path use the close-out scenario? NO.**
- `package.json:54` — the only 188w script points at the base scenario.
- `src/desktop/desktop_sim.ts:129` — `NEW_GAME_SCENARIO_RELATIVE = 'data/scenarios/apr1992_definitive_188w.json'`;
  `electron-main.cjs:2230-2231` rejects any `scenarioKey` other than `apr_1992`. The desktop cannot
  be pointed at the close-out variant at all.
- Only `tests/dayton_headless_close_out.test.ts`, `tests/dayton_close_out_desktop_parity.test.ts`,
  and `tests/scenario_loader_dayton_close_out.test.ts` touch it.

So `dayton_close_out` is a **tested, working, unshipped** mechanism. The convergence plan already
flagged this (`docs/plans/2026-07-31-command-event-codex-convergence-plan.md:414`) but mis-diagnosed
it as unreachable code; the accurate diagnosis is an unreached-but-live path.

**Recommendation for the headless path:** rather than shipping a second scenario, consider making
the post-loop close-out unconditional when the loop reaches its horizon with a `pending_dayton`
open. `resolveDaytonNegotiation` provably does not repaint OSID control (only a split %), so the
territorial baseline — the thing calibration measures — is untouched; what changes is that the run
gains `game_over`, `outcome: 'dayton'`, a `dayton_result`, and a frozen `endgame_snapshot`, i.e. a
verdict and a Pyrrhic grade for every calibration run. That is a decision for the calibration owner,
not mine to make, and it would move `final_state_hash` (observational fields), so it needs the usual
one-change-per-run treatment. But the current alternative — every calibration run ending in a
verdict-less freeze-frame — is not obviously the cheaper option.

If the close-out scenario is kept instead, **re-sync it with the base first** (§2b): it is missing
`firepower_deficit_penalty_enabled`, `calibration_scenario`, and six OSID overrides.

---

## Summary table

| Path | Ends? | Mechanism | Verdict/snapshot? |
|---|---|---|---|
| Headless `sim:scenario:run:188w` | **NO** | loop exhausts at w188, `pending_dayton` open, `game_over: false` | none |
| `..._dayton_close.json` (unshipped, drifted) | YES | trigger w180 → post-loop `resolvePendingDaytonCloseOut` | full |
| Packaged Electron (R8) | **YES** | menu at w188 → modal → `resolve-dayton` IPC | full |
| Event chain (all 3 paths) | n/a | dead at `ceasefire_1995`; 2 of 5 also out of horizon | n/a |
| `turn_pipeline.ts:88` route 1 | dead | would be destructive if revived | **none — bypasses contract** |

**Three things I would act on, in this order:** (1) delete `turn_pipeline.ts:88-91` before anyone
touches the flag bug; (2) fix `ceasefire_1995`'s condition as data, and the two `turn_min: 190`
events; (3) give the headless path an ending, by whichever of the two routes the calibration owner
prefers. And separately: point the D2 instrument at the shared decision manifest so the next
"zero pending decisions" claim means what it sounds like it means.

---

## Addendum — writer searches completed exhaustively over `data/` as well

Both absence claims in §1 re-verified against `data/` (the §1 searches covered `src/` only for
`dayton_signed`):

- `dayton_signed` is written in exactly ONE place in the whole repo: `data/scenarios/events/war_1995.json:2565`,
  inside `dayton_signed_1995`'s `sets_flags`. No engine writer. Confirms route 1 is dead today and
  that deleting `turn_pipeline.ts:88-91` is a provable no-op.
- One more piece of authored content is suppressed by the dead chain: **`data/scenarios/essays/dayton_signed_1995.json`**
  (`essay_dayton_signed_1995`, `event_id: dayton_signed_1995`), registered in
  `data/scenarios/essays/essay_index.json:3409-3411`. An essay written for the game's climax that no
  player can currently reach. Add it to the ticker lines and Codex sections in §1 — the tally of
  authored-but-unreachable Dayton content is now: 5 events, 5 ticker lines, 2 Codex dynamic sections,
  1 essay.

This strengthens, rather than changes, the §5 severity call: what the `flag_not_set` bug costs is
**narrative closure**, and the amount of already-written content sitting behind it is larger than the
event chain alone suggests. Still P1 rather than P0 — the campaign ends — but it is the most
content-rich P1 on the board.
