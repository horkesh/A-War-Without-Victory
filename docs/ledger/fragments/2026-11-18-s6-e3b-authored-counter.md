## 2026-11-18 — §6 E3b: one authored war-crimes count for every reader of a side's conduct; the verdict counts incidents in two lines

**Why.** Readers that judge a side's own conduct counted war crimes three different ways, and the verdict counted deltas.
- RBiH A+ read `war_crimes_events_emergent` (authorized acts only).
- RS A+ read the shared `war_crimes_events` (≤2), which also sums scripted historical deltas (Sarajevo siege +3, Srebrenica +5, …), so A+ was out of reach whatever RS did.
- HRHB A+ had no war-crimes condition at all.
- The atrocity cost term and both Codex clean-hands ghosts (`cleansing_refused`, `rear_pocket_sustained`) read the shared counter, so a scripted Ahmići record denied HRHB clean hands.
- The cost-ledger war-crimes card printed the shared counter ("N war-crime events"): a sum of deltas, not incidents.

**Ruling.** §6 E3, unanimous 6/6 (historian, canon-compliance, game designer, engine/systems, scenario-tester, red-team), three rounds; E3b ("authored counter, A+ anchors, verdict", P2). Lane-lead decisions 2026-11-18: `ahmici_massacre_1993` is `authored_by_choice: false` (SHDG §6 "Ahmići windows and H6": a withheld Ahmići card is never restraint or a better outcome); the camps row's own −10 standing sits on a closed, shrink-only allowlist until E3c strips it. The historian seat of the §4 copy panel confirmed all three classifications.

**Change.**
- One shared function, `authoredWarCrimeIncidents(state, faction)` (`src/sim/events/authored_war_crimes.ts`): `war_crimes_events_emergent` + every firing of a card marked `authored_by_choice: true` + every chosen response option with a `war_crimes_delta`. Incidents, never deltas. E3c reads it next.
- Readers: the atrocity cost term (legacy cost path), all three A+ anchors (each now requires authored == 0), and the two Codex clean-hands ghosts. The §2a condemnation signal keeps its own canon definition.
- Data: `csq_accelerated_camps_discovery_1992` true; `un_hostage_crisis_1995` false; `ahmici_massacre_1993` false.
- Loader: `validateWarCrimeAuthorship`, the fourteenth pass. A choice-dependent war-crimes row (its trigger or a prerequisite's reads a flag a response option writes, or a `paramilitary_*` condition) must declare `authored_by_choice`. Also rejected: a stray classification, and a negative international_standing shift on an authored row or option. The derived rule flags exactly the three rows above.
- Verdict: two lines per side, in fixed side order, both counting incidents: "Historical war-crimes record of this campaign" (what fired, by its signed incident label, `warCost.incident.<event_id>`, the card title only as a fallback; the Srebrenica genocide stated with the Krstić Appeal Judgement IT-98-33-A (19 April 2004) and the ICJ Genocide Convention Judgment (26 February 2007)) and "War crimes arising from decisions in play". No false zero: the record line shows only with a recorded incident or the genocide record (then the genocide sentence alone), the decisions-in-play line above zero or beside a shown record line, and a side with neither has no line; the figure rows follow the same rule. Grave = an authored incident or a §3.4 condemnation flag, and every shown line then carries it. The delta row is gone. `FactionVerdict.war_crime_incidents` is derived at the verdict, so there is no new counter and no schema bump. All copy is EN and BCS, signed by the SHDG §4 panel (narrative designer + historian, two rounds, unanimous), 2026-11-18, including the three A+ grade descriptions. Ledgers frozen before E3b keep their old card. The curated diacritics list (`bosnianPlaceNames.ts`) no longer rewrites "Uzdol" as "Uždol": the judgment spelling is Uzdol (historian, same panel), and the signed label "Grabovica and Uzdol massacres" tripped the C13 guard. The "Uždol" spellings in card data, essays and canon stay registered for the card batch.
- Comments: the stale "default OFF" scoring comments are fixed (the simple grade model is the default).
- Canon: VICTORY §3.2 (anchors) and §3.4 ("authored", verdict lines); SHDG §1 Ring 1 "War crimes counter"; a pointer on the SHDG Ending truth pass record; EVENT_SYSTEM_AUTHORING_GUIDE §4.
- Tests: `tests/s6_e3b_authored_counter.test.ts`, `tests/s6_e3b_loader_rule.test.ts`, `tests/s6_e3b_verdict_lines.test.ts`; existing tests updated to the new truth.

- Codex essays that join on `FINDING:war_crimes_record_<side>` also answer to the decisions-in-play line (`codexEssayResolver.ts`), so hiding the record line at zero unlocks nothing less.
- Record: SHDG §6 "Record (§6 E3b, one authored war-crimes count; the verdict counts incidents in two lines)".

**Measured** (lane lead, 188w, official runner, on main `98c036da7`, head `2f3d36446`; the later commits change copy, labels and a Codex join only, and CI's baseline pins re-check them).
- Historical `7c88ab2a9ba3b43f`, emergent `141afc45b5695df4`: equal to main. Every artifact except `run_meta.json` is byte-identical in both modes, and the baselines manifest is unchanged (8/8). No re-pin.
- Authored incidents in both modes: RBiH 5, RS 28, HRHB 1. All are emergent sweeps; no authored card or option fired, so those paths are covered by unit tests only.
- Recorded incidents: RBiH 2, RS 10, HRHB 6.
- Every line is grave, and RS's record line carries the genocide sentence.
- No side reaches A+, before or after. Territory misses each threshold first (RBiH 29.15 against > 33, RS 51.96 against > 55, HRHB 17.94 against > 20), and every authored count is non-zero.
- **Register** (to the steward and the card batch):
  - The §2a condemnation signal still reads only `war_crimes_events_emergent`.
  - The shared delta counter is still read by `patron_pressure.ts`, the `war_crimes_above` trigger, the standing base (E3c) and the AI-commander prompt.
  - Two camp systems are each recorded twice.
  - 17 of the 19 war-crimes cards have no BCS card title.
  - `un_hostage_crisis_1995` cites Mladić Count 6 (it should be Count 11).
