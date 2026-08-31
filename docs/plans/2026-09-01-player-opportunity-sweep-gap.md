# The player faction's opportunities are never decided — QUEUED

**Date:** 2026-09-01 · **Status:** QUEUED, not started. Located and evidenced; fix not attempted.
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

## Fix options (unranked — needs a decision)

1. **Have `advanceTurn` run the post-turn sweep** that `scenario_runner` runs. Closest to parity,
   but it would resolve opportunities for a present human player too, which is wrong at Levels 0-2.
2. **Pass `null` instead of `playerFaction` at Level 3 only** in the in-pipeline step, so Observer
   decides opportunities like any other faction while Levels 0-2 keep them for the human. Narrower,
   and consistent with how Observer already treats events and historical operations.
3. Something else — the two above are the obvious candidates, not an exhaustive list.

Option 2 looks right on the same reasoning that settled the event and authorization gates: at
Observer there is no human to protect, and an undecided opportunity does not wait, it is silently
forfeited for the rest of the war.

## Verification required

- Re-run all three D2 campaigns; the RBiH and HRHB deficits should close toward RS's ~2.
- **188w with `control_delta` diffed.** The change must remain inert on the calibration line — a run
  with no player faction should be untouched by construction, exactly as the auto-authorize change
  was (n389 vs n390 identical `final_state_hash`). Prove it, do not assume it.
- Observer parity must still hold at 188 turns.

## Related, still open

The three named-operation differences from the RS launch diff — `Operacija Strijela` /
`Operacija Ihlas` (arbih_3rd_corps), `Operacija Oklop` (vrs_sarajevo_romanija). The discriminator is
now cheap: run `tools/ai_play/op_launch_diff.ts` for RBiH and HRHB and see whether 3rd Corps churn
appears regardless of who plays. If it does, it is ambient bot variation, not a player effect.
