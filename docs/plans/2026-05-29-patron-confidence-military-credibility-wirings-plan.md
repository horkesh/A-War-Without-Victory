# patron_confidence + military_credibility Dimension Wirings — Implementation Plan

**Date:** 2026-05-29
**Status:** PLANNING ONLY (no source code, no commit)
**Owner lane:** Event-system extension lane
**Author role:** Gameplay Programmer (AWWV Pyrrhic team)
**Related command-board row:** P2 — "patron_confidence + military_credibility dimension wirings" (`docs/plans/COMMAND_BOARD.md:47`, OPEN/unbuilt)
**Pattern source (canonical, SHIPPED):** Phase E MVS `international_standing` + Packet 2 `internal_cohesion` consumers.
**Collision rules:** May touch `src/sim/political/political_dimension_propagation_gate.ts`, `src/sim/combat/sector_offensive.ts`, `src/sim/combat/commander/briefing.ts`, `src/sim/combat/commander/commander_state.ts`, `src/sim/combat/commander/emit.ts`, and new/edited tests only. MUST NOT touch calibration catalogs, scenario data, event data, OOB, or operation tuning. MUST NOT refresh baselines (this lane is substrate-only and default-OFF, so no output change exists to own).

---

## 1. Objective + Motivation

Wire the two remaining typed `DimensionId`s — `patron_confidence` and `military_credibility` — into bot-ops launch behavior, behind the existing two-tier flag pattern (`AWWV_POLITICAL_DIMENSION_PROPAGATION` umbrella + per-dimension `AWWV_PDP_*` sub-flag), default-OFF, so that **flag-OFF runs remain byte-identical** to the current baseline.

**Why these two dimensions should bias bot-ops:**

