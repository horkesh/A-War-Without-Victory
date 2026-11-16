## 2026-11-16 — RB1: a takeover wave counts each person once (§6 panel, measured)

RF fidelity-pass fix. Calibration is held: scores are recorded and are not a merge bar.

**Defect.** The policy-timer and sustained takeover events logged the whole wave as `displaced` and also logged `killed` and `fled_abroad`. Everything that summed them counted the killed and the fled twice. On main, `refugees_created` read 1,971,236 at w188; counting each person once gives 1,485,614.

**Contract.** An event's `displaced` is the routed share only, and the wave is `displaced + killed + fled_abroad` (JSDoc on `DisplacementEvent.displaced`).

**Readers.** Each of these reads `refugees_created` or the event log, and each now takes the meaning it needs:
- `refugees_created` (humanitarian aggregates): each person once. It feeds treaty scoring, the Humanitarian Ledger, war dispatches and the refugee-flow milestones.
- Atrocity visibility (`patron_pressure.ts`): people harmed this turn = routed + killed + fled (red-team C-RB1).
- Turn summary (`compile_turn_summary.ts`): `displacement_total` = routed + fled; the new `displacement_killed` keeps the killed in the turn record. It is projected to the player and shown in the AAR as "Killed" / "Ubijeni" (red-team C-RB2).
- Endgame displacement ratio (`endgame_comparison.ts`): `refugees_created − civilian_casualties_caused`, clamped at 0, so it is counted like its historical baseline of people displaced (engine C1, scenario-tester C3).

**Measured** (188w, final run on main f5a7990af, final_state_hash `73345df85957100c`):
- Checkpoints 709/709/708/681, per-cell delta zero, guards intact, strict health PASS (consistency 0).
- `refugees_created` per causer → victim: RS→RBiH 1,062,156 → 822,669; RS→HRHB 337,388 → 221,404; RBiH→RS 362,043 → 281,732; RBiH→HRHB 45,157 → 33,789; HRHB→RS 127,960 → 98,011; HRHB→RBiH 36,532 → 28,009.
- The reader fixes move only off-map values: at w188, atrocity visibility 0.02355 → 0.03354, composite IVP 0.5497 → 0.5517; patron commitment in the 4th decimal; some negotiation-ledger entries; terminal exhaustion slightly.

**Historian sanity check (recorded, not a target).**
- Displaced + fled is 1,444,732, which is 66% of the UNHCR ~2.2M in `data/reference/historical_baseline.json`.
- Main's 88% came from the double count.
- The model figure is a flow summed over events, and the UNHCR figure is a war-end stock, so a faithful flow should come out at or above the record. The gap is known.
- The real gap is fled abroad: 448k against about 1.2M (register RB1-R2).

**Recorded limitation (determinism seat B2).** A save played across the upgrade keeps cumulative stores that mix both contracts:
- `refugees_created`;
- `displacement_recent_by_turn` (it ages out);
- `displacement_flows_by_osid`;
- the turn summaries.

The per-turn event log is cleared each turn and does not mix. The overstatement cannot be recovered exactly, and the schema stays 38. No migration.

**Gate.** §6 panel:
- seats: historian, scenario-creator-runner-tester, engine/systems, red-team; determinism alongside;
- implementer excluded; named integrator;
- unanimous APPROVE with conditions;
- §6 record row in `SENSITIVE_HISTORY_DESIGN_GATE.md`.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/cl-rb1-20261115/` and the seat and integrator files in `_logs/cl-rf-pm1-20261115/`. Register items RB1-R1 to RB1-R3; none is tagged post-1.0.
