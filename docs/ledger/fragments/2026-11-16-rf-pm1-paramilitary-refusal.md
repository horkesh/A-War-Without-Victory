## 2026-11-16 — RF-PM1: the paramilitary-refusal consequence fires only on a real refusal (§6 panel, measured)

RF fidelity-pass fix. Calibration is held: scores are recorded and are not a merge bar.

**Defect.** `csq_paramilitary_authorization_refused` tested only `paramilitary_mode_equals rear_pocket`, which is the default mode. On main it fired at t21 with RS holding 28 deployments and `rs_paramilitary_authorized` set. It:
- set `clean_record` and `paramilitary_authorization_refused`;
- paid RS +12 international standing and +12 international credibility (the credibility is a no-op, because the `negotiation_capital` key it writes is absent);
- unlocked Codex ghost 7 for every faction.

**Change.**
- New condition `paramilitary_deployments_at_most {faction, max}` reads `paramilitary_deployment_count`.
- The trigger now requires all of:
  - rear_pocket mode;
  - RS deployments at most 0;
  - `rs_paramilitary_authorized` not set;
  - RS war crimes not above 1.
- The narrative and effect text no longer claim a clean record. The historian wrote the narrative, the narrative-designer seat amended it, and the historian fact-checked the result. It ends: "That is not a record without killing. RS forces are still at war, and where they take a town, its people are still killed or driven from their homes." The effect text reads: "This does not mean RS forces killed no one."
- Ghost 7 (`predParamilitaryStreakRefused`) is RS-only.
- `rbih_paramilitary_policy_1992`: the `always_deny` preview no longer promises the RS-only consequence, and the `ask` explanation drops its internal id (engine C-1, red-team C-PM2). The RS `ask` explanation is reworded the same way.
- That event is under the reviewed-contract pin, so the pin is re-pinned to 11091 / `57f0d7f927df002c`. A pending decision saved before RF-PM1 carries the two old preview values; exactly those are upgraded before comparison (`PRE_RF_PM1_POLICY_PREVIEW`), and any other drift is still refused.
- Without the re-pin every RBiH policy response threw, and a player was stuck at the opening decision. The headless runs could not see it; the integrator and the lane found it in `pre_first_advance_paramilitary_policy` and `identity_pending_text_drift`.

**Measured** (188w, final run on main f5a7990af):
- final_state_hash `03921ba4a0863b80`. Checkpoints 709/709/708/681, per-cell delta zero, guards intact, strict health PASS (consistency 0).
- Diagnostic vs main 4cd7ba559: main fires at t21; the branch never fires; control-identical.
- What goes away: the false flags, ghost 7 for RBiH and HRHB players, and the +12 RS standing (it had decayed to nothing by w188).

**Recorded limitation (determinism seat P2).** A save played on the old code past t21 has already fired this once-only consequence. It keeps both flags and the +12 standing. Ghost 7 no longer shows it, because it now requires RS deployments = 0. There is no migration, because reversing deltas already paid would be a fabricated state write. `data/derived/latest_run_final_save.json` is such a save; it is regenerated with the normal artifact refresh, never by hand.

**Gate.** §6 panel:
- seats: historian, scenario-creator-runner-tester, engine/systems, red-team; determinism alongside;
- implementer excluded; named integrator;
- unanimous APPROVE with conditions, all met in this change;
- §6 record row in `SENSITIVE_HISTORY_DESIGN_GATE.md`.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/cl-rf-pm1-20261115/`. Register items PM1-R1 to PM1-R7 are in the out-of-scope register; none is tagged post-1.0.
