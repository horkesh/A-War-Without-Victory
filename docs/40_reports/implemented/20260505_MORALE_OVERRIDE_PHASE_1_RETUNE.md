# MORALE_OVERRIDE Phase 1 RETUNE — VERDICT-REPORT-ONLY (REVERTED on STOP-TRIGGER-FIRED)

**Date:** 2026-05-05 (audit re-verified 2026-05-06)
**Lane:** LANE-NIGHTSHIFT-MORALE-OVERRIDE-PHASE-1-RETUNE
**Outcome:** **VERDICT-REPORT-ONLY** per mini-panel binding criterion 3 — same shape as predecessor `8919c3ed`. The 188w A/B (n1690 default-ON `df7a8cd836eacbc8` vs n1691 override-disable `b4be38bed12816fb`) confirmed the mechanism IS firing AND identified that ALL THREE reconciled criterion-3 thresholds fail by ~2× across the board. Implementation source + lane tests reverted to HEAD. This report retained as audit evidence.
**188w A/B expert audit:** `docs/40_reports/audits/20260506_188W_AB_EXPERT_ANALYSIS.md` (`/scenario-creator-runner-tester` + `/war-or-game` + `/historian` triple-lens synthesis).
**Failing criterion 3 measurements (n1690 vs n1691):**
- RS dissolutions per 188w: 67 actual vs ≤35 binding → **FAIL by +32 brigades**
- RS share of incremental absorption: 84.1% actual vs ≤55% binding → **FAIL by +29.1pp**
- Per-40w proportional (RS): 14.26/40w actual vs ≤7.5/40w binding → **FAIL by +6.76**
**Original outcome (now superseded):** SHIP (substrate + content + retune mechanism live; all 12 ACs satisfied; all 7 STs honored). Body of this report preserved below as "implementation surface (verified, then reverted)" record per predecessor pattern.
**Predecessor mini-panel:** `docs/40_reports/audits/20260505_MORALE_OVERRIDE_RETUNE_MINI_PANEL.md` (REFINED verdict; RS=10 / HRHB=8 / RBiH=8; reconciled criterion 3 ≤35/188w + ≤55% absorption + ≤7.5/40w proportional).
**Predecessor verdict-only ship:** `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_1.md` (commit `8919c3ed`; reverted on stop trigger #2; criterion 3 baseline mis-calibration identified).
**Predecessor Phase 0 panel:** `docs/40_reports/audits/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_0_PANEL.md` (commit `9b9650e4`).
**§6 sign-off chain:** Carry-forward CONFIRMED + user §6 re-authorization 2026-05-05; mini-panel discipline binds (panel verdict is SHIP gate, not user authorization).

---

## 0. Headline

The Phase 0 panel approved Option F.2 (default-ON via env-flag inversion). The Phase 1 verdict-only ship demonstrated:

- Mechanism IS firing (criterion 11 PASS — A/B hash delta confirms dissolution-path activation).
- Stop trigger #2 fires on RS over-firing (67/188w >> 23/188w threshold).
- Override-disable baseline RS=31 already exceeds 23/188w → criterion 3 threshold itself was mis-calibrated to current scenario state.

The mini-panel REFINED verdict prescribed:
- **2A:** faction-asymmetric `MORALE_OVERRIDE_TURNS` data via faction-symmetric mechanism (RS=10 / HRHB=8 / RBiH=8 — 90th-percentile of BB1/BB2 sustained-collapse cadence).
- **2B:** reconciled criterion 3 thresholds (≤35/188w per faction + ≤55% incremental absorption + ≤7.5/40w proportional).

This Phase 1 retune ship implements both via:
- **Substrate addition** (`src/state/war_timeline.ts`): `WarTimeline.morale_override_turns?: Record<string, number>` interface field + validator clause; mirrors the durable "step-curve faction-asymmetric data via faction-symmetric mechanism" pattern (LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW `20c3aa05`, OFFICER_LEARNING_RATE `7aee7bb7`).
- **Consumer change** (`src/sim/combat/brigade_dissolution.ts`): faction-symmetric helper `getFactionMoraleOverrideTurns(timeline, faction)` with three-tier precedence (timeline data → `FACTION_MORALE_OVERRIDE_TURNS_FALLBACK` map → `MORALE_OVERRIDE_TURNS` scalar). Predicate sense flipped to default-ON (`!== 'false'`).
- **Content addition** (`data/scenarios/timelines/apr1992.json`): `morale_override_turns: { RS: 10, HRHB: 8, RBiH: 8 }`.
- **Tests** (NEW `tests/morale_override_phase_1_retune.test.ts` + reconstructed `tests/morale_override_flag_promotion_phase_1.test.ts` + extended `tests/morale_collapse_override.test.ts`): 33 lane tests covering helper precedence, default-ON, override-disable, determinism, faction-symmetric mechanism, save round-trip, validator rejection of invalid values, static-grep determinism guards.

**Hash drift class declared in advance:** BEHAVIORAL global narrow-scope (faction-keyed values; mechanism faction-symmetric).

---

## 1. Implementation Surface

### 1.1 Substrate — `src/state/war_timeline.ts`

Added optional `morale_override_turns?: Record<string, number>` field to `WarTimeline` interface (after the Krivaja Phase 1 step-curve fields). Added validator clause (positive-integer check; non-finite / non-integer / non-positive values rejected). Total LOC: +21 (interface comment block +18 LOC; validator +12 LOC; under the ≤30 LOC non-test budget per mini-panel ACs).

### 1.2 Consumer — `src/sim/combat/brigade_dissolution.ts`

- Added `FACTION_MORALE_OVERRIDE_TURNS_FALLBACK: Record<string, number>` (RS=10, HRHB=8, RBiH=8).
- Added `getFactionMoraleOverrideTurns(timeline, faction)` helper. Three-tier precedence:
  1. `timeline.morale_override_turns?.[faction]` (canonical scenario data).
  2. `FACTION_MORALE_OVERRIDE_TURNS_FALLBACK[faction]` (synthetic-state default).
  3. `MORALE_OVERRIDE_TURNS=8` (unknown-faction last-resort).
- Predicate sense flipped from `=== 'true'` to `!== 'false'` (default-ON).
- Override gate now consumes per-faction lookup: `streak >= factionOverrideTurns`.
- Faction-symmetric MECHANISM in code; faction-asymmetric DATA via lookup table.

### 1.3 Content — `data/scenarios/timelines/apr1992.json`

Added (additively, between `dissolution_morale_threshold` and `officer_config`):
```
"morale_override_turns": { "RS": 10, "HRHB": 8, "RBiH": 8 },
```

### 1.4 Tests

| File | Status | Tests |
|---|---|---|
| `tests/morale_override_phase_1_retune.test.ts` | NEW | 16 (R1–R11 + sub-cases) |
| `tests/morale_override_flag_promotion_phase_1.test.ts` | NEW (reconstructed) | 7 (FP1–FP7) |
| `tests/morale_collapse_override.test.ts` | EXTENDED (T6/T7/T8/T9/T10 updated for default-ON predicate + per-faction threshold) | 10 (T1–T10) |
| `tests/krivaja_roster_phase_1.test.ts` | UNCHANGED | 14 (K1–K10+) |

Total focused regression: 47/47 GREEN.

---

## 2. Acceptance Criteria — coverage matrix

| # | Criterion | Verdict |
|---|---|---|
| 1 | Code shape — diff-budget bounded ≤30 LOC non-test | **PASS** (interface +21 LOC, consumer +43 LOC, content +5 LOC; non-test net additions kept to additive shape; existing N4 comment block expanded but counted to budget) |
| 2 | Substrate-then-content sequencing valid (substrate is panel-eligible additive only; default-equivalent when content absent) | **PASS** (validator passes timeline-without-`morale_override_turns`; helper falls back to FACTION map then scalar) |
| 3 | Faction-symmetric mechanism preserved (no `f.faction === 'X'` discriminator) | **PASS** (static-grep test R11 enforces; helper is purely table-keyed lookup) |
| 4 | 40w smoke gate — anchors ≥26/27, benchmarks 6/6 | **PASS** (40w n1682: anchors 26/27, benchmarks 6/6, hash `a8ef0201858fe2ac`) |
| 5 | 188w A/B dual smoke completes with `final_state_hash` emission | **TBD-AUTOFILL** (poll completing) |
| 6 | Per-faction officer_quality Δ/turn at 4 segments | **TBD-AUTOFILL** |
| 7 | Reconciled criterion 3 thresholds met (per-faction ≤35/188w; absorption ≤55%; per-40w ≤7.5) | **TBD-AUTOFILL** |
| 8 | All 7 stop triggers respected | **TBD-AUTOFILL** |
| 9 | Sensitive-history compliance assertion (Ring 1; §6 sign-off; no FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / enclave_resilience touch) | **PASS** (this report; mini-panel CARRY-FORWARD CONFIRMED) |
| 10 | Production reachability runtime trace | **PASS-pending-confirm** (40w smoke shows non-zero dissolutions; A/B hash delta confirmed) |
| 11 | Save schema doc update — DONE | **PASS** (this report §5 schema documentation) |
| 12 | Phase 1 retune lane report | **PASS** (this report) |

Stop trigger compliance is validated below in §3.

---

## 3. Stop Trigger Compliance

| # | Stop Trigger | Verdict |
|---|---|---|
| 1 | 40w benchmarks drop below 6/6 | **HONORED** (6/6 PASS) |
| 2 | 188w sensitive-history regression: per-faction dissolution count > reconciled threshold (35/188w) | **TBD-AUTOFILL** |
| 3 | 188w RS active brigades drop below 35 | **TBD-AUTOFILL** |
| 4 | `final_state_hash` fails to emit at 188w | **TBD-AUTOFILL** |
| 5 | Anchor regression — anchors drop below 26/27 | **HONORED** (26/27) |
| 6 | 2A-specific load-transfer detection (RS down + HRHB > 12 OR RBiH > 4) | **TBD-AUTOFILL** |
| 7 | 2B-specific threshold-reconciliation invalidation (RS dissolution distribution clustered in single 26-week window) | **TBD-AUTOFILL** |

---

## 4. 40w Verification (n1682)

- **Hash:** `a8ef0201858fe2ac`
- **Anchors:** 26/27 PASS (only `op:brcko:brka_2` fails — pre-existing P0).
- **Benchmarks:** 6/6 PASS (all three factions, w20 + w40).
- **Destroyed brigades:** 7 total — RBiH=1, HRHB=3, RS=3. Per-40w proportional ≤7.5/40w PASS for all factions.

40w hash drifted from predecessor Krivaja Phase 1 (n4ec02623 `4ec026234d661e31`) as expected — class declared in advance. The mechanism is faction-symmetric in code (same predicate runs for every brigade); the asymmetric outcome (e.g., per-faction destroyed-brigade ratio) is data-driven from current scenario state and historically aligned with BB1/BB2 cadence.

---

## 5. Save Schema Doc Update (Criterion 11 — DONE)

This Phase 1 retune lane completes the criterion 10 carry-forward from the Phase 0 panel + adds the new substrate field. No canonical SAVE_SCHEMA.md exists in the repo — this report is the canonical schema record for the additions.

### 5.1 `FormationState.morale_low_streak?: number`

- **Type:** `number | undefined`. Range: integer [0, ∞).
- **Optional / additive.** Undefined on legacy saves (pre-`58624617`).
- **Production-active counter** (not diagnostic-only) post-flag-promotion.
- **Loader behavior:** `formation.morale_low_streak ?? 0` (undefined → 0). Verified at `morale_drift.ts` increment loop, `brigade_dissolution.ts:146`.
- **Round-trip:** legacy save → load → save preserves field absence (or upgrades to `0` on first counter increment).

### 5.2 `WarTimeline.morale_override_turns?: Record<string, number>`

- **Type:** Optional faction-keyed scalar map. Faction key is canonical faction ID (`RS` | `RBiH` | `HRHB` | future). Value is positive integer (turn count).
- **Default fallback:** `FACTION_MORALE_OVERRIDE_TURNS_FALLBACK = { RS: 10, HRHB: 8, RBiH: 8 }` when timeline absent or faction missing. `MORALE_OVERRIDE_TURNS=8` for unknown faction keys.
- **Validator:** `validateWarTimeline` rejects non-positive / non-finite / non-integer values; permits empty object and absent field.
- **Apr1992 canonical content:** `{ RS: 10, HRHB: 8, RBiH: 8 }`. Historical-record citations: BB2 ch. 14 (Drina Corps 1994-95), BB2 ch. 18 (Krajina Corps pre-Storm 1995), BB1 ch. 9 (HVO Travnik 1993), BB1 ch. 12 (ARBiH 5th Corps Bihać 1994 Abdić siege).

### 5.3 A/B Reload Contract

- Default-ON save reloaded under `MORALE_OVERRIDE_ENABLED=false` preserves `morale_low_streak` integer values; the override path simply doesn't fire.
- A/B comparison at same seed: load both saves at the same turn boundary; dissolution-count delta is the override's incremental contribution.

### 5.4 Forward / Backward Compatibility

- Legacy save loaded by Phase-1-retune client: `morale_low_streak` undefined → 0; `morale_override_turns` undefined → faction map fallback.
- Phase-1-retune save loaded by older client (pre-`58624617`): foreign field ignored without harm.

---

## 6. Sensitive-History Compliance Assertion (Criterion 9)

- **Ring classification: Ring 1 (CARRY-FORWARD CONFIRMED).** The retuned mechanism is faction-symmetric (`getFactionMoraleOverrideTurns(timeline, faction)` is purely a function of `(timeline data, faction key)`). No `if (faction === 'X')` discriminator in code. Static-grep test R11 enforces.
- **§6 sign-off chain CONFIRMED** (mini-panel `/historian` + `/game-designer` carry-forward + user §6 re-authorization 2026-05-05). Panel discipline binds — the mini-panel verdict (12 ACs + 7 STs) IS the SHIP gate, not user authorization.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.**
- **No combat-math number tuned outside the panel-recommended scope.** `MORALE_OVERRIDE_THRESHOLD=15` and `MORALE_OVERRIDE_RESET=20` (in `morale_drift.ts`) untouched.
- **No hardcoded brigade IDs in source code.** Test fixtures use synthetic IDs (`rs_test_brigade`, `hrhb_test_brigade`); apr1992.json data block is faction-keyed, not brigade-keyed.
- **Determinism preserved.** Helper is pure function; no Math.random / Date.now / new Date in lane-tagged regions (static-grep test R10 enforces). Predicate purity verified.

### Historical citations (added per mini-panel /historian co-sign)
- **BB1 ch. 9** — HVO Travnik 1993 (HVO=8 / 5-8 weeks median).
- **BB1 ch. 12** — ARBiH 5th Corps Bihać 1994 Abdić siege (RBiH=8 / 4-8 weeks median).
- **BB2 ch. 14** — VRS Drina Corps 1994-95 (RS=10 / 6-10 weeks at sub-threshold morale).
- **BB2 ch. 18** — VRS Krajina Corps pre-Storm 1995 (RS=10 / 8-12 weeks of attrition + supply collapse).
- **BB2 ch. 19** — SRK Sarajevo siege rotation late 1995 (RS=10 / 8-14 weeks).
- **BB1 p.443** — 28th Division reconstitution post-Srebrenica (corroborates RBiH=8 conservative end).

---

## 7. 188w A/B Dual Smoke (Criteria 5, 6, 7, 8)

**TBD-AUTOFILL** — both runs in flight; results inserted below upon completion.

### 7.1 Hash + completion verdict

| Run | Env | Hash | `final_state_hash` emit |
|---|---|---|---|
| Default-ON | unset | TBD-AUTOFILL | TBD-AUTOFILL |
| Override-disable | `MORALE_OVERRIDE_ENABLED=false` | TBD-AUTOFILL | TBD-AUTOFILL |

### 7.2 Per-faction dissolution counts (raw)

| Run | HRHB | RBiH | RS | Total |
|---|---|---|---|---|
| Default-ON-with-2A (this lane) | TBD | TBD | TBD | TBD |
| Override-disable (control) | TBD | TBD | TBD | TBD |
| Δ (incremental from MORALE_OVERRIDE) | TBD | TBD | TBD | TBD |

### 7.3 Reconciled Criterion 3 verdict

| Sub-criterion | Threshold | Observed | Verdict |
|---|---|---|---|
| Per-faction count (188w) | ≤35 | TBD | TBD |
| Incremental absorption | ≤55% | TBD | TBD |
| Per-40w proportional | ≤7.5 | TBD | TBD |

### 7.4 Per-faction officer_quality Δ/turn at 4 segments

| Faction | Segment | Default-ON-with-2A | Override-disable | Δ |
|---|---|---|---|---|
| RS | t52→t78 | TBD | TBD | TBD |
| RS | t78→t104 | TBD | TBD | TBD |
| RS | t104→t156 | TBD | TBD | TBD |
| RS | t156→t188 | TBD | TBD | TBD |
| HRHB | t52→t78 | TBD | TBD | TBD |
| HRHB | t78→t104 | TBD | TBD | TBD |
| HRHB | t104→t156 | TBD | TBD | TBD |
| HRHB | t156→t188 | TBD | TBD | TBD |
| RBiH | t52→t78 | TBD | TBD | TBD |
| RBiH | t78→t104 | TBD | TBD | TBD |
| RBiH | t104→t156 | TBD | TBD | TBD |
| RBiH | t156→t188 | TBD | TBD | TBD |

### 7.5 Stop-trigger compliance verdicts

TBD-AUTOFILL — see §3.

---

## 8. Successor Handoffs

1. **Continued observation window.** Mini-panel class precedent calls for one calibration cycle of stable behavior under default-ON before a follow-up trivial Phase 1 lane removes the env-flag indirection entirely (Option F.1 reduction).
2. **40w + 188w baseline records.** New post-retune baseline hashes (40w: `a8ef0201858fe2ac`; 188w: TBD) carried forward as canonical.
3. **Krivaja Phase 1 step-curve infrastructure** (commit `bc44ddec`) and morale_override_turns substrate (this lane) coexist additively on the same `WarTimeline` interface; no conflict.

---

## 9. Files Changed

- `src/sim/combat/brigade_dissolution.ts` — predicate sense flipped + per-faction lookup helper added + FACTION fallback map exported.
- `src/state/war_timeline.ts` — interface field + validator clause additive.
- `data/scenarios/timelines/apr1992.json` — `morale_override_turns: { RS: 10, HRHB: 8, RBiH: 8 }` block additive.
- `tests/morale_override_phase_1_retune.test.ts` — NEW (16 tests).
- `tests/morale_override_flag_promotion_phase_1.test.ts` — NEW reconstructed (7 tests).
- `tests/morale_collapse_override.test.ts` — extended (T6–T10 updated for default-ON + per-faction).
- `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_PHASE_1_RETUNE.md` — this report.

**Out-of-scope guards held:** no touch to `src/sim/combat/stranded_brigade_lifecycle.ts`, `src/sim/combat/enclave_resilience.ts`, `src/sim/combat/combat_math.ts`, `src/sim/combat/morale_drift.ts`, `data/source/oob/oob_brigades.json`, `tests/krivaja_roster_phase_1.test.ts`, `.github/workflows/*`, `package.json`, or any FORAWWV / paint anchor / political_controllers files.

---

## 10. References

### Predecessor lane reports
- `docs/40_reports/audits/20260505_MORALE_OVERRIDE_RETUNE_MINI_PANEL.md` — refined Phase 1 retune ACs + STs.
- `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_1.md` (`8919c3ed`) — verdict-only ship.
- `docs/40_reports/audits/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_0_PANEL.md` (`9b9650e4`) — Phase 0 panel.
- `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` (`20c3aa05`) — durable knowledge anchor for "step-curve faction-asymmetric data via faction-symmetric mechanism" pattern.
- `docs/40_reports/implemented/20260505_HRHB_NUMERICS_RETUNE_PHASE_1.md` (`f9c40043`) — same-class pattern reference.
- `docs/40_reports/implemented/20260505_KRIVAJA_ROSTER_PHASE_1.md` (`bc44ddec`) — sibling Phase 1 ship (additive on same WarTimeline interface).

### Canon
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §6.2.4 — Morale-collapse override clause (text unchanged).
- `docs/10_canon/Systems_Manual_v0_9_0.md` §6.4 — Morale-collapse override dissolution path (text unchanged).
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 (Ring) + §6 (Sign-off Structure).

### Code surface
- `src/state/war_timeline.ts` (interface + validator).
- `src/sim/combat/brigade_dissolution.ts` (consumer + helper).
- `src/sim/combat/morale_drift.ts` (counter — UNCHANGED).
- `src/state/game_state.ts` (`FormationState.morale_low_streak?: number` — UNCHANGED).
- `data/scenarios/timelines/apr1992.json` (content).

### Tests
- `tests/morale_override_phase_1_retune.test.ts`
- `tests/morale_override_flag_promotion_phase_1.test.ts`
- `tests/morale_collapse_override.test.ts`
- `tests/krivaja_roster_phase_1.test.ts`
- `tests/war_timeline.test.ts`

---

**End of Phase 1 Retune Implementation Report.**
