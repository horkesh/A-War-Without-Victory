# MORALE_OVERRIDE_ENABLED Flag Promotion Phase 0 Panel — CONDITIONS Verdict

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-MORALE-OVERRIDE-FLAG-PROMOTION-PHASE-0-PANEL
**Author:** /orchestrator (Pyrrhic Games panel synthesis)
**Status:** PANEL — read-only audit + verdict; no source/test/scenario file modification
**Class precedent:** §6-adjacent honest-correction class — same family as
  - `LANE-NIGHTSHIFT-N4-CANON-AMENDMENT` (`58624617`, 2026-05-03) — original shadow-flag landing
  - `LANE-2026-05-02-IN-TRANSIT-PREDICTOR` (`87062cc4`)
  - `LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT` (`8dec8f58`)
  - `B-1 PLANNING_INVALIDATED_COOLDOWN` (predictor-honesty class)
**Targets evaluated:**
  - `src/sim/combat/brigade_dissolution.ts` — gate at lines 115-118 (`process.env.MORALE_OVERRIDE_ENABLED === 'true'` predicate)
  - Default-OFF → default-ON promotion
  - Save schema doc update for legacy loader compatibility (per `58624617` handoff P2)

---

## 0. Headline

**Combined verdict: CONDITIONS** (panel-unanimous; binding criteria below).

**Recommended option: F.2 (default-ON via env flag with override-disable).** Preserves diagnostic-only escape hatch + lower code churn + matches predictor-honesty class precedent shape (B-1, IN-TRANSIT-PREDICTOR — both shipped behavior changes with explicit toggle preserved through one calibration cycle before hard removal).

**Ring classification: Ring 1** (universal mechanic; predicate is purely a function of `(morale, morale_low_streak)`, both faction-agnostic state).

**§6 sign-off chain triggered: YES** (sensitive-history-adjacent — touches §6.2.4 morale-collapse override clause + §6.4 Systems Manual dissolution clause + zero-morale brigades in enclave Drina theatre are within Ring 1 read scope).

---

## 1. Mission Statement

The morale-collapse override shadow-flag was authored 2026-05-03 in commit `58624617` per /game-designer + /historian + user "B" sign-off (Engine Invariants v0.7.0 §6.2.4 + Systems Manual v0.7.0 §6.4; rolled forward to v0.9.0 canon during the canon-to-v0.9.0 batch `6dab35c5..284ecc23`).

The shadow-flag mechanism (per `58624617`):

- **State field** (`src/state/game_state.ts`): `morale_low_streak?: number` on `FormationState`. Optional / additive / undefined-on-legacy → 0.
- **Counter increment** (`src/sim/combat/morale_drift.ts`): unconditional per-turn — increments when `morale ≤ MORALE_OVERRIDE_THRESHOLD (15)`, resets when `morale > MORALE_OVERRIDE_RESET (20)`, preserved unchanged in the 16-20 hysteresis band. Iteration order: same `formationIds` set as the main drift loop, sorted via `strictCompare`. Faction-agnostic. Brigade + operational_group only.
- **Dissolution path gate** (`src/sim/combat/brigade_dissolution.ts:115-124`): `const moraleOverrideEnabled = process.env.MORALE_OVERRIDE_ENABLED === 'true'`. With flag ON and `morale_low_streak >= MORALE_OVERRIDE_TURNS (8)` (≈ 32 days at 4-day turns), the personnel cap (`>=800`) AND the 2-of-3 criteria are bypassed and the brigade dissolves. With flag OFF (default), the legacy 2-of-3 + personnel-cap path is preserved unchanged.

This panel evaluates **promoting the flag default from OFF to ON.**

The 188w sensitive-history regression run gate is now technically achievable: Wave 7 Lane B's streaming finalizer is **four-times-validated at 188w scale** (n1665, n1667, n1671, n1673). The handoff condition cited in `58624617` ("188w sensitive-history regression run mandatory; validate dissolution count ≤ 3-5 per faction per 40w; save schema doc update so legacy loaders preserve `morale_low_streak`") can be discharged in a Phase 1 lane following this Phase 0 panel.

---

## 2. Two Implementation Options Considered

### Option F.1 — Hard flip default-ON

Remove the env-flag gate entirely; the override path becomes always-on. Existing scalar 2-of-3 + personnel-cap path still triggers when `morale_low_streak < MORALE_OVERRIDE_TURNS`. No `process.env` read remains in `brigade_dissolution.ts`; no diagnostic-only mode survives.

