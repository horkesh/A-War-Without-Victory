# The player faction's opportunities are never decided — QUEUED

**Date:** 2026-09-01 · **Status:** QUEUED, not started. Located and evidenced; fix not attempted.
**Corrected:** 2026-09-05 — the fix section was rewritten (see *Correction record* at the end). The
root-cause trace below is unchanged and still holds.
**Found by:** the D2 full-campaign set —
[all three factions](../40_reports/playtests/20260901_d2_full_campaign_all_three_factions.md).
**Blocks:** ahistorical playthrough experiments. Does NOT block observer parity, which is unaffected.

## The defect

```
scenario_runner.ts:2646   applyBotOpportunityDecisions(state, turn, null)   <- null = ALL factions
war_phases.ts:2549        const playerFaction = context.state.meta.player_faction ?? null;
war_phases.ts:2551        applyBotOpportunityDecisions(context.state, ... playerFaction ...)
desktop_sim.ts            no post-turn opportunity sweep at all
```

The calibration runner sweeps every faction's opportunities after each turn with an explicit `null`.
The in-pipeline step skips the player faction — which is CORRECT at Levels 0-2, where those
decisions belong to a present human — and `advanceTurn` never performs the post-turn sweep that
would resolve them afterwards. The player faction's opportunity-driven operations are therefore
never decided at all.

`autoResolveOpportunityProposalReviews` (`scenario_runner.ts:2638`) is in the same position.

## Evidence

Player faction's share of the late-1995 offensive, t156 -> t188:

```
                 calibration      harness
RBiH as player   RBiH +24         RBiH  +4
HRHB as player   HRHB +16         HRHB   0
RS  as player    (no late-war offensive to suppress)
```

Endpoint deficit for the played faction: RBiH **−22**, HRHB **−18**, RS **−2**.

The three runs track within ~2 cells for 156 of 188 weeks and diverge only in the final 32. The
deficit appears **only** in the late-war window, **only** for factions that attack then, and never
for RS. Late-war Federation offensives are opportunity-driven operations, so all three axes agree.

## Why it went unnoticed until now

- Observer parity is byte-identical, so the harness looked correct — and it IS correct as a
  reproduction of the calibration path. This is a player-path defect only.
- The RS campaign converges to 2 OSIDs, so the first full-campaign run read as a clean pass. RS was
  the one faction that could not reveal it.
- The gap was recorded on 2026-08-31 as one of the post-turn steps `advanceTurn` omits, and left
  unclosed because nothing had yet shown it mattered.

## Scope — narrower than "the player gets no operations"

*(Operations Expert, 2026-09-05.)* The main channel is unaffected. Corps-commander plans via
`commander_loop.ts:258-313` auto-launch for the player faction exactly as they do for a bot at
Levels 0, 2 and 3. The defect is confined to the **LANE B operation-opportunity catalog**
(`operation_opportunities.ts:544`, `OPERATION_OPPORTUNITY_CATALOG`). Do not widen the fix past it.

## The exclusion is deliberate; the compensation is incomplete

*(Operations Expert, 2026-09-05 — mechanism.)*

- The exclusion was introduced deliberately and is documented in its own commit, `b0c6277cb`
  (2026-05-01, "LANE B Phase 2"). `war_phases.ts:2540-2560` (`apply-bot-opportunity-decisions`)
  states: *"Bot factions decide their own opportunities synchronously — they never sit in the player
  review queue. Player faction's opportunities are skipped here and surfaced via
  generate-level1-opportunity-proposals below (autonomy_level === 1 only)."*
- `applyBotOpportunityDecisions()` (`operation_opportunities.ts:1660-1665`) skips the player faction
  **unconditionally, at every autonomy level**. The compensating proposal generator
  (`war_phases.ts:2589`) runs **only at `autonomy_level === 1`**. The skip is universal; the
  compensation is not. That mismatch is the whole defect.
- The post-turn catch-all was added to `scenario_runner.ts:2638-2646` by `c4e77931d` (2026-05-22)
  and **never added to `src/desktop/desktop_sim.ts::advanceTurn`**, which drives both the
  interactive desktop app and `tools/ai_play/parity_probe.ts`.
