## 2026-11-26 — The checkpoint tool reads the Farz receipts in three tiers (GATE / SHAPE / TRIPWIRE)

Authority: Fable consult 10 appendix A, adopted as orchestrator ruling §26. Tool-only, hash-neutral: no engine code, no run artifact changes.

**Change.**
- `tools/lib/farz_objective_gate.cjs` gains pure tier functions: `easternCaptureGate`, `operationOwnershipGate`, `farzLivenessGate` (GATE); `earlyFarzFalls`, `stoppingLineRows`, `anchorContract` (SHAPE); `receiptTripwire` with `TRIPWIRE_BOUNDS` (early <= 1, stopping line <= 3, held at w188 >= 3, anchors >= 29). `JOINT_CORPS` is exported once.
- `tools/verify_checkpoints.cjs` prints G1-G3, S1-S5 and the tripwire. GATE and TRIPWIRE rows exit 1; SHAPE rows exit 0. The old P-A receipt completeness and P1 become SHAPE; the old 2nd-Corps-only P-B becomes G1 (eastern, any ARBiH corps) plus S4 (the stopping line, 2nd and 3rd Corps, warranted when the October 1995 reference has the cell RBiH). `--no-farz-guard` still makes the Farz rows informational.
- Canon: Systems Manual paragraph "The Farz receipts are read in three tiers". Engineering: `PIPELINE_ENTRYPOINTS.md`.
- Tests: `tests/farz_receipt_tiers.test.ts` (11 cases); `tests/farz_objective_gate.test.ts` unchanged and green.

**Measured on the 57 runs of consult 10.** 54 exit 0. The unlock run (25cef1e3) fails G1 (Lopare, Šekovići x2, Vlasenica, 2nd Corps). Lane B's k_rate_emer (7d598fee) fails G2: an RBiH retake of gornja Bočinja at t183 with no operation. Lane B A6 (dedbd200) trips (four Farz cells early, no authored Farz). Main emergent (675bf8fb) lists Vitkovci, Boljanić and Petrovo on the stopping line; A6 no longer flags Maglaj Jablanica. Main historical (dad31fc9) and P2.4 (2345a6cf / fd64de05) pass every gate and the tripwire.
