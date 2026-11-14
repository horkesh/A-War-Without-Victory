# Command loop proposal: rare clashes, a weekly dispatch, decisions worth making

| Field | Entry |
| --- | --- |
| Date | 2026-11-14 |
| Status | **Design proposal. Docs only.** No code, data or canon changes in this PR. Four owner decisions are listed at the end. |
| Source | R8 dry-run RBiH Player Experience Council diary, score 2/5 ([diary](../playtests/20261114_r8_dry_rbih_council_diary.md), merged #629): fixes 2 and 5; items L1, L2, L3, L5, L6, C6, B11, B13, H5 |
| Companion | Minimal fix PR for B11 alone (branch `claude/loving-lamport-nr5w56-b11`), see §5C |
| Seats consulted | Game Designer, Modern Wargame Expert, UI/UX Developer, Corps/Army Commander, Historian, Architect (independent read-only consults, recorded in §9) |
| Locked owner decisions kept | Posture model option 2 (stance matters, silence = consent); the presidential command model and its five levers; the operation planner modal (`ops_modal`) parked for DLC, never deleted; an OG is a grouping of brigades |

## 1. Summary

The Council found the weekly loop clerical: the same army "pushback" every week, no readout of what
happened, a review chip that never clears, proposals with nothing to decide on, and an Authority meter
that never moves. This proposal fixes those with small, mostly UI changes first, then four small-to-large
player-only engine changes, then one calibration item.

| Part | Recommendation in one line | Kind | Cost |
| --- | --- | --- | --- |
| 2A Army clashes | Stop showing the weekly pushback card now (UI). Later, raise a clash only when a presidential order actually crosses the army's plan, when the order is staged. Accept, Insist (15 Authority) or Replace. At most 4 a year. | UI first (S), then player-path engine (L) | S + L |
| 2B Weekly dispatch | Open the existing turn report on a short "This week" view, with the full record one click away. | UI | M |
| 2C Review chip | Show a true count, list every item by tier, make every row clickable, hide it at zero and on the signing and Verdict screens. | UI | S |
| 5A Proposal dossiers | Six facts instead of thirteen labels: objective, forces, an attributed odds band, cost, stakes, what holding back loses. "Show on map" for every operation. | UI and read-only projection | M |
| 5B Defensive operations | Defensive operations never ask for a signature. Staff decides and the Record says so. | Player-path engine | S |
| 5C Accepted becomes "unrequested" (B11) | Located and fixed in the companion PR. On the way: an unanswered proposal leaves its plan held forever (likely L8); release it. | UI and desktop guard; then a small player-path change | S, done; S |
| 5D Authority that binds | Price the act of backing an offensive (10 for a corps operation, 20 for a campaign or historical operation). Keep today's income. Show next week's income on every price. | Player-path engine | M |
| 5E Corps succession | Follow a dated, sourced succession schedule by default. Commanders who survived the war stop dying on a timer. | Calibration-affecting | L |

## 2. What the measurements changed

Five premises from the diary needed correcting before design. Each was checked in code or in the
committed headless 188-week save (`data/derived/latest_run_final_save.json`).

1. **A turn report already exists, and the harness closed it before every screenshot.** After Advance,
   `advanceTurnAndSync` builds the aftermath view and opens `TurnAftermathModal` on any week with a
   battle or casualty (`src/ui/map/desktop/orderActions.ts:72-85`, `src/ui/map/data/turnAftermath.ts:305-319`),
   which in wartime is almost every week. The QA harness clicks its close button first and takes the
   screenshot about a second later (`tools/ui/paradox_local_qa.cjs:5384-5388`). So none of the 1,959
   screenshots could show it. L2 still stands on its merits: the report is a dense two-column record,
   not a dispatch, and its quiet-week digest is fixed copy that ignores the week (`turnAftermath.ts:321-325`).
2. **The review chip is already a button, but its number is not a count.** In the Warroom it opens a
   list (`WarroomStatusBar.tsx:296-320`). The number comes from `buildAdvanceReadiness`, which pads the
   list up to four recommended cards (`presidentialDecisionRoom.ts:2106`, `targetCount = Math.max(4, …)`),
   adds card weights over that cut list (`preAdvanceCommandReview.ts:155-158`) and is cut to four again
   (`warroomPriorityDocket.ts:78-90`). It reads 4 almost every week because it is a cap, and a grouped
   card can make it read more than the rows it lists.
3. **The weekly pushback answers a directive the President never gave.** At autonomy 1 and above, the
   player's own staff receives a bot-produced political directive every week
   (`src/sim/political/political_directive_producer.ts:292-297`: "no player directive-issuing UI exists").
   The army commander scores it, and any result short of full compliance emits an
   `army_directive_pushback` event (`src/sim/combat/army_order_interpretation.ts:708`, emission ~l.880-903).
   No handler for its `override-army-directive` action exists anywhere, which is why the card offers only
   Acknowledge. The headless save carries 556 unacknowledged rows (RBiH 188, RS 185, HRHB 183), one
   almost every week for every faction. Any change to the emission would change headless bytes, so the
   fix belongs in the UI.
4. **Dudaković did not take the 5th Corps in late 1992.** The historian places the handover from
   Dreković on 1 November 1993 (week 82; BB2 p.414-415, Bosnian biographies). The game's Dreković 0-80
   has the right shape. The real defects are elsewhere (§5E): every engaged corps commander dies after
   100 weeks in command, and the replacement pool ignores the historical order.
5. **Authority is seeded in headless runs too** (`src/scenario/scenario_runner.ts:314`); only its weekly
   recovery is gated on a live player (`war_phases.ts:2940-2941`). Any new Authority field must be
   written only under that gate.

## 3. Ground rules

- Player-only behaviour lives in optional GameState fields, absent from old saves and from headless runs.
  Gates use `isLivePresident` (`src/sim/combat/stance_matters.ts:76`), not `player_faction` alone, because
  headless runs can carry an authored `player_faction` (`scenario_runner.ts:1676`, `:1691`).
- Each player-path engine lane carries the stance-matter inertness proof: equal 40-week headless artifact
  hashes before and after, and a live strip-and-compare with the new fields removed.
- Calibration stays held until the engine freeze (owner, 2026-11-14). Only 5E moves territory.
- Determinism: no randomness, caps and cooldowns derived from turns, `strictCompare` on every ordered list.
- No new modal. The Desk scans, the Decision Room acts, the turn aftermath owns the consequence beat
  (`docs/20_engineering/UI_OWNERSHIP_MATRIX.md:85`).
- Every new string lands in EN and BCS (`tests/ui_i18n.test.ts`).

## 4. Fix 2: replace the weekly pushback, add a weekly dispatch, fix the review chip

### 2A. Army clashes instead of a weekly pushback

**Player problem.** "Every week Halilović (later Delić) acknowledges the political directive but routes
it through the staff's reading of conditions … I never learn which directive this was, what changed, or
what I could do about it." Shown 197 times, tagged "Recommended before advance", about 2 of every turn's
6-9 clicks (L1, C6; m-096, m-150, m-612, m-1056, m-1482). War-or-game: real Delić-Izetbegović clashes were
specific and came a few times a year (the June 1995 Sarajevo breakout, Srebrenica and Žepa, Bihać).

**Proposed behaviour.** Two steps.

*Step A0, now (UI only).* For a live President's own faction, the weekly pushback stops being a card,
an inbox tile and a review-chip item. It becomes one line in Army HQ Records: "Staff reading of
policy: {verb}, carried out as {role summary}." Enemy and headless rows are untouched.

*Step A1, later (player-path engine).* A clash is raised only by something the President actually did,
at the moment he stages it, before Advance. This matches the command model's rule that pushback is shown
before commit (`docs/plans/2026-06-01-presidential-command-model-design.md:28`). A pure function
`detectPlanConflict(state, faction, act)` reads the faction's current CampaignPlan (only when
`valid_until_turn >= turn`): each corps' role in `front_priorities`, the main-effort participant in
`synchronized_operations`, and the corps commander's `current_plan`.

