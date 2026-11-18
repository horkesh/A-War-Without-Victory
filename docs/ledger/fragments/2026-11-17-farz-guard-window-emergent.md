## 2026-11-17 — Farz guard P-A: the September 1995 window, early falls, and emergent semantics (tooling only)

**Seats' ruling.** Scenario-creator-runner-tester, operations-expert and historian, convened on the orchestrator's question after the RF-ROSTER RB9 and §6 E1 cases.

**Window.**
- The P-A window now opens at t177: 21-27 Aug 1995, the week of the 25 Aug planning order. Uragan 95 ran 10-14 Sep 1995 (BB1 file p.423). Uragan's own enqueue and prestage turn is t177, so a later start would drop the Uragan match.
- **An RBiH capture of a Farz cell in [160, 177) is an early fall and fails that cell,** in both modes. That holds even if RS retook the cell and RBiH took it again inside the window.
- P-B's late 2nd-Corps scan keeps its own start (160), so tightening P-A does not shrink P-B.

**Modes.** The mode is read from the final save's `meta.decision_mode`.
- **Historical** (or no mode recorded): unchanged. The authored Farz receipts count (Army HQ registry id, #769), and so do the Uragan partner receipts.
- **Emergent** (the game as players get it, freeze condition 7): any RBiH operation-owned combat capture inside the window counts, whichever operation owned it. Probes, sweeps and other non-operation captures never count. Demanding the authored operation in emergent mode would be a railroad.

**Two points of the seats' report not adopted:**
- The window is not capped at t184. Main's own historical run takes Spreča at t185: an offensive concluding its objective after the ceasefire, allowed by the ceasefire's stand-down carve-out. A cap would fail main.
- The seats' "gap on main" (E1 failing) predates #769. With the registry id, E1 already counts on main, and the test now asserts it.

**Contract tests** (`tests/farz_objective_gate.test.ts`), in both modes:
- E1 (Farz at t179, no donor, no telemetry) counts;
- RB9 (generic captures at t166-170, Farz never launched) fails and names the early captures with their operations, never the `active_primary_corps` trace;
- an early capture, retaken and recaptured in the window, still fails;
- emergent credits a generic operation capture in the window and historical does not;
- a capture no operation owned never counts;
- no recorded mode behaves as historical.

64/64 pass with `tests/triggered_operations.test.ts`.

**Measured** with the old and new checker on the same runs. Verdicts are identical:
- main historical (`3b4685bc`): PASS;
- P2 historical (`6fff19a0`): PASS;
- P2 hands-off emergent (`382c3b55`): PASS, now credited as operation-owned;
- the pre-#729 step-1 run: FAIL on Spreča, as before.

No `src/` change, so the simulation hash is unchanged.

**Out-of-scope, for the register.** `injectArmyHqOperations` checks the corps slot before the live-objectives check, so `active_primary_corps` names the wrong blocker. RF-ROSTER is fixing the order in its precedence PR. The guard does not read that field.