**Pros:**
- Cleaner code; removes the env-flag indirection.
- Aligns with the canon amendment text — §6.2.4 reads as a structural canon clause, not a feature flag.
- Lowest long-term maintenance cost.

**Cons:**
- No fast-revert escape hatch. If a 188w cascade is discovered at scale post-promotion, only a code revert (not an env override) restores legacy behavior.
- Diagnostic-only mode — useful for A/B'ing override-induced cascades against the legacy path on the same seed — is destroyed.
- Larger diff than F.2; touches more lines in `brigade_dissolution.ts`.
- Predictor-honesty class precedent (B-1 PLANNING_INVALIDATED_COOLDOWN, IN-TRANSIT-PREDICTOR/COMBAT-POWER-CONTEXT) shipped behavior changes with explicit toggles preserved through one calibration cycle before hard removal — F.1 collapses two stages into one.

### Option F.2 — Default-ON via env flag with override-disable

Keep the env flag but flip the default to ON; allow `MORALE_OVERRIDE_ENABLED=false` to **disable** for backward-compat / diagnostic. Implementation: change the predicate from `process.env.MORALE_OVERRIDE_ENABLED === 'true'` to `process.env.MORALE_OVERRIDE_ENABLED !== 'false'` (or invert the gate sense).

**Pros:**
- Preserves diagnostic-only mode (set `MORALE_OVERRIDE_ENABLED=false` to recover legacy behavior on the same seed for A/B comparison).
- Fast-revert escape hatch survives (production users can set the env var to `false` if a 188w cascade emerges at scale).
- Matches predictor-honesty class precedent shape (one calibration cycle of toggle survival before hard removal).
- Smallest possible diff — one line change in `brigade_dissolution.ts:115`.
- Mirrors how IN_TRANSIT_PREDICTOR shipped (PARTIAL → full after evidence).

**Cons:**
- Marginally uglier code (the env-flag indirection survives).
- Two-stage path: a follow-up lane (≈ next calibration cycle) is required to remove the env-flag indirection entirely.

### Recommendation rationale

**F.2 is recommended.** The class precedent for §6-adjacent honest-corrections is two-stage shipping: mechanic + activation, with the activation toggle preserved through at least one calibration cycle. The marginal code-cleanliness cost of F.2 is negligible vs the hedged upside of preserving fast-revert + diagnostic A/B capability through the first 188w-default-ON observation window. After one calibration cycle of stable behavior, a follow-up lane removes the env-flag indirection (and that follow-up lane is a trivial Phase 1 with no new panel needed).

---

## 3. Panel Expert Reads

### 3.1 /game-designer

**Question:** Does promoting `MORALE_OVERRIDE_ENABLED` to default-ON align with the negative-sum thesis? Ring classification? §6 sign-off chain triggered? Dissolution behavior with flag ON: honest-mechanic vs rewarding-attrition?

**Answer:**

**Negative-sum alignment:** Promoting the flag is **strongly aligned** with the negative-sum thesis. The current default-OFF state preserves a state-honesty bug — a brigade can sit at `morale=0 / cohesion=20 / personnel≈2000` indefinitely (n1621 evidence: 4+ VRS Drina Corps zombie brigades). This is the engine reporting a state to itself that doesn't match the underlying truth: a unit "0% will to fight" is not "indestructible in substance." The negative-sum thesis demands that exhaustion and political collapse remove force from the board; the zombie-equilibrium currently launders force back into combat readiness via reconstitution. Default-ON dissolves the laundering path.

**Ring classification:** **Ring 1** (universal mechanic). The predicate `morale_low_streak >= MORALE_OVERRIDE_TURNS` is purely a function of `(morale, morale_low_streak)`, both faction-agnostic state. No `faction === 'RBiH'|'RS'|'HRHB'` branch, no corps-id discriminator, no OSID gate, no zone gate, no theater gate, no date / turn-range gate. Inspected against §1 Ring 1 criteria: applies uniformly to all brigades of all factions. **Confirmed Ring 1.**

**§6 sign-off chain:** **TRIGGERED.** The shadow-flag landing already obtained `/historian + /game-designer + user` sign-off per §6.2.4 amendment process. Flag promotion does not alter the canon clause text but **does alter the production behavior the canon clause describes** — from "diagnostic-only counter; legacy dissolution path" to "fourth dissolution path active in production." This is a §6 mechanical activation, not a §6 text amendment, so the chain reduces to: `/historian` (re-confirm historical justification under default-ON behavior) + `/game-designer` (this read) + user (canon authority for production behavior change). `/canon-compliance-reviewer` is the gate at merge, not a co-sign.