| Presidential act | Conflicts with the army plan when |
| --- | --- |
| Stop op | the operation is the plan's main effort, or its objectives fall inside the plan's offensive targets |
| Request op | the corps is set to economy or contain, or the order would draw brigades out of a besieged or garrison-short zone |
| Withhold a Level-1 plan | the plan belongs to a primary corps (today it is dropped silently, `commander_loop.ts:287-290`) |
| Decline an opportunity | staff recommended approval and every required check is green |

A clash fires only when all three hold: (a) one of the conflicts above; (b) the army commander's
compliance with that act scores partial or refused, using the existing compliance formula against the
verb the act implies (request op: press offensive; stop op or withhold: hold), and never "modified",
which is today's weekly noise; (c) the act concerns a corps operation or larger. Otherwise the army's
objection becomes one silent Record line.

Stance matters are excluded: option 2 already prices an overrule (Main Staff delay, eight-week
Confirm-only window, patron shift), and the panel ruled that stance overrules must not stack with other
overrides (option 2 plan, rev 3, red-team 8). Ceasefire behaviour belongs to fix 3.

The card names the order, the army's deviation and its one bounded counter-order: halt after the current
objective, hold N weeks later, take the force from another corps, or resubmit next week.

| Answer | Effect | Cost |
| --- | --- | --- |
| Accept | The army's version is staged instead. Any Authority already staged for the order is refunded. Record: "You deferred to {CO} on week N." | 0; uses one of the year's clashes |
| Insist | The order stands as given. One override goes on the army commander's tolerance record (`army_co_lifecycle.ts:470-476`). Record: "{CO} warned you on week N." Corps cowing counters are not touched. | 15 Authority |
| Replace | The existing Replace-CO lever for the corps commander who would carry out the order, staged at answer time through `co_replacement.cjs` so it lands the same week. | 25 Authority (lever 5) |

If the corps commander's own go/no-go objection (`forced_over_objection`, `desktop_sim.ts:1052-1136`)
fires on the same order, one card shows both voices and Insist charges the higher price once.

Volume: at most one open clash; at most 4 per faction per calendar year; at least 8 weeks between clashes.
Anything over the cap becomes a `not_put` Record line. The card refers back to the previous clash when
there was one. Frequency differences between factions come from officer data, never from faction branches.

