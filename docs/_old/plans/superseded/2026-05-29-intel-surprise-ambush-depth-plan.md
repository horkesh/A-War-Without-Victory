# Intel Surprise / Ambush Depth — Implementation Plan

**Date:** 2026-05-29
**Status:** PLANNING ONLY (no source code, no commit)
**Owner lane:** Intel extensions / engine-quality lane
**Author role:** Gameplay Programmer (AWWV Pyrrhic team)
**Related command-board row:** P2 — "Intel surprise / ambush depth" (`docs/plans/COMMAND_BOARD.md:40`, status ACTIVE). Verification/Proof column: "Intel/combat focused tests, scenario hash review, AAR/read-model review." **STOP GATE column:** "Hidden-truth UI leak or design expansion beyond bounded friction."
**Supersedes / expands:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 1 (the ~30-line thin phase). This plan does NOT contradict it; it deepens it to execution grade. Source design plan: `docs/plans/2026-05-17-intel-extensions-plan.md` (Tasks 4/7, Batches 15-17 already SHIPPED).
**Pattern source (canonical, SHIPPED):** `getIntelAmbushAttackerCasualtyMult` / `getIntelAmbushDefenderCasualtyMult` in `src/sim/combat/combat_math.ts:416-440`; public-label surface `buildPublicIntelFrictionAnnotation` in `src/sim/combat/attack_resolution_osid.ts:231-246`.
**Collision rules:** May touch `src/sim/combat/combat_math.ts`, `src/sim/combat/attack_resolution_osid.ts`, `src/sim/combat/sector_intel.ts`, `src/sim/combat/commander/briefing.ts`, a new flag-gate module, and new/edited tests only. MUST NOT touch calibration catalogs, scenario data, event data, OOB, or operation tuning. MUST NOT cross into GUI shell ownership (read-model annotations only, no panel layout). MUST NOT refresh baselines (every new lever ships default-OFF).

---

## 1. Objective + Why

The intel surprise / ambush mechanic is **already SHIPPED and live in the baseline** (Batches 15-17 of the intel-extensions plan). The current mechanic is narrow: an attacker launching into a defender-OPSEC sector with low observed intel confidence suffers a deterministic attacker-casualty *uptick* and a defender-casualty *reduction*, surfaced only via the public `ambush_risk` label. This plan **expands ambush depth** along the dimensions the source plan explicitly deferred ("Broader surprise/ambush modeling remains follow-up", `2026-05-17-intel-extensions-plan.md:35`) while keeping every new behavior inside the COMMAND_BOARD "bounded, player-safe friction" envelope.

**Why expand now (and why bounded):**

- The current ambush effect is **binary on a single signal** (defender OPSEC active + observed confidence below `1/3`). It does not scale with *how surprised* the attacker is beyond the confidence gap, ignores the **stale-intel age** of the belief, and offers no graduated AAR explanation. A real commander walking a corps into an unscouted, prepared defense suffers progressively worse than one with day-old intel.
- The mechanic is currently **un-flag-gated** — meaning any expansion that moves a number is a baseline change. To keep flag-OFF byte-identity (the sacred regression gate), this plan **retro-gates the existing live behavior behind a default-ON flag** AND adds new depth behind **default-OFF** sub-flags, so the *expansion* is byte-identical with new flags OFF and the *current* behavior is preserved with the umbrella ON.
- Magnitude stays soft and bounded: every new lever is a multiplicative casualty/friction nudge inside the existing `[0.94, 1.12]`-class envelope. No hard blocks, no new attacks, no fog-of-war subsystem.

This directly serves AWWV's negative-sum thesis: poor reconnaissance compounds attrition, it does not gate conquest.

---

## 2. Scope & Non-Scope

