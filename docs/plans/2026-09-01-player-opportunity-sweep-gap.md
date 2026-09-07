# The player faction's opportunities are never decided — BC01 ACTIVE

**Date:** 2026-09-01 · **Status:** BC01 ACTIVE, owner scheduled 2026-09-07. Attribution proof runs first; implementation has not started.
**Corrected:** 2026-09-05 — the fix section was rewritten (see *Correction record* at the end). The
root-cause trace below is unchanged and still holds.
**Corrected again:** 2026-09-05 — the Level-2 open question is RULED (auto-apply, does not queue);
two factual citation errors fixed; canon-clarification recommendations recorded (see the second
*Correction record* entry at the end). Still does not authorize implementation.
**Found by:** the D2 full-campaign set —
[all three factions](../40_reports/playtests/20260901_d2_full_campaign_all_three_factions.md).
**Blocks:** ahistorical playthrough experiments. Does NOT block observer parity, which is unaffected.

## Current handoff — 2026-09-07

**ACTIVE — owner instruction “Start BC01 then”, 2026-09-07.** This schedules BC01 only; BC02–BC07 retain D1. No source writes before the attribution gate below is assessed. Existing home: [Master BC01](MASTER_ROADMAP.md#41-finite-behavior-closure-register-2026-09-07) / [R8 acceptance detail](2026-07-31-full-campaign-electron-validation-plan.md#behavior-closure-acceptance-detail-2026-09-07). [BC08 verification](../40_reports/audits/20260907_BC08_CURRENT_ENGINE_HEALTH_VERIFICATION.md) is closed by bounded disposition, not an overall-green or player-path proof. BC01 is active; BC02–BC07 remain pending under D1. The corrected contract governs this repair.

**Controlling autonomy interpretation:** L0 creates a live human review; L1 preserves existing review; L2 auto-applies military opportunities with **no queue**; L3 retains automatic observer decisions. New campaigns start at L2; the missing-field fallback is L0. Earlier text below saying “default L0” or “Levels 0–2 belong to the human” is historical diagnosis, superseded by the dated corrections and this summary. Do not implement a blanket post-turn player sweep. Acceptance covers all four levels, RBiH/HRHB player-path deficits and RS regression, not headless parity alone. **First when scheduled: run `tools/ai_play/op_launch_diff.ts` for RBiH and HRHB before implementation; attribution to the opportunity channel remains unconfirmed.** Current acceptance also requires no-player calibration neutrality on the n392 lineage, all-three-player runs and observer parity; the verification section below remains controlling. This handoff introduces no new design.

## Bounded execution plan — 2026-09-07

**Authority and scope:** existing BC01 only. Attribution runs finish on unchanged source first;
then a clean sibling checkout at `F:/AWWV-worktrees/bc01-player-opportunities`, branch
`codex/bc01-player-opportunities`, supplies the fresh canonical no-player PRE 188-week baseline
before any source edits. The dirty root checkout and its unrelated scheduled-task lock stay intact. Gameplay/systems
implements; independent architecture and QA review. No new lane, mechanics, canon, initial-control,
scenario, baseline or default-autonomy change. No blanket player post-turn sweep. The earlier
“not authorized” passages record their September 5 status; the owner scheduling above supersedes
that timing alone. Use writing-plans and test-driven-development discipline inside this existing home.

1. **Attribution gate (in progress, architecture owns runs).** Preserve exact RBiH/HRHB
   `op_launch_diff.ts` artifacts and classify missing launches by channel before implementation.
   A catalog-fix claim about the territorial deficit is allowed only if the evidence supports it.
   If attribution fails, revise this bounded causal claim before code; do not widen to commander AI.
2. **Failing engine contracts first.** Extend `tests/operation_opportunities_phase2_decisions.test.ts`
   and the relevant real war-pipeline test: L0 review actually generated and actionable; L1 preserved;
   L2 auto-apply/no queue; L3 automatic; non-player and no-player paths unchanged; repeated calls and
   delayed/resolved proposals do not duplicate decisions or launches. Verify absence of silent expiry
   caused solely by missing ownership. Run focused tests to observe the intended red before edits.
3. **Minimal engine routing.** Own `src/sim/combat/operation_opportunities.ts` and
   `src/sim/turn_phases/war_phases.ts`. Protect a present human only at L0/L1 for opportunity
   auto-decisions; generate reviews at those levels. Keep existing sorted proposal iteration,
   eligibility/admission and single decision writer. Preserve no-player inputs by construction;
   do not change `desktop_sim.advanceTurn` into an unconditional bot sweep.
4. **L2 dossier rider, with UI tests first.** Own `src/ui/map/data/operationOpportunityDossiers.ts`,
   its view types in `src/ui/map/data/types.ts`, and
   `src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx`, plus necessary adapter
   projection/copy and focused tests. Launched opportunities must remain visible with actual staff/
   commander reasoning and exact live operation/corps identity. Bind through persisted resolution,
   never normalized display-name similarity. Reuse the existing Stop-op decision/IPC path; no new
   lever or authorization action. Test wrong-faction/stale/completed operation exclusion, truthful
   disabled states and a live Stop-op affordance, alongside unchanged L0/L1 five-way review actions.
   Extend existing `tests/ui/decision_room_stop_op_executing.test.ts` and
   `tests/ui/directive_card_stop_op_action.test.ts` only if the reused bridge changes.
5. **Review and proof.** Focused engine/UI tests, typecheck, relevant state/migration/serialization
   checks if persisted fields change (prefer no schema change), canonical full suite and desktop map
   build; live UI proof for launched reasoning/Stop-op. Independent review checks singular ownership,
   deterministic ordering and no authorization leak. Final behavior evidence: fresh controlled
   no-player 188w neutrality on n392 lineage, all-three player paths, observer parity and the
   attribution comparison again. One controlled candidate per run; no baseline update. Runs are
   serial under the root's orchestration, never concurrent with changing source.
6. **Closeout only on actual evidence.** Update this checklist, master/board/R8, GUI/calibration
   pointers as affected, report/index and ledger/knowledge; preserve failures and limitations.
   BC01 is not closed by engine unit tests alone or by headless parity; other BC rows remain pending.

**Canon basis:** War Specification requires deterministic War-only mechanics; Engine Invariants
§14.10b and Systems Manual's player-automation boundary inform the dated L2 ruling above. Existing
presidential review and Stop-op paths remain the authority. No new canon design is proposed;
precise stale-unbuilt-status propagation in §14.10b/Systems Manual requires the independent
panel disposition before any canon edit. Historical-operation authorization is unchanged at every level.

## Historical diagnosis and correction record

## The defect

```
scenario_runner.ts:2646   applyBotOpportunityDecisions(state, turn, null)   <- null = ALL factions
war_phases.ts:2549        const playerFaction = context.state.meta.player_faction ?? null;
war_phases.ts:2551        applyBotOpportunityDecisions(context.state, ... playerFaction ...)
desktop_sim.ts            no post-turn opportunity sweep at all
```

The calibration runner sweeps every faction's opportunities after each turn with an explicit `null`.
The in-pipeline step skips the player faction — correct for human review at L0/L1, but incomplete at L2, which must auto-apply military opportunities — and `advanceTurn` never performs the post-turn sweep that
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
  `commander_loop.ts:236,258` gates on `autonomyLevel === 1` only; `war_phases.ts:2245-2287` use
  `fid === playerFaction ? autonomyLevel >= 2 : true`. The opportunity skip has no such scaling. The
  inconsistency is evidence of an **unfinished build**, not an intended design.
  *(Corrected 2026-09-05 — Game Designer: `war_phases.ts:934-941` (`selectBotBrigadeOrderFactions`,
  `assistedExecutionActive`) gates brigade orders at `autonomy_level >= 1`, not the
  `fid === playerFaction ? autonomyLevel >= 2 : true` pattern originally cited here; that pattern is
  correct for `war_phases.ts:2245-2287` only [`ai-army-decisions` / `ai-corps-decisions`]. The
  corrected reading strengthens this section's argument rather than weakening it: every military
  decision class scales its guard with autonomy in one of two documented ways, and the opportunity
  skip alone scales in neither.)*

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

### Historical diagnosis: the authorization path is dead at L0 (not the shipped L2 default)

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
  *(Corrected 2026-09-05 — Game Designer: this is true of the field default but not of a started
  campaign. New campaigns start at autonomy **Level 2**, not Level 0 — `desktop_sim.ts:346`, with a
  deliberate, measured rationale recorded in the comment at :331-346: Level 1's `=== 1` guard held
  commander plans at `ready` and starved the war of engine drive, so the shipped default is
  "LEVEL 2, NOT LEVEL 1." This does not reopen the Level-0 fix below — staffing the desk remains
  right for a player who has deliberately chosen Full Control — but the implementer should know that
  L0 is not where most players will be, and that under the Level-2 ruling recorded further down, the
  **default campaign gets auto-apply**, not a review queue. It changes who each half of the fix
  serves, not either half.)*

At L0 without a review record, **the dossier is fully populated and fully inert**; the shipped L2 default instead requires auto-application. The uncanonical
third state this produces is **propose → display → silent expiry** — worse than either full autonomy
or full consultation, because the player is shown a decision they cannot make and then loses the
operation without having chosen anything.

### The corrected fix shape — split by autonomy level

| Level | Name | Behaviour | Status |
|-------|------|-----------|--------|
| 0 | Full Control (missing-field fallback, not campaign default) | **Staff the desk** — create the review record so the buttons that already exist go live | **Primary fix** |
| 1 | Strategic | Proposal generator already runs | Already correct, no change |
| 2 | Political | **Auto-apply through the bot path — does not queue** (Game Designer ruling, 2026-09-05) | **RULED — see below** |
| 3 | Observer | Sweep decides opportunities like any other faction (pass `null`) | Correct; retained from the original option 2 |

**Level 0 (Full Control) — staff the desk.** Create the review record so the already-built dossier
becomes live. The UI, the five-way decision and the IPC handler all exist; only the review-record
plumbing is missing. This is the primary fix, and it is a *completion* of LANE B Phase 2, not a
reversal of it.

**Level 1 — already correct.** No change.

**Level 2 — RULED (Game Designer, 2026-09-05).** Level 2 is partial delegation: the player handles
political events, diplomacy and peace plans while the AI handles all military. The Game Designer had
earlier called the absence of a review queue "more defensible" here but not ruled. The open question,
stated in full as it was asked:

> **At Level 2 (Political) — partial delegation, where the AI handles all military matters — does an
> operation opportunity for the player's faction auto-apply through the bot path, or does it queue
> for the president's authorization as it does at Levels 0 and 1?**

**The ruling: auto-apply through the bot path. It does not queue.** This is precedent-based, not a
first-principles judgement:

- `commander_loop.ts:261` gates presidential authorization of a corps operation launch on
  `autonomyLevel === 1`, **not** `<= 1` — so at Level 2 a commander's plan already advances to
  `executing` with no presidential authorization. **This is the same decision arriving by a different
  channel**, not an analogy. Ruling "queue" would make the LANE B catalog the only operation-launch
  decision in the game that holds for a human at Level 2, so the same operation would or would not
  need authorization depending on which subsystem proposed it — a distinction the president cannot
  see and canon does not draw.
- The convention is canon, named the **"Player automation boundary"**: `Systems_Manual_v0_9_0.md:187`,
  `Engine_Invariants_v0_9_0.md:455` (§14.10a), `Rulebook_v0_9_0.md:382`. Canon records recruitment's
  `>= 2` carve-out *because it differs from the `>= 1` staff-execution default*; opportunity decisions
  have no carve-out recorded anywhere, so they fall to the general rule.
- The one decision class the player retains at Level 2 — political event decisions — is gated at
  `>= 3` (`evaluate_events.ts:668`), exactly where the autonomy table draws Level 2's line. **There is
  no military decision class in the codebase that queues for the player at Level 2.**
- The autonomy design already anticipated the concern behind "queue" and answered it with **override,
  not a queue** — `docs/plans/2026-03-24-v082-autonomy-api-plan.md` §4: *"At Level 2 (Political): AI
  proposes army-level directives. Player sees them as a briefing. Player can override specific corps
  stances or operation approvals."* / *"Override does NOT change the autonomy level. It is a
  per-decision escape hatch."* The shipped **Stop op** lever is that hatch: `electron-main.cjs:2569`,
  costs `STOP_OP_COST`, **no autonomy gate**.
- Autonomy table wording: Level 2's "AI Handles" column reads *"All military (army + corps +
  brigades)"*; **"operation approval" is listed as a Player-Handles item at Level 1 and dropped at
  Level 2** — the table had the vocabulary and chose not to carry it down.