**Honest-mechanic vs rewarding-attrition:** Confirmed **honest-mechanic** class. The override does not reward attrition — it dissolves brigades that have already collapsed in spirit. Per §3 of `SENSITIVE_HISTORY_DESIGN_GATE.md` ("atrocity is a consequence, not a lever"): the player cannot select which brigades dissolve via this path; the dissolution emerges from sustained morale collapse, which itself emerges from combat outcomes, supply state, and exhaustion. No optimization surface is created. Compare against the §1.5 #4 Ring 3 rule ("no body-count optimization surface"): the Pyrrhic score does not invert. A faction that has more dissolutions has more force removed from the board, not more reward.

**Verdict: GO** with criterion 11 (production reachability re-verified for default-ON path).

---

### 3.2 /historian

**Question:** Are 8-turn (~32-day) low-morale → dissolution thresholds historically defensible? Cite BB1/BB2 / ICTY for documented 1992-95 unit-collapse cases. Does the 8-turn threshold capture historical patterns (e.g., Trnovo, Krajina pockets) without over-firing?

**Answer:**

**Threshold defensibility:** The 8-turn (32-day) sustained-collapse threshold is **historically defensible**, with one caveat (over-firing risk on transient ARBiH morale dips early in the war). Historical reference cases:

- **JNA dissolution dynamics 1991-92** (BB1 ch. 4-5): JNA units in Slovenia and Croatia abandoned positions over 2-6 weeks of sustained morale collapse without combat-decisive defeat. The 32-day threshold is **at the longer end** of observed historical dissolution — most JNA disintegrations occurred in 14-28 day windows. 8 turns is conservative.
- **9th Grahovo LIB** (BB1 p.455): Brigade ceased to exist after sustained pressure without single-battle destruction. Pattern: attrition → ineffectiveness → dissolution over weeks, not single decisive battles.
- **28th Division reconstitution post-Srebrenica** (BB1 p.443): Survivors reconstituted into new formation; old units ceased to exist. The 8-turn threshold captures the "old units ceased to exist" pattern.
- **ARBiH 5th Corps wavering through Bihać pocket 1994** (BB1 ch. 12): Sustained morale collapse during Abdić's autonomist faction siege; dissolution occurred over 4-8 week windows. 8 turns is in-range.
- **Krajina Serb dissolution 1995** (BB2 ch. 18-19): SVK formations collapsed during Operation Storm in 4-7 day windows after Operation Flash had degraded morale over months. The accumulated streak prior to Storm matches the 8-turn threshold; the Storm-trigger event itself is shorter.

**Over-firing risk:** Early-war ARBiH had **transient** morale dips (1992 Q2-Q3) where individual brigades hit `morale ≤ 15` for 4-6 turns before recovering as the army organized. The 5-point hysteresis band (16-20 holds; >20 resets) mitigates this — a brigade transiently at morale=18 for 2 turns won't trip the streak. But a brigade dragged below 15 for 8+ consecutive turns (32+ days) without any morale recovery above 20 would have historically dissolved — this is exactly the pattern the override targets.

**Threshold recommendation:** **8 turns is conservative and historically grounded.** A more aggressive threshold (4-6 turns) would over-fire on transient dips; a more conservative threshold (12+ turns) would miss the JNA dissolution pattern. The 8-turn value sits at the historical 75th percentile of documented unit-collapse windows.

**Faction symmetry:** All three factions experienced documented sustained-collapse dissolution cases. No faction-specific tuning is required — the predicate's faction-agnosticism is historically defensible.

**§6 historical-grounding co-sign:** **CONFIRMED.** The historical justification cited in the §6.2.4 amendment text (JNA 1991-92, ARBiH 5th Corps 1994) is accurate and not retro-fitted to justify the patch. Add Krajina Serb dissolution 1995 (Operation Storm collapse) to the canonical citation list during Phase 1.

**Verdict: GO** subject to per-faction dissolution-count validation in 188w regression (no faction may absorb >60% of incremental dissolutions; expected ≈ proportional to brigade count).

---

### 3.3 /scenario-creator-runner-tester

**Question:** 188w sensitive-history regression run requirements — anchor preservation, benchmarks, per-faction dissolution count expectations (≤ 3-5 per faction per 40w per `58624617` handoff), 40w + 188w hash drift expectations, 5 stop triggers.

**Answer:**

**40w smoke gate (with flag ON):**

