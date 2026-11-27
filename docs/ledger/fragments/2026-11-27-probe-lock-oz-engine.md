## 2026-11-27 — PROBE-LOCK + OZ-ENGINE: a fallback probe does not hold its corps at the active exhaustion rate; idle men go to depleted brigades

Authority: orchestrator rulings §35 (Fable consult 11, PROBE-LOCK must-fix), §38 (OZ-DATA failed) and §43 (Fable consult 12, OZ-ENGINE, one change with the fix). Seats: formation-expert GO (wording amend applied), corps-army-commander GO, scenario-creator-runner-tester GO (flags below), historian AMEND (a label, applied below). Canon panel: canon-compliance-reviewer GO and systems-programmer AMEND (wording applied), polled separately. Hash-moving.

**Change.**
- PROBE-LOCK (consult 11 option (b2)), `advanceSectorOffensives`: a corps' exhaustion decays at the active rate only if at least one active operation is not a one-brigade fallback probe (`probe` without `preparation_probe_link`). Receipt: `decay_idle` with `probe_only`. No launch is blocked, delayed or removed.
- OZ-ENGINE, `reinforceFromStrategicReserves` and `placeIdleReplacements`: the men war weariness takes from an idle pool are offered to eligible brigades under 40% of cap, weakest first inside the reserve tier, at the reserve draw rate. It is closed under the faction's own exhaustion penalty (`isUnderManpowerExhaustionPenalty`, exported from cohesion_drift.ts). It is booked as donor `committed`; pool stock is untouched. There is no new GameState field or number. `PoolDecayReport.by_pool` is report only.
- Hash-neutral: the dead probe-target comparators are retired (emit.ts), and the probe-cooldown comment is corrected.
- Canon: Systems Manual "A fallback probe is not operating for exhaustion recovery", the probe-exhaustion accept-as-final bullet amended, "Idle replacement"; context.md; open_gates freeze conditions 1/3/7. FORAWWV unchanged.
- Tests (written first): `tests/strategic_reserve_idle_stock.test.ts` (the nine appendix-A cases plus an RBiH gate case), `tests/sector_offensive_idle_recovery.test.ts` (five PROBE-LOCK cases).

**Measured.**
- The cheapest check reproduces Fable's pair 2 exactly: hist `42564dc02e4e6d27`, emer `bd7d5140996e1083`.
- On main 4f532c3ee: hist `bf100171df49665d`, emer `24ccf26b6662bd32` (main b575f03c31c96567 / 664571fb3dce35e2). The brigade log and control are byte-identical to the cheapest check, and to the dae338dfb pair (hist `58eab51817048d88`); only operation end reasons move with main. Baselines are re-pinned.
- Checkpoints: hist 691/693/684/656, emer 691/694/686/657 (main 692/690/687/657).
- §26 G1-G3 PASS and tripwire clear in both modes. Strict health, consistency and Washington t98 PASS. Battles 470/474. Enclaves intact.
- January 1993: 691; against main, only Breza Podgora differs.
- The seven Ozren-line brigades have 0 weeks under 400 men in weeks 100-178. RS brigades under 400 at weeks 100/140/178: at most 1.
- Receipts (this build's `[reinforcement_allocation] idle_replacement` lines, 564 a run): RS places 0 before its route opens (week 40); RBiH places 0. Men placed: RS 29,554 / 31,739, HRHB 6,386 / 6,385. The about-800-men level is MODELLED (the 40% reconstitution line), not sourced: the historian seat finds "thin but holding" defensible (BB2 pp.506-509), but no source gives a headcount.
- Part 6 (SHAPE, not gating):
  - Brijesnica donja falls t110 (Operacija Kalem, 2nd Corps), both modes, at the tripwire limit of one early fall;
  - Spreča has no credited capture;
  - the emergent anchor is 30/31 (Petrovo);
  - historical only: `bugojno:kula_2` to RS t181 and Donji Vakuf town back to RS t183, captures main does not have;
  - at apr1994/apr1995 some Goražde, Konjic, Kreševo and Donji Vakuf cells differ from main, both modes (scenario seat: worth one historian read).
- Calibration on hold: recorded, not tuned.