**Implementation rider — a requirement, not an aside.** Auto-apply is correct *provided the launch is
surfaced*. The existing dossier must not go dark at Level 2 — it must render the launched operation
with the commander's reasoning and a live Stop-op affordance, read-only as to authorization. A silent
launch converts "the player watched an offensive he would have declined" into "the player never
knew," which breaks attribution.

**Failure-mode comparison.** Auto-apply's failure is recoverable (Stop op, priced in CA, no autonomy
gate), visible, and in character. Queue's failure is unrecoverable without abandoning the level
(nothing sits between "asked about every opportunity" and "asked about nothing"), fails silently via
lapse, and is worth RBiH −22 / HRHB −18 OSIDs.

**The unifying principle**, in the ruling's own framing: *no decision may be left in a state where it
neither reaches the player nor gets decided.* At Level 0 the cure is to make it reach the player
(staff the desk); at Level 2 the cure is to make it get decided (auto-apply). The Level-0 fix and this
Level-2 ruling are the same rule at opposite ends of one axis — consistent, not opposed.

**This ruling closes the open question. It does not authorize the work** — see the correction record
below.

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

## Canon clarification recommended (not authorized)

*(Game Designer, 2026-09-05.)* The Level-2 ruling above requires no canon *change* — it reads an
existing boundary — but **two seats in a row have had to infer it** rather than read it stated
plainly. That is the signal it should be written down. Four targets, in priority order:

1. **`docs/plans/2026-03-24-v082-autonomy-api-plan.md` §2, the level table** — add an explicit
   operation-authorization row: presidential authorization of corps operations (both commander-loop
   plans and LANE B opportunities) applies at Levels 0-1 and delegates at Levels 2-3. Plan document —
   **no panel needed**.
2. **`docs/10_canon/Systems_Manual_v0_9_0.md` §187, "Player automation boundary"** — record that
   operation-opportunity decisions follow the corps staff-execution rule and delegate at autonomy 2
   and above, the same as the recruitment carve-out already recorded there.
3. **`docs/10_canon/Engine_Invariants_v0_9_0.md` §14.10a** — currently recruitment-only
   ("Shared recruitment eligibility and autonomy"). Generalize the section to the automation boundary,
   or add the parallel invariant for opportunity decisions alongside it.
4. **`docs/10_canon/Rulebook_v0_9_0.md` §1 (Presidential Command Model) and §17.3 item 3** — lever #1
   "Authorize op" currently reads as level-independent. Note that the authorize/reject lever is
   exercised at autonomy 0-1, and that at 2+ the president's operation lever is **Stop op** rather
   than Authorize op.

**Items 2-4 touch canon and require Pyrrhic-panel sign-off per CLAUDE.md.** None of the four has been
drafted. This document does not authorize drafting or landing any of them.