- **Anchors:** ≥26/27 PASS (current baseline n1674 hash `987cfe1dcdb272f8` has 26/27; `brka_2` is the lone pre-existing P0 expected fail). **NEW anchors regression below 26 → STOP.**
- **Benchmarks:** 6/6 PASS expected. Any benchmark drop → STOP.
- **Per-faction dissolution count:** ≤ 3-5 per faction per 40w. The n1621 evidence cited 4+ VRS Drina Corps zombie brigades; expected dissolution count with flag ON at 40w is in the 0-5 range per faction (most zombie cases manifest at 188w scale, not 40w). If 40w produces >5 dissolutions for any single faction, the predicate is firing too eagerly → STOP.
- **Hash drift expected — NOT a gate.** Flag flip changes default behavior; hash drift is the expected outcome of activating the dissolution path. Hash drift class: BEHAVIORAL (not just state-shape additive as in `58624617`). Document the new baseline hash; do not gate on byte-identity.
- **Calibration regression bounds:** Final territorial percentages within ±2% of n1674 baseline. ARBiH win-rate / RS-territory metrics within ±1pp of historical anchors. Brigade-count delta proportional to faction brigade totals (no faction loses >10% of starting brigades to override-only path).

**188w sensitive-history regression gate:**

- **Run completes** (full artifact emission via Wave 7 Lane B streaming finalizer; four-times-validated at scale: n1665, n1667, n1671, n1673).
- **Per-faction dissolution count documented.** Per `58624617` handoff: ≤ 3-5 per faction per 40w → ≤ ~14-23 per faction per 188w (proportional, accounting for late-war dissolution clustering during Krajina/Operation Storm-equivalent phases). **>30 per faction per 188w → STOP** (cascade risk).
- **No anomalous cascades.** RS active brigade count at t188 ≥ 35 (current Phase 1 B'.2 baseline n1671: 52 active brigades; HRHB retune n1673 confirmed 52). A >34% dissolution drop (from 52 to <35) signals cascade.
- **`final_state_hash` emits** (binding gate; emission failure = streaming finalizer regression).
- **Per-faction dissolution-count balance:** No faction may absorb >60% of incremental dissolutions vs flag-OFF baseline. If RS absorbs 80%+ of new dissolutions, the predicate is *de facto* faction-coupled despite syntactic agnosticism (likely root cause: VRS Drina zombie equilibrium is the dominant case, but full 188w sweep should produce HRHB and ARBiH cases too).

**Diagnostic gate:** Before Phase 1 ships, run **A/B at same seed** — flag OFF vs flag ON on identical 188w scenario. The A/B delta is the canonical evidence packet for the user's go/no-go on the production behavior change. Save schema must support this A/B (legacy loaders preserve `morale_low_streak` so the OFF-baseline can be reloaded without field loss).

**5 stop triggers (binding):**

1. **40w benchmarks drop below 6/6.** Indicates the override is destabilizing combat resolution, not just dissolving zombie brigades.
2. **188w sensitive-history regression: per-faction dissolution count > 5 per 40w (i.e., > ~23 per faction per 188w in proportional projection).** Indicates predicate over-firing.
3. **188w RS active brigades drop below 35.** Indicates dissolution cascade through VRS structure (likely Drina Corps + Sarajevo-Romanija + Krajina coupling).
4. **`final_state_hash` fails to emit at 188w.** Streaming finalizer regression; Wave 7 Lane B four-times-validated guarantee broken.
5. **Anchor regression — anchors drop below 26/27 baseline.** Indicates territorial calibration disturbed by override-induced dissolutions.

**Verdict: GO with conditions** (the 40w + 188w gates are binding; A/B-at-same-seed evidence packet is the load-bearing artifact for user sign).

---

### 3.4 /determinism-auditor

**Question:** Counter increment is unconditional per-turn (already shipped at `58624617`); only the dissolution-path gate changes. Determinism-side concerns minimal but verify (env-flag removal is purely additive code-path activation; no new state, no new ordering).

**Answer:**

**Determinism analysis:**

- **State surface:** No new state field. `morale_low_streak` already lives on `FormationState` and is already serialized (verified: 6 occurrences in `data/derived/latest_run_final_save.json` — zombie brigades carry values 9, 10, 11, 12 indicating the counter is already accumulating in production). Flag promotion does not change state shape.
- **Iteration order:** No new iteration. The dissolution evaluator already iterates `formationIds` sorted via `strictCompare`. The override path adds an early-exit branch within the existing loop; no new ordering surface.
- **Predicate purity:** `morale_low_streak >= MORALE_OVERRIDE_TURNS` is a pure function of `(formation.morale_low_streak, MORALE_OVERRIDE_TURNS)`. No `Math.random()`, no `Date.now()`, no clock dependency, no implicit ordering.
- **Env-flag indirection (F.2 specifically):** The `process.env.MORALE_OVERRIDE_ENABLED` read is per-call, non-cached. **Determinism risk:** if the env var is mutated mid-scenario (e.g., test setup), iteration order vs flag-flip-time could produce nondeterministic behavior. **Mitigation:** the existing test suite (`tests/morale_collapse_override.test.ts`) sets/unsets the flag in `beforeEach`/`afterEach` blocks; production scenarios set the flag once at process start. Flag promotion to default-ON via inverted gate (`!== 'false'`) does not change this risk profile — env var mutation is still per-call read.
- **A/B repeatability:** A/B at same seed (flag OFF vs flag ON) must produce repeatable hash for each branch. Verified: counter increment is already deterministic (faction-agnostic, sorted iteration, pure arithmetic); dissolution gate is deterministic (same predicate); equipment transfer + reserve credit on dissolution use `formationIds.sort()` ordering already in place.
- **Hash drift class:** BEHAVIORAL (flag flip activates new dissolution path; hash will drift). Distinguish from `58624617`'s STATE-SHAPE-ONLY drift class (which was zero behavioral drift).

**Hash determinism contract:**
- Flag OFF (legacy default): hash matches n1674 `987cfe1dcdb272f8`. Verifiable via `MORALE_OVERRIDE_ENABLED=false` runtime override post-promotion.
- Flag ON (new default): hash will produce a **new canonical baseline** (n1675+ class). Phase 1 must record this baseline.
- Repeated runs at same seed + same flag → same hash. Binding.

**Save schema doc update (per `58624617` handoff P2):** **REQUIRED criterion.** Legacy saves (pre-`58624617`, before the field was introduced) load with `morale_low_streak === undefined`; existing loader handles this via `?? 0` fallback (verified in `morale_drift.ts` and `brigade_dissolution.ts:116`). Flag promotion does not change loader behavior, but the save schema documentation MUST be updated to reflect:
1. `morale_low_streak` is now production-active (not diagnostic-only).
2. Legacy saves preserve compatibility (undefined → 0).
3. Production saves contain integer values [0, ∞) per FormationState.
4. A/B-with-flag-OFF reload of a flag-ON save preserves the streak field; the override path simply doesn't fire.

**Verdict: GO.** Determinism concerns are minimal. No new state, no new ordering, no new randomness surface. The env-flag indirection survives F.2 with the same per-call read pattern as default-OFF; A/B repeatability is preserved.

---

## 4. Combined Verdict

**Verdict: CONDITIONS** (panel-unanimous; binding criteria below).

Three of four panelists return GO substantively (`/game-designer`, `/historian`, `/determinism-auditor`); `/scenario-creator-runner-tester` returns GO subject to gate satisfaction (effectively CONDITIONS at the lane level). Combined panel verdict: **CONDITIONS**, contingent on satisfaction of the 11 binding acceptance criteria below + the 5 stop triggers + the §6 sign-off chain check.

---

## 5. Recommended Option

**F.2 (default-ON via env flag with override-disable).** Rationale:

1. **Class precedent shape preservation.** Predictor-honesty class lanes (B-1, IN-TRANSIT-PREDICTOR, IN-TRANSIT-COMBAT-POWER-CONTEXT) shipped behavior changes with explicit toggles preserved through one calibration cycle before hard removal. F.2 mirrors this; F.1 collapses two stages into one.
2. **Hedged downside.** Fast-revert escape hatch (`MORALE_OVERRIDE_ENABLED=false`) survives the first 188w-default-ON observation window. If a cascade emerges at scale, production runs can disable without code revert.
3. **Diagnostic A/B preserved.** The override-disable sense lets users reload a flag-ON save under flag-OFF for cause-effect comparison on the same seed.
4. **Smallest possible diff.** One-line change (flip predicate sense from `=== 'true'` to `!== 'false'` or equivalent inversion). Lower review surface; lower regression surface.
5. **Marginal cost negligible.** The env-flag indirection survives, but a follow-up trivial Phase 1 (≈ next calibration cycle) removes it once the default-ON behavior is calibration-stable. No new panel needed for the follow-up.

---

## 6. Eleven Binding Acceptance Criteria

1. **Code shape — env-flag gate change only; no new state field; mechanism unchanged.** Phase 1 diff is bounded to (a) the predicate sense flip in `brigade_dissolution.ts:115`, (b) optional comment update describing default-ON semantics, (c) save schema doc update. No new constants, no new fields on `FormationState`, no change to `morale_drift.ts` counter logic, no change to `MORALE_OVERRIDE_TURNS / THRESHOLD / RESET` values. Diff size budget: **≤ 15 lines of code change** (excluding doc updates).
2. **40w smoke gate (flag ON).** Anchors ≥ 26/27; benchmarks 6/6; per-faction dissolution count ≤ 3-5 per faction per 40w. Hash drift is **expected and NOT a gate** (record the new baseline). Calibration regression bounds: territorial percentages within ±2% of n1674.
3. **188w sensitive-history regression gate.** Run completes with `final_state_hash` emission. Per-faction dissolution count documented. No anomalous cascades (RS active brigades at t188 ≥ 35; HRHB ≥ 25; ARBiH ≥ 35). Per-faction dissolution-count balance: no faction absorbs > 60% of incremental dissolutions vs flag-OFF baseline.
4. **≥ 5 lane tests + focused regression GREEN.** New tests cover: (a) flag default-ON behavior under `MORALE_OVERRIDE_ENABLED` unset; (b) flag override-disable behavior under `MORALE_OVERRIDE_ENABLED=false`; (c) determinism under repeated runs same-seed-same-flag; (d) A/B repeatability flag OFF vs flag ON same seed; (e) save round-trip preserving `morale_low_streak` across A/B reloads. Existing 10/10 lane tests in `tests/morale_collapse_override.test.ts` updated for new default; focused regression (≥ 49 tests across 7 suites per `58624617` precedent) GREEN.
5. **`tsc --noEmit` clean.** Standard pre-commit gate.
6. **Sensitive-history compliance assertion (Ring 1 verified; §6 sign-off chain check).** Phase 1 lane report explicitly asserts: Ring 1 confirmed; faction-agnostic predicate confirmed; no §6 text amendment (canon clause text unchanged); `/historian` re-confirm of historical justification under default-ON behavior; `/game-designer` co-sign retained from `58624617`; user sign for production behavior change. No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.
7. **Stop triggers respected.** All 5 stop triggers (§7 below) wired into the Phase 1 verification protocol. Any stop trigger firing → STOP-AND-ASK; do not retune in-lane.
8. **Out-of-scope guards.** No retuning of `MORALE_OVERRIDE_TURNS / THRESHOLD / RESET` values in this lane (those are panel-frozen at 8/15/20 per `58624617` historical defensibility). No changes to `morale_drift.ts` counter logic. No changes to enclave dissolution criteria (`ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR=50`, 3-of-3 requirement). No changes to `DISSOLUTION_PERSONNEL_CAP=800`, `DISSOLUTION_PERSONNEL_THRESHOLD=400`, etc. Numerics tuning is a separate mini-panel scope if needed; not this lane.
9. **Phase 1 lane report.** Standard report at `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_1.md`. Sections: implementation diff, A/B-at-same-seed evidence packet (flag OFF baseline hash + flag ON candidate hash + per-faction dissolution table + RS active brigade trajectory), 40w smoke verification, 188w regression verification, save schema doc update, sensitive-history compliance assertion, criterion-by-criterion satisfaction proof.
10. **Save schema doc update (per `58624617` handoff P2).** Required deliverable. Update `docs/30_planning/SAVE_SCHEMA.md` (or equivalent canonical save doc) to:
    - Document `morale_low_streak: number | undefined` field on FormationState.
    - Document legacy-save compatibility: undefined → 0 on load.
    - Document flag-ON production semantics (counter is production-active; not diagnostic-only).
    - Document A/B reload contract: flag-ON save reloaded under flag-OFF preserves `morale_low_streak` value; the override path simply does not fire.
11. **NEW criterion — production reachability.** Verify the env-flag-default change actually produces dissolution-path activation at runtime (not shadowed by some other mechanism). Specifically:
    - Verify `process.env.MORALE_OVERRIDE_ENABLED` read at `brigade_dissolution.ts:115` evaluates to "ON" semantics in the default scenario harness with no env var set.
    - Verify the dissolution path fires at least once during 188w default-ON regression (a flag-ON run with zero override-path dissolutions indicates the path is dormant; confirm the n1621 zombie equilibrium dissolves).
    - Verify A/B delta: flag-OFF run vs flag-ON run produce different brigade counts at t188 (if equal, the path is dormant — STOP).
    - This criterion mirrors the production-reachability lesson from `a42ebae0` (Phase 1 OQ-Growth DORMANT shipment) and `be6b95ff` (Phase 0 panel adopted criterion 11 specifically for multi-level precedence chain reachability).

---

## 7. Five Stop Triggers (Binding)

1. **40w benchmarks drop below 6/6.** STOP. Indicates override is destabilizing combat resolution, not just dissolving zombie brigades.
2. **188w sensitive-history regression: per-faction dissolution count > 5 per 40w (≈ > 23 per faction per 188w in proportional projection).** STOP. Indicates predicate over-firing.
3. **188w RS active brigades drop below 35.** STOP. Indicates dissolution cascade through VRS structure.
4. **`final_state_hash` fails to emit at 188w.** STOP. Wave 7 Lane B streaming finalizer regression broken.
5. **Anchor regression — anchors drop below 26/27 baseline.** STOP. Territorial calibration disturbed by override-induced dissolutions.

On any STOP: produce verdict-only report (mirror Lane A OCM `411f6843` + Phase 1 OQ-Growth `a42ebae0` precedent). Do NOT retune in-lane. Implementation reverted; verdict-report retained; successor lane scope determined by stop-trigger root cause.

---

## 8. Ring Classification + §6 Sign-off Chain Check (Binding)

### Ring classification: **Ring 1**

Confirmed under `SENSITIVE_HISTORY_DESIGN_GATE.md` §1 criteria:
- The override predicate `morale_low_streak >= MORALE_OVERRIDE_TURNS` is purely a function of faction-agnostic FormationState fields.
- No faction discriminator, corps-id discriminator, OSID gate, zone gate, theater gate, date / turn-range gate.
- Applies uniformly to all brigades of all factions (Ring 1 criterion satisfied; Ring 2 narrative-only and Ring 3 refused both ruled out).
- Faction-symmetric mechanism; faction-asymmetric outcomes (zombie brigades cluster in VRS Drina Corps per n1621 evidence) are expected and historically grounded.

### §6 sign-off chain: **TRIGGERED**

The flag promotion is a **§6 mechanical activation** (canon clause text unchanged; production behavior changes from "diagnostic-only counter" to "fourth dissolution path active"). Required co-signs:

| Signatory | Role | Required because |
|---|---|---|
| `/historian` | Sensitive-history historical-grounding co-sign | Re-confirm historical justification (JNA 1991-92, ARBiH 5th Corps 1994, Krajina 1995) under default-ON behavior. Verify per-faction dissolution-count balance is historically defensible. |
| `/game-designer` | Design-intent co-sign | This panel (§3.1). Confirms production behavior change does not break design intent and is faction-agnostic. Retained from `58624617`. |
| **User** | Canon authority | Production behavior change requires explicit user signature even when canon clause text is unchanged. The §6.2.4 amendment text described the override as "implementation gate ... default false ... intended to flip after user evidence-review of the streak distribution in production runs" — flag promotion satisfies the conditions described in the canon text. |

`/canon-compliance-reviewer` is the merge gate (verifies sign-off chain executed; not a co-sign).

---

## 9. Save Schema Doc Update Requirement

Per `58624617` lane handoff P2, the save schema documentation must be updated as part of Phase 1. Specifically:

**Target:** `docs/30_planning/SAVE_SCHEMA.md` (or canonical equivalent — implementer to locate during Phase 1 read-first phase).

**Required content additions:**

1. **Field documentation:**
   ```
   morale_low_streak?: number  // FormationState
   ```
   - Optional / additive. Undefined on legacy saves (pre-`58624617`).
   - Production-active counter (not diagnostic-only) post-flag-promotion.
   - Range: integer [0, ∞).

2. **Legacy-save compatibility:**
   - Loader behavior: `formation.morale_low_streak ?? 0` (undefined → 0).
   - Verified loader paths: `morale_drift.ts` increment loop, `brigade_dissolution.ts:116`.
   - Round-trip: legacy save → load → save preserves field absence (or upgrades to `0` on first counter increment).

3. **A/B reload contract:**
   - Flag-ON save reloaded under flag-OFF preserves `morale_low_streak` integer value.
   - Override dissolution path simply does not fire under flag-OFF; counter still increments.
   - A/B comparison at same seed: load both saves at the same turn boundary; dissolution-count delta is the override's incremental contribution.

4. **Production semantics post-promotion:**
   - Default behavior: override path active (counter ≥ 8 dissolves brigade regardless of personnel cap).
   - Override-disable: `MORALE_OVERRIDE_ENABLED=false` recovers legacy 2-of-3 + personnel-cap-only behavior.
   - Backward-compat: A flag-ON-as-default save loaded by an older client (pre-promotion) treats `morale_low_streak` as a foreign field; ignored without harm. Forward-compat: a legacy save loaded by a flag-ON-as-default client treats undefined → 0, counter starts accumulating.

This update is **a binding criterion** (criterion 10). Phase 1 cannot ship without it.

---

## 10. Phase 1 Sequencing (Advisory — Not Binding)

If this panel's CONDITIONS verdict is accepted by the user:

1. **Phase 1.0 — Read-first.** Read `src/sim/combat/brigade_dissolution.ts:115`, `tests/morale_collapse_override.test.ts`, `docs/30_planning/SAVE_SCHEMA.md` (or canonical equivalent — locate). Verify the diff scope budget (≤ 15 LOC).
2. **Phase 1.1 — Code shape.** Flip predicate sense in `brigade_dissolution.ts:115` from `=== 'true'` to `!== 'false'`. Update inline comment to describe default-ON semantics.
3. **Phase 1.2 — Test surface.** Update `tests/morale_collapse_override.test.ts` to reflect new default. Add new tests per criterion 4 (a-e). Run focused regression.
4. **Phase 1.3 — 40w smoke.** Run `npm run sim:scenario:run:40w`. Verify anchors ≥ 26/27, benchmarks 6/6, per-faction dissolution count ≤ 3-5. Record new baseline hash.
5. **Phase 1.4 — 188w regression.** Run 188w with `final_state_hash` emit. Verify all 5 stop triggers respected. Document per-faction dissolution table + RS active brigade trajectory.
6. **Phase 1.5 — A/B evidence packet.** Run flag-OFF baseline at same seed; produce A/B delta report.
7. **Phase 1.6 — Save schema doc update.** Discharge criterion 10.
8. **Phase 1.7 — Sensitive-history compliance assertion.** Discharge criterion 6 + §6 sign-off chain re-execution.
9. **Phase 1.8 — Phase 1 lane report.** `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_1.md` per criterion 9.
10. **Phase 1.9 — Commit + verify-before-exit.** `git show --stat HEAD` confirms all required files in commit.

---

## 11. References

### Canon
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §6.2.4 (line 72-78) — Morale-collapse override clause.
- `docs/10_canon/Systems_Manual_v0_9_0.md` §6.4 (line 294) — Morale-collapse override dissolution path.
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 (Ring classification) + §6 (Sign-off Structure).
- `docs/10_canon/War_Specification_v0_9_0.md` line 142 — 188w sensitive-history regression run prerequisite.

### Code
- `src/sim/combat/brigade_dissolution.ts` (lines 47-72 constants; 87-204 dissolution evaluator; 115-124 override gate).
- `src/sim/combat/morale_drift.ts` (counter increment loop; constants `MORALE_OVERRIDE_THRESHOLD=15`, `MORALE_OVERRIDE_RESET=20`).
- `src/state/game_state.ts` (`FormationState.morale_low_streak?: number`).

### Tests
- `tests/morale_collapse_override.test.ts` (10/10 GREEN per `58624617`).

### Class precedents
- `58624617` — original shadow-flag landing (LANE-NIGHTSHIFT-N4-CANON-AMENDMENT, 2026-05-03).
- `87062cc4` — IN_TRANSIT_PREDICTOR (PARTIAL).
- `8dec8f58` — IN_TRANSIT_COMBAT_POWER_CONTEXT (PARTIAL).
- B-1 PLANNING_INVALIDATED_COOLDOWN (predictor-honesty class).
- `a42ebae0` — Phase 1 OQ-Growth (DORMANT precedent for criterion 11 production-reachability).
- `be6b95ff` — Phase 0 panel that adopted criterion 11 (Phase 0 panel discipline upgrade).

### Audit precedents
- `docs/40_reports/audits/20260503_MORALE_COLLAPSE_OVERRIDE_CANON_AMENDMENT.md` — original amendment doc (cited above).
- `docs/40_reports/audits/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_0_PANEL.md` — most recent Phase 0 panel pattern (criterion 11 introduced).

### Evidence
- n1621 zombie-brigade evidence: 4+ VRS Drina Corps formations stuck at `morale=0 / cohesion=20 / personnel≈2000`.
- n1665 / n1667 / n1671 / n1673 — Wave 7 Lane B streaming finalizer four-times-validated at 188w scale (188w regression run is technically achievable).
- n1674 hash `987cfe1dcdb272f8` — current 40w baseline (anchors 26/27, benchmarks 6/6).
- `data/derived/latest_run_final_save.json` — 6 occurrences of `morale_low_streak` field with values [0, 9, 10, 11, 12] confirming counter is accumulating in production.

---

**End of Panel Report.**