**Engine and state impact.** Step A0: none. Step A1: optional fields `meta.army_clashes?` (open clash),
`meta.army_clash_history?` (receipts, capped at 200, sorted by resolved turn then id) and
`military.army_clash_state?` (clashes per year, last clash turn per officer). Types go in a new
`src/state/army_clash_types.ts`, imported type-only, as `officer_types` is. Validator blocks sit beside the
stance blocks (`validateGameState.ts:4067-4082` for meta, `:4841-4873` for military); the military field
is marked optional-persisted for `tools/diagnostics/game_state_field_classification.ts`. A new advisory
decision-manifest family `army_clash` that never blocks Advance (`player_decision_manifest.ts`). Detection
and answer run in the planning window through one new IPC channel (`resolve-army-clash`), writing only
these fields and the staged order; the war pipeline gains no step. Ids are `CLASH_<turn>_<faction>`. An
attribution-firewall test, as for stance matters, proves condemnation, attribution and the Pyrrhic grade
are identical with and without clash records. Headless: byte-identical by construction (no live
President, no IPC).

**UI surfaces.** A0: `presidentialDecisionRoom.ts` (~l.406-413 and the officer-matter group),
`inboxItems.ts:182`, `OfficerMatterModal.tsx:73`, `decisionConsequenceLedger.ts`. A1: a lazily loaded
`ArmyClashActions.tsx`, the sibling of `StanceMatterActions`, routed from `DirectiveCard.tsx`. Title
"{CO} objects to: {order}"; facts: the order as issued, the army's counter-order, the corps affected,
his reason; three equal buttons, each with its cost and an aria label that includes the cost. Advisory.

**Canon.** Rulebook line 13 and §5.5: a clash is review inside command through generals, not a sixth
lever. Systems Manual §6.5. Engine Invariants new §14.10d (player-only boundary, caps, firewall).
`PLAYER_TURN_GUIDE.md` rows. `DETERMINISM_TEST_MATRIX.md` row. No FORAWWV change while Replace stays
limited to corps commanders. If the owner wants Replace to reach the army commander, FORAWWV §X.3 changes
and the panel applies (owner decision 4).

**Cost.** A0: S. A1: L.

**Recommended:** A0 now, A1 after the priced Authority lane (5D), so Insist has a real price.
**Alternative:** raise clashes in the war pipeline from the A3 interpretation (new steps after
`apply-army-directive-interpretation`, `war_phases.ts:~2588`), clamping insisted corps in
`army_corps_directives_by_faction`. Rejected for now: the directive it argues with is still the bot's, so
"Insist" would defend a line the President never drew.

### 2B. A "This week" dispatch after Advance

**Player problem.** "No weekly dispatch after Advance. The desk shows a new date and a map. Gains,
losses and battles are two clicks deep" (L2; m-095, m-099, m-1072, m-1076). The veteran seat: "nothing
they do each week visibly changes anything."

**Proposed behaviour.** `TurnAftermathModal` opens on a compact Dispatch view by default, with the
current two-column record behind a "Full record" button. At most six lines, and a line with nothing to
report is left out:

1. Date and one headline: the biggest change of the week, chosen in a fixed order (territory, then
   formations, then decisions), ties broken with `strictCompare`.
2. Ground: net settlements, and up to three named gains or losses with "Show on map".
3. Fighting: battles (ours of all), our losses against theirs, with a basis label on every figure.
4. Cost: displaced people and formations lost, by name; supply only when it crossed a threshold.
5. Your orders: what last week's decisions did (operations launched, halted or stalled; stance matters
   stood or countermanded; clash outcomes), from the consequence receipts and `commandRecord`. This line
   is the link between a decision and its result that the veteran seat found missing.
6. Needs you: "1 required · 2 recommended", which opens the review list (2C).

It opens after every Advance, as today. A quiet week gets a two-line dispatch. The bottom-strip digest
becomes "Reopen this week's dispatch" on the map screen.

**Engine and state impact.** None. Every line comes from the existing `TurnAftermathView`.

**UI surfaces.** `TurnAftermathModal.tsx` (a local `dispatch | record` state), a dispatch selector in
`turnAftermath.ts`, `BottomStatusStrip.tsx:361-380`. Fits 1280×720 without scrolling. Harness sub-lane:
`tools/ui/paradox_local_qa.cjs:5384-5388` takes the screenshot before closing the report, and the next
dry run confirms the dispatch on a packaged build. Design-language fix in passing: the monospace text in
`TurnAftermathModal.tsx` (l.551, l.627).

**Canon.** None. `GUI_MASTER.md` and `UI_OWNERSHIP_MATRIX.md` row text.

**Cost.** M.

**Recommended:** reshape the existing modal (one owner, no new surface).
**Alternative:** a docked card on the Desk that becomes a modal only on salient weeks (a named
municipality or enclave changes hands, an own brigade is destroyed, a required decision appears, a
ceasefire or peace event). Lighter on quiet weeks, but it adds a second consequence surface.

### 2C. A review chip that tells the truth

**Player problem.** "REVIEW BEFORE ADVANCE 4" stays on almost all war, never says which four things it
means, and is still visible behind the Dayton signing and the Verdict (L3, B17; m-099 onward, q-084,
q-085).

**Proposed behaviour.**
- The number is the true number of rows, never padded. Display caps at "9+".
- Three tiers. Required items get their own red pill, with what happens by default if ignored.
  Recommended items are counted; stance matters read "proceeds unless you act". Information items are
  never counted; they go to the dispatch and the Record.
- Clicking lists every item, grouped by tier, each with a one-line "why now". Every row is clickable:
  rows with no target open their card in the Decision Room instead of being disabled.
