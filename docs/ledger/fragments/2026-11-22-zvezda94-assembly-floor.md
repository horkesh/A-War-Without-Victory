## 2026-11-22 — Operation Zvezda 94: assembly floor 3 → 2, matching its viable floor (data, one line)

**Why.** Zvezda 94 never attacks on main. The c2 pair shows planning t93-105, recovery t106 with `participants_below_assembly_floor`, ended t107, 0 attacks. Pracha River had already taken every Goražde and Višegrad objective, so only the Foča axis was built: 1st Milići and 1st Zvornik at foca:mazlina (1st Birač stayed out, `transit_owned_elsewhere`). `minimum_assembled_participants: 3` is larger than that 2-brigade roster, so `hasMinimumAssembledParticipants` was false on every planning turn. The axis-level gates would have passed.

**Change.**
- `src/sim/combat/pre_planned_operations.ts`, Operation Zvezda 94: `minimum_assembled_participants` 3 → 2, the same as `minimum_viable_participants`. No timing, roster or staging change.
- Comments:
  - The floor of 3 dated from the five-formation Goražde design (d8a980bac). The Foča axis was added later (e0398a166) and the floor was not resized.
  - When Pracha has cleared the northern axes, only the Foča axis is built, with local Drina brigades and no Main Staff formation.
  - The Foča roster is a model allocation, not history: BB2 Annex 49 has the Herzegovina Corps run the southern thrust.
  - The cite "BB2 p.289" becomes BB2 Annex 49, print pp. 459-463.
- `tests/pre_planned_operations.test.ts`:
  - The catalog pin changes 3 → 2. The Lukavac 93 pin is unchanged.
  - A new test covers the main-run shape: Goražde/Višegrad objectives RS-held, Milići and Zvornik at mazlina, Birač in authored transit, izbisno enemy-held. Only the Foča axis is built, and `hasMinimumAssembledParticipants` is true. It fails on the old data.

**Seats** (all ACCEPT WITH CONDITIONS):
- **operations-expert.**
  1. The pin update and the new test land in the same change.
  2. Fix the comment: the Foča-only case has no Main Staff formation.
  3. Record a "bought by a defect" note for the merge gate.
  4. One measured 188w hist+emer pair with only this change. Watch the Drina coupling (Žepa, Teočak, the enclaves, the Rogatica stranding), Foča and the corridor anchors.
- **historian.**
  1. No battle on this axis before about w102. Flag any attack in w93-100.
  2. Goražde holds: gorazde_2, faocici_2 and hrancici do not flip through this operation. It captures nothing beyond donje_zesce.
  3. The operation ends by about w107.
  4. Record the roster as a model allocation and correct the cite. Re-rostering to the Herzegovina Corps is a follow-up and does not block this change.
  5. Record the Prusac-style check.
  6. Register: izbisno is painted RS in all four snapshots but is RBiH in the sim all war.
- **§6/enclave delegate.**
  - C1. The operation AAR shows only donje_zesce (Foča axis) attacked, and no Encirclement-axis objective.
  - C2. Goražde still prints `UNCONTESTED`; the pair is never quoted as "Goražde tested".
  - C3. Record the Prusac-style question in the merge note.
  - The enclave guard (9 cells, holds and falls) and `EASTERN CAPTURE PROVENANCE` must pass in both modes, with exit status 0. None of the 18 Goražde `osid_list` cells may flip to RS at a checkpoint.

**Bought by a defect?** Possibly in part. The pair stands at foca:mazlina, next to the objective, only because the prestage pass marches toward `op:foca:izbisno` (`pre_planned_operations.ts`, prestage column orders). That staging cell is enemy-held all war, and prestage does not check its controller. The columns stop at mazlina, the last friendly cell. Any attack this change enables comes from that position, and the ×3 Main Staff multiplier then lands on local brigades. The defect is REGISTER only and is not fixed here.

**Measured:** pending (one 188w pair).
