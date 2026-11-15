## 2026-11-15 — RF-F1g: the corps threat ratio reads the OSID contact graph (correct; final state unchanged)

Register item F1g, from the realism audit (`docs/40_reports/implemented/20261114_RF_F1_SID_SWEEP.md`).

**Premise, measured on main's 188w.** `computeSectorThreat` expands a corps' brigade positions to their neighbours with `buildOsidAdjacency(edges)`. But the war step passed the canonical settlement edges (`S…` ids, `data/derived/settlement_edges.json`), while brigade locations are OSIDs. Replaying the function over the run's brigade log gave a threat of 0 in **3,292 of 3,292** corps-turns. With the OSID contact edges the same positions give 640 corps-turns above the 1.5 defensive line (VRS Herzegovina 144/188, SRK 139, 2nd Krajina 135, HVO NW Bosnia 120, HVO Central Bosnia 63).

**Ruling (corps-army-commander, before code).** Pass `od.edges` (the graph preCombat spatial adjacency is built from) at all three call sites: the bot stance pass, the emergency defensive operations, and the player-faction stance recommendations. Also stop counting allied brigades (RBiH-HRHB while allied, `isFriendlyFaction`) as enemy. Thresholds and the ratio shape are unchanged, and no new constant is added.

**Change.**
- `bot_corps_ai.ts`: `effectiveOsidEdges` is computed before step 2 and passed to stance and emergency.
- `war_phases.ts` `generate-player-stance-recommendations`: uses `getOperationalData(context)?.edges`.
- `bot_corps_helpers.ts` `computeSectorThreat`: skips allied brigades.
- `alliance_update.ts` `areRbihHrhbAllied`: tolerates a state with no political block; an absent value already meant allied.
- Systems Manual §6 note.

**Measured (188w, main `c4a07a28a`).** The final state is byte-identical to main (`final_save.json`, `final_state_hash` `e44c77f5b41052f8`; scores 709/709/708/682), and so are `control_delta`, `formation_delta`, `activity_summary`, `watched_operations` and `run_summary`. Two report artifacts differ, in one place: week 1's corps summary has HVO Northwest Bosnia `defensive` instead of `offensive` (threat 1.55), and `end_report.md` repeats that line. Weeks 2-188 are identical. The structural fingerprint is unchanged. A temporary debug trace (reverted, not committed) shows why so little moves:
- **Threat:** now live, with 607 corps-turns above 1.5. The premise figure was 640 because that replay counted brigades only and still counted allies. The largest drops are in the RBiH/HRHB corps (HVO Central Bosnia 63 → 45, ARBiH 4th 8 → 1); the small differences elsewhere come from counting every formation.
- **Formula stance:** the threat drives it in only 5 corps-turns. Later layers set every final stance and already reach the same result on main: campaign plan 991, readiness gate 845, faction rule 673, doctrine 359 corps-turns.
- **Emergency defensive operations:** still never fire. 166 corps-turns are defensive at threat ≥ 2.0, but none has the two brigades the gate calls healthy (≥ 70% of the 3,000 cap, cohesion ≥ 50).

The player-facing reads (the stance-matter view's `sector_threat`, the Level-1 stance recommendation) now see the real threat.

**Proof.** New `tests/sim/f1g_corps_threat_osid.test.ts` (11 tests):
- adjacent enemies are counted and far ones are not;
- S-id edges give 0;
- the alliance is excluded while allied and counted at war;
- a missing political block does not throw;
- formula trace threat;
- `generateAllCorpsOrders` wiring with and without `osidEdges`;
- the emergency op fires once on the adjacent enemy OSID with OSID edges, and never with S-id edges, both directly and through the `generateAllCorpsOrders` call site (that test fails if the call site is reverted to `edges`);
- the player recommendation step reads the OSID graph.

`tsc` 0. The structural fingerprint check passes unchanged. `test:baselines` reports the two report artifacts above (`weekly_report.jsonl`, `end_report.md`) for `apr1992_188w`; re-bless pending the orchestrator's decision.

**Registered (new lanes, not followed here):**
1. Emergency defensive operations are dead behind the healthy-brigade gate, which measures strength against the 3,000 cap rather than designed strength.
2. The formula's threat term is dominated by the readiness gate and campaign plan.
3. `attemptCorridorBreach` / `detectCorridorBreachOpportunities` has the same S-id mismatch (`bot_corps_corridor.ts:61-72`; corps-army-commander finding).
4. Mixed-faction corps (code review): `computeSectorThreat` takes the faction from the first subordinate, and `getCorpsSubordinates` does not filter by faction. In a corps with a brigade of the other faction (the deliberate Usora HVO under ARBiH 3rd Corps), that brigade counts for neither side while allied and as enemy once the alliance breaks. Inert today; latent once the threat reaches stance.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/rf-f1g-stance-threat-20261115/`.