- At zero the chip disappears. It is hidden on the Dayton signing and the Verdict (both render under
  `gameOver`) and while a decision modal is open.
- After A0 the weekly pushback no longer counts.
- On the map screen no new chip (the toolbar has a fixed width budget). The Advance button carries the
  count in its title and aria label, and `PresidentialToolbar.tsx:168` passes the reviewed-aftermath turn
  it omits today.

**Engine and state impact.** None.

**UI surfaces.** `buildAdvanceReadiness` only, in `presidentialDecisionRoom.ts:2087-2135` (returns the full
ordered list; a short featured list for the Desk is derived from it); `preAdvanceCommandReview.ts`;
`warroomPriorityDocket.ts` (no default limit, scrollable panel); `WarroomStatusBar.tsx` (and its monospace
text, l.244); `App.tsx:2269-2270` (`&& !loadedGameState?.gameOver` on the status dock only, not on the
shared blocking flag); `PresidentialToolbar.tsx:168`.

**Canon.** None.

**Cost.** S.

**Recommended:** true count with tiers.
**Alternative:** keep the four-item preview but label the number "top 4 of N". Honest, but it keeps a
number the player cannot act on.

## 5. Fix 5: decisions worth making

### 5A. Proposal dossiers

**Player problem.** "Proposal dossiers ask for yes or no on 'Staff recommends authorization.' with no
objective, forces, odds, cost or map. 'Withhold' and 'Cancel' are not explained" (L5; m-611, m-1099,
m-1422). Ordinary operation proposals print thirteen English "Label: value" lines, often "Unreported"
(`presidentialDecisionRoom.ts:1228-1260`), and use the Personnel action label (`:1350-1352`).

**Proposed behaviour.** Every operation proposal shows a header (the operation's name and its political
stakes in one sentence) and six facts, each shown only when known:

1. **Objective**, in political terms (corridor, town, enclave link), with **Show on map**.
2. **Forces**, at corps and OG level: the first three brigades and "+n", the donor corps, and what is
   left thin.
3. **Odds**, as one of four bands (Favourable, Even, Hard, Long odds), always attributed: "Karavelić
   judges: favourable." The band comes from the force ratio and intelligence the staff already report,
   bent by that officer's competence and aggressiveness, with the confidence shown ("poor
   intelligence"). Where the army staff reads it differently, both voices appear. Never a percentage.
4. **Cost**: the Authority price (5D), a casualty band (light, heavy, severe), cohesion drawn from donor
   brigades.
5. **Stakes**: who reacts (patron, assembly, the other side), from the existing friction stakes.
6. **If you hold back**: the deadline and what is lost.

Buttons explained in place, matching what the code does (`reject-proposal` stages a refusal and the
commander loop then abandons the plan, `commander_loop.ts:287-290`). Withhold: "The corps drops this
plan; its commander may plan again." Cancel: "Close without answering; an unanswered proposal lapses
at Advance." "Unknown" replaces "Unreported". A later receipt closes the loop: "Karavelić judged
favourable; the operation took 2 of 3 objectives."

The attribution is the point. The command model rule is "the number is never the decision; the source
is" (`2026-06-01-presidential-command-model-design.md:32`). An unattributed band from the true ratio
would be a win percentage in costume, and in a deterministic engine it could be learned by reloading.

**Engine and state impact.** None. The band is a pure, deterministic UI derivation from fields already in
`OpProposalCardView` (`force_ratio_estimate`, intelligence assessment) and the officer's traits. Show on map
reuses the `field-operation-plan` target, today set only for historical operations (`:1368-1380`); the
read-only `buildOpProposalCardData` projection in `autonomy_ipc_contract.cjs` adds staging and formation
ids.

**UI surfaces.** A new `proposalDossier.ts` holding the logic, a one-line hook in
`ordinaryOperationProposalEvidence` and the review-card label, `backTheOfficer.ts` (raw percentages at
l.660-664 and l.791-806 become bands; the English literals at l.785-821 move to i18n),
`src/shared/playerSafeOperationBalance.ts`, `types.ts`. A BCS render test.

**Canon.** None beyond `GUI_MASTER.md`. The no-percentage rule already exists in the command model.

**Cost.** M.

**Recommended:** attributed bands.
**Alternative:** show the force ratio as a number with an intelligence-quality caveat. Rejected: it
becomes the decision.

### 5B. No signature for defensive operations

**Player problem.** "The President authorises a corps **defence** ('Operation Breza 94 Defense', m-1000)
… Defensive operations should never need presidential sign-off." (War-or-game.)

**What the code does.** Commander-loop plans only ever emit attacks, so the Level-1 hold already applies
to offensives only. Breza reached the President through the opportunity review queue:
`applyBotOpportunityDecisions` skips the player faction below autonomy 2
(`operation_opportunities.ts:1942`), and the review generator turns the opportunity into a card.
Approving a defensive-crisis (T3) opportunity does nothing mechanically: it writes
`t3_authorized_no_offensive` and spawns no operation (`:1258`).

**Proposed behaviour.** Defensive operations never ask for a signature at any autonomy level: T3
opportunities and operations of type `strategic_defense` or `reorganization`. Staff decides on the bot
path, and the Record says "1st Corps took up the Breza defence." Whether small local attacks should still
reach the President at autonomy 1 is owner decision 2.

