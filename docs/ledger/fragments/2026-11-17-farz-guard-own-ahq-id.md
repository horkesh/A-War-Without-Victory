## 2026-11-17 — Farz guard P-A: the operation's own Army HQ id identifies the authored Farz (tooling only)

Orchestrator ruling on the Run B Farz trace (package "1994-95 attack and defence"). Checker-only: the simulation hash is unchanged.

**Defect.** `tools/lib/farz_objective_gate.cjs` identified the authored Farz 95 AAR only by `army_hq_telemetry.army_hq_op_id`.
- The engine builds that telemetry only from the operation's Tactical Group (TG).
- A TG forms once, at the ready transition, and is refused when the faction TG cap is full.
- So a Farz that `injectArmyHqOperations` registered as the Army HQ operation (`ahq:RBiH:N:farz_95`, `op.army_hq_op_id` set) could take its objectives by operation-owned combat and still fail P-A, from cap timing alone.
- This happened on the P2 step-1 branch, in the L7 lane's N5 follow-up 1, and in RF-ROSTER's #747 emergent run.

**Fix.** The gate also reads the final save's Army HQ registry (`state.military.army_hq_operations`):
- an AAR is the authored Farz when its `operation_id` equals `${anchor_corps_id}:${name}:t${formed_on_turn}` for a registered `ahq:RBiH:<year>:farz_95` record;
- TG telemetry stays optional detail;
- the match is exact (corps, name, start turn), so no other operation is accepted;
- every capture still needs a logged, battle-recorded, operation-owned receipt inside the window.

**Tests.**
- `tests/farz_objective_gate.test.ts`: accepted without telemetry. Rejected:
  - another operation's AAR;
  - a Farz-named AAR from another corps or start turn;
  - another Army HQ record (Krivaja);
  - no registry.
  The registered Farz still fails when it missed an objective, and an AAR identified both ways counts once.
- Engine contract (`tests/triggered_operations.test.ts`): an injected Farz's registry record reproduces the id `finalizeOperationAAR` writes, with no TG formed.

**Measured.**
- 188w on main after #729: `final_state_hash` equals the pin `3b4685bc356210d5`.
- Re-scoring earlier runs:
  - main and the zombie-fix run still PASS P-A;
  - the P2 step-1 run, where Farz formed no TG, now finds its 1 authored AAR with 3/4 receipts, and fails correctly on Spreča, which was not taken.

**Seats.** Both APPROVE WITH NOTES:
- **scenario-creator-runner-tester:** the id reproduces exactly. The only theoretical false accept is a President-authored op named exactly "Operation Farz 95", in the 3rd Corps, on the injection turn; that is not reachable headless.
- **operations-expert:** registered-but-never-run and double-registration fail closed; an entry outliving its op cannot match another AAR. Suggested the engine contract test, which is added.
