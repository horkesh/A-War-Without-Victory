# VRS SRK strangle-not-capture doctrine — scope, build, validation

**Status:** SCAFFOLD shipped DEFAULT-OFF (calibration-inert). Activation (default-on) = VALIDATED GO, ready as a deliberate follow-up. 2026-06-12. Standup Priority 1 (War-or-Game's #1 realism pick).

## What & why
The SRK (`vrs_sarajevo_romanija`) historically **strangled** Sarajevo (siege/shelling/interdiction), it never attempted to **capture** the city — Galić Appeal Judgement §389. The bot-AI gives the VRS the same "take the OSID" logic as the ARBiH, so the SRK *could* generate organic capture ops against the Sarajevo urban core — the most visible implausibility a real commander would hit in the first hour of D2. This doctrine suppresses SRK organic capture intent against the 4 urban-core municipalities while leaving the outer ring (ilidža/vogošća/ilijaš/hadžići/pale/sokolac) a legitimate SRK objective, and preserves the player's ahistorical-assault choice via the `authorize_op` presidential lever.

## §6 panel verdict: GO-WITH-GUARD (4-lens scoping)
Historian (strangle doctrine + the urban-core vs outer-ring distinction), Corps-Commander (bot-AI lever sites), Gameplay-Programmer (Lane-V-pattern implementation, calibration-inertness), Canon-§6 (the gate). **§6-clear:** strictly SRK; Drina Corps owns Srebrenica/Žepa (separate corps, no Sarajevo adjacency); no genocide-rupture flag touches Sarajevo control. **Guard (satisfied):** an `authorize_op` urban-core capture awards NO positive reward — the verdict path treats it through the atrocity-cost term (`ATROCITY_COST_GAIN`/`war_cost_index` → grade cap), strictly worse, never better. The atrocity-never-rewarded bright line is intact.

## Build (default-off, Lane-V pattern) — commit 29253fcf4
- `src/sim/combat/contain_posture_gate.ts` — `isSrkStranglePostureEnabled()` (env `AWWV_SRK_STRANGLE_POSTURE` = `'true'|'1'`, DEFAULT-OFF) + test setter/reset.
- `src/sim/combat/srk_strangle.ts` (new) — `SRK_STRANGLE_SUPPRESSED_MUN_IDS` (= `SARAJEVO_CITY_CORE_MUN_IDS`) + `computeSrkStrangleOsids(state)` (RBiH-held urban-core OSIDs, sorted via strictCompare, pure).
- `src/sim/turn_phases/war_phases.ts` — flag-gated ADDITIVE union of the strangle set into `last_contained_osids_by_faction.RS` (merges with Lane V, never overwrites; no release predicate — the SRK never pivoted).
- `src/sim/combat/commander/plan.ts` — `isContainSuppressionActiveFor('RS')` now activates the existing contain filter under EITHER Lane V or this flag (prevents stale serialized sets being honoured flag-off).
- `tests/srk_strangle_posture.test.ts` — 16 tests (default-off, override, urban-core suppressed, outer-ring NOT suppressed, no friendly-fire, Srebrenica/Drina unaffected, additive merge, determinism, null-controllers fallback).

## Validation (scenario-tester GO on both)
- **flag-OFF 40w:** structural fingerprint `3649b3861a87e6ea` == documented floor → **byte-identical INERT**. matched_osids 655, anchors 30/30.
- **flag-ON 188w:** matched_osids **658** (== floor), anchors **30/30**, §6 anchors ALL PASS (Srebrenica/Žepa RS, Goražde/Bihać RBiH), `engine_health_gate.cjs` **7/7 PASS** (dead_ops 32, ghost 2, stranded 4, consist 3, K:W 3.847). 16/16 unit tests pass.
- **Mechanism fired:** `last_contained_osids_by_faction.RS` = the 4 `sarajevo_dio_*` urban-core OSIDs; the 4 urban-core district OSIDs are RBiH at t188.
- **Scenario-tester key finding:** the SRK already targets ONLY the outer ring (ilidža/vogošća) emergently in BOTH conditions — it was never organically assaulting the urban core. So the doctrine is a **HARDENING guard** (codifies + guarantees the historical strangle pattern against future bot-AI/OOB/pressure changes that might surface urban-core targets; unit tests prove the filter blocks them), not a current territory-mover. Territory is unchanged because the behaviour was already correct emergently.

## Decision
- **Scaffold (default-off): SHIP** — inert, byte-identical, scenario-tester GO. This PR.
- **Activation (default-on): VALIDATED GO, deferred as a deliberate follow-up.** Floor-preserving + §6-intact + realism-hardening. Activation flips a default affecting every run + moves the golden full-save hashes (new persisted `last_contained_osids_by_faction.RS` write — an observer-field re-floor; 40w structural fingerprint UNCHANGED at `3649b386` since territory is byte-identical). Per the established ship-default-off-first pattern (Lane V / collapse / casualty_realism_v2), activation is a separate re-floor decision (scenario-tester GO + golden-manifest re-bless), ready when the doctrine should actively guard D2.
