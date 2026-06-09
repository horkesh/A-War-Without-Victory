# Codex Backlog Triage — Tasks #49 / #53 (Codex #324 / #325)

**Date:** 2026-06-09
**Mode:** READ-ONLY triage. No code/data changes. Calibration-LAST regime.
**Floor of record:** 188w 649/712 hash `5f57d17287b87dfb` · 40w `be76e56dd9d288c2` (held as a regression GUARD).
**Question per item:** would a fix move the 188w/40w hash or the 649 OSID count? Classify CALIBRATION-MOVING / calibration-inert / unknown-needs-measure, scope it, sequence it.

---

## Task #49 — Codex #324: E-A5 `us_halts` — move offensive-ops suppression into the player's "comply" response

### What the finding is

Tracker label (COMMAND_BOARD.md L20): *"#49 Codex-#324 E-A5 `push_further` player-agency."*

There is **no single verbatim Codex inline comment** in the merged PRs that reads "move suppression to comply response" — that phrasing is the project's own synthesis of a design defect that is plain in the event definition + engine code (and is adjacent to the one literal Codex comment that does exist on the introducing PR, quoted below). The defect:

The E-A5 event `us_halts_federation_advance_1995` (`data/scenarios/events/war_1995.json` L2033–2182) is a **player-decision event** (`requires_player_response: true`, `responding_faction: RBiH`, options `comply` / `push_further`). But the offensive-ops suppression is authored at the **event level** in `effects[]` (L2059–2084), not inside a response option:

```jsonc
"effects": [
  { "kind": "aggression_modifier", "faction": "RBiH",  "delta": -0.2, "duration_turns": 12 },
  { "kind": "aggression_modifier", "faction": "HRHB",  "delta": -0.2, "duration_turns": 12 },
  { "kind": "offensive_ops_suppression", "faction": "RBiH",  "duration_turns": 6, "reason": "us_halts_federation_advance_1995" },
  { "kind": "offensive_ops_suppression", "faction": "HRHB",  "duration_turns": 6, "reason": "us_halts_federation_advance_1995" }
],
```

In `src/sim/events/evaluate_events.ts` the event-level `effects[]` are applied **unconditionally the instant the event fires**, before/independent of any response:
- L100–107 `collectEffects(def)` = `[def.effect, ...def.effects]`.
- L532–535 (the fire loop) calls `applyEventEffects(state, effects)` for every fired event.
- Only AFTER that (L561+) does the decision branch run; response-option effects are applied separately (bot: L636/L648 via `applyEventEffects(chosen.effects)`; player: `resolve_decision.ts` L41).

Consequence: the launch-halt freeze is applied whether the player picks `comply` or `push_further`. The `push_further` option ("Defy Washington. Take Banja Luka…") cannot actually keep launching offensives — it is a **hollow choice**. The player-agency fix is to delete the two `offensive_ops_suppression` entries from `effects[]` and move them into `response_options[0]` (`comply`) `effects`, so only complying freezes the front.

**The literal Codex comment that DOES exist** is on PR #312 (`3d664e5b0`, the PR that introduced the suppression), same event, a sibling E-A5 correctness finding (P2):

> **Don't gate halt on stale turn summaries** — "When the RS share first drops to ≤51% during turn 184, this condition will still read the previous completed turn's `territory_snapshot`: `evaluate-events` runs near the start of the war pipeline before `advance-sector-offensives`, while `compile-turn-summary` appends the new snapshot at end-of-turn. … this event's `turn_max` is 184, so the halt/suppression can be skipped exactly at the last in-window crossing…"