**Engine and state impact.** No new state. A player-path change in the two opportunity functions: let the
staff decide `tier === 'T3'` for the player faction. The defensive classification sits in a code-side
lookup, not on catalog objects that are copied into persisted opportunity state. Gate on
`isLivePresident`. Headless is byte-identical by construction; inertness proof as in §3.

**UI surfaces.** The receipt line in the dispatch (2B) and Records.

**Canon.** Rulebook line 13 ("Authorize op") and Engine Invariants §14.10b: defensive operations are never
put to the President. `PLAYER_TURN_GUIDE.md`.

**Cost.** S.

**Recommended:** staff decides defensive operations.
**Alternative:** keep the card as an information notice with no buttons. Rejected: it still costs a
click and teaches the player that defence is his to approve.

### 5C. An accepted proposal came back as "unrequested" (B11): located and fixed

**Player problem.** "An accepted, free proposal comes back as 'Order an unrequested operation: Advance
from Doljani (Jablanica) … 25 Authority', and the toast says 'Command authority is spent now' while the
bar still reads 100/100" (B11; m-611 → m-612).

**Cause (measured).** Accepting resolves the review and stages `player_op_response` for the plan, which
stays `ready` until Advance (`electron-main.cjs:4157-4199`). The adapter drops resolved reviews
(`GameStateAdapter.ts` `derivePendingProposalReviews`). The two projections that list plans for a
proactive force-launch, `buildForceableReadyPlans` (`backTheOfficer.ts:937`) and its desktop twin
`buildForceableReadyPlanData`, only excluded plans with a pending proposal, so the just-approved plan
reappeared as unrequested. The `proactive-force-launch-op` handler accepted it too: one click would charge
25 Authority and re-tag an ordinary approval as a forced launch (Direct Intervention, which feeds command
strain and lowers Authority recovery). The engine's own proposal generation already excluded such plans
(`proposal_generation.ts:~215-226`). Separately, `DirectiveCard` printed the same "authority is spent"
receipt for free directives.

**Fix (companion PR, UI projection and desktop guard only).** One shared rule,
`resolveProactiveForceLaunchRefusal` in `autonomy_ipc_contract.cjs`: a plan with a pending proposal goes
to the proposal path; a plan with a staged presidential answer (the `player_op_response` that accept and
withhold both stage, kept until the commander loop consumes it) is refused as `plan_already_answered`.
Both projections and the IPC use it. Free directives get a receipt that says no authority was spent (EN,
BCS). Evidence: an 18-case regression test whose projection cases failed on the old code; receipt
assertions for accept and withhold with a positive control; 57 related test files (786 tests) and
`tsc --noEmit` green. An independent review caught a first draft that also refused plans whose proposal
had merely expired; that draft was corrected before the PR (next paragraph).

**Found on the way (recorded, not fixed).** A proposal the President does not answer is auto-expired as
"declined" at the next Advance (`war_phases.ts:2293-2305`) but stages no response, so the commander keeps
the plan held at `ready`, never proposes it again and cannot start a new one. The only way out is the
25-Authority "unrequested operation" card, whose title is then false. This is the likely cause of L8 ("the
same two unrequested operation offers sit unchanged from 1992 to 1995"). It gets its own small lane (L3b
in §6): an expired proposal should either release the plan (the commander replans) or come back once as
"{CO} still holds {operation} ready", at its normal price. Recommended: release the plan;
it is the smaller change and matches "silence lets his reading stand" elsewhere. This touches the
commander loop for the player faction only, so it carries the player-path inertness proof.

**Engine and state impact.** None for the fix. **Canon.** None. **Cost.** S, done.

### 5D. Authority that binds

**Player problem.** "Command Authority reads 100/100 at every checkpoint from t25 to t188 (lifetime spent
20). The meter never binds, so its prices are decoration" (L6; m-476, m-802, m-1099, m-1383, m-1482).

**Diagnosis.** A demand problem, not a supply problem. The income cadence was chosen by the CA-1 panel
and is enforced by tests (base 3.25 a week, up to 2 more on a quiet front, a 15-point reserve;
`docs/plans/2026-07-06-command-authority-economy-plan.md` §6). The loop simply never asks for a priced
act: backing a staff proposal is free (cost 0, `presidentialDecisionRoom.ts:1381-1385`), stance matters
are free, and the priced levers are rare by design. Cutting income would not create decisions.

**Proposed behaviour.**

| Act | Authority |
| --- | --- |
| Back a staff offensive at corps level | 10 |
| Back a named or multi-corps campaign, or an authored historical operation | 20 |
| Insist over the army in a clash (2A) | 15 |
| Withhold or decline | 0, recorded |
| Defensive operations | never asked (5B) |
| Existing levers (request, stop, elite, replace 25; force over a shown no-go 15; gestures 10) | unchanged |

- An ordinary approval never feeds the force-launch or friction penalty on income.
- No refund on success: territorial gain is a banned income source under the Section 6 audit.
- Visible regeneration: every priced button reads "Back · 10 · you have 34 · +4 next week", and the Desk
  header shows next week's income with its sources.
- Target: about one backed corps operation every two to three weeks, or one campaign a month. At autonomy
  1 the game designer's estimate is that Authority first drops below 50 by mid-1993 and stays under 60
  through most of 1994-95. Acceptance: Authority sits at its cap in no more than 25% of turns after week
  26 in a measured diary, using the diary template's "turns at cap" line.
