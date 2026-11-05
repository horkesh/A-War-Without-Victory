# Live vs no-player divergence: root cause is the opening paramilitary split (2026-11-05)

**Status:** investigation finding (read-only operations/systems review). It is not a fix, and nothing was adopted. The topic is a sensitive-history surface (paramilitaries), so any change goes to a Pyrrhic panel with the §6 delegation rules.

## Plain language

The live RBiH game and the no-player game are identical at the start except in one respect: paramilitaries in weeks 1–2.
- **No-player game:** the computer's RBiH sends paramilitaries in and takes four villages: Bukvik Gornji and Obadi in week 1, Biljesevo and Olovci in week 2.
- **Live game:** the player's RBiH cannot. Its paramilitary policy is still undecided in weeks 1–2, and from week 3 it uses the historical default, "always deny".

With paramilitary behaviour matched in an experiment, the two games stay identical in control through week 26:
- Trnovo plans t20–23 and recovers at t24 in both.
- Operation Circle plans at t25 and executes at t26 in both, so Goražde follows.

The whole later Trnovo → Circle → Goražde cascade therefore sits downstream of this one early difference.

## Evidence (PROVEN unless marked)

- **Differences at t0:**
  - Expected differences: player faction, autonomy, and the player-only `command_authority`.
  - Substantive differences:
    - the opening `rbih_state_identity` decision fires at t0 for the player (`desktop_sim.ts:237-272, 361`) and at t3 for the bot;
    - player-only negotiation/patron dimension setup (`desktop_sim.ts:360`);
    - a harmless `sector_combat_ratings` precompute (`desktop_sim.ts:381`).
  - Corps commands, campaign plans, formations, pending reviews, `decision_mode` and `paramilitary_policy` (`ask`) are identical.
- **t1:** the only differing control events are Bukvik Gornji and Obadi, mechanism `paramilitary`, in the no-player branch only.
- **First material code path:** `paramilitary-detect` (`war_phases.ts:1787`) → `paramilitary_sweep.ts:446`.
  - The line `if (faction === playerFaction && playerPolicyDecisionPending) continue;` skips player-faction spawning while the policy event is undecided (t1–t2).
  - From t3 the historical default `always_deny` applies to the player (`evaluate_events.ts:170-178` maps only the player faction).
  - The compare tool's `standing_allow` cannot bypass the pending gate (measured: still −2/−4).
- **Bot RBiH ignores its own policy (HYPOTHESIS of defect):** in the no-player branch the bot keeps spawning after its own `always_deny` (decided at t4). The policy is mapped for the player faction only (`paramilitary_sweep.ts:512-534`, `evaluate_events.ts:170-178`). This affects the HEADLESS baseline too.
- **Attribution experiment (scratch, not committed):**
  - Setup: remove the pending gate and set `always_allow` for the player.
  - At t1 and t4, the location, control and assignment diffs all fell to 0. They had been 5/2/20 at t1 and 9/4/34 at t4.
  - Over 26 turns only 1–3 brigade positions differ, and control is identical.

## Secondary findings

- **The player's staff gets no political directive (engine defect, class c).** `political_directive_producer.ts:290-292` returns null for the player faction at every autonomy level. The comment says the player sets directives "via UI handler", but no such handler exists. As a result, `army_directive_pushback` and the briefing overlay are missing for the player's corps. Injecting the bot's directive changed no positions through t12, so the effect is minor and unmeasured.
  - Minimal fix: return null only when the faction is not in `selectStaffControlledFactions(state)`. This is inert headless.
- **Queue pollution:** fixed in this branch (`player_injection_no_requeue_active.test.ts`). The live re-measure shows no score change, and 0 active-and-queued occurrences.

## Decisions this raises (for the panel / owner)

1. **History:** in spring 1992, did ARBiH-side irregulars (Patriotic League, Green Berets and local TO) hold Bukvik Gornji, Obadi, Biljesevo and Olovci?
   - If yes, the no-player result is historically right. The question is then how a historical always-deny RBiH player gets the same result through a lawful non-paramilitary path (TO/Patriotic League as organised defence, not paramilitary).
   - If no, the painted reference and the bot behaviour need review.
2. **Engine:** should the bot obey its own paramilitary policy? Fixing that moves the headless baseline, so it needs a measured 188w run and the panel's sign-off.
3. **Harness:** a compare-tool-only "bot-parity" paramilitary mode is safe. It is inert for `scenario_runner` and lets operations work be measured without this confound. It is a measurement aid only, never a calibration result.

## Queue-pollution fix: measured result (this branch)

- Live January 1993 at production autonomy, 39 turns: RBiH 698, RS 701, HRHB 703; no-player 702. All identical to the prestage-fix result.
- The `--trace-corps` check finds 0 active-and-queued occurrences (the pre-fix trace had many).
- Headless 188w is byte-identical to the manifest (final_save 26b80117…, weekly_report 5d25054d…, control_delta 27c9aaef…, activity_summary dbad0370…).
- Full suite exit 0.
- Panel decision on the paramilitary split: [paramilitary_panel/DECISION.md](paramilitary_panel/DECISION.md).

## Political-directive fix: measured result (this branch, commit 3be2a5bd8)

- Live January 1993 at production autonomy, 39 turns: RBiH 698, RS 701, HRHB 703; no-player 702. No score change.
- Mechanism confirmed in the RBiH-player final save:
  - `political_directives_by_faction` now holds HRHB, RBiH and RS (before: HRHB and RS only). The RBiH verb at t39 is HONOR_TRUCE.
  - `army_directive_pushback` mentions: 108 (before: 69).
- Headless 188w is byte-identical to the manifest (final_save 26b80117…, weekly_report 5d25054d…, control_delta 27c9aaef…, activity_summary dbad0370…).
- Full suite exit 0.

## AAR capture-chronology fix: measured result (this branch)

- Live January 1993: RBiH 698, RS 701, HRHB 703; no-player 702. No change.
- Headless 188w: byte-identical to the manifest. `verify_checkpoints` 702/704/701/691, exit 0. So no 188w operation hits the capture-then-later-loss case; the fix corrects player-facing AARs and grades where it occurs.
- Full suite exit 0.