- **`patron_confidence`** = the bilateral patron RELATIONSHIP score (Belgrade → RS, Zagreb → HRHB, US/Iran → RBiH). Base value is sourced from `state.military.negotiation.patron_relationships[faction].support_level` (`src/sim/events/strategic_dimensions.ts:99-100`). A faction whose external sponsor has lost confidence faces ammunition/fuel/spare-part throttling and political pressure to *stop pushing* — historically the VRS post-1994 Belgrade fuel embargo and the HVO during the Washington-Agreement cooldown both visibly curtailed fresh offensives. **Semantic: low patron confidence → op-launch hesitation** (sponsor won't underwrite a new offensive). Same DIRECTION as `international_standing` hesitation.

- **`military_credibility`** = the force-credibility dimension; base value is derived from ops success rate + casualty-exchange ratio (`src/sim/events/strategic_dimensions.ts:78-85`). A faction whose recent operations have failed and whose exchange ratio is bleeding has a corps command that has *lost confidence in its own offensive capability* — it consolidates rather than attacks. **Semantic: low military credibility → op-launch caution bias** (a battered corps does not gamble on fresh offensives). Same DIRECTION as `internal_cohesion` caution.

Both biases are SOFT (multiplicative on the brigade-count launch floor, not a hard block), consistent with the two shipped consumers. Neither creates new attacks — they only make the *existing* op-launch gate more conservative, so the ops-only-attacks invariant is untouched.

---

## 2. Scope & Non-Scope

**In scope (substrate wiring only):**
- Two new Tier-2 sub-flags + combined predicates in the propagation gate module.
- Two new pure multiplier helpers in `sector_offensive.ts` (mirroring the two shipped helpers).
- Two new optional briefing fields (`patron_confidence`, `military_credibility`) on `CommanderBriefing.political_dimensions`.
- Two new gated population blocks in `briefing.ts`.
- Extending the single existing consumption site in `emit.ts` to chain the two new multipliers.
- Test coverage for the new helpers + gate + briefing-shape byte-stability.

**Explicitly NOT in scope:**
- **NOT activation.** All new flags ship default-OFF. This plan does not flip any flag, does not run an activation probe, does not recommend turning anything ON.
- **NOT calibration.** No threshold/magnitude tuning beyond proposing initial defaults mirroring the shipped pattern. No baseline refresh.
- **NOT** touching the cohesion-divisor fix (separate calibration-owned lane, `COMMAND_BOARD.md:45`).
- **NOT** wiring the remaining two dimensions (`territorial_legitimacy`, `negotiating_leverage`) — out of lane.
- **NOT** any §6 sensitive-history content.

---

## 3. Current-State Findings (file:line evidence)

1. **Six typed dimensions exist; all initialized + clamped [0,100].** `src/sim/events/strategic_dimensions.ts:5-12` (`DIMENSION_IDS` array incl. `military_credibility` and `patron_confidence`); `applyDimensionShift` clamps via `clamp(base+mod, 0, 100)` at `:35-40`. Base values for both target dimensions are written by `computeDimensionBaseValues`: `military_credibility` at `:78-85` (ops rate + casualty ratio), `patron_confidence` at `:98-100` (`patron?.support_level`).

2. **Two SHIPPED consumers (the pattern to mirror):**
   - `getIntlStandingOpsHesitationMultiplier` — `src/sim/combat/sector_offensive.ts:244-261`. Threshold `< 30` → `0.7×`; else `1.0`. Pure function of one numeric input; `undefined`/`NaN` → `1.0` no-op.
   - `getCohesionCautionBiasMultiplier` — `src/sim/combat/sector_offensive.ts:291-311`. Threshold `< 40` → `0.85×`; else `1.0`. Same no-op contract.

3. **The single consumption site** is `buildOperations` in `src/sim/combat/commander/emit.ts:847-875`: it reads `briefing.political_dimensions?.international_standing` and `?.internal_cohesion`, computes `combinedMult = hesitationMult * cohesionMult`, then `effectiveMinForOp = combinedMult !== 1.0 ? Math.ceil(baseMinForOp / combinedMult) : baseMinForOp` (`:869-872`). Dividing by a `<1.0` multiplier *raises* the brigade-count launch floor → fewer ops launch. The `!== 1.0` guard at `:870` is the byte-stable fast-path: when all multipliers are `1.0`, `effectiveMinForOp === baseMinForOp`, identical to pre-Phase-E.

4. **Briefing population** is gated in `src/sim/combat/commander/briefing.ts:722-753`: `political_dimensions` is built ONLY when the respective combined gate is active, reading `state.military.negotiation.strategic_dimensions[faction].<dim>.effective_value`. The field is OMITTED from the assembled briefing when undefined (`:806-811`), preserving briefing shape.

5. **Briefing type** `CommanderBriefing.political_dimensions` is declared at `src/sim/combat/commander/commander_state.ts:546-558` with optional `international_standing?` and `internal_cohesion?` only.

6. **The flag module** `src/sim/political/political_dimension_propagation_gate.ts` declares: Tier-1 umbrella `isPoliticalDimensionPropagationEnabled()` (`:35-41`, env `AWWV_POLITICAL_DIMENSION_PROPAGATION`); Tier-2 sub-flags `isIntlStandingOpsHesitationEnabled` (`:58-64`, env `AWWV_PDP_INTL_STANDING_OPS_HESITATION`) and `isCohesionCautionBiasEnabled` (`:82-88`, env `AWWV_PDP_COHESION_CAUTION_BIAS`); combined predicates `isIntlStandingOpsHesitationActive` (`:105-107`) and `isCohesionCautionBiasActive` (`:114-116`); and `resetPoliticalDimensionGates` (`:124-128`).

7. **CONFIRMED: `patron_confidence` and `military_credibility` have NO current bot-ops read.** A repo-wide grep for the two shipped helper names shows consumers only in `emit.ts`, `causality_query.ts`, and diagnostics/tools. Neither `patron_confidence` nor `military_credibility` appears in any `commander/`, `combat/`, or `bot_*` ops-decision read site — they are written by the dimension substrate and consumed only by the Dayton composite (`DIMENSION_WEIGHTS`, `strategic_dimensions.ts:57-71`) and `negotiating_leverage` derivation (`:113-117`). No ops consumer exists.

**Coupling caveat (from verdict):** `docs/40_reports/proposals/20260529_PHASE_E_VERDICT_CONSOLIDATED.md:107-117` confirms the consumer sign is correct (`/combinedMult` raises the floor) and that turning a flag ON is **not baseline-neutral** (real BOT-MILITARY hash drift when ON). Because the multipliers chain multiplicatively at `emit.ts:869`, turning **multiple PDP flags ON together is NOT additively-neutral** — their effects compound on `combinedMult`. This plan keeps everything OFF; the caveat is recorded for the future activation lane (§10).

---

## 4. Design (per dimension)

Both consumers mirror the shipped helpers exactly: pure function of one `number | undefined`, `undefined`/`NaN` → `1.0`, single threshold, single multiplier, byte-stable `!== 1.0` consumer contract. Magnitudes are chosen to sit between the two shipped consumers and are explicitly initial defaults (calibration owns any future retune).

### 4a. `patron_confidence` → op-launch patron-hesitation multiplier

- **Decision biased:** op-launch brigade-count floor (same lever as the two shipped consumers).
- **Direction:** LOW patron confidence → MORE hesitant (sponsor won't underwrite the offensive). Mirrors `international_standing` semantics.
- **Threshold:** `patron_confidence < 30` (mirrors the intl_standing "isolated" band — a sponsor below 30 is actively withholding).
- **Multiplier:** `0.75×` (between intl 0.7× and cohesion 0.85×; patron relationship is a moderately fast-moving political signal — sponsors can throttle within weeks, but not instantly).
- **Helper:** `getPatronConfidenceOpsHesitationMultiplier(patronConfidence: number | undefined): number` in `sector_offensive.ts`.
- **Sub-flag env:** `AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION`.
- **Combined predicate:** `isPatronConfidenceOpsHesitationActive()`.

### 4b. `military_credibility` → op-launch credibility-caution multiplier

- **Decision biased:** op-launch brigade-count floor (same lever).
- **Direction:** LOW military credibility → MORE cautious (a corps with a failing ops record + bleeding exchange ratio consolidates instead of attacking). Mirrors `internal_cohesion` caution semantics.
- **Threshold:** `military_credibility < 40` (mirrors the cohesion "fraying" band — credibility is a slower-moving, ops-history-derived signal).
- **Multiplier:** `0.85×` (matches the cohesion caution magnitude — both are slow-moving morale-class signals, so the soft pressure is identical).
- **Helper:** `getMilitaryCredibilityCautionBiasMultiplier(militaryCredibility: number | undefined): number` in `sector_offensive.ts`.
- **Sub-flag env:** `AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS`.
- **Combined predicate:** `isMilitaryCredibilityCautionBiasActive()`.

### Composition at the consumption site

`emit.ts:869` becomes a 4-factor product:
```
combinedMult = hesitationMult * cohesionMult * patronMult * credibilityMult
```
When every sub-flag is OFF, every factor is `1.0` → `combinedMult === 1.0` → `effectiveMinForOp === baseMinForOp` → byte-identical. (See §6 for the determinism proof of multiplicative `1.0` neutrality.)

---

## 5. Step-by-Step Implementation (one commit per step)

> Each step is a single discrete commit. No step changes default behavior (all gates default-OFF). Tests added in the step that introduces the behavior.

**Step 1 — Flag module: add the two new Tier-2 sub-flags + combined predicates.**
File: `src/sim/political/political_dimension_propagation_gate.ts`.
- Add `_patronConfidenceOpsHesitationOverride` + `isPatronConfidenceOpsHesitationEnabled()` (env `AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION`) + `setPatronConfidenceOpsHesitationOverride(value)`.
- Add `_militaryCredibilityCautionBiasOverride` + `isMilitaryCredibilityCautionBiasEnabled()` (env `AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS`) + `setMilitaryCredibilityCautionBiasOverride(value)`.
- Add combined predicates `isPatronConfidenceOpsHesitationActive()` = umbrella `&&` patron sub-flag; `isMilitaryCredibilityCautionBiasActive()` = umbrella `&&` credibility sub-flag.
- Extend `resetPoliticalDimensionGates()` (`:124-128`) to clear both new overrides.
- Mirror the exact getter/setter/env idiom of lines `:53-94`.

**Step 2 — sector_offensive: add the two pure multiplier helpers.**
File: `src/sim/combat/sector_offensive.ts`.
- Add `getPatronConfidenceOpsHesitationMultiplier` mirroring `:244-261`; constants `PATRON_CONFIDENCE_OPS_HESITATION_THRESHOLD = 30`, `PATRON_CONFIDENCE_OPS_HESITATION_MULTIPLIER = 0.75`. Guard `typeof !== 'number'` and `Number.isNaN` → `1.0`.
- Add `getMilitaryCredibilityCautionBiasMultiplier` mirroring `:291-311`; constants `MILITARY_CREDIBILITY_CAUTION_BIAS_THRESHOLD = 40`, `MILITARY_CREDIBILITY_CAUTION_BIAS_MULTIPLIER = 0.85`. Same no-op guards.
- Both are pure, no state, no randomness, no save-state field. Doc-comment them identically to the shipped pair (cite the `!== 1.0` byte-stable consumer contract).

**Step 3 — Briefing type: extend the optional field.**
File: `src/sim/combat/commander/commander_state.ts:546-558`.
- Add optional `readonly patron_confidence?: number;` and `readonly military_credibility?: number;` to `political_dimensions`, with doc-comments mirroring `:551-557`.

**Step 4 — Briefing population: two new gated blocks.**
File: `src/sim/combat/commander/briefing.ts`, inside the `:722-753` block.
- After the cohesion block, add: `if (isPatronConfidenceOpsHesitationActive()) { const v = state.military?.negotiation?.strategic_dimensions?.[faction]?.patron_confidence?.effective_value; if (typeof v === 'number') politicalDimensions = { ...politicalDimensions, patron_confidence: v }; }`.
- Add the analogous block for `military_credibility` reading `...military_credibility?.effective_value`.
- Import the two new `is…Active` predicates from the gate module.
- The existing `...(politicalDimensions !== undefined ? {...} : {})` spread at `:806-811` already omits the field when no sub-flag fired — no change needed there.

**Step 5 — Consumption site: chain the two new multipliers.**
File: `src/sim/combat/commander/emit.ts:847-872`.
- Import `getPatronConfidenceOpsHesitationMultiplier`, `getMilitaryCredibilityCautionBiasMultiplier` from `sector_offensive.js` (alongside existing imports `:50-51`).
- Add `const patronMult = getPatronConfidenceOpsHesitationMultiplier(briefing.political_dimensions?.patron_confidence);` and `const credibilityMult = getMilitaryCredibilityCautionBiasMultiplier(briefing.political_dimensions?.military_credibility);`.
- Change `:869` to `const combinedMult = hesitationMult * cohesionMult * patronMult * credibilityMult;`. The `!== 1.0` guard at `:870` is unchanged and remains the byte-stable fast-path.

**Step 6 — Tests (see §8).** Add new helper + gate + briefing-shape tests. Single commit.

**Step 7 — Docs/ledger.** Append a `docs/PROJECT_LEDGER.md` entry (substrate-only, default-OFF, byte-identical). Update `COMMAND_BOARD.md:47` status from "OPEN (unbuilt)" to "BUILT (default-OFF, unactivated)". Do NOT edit `docs/10_canon/FORAWWV.md`.

---

## 6. Determinism & Canon Compliance

- **Ops-only-attacks intact:** the new multipliers only adjust the brigade-count launch floor inside `buildOperations`; they never create a CorpsOperation, never make a brigade attack independently. Fewer ops launch when a gate trips; none are added.
- **No nondeterminism:** all four helpers are pure functions of one numeric input — no `Math.random`, no `Date.now`, no timestamps. Flags read `process.env` / module-local override only (same as the shipped gate).
- **Sorted iteration:** no new iteration introduced; the existing `participatingBrigades.sort(strictCompare)` (`emit.ts:839`) is untouched.
- **Clamps:** dimension `effective_value` is already clamped `[0,100]` at the write site (`strategic_dimensions.ts:39`); helpers do not re-derive values.
- **Multiplicative `1.0` neutrality:** IEEE-754 `x * 1.0 === x` exactly for all finite `x`, so adding `* patronMult * credibilityMult` when both are `1.0` cannot perturb `combinedMult`. With all four `1.0`, `combinedMult === 1.0` triggers the `!== 1.0` fast-path → `effectiveMinForOp === baseMinForOp` → identical control flow.
- **Canon hierarchy:** soft multipliers respect Engine Invariants (no hard block, no override of initial OSIDs, no `avoided_osids_by_faction`).

---

## 7. Feature-Flag / Default-OFF Proof Strategy

1. **Briefing-shape proof (unit):** with both new sub-flags OFF (and umbrella OFF), `buildBriefing` must OMIT `patron_confidence`/`military_credibility` from `political_dimensions` (assert the keys are absent — mirror `tests/political_dimension_propagation_gate.test.ts`).
2. **Multiplier no-op proof (unit):** both helpers return `1.0` for `undefined`, `NaN`, and any value `>= threshold`.
3. **Baseline regression (the load-bearing proof):** run the 40w scenario and the 188w scenario with **all PDP env unset (default)** and confirm the run hash matches the current committed baseline hash byte-for-byte. Because the env defaults are OFF, the gate is inert and the assembled briefings, ops floors, and control bytes must be identical. Compare against the current baseline (n136-era 40w hash `39d5d0c09a4666c8`, or whatever the live baseline is at execution time — re-derive from a clean checkout before editing, do not assume).
4. **Umbrella-only proof:** with `AWWV_POLITICAL_DIMENSION_PROPAGATION=1` but both new sub-flags unset, the combined predicates must still return false (umbrella alone is insufficient), so the run stays byte-identical.

---

## 8. Test Plan

**New test files (mirror the shipped suites):**
- `tests/phase_e_patron_confidence_ops_hesitation.test.ts` — helper threshold/no-op table (model on `tests/political_dimension_propagation_gate.test.ts:259-276`): `undefined`/`NaN`→1.0; `29`→0.75, `0`→0.75; `30`/`50`/`100`→1.0.
- `tests/phase_e_military_credibility_caution_bias.test.ts` — model on `tests/phase_e2_cohesion_caution_bias.test.ts`: `undefined`/`NaN`→1.0; `39`/`20`/`0`→0.85; `40`/`50`/`100`→1.0.
- `tests/phase_e_pdp_gate_extension.test.ts` — extend the gate test: both new sub-flags default-OFF; umbrella-only insufficient; both ON → active; `resetPoliticalDimensionGates` clears them.
- A briefing-shape case (either a new file or extend an existing commander briefing test) proving the two new fields are omitted when gates OFF and populated when ON.

**Existing suites to run (full regression):**
- `npm run test:vitest` (entire suite — catches cross-test regressions; CI runs full on Linux).
- Specifically re-run: `tests/phase_e3_combined_activation.test.ts`, `tests/phase_e2_cohesion_caution_bias.test.ts`, `tests/political_dimension_propagation_gate.test.ts`, `tests/causality_query.test.ts`, `tests/political_dimensions_snapshot.test.ts`, `tests/phase_e_activation_simulator.test.ts`.
- `npx tsc --noEmit`.

---

## 9. Verification Gates

Smoke-test triad after every step, full gate before close:
1. `npx tsc --noEmit` — clean.
2. `npm run test:vitest` — all green (new + existing).
3. `npm run desktop:map:build` — builds clean.
4. **Baseline regression:** `npm run sim:scenario:run:40w` AND `npm run sim:scenario:run:default` (188w) with PDP env unset → run hash byte-identical to current baseline. This is the gate that proves default-OFF neutrality and MUST pass before close.
5. Poll CI after push (`gh run list --commit <sha>`); agent-local green is not sufficient.

---

## 10. Risks, Mitigations, Rollback, Dependencies, Owner, DoD

**Risks & mitigations:**
- *R1 — accidental behavior drift (gate leaks ON).* Mitigation: combined-predicate requires umbrella AND sub-flag; baseline regression in §9.4 is byte-level. STOP and report on any unexplained hash drift.
- *R2 — `effective_value` undefined for a faction.* Mitigation: `typeof === 'number'` guard in briefing block + helper `undefined`→1.0 no-op; field simply omitted.
- *R3 — future multi-flag activation is not additively neutral.* Mitigation: documented coupling caveat (verdict `:107-117`); this plan ships OFF and does NOT activate. The activation lane must run an ON-vs-OFF flip-set magnitude probe per flag and per combination.
- *R4 — diagnostics tools (`tools/diagnostics/phase_e_activation_simulator.ts`, `political_dimensions_snapshot.ts`) reference the shipped two by name.* Mitigation: out of scope to extend them; new helpers are additive and do not change existing tool behavior. (Optional follow-up, not in this lane.)

**Rollback:** env-var only. Leave every `AWWV_PDP_*` flag unset (default). No code revert needed — substrate is inert when OFF. To hard-disable in code, `resetPoliticalDimensionGates()` clears overrides back to env-default-OFF.

**Dependencies & sequencing:**
- No hard dependency on the cohesion-divisor fix (`COMMAND_BOARD.md:45`) — that lane only affects whether the *cohesion* dimension's base floor-clamps, which is an activation concern, not a substrate-wiring concern. Note for the future activation lane: `patron_confidence`/`military_credibility` base derivations (`strategic_dimensions.ts:78-100`) should be audited for the same downstream-rescale class of bug before any ON probe.
- Steps are ordered: gate (1) → helpers (2) → type (3) → briefing (4) → consumer (5) → tests (6) → docs (7). Steps 1-3 are independently safe; 4-5 introduce the (gated) read.
- **Coupling caveat (mandatory carry-forward):** turning multiple PDP flags ON together compounds multiplicatively on `combinedMult` (`emit.ts:869`) — it is NOT additively neutral. Any future activation must probe each combination, not assume independence.

**Owner:** Event-system extension lane (gameplay-programmer implements; canon-compliance-reviewer + determinism-auditor sign-off on the byte-identical proof; calibration owns any future activation/threshold retune).

**Definition of Done:**
- Two sub-flags, two combined predicates, two pure helpers, two optional briefing fields, two gated briefing blocks, one extended consumption site — all shipped default-OFF.
- New unit tests green; full vitest + tsc + desktop:map:build green.
- 40w + 188w baseline hashes byte-identical with flags unset (evidence captured in the ledger entry).
- `COMMAND_BOARD.md:47` updated to BUILT (default-OFF, unactivated); `PROJECT_LEDGER.md` entry appended.
- No flag flipped ON; no baseline refreshed; `FORAWWV.md` untouched.
