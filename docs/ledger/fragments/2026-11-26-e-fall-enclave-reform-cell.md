## 2026-11-26 — E-fall: enclave survivors re-form on friendly ground

Authority: the orchestrator's 2026-11-26 freeze-inventory ruling (E-fall MUST-FIX before 1.0, hash-neutral) and the 8-seat §6 panel (historian, scenario-tester, engine/systems, red-team, game designer, narrative designer, canon compliance, operations; no war-or-game seat). Round 1: five GO, three AMEND, all amendments landed; round 2 confirms. Record: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6, row "E-fall".

**Change.**
- The 'reduced' branch of `enclave_formation_displacement` (`src/sim/events/apply_effects.ts`, Srebrenica) placed the survivors on the authored destination with no control check. In a divergent game where the enemy held it, the enemy-territory safety net then took them off the map.
- Now: the authored destination if the side holds it (every hands-off game, unchanged). Otherwise the nearest held cell by a layered BFS over the operational contact graph, own corps territory first, then any held cell; never a fallen source cell or a cell of a named enclave; strictCompare only within a ring. If the graph reaches no such cell, the formation is disbanded (not destroyed; no pick by id order alone).
- The 'none' branch (Žepa) is unchanged. No new state, field, constant, RNG or receipt.
- Canon: SHDG §1 enclave bullet and §6 record; Systems Manual §16; Event Authoring Guide §5.2. FORAWWV unchanged.
- Test: `tests/enclave_formation_displacement.test.ts` ("E-fall"), red on main, green with the fix; `tests/enclave_displacement_default_on.test.ts` gains the hands-off premise (RBiH holds the destination).

**Measured.** Hash-neutral. The PR body lists the 188w pair (equal to main) and the live RBiH a2 hist and emer cells.
