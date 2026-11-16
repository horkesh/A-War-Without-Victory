## 2026-11-16 — Zombie TG: a TG anchored by another corps' brigade dissolves with its operation (must-fix, measured)

RF fidelity-pass must-fix (orchestrator ruling, package "1994-95 attack and defence", Run B trace). Calibration is held: scores are recorded and are not a merge bar.

**Defect.** A Tactical Group (TG) takes its anchor brigade's corps (`formTacticalGroup`). `resolveTacticalGroupIdsForOperation` matched a non-Army-HQ TG to its operation only when `tg.corps_id === hostCorpsId`. A TG whose anchor came from another corps was therefore never engaged, drained or dissolved:
- On main, Operation Vlasic Ridge (a 7th Corps op, t146-164, anchored by the 3rd Corps' 314th) left its TG `forming` from t162 to t188. It held one of RBiH's 4 concurrent TG slots and one of the 3rd Corps' 2. Its donor, the 705th, kept 540 men lent for the rest of the war.
- The HVO's Operation Mistral 2 (a Tomislavgrad op anchored by a Main Staff brigade) had the same shape.
- On the P2 step-1 branch the zombie filled the RBiH cap at t180, so Farz 95 formed no TG. That is why its AAR had no Army HQ marker. Main passed P-A by one turn of timing.

**Fix.** A non-HQ TG matches its operation when it carries the operation's name and either:
- shares the host corps; or
- its anchor is of the host corps' faction and the anchor's own corps hosts no live operation of that name. This keeps the existing guarantee that a same-name operation in another corps cannot claim that corps' TG.

Four tests in `tests/tg_op_lifecycle.test.ts`: engage, dissolve and return donors, same-name guard, faction guard.

**Measured** (188w on main b1925876c; main reproduces its pin `df791f73c26ed642`; fix `3bc3cf56d6980cce`, twin 8/8 identical):
- Unchanged against main:
  - combat control events (204/204);
  - final control;
  - all 81 operations and their outcomes;
  - battle counts (501: RS 162, HRHB 43, RBiH 296);
  - control_delta, formation_delta, activity_summary, watched_operations.
- Checkpoints 709/709/708/681. Enclave guard holds. Farz P1/P-A PASS. Eastern provenance clean. `validate_run_consistency` PASS.
- **What changes.** Both zombies dissolve when their operations end, so 0 TGs are left at t188 (main: 2). The 705th's 540 men are returned.
  - From t180 Farz 95's TG draws its donors from the 3rd Corps only: the freed 705th is nearer, and donors are ordered by distance (it used three corps on main).
  - So four late battles change power ratio slightly (e.g. t180, 3.59 → 3.33). End-state personnel moves by a few dozen.
- Baseline pins re-pinned (`final_save.json` `df791f73…` → `3bc3cf56…`); `npm run test:baselines` green.

**Recorded, not fixed here:**
- Old saves keep any zombie TG already in them: there is no load-time sweep.
- The load-time Army HQ matcher (`tacticalGroupMatchesArmyHqOperation`) still matches TGs without an Army HQ id by corps only. Every TG made today carries the id, but the matcher should be checked.
- Two host corps with live same-name operations could both claim one third-corps TG. Names are unique per game (`pickOperationName`), so this is not reached in practice.
- The per-corps TG cap counts against the anchor's corps, so a 7th Corps operation uses a 3rd Corps slot. This predates the fix.

**Seats.**
- **corps-army-commander: APPROVE WITH NOTES.**
  - The TG is the host operation's instrument, so it is right to engage, drain and dissolve it with the operation.
  - Nothing else reads the TG caps or lent fields; the cap of 4 is now actually reachable.
  - Farz drawing 3rd Corps donors is the distance ordering working as designed.
- **operations-expert: APPROVE WITH NOTES.**
  - Name plus faction is safe: generated names are unique per game, and probe names carry the corps.
  - Do not add an anchor-in-operation check: `participating_brigades` is filtered mid-operation, and that check would bring the zombie back at recovery.
- **Recorded from the seats:**
  - An anchor whose faction differs from its corps' faction (the Usora HVO case) is still unmatched in a cross-corps operation.
  - A per-turn orphan-TG sweep is needed before ENGINE FREEZE, as its own change. It would also cover old saves, and operations dropped by `deferUnauthorizedHistoricalOperationsForPlayer` without going through recovery.
  - `buildArmyHqTelemetryFromTg` writes the anchor's corps as `anchor_corps_id` (cosmetic).

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/pkg-runB/` (`FARZ_HQ_TRACE.md`, `zombie_*.log`).
