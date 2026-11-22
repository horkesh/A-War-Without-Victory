## 2026-11-22 — D3 relief in place: a loaned occupant is never relieved; canon names the donor and the occupant rules

**Why.** Codex review r4655197592 on #826 found that the departing occupant in D3 relief in place skipped the donor's loaned / dug-in / pending dig-in guards, contrary to the canon line "loaned and dug-in brigades never move for relief". A fix applying all three guards to the departing occupant (branch `claude/codex-826-relief-departing-guards` @ e2c1e8ff8, kept as the record, not merged) was hash-moving: battles a week fell 2.62 → 2.50 / 2.63 → 2.46, and the emergent P-B guard broke.

**Ruling.** The orchestrator asked whether the canon line was right. Seats: operations-expert, corps-army-commander and historian.
- A dug-in occupant is relieved, 3-0. Relief in place replaces a unit in its prepared positions (BB2 p.418, the VRS relief of the 1st Guards on Igman, August 1993).
- A loaned occupant holds, 2-1. Its movement belongs to the loan system, and the fallback cell is chosen from the lender's front. The historian would allow a relief only onto the receiving corps' own front (BB1 p.426).
- The donor guards stay as they are, 3-0.
- A pending dig-in order split the seats (operations HOLD; corps and historian RELIEVE). Main's behaviour is kept, and the split is recorded.

**Change.**
- `src/sim/combat/brigade_front_distribution.ts`: `isLoanedOccupant`. R2 is never launched against a loaned occupant (`relieveOutpoweredOccupant`), and a loaned occupant paired on the cell does not leave (`canRelievedBrigadeLeave`).
- `tests/brigade_front_distribution_contact_relief.test.ts`: 2 red-before tests (loaned, on both release paths). Dug-in and pending dig-in occupants are pinned as relieved.
- `docs/10_canon/Systems_Manual_v0_9_0.md`, "Defence of a held line": split into a donor line and an occupant line.

**Measured** (188w, both modes, against main 54760fb79 = 7cb87ce9 / 55644ff8): hashes 7cb87ce9 / 55644ff8. final_save, control_delta, operation_aars and formation_delta are byte-identical. Hash-neutral; no loaned occupant was relieved on main's trajectory.

**Open.** A dug-in occupant sent by column order (more than one hop) is refused by the T3 dig-in lockout (`osid_column_movement.ts` ~621-633) and keeps a dead order. A posture release on departure is a separate change.
