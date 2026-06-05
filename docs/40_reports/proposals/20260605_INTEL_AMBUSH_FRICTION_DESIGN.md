# Intel Surprise / Ambush Depth — Bounded-Friction Design Packet

**Date:** 2026-06-05
**Lane:** Command-board P2 "Intel surprise / ambush depth"
**Controlling plan:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 1
**Source plan:** `docs/plans/2026-05-17-intel-extensions-plan.md` (Tasks 4/7)
**Status:** DESIGN-PACKET (BLOCKED on Codex collision — NOT implemented)
**Verdict:** The only sensible call-site is a Codex-hot ADR-0007 file. Per the lane's
collision stop-gate, this packet is the correct deliverable; build when the Standing-OG
Defensive Model lane settles.

---

## 1. What already ships (baseline — do NOT re-implement)

The intel surprise / ambush *casualty friction* mechanic is **already live in the
baseline** and gated behind an umbrella kill-switch. Do not duplicate it.

| Surface | Location | Role |
| --- | --- | --- |
| Attacker casualty mult | `combat_math.ts::getIntelAmbushAttackerCasualtyMult` | ×1.0–1.12, scales with confidence gap |
| Defender casualty mult | `combat_math.ts::getIntelAmbushDefenderCasualtyMult` | ×1.0–0.94, scales with confidence gap |
| Power friction (stale intel) | `combat_math.ts::getIntelExecutionFrictionMultipliers` | attacker power ×0.85–1.0, defender ×1.08 under OPSEC |
| Umbrella flag | `intel_ambush_depth_gate.ts::isIntelAmbushFrictionEnabled` | env `AWWV_INTEL_AMBUSH_FRICTION`, **default ON** (off = inert ×1.0) |
| Confidence source | `attack_resolution_osid.ts::getAttackIntelConfidence` | reads `sector_intel[...].osid_confidence` / `.confidence` |
| Wiring / call-site | `attack_resolution_osid.ts:907–997` | passes confidence + `opsec_sectors.includes(sectorId)` boolean |
| Public label | `attack_resolution_osid.ts::buildPublicIntelFrictionAnnotation` | emits only `ambush_risk` / `stale_intel` / `defender_opsec` |

**Constants** (`combat_math.ts:92–96`):

```
INTEL_EXECUTION_ATTACK_POWER_MIN            = 0.85
INTEL_EXECUTION_OPSEC_DEFENDER_POWER_MULT   = 1.08
INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD = 1/3   (≈0.333)
INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MULT = 1.12
INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MULT = 0.94
```

**Current shape of the mechanic** (deterministic, no RNG):
- Triggers ONLY when `defenderOpsecActive == true` AND attacker `confidence < 1/3`.
- Severity scales linearly with the confidence gap:
  `confidenceGapRatio = (1/3 − confidence) / (1/3)`, in `[0, 1]`.
- Attacker casualties: `1 + 0.12 × gapRatio` (≤ +12%).
- Defender casualties: `1 − 0.06 × gapRatio` (≤ −6%).
- Player sees only the public `ambush_risk` label + a confidence *band* (low/med/high) —
  **never** the enemy's true strength. Hidden-truth invariant is preserved.

The umbrella's name (`intel_ambush_depth_gate.ts`) already reserves the "depth" concept;
the depth dimension itself is the **unfinished** part of source-plan Tasks 4/7.

---

## 2. The bounded-friction slice this lane intends (the "depth")

Source-plan Task 4/7 calls out broader surprise/ambush modeling as deliberate follow-up.
The remaining bounded slice is **ambush DEPTH**: the same capped friction, but its
severity additionally scales with how far the attacker is reaching past its own
reconnaissance — a deep thrust into an under-scouted, OPSEC-screened rear is more
ambush-prone than a shallow push at a well-observed front edge.

**Proposed mechanic (bounded, player-safe, negative-sum-aligned):**

- Introduce a *depth factor* `d ∈ [0, 1]` derived from **existing state only**:
  the attacker's recon reach vs. the target OSID's sector-hop distance from the
  attacker's friendly sector. When the target sits at or beyond the attacker's
  `recon_range` (from `FACTION_RECON_PROFILES`), `d → 1`; a front-adjacent target
  gives `d → 0`. This is a pure function of the contact graph + faction recon profile
  already in state — **no new persisted field, no RNG, no timestamps**.
