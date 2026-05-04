# Q-CANON-RUPT-4 — §6 Sign-Off Recommendation

- **Date:** 2026-05-04
- **Lane:** LANE-NIGHTSHIFT-Q-CANON-RUPT-4-RESOLUTION (research only — read-only)
- **Roles:** /historian + /game-designer + /canon-compliance-reviewer
- **Status:** RECOMMENDATION ONLY. §6-BLOCKED for any FIX. User signs off (or counters); a future lane implements.
- **Inputs:** R2-6 diagnostic, V2 quantitative deepening, `SENSITIVE_HISTORY_DESIGN_GATE.md`, `rupture_consequences.ts`, `dynamic_section_builder.ts` ghost-entry registry.

## 1. Path (c) — Historical-window heuristic recording

**Canonical meaning.** A turn-window predicate (e.g. `turn ∈ [170, 188]` plus `srebrenica_enclave_formed`) emits the rupture record regardless of whether `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'`. A `provenance: 'historical_window_heuristic'` field would distinguish heuristic from mechanically-emergent records.

**§1.5 reading (Ring 3 #1 — "no commit-genocide decision tree").** Path (c) is *not* a player decision tree, so #1 is not directly violated. But Ring 3 #4 ("no body-count optimization surface") and the §0 core position (*"Atrocity is a consequence, not a lever"*) are stressed: the rupture stops being a *consequence* of the modeled war and becomes a **scripted output** of the historical calendar. The condemnation flag — locked, irreversible, grade-capping per `VICTORY_AND_PYRRHIC_SCORING.md` §3.2 — would be inflicted on RS even in a run where ARBiH 2nd Corps relieved the pocket. That is the railroad shape §1 was written to refuse: a sensitive-history outcome that the simulation did not produce but that is asserted anyway.

**§3 reading.** §3 governs *historical record honesty in essays and codex*, not the rupture mechanic. The Mission E `enclave_defended` ghost entry (`dynamic_section_builder.ts:215-217`, gated on `enclave_held_through_turn`) is the §3-compliant register: a historical-voice annotation. Path (c) is not §3 — it is a Ring 1 mechanical write driven by calendar, not war state.

**ICTY/ICJ.** Krstić (IT-98-33-T), Karadžić (IT-95-5/18-T), Mladić (IT-09-92-T), and ICJ Bosnia v. Serbia (2007) are findings about the **historical** July 1995. Honoring those findings means preserving them in the historical record (essays — already done). It does **not** require the simulation to assert that *this run's* RS committed the genocide when this run's enclave was defended. Conflating the two is precisely the *alternate-history minimization* §1.5 #6 forbids in reverse — using the historical record to overwrite the simulated counterfactual.

**Risk surface — scope creep.** If Path (c) is adopted for Srebrenica, the same logic argues for Markale, Tuzla Gate, Ahmići, Stupni Do, Kravica, Bijeljina. All are events the historical calendar produces. §2's four-criteria test then becomes load-bearing only for *which* atrocities get heuristic recording — and once any precedent is set, every late-war atrocity audit will pressure-test the line. Žepa is a same-run example: V2 §3 shows Žepa fails class (c), Srebrenica fails class (d) — Path (c) for Srebrenica does not cover Žepa, and applying it to Žepa would be the first scope-creep step.

**Player experience.** A player who successfully defends the enclave through hard military choices receives the genocide condemnation flag anyway. The Cost Ledger says (per §4) "the war produced X" — but in *this* war it didn't. The player's agency on the most morally weighted decision in the campaign is invalidated. That is on-rails by definition.

## 2. Path (d) — Explicit acceptance of canonical silence

**Canonical meaning.** The rupture evaluator stays unchanged: c1 ∧ c2 ∧ c3. Ahistorical campaigns where the enclave is defended carry no rupture record. Essays and codex carry the historical record (Ring 2). The `enclave_defended` ghost entry observes the divergence in third-person historical voice.

**§1.5 reading.** Clean. The rupture remains a consequence of *modeled* war state. No new lever, no scripted output, no body-count optimization surface. §3 already permits dynamic ghost sections that record divergence neutrally (`SENSITIVE_HISTORY_DESIGN_GATE.md` §5).

**§3 reading.** The historical record is preserved in essays (`data/scenarios/essays/srebrenica_falls_1995.json` plus the Srebrenica arc), available from scenario start, with full ICTY citations. The historical findings *remain canonical*; the player's run is a counterfactual that does not overwrite them. This is the Ring 2/Ring 1 separation the gate was written to maintain.

**§4 reading — the only hard concern.** Path (d) risks "feel-good ahistorical defense." Mitigation already exists: V2 evidence shows defending the enclave requires either (a) corps-AI fixes that increase RS pressure or (b) combat-math changes that keep the predictor honest. *Either of those is the price of the counterfactual* — the player is not handed an easy save. The Cost Ledger and ghost entry must avoid §4-forbidden "less deadly than history" framing. The existing `enclave_defended` text register handles this; reviewer enforcement of §4 covers the rest.

**Cost Ledger.** Faction-with-rupture (historical path): full prosecutorial register, ICTY citations, condemnation flag locked. Faction-without-rupture (counterfactual path): the rupture line is absent; the war's other costs (displacement, casualties, war_crimes_events from non-rupture atrocities) still render in §4 voice. The verdict packet remains honest in both shapes.

**Codex.** Path (d) formalizes the Mission E register. The ghost entry is the canon-clean way of saying "in this campaign the safe areas remained intact" without minimizing the historical record.

## 3. Cross-cutting

- **Replayability.** Path (d) preserves "what if I had defended Srebrenica" as a meaningful counterfactual. Path (c) renders the question moot — the flag fires either way.
- **Educational purpose.** AWWV's negative-sum thesis is "agency is constrained, not absent." Path (d) makes that legible: the structural difficulty of holding the enclave is what the player encounters. Path (c) substitutes calendar-driven determinism, which teaches "history is fixed regardless of effort" — a different and weaker thesis.
- **Operational asymmetry.** V2 §3 confirms Žepa fails class (c) where Srebrenica fails class (d). A heuristic recorder per Path (c) would either (i) fire only for Srebrenica (asymmetric and arbitrary) or (ii) fire for both (Žepa is not in the rupture roster per §2 — adding it requires the full add-a-rupture pipeline). Path (d) is uniform: both enclaves defended → neither rupture record → both receive the ghost-entry register.
- **Scope creep.** Path (c) sets a precedent every late-war atrocity will test. Path (d) holds the §2 four-criteria line.

## 4. Recommendation: Path (d)

**Binding rationale:**

1. **§0 core position** — atrocity is a consequence, not a lever. Path (c) makes the rupture a scripted output of the calendar; (d) keeps it a consequence of modeled war.
2. **§1.5 #4 + #6** — Path (c) creates a non-optimizable but still calendar-asserted outcome that overrides simulated counterfactual. (d) does not.
3. **§2 rupture criterion 3** — *"the rupture fires on a discrete deterministic game-state condition (control of a specific OSID...), not a cumulative threshold."* A historical-window heuristic violates the letter of criterion 3.
4. **ICTY/ICJ findings preservation** is satisfied by Ring 2 (essays + codex), not by forcing Ring 1 outputs in counterfactual runs.
5. **Player-experience integrity** — agency on the war's most morally weighted decision must be preserved.
6. **Risk surface** — Path (d) is the bounded answer; Path (c) opens an indefinite scope.

The V2-quantified gap between corps-AI commit and predictor envelope is a **calibration problem** for the modeled war, not a justification for bypassing the modeled war. The right next lanes are the (a) corps-AI commit floor and (b) capital-OSID combat-math review — both of which the §6 gate also blocks until the user signs off this recommendation.

## 5. Implementation sketch — LANE-NIGHTSHIFT-Q-CANON-RUPT-4-RESOLUTION

**Engine:** none. `rupture_consequences.ts` already implements (d) — c1 ∧ c2 ∧ c3, no provenance flag needed.

**Canon doc changes** (the binding artifact of this lane):
- `SENSITIVE_HISTORY_DESIGN_GATE.md` §2 — add explicit clause: *"Ruptures fire only on emergent c2. No historical-window heuristic recording. Counterfactual silence is canonically correct and is the §3 ghost-entry register's responsibility, not the rupture evaluator's."*
- §1.5 — add Ring 3 entry #11: *"No calendar-driven atrocity recording. Atrocity records require the modeled war to produce them; the historical calendar alone is not a trigger."*
- §5 — cross-reference the `enclave_defended` ghost entry as the canonical counterfactual register.

**Tests:** extend `tests/rupture_consequences.test.ts` (or successor) with: (i) defended-enclave run produces 0 rupture records and 0 `genocide_condemnation` flags on RS; (ii) historical-fall fixture produces 1 record; (iii) idempotency unchanged.

**Smoke gate:** `tsc --noEmit` + `vitest run` + 188w scenario AAR confirming `rupture_consequences === []` in defended-enclave runs and Cost Ledger renders without rupture line in §4-compliant voice.

**Follow-on lanes (separately §6-gated):** Q-CANON-RUPT-1 (corps-AI commit floor) and Q-CANON-RUPT-2 (capital-OSID combat-math review). Q-CANON-RUPT-3 (Žepa parity) is foreclosed by Path (d): Žepa remains Ring 2 narrative.

**Boundaries respected:** no FORAWWV edit; no engine code in this lane; no run artifacts mutated; no rupture-condition relaxation. User signs off (or counters); future lanes implement.