- **The rest of the pipeline scales its human-present guard with autonomy; this one does not.**
  `commander_loop.ts:236,258` gates on `autonomyLevel === 1` only; `war_phases.ts:934-941,
  2245-2287` use `fid === playerFaction ? autonomyLevel >= 2 : true`. The opportunity skip has no
  such scaling. The inconsistency is evidence of an **unfinished build**, not an intended design.

## Fix options — CORRECTED 2026-09-05

**This correction replaces the unranked options previously recorded here.** Option 1 as originally
written was canon-violating for the player faction. It is struck below rather than deleted, so the
reasoning stays visible.

### ~~Option 1 — have `advanceTurn` run the post-turn sweep~~ — STRUCK (canon violation)

> ~~**Have `advanceTurn` run the post-turn sweep** that `scenario_runner` runs. Closest to parity,~~
> ~~but it would resolve opportunities for a present human player too, which is wrong at Levels 0-2.~~

**Why it is wrong** *(Game Designer, 2026-09-05)*: the sweep auto-applies. Running it for the player
faction would auto-execute corps operations on the president's behalf exactly as if they were a
bot's. The command model forbids that. The president "does NOT set posture directly at any echelon"
and does not issue brigade movement orders; attacks flow through corps operations
(`Rulebook_v0_9_0.md:118,134,157`, `Game_Bible_v0_9_0.md:75`), and the president's operation
authority is to **authorize or reject concrete corps plans** (`Rulebook_v0_9_0.md:529-530`) — which
presupposes a plan put to them. CLAUDE.md's Sacred Rule on ops-only attacks says the same. The
original document's own parenthetical — that skipping the player is "CORRECT at Levels 0-2" — was
right, and **this half must not be reverted or unified with bot handling.**

### The real defect: the authorization path is dead at the DEFAULT autonomy level

*(Game Designer, 2026-09-05.)* Excluding the player from auto-apply is correct. What is broken is
that nothing takes its place at the default level.

- The dossier UI is **already fully built**: named commander, readiness axes, force-quality traits,
  and a five-way decision — Authorize / Delay / Redirect / Under-resource / Decline
  (`operationOpportunityDossiers.ts:269-277`).
- Every action button's `enabled` flag is `hasLiveReview` =
  `Boolean(review && status === 'eligible_pending_review')`. That review record only exists at
  Level 1. The IPC handler `resolve-operation-opportunity-decision` (`electron-main.cjs:4143`)
  likewise reads only `state.meta.pending_proposal_reviews`.
- `autonomy_level` defaults to `?? 0`, and per `docs/plans/2026-03-24-v082-autonomy-api-plan.md:47-50`
  **Level 0 = "Full Control" = "Player Handles Everything / AI Handles Nothing"** — the mode where
  the player should have the *most* direct authority, and where this decision class currently has
  none.

Net effect at default settings: **the dossier is fully populated and fully inert.** The uncanonical
third state this produces is **propose → display → silent expiry** — worse than either full autonomy
or full consultation, because the player is shown a decision they cannot make and then loses the
operation without having chosen anything.

### The corrected fix shape — split by autonomy level

| Level | Name | Behaviour | Status |
|-------|------|-----------|--------|
| 0 | Full Control (default) | **Staff the desk** — create the review record so the buttons that already exist go live | **Primary fix** |
| 1 | Strategic | Proposal generator already runs | Already correct, no change |
| 2 | Political | Auto-apply, or queue for the president? | **UNRESOLVED — open decision** |
| 3 | Observer | Sweep decides opportunities like any other faction (pass `null`) | Correct; retained from the original option 2 |

**Level 0 (default) — staff the desk.** Create the review record so the already-built dossier
becomes live. The UI, the five-way decision and the IPC handler all exist; only the review-record
plumbing is missing. This is the primary fix, and it is a *completion* of LANE B Phase 2, not a
reversal of it.

**Level 1 — already correct.** No change.

**Level 2 — UNRESOLVED. Do not assume a behaviour when implementing.** Level 2 is partial
delegation: the player handles political events, diplomacy and peace plans while the AI handles all
military. The Game Designer called the absence of a review queue "more defensible" here but **did
not rule**, and no seat has. The open question, stated in full:

> **At Level 2 (Political) — partial delegation, where the AI handles all military matters — does an
> operation opportunity for the player's faction auto-apply through the bot path, or does it queue
> for the president's authorization as it does at Levels 0 and 1?**

This must be answered by the Game Designer (with the Operations Expert on mechanism) before any
Level-2 behaviour is written. An implementer who picks one silently has made a command-model
decision that was not theirs to make.

**Level 3 (Observer) — the sweep is correct.** The player has delegated everything, including
political events; there is no human to protect. Pass `null`. This is the plan's existing option 2,
now retained **and justified** rather than merely offered — and it is consistent with how Observer
already treats events and historical operations.

## Design rationale — why the fix shape changed

Per `Game_Bible_v0_9_0.md:341`, the player is judged on *"how much worse they made it versus what
was possible."* Territory lost to a dead review queue lowers "what was possible" without the player
having made any judgeable choice — so the grade is measured against a ceiling that was never
reachable, which is a measurement defect rather than a difficulty setting. Staffing the desk does not
soften the game: once the review record exists, CA cost, commander pushback and faction-asymmetric
friction all still apply to every authorization. The negative-sum thesis is **served** by this fix,
not threatened by it — the player makes the choice and then bears its cost, which is the point.

## Measured cost and provenance

Endpoint deficit for the played faction: **RBiH −22 OSIDs, HRHB −18** (RS −2), from the D2
full-campaign set
(`docs/40_reports/playtests/20260901_d2_full_campaign_all_three_factions.md`, 2026-09-01).

**This is not a calibration-scoring defect.** Observer parity is byte-identical for all 188 turns,
and `scenario_runner` — the scoring instrument — is untouched by any of the above. The cost falls
entirely on the player path.

## Open question — the attribution is NOT confirmed

It is **not confirmed from source** that `OPERATION_OPPORTUNITY_CATALOG`
(`operation_opportunities.ts:544`) contains the specific late-1995 Federation operations that D2
blames for the deficit. Some of that late-war offensive may come from the ordinary commander-loop
channel instead, which is unaffected by this defect. Source-reading has been exhausted on this
question; settling it needs a run diff.

**First verification step, before any implementation:** run `tools/ai_play/op_launch_diff.ts` for
RBiH and HRHB and confirm which channel the missing late-1995 operations come from. Do not implement
against an unconfirmed attribution.

## Verification required

- **`tools/ai_play/op_launch_diff.ts` for RBiH and HRHB first** — confirm the attribution above
  before writing any code.
- Re-run all three D2 campaigns; the RBiH and HRHB deficits should close toward RS's ~2.
- **188w with `control_delta` diffed.** The change must remain inert on the calibration line — a run
  with no player faction should be untouched by construction, exactly as the auto-authorize change
  was (n389 vs n390 identical `final_state_hash`). Prove it, do not assume it.
- Observer parity must still hold at 188 turns.

## Related, still open

The three named-operation differences from the RS launch diff — `Operacija Strijela` /
`Operacija Ihlas` (arbih_3rd_corps), `Operacija Oklop` (vrs_sarajevo_romanija). The discriminator is
now cheap: run `tools/ai_play/op_launch_diff.ts` for RBiH and HRHB and see whether 3rd Corps churn
appears regardless of who plays. If it does, it is ambient bot variation, not a player effect. This
is the same run that settles the attribution question above.

---

## Correction record

**Corrected 2026-09-05** by the Product Manager seat, on findings from two Pyrrhic seats:

- **Operations Expert** — the mechanism: the exclusion is deliberate and commit-documented; the
  compensation is Level-1-only; the guard does not scale with autonomy as the rest of the pipeline
  does; scope is the LANE B catalog only.
- **Game Designer** — the verdict: excluding the player faction from auto-apply is **required by
  canon** and must not be reverted; the defect is the dead authorization path at the default level.

What changed: fix option 1 struck as canon-violating (kept visible, with its reason); replaced by a
fix shape split by autonomy level; Level 2 recorded as an explicitly open decision; scope, measured
cost, provenance and the unconfirmed attribution recorded.

**This correction corrects the plan. It does not authorize the work.** Implementation remains
QUEUED and requires its own go-ahead. Nothing here touches §6, the bright line, or the enclave
guard — the Game Designer confirmed this is a command-model completeness question, not an atrocity
or enclave matter.