- Fold `d` into the *existing* casualty multipliers as a **bounded amplifier of the
  current cap**, never a new uncapped swing:
  - attacker: `1 + (AMBUSH_ATTACKER_MULT − 1) × gapRatio × (1 + DEPTH_GAIN × d)`,
    with the whole expression **hard-clamped** to a new
    `INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MAX` (proposed ≤ 1.18, i.e. ceiling
    only modestly above today's 1.12).
  - defender: symmetric, clamped to a floor `≥ 0.90`.
- `DEPTH_GAIN` proposed ≈ 0.5 so depth can raise the *effective* friction by up to half
  again **within the new clamp** — friction/exhaustion, not a win-lever.
- Keep the trigger gated on `defenderOpsecActive AND confidence < threshold`. Depth only
  *modulates severity within bounds*; it never creates ambush where OPSEC is absent.

**Why this is player-safe and on-genre:**
- It is *friction on over-reach*, punishing blind deep thrusts with attrition — exactly
  the negative-sum exhaustion the game models. It is NOT a power fantasy or a new
  capture lever.
- It exposes **no hidden enemy truth**: the only player-facing output remains the
  existing `ambush_risk` label. Depth is an attacker-side, observable-input quantity.
- Flag-OFF (or depth-neutral `d=0`) is **byte-identical** to today's baseline by
  construction.

**Flag plan:** extend the existing `intel_ambush_depth_gate.ts` with a *second, nested,
default-OFF* sub-flag `AWWV_INTEL_AMBUSH_DEPTH` (depth amplifier), so the umbrella
(`AWWV_INTEL_AMBUSH_FRICTION`, default ON) keeps gating the shipped base mechanic and the
new depth amplifier defaults OFF / neutral. Mirror the `set/reset…Override` idiom already
in that file. Default OFF ⇒ no calibration movement until deliberately enabled.

---

## 3. The exact intended call-site — and why it collides

The depth factor `d` requires the **target OSID's distance from the attacker's recon
origin**, plus the attacker faction's `recon_range`. The single place that has the
attacker sector, target OSID, defender sector, and `GameState` all in hand is:

- **`attack_resolution_osid.ts::getAttackIntelConfidence` (line 405)** — already walks
  `findFriendlySectorIdForOsid` → `sector_intel[attackerSectorId]` → enemy sector record.
  Computing hop-distance/depth belongs right here (it already resolves both sectors).
- **`attack_resolution_osid.ts:907–997`** — the casualty-resolution block that calls
  `getIntelAmbush*CasualtyMult` and folds them into `attCasMult` / `defCasMult`. A new
  `depthFactor` argument would have to be threaded through here.

**Both are inside `attack_resolution_osid.ts`**, which is in the Codex-hot ADR-0007
"Standing OG Defensive Model" edit set (Codex is actively rewriting the sector-defense
casualty base — `getStandingOgEngagedDefenseBrigadeIds`, `sectorDefenseBrigades`,
`DEFENDER_CASUALTY_ENGAGEMENT_CAP` — i.e. the *exact* `attCasMult`/`defCasMult` block at
lines 980–997 the depth factor must hook into).

The `combat_math.ts` multiplier functions are **pure** — they cannot acquire a depth
input on their own; the depth must be computed at and fed from the call-site. There is
**no alternative, non-Codex-hot call-site**:
- `getAttackIntelConfidence` (depth derivation) → `attack_resolution_osid.ts` ❌
- the `attCasMult * intelAmbush…` fold (depth consumption) → `attack_resolution_osid.ts` ❌
- threading a new arg into `getIntelAmbush*CasualtyMult` → still needs the call-site ❌

A new isolated `src/sim/combat/intel_ambush_depth.ts` module *could* hold the pure
depth-factor math and the new clamp constants (no collision there), **but** the one line
that calls it and the one block that consumes its output both live in the Codex-hot file.
Editing those lines now would collide head-on with the in-flight ADR-0007 casualty-base
rewrite and risk a silent merge-stomp on calibration-sensitive code.

**Therefore: STOP. No implementation this round.**

---

## 4. Ready-to-build spec (when ADR-0007 / Standing-OG lane settles)

Build order, smallest-diff-first:

1. **New isolated module** `src/sim/combat/intel_ambush_depth.ts`:
   - `export function getAmbushDepthFactor(state, attackerOsid, defenderSectorId, targetOsid): number`
     → pure, deterministic, `[0,1]`; uses `findFriendlySectorIdForOsid` + the contact
     graph hop-distance + `FACTION_RECON_PROFILES[faction].recon_range`. Sorted iteration
     via `strictCompare` if it enumerates sectors. No RNG / `Date.now` / `new Date`.
   - New constants: `INTEL_EXECUTION_AMBUSH_DEPTH_GAIN = 0.5`,
     `INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MAX = 1.18`,
     `INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MIN = 0.90`.
2. **Extend the gate** `intel_ambush_depth_gate.ts` with the nested default-OFF
   `AWWV_INTEL_AMBUSH_DEPTH` sub-flag + `set/reset…DepthOverride` test hooks.
3. **`combat_math.ts`** — add an optional `depthFactor = 0` parameter to
   `getIntelAmbushAttackerCasualtyMult` / `…Defender…`; when the depth sub-flag is OFF
   or `depthFactor === 0`, return the *exact* current value (byte-identity by
   construction). When ON, apply the clamped amplifier from §2. (`combat_math.ts` is
   NOT in the Codex-hot set — safe.)
4. **`attack_resolution_osid.ts`** (Codex-hot — LAST, only post-settle): call
   `getAmbushDepthFactor(...)` once near the existing `getAttackIntelConfidence` call and
   pass the result into the two `getIntelAmbush*CasualtyMult` calls (lines 917–923). No
   change to the public label logic.
5. **Tests** `tests/intel_ambush_depth.test.ts`:
   - (a) depth sub-flag OFF ⇒ `getIntelAmbush*CasualtyMult(conf, opsec, depth)` byte-equal
     to the 2-arg shipped result for a grid of `(confidence, opsec)`.
   - (b) sub-flag ON ⇒ deeper target (`d=1`) yields strictly higher attacker-casualty
     mult than shallow (`d=0`), both **within** the new clamp; defender symmetric.
   - (c) clamp proof: even `confidence=0, d=1` never exceeds 1.18 attacker / never below
     0.90 defender.
   - (d) determinism: identical inputs → identical outputs across repeated calls.
   - (e) hidden-truth: `buildPublicIntelFrictionAnnotation` output unchanged (still only
     `ambush_risk` band, no strength leak).
6. **Baseline byte-identity:** run `tools/scenario_runner/run_baseline_regression.ts`
   with the depth sub-flag OFF → "all scenarios match" (the umbrella stays ON, depth
   neutral, so flag-off path is byte-identical).

## 5. Determinism, canon, and stop gates (carried forward)

- No `Math.random` / `Date.now` / `new Date` / timestamps anywhere in the depth math.
- Depth factor is a pure function of existing state (contact graph + faction recon
  profile); sorted iteration via `strictCompare` if enumerating.
- **No hidden enemy truth** reaches the UI: depth is attacker-side observed; only the
  existing `ambush_risk` public label is emitted.
- Bounded by construction: hard clamps at 1.18 / 0.90 keep this friction, not a swing.
- Default OFF ⇒ byte-identical baseline ⇒ zero calibration movement until enabled.
- STOP if any future variant requires randomness, exposes enemy truth, or removes the
  clamp.

---

## 6. Collision audit (this round)

| Off-limits Codex-hot file | Needed by depth slice? |
| --- | --- |
| `attack_resolution_osid.ts` | **YES** — both depth derivation (`getAttackIntelConfidence`) and consumption (casualty fold @907–997) live here. **BLOCKER.** |
| `standing_og_defense.ts` | No |
| `brigade_assignment.ts` | No |
| `combat_predictor*` / `checkLaunchFeasibility` | No |
| `validateGameState.ts` | No (no new persisted field proposed) |
| calibration manifest / snapshot | No (flag-off byte-identical) |
| `oob_*.json` | No |

Single blocker: `attack_resolution_osid.ts`. Because it is the *only* site that can both
compute and consume the depth factor, and it is the active ADR-0007 casualty-base file,
the lane correctly stops at this packet.
