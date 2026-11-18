## 2026-11-18 — §6 E3b: one authored war-crimes count for every reader of a side's conduct; the verdict counts incidents in two lines

**Why.** Readers that judge a side's own conduct counted war crimes three different ways, and the verdict counted deltas.
- RBiH A+ read `war_crimes_events_emergent` (authorized acts only).
- RS A+ read the shared `war_crimes_events` (≤2), which also sums scripted historical deltas (Sarajevo siege +3, Srebrenica +5, …), so A+ was out of reach whatever RS did.
- HRHB A+ had no war-crimes condition at all.
- The atrocity cost term and both Codex clean-hands ghosts (`cleansing_refused`, `rear_pocket_sustained`) read the shared counter, so a scripted Ahmići record denied HRHB clean hands.
- The cost-ledger war-crimes card printed the shared counter ("N war-crime events"): a sum of deltas, not incidents.

**Ruling.** §6 E3, unanimous 6/6 (historian, canon-compliance, game designer, engine/systems, scenario-tester, red-team), three rounds; E3b ("authored counter, A+ anchors, verdict", P2). Lane-lead decisions 2026-11-18: `ahmici_massacre_1993` is `authored_by_choice: false` (SHDG §6 "Ahmići windows and H6": a withheld Ahmići card is never restraint or a better outcome); the camps row's own −10 standing sits on a closed, shrink-only allowlist until E3c strips it. Record: SHDG §6 "Record (§6 E3 …)" (written by the lane lead after measuring).

**Change.**
- One shared function, `authoredWarCrimeIncidents(state, faction)` (`src/sim/events/authored_war_crimes.ts`): `war_crimes_events_emergent` + every firing of a card marked `authored_by_choice: true` + every chosen response option with a `war_crimes_delta`. Incidents, never deltas. E3c reads it next.
- Readers: the atrocity cost term (legacy cost path), all three A+ anchors (each now requires authored == 0), and the two Codex clean-hands ghosts. The §2a condemnation signal keeps its own canon definition.
- Data: `csq_accelerated_camps_discovery_1992` true; `un_hostage_crisis_1995` false; `ahmici_massacre_1993` false.
- Loader: `validateWarCrimeAuthorship`, the fourteenth pass. A choice-dependent war-crimes row (its trigger or a prerequisite's reads a flag a response option writes, or a `paramilitary_*` condition) must declare `authored_by_choice`. Also rejected: a stray classification, and a negative international_standing shift on an authored row or option. The derived rule flags exactly the three rows above.
- Verdict: two lines per side, in fixed side order, both counting incidents: "Recorded in the historical record of this campaign" (what fired, by card title; the Srebrenica genocide stated with Krstić IT-98-33-A and ICJ 2007) and "Authorized in play". Grave = an authored incident or a §3.4 condemnation flag, and both lines then carry it. The figure rows show the same two counts; the delta row is gone. `FactionVerdict.war_crime_incidents` is derived at the verdict, so there is no new counter and no schema bump. All copy is EN and BCS, DRAFT for the §4 panel. Ledgers frozen before E3b keep their old card.
- Comments: the stale "default OFF" scoring comments are fixed (the simple grade model is the default).
- Canon: VICTORY §3.2 (anchors) and §3.4 ("authored", verdict lines); SHDG §1 Ring 1 "War crimes counter"; a pointer on the SHDG Ending truth pass record; EVENT_SYSTEM_AUTHORING_GUIDE §4.
- Tests: `tests/s6_e3b_authored_counter.test.ts`, `tests/s6_e3b_loader_rule.test.ts`, `tests/s6_e3b_verdict_lines.test.ts`; existing tests updated to the new truth.

**Measured.** TODO (lane lead): authored counts per side (historical and emergent); both verdict lines in both modes; A+ outcomes before and after; sim hash unchanged apart from the frozen endgame snapshot.