**One item is beyond any single seat, named so it is not mistaken for settled here:** a proposal to
overturn the `commander_loop.ts:261` `=== 1` convention — i.e. to make Level 2 queue operations
*generally*, not just the LANE B catalog — is a change to the autonomy level table itself, and the
shipped campaign default (`desktop_sim.ts:346`) depends on that convention with a measured rationale.
**That goes to the owner, not to a panel and not to this ruling.**

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

## Current verification required

- **`tools/ai_play/op_launch_diff.ts` for RBiH and HRHB first** — confirm the attribution above
  before writing any code.
- Re-run all three D2 campaigns; the RBiH and HRHB deficits should close toward RS's ~2.
- **188w with `control_delta` diffed.** The change must remain inert on the calibration line — a run
  with no player faction should be untouched by construction, exactly as the auto-authorize change
  was (n389 vs n390 identical `final_state_hash` — historical comparison only; n390 is not current acceptance evidence). Prove a fresh controlled no-player comparison on the accepted n392 lineage when scheduled; do not assume it.
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

---

**Corrected again 2026-09-05** by the Game Designer seat, ruling the Level-2 open question:

- **The ruling:** at Level 2 (Political), an operation opportunity for the player's faction
  auto-applies through the bot path; it does not queue. Precedent-based: `commander_loop.ts:261`
  already gates presidential authorization of a corps-operation launch on `autonomyLevel === 1`, so
  Level 2 auto-launches the same decision by a different channel today; the "Player automation
  boundary" convention (`Systems_Manual_v0_9_0.md:187`, `Engine_Invariants_v0_9_0.md:455`,
  `Rulebook_v0_9_0.md:382`) and the autonomy level table both delegate all military decisions at
  Level 2 with no carve-out for opportunities; and the shipped **Stop op** lever
  (`electron-main.cjs:2569`, no autonomy gate) is the design's own answer — override, not a queue.
  The dossier must still surface the launch with the commander's reasoning and a live Stop-op
  affordance; visibility is required, authorization is not.