**In scope (bounded friction depth only):**
1. **Retro-gate** the existing live ambush behavior behind a default-ON umbrella flag (`AWWV_INTEL_AMBUSH_DEPTH`) so the *current baseline is preserved when ON*, and the *new expansion is provably byte-identical when the new sub-flags are OFF*.
2. **Stale-intel ambush amplifier** (default-OFF sub-flag): when the attacker's belief is not just low-confidence but *aged* (turns since last refresh), the ambush attacker-casualty multiplier scales an additional bounded step. Derives from existing belief age signal, no new randomness.
3. **Graduated ambush severity band** in the public annotation: extend `buildPublicIntelFrictionAnnotation` to emit a `ambush_severity: 'light' | 'sharp'` qualifier alongside the existing `ambush_risk` label, derived only from attacker-side observed magnitude (NOT defender truth).
4. **Defender-side preparation depth** (default-OFF sub-flag): a *bounded* extra defender-power nudge when the defender's sector has been OPSEC for ≥N turns (dug-in ambush), reusing existing `opsec_sectors` membership + existing dig-in state, no new schema.
5. Tests for every new helper, the gate, the annotation shape, and flag-OFF byte-stability.

**Explicitly NOT in scope (STOP-GATE protection):**
- **NOT an intel / fog-of-war subsystem expansion.** No new SectorIntelRecord fields, no new recon sources, no new belief layer. (Those are the *separate* `2026-05-17-intel-extensions-plan.md` Tasks 1-3/5-6, already shipped.)
- **NOT hidden-truth exposure.** No new label or read-model field may reveal defender strength, posture, brigade identity, or any value the attacker could not infer from its OWN observed confidence/OPSEC-contact. All new labels are attacker-self-state (severity of *its own* surprise), never defender truth. This is the hard STOP gate.
- **NOT randomness.** Every lever is a pure function of existing deterministic state (observed confidence, belief age, OPSEC tenure). Source-plan stop gate: "Stop if ambush/surprise requires randomness" (`2026-05-17-intel-extensions-plan.md:52`).
- **NOT a new attack path.** Ops-only-attacks invariant: ambush only modifies casualty/power multipliers *inside* existing `resolveAttackOrdersOsid`; it never creates a CorpsOperation or makes a brigade attack independently.
- **NOT calibration.** Initial magnitudes mirror the shipped envelope; calibration owns any future retune. No baseline refresh.
- **NOT GUI shell.** Read-model annotation field only; panel layout belongs to the GUI branch.
- **NOT §6 sensitive-history content.**

---

## 3. Current-State Findings (file:line evidence)

1. **The ambush mechanic is SHIPPED and live (un-gated).** Two pure helpers in `src/sim/combat/combat_math.ts:416-427` (`getIntelAmbushAttackerCasualtyMult`) and `:429-440` (`getIntelAmbushDefenderCasualtyMult`). Constants `INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD = 1/3` (`:91`), `INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MULT = 1.12` (`:92`), `INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MULT = 0.94` (`:93`). Both helpers are pure: clamp confidence to `[0,1]`; return `1` when defender OPSEC inactive OR confidence ≥ threshold; otherwise scale linearly by `confidenceGapRatio = (threshold − confidence) / threshold`. No randomness, no state, no schema.

2. **Single consumption site** is `resolveAttackOrdersOsid` in `src/sim/combat/attack_resolution_osid.ts:698-705` (compute the two multipliers) and `:770-771` (apply them: `attCasMult: attCasMult * intelAmbushAttackerCasualtyMult`, `defCasMult: defCasMult * intelAmbushDefenderCasualtyMult`). The OPSEC-active boolean is `(state.military.opsec_sectors ?? []).includes(defendingSectorId)` (`:696,700,704`).

3. **Public, hidden-truth-safe label surface** is `buildPublicIntelFrictionAnnotation` in `src/sim/combat/attack_resolution_osid.ts:231-246`. It emits only attacker-self labels: `stale_intel` (when attacker power was reduced), `defender_opsec` (when defender power was boosted — note this is *contact-inferred*, the attacker knows it walked into OPSEC), `ambush_risk` (when attacker casualty mult > 1). It attaches `attacker_confidence_band` (low/medium/high) ONLY, never a defender value. The annotation is attached to the AAR at `:934` (`...(executionFriction ? { execution_friction: executionFriction } : {})`). This is the canonical no-leak pattern to extend.

