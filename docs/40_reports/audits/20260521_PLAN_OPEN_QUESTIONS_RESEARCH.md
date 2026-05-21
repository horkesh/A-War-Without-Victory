# Plan Open Questions — Research and Recommended Answers

**Date:** 2026-05-21
**Scope:** Resolve all 10 open questions in `docs/plans/2026-05-21-tier1-painted-target-anchors-plan.md` §9 and `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md` §8.
**Method:** Direct code reads + grep against current main; orchestrator synthesis for design/judgment questions.
**Outcome:** 6 questions decided cleanly; 2 surface real engine gaps that change plan scope; 2 require user opinion (parking-lot listed).

---

## Tier 1 anchor plan — §9 questions

### Q1.1 — File layout: extend `historical_anchors.ts` in-place vs per-epoch files?

**Decision: extend in-place.**

`src/scenario/historical_anchors.ts` is currently 45 lines (1 settlement-anchor array empty, 1 OSID-anchor array of 27 entries). Adding 4 epoch sections at ~50-80 lines each puts the file at ~300 lines total — well under any reasonable file-size cap.

The 2026-05-17 CI feedback-loop wave centralized historical anchor truth in this exact file (`MASTER_ROADMAP.md` "CI feedback-loop implementation addendum 2026-05-17"). Splitting it now reverses that centralization for no measurable gain.

`tests/scenario_anchor_contract.test.ts` (confirmed exists) reads the existing exports. Adding new exports to the same file means one import line per new anchor type — clean. Per-epoch files would need either four imports per test file or a barrel re-export, both of which add ceremony without simplifying.

SCRT's `historical_band_anchors.ts` sibling-file proposal is rejected on the same centralization argument.

### Q1.2 — Apr 1994 area-share bands: SCRT 65-71% vs war-or-game 50-60% vs defer entirely?

**Decision: ship the SCRT 65-71% band as DIAGNOSTIC-ONLY (no CI fail) until Issue #37 lands.**

The two specialists are answering different questions:
- **SCRT** answered "what does history say RS held at Apr 1994?" — 65-71% per Burg & Shoup, BB1 p.222, ICTY Karadžić TJ.
- **War-or-game** answered "what can the current engine deliver?" — 50-60% with Issue #37 unfixed.

Anchors describe **history**, not current sim capability. Wiring war-or-game's "engine-realistic" band as PASS/FAIL would lock the calibration target to a broken engine and make Issue #37 a calibration regression rather than a fix. Wiring SCRT's historical band as PASS/FAIL would gate CI on engine work that hasn't shipped.

The right resolution is the existing Tier 1 plan §5.3 diagnostic-only mechanism: emit the SCRT band + the delta inline in the test run output, do not fail the build. When Issue #37 lands and the painted-compare re-runs against the post-fix tip, promote to PASS/FAIL.

### Q1.3 — Diagnostic-only band reporting: inline in test run vs separate `npm run` invocation?

**Decision: inline in test run.**

Reasoning:
- Single source of truth (one config of bands per epoch).
- Single CI signal (one job, one report).
- No duplicate run cost — the scenario is already executing.
- Diagnostic output sits next to the PASS/FAIL output in the same log, which is what a developer wants when triaging.

The alternative (`npm run sim:painted-compare`) would either re-run the scenarios (cost) or read final-saves the test run also reads (duplication). No win.

### Q1.4 — Painted-map anomalies: repaint vs use alternates?

**Decision: mixed — repaint two, use alternate for one, defer one.**

The four anomalies from historian §0.5:

| OSID | Anomaly | Recommended fix | Reason |
|---|---|---|---|
| `op:gorazde:gorazde_2 = RS` at apr94/apr95/oct95 | Historically RBiH continuously | **REPAINT to RBiH** at all three epochs | Painted-file error. Goražde core never fell. ICTY Karadžić TJ §3823+ unambiguous. |
| `op:rogatica:zepa_2 = RBiH` at oct95 | Historically RS post-25 Jul 1995 | **REPAINT to RS** at oct95 only | Painted file pre-dates Žepa fall. Fix is one cell. ICTY Krstić TJ + Karadžić TJ. |
| `op:velika_kladusa:velika_kladusa_2 = RBiH` at apr95 | APWB period | **NO ACTION** | Resolved by APWB cut plan. Velika Kladuša stays painted RBiH; burden modelled via debuff. |
| `op:kupres:kupres_2 = HRHB` at apr94 (RS at jan93) | Flip path unclear | **DEFER** | Needs BB-extractor follow-up. Could be correct (Kupres area saw HVO-VRS contestation in 1993-94). |

Repainting two cells is preferable to leaving alternate-OSID workarounds in the anchor TypeScript long-term — alternates work but obscure the actual painted-file truth. The Goražde and Žepa fixes are bounded one-cell edits with strong ICTY backing.

For execution: write a small `tools/diagnostics/painted_target_anomaly_fix.cjs` that edits the three flagged cells (`gorazde_2` at apr94/apr95/oct95, `zepa_2` at oct95) and writes a diff report. Add a regression test in `tests/painted_control_targets.test.ts` that asserts these cells have their corrected values.

### Q1.5 — Test run cost: piggyback on existing `:scenario:anchors` runs?

**Decision: piggyback.**

`tests/scenario_anchor_contract.test.ts` already runs the 40w / 188w scenarios in CI (per the 2026-05-17 wave). The new `tests/scenario_historical_painted_anchors.test.ts` reads the same final-save artifacts — no new scenario runs needed. Apr 1994 (104w) needs a 104w scenario run added if not already in CI (need to verify); Apr 1995 (156w) is Q1.6 below.

### Q1.6 — w156 snapshot mechanism: native runner per-week vs one-off scenario file?

**Decision: author a one-off `apr1992_definitive_156w.json` scenario file.**

Investigation:
- `_phase5a_w156_from_188w` is referenced by `painted_156w_apr1995.txt` line 2 as its run dir.
- That run dir does **not exist** in `runs/` or `runs_perf/` at the current main tip.
- Repo-wide grep confirms `_phase5a_w156_from_188w` only appears in committed text reports and ledger entries — no commit message references how it was generated, no script that produces it.
- The runner (per the 2026-05-19 RC bundle and existing `apr1992_definitive_{40w,104w,188w}.json` scenario files) is week-bounded by scenario JSON, not by a per-week snapshot flag.

**Reasonable inference**: the `_phase5a_w156_from_188w` artifact was a one-off ad-hoc extraction — probably a developer ran a custom 156w-scoped scenario locally, generated the comparison text, committed the text but not the run dir or scenario file.

**Recommendation**: author `data/scenarios/apr1992_definitive_156w.json` as a copy of `apr1992_definitive_188w.json` with `weeks: 156`. Verify hash stability of the new run (it should be the first 156 turns of the 188w run, byte-identical). This is ~5 lines of new scenario JSON, plus one CI scenario run added. No engine work, no per-week-snapshot feature needed.

---

## APWB cut plan — §8 questions

### Q2.1 — Schema check: does the consequence-event effect schema support cohesion/readiness/supply/op-block modifiers?

**Finding: substantial schema gap. The APWB cut plan's debuff payload as written is NOT supportable today.**

Current effect kinds in `src/sim/events/apply_effects.ts:17-36` (18 total):

```
aggression_modifier, alliance_change, alliance_lock, bot_priority_shift,
cohesion_change, control_change, cost_ledger_annotation, doctrine_constraint,
equipment_grant, equipment_quality_modifier, guerrilla_threat,
humanitarian_impact, morale_change, narrative, negotiation_capital,
patron_pressure, recruitment_modifier, supply_delta
```

Mapped against the APWB cut plan's proposed payload:

| Proposed | Status | Existing closest |
|---|---|---|
| `cohesion_regen_multiplier` (corps-scoped, multiplier) | MISSING | `cohesion_change` (faction-scoped, additive delta — not the same shape) |
| `readiness_ceiling` (corps-scoped, ceiling value) | MISSING | No readiness effect exists |
| `supply_pressure_step` (corps-scoped) | MISSING | `supply_delta` (faction-scoped delta) |
| `block_offensive_ops_outside_region` | MISSING | `bot_priority_shift` (faction-scoped objective add/remove) — closest existing |
| `clears_modifiers: [event_id]` | MISSING | No mechanism to clear by upstream-event-id |

**Critical structural gap**: every duration-bearing modifier in the current engine is **faction-scoped** (`recruitment_modifier`, `equipment_quality_modifier`, `aggression_modifier`, `bot_priority_shift`, `guerrilla_threat`). There is **no per-corps modifier surface**.

The APWB cut plan's `"target": { "corps": "arbih_5th_corps" }` payload is **not supportable** without schema additions. Per the plan's own §6 stop-gate, this triggers: "STOP if the consequence-event modifier schema doesn't support [these]. Schema work is a prerequisite, not part of this cut."

**Two paths forward** (recommend Path A):

**Path A — Refactor the debuff to use existing faction-scoped kinds, accepting some imprecision.**

The historical truth is "5th Corps is hampered." The engine truth is "all RBiH formations are slightly hampered for 47 turns while APWB is active." Imprecise, but:
- All four other ARBiH corps (1st Sarajevo, 2nd Tuzla, 3rd Zenica, 4th Mostar) were also operating under degraded national conditions during 1993-1994 (HVO war, embargo, fuel crisis).
- Faction-wide aggression/cohesion penalty during w78-w125 is a defensible historical match.

Concrete refactor:

```jsonc
{
    "id": "csq_5th_corps_apwb_burden_1993",
    "effects": [
        { "kind": "aggression_modifier", "faction": "RBiH", "delta": -0.10, "duration_turns": 47 },
        { "kind": "bot_priority_shift", "faction": "RBiH",
          "remove_objectives": ["western_offensive", "central_bosnia_offensive"],
          "duration_turns": 47 },
        { "kind": "recruitment_modifier", "faction": "RBiH", "pool_multiplier": 0.85, "duration_turns": 47 }
    ]
}
```

This uses three existing faction-scoped kinds. Imprecise vs ideal but **shippable today** without engine work.

**Path B — Schema work first.**

Add per-corps modifier surface to the effect system. Estimated scope: new `EventEffect` variants + `MilitaryState` fields + active_modifiers accessor + per-corps readers in `bot_corps_directives.ts` + tests. ~300-500 lines + canon documentation + a baseline re-bless. This is a v0.9.7 schema lane, not part of the APWB cut.

**Recommendation**: Path A. Ship the APWB cut as a faction-wide RBiH debuff during w78-w125. Note in the cut plan that Path B (per-corps surface) is parked for a future schema lane and would tighten the cut's precision.

### Q2.2 — Block-offensive-ops-outside-region: hard-block vs probabilistic?

**Decision: hard-block via `bot_priority_shift.remove_objectives`.**

Historical truth: 5th Corps had **no spare bandwidth** for offensive ops outside the Bihać pocket during the APWB burden window. Not "reduced probability" — there were no spare brigades, no spare ammo, and the southern Cazin flank had to be screened continuously.

Under Path A (faction-scoped), the hard-block becomes `bot_priority_shift.remove_objectives: ["western_offensive", "central_bosnia_offensive"]` — removes the relevant Bihać-external objective IDs from the faction objective set during the debuff window. The 5th Corps still defends but won't be prioritized for ops it historically couldn't run.

Probabilistic is rejected: adds noise to baseline regression, harder to verify, and the historical signal is binary not gradient.

### Q2.3 — Debuff turn windows: w78-w125 right?

**Decision: w78-w125 confirmed.**