- At the default autonomy 2 only authored historical operations ask for a signature (Rulebook line 13),
  so demand there rests on stop, request, elite, replace and Insist. A restrained President who keeps
  Authority high is making a valid choice; the Record shows it as unspent political capital. No
  artificial sinks.

**Engine and state impact.** Prices: the cost constants in `src/ui/map/utils/commandAuthority.ts` and
`autonomy_ipc_contract.cjs` (with the existing parity guard), a debit in the `accept-proposal` handler
(`electron-main.cjs:4157`) with the usual affordability check, and the opportunity-approve path. One
optional field, `command_authority.last_recovery_breakdown?`, written only in the
`recover-command-authority` step (`war_phases.ts:~2935`), never at seed time, validated beside the
existing Authority checks (`validateGameState.ts:~3041-3082`). It is persisted because recovery inputs
change later in the turn. `tests/command_authority_economy.test.ts` gains a demand table. Headless never
debits or recovers, so it stays byte-identical.

**UI surfaces.** `DirectiveCard.tsx` price line, `DeskAuthorityHeader.tsx`, the dossier cost fact (5A).

**Canon.** Rulebook line 13 and the command model §6 (lever prices are owner-set), Systems Manual §6.4.
Any new income source needs the Section 6 income-source review; this proposal adds none.

**Cost.** M.

**Recommended:** price the authorisations, keep the income.
**Alternative:** halve the base income and keep authorisations free. Rejected: the meter would fall
without the player ever choosing anything.

### 5E. Historical corps succession by default

**Player problem.** "Corps commanders at t188: 3rd Merdan, 4th Čuskić, 5th Šelmanović. Historically the
3rd was Mahmuljin and the 5th Dudaković" (B13, H5; n-047, m-611, m-1068).

**Cause (measured in the committed headless save).** At week 188: 1st Ajnadžić, 2nd Lendo, 3rd Čuskić,
4th Mahmuljin, 5th Šelmanović. Dudaković was killed at exactly 100 weeks in command; Karavelić at 105,
Cikotić at 104. Hadžihasanović never commanded. Three mechanisms (`src/sim/combat/officer_system.ts`):

1. **A death clock.** An engaged corps commander dies when vulnerability × 0.1 × weeks in command
   reaches 1 (`:726-729`, `OFFICER_CASUALTY_EXPOSURE_RATE` at `:48`): 100 weeks at 0.1, 67 at 0.15, 40
   at 0.25. The historian found that **no ARBiH corps commander of 1992-95 was killed in the war.**
2. **Dates admit officers to the pool but do not order it.** `findBestReplacement` (`:920`) sorts by home
   corps, tier, competence and id. Officers available from week 0 with no end date pre-empt the dated
   historical commanders. There is no handover when a historical incumbent arrives (Hadžihasanović,
   available from week 22, never takes the 3rd Corps).
3. **Id tiebreaks and cross-corps postings.** Cikotić beats Čuskić for the 3rd Corps on the id; Lendo
   beats Sead Delić for the 2nd; Alagić and Mahmuljin are posted to the 4th Corps with the
   incompatible-corps penalty, because the data has no 4th Corps holder after week 80.

**Proposed behaviour.** A dated, sourced schedule decides who commands each corps unless the President
replaces a commander or the commander falls.

- A new `data/scenarios/corps_co_roster.json`, on the pattern of `army_co_roster.json` and
  `army_co_lifecycle.ts:441-497`: per corps, the holders with `tenure_start`, `tenure_end`,
  `historical_fate` (survived, killed, relieved) and the source.
- Vacancies are filled from the schedule first; `findBestReplacement` stays as the counterfactual
  fallback.
- When a scheduled tenure starts, the fallback holder steps aside. A President's appointee
  (`co_replacement_record`) is never rotated out.
- Officers whose `historical_fate` is "survived" stop accruing the death clock. They can still fall to
  events on the map (their headquarters area captured, or its zone encircled and collapsing). Historical
  deaths are written into the schedule as data.
- With no schedule file the mechanism does nothing, as the A4 army roster did before its data landed.
- At autonomy 0 the replacement suggestion (`findHistoricalSuccessor`, `:67`) reads the schedule.

Historian schedule (week 0 = 6 April 1992; proposals for the BC17 calibration data pass):

| Corps | Holders | Changes to `apr1992_officers.json` |
| --- | --- | --- |
| 1st | Talijan to Aug 1993 (w68-73); Karavelić to the end | none |
| 2nd | Knez to 12 Feb 1993 (w44); Šadić to Oct 1994 (w129-134); Sead Delić to the end | none (the schedule removes the Lendo tiebreak) |
| 3rd | Hadžihasanović to 1 Nov 1993 (w82); Alagić to Feb 1994 (w90-98, then 7th Corps); Mahmuljin from Apr or Sep 1994 (w103-129) to the end | Hadžihasanović ends 80 → 82; Alagić starts 80 → 82 and ends 120 → 98; Mahmuljin start kept at 110 until the ICTY *Delić* judgment is checked (a gap from 98 to 110 is accepted, or Mahmuljin starts at 98 with a note) |
| 4th | Pašalić to 6 Nov 1993 (w82); Budaković briefly (Low confidence); Ramiz Dreković from about Jan 1994 (w90-95) to the end | Pašalić ends 80 → 82; add a second Dreković entry for the 4th Corps from about week 92 |
| 5th | Dreković to 1 Nov 1993 (w82); Dudaković to the end | Dreković ends 80 → 82; Dudaković scheduled at week 82 |

