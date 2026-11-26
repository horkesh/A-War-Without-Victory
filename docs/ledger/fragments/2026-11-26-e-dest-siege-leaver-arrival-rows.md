## 2026-11-26 — E-dest: a routed siege leaver books its arrival row

Authority: the orchestrator's 2026-11-26 freeze-inventory ruling (E-dest MUST-FIX, pre-freeze, hash-moving) and the 8-seat §6 panel (historian, scenario-tester, engine/systems, red-team, game designer, narrative designer, canon compliance, operations; no war-or-game seat), unanimous GO in round 1. Record: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6, row "E-dest".

**Change.**
- The siege/encirclement trickle in `updateDisplacement` (`src/state/displacement.ts`) wrote departure rows only: `dest_mun` = the origin, `settled` 0. So `displacement_origin_dest_arrivals` (reconstitution Path B, pocket membership), `refugees_received` and the per-OSID arrived tally never saw a siege leaver arrive.
- Each routed leg now also books the documented arrival row (DISPLACEMENT_MASTER §6.4) the takeover writer already uses: origin the municipality, `dest_mun` the route's municipality, `dest_osid` the representative friendly OSID, `settled` the routed count, displaced, killed and fled abroad 0, no causer. The departure rows, routing, capacity, trapped records and carries are unchanged. No new state field.
- The pocket fall and the negotiated-evacuation convoy still write no event row, by their 8-seat rulings (D1-D7, D9).
- The `displacement_event_log.jsonl` stream gains these arrival rows.
- Canon: DISPLACEMENT_MASTER §2.3, §3.3, §6.4; Systems Manual siege note; SHDG §6 record. FORAWWV unchanged.
- Test: `tests/state/siege_destination_a5.test.ts` ("E-dest"), red on main, green with the fix.

**Measured.** Hash-moving. The PR body lists the 188w pair, the merge bar, the Path B reconstitution diff and the live RBiH a2 hist and emer cells.