Historical anchoring:
- `abdic_apwb_declared_1993` event fires at turn 77 (war_1993.json:2430, per canon-compliance memo §3.1).
- `abdic_karadzic_pact_1993` event fires at turn 80-83 (war_1993.json:2502, requires `abdic_apwb_declared_1993`).
- The 5th Corps reconquest of Velika Kladuša historically completed in **August 1994** = ~w125-w127 in scenario weeks (Apr 1992 + 124 weeks ≈ Aug 1994).

Debuff window w78-w125 = 47 turns ≈ 11 months ≈ Oct 1993 to Aug 1994. This matches the historical APWB burden period almost exactly.

The debuff start at w78 gives one turn of grace after the declaration to allow the consequence event to register. The defeat at w125 matches the historical timing.

The `csq_abdic_defeated_1994` consequence-event fires w123-w130 to give a small window for the natural duration to coincide with the abdic-defeated event firing. The `duration_turns: 47` on the burden modifier handles automatic expiry if the defeat event somehow doesn't fire.

### Q2.4 — `apwb_defeated` flag durability: persistent vs unsettable?

**Decision: persistent within the v1.0 scope.**

The historical Aug 1995 APWB return (post-Storm, ~w172-w176) was below the resolution of the cut model — APWB returned briefly under HV ground cover and was immediately reduced again. Modelling that brief return requires:
- HV Storm spillover mechanic (doesn't exist)
- Brief enemy formation re-spawn (not in the cut)
- Final defeat at w176 (also not in the cut)

None of these are in scope. The `apwb_defeated` flag set at w125 stays true through the rest of the war, which is correct for everything the engine actually models.

If the DLC future-work hook is ever activated, that DLC's new "APWB returns" event can introduce a separate flag (`apwb_return_active`) without contradicting `apwb_defeated`. The two flags can coexist semantically: "APWB was defeated by 5th Corps in 1994 AND APWB returned briefly with HV in 1995" is historically accurate.

---

## Summary of decisions

| # | Question | Decision | Plan impact |
|---|---|---|---|
| 1.1 | File layout | Extend `historical_anchors.ts` in-place | None — already plan's recommendation |
| 1.2 | Apr 94 area band | SCRT 65-71% as diagnostic-only | Tighten plan §5.3 |
| 1.3 | Diagnostic reporting | Inline in test | Already plan's recommendation |
| 1.4 | Painted-map anomalies | Repaint Goražde + Žepa; defer Kupres; APWB resolved | Tier 1 plan §3 needs update |
| 1.5 | Test run cost | Piggyback | Already plan's recommendation; add 104w to CI if not present |
| 1.6 | w156 snapshot | Author `apr1992_definitive_156w.json` (one-off) | Replace plan §9.6 deferral with concrete authoring task |
| 2.1 | Schema | **Path A: refactor debuff to faction-scoped existing kinds** | APWB cut plan §2.3 must be rewritten; §6 stop-gate clears under Path A |
| 2.2 | Hard vs prob block | Hard-block via `bot_priority_shift` | Plan tightened |
| 2.3 | Turn windows | w78-w125 confirmed | None |
| 2.4 | Flag durability | Persistent | None |

## Material plan changes required

1. **APWB cut plan §2.3** — rewrite the proposed consequence events to use existing faction-scoped effect kinds (`aggression_modifier`, `bot_priority_shift`, `recruitment_modifier`). Note the precision tradeoff explicitly.
2. **APWB cut plan §6** — strike the schema-check stop-gate (no longer applies under Path A). Add Path B as a future-work hook.
3. **Tier 1 anchor plan §3** — split painted-map fixes table into "repaint" / "alternate" / "defer" / "resolved by APWB cut" rows.
4. **Tier 1 anchor plan §5.1** — replace the w156 "open question" with concrete authoring of `apr1992_definitive_156w.json`.
5. **Tier 1 anchor plan §9** — collapse to a parking-lot list of resolved items + the residual user-opinion items (none remain in this round).
6. **APWB cut plan §8** — collapse to a parking-lot list of resolved items.

## Unresolved (user decision)

None. All 10 questions resolved by research + canonical-design synthesis.
