## 2026-11-16 — Zombie TG: a TG anchored by another corps' brigade dissolves with its operation (must-fix, measured)

RF fidelity-pass must-fix (orchestrator ruling, package "1994-95 attack and defence", Run B trace). Calibration is held: scores are recorded and are not a merge bar.

**Defect.** A Tactical Group (TG) takes its anchor brigade's corps (`formTacticalGroup`). `resolveTacticalGroupIdsForOperation` matched a non-Army-HQ TG to its operation only when `tg.corps_id === hostCorpsId`. A TG whose anchor came from another corps was therefore never engaged, drained or dissolved:
- On main, Operation Vlasic Ridge (a 7th Corps op, t146-164, anchored by the 3rd Corps' 314th) left its TG `forming` from t162 to t188. It held one of RBiH's 4 concurrent TG slots and one of the 3rd Corps' 2. Its donor, the 705th, kept 540 men lent for the rest of the war.
- The HVO's Operation Mistral 2 (a Tomislavgrad op anchored by a Main Staff brigade) had the same shape.
- On the P2 step-1 branch the zombie filled the RBiH cap at t180, so Farz 95 formed no TG. That is why its AAR had no Army HQ marker. Main passed P-A by one turn of timing.

**Fix: a stable lifecycle identity.**
- A TG now records `host_corps_id` when it forms: the corps whose `active_operations` holds the operation (object identity, else a unique name + start-turn match).
- A non-HQ TG matches its operation by host corps + operation name.
- An earlier draft matched cross-corps TGs by name + faction. Codex review found that an unrelated same-faction corps with a same-name operation (player-authored names are not globally unique) could then claim and dissolve another corps' TG. The draft was replaced.
- TGs formed before the field existed keep the legacy host = `corps_id` rule. `host_corps_id` is optional, so saves stay compatible.

**Tests** (`tests/tg_op_lifecycle.test.ts`):
- host recorded by object identity, and by a unique name + start-turn match;
- engage;
- dissolve and return donors;
- a same-name operation in a third corps, or in the anchor's own corps, cannot claim it (the Codex case);
- a legacy TG keeps the old rule.

389/389 pass across the TG and Army HQ files; tsc 0.

**Measured** (188w on main 69c566349; main reproduces its pin `03159b9ee1e5877f`; fix `27637190e868d811`, twin 8/8 identical):
- Unchanged against main:
  - combat control events (204/204);
  - final control;
  - all 81 operations and their outcomes;
  - battle counts (501: RS 162, HRHB 43, RBiH 296);
  - control_delta, formation_delta, activity_summary, watched_operations.
- Checkpoints 709/709/708/681. Enclave guard holds. Farz P1/P-A PASS. Eastern provenance clean. `validate_run_consistency` PASS.
- **What changes.** Both zombies dissolve when their operations end, so 0 TGs are left at t188 (main: 2). The 705th's 540 men are returned.
  - From t180 Farz 95's TG draws its donors from the 3rd Corps only: the freed 705th is nearer, and donors are ordered by distance.
  - So a few late battles change power ratio slightly.
- Baseline pins re-pinned (`final_save.json` `03159b9e…` → `27637190…`); `npm run test:baselines` green.

**Recorded, not fixed here.** The orphan-TG per-turn sweep is accepted as a pre-freeze must-fix, as its own change. It will cover:
- old saves that already hold a zombie;
- operations dropped without going through recovery (`deferUnauthorizedHistoricalOperationsForPlayer`);
- the legacy Army HQ load-time matcher (`tacticalGroupMatchesArmyHqOperation`, corps-only for TGs without an Army HQ id);
- the Usora-style anchor whose faction differs from its corps'.

Also: the per-corps TG cap counts against the anchor's corps, which predates the fix. `buildArmyHqTelemetryFromTg` writes the anchor's corps as `anchor_corps_id`, which is cosmetic.

**Seats.**
- **corps-army-commander: APPROVE WITH NOTES.**
  - The TG is the host operation's instrument, so it is right to engage, drain and dissolve it with the operation.
  - Nothing else reads the TG caps or lent fields; the cap of 4 is now actually reachable.
  - Farz drawing 3rd Corps donors is the distance ordering working as designed.
- **operations-expert: APPROVE WITH NOTES.**
  - Do not add an anchor-in-operation check: `participating_brigades` is filtered mid-operation, and that check would bring the zombie back at recovery.
  - The host-corps identity needs no such check.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/pkg-runB/` (`FARZ_HQ_TRACE.md`, `zombie3_*.log`).