Sources: ICTY *Hadžihasanović & Kubura* (IT-01-47) judgment summary and case sheet; ICTY *Delić* (IT-04-83)
transcripts of 20-21 Sep 2007; ICTY *Halilović* (IT-01-48) judgment; Court of BiH Dreković judgments (2023);
Balkan Battlegrounds BB1 p.149, p.384, p.404, p.491 and BB2 p.414-415, p.433, p.489, p.510 (with the KB page
numbers in the consult record). The historian could not open the ICTY site from this session and worked
from search excerpts, so paragraph numbers are unverified; the week-82 reshuffle is High confidence.

**Engine and state impact.** No new GameState field. `named_officer_data` is a save snapshot, so old
saves keep the old order. This change is not headless-identical: commander competence, defence and
aggression feed attack and defence modifiers (`officer_system.ts:219-235`) and corps compliance, so it moves
territory and needs the full calibration gates (full suite, authoritative 188-week run, anchors, one
change per measured run). The mechanism and the schedule are two separate measured runs.

**UI surfaces.** None new. The officer-arrival and succession notices already exist.

**Canon.** FORAWWV §X.3 describes succession as "existing `processOfficerSuccession` (combat-death +
relief paths)"; a scheduled corps succession and the "survived" rule extend that text, so the FORAWWV
edit goes through its panel in the same change. Systems Manual officer section; `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`
(the historian's corrections are listed in §8).

**Cost.** L, plus calibration runs.

**Recommended:** the mechanism as a pre-freeze fidelity (RF) item, one measured run; the schedule data in
the one calibration pass with the other officer dates (BC17). Owner decision 3.
**Alternative:** data only, in the calibration pass: fix the dates and drop the week-0 pool officers.
Cheaper, but the death clock still kills Karavelić around June 1995 and Dudaković around
September-October 1995, in the middle of his historical offensive.

## 6. Build plan

Lanes are cut so that lanes in the same wave own different files. Shared files (the i18n message files,
`presidentialDecisionRoom.ts`, `DirectiveCard.tsx`, `electron-main.cjs`, `autonomy_ipc_contract.cjs`, Rulebook
line 13) are touched in disjoint regions and merged in the order given below. Each lane adds its strings
in its own namespaced block (`review.*`, `dispatch.*`, `dossier.*`, `clash.*`) at its own anchor, never at
the end of the file.

| Lane | Content | Files it owns | Kind | Waits for | Cost |
| --- | --- | --- | --- | --- | --- |
| L0 | B11 fix (5C) | companion PR | UI and desktop guard | — | S, done |
| L1 | Review chip (2C) and pushback demotion (2A step A0) | `presidentialDecisionRoom.ts` (`buildAdvanceReadiness`, pushback group), `preAdvanceCommandReview.ts`, `warroomPriorityDocket.ts`, `WarroomStatusBar.tsx`, `App.tsx` status-dock line, `PresidentialToolbar.tsx`, `inboxItems.ts`, `OfficerMatterModal.tsx`, `decisionConsequenceLedger.ts` | UI, merges any time | — | S |
| L2 | Weekly dispatch (2B) | `TurnAftermathModal.tsx`, `turnAftermath.ts`, `orderActions.ts`, `BottomStatusStrip.tsx` | UI, merges any time | — | M |
| L2h | Harness screenshot before close | `tools/ui/paradox_local_qa.cjs` | Tooling | — | S |
| L3 | Defensive operations without a signature (5B) | `operation_opportunities.ts` (two functions), Rulebook line 13 slot, Engine Invariants §14.10b | Player-path engine, inertness proof | #624 (PK1) merged | S |
| L3b | Release a held plan when its proposal expires unanswered (§5C finding, Council L8) | `commander_loop.ts` Level-1 guard (player faction only) | Player-path engine, inertness proof | #624 (PK1) merged: the autonomy-1 freeze it fixes sits in the same Level-1 guard | S |
| L4 | Corps succession mechanism (5E) | `officer_system.ts`, new corps roster loader, `data/scenarios/corps_co_roster.json` (empty schedule first) | RF mechanics, measured | owner decision 3 | L |
| L5 | Proposal dossiers (5A) | new `proposalDossier.ts`, `presidentialDecisionRoom.ts` (proposal functions), `backTheOfficer.ts`, `playerSafeOperationBalance.ts`, `types.ts`, `buildOpProposalCardData` in `autonomy_ipc_contract.cjs` | UI and read-only projection | L0, L1 merged | M |
| L6 | Authority prices and visible regeneration (5D) | `commandAuthority.ts`, cost constants in `autonomy_ipc_contract.cjs`, `accept-proposal` handler, `commandAuthorityEconomy.ts`, `war_phases.ts` recovery step, `validateGameState.ts` Authority block, `DeskAuthorityHeader.tsx`, economy test | Player-path engine, inertness proof | owner decision 1; L0 and L5 merged | M |
| L7 | Army clashes (2A step A1) | new `army_clash_types.ts`, new `army_clashes.ts`, new `army_clash_ipc.cjs`, `game_state.ts` (3 lines), `validateGameState.ts`, field classification, `player_decision_manifest.ts`, `player_visible_state.cjs`, `preload.cjs`, `useIPC.ts`, new `ArmyClashActions.tsx`, `DirectiveCard.tsx` routing, `presidentialDecisionRoom.ts` lever, canon | Player-path engine, inertness proof, firewall test | L1, L6 merged; owner decision 4 | L |
| L8 | Corps succession data (5E schedule) and the historian's officer dates | `corps_co_roster.json`, `apr1992_officers.json` | Calibration (BC17) | engine freeze | M plus runs |

**Waves.**
- Wave 1, in parallel now: L1, L2, L2h, L3 and L3b (once #624 lands) and L4 (once decided). They share
  no files.
- Wave 2: L5 (rebased on L1), then L6.
- Wave 3: L7.
- After the engine freeze: L8 in the one calibration pass.

**Merge order on shared files.** `presidentialDecisionRoom.ts`: L1, L5, L7. `autonomy_ipc_contract.cjs` and
`electron-main.cjs`: L0, L5, L6, L7. `DirectiveCard.tsx`: L0, L5, L7. `validateGameState.ts`: L6, L7.
Rulebook line 13: L3, L6, L7, one change at a time.

**Proof per kind.** UI lanes: affected tests, i18n parity, `tsc --noEmit`, renders at 1280×720 and the
wide desk size in the real route. Player-path engine lanes: the same plus equal 40-week headless artifact
hashes and a live strip-and-compare, as for stance matters. L4 and L8: full suite, authoritative 188-week
run, anchors and provenance, one change per run.

**Done when.** The next dry-run diary shows no weekly pushback, a dispatch every week, a chip that
clears, and Authority at its cap in no more than a quarter of turns after week 26.

## 7. Decisions for the owner

These four change what the game asks of the player or touch a protected sequence. Everything else in
this proposal follows from canon and the consults.

1. **Should backing a staff offensive cost Authority?** Today saying yes to a general's plan is free,
   so Authority sits at 100 all war. **Recommendation: yes.** 10 for a corps operation, 20 for a big
   campaign or a historical operation. Saying no stays free. Income stays as it is.
2. **Should the President stop being asked about defensive and small local operations?** He is now
   asked to sign defences, which a president never did. **Recommendation: yes.** Defensive operations
   are never put to him. Small local attacks are put to him only in Full Control; in Assisted he sees
   corps operations and campaigns only. (Delegated, the default, is unchanged: staff plans already
   launch without his signature there.)
3. **When should corps commanders start following history?** Today they die on a timer after about two
   years in command and are replaced by whoever sorts first, so Dudaković dies in autumn 1995.
   **Recommendation: fix the rule now**, as one measured change in the current fidelity pass. Put the
   exact dates in with the other officer dates in the single calibration pass after the freeze.
4. **When the President overrules his army chief, may "replace" remove the army chief himself
   (Halilović, Delić), or only the corps commander?** **Recommendation: only the corps commander in
   1.0.** The army chief changes on the historical dates, as now.

## 8. Recorded for other lanes (not part of this proposal)

- **Bot directive targets the wrong corps (bot path, calibration pass).** `pickTargetCorps` sorts on
  `priority_weight`, which `FrontPriority` does not have (`army_hq_gathering_types.ts:9-19`), so the target
  is always the alphabetically first corps. In the headless save the overlay makes `hvo_central_bosnia`
  primary over the plan's real main effort, `hvo_southeast_herzegovina`. Calibration-affecting.
- **Stale directive slot.** When the producer returns null it leaves last week's directive in place
  (`political_directive_producer.ts:~352-354`).
- **OOB master errors** in `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`: 1st Corps should read Talijan
  to August 1993, then Karavelić; the 2nd Corps order should be Knez, Šadić, Delić; Hadžihasanović's 3rd
  Corps command ends 1 November 1993, when he became Chief of the Supreme Command Staff; the 4th Corps has
  no commander line.
- **Ceasefire enforcement** (B10, H4) is fix 3.

## 9. Consultation record

Each seat read the diary, a shared evidence brief and the code independently, and changed nothing.

- **Game Designer:** Authority is a demand problem; clash conditions (plan conflict, partial or refused
  compliance, corps scope); keep the bot directive silently; prices of 10, 20 and 15; attributed odds
  bands; owner questions 1, 2 and 4.
- **Modern Wargame Expert:** a six-line dispatch on the Suzerain and Frostpunk model, not a log; true
  counts in three tiers, on the EU4 alert model; rare clashes on the Suzerain model; qualitative bands
  without percentages, because a deterministic engine can be reloaded.
- **UI/UX Developer:** reshape `TurnAftermathModal` rather than add a surface; found that the harness
  closes the report before every screenshot; the three-stage padding behind the chip; `gameOver` gating;
  Show on map reuse; per-lane file lists.
- **Corps/Army Commander:** the weekly pushback answers a directive the President never gave and has no
  override handler; plan-conflict triggers and bounded counter-orders; how defensive operations reach the
  President; the death clock, pool order and tiebreaks behind B13; the `pickTargetCorps` defect.
- **Historian:** the sourced succession table in §5E; Dudaković from week 82, not 1992; no ARBiH corps
  commander was killed in the war; data corrections and OOB master errors.
- **Architect:** the state shape for clashes, the headless corrections in §2 (Authority seeding, 556
  pushback rows), pipeline placement, lanes, hot-file order and costs.