4. **Confidence-band classifier** `getIntelConfidenceBand` at `:225-229` (low `<1/3`, medium `<2/3`, high) — reuse for severity banding.

5. **`opsec_sectors` is populated only by the OWN faction's planning ops** at `src/sim/combat/sector_offensive.ts:967-973` (push on `planning` phase) and cleared at `:657-658` and `:1206-1207`. Also mutable from the desktop UI at `src/desktop/electron-main.cjs:2329-2333`. State field declared `src/state/game_state.ts:2166` (`opsec_sectors?: string[]`). It is consumed by `sector_intel.ts:80` (passive-buildup reduction), `cohesion_drift.ts:45`, `briefing.ts:308`, and the three attack-resolution sites above.

6. **Belief age / stale-intel signal already exists.** `2026-05-17-intel-extensions-plan.md:35` confirms stale-intel confidence decay is live (Tasks 1-3/5-6), and `sector_intel_constants.ts:16,44,51,58` define `confidence_decay_per_turn` (intel decays universally each turn). The *attacker observed confidence* passed into the ambush helpers (`attack_resolution_osid.ts:688-693`, `getAttackIntelConfidence`) already folds decay — so "stale intel" is reflected in a *lower* confidence number. The expansion (§4b) reads this same single confidence number more aggressively at the deep-low band; it does NOT add a new age field.

7. **Combat predictor blindspot (project memory):** `checkLaunchFeasibility` ignores defender artillery/terrain/entrenchment. The ambush mechanic is the *post-launch* friction that partially compensates — but this plan does NOT touch the predictor (out of lane; that is the COMBAT-P14 calibration lane). Noted to avoid double-counting.

8. **Tests already cover the shipped slice:** `tests/attack_resolution_osid_intel_friction.test.ts:1-40` imports all three multiplier helpers and `compileTurnSummary`. This is the suite to extend, alongside `tests/sector_intel.test.ts` and `tests/commander/commander_belief_layer.test.ts`.

**Key consequence:** because the mechanic is currently UN-gated, the only way to ship an *expansion* while honoring the byte-identity gate is the two-tier flag pattern (umbrella default-ON preserves current behavior; new sub-flags default-OFF make the expansion inert). This mirrors the shipped `political_dimension_propagation_gate.ts` two-tier idiom.

---

## 4. Design

All new levers are pure functions of one-or-two existing numeric inputs, bounded multiplicatively, with `1.0` / no-op fast paths. Magnitudes sit inside the shipped `[0.94, 1.12]` envelope. Determinism: no `Math.random`, no `Date.now`, no timestamps; flags read `process.env` / module-local override only.

### 4a. Retro-gate the existing live behavior (umbrella, default-ON)

- **New module** `src/sim/combat/intel_ambush_depth_gate.ts` mirroring the two-tier idiom of `political_dimension_propagation_gate.ts`.
- **Tier-1 umbrella** `isIntelAmbushDepthEnabled()` reading env `AWWV_INTEL_AMBUSH_DEPTH`, **default TRUE** (preserves current baseline). The existing helpers at `combat_math.ts:416-440` gain an early `if (!isIntelAmbushDepthEnabled()) return 1;` guard. With the umbrella default-ON, behavior is byte-identical to today.
- **Purpose:** gives a single kill-switch for the whole ambush family and a clean seam for the new sub-flags. The umbrella default-ON is the one deliberate non-OFF default in this plan; it is justified because the gated behavior is *already in the baseline* — turning the umbrella OFF would be the behavior change, not ON.

### 4b. Stale-intel ambush amplifier (sub-flag, default-OFF)

