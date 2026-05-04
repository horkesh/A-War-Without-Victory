# Q-CANON-RUPT-4 — Path (d) Resolution (Implemented)

- **Date:** 2026-05-04
- **Lane:** LANE-NIGHTSHIFT-Q-CANON-RUPT-4-PATH-D
- **Status:** IMPLEMENTED — canon-doc + regression-test only. No engine code change.
- **Authority:** `docs/40_reports/audits/20260504_Q_CANON_RUPT_4_RECOMMENDATION.md` §4 (Path d) + §5 (implementation sketch). User-signoff-equivalent: this lane is the resolution sketch the recommendation called for.
- **Predecessor diagnostics:** `docs/40_reports/audits/20260503_SREBRENICA_RUPTURE_NON_FIRING_DIAGNOSTIC.md` (R2-6) and `docs/40_reports/audits/20260504_SREBRENICA_DIAGNOSTIC_V2.md` (V2 quantitative deepening).
- **Engine status verified:** `src/sim/negotiation/rupture_consequences.ts` already implements Path (d) — the c1 ∧ c2 ∧ c3 conjunction is unrelaxed (lines 53–62). No engine modification was required or performed.

## 1. What this lane delivered

### 1.1 Canon clauses added — `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`

**§1.5 Ring 3 #11 (NEW):**

> **No calendar-driven atrocity recording.** Rupture events fire only on mechanical c2 satisfaction (the §2 criterion-3 game-state condition). Ahistorical campaigns where the c2 condition is not mechanically satisfied carry **no rupture flag** in the verdict packet — historical findings remain in Ring 2 (essays + codex) regardless. The historical calendar alone is not a trigger; the modeled war must produce the trigger condition. (Resolution of Q-CANON-RUPT-4, recommendation §4 Path (d), 2026-05-04.)

**§2 Rupture Expansion Rule criterion 3 (AMENDED):**

> 3. **Specific trigger condition** — the rupture fires on a discrete, deterministic game-state condition (control of a specific OSID, presence of a flag, turn range), not a cumulative threshold. **This is the BINDING criterion: ruptures fire only on emergent satisfaction of the discrete game-state condition. No calendar-window heuristic substitution is permitted — the historical calendar alone cannot stand in for the OSID/flag/turn predicate.** Counterfactual silence (the rupture not firing because the modeled war produced no fall) is canonically correct and is the responsibility of the §3 ghost-entry register, not the rupture evaluator. (Q-CANON-RUPT-4 resolution, recommendation §5, 2026-05-04.)

**§5 Counterfactual register (NEW subsection):**

> ### Counterfactual register (canonical pattern)
>
> The Mission E `enclave_defended` ghost entry is the §3-compliant counterfactual recorder for sensitive-history divergence. It is the canonical pattern for any future "what the modeled war produced instead of the historical atrocity" annotation:
>
> - **Predicate location:** `src/sim/codex/dynamic_section_builder.ts` — `predEnclaveDefended()` gates emission on the `enclave_held_through_turn` flag (set when ARBiH retains `op:srebrenica:srebrenica_2`, `op:zepa:zepa_2`, `op:gorazde:gorazde_2` at the recorded turn).
> - **Narrative location:** `data/codex/ghost_entries/enclave_defended.md` — historical-voice text register, no celebration, no minimization, no "less deadly than history" framing.
> - **Canonical role:** This is the §3 register for ahistorical paths where the §1.5 #11 / §2 criterion-3 mechanical condition for a rupture is not satisfied. The Ring 2 historical record (essays + ICTY citations) remains canonical and accessible regardless; the ghost entry observes the divergence without overwriting either layer.

### 1.2 Regression test — `tests/rupture_silence_when_defended.test.ts` (NEW, 4 tests)

