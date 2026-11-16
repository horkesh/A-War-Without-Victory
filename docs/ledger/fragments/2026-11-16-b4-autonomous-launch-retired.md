## 2026-11-16 — B4: the army commander's autonomous launch is retired (inert)

Batch B, item B4 (freeze cut, Fable consult 2 revision 2, RF-ROSTER "path a"): retire.

**Premise, measured.** `proposeAutonomousArmyLaunch` (the Mladić-class proposal, DDR Q3) needs a stubborn army commander past a 12-turn cooldown AND an eligible operation-opportunity catalog entry. On main's 188w it never found an eligible entry, so it never proposed. The final saves of the historical and hands-off emergent 188w carry no `last_autonomous_launch_turn`, no `cooldown_halved_applied`, no `kept_past_schedule_since_turn` and no `army_co_proposes_op` event. Turning the path on would start an untested mechanic before a permanent freeze and would need a §6 ruling first.

**Change.**
- Deleted `proposeAutonomousArmyLaunch`, its `AutonomousLaunchProposal` type and its call in the A3 step (`army_order_interpretation.ts`), with the now-unused catalog imports.
- Deleted the overstay rule that halved the launch cooldown by rewriting `last_autonomous_launch_turn` (`army_co_lifecycle.ts`), its `cooldown_halving` / `cooldown_halved_to_turns` roster keys (`data/scenarios/army_co_roster.json`, `ArmyCoVariationRules`) and `A4_DEFAULT_COOLDOWN_HALVED_TO_TURNS`.
- Kept for saves: the `army_co_proposes_op` event type and its validator, `NamedOfficerState.last_autonomous_launch_turn`, and the UI readers that tolerate a legacy event. `STUBBORNNESS_AUTONOMOUS_THRESHOLD` and `AUTONOMOUS_LAUNCH_COOLDOWN_TURNS` stay, because the army pushback panel reads them; they are documented as retired.
- Comments in `war_phases.ts` and the A3/A4 headers carry a "do not revive without a §6 ruling" note.

**Tests.** `a3_army_order_interpretation.test.ts` T5-T7 now guard the retirement: the export is gone; a stubborn commander proposes nothing in the A3 step; the source has no call. `a4_army_co_roster_personalities.test.ts` T6b: an overstay leaves `last_autonomous_launch_turn` untouched and the roster has no halving key. The A3, A4, A5 pushback and phase-4 UI slices pass (5 files, 72 tests); `tsc` 0.

**Proof.** Historical 188w against main `05cf3de0f`: final_save `799e43a7ee2f4764` (= baselines manifest). final_save, initial_save, weekly_report, control_delta, formation_delta, activity_summary, run_summary, end_report, watched_operations, operation_aars, the brigade and displacement logs and the replay manifest are all byte-identical to a main run. `run_meta.json` differs only in provenance (git commit and input digests). No re-bless.

**Follow-up (UI, not engine):** the pushback panel's "Autonomous-launch warning" section can now be shown only for a legacy save. It is a candidate for removal by the UI lane.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/` (b4_*).