- **Decision biased:** the attacker-casualty multiplier inside the existing ambush helper.
- **Signal:** the *same* observed confidence already passed in. Below a deep-low band (`confidence < INTEL_EXECUTION_AMBUSH_DEEP_LOW = 1/6`, i.e. half the existing threshold), apply an additional bounded step so a truly-unscouted assault hurts more than a marginally-low one.
- **Magnitude:** extend the attacker-casualty ceiling from `1.12` to `INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MULT_DEEP = 1.18` ONLY in the deep-low band, scaled by a second `deepGapRatio`. Defender-casualty floor unchanged (stays `0.94`) — the expansion makes the *attacker* bleed, it does not further protect the defender (avoids runaway).
- **Helper:** new `getIntelAmbushDeepStaleAttackerCasualtyMult(confidence, defenderOpsecActive)` in `combat_math.ts`, pure, gated by `isIntelAmbushStaleDepthActive()` (umbrella AND `AWWV_INTEL_AMBUSH_STALE_DEPTH`). Returns `1` when sub-flag OFF, OPSEC inactive, or confidence ≥ deep-low band.
- **Composition:** at `attack_resolution_osid.ts:770`, the attacker mult becomes `attCasMult * intelAmbushAttackerCasualtyMult * intelAmbushDeepStaleMult`. With the sub-flag OFF the third factor is exactly `1.0` → byte-identical.

### 4c. Graduated ambush severity in the public annotation (sub-flag, default-OFF)

- **Surface:** extend `buildPublicIntelFrictionAnnotation` (`attack_resolution_osid.ts:231-246`) to add an optional `ambush_severity: 'light' | 'sharp'` qualifier, derived ONLY from the attacker-self casualty multiplier already computed: `'sharp'` when the combined attacker-casualty mult ≥ a threshold (e.g. the deep-band ceiling), else `'light'`. Emitted only when `ambush_risk` is already present.
- **Hidden-truth safety:** the qualifier is a function of the attacker's OWN casualty multiplier, which is itself a function of the attacker's OWN observed confidence + the fact it contacted an OPSEC sector. It reveals nothing about defender strength/posture/identity. This is the load-bearing no-leak argument and the primary STOP-gate guard.
- **Gate:** `isIntelAmbushSeverityLabelActive()` (umbrella AND `AWWV_INTEL_AMBUSH_SEVERITY_LABEL`). With sub-flag OFF, the annotation object is byte-identical to today (no new key).

### 4d. Dug-in defender preparation depth (sub-flag, default-OFF)

- **Signal:** defender sector OPSEC-active (existing `opsec_sectors` membership) AND the defending brigades already in a dig-in state (reuse existing dig-in/entrenchment state read at the resolution site — NO new schema). A prepared ambush from a long-dug-in position is sharper than a fresh OPSEC marking.
- **Magnitude:** a bounded extra defender-power nudge layered on the existing `INTEL_EXECUTION_OPSEC_DEFENDER_POWER_MULT = 1.08` (`combat_math.ts:90`), capped so total defender-power-from-OPSEC never exceeds e.g. `1.12` (one step above current). This is a *power* multiplier (affects power ratio / outcome), distinct from the casualty multipliers — kept small to avoid perturbing outcome classification broadly.
- **Helper:** extend `getIntelExecutionFrictionMultipliers` (or add a sibling) so the defender-power mult is `1.08` (current) or the capped boosted value when the dig-in sub-flag is active. Gated by `isIntelAmbushDugInDepthActive()` (umbrella AND `AWWV_INTEL_AMBUSH_DUGIN_DEPTH`). Sub-flag OFF → returns `1.08` exactly (or `1.0` if no OPSEC) → byte-identical.
- **Risk note:** this is the only lever that touches the *power ratio* (not just casualties), so it can flip outcome classification at the margin. Default-OFF; activation lane must run a focused ON-vs-OFF magnitude probe. Kept smallest of the four.

### Composition summary