| # | Assertion | Binds |
|---|---|---|
| 1 | Synthetic state at turn 188, ARBiH retains srebrenica_2 + zepa_2 + gorazde_2, srebrenica_enclave_formed=true → `evaluateRuptureConsequences` produces zero rupture records; `srebrenica_genocide_1995` not in id list. | §1.5 #11; engine c1 ∧ c2 ∧ c3 unrelaxed. |
| 2 | Same state → `collectCondemnationFlags(state, 'RS')` returns `[]`; `computeFactionVerdict(state, 'RS').condemnation_flags` returns `[]`; the genocide flag is absent from the full verdict packet. | §1.5 #11; Cost Ledger / Verdict screen contract. |
| 3 | Canonical historical Ring 2 files exist on disk (`srebrenica_falls_1995.json`, three other Srebrenica-arc essays, `enclave_defended.md` ghost entry) regardless of run path; the synthetic state carries the `enclave_held_through_turn` predicate flag the §5 ghost-entry register reads. | §5 counterfactual register; ICTY/ICJ findings preservation. |
| 4 | Re-evaluating the canonical-silence state three times produces zero ruptures all three times — idempotent under (d) just as under the historical-fall path. | Engine determinism. |

**Verification:** 4/4 new tests green. Existing `tests/rupture_consequences.test.ts` 18/18 still green (historical-fall case at c2 satisfied still records `srebrenica_genocide_1995` correctly). `npx tsc --noEmit` clean.

## 2. What this lane did NOT change

Per the recommendation §5 boundary list, all of the following are untouched:

- `src/sim/negotiation/rupture_consequences.ts` (engine — already (d)-compliant)
- OOB JSON, scenario files, `political_controllers`, paint anchors
- `docs/10_canon/FORAWWV.md`
- Run artifacts under `runs/`
- Any rupture-condition relaxation
- Žepa parity (Q-CANON-RUPT-3 — foreclosed by (d), Žepa stays Ring 2 narrative)

## 3. Follow-up handoffs (separately §6-gated)

These remain open §6-gated lanes. (d) does not address them; (d) is the canon answer for "what should fire when the engine does not produce c2," not "why doesn't the engine produce c2."

| Lane | Question | Class (V2) |
|---|---|---|
| **Q-CANON-RUPT-1** | Force-commit floor for Krivaja-95 / Stupčanica-95 — should the corps AI commit ≥ 5/7 perimeter formations and ≥ 7 000 pers? | (c) bot AI gap |
| **Q-CANON-RUPT-2** | Capital-OSID combat-math envelope — is `force_ratio_estimate ≈ 0.092` against a hardened resilience-25 capital with isolation-173 the intended canon outcome? | (d) combat math gap |
| **Q-CANON-RUPT-3** | Žepa parity — *foreclosed by Path (d).* Žepa remains Ring 2 narrative (essays + codex), no rupture. | n/a (resolved) |

Both Q-CANON-RUPT-1 and Q-CANON-RUPT-2 require user §6 sign-off before any engine work. The recommendation's §4 closing note is binding: *"The V2-quantified gap between corps-AI commit and predictor envelope is a calibration problem for the modeled war, not a justification for bypassing the modeled war."* Path (d) is the canon answer; the corps-AI / combat-math lanes are the next surface, separately gated.

## 4. Files changed

| Path | Change |
|---|---|
| `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` | §1.5 #11 added; §2 criterion 3 amended; §5 counterfactual register subsection added. |
| `tests/rupture_silence_when_defended.test.ts` | NEW — 4 regression tests pinning Path (d). |
| `docs/40_reports/implemented/20260504_Q_CANON_RUPT_4_PATH_D_RESOLUTION.md` | NEW — this report. |

No other files modified. File ownership exclusive per lane spec; no overlap with concurrent lanes (Mission C A1 supply-osid cache, Force-Quality Gap 1 observability).

## 5. Verification log

```
$ npx vitest run tests/rupture_silence_when_defended.test.ts tests/rupture_consequences.test.ts
 ✓ tests/rupture_consequences.test.ts (18 tests) 11ms
 ✓ tests/rupture_silence_when_defended.test.ts (4 tests) 6ms
 Test Files  2 passed (2)
      Tests  22 passed (22)

$ npx tsc --noEmit
(clean — no output)
```

40w / 188w smokes intentionally not run: this is a pure canon-doc + regression-test lane with no behavioral change.