(Note: the live event def now has `turn_max: 188`, not 184 — the window was widened after #325, partially addressing the literal Codex comment. The `push_further` player-agency defect is the substance carried as #49.)

### Calibration impact — **calibration-INERT** (high confidence)

Reasoning from the active calibration path:
1. The event's `bot_response_logic` is `accept_first` and `comply` is `response_options[0]` (war_1995.json L2087). `selectAIDefaultResponse` (`ai_default_response.ts` L12) returns `options[0]` for `accept_first` → the bot **always complies**.
2. Calibration runs headless (`headless_scenario_auto_control=true`) with the historical bot path (`forceHistorical` / two-level → `applyAIDefaultResponse`, evaluate_events.ts L620–622). There is no human ever picking `push_further` in a calibration run. Per project memory: *"bots pick options[0] = historical choice."*
3. Therefore the bot already takes the `comply` path on every calibration turn. Moving the suppression from `effects[]` into `comply.effects` produces an **identical write to `state.military.offensive_ops_suppressions`** on the bot path — same faction, same `duration_turns: 6`, same fire turn.
4. The consumer (`isFactionOffensiveOpsSuppressed`, `active_modifiers.ts` L64) is **origin-agnostic**: it only reads the suppression array, not where the entry was authored. No consumer change is needed and no behavioral difference results.

The behavioral delta exists ONLY for a human player choosing `push_further` — a path never exercised by calibration. Net: byte-identical 188w/40w, 649 unchanged.

*Residual risk (small):* the two `aggression_modifier` entries also sit in `effects[]`. If a fix ALSO moved those into `comply` (rather than scoping strictly to the two suppression entries), the bot path stays identical too (bot complies), so still inert — but the task scope is the suppression specifically. Keep the aggression modifiers as-is unless a paired redesign is intended; either way bot-path-inert. Recommend a flag-off→flag-on **byte-identical 188w/40w proof** as the merge gate to convert "high confidence" into "proven."

### Scope

- ~6–10 line **data-only** edit in `data/scenarios/events/war_1995.json` (relocate two array entries from `effects[]` into `response_options[0].effects`).
- No engine/consumer changes. No type changes.
- 1 small test recommended: assert `comply` writes the suppression and `push_further` does not.

### Recommendation + sequencing

**Defer to D1 finalization** (process), even though it is calibration-inert. Rationale: it is a player-agency/correctness edit with zero calibration value during calibration-LAST; it belongs to the "soul-systems / finish-work" bucket, and even an inert data edit to a fall-1995 event should ride the single one-way D1 re-floor with a byte-identical proof attached — not be slipped in mid-regime. If picked up earlier for player-experience reasons, it is safe to do **fix-now** ONLY with the flag-off-vs-on 188w/40w byte-identical proof in the PR.

---

## Task #53 — Codex #325: phase_e simulator combo attribution (patron/milcred default-on leak)

### What the finding is — verbatim Codex comment (PR #325, on `src/sim/political/political_dimension_propagation_gate.ts:119`)

> **Add default-on PDP gates to simulator combos** — "With this channel now defaulting to enabled, in-process diagnostics that only override the legacy gates inherit `patron_confidence=true` from the env fallback. I checked `tools/diagnostics/phase_e_activation_simulator.ts:681-688`: `applyGateForCombo()` sets only global/intl/cohesion, so every Tier 2 combo with `global: true` (`global_only`, `intl_only`, etc.) actually runs with patron_confidence active, and the same applies to the new military_credibility default-on branch below. That corrupts the simulator's ON-vs-OFF attribution/isolation; add explicit patron/milcred bits to the combo matrix or force them off for legacy combos."

### Verified against code

- `applyGateForCombo()` (`phase_e_activation_simulator.ts` L683–688) calls exactly three setters: `setPoliticalDimensionPropagationOverride(gate.global)`, `setIntlStandingOpsHesitationOverride(gate.intl_standing)`, `setCohesionCautionBiasOverride(gate.cohesion)`.
- `COMBO_GATES` (L106–112) and `ComboGateState` (L97–101) have **only three bits**: `global`, `intl_standing`, `cohesion`. No `patron_confidence` / `military_credibility` bit exists.
- The gate module's patron/milcred setters DO exist (`setPatronConfidenceOpsHesitationOverride` L124, `setMilitaryCredibilityCautionBiasOverride`) but `applyGateForCombo()` never calls them.
- Both patron and milcred are now **DEFAULT-ON** when unset (gate.ts L114–120 `raw !== 'false' && raw !== '0'`, and the milcred twin). So the simulator's `global_off` "OFF baseline" is not actually all-off — patron+milcred remain ON in every combo, contaminating the ON-vs-OFF diff the tool produces.

### Calibration impact — **calibration-INERT** (certain)

`tools/diagnostics/phase_e_activation_simulator.ts` is a **diagnostic tool**, not part of the sim pipeline. It is not imported by `war_phases.ts` or any scenario-run path; it is invoked manually to *characterize* PDP activation. The scenario runner, the 188w/40w/52w manifests, and the 649 count are produced by the real pipeline, which reads the gate module directly (patron+milcred default-ON, already sweep-verified calibration-flat at 649). Fixing the simulator only corrects the **accuracy of a diagnostic artifact's attribution columns** — it cannot move any calibration hash or OSID count. No simulation behavior is touched.

### Scope

- Add `patron_confidence` + `military_credibility` bits to `ComboGateState` + `COMBO_GATES` (5 rows) and wire the two existing setters into `applyGateForCombo()`; reset them in the existing `resetPoliticalDimensionGates()`/`finally` path.
- ~25–40 LOC in **one file**: `tools/diagnostics/phase_e_activation_simulator.ts` (optionally a small readout column addition).
- No `src/` change beyond using already-exported setters. No data change.

### Recommendation + sequencing

**Fix-now eligible** (provably calibration-inert — tool-only), but **low priority**: defer until the phase_e simulator is actually next needed for a PDP-tuning lane (e.g. task #48 `international_standing`/`internal_cohesion` faction-asymmetric tuning). Rationale: the only consumer of correct attribution is a future PDP sub-flag lane; fixing it now yields no current value, and there is no harm in deferring since the real pipeline is unaffected. If #48 is scheduled, fold this fix in as its first step so the simulator's ON-vs-OFF isolation is trustworthy before tuning decisions rely on it.

---

## Summary table

| Task | Codex | Finding | Classification | Scope | Sequencing |
|---|---|---|---|---|---|
| #49 | #324 | E-A5 suppression auto-applied via `effects[]` regardless of `comply`/`push_further` → hollow player choice | **calibration-INERT** (bot always `comply`s on the historical/headless path; consumer origin-agnostic) | ~6–10 LOC data-only, war_1995.json | **Defer to D1** (inert but rides the one-way re-floor with byte-identical proof); fix-now only with flag-off-vs-on 188w/40w proof |
| #53 | #325 | phase_e simulator combos inherit default-ON patron/milcred → corrupted ON-vs-OFF attribution | **calibration-INERT** (diagnostic tool, not in sim pipeline) | ~25–40 LOC, `tools/diagnostics/phase_e_activation_simulator.ts` | **Fix-now eligible, low priority**; fold into the next PDP-tuning lane (#48) |

**Both items are calibration-inert.** Neither can move the 188w/40w hash or the 649 count. #49 is an inert player-agency data fix best ridden on D1; #53 is an inert diagnostic-tool fix best done just-in-time before the next PDP-tuning lane.
