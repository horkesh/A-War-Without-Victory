## 2026-11-16 — RB9: no timer counts the same people twice; a bounded wartime return (§6 panel, three rounds, measured)

Batch A, §6 displacement (A3). Calibration is held: scores are recorded and guards are the bar. The orchestrator accepted the control move as modelled history (ruling (2)); the lost cells are on the calibration list.

**Defect (RB9, from RF-5B #623).** A recapture, peace, a lost policy OSID or an exhausted community deleted the takeover timer. The next capture then drew on the 1991 census minority again, so people already expelled were expelled a second time. #623 had fixed this only for policy timers.

**Change.**
- **Dormant records.** A timer with a count of expelled people (`cumulative_displaced` > 0, fired or inherited) becomes a dormant record (`dormant_since_turn`) that never fires. Every seeding path replaces it and inherits its counts (`cumulative_displaced`, `cumulative_routed`, `cumulative_pool_cut`). Red-team C1: a re-seeded timer retaken inside its 4-turn delay keeps the inherited count.
- **Bounded return rule** (orchestrator ruling (a); historian's rule).
  - Trigger: a dormant record's OSID is held 12 unbroken weeks by the group's own side, or by a side never yet at war with the group. The expeller is never a safe holder.
  - The routed survivors come home. The same number leave that group's refugee population: the origin camp first, then hosts in the cohort's routing order (engine E1).
  - Origin `displaced_out` falls by the same number (E2).
  - The returnees' share of the home militia-pool cut is restored (E3).
  - The return is logged as a displacement event (`returned`), and the per-OSID departed tally falls to match (red-team R2).
  - The killed and the fled abroad never return. `refugees_created` is untouched. A shorter hold returns nobody.
- War-room readers skip dormant timers; the validator accepts the new optional fields. The `displaced_out` comment and the sim_smoke invariant are updated (only `lost_population` is monotonic). DISPLACEMENT_MASTER §timers is updated.

**Measured** (188w, final run on main fdaa8629b against a main run at the same commit `03159b9ee1e5877f`; branch `11af5fd2f0cdd97e`):
- RB9 alone was control-identical, refugees_created −1.19%. With the return rule, about 80k return by w188 (Serbs ~58k, Bosniaks ~20k, Croats ~5k).
- Historical checkpoints 709/707/706/674 against main 709/709/708/681 (the same as the v2 diagnostic). Guards hold; strict health PASS.
- Lost: Pobuđe, Teslić Vitkovci, Jajce Barevo, Drvar ×2, Kalinovik Sela, Mostar Vranjevići, Nevesinje ×2. Gained: Donji Vakuf ×2.
- Per community: the real 1993 HVO waves are partly restored (Tasovčići 2,110 against RB1 3,163 and RB9-alone 672; Stolac Pješivac-Kula 793 against 1,185 and 244). The Vareš and Žepče double counts stay removed.
- Hands-off emergent: the Farz breach (0/4) is identical on main and the branch, so it predates this change (package P2).

**Recorded limits and register.**
- About 20k of the returns undo phantom t5 expulsions (Bijeljina and others), and Domaljevac sits on a control error (RB9-R1).
- Pobuđe is a §6-sensitive cost: it ends RBiH-held next to the July 1995 column's ground (RB9-R22).
- Five lost cells are ahistorical (RB9-R13).
- The pool restore is not netted against the pool-size floor (RB9-R24).
- UI copy items for returns (RB9-R17/R18).

**Gate.** §6 panel, three rounds: historian, scenario-creator-runner-tester, engine/systems and red-team; implementer excluded. Round 3: **unanimous APPROVE**, with non-blocking conditions recorded in the register. Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/cl-rb9-20261116/`.