- **Two factual corrections to material this correction record's predecessor introduced:**
  (1) `war_phases.ts:934-941` gates brigade orders at `autonomy_level >= 1`, not the
  `fid === playerFaction ? autonomyLevel >= 2 : true` pattern this document had attributed to it —
  that pattern belongs to `war_phases.ts:2245-2287` only. The corrected citation strengthens the
  document's scaling argument rather than weakening it. (2) New campaigns start at autonomy
  **Level 2**, not Level 0 (`desktop_sim.ts:346`, deliberate rationale at :331-346) — the document's
  *"`autonomy_level` defaults to `?? 0`"* is true of the field, not of a started campaign. This does
  not reopen the Level-0 fix, but it means the **default campaign gets auto-apply** under this
  ruling, not a review queue.
- **Canon-clarification recommendations recorded, none authorized:** four documents named in
  priority order (the autonomy-plan level table; `Systems_Manual` §187; `Engine_Invariants` §14.10a;
  `Rulebook` §1/§17.3) — the first is a plan-doc edit needing no panel, the other three touch canon
  and **require Pyrrhic-panel sign-off per CLAUDE.md**. None has been drafted.
- **One item flagged as beyond any single seat, for the owner:** overturning the
  `commander_loop.ts:261` `=== 1` convention itself — i.e. making Level 2 queue operations generally,
  not just the LANE B catalog — would change the autonomy level table the shipped campaign default
  depends on. That is not settled by this ruling and does not go to a panel; it goes to the owner.

**This closes the Level-2 open question. It still does not authorize the work.** Implementation
remains QUEUED. Nothing here touches §6, the bright line, or the enclave guard.