| Lever | Flag (default) | Touches | Magnitude envelope | Byte-OFF guarantee |
|---|---|---|---|---|
| 4a umbrella retro-gate | `AWWV_INTEL_AMBUSH_DEPTH` (ON) | existing helpers | current `1.12` / `0.94` | umbrella ON = current baseline |
| 4b stale amplifier | `AWWV_INTEL_AMBUSH_STALE_DEPTH` (OFF) | attacker cas mult | `1.0`→`1.18` deep band | `×1.0` factor |
| 4c severity label | `AWWV_INTEL_AMBUSH_SEVERITY_LABEL` (OFF) | AAR annotation | label only | no new key |
| 4d dug-in depth | `AWWV_INTEL_AMBUSH_DUGIN_DEPTH` (OFF) | defender power mult | `1.08`→≤`1.12` | returns `1.08` |

---

## 5. Step-by-Step Implementation (one discrete commit per step)

> Each step is a single commit. No step changes default behavior: the umbrella is default-ON and gates only the *already-baseline* behavior (byte-identical); every NEW lever is default-OFF (byte-identical). Tests added in the step that introduces the behavior.

**Step 1 — New flag-gate module.**
File (new): `src/sim/combat/intel_ambush_depth_gate.ts`.
- Mirror the two-tier idiom of `src/sim/political/political_dimension_propagation_gate.ts`.
- Tier-1 umbrella `isIntelAmbushDepthEnabled()` env `AWWV_INTEL_AMBUSH_DEPTH` **default TRUE** + `setIntelAmbushDepthOverride(value)`.
- Tier-2 sub-flags (default FALSE): `isIntelAmbushStaleDepthEnabled` (`AWWV_INTEL_AMBUSH_STALE_DEPTH`), `isIntelAmbushSeverityLabelEnabled` (`AWWV_INTEL_AMBUSH_SEVERITY_LABEL`), `isIntelAmbushDugInDepthEnabled` (`AWWV_INTEL_AMBUSH_DUGIN_DEPTH`), each with its own `set…Override`.
- Combined predicates `isIntelAmbushStaleDepthActive()`/`…SeverityLabelActive()`/`…DugInDepthActive()` = umbrella `&&` sub-flag.
- `resetIntelAmbushDepthGates()` clears all overrides.
- **This step alone is inert** (no consumer reads it yet) → byte-identical.

**Step 2 — Retro-gate the existing helpers behind the umbrella.**
File: `src/sim/combat/combat_math.ts:416-440`.
- Add `if (!isIntelAmbushDepthEnabled()) return 1;` at the top of `getIntelAmbushAttackerCasualtyMult` and `getIntelAmbushDefenderCasualtyMult`.
- Import the umbrella predicate from the new gate module.
- Because the umbrella defaults ON, both helpers behave exactly as today → byte-identical baseline.

**Step 3 — Stale-intel deep-band amplifier helper.**
File: `src/sim/combat/combat_math.ts`.
- Add constants `INTEL_EXECUTION_AMBUSH_DEEP_LOW = 1/6`, `INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MULT_DEEP = 1.18`.
- Add pure helper `getIntelAmbushDeepStaleAttackerCasualtyMult(confidence, defenderOpsecActive)`: returns `1` unless `isIntelAmbushStaleDepthActive()` AND OPSEC active AND confidence `< INTEL_EXECUTION_AMBUSH_DEEP_LOW`; otherwise scale by `deepGapRatio = (DEEP_LOW − confidence) / DEEP_LOW`, ceiling `1.18`. NaN/undefined → `1`.
- Sub-flag default-OFF → always `1` → byte-identical.

**Step 4 — Wire the stale amplifier at the consumption site.**
File: `src/sim/combat/attack_resolution_osid.ts:698-705,770`.
- Compute `intelAmbushDeepStaleMult` next to the existing two.
- Change `:770` to `attCasMult: attCasMult * intelAmbushAttackerCasualtyMult * intelAmbushDeepStaleMult`.
- Sub-flag OFF → factor `1.0` → byte-identical.

