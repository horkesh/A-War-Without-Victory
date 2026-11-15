## 2026-11-15 — RF-L3d: the commander no longer adopts queued pre-planned operations (PR #647, measured)

RF fidelity-pass change. Calibration is held, so the scores are recorded and are not a merge bar. This closes the "Not fixed" item of `2026-11-15-l3c-empty-target-plan-release.md`.

**Defect.** `tryCreateFromPrePlanned` read `corps_command.queued_operations` entries, which are operation names (`string[]`), as operation definitions. Every commander adoption of a queued authored operation was therefore a nameless plan with no targets (`…_pre_planned_op`). Pre-planned adoption was priority 1 in `managePlan`, so a corps with any queued operation took that plan instead of an opportunity plan.

The dead plan:
- concentrated, then emitted no operation;
- steered interior brigades to the corps' first sector;
- suppressed the directive's offensive targets;
- wrote a false 'partial' history entry each cycle.

The corps' only activity while it waited was a one-brigade probe every two weeks.

**Ruling.** operations-expert and corps-army-commander, consulted before code, both chose (b): stop adopting.
- Option (a), resolving the name to its definition, would have made the commander a second launcher of authored operations. It would have double-booked their rosters through the commander's own brigade pool. It would have cannibalised their objectives through `omitObjectivesClaimedByActiveOperations`. It would have skipped the `available_from`/`enqueue_from` timing and the player's `HISTORICAL_OP:*` authorization (Engine Invariants §14.10b).
- Both options keep "brigades attack only through CorpsOperation". Only (b) keeps a single launcher.

**Change.**
- `commander/plan.ts`:
  - `tryCreateFromPrePlanned` is removed, with the helpers only it used.
  - `stage_operation` is never generated. The type member stays for saved traces.
- `plan.ts` and `emit.ts`: brigades held by the due queue head (`getHeadQueuedPrePlannedBrigadeIds`, the probe paths' existing rule) never join a commander plan or its operation, bilateral reserved brigades included.
- `pre_planned_operations.ts`: the helper tolerates a state without a `military` block.
- Systems Manual: a new note, "Pre-planned operations have one launcher", and the head-queue reservation note is corrected. Its due test is `enqueue_from ?? available_from`, and its plan-path coverage was false on main.
- REAL_WAR_MASTER #50 and a CALIBRATION_MASTER entry.

**Tests.**
- New:
  - a queued name is never adopted, and no `stage_operation` intent appears;
  - queue-head brigades are excluded from plan selection and from emitted participants, each with a control showing the brigade is used when nothing is queued.
- Retargeted: phase 3-6 commander scoring tests (lessons, personality, player trust, supply penalty, hard blocks) move from `stage_operation` to `launch_opportunity`, where the term is shared.
- Removed:
  - the two `patron_alignment:stage_operation` tests (that branch is now unreachable);
  - three adoption tests that exercised a path production never reached;
  - one duplicate.

**Measured 188w** (one run each; main `b51ab3e58` `0e61d03672be3762`, head `e44c77f5b41052f8`):

| | main | head | delta |
|---|---|---|---|
| jan1993 | 712 | 709 | −3 (exactly at tolerance) |
| apr1994 | 705 | 709 | +4 |
| apr1995 | 706 | 708 | +2 |
| oct1995 | 676 | 682 | +6 |

- **Guards.**
  - Enclave 9/9; eastern provenance clean; Farz P1/P-A/P-B pass.
  - HRHB western cascade 31 vs 29.
  - Strict health PASS; consistency 0 = main; K:W 3.697 vs 3.726.
  - Anchor suite passes.
  - Baselines re-blessed; the compare run is clean.
- **Battles 499 → 479 (−4.0%).** Every lost battle is a probe (240 → 220). Planned-operation battles are 259 on both runs. The lost probes are the frozen corps' raids (VRS 1st Krajina 60 → 48, SRK 33 → 27, 2nd Krajina 10 → 7, ARBiH 3rd Corps −7). Killed +3.4%. This is not a structural cut in battles per week, and the owner's battle-frequency rule is not breached (Pyrrhic integrator).
- **Stranded 0 → 4.** Four 1st Krajina brigades at Kutanja, Babin Potok and Pribrača, t183-184, cut off just as the October ceasefire stopped battles at t184. This is a one-run artifact; investigate if stranding appears before t180.

**Cells** (full table: `cell_delta_vs_main.md` in the evidence folder).
- **Bought by the defect on main** (the standing question: yes):
  - Hotonj: SRK frozen until Kijevo, t24.
  - Jemanlići: 3rd Corps frozen until t60.

  On the head the woken corps take them (SRK "Spona" t19, 3rd Corps "Čelik" t29). Those captures are ahistorical and registered as opportunity targeting, never to be fixed by restoring the freeze.
- **Not regressions:**
  - Paklarevo at apr1995: main's t112 match came from the suspect "Vidik".
  - Gornje Krčevine at apr1995: "Vlasic Ridge" lands about 10 weeks late and matches at oct1995.
  - Babin Potok, Korenići and Kutanja at oct1995: "Donji Vakuf 95" took its first 4 objectives, but its execution began at t182 (main t180) and the ceasefire cut it off. The planning slip is registered.
- **Gain tied to the mechanism:** Mistral 2 (Lupnica, Barevo, Prekaja, Drvar, t183-186).
- **Gains that are unproven divergence, not evidence:** Vesela, Prusac, Lug/Paroš, Lopare selo, Donja Trnova.

**Pyrrhic gate.** Canon, determinism, historian and war-or-game seats plus a named integrator: GO WITH CONDITIONS. All in-PR conditions are met in this change. CI must confirm that the determinism tests ran.

**Registered follow-ups:**
1. Ahistorical opportunity-target selection: "Spona" at Hotonj, "Čelik" at Jemanlići.
2. Why "Donji Vakuf 95" planning holds two turns longer.
3. Repeated low-odds planned attacks: below a 0.6 ratio 11 → 21 and catastrophic outcomes 8 → 18 (3rd Corps at Komar, 5th Corps at Ripac).
4. Assemblies that sit 20 weeks on `defender_power_too_high` (1st Krajina "Zavoj"; "Klin" on main). Candidate: cancel after N weeks.
5. The stranded artifact above.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/rf-l3d-preplanned-20261115/`.