**Step 5 — Graduated severity label in the public annotation.**
File: `src/sim/combat/attack_resolution_osid.ts:231-246`.
- Add the type `ambush_severity?: 'light' | 'sharp'` to `PublicIntelFrictionAnnotation` (declared near the annotation; cross-ref `attack_resolution_types.ts` if the type lives there).
- When `isIntelAmbushSeverityLabelActive()` AND `ambush_risk` is in `labels`, set `ambush_severity` from the attacker casualty mult (≥ deep ceiling → `'sharp'`, else `'light'`). Pass the combined attacker casualty mult into the annotation builder.
- Sub-flag OFF → no new key → byte-identical annotation object.

**Step 6 — Dug-in defender preparation depth.**
File: `src/sim/combat/combat_math.ts` (helper) + `attack_resolution_osid.ts:694-707` (wire).
- Add `INTEL_EXECUTION_OPSEC_DEFENDER_POWER_MULT_DUGIN = 1.12` cap. Extend `getIntelExecutionFrictionMultipliers` to accept an optional `defenderDugIn: boolean` arg (default false) and, when `isIntelAmbushDugInDepthActive()` AND OPSEC AND dug-in, return the capped boosted defender-power mult; otherwise the current `1.08`/`1.0`.
- At the call site, pass the existing dig-in/entrenchment boolean for the defending brigades (read-only; reuse whatever `applyDigInOnHalt`/dig-in state the resolver already has — NO new schema).
- Sub-flag OFF → returns `1.08`/`1.0` exactly → byte-identical.

**Step 7 — Tests (see §8).** New helper tables + gate + annotation-shape + flag-OFF byte-stability. Single commit.

**Step 8 — Docs/ledger.** Append `docs/PROJECT_LEDGER.md` entry (umbrella retro-gate is byte-identical; three new levers default-OFF, byte-identical with flags unset). Update `docs/20_engineering/REPO_MAP.md` (new gate module). Update `docs/20_engineering/PLAYER_VISIBLE_STATE.md` IF the severity label is documented there. Update `COMMAND_BOARD.md:40` next-action to point at this plan; status stays ACTIVE until activation lane. Do NOT edit `docs/10_canon/FORAWWV.md`.

---

## 6. Determinism, Canon & Ops-Only-Attacks Compliance

- **Ops-only-attacks intact:** all four levers only adjust casualty/power multipliers *inside* `resolveAttackOrdersOsid`. No CorpsOperation is created; no brigade attacks independently. Battles still flow exclusively through the existing op pipeline.
- **No nondeterminism:** every helper is a pure function of existing numeric inputs (observed confidence, OPSEC boolean, dig-in boolean). No `Math.random`, no `Date.now`, no timestamps. Flags read `process.env` / module-local override only (same as the shipped gate). Source-plan stop gate honored: "Stop if ambush/surprise requires randomness."
- **No new sorted iteration introduced;** existing ordering in the resolver is untouched.
- **Clamps:** confidence clamped `[0,1]` in every helper (mirrors `combat_math.ts:420-422,433-435`). Power/casualty mults bounded by explicit ceilings/floors.
- **Multiplicative `1.0` neutrality:** IEEE-754 `x * 1.0 === x` exactly for finite `x`, so the added `× intelAmbushDeepStaleMult` factor with sub-flag OFF cannot perturb `attCasMult`. The dug-in helper returns the *same* `1.08`/`1.0` with sub-flag OFF. The severity label adds no key with sub-flag OFF.
- **Umbrella default-ON justification:** the umbrella gates only behavior that is *already in the committed baseline*; ON = current baseline. This is the single deliberate non-OFF default and is the correct choice to preserve existing behavior while creating the seam.
- **Canon hierarchy:** soft multipliers respect Engine Invariants — no hard block, no override of initial OSIDs, no `avoided_osids_by_faction`.

---

## 7. Player-Surface Design (no hidden enemy truth leak)

- **All player-facing surface is post-hoc AAR annotation**, attached at `attack_resolution_osid.ts:934` via `execution_friction`. The player learns *after the battle* that their assault was ambushed.
- **Labels are attacker-self-state only.** `stale_intel` = "my intel was stale" (my power was reduced). `defender_opsec` = "I walked into a sector I had contact-inferred as OPSEC". `ambush_risk` = "I took ambush casualties". New `ambush_severity: light|sharp` = "how badly *I* was surprised". **None reveals defender strength, posture, brigade count/identity, or any value the attacker could not infer from its own observed confidence + contact.** This is the explicit STOP-gate guard: "Hidden-truth UI leak."
- **`attacker_confidence_band` is already attacker-self** (low/medium/high of MY OWN confidence) — the severity qualifier follows the identical safety contract.
- **No GUI shell change.** The annotation rides the existing AAR read-model; the GUI branch owns any panel rendering. A hidden-truth-safety test (§8) asserts the annotation contains no defender-truth fields.

---

## 8. Test Plan (specific vitest files)

**New / extended test files:**
- `tests/attack_resolution_osid_intel_friction.test.ts` (EXTEND — already imports the ambush helpers): add a deep-stale-band table for `getIntelAmbushDeepStaleAttackerCasualtyMult` (`undefined`/`NaN`→1.0; flag-OFF→1.0; `1/12`→>1.0 capped 1.18; `1/6`,`1/3`,`0.5`→1.0 when ≥ band); add a dug-in defender-power case; add an annotation-shape case asserting `ambush_severity` is ABSENT with the label sub-flag OFF and present (`light`/`sharp`) with it ON.
- `tests/intel_ambush_depth_gate.test.ts` (NEW — model on `tests/political_dimension_propagation_gate.test.ts`): umbrella default-ON; three sub-flags default-OFF; umbrella-OFF disables all; `reset…Gates` clears overrides; each combined predicate requires umbrella AND sub-flag.
- **Hidden-truth-safety test** (NEW or extend `tests/ui/war_summary_opsec_reconciliation.test.ts`): assert the AAR `execution_friction` annotation, with all sub-flags ON, contains ONLY the allowed keys (`labels`, `attacker_confidence_band`, `ambush_severity`) and NO defender strength/posture/identity field. This is the STOP-gate regression test.

**Existing suites to run (full regression):**
- `tests/sector_intel.test.ts`, `tests/commander/commander_belief_layer.test.ts`, `tests/h_phase_intelligence_warfare.test.ts`, `tests/intel_gated_operations.test.ts`, `tests/ui/war_summary_opsec_reconciliation.test.ts`.
- `npm run test:vitest` (entire suite — catches cross-test regressions; CI runs full on Linux).
- `npx tsc --noEmit`.

---

## 9. Verification Gates

Smoke-test triad after every step; full gate before close:
1. `npx tsc --noEmit` — clean.
2. `npm run test:vitest` — all green (new + existing).
3. `npm run desktop:map:build` — builds clean.
4. **Baseline regression (load-bearing):** `npm run sim:scenario:run:40w` AND `npm run sim:scenario:run:default` (188w) with all `AWWV_INTEL_AMBUSH_*` env UNSET (umbrella default-ON, three sub-flags default-OFF) → run hash **byte-identical** to the current committed baseline. Re-derive the live baseline hash from a clean checkout before editing — do NOT assume (memory cites 40w `39d5d0c09a4666c8` / 188w-band, but confirm at execution time). This proves: (a) the umbrella retro-gate preserves the current behavior, and (b) the three new levers are inert when OFF.
5. **Umbrella-OFF sanity (expected drift, documented):** with `AWWV_INTEL_AMBUSH_DEPTH=0`, hashes are EXPECTED to drift (ambush turns off). This run is NOT a pass/fail gate — it confirms the kill-switch works and quantifies the current ambush mechanic's footprint for the activation lane.
6. Poll CI after push (`gh run list --commit <sha>`); agent-local green is not sufficient.

---

## 10. Risks & Mitigations

- **R1 — accidental behavior drift (a new sub-flag leaks ON).** Mitigation: combined predicate requires umbrella AND sub-flag; §9.4 byte-level regression. STOP and report on any unexplained hash drift.
- **R2 — umbrella retro-gate accidentally inverts default.** Mitigation: dedicated gate test asserts umbrella defaults TRUE; §9.4 byte-identity is the proof that current behavior is preserved.
- **R3 — dug-in defender-power lever (4d) flips outcome classification.** Mitigation: smallest magnitude, capped at `1.12`, default-OFF; activation lane must run a focused ON-vs-OFF outcome-classification probe before flipping.
- **R4 — hidden-truth leak via severity label.** Mitigation: label derives only from attacker-self casualty mult; dedicated hidden-truth-safety test (§8) asserts no defender-truth field. Hard STOP gate.
- **R5 — double-counting vs combat predictor blindspot (COMBAT-P14).** Mitigation: this plan does NOT touch `checkLaunchFeasibility`; ambush is post-launch friction only. Noted in §3.7.
- **R6 — `effective_value`/confidence undefined for an edge case.** Mitigation: every helper has `undefined`/`NaN`→1.0 no-op guards (mirrors shipped pattern).

## 11. Rollback

Env-var only for the new levers: leave every `AWWV_INTEL_AMBUSH_*` unset (default) — three new levers inert, umbrella preserves current baseline. To hard-disable the *entire* ambush family (including current baseline behavior), set `AWWV_INTEL_AMBUSH_DEPTH=0`. `resetIntelAmbushDepthGates()` clears overrides back to env-default. No code revert needed for default-OFF neutrality.

## 12. Dependencies & Sequencing

- No hard dependency on other lanes. Steps ordered: gate module (1) → umbrella retro-gate (2) → stale helper (3) → stale wire (4) → severity label (5) → dug-in depth (6) → tests (7) → docs (8). Steps 1-2 establish byte-identity; 3-6 add gated depth.
- **Coupling caveat (carry-forward to activation lane):** the stale amplifier (4b) and the base ambush helper both multiply `attCasMult` — turning the stale sub-flag ON compounds with the always-on (umbrella) base ambush, so it is NOT additively neutral. The dug-in lever (4d) touches power ratio, which feeds outcome classification → casualty mults indirectly. Any activation must probe each sub-flag individually AND in combination, not assume independence (same lesson as the PDP verdict).

## 13. Owner

Engine-quality / intel-extensions lane: gameplay-programmer implements; game-designer co-owns bounded-friction design intent; canon-compliance-reviewer + determinism-auditor sign off on the byte-identical proof; QA engineer owns the hidden-truth-safety test; calibration owns any future activation/threshold retune.

## 14. Definition of Done

- New `intel_ambush_depth_gate.ts` module: one umbrella (default-ON) + three sub-flags (default-OFF) + three combined predicates + reset.
- Existing two ambush helpers retro-gated behind the umbrella; one new stale-amplifier helper; one extended dug-in defender-power path; one extended public annotation with `ambush_severity`.
- New unit tests green (helper tables, gate, annotation shape, hidden-truth safety); full vitest + tsc + desktop:map:build green.
- 40w + 188w baseline hashes **byte-identical** with all `AWWV_INTEL_AMBUSH_*` unset (umbrella ON, sub-flags OFF) — evidence captured in the ledger entry.
- Umbrella-OFF kill-switch verified to drift (footprint quantified, not a pass/fail gate).
- No sub-flag flipped ON; no baseline refreshed; no defender-truth field added to any read-model; `FORAWWV.md` untouched.
- `COMMAND_BOARD.md:40` next-action updated to this plan; `PROJECT_LEDGER.md` entry appended; `REPO_MAP.md` notes the new module.
